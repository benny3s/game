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
    bonus: C.store(KEY + 'bonus', 2), speed: C.store(KEY + 'speed', 'normal'), coach: C.store(KEY + 'coach', 1),
    wMode: C.store(KEY + 'wMode', 2), wTiers: C.store(KEY + 'wTiers', ['hard', 'normal', 'easy']), wSpeed: C.store(KEY + 'wSpeed', 'normal'),
    bank: C.store(KEY + 'bank', 'gbasic'), bankName: C.store(KEY + 'bankName', '기본 은행'),     // 친구랑: 은행 모임(gid) — 처음엔 🏦 기본 은행, null = 은행 안 씀 (연습 칩)
    lMode: C.store(KEY + 'lMode', 2), lSeats: C.store(KEY + 'lSeats', ['human', 'human', 'normal', 'normal', 'normal']),
    foe: C.store(KEY + 'foe', {}),                              // 혼자 하기 상대 이름 (단계마다 고른 번호)
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  let coins = C.store(KEY + 'coins', 0);
  let stats = C.store(KEY + 'stats', { played: 0, won: 0, best: 0 });

  // ── 우리 집 규칙: 이 기기에 저장해 둔 규칙 (옛 '보너스 피' 설정은 처음 한 번 이어받음) ──
  let houseRules = G.normRules(C.store(KEY + 'rules', null) || { bonus: opt.bonus });
  if (!C.store(KEY + 'chipPer1', 0)) { if (houseRules.chipPer === 10) houseRules.chipPer = 1; C.save(KEY + 'rules', houseRules); C.save(KEY + 'chipPer1', 1); }   // 10-31: 점당 기본 100원
  const setRules = r => { houseRules = G.normRules(r); C.save(KEY + 'rules', houseRules); };
  // 10-31 베니 님: 기본 보너스 패 2장(둘 다 쌍피) — 예전 기본값(0장)으로 저장된 기기는 한 번만 2장으로
  if (!C.store(KEY + 'bonus2v', 0)) { if (!houseRules.bonus) setRules(Object.assign({}, houseRules, { bonus: 2 })); C.save(KEY + 'bonus2v', 1); }
  // 11-01 새 기본값(국진 자동 · 첫뻑 3점 · 연뻑 6점): 예전 기본값 그대로 저장된 기기만 한 번 바꿈
  if (!C.store(KEY + 'rules1101', 0)) {
    const o = {};
    if (!houseRules.ppeokFirst) o.ppeokFirst = 3;
    if (!houseRules.ppeokYeon) o.ppeokYeon = 6;
    if (Object.keys(o).length) setRules(Object.assign({}, houseRules, o));
    C.save(KEY + 'rules1101', 1);
  }
  // 11-01 밤 베니 님: 국진은 먹을 때 직접 고르기(열끗/쌍피)가 기본 — 자동으로 저장된 기기는 한 번 고르기로
  if (!C.store(KEY + 'kookChoose', 0)) { if (houseRules.kook === 'auto') setRules(Object.assign({}, houseRules, { kook: 'choose' })); C.save(KEY + 'kookChoose', 1); }
  const presetName = r => { const p = G.RULE_PRESETS.find(q => q.id === G.matchPreset(r)); return p ? p.name : '직접 고침'; };
  // 규칙 한 줄 요약: 바뀐 것만 (넷까지)
  function ruleSummary(r) {
    const d = G.diffRules(r).filter(x => x.k !== 'chipPer');
    return (d.length ? d.slice(0, 4).map(x => `${x.label} ${x.text}`).join(' · ') + (d.length > 4 ? ` 외 ${d.length - 4}개` : '') : '원래 규칙 그대로') + ` · 점당 ${r.chipPer}칩`;
  }

  // ── 칩 출입구 한 곳 (나중에 공용 은행이 여기에 꽂힘. 섯다·포커와 같은 모양)
  //   start(kind, n): 자리별 시작 칩 [n] (kind: solo | hot | watch | host | guest)
  //   report(kind, info): 판이 끝날 때마다 { round, over:false, deltas:{ 자리번호: 칩 변화 (합 0) }, coins:[자리별 칩], seats:[{name,ctrl}], me } 를 알림 (window 'chips:report' 이벤트)
  //   deltas = 점수 변화 × 점당 칩 (이긴 판·진 판 박 배수, 광 팔기 값, 첫뻑/연뻑 위로금까지). 쉬는 사람 자리도 있음
  const CHIPS = {
    start(kind, n) { return Array.from({ length: n }, () => 500); },
    report(kind, info) {
      try { window.dispatchEvent(new CustomEvent('chips:report', { detail: Object.assign({ game: 'gostop', kind }, info) })); } catch (e) {}
    },
  };

  const TIER = {
    easy:   { em: '🌱', name: '초짜', cls: 't-easy',   desc: '패를 솔직하게 내는 입문자', names: ['김씨', '박씨', '정씨', '한씨'] },
    normal: { em: '🎴', name: '꾼', cls: 't-normal', desc: '피 계산과 견제가 탄탄한 실력자', names: ['이생원', '최주사', '강서방', '윤참봉'] },
    hard:   { em: '👑', name: '타짜', cls: 't-hard',   desc: '나온 패를 하나도 안 놓치고 세는 일류 — 🧑‍🏫 선생님이랑 치면 해 볼 만해요', names: ['평경장', '고광렬', '아귀', '짝귀'] },
  };
  const SPEEDS = { slow: { label: '느긋하게', em: '🐢', mul: 1.45, think: 950 }, normal: { label: '보통', em: '⚡', mul: 1, think: 560 }, fast: { label: '빠르게', em: '🚀', mul: 0.55, think: 230 } };
  const SPEED_ORDER = ['slow', 'normal', 'fast'];

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }
  const foeIdx = t => { const i = (opt.foe && opt.foe[t]) | 0; return i >= 0 && i < TIER[t].names.length ? i : 0; };
  // 🏆 통산 판·승은 랭킹(GRank)에서만 읽음 (기기 localStorage 로는 안 보여줌) — 못 읽으면 숫자 없이
  let rk = null;
  function rankPull() { try { if (window.GRank) GRank.mine('gostop').then(v => { if (v !== rk) { rk = v; if (!SES) drawMenu(); } }, () => {}); } catch (e) {} }
  try { addEventListener('grank', e => { if (e.detail && e.detail.game === 'gostop') rankPull(); }); } catch (e) {}
  function drawMenu() {
    rankPull();
    const tab = ['solo', 'watch', 'local'].includes(opt.tab) ? opt.tab : 'solo';
    $('tabSolo').setAttribute('aria-pressed', String(tab === 'solo')); $('tabWatch').setAttribute('aria-pressed', String(tab === 'watch')); $('tabLocal').setAttribute('aria-pressed', String(tab === 'local'));
    $('soloBox').hidden = tab !== 'solo'; $('watchBox').hidden = tab !== 'watch'; $('localBox').hidden = tab !== 'local';
    $('coinLine').innerHTML = `<span class="ic">🪙</span><span class="grow"><b>보유 자금 ${fmtN(coins)}냥</b><span class="small">${rk && rk.all && rk.all.n ? `통산 ${fmtN(rk.all.n)}판 중 ${fmtN(rk.all.w)}승` : '승리 시 점수만큼 판돈이 쌓입니다 (1점 = 10냥)'}</span></span>`;
    segBtns($('modeSeg'), [[2, '맞고 2인'], [3, '고스톱 3인'], [4, '광팔기 4인'], [5, '광팔기 5인']], opt.mode, v => { opt.mode = +v; saveOpt('mode'); drawMenu(); });
    const mo = G.modeOf(opt.mode);
    $('modeNote').textContent = mo.bench ? `${mo.n}명이 치고 ${mo.bench}명은 판마다 돌아가며 쉬어요. 쉬는 사람이 내놓는 광을 살 수 있어요` : '';
    $('modeNote').hidden = !mo.bench;
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })),
      id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    if ($('foeSeg')) segBtns($('foeSeg'), TIER[opt.tier].names.map((nm, i) => [i, nm]), foeIdx(opt.tier), v => { opt.foe = Object.assign({}, opt.foe, { [opt.tier]: +v }); saveOpt('foe'); drawMenu(); });
    segBtns($('bonusSeg'), [[0, '없음'], [2, '2장'], [3, '3장']], houseRules.bonus, v => { setRules(Object.assign({}, houseRules, { bonus: +v })); drawMenu(); });
    segBtns($('speedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    if ($('coachSeg')) segBtns($('coachSeg'), [[1, '🧑‍🏫 켬'], [0, '끔']], opt.coach ? 1 : 0, v => { opt.coach = +v; saveOpt('coach'); drawMenu(); });
    $('startBtn').textContent = `🎴 ${mo.name} 대국 시작 (${TIER[opt.tier].em} ${TIER[opt.tier].names[foeIdx(opt.tier)]})`;
    segBtns($('wModeSeg'), [[2, '2인 맞고'], [3, '3인 고스톱']], opt.wMode, v => { opt.wMode = +v; saveOpt('wMode'); drawMenu(); });
    const seatName = ['아래 자리', opt.wMode === 2 ? '맞은편 자리' : '오른쪽 자리', '왼쪽 자리'];
    $('wSeats').innerHTML = Array.from({ length: opt.wMode }, (_, i) => `<div class="wseat"><b>${seatName[i]}</b><div class="seg" data-i="${i}"></div></div>`).join('');
    for (const el of $('wSeats').querySelectorAll('.seg')) {
      const i = +el.dataset.i;
      segBtns(el, ['easy', 'normal', 'hard'].map(t => [t, TIER[t].em + ' ' + TIER[t].name]), opt.wTiers[i], v => { opt.wTiers[i] = v; saveOpt('wTiers'); drawMenu(); });
    }
    drawLocalMenu();
    segBtns($('wSpeedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.wSpeed, v => { opt.wSpeed = v; saveOpt('wSpeed'); drawMenu(); });
    // 우리 집 규칙 단추 (혼자 · 한 기기 · AI 구경 모두)
    for (const id of ['ruleLine1', 'ruleLine2', 'ruleLine3']) {
      const el = $(id); if (!el) continue;
      el.innerHTML = `<button class="btn hr-open" type="button">🛠️ 우리 집 규칙 <b>${esc(presetName(houseRules))}</b></button><p class="small hr-sum">${esc(ruleSummary(houseRules))}</p>`;
      el.querySelector('button').onclick = openRuleSheet;
    }
    // 첫 화면 안내 글도 지금 규칙의 점수로
    const hw = $('howto'); if (hw && hw.children[2]) hw.children[2].textContent = `광·열끗·띠·피를 모아 점수를 내요. 맞고는 ${houseRules.goMatgo}점, 셋이면 ${houseRules.go3}점부터 고·스톱`;
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
    segBtns($('lBonusSeg'), [[0, '없음'], [2, '2장'], [3, '3장']], houseRules.bonus, v => { setRules(Object.assign({}, houseRules, { bonus: +v })); drawMenu(); });
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
        defaults: { rules: G.normRules(houseRules), seed: rand32(), bank: opt.bank || null, bankName: opt.bank ? opt.bankName || null : null },
        label: cfg => { const r = G.normRules(cfg && cfg.rules); return `${presetName(r)} · 점당 ${r.chipPer}칩${window.Bank && Bank.label(cfg) ? ' · ' + Bank.label(cfg) : ''}`; },
        // 우리 집 규칙: 방장이 고치고, 친구는 읽기만. 접어 두면 한 줄 요약
        render(el, cfg, canEdit, update) {
          const r = G.normRules(cfg && cfg.rules);
          el.innerHTML = `<div data-bank></div><details class="hr-top"${lobbyRulesOpen ? ' open' : ''}><summary>🛠️ 우리 집 규칙 · <b>${esc(presetName(r))}</b><small>${esc(ruleSummary(r))}</small></summary><div class="hr-body"></div></details>`;
          // 🏦 은행 모임 (방장이 고르고, 친구는 보기만). cfg.bank / cfg.bankName 으로 모두에게 전해짐
          const bx = el.querySelector('[data-bank]');
          if (window.Bank && bx && el.isConnected) Bank.lobbyPicker(bx, { bank: cfg && cfg.bank, bankName: cfg && cfg.bankName }, canEdit, p => {
            opt.bank = p.bank || null; opt.bankName = p.bankName || null; saveOpt('bank'); saveOpt('bankName');
            // 기본 은행(1칩 = 100원)이면 1점 = 1칩(100원)부터
            const patch = { bank: opt.bank, bankName: opt.bankName };
            if (opt.bank === 'gbasic' && r.chipPer > 1) { const nr = Object.assign({}, r, { chipPer: 1 }); setRules(nr); patch.rules = nr; }
            update(patch);
          });
          const det = el.querySelector('details');
          det.addEventListener('toggle', () => { lobbyRulesOpen = det.open; });
          const body = el.querySelector('.hr-body');
          ruleSheet(body, r, canEdit, nr => { setRules(nr); update({ rules: nr }); });
        },
      },
      onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
      onLeave: why => { if (SES && SES.alive && SES.cfg.online) { goHome(); if (why) C.toast(why, 2600); } },
      onLobby: () => { if (SES && SES.alive && SES.cfg.online) { SES.keepNet = true; goHome(); } },   // 방장이 대기실로 (방은 그대로)
    };
  }
  function openFriendModal() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }

  // ── 🛠️ 우리 집 규칙 시트 (혼자·한 기기·AI 구경 메뉴, 친구랑 대기실에서 같이 씀) ──────────────
  // ruleSheet(el, 규칙, 고칠 수 있나, 바뀌면 부름(새 규칙)): 묶음 단추 + 묶음별 항목. 고칠 수 없으면 값만 보여 줌 (손님)
  const HR_OPEN = new Set();                               // 펼쳐 둔 묶음 (다시 그려도 그대로) — 처음엔 '⭐ 자주 바꾸는 것'만 보임
  const STEALS = ['stealJjok', 'stealTtadak', 'stealSweep', 'stealBomb', 'stealEat', 'stealSelf', 'stealDealt'];
  const STEAL_LV = [                                       // 피 뺏기 세기: 안 뺏음 · 보통(기본) · 세게
    { stealJjok: 0, stealTtadak: 0, stealSweep: 0, stealBomb: 0, stealEat: 0, stealSelf: 0, stealDealt: 0 },
    { stealJjok: 1, stealTtadak: 1, stealSweep: 1, stealBomb: 1, stealEat: 1, stealSelf: 2, stealDealt: 1 },
    { stealJjok: 2, stealTtadak: 2, stealSweep: 2, stealBomb: 2, stealEat: 2, stealSelf: 3, stealDealt: 2 },
  ];
  let lobbyRulesOpen = false;
  function ruleSheet(el, rules, canEdit, onChange) {
    let r = G.normRules(rules);
    const D = G.defaultRules();
    const row = d => {
      const v = r[d.k], ch = v !== D[d.k];
      let note = d.note || '';
      if (d.t === 'enum') { const op = d.opts.find(q => q[0] === v); if (op && op[2]) note = op[2]; }
      let ctl;
      if (!canEdit) ctl = `<span class="hr-v">${esc(G.ruleText(d, v))}</span>`;
      else if (d.t === 'bool') ctl = `<div class="seg">${[[1, '켬'], [0, '끔']].map(([b, l]) => `<button class="btn" type="button" data-k="${d.k}" data-v="${b}" aria-pressed="${!!b === v}">${l}</button>`).join('')}</div>`;
      else if (d.t === 'enum') ctl = `<div class="seg">${d.opts.map(op => `<button class="btn" type="button" data-k="${d.k}" data-v="${esc(op[0])}" aria-pressed="${op[0] === v}">${esc(op[1])}</button>`).join('')}</div>`;
      else ctl = `<div class="hr-step"><button class="btn" type="button" data-k="${d.k}" data-d="-1" aria-label="${esc(d.label)} 줄이기"${v <= d.min ? ' disabled' : ''}>−</button><output>${esc(G.ruleText(d, v))}</output><button class="btn" type="button" data-k="${d.k}" data-d="1" aria-label="${esc(d.label)} 늘리기"${v >= d.max ? ' disabled' : ''}>+</button></div>`;
      return `<div class="hr-row${ch ? ' chg' : ''}"><div class="hr-l"><b>${esc(d.label)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div><div class="hr-c">${ctl}</div></div>`;
    };
    // ⭐ 자주 바꾸는 것 (11-01 베니 님: 규칙이 너무 많아 뭘 바꿔야 할지 모름) — 예시 문장을 붙이고, 박·피 뺏기는 한 단추로 묶음
    const qrow = (label, note, ctl, ch) => `<div class="hr-row${ch ? ' chg' : ''}"><div class="hr-l"><b>${label}</b><small>${note}</small></div><div class="hr-c">${ctl}</div></div>`;
    const seg = (q, opts, cur) => canEdit ? `<div class="seg">${opts.map(([v, l]) => `<button class="btn" type="button" data-q="${q}" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>` : `<span class="hr-v">${esc((opts.find(o => o[0] === cur) || [0, '직접 고침'])[1])}</span>`;
    const baksOn = () => r.pibak && r.gwangbak && r.meongbak, baksOff = () => !r.pibak && !r.gwangbak && !r.meongbak;
    const stealLv = () => STEAL_LV.findIndex(lv => STEALS.every(k => r[k] === lv[k]));
    const quick = () => {
      const by = k => G.RULE_DEFS.find(d => d.k === k), withNote = (k, note) => { const d = Object.assign({}, by(k), { note }); return row(d); };
      return withNote('chipPer', '점수 1점에 주고받는 칩 — 🏦 은행 방은 1칩 = 100원이라 1칩이면 점당 100원')
        + qrow('박 (피박·광박·멍박)', '예) 켜면: 내가 졌는데 피가 7장 이하면 피박이라 2배로 내요', seg('baks', [[1, '켬'], [0, '끔']].concat(baksOn() || baksOff() ? [] : [[2, '일부만']]), baksOn() ? 1 : baksOff() ? 0 : 2), !baksOn())
        + qrow('피 뺏기 세기', '쪽·따닥·싹쓸이·폭탄·뻑 먹기 때 상대마다 피를 몇 장 뺏는지', seg('steal', [[0, '안 뺏음'], [1, '보통'], [2, '세게']].concat(stealLv() < 0 ? [[-1, '직접 고침']] : []), stealLv()), stealLv() !== 1)
        + withNote('ppeokFirst', '예) 3점: 내 첫 차례에 뻑이 나면 다른 사람마다 3점씩 받아요. 판 점수와 따로라 판은 안 끝나요')
        + withNote('ppeokYeon', '예) 6점: 뻑을 연달아 두 번 하면 다른 사람마다 6점씩 받아요')
        + withNote('kook', '9월 술잔 한 장은 열끗도 되고 쌍피(피 2장)도 돼요. 자동이면 점수 셀 때 나은 쪽으로');
    };
    const draw = () => {
      const sc = el.closest('.overlay > div, .arn-box'), y = sc ? sc.scrollTop : 0;
      const pid = G.matchPreset(r), cur = G.RULE_PRESETS.find(p => p.id === pid);
      let h = '<div class="hr">';
      if (!canEdit) h += '<p class="small hr-ro">방장이 정한 규칙이에요 (볼 수만 있어요)</p>';
      if (canEdit) h += `<div class="hr-pre">${G.RULE_PRESETS.map(p => `<button class="btn hr-pc" type="button" data-pre="${p.id}" aria-pressed="${p.id === pid}"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></button>`).join('')}</div>`;
      h += `<p class="hr-cur">${cur ? `지금: <b>${esc(cur.name)}</b>` : '지금: <b>직접 고친 규칙</b>'}</p>`;
      h += `<div class="hr-quick"><h4>⭐ 자주 바꾸는 것</h4>${quick()}</div>`;
      const allChanged = G.RULE_DEFS.filter(d => r[d.k] !== D[d.k]).length;
      h += `<details class="hr-g hr-all" data-g="all"${HR_OPEN.has('all') ? ' open' : ''}><summary>📚 전체 규칙 (고수용)${allChanged ? `<span class="hr-n">${allChanged}개 바꿈</span>` : ''}</summary>`;
      for (const [gid, gname] of G.RULE_GROUPS) {
        const defs = G.RULE_DEFS.filter(d => d.g === gid), changed = defs.filter(d => r[d.k] !== D[d.k]).length;
        h += `<details class="hr-g" data-g="${gid}"${HR_OPEN.has(gid) ? ' open' : ''}><summary>${gname}${changed ? `<span class="hr-n">${changed}개 바꿈</span>` : ''}</summary>${defs.map(row).join('')}</details>`;
      }
      el.innerHTML = h + '</details></div>';
      if (sc) sc.scrollTop = y;
    };
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b || !canEdit) return;
      sfx('tap');
      const pre = b.closest('[data-pre]');
      if (pre) r = G.normRules(Object.assign({}, G.presetRules(pre.dataset.pre), { chipPer: r.chipPer }));   // 점당 칩은 묶음과 상관없이 그대로
      else if (b.dataset.q === 'baks') { const on = b.dataset.v === '1'; if (b.dataset.v === '2') return; r = G.normRules(Object.assign({}, r, { pibak: on, gwangbak: on, meongbak: on })); }
      else if (b.dataset.q === 'steal') { const lv = STEAL_LV[+b.dataset.v]; if (!lv) return; r = G.normRules(Object.assign({}, r, lv)); }
      else if (b.dataset.k) {
        const d = G.RULE_DEFS.find(q => q.k === b.dataset.k); if (!d) return;
        let nv;
        if (d.t === 'bool') nv = b.dataset.v === '1';
        else if (d.t === 'enum') nv = d.opts.find(q => String(q[0]) === b.dataset.v)[0];
        else {
          const dir = +b.dataset.d, v = r[d.k];
          if (d.steps) { let i = 0; d.steps.forEach((s, k) => { if (Math.abs(s - v) < Math.abs(d.steps[i] - v)) i = k; }); nv = d.steps[Math.max(0, Math.min(d.steps.length - 1, i + dir))]; }
          else nv = v + dir;
        }
        r = G.normRules(Object.assign({}, r, { [d.k]: nv }));
      } else return;
      if (onChange) onChange(r);
      draw();
    };
    if (!el._hrToggle) { el._hrToggle = 1; el.addEventListener('toggle', e => { const g = e.target.dataset && e.target.dataset.g; if (g) { if (e.target.open) HR_OPEN.add(g); else HR_OPEN.delete(g); } }, true); }
    draw();
  }
  function openRuleSheet() {
    sfx('tap');
    C.modal({
      title: '🛠️ 우리 집 규칙',
      html: '<p class="small hr-intro">집마다 규칙이 달라서 하나씩 바꿀 수 있어요. 묶음을 고른 뒤 항목을 더 바꿔도 돼요. 이 기기에 저장돼요</p><div id="hrBox"></div>',
      buttons: [{ label: '📖 규칙 보기', onClick: () => { setTimeout(() => showRules(), 30); } }, { label: '닫기', primary: true }],
      dismiss: true, cls: 'rulesov hrov', onClose: () => { if (!SES) drawMenu(); },
    });
    ruleSheet($('hrBox'), houseRules, true, nr => setRules(nr));
  }

  // ── 규칙 창 (지금 쓰는 우리 집 규칙을 그대로 보여 줌) ─────────────────────
  function rulesHtml(R) {
    R = G.normRules(R);
    const diff = G.diffRules(R).filter(d => d.k !== 'chipPer');
    const pi = n => (n > 0 ? `피 ${n}장씩 받아요` : '피는 안 받아요');
    const dealer = R.saleWho === 'dealer' ? '선만' : R.saleWho === 'others' ? '선을 뺀 사람이' : '선부터 차례로';
    const goTxt = { std: '1고 +1점 · 2고 +2점 · 3고부터 <b>(점수 + 고 횟수) × 2^(고−2)</b> (3고 ×2, 4고 ×4 …)', plus: '고 한 번마다 +1점', double: '고 한 번마다 점수 두 배', none: '고 보너스 없음 (고는 계속하는 선택만)' }[R.goBonus];
    const chong = { score: '바로 이김, 10점', win: `바로 이김, 고/스톱 기준 점수(맞고 ${R.goMatgo}점 · 셋이 ${R.go3}점)`, off: '쓰지 않음 (그냥 계속 쳐요)' }[R.chongtong];
    const p3 = R.ppeok3 === 'off' ? '쓰지 않음' : `바로 이김, ${R.ppeok3Pts || `맞고 ${R.goMatgo} · 셋이 ${R.go3}`}점`;
    const kook = { auto: '정하지 않고 두었다가, 점수를 셀 때마다(고/스톱·판 끝) <b>열끗</b>·<b>쌍피</b> 중 가진 사람에게 나은 쪽으로 저절로 셈 (지면 피박을 피하는 쪽)', choose: '먹는 그 자리에서 <b>열끗</b>으로 둘지 <b>쌍피</b>로 쓸지 골라요. 고른 대로 끝까지 가요', yeol: '늘 <b>열끗</b>으로 셈 (이 집 규칙)', ssang: '늘 <b>쌍피</b>로 셈 (이 집 규칙)' }[R.kook];
    const sale = !R.saleOn ? '<li>이 집은 <b>광 팔기를 쓰지 않아요</b>. 쉬는 사람은 패 없이 구경만 해요</li>' : `<li>쉬는 사람은 더미 위에서 7장씩 받아 둬요. 그중 <b>광</b>이 있으면 판에 내놓아요 (다른 패는 안 보이고, 나중에 더미 아래로 돌아가요)</li><li>${dealer} "그 광을 살래요?" 에 답해요. 사면 그 광이 내 먹은 패가 되고, 값은 <b>광 한 장에 ${R.salePrice ? R.salePrice + '점' : '공짜(0점)'}</b>을 쉬는 사람에게 줘요 (이기든 지든 똑같이). 아무도 안 사면 광은 더미로 돌아가요</li><li>쉬는 사람이 둘이면 광 묶음도 둘까지 나올 수 있어요. 점수 계산은 셋이 치는 고스톱과 똑같아요</li>`;
    const bak = [
      R.pibak && R.pibakX > 1 ? `<tr><td>피박</td><td>이긴 사람이 피로 점수를 냈고, 진 사람 피가 1~7장 (셋이는 1~5장) → ×${R.pibakX}</td></tr>` : '',
      R.gwangbak && R.gwangbakX > 1 ? `<tr><td>광박</td><td>이긴 사람이 광으로 점수를 냈고, 진 사람 광이 0장 → ×${R.gwangbakX}</td></tr>` : '',
      R.meongbak && R.meongbakX > 1 ? `<tr><td>멍박</td><td>이긴 사람 열끗이 7장 이상 (모두에게) → ×${R.meongbakX}</td></tr>` : '',
      R.gobak ? `<tr><td>고박</td><td>고를 했다가 상대가 나면: 맞고는 ×${R.gobakX}, 셋이는 고한 사람이 진 사람 몫을 혼자 다 내요</td></tr>` : '',
      R.shakeX > 1 ? `<tr><td>흔들기·폭탄</td><td>이긴 사람이 한 번마다 ×${R.shakeX}</td></tr>` : '',
      R.nagariX > 1 && R.nagariMax > 0 ? `<tr><td>나가리 판</td><td>앞 판이 나가리였으면 ×${R.nagariX} (연달아 ×${R.nagariX * R.nagariX} …, ${R.nagariMax}번까지 쌓여요)</td></tr>` : '',
    ].join('');
    return `<div class="rules">
    <div class="hr-active"><h3>🛠️ 지금 우리 집 규칙 · ${esc(presetName(R))}</h3>${diff.length ? `<ul>${diff.map(d => `<li><b>${esc(d.label)}</b> ${esc(d.text)}</li>`).join('')}</ul>` : '<p class="small">바꾼 규칙이 없어요. 원래 규칙 그대로예요</p>'}<p class="small">점수 1점 = 🪙 ${R.chipPer}칩 (친구랑 정산용)${R.maxPts ? ` · 한 판에 한 사람이 내는 점수는 ${R.maxPts}점까지` : ''}</p></div>
    <p>화투 48장(열두 달 × 네 장)으로 같은 달끼리 짝을 맞춰 가져오고, 모은 패로 점수를 내요. 둘이 하면 <b>맞고</b>, 셋이 하면 <b>고스톱</b>, 넷·다섯이 하면 셋이 치고 나머지는 돌아가며 쉬는 <b>광 팔기 고스톱</b>이에요.</p>
    <h3>나누기</h3><ul><li>맞고: 한 사람 10장, 바닥 8장 · 셋이: 한 사람 7장, 바닥 6장, 나머지는 더미</li><li>보너스 피: ${R.bonus ? R.bonus + '장 (쌍피' + (R.bonus === 3 ? ' 두 장' : '') + ' + 쓰리피). 바닥에 깔리면 선(먼저 하는 사람)이 가져가요' : '쓰지 않아요'}</li></ul>
    <h3>4~5명: 광 팔기</h3><ul><li>한 판에 3명이 쳐요. 4명이면 1명, 5명이면 2명이 쉬고, 판마다 순서대로 돌아가며 쉬어요 (모두 같은 횟수)</li>${sale}</ul>
    <h3>내 차례</h3><ul><li>손패 한 장을 내요. 바닥에 같은 달이 있으면 그 위에, 없으면 그냥 바닥에</li><li>더미에서 한 장을 뒤집어 똑같이 해요</li><li>짝이 맞은 패(두 장씩)를 내 것으로 가져와요. 같은 달이 바닥에 두 장이면 하나를 골라요</li></ul>
    <h3>특별한 일</h3><table>
      <tr><td>쪽</td><td>바닥에 짝 없이 낸 패를 뒤집은 패가 바로 맞힘 · ${pi(R.stealJjok)}</td></tr>
      <tr><td>따닥</td><td>바닥 두 장 + 낸 패 + 뒤집은 패, 같은 달 네 장을 한꺼번에 · ${pi(R.stealTtadak)}</td></tr>
      <tr><td>싹쓸이</td><td>내 차례가 끝났을 때 바닥이 텅 빔 · ${pi(R.stealSweep)}</td></tr>
      <tr><td>뻑</td><td>낸 패로 짝을 맞췄는데 뒤집은 패도 같은 달 → 세 장이 바닥에 남아요. 나중에 네 번째 패로 먹으면 ${pi(R.stealEat)}, 내가 싼 뻑(자뻑)을 먹으면 ${pi(R.stealSelf)}</td></tr>
      <tr><td>폭탄</td><td>손에 같은 달 세 장 + 바닥에 한 장 → 세 장을 한꺼번에 내서 네 장 다. ${pi(R.stealBomb)} · 흔들기처럼 ${R.shakeX > 1 ? '×' + R.shakeX : '배수 없이'} · 그 뒤 두 번은 '뒤집기만' 해도 돼요</td></tr>
      <tr><td>흔들기</td><td>손에 같은 달 세 장 → 보여 주고 내면, 이겼을 때 ${R.shakeX > 1 ? '×' + R.shakeX : '배수 없음 (보여 주기만)'}</td></tr>
      <tr><td>보너스 피</td><td>내면 바로 내 피가 되고 더미에서 한 장 더 받아요. 더미에서 나오면 먹고 한 장 더 뒤집어요 ${R.bonus ? '' : '(지금은 꺼 둠)'}</td></tr>
      <tr><td>총통</td><td>처음 받은 손패에 같은 달 네 장 → ${chong}</td></tr>
      <tr><td>쓰리뻑</td><td>한 판에 뻑을 세 번 → ${p3}</td></tr>
      ${R.ppeokFirst ? `<tr><td>첫뻑 위로금</td><td>자기 첫 차례에 뻑이 나면 다른 사람마다 <b>${R.ppeokFirst}점</b>씩 받아요. 판 점수와 따로라 판은 안 끝나고, 이기든 지든·나가리여도 주고받아요</td></tr>` : ''}
      ${R.ppeokYeon ? `<tr><td>연뻑 위로금</td><td>같은 사람이 뻑을 연달아 하면 다른 사람마다 <b>${R.ppeokYeon}점</b>씩 받아요</td></tr>` : ''}
    </table><p class="small">마지막 차례의 쪽·따닥·싹쓸이·뻑 먹기는 피를 안 받아요. 피가 없는 사람에겐 못 받고, 쌍피만 있으면 쌍피를 받아요.</p>
    <h3>점수</h3><table>
      <tr><td>광</td><td>3장 3점 (비광이 끼면 2점) · 4장 4점 · 5장 15점</td></tr>
      <tr><td>열끗</td><td>5장 1점, 한 장마다 +1 · 고도리(2·4·8월 새 세 마리) 5점</td></tr>
      <tr><td>띠</td><td>5장 1점, 한 장마다 +1 · 홍단(1·2·3월) · 청단(6·9·10월) · 초단(4·5·7월) 각 3점</td></tr>
      <tr><td>피</td><td>10장 1점, 한 장마다 +1 · 쌍피는 2장, 보너스 쓰리피는 3장으로 셈</td></tr>
      <tr><td>국진</td><td>9월 술잔(열끗): ${kook}</td></tr>
    </table>
    <h3>고 · 스톱</h3><ul><li>내 차례가 끝났을 때 맞고는 <b>${R.goMatgo}점</b>, 셋이는 <b>${R.go3}점</b> 이상이면 <b>고</b>(계속) 또는 <b>스톱</b>(끝내기)</li><li>${goTxt}</li><li>고한 뒤에는 그때보다 점수가 올라야 다시 고르고, 낼 패가 없으면 저절로 스톱</li><li>아무도 못 나고 패가 다 떨어지면 <b>나가리</b> ${R.nagariX > 1 && R.nagariMax > 0 ? `→ 다음 판 점수 ×${R.nagariX} (연달아면 ${R.nagariMax}번까지 쌓여요)` : '→ 다음 판은 그대로 (배수 없음)'}</li></ul>
    <h3>박 · 배수 (진 사람 점수에 곱해요)</h3>${bak ? `<table>${bak}</table>` : '<p class="small">이 집은 박과 배수를 쓰지 않아요</p>'}
    <p class="small">총통·쓰리뻑은 정해진 점수 × 나가리 배수만 (박은 없음).${R.maxPts ? ` 한 사람이 한 판에 낼 수 있는 점수는 ${R.maxPts}점까지예요.` : ''} 점수는 놀이용 점과 🪙 냥코인으로만 쌓여요. 패 왼쪽 위 숫자는 달, 작은 동그라미는 광·끗(열끗)·띠·쌍(쌍피)이에요.</p>
  </div>`;
  }
  // R 을 안 주면 지금 판의 규칙(없으면 이 기기에 저장한 규칙)
  function showRules(R) {
    sfx('tap');
    R = R || (SES && SES.S && SES.S.rules) || houseRules;
    const btns = [{ label: '처음 안내', onClick: () => { setTimeout(() => showHowto(true), 30); } }];
    if (!SES) btns.push({ label: '🛠️ 규칙 바꾸기', onClick: () => { setTimeout(openRuleSheet, 30); } });
    btns.push({ label: '닫기', primary: true });
    return C.modal({ title: '📖 고스톱 규칙', html: rulesHtml(R), buttons: btns, dismiss: true, cls: 'rulesov' });
  }
  function showHowto(force) {
    const R = (SES && SES.S && SES.S.rules) || houseRules;
    return C.howto('gostop', '🎴 고스톱 하는 법', [
      '같은 달(같은 그림)끼리 짝을 맞춰 가져와요',
      '손패를 누르면 짝이 되는 바닥 패가 반짝여요. 한 번 더 누르면 내요 (바닥 패를 눌러도 돼요)',
      '내고 나면 더미에서 한 장이 저절로 뒤집혀요',
      `광·열끗·띠·피를 모아 맞고는 ${R.goMatgo}점, 셋이면 ${R.go3}점부터 <b>고</b>(계속)·<b>스톱</b>(끝내기)`,
      '패 왼쪽 위 숫자는 달, 작은 동그라미는 광·끗·띠·쌍(쌍피). 노란 표가 붙은 손패는 바닥에 짝이 있어요',
      '집마다 규칙이 달라서 <b>🛠️ 우리 집 규칙</b>에서 바꿀 수 있어요',
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
    $('loanBtn').hidden = true; $('bankBtn').hidden = true;
    $('layer').innerHTML = '';
    const rb = $('rpBar'); if (rb) rb.remove();
    $('stage').querySelectorAll('.hud').forEach(e => e.remove());
    show('home'); drawMenu(); drawMistakeBtn();
  }

  // ── AI 일꾼 (🐯 은 Web Worker 에서) ─────────────────────────
  let worker = null, wid = 0;
  const wjobs = new Map();
  try {
    worker = new Worker('ai-worker.js?v=9');
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
    const ses = { cfg, alive: true, readyMap: {}, joinPick: {}, timers: new Set(), waiters: [], modals: [], pending: null, paused: false, S: null, seats: [], sel: -1, pre: -1, net: null, seq: 0, acts: new Map(), actWaiters: [], who: G.tablePlan(cfg.N, 0).who, bench: [], spec: false, hot: !!cfg.hot, hide: !!cfg.hot, panel: null, coachOn: false, coachHtml: null };
    ses.wait = ms => new Promise((res, rej) => {
      if (!ses.alive) return rej(new Cancel());
      const t = setTimeout(() => { ses.timers.delete(t); if (ses.alive) res(); else rej(new Cancel()); }, Math.max(0, ms));
      ses.timers.add(t);
    });
    ses.check = () => { if (!ses.alive) throw new Cancel(); };
    ses.readyOf = r => (ses.readyMap[r] = ses.readyMap[r] || new Set());
    // 탭이 숨었거나 멈춤이면 기다림
    ses.ready = () => new Promise((res, rej) => {
      const go = () => { if (!ses.alive) return rej(new Cancel()); if (document.hidden || ses.paused) { ses.waiters.push(go); return; } res(); };
      go();
    });
    ses.wake = () => { const w = ses.waiters.splice(0); w.forEach(f => f()); };
    ses.dispose = () => {
      ses.alive = false;
      clearInterval(ses.turnT); turnClock(null);
      if (ses.panel) { try { ses.panel.destroy(); } catch (e) {} ses.panel = null; }
      hotClose();
      if (ses.bank) { try { ses.bank.detach(); } catch (e) {} ses.bank = null; }
      (ses.netOffs || []).splice(0).forEach(f => { try { f(); } catch (e) {} });
      if (ses.net && !ses.keepNet) { try { if (window.ArenaUI && ArenaUI.net === ses.net) ArenaUI.leave(); else ses.net.leave(); } catch (e) {} }
      ses.net = null;
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
    const rules = G.normRules(watch && !houseRules.bonus ? Object.assign({}, houseRules, { bonus: 2 }) : houseRules);   // AI 구경은 보너스 피를 안 골랐으면 2장 (예전처럼)
    const cfg = { watch, N: n, rules, bonus: rules.bonus, seed: startSeed, me: watch ? -1 : 0 };
    startSeed = 0;
    const ses = SES = newSession(cfg);
    const used = {};
    const mk = (tier) => { const t = TIER[tier]; used[tier] = (used[tier] || 0) + 1; return { ctrl: 'ai', tier, name: t.names[((watch ? 0 : foeIdx(tier)) + used[tier] - 1) % t.names.length], em: t.em }; };
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
    const rules = G.normRules(houseRules);
    const cfg = { watch: false, hot: true, N, rules, bonus: rules.bonus, seed: startSeed, me: picks.findIndex(s => s.human) };
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
    const rules = G.normRules(cfg && cfg.rules ? cfg.rules : { bonus: cfg && cfg.bonus });   // 방장이 정한 규칙 (옛 방은 보너스 피만)
    const sesCfg = { watch: false, online: true, role, N, rules, bonus: rules.bonus, seed: (cfg && cfg.seed) || 12345, me: myIdx, coach: !!(cfg && cfg.coach) };
    const ses = SES = newSession(sesCfg);
    ses.net = net;
    const AV = ['🎴', '🌸', '🌕', '🍀', '🔥'];
    ses.seats = plist.slice(0, N).map((pl, i) => ({ ctrl: i === myIdx ? 'me' : 'remote', tier: null, name: i === myIdx ? (pl.name || '나') : (pl.name || `친구${i + 1}`), em: i === myIdx ? '나' : AV[i % AV.length], uid: pl.uid }));
    // 이 판(세션)이 붙인 듣기는 세션이 끝날 때 뗌 (방에 남아 다시 시작해도 겹치지 않게)
    ses.netOffs = [];
    const ON = (ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') ses.netOffs.push(off); };
    const pushAct = (m, from) => {
      if (m && m.t === '_chips') {            // 방장이 알려 주는 장부 기준 칩 (친구 화면은 이걸 그대로 따름)
        if (role !== 'host' && Array.isArray(m.coins) && m.round >= (ses.chipSync || 0)) { ses.chips = m.coins.slice(); ses.chipSync = m.round; drawCoinPill(); }
        return;
      }
      if (m && m.t === '_hello') { if (role === 'host' && from) sendSnap(from); return; }
      if (m && m.t === '_ready') {                          // 판 사이 준비 (구경꾼이 누르면 '다음 판에 낄래요')
        if (role !== 'host' || !from || !ses.S || m.round !== ses.S.round) return;
        ses.readyOf(m.round).add(from);
        if (!ses.seats.some(x => x.uid === from)) ses.joinPick[from] = true;
        net.broadcast({ t: '_readyList', round: m.round, uids: [...ses.readyOf(m.round)], pick: ses.joinPick }, true);
        if (ses.drawReady) ses.drawReady();
        return;
      }
      if (m && m.t === '_readyList') { if (role !== 'host' && Array.isArray(m.uids)) { const R = ses.readyOf(m.round); m.uids.forEach(u => R.add(u)); if (ses.drawReady) ses.drawReady(); } return; }   // 다시 들어온 친구: 지금 판을 통째로
      if (m && m.t === '_snap') { if (role !== 'host' && ses.onSnap) ses.onSnap(m); return; }
      if (m && m.t === '_round') {
        if (role === 'host') return;
        let d = null; try { d = JSON.parse(m.j); } catch (e) {}
        if (!d || !d.S || (ses.roundMsg && ses.roundMsg.S.round >= d.S.round)) return;
        ses.roundMsg = d; ses.wake();
        if (ses.pending && ses.pending.isResult && ses.S && d.S.round > ses.S.round) ses.pending.resolve('next');
        return;
      }
      if (!m || m.t !== 'act' || m.seq == null || m.seq < ses.seq || ses.acts.has(m.seq)) return;
      ses.acts.set(m.seq, m.a);
      if (role === 'host') net.broadcast({ t: 'act', seq: m.seq, a: m.a }, true);
      wakeActs(ses);
    };
    // 방장: 지금 판 상태를 그대로 보냄 (자리 = uid 순서). 판이 아직 안 열렸으면 친구가 조금 뒤 다시 물음
    const sendSnap = uid => {
      if (!ses.S || !ses.alive || ses.subThinking) return;    // AI 가 대신 두는 중이면 조금 뒤 (손님이 다시 물음)
      net.send(uid, { t: '_snap', j: JSON.stringify(roundPack(ses)) }, true);
    };
    if (role === 'host') {
      ON('msg', (uid, m) => pushAct(m, uid));
      ON('leave', uid => {
        const i = ses.seats.findIndex(x => x.uid === uid); if (i < 0 || SES !== ses) return;
        C.toast(`${ses.seats[i].name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
        if (ses.drawReady) ses.drawReady();
        // 5초 안에 안 돌아오면 방장이 고름: AI 가 대신 · 다음 판부터 빼기 · 기다리기
        setTimeout(() => { if (!ses.alive || SES !== ses || (net.players || {})[uid] || ses.seats[i] !== ses.seats.find(x => x.uid === uid) || ses.seats[i].sub) return; askGone(ses, i); }, 5000);
      });
      ON('join', uid => {
        const i = ses.seats.findIndex(x => x.uid === uid); if (i < 0 || SES !== ses) return;
        const st = ses.seats[i];
        if (ses.goneAsk && ses.goneAsk.uid === uid) { try { ses.goneAsk.close(); } catch (e) {} ses.goneAsk = null; }
        if (st.sub) { st.sub = false; st.drop = false; st.ctrl = 'remote'; st.tier = null; C.toast(`${st.name} 님이 돌아왔어요. 다시 직접 쳐요`, 2400); try { net.chat(`🙌 ${st.name} 님이 돌아와서 직접 쳐요`); } catch (e) {} }
      });
    } else ON('msg', m => pushAct(m));
    ON('players', () => { if (SES !== ses) return; if (ses.S && ses.hud) drawHud(ses); if (ses.drawReady) ses.drawReady(); });   // 구경 인원 · 준비 목록
    net.sendAct = (a) => {
      const m = { t: 'act', seq: ses.seq, a };
      ses.acts.set(ses.seq, a);                // 내 수도 묶음에 (되돌아온 것은 무시)
      if (role === 'host') net.broadcast(m, true);
      else net.send(m, true);
    };
    // 친구: 방장에게 지금 판을 받아서 시작 (처음이든, 나갔다 다시 들어왔든 같은 길)
    if (role !== 'host') {
      ses.snapP = new Promise(res => {
        let tries = 0;
        const ask = () => { if (!ses.alive || ses.snapGot) return; if (++tries > 12) { res(null); return; } net.send({ t: '_hello' }, true); ses.snapT = setTimeout(ask, 1500); };
        ses.onSnap = m => { if (ses.snapGot) return; let d = null; try { d = JSON.parse(m.j); } catch (e) {} if (!d || !d.S) return; ses.snapGot = true; clearTimeout(ses.snapT); res(d); };
        ask();
      });
    }
    ses.coachOn = sesCfg.coach;
    show('play');
    setupCoach(ses);
    // 🏦 은행 (방장이 모임을 고른 방만): 방장은 장부에 연결해 시작 칩을 받고, 친구는 빌리기만 요청
    if (cfg && cfg.bank && window.Bank) {
      if (Bank.getMeta) Bank.getMeta(cfg.bank).then(m => { if (SES === ses && m && m.chipWon) { ses.chipWon = m.chipWon; drawCoinPill(); if (ses.S && ses.hud) drawHud(ses); } }, () => {});
      const seatsB = ses.seats;
      if (role === 'host') {
        ses.bank = Bank.attach({ game: 'gostop', net, cfg, seats: seatsB, min: bankMin(rules), start: START_WON, negative: true, onEvent: ev => bankEvent(ses, ev) });   // 마이너스 됨 (자동 빌리기 없음)
        drawDock();
        $('lbl').textContent = `👥 친구랑 (${net.code})`; $('sub').textContent = '🏦 은행 장부를 여는 중…';
        ses.bank.ready.then(stacks => {
          if (!ses.alive || SES !== ses) return;
          ses.startChips = CHIPS.start('host', N).map((b, i) => (stacks && stacks[i] != null ? stacks[i] : b));   // 은행 쓰는 사람은 잔액(0·마이너스도 그대로), 나머지는 기본 칩
          if (ses.bank.rel0) ses.rel = ses.bank.rel0();          // 📊 통산 승패·통산 원·두 사람끼리 전적 (장부에서, 판 묶음으로 친구에게도)
          net.broadcast({ t: '_chips', round: 0, coins: ses.startChips }, true);
          runMatch(ses);
        });
        return;
      }
      ses.bank = Bank.attach({ game: 'gostop', net, cfg, role: 'guest', onEvent: ev => bankEvent(ses, ev) });
    }
    drawDock();
    runMatch(ses);
  }
  // 은행에서 자동으로 빌려 주는 기준: 이 칩보다 적으면 다음 판 전에 빌려요 (점당 칩의 20배)
  const START_WON = 0;                                     // 🏦 시작 돈 없이 0에서 +/− (화면은 '이번 게임'·'통산' 손익으로) — 만원 들고 시작하려면 10000
  const bankMin = () => 1;                                 // 바닥나면(1칩 아래) 다음 판 전에 은행이 자동으로 더 빌려 줌
  function bankEvent(ses, ev) {
    if (!ses.alive || !ev) return;
    const host = ses.cfg.role === 'host';
    if (ev.op === 'queued') C.toast(ev.mine || !host ? `💰 다음 판에 ${fmtN(ev.n)}칩을 받아요` : `💰 ${ev.name} 님이 ${fmtN(ev.n)}칩 빌리기 (다음 판에)`, 2200);
    else if (ev.op === 'loan') {
      if (!ev.start) C.toast(`🎟️ ${ev.name} 님 칩이 바닥나 다시 채웠어요 — 손익은 마이너스로 이어져요`, 2400);   // 시작 돈은 장부 안에서만 (화면은 0원에서 시작)
      if (host && ses.net) ses.net.broadcast({ t: '_bank', op: 'loan', name: ev.name, n: ev.n }, true);
    } else if (ev.op === 'no' || ev.op === 'error') C.toast('🏦 ' + (ev.msg || '은행 장부에 못 썼어요'), 2600);
  }
  Cozy.backGuard($('backBtn'), () => { sfx('tap'); goHome(); });

  async function runMatch(ses) {
    try {
      const baseSeed = (ses.cfg.seed || rand32()) >>> 0;
      let s = null;
      // 친구랑 손님: 방장의 지금 판으로 시작 (나갔다 다시 들어와도 이어서)
      if (ses.snapP) {
        $('sub').textContent = '방장 화면과 맞추는 중…';
        const d = await ses.snapP; ses.check();
        if (d) {
          s = adoptPack(ses, d); ses.resume = d.seq > 0;
          if (Array.isArray(d.chips)) ses.startChips = d.chips;
          if (ses.cfg.me < 0) C.toast('지금 판은 구경해요. 다음 판부터 같이 해요', 3000);
        }
      }
      if (!s && ses.startState) { s = ses.startState; ses.startState = null; }   // 🎮 복기에서 '여기서부터 내가 치기'
      if (!s) {
        let seon = seonMode(ses.cfg.rules), first = 0;
        if (seon && !FAST && !ses.cfg.watch && !ses.cfg.online && !G.modeOf(ses.cfg.N).bench) { first = await pickSeon(ses, seon); ses.check(); seon = null; }   // 👑 엎은 패에서 직접 뽑기
        s = G.create({ players: ses.cfg.N, bonus: ses.cfg.bonus, rules: ses.cfg.rules, seed: baseSeed, first, seon });
      }
      ses.kind = ses.cfg.watch ? 'watch' : ses.hot ? 'hot' : ses.cfg.online ? (ses.cfg.role === 'host' ? 'host' : 'guest') : 'solo';
      ses.chips = (ses.startChips || CHIPS.start(ses.kind, ses.cfg.N)).slice();
      for (;;) {
        await playRound(ses, s);
        if (!ses.isDrill) reportChips(ses); else ses.lastDeltas = null;
        let next;
        for (;;) {                                           // 🎞️ 다시 보기를 보고 오면 결과 창을 다시
          next = await showResult(ses);
          if (next && typeof next === 'object' && next.replay) { await runReplay(ses, next.replay, true); ses.check(); continue; }   // 🎮 여기서부터 치기로 갔으면 이 판은 끝
          break;
        }
        if (next && typeof next === 'object' && next.drillState) {
          s = G.fastClone(next.drillState);
          ses.isDrill = true;
          continue;
        }
        ses.isDrill = false;
        if (next !== 'next') { goHome(); return; }
        // 은행: 빌리기 요청 + 칩이 모자란 사람은 은행에서 빌려 채움 (공짜 리필 없음). 새 칩은 친구 화면에도 알림
        if (ses.bank && ses.cfg.role === 'host') {
          $('sub').textContent = '🏦 장부에 쓰는 중…';
          const r = await ses.bank.beforeNext({ coins: ses.chips, min: bankMin(ses.S.rules) });
          ses.check();
          ses.chips = r.coins.slice();
          if (r.reloaded && ses.bank.rel0) ses.rel = ses.bank.rel0();   // 정산하고 새로 시작했으면 '이번 게임'·통산 기준도 새로
          drawCoinPill();
          if (ses.net) ses.net.broadcast({ t: '_chips', round: ses.S.round, coins: ses.chips }, true);
        }
        if (ses.cfg.online && ses.cfg.role !== 'host') {
          $('sub').textContent = '방장이 다음 판을 여는 중…';
          for (;;) { ses.check(); const d = ses.roundMsg; if (d && d.S.round > ses.S.round) { s = adoptPack(ses, d); if (Array.isArray(d.chips)) ses.chips = d.chips.slice(); break; } await new Promise(res => ses.waiters.push(res)); }
          continue;
        }
        const rSeed = ses.cfg.online ? ((baseSeed + (ses.S.round + 1) * 0x9e3779b9) >>> 0) : rand32();
        s = ses.cfg.online ? hostNextRound(ses, rSeed) : G.nextRound(ses.S, { seed: rSeed });
      }
    } catch (e) {
      if (e instanceof Cancel) return;
      console.error(e);
      if (C.sendReport) C.sendReport('error', '(고스톱 진행 중 멈춤) ' + (e && e.message || e), { src: String((e && e.stack || '').split(/\n/)[1] || '').trim().slice(0, 200) });   // 🧯 베니비서로
      if (SES === ses) { C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); }
    }
  }

  // ── 친구랑 판 묶음: 방장 판 상태 + 자리(uid 순서) + 차례 번호 + 칩
  const AVS = ['🎴', '🌸', '🌕', '🍀', '🔥'];
  const roundPack = (ses, S) => ({ S: S || ses.S, seq: ses.seq, uids: ses.seats.map(x => x.uid), names: ses.seats.map(x => x.name), chips: ses.chips, score: ses.score || null, rel: ses.rel || null, subs: ses.seats.map(x => !!x.sub) });
  // 손님: 묶음대로 자리 맞추기. 내 uid 가 없으면 구경 (me = -1)
  function adoptPack(ses, d) {
    const idx = d.uids.indexOf(ses.net.uid);
    ses.seats = d.uids.map((u, i) => {
      const old = ses.seats.find(x => x.uid === u);
      const name = (d.names && d.names[i]) || (old && old.name) || `친구${i + 1}`;
      return { ctrl: i === idx ? 'me' : 'remote', tier: null, name, em: i === idx ? '나' : AVS[i % AVS.length], uid: u, sub: !!(d.subs && d.subs[i]) };
    });
    ses.cfg.me = idx; ses.cfg.N = d.uids.length; ses.seq = d.seq;
    if (d.score) ses.score = { w: d.score.w || [], l: d.score.l || [] };
    if (d.rel) ses.rel = d.rel;
    return d.S;
  }
  // 방장: 다음 판 열기. 구경하던 사람(새로 온 사람)은 5명까지 자리에 넣고, 인원이 바뀌면 방식도 바뀜 (2 맞고 → 3 고스톱 …)
  function hostNextRound(ses, rSeed) {
    const pl = (ses.net && ses.net.players) || {}, have = new Set(ses.seats.map(x => x.uid));
    const prev = ses.S, r = prev.result, old = ses.seats;
    const prevUid = old[prev.who[r && r.winner >= 0 ? r.winner : prev.first]].uid;
    // 빠지는 자리: '다음 판부터 빼기' + 나가서 AI 가 대신 치던 자리(방에 없으면) — 은행 방도 판 사이엔 뺌 (안 빼면 4명이 돼 사람이 쉬는 차례가 됨)
    let out = x => x.drop || (x.sub && x.uid && !pl[x.uid]);
    if (old.filter(x => !out(x)).length < 2) out = x => x.drop;   // 둘이서(맞고)라 빼면 혼자가 되면 AI 가 계속 침
    const keep = old.map((x, i) => i).filter(i => !out(old[i]));
    const fresh = Object.keys(pl).filter(u => !have.has(u) && !(pl[u] && pl[u].watch) && ses.joinPick[u]).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    const add = fresh.slice(0, Math.max(0, 5 - keep.length));
    let s;
    if (add.length || keep.length !== old.length) {
      const gone = old.filter(out).map(x => x.name);
      ses.seats = keep.map(i => old[i]); ses.chips = keep.map(i => ses.chips[i]);
      if (ses.score) { ses.score.w = keep.map(i => ses.score.w[i]); ses.score.l = keep.map(i => ses.score.l[i]); }
      if (ses.rel) relRemap(ses, keep, add.length);
      for (const u of add) { const i = ses.seats.length; ses.seats.push({ ctrl: 'remote', tier: null, name: (pl[u] && pl[u].name) || `친구${i + 1}`, em: AVS[i % AVS.length], uid: u }); ses.chips.push(CHIPS.start('host', 1)[0]); delete ses.joinPick[u]; }
      const N = ses.seats.length, plan = G.tablePlan(N, prev.round);
      const fi = Math.max(0, ses.seats.findIndex(x => x.uid === prevUid));
      s = G.create({ players: N, rules: ses.nextRules || prev.rules, bonus: ses.nextRules ? ses.nextRules.bonus : prev.bonus, seed: rSeed, first: Math.max(0, plan.who.indexOf(fi)), carry: r && r.kind === 'nagari' ? Math.min(prev.rules.nagariMax, prev.carry + 1) : 0, round: prev.round + 1 });
      ses.cfg.N = N; ses.cfg.me = ses.seats.findIndex(x => x.uid === ses.net.uid);
      const msg = [add.length ? `${add.map(u => (pl[u] && pl[u].name) || '친구').join(', ')} 님 합류` : '', gone.length ? `${gone.join(', ')} 님 빠짐` : ''].filter(Boolean).join(' · ');
      C.toast(`${msg} → ${N}명 ${G.modeOf(N).name}`, 2600);
      try { ses.net.chat(`📣 ${msg} → 이번 판부터 ${N}명 ${G.modeOf(N).name}`); } catch (e) {}
    } else s = G.nextRound(ses.S, { seed: rSeed, rules: ses.nextRules || undefined, bonus: ses.nextRules ? ses.nextRules.bonus : undefined });
    if (ses.nextRules) { try { ses.net.chat(`🛠️ 방장이 규칙을 바꿨어요: ${ruleSummary(ses.nextRules)}`); } catch (e) {} ses.cfg.rules = ses.nextRules; ses.nextRules = null; }
    ses.S = s;                                             // 이제 들어오는 사람도 새 판을 받게
    ses.net.broadcast({ t: '_round', j: JSON.stringify(roundPack(ses, s)) }, true);
    return s;
  }

  // 방장: 나간 사람 자리를 어떻게 할지 묻기
  function askGone(ses, i) {
    const st = ses.seats[i]; if (!st || st.sub || ses.goneAsk) return;
    const canDrop = ses.seats.length > 2 && !ses.bank;
    const close = C.modal({
      title: `🔌 ${st.name} 님이 나갔어요`,
      html: `<p style="margin:0">어떻게 할까요? AI 는 🎴 중급이 대신 쳐요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.${ses.bank ? '<br><span class="small">은행 방은 자리를 빼지 않고 AI 가 대신 쳐요</span>' : ''}</p>`,
      buttons: [{ label: '🤖 AI가 대신 쳐요', primary: true, onClick: () => subAI(ses, i, false) }]
        .concat(canDrop ? [{ label: `👋 이번 판만 AI · 다음 판부터 ${ses.seats.length - 1}명`, onClick: () => subAI(ses, i, true) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { if (window.ArenaUI && ArenaUI.net === ses.net) { try { ses.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} ArenaUI.toLobby(); } } }, { label: '⏳ 기다릴게요' }]),
      dismiss: false, onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; ses.modals = ses.modals.filter(x => x !== close); },
    });
    ses.goneAsk = { uid: st.uid, close }; ses.modals.push(close);
  }
  function subAI(ses, i, drop) {
    const st = ses.seats[i]; if (!st) return;
    st.sub = true; st.drop = !!drop; st.ctrl = 'ai'; st.tier = 'normal';
    try { ses.net.chat(drop ? `🤖 ${st.name} 님 자리는 이번 판만 AI 가 치고, 다음 판부터 빠져요` : `🤖 ${st.name} 님 자리는 AI 가 대신 쳐요 (돌아오면 다시 직접)`); } catch (e) {}
    // 지금 그 자리 차례를 기다리는 중이면 AI 가 바로 둠
    const p = ses.who.indexOf(i), S = ses.S;
    if (p >= 0 && S && S.phase !== 'end' && S.turn === p && ses.actWaiters.length && !ses.acts.has(ses.seq)) {
      const seq = ses.seq; ses.subThinking = true;
      aiTurn(ses, p).then(a => { ses.subThinking = false; if (!ses.alive || ses.seq !== seq || ses.acts.has(seq)) return; ses.net.sendAct(a); wakeActs(ses); }, () => { ses.subThinking = false; });
    }
    if (ses.drawReady) ses.drawReady();
  }

  // 친구랑 방장: 판 사이에 규칙(점당 포함) 바꾸기 → 다음 판부터 모두에게 (방을 닫지 않음)
  function openRoundRules(ses) {
    sfx('tap');
    let cur = G.normRules(ses.nextRules || (ses.S && ses.S.rules) || houseRules);
    C.modal({
      title: '🛠️ 다음 판부터 쓸 규칙',
      html: '<p class="small hr-intro">바꾸면 다음 판부터 모두에게 적용돼요. 점당은 맨 아래 \'🪙 점수 · 칩\'에 있어요 (기본 은행 1칩 = 100원)</p><div id="hrBox2"></div>',
      buttons: [{ label: '그대로', onClick: () => { ses.nextRules = null; } }, { label: '다음 판부터 적용', primary: true, onClick: () => { ses.nextRules = cur; setRules(cur); C.toast(`다음 판부터: ${ruleSummary(cur)}`, 2200); } }],
      dismiss: true, cls: 'rulesov hrov',
    });
    ruleSheet($('hrBox2'), cur, true, nr => { cur = G.normRules(nr); });
  }

  // 첫 판 선 뽑기 방식 (밤일낮장은 지금 시각으로: 낮 6~18시 높은 월, 밤 낮은 월). 안 뽑으면 null
  function seonMode(r) {
    const k = r && r.seon;
    if (k === 'off') return null;
    if (k === 'night') { const h = new Date().getHours(); return h >= 18 || h < 6 ? 'low' : 'high'; }
    return k === 'low' ? 'low' : 'high';
  }
  // 👑 선 정하기: 자리마다 뽑은 한 장 → 월이 높은(낮은) 사람이 선
  function showSeon(ses, d) {
    if (FAST) return Promise.resolve();
    return new Promise(res => {
      const rows = d.cards.map((c, p) => `<div class="seon${p === d.first ? ' win' : ''}">${ART.use(c)}<b>${seatAt(ses, p).em !== nameOf(ses, p) ? esc(seatAt(ses, p).em) + ' ' : ''}${esc(nameOf(ses, p))}</b><span>${G.monthOf(c) + 1}월${p === d.first ? ' · 👑 선' : ''}</span></div>`).join('');
      let t = 0;
      const close = C.modal({
        title: '👑 선 정하기', cls: 'seonbox',
        html: `<p class="small" style="margin:0 0 8px">한 장씩 뽑았어요. 월이 가장 ${d.mode === 'low' ? '낮은' : '높은'} 사람이 선!</p><div class="seonrow">${rows}</div>`,
        buttons: [{ label: nameOf(ses, d.first) === '나' ? '내가 선! 시작' : `${nameOf(ses, d.first)} 선으로 시작`, primary: true }], dismiss: true,
        onClose: () => { clearTimeout(t); ses.modals = ses.modals.filter(x => x !== close); res(); },
      });
      ses.modals.push(close);
      sfx('pop');
      t = setTimeout(() => close(), ses.cfg.watch ? 2200 : 4200);
    });
  }

  // 🎭 AI 대사 (11-01 베니 님: 타짜 분위기로 한 번씩) — 영화 대사를 옮기지 않고 새로 지은 말. 혼자·한 기기만 (친구 방은 사람 채팅이 있어서)
  const SAY = {
    평경장: { start: ['자, 손 풀고 시작해 볼까', '오늘도 배우는 마음으로 한 판'], brag: ['봤지? 나온 패를 세면 길이 보여', '서두르지 않으니 패가 알아서 오는구먼', '이 정도는 기본이야'], ouch: ['허허, 오늘은 패가 장난을 치네', '이런 날도 있어야 겸손해지지'], go: ['아직 배가 덜 찼어. 한 번 더', '판이 내 편일 때 밀어야지'], taunt: ['급하면 손이 먼저 나가는 법이야', '패를 보지 말고 판을 봐'] },
    고광렬: { start: ['자자 판 깔아 봅시다~', '오늘은 내가 쏜다! 돈은 니들이 내고'], brag: ['아이고 이거 미안해서 어쩌나~', '내가 또 해냈네? 박수 좀 쳐 줘', '오늘 손이 아주 그냥 불이야'], ouch: ['어어? 이건 반칙이지 이거', '패가 나를 싫어하네 오늘'], go: ['여기서 멈추면 사나이가 아니지! 고!', '간다간다 쭉쭉 간다~'], taunt: ['어이쿠, 그거 아프겠다~', '괜찮아 괜찮아, 다음 판도 있잖아'] },
    아귀: { start: ['조용히 치자', '판 돌려'], brag: ['...가져간다', '눈 깜빡하면 끝이야', '계산 끝났어'], ouch: ['...운이 좋았다고 생각해', '이번만이야'], go: ['고. 멈출 이유가 없지', '더 간다. 겁나면 지금 말해'], taunt: ['손이 떨리는군', '그렇게 쳐서 남는 게 있겠어?'] },
    짝귀: { start: ['시작하지', '잘 부탁해'], brag: ['됐다', '이 정도면 충분하지', '깔끔하게'], ouch: ['흠', '그럴 수도 있지'], go: ['한 번 더', '고'], taunt: ['천천히 해', '패는 도망 안 가'] },
    _easy: { start: ['잘 부탁드려요!', '살살 해 주세요~'], brag: ['우와 먹었다!', '이게 되네?', '오 나 잘하는데?'], ouch: ['어? 이거 왜 안 붙어요?', '아 뻑이다 ㅠㅠ'], go: ['고...해도 되는 거 맞죠?', '에라 모르겠다 고!'], taunt: ['어? 그쪽도 뻑이네요 ㅎㅎ'] },
    _normal: { start: ['자, 한 판 하세', '오랜만에 손맛 좀 보세'], brag: ['허허, 이걸 가져가는구먼', '어디 한번 보세나', '이 맛에 치는 거지'], ouch: ['에잉, 패가 고약하네', '허참, 이런 일이'], go: ['한 번 더 가 보세', '여기서 그만두면 섭하지'], taunt: ['젊은이, 서두르지 말게', '허허, 그럴 때도 있지'] },
  };
  function aiSay(ses, p, kind, always) {
    if (FAST || ses.cfg.online || ses.replaying || p == null || p < 0) return;
    const st = seatAt(ses, p);
    if (!st || st.ctrl !== 'ai') return;
    const now = Date.now();
    if (!always && (now - (ses.sayAt || 0) < 9000 || Math.random() > 0.55)) return;
    const bank = SAY[st.name] || SAY['_' + st.tier] || SAY._normal, lines = bank[kind];
    const h = ses.hud && ses.hud[p];
    if (!lines || !lines.length || !h || !h.seat) return;
    ses.sayAt = now;
    const b = document.createElement('div'); b.className = 'sayb'; b.textContent = lines[Math.floor(Math.random() * lines.length)];
    h.seat.appendChild(b);
    setTimeout(() => b.classList.add('out'), D(2600)); setTimeout(() => b.remove(), D(3100));
  }
  const firstAi = ses => { for (let p = 0; p < ses.S.n; p++) if (seatAt(ses, p).ctrl === 'ai') return p; return -1; };
  function sayFor(ses, e) {
    const ai = p => p != null && p >= 0 && seatAt(ses, p).ctrl === 'ai';
    if (['jjok', 'ttadak', 'sweep', 'eat', 'bomb'].includes(e.t) && ai(e.p)) aiSay(ses, e.p, 'brag');
    else if (e.t === 'ppeok') { if (ai(e.p)) aiSay(ses, e.p, 'ouch'); else aiSay(ses, firstAi(ses), 'taunt'); }
    else if (e.t === 'go' && ai(e.p)) aiSay(ses, e.p, 'go', true);
  }

  // 🔀 섞는 모습 (11-01 베니 님: 짧게라도 보여 주기 · 화면을 누르면 건너뜀) — 더미 위 몇 장을 좌우로 갈라 번갈아 겹침
  async function shuffleAnim(ses) {
    if (FAST || !VM || !VM.deck.length) return;
    const T = targets(ses), ids = VM.deck.slice(-16);
    if (!ids.every(c => T[c])) return;
    let skip = false;
    const stage = $('stage'), onTap = () => { skip = true; };
    stage.addEventListener('pointerdown', onTap, { once: true });
    const sub = $('sub'), old = sub.textContent;
    sub.textContent = '🔀 패를 섞는 중… (누르면 건너뛰어요)';
    for (let r = 0; r < 3 && !skip; r++) {
      await Promise.all(ids.map((c, i) => { const t = T[c], side = (i + r) % 2 ? 1 : -1; return moveTo(c, Object.assign({}, t, { x: t.x + side * (30 + (i % 4) * 7), y: t.y - (i % 3) * 3, r: side * (7 + r * 3), z: 420 + i }), { dur: D(170), arc: 6 }); }));
      sfx('flip');
      if (skip) break;
      await Promise.all(ids.map((c, i) => { const z = 400 + ((i * 7 + r * 5) % ids.length); return moveTo(c, Object.assign({}, T[c], { z }), { dur: D(160), arc: 0 }); }));
      sfx('slap');
    }
    stage.removeEventListener('pointerdown', onTap);
    sub.textContent = old;
    await syncAll(ses, 0);
  }

  // 👑 선 뽑기 (11-01 베니 님: 바닥에 엎어 둔 패에서 각자 한 장) — 혼자·한 기기 첫 판. 사람이 고르고 AI 는 남은 데서, 다 뒤집어 월이 높은(낮은) 사람이 선
  function pickSeon(ses, mode) {
    return new Promise(res => {
      const k = Math.min(12, ses.seats.length + 4);
      const rnd = () => rand32() / 4294967296;
      const months = Array.from({ length: 12 }, (_, i) => i);
      for (let i = 11; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = months[i]; months[i] = months[j]; months[j] = t; }
      const cards = months.slice(0, k).map(m => m * 4 + Math.floor(rnd() * 4));
      const owner = new Array(k).fill(-1), humans = [], ais = [];
      ses.seats.forEach((st, p) => (st.ctrl === 'ai' ? ais : humans).push(p));
      let hi = 0, first = -1, done = false, t = 0;
      const nm = p => ses.seats[p].name;
      const close = C.modal({
        title: '👑 선 뽑기', cls: 'seonbox', buttons: [],
        html: '<p class="small seonmsg" style="margin:0 0 8px"></p><div class="seonpick"></div>',
        onClose: () => { clearTimeout(t); ses.modals = ses.modals.filter(x => x !== close); res(first >= 0 ? first : 0); },
      });
      ses.modals.push(close);
      const box = document.querySelector('.seonbox .seonpick'), msg = document.querySelector('.seonbox .seonmsg');
      const draw = () => {
        box.innerHTML = cards.map((c, i) => { const o = owner[i]; return `<button type="button" class="sp${o >= 0 ? ' own' : ''}${done && o === first ? ' win' : ''}" data-k="${i}"${o >= 0 || done ? ' disabled' : ''}>${done && o >= 0 ? ART.use(c) : ART.use(-1, 'b')}<b>${o >= 0 ? esc(nm(o)) : '&nbsp;'}</b><span>${done && o >= 0 ? (G.monthOf(c) + 1) + '월' : '&nbsp;'}</span></button>`; }).join('')
          + (done ? `<div class="spgo"><button type="button" class="btn primary" data-go>${nm(first) === '나' ? '내가 선! 시작' : esc(nm(first)) + ' 선으로 시작'}</button></div>` : '');
        msg.textContent = done ? `👑 ${nm(first) === '나' ? '내가' : nm(first)} 선! 월이 가장 ${mode === 'low' ? '낮아요' : '높아요'}`
          : humans.length > 1 ? `${nm(humans[hi])} 님, 엎어 둔 패에서 한 장 골라 주세요` : '엎어 둔 패에서 한 장 골라 주세요';
      };
      const finish = () => {
        for (const p of ais) { const free = owner.map((o, i) => (o < 0 ? i : -1)).filter(i => i >= 0); owner[free[Math.floor(rnd() * free.length)]] = p; }
        let best = -1;
        owner.forEach((o, i) => { if (o < 0) return; const m = G.monthOf(cards[i]); if (best < 0 || (mode === 'low' ? m < G.monthOf(cards[best]) : m > G.monthOf(cards[best]))) best = i; });
        first = owner[best]; done = true; sfx('pop'); draw();
        t = setTimeout(() => close(), D(3200));
      };
      box.addEventListener('click', e => {
        if (e.target.closest('[data-go]')) { close(); return; }
        const b = e.target.closest('[data-k]'); if (!b || done) return;
        const i = +b.dataset.k; if (owner[i] >= 0) return;
        owner[i] = humans[hi++]; sfx('flip');
        if (hi >= humans.length) finish(); else draw();
      });
      draw();
    });
  }

  // 판이 끝날 때마다 칩 변화를 알림: 점수 변화 × 점당 칩 (합 0). 친구랑에서 손님은 방장이 보내니 알리지 않음 (섯다와 같음)
  // 📊 은행 방: rel = { chipWon, on[], s0[](이번 게임 시작 칩), base[](빌린 칩), totWon[](정산된 원), w[] l[](통산), pw[i][j](i 가 j 를 이긴 수), pm[i][j](i 가 j 에게서 딴 칩) }
  //   방장이 장부에서 만들어 판 묶음으로 나눠 주고, 판마다 모든 화면이 같은 계산으로 더함 (장부에는 방장이 씀)
  function relAdd(ses, s, r, deltas) {
    const R = ses.rel; if (!R) return;
    if (r.kind !== 'nagari' && r.winner >= 0) {
      const wi = s.who[r.winner];
      s.who.forEach((rs, p) => { if (!R.on[rs]) return; if (p === r.winner) R.w[rs]++; else { R.l[rs]++; if (R.on[wi]) R.pw[wi][rs]++; } });
    }
    const rows = Object.keys(deltas).map(i => ({ i: +i, d: deltas[i] })).filter(x => x.d && R.on[x.i]);
    const pos = rows.filter(x => x.d > 0), neg = rows.filter(x => x.d < 0), P = pos.reduce((a, x) => a + x.d, 0);
    if (P) for (const n of neg) for (const q of pos) { const f = Math.round((-n.d * q.d) / P); R.pm[q.i][n.i] += f; R.pm[n.i][q.i] -= f; }
  }
  // 자리가 바뀜 (keep = 남는 자리, add = 새로 온 사람 수 — 새 사람은 장부에 안 묶임)
  function relRemap(ses, keep, add) {
    const R = ses.rel, n = keep.length + add, pick = a => keep.map(i => a[i]).concat(Array(add).fill(null));
    for (const k of ['s0', 'base', 'totWon', 'w', 'l']) R[k] = pick(R[k]).map(v => v ?? 0);
    R.on = keep.map(i => R.on[i]).concat(Array(add).fill(false));
    for (const k of ['pw', 'pm']) R[k] = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a < keep.length && b < keep.length ? R[k][keep[a]][keep[b]] : 0)));
  }
  const relOn = (ses, i) => !!(ses.rel && ses.rel.on[i] && ses.chips && ses.chips[i] != null);
  const sgnN = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v));
  const wonOf = (ses, chips) => Math.round(chips * ((ses.rel && ses.rel.chipWon) || ses.chipWon || 1));
  const gainWon = (ses, i) => wonOf(ses, ses.chips[i] - ses.rel.s0[i]);                       // 이번 게임 (자리에 앉은 뒤)
  const totWon = (ses, i) => ses.rel.totWon[i] + wonOf(ses, ses.chips[i] - ses.rel.base[i]);  // 통산 (정산된 것 + 정산 전)
  function reportChips(ses) {
    const s = ses.S, r = s && s.result; if (!r) return;
    ses.score = ses.score || { w: [], l: [] };
    if (r.kind !== 'nagari' && r.winner >= 0) s.who.forEach((rs, p) => { const k = p === r.winner ? 'w' : 'l'; ses.score[k][rs] = (ses.score[k][rs] || 0) + 1; });
    const per = s.rules.chipPer, pts = G.pointDeltas(s), deltas = {};
    pts.forEach((x, i) => { deltas[i] = x * per; });
    relAdd(ses, s, r, deltas);
    ses.lastDeltas = deltas;
    // 친구 화면: 방장이 이미 이 판 뒤의 칩을 알려 줬으면 거기에 또 더하지 않음
    if (!(ses.kind === 'guest' && (ses.chipSync || 0) >= s.round)) ses.chips = (ses.chips || CHIPS.start(ses.kind, ses.cfg.N)).map((c, i) => c + (deltas[i] || 0));
    drawCoinPill();
    if (ses.kind === 'guest') return;
    const win = r.kind !== 'nagari' && r.winner >= 0 ? [s.who[r.winner]] : [], lose = win.length ? s.who.filter(rs => rs !== win[0]) : [];
    CHIPS.report(ses.kind, { round: s.round, over: false, deltas, coins: ses.chips.slice(), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl, uid: x.uid })), me: ses.cfg.me, win, lose });
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
    else { const t = TIER[(ses.seats.find(x => x.ctrl === 'ai' && TIER[x.tier]) || {}).tier]; $('lbl').textContent = t ? `${mode} · ${t.em} ${t.name}` : mode; }   // 복기 연습에서 내가 2번 자리여도 (예전엔 1번 자리를 AI 로 여겨 멈춤)
    // 쉬는 사람 (4~5명)
    const bb = $('benchBar');
    if (ses.bench.length) {
      bb.hidden = false;
      bb.innerHTML = '💤 쉬는 사람: ' + ses.bench.map(b => `<b>${esc(tname(ses, b))}</b>`).join(' · ') + (ses.spec && !ses.hot ? ' <span>— 구경 중</span>' : '');
    } else bb.hidden = true;
    drawCoinPill();
  }
  // 친구랑은 내 칩(방장이 알려 주는 장부 값), 나머지는 냥코인
  function drawCoinPill() {
    const ses = SES, i = ses && ses.cfg.online ? ses.cfg.me : -1;
    if (i >= 0 && relOn(ses, i)) { $('coinPill').textContent = `💰 이번 게임 ${sgnN(gainWon(ses, i))}원`; return; }
    $('coinPill').textContent = i >= 0 && ses.chips && ses.chips[i] != null ? (ses.chipWon ? '💰 내 돈 ' + fmtN(Math.round(ses.chips[i] * ses.chipWon)) + '원' : '🪙 내 칩 ' + fmtN(ses.chips[i])) : '🪙 모은 ' + fmtN(coins) + '냥';
  }
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
      if (s.shake[p]) tags.push(`<span class="tag sh">${s.shake[p] > 1 && s.rules.shakeX > 1 ? '×' + Math.pow(s.rules.shakeX, s.shake[p]) : '흔듦'}</span>`);
      if (s.ppeok[p]) tags.push(`<span class="tag pp">뻑${s.ppeok[p]}</span>`);
      h.seat.querySelector('.tags').innerHTML = tags.join('');
      h.seat.classList.toggle('turn', s.phase !== 'end' && (ses.actor != null ? ses.actor === p : s.turn === p));

      const cnt = [t.g, t.y, t.t, t.pi];
      const hot = [t.gwang > 0, t.yeol > 0 || t.godori > 0, t.tti > 0 || t.dan > 0, t.piPts > 0];
      h.labels.forEach((l, gi) => { l.innerHTML = `${GROUP_NAME[gi]} <b>${cnt[gi]}</b>`; l.classList.toggle('hot', hot[gi]); });
    }
    for (let p = 0; p < s.n; p++) { if (seatPos(ses, p) === 'bottom') continue; const hc = ses.hud[p].hc, k = (VM ? VM.hand[p].length : s.hands[p].length) + ((s.pass && s.pass[p]) || 0); /* 남은 장 수 = 손패 + 💣 폭탄패 */ hc.hidden = !!(ses.cfg.watch || ses.spec) || !k; hc.textContent = k; }
    $('deckN').textContent = s.deck.length ? `더미 ${s.deck.length}` : '';
    const me = meSeat(ses);
    let sub = '';
    if (s.phase === 'end') sub = '판 끝';
    else if (s.phase === 'buy') sub = s.turn === me && !ses.hide ? '광을 살까요?' : `광 팔기 · ${seatAt(ses, s.turn).name}`;
    else if (ses.actor != null) sub = ses.actor === me && !ses.hot ? '내 차례' : `${seatAt(ses, ses.actor).name} 차례`;   // 움직이는 동안은 지금 두는 사람
    else if (s.turn === me) sub = s.phase === 'goStop' ? '고? 스톱?' : s.phase === 'kook' ? '국진을 어디에?' : s.phase.startsWith('pick') ? '가져올 패를 골라요' : '내 차례 · 패를 골라요';
    else sub = s.phase === 'goStop' ? `🤔 ${seatAt(ses, s.turn).name} 님이 고? 스톱? 고르는 중` : s.phase === 'kook' ? `🍶 ${seatAt(ses, s.turn).name} 님이 국진 고르는 중` : s.phase.startsWith('pick') ? `${seatAt(ses, s.turn).name} 님이 가져올 패 고르는 중` : s.phase === 'buy' ? `💰 ${seatAt(ses, s.turn).name} 님이 광 살지 고르는 중` : `${seatAt(ses, s.turn).name} 차례`;
    if (s.carry && G.carryMult(s) > 1) sub += ` · 나가리 ×${G.carryMult(s)}`;
    $('sub').textContent = `${s.round}판 · ${sub}${ses.turnLeft != null && s.turn === me ? ` · ⏱${ses.turnLeft}` : ''}`;
    $('passBtn').hidden = true;                                // 💣 폭탄패는 손패 줄에 카드로 (단추는 키보드 P 용으로만 남김)
    const myTurn = me >= 0 && s.phase !== 'end' && s.turn === me && !!ses.pending && !ses.pending.isResult && !ses.hide && !ses.replaying;
    $('sub').classList.toggle('myturn', myTurn);
    $('stage').classList.toggle('myturn', myTurn);
    // 점수판 한 줄: 방 자리마다 전적 · 칩, 지금 차례인 사람은 금색 (쉬는 사람은 흐리게)
    const turnSeat = s.phase === 'end' ? -1 : ses.who[ses.actor != null ? ses.actor : s.turn];
    $('scoreBar').hidden = false;
    $('scoreBar').innerHTML = ses.seats.map((x, rs) => {
      const nmx = (rs === ses.cfg.me && !ses.cfg.watch && !ses.hot ? '나' : x.name) + (x.sub ? '🤖' : ''), mi = ses.cfg.watch ? -1 : ses.cfg.me;   // 🤖 = 나간 사람 자리를 AI 가 대신 침
      if (relOn(ses, rs)) {                                    // 은행 방: 이번 게임 손익 · 나랑 상대 전적 (구경이면 통산 승패)
        const vs = mi >= 0 && mi !== rs && relOn(ses, mi) ? ` · 나랑 ${ses.rel.pw[mi][rs]}승${ses.rel.pw[rs][mi]}패` : mi < 0 ? ` · ${ses.rel.w[rs]}승${ses.rel.l[rs]}패` : '';
        return `<span class="sbi${rs === turnSeat ? ' on' : ''}${ses.who.indexOf(rs) < 0 ? ' rest' : ''}"><b>${esc(nmx)}</b> ${sgnN(gainWon(ses, rs))}원${vs}</span>`;
      }
      const W = (ses.score && ses.score.w[rs]) || 0, L = (ses.score && ses.score.l[rs]) || 0, ch = ses.chips && ses.chips[rs], money = ch == null ? '' : ses.chipWon ? fmtN(Math.round(ch * ses.chipWon)) + '원' : '🪙' + fmtN(ch);
      const nm = (rs === ses.cfg.me && !ses.cfg.watch && !ses.hot ? '나' : x.name) + (x.sub ? '🤖' : '');
      return `<span class="sbi${rs === turnSeat ? ' on' : ''}${ses.who.indexOf(rs) < 0 ? ' rest' : ''}"><b>${esc(nm)}</b> ${W}승${L}패${money ? ' ' + money : ''}</span>`;
    }).join('') + (() => {
      const pl = ses.cfg.online && ses.net && ses.net.players; if (!pl) return '';
      const n = Object.keys(pl).filter(u => !ses.seats.some(x => x.uid === u)).length;
      return n ? `<span class="sbi">👀 구경 ${n}</span>` : '';
    })();
    if (myTurn && ses.turnBell !== ses.seq) { ses.turnBell = ses.seq; if (ses.cfg.online || ses.hot) { sfx('pop'); C.vibrate(40); } }
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
  // 💣 폭탄패 (10-31 베니 님): 폭탄 뒤 받는 '뒤집기만' 차례를 손패 줄 끝에 카드로 — 누르면 더미만 뒤집음
  let toks = [];
  function drawTokens(T) {
    const layer = $('layer'); if (!layer) return;
    while (toks.length > T.length) toks.pop().remove();
    while (toks.length < T.length) {
      const el = document.createElement('div'); el.className = 'bombtok'; el.innerHTML = '<b>💣</b><span>폭탄패</span>';
      el.onclick = () => { const ses = SES; if (!ses || !ses.pending || ses.pending.isResult) return; if (G.legal(ses.S).indexOf(G.A_PASS) >= 0) { sfx('tap'); finishHuman(ses, G.A_PASS); } };
      layer.appendChild(el); toks.push(el);
    }
    T.forEach((t, i) => { const el = toks[i]; el.style.transform = TF(t); el.style.zIndex = t.z; el.classList.toggle('can', !!t.can); });
  }
  function buildCards(ses) {
    const layer = $('layer');
    layer.innerHTML = ''; toks = [];
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
  // 국진: 정해졌으면 그대로, '자동'이면 지금 점수 셀 때 쓰는 쪽(쌍피가 나으면 피 줄)에 놓음 → 숫자(끗 n · 피 n)와 놓인 자리가 같게
  const capGroup = (s, c, ka) => (c === G.KOOK ? ((s.kook || ka) === 'P' ? 3 : 1) : G.isBonus(c) ? 3 : [0, 1, 2, 3][G.KIND[c]]);
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
      const c = geo.slots[si] || geo.slots[geo.slots.length - 1], k = sl.ids.length;
      sl.ids.forEach((id, j) => {
        const off = j - (k - 1) / 2;
        out[id] = { x: c.x + off * geo.tw * 0.32, y: c.y + off * geo.tw * 0.1, s: geo.tw / 100, r: k > 1 ? off * 4 : 0, z: 60 + j, up: true };
      });
    });
    // 손패
    for (let p = 0; p < s.n; p++) {
      const h = VM.hand[p];
      if (seatPos(ses, p) === 'bottom') {
        const nt = (s.pass && s.pass[p]) || 0, H = geo.hand, cw = H.cw, n = h.length + nt;   // 💣 폭탄패도 손패 줄에 자리
        const myTurn = !!ses.pending && !ses.pending.isResult && s.phase === 'play' && s.turn === me;
        const tm = new Set(); VM.slots.forEach(sl => { if (sl) tm.add(sl.m); });
        const step = n > 1 ? Math.min(cw * 1.05, (H.w - cw - 8) / (n - 1)) : 0;
        const x0 = H.x + H.w / 2 - (step * (n - 1)) / 2;
        h.forEach((id, i) => {
          const lift = id === ses.sel ? H.lift : (myTurn && tm.has(G.monthOf(id)) ? H.lift * 0.32 : 0) + (id === ses.hover ? H.lift * 0.3 : 0);
          out[id] = { x: x0 + i * step, y: H.y + H.h - cw * 0.8 - 2 - lift, s: cw / 100, r: 0, z: id === ses.sel ? 330 : 200 + i, up: !!(watch || (me === p && !ses.hide)) };
        });
        const can = myTurn && me === p && !ses.hide;
        drawTokens(Array.from({ length: nt }, (_, j) => ({ x: x0 + (h.length + j) * step, y: H.y + H.h - cw * 0.8 - 2 - (can ? H.lift * 0.32 : 0), s: cw / 100, r: 0, z: 200 + h.length + j, can })));
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
      const ka = !s.kook && VM.cap[p].indexOf(G.KOOK) >= 0 ? G.tally({ cap: VM.cap, kook: s.kook }, p).kookAs : '';
      for (const id of VM.cap[p]) groups[capGroup(s, id, ka)].push(id);
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
      lastWH = wh; layout(SES); refitSlots(); syncAll(SES, 0);
    }, 50);
  }
  // 판 도중 화면 방향·크기가 바뀌면 바닥 칸 수가 달라짐 → 놓인 패 묶음을 새 칸에 차례대로 다시 앉힘 (예전엔 없는 칸을 읽다 멈춤)
  function refitSlots() {
    if (!VM || !GEO || !GEO.slots || VM.slots.length === GEO.slots.length) return;
    const groups = VM.slots.filter(Boolean), ns = new Array(GEO.slots.length).fill(null), order = GEO.slotOrder || ns.map((_, i) => i);
    groups.forEach((g, i) => { const si = order[Math.min(i, order.length - 1)]; if (ns[si]) ns[si].ids.push(...g.ids); else ns[si] = g; });
    VM.slots = ns;
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
    ses.turnLog = []; ses.coachCache = null; ses.coachHtml = null; ses.hotLast = -1; ses.resCounted = false;
    // 🎞️ 복기용 기록: 처음 상태 + 수 차례 (같은 규칙 엔진으로 그대로 다시 둠)
    ses.rec = ses.isDrill ? null : { at: Date.now(), start: G.fastClone(s), acts: [], seats: ses.seats.map((x, i) => Object.assign({ name: i === ses.cfg.me && !ses.cfg.watch && !ses.hot ? '나' : x.name, em: x.em }, x.ctrl === 'me' && !ses.cfg.watch ? { h: 1 } : {})) };   // h = 이 기기 사람 자리 (📒 아쉬운 장면은 이 자리만)
    ses.who = s.who.slice(); ses.bench = s.bench.slice();
    ses.spec = !ses.cfg.watch && ses.who.indexOf(ses.cfg.me) < 0;       // 쉬는 중이면 구경
    if (ses.hot) ses.hide = true;
    if ($('coachBar')) $('coachBar').hidden = true;
    $('resBox').hidden = true; $('goBox').hidden = true;
    buildHud(ses);
    buildCards(ses);
    layout(ses);
    lastWH = $('stage').clientWidth + 'x' + $('stage').clientHeight;
    if (ses.isDrill || ses.resume) {
      vmFromState(s);
      await syncAll(ses, 0);
      if (ses.resume) { ses.resume = false; C.toast('방장 화면과 맞췄어요. 이어서 해요', 1800); }
      else { C.toast(ses.drillMsg || '🧑‍🏫 결정적 장면으로 돌아왔어요! 추천 수를 내 보세요', 2400); ses.drillMsg = null; }
    } else {
      // 처음엔 모두 더미에
      VM = { hand: s.hands.map(() => []), deck: G.gameCards(s.bonus).slice(), cap: s.hands.map(() => []), slots: new Array(GEO.slots.length).fill(null), fly: {} };
      await syncAll(ses, 0);
      if (s.seonDraw) { await showSeon(ses, s.seonDraw); ses.check(); }
      await shuffleAnim(ses); ses.check();
      await dealAnim(ses);
      if (s.round === 1 || Math.random() < 0.3) aiSay(ses, firstAi(ses), 'start', true);
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
        const mdPre = ses.mdrill && ses.mdrill.pending ? ses.S : null;   // 📒 노트에서 온 연습: 그 장면에서 고른 수를 채점
        a = await humanTurn(ses);
        if (mdPre) mDrillCheck(ses, mdPre, p, a, coachSnap);
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
        ses.subThinking = !!ses.cfg.online;
        try { a = await aiTurn(ses, p); } finally { ses.subThinking = false; }
        if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
      }
      ses.seq++;
      ses.check();
      const { state, events } = G.step(ses.S, a);
      ses.S = state;
      if (ses.rec) ses.rec.acts.push(a);
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
    if (ses.rec) { saveReplay(ses.rec, ses.S); if (ses.kind === 'solo' || ses.kind === 'hot') scanMistakes(ses.rec); }
  }

  // ── 📒 아쉬운 장면 (common/mistakes.js): 내 수가 선생님 추천보다 뚜렷이 손해였던 장면을 모음 → 그 장면부터 다시 ──
  //   · 판이 끝나면 쉬는 틈에(조금씩) 사람 자리 수만 그 사람 눈(view)으로 다시 봄 → 손해 큰 것 2개까지 (판정 기준은 AI.review)
  //   · 복기 선생님이 본 장면도 같은 기준으로 넣음 (같은 판·같은 장면은 하나로)
  const MST_PER_ROUND = 2;
  const isHumanSeat = (rec, i) => { const x = rec && rec.seats[i]; return !!x && (!!x.h || x.name === '나'); };
  const idleRun = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 60));
  const recLite = (rec, k) => ({ at: rec.at, start: rec.start, acts: rec.acts.slice(0, k), seats: rec.seats, title: rec.title, mode: rec.mode });
  function addMistake(rec, k, seat, r) {
    if (!window.Mistakes || !r || !r.miss) return;
    try {
      Mistakes.add({ game: 'gostop', title: `고스톱 · ${rec.title || '판'}`, scene: `${k + 1}수째 · ${(rec.seats[seat] || {}).name || '나'}`,
        my: r.my, best: r.best, why: r.why, sev: r.sev, lossText: r.lossText, drill: { rec: recLite(rec, k), k, seat } });
    } catch (e) {}
  }
  function scanMistakes(rec) {
    if (!window.Mistakes || !AI.review || !rec || !rec.acts.length || !rec.seats.some((x, i) => isHumanSeat(rec, i))) return;
    let st = G.fastClone(rec.start), k = 0;
    const found = [];
    const run = () => {
      try {
        const t0 = performance.now();
        while (k < rec.acts.length && st.phase !== 'end' && performance.now() - t0 < 10) {
          const p = st.turn, seat = st.who[p], a = rec.acts[k];
          if ((st.phase === 'play' || st.phase === 'goStop') && isHumanSeat(rec, seat)) { const r = AI.review(G.view(st, p), a); if (r && r.miss) found.push({ k, seat, r }); }
          st = G.step(st, a).state; k++;
        }
      } catch (e) { return; }
      if (k < rec.acts.length && st.phase !== 'end') { idleRun(run); return; }
      found.sort((x, y) => y.r.sev - x.r.sev).slice(0, MST_PER_ROUND).forEach(f => addMistake(rec, f.k, f.seat, f.r));
    };
    idleRun(run);
  }
  // 노트에서 온 연습(?drill): 첫 장면은 추천을 감추고(💡 로 봄), 고른 수가 추천 쪽(👑·🟢)이면 ✅
  const mHide = ses => !!(ses && ses.mdrill && ses.mdrill.pending && ses.mdrill.hide);
  const MHIDE_HTML = '📒 아쉬웠던 그 장면이에요 — 이번엔 직접 골라 보세요 · <button type="button" class="mst-reveal" data-mreveal style="border:0;border-radius:8px;padding:3px 9px;margin:2px 0;background:#fde68a;color:#3a2e0b;font-family:inherit;font-weight:700;font-size:12.5px;line-height:1.3;cursor:pointer">💡 답 보기</button>';
  function mDrillCheck(ses, st, p, a, c) {
    const m = ses.mdrill; if (!m) return;
    m.pending = false; m.hide = false;
    let r = null;
    try { r = AI.review(G.view(st, p), a, st.phase === 'play' && c ? { c } : {}); } catch (e) { r = null; }
    if (!r) return;
    if (r.tier === 'best' || r.tier === 'good') { if (window.Mistakes) Mistakes.solved(m.id); C.toast('✅ 이번엔 잘 골랐어요!', 2400); }
    else C.toast(`🤔 아쉬워요 — 추천은 ${r.best}`, 2600);
  }
  function drawMistakeBtn() {
    const b = $('mistakeBtn'); if (!b) return;
    const n = window.Mistakes ? Mistakes.count('gostop') : 0;
    b.hidden = !n; b.textContent = `📒 아쉬운 장면 ${n}`;
  }

  // ── 🎞️ 복기 (다시 보기): 이 기기에 지난 판 10개까지 ─────────────
  const RKEY = KEY + 'replays';
  function saveReplay(rec, end) {
    const r = end && end.result;
    const wname = r && r.winner >= 0 ? (rec.seats[end.who[r.winner]] || {}).name || '?' : '';
    rec.title = !r ? '' : r.kind === 'nagari' ? '나가리' : `${wname === '나' ? '내가' : iga(wname)} ${fmtN(r.points)}점 났어요`;
    rec.mode = G.modeOf(end.N).name;
    try { const list = C.store(RKEY, []).filter(x => x && x.at !== rec.at); list.unshift(rec); C.save(RKEY, list.slice(0, 10)); } catch (e) {}
    drawReplayBtn();
  }
  function drawReplayBtn() { const b = $('replayBtn'); if (b) b.hidden = !C.store(RKEY, []).length; }
  const fmtAt = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function openReplayList() {
    const list = C.store(RKEY, []);
    if (!list.length) return C.toast('아직 저장된 판이 없어요');
    const close = C.modal({
      title: '🎞️ 지난 판 다시 보기',
      html: `<p class="small" style="margin:0 0 8px">이 기기에서 친 판 ${list.length}개 (최근 10개까지). 다시 보기에서는 모두의 패가 보여요.</p><div class="rplist">${list.map((x, i) => `<button class="btn" data-i="${i}"><b>${esc(x.title || '판')}</b><span class="small">${fmtAt(x.at)} · ${esc(x.mode || '')} · ${x.seats.slice(0, 5).map(q => esc(q.name)).join(', ')}</span></button>`).join('')}</div>`,
      buttons: [{ label: '닫기' }], dismiss: true,
    });
    document.querySelectorAll('.rplist [data-i]').forEach(b => b.onclick = () => { sfx('tap'); close(); startReplay(list[+b.dataset.i]); });
  }
  function startReplay(rec) {
    if (SES) SES.dispose();
    const ses = SES = newSession({ watch: true, replay: true, N: rec.start.N, rules: rec.start.rules, bonus: rec.start.bonus, me: -1 });
    show('play'); drawDock();
    runReplay(ses, rec, false).then(() => { if (SES === ses) goHome(); }, e => { if (!(e instanceof Cancel)) { console.error(e); if (SES === ses) goHome(); } });
  }
  // 🎮 복기 → '여기서부터 내가 치기': k 수째 장면(같은 패·같은 더미)에서 seat 자리를 내가, 나머지는 AI 가 이어서. 선생님은 켜고 시작 (단추로 끔)
  function startBranch(rec, k, seat, mid) {
    let st = G.fastClone(rec.start);
    for (let j = 0; j < k; j++) st = G.step(st, rec.acts[j]).state;
    if (st.phase === 'end') return C.toast('이미 끝난 장면이에요. 앞으로 돌아가서 눌러 주세요');
    if (SES) SES.dispose();
    const cfg = { watch: false, N: rec.start.N, rules: rec.start.rules, bonus: rec.start.bonus, seed: 0, me: seat, branch: true };
    const ses = SES = newSession(cfg);
    const tier = TIER[opt.tier] ? opt.tier : 'normal';
    ses.seats = rec.seats.map((x, i) => (i === seat ? { ctrl: 'me', tier: null, name: '나', em: '나' } : { ctrl: 'ai', tier, name: x.name === '나' ? '그때의 나' : x.name, em: x.em === '나' ? '🙂' : x.em }));
    ses.startState = st; ses.isDrill = true;
    ses.drillMsg = mid ? '📒 아쉬웠던 장면부터 다시 — 이번엔 추천 수를 찾아보세요' : `🎮 ${k}수째 장면부터 내가 쳐요 — 🧑‍🏫 선생님을 켜고 끄며 해 보세요`;
    if (mid) ses.mdrill = { id: mid, pending: true, hide: true };
    ses.coachOn = true;
    show('play');
    setupCoach(ses);
    if (mid && ses.panel && ses.panel.collapsed) {                   // 📒 노트 연습: 선생님 창을 펴서 시작 (💡 답 보기가 보이게 · 사용자가 저장해 둔 접힘은 그대로 둠)
      let keep = null; try { keep = localStorage.getItem(ses.panel.key); } catch (e) {}
      ses.panel.collapse(false);
      try { if (keep == null) localStorage.removeItem(ses.panel.key); else localStorage.setItem(ses.panel.key, keep); } catch (e) {}
    }
    drawDock();
    runMatch(ses);
  }
  // 다시 두기: 처음 ⏮ · 한 수 ◀ ▶ · 재생/멈춤. inline = 결과 창에서 (끝나면 결과로 돌아감)
  //   위 줄: 🧑‍🏫 선생님(이 장면 추천 vs 실제로 낸 패) · 🎮 여기서부터 내가 치기
  async function runReplay(ses, rec, inline) {
    const keep = { watch: ses.cfg.watch, S: ses.S, seats: ses.seats, hide: ses.hide, spec: ses.spec, who: ses.who, bench: ses.bench };
    const acts = rec.acts || [];
    const setS = st => { ses.S = st; ses.who = st.who.slice(); ses.bench = st.bench.slice(); ses.spec = true; };
    const at = k => { let st = G.fastClone(rec.start); for (let j = 0; j < k; j++) st = G.step(st, acts[j]).state; return st; };
    ses.cfg.watch = true; ses.hide = false; ses.replaying = true;
    ses.seats = rec.seats.map(x => ({ ctrl: 'remote', tier: null, name: x.name, em: x.em }));
    setS(G.fastClone(rec.start));
    $('resBox').hidden = true; $('goBox').hidden = true; $('pop').hidden = true;
    buildHud(ses); buildCards(ses); layout(ses); $('lbl').textContent = '🎞️ 다시 보기'; drawDock();
    vmFromState(ses.S); await syncAll(ses, 0);
    let i = 0;
    const rp = { cmd: null, play: true };
    const bar = document.createElement('div'); bar.className = 'rpbar'; bar.id = 'rpBar';
    bar.innerHTML = `<button data-rp="start" aria-label="처음으로">⏮</button><button data-rp="prev" aria-label="한 수 뒤로">◀</button><button data-rp="play" class="pp" aria-label="재생 · 멈춤"></button><button data-rp="next" aria-label="한 수 앞으로">▶</button><span class="rpn"></span><button data-rp="exit" class="rpx">${inline ? '결과로' : '닫기'}</button>`;
    $('play').appendChild(bar);
    const draw = () => { bar.querySelector('.pp').textContent = rp.play ? '⏸' : '⏵'; bar.querySelector('.rpn').textContent = `${i} / ${acts.length}수`; rpCoach(); };
    // 🧑‍🏫 복기 선생님: 패를 내는 장면마다 그 차례 사람 눈으로 본 추천 vs 실제로 낸 패
    const canBranch = !ses.cfg.online;                       // 친구 방 결과 창에서는 방을 떠나게 되니 안 보임 (지난 판 목록에서는 됨)
    const rg = document.createElement('div'); rg.className = 'rpgo';
    rg.innerHTML = `<button data-rg="coach" aria-pressed="false">🧑‍🏫 선생님</button>${canBranch ? '<button data-rg="branch" class="br">🎮 여기서부터 내가 치기</button>' : ''}`;
    $('play').appendChild(rg);
    { const hb = $('play').querySelector('.bar'); if (hb) { rg.style.top = Math.round(hb.getBoundingClientRect().bottom + 6) + 'px'; rg.style.bottom = 'auto'; } }   // 위쪽(승패 줄 자리)에 — 아래는 내 패가 가려져서
    let rpPanel = null, rpOn = false;
    const cardOfAct = (st, p, a) => (a < G.A_SHAKE ? a - G.A_PLAY : a < G.A_BOMB ? a - G.A_SHAKE : a < G.A_PASS ? (st.hands[p].find(x => G.monthOf(x) === a - G.A_BOMB) ?? -1) : -1);
    const noted = new Set();
    function rpCoach() {
      if (!rpOn || !rpPanel) return;
      const st = ses.S, p = st.turn, a = acts[i];
      let html = '<span class="small">패를 내는 장면 · 고/스톱에서 선생님 추천을 보여 드려요 (▶ 로 한 수씩)</span>';
      const who = esc((rec.seats[(st.who || [])[p]] || {}).name || '?');
      const c = st.phase === 'play' && i < acts.length && AI.coachHand ? AI.coachHand(G.view(st, p)) : null;
      const seat = (st.who || [])[p];
      if (i < acts.length && !noted.has(i) && AI.review && isHumanSeat(rec, seat) && (c || st.phase === 'goStop')) {   // 📒 사람 자리의 뚜렷한 손해는 노트에도 (같은 기준)
        noted.add(i);
        try { addMistake(rec, i, seat, AI.review(G.view(st, p), a, c ? { c } : {})); } catch (e) {}
      }
      if (c && c.bestCard >= 0) {
        const ch = cardOfAct(st, p, a), info = ch >= 0 ? c.byCard[ch] : null;
        const mark = info ? (info.tier === 'best' ? '👑 최선' : (info.tier === 'good' ? '🟢 ' : info.tier === 'ok' ? '🟡 ' : '🔴 ') + esc(info.deltaText || '')) : '';
        html = `<b>${who}</b> 차례 · <span class="cb-tag">👑 추천</span> <b>[${esc(c.bestName)}]</b> — ${esc(c.bestWhy)}`;
        // 🤔 실제로 낸 패의 속뜻 (선생님이 보기에 이 패로 노린 것) — 손해가 크면 노림수보다 실수일 수 있다고
        if (a === G.A_PASS) html += '<br>실제로 한 것: <b>폭탄패로 더미만 뒤집기</b> <span class="small">— 손패를 아끼고 뒤집은 패에 맡긴 수예요</span>';
        else if (info && info.card === c.bestCard) html += `<br>실제로도 같은 패 ${mark}`;
        else if (info) html += `<br>실제로 낸 패: <b>[${esc(info.name)}]</b> ${mark}<br><span class="small">🤔 노린 것: ${esc(info.tag || '')} — ${esc(info.why || '')}`
          + (info.tier === 'bad' ? ' · 추천보다 손해가 커서 노림수보다는 실수였을 수 있어요' : '') + '</span>';
      } else if (st.phase === 'goStop' && i < acts.length && AI.coachGoStop) {
        const g = AI.coachGoStop(G.view(st, p)), did = a === G.A_GO ? '고' : '스톱', rc = g.rec === G.A_GO ? '고' : '스톱';
        html = `<b>${who}</b> 고/스톱 · <span class="cb-tag">👑 추천</span> <b>${rc}</b> — ${esc(g.why)}<br>실제로 한 것: <b>${did}</b> ${did === rc ? '👑 같음' : '🟡 다름'}`
          + (did !== rc ? `<br><span class="small">🤔 ${did === '고' ? `더 큰 점수를 노린 승부수예요 (고 했을 때 이길 확률 ${g.winRateGo}% · 고박 위험 ${g.gobakRisk}%)` : `점수를 챙기고 위험(고박 ${g.gobakRisk}%)을 피한 선택이에요`}</span>` : '');
      }
      rpPanel.set(html);
      if (!rpPanel.visible) rpPanel.show();
    }
    const pickSeat = () => new Promise(res => {
      const mine = rec.seats.findIndex(x => x.name === '나');
      if (mine >= 0) return res(mine);
      C.modal({ title: '🎮 어느 자리를 칠까요?', html: '<p class="small" style="margin:0">고른 자리는 내가, 나머지는 AI 가 이어서 쳐요.</p>', dismiss: true,
        buttons: rec.seats.map((x, k) => ({ label: `${x.em || ''} ${x.name}`, primary: k === 0, onClick: () => res(k) })), onClose: () => res(-1) });
    });
    rg.onclick = async e => {
      const b = e.target.closest('[data-rg]'); if (!b) return;
      sfx('tap');
      if (b.dataset.rg === 'coach') {
        rpOn = !rpOn; b.setAttribute('aria-pressed', String(rpOn)); b.classList.toggle('on', rpOn);
        if (rpOn && !rpPanel && window.CoachPanel) {
          // 복기 창은 따로 기억 — 처음엔 위 단추 줄 바로 아래 (단추·내 패를 안 가림)
          try { if (!localStorage.getItem('game.coach.gostop-rp')) { const pw = Math.min(320, innerWidth * 0.86), t = Math.round(rg.getBoundingClientRect().bottom + 6); localStorage.setItem('game.coach.gostop-rp', JSON.stringify({ c: [Math.max(4, innerWidth - 56), t], p: [Math.max(4, Math.round((innerWidth - pw) / 2)), t], z: 0 })); } } catch (err) {}
          try { rpPanel = CoachPanel.create({ game: 'gostop-rp', title: 'AI 선생님 · 복기', startHidden: true }); } catch (err) { rpPanel = null; }
        }
        if (rpOn) { rpCoach(); if (rpPanel && rpPanel.collapsed) rpPanel.collapse(false); } else if (rpPanel) rpPanel.hide();
        return;
      }
      if (ses.S.phase === 'end' || i >= acts.length) return C.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요');
      rp.play = false; draw();
      const seat = await pickSeat();
      if (seat < 0) return;
      rp.branch = { k: i, seat }; rp.cmd = 'exit'; ses.wake();
    };
    bar.onclick = e => {
      const b = e.target.closest('[data-rp]'); if (!b) return;
      sfx('tap');
      const k = b.dataset.rp;
      if (k === 'play') { rp.play = !rp.play; if (rp.play && i >= acts.length) rp.cmd = 'start'; }
      else { rp.cmd = k; rp.play = false; }
      draw(); ses.wake();
    };
    draw();
    try {
      for (;;) {
        ses.check();
        let cmd = rp.cmd; rp.cmd = null;
        if (!cmd && rp.play && i < acts.length) cmd = 'next';
        if (!cmd) { await new Promise(res => ses.waiters.push(res)); continue; }
        if (cmd === 'exit') break;
        if (cmd === 'next') {
          if (i >= acts.length) continue;
          const p = ses.S.turn, { state, events } = G.step(ses.S, acts[i]);
          ses.S = state; i++; draw();
          ses.actor = p;
          try { await playEvents(ses, events); } finally { ses.actor = null; }
          ses.check();
          vmFromState(ses.S); await syncAll(ses, D(220));
          if (i >= acts.length) { rp.play = false; draw(); C.toast(rec.title ? '끝 — ' + rec.title : '끝까지 봤어요', 2200); }
          else if (rp.play) await ses.wait(D(260));
        } else {
          const k = cmd === 'start' ? 0 : Math.max(0, i - 1);
          setS(at(k)); i = k; draw(); $('pop').hidden = true;
          vmFromState(ses.S); await syncAll(ses, D(160));
        }
      }
    } finally {
      bar.remove(); rg.remove(); ses.replaying = false;
      if (rpPanel) { try { rpPanel.destroy(); } catch (e) {} }
    }
    if (rp.branch) { startBranch(rec, rp.branch.k, rp.branch.seat); return; }
    if (inline && ses.alive) {                                // 결과 창으로 돌아감 (판 상태 그대로)
      ses.cfg.watch = keep.watch; ses.seats = keep.seats; ses.hide = keep.hide;
      ses.S = keep.S; ses.who = keep.who; ses.bench = keep.bench; ses.spec = keep.spec;
      buildHud(ses); buildCards(ses); layout(ses); drawDock();
      vmFromState(ses.S); await syncAll(ses, 0);
    }
  }

  // 친구 수 기다리기: 지금 차례 번호(seq)의 수가 오면 (먼저 와 있으면 바로)
  function remoteTurn(ses, p) {
    for (const k of ses.acts.keys()) if (k < ses.seq) ses.acts.delete(k);
    const ph = ses.S && ses.S.phase, who = seatAt(ses, p).name;   // 친구가 고르는 중이면 크게 알림 (기다리는 사람이 뭘 기다리는지 알게)
    if (!ses.acts.has(ses.seq)) { if (ph === 'goStop') popup('🤔 고? 스톱?', 'gold', `${who} 님이 고르는 중이에요`); else if (ph === 'kook') C.toast(`🍶 ${who} 님이 국진(열끗/쌍피) 고르는 중`, 1800); }
    if (ses.acts.has(ses.seq)) return Promise.resolve(ses.acts.get(ses.seq));
    setThinking(ses, p, true);
    return new Promise((resolve, reject) => {
      ses.actWaiters.push({
        seq: ses.seq,
        resolve: a => { setThinking(ses, p, false); resolve(a); },
        reject: e => { setThinking(ses, p, false); reject(e); },
      });
    });
  }
  function wakeActs(ses) {
    ses.actWaiters = ses.actWaiters.filter(w => { if (!ses.acts.has(w.seq)) return true; w.resolve(ses.acts.get(w.seq)); return false; });
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
      sayFor(ses, e);
      switch (e.t) {
        case 'shake': {
          sfx('shake');
          for (const c of e.cards) { const el = els[c]; if (el) el.classList.remove('down'); bounce(c); }
          await popup('흔들기!', 'gold', `${nameOf(ses, e.p)} · ${e.m + 1}월 세 장${ses.S.rules.shakeX > 1 ? ` · 이기면 ×${ses.S.rules.shakeX}` : ''}`);
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
          await popup('폭탄!', '', `${e.m + 1}월 네 장${e.steal ? ` · 피 ${e.steal}장씩` : ''}`);
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
        case 'ppeok': sfx('ppeok'); C.vibrate([20, 40, 20]); await popup(e.tag ? e.tag + '!' : '뻑!', 'sad', e.pay ? `${nameOf(ses, e.p)} 위로금 · 다른 사람마다 ${e.pay}점씩 받아요` : e.count >= 2 ? `${nameOf(ses, e.p)} 뻑 ${e.count}번째` : '세 장이 바닥에 남아요'); break;
        case 'jjok': sfx('good'); await popup('쪽!', 'mint', e.steal ? `피 ${e.steal}장씩 받아요` : ''); break;
        case 'ttadak': sfx('good'); await popup('따닥!', 'mint', e.steal ? `네 장 다 · 피 ${e.steal}장씩` : '네 장 다'); break;
        case 'eat': sfx('good'); await popup(e.own ? '자뻑 먹기!' : e.by < 0 ? '깔린 세 장 먹기!' : '뻑 먹기!', 'mint', e.steal ? `피 ${e.steal}장씩 받아요` : '세 장 한꺼번에'); break;
        case 'sweep': sfx('win'); await popup('싹쓸이!', 'gold', e.steal ? `피 ${e.steal}장씩 받아요` : ''); break;
        case 'ppeokBonus': sfx('coin'); await popup(e.k + ' 보너스!', 'gold', `${e.own ? '모두에게서' : tname(ses, ses.who[e.from[0]]) + '에게서'} ${e.pts}점`); break;
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
          {                                                   // 무엇을 왜: 쌍피면 '2장 몫', 일반 피가 없어 쌍피를 준 거면 그렇게
            const v = e.v || 1, kind = v >= 3 ? '쓰리피' : v === 2 ? '쌍피' : '피', why = e.only ? ` — ${e.need || 1}장 몫인데 일반 피가 없어서` : (e.need || 1) > 1 ? ` (${e.need}장 몫)` : '';
            if (e.to === meSeat(ses)) C.toast(`🃏 ${nameOf(ses, e.from)}에게서 ${kind} 가져왔어요${why}`, 1900);
            else if (e.from === meSeat(ses)) C.toast(`🃏 ${nameOf(ses, e.to)}에게 ${kind} 줬어요${why}`, 1900);
          }
          break;
        }
        case 'combo': sfx('good'); await popup(e.name + '!', 'gold', nameOf(ses, e.p)); break;
        case 'kook': drawHud(ses); C.toast(`${nameOf(ses, e.p)}: 국진을 ${e.as === 'P' ? '쌍피로' : '열끗으로'} 써요`, 1300); await syncAll(ses, D(260)); break;
        case 'go': sfx('go'); if (e.p !== meSeat(ses)) sfx('mew'); await popup(e.count + '고!', '', `${nameOf(ses, e.p)} ${e.base}점에서 한 번 더`); drawHud(ses); break;
        case 'stop': sfx('count'); await popup(e.auto ? '나!' : '스톱!', 'gold', `${nameOf(ses, e.p)} ${e.base}점`); break;
        case 'nagari': sfx('lose'); await popup('나가리', 'sad', ses.S.rules.nagariX > 1 && ses.S.rules.nagariMax > 0 ? `다음 판은 ×${ses.S.rules.nagariX}` : '다음 판으로'); break;
        case 'pass': sfx('flip'); await popup('뒤집기만', 'mint', `남은 ${e.left}번`); break;
        case 'buy': {
          sfx('coin');
          for (const c of e.cards) {
            const el = els[c]; if (el) { el.classList.remove('gone'); el._t = { x: GEO.deck.x, y: GEO.deck.y, s: GEO.tw / 100, r: 0, z: 460, up: true }; }
            VM.cap[e.p].push(c);
          }
          const T = targets(ses);
          await Promise.all(e.cards.map((c, i) => moveTo(c, T[c], { dur: D(420), delay: i * D(60), arc: 30, z: 470 + i })));
          await popup('광을 샀어요!', 'gold', `${nameOf(ses, e.p)} → ${tname(ses, e.seat)} · ${e.price}점`);
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
  // ⏱ 친구랑: 내 차례 30초가 지나면 중급 AI 가 대신 둠 (10초 남으면 알림)
  //   10-31: 남은 초를 크게(화면 위 시계 · 채팅 창 맨 위) · 채팅 창을 열고 있으면 한 번 20초 더
  const TURN_SEC = 30, CHAT_EXTRA = 20;
  let clockEl = null;
  function turnClock(left) {
    const on = left != null;
    if (on && !clockEl) { clockEl = document.createElement('div'); clockEl.className = 'turnclock'; document.body.appendChild(clockEl); }
    if (clockEl) { clockEl.hidden = !on; if (on) { clockEl.textContent = `⏱ 내 차례 ${left}초`; clockEl.classList.toggle('hot', left <= 10); } }
    if (window.ArenaUI && ArenaUI.chatTip) ArenaUI.chatTip(on ? `⏱ 내 차례 · ${left}초 남았어요${left <= 10 ? ' — 안 내면 AI 가 대신 내요' : ''}` : '', on && left <= 10);
  }
  function turnTimer(ses) {
    clearInterval(ses.turnT); ses.turnLeft = null; turnClock(null);
    if (!ses.cfg.online || ses.replaying) return;
    let end = Date.now() + TURN_SEC * 1000, extended = false;
    ses.turnLeft = TURN_SEC; turnClock(TURN_SEC);
    ses.turnT = setInterval(() => {
      if (!ses.alive || !ses.pending || ses.pending.isResult) { clearInterval(ses.turnT); ses.turnLeft = null; turnClock(null); return; }
      let left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left <= 0 && !extended && window.ArenaUI && ArenaUI.chatOpen) {   // 채팅 치는 중이면 한 번 더 기다려 줌
        extended = true; end = Date.now() + CHAT_EXTRA * 1000; left = CHAT_EXTRA;
        C.toast(`💬 채팅 중이라 ${CHAT_EXTRA}초 더 드려요`, 1800); C.vibrate(30);
      }
      if (left !== ses.turnLeft) { ses.turnLeft = left; turnClock(left); if (left === 10) { C.toast('⏱ 10초 남았어요', 1500); C.vibrate(30); } drawHud(ses); }
      if (left <= 0) {
        clearInterval(ses.turnT); ses.turnLeft = null; turnClock(null);
        for (const close of ses.modals.splice(0)) { try { close(); } catch (e) {} }
        $('goBox').hidden = true;
        C.toast('⏱ 시간이 지나서 AI 가 대신 냈어요', 2400);
        try { if (ses.net && ses.net.chat) ses.net.chat('🤖 시간이 지나서 이번 수는 AI 가 대신 냈어요'); } catch (e) {}   // 친구들 화면에도 (말풍선·채팅 기록)
        const a = AI.choose(G.view(ses.S, ses.S.turn), 'normal', { seed: rand32() });
        finishHuman(ses, a);
      }
    }, 250);
  }
  function humanTurn(ses) {
    return new Promise((resolve, reject) => {
      ses.pending = { resolve, reject };
      turnTimer(ses);
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
    clearInterval(ses.turnT); ses.turnLeft = null; turnClock(null);
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
    const showCoach = mine && coachOn(ses) && !mHide(ses);              // 📒 노트 연습 첫 장면은 💡 를 누를 때까지 추천을 감춤
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
    if (on && mHide(ses)) html = MHIDE_HTML;
    else if (on && mine && coach && coach.bestCard >= 0 && GEO) {
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
    await popup('광 팔기!', 'gold', `${tname(ses, o.seat)}: ${o.cards.map(c => G.cardName(c)).join(' · ')} (${o.cards.length * ses.S.rules.salePrice}점)`);
  }
  function askBuy(ses) {
    sfx('pop');
    const s = ses.S, o = s.sale.offers[s.sale.i], n = o.cards.length, p = s.turn, cost = n * s.rules.salePrice;
    const own = s.hands[p].filter(c => c >= 0 && G.KIND[c] === G.GW).length + s.cap[p].filter(c => G.KIND[c] === G.GW).length;
    ask(ses, '💰 광 팔기', `<p style="margin:0">${esc(iga(tname(ses, o.seat)))} 광 ${n}장을 팔아요.<br>사면 내 먹은 패가 되고, 값 <b>${cost}점</b>을 ${esc(tname(ses, o.seat))}에게 줘요 (이기든 지든 똑같이).</p><div class="cardrow" style="margin-top:8px">${o.cards.map(x => ART.use(x)).join('')}</div><p class="small" style="margin:6px 0 0">내가 가진 광 ${own}장</p>`,
      [{ label: `광 사기 (${cost}점)`, primary: true, a: G.A_BUY }, { label: '안 사요', a: G.A_NOBUY }]);
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
      return ask(ses, '💣 폭탄!', `<p style="margin:0">손에 ${m + 1}월이 세 장, 바닥에 한 장이 있어요.<br>세 장을 한꺼번에 내면 네 장을 다 가져오고 ${s.rules.stealBomb ? `<b>피 ${s.rules.stealBomb}장씩</b> 받아요.` : ''} ${s.rules.shakeX > 1 ? `이기면 <b>×${s.rules.shakeX}</b>!` : ''}</p><div class="cardrow" style="margin-top:8px">${s.hands[me].filter(x => G.monthOf(x) === m).concat(tc).map(x => ART.use(x)).join('')}</div>`,
        [{ label: '💣 폭탄', primary: true, a: G.A_BOMB + m }, { label: '한 장만 내기', a: G.A_PLAY + c }]);
    }
    if (L.indexOf(G.A_SHAKE + c) >= 0) {
      return ask(ses, '👋 흔들까요?', `<p style="margin:0">손에 ${m + 1}월이 세 장 있어요. 보여 주고 내면 ${s.rules.shakeX > 1 ? `이겼을 때 점수가 <b>×${s.rules.shakeX}</b>예요.` : '(이 집은 배수가 없어요)'}<br><span class="small">(세 장을 상대도 보게 돼요)</span></p><div class="cardrow" style="margin-top:8px">${s.hands[me].filter(x => G.monthOf(x) === m).map(x => ART.use(x)).join('')}</div>`,
        [{ label: '👋 흔들기', primary: true, a: G.A_SHAKE + c }, { label: '그냥 내기', a: G.A_PLAY + c }]);
    }
    finishHuman(ses, G.A_PLAY + c);
  }
  function ask(ses, title, html, btns) {
    const close = C.modal({ title, html, buttons: btns.map(b => ({ label: b.label, primary: b.primary, onClick: () => { ses.modals = ses.modals.filter(x => x !== close); finishHuman(ses, b.a); } })), dismiss: false, cls: 'peek' });
    ses.modals.push(close);
    peekBtn(document.querySelector('.overlay.peek:last-of-type'));
  }
  // 판·내 패를 보면서 고르게: '👀 판 보기'를 누르는 동안(또는 한 번 누르면) 창을 접음
  function peekBtn(ov) {
    if (!ov || ov.querySelector('.peekbtn')) return;
    const box = ov.firstElementChild, b = document.createElement('button');
    b.type = 'button'; b.className = 'btn peekbtn'; b.textContent = '👀 판 보기';
    b.onclick = () => { const on = !ov.classList.contains('peeking'); ov.classList.toggle('peeking', on); b.textContent = on ? '↩️ 다시 고르기' : '👀 판 보기'; };
    ov.appendChild(b);
  }
  function askPick(ses, o) {
    sfx('pop');
    const s = ses.S;
    const close = C.modal({
      title: '어느 패를 가져올까요?',
      html: `<div class="picks">${o.map((c, k) => `<button data-k="${k}">${ART.use(c)}<span>${esc(G.cardName(c))}</span></button>`).join('')}</div><p class="small" style="margin:6px 0 0">${s.phase === 'pickFlip' ? '뒤집은 패' : '낸 패'}와 같은 달이 바닥에 두 장이에요</p>`,
      buttons: [], dismiss: false, cls: 'peek',
    });
    ses.modals.push(close);
    const ov = document.querySelector('.overlay:last-of-type');
    peekBtn(ov);
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
    $('goBox').classList.remove('peeking'); peekBtn($('goBox')); { const pb = $('goBox').querySelector('.peekbtn'); if (pb) pb.textContent = '👀 판 보기'; }
    sfx('good');
    const opp = Array.from({ length: s.n }, (_, q) => q).filter(q => q !== p).map(q => `${esc(seatAt(ses, q).name)} ${G.tally(s, q).base}점`).join(' · ');
    let rows = '';
    for (const it of pre.items) if (!/고$/.test(it.k)) rows += `<tr><td>${esc(it.k)}</td><td class="n">${it.pts}점</td></tr>`;
    if (s.go[p]) rows += `<tr class="sub"><td>지금까지 ${s.go[p]}고</td><td class="n">${pre.total}점</td></tr>`;
    for (const m of pre.mults) rows += `<tr class="x"><td>${esc(m.k)}</td><td class="n">×${m.x}</td></tr>`;
    const per = pre.per.map(l => `${esc(seatAt(ses, l.p).name)}${l.mults.length ? ' (' + l.mults.map(m => m.k).join('·') + ')' : ''}`).join(', ');
    const nextGo = s.go[p] + 1;
    const goTxt = s.rules.goBonus === 'none' ? '점수는 그대로' : `이 점수면 ${fmtN(G.goTotal(t.base, nextGo, s.rules.goBonus))}점`;
    const gc = (coachOn(ses) && AI.coachGoStop) ? AI.coachGoStop(G.view(s, p)) : null;
    const coachFull = gc ? `
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
    const hideGc = !!gc && mHide(ses);                                   // 📒 노트 연습 첫 장면: 💡 를 누르면 보여 줌
    const coachHtml = hideGc ? `<div class="go-coach" id="goCoach"><div style="font-size:12.5px">${MHIDE_HTML}</div></div>` : coachFull;
    $('goTitle').textContent = `${t.base}점! 고? 스톱?`;
    $('goBody').innerHTML = `<table class="brk">${rows}<tr class="sum"><td>지금 스톱하면</td><td class="n">+${pre.points}점</td></tr></table>
      <p class="gonote">${per ? '진 사람: ' + per + '<br>' : ''}상대: ${opp} · 남은 손패 ${s.hands[p].length}장</p>
      <p class="gonote">고 하면 ${nextGo}고(${goTxt}) — ${s.rules.gobak ? '대신 상대가 먼저 나면 <b>고박</b>이에요' : '고박은 없는 집이에요'}</p>
      ${coachHtml}`;
    $('goBtns').innerHTML = '';
    $('goBtns').className = 'gobtns';
    const mk = (label, cls, a) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { $('goBox').hidden = true; sfx('tap'); finishHuman(ses, a); }; $('goBtns').appendChild(b); return b; };
    const gb = mk('고! 🔥', 'primary', G.A_GO);
    const sb = mk('스톱 ✋', 'mint', G.A_STOP);
    if (gc && !hideGc) (gc.rec === G.A_GO ? gb : sb).classList.add('look');
    ses.mReveal = hideGc ? () => { const el = $('goCoach'); if (el && !$('goBox').hidden) { el.outerHTML = coachFull; (gc.rec === G.A_GO ? gb : sb).classList.add('look'); } } : null;
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

  // 📊 결과 창 줄: 나 — 이번 게임 · 통산(원·승패) / 상대마다 — 나랑 전적·주고받은 돈 (은행 방). 은행 안 쓰면 이 방 승패만
  function relLines(ses) {
    if (!ses.cfg.online) return '';
    const mi = ses.cfg.watch ? -1 : ses.cfg.me, nm = rs => esc(ses.seats[rs] ? ses.seats[rs].name : '?');
    if (!ses.rel) return ses.score ? `<p class="small chipline">📊 이 방 ${ses.seats.map((x, rs) => `${rs === mi ? '나' : nm(rs)} ${ses.score.w[rs] || 0}승${ses.score.l[rs] || 0}패`).join(' · ')}</p>` : '';
    const R = ses.rel, L = [];
    if (mi >= 0 && relOn(ses, mi)) {
      L.push(`💰 <b>이번 게임 ${sgnN(gainWon(ses, mi))}원</b> · 통산 ${sgnN(totWon(ses, mi))}원 (${R.w[mi]}승 ${R.l[mi]}패)`);
      const vs = ses.seats.map((x, rs) => rs).filter(rs => rs !== mi && relOn(ses, rs)).map(rs => `${nm(rs)}: 나 ${R.pw[mi][rs]}승 ${R.pw[rs][mi]}패 · ${sgnN(wonOf(ses, R.pm[mi][rs]))}원`);
      if (vs.length) L.push(`🆚 상대 전적 (나 기준, 통산) ${vs.join(' / ')}`);
    } else L.push('📊 ' + ses.seats.map((x, rs) => rs).filter(rs => relOn(ses, rs)).map(rs => `${nm(rs)} ${sgnN(gainWon(ses, rs))}원 · 통산 ${R.w[rs]}승${R.l[rs]}패`).join(' / '));
    return L.map(t => `<p class="small chipline">${t}</p>`).join('');
  }

  // ── 판 결과 ──────────────────────────────────────────────
  // 🏆 랭킹: 한 판(승부) 끝날 때 내 기기에서 내 결과만 알림 (혼자=AI 판 · 친구 방=친구 판, 한 기기·AI 구경·구경꾼·나가리·연습은 안 보냄)
  //   손님도 자기 화면에서 이 결과 창이 뜨니 각자 한 번씩 (방장 대신 알리지 않음)
  function rankReport(ses, s, r) {
    try {
      if (!window.GRank || ses.isDrill || r.kind === 'nagari' || r.winner < 0) return;
      if (ses.kind !== 'solo' && ses.kind !== 'host' && ses.kind !== 'guest') return;
      const mr = ses.cfg.me, myUid = ses.net && ses.net.uid, won = r.winner === meSeat(ses);
      if (!(mr >= 0)) return;
      const wr = s.who[r.winner];                                                   // 이긴 사람의 방 자리
      const humans = ses.kind === 'solo' ? [] : s.who.filter(rs => rs !== mr && ses.seats[rs] && ses.seats[rs].uid && ses.seats[rs].uid !== myUid && !ses.seats[rs].sub);
      const aiSeat = humans.length ? null : ses.seats.find(x => x && x.ctrl === 'ai' && x.tier);   // 혼자 하기는 AI 난이도(easy·normal·hard)도 같이
      GRank.result('gostop', {
        mode: humans.length ? 'friend' : 'ai', tier: aiSeat ? aiSeat.tier : undefined, res: won ? 'w' : 'l', beat: won ? s.n - 1 : 0,
        score: ses.lastDeltas && ses.lastDeltas[mr] != null ? ses.lastDeltas[mr] : undefined,       // 이번 판 칩 손익
        opp: humans.map(rs => ({ uid: ses.seats[rs].uid, res: won ? 'w' : rs === wr ? 'l' : 'd' })),
      });
    } catch (e) { console.warn('[rank]', e); }
  }
  async function showResult(ses) {
    await Promise.race([popQ, sleep(1500)]);
    await ses.wait(FAST ? 0 : 350);
    $('pop').hidden = true;
    return new Promise((resolve, reject) => {
      const s = ses.S, r = s.result, me = meSeat(ses), watch = ses.cfg.watch, spec = watch || ses.spec || ses.hot;
      if (!r) return resolve('menu');
      let title, big = '', bigCls = '', coinLine = '';
      const nm = p => esc(seatAt(ses, p).name);
      if (r.kind === 'nagari') { title = '🤝 나가리'; big = r.nextMult > 1 ? '다음 판 ×' + r.nextMult : ''; bigCls = 'lose'; sfx('lose'); }
      else if (spec) { title = `${seatAt(ses, r.winner).em} ${nm(r.winner)} 승리!`; big = '+' + fmtN(r.points) + '점'; sfx('win'); }
      else if (r.winner === me) {
        title = r.kind === 'chongtong' ? '🎴 총통으로 이겼어요!' : r.kind === 'ppeok3' ? '💥 쓰리뻑으로 이겼어요!' : '🎉 이겼어요!';
        big = '+' + fmtN(r.points) + '점';
        const gain = r.points * 10;
        if (!ses.resCounted) { coins += gain; C.save(KEY + 'coins', coins); }
        coinLine = `<p class="rescoin">🪙 판돈 획득 +${fmtN(gain)}냥</p>`;
        sfx('win');
        if (r.points >= 10) setTimeout(() => C.confetti(), 150); else setTimeout(() => C.confetti({ particleCount: 60, spread: 60 }), 150);
      } else {
        const mine = r.per.find(l => l.p === me);
        title = r.kind === 'chongtong' ? `🎴 ${nm(r.winner)}의 총통` : r.kind === 'ppeok3' ? `💥 ${nm(r.winner)}의 쓰리뻑` : `😿 ${esc(iga(seatAt(ses, r.winner).name))} 났어요`;
        big = mine ? '-' + fmtN(mine.pay) + '점' : '';
        bigCls = 'lose'; sfx('lose');
      }
      if (!spec && r.kind !== 'nagari' && !ses.resCounted) {
        stats.played++; if (r.winner === me) { stats.won++; stats.best = Math.max(stats.best, r.points); }
        C.save(KEY + 'stats', stats); drawCoinPill();
        rankReport(ses, s, r);
      }
      // 점수 내역
      const saleRows = (r.sale || []).map(x => `<tr><td>💰 광 팔기 <span class="small">${esc(tname(ses, x.buyerSeat))} → ${esc(tname(ses, x.seat))} · 광 ${x.cards.length}장</span></td><td class="n">${x.price}점</td></tr>`).join('');
      const sideRows = (r.side || []).map(x => `<tr><td>🎴 ${esc(x.k)} 위로금 <span class="small">${esc(tname(ses, x.fromSeat))} → ${esc(tname(ses, x.toSeat))}</span></td><td class="n">${x.pts}점</td></tr>`).join('')
        + (r.kookAs ? `<tr><td>🍶 국진은 <b>${r.kookAs.as === 'P' ? '쌍피' : '열끗'}</b>로 셈 <span class="small">${esc(tname(ses, ses.S.who[r.kookAs.p]))}에게 나은 쪽</span></td><td class="n"></td></tr>` : '');
      let rows = '';
      if (r.kind !== 'nagari') {
        for (const it of r.items) rows += `<tr><td>${esc(it.k)}</td><td class="n">${it.x ? (it.add ? '(+' + it.add + ')' : '') + '×' + it.x : '+' + it.pts}${it.x ? '' : '점'}</td></tr>`;
        rows += `<tr class="sub"><td>${r.winner === me && !ses.hot ? '내' : nm(r.winner)} 점수</td><td class="n">${fmtN(r.total)}점</td></tr>`;
        for (const m of r.mults) rows += `<tr class="x"><td>${esc(m.k)}</td><td class="n">×${m.x}</td></tr>`;
        for (const l of r.per) {
          const ms = l.mults.map(m => m.x ? `${m.k} ×${m.x}` : m.k).join(' · ');
          rows += `<tr class="${l.p === me ? 'x' : ''}"><td>${nm(l.p)}${ms ? ` <span class="small">${esc(ms)}</span>` : ''}</td><td class="n">${l.pay ? '-' + fmtN(l.pay) : '0'}점</td></tr>`;
        }
        rows += `<tr class="sum"><td>${esc(iga(nameOf(ses, r.winner)))} 받는 점</td><td class="n">+${fmtN(r.points)}</td></tr>`;
        rows += saleRows + sideRows;
      }
      // 칩: 점수 변화 × 점당 칩 (친구랑 정산에 쓰는 값. 쉬는 사람 포함)
      const dl = ses.lastDeltas || {};
      const chipTxt = Object.keys(dl).map(i => ({ i: +i, v: dl[i] })).filter(x => x.v).map(x => `${esc(tname(ses, x.i))} <b class="${x.v > 0 ? 'cp' : 'cm'}">${x.v > 0 ? '+' : ''}${fmtN(x.v)}</b>`).join(' · ');
      const chipLine = chipTxt ? `<p class="small chipline">🪙 칩 (점당 ${s.rules.chipPer}) ${chipTxt}</p>` : '';
      const sumLine = r.kind === 'nagari' ? `<p style="margin:0">아무도 못 났어요. ${r.nextMult > 1 ? `다음 판 점수는 <b>${r.nextMult}배</b>!` : '다음 판은 배수 없이 그대로 해요'}</p>${saleRows || sideRows ? `<table class="brk">${saleRows}${sideRows}</table>` : ''}${chipLine}` : `<table class="brk">${rows}</table>${chipLine}`;
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
      // 📊 승패: 이 조합(은행 방은 장부에서 이어짐, 아니면 이 방) + 내 통산
      const recLine = relLines(ses);
      $('resBody').innerHTML = sumLine + recLine + reviewHtml;
      $('resBtns').innerHTML = '';
      const done = v => { clearTimeout(autoT); $('resBox').hidden = true; ses.drawReady = null; resolve(v); };
      if (worstTurn && $('drillBtn')) {
        $('drillBtn').onclick = () => { sfx('pop'); done({ drillState: worstTurn.stateBefore }); };
      }
      const mk = (label, cls, v) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); done(v); }; $('resBtns').appendChild(b); return b; };
      ses.resCounted = true;
      const online = !!ses.cfg.online, host = online && ses.cfg.role === 'host';
      let nb;
      if (online && !host) {                                 // 손님·구경꾼: 준비만 (시작은 방장)
        nb = document.createElement('button'); nb.className = 'btn primary';
        const meSeated = ses.cfg.me >= 0;
        const paint = () => { const on = ses.myReady === s.round; nb.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : meSeated ? '✋ 준비' : '✋ 다음 판에 낄래요'; nb.disabled = on; };
        nb.onclick = () => { sfx('tap'); ses.myReady = s.round; ses.net.send({ t: '_ready', round: s.round }, true); paint(); };
        paint(); $('resBtns').appendChild(nb);
      } else nb = mk(host ? '다음 판 시작 ▶' : '다음 판 ▶', 'primary', 'next');
      let fb = null;
      if (host) {
        fb = mk('안 기다리고 시작', '', 'next');
        const rb2 = document.createElement('button'); rb2.className = 'btn'; rb2.textContent = '🛠️ 규칙·점당 바꾸기';
        rb2.onclick = () => openRoundRules(ses); $('resBtns').appendChild(rb2);
      }
      // 준비 · 구경 · 끊긴 사람 (방장은 고르고, 손님은 보기만)
      if (online) {
        const rb = document.createElement('div'); rb.className = 'rdy'; $('resBody').appendChild(rb);
        ses.drawReady = () => {
          if (!rb.isConnected) return;
          const pl = (ses.net && ses.net.players) || {}, R = ses.readyOf(s.round);
          const seated = ses.seats.map((x, i) => {
            if (i === ses.cfg.me && host) return `<span class="ok">👑 ${esc(x.name)}</span>`;
            const gone = !pl[x.uid], ok = R.has(x.uid) || x.sub;
            return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(x.name)}${x.sub ? ' (AI)' : ''}${host && gone && !x.sub ? ` <button type="button" data-ai="${i}">🤖 AI</button>${ses.seats.length > 2 && !ses.bank ? ` <button type="button" data-drop="${i}">👋 빼기</button>` : ''}` : ''}</span>`;
          });
          const watchers = Object.keys(pl).filter(u => !ses.seats.some(x => x.uid === u));
          const wl = watchers.map(u => host
            ? `<label><input type="checkbox" data-join="${esc(u)}" ${ses.joinPick[u] ? 'checked' : ''}> ${esc((pl[u] && pl[u].name) || '친구')}${R.has(u) ? ' ✋' : ''}</label>`
            : `<span>${esc((pl[u] && pl[u].name) || '친구')}${R.has(u) ? ' ✋' : ''}</span>`).join('');
          rb.innerHTML = `<div class="rdy-row">${seated.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
          if (host) {
            const need = ses.seats.filter((x, i) => i !== ses.cfg.me && !x.sub), k = need.filter(x => R.has(x.uid)).length;
            const all = k === need.length;
            nb.disabled = !all; nb.textContent = all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${need.length})`;
            if (fb) fb.hidden = all;
            rb.querySelectorAll('[data-join]').forEach(c => c.onchange = () => { ses.joinPick[c.dataset.join] = c.checked; });
            rb.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => { subAI(ses, +b.dataset.ai, false); ses.drawReady(); });
            rb.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { subAI(ses, +b.dataset.drop, true); ses.drawReady(); });
          }
        };
        ses.drawReady();
      }
      if (ses.rec && ses.rec.acts.length && !ses.isDrill) mk('🎞️ 다시 보기', '', { replay: ses.rec });
      mk(watch ? '그만 보기' : '메뉴', '', 'menu');
      if (ses.bank) {                                          // 결과 창이 아래 단추를 가리므로 여기에도
        if (ses.cfg.role === 'host') { const sb = document.createElement('button'); sb.className = 'btn'; sb.textContent = '🏦 정산'; sb.onclick = () => ses.bank.flush().then(() => Bank.panel({ game: 'gostop', gid: ses.bank.gid, tab: 'settle' })); $('resBtns').appendChild(sb); }
      }
      let autoT = 0;
      if (watch && !ses.paused) autoT = setTimeout(() => { if (SES === ses && ses.alive) done('next'); }, FAST ? 30 : 4200);
      else if (ses.cfg.online && ses.cfg.role !== 'host' && ses.roundMsg && ses.roundMsg.S.round > s.round) autoT = setTimeout(() => { if (SES === ses && ses.alive) done('next'); }, FAST ? 30 : 2500);   // 방장이 벌써 다음 판을 열었으면 따라감
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
    $('pauseBtn').hidden = !watch || !!(ses && (ses.cfg.replay || ses.replaying));
    $('loanBtn').hidden = true; $('bankBtn').hidden = !(ses && ses.bank);   // 💰 빌리기 없음: 시작 돈 만원 뒤엔 마이너스로
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
  // 💰 빌리기 · 🏦 은행 창 (친구랑에서 방장이 모임을 고른 방만)
  $('loanBtn').onclick = async () => {
    const ses = SES; if (!ses || !ses.bank || !window.Bank) return;
    sfx('tap');
    if (!(await Bank.askLoan(ses.bank.gid)) || SES !== ses) return;
    if (ses.cfg.role === 'host') ses.bank.requestLoan(ses.cfg.me); else ses.bank.requestLoan();
  };
  $('bankBtn').onclick = () => { if (SES && SES.bank && window.Bank) { sfx('tap'); Bank.panel({ game: 'gostop', gid: SES.bank.gid }); } };
  C.sfx.button($('sndBtn'));
  // ── 시험용 손잡이 (headless 시험에서 씀) ─────────────────────
  window.__gostop = {
    get ses() { return SES; }, get state() { return SES && SES.S; }, get vm() { return VM; }, get geo() { return GEO; },
    autoHuman: false,
    fast(on) { FAST = on ? 1 : 0; },
    startHot(o) { o = o || {}; startSeed = o.seed >>> 0; if (o.mode) opt.lMode = o.mode; if (o.seats) opt.lSeats = o.seats; if (lPick) lPick.set(o.picks || Array.from({ length: opt.lMode }, (_, i) => ((opt.lSeats[i] || 'normal') === 'human' ? { kind: 'human', name: '사람' + (i + 1) } : { kind: 'ai', tier: opt.lSeats[i] }))); startHotSeat(); },
    start(o) { o = o || {}; startSeed = o.seed >>> 0; if (o.mode) opt.mode = o.mode; if (o.tier) opt.tier = o.tier; if (o.bonus != null) setRules(Object.assign({}, houseRules, { bonus: o.bonus })); if (o.rules) setRules(o.rules); if (o.wTiers) opt.wTiers = o.wTiers; if (o.wMode) opt.wMode = o.wMode; startGame({ watch: !!o.watch }); },
    home: () => goHome(),
    act(a) { const ses = SES; if (ses && ses.pending && !ses.pending.isResult) finishHuman(ses, a); },
    legal() { return SES ? G.legal(SES.S) : []; },
    get panel() { return SES && SES.panel; },
  };

  // ── 시작 ────────────────────────────────────────────────
  ART.install();
  $('replayBtn').onclick = () => { sfx('tap'); openReplayList(); };
  drawReplayBtn();
  // 📒 아쉬운 장면: 첫 화면 단추(없으면 숨김) · 목록을 닫으면 숫자 다시 · 노트에서 온 주소(?drill=)면 그 장면부터 연습
  $('mistakeBtn').onclick = () => {
    if (!window.Mistakes) return;
    sfx('tap'); Mistakes.open({ game: 'gostop' });
    const t = setInterval(() => { if (!document.querySelector('.mst-ov')) { clearInterval(t); drawMistakeBtn(); } }, 400);
  };
  if (window.Mistakes) Mistakes.onChange(drawMistakeBtn);
  drawMistakeBtn();
  $('gRankBtn').onclick = () => { sfx('tap'); if (window.GRank) GRank.open('gostop'); else C.toast('랭킹을 불러오지 못했어요'); };
  try { if (window.GRank) GRank.migrateLocal('gostop', () => ({ n: stats.played, w: stats.won, l: Math.max(0, stats.played - stats.won), b: stats.best || null })); } catch (e) {}   // 예전 기기 기록 한 번 올림
  document.addEventListener('click', e => {                 // 💡 답 보기 (노트 연습 첫 장면)
    if (!e.target.closest('[data-mreveal]')) return;
    const ses = SES; if (!ses || !ses.mdrill || !ses.mdrill.hide) return;
    sfx('tap'); ses.mdrill.hide = false; ses.coachHtml = null;
    markHand(ses); if (ses.mReveal) { ses.mReveal(); ses.mReveal = null; }
  });
  drawMenu();
  show('home');
  const mDrill = window.Mistakes ? Mistakes.fromUrl('gostop') : null;
  if (mDrill && mDrill.drill && mDrill.drill.rec && mDrill.drill.rec.start) {
    const d = mDrill.drill, seat = d.seat != null ? d.seat : Math.max(0, d.rec.seats.findIndex(x => x.name === '나'));
    try { startBranch(d.rec, d.k, seat, mDrill.id); } catch (e) { console.warn(e); C.toast('이 장면은 다시 열 수 없어요', 2200); goHome(); }
  } else if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
})();

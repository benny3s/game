/* 원카드 — 메뉴 · 화면 한 장 · 카드 움직임 · 조작 · 소리 (규칙은 core.js, AI 는 ai.js·ai-worker.js, 카드 그림은 cards.js)
   한 판 흐름: 상태 S → 차례인 자리(ses.seats[p].ctrl: 'me' | 'ai' | 'remote')가 행동 번호를 고름 → OneCard.step → events 로 움직임·소리 → 다음
   ☝️ 원카드 외치기(phase 'call')는 시간 경주: 혼자·한 기기·구경은 이 화면이, 친구랑은 방장이 누가 먼저였는지 정해서 행동 번호로 보냄
   친구랑: 모든 화면이 같은 씨앗·같은 행동 번호로 같은 판을 돌림 (고스톱과 같은 길 — 수 묶음 seq, 다시 들어오기 _hello/_snap, 다음 판 _round) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const G = window.OneCard, AI = window.OneCardAI, ART = window.OneCardArt, C = window.Cozy;
  const sfx = (n, o) => C.sfx.play(n, o);
  // 진동: 화면을 한 번도 안 누른 탭(구경꾼 등)은 브라우저가 막고 콘솔에 오류를 남겨서 건너뜀
  const buzz = p => { const ua = navigator.userActivation; if (ua && !ua.hasBeenActive) return; C.vibrate(p); };
  const esc = C.esc;
  const fmtN = n => Number(n || 0).toLocaleString('ko-KR');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hasJong = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const iga = w => (w === '나' ? '내가' : w + (hasJong(w) ? '이' : '가'));
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } };
  const SYM = G.SUIT_SYM;
  const suitHtml = su => (su >= 0 ? ART.pip(su) : '🃏');

  // ── 설정 · 기록 (localStorage) ─────────────────────────────
  const KEY = 'onecard.';
  const opt = {
    tab: C.store(KEY + 'tab', 'solo'), nAi: C.store(KEY + 'nAi', 3), tier: C.store(KEY + 'tier', 'normal'),
    speed: C.store(KEY + 'speed', 'normal'), coach: C.store(KEY + 'coach', 1),
    wN: C.store(KEY + 'wN', 4), wTiers: C.store(KEY + 'wTiers', ['hard', 'normal', 'easy', 'normal', 'hard', 'easy']), wSpeed: C.store(KEY + 'wSpeed', 'normal'),
    bank: C.store(KEY + 'bank', 'gbasic'), bankName: C.store(KEY + 'bankName', '기본 은행'),
    fill: C.store(KEY + 'fill', 0), fillTier: C.store(KEY + 'fillTier', 'normal'),
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  let coins = C.store(KEY + 'coins', 0);
  let stats = C.store(KEY + 'stats', { played: 0, won: 0, best: 0 });

  // ── 우리 집 규칙: 이 기기에 저장 ──
  let houseRules = G.normRules(C.store(KEY + 'rules', null) || {});
  const setRules = r => { houseRules = G.normRules(r); C.save(KEY + 'rules', houseRules); };
  const presetName = r => { const p = G.RULE_PRESETS.find(q => q.id === G.matchPreset(r)); return p ? p.name : '직접 고침'; };
  function ruleSummary(r) {
    const d = G.diffRules(r).filter(x => x.k !== 'chipPer');
    return (d.length ? d.slice(0, 4).map(x => `${x.label} ${x.text}`).join(' · ') + (d.length > 4 ? ` 외 ${d.length - 4}개` : '') : '원래 규칙 그대로') + ` · 장당 ${r.chipPer}칩`;
  }

  // ── 칩 출입구 (섯다·포커·고스톱과 같은 모양): 판마다 'chips:report' (deltas 합 0)
  const CHIPS = {
    start(kind, n) { return Array.from({ length: n }, () => 1000); },
    report(kind, info) { try { window.dispatchEvent(new CustomEvent('chips:report', { detail: Object.assign({ game: 'onecard', kind }, info) })); } catch (e) {} },
  };

  const TIER = {
    easy:   { em: '🐣', name: '초급', cls: 't-easy',   desc: '아무 카드나 툭툭 내는 병아리', names: ['삐약이', '꼬꼬', '노랑이', '병아리', '콩이', '삐삐', '봄이'] },
    normal: { em: '🐱', name: '중급', cls: 't-normal', desc: '공격 카드를 아끼고 무늬를 읽는 고양이', names: ['치즈', '나비', '까망이', '루루', '모모', '보리', '쿠키'] },
    hard:   { em: '🐯', name: '고급', cls: 't-hard',   desc: '숨은 카드를 수백 번 섞어 보는 호랑이', names: ['범이', '한라', '백두', '호돌이', '태백', '설악', '지리'] },
  };
  const SPEEDS = { slow: { label: '느긋하게', em: '🐢', mul: 1.45, think: 900 }, normal: { label: '보통', em: '⚡', mul: 1, think: 520 }, fast: { label: '빠르게', em: '🚀', mul: 0.55, think: 220 } };
  const SPEED_ORDER = ['slow', 'normal', 'fast'];

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }
  function drawMenu() {
    const tab = ['solo', 'watch', 'local'].includes(opt.tab) ? opt.tab : 'solo';
    for (const [id, t] of [['tabSolo', 'solo'], ['tabWatch', 'watch'], ['tabLocal', 'local']]) $(id).setAttribute('aria-pressed', String(tab === t));
    $('soloBox').hidden = tab !== 'solo'; $('watchBox').hidden = tab !== 'watch'; $('localBox').hidden = tab !== 'local';
    $('coinLine').innerHTML = `<span class="ic">🪙</span><span class="grow"><b>보유 ${fmtN(coins)}냥</b><span class="small">${stats.played ? `통산 ${fmtN(stats.played)}판 중 ${fmtN(stats.won)}승 · 한 판 최고 ${fmtN(stats.best)}장 받기` : '이기면 다른 사람이 남긴 카드 한 장마다 10냥'}</span></span>`;
    opt.nAi = clamp(opt.nAi | 0 || 3, 1, 5);
    segBtns($('nSeg'), [1, 2, 3, 4, 5].map(k => [k, `${k}명`]), opt.nAi, v => { opt.nAi = +v; saveOpt('nAi'); drawMenu(); });
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })), id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    segBtns($('speedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    segBtns($('coachSeg'), [[1, '🧑‍🏫 켬'], [0, '끔']], opt.coach ? 1 : 0, v => { opt.coach = +v; saveOpt('coach'); drawMenu(); });
    $('startBtn').textContent = `☝️ ${opt.nAi + 1}명 원카드 시작 (${TIER[opt.tier].em} ${TIER[opt.tier].name})`;
    opt.wN = clamp(opt.wN | 0 || 4, 2, 6);
    segBtns($('wNSeg'), [2, 3, 4, 5, 6].map(k => [k, `${k}명`]), opt.wN, v => { opt.wN = +v; saveOpt('wN'); drawMenu(); });
    $('wSeats').innerHTML = Array.from({ length: opt.wN }, (_, i) => `<div class="wseat"><b>${i + 1}번 자리</b><div class="seg" data-i="${i}"></div></div>`).join('');
    for (const el of $('wSeats').querySelectorAll('.seg')) {
      const i = +el.dataset.i;
      segBtns(el, ['easy', 'normal', 'hard'].map(t => [t, TIER[t].em + ' ' + TIER[t].name]), opt.wTiers[i] || 'normal', v => { opt.wTiers[i] = v; saveOpt('wTiers'); drawMenu(); });
    }
    segBtns($('wSpeedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.wSpeed, v => { opt.wSpeed = v; saveOpt('wSpeed'); drawMenu(); });
    drawLocalMenu();
    for (const id of ['ruleLine1', 'ruleLine2', 'ruleLine3']) {
      const el = $(id); if (!el) continue;
      el.innerHTML = `<button class="btn hr-open" type="button">🛠️ 우리 집 규칙 <b>${esc(presetName(houseRules))}</b></button><p class="small hr-sum">${esc(ruleSummary(houseRules))}</p>`;
      el.querySelector('button').onclick = openRuleSheet;
    }
    const hw = $('howto'), R = houseRules;
    if (hw && hw.children[1]) hw.children[1].innerHTML = `2·A·조커는 <b>공격</b> — 다음 사람이 ${R.atk2}~${R.atkCJ}장 먹어요. ${R.counter === 'off' ? '이 집은 받아치기 없이 바로 받아요' : '공격 카드로 받아치면 쌓여서 넘어가요'}`;
  }
  let lPick = null;
  function drawLocalNote() {
    const seats = lPick ? lPick.seats : [], N = seats.length, humans = seats.filter(s => s.kind === 'human').length;
    $('lNote').textContent = (N > 6 ? '7명 이상이면 카드 두 벌(108장)로 해요. ' : '') + (humans > 1 ? '사람 차례가 되면 가림 화면이 나와요. 기기를 받은 사람만 "내 패 보기"를 눌러요' : '');
    $('localBtn').disabled = !lPick || !lPick.valid;
    $('localBtn').textContent = `☝️ 시작 (사람 ${humans} · AI ${N - humans})`;
  }
  function drawLocalMenu() {
    if (!lPick && window.HotSeat) lPick = HotSeat.setup($('lSeats'), { game: 'onecard', min: 2, max: 8, allowAI: true, tiers: ['easy', 'normal', 'hard'], onChange: drawLocalNote });
    segBtns($('lSpeedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    drawLocalNote();
  }
  $('tabSolo').onclick = () => { sfx('tap'); opt.tab = 'solo'; saveOpt('tab'); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); opt.tab = 'watch'; saveOpt('tab'); drawMenu(); };
  $('tabLocal').onclick = () => { sfx('tap'); opt.tab = 'local'; saveOpt('tab'); drawMenu(); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('pop'); startGame({ watch: false }); };
  $('watchBtn').onclick = () => { sfx('pop'); startGame({ watch: true }); };
  $('localBtn').onclick = () => { sfx('pop'); startHotSeat(); };
  $('rulesBtn').onclick = () => showRules();

  // 친구랑: 인원은 들어온 사람 수로 (2~8명, 7명부터 두 벌). 빈자리 AI 는 방장이 고름
  let lobbyRulesOpen = false;
  function friendOpts() {
    return {
      game: 'onecard', title: '원카드', max: 8, min: 2, coach: true,
      describe: (count, cfg) => {
        const fill = (cfg && cfg.fill) | 0, tot = Math.max(count, fill);
        if (count < 2 && tot < 2) return '2명부터 시작할 수 있어요';
        return `${count}명${tot > count ? ` + AI ${tot - count}` : ''} → ${tot}명 원카드${tot > 6 ? ' · 카드 두 벌 (108장)' : ''}`;
      },
      settings: {
        defaults: { rules: G.normRules(houseRules), seed: rand32(), bank: opt.bank || null, bankName: opt.bank ? opt.bankName || null : null, fill: opt.fill | 0, fillTier: opt.fillTier },
        label: cfg => { const r = G.normRules(cfg && cfg.rules); return `${presetName(r)} · 장당 ${r.chipPer}칩${cfg && cfg.fill ? ` · AI로 ${cfg.fill}명까지` : ''}${window.Bank && Bank.label(cfg) ? ' · ' + Bank.label(cfg) : ''}`; },
        render(el, cfg, canEdit, update) {
          const r = G.normRules(cfg && cfg.rules), fill = (cfg && cfg.fill) | 0, ft = (cfg && cfg.fillTier) || 'normal';
          el.innerHTML = `<div data-bank></div><div class="optrow fillrow"><span class="small">빈자리</span>${canEdit ? '<div class="seg" data-fill></div>' : `<b class="hr-v">${fill ? `AI(${TIER[ft].em})로 ${fill}명까지` : '온 사람끼리'}</b>`}</div>${canEdit && fill ? '<div class="optrow fillrow"><span class="small">AI 실력</span><div class="seg" data-ft></div></div>' : ''}<details class="hr-top"${lobbyRulesOpen ? ' open' : ''}><summary>🛠️ 우리 집 규칙 · <b>${esc(presetName(r))}</b><small>${esc(ruleSummary(r))}</small></summary><div class="hr-body"></div></details>`;
          const bx = el.querySelector('[data-bank]');
          if (window.Bank && bx && el.isConnected) Bank.lobbyPicker(bx, { bank: cfg && cfg.bank, bankName: cfg && cfg.bankName }, canEdit, p => {
            opt.bank = p.bank || null; opt.bankName = p.bankName || null; saveOpt('bank'); saveOpt('bankName');
            const patch = { bank: opt.bank, bankName: opt.bankName };
            if (opt.bank === 'gbasic' && r.chipPer > 1) { const nr = Object.assign({}, r, { chipPer: 1 }); setRules(nr); patch.rules = nr; }   // 기본 은행(1칩 = 100원)이면 1장 = 1칩부터
            update(patch);
          });
          if (canEdit) {
            segBtns(el.querySelector('[data-fill]'), [[0, '온 사람끼리'], [4, 'AI로 4명까지'], [6, 'AI로 6명까지']], fill, v => { opt.fill = +v; saveOpt('fill'); update({ fill: +v }); });
            const fe = el.querySelector('[data-ft]');
            if (fe) segBtns(fe, ['easy', 'normal', 'hard'].map(t => [t, TIER[t].em + ' ' + TIER[t].name]), ft, v => { opt.fillTier = v; saveOpt('fillTier'); update({ fillTier: v }); });
          }
          const det = el.querySelector('details');
          det.addEventListener('toggle', () => { lobbyRulesOpen = det.open; });
          ruleSheet(el.querySelector('.hr-body'), r, canEdit, nr => { setRules(nr); update({ rules: nr }); });
        },
      },
      onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
      onLeave: why => { if (SES && SES.alive && SES.cfg.online) { goHome(); if (why) C.toast(why, 2600); } },
      onLobby: () => { if (SES && SES.alive && SES.cfg.online) { SES.keepNet = true; goHome(); } },
    };
  }
  function openFriendModal() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }

  // ── 🛠️ 우리 집 규칙 시트 (메뉴 · 친구랑 대기실) ──────────────
  const HR_OPEN = new Set(['atk']);
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
    const draw = () => {
      const sc = el.closest('.overlay > div, .arn-box'), y = sc ? sc.scrollTop : 0;
      const pid = G.matchPreset(r), cur = G.RULE_PRESETS.find(p => p.id === pid);
      let h = '<div class="hr">';
      if (!canEdit) h += '<p class="small hr-ro">방장이 정한 규칙이에요 (볼 수만 있어요)</p>';
      if (canEdit) h += `<div class="hr-pre">${G.RULE_PRESETS.map(p => `<button class="btn" type="button" data-pre="${p.id}" aria-pressed="${p.id === pid}">${esc(p.name)}</button>`).join('')}</div>`;
      h += `<p class="hr-cur">${cur ? `<b>${esc(cur.name)}</b> · ${esc(cur.desc)}` : '<b>직접 고친 규칙</b> · 아래 항목을 하나씩 바꿨어요'}</p>`;
      for (const [gid, gname] of G.RULE_GROUPS) {
        const defs = G.RULE_DEFS.filter(d => d.g === gid), changed = defs.filter(d => r[d.k] !== D[d.k]).length;
        h += `<details class="hr-g" data-g="${gid}"${HR_OPEN.has(gid) ? ' open' : ''}><summary>${gname}${changed ? `<span class="hr-n">${changed}개 바꿈</span>` : ''}</summary>${defs.map(row).join('')}</details>`;
      }
      el.innerHTML = h + '</div>';
      if (sc) sc.scrollTop = y;
    };
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b || !canEdit) return;
      sfx('tap');
      if (b.dataset.pre) r = G.normRules(Object.assign({}, G.presetRules(b.dataset.pre), { chipPer: r.chipPer }));
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

  // ── 📖 규칙 창 (지금 규칙 값 그대로) ─────────────────────
  const mini = c => `<span class="mini">${ART.face(c)}</span>`;
  function rulesHtml(R) {
    R = G.normRules(R);
    const diff = G.diffRules(R).filter(d => d.k !== 'chipPer');
    const counter = { stronger: '방금 공격과 <b>같거나 센</b> 공격 카드로 받아칠 수 있어요 (무늬나 숫자도 맞아야 해요)', any: '<b>아무 공격 카드</b>로나 받아칠 수 있어요 (무늬나 숫자는 맞아야 해요)', same: '<b>같은 숫자</b>로만 받아쳐요: 2엔 2, A엔 A(♠A 포함), 조커엔 조커', off: '이 집은 <b>받아치기가 없어요</b> — 공격받으면 바로 받아요' }[R.counter];
    const joker = R.jokerPlay === 'any' ? '조커는 <b>아무 카드 위에나</b> 낼 수 있어요' : '<b>흑백 조커</b>는 ♠·♣ 위에, <b>컬러 조커</b>는 ♥·♦ 위에 낼 수 있어요';
    return `<div class="rules">
    <div class="hr-active"><h3>🛠️ 지금 우리 집 규칙 · ${esc(presetName(R))}</h3>${diff.length ? `<ul>${diff.map(d => `<li><b>${esc(d.label)}</b> ${esc(d.text)}</li>`).join('')}</ul>` : '<p class="small">바꾼 규칙이 없어요. 원래 규칙 그대로예요</p>'}<p class="small">진 사람이 남긴 카드 1장 = 🪙 ${R.chipPer}칩 (친구랑 정산용)</p></div>
    <p>트럼프 52장과 조커 2장으로 하는 우리나라 카드 놀이예요. 손에 든 카드를 먼저 다 털면 이겨요. 2~8명 (7명부터 카드 두 벌).</p>
    <h3>나누기</h3><ul><li>한 사람에 <b>${R.deal}장</b>씩, 남은 카드는 가운데 더미</li><li>더미 맨 위 한 장을 뒤집어 시작 카드로 (특수 카드면 더미 아래로 넣고 다시)</li></ul>
    <h3>내 차례</h3><ul><li>맨 위 카드와 <b>무늬</b>나 <b>숫자</b>가 같은 카드를 한 장 내요</li><li>낼 수 없거나 내기 싫으면 더미에서 <b>한 장 먹고</b> 차례를 넘겨요</li><li>${joker}. 조커가 나온 다음 사람은 무늬 상관없이 아무 카드나 내요</li><li>더미가 떨어지면 버린 카드(맨 위 한 장만 남기고)를 섞어 다시 써요</li></ul>
    <h3>⚔️ 공격 카드</h3><table>
      <tr><td><span class="cardrow">${mini(14)}${mini(27)}</span></td><td>2 → 다음 사람이 <b>${R.atk2}장</b></td></tr>
      <tr><td><span class="cardrow">${mini(13)}${mini(26)}</span></td><td>A → <b>${R.atkA}장</b> · ♠A 는 <b>${R.atkSA}장</b> ${mini(0)}</td></tr>
      <tr><td><span class="cardrow">${mini(52)}${mini(53)}</span></td><td>흑백 조커 → <b>${R.atkBJ}장</b> · 컬러 조커 → <b>${R.atkCJ}장</b></td></tr>
    </table><ul><li>${counter}. 받아치면 장수가 <b>쌓여서</b> 다음 사람에게 넘어가요</li>${R.block3 ? '<li><b>3 으로 2 막기</b>: 2 공격을 같은 무늬 3 으로 막으면 아무도 안 받아요</li>' : ''}<li>못 받아치면 쌓인 장수만큼 먹고 차례가 넘어가요</li></ul>
    <h3>🎴 특수 카드</h3><table>
      ${R.jSkip ? '<tr><td>J</td><td>다음 사람을 <b>건너뛰어요</b> (둘이면 내가 또)</td></tr>' : ''}
      ${R.qRev ? '<tr><td>Q</td><td>도는 <b>방향을 바꿔요</b> (둘이면 건너뛰기와 같아요)</td></tr>' : ''}
      ${R.kAgain ? '<tr><td>K</td><td><b>한 장 더</b> 내요. 낼 게 없으면 한 장 먹어요</td></tr>' : ''}
      ${R.seven ? '<tr><td>7</td><td>낸 사람이 <b>다음 무늬</b>를 정해요 (♠ ♥ ♦ ♣)</td></tr>' : ''}
      ${!R.jSkip && !R.qRev && !R.kAgain && !R.seven ? '<tr><td>—</td><td>이 집은 J·Q·K·7 을 그냥 카드로 써요</td></tr>' : ''}
    </table>
    <h3>☝️ 원카드!</h3><ul>${R.oneCard ? `<li>카드가 <b>한 장</b> 남으면 <b>${R.callSec}초 안에</b> ☝️ 원카드! 를 눌러요</li><li>다른 사람이 먼저 <b>🫵 잡았다!</b> 를 누르거나 시간이 지나면 <b>${R.callPen}장</b> 먹어요</li><li>두 장일 때 미리 <b>☝️ 준비</b> 를 눌러 두면 한 장이 되자마자 외쳐요</li>` : '<li>이 집은 외치기를 안 해요</li>'}</ul>
    <h3>🏁 끝내기 · 정산</h3><ul>${R.bust ? `<li>손패가 <b>${R.bust}장</b>이 되면 <b>파산</b> — 그 판에서 빠져요</li>` : '<li>파산은 없어요</li>'}
      ${R.rankAll ? `<li>한 사람이 털어도 계속해서 <b>꼴찌까지 등수</b>를 가려요. 등수 한 칸 차이마다 ${R.placePts}장 값을 주고받아요</li>` : '<li>한 사람이 카드를 다 털면 판이 끝나요. 진 사람은 <b>남은 카드 한 장마다</b> 이긴 사람에게 줘요</li>'}
      ${R.bust ? `<li>파산한 사람은 ${R.bust + R.bustPay}장 값을 내요${R.rankAll ? ` (등수 값 + 벌금 ${R.bustPay}장)` : ''}</li>` : ''}<li>다음 판은 이긴 사람부터 시작해요</li></ul>
    <p class="small">카드 왼쪽 위 글자는 숫자, 아래는 무늬예요. 손패의 빨간 표 <b>+N</b> 은 공격 장수예요.</p>
  </div>`;
  }
  function showRules(R) {
    sfx('tap');
    R = R || (SES && SES.S && SES.S.rules) || houseRules;
    const btns = [{ label: '처음 안내', onClick: () => { setTimeout(() => showHowto(true), 30); } }];
    if (!SES) btns.push({ label: '🛠️ 규칙 바꾸기', onClick: () => { setTimeout(openRuleSheet, 30); } });
    btns.push({ label: '닫기', primary: true });
    return C.modal({ title: '📖 원카드 규칙', html: rulesHtml(R), buttons: btns, dismiss: true, cls: 'rulesov' });
  }
  function showHowto(force) {
    const R = (SES && SES.S && SES.S.rules) || houseRules;
    return C.howto('onecard', '☝️ 원카드 하는 법', [
      '맨 위 카드와 <b>무늬</b>나 <b>숫자</b>가 같은 카드를 내요. 낼 수 있는 카드는 살짝 올라와 있어요',
      '카드를 한 번 누르면 고르고, <b>한 번 더 누르면</b> 내요. 낼 게 없으면 <b>🃏 한 장 먹기</b>',
      `2·A·조커는 <b>공격</b>! 받아치면 쌓여서 넘어가요 (빨간 표 = 장수)`,
      'J 건너뛰기 · Q 방향 바꾸기 · K 한 장 더 · 7 무늬 바꾸기',
      R.oneCard ? `한 장 남으면 <b>${R.callSec}초 안에 ☝️ 원카드!</b> — 남이 한 장 남았을 땐 <b>🫵 잡았다!</b>` : '이 집은 원카드 외치기가 없어요',
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
    $('resBox').hidden = true; $('pop').hidden = true; $('callZone').hidden = true;
    $('loanBtn').hidden = true; $('bankBtn').hidden = true;
    $('hand').innerHTML = ''; $('opps').innerHTML = ''; $('fly').innerHTML = ''; $('discard').innerHTML = '';
    const rb = $('rpBar'); if (rb) rb.remove();
    document.querySelectorAll('.rpgo').forEach(x => x.remove());
    show('home'); drawMenu();
  }

  // ── AI 일꾼 (🐯 은 Web Worker 에서) ─────────────────────────
  let worker = null, wid = 0;
  const wjobs = new Map();
  try {
    worker = new Worker('ai-worker.js?v=1');
    worker.onmessage = e => { const j = wjobs.get(e.data.id); if (j) { wjobs.delete(e.data.id); j(e.data.a); } };
    worker.onerror = () => { worker = null; for (const j of wjobs.values()) j(-1); wjobs.clear(); };
  } catch (e) { worker = null; }
  // 🧑‍🏫 선생님용 깊은 계산 (일꾼에서, 화면이 안 멈추게): { a, base, gain, n } 또는 null
  function coachMC(v, seed) {
    if (!worker) return Promise.resolve(null);
    return new Promise(res => {
      const id = ++wid;
      const to = setTimeout(() => { if (wjobs.delete(id)) res(null); }, 3000);
      wjobs.set(id, d => { clearTimeout(to); res(d && typeof d === 'object' ? d : null); });
      worker.postMessage({ id, view: v, tier: 'coach', seed, ms: 260 });
    });
  }
  function aiChoose(v, tier) {
    const seed = rand32();
    const local = () => AI.choose(v, tier, { seed, samples: tier === 'hard' ? 40 : 0, ms: tier === 'hard' ? 200 : 0 });
    if (tier !== 'hard' || !worker) return Promise.resolve(local());
    return new Promise(res => {
      const id = ++wid;
      const to = setTimeout(() => { if (wjobs.delete(id)) res(local()); }, 4000);
      wjobs.set(id, a => { clearTimeout(to); res(a >= 0 ? a : local()); });
      worker.postMessage({ id, view: v, tier, seed, ms: FAST ? 20 : 320 });
    }).then(a => (G.isLegal(v, a) ? a : AI.choose(v, 'normal', { seed })));
  }

  // ── 한 판 (세션) ─────────────────────────────────────────
  class Cancel extends Error {}
  let SES = null;
  function newSession(cfg) {
    const ses = { cfg, alive: true, readyMap: {}, joinPick: {}, timers: new Set(), waiters: [], modals: [], pending: null, paused: false, S: null, V: null, seats: [], sel: -1, net: null, seq: 0, acts: new Map(), actWaiters: [], hot: !!cfg.hot, hide: !!cfg.hot, panel: null, coachOn: false, coachHtml: null, callBuf: {}, race: null, armed: false };
    ses.wait = ms => new Promise((res, rej) => {
      if (!ses.alive) return rej(new Cancel());
      const t = setTimeout(() => { ses.timers.delete(t); if (ses.alive) res(); else rej(new Cancel()); }, Math.max(0, ms));
      ses.timers.add(t);
    });
    ses.check = () => { if (!ses.alive) throw new Cancel(); };
    ses.readyOf = r => (ses.readyMap[r] = ses.readyMap[r] || new Set());
    ses.ready = () => new Promise((res, rej) => {
      const go = () => { if (!ses.alive) return rej(new Cancel()); if (document.hidden || ses.paused) { ses.waiters.push(go); return; } res(); };
      go();
    });
    ses.wake = () => { const w = ses.waiters.splice(0); w.forEach(f => f()); };
    ses.dispose = () => {
      ses.alive = false;
      clearInterval(ses.turnT);
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
      document.querySelectorAll('.overlay:not(#resBox)').forEach(o => o.remove());
    };
    return ses;
  }
  document.addEventListener('visibilitychange', () => { if (SES) SES.wake(); });
  const speedKey = () => (SES && SES.cfg.watch ? 'wSpeed' : 'speed');
  const SP = () => SPEEDS[opt[speedKey()]] || SPEEDS.normal;
  let FAST = 0;                                            // 시험용: 움직임 시간 줄이기
  const D = ms => (FAST ? 1 : Math.round(ms * SP().mul));

  let startSeed = 0, startState = null;
  function startGame({ watch }) {
    if (SES) SES.dispose();
    const n = watch ? clamp(opt.wN | 0, 2, 6) : clamp(opt.nAi | 0, 1, 5) + 1;
    const rules = G.normRules(houseRules);
    const cfg = { watch, N: n, rules, seed: startSeed, me: watch ? -1 : 0, initState: startState };
    startSeed = 0; startState = null;
    const ses = SES = newSession(cfg);
    const used = {};
    const mk = tier => { const t = TIER[tier]; used[tier] = (used[tier] || 0) + 1; return { ctrl: 'ai', tier, name: t.names[(used[tier] - 1) % t.names.length], em: t.em }; };
    if (watch) ses.seats = Array.from({ length: n }, (_, i) => mk(opt.wTiers[i] || 'normal'));
    else ses.seats = [{ ctrl: 'me', tier: null, name: '나', em: '나' }].concat(Array.from({ length: n - 1 }, () => mk(opt.tier)));
    ses.coachOn = !!opt.coach;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }
  // 한 기기에서 여럿: 사람 자리마다 차례가 오면 가림 화면 → 그 사람만 카드를 봄
  function startHotSeat() {
    const picks = lPick ? lPick.seats : [], N = picks.length;
    if (N < 2 || N > 8 || !picks.some(s => s.kind === 'human')) return C.toast('사람이 한 명은 있어야 해요');
    if (SES) SES.dispose();
    const rules = G.normRules(houseRules);
    const cfg = { watch: false, hot: true, N, rules, seed: startSeed, me: picks.findIndex(s => s.kind === 'human') };
    startSeed = 0;
    const ses = SES = newSession(cfg);
    const used = {};
    ses.seats = picks.map((k, i) => {
      if (k.kind === 'human') return { ctrl: 'me', tier: null, name: k.name || `사람 ${i + 1}`, em: k.emoji || '🙂' };
      const tier = TIER[k.tier] ? k.tier : 'normal', t = TIER[tier]; used[tier] = (used[tier] || 0) + 1;
      return { ctrl: 'ai', tier, name: t.names[(used[tier] - 1) % t.names.length], em: t.em };
    });
    ses.coachOn = !!opt.coach;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }

  // ── 친구랑 ────────────────────────────────────────────────
  const AVS = ['🃏', '🌟', '🍀', '🔥', '🌙', '🎈', '🐳', '🦊'];
  const isBotUid = u => typeof u === 'string' && u.indexOf('ai:') === 0;
  function startOnline({ net, role, cfg, players }) {
    if (SES) SES.dispose();
    const host = net.meta && net.meta.host;
    const plist = Object.entries(players || {}).filter(([, p]) => !(p && p.watch)).map(([uid, p]) => Object.assign({ uid }, p))
      .sort((x, y) => (y.uid === host) - (x.uid === host) || (x.t || 0) - (y.t || 0) || (x.uid < y.uid ? -1 : 1));
    const myIdx = plist.findIndex(p => p.uid === net.uid);
    const rules = G.normRules(cfg && cfg.rules);
    const ses = SES = newSession({ watch: false, online: true, role, N: 2, rules, seed: (cfg && cfg.seed) || 12345, me: myIdx, coach: !!(cfg && cfg.coach) });
    ses.net = net;
    ses.seats = plist.slice(0, 8).map((pl, i) => ({ ctrl: i === myIdx ? 'me' : 'remote', tier: null, name: i === myIdx ? (pl.name || '나') : (pl.name || `친구${i + 1}`), em: i === myIdx ? '나' : AVS[i % AVS.length], uid: pl.uid }));
    // 빈자리 AI (방장이 고름): 방장 화면에서만 AI 가 두고, 친구 화면은 방장이 보낸 수를 따라감
    const fill = Math.min(8, (cfg && cfg.fill) | 0), ft = TIER[cfg && cfg.fillTier] ? cfg.fillTier : 'normal';
    for (let i = ses.seats.length, k = 0; i < fill; i++, k++) ses.seats.push({ ctrl: role === 'host' ? 'ai' : 'remote', tier: ft, name: TIER[ft].names[k % TIER[ft].names.length], em: TIER[ft].em, uid: 'ai:' + i, bot: true });
    if (ses.seats.length < 2) ses.seats.push({ ctrl: role === 'host' ? 'ai' : 'remote', tier: 'normal', name: TIER.normal.names[0], em: TIER.normal.em, uid: 'ai:1', bot: true });
    ses.cfg.N = ses.seats.length;
    ses.netOffs = [];
    const ON = (ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') ses.netOffs.push(off); };
    const pushAct = (m, from) => {
      if (m && m.t === '_chips') {
        if (role !== 'host' && Array.isArray(m.coins) && m.round >= (ses.chipSync || 0)) { ses.chips = m.coins.slice(); ses.chipSync = m.round; drawBar(ses); }
        return;
      }
      if (m && m.t === '_hello') { if (role === 'host' && from) sendSnap(from); return; }
      if (m && m.t === '_call') {                           // ☝️ 원카드 · 🫵 잡았다 (방장이 누가 먼저인지 정함)
        if (role !== 'host' || !from) return;
        if (ses.race && ses.race.seq === m.seq) ses.race.input(from, m.k);
        else if (m.seq >= ses.seq) (ses.callBuf[m.seq] = ses.callBuf[m.seq] || []).push({ uid: from, k: m.k });
        return;
      }
      if (m && m.t === '_ready') {
        if (role !== 'host' || !from || !ses.S || m.round !== ses.S.round) return;
        ses.readyOf(m.round).add(from);
        if (!ses.seats.some(x => x.uid === from)) ses.joinPick[from] = true;
        net.broadcast({ t: '_readyList', round: m.round, uids: [...ses.readyOf(m.round)], pick: ses.joinPick }, true);
        if (ses.drawReady) ses.drawReady();
        return;
      }
      if (m && m.t === '_readyList') { if (role !== 'host' && Array.isArray(m.uids)) { const R = ses.readyOf(m.round); m.uids.forEach(u => R.add(u)); if (ses.drawReady) ses.drawReady(); } return; }
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
    const sendSnap = uid => {
      if (!ses.S || !ses.alive || ses.subThinking) return;
      net.send(uid, { t: '_snap', j: JSON.stringify(roundPack(ses)) }, true);
    };
    if (role === 'host') {
      ON('msg', (uid, m) => pushAct(m, uid));
      ON('leave', uid => {
        const i = ses.seats.findIndex(x => x.uid === uid); if (i < 0 || SES !== ses) return;
        C.toast(`${ses.seats[i].name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
        if (ses.drawReady) ses.drawReady();
        setTimeout(() => { if (!ses.alive || SES !== ses || (net.players || {})[uid] || ses.seats[i] !== ses.seats.find(x => x.uid === uid) || ses.seats[i].sub) return; askGone(ses, i); }, 5000);
      });
      ON('join', uid => {
        const i = ses.seats.findIndex(x => x.uid === uid); if (i < 0 || SES !== ses) return;
        const st = ses.seats[i];
        if (ses.goneAsk && ses.goneAsk.uid === uid) { try { ses.goneAsk.close(); } catch (e) {} ses.goneAsk = null; }
        if (st.sub) { st.sub = false; st.drop = false; st.ctrl = 'remote'; st.tier = null; C.toast(`${st.name} 님이 돌아왔어요. 다시 직접 해요`, 2400); try { net.chat(`🙌 ${st.name} 님이 돌아와서 직접 해요`); } catch (e) {} }
      });
    } else ON('msg', m => pushAct(m));
    ON('players', () => { if (SES !== ses) return; if (ses.S) drawBar(ses); if (ses.drawReady) ses.drawReady(); });
    net.sendAct = a => {
      const m = { t: 'act', seq: ses.seq, a };
      ses.acts.set(ses.seq, a);
      if (role === 'host') net.broadcast(m, true); else net.send(m, true);
    };
    if (role !== 'host') {
      ses.snapP = new Promise(res => {
        let tries = 0;
        const ask = () => { if (!ses.alive || ses.snapGot) return; if (++tries > 12) { res(null); return; } net.send({ t: '_hello' }, true); ses.snapT = setTimeout(ask, 1500); };
        ses.onSnap = m => { if (ses.snapGot) return; let d = null; try { d = JSON.parse(m.j); } catch (e) {} if (!d || !d.S) return; ses.snapGot = true; clearTimeout(ses.snapT); res(d); };
        ask();
      });
    }
    ses.coachOn = ses.cfg.coach;
    show('play');
    setupCoach(ses);
    if (cfg && cfg.bank && window.Bank) {
      if (Bank.getMeta) Bank.getMeta(cfg.bank).then(m => { if (SES === ses && m && m.chipWon) { ses.chipWon = m.chipWon; drawBar(ses); } }, () => {});
      if (role === 'host') {
        ses.bank = Bank.attach({ game: 'onecard', net, cfg, seats: ses.seats, min: 1, onEvent: ev => bankEvent(ses, ev) });
        drawDock();
        $('lbl').textContent = `👥 친구랑 (${net.code})`; $('sub').textContent = '🏦 은행 장부를 여는 중…';
        ses.bank.ready.then(stacks => {
          if (!ses.alive || SES !== ses) return;
          ses.startChips = CHIPS.start('host', ses.seats.length).map((b, i) => (stacks && stacks[i] > 0 ? stacks[i] : b));
          net.broadcast({ t: '_chips', round: 0, coins: ses.startChips }, true);
          runMatch(ses);
        });
        return;
      }
      ses.bank = Bank.attach({ game: 'onecard', net, cfg, role: 'guest', onEvent: ev => bankEvent(ses, ev) });
    }
    drawDock();
    runMatch(ses);
  }
  function bankEvent(ses, ev) {
    if (!ses.alive || !ev) return;
    const host = ses.cfg.role === 'host';
    if (ev.op === 'queued') C.toast(ev.mine || !host ? `💰 다음 판에 ${fmtN(ev.n)}칩을 받아요` : `💰 ${ev.name} 님이 ${fmtN(ev.n)}칩 빌리기 (다음 판에)`, 2200);
    else if (ev.op === 'loan') {
      C.toast(`💰 ${ev.name} 님이 은행에서 ${ses.chipWon ? fmtN(Math.round(ev.n * ses.chipWon)) + '원' : fmtN(ev.n) + '칩'} 빌렸어요${ev.auto ? ' (바닥나서 자동)' : ''}`, 2600);
      if (host && ses.net) ses.net.broadcast({ t: '_bank', op: 'loan', name: ev.name, n: ev.n }, true);
    } else if (ev.op === 'no' || ev.op === 'error') C.toast('🏦 ' + (ev.msg || '은행 장부에 못 썼어요'), 2600);
  }
  Cozy.backGuard($('backBtn'), () => { sfx('tap'); goHome(); });

  async function runMatch(ses) {
    try {
      const baseSeed = (ses.cfg.seed || rand32()) >>> 0;
      let s = null;
      if (ses.snapP) {
        $('sub').textContent = '방장 화면과 맞추는 중…';
        const d = await ses.snapP; ses.check();
        if (d) {
          s = adoptPack(ses, d); ses.resume = d.seq > 0;
          if (Array.isArray(d.chips)) ses.startChips = d.chips;
          if (ses.cfg.me < 0) C.toast('지금 판은 구경해요. 다음 판부터 같이 해요', 3000);
        }
      }
      if (!s && ses.cfg.initState) s = G.fastClone(ses.cfg.initState);   // 시험용: 만든 판으로 시작
      if (!s) s = G.create({ players: ses.seats.length, rules: ses.cfg.rules, seed: baseSeed, first: 0 });
      ses.kind = ses.cfg.watch ? 'watch' : ses.hot ? 'hot' : ses.cfg.online ? (ses.cfg.role === 'host' ? 'host' : 'guest') : 'solo';
      ses.chips = (ses.startChips || CHIPS.start(ses.kind, ses.seats.length)).slice();
      for (;;) {
        await playRound(ses, s);
        if (!ses.isDrill) reportChips(ses); else { ses.lastDeltas = null; drawBar(ses); }   // 복기 연습 판은 칩·기록에 안 넣음
        let next;
        for (;;) {
          next = await showResult(ses);
          if (next && typeof next === 'object' && next.replay) { await runReplay(ses, next.replay, true); ses.check(); continue; }   // 🎮 여기서부터 두기로 갔으면 이 판은 끝
          break;
        }
        ses.isDrill = false;
        if (next !== 'next') { goHome(); return; }
        if (ses.bank && ses.cfg.role === 'host') {
          $('sub').textContent = '🏦 장부에 쓰는 중…';
          const r = await ses.bank.beforeNext({ coins: ses.chips, min: 1 });
          ses.check();
          ses.chips = r.coins.slice(); drawBar(ses);
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
      if (SES === ses) { C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); }
    }
  }

  // 친구랑 판 묶음: 방장 판 상태 + 자리(uid 순서) + 수 번호 + 칩
  const roundPack = (ses, S) => ({ S: S || ses.S, seq: ses.seq, uids: ses.seats.map(x => x.uid), names: ses.seats.map(x => x.name), ems: ses.seats.map(x => x.em), chips: ses.chips, score: ses.score || null });
  function adoptPack(ses, d) {
    const idx = d.uids.indexOf(ses.net.uid);
    ses.seats = d.uids.map((u, i) => {
      const old = ses.seats.find(x => x.uid === u);
      const name = (d.names && d.names[i]) || (old && old.name) || `친구${i + 1}`;
      const bot = isBotUid(u);
      return { ctrl: i === idx ? 'me' : 'remote', tier: null, name, em: i === idx ? '나' : (bot && d.ems && d.ems[i]) || AVS[i % AVS.length], uid: u, bot };
    });
    ses.cfg.me = idx; ses.cfg.N = d.uids.length; ses.seq = d.seq;
    if (d.score) ses.score = { w: d.score.w || [], l: d.score.l || [] };
    return d.S;
  }
  // 방장: 다음 판 열기. 구경하던 사람(새로 온 사람)은 8명까지 자리에 넣고(AI 자리부터 비켜 줌), 빠지기로 한 자리는 뺌
  function hostNextRound(ses, rSeed) {
    const pl = (ses.net && ses.net.players) || {}, have = new Set(ses.seats.map(x => x.uid));
    const prev = ses.S, r = prev.result, old = ses.seats;
    const prevUid = old[r && r.winner >= 0 ? r.winner : prev.first].uid;
    let keep = old.map((x, i) => i).filter(i => !old[i].drop);
    const fresh = Object.keys(pl).filter(u => !have.has(u) && !(pl[u] && pl[u].watch) && ses.joinPick[u]).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    while (keep.length + fresh.length > 8) { const bi = keep.map(i => old[i]).reverse().findIndex(x => x.bot); if (bi < 0) break; keep.splice(keep.length - 1 - bi, 1); }
    const add = fresh.slice(0, Math.max(0, 8 - keep.length));
    let s;
    if (add.length || keep.length !== old.length) {
      const gone = old.filter((x, i) => keep.indexOf(i) < 0).map(x => x.name);
      ses.seats = keep.map(i => old[i]); ses.chips = keep.map(i => ses.chips[i]);
      if (ses.score) { ses.score.w = keep.map(i => ses.score.w[i]); ses.score.l = keep.map(i => ses.score.l[i]); }
      for (const u of add) { const i = ses.seats.length; ses.seats.push({ ctrl: 'remote', tier: null, name: (pl[u] && pl[u].name) || `친구${i + 1}`, em: AVS[i % AVS.length], uid: u }); ses.chips.push(CHIPS.start('host', 1)[0]); delete ses.joinPick[u]; }
      const N = ses.seats.length;
      const fi = Math.max(0, ses.seats.findIndex(x => x.uid === prevUid));
      s = G.create({ players: N, rules: prev.rules, seed: rSeed, first: fi, round: prev.round + 1 });
      ses.cfg.N = N; ses.cfg.me = ses.seats.findIndex(x => x.uid === ses.net.uid);
      const msg = [add.length ? `${add.map(u => (pl[u] && pl[u].name) || '친구').join(', ')} 님 합류` : '', gone.length ? `${gone.join(', ')} 빠짐` : ''].filter(Boolean).join(' · ');
      C.toast(`${msg} → ${N}명`, 2600);
      try { ses.net.chat(`📣 ${msg} → 이번 판부터 ${N}명`); } catch (e) {}
    } else s = G.nextRound(ses.S, { seed: rSeed });
    ses.S = s;
    ses.net.broadcast({ t: '_round', j: JSON.stringify(roundPack(ses, s)) }, true);
    return s;
  }
  // 방장: 나간 사람 자리를 어떻게 할지
  function askGone(ses, i) {
    const st = ses.seats[i]; if (!st || st.sub || ses.goneAsk) return;
    const canDrop = ses.seats.length > 2 && !ses.bank;
    const close = C.modal({
      title: `🔌 ${st.name} 님이 나갔어요`,
      html: `<p style="margin:0">어떻게 할까요? AI 는 🐱 중급이 대신 해요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.${ses.bank ? '<br><span class="small">은행 방은 자리를 빼지 않고 AI 가 대신 해요</span>' : ''}</p>`,
      buttons: [{ label: '🤖 중급 AI가 대신', primary: true, onClick: () => subAI(ses, i, false) }]
        .concat(canDrop ? [{ label: `👋 이번 판만 AI · 다음 판부터 빼기 (${ses.seats.length - 1}명)`, onClick: () => subAI(ses, i, true) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { if (window.ArenaUI && ArenaUI.net === ses.net) { try { ses.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} ArenaUI.toLobby(); } } }, { label: '⏳ 기다리기' }]),
      dismiss: false, onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; ses.modals = ses.modals.filter(x => x !== close); },
    });
    ses.goneAsk = { uid: st.uid, close }; ses.modals.push(close);
  }
  function subAI(ses, i, drop) {
    const st = ses.seats[i]; if (!st) return;
    st.sub = true; st.drop = !!drop; st.ctrl = 'ai'; st.tier = 'normal';
    try { ses.net.chat(drop ? `🤖 ${st.name} 님 자리는 이번 판만 AI 가 하고, 다음 판부터 빠져요` : `🤖 ${st.name} 님 자리는 AI 가 대신 해요 (돌아오면 다시 직접)`); } catch (e) {}
    const S = ses.S;
    if (S && S.phase !== 'end' && S.phase !== 'call' && S.turn === i && ses.actWaiters.length && !ses.acts.has(ses.seq)) {
      const seq = ses.seq; ses.subThinking = true;
      aiTurn(ses, i).then(a => { ses.subThinking = false; if (!ses.alive || ses.seq !== seq || ses.acts.has(seq)) return; ses.net.sendAct(a); wakeActs(ses); }, () => { ses.subThinking = false; });
    }
    if (ses.drawReady) ses.drawReady();
    render(ses);
  }

  // 판이 끝날 때마다: 장수 변화 × 장당 칩 (합 0). 친구랑 손님은 방장이 알려 주니 알리지 않음
  function reportChips(ses) {
    const s = ses.S, r = s && s.result; if (!r) return;
    ses.score = ses.score || { w: [], l: [] };
    for (let q = 0; q < s.n; q++) { const k = q === r.winner ? 'w' : 'l'; ses.score[k][q] = (ses.score[k][q] || 0) + 1; }
    const per = s.rules.chipPer, deltas = {};
    G.pointDeltas(s).forEach((x, i) => { deltas[i] = x * per; });
    ses.lastDeltas = deltas;
    if (!(ses.kind === 'guest' && (ses.chipSync || 0) >= s.round)) ses.chips = (ses.chips || CHIPS.start(ses.kind, s.n)).map((c, i) => c + (deltas[i] || 0));
    drawBar(ses);
    if (ses.kind === 'guest') return;
    CHIPS.report(ses.kind, { round: s.round, over: false, deltas, coins: ses.chips.slice(), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl, uid: x.uid })), me: ses.cfg.me });
  }

  // ── 자리 ────────────────────────────────────────────────
  const meSeat = ses => (ses.cfg.watch ? -1 : (ses.cfg.me == null ? 0 : ses.cfg.me));
  const bottomSeat = ses => { const m = meSeat(ses); return m >= 0 && m < (ses.V ? ses.V.n : ses.seats.length) ? m : 0; };
  const faceUp = (ses, p) => !!(ses.cfg.watch || ses.replaying || (p === meSeat(ses) && !ses.hide));
  const nameOf = (ses, p) => (p === meSeat(ses) && !ses.hot && !ses.cfg.watch && !ses.replaying ? '나' : (ses.seats[p] ? ses.seats[p].name : '?'));
  const myTurnNow = ses => { const s = ses.S, me = meSeat(ses); return !!(s && me >= 0 && s.phase === 'play' && s.turn === me && ses.pending && !ses.pending.isResult && !ses.pending.isCall && !ses.hide && !ses.replaying); };

  // ── 자리 계산 (화면 크기에 맞춰) ─────────────────────────────
  let GEO = null;
  function layout(ses) {
    const st = $('stage'), W = st.clientWidth, H = st.clientHeight;
    if (!W || !H || !ses.V) return;
    const n = ses.V.n, land = W > H * 1.15, watch = !!(ses.cfg.watch || ses.replaying);
    const cw = clamp(Math.min(W / (land ? 10 : 5.3), H * (land ? 0.2 : 0.155)), 40, 96), ch = cw * 1.5, lift = ch * 0.16;
    const handH = ch + lift + 4, seatH = 36;
    // 가로: 내 이름표·먹기 단추는 손패 양옆 (손패는 가운데 띠만 씀), 세로: 손패 위 한 줄
    const side = land ? Math.min(200, W * 0.24) : 0;
    const hand = { x: side, y: H - handH, w: W - side * 2, h: handH, cw, ch, lift };
    const mine = land ? { x: 6, y: H - seatH - 10, w: W - 12, h: seatH } : { x: 6, y: H - handH - seatH, w: W - 12, h: seatH };
    const felt = { x: 4, y: 4, w: W - 8, h: (land ? hand.y : mine.y) - 8 };
    const cx = W / 2, cy = felt.y + felt.h / 2;
    let chipW = clamp(W * (land ? 0.16 : 0.25), 76, 124);
    const chipH = watch ? 76 : 64;
    const rx = Math.max(40, felt.w / 2 - chipW / 2 + 2), ry = Math.max(30, felt.h / 2 - chipH / 2 + 6);
    const b = bottomSeat(ses), k = n - 1, span = k <= 1 ? 0 : Math.min(land ? 200 : 230, [0, 0, 120, 180, 204][k] || 230);
    const opp = {};
    if (land && k >= 5) {
      // 가로 화면에 여럿(6명~): 타원에 두면 옆 자리끼리 겹쳐서, 양 끝 둘은 판 아래 모서리 · 나머지는 위쪽 한 줄
      const m = k - 2;
      chipW = Math.max(64, Math.min(chipW, (felt.w - 8) / m - 6));
      const xL = felt.x + chipW / 2 + 4, xR = felt.x + felt.w - chipW / 2 - 4, yTop = felt.y + chipH / 2 + 2, ySide = felt.y + felt.h - chipH / 2 - 2;
      opp[(b + 1) % n] = { x: xL, y: ySide };
      for (let i = 0; i < m; i++) opp[(b + 2 + i) % n] = { x: m === 1 ? cx : xL + (xR - xL) * i / (m - 1), y: yTop };
      opp[(b + k) % n] = { x: xR, y: ySide };
    } else {
      for (let j = 1; j <= k; j++) {
        const q = (b + j) % n, th = (90 + span / 2 - (k <= 1 ? 0 : (j - 1) * span / (k - 1))) * Math.PI / 180;
        opp[q] = { x: cx + rx * Math.cos(th), y: cy - ry * Math.sin(th) };
      }
    }
    for (const q in opp) opp[q].x = clamp(opp[q].x, chipW / 2 + 2, W - chipW / 2 - 2);
    // 더미 두 개: 맨 위 상대 자리 아래로 (가로처럼 판이 낮으면 작게). 옆 자리와 겹치면 조금씩 줄임
    const topY = k ? Math.min(...Object.values(opp).filter(o => Math.abs(o.x - cx) < chipW / 2 + cw * 1.25).map(o => o.y).concat([1e9])) : 1e9;
    const room = topY < 1e9 ? felt.y + felt.h - 6 - (topY + chipH / 2 + 4) - 30 : felt.h;
    const boxes = Object.values(opp).map(o => ({ l: o.x - chipW / 2 - 4, r: o.x + chipW / 2 + 4, t: o.y - chipH / 2 - 2, b: o.y + chipH / 2 + 2 }));
    const hits = r => boxes.some(q => r.x < q.r && r.x + r.w > q.l && r.y < q.b && r.y + r.h > q.t);
    let pw = clamp(Math.min(cw * 1.15, felt.h * 0.32 / 1.5, felt.w * 0.22, room / 1.5), 34, 104), ph, pcy, draw, disc;
    for (;;) {
      ph = pw * 1.5;
      pcy = topY < 1e9 ? Math.max(cy + 8, topY + chipH / 2 + 10 + ph / 2) : cy + 8;
      draw = { x: cx - pw - 6, y: pcy - ph / 2 - 8, w: pw, h: ph }; disc = { x: cx + 6, y: pcy - ph / 2 - 8, w: pw, h: ph };
      if (pw <= 34 || (!hits(draw) && !hits(disc))) break;
      pw = Math.max(34, pw - 2);
    }
    const ringS = Math.min(felt.w * 0.62, felt.h * 0.8, pw * 4.2);
    GEO = { W, H, land, n, hand, mine, felt, cx, cy, chipW, chipH, opp, draw, disc, pw, ph, ringS, call: { x: cx, y: Math.max(draw.y + ph + 20, mine.y - 112) } };
    const put = (el, r) => { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; };
    put($('felt'), felt); put($('drawPile'), draw); put($('discard'), disc);
    put($('ring'), { x: cx - ringS / 2, y: pcy - 8 - ringS / 2, w: ringS, h: ringS });
    put($('mySeat'), mine);
    $('tState').style.left = cx + 'px'; $('tState').style.top = (draw.y + ph + 26) + 'px';
    $('callZone').style.left = cx + 'px'; $('callZone').style.top = GEO.call.y + 'px';
    $('hand').style.top = '0px'; $('hand').style.height = H + 'px';
  }

  // ── 그리기 (ses.V = 지금 화면에 보이는 상태, 움직임 중간 모습까지) ────────────
  const rot = c => (((c * 73) % 13) - 6) * 1.4;           // 버린 카드 기울기 (카드마다 늘 같게)
  function render(ses) {
    if (!ses || !ses.V || !GEO || SES !== ses) return;
    renderOpps(ses); renderCenter(ses); renderMine(ses); renderHand(ses); drawBar(ses);
    coachRender(ses);
  }
  function renderOpps(ses) {
    const V = ses.V, box = $('opps');
    const want = Object.keys(GEO.opp).map(Number);
    let html = '';
    const turnP = V.phase === 'end' ? -1 : V.phase === 'call' ? V.call.p : (ses.actor != null ? ses.actor : V.turn);
    const nextP = V.phase === 'play' || V.phase === 'call' ? G.nextActive(V, V.turn, 1) : -1;
    const watch = !!(ses.cfg.watch || ses.replaying);
    for (const q of want) {
      const pos = GEO.opp[q], st = ses.seats[q] || { name: '?', em: '?' }, h = V.hands[q], k = h.length;
      let fan = '';
      if (V.out[q] === 0 && k) {
        if (watch) {
          const m = Math.min(k, 12), stp = Math.min(13, (GEO.chipW - 27) / Math.max(1, m - 1)), w = 27 + stp * (m - 1);
          fan = `<div class="fan face" style="width:${w}px">${h.slice(0, m).map((c, i) => `<span class="mc" style="left:${i * stp}px">${ART.face(c)}</span>`).join('')}<span class="cnt">${k}</span></div>`;
        } else {
          const m = Math.min(k, 9), stp = Math.min(9, (GEO.chipW - 30) / Math.max(1, m - 1)), w = 20 + stp * (m - 1);
          fan = `<div class="fan" style="width:${w}px">${Array.from({ length: m }, (_, i) => `<span class="mc" style="left:${i * stp}px;transform:rotate(${(i - (m - 1) / 2) * 3}deg)">${ART.back()}</span>`).join('')}<span class="cnt">${k}</span></div>`;
        }
      }
      // 빠진 자리: 손패 자리에 '파산' · '몇 등' 표 (이름표 안에 넣으면 이름이 잘림)
      const status = V.out[q] === 2 ? '<span class="st">💥 파산</span>' : V.out[q] === 1 ? `<span class="st win">🏅 ${V.order.indexOf(q) + 1}등</span>` : '';
      if (!fan) fan = `<div class="fan${status ? ' outst' : ''}">${status}</div>`;
      const cls = ['opp', q === turnP ? 'turn' : '', q === nextP && q !== turnP ? 'next' : '', V.out[q] ? 'out' : '', ses.busy === q ? 'busy' : ''].filter(Boolean).join(' ');
      html += `<div class="${cls}" data-p="${q}" style="left:${pos.x.toFixed(1)}px;top:${pos.y.toFixed(1)}px;width:${GEO.chipW}px">${fan}<div class="tag"><span class="av">${esc(st.em)}</span><span class="nm">${esc(st.name)}${st.sub ? '🤖' : ''}</span></div>${k === 1 && V.out[q] === 0 ? '<span class="one" aria-label="한 장">☝️</span>' : ''}</div>`;
    }
    box.innerHTML = html;
  }
  function renderCenter(ses) {
    const V = ses.V, R = V.rules;
    // 더미
    const dn = V.deck.length, dp = $('drawPile');
    const layers = Math.min(3, Math.ceil(dn / 12));
    dp.innerHTML = `<span class="stk">${Array.from({ length: layers }, (_, i) => `<span style="position:absolute;inset:0;transform:translate(${-i * 1.5}px,${-i * 2}px)">${ART.back()}</span>`).join('')}</span><span class="deckn" id="deckN">${dn ? `더미 ${dn}` : '비었음'}</span>`;
    dp.classList.toggle('can', myTurnNow(ses));
    // 버린 더미 (맨 위 세 장)
    const top = V.pile.slice(-3);
    let h = top.map((c, i) => `<div class="pc" style="transform:rotate(${i === top.length - 1 ? rot(c) * 0.4 : rot(c)}deg) translate(${(i - top.length + 1) * 3}px,${(i - top.length + 1) * 2}px)">${ART.face(c)}</div>`).join('');
    const tc = V.pile[V.pile.length - 1];
    if (V.suit >= 0 && tc != null && V.suit !== G.suitOf(tc)) h += `<span class="suitover" title="바뀐 무늬">${ART.pip(V.suit)}</span>`;
    else if (V.suit < 0 && tc != null && G.isJoker(tc)) h += `<span class="suitover any">아무<br>거나</span>`;
    $('discard').innerHTML = h;
    // 방향
    const ring = $('ring');
    ring.classList.toggle('ccw', V.dir < 0);
    // 공격 · 무늬 줄
    let st = '';
    if (V.phase !== 'end') {
      if (V.atk > 0) { const tgt = V.phase === 'call' ? G.nextActive(V, V.call.p, V.call.k === 0 ? 1 : V.call.k) : V.turn; st += `<span class="atk${tgt === meSeat(ses) ? ' me' : ''}">💥 +${V.atk} ${tgt === meSeat(ses) && !ses.hot ? '받을 차례!' : `→ ${esc(nameOf(ses, tgt))}`}</span>`; }
      else if (V.suit >= 0 && tc != null && V.suit !== G.suitOf(tc)) st += `<span class="su">무늬 ${ART.pip(V.suit)} 로 바뀜</span>`;
      if (R.counter !== 'off' && V.atk > 0 && V.atkStr) st += `<span class="nx">받아치기: ${R.counter === 'stronger' ? `+${V.atkStr} 이상` : R.counter === 'same' ? '같은 숫자' : '공격 카드'}</span>`;
    }
    $('tState').innerHTML = st;
  }
  function renderMine(ses) {
    const V = ses.V, b = bottomSeat(ses), st = ses.seats[b] || { name: '?', em: '?' }, el = $('mySeat');
    const k = V.hands[b].length, me = meSeat(ses);
    const turnP = V.phase === 'end' ? -1 : V.phase === 'call' ? V.call.p : (ses.actor != null ? ses.actor : V.turn);
    el.classList.toggle('turn', turnP === b);
    const status = V.out[b] === 2 ? '<span class="st">💥 파산</span>' : V.out[b] === 1 ? `<span class="st win">🏅 ${V.order.indexOf(b) + 1}등</span>` : `<span class="cnt">${k}장</span>`;
    let act = '';
    if (myTurnNow(ses) && b === me) {
      const R = V.rules;
      if (R.oneCard && k === 2) act += `<button class="arm" type="button" id="armBtn" aria-pressed="${!!ses.armed}">${ses.armed ? '☝️ 준비됨' : '☝️ 원카드 준비'}</button>`;
      act += `<button class="act${V.atk > 0 ? ' hurt' : ''}" type="button" id="drawAct">${V.atk > 0 ? `😵 ${V.atk}장 받기` : '🃏 한 장 먹기'}</button>`;
    }
    const nm = ses.cfg.watch || ses.replaying ? st.name : b === me && !ses.hot ? '나' : st.name;
    const html = `<span class="tag"><span class="av">${esc(ses.cfg.watch || ses.replaying || ses.hot ? st.em : '나')}</span><span class="nm">${esc(nm)}</span>${status}${k === 1 && V.out[b] === 0 ? '<span class="one">☝️</span>' : ''}</span>${act}`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; }          // 같으면 그대로 (누르는 중인 단추가 바뀌지 않게)
  }
  const HEL = new Map();                                   // 손패 카드 요소 (카드 번호 → 요소)
  function handLayout(ses, cards) {
    const H = GEO.hand, n = cards.length, rows = n > 14 ? 2 : 1, sc = rows === 2 ? 0.8 : 1;
    const cw = H.cw * sc, ch = cw * 1.5, out = [];
    const split = rows === 2 ? Math.ceil(n / 2) : n;
    const rowsArr = rows === 2 ? [cards.slice(0, split), cards.slice(split)] : [cards];
    rowsArr.forEach((row, ri) => {
      const m = row.length, tilt = Math.min(2.4, 20 / Math.max(1, m)), half = (m - 1) / 2, k = rows === 2 ? 0.25 : 0.6;
      // 양 끝 카드는 아래 가운데를 축으로 기울어 위 모서리(숫자 자리)가 바깥으로 나감 → 그만큼 안쪽으로
      const over = Math.max(0, ch * Math.sin(tilt * half * Math.PI / 180) - cw / 2 * (1 - Math.cos(tilt * half * Math.PI / 180)));
      const step = m > 1 ? Math.min(cw * 0.66, (H.w - 10 - 2 * over - cw) / (m - 1)) : 0;
      const x0 = H.x + (H.w - (step * (m - 1) + cw)) / 2, baseY = H.y + H.h - 7 - (rows === 2 && ri === 0 ? ch * 0.42 : 0);
      row.forEach((c, i) => {
        const off = i - half;
        out.push({ c, x: x0 + i * step + cw / 2, y: baseY - (half * half - off * off) * k, r: off * tilt, s: cw / 100, z: (ri * 100) + i + 10 });
      });
    });
    return out;
  }
  function renderHand(ses) {
    const V = ses.V, b = bottomSeat(ses), box = $('hand');
    const show = faceUp(ses, b), cards = V.out[b] === 0 ? V.hands[b] : [];
    const mine = myTurnNow(ses) && b === meSeat(ses);
    const coach = mine ? getCoach(ses) : null, hint = coach && coach.card >= 0 && ses.sel < 0 ? coach.card : -1;
    const pos = handLayout(ses, cards);
    const keep = new Set();
    box.classList.toggle('hidden', !show);
    for (const p of pos) {
      const key = show ? p.c : 'b' + p.c;
      keep.add(key);
      let el = HEL.get(key);
      if (!el) {
        el = document.createElement('div'); el.className = 'ocard'; el.dataset.c = p.c;
        el.innerHTML = show ? ART.face(p.c) + atag(V.rules, p.c) : ART.back();
        el.style.transition = 'none';
        box.appendChild(el); HEL.set(key, el);
        el._new = true;
      }
      const can = mine && G.canPlay(V, p.c);
      const lift = !show ? 0 : p.c === ses.sel ? GEO.hand.lift : can ? GEO.hand.lift * 0.45 : 0;
      el.style.transform = `translate(${(p.x - 50).toFixed(1)}px,${(p.y - 150 - lift).toFixed(1)}px) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
      el.style.zIndex = p.c === ses.sel ? 200 : p.z;
      el.classList.toggle('can', can && p.c !== ses.sel);
      el.classList.toggle('dim', mine && !can);
      el.classList.toggle('sel', show && p.c === ses.sel);
      el.classList.toggle('hint', p.c === hint);
      if (el._new) { void el.offsetWidth; el.style.transition = ''; el._new = false; }
    }
    for (const [k, el] of HEL) if (!keep.has(k)) { el.remove(); HEL.delete(k); }
  }
  function atag(R, c) {
    const st = G.atkOf(c, R);
    if (st > 0) return `<span class="atag">+${st}</span>`;
    const r = G.rankOf(c);
    if (r === G.R_7 && R.seven) return '<span class="atag sp">🎨</span>';
    if (r === G.R_J && R.jSkip) return '<span class="atag sp">⏭</span>';
    if (r === G.R_Q && R.qRev) return '<span class="atag sp">🔄</span>';
    if (r === G.R_K && R.kAgain) return '<span class="atag sp">➕</span>';
    if (r === G.R_3 && R.block3) return '<span class="atag sp">🛡</span>';
    return '';
  }
  // 위 줄 · 점수판 · 칩
  function drawBar(ses) {
    if (!ses || SES !== ses) return;
    const s = ses.S, V = ses.V || s; if (!s) return;
    const me = meSeat(ses);
    let sub = '';
    const turnP = s.phase === 'call' ? s.call.p : s.turn;
    if (s.phase === 'end') sub = '판 끝';
    else if (ses.actor != null) sub = `${nameOf(ses, ses.actor)}${ses.actor === me && !ses.hot ? '' : ''} 차례`;
    else if (s.phase === 'call') sub = `☝️ ${nameOf(ses, s.call.p)} 한 장!`;
    else if (turnP === me && !ses.hide && ses.pending) sub = s.phase === 'suit' ? '무늬를 골라요' : s.atk > 0 ? `+${s.atk} 받아칠까요?` : '내 차례 · 카드를 골라요';
    else sub = `${nameOf(ses, turnP)} 차례`;
    const myT = myTurnNow(ses);
    $('sub').textContent = `${ses.turnLeft != null && turnP === me ? `⏱${ses.turnLeft} · ` : ''}${s.round}판 · ${sub}`;   // 남은 초는 앞에 (좁은 화면에서 잘려도 보이게)
    $('sub').classList.toggle('myturn', myT && !(s.atk > 0));
    $('sub').classList.toggle('hurt', myT && s.atk > 0);
    // 점수판 한 줄
    const turnSeat = s.phase === 'end' ? -1 : (ses.actor != null ? ses.actor : turnP);
    $('scoreBar').hidden = !!ses.replaying;
    $('scoreBar').innerHTML = ses.seats.map((x, i) => {
      const W = (ses.score && ses.score.w[i]) || 0, L = (ses.score && ses.score.l[i]) || 0, ch = ses.chips && ses.chips[i], money = ch == null ? '' : ses.chipWon ? fmtN(Math.round(ch * ses.chipWon)) + '원' : '🪙' + fmtN(ch);
      const nm = i === me && !ses.cfg.watch && !ses.hot ? '나' : x.name;
      return `<span class="sbi${i === turnSeat ? ' on' : ''}${V.out && V.out[i] ? ' rest' : ''}"><b>${esc(nm)}</b> ${W}승${L}패${money ? ' ' + money : ''}</span>`;
    }).join('') + (() => {
      const pl = ses.cfg.online && ses.net && ses.net.players; if (!pl) return '';
      const n = Object.keys(pl).filter(u => !ses.seats.some(x => x.uid === u)).length;
      return n ? `<span class="sbi">👀 구경 ${n}</span>` : '';
    })();
    const i = ses.cfg.online ? ses.cfg.me : -1;
    $('coinPill').textContent = i >= 0 && ses.chips && ses.chips[i] != null ? (ses.chipWon ? '💰 ' + fmtN(Math.round(ses.chips[i] * ses.chipWon)) + '원' : '🪙 ' + fmtN(ses.chips[i]) + '칩') : '🪙 ' + fmtN(coins);
    if (myT && ses.turnBell !== ses.seq) { ses.turnBell = ses.seq; if (ses.cfg.online || ses.hot) { sfx('pop'); buzz(40); } }
  }
  function setLabel(ses) {
    const n = ses.seats.length;
    if (ses.cfg.watch) $('lbl').textContent = '🍿 AI 구경';
    else if (ses.hot) $('lbl').textContent = `📱 한 기기 ${n}명`;
    else if (ses.cfg.online) $('lbl').textContent = `👥 친구랑 ${n}명 (${ses.net.code})`;
    else if (ses.isDrill) $('lbl').textContent = `🎮 복기 연습 · ${n}명`;
    else { const ai = ses.seats.find(x => x.ctrl === 'ai' && TIER[x.tier]) || ses.seats[1], t = TIER[ai && ai.tier] || TIER.normal; $('lbl').textContent = `☝️ ${n}명 · ${t.em} ${t.name}`; }
  }

  addEventListener('resize', onResize);
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('stage'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  let rsT = 0, lastWH = '';
  function onResize() {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      if (!SES || !SES.V || $('play').hidden) return;
      const st = $('stage'), wh = st.clientWidth + 'x' + st.clientHeight;
      if (wh === lastWH) return;
      lastWH = wh; layout(SES); render(SES);
    }, 50);
  }

  // ── 움직임 ─────────────────────────────────────────────
  // 카드 한 장 날리기: from/to = { x, y (가운데), w (카드 너비) }
  function fly(html, from, to, o) {
    o = o || {};
    const lay = $('fly'), el = document.createElement('div');
    el.className = 'flyc'; el.innerHTML = html;
    lay.appendChild(el);
    const T = (p, r, sc) => `translate(${(p.x - 50).toFixed(1)}px,${(p.y - 75).toFixed(1)}px) rotate(${r || 0}deg) scale(${sc.toFixed(4)})`;
    const s0 = from.w / 100, s1 = to.w / 100, mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - (o.arc || 30) };
    el.style.transform = T(to, o.r1 || 0, s1);
    const dur = o.dur || D(320);
    let a;
    try { a = el.animate([{ transform: T(from, o.r0 || 0, s0) }, { transform: T(mid, ((o.r0 || 0) + (o.r1 || 0)) / 2, Math.max(s0, s1) * 1.12), offset: 0.5 }, { transform: T(to, o.r1 || 0, s1) }], { duration: dur, delay: o.delay || 0, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'backwards' }); } catch (e) { el.remove(); return Promise.resolve(); }
    return a.finished.then(() => el.remove(), () => el.remove());
  }
  const rectOf = el => { const r = el.getBoundingClientRect(), s = $('stage').getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, w: r.width, h: r.height }; };
  // 자리 p 의 카드가 날아오는/가는 곳
  function seatPoint(ses, p, c) {
    if (p === bottomSeat(ses)) {
      const el = c != null && (HEL.get(c) || HEL.get('b' + c));
      if (el) { const r = rectOf(el); return { x: r.x, y: r.y, w: GEO.hand.cw }; }
      return { x: GEO.W / 2, y: GEO.hand.y + GEO.hand.ch / 2, w: GEO.hand.cw };
    }
    const o = GEO.opp[p]; return o ? { x: o.x, y: o.y - 10, w: 26 } : { x: GEO.cx, y: 0, w: 26 };
  }
  const discPoint = () => ({ x: GEO.disc.x + GEO.pw / 2, y: GEO.disc.y + GEO.ph / 2, w: GEO.pw });
  const drawPoint = () => ({ x: GEO.draw.x + GEO.pw / 2, y: GEO.draw.y + GEO.ph / 2, w: GEO.pw });

  // 큰 글씨 알림 (차례대로)
  let popQ = Promise.resolve();
  function popup(text, cls, sub) {
    const p = popQ.then(() => new Promise(res => {
      const d = $('pop');
      d.className = 'combo ' + (cls || '');
      d.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
      d.hidden = false;
      void d.offsetWidth; d.classList.add('go');
      clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, 1100);
      setTimeout(res, FAST ? 0 : 420);
    }));
    popQ = p;
    return p;
  }
  C.sfx.add('atk', (t, o, S) => { S.noise(t, 0.22, { vol: 0.35, type: 'bandpass', f: 600, f2: 2600, q: 0.8 }); S.tone(t + 0.05, 160, 0.25, { type: 'sawtooth', vol: 0.08, f2: 80 }); });
  C.sfx.add('call', (t, o, S) => { S.tone(t, 1318.5, 0.35, { type: 'triangle', vol: 0.16 }); S.tone(t + 0.09, 1975.5, 0.45, { type: 'sine', vol: 0.12 }); });
  C.sfx.add('catch', (t, o, S) => { S.tone(t, 330, 0.12, { type: 'square', vol: 0.07 }); S.tone(t + 0.12, 247, 0.22, { type: 'square', vol: 0.07 }); });
  C.sfx.add('shuffle', (t, o, S) => { for (let i = 0; i < 6; i++) S.noise(t + i * 0.045, 0.04, { vol: 0.22, type: 'highpass', f: 2600 }); });

  // ── 한 판 진행 ───────────────────────────────────────────
  async function playRound(ses, s) {
    ses.S = s; ses.V = G.fastClone(s); ses.sel = -1; ses.armed = false; ses.resCounted = false; ses.coachCache = null; ses.busy = -1;
    ses.rec = ses.isDrill ? null : { at: Date.now(), start: G.fastClone(s), acts: [], seats: ses.seats.map((x, i) => ({ name: i === ses.cfg.me && !ses.cfg.watch && !ses.hot ? '나' : x.name, em: x.em })) };
    if (ses.hot) ses.hide = true;
    $('resBox').hidden = true; $('callZone').hidden = true;
    HEL.forEach(el => el.remove()); HEL.clear();
    setLabel(ses);
    layout(ses);
    lastWH = $('stage').clientWidth + 'x' + $('stage').clientHeight;
    if (ses.isDrill) { render(ses); C.toast(ses.drillMsg || '🎮 복기 장면부터 이어서 해요', 2600); ses.drillMsg = null; }   // 🎮 복기에서 '여기서부터 내가 두기': 나누기 없이 그 장면 그대로
    else if (ses.resume) { ses.resume = false; render(ses); C.toast('방장 화면과 맞췄어요. 이어서 해요', 1800); }
    else await dealAnim(ses);
    if (!ses.hot && !ses.cfg.watch && !ses.cfg.online && !ses.isDrill && ses.S.round === 1) showHowto(false);
    while (ses.S.phase !== 'end') {
      await ses.ready();
      const S = ses.S, p = S.phase === 'call' ? S.call.p : S.turn;
      render(ses);
      let a;
      if (S.phase === 'call') {
        a = await callPhase(ses);
        if (ses.cfg.online && ses.cfg.role === 'host' && ses.net && ses.net.sendAct) ses.net.sendAct(a);
      } else {
        const ctrl = ses.seats[p].ctrl;
        if (ctrl === 'me') {
          if (ses.hot) await hotAccept(ses, p);
          a = await humanTurn(ses);
          if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
        } else if (ctrl === 'remote') a = await remoteTurn(ses, p);
        else {
          ses.subThinking = !!ses.cfg.online;
          try { a = await aiTurn(ses, p); } finally { ses.subThinking = false; }
          if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
        }
      }
      ses.seq++;
      ses.check();
      if (!G.isLegal(ses.S, a)) { console.warn('[onecard] 할 수 없는 수', a, ses.S.phase); a = G.legal(ses.S).indexOf(G.A_DRAW) >= 0 ? G.A_DRAW : G.legal(ses.S)[0]; }
      const { state, events } = G.step(ses.S, a);
      ses.S = state; if (ses.rec) ses.rec.acts.push(a);
      ses.actor = p;
      try { await playEvents(ses, events); } finally { ses.actor = null; }
      ses.check();
      ses.V = G.fastClone(ses.S);
      if (ses.hot && !ses.hide) {
        const st = ses.S, nx = st.phase === 'call' ? st.call.p : st.turn;
        const keep = st.phase !== 'end' && ses.seats[nx].ctrl === 'me' && nx === ses.hotLast;
        if (!keep) ses.hide = true;
      }
      render(ses);
    }
    render(ses);
    if (ses.rec) saveReplay(ses.rec, ses.S);
  }

  // 나누기: 더미에서 한 장씩 (선부터), 마지막에 시작 카드 뒤집기
  async function dealAnim(ses) {
    const S = ses.S, V = ses.V, n = S.n, per = Math.max(...S.hands.map(h => h.length));
    V.hands = S.hands.map(() => []);
    const deckAll = S.deck.length + S.pile.length + S.hands.reduce((a, h) => a + h.length, 0);
    V.deck = new Array(deckAll).fill(-1); V.pile = [];
    render(ses);
    if (FAST) { ses.V = G.fastClone(S); render(ses); return; }
    const stagger = D(n > 5 ? 22 : 34), ps = [];
    let k = 0;
    for (let r = 0; r < per; r++) for (let i = 0; i < n; i++) {
      const p = (S.first + i) % n, c = S.hands[p][r];
      if (c == null) continue;
      const t = k++ * stagger;
      ps.push(ses.wait(t).then(() => {
        V.deck.pop(); V.hands[p].push(c); G.sortHand(V.hands[p]);
        if (k % 3 === 0) sfx('flip');
        const to = seatPoint(ses, p, null);
        const f = fly(ART.back(), drawPoint(), to, { dur: D(260), arc: 14 });
        renderCenter(ses);
        return f.then(() => { if (ses.alive) { renderOpps(ses); renderMine(ses); renderHand(ses); } });
      }));
    }
    await Promise.all(ps);
    ses.check();
    // 시작 카드
    const top = S.pile[S.pile.length - 1];
    V.deck.pop();
    await fly(ART.face(top), drawPoint(), discPoint(), { dur: D(320), arc: 24 });
    sfx('slap');
    ses.V = G.fastClone(S); render(ses);
    await ses.wait(D(200));
  }

  // ── 이벤트 → 움직임 · 소리 · 알림 ──────────────────────────────
  async function playEvents(ses, evs) {
    const V = ses.V;
    for (const e of evs) {
      ses.check();
      await ses.ready();
      switch (e.t) {
        case 'play': {
          const from = seatPoint(ses, e.p, e.c);
          const h = V.hands[e.p]; const i = h.indexOf(e.c); if (i >= 0) h.splice(i, 1);
          if (e.p === bottomSeat(ses)) { const el = HEL.get(e.c) || HEL.get('b' + e.c); if (el) { el.remove(); HEL.delete(e.c); HEL.delete('b' + e.c); } }
          ses.sel = -1;
          renderOpps(ses); renderHand(ses); renderMine(ses);
          await fly(ART.face(e.c), from, discPoint(), { dur: D(300), arc: 34, r0: 0, r1: rot(e.c) * 0.4 });
          V.pile.push(e.c); V.suit = G.suitOf(e.c); V.rank = G.rankOf(e.c);
          sfx('slap'); buzz(8);
          renderCenter(ses);
          break;
        }
        case 'attack': case 'counter': {
          V.atk = e.total; V.atkStr = e.add; if (G.isJoker(e.c)) { V.suit = -1; V.rank = -1; }
          sfx('atk'); buzz([15, 30, 15]);
          renderCenter(ses);
          await popup(e.t === 'counter' ? `받아치기! +${e.total}` : `+${e.add} 공격!`, 'red', `${nameOf(ses, e.p)} → ${nameOf(ses, G.nextActive(V, e.p, 1))}`);
          break;
        }
        case 'block': V.atk = 0; V.atkStr = 0; sfx('good'); renderCenter(ses); await popup('🛡️ 막았다!', 'mint', `${nameOf(ses, e.p)} · 3 으로 ${e.n}장 공격을 막아요`); break;
        case 'skip': sfx('whoosh'); await popup('⏭ 건너뛰기', 'blue', `${nameOf(ses, e.skipped)} 쉬어요`); break;
        case 'reverse': {
          V.dir = e.dir; sfx('whoosh');
          const ring = $('ring'); ring.classList.remove('flip'); void ring.getBoundingClientRect(); ring.classList.add('flip');
          renderCenter(ses);
          await popup(e.asSkip ? '🔄 한 번 더!' : '🔄 방향 바꾸기', 'blue', e.asSkip ? '둘이라 건너뛰기와 같아요' : (e.dir > 0 ? '시계 방향으로' : '반대 방향으로'));
          break;
        }
        case 'again': sfx('good'); await popup('➕ 한 장 더!', 'gold', nameOf(ses, e.p)); break;
        case 'pickSuit': break;
        case 'suit': V.suit = e.suit; V.rank = G.R_7; sfx('pop'); renderCenter(ses); await popup(`무늬 ${SYM[e.suit]} 로!`, 'gold', `${iga(nameOf(ses, e.p))} 정했어요`); break;
        case 'draw': {
          const n = e.cards.length, to = seatPoint(ses, e.p, null);
          if (e.why === 'attack' || e.why === 'penalty') { sfx(e.why === 'attack' ? 'bad' : 'catch'); buzz(30); }
          const shown = Math.min(n, 8), ps = [];
          for (let i = 0; i < shown; i++) ps.push(fly(e.p === bottomSeat(ses) && faceUp(ses, e.p) ? ART.face(e.cards[i]) : ART.back(), drawPoint(), to, { dur: D(280), delay: i * D(55), arc: 18 }));
          if (n > 1 || e.why !== 'draw') popup(e.why === 'attack' ? `😵 ${n}장 받기` : e.why === 'penalty' ? `벌칙 ${n}장` : `${n}장`, e.why === 'draw' ? 'blue' : 'red', nameOf(ses, e.p));
          else sfx('flip');
          V.deck.splice(0, n);
          renderCenter(ses);
          await Promise.all(ps);
          if (e.why === 'attack') { V.atk = 0; V.atkStr = 0; }
          for (const c of e.cards) V.hands[e.p].push(c);
          G.sortHand(V.hands[e.p]);
          renderOpps(ses); renderMine(ses); renderHand(ses); renderCenter(ses);
          if (n > 1) await ses.wait(D(160));
          break;
        }
        case 'reshuffle': {
          sfx('shuffle');
          const top = V.pile[V.pile.length - 1];
          V.deck = new Array(e.n + V.deck.length).fill(-1); V.pile = [top];
          renderCenter(ses);
          C.toast(`🔀 버린 카드 ${e.n}장을 섞어 더미로`, 1400);
          await ses.wait(D(300));
          break;
        }
        case 'callOpen': break;
        case 'call': sfx('call'); await popup('☝️ 원카드!', 'gold', nameOf(ses, e.p)); break;
        case 'caught': sfx('catch'); await popup('🫵 잡았다!', 'red', `${nameOf(ses, e.by)} → ${nameOf(ses, e.p)} ${e.n}장`); break;
        case 'miss': sfx('bad'); await popup('⏰ 늦었어요!', 'sad', `${nameOf(ses, e.p)} ${e.n}장`); break;
        case 'bust': {
          V.out[e.p] = 2; const back = V.hands[e.p].length; V.hands[e.p] = []; V.deck = V.deck.concat(new Array(back).fill(-1));
          sfx('lose'); buzz([30, 40, 30]);
          renderOpps(ses); renderMine(ses); renderHand(ses); renderCenter(ses);
          await popup('💥 파산!', 'sad', `${nameOf(ses, e.p)} ${e.n}장`);
          break;
        }
        case 'out': V.out[e.p] = 1; V.order.push(e.p); sfx('win'); renderOpps(ses); renderMine(ses); if (ses.S.rules.rankAll) await popup(`🏅 ${e.place}등!`, 'gold', nameOf(ses, e.p)); break;
        case 'turn': V.turn = e.p; break;
        case 'end': break;
      }
    }
  }

  // ── 🎞️ 다시 보기: 이 기기에 지난 판 10개까지 ─────────────
  const RKEY = KEY + 'replays';
  function saveReplay(rec, end) {
    const r = end && end.result;
    const wname = r && r.winner >= 0 ? (rec.seats[r.winner] || {}).name || '?' : '';
    rec.title = r ? `${wname === '나' ? '내가' : iga(wname)} 이겼어요` : '';
    rec.mode = `${end.n}명`;
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
      html: `<p class="small" style="margin:0 0 8px">이 기기에서 한 판 ${list.length}개 (최근 10개까지). 다시 보기에서는 모두의 카드가 보여요.</p><div class="rplist">${list.map((x, i) => `<button class="btn" data-i="${i}"><b>${esc(x.title || '판')}</b><span class="small">${fmtAt(x.at)} · ${esc(x.mode || '')} · ${x.seats.slice(0, 6).map(q => esc(q.name)).join(', ')}</span></button>`).join('')}</div>`,
      buttons: [{ label: '닫기' }], dismiss: true,
    });
    document.querySelectorAll('.rplist [data-i]').forEach(b => b.onclick = () => { sfx('tap'); close(); startReplay(list[+b.dataset.i]); });
  }
  function startReplay(rec) {
    if (SES) SES.dispose();
    const ses = SES = newSession({ watch: true, replay: true, N: rec.start.n, rules: rec.start.rules, me: -1 });
    ses.seats = rec.seats.map(x => ({ ctrl: 'remote', tier: null, name: x.name, em: x.em }));
    show('play'); drawDock();
    runReplay(ses, rec, false).then(() => { if (SES === ses) goHome(); }, e => { if (!(e instanceof Cancel)) { console.error(e); if (SES === ses) goHome(); } });
  }
  // 🎮 복기 → '여기서부터 내가 두기': k 수째 장면(같은 손패·같은 더미)에서 seat 자리를 내가, 나머지는 AI 가 이어서. 선생님은 켜고 시작 (단추로 끔), 냥·전적·칩에는 안 넣음
  function startBranch(rec, k, seat) {
    let st = G.fastClone(rec.start);
    for (let j = 0; j < k; j++) st = G.step(st, rec.acts[j]).state;
    if (st.phase === 'end') return C.toast('이미 끝난 장면이에요. 앞으로 돌아가서 눌러 주세요');
    if (SES) SES.dispose();
    const cfg = { watch: false, N: rec.start.n, rules: rec.start.rules, seed: 0, me: seat, initState: st, branch: true };
    const ses = SES = newSession(cfg);
    const tier = TIER[opt.tier] ? opt.tier : 'normal';
    ses.seats = rec.seats.map((x, i) => (i === seat ? { ctrl: 'me', tier: null, name: '나', em: '나' } : { ctrl: 'ai', tier, name: x.name === '나' ? '그때의 나' : x.name, em: x.em === '나' ? '🙂' : x.em }));
    ses.isDrill = true;
    ses.drillMsg = `🎮 ${k}수째 장면부터 내가 둬요 — 🧑‍🏫 선생님을 켜고 끄며 해 보세요`;
    ses.coachOn = true;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }
  // 다시 두기: 처음 ⏮ · 한 수 ◀ ▶ · 재생/멈춤. inline = 결과 창에서 (끝나면 결과로 돌아감)
  //   위 줄: 🧑‍🏫 선생님(이 장면 그 차례 사람 눈으로 본 추천 vs 실제로 한 수) · 🎮 여기서부터 내가 두기
  async function runReplay(ses, rec, inline) {
    const keep = { watch: ses.cfg.watch, S: ses.S, seats: ses.seats, hide: ses.hide };
    const acts = rec.acts || [];
    const at = k => { let st = G.fastClone(rec.start); for (let j = 0; j < k; j++) st = G.step(st, acts[j]).state; return st; };
    ses.cfg.watch = true; ses.hide = false; ses.replaying = true;
    ses.seats = rec.seats.map(x => ({ ctrl: 'remote', tier: null, name: x.name, em: x.em }));
    ses.S = G.fastClone(rec.start); ses.V = G.fastClone(ses.S);
    $('resBox').hidden = true; $('pop').hidden = true; $('callZone').hidden = true;
    HEL.forEach(el => el.remove()); HEL.clear();
    const canBranch = !ses.cfg.online;                       // 친구 방 결과 창에서는 방을 떠나게 되니 안 보임 (지난 판 목록에서는 됨)
    const rg = document.createElement('div'); rg.className = 'rpgo';
    rg.innerHTML = `<button data-rg="coach" aria-pressed="false">🧑‍🏫 선생님</button>${canBranch ? '<button data-rg="branch" class="br">🎮 여기서부터 내가 두기</button>' : ''}`;
    $('scoreBar').after(rg);                                 // 점수판 자리에 (다시 보기에선 점수판을 감춤) — 카드·다시 보기 줄을 안 가림
    layout(ses); $('lbl').textContent = '🎞️ 다시 보기'; drawDock(); render(ses);
    let i = 0;
    const rp = { cmd: null, play: true };
    const bar = document.createElement('div'); bar.className = 'rpbar'; bar.id = 'rpBar';
    bar.innerHTML = `<button data-rp="start" aria-label="처음으로">⏮</button><button data-rp="prev" aria-label="한 수 뒤로">◀</button><button data-rp="play" class="pp" aria-label="재생 · 멈춤"></button><button data-rp="next" aria-label="한 수 앞으로">▶</button><span class="rpn"></span><button data-rp="exit" class="rpx">${inline ? '결과로' : '닫기'}</button>`;
    $('play').appendChild(bar);
    const draw = () => { bar.querySelector('.pp').textContent = rp.play ? '⏸' : '⏵'; bar.querySelector('.rpn').textContent = `${i} / ${acts.length}수`; rpCoach(); };
    // 🧑‍🏫 복기 선생님: 카드를 내는 장면마다 '그 차례 사람 눈에 보이던 카드'만으로 낸 추천 vs 실제로 한 수 (다른 사람 손패는 안 봄)
    let rpPanel = null, rpOn = false;
    const coachMap = new Map();                              // 장면 번호 → 추천 (같은 장면은 다시 안 셈)
    const seatNm = p => (rec.seats[p] || {}).name || '?';
    const actText = (st, a) => (a < G.A_DRAW ? `[${G.cardName(a - G.A_PLAY)}]` : a === G.A_DRAW ? (st.atk > 0 ? `${st.atk}장 받기` : '한 장 먹기') : a < G.A_CALL ? `무늬 ${SYM[a - G.A_SUIT]} ${G.SUIT_NAME[a - G.A_SUIT]}` : a === G.A_CALL ? '☝️ 원카드 외침' : a < G.A_MISS ? `🫵 ${seatNm(a - G.A_CATCH)} 잡았다!` : '⏰ 아무도 안 눌러서 시간 지남');
    function coachFor(k, st, p) {
      let ent = coachMap.get(k);
      if (!ent) {
        const v = G.view(st, p);
        ent = { data: AI.coach(v) }; coachMap.set(k, ent);
        if (!FAST && ent.data && st.phase === 'play') coachMC(v, k + 1).then(d => {   // 바로 보여 주고, 일꾼이 끝까지 둬 본 결과가 더 낫다고 하면 바꿈 (실제 판 선생님과 같은 길)
          if (!d || !ses.alive || !rpOn) return;
          const nd = AI.coach(v, { mc: d, minN: 60 });
          if (nd && nd.a !== ent.data.a) { ent.data = nd; if (i === k) rpCoach(); }
        });
      }
      return ent.data;
    }
    function rpCoach() {
      if (!rpOn || !rpPanel) return;
      const st = ses.S, a = acts[i];
      let html = '<span class="small">카드를 내는 장면마다 선생님 추천을 보여 드려요 (▶ 로 한 수씩) — 그 차례 사람 눈에 보이던 카드만 보고 골라요</span>';
      if (st.phase === 'end' || i >= acts.length) html = '<span class="small">끝난 장면이에요 — ◀ 로 돌아가 보세요</span>';
      else {
        const p = st.phase === 'call' ? st.call.p : st.turn, who = `<b>${esc(seatNm(p))}</b> 차례`, c = st.phase === 'call' ? null : coachFor(i, st, p);
        if (st.phase === 'call') html = `<b>${esc(seatNm(p))}</b> 한 장 남음 · ☝️ 외치기 시간 — 누가 먼저 누르는지 겨루는 거라 추천은 없어요<br>실제: <b>${esc(actText(st, a))}</b>`;
        else if (c && st.phase === 'suit') {
          html = `${who} · 7 무늬 고르기 · <span class="cb-tag">👑 추천</span> <b>${esc(c.name)}</b> — ${esc(c.why)}<br>` + (a === c.a ? '👍 실제로도 추천대로 골랐어요' : `실제: <b>${esc(actText(st, a))}</b>`);
        } else if (c) {
          const info = a >= G.A_PLAY && a < G.A_DRAW ? c.byCard[a - G.A_PLAY] : null, sug = c.card >= 0 && c.byCard[c.card] && c.byCard[c.card].suit != null ? ` → ${SYM[c.byCard[c.card].suit]}` : '';
          html = `${who} · <span class="cb-tag">👑 추천</span> <b>${c.card >= 0 ? '[' + esc(c.name) + ']' : esc(c.name)}</b>${sug} — ${esc(c.why)}<br>`
            + (a === c.a ? '👍 실제로도 추천대로 했어요' : `실제로 한 수: <b>${esc(actText(st, a))}</b>${info ? (c.tag === '끝까지 둬 봄' ? '' : ` <span class="small">(선생님 순위 ${info.rank + 1}/${Object.keys(c.byCard).length + 1})</span>`)
              + `<br><span class="small">🤔 노린 것: ${esc(info.tag || '')} — ${esc(info.why)}${info.rank >= 2 && info.rank * 2 >= Object.keys(c.byCard).length ? ' · 순위가 낮아 노림수보다는 실수였을 수 있어요' : ''}</span>`
              : a === G.A_DRAW && c.card >= 0 ? ` — ${st.atk > 0 ? '받아칠' : '낼'} 수 있는 카드가 있었는데 먹었어요 <span class="small">(🤔 손에 쥐고 아끼려 했거나 놓친 수예요)</span>` : ''}`);
        }
      }
      rpPanel.set(html);
      if (!rpPanel.visible) rpPanel.show();
    }
    const pickSeat = st => new Promise(res => {
      const ok = rec.seats.map((x, k) => k).filter(k => st.out[k] === 0), mine = rec.seats.findIndex(x => x.name === '나'), cur = st.phase === 'call' ? st.call.p : st.turn;
      if (!ok.length) return res(-1);
      if (mine >= 0 && ok.indexOf(mine) >= 0) return res(mine);
      C.modal({ title: '🎮 어느 자리를 둘까요?', html: '<p class="small" style="margin:0">고른 자리는 내가, 나머지는 AI 가 이어서 둬요.</p>', dismiss: true,
        buttons: ok.map(k => ({ label: `${rec.seats[k].em && rec.seats[k].em !== '나' ? rec.seats[k].em + ' ' : ''}${rec.seats[k].name}${k === cur ? ' (지금 차례)' : ''}`, primary: k === cur, onClick: () => res(k) })), onClose: () => res(-1) });
    });
    rg.onclick = async e => {
      const b = e.target.closest('[data-rg]'); if (!b) return;
      sfx('tap');
      if (b.dataset.rg === 'coach') {
        rpOn = !rpOn; b.setAttribute('aria-pressed', String(rpOn)); b.classList.toggle('on', rpOn);
        if (rpOn && !rpPanel && window.CoachPanel) {
          // 복기 창은 따로 기억 — 처음엔 위 단추 줄 바로 아래 (단추·내 카드를 안 가림)
          try { if (!localStorage.getItem('game.coach.onecard-rp')) { const pw = Math.min(320, innerWidth * 0.86), t = Math.round(rg.getBoundingClientRect().bottom + 6); localStorage.setItem('game.coach.onecard-rp', JSON.stringify({ c: [Math.max(4, innerWidth - 56), t], p: [Math.max(4, Math.round((innerWidth - pw) / 2)), t], z: 0 })); } } catch (err) {}
          try { rpPanel = CoachPanel.create({ game: 'onecard-rp', title: 'AI 선생님 · 복기', startHidden: true }); } catch (err) { rpPanel = null; }
        }
        if (rpOn) { rpCoach(); if (rpPanel && rpPanel.collapsed) rpPanel.collapse(false); } else if (rpPanel) rpPanel.hide();
        return;
      }
      if (ses.S.phase === 'end' || i >= acts.length) return C.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요');
      rp.play = false; draw();
      const seat = await pickSeat(ses.S);
      if (seat < 0 || !ses.alive) return;
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
          const p = ses.S.phase === 'call' ? ses.S.call.p : ses.S.turn, { state, events } = G.step(ses.S, acts[i]);
          ses.S = state; i++; draw();
          ses.actor = p;
          try { await playEvents(ses, events); } finally { ses.actor = null; }
          ses.check();
          ses.V = G.fastClone(ses.S); render(ses);
          if (i >= acts.length) { rp.play = false; draw(); C.toast(rec.title ? '끝 — ' + rec.title : '끝까지 봤어요', 2200); }
          else if (rp.play) await ses.wait(D(300));
        } else {
          const k = cmd === 'start' ? 0 : Math.max(0, i - 1);
          ses.S = at(k); i = k; draw(); $('pop').hidden = true;
          ses.V = G.fastClone(ses.S); render(ses);
        }
      }
    } finally {
      bar.remove(); rg.remove(); ses.replaying = false;
      if (rpPanel) { try { rpPanel.destroy(); } catch (e) {} }
    }
    if (rp.branch) { startBranch(rec, rp.branch.k, rp.branch.seat); return; }
    if (inline && ses.alive) {
      ses.cfg.watch = keep.watch; ses.seats = keep.seats; ses.hide = keep.hide;
      ses.S = keep.S; ses.V = G.fastClone(keep.S);
      HEL.forEach(el => el.remove()); HEL.clear();
      setLabel(ses); layout(ses); drawDock(); render(ses);
    }
  }

  // 친구 수 기다리기
  function remoteTurn(ses, p) {
    for (const k of ses.acts.keys()) if (k < ses.seq) ses.acts.delete(k);
    if (ses.acts.has(ses.seq)) return Promise.resolve(ses.acts.get(ses.seq));
    setBusy(ses, p, true);
    return new Promise((resolve, reject) => {
      ses.actWaiters.push({
        seq: ses.seq,
        resolve: a => { setBusy(ses, p, false); resolve(a); },
        reject: e => { setBusy(ses, p, false); reject(e); },
      });
    });
  }
  function wakeActs(ses) {
    ses.actWaiters = ses.actWaiters.filter(w => { if (!ses.acts.has(w.seq)) return true; w.resolve(ses.acts.get(w.seq)); return false; });
  }
  function setBusy(ses, p, on) { ses.busy = on ? p : -1; renderOpps(ses); }

  // ── 내 차례 ──────────────────────────────────────────────
  // ⏱ 친구랑: 내 차례 30초가 지나면 중급 AI 가 대신 (10초 남으면 알림)
  const TURN_SEC = 30;
  function turnTimer(ses) {
    clearInterval(ses.turnT); ses.turnLeft = null;
    if (!ses.cfg.online || ses.replaying) return;
    const end = Date.now() + TURN_SEC * 1000;
    ses.turnLeft = TURN_SEC;
    ses.turnT = setInterval(() => {
      if (!ses.alive || !ses.pending || ses.pending.isResult || ses.pending.isCall) { clearInterval(ses.turnT); ses.turnLeft = null; return; }
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left !== ses.turnLeft) { ses.turnLeft = left; if (left === 10) { C.toast('⏱ 10초 남았어요', 1500); buzz(30); } drawBar(ses); }
      if (left <= 0) {
        clearInterval(ses.turnT); ses.turnLeft = null;
        for (const close of ses.modals.splice(0)) { try { close(); } catch (e) {} }
        C.toast('⏱ 30초가 지나서 AI 가 대신 냈어요', 2000);
        finishHuman(ses, AI.choose(G.view(ses.S, ses.S.turn), 'normal', { seed: rand32() }));
      }
    }, 250);
  }
  function humanTurn(ses) {
    return new Promise((resolve, reject) => {
      ses.pending = { resolve, reject };
      ses.sel = -1;
      turnTimer(ses);
      if (ses.S.phase === 'suit') askSuit(ses);
      render(ses);
      if (window.__onecard && __onecard.autoHuman) setTimeout(() => autoAct(ses), FAST ? 1 : 300);
    });
  }
  function finishHuman(ses, a) {
    const p = ses.pending; if (!p || p.isResult || p.isCall) return;
    clearInterval(ses.turnT); ses.turnLeft = null;
    ses.pending = null; ses.sel = -1;
    if (a === G.A_DRAW) ses.armed = false;
    if (ses.suitClose) { const c = ses.suitClose; ses.suitClose = null; try { c(); } catch (e) {} }
    p.resolve(a);
  }
  function autoAct(ses) {
    if (!ses.pending || !ses.alive || ses.pending.isResult || ses.pending.isCall) return;
    finishHuman(ses, AI.choose(G.view(ses.S, ses.S.turn), 'normal', { seed: rand32() }));
  }
  function whyNot(s, c) {
    if (s.atk > 0) return `+${s.atk} 공격을 받는 중이에요 — 받아칠 수 있는 공격 카드${s.rules.block3 && s.atkKind === '2' ? '나 같은 무늬 3' : ''}만 낼 수 있어요`;
    if (s.suit < 0) return '지금은 아무 카드나 낼 수 있어요';
    return `${SYM[s.suit]} 무늬${s.rank >= 0 ? `나 ${G.RANK_NAME[s.rank]}` : ''} 를 내야 해요${G.isJoker(c) ? ` (조커는 ${s.rules.jokerPlay === 'any' ? '아무 때나' : '색이 맞을 때'})` : ''}`;
  }
  function playTap(ses, c) {
    const s = ses.S;
    if (!G.canPlay(s, c)) { sfx('bad'); C.toast(whyNot(s, c), 1800); const el = HEL.get(c); if (el) { try { el.animate([{ marginLeft: '0' }, { marginLeft: '-6px' }, { marginLeft: '6px' }, { marginLeft: '0' }], { duration: 260 }); } catch (e) {} } return; }
    if (ses.sel === c) { sfx('place'); finishHuman(ses, G.A_PLAY + c); return; }
    ses.sel = c; sfx('tap'); renderHand(ses); coachRender(ses);
  }
  function drawTap(ses) { if (!myTurnNow(ses)) return; sfx('tap'); finishHuman(ses, G.A_DRAW); }
  $('hand').addEventListener('pointerdown', e => {
    const ses = SES; if (!ses || !myTurnNow(ses)) return;
    const el = e.target.closest('.ocard'); if (!el) return;
    e.preventDefault();
    playTap(ses, +el.dataset.c);
  });
  $('stage').addEventListener('pointerdown', e => {
    const ses = SES; if (!ses || !myTurnNow(ses)) return;
    if (e.target.closest('.ocard') || e.target.closest('button')) return;
    if (ses.sel >= 0) { ses.sel = -1; renderHand(ses); coachRender(ses); }
  });
  $('drawPile').addEventListener('click', () => { const ses = SES; if (ses) drawTap(ses); });
  $('mySeat').addEventListener('click', e => {
    const ses = SES; if (!ses) return;
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'drawAct') drawTap(ses);
    else if (b.id === 'armBtn') { ses.armed = !ses.armed; sfx(ses.armed ? 'call' : 'tap'); renderMine(ses); C.toast(ses.armed ? '☝️ 한 장이 되면 바로 외쳐요' : '준비를 껐어요', 1200); }
  });
  $('play').addEventListener('contextmenu', e => e.preventDefault());
  // 키보드: ←→ 고르기 · Enter/Space 내기 · D 먹기 · 1~9 바로 고르기 · Esc 취소 · O 원카드 · C 잡았다
  addEventListener('keydown', e => {
    const ses = SES; if (!ses || $('play').hidden) return;
    const k = e.key;
    if (!$('callZone').hidden) {
      if (k === 'o' || k === 'O' || k === ' ' || k === 'Enter') { const b = $('callZone').querySelector('.call') || $('callZone').querySelector('.catch'); if (b) { e.preventDefault(); b.click(); } }
      else if (k === 'c' || k === 'C') { const b = $('callZone').querySelector('.catch'); if (b) { e.preventDefault(); b.click(); } }
      return;
    }
    if (document.querySelector('.overlay:not([hidden]):not(#resBox)')) return;
    if (!myTurnNow(ses)) return;
    const me = meSeat(ses), hand = ses.S.hands[me];
    const i = hand.indexOf(ses.sel);
    if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); const d = k === 'ArrowRight' ? 1 : -1; ses.sel = hand[i < 0 ? (d > 0 ? 0 : hand.length - 1) : (i + d + hand.length) % hand.length]; renderHand(ses); coachRender(ses); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (ses.sel >= 0) playTap(ses, ses.sel); else { const c = hand.find(x => G.canPlay(ses.S, x)); if (c != null) { ses.sel = c; renderHand(ses); } } }
    else if (k === 'd' || k === 'D') { e.preventDefault(); drawTap(ses); }
    else if (/^[1-9]$/.test(k)) { const c = hand[+k - 1]; if (c != null) { e.preventDefault(); playTap(ses, c); } }
    else if (k === 'Escape') { if (ses.sel >= 0) { ses.sel = -1; renderHand(ses); } }
    else if (k === 'o' || k === 'O') { const b = $('armBtn'); if (b) b.click(); }
  });

  // 7: 무늬 고르기
  function askSuit(ses) {
    sfx('pop');
    const s = ses.S, me = s.turn, cnt = AI.suitCounts(s.hands[me]);
    const co = coachOn(ses) && !ses.hide ? AI.coach(G.view(s, me)) : null;
    const close = C.modal({
      title: '🎨 다음 무늬를 골라요',
      html: `<div class="suits">${[0, 1, 2, 3].map(su => `<button type="button" data-su="${su}" class="${co && co.suit === su ? 'rec' : ''}">${ART.pip(su)}<span>${G.SUIT_NAME[su]}</span><small>내 손에 ${cnt[su]}장${co && co.suit === su ? ' · 🧑‍🏫 추천' : ''}</small></button>`).join('')}</div>`,
      buttons: [], dismiss: false,
    });
    ses.suitClose = close; ses.modals.push(close);
    const ov = [...document.querySelectorAll('.overlay')].pop();
    ov.querySelectorAll('[data-su]').forEach(b => b.onclick = () => { sfx('tap'); ses.modals = ses.modals.filter(x => x !== close); finishHuman(ses, G.A_SUIT + +b.dataset.su); });
  }

  // ── ☝️ 원카드 외치기 (시간 경주) ─────────────────────────
  // 이 화면에서 누를 수 있는 사람: 외치는 사람(내 자리·한 기기 사람) · 잡는 사람(다른 사람 자리)
  function callButtons(ses) {
    const S = ses.S, p = S.call.p, me = meSeat(ses);
    if (ses.cfg.watch || ses.replaying) return { call: false, catcher: -1 };
    if (ses.cfg.online) return { call: me === p, catcher: me >= 0 && me !== p ? me : -1 };
    const humans = ses.seats.map((x, i) => (x.ctrl === 'me' ? i : -1)).filter(i => i >= 0);
    return { call: ses.seats[p].ctrl === 'me', catcher: humans.find(i => i !== p && S.out[i] !== 2) ?? -1 };
  }
  function showCallUI(ses, W, onCall, onCatch) {
    const z = $('callZone'), S = ses.S, p = S.call.p, cb = callButtons(ses);
    z.innerHTML = `<div class="who">☝️ ${esc(nameOf(ses, p))} 한 장 남았어요!</div><div class="cbtns">${cb.call ? `<button class="cbtn call" type="button">☝️ 원카드!</button>` : ''}${cb.catcher >= 0 ? `<button class="cbtn catch" type="button">🫵 잡았다!</button>` : ''}</div><div class="tbar"><i></i></div>`;
    z.hidden = false;
    const bar = z.querySelector('.tbar i');
    try { bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: W, fill: 'forwards' }); } catch (e) {}
    const bc = z.querySelector('.call'), bk = z.querySelector('.catch');
    if (bc) bc.addEventListener('pointerdown', ev => { ev.preventDefault(); bc.disabled = true; onCall(); });
    if (bk) bk.addEventListener('pointerdown', ev => { ev.preventDefault(); bk.disabled = true; onCatch(cb.catcher); });
    if (bc) bc.onclick = () => { if (!bc.disabled) { bc.disabled = true; onCall(); } };
    if (bk) bk.onclick = () => { if (!bk.disabled) { bk.disabled = true; onCatch(cb.catcher); } };
    if (cb.call || cb.catcher >= 0) { sfx('pop', { pitch: 1.4 }); buzz([20, 30, 20]); }
    return cb;
  }
  function hideCallUI() { const z = $('callZone'); z.hidden = true; z.innerHTML = ''; }
  function callPhase(ses) {
    const S = ses.S, p = S.call.p, R = S.rules, seq = ses.seq, online = !!ses.cfg.online, host = online && ses.cfg.role === 'host';
    const W = FAST ? 80 : R.callSec * 1000;
    const auto = window.__onecard && __onecard.autoHuman;
    if (online && !host) {                                   // 손님: 누르면 방장에게 알리고, 방장이 정한 결과를 기다림
      const send = k => { try { ses.net.send({ t: '_call', seq, k }, true); } catch (e) {} };
      const cb = showCallUI(ses, W, () => send('call'), () => send('catch'));
      if (cb.call && (ses.armed || auto)) { send('call'); const b = $('callZone').querySelector('.call'); if (b) b.disabled = true; }
      ses.armed = false;
      return remoteTurn(ses, p).finally(() => hideCallUI());
    }
    return new Promise((resolve, reject) => {
      let done = false; const timers = [];
      const stop = () => { done = true; timers.forEach(clearTimeout); ses.race = null; ses.armed = false; hideCallUI(); if (ses.pending && ses.pending.isCall) ses.pending = null; };
      const fin = a => { if (done || !ses.alive) return; stop(); resolve(a); };
      ses.pending = { isCall: true, resolve: fin, reject: e => { if (done) return; stop(); reject(e); } };
      const later = (ms, f) => timers.push(setTimeout(() => { if (ses.alive && !done) f(); }, Math.max(0, ms)));
      const rnd = G.makeRng(rand32());
      for (let q = 0; q < S.n; q++) {                        // AI 자리: 외치기·잡기 시각을 미리 정함
        const st = ses.seats[q]; if (!st || st.ctrl !== 'ai' || (q !== p && S.out[q] === 2)) continue;
        const t = AI.callPlan(st.tier || 'normal', q === p ? 'call' : 'catch', rnd);
        if (t != null) later(FAST ? t / 60 : t, () => fin(q === p ? G.A_CALL : G.A_CATCH + q));
      }
      const cb = showCallUI(ses, W, () => fin(G.A_CALL), q => fin(G.A_CATCH + q));
      if (cb.call && (ses.armed || auto)) later(FAST ? 1 : 140, () => fin(G.A_CALL));
      if (host) {
        ses.race = { seq, input: (uid, k) => { const q = ses.seats.findIndex(x => x.uid === uid); if (q < 0) return; if (k === 'call' && q === p && ses.seats[q].ctrl === 'remote') fin(G.A_CALL); else if (k === 'catch' && q !== p && S.out[q] !== 2) fin(G.A_CATCH + q); } };
        const early = ses.callBuf[seq] || []; delete ses.callBuf[seq];
        for (const x of early) if (ses.race) ses.race.input(x.uid, x.k);
      }
      later(W, () => fin(G.A_MISS));
    });
  }

  // ── AI 차례 ──────────────────────────────────────────────
  async function aiTurn(ses, p) {
    const seat = ses.seats[p];
    setBusy(ses, p, true);
    const t0 = performance.now();
    const a = await aiChoose(G.view(ses.S, p), seat.tier || 'normal');
    ses.check();
    const want = FAST ? 0 : SP().think * (ses.S.phase === 'suit' ? 0.6 : 1);
    const left = want - (performance.now() - t0);
    if (left > 0) await ses.wait(left);
    setBusy(ses, p, false);
    return a;
  }

  // ── 🧑‍🏫 AI 선생님 ─────────────────────────────────────
  const coachAvail = ses => !!ses && !ses.cfg.watch && !ses.cfg.replay && !ses.replaying && (!ses.cfg.online || !!ses.cfg.coach);   // 복기 중엔 복기 전용 선생님 창이 따로 있음
  const coachOn = ses => coachAvail(ses) && !!ses.coachOn;
  function setupCoach(ses) {
    if (!coachAvail(ses) || !window.CoachPanel) return;
    const KEYP = 'game.coach.onecard';
    let saved = null; try { saved = localStorage.getItem(KEYP); } catch (e) {}
    if (!saved && innerWidth < 900) {                        // 폰: 접힌 동그라미는 위 줄 코인 자리, 펼친 창은 상대 자리 위
      const top = Math.round($('stage').getBoundingClientRect().top) + 2, barTop = Math.round($('play').querySelector('.bar').getBoundingClientRect().top) + 2, pw = Math.min(320, innerWidth * 0.86);
      try { localStorage.setItem(KEYP, JSON.stringify({ c: [Math.max(4, innerWidth - 56), barTop], p: [Math.max(4, Math.round(innerWidth - pw - 6)), top], z: 1 })); } catch (e) {}
    }
    try { ses.panel = CoachPanel.create({ game: 'onecard', title: 'AI 선생님', startHidden: true }); } catch (e) { ses.panel = null; }
  }
  function getCoach(ses) {
    const s = ses.S, me = meSeat(ses);
    if (!coachOn(ses) || me < 0 || s.turn !== me || ses.hide || s.phase !== 'play' || !ses.pending || ses.pending.isCall || ses.pending.isResult) return null;
    if (!ses.coachCache || ses.coachCache.seq !== ses.seq) {
      // 바로: 어림 규칙으로 추천 → 일꾼이 숨은 카드를 수백 번 섞어 끝까지 둬 본 뒤 더 나은 수가 분명하면 바꿈
      const v = G.view(s, me), seq = ses.seq;
      ses.coachCache = { seq, data: AI.coach(v) };
      if (!FAST) coachMC(v, seq + 1).then(d => {
        if (!d || SES !== ses || !ses.coachCache || ses.coachCache.seq !== seq) return;
        const nd = AI.coach(v, { mc: d, minN: 60 });
        if (nd && nd.a !== ses.coachCache.data.a) { ses.coachCache.data = nd; if (myTurnNow(ses)) { renderHand(ses); coachRender(ses); } }
      });
    }
    return ses.coachCache.data;
  }
  function coachRender(ses) {
    if (!ses || !ses.panel) return;
    const on = coachOn(ses) && !ses.hide && meSeat(ses) >= 0;
    if (!on) { ses.panel.hide(); ses.coachHtml = null; return; }
    const co = getCoach(ses);
    let html;
    if (co) {
      const sel = ses.sel >= 0 ? co.byCard[ses.sel] : null;
      if (sel && !sel.best) html = `<span class="small">고른 카드</span> <b>[${esc(G.cardName(ses.sel))}]</b> ${esc(sel.why)}<br>🧑‍🏫 추천은 <b>[${esc(co.name)}]</b> — ${esc(co.why)}`;
      else html = `👑 <b>[${esc(co.name)}]</b>${co.card >= 0 && co.byCard[co.card] && co.byCard[co.card].suit != null ? ` → ${SYM[co.byCard[co.card].suit]}` : ''} — ${esc(co.why)}`;
    } else html = '<span class="small">내 차례가 되면 낼 카드를 알려 드려요</span>';
    if (ses.coachHtml !== html) { ses.coachHtml = html; ses.panel.set(html); }
    if (!ses.panel.visible) ses.panel.show();
  }

  // ── 📱 한 기기에서 여럿: 사람 차례가 바뀔 때 가림 화면 ──────────
  function hotClose() { if (window.HotSeat && HotSeat.isOpen) HotSeat.close(); }
  async function hotAccept(ses, p) {
    if (!ses.hide && ses.hotLast === p) return;
    const st = ses.seats[p];
    ses.hide = true; render(ses);
    await HotSeat.cover({ name: st.name, emoji: st.em });
    ses.check();
    ses.hotLast = p; ses.hide = false;
    if (ses.cfg.me !== p) { ses.cfg.me = p; HEL.forEach(el => el.remove()); HEL.clear(); layout(ses); }
    render(ses);
  }

  // ── 판 결과 ──────────────────────────────────────────────
  async function showResult(ses) {
    await Promise.race([popQ, sleep(1500)]);
    await ses.wait(FAST ? 0 : 400);
    $('pop').hidden = true;
    return new Promise((resolve, reject) => {
      const s = ses.S, r = s.result, me = meSeat(ses), watch = ses.cfg.watch, spec = watch || ses.hot || me < 0;
      if (!r) return resolve('menu');
      const nm = p => esc(nameOf(ses, p));
      let title, big = '', bigCls = '', coinLine = '';
      if (spec) { title = `${esc(ses.seats[r.winner].em)} ${esc(ses.seats[r.winner].name)} 승리!`; big = `+${r.pts[r.winner]}장`; sfx('win'); }
      else if (r.winner === me) {
        title = r.kind === 'last' ? '🎉 다 파산해서 이겼어요!' : '🎉 이겼어요!';
        big = `+${r.pts[me]}장`;
        const gain = r.pts[me] * 10;
        if (!ses.resCounted && !ses.cfg.online && !ses.isDrill) { coins += gain; C.save(KEY + 'coins', coins); }
        if (!ses.cfg.online && !ses.isDrill) coinLine = `<p class="rescoin">🪙 +${fmtN(gain)}냥</p>`;
        sfx('win');
        setTimeout(() => C.confetti(r.pts[me] >= 15 ? {} : { particleCount: 60, spread: 60 }), 150);
      } else {
        title = `😿 ${esc(iga(ses.seats[r.winner].name))} 이겼어요`;
        big = `${r.pts[me]}장`; bigCls = 'lose'; sfx('lose');
      }
      if (ses.isDrill) coinLine += '<p class="small" style="margin:4px 0 0">🎮 복기 연습이라 냥·기록엔 안 넣었어요 (다음 판부터 들어가요)</p>';
      if (!spec && !ses.resCounted && !ses.cfg.online && !ses.isDrill) {
        stats.played++; if (r.winner === me) { stats.won++; stats.best = Math.max(stats.best, r.pts[me]); }
        C.save(KEY + 'stats', stats);
      }
      const dl = ses.lastDeltas || {};
      const rows = r.order.map((q, i) => {
        const left = s.out[q] === 2 ? `💥 파산 (${s.bustAt[q]}장)` : s.out[q] === 1 ? (s.rules.rankAll ? '다 털었어요' : '🏆 다 털었어요') : `남은 ${s.hands[q].length}장`;
        return `<tr class="${q === me && !spec ? 'me' : ''}"><td class="pl">${i + 1}등</td><td>${ses.seats[q].em === '나' ? '' : esc(ses.seats[q].em) + ' '}${nm(q)} <span class="small">${left}</span></td><td class="n">${r.pts[q] > 0 ? '+' : ''}${r.pts[q]}장</td></tr>`;
      }).join('');
      const chipTxt = Object.keys(dl).map(i => ({ i: +i, v: dl[i] })).filter(x => x.v).map(x => `${nm(x.i)} <b class="${x.v > 0 ? 'cp' : 'cm'}">${x.v > 0 ? '+' : ''}${ses.chipWon ? fmtN(Math.round(x.v * ses.chipWon)) + '원' : fmtN(x.v)}</b>`).join(' · ');
      const chipLine = chipTxt ? `<p class="small chipline">${ses.chipWon ? `💰 장당 ${fmtN(Math.round(s.rules.chipPer * ses.chipWon))}원` : `🪙 칩 (장당 ${s.rules.chipPer})`} ${chipTxt}</p>` : '';
      const stat = s.stat ? `<p class="small" style="margin:6px 0 0">☝️ 외치기 ${s.stat.calls.reduce((a, b) => a + b, 0)}번 · 벌칙 ${s.stat.pens.reduce((a, b) => a + b, 0)}번 · ${s.turnNo}수${r.kind === 'cap' ? ' (너무 길어서 끝 — 손패 적은 순)' : ''}</p>` : '';
      $('resTitle').innerHTML = title;
      $('resBig').innerHTML = `${big ? `<div class="resbig ${bigCls}">${big}</div>` : ''}${coinLine}`;
      $('resBody').innerHTML = `<table class="brk">${rows}</table>${chipLine}${stat}`;
      $('resBtns').innerHTML = '';
      const done = v => { clearTimeout(autoT); $('resBox').hidden = true; ses.drawReady = null; resolve(v); };
      const mk = (label, cls, v) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); done(v); }; $('resBtns').appendChild(b); return b; };
      ses.resCounted = true;
      const online = !!ses.cfg.online, host = online && ses.cfg.role === 'host';
      let nb;
      if (online && !host) {
        nb = document.createElement('button'); nb.className = 'btn primary';
        const meSeated = ses.cfg.me >= 0;
        const paint = () => { const on = ses.myReady === s.round; nb.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : meSeated ? '✋ 준비' : '✋ 다음 판에 낄래요'; nb.disabled = on; };
        nb.onclick = () => { sfx('tap'); ses.myReady = s.round; ses.net.send({ t: '_ready', round: s.round }, true); paint(); };
        paint(); $('resBtns').appendChild(nb);
      } else nb = mk(host ? '다음 판 시작 ▶' : '다음 판 ▶', 'primary', 'next');
      let fb = null;
      if (host) fb = mk('안 기다리고 시작', '', 'next');
      if (online) {
        const rb = document.createElement('div'); rb.className = 'rdy'; $('resBody').appendChild(rb);
        ses.drawReady = () => {
          if (!rb.isConnected) return;
          const pl = (ses.net && ses.net.players) || {}, R = ses.readyOf(s.round);
          const seated = ses.seats.map((x, i) => {
            if (i === ses.cfg.me && host) return `<span class="ok">👑 ${esc(x.name)}</span>`;
            if (x.bot) return `<span class="ok">${esc(x.em)} ${esc(x.name)} (AI)</span>`;
            const gone = !pl[x.uid], ok = R.has(x.uid) || x.sub;
            return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(x.name)}${x.sub ? ' (AI)' : ''}${host && gone && !x.sub ? ` <button type="button" data-ai="${i}">🤖 AI</button>${ses.seats.length > 2 && !ses.bank ? ` <button type="button" data-drop="${i}">👋 빼기</button>` : ''}` : ''}</span>`;
          });
          const watchers = Object.keys(pl).filter(u => !ses.seats.some(x => x.uid === u));
          const wl = watchers.map(u => host
            ? `<label><input type="checkbox" data-join="${esc(u)}" ${ses.joinPick[u] ? 'checked' : ''}> ${esc((pl[u] && pl[u].name) || '친구')}${R.has(u) ? ' ✋' : ''}</label>`
            : `<span>${esc((pl[u] && pl[u].name) || '친구')}${R.has(u) ? ' ✋' : ''}</span>`).join('');
          rb.innerHTML = `<div class="rdy-row">${seated.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
          if (host) {
            const need = ses.seats.filter((x, i) => i !== ses.cfg.me && !x.sub && !x.bot), k = need.filter(x => R.has(x.uid)).length;
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
      if (ses.rec && ses.rec.acts.length) mk('🎞️ 다시 보기', '', { replay: ses.rec });
      mk(watch ? '그만 보기' : '메뉴', '', 'menu');
      if (ses.bank) {
        const lb = document.createElement('button'); lb.className = 'btn'; lb.textContent = '💰 빌리기'; lb.onclick = () => $('loanBtn').click(); $('resBtns').appendChild(lb);
        if (host) { const sb = document.createElement('button'); sb.className = 'btn'; sb.textContent = '🏦 정산'; sb.onclick = () => ses.bank.flush().then(() => Bank.panel({ game: 'onecard', gid: ses.bank.gid, tab: 'settle' })); $('resBtns').appendChild(sb); }
      }
      let autoT = 0;
      if (watch && !ses.paused) autoT = setTimeout(() => { if (SES === ses && ses.alive) done('next'); }, FAST ? 30 : 4200);
      else if (online && !host && ses.roundMsg && ses.roundMsg.S.round > s.round) autoT = setTimeout(() => { if (SES === ses && ses.alive) done('next'); }, FAST ? 30 : 2500);
      ses.pending = { resolve: v => done(v), reject: e => { clearTimeout(autoT); $('resBox').hidden = true; reject(e); } };
      ses.pending.isResult = true;
      $('resBox').hidden = false;
      if (matchMedia('(hover: hover)').matches) setTimeout(() => nb.focus({ preventScroll: true }), 40);
      drawBar(ses);
    }).finally(() => { if (ses.pending && ses.pending.isResult) ses.pending = null; });
  }

  // ── 아래 단추 줄 ──────────────────────────────────────────
  function drawDock() {
    const ses = SES, watch = ses && ses.cfg.watch;
    const cb = $('coachBtn');
    cb.hidden = !coachAvail(ses);
    cb.setAttribute('aria-pressed', String(coachOn(ses)));
    $('pauseBtn').hidden = !watch || !!(ses && (ses.cfg.replay || ses.replaying));
    $('loanBtn').hidden = !(ses && ses.bank); $('bankBtn').hidden = !(ses && ses.bank);
    if (ses) $('pauseBtn').innerHTML = `<span class="ic">${ses.paused ? '▶' : '⏸'}</span><span>${ses.paused ? '계속' : '멈춤'}</span>`;
    const sp = SPEEDS[opt[speedKey()]] || SPEEDS.normal;
    $('speedBtn').innerHTML = `<span class="ic">${sp.em}</span><span>${sp.label}</span>`;
  }
  $('coachBtn').onclick = () => {
    const ses = SES; if (!coachAvail(ses)) return;
    ses.coachOn = !ses.coachOn;
    if (!ses.cfg.online && !ses.hot) { opt.coach = ses.coachOn ? 1 : 0; saveOpt('coach'); }
    sfx('tap');
    ses.coachHtml = null;
    drawDock(); render(ses);
    C.toast(ses.coachOn ? '🧑‍🏫 AI 선생님을 켰어요' : 'AI 선생님을 껐어요', 1100);
  };
  $('speedBtn').onclick = () => { const k = speedKey(); opt[k] = SPEED_ORDER[(SPEED_ORDER.indexOf(opt[k]) + 1) % 3]; saveOpt(k); sfx('tap'); drawDock(); C.toast('진행 속도: ' + SPEEDS[opt[k]].label, 1000); };
  $('pauseBtn').onclick = () => { const ses = SES; if (!ses) return; ses.paused = !ses.paused; sfx('tap'); drawDock(); if (!ses.paused) ses.wake(); };
  $('ruleBtn').onclick = () => showRules();
  $('loanBtn').onclick = async () => {
    const ses = SES; if (!ses || !ses.bank || !window.Bank) return;
    sfx('tap');
    if (!(await Bank.askLoan(ses.bank.gid)) || SES !== ses) return;
    if (ses.cfg.role === 'host') ses.bank.requestLoan(ses.cfg.me); else ses.bank.requestLoan();
  };
  $('bankBtn').onclick = () => { if (SES && SES.bank && window.Bank) { sfx('tap'); Bank.panel({ game: 'onecard', gid: SES.bank.gid }); } };
  C.sfx.button($('sndBtn'));

  // ── 시험용 손잡이 (headless 시험에서 씀) ─────────────────────
  window.__onecard = {
    get ses() { return SES; }, get state() { return SES && SES.S; }, get view() { return SES && SES.V; }, get geo() { return GEO; },
    autoHuman: false,
    fast(on) { FAST = on ? 1 : 0; },
    start(o) { o = o || {}; startSeed = o.seed >>> 0; startState = o.state || null; if (o.state) opt.nAi = o.state.n - 1; if (o.n) opt.nAi = o.n - 1; if (o.tier) opt.tier = o.tier; if (o.rules) setRules(o.rules); if (o.wTiers) opt.wTiers = o.wTiers; if (o.wN) opt.wN = o.wN; if (o.coach != null) opt.coach = o.coach ? 1 : 0; startGame({ watch: !!o.watch }); },
    startHot(o) { o = o || {}; startSeed = o.seed >>> 0; if (o.rules) setRules(o.rules); if (lPick && o.seats) lPick.set(o.seats); startHotSeat(); },
    home: () => goHome(),
    act(a) { const ses = SES; if (ses && ses.pending && !ses.pending.isResult && !ses.pending.isCall) finishHuman(ses, a); },
    call() { const b = $('callZone').querySelector('.call'); if (b) b.click(); return !!b; },
    catchIt() { const b = $('callZone').querySelector('.catch'); if (b) b.click(); return !!b; },
    legal() { return SES ? G.legal(SES.S) : []; },
    get panel() { return SES && SES.panel; },
  };

  // ── 시작 ────────────────────────────────────────────────
  ART.install();
  $('replayBtn').onclick = () => { sfx('tap'); openReplayList(); };
  drawReplayBtn();
  drawMenu();
  show('home');
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
})();

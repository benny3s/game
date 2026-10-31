/* 윷놀이 — 메뉴 · 화면 한 장 · 윷가락 던지기 · 말 움직임 · 조작 · 소리 · 친구랑 (규칙은 core.js, AI 는 ai.js)
   한 판 흐름: 상태 S → 차례 팀의 지금 사람(members[mi])이 행동 번호를 고름 → Yut.step → 돌려받은 events 로 움직임·소리 → 다음
   친구랑: 방장이 판의 주인 (친구는 행동 번호만 보내고, 방장이 적용한 상태를 모두에게 뿌림) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Y = window.Yut, AI = window.YutAI, C = window.Cozy;
  const esc = C.esc;
  const sfx = (n, o) => C.sfx.play(n, o);
  const { WAIT, HOME, A_THROW, NAMES, STEPS, XY } = Y;
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } };
  const hasJong = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const iga = w => w + (hasJong(w) ? '이' : '가');
  const ro = w => w + (hasJong(w) && (String(w).charCodeAt(String(w).length - 1) - 0xAC00) % 28 !== 8 ? '으로' : '로');

  // ── 팀 · AI · 빠르기 ─────────────────────────────────────
  const TEAMS = [
    { em: '🐰', name: '토끼팀', color: '#e2574c' },
    { em: '🐻', name: '곰돌이팀', color: '#3d7dd8' },
    { em: '🦊', name: '여우팀', color: '#ef9d1f' },
    { em: '🐸', name: '개구리팀', color: '#3fa35b' },
  ];
  const TIER = {
    easy: { em: '🐣', name: '아기 병아리', short: '병아리', desc: '멀리 가기만 좋아해요', cls: 't-easy' },
    normal: { em: '🐱', name: '꾀돌이 고양이', short: '고양이', desc: '잡기·업기·피하기를 따져요', cls: 't-normal' },
    hard: { em: '🐯', name: '윷판 호랑이', short: '호랑이', desc: '상대 윷까지 내다봐요', cls: 't-hard' },
  };
  const SPEEDS = { slow: { label: '느긋하게', em: '🐢', mul: 1.45 }, normal: { label: '보통', em: '🚶', mul: 1 }, fast: { label: '빠르게', em: '🐇', mul: 0.55 } };
  const CALL = ['빽도!', '도!', '개!', '걸!', '윷이야!', '모다!'];
  const CALLSUB = ['한 칸 뒤로', '한 칸', '두 칸', '세 칸', '네 칸 · 한 번 더!', '다섯 칸 · 한 번 더!'];

  // ── 설정 (localStorage) ──────────────────────────────────
  const KEY = 'yut.';
  const st = (k, d) => C.store(KEY + k, d);
  const opt = {
    tab: st('tab', 'local'), nTeams: st('nTeams', 2),
    teams: st('teams', [{ name: '토끼팀', type: 'human', people: '' }, { name: '곰돌이팀', type: 'human', people: '' }, { name: '여우팀', type: 'normal', people: '' }, { name: '개구리팀', type: 'normal', people: '' }]),
    pieces: st('pieces', 4), backdo: st('backdo', 1), coachOn: st('coachOn', 0), speed: st('speed', 'normal'),
    myName: st('myName', ''), aiCount: st('aiCount', 1), tier: st('tier', 'normal'),
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  if (!Array.isArray(opt.teams) || opt.teams.length < 4) opt.teams = [0, 1, 2, 3].map(i => ({ name: TEAMS[i].name, type: i < 2 ? 'human' : 'normal', people: '' }));

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick, canEdit = true) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}" ${canEdit ? '' : 'disabled'}>${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b || !canEdit) return; sfx('tap'); onPick(b.dataset.v); };
  }
  const TYPE_ITEMS = [['human', '🙋 사람'], ['easy', '🐣'], ['normal', '🐱'], ['hard', '🐯']];
  function drawMenu() {
    const tab = opt.tab;
    $('tabLocal').setAttribute('aria-pressed', String(tab === 'local'));
    $('tabAi').setAttribute('aria-pressed', String(tab === 'ai'));
    $('localBox').hidden = tab !== 'local'; $('aiBox').hidden = tab !== 'ai';
    segBtns($('teamSeg'), [[2, '2팀'], [3, '3팀'], [4, '4팀']], opt.nTeams, v => { opt.nTeams = +v; saveOpt('nTeams'); drawMenu(); });
    const rows = $('teamRows');
    rows.innerHTML = opt.teams.slice(0, opt.nTeams).map((t, i) => `<div class="teamrow" style="--tc:${TEAMS[i].color}">
      <div class="av">${TEAMS[i].em}</div>
      <input type="text" class="tname" data-i="${i}" maxlength="8" value="${esc(t.name || TEAMS[i].name)}" aria-label="팀 이름">
      <div class="seg" data-ty="${i}"></div>
      <input type="text" class="people" data-p="${i}" maxlength="60" placeholder="누가 던지나요? 예) 엄마, 민지 (쉼표로 나눠요)" value="${esc(t.people || '')}" ${t.type === 'human' ? '' : 'hidden'}>
    </div>`).join('');
    for (const el of rows.querySelectorAll('[data-ty]')) {
      const i = +el.dataset.ty;
      segBtns(el, TYPE_ITEMS, opt.teams[i].type, v => { opt.teams[i].type = v; saveOpt('teams'); drawMenu(); });
    }
    rows.oninput = e => {
      const el = e.target;
      if (el.dataset.i != null) opt.teams[+el.dataset.i].name = el.value.slice(0, 8);
      if (el.dataset.p != null) opt.teams[+el.dataset.p].people = el.value.slice(0, 60);
      saveOpt('teams');
    };
    $('myName').value = opt.myName || '';
    segBtns($('aiCountSeg'), [[1, '1팀'], [2, '2팀'], [3, '3팀']], opt.aiCount, v => { opt.aiCount = +v; saveOpt('aiCount'); drawMenu(); });
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })),
      id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    segBtns($('pieceSeg'), [[2, '2개'], [3, '3개'], [4, '4개']], opt.pieces, v => { opt.pieces = +v; saveOpt('pieces'); drawMenu(); });
    segBtns($('backdoSeg'), [[1, '켬'], [0, '끔']], opt.backdo ? 1 : 0, v => { opt.backdo = +v; saveOpt('backdo'); drawMenu(); });
    segBtns($('speedSeg'), Object.keys(SPEEDS).map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    $('startBtn').textContent = tab === 'ai' ? `${TIER[opt.tier].em} ${TIER[opt.tier].name}${opt.aiCount > 1 ? ` ${opt.aiCount}팀과` : hasJong(TIER[opt.tier].name) ? '과' : '와'} 한 판` : `🎉 ${opt.nTeams}팀 윷놀이 시작`;
  }
  $('myName').addEventListener('input', e => { opt.myName = e.target.value.slice(0, 10); saveOpt('myName'); });
  $('tabLocal').onclick = () => { sfx('tap'); opt.tab = 'local'; saveOpt('tab'); drawMenu(); };
  $('tabAi').onclick = () => { sfx('tap'); opt.tab = 'ai'; saveOpt('tab'); drawMenu(); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriend(); };
  $('startBtn').onclick = () => { sfx('pop'); startLocal(); };
  $('rulesBtn').onclick = () => showRules();
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open('yut'); } catch (e) {} };

  const splitPeople = s => String(s || '').split(/[,，、\/\n]+/).map(x => x.trim().slice(0, 10)).filter(Boolean).slice(0, 8);

  // ── 규칙 창 ───────────────────────────────────────────────
  function rulesHtml() {
    const P = Y.probs(0.6, true), P0 = Y.probs(0.6, false);
    const pc = x => (x * 100).toFixed(1) + '%';
    return `<div class="rules">
      <p>윷가락 넷을 던져 나온 만큼 말을 옮기고, 내 말을 모두 먼저 집으로 들여보내는 팀이 이겨요.</p>
      <h3>윷가락 읽기</h3>
      <table><tr><th>결과</th><th>가락</th><th>칸</th><th class="n">확률</th><th class="n">빽도 끔</th></tr>
        <tr><td>빽도</td><td>표시(빽) 가락 하나만 배</td><td>1칸 뒤로</td><td class="n">${pc(P[0])}</td><td class="n">—</td></tr>
        <tr><td>도</td><td>배 1개</td><td>1</td><td class="n">${pc(P[1])}</td><td class="n">${pc(P0[1])}</td></tr>
        <tr><td>개</td><td>배 2개</td><td>2</td><td class="n">${pc(P[2])}</td><td class="n">${pc(P0[2])}</td></tr>
        <tr><td>걸</td><td>배 3개</td><td>3</td><td class="n">${pc(P[3])}</td><td class="n">${pc(P0[3])}</td></tr>
        <tr><td>윷</td><td>배 4개</td><td>4 + 한 번 더</td><td class="n">${pc(P[4])}</td><td class="n">${pc(P0[4])}</td></tr>
        <tr><td>모</td><td>배 0개 (모두 등)</td><td>5 + 한 번 더</td><td class="n">${pc(P[5])}</td><td class="n">${pc(P0[5])}</td></tr></table>
      <p class="small">'배'는 평평한 안쪽 면(✕ 무늬), '등'은 둥근 바깥 면이에요. 진짜 윷은 둥근 등이 바닥에 잘 안 서서 배가 더 자주 위로 와요. 그래서 가락마다 배가 나올 확률을 60%로 두었어요 (개·걸이 가장 흔하고 모가 가장 드물어요).</p>
      <h3>말 옮기기</h3><ul>
        <li>오른쪽 아래 <b>참먹이</b> 옆에서 출발해 시계 반대 방향으로 돌아요</li>
        <li><b>모</b>(오른쪽 위)·<b>뒷모</b>(왼쪽 위)·가운데 <b>방</b>에 딱 <b>멈추면</b> 다음에 대각선 지름길로 가요. 방에서는 참먹이 쪽으로 곧장!</li>
        <li>참먹이를 <b>지나가야</b> 집에 들어가요 (참먹이에 딱 서면 다음에 아무거나 나와도 나가요)</li>
        <li>윷·모가 여러 번 나오면 결과를 모아 두었다가, 어느 결과를 어느 말에 쓸지 골라요</li></ul>
      <h3>잡기 · 업기</h3><ul>
        <li>남의 말이 있는 칸에 내려앉으면 <b>잡아요</b>. 잡힌 말은 처음으로 돌아가고, 잡은 팀은 <b>한 번 더</b> 던져요</li>
        <li>내 말이 있는 칸에 내려앉으면 <b>업어서</b> 한 몸으로 같이 움직여요 (잡히면 같이 잡혀요)</li></ul>
      <h3>빽도</h3><ul>
        <li>지나온 길로 한 칸 뒤로 가요. 판 위에 내 말이 하나도 없으면 그냥 넘어가요</li>
        <li>처음 칸(도 자리)에서 빽도면 참먹이로 가요 → 다음에 무엇이 나와도 바로 나가요</li></ul>
      <p class="small">한 팀에 사람이 여럿이면 차례가 올 때마다 돌아가며 던져요. 키보드: 스페이스 = 던지기·옮기기, ←→ = 다른 수 보기, Esc = 취소</p>
    </div>`;
  }
  function showRules() { sfx('tap'); return C.modal({ title: '📖 윷놀이 규칙', html: rulesHtml(), buttons: [{ label: '닫기', primary: true }], dismiss: true }); }
  function showHowto(force) {
    return C.howto('yut', '🎋 윷놀이 하는 법', [
      '<b>던지기</b> 단추(또는 스페이스)로 윷가락을 던져요',
      '반짝이는 말을 누르면 갈 곳이 표시돼요. 표시를 누르면 미리 보여 주고, 한 번 더 누르거나 <b>옮기기</b>로 확정해요',
      '윷·모가 나오거나 상대 말을 잡으면 한 번 더! 내 말끼리 만나면 업고 같이 가요',
      '모서리와 가운데(방)에 딱 멈추면 지름길로 가요',
    ], { force: !!force });
  }

  // ── 화면 전환 ─────────────────────────────────────────────
  function show(which) {
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') layout();
  }
  function goHome() {
    if (SES) SES.dispose();
    SES = null;
    closeResult();
    show('home'); drawMenu();
  }

  // ── 한 판 (세션) ─────────────────────────────────────────
  class Cancel extends Error {}
  let SES = null;
  let FAST = 0;                       // 시험용: 움직임 시간 줄이기
  function newSession(cfg) {
    const ses = { cfg, alive: true, timers: new Set(), waiters: [], offs: [], S: null, teams: [], seq: 0, busy: false, awaiting: null, awaitRemote: null, sent: false, ui: { kind: null, piece: null, act: null }, queue: Promise.resolve(), games: 0, wins: [], rdy: new Set(), joinPick: {}, turnT: 0, turnKey: '', turnLeft: null, goneAsk: null, drawReady: null };
    ses.wait = ms => new Promise((res, rej) => {
      if (!ses.alive) return rej(new Cancel());
      const t = setTimeout(() => { ses.timers.delete(t); if (ses.alive) res(); else rej(new Cancel()); }, Math.max(0, ms));
      ses.timers.add(t);
    });
    ses.ready = () => new Promise((res, rej) => {
      const go = () => { if (!ses.alive) return rej(new Cancel()); if (document.hidden) { ses.waiters.push(go); return; } res(); };
      go();
    });
    ses.wake = () => { const w = ses.waiters.splice(0); w.forEach(f => f()); };
    ses.dispose = () => {
      ses.alive = false;
      for (const t of ses.timers) clearTimeout(t);
      ses.timers.clear();
      clearInterval(ses.turnT); ses.turnT = 0; clearInterval(ses.hiT);
      if (ses.goneAsk) { try { ses.goneAsk.close(); } catch (e) {} ses.goneAsk = null; }
      const sb = $('scoreBar'); if (sb) sb.hidden = true;
      for (const f of ses.offs.splice(0)) { try { f(); } catch (e) {} }
      if (ses.awaiting) { const r = ses.awaiting; ses.awaiting = null; r.reject(new Cancel()); }
      if (ses.awaitRemote) { const r = ses.awaitRemote; ses.awaitRemote = null; r.reject(new Cancel()); }
      ses.wake();
      document.querySelectorAll('.overlay.yres').forEach(o => o.remove());
      coachOut(null);
    };
    return ses;
  }
  document.addEventListener('visibilitychange', () => { if (SES) SES.wake(); });
  const D = ms => (FAST ? Math.min(ms, 8) : Math.round(ms * (SPEEDS[(SES && SES.cfg.speed) || 'normal'] || SPEEDS.normal).mul));

  function startLocal() {
    const n = opt.tab === 'ai' ? opt.aiCount + 1 : opt.nTeams;
    let teams;
    if (opt.tab === 'ai') {
      const me = (opt.myName || '').trim() || '나';
      teams = [{ ...TEAMS[0], name: me === '나' ? '내 팀' : me, members: [{ name: me, kind: 'human' }] }];
      for (let i = 1; i < n; i++) teams.push({ ...TEAMS[i], name: TEAMS[i].name, members: [{ name: TIER[opt.tier].name, kind: 'ai', tier: opt.tier }] });
    } else {
      teams = opt.teams.slice(0, n).map((t, i) => {
        const name = (t.name || '').trim() || TEAMS[i].name;
        const members = t.type === 'human'
          ? (splitPeople(t.people).length ? splitPeople(t.people) : [name]).map(nm => ({ name: nm, kind: 'human' }))
          : [{ name: TIER[t.type].name, kind: 'ai', tier: t.type }];
        return { ...TEAMS[i], name, members };
      });
    }
    // AI 선생님 단추는 혼자·한 기기에서는 늘 있음 (켜고 끄기는 화면의 단추로)
    const cfg = { mode: opt.tab, pieces: opt.pieces, backdo: !!opt.backdo, coach: true, speed: opt.speed, seed: startSeed || rand32() };
    startSeed = 0;
    if (SES) SES.dispose();
    const ses = SES = newSession(cfg);
    ses.teams = teams;
    show('play');
    showHowto(false);
    runGame(ses);
  }
  let startSeed = 0;                  // 시험용 씨앗

  // 지금 던질 사람
  const member = (ses, t) => { const tm = ses.teams[t]; return tm.members[(ses.S.mi[t] || 0) % tm.members.length]; };
  const isMine = (ses, m) => (ses.cfg.mode === 'online' ? m.kind === 'human' && m.uid === ses.cfg.net.uid : m.kind === 'human');
  const humanTeams = ses => ses.teams.filter(t => t.members.some(m => m.kind === 'human')).length;

  async function runGame(ses) {
    try {
      for (;;) {
        const cfg = ses.cfg;
        const seed = ses.games === 0 ? cfg.seed : rand32();
        if (cfg.mode === 'online' && ses.games > 0) rebuildTeams(ses);     // 구경하다 '낄래요' 한 사람은 팀에 들어가고, 빼기로 한 사람은 빠짐
        ses.rdy = new Set(); ses.drawReady = null;
        if (ses.wins.length !== ses.teams.length) ses.wins = ses.teams.map((_, t) => ses.wins[t] || 0);
        ses.S = Y.create({ teams: ses.teams.length, pieces: cfg.pieces, backdo: cfg.backdo, seed, first: ses.games % ses.teams.length, members: ses.teams.map(t => t.members.length) });
        ses.games++;
        ses.seq++;
        buildBoard(ses);
        renderAll(ses);
        broadcast(ses, [], true);
        await ses.wait(D(350));
        await announceTurn(ses);
        while (ses.S.phase !== 'end') {
          await ses.ready();
          const a = await getAction(ses);
          await doAction(ses, a);
        }
        rankReport(ses);
        const again = await showResult(ses);
        if (!again) {
          if (ses.cfg.mode === 'online') { if (window.ArenaUI) ArenaUI.toLobby(); }
          else goHome();
          return;
        }
      }
    } catch (e) {
      if (e instanceof Cancel) return;
      console.error(e);
      if (SES === ses) { C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); }
    }
  }

  async function getAction(ses) {
    const S = ses.S, t = S.turn, m = member(ses, t);
    if (m.kind === 'ai') {
      renderAll(ses);
      await ses.wait(D(S.phase === 'throw' ? (S.pool.length ? 420 : 620) : 420));
      if (S.phase === 'throw') return A_THROW;
      const a = AI.choose(S, m.tier || 'normal', { seed: rand32() });
      previewMove(ses, moveInfo(S, a));
      await ses.wait(D(620));
      clearPreview(ses);
      return a;
    }
    if (isMine(ses, m)) {
      return new Promise((resolve, reject) => { ses.awaiting = { resolve, reject }; resetUi(ses); renderAll(ses); autoSelect(ses); });
    }
    // 친구 차례 (방장이 기다림). 먼저 와 있던 행동이 맞으면 바로
    const e = ses.early; ses.early = null;
    if (e && e.uid === m.uid && e.seq === ses.seq && Y.isLegal(S, e.a)) return e.a;
    return new Promise((resolve, reject) => { ses.awaitRemote = { resolve, reject, uid: m.uid }; renderAll(ses); });
  }

  // 행동 하나 적용 (혼자·방장)
  async function doAction(ses, a) {
    const prev = ses.S;
    const { state, events } = Y.step(prev, a);
    ses.S = state; ses.seq++;
    if (state.phase === 'end' && prev.phase !== 'end') ses.wins[state.winner] = (ses.wins[state.winner] || 0) + 1;   // 판 이긴 횟수 (점수판)
    resetUi(ses);
    broadcast(ses, events, false);
    ses.busy = true; renderAll(ses);
    try { await animate(ses, prev, events); }
    finally { ses.busy = false; }
    renderAll(ses);
  }

  // 사람이 고른 행동
  function submit(ses, a) {
    if (!ses || !ses.S || ses.busy || !Y.isLegal(ses.S, a)) return;
    if (ses.cfg.role === 'guest') {
      if (ses.sent || !myTurn(ses)) return;
      ses.sent = true;
      ses.cfg.net.send({ t: 'act', a, seq: ses.seq }, true);
      clearPreview(ses);
      renderAll(ses);
      return;
    }
    if (!ses.awaiting) return;
    const r = ses.awaiting; ses.awaiting = null;
    clearPreview(ses);
    r.resolve(a);
  }
  function myTurn(ses) {
    if (!ses.S || ses.S.phase === 'end') return false;
    const m = member(ses, ses.S.turn);
    return isMine(ses, m);
  }
  const canAct = ses => !!ses && !!ses.S && !ses.busy && ses.S.phase !== 'end' && (ses.cfg.role === 'guest' ? myTurn(ses) && !ses.sent : !!ses.awaiting);

  // ── 판 그리기 ─────────────────────────────────────────────
  function buildBoard(ses) {
    const svg = $('boardSvg');
    if (!svg.dataset.done) {
      const ln = Y.EDGES.map(([a, b]) => { const [x1, y1] = XY[a], [x2, y2] = XY[b]; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
      const dots = [];
      for (let n = 1; n <= 29; n++) {
        const [x, y] = XY[n];
        if (n === 23) dots.push(`<circle cx="${x}" cy="${y}" r="5.1" class="cen"/><circle cx="${x}" cy="${y}" r="2.6" class="cen2"/>`);
        else if (n % 5 === 0 && n <= 20) dots.push(`<circle cx="${x}" cy="${y}" r="4.7" class="cor"/><circle cx="${x}" cy="${y}" r="2.1" class="cor2"/>`);
        else dots.push(`<circle cx="${x}" cy="${y}" r="2.9" class="pt"/>`);
      }
      const lab = (x, y, t, s = 3.2) => `<text x="${x}" y="${y}" font-size="${s}">${t}</text>`;
      svg.innerHTML = `<defs>
          <filter id="hjF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .12  0 0 0 .11 0"/></filter>
          <filter id="hjL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.06 0.55" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .35  0 0 0 0 .15  0 0 0 .16 -.02"/></filter>
          <radialGradient id="cenG" cx="40%" cy="35%"><stop offset="0" stop-color="#e8644c"/><stop offset="1" stop-color="#a82d1d"/></radialGradient>
        </defs>
        <rect width="100" height="100" filter="url(#hjF)"/><rect width="100" height="100" filter="url(#hjL)"/>
        <rect x="2.2" y="2.2" width="95.6" height="95.6" rx="1.5" class="frame"/>
        <g class="ln">${ln}</g>
        <path d="M98.2 90 L98.2 80.5 M96.9 82.4 L98.2 80.4 L99.5 82.4" class="arrow"/>
        <g class="pts">${dots.join('')}</g>
        <g class="lab">${lab(84.5, 12.6, '모')}${lab(16, 12.6, '뒷모')}${lab(16, 89.6, '찌모')}${lab(81.5, 89.6, '참먹이')}${lab(50, 59.6, '방', 3)}</g>`;
      svg.dataset.done = '1';
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `.frame{fill:none;stroke:#8a5a30;stroke-width:.35;opacity:.55}
        .ln line{stroke:#4a3020;stroke-width:.75;stroke-linecap:round;opacity:.82}
        .pt{fill:#fbf4e1;stroke:#4a3020;stroke-width:.6}
        .cor{fill:#fbf4e1;stroke:#4a3020;stroke-width:.85}.cor2{fill:#c8432f;opacity:.85}
        .cen{fill:url(#cenG);stroke:#4a3020;stroke-width:.85}.cen2{fill:#fbf4e1;opacity:.9}
        .arrow{fill:none;stroke:#c8432f;stroke-width:.6;stroke-linecap:round;stroke-linejoin:round;opacity:.8}
        .lab text{font-family:"Gowun Batang",serif;font-weight:700;fill:#6a4428;text-anchor:middle;paint-order:stroke;stroke:#f3e6c6;stroke-width:.8}`;
      svg.prepend(style);
    }
    // 말
    const box = $('toks');
    box.innerHTML = '';
    ses.tokEl = ses.teams.map((tm, t) => Array.from({ length: ses.S.k }, (_, i) => {
      const el = document.createElement('div');
      el.className = 'tok'; el.dataset.t = t; el.dataset.i = i; el.hidden = true;
      el.style.setProperty('--tc', tm.color);
      el.innerHTML = `<div class="bd"><span>${tm.em}</span></div>`;
      box.appendChild(el);
      return el;
    }));
    $('marks').innerHTML = '';
    buildSticks();
    layout();
  }

  function renderAll(ses) {
    if (!ses || !ses.S || SES !== ses) return;
    renderTokens(ses); renderTeams(ses); renderPool(ses); renderControls(ses); renderBar(ses); renderCoach(ses); renderScore(ses); syncTurnTimer(ses);
  }
  function renderTokens(ses) {
    const S = ses.S;
    for (let t = 0; t < S.n; t++) for (let i = 0; i < S.k; i++) {
      const el = ses.tokEl[t][i], pos = S.pos[t][i];
      el.classList.remove('can', 'sel');
      if (pos === WAIT || pos === HOME) { el.hidden = true; continue; }
      const group = []; for (let j = 0; j < S.k; j++) if (S.pos[t][j] === pos) group.push(j);
      const idx = group.indexOf(i);
      el.hidden = false; el.style.opacity = ''; el.style.transform = '';
      el.style.left = XY[pos][0] + '%';
      el.style.top = `calc(${XY[pos][1]}% - ${idx * 2.3}cqw)`;
      el.style.zIndex = 2 + idx;
      let nb = el.querySelector('.n');
      if (idx === group.length - 1 && group.length > 1) { if (!nb) { nb = document.createElement('span'); nb.className = 'n'; el.appendChild(nb); } nb.textContent = '×' + group.length; }
      else if (nb) nb.remove();
    }
    if (canAct(ses) && S.phase === 'move') {
      for (const mv of legalMoves(ses)) {
        const pos = S.pos[S.turn][mv.piece];
        if (pos === WAIT) continue;
        for (let j = 0; j < S.k; j++) if (S.pos[S.turn][j] === pos) ses.tokEl[S.turn][j].classList.add('can');
      }
      if (ses.ui.piece != null) for (const j of Y.groupOf(S, S.turn, ses.ui.piece)) if (S.pos[S.turn][j] !== WAIT) ses.tokEl[S.turn][j].classList.add('sel');
    }
  }
  function renderTeams(ses) {
    const S = ses.S, box = $('teams');
    box.style.setProperty('--nt', S.n === 3 ? 3 : 2);
    const mv = canAct(ses) && S.phase === 'move' ? legalMoves(ses) : [];
    box.innerHTML = ses.teams.map((tm, t) => {
      const m = tm.members[(S.mi[t] || 0) % tm.members.length];
      const who = m.kind === 'ai' ? `${TIER[m.tier || 'normal'].em} ${TIER[m.tier || 'normal'].short} AI` : tm.members.length > 1 ? `이번엔 ${m.name}` : (ses.cfg.mode === 'online' && m.uid === ses.cfg.net.uid ? '나' : m.name);
      let tray = '';
      let canEnter = -1;
      for (const x of mv) if (S.pos[t][x.piece] === WAIT && t === S.turn) canEnter = x.piece;
      for (let i = 0; i < S.k; i++) if (S.pos[t][i] === WAIT) {
        const can = canEnter >= 0 && i === canEnter;
        tray += `<span class="w${can ? ' can' : ''}${can && ses.ui.piece === i ? ' sel' : ''}" data-t="${t}" data-i="${i}">${tm.em}</span>`;
      }
      const homes = Array.from({ length: S.k }, (_, i) => `<i class="${i < Y.homeCount(S, t) ? 'on' : ''}"></i>`).join('');
      return `<div class="tcard${t === S.turn && S.phase !== 'end' ? ' turn' : ''}" style="--tc:${tm.color}">
        <div class="av">${tm.em}</div><div class="nm">${esc(tm.name)}</div><div class="who">${esc(who)}</div>
        <div class="row2"><div class="tray">${tray || '<span class="small" style="font-size:.75em">다 나갔어요</span>'}</div><div class="homes" title="집에 든 말">${homes}</div></div>
        ${S.winner === t ? '<span class="crown">👑</span>' : ''}
      </div>`;
    }).join('');
  }
  function renderPool(ses) {
    const S = ses.S, el = $('pool');
    if (!S.pool.length) {
      el.innerHTML = S.phase === 'end' ? '' : `<span class="hint">${S.extra > 1 ? `던질 수 있는 횟수 ${S.extra}번` : ''}</span>`;
      return;
    }
    const legal = S.phase === 'move' ? Y.legalActions(S) : [];
    const live = new Set(legal.map(a => Math.floor(a / Y.MAXK)));
    const act = canAct(ses) && S.phase === 'move';
    el.innerHTML = S.pool.map((k, i) => `<button class="chip k${k}${ses.ui.kind === k && act ? ' on' : ''}${S.phase === 'move' && !live.has(k) ? ' dead' : ''}" data-k="${k}" data-i="${i}">${NAMES[k]}<small>${k === 0 ? '뒤로 1' : STEPS[k] + '칸'}</small></button>`).join('')
      + (S.phase === 'throw' && S.extra > 0 ? `<span class="hint">+ ${S.extra}번 더 던져요</span>` : '');
  }
  function renderControls(ses) {
    const S = ses.S, mine = canAct(ses);
    const tb = $('throwBtn'), cf = $('confirm'), wm = $('waitMsg');
    const m = S.phase === 'end' ? null : member(ses, S.turn);
    tb.hidden = true; cf.hidden = true; wm.hidden = true;
    if (S.phase === 'end') {
      wm.hidden = false; wm.textContent = `${ses.teams[S.winner].em} ${ses.teams[S.winner].name} 승리!`;
      if (ses.cfg.mode === 'online' && ses.cfg.role !== 'host') {          // 결과 창을 닫았어도 다시 열어 준비할 수 있게
        const b = document.createElement('button'); b.className = 'btn'; b.style.marginLeft = '8px'; b.textContent = isSpect(ses) ? '✋ 낄래요 · 결과' : '✋ 준비 · 결과';
        b.onclick = () => openGuestResult(ses); wm.appendChild(b);
      }
      return;
    }
    if (mine && S.phase === 'throw') {
      tb.hidden = false; tb.disabled = false; tb.classList.add('pulse');
      tb.querySelector('.tw').textContent = S.pool.length || S.throwNo && S.extra > 0 && ses.lastBonus ? '한 번 더 던지기!' : '윷 던지기';
      return;
    }
    if (mine && S.phase === 'move') {
      cf.hidden = false;
      const mv = ses.ui.act != null ? moveInfo(S, ses.ui.act) : null;
      $('ctext').innerHTML = mv ? moveText(ses, mv) : '반짝이는 말이나 대기 말을 눌러 갈 곳을 고르세요';
      $('goBtn').disabled = !mv; $('cancelBtn').disabled = !mv && ses.ui.piece == null;
      return;
    }
    wm.hidden = false;
    if (ses.cfg.role === 'guest' && ses.sent) { wm.textContent = '방장에게 보냈어요…'; return; }
    if (ses.busy) { wm.innerHTML = `${esc(ses.teams[S.turn].em)} ${esc(ses.teams[S.turn].name)} · ${esc(m.kind === 'ai' ? TIER[m.tier || 'normal'].short + ' AI' : m.name)}`; return; }
    if (m.kind === 'ai') wm.innerHTML = `${TIER[m.tier || 'normal'].em} ${esc(ses.teams[S.turn].name)} <span class="thinking">${S.phase === 'throw' ? '던지는 중' : '생각 중'}</span>`;
    else wm.innerHTML = `${esc(ses.teams[S.turn].em)} <b>${esc(m.name)}</b> 차례예요<span class="thinking"></span>`;
  }
  function renderBar(ses) {
    const S = ses.S;
    $('sub').classList.remove('myturn'); $('stage').classList.remove('myturn');
    if (S.phase === 'end') { $('lbl').innerHTML = `👑 ${esc(ses.teams[S.winner].name)} 승리`; $('sub').textContent = `${S.turnNo + 1}번째 차례에서 끝`; return; }
    const tm = ses.teams[S.turn], m = member(ses, S.turn);
    const nm = tm.members.length > 1 || (m.kind === 'human' && m.name !== tm.name) ? ` · ${esc(m.name)}` : '';
    $('lbl').innerHTML = `<span class="dot" style="background:${tm.color}"></span>${esc(tm.name)}${nm}`;
    const spect = isSpect(ses);
    const mine = ses.cfg.mode !== 'local' && canAct(ses);                          // 내 차례: 금색으로 깜빡
    $('sub').classList.toggle('myturn', mine); $('stage').classList.toggle('myturn', mine);
    $('sub').textContent = (spect ? '👀 구경 중 · ' : '') + (S.phase === 'throw' ? (S.pool.length ? '한 번 더 던져요' : '던질 차례') : `말을 골라요 · ${S.pool.map(k => NAMES[k]).join(' · ')}`) + (mine && ses.turnLeft != null ? ` · ⏱${ses.turnLeft}` : '');
  }
  const isSpect = ses => ses.cfg.mode === 'online' && !ses.teams.some(t => t.members.some(x => x.uid === ses.cfg.net.uid));

  // ── 고르기 (사람) ─────────────────────────────────────────
  function moveInfo(S, a) {
    const { kind, piece } = Y.decode(a);
    const path = Y.pathOf(S, S.turn, piece, kind) || [];
    const dest = path.length ? path[path.length - 1] : -1;
    const { events } = Y.step(S, a);
    return { a, kind, piece, path, dest, from: S.pos[S.turn][piece], cap: events.filter(e => e.type === 'capture'), stack: events.some(e => e.type === 'stack'), home: dest === HOME };
  }
  function legalMoves(ses) {
    const S = ses.S;
    if (ses._lmKey === ses.seq + ':' + S.pool.join(',') + S.phase) return ses._lm;
    ses._lmKey = ses.seq + ':' + S.pool.join(',') + S.phase;
    ses._lm = S.phase === 'move' ? Y.legalActions(S).map(a => moveInfo(S, a)) : [];
    return ses._lm;
  }
  const HOME_XY = [87.5, 85.5];      // '집으로' 표시 자리 (참먹이 안쪽 빈 곳)
  const destName = d => (d === HOME ? '집' : Y.NODE_NAME[d] || '');
  function moveText(ses, mv) {
    const tm = ses.teams[ses.S.turn];
    const n = mv.from === WAIT ? '새 말' : Y.groupOf(ses.S, ses.S.turn, mv.piece).length > 1 ? `업은 말 ${Y.groupOf(ses.S, ses.S.turn, mv.piece).length}개` : '말';
    let s = `${tm.em} <b>${NAMES[mv.kind]}</b>${ro(NAMES[mv.kind]).slice(NAMES[mv.kind].length)} ${n} → ${mv.home ? '<b>집으로!</b>' : destName(mv.dest) ? `<b>${destName(mv.dest)}</b>` : `${mv.path.length}칸`}`;
    if (mv.cap.length) s += ` · <b style="color:#ffb4a4">${mv.cap.map(c => ses.teams[c.victim].em).join('')} 잡기!</b>`;
    else if (mv.stack) s += ' · 업기';
    return s;
  }
  function resetUi(ses) { ses.ui = { kind: null, piece: null, act: null }; ses._lmKey = null; clearMarks(); }
  function autoSelect(ses) {
    if (!canAct(ses) || ses.S.phase !== 'move') return;
    const mv = legalMoves(ses);
    const kinds = new Set(mv.map(x => x.kind));
    if (kinds.size === 1) ses.ui.kind = [...kinds][0];
    const pcs = new Set(mv.map(x => x.piece));
    if (pcs.size === 1) selectPiece(ses, [...pcs][0]);
    else renderAll(ses);
  }
  function selectPiece(ses, p) {
    const S = ses.S;
    const rep = Y.groupOf(S, S.turn, p)[0];
    const all = legalMoves(ses).filter(x => x.piece === rep);
    if (!all.length) { C.toast('이 말은 지금 못 움직여요'); return; }
    let mv = ses.ui.kind != null ? all.filter(x => x.kind === ses.ui.kind) : all;
    if (!mv.length) { ses.ui.kind = null; mv = all; }
    ses.ui.piece = rep; ses.ui.act = null;
    sfx('tap');
    // 같은 곳으로 가는 결과는 작은 것 하나만 (빽도 빼고)
    const byDest = new Map();
    for (const x of mv) { const o = byDest.get(x.dest); if (!o || (STEPS[x.kind] < STEPS[o.kind] && x.kind !== 0)) byDest.set(x.dest, x); }
    const list = [...byDest.values()];
    drawMarks(ses, list);
    if (list.length === 1) previewMove(ses, list[0]);
    renderAll(ses);
  }
  function drawMarks(ses, list) {
    const box = $('marks');
    box.innerHTML = '';
    for (const x of list) {
      const el = document.createElement('div');
      el.className = 'mark' + (x.home ? ' home' : '');
      const [px, py] = x.home ? HOME_XY : XY[x.dest];
      el.style.left = px + '%'; el.style.top = py + '%';
      el.dataset.a = x.a;
      el.innerHTML = `<b>${x.home ? NAMES[x.kind] + ' · 나기' : NAMES[x.kind]}</b>`;
      box.appendChild(el);
    }
  }
  function clearMarks() { $('marks').innerHTML = ''; }
  function previewMove(ses, mv) {
    clearPreview(ses, true);
    ses.ui.act = mv.a;
    const box = $('marks');
    let mk = box.querySelector(`.mark[data-a="${mv.a}"]`);
    if (!mk) { drawMarks(ses, [mv]); mk = box.querySelector('.mark'); }
    box.querySelectorAll('.mark').forEach(m => m.classList.toggle('on', m === mk));
    // 지나는 칸 점 + 내려앉을 자리에 흐린 말
    mv.path.forEach((n, i) => {
      if (n === HOME || i === mv.path.length - 1) return;
      const d = document.createElement('div'); d.className = 'pathdot prev'; d.style.left = XY[n][0] + '%'; d.style.top = XY[n][1] + '%'; d.style.animationDelay = i * 40 + 'ms';
      box.appendChild(d);
    });
    if (!mv.home) {
      const g = document.createElement('div'); g.className = 'tok ghost prev'; g.style.setProperty('--tc', ses.teams[ses.S.turn].color);
      g.style.left = XY[mv.dest][0] + '%'; g.style.top = XY[mv.dest][1] + '%';
      g.innerHTML = `<div class="bd"><span>${ses.teams[ses.S.turn].em}</span></div>`;
      $('toks').appendChild(g);
    }
    renderControls(ses);
  }
  function clearPreview(ses, keepMarks) {
    document.querySelectorAll('.prev').forEach(e => e.remove());
    if (!keepMarks) clearMarks();
    if (ses) ses.ui.act = null;
  }
  function cancelSel(ses) { clearPreview(ses); ses.ui.piece = null; ses.ui.act = null; renderAll(ses); }
  function cycleMove(ses, dir) {
    const mv = legalMoves(ses).filter(x => ses.ui.kind == null || x.kind === ses.ui.kind);
    if (!mv.length) return;
    let i = mv.findIndex(x => x.a === ses.ui.act);
    i = i < 0 ? (dir > 0 ? 0 : mv.length - 1) : (i + dir + mv.length) % mv.length;
    ses.ui.piece = mv[i].piece;
    drawMarks(ses, [mv[i]]);
    previewMove(ses, mv[i]);
    sfx('tick');
    renderAll(ses);
  }

  // 누르기
  $('toks').addEventListener('click', e => {
    const el = e.target.closest('.tok'); if (!el || el.classList.contains('ghost')) return;
    const ses = SES; if (!canAct(ses) || ses.S.phase !== 'move') return;
    if (+el.dataset.t !== ses.S.turn) return;
    selectPiece(ses, +el.dataset.i);
  });
  $('marks').addEventListener('click', e => {
    const el = e.target.closest('.mark'); if (!el) return;
    const ses = SES; if (!canAct(ses)) return;
    const a = +el.dataset.a;
    if (ses.ui.act === a) { sfx('pop'); submit(ses, a); return; }
    previewMove(ses, moveInfo(ses.S, a)); sfx('tick');
    renderAll(ses);
  });
  $('teams').addEventListener('click', e => {
    const el = e.target.closest('.w.can'); if (!el) return;
    const ses = SES; if (!canAct(ses)) return;
    selectPiece(ses, +el.dataset.i);
  });
  $('pool').addEventListener('click', e => {
    const el = e.target.closest('.chip'); if (!el) return;
    const ses = SES; if (!canAct(ses) || ses.S.phase !== 'move' || el.classList.contains('dead')) return;
    const k = +el.dataset.k;
    ses.ui.kind = ses.ui.kind === k ? null : k;
    sfx('tap');
    const p = ses.ui.piece;
    clearPreview(ses);
    if (p != null && legalMoves(ses).some(x => x.piece === p && (ses.ui.kind == null || x.kind === ses.ui.kind))) selectPiece(ses, p);
    else {
      ses.ui.piece = null;
      const mv = legalMoves(ses).filter(x => ses.ui.kind == null || x.kind === ses.ui.kind);
      if (new Set(mv.map(x => x.piece)).size === 1) selectPiece(ses, mv[0].piece); else renderAll(ses);
    }
  });
  $('throwBtn').onclick = () => { const ses = SES; if (canAct(ses) && ses.S.phase === 'throw') submit(ses, A_THROW); };
  $('mat').addEventListener('click', () => { const ses = SES; if (canAct(ses) && ses.S.phase === 'throw') submit(ses, A_THROW); });
  $('goBtn').onclick = () => { const ses = SES; if (ses && ses.ui.act != null) { sfx('pop'); submit(ses, ses.ui.act); } };
  $('cancelBtn').onclick = () => { if (SES) { sfx('tap'); cancelSel(SES); } };
  document.addEventListener('keydown', e => {
    const ses = SES;
    if (!ses || $('play').hidden || document.querySelector('.overlay:not([hidden]), .arn-ov:not([hidden])')) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!canAct(ses)) { if (e.key === ' ') e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (ses.S.phase === 'throw') submit(ses, A_THROW);
      else if (ses.ui.act != null) { sfx('pop'); submit(ses, ses.ui.act); }
      else if ($('tips').querySelector('.mark')) $('tips').querySelector('.mark').click();
      else cycleMove(ses, 1);
    } else if (ses.S.phase === 'move' && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); cycleMove(ses, 1); }
    else if (ses.S.phase === 'move' && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); cycleMove(ses, -1); }
    else if (e.key === 'Escape') cancelSel(ses);
  });

  // ── AI 선생님 ─────────────────────────────────────────────
  // 🧑‍🏫 AI 선생님 단추 하나로 켜고 끔 (따로 힌트 기능 없음). 켜 두면 내 차례마다 추천 수와 까닭을 창(common/coach.js)에 쓰고 판 위에 초록 표시
  // 혼자·한 기기에서는 늘 단추가 있고, 친구랑에서는 방장이 대기실에서 켰을 때(cfg.coach)만. common/coach.js 가 없으면 단추 옆 글로
  let CP = null;
  const coachPref = () => { try { return (JSON.parse(localStorage.getItem('game.coach.yut') || 'null') || {}).v === 1; } catch (e) { return false; } };
  function ensureCoach() {
    if (CP || !window.CoachPanel || typeof CoachPanel.create !== 'function') return CP;
    // 처음 자리: 멍석 오른쪽 위 (윷가락은 가운데라 덜 가리고, 던지기·선생님 단추는 안 가림). 끌어 옮기면 그 자리를 기억
    const r = $('mat').getBoundingClientRect();
    const bottom = r.height ? Math.max(8, Math.round(innerHeight - r.top - 8 - Math.min(130, Math.max(90, r.height - 16)))) : 88;
    const right = r.width ? Math.max(8, Math.round(innerWidth - r.right + 8)) : 10;
    try {
      CP = CoachPanel.create({ game: 'yut', title: 'AI 선생님', bottom, right, startHidden: true });
      CoachPanel.button($('coachBtn'), CP, { onToggle: () => { if (SES) { SES._coachKey = null; renderAll(SES); } } });
    } catch (e) { CP = null; }
    return CP;
  }
  const coachOn = () => (CP ? CP.visible : !!opt.coachOn);
  function coachOut(html) { if (CP) { if (html == null) CP.hide(); else CP.set(html); } }
  function clearTips() { $('tips').innerHTML = ''; document.querySelectorAll('.tok.tip, .w.tip').forEach(e => e.classList.remove('tip')); }
  function renderCoach(ses) {
    const box = $('coach'), btn = $('coachBtn'), txt = $('coachTxt');
    const allowed = !!ses.cfg.coach && ses.S.phase !== 'end' && (ses.cfg.mode !== 'online' || ses.teams.some(t => t.members.some(m => m.uid === ses.cfg.net.uid)));
    ensureCoach();
    box.hidden = !allowed;
    if (!allowed) { clearTips(); if (CP && CP.visible) CP.hide(); return; }
    if (CP && !ses._cpInit) { ses._cpInit = true; if (coachPref() && !CP.visible) CP.show(); }
    if (!CP) btn.setAttribute('aria-pressed', String(!!opt.coachOn));
    const on = coachOn();
    const say = html => { if (CP) { CP.set(html); txt.hidden = true; } else { txt.hidden = !on; txt.innerHTML = html; } };
    if (!on) { txt.hidden = true; clearTips(); return; }
    if (!(canAct(ses) && ses.S.phase === 'move')) {
      clearTips();
      say(canAct(ses) && ses.S.phase === 'throw' ? '던지고 나면 좋은 수를 알려 드릴게요' : ses.busy ? '…' : '내 차례가 오면 좋은 수를 알려 드릴게요');
      return;
    }
    const key = ses.seq + ':' + ses.S.pool.join(',');
    if (ses._coachKey !== key) { ses._coachKey = key; ses._sug = AI.suggest(ses.S, ses.teams.map(t => t.name)); }
    const sug = ses._sug;
    if (!sug || sug.throw) { clearTips(); return; }
    const tm = ses.teams[ses.S.turn];
    const label = `${NAMES[sug.kind]}${ro(NAMES[sug.kind]).slice(NAMES[sug.kind].length)} ${sug.from === WAIT ? '새 말' : tm.em + ' 말'}${sug.dest === HOME ? ' 내보내기' : destName(sug.dest) ? ' → ' + destName(sug.dest) : ` ${sug.path.length}칸 앞으로`}`;
    say(`<b>${esc(label)}</b><br>${esc(sug.reason)}${CP ? '<br><span style="opacity:.7;font-size:12px">판의 초록 표시를 누르면 미리 보여요</span>' : ''}`);
    // 판 위 표시: 추천 말 초록 테두리 + 갈 곳 초록 고리 (누르면 미리 보기, 한 번 더 누르면 옮기기)
    clearTips();
    if (sug.from !== WAIT) for (const j of Y.groupOf(ses.S, ses.S.turn, sug.piece)) ses.tokEl[ses.S.turn][j].classList.add('tip');
    else { const w = $('teams').querySelector(`.w[data-t="${ses.S.turn}"][data-i="${sug.piece}"]`); if (w) w.classList.add('tip'); }
    if (ses.ui.act === sug.a) return;      // 이미 그 수를 미리 보는 중이면 겹치지 않게
    const el = document.createElement('div');
    el.className = 'mark tipm' + (sug.dest === HOME ? ' home' : '');
    const [px, py] = sug.dest === HOME ? HOME_XY : XY[sug.dest];
    el.style.left = px + '%'; el.style.top = py + '%'; el.dataset.a = sug.a;
    el.innerHTML = `<b>🧑‍🏫 ${NAMES[sug.kind]}</b>`;
    $('tips').appendChild(el);
  }
  // common/coach.js 가 없을 때만 직접 켜고 끔 (있으면 CoachPanel.button 이 맡음)
  $('coachBtn').addEventListener('click', () => {
    if (CP) return;
    opt.coachOn = opt.coachOn ? 0 : 1; saveOpt('coachOn'); sfx('tap');
    if (SES) { SES._coachKey = null; renderAll(SES); }
  });
  $('tips').addEventListener('click', e => {
    const el = e.target.closest('.mark'); if (!el) return;
    const ses = SES; if (!canAct(ses)) return;
    const mv = moveInfo(ses.S, +el.dataset.a);
    if (ses.ui.act === mv.a) { sfx('pop'); submit(ses, mv.a); return; }
    ses.ui.piece = mv.piece; drawMarks(ses, [mv]); previewMove(ses, mv); sfx('tick'); renderAll(ses);
  });

  // ── 움직임 · 소리 ─────────────────────────────────────────
  function popText(txt, cls = '') {
    const el = $('pop');
    el.textContent = txt; el.className = 'combo ' + cls; el.hidden = false;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(popText.t); popText.t = setTimeout(() => { el.hidden = true; }, 1150);
  }
  function showCall(big, sub, cls = '') {
    const el = $('call');
    el.className = 'call ' + cls;
    el.innerHTML = `<b>${esc(big)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    el.hidden = false; void el.offsetWidth; el.classList.add('go');
  }
  const hideCall = () => { $('call').hidden = true; };

  // 진동은 이 화면을 한 번이라도 누른 뒤에만 (안 누른 채 부르면 브라우저가 막고 오류를 남김)
  const buzz = ms => { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; } catch (e) {} C.vibrate(ms); };
  async function animate(ses, prev, events) {
    for (const e of events) {
      if (!ses.alive) throw new Cancel();
      if (e.type === 'throw') {
        hideCall();
        ses.lastBonus = false;
        await toss(ses, e.sticks);
        const k = e.kind;
        playResultSound(k);
        showCall(CALL[k], CALLSUB[k], k >= 4 ? 'big' : k === 0 ? 'bad' : '');
        if (k >= 4) buzz(30);
        renderPool(ses);
        await ses.wait(D(k >= 4 ? 900 : 650));
      } else if (e.type === 'bonus') {
        ses.lastBonus = true;
        if (e.why === 'capture') { await ses.wait(D(150)); }
      } else if (e.type === 'move') {
        hideCall();
        await animMove(ses, e);
      } else if (e.type === 'capture') {
        sfx('catch');
        popText(`${ses.teams[e.team].em} 잡았다!`);
        buzz(40);
        const els = e.pieces.map(i => ses.tokEl[e.victim][i]);
        await Promise.all(els.map(el => el.animate([
          { transform: 'scale(1) rotate(0)', opacity: 1 },
          { transform: 'translateY(-70%) scale(1.25) rotate(-25deg)', opacity: 1, offset: 0.35 },
          { transform: 'translateY(-160%) scale(.3) rotate(60deg)', opacity: 0 },
        ], { duration: D(560), easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {})));
        els.forEach(el => { el.hidden = true; el.getAnimations().forEach(a => a.cancel()); });
        await ses.wait(D(250));
      } else if (e.type === 'stack') {
        sfx('stack');
        popText(`업었다! ×${e.pieces.length}`, 'small');
        await ses.wait(D(380));
      } else if (e.type === 'home') {
        sfx('home');
        popText(e.pieces.length > 1 ? `${e.pieces.length}동사니 났다!` : '났다!');
        await ses.wait(D(420));
      } else if (e.type === 'forfeit') {
        showCall('쉬어 가요', e.kinds.includes(0) ? '빽도로 움직일 말이 없어요' : '움직일 수 있는 말이 없어요', 'bad');
        sfx('bad');
        await ses.wait(D(900));
      } else if (e.type === 'turn') {
        renderAll(ses);
        await announceTurn(ses);
      } else if (e.type === 'win') {
        renderAll(ses);
      }
      renderTokens(ses); renderTeams(ses); renderPool(ses);
    }
  }
  async function announceTurn(ses) {
    const S = ses.S; if (S.phase === 'end') return;
    const tm = ses.teams[S.turn], m = member(ses, S.turn);
    sfx('turn');
    const sub = m.kind === 'ai' ? `${TIER[m.tier || 'normal'].em} AI가 던져요` : (tm.members.length > 1 || m.name !== tm.name) ? `${iga(m.name)} 던져요` : (ses.cfg.mode === 'ai' || isMine(ses, m)) && humanTeams(ses) === 1 ? '내 차례!' : '던질 차례예요';
    showCall(`${tm.em} ${tm.name}`, sub, 'turnc');
    await ses.wait(D(isMine(ses, m) && humanTeams(ses) > 1 ? 900 : 520));
  }
  async function animMove(ses, e) {
    const els = e.pieces.map(i => ses.tokEl[e.team][i]);
    const step = D(e.path.length > 3 ? 190 : 230);
    if (e.from === WAIT) {
      els.forEach(el => { el.hidden = false; el.classList.add('fly'); el.style.left = XY[20][0] + '%'; el.style.top = XY[20][1] + '%'; el.style.zIndex = 6; });
      await Promise.all(els.map(el => el.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: D(220), easing: 'ease-out' }).finished.catch(() => {})));
    }
    els.forEach((el, k) => { el.classList.remove('fly'); el.style.transition = `left ${step}ms ease-in-out, top ${step}ms ease-in-out`; el.style.zIndex = 6 + k; const nb = el.querySelector('.n'); if (nb) nb.remove(); });
    let n = 0;
    for (const node of e.path) {
      const [x, y] = node === HOME ? [100, 108] : XY[node];
      els.forEach((el, k) => {
        el.style.left = x + '%'; el.style.top = `calc(${y}% - ${k * 2.3}cqw)`;
        el.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-38%) scale(1.13)', offset: 0.45 }, { transform: 'translateY(0) scale(1)' }], { duration: step, easing: 'ease-in-out' });
      });
      sfx(e.back ? 'backhop' : 'hop', { pitch: 1 + n * 0.06 });
      n++;
      await ses.wait(step + 10);
    }
    if (e.to === HOME) {
      await Promise.all(els.map(el => el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'translateY(-60%) scale(1.4)', opacity: 0 }], { duration: D(380), easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {})));
      els.forEach(el => { el.hidden = true; el.getAnimations().forEach(a => a.cancel()); });
    }
    els.forEach(el => { el.style.transition = ''; });
  }

  // 윷가락 (3D 흉내: 긴 축으로 뒤집히는 판 둘 + 공중에서 재주넘기)
  const STK = { el: [], sh: [], st: [] };
  function buildSticks() {
    const box = $('sticks');
    if (STK.el.length) return;
    box.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const sh = document.createElement('div'); sh.className = 'shd'; box.appendChild(sh);
      const el = document.createElement('div'); el.className = 'stk';
      el.innerHTML = `<div class="f front">${i === 0 ? '<i>✕</i><em>빽</em><i>✕</i>' : '<i>✕</i><i>✕</i><i>✕</i>'}</div><div class="f back"></div>`;
      box.appendChild(el);
      STK.el.push(el); STK.sh.push(sh);
      STK.st.push({ x: 0, y: 0, rz: 0, ry: [0, 180, 0, 0][i] });
    }
    restSticks();
  }
  const stkT = s => `translate(${s.x}px, ${s.y}px) rotateZ(${s.rz}deg) rotateX(${s.rx || 0}deg) rotateY(${s.ry}deg) scale(${s.sc || 1})`;
  function stickGeom() {
    const r = $('mat').getBoundingClientRect();
    const horiz = r.width > r.height * 1.5;
    const W = horiz ? r.height : r.width, H = horiz ? r.width : r.height;   // 막대 기준 (horiz 면 상자를 90° 돌림)
    const sh = Math.max(40, Math.min(H * 0.7, W * 0.62 / 1.25 / 0.21 / 4 * 1.25, 420));
    return { horiz, W, H, sh, sw: sh * 0.21, gap: sh * 0.21 * 1.55 };
  }
  function restSticks() {
    const g = stickGeom(), box = $('sticks');
    $('mat').style.setProperty('--mh', $('mat').getBoundingClientRect().height + 'px');
    box.style.setProperty('--sh', g.sh + 'px'); box.style.setProperty('--sw', g.sw + 'px');
    if (g.horiz) { box.style.inset = 'auto'; box.style.left = '50%'; box.style.top = '50%'; box.style.width = g.W + 'px'; box.style.height = g.H + 'px'; box.style.transform = 'translate(-50%,-50%) rotate(90deg)'; }
    else { box.style.inset = '0'; box.style.left = ''; box.style.top = ''; box.style.width = ''; box.style.height = ''; box.style.transform = ''; }
    STK.st.forEach((s, i) => {
      s.x = (i - 1.5) * g.gap + (s.jx || 0); s.y = s.jy || 0;
      STK.el[i].style.transform = stkT(s);
      STK.sh[i].style.transform = `translate(${s.x + 4}px, ${s.y + 6}px) rotateZ(${s.rz}deg)`;
      STK.sh[i].style.opacity = '1';
    });
  }
  async function toss(ses, sticks) {
    const g = stickGeom();
    sfx('toss');
    const dur = D(1150);
    const anims = [];
    sticks.forEach((flat, i) => {
      const s = STK.st[i];
      const from = { ...s, rx: 0, sc: 1 };
      const dir = i % 2 ? 1 : -1;
      const jx = (Math.random() - 0.5) * g.gap * 0.5, jy = (Math.random() - 0.5) * g.sh * 0.12;
      const rzf = (Math.random() - 0.5) * 22 + dir * 3;
      const ryBase = flat ? 0 : 180;
      const ryEnd = ryBase + 360 * (2 + (i % 2)) * dir;
      const up = g.horiz ? g.W : g.H;      // 위로 솟는 거리 (가로 멍석은 상자를 돌려서 화면 위쪽 = 상자의 -x)
      const mid = g.horiz
        ? { x: (i - 1.5) * g.gap * 0.4 - up * 0.75, y: (i - 1.5) * g.sh * 0.08, rz: s.rz + dir * 70, rx: 180 + i * 25, ry: from.ry + (ryEnd - from.ry) * 0.55, sc: 1.3 }
        : { x: (i - 1.5) * g.gap * 0.5, y: -up * 0.55, rz: s.rz + dir * 70, rx: 180 + i * 25, ry: from.ry + (ryEnd - from.ry) * 0.55, sc: 1.32 };
      const land = { x: (i - 1.5) * g.gap + jx, y: jy, rz: rzf, rx: 360, ry: ryEnd, sc: 1 };
      const bounce = { ...land, y: jy - g.sh * 0.07, rz: rzf + dir * 2 };
      const kf = [
        { transform: stkT(from), offset: 0 },
        { transform: stkT(mid), offset: 0.42, easing: 'cubic-bezier(.3,0,.7,1)' },
        { transform: stkT(land), offset: 0.8, easing: 'ease-out' },
        { transform: stkT(bounce), offset: 0.89, easing: 'ease-in' },
        { transform: stkT(land), offset: 1 },
      ];
      const delay = i * D(45);
      anims.push(STK.el[i].animate(kf, { duration: dur, delay, fill: 'forwards' }).finished.catch(() => {}));
      STK.sh[i].animate([
        { transform: `translate(${from.x + 4}px, ${from.y + 6}px) rotateZ(${from.rz}deg) scale(1)`, opacity: 1 },
        { transform: g.horiz ? `translate(${from.x + 10}px, ${mid.y}px) rotateZ(${mid.rz}deg) scale(.55)` : `translate(${mid.x + 30}px, ${g.sh * 0.1}px) rotateZ(${mid.rz}deg) scale(.55)`, opacity: 0.25, offset: 0.42 },
        { transform: `translate(${land.x + 4}px, ${land.y + 6}px) rotateZ(${rzf}deg) scale(1)`, opacity: 1, offset: 0.8 },
        { transform: `translate(${land.x + 4}px, ${land.y + 6}px) rotateZ(${rzf}deg) scale(1)`, opacity: 1 },
      ], { duration: dur, delay, fill: 'forwards' });
      const tm = setTimeout(() => { if (ses.alive) sfx('clack', { pitch: 0.85 + i * 0.09 + Math.random() * 0.06 }); }, delay + dur * 0.8);
      ses.timers.add(tm);
      Object.assign(s, { jx, jy, rz: rzf, ry: ryBase, rx: 0, sc: 1 });
    });
    await Promise.all(anims);
    if (!ses.alive) throw new Cancel();
    STK.el.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    STK.sh.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    restSticks();
  }

  // 소리 (Web Audio 합성 — 원목 '딱', 장구 '덩·덕', 오음계)
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7];
  C.sfx.add('toss', (t, o, S) => { S.noise(t, 0.32, { vol: 0.2, type: 'bandpass', f: 500, f2: 2600, q: 0.7 }); S.noise(t + 0.05, 0.08, { vol: 0.18, type: 'highpass', f: 2500 }); });
  C.sfx.add('clack', (t, o, S) => {
    const p = o.pitch || 1;
    S.noise(t, 0.045, { vol: 0.6, type: 'bandpass', f: 1500 * p, q: 6 });
    S.tone(t, 640 * p, 0.08, { type: 'triangle', vol: 0.2, f2: 430 * p });
    S.tone(t + 0.07, 900 * p, 0.04, { type: 'triangle', vol: 0.07, f2: 700 * p });
  });
  C.sfx.add('hop', (t, o, S) => { const p = o.pitch || 1; S.tone(t, 480 * p, 0.08, { type: 'triangle', vol: 0.12, f2: 720 * p }); S.noise(t + 0.06, 0.03, { vol: 0.22, type: 'bandpass', f: 2200, q: 3 }); });
  C.sfx.add('backhop', (t, o, S) => { S.tone(t, 620, 0.16, { type: 'sine', vol: 0.14, f2: 260 }); });
  C.sfx.add('dung', (t, o, S) => { S.tone(t, 98, 0.5, { type: 'sine', vol: 0.5, f2: 68 }); S.noise(t, 0.08, { vol: 0.3, type: 'lowpass', f: 420 }); });
  C.sfx.add('turn', (t, o, S) => { S.tone(t, PENTA[2], 0.12, { type: 'triangle', vol: 0.09 }); S.tone(t + 0.09, PENTA[4], 0.16, { type: 'triangle', vol: 0.09 }); });
  C.sfx.add('catch', (t, o, S) => { S.noise(t, 0.1, { vol: 0.55, type: 'lowpass', f: 3000, f2: 700 }); S.tone(t, 160, 0.18, { vol: 0.3, f2: 70 }); S.tone(t + 0.12, PENTA[4], 0.12, { type: 'square', vol: 0.05 }); S.tone(t + 0.2, PENTA[6], 0.18, { type: 'square', vol: 0.05 }); });
  C.sfx.add('stack', (t, o, S) => { S.tone(t, 600, 0.09, { vol: 0.18, f2: 1100 }); S.tone(t + 0.09, 760, 0.11, { vol: 0.16, f2: 1400 }); });
  C.sfx.add('home', (t, o, S) => { [0, 2, 4, 5].forEach((n, i) => S.tone(t + i * 0.07, PENTA[n], 0.2, { type: 'triangle', vol: 0.12 })); });
  C.sfx.add('res', (t, o, S) => {
    const k = o.k;
    const deok = (tt, v = 0.4) => { S.noise(tt, 0.06, { vol: v, type: 'highpass', f: 2300 }); S.tone(tt, 340, 0.05, { type: 'triangle', vol: 0.1 }); };
    const dung = (tt, v = 0.45) => { S.tone(tt, 98, 0.45, { type: 'sine', vol: v, f2: 66 }); S.noise(tt, 0.07, { vol: 0.25, type: 'lowpass', f: 420 }); };
    if (k === 0) { S.tone(t, 700, 0.22, { type: 'sine', vol: 0.16, f2: 300 }); S.tone(t + 0.2, 300, 0.25, { type: 'sine', vol: 0.12, f2: 220 }); return; }
    if (k <= 3) { for (let i = 0; i < k; i++) S.tone(t + i * 0.09, PENTA[i * 2], 0.18, { type: 'triangle', vol: 0.13 }); deok(t + k * 0.09, 0.25); return; }
    // 윷 · 모: 덩 기덕 + 오음계 오르기
    dung(t); deok(t + 0.18); deok(t + 0.27); if (k === 5) { dung(t + 0.36); deok(t + 0.5); deok(t + 0.56); deok(t + 0.62); }
    const st0 = t + (k === 5 ? 0.7 : 0.4);
    PENTA.slice(0, k === 5 ? 7 : 5).forEach((f, i) => S.tone(st0 + i * 0.06, f, 0.2, { type: 'triangle', vol: 0.12 }));
  });
  const playResultSound = k => sfx('res', { k });

  // ── 결과 ─────────────────────────────────────────────────
  // 🏆 랭킹: 혼자(AI)·친구랑 판만 — 각자 자기 기기에서 한 번. 이기면 w, 아니면 l, beat = 난 말이 나보다 적은 팀 수
  function rankReport(ses) {
    try {
      const S = ses.S, mode = ses.cfg.mode;
      if (!window.GRank || !S || S.phase !== 'end' || ses.rankG === ses.games || (mode !== 'ai' && mode !== 'online')) return;
      ses.rankG = ses.games;
      const mt = ses.teams.findIndex(tm => tm.members.some(m => m.kind === 'human' && (mode === 'ai' || m.uid === ses.cfg.net.uid)));
      if (mt < 0) return;                                            // 구경만 함
      const hc = t => Y.homeCount(S, t), mine = hc(mt), opp = [];
      const aiM = mode === 'ai' ? ses.teams.flatMap(tm => tm.members).find(m => m.kind === 'ai') : null, tier = aiM && aiM.tier;      // AI 판은 난이도별로도 셈
      if (mode === 'online') ses.teams.forEach((tm, t) => { if (t !== mt) tm.members.forEach(m => { if (m.kind === 'human' && m.uid && !m.sub) opp.push({ uid: m.uid, res: t === S.winner ? 'l' : mt === S.winner ? 'w' : mine > hc(t) ? 'w' : mine < hc(t) ? 'l' : 'd' }); }); });
      GRank.result('yut', { mode: mode === 'ai' ? 'ai' : 'friend', res: S.winner === mt ? 'w' : 'l', beat: ses.teams.filter((_, t) => t !== mt && hc(t) < mine).length, tier, opp: mode === 'online' ? opp : undefined });
    } catch (e) { console.warn('[rank]', e); }
  }
  function closeResult() { document.querySelectorAll('.overlay.yres').forEach(o => o.remove()); }
  function resultHtml(ses) {
    const S = ses.S, w = ses.teams[S.winner];
    const rows = ses.teams.map((tm, t) => `<tr><td style="text-align:left">${tm.em} ${esc(tm.name)}${t === S.winner ? ' 👑' : ''}</td><td class="n">${Y.homeCount(S, t)}/${S.k}</td><td class="n">${S.stat.caps[t]}</td><td class="n">${S.stat.yut[t]}·${S.stat.mo[t]}</td></tr>`).join('');
    const ppl = w.members.filter(m => m.kind === 'human').map(m => m.name);
    return `<div class="winbig" style="--tc:${w.color}"><div class="av">${w.em}</div><b>${esc(w.name)} 승리!</b>${ppl.length > 1 ? `<span class="small">${esc(ppl.join(' · '))}</span>` : ''}</div>
      <table class="st"><tr><th style="text-align:left">팀</th><th>난 말</th><th>잡은 말</th><th>윷·모</th></tr>${rows}</table>
      <p class="small">${S.turnNo + 1}번째 차례에 끝났어요</p>`;
  }
  function showResult(ses) {
    const S = ses.S, w = ses.teams[S.winner];
    const iWon = ses.cfg.mode === 'online' ? w.members.some(m => m.uid === ses.cfg.net.uid) : w.members.some(m => m.kind === 'human');
    const allAi = ses.teams.every(t => t.members.every(m => m.kind === 'ai'));
    if (iWon || ses.cfg.mode === 'local' || allAi) { sfx('win'); C.confetti(); } else sfx('lose');
    return new Promise((resolve, reject) => {
      const online = ses.cfg.mode === 'online';
      // 친구랑 방장: 친구들이 '준비'하면 시작 (기다리기 싫으면 바로) — 혼자 먼저 넘어가지 않음
      const buttons = online
        ? [{ label: '대기실로', onClick: () => resolve(false) }, { label: '안 기다리고 시작', onClick: () => resolve(true) }, { label: '다음 판 시작 ▶', primary: true, onClick: () => resolve(true) }]
        : [{ label: '메뉴로', onClick: () => resolve(false) }, { label: '한 판 더', primary: true, onClick: () => resolve(true) }];
      const close = C.modal({
        title: '🎉 한 판 끝!', html: resultHtml(ses) + (online ? '<div class="rdy" id="yutRdy"></div>' : ''), cls: 'yres',
        buttons,
        onClose: () => { ses.drawReady = null; resolve(false); },
      });
      if (online) {
        const bs = [...document.querySelectorAll('.overlay.yres .row .btn')];
        ses.drawReady = () => drawReady(ses, bs[2], bs[1]);
        ses.drawReady();
      }
      ses.offs.push(() => { try { close(); } catch (e) {} reject(new Cancel()); });
    });
  }
  // 판 사이 준비 목록 (방장은 고르고, 친구는 보기만): 팀 사람마다 ✅/⏳/🔌 · 구경꾼 (방장이 체크하면 다음 판부터 같이)
  function drawReady(ses, goBtn, forceBtn) {
    const box = $('yutRdy');
    if (SES !== ses || !box || !box.isConnected) return;
    const net = ses.cfg.net, pl = net.players || {}, host = ses.cfg.role === 'host', me = net.uid;
    const people = []; ses.teams.forEach((tm, t) => tm.members.forEach(m => { if (m.uid) people.push({ m, t, tm }); }));
    const humansLeft = uid => people.filter(x => x.m.uid !== uid && !x.m.drop).length;
    const chips = people.map(({ m, tm }) => {
      const nm = esc(`${tm.em} ${m.name}`);
      if (m.uid === me && host) return `<span class="ok">👑 ${nm}</span>`;
      const gone = !pl[m.uid], ok = ses.rdy.has(m.uid) || m.sub;
      const tools = host && gone && !m.sub ? ` <button type="button" data-ai="${esc(m.uid)}">🤖 AI</button>${humansLeft(m.uid) >= 2 ? ` <button type="button" data-drop="${esc(m.uid)}">👋 빼기</button>` : ''}` : '';
      return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${nm}${tools}</span>`;
    });
    const ws = watchersOf(ses);
    const wl = ws.map(u => host
      ? `<label><input type="checkbox" data-join="${esc(u)}" ${ses.joinPick[u] ? 'checked' : ''}> ${esc((pl[u] && pl[u].name) || '친구')}${ses.rdy.has(u) ? ' ✋' : ''}</label>`
      : `<span>${esc((pl[u] && pl[u].name) || '친구')}${ses.rdy.has(u) ? ' ✋' : ''}</span>`).join('');
    box.innerHTML = `<div class="rdy-row">${chips.join('')}</div>${ws.length ? `<div class="rdy-w">👀 구경 ${ws.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
    if (host) {
      const need = people.filter(x => x.m.uid !== me && !x.m.sub), k = need.filter(x => ses.rdy.has(x.m.uid)).length, all = k === need.length;
      if (goBtn) { goBtn.disabled = !all; goBtn.textContent = all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${need.length})`; }
      if (forceBtn) forceBtn.hidden = all;
      box.querySelectorAll('[data-join]').forEach(c => { c.onchange = () => { ses.joinPick[c.dataset.join] = c.checked; }; });
      box.querySelectorAll('[data-ai]').forEach(b => { b.onclick = () => subAI(ses, b.dataset.ai, false); });
      box.querySelectorAll('[data-drop]').forEach(b => { b.onclick = () => subAI(ses, b.dataset.drop, true); });
    } else if (goBtn) {
      const on = ses.rdy.has(me);
      goBtn.disabled = on;
      goBtn.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : isSpect(ses) ? '✋ 다음 판에 낄래요' : '✋ 준비';
    }
  }
  const watchersOf = ses => Object.keys((ses.cfg.net && ses.cfg.net.players) || {}).filter(u => !ses.teams.some(t => t.members.some(m => m.uid === u)));

  // ── 친구랑 ───────────────────────────────────────────────
  const DEF = { teams: 2, pieces: 4, backdo: 1, coach: false, ai: 'normal', assign: {} };   // coach 는 ArenaUI 대기실의 'AI 선생님' 스위치가 정함
  const sortedPlayers = players => Object.entries(players || {}).map(([uid, p]) => ({ uid, name: (p && p.name) || '친구', t: (p && p.t) || 0, watch: p && p.watch })).filter(p => !p.watch).sort((a, b) => a.t - b.t);
  // 사람을 팀에 나누기: 방장이 정한 것 먼저, 나머지는 들어온 순서대로 가장 적은 팀에
  function assignTeams(plist, c) {
    const n = c.teams, cnt = new Array(n).fill(0), res = {};
    for (const p of plist) { const a = c.assign && c.assign[p.uid]; if (a != null && a >= 0 && a < n) { res[p.uid] = a; cnt[a]++; } }
    for (const p of plist) if (res[p.uid] == null) { let b = 0; for (let i = 1; i < n; i++) if (cnt[i] < cnt[b]) b = i; res[p.uid] = b; cnt[b]++; }
    return res;
  }
  function teamsFromCfg(plist, c) {
    const as = assignTeams(plist, c);
    return Array.from({ length: c.teams }, (_, t) => {
      const ms = plist.filter(p => as[p.uid] === t).map(p => ({ name: p.name, kind: 'human', uid: p.uid }));
      return { ...TEAMS[t], members: ms.length ? ms : [{ name: TIER[c.ai].name, kind: 'ai', tier: c.ai }] };
    });
  }
  const LOB = { el: null, net: null, canEdit: false, update: null };
  function lobbyRender(el, cfg, canEdit, update) {
    LOB.el = el; LOB.canEdit = canEdit; LOB.update = update;
    const net = window.ArenaUI && ArenaUI.net;
    if (net && LOB.net !== net) {
      LOB.net = net;
      net.on('players', () => { if (LOB.el && LOB.el.isConnected && !ArenaUI.playing) lobbyRender(LOB.el, (net.meta && net.meta.cfg) || {}, LOB.canEdit, LOB.update); });
    }
    const c = { ...DEF, ...(cfg || {}) };
    const plist = sortedPlayers(net && net.players);
    const as = assignTeams(plist, c);
    el.innerHTML = `<div class="ylob">
      <div class="optrow"><span class="small">팀 수</span><div class="seg" data-s="teams"></div></div>
      <div class="teamsbox">${Array.from({ length: c.teams }, (_, t) => {
        const ms = plist.filter(p => as[p.uid] === t);
        return `<div class="tb" style="--tc:${TEAMS[t].color}"><b>${TEAMS[t].em} ${TEAMS[t].name}</b>${ms.length ? ms.map(p => `<button class="pc" data-uid="${esc(p.uid)}" ${canEdit ? '' : 'disabled'}><span>${esc(p.name)}</span></button>`).join('') : `<span class="ai">${TIER[c.ai].em} AI가 맡아요</span>`}</div>`;
      }).join('')}</div>
      ${canEdit ? `<p class="arn-soft" style="font-size:12.5px">이름을 누르면 다음 팀으로 옮겨요 · <button class="btn ghost" data-auto style="padding:2px 6px;font-size:12.5px">자동으로 나누기</button></p>` : ''}
      <div class="optrow"><span class="small">빈 팀 AI</span><div class="seg" data-s="ai"></div></div>
      <div class="optrow"><span class="small">말 개수</span><div class="seg" data-s="pieces"></div></div>
      <div class="optrow"><span class="small">빽도</span><div class="seg" data-s="backdo"></div></div>
    </div>`;
    const up = p => { if (canEdit && update) update(p); };
    segBtns(el.querySelector('[data-s="teams"]'), [[2, '2팀'], [3, '3팀'], [4, '4팀']], c.teams, v => up({ teams: +v }), canEdit);
    segBtns(el.querySelector('[data-s="ai"]'), ['easy', 'normal', 'hard'].map(k => [k, TIER[k].em + ' ' + TIER[k].short]), c.ai, v => up({ ai: v }), canEdit);
    segBtns(el.querySelector('[data-s="pieces"]'), [[2, '2개'], [3, '3개'], [4, '4개']], c.pieces, v => up({ pieces: +v }), canEdit);
    segBtns(el.querySelector('[data-s="backdo"]'), [[1, '켬'], [0, '끔']], c.backdo ? 1 : 0, v => up({ backdo: +v }), canEdit);
    if (canEdit) {
      el.querySelectorAll('.pc').forEach(b => { b.onclick = () => { sfx('tap'); const u = b.dataset.uid; up({ assign: { ...(c.assign || {}), [u]: ((as[u] || 0) + 1) % c.teams } }); }; });
      const au = el.querySelector('[data-auto]'); if (au) au.onclick = () => { sfx('tap'); up({ assign: {} }); };
    }
  }
  function openFriend() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }
  function friendOpts() {
    return {
      game: 'yut', title: '윷놀이', max: 8, min: 2, coach: true,
      describe: (n, c) => {
        const t = (c && +c.teams) || 2, ai = Math.max(0, t - n);
        if (n <= 1) return '친구를 기다려요 (빈 팀은 AI가 맡아요)';
        return `${n}명 → ${t}팀${ai ? ` (${ai}팀은 ${TIER[(c && c.ai) || 'normal'].em} AI)` : n > t ? ' · 한 팀 사람들은 돌아가며 던져요' : ''}`;
      },
      settings: {
        defaults: { ...DEF, pieces: opt.pieces, backdo: opt.backdo ? 1 : 0 },
        label: c => `${(c && c.teams) || 2}팀 · 말 ${(c && c.pieces) || 4}개`,
        render: lobbyRender,
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => { if (SES) SES.dispose(); SES = null; closeResult(); show('home'); drawMenu(); },
      onLeave: why => { if (SES && SES.cfg.mode === 'online') { goHome(); if (why) C.toast(why, 2600); } else goHome(); },
    };
  }
  function startOnline({ net, role, cfg, players }) {
    if (SES) SES.dispose();
    closeResult();
    const c = { ...DEF, ...(cfg || {}) };
    const ses = SES = newSession({ mode: 'online', role, net, pieces: +c.pieces || 4, backdo: !!+c.backdo, coach: c.coach === true || +c.coach === 1, speed: 'normal', seed: rand32() });
    show('play');
    ses.offs.push(net.on('players', () => onPlayers(ses)));   // 구경 인원 · 준비 목록
    if (role === 'host') {
      ses.teams = teamsFromCfg(sortedPlayers(players), c);
      ses.wins = ses.teams.map(() => 0);
      ses.offs.push(net.on('msg', (uid, m) => {
        if (!m || SES !== ses) return;
        if (m.t === 'hi') { sendState(ses, uid); if (ses.S && ses.S.phase === 'end') net.send(uid, { t: 'rdyl', g: ses.games, uids: [...ses.rdy], pick: ses.joinPick }, true); }
        else if (m.t === 'rdy') {                              // 판 사이 준비 (구경꾼이 누르면 '다음 판에 낄래요')
          if (m.g !== ses.games || !ses.S || ses.S.phase !== 'end') return;
          ses.rdy.add(uid);
          if (!ses.teams.some(t => t.members.some(x => x.uid === uid))) ses.joinPick[uid] = true;
          net.broadcast({ t: 'rdyl', g: ses.games, uids: [...ses.rdy], pick: ses.joinPick }, true);
          if (ses.drawReady) ses.drawReady();
        }
        else if (m.t === 'act') {
          // 방장이 아직 앞 움직임을 보여 주는 중이면 맡아 두었다가 기다리기 시작할 때 씀
          if (ses.awaitRemote && ses.awaitRemote.uid === uid && m.seq === ses.seq && Y.isLegal(ses.S, m.a)) { const r = ses.awaitRemote; ses.awaitRemote = null; r.resolve(m.a); }
          else if (m.seq === ses.seq) ses.early = { uid, a: m.a, seq: m.seq };
        }
      }));
      // 친구가 나가면: 5초 안에 안 돌아오면 방장이 고름 (AI 가 대신 · 다음 판부터 빼기 · 처음부터 · 기다리기)
      ses.offs.push(net.on('leave', uid => {
        if (SES !== ses) return;
        const ms = membersOf(ses, uid).filter(m => m.kind === 'human');
        if (!ms.length) return;
        C.toast(`${ms[0].name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
        renderScore(ses); if (ses.drawReady) ses.drawReady();
        setTimeout(() => { if (!ses.alive || SES !== ses || (net.players || {})[uid] || !membersOf(ses, uid).some(m => m.kind === 'human')) return; askGone(ses, uid); }, 5000);
      }));
      // 돌아오면 자리를 다시 줌
      ses.offs.push(net.on('join', uid => {
        if (SES !== ses) return;
        if (ses.goneAsk && ses.goneAsk.uid === uid) { try { ses.goneAsk.close(); } catch (e) {} ses.goneAsk = null; }
        restoreMember(ses, uid);
      }));
      runGame(ses);
    } else {
      $('lbl').textContent = '윷놀이'; $('sub').textContent = '방장이 판을 차리는 중…';
      ses.offs.push(net.on('msg', m => {
        if (!m || SES !== ses) return;
        if (m.t === 'st') { ses.qn = (ses.qn || 0) + 1; ses.queue = ses.queue.then(() => guestApply(ses, m)).catch(e => { if (!(e instanceof Cancel)) console.error(e); }).finally(() => { ses.qn--; }); }
        else if (m.t === 'tm') { if (ses.S) { ses.teams = m.teams; if (m.w) ses.wins = m.w; renderTeams(ses); renderBar(ses); renderScore(ses); if (ses.drawReady) ses.drawReady(); } }   // 팀 사람이 바뀜 (AI 가 대신 · 돌아옴)
        else if (m.t === 'rdyl') { if (m.g !== ses.games) return; ses.rdy = new Set(m.uids || []); ses.joinPick = m.pick || {}; if (ses.drawReady) ses.drawReady(); }
      }));
      // 방장에게 지금 판을 받음 (처음이든, 나갔다 다시 들어왔든 같은 길 — 아직 안 왔으면 다시 물음)
      const hi = () => { if (SES === ses && !ses.S) net.send({ t: 'hi' }, true); };
      hi(); ses.hiT = setInterval(hi, 1500);
    }
  }
  function broadcast(ses, events, fresh) {
    if (ses.cfg.mode !== 'online' || ses.cfg.role !== 'host') return;
    ses.cfg.net.broadcast({ t: 'st', seq: ses.seq, S: Y.view(ses.S), ev: events, teams: ses.teams, fresh: !!fresh, g: ses.games, w: ses.wins }, true);
  }
  function sendState(ses, uid) {
    if (!ses.S) return;
    ses.cfg.net.send(uid, { t: 'st', seq: ses.seq, S: Y.view(ses.S), ev: [], teams: ses.teams, fresh: true, g: ses.games, w: ses.wins }, true);
  }
  // 팀 사람 바뀜만 알림 (움직임·순번 없이)
  function broadcastTeams(ses) {
    if (ses.cfg.mode !== 'online' || ses.cfg.role !== 'host') return;
    ses.cfg.net.broadcast({ t: 'tm', teams: ses.teams, w: ses.wins }, true);
  }
  async function guestApply(ses, m) {
    if (!ses.alive) return;
    if (ses.seq && m.seq <= ses.seq && !(m.fresh && m.g !== ses.games)) return;
    clearInterval(ses.hiT);
    const prev = ses.S;
    const newGame = !prev || m.g !== ses.games;
    ses.teams = m.teams; ses.games = m.g; if (m.w) ses.wins = m.w;
    ses.S = m.S; ses.sent = false;
    resetUi(ses);
    if (newGame) { closeResult(); ses.rdy = new Set(); ses.joinPick = {}; ses.drawReady = null; buildBoard(ses); ses.seq = m.seq; renderAll(ses); await announceTurn(ses).catch(() => {}); renderAll(ses); if (ses.S.phase === 'end' && !document.querySelector('.overlay.yres')) guestResult(ses); return; }
    const jump = m.seq !== ses.seq + 1 || m.fresh || ses.qn > 2;   // 밀려 있으면 움직임 건너뛰고 따라잡기
    ses.seq = m.seq;
    if (!jump && m.ev && m.ev.length) {
      ses.busy = true;
      renderAll(ses);
      try { await animate(ses, prev, m.ev); } finally { ses.busy = false; }
    }
    renderAll(ses);
    if (myTurn(ses)) autoSelect(ses);
    if (ses.S.phase === 'end' && prev && prev.phase !== 'end') rankReport(ses);   // 끝나는 걸 본 판만 (끝난 판에 다시 들어온 건 제외)
    if (ses.S.phase === 'end' && !document.querySelector('.overlay.yres')) guestResult(ses);
  }
  // 친구·구경꾼의 결과 창: 준비(구경꾼은 '다음 판에 낄래요')만 누르고 시작은 방장이
  function guestResult(ses) {
    const S = ses.S, w = ses.teams[S.winner];
    if (w.members.some(m => m.uid === ses.cfg.net.uid)) { sfx('win'); C.confetti(); } else sfx('lose');
    openGuestResult(ses);
  }
  function openGuestResult(ses) {
    if (document.querySelector('.overlay.yres')) return;
    const net = ses.cfg.net;
    C.modal({
      title: '🎉 한 판 끝!', html: resultHtml(ses) + '<div class="rdy" id="yutRdy"></div>', cls: 'yres', dismiss: true,
      buttons: [
        { label: '✋ 준비', primary: true, onClick: () => { if (!ses.rdy.has(net.uid)) { ses.rdy.add(net.uid); net.send({ t: 'rdy', g: ses.games }, true); if (ses.drawReady) ses.drawReady(); } return false; } },
        { label: '판 보기', ghost: true, onClick: () => {} },
        { label: '나가기', ghost: true, onClick: () => { if (window.ArenaUI) ArenaUI.leave(); } },
      ],
      onClose: () => { ses.drawReady = null; },
    });
    const bs = [...document.querySelectorAll('.overlay.yres .row .btn')];
    ses.drawReady = () => drawReady(ses, bs[0], null);
    ses.drawReady();
  }

  // 방 사람이 들고 나면: 점수판(구경 인원) · 준비 목록
  function onPlayers(ses) {
    if (SES !== ses || !ses.S) return;
    renderScore(ses);
    if (ses.drawReady) ses.drawReady();
  }
  const membersOf = (ses, uid) => ses.teams.flatMap(tm => tm.members.filter(m => m.uid === uid));

  // 한 줄 점수판: 팀마다 이긴 판 수, 지금 차례 팀은 금색, 구경 인원 (친구랑만)
  function renderScore(ses) {
    let el = $('scoreBar');
    if (!el) { el = document.createElement('div'); el.className = 'scorebar'; el.id = 'scoreBar'; el.hidden = true; const bar = document.querySelector('#play .bar'); bar.parentNode.insertBefore(el, bar.nextSibling); }
    const was = el.hidden;
    if (!ses || ses.cfg.mode !== 'online' || !ses.S) { el.hidden = true; if (!was) layout(); return; }
    const S = ses.S, net = ses.cfg.net, pl = net.players || {}, turn = S.phase === 'end' ? -1 : S.turn;
    el.hidden = false;
    el.innerHTML = ses.teams.map((tm, t) => {
      const gone = tm.members.some(m => m.kind === 'human' && m.uid && !pl[m.uid]);
      return `<span class="sbi${t === turn ? ' on' : ''}${gone ? ' rest' : ''}"><b>${esc(tm.em + ' ' + tm.name)}</b> ${ses.wins[t] || 0}승${gone ? ' 🔌' : ''}</span>`;
    }).join('') + (() => { const k = watchersOf(ses).length; return k ? `<span class="sbi">👀 구경 ${k}</span>` : ''; })();
    if (was) layout();
  }

  // ⏱ 내 차례 30초 (친구랑): 지나면 꾀돌이 고양이 AI 가 대신 (던지기는 던지고, 말 고르기는 AI 가 고름). 10초 남으면 알림
  let TURN_SEC = 30;
  function clearTurnT(ses) { if (ses.turnT) { clearInterval(ses.turnT); ses.turnT = 0; } ses.turnKey = ''; ses.turnLeft = null; }
  function syncTurnTimer(ses) {
    if (ses.cfg.mode !== 'online' || !ses.alive) return;
    if (!canAct(ses)) { if (ses.turnT) { clearTurnT(ses); renderBar(ses); } return; }
    const key = ses.games + ':' + ses.seq;
    if (ses.turnKey === key && ses.turnT) return;
    clearTurnT(ses);
    ses.turnKey = key;
    const bell = ses.games + ':' + ses.S.turnNo;
    if (ses.bell !== bell) { ses.bell = bell; sfx('turn'); buzz(40); }          // 내 차례가 왔어요
    const end = Date.now() + TURN_SEC * 1000;
    ses.turnLeft = TURN_SEC;
    ses.turnT = setInterval(() => {
      if (!ses.alive || SES !== ses || !canAct(ses) || ses.turnKey !== ses.games + ':' + ses.seq) { clearTurnT(ses); renderBar(ses); return; }
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left !== ses.turnLeft) { ses.turnLeft = left; if (left === 10) { C.toast('⏱ 10초 남았어요', 1500); buzz(30); } renderBar(ses); }
      if (left <= 0) {
        clearTurnT(ses);
        C.toast('⏱ 30초가 지나서 AI가 대신 했어요', 2000);
        submit(ses, ses.S.phase === 'throw' ? A_THROW : AI.choose(ses.S, 'normal', { seed: rand32() }));
      }
    }, 250);
    renderBar(ses);
  }

  // 방장: 나간 사람을 어떻게 할지 묻기
  function askGone(ses, uid) {
    if (!ses.alive || ses.goneAsk || ses.S.phase === 'end') return;
    const ms = membersOf(ses, uid).filter(m => m.kind === 'human'); if (!ms.length) return;
    const people = ses.teams.flatMap(tm => tm.members.filter(m => m.uid && !m.drop && m.uid !== uid));
    const canDrop = people.length >= 2;
    const close = C.modal({
      title: `🔌 ${ms[0].name} 님이 나갔어요`,
      html: '<p style="margin:0">어떻게 할까요? AI 는 🐱 꾀돌이 고양이가 대신 해요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.</p>',
      buttons: [{ label: '🤖 AI가 대신 해요', primary: true, onClick: () => subAI(ses, uid, false) }]
        .concat(canDrop ? [{ label: '👋 다음 판부터 빼기', onClick: () => subAI(ses, uid, true) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { if (window.ArenaUI && ArenaUI.net === ses.cfg.net) { try { ses.cfg.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} ArenaUI.toLobby(); } } }, { label: '⏳ 기다릴게요' }]),
      onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; },
    });
    ses.goneAsk = { uid, close };
  }
  // 그 사람 자리를 AI 가 대신 (drop 이면 다음 판부터 빠짐)
  function subAI(ses, uid, drop) {
    const all = membersOf(ses, uid); if (!all.length) return;
    let name = '';
    for (const m of all) {
      if (m.kind === 'human') { m.kind = 'ai'; m.tier = 'normal'; m.base = m.name; m.name += ' (AI)'; m.sub = true; }
      m.drop = !!drop; name = m.base || m.name;
    }
    try { ses.cfg.net.chat(drop ? `🤖 ${name} 님 자리는 이번 판만 AI 가 하고, 다음 판부터 빠져요` : `🤖 ${name} 님 자리는 AI 가 대신 해요 (돌아오면 다시 직접)`); } catch (e) {}
    if (ses.awaitRemote && ses.awaitRemote.uid === uid) { const r = ses.awaitRemote; ses.awaitRemote = null; r.resolve(ses.S.phase === 'throw' ? A_THROW : AI.choose(ses.S, 'normal', { seed: rand32() })); }
    broadcastTeams(ses);
    renderTeams(ses); renderBar(ses); renderScore(ses); if (ses.drawReady) ses.drawReady();
  }
  function restoreMember(ses, uid) {
    const ms = membersOf(ses, uid).filter(m => m.sub);
    if (!ms.length) return;
    for (const m of ms) { m.kind = 'human'; delete m.tier; m.name = m.base || m.name; delete m.base; m.sub = false; m.drop = false; }
    C.toast(`${ms[0].name} 님이 돌아왔어요. 다시 직접 해요`, 2400);
    try { ses.cfg.net.chat(`🙌 ${ms[0].name} 님이 돌아와서 직접 해요`); } catch (e) {}
    broadcastTeams(ses);
    renderTeams(ses); renderBar(ses); renderScore(ses); if (ses.drawReady) ses.drawReady();
  }
  // 방장: 다음 판 팀 짜기 — 빼기로 한 사람은 빠지고, 구경하다 '낄래요' 한 사람은 사람이 가장 적은 팀에 들어감
  function rebuildTeams(ses) {
    const net = ses.cfg.net, pl = net.players || {}, c = { ...DEF, ...((net.meta && net.meta.cfg) || {}) }, n = ses.teams.length;
    const keep = ses.teams.map(tm => tm.members.filter(m => m.uid && !m.drop));           // AI 팀의 AI 는 새로 채움
    const have = new Set(keep.flat().map(m => m.uid));
    const dropped = ses.teams.flatMap(tm => tm.members.filter(m => m.uid && m.drop));
    const fresh = Object.keys(pl).filter(u => !have.has(u) && !dropped.some(m => m.uid === u) && !(pl[u] && pl[u].watch) && ses.joinPick[u])
      .sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    for (const u of fresh) {
      let b = 0; for (let i = 1; i < n; i++) if (keep[i].filter(m => m.kind === 'human').length < keep[b].filter(m => m.kind === 'human').length) b = i;
      keep[b].push({ name: (pl[u] && pl[u].name) || '친구', kind: 'human', uid: u });
      delete ses.joinPick[u];
    }
    ses.teams = ses.teams.map((tm, t) => ({ ...TEAMS[t], members: keep[t].length ? keep[t] : [{ name: TIER[c.ai].name, kind: 'ai', tier: c.ai }] }));
    if (fresh.length || dropped.length) {
      const msg = [fresh.length ? `${fresh.map(u => (pl[u] && pl[u].name) || '친구').join(', ')} 님 합류` : '', dropped.length ? `${dropped.map(m => m.base || m.name).join(', ')} 님 빠짐` : ''].filter(Boolean).join(' · ');
      C.toast(msg, 2600);
      try { net.chat(`📣 ${msg} → 이번 판부터`); } catch (e) {}
    }
  }

  // 나가기 (두 번)
  C.backGuard($('backBtn'), () => {
    sfx('tap');
    if (SES && SES.cfg.mode === 'online' && window.ArenaUI && ArenaUI.net) { ArenaUI.leave(); return; }
    goHome();
  });
  $('ruleBtn').onclick = () => showRules();
  C.sfx.button($('sndBtn'));

  // ── 화면 크기 ─────────────────────────────────────────────
  function layout() {
    const stg = $('stage');
    if ($('play').hidden) return;
    const r = stg.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (w < 50 || h < 50) return;
    const land = w > h * 1.12;
    const gap = parseFloat(getComputedStyle(stg).columnGap) || 12;
    let bs = land ? Math.min(h, w * 0.6, w - 270 - gap) : Math.min(w, h * 0.55);
    bs = Math.max(150, Math.floor(bs));
    stg.classList.toggle('land', land); stg.classList.toggle('port', !land);
    stg.style.setProperty('--bs', bs + 'px');
    stg.classList.toggle('short', land ? h < 600 : h - bs < 470);
    stg.classList.toggle('tight', land ? w - bs < 420 : w < 360);
    requestAnimationFrame(() => { if (STK.el.length) restSticks(); });
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 200));

  // ── 시작 ─────────────────────────────────────────────────
  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());

  // 시험용 손잡이
  window.__yut = {
    get ses() { return SES; },
    fast(v = 1) { FAST = v; },
    seed(s) { startSeed = s >>> 0; },
    submit(a) { submit(SES, a); },
    autoAct() { const s = SES; if (s && canAct(s)) submit(s, s.S.phase === 'throw' ? A_THROW : AI.choose(s.S, 'normal', { seed: rand32() })); },   // 시험용: 내 차례를 AI 가 대신
    turnSec(n) { TURN_SEC = n; },                                  // 시험용: 차례 시간을 줄여서 보기
    canAct: () => canAct(SES),
    layout,
  };
})();

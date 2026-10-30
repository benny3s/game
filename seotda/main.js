/* 정통 섯다 — 화면 · 애니메이션 · 친구랑(ArenaUI) · AI 구경 · 🧑‍🏫 일타 강사 실시간 배팅 코칭 (main.js) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const S = window.Seotda, AI = window.SeotdaAI, ART = window.GostopArt, C = window.Cozy;
  const sfx = (n, o) => C.sfx.play(n, o);
  const esc = C.esc;
  const fmtN = n => Number(n || 0).toLocaleString('ko-KR');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } };

  const KEY = 'seotda.';
  const opt = {
    tab: C.store(KEY + 'tab', 'solo'),
    mode: C.store(KEY + 'mode', 2),
    tier: C.store(KEY + 'tier', 'normal'),
    coach: C.store(KEY + 'coach', 1),
    wMode: C.store(KEY + 'wMode', 3),
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  let stats = C.store(KEY + 'stats', { played: 0, won: 0, coins: 500 });

  const TIER = {
    easy: { em: '🐣', name: '초보 삐약이', desc: '솔직하게 패대로만 쳐요', cls: 'easy', names: ['삐약이', '병아리'] },
    normal: { em: '🐱', name: '중수 냥냥이', desc: '오픈패와 팟오즈를 계산해요', cls: 'normal', names: ['냥냥이', '나비'] },
    hard: { em: '🐯', name: '타짜 호랑이', desc: '블러핑과 땡잡이 심리전을 걸어요', cls: 'hard', names: ['아귀냥', '고니냥'] },
  };

  function segBtns(el, items, cur, onPick) {
    if (!el) return;
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }

  function drawMenu() {
    const solo = opt.tab === 'solo';
    $('tabSolo').setAttribute('aria-pressed', String(solo));
    $('tabWatch').setAttribute('aria-pressed', String(!solo));
    $('soloBox').hidden = !solo;
    $('watchBox').hidden = solo;
    $('coinLine').innerHTML = `<span class="ic">🪙</span><span class="grow"><b>${fmtN(stats.coins)} 냥</b><span class="small">${stats.played ? `${fmtN(stats.played)}판 중 ${fmtN(stats.won)}판 승리` : '정통 2장 화투 섯다 · 파산 시 500냥 자동 충전'}</span></span>`;
    segBtns($('modeSeg'), [[2, '1:1 맞섯다 (2인)'], [3, '3인 섯다']], opt.mode, v => { opt.mode = +v; saveOpt('mode'); drawMenu(); });
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })),
      id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    segBtns($('coachSeg'), [[1, '🧑‍🏫 실시간 승률·기댓값 코칭 켬'], [0, '끔']], opt.coach ? 1 : 0, v => { opt.coach = +v; saveOpt('coach'); drawMenu(); });
    segBtns($('wModeSeg'), [[2, '2인 대결'], [3, '3인 대결']], opt.wMode, v => { opt.wMode = +v; saveOpt('wMode'); drawMenu(); });
  }

  $('tabSolo').onclick = () => { sfx('tap'); opt.tab = 'solo'; saveOpt('tab'); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); opt.tab = 'watch'; saveOpt('tab'); drawMenu(); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('pop'); startGame({ watch: false }); };
  $('watchBtn').onclick = () => { sfx('pop'); startGame({ watch: true }); };
  $('jokboBtn').onclick = () => showJokboModal();
  $('rankBtn').onclick = () => showJokboModal();
  C.sfx.button($('sndBtn'));

  const JOKBO_HTML = `
    <div style="text-align:left;font-size:13.5px;display:grid;gap:8px">
      <p style="margin:0">섯다는 1월~10월 화투 2장씩 총 20장으로 두 장의 조합 서열을 겨룹니다.</p>
      <table class="brk">
        <tr><td><b>1위 · 38광땡</b></td><td class="n">3월 광 + 8월 광 (천하무적)</td></tr>
        <tr><td><b>2위 · 13·18광땡</b></td><td class="n">1월 광 + 3·8월 광 (암행어사에게만 잡힘)</td></tr>
        <tr><td><b>3위 · 장땡~1땡</b></td><td class="n">같은 달 2장 (10땡>9땡>...>1땡)</td></tr>
        <tr><td><b>4위 · 알리</b></td><td class="n">1월 + 2월 (중간 족보 1위)</td></tr>
        <tr><td><b>5위 · 독사</b></td><td class="n">1월 + 4월</td></tr>
        <tr><td><b>6위 · 구삥</b></td><td class="n">1월 + 9월</td></tr>
        <tr><td><b>7위 · 장삥</b></td><td class="n">1월 + 10월</td></tr>
        <tr><td><b>8위 · 장사</b></td><td class="n">4월 + 10월</td></tr>
        <tr><td><b>9위 · 세륙</b></td><td class="n">4월 + 6월</td></tr>
        <tr><td><b>10위 · 갑오~망통</b></td><td class="n">두 달 합의 끝자리 (9끗 갑오 ~ 0끗 망통)</td></tr>
      </table>
      <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:8px 10px;font-size:12.5px">
        <b>⚡ 특수 족보 상성</b><br>
        • <b>암행어사 (4월 열끗 + 7월 열끗)</b>: 13·18광땡을 잡음 (없으면 1끗)<br>
        • <b>땡잡이 (3월 광 + 7월 열끗)</b>: 1땡~9땡을 잡음 (장땡 제외, 없으면 망통)<br>
        • <b>멍텅구리 구사 (4월 열끗 + 9월 열끗)</b>: 9땡 이하 판을 무효(재경기)로 만듦<br>
        • <b>구사 (4월 + 9월)</b>: 알리 이하 판을 무효(재경기)로 만듦
      </div>
    </div>
  `;
  function showJokboModal() {
    sfx('tap');
    C.modal({ title: '📜 정통 섯다 족보 서열표', html: JOKBO_HTML, buttons: [{ label: '닫기', primary: true }], dismiss: true });
  }

  function openFriendModal() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open({
      game: 'seotda', title: '정통 섯다', max: 3, min: 2,
      buildConfig: (hostEl) => {
        const st = { n: opt.mode || 2 };
        hostEl.innerHTML = `<div class="optrow"><span class="small">인원</span><div class="seg" id="fModeSeg"></div></div>`;
        const drawF = () => segBtns(hostEl.querySelector('#fModeSeg'), [[2, '2인 맞섯다'], [3, '3인 섯다(빈자리 AI)']], st.n, v => { st.n = +v; drawF(); });
        drawF();
        return () => ({ n: st.n, seed: rand32() });
      },
      renderConfig: cfg => `${(cfg && cfg.n) === 3 ? '3인 섯다' : '2인 맞섯다'}`,
      onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
    });
  }

  let SES = null;
  function showScreen(which) {
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
  }
  function goHome() {
    if (SES) SES.alive = false;
    if (SES && SES.net) { try { SES.net.leave(); } catch (e) {} }
    SES = null;
    $('resBox').hidden = true;
    showScreen('home');
    drawMenu();
  }
  Cozy.backGuard($('backBtn'), () => { sfx('tap'); goHome(); });

  $('coachBtn').onclick = () => {
    opt.coach = opt.coach ? 0 : 1;
    saveOpt('coach');
    sfx('tap');
    $('coachBtn').setAttribute('aria-pressed', String(!!opt.coach));
    $('coachBtn').innerHTML = `<span class="ic">🧑‍🏫</span><span>${opt.coach ? '코치 켬' : '코치 끔'}</span>`;
    if (SES) renderGame(SES);
  };

  function hwCardHtml(seotdaId, cls) {
    if (seotdaId == null || seotdaId < 0) {
      return `<div class="${cls}">${ART.use(-1)}</div>`;
    }
    return `<div class="${cls}" title="${esc(S.cardName(seotdaId))}">${ART.use(S.gostopIdOf(seotdaId))}</div>`;
  }

  function renderGame(ses) {
    const s = ses.S, me = ses.cfg.watch ? 0 : (ses.cfg.me ?? 0);
    const v = S.view(s, me);
    $('lbl').textContent = ses.cfg.watch ? '🍿 AI 섯다 구경' : ses.cfg.online ? `👥 친구랑 섯다 (${ses.net.code})` : `🔥 정통 섯다 · ${TIER[opt.tier].name}`;
    $('sub').textContent = `${s.round}판 · ${s.street === 1 ? '1차 오픈 배팅' : '2차 본 배팅'}`;
    $('coinPill').textContent = `🪙 ${fmtN(s.coins[me])}냥`;
    $('potVal').textContent = fmtN(s.pot);
    const toCall = Math.max(0, s.curBet - s.bets[me]);
    $('potSub').textContent = `${s.street === 1 ? '첫 장 공개 후 탐색전' : '두 장 완성 후 승부'} · 내 콜 비용 ${fmtN(toCall)}냥`;

    // 상대 자리 렌더링
    const opps = [];
    for (let q = 0; q < s.n; q++) {
      if (q === me) continue;
      const seat = ses.seats[q];
      const showAll = ses.cfg.watch || s.phase === 'end';
      const c1 = s.hands[q][0], c2 = showAll ? s.hands[q][1] : -1;
      const jtxt = showAll ? S.evalHand(s.hands[q][0], s.hands[q][1]).name : `${S.cardOf(c1).m}월 오픈`;
      opps.push(`
        <div class="opp-card ${s.turn === q && s.phase === 'bet' ? 'turn' : ''} ${s.folded[q] ? 'folded' : ''}">
          <div class="opp-info">
            <div class="opp-name">${esc(seat.em)} ${esc(seat.name)} (${fmtN(s.coins[q])}냥)</div>
            <div class="opp-sub">${s.folded[q] ? '🏳️ 다이(기권)' : `배팅 ${fmtN(s.bets[q])}냥 · ${esc(jtxt)}`}</div>
          </div>
          <div class="opp-cards">
            ${hwCardHtml(c1, 'hw-mini')}
            ${hwCardHtml(c2, 'hw-mini')}
          </div>
        </div>
      `);
    }
    $('oppsRow').innerHTML = opps.join('');

    // 내 자리 & 카드
    const mySeat = ses.seats[me];
    $('meName').textContent = `${mySeat.em} ${mySeat.name} (${fmtN(s.coins[me])}냥 · 배팅 ${fmtN(s.bets[me])}냥)`;
    const mc1 = s.hands[me][0], mc2 = (s.street === 2 || s.phase === 'end' || ses.cfg.watch) ? s.hands[me][1] : -1;
    $('myCards').innerHTML = hwCardHtml(mc1, 'hw-big') + hwCardHtml(mc2, 'hw-big');
    const myEval = mc2 >= 0 ? S.evalHand(mc1, mc2) : { name: `${S.cardOf(mc1).m}월 오픈 (2번째 장 대기)` };
    $('myJokbo').textContent = `🎴 ${myEval.name}`;

    // 🧑‍🏫 일타 강사 코칭 패널 & 배팅 버튼
    const myTurn = !ses.cfg.watch && s.phase === 'bet' && s.turn === me && !!ses.pending;
    const coachData = (opt.coach && !ses.cfg.watch && s.phase === 'bet') ? AI.coach(v, me) : null;
    const cp = $('coachPanel');
    if (coachData) {
      cp.hidden = false;
      $('cpTitle').textContent = coachData.headline;
      $('cpWin').textContent = `추정 승률 ${coachData.winPct}%`;
      $('cpOdds').textContent = `팟 오즈 ${coachData.potOddsPct}%`;
      $('cpFill').style.width = `${Math.max(4, Math.min(100, coachData.winPct))}%`;
      $('cpDesc').textContent = coachData.detail;
    } else {
      cp.hidden = true;
    }

    const L = S.legal(s);
    const BTN_DEFS = [
      { a: S.A_FOLD, label: '다이', cls: 'fold' },
      { a: S.A_CALL, label: toCall === 0 ? '체크' : '콜', cls: 'call' },
      { a: S.A_QUARTER, label: '쿼터', cls: 'raise' },
      { a: S.A_HALF, label: '하프', cls: 'raise' },
      { a: S.A_DDADANG, label: '따당', cls: 'raise' },
    ];
    $('betGrid').innerHTML = BTN_DEFS.map(b => {
      const ok = myTurn && L.includes(b.a);
      const cost = S.actionCost(s, me, b.a);
      const ci = coachData && coachData.byAction ? coachData.byAction[b.a] : null;
      const evBadge = (ci && opt.coach && myTurn)
        ? `<span class="ev-tag ${ci.tier}">${ci.tier === 'best' ? '👑 추천 ' : ''}${ci.evText}</span>`
        : '';
      return `<button class="bet-btn ${b.cls}" data-a="${b.a}" ${ok ? '' : 'disabled'}>
        <span>${b.label}</span>
        <small>${b.a === S.A_FOLD ? '기권' : `+${fmtN(cost)}냥`}</small>
        ${evBadge}
      </button>`;
    }).join('');
    $('betGrid').querySelectorAll('.bet-btn').forEach(btn => {
      btn.onclick = () => {
        if (!ses.pending) return;
        const act = +btn.dataset.a;
        const p = ses.pending; ses.pending = null;
        p.resolve(act);
      };
    });
  }

  function startGame({ watch }) {
    if (SES) SES.alive = false;
    const n = watch ? opt.wMode : opt.mode;
    const s = S.create({ players: n, coins: stats.coins >= 50 ? stats.coins : 500, seed: rand32() });
    const seats = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 && !watch) seats.push({ ctrl: 'me', name: '나', em: '🎴', tier: null });
      else {
        const tr = watch ? ['hard', 'normal', 'easy'][i % 3] : opt.tier;
        seats.push({ ctrl: 'ai', name: TIER[tr].names[i % 2], em: TIER[tr].em, tier: tr });
      }
    }
    const ses = SES = { alive: true, cfg: { watch, n, me: 0 }, S: s, seats, pending: null, turnLog: [], actQ: [], actWaiters: [] };
    showScreen('play');
    runLoop(ses);
  }

  function startOnline({ net, role, cfg, players }) {
    if (SES) SES.alive = false;
    const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p)).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
    const n = Math.max(2, Math.min(3, (cfg && cfg.n) || plist.length || 2));
    const myIdx = Math.max(0, plist.findIndex(p => p.uid === net.uid));
    const s = S.create({ players: n, coins: 500, seed: (cfg && cfg.seed) || 12345 });
    const seats = Array.from({ length: n }, (_, i) => {
      const pl = plist[i];
      if (pl) return { ctrl: i === myIdx ? 'me' : 'remote', name: pl.name || `친구${i + 1}`, em: i === myIdx ? '🎴' : '🌸', tier: null };
      return { ctrl: role === 'host' ? 'ai' : 'remote', name: '아귀냥(AI)', em: '🐯', tier: 'normal' };
    });
    const ses = SES = { alive: true, cfg: { watch: false, online: true, role, n, me: myIdx, seed: (cfg && cfg.seed) || 12345 }, S: s, seats, net, pending: null, turnLog: [], actQ: [], actWaiters: [] };
    const onMsg = m => {
      if (!m || m.t !== 'act') return;
      if (ses.actWaiters.length) ses.actWaiters.shift()(m.a);
      else ses.actQ.push(m.a);
      if (role === 'host') net.broadcast(m);
    };
    if (role === 'host') net.on('msg', (_u, m) => onMsg(m));
    else net.on('msg', m => onMsg(m));
    net.sendAct = a => { if (role === 'host') net.broadcast({ t: 'act', a }); else net.send({ t: 'act', a }); };
    showScreen('play');
    runLoop(ses);
  }

  async function runLoop(ses) {
    try {
      while (ses.alive) {
        ses.turnLog = [];
        renderGame(ses);
        while (ses.S.phase === 'bet' && ses.alive) {
          renderGame(ses);
          const p = ses.S.turn, seat = ses.seats[p];
          let a;
          if (seat.ctrl === 'me') {
            const cSnap = AI.coach(S.view(ses.S, p), p);
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); });
            const chosenObj = cSnap.byAction[a];
            if (chosenObj) {
              ses.turnLog.push({
                street: ses.S.street,
                chosenAct: a,
                bestAct: cSnap.bestAction,
                delta: chosenObj.delta,
                winPct: cSnap.winPct,
                headline: cSnap.headline,
              });
            }
            if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
          } else if (seat.ctrl === 'remote') {
            a = ses.actQ.length ? ses.actQ.shift() : await new Promise(res => ses.actWaiters.push(res));
          } else {
            await sleep(ses.cfg.watch ? 420 : 520);
            if (!ses.alive) return;
            a = AI.choose(S.view(ses.S, p), seat.tier || 'normal', { seed: rand32() });
            if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
          }
          sfx(a === S.A_FOLD ? 'lose' : a === S.A_CALL ? 'tap' : 'coin');
          const { state } = S.step(ses.S, a);
          ses.S = state;
          renderGame(ses);
        }
        if (!ses.alive) return;
        const next = await showRoundResult(ses);
        if (next !== 'next') { goHome(); return; }
        const rSeed = ses.cfg.online ? ((ses.cfg.seed + (ses.S.round + 1) * 0x9e3779b9) >>> 0) : rand32();
        ses.S = S.nextRound(ses.S, { seed: rSeed });
      }
    } catch (e) {
      console.error(e);
    }
  }

  function showRoundResult(ses) {
    return new Promise(resolve => {
      const s = ses.S, r = s.result, me = ses.cfg.me ?? 0;
      if (!ses.cfg.watch) {
        stats.played++;
        if (r.winner === me) stats.won++;
        stats.coins = s.coins[me];
        C.save(KEY + 'stats', stats);
      }
      if (r.winner === me) { sfx('win'); C.confetti({ particleCount: 55, spread: 60 }); }
      else sfx('lose');

      const title = r.kind === 'rematch'
        ? '🔄 사구파토 · 동점 재경기!'
        : r.winner === me
        ? '🎉 승리! 판돈을 쓸어담았어요!'
        : `😿 ${ses.seats[r.winner].name} 승리`;
      const rows = r.evals.map(e => `
        <tr>
          <td>${esc(ses.seats[e.p].name)} ${e.folded ? '<span class="small">(다이)</span>' : ''}</td>
          <td class="n"><b>${esc(e.effName || e.name)}</b> <span class="small">(${esc(S.cardName(e.c1))} · ${esc(S.cardName(e.c2))})</span></td>
        </tr>
      `).join('');

      let coachNote = '';
      if (!ses.cfg.watch && ses.turnLog.length) {
        const worst = ses.turnLog.slice().sort((a, b) => a.delta - b.delta)[0];
        const actName = a => (a === 0 ? '다이' : a === 1 ? '콜' : a === 2 ? '쿼터' : a === 3 ? '하프' : '따당');
        coachNote = `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:12px;padding:9px 11px;margin-top:8px;text-align:left;font-size:12.5px;color:#78350f">
          <b>🧑‍🏫 일타 강사 복기 노트</b><br>
          ${worst && worst.delta < -5
            ? `• ${worst.street}차 배팅(승률 ${worst.winPct}%)에서 <b>[${actName(worst.chosenAct)}]</b> 대신 <b>[${actName(worst.bestAct)}]</b>을(를) 선택했다면 기댓값이 <b>+${Math.round(-worst.delta)}냥</b> 더 높았어요!`
            : `• 이번 판은 승률과 팟 오즈에 맞춰 아주 정석적인 타짜 배팅을 하셨습니다! 👏`}
        </div>`;
      }

      $('resTitle').textContent = title;
      $('resBig').innerHTML = `<div class="resbig">${r.kind === 'rematch' ? `이월 ${fmtN(r.pot)}냥` : `+${fmtN(r.pot)}냥`}</div><p class="small" style="margin:2px 0">${esc(r.reason)}</p>`;
      $('resBody').innerHTML = `<table class="brk">${rows}</table>${coachNote}`;
      $('resBtns').innerHTML = '';
      const done = v => { $('resBox').hidden = true; resolve(v); };
      const b1 = document.createElement('button');
      b1.className = 'btn primary';
      b1.textContent = r.kind === 'rematch' ? '🔥 묻고 더블 재경기 ▶' : '다음 판 ▶';
      b1.onclick = () => { sfx('tap'); done('next'); };
      const b2 = document.createElement('button');
      b2.className = 'btn';
      b2.textContent = '메뉴';
      b2.onclick = () => { sfx('tap'); done('menu'); };
      $('resBtns').append(b1, b2);
      $('resBox').hidden = false;
    });
  }

  ART.install();
  drawMenu();
  showScreen('home');
  if (window.ArenaUI) ArenaUI.checkUrl({
    game: 'seotda', title: '정통 섯다', max: 3, min: 2,
    renderConfig: cfg => `${(cfg && cfg.n) === 3 ? '3인 섯다' : '2인 맞섯다'}`,
    onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
  });
})();

/* 베니체스 — 화면 (core.js · ai.js 위에 얹는 UI)
   사람 = 0번 자리. 다른 자리는 AutoChessAI 스타일 봇. */
(function () {
  'use strict';
  const C = window.AutoChess, AI = window.AutoChessAI;
  const $ = id => document.getElementById(id);
  const GAME = 'autochess';
  const NAMES = ['나', '토리', '모모', '레오', '하루', '누리', '바다', '솔'];
  const STYLE_KO = { econ: '저축형', fast8: '빠른 8', reroll: '리롤', greedy: '바로 씀', random: '무작위' };
  const MIX = ['econ', 'fast8', 'reroll', 'greedy', 'econ', 'fast8', 'reroll'];

  const opt = { rules: 'A', opp: 'mix', hint: true };
  let s = null, seats = [], watch = false, busy = false, rand = Math.random, lastLog = 0;
  let stats = load();

  function load() { try { return JSON.parse(localStorage.getItem('autochess.stats')) || { played: 0, top1: 0, top4: 0, sum: 0 }; } catch (e) { return { played: 0, top1: 0, top4: 0, sum: 0 }; } }
  function save() { try { localStorage.setItem('autochess.stats', JSON.stringify(stats)); } catch (e) {} }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sfx = k => { try { if (window.Cozy && Cozy.sfx) Cozy.sfx.play(k); } catch (e) {} };

  // ── 메뉴 ─────────────────────────────────────────────
  function seg(id, key, conv) {
    const box = $(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      for (const x of box.children) x.classList.toggle('on', x === b);
      opt[key] = conv ? conv(b.dataset.v) : b.dataset.v; sfx('tap');
    });
  }
  seg('ruleSeg', 'rules'); seg('oppSeg', 'opp'); seg('hintSeg', 'hint', v => v === '1');
  function drawStats() {
    $('statLine').textContent = stats.played
      ? `통산 ${stats.played}판 · 1등 ${stats.top1} · 4등 안 ${stats.top4} · 평균 ${(stats.sum / stats.played).toFixed(2)}등`
      : '아직 기록이 없어요.';
  }
  drawStats();

  function start(isWatch) {
    watch = isWatch;
    const R = C.getRules(opt.rules), n = R.players;
    const seed = (Math.random() * 2 ** 31) | 0;
    s = C.create({ rules: opt.rules, seed, players: n });
    rand = C.makeRng(seed ^ 0x5EED);
    seats = [];
    for (let p = 0; p < n; p++) {
      if (p === 0 && !watch) { seats.push('human'); continue; }
      seats.push(opt.opp === 'mix' ? MIX[(p + (watch ? 0 : -1) + seed) % MIX.length] : opt.opp);
    }
    lastLog = 0; $('log').innerHTML = '';
    $('menu').hidden = true; $('game').hidden = false; $('pop').hidden = true;
    sfx('start');
    advance();
  }
  $('playBtn').onclick = () => start(false);
  $('watchBtn').onclick = () => start(true);
  $('againBtn').onclick = () => start(watch);
  $('menuBtn').onclick = () => goMenu();
  function goMenu() { s = null; $('game').hidden = true; $('pop').hidden = true; $('menu').hidden = false; drawStats(); }
  try { if (window.Cozy && Cozy.backGuard) Cozy.backGuard($('backBtn'), () => { sfx('tap'); goMenu(); }); else $('backBtn').onclick = goMenu; } catch (e) { $('backBtn').onclick = goMenu; }
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open(GAME); } catch (e) {} };

  // ── 진행: 봇 차례는 자동, 사람 차례에서 멈춤 ────────────
  async function advance() {
    if (busy) return; busy = true;
    try {
      const me = s;
      while (s === me && s.phase === 'plan' && (seats[s.turn] !== 'human' || !s.players[s.turn].alive)) {
        const before = s.log.length;
        C.apply(s, AI.pick(s, seats[s.turn], rand));
        if (s.log.length !== before) { render(); drawLog(); await sleep(watch ? 450 : 250); }
      }
      if (s !== me) return;
      render(); drawLog();
      if (s.phase !== 'plan') finish();
    } finally { busy = false; }
  }
  function act(a) {
    if (busy || !s || s.phase !== 'plan' || seats[s.turn] !== 'human') return;
    if (!C.isLegal(s, a)) { sfx('bad'); return; }
    C.apply(s, a);
    sfx(a === C.A_END ? 'go' : a >= C.A_SELL ? 'coin' : 'tap');
    if (a === C.A_END || s.turn !== 0) advance(); else render();
  }
  $('rollBtn').onclick = () => act(C.A_ROLL);
  $('xpBtn').onclick = () => act(C.A_XP);
  $('endBtn').onclick = () => act(C.A_END);
  document.addEventListener('keydown', e => {
    if ($('game').hidden || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'd') act(C.A_ROLL); else if (k === 'f') act(C.A_XP); else if (k === ' ' || k === 'enter') { e.preventDefault(); act(C.A_END); }
    else if (k >= '1' && k <= '5') act(C.A_BUY + (+k - 1));
  });

  // ── 그리기 ───────────────────────────────────────────
  const me = () => (watch ? (s.phase === 'plan' ? s.turn : 0) : 0);
  function chip(u, st, extra) {
    const c = C.costOf(s, u);
    const el = document.createElement('button');
    el.className = 'unit c' + c + (st > 1 ? ' s' + st : '') + (extra || '');
    el.innerHTML = `<b>${C.unitName(s.rules, u)}</b><small>${'★'.repeat(st)} · ${c}코</small>`;
    return el;
  }
  function render() {
    if (!s) return;
    const R = s.rules, p = me(), pl = s.players[p];
    const mine = !watch && s.phase === 'plan' && s.turn === 0;
    $('hRound').textContent = C.label(s);
    $('hKind').textContent = C.isCarousel(s) ? '회전목마' : C.isPvE(s) ? 'PvE' : '';
    $('hHp').textContent = pl.hp;
    $('hGold').textContent = pl.gold;
    $('hInt').textContent = '+' + C.interestOf(R, pl.gold) + ' 이자';
    $('hLvl').textContent = pl.lvl;
    $('hXp').textContent = pl.lvl >= R.maxLevel ? 'MAX' : pl.xp + '/' + R.xpNeed[pl.lvl + 1];
    $('hStreak').textContent = pl.streak > 0 ? pl.streak + '연승' : pl.streak < 0 ? -pl.streak + '연패' : '-';
    const pw = C.strength(s, pl);
    $('hPow').textContent = pw.toFixed(1);
    const al = C.alive(s), better = al.filter(q => q !== p && C.strength(s, s.players[q]) > pw).length;
    $('hRank').textContent = '힘 ' + (better + 1) + '위/' + al.length;
    const od = R.odds[pl.lvl] || [];
    $('odds').textContent = od.map((v, i) => (i + 1) + '코 ' + v + '%').filter((x, i) => od[i] > 0).join(' · ');

    const m = mine ? C.legalMask(s) : new Uint8Array(C.N_ACTIONS);
    const shop = $('shop'); shop.innerHTML = '';
    pl.shop.forEach((u, i) => {
      if (u < 0) { const e = document.createElement('div'); e.className = 'unit empty'; shop.appendChild(e); return; }
      const e = chip(u, 1, C.completes(pl, u) ? ' merge' : '');
      e.disabled = !m[C.A_BUY + i];
      e.title = '사기 (' + (i + 1) + ')';
      e.onclick = () => act(C.A_BUY + i);
      shop.appendChild(e);
    });
    $('rollBtn').disabled = !m[C.A_ROLL]; $('xpBtn').disabled = !m[C.A_XP]; $('endBtn').disabled = !m[C.A_END];

    const board = C.boardOf(pl), bench = C.benchOf(pl);
    $('boardCnt').textContent = board.length + '/' + pl.lvl;
    $('benchCnt').textContent = bench.length + '/' + R.bench;
    const bd = $('board'); bd.innerHTML = '';
    for (const x of board) { const e = chip(x.u, x.st); e.disabled = true; bd.appendChild(e); }
    const bn = $('bench'); bn.innerHTML = '';
    bench.forEach((x, j) => {
      const e = chip(x.u, x.st); e.disabled = !m[C.A_SELL + j];
      e.title = '팔기 +' + C.sellValue(s, x);
      e.onclick = () => act(C.A_SELL + j);
      bn.appendChild(e);
    });

    // 참가자
    const ol = $('players'); ol.innerHTML = '';
    const order = s.players.map((x, q) => q).sort((a, b) => (s.players[b].alive - s.players[a].alive) || (s.players[b].hp - s.players[a].hp));
    for (const q of order) {
      const x = s.players[q], li = document.createElement('li');
      li.className = (q === p ? 'me ' : '') + (x.alive ? '' : 'dead') + (s.phase === 'plan' && s.turn === q ? ' turn' : '');
      const who = seats[q] === 'human' ? NAMES[0] : NAMES[q] + ' <small>' + (STYLE_KO[seats[q]] || '') + '</small>';
      li.innerHTML = `<span>${who}</span><span>${x.alive ? '❤️' + x.hp : x.place + '등'}</span><span>Lv${x.lvl} · 💰${x.gold} · 힘 ${C.strength(s, x).toFixed(0)}</span>`;
      ol.appendChild(li);
    }

    // 추천 (봇 econ 기준 · 조언용)
    const h = $('hint');
    if (mine && opt.hint) {
      const a = AI.pick(C.clone(s), 'econ', () => 0.5);
      h.hidden = false; h.textContent = '💡 저축형 봇이라면: ' + C.actionLabel(s, a);
    } else h.hidden = true;
  }
  function nm(q) { return q === 0 && !watch ? '나' : NAMES[q]; }
  function drawLog() {
    const ul = $('log');
    while (lastLog < s.log.length) {
      const rec = s.log[lastLog++], p = me();
      for (const f of rec.fights) {
        if (f[0] !== p && f[1] !== p) continue;
        const li = document.createElement('li');
        if (f[1] < 0) li.textContent = `${rec.r} PvE ${f[2] ? '승리 (+아이템 +골드)' : '패배 −' + f[3]}`;
        else {
          const meA = f[0] === p, won = meA ? f[2] === 1 : f[2] === 0, opp = meA ? f[1] : f[0];
          li.textContent = `${rec.r} vs ${nm(opp)}${f[4] ? '(유령)' : ''} ${won ? '승리' : '패배 −' + f[3]}`;
          li.className = won ? 'win' : 'lose';
        }
        ul.prepend(li);
      }
      if (!rec.fights.length) { const li = document.createElement('li'); li.textContent = rec.r + ' 회전목마 (+유닛 +아이템)'; ul.prepend(li); }
    }
    while (ul.children.length > 30) ul.lastChild.remove();
  }

  // ── 끝 ───────────────────────────────────────────────
  function finish() {
    const n = s.n, place = s.players[0].place;
    $('popTitle').textContent = watch ? 'AI 구경 끝' : (place === 1 ? '🏆 1등!' : place <= n / 2 ? `👍 ${place}등` : `${place}등`);
    const rows = s.players.map((x, q) => ({ q, x })).sort((a, b) => a.x.place - b.x.place)
      .map(({ q, x }) => `<tr${q === 0 && !watch ? ' class="me"' : ''}><td>${x.place}</td><td>${nm(q)} ${seats[q] !== 'human' ? '<small>' + STYLE_KO[seats[q]] + '</small>' : ''}</td><td>Lv${x.lvl}</td><td>리롤 ${x.st.rolls}</td><td>이자 ${x.st.interest}</td></tr>`).join('');
    $('popBody').innerHTML = `<p class="muted">${s.result.round} 에서 끝 · 규칙 ${s.rules.id}</p><table class="res">${rows}</table>`;
    $('pop').hidden = false;
    if (watch) return;
    stats.played++; stats.sum += place; if (place === 1) stats.top1++; if (place <= n / 2) stats.top4++; save();
    sfx(place <= n / 2 ? 'win' : 'lose');
    try { if (place === 1 && window.Cozy) Cozy.confetti(); } catch (e) {}
    try { if (window.GRank) GRank.result(GAME, { mode: 'ai', res: place <= n / 2 ? 'w' : 'l', beat: n - place, score: n - place }); } catch (e) { console.warn('[rank]', e); }
  }

  // 디버그 · 시험용
  window.__ac = { get s() { return s; }, start, act };
})();

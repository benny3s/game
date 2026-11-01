/* 베니캐치 — 그림 맞히기 규칙 코어 (브라우저·Node 공용, 화면은 이 함수들만 씀)
   · 한 사람이 제시어(3개 중 하나)를 그리고, 나머지는 채팅으로 맞힘. 차례는 0,1,2…n-1 번 사람 순서로 '바퀴' 수만큼
   · 점수: 맞힌 사람 = 먼저 맞힐수록(60·50·40·30…, 20 까지) + 빨리 맞힐수록(남은 시간 비율 × 40)
           그린 사람 = 한 사람 맞힐 때마다 +20 (아무도 못 맞히면 0)
   · 정답 비교는 띄어쓰기·문장부호·대소문자를 빼고. 한 글자만 다르면 '아까워요' (그 사람에게만)
   · 힌트: 처음엔 글자 수(○), 35% 지나면 초성, 70% 지나면 첫 글자까지 (두 글자 이하는 초성까지만)
   · 상태 = JSON 으로 저장되는 평범한 객체. 난수·시계 없음 (제시어·남은 시간은 부르는 쪽이 줌)
   · 그림 자체(획·압축)는 베니스트레이션 draw/core.js · draw/pad.js 를 그대로 씀 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CatchCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SECS = [60, 80, 100];                   // 그리는 시간
  const ROUNDS = [1, 2, 3];                     // 바퀴 (모두가 몇 번씩 그리나)
  const PICK_SEC = 12;                          // 제시어 고르는 시간
  const REVEAL_SEC = 5;                         // 정답 보여 주는 시간
  const MSG_MAX = 20;                           // 채팅 한 줄
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

  function cleanText(s, max) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    const a = Array.from(s);
    return a.length > max ? a.slice(0, max).join('').trim() : s;
  }
  // 비교용: 띄어쓰기·문장부호 빼고 소문자
  const norm = s => cleanText(s, 40).toLowerCase().replace(/[\s.,!?~'"`·\-_()[\]{}:;^*+=/\\|ㅋㅎㅠㅜ]+/g, '');

  // 글자 단위 거리 (짧은 말이라 단순하게)
  function lev(a, b) {
    a = Array.from(a); b = Array.from(b);
    if (Math.abs(a.length - b.length) > 1) return 2;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // 답 판정: 'hit' 정답 · 'close' 한 글자 차이 · 'miss'
  function judge(guess, word) {
    const g = norm(guess), w = norm(word);
    if (!g || !w) return 'miss';
    if (g === w) return 'hit';
    if (Array.from(w).length >= 3 && lev(g, w) <= 1) return 'close';
    return 'miss';
  }
  // 이미 맞힌 사람·그린 사람의 채팅에 답이 들어 있으면 가림
  const leaks = (text, word) => { const w = norm(word); return !!w && norm(text).includes(w); };

  // 힌트 글: 글자마다 한 칸 (띄어쓰기는 그대로)
  function choOf(ch) {
    const c = ch.charCodeAt(0);
    return c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : '○';
  }
  function hintOf(word, lvl) {
    const a = Array.from(String(word || ''));
    const letters = a.filter(ch => ch !== ' ').length;
    if (letters <= 2) lvl = Math.min(lvl, 1);
    let first = true;
    return a.map(ch => {
      if (ch === ' ') return ' ';
      const out = lvl >= 2 && first ? ch : lvl >= 1 ? choOf(ch) : '○';
      first = false;
      return out;
    }).join('');
  }
  const hintLevel = (left, dur) => { const f = dur > 0 ? 1 - left / dur : 1; return f >= 0.7 ? 2 : f >= 0.35 ? 1 : 0; };

  // ── 한 판 ─────────────────────────────────────────────────
  function create(n, cfg) {
    cfg = cfg || {};
    const sec = SECS.includes(+cfg.sec) ? +cfg.sec : 80, rounds = ROUNDS.includes(+cfg.rounds) ? +cfg.rounds : 1;
    return { n, cfg: { sec, rounds }, turns: n * rounds, k: -1, drawer: -1, phase: 'idle', choices: null, word: '', got: [], gain: new Array(n).fill(0), scores: new Array(n).fill(0), used: [], hist: [] };
  }
  const drawerOf = (G, k) => k % G.n;
  const roundOf = (G, k) => Math.floor(k / G.n) + 1;
  const isLast = G => G.k + 1 >= G.turns;
  // k 번째 차례 시작 (choices = 고를 말 3개)
  function startTurn(G, k, choices) {
    G.k = k; G.drawer = drawerOf(G, k); G.phase = 'pick'; G.choices = choices.slice(0, 3); G.word = ''; G.got = []; G.gain = new Array(G.n).fill(0);
    return G.drawer;
  }
  function choose(G, i) {
    if (G.phase !== 'pick') return false;
    i = Math.max(0, Math.min((G.choices || []).length - 1, i | 0));
    G.word = G.choices[i]; G.phase = 'draw'; G.used.push(G.word);
    return true;
  }
  // p 가 낸 말 → { kind: 'hit'|'close'|'miss'|'chat'|'hide', pts }
  //   chat = 지금 맞히는 때가 아니거나 그린 사람·이미 맞힌 사람 (그냥 채팅) · hide = 그 채팅에 답이 들어 있어 가림
  function guess(G, p, text, left) {
    if (G.phase !== 'draw' || p === G.drawer || G.got.includes(p)) return { kind: G.phase === 'draw' && leaks(text, G.word) ? 'hide' : 'chat', pts: 0 };
    const j = judge(text, G.word);
    if (j !== 'hit') return { kind: j, pts: 0 };
    const dur = G.cfg.sec, k = G.got.length;
    const pts = Math.max(20, 60 - 10 * k) + Math.round(40 * Math.max(0, Math.min(1, left / dur)));
    G.got.push(p); G.scores[p] += pts; G.gain[p] += pts;
    G.scores[G.drawer] += 20; G.gain[G.drawer] += 20;
    return { kind: 'hit', pts };
  }
  // 한 기기: 맞힌 사람을 눌러서 줌 (같은 점수 규칙)
  const award = (G, p, left) => (G.phase === 'draw' && p !== G.drawer && !G.got.includes(p) ? guess(G, p, G.word, left).pts : 0);
  // 맞힐 사람이 다 맞혔나 (away = 나간 사람 번호들)
  function allGot(G, away) {
    const out = new Set(away || []);
    for (let p = 0; p < G.n; p++) if (p !== G.drawer && !out.has(p) && !G.got.includes(p)) return false;
    return true;
  }
  function endTurn(G) {
    if (G.phase === 'reveal') return G.hist[G.hist.length - 1];
    const h = { d: G.drawer, w: G.word || (G.choices && G.choices[0]) || '', got: G.got.slice(), gain: G.gain.slice() };
    G.hist.push(h); G.phase = 'reveal';
    return h;
  }
  function finish(G) { G.phase = 'end'; return standings(G.scores); }
  // 순위 (같은 점수는 같은 등수)
  function standings(scores) {
    const order = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s || a.i - b.i);
    let rank = 0;
    order.forEach((r, k) => { if (k === 0 || r.s < order[k - 1].s) rank = k + 1; r.rank = rank; });
    return order;
  }
  // 내 랭킹 기록: 1등(동점 포함, 0점 아님)이면 w. beat = 나보다 점수 낮은 사람 수. opp = 사람마다 나와의 승패
  function rankInfo(scores, me) {
    if (!Array.isArray(scores) || me < 0 || me >= scores.length) return null;
    const max = Math.max(...scores), mine = scores[me], opp = [];
    if (max <= 0) return null;
    let beat = 0;
    scores.forEach((c, i) => { if (i === me) return; if (c < mine) beat++; opp.push({ idx: i, res: mine > c ? 'w' : mine < c ? 'l' : 'd' }); });
    return { res: mine === max ? 'w' : 'l', beat, score: mine, opp };
  }

  return {
    SECS, ROUNDS, PICK_SEC, REVEAL_SEC, MSG_MAX,
    cleanText, norm, lev, judge, leaks, hintOf, hintLevel,
    create, drawerOf, roundOf, isLast, startTurn, choose, guess, award, allGot, endTurn, finish, standings, rankInfo,
  };
});

/* 고스톱 — 규칙 코어 (브라우저·Node·Web Worker 공용, 화면과 AI는 이 함수들만 씀)
   · 상태 = JSON 그대로 저장되는 평범한 객체. Math.random·Date 없음 (난수는 상태 안 mulberry32: rng)
   · 맞고(2인) · 고스톱(3인), 규칙은 RULES.md 한 가지
   · 패 번호 id = 월(0~11)*4 + k, 보너스 피 48·49·50
   · 결정은 늘 s.turn 이 함: step(s, 행동번호) → { state, events } (events 는 화면 효과·소리용)
   · 남에게 보여 줄 때는 view(s, p) (남의 손패·더미 순서·씨앗을 가림), 강화학습은 obs(s, p) · legalMask(s) (RL.md) */
(function (root) {
  'use strict';

  // ── 패 ─────────────────────────────────────────────────────
  const GW = 0, YE = 1, TI = 2, PI = 3;                 // 광 · 열끗 · 띠 · 피
  const NCARD = 51, NBASE = 48;
  const KOOK = 32, RAIN = 44;                           // 국진(9월 열끗) · 비광
  const R_HONG = 1, R_CHEONG = 2, R_CHO = 3, R_PLAIN = 4;
  const SHAPE = ['GTPP', 'YTPP', 'GTPP', 'YTPP', 'YTPP', 'YTPP', 'YTPP', 'GYPP', 'YTPP', 'YTPP', 'GPPP', 'GYTP'];
  const KIND = [], PIV = [], RIB = [], BIRD = [];
  for (let m = 0; m < 12; m++) for (let k = 0; k < 4; k++) {
    const ch = SHAPE[m][k], id = m * 4 + k;
    KIND[id] = 'GYTP'.indexOf(ch); PIV[id] = ch === 'P' ? 1 : 0; RIB[id] = 0; BIRD[id] = 0;
  }
  PIV[41] = 2; PIV[47] = 2;                              // 11월·12월 쌍피
  for (const [id, v] of [[48, 2], [49, 3], [50, 2]]) { KIND[id] = PI; PIV[id] = v; RIB[id] = 0; BIRD[id] = 0; }   // 보너스 쌍피 · 쓰리피 · 쌍피
  for (const id of [1, 5, 9]) RIB[id] = R_HONG;
  for (const id of [21, 33, 37]) RIB[id] = R_CHEONG;
  for (const id of [13, 17, 25]) RIB[id] = R_CHO;
  RIB[46] = R_PLAIN;
  for (const id of [4, 12, 29]) BIRD[id] = 1;           // 고도리 새 (2·4·8월 열끗)
  const BONUS_IDS = [48, 49, 50];
  const monthOf = c => (c < NBASE ? c >> 2 : -1);
  const isBonus = c => c >= NBASE;

  const MONTH_NAME = ['송학', '매조', '벚꽃', '흑싸리', '난초', '모란', '홍싸리', '공산', '국화', '단풍', '오동', '비'];
  const ITEM_NAME = { 0: '학', 4: '꾀꼬리', 8: '벚꽃 장막', 12: '두견새', 16: '다리', 20: '나비', 24: '멧돼지', 28: '보름달', 29: '기러기', 32: '술잔(국진)', 36: '사슴', 40: '봉황', 44: '우산', 45: '제비' };
  function cardName(c) {
    if (c === 48 || c === 50) return '보너스 쌍피';
    if (c === 49) return '보너스 쓰리피';
    const m = monthOf(c), k = KIND[c], mm = (m + 1) + '월';
    if (k === GW) return mm + (c === RAIN ? ' 비광' : ' 광');
    if (k === YE) return mm + ' 열끗' + (ITEM_NAME[c] ? '(' + ITEM_NAME[c] + ')' : '');
    if (k === TI) return mm + (RIB[c] === R_HONG ? ' 홍단' : RIB[c] === R_CHEONG ? ' 청단' : RIB[c] === R_CHO ? ' 초단' : ' 띠');
    return mm + (PIV[c] === 2 ? ' 쌍피' : ' 피');
  }

  // ── 행동 번호 (강화학습 행동표, RL.md) ─────────────────────────
  const A_PLAY = 0;          // +id (0~50): 손패 한 장 내기 (보너스 피 포함)
  const A_SHAKE = 51;        // +id (0~47): 흔들고 내기
  const A_BOMB = 99;         // +월 (0~11): 폭탄 (같은 월 세 장을 한꺼번에)
  const A_PASS = 111;        // 폭탄 뒤 '뒤집기만'
  const A_PICK = 112;        // +0/1: 바닥 두 장 중 고르기 (번호 작은 쪽이 0)
  const A_GO = 114, A_STOP = 115;
  const A_KOOK_Y = 116, A_KOOK_P = 117;                  // 국진을 열끗으로 / 쌍피로
  const N_ACTIONS = 118;

  // ── 난수 (mulberry32, 공개 도메인 · Tommy Ettinger) ─────────────
  function rnd(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // 상태 밖에서 쓰는 씨앗 난수 (AI·시험용)
  function makeRng(seed) { const o = { rng: seed | 0 }; return () => rnd(o); }

  // ── 상태 ───────────────────────────────────────────────────
  const thresholdOf = n => (n === 2 ? 7 : 3);           // 고/스톱 할 수 있는 점수
  const PIBAK_MAX = n => (n === 2 ? 7 : 5);             // 피박: 진 사람 피가 이 값 이하 (0장은 면제)
  const MAX_CARRY = 3;                                  // 나가리 배수는 8배까지
  const sortIds = a => a.sort((x, y) => x - y);
  const arr = (n, v) => Array.from({ length: n }, () => (typeof v === 'function' ? v() : v));

  function clone(s) {
    return JSON.parse(JSON.stringify(s));
  }
  // 빠른 복사 (AI 시뮬레이션용). dealt·result 는 바꾸지 않는 값이라 그대로 같이 씀
  const sl2 = a => { const o = new Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i].slice(); return o; };
  function fastClone(s) {
    const o = {
      v: s.v, n: s.n, bonus: s.bonus, seed: s.seed, rng: s.rng, round: s.round, carry: s.carry, first: s.first,
      turn: s.turn, phase: s.phase, turnNo: s.turnNo,
      deck: s.deck.slice(), hands: sl2(s.hands), table: s.table.slice(), cap: sl2(s.cap),
      kook: s.kook, go: s.go.slice(), lastGo: s.lastGo.slice(), goSeq: s.goSeq.slice(),
      shake: s.shake.slice(), shook: sl2(s.shook), known: sl2(s.known),
      pass: s.pass.slice(), ppeok: s.ppeok.slice(), owner: s.owner.slice(),
      dealt: s.dealt, cur: null, result: s.result,
    };
    const c = s.cur;
    if (c) o.cur = { p: c.p, kind: c.kind, c: c.c, m: c.m, ht: c.ht, hp: c.hp, flip: c.flip, fp: c.fp, opts: c.opts ? c.opts.slice() : null, caps: c.caps.slice(), steal: c.steal, ppeok: c.ppeok, before: c.before };
    if (s.me != null) o.me = s.me;
    return o;
  }

  function gameCards(bonus) { const a = []; for (let i = 0; i < NBASE; i++) a.push(i); for (let i = 0; i < bonus; i++) a.push(BONUS_IDS[i]); return a; }

  function blank(o) {
    const n = o.players === 3 ? 3 : 2;
    const bonus = o.bonus === 2 || o.bonus === 3 ? o.bonus : 0;
    const seed = (o.seed >>> 0) || 1;
    return {
      v: 1, n, bonus, seed, rng: seed | 0,
      round: o.round || 1, carry: Math.max(0, Math.min(MAX_CARRY, o.carry | 0)), first: (o.first | 0) % n,
      turn: (o.first | 0) % n, phase: 'play', turnNo: 0,
      deck: [], hands: arr(n, () => []), table: [], cap: arr(n, () => []),
      kook: '', go: arr(n, 0), lastGo: arr(n, 0), goSeq: [],
      shake: arr(n, 0), shook: arr(n, () => []), known: arr(n, () => []),
      pass: arr(n, 0), ppeok: arr(n, 0), owner: arr(12, -1),
      dealt: { bonus: [], redeal: 0 }, cur: null, result: null,
    };
  }

  // 새 판: { players: 2|3, bonus: 0|2|3, seed, first, carry, round }
  function create(o) {
    o = o || {};
    const s = blank(o);
    const H = s.n === 2 ? 10 : 7, TB = s.n === 2 ? 8 : 6;
    for (let tries = 0; ; tries++) {
      const d = shuffle(gameCards(s.bonus), () => rnd(s));
      for (let i = 0; i < s.n; i++) { const p = (s.first + i) % s.n; s.hands[p] = sortIds(d.splice(d.length - H, H)); }
      s.table = d.splice(d.length - TB, TB);
      s.deck = d;
      s.cap = arr(s.n, () => []); s.dealt.bonus = [];
      // 바닥에 깔린 보너스 피는 선이 가져가고 더미에서 채움
      for (let i = 0; i < s.table.length; i++) {
        while (isBonus(s.table[i])) { s.cap[s.first].push(s.table[i]); s.dealt.bonus.push(s.table[i]); s.table[i] = s.deck.pop(); }
      }
      // 바닥에 같은 월 네 장이면 다시 섞음
      const cnt = monthCount(s.table);
      if (cnt.some(x => x === 4) && tries < 50) { s.dealt.redeal++; continue; }
      break;
    }
    // 바닥에 처음부터 같은 월 세 장 = 주인 없는 뻑 더미 (먹어도 피를 안 받음)
    // 총통: 손에 같은 월 네 장 → 바로 이김 (선부터 차례대로 봄)
    for (let i = 0; i < s.n; i++) {
      const p = (s.first + i) % s.n, mc = monthCount(s.hands[p]);
      const m = mc.indexOf(4);
      if (m >= 0) { finish(s, p, 'chongtong', [], { month: m }); break; }
    }
    return s;
  }

  // 다음 판: 이긴 사람이 선, 나가리면 선 그대로 + 배수 2배
  function nextRound(prev, o) {
    o = o || {};
    const r = prev.result;
    const first = r && r.winner >= 0 ? r.winner : prev.first;
    const carry = r && r.kind === 'nagari' ? Math.min(MAX_CARRY, prev.carry + 1) : 0;
    const t = { rng: prev.rng };
    const seed = o.seed != null ? o.seed : (Math.floor(rnd(t) * 4294967296) >>> 0) || 7;
    return create({ players: prev.n, bonus: o.bonus != null ? o.bonus : prev.bonus, seed, first, carry, round: prev.round + 1 });
  }

  // 시험·연습용: 원하는 패로 판 만들기. deck 은 뒤집을 순서대로 (0번이 먼저)
  function setup(o) {
    const s = blank(o);
    s.hands = (o.hands || arr(s.n, () => [])).map(h => sortIds(h.slice()));
    s.table = (o.table || []).slice();
    s.deck = (o.deck || []).slice().reverse();
    s.cap = (o.cap || arr(s.n, () => [])).map(c => c.slice());
    if (o.kook) s.kook = o.kook;
    for (const k of ['go', 'lastGo', 'shake', 'pass', 'ppeok']) if (o[k]) s[k] = o[k].slice();
    if (o.owner) s.owner = o.owner.slice();
    if (o.goSeq) s.goSeq = o.goSeq.slice();
    if (o.turn != null) s.turn = o.turn;
    return s;
  }

  function monthCount(list) { const c = arr(12, 0); for (const id of list) if (id < NBASE) c[id >> 2]++; return c; }
  const tableOf = (s, m) => s.table.filter(c => monthOf(c) === m);
  const removeFrom = (a, c) => { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); return i >= 0; };
  const hasTurns = (s, p) => s.hands[p].length > 0 || s.pass[p] > 0;
  // 같은 값어치 두 장 (고를 필요 없음): 보통 피 두 장
  const same = (a, b) => KIND[a] === PI && KIND[b] === PI && PIV[a] === PIV[b] && !isBonus(a) && !isBonus(b);

  // ── 점수 ───────────────────────────────────────────────────
  // p 가 먹은 패로 점수 계산 (고 보너스 전)
  function tally(s, p, kookAs) {
    const ka = kookAs || s.kook || 'Y';
    let g = 0, rain = 0, y = 0, birds = 0, t = 0, hong = 0, cheong = 0, cho = 0, pi = 0, piCards = 0;
    for (const c of s.cap[p]) {
      if (c === KOOK) { if (ka === 'P') { pi += 2; piCards++; } else y++; continue; }
      const k = KIND[c];
      if (k === GW) { g++; if (c === RAIN) rain = 1; }
      else if (k === YE) { y++; if (BIRD[c]) birds++; }
      else if (k === TI) { t++; if (RIB[c] === R_HONG) hong++; else if (RIB[c] === R_CHEONG) cheong++; else if (RIB[c] === R_CHO) cho++; }
      else { pi += PIV[c]; piCards++; }
    }
    const gwang = g === 5 ? 15 : g === 4 ? 4 : g === 3 ? (rain ? 2 : 3) : 0;
    const yeol = y >= 5 ? y - 4 : 0, godori = birds === 3 ? 5 : 0;
    const tti = t >= 5 ? t - 4 : 0;
    const dan = (hong === 3 ? 3 : 0) + (cheong === 3 ? 3 : 0) + (cho === 3 ? 3 : 0);
    const piPts = pi >= 10 ? pi - 9 : 0;
    return {
      g, rain, y, birds, t, hong, cheong, cho, pi, piCards,
      gwang, yeol, godori, tti, hongdan: hong === 3 ? 3 : 0, cheongdan: cheong === 3 ? 3 : 0, chodan: cho === 3 ? 3 : 0, dan, piPts,
      base: gwang + yeol + godori + tti + dan + piPts,
    };
  }
  // 고 보너스: 1고 +1, 2고 +2, 3고부터 (점수+고 횟수) × 2^(고-2)
  function goTotal(base, go) { return go <= 0 ? base : go <= 2 ? base + go : (base + go) * Math.pow(2, go - 2); }

  // 판 끝 정산 (점 계산). kind: stop | chongtong | ppeok3 | nagari
  function settle(s, w, kind, extra) {
    const n = s.n, carryX = Math.pow(2, s.carry);
    const res = { kind, winner: w, round: s.round, carry: s.carry, items: [], mults: [], per: [], points: 0, base: 0, go: 0, total: 0, extra: extra || {} };
    if (kind === 'nagari') { res.carryNext = Math.min(MAX_CARRY, s.carry + 1); return res; }
    res.carryNext = 0;
    let total, common = 1;
    const tw = tally(s, w);
    if (kind === 'chongtong') { total = 10; res.items.push({ k: '총통', pts: 10 }); }
    else if (kind === 'ppeok3') { total = thresholdOf(n); res.items.push({ k: '쓰리뻑', pts: total }); }
    else {
      const it = res.items;
      if (tw.gwang) it.push({ k: tw.g === 3 && tw.rain ? '비삼광' : tw.g + '광', pts: tw.gwang });
      if (tw.godori) it.push({ k: '고도리', pts: 5 });
      if (tw.yeol) it.push({ k: '열끗 ' + tw.y + '장', pts: tw.yeol });
      if (tw.hongdan) it.push({ k: '홍단', pts: 3 });
      if (tw.cheongdan) it.push({ k: '청단', pts: 3 });
      if (tw.chodan) it.push({ k: '초단', pts: 3 });
      if (tw.tti) it.push({ k: '띠 ' + tw.t + '장', pts: tw.tti });
      if (tw.piPts) it.push({ k: '피 ' + tw.pi + '장', pts: tw.piPts });
      res.base = tw.base; res.go = s.go[w];
      total = goTotal(tw.base, s.go[w]);
      if (s.go[w] > 0) it.push({ k: s.go[w] + '고', pts: total - tw.base, x: s.go[w] >= 3 ? Math.pow(2, s.go[w] - 2) : 0 });
      if (s.shake[w]) { const x = Math.pow(2, s.shake[w]); common *= x; res.mults.push({ k: '흔들기·폭탄 ' + s.shake[w] + '번', x }); }
      if (tw.y >= 7) { common *= 2; res.mults.push({ k: '멍박 (열끗 ' + tw.y + '장)', x: 2 }); }
    }
    if (s.carry) { common *= carryX; res.mults.push({ k: '나가리 판', x: carryX }); }
    res.total = total;
    // 진 사람마다
    const losers = [];
    for (let q = 0; q < n; q++) {
      if (q === w) continue;
      const tq = tally(s, q), m = [];
      let x = common;
      if (kind === 'stop') {
        if (tw.piPts > 0 && tq.pi >= 1 && tq.pi <= PIBAK_MAX(n)) { x *= 2; m.push({ k: '피박', x: 2 }); }
        if (tw.gwang > 0 && tq.g === 0) { x *= 2; m.push({ k: '광박', x: 2 }); }
        if (n === 2 && s.go[q] > 0) { x *= 2; m.push({ k: '고박', x: 2 }); }
      }
      losers.push({ p: q, pay: total * x, mults: m, bear: false, gone: s.go[q] > 0 });
    }
    // 3인 고박: 고를 했다가 진 사람이 진 사람 몫을 다 냄 (둘 다 고했으면 나중에 고한 사람)
    if (kind === 'stop' && n === 3) {
      const gone = losers.filter(l => l.gone);
      if (gone.length) {
        let bearer = gone[0];
        if (gone.length > 1) { const last = [...s.goSeq].reverse().find(p => gone.some(l => l.p === p)); bearer = gone.find(l => l.p === last) || gone[0]; }
        const sum = losers.reduce((a, l) => a + l.pay, 0);
        for (const l of losers) { if (l === bearer) { l.pay = sum; l.bear = true; l.mults.push({ k: '고박 (혼자 다 냄)', x: 0 }); } else l.pay = 0; }
      }
    }
    for (const l of losers) delete l.gone;
    res.per = losers;
    res.points = losers.reduce((a, l) => a + l.pay, 0);
    return res;
  }

  function finish(s, w, kind, ev, extra) {
    s.result = settle(s, w, kind, extra);
    s.phase = 'end'; s.cur = null;
    if (ev) ev.push({ t: 'end', result: s.result });
  }

  // ── 할 수 있는 행동 ─────────────────────────────────────────
  function legal(s) {
    const a = [];
    const p = s.turn;
    switch (s.phase) {
      case 'play': {
        const h = s.hands[p], hc = monthCount(h), tc = monthCount(s.table);
        for (const c of h) {
          a.push(A_PLAY + c);
          if (c < NBASE) { const m = c >> 2; if (hc[m] === 3 && tc[m] === 0 && s.shook[p].indexOf(m) < 0) a.push(A_SHAKE + c); }
        }
        for (let m = 0; m < 12; m++) if (hc[m] === 3 && tc[m] === 1) a.push(A_BOMB + m);
        if (s.pass[p] > 0) a.push(A_PASS);
        break;
      }
      case 'pickHand': case 'pickFlip': a.push(A_PICK, A_PICK + 1); break;
      case 'kook': a.push(A_KOOK_Y, A_KOOK_P); break;
      case 'goStop': a.push(A_GO, A_STOP); break;
    }
    return a;
  }
  function legalMask(s) { const m = new Uint8Array(N_ACTIONS); for (const a of legal(s)) m[a] = 1; return m; }
  const countM = (list, m) => { let k = 0; for (const c of list) if (c < NBASE && (c >> 2) === m) k++; return k; };
  // legal() 과 같은 판정을 목록 없이 (시뮬레이션에서 자주 부름)
  function isLegal(s, a) {
    if (typeof a !== 'number' || a !== (a | 0)) return false;
    const p = s.turn;
    switch (s.phase) {
      case 'play': {
        const h = s.hands[p];
        if (a >= A_PLAY && a < A_SHAKE) return h.indexOf(a - A_PLAY) >= 0;
        if (a >= A_SHAKE && a < A_BOMB) { const c = a - A_SHAKE; if (h.indexOf(c) < 0) return false; const m = c >> 2; return countM(h, m) === 3 && countM(s.table, m) === 0 && s.shook[p].indexOf(m) < 0; }
        if (a >= A_BOMB && a < A_PASS) { const m = a - A_BOMB; return countM(h, m) === 3 && countM(s.table, m) === 1; }
        return a === A_PASS && s.pass[p] > 0;
      }
      case 'pickHand': case 'pickFlip': return a === A_PICK || a === A_PICK + 1;
      case 'kook': return a === A_KOOK_Y || a === A_KOOK_P;
      case 'goStop': return a === A_GO || a === A_STOP;
    }
    return false;
  }

  // ── 한 걸음 ────────────────────────────────────────────────
  function step(s0, a) { const s = clone(s0); const ev = []; apply(s, a, ev); return { state: s, events: ev }; }

  // 제자리에서 바꿈 (AI 시뮬레이션은 fastClone 뒤 이걸로)
  function apply(s, a, ev) {
    ev = ev || null;
    if (s.phase === 'end') throw new Error('판이 끝났어요');
    if (!isLegal(s, a)) throw new Error('할 수 없는 행동 ' + a + ' (' + s.phase + ')');
    const p = s.turn;
    if (s.phase === 'play') return playStage(s, p, a, ev);
    if (s.phase === 'pickHand') { const c = s.cur; c.hp = c.opts[a - A_PICK]; c.opts = null; s.phase = 'play'; if (ev) ev.push({ t: 'pick', p, card: c.hp, stage: 'hand' }); return flipStage(s, ev); }
    if (s.phase === 'pickFlip') { const c = s.cur; c.fp = c.opts[a - A_PICK]; c.opts = null; s.phase = 'play'; if (ev) ev.push({ t: 'pick', p, card: c.fp, stage: 'flip' }); return resolve(s, ev); }
    if (s.phase === 'kook') { s.kook = a === A_KOOK_P ? 'P' : 'Y'; if (ev) ev.push({ t: 'kook', p, as: s.kook }); s.phase = 'play'; return scoreCheck(s, ev); }
    if (s.phase === 'goStop') {
      const base = tally(s, p).base;
      if (a === A_GO) {
        s.go[p]++; s.lastGo[p] = base; s.goSeq.push(p);
        if (ev) ev.push({ t: 'go', p, count: s.go[p], base });
        s.phase = 'play';
        return nextTurn(s, ev);
      }
      if (ev) ev.push({ t: 'stop', p, base });
      return finish(s, p, 'stop', ev);
    }
  }

  function newCur(p, kind) { return { p, kind, c: -1, m: -1, ht: 0, hp: -1, flip: -1, fp: -1, opts: null, caps: [], steal: 0, ppeok: false, before: null }; }

  function playStage(s, p, a, ev) {
    const h = s.hands[p];
    if (a === A_PASS) {
      s.pass[p]--;
      s.cur = newCur(p, 'pass'); s.cur.before = tally(s, p);
      if (ev) ev.push({ t: 'pass', p, left: s.pass[p] });
      return flipStage(s, ev);
    }
    if (a >= A_BOMB && a < A_BOMB + 12) {
      const m = a - A_BOMB, cards = h.filter(c => monthOf(c) === m), tc = tableOf(s, m)[0];
      for (const c of cards) { removeFrom(h, c); removeFrom(s.known[p], c); }
      removeFrom(s.table, tc);
      const cur = s.cur = newCur(p, 'bomb'); cur.before = tally(s, p);
      cur.m = m; cur.ht = 3; cur.caps.push(...cards, tc); cur.steal++;
      s.shake[p]++; s.pass[p] += 2;
      if (ev) ev.push({ t: 'bomb', p, m, cards, target: tc });
      return flipStage(s, ev);
    }
    const shake = a >= A_SHAKE && a < A_SHAKE + NBASE;
    const c = shake ? a - A_SHAKE : a - A_PLAY;
    // 보너스 피를 내면 바로 먹고 더미에서 한 장 받아 손에 (차례는 그대로)
    if (isBonus(c)) {
      removeFrom(h, c); s.cap[p].push(c);
      if (ev) ev.push({ t: 'bonus', p, card: c, from: 'hand' });
      if (s.deck.length) { const d = s.deck.pop(); h.push(d); sortIds(h); if (ev) ev.push({ t: 'draw', p, card: d }); }
      if (!hasTurns(s, p)) { s.cur = newCur(p, 'bonus'); return scoreCheck(s, ev); }
      return;
    }
    const m = c >> 2;
    if (shake) {
      const cards = h.filter(x => monthOf(x) === m);
      s.shake[p]++; s.shook[p].push(m);
      for (const x of cards) if (x !== c && s.known[p].indexOf(x) < 0) s.known[p].push(x);
      if (ev) ev.push({ t: 'shake', p, m, cards });
    }
    removeFrom(h, c); removeFrom(s.known[p], c);
    const cur = s.cur = newCur(p, 'card'); cur.before = tally(s, p);
    cur.c = c; cur.m = m;
    const T = tableOf(s, m);
    cur.ht = T.length;
    if (ev) ev.push({ t: 'play', p, card: c, n: T.length, shake });
    if (T.length === 3) {
      // 뻑 더미(또는 처음부터 깔린 세 장)를 먹음
      for (const x of T) removeFrom(s.table, x);
      cur.caps.push(c, ...T);
      const own = s.owner[m];
      const st = own === p ? 2 : own >= 0 ? 1 : 0;
      cur.steal += st;
      if (ev) ev.push({ t: 'eat', p, m, own: own === p, by: own, steal: st, cards: [c, ...T] });
      s.owner[m] = -1;
      return flipStage(s, ev);
    }
    s.table.push(c);
    if (T.length === 1) cur.hp = T[0];
    else if (T.length === 2) {
      if (same(T[0], T[1])) cur.hp = Math.min(T[0], T[1]);
      else { cur.opts = sortIds(T.slice()); s.phase = 'pickHand'; return; }
    }
    return flipStage(s, ev);
  }

  function flipStage(s, ev) {
    const cur = s.cur, p = cur.p;
    let d = -1;
    while (s.deck.length) {
      d = s.deck.pop();
      if (ev) ev.push({ t: 'flip', p, card: d });
      if (!isBonus(d)) break;
      s.cap[p].push(d);                                   // 더미에서 나온 보너스 피: 먹고 한 장 더
      if (ev) ev.push({ t: 'bonus', p, card: d, from: 'deck' });
      d = -1;
    }
    cur.flip = d;
    if (d < 0) return resolve(s, ev);
    const md = d >> 2;
    if (cur.kind === 'card' && md === cur.m && cur.ht <= 2) {
      const m = cur.m;
      if (cur.ht === 0) {                                  // 쪽
        removeFrom(s.table, cur.c); cur.caps.push(cur.c, d); cur.steal++;
        if (ev) ev.push({ t: 'jjok', p, m, cards: [cur.c, d] });
      } else if (cur.ht === 1) {                           // 뻑: 세 장이 바닥에 남음
        s.table.push(d); cur.hp = -1; cur.ppeok = true;
        s.owner[m] = p; s.ppeok[p]++;
        if (ev) ev.push({ t: 'ppeok', p, m, count: s.ppeok[p], cards: tableOf(s, m) });
      } else {                                             // 따닥: 네 장 다
        const all = tableOf(s, m);
        for (const x of all) removeFrom(s.table, x);
        cur.caps.push(...all, d); cur.hp = -1; cur.steal++;
        if (ev) ev.push({ t: 'ttadak', p, m, cards: [...all, d] });
      }
      return resolve(s, ev);
    }
    const U = tableOf(s, md);
    if (U.length === 3) {
      for (const x of U) removeFrom(s.table, x);
      cur.caps.push(d, ...U);
      const own = s.owner[md], st = own === p ? 2 : own >= 0 ? 1 : 0;
      cur.steal += st;
      if (ev) ev.push({ t: 'eat', p, m: md, own: own === p, by: own, steal: st, cards: [d, ...U], flip: true });
      s.owner[md] = -1;
      return resolve(s, ev);
    }
    s.table.push(d);
    if (U.length === 1) cur.fp = U[0];
    else if (U.length === 2) {
      if (same(U[0], U[1])) cur.fp = Math.min(U[0], U[1]);
      else { cur.opts = sortIds(U.slice()); s.phase = 'pickFlip'; return; }
    }
    return resolve(s, ev);
  }

  // 차례 마무리: 짝 맞춘 패 가져오기 → 싹쓸이 → 피 받기 → (국진) → 점수 확인
  function resolve(s, ev) {
    const cur = s.cur, p = cur.p;
    if (cur.hp >= 0) { removeFrom(s.table, cur.c); removeFrom(s.table, cur.hp); cur.caps.push(cur.c, cur.hp); }
    if (cur.fp >= 0) { removeFrom(s.table, cur.flip); removeFrom(s.table, cur.fp); cur.caps.push(cur.flip, cur.fp); }
    if (cur.caps.length) {
      for (const c of cur.caps) s.cap[p].push(c);
      if (ev) ev.push({ t: 'capture', p, cards: cur.caps.slice() });
    }
    if (cur.caps.length && s.table.length === 0) { cur.steal++; if (ev) ev.push({ t: 'sweep', p }); }
    // 마지막 차례(모두 손패를 다 냄)의 뻑 먹기·따닥·쪽·싹쓸이는 피를 안 받음 (폭탄은 마지막일 수 없음)
    const last = s.hands.every((h, q) => !hasTurns(s, q));
    if (cur.steal && !last) for (let q = 0; q < s.n; q++) if (q !== p) for (let i = 0; i < cur.steal; i++) stealPi(s, q, p, ev);
    // 3뻑이면 바로 이김
    if (cur.ppeok && s.ppeok[p] >= 3) { combos(s, p, ev); return finish(s, p, 'ppeok3', ev); }
    combos(s, p, ev);
    if (s.kook === '' && s.cap[p].indexOf(KOOK) >= 0) { s.phase = 'kook'; return; }
    return scoreCheck(s, ev);
  }

  // 새로 된 약 (화면에 띄울 말)
  function combos(s, p, ev) {
    const b = s.cur && s.cur.before; if (!b || !ev) return;
    const a = tally(s, p), out = [];
    if (a.gwang > b.gwang) out.push(a.g === 5 ? '오광' : a.g === 4 ? '사광' : a.rain ? '비삼광' : '삼광');
    if (a.godori && !b.godori) out.push('고도리');
    if (a.hongdan && !b.hongdan) out.push('홍단');
    if (a.cheongdan && !b.cheongdan) out.push('청단');
    if (a.chodan && !b.chodan) out.push('초단');
    if (a.y >= 7 && b.y < 7) out.push('멍따');
    for (const name of out) ev.push({ t: 'combo', p, name });
  }

  // 피 한 장 가져오기: 값이 가장 낮은 피부터 (없으면 못 받음)
  function stealPi(s, from, to, ev) {
    let best = -1, bv = 99;
    for (const c of s.cap[from]) {
      let v = 0;
      if (c === KOOK) { if (s.kook === 'P') v = 2; else continue; }
      else if (KIND[c] === PI) v = PIV[c]; else continue;
      if (v < bv || (v === bv && c < best)) { bv = v; best = c; }
    }
    if (best < 0) return;
    removeFrom(s.cap[from], best); s.cap[to].push(best);
    if (ev) ev.push({ t: 'steal', from, to, card: best });
  }

  function scoreCheck(s, ev) {
    const p = s.cur ? s.cur.p : s.turn;
    const base = tally(s, p).base;
    if (base >= thresholdOf(s.n) && base > s.lastGo[p]) {
      if (!hasTurns(s, p)) { if (ev) ev.push({ t: 'stop', p, base, auto: true }); return finish(s, p, 'stop', ev); }
      s.phase = 'goStop'; s.turn = p;
      if (ev) ev.push({ t: 'canStop', p, base });
      return;
    }
    return nextTurn(s, ev);
  }

  function nextTurn(s, ev) {
    const p = s.cur ? s.cur.p : s.turn;
    s.cur = null; s.turnNo++;
    for (let i = 1; i <= s.n; i++) {
      const q = (p + i) % s.n;
      if (hasTurns(s, q)) { s.turn = q; s.phase = 'play'; if (ev) ev.push({ t: 'turn', p: q }); return; }
    }
    if (ev) ev.push({ t: 'nagari' });
    return finish(s, -1, 'nagari', ev);
  }

  // ── 보여 주기 · 관찰 ────────────────────────────────────────
  // p 가 알 수 있는 것만 (남의 손패는 흔들어 보인 패만, 더미는 장수만, 씨앗·난수 없음)
  function view(s, p) {
    const v = clone(s);
    v.me = p; v.seed = 0; v.rng = 0;
    v.deck = s.deck.map(() => -1);
    // 보인 패 먼저, 나머지는 -1 (자리 순서로 숨은 패 번호가 새지 않게)
    for (let q = 0; q < s.n; q++) if (q !== p) {
      const kn = sortIds(s.hands[q].filter(c => s.known[q].indexOf(c) >= 0));
      v.hands[q] = kn.concat(arr(s.hands[q].length - kn.length, -1));
    }
    return v;
  }
  // 디버그 전용: 다 보이는 상태 그대로
  function debugFull(s) { return clone(s); }

  // 보이는 정보와 맞는 온전한 상태를 하나 뽑음 (AI 결정용, 숨은 패는 고르게 섞음)
  function sampleWorld(v, rand) {
    const s = fastClone(v);
    const seen = new Set();
    for (const c of s.table) seen.add(c);
    for (const pile of s.cap) for (const c of pile) seen.add(c);
    for (const h of s.hands) for (const c of h) if (c >= 0) seen.add(c);
    if (s.cur) { if (s.cur.flip >= 0) seen.add(s.cur.flip); for (const c of s.cur.caps) seen.add(c); }   // 차례 중간: 가져올 패도 이미 보인 패
    const unseen = shuffle(gameCards(s.bonus).filter(c => !seen.has(c)), rand);
    let k = 0;
    for (let q = 0; q < s.n; q++) { s.hands[q] = s.hands[q].map(c => (c >= 0 ? c : unseen[k++])); sortIds(s.hands[q]); }
    s.deck = s.deck.map(() => unseen[k++]);
    s.rng = Math.floor(rand() * 4294967296) | 0; s.seed = 0;
    delete s.me;
    return s;
  }

  // 강화학습 관찰 (길이 OBS_LEN, p 의 정보만 — view 를 거쳐서 숨은 정보가 못 들어감)
  const PLANES = 8, OBS_CARDS = NCARD * PLANES;       // 내 손 · 바닥 · 내가 먹음 · 상대1 먹음 · 상대2 먹음 · 상대1 보인 손패 · 상대2 보인 손패 · 모름
  const OBS_LEN = OBS_CARDS + NCARD * 2 + 48;
  const PHASES = ['play', 'pickHand', 'pickFlip', 'kook', 'goStop', 'end'];
  function obs(s, p) {
    const v = s.me === p ? s : view(s, p);
    const o = new Float32Array(OBS_LEN);
    const n = v.n, opp = [1, 2].map(i => (n === 3 || i === 1 ? (p + i) % n : -1));
    const inGame = new Set(gameCards(v.bonus));
    const put = (c, plane) => { o[c * PLANES + plane] = 1; };
    const known = new Set();
    for (const c of v.hands[p]) { put(c, 0); known.add(c); }
    for (const c of v.table) { put(c, 1); known.add(c); }
    for (const c of v.cap[p]) { put(c, 2); known.add(c); }
    opp.forEach((q, i) => {
      if (q < 0) return;
      for (const c of v.cap[q]) { put(c, 3 + i); known.add(c); }
      for (const c of v.hands[q]) if (c >= 0) { put(c, 5 + i); known.add(c); }
    });
    if (v.cur) {                                         // 차례 중간에 가져올 패는 그 사람이 먹은 패로
      if (v.cur.flip >= 0) known.add(v.cur.flip);
      const pl = v.cur.p === p ? 2 : 3 + opp.indexOf(v.cur.p);
      for (const c of v.cur.caps) { put(c, pl); known.add(c); }
    }
    for (let c = 0; c < NCARD; c++) if (inGame.has(c) && !known.has(c)) put(c, 7);
    let at = OBS_CARDS;
    if (v.cur && v.cur.opts) for (const c of v.cur.opts) o[at + c] = 1;               // 고를 후보
    at += NCARD;
    if (v.cur) { if (v.cur.c >= 0) o[at + v.cur.c] = 1; if (v.cur.flip >= 0) o[at + v.cur.flip] = 1; }   // 이번 차례에 낸 패·뒤집은 패
    at += NCARD;
    const seat = [p, opp[0], opp[1]];
    const f = (x, d) => (x == null ? 0 : x / d);
    const scal = [];
    for (const ph of PHASES) scal.push(v.phase === ph ? 1 : 0);
    scal.push(n === 3 ? 1 : 0, f(v.deck.length, 30));
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.hands[q].length, 10));
    const tl = seat.map(q => (q < 0 ? null : tally(v, q)));
    for (const t of tl) scal.push(t ? f(t.base, 10) : 0);
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.go[q], 3));
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.shake[q], 2));
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.pass[q], 2));
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.ppeok[q], 3));
    for (const q of seat) scal.push(q < 0 ? 0 : f(v.lastGo[q], 10));
    scal.push(v.kook === 'Y' ? 1 : 0, v.kook === 'P' ? 1 : 0, f(v.carry, 3), f(thresholdOf(n), 7));
    for (const q of seat) scal.push(q >= 0 && v.turn === q ? 1 : 0);
    for (const t of tl) { scal.push(t ? f(t.pi, 20) : 0, t ? f(t.g, 5) : 0, t ? f(t.y, 9) : 0, t ? f(t.t, 10) : 0); }
    for (let i = 0; i < scal.length; i++) o[at + i] = scal[i];
    return o;
  }

  // 판 끝 보상 (p 기준 점: 이기면 +받은 점, 지면 -낸 점, 나가리 0)
  function reward(s, p) {
    const r = s.result; if (!r || r.winner < 0) return 0;
    if (r.winner === p) return r.points;
    const l = r.per.find(x => x.p === p); return l ? -l.pay : 0;
  }

  // 상태 지문 (결정성 시험용, FNV-1a)
  function hash(s) {
    const str = JSON.stringify(s);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function actionLabel(a) {
    if (a < A_SHAKE) return '내기 ' + cardName(a - A_PLAY);
    if (a < A_BOMB) return '흔들고 내기 ' + cardName(a - A_SHAKE);
    if (a < A_PASS) return '폭탄 ' + (a - A_BOMB + 1) + '월';
    if (a === A_PASS) return '뒤집기만';
    if (a < A_GO) return '고르기 ' + (a - A_PICK);
    return ['고', '스톱', '국진→열끗', '국진→쌍피'][a - A_GO] || '?';
  }

  // 지금 스톱하면 받을 점 (고/스톱 창에 보여 줌)
  function stopPreview(s, p) { const t = fastClone(s); return settle(t, p, 'stop'); }

  const API = {
    VERSION: 1, NCARD, NBASE, KOOK, RAIN, GW, YE, TI, PI, R_HONG, R_CHEONG, R_CHO, R_PLAIN,
    KIND, PIV, RIB, BIRD, BONUS_IDS, MONTH_NAME,
    A_PLAY, A_SHAKE, A_BOMB, A_PASS, A_PICK, A_GO, A_STOP, A_KOOK_Y, A_KOOK_P, N_ACTIONS,
    OBS_LEN, PLANES, PHASES,
    monthOf, isBonus, cardName, gameCards, thresholdOf, pibakMax: PIBAK_MAX,
    create, nextRound, setup, legal, legalMask, isLegal, step, apply, clone, fastClone,
    tally, goTotal, settle, stopPreview, view, debugFull, sampleWorld, obs, reward, hash, actionLabel,
    makeRng, shuffle, monthCount, hasTurns,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Gostop = API;
})(this);

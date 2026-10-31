/* 원카드 — 규칙 코어 (브라우저·Node·Web Worker 공용, 화면과 AI는 이 함수들만 씀)
   · 상태 = JSON 그대로 저장되는 평범한 객체. Math.random·Date 없음 (난수는 상태 안 mulberry32: rng)
   · 카드 번호 c: 한 벌 54장 (0~51 = 무늬×13 + 숫자, 52 흑백 조커, 53 컬러 조커). 두 벌이면 54~107 이 두 번째 벌
     무늬 0 ♠ · 1 ♥ · 2 ♦ · 3 ♣ / 숫자 0 A · 1 2 … 9 10 · 10 J · 11 Q · 12 K
   · 결정은 늘 s.turn 이 함: step(s, 행동번호) → { state, events } (events 는 화면 효과·소리용)
     예외 하나: 원카드 외치기(phase 'call')는 시간 경주라 화면(방장)이 누가 먼저였는지 정해서 행동 번호로 넣음
   · 남에게 보여 줄 때는 view(s, p) (남의 손패·더미 순서·씨앗을 가림), 강화학습은 obs(s, p) · legalMask(s) (RL.md) */
(function (root) {
  'use strict';

  // ── 카드 ───────────────────────────────────────────────────
  const NB = 54;                                       // 한 벌 (조커 2장 포함)
  const BJ = 52, CJ = 53;                              // 흑백 조커 · 컬러 조커
  const R_A = 0, R_2 = 1, R_3 = 2, R_7 = 6, R_J = 10, R_Q = 11, R_K = 12;
  const SUIT_SYM = ['♠', '♥', '♦', '♣'];
  const SUIT_NAME = ['스페이드', '하트', '다이아', '클로버'];
  const RANK_NAME = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const base = c => c % NB;
  const isJoker = c => base(c) >= 52;
  const suitOf = c => { const b = c % NB; return b < 52 ? (b / 13) | 0 : -1; };
  const rankOf = c => { const b = c % NB; return b < 52 ? b % 13 : -1; };
  const redSuit = su => su === 1 || su === 2;
  const isRed = c => { const b = c % NB; return b === CJ || (b < 52 && redSuit((b / 13) | 0)); };
  function cardName(c) {
    const b = base(c);
    if (b === BJ) return '흑백 조커';
    if (b === CJ) return '컬러 조커';
    return SUIT_SYM[suitOf(b)] + RANK_NAME[rankOf(b)];
  }
  const sortKey = c => base(c) * 2 + (c >= NB ? 1 : 0);
  const sortHand = h => h.sort((x, y) => sortKey(x) - sortKey(y));
  const gameCards = decks => Array.from({ length: NB * (decks === 2 ? 2 : 1) }, (_, i) => i);

  // ── 행동 번호 (강화학습 행동표, RL.md) ─────────────────────────
  const A_PLAY = 0;          // + 카드 번호 (0~107): 그 카드 내기 (받아치기 · 3 막기 포함)
  const A_DRAW = 108;        // 한 장 먹기 (공격을 받는 중이면 쌓인 장수만큼 받기)
  const A_SUIT = 109;        // + 0~3: 7 을 낸 뒤 무늬 바꾸기 (♠ ♥ ♦ ♣)
  const A_CALL = 113;        // 원카드! — 1장 남은 사람이 제때 외침
  const A_CATCH = 114;       // + 자리 0~7: 그 사람이 먼저 '잡았다!' → 1장 남은 사람이 벌칙
  const A_MISS = 122;        // 아무도 안 누르고 시간이 지남 → 벌칙
  const N_ACTIONS = 123;
  const MAX_PLAYERS = 8;
  const MAX_TURNS = 600;     // 끝없는 판 막기 (넘으면 손패가 가장 적은 사람이 이김)

  // ── 난수 (mulberry32, 공개 도메인 · Tommy Ettinger) ─────────────
  function rnd(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function makeRng(seed) { const o = { rng: seed | 0 }; return () => rnd(o); }

  // ── 우리 집 규칙 (cfg.rules) ─────────────────────────────────
  // t: bool | num(min~max 정수, zero = 0일 때 보여 줄 말, steps = 고를 수 있는 값) | enum(opts = [[값, 이름, 설명?]])
  const RULE_GROUPS = [['deal', '🃏 나누기'], ['atk', '⚔️ 공격 카드'], ['special', '🎴 특수 카드'], ['call', '☝️ 원카드 외치기'], ['end', '🏁 끝내기'], ['pay', '🪙 칩 정산']];
  const RULE_DEFS = [
    { k: 'deal', g: 'deal', t: 'num', d: 7, min: 5, max: 8, unit: '장', label: '처음 받는 장수', note: '한 사람이 처음에 받는 카드' },
    { k: 'decks', g: 'deal', t: 'enum', d: 1, label: '카드 벌 수', note: '7~8명이면 저절로 두 벌', opts: [[1, '한 벌', '52장 + 조커 2장'], [2, '두 벌', '108장 — 사람이 많을 때']] },
    { k: 'atk2', g: 'atk', t: 'num', d: 2, min: 1, max: 5, unit: '장', label: '2 공격', note: '다음 사람이 받는 장수' },
    { k: 'atkA', g: 'atk', t: 'num', d: 3, min: 1, max: 7, unit: '장', label: 'A 공격', note: '♥A ♦A ♣A' },
    { k: 'atkSA', g: 'atk', t: 'num', d: 5, min: 1, max: 10, unit: '장', label: '♠A 공격', note: '스페이드 에이스는 더 셈' },
    { k: 'atkBJ', g: 'atk', t: 'num', d: 5, min: 1, max: 10, unit: '장', label: '흑백 조커 공격' },
    { k: 'atkCJ', g: 'atk', t: 'num', d: 7, min: 1, max: 15, unit: '장', label: '컬러 조커 공격' },
    { k: 'counter', g: 'atk', t: 'enum', d: 'stronger', label: '받아치기 (공격 쌓기)', note: '공격받은 사람이 공격 카드로 넘길 수 있는지', opts: [['stronger', '같거나 센 것', '방금 공격과 같거나 센 공격 카드로'], ['any', '아무 공격 카드', '세기 상관없이 공격 카드면'], ['same', '같은 숫자만', '2엔 2, A엔 A, 조커엔 조커'], ['off', '못 받아침', '쌓기 없음 — 바로 받아요']] },
    { k: 'block3', g: 'atk', t: 'bool', d: true, label: '3 으로 막기', note: '공격을 같은 무늬 3 으로 막으면 아무도 안 받아요 (조커 공격엔 아무 3)' },
    { k: 'block3All', g: 'atk', t: 'enum', d: 'all', label: '3 이 막는 공격', note: '11-01 베니 님: 기본은 모든 공격', opts: [['all', '모든 공격', '2 · A · 조커 공격 다 막아요'], ['two', '2 공격만', '예전 규칙 — 2 공격만 막아요']] },
    { k: 'jokerPlay', g: 'special', t: 'enum', d: 'color', label: '조커 내기', note: '언제 조커를 낼 수 있는지', opts: [['color', '색 맞춰서', '흑백 조커는 ♠♣ 위에, 컬러 조커는 ♥♦ 위에'], ['any', '아무 때나', '어떤 카드 위에도']] },
    { k: 'seven', g: 'special', t: 'bool', d: true, label: '7 무늬 바꾸기', note: '7 을 낸 사람이 다음 무늬를 정해요' },
    { k: 'jSkip', g: 'special', t: 'bool', d: true, label: 'J 건너뛰기', note: '다음 사람을 건너뛰어요' },
    { k: 'qRev', g: 'special', t: 'bool', d: true, label: 'Q 방향 바꾸기', note: '도는 방향을 바꿔요' },
    { k: 'qTwo', g: 'special', t: 'enum', d: 'pass', label: '둘이서 Q', note: '둘이 할 때 Q 를 내면', opts: [['pass', '그냥 넘김', '방향만 바뀌고 상대 차례 (11-01 기본)'], ['again', '한 번 더', '건너뛰기처럼 내가 한 번 더']] },
    { k: 'kAgain', g: 'special', t: 'bool', d: true, label: 'K 한 번 더', note: 'K 를 낸 사람이 한 장 더 내요 (없으면 한 장 먹기)' },
    { k: 'oneCard', g: 'call', t: 'bool', d: true, label: '원카드 외치기', note: '한 장 남으면 ☝️ 원카드! 를 눌러야 해요' },
    { k: 'callPen', g: 'call', t: 'num', d: 1, min: 1, max: 5, unit: '장', label: '못 외치면 벌칙', note: '늦거나 먼저 잡히면 먹는 장수' },
    { k: 'callSec', g: 'call', t: 'num', d: 3, min: 2, max: 6, unit: '초', label: '외칠 시간', note: '한 장 남은 뒤 이 시간 안에' },
    { k: 'bust', g: 'end', t: 'num', d: 20, min: 0, max: 40, unit: '장', zero: '없음', steps: [0, 12, 15, 20, 25, 30, 40], label: '파산 장수', note: '손패가 이만큼 되면 그 판에서 빠져요' },
    { k: 'rankAll', g: 'end', t: 'bool', d: false, label: '끝까지 등수 가리기', note: '끄면 한 사람이 다 털면 바로 끝' },
    { k: 'chipPer', g: 'pay', t: 'num', d: 1, min: 1, max: 1000, unit: '칩', steps: [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000], label: '장당 칩', note: '진 사람이 남은 카드 한 장마다 이긴 사람에게 (🏦 기본 은행 1칩 = 100원)' },
    { k: 'bustPay', g: 'pay', t: 'num', d: 10, min: 0, max: 50, unit: '장', zero: '없음', label: '파산 벌금', note: '파산한 사람은 (파산 장수 + 이만큼) 장 값을 내요' },
    { k: 'placePts', g: 'pay', t: 'num', d: 5, min: 1, max: 20, unit: '장', label: '등수 한 칸 값', note: '끝까지 등수 가리기일 때 한 칸 차이마다' },
  ];
  const RULE_BY = {}; for (const d of RULE_DEFS) RULE_BY[d.k] = d;
  function defaultRules() { const r = {}; for (const d of RULE_DEFS) r[d.k] = d.d; return r; }
  function normRules(x) {
    const r = {}; x = x && typeof x === 'object' ? x : {};
    for (const d of RULE_DEFS) {
      const v = x[d.k];
      if (d.t === 'bool') r[d.k] = v == null ? d.d : (v === 'false' || v === 0 ? false : !!v);
      else if (d.t === 'num') {
        const n = Math.round(Number(v));
        let val = v == null || v === '' || !isFinite(n) ? d.d : Math.max(d.min, Math.min(d.max, n));
        if (d.k === 'bust' && val > 0 && val < 10) val = 10;                // 너무 작은 파산 장수는 판이 안 됨
        r[d.k] = val;
      } else { const hit = d.opts.find(o => String(o[0]) === String(v)); r[d.k] = hit ? hit[0] : d.d; }
    }
    return r;
  }
  function ruleText(d, v) {
    if (d.t === 'bool') return v ? '켬' : '끔';
    if (d.t === 'enum') { const o = d.opts.find(q => q[0] === v); return o ? o[1] : String(v); }
    return v === 0 && d.zero ? d.zero : v + (d.unit || '');
  }
  function diffRules(rules) {
    const r = normRules(rules), out = [];
    for (const d of RULE_DEFS) if (r[d.k] !== d.d) out.push({ k: d.k, label: d.label, text: ruleText(d, r[d.k]) });
    return out;
  }
  const RULE_PRESETS = [
    { id: 'basic', name: '기본', desc: '2는 2장 · A 3장 · ♠A·흑백 조커 5장 · 컬러 조커 7장, 같거나 센 카드로 받아쳐요', rules: {} },
    { id: 'mild', name: '순한 맛', desc: '공격 쌓기 없음 · 조커 아무 때나 · 파산 30장 · 아이와 함께', rules: { counter: 'off', jokerPlay: 'any', bust: 30, callSec: 5 } },
    { id: 'spicy', name: '화끈한 집', desc: '공격이 더 세요 (2→3 · A→5 · ♠A→7 · 조커 7·10) · 아무 공격 카드로 받아치기 · 벌칙 2장', rules: { atk2: 3, atkA: 5, atkSA: 7, atkBJ: 7, atkCJ: 10, counter: 'any', callPen: 2, bustPay: 20 } },
    { id: 'quick', name: '빠른 판', desc: '5장씩 · 파산 15장 · 외칠 시간 2초', rules: { deal: 5, bust: 15, callSec: 2 } },
    { id: 'rank', name: '끝까지 등수', desc: '한 사람이 털어도 계속 — 꼴찌까지 등수를 가려요', rules: { rankAll: true } },
  ];
  const presetRules = id => { const p = RULE_PRESETS.find(q => q.id === id); return normRules(p ? p.rules : {}); };
  function matchPreset(rules) {
    const r = normRules(rules);
    for (const p of RULE_PRESETS) { const q = presetRules(p.id); if (RULE_DEFS.every(d => d.k === 'chipPer' || q[d.k] === r[d.k])) return p.id; }
    return '';
  }
  const DEF_RULES = defaultRules();

  // 공격 세기 (0 = 공격 카드 아님)와 종류 ('2' · 'A' · 'J'(조커))
  function atkOf(c, R) {
    R = R || DEF_RULES;
    const b = c % NB;
    if (b === BJ) return R.atkBJ;
    if (b === CJ) return R.atkCJ;
    const r = b % 13;
    if (r === R_A) return b === 0 ? R.atkSA : R.atkA;
    if (r === R_2) return R.atk2;
    return 0;
  }
  const atkKind = c => { const b = c % NB; return b >= 52 ? 'J' : b % 13 === R_A ? 'A' : b % 13 === R_2 ? '2' : ''; };
  // 특수 카드 (시작 카드로는 안 씀)
  function isSpecial(c) { const b = c % NB; if (b >= 52) return true; const r = b % 13; return r === R_A || r === R_2 || r === R_7 || r === R_J || r === R_Q || r === R_K; }

  // ── 상태 ───────────────────────────────────────────────────
  const arr = (n, v) => Array.from({ length: n }, () => (typeof v === 'function' ? v() : v));
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  const sl2 = a => { const o = new Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i].slice(); return o; };
  function fastClone(s) {
    return {
      v: s.v, n: s.n, rules: s.rules, decks: s.decks, seed: s.seed, rng: s.rng, round: s.round, first: s.first,
      turn: s.turn, dir: s.dir, phase: s.phase, turnNo: s.turnNo,
      deck: s.deck.slice(), pile: s.pile.slice(), hands: sl2(s.hands),
      suit: s.suit, rank: s.rank, atk: s.atk, atkStr: s.atkStr, atkKind: s.atkKind,
      out: s.out.slice(), order: s.order.slice(), bustAt: s.bustAt.slice(),
      call: s.call ? { p: s.call.p, k: s.call.k } : null, pend: s.pend ? { p: s.pend.p, k: s.pend.k } : null,
      stat: s.stat ? { calls: s.stat.calls.slice(), pens: s.stat.pens.slice(), drawn: s.stat.drawn.slice(), reshuffles: s.stat.reshuffles } : null,
      last: s.last ? Object.assign({}, s.last) : null, result: s.result,
      me: s.me,
    };
  }
  const decksFor = (n, R) => (n > 6 || R.decks === 2 ? 2 : 1);

  // o: { players 2~8, rules, seed, first, round }
  function create(o) {
    o = o || {};
    const n = Math.max(2, Math.min(MAX_PLAYERS, o.players | 0 || 2));
    const R = normRules(o.rules);
    const decks = decksFor(n, R);
    const seed = (o.seed == null ? 1 : o.seed) | 0;
    const s = {
      v: 1, n, rules: R, decks, seed, rng: seed, round: o.round || 1, first: Math.max(0, Math.min(n - 1, o.first | 0)),
      turn: 0, dir: 1, phase: 'play', turnNo: 0,
      deck: [], pile: [], hands: arr(n, () => []),
      suit: -1, rank: -1, atk: 0, atkStr: 0, atkKind: '',
      out: arr(n, 0), order: [], bustAt: arr(n, 0),
      call: null, pend: null,
      stat: { calls: arr(n, 0), pens: arr(n, 0), drawn: arr(n, 0), reshuffles: 0 },
      last: null, result: null,
    };
    const rand = () => rnd(s);
    s.deck = shuffle(gameCards(decks), rand);
    // 나누기: 선부터 한 장씩 (더미 끝이 맨 위)
    const per = Math.min(R.deal, Math.floor((s.deck.length - 10) / n));
    for (let k = 0; k < per; k++) for (let i = 0; i < n; i++) s.hands[(s.first + i) % n].push(s.deck.pop());
    s.hands.forEach(sortHand);
    // 시작 카드: 특수 카드면 더미 맨 아래로 보내고 다시 뒤집음
    let top = s.deck.pop(), guard = 0;
    while (isSpecial(top) && guard++ < 80) { s.deck.unshift(top); top = s.deck.pop(); }
    s.pile.push(top);
    s.suit = suitOf(top); s.rank = rankOf(top);
    s.turn = s.first;
    return s;
  }
  // 다음 판: 이긴 사람이 먼저 (없으면 선 다음 사람). 씨앗은 o.seed 또는 상태 rng 에서
  function nextRound(s, o) {
    o = o || {};
    const r = s.result, w = r && r.winner >= 0 ? r.winner : (s.first + 1) % s.n;
    const seed = o.seed != null ? o.seed | 0 : (Math.floor(rnd(fastClone(s)) * 4294967296) | 0);
    return create({ players: s.n, rules: s.rules, seed, first: w, round: s.round + 1 });
  }
  // 시험용 판 만들기: { players, hands, pile (끝이 맨 위), deck (끝이 맨 위), turn, dir, suit, rank, atk, atkStr, atkKind, rules, out }
  function setup(o) {
    const s = create({ players: o.players || (o.hands ? o.hands.length : 2), rules: o.rules, seed: o.seed || 7 });
    s.hands = o.hands.map(h => sortHand(h.slice()));
    s.pile = (o.pile || [5]).slice();
    const used = new Set(s.hands.flat().concat(s.pile));
    s.deck = o.deck ? o.deck.slice() : gameCards(s.decks).filter(c => !used.has(c));
    const top = s.pile[s.pile.length - 1];
    s.suit = o.suit != null ? o.suit : suitOf(top); s.rank = o.rank != null ? o.rank : rankOf(top);
    s.turn = o.turn || 0; s.dir = o.dir || 1;
    s.atk = o.atk || 0; s.atkStr = o.atkStr || 0; s.atkKind = o.atkKind || '';
    if (o.out) s.out = o.out.slice();
    s.first = s.turn;
    return s;
  }

  // ── 차례 · 낼 수 있는 카드 ─────────────────────────────────
  const active = (s, p) => s.out[p] === 0;
  const activeCount = s => s.out.reduce((a, x) => a + (x === 0 ? 1 : 0), 0);
  // p 에서 지금 방향으로 k 칸 (빠진 사람은 건너뜀). 다른 사람이 없으면 p (빠졌으면 -1)
  function nextActive(s, p, k) {
    let q = p, left = Math.max(1, k | 0);
    for (let g = 0; g < s.n * 3 && left > 0; g++) {
      q = (q + s.dir + s.n) % s.n;
      if (active(s, q)) { left--; if (left === 0) return q; }
    }
    return active(s, p) ? p : -1;
  }
  // 맞춰 낼 수 있는가 (공격이 없을 때): 같은 무늬 · 같은 숫자 · 조커 규칙. 무늬가 -1(조커 위)이면 아무거나
  function matches(s, c) {
    const R = s.rules || DEF_RULES;
    if (isJoker(c)) {
      if (R.jokerPlay === 'any' || s.suit < 0) return true;
      return redSuit(s.suit) === (base(c) === CJ);
    }
    if (s.suit < 0) return true;
    return suitOf(c) === s.suit || (s.rank >= 0 && rankOf(c) === s.rank);
  }
  // 공격을 받는 중: 받아치기 (공격 카드) · 3 으로 2 막기
  function canCounter(s, c) {
    const R = s.rules || DEF_RULES, st = atkOf(c, R);
    if (R.counter === 'off' || st <= 0 || !matches(s, c)) return false;
    if (R.counter === 'any') return true;
    if (R.counter === 'same') return atkKind(c) === s.atkKind;
    return st >= s.atkStr;
  }
  // 3 으로 막기: 같은 무늬 3 (조커 공격 뒤엔 무늬가 없어 아무 3) · '2 공격만'이면 2 공격일 때만
  function canBlock(s, c) { const R = s.rules || DEF_RULES; return !!R.block3 && (R.block3All !== 'two' || s.atkKind === '2') && rankOf(c) === R_3 && (s.suit < 0 || suitOf(c) === s.suit); }
  function canPlay(s, c) { return s.atk > 0 ? canCounter(s, c) || canBlock(s, c) : matches(s, c); }
  function playable(s, p) { const h = s.hands[p == null ? s.turn : p]; return h.filter(c => c >= 0 && canPlay(s, c)); }

  function legal(s) {
    if (s.phase === 'end') return [];
    if (s.phase === 'suit') return [A_SUIT, A_SUIT + 1, A_SUIT + 2, A_SUIT + 3];
    if (s.phase === 'call') {
      const out = [A_CALL, A_MISS];
      for (let q = 0; q < s.n; q++) if (q !== s.call.p) out.push(A_CATCH + q);
      return out;
    }
    const out = [];
    for (const c of s.hands[s.turn]) if (c >= 0 && canPlay(s, c)) out.push(A_PLAY + c);
    out.push(A_DRAW);
    return out;
  }
  function legalMask(s) { const m = new Uint8Array(N_ACTIONS); for (const a of legal(s)) m[a] = 1; return m; }
  function isLegal(s, a) { return legal(s).indexOf(a) >= 0; }

  // ── 진행 ───────────────────────────────────────────────────
  function step(s, a) { const t = fastClone(s); const ev = []; apply(t, a, ev); return { state: t, events: ev }; }
  const E = (ev, o) => { if (ev) ev.push(o); };

  // 더미가 비면 버린 더미(맨 위 한 장만 남기고)를 섞어 새 더미로
  function refill(s, ev) {
    if (s.deck.length || s.pile.length < 2) return false;
    const top = s.pile.pop();
    s.deck = shuffle(s.pile, () => rnd(s));
    s.pile = [top];
    if (s.stat) s.stat.reshuffles++;
    E(ev, { t: 'reshuffle', n: s.deck.length });
    return true;
  }
  function drawN(s, p, n, ev, why) {
    const got = [];
    for (let i = 0; i < n; i++) {
      if (!s.deck.length) refill(s, ev);
      if (!s.deck.length) break;
      got.push(s.deck.pop());
    }
    for (const c of got) s.hands[p].push(c);
    sortHand(s.hands[p]);
    if (s.stat) s.stat.drawn[p] += got.length;
    E(ev, { t: 'draw', p, cards: got, n: got.length, want: n, why });
    return got.length;
  }
  // 파산: 손패가 파산 장수 이상이면 그 판에서 빠짐 (손패는 더미 아래로 섞어 넣음)
  function checkBust(s, p, ev) {
    const R = s.rules;
    if (!R.bust || s.out[p] !== 0 || s.hands[p].length < R.bust) return false;
    s.bustAt[p] = s.hands[p].length;
    const back = shuffle(s.hands[p].splice(0), () => rnd(s));
    s.deck = back.concat(s.deck);
    s.out[p] = 2;
    E(ev, { t: 'bust', p, n: s.bustAt[p] });
    endCheck(s, ev);
    return true;
  }
  // 남은 사람이 하나뿐이면 끝
  function endCheck(s, ev) {
    if (s.phase === 'end') return true;
    if (activeCount(s) <= 1) { finish(s, s.rules.rankAll ? 'rank' : s.order.length ? 'out' : 'last', ev); return true; }
    return false;
  }
  function playerOut(s, p, ev) {
    s.out[p] = 1; s.order.push(p);
    E(ev, { t: 'out', p, place: s.order.length });
    if (!s.rules.rankAll) { finish(s, 'out', ev); return; }
    endCheck(s, ev);
  }
  // 판 끝: 등수 · 이긴 사람 · 정산 (방 자리 기준 장수 변화, 합 0)
  function finish(s, kind, ev) {
    const R = s.rules, n = s.n;
    let order = s.order.slice();
    const rest = [];
    for (let q = 0; q < n; q++) if (s.out[q] === 0) rest.push(q);
    // 아직 남은 사람: 손패가 적은 순서 (같으면 차례가 빠른 순서)
    rest.sort((a, b) => s.hands[a].length - s.hands[b].length || ((a - s.turn + n) % n) - ((b - s.turn + n) % n));
    const busted = [];
    for (let q = 0; q < n; q++) if (s.out[q] === 2) busted.push(q);
    order = order.concat(rest).concat(busted);          // 파산은 맨 끝 (여럿이면 번호순)
    const winner = order[0];
    const pts = arr(n, 0), cards = arr(n, 0);
    for (let q = 0; q < n; q++) cards[q] = s.out[q] === 2 ? R.bust + R.bustPay : s.out[q] === 1 ? 0 : s.hands[q].length;
    if (R.rankAll) {
      for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) { const d = (j - i) * R.placePts; pts[order[i]] += d; pts[order[j]] -= d; }
      for (const b of busted) if (R.bustPay && b !== winner) { pts[winner] += R.bustPay; pts[b] -= R.bustPay; }
    } else {
      for (let q = 0; q < n; q++) if (q !== winner) { pts[winner] += cards[q]; pts[q] -= cards[q]; }
    }
    s.phase = 'end'; s.call = null; s.pend = null;
    s.result = { kind, winner, order, cards, pts, bust: busted, hands: s.hands.map(h => h.length) };
    E(ev, { t: 'end', winner, kind });
  }
  // 낸 뒤 처리: 다 털었나 → 한 장 남았나(원카드 외치기) → 다음 차례 (k = 0 한 번 더 · 1 다음 · 2 건너뛰기)
  function after(s, p, k, ev) {
    if (!s.hands[p].length) {
      playerOut(s, p, ev);
      if (s.phase === 'end') return;
      setTurn(s, nextActive(s, p, Math.max(1, k)), ev);
      return;
    }
    if (s.hands[p].length === 1 && s.rules.oneCard) {
      s.phase = 'call'; s.call = { p, k }; s.turn = p;
      E(ev, { t: 'callOpen', p });
      return;
    }
    setTurn(s, k === 0 ? p : nextActive(s, p, k), ev);
  }
  function setTurn(s, q, ev) {
    s.phase = 'play'; s.call = null; s.pend = null;
    if (q < 0 || !active(s, q)) q = nextActive(s, q < 0 ? s.turn : q, 1);
    s.turn = q;
    if (s.turnNo >= MAX_TURNS) { finish(s, 'cap', ev); return; }
    E(ev, { t: 'turn', p: q, again: false });
  }

  function apply(s, a, ev) {
    if (s.phase === 'end') throw new Error('판이 끝났어요');
    if (!isLegal(s, a)) throw new Error('할 수 없는 행동 ' + a + ' (' + s.phase + ')');
    const R = s.rules;
    s.turnNo++;
    // 원카드 외치기 결과
    if (s.phase === 'call') {
      const { p, k } = s.call;
      if (a === A_CALL) { if (s.stat) s.stat.calls[p]++; E(ev, { t: 'call', p }); }
      else {
        const by = a === A_MISS ? -1 : a - A_CATCH;
        E(ev, { t: by >= 0 ? 'caught' : 'miss', p, by, n: R.callPen });
        if (s.stat) s.stat.pens[p]++;
        drawN(s, p, R.callPen, ev, 'penalty');
        if (checkBust(s, p, ev)) { if (s.phase !== 'end') setTurn(s, nextActive(s, p, Math.max(1, k)), ev); return; }
      }
      setTurn(s, k === 0 ? p : nextActive(s, p, k), ev);
      return;
    }
    // 7: 무늬 고르기
    if (s.phase === 'suit') {
      const p = s.turn, su = a - A_SUIT;
      s.suit = su; s.rank = R_7;
      E(ev, { t: 'suit', p, suit: su });
      after(s, p, 1, ev);
      return;
    }
    const p = s.turn;
    if (a === A_DRAW) {
      if (s.atk > 0) {
        const n = s.atk;
        s.atk = 0; s.atkStr = 0; s.atkKind = '';
        drawN(s, p, n, ev, 'attack');
      } else drawN(s, p, 1, ev, 'draw');
      s.last = { p, c: -1 };
      if (checkBust(s, p, ev)) { if (s.phase !== 'end') setTurn(s, nextActive(s, p, 1), ev); return; }
      setTurn(s, nextActive(s, p, 1), ev);
      return;
    }
    // 카드 내기
    const c = a - A_PLAY, h = s.hands[p];
    const blocking = s.atk > 0 && canBlock(s, c) && !canCounter(s, c);
    h.splice(h.indexOf(c), 1);
    s.pile.push(c);
    s.last = { p, c };
    const st = atkOf(c, R);
    s.suit = suitOf(c); s.rank = rankOf(c);
    E(ev, { t: 'play', p, c });
    if (blocking) {                                     // 3 으로 2 막기: 공격이 사라짐
      E(ev, { t: 'block', p, c, n: s.atk });
      s.atk = 0; s.atkStr = 0; s.atkKind = '';
      after(s, p, 1, ev);
      return;
    }
    if (st > 0) {                                       // 공격 (받아치기면 쌓임)
      const counter = s.atk > 0;
      s.atk += st; s.atkStr = st; s.atkKind = atkKind(c);
      if (isJoker(c)) { s.suit = -1; s.rank = -1; }     // 조커 위에는 무늬 상관없이
      E(ev, { t: counter ? 'counter' : 'attack', p, c, add: st, total: s.atk });
      after(s, p, 1, ev);
      return;
    }
    const r = rankOf(c), two = activeCount(s) === 2;
    if (r === R_7 && R.seven && h.length) {             // 무늬 바꾸기 (마지막 한 장이면 그냥)
      s.phase = 'suit'; s.pend = { p, k: 1 };
      E(ev, { t: 'pickSuit', p });
      return;
    }
    if (r === R_J && R.jSkip) {
      const sk = nextActive(s, p, 1);
      E(ev, { t: 'skip', p, skipped: sk });
      after(s, p, 2, ev);
      return;
    }
    if (r === R_Q && R.qRev) {
      s.dir = -s.dir;
      const again = two && R.qTwo === 'again';           // 둘이서: 기본은 그냥 상대 차례, '한 번 더'면 건너뛰기처럼
      E(ev, { t: 'reverse', p, dir: s.dir, asSkip: again });
      after(s, p, again ? 0 : 1, ev);
      return;
    }
    if (r === R_K && R.kAgain) {
      E(ev, { t: 'again', p });
      after(s, p, 0, ev);
      return;
    }
    after(s, p, 1, ev);
  }

  // ── 보여 주기 · 관찰 ────────────────────────────────────────
  // p 가 알 수 있는 것만 (남의 손패는 장수만, 더미는 장수만, 씨앗·난수 없음). 버린 더미는 모두 본 것이라 그대로
  function view(s, p) {
    const v = clone(s);
    v.me = p; v.seed = 0; v.rng = 0;
    v.deck = s.deck.map(() => -1);
    for (let q = 0; q < s.n; q++) if (q !== p) v.hands[q] = arr(s.hands[q].length, -1);
    return v;
  }
  function debugFull(s) { return clone(s); }
  // 보이는 정보와 맞는 온전한 상태 하나 (숨은 카드를 고르게 섞음) — 결정화 몬테카를로용
  function sampleWorld(v, rand) {
    const s = fastClone(v);
    const seen = new Map();
    const see = c => seen.set(c, 1);
    for (const c of s.pile) see(c);
    const me = v.me != null ? v.me : -1;
    for (let q = 0; q < s.n; q++) for (const c of s.hands[q]) if (c >= 0) see(c);
    const unseen = shuffle(gameCards(s.decks).filter(c => !seen.has(c)), rand);
    let k = 0;
    for (let q = 0; q < s.n; q++) if (q !== me) { s.hands[q] = s.hands[q].map(c => (c >= 0 ? c : unseen[k++])); sortHand(s.hands[q]); }
    s.deck = s.deck.map(() => unseen[k++]);
    s.rng = Math.floor(rand() * 4294967296) | 0; s.seed = 0;
    delete s.me;
    return s;
  }

  // 강화학습 관찰 (p 의 정보만 — view 를 거쳐서 숨은 정보가 못 들어감)
  const PHASES = ['play', 'suit', 'call', 'end'];
  const OBS_LEN = NB * 2 + NB + 5 + 14 + 4 + 3 + 1 + 4 + 2 + 1 + MAX_PLAYERS * 3 + 2;
  function obs(s, p) {
    const v = s.me === p ? s : view(s, p);
    const o = new Float32Array(OBS_LEN);
    let at = 0;
    for (const c of v.hands[p]) o[at + base(c)] += 0.5;                // 내 손 (두 벌이면 1까지)
    at += NB;
    for (const c of v.pile) o[at + base(c)] += 0.5;                    // 버린 더미 (본 카드)
    at += NB;
    const top = v.pile[v.pile.length - 1];
    if (top != null) o[at + base(top)] = 1;                            // 맨 위 카드
    at += NB;
    o[at + (v.suit < 0 ? 4 : v.suit)] = 1; at += 5;                    // 지금 무늬 (4 = 아무거나)
    o[at + (v.rank < 0 ? 13 : v.rank)] = 1; at += 14;                  // 지금 숫자 (13 = 아무거나)
    o[at + Math.max(0, PHASES.indexOf(v.phase))] = 1; at += 4;
    const ak = ['2', 'A', 'J'].indexOf(v.atkKind); if (ak >= 0) o[at + ak] = 1; at += 3;
    o[at++] = Math.min(1, v.atk / 20);
    o[at++] = v.atk > 0 ? 1 : 0; o[at++] = Math.min(1, v.atkStr / 15); o[at++] = v.dir > 0 ? 1 : 0; o[at++] = v.call && v.call.p === p ? 1 : 0;
    o[at++] = Math.min(1, v.deck.length / (NB * v.decks)); o[at++] = v.decks === 2 ? 1 : 0;
    o[at++] = v.n / MAX_PLAYERS;
    for (let i = 0; i < MAX_PLAYERS; i++) {                            // 자리마다 (나부터 차례 순서): 손패 장수/20 · 남아 있음 · 지금 차례
      if (i < v.n) {
        const q = (p + i) % v.n;
        o[at + i * 3] = Math.min(1, v.hands[q].length / 20); o[at + i * 3 + 1] = v.out[q] === 0 ? 1 : 0; o[at + i * 3 + 2] = v.turn === q && v.phase !== 'end' ? 1 : 0;
      }
    }
    at += MAX_PLAYERS * 3;
    o[at++] = Math.min(1, v.turnNo / MAX_TURNS); o[at++] = v.rules && v.rules.oneCard ? 1 : 0;
    return o;
  }
  // 판 끝 보상 (p 기준 장수: 이기면 +, 지면 -)
  function reward(s, p) { const r = s.result; return r ? r.pts[p] : 0; }
  // 방 자리별 장수 변화 (합 0) — 칩 = 이 값 × 장당 칩
  function pointDeltas(s) { const r = s.result; return r ? r.pts.slice() : arr(s.n, 0); }

  function hash(s) {
    const str = JSON.stringify(s);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  function actionLabel(a) {
    if (a < A_DRAW) return '내기 ' + cardName(a - A_PLAY);
    if (a === A_DRAW) return '먹기';
    if (a < A_CALL) return '무늬 ' + SUIT_SYM[a - A_SUIT];
    if (a === A_CALL) return '원카드!';
    if (a < A_MISS) return '잡았다 ' + (a - A_CATCH);
    if (a === A_MISS) return '시간 지남';
    return '?';
  }

  const API = {
    VERSION: 1, NB, BJ, CJ, R_A, R_2, R_3, R_7, R_J, R_Q, R_K, SUIT_SYM, SUIT_NAME, RANK_NAME, MAX_PLAYERS, MAX_TURNS,
    A_PLAY, A_DRAW, A_SUIT, A_CALL, A_CATCH, A_MISS, N_ACTIONS, OBS_LEN, PHASES,
    base, isJoker, suitOf, rankOf, isRed, redSuit, cardName, sortHand, gameCards, atkOf, atkKind, isSpecial,
    create, nextRound, setup, legal, legalMask, isLegal, step, apply, clone, fastClone,
    nextActive, activeCount, matches, canCounter, canBlock, canPlay, playable,
    view, debugFull, sampleWorld, obs, reward, pointDeltas, hash, actionLabel, makeRng, shuffle, decksFor,
    RULE_GROUPS, RULE_DEFS, RULE_PRESETS, defaultRules, normRules, ruleText, diffRules, presetRules, matchPreset,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.OneCard = API;
})(this);

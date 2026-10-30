/* 섯다 (2장 정통 섯다) — 규칙 엔진 (core.js)
   · 화투 1월~10월 각 2장씩 총 20장 사용 (gostop/cards.js 의 정통 화투 그림 ID 와 1:1 매핑)
   · 족보: 38광땡 > 13·18광땡 > 장땡~1땡 > 알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙 > 갑오(9끗)~망통(0끗)
   · 특수 족보:
     - 암행어사 (4월 열끗 + 7월 열끗): 13광땡·18광땡을 잡음 (없으면 1끗)
     - 땡잡이 (3월 광 + 7월 열끗): 1땡~9땡을 잡음 (장땡은 못 잡음, 없으면 망통)
     - 멍텅구리 구사 (4월 열끗 + 9월 열끗): 장땡 미만(9땡 이하)의 판을 재경기(나가리/파토)로 만듦
     - 구사 (4월 + 9월): 땡 미만(알리 이하)의 판을 재경기(파토)로 만듦
   · 진행: 학교(기본 판돈 Ante) → 1차 배팅(1장 받은 뒤) → 2차 배팅(2장 완성 뒤) → 쇼다운 */
(function (root) {
  'use strict';

  // 20장 섯다 패 정의: id(0..19), month(1..10), kind('G'=광, 'Y'=열끗, 'T'=띠), gostopId(gostop/cards.js 번호)
  const CARDS = [
    { id: 0,  m: 1,  kind: 'G', gostopId: 0,  name: '1월 송학 광' },
    { id: 1,  m: 1,  kind: 'T', gostopId: 1,  name: '1월 송학 홍단' },
    { id: 2,  m: 2,  kind: 'Y', gostopId: 4,  name: '2월 매조 열끗' },
    { id: 3,  m: 2,  kind: 'T', gostopId: 5,  name: '2월 매조 홍단' },
    { id: 4,  m: 3,  kind: 'G', gostopId: 8,  name: '3월 벚꽃 광' },
    { id: 5,  m: 3,  kind: 'T', gostopId: 9,  name: '3월 벚꽃 홍단' },
    { id: 6,  m: 4,  kind: 'Y', gostopId: 12, name: '4월 흑싸리 열끗' },
    { id: 7,  m: 4,  kind: 'T', gostopId: 13, name: '4월 흑싸리 초단' },
    { id: 8,  m: 5,  kind: 'Y', gostopId: 16, name: '5월 난초 열끗' },
    { id: 9,  m: 5,  kind: 'T', gostopId: 17, name: '5월 난초 초단' },
    { id: 10, m: 6,  kind: 'Y', gostopId: 20, name: '6월 모란 열끗' },
    { id: 11, m: 6,  kind: 'T', gostopId: 21, name: '6월 모란 청단' },
    { id: 12, m: 7,  kind: 'Y', gostopId: 24, name: '7월 홍싸리 열끗' },
    { id: 13, m: 7,  kind: 'T', gostopId: 25, name: '7월 홍싸리 초단' },
    { id: 14, m: 8,  kind: 'G', gostopId: 28, name: '8월 공산 광' },
    { id: 15, m: 8,  kind: 'Y', gostopId: 29, name: '8월 공산 열끗' },
    { id: 16, m: 9,  kind: 'Y', gostopId: 32, name: '9월 국진 열끗' },
    { id: 17, m: 9,  kind: 'T', gostopId: 33, name: '9월 국진 청단' },
    { id: 18, m: 10, kind: 'Y', gostopId: 36, name: '10월 단풍 열끗' },
    { id: 19, m: 10, kind: 'T', gostopId: 37, name: '10월 단풍 청단' },
  ];

  // 행동 상수
  const A_FOLD = 0;   // 다이 (기권)
  const A_CALL = 1;   // 콜 / 체크
  const A_QUARTER = 2; // 쿼터 (판돈 25%)
  const A_HALF = 3;   // 하프 (판돈 50%)
  const A_DDADANG = 4; // 따당 (앞사람 베팅의 2배)

  function makeRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cardOf(id) { return CARDS[id]; }
  function cardName(id) { return CARDS[id] ? CARDS[id].name : '?'; }
  function gostopIdOf(id) { return CARDS[id] ? CARDS[id].gostopId : 0; }

  // 두 장(id1, id2)의 기본 족보 및 특수 속성 평가
  function evalHand(id1, id2) {
    const a = CARDS[Math.min(id1, id2)], b = CARDS[Math.max(id1, id2)];
    if (!a || !b) return { rank: 0, name: '미완성', code: 'none', special: null };
    const m1 = Math.min(a.m, b.m), m2 = Math.max(a.m, b.m);
    const bothG = a.kind === 'G' && b.kind === 'G';
    const bothY = a.kind === 'Y' && b.kind === 'Y';

    // 1. 광땡
    if (bothG) {
      if (m1 === 3 && m2 === 8) return { rank: 3000, name: '38광땡', code: '38G', desc: '천하무적 최강 족보', special: null };
      if (m1 === 1 && m2 === 8) return { rank: 2580, name: '18광땡', code: '18G', desc: '장땡을 이기는 광땡 (암행어사 주의)', special: null };
      if (m1 === 1 && m2 === 3) return { rank: 2530, name: '13광땡', code: '13G', desc: '장땡을 이기는 광땡 (암행어사 주의)', special: null };
    }

    // 2. 땡 (1땡 ~ 장땡)
    if (m1 === m2) {
      const nm = m1 === 10 ? '장땡' : m1 === 1 ? '삥땡(1땡)' : `${m1}땡`;
      return {
        rank: 2000 + m1 * 10,
        name: nm,
        code: `D${m1}`,
        desc: m1 === 10 ? '땡 중의 왕 (땡잡이에게도 안 잡힘)' : `${m1}월 두 장 땡 (땡잡이 주의)`,
        isDdaeng: true,
        ddaengMonth: m1,
        special: null,
      };
    }

    // 3. 중간 족보 (알리·독사·구삥·장삥·장사·세륙)
    if (m1 === 1 && m2 === 2) return { rank: 1600, name: '알리 (1·2월)', code: 'alli', desc: '땡 바로 아래 1등 중간 족보', special: null };
    if (m1 === 1 && m2 === 4) return { rank: 1500, name: '독사 (1·4월)', code: 'doksa', desc: '알리 다음가는 2등 중간 족보', special: null };
    if (m1 === 1 && m2 === 9) return { rank: 1400, name: '구삥 (1·9월)', code: 'gupping', desc: '독사 다음가는 3등 중간 족보', special: null };
    if (m1 === 1 && m2 === 10) return { rank: 1300, name: '장삥 (1·10월)', code: 'jangpping', desc: '구삥 다음가는 4등 중간 족보', special: null };
    if (m1 === 4 && m2 === 10) return { rank: 1200, name: '장사 (4·10월)', code: 'jangsa', desc: '장삥 다음가는 5등 중간 족보', special: null };
    if (m1 === 4 && m2 === 6) return { rank: 1100, name: '세륙 (4·6월)', code: 'seryuk', desc: '갑오(9끗)를 이기는 6등 중간 족보', special: null };

    // 4. 특수 족보 판별 (암행어사, 땡잡이, 멍텅구리 구사, 구사)
    if (a.id === 6 && b.id === 12) {
      return { rank: 101, name: '암행어사 (1끗)', code: 'amhaeng', desc: '상대 13·18광땡을 잡는 필살기 (없으면 1끗)', special: 'amhaeng' };
    }
    if (a.id === 4 && b.id === 12) {
      return { rank: 100, name: '땡잡이 (망통)', code: 'ddaengjabi', desc: '상대 1땡~9땡을 잡는 필살기 (없으면 망통)', special: 'ddaengjabi' };
    }
    if (m1 === 4 && m2 === 9) {
      if (bothY) {
        return { rank: 103, name: '멍텅구리 구사', code: 'mung94', desc: '9땡 이하 모든 판을 무효(재경기)로 만듦!', special: 'mung94' };
      }
      return { rank: 103, name: '구사 (사구파토)', code: 'gusa', desc: '알리 이하 모든 판을 무효(재경기)로 만듦!', special: 'gusa' };
    }

    // 5. 일반 끗 (갑오 ~ 망통)
    const kkeut = (m1 + m2) % 10;
    const kName = kkeut === 9 ? '갑오 (9끗)' : kkeut === 0 ? '망통 (0끗)' : `${kkeut}끗`;
    return {
      rank: 100 + kkeut,
      name: kName,
      code: `K${kkeut}`,
      desc: kkeut === 9 ? '일반 끗 중 가장 높은 9끗' : kkeut === 0 ? '가장 낮은 0끗' : `두 달의 합 끝자리 ${kkeut}끗`,
      special: null,
    };
  }

  // 여러 참가자(생존자)의 패를 비교하여 승자 또는 재경기(파토) 판정
  // hands: [{ p, c1, c2 }]
  function judgeShowdown(hands) {
    const evals = hands.map(h => {
      const e = evalHand(h.c1, h.c2);
      return Object.assign({}, h, e, { effRank: e.rank, effName: e.name });
    });

    // 특수 상성 1: 상대 중 13광땡/18광땡이 있으면 암행어사는 2600점(광땡 포획!)으로 격상
    const has13or18G = evals.some(e => e.code === '13G' || e.code === '18G');
    if (has13or18G) {
      for (const e of evals) {
        if (e.special === 'amhaeng') {
          e.effRank = 2600;
          e.effName = '암행어사 출두! (광땡 포획)';
        }
      }
    }

    // 특수 상성 2: 상대 중 1땡~9땡(장땡 제외)이 있으면 땡잡이는 2095점으로 격상
    const hasSmallDdaeng = evals.some(e => e.isDdaeng && e.ddaengMonth <= 9);
    if (hasSmallDdaeng) {
      for (const e of evals) {
        if (e.special === 'ddaengjabi') {
          e.effRank = 2095;
          e.effName = '땡잡이 발동! (땡 포획)';
        }
      }
    }

    const maxRank = Math.max(...evals.map(e => e.effRank));

    // 특수 상성 3: 구사 / 멍텅구리 구사에 의한 재경기(파토) 판정
    const hasMung94 = evals.some(e => e.special === 'mung94');
    const hasGusa = evals.some(e => e.special === 'gusa');
    if (hasMung94 && maxRank < 2100) { // 장땡(2100) 미만이면 모두 파토
      return { kind: 'rematch', reason: '멍텅구리 구사 파토! 판돈을 묻고 재경기합니다', evals, winners: [] };
    }
    if (hasGusa && maxRank < 2000) { // 1땡(2010) 미만(알리 이하)이면 파토
      return { kind: 'rematch', reason: '사구파토(구사)! 판돈을 묻고 재경기합니다', evals, winners: [] };
    }

    const winners = evals.filter(e => e.effRank === maxRank).map(e => e.p);
    if (winners.length > 1) {
      return { kind: 'rematch', reason: `동점(${evals.find(e => e.effRank === maxRank).effName}) 재경기!`, evals, winners };
    }
    return { kind: 'win', winner: winners[0], evals, winners };
  }

  // 게임 상태 생성
  function create(opts) {
    opts = opts || {};
    const n = Math.max(2, Math.min(3, opts.players || 2));
    const ante = opts.ante || 10;
    const startCoins = opts.coins || 500;
    const seed = (opts.seed >>> 0) || 12345;
    const s = {
      n,
      ante,
      seed,
      round: 0,
      first: opts.first || 0,
      carryPot: 0,
      coins: Array.from({ length: n }, () => startCoins),
      hands: Array.from({ length: n }, () => []),
      folded: Array.from({ length: n }, () => false),
      bets: Array.from({ length: n }, () => 0),
      acted: Array.from({ length: n }, () => false),
      raises: 0,
      maxRaises: 3,
      street: 1, // 1 = 첫 장 오픈 배팅, 2 = 두 장 완성 본 배팅
      pot: 0,
      curBet: 0,
      lastRaise: ante,
      turn: 0,
      phase: 'bet', // 'bet' | 'end'
      result: null,
    };
    startRound(s, seed);
    return s;
  }

  function startRound(s, seed) {
    s.round++;
    s.seed = (seed >>> 0) || ((s.seed + s.round * 0x9e3779b9) >>> 0);
    const rng = makeRng(s.seed);
    const deck = Array.from({ length: 20 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    s.deck = deck;
    s.hands = Array.from({ length: s.n }, (_, p) => [deck[p * 2], deck[p * 2 + 1]]);
    s.folded = Array.from({ length: s.n }, () => false);
    s.bets = Array.from({ length: s.n }, () => 0);
    s.acted = Array.from({ length: s.n }, () => false);
    s.raises = 0;
    s.street = 1;
    s.pot = s.carryPot;
    s.carryPot = 0;
    for (let p = 0; p < s.n; p++) {
      const pay = Math.min(s.coins[p], s.ante);
      s.coins[p] -= pay;
      s.bets[p] = pay;
      s.pot += pay;
    }
    s.curBet = s.ante;
    s.lastRaise = s.ante;
    s.turn = s.first % s.n;
    s.phase = 'bet';
    s.result = null;
    return s;
  }

  function nextRound(prev, opts) {
    const s = fastClone(prev);
    const seed = (opts && opts.seed) ? (opts.seed >>> 0) : ((s.seed + 0x85ebca6b) >>> 0);
    // 파산한 사람 리필
    for (let p = 0; p < s.n; p++) {
      if (s.coins[p] < s.ante * 3) s.coins[p] = 500;
    }
    if (s.result && s.result.winner != null) s.first = s.result.winner;
    else s.first = (s.first + 1) % s.n;
    startRound(s, seed);
    return s;
  }

  function fastClone(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function alivePlayers(s) {
    const out = [];
    for (let p = 0; p < s.n; p++) if (!s.folded[p]) out.push(p);
    return out;
  }

  function actionCost(s, p, a) {
    const toCall = Math.max(0, s.curBet - s.bets[p]);
    if (a === A_FOLD) return 0;
    if (a === A_CALL) return Math.min(s.coins[p], toCall);
    const afterCallPot = s.pot + toCall;
    let raiseAmt = s.ante;
    if (a === A_QUARTER) raiseAmt = Math.max(s.ante, Math.round(afterCallPot * 0.25 / 5) * 5);
    else if (a === A_HALF) raiseAmt = Math.max(s.ante, Math.round(afterCallPot * 0.5 / 5) * 5);
    else if (a === A_DDADANG) raiseAmt = Math.max(s.ante * 2, s.lastRaise * 2);
    return Math.min(s.coins[p], toCall + raiseAmt);
  }

  function legal(s) {
    if (s.phase !== 'bet') return [];
    const p = s.turn;
    const toCall = Math.max(0, s.curBet - s.bets[p]);
    const out = [];
    if (toCall > 0 || s.street === 2) out.push(A_FOLD);
    out.push(A_CALL);
    const maxR = s.street === 1 ? 1 : s.maxRaises;
    if (s.raises < maxR && s.coins[p] > toCall) {
      out.push(A_QUARTER, A_HALF);
      if (s.street === 2) out.push(A_DDADANG);
    }
    return out;
  }

  function isLegal(s, a) {
    return legal(s).indexOf(a) >= 0;
  }

  function step(state, a) {
    const s = fastClone(state);
    const evs = [];
    if (s.phase !== 'bet') return { state: s, events: evs };
    const p = s.turn;
    if (!isLegal(s, a)) a = A_CALL;

    const toCall = Math.max(0, s.curBet - s.bets[p]);
    if (a === A_FOLD) {
      s.folded[p] = true;
      s.acted[p] = true;
      evs.push({ t: 'fold', p });
    } else {
      const cost = actionCost(s, p, a);
      s.coins[p] -= cost;
      s.bets[p] += cost;
      s.pot += cost;
      s.acted[p] = true;
      if (a === A_CALL) {
        evs.push({ t: toCall === 0 ? 'check' : 'call', p, amount: cost });
      } else {
        const added = Math.max(s.ante, s.bets[p] - s.curBet);
        s.lastRaise = added;
        s.curBet = s.bets[p];
        s.raises++;
        for (let q = 0; q < s.n; q++) if (q !== p && !s.folded[q]) s.acted[q] = false;
        const kind = a === A_QUARTER ? 'quarter' : a === A_HALF ? 'half' : 'ddadang';
        evs.push({ t: 'raise', kind, p, amount: cost });
      }
    }

    const alive = alivePlayers(s);
    if (alive.length === 1) {
      const w = alive[0];
      const winPot = s.pot;
      s.coins[w] += winPot;
      s.phase = 'end';
      s.result = {
        kind: 'foldWin',
        winner: w,
        pot: winPot,
        reason: '상대 기권(다이)으로 승리!',
        evals: s.hands.map((h, idx) => Object.assign({ p: idx, c1: h[0], c2: h[1], folded: s.folded[idx] }, evalHand(h[0], h[1]))),
      };
      evs.push({ t: 'end', result: s.result });
      return { state: s, events: evs };
    }

    const allMatched = alive.every(q => s.acted[q] && (s.bets[q] === s.curBet || s.coins[q] === 0));
    if (allMatched) {
      if (s.street === 1) {
        s.street = 2;
        s.raises = 0;
        s.acted = Array.from({ length: s.n }, (_, q) => s.folded[q]);
        s.turn = alive[0];
        evs.push({ t: 'deal2' });
        return { state: s, events: evs };
      } else {
        // 쇼다운!
        const judge = judgeShowdown(alive.map(q => ({ p: q, c1: s.hands[q][0], c2: s.hands[q][1] })));
        const allEvals = s.hands.map((h, idx) => {
          const found = judge.evals.find(e => e.p === idx);
          return found ? Object.assign({ folded: false }, found) : Object.assign({ p: idx, c1: h[0], c2: h[1], folded: true }, evalHand(h[0], h[1]));
        });
        if (judge.kind === 'rematch') {
          s.carryPot = s.pot;
          s.phase = 'end';
          s.result = {
            kind: 'rematch',
            winner: null,
            pot: s.pot,
            reason: judge.reason,
            evals: allEvals,
          };
        } else {
          const w = judge.winner;
          const winPot = s.pot;
          s.coins[w] += winPot;
          s.phase = 'end';
          const wEval = allEvals[w];
          s.result = {
            kind: 'showdown',
            winner: w,
            pot: winPot,
            winnerHand: wEval.effName || wEval.name,
            reason: `${wEval.effName || wEval.name}(으)로 승리!`,
            evals: allEvals,
          };
        }
        evs.push({ t: 'showdown', result: s.result });
        return { state: s, events: evs };
      }
    }

    // 다음 차례 찾기
    for (let stepIdx = 1; stepIdx <= s.n; stepIdx++) {
      const nxt = (p + stepIdx) % s.n;
      if (!s.folded[nxt]) {
        s.turn = nxt;
        break;
      }
    }
    return { state: s, events: evs };
  }

  // 플레이어 p 시점의 정보 (1차 배팅 때는 각자의 첫 장만 공개, 2차 배팅 때도 상대의 두 번째 장은 뒷면)
  function view(s, p) {
    const v = fastClone(s);
    v.me = p;
    v.hands = s.hands.map((h, q) => {
      if (s.phase === 'end' || q === p) {
        return s.street === 1 && s.phase !== 'end' ? [h[0], -1] : [h[0], h[1]];
      }
      return [h[0], -1]; // 상대의 첫 장(오픈패)은 보이고 두 번째 히든패는 가림
    });
    delete v.deck;
    return v;
  }

  const API = {
    CARDS,
    A_FOLD, A_CALL, A_QUARTER, A_HALF, A_DDADANG,
    makeRng, cardOf, cardName, gostopIdOf,
    evalHand, judgeShowdown,
    create, nextRound, fastClone, legal, isLegal, actionCost, step, view,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Seotda = API;
})(this);

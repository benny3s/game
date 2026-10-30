/* 텍사스 홀덤 포커 (Texas Hold'em) — 규칙 · 7장 족보 판정 · 드로(Outs) 분석 엔진 (core.js)
   · 52장 플레잉 카드 (♠ ♥ ♦ ♣ × 2..A)
   · 족보: 로열 플러시 > 스트레이트 플러시 > 포카드 > 풀하우스 > 플러시 > 스트레이트(A-2-3-4-5 백스트레이트 포함) > 트리플 > 투페어 > 원페어 > 하이카드
   · 스트리트: 프리플랍(2장) → 플랍(공용 3장) → 턴(공용 4장) → 리버(공용 5장) → 쇼다운 */
(function (root) {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const SUIT_NAMES = ['스페이드', '하트', '다이아', '클로버'];
  const RANK_STR = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };

  // 카드 ID: 0..51 -> suit = id >> 4 (아님, id / 13 | 0), rank = (id % 13) + 2
  const CARDS = Array.from({ length: 52 }, (_, id) => {
    const suit = (id / 13) | 0;
    const rank = (id % 13) + 2;
    return {
      id,
      suit,
      rank,
      suitChar: SUITS[suit],
      rankStr: RANK_STR[rank],
      label: SUITS[suit] + RANK_STR[rank],
      isRed: suit === 1 || suit === 2,
    };
  });

  // 액션 상수
  const A_FOLD = 0;  // 폴드 (기권)
  const A_CALL = 1;  // 체크 / 콜
  const A_HALF = 2;  // 하프 팟 레이즈
  const A_POT = 3;   // 풀 팟 레이즈
  const A_ALLIN = 4; // 올인

  const STREET_NAMES = ['프리플랍 (Pre-Flop)', '플랍 (Flop)', '턴 (Turn)', '리버 (River)'];

  function makeRng(seed) {
    let s = (seed >>> 0) || 987654321;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cardOf(id) { return CARDS[id]; }
  function cardLabel(id) { return CARDS[id] ? CARDS[id].label : '?'; }
  function parseCard(str) {
    // 예: 'As', 'Ah', 'Kd', '10c', '♠A' 등 테스트 편의 파서
    const s = String(str).trim();
    const suitMap = { s: 0, '♠': 0, h: 1, '♥': 1, d: 2, '♦': 2, c: 3, '♣': 3 };
    let suit = -1, rStr = '';
    if (suitMap[s[0]] !== undefined) {
      suit = suitMap[s[0]];
      rStr = s.slice(1).toUpperCase();
    } else {
      const last = s[s.length - 1].toLowerCase();
      suit = suitMap[last];
      rStr = s.slice(0, -1).toUpperCase();
    }
    const rMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const rank = rMap[rStr];
    if (suit < 0 || !rank) throw new Error('Invalid card string: ' + str);
    return suit * 13 + (rank - 2);
  }

  // 5장 정확 족보 계산
  function eval5(ids) {
    const c0 = CARDS[ids[0]], c1 = CARDS[ids[1]], c2 = CARDS[ids[2]], c3 = CARDS[ids[3]], c4 = CARDS[ids[4]];
    const isFlush = c0.suit === c1.suit && c1.suit === c2.suit && c2.suit === c3.suit && c3.suit === c4.suit;
    const ranks = [c0.rank, c1.rank, c2.rank, c3.rank, c4.rank].sort((a, b) => b - a);

    // 빈도 카운트
    const counts = {};
    for (let i = 0; i < 5; i++) counts[ranks[i]] = (counts[ranks[i]] || 0) + 1;
    const groups = Object.keys(counts)
      .map(r => ({ r: Number(r), c: counts[r] }))
      .sort((a, b) => (b.c - a.c) || (b.r - a.r));

    // 스트레이트 판별 (A-2-3-4-5 백스트레이트 포함)
    let isStraight = false;
    let stHigh = 0;
    if (groups.length === 5) {
      if (ranks[0] - ranks[4] === 4) {
        isStraight = true;
        stHigh = ranks[0];
      } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
        isStraight = true;
        stHigh = 5; // 백스트레이트(Wheel)는 5탑 스트레이트
      }
    }

    // tie-breaker 인코딩 (15진수 5자리)
    const tie = (arr) => arr.reduce((acc, v) => acc * 15 + v, 0);
    const CAT_BASE = 1000000;

    if (isFlush && isStraight) {
      if (stHigh === 14) {
        return {
          cat: 9,
          score: 9 * CAT_BASE + 14,
          name: '로열 스트레이트 플러시',
          shortName: '로열 플러시',
          best5: ids.slice(),
        };
      }
      return {
        cat: 8,
        score: 8 * CAT_BASE + stHigh,
        name: `${RANK_STR[stHigh]}탑 스트레이트 플러시`,
        shortName: '스트레이트 플러시',
        best5: ids.slice(),
      };
    }

    if (groups[0].c === 4) {
      return {
        cat: 7,
        score: 7 * CAT_BASE + tie([groups[0].r, groups[1].r]),
        name: `${RANK_STR[groups[0].r]} 포카드`,
        shortName: '포카드',
        best5: ids.slice(),
      };
    }

    if (groups[0].c === 3 && groups[1].c === 2) {
      return {
        cat: 6,
        score: 6 * CAT_BASE + tie([groups[0].r, groups[1].r]),
        name: `${RANK_STR[groups[0].r]}·${RANK_STR[groups[1].r]} 풀하우스`,
        shortName: '풀하우스',
        best5: ids.slice(),
      };
    }

    if (isFlush) {
      return {
        cat: 5,
        score: 5 * CAT_BASE + tie(ranks),
        name: `${RANK_STR[ranks[0]]}탑 플러시`,
        shortName: '플러시',
        best5: ids.slice(),
      };
    }

    if (isStraight) {
      return {
        cat: 4,
        score: 4 * CAT_BASE + stHigh,
        name: stHigh === 5 ? '백스트레이트 (A~5)' : `${RANK_STR[stHigh]}탑 스트레이트`,
        shortName: '스트레이트',
        best5: ids.slice(),
      };
    }

    if (groups[0].c === 3) {
      return {
        cat: 3,
        score: 3 * CAT_BASE + tie([groups[0].r, groups[1].r, groups[2].r]),
        name: `${RANK_STR[groups[0].r]} 트리플`,
        shortName: '트리플',
        best5: ids.slice(),
      };
    }

    if (groups[0].c === 2 && groups[1].c === 2) {
      return {
        cat: 2,
        score: 2 * CAT_BASE + tie([groups[0].r, groups[1].r, groups[2].r]),
        name: `${RANK_STR[groups[0].r]}·${RANK_STR[groups[1].r]} 투페어`,
        shortName: '투페어',
        best5: ids.slice(),
      };
    }

    if (groups[0].c === 2) {
      return {
        cat: 1,
        score: 1 * CAT_BASE + tie([groups[0].r, groups[1].r, groups[2].r, groups[3].r]),
        name: `${RANK_STR[groups[0].r]} 원페어`,
        shortName: '원페어',
        best5: ids.slice(),
      };
    }

    return {
      cat: 0,
      score: tie(ranks),
      name: `${RANK_STR[ranks[0]]} 하이카드`,
      shortName: '하이카드',
      best5: ids.slice(),
    };
  }

  // 2~7장 중 최상의 족보 평가 (5장 이상이면 C(n,5) 전수 비교, 2~4장이면 프리플랍/임시 평가)
  function eval7(cards) {
    const valid = cards.filter(c => c >= 0);
    const n = valid.length;
    if (n < 5) {
      return evalPartial(valid);
    }
    let best = null;
    const pick = [0, 0, 0, 0, 0];
    for (let a = 0; a < n - 4; a++) {
      pick[0] = valid[a];
      for (let b = a + 1; b < n - 3; b++) {
        pick[1] = valid[b];
        for (let c = b + 1; c < n - 2; c++) {
          pick[2] = valid[c];
          for (let d = c + 1; d < n - 1; d++) {
            pick[3] = valid[d];
            for (let e = d + 1; e < n; e++) {
              pick[4] = valid[e];
              const ev = eval5(pick);
              if (!best || ev.score > best.score) best = ev;
            }
          }
        }
      }
    }
    return best;
  }

  function evalPartial(valid) {
    if (valid.length === 0) return { cat: 0, score: 0, name: '대기 중', shortName: '대기', best5: [] };
    const objs = valid.map(id => CARDS[id]).sort((a, b) => b.rank - a.rank);
    if (objs.length === 2) {
      const [a, b] = objs;
      if (a.rank === b.rank) {
        return {
          cat: 1,
          score: 1000000 + a.rank * 100,
          name: `${a.rankStr} 포켓 페어`,
          shortName: `${a.rankStr} 페어`,
          best5: valid.slice(),
        };
      }
      const suited = a.suit === b.suit ? ' 수티드(같은 무늬)' : ' 오프수딧';
      return {
        cat: 0,
        score: a.rank * 20 + b.rank,
        name: `${a.rankStr}·${b.rankStr}${suited}`,
        shortName: `${a.rankStr}${b.rankStr}${a.suit === b.suit ? 's' : 'o'}`,
        best5: valid.slice(),
      };
    }
    return {
      cat: 0,
      score: objs[0].rank,
      name: `${objs[0].rankStr} 하이`,
      shortName: `${objs[0].rankStr} 하이`,
      best5: valid.slice(),
    };
  }

  // 드로(Outs: 플러시 드로 / 양차·건샷 스트레이트 드로 / 오버카드) 정밀 분석
  function analyzeDraws(hole, board) {
    const known = hole.concat(board).filter(c => c >= 0);
    if (board.length === 0 || board.length >= 5 || hole.length < 2) {
      return { outsCount: 0, tags: [], summary: '' };
    }
    const cur = eval7(known);
    const used = new Set(known);
    let flushOuts = 0;
    let straightOuts = 0;
    let improveOuts = 0;

    // 남은 카드 1장을 뽑았을 때 플러시/스트레이트 이상으로 발전하는 카드 개수 정확히 집계
    for (let cid = 0; cid < 52; cid++) {
      if (used.has(cid)) continue;
      const nxt = eval7(known.concat([cid]));
      if (nxt.cat > cur.cat) {
        improveOuts++;
        if (nxt.cat >= 5 && cur.cat < 5) flushOuts++;
        else if (nxt.cat === 4 && cur.cat < 4) straightOuts++;
      }
    }

    const tags = [];
    if (flushOuts >= 9) tags.push(`플러시 드로 (${flushOuts} 아웃츠)`);
    if (straightOuts >= 8) tags.push(`양차 스트레이트 드로 (${straightOuts} 아웃츠)`);
    else if (straightOuts >= 4) tags.push(`건샷 스트레이트 드로 (${straightOuts} 아웃츠)`);

    // 오버카드 체크 (현재 원페어 미만일 때 내 홀카드가 보드 최고 숫자보다 높은 경우)
    if (cur.cat === 0) {
      const maxBoard = Math.max(...board.map(id => CARDS[id].rank));
      const overCnt = hole.filter(id => CARDS[id].rank > maxBoard).length;
      if (overCnt === 2) tags.push('투 오버카드 (6 아웃츠)');
      else if (overCnt === 1) tags.push('원 오버카드 (3 아웃츠)');
    }

    const totalOuts = flushOuts + straightOuts || (tags.length ? improveOuts : 0);
    const cardsLeft = board.length === 3 ? 2 : 1;
    // 4-2 법칙 근사 확률
    const hitPct = Math.min(95, totalOuts * (cardsLeft === 2 ? 4 : 2));
    const summary = tags.length
      ? `🎯 드로 분석: ${tags.join(' + ')} → 리버까지 메이드 확률 약 ${hitPct}%`
      : cur.cat >= 2
        ? `💪 현재 [${cur.name}] 메이드 완료! 상위 족보 역전만 경계하세요.`
        : `차분히 상대 베팅 크기와 팟 오즈를 비교하세요.`;

    return { outsCount: totalOuts, hitPct, tags, summary };
  }

  // 게임 생성
  function create(opts) {
    opts = opts || {};
    const n = Math.max(2, Math.min(4, opts.players || 2));
    const sb = opts.sb || 10;
    const bb = opts.bb || 20;
    const startCoins = opts.coins || 1000;
    const seed = (opts.seed >>> 0) || 12345;
    const s = {
      n,
      sb,
      bb,
      seed,
      round: 0,
      dealer: opts.dealer || 0,
      coins: Array.from({ length: n }, () => startCoins),
      hands: Array.from({ length: n }, () => []),
      board: [],
      deck: [],
      folded: Array.from({ length: n }, () => false),
      allIn: Array.from({ length: n }, () => false),
      bets: Array.from({ length: n }, () => 0),      // 현재 스트리트 베팅액
      totalBets: Array.from({ length: n }, () => 0), // 이번 핸드 총 투입액
      acted: Array.from({ length: n }, () => false),
      raises: 0,
      maxRaises: 3,
      street: 0, // 0=preflop, 1=flop, 2=turn, 3=river
      pot: 0,
      curBet: 0,
      lastRaise: bb,
      turn: 0,
      phase: 'bet', // 'bet' | 'end'
      result: null,
    };
    startRound(s, seed);
    return s;
  }

  function startRound(s, seed) {
    const rng = makeRng(seed);
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    s.seed = seed;
    s.round = (s.round || 0) + 1;
    s.deck = deck;
    s.board = [];
    s.raises = 0;
    s.street = 0;
    s.pot = 0;
    s.phase = 'bet';
    s.result = null;

    for (let p = 0; p < s.n; p++) {
      if (s.coins[p] < s.bb * 2) s.coins[p] = 1000; // 파산 시 리바이
      s.hands[p] = [deck.pop(), deck.pop()];
      s.folded[p] = false;
      s.allIn[p] = false;
      s.bets[p] = 0;
      s.totalBets[p] = 0;
      s.acted[p] = false;
    }

    // 블라인드 포스팅 (2인 헤즈업일 때는 딜러=SB, 상대=BB)
    const sbSeat = s.n === 2 ? s.dealer : (s.dealer + 1) % s.n;
    const bbSeat = s.n === 2 ? (s.dealer + 1) % 2 : (s.dealer + 2) % s.n;

    postChips(s, sbSeat, s.sb);
    postChips(s, bbSeat, s.bb);
    s.curBet = s.bb;
    s.lastRaise = s.bb;
    // 프리플랍 첫 액션은 BB 다음 사람 (헤즈업이면 딜러/SB)
    s.turn = (bbSeat + 1) % s.n;
  }

  function postChips(s, p, amt) {
    const pay = Math.min(s.coins[p], Math.max(0, Math.round(amt)));
    s.coins[p] -= pay;
    s.bets[p] += pay;
    s.totalBets[p] += pay;
    s.pot += pay;
    if (s.coins[p] === 0) s.allIn[p] = true;
    return pay;
  }

  function nextRound(s, seed) {
    const nxt = fastClone(s);
    nxt.dealer = (s.dealer + 1) % s.n;
    startRound(nxt, (seed >>> 0) || ((s.seed + 7919 * nxt.round) >>> 0));
    return nxt;
  }

  function fastClone(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function actionCost(s, p, action) {
    const toCall = Math.max(0, s.curBet - s.bets[p]);
    const myCoins = s.coins[p];
    if (action === A_FOLD) return 0;
    if (action === A_CALL) return Math.min(myCoins, toCall);
    const basePot = s.pot + toCall;
    let extra = s.bb;
    if (action === A_HALF) extra = Math.max(s.bb, Math.round(basePot * 0.5));
    else if (action === A_POT) extra = Math.max(s.bb, basePot);
    else if (action === A_ALLIN) return myCoins;
    return Math.min(myCoins, toCall + extra);
  }

  function legal(s) {
    if (s.phase !== 'bet') return [];
    const p = s.turn;
    if (s.folded[p] || s.allIn[p]) return [];
    const toCall = Math.max(0, s.curBet - s.bets[p]);
    const myCoins = s.coins[p];
    const acts = [];
    if (toCall > 0) acts.push(A_FOLD);
    acts.push(A_CALL);
    const canRaiseOpponent = s.coins.some((c, idx) => idx !== p && !s.folded[idx] && !s.allIn[idx] && c > 0);
    if (s.raises < s.maxRaises && myCoins > toCall && canRaiseOpponent) {
      const halfCost = actionCost(s, p, A_HALF);
      const potCost = actionCost(s, p, A_POT);
      if (halfCost > toCall && halfCost < myCoins) acts.push(A_HALF);
      if (potCost > halfCost && potCost < myCoins) acts.push(A_POT);
      acts.push(A_ALLIN);
    }
    return acts;
  }

  function isLegal(s, action) {
    return legal(s).includes(action);
  }

  function canActPlayers(s) {
    const res = [];
    for (let i = 0; i < s.n; i++) {
      if (!s.folded[i] && !s.allIn[i]) res.push(i);
    }
    return res;
  }

  function alivePlayers(s) {
    const res = [];
    for (let i = 0; i < s.n; i++) {
      if (!s.folded[i]) res.push(i);
    }
    return res;
  }

  function advanceStreetOrShowdown(s, evs) {
    // 추가 베팅 가능한 인원이 1명 이하이거나 리버(3)가 끝났으면 남은 보드 카드를 모두 깔고 쇼다운
    const activeCanBet = canActPlayers(s);
    if (s.street === 3 || activeCanBet.length <= 1) {
      while (s.board.length < 5) s.board.push(s.deck.pop());
      resolveShowdown(s, evs);
      return;
    }

    s.street += 1;
    if (s.street === 1) {
      s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop());
    } else {
      s.board.push(s.deck.pop());
    }
    s.curBet = 0;
    s.raises = 0;
    for (let i = 0; i < s.n; i++) {
      s.bets[i] = 0;
      s.acted[i] = s.folded[i] || s.allIn[i];
    }
    // 포스트플랍 첫 순서는 딜러 다음 생존자 (헤즈업이면 BB가 먼저 액션)
    const startIdx = s.n === 2 ? (s.dealer + 1) % 2 : (s.dealer + 1) % s.n;
    for (let k = 0; k < s.n; k++) {
      const idx = (startIdx + k) % s.n;
      if (!s.folded[idx] && !s.allIn[idx]) {
        s.turn = idx;
        break;
      }
    }
    evs.push({ t: 'street', street: s.street, board: s.board.slice() });
  }

  function resolveShowdown(s, evs) {
    const alive = alivePlayers(s);
    const evals = s.hands.map((h, idx) => {
      const ev = eval7(h.concat(s.board));
      return Object.assign({ p: idx, hole: h.slice(), folded: s.folded[idx] }, ev);
    });
    let bestScore = -1;
    for (const p of alive) {
      if (evals[p].score > bestScore) bestScore = evals[p].score;
    }
    const winners = alive.filter(p => evals[p].score === bestScore);
    const share = Math.floor(s.pot / winners.length);
    const rem = s.pot - share * winners.length;
    winners.forEach((w, i) => {
      s.coins[w] += share + (i === 0 ? rem : 0);
    });
    const w0 = winners[0];
    s.phase = 'end';
    s.result = {
      kind: 'showdown',
      winner: winners.length === 1 ? w0 : null,
      winners,
      pot: s.pot,
      winnerHand: evals[w0].name,
      reason: winners.length > 1
        ? `무승부 스플릿! (${evals[w0].name})`
        : `${evals[w0].name}(으)로 승리!`,
      evals,
    };
    evs.push({ t: 'showdown', result: s.result });
  }

  function step(state, action) {
    const s = fastClone(state);
    const evs = [];
    if (!isLegal(s, action)) throw new Error('Illegal poker action: ' + action);
    const p = s.turn;

    if (action === A_FOLD) {
      s.folded[p] = true;
      s.acted[p] = true;
      evs.push({ t: 'fold', p });
    } else {
      const cost = actionCost(s, p, action);
      const prevBet = s.curBet;
      postChips(s, p, cost);
      s.acted[p] = true;
      if (s.bets[p] > prevBet) {
        s.lastRaise = s.bets[p] - prevBet;
        s.curBet = s.bets[p];
        s.raises += 1;
        for (let i = 0; i < s.n; i++) {
          if (i !== p && !s.folded[i] && !s.allIn[i]) s.acted[i] = false;
        }
        evs.push({ t: 'raise', p, action, cost, pot: s.pot });
      } else {
        evs.push({ t: 'call', p, cost, pot: s.pot });
      }
    }

    const alive = alivePlayers(s);
    if (alive.length === 1) {
      const w = alive[0];
      const winPot = s.pot;
      s.coins[w] += winPot;
      s.phase = 'end';
      const evals = s.hands.map((h, idx) => Object.assign({ p: idx, hole: h.slice(), folded: s.folded[idx] }, eval7(h.concat(s.board))));
      s.result = {
        kind: 'foldWin',
        winner: w,
        winners: [w],
        pot: winPot,
        winnerHand: '상대 폴드',
        reason: '상대 기권(Fold)으로 팟 획득!',
        evals,
      };
      evs.push({ t: 'end', result: s.result });
      return { state: s, events: evs };
    }

    const allMatched = alive.every(idx => s.allIn[idx] || (s.acted[idx] && s.bets[idx] === s.curBet));
    if (allMatched) {
      advanceStreetOrShowdown(s, evs);
      return { state: s, events: evs };
    }

    for (let stepIdx = 1; stepIdx <= s.n; stepIdx++) {
      const nxt = (p + stepIdx) % s.n;
      if (!s.folded[nxt] && !s.allIn[nxt]) {
        s.turn = nxt;
        break;
      }
    }
    return { state: s, events: evs };
  }

  function view(s, p) {
    const v = fastClone(s);
    v.me = p;
    const showAll = s.phase === 'end' && s.result && s.result.kind === 'showdown';
    v.hands = s.hands.map((h, q) => (q === p || showAll ? h.slice() : [-1, -1]));
    delete v.deck;
    return v;
  }

  const API = {
    CARDS, SUITS, SUIT_NAMES, RANK_STR, STREET_NAMES,
    A_FOLD, A_CALL, A_HALF, A_POT, A_ALLIN,
    makeRng, cardOf, cardLabel, parseCard,
    eval5, eval7, analyzeDraws,
    create, nextRound, fastClone, legal, isLegal, actionCost, step, view,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Poker = API;
})(this);

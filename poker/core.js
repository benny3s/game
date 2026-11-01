/* 텍사스 홀덤 포커 (Texas Hold'em) — 규칙 · 7장 족보 판정 · 드로(Outs) 분석 엔진 (core.js)
   · 52장 플레잉 카드 (♠ ♥ ♦ ♣ × 2..A)
   · 족보: 로열 플러시 > 스트레이트 플러시 > 포카드 > 풀하우스 > 플러시 > 스트레이트(A-2-3-4-5 백스트레이트 포함) > 트리플 > 투페어 > 원페어 > 하이카드
   · 스트리트: 프리플랍(2장) → 플랍(공용 3장) → 턴(공용 4장) → 리버(공용 5장) → 쇼다운
   · 2~8명: 딜러 버튼·SB/BB 돌려가며, 올인은 사이드 팟, 칩이 바닥나면 탈락(마지막 한 명이 우승) */
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

  const MAX_PLAYERS = 8;

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
        if ((nxt.cat === 5 || nxt.cat >= 8) && cur.cat < 5) flushOuts++;   // 플러시(또는 스트레이트 플러시)만 — 풀하우스·포카드 아웃은 제외
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

  // ── 빠른 점수 계산 (시뮬레이션용): eval7(...).score 와 똑같은 값을 이름·배열 없이 계산
  //    8명이 몬테카를로를 돌려도 느려지지 않게 (카드 id 배열 → 숫자)
  const _rc = new Array(15).fill(0);
  function score7(cards) {
    const rc = _rc;
    for (let r = 2; r <= 14; r++) rc[r] = 0;
    const sc = [0, 0, 0, 0];
    const suitRanks = [[], [], [], []];
    let n = 0;
    for (let i = 0; i < cards.length; i++) {
      const id = cards[i];
      if (id < 0) continue;
      const suit = (id / 13) | 0, rank = (id % 13) + 2;
      rc[rank]++; sc[suit]++; suitRanks[suit].push(rank); n++;
    }
    const B = 1000000;
    const enc = arr => arr.reduce((a, v) => a * 15 + v, 0);
    // 가장 높은 스트레이트 윗숫자 (ranks: 존재 여부 함수)
    const straightHigh = has => {
      for (let hi = 14; hi >= 6; hi--) {
        if (has(hi) && has(hi - 1) && has(hi - 2) && has(hi - 3) && has(hi - 4)) return hi;
      }
      if (has(14) && has(2) && has(3) && has(4) && has(5)) return 5;
      return 0;
    };
    // 플러시(+스트레이트 플러시)
    let flushSuit = -1;
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) flushSuit = s;
    if (flushSuit >= 0) {
      const fr = suitRanks[flushSuit].slice().sort((a, b) => b - a);
      const set = new Set(fr);
      const sf = straightHigh(r => set.has(r));
      if (sf === 14) return 9 * B + 14;
      if (sf) return 8 * B + sf;
    }
    // 같은 숫자 묶음 (많은 순 → 높은 숫자 순)
    const groups = [];
    for (let r = 14; r >= 2; r--) if (rc[r]) groups.push({ r, c: rc[r] });
    groups.sort((a, b) => (b.c - a.c) || (b.r - a.r));
    if (groups[0].c === 4) {
      let kick = 0;
      for (let i = 1; i < groups.length; i++) if (groups[i].r > kick) kick = groups[i].r;
      return 7 * B + groups[0].r * 15 + kick;
    }
    if (groups[0].c === 3 && groups.length > 1 && groups[1].c >= 2) return 6 * B + groups[0].r * 15 + groups[1].r;
    if (flushSuit >= 0) {
      const fr = suitRanks[flushSuit].slice().sort((a, b) => b - a).slice(0, 5);
      return 5 * B + enc(fr);
    }
    const st = straightHigh(r => rc[r] > 0);
    if (st) return 4 * B + st;
    if (groups[0].c === 3) return 3 * B + enc([groups[0].r, groups[1].r, groups[2].r]);
    if (groups[0].c === 2 && groups.length > 1 && groups[1].c === 2) {
      // 투페어(페어가 3쌍이면 위 둘만, 남은 최고 카드가 키커)
      let kick = 0;
      for (let i = 2; i < groups.length; i++) if (groups[i].r > kick) kick = groups[i].r;
      return 2 * B + enc([groups[0].r, groups[1].r, kick]);
    }
    if (groups[0].c === 2) return 1 * B + enc([groups[0].r, groups[1].r, groups[2].r, groups[3].r]);
    const hr = groups.map(g => g.r).slice(0, 5);
    return enc(hr);
  }

  // ── 사이드 팟 ─────────────────────────────────────────────
  // contrib[p] = 이번 판에 낸 총 칩, live[p] = 패를 깔 자격(폴드 안 함)
  // 반환 [{ amount, elig:[p…] }] — 맨 앞이 메인 팟, 뒤는 사이드 팟 (올인 금액이 낮은 순)
  //  · 폴드한 사람의 칩(죽은 돈)은 그가 냈던 층에 들어감
  //  · 낸 사람이 혼자뿐인 맨 위층(아무도 안 받아 준 칩)은 그 사람에게 돌려줌: refund 표시
  function buildPots(contrib, live) {
    const levels = Array.from(new Set(contrib.filter(c => c > 0))).sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const lv of levels) {
      let amount = 0, cnt = 0;
      const elig = [];
      for (let q = 0; q < contrib.length; q++) {
        if (contrib[q] >= lv) { amount += lv - prev; cnt++; if (live[q]) elig.push(q); }
      }
      prev = lv;
      if (!amount) continue;
      if (!elig.length) {                       // 이 층을 낸 사람이 전부 폴드 → 아래 층에 합침
        if (pots.length) pots[pots.length - 1].amount += amount;
        continue;
      }
      pots.push({ amount, elig, refund: cnt === 1 });
    }
    const merged = [];
    for (const pt of pots) {
      const last = merged[merged.length - 1];
      if (last && !pt.refund && !last.refund && last.elig.join() === pt.elig.join()) last.amount += pt.amount;
      else merged.push(pt);
    }
    return merged;
  }

  // 게임 생성 (2~8명)
  function create(opts) {
    opts = opts || {};
    const n = Math.max(2, Math.min(MAX_PLAYERS, opts.players || 2));
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
      dealer: (opts.dealer || 0) % n,
      sbSeat: -1,
      bbSeat: -1,
      // 시작 칩: opts.stacks(자리별 배열)가 있으면 그대로, 없으면 모두 startCoins (나중에 은행이 꽂힐 자리)
      coins: Array.from({ length: n }, (_, i) => (opts.stacks && opts.stacks[i] > 0 ? opts.stacks[i] : startCoins)),
      out: Array.from({ length: n }, () => false),   // 칩이 바닥나 탈락한 자리
      over: false,                                   // 한 명만 남아 게임 끝
      champion: -1,
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

  // dealer 다음부터 시계 방향으로 탈락 안 한 첫 자리
  function nextActive(s, from) {
    for (let k = 1; k <= s.n; k++) {
      const q = (from + k) % s.n;
      if (!s.out[q]) return q;
    }
    return from;
  }
  function activeCount(s) {
    let c = 0;
    for (let q = 0; q < s.n; q++) if (!s.out[q]) c++;
    return c;
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

    // 칩이 없는 자리는 탈락 (다시 살리지 않음)
    for (let p = 0; p < s.n; p++) if (s.coins[p] <= 0) s.out[p] = true;
    if (activeCount(s) < 2) {
      s.over = true;
      s.champion = s.out.findIndex(o => !o);
      s.phase = 'end';
      s.result = { kind: 'over', winner: s.champion, winners: [s.champion], pot: 0, payouts: s.coins.map(() => 0), pots: [], evals: [], reason: '마지막 한 명이 남았어요! 우승!' };
      return;
    }
    s.over = false;
    s.champion = -1;
    // 딜러가 탈락했으면 다음 살아있는 자리로
    if (s.out[s.dealer]) s.dealer = nextActive(s, s.dealer);

    for (let p = 0; p < s.n; p++) {
      if (s.out[p]) {
        s.hands[p] = [];
        s.folded[p] = true;
      } else {
        s.hands[p] = [deck.pop(), deck.pop()];
        s.folded[p] = false;
      }
      s.allIn[p] = false;
      s.bets[p] = 0;
      s.totalBets[p] = 0;
      s.acted[p] = false;
    }

    // 블라인드: 2명(헤즈업)이면 딜러=SB·상대=BB, 3명 이상이면 딜러 왼쪽이 SB, 그 다음이 BB
    let sbSeat, bbSeat;
    if (activeCount(s) === 2) { sbSeat = s.dealer; bbSeat = nextActive(s, s.dealer); }
    else { sbSeat = nextActive(s, s.dealer); bbSeat = nextActive(s, sbSeat); }
    s.sbSeat = sbSeat;
    s.bbSeat = bbSeat;
    postChips(s, sbSeat, s.sb);
    postChips(s, bbSeat, s.bb);
    // 맞출 금액 = 실제 낸 블라인드 중 큰 쪽 (BB 가 짧은 칩으로 올인이면 BB 보다 작을 수 있음 → 이미 덮은 SB 에게 콜을 강요하지 않음)
    s.curBet = Math.max(s.bets[sbSeat], s.bets[bbSeat]);
    s.lastRaise = s.bb;
    // 프리플랍 첫 액션은 BB 다음 사람 (헤즈업이면 딜러/SB)
    s.turn = nextActive(s, bbSeat);
    fixTurn(s);
  }

  // 지금 차례가 올인·폴드면 다음 사람으로, 아무도 더 할 수 없으면 바로 끝까지 진행
  function fixTurn(s) {
    const evs = [];
    const can = canActPlayers(s);
    if (can.length === 0 || (can.length === 1 && s.bets[can[0]] >= s.curBet)) {
      while (s.phase === 'bet') advanceStreetOrShowdown(s, evs);
      return;
    }
    for (let k = 0; k < s.n; k++) {
      const q = (s.turn + k) % s.n;
      if (!s.folded[q] && !s.allIn[q]) { s.turn = q; return; }
    }
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
    if (nxt.over) return nxt;
    // 칩이 바닥난 자리는 탈락 처리 후, 딜러 버튼은 다음 살아있는 자리로
    for (let p = 0; p < nxt.n; p++) if (nxt.coins[p] <= 0) nxt.out[p] = true;
    nxt.dealer = nextActive(nxt, s.dealer);
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
    let extra = Math.max(s.bb, s.lastRaise);          // 최소 레이즈 = 직전 레이즈 크기
    if (action === A_HALF) extra = Math.max(extra, Math.round(basePot * 0.5));
    else if (action === A_POT) extra = Math.max(extra, basePot);
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
    s.lastRaise = s.bb;
    for (let i = 0; i < s.n; i++) {
      s.bets[i] = 0;
      s.acted[i] = s.folded[i] || s.allIn[i];
    }
    // 포스트플랍 첫 순서는 딜러 왼쪽부터 폴드·올인 아닌 첫 사람 (헤즈업이면 BB가 먼저)
    for (let k = 1; k <= s.n; k++) {
      const idx = (s.dealer + k) % s.n;
      if (!s.folded[idx] && !s.allIn[idx]) {
        s.turn = idx;
        break;
      }
    }
    evs.push({ t: 'street', street: s.street, board: s.board.slice() });
  }

  // 쇼다운: 메인 팟 → 사이드 팟 순서로, 층마다 자격자 중 최고 족보가 가져감 (동점이면 나눔, 남는 칩은 딜러 왼쪽부터)
  function resolveShowdown(s, evs) {
    const alive = alivePlayers(s);
    const evals = s.hands.map((h, idx) => {
      if (!h.length) return { p: idx, hole: [], folded: true, out: true, cat: 0, score: -1, name: '탈락', shortName: '탈락', best5: [] };
      const ev = eval7(h.concat(s.board));
      return Object.assign({ p: idx, hole: h.slice(), folded: s.folded[idx] }, ev);
    });
    const pots = buildPots(s.totalBets, s.folded.map(f => !f));
    const payouts = Array.from({ length: s.n }, () => 0);
    const potInfo = [];
    for (const pt of pots) {
      if (pt.refund) {                               // 아무도 안 받아 준 칩은 돌려줌
        s.coins[pt.elig[0]] += pt.amount; payouts[pt.elig[0]] += pt.amount;
        potInfo.push({ amount: pt.amount, elig: pt.elig, winners: [pt.elig[0]], refund: true });
        continue;
      }
      let best = -1;
      for (const q of pt.elig) if (evals[q].score > best) best = evals[q].score;
      let ws = pt.elig.filter(q => evals[q].score === best);
      // 딜러 왼쪽부터 순서대로 정렬 (남는 칩을 먼저 받는 순)
      ws = ws.slice().sort((a, b) => ((a - s.dealer - 1 + s.n) % s.n) - ((b - s.dealer - 1 + s.n) % s.n));
      const share = Math.floor(pt.amount / ws.length);
      const rem = pt.amount - share * ws.length;
      ws.forEach((w, i) => {
        const got = share + (i < rem ? 1 : 0);
        s.coins[w] += got; payouts[w] += got;
      });
      potInfo.push({ amount: pt.amount, elig: pt.elig, winners: ws });
    }
    const winnersAll = [];
    potInfo.forEach(pi => { if (!pi.refund) pi.winners.forEach(w => { if (winnersAll.indexOf(w) < 0) winnersAll.push(w); }); });
    // 메인 팟 우승자 기준으로 설명
    const main = potInfo.find(pi => !pi.refund) || potInfo[0];
    const w0 = main.winners[0];
    const top = payouts.reduce((a, b, i) => (b > payouts[a] ? i : a), 0);
    s.phase = 'end';
    s.result = {
      kind: 'showdown',
      winner: winnersAll.length === 1 ? winnersAll[0] : null,
      winners: winnersAll,
      mainWinners: main.winners.slice(),
      topPayout: top,
      pot: s.pot,
      pots: potInfo,
      payouts,
      winnerHand: evals[w0].name,
      reason: main.winners.length > 1
        ? `무승부 스플릿! (${evals[w0].name})`
        : `${evals[w0].name}(으)로 승리!` + (potInfo.filter(pi => !pi.refund).length > 1 ? ' (올인 사이드 팟 있음)' : ''),
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
        s.lastRaise = Math.max(s.lastRaise, s.bets[p] - prevBet);
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
      const evals = s.hands.map((h, idx) => (h.length
        ? Object.assign({ p: idx, hole: h.slice(), folded: s.folded[idx] }, eval7(h.concat(s.board)))
        : { p: idx, hole: [], folded: true, out: true, cat: 0, score: -1, name: '탈락', shortName: '탈락', best5: [] }));
      const payouts = Array.from({ length: s.n }, (_, q) => (q === w ? winPot : 0));
      s.result = {
        kind: 'foldWin',
        winner: w,
        winners: [w],
        pot: winPot,
        pots: [{ amount: winPot, elig: [w], winners: [w] }],
        payouts,
        winnerHand: '상대 폴드',
        reason: s.n > 2 ? '모두 폴드! 팟을 가져가요' : '상대 기권(Fold)으로 팟 획득!',
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

  // 플레이어 p 시점: 내 홀카드만 보임, 쇼다운까지 간 사람(폴드 안 한 사람)만 마지막에 공개
  //  · 덱·씨앗(seed)은 빼서 남의 카드를 거꾸로 계산 못 하게 함
  function view(s, p) {
    const v = fastClone(s);
    v.me = p;
    const showAll = s.phase === 'end' && s.result && s.result.kind === 'showdown';
    const open = q => q === p || (showAll && !s.folded[q]);
    v.hands = s.hands.map((h, q) => (!h.length ? [] : open(q) ? h.slice() : [-1, -1]));
    if (v.result && v.result.evals) {
      v.result.evals = v.result.evals.map(e => (open(e.p) || !e.hole || !e.hole.length ? e : { p: e.p, folded: e.folded, hole: [], hidden: true, name: '비공개', shortName: '비공개', cat: 0, score: 0, best5: [] }));
    }
    delete v.deck;
    delete v.seed;
    return v;
  }

  const API = {
    CARDS, SUITS, SUIT_NAMES, RANK_STR, STREET_NAMES, MAX_PLAYERS,
    A_FOLD, A_CALL, A_HALF, A_POT, A_ALLIN,
    makeRng, cardOf, cardLabel, parseCard,
    eval5, eval7, score7, analyzeDraws, buildPots,
    create, nextRound, fastClone, legal, isLegal, actionCost, step, view,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Poker = API;
})(this);

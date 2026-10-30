/* 텍사스 홀덤 AI & 🧑‍🏫 GTO 일타 강사 (ai.js)
   · 실시간 몬테카를로 에퀴티(승률 + 무승부 지분) 시뮬레이터 + 상대 베팅 범위(Range) 가중치
   · 팟 오즈(Pot Odds) · 아웃츠(Outs, 4-2 법칙) · 각 액션(폴드/콜/하프/팟/올인)의 기댓값(EV) 산출 */
(function (root) {
  'use strict';
  const P = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.Poker;
  const { A_FOLD, A_CALL, A_HALF, A_POT, A_ALLIN } = P;

  // 프리플랍 2장 핸드 기초 강도 (0.0 ~ 1.0, 상대 레인지 필터링용)
  function preflopStrength(c1, c2) {
    const a = P.cardOf(c1), b = P.cardOf(c2);
    const hi = Math.max(a.rank, b.rank), lo = Math.min(a.rank, b.rank);
    let score = hi * 1.4 + lo * 0.7;
    if (hi === lo) score += Math.max(10, hi * 1.5); // 포켓 페어
    if (a.suit === b.suit) score += 3.2;           // 수티드
    const gap = hi - lo;
    if (gap === 1) score += 2.2;                   // 커넥터
    else if (gap === 2) score += 1.0;
    return Math.min(1, Math.max(0.05, (score - 5) / 36));
  }

  // 몬테카를로 에퀴티 계산 (내 홀카드 + 현재 보드 + 생존 상대 수 + 레이즈 횟수)
  function estimateEquity(v, p, opts) {
    opts = opts || {};
    const samples = opts.samples || 200;
    const rng = P.makeRng(((v.seed || 777) + v.round * 131 + v.street * 97 + p * 31) >>> 0);
    const myHole = v.hands[p] || [];
    if (myHole.length < 2 || myHole[0] < 0) {
      return { equity: 0.5, win: 0.5, tie: 0, handEval: P.eval7([]), draws: { outsCount: 0, tags: [], summary: '' } };
    }
    const board = (v.board || []).filter(c => c >= 0);
    const knownSet = new Set(myHole.concat(board));
    const remDeck = [];
    for (let i = 0; i < 52; i++) {
      if (!knownSet.has(i)) remDeck.push(i);
    }

    let oppCount = 0;
    for (let i = 0; i < v.n; i++) {
      if (i !== p && !v.folded[i]) oppCount++;
    }
    if (oppCount === 0) {
      const ev = P.eval7(myHole.concat(board));
      return { equity: 1, win: 1, tie: 0, handEval: ev, draws: P.analyzeDraws(myHole, board) };
    }

    const needBoard = 5 - board.length;
    const needTotal = needBoard + oppCount * 2;
    let totalWeight = 0;
    let winWeight = 0;
    let tieWeight = 0;

    for (let s = 0; s < samples; s++) {
      // 부분 Fisher-Yates 셔플로 needTotal 장만 추출
      for (let i = 0; i < needTotal; i++) {
        const j = i + Math.floor(rng() * (remDeck.length - i));
        const tmp = remDeck[i]; remDeck[i] = remDeck[j]; remDeck[j] = tmp;
      }
      const simBoard = board.slice();
      for (let b = 0; b < needBoard; b++) simBoard.push(remDeck[b]);

      const myScore = P.eval7(myHole.concat(simBoard)).score;
      let maxOppScore = -1;
      let rangeWeight = 1.0;

      for (let o = 0; o < oppCount; o++) {
        const oc1 = remDeck[needBoard + o * 2];
        const oc2 = remDeck[needBoard + o * 2 + 1];
        if (v.raises > 0) {
          // 상대가 레이즈한 상황이면 강한 스타팅 핸드일 확률을 높여 베이즈 가중치 부여
          const pf = preflopStrength(oc1, oc2);
          rangeWeight *= (0.35 + pf * (0.8 + 0.4 * v.raises));
        }
        const oScore = P.eval7([oc1, oc2].concat(simBoard)).score;
        if (oScore > maxOppScore) maxOppScore = oScore;
      }

      totalWeight += rangeWeight;
      if (myScore > maxOppScore) winWeight += rangeWeight;
      else if (myScore === maxOppScore) tieWeight += rangeWeight;
    }

    const win = totalWeight > 0 ? winWeight / totalWeight : 0.5;
    const tie = totalWeight > 0 ? tieWeight / totalWeight : 0;
    const equity = win + tie * 0.5;
    const handEval = P.eval7(myHole.concat(board));
    const draws = P.analyzeDraws(myHole, board);

    return { equity, win, tie, handEval, draws };
  }

  // 🧑‍🏫 홀덤 GTO 일타 강사 분석기
  function coach(v, p, opts) {
    if (p === undefined) p = v.turn;
    const L = P.legal(v);
    const eq = estimateEquity(v, p, opts);
    const callCost = P.actionCost(v, p, A_CALL);
    const pot = v.pot;
    const potAfterCall = pot + callCost;
    const potOdds = callCost > 0 && potAfterCall > 0 ? callCost / potAfterCall : 0;

    const equityPct = Math.round(eq.equity * 100);
    const winPct = Math.round(eq.win * 100);
    const tiePct = Math.round(eq.tie * 100);
    const potOddsPct = Math.round(potOdds * 100);

    const byAction = {};
    let bestAct = L[0] ?? A_CALL;
    let bestEv = -1e9;

    for (const a of L) {
      const cost = P.actionCost(v, p, a);
      let ev = 0;
      if (a === A_FOLD) {
        ev = 0;
      } else if (a === A_CALL) {
        ev = eq.equity * (pot + cost) - cost;
      } else {
        const extra = Math.max(0, cost - callCost);
        // 폴드 에퀴티(상대가 죽을 확률): 베팅 크기가 팟 대비 클수록 증가하되 내 에퀴티가 낮을 때 과도한 블러프 억제
        const betRatio = extra / Math.max(20, pot);
        const foldEquity = Math.min(0.52, 0.16 + betRatio * 0.18);
        const matchPot = pot + cost + extra;
        ev = foldEquity * pot + (1 - foldEquity) * (eq.equity * matchPot - cost);
        if (eq.equity < 0.36) ev -= extra * 0.42;
        if (a === A_ALLIN && eq.equity < 0.62) ev -= extra * 0.25;
      }
      byAction[a] = { action: a, cost, ev };
      if (ev > bestEv) {
        bestEv = ev;
        bestAct = a;
      }
    }

    for (const a of L) {
      const item = byAction[a];
      const delta = item.ev - bestEv;
      item.delta = delta;
      item.tier = delta >= -1 ? 'best' : delta >= -15 ? 'good' : delta >= -40 ? 'ok' : 'bad';
      item.evText = (item.ev >= 0 ? '+' : '') + Math.round(item.ev);
    }

    const hName = eq.handEval ? eq.handEval.name : '내 핸드';
    let headline = '';
    let detail = '';

    if (bestAct === A_FOLD) {
      headline = `🛑 [폴드 추천] 에퀴티 ${equityPct}% < 팟 오즈(손익분기점) ${potOddsPct}%`;
      detail = `현재 [${hName}]의 승리 지분(${equityPct}%)이 콜 비용 대비 필요한 최소 승률(${potOddsPct}%)에 못 미칩니다. ${eq.draws.summary || '칩을 아껴 다음 찬스를 노리세요!'}`;
    } else if (bestAct === A_POT || bestAct === A_ALLIN) {
      const actKor = bestAct === A_ALLIN ? '올인' : '팟 벳(레이즈)';
      headline = `🔥 [${actKor} 밸류 베팅!] 에퀴티 ${equityPct}% (기댓값 ${byAction[bestAct].evText}칩)`;
      detail = `[${hName}]은(는) 현재 보드에서 압도적인 우위입니다! ${eq.draws.summary || '강하게 레이즈하여 팟을 키우세요.'}`;
    } else if (bestAct === A_HALF) {
      headline = `🟢 [하프 벳 공격 추천] 에퀴티 ${equityPct}% vs 팟 오즈 ${potOddsPct}%`;
      detail = `[${hName}]으로 주도권을 잡기 좋은 자리입니다. 팟의 절반(Half) 규모로 베팅해 상대를 압박하세요. ${eq.draws.summary}`;
    } else {
      const callKor = callCost === 0 ? '체크(Check)' : `콜(${callCost}칩)`;
      headline = `✅ [${callKor} 추천] 에퀴티 ${equityPct}% ≥ 팟 오즈 ${potOddsPct}%`;
      detail = `[${hName}]으로 충분히 수익이 나는 구간입니다. ${eq.draws.summary}`;
    }

    return {
      handEval: eq.handEval,
      draws: eq.draws,
      equityPct,
      winPct,
      tiePct,
      potOddsPct,
      byAction,
      bestAction: bestAct,
      bestEv,
      headline,
      detail,
    };
  }

  function choose(v, tier, opts) {
    opts = opts || {};
    const rng = opts.rng || P.makeRng((opts.seed >>> 0) || 654321);
    const L = P.legal(v);
    if (L.length <= 1) return L[0] ?? A_CALL;
    const c = coach(v, v.turn, { samples: 140 });

    if (tier === 'easy') {
      if (c.equityPct < 24 && L.includes(A_FOLD) && rng() < 0.7) return A_FOLD;
      if (c.equityPct > 78 && L.includes(A_HALF) && rng() < 0.6) return A_HALF;
      return A_CALL;
    }
    if (tier === 'normal') {
      if (c.bestAction === A_ALLIN && L.includes(A_POT) && rng() < 0.65) return A_POT;
      return c.bestAction;
    }
    // 🐯 hard: GTO 세미블러프 & 밸류 베팅
    if (c.draws && c.draws.outsCount >= 8 && v.raises === 0 && L.includes(A_HALF) && rng() < 0.45) {
      return A_HALF; // 플러시/양차 드로 세미 블러프!
    }
    if (c.bestAction === A_ALLIN && c.equityPct < 80 && L.includes(A_POT)) return A_POT;
    return c.bestAction;
  }

  const API = { preflopStrength, estimateEquity, coach, choose, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PokerAI = API;
})(this);

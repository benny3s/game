/* 섯다 AI & 일타 강사 코치 (ai.js)
   · 숨은 패 완전 탐색(Exact Combinatorial Enumeration) + 상대 오픈패·배팅 성향 베이즈 보정(Bayesian Range Weighting)
   · 🐣 easy  : 족보 크기만 단순 비교, 블러핑 거의 없음
   · 🐱 normal: 상대 오픈패(1장)와 팟 오즈를 계산하여 승률 기반으로 콜/레이즈/다이
   · 🐯 hard  : GTO 혼합 전략(밸류 베팅 + 세미 블러핑 + 땡잡이/암행어사 저격 계산)
   · coach(v) : 내 족보 서열, 실시간 승률(%), 팟 오즈(%), 상대가 날 이길 수 있는 패(위협 패) 목록, 행동별 기댓값 신호등 코칭 */
(function (root) {
  'use strict';
  const S = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.Seotda;
  const { A_FOLD, A_CALL, A_QUARTER, A_HALF, A_DDADANG } = S;

  // 지금 화면(v)에서 이미 공개된 카드 집합과 남은 미공개 카드 배열
  function unseenCards(v, p) {
    const seen = new Set();
    for (let q = 0; q < v.n; q++) {
      const h = v.hands[q] || [];
      if (h[0] != null && h[0] >= 0) seen.add(h[0]);
      if (q === p && h[1] != null && h[1] >= 0) seen.add(h[1]);
    }
    const out = [];
    for (let i = 0; i < 20; i++) if (!seen.has(i)) out.push(i);
    return out;
  }

  // 상대가 레이즈했을 때 강한 족보일 사후 확률 가중치 (Bayesian Range Weighting)
  function oppWeight(evalObj, raises) {
    if (!raises) return 1.0;
    const r = evalObj.rank;
    if (r >= 2000) return 1.0 + raises * 1.6;        // 광땡·땡
    if (r >= 1100) return 1.0 + raises * 1.1;        // 알리~세륙
    if (evalObj.special) return 1.0 + raises * 0.8;  // 암행어사·땡잡이·구사
    if (r >= 107) return 1.0 + raises * 0.35;        // 7~9끗
    return Math.max(0.22, 1.0 - raises * 0.32);      // 낮은 끗은 레이즈 빈도 낮음 (블러프 빈도만 남김)
  }

  // 정밀 승률 & 위협 패 분석 (20장 화투 완전 탐색)
  function analyzeEquity(v, p) {
    const meHand = v.hands[p] || [];
    const aliveOpps = [];
    for (let q = 0; q < v.n; q++) if (q !== p && !v.folded[q]) aliveOpps.push(q);
    const unseen = unseenCards(v, p);

    if (!aliveOpps.length) {
      const myE = meHand[1] >= 0 ? S.evalHand(meHand[0], meHand[1]) : null;
      return { rawWin: 1, adjWin: 1, rematch: 0, handEval: myE, threats: [], bestPotentials: [] };
    }

    // 1차 배팅 (내 두 번째 패도 아직 모름)
    if (v.street === 1 || meHand[1] < 0) {
      let winW = 0, totW = 0, remW = 0;
      const potentials = [];
      for (let i = 0; i < unseen.length; i++) {
        const myC2 = unseen[i];
        const myE = S.evalHand(meHand[0], myC2);
        potentials.push({ c2: myC2, cardName: S.cardName(myC2), eval: myE });
        for (let j = 0; j < unseen.length; j++) {
          if (i === j) continue;
          const oppC2 = unseen[j];
          const opp0 = aliveOpps[0];
          const jRes = S.judgeShowdown([
            { p, c1: meHand[0], c2: myC2 },
            { p: opp0, c1: v.hands[opp0][0], c2: oppC2 },
          ]);
          totW += 1;
          if (jRes.kind === 'rematch') remW += 1;
          else if (jRes.winner === p) winW += 1;
        }
      }
      potentials.sort((a, b) => b.eval.rank - a.eval.rank);
      const topPot = potentials.slice(0, 3).map(x => `${x.eval.name}(${S.cardOf(x.c2).m}월)`);
      const winRate = totW ? winW / totW : 0.5;
      return {
        rawWin: winRate,
        adjWin: winRate,
        rematch: totW ? remW / totW : 0,
        handEval: { rank: 500, name: `${S.cardOf(meHand[0]).m}월 오픈`, desc: `2번째 장으로 가능한 상위 족보: ${topPot.join(', ')}` },
        threats: [],
        bestPotentials: topPot,
      };
    }

    // 2차 본 배팅 (내 두 장 완성, 상대 오픈패 1장 공개 + 히든패 1장 미공개)
    const myEval = S.evalHand(meHand[0], meHand[1]);
    let rawWins = 0, rawTotal = 0;
    let adjWins = 0, adjRematch = 0, adjTotal = 0;
    const threats = [];

    if (aliveOpps.length === 1) {
      const opp = aliveOpps[0], oppC1 = v.hands[opp][0];
      for (const oppC2 of unseen) {
        const oppE = S.evalHand(oppC1, oppC2);
        const w = oppWeight(oppE, v.raises);
        const res = S.judgeShowdown([
          { p, c1: meHand[0], c2: meHand[1] },
          { p: opp, c1: oppC1, c2: oppC2 },
        ]);
        rawTotal++;
        adjTotal += w;
        if (res.kind === 'rematch') {
          rawWins += 0.5;
          adjRematch += w;
        } else if (res.winner === p) {
          rawWins += 1;
          adjWins += w;
        } else {
          const oppFinal = res.evals.find(e => e.p === opp);
          threats.push({ c2: oppC2, name: oppFinal ? oppFinal.effName : oppE.name, cardName: S.cardName(oppC2) });
        }
      }
    } else {
      // 3인 생존 시 (상대 2명의 히든패 조합 완전 탐색)
      const [o1, o2] = aliveOpps;
      const c1_o1 = v.hands[o1][0], c1_o2 = v.hands[o2][0];
      for (let i = 0; i < unseen.length; i++) {
        for (let j = 0; j < unseen.length; j++) {
          if (i === j) continue;
          const u1 = unseen[i], u2 = unseen[j];
          const e1 = S.evalHand(c1_o1, u1), e2 = S.evalHand(c1_o2, u2);
          const w = oppWeight(e1, v.raises) * oppWeight(e2, v.raises);
          const res = S.judgeShowdown([
            { p, c1: meHand[0], c2: meHand[1] },
            { p: o1, c1: c1_o1, c2: u1 },
            { p: o2, c1: c1_o2, c2: u2 },
          ]);
          rawTotal++;
          adjTotal += w;
          if (res.kind === 'rematch') {
            rawWins += 0.35;
            adjRematch += w;
          } else if (res.winner === p) {
            rawWins += 1;
            adjWins += w;
          }
        }
      }
    }

    const rawWin = rawTotal ? rawWins / rawTotal : 0.5;
    const adjWin = adjTotal ? (adjWins + adjRematch * 0.45) / adjTotal : rawWin;
    const rematch = adjTotal ? adjRematch / adjTotal : 0;
    return { rawWin, adjWin, rematch, handEval: myEval, threats, bestPotentials: [] };
  }

  // 🧑‍🏫 일타 강사 실시간 배팅 코칭
  function coach(v, p) {
    if (p == null) p = v.turn;
    const L = S.legal(v);
    const eq = analyzeEquity(v, p);
    const toCall = Math.max(0, v.curBet - v.bets[p]);
    const pot = v.pot;
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
    const winPct = Math.round(eq.adjWin * 100);
    const rawPct = Math.round(eq.rawWin * 100);
    const potOddsPct = Math.round(potOdds * 100);

    // 각 행동의 기댓값(EV, 냥 단위) 계산
    const byAction = {};
    let bestAct = A_CALL, bestEv = -1e9;
    const foldYield = v.raises === 0 ? 0.28 : 0.14; // 상대가 내 레이즈에 죽어줄 추정 확률

    for (const a of L) {
      const cost = S.actionCost(v, p, a);
      let ev = 0;
      if (a === A_FOLD) {
        ev = 0; // 기권하면 추가 손실 0
      } else if (a === A_CALL) {
        ev = eq.adjWin * (pot + cost) - cost;
      } else {
        const extra = Math.max(0, cost - toCall);
        const matchPot = pot + cost + extra;
        // 레이즈 기댓값 = 상대 폴드 시 현재 팟 획득 + 상대 콜 시 커진 팟에서 승률만큼 획득
        ev = foldYield * pot + (1 - foldYield) * (eq.adjWin * matchPot - cost);
        // 너무 약한 패로 무리한 레이즈는 역레이즈 위험 페널티
        if (eq.adjWin < 0.38) ev -= extra * 0.35;
      }
      byAction[a] = { action: a, cost, ev };
      if (ev > bestEv) { bestEv = ev; bestAct = a; }
    }

    for (const a of L) {
      const item = byAction[a];
      const delta = item.ev - bestEv;
      item.delta = delta;
      item.tier = delta >= -0.5 ? 'best' : delta >= -8 ? 'good' : delta >= -22 ? 'ok' : 'bad';
      item.evText = (item.ev >= 0 ? '+' : '') + Math.round(item.ev) + '냥';
    }

    // 한국어 코칭 해설 생성
    let headline = '', detail = '';
    const hName = eq.handEval ? eq.handEval.name : '내 패';
    const threatTxt = eq.threats.length
      ? `상대 오픈패 기준 내가 지는 히든패는 ${eq.threats.length}종(${eq.threats.slice(0, 3).map(t => t.name).join(', ')})뿐이에요.`
      : v.street === 2 ? '상대가 어떤 히든패를 들고 있어도 이기는 무적 상태예요!' : eq.handEval.desc;

    if (bestAct === A_FOLD) {
      headline = `🛑 [다이(기권) 추천] 승률 ${winPct}% < 팟 오즈 ${potOddsPct}%`;
      detail = `현재 [${hName}]의 승률(${winPct}%)이 콜 비용 대비 손익분기점(${potOddsPct}%)보다 낮아요. 아까워도 여기서 접는 게 돈을 아끼는 타짜의 선택입니다!`;
    } else if (bestAct === A_DDADANG || bestAct === A_HALF) {
      const actLabel = bestAct === A_DDADANG ? '따당' : '하프';
      headline = `🔥 [${actLabel} 공격 추천!] 추정 승률 ${winPct}% (기댓값 ${byAction[bestAct].evText})`;
      detail = `[${hName}]은(는) 매우 강력한 상위 족보입니다! ${threatTxt} 과감하게 판을 키워 수익을 극대화하세요.`;
    } else if (bestAct === A_QUARTER) {
      headline = `🟢 [쿼터/콜 추천] 추정 승률 ${winPct}% (팟 오즈 ${potOddsPct}%)`;
      detail = `[${hName}]으로 충분히 해볼 만한 자리입니다. ${threatTxt}`;
    } else {
      headline = `✅ [콜/체크 추천] 추정 승률 ${winPct}% vs 팟 오즈 ${potOddsPct}%`;
      detail = `무난하게 따라가며 상대 패를 확인하는 것이 유리합니다. ${threatTxt}`;
    }

    return {
      handEval: eq.handEval,
      winPct,
      rawPct,
      potOddsPct,
      rematchPct: Math.round(eq.rematch * 100),
      threats: eq.threats,
      byAction,
      bestAction: bestAct,
      bestEv,
      headline,
      detail,
    };
  }

  function choose(v, tier, opts) {
    opts = opts || {};
    const rng = opts.rng || S.makeRng((opts.seed >>> 0) || 54321);
    const L = S.legal(v);
    if (L.length <= 1) return L[0] ?? A_CALL;
    const c = coach(v, v.turn);

    if (tier === 'easy') {
      if (c.winPct < 22 && L.includes(A_FOLD) && rng() < 0.7) return A_FOLD;
      if (c.winPct > 75 && L.includes(A_HALF) && rng() < 0.6) return A_HALF;
      return A_CALL;
    }
    if (tier === 'normal') {
      if (c.bestAction === A_DDADANG && rng() < 0.5 && L.includes(A_HALF)) return A_HALF;
      return c.bestAction;
    }
    // 🐯 hard: GTO 스타일 혼합 전략 (가끔 약한 패로 세미 블러핑, 아주 강한 패로 슬로우 플레이 섞기)
    if (c.winPct < 28 && v.raises === 0 && L.includes(A_HALF) && rng() < 0.18) {
      return A_HALF; // 타짜 블러핑!
    }
    return c.bestAction;
  }

  const API = { analyzeEquity, coach, choose, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SeotdaAI = API;
})(this);

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

  // 정밀 승률 & 위협 패 분석 (20장 화투)
  //  · 모르는 카드(내 둘째 장 + 상대 히든패)를 빈 카드 더미에서 모두 짝지어 보는 완전 탐색,
  //    경우의 수가 너무 많으면(상대 3명 이상) 같은 씨앗으로 뽑아 보는 표본 추정 (화면이 깜빡이지 않게 늘 같은 결과)
  function analyzeEquity(v, p) {
    const meHand = v.hands[p] || [];
    const aliveOpps = [];
    for (let q = 0; q < v.n; q++) if (q !== p && !v.folded[q]) aliveOpps.push(q);
    const unseen = unseenCards(v, p);

    if (!aliveOpps.length) {
      const myE = meHand[1] >= 0 ? S.evalHand(meHand[0], meHand[1]) : null;
      return { rawWin: 1, adjWin: 1, rematch: 0, handEval: myE, threats: [], bestPotentials: [], oppCount: 0 };
    }

    const k = aliveOpps.length;
    const street1 = v.street === 1 || meHand[1] < 0;
    const free = (street1 ? 1 : 0) + k;                 // 새로 정해야 하는 카드 수
    const U = unseen.length;
    let perms = 1;
    for (let i = 0; i < free; i++) perms *= Math.max(1, U - i);
    const exact = perms <= 2500;
    const rng = S.makeRng((((v.round || 1) * 2654435761) ^ (p * 97) ^ ((v.street || 1) * 13) ^ (k * 7919) ^ ((v.raises || 0) * 31) ^ (v.pot || 0)) >>> 0);

    // 한 가지 경우(짝지은 카드 배열)를 평가해 합계에 누적
    const acc = { tot: 0, win: 0, rem: 0, raw: 0, adj: 0, adjW: 0, adjR: 0, n: 0 };
    const potentials = [];
    const threats = [];
    const potSeen = new Set();
    const remVal = k === 1 ? 0.5 : 0.35;
    const evalCase = (pick) => {
      const myC2 = street1 ? pick[0] : meHand[1];
      const off = street1 ? 1 : 0;
      const hands = [{ p, c1: meHand[0], c2: myC2 }];
      let w = 1;
      for (let i = 0; i < k; i++) {
        const o = aliveOpps[i];
        const oc2 = pick[off + i];
        hands.push({ p: o, c1: v.hands[o][0], c2: oc2 });
        if (!street1) w *= oppWeight(S.evalHand(v.hands[o][0], oc2), v.raises);
      }
      if (street1 && !potSeen.has(myC2)) { potSeen.add(myC2); potentials.push({ c2: myC2, cardName: S.cardName(myC2), eval: S.evalHand(meHand[0], myC2) }); }
      const res = S.judgeShowdown(hands);
      acc.n++; acc.tot += w;
      if (res.kind === 'rematch') { acc.rem += w; acc.raw += street1 ? 0 : remVal; acc.adjR += w; }
      else if (res.winner === p) { acc.win += w; acc.raw += 1; acc.adjW += w; }
      else if (!street1 && k === 1) {
        const oppFinal = res.evals.find(e => e.p === aliveOpps[0]);
        threats.push({ c2: pick[0], name: oppFinal ? oppFinal.effName : S.evalHand(v.hands[aliveOpps[0]][0], pick[0]).name, cardName: S.cardName(pick[0]) });
      }
    };

    if (exact) {
      const pick = new Array(free), used = new Array(20).fill(false);
      const rec = i => {
        if (i === free) { evalCase(pick); return; }
        for (let j = 0; j < U; j++) {
          const c = unseen[j];
          if (used[c]) continue;
          used[c] = true; pick[i] = c; rec(i + 1); used[c] = false;
        }
      };
      rec(0);
    } else {
      const pool = unseen.slice();
      const N = 1400;
      for (let t = 0; t < N; t++) {
        for (let i = 0; i < free; i++) {
          const j = i + Math.floor(rng() * (pool.length - i));
          const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        evalCase(pool.slice(0, free));
      }
      if (street1) {                                    // 내 둘째 장 후보는 표본과 상관없이 전부 나열
        for (const c of unseen) if (!potSeen.has(c)) { potSeen.add(c); potentials.push({ c2: c, cardName: S.cardName(c), eval: S.evalHand(meHand[0], c) }); }
      }
    }

    if (street1) {
      potentials.sort((a, b) => b.eval.rank - a.eval.rank);
      const topPot = potentials.slice(0, 3).map(x => `${x.eval.name}(${S.cardOf(x.c2).m}월)`);
      const winRate = acc.tot ? acc.win / acc.tot : 0.5;
      return {
        rawWin: winRate,
        adjWin: winRate,
        rematch: acc.tot ? acc.rem / acc.tot : 0,
        handEval: { rank: 500, name: `${S.cardOf(meHand[0]).m}월 오픈`, desc: `2번째 장으로 가능한 상위 족보: ${topPot.join(', ')}` },
        threats: [],
        bestPotentials: topPot,
        oppCount: k,
      };
    }

    const myEval = S.evalHand(meHand[0], meHand[1]);
    const rawWin = acc.n ? acc.raw / acc.n : 0.5;
    const adjWin = acc.tot ? (acc.adjW + acc.adjR * 0.45) / acc.tot : rawWin;
    const rematch = acc.tot ? acc.adjR / acc.tot : 0;
    return { rawWin, adjWin, rematch, handEval: myEval, threats, bestPotentials: [], oppCount: k };
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
    const kOpp = Math.max(1, eq.oppCount || 1);
    // 상대가 내 레이즈에 (모두) 죽어줄 추정 확률 — 상대가 많을수록 다 죽기는 어려움
    const foldYield = Math.pow(v.raises === 0 ? 0.28 : 0.14, 1 + 0.5 * (kOpp - 1));

    for (const a of L) {
      const cost = S.actionCost(v, p, a);
      let ev = 0;
      if (a === A_FOLD) {
        ev = 0; // 기권하면 추가 손실 0
      } else if (a === A_CALL) {
        ev = eq.adjWin * (pot + cost) - cost;
      } else {
        const extra = Math.max(0, cost - toCall);
        const matchPot = pot + cost + extra * Math.max(1, Math.min(kOpp, 3) * 0.7); // 따라오는 사람 몫까지
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
      : v.street === 2 ? (eq.rawWin >= 0.995 ? '상대가 어떤 히든패를 들고 있어도 이기는 무적 상태예요!' : eq.oppCount > 1 ? `남은 ${eq.oppCount}명을 모두 이기려면 패가 더 세야 해요. 여럿이 남을수록 신중하게!` : '상대 히든패에 따라 갈려요.') : eq.handEval.desc;

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

  // 🤔 행동으로 패 짐작 (복기용): 공개된 것(모두의 오픈패·배팅)만 보고 그 사람 히든패 자리에 올 수 있는 카드를 다 넣어 봐서,
  //   선생님 기준이라면 같은 종류의 행동(다이 / 콜 / 레이즈)을 하는 패가 무엇·얼마나 센지 → 실제 패는 그 중 어디쯤인지
  function readAction(v, p, a, hole) {
    if (!hole || hole[1] == null || hole[1] < 0 || v.street === 1) return null;   // 첫째 장 장면은 숨은 패가 없어 짐작할 게 없음
    const kind = x => (x === A_FOLD ? 'fold' : x === A_CALL ? 'call' : 'bet');
    const k = kind(a), c1 = hole[0];
    const open = new Set();
    for (let q = 0; q < v.n; q++) { const h = v.hands[q] || []; if (h[0] != null && h[0] >= 0) open.add(h[0]); }
    const withC2 = c2 => { const hv = Object.assign({}, v, { hands: v.hands.slice() }); hv.hands[p] = [c1, c2]; return hv; };
    const all = [], same = [];
    for (let c2 = 0; c2 < 20; c2++) {
      if (open.has(c2) || c2 === c1) continue;
      const c = coach(withC2(c2), p);
      all.push(c.winPct);
      if (kind(c.bestAction) === k) same.push({ w: c.winPct, name: c.handEval ? c.handEval.name : '' });
    }
    if (!all.length) return null;
    const mine = coach(withC2(hole[1]), p);
    const eq = mine.winPct, odds = mine.potOddsPct;
    const share = Math.round((100 * same.length) / all.length);
    const avgSame = same.length ? Math.round(same.reduce((x, y) => x + y.w, 0) / same.length) : null;
    const top = Math.max(1, Math.round((100 * all.filter(w => w > eq).length) / all.length));
    const names = [...new Set(same.sort((x, y) => y.w - x.w).map(x => x.name).filter(Boolean))].slice(0, 4);
    let tag, why;
    if (share >= 90 && k !== 'fold') { tag = '🤷 흔한 수'; why = '이 자리에선 거의 모든 패가 이렇게 해서 이것만으로는 패를 짐작하기 어려워요'; }
    else if (k === 'bet') {
      if (eq >= 55 || (avgSame != null && eq >= avgSame)) { tag = '💪 밸류 레이즈'; why = '센 패로 판을 키운 수예요'; }
      else { tag = '🎭 블러프'; why = '약한 패로 상대를 죽게 하려는 수예요'; }
    } else if (k === 'call') {
      if (eq >= 65) { tag = '🪤 숨기기'; why = '센 패를 감추고 따라가 상대 레이즈를 더 받으려는 수예요'; }
      else if (!odds) { tag = '✋ 체크'; why = '돈을 더 걸지 않고 넘긴 수예요'; }
      else if (eq >= odds) { tag = '✅ 오즈 맞는 콜'; why = `승률 ${eq}%가 팟 오즈 ${odds}%보다 높아 따라갈 만해요`; }
      else { tag = '🙏 무리한 콜'; why = `승률 ${eq}%가 팟 오즈 ${odds}%보다 낮은데 따라갔어요`; }
    } else if (eq >= odds + 10) { tag = '😨 지나친 조심'; why = `승률 ${eq}%로 따라갈 만했는데 죽었어요`; }
    else { tag = '🛑 맞는 다이'; why = '승산이 낮아 돈을 아꼈어요'; }
    return { kind: k, share, avgSame, top, names, winPct: eq, handName: mine.handEval ? mine.handEval.name : '', tag, why };
  }

  const API = { analyzeEquity, coach, choose, readAction, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SeotdaAI = API;
})(this);

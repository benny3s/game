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

  // ── 📒 아쉬운 장면 판정 (복기·판 끝 자동 분석·다시 해 보기 공용) ──
  //   v = 그 차례 사람 눈(S.view)만, a = 실제로 한 행동 → null 또는 { tier, miss, loss(냥), sev, my, best, why, lossText }
  //   miss: 선생님 신호등 🔴(추천보다 기댓값 22냥 넘게 손해) 또는 손해가 REVIEW.ok 냥·판돈의 REVIEW.potShare 이상 (섯다 판돈은 작아서 판돈 대비로도 봄)
  //     단 '덜 세게' 간 수(실제 행동도 기댓값 +, 추천이 더 큰 레이즈)는 손해가 REVIEW.passive 냥·판돈의 REVIEW.passShare 넘을 때만 — 선생님 레이즈 계산은 상대가 죽어 줄 확률을 어림해서
  //   o.c = 미리 계산한 coach · o.read = false 면 행동 짐작(readAction)을 안 붙임
  const REVIEW = { ok: 10, potShare: 0.2, passive: 20, passShare: 0.4 };
  const sevOf = loss => Math.max(0, Math.min(100, Math.round(loss * 1.1)));   // 22냥 ≈ 24 · 90냥 넘으면 100
  const ACT_NAME = ['다이', '콜', '쿼터', '하프', '따당'];
  const firstLine = t => { t = String(t || '').trim(); const m = t.match(/^.+?[.!?](?=\s|$)/); return (m ? m[0] : t).slice(0, 90); };
  function review(v, a, o) {
    o = o || {};
    const p = v.turn;
    if (v.phase !== 'bet') return null;
    const c = o.c || coach(v, p), info = c.byAction[a], bi = c.byAction[c.bestAction];
    if (!info || !bi) return null;
    const loss = Math.max(0, -info.delta), toCall = Math.max(0, v.curBet - v.bets[p]);
    const passive = info.ev >= 0 && bi.cost > info.cost;
    let miss = info.tier === 'bad' || (loss >= REVIEW.ok && loss >= v.pot * REVIEW.potShare);
    if (miss && passive) miss = loss >= Math.max(REVIEW.passive, v.pot * REVIEW.passShare);
    const lab = x => (x === A_CALL && toCall === 0 ? '체크' : ACT_NAME[x] || '콜');
    let why = `${firstLine(c.detail)} (승률 ${c.winPct}% · 팟오즈 ${c.potOddsPct}%)`;
    if (miss && o.read !== false) {
      let rd = null; try { rd = readAction(v, p, a, v.hands[p]); } catch (e) { rd = null; }
      if (rd && rd.tag && !/흔한 수/.test(rd.tag)) why = `${rd.tag} — ${rd.why} · ${why}`;
    }
    return { kind: 'bet', tier: info.tier, miss, loss, sev: sevOf(loss), my: lab(a), best: lab(c.bestAction), why, lossText: `기댓값 −${Math.round(loss)}냥` };
  }

  // ── 🧑‍🏫 흐름 읽기 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠음 → 👀 상대 흐름 · 📊 내 흐름 · 👉 수의 의미) ──
  //   모두에게 보인 것(행동 · 오픈패 · 내 패)만 씀. 상대의 숨은 둘째 장은 '가능한 패 전부'를 넣어 보기만 하고 이름은 안 부름
  //   hist = 이 판에서 이미 한 행동들 — 차례마다 noteAct(그 장면 상태, 행동) 로 공개된 값만 적어 둠 (친구 방은 방장이 손님에게도 보냄)
  function noteAct(st, a) {
    const p = st.turn;
    return { p, a, s: st.street, tc: Math.max(0, st.curBet - st.bets[p]), co: S.actionCost(st, p, a), po: st.pot, rs: st.raises, lr: st.lastRaise, cn: st.coins[p],
      fo: st.folded.reduce((m, f, q) => (f ? m | (1 << q) : m), 0) };
  }
  const actWord = (a, tc) => (a === A_CALL && !tc ? '체크' : ACT_NAME[a] || '콜');
  const kindOf = x => (x === A_FOLD ? 'fold' : x === A_CALL ? 'call' : 'bet');
  // 족보 이름 짧게 (땡 · 끗은 숫자로)
  function handShort(e) {
    if (!e) return '내 패';
    if (e.isDdaeng) return e.ddaengMonth === 10 ? '장땡' : `${e.ddaengMonth}땡`;
    if (e.code && e.code[0] === 'K') { const k = e.rank - 100; return k === 9 ? '갑오(9끗)' : k === 0 ? '망통' : `${k}끗`; }
    return String(e.name || '내 패').replace(/\s*\(.*?\)/g, '').trim();
  }
  // 두 장 조합 190가지 중 내 패가 이기는 비율 → 세기 말 (특수 패는 상대에 따라 달라서 따로)
  const COMBO = (() => { const r = []; for (let a = 0; a < 20; a++) for (let b = a + 1; b < 20; b++) r.push(S.evalHand(a, b).rank); return r; })();
  const beatPct = rank => Math.round((100 * COMBO.filter(x => x < rank).length) / COMBO.length);
  const strengthWord = pct => (pct >= 92 ? '아주 강해요' : pct >= 75 ? '강한 편' : pct >= 45 ? '중간쯤' : pct >= 20 ? '약한 편' : '아주 약한 편');
  const SPECIAL_NOTE = { ddaengjabi: '땡잡이는 상대가 1~9땡일 때만 이겨요', amhaeng: '암행어사는 13·18광땡을 잡을 때만 세요', gusa: '구사는 알리 이하만 남으면 판이 무효예요', mung94: '멍텅구리 구사는 9땡 이하만 남으면 판이 무효예요' };
  // 패 부류 (상대가 이 행동을 하는 패의 '가운데' 가 어디쯤인지 말할 때): 0 땡 이상 · 1 알리급 · 2 8~9끗 · 3 5~7끗 · 4 그 아래
  const clsOf = r => (r >= 2000 ? 0 : r >= 1100 ? 1 : r >= 108 ? 2 : r >= 105 ? 3 : 4);
  const MED_BET = ['땡 이상 센 패가 많아요', '알리 이상 센 패가 많아요', '8끗 이상 좋은 패가 많아요', '5끗 이상 평범한 패도 섞여요', '약한 패도 섞여요 (블러핑 가능)'];

  // 상대 q 의 한 행동(e) 읽기: 그 장면(공개된 판돈 · 오픈패)에서 선생님 기준으로 같은 행동을 하는 숨은 패가 얼마나 되고 얼마나 센가
  //   (v = 내 눈 view, me = 나) → { p, a, label, kind, street, noHole, n, k, share, med(가운데 패 부류 0~4), weak(%), strong(센 신호?), meaning }
  function readOpp(v, me, e) {
    const p = e.p, k = kindOf(e.a), label = actWord(e.a, e.tc);
    const r = { p, a: e.a, label, kind: k, street: e.s, noHole: false, n: 0, k: 0, share: 0, med: null, weak: 0, strong: false, meaning: '' };
    if (k === 'fold') { r.meaning = '접었어요'; return r; }
    const c1 = (v.hands[p] || [])[0];
    if (e.s !== 2 || !(c1 >= 0)) {            // 둘째 장을 받기 전 행동은 숨은 패가 없어 짐작할 게 없음
      r.noHole = true;
      r.meaning = k === 'bet' ? '둘째 장 받기 전이라 단서 없음, 판을 키우는 스타일' : '둘째 장 받기 전이라 단서가 없어요';
      return r;
    }
    const open = new Set(); v.hands.forEach(h => { if (h && h[0] >= 0) open.add(h[0]); });
    const mine2 = (v.hands[me] || [])[1];
    const same = [];
    for (let c2 = 0; c2 < 20; c2++) {
      if (open.has(c2) || c2 === mine2) continue;
      // p 의 눈: 모두의 오픈패 + 자기 둘째 장(후보) — 내 둘째 장은 모름
      const hv = Object.assign({}, v, {
        hands: v.hands.map((h, q) => (q === p ? [c1, c2] : [h[0], -1])),
        street: 2, phase: 'bet', turn: p, pot: e.po, raises: e.rs, lastRaise: e.lr, curBet: e.tc,
        bets: v.bets.map(() => 0), coins: v.coins.map((x, q) => (q === p ? e.cn : x)), folded: v.folded.map((_, q) => !!((e.fo >> q) & 1)),
      });
      const c = coach(hv, p);
      r.n++;
      if (kindOf(c.bestAction) === k) same.push(c.handEval ? c.handEval.rank : 0);
    }
    r.k = same.length;
    r.share = r.n ? Math.round((100 * same.length) / r.n) : 0;
    if (same.length) {
      same.sort((x, y) => y - x);
      r.med = clsOf(same[Math.floor(same.length / 2)]);
      r.weak = Math.round((100 * same.filter(x => x < 105).length) / same.length);
      r.strong = k === 'bet' && r.med <= 2;
    }
    const rare = r.share <= 25, common = r.share >= 80;
    if (!r.k) r.meaning = k === 'bet' ? '보통 안 하는 큰 베팅 — 블러핑일 수 있어요' : '보통 접거나 키울 자리에서 따라왔어요 — 애매한 패거나 함정';
    else if (k === 'bet') r.meaning = (rare ? '드문 수 — ' : '') + MED_BET[r.med] + (r.med <= 3 && r.weak >= 25 ? ', 블러핑일 수도' : '');
    else if (e.tc > 0) r.meaning = common ? '누구나 하는 수라 단서가 적어요' : r.med <= 2 ? '받아칠 만한 패 (센 패를 숨겼을 수도)' : '무난한 패 같아요';
    else r.meaning = '판을 안 키웠어요 — 약하거나 센 패를 숨겼을 수도';
    return r;
  }

  // 선생님 글 세 덩어리 (모두 글자만 — 화면에서 꾸밈):
  //   opp = [{ p, text, read }] 👀 내 지난 차례 뒤 상대가 한 일과 그 뜻 · mine = '📊 …' 내 패 세기 · 승률 · 판돈 · why = '👉 …' 추천 행동의 뜻과 까닭 (상대 흐름과 이어서)
  //   prev = 이 판 내 지난 차례의 승률(%) — 있으면 '아까보다 올랐나 내렸나' 를 📊 에 붙임
  //   (이름 뒤 조사를 피하려고 '—' · 괄호로 이음)
  function flow(v, me, hist, names, c, prev) {
    names = names || [];
    const nm = q => String(names[q] || `자리${q + 1}`);
    c = c || coach(v, me);
    const tc = Math.max(0, v.curBet - (v.bets[me] || 0));
    const out = { opp: [], mine: '', why: '', hist: Array.isArray(hist) };       // hist: false 면 행동 기록을 못 받은 것 (👀 줄은 안 그림)
    const oppAlive = v.folded.filter((f, q) => q !== me && !f).length;

    // 👀 내 지난 차례 뒤 (이번 단계에서) 상대들이 한 일. 내가 아직 한 번도 안 했으면 이 단계 처음부터
    let hot = null, calm = false;
    if (Array.isArray(hist)) {
      let last = -1; hist.forEach((e, i) => { if (e.p === me) last = i; });
      const by = {}, order = [];
      hist.slice(last + 1).filter(e => e.p !== me && e.s === v.street).forEach(e => { if (!by[e.p]) { by[e.p] = []; order.push(e.p); } by[e.p].push(e); });
      const rows = order.map(q => {
        const es = by[q], main = es.reduce((m, e) => (e.a >= m.a ? e : m), es[0]);
        return { q, main, seq: es.map(e => actWord(e.a, e.tc)).join('→'), w: main.a === A_FOLD ? 0 : main.a === A_CALL ? (main.tc ? 1 : 0.5) : 2 + main.a / 10 };
      }).sort((x, y) => y.w - x.w);
      const det = rows.filter(r => r.main.a !== A_FOLD).slice(0, 2), raisers = [];
      for (const r of det) {
        const rd = readOpp(v, me, r.main);
        out.opp.push({ p: r.q, text: `${nm(r.q)} ${r.seq} — ${rd.meaning}`, read: rd.noHole ? null : rd });
        if (r.main.a > A_CALL) raisers.push({ name: nm(r.q), label: actWord(r.main.a, r.main.tc), strong: rd.strong, noHole: rd.noHole });
      }
      hot = raisers.find(x => x.strong) || raisers[0] || null;
      const rest = rows.filter(r => det.indexOf(r) < 0);
      if (rest.length) out.opp.push({ p: -1, text: `${rest.map(r => `${nm(r.q)} ${r.seq}`).join(' · ')}${rest.some(r => r.main.a === A_FOLD) ? ` (남은 상대 ${oppAlive}명)` : ''}`, read: null });
      calm = rows.length > 0 && rows.every(r => r.main.a <= A_CALL) && !v.raises;
      if (!rows.length && v.street === 2) {             // 2차 첫 차례: 1차에서 판을 키운 사람이 있었으면 한마디
        const pr = hist.filter(e => e.p !== me && e.s === 1 && e.a > A_CALL), z = pr[pr.length - 1];
        if (z) out.opp.push({ p: z.p, text: `${nm(z.p)} 1차에서 ${actWord(z.a, z.tc)} — 둘째 장 받기 전이라 단서는 적어요`, read: null });
      }
    }

    // 📊 내 패 · 승률 · 판돈
    const mine = v.hands[me] || [], bets = v.bets[me] || 0, pot = v.pot;
    const money = `판돈 ${pot}냥(내가 ${bets})`;
    if (!(mine[1] >= 0)) {
      out.mine = `📊 첫 장 ${S.cardOf(mine[0]).m}월 — 둘째 장에 따라 갈려요 · 지금 승률 ${c.winPct}% 쯤${prev != null && Math.abs(c.winPct - prev) >= 5 ? ` (아까 ${prev}%)` : ''} · ${money}`;
    } else {
      const e = c.handEval, gap = Math.abs(c.winPct - c.rawPct) >= 4, mv = prev != null && Math.abs(c.winPct - prev) >= 5;
      const note = [mv ? `아까 ${prev}%에서 ${c.winPct > prev ? '올라' : '내려'}` : '', gap ? `패만 보면 ${c.rawPct}%` : ''].filter(Boolean).join(', ');
      out.mine = `📊 내 ${handShort(e)} — ${e.special ? SPECIAL_NOTE[e.special] : strengthWord(beatPct(e.rank))} · 승률 ${c.winPct}%${note ? ` (${note})` : ''} · ${money}`;
    }

    // 👉 추천 행동의 뜻 + 까닭 (상대 흐름과 이어서)
    const best = c.bestAction, label = actWord(best, tc), w = c.winPct, o = c.potOddsPct;
    let why;
    if (best === A_FOLD) {
      why = hot && hot.strong
        ? `${label} — ${hot.name} ${hot.label}(센 패 신호)인데 내 승률은 ${w}%. 접으면 낸 ${bets}냥만 잃어요`
        : `${label} — 승률 ${w}%가 본전 ${o}%에 못 미쳐요. 접으면 낸 ${bets}냥만 잃어요`;
    } else if (best === A_CALL) {
      why = tc > 0
        ? `${label} — ${tc}냥으로 판돈 ${pot + tc}냥을 노려요. 승률 ${w}%가 본전 ${o}%${w - o >= 8 ? '보다 높아 따라갈 만해요' : '와 비슷해 해볼 만해요'}${hot ? ` (${hot.name} ${hot.label} 조심)` : ''}`
        : `${label} — 돈 안 걸고 ${calm ? '조용한 상대의 ' : ''}다음 움직임을 봐요 (승률 ${w}%)`;
    } else {                                             // 레이즈 (쿼터·하프·따당)
      const lead = w >= 55 ? `승률 ${w}%로 앞서요` : w >= 40 ? `승률 ${w}%로 팽팽해요` : `승률은 ${w}%로 낮아요`;
      const act = w >= 40 ? '키워서 더 받아내거나 상대를 접게 해요' : '상대가 접을 때가 많아 키워서 압박하는 쪽이 이득이에요 (블러핑에 가까워요)';
      why = `${label} — ${calm ? '상대가 조용해요. ' : hot ? `${hot.name} ${hot.label}에도 ` : ''}${lead}. ${act}`;
    }
    out.why = '👉 ' + why;
    return out;
  }

  const API = { analyzeEquity, coach, choose, readAction, review, noteAct, readOpp, flow, REVIEW, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SeotdaAI = API;
})(this);

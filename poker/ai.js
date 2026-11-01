/* 텍사스 홀덤 AI & 🧑‍🏫 GTO 일타 강사 (ai.js)
   · 실시간 몬테카를로 에퀴티(승률 + 무승부 지분) 시뮬레이터 + 상대 베팅 범위(Range) 가중치
   · 선생님 읽기 (11-01): 공개 행동 기록(logAct·logFrom) → 상대마다 '그 행동을 했을 법한 패' 범위 → 내 승률 · 👀 상대 흐름 / 📊 내 흐름 / 👉 수의 의미 글 (coach 에 opts.log 를 주면)
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
    // 씨앗은 남의 카드를 알려 줄 수 있어 뷰에서 빠짐 → 판 번호·거리·내 자리로 정한 값 (화면이 깜빡이지 않게 늘 같은 결과)
    const rng = P.makeRng((777 + (v.round || 1) * 131 + (v.street || 0) * 97 + p * 31 + (v.pot || 0) * 7 + (v.board ? v.board.length : 0) * 13) >>> 0);
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
      if (i !== p && !v.folded[i] && !(v.out && v.out[i])) oppCount++;
    }
    if (oppCount === 0) {
      const ev = P.eval7(myHole.concat(board));
      return { equity: 1, win: 1, tie: 0, handEval: ev, draws: P.analyzeDraws(myHole, board) };
    }

    // 📜 공개 행동으로 읽은 상대 범위가 있으면 그 범위에서 상대 패를 뽑아 겨룸 (없으면 아래 예전 방식)
    if (opts.ranges) return equityVsRanges(v, p, opts.ranges, myHole, board, oppCount, samples, rng);

    const needBoard = 5 - board.length;
    const needTotal = needBoard + oppCount * 2;
    let totalWeight = 0;
    let winWeight = 0;
    let tieWeight = 0;
    let tieShare = 0;   // 같은 점수로 비길 때 나눠 갖는 몫 (여럿이 비기면 1/n)

    for (let s = 0; s < samples; s++) {
      // 부분 Fisher-Yates 셔플로 needTotal 장만 추출
      for (let i = 0; i < needTotal; i++) {
        const j = i + Math.floor(rng() * (remDeck.length - i));
        const tmp = remDeck[i]; remDeck[i] = remDeck[j]; remDeck[j] = tmp;
      }
      const simBoard = board.slice();
      for (let b = 0; b < needBoard; b++) simBoard.push(remDeck[b]);

      const myScore = P.score7(myHole.concat(simBoard));
      let maxOppScore = -1;
      let tiedOpp = 0;
      let rangeWeight = 1.0;

      for (let o = 0; o < oppCount; o++) {
        const oc1 = remDeck[needBoard + o * 2];
        const oc2 = remDeck[needBoard + o * 2 + 1];
        if (v.raises > 0 && !opts.flat) {
          // 상대가 레이즈한 상황이면 강한 스타팅 핸드일 확률을 높여 베이즈 가중치 부여
          const pf = preflopStrength(oc1, oc2);
          rangeWeight *= (0.35 + pf * (0.8 + 0.4 * v.raises));
        }
        const oScore = P.score7([oc1, oc2].concat(simBoard));
        if (oScore > maxOppScore) { maxOppScore = oScore; tiedOpp = 1; }
        else if (oScore === maxOppScore) tiedOpp++;
      }

      totalWeight += rangeWeight;
      if (myScore > maxOppScore) winWeight += rangeWeight;
      else if (myScore === maxOppScore) { tieWeight += rangeWeight; tieShare += rangeWeight / (tiedOpp + 1); }
    }

    const win = totalWeight > 0 ? winWeight / totalWeight : 0.5;
    const tie = totalWeight > 0 ? tieWeight / totalWeight : 0;
    const equity = win + (totalWeight > 0 ? tieShare / totalWeight : 0);
    const handEval = P.eval7(myHole.concat(board));
    const draws = P.analyzeDraws(myHole, board);

    return { equity, win, tie, handEval, draws, oppCount };
  }

  // ─────────────────────────────────────────────────────────────
  // 📜 공개 행동 기록 + 상대 범위 읽기 (선생님 '👀 상대 흐름 · 📊 내 흐름 · 👉 수의 의미', 11-01)
  //   기록(log) 한 줄 = 모두에게 보인 행동 하나: { p 자리, s 거리, k fold|check|call|bet|raise, cost, to(이 거리 총 베팅), prev(그 전 맞출 금액), call(맞출 금액),
  //     pot(그 전 팟), n(이 거리 앞선 레이즈 수), frac(레이즈 크기 ÷ 팟), po(팟 오즈), ai(올인) } — 숨은 카드는 어디에도 안 들어감
  //   상대마다 '그 행동들을 했을 법한 홀카드'에 가중치를 매겨(그 거리 made 패 백분위 + 드로) 범위를 만들고, 내 승률은 그 범위 상대로 셈
  function logAct(S, a) {
    const p = S.turn, toCall = Math.max(0, S.curBet - S.bets[p]), cost = P.actionCost(S, p, a), to = S.bets[p] + cost;
    const k = a === A_FOLD ? 'fold' : to > S.curBet ? (S.curBet > 0 ? 'raise' : 'bet') : toCall > 0 ? 'call' : 'check';
    const base = Math.max(1, S.pot + toCall);
    const r3 = x => Math.round(x * 1000) / 1000;                                  // 친구 방에 실어 보낼 때 작게
    return { p, s: S.street, k, cost, to, prev: S.curBet, call: toCall, pot: S.pot, n: S.raises, frac: r3(Math.max(0, cost - toCall) / base), po: r3(toCall / base), ai: a !== A_FOLD && cost >= S.coins[p] };
  }
  function logFrom(start, acts) {
    let st = P.fastClone(start);
    const out = [];
    for (const a of acts || []) {
      if (st.phase !== 'bet') break;
      out.push(logAct(st, a));
      st = P.step(st, a).state;
    }
    return out;
  }

  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const above = (m, t, lo) => lo + (1 - lo) * sstep((m - (t - 0.22)) / 0.22);      // m 이 t 이상이면 1, 아래로 갈수록 lo 까지 부드럽게
  const catOf = sc => (sc >= 1000000 ? Math.floor(sc / 1000000) : 0);
  const lowerBound = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
  const upperBound = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
  const pctIn = (sorted, x) => (lowerBound(sorted, x) + upperBound(sorted, x)) / (2 * sorted.length);   // 같은 점수는 반반

  let PF_SORT = null;                                                              // 프리플랍 2장 강도 전체 분포 (백분위용)
  function preflopPct(c1, c2) {
    if (!PF_SORT) { const a = []; for (let i = 0; i < 52; i++) for (let j = i + 1; j < 52; j++) a.push(preflopStrength(i, j)); PF_SORT = Float64Array.from(a).sort(); }
    return pctIn(PF_SORT, preflopStrength(c1, c2));
  }

  // 플랍·턴의 드로 (내 홀카드가 거드는 것만): f 플러시 드로, sd 스트레이트 드로 (2 양차 · 1 건샷)
  function quickDraw(c1, c2, board) {
    const cs = [c1, c2].concat(board), sc = [0, 0, 0, 0];
    for (const c of cs) sc[(c / 13) | 0]++;
    const f = sc[(c1 / 13) | 0] === 4 || sc[(c2 / 13) | 0] === 4;
    const has = new Array(16).fill(false);
    for (const c of cs) { const r = (c % 13) + 2; has[r] = true; if (r === 14) has[1] = true; }
    const r1 = (c1 % 13) + 2, r2 = (c2 % 13) + 2;
    const mine = r => r === r1 || r === r2 || (r === 1 && (r1 === 14 || r2 === 14));
    const outs = new Set();
    for (let lo = 1; lo <= 10; lo++) {
      let miss = -1, cnt = 0;
      for (let r = lo; r < lo + 5; r++) { if (has[r]) cnt++; else miss = r; }
      if (cnt === 5) return { f, sd: 0 };                                          // 이미 스트레이트 (드로가 아님)
      if (cnt === 4) { let hole = false; for (let r = lo; r < lo + 5; r++) if (r !== miss && mine(r)) hole = true; if (hole) outs.add(miss === 1 ? 14 : miss); }
    }
    return { f, sd: outs.size >= 2 ? 2 : outs.size === 1 ? 1 : 0 };
  }

  // 행동 하나가 홀카드(made 백분위 m · 드로 dr)와 얼마나 어울리나 (0~1) — 센 패로 베팅 · 어중간한 패로 콜 · 드로로 세미블러프 · 가끔 블러프
  function entryWeight(e, m, dr) {
    const draw = dr ? (dr.f || dr.sd === 2 ? 2 : dr.sd === 1 ? 1 : 0) : 0;
    const dm = draw === 2 ? 0.68 : draw === 1 ? 0.4 : 0;                            // 드로를 made 백분위로 환산
    const pre = e.s === 0, sz = clamp((e.frac - 0.55) * 0.18, -0.06, 0.1);
    if (e.k === 'check') return pre ? 1 - 0.7 * sstep((m - 0.75) / 0.25) : 1 - 0.55 * sstep((m - 0.8) / 0.2);
    if (e.k === 'call') {
      if (pre && e.n === 0) return (0.55 + 0.45 * sstep(m / 0.4)) * (1 - 0.7 * sstep((m - 0.85) / 0.15));   // 림프 · 블라인드 맞추기
      const cf = clamp(0.88 - 1.5 * e.po, 0.2, 0.75);                               // 팟 오즈가 클수록 이어 갈 수 있는 범위가 좁아짐
      return above(Math.max(m, dm), 1 - cf, 0.1) * (1 - 0.35 * sstep((m - 0.93) / 0.07));
    }
    if (e.k === 'bet') {
      const t = 0.62 + sz + (e.ai ? 0.05 : 0);
      return Math.max(above(m, t, e.s === 3 ? 0.14 : 0.09), draw === 2 ? 0.5 : draw === 1 ? 0.22 : 0);   // 리버는 양극화 (센 패 아니면 블러프)
    }
    const t = pre ? (e.n === 0 ? 0.62 : e.n === 1 ? 0.82 : 0.92) + sz : 0.8 + (e.n >= 2 ? 0.06 : 0) + sz + (e.ai ? 0.04 : 0);
    const lo = pre ? (e.n === 0 ? 0.05 : e.n === 1 ? 0.02 : 0.01) : 0.05;            // 블러프 몫 (레이즈가 거듭될수록 줄어듦)
    return Math.max(above(m, t, lo), pre ? 0 : draw === 2 ? 0.4 : draw === 1 ? 0.15 : 0);
  }

  // 상대마다 가능한 홀카드와 가중치(누적), 지금 보드에서의 패 모양 비율 → [{ q, c1, c2, cum, total, hist, pre }]
  //   hist: strong 투페어 이상 · pair 원페어 · fd 플러시 드로 · sd 스트레이트 드로 · draw 둘 합 · air 허공 (합 1) / pre: 프리플랍 범위의 평균 백분위
  function buildRanges(v, p, log) {
    const myHole = (v.hands[p] || []).filter(c => c >= 0), board = (v.board || []).filter(c => c >= 0);
    const dead = new Uint8Array(52); myHole.forEach(c => { dead[c] = 1; });
    const free = []; for (let i = 0; i < 52; i++) if (!dead[i] && board.indexOf(i) < 0) free.push(i);
    const opp = []; for (let q = 0; q < v.n; q++) if (q !== p && !v.folded[q] && !(v.out && v.out[q])) opp.push(q);
    const byQ = {}; opp.forEach(q => { byQ[q] = log.filter(e => e.p === q && e.k !== 'fold'); });
    const streets = []; opp.forEach(q => byQ[q].forEach(e => { if (e.s > 0 && e.s <= 3 && streets.indexOf(e.s) < 0) streets.push(e.s); }));
    const bdAt = s => board.slice(0, s === 1 ? 3 : s === 2 ? 4 : 5);
    // 거리마다: 그 거리 보드에서 모든 홀카드 조합의 made 점수 분포 (내 카드만 뺌) → 백분위
    const tab = {};
    for (const s of streets) {
      const bd = bdAt(s), rest = [], all = [];
      for (let i = 0; i < 52; i++) if (!dead[i] && bd.indexOf(i) < 0) rest.push(i);
      for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) all.push(P.score7([rest[i], rest[j]].concat(bd)));
      tab[s] = Float64Array.from(all).sort();
    }
    const nC = free.length * (free.length - 1) / 2;
    const A1 = new Int16Array(nC), A2 = new Int16Array(nC), PRE = new Float32Array(nC), BK = new Int8Array(nC), M = {}, D = {};
    for (const s of streets) { M[s] = new Float32Array(nC); D[s] = new Int8Array(nC); }
    const boardCat = board.length >= 5 ? catOf(P.score7(board)) : (() => {
      const rc = {}; board.forEach(c => { rc[c % 13] = (rc[c % 13] || 0) + 1; });
      const cs = Object.values(rc).sort((a, b) => b - a);
      return cs[0] >= 4 ? 7 : cs[0] === 3 ? (cs[1] >= 2 ? 6 : 3) : cs[0] === 2 ? (cs[1] === 2 ? 2 : 1) : 0;
    })();
    let k = 0;
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++, k++) {
      const c1 = free[i], c2 = free[j];
      A1[k] = c1; A2[k] = c2; PRE[k] = preflopPct(c1, c2);
      for (const s of streets) {
        const bd = bdAt(s);
        M[s][k] = pctIn(tab[s], P.score7([c1, c2].concat(bd)));
        if (bd.length < 5) { const dr = quickDraw(c1, c2, bd); D[s][k] = (dr.sd & 3) | (dr.f ? 4 : 0); }
      }
      if (board.length >= 3) {                                                      // 지금 보드에서 무슨 패인가 (드로는 리버 전까지)
        const cat = catOf(P.score7([c1, c2].concat(board)));
        if (cat > boardCat) BK[k] = cat >= 2 ? 0 : 1;
        else if (board.length < 5) { const dr = quickDraw(c1, c2, board); BK[k] = dr.f ? 2 : dr.sd ? 3 : 4; }
        else BK[k] = 4;
      }
    }
    const cache = {}, ranges = [];
    for (const q of opp) {
      const ents = byQ[q], sig = ents.map(e => [e.s, e.k, Math.round(e.frac * 20), Math.round(e.po * 20), e.n, e.ai ? 1 : 0].join(':')).join('|');
      let r = cache[sig];
      if (!r) {
        const cum = new Float64Array(nC), hist = [0, 0, 0, 0, 0];
        let tot = 0, preSum = 0;
        for (let i = 0; i < nC; i++) {
          let x = 1;
          for (const e of ents) {
            if (e.s === 0) x *= entryWeight(e, PRE[i], null);
            else { const d = D[e.s][i]; x *= entryWeight(e, M[e.s][i], bdAt(e.s).length < 5 ? { f: !!(d & 4), sd: d & 3 } : null); }
          }
          x = Math.max(x, 0.02);                                                    // 여러 거리를 연달아 쳐도 블러프 가능성을 아주 없애진 않음
          tot += x; cum[i] = tot; hist[BK[i]] += x; preSum += x * PRE[i];
        }
        r = cache[sig] = { cum, total: tot, pre: preSum / tot, hist: { strong: hist[0] / tot, pair: hist[1] / tot, fd: hist[2] / tot, sd: hist[3] / tot, draw: (hist[2] + hist[3]) / tot, air: hist[4] / tot } };
      }
      ranges.push({ q, c1: A1, c2: A2, cum: r.cum, total: r.total, hist: r.hist, pre: r.pre });
    }
    return ranges;
  }

  // 읽은 범위 상대로 내 승률: 상대 홀카드를 범위에서 뽑고 (카드가 겹치면 다시), 남은 보드는 무작위
  function equityVsRanges(v, p, ranges, myHole, board, oppCount, samples, rng) {
    const rmap = {}; ranges.forEach(r => { rmap[r.q] = r; });
    const opp = []; for (let q = 0; q < v.n; q++) if (q !== p && !v.folded[q] && !(v.out && v.out[q])) opp.push(q);
    const used = new Uint8Array(52);
    const pick = r => { const x = rng() * r.total; let lo = 0, hi = r.cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (r.cum[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
    const fresh = () => { let c; do c = Math.floor(rng() * 52); while (used[c]); return c; };
    let win = 0, tie = 0, tieShare = 0;
    for (let s = 0; s < samples; s++) {
      used.fill(0); myHole.forEach(c => { used[c] = 1; }); board.forEach(c => { used[c] = 1; });
      const holes = [];
      for (const q of opp) {
        const r = rmap[q]; let a = -1, b = -1;
        if (r) for (let t = 0; t < 12; t++) { const i = pick(r), x = r.c1[i], y = r.c2[i]; if (!used[x] && !used[y]) { a = x; b = y; break; } }
        if (a < 0) { a = fresh(); used[a] = 1; b = fresh(); used[a] = 0; }
        used[a] = 1; used[b] = 1; holes.push([a, b]);
      }
      const sim = board.slice();
      while (sim.length < 5) { const c = fresh(); used[c] = 1; sim.push(c); }
      const my = P.score7(myHole.concat(sim));
      let best = -1, tied = 0;
      for (const h of holes) { const sc = P.score7(h.concat(sim)); if (sc > best) { best = sc; tied = 1; } else if (sc === best) tied++; }
      if (my > best) win++;
      else if (my === best) { tie++; tieShare += 1 / (tied + 1); }
    }
    return { equity: (win + tieShare) / samples, win: win / samples, tie: tie / samples, handEval: P.eval7(myHole.concat(board)), draws: P.analyzeDraws(myHole, board), oppCount };
  }

  // ── 글 만들기 (모두 plain 글, **굵게** 표시만 — 화면에서 처리) ──
  const STREET_SHORT = ['프리플랍', '플랍', '턴', '리버'];
  const fmt = n => Math.round(n).toLocaleString('ko-KR');
  const wp = x => (x <= 0 ? '1% 미만' : x + '%');                                      // 승률 글 (샘플로 센 0% 는 '아예 없다'가 아니라 '아주 낮다')
  const pc = x => Math.round(x * 100);
  const sizeWord = f => (f < 0.4 ? '작게' : f < 0.75 ? '팟의 절반쯤' : f < 1.15 ? '팟 크기' : '팟보다 크게');
  function actTok(e) {
    if (e.k === 'fold') return '폴드';
    if (e.k === 'check') return '체크';
    if (e.k === 'call') return e.ai ? `올인 콜 ${fmt(e.cost)}칩` : `콜 ${fmt(e.cost)}칩`;
    if (e.k === 'bet') return e.ai ? `올인 ${fmt(e.to)}칩` : `벳 ${fmt(e.to)}칩(${sizeWord(e.frac)})`;
    const x = e.prev > 0 ? e.to / e.prev : 0;
    return `${e.ai ? '올인' : '레이즈'} ${fmt(e.to)}칩${x >= 1.5 ? `(${x >= 10 ? Math.round(x) : Math.round(x * 10) / 10}배)` : ''}`;
  }
  const isAggr = e => !!e && (e.k === 'bet' || e.k === 'raise');
  // 상대 범위가 무슨 뜻인지 한 줄 — 그 사람의 마지막 행동(last)과 지금 보드에서의 패 모양 비율(h) / 프리플랍이면 평균 백분위(pre)
  function meaningOf(h, last, street, pre) {
    if (street === 0) {
      if (pre >= 0.88) return 'AA·KK·AK 같은 최상위 패 위주';
      if (pre >= 0.78) return '센 시작 패(높은 페어·A·K) 위주';
      if (pre >= 0.64) return '괜찮은 패(페어·A·K·붙은 수티드) 위주';
      if (pre >= 0.5) return '무난한 패';
      return '아무 패나 싸게 본 것';
    }
    const parts = [[h.strong, `투페어↑ ${pc(h.strong)}%`], [h.pair, `원페어 ${pc(h.pair)}%`], [h.draw, `드로 ${pc(h.draw)}%`], [h.air, `허공 ${pc(h.air)}%`]]
      .sort((a, b) => b[0] - a[0]).filter(x => x[0] >= 0.12).slice(0, 2).map(x => x[1]).join(' · ');
    const dw = h.fd >= h.sd ? '플러시' : '스트레이트';
    let note;
    if (isAggr(last)) {
      note = h.strong >= 0.5 ? '센 패 위주' : h.draw >= 0.2 && street < 3 ? `${dw} 드로 세미블러프가 섞임` : h.air >= 0.3 ? '블러프가 섞임' : h.pair >= 0.5 ? '원페어 위주, 아주 센 패는 드묾' : '센 패와 어중간한 패가 섞임';
      if (h.strong >= 0.35 && h.draw >= 0.2 && street < 3) note += ` · ${dw} 드로도 가능`;
    } else if (last && last.k === 'call') note = h.strong >= 0.4 ? '센 패를 숨기고 따라왔을 수도' : '붙잡는 패(원페어·드로)';
    else note = h.strong >= 0.3 ? '센 패를 숨겼을 수도' : '약하거나 숨기는 패';
    return `${note} (${parts})`;
  }
  function boardHint(board) {                                                       // 보드 모양에서 조심할 것 하나 (폰 화면이라 하나만)
    const bs = board.filter(c => c >= 0), sc = [0, 0, 0, 0], rc = {};
    bs.forEach(c => { sc[(c / 13) | 0]++; rc[c % 13] = (rc[c % 13] || 0) + 1; });
    const mx = Math.max.apply(null, sc);
    if (mx >= 3 && bs.length >= 3) return `${P.SUIT_NAMES[sc.indexOf(mx)]} ${mx}장 보드 — 플러시 조심`;
    if (Math.max.apply(null, Object.values(rc).concat([0])) >= 2) return '페어 보드 — 풀하우스 조심';
    return '';
  }

  // 👀 상대 흐름 (줄 배열, 3개 이하) — 내 마지막 행동 뒤에 상대가 한 것을 내 쪽 말로. 없으면 그렇다고 말함
  //   같은 행동·같은 뜻인 상대는 이름만 묶고, 두 줄까지 자세히, 나머지는 '그 밖에' 한 줄
  function readLines(v, p, log, ranges, names) {
    const nm = q => (names && names[q]) || `자리${q + 1}`;
    if (!log.length) return [v.street === 0 ? '아직 아무도 움직이지 않았어요 — 내가 먼저 정해요 (블라인드만 걸려 있어요)' : '이번 거리는 내가 먼저예요 — 상대 움직임이 아직 없어요'];
    let lastMine = -1; log.forEach((e, i) => { if (e.p === p) lastMine = i; });
    const fresh = log.slice(lastMine + 1);
    const rows = ranges.map(r => {
      const mine = fresh.filter(e => e.p === r.q && e.k !== 'fold'), all = log.filter(e => e.p === r.q && e.k !== 'fold'), last = mine[mine.length - 1];
      return { q: r.q, r, old: !mine.length && all.length > 0, shown: mine.length ? mine.slice(-3) : all.slice(-1), score: mine.length ? (isAggr(last) ? 4 : last.k === 'call' ? 3 : 2) : all.length ? 1 : 0 };
    }).sort((a, b) => b.score - a.score);
    const groups = [], idle = [];
    for (const row of rows) {
      if (!row.shown.length) { idle.push(nm(row.q)); continue; }
      const toks = row.shown.map(e => `${STREET_SHORT[e.s]} ${actTok(e)}`).join(' → ');
      const mean = meaningOf(row.r.hist, row.shown[row.shown.length - 1], v.street, row.r.pre);
      const key = (row.old ? '앞서|' : '') + toks + '|' + mean.replace(/\s\([^)]*\)$/, '');
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, names: [], old: row.old, toks, mean, short: actTok(row.shown[row.shown.length - 1]).replace(/[ (].*/, '') }; groups.push(g); }
      g.names.push(nm(row.q));
    }
    const lines = groups.slice(0, 2).map(g => `**${g.names.join('·')}** ${g.old ? '(앞서) ' : ''}${g.toks} — ${g.mean}`);
    const tail = groups.slice(2).map(g => `${g.names.join('·')} ${g.short}`);
    if (idle.length) { if (groups.length) tail.push(`${idle.join('·')} 아직 안 움직임`); else lines.push(`**${idle.join('·')}** 아직 안 움직였어요`); }
    const folds = fresh.filter(e => e.k === 'fold' && e.p !== p).length;
    if (folds) tail.push(`${folds}명 폴드`);
    if (tail.length) lines.push(`그 밖에 ${tail.join(' · ')}`);
    const bh = v.street > 0 && lines.length ? boardHint(v.board) : '';
    if (bh) lines[0] += ` · ${bh}`;
    return lines;
  }

  // 진짜 드로(플러시·스트레이트)만 확률로 보여 줌 — 오버카드 아웃츠는 보드에 짝이 나오는 카드까지 세어 부풀려져 있어서 이름만
  const shortName = n => String(n || '').replace(/\(같은 무늬\)/, '');
  function drawInfo(d) {
    if (!d || !d.tags || !d.tags.length) return null;
    const real = d.tags.filter(t => /드로/.test(t)), tx = t => t.replace(/\s*\((\d+) 아웃츠\)/, ' $1장');
    return real.length ? { text: real.map(tx).join(' + '), name: real.map(t => t.replace(/\s*\(.*\)/, '')).join(' + '), pct: d.hitPct } : { text: d.tags.map(tx).join(' + '), name: '', pct: null };
  }
  // 📊 내 흐름 한 줄: 내 패(+드로) · 승률(상대 범위 기준) · 팟 오즈 · 이번 게임 칩 손익
  function flowLine(c, eq, callCost, net, read) {
    const di = drawInfo(eq.draws), dr = di ? ` + ${di.text}${di.pct != null ? `(맞출 확률 ${di.pct}%)` : ''}` : '';
    const win = `승률 ${wp(c.equityPct)}${read ? `(읽은 범위 기준${c.flatEquityPct - c.equityPct >= 8 ? ` — 아무 패 상대면 ${c.flatEquityPct}%` : ''})` : ''}`;
    const bits = [`내 패 **${shortName(eq.handEval ? eq.handEval.name : '')}**${dr}`, win, callCost > 0 ? `팟 오즈 ${c.potOddsPct}%` : '공짜로 볼 수 있어요'];
    if (net != null && isFinite(net)) bits.push(`이번 게임 ${net > 0 ? '+' + fmt(net) : net < 0 ? fmt(net) : '본전'}${net ? '칩' : ''}`);
    return bits.join(' · ');
  }

  // 내 마지막 행동 뒤 상대들의 태도: aggr(벳·레이즈가 있음) · passive(체크·콜뿐) · none
  function stanceOf(log, p) {
    let lastMine = -1; log.forEach((e, i) => { if (e.p === p) lastMine = i; });
    const fresh = log.slice(lastMine + 1).filter(e => e.p !== p && e.k !== 'fold');
    return fresh.some(isAggr) ? 'aggr' : fresh.length ? 'passive' : 'none';
  }
  // 상대 범위를 한 마디로 (읽을 행동이 없으면 '')
  function briefOf(r, street, acted) {
    if (!r || !acted) return '';
    if (street === 0) return r.pre >= 0.88 ? '최상위 패 위주' : r.pre >= 0.78 ? '센 시작 패 위주' : r.pre >= 0.64 ? '괜찮은 패 위주' : r.pre >= 0.5 ? '무난한 패' : '아무 패나';
    const h = r.hist, top = [['센 패', h.strong], ['원페어', h.pair], ['드로', h.draw], ['약한 패', h.air]].sort((a, b) => b[1] - a[1])[0];
    return top[1] >= 0.45 ? `${top[0]} 위주` : h.strong >= 0.3 ? '센 패도 섞인' : '여러 패 혼합';
  }

  // 👉 수의 의미: 추천 수가 상대 읽기와 어떻게 이어지는지
  function whyLine(c, v, callCost, ranges, stance, acted) {
    const A = c.bestAction, eqn = c.equityPct, eqp = wp(eqn), po = c.potOddsPct, hn = shortName(c.handEval ? c.handEval.name : '내 패');
    const foe = ranges.slice().sort((a, b) => b.hist.strong - a.hist.strong)[0], brief = briefOf(foe, v.street, acted);
    const vs = brief ? `읽은 범위(${brief}) 상대로 ` : '';
    const strongFoe = !!foe && acted && v.street > 0 && foe.hist.strong >= 0.4;
    const di = drawInfo(c.draws), drawTxt = di && di.pct != null ? ` ${di.name}가 맞으면(약 ${di.pct}%) 역전해요.` : '';
    if (A === A_FOLD) return `폴드: ${vs}내 패(${hn})는 승률 ${eqp} < 팟 오즈 ${po}% — 콜하면 길게 보면 칩이 줄어요. 폴드가 손해가 적어요.${drawTxt}`;
    if (A === A_CALL && callCost > 0) return `콜 ${fmt(callCost)}칩: ${vs}승률 ${eqp} ≥ 팟 오즈 ${po}% — 따라가도 손해는 아니에요${strongFoe ? ' (상대가 센 패일 가능성이 커서 아슬아슬해요)' : ''}.${drawTxt}`;
    if (A === A_CALL) return `체크: 칩을 안 내고 다음 카드를 봐요 — 승률 ${eqp}${eqn < 50 ? (eqn <= 0 ? '이라' : '라') + ' 지금 키워 봤자 센 패만 따라와요' : '지만 굳이 팟을 키우지 않아요'}.${drawTxt}`;
    const nm = A === A_ALLIN ? '올인' : A === A_POT ? '팟 벳' : '하프 벳';
    if (eqn >= 55) return `${nm}: ${vs}승률 ${eqp}로 앞서요 — ${stance === 'passive' ? '상대가 소극적이라 팟을 키워 더 받아내요' : stance === 'aggr' ? '상대가 세게 나와도 내 패가 앞서니 팟을 키워요' : '팟을 키워 받아내요'}.`;
    const weakFoe = !!foe && acted && (v.street === 0 ? foe.pre < 0.66 : foe.hist.air + foe.hist.draw >= 0.35);
    const why = di && di.pct != null && c.draws.outsCount >= 8 ? `${di.name} 세미블러프로 칠 만해요` : stance === 'passive' ? '상대가 체크만 해서 약해 보여요 — 밀어붙이면 접을 수 있어요' : weakFoe ? '상대 범위에 약한 패·드로가 많아 되받아치면 접을 수 있어요' : callCost > 0 && eqn >= po ? `팟 오즈(${po}%)는 넘겨서 키워도 손해는 아니에요` : '상대가 접을 수 있어 밀어붙여요';
    return `${nm}: 승률 ${eqp}로 아슬아슬해도 ${why}.`;
  }

  // 🧑‍🏫 홀덤 GTO 일타 강사 분석기
  //   opts.log(공개 행동 기록)를 주면 상대 범위를 읽어 승률을 그 범위 기준으로 셈 + 글(lines.opp/flow/why) · opts.names 자리 이름 · opts.net 이번 게임 칩 손익
  //   안 주면 예전 그대로 (AI 가 두는 길 · 복기용)
  function coach(v, p, opts) {
    if (p === undefined) p = v.turn;
    const L = P.legal(v);
    const ranges = opts && opts.log ? buildRanges(v, p, opts.log) : null;
    const eq = estimateEquity(v, p, ranges ? Object.assign({}, opts, { ranges }) : opts);
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
        const foldOne = Math.min(0.52, 0.16 + betRatio * 0.18);
        const kOpp = Math.max(1, eq.oppCount || 1);
        const foldEquity = Math.pow(foldOne, 1 + 0.5 * (kOpp - 1));      // 상대가 많을수록 전원이 접기는 어려움
        const matchPot = pot + cost + extra * Math.max(1, Math.min(kOpp, 3) * 0.7);
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

    // 읽기 모드(선생님 창): 에퀴티 80% 미만이면 올인 대신 팟 벳을 추천 (AI 🐯 · 복기 판정과 같은 기준 — 올인 계산은 상대가 접어 줄 확률 어림이 커서)
    const swapAllin = !!ranges && bestAct === A_ALLIN && equityPct < REVIEW.allinEq && !!byAction[A_POT];
    if (swapAllin) { bestAct = A_POT; bestEv = byAction[A_POT].ev; }

    for (const a of L) {
      const item = byAction[a];
      const delta = swapAllin && a === A_ALLIN ? Math.min(item.ev - bestEv, -2) : item.ev - bestEv;
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

    const out = {
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
    if (ranges) {
      out.flatEquityPct = Math.round(estimateEquity(v, p, { samples: 100, flat: true }).equity * 100);   // 아무 패나 쥔 상대 가정 (읽기 효과를 보여 주려고)
      out.read = { opps: ranges.map(r => ({ q: r.q, hist: r.hist, pre: r.pre })) };
      const acted = opts.log.some(e => e.p !== p && e.k !== 'fold');           // 읽을 상대 행동이 하나라도 있나 (없으면 '읽은 범위' 말은 안 함)
      out.lines = { opp: readLines(v, p, opts.log, ranges, opts.names), flow: flowLine(out, eq, callCost, opts.net, acted), why: whyLine(out, v, callCost, ranges, stanceOf(opts.log, p), acted) };
    }
    return out;
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

  // 🤔 행동으로 패 짐작 (복기용): 공개 정보(보드·팟·베팅)만으로 그 자리에 올 수 있는 홀카드를 고르게 뽑아,
  //   선생님 기준이라면 같은 종류의 행동(폴드 / 콜·체크 / 베팅)을 하는 패가 얼마나·얼마나 센지 → 실제 패는 그 중 어디쯤인지
  function readAction(v, p, a, hole, opts) {
    opts = opts || {};
    const N = opts.n || 48;
    const kind = x => (x === A_FOLD ? 'fold' : x === A_CALL ? 'call' : 'bet');
    const k = kind(a);
    const used = new Set((v.board || []).filter(c => c >= 0));
    const deck = [];
    for (let i = 0; i < 52; i++) if (!used.has(i)) deck.push(i);
    const rng = P.makeRng((4242 + (v.round || 1) * 131 + (v.street || 0) * 97 + p * 31 + (v.pot || 0)) >>> 0);
    const withHole = hc => { const hv = Object.assign({}, v, { hands: v.hands.slice() }); hv.hands[p] = hc; return hv; };
    const eqs = [], same = [];
    for (let s = 0; s < N; s++) {
      const i = Math.floor(rng() * deck.length);
      let j = Math.floor(rng() * (deck.length - 1));
      if (j >= i) j++;
      const c = coach(withHole([deck[i], deck[j]]), p, { samples: 60 });
      eqs.push(c.equityPct);
      if (kind(c.bestAction) === k) same.push(c.equityPct);
    }
    const mine = coach(withHole(hole), p, { samples: 120 });
    const share = Math.round((100 * same.length) / N);
    const avgSame = same.length ? Math.round(same.reduce((x, y) => x + y, 0) / same.length) : null;
    const top = Math.max(1, Math.round((100 * eqs.filter(e => e > mine.equityPct).length) / N));   // 실제 패보다 센 패 비율 = 상위 몇 %
    const eq = mine.equityPct, outs = (mine.draws && mine.draws.outsCount) || 0;
    let tag, why;
    if (share >= 90 && k !== 'fold') { tag = '🤷 흔한 수'; why = '이 자리에선 거의 모든 패가 이렇게 해서 이것만으로는 패를 짐작하기 어려워요'; }
    else if (k === 'bet') {
      if (eq >= 55 || (avgSame != null && eq >= avgSame)) { tag = '💪 밸류 베팅'; why = '센 패로 판을 키운 수예요'; }
      else if (outs >= 8) { tag = '🎣 세미 블러프'; why = `지금은 약해도 아웃 ${outs}장(드로)을 믿고 먼저 친 수예요`; }
      else { tag = '🎭 블러프'; why = '약한 패로 상대를 접게 하려는 수예요'; }
    } else if (k === 'call') {
      if (eq >= 62) { tag = '🪤 숨기기'; why = '센 패를 감추고 따라가 상대 베팅을 더 받으려는 수예요'; }
      else if (!mine.potOddsPct) { tag = '✋ 체크'; why = '칩을 더 걸지 않고 다음 카드를 본 수예요'; }
      else if (outs >= 8 && eq < mine.potOddsPct) { tag = '🎣 드로 콜'; why = `아웃 ${outs}장을 보고 따라간 수예요`; }
      else if (eq >= mine.potOddsPct) { tag = '✅ 오즈 맞는 콜'; why = `승률 ${eq}%가 팟 오즈 ${mine.potOddsPct}%보다 높아 따라갈 만해요`; }
      else { tag = '🙏 무리한 콜'; why = `승률 ${eq}%가 팟 오즈 ${mine.potOddsPct}%보다 낮은데 따라갔어요`; }
    } else if (eq >= mine.potOddsPct + 10) { tag = '😨 지나친 조심'; why = `승률 ${eq}%로 따라갈 만했는데 접었어요`; }
    else { tag = '🛑 맞는 폴드'; why = '승산이 낮아 칩을 아꼈어요'; }
    return { kind: k, share, avgSame, top, equityPct: eq, handName: mine.handEval ? mine.handEval.name : '', tag, why };
  }

  // ── 📒 아쉬운 장면 판정 (복기·핸드 끝 자동 분석·다시 해 보기 공용) ──
  //   v = 그 차례 사람 눈(P.view)만, a = 실제로 한 행동 → null 또는 { tier, miss, loss(칩), sev, my, best, why, lossText }
  //   miss: 선생님 신호등 🔴(추천보다 기댓값 40칩 넘게 손해) 또는 🟡 인데 손해가 REVIEW.ok 칩·팟의 REVIEW.potShare 넘음
  //     단 '덜 세게' 간 수(실제 행동도 기댓값 +, 추천이 더 큰 베팅·올인)는 손해가 REVIEW.passive 칩·팟의 REVIEW.passShare 넘을 때만 — 선생님 베팅 계산은 상대가 접어 줄 확률을 어림해서
  //     선생님이 올인을 꼽아도 에퀴티 80% 미만이면 팟 벳을 기준으로 잼 (AI 🐯 도 그렇게 둠 — 올인 계산은 접어 줄 확률 어림이 커서)
  //   o.c = 미리 계산한 coach · o.read = false 면 행동 짐작(readAction)을 안 붙임
  const REVIEW = { ok: 30, potShare: 0.3, passive: 60, passShare: 0.5, allinEq: 80 };
  const sevOf = loss => Math.max(0, Math.min(100, Math.round(loss * 0.6)));   // 40칩 ≈ 24 · 165칩 넘으면 100
  const firstLine = t => { t = String(t || '').trim(); const m = t.match(/^.+?[.!?](?=\s|$)/); return (m ? m[0] : t).slice(0, 90); };
  function review(v, a, o) {
    o = o || {};
    const p = v.turn;
    if (v.phase !== 'bet') return null;
    const c = o.c || coach(v, p, o.log ? { log: o.log } : undefined), info = c.byAction[a];
    const ref = c.bestAction === A_ALLIN && c.equityPct < REVIEW.allinEq && c.byAction[A_POT] ? A_POT : c.bestAction, bi = c.byAction[ref];
    if (!info || !bi) return null;
    const loss = a === c.bestAction ? 0 : Math.max(0, bi.ev - info.ev);
    const tier = ref === c.bestAction ? info.tier : loss <= 1 ? 'best' : loss <= 15 ? 'good' : loss <= 40 ? 'ok' : 'bad';
    const passive = info.ev >= 0 && bi.cost > info.cost;
    let miss = tier === 'bad' || (tier === 'ok' && loss >= REVIEW.ok && loss >= v.pot * REVIEW.potShare);
    if (miss && passive) miss = loss >= Math.max(REVIEW.passive, v.pot * REVIEW.passShare);
    const lab = x => { const k = P.actionCost(v, p, x); return x === A_FOLD ? '폴드' : x === A_CALL ? (k ? `콜 ${k}칩` : '체크') : `${x === A_HALF ? '하프 벳' : x === A_POT ? '팟 벳' : '올인'} ${k}칩`; };
    let why = `${firstLine(c.detail)} (에퀴티 ${c.equityPct}% · 팟오즈 ${c.potOddsPct}%)`;
    if (miss && o.read !== false) {
      let rd = null; try { rd = readAction(v, p, a, v.hands[p]); } catch (e) { rd = null; }
      if (rd && rd.tag && !/흔한 수/.test(rd.tag)) why = `${rd.tag} — ${rd.why} · ${why}`;
    }
    return { kind: 'bet', tier, miss, loss, sev: sevOf(loss), my: lab(a), best: lab(ref), why, lossText: `기댓값 −${Math.round(loss)}칩` };
  }

  const API = { preflopStrength, estimateEquity, coach, choose, readAction, review, logAct, logFrom, buildRanges, REVIEW, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PokerAI = API;
})(this);

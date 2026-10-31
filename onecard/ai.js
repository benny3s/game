/* 원카드 AI — 🐣 easy · 🐱 normal · 🐯 hard + 🧑‍🏫 선생님(coach) + 원카드 외치기 경주
   · 모두 view(그 자리에 보이는 것)만 받음 → 남의 손패를 못 봄 (Node · 브라우저 · Web Worker 공용)
   · 🐯 은 결정화 몬테카를로: 숨은 카드를 보이는 정보에 맞게 여러 번 섞고(sampleWorld), 후보 수마다 같은 세계에서
     🐱 정책으로 끝까지 둬 본 평균 장수 변화로 고름 (같은 세계를 후보끼리 나눠 써서 운 차이를 줄임)
   · 난수는 opts.seed / opts.rng 로만 (Math.random 안 씀) → 같은 입력이면 같은 수 */
(function (root) {
  'use strict';
  const G = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.OneCard;
  const TIERS = ['easy', 'normal', 'hard'];

  // 원카드 외치기·잡기: 할 확률과 걸리는 시간(ms) — 사람이 따라잡을 수 있게 잡기는 조금 느리게
  const CALL = {
    easy:   { callP: 0.72, call: [800, 2600], catchP: 0.45, catch: [1500, 3600] },
    normal: { callP: 0.9,  call: [500, 1600], catchP: 0.7,  catch: [1000, 2600] },
    hard:   { callP: 0.98, call: [250, 900],  catchP: 0.88, catch: [700, 1800] },
  };
  const prof = t => CALL[t] || CALL.normal;
  const between = (r, rand) => r[0] + (r[1] - r[0]) * rand();

  const rngOf = o => (o && o.rng) || G.makeRng(((o && o.seed) || 12345) | 0);
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  function suitCounts(h) { const c = [0, 0, 0, 0]; for (const x of h) { const su = G.suitOf(x); if (su >= 0) c[su]++; } return c; }
  const bestSuit = h => { const c = suitCounts(h); let b = 0; for (let i = 1; i < 4; i++) if (c[i] > c[b]) b = i; return b; };
  const minOther = (s, p) => { let m = 99; for (let q = 0; q < s.n; q++) if (q !== p && s.out[q] === 0) m = Math.min(m, s.hands[q].length); return m; };

  // 이 카드를 낸 뒤 (K·J 로) 한 번 더 낼 때 이어 낼 카드가 있나
  function followUps(s, c, after) {
    const t = { suit: G.isJoker(c) ? -1 : G.suitOf(c), rank: G.isJoker(c) ? -1 : G.rankOf(c), rules: s.rules, atk: 0 };
    let k = 0; for (const x of after) if (G.matches(t, x)) k++;
    return k;
  }

  // ── 🐱 점수 매기기: [{ a, sc, why, tag }] (높을수록 좋음). 내 손패 + 모두 아는 정보만 씀 ─────────────
  function scorePlay(s, p) {
    const R = s.rules, h = s.hands[p], out = [];
    const L = G.legal(s);
    const nxt = G.nextActive(s, p, 1), prv = (() => { const t = { n: s.n, out: s.out, dir: -s.dir }; return G.nextActive(t, p, 1); })();
    const nxtCnt = nxt >= 0 ? s.hands[nxt].length : 99, prvCnt = prv >= 0 ? s.hands[prv].length : 99;
    const two = G.activeCount(s) === 2, minO = minOther(s, p);
    const nThreat = nxtCnt <= 2, threat = minO <= 2;
    const nAtk = h.filter(x => G.atkOf(x, R) > 0).length;
    if (s.atk > 0) {
      for (const a of L) {
        if (a === G.A_DRAW) { out.push({ a, sc: -s.atk * 3, why: `받아칠 카드가 없어서 ${s.atk}장을 받아요`, tag: '받기' }); continue; }
        const c = a - G.A_PLAY, st = G.atkOf(c, R);
        if (st > 0 && G.canCounter(s, c)) {
          const sc = 60 + (nThreat ? st * 2 : -st) + (nAtk > 1 ? 2 : 0);
          out.push({ a, sc, why: nThreat ? `다음 사람이 ${nxtCnt}장뿐이라 센 카드로 +${s.atk + st} 을 넘겨요` : `받아쳐서 +${s.atk + st} 을 다음 사람에게 넘겨요 (약한 카드부터 써서 센 카드는 아껴 둬요)`, tag: '받아치기' });
        } else {
          out.push({ a, sc: nThreat ? 52 : 64, why: `같은 무늬 3 으로 2 공격을 막아요 — 아무도 안 받아요`, tag: '막기' });
        }
      }
      return out;
    }
    const cnt = suitCounts(h);
    for (const a of L) {
      if (a === G.A_DRAW) { out.push({ a, sc: -30, why: '낼 수 있는 카드가 없어서 한 장 먹어요', tag: '먹기' }); continue; }
      const c = a - G.A_PLAY, r = G.rankOf(c), su = G.suitOf(c), st = G.atkOf(c, R);
      const after = h.slice(); after.splice(after.indexOf(c), 1);
      let sc = 10, why = '', tag = '';
      if (!after.length) { out.push({ a, sc: 1000, why: '마지막 카드! 이걸 내면 이겨요', tag: '끝내기' }); continue; }
      const sameSuit = su >= 0 ? cnt[su] - 1 : 0;
      const sameRank = r >= 0 ? after.filter(x => G.rankOf(x) === r).length : 0;
      sc += 1.5 * sameSuit + 0.8 * sameRank;
      if (st > 0) {
        if (nThreat) { sc += 10 + st; why = `다음 사람이 ${nxtCnt}장 남았어요 — +${st} 공격으로 막아요`; tag = '공격'; }
        else if (after.length <= 2) { sc += 4; why = `카드가 얼마 안 남아서 공격 카드도 털어요 (+${st})`; tag = '공격'; }
        else if (nAtk >= 2) { sc += 1; why = `공격 카드가 여러 장이라 하나는 써도 돼요 (+${st})`; tag = '공격'; }
        else { sc -= G.isJoker(c) ? 9 : 5; why = `공격 카드는 받아칠 때 쓰려고 아껴 두는 게 좋아요`; tag = '아끼기'; }
      } else if (r === G.R_3 && R.block3) { sc -= 1.5; why = '3 은 2 공격을 막을 수 있어서 조금 아껴요'; tag = '무난'; }
      else if (r === G.R_7 && R.seven) {
        const bs = bestSuit(after), k = suitCounts(after)[bs];
        sc += after.length <= 2 ? 2 : -4; sc += k * 0.6;
        why = `7 로 내가 많이 가진 ${G.SUIT_SYM[bs]}(${k}장)로 바꿔요${after.length > 2 ? ' — 다른 카드가 있으면 아껴도 좋아요' : ''}`; tag = '무늬 바꾸기';
      } else if ((r === G.R_K && R.kAgain) || (two && ((r === G.R_J && R.jSkip) || (r === G.R_Q && R.qRev)))) {
        const f = followUps(s, c, after);
        if (f) { sc += 8; why = `${G.RANK_NAME[r]} 로 한 번 더 — 이어 낼 카드가 ${f}장 있어서 두 장을 털어요`; tag = '한 번 더'; }
        else { sc -= 8; why = `${G.RANK_NAME[r]} 를 내면 한 번 더 내야 하는데 이어 낼 카드가 없어요`; tag = '아쉬움'; }
      } else if (r === G.R_J && R.jSkip) {
        if (nThreat) { sc += 8; why = `다음 사람이 ${nxtCnt}장뿐이라 J 로 건너뛰어요`; tag = '건너뛰기'; } else { sc += 0.5; why = 'J 로 다음 사람을 건너뛰어요'; tag = '건너뛰기'; }
      } else if (r === G.R_Q && R.qRev) {
        if (nThreat && prvCnt > 2) { sc += 7; why = `다음 사람이 ${nxtCnt}장뿐이라 Q 로 방향을 바꿔 피해요`; tag = '방향'; }
        else if (prvCnt <= 2 && !nThreat) { sc -= 6; why = `방향을 바꾸면 ${prvCnt}장 남은 사람 차례가 돼요`; tag = '위험'; }
        else { why = 'Q 로 방향을 바꿔요'; tag = '방향'; }
      }
      if (!why) { why = sameSuit ? `같은 무늬 ${G.SUIT_SYM[su]}가 ${sameSuit}장 더 있어서 다음에도 이어 내기 좋아요` : `${G.SUIT_SYM[su] || ''} 한 장짜리를 먼저 털어요`; tag = sameSuit ? '이어 가기' : '털기'; }
      if (threat && !nThreat && st === 0) sc += 0.5;         // 누가 곧 끝날 것 같으면 한 장이라도 빨리 털기
      out.push({ a, sc, why, tag });
    }
    return out;
  }
  function chooseNormal(s, p, rand) {
    if (s.phase === 'suit') return G.A_SUIT + bestSuit(s.hands[p]);
    if (s.phase === 'call') return G.A_CALL;
    const sc = scorePlay(s, p);
    let best = sc[0];
    for (const x of sc) if (x.sc > best.sc + 1e-9 || (Math.abs(x.sc - best.sc) < 1e-9 && rand() < 0.5)) best = x;
    return best.a;
  }
  // ── 🐣: 아무거나 (조금만 고름) ───────────────────────────
  function chooseEasy(s, p, rand) {
    const L = G.legal(s);
    if (s.phase === 'suit') return rand() < 0.6 ? G.A_SUIT + bestSuit(s.hands[p]) : L[Math.floor(rand() * L.length)];
    if (s.phase === 'call') return G.A_CALL;
    const plays = L.filter(a => a !== G.A_DRAW);
    if (!plays.length) return G.A_DRAW;
    if (s.atk > 0) return rand() < 0.65 ? plays[Math.floor(rand() * plays.length)] : G.A_DRAW;
    if (rand() < 0.1) return G.A_DRAW;
    const plain = plays.filter(a => G.rankOf(a - G.A_PLAY) !== G.R_7 && !G.isJoker(a - G.A_PLAY));
    const pool = plain.length && rand() < 0.7 ? plain : plays;
    return pool[Math.floor(rand() * pool.length)];
  }

  // ── 🐯: 결정화 몬테카를로 ─────────────────────────────────
  // 끝까지 못 가면 어림: 손패가 가장 적은 사람이 이긴다고 보고 장수로 셈
  function estimate(s, me) {
    if (s.result) return s.result.pts[me];
    let w = -1;
    for (let q = 0; q < s.n; q++) if (s.out[q] === 0 && (w < 0 || s.hands[q].length < s.hands[w].length)) w = q;
    if (s.out[me] === 2) return -(s.rules.bust + s.rules.bustPay);
    if (w === me) { let t = 0; for (let q = 0; q < s.n; q++) if (q !== me && s.out[q] === 0) t += s.hands[q].length; return t * 0.6; }
    return -s.hands[me].length;
  }
  function rollout(s, me, rand, maxSteps) {
    for (let k = 0; k < maxSteps && s.phase !== 'end'; k++) {
      let a;
      if (s.phase === 'call') a = rand() < 0.88 ? G.A_CALL : G.A_MISS;
      else a = chooseNormal(s, s.turn, rand);
      G.apply(s, a, null);
    }
    return estimate(s, me);
  }
  function chooseHard(v, o) {
    const me = v.me != null ? v.me : v.turn;
    const L = G.legal(v);
    const ret = a => (o.detail ? { a, base: a, gain: 0, n: 0 } : a);
    if (L.length === 1) return ret(L[0]);
    if (v.phase === 'call') return ret(G.A_CALL);
    const rand = rngOf(o);
    let cands;
    if (v.phase === 'suit') { const b = G.A_SUIT + bestSuit(v.hands[me]); cands = [b].concat(L.filter(a => a !== b)); }
    else {
      const sc = scorePlay(v, me).sort((x, y) => y.sc - x.sc);
      if (sc[0].sc >= 1000) return ret(sc[0].a);          // 이기는 수
      cands = sc.slice(0, o.width || 4).map(x => x.a);    // 맨 앞 = 🐱 이 고를 수
      if (cands.length === 1) return ret(cands[0]);
    }
    // 후보마다 '🐱 의 수보다 얼마나 나은가' 를 같은 세계에서 짝지어 잼 (운을 지움)
    const K = cands.length, sum = new Float64Array(K), sq = new Float64Array(K), val = new Float64Array(K);
    const maxN = o.samples || 600, until = o.ms ? now() + o.ms : 0, depth = o.depth || 160;
    let n = 0;
    for (; n < maxN; n++) {
      if (until && n >= 8 && now() > until) break;
      const w = G.sampleWorld(v, rand), seed = Math.floor(rand() * 4294967296) | 0;
      for (let i = 0; i < K; i++) {
        const s2 = G.fastClone(w);
        G.apply(s2, cands[i], null);
        val[i] = rollout(s2, me, G.makeRng(seed), depth);
      }
      for (let i = 1; i < K; i++) { const d = val[i] - val[0]; sum[i] += d; sq[i] += d * d; }
    }
    // 🐱 의 수를 버리는 건 분명히 나을 때만 (평균 차이 > z × 표준오차)
    const z = o.z != null ? o.z : 1.2;
    let bi = 0, bm = 0;
    for (let i = 1; i < K; i++) {
      const m = sum[i] / n, se = Math.sqrt(Math.max(0, sq[i] / n - m * m) / Math.max(1, n - 1));
      if (m > z * se && m > bm) { bm = m; bi = i; }
    }
    if (o.detail) return { a: cands[bi], base: cands[0], gain: bm, n };
    return cands[bi];
  }

  // 행동 고르기: v = view (또는 시험에서 온전한 상태 — 그래도 자기 손패·공개 정보만 씀)
  function choose(v, tier, opts) {
    const o = opts || {}, rand = rngOf(o);
    const p = v.me != null ? v.me : v.turn;
    if (v.phase === 'call') return G.A_CALL;
    if (tier === 'easy') return chooseEasy(v, p, rand);
    if (tier === 'hard') return chooseHard(v, Object.assign({}, o, { rng: rand }));
    return chooseNormal(v, p, rand);
  }

  // 원카드 경주 (AI 끼리 · 시험용): seatTiers[q] = 'easy'|'normal'|'hard'|null(사람 — 안 누름) → { a, at(ms) }
  function race(s, seatTiers, rand, windowMs) {
    const p = s.call.p, W = windowMs || s.rules.callSec * 1000;
    let best = { a: G.A_MISS, at: W, by: -1 };
    const tp = seatTiers[p];
    if (tp) { const pr = prof(tp); if (rand() < pr.callP) { const t = between(pr.call, rand); if (t < best.at) best = { a: G.A_CALL, at: t, by: p }; } }
    for (let q = 0; q < s.n; q++) {
      if (q === p || !seatTiers[q] || s.out[q] === 2) continue;
      const pr = prof(seatTiers[q]);
      if (rand() < pr.catchP) { const t = between(pr.catch, rand); if (t < best.at) best = { a: G.A_CATCH + q, at: t, by: q }; }
    }
    return best;
  }
  // 화면용: 이 자리 AI 가 외칠지(또는 잡을지)와 언제 — null 이면 안 누름
  function callPlan(tier, role, rand) {
    const pr = prof(tier);
    if (role === 'call') return rand() < pr.callP ? between(pr.call, rand) : null;
    return rand() < pr.catchP ? between(pr.catch, rand) : null;
  }

  // ── 🧑‍🏫 선생님: 지금 차례에 낼 카드 하나 + 한 줄 이유 ──────────
  // { a, card(-1 = 먹기), name, why, tag, suit(7이면 바꿀 무늬), byCard{카드: {tag, why, rank}} }
  function coach(v, o) {
    o = o || {};
    const p = v.me != null ? v.me : v.turn;
    if (v.phase === 'suit') {
      const su = bestSuit(v.hands[p]), k = suitCounts(v.hands[p])[su];
      return { a: G.A_SUIT + su, card: -1, suit: su, name: G.SUIT_SYM[su] + ' ' + G.SUIT_NAME[su], why: `내 손에 ${G.SUIT_SYM[su]}가 ${k}장으로 가장 많아요`, tag: '무늬', byCard: {} };
    }
    if (v.phase !== 'play') return null;
    const sc = scorePlay(v, p).sort((x, y) => y.sc - x.sc);
    let best = sc[0], mc = null;
    if ((o.mc || o.samples) && sc.length > 1 && best.sc < 1000) {   // 조금 더 깊게: 숨은 카드를 섞어 끝까지 둬 보고 다시 고름 (o.mc = 일꾼이 미리 계산한 것)
      const d = o.mc || chooseHard(v, { samples: o.samples, seed: o.seed || 777, depth: o.depth || 120, detail: true, z: o.z != null ? o.z : 2 });
      const hit = d && d.n >= (o.minN || 24) ? sc.find(x => x.a === d.a) : null;
      if (hit && hit !== best) { mc = { from: best, gain: d.gain, n: d.n }; best = hit; }
    }
    const byCard = {};
    sc.forEach((x, i) => { if (x.a !== G.A_DRAW) byCard[x.a - G.A_PLAY] = { tag: x.tag, why: x.why, rank: i, best: x === best }; });
    const card = best.a === G.A_DRAW ? -1 : best.a - G.A_PLAY;
    let why = best.why;
    if (mc) {                                               // 어림 규칙과 다른 수를 고른 까닭 (끝까지 둬 본 결과)
      const fromName = mc.from.a === G.A_DRAW ? '먹기' : G.cardName(mc.from.a - G.A_PLAY);
      const st = card >= 0 ? G.atkOf(card, v.rules) : 0;
      why = `숨은 카드를 ${mc.n}번 섞어 끝까지 둬 보니 [${fromName}]보다 평균 ${mc.gain.toFixed(1)}장 이득이에요${st ? ' — 지금은 아끼기보다 공격이 나아요' : ''}`;
      best = Object.assign({}, best, { why, tag: '끝까지 둬 봄' });
      byCard[card] = Object.assign({}, byCard[card], { why, tag: best.tag, best: true });
    }
    if (card >= 0 && G.rankOf(card) === G.R_7 && v.rules.seven) { const after = v.hands[p].filter(x => x !== card); byCard[card].suit = bestSuit(after); }
    return { a: best.a, card, name: card >= 0 ? G.cardName(card) : (v.atk > 0 ? `${v.atk}장 받기` : '한 장 먹기'), why, tag: best.tag, byCard };
  }

  // ── 📒 아쉬운 장면 판정 (복기·판 끝 자동 분석·다시 해 보기 공용) ──
  //   v = 그 차례 사람 눈(view)만, a = 실제로 한 행동 → null(판정 안 하는 장면) 또는
  //   { kind, tier(best·good·ok·bad), miss, loss(선생님 점수 차), rank, n, my, best, why, lossText }
  //   miss: 낼 카드가 있는데 먹음 · 고를 카드가 3장 이상인데 선생님 순위 아래쪽 절반 + 점수 차 REVIEW.gap 이상 · 7 무늬를 REVIEW.suit 장 이상 적은 쪽으로
  //   sev(얼마나 아쉬운지 0~100): 순위 = 15 + 점수 차×1.5 (최대 60) · 그냥 먹기 35 · 공격 받기 25 + 받은 장수×12 · 무늬 10 + 장수 차×10
  const REVIEW = { gap: 8, suit: 2 };
  const cap = (x, hi) => Math.max(0, Math.min(hi, Math.round(x)));
  function review(v, a, o) {
    o = o || {};
    const p = v.me != null ? v.me : v.turn;
    if (v.phase === 'suit') {
      if (a < G.A_SUIT || a >= G.A_SUIT + 4) return null;
      const cnt = suitCounts(v.hands[p]), bs = bestSuit(v.hands[p]), su = a - G.A_SUIT, d = cnt[bs] - cnt[su];
      const tier = d <= 0 ? 'best' : d < REVIEW.suit ? 'good' : 'bad';
      return { kind: 'suit', tier, miss: tier === 'bad', loss: d * 4, sev: cap(10 + d * 10, 60), rank: 0, n: 4, my: `${G.SUIT_SYM[su]} ${G.SUIT_NAME[su]}`, best: `${G.SUIT_SYM[bs]} ${G.SUIT_NAME[bs]}`,
        why: `7 은 내 손에 가장 많은 ${G.SUIT_SYM[bs]}(${cnt[bs]}장)로 바꾸면 이어 내기 좋아요 (고른 ${G.SUIT_SYM[su]} ${cnt[su]}장)`, lossText: `무늬 ${d}장 적음` };
    }
    if (v.phase !== 'play') return null;
    const sc = scorePlay(v, p).sort((x, y) => y.sc - x.sc), best = sc[0];
    const i = sc.findIndex(x => x.a === a);
    if (i < 0 || !best) return null;
    const me = sc[i], gap = best.sc - me.sc, plays = sc.filter(x => x.a !== G.A_DRAW).length;
    const nm = x => (x.a === G.A_DRAW ? (v.atk > 0 ? `${v.atk}장 받기` : '한 장 먹기') : `[${G.cardName(x.a - G.A_PLAY)}]`);
    let tier, miss = false, lossText = '', sev = cap(15 + gap * 1.5, 60);
    if (gap < 0.5) tier = 'best';
    else if (a === G.A_DRAW && best.a !== G.A_DRAW) { tier = 'bad'; miss = true; lossText = v.atk > 0 ? `${v.atk}장 받음` : '1장 더 먹음'; sev = v.atk > 0 ? cap(25 + v.atk * 12, 100) : 35; }
    else {
      const low = i >= 2 && i * 2 >= plays;                            // 복기 선생님의 '순위가 낮아 실수였을 수 있어요' 와 같은 기준
      tier = gap < 2.5 ? 'good' : low && gap >= REVIEW.gap ? 'bad' : 'ok';
      miss = tier === 'bad';
      lossText = `순위 ${i + 1}/${sc.length}`;
    }
    return { kind: 'play', tier, miss, loss: gap, sev, rank: i, n: sc.length, my: nm(me), best: nm(best), why: best.why, aim: me.why, lossText };
  }

  const API = { TIERS, CALL, choose, chooseNormal, chooseEasy, chooseHard, scorePlay, coach, race, callPlan, bestSuit, suitCounts, review, REVIEW };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.OneCardAI = API;
})(this);

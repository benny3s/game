/* 고스톱 AI — 코어 API 와 view(s, p)(그 사람에게 보이는 것)만 씀. 남의 손패·더미 순서는 못 봄
   · 🐣 easy  : 바로 먹을 수 있는 것 위주 + 가끔 아무거나
   · 🐱 normal: 패 값어치(광·고도리·단·쌍피)·상대가 노리는 패 막기·뻑 위험·뒤집을 패 확률까지 따져 한 수 앞
   · 🐯 hard  : 🐱 의 판단 위에, 숨은 패를 그럴듯하게 여러 번 섞어(결정화 몬테카를로) 끝까지 빠르게 둬 본 결과를 더함
                고/스톱은 '지금 스톱한 점수' 와 '고 하고 끝까지 둬 본 평균' 을 직접 비교
   choose(view, tier, { rng, samples, ms }) → 행동 번호 · hint(view) → { action, why, card } */
(function (root) {
  'use strict';
  const G = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.Gostop;
  const { KIND, PIV, RIB, BIRD, KOOK, RAIN, GW, YE, TI, PI, R_HONG, R_CHEONG, R_CHO } = G;
  const A = { PLAY: G.A_PLAY, SHAKE: G.A_SHAKE, BOMB: G.A_BOMB, PASS: G.A_PASS, PICK: G.A_PICK, GO: G.A_GO, STOP: G.A_STOP, KY: G.A_KOOK_Y, KP: G.A_KOOK_P };
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const monthOf = G.monthOf;
  const SETS = { godori: [4, 12, 29], hong: [1, 5, 9], cheong: [21, 33, 37], cho: [13, 17, 25] };
  const GWANGS = [0, 8, 28, 40, 44];
  const isPlay = a => a < A.SHAKE, isShake = a => a >= A.SHAKE && a < A.BOMB, isBomb = a => a >= A.BOMB && a < A.PASS;
  const cardOf = a => (isPlay(a) ? a - A.PLAY : isShake(a) ? a - A.SHAKE : -1);

  // ── 판 읽기: 사람마다 먹은 패 요약 + 이미 막힌 약 ─────────────────
  function quick(cap, kook) {
    const t = { g: 0, rain: 0, y: 0, birds: 0, t: 0, hong: 0, cheong: 0, cho: 0, pi: 0 };
    for (const c of cap) add(t, c, kook);
    return t;
  }
  function add(t, c, kook) {
    if (c === KOOK) { if (kook === 'P') t.pi += 2; else t.y++; return; }
    const k = KIND[c];
    if (k === GW) { t.g++; if (c === RAIN) t.rain = 1; }
    else if (k === YE) { t.y++; if (BIRD[c]) t.birds++; }
    else if (k === TI) { t.t++; if (RIB[c] === R_HONG) t.hong++; else if (RIB[c] === R_CHEONG) t.cheong++; else if (RIB[c] === R_CHO) t.cho++; }
    else t.pi += PIV[c];
  }
  function analyze(v) {
    const n = v.n, kook = v.kook || 'Y';
    const owner = new Int8Array(51).fill(-1);
    v.cap.forEach((pile, q) => { for (const c of pile) owner[c] = q; });
    const P = [];
    for (let q = 0; q < n; q++) {
      const t = quick(v.cap[q], kook);
      const dead = {};
      for (const k in SETS) dead[k] = SETS[k].some(c => owner[c] >= 0 && owner[c] !== q);
      let othersG = 0; for (const c of GWANGS) if (owner[c] >= 0 && owner[c] !== q) othersG++;
      dead.gwang = 5 - othersG < 3;
      P.push({ t, dead });
    }
    return { n, kook, P, thr: G.thresholdOf(n) };
  }
  // 먹은 패의 '값어치' (점수 + 약에 다가간 정도, 점수 단위 대략)
  const PROG3 = [0, 0.55, 1.45];
  function posValue(t, dead, n) {
    let v = 0;
    v += t.g >= 3 ? (t.g === 3 ? (t.rain ? 2 : 3) : t.g === 4 ? 4 : 15) : dead.gwang ? 0 : [0, 0.6, 1.4][t.g];
    v += (t.y >= 5 ? t.y - 4 : 0) + 0.2 * Math.min(t.y, 5) + (t.y >= 7 ? 2 : 0);
    v += t.birds === 3 ? 5 : dead.godori ? 0 : [0, 0.7, 1.8][t.birds];
    v += (t.t >= 5 ? t.t - 4 : 0) + 0.2 * Math.min(t.t, 5);
    v += t.hong === 3 ? 3 : dead.hong ? 0 : PROG3[t.hong];
    v += t.cheong === 3 ? 3 : dead.cheong ? 0 : PROG3[t.cheong];
    v += t.cho === 3 ? 3 : dead.cho ? 0 : PROG3[t.cho];
    v += (t.pi >= 10 ? t.pi - 9 : 0) + 0.12 * Math.min(t.pi, 10) + (t.pi > G.pibakMax(n) ? 1 : 0);
    return v;
  }
  // q 가 cards 를 먹으면 얼마나 좋아지나
  function gain(info, q, cards) {
    const me = info.P[q], t = Object.assign({}, me.t);
    const before = posValue(t, me.dead, info.n);
    for (const c of cards) add(t, c, c === KOOK ? bestKookFor(t, info) : info.kook);
    return posValue(t, me.dead, info.n) - before;
  }
  function bestKookFor(t, info) { if (info.kook) return info.kook; return t.pi >= 7 && t.y < 4 ? 'P' : 'Y'; }

  // 판 전체 평가: 내 값어치 - 상대 값어치 (3인은 상대 둘을 조금 덜 셈)
  function evalState(s, p) {
    const info = analyze(s);
    let v = 0;
    const w = s.n === 2 ? 1 : 0.6;
    for (let q = 0; q < s.n; q++) {
      const x = posValue(info.P[q].t, info.P[q].dead, s.n);
      v += q === p ? x : -w * x;
    }
    return { v, info };
  }

  // 보이지 않는 패 (view 기준)
  function unseenOf(v) {
    const seen = new Set();
    for (const c of v.table) seen.add(c);
    for (const pile of v.cap) for (const c of pile) seen.add(c);
    for (const h of v.hands) for (const c of h) if (c >= 0) seen.add(c);
    if (v.cur) { if (v.cur.flip >= 0) seen.add(v.cur.flip); for (const c of v.cur.caps) seen.add(c); }
    return G.gameCards(v.bonus).filter(c => !seen.has(c));
  }
  // 온전한 상태에서 p 가 못 보는 패 (view 복사 없이)
  function unseenMask(s, p) {
    const seen = new Uint8Array(51);
    for (const c of s.hands[p]) seen[c] = 1;
    for (const c of s.table) seen[c] = 1;
    for (const pile of s.cap) for (const c of pile) seen[c] = 1;
    for (let q = 0; q < s.n; q++) if (q !== p) for (const c of s.known[q]) seen[c] = 1;
    let n = 0;
    const out = new Uint8Array(51);
    for (const c of G.gameCards(s.bonus)) if (!seen[c]) { out[c] = 1; n++; }
    return { m: out, n };
  }

  // 바닥에 남은 패를 다음 사람이 가져갈 위험 - 다음 내 차례에 내가 가져올 기회
  function exposure(s, p, info, U) {
    const n = s.n, cnt = Math.max(1, U.n);
    const nxt = (p + 1) % n, h = s.hands[nxt].length;
    let risk = 0, chance = 0;
    const byM = [];
    for (const c of s.table) { const m = monthOf(c); if (m < 0) continue; (byM[m] || (byM[m] = [])).push(c); }
    const myM = G.monthCount(s.hands[p]);
    for (let m = 0; m < 12; m++) {
      const cards = byM[m]; if (!cards) continue;
      let k = 0; for (let i = 0; i < 4; i++) if (U.m[m * 4 + i]) k++;
      const pHold = k ? 1 - Math.pow(1 - Math.min(1, h / cnt), k) : 0;
      const take = cards.length === 2 ? [bestOf(cards)] : cards;
      let g = gain(info, nxt, take);
      if (cards.length === 3 && s.owner[m] >= 0) g += 0.5 * (s.owner[m] === nxt ? 2 : 1);   // 뻑 먹으면 피도 받음
      risk += pHold * g * (n === 2 ? 1 : 0.7);
      if (myM[m] > 0) chance += (1 - pHold) * gain(info, p, take) * 0.45;
    }
    return chance - risk;
  }
  const STATIC = c => (c === KOOK ? 3 : KIND[c] === GW ? (c === RAIN ? 4 : 6) : KIND[c] === YE ? (BIRD[c] ? 4 : 2.5) : KIND[c] === TI ? (RIB[c] && RIB[c] < 4 ? 3 : 2) : PIV[c] * 1.05);
  const bestOf = cards => cards.reduce((a, b) => (STATIC(b) > STATIC(a) ? b : a));

  // ── 🐣 쉬움 ───────────────────────────────────────────────
  function easy(v, rng) {
    const L = G.legal(v), p = v.turn;
    if (L.length === 1) return L[0];
    if (v.phase === 'goStop') return v.hands[p].length >= 4 && rng() < 0.3 ? A.GO : A.STOP;
    if (v.phase === 'kook') return quick(v.cap[p], 'Y').pi >= 8 ? A.KP : A.KY;
    if (v.phase === 'pickHand' || v.phase === 'pickFlip') { const o = v.cur.opts; return STATIC(o[1]) > STATIC(o[0]) ? A.PICK + 1 : A.PICK; }
    for (const a of L) if (isPlay(a) && G.isBonus(cardOf(a))) return a;     // 보너스는 바로
    if (rng() < 0.25) return L[Math.floor(rng() * L.length)];
    const bomb = L.find(isBomb); if (bomb != null && rng() < 0.7) return bomb;
    let best = L[0], bv = -1e9;
    for (const a of L) {
      if (!isPlay(a)) continue;
      const c = cardOf(a), T = v.table.filter(x => monthOf(x) === monthOf(c));
      let val = T.length ? STATIC(c) + (T.length === 3 ? T.reduce((s, x) => s + STATIC(x), 0) : STATIC(bestOf(T))) : -STATIC(c) * 0.5;
      val += rng() * 0.8;
      if (val > bv) { bv = val; best = a; }
    }
    if (isPlay(best) && L.indexOf(best + A.SHAKE) >= 0 && rng() < 0.5) return best + A.SHAKE;   // 흔들 수 있으면 반쯤은 흔듦
    return best;
  }

  // ── 🐱 보통: 뒤집힐 패를 하나하나 가정해 보고 평균 ────────────────
  // 바꿔 끼워도 결과가 같은 패는 한 번만 (같은 월 보통 피 두 장 등)
  function flipClasses(unseen) {
    const m = new Map();
    for (const u of unseen) {
      const key = KIND[u] === PI && PIV[u] === 1 && !G.isBonus(u) ? 100 + monthOf(u) : u;
      const e = m.get(key); if (e) e.w++; else m.set(key, { u, w: 1 });
    }
    return [...m.values()];
  }
  function evalAction(world, classes, a, p, rng) {
    let sum = 0, wsum = 0;
    for (const { u, w } of classes) {
      const s = G.fastClone(world);
      if (u >= 0 && s.deck.length) {
        const top = s.deck.length - 1;
        if (s.deck[top] !== u) {
          const i = s.deck.indexOf(u);
          if (i >= 0) { s.deck[i] = s.deck[top]; s.deck[top] = u; }
          else for (let q = 0; q < s.n; q++) { if (q === p) continue; const j = s.hands[q].indexOf(u); if (j >= 0) { s.hands[q][j] = s.deck[top]; s.deck[top] = u; s.hands[q].sort((x, y) => x - y); break; } }
        }
      }
      G.apply(s, a, null);
      settleTurn(s, p);
      sum += w * scoreAfter(s, p);
      wsum += w;
    }
    return wsum ? sum / wsum : 0;
  }
  // 한 차례 안에서 남은 작은 결정(고르기·국진)은 욕심껏 끝냄
  function settleTurn(s, p) {
    for (let guard = 0; guard < 6 && s.phase !== 'end' && s.turn === p; guard++) {
      if (s.phase === 'pickHand' || s.phase === 'pickFlip') { const o = s.cur.opts; const info = analyze(s); G.apply(s, gain(info, p, [o[1]]) > gain(info, p, [o[0]]) ? A.PICK + 1 : A.PICK, null); }
      else if (s.phase === 'kook') G.apply(s, kookChoice(s, p), null);
      else break;
    }
  }
  function scoreAfter(s, p) {
    if (s.phase === 'end') { const r = G.reward(s, p); return r > 0 ? 6 + r * 0.6 : r < 0 ? -6 + r * 0.6 : -0.5; }
    const { v, info } = evalState(s, p);
    let x = v + exposure(s, p, info, unseenMask(s, p));
    if (s.phase === 'goStop' && s.turn === p) x += 1.2;                 // 날 수 있는 자리 (고/스톱 고를 수 있음)
    return x;
  }
  function kookChoice(s, p) {
    const info = analyze(s), me = info.P[p];
    const a = posValue(quick(s.cap[p], 'Y'), me.dead, s.n), b = posValue(quick(s.cap[p], 'P'), me.dead, s.n);
    return b > a + 0.05 ? A.KP : A.KY;
  }
  function threatOf(v, p) {
    const info = analyze(v);
    let threat = 0, oppBase = 0;
    for (let q = 0; q < v.n; q++) {
      if (q === p) continue;
      oppBase = Math.max(oppBase, G.tally(v, q).base);
      threat = Math.max(threat, posValue(info.P[q].t, info.P[q].dead, v.n));
    }
    return { threat, oppBase, thr: info.thr };
  }
  function goStopNormal(v, p) {
    const { threat, oppBase, thr } = threatOf(v, p), n = v.n;
    const left = v.hands[p].length + v.pass[p];
    const pre = G.stopPreview(v, p);
    if (left <= 1) return A.STOP;
    if (pre.points >= (n === 2 ? 28 : 14)) return A.STOP;              // 크게 났으면 챙김
    if (n === 2) {
      if (oppBase >= thr - 2 || threat >= thr - 1.2) return A.STOP;
      if (v.go[p] >= 2 && threat >= 3) return A.STOP;
      if (left >= 3 && threat < thr - 3) return A.GO;
      if (left >= 2 && threat < 2.5 && v.go[p] === 0) return A.GO;
      return A.STOP;
    }
    if (oppBase >= 1 || threat >= 2.2) return A.STOP;
    if (left >= 3 && threat < 1.6) return A.GO;
    return A.STOP;
  }
  function pickNormal(v, p) {
    const info = analyze(v), o = v.cur.opts;
    const val = c => gain(info, p, [c]) + 0.5 * oppGain(info, p, c);
    return val(o[1]) > val(o[0]) ? A.PICK + 1 : A.PICK;
  }
  function normal(v, rng) {
    const L = G.legal(v), p = v.turn;
    if (L.length === 1) return L[0];
    if (v.phase === 'goStop') return goStopNormal(v, p);
    if (v.phase === 'kook') return kookChoice(v, p);
    if (v.phase === 'pickHand' || v.phase === 'pickFlip') return pickNormal(v, p);
    for (const a of L) if (isPlay(a) && G.isBonus(cardOf(a))) return a;      // 보너스는 공짜
    return rankPlays(v, L, p, rng)[0].a;
  }
  function oppGain(info, p, c) { let g = 0; for (let q = 0; q < info.n; q++) if (q !== p) g += gain(info, q, [c]); return g; }
  // 내는 수마다 점수 (높은 순)
  function rankPlays(v, L, p, rng) {
    const world = G.sampleWorld(v, rng), classes = flipClasses(unseenOf(v));
    if (!classes.length) classes.push({ u: -1, w: 1 });
    const out = [];
    for (const a of L) {
      let x = evalAction(world, classes, a, p, rng);
      if (isShake(a)) x += 0.9;                                          // 흔들기: 이기면 두 배
      if (a === A.PASS) x += 0.6;                                        // 손패를 아낌
      out.push({ a, x });
    }
    out.sort((a, b) => b.x - a.x);
    return out;
  }

  // 빠른 수용 값어치: 기본 값 + 내가 모으는 약을 채우는 패 + 상대 약을 막는 패
  function dynValue(s, p) {
    const kook = s.kook || 'Y', T = s.cap.map(c => quick(c, kook));
    const me = T[p];
    const opp = { g: 0, birds: 0, hong: 0, cheong: 0, cho: 0 };
    for (let q = 0; q < s.n; q++) if (q !== p) for (const k in opp) opp[k] = Math.max(opp[k], T[q][k]);
    return c => {
      let v = STATIC(c);
      const k = KIND[c];
      if (k === GW) { if (me.g === 2) v += 3; if (opp.g === 2) v += 2; }
      else if (BIRD[c]) { if (me.birds === 2) v += 4; else if (me.birds === 1) v += 1; if (opp.birds === 2) v += 3; }
      else if (k === TI) {
        const r = RIB[c], key = r === R_HONG ? 'hong' : r === R_CHEONG ? 'cheong' : r === R_CHO ? 'cho' : null;
        if (key) { if (me[key] === 2) v += 3; else if (me[key] === 1) v += 0.8; if (opp[key] === 2) v += 2.5; }
      } else if (k === PI && me.pi >= 7 && me.pi <= 9) v += 0.8;
      return v;
    };
  }

  // ── 🐯 어려움: 결정화 몬테카를로 (PIMC) ─────────────────────────
  // 끝까지 둬 볼 때 쓰는 빠른 수 (더미·남의 손패는 안 엿봄: 내 손패·바닥·먹은 패만 보고)
  function fastPolicy(s, rng) {
    const L = G.legal(s), p = s.turn;
    if (L.length === 1) return L[0];
    switch (s.phase) {
      case 'goStop': {
        let ob = 0; for (let q = 0; q < s.n; q++) if (q !== p) ob = Math.max(ob, G.tally(s, q).base);
        const left = s.hands[p].length + s.pass[p], thr = G.thresholdOf(s.n);
        return left >= 4 && ob <= thr - 4 && s.go[p] < 2 && rng() < 0.6 ? A.GO : A.STOP;
      }
      case 'kook': return quick(s.cap[p], 'Y').pi >= 7 ? A.KP : A.KY;
      case 'pickHand': case 'pickFlip': { const o = s.cur.opts; return STATIC(o[1]) > STATIC(o[0]) ? A.PICK + 1 : A.PICK; }
    }
    // 아직 안 보인 같은 월 패 수 (0이면 버려도 아무도 못 가져감)
    let vis = null;
    const V = dynValue(s, p);
    let best = L[0], bv = -1e9;
    for (const a of L) {
      let val;
      if (isPlay(a)) {
        const c = cardOf(a);
        if (G.isBonus(c)) return a;
        const m = monthOf(c);
        let k = 0, tv = 0, top = 0;
        for (const x of s.table) if (monthOf(x) === m) { k++; const xv = V(x); tv += xv; if (xv > top) top = xv; }
        if (k) val = k === 3 ? V(c) + tv + 2 : V(c) + top;
        else {
          if (!vis) { vis = new Uint8Array(51); for (const pile of s.cap) for (const x of pile) vis[x] = 1; for (const x of s.hands[p]) vis[x] = 1; }
          let left = 0; for (let i = 0; i < 4; i++) if (!vis[m * 4 + i] && m * 4 + i !== c) left++;
          val = left === 0 ? 0.5 : -V(c) * (0.35 + 0.15 * left);
        }
      } else if (isShake(a)) val = -1e8;                                   // 흔들기는 아래에서
      else if (isBomb(a)) val = 12;
      else val = 0.3;
      val += rng() * 0.5;
      if (val > bv) { bv = val; best = a; }
    }
    if (isPlay(best) && L.indexOf(best + A.SHAKE) >= 0) return best + A.SHAKE;
    return best;
  }
  function rollout(s, rng, limit) {
    for (let i = 0; i < (limit || 400) && s.phase !== 'end'; i++) G.apply(s, fastPolicy(s, rng), null);
    return s;
  }
  // 예산: samples(정해진 횟수, 시험용) 또는 ms(시간, 화면용)
  function budgetOf(opts) { const samples = opts.samples || 0; return { samples, ms: samples ? 0 : (opts.ms || 350) }; }
  function hard(v, rng, opts) {
    opts = opts || {};
    const L = G.legal(v), p = v.turn;
    if (L.length === 1) return L[0];
    if (v.phase === 'kook') return kookChoice(v, p);
    if (v.phase === 'pickHand' || v.phase === 'pickFlip') return pickNormal(v, p);
    for (const a of L) if (isPlay(a) && G.isBonus(cardOf(a))) return a;
    const B = budgetOf(opts), t0 = now();
    const more = k => (B.samples ? k < B.samples : k < 6 || (now() - t0 < B.ms && k < 600));
    if (v.phase === 'goStop') {
      // 지금 스톱한 점수 vs 고 하고 끝까지 둬 본 평균 (기댓값이 큰 쪽, 벤치에서 가장 셌음)
      const stopPts = G.stopPreview(v, p).points;
      let sum = 0, k = 0;
      for (; more(k); k++) { const w = G.sampleWorld(v, rng); G.apply(w, A.GO, null); rollout(w, rng); sum += G.reward(w, p); }
      const gm = opts.gm != null ? opts.gm : 1, ga = opts.ga != null ? opts.ga : 0;
      return sum / Math.max(1, k) > stopPts * gm + ga ? A.GO : A.STOP;
    }
    const ranked = rankPlays(v, L, p, rng);
    // 패 내기: 빠른 끝까지-두기로 순위를 고치면(beta>0) 오히려 약해져서(RL.md 벤치) 기본은 🐱 의 한 수 앞 판단 그대로
    const beta0 = opts.beta != null ? opts.beta : 0;
    if (!beta0 || ranked.length === 1 || ranked[0].x - ranked[1].x > 2.5) return ranked[0].a;
    const cand = ranked.filter((r, i) => i < 4 || isBomb(r.a));
    const sum = new Map(cand.map(r => [r.a, 0]));
    let k = 0;
    for (; more(k * cand.length); k++) {
      const world = G.sampleWorld(v, rng);
      for (const r of cand) { const s = G.fastClone(world); G.apply(s, r.a, null); rollout(s, rng); sum.set(r.a, sum.get(r.a) + G.reward(s, p)); }
    }
    const avg = cand.map(r => sum.get(r.a) / Math.max(1, k)), mean = avg.reduce((a, b) => a + b, 0) / avg.length;
    let best = cand[0].a, bv = -1e9;
    cand.forEach((r, i) => { const x = r.x + beta0 * (avg[i] - mean); if (x > bv) { bv = x; best = r.a; } });
    return best;
  }

  const TIERS = { easy, normal, hard };
  function choose(v, tier, opts) {
    opts = opts || {};
    const rng = opts.rng || G.makeRng((opts.seed >>> 0) || 12345);
    const f = TIERS[tier] || normal;
    return f(v, rng, opts);
  }

  // 힌트: 보통 AI 가 고른 수 + 짧은 까닭
  function hint(v, opts) {
    const rng = (opts && opts.rng) || G.makeRng(777);
    const a = normal(v, rng);
    let why = '';
    if (v.phase === 'play') {
      if (isBomb(a)) why = '폭탄! 같은 달 세 장을 한꺼번에 내서 네 장을 다 가져와요';
      else if (a === A.PASS) why = '지금은 손패를 아끼고 뒤집기만 해요';
      else {
        const c = cardOf(a);
        if (G.isBonus(c)) why = '보너스 피는 내자마자 내 것이 돼요';
        else {
          const T = v.table.filter(x => monthOf(x) === monthOf(c));
          if (T.length === 3) why = (monthOf(c) + 1) + '월 세 장을 한꺼번에 가져올 수 있어요';
          else if (T.length) why = '바닥의 ' + G.cardName(bestOf(T)) + ' 을(를) 가져올 수 있어요';
          else why = '맞는 패가 없을 땐 덜 아까운 패를 내요';
          if (isShake(a)) why += ' (흔들면 이길 때 두 배)';
        }
      }
    } else if (v.phase === 'goStop') why = a === A.GO ? '아직 여유가 있어요. 한 번 더 가 볼 만해요' : '상대가 무서워요. 여기서 챙기는 게 좋아요';
    else if (v.phase === 'kook') why = a === A.KP ? '피를 모으는 중이라 쌍피가 나아요' : '열끗으로 두는 게 나아요';
    else why = '더 값진 패를 골라요';
    return { action: a, why, card: v.phase === 'play' ? cardOf(a) : -1 };
  }

  const API = { choose, hint, easy, normal, hard, fastPolicy, rollout, evalState, posValue, analyze, rankPlays, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GostopAI = API;
})(this);

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
  const A = { PLAY: G.A_PLAY, SHAKE: G.A_SHAKE, BOMB: G.A_BOMB, PASS: G.A_PASS, PICK: G.A_PICK, GO: G.A_GO, STOP: G.A_STOP, KY: G.A_KOOK_Y, KP: G.A_KOOK_P, BUY: G.A_BUY, NOBUY: G.A_NOBUY };
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const monthOf = G.monthOf;
  const SETS = { godori: [4, 12, 29], hong: [1, 5, 9], cheong: [21, 33, 37], cho: [13, 17, 25] };
  const GWANGS = [0, 8, 28, 40, 44];
  const isPlay = a => a < A.SHAKE, isShake = a => a >= A.SHAKE && a < A.BOMB, isBomb = a => a >= A.BOMB && a < A.PASS;
  const cardOf = a => (isPlay(a) ? a - A.PLAY : isShake(a) ? a - A.SHAKE : -1);

  // ── 성격 (타짜마다 다른 손버릇) — choose(…, { style }) 로 그 한 수에만 씀 ──
  //   read 상대 읽기 · block 상대 값어치를 얼마나 무겁게 · shakeB 흔들기 욕심 · slip 비슷한 두 수 중 둘째를 낼 확률 · noise 판단 흔들림
  //   gm·ga 고/스톱 문턱 (고 평균 > 스톱 점수×gm + ga 이면 고) · t 끝까지 둬 보는 양 (배수)
  // 영화 '타짜' 인물 느낌, 약한 → 센 순 (벤치는 RL.md)
  const STYLES = {
    고광렬: { slip: 0.3, noise: 0.6, shakeB: 1.8, ga: -2.5, t: 0.4 },   // 고니 짝꿍 · 입담과 허세 — '고!' 를 못 참고 가끔 손이 먼저 나감
    짝귀:   { read: 1, block: 1.2, gm: 1.1, ga: 0.5 },                    // 전라도 3대 타짜 · 과묵·신중 — 상대 약을 먼저 막고 일찍 챙김
    평경장: { read: 1, gm: 0.9, block: 0.9 },                             // 고니의 스승 '패를 세라' — 정석·균형
    아귀:   { read: 1, gm: 0.7, block: 0.7, t: 1.6 },                     // 경상도 3대 타짜 · 최종 보스 — 상대를 읽고 판을 크게 (고를 세게 부르고 내 약에 몰빵)
  };
  const BASE_K = { read: 0, block: 1, shakeB: 0.9, slip: 0, noise: 0 };
  let K = BASE_K;
  function withK(k, f) { const old = K; K = Object.assign({}, BASE_K, k); try { return f(); } finally { K = old; } }

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
    return { n, kook, P, thr: G.thresholdOf(n, v.rules) };
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
    const w = (s.n === 2 ? 1 : 0.6) * K.block;
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
      let pHold = k ? 1 - Math.pow(1 - Math.min(1, h / cnt), k) : 0;
      if (K.read && s.decl && (s.decl[nxt] >> m) & 1) pHold *= 0.3;     // 상대 읽기: 먹을 수 있었는데 짝 없이 버린 달
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
    return pickRanked(rankPlays(v, L, p, rng), rng);
  }
  function oppGain(info, p, c) { let g = 0; for (let q = 0; q < info.n; q++) if (q !== p) g += gain(info, q, [c]); return g; }
  // 내는 수마다 점수 (높은 순)
  function rankPlays(v, L, p, rng) {
    const world = G.sampleWorld(v, rng), classes = flipClasses(unseenOf(v));
    if (!classes.length) classes.push({ u: -1, w: 1 });
    const out = [];
    for (const a of L) {
      let x = evalAction(world, classes, a, p, rng);
      if (isShake(a)) x += K.shakeB;                                     // 흔들기: 이기면 두 배
      if (K.noise) x += (rng() - 0.5) * 2 * K.noise;                     // 성격: 판단 흔들림
      if (a === A.PASS) x += 0.6;                                        // 손패를 아낌
      out.push({ a, x });
    }
    out.sort((a, b) => b.x - a.x);
    return out;
  }
  // 성격: 비슷한 두 수 중 가끔 둘째 것 (손이 먼저 나감)
  function pickRanked(ranked, rng) {
    if (K.slip && ranked.length > 1 && ranked[0].x - ranked[1].x < 1.5 && rng() < K.slip) return ranked[1].a;
    return ranked[0].a;
  }
  // 상대 읽기: 먹을 수 있었는데 짝 없이 버린 사람에게는 그 달 패를 덜 쥐여 다시 나눔 (decl — 모두에게 보인 사실만, 80%만 믿음)
  function readWorld(w, v, p, rng) {
    if (!K.read || !v.decl) return w;
    for (let q = 0; q < w.n; q++) {
      const D = v.decl[q]; if (q === p || !D) continue;
      const shown = v.hands[q].filter(c => c >= 0), h = w.hands[q];
      for (let i = 0; i < h.length; i++) {
        const x = h[i], mx = monthOf(x);
        if (mx < 0 || !((D >> mx) & 1) || shown.indexOf(x) >= 0 || rng() < 0.2) continue;
        const L = w.deck.length, s0 = Math.floor(rng() * L);
        for (let k = 0; k < L; k++) { const j = (s0 + k) % L, y = w.deck[j], my = monthOf(y); if (my >= 0 && (D >> my) & 1) continue; w.deck[j] = x; h[i] = y; break; }
      }
      h.sort((a, b) => a - b);
    }
    return w;
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
        const left = s.hands[p].length + s.pass[p], thr = G.thresholdOf(s.n, s.rules);
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
      for (; more(k); k++) { const w = readWorld(G.sampleWorld(v, rng), v, p, rng); G.apply(w, A.GO, null); rollout(w, rng); sum += G.reward(w, p); }
      const gm = opts.gm != null ? opts.gm : K.gm != null ? K.gm : 1, ga = opts.ga != null ? opts.ga : K.ga != null ? K.ga : 0;
      return sum / Math.max(1, k) > stopPts * gm + ga ? A.GO : A.STOP;
    }
    const ranked = rankPlays(v, L, p, rng);
    // 패 내기: 빠른 끝까지-두기로 순위를 고치면(beta>0) 오히려 약해져서(RL.md 벤치) 기본은 🐱 의 한 수 앞 판단 그대로
    const beta0 = opts.beta != null ? opts.beta : 0;
    if (!beta0 || ranked.length === 1 || ranked[0].x - ranked[1].x > 2.5) return pickRanked(ranked, rng);
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

  // ── 광 팔기: 쉬는 사람이 내놓은 광을 살지 (값은 한 장 1점) ─────────────
  // 🐣 반반 · 🐱🐯 내 손과 합쳐 광이 세 장이 되거나, 두 장 이상 한꺼번에 나오면 삼
  function buyChoice(v, tier, rng) {
    const p = v.turn, o = v.sale.offers[v.sale.i], k = o.cards.length;
    if (tier === 'easy') return rng() < 0.5 ? A.BUY : A.NOBUY;
    let have = 0;
    for (const c of v.hands[p]) if (c >= 0 && KIND[c] === GW) have++;
    for (const c of v.cap[p]) if (KIND[c] === GW) have++;
    return have + k >= 3 || k >= 2 ? A.BUY : A.NOBUY;
  }

  const TIERS = { easy, normal, hard };
  function choose(v, tier, opts) {
    opts = opts || {};
    const rng = opts.rng || G.makeRng((opts.seed >>> 0) || 12345);
    if (v.phase === 'buy') return buyChoice(v, tier, rng);
    const f = TIERS[tier] || normal;
    const st = opts.style && STYLES[opts.style];
    if (!st) return f(v, rng, opts);
    const o = Object.assign({}, opts);
    if (st.t) { if (o.samples) o.samples = Math.max(8, Math.round(o.samples * st.t)); else o.ms = Math.round((o.ms || 350) * st.t); }
    return withK(st, () => f(v, rng, o));
  }

  // 힌트: 보통 AI 가 고른 수 + 짧은 까닭
  function hint(v, opts) {
    const rng = (opts && opts.rng) || G.makeRng(777);
    if (v.phase === 'buy') { const b = buyChoice(v, 'normal', rng); return { action: b, why: b === A.BUY ? '광이 모이면 광 점수에 가까워져요' : '값을 치를 만큼은 아니에요', card: -1 }; }
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

  // ── 🧑‍🏫 일타 강사 코치: 손패 모든 카드의 기댓값(EV) 신호등 + 한국어 해설 ──
  function explainCardPlay(v, info, U, c, a) {
    const p = v.turn, me = info.P[p].t, dead = info.P[p].dead, n = v.n;
    if (G.isBonus(c)) return { tag: '보너스', why: '보너스 피는 내자마자 내 피가 되고 더미에서 한 장을 새로 뽑아요 (공짜 이득!)' };
    const m = monthOf(c), mLabel = (m + 1) + '월';
    const T = v.table.filter(x => monthOf(x) === m);
    let oppBirds = 0, oppG = 0, oppHong = 0, oppCheong = 0, oppCho = 0;
    for (let q = 0; q < n; q++) if (q !== p) {
      const ot = info.P[q].t, od = info.P[q].dead;                     // 그 상대에게도 이미 막힌 약은 안 셈 (내가 한 장 쥔 약)
      if (!od.godori) oppBirds = Math.max(oppBirds, ot.birds);
      if (!od.gwang) oppG = Math.max(oppG, ot.g);
      if (!od.hong) oppHong = Math.max(oppHong, ot.hong);
      if (!od.cheong) oppCheong = Math.max(oppCheong, ot.cheong);
      if (!od.cho) oppCho = Math.max(oppCho, ot.cho);
    }
    let unseenSame = 0;
    for (let i = 0; i < 4; i++) {
      const cid = m * 4 + i;
      if (cid !== c && U.m[cid]) unseenSame++;
    }
    if (isBomb(a)) {
      return { tag: '💣 폭탄 찬스', why: `${mLabel} 네 장을 한꺼번에 쓸어담고 상대에게 피 1장씩 뺏으며 점수 ×2배를 걸어요!` };
    }
    if (T.length) {
      const target = T.length === 2 ? bestOf(T) : T[0];
      const capCards = T.length === 3 ? [c, ...T] : [c, target];
      const reasons = [];
      let tag = '짝 맞춤';
      if (T.length === 3) {
        tag = '🔥 뻑 먹기';
        reasons.push(`${mLabel} 뻑 세 장을 통째로 가져오고 상대에게 피도 뺏어와요`);
      }
      if (capCards.some(x => KIND[x] === GW)) {
        const g3 = me.g >= 2 && !dead.gwang;
        tag = g3 ? '🌟 3광 완성!' : '🌟 광 확보';
        reasons.push(g3 ? '이번에 광을 먹으면 광 점수가 나요!' : oppG >= 2 ? '상대가 광 2장 — 이 광을 먼저 가져와 막아요' : dead.gwang ? '광 점수는 이미 어렵지만 상대에게 안 주는 게 이득이에요' : '귀한 광을 먼저 챙겨요');
      }
      if (capCards.some(x => BIRD[x])) {
        if (me.birds >= 2 && !dead.godori) { tag = '🐦 고도리 완성!'; reasons.push('새 세 마리(고도리 5점)가 완성돼요!'); }
        else if (oppBirds >= 2) { tag = '🛡 고도리 방어'; reasons.push('상대가 새 2장을 모아서 이 새를 꼭 먼저 끊어야 해요!'); }
        else if (dead.godori) reasons.push('고도리는 상대가 새를 가져가 이미 막혔어요 — 열끗 한 장 몫');
        else reasons.push('고도리(새) 발판을 챙겨요');
      }
      for (const [rType, rName, myCnt, opCnt, isDead] of [
        [R_HONG, '홍단', me.hong, oppHong, dead.hong],
        [R_CHEONG, '청단', me.cheong, oppCheong, dead.cheong],
        [R_CHO, '초단', me.cho, oppCho, dead.cho],
      ]) {
        if (capCards.some(x => RIB[x] === rType)) {
          if (myCnt >= 2 && !isDead) { tag = `🎗 ${rName} 3점!`; reasons.push(`${rName} 세 장(3점)을 완성해요!`); }
          else if (opCnt >= 2) { tag = `🛡 ${rName} 차단`; reasons.push(`상대의 ${rName} 3점 완성을 막아요!`); }
          else if (isDead) reasons.push(`${rName}은 상대가 한 장 가져가 이미 막혔어요 — 띠 한 장 몫 (띠는 5장부터 점수)`);
          else reasons.push(`${rName} 띠를 모아요`);
        }
      }
      if (capCards.some(x => PIV[x] >= 2 || x === KOOK)) {
        if (tag === '짝 맞춤') tag = '💎 쌍피 확보';
        reasons.push('쌍피(2장 몫)를 챙겨 피 싸움에서 앞서가요');
      }
      if (T.length === 1 && unseenSame === 2) {
        reasons.push('아직 안 나온 같은 달 패가 2장이라 뒤집다 뻑이 날 작은 위험은 있어요');
      } else if (T.length === 1 && unseenSame === 0) {
        reasons.push('나머지 같은 달 패가 이미 다 나와 절대 뻑이 안 나는 100% 안전수예요');
      }
      if (isShake(a)) reasons.push('흔들기(×2배)까지 걸 수 있어요');
      if (!reasons.length) reasons.push(`바닥의 ${G.cardName(target)}을(를) 안정적으로 가져와요`);
      return { tag, why: reasons.join(' · ') };
    } else {
      if (unseenSame === 0) {
        return { tag: '🛡 안전 버림', why: `${mLabel}의 나머지 패가 이미 모두 나와서 바닥에 버려도 상대가 절대 먹을 수 없는 안전패예요` };
      }
      if (KIND[c] === GW) {
        return { tag: '⚠️ 광 버림 주의', why: `귀한 광(${G.cardName(c)})을 바닥에 깔면 상대에게 뺏길 위험이 커요` };
      }
      if (BIRD[c] && oppBirds >= 1) {
        return { tag: '🚨 고도리 위험', why: `상대가 새를 모으고 있어서 ${G.cardName(c)}을(를) 깔아주면 고도리를 허용할 수 있어요` };
      }
      if (PIV[c] >= 2 || c === KOOK) {
        return { tag: '⚠️ 쌍피 손실', why: '쌍피를 짝 없이 바닥에 버리면 상대에게 좋은 먹잇감이 돼요' };
      }
      return { tag: '버림패', why: `짝이 없을 때 비교적 덜 아까운 ${G.cardName(c)}을(를) 내어 간을 봐요 (남은 같은 달 패 ${unseenSame}장)` };
    }
  }

  // 👀 상대 읽기 (선생님): 모두에게 보인 것만 — 상대가 모으는 약과 빠진 한 장이 어디 있는지 · 먹을 수 있었는데 짝 없이 버린 달 · 흔들어 보인 패
  const SETNAME = { godori: '🐦 고도리', hong: '홍단', cheong: '청단', cho: '초단' };
  function readOpp(v) {
    const p = v.turn, info = analyze(v), U = unseenOf(v), out = [];
    const where = c => (v.table.indexOf(c) >= 0 ? '바닥에 있어요' : v.hands[p].indexOf(c) >= 0 ? '내 손에 — 버리지 마세요' : '아직 안 나왔어요');
    for (let q = 0; q < v.n; q++) {
      if (q === p) continue;
      const P = info.P[q], bits = [];
      for (const k in SETS) {
        if (P.dead[k]) continue;
        const miss = SETS[k].filter(c => v.cap[q].indexOf(c) < 0);
        if (miss.length === 1) bits.push(`${SETNAME[k]} 2/3 (남은 ${G.cardName(miss[0])}: ${where(miss[0])})`);
      }
      if (!P.dead.gwang && P.t.g === 2) bits.push('광 2장');
      if (P.t.pi >= 7 && P.t.pi < 10) bits.push(`피 ${P.t.pi}장`);
      const D = v.decl ? v.decl[q] : 0, ms = [];
      for (let m = 0; m < 12; m++) if ((D >> m) & 1 && U.some(c => monthOf(c) === m)) ms.push(m + 1);
      if (ms.length) bits.push(`${ms.join('·')}월 패는 없을 듯 (먹을 수 있었는데 짝 없이 버림)`);
      const shown = [...new Set(v.hands[q].filter(c => c >= 0).map(c => monthOf(c) + 1))];
      if (shown.length) bits.push(`흔들어 보인 ${shown.join('·')}월을 쥐고 있어요`);
      if (bits.length) out.push({ q, text: bits.join(' · ') });
    }
    return out;
  }

  // 👀 방금 상대 수 (선생님): q 의 차례 처음 vb · 끝 va (둘 다 내 눈 view) · a = 처음 낸 행동 → 한 줄 (모두에게 보인 것만)
  //   무엇을 가져갔나(값진 패 + 피 몇 장 · 내 피 뺏음) → 그걸로 무엇에 다가갔나 / 내 약을 막았나 / 고
  function readMove(vb, va, q, a) {
    const me = va.me, ib = analyze(vb), ia = analyze(va), tb = ib.P[q].t, ta = ia.P[q].t;
    const got = va.cap[q].filter(c => vb.cap[q].indexOf(c) < 0);
    const lost = me >= 0 && me !== q ? vb.cap[me].filter(c => va.cap[me].indexOf(c) < 0).length : 0;
    let what = '';
    if (isBomb(a)) what = `💣 ${a - A.BOMB + 1}월 폭탄 (세 장을 쥐고 있었어요)`;
    else if (a === A.PASS) what = '손패 없이 뒤집기만';
    else {
      const c = cardOf(a);
      if (c >= 0 && !G.isBonus(c) && !vb.table.some(x => monthOf(x) === monthOf(c))) what = `${G.cardName(c)}을(를) 짝 없이 버림`;
      if (isShake(a)) what = `흔들기 (${monthOf(c) + 1}월 세 장, 이기면 두 배)` + (what ? ' · ' + what : '');
    }
    const big = got.filter(c => c === KOOK || KIND[c] !== PI || PIV[c] >= 2), pis = got.length - big.length;
    if (got.length) what += (what ? ' · ' : '') + [...big.map(G.cardName), pis ? `피 ${pis}장` : ''].filter(Boolean).join(' + ') + ' 가져감';
    const aims = [];
    for (const k in SETS) {
      const n0 = SETS[k].filter(c => vb.cap[q].indexOf(c) >= 0).length, n1 = SETS[k].filter(c => va.cap[q].indexOf(c) >= 0).length;
      if (n1 <= n0) continue;
      if (n1 === 3) aims.push(`${SETNAME[k]} 완성!`);
      else if (!ia.P[q].dead[k]) aims.push(`${SETNAME[k]} ${n1}/3 노림`);
      if (me >= 0 && me !== q && !ib.P[me].dead[k] && SETS[k].some(c => vb.cap[me].indexOf(c) >= 0)) aims.push(`내 ${SETNAME[k]}을 막음`);
    }
    if (ta.g > tb.g) aims.push(ta.g >= 3 ? `광 ${ta.g}장 — 광 점수` : `광 ${ta.g}장`);
    if (lost) aims.push(`내 피 ${lost}장 뺏음`);
    if (ta.pi >= 10 && tb.pi < 10) aims.push(`피 ${ta.pi}장 — 피 점수`);
    else if (!aims.length && ta.pi > tb.pi) aims.push(`피 모으기 (${ta.pi}장)`);
    if (va.go[q] > vb.go[q]) aims.push(`${va.go[q]}고! (${G.tally(va, q).base}점에서 더 감)`);
    if (!what && !aims.length) return null;
    return { q, text: what + (aims.length ? ' → ' + aims.join(' · ') : '') };
  }

  function coachHand(v, opts) { return withK({ read: 1 }, () => coachHand0(v, opts)); }
  function coachHand0(v, opts) {
    opts = opts || {};
    const rng = opts.rng || G.makeRng(909);
    const L = G.legal(v), p = v.turn;
    if (v.phase !== 'play' || !L.length) return null;
    const ranked = rankPlays(v, L, p, rng);
    const world = G.sampleWorld(v, rng);
    const info = analyze(world), U = unseenMask(world, p);
    const bestX = ranked[0] ? ranked[0].x : 0;

    const byCard = {};
    for (const r of ranked) {
      let cards = [];
      if (isBomb(r.a)) {
        const m = r.a - A.BOMB;
        cards = v.hands[p].filter(x => monthOf(x) === m);
      } else {
        const c = cardOf(r.a);
        if (c >= 0) cards = [c];
      }
      for (const c of cards) {
        if (!byCard[c] || r.x > byCard[c].ev) {
          const delta = r.x - bestX;
          const tier = delta >= -0.05 ? 'best' : delta >= -0.55 ? 'good' : delta >= -1.35 ? 'ok' : 'bad';
          const ex = explainCardPlay(v, info, U, c, r.a);
          const evSign = r.x >= 0 ? '+' + r.x.toFixed(1) : r.x.toFixed(1);
          const dSign = delta >= -0.05 ? '최선' : (delta >= 0 ? '+' : '') + delta.toFixed(1);
          byCard[c] = {
            card: c,
            name: G.cardName(c),
            action: r.a,
            ev: r.x,
            delta,
            tier,
            evText: evSign,
            deltaText: dSign,
            tag: ex.tag,
            why: ex.why,
          };
        }
      }
    }
    for (const c of v.hands[p]) {
      if (G.isBonus(c) && !byCard[c]) {
        const ex = explainCardPlay(v, info, U, c, A.PLAY + c);
        byCard[c] = {
          card: c,
          name: G.cardName(c),
          action: A.PLAY + c,
          ev: bestX + 1.5,
          delta: 0,
          tier: 'best',
          evText: '+' + (bestX + 1.5).toFixed(1),
          deltaText: '최선',
          tag: ex.tag,
          why: ex.why,
        };
      }
    }
    const list = Object.values(byCard).sort((a, b) => b.ev - a.ev);
    const top = list[0] || null;
    return {
      byCard,
      list,
      bestCard: top ? top.card : -1,
      bestAction: top ? top.action : ranked[0].a,
      bestName: top ? top.name : '',
      bestWhy: top ? top.why : '',
      bestTag: top ? top.tag : '',
      read: readOpp(v),
    };
  }

  function coachGoStop(v, opts) { return withK({ read: 1 }, () => coachGoStop0(v, opts)); }
  function coachGoStop0(v, opts) {
    opts = opts || {};
    const rng = opts.rng || G.makeRng(2026);
    const p = v.turn;
    const stopPts = G.stopPreview(v, p).points;
    const samples = opts.samples || 56;
    let sum = 0, wins = 0, gobak = 0;
    for (let k = 0; k < samples; k++) {
      const w = readWorld(G.sampleWorld(v, rng), v, p, rng);
      G.apply(w, A.GO, null);
      rollout(w, rng);
      const r = G.reward(w, p);
      sum += r;
      if (r > 0) wins++;
      else if (r < 0) gobak++;
    }
    const goEv = sum / Math.max(1, samples);
    const winRateGo = Math.round((wins / Math.max(1, samples)) * 100);
    const gobakRisk = Math.round((gobak / Math.max(1, samples)) * 100);
    const rec = goEv > stopPts ? A.GO : A.STOP;
    const diff = Math.abs(goEv - stopPts).toFixed(1);
    const why = rec === A.GO
      ? `'고'를 외쳤을 때 평균 기댓값(+${goEv.toFixed(1)}점)이 지금 스톱(+${stopPts}점)보다 ${diff}점 더 높아요! (승리 유지 확률 ${winRateGo}%)`
      : `지금 스톱 확정 점수(+${stopPts}점)가 '고' 기댓값(${goEv >= 0 ? '+' : ''}${goEv.toFixed(1)}점)보다 유리해요. 역고박 위험(${gobakRisk}%)을 피해 실속을 챙기세요!`;
    return { stopPts, goEv, winRateGo, gobakRisk, rec, why };
  }

  // ── 📒 아쉬운 장면 판정 (복기·판 끝 자동 분석·다시 해 보기 공용) ──
  //   v = 그 차례 사람 눈(view)만, a = 실제로 한 행동 → null(판정 안 하는 장면) 또는
  //   { kind, tier(best·good·ok·bad), miss(추천보다 뚜렷이 손해), loss(점), my, best, why }
  //   패 내기: 선생님 신호등이 🔴(추천보다 1.35점 넘게 손해) · 고/스톱: 추천과 다르고 차이가 REVIEW.goStop 점과 스톱 점수의 REVIEW.goShare 를 넘음
  //   (고 기댓값은 56번 끝까지 둬 본 평균이라 몇 점은 흔들림 → 작은 차이는 안 셈)
  const REVIEW = { goStop: 3, goShare: 0.25 };
  const firstWhys = (t, k) => String(t || '').split(' · ').slice(0, k).join(' · ');
  const sevOf = loss => Math.max(0, Math.min(100, Math.round(loss * 18)));   // 1.35점 ≈ 24 · 5.5점 넘으면 100
  function review(v, a, o) {
    o = o || {};
    const p = v.turn;
    if (v.phase === 'play') {
      if (a === A.PASS) return null;                                   // 폭탄 뒤 뒤집기만: 선생님 비교가 없음
      const c = o.c || coachHand(v);
      if (!c || c.bestCard < 0) return null;
      const ch = isBomb(a) ? (v.hands[p].find(x => monthOf(x) === a - A.BOMB) ?? -1) : cardOf(a);
      const info = ch >= 0 ? c.byCard[ch] : null;
      if (!info) return null;
      const loss = Math.max(0, -info.delta);
      return { kind: 'play', tier: info.tier, miss: info.tier === 'bad', loss, sev: sevOf(loss), lossText: `−${loss.toFixed(1)}점`, my: `[${info.name}]`, best: `[${c.bestName}]`,
        why: `${c.bestTag ? c.bestTag + ' — ' : ''}${firstWhys(c.bestWhy, 2)}`, aim: info.tag ? `${info.tag} — ${info.why}` : info.why };
    }
    if (v.phase === 'goStop' && (a === A.GO || a === A.STOP)) {
      const g = o.g || coachGoStop(v);
      const loss = a === g.rec ? 0 : Math.abs(g.goEv - g.stopPts);
      const tier = a === g.rec ? 'best' : loss < 0.6 ? 'good' : loss < Math.max(REVIEW.goStop, g.stopPts * REVIEW.goShare) ? 'ok' : 'bad';
      return { kind: 'goStop', tier, miss: tier === 'bad', loss, sev: sevOf(loss), lossText: `−${loss.toFixed(1)}점`, my: a === A.GO ? '고' : '스톱', best: g.rec === A.GO ? '고' : '스톱', why: g.why };
    }
    return null;
  }

  const API = { choose, hint, coachHand, coachGoStop, readOpp, readMove, review, REVIEW, STYLES, easy, normal, hard, fastPolicy, rollout, evalState, posValue, analyze, rankPlays, TIER_IDS: ['easy', 'normal', 'hard'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GostopAI = API;
})(this);

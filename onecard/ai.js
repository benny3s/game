/* 원카드 AI — 🐣 easy · 🐱 normal · 🐯 hard + 🧑‍🏫 선생님(coach) + 원카드 외치기 경주
   · 모두 view(그 자리에 보이는 것)만 받음 → 남의 손패를 못 봄 (Node · 브라우저 · Web Worker 공용)
   · 🐯 은 결정화 몬테카를로: 숨은 카드를 보이는 정보에 맞게 여러 번 섞고(sampleWorld), 후보 수마다 같은 세계에서
     🐱 정책으로 끝까지 둬 본 평균 장수 변화로 고름 (같은 세계를 후보끼리 나눠 써서 운 차이를 줄임)
   · 난수는 opts.seed / opts.rng 로만 (Math.random 안 씀) → 같은 입력이면 같은 수
   · 🧑‍🏫 선생님은 추천만이 아니라 흐름도 읽음 (11-01): record(수 기록) · coach(view, { log, names }) → 👀 read · 📊 mine · 👉 mean — 보이는 정보(낸 카드 · 장수)만 */
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
  // 조커는 낼 수 있는 색 쪽으로 반 장 (흑백 조커 ♠♣ · 컬러 조커 ♥♦) — 남은 게 조커뿐일 때 못 내는 무늬를 고르지 않게
  const bestSuit = (h, avoid) => { const c = suitCounts(h); for (const x of h) if (G.isJoker(x)) { const red = G.base(x) === G.CJ; for (let su = 0; su < 4; su++) if (G.redSuit(su) === red) c[su] += 0.5; } let b = 0; for (let i = 1; i < 4; i++) if (c[i] > c[b]) b = i; if (avoid >= 0 && b === avoid) for (let i = 0; i < 4; i++) if (i !== avoid && c[i] >= c[b] - 1e-9) return i; return b; };   // avoid: 장수가 같으면 이 무늬는 피함 (선생님이 상대가 바꾼 무늬를 피할 때)
  const minOther = (s, p) => { let m = 99; for (let q = 0; q < s.n; q++) if (q !== p && s.out[q] === 0) m = Math.min(m, s.hands[q].length); return m; };

  // 이 카드를 낸 뒤 (K·J 로) 한 번 더 낼 때 이어 낼 카드가 있나
  function followUps(s, c, after) {
    const t = { suit: G.isJoker(c) ? -1 : G.suitOf(c), rank: G.isJoker(c) ? -1 : G.rankOf(c), rules: s.rules, atk: 0 };
    let k = 0; for (const x of after) if (G.matches(t, x)) k++;
    return k;
  }

  // ── 🐱 점수 매기기: [{ a, sc, why, tag }] (높을수록 좋음). 내 손패 + 모두 아는 정보만 씀 ─────────────
  function scorePlay(s, p, avoid) {
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
          out.push({ a, sc: nThreat ? 52 : 64, why: `${s.atkKind === '2' ? '같은 무늬 3 으로 2 공격을' : '3 으로 공격을'} 막아요 — 아무도 안 받아요`, tag: '막기' });
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
      const sameSuit = su >= 0 && !(r === G.R_7 && R.seven) ? cnt[su] - 1 : 0;   // 7 은 무늬를 바꾸니 제 무늬 장수로 점수 주지 않음 (외톨이 7 을 먼저)
      const sameRank = r >= 0 ? after.filter(x => G.rankOf(x) === r).length : 0;
      sc += 1.5 * sameSuit + 0.8 * sameRank;
      if (st > 0) {
        if (nThreat) { sc += 10 + st; why = `다음 사람이 ${nxtCnt}장 남았어요 — +${st} 공격으로 막아요`; tag = '공격'; }
        else if (after.length <= 2) { sc += 4; why = `카드가 얼마 안 남아서 공격 카드도 털어요 (+${st})`; tag = '공격'; }
        else if (nAtk >= 2) { sc += 1; why = `공격 카드가 여러 장이라 하나는 써도 돼요 (+${st})`; tag = '공격'; }
        else { sc -= G.isJoker(c) ? 9 : 5; why = `공격 카드는 받아칠 때 쓰려고 아껴 두는 게 좋아요`; tag = '아끼기'; }
      } else if (r === G.R_3 && R.block3) { sc -= 1.5; why = R.block3All === 'two' ? '3 은 2 공격을 막을 수 있어서 조금 아껴요' : '3 은 2·A 공격을 막을 수 있어서 조금 아껴요'; tag = '무난'; }
      else if (r === G.R_7 && R.seven) {
        const bs = bestSuit(after, avoid), k = suitCounts(after)[bs];
        sc += after.length <= 2 ? 2 : -4; sc += k * 0.6;
        why = `7 로 내가 많이 가진 ${G.SUIT_SYM[bs]}(${k}장)로 바꿔요${after.length > 2 ? ' — 다른 카드가 있으면 아껴도 좋아요' : ''}`; tag = '무늬 바꾸기';
      } else if ((r === G.R_K && R.kAgain) || (two && ((r === G.R_J && R.jSkip) || (r === G.R_Q && R.qRev && R.qTwo === 'again')))) {
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
      if (q === p || !seatTiers[q] || s.out[q] !== 0) continue;   // 이미 나간 사람은 못 잡음
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

  // ── 🧑‍🏫 흐름 읽기 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠고 재미없음) ───────────────────────
  //   내 차례에 ① 👀 상대가 내 지난 차례 뒤로 한 일과 노림 ② 📊 내 형세(상대와 장수 · 공격 위험) ③ 👉 추천이 그것과 어떻게 이어지는지.
  //   · 모두에게 보인 것만 씀: 낸 카드 · 먹은 장수 · 손패 장수 · 바꾼 무늬. 상대가 먹은 카드 · 손패 내용은 어디에도 없음
  //   · record(전, 후, 행동) = 한 수의 공개 기록 → 판마다 쌓아 두었다가 coach(view, { log, names }) 에 줌
  //   · 이름 · 말투는 여기서 (names[자리] = 화면 이름, 나는 '나')
  const SYM = G.SUIT_SYM, RN = G.RANK_NAME;
  const sy = su => (su >= 0 ? SYM[su] : '');
  const hasBat = s => { const ch = String(s).slice(-1), c = ch.charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return ch >= '0' && ch <= '9' && '013678'.indexOf(ch) >= 0; };
  const jo = (name, yes, no) => name + (hasBat(name) ? yes : no);           // jo('김씨', '이', '가') → 김씨가
  const nmOf = (o, q) => (o && o.names && o.names[q]) || `자리 ${q + 1}`;
  const lens = s => s.hands.map(h => h.length);

  // 한 수의 공개 기록 (sb = 두기 전 · sa = 둔 뒤, 온전한 상태여도 장수와 낸 카드만 뽑음)
  function record(sb, sa, a) {
    const call = sb.phase === 'call', p = call ? sb.call.p : sb.turn, R = sb.rules;
    const r = {
      p, ph: sb.phase, a, no: sb.turnNo, round: sb.round, cB: lens(sb), cA: lens(sa), outA: sa.out.slice(),
      atkB: sb.atk, atkA: sa.atk, kB: sb.atkKind, lp: sb.last ? sb.last.p : -1,
      suitB: sb.suit, rankB: sb.rank, suitA: sa.suit, rankA: sa.rank, dirB: sb.dir, dirA: sa.dir,
      nxB: G.nextActive(sb, p, 1), nxA: G.nextActive(sa, p, 1),
    };
    if (call) {
      if (a !== G.A_CALL) { r.by = a === G.A_MISS ? -1 : a - G.A_CATCH; r.pen = r.cA[p] - r.cB[p]; }
    } else if (sb.phase === 'suit') r.su = a - G.A_SUIT;
    else if (a === G.A_DRAW) r.drew = sa.out[p] === 2 ? (sb.atk > 0 ? sb.atk : 1) : r.cA[p] - r.cB[p];
    else {
      const c = a - G.A_PLAY, rk = G.rankOf(c);
      r.c = c;
      if (sa.phase === 'suit') r.pick = 1;                                   // 7 → 곧이어 무늬 고르기
      if (rk === G.R_J && R.jSkip && !(sb.atk > 0)) r.skip = r.nxB;
      if (sa.dir !== sb.dir) r.rev = 1;
      if (sa.phase === 'play' && sa.turn === p && sa.out[p] === 0) r.again = 1;
    }
    if (sa.out[p] === 2 && sb.out[p] === 0) r.bust = 1;
    return r;
  }
  // 내가 마지막으로 둔 뒤의 기록 (= 내 지난 차례 뒤로 상대들이 한 일)
  function since(log, me) { let k = log.length; while (k > 0 && log[k - 1].p !== me) k--; return log.slice(k); }

  // 한 기록 → { act(한 일), why(까닭 · 노림), lack({suit,rank}: 낼 게 없어 먹음), strong(많이 쥔 듯한 무늬), atkTo }
  function readRec(r, prev, v, o) {
    const me = v.me, R = v.rules, q = r.p, N = i => (i === me ? '나' : nmOf(o, i));
    const out = { act: '', why: '', lack: null, strong: -1, atkTo: -1, score: 0 };
    if (r.ph === 'call') {
      if (r.a === G.A_CALL) return out;                                      // 제때 외침 — '1장 남음' 으로 같이 말함
      out.act = `원카드를 못 외쳐 ${r.pen}장 벌칙`;
      out.why = r.by < 0 ? '시간이 지났어요' : r.by === me ? '내가 먼저 잡았어요' : `${N(r.by)}에게 잡혔어요`;
      out.score = 1;
      return out;
    }
    if (r.ph === 'suit') {
      const from = prev && prev.p === q && prev.pick ? prev.suitB : -1;     // 7 을 내기 전 무늬
      const mine = from >= 0 && from !== r.su ? suitCounts(v.hands[me])[from] : 0;
      out.act = `7 로 ${sy(r.su)} 바꿈`;
      out.strong = r.su;
      out.why = mine >= 2 ? `${sy(r.su)} 카드가 많거나 내 ${sy(from)}(${mine}장) 이어 내기를 막으려는 것`
        : from === r.su ? `무늬는 그대로 ${sy(r.su)} — 7 을 털었어요` : `${sy(r.su)} 카드가 많은 듯해요`;
      out.score = 1;
      return out;
    }
    if (r.a === G.A_DRAW) {
      if (r.atkB > 0) {
        out.act = `공격 ${r.atkB}장을 받음`;
        out.why = r.lp === me ? '내 공격이 먹혔어요' : '받아칠 카드가 없었어요';
        out.score = r.lp === me ? 2 : 1;
      } else {
        out.act = '한 장 먹음';
        const lack = r.suitB >= 0 ? ` (${sy(r.suitB)}${r.rankB >= 0 ? '·' + RN[r.rankB] : ''} 카드가 없는 듯)` : '';
        out.why = `낼 게 없었어요${lack}`;
        out.lack = { suit: r.suitB, rank: r.rankB };
        out.score = 1;
      }
      if (r.bust) { out.act += ' → 파산!'; out.score = 2; }
      return out;
    }
    const c = r.c, rk = G.rankOf(c), su = G.suitOf(c), nm = G.cardName(c), st = G.atkOf(c, R), tgt = r.nxB;
    if (st > 0) {                                                            // 공격 · 받아치기
      const total = r.atkA;
      if (r.atkB > 0) {
        out.act = `${nm} 로 받아침`;
        out.why = (r.lp === me ? '내 공격을 되받아서 ' : '') + (tgt === me ? `합쳐서 ${total}장을 나에게 먹이려는 수` : `합쳐서 ${total}장을 ${N(tgt)}에게 넘기는 수`);
      } else {
        out.act = `${nm} 공격`;
        out.why = tgt === me ? `나에게 ${total}장 먹이려는 수` : `${N(tgt)}에게 ${total}장 먹이려는 수`;
      }
      out.atkTo = tgt; out.score = tgt === me ? 3 : 2;
      return out;
    }
    if (r.atkB > 0 && r.atkA === 0) {                                        // 3 으로 막기
      out.act = `${nm} 로 막음`;
      out.why = r.lp === me ? '내 공격이 막혔어요' : `${N(r.lp)}의 공격 ${r.atkB}장이 사라졌어요`;
      out.score = r.lp === me ? 3 : 2;
      return out;
    }
    if (rk === G.R_7 && R.seven && r.pick) return out;                       // 7 → 곧이어 '무늬 바꿈' 기록에서 같이 말함
    if (rk === G.R_J && R.jSkip) {
      const sk = r.nxB, k = r.cA[sk];
      out.act = `${nm} (건너뛰기)`;
      out.why = sk === q ? '' : sk === me ? '나를 건너뜀' : `${N(sk)} 차례를 건너뜀${k <= 2 ? ` (${k}장이라 막으려는 수)` : ''}`;
      out.score = 1;
      return out;
    }
    if (rk === G.R_Q && R.qRev) {
      const was = r.nxB;
      out.act = `${nm} (방향 바꿈)`;
      if (was !== q && r.cB[was] <= 2) out.why = was === me ? `내 패가 ${r.cB[was]}장이라 내게 차례를 안 주려는 수` : `${N(was)}(${r.cB[was]}장)에게 안 넘기려는 수`;
      else if (r.nxA === me) out.why = '방향을 바꿔 나에게 넘김';
      out.score = 1;
      return out;
    }
    if (rk === G.R_K && R.kAgain) { out.act = `${nm} 한 번 더`; out.why = '빨리 털려는 수'; return out; }
    out.act = nm;
    if (r.suitB >= 0 && su >= 0 && su !== r.suitB && r.rankB >= 0 && rk === r.rankB) {
      out.why = `숫자 ${RN[rk]} 로 무늬를 ${sy(r.suitB)}→${sy(su)} 로 바꿈 · ${sy(su)} 카드가 있는 듯해요`;
      out.strong = su;
    }
    return out;
  }

  // 내 지난 차례 뒤 상대 수들 → { read: [{ q, name, rest, text }], info }
  function readMoves(v, log, tail, o) {
    const me = v.me, N = i => nmOf(o, i);
    const info = { lacks: {}, strong: {}, atkBy: v.atk > 0 && v.last ? v.last.p : -1, low: [] };
    for (let q = 0; q < v.n; q++) if (q !== me && v.out[q] === 0 && v.hands[q].length <= 2) info.low.push({ q, n: v.hands[q].length });
    info.low.sort((a, b) => a.n - b.n);
    const segs = [];
    tail.forEach((r, i) => {
      const rd = readRec(r, i > 0 ? tail[i - 1] : null, v, o);
      let sg = segs[segs.length - 1];
      if (!sg || sg.q !== r.p) segs.push(sg = { q: r.p, acts: [], whys: [], score: 0 });
      if (rd.act) sg.acts.push(rd.act);
      if (rd.why) sg.whys.push(rd.why);
      sg.score = Math.max(sg.score, rd.score);
      if (rd.lack) info.lacks[r.p] = rd.lack; else if (rd.act) delete info.lacks[r.p];
      if (rd.strong >= 0) info.strong[r.p] = rd.strong;
    });
    const lines = segs.map(sg => {
      const n = v.hands[sg.q].length;
      let rest = sg.acts.join(' → ');
      if (sg.whys.length) rest += (rest ? ' — ' : '') + sg.whys.join(' · ');
      if (v.out[sg.q] === 1) rest += (rest ? ' — ' : '') + '다 털고 나갔어요';
      else if (v.out[sg.q] === 0 && n === 1) { rest += (rest ? ' · ' : '') + '1장 남음 — 원카드 임박!'; sg.score = Math.max(sg.score, 2); }
      else if (v.out[sg.q] === 0 && n === 2) { rest += (rest ? ' · ' : '') + '2장 남음'; sg.score = Math.max(sg.score, 2); }
      return { q: sg.q, name: N(sg.q), rest, text: `${N(sg.q)} ${rest}`.trim(), score: sg.score };
    }).filter(x => x.rest);
    let read = lines;
    if (lines.length > 3) {                                                  // 많으면 중요한 셋만 (나머지는 한 줄로)
      const keep = new Set(lines.map((x, i) => [x.score, -i, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, 3).map(x => x[2]));
      const rest = lines.filter((x, i) => !keep.has(i)).map(x => x.name);
      read = lines.filter((x, i) => keep.has(i));
      read.push({ q: -1, name: '', rest: '', text: `그 밖에 ${rest.join('·')} 는 평범하게 냈어요` });
    }
    if (!read.length) {
      const L = v.last;
      if (log.length && !tail.length) read = [{ q: -1, name: '', rest: '', text: '이어서 내는 차례예요 — 새로 나온 상대 수는 없어요' }];
      else if (L && L.p >= 0 && L.p !== me) read = [{ q: L.p, name: N(L.p), rest: L.c >= 0 ? `방금 ${G.cardName(L.c)} 를 냈어요` : '방금 한 장 먹었어요', text: `${N(L.p)} ${L.c >= 0 ? `방금 ${G.cardName(L.c)} 를 냈어요` : '방금 한 장 먹었어요'}` }];
      else read = [{ q: -1, name: '', rest: '', text: v.turnNo > 0 ? '이어 받은 판이라 지난 상대 수는 기록이 없어요' : '아직 상대가 낸 카드가 없어요 — 내가 먼저예요' }];
    }
    return { read, info };
  }

  // 📊 내 흐름: 장수 비교(+지난 차례와 달라진 것) · 공격 위험
  function readMine(v, log, o) {
    const me = v.me, R = v.rules, h = v.hands[me];
    if (!h) return '';
    const opp = [];
    for (let q = 0; q < v.n; q++) if (q !== me && v.out[q] === 0) opp.push({ q, n: v.hands[q].length });
    if (!opp.length) return '';
    opp.sort((a, b) => a.n - b.n || a.q - b.q);
    const mine = h.length, minO = opp[0].n, gap = mine - minO;
    const verdict = minO <= 2 && gap >= 1 ? '쫓기는 중' : gap <= -3 ? '크게 앞서는 중' : gap <= -1 ? '앞서는 중' : gap >= 4 ? '뒤처진 중' : '접전';
    const shown = opp.slice(0, 3).map(x => `${nmOf(o, x.q)} ${x.n}장`);
    if (opp.length > 3) shown.push(`외 ${opp.length - 3}명`);
    let head = `내 패 ${mine}장 · ${shown.join(' · ')} — ${verdict}`;
    let then = null;                                                         // 내 지난 차례 시작 때와 비교
    for (let i = log.length - 1; i >= 0; i--) if (log[i].p === me && log[i].ph === 'play') { then = log[i]; break; }
    if (then) {
      const mt = Math.min.apply(null, opp.map(x => then.cB[x.q])), d = gap - (then.cB[me] - mt);
      if (d !== 0) head += ` (지난 차례보다 격차 ${d > 0 ? d + '장 벌어짐' : -d + '장 좁힘'})`;
    }
    const parts = [head];
    if (v.atk > 0) {
      const cnt = h.filter(c => G.canCounter(v, c)).length, blk = h.filter(c => G.canBlock(v, c) && !G.canCounter(v, c)).length;
      parts.push(`${v.atk}장 공격을 받는 중` + (cnt || blk ? ` (${[cnt ? `받아칠 카드 ${cnt}장` : '', blk ? `막을 3 ${blk}장` : ''].filter(Boolean).join(' · ')})` : ` — 받아칠 카드가 없어 ${v.atk}장 먹어요`));
    } else {
      const nAtk = h.filter(c => G.atkOf(c, R) > 0).length;
      if (nAtk) parts.push(`공격 카드 ${nAtk}장 들고 있어 막을 수 있어요`);
      else {
        const seen = new Set(v.pile.concat(h)); let u = 0;
        for (let c = 0; c < G.NB * v.decks; c++) if (G.atkOf(c, R) > 0 && !seen.has(c)) u++;
        parts.push(`공격 카드가 없어요${u ? ` (안 나온 공격 카드 ${u}장)` : ''}`);
      }
    }
    return parts.join(' · ');
  }

  function flow(v, o) {
    const me = v.me != null ? v.me : v.turn;
    const log = (o.log || []).filter(r => r.round === v.round);
    const tail = since(log, me);
    const w = Object.assign({}, v, { me });
    const rd = readMoves(w, log, tail, o);
    const nx = G.nextActive(v, me, 1);
    const st = nx >= 0 && nx !== me && rd.info.strong[nx] != null ? rd.info.strong[nx] : -1;
    return { read: rd.read, mine: readMine(w, log, o), info: rd.info, avoid: st };
  }

  // 👉 수의 의미: 이 카드(card, -1 = 먹기)를 내는 게 상대 흐름과 어떻게 이어지나 — 한 마디 (없으면 '')
  function tieFor(v, card, suit7, F, o) {
    const me = v.me != null ? v.me : v.turn, nx = G.nextActive(v, me, 1), I = F.info, R = v.rules, N = i => nmOf(o, i);
    if (card < 0) return v.atk > 0 && I.atkBy >= 0 && I.atkBy !== me ? `${N(I.atkBy)}의 공격이라 피할 수 없어요` : '';
    const su = suit7 != null ? suit7 : G.suitOf(card), st = G.atkOf(card, R), rk = G.rankOf(card);
    if (v.atk > 0 && I.atkBy >= 0 && I.atkBy !== me) {
      if (G.canCounter(v, card)) return `${N(I.atkBy)}의 ${v.atk}장 공격을 안 먹고 되돌려요`;
      if (G.canBlock(v, card)) return `${jo(N(I.atkBy), '이', '가')} 노린 ${v.atk}장을 안 먹어도 돼요`;
    }
    if (nx >= 0 && nx !== me) {
      const L = I.lacks[nx], S = I.strong[nx];
      if (L && su >= 0 && su === L.suit) return `${jo(N(nx), '이', '가')} ${sy(su)} 카드가 없어서 먹었어요 — ${sy(su)} 로 이어 가면 또 막히기 쉬워요`;
      if (S != null && S >= 0 && su >= 0) {
        if (su !== S) return `${sy(S)} 로 바꾼 ${jo(N(nx), '을', '를')} 피해 ${sy(su)} 로`;
        if (st === 0) return `${jo(N(nx), '이', '가')} ${sy(S)} 카드가 많은 듯해서 ${sy(S)} 로 이어 주게 되지만 다른 수보다 나아요`;
      }
    }
    const handled = st > 0 || (rk === G.R_J && R.jSkip) || (rk === G.R_Q && R.qRev);   // 이 카드가 위협을 직접 다루면 까닭에 이미 있음
    if (!handled && I.low.length) { const x = I.low[0]; return `${jo(N(x.q), '이', '가')} ${x.n}장이라 위험해요 — 막을 카드가 마땅치 않아 내 패부터 줄여요`; }
    return '';
  }
  // 까닭 글의 '다음 사람' 을 이름으로 (이/가 · 을/를 맞춰서)
  function nameNext(txt, nx, o) {
    if (nx < 0 || !txt) return txt;
    const n = nmOf(o, nx);
    return txt.replace(/다음 사람(이|을|에게|은|의)?/g, (m, j) => (!j ? n : j === '이' ? jo(n, '이', '가') : j === '을' ? jo(n, '을', '를') : j === '은' ? jo(n, '은', '는') : n + j));
  }

  // ── 🧑‍🏫 선생님: 지금 차례에 낼 카드 하나 + 한 줄 이유 ──────────
  // { a, card(-1 = 먹기), name, why, tag, suit(7이면 바꿀 무늬), byCard{카드: {tag, why, rank}} }
  function coach0(v, o, avoid) {
    o = o || {};
    const p = v.me != null ? v.me : v.turn;
    if (v.phase === 'suit') {
      const su = bestSuit(v.hands[p], avoid), k = suitCounts(v.hands[p])[su];
      return { a: G.A_SUIT + su, card: -1, suit: su, name: G.SUIT_SYM[su] + ' ' + G.SUIT_NAME[su], why: `내 손에 ${G.SUIT_SYM[su]}가 ${k}장으로 가장 많아요`, tag: '무늬', byCard: {} };
    }
    if (v.phase !== 'play') return null;
    const sc = scorePlay(v, p, avoid).sort((x, y) => y.sc - x.sc);
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
    if (v.rules.seven) for (const k in byCard) if (G.rankOf(+k) === G.R_7) { const after = v.hands[p].filter(x => x !== +k); byCard[k].suit = bestSuit(after, avoid); }   // 7 은 어느 것이든 '내면 바꿀 무늬'를 같이 (고른 카드 설명에도 씀)
    return { a: best.a, card, name: card >= 0 ? G.cardName(card) : (v.atk > 0 ? `${v.atk}장 받기` : '한 장 먹기'), why, tag: best.tag, byCard };
  }

  // 선생님 (바깥 입구): o.log · o.names 를 주면 👀 read · 📊 mine · 👉 mean 까지 붙여 줌 (안 주면 예전 그대로 — 복기 선생님)
  //   data.read = [{ q, name, rest, text }] · data.mine = '내 패 …' · data.mean = 추천 까닭 + 상대 흐름과 이어지는 말 · byCard[카드].mean 도 같음
  function coach(v, o) {
    o = o || {};
    const F = (o.log || o.names) && (v.phase === 'play' || v.phase === 'suit') ? flow(v, o) : null;
    const r = coach0(v, o, F ? F.avoid : -1);
    if (!r || !F) return r;
    const me = v.me != null ? v.me : v.turn, nx = G.nextActive(v, me, 1);
    const nn = t => nameNext(t, nx === me ? -1 : nx, o);
    r.why = nn(r.why);
    for (const k in r.byCard) r.byCard[k].why = nn(r.byCard[k].why);
    const mk = (why, card, suit7, tag) => { const t = tag === '끝내기' ? '' : tieFor(v, card, suit7, F, o); return t ? `${why} · ${t}` : why; };
    r.read = F.read; r.mine = F.mine;
    if (v.phase === 'suit') r.mean = r.why + (F.avoid >= 0 && F.avoid !== r.suit ? ` · ${sy(F.avoid)} 로 바꾼 ${jo(nmOf(o, nx), '을', '를')} 피해요` : '');
    else {
      r.mean = mk(r.why, r.card, r.card >= 0 && r.byCard[r.card] ? r.byCard[r.card].suit : null, r.tag);
      for (const k in r.byCard) r.byCard[k].mean = mk(r.byCard[k].why, +k, r.byCard[k].suit, r.byCard[k].tag);
    }
    return r;
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

  const API = { TIERS, CALL, choose, chooseNormal, chooseEasy, chooseHard, scorePlay, coach, record, since, race, callPlan, bestSuit, suitCounts, review, REVIEW };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.OneCardAI = API;
})(this);

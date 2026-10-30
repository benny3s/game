/* 바둑 AI (core.js API 만 씀 · 워커/Node 에서 돌림)
   - 신경망 있으면: 🐣 정책에서 뽑되 일부러 느슨하게 · 🐱 정책 상위 수 · 🐯 PUCT 수읽기(시간 예산)
   - 신경망 없으면(불러오기 실패·Node 빠른 시험): RAVE 몬테카를로 트리 탐색 + 가벼운 플레이아웃
   - 형세·사석 추정: 신경망 소유 지도(대칭 2개 평균) 또는 플레이아웃 평균
   - 무작위는 모두 씨앗(seed) 난수 → 같은 씨앗이면 같은 수 (시간 예산을 쓰는 🐯 만 빼고) */
(function (root) {
  "use strict";
  const Bd = root.Baduk || require("./core.js");
  const NNmod = root.BadukNN || (typeof require === "function" ? (() => { try { return require("./nn.js"); } catch (e) { return null; } })() : null);
  const { BLACK, WHITE, EMPTY } = Bd;
  const opp = c => 3 - c;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  let model = null;
  const setModel = m => { model = m; };
  const hasNN = () => !!(model && NNmod);

  // ── 신경망 평가 (상태 → 결과, 둘 사람 기준)
  function nnEval(st, sym = 0) { return NNmod.evaluate(model, NNmod.posFromState(st), { sym }); }
  function nnEvalPos(pos, sym = 0) { return NNmod.evaluate(model, pos, { sym }); }

  // 정책 상위 수 목록 [[점, 확률]...]
  function topMoves(pol, k, minP = 0) {
    const L = []; for (let p = 0; p < pol.length; p++) if (pol[p] > minP) L.push([p, pol[p]]);
    L.sort((a, b) => b[1] - a[1]); return L.slice(0, k);
  }
  function sample(list, rng, temp = 1) {
    const w = list.map(([, q]) => Math.pow(q, 1 / temp)); const s = w.reduce((a, b) => a + b, 0);
    let r = rng() * s; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i][0]; }
    return list[list.length - 1][0];
  }

  /* ── 신경망 수 고르기 ────────────────────────────────────── */
  // 🐣: 상위 수에서 뽑음(온도 높게) + 가끔 '그럴듯한 다른 수' — 느린 수·놓친 수 같은 알아볼 만한 실수
  // 🐱: 상위 몇 수에서 중간 온도로 · 🐯: PUCT 수읽기
  // 둘 다 바보 수(내 눈 메우기 · 돌 3개 이상 자충)는 거름 — 초보도 이상하다고 느끼는 실수라서
  const TIER = {
    easy: { temp: 1.4, top: 10, slack: 0.3, slackFrom: 1, slackTo: 6, safe: true },
    normal: { temp: 0.8, top: 8, slack: 0.12, slackFrom: 1, slackTo: 4, safe: true },
    hard: { search: true },
  };
  const SLACK_MAX = 0.45;
  // 두면 내 눈을 메우거나, 따내지도 못하고 내 돌 3개 이상이 단수가 되는 수
  function sillyMove(b, i, col) {
    if (b.isEye(i, col)) return true;
    let empties = 0;
    for (const d of b.adj) if (b.c[i + d] === EMPTY) empties++;
    if (empties >= 2) return false;
    const nb = b.clone(); nb.play(i, col);
    return !nb.lastCap.length && nb.libs(nb.head[i], 2) === 1 && nb.sz[nb.head[i]] >= 3;
  }
  function nnMove(st, opt) {
    const rng = Bd.mulberry32(opt.seed || 1), N = st.size, PASS = N * N;
    const tier = TIER[opt.tier] || TIER.normal;
    if (tier.search) return nnSearch(st, opt);
    const ev = nnEval(st, Math.floor(rng() * 8));
    let list = topMoves(ev.policy, tier.top, 0.0005);
    const passTop = list.length && list[0][0] === PASS;
    // 상대가 패스했고 신경망도 패스가 제일이면 패스 (끝내기)
    if (passTop && (st.passes >= 1 || list[0][1] > 0.6)) return { move: PASS, info: info(ev, st, "nn") };
    list = list.filter(([p]) => p !== PASS);
    if (tier.safe && list.length) {
      const b = Bd.toBoard(st);
      list = list.filter(([p]) => !sillyMove(b, b.ix(p), st.toPlay));   // 남은 게 바보 수뿐이면 패스
    }
    if (!list.length) return { move: PASS, info: info(ev, st, "nn") };
    // 고무줄: 많이 앞서면 느슨하게, 뒤지면 조금 더 진지하게 (사람과 판이 너무 벌어지지 않게)
    let slack = tier.slack, temp = tier.temp;
    if (opt.tier === "easy") {
      if (ev.lead > 6) { slack += 0.1; temp += tier.bandT1 != null ? tier.bandT1 : 0.4; }
      if (ev.lead > 15) { slack += 0.1; temp += tier.bandT2 != null ? tier.bandT2 : 0.6; }
      if (ev.lead < -5) { slack = Math.max(0.1, slack - 0.15); temp = Math.max(1, temp - 0.3); }
    } else if (opt.tier === "normal" && ev.lead > 10) { slack += 0.08; temp += 0.2; }
    // 급한 수(신경망이 확신: 단수 살리기·따내기)는 덜 놓침 — 큰 돌을 그냥 내주지 않게 (🐣 는 크게 앞설 땐 놓치기도)
    const top = list[0][1];
    if (top >= 0.5 && !(opt.tier === "easy" && ev.lead > (tier.urgentLead != null ? tier.urgentLead : 10))) { slack *= 0.3; temp = Math.min(temp, 1); }
    slack = Math.min(SLACK_MAX, slack);
    // 실수는 '그럴듯한 다른 수' 에서만 (확률이 너무 낮은 엉뚱한 수는 빼고)
    const pool = list.slice(tier.slackFrom, tier.slackTo).filter(([, q]) => q >= Math.max(0.01, 0.15 * top));
    const move = rng() < slack && pool.length ? pool[Math.floor(rng() * pool.length)][0] : sample(list, rng, temp);
    return { move, info: info(ev, st, "nn") };
  }
  function info(ev, st, src, extra) {
    const s = st.toPlay === BLACK ? 1 : -1;
    return { source: src, winB: s > 0 ? ev.winrate : 1 - ev.winrate, leadB: s * ev.lead, ...extra };
  }

  // 효용: 이김-짐 + 집 차이 조금 (이미 기운 판에서도 집을 늘리게)
  const utility = (ev, N) => (ev.win - ev.loss) + 0.2 * Math.tanh(ev.lead / (N * 0.7));

  // PUCT 수읽기: 마디마다 판 복사본 · 신경망으로 정책(사전 확률)과 가치
  function nnSearch(st, opt) {
    const N = st.size, NN = N * N, PASS = NN, rng = Bd.mulberry32((opt.seed || 1) * 7 + 3);
    const t0 = now(), timeMs = opt.timeMs != null ? opt.timeMs : 1500, maxVisits = opt.visits || 400, minVisits = opt.minVisits || 2;
    const rootPos = NNmod.posFromState(st);
    const baseMoves = rootPos.moves;
    const mk = (board, pla, move, parent, passes) => ({ board, pla, move, parent, passes, n: 0, w: 0, kids: null, pri: null, term: passes >= 2 });
    const root = mk(rootPos.board, st.toPlay, -2, null, st.passes);
    root.hist = [rootPos.prev1, rootPos.prev2];
    function expand(node, path) {
      // 위치 정보: 뿌리 기록 + 지나온 수, 1·2 수 전 판
      const moves = baseMoves.concat(path.map(n => [opp(n.pla), n.move]));
      const pb = path.length >= 1 ? (path.length >= 2 ? path[path.length - 2].board : root.board) : root.hist[0];
      const ppb = path.length >= 2 ? (path.length >= 3 ? path[path.length - 3].board : root.board) : (path.length === 1 ? root.hist[0] : root.hist[1]);
      const ev = nnEvalPos({ N, board: node.board, pla: node.pla, komi: st.komi, moves, prev1: pb, prev2: ppb, passes: node.passes }, Math.floor(rng() * 8));
      if (!node.term) {
        const L = topMoves(ev.policy, node === root ? 10 : 16, 0.001);
        node.pri = L; node.kids = new Array(L.length).fill(null);
      }
      node.ev = ev;
      return utility(ev, N);
    }
    function select(node) {
      const sq = Math.sqrt(Math.max(1, node.n)), fpu = (node.n ? -node.w / node.n : 0) - 0.25;   // 안 가 본 수: 부모 값 − 0.25
      let best = -1, bv = -1e9;
      for (let i = 0; i < node.pri.length; i++) {
        const k = node.kids[i], q = k && k.n ? k.w / k.n : fpu;
        const u = q + 1.25 * node.pri[i][1] * sq / (1 + (k ? k.n : 0));
        if (u > bv) { bv = u; best = i; }
      }
      return best;
    }
    // 뿌리 먼저
    const v0 = expand(root, []); root.n = 1; root.w = -v0;
    let visits = 0;
    while (visits < maxVisits && (visits < minVisits || now() - t0 < timeMs) && root.pri.length > 1) {
      const path = []; let node = root;
      while (node.kids && !node.term) {
        const i = select(node);
        if (i < 0) break;
        let k = node.kids[i];
        if (!k) {
          const mv = node.pri[i][0], b = node.board.clone();
          b.play(mv === PASS ? 0 : b.ix(mv), node.pla);
          k = node.kids[i] = mk(b, opp(node.pla), mv, node, mv === PASS ? node.passes + 1 : 0);
        }
        path.push(k); node = k;
        if (!k.n) break;
      }
      let v = node.n ? (node.ev ? utility(node.ev, N) : 0) : expand(node, path);
      // 되올리기: node 값(node.pla 기준) → 이 마디로 둔 사람 기준은 −v
      let cur = node, sign = -1;
      while (cur) { cur.n++; cur.w += sign * v; sign = -sign; cur = cur.parent; }
      visits++;
    }
    // 가장 많이 가 본 수 (같으면 사전 확률 큰 수)
    let bi = 0;
    for (let i = 1; i < root.pri.length; i++) {
      const a = root.kids[i], b = root.kids[bi], na = a ? a.n : 0, nb = b ? b.n : 0;
      if (na > nb || (na === nb && root.pri[i][1] > root.pri[bi][1])) bi = i;
    }
    let move = root.pri.length ? root.pri[bi][0] : PASS;
    // 상대가 패스하지 않았는데 패스는 확실할 때만
    if (move === PASS && st.passes === 0 && root.pri[bi][1] < 0.5 && root.pri.length > 1) {
      const alt = root.pri.findIndex(x => x[0] !== PASS); if (alt >= 0) move = root.pri[alt][0];
    }
    const k = root.kids[bi];
    return { move, info: info(root.ev, st, "nn-search", { visits, ms: Math.round(now() - t0), q: k && k.n ? k.w / k.n : null }) };
  }

  /* ── 신경망 없을 때: RAVE 몬테카를로 ─────────────────────── */
  // 가벼운 플레이아웃 수: 마지막 수 둘레의 단수 따내기·살리기 → 무작위(내 눈 메우기·큰 자충 빼고)
  function playoutMove(b, col, last, rng, buf) {
    const N = b.N, c = b.c;
    if (last > 0) {
      // 상대가 둔 돌 둘레: 단수 상대 돌 따내기 / 내 돌 단수면 달아나기
      for (const d of b.adj) {
        const j = last + d, v = c[j];
        if (v === opp(col)) { if (b.libs(b.head[j], 2) === 1) { const l = b.libList(b.head[j], buf)[0]; if (b.isLegal(l, col)) return l; } }
      }
      if (c[last] === opp(col)) {
        for (const d of b.adj) {
          const j = last + d;
          if (c[j] === col && b.libs(b.head[j], 2) === 1) {
            const l = b.libList(b.head[j], buf)[0];
            if (b.isLegal(l, col) && !selfAtari(b, l, col)) return l;
          }
        }
      }
    }
    for (let tries = 0; tries < 40; tries++) {
      const p = Math.floor(rng() * N * N), i = b.ix(p);
      if (c[i] === EMPTY && b.isLegal(i, col) && !b.isEye(i, col) && !selfAtari(b, i, col)) return i;
    }
    const cand = [];
    for (let p = 0; p < N * N; p++) { const i = b.ix(p); if (c[i] === EMPTY && b.isLegal(i, col) && !b.isEye(i, col)) cand.push(i); }
    if (!cand.length) return 0;
    const good = cand.filter(i => !selfAtari(b, i, col));
    const L = good.length ? good : cand;
    return L[Math.floor(rng() * L.length)];
  }
  // 두면 내 사슬이 활로 하나(자충)인데 따내는 것도 아니면 (둘 이상 돌이 엮일 때만)
  function selfAtari(b, i, col) {
    let empties = 0, friends = 0;
    for (const d of b.adj) {
      const j = i + d, v = b.c[j];
      if (v === EMPTY) empties++;
      else if (v === opp(col)) { if (b.libs(b.head[j], 2) === 1) return false; }
      else if (v === col) friends++;
    }
    if (empties >= 2) return false;
    if (!friends) return false;
    const nb = b.clone(); nb.play(i, col);
    return nb.libs(nb.head[i], 2) === 1;
  }
  function playout(b, col, rng, played) {
    const N = b.N, max = N * N * 2, buf = [];
    let passes = 0, last = 0, k = 0;
    while (passes < 2 && k++ < max) {
      const m = playoutMove(b, col, last, rng, buf);
      if (m) { b.play(m, col); passes = 0; if (played && !played[m]) played[m] = col; } else { b.play(0, col); passes++; }
      last = m; col = opp(col);
    }
  }
  // 면적 결과 (흑 기준 집 차이) + 칸 소유 (돌 · 한 색에 닿은 빈칸)
  function areaResult(b, komi, ownAcc) {
    const N = b.N; let sc = 0;
    for (let p = 0; p < N * N; p++) {
      const i = b.ix(p), v = b.c[i]; let o = 0;
      if (v === BLACK) o = 1; else if (v === WHITE) o = -1;
      else { let nb = 0, nw = 0; for (const d of b.adj) { const u = b.c[i + d]; if (u === BLACK) nb++; else if (u === WHITE) nw++; } o = nb && !nw ? 1 : nw && !nb ? -1 : 0; }
      sc += o; if (ownAcc) ownAcc[p] += o;
    }
    return sc - komi;
  }
  function mctsMove(st, opt = {}) {
    const N = st.size, NN = N * N, PASS = NN, rng = Bd.mulberry32(opt.seed || 1);
    const rootB = Bd.toBoard(st), col0 = st.toPlay, t0 = now();
    const maxPlayouts = opt.playouts || 2000, timeMs = opt.timeMs || 0;
    const newNode = () => ({ n: 0, w: 0, kids: null });
    const root = newNode();
    const movesOf = (b, col) => {
      const L = [];
      for (let p = 0; p < NN; p++) { const i = b.ix(p); if (b.c[i] === EMPTY && b.isLegal(i, col) && !b.isEye(i, col)) L.push(i); }
      L.push(0);                                                      // 패스
      return L;
    };
    const K = 600;                                                    // RAVE 동등값
    let n = 0;
    while (n < maxPlayouts && (!timeMs || now() - t0 < timeMs)) {
      const b = rootB.clone(), path = [root]; let node = root, col = col0, passes = st.passes;
      const played = new Int8Array(b.A);
      while (node.kids && node.n > 0 && passes < 2) {
        // RAVE 섞은 UCT
        let best = null, bv = -1e9;
        const ln = Math.log(node.n + 1);
        for (const k of node.kids) {
          const q = k.n ? k.w / k.n : 0.5, aq = k.an ? k.aw / k.an : 0.5, beta = Math.sqrt(K / (3 * (k.n + 1) + K));
          const v = (1 - beta) * q + beta * aq + 0.35 * Math.sqrt(ln / (k.n + 1)) + (k.prior || 0) / (k.n + 1);
          if (v > bv) { bv = v; best = k; }
        }
        b.play(best.m, col); if (best.m && !played[best.m]) played[best.m] = col;
        passes = best.m ? 0 : passes + 1;
        col = opp(col); node = best; path.push(node);
      }
      if (!node.kids && passes < 2 && (node === root || node.n >= 2)) {   // 두 번째 방문부터 펼침 (기억 아끼기)
        node.kids = movesOf(b, col).map(m => ({ m, n: 0, w: 0, an: 0, aw: 0, kids: null, prior: m === 0 ? -0.3 : priorOf(b, m, col) }));
      }
      playout(b, col, rng, played);
      const scoreB = areaResult(b, st.komi);
      // 되올리기: 각 마디 값 = 그 마디로 둔 사람이 이겼는가
      for (let d = 0; d < path.length; d++) {
        const nd = path[d], mover = d === 0 ? opp(col0) : (d % 2 === 1 ? col0 : opp(col0));
        const win = (scoreB > 0) === (mover === BLACK) ? 1 : 0;
        nd.n++; nd.w += win;
        if (nd.kids) {                                                // RAVE: 이 마디 다음 사람이 나중에 둔 수
          const toMove = opp(mover), wv = (scoreB > 0) === (toMove === BLACK) ? 1 : 0;
          for (const k of nd.kids) if (k.m && played[k.m] === toMove) { k.an++; k.aw += wv; }
        }
      }
      n++;
    }
    let best = null;
    for (const k of root.kids || []) if (!best || k.n > best.n) best = k;
    const m = best ? best.m : 0;
    const winB = best && best.n ? (col0 === BLACK ? best.w / best.n : 1 - best.w / best.n) : 0.5;
    // 상대가 패스했고 이기고 있으면 패스 (끝내기)
    if (st.passes >= 1 && best && (col0 === BLACK ? winB : 1 - winB) > 0.85 && quietBoard(rootB, col0)) return { move: PASS, info: { source: "mcts", winB, playouts: n } };
    return { move: m ? rootB.pt(m) : PASS, info: { source: "mcts", winB, playouts: n } };
  }
  // 따내기·단수 피하기 같은 수에 가산점
  function priorOf(b, i, col) {
    let pr = 0;
    for (const d of b.adj) {
      const j = i + d, v = b.c[j];
      if (v === opp(col) && b.libs(b.head[j], 2) === 1) pr += 0.4;
      else if (v === col && b.libs(b.head[j], 2) === 1) pr += 0.25;
    }
    const N = b.N, p = b.pt(i), x = p % N, y = (p / N) | 0, e = Math.min(x, y, N - 1 - x, N - 1 - y);
    if (e === 0) pr -= 0.15;
    if (selfAtari(b, i, col)) pr -= 0.3;
    return pr;
  }
  // 둘 만한 곳이 없을 만큼 정리된 판인지 (단수 돌 없음)
  function quietBoard(b, col) {
    for (let p = 0; p < b.N * b.N; p++) { const i = b.ix(p); if ((b.c[i] === BLACK || b.c[i] === WHITE) && b.libs(b.head[i], 2) === 1) return false; }
    return true;
  }

  /* ── 공개 API ────────────────────────────────────────────── */
  // 수 고르기: 신경망이 있으면 신경망, 없으면 몬테카를로 (시간 예산은 🐯 만 의미 있음)
  function chooseMove(st, opt = {}) {
    if (st.over) return { move: st.size * st.size, info: {} };
    if (hasNN() && !opt.noNN) return nnMove(st, opt);
    const play = { easy: 250, normal: 1500, hard: 6000 }[opt.tier] || 1500;
    return mctsMove(st, { seed: opt.seed, playouts: opt.playouts || play, timeMs: opt.tier === "hard" ? (opt.timeMs || 1500) : 0 });
  }
  // 형세: 흑 기준 소유(+1 흑 ~ −1 백) · 집 차이 · 이길 확률
  function analyze(st, opt = {}) {
    const N = st.size, NN = N * N;
    if (hasNN() && !opt.noNN) {
      const a = nnEval(st, 0), b = nnEval(st, 5), s = st.toPlay === BLACK ? 1 : -1;
      const own = new Float32Array(NN); for (let p = 0; p < NN; p++) own[p] = s * (a.own[p] + b.own[p]) / 2;
      const pol = new Float32Array(NN + 1); for (let p = 0; p <= NN; p++) pol[p] = (a.policy[p] + b.policy[p]) / 2;
      return { own, leadB: s * (a.lead + b.lead) / 2, winB: s > 0 ? (a.winrate + b.winrate) / 2 : 1 - (a.winrate + b.winrate) / 2, top: topMoves(pol, 5), source: "nn" };
    }
    return ownershipMC(st, opt.playouts || 200, opt.seed || 1);
  }
  function ownershipMC(st, n, seed) {
    const N = st.size, NN = N * N, rng = Bd.mulberry32(seed), acc = new Float32Array(NN), b0 = Bd.toBoard(st);
    let wins = 0, sum = 0;
    for (let k = 0; k < n; k++) {
      const b = b0.clone(); playout(b, k % 2 ? opp(st.toPlay) : st.toPlay, rng, null);
      const sc = areaResult(b, st.komi, acc); sum += sc; if (sc > 0) wins++;
    }
    for (let p = 0; p < NN; p++) acc[p] /= n;
    return { own: acc, leadB: sum / n, winB: wins / n, top: [], source: "mc" };
  }
  // 사석 추정: 사슬마다 평균 소유가 자기 색 반대 쪽으로 기울면 죽은 돌 (Uint8Array N*N)
  function guessDead(st, opt = {}) {
    const N = st.size, NN = N * N, an = opt.analysis || analyze(st, opt), dead = new Uint8Array(NN), seen = new Uint8Array(NN);
    for (let p = 0; p < NN; p++) {
      const col = st.board[p]; if (!col || seen[p]) continue;
      const g = Bd.group(st, p); let s = 0; for (const q of g) { seen[q] = 1; s += an.own[q]; }
      const avg = s / g.length, mine = col === BLACK ? avg : -avg;
      if (mine < -0.35) for (const q of g) dead[q] = 1;
    }
    return { dead, analysis: an };
  }
  // 힌트: 🐯 수준으로 한 수 (짧게)
  function hint(st, opt = {}) {
    if (hasNN()) {
      const r = nnSearch(st, { seed: opt.seed || 5, timeMs: opt.timeMs != null ? opt.timeMs : 900, minVisits: 2 });
      return r;
    }
    return mctsMove(st, { seed: opt.seed || 5, playouts: 3000 });
  }

  const API = { setModel, hasNN, chooseMove, analyze, guessDead, hint, mctsMove, nnMove, nnSearch, ownershipMC, TIER };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.BadukAI = API;
})(this);

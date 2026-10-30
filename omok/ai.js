/* 오목 AI — 코어(Omok)의 규칙 함수만 써서 수를 읽음 (웹 워커 · Node 공용, 판 15줄)
   · 칸마다 4방향 '11칸 창' 번호(밑 3: 빈칸 0 · 내 돌 1 · 막힘 2)를 들고 있다가, 돌 하나 놓으면 주변 40칸만 고침
     → 줄 모양(다섯 · 열린 사 · 사 · 열린 삼 …)은 표 찾기 한 번
   · 수 읽기: 알파베타(PVS) + 반복 심화 + 치환표 + 킬러/히스토리 + 위협 가지치기(상대 열린 삼엔 막기·사만)
   · 위협 읽기: VCF(사만으로 이기기) · VCT(사·열린 삼으로 이기기) — 내 공격에도, 상대 공격을 미리 끊는 데도 씀
   · 난이도: easy 초급 · normal 중급 · hard 고급. 노드 수로 세기를 맞추고(기기마다 같은 세기), 느린 폰을 위해 시간 상한도 둠 */
(function (root) {
  'use strict';
  const Omok = root.Omok || (typeof require === 'function' ? require('./core.js') : null);

  const N = 15, NN = N * N, CENTER = 7 * N + 7;
  const DX = [1, 0, 1, 1], DY = [0, 1, 1, -1];
  const OFF = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683];
  // 한 방향 줄 모양 (그 칸에 두었을 때)
  const NONE = 0, ONE = 1, TWO = 2, OPEN2 = 3, THREE = 4, OPEN3 = 5, FOUR = 6, D4 = 7, OPEN4 = 8, FIVE = 9, OVER = 10;
  // 칸 등급 (네 방향을 합친 것)
  const K_NONE = 0, K_3 = 1, K_33 = 2, K_4 = 3, K_43 = 4, K_O4 = 5, K_WIN = 6;
  // 방향 하나의 가치 · 조합 덤
  const W = [0, 2, 8, 22, 24, 90, 110, 900, 900, 5000, 0];
  const B_O4 = 2500, B_43 = 900, B_33 = 500;
  const WINV = 1000000, INF = 2000000000, MATE = WINV - 1000;
  const MAXPLY = 64;

  const now = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();

  // nodes = 탐색 노드 예산(세기) · timeMs = 시간 상한(느린 기기 보호) · vcf/vct = [깊이, 노드] · opp* = 상대 위협 막기
  // 중급은 사람 흉내 봇(꼼꼼한 초보 P1 · 짧은 VCF 까지 보는 P2)에게 15% · 38% 쯤 지도록 맞춤 (예전엔 0% · 10%, 너무 셌음)
  //  slip = 상대 수읽기를 건너뛰는 확률 → 사람처럼 가끔 큰 그림을 놓침. 고급과는 데스크톱 · 느린 폰(시간 1/3) 모두 16:4
  const TIERS = {
    easy: { easy: true, timeMs: 300, blind: 0.3 },
    normal: { nodes: 2000, timeMs: 800, maxDepth: 2, rootBeam: 10, beam: 6, minBeam: 3, vcf: [8, 1200], oppVcf: [4, 300], slip: 0.3, noise: 50 },
    hard: { nodes: 260000, timeMs: 1250, maxDepth: 24, rootBeam: 20, beam: 12, minBeam: 6, vcf: [30, 30000], oppVcf: [30, 12000],
      vct: [9, 60000], oppVct: [5, 6000], safeNodes: 2500, noise: 12, k43: true, renju: { oppVct: [8, 20000], safeNodes: 4000 } },
  };

  // ── 줄 모양 표: 가운데에 내 돌을 놓았다고 보고 이웃 10칸으로 등급을 정함 (정확히 다섯 / 다섯 이상 두 벌) ──
  function buildTable(exact) {
    const T = new Int8Array(59049).fill(-1);
    const isFive = n => exact ? n === 5 : n >= 5;
    const run = L => { let n = 1; for (let i = 6; i < 11 && L[i] === 1; i++) n++; for (let i = 4; i >= 0 && L[i] === 1; i--) n++; return n; };
    function cls(key) {
      if (T[key] >= 0) return T[key];
      const L = new Int8Array(11);
      for (let i = 0, k = key; i < 10; i++) { const v = k % 3; k = (k - v) / 3; L[i < 5 ? i : i + 1] = v; }
      L[5] = 1;
      const r = run(L);
      let res;
      if (isFive(r)) res = FIVE;
      else if (r > 5) res = OVER;                                   // 정확히 다섯 규칙의 장목
      else {
        let ne = 0, e1 = -1, e2 = -1;
        for (let i = 1; i <= 9; i++) {                                 // 다섯을 만드는 빈칸(완성점)
          if (i === 5 || L[i] !== 0) continue;
          L[i] = 1; const n = run(L); L[i] = 0;
          if (isFive(n)) { if (!ne) e1 = i; else e2 = i; ne++; }
        }
        if (ne >= 2) res = (ne === 2 && e2 - e1 === 5) ? OPEN4 : D4;  // 열린 사 / 한 줄 사사
        else if (ne === 1) res = FOUR;
        else {
          res = NONE;
          for (let i = 1; i <= 9 && res < OPEN3; i++) {               // 한 수 더 두면 무엇이 되나
            if (i === 5 || L[i] !== 0) continue;
            const c2 = cls(key + POW3[i < 5 ? i : i - 1]);
            const v = c2 === OPEN4 ? OPEN3 : (c2 === FOUR || c2 === D4) ? THREE : c2 === OPEN3 ? OPEN2 : c2 === THREE ? TWO : (c2 === TWO || c2 === OPEN2) ? ONE : NONE;
            if (v > res) res = v;
          }
        }
      }
      T[key] = res;
      return res;
    }
    for (let k = 0; k < 59049; k++) cls(k);
    return new Uint8Array(T.buffer);
  }
  let T_EXACT = null, T_LOOSE = null;
  const table = exact => exact ? (T_EXACT || (T_EXACT = buildTable(true))) : (T_LOOSE || (T_LOOSE = buildTable(false)));

  // 네 방향 조합표 (11^4): 칸 등급 · 점수 · 금수 의심
  const comboCls = new Uint8Array(14641), comboScore = new Int32Array(14641), comboBonus = new Int32Array(14641);
  const sus33 = new Uint8Array(14641), susAll = new Uint8Array(14641), susNone = new Uint8Array(14641);
  for (let t = 0; t < 14641; t++) {
    const a = [((t / 1331) | 0) % 11, ((t / 121) | 0) % 11, ((t / 11) | 0) % 11, t % 11];
    let n5 = 0, n4 = 0, nO4 = 0, nD4 = 0, n3 = 0, nOv = 0, w = 0;
    for (const x of a) { w += W[x]; if (x === FIVE) n5++; else if (x === OPEN4) nO4++; else if (x === D4) nD4++; else if (x === FOUR) n4++; else if (x === OPEN3) n3++; else if (x === OVER) nOv++; }
    let k = K_NONE;
    if (n5) k = K_WIN;
    else if (nO4 || nD4 || n4 >= 2) k = K_O4;
    else if (n4 === 1 && n3 >= 1) k = K_43;
    else if (n4 === 1) k = K_4;
    else if (n3 >= 2) k = K_33;
    else if (n3 === 1) k = K_3;
    const bonus = k === K_O4 ? B_O4 : k === K_43 ? B_43 : k === K_33 ? B_33 : 0;
    comboCls[t] = k; comboScore[t] = w + bonus; comboBonus[t] = bonus;
    sus33[t] = !n5 && n3 >= 2 ? 1 : 0;                                               // 쌍삼 금지: 삼삼 의심
    susAll[t] = !n5 && (nOv > 0 || nD4 > 0 || n4 + nO4 >= 2 || n3 >= 2) ? 1 : 0;      // 렌주 흑: 삼삼·사사·장목 의심
  }

  // ── 엔진 상태 (워커 하나에 엔진 하나: 모듈 변수가 가장 빠름) ──
  const board = new Int8Array(NN);
  const keyA = [null, new Int32Array(NN * 4), new Int32Array(NN * 4)];   // keyA[c]: c 입장의 창 번호
  const UPD = new Int16Array(NN * 40), UPK = new Int8Array(40), UPW = new Int32Array(40);
  const INIT = new Int32Array(NN * 4);
  const NEAR = new Int16Array(NN * 24), NEARN = new Uint8Array(NN), near = new Int16Array(NN);
  const sc = [null, new Int32Array(NN), new Int32Array(NN)];
  const cl = [null, new Uint8Array(NN), new Uint8Array(NN)];
  const sus = [null, new Uint8Array(NN), new Uint8Array(NN)];
  const cnt = [null, new Int32Array(8), new Int32Array(8)];
  const total = [0, 0, 0];
  const tabC = [null, null, null], susC = [null, susNone, susNone], restr = [false, false, false];
  const stack = new Int16Array(NN + 1);
  const ZLO = [null, new Int32Array(NN), new Int32Array(NN)], ZHI = [null, new Int32Array(NN), new Int32Array(NN)];
  const mark = new Int32Array(NN), dirty = new Int16Array(48);
  let nst = 0, hLo = 0, hHi = 0, stamp = 0, rule = '';

  (function init() {
    for (let j = 0; j < 40; j++) { UPK[j] = (j / 10) | 0; UPW[j] = POW3[j % 10]; }
    for (let p = 0; p < NN; p++) {
      const px = p % N, py = (p / N) | 0;
      for (let d = 0; d < 4; d++) {
        let key = 0;
        for (let di = 0; di < 10; di++) {
          const o = OFF[di];
          const qx = px - o * DX[d], qy = py - o * DY[d];             // p 가 바뀌면 창 번호가 바뀌는 칸 q (q 에서 o 만큼 가면 p)
          UPD[p * 40 + d * 10 + di] = (qx >= 0 && qy >= 0 && qx < N && qy < N) ? qy * N + qx : -1;
          const nx = px + o * DX[d], ny = py + o * DY[d];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) key += 2 * POW3[di];   // 판 밖 = 막힘
        }
        INIT[p * 4 + d] = key;
      }
      let k = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        const x = px + dx, y = py + dy;
        if (x >= 0 && y >= 0 && x < N && y < N) NEAR[p * 24 + k++] = y * N + x;
      }
      NEARN[p] = k;
    }
    let seed = 0x2545F491;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) | 0; };
    for (let c = 1; c <= 2; c++) for (let i = 0; i < NN; i++) { ZLO[c][i] = rnd(); ZHI[c][i] = rnd(); }
  })();

  function setRule(r) {
    rule = r;
    for (let c = 1; c <= 2; c++) {
      tabC[c] = table(Omok.exactFive(r, c));
      const b = Omok.bans(r, c);
      susC[c] = !b ? susNone : b.b44 ? susAll : sus33;
      restr[c] = !!b;
    }
    ttClear();
  }
  // 빈칸 q 의 두 색 등급을 계산해 합계에 더함 / 뺌
  function addCell(q) {
    const b = q << 2;
    for (let c = 1; c <= 2; c++) {
      const T = tabC[c], K = keyA[c];
      const t = ((T[K[b]] * 11 + T[K[b | 1]]) * 11 + T[K[b | 2]]) * 11 + T[K[b | 3]];
      const k = comboCls[t], su = susC[c][t], v = su ? comboScore[t] - comboBonus[t] : comboScore[t];
      sc[c][q] = v; cl[c][q] = k; sus[c][q] = su;
      total[c] += v; cnt[c][k]++;
    }
  }
  function delCell(q) { total[1] -= sc[1][q]; cnt[1][cl[1][q]]--; total[2] -= sc[2][q]; cnt[2][cl[2][q]]--; }

  function place(p, c) {
    delCell(p);
    board[p] = c; stack[nst++] = p;
    hLo ^= ZLO[c][p]; hHi ^= ZHI[c][p];
    const v1 = c === 1 ? 1 : 2, v2 = 3 - v1, K1 = keyA[1], K2 = keyA[2], base = p * 40;
    let nd = 0; stamp++;
    for (let j = 0; j < 40; j++) {
      const q = UPD[base + j]; if (q < 0) continue;
      const kk = (q << 2) | UPK[j], pw = UPW[j];
      K1[kk] += v1 * pw; K2[kk] += v2 * pw;
      if (board[q] === 0 && mark[q] !== stamp) { mark[q] = stamp; dirty[nd++] = q; }
    }
    for (let i = 0; i < nd; i++) { delCell(dirty[i]); addCell(dirty[i]); }
    const nb = p * 24;
    for (let i = NEARN[p] - 1; i >= 0; i--) near[NEAR[nb + i]]++;
  }
  function unplace() {
    const p = stack[--nst], c = board[p];
    board[p] = 0;
    hLo ^= ZLO[c][p]; hHi ^= ZHI[c][p];
    const v1 = c === 1 ? 1 : 2, v2 = 3 - v1, K1 = keyA[1], K2 = keyA[2], base = p * 40;
    let nd = 0; stamp++;
    for (let j = 0; j < 40; j++) {
      const q = UPD[base + j]; if (q < 0) continue;
      const kk = (q << 2) | UPK[j], pw = UPW[j];
      K1[kk] -= v1 * pw; K2[kk] -= v2 * pw;
      if (board[q] === 0 && mark[q] !== stamp) { mark[q] = stamp; dirty[nd++] = q; }
    }
    for (let i = 0; i < nd; i++) { delCell(dirty[i]); addCell(dirty[i]); }
    addCell(p);
    const nb = p * 24;
    for (let i = NEARN[p] - 1; i >= 0; i--) near[NEAR[nb + i]]--;
  }
  function load(st) {
    if (st.size !== N) throw new Error('omok ai: 15줄 판만 지원');
    if (st.rule !== rule) setRule(st.rule);
    board.fill(0); near.fill(0); nst = 0; hLo = 0; hHi = 0;
    keyA[1].set(INIT); keyA[2].set(INIT);
    cnt[1].fill(0); cnt[2].fill(0); total[1] = total[2] = 0;
    for (let q = 0; q < NN; q++) addCell(q);
    const seen = new Uint8Array(NN);
    for (const m of st.moves || []) if (st.board[m] && !seen[m]) { seen[m] = 1; place(m, st.board[m]); }
    for (let q = 0; q < NN; q++) if (st.board[q] && !seen[q]) place(q, st.board[q]);   // 수순 없는 판도 받음
  }

  // ── 금수 확인 (의심 칸만 코어로 정확히, 결과는 작은 표에 기억) ──
  const FC_BITS = 15, FC_MASK = (1 << FC_BITS) - 1;
  const fcLo = new Int32Array(1 << FC_BITS), fcHi = new Int32Array(1 << FC_BITS), fcQ = new Int16Array(1 << FC_BITS).fill(-1), fcV = new Int8Array(1 << FC_BITS);
  function forbidden(c, q) {
    if (!restr[c]) return 0;
    const lo = hLo ^ Math.imul(q + 1, 0x9E3779B1) ^ (c << 30), slot = lo & FC_MASK;
    if (fcQ[slot] === q && fcLo[slot] === lo && fcHi[slot] === (hHi ^ c)) return fcV[slot];
    const v = Omok.forbiddenAt(board, N, q, c, rule);
    fcQ[slot] = q; fcLo[slot] = lo; fcHi[slot] = hHi ^ c; fcV[slot] = v;
    return v;
  }
  const legal = (c, q) => board[q] === 0 && (!sus[c][q] || forbidden(c, q) === 0);

  // c 가 다섯을 만드는 빈칸 모으기 (최대 max 개)
  function fiveCellsAll(c, out, max) {
    if (!cnt[c][K_WIN]) return 0;
    let n = 0; const C = cl[c];
    for (let q = 0; q < NN && n < max; q++) if (board[q] === 0 && C[q] === K_WIN) out[n++] = q;
    return n;
  }
  // 방금 둔 p 를 지나는 줄에서만 찾기 (VCF 용, 빠름)
  function fiveCellNear(c, p) {
    const x = p % N, y = (p / N) | 0, C = cl[c];
    for (let d = 0; d < 4; d++) for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const i = x + k * DX[d], j = y + k * DY[d];
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const q = j * N + i;
      if (board[q] === 0 && C[q] === K_WIN) return q;
    }
    const tmp = [0]; return fiveCellsAll(c, tmp, 1) ? tmp[0] : -1;
  }
  function firstLegal(c, k) {
    if (!cnt[c][k]) return -1;
    const C = cl[c];
    for (let q = 0; q < NN; q++) if (board[q] === 0 && C[q] === k && legal(c, q)) return q;
    return -1;
  }
  // c 가 사(또는 그 이상)를 만들 수 있는 칸이 하나도 없나
  const noFours = c => cnt[c][K_4] + cnt[c][K_43] + cnt[c][K_O4] + cnt[c][K_WIN] === 0;
  // 상대(c)가 다음 수에 정말 열린 사(또는 사사)를 만들 수 있나
  const realO4 = c => cnt[c][K_O4] > 0 && firstLegal(c, K_O4) >= 0;

  // ── 치환표 ──
  const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttHi = new Int32Array(TT_SIZE), ttLo = new Int32Array(TT_SIZE), ttVal = new Int32Array(TT_SIZE), ttMove = new Int16Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  const T_EXACT_F = 1, T_LOWER = 2, T_UPPER = 3;
  function ttClear() { ttFlag.fill(0); fcQ.fill(-1); vfGen++; vtGen++; }

  // ── 탐색 상태 ──
  let nodes = 0, nodeLimit = Infinity, deadline = 0, aborted = false, noiseAmp = 0, noiseSeed = 0;
  let beamCfg = { rootBeam: 20, beam: 12, minBeam: 6, k43: false };
  const killers = new Int16Array(MAXPLY * 2 + 4).fill(-1);
  const hist = [null, new Int32Array(NN), new Int32Array(NN)];
  const moveBuf = [], packBuf = [];
  for (let i = 0; i <= MAXPLY + 2; i++) { moveBuf.push(new Int16Array(NN)); packBuf.push(new Int32Array(NN)); }
  const tmpF = new Int16Array(4), tmpF2 = new Int16Array(4);
  let spent = 0;                                                       // 이번 수에 쓴 노드 (VCF·VCT 포함)

  function evaluate(s) {
    const o = 3 - s;
    let v = total[s] - ((total[o] * 14) >> 4);
    if (noiseAmp) v += ((Math.imul(hLo ^ noiseSeed, 0x9E3779B1) >>> 20) % (2 * noiseAmp + 1)) - noiseAmp;
    return v > 200000 ? 200000 : v < -200000 ? -200000 : v;
  }

  // 후보 수: 돌에서 두 칸 안. 상대가 열린 사를 노리면 '내 사 · 상대 사 자리(막기)'만
  function genMoves(s, ply, out, ttm, beam) {
    const o = 3 - s, pk = packBuf[ply];
    const threat = realO4(o);
    const A = cl[s], B = cl[o], SA = sc[s], SB = sc[o], H = hist[s], SU = sus[o];
    const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    let n = 0;
    for (let q = 0; q < NN; q++) {
      if (board[q] !== 0 || near[q] === 0) continue;
      const a = A[q], b = B[q];
      if (threat && a < K_4 && b < K_4) continue;
      let v;
      if (q === ttm) v = 4000000;
      else {
        v = SA[q] + ((SB[q] * 7) >> 3) + (H[q] > 400000 ? 100000 : H[q] >> 2);
        if (a === K_43) v += 3000000;
        else if (b === K_O4 && !SU[q]) v += 2500000;
        else if (a === K_33) v += 2000000;
        else if (b === K_43 && !SU[q]) v += 1500000;
        else if (b === K_33 && !SU[q]) v += 1000000;
        else if (a === K_4) v += 150000;
        if (q === k1 || q === k2) v += 300000;
        if (v > 4194303) v = 4194303;
      }
      pk[n++] = (v << 8) | q;
    }
    const arr = pk.subarray(0, n); arr.sort();
    const lim = threat ? n : beam, SS = sus[s];
    let m = 0;
    for (let i = n - 1; i >= 0 && m < lim; i--) {
      const q = arr[i] & 255;
      if (SS[q] && forbidden(s, q)) continue;
      out[m++] = q;
    }
    return m;
  }

  function negamax(depth, alpha, beta, ply, s) {
    if (++nodes >= nodeLimit || ((nodes & 1023) === 0 && now() > deadline)) { aborted = true; return 0; }
    const o = 3 - s;
    if (cnt[s][K_WIN] > 0) return WINV - ply;                          // 다음 수에 다섯
    if (cnt[o][K_WIN] > 0) {                                            // 상대 사: 막을 수밖에 (깊이 안 줄임)
      if (fiveCellsAll(o, tmpF, 2) >= 2) return -(WINV - ply - 1);
      const q = tmpF[0];
      if (sus[s][q] && forbidden(s, q)) return -(WINV - ply - 1);         // 막을 자리가 금수
      if (ply >= MAXPLY) return evaluate(s);
      place(q, s);
      const v = -negamax(depth, -beta, -alpha, ply + 1, o);
      unplace();
      return v;
    }
    if (cnt[s][K_O4] > 0 && firstLegal(s, K_O4) >= 0) return WINV - ply - 2;   // 열린 사 → 이김
    // 사삼인데 상대에게 사가 하나도 없으면 이김 (금수가 없는 쪽만: 삼을 늘리는 자리가 막힐 일이 없음)
    if (beamCfg.k43 && !restr[s] && cnt[s][K_43] > 0 && noFours(o) && firstLegal(s, K_43) >= 0) return WINV - ply - 4;
    if (depth <= 0 || ply >= MAXPLY) return evaluate(s);

    const slot = hLo & TT_MASK;
    let ttm = -1;
    if (ttFlag[slot] && ttHi[slot] === hHi && ttLo[slot] === hLo) {
      ttm = ttMove[slot];
      if (ttDepth[slot] >= depth) {
        let v = ttVal[slot];
        if (v > MATE) v -= ply; else if (v < -MATE) v += ply;
        const f = ttFlag[slot];
        if (f === T_EXACT_F || (f === T_LOWER && v >= beta) || (f === T_UPPER && v <= alpha)) return v;
      }
    }
    const list = moveBuf[ply];
    const beam = Math.max(beamCfg.minBeam, beamCfg.beam - (ply >> 1));
    const n = genMoves(s, ply, list, ttm, beam);
    if (!n) return 0;
    const a0 = alpha;
    let best = -INF, bestMove = -1;
    for (let i = 0; i < n; i++) {
      const q = list[i];
      place(q, s);
      let v;
      if (i === 0) v = -negamax(depth - 1, -beta, -alpha, ply + 1, o);
      else {
        v = -negamax(depth - 1, -alpha - 1, -alpha, ply + 1, o);
        if (v > alpha && v < beta && !aborted) v = -negamax(depth - 1, -beta, -alpha, ply + 1, o);
      }
      unplace();
      if (aborted) return 0;
      if (v > best) {
        best = v; bestMove = q;
        if (v > alpha) {
          alpha = v;
          if (v >= beta) {
            if (killers[ply * 2] !== q) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = q; }
            hist[s][q] += depth * depth;
            break;
          }
        }
      }
    }
    let sv = best;
    if (sv > MATE) sv += ply; else if (sv < -MATE) sv -= ply;
    if (ttFlag[slot] === 0 || ttDepth[slot] <= depth || ttLo[slot] !== hLo) {
      ttHi[slot] = hHi; ttLo[slot] = hLo; ttVal[slot] = sv; ttMove[slot] = bestMove; ttDepth[slot] = depth;
      ttFlag[slot] = best <= a0 ? T_UPPER : best >= beta ? T_LOWER : T_EXACT_F;
    }
    return best;
  }

  // ── VCF: 사만 계속 두어 이기는 길 찾기 (막는 쪽 응수는 하나뿐이라 빠름) ──
  const VF_BITS = 16, VF_MASK = (1 << VF_BITS) - 1;
  const vfLo = new Int32Array(1 << VF_BITS), vfHi = new Int32Array(1 << VF_BITS), vfDepth = new Int8Array(1 << VF_BITS), vfG = new Int32Array(1 << VF_BITS);
  let vfGen = 1, vcfNodes = 0, vcfLimit = 0, vcfOut = false, vbest = null;
  const vpath = new Int16Array(512); let vlen = 0;
  const vcfBuf = []; for (let i = 0; i < 90; i++) vcfBuf.push(new Int32Array(NN));
  function vcf(att, left, lvl) {
    if (++vcfNodes > vcfLimit || ((vcfNodes & 127) === 0 && now() > deadline)) { vcfOut = true; return false; }
    const def = 3 - att;
    if (cnt[att][K_WIN] > 0) { vbest = Array.from(vpath.subarray(0, vlen)); const q = fiveCellNear(att, vlen ? vpath[vlen - 1] : CENTER); if (q >= 0) vbest.push(q); return true; }
    if (lvl >= vcfBuf.length - 1) return false;
    const lo = hLo ^ (att << 29), slot = lo & VF_MASK;
    if (vfG[slot] === vfGen && vfLo[slot] === lo && vfHi[slot] === hHi && vfDepth[slot] >= left) return false;
    const pk = vcfBuf[lvl];
    let n = 0;
    if (cnt[def][K_WIN] > 0) {                                          // 상대 사부터 막아야 함: 그 자리가 내 사여야 계속
      if (fiveCellsAll(def, tmpF, 2) >= 2) return false;
      const q = tmpF[0];
      if (cl[att][q] < K_4) return false;
      pk[n++] = q;
    } else {
      if (left <= 0) return false;
      const A = cl[att], S = sc[att];
      for (let q = 0; q < NN; q++) {
        if (board[q] !== 0 || near[q] === 0 || A[q] < K_4) continue;
        let v = A[q] * 100000 + S[q]; if (v > 4194303) v = 4194303;
        pk[n++] = (v << 8) | q;
      }
      pk.subarray(0, n).sort();
      for (let i = 0, j = n - 1; i < j; i++, j--) { const t = pk[i]; pk[i] = pk[j]; pk[j] = t; }   // 큰 것부터
      for (let i = 0; i < n; i++) pk[i] &= 255;
    }
    for (let i = 0; i < n; i++) {
      const q = pk[i];
      if (!legal(att, q)) continue;
      place(q, att); vpath[vlen++] = q;
      let ok = false;
      const nf = cnt[att][K_WIN];
      if (nf >= 2) { ok = true; vbest = Array.from(vpath.subarray(0, vlen)); }   // 열린 사·사사: 못 막음
      else if (nf === 1) {
        const r = fiveCellNear(att, q);
        if (r >= 0) {
          if (!legal(def, r)) { ok = true; vbest = Array.from(vpath.subarray(0, vlen)); vbest.push(r); }   // 막을 자리가 상대 금수
          else {
            place(r, def); vpath[vlen++] = r;
            ok = vcf(att, left - 1, lvl + 1);
            vlen--; unplace();
          }
        }
      }
      vlen--; unplace();
      if (ok) return true;
      if (vcfOut) return false;
    }
    if (!vcfOut) { vfG[slot] = vfGen; vfLo[slot] = lo; vfHi[slot] = hHi; vfDepth[slot] = left; }
    return false;
  }
  function vcfRoot(att, depth, limit) {
    vcfNodes = 0; vcfLimit = limit; vcfOut = false; vlen = 0; vbest = null;
    const r = vcf(att, depth, 0) ? vbest : null;
    spent += vcfNodes;
    return r;
  }

  // ── VCT: 사·열린 삼으로 몰아 이기는 길 (공격 A 의 수 = 사·삼, 수비 D 의 수 = 삼 막기·반격 사) ──
  //  깊이 = 공격 위협 수. 다 못 읽으면(예산 끝) '못 찾음'으로 침 → 이겼다고 착각하지 않음
  const VT_BITS = 17, VT_MASK = (1 << VT_BITS) - 1;
  const vtLo = new Int32Array(1 << VT_BITS), vtHi = new Int32Array(1 << VT_BITS), vtDepth = new Int8Array(1 << VT_BITS), vtG = new Int32Array(1 << VT_BITS);
  let vtGen = 1, vtNodes = 0, vtLimit = 0, vtOut = false, vtMove = -1;
  const vtBuf = []; for (let i = 0; i < 160; i++) vtBuf.push(new Int32Array(NN));
  const MAX_THREES = 10;                                               // 한 자리에서 해 볼 삼 수 (사는 다 봄)
  const vtStop = () => { if (++vtNodes > vtLimit || ((vtNodes & 255) === 0 && now() > deadline)) vtOut = true; return vtOut; };

  function vctA(A, depth, lvl) {                                       // A 차례
    if (vtStop() || lvl >= vtBuf.length - 2) return false;
    const D = 3 - A;
    if (cnt[A][K_WIN] > 0) return true;
    if (cnt[D][K_WIN] > 0) {                                           // D 의 사: 막아야 하고, 막은 수가 위협이어야 계속
      if (fiveCellsAll(D, tmpF, 2) >= 2) return false;
      const q = tmpF[0];
      if (!legal(A, q)) return false;
      place(q, A);
      const ok = afterA(A, depth, lvl + 1);
      unplace();
      if (ok && lvl === 0) vtMove = q;
      return ok;
    }
    if (depth <= 0) return false;
    const lo = hLo ^ (A << 27) ^ 0x5bd1e995, slot = lo & VT_MASK;
    if (vtG[slot] === vtGen && vtLo[slot] === lo && vtHi[slot] === hHi && vtDepth[slot] >= depth) return false;
    const onlyFours = realO4(D);                                       // D 에게 열린 삼이 있으면 삼은 늦음
    const pk = vtBuf[lvl], CA = cl[A], SA = sc[A], SD = sc[D];
    let n = 0;
    for (let q = 0; q < NN; q++) {
      if (board[q] !== 0 || near[q] === 0) continue;
      const k = CA[q];
      if (k === K_NONE || (onlyFours && k < K_4)) continue;
      const tier = k === K_O4 ? 7 : k === K_43 ? 6 : k === K_33 ? 5 : k === K_4 ? 4 : 2;
      const sv = SA[q] + (SD[q] >> 1);
      pk[n++] = ((tier * 400000 + (sv > 399999 ? 399999 : sv)) << 8) | q;
    }
    const arr = pk.subarray(0, n); arr.sort();
    let threes = 0;
    for (let i = n - 1; i >= 0; i--) {
      const q = arr[i] & 255, k = CA[q];
      if (k < K_4) { if (threes >= MAX_THREES) continue; }
      if (!legal(A, q)) continue;
      if (k < K_4) threes++;
      place(q, A);
      const ok = afterA(A, depth, lvl + 1);
      unplace();
      if (ok) { if (lvl === 0) vtMove = q; return true; }
      if (vtOut) return false;
    }
    if (!vtOut) { vtG[slot] = vtGen; vtLo[slot] = lo; vtHi[slot] = hHi; vtDepth[slot] = depth; }
    return false;
  }
  function afterA(A, depth, lvl) {                                     // A 가 방금 둠 → D 차례
    const D = 3 - A;
    if (cnt[D][K_WIN] > 0) return false;                               // D 가 바로 다섯
    const nA = cnt[A][K_WIN] > 0 ? fiveCellsAll(A, tmpF2, 2) : 0;
    if (nA >= 2) return true;                                          // 열린 사 · 사사
    if (nA === 1) {
      const r = tmpF2[0];
      if (!legal(D, r)) return true;                                   // 막을 자리가 D 의 금수
      place(r, D);
      const ok = vctA(A, depth - 1, lvl + 1);
      unplace();
      return ok;
    }
    if (!realO4(A)) return false;                                      // 위협이 아님
    return defendD(A, depth, lvl);
  }
  function defendD(A, depth, lvl) {                                    // D 차례, A 의 열린 삼이 살아 있음
    if (vtStop() || lvl >= vtBuf.length - 2) return false;
    const D = 3 - A, pk = vtBuf[lvl], CA = cl[A], CD = cl[D];
    let n = 0;
    for (let q = 0; q < NN; q++) {                                     // 막는 자리(A 가 두면 사 이상) · D 의 반격 사
      if (board[q] !== 0 || near[q] === 0) continue;
      const a = CA[q], d = CD[q];
      if (a < K_4 && d < K_4) continue;
      const pr = (a >= K_O4 ? 4 : a >= K_4 ? 2 : 0) + (d >= K_4 ? 3 : 0);
      pk[n++] = (pr << 8) | q;
    }
    const arr = pk.subarray(0, n); arr.sort();
    for (let i = n - 1; i >= 0; i--) {
      const r = arr[i] & 255;
      if (!legal(D, r)) continue;
      place(r, D);
      let ok;
      const nD = cnt[D][K_WIN] > 0 ? fiveCellsAll(D, tmpF2, 2) : 0;
      if (nD >= 2) ok = false;
      else if (nD === 1) {                                             // 반격 사: A 가 막고 나서 다시 D 차례
        const f = tmpF2[0];
        if (!legal(A, f)) ok = false;
        else { place(f, A); ok = afterA(A, depth, lvl + 1); unplace(); }
      } else ok = vctA(A, depth - 1, lvl + 1);
      unplace();
      if (!ok) return false;
    }
    return !vtOut;
  }
  function vctRoot(A, maxDepth, limit) {
    vtNodes = 0; vtLimit = limit; vtOut = false; vtMove = -1;
    let res = null;
    for (let d = 1; d <= maxDepth && !res; d++) {
      if (vctA(A, d, 0) && vtMove >= 0) res = { move: vtMove, depth: d };
      if (vtOut) break;
    }
    spent += vtNodes;
    return res;
  }

  // ── 반복 심화 (root = 정해진 후보만 볼 때) ──
  function iterate(s, cfg, t0, fixed) {
    const o = 3 - s, rootList = new Int16Array(NN);
    let order;
    if (fixed && fixed.length) order = fixed.slice();
    else { const n = genMoves(s, 0, rootList, -1, cfg.rootBeam); if (!n) return null; order = Array.from(rootList.subarray(0, n)); }
    if (order.length === 1) return { move: order[0], score: 0, depth: 0, kind: 'search', order };
    let best = order[0], bestScore = -INF, depthDone = 0;
    const softStop = t0 + cfg.timeMs * 0.45;
    for (let depth = 1; depth <= cfg.maxDepth; depth++) {
      let alpha = -INF, iterBest = -1, iterScore = -INF;
      const scores = new Array(order.length).fill(-INF);
      for (let i = 0; i < order.length; i++) {
        const q = order[i];
        place(q, s);
        let v;
        if (i === 0) v = -negamax(depth - 1, -INF, -alpha, 1, o);
        else {
          v = -negamax(depth - 1, -alpha - 1, -alpha, 1, o);
          if (!aborted && v > alpha) v = -negamax(depth - 1, -INF, -alpha, 1, o);
        }
        unplace();
        if (aborted) break;
        scores[i] = v;
        if (v > iterScore) { iterScore = v; iterBest = q; }
        if (v > alpha) alpha = v;
      }
      if (iterBest >= 0 && !aborted) { best = iterBest; bestScore = iterScore; depthDone = depth; }
      else if (iterBest >= 0 && iterScore > bestScore && depthDone > 0) { best = iterBest; bestScore = iterScore; }   // 다 못 봤어도 더 좋은 수가 나오면
      if (aborted) break;
      const idx = order.map((q, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
      order = idx.map(i => order[i]);
      if (Math.abs(bestScore) >= MATE) break;
      if (now() > softStop) break;
    }
    const i0 = order.indexOf(best); if (i0 > 0) { order.splice(i0, 1); order.unshift(best); }
    return { move: best, score: bestScore, depth: depthDone, kind: 'search', order };
  }

  // 상대가 위협(VCF·VCT)을 가진 국면: 둔 뒤에도 상대가 이긴다고 '증명된' 수만 뺌 (예산이 모자라 모르는 수는 남김, 다 지면 빈 목록)
  function safeMoves(s, path, cfg, endAt, withVct) {
    const o = 3 - s, cand = [], seen = new Uint8Array(NN);
    const add = q => { if (q >= 0 && q < NN && board[q] === 0 && !seen[q]) { seen[q] = 1; cand.push(q); } };
    for (const q of path) add(q);                                      // 상대 수순 위의 칸
    for (let q = 0; q < NN; q++) if (board[q] === 0 && near[q] && (cl[o][q] >= K_4 || cl[s][q] >= K_4)) add(q);   // 상대 사 자리 · 내 사
    const tmp = moveBuf[0], n = genMoves(s, 0, tmp, -1, 16);
    for (let i = 0; i < n; i++) add(tmp[i]);
    for (let q = 0; q < NN; q++) if (board[q] === 0 && near[q] && cl[o][q] >= K_3) add(q);   // 상대 삼 자리
    const safe = [];
    const saveDeadline = deadline;
    deadline = endAt;
    for (const q of cand.slice(0, 36)) {
      if (now() > endAt || spent > (cfg.threatNodes || 120000)) break;
      if (!legal(s, q)) continue;
      place(q, s);
      let bad = !!vcfRoot(o, cfg.oppVcf[0], cfg.safeNodes || 1500);
      if (!bad && withVct && cfg.oppVct) bad = !!vctRoot(o, cfg.oppVct[0], cfg.safeNodes || 1500);
      unplace();
      if (!bad) safe.push(q);
    }
    deadline = saveDeadline;
    return safe;
  }

  // ── 초급: 한 수 앞만 보고, 가끔 상대 삼을 못 봄 (사는 늘 막음) ──
  //  blind = 상대 줄을 흘려 보는 확률 · pick = [1등 고를 확률, 2등까지 누적] · o4 = 열린 사를 알아챌 확률
  function easyMove(s, rng, cfg) {
    const o = 3 - s, blindP = cfg.blind == null ? 0.45 : cfg.blind, pick = cfg.pick || [0.62, 0.87];
    const o4 = firstLegal(s, K_O4);
    if (o4 >= 0 && rng() < (cfg.o4 == null ? 0.85 : cfg.o4)) return { move: o4, kind: 'open4' };
    const blind = rng() < blindP;
    const top = [];
    for (let q = 0; q < NN; q++) {
      if (board[q] !== 0 || near[q] === 0 || !legal(s, q)) continue;
      const v = sc[s][q] + sc[o][q] * (blind ? 0.25 : 0.85) + rng() * 40;
      top.push([v, q]);
    }
    if (!top.length) return null;
    top.sort((a, b) => b[0] - a[0]);
    const r = rng(), i = Math.min(top.length - 1, r < pick[0] ? 0 : r < pick[1] ? 1 : 2);
    return { move: top[i][1], kind: 'easy' };
  }
  function anyLegal(s) {
    for (let q = 0; q < NN; q++) if (board[q] === 0 && near[q] > 0 && legal(s, q)) return q;
    for (let q = 0; q < NN; q++) if (board[q] === 0 && legal(s, q)) return q;
    return -1;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ── 바깥 API ──
  // think(상태, { tier: 'easy'|'normal'|'hard', timeMs, maxNodes, seed, hint })
  //  → { move, kind: book·win·block·lost·open4·vcf·vct·defend·search·easy, score, depth, nodes, ms, pv }
  function think(st, opts) {
    opts = opts || {};
    const t0 = now();
    const cfg = Object.assign({}, TIERS[opts.tier] || TIERS.normal);
    if (opts.timeMs != null) cfg.timeMs = opts.timeMs;
    if (opts.maxNodes != null) cfg.nodes = opts.maxNodes;
    if (cfg[st.rule]) Object.assign(cfg, cfg[st.rule]);                 // 규칙별 조정 (렌주는 수비를 더 깊게: 흑이 금수로 묶여 버틸 만함)
    if (opts.cfg) Object.assign(cfg, opts.cfg);                          // 시험·조율용 덮어쓰기
    const rng = mulberry(opts.seed == null ? (st.moves.length * 7919 + 17) : opts.seed);
    if (st.over) return { move: -1, kind: 'over', ms: 0, nodes: 0 };
    load(st);
    nodes = 0; spent = 0; aborted = false; nodeLimit = cfg.nodes || Infinity;
    killers.fill(-1); hist[1].fill(0); hist[2].fill(0);
    vfGen++; vtGen++;
    noiseAmp = (opts.hint || st.moves.length >= 10) ? 0 : (cfg.noise || 0);
    noiseSeed = (rng() * 4294967296) | 0;
    let res;
    try { res = decide(st, cfg, rng, t0, opts); } catch (e) { res = null; }
    if (!res || res.move < 0 || !legal(st.turn, res.move)) res = Object.assign(res || {}, { move: anyLegal(st.turn), kind: (res && res.kind) || 'none' });
    res.ms = Math.round(now() - t0); res.nodes = nodes + spent;
    delete res.order;
    return res;
  }
  function decide(st, cfg, rng, t0, opts) {
    const s = st.turn, o = 3 - s, endAt = t0 + cfg.timeMs;
    if (nst === 0) return { move: CENTER, kind: 'book', score: 0 };
    if (fiveCellsAll(s, tmpF, 1)) return { move: tmpF[0], kind: 'win', score: WINV };
    const nf = fiveCellsAll(o, tmpF, 2);
    if (nf) {
      for (let i = 0; i < nf; i++) if (legal(s, tmpF[i])) return { move: tmpF[i], kind: nf > 1 ? 'lost' : 'block', score: nf > 1 ? -WINV : 0 };
      return { move: anyLegal(s), kind: 'lost', score: -WINV };
    }
    if (cfg.easy) {
      if (cfg.vcf) {                                                    // (조율용) 짧은 VCF 만 보는 초급
        deadline = t0 + cfg.timeMs;
        const pv = vcfRoot(s, cfg.vcf[0], cfg.vcf[1]);
        if (pv && pv.length) return { move: pv[0], kind: 'vcf', score: WINV - pv.length, pv };
      }
      return easyMove(s, rng, cfg);
    }
    const o4 = firstLegal(s, K_O4);
    if (o4 >= 0) return { move: o4, kind: 'open4', score: WINV - 2 };
    if (nst === 1 && !opts.hint) {                                      // 두 번째 수: 첫 돌 옆 (가로·세로 또는 대각선)
      const p = stack[0], px = p % N, py = (p / N) | 0, opts8 = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx, y = py + dy;
        if ((dx || dy) && x >= 1 && y >= 1 && x < N - 1 && y < N - 1) opts8.push([Math.abs(x - 7) + Math.abs(y - 7) + rng() * 2.5, y * N + x]);
      }
      opts8.sort((a, b) => a[0] - b[0]);
      if (opts8.length) return { move: opts8[0][1], kind: 'book', score: 0 };
    }
    beamCfg = cfg;
    // 1) 내 VCF
    if (cfg.vcf) {
      deadline = t0 + cfg.timeMs * 0.2;
      const pv = vcfRoot(s, cfg.vcf[0], cfg.vcf[1]);
      if (pv && pv.length) return { move: pv[0], kind: 'vcf', score: WINV - pv.length, pv };
    }
    // 2) 내 VCT (상대 반격 사까지 따져서 이긴다고 나온 것만)
    if (cfg.vct) {
      deadline = t0 + cfg.timeMs * 0.35;
      const r = vctRoot(s, cfg.vct[0], cfg.vct[1]);
      if (r) return { move: r.move, kind: 'vct', score: WINV - 50 - r.depth };
    }
    // 3) 상대 위협(내가 한 수 쉬면 상대가 이기나?) → 그걸 끊는 수만 후보로
    let fixed = null, defendKind = '';
    const slip = cfg.slip ? rng() < cfg.slip : false;                  // 가끔 상대 수읽기를 건너뜀 (사람 같은 빈틈, 중급)
    if (cfg.oppVcf && !slip) {
      deadline = t0 + cfg.timeMs * 0.45;
      const opv = vcfRoot(o, cfg.oppVcf[0], cfg.oppVcf[1]);
      let path = opv, withVct = false;
      if (!opv && cfg.oppVct && !realO4(o)) {
        const r = vctRoot(o, cfg.oppVct[0], cfg.oppVct[1]);
        if (r) { path = [r.move]; withVct = true; }
      }
      if (path) {
        const safe = safeMoves(s, path, cfg, t0 + cfg.timeMs * 0.7, withVct);
        if (safe.length) { fixed = safe; defendKind = withVct ? 'defend-vct' : 'defend-vcf'; }
      }
    }
    // 4) 알파베타
    deadline = t0 + cfg.timeMs * 0.95;
    aborted = false;
    const r = iterate(s, cfg, t0, fixed);
    if (!r) return null;
    if (defendKind) r.kind = defendKind;
    return r;
  }

  // 시험·디버그용 (게임 화면은 쓰지 않음)
  const _dbg = {
    load, place, unplace,
    cell: (c, q) => ({ cls: cl[c][q], score: sc[c][q], sus: sus[c][q] }),
    cats: (c, q) => [0, 1, 2, 3].map(d => tabC[c][keyA[c][q * 4 + d]]),
    vcf: (st, att, depth, limit) => { load(st); vfGen++; deadline = now() + 5000; spent = 0; return vcfRoot(att, depth || 20, limit || 50000); },
    vct: (st, att, depth, limit) => { load(st); vtGen++; vfGen++; deadline = now() + 10000; spent = 0; const r = vctRoot(att, depth || 6, limit || 200000); return r ? Object.assign(r, { nodes: vtNodes }) : null; },
    totals: () => [total[1], total[2]],
    K: { K_NONE, K_3, K_33, K_4, K_43, K_O4, K_WIN }, CAT: { NONE, ONE, TWO, OPEN2, THREE, OPEN3, FOUR, D4, OPEN4, FIVE, OVER },
  };
  const API = { think, TIERS, _dbg };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.OmokAI = API;
})(this);

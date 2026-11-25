/* 베니 서바이벌 · 나인 멘스 모리스 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 시즌 1 · 7일차 결승전 1회전 (1:1)
   · 점 24개 판 (네모 세 겹 + 가운데를 잇는 선, 대각선 없음). 검정 · 하양 말 9개씩
   · 놓기: 선공부터 번갈아 빈 점에 1개씩 — 9개를 다 놓을 때까지 옮기기 없음
   · 옮기기: 다 놓은 뒤엔 선을 따라 이웃한 빈 점으로 한 칸
   · 놓거나 옮겨서 직선 세 점에 내 말 3개(밀)가 되면 상대 말 1개를 뺌 — 밀에 든 말은 못 뺌
   · 내 말이 3개 남으면 선을 안 따라도 아무 빈 점으로 옮길 수 있음 (날기)
   · 말이 2개가 되거나, 움직일 수 있는 말이 없으면 짐
   · 한쪽이 말 3개인 채로 교착이 10턴 이어지면 말이 더 적은 쪽이 짐
   · 3판 2선승
   방송과 다른 점 · 우리가 정한 것 (원문에 없거나 폰으로 바꾼 것)
   · 놓기 90초 제한 없음
   · 1판 선공은 무작위, 다음 판부터 번갈아 (방송: 1 · 3판 선후공은 피스 베네핏을 가진 사람이 정함)
   · 상대 말이 모두 밀에 들어 있으면 아무 말이나 뺄 수 있음 (방송 글에 이 경우가 없어 보통 규칙대로)
   · '10턴' = 빼기 없이 둘이 10번씩(20수). 말 수가 같으면(3:3) 그 판은 무승부
   · 옮기기 단계에서 빼기 없이 100수(50번씩)가 지나면 말이 적은 쪽이 짐, 같으면 무승부
   · 무승부 판은 다시 함 (3판 2선승은 최대 5판, 단판은 최대 3판 — 그래도 못 가리면 무승부)
   · '말 2개' = 판 위 + 아직 안 놓은 말 합계 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).morris = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NP = 24, MEN = 9, Q3 = 20, QCAP = 100, WINV = 100000;
  // 점 번호: 위 줄부터 왼쪽 → 오른쪽 (7×7 격자 좌표)
  const XY = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  const MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
    [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
  const PM = Array.from({ length: NP }, () => []);
  MILLS.forEach((m, k) => m.forEach(p => PM[p].push(k)));
  const ADJ = Array.from({ length: NP }, () => []);
  MILLS.forEach(m => { for (let i = 0; i < 2; i++) { ADJ[m[i]].push(m[i + 1]); ADJ[m[i + 1]].push(m[i]); } });
  ADJ.forEach(a => a.sort((x, y) => x - y));
  const LBL = XY.map(([x, y]) => "abcdefg"[x] + (7 - y));      // 칸 이름: 가로 a~g · 아래에서 1~7

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 160) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const isP = x => Number.isInteger(x) && x >= 0 && x < NP;

  // ── 판 보조 (한 곳) ───────────────────────────────────────
  function onBoard(c, s) { let n = 0; for (let p = 0; p < NP; p++) if (c[p] === s + 1) n++; return n; }
  // p 에 놓인 말이 들어 있는 밀(3개 한 줄) 목록
  function millsAt(c, p) {
    const col = c[p], out = [];
    if (!col) return out;
    for (const k of PM[p]) { const m = MILLS[k]; if (c[m[0]] === col && c[m[1]] === col && c[m[2]] === col) out.push(m.slice()); }
    return out;
  }
  function inMill(c, p) {
    const col = c[p]; if (!col) return false;
    for (const k of PM[p]) { const m = MILLS[k]; if (c[m[0]] === col && c[m[1]] === col && c[m[2]] === col) return true; }
    return false;
  }
  // 뺄 수 있는 상대(opp) 말 — 밀 밖의 말, 모두 밀이면 아무 말
  function removable(c, opp) {
    const col = opp + 1, all = [], free = [];
    for (let p = 0; p < NP; p++) if (c[p] === col) { all.push(p); if (!inMill(c, p)) free.push(p); }
    return free.length ? free : all;
  }
  // 한 번의 놓기 · 옮기기 = [from, to] (놓기는 from = -1)
  function baseMoves(c, hand, s) {
    const out = [];
    if (hand[s] > 0) { for (let p = 0; p < NP; p++) if (!c[p]) out.push([-1, p]); return out; }
    const col = s + 1, fly = onBoard(c, s) === 3;
    for (let f = 0; f < NP; f++) if (c[f] === col) {
      if (fly) { for (let t = 0; t < NP; t++) if (!c[t]) out.push([f, t]); }
      else for (const t of ADJ[f]) if (!c[t]) out.push([f, t]);
    }
    return out;
  }
  const canFly = (c, hand, s) => hand[s] === 0 && onBoard(c, s) === 3;
  const toAct = ([f, t]) => f < 0 ? { t: "place", to: t } : { t: "move", from: f, to: t };

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const bo = cfg && +cfg.bo === 1 ? 1 : 3;
    const st = { n: 2, rs: (seed >>> 0) || 1, bo, maxR: bo === 3 ? 5 : 3, round: 0, wins: [0, 0], first0: 0, first: 0, hist: [], log: [], seq: 0, over: false, phase: "play", res: null };
    st.first0 = rnd(st) < 0.5 ? 0 : 1;
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.phase = "play"; st.res = null;
    st.first = (st.first0 + st.round - 1) % 2;
    st.cells = Array(NP).fill(0); st.hand = [MEN, MEN]; st.turn = st.first; st.rem = false; st.mill = null;
    st.ply = 0; st.quiet = 0; st.q3 = 0; st.last = null;
    push(st, { k: "start", r: st.round, first: st.first });
  }
  const needs = st => st.over || st.phase !== "play" ? [] : [st.turn];
  const over = st => !!st.over;
  function ranks(st) { return st.wins[0] === st.wins[1] ? [0, 0] : st.wins[0] > st.wins[1] ? [0, 1] : [1, 0]; }
  const total = (x, s) => onBoard(x.cells, s) + x.hand[s];
  function legal(x, seat) {
    if (x.over || x.phase !== "play" || seat !== x.turn) return [];
    if (x.rem) return removable(x.cells, 1 - seat).map(at => ({ t: "remove", at }));
    return baseMoves(x.cells, x.hand, seat).map(toAct);
  }

  function endRound(st, w, why) {
    const cnt = [total(st, 0), total(st, 1)];
    st.res = { r: st.round, w, why, cnt, ply: st.ply, first: st.first };
    st.hist.push(Object.assign({}, st.res, { cnt: cnt.slice() }));
    if (w >= 0) st.wins[w]++;
    push(st, { k: "round", r: st.round, w, why, cnt: cnt.slice() });
    st.phase = "between"; st.rem = false; st.mill = null;
    const need = st.bo === 3 ? 2 : 1;
    if (st.wins.some(x => x >= need) || st.round >= st.maxR) { st.over = true; st.phase = "end"; push(st, { k: "end", wins: st.wins.slice() }); }
  }
  // 교착 · 수 상한: 판 위 말이 적은 쪽이 짐, 같으면 무승부
  function stall(st, why) {
    const a = onBoard(st.cells, 0), b = onBoard(st.cells, 1);
    endRound(st, a === b ? -1 : a > b ? 0 : 1, why);
  }
  // seat 의 차례가 끝남 → 교착 판정 → 상대가 못 움직이면 상대 패
  function finishTurn(st, seat) {
    const opp = 1 - seat;
    if (st.hand[0] === 0 && st.hand[1] === 0) {
      if (st.q3 >= Q3) { stall(st, "stall3"); return; }
      if (st.quiet >= QCAP) { stall(st, "cap"); return; }
    }
    st.turn = opp;
    if (st.hand[opp] === 0 && !baseMoves(st.cells, st.hand, opp).length) endRound(st, seat, "block");
  }
  function apply(st, seat, a) {
    if (st.over || st.phase !== "play" || seat !== st.turn) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    const opp = 1 - seat;
    if (st.rem) {
      if (a.t !== "remove") return { ok: false, err: "밀을 만들었어요 — 뺄 상대 말을 골라 주세요" };
      if (!isP(a.at) || st.cells[a.at] !== opp + 1) return { ok: false, err: "뺄 상대 말을 골라 주세요" };
      if (!removable(st.cells, opp).includes(a.at)) return { ok: false, err: "밀(3개 한 줄)에 든 말은 못 빼요" };
      st.cells[a.at] = 0; st.rem = false; st.mill = null; st.quiet = 0; st.q3 = 0;
      st.last = Object.assign({}, st.last, { rm: a.at });
      push(st, { k: "rm", s: seat, at: a.at });
      if (total(st, opp) <= 2) { endRound(st, seat, "two"); return { ok: true }; }
      finishTurn(st, seat);
      return { ok: true };
    }
    let f, t;
    if (a.t === "place") {
      if (st.hand[seat] <= 0) return { ok: false, err: "말을 다 놓았어요 — 판 위 내 말을 옮겨요" };
      f = -1; t = a.to;
    } else if (a.t === "move") {
      if (st.hand[seat] > 0) return { ok: false, err: `아직 놓을 말이 ${st.hand[seat]}개 남았어요 — 다 놓은 뒤에 옮겨요` };
      f = a.from; t = a.to;
      if (!isP(f) || st.cells[f] !== seat + 1) return { ok: false, err: "옮길 내 말을 골라 주세요" };
    } else if (a.t === "remove") return { ok: false, err: "밀을 만들어야 상대 말을 뺄 수 있어요" };
    else return { ok: false, err: "모르는 행동이에요" };
    if (!isP(t)) return { ok: false, err: "점을 골라 주세요" };
    if (st.cells[t]) return { ok: false, err: "빈 점이 아니에요" };
    const fly = f >= 0 && canFly(st.cells, st.hand, seat);
    if (f >= 0 && !fly && !ADJ[f].includes(t)) return { ok: false, err: "선을 따라 이웃한 빈 점으로 한 칸만 옮겨요" };
    if (f >= 0) st.cells[f] = 0; else st.hand[seat]--;
    st.cells[t] = seat + 1; st.ply++;
    const mills = millsAt(st.cells, t);
    st.last = { s: seat, f, t, rm: -1 };
    push(st, f < 0 ? { k: "pl", s: seat, to: t, mill: mills.length > 0 } : { k: "mv", s: seat, from: f, to: t, fly: fly && !ADJ[f].includes(t), mill: mills.length > 0 });
    if (st.hand[0] === 0 && st.hand[1] === 0) {
      st.quiet++;
      if (Math.min(onBoard(st.cells, 0), onBoard(st.cells, 1)) <= 3) st.q3++; else st.q3 = 0;
    }
    if (mills.length && onBoard(st.cells, opp) > 0) { st.rem = true; st.mill = mills; return { ok: true }; }
    finishTurn(st, seat);
    return { ok: true };
  }
  const auto = st => st.phase === "between" && !st.over ? 2800 : null;
  function advance(st) { if (st.phase === "between" && !st.over) startRound(st); }

  // ── 보이는 것 (전부 공개) ──────────────────────────────────
  function view(st, seat) {
    const ob = [onBoard(st.cells, 0), onBoard(st.cells, 1)];
    const pubObj = { c: st.cells, h: st.hand, t: st.turn, r: st.round, w: st.wins, p: st.phase, rm: st.rem, o: st.over, q: st.quiet, q3: st.q3 };
    return {
      n: 2, bo: st.bo, round: st.round, maxR: st.maxR, wins: st.wins.slice(), first: st.first, phase: st.phase, turn: st.turn, rem: st.rem,
      cells: st.cells.slice(), hand: st.hand.slice(), board: ob, total: [ob[0] + st.hand[0], ob[1] + st.hand[1]],
      fly: [canFly(st.cells, st.hand, 0), canFly(st.cells, st.hand, 1)], ply: st.ply, quiet: st.quiet, q3: st.q3, Q3, QCAP,
      mill: st.mill ? st.mill.map(m => m.slice()) : null, last: st.last ? Object.assign({}, st.last) : null,
      res: st.res ? Object.assign({}, st.res, { cnt: st.res.cnt.slice() }) : null, hist: st.hist.map(h => Object.assign({}, h, { cnt: h.cnt.slice() })),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.wins.slice(),
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI: 알파베타 (놓기/옮기기 + 빼기를 한 수로 묶어 읽음) ───────
  // 묶은 수 = [from, to, rm] — from -1 = 놓기, from -2 = 빼기만 (밀을 만든 뒤 빼기 차례)
  function genC(c, h, s) {
    const out = [], col = s + 1, opp = 1 - s;
    for (const [f, t] of baseMoves(c, h, s)) {
      if (f >= 0) c[f] = 0;
      c[t] = col;
      if (inMill(c, t) && onBoard(c, opp) > 0) for (const r of removable(c, opp)) out.push([f, t, r]);
      else out.push([f, t, -1]);
      c[t] = 0;
      if (f >= 0) c[f] = col;
    }
    return out;
  }
  function make(B, m, s) {
    const [f, t, r] = m, c = B.c;
    if (f >= -1) { if (f < 0) B.h[s]--; else c[f] = 0; c[t] = s + 1; }
    if (r >= 0) c[r] = 0;
  }
  function unmake(B, m, s) {
    const [f, t, r] = m, c = B.c;
    if (r >= 0) c[r] = 2 - s;
    if (f >= -1) { c[t] = 0; if (f < 0) B.h[s]++; else c[f] = s + 1; }
  }
  // seat 이 다음 한 번으로 밀을 만들 수 있는 줄 = 내 말 2 + 빈 점 1, 그 빈 점에 내 말이 올 수 있음
  function threatsOf(c, h, s) {
    const col = s + 1, out = [], fly = canFly(c, h, s), placing = h[s] > 0;
    for (const m of MILLS) {
      let a = 0, e = -1, o = 0;
      for (const p of m) { if (c[p] === col) a++; else if (!c[p]) e = p; else o++; }
      if (a !== 2 || o || e < 0) continue;
      let by = [];
      if (placing) by = [-1];
      else for (let p = 0; p < NP; p++) if (c[p] === col && !m.includes(p) && (fly || ADJ[p].includes(e))) by.push(p);
      if (by.length) out.push({ line: m.slice(), empty: e, by });
    }
    return out;
  }
  function evalS(B, s) {
    const c = B.c, h = B.h;
    let v = 0;
    for (let q = 0; q < 2; q++) {
      const col = q + 1, ob = onBoard(c, q), tot = ob + h[q];
      let sc = tot * 100, mills = 0, twos = 0;
      for (const m of MILLS) {
        let a = 0, e = 0;
        for (const p of m) { if (c[p] === col) a++; else if (!c[p]) e++; }
        if (a === 3) mills++; else if (a === 2 && e === 1) twos++;
      }
      sc += mills * 12 + twos * (h[q] > 0 ? 10 : 5);
      if (h[q] === 0 && ob > 3) {
        let mob = 0;
        for (let p = 0; p < NP; p++) if (c[p] === col) for (const t of ADJ[p]) if (!c[t]) mob++;
        sc += mob * 4;
      } else if (h[q] > 0) {
        for (let p = 0; p < NP; p++) if (c[p] === col) sc += ADJ[p].length;      // 놓기 땐 이웃 많은 점(십자 자리)을 조금 좋게
      }
      v += q === s ? sc : -sc;
    }
    // 다음 한 번에 밀을 닫을 수 있는 자리: 차례인 쪽은 곧 한 개를 뺄 수 있고, 상대가 두 곳 이상이면 다 막지 못함
    if (thrCount(c, h, s)) v += 70;
    if (thrCount(c, h, 1 - s) >= 2) v -= 60;
    return v;
  }
  function thrCount(c, h, q) {
    const col = q + 1, free = h[q] > 0 || onBoard(c, q) === 3;
    let n = 0, seen = 0;
    for (const m of MILLS) {
      let a = 0, e = -1, o = 0;
      for (const p of m) { if (c[p] === col) a++; else if (!c[p]) e = p; else o++; }
      if (a !== 2 || o || e < 0 || (seen >> e) & 1) continue;
      let can = free;
      if (!can) for (const p of ADJ[e]) if (c[p] === col && p !== m[0] && p !== m[1] && p !== m[2]) { can = true; break; }
      if (can) { seen |= 1 << e; n++; }
    }
    return n;
  }
  // 옮기기 단계에서 움직일 말이 하나도 없는지 (날기면 늘 움직일 수 있음)
  function blocked(c, s) {
    const col = s + 1;
    let n = 0;
    for (let p = 0; p < NP; p++) if (c[p] === col) { n++; for (const t of ADJ[p]) if (!c[t]) return false; }
    return n !== 3;
  }
  function orderKey(B, m, s) {
    const [f, t, r] = m, c = B.c, oc = 2 - s;
    let k = r >= 0 ? 1000 : 0;
    if (t >= 0) for (const q of PM[t]) { const L = MILLS[q]; let o = 0; for (const p of L) if (p !== t && c[p] === oc) o++; if (o === 2) k += 120; }
    return k + (f === -1 && t >= 0 ? ADJ[t].length : 0);
  }
  // 수를 둔 뒤의 교착 셈 (판과 같은 규칙: 빼면 0, 둘 다 다 놓았을 때만 셈) → [q3, quiet]
  function nextQ(B, m, q3, quiet) {
    if (m[2] >= 0 || m[0] === -2) return [0, 0];
    if (B.h[0] || B.h[1]) return [q3, quiet];
    return [Math.min(onBoard(B.c, 0), onBoard(B.c, 1)) <= 3 ? q3 + 1 : 0, quiet + 1];
  }
  // 교착 · 수 상한에 닿으면 판 끝: 판 위 말이 적은 쪽 패 (s = 방금 둔 쪽에서 본 값), 아니면 null
  function stallV(B, s, nq, ply) {
    if (B.h[0] || B.h[1] || (nq[0] < Q3 && nq[1] < QCAP)) return null;
    const a = onBoard(B.c, s), b = onBoard(B.c, 1 - s);
    return a === b ? 0 : a > b ? WINV - ply : -(WINV - ply);
  }
  const sortBy = (mv, key) => mv.map(m => [key(m), m]).sort((x, y) => y[0] - x[0]).map(z => z[1]);
  function negamax(B, depth, s, alpha, beta, ply, q3, quiet) {
    if (B.stop) return 0;
    if (++B.nodes > B.limit) { B.stop = 1; return 0; }
    if (onBoard(B.c, s) + B.h[s] <= 2) return -(WINV - ply);
    if (B.h[s] === 0 && blocked(B.c, s)) return -(WINV - ply);
    if (depth <= 0) return evalS(B, s);
    const mv = sortBy(genC(B.c, B.h, s), m => orderKey(B, m, s));
    let best = -Infinity;
    for (const m of mv) {
      make(B, m, s);
      const nq = nextQ(B, m, q3, quiet), sv = stallV(B, s, nq, ply + 1);
      const v = sv !== null ? sv : -negamax(B, depth - 1, 1 - s, -beta, -alpha, ply + 1, nq[0], nq[1]);
      unmake(B, m, s);
      if (B.stop) return 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  // 단계: depth = 앞을 읽는 수 · nodes = 읽는 양 한도 · noise = 점수 흔들림 · rand = 아무 수나 둘 확률 · slack = 최선과 이만큼 차이는 같은 값으로 봄
  const TIER = {
    easy: { depth: 1, nodes: 3000, noise: 90, rand: 0.3, slack: 0 },
    normal: { depth: 3, nodes: 12000, noise: 18, rand: 0.04, slack: 0 },
    hard: { depth: 6, nodes: 40000, noise: 1, rand: 0, slack: 2 },
    coach: { depth: 6, nodes: 40000, noise: 0, rand: 0, slack: 45 },      // 선생님 추천: 최선 근처 수들의 값을 정확히
  };
  const boardFrom = x => ({ c: Int8Array.from(x.cells), h: x.hand.slice(), nodes: 0, limit: 1e9, stop: 0 });
  // 지금 차례에 둘 묶은 수 (빼기 차례면 [-2, -2, rm])
  function rootMoves(B, x, s) {
    if (x.rem) return removable(B.c, 1 - s).map(r => [-2, -2, r]);
    return genC(B.c, B.h, s);
  }
  function pickC(x, s, tier, r) {
    const cfg = TIER[tier] || TIER.normal;
    if (cfg.rand && r() < cfg.rand) { const mv = rootMoves(boardFrom(x), x, s); return mv.length ? mv[Math.floor(r() * mv.length)] : null; }
    const done = scoreC(x, s, cfg);
    if (!done) return null;
    let bm = done[0][0], bv = -Infinity;
    // 값이 같으면 지금 빼는 수(밀)를 먼저 — 사람 눈에도 자연스럽게
    for (const [m, v, bound] of done) { const z = v + (m[2] >= 0 && !bound ? 3 : 0) + r() * cfg.noise; if (z > bv) { bv = z; bm = m; } }
    return bm;
  }
  // 묶은 수마다 값 [[수, 값], …] — 반복 깊이, 마지막으로 끝까지 읽은 깊이의 값 (slack 밖의 값은 위쪽 한계)
  function scoreC(x, s, cfg) {
    const B = boardFrom(x);
    let mv = rootMoves(B, x, s);
    if (cfg.only) mv = mv.filter(cfg.only);
    if (!mv.length) return null;
    mv = sortBy(mv, m => orderKey(B, m, s));
    const q3 = x.q3 || 0, quiet = x.quiet || 0;
    B.limit = cfg.nodes;
    let done = null;
    for (let d = 1; d <= cfg.depth; d++) {
      B.nodes = 0; B.stop = 0;
      const sc = [];
      let alpha = -Infinity;
      for (const m of mv) {
        make(B, m, s);
        const lo = cfg.slack && isFinite(alpha) ? alpha - cfg.slack - 1 : -Infinity;
        const nq = nextQ(B, m, q3, quiet), sv = stallV(B, s, nq, 1);
        const v = sv !== null ? sv : -negamax(B, d - 1, 1 - s, -Infinity, -lo, 1, nq[0], nq[1]);
        unmake(B, m, s);
        if (B.stop) break;
        sc.push([m, v, v <= lo]);                                // 세 번째 = 위쪽 한계뿐인 값 (정확한 값 아님)
        if (v > alpha) alpha = v;
      }
      if (B.stop) break;
      done = sc; done.depth = d;
      if (Math.abs(alpha) >= WINV - 50) break;                // 이기거나 지는 길을 찾았으면 그만
      // 다음 깊이는 좋은 수부터
      const val = new Map(sc.map(z => [z[0], z[1]]));
      mv = sortBy(mv, m => val.has(m) ? val.get(m) : -Infinity);
    }
    if (!done) done = mv.map(m => [m, 0, false]);
    return done.slice().sort((a, b) => b[1] - a[1]);
  }
  function ai(V, seat, tier, r) {
    if (V.over || V.phase !== "play" || V.turn !== seat) return null;
    const m = pickC(V, seat, tier, r || Math.random);
    if (!m) return null;
    return V.rem ? { t: "remove", at: m[2] } : toAct([m[0], m[1]]);
  }

  // ── 선생님이 쓰는 보조 (보이는 것만 — 이 게임은 모두 공개) ──────
  // 한 수의 뜻: mill(밀 완성 → 빼기) · block(상대가 곧 만들 밀 자리를 막음) · two(다음에 밀을 만들 줄이 생김) · open(밀을 열어 다시 닫을 준비) · fly(날기)
  //  빼기: breakTwo(상대가 곧 밀을 만들 줄의 말) · win(상대 말이 2개가 됨)
  function explain(V, me, a) {
    const c = V.cells.slice(), h = V.hand.slice(), opp = 1 - me, tags = [];
    if (a.t === "remove") {
      const th = threatsOf(c, h, opp);
      if (onBoard(c, opp) + h[opp] - 1 <= 2) tags.push("win");
      if (th.some(x => x.line.includes(a.at))) tags.push("breakTwo");
      if (th.some(x => x.by.includes(a.at))) tags.push("breakRun");
      return { tags };
    }
    const f = a.t === "place" ? -1 : a.from, t = a.to;
    const oppTh = threatsOf(c, h, opp), mine0 = threatsOf(c, h, me).length, mob0 = h[opp] === 0 ? baseMoves(c, h, opp).length : -1;
    const opE = [...new Set(oppTh.map(x => x.empty))];
    if (opE.includes(t)) tags.push("block");
    else if (opE.length) {
      const tos = new Set(baseMoves(V.cells, V.hand, me).map(x => x[1]));
      tags.push(opE.some(e => tos.has(e)) ? "noBlock" : "cantBlock");
    }
    if (f >= 0 && inMill(c, f)) tags.push("open");
    if (f >= 0 && canFly(c, h, me) && !ADJ[f].includes(t)) tags.push("fly");
    if (f >= 0) c[f] = 0; else h[me]--;
    c[t] = me + 1;
    if (inMill(c, t)) tags.unshift("mill");
    else if (threatsOf(c, h, me).length > mine0) tags.push("two");
    // 옮긴 뒤 상대가 바로 밀을 만들 수 있는 자리 · 상대가 움직일 수 있는 길
    const after = threatsOf(c, h, opp).length, mob1 = mob0 >= 0 ? baseMoves(c, h, opp).length : -1;
    if (mob0 >= 0 && !canFly(c, h, opp) && mob1 < mob0) tags.push("squeeze");
    return { tags, oppAfter: after, mob: [mob0, mob1], opE };
  }
  function recommend(V, me) {
    if (V.over || V.phase !== "play" || V.turn !== me) return null;
    const done = scoreC(V, me, TIER.coach);
    if (!done) return null;
    if (V.rem) { const a = { t: "remove", at: done[0][0][2] }; return Object.assign({ a }, explain(V, me, a)); }
    // 밀을 바로 만들 수 있고 최선과 거의 같으면(40 안) 밀을 권함 — 배우는 사람에게 더 분명하게
    let [m, v] = done[0];
    const mill = done.find(z => z[0][2] >= 0 && !z[2]);
    if (mill && m[2] < 0 && mill[1] >= v - 40) [m, v] = mill;
    const a = toAct([m[0], m[1]]), ex = explain(V, me, a);
    if (mill && m[2] < 0) { ex.tags.push("skipMill"); ex.millAt = mill[0][1]; }
    return Object.assign({ a, rm: m[2] }, ex);
  }
  // 복기: 내 수 · 고급 AI 수의 값 (같은 깊이로 읽은 값, 말 1개 = 100). 밀을 만드는 수는 가장 좋은 빼기를 한 것으로 셈
  //   넓게 읽을 때 창 밖으로 잘린 값(위쪽 한계뿐)이면 그 수만 같은 깊이로 다시 정확히 읽음
  function judge(V, seat, a, b) {
    if (V.over || V.phase !== "play" || V.turn !== seat || !a || !b) return null;
    const hitOf = act => m => (V.rem ? act.t === "remove" && m[2] === act.at
      : act.t === "place" ? m[0] === -1 && m[1] === act.to : act.t === "move" && m[0] === act.from && m[1] === act.to);
    const done = scoreC(V, seat, Object.assign({}, TIER.coach, { slack: 400 }));
    if (!done || !done.length) return null;
    const val = (list, act) => {
      let best = null; const hit = hitOf(act);
      for (const [m, v, bd] of list) if (hit(m) && (best === null || v > best.v)) best = { v, exact: !bd };
      return best;
    };
    let my = val(done, a), bs = val(done, b);
    if ((my && !my.exact) || (bs && !bs.exact)) {
      const ha = hitOf(a), hb = hitOf(b);
      const again = scoreC(V, seat, Object.assign({}, TIER.coach, { slack: 0, depth: done.depth || TIER.coach.depth, only: m => ha(m) || hb(m) }));
      if (again && again.length) { my = val(again, a) || my; bs = val(again, b) || bs; }
    }
    return { my: my ? my.v : null, best: bs ? bs.v : null, top: done[0][1], WINV };
  }
  function analyze(V, me) {
    const opp = 1 - me;
    return { me: threatsOf(V.cells, V.hand, me), opp: threatsOf(V.cells, V.hand, opp), rec: recommend(V, me) };
  }

  return {
    id: "morris", NP, MEN, Q3, QCAP, XY, MILLS, ADJ, LBL,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    onBoard, millsAt, inMill, removable, baseMoves, threatsOf, explain, recommend, analyze, judge, TIER,
  };
});

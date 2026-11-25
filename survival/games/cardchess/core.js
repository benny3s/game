/* 베니 서바이벌 · 카드 체스 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌X · 카드 체스 (1:1)
   · 판 5×5. 말 5개씩, 각자 자기 첫 줄에 가득 (자리 0 = 백 · 아래쪽 · 선공, 자리 1 = 흑 · 위쪽). 성 = 각자 첫 줄 가운데 칸
   · 카드 5장: 룩 · 비숍 · 어태커 · 나이트 · 점퍼. 내 앞에 2장 · 상대 앞에 2장 · 대기 존에 1장
   · 내 차례: 앞 카드 2장 중 1장을 골라 그 규칙대로 말 1개를 옮김 → 쓴 카드는 대기 존으로, 대기 존에 있던 카드가 내 앞으로. 옮긴 칸에 상대 말이 있으면 제거
   · 룩 = 상하좌우 1칸 · 비숍 = 대각선 1칸 · 어태커 = 말이 보는 쪽 직진 최대 2칸(말을 못 뛰어넘음) 또는 앞 대각선 1칸
     나이트 = 상하좌우 2칸 뒤 수직 1칸(뛰어넘음) · 점퍼 = 붙어 있는 말을 뛰어넘어 바로 뒤 칸에 착지(그 말은 안 없어짐)
     · 판 위 말이 2개만 남으면 점퍼는 퀸(8방향 1칸)이 됨
   · 말이 보는 쪽 끝 줄에 닿으면 반대쪽으로 돌아봄
   · 승리: 상대 말을 모두 없애거나, 내 말을 상대 성에 올리고 한 턴을 버팀 (상대가 다음 차례에 없애지 못하면 승)
   · 세트 시작: 후공이 카드 5장을 직접 나눔 — 선공 앞 2장 · 후공 앞 2장 · 대기 1장 (30가지, 방송과 같음). 옵션 deal:"rand" 면 무작위
   방송과 다른 점 · 우리가 정한 것 (원문에 없음)
   · 말 종류는 모두 같고 카드가 이동을 정함 · 선공 = 백
   · 도착 칸에 내 말이 있으면 못 감, 상대 말이면 제거. 어디로도 못 움직이면 그 턴은 넘김 (둘 다 못 움직이면 말 수로 판가름)
   · 되돌아와 내 쪽 끝 줄에 닿아도 다시 돌아봄 (보는 쪽 끝 줄이 '마지막 줄'). 성 버티기는 상대 차례가 끝났을 때 내 말이 성에 그대로 있으면 승
   · 한 세트는 60턴까지: 넘으면 말이 더 많은 쪽 승 (같으면 무승부). 옵션 1세트 / 3세트(먼저 2승, 비기면 그 세트는 다시 · 최대 5세트)
     2세트부터 선공은 직전 세트에서 진 쪽 (비기면 바꿔서) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).cardchess = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SZ = 5, NS = 25, MAXTURN = 60, WINV = 100000;
  const ROOK = 0, BISHOP = 1, ATTACKER = 2, KNIGHT = 3, JUMPER = 4, QUEEN = 5;
  const CARDS = ["룩", "비숍", "어태커", "나이트", "점퍼", "퀸"];
  const CASTLE = [22, 2];
  const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], DD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], D8 = D4.concat(DD);
  const KN = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
  const inb = (r, c) => r >= 0 && r < SZ && c >= 0 && c < SZ;
  // 칸마다 미리 만든 도착 칸 (말 · 방향과 상관없는 카드)
  const mkStep = ds => Array.from({ length: NS }, (_, i) => { const r = (i / SZ) | 0, c = i % SZ; return ds.filter(([a, b]) => inb(r + a, c + b)).map(([a, b]) => (r + a) * SZ + c + b); });
  const STEP = [mkStep(D4), mkStep(DD), null, mkStep(KN), null, mkStep(D8)];
  const JMP = Array.from({ length: NS }, (_, i) => { const r = (i / SZ) | 0, c = i % SZ; return D8.filter(([a, b]) => inb(r + 2 * a, c + 2 * b)).map(([a, b]) => [(r + a) * SZ + c + b, (r + 2 * a) * SZ + c + 2 * b]); });

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 수 만들기 (한 곳) ─────────────────────────────────────
  // 수 = 카드 칸(0|1) << 10 | 옮길 말 칸 << 5 | 도착 칸
  const effCard = (c, total) => c === JUMPER && total <= 2 ? QUEEN : c;
  function addMoves(cells, face, from, card, own, base, out) {
    const r = (from / SZ) | 0, c = from % SZ;
    if (card === ATTACKER) {
      const f = face[from], a = r + f;
      if (a < 0 || a >= SZ) return;
      const t1 = a * SZ + c;
      if (cells[t1] === 0) {
        out.push(base | t1);
        const a2 = a + f;
        if (a2 >= 0 && a2 < SZ && cells[a2 * SZ + c] !== own) out.push(base | (a2 * SZ + c));
      } else if (cells[t1] !== own) out.push(base | t1);
      for (const d of [-1, 1]) if (c + d >= 0 && c + d < SZ && cells[a * SZ + c + d] !== own) out.push(base | (a * SZ + c + d));
    } else if (card === JUMPER) {
      for (const [mid, land] of JMP[from]) if (cells[mid] !== 0 && cells[land] !== own) out.push(base | land);
    } else for (const t of STEP[card][from]) if (cells[t] !== own) out.push(base | t);
  }
  function gen(cells, face, ca, cb, seat, total) {
    const own = seat + 1, out = [], cs = [ca, cb];
    for (let slot = 0; slot < 2; slot++) {
      const card = effCard(cs[slot], total);
      for (let f = 0; f < NS; f++) if (cells[f] === own) addMoves(cells, face, f, card, own, (slot << 10) | (f << 5), out);
    }
    return out;
  }
  const total = cells => { let n = 0; for (let i = 0; i < NS; i++) if (cells[i]) n++; return n; };
  const genOf = (x, seat) => gen(x.cells, x.face, x.hand[seat][0], x.hand[seat][1], seat, total(x.cells));
  const isCell = x => Number.isInteger(x) && x >= 0 && x < NS;
  function toInt(a) {
    if (!a || typeof a !== "object" || a.t !== "mv" || (a.slot !== 0 && a.slot !== 1) || !isCell(a.from) || !isCell(a.to)) return -1;
    return (a.slot << 10) | (a.from << 5) | a.to;
  }
  const toAct = m => ({ t: "mv", slot: m >> 10, from: (m >> 5) & 31, to: m & 31 });

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const sets = cfg && +cfg.sets === 3 ? 3 : 1;
    // deal: "pick" = 후공이 카드를 나눔 (방송) · 그 밖(옛 기록 · 값 없음)은 무작위
    const st = { n: 2, rs: (seed >>> 0) || 1, sets, maxSets: sets === 3 ? 5 : 1, deal: cfg && cfg.deal === "pick" ? "pick" : "rand", set: 0, wins: [0, 0], first: 0, log: [], seq: 0, over: false, phase: "play", res: null };
    startSet(st);
    return st;
  }
  function startSet(st) {
    st.set++; st.phase = "play"; st.tc = 0; st.last = null; st.res = null;
    st.cells = Array(NS).fill(0); st.face = Array(NS).fill(0);
    for (let c = 0; c < SZ; c++) { st.cells[20 + c] = 1; st.face[20 + c] = -1; st.cells[c] = 2; st.face[c] = 1; }
    const F = st.first;
    if (st.deal === "pick") {                                       // 후공이 나누기 전: 카드는 아직 아무에게도 없음
      st.phase = "deal"; st.hand = [[], []]; st.wait = -1; st.turn = F;
      push(st, { k: "start", set: st.set, first: F, deal: 1 });
      return;
    }
    const d = shuffle(() => rnd(st), [0, 1, 2, 3, 4]);
    st.hand = []; st.hand[F] = [d[0], d[1]]; st.hand[1 - F] = [d[2], d[3]]; st.wait = d[4]; st.turn = F;
    push(st, { k: "start", set: st.set, first: F, hand: [st.hand[0].slice(), st.hand[1].slice()], wait: st.wait });
  }

  // ── 카드 나누기 (후공): 선공 앞 2장 · 내 앞 2장 · 남는 1장은 대기 — 5장 중 순서 없이 고르면 5C2 × 3C2 = 30가지 ──
  const DEAL_CARDS = [0, 1, 2, 3, 4];
  const ARR = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const rest = DEAL_CARDS.filter(c => c !== i && c !== j);
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) ARR.push({ opp: [i, j], me: [rest[p], rest[q]], wait: rest[3 - p - q] });
  }
  const dealAct = ar => ({ t: "deal", me: ar.me.slice(), opp: ar.opp.slice() });
  function normDeal(a) {
    if (!a || typeof a !== "object" || a.t !== "deal") return null;
    const c4 = c => Number.isInteger(c) && c >= 0 && c <= 4;                  // 구멍 난 배열([ ,1])은 every 가 건너뛰므로 칸을 직접 봄
    const ok2 = x => Array.isArray(x) && x.length === 2 && c4(x[0]) && c4(x[1]);
    if (!ok2(a.me) || !ok2(a.opp)) return null;
    const me = a.me.slice().sort((p, q) => p - q), opp = a.opp.slice().sort((p, q) => p - q);
    if (new Set([...me, ...opp]).size !== 4) return null;
    return { me, opp, wait: DEAL_CARDS.find(c => !me.includes(c) && !opp.includes(c)) };
  }
  const arrIdx = a => { const d = normDeal(a); return d ? ARR.findIndex(x => x.opp[0] === d.opp[0] && x.opp[1] === d.opp[1] && x.me[0] === d.me[0] && x.me[1] === d.me[1]) : -1; };
  function applyDeal(st, seat, a) {
    const D = 1 - st.first;
    if (seat !== D) return { ok: false, err: "지금은 차례가 아니에요" };
    const d = normDeal(a);
    if (!d) return { ok: false, err: "카드를 상대 앞 2장 · 내 앞 2장으로 나눠 주세요" };
    st.hand[D] = d.me; st.hand[st.first] = d.opp; st.wait = d.wait; st.phase = "play"; st.turn = st.first;
    push(st, { k: "deal", set: st.set, s: D, hand: [st.hand[0].slice(), st.hand[1].slice()], wait: d.wait });
    return { ok: true };
  }

  const needs = st => st.over ? [] : st.phase === "deal" ? [1 - st.first] : st.phase === "play" ? [st.turn] : [];
  const over = st => !!st.over;
  function ranks(st) { return st.wins[0] === st.wins[1] ? [0, 0] : st.wins[0] > st.wins[1] ? [0, 1] : [1, 0]; }
  const legal = (x, seat) => x.over ? [] : x.phase === "deal" ? (seat === 1 - x.first ? ARR.map(dealAct) : []) : x.phase !== "play" || seat !== x.turn ? [] : genOf(x, seat).map(toAct);
  const count = (st, o) => st.cells.filter(c => c === o + 1).length;

  function endSet(st, w, why) {
    st.res = { w, why, set: st.set, cnt: [count(st, 0), count(st, 1)] };
    if (w >= 0) st.wins[w]++;
    push(st, { k: "set", set: st.set, w, why });
    st.phase = "between";
    const need = (st.sets >> 1) + 1;
    if (st.wins.some(x => x >= need) || st.set >= st.maxSets) { st.over = true; st.phase = "end"; push(st, { k: "end", wins: st.wins.slice() }); }
  }
  function byCount(st) { const a = count(st, 0), b = count(st, 1); endSet(st, a === b ? -1 : a > b ? 0 : 1, "turns"); }
  // 한 턴이 끝날 때의 판정: 전멸 → 성 버티기 → 60턴
  function turnEnd(st, s) {
    const o = 1 - s;
    if (!count(st, o)) { endSet(st, s, "wipe"); return true; }
    if (st.cells[CASTLE[s]] === o + 1) { endSet(st, o, "castle"); return true; }
    st.tc++;
    if (st.tc >= MAXTURN) { byCount(st); return true; }
    return false;
  }
  function apply(st, seat, a) {
    if (!st.over && st.phase === "deal") return applyDeal(st, seat, a);
    if (st.over || st.phase !== "play" || seat !== st.turn) return { ok: false, err: "지금은 차례가 아니에요" };
    const m = toInt(a);
    if (m < 0) return { ok: false, err: "카드와 말을 골라 주세요" };
    if (!genOf(st, seat).includes(m)) return { ok: false, err: whyNot(st, seat, a) };
    const slot = m >> 10, f = (m >> 5) & 31, t = m & 31, card = st.hand[seat][slot];
    const eff = effCard(card, total(st.cells)), cap = st.cells[t] !== 0, fc = st.face[f];
    st.hand[seat][slot] = st.wait; st.wait = card;
    st.cells[t] = st.cells[f]; st.cells[f] = 0; st.face[f] = 0;
    const row = (t / SZ) | 0;
    st.face[t] = (fc > 0 && row === SZ - 1) || (fc < 0 && row === 0) ? -fc : fc;
    st.last = { s: seat, from: f, to: t, c: eff, cap };
    push(st, { k: "mv", s: seat, slot, c: eff, from: f, to: t, cap, n: st.tc + 1 });
    if (turnEnd(st, seat)) return { ok: true };
    let nx = 1 - seat;
    if (!genOf(st, nx).length) {
      push(st, { k: "pass", s: nx, n: st.tc + 1 });
      if (turnEnd(st, nx)) return { ok: true };
      if (!genOf(st, seat).length) { byCount(st); return { ok: true }; }
      nx = seat;
    }
    st.turn = nx;
    return { ok: true };
  }
  function whyNot(st, seat, a) {
    if (st.cells[a.from] !== seat + 1) return "내 말을 골라 주세요";
    return "그 카드로는 거기로 못 가요";
  }
  const auto = st => st.phase === "between" && !st.over ? 2600 : null;
  function advance(st) {
    if (st.phase !== "between" || st.over) return;
    const w = st.res ? st.res.w : -1;
    st.first = w >= 0 ? 1 - w : 1 - st.first;
    startSet(st);
  }

  // ── 보이는 것 (전부 공개) ──────────────────────────────────
  function view(st, seat) {
    const tot = total(st.cells), eff = c => effCard(c, tot);
    const counts = [count(st, 0), count(st, 1)];
    const pubObj = { c: st.cells, f: st.face, h: st.hand, w: st.wait, t: st.turn, s: st.set, ws: st.wins, p: st.phase, o: st.over, tc: st.tc };
    return {
      n: 2, sets: st.sets, deal: st.deal, dealer: st.phase === "deal" ? 1 - st.first : -1, set: st.set, wins: st.wins.slice(), first: st.first, phase: st.phase, turn: st.turn, tc: st.tc, maxTurn: MAXTURN,
      cells: st.cells.slice(), face: st.face.slice(), hand: st.hand.map(h => h.map(eff)), wait: eff(st.wait), counts, castle: CASTLE.slice(),
      last: st.last ? Object.assign({}, st.last) : null, res: st.res ? Object.assign({}, st.res) : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.wins.slice(),
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI: 알파베타 (카드 순환까지 상태에 넣어 읽음) ───────────────
  function stateFrom(x) {
    return { cells: Int8Array.from(x.cells), face: Int8Array.from(x.face), hand: Int8Array.from([x.hand[0][0], x.hand[0][1], x.hand[1][0], x.hand[1][1]]), wait: x.wait, cnt: [x.cells.filter(c => c === 1).length, x.cells.filter(c => c === 2).length], nodes: 0, limit: 1e9, stop: 0, slack: 0, rv: [] };
  }
  const gens = (S, seat) => gen(S.cells, S.face, S.hand[seat * 2], S.hand[seat * 2 + 1], seat, S.cnt[0] + S.cnt[1]);
  function evalPos(S, seat) {
    let v = 0;
    for (let i = 0; i < NS; i++) {
      const c = S.cells[i]; if (!c) continue;
      const o = c - 1, tc = CASTLE[1 - o], d = Math.max(Math.abs(((i / SZ) | 0) - ((tc / SZ) | 0)), Math.abs(i % SZ - 2)), val = 100 + (4 - d) * 3;
      v += o === seat ? val : -val;
    }
    return v;
  }
  function ab(S, depth, alpha, beta, seat, ply, ext) {
    if (++S.nodes > S.limit) { S.stop = 1; return 0; }
    const opp = 1 - seat, mvs = gens(S, seat);
    if (!mvs.length) {
      if (S.cells[CASTLE[seat]] === opp + 1) return ply - WINV;
      if (!gens(S, opp).length) return Math.sign(S.cnt[seat] - S.cnt[opp]) * 50;
      return depth <= 1 ? evalPos(S, seat) : -ab(S, depth - 1, -beta, -alpha, opp, ply + 1, ext);
    }
    const keyed = mvs.map(m => { const t = m & 31; return (((S.cells[t] ? 120 : 0) + (t === CASTLE[opp] ? 100 : 0)) << 12) | m; }).sort((a, b) => b - a);
    let best = -Infinity;
    for (const km of keyed) {
      const m = km & 4095, slot = m >> 10, f = (m >> 5) & 31, t = m & 31, hi = seat * 2 + slot;
      const cap = S.cells[t], capF = S.face[t], fF = S.face[f], card = S.hand[hi], ow = S.wait;
      S.hand[hi] = ow; S.wait = card; S.cells[t] = S.cells[f]; S.cells[f] = 0;
      const row = (t / SZ) | 0; S.face[t] = (fF > 0 && row === SZ - 1) || (fF < 0 && row === 0) ? -fF : fF;
      if (cap) S.cnt[cap - 1]--;
      let v;
      if (!S.cnt[opp]) v = WINV - ply;
      else if (S.cells[CASTLE[seat]] === opp + 1) v = ply - WINV;
      else if (depth <= 1) v = !ext && (cap || t === CASTLE[opp]) ? -ab(S, 1, -beta, -alpha, opp, ply + 1, true) : evalPos(S, seat);
      else v = -ab(S, depth - 1, -beta, -alpha, opp, ply + 1, ext);
      if (cap) S.cnt[cap - 1]++;
      S.cells[f] = S.cells[t]; S.face[f] = fF; S.cells[t] = cap; S.face[t] = capF; S.wait = ow; S.hand[hi] = card;
      if (S.stop) return 0;
      if (ply === 0) S.rv.push([m, v]);
      if (v > best) best = v;
      if (ply === 0) { if (best - S.slack - 1 > alpha) alpha = best - S.slack - 1; }
      else { if (best > alpha) alpha = best; if (alpha >= beta) break; }
    }
    return best;
  }
  // 단계: depth = 읽는 수 · nodes = 읽는 양(깊이를 늘려 가다 이만큼 넘으면 멈춤) · slack = 이 점수 안쪽이면 아무거나 · rand = 아무 수나 둘 확률
  const TIER = {
    easy: { depth: 1, nodes: 0, slack: 60, rand: 0.3 },
    normal: { depth: 3, nodes: 12000, slack: 12, rand: 0.05 },
    hard: { depth: 6, nodes: 30000, slack: 0, rand: 0 },
  };
  function think(S, seat, tier, r) {
    const cfg = TIER[tier] || TIER.normal, mvs = gens(S, seat);
    if (!mvs.length) return -1;
    if (cfg.rand && r() < cfg.rand) return mvs[Math.floor(r() * mvs.length)];
    S.slack = cfg.slack; S.limit = cfg.nodes || 1e9; S.nodes = 0;
    let best = null;
    for (let d = 1; d <= cfg.depth; d++) {
      S.rv = []; S.stop = 0;
      ab(S, d, -Infinity, Infinity, seat, 0, false);
      if (S.stop) break;
      best = S.rv;
      if (Math.abs(Math.max(...best.map(x => x[1]))) > WINV - 50) break;   // 이기는 길 · 어차피 지는 길이 보임
    }
    if (!best) { S.limit = 1e9; S.rv = []; S.stop = 0; ab(S, 1, -Infinity, Infinity, seat, 0, false); best = S.rv; }
    const top = Math.max(...best.map(x => x[1])), ok = best.filter(x => x[1] >= top - cfg.slack);
    return ok[Math.floor(r() * ok.length) % ok.length][0];
  }
  // ── 카드 나누기 AI ──
  // 판이 180° 돌려도 처음 모습이 같아서, 선공이 백이든 흑이든 같은 값. 첫 수 가짓수 = 처음 모습에서 카드 하나로 둘 수 있는 수 (점퍼 0 · 룩 5 · 비숍 8 · 나이트 14 · 어태커 18)
  const START = (() => { const cells = Array(NS).fill(0), face = Array(NS).fill(0); for (let c = 0; c < SZ; c++) { cells[20 + c] = 1; face[20 + c] = -1; cells[c] = 2; face[c] = 1; } return { cells, face }; })();
  const OPEN = DEAL_CARDS.map(card => gen(START.cells, START.face, card, card, 0, 10).filter(m => (m >> 10) === 0).length);
  const openMoves = card => OPEN[card];
  // 작전 점수 = (내 앞 두 장의 첫 수 가짓수) − (선공 앞 두 장의 첫 수 가짓수): 선공의 선택을 좁히고 내 선택은 넓히는 순서
  const planOf = ar => ar.me.reduce((s, c) => s + OPEN[c], 0) - ar.opp.reduce((s, c) => s + OPEN[c], 0);
  const PLAN_ORDER = ARR.map((_, i) => i).sort((x, y) => planOf(ARR[y]) - planOf(ARR[x]) || x - y);
  // AI 끼리(중급) 배치마다 1500판씩 둔 후공 점수(%) — survival/test/cardchess_deal_table.js 가 만든 값. 30가지가 46~52% 로 거의 같음 (우연 오차 안쪽): 배치만으로 크게 갈리진 않음
  const DEAL_TABLE = { tier: "normal", games: 1500, key: "0123,0124,0134,0213,0214,0234,0312,0314,0324,0412,0413,0423,1203,1204,1234,1302,1304,1324,1402,1403,1423,2301,2304,2314,2401,2403,2413,3401,3402,3412",
    pct: [48.3, 49.5, 49.9, 51.5, 47.7, 49.4, 48.9, 49.7, 50.2, 48.8, 50, 49.7, 50.7, 50.1, 49.5, 51.2, 48.1, 50.9, 48.4, 51.7, 50.7, 49.5, 48.7, 50.8, 48.1, 47.8, 48.9, 49.2, 46.1, 48.5] };
  const DEAL_KEY = ARR.map(a => a.opp.join("") + a.me.join("")).join(",");
  const DEAL_TIER = { easy: { top: 30 }, normal: { top: 8 }, hard: { top: 2 } };   // 작전 점수 순서 위에서 몇 가지 안에서 아무거나
  function dealChoice(tier, r) {
    const cfg = DEAL_TIER[tier] || DEAL_TIER.normal;
    return ARR[PLAN_ORDER[Math.floor(r() * cfg.top) % cfg.top]];
  }
  function ai(V, seat, tier, r) {
    if (V.over) return null;
    if (V.phase === "deal") return V.dealer === seat ? dealAct(dealChoice(tier, r || Math.random)) : null;
    if (V.phase !== "play" || V.turn !== seat) return null;
    const m = think(stateFrom(V), seat, tier, r || Math.random);
    return m < 0 ? null : toAct(m);
  }

  // ── 선생님이 쓰는 보조 (전부 보이는 판이라 그대로 읽음) ─────────
  // 상대가 다음 차례에 잡을 수 있는 seat 쪽 말 (상대 앞 카드 2장은 내 수로 바뀌지 않음)
  function attacked(x, seat) {
    const set = new Set();
    for (const m of genOf(x, 1 - seat)) if (x.cells[m & 31] === seat + 1) set.add(m & 31);
    return [...set].sort((a, b) => a - b);
  }
  function simulate(V, me, a) {
    const m = toInt(a); if (m < 0) return null;
    const S = stateFrom(V), slot = m >> 10, f = (m >> 5) & 31, t = m & 31, hi = me * 2 + slot, cap = S.cells[t];
    const card = S.hand[hi]; S.hand[hi] = S.wait; S.wait = card;
    const fc = S.face[f], row = (t / SZ) | 0;
    S.cells[t] = S.cells[f]; S.cells[f] = 0; S.face[t] = (fc > 0 && row === SZ - 1) || (fc < 0 && row === 0) ? -fc : fc;
    if (cap) S.cnt[cap - 1]--;
    return { S, f, t, cap };
  }
  // 한 수의 뜻 태그: win · capture · castle(상대 성에 오름) · defend(내 성에 선 말을 잡음) · escape(잡힐 말을 피함) · danger(도착 칸이 잡힘) · trade(잡고 잡힘) · safe
  function explain(V, me, a) {
    const sim = simulate(V, me, a); if (!sim) return { tags: [] };
    const { S, f, t, cap } = sim, opp = 1 - me, tags = [];
    const asX = S2 => ({ cells: Array.from(S2.cells), face: Array.from(S2.face), hand: [[S2.hand[0], S2.hand[1]], [S2.hand[2], S2.hand[3]]] });
    const after = asX(S), wasHit = attacked(V, me).includes(f);
    const dangerNow = genOf(after, opp).some(m => (m & 31) === t);
    if (!S.cnt[opp]) tags.push("win");
    if (cap) tags.push("capture");
    if (t === CASTLE[opp]) tags.push("castle");
    if (cap && t === CASTLE[me]) tags.push("defend");
    if (wasHit && !dangerNow) tags.push("escape");
    if (dangerNow) tags.push(cap ? "trade" : "danger"); else if (!tags.includes("escape")) tags.push("safe");
    return { tags };
  }
  function recommend(V, me) {
    const m = think(stateFrom(V), me, "hard", () => 0.5);
    if (m < 0) return null;
    const a = toAct(m);
    return Object.assign({ a }, explain(V, me, a));
  }
  function analyze(V, me) {
    if (V.phase === "deal") return { counts: V.counts.slice(), hanging: [], targets: [], rec: null, deal: V.dealer === me ? dealReport(me) : null };
    return { counts: V.counts.slice(), hanging: attacked(V, me), targets: attacked(V, 1 - me), rec: V.over || V.phase !== "play" || V.turn !== me ? null : recommend(V, me), deal: null };
  }

  // ── 카드 나누기 · 수 비교의 숫자 근거 (선생님 · 복기) ───────────────
  // 후공(나누는 쪽)용 묶음: 추천(작전 점수가 가장 높은 배치) · 카드별 첫 수 가짓수 · AI 끼리 둔 점수표의 범위
  function dealReport(seat) {
    const P = DEAL_TABLE.pct, best = PLAN_ORDER[0], mean = P.reduce((x, y) => x + y, 0) / P.length;
    return { best: Object.assign({ a: dealAct(ARR[best]), v: P[best], plan: planOf(ARR[best]) }, ARR[best]), open: OPEN.slice(), min: Math.min(...P), max: Math.max(...P), mean: Math.round(mean * 10) / 10, count: ARR.length, games: DEAL_TABLE.games, seat };
  }
  function dealScore(a) {                                       // 내 배치의 점수표 값 · 작전 점수 (없는 배치면 null)
    const i = arrIdx(a); if (i < 0) return null;
    return { v: DEAL_TABLE.pct[i], plan: planOf(ARR[i]), bestPlan: planOf(ARR[PLAN_ORDER[0]]), optOpen: ARR[i].opp.map(c => OPEN[c]), myOpen: ARR[i].me.map(c => OPEN[c]), arr: ARR[i] };
  }
  // 내 차례의 모든 수를 같은 깊이로 읽은 점수 (큰 순) — 복기에서 '내 수'와 '추천 수'의 차이를 숫자로 보임
  function evalMoves(V, me, nodes) {
    if (V.over || V.phase !== "play" || V.turn !== me) return null;
    const S = stateFrom(V);
    if (!gens(S, me).length) return [];
    S.slack = 1e9; S.limit = nodes || 40000; S.nodes = 0;
    let best = null;
    for (let d = 1; d <= 6; d++) {
      S.rv = []; S.stop = 0;
      ab(S, d, -Infinity, Infinity, me, 0, false);
      if (S.stop) break;
      best = S.rv;
      if (Math.abs(Math.max(...best.map(x => x[1]))) > WINV - 50) break;
    }
    if (!best) { S.limit = 1e9; S.rv = []; S.stop = 0; ab(S, 1, -Infinity, Infinity, me, 0, false); best = S.rv; }
    return best.map(x => ({ a: toAct(x[0]), v: x[1] })).sort((x, y) => y.v - x.v);
  }

  return {
    id: "cardchess", SZ, MAXTURN, CARDS, CASTLE, TIER, WINV, ARR, DEAL_TIER, DEAL_TABLE, DEAL_KEY, PLAN_ORDER,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    gen, effCard, attacked, explain, recommend, analyze, dealReport, dealScore, openMoves, evalMoves,
  };
});

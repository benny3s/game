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
   방송과 다른 점 · 우리가 정한 것 (원문에 없음)
   · 시작 카드는 무작위로 나눔 (방송은 후공이 고름). 말 종류는 모두 같고 카드가 이동을 정함 · 선공 = 백
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
    const st = { n: 2, rs: (seed >>> 0) || 1, sets, maxSets: sets === 3 ? 5 : 1, set: 0, wins: [0, 0], first: 0, log: [], seq: 0, over: false, phase: "play", res: null };
    startSet(st);
    return st;
  }
  function startSet(st) {
    st.set++; st.phase = "play"; st.tc = 0; st.last = null; st.res = null;
    st.cells = Array(NS).fill(0); st.face = Array(NS).fill(0);
    for (let c = 0; c < SZ; c++) { st.cells[20 + c] = 1; st.face[20 + c] = -1; st.cells[c] = 2; st.face[c] = 1; }
    const d = shuffle(() => rnd(st), [0, 1, 2, 3, 4]), F = st.first;
    st.hand = []; st.hand[F] = [d[0], d[1]]; st.hand[1 - F] = [d[2], d[3]]; st.wait = d[4]; st.turn = F;
    push(st, { k: "start", set: st.set, first: F, hand: [st.hand[0].slice(), st.hand[1].slice()], wait: st.wait });
  }
  const needs = st => st.over || st.phase !== "play" ? [] : [st.turn];
  const over = st => !!st.over;
  function ranks(st) { return st.wins[0] === st.wins[1] ? [0, 0] : st.wins[0] > st.wins[1] ? [0, 1] : [1, 0]; }
  const legal = (x, seat) => x.over || x.phase !== "play" || seat !== x.turn ? [] : genOf(x, seat).map(toAct);
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
      n: 2, sets: st.sets, set: st.set, wins: st.wins.slice(), first: st.first, phase: st.phase, turn: st.turn, tc: st.tc, maxTurn: MAXTURN,
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
  function ai(V, seat, tier, r) {
    if (V.over || V.phase !== "play" || V.turn !== seat) return null;
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
    return { counts: V.counts.slice(), hanging: attacked(V, me), targets: attacked(V, 1 - me), rec: V.over || V.phase !== "play" || V.turn !== me ? null : recommend(V, me) };
  }

  return {
    id: "cardchess", SZ, MAXTURN, CARDS, CASTLE, TIER,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    gen, effCard, attacked, explain, recommend, analyze,
  };
});

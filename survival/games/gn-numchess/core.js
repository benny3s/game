/* 베니 서바이벌 · 숫자장기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 그랜드 파이널 (시즌 4) · 12화 결승 1회전 (장동민 vs 김경훈) — tvN 공식 룰 영상 「Finals Round 1 Number Janggi Rules Video」 판 그림 확인
   · 판 가로 9 × 세로 6 = 54칸 (방송 그림처럼 두 사람이 왼쪽 · 오른쪽에 앉음). 자기 앞 3줄(3칸 × 6)이 자기 진영
   · 각자 말 14개: 숫자 1~10 · 지뢰 3 · 왕 1. 자기 진영 18칸 중 14칸에 몰래 배치하고 뒤집어 둠 → 선 플레이어부터 번갈아 말 1개 이동
   · 이동: 양옆(좌 · 우) · 앞 대각선 1칸, 앞으로 최대 2칸 (2칸 때 뛰어넘기 금지) · 뒤 · 뒤 대각선 금지 · 말이 있는 칸 금지 · 지뢰는 못 움직임
   · 이동 뒤 상대 말과 앞 · 뒤 · 좌 · 우로 맞닿으면 바로 대결 (여럿이면 동시에, 제거 조건이 하나라도 맞으면 제거)
     두 숫자 합이 10 이상이면 큰 수, 10 미만이면 작은 수가 이김 · 같은 숫자는 둘 다 제거
     판에 마이너스 표시 18개 (세로 2·3줄 사이 · 4·5줄 사이 경계, 칸마다 하나 — 방송 그림) — 그 사이로 맞닿으면 '큰 수 − 작은 수'로 같은 규칙
     지뢰와 대결하면 둘 다 제거 · 왕은 대결 능력 없음 (닿으면 잡힘 → 상대 승) · 왕끼리는 아무 일 없음
     대결한 말은 앞면 공개 (BLIND 를 쓴 말은 결과만)
   · 내 말이 상대 진영 맨 끝 줄에 닿으면 그 말 대신 이미 제거된 내 말 하나를 숫자 공개로 내 진영 맨 끝 줄에 되살릴 수 있음
   · 승리: ① 상대가 말을 못 움직임 (방송: 60초 안에) ② 상대 왕을 잡음 ③ 상대의 왕 빼고 모든 말을 잡음 ④ 내 왕이 상대 진영 맨 끝 줄에 닿음
   · 결승 아이템 (옵션, 기본 켬 — 각자 +1 · −1 · BLIND 한 번씩): 대결 전에 쓸지 정함, 그 대결에만
   방송과 다른 점 · 우리가 정한 것: 아이템은 각자 한 벌씩 (방송은 탈락자들이 준 아이템이라 장동민 BLIND · −1 · 아이템 복사, 김경훈 +1 · 무효화) ·
     선은 동전 대신 씨앗 무작위 · 60초 제한은 옵션 (기본 끔) · 200수(각 100수)가 넘으면 남은 말이 많은 쪽 승 (같으면 무승부) ·
     ③을 두 사람이 한 수에 함께 이루면 움직인 쪽 승 · 되살리기로 내보낸 말은 공개하지 않음
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 view 에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-numchess"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const W = 9, H = 6, NC = W * H, MINE = 11, KING = 12, NP = 14, MAXPLY = 200, WINV = 100;
  const FWD = [1, -1], BACK = [0, 8], FAR = [8, 0];
  const LETX = "ABCDEFGHI";
  const X = i => i % W, Y = i => (i / W) | 0, at = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
  const cellName = i => (i >= 0 && i < NC ? LETX[X(i)] + (Y(i) + 1) : "?");
  // 마이너스 표시: 세로 2·3줄 사이(y 1|2) · 4·5줄 사이(y 3|4), 가로 9칸마다 하나씩 → 18개
  const MINUS_Y = [1, 3];
  const isMinus = (i, j) => X(i) === X(j) && Math.abs(Y(i) - Y(j)) === 1 && MINUS_Y.includes(Math.min(Y(i), Y(j)));
  const N4 = Array.from({ length: NC }, (_, i) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => inb(X(i) + dx, Y(i) + dy)).map(([dx, dy]) => at(X(i) + dx, Y(i) + dy)));
  const inCamp = (s, i) => (s === 0 ? X(i) <= 2 : X(i) >= 6);
  // 진영 칸 번호 k (0..17): 내 쪽에서 본 왼쪽→오른쪽 y = k/3 · 깊이 d = k%3 (0 = 맨 끝 줄, 2 = 앞줄). 자리 1 은 판을 180° 돌려 봄
  const slotCell = (s, k) => { const d = k % 3, y = (k / 3) | 0; return s === 0 ? at(d, y) : at(8 - d, 5 - y); };
  const cellSlot = (s, i) => { if (!inCamp(s, i)) return -1; const d = s === 0 ? X(i) : 8 - X(i), y = s === 0 ? Y(i) : 5 - Y(i); return y * 3 + d; };
  const VALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, MINE, MINE, MINE, KING];
  const vName = v => (v === MINE ? "지뢰" : v === KING ? "왕" : v == null ? "?" : String(v));

  // ── 옵션 ──
  const OPTS = { items: [1, 0], limit: [0, 60], marks: [0, 1] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 400) st.log.shift(); }

  // ── 대결 판정 ──
  // 두 숫자(아이템 반영 값 0~11): [a 제거, b 제거]
  function numDuel(a, b, t) {
    if (a === b) return [true, true];
    const k = t === "minus" ? Math.abs(a - b) : a + b;
    const big = a > b;
    return k >= 10 ? [!big, big] : [big, !big];      // 10 이상 → 큰 수 승 · 미만 → 작은 수 승
  }
  // 말 대 말 (va · vb = 말 종류, ea · eb = 아이템 반영 숫자): [a 제거, b 제거]
  function duel(va, ea, vb, eb, t) {
    if (va === KING || vb === KING) return [va === KING && vb !== KING, vb === KING && va !== KING];
    if (va === MINE || vb === MINE) return [true, true];
    return numDuel(ea, eb, t);
  }

  // ── 판 ──
  function gridOf(pcs) { const g = Array(NC).fill(-1); for (const p of pcs) if (!p.out && p.c >= 0) g[p.c] = p.id; return g; }
  // 말 하나가 갈 수 있는 칸 (g = 칸 → 말 id)
  function destOf(g, s, c, v) {
    if (v === MINE || c < 0) return [];
    const x = X(c), y = Y(c), f = FWD[s], out = [];
    const ok = (xx, yy) => inb(xx, yy) && g[at(xx, yy)] < 0;
    for (const [dx, dy] of [[0, -1], [0, 1], [f, -1], [f, 1], [f, 0]]) if (ok(x + dx, y + dy)) out.push(at(x + dx, y + dy));
    if (ok(x + f, y) && ok(x + 2 * f, y)) out.push(at(x + 2 * f, y));
    return out;
  }
  function movesOf(pcs, g, s) {
    const out = [];
    for (const p of pcs) if (p.s === s && !p.out && p.c >= 0 && p.v !== MINE) for (const t of destOf(g, s, p.c, p.v)) out.push({ t: "mv", from: p.c, to: t });
    return out;
  }
  const oppNb = (st, c, s) => N4[c].map(j => st.grid[j]).filter(id => id >= 0 && st.pcs[id].s !== s);

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    void n;
    const o = optsOf(cfg || {}), rs = (seed >>> 0) || 1;
    const st = { n: 2, rs, cfg: Object.assign({}, cfg || {}), opt: o, first: mix(rs, 31) < 0.5 ? 0 : 1, turn: -1, phase: "setup",
      lay: [null, null], pcs: [], grid: Array(NC).fill(-1), items: [0, 1].map(() => (o.items ? { p: 1, m: 1, b: 1 } : { p: 0, m: 0, b: 0 })),
      ply: 0, turns: [0, 0], fight: null, revv: null, last: null, lastMv: null, log: [], seq: 0, over: false, res: null,
      sd: [Math.floor(mix(rs, 7, 0) * 4294967296) >>> 0, Math.floor(mix(rs, 7, 1) * 4294967296) >>> 0] };
    for (let s = 0; s < 2; s++) VALS.forEach((v, k) => st.pcs.push({ id: s * NP + k, s, v, c: -1, out: false, rev: false, mv: 0, lp: -1, ex: false }));
    push(st, { k: "start", first: st.first });
    return st;
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "setup") return [0, 1].filter(s => !st.lay[s]);
    if (st.phase === "play") return [st.turn];
    if (st.phase === "item") return st.fight.need.filter(s => !st.fight.ch[s]);
    if (st.phase === "revive") return [st.revv.s];
    return [];
  }
  const over = st => !!st.over;
  function ranks(st) { if (!st.over || !st.res) return [0, 0]; const w = st.res.w; return w < 0 ? [0, 0] : [w === 0 ? 0 : 1, w === 1 ? 0 : 1]; }
  const auto = () => null;
  function advance() {}

  function checkLay(lay) {
    if (!Array.isArray(lay) || lay.length !== 18) return "진영 18칸을 모두 정해요";
    const cnt = {};
    for (const v of lay) { if (!(v === 0 || (Number.isInteger(v) && v >= 1 && v <= KING))) return "말 값이 이상해요"; cnt[v] = (cnt[v] || 0) + 1; }
    for (let v = 1; v <= 10; v++) if (cnt[v] !== 1) return `숫자 ${v} 말을 하나 놓아요`;
    if (cnt[MINE] !== 3) return "지뢰 3개를 놓아요";
    if (cnt[KING] !== 1) return "왕을 하나 놓아요";
    return "";
  }
  function place(st) {
    // 말 번호는 칸 순서로 매김 (번호로 값을 알 수 없게)
    for (let s = 0; s < 2; s++) {
      let n = 0;
      st.lay[s].forEach((v, k) => {
        if (!v) return;
        const p = st.pcs[s * NP + n++];
        p.v = v; p.c = slotCell(s, k); st.grid[p.c] = p.id;
      });
    }
    st.phase = "play"; st.turn = st.first;
    push(st, { k: "ready", first: st.first });
  }
  const live = (st, s) => st.pcs.filter(p => p.s === s && !p.out);
  const legalMoves = (st, s) => movesOf(st.pcs, st.grid, s);

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "setup") {
      if (a.t !== "setup") return { ok: false, err: "먼저 말을 배치해요" };
      const e = checkLay(a.lay); if (e) return { ok: false, err: e };
      st.lay[seat] = a.lay.slice();
      push(st, { k: "setup", s: seat });
      if (st.lay[0] && st.lay[1]) place(st);
      return { ok: true };
    }
    if (st.phase === "play") {
      if (a.t === "timeout") {
        if (!st.opt.limit) return { ok: false, err: "시간 제한이 꺼져 있어요" };
        push(st, { k: "timeout", s: seat });
        finish(st, 1 - seat, "time");
        return { ok: true };
      }
      if (a.t !== "mv") return { ok: false, err: "말을 움직여요" };
      const from = a.from, to = a.to;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= NC || to >= NC) return { ok: false, err: "칸을 골라요" };
      const id = st.grid[from];
      if (id < 0 || st.pcs[id].s !== seat) return { ok: false, err: "내 말을 골라요" };
      const p = st.pcs[id];
      if (p.v === MINE) return { ok: false, err: "지뢰는 움직일 수 없어요" };
      if (!destOf(st.grid, seat, from, p.v).includes(to)) return { ok: false, err: "그 칸으로는 못 가요 (양옆 · 앞 대각선 1칸 · 앞으로 2칸까지)" };
      st.grid[from] = -1; st.grid[to] = id; p.c = to; p.mv++; st.ply++; st.turns[seat]++; p.lp = st.ply;
      st.lastMv = { s: seat, id, from, to, ply: st.ply };
      push(st, { k: "mv", s: seat, id, from, to, ply: st.ply });
      const nb = oppNb(st, to, seat);
      if (nb.length) startFight(st, seat, id, nb, "mv"); else afterAction(st, seat, id);
      return { ok: true };
    }
    if (st.phase === "item") {
      if (a.t !== "item") return { ok: false, err: "아이템을 쓸지 정해요" };
      const e = checkItem(st, seat, a.use); if (e) return { ok: false, err: e };
      st.fight.ch[seat] = (a.use || []).map(u => ({ k: u.k, id: u.id }));
      if (!needs(st).length) resolveFight(st);
      return { ok: true };
    }
    if (st.phase === "revive") {
      if (a.t !== "revive") return { ok: false, err: "되살릴 말을 정해요" };
      const R = st.revv, arr = st.pcs[R.id];
      if (a.skip) { push(st, { k: "keep", s: seat, id: R.id }); st.revv = null; nextTurn(st, seat); return { ok: true }; }
      const id = a.id, to = a.to;
      if (!Number.isInteger(id) || id < 0 || id >= 2 * NP) return { ok: false, err: "되살릴 말을 골라요" };
      const p = st.pcs[id];
      if (p.s !== seat || !p.out || p.v === KING || id === R.id) return { ok: false, err: "제거된 내 말만 되살려요" };
      if (!Number.isInteger(to) || to < 0 || to >= NC || X(to) !== BACK[seat] || st.grid[to] >= 0) return { ok: false, err: "내 진영 맨 끝 줄의 빈칸에 놓아요" };
      st.grid[arr.c] = -1; const exAt = arr.c; arr.out = true; arr.ex = true; arr.c = -1;
      p.out = false; p.ex = false; p.c = to; p.rev = true; p.mv = 0; p.lp = st.ply; st.grid[to] = id;
      const ev = { k: "rev", s: seat, id, v: p.v, to, ex: R.id, exAt, exv: arr.rev ? arr.v : null };
      push(st, ev); st.last = Object.assign({}, ev);
      st.revv = null;
      const nb = oppNb(st, to, seat);
      if (nb.length) startFight(st, seat, id, nb, "rev"); else afterAction(st, seat, id);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }

  // 아이템: 이 대결에 낸 내 말 중 숫자 말에만 +1 · −1, BLIND 는 왕 말고 아무 말
  function fightPcs(st, F, s) { const out = []; if (st.pcs[F.a].s === s) out.push(F.a); for (const q of F.pairs) if (st.pcs[q.b].s === s) out.push(q.b); return out; }
  // 묻는 자리는 '아이템이 남았나'로만 정함 (말 값으로 정하면 묻는지 여부로 상대 말이 드러남)
  function canItems(st, F, s) { const it = st.items[s]; return it.p > 0 || it.m > 0 || it.b > 0; }
  function checkItem(st, s, use) {
    if (use == null) return "";
    if (!Array.isArray(use) || use.length > 3) return "아이템 고르기가 이상해요";
    const mine = fightPcs(st, st.fight, s), seen = new Set(), on = {};
    for (const u of use) {
      if (!u || !["p", "m", "b"].includes(u.k) || seen.has(u.k)) return "아이템은 종류마다 한 번";
      seen.add(u.k);
      if (!(st.items[s][u.k] > 0)) return "이미 쓴 아이템이에요";
      if (!mine.includes(u.id)) return "이 대결에 나온 내 말에만 써요";
      const p = st.pcs[u.id];
      if ((u.k === "p" || u.k === "m") && p.v > 10) return "+1 · −1 은 숫자 말에만";
      if (u.k === "b" && p.v === KING) return "왕에는 못 써요";
      if (u.k !== "b") { if (on[u.id]) return "+1 과 −1 을 한 말에 같이 쓸 수 없어요"; on[u.id] = 1; }
    }
    return "";
  }
  function startFight(st, s, aid, nb, src) {
    const ac = st.pcs[aid].c;
    const F = { s, a: aid, at: ac, src, pairs: nb.map(b => ({ b, t: isMinus(ac, st.pcs[b].c) ? "minus" : "sum" })), need: [], ch: [null, null] };
    st.fight = F;
    if (st.opt.items) F.need = [s, 1 - s].filter(q => canItems(st, F, q));
    if (F.need.length) { st.phase = "item"; push(st, { k: "fightq", s, a: aid, at: ac, pairs: F.pairs.map(q => ({ b: q.b, t: q.t })), need: F.need.slice() }); }
    else resolveFight(st);
  }
  function resolveFight(st) {
    const F = st.fight, A = st.pcs[F.a], mod = {}, blind = {}, use = [];
    for (const s of [0, 1]) for (const u of F.ch[s] || []) { use.push({ s, k: u.k, id: u.id }); st.items[s][u.k]--; if (u.k === "p") mod[u.id] = 1; else if (u.k === "m") mod[u.id] = -1; else blind[u.id] = 1; }
    const eff = p => (p.v <= 10 ? p.v + (mod[p.id] || 0) : p.v);
    let aDie = false, loser = -1;
    const pairs = F.pairs.map(q => {
      const B = st.pcs[q.b], [ad, bd] = duel(A.v, eff(A), B.v, eff(B), q.t);
      if (ad) aDie = true;
      return { b: q.b, t: q.t, vb: B.v, eb: eff(B), ad, bd };
    });
    if (A.v === KING && pairs.some(q => q.vb !== KING)) loser = A.s;
    else if (A.v !== KING && pairs.some(q => q.vb === KING)) loser = 1 - A.s;
    const ev = { k: "fight", s: F.s, src: F.src, a: A.id, va: A.v, ea: eff(A), at: A.c, pairs: pairs.map(q => ({ b: q.b, t: q.t, vb: q.vb, eb: q.eb, ad: q.ad, bd: q.bd, bc: st.pcs[q.b].c })), use, blind: Object.keys(blind).map(Number), aDie };
    // 공개 (BLIND 쓴 말은 결과만)
    if (!blind[A.id]) A.rev = true;
    for (const q of pairs) if (!blind[q.b]) st.pcs[q.b].rev = true;
    const kill = p => { st.grid[p.c] = -1; p.out = true; p.outPly = st.ply; };
    for (const q of pairs) if (q.bd) kill(st.pcs[q.b]);
    if (aDie) kill(A);
    push(st, ev); st.last = JSON.parse(JSON.stringify(ev));
    st.fight = null; st.phase = "play";
    if (loser >= 0) { finish(st, 1 - loser, "king"); return; }
    afterAction(st, F.s, aDie ? -1 : A.id);
  }
  const noneLeft = (st, s) => !st.pcs.some(p => p.s === s && !p.out && p.v !== KING);
  function canRevive(st, s) {
    if (!st.pcs.some(p => p.s === s && p.out && p.v !== KING)) return false;
    for (let y = 0; y < H; y++) if (st.grid[at(BACK[s], y)] < 0) return true;
    return false;
  }
  function afterAction(st, s, pid) {
    const z0 = noneLeft(st, 0), z1 = noneLeft(st, 1);
    if (z0 || z1) { finish(st, z0 && z1 ? s : z0 ? 1 : 0, "all"); return; }
    const p = pid >= 0 ? st.pcs[pid] : null;
    if (p && p.v === KING && X(p.c) === FAR[s]) { finish(st, s, "kingrun"); return; }
    if (p && X(p.c) === FAR[s] && canRevive(st, s)) { st.phase = "revive"; st.revv = { s, id: pid }; push(st, { k: "reviveq", s, id: pid }); return; }
    nextTurn(st, s);
  }
  function nextTurn(st, s) {
    st.phase = "play";
    if (st.ply >= MAXPLY) { byCount(st); return; }
    const o = 1 - s;
    st.turn = o;
    if (!legalMoves(st, o).length) { push(st, { k: "stuck", s: o }); finish(st, s, "stuck"); }
  }
  function byCount(st) {
    const c = [0, 1].map(s => live(st, s).filter(p => p.v !== KING).length);
    finish(st, c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1, "count");
  }
  function finish(st, w, why) {
    st.over = true; st.phase = "end"; st.fight = null; st.revv = null;
    st.res = { w, why, cnt: [0, 1].map(s => live(st, s).filter(p => p.v !== KING).length) };
    push(st, { k: "end", w, why });
  }

  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "setup") return [{ t: "setup", lay: layEasy(seeded(mix(st.rs, seat, 99) * 4294967296 >>> 0)) }];
    if (st.phase === "play") return legalMoves(st, seat);
    if (st.phase === "item") return [{ t: "item", use: [] }];
    if (st.phase === "revive") return [{ t: "revive", skip: true }];
    return [];
  }

  // ── 보이는 것 ──
  //  내 말 · 공개된 말만 값이 보여요. 배치는 둘 다 끝나야 상대 위치가 보이고, 아이템 고르기는 둘 다 고른 뒤 결과만. 끝나면 모두 공개.
  function vis(st, p, seat) { return seat === "all" || st.over || p.s === seat || p.rev; }
  function evFor(st, e, seat) {
    const x = JSON.parse(JSON.stringify(e));
    if (e.k === "fight") {
      const bl = new Set(e.blind || []), see = id => seat === "all" || st.over || st.pcs[id].s === seat || !bl.has(id);
      if (!see(e.a)) { x.va = null; x.ea = null; }
      x.pairs.forEach(q => { if (!see(q.b)) { q.vb = null; q.eb = null; } });
    }
    if (e.k === "rev" && (seat === "all" || st.over || st.pcs[e.ex].s === seat)) x.exv = st.pcs[e.ex].v;
    return x;
  }
  function pubKey(st) {
    return JSON.stringify({ p: st.phase, t: st.turn, ply: st.ply, ready: st.lay.map(l => !!l), pc: st.phase === "setup" ? null : st.pcs.map(p => [p.c, p.out ? 1 : 0, p.rev ? p.v : 0, p.mv]),
      it: st.items, f: st.fight ? [st.fight.a, st.fight.pairs.map(q => q.b), st.fight.ch.map(c => !!c)] : null, r: st.revv, o: st.over, res: st.res });
  }
  function view(st, seat) {
    const all = seat === "all";
    const pcs = st.pcs.map(p => ({ id: p.id, s: p.s, v: vis(st, p, seat) ? p.v : null, c: st.phase === "setup" && !st.over ? -1 : p.c, out: p.out, rev: p.rev, mv: p.mv, lp: p.lp, ex: p.ex }));
    const F = st.fight;
    return {
      n: 2, W, H, opt: Object.assign({}, st.opt), first: st.first, phase: st.phase, turn: st.turn, cur: st.phase === "play" && !st.over ? st.turn : -1,
      ply: st.ply, maxPly: MAXPLY, turns: st.turns.slice(), pcs, items: st.items.map(i => Object.assign({}, i)),
      ready: st.lay.map(l => !!l), lay: all ? st.lay.map(l => (l ? l.slice() : null)) : seat === 0 || seat === 1 ? (st.lay[seat] ? st.lay[seat].slice() : null) : null,
      fight: F ? { s: F.s, a: F.a, at: F.at, src: F.src, pairs: F.pairs.map(q => ({ b: q.b, t: q.t })), need: F.need.slice(), done: F.ch.map(c => !!c),
        mine: all ? F.ch.map(c => (c ? c.map(u => Object.assign({}, u)) : null)) : seat === 0 || seat === 1 ? (F.ch[seat] ? F.ch[seat].map(u => Object.assign({}, u)) : null) : null } : null,
      revv: st.revv ? Object.assign({}, st.revv) : null,
      last: st.last ? evFor(st, st.last, seat) : null, lastMv: st.lastMv ? Object.assign({}, st.lastMv) : null,
      sd: seat === 0 || seat === 1 ? st.sd[seat] : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      score: [0, 1].map(s => live(st, s).filter(p => p.v !== KING).length),
      log: st.log.map(e => evFor(st, e, seat)), seat, pub: hash(pubKey(st)).toString(36),
    };
  }

  // ═══ AI ═══════════════════════════════════════════════════════
  // 말의 값 (합 대결 72% · 마이너스 대결 28% 로 섞은 '이길 확률'에서): 1 · 10 · 9 · 2 가 크고 5 가 가장 작음
  const VAL = (() => {
    const o = Array(13).fill(0);
    for (let v = 1; v <= 10; v++) { let sw = 0, mw = 0; for (let u = 1; u <= 10; u++) if (u !== v) { if (!numDuel(v, u, "sum")[0]) sw++; if (!numDuel(v, u, "minus")[0]) mw++; } o[v] = 1 + 5 * (0.72 * sw / 9 + 0.28 * mw / 9); }
    o[MINE] = 2.6; o[KING] = 0;
    return o;
  })();
  const CB = (() => { const c = []; for (let n = 0; n <= 32; n++) { c[n] = []; for (let k = 0; k <= n; k++) c[n][k] = k === 0 || k === n ? 1 : c[n - 1][k - 1] + c[n - 1][k]; } return c; })();
  const C = (n, k) => (k < 0 || n < 0 || k > n ? 0 : CB[n][k]);
  const point = v => { const d = new Float64Array(13); d[v] = 1; return d; };
  // 움직인 말의 분포 (지뢰는 못 움직이니 지뢰 몫을 빼고 다시 나눔)
  const mover = d => { const o = new Float64Array(13); const t = 1 - (d[MINE] || 0); if (!(t > 1e-9)) return o; for (let v = 1; v <= 12; v++) if (v !== MINE) o[v] = d[v] / t; return o; };

  // side 의 말마다 '무엇일 확률' (knows(p) = 이 눈에 값이 보이는가). 안 움직인 말만 지뢰일 수 있고, 왕은 판 위에만 있음 — 그 밖은 똑같이 그럴듯하다고 봄
  function model(pcs, side, knows) {
    const P = pcs.filter(p => p.s === side), cnt = Array(13).fill(0);
    for (const p of P) if (knows(p)) cnt[p.v]++;
    const nums = []; for (let v = 1; v <= 10; v++) if (!cnt[v]) nums.push(v);
    const m = Math.max(0, 3 - cnt[MINE]), kIn = cnt[KING] ? 0 : 1;
    // U = 판 위 안 움직인 말 · Mv = 판 위 움직인 말(지뢰 X) · R = 판 밖 숨은 말 중 안 움직인 말(왕 X) · 판 밖 움직인 말은 숫자만
    const U = [], Mv = [], R = [];
    for (const p of P) if (!knows(p)) { if (p.out) { if (!(p.mv > 0)) R.push(p); } else if (p.mv > 0) Mv.push(p); else U.push(p); }
    const u = U.length, v = Mv.length, w = R.length, D = [];
    let pkU = 0, pkM = 0, pmU = 0, pmR = 0;
    if (kIn) {
      const T = v * C(u + w, m) + u * C(u + w - 1, m);
      if (T > 0) { pkU = C(u + w - 1, m) / T; pkM = C(u + w, m) / T; pmU = (v * C(u + w - 1, m - 1) + (u - 1) * C(u + w - 2, m - 1)) / T; pmR = (v * C(u + w - 1, m - 1) + u * C(u + w - 2, m - 1)) / T; }
    } else if (u + w > 0) { pmU = pmR = m / (u + w); }
    for (const p of P) {
      if (knows(p)) { D[p.id] = point(p.v); continue; }
      const d = new Float64Array(13);
      const pk = p.out ? 0 : p.mv > 0 ? pkM : pkU, pm = p.mv > 0 ? 0 : p.out ? pmR : pmU;
      d[KING] = pk; d[MINE] = pm;
      const pn = Math.max(0, 1 - pk - pm);
      if (nums.length) for (const x of nums) d[x] = pn / nums.length;
      D[p.id] = d;
    }
    return D;
  }
  // 한 번의 대결(움직인 말 A 대 맞닿은 B 들)의 기대값 — 움직인 쪽에서 본 값 (말 값 · 왕 잡기 = WINV)
  function fightEV(DA, mA, Bs) {
    let ev = 0, pAd = 0, pWin = 0, pLose = 0, pBd = Bs.map(() => 0);
    for (let a = 1; a <= 12; a++) {
      const wa = DA[a]; if (!(wa > 0)) continue;
      let surv = 1, kill = 0, noK = 1, allK = 1;
      const ea = a <= 10 ? a + (mA || 0) : a;
      Bs.forEach((B, i) => {
        let pad = 0, pk = 0;
        for (let b = 1; b <= 12; b++) {
          const wb = B.d[b]; if (!(wb > 0)) continue;
          const eb = b <= 10 ? b + (B.m || 0) : b, r = duel(a, ea, b, eb, B.t);
          if (r[0]) pad += wb;
          if (r[1]) { kill += wb * VAL[b]; pBd[i] += wa * wb; }
          if (b === KING) pk += wb;
        }
        surv *= 1 - pad; noK *= 1 - pk; allK *= pk;
      });
      const die = 1 - surv;
      let win = 0, lose = 0;
      if (a === KING) lose = 1 - allK; else win = 1 - noK;
      ev += wa * (kill - die * VAL[a] + WINV * (win - lose));
      pAd += wa * die; pWin += wa * win; pLose += wa * lose;
    }
    return { ev, pAd, pWin, pLose, pBd };
  }

  // 단계: mem = 공개된 숫자 · 안 움직인 말을 기억 · threat = 한 수 앞(상대가 다음에 잡을 내 말 · 내 끝 줄로 들어올 왕 후보) · items = 아이템 계산
  const PROF = {
    easy: { mem: 0, rand: 0.35, noise: 1.2, top: 5, threat: 0, expo: 0, items: 0.3, adv: 0.12 },
    normal: { mem: 1, rand: 0.04, noise: 0.45, top: 3, threat: 1, expo: 0, items: 1, adv: 0.07 },
    hard: { mem: 1, rand: 0, noise: 0, top: 1, threat: 1, expo: 1, items: 1, adv: 0.05 },
  };
  const ITEMCOST = 0.45;
  const keyOf = (V, s, k) => hash(JSON.stringify([V.pub, s, k, V.sd]));
  function ctxOf(V, s, P) {
    const o = 1 - s, pcs = V.pcs, g = Array(NC).fill(-1);
    for (const p of pcs) if (!p.out && p.c >= 0) g[p.c] = p.id;
    const knowOpp = P.mem ? (p => p.v != null) : (() => false);
    const Dopp = model(pcs, o, knowOpp);
    const Dme = model(pcs, s, p => p.rev);                  // 상대가 내 말을 어떻게 보나 (공개된 것만)
    const king = pcs.find(p => p.s === s && p.v === KING && !p.out);
    return { s, o, pcs, g, Dopp, Dme, king, items: V.items[s] };
  }
  // 이 칸으로 올 수 있는 상대 말 (g 기준, 한 수)
  function arrivals(K, g, cell) {
    const out = [];
    for (const p of K.pcs) if (p.s === K.o && !p.out && p.c >= 0 && g[p.c] === p.id && !(K.Dopp[p.id][MINE] >= 0.999)) {
      const ds = destOf(g, K.o, p.c, -1);
      if (ds.includes(cell)) out.push(p.id);
    }
    return out;
  }
  // 수 하나의 점수 (s 쪽에서)
  function scoreMove(V, K, P, m) {
    const { s, o, pcs, Dopp, Dme } = K;
    const g = K.g.slice(), id = g[m.from], A = pcs[id];
    g[m.from] = -1; g[m.to] = id;
    const nb = N4[m.to].map(j => g[j]).filter(j => j >= 0 && pcs[j].s === o);
    let sc = 0, pAd = 0, info = { fight: nb.length, pWin: 0, pAd: 0, ev: 0, bd: [] };
    const dead = new Set();
    if (nb.length) {
      const Bs = nb.map(b => ({ d: Dopp[b], t: isMinus(m.to, pcs[b].c) ? "minus" : "sum", id: b }));
      let best = fightEV(point(A.v), 0, Bs), bm = 0;
      if (P.items >= 1 && A.v <= 10) for (const [k, mm] of [["p", 1], ["m", -1]]) if (K.items[k] > 0) { const r = fightEV(point(A.v), mm, Bs); if (r.ev - ITEMCOST > best.ev + 0.05) { best = r; bm = mm; } }
      sc += best.ev - (bm ? ITEMCOST : 0); pAd = best.pAd;
      info = { fight: nb.length, pWin: best.pWin, pAd, ev: best.ev, bd: best.pBd, mod: bm, Bs };
      nb.forEach((b, i) => { if (best.pBd[i] > 0.5) { dead.add(b); g[pcs[b].c] = -1; } if (Dopp[b][KING] < 0.999 && pcs[b].v == null) sc += 0.3 * (1 - best.pWin); });
      if (A.v !== KING && !A.rev) sc -= 0.12 * VAL[A.v] * (1 - pAd);        // 내 말 정체가 드러남
    } else if (A.v === KING && X(m.to) === FAR[s]) { sc += WINV; info.win = 1; }
    if (pAd > 0.5) g[m.to] = -1;
    // 앞으로 가기 · 되살리기
    const prog = x => (s === 0 ? x : 8 - x);
    if (A.v !== KING) sc += P.adv * (prog(X(m.to)) - prog(X(m.from))) * (A.v <= 10 ? 1 : 0);
    else sc -= 0.08 * Math.max(0, prog(X(m.to)) - prog(X(m.from)));
    if (A.v !== KING && X(m.to) === FAR[s] && pAd < 1) {
      const dead0 = pcs.filter(p => p.s === s && p.out && p.v != null && p.v !== KING);
      const bestDead = dead0.reduce((x, p) => Math.max(x, VAL[p.v]), 0);
      sc += 0.9 * (1 - pAd) * Math.max(0, bestDead - VAL[A.v]);
    }
    if (!P.threat) return { sc, info };
    // 한 수 앞: ① 내 끝 줄로 들어와 이길 수 있는 상대 말 (왕일 확률) ② 내 왕 옆 빈칸으로 올 상대 말 ③ (고급) 상대가 다음에 잡을 내 말
    const mine = new Set(); for (let i = 0; i < NC; i++) if (g[i] >= 0 && pcs[g[i]].s === s) mine.add(i);
    const adjMine = c => N4[c].some(j => mine.has(j));
    const Kp = { pcs, o, Dopp }, kingNow = K.king;
    let runK = 0;
    for (const p of pcs) if (p.s === o && !p.out && p.c >= 0 && !dead.has(p.id) && g[p.c] === p.id) {
      const pk = Dopp[p.id][KING]; if (!(pk > 0.001)) continue;
      for (const c of destOf(g, o, p.c, -1)) if (X(c) === BACK[s] && !adjMine(c)) { runK = 1 - (1 - runK) * (1 - pk); break; }
    }
    sc -= WINV * 0.9 * runK;
    const kc = kingNow ? (id === kingNow.id ? (pAd > 0.5 ? -1 : m.to) : kingNow.c) : -1;
    if (kc >= 0) {
      let risk = 0;
      const q = 0.15 + 0.85 * Dme[kingNow.id][KING];
      for (const c of N4[kc]) if (g[c] < 0) for (const y of arrivals(Kp, g, c)) if (!dead.has(y)) risk = 1 - (1 - risk) * (1 - Math.max(0, 1 - Dopp[y][KING] - Dopp[y][MINE]));
      sc -= WINV * 0.5 * q * risk;
    }
    if (P.expo) {
      let ex = 0;
      for (const p of pcs) if (p.s === s && !p.out && p.v <= 10 && (p.id !== id || pAd < 0.5)) {
        const pc = p.id === id ? m.to : p.c, known = p.id === id && nb.length ? true : p.rev;
        let worst = 0;
        for (const c of N4[pc]) if (g[c] < 0) for (const y of arrivals(Kp, g, c)) {
          if (dead.has(y)) continue;
          const r = fightEV(mover(Dopp[y]), 0, [{ d: point(p.v), t: isMinus(c, pc) ? "minus" : "sum" }]);
          const loss = known ? Math.max(0, r.ev) : 0.3 * r.ev;
          if (loss > worst) worst = loss;
        }
        ex += worst;
      }
      sc -= 0.8 * ex;
    }
    return { sc, info };
  }
  function aiMove(V, s, P, R) {
    const K = ctxOf(V, s, P), mv = movesOf(V.pcs, K.g, s);
    if (!mv.length) return null;
    if (P.rand && R() < P.rand) return mv[Math.floor(R() * mv.length) % mv.length];
    const tie = seeded(keyOf(V, s, 1));
    const rows = mv.map(m => { const r = scoreMove(V, K, P, m); return { m, v: r.sc + (P.noise ? (R() - 0.5) * 2 * P.noise : 0) + tie() * 1e-6 }; });
    rows.sort((a, b) => b.v - a.v);
    const pick = rows[Math.floor(R() * Math.min(P.top, rows.length)) % Math.min(P.top, rows.length)];
    return Object.assign({}, (P.top === 1 ? rows[0] : pick).m);
  }

  // ── 배치 ──
  function layEasy(R) {
    const lay = VALS.slice().concat([0, 0, 0, 0]);
    for (let i = lay.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = lay[i]; lay[i] = lay[j]; lay[j] = t; }
    return lay;
  }
  const K_ = (y, d) => y * 3 + d;
  function layGood(R, hard) {
    const lay = Array(18).fill(-1), put = (k, v) => { lay[k] = v; };
    const free = () => lay.map((v, k) => (v < 0 ? k : -1)).filter(k => k >= 0);
    const pickOf = arr => arr[Math.floor(R() * arr.length) % arr.length];
    // 왕: 맨 끝 줄 (모서리 · 가운데) — 옆 · 앞칸을 지뢰로 막음 (지뢰는 안 움직이니 왕 옆 빈칸이 안 생김)
    const ky = hard ? pickOf([0, 5, 0, 5, 2, 3, 1, 4]) : Math.floor(R() * 6);
    put(K_(ky, 0), KING);
    const adj = [K_(ky, 1)]; if (ky > 0) adj.push(K_(ky - 1, 0)); if (ky < 5) adj.push(K_(ky + 1, 0));
    let mines = 3;
    for (const k of adj) if (mines && (hard || R() < 0.6)) { put(k, MINE); mines--; }
    while (mines) { const f = free().filter(k => k % 3 >= 1 && Math.floor(k / 3) >= 1 && Math.floor(k / 3) <= 4); put(pickOf(f.length ? f : free()), MINE); mines--; }
    // 숫자: 앞줄 양 끝(옆 라인)에 9 · 10, 가운데 라인에 1 · 2, 5 는 앞에서 정찰 (방송 전략) — 보통은 반쯤만
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], left = new Set(nums);
    const want = (v, ks) => { const f = ks.filter(k => lay[k] < 0); if (f.length && left.has(v)) { put(pickOf(f), v); left.delete(v); } };
    if (hard || R() < 0.5) {
      const sideA = R() < 0.5;
      want(sideA ? 10 : 9, [K_(0, 2), K_(0, 1)]); want(sideA ? 9 : 10, [K_(5, 2), K_(5, 1)]);
      want(1, [K_(2, 2), K_(3, 2)]); want(2, [K_(2, 2), K_(3, 2), K_(2, 1), K_(3, 1)]);
      want(5, [K_(1, 2), K_(4, 2)]);
    }
    const rest = [...left];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
    // 남은 숫자는 앞 · 가운데 줄부터 (빈칸 4개는 뒤쪽에 남겨 옆으로 움직일 틈)
    const rk = Array.from({ length: 18 }, () => R()), order = free().sort((a, b) => (b % 3) - (a % 3) || rk[a] - rk[b]);
    for (const v of rest) { const k = order.find(q => lay[q] < 0); put(k, v); }
    return lay.map(v => (v < 0 ? 0 : v));
  }
  function aiLay(V, s, tier, R) {
    const r = tier === "hard" ? seeded(hash(JSON.stringify(["lay", s, V.sd]))) : R;     // 추천 배치는 상대가 배치를 마쳐도 그대로
    return tier === "easy" ? layEasy(r) : layGood(r, tier === "hard");
  }

  // ── 아이템 · 되살리기 AI ──
  // 이 대결에서 내 쪽 기대값 (mods = 내 말 id → ±1)
  function itemEvOf(V, s, K, mods) {
    const F = V.fight, A = V.pcs[F.a];
    if (A.s === s) return fightEV(point(A.v), mods[A.id] || 0, F.pairs.map(q => ({ d: K.Dopp[q.b], t: q.t })));
    const r = fightEV(mover(K.Dopp[A.id]), 0, F.pairs.map(q => ({ d: point(V.pcs[q.b].v), m: mods[q.b] || 0, t: q.t })));
    return { ev: -r.ev, pAd: r.pAd, pWin: r.pLose, pBd: r.pBd };
  }
  const blindGain = (V, s, r, id) => {
    const F = V.fight, p = V.pcs[id]; if (!p || p.v === KING || p.rev) return 0;
    const surv = V.pcs[F.a].s === s ? (id === F.a ? 1 - r.pAd : 0) : 1 - (r.pBd[F.pairs.findIndex(q => q.b === id)] || 0);
    return surv * 0.3 * VAL[p.v];
  };
  // 아이템 고르기 하나의 값 (복기용: 기대값 − 아이템 값)
  function itemEval(V, s, use) {
    if (!V.fight) return 0;
    const K = ctxOf(V, s, PROF.hard), mods = {}; let cost = 0, bl = -1;
    for (const u of use || []) { if (u.k === "b") bl = u.id; else { mods[u.id] = u.k === "p" ? 1 : -1; cost += ITEMCOST; } }
    const r = itemEvOf(V, s, K, mods);
    return r.ev - cost + (bl >= 0 ? blindGain(V, s, r, bl) - 0.55 : 0);
  }
  function itemPlan(V, s, P) {
    const F = V.fight; if (!F) return { use: [], base: 0, best: 0 };
    const K = ctxOf(V, s, P), it = V.items[s], A = V.pcs[F.a], amMover = A.s === s;
    const mineIds = (amMover ? [F.a] : []).concat(F.pairs.filter(q => V.pcs[q.b].s === s).map(q => q.b));
    const evOf = mods => itemEvOf(V, s, K, mods);
    const base = evOf({});
    let best = { ev: base.ev, mods: {} };
    const nums = mineIds.filter(id => V.pcs[id].v <= 10);
    const tryM = (mods, cost) => { const r = evOf(mods); if (r.ev - cost > best.ev + 0.05) best = { ev: r.ev - cost, mods: Object.assign({}, mods), r }; };
    for (const a of nums) {
      if (it.p > 0) tryM({ [a]: 1 }, ITEMCOST);
      if (it.m > 0) tryM({ [a]: -1 }, ITEMCOST);
      if (it.p > 0 && it.m > 0) for (const b of nums) if (b !== a) tryM({ [a]: 1, [b]: -1 }, 2 * ITEMCOST);
    }
    const use = Object.keys(best.mods).map(id => ({ k: best.mods[id] > 0 ? "p" : "m", id: +id }));
    // BLIND: 살아남을 것 같은 숨은 강한 말 — 정체를 계속 숨김
    if (it.b > 0 && P.items >= 1) {
      const r = best.r || base;
      let bb = null, bv = 0;
      for (const id of mineIds) { const gain = blindGain(V, s, r, id); if (gain > bv) { bv = gain; bb = id; } }
      if (bb != null && bv > 0.55) use.push({ k: "b", id: bb });
    }
    return { use, base: base.ev, best: best.ev, r: best.r || base };
  }
  function aiItem(V, s, P, R) {
    const F = V.fight; if (!F) return { t: "item", use: [] };
    if (P.items < 1) {
      if (R() >= P.items) return { t: "item", use: [] };
      const it = V.items[s], mine = (V.pcs[F.a].s === s ? [F.a] : []).concat(F.pairs.filter(q => V.pcs[q.b].s === s).map(q => q.b)).filter(id => V.pcs[id].v !== KING);
      const ks = ["p", "m", "b"].filter(k => it[k] > 0);
      if (!mine.length || !ks.length) return { t: "item", use: [] };
      const k = ks[Math.floor(R() * ks.length) % ks.length], cand = mine.filter(id => k === "b" || V.pcs[id].v <= 10);
      if (!cand.length) return { t: "item", use: [] };
      return { t: "item", use: [{ k, id: cand[Math.floor(R() * cand.length) % cand.length] }] };
    }
    return { t: "item", use: itemPlan(V, s, P).use };
  }
  function revivePlan(V, s, P, R) {
    const R0 = V.revv; if (!R0) return { t: "revive", skip: true };
    const dead = V.pcs.filter(p => p.s === s && p.out && p.v !== KING && p.id !== R0.id);
    const cells = []; for (let y = 0; y < H; y++) { const c = at(BACK[s], y); if (!V.pcs.some(p => !p.out && p.c === c)) cells.push(c); }
    if (!dead.length || !cells.length) return { t: "revive", skip: true };
    if (P.rand >= 0.3) { if (R() < 0.4) return { t: "revive", skip: true }; return { t: "revive", id: dead[Math.floor(R() * dead.length) % dead.length].id, to: cells[Math.floor(R() * cells.length) % cells.length] }; }
    const b = dead.slice().sort((x, y) => VAL[y.v] - VAL[x.v] || x.id - y.id)[0], arr = V.pcs[R0.id];
    if (VAL[b.v] < 0.8 * VAL[arr.v]) return { t: "revive", skip: true };
    const king = V.pcs.find(p => p.s === s && p.v === KING && !p.out);
    const sc = c => (king && N4[c].includes(king.c) ? 2 : 0) - (N4[c].some(j => V.pcs.some(p => !p.out && p.c === j && p.s !== s)) ? 3 : 0) - Math.abs(Y(c) - 2.5) * 0.1;
    const to = cells.slice().sort((a, b2) => sc(b2) - sc(a) || a - b2)[0];
    return { t: "revive", id: b.id, to };
  }

  function ai(V, s, tier, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF[tier] || PROF.normal;
    const R = tier === "hard" ? seeded(keyOf(V, s, 3)) : typeof rnd === "function" ? rnd : seeded(keyOf(V, s, 5));
    if (V.phase === "setup") return { t: "setup", lay: aiLay(V, s, tier, R) };
    if (V.phase === "item") return aiItem(V, s, P, R);
    if (V.phase === "revive") return revivePlan(V, s, P, R);
    if (V.phase === "play") return aiMove(V, s, P, R);
    return null;
  }

  // ── 선생님 · 복기가 쓰는 것 (보이는 것만) ──
  function analyze(V, s) {
    const P = PROF.hard, K = ctxOf(V, s, P);
    return { Dopp: K.Dopp, Dme: K.Dme, K };
  }
  function evalMoves(V, s) {
    if (!V || V.phase !== "play" || V.cur !== s) return [];
    const P = PROF.hard, K = ctxOf(V, s, P);
    return movesOf(V.pcs, K.g, s).map(m => { const r = scoreMove(V, K, P, m); return { a: m, v: r.sc, info: r.info }; }).sort((a, b) => b.v - a.v);
  }
  // 한 대결의 숫자 근거 (내 말 값 v 대 상대 말 분포 d, 대결 종류 t, 내 아이템 mm): 이길 · 질 · 같이 사라질 확률
  function duelOdds(v, mm, d, t) {
    let w = 0, l = 0, b = 0, k = 0;
    const ea = v <= 10 ? v + (mm || 0) : v;
    for (let x = 1; x <= 12; x++) {
      const p = d[x]; if (!(p > 0)) continue;
      const r = duel(v, ea, x, x <= 10 ? x : x, t);
      if (x === KING && v !== KING) k += p;
      if (r[0] && r[1]) b += p; else if (r[1]) w += p; else if (r[0]) l += p;
    }
    return { win: w, lose: l, both: b, king: k };
  }
  function recommend(V, s) { const a = ai(V, s, "hard"); return a; }

  return {
    id: "gn-numchess", W, H, NC, MINE, KING, NP, MAXPLY, WINV, FWD, BACK, FAR, LETX, VALS, VAL, PROF, OPTS, MINUS_Y, N4,
    X, Y, at, cellName, isMinus, inCamp, slotCell, cellSlot, vName, optsOf, numDuel, duel, destOf, movesOf, gridOf, checkLay,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend,
    model, mover, fightEV, analyze, evalMoves, duelOdds, itemPlan, itemEval, revivePlan, layEasy, layGood, aiLay,
  };
});

/* 베니 서바이벌 · 같은 그림 찾기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 1 11화 · 시즌 2 8화 · 시즌 4 7화 데스매치 (1:1) — 나무위키 '같은 그림 찾기' 문서 룰 · 회차 문서 확인
   · 그림판: 앞면 알파벳 16개(A~P), 뒷면 서로 다른 그림 16장 — 한 판 내내 그 자리 그대로, 연 판은 곧 다시 덮임
   · 개인 컨베이어 벨트: 20칸, 그림판의 그림 16개를 3묶음 섞어 채운 카드 (각자 따로 섞음, 서로 보임). 말은 벨트 위
   · 내 차례: 말 바로 앞(다음 칸) 카드와 같은 그림을 그림판에서 알파벳으로 찾아 한 장 엶 (둘 다 봄)
       맞으면 말이 한 칸 전진 · 이어서 한 번 더 열 수 있음 / 틀리면 벨트가 한 칸 후진(말도 같이 밀림 · 맨 앞에 새 카드) · 상대 차례
   · 먼저 결승점(20번째 칸)에 닿으면 승 / 벨트 뒤끝에서 더 밀려 떨어지면 패
   · 출발: 시즌 4 = 둘 다 12번째 · 선후공은 동전 (기본) / 시즌 1·2 = 가넷 많은 쪽 10번째 · 적은 쪽 8번째, 선후공은 많은 쪽이 정함
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 view 에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-samepic"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NP = 16, GOAL = 20, BELT = 20, SEQ = 48;
  const LET = "ABCDEFGHIJKLMNOP".split("");
  const OPTS = { ver: [4, 1], memo: [0, 1] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function shuf(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function init({ n, seed, cfg }) {
    void n;
    const o = optsOf(cfg || {}), rs = (seed >>> 0) || 1, R = seeded(rs ^ 0x51ED270B);
    const pic = shuf(Array.from({ length: NP }, (_, i) => i), R);
    const seq = [0, 1].map(() => { const a = []; for (let k = 0; k < 3; k++) a.push(...shuf(Array.from({ length: NP }, (_, i) => i), R)); return a; });
    const coin = R() < 0.5 ? 0 : 1;
    const st = { n: 2, rs, cfg: Object.assign({}, cfg || {}), opt: o, pic, seq, a: [0, 0], pos: [12, 12], succ: [0, 0], phase: "open", turn: coin, first: coin, rich: -1,
      can: false, chain: 0, opens: 0, turns: [0, 0], known: Array(NP).fill(-1), log: [], sq: 0, over: false, res: null };
    if (o.ver === 1) { st.rich = coin; st.pos = [coin === 0 ? 10 : 8, coin === 1 ? 10 : 8]; st.phase = "first"; st.turn = -1; }
    push2(st, { k: "start", rich: st.rich, ver: o.ver });
    return st;
  }
  function push2(st, e) { e.i = st.sq++; st.log.push(e); }
  const target = (st, s) => st.seq[s][st.a[s] + st.pos[s]];
  const beltOf = (st, s) => st.seq[s].slice(st.a[s], st.a[s] + BELT);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "first") return [st.rich];
    return [st.turn];
  }
  const over = st => !!st.over;
  function ranks(st) { if (!st.over || !st.res) return [0, 0]; return st.res.w === 0 ? [0, 1] : [1, 0]; }
  const auto = () => null;
  function advance() {}
  function finish(st, w, why) {
    st.over = true; st.phase = "end"; st.can = false; st.res = { w, why, pos: st.pos.slice(), opens: st.opens };
    push2(st, { k: "end", w, why });
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "first") {
      if (a.t !== "first" || !(a.who === 0 || a.who === 1)) return { ok: false, err: "누가 먼저 열지 정해요" };
      st.turn = a.who; st.first = a.who; st.phase = "open";
      push2(st, { k: "first", s: seat, who: a.who });
      return { ok: true };
    }
    if (a.t === "stop") {
      if (!st.can) return { ok: false, err: "한 번은 열어야 해요 (맞힌 뒤에만 멈출 수 있어요)" };
      st.can = false; st.chain = 0; st.turn = 1 - seat; st.turns[seat]++;
      push2(st, { k: "stop", s: seat });
      return { ok: true };
    }
    if (a.t !== "open") return { ok: false, err: "그림판 칸을 열어요" };
    const k = a.k;
    if (!Number.isInteger(k) || k < 0 || k >= NP) return { ok: false, err: "A~P 중 하나를 골라요" };
    const pic = st.pic[k], tg = target(st, seat), ok = pic === tg;
    st.opens++; st.known[k] = pic;
    const ev = { k: "open", s: seat, p: k, pic, tg, ok, from: st.pos[seat] };
    if (ok) {
      st.pos[seat]++; st.succ[seat]++; st.chain++; ev.to = st.pos[seat];
      push2(st, ev);
      if (st.pos[seat] >= GOAL) { finish(st, seat, "goal"); return { ok: true }; }
      st.can = true;
    } else {
      st.pos[seat]--; st.a[seat]++; st.chain = 0; ev.to = st.pos[seat]; st.can = false; st.turns[seat]++;
      push2(st, ev);
      if (st.pos[seat] < 1) { finish(st, 1 - seat, "fall"); return { ok: true }; }
      st.turn = 1 - seat;
    }
    return { ok: true };
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "first") return [{ t: "first", who: seat }, { t: "first", who: 1 - seat }];
    const L = Array.from({ length: NP }, (_, k) => ({ t: "open", k }));
    if (st.can) L.push({ t: "stop" });
    return L;
  }

  // ── 보이는 것 ──  판의 그림은 연 칸만 보여요 ('all' 만 다) · 벨트 · 말 위치 · 연 기록은 모두 공개
  function pubKey(st) { return JSON.stringify({ p: st.phase, t: st.turn, pos: st.pos, a: st.a, n: st.log.length, c: st.can, o: st.over, k: st.known.map(x => (x >= 0 ? 1 : 0)) }); }
  function view(st, seat) {
    const all = seat === "all";
    return {
      n: 2, ver: st.opt.ver, opt: Object.assign({}, st.opt), phase: st.phase, turn: st.turn, cur: st.phase === "open" && !st.over ? st.turn : -1, first: st.first, rich: st.rich,
      pos: st.pos.slice(), a: st.a.slice(), succ: st.succ.slice(), can: st.can, chain: st.chain, opens: st.opens, turns: st.turns.slice(),
      belt: [0, 1].map(s => beltOf(st, s)), tgt: [0, 1].map(s => (st.over && st.pos[s] >= GOAL ? -1 : target(st, s))),
      known: st.known.slice(), pic: all || st.over ? st.pic.slice() : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      score: st.pos.slice(), log: st.log.map(e => Object.assign({}, e)), seat, pub: hash(pubKey(st)).toString(36),
    };
  }

  // ═══ AI ═══════════════════════════════════════════════════════
  // 기억: 초급 = 방금 연 2칸만 · 보통 = 최근 6칸 · 고급 = 전부 (연 기록은 모두 공개라 보이는 것만으로)
  const PROF = {
    easy: { mem: 2, rand: 0.3, cont: 0.35, miss: 0.15 },
    normal: { mem: 6, rand: 0.05, cont: 0.1, miss: 0.04 },
    hard: { mem: 99, rand: 0, cont: 0, miss: 0 },
  };
  const keyOf = (V, s, k) => hash(JSON.stringify([V.pub, s, k]));
  function memOf(V, P) {
    const ev = V.log.filter(e => e.k === "open"), m = Array(NP).fill(-1);
    for (const e of ev.slice(Math.max(0, ev.length - P.mem))) m[e.p] = e.pic;
    return m;
  }
  const lastOpen = V => { for (let i = V.log.length - 1; i >= 0; i--) if (V.log[i].k === "open") return V.log[i]; return null; };
  // 아직 못 본 칸 중에 내 앞 카드들 · 상대 앞 카드들이 있을 가능성 (고급이 새 정보를 줄지 따짐)
  function exploreScore(V, s, mem) {
    const o = 1 - s, unk = []; for (let k = 0; k < NP; k++) if (V.known[k] < 0) unk.push(k);
    const U = unk.length; if (!U) return { U: 0, sc: -9 };
    const seenPic = new Set(V.known.filter(x => x >= 0));
    const near = (belt, pos, n) => { const o2 = new Set(); for (let j = 0; j < n; j++) { const c = belt[pos + j]; if (c != null && !seenPic.has(c)) o2.add(c); } return o2.size; };
    const mine = near(V.belt[s], V.pos[s], 4), opp = near(V.belt[o], V.pos[o], 2);
    const pS = seenPic.has(V.tgt[s]) ? 0 : 1 / U;
    const pen = V.pos[o] >= 14 ? 1.3 : 0.7;
    return { U, pS, sc: pS * 2 - (1 - pS) + 0.5 * mine / U - pen * opp / U };
  }
  function ai(V, s, tier, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF[tier] || PROF.normal;
    const R = tier === "hard" ? seeded(keyOf(V, s, 3)) : typeof rnd === "function" ? rnd : seeded(keyOf(V, s, 5));
    if (V.phase === "first") return { t: "first", who: tier === "easy" ? (R() < 0.5 ? s : 1 - s) : 1 - s };
    const mem = memOf(V, P), tg = V.tgt[s];
    const loc = mem.indexOf(tg);
    const unk = []; for (let k = 0; k < NP; k++) if (mem[k] < 0) unk.push(k);
    const pickU = () => unk.length ? unk[Math.floor(R() * unk.length) % unk.length] : Math.floor(R() * NP);
    if (V.can) {                                           // 방금 맞힘: 다음 그림 위치를 알면 계속, 아니면 멈춤 (초급은 가끔 무작정)
      if (loc >= 0 && !(P.miss && R() < P.miss)) return { t: "open", k: loc };
      if (R() < P.cont) return { t: "open", k: pickU() };
      return { t: "stop" };
    }
    if (P.rand && R() < P.rand) return { t: "open", k: Math.floor(R() * NP) };
    if (loc >= 0 && !(P.miss && R() < P.miss)) return { t: "open", k: loc };
    if (tier === "hard") {
      const ex = exploreScore(V, s, mem), lo = lastOpen(V);
      const fo = lo && lo.s !== s && V.known[lo.p] >= 0 && V.known[lo.p] !== tg ? lo.p : -1;      // 상대가 방금 연 칸을 따라 열면 새 정보가 안 나가요
      if (fo >= 0 && ex.sc < -0.85) return { t: "open", k: fo };
      const tie = seeded(keyOf(V, s, 1)); const c = unk.slice(); return { t: "open", k: c.length ? c[Math.floor(tie() * c.length) % c.length] : 0 };
    }
    return { t: "open", k: pickU() };
  }
  function recommend(V, s) { return ai(V, s, "hard"); }
  // 선생님이 쓰는 것 (보이는 것만)
  function analyze(V, s) {
    const mem = memOf(V, PROF.hard), tg = V.tgt[s], loc = mem.indexOf(tg), unkN = V.known.filter(x => x < 0).length;
    const nextLoc = [1, 2, 3].map(j => { const c = V.belt[s][V.pos[s] + j]; return c == null ? -1 : mem.indexOf(c); });
    return { mem, tg, loc, unkN, nextLoc, ex: exploreScore(V, s, mem) };
  }

  return {
    id: "gn-samepic", NP, GOAL, BELT, LET, OPTS, PROF,
    optsOf, init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, analyze, memOf, exploreScore, lastOpen,
  };
});

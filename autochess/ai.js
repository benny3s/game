/* 롤토체스 봇 — 경제 운영 스타일별 손으로 짠 정책 (학습 전 기준선 · 셀프플레이 상대)
   pick(s, style, rand) → 지금 s.turn 자리의 행동 번호 하나
   스타일: econ(표준 이자 운영) · fast8(빠른 8레벨) · reroll(낮은 레벨 리롤) · greedy(보이는 대로 씀) · random
   Node · 브라우저 공용 (module.exports 또는 root.AutoChessAI) */
(function (root) {
  'use strict';
  const C = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.AutoChess;
  const { A_BUY, A_ROLL, A_XP, A_END, A_SELL } = C;

  // 스타일별 목표 레벨 (스테이지 → 레벨). 규칙 A 는 레벨 상한에 맞춰 자름
  const PLAN = {
    econ:   { lvl: { 2: 4, 3: 6, 4: 7, 5: 8, 6: 9, 7: 9, 8: 10, 9: 10 }, keep: 50, rollAt: [4, 8], rollKeep: 20 },
    fast8:  { lvl: { 2: 5, 3: 6, 4: 8, 5: 9, 6: 9, 7: 10, 8: 10, 9: 10 }, keep: 30, rollAt: [4, 8], rollKeep: 10 },
    reroll: { lvl: { 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 8, 8: 9, 9: 9 }, keep: 50, rollAt: [3, 5], rollKeep: 50, slow: true },
    greedy: { lvl: { 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 9, 8: 10, 9: 10 }, keep: 0, rollAt: [2, 3], rollKeep: 0 },
  };
  const STYLES = ['econ', 'fast8', 'reroll', 'greedy', 'random'];

  function copies(pl, u) { let k = 0; for (const x of pl.units) if (x.u === u && x.st === 1) k++; return k; }

  function pick(s, style, rand) {
    rand = rand || Math.random;
    const m = C.legal(s);
    if (style === 'random') {
      const ok = []; for (let a = 0; a < m.length; a++) if (m[a]) ok.push(a);
      // 그냥 고르면 준비 끝이 너무 자주 나오니 끝은 1/4 확률로만
      if (ok.length > 1 && rand() < 0.75) { const k = ok.filter(a => a !== A_END); return k[Math.floor(rand() * k.length)]; }
      return ok[Math.floor(rand() * ok.length)];
    }
    const R = s.rules, pl = s.players[s.turn], P = PLAN[style] || PLAN.econ;
    const target = Math.min(R.maxLevel, P.lvl[s.stage] || R.maxLevel);
    const low = pl.hp <= R.hp * 0.35;
    // 쓸 수 있는 돈: 평소엔 keep 위로만, 체력이 낮거나 롤다운 시점이면 rollKeep 까지
    const rollDown = (s.stage === P.rollAt[0] && s.round <= 2 && pl.lvl >= target) || low;
    const floor = rollDown ? P.rollKeep : (P.slow && s.stage >= P.rollAt[0] && pl.lvl >= target ? P.rollAt[1] * 10 : P.keep);
    const spare = pl.gold - Math.min(floor, low ? 0 : floor);

    // 1) 합쳐지는 유닛은 무조건
    for (let i = 0; i < pl.shop.length; i++) if (m[A_BUY + i] && copies(pl, pl.shop[i]) >= 2) return A_BUY + i;
    // 2) 레벨 목표
    if (m[A_XP] && pl.lvl < target && (pl.gold - R.xpCost >= Math.min(floor, 10) || low || style === 'greedy')) return A_XP;
    // 3) 보드 빈칸 채우기 · 짝 맞추기 (비싼 것부터)
    let best = -1, bv = -1;
    for (let i = 0; i < pl.shop.length; i++) {
      if (!m[A_BUY + i]) continue;
      const u = pl.shop[i], c = C.costOf(s, u), k = copies(pl, u);
      const fill = pl.units.length < pl.lvl;
      const v = (k > 0 ? 10 : 0) + c + (fill ? 5 : 0);
      if (!fill && k === 0 && (spare < c || style !== 'greedy' && c < Math.min(5, pl.lvl - 3))) continue;
      if (!fill && k > 0 && pl.gold - c < Math.min(floor, 10) && !rollDown) continue;
      if (v > bv) { bv = v; best = i; }
    }
    if (best >= 0) return A_BUY + best;
    // 4) 벤치가 꽉 찼으면 짝 없는 약한 것 팔기
    const nb = pl.units.length - pl.lvl;
    if (nb >= R.bench - 1) {
      for (let j = nb - 1; j >= 0; j--) { const x = pl.units[pl.lvl + j]; if (x.st === 1 && copies(pl, x.u) === 1 && m[A_SELL + j]) return A_SELL + j; }
    }
    // 5) 남는 돈으로 새로고침
    if (m[A_ROLL] && pl.lvl >= target && spare >= R.rollCost && (rollDown || style === 'greedy' || (P.slow && s.stage >= P.rollAt[0]))) return A_ROLL;
    // 6) 목표보다 돈이 넘치면 레벨
    if (m[A_XP] && pl.gold - R.xpCost >= floor + 10) return A_XP;
    return A_END;
  }

  // 한 판 끝까지 (seats[p] = 스타일 이름 또는 함수(s, rand) → 행동)
  function playout(opts) {
    const s = C.create(opts);
    const rand = C.makeRng((opts.seed | 0) ^ 0x5EED);
    const seats = opts.seats || [];
    let guard = 0;
    while (s.phase === 'plan') {
      const f = seats[s.turn] || 'econ';
      const a = typeof f === 'function' ? f(s, rand) : pick(s, f, rand);
      C.apply(s, a);
      if (++guard > 200000) throw new Error('playout 무한루프');
    }
    return s;
  }

  const API = { STYLES, PLAN, pick, playout };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AutoChessAI = API;
})(this);

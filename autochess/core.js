/* 롤토체스(오토체스) 규칙 엔진 — 경제 · 레벨 · 상점 · 풀 · 연승연패 · 체력만 진짜로 굴리고, 전투는 확률로 정함
   · 상태 = JSON 그대로 저장되는 평범한 객체. Math.random·Date 없음 (난수는 상태 안 mulberry32: rng)
   · 규칙 두 벌: A = 베니 오리지널(6명 · 짧은 판) / B = TFT 경제 미러(8명 · Set 18 숫자만, 이름·그림 없음)
   · 배치 · 시너지 · 증강은 흉내 내지 않음. 전투 힘 = 유닛 가치(코스트 × 성급) + 아이템 → Bradley–Terry 승률
   · 계획 단계는 자리 차례대로 (공유 풀이 있어서 동시 대신 순서. 라운드마다 시작 자리를 돌림)
   · Node · 브라우저 공용 (module.exports 또는 root.AutoChess) */
(function (root) {
  'use strict';

  // ── 행동 번호 (모든 규칙 공통, 17개) ─────────────────────────
  const A_BUY = 0;           // 0~4  상점 칸 사기
  const A_ROLL = 5;          // 새로고침
  const A_XP = 6;            // 경험치 사기
  const A_END = 7;           // 이번 라운드 준비 끝
  const A_SELL = 8;          // 8~16 벤치 칸 팔기 (벤치 = 보드에 못 올라간 유닛, 약한 순서 아님 · 힘 순 정렬의 뒤쪽)
  const N_ACTIONS = 17;
  const MAX_ACTS = 60;       // 한 라운드 한 사람 행동 수 상한 (사고팔기 무한 반복 막기)

  // ── 난수 (mulberry32, 공개 도메인 · Tommy Ettinger) ─────────────
  function rnd(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function makeRng(seed) { const o = { rng: seed | 0 }; return () => rnd(o); }

  // ── 규칙 ──────────────────────────────────────────────────
  // 숫자 출처: B 의 [공식] = Riot 파일 · 패치노트 (Set 18, 18.3~18.6: tftcodex · tftanalytics · rrtft 표 대조, 2026-11-17)
  //            [근사] = 공개 수치가 없어서 정한 값 (전투 · 피해 · PvE · 회전목마). 배치·시너지가 없으니 전투는 원래 근사.
  const RULES_B = {
    id: 'B', name: 'TFT 경제 미러 (Set 18 숫자)',
    players: 8, hp: 100,
    maxLevel: 10,
    xpNeed: [0, 0, 2, 2, 6, 10, 20, 36, 56, 68, 68],         // [공식] xpNeed[L] = L-1 → L
    xpPassive: 2, xpBuy: 4, xpCost: 4,                         // [공식] 라운드마다 2, 4골드 = 4XP
    odds: [null,                                               // [공식] 레벨별 1~5코 확률 %
      [100, 0, 0, 0, 0], [100, 0, 0, 0, 0], [75, 25, 0, 0, 0], [55, 30, 15, 0, 0], [45, 33, 20, 2, 0],
      [30, 40, 25, 5, 0], [19, 30, 40, 10, 1], [15, 20, 32, 30, 3], [10, 17, 25, 33, 15], [5, 10, 20, 40, 25]],
    units: [14, 13, 14, 14, 10],                               // [공식] 코스트별 종류 수 (이름은 안 씀)
    copies: [30, 25, 18, 10, 9],                               // [공식] 종류마다 장수
    slots: 5, rollCost: 2, bench: 9,                           // [공식]
    incomeStart: [3, 4],                                       // [공식] 2-1 → 3, 2-2 → 4, 그 뒤 5 (1스테이지 0,0,2,2 는 시작 골드에 접음)
    income: 5, interestStep: 10, interestCap: 5,               // [공식]
    streak: [[2, 1], [5, 2], [6, 3]],                          // [공식] 2~4연 +1, 5연 +2, 6연+ +3 (연승 연패 같음)
    sell: [null, [1, 3, 9], [2, 5, 17], [3, 8, 26], [4, 11, 35], [5, 14, 44]], // [공식]
    stageDmg: [0, 0, 2, 5, 8, 10, 12, 17, 17, 17],             // [근사] 스테이지 기본 피해
    unitDmg: [0, 1, 2, 3],                                     // [근사] 살아남은 유닛 성급마다
    start: { gold: 6, level: 3, xp: 0, units: [1, 1], items: 2 }, // [근사] 1스테이지(PvE 4판)를 접은 2-1 직전 모습
    roundsPerStage: 7, carousel: 4, pve: 7, firstStage: 2,     // [공식] X-4 회전목마, X-7 PvE (2-1 시작)
    pveStr: [0, 0, 3, 7, 13, 24, 36, 50, 60, 70],              // [근사] 크립 힘
    pveGold: 3,                                                // [근사] PvE 이기면 평균 골드 (오브 평균)
    maxStage: 9,                                               // 9-7 끝나면 체력 순 등수
    power: { cost: [0, 1, 1.45, 2.1, 3.0, 4.2], star: [0, 1, 2.2, 5.0], item: 0.45, itemPerUnit: 3, gamma: 2.5 }, // [근사]
  };
  const RULES_A = {
    id: 'A', name: '베니 오리지널 (6명 · 빠른 판)',
    players: 6, hp: 60,
    maxLevel: 9,
    xpNeed: [0, 0, 2, 2, 4, 8, 16, 26, 38, 50],
    xpPassive: 2, xpBuy: 4, xpCost: 4,
    odds: [null,
      [100, 0, 0, 0, 0], [100, 0, 0, 0, 0], [70, 30, 0, 0, 0], [50, 35, 15, 0, 0], [35, 40, 22, 3, 0],
      [25, 35, 30, 10, 0], [18, 27, 35, 17, 3], [10, 20, 32, 30, 8], [5, 12, 25, 38, 20]],
    units: [10, 9, 8, 6, 3],                                   // 36종 (ROSTER_A)
    copies: [22, 18, 13, 9, 7],
    slots: 5, rollCost: 2, bench: 8,
    incomeStart: [4],
    income: 5, interestStep: 10, interestCap: 4,
    streak: [[2, 1], [4, 2], [5, 3]],
    sell: [null, [1, 3, 9], [2, 5, 17], [3, 8, 26], [4, 11, 35], [5, 14, 44]],
    stageDmg: [0, 0, 2, 4, 7, 10, 14, 18, 18, 18],
    unitDmg: [0, 1, 2, 3],
    start: { gold: 8, level: 3, xp: 0, units: [1, 1], items: 2 },
    roundsPerStage: 5, carousel: 3, pve: 5, firstStage: 2,     // X-3 회전목마, X-5 PvE
    pveStr: [0, 0, 3, 8, 15, 26, 38, 50, 60, 70],
    pveGold: 3,
    maxStage: 8,
    power: { cost: [0, 1, 1.45, 2.1, 3.0, 4.2], star: [0, 1, 2.2, 5.0], item: 0.45, itemPerUnit: 3, gamma: 2.5 },
  };
  const RULESETS = { A: RULES_A, B: RULES_B };
  // 규칙 A 유닛 이름 (자체 36종, 코스트 순). 규칙 B 는 '3코 #5' 처럼 번호만.
  const ROSTER_A = [
    '도토리', '새싹냥', '꼬마곰', '물방울', '솜뭉치', '깃털이', '조약돌', '버섯돌이', '반딧불', '꿀벌',
    '바람여우', '돌거북', '불꽃쥐', '얼음펭귄', '숲사슴', '방패고슴', '그림자박쥐', '번개다람', '모래두더지',
    '달토끼', '강철곰', '화염매', '서리늑대', '독두꺼비', '천둥소', '유령고양이', '수정사슴',
    '용암거북', '폭풍독수리', '별고래', '밤호랑이', '대지코끼리', '무지개뱀',
    '하늘용', '시간부엉이', '베니왕',
  ];

  function getRules(r) {
    if (!r) return RULES_B;
    if (typeof r === 'string') return RULESETS[r] || RULES_B;
    return Object.assign({}, RULESETS[r.base || r.id] || RULES_B, r);
  }
  // 유닛 표: id → 코스트 (규칙마다 한 번 만들어 둠)
  const _tbl = new Map();
  function table(R) {
    const key = R.units.join(',') + '|' + R.copies.join(',');
    let t = _tbl.get(key);
    if (!t) {
      const cost = [], firstOf = [0];
      for (let c = 1; c <= 5; c++) { firstOf[c] = cost.length; for (let k = 0; k < R.units[c - 1]; k++) cost.push(c); }
      t = { cost, firstOf, n: cost.length };
      _tbl.set(key, t);
    }
    return t;
  }
  const costOf = (s, u) => table(s.rules).cost[u];
  function unitName(R, u) {
    R = getRules(R); const t = table(R), c = t.cost[u];
    if (R.id === 'A' && ROSTER_A[u]) return ROSTER_A[u];
    return c + '코 #' + (u - t.firstOf[c] + 1);
  }
  const COPIES_OF_STAR = [0, 1, 3, 9];

  // ── 힘 · 보드 ───────────────────────────────────────────────
  function unitPow(s, x) { const P = s.rules.power; return P.cost[costOf(s, x.u)] * P.star[x.st]; }
  // 유닛 목록은 늘 힘 순 (같으면 id · 성급 순) → 앞 level 개가 보드, 나머지가 벤치
  function sortUnits(s, pl) {
    pl.units.sort((a, b) => (unitPow(s, b) - unitPow(s, a)) || (b.st - a.st) || (a.u - b.u));
  }
  const boardOf = pl => pl.units.slice(0, pl.lvl);
  const benchOf = pl => pl.units.slice(pl.lvl);
  function strength(s, pl) {
    const P = s.rules.power; const b = boardOf(pl);
    let w = 0; for (const x of b) w += unitPow(s, x);
    return w + P.item * Math.min(pl.items, P.itemPerUnit * b.length);
  }

  // ── 상태 ───────────────────────────────────────────────────
  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  function newPlayer(R) {
    return { hp: R.hp, gold: R.start.gold, lvl: R.start.level, xp: R.start.xp, units: [], shop: [], streak: 0, items: R.start.items,
      alive: true, place: 0, acts: 0, done: false, last: null,
      st: { rolls: 0, bought: 0, sold: 0, xpBought: 0, goldSpent: 0, interest: 0, streakGold: 0, wins: 0, losses: 0, dmgTaken: 0, lvlAt: {} } };
  }

  function create(o) {
    o = o || {};
    const R = getRules(o.rules);
    const n = Math.max(2, Math.min(R.players, (o.players | 0) || R.players));
    const seed = (o.seed == null ? 1 : o.seed) | 0;
    const t = table(R);
    const s = {
      v: 1, rules: R, n, seed, rng: seed,
      stage: R.firstStage, round: 1, roundNo: 0,
      phase: 'plan', order: [], oi: 0, turn: 0,
      pool: [], players: [], log: [], result: null, deaths: 0,
    };
    for (let u = 0; u < t.n; u++) s.pool.push(R.copies[t.cost[u] - 1]);
    for (let p = 0; p < n; p++) s.players.push(newPlayer(R));
    // 시작 유닛: 코스트 목록대로 풀에서 하나씩
    for (let p = 0; p < n; p++) for (const c of R.start.units) { const u = drawCost(s, c); if (u >= 0) s.players[p].units.push({ u, st: 1 }); }
    for (const pl of s.players) { combineAll(s, pl); sortUnits(s, pl); }
    beginRound(s, true);
    return s;
  }

  // 풀에서 코스트 c 하나 (남은 장수 비례). 없으면 -1
  function drawCost(s, c) {
    const t = table(s.rules); const a = t.firstOf[c], b = a + s.rules.units[c - 1];
    let tot = 0; for (let u = a; u < b; u++) tot += s.pool[u];
    if (tot <= 0) return -1;
    let r = Math.floor(rnd(s) * tot);
    for (let u = a; u < b; u++) { r -= s.pool[u]; if (r < 0) { s.pool[u]--; return u; } }
    return -1;
  }
  function drawShopUnit(s, lvl) {
    const od = s.rules.odds[Math.min(lvl, s.rules.odds.length - 1)];
    for (let tries = 0; tries < 8; tries++) {
      let r = rnd(s) * 100, c = 1;
      for (let k = 0; k < 5; k++) { r -= od[k]; if (r < 0) { c = k + 1; break; } }
      const u = drawCost(s, c); if (u >= 0) return u;
    }
    for (let c = 1; c <= 5; c++) { const u = drawCost(s, c); if (u >= 0) return u; }
    return -1;
  }
  function returnShop(s, pl) { for (const u of pl.shop) if (u >= 0) s.pool[u]++; pl.shop = []; }
  function refreshShop(s, pl) {
    returnShop(s, pl);
    for (let i = 0; i < s.rules.slots; i++) pl.shop.push(drawShopUnit(s, pl.lvl));
  }

  // 같은 유닛 같은 성급 3개 → 한 단계 위 (3성까지, 연쇄)
  function combineAll(s, pl) {
    for (let changed = true; changed;) {
      changed = false;
      const seen = new Map();
      for (let i = 0; i < pl.units.length; i++) {
        const x = pl.units[i]; if (x.st >= 3) continue;
        const k = x.u * 4 + x.st; const arr = seen.get(k) || []; arr.push(i); seen.set(k, arr);
        if (arr.length === 3) {
          const keep = arr[0]; pl.units[keep] = { u: x.u, st: x.st + 1 };
          pl.units.splice(arr[2], 1); pl.units.splice(arr[1], 1);
          changed = true; break;
        }
      }
    }
  }
  const room = (s, pl) => pl.lvl + s.rules.bench - pl.units.length;
  // 사면 바로 합쳐지나 (벤치가 꽉 차도 살 수 있는 경우)
  function completes(pl, u) { let k = 0; for (const x of pl.units) if (x.u === u && x.st === 1) k++; return k >= 2; }
  function sellValue(s, x) { return s.rules.sell[costOf(s, x.u)][x.st - 1]; }

  function addXp(s, pl, n) {
    const R = s.rules;
    if (pl.lvl >= R.maxLevel) { pl.xp = 0; return; }
    pl.xp += n;
    while (pl.lvl < R.maxLevel && pl.xp >= R.xpNeed[pl.lvl + 1]) {
      pl.xp -= R.xpNeed[pl.lvl + 1]; pl.lvl++;
      pl.st.lvlAt[pl.lvl] = s.stage + '-' + s.round;
    }
    if (pl.lvl >= R.maxLevel) pl.xp = 0;
  }
  const interestOf = (R, g) => Math.min(R.interestCap, Math.floor(Math.max(0, g) / R.interestStep));
  function streakGold(R, k) { k = Math.abs(k); let g = 0; for (const [at, v] of R.streak) if (k >= at) g = v; return g; }
  function baseIncome(s) { const R = s.rules; return s.roundNo < R.incomeStart.length ? R.incomeStart[s.roundNo] : R.income; }
  const isCarousel = s => s.round === s.rules.carousel;
  const isPvE = s => s.round === s.rules.pve;
  const label = s => s.stage + '-' + s.round;
  const alive = s => { const a = []; for (let p = 0; p < s.n; p++) if (s.players[p].alive) a.push(p); return a; };

  // 라운드 시작: 수입 · 경험치 · 회전목마 · 상점 → 계획 단계
  function beginRound(s, first) {
    const R = s.rules; const al = alive(s);
    for (const p of al) {
      const pl = s.players[p];
      const base = baseIncome(s), it = interestOf(R, pl.gold), sg = streakGold(R, pl.streak);
      pl.gold += base + it + sg; pl.st.interest += it; pl.st.streakGold += sg;
      addXp(s, pl, R.xpPassive);
      pl.acts = 0; pl.done = false;
    }
    if (isCarousel(s)) {
      // 체력 낮은 사람부터: 스테이지에 맞는 코스트 유닛 하나 + 아이템 하나
      const ord = al.slice().sort((a, b) => (s.players[a].hp - s.players[b].hp) || (a - b));
      const c = Math.max(1, Math.min(4, s.stage - 1));
      for (const p of ord) {
        const pl = s.players[p];
        const got = drawCost(s, Math.min(5, c + (rnd(s) < 0.3 ? 1 : 0)));
        const uu = got >= 0 ? got : drawCost(s, c);
        if (uu >= 0) {
          pl.units.push({ u: uu, st: 1 }); combineAll(s, pl);
          // 넘치면 가장 약한 벤치 유닛을 판다
          sortUnits(s, pl);
          while (room(s, pl) < 0) { const x = pl.units.pop(); pl.gold += sellValue(s, x); s.pool[x.u] += COPIES_OF_STAR[x.st]; }
        }
        pl.items++;
      }
    }
    for (const p of al) { const pl = s.players[p]; sortUnits(s, pl); refreshShop(s, pl); }
    // 계획 순서: 라운드마다 한 칸씩 돌림
    const k = s.roundNo % al.length;
    s.order = al.slice(k).concat(al.slice(0, k)); s.oi = 0; s.turn = s.order[0]; s.phase = 'plan';
  }

  // ── 행동 ───────────────────────────────────────────────────
  function legal(s) {
    const m = new Array(N_ACTIONS).fill(false);
    if (s.phase !== 'plan') return m;
    const R = s.rules, pl = s.players[s.turn];
    m[A_END] = true;
    if (pl.acts >= MAX_ACTS) return m;
    for (let i = 0; i < pl.shop.length; i++) {
      const u = pl.shop[i]; if (u < 0) continue;
      if (pl.gold >= costOf(s, u) && (room(s, pl) > 0 || completes(pl, u))) m[A_BUY + i] = true;
    }
    if (pl.gold >= R.rollCost) m[A_ROLL] = true;
    if (pl.lvl < R.maxLevel && pl.gold >= R.xpCost) m[A_XP] = true;
    const nb = pl.units.length - pl.lvl;
    for (let j = 0; j < Math.min(R.bench, nb); j++) m[A_SELL + j] = true;
    return m;
  }
  const isLegal = (s, a) => a >= 0 && a < N_ACTIONS && legal(s)[a];

  function apply(s, a) {
    if (!isLegal(s, a)) throw new Error('할 수 없는 행동 ' + a + ' (' + s.phase + ')');
    const R = s.rules, p = s.turn, pl = s.players[p];
    pl.acts++; pl.last = a;
    if (a < A_ROLL) {
      const u = pl.shop[a - A_BUY], c = costOf(s, u);
      pl.gold -= c; pl.st.goldSpent += c; pl.st.bought++;
      pl.shop[a - A_BUY] = -1;
      pl.units.push({ u, st: 1 }); combineAll(s, pl); sortUnits(s, pl);
    } else if (a === A_ROLL) {
      pl.gold -= R.rollCost; pl.st.goldSpent += R.rollCost; pl.st.rolls++;
      refreshShop(s, pl);
    } else if (a === A_XP) {
      pl.gold -= R.xpCost; pl.st.goldSpent += R.xpCost; pl.st.xpBought++;
      addXp(s, pl, R.xpBuy); sortUnits(s, pl);
    } else if (a === A_END) {
      pl.done = true; returnShop(s, pl); pl.shop = [];
      s.oi++;
      if (s.oi < s.order.length) s.turn = s.order[s.oi];
      else resolveRound(s);
    } else {
      const j = a - A_SELL, idx = pl.lvl + j, x = pl.units[idx];
      pl.units.splice(idx, 1); pl.gold += sellValue(s, x); pl.st.sold++;
      s.pool[x.u] += COPIES_OF_STAR[x.st];
    }
    return s;
  }

  // ── 전투 · 라운드 끝 ─────────────────────────────────────────
  function winP(s, A, B) { const g = s.rules.power.gamma; const a = Math.pow(Math.max(A, 0.01), g), b = Math.pow(Math.max(B, 0.01), g); return a / (a + b); }
  function damage(s, winnerPl, pWin) {
    const R = s.rules; const b = boardOf(winnerPl);
    const m = 0.15 + 0.85 * Math.max(0, pWin - 0.3) / 0.7;
    const k = Math.max(1, Math.min(b.length, Math.round(b.length * m)));
    let d = R.stageDmg[Math.min(s.stage, R.stageDmg.length - 1)];
    for (let i = 0; i < k; i++) d += R.unitDmg[b[i].st];
    return d;
  }
  function hit(s, p, d) { const pl = s.players[p]; pl.hp -= d; pl.st.dmgTaken += d; }

  function resolveRound(s) {
    const R = s.rules; const al = alive(s);
    const rec = { r: label(s), fights: [] };
    if (isPvE(s)) {
      const cs = R.pveStr[Math.min(s.stage, R.pveStr.length - 1)];
      for (const p of al) {
        const pl = s.players[p], pw = winP(s, strength(s, pl), cs);
        if (rnd(s) < pw) { pl.items++; pl.gold += R.pveGold; rec.fights.push([p, -1, 1]); }
        else { pl.items++; const d = R.stageDmg[Math.min(s.stage, R.stageDmg.length - 1)]; hit(s, p, d); rec.fights.push([p, -1, 0, d]); }
      }
    } else if (!isCarousel(s)) {
      const ord = shuffle(al.slice(), () => rnd(s));
      for (let i = 0; i < ord.length; i += 2) {
        const a = ord[i];
        let b = ord[i + 1], ghost = false;
        if (b == null) { ghost = true; const others = al.filter(x => x !== a); b = others[Math.floor(rnd(s) * others.length)]; }
        const PA = s.players[a], PB = s.players[b];
        const pa = winP(s, strength(s, PA), strength(s, PB));
        const aWins = rnd(s) < pa;
        const W = aWins ? a : b, L = aWins ? b : a;
        const d = damage(s, s.players[W], aWins ? pa : 1 - pa);
        // 유령(홀수일 때 복사본)은 결과가 원래 주인에게 안 감
        if (!ghost || L === a) hit(s, L, d);
        for (const [q, won] of [[a, aWins], [b, !aWins]]) {
          if (ghost && q === b) continue;
          const pl = s.players[q];
          if (won) { pl.streak = pl.streak > 0 ? pl.streak + 1 : 1; pl.st.wins++; }
          else { pl.streak = pl.streak < 0 ? pl.streak - 1 : -1; pl.st.losses++; }
        }
        rec.fights.push([a, b, aWins ? 1 : 0, d, ghost ? 1 : 0]);
      }
    }
    // 탈락: 이번에 0 이하가 된 사람들 (남은 체력 낮은 쪽이 더 낮은 등수)
    const dead = al.filter(p => s.players[p].hp <= 0).sort((x, y) => (s.players[x].hp - s.players[y].hp) || (y - x));
    let left = al.length;
    for (const p of dead) {
      const pl = s.players[p]; pl.alive = false; pl.place = left--; s.deaths++;
      for (const x of pl.units) s.pool[x.u] += COPIES_OF_STAR[x.st];
      pl.units = []; returnShop(s, pl);
    }
    s.log.push(rec); if (s.log.length > 12) s.log.shift();
    const still = alive(s);
    // 다음 라운드
    s.roundNo++; s.round++;
    if (s.round > R.roundsPerStage) { s.round = 1; s.stage++; }
    if (still.length <= 1 || s.stage > R.maxStage) return finish(s, still);
    beginRound(s, false);
  }

  function finish(s, still) {
    // 살아남은 사람들: 체력 높은 순 (같으면 보드 힘)
    still.sort((x, y) => (s.players[y].hp - s.players[x].hp) || (strength(s, s.players[y]) - strength(s, s.players[x])) || (x - y));
    still.forEach((p, i) => { s.players[p].place = i + 1; });
    s.phase = 'end'; s.turn = -1;
    s.result = { place: s.players.map(pl => pl.place), round: label(s) };
    return s;
  }

  // ── 학습용 ─────────────────────────────────────────────────
  // 보상: 등수 → [-1, +1] (1등 +1, 꼴등 -1)
  function reward(s, p) { if (!s.result) return 0; const n = s.n; return 1 - 2 * (s.players[p].place - 1) / (n - 1); }

  // 그 자리에서 보이는 것만: 남의 상점 · 난수 씨앗 가림 (보드 · 체력 · 골드 · 레벨은 원래 공개)
  function view(s, p) {
    const v = clone(s);
    v.seed = 0; v.rng = 0; v.me = p;
    for (let q = 0; q < v.n; q++) if (q !== p) v.players[q].shop = [];
    return v;
  }

  // 관찰 벡터 (RL.md 표 순서 그대로). 길이 OBS_LEN
  const OBS_LEN = 20 + 5 * 8 + 15 + 7 * 4;
  function obs(s, p) {
    const R = s.rules, pl = s.players[p], o = [];
    const al = alive(s); const myStr = strength(s, pl);
    const opp = al.filter(q => q !== p).map(q => s.players[q]);
    const oppStr = opp.map(q => strength(s, q));
    const avg = oppStr.length ? oppStr.reduce((a, b) => a + b, 0) / oppStr.length : myStr;
    const need = pl.lvl < R.maxLevel ? R.xpNeed[pl.lvl + 1] : 1;
    const nb = Math.max(0, pl.units.length - pl.lvl);
    // 기본 20칸
    o.push(s.stage / 8, s.round / R.roundsPerStage, pl.lvl / R.maxLevel, pl.lvl < R.maxLevel ? pl.xp / need : 1,
      Math.min(pl.gold, 100) / 100, (pl.gold % R.interestStep) / R.interestStep, interestOf(R, pl.gold) / R.interestCap,
      pl.hp / R.hp, Math.max(-10, Math.min(10, pl.streak)) / 10, al.length / s.n,
      Math.min(myStr / 60, 2), avg > 0 ? Math.min(myStr / avg, 3) / 3 : 0.5,
      isCarousel(s) ? 1 : 0, isPvE(s) ? 1 : 0, nb / R.bench, Math.min(pl.units.length, pl.lvl) / R.maxLevel,
      Math.min(pl.items, 20) / 20, pl.acts / MAX_ACTS, s.roundNo / 60, (R.id === 'B') ? 1 : 0);
    // 상점 5칸 × 8: 비었나 · 코스트 원핫 5 · 이미 가진 같은 유닛(1성) 수/2 · 사면 합쳐지나
    for (let i = 0; i < 5; i++) {
      const u = i < pl.shop.length ? pl.shop[i] : -1;
      if (u < 0) { o.push(1, 0, 0, 0, 0, 0, 0, 0); continue; }
      const c = costOf(s, u); let k = 0; for (const x of pl.units) if (x.u === u && x.st === 1) k++;
      o.push(0); for (let j = 1; j <= 5; j++) o.push(j === c ? 1 : 0); o.push(Math.min(k, 2) / 2, k >= 2 ? 1 : 0);
    }
    // 내 유닛: 코스트 × 성급 개수 (15)
    const cnt = new Array(15).fill(0);
    for (const x of pl.units) cnt[(costOf(s, x.u) - 1) * 3 + (x.st - 1)]++;
    for (const v of cnt) o.push(Math.min(v, 9) / 9);
    // 상대 7명 (체력 높은 순) × 4: 살아 있음 · 체력 · 레벨 · 힘(내 힘 대비)
    const others = []; for (let q = 0; q < s.n; q++) if (q !== p) others.push(s.players[q]);
    others.sort((a, b) => b.hp - a.hp);
    for (let i = 0; i < 7; i++) {
      const q = others[i];
      if (!q || !q.alive) { o.push(0, 0, 0, 0); continue; }
      const st = strength(s, q);
      o.push(1, q.hp / R.hp, q.lvl / R.maxLevel, myStr > 0 ? Math.min(st / myStr, 3) / 3 : 1);
    }
    return o;
  }

  // onecard 규약: 마스크 = Uint8Array, obs = Float32Array, step = 순수 함수 (원본 안 바뀜)
  function legalMask(s) { const m = legal(s), u = new Uint8Array(N_ACTIONS); for (let i = 0; i < N_ACTIONS; i++) u[i] = m[i] ? 1 : 0; return u; }
  function obsF32(s, p) { return Float32Array.from(obs(s, p)); }
  function step(s, a) {
    const t = clone(s), who = t.turn, r0 = t.roundNo;
    apply(t, a);
    const events = [{ type: 'act', p: who, a }];
    if (t.roundNo !== r0) events.push({ type: 'round', fights: t.log[t.log.length - 1].fights });
    if (t.phase === 'end') events.push({ type: 'end', place: t.result.place });
    return { state: t, events };
  }

  function hash(s) {
    const str = JSON.stringify(s);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  function actionLabel(s, a) {
    if (a < A_ROLL) { const u = s && s.phase === 'plan' ? s.players[s.turn].shop[a] : -1; return '사기 ' + (u >= 0 ? unitName(s.rules, u) : (a + 1) + '칸'); }
    if (a === A_ROLL) return '새로고침';
    if (a === A_XP) return '경험치';
    if (a === A_END) return '준비 끝';
    return '팔기 벤치 ' + (a - A_SELL + 1);
  }
  // 풀 보존 검사 (시험용): 풀 + 상점 + 모든 유닛 장수 = 처음 장수
  function poolCheck(s) {
    const R = s.rules, t = table(R); const have = s.pool.slice();
    for (const pl of s.players) {
      for (const u of pl.shop) if (u >= 0) have[u]++;
      for (const x of pl.units) have[x.u] += COPIES_OF_STAR[x.st];
    }
    for (let u = 0; u < t.n; u++) if (have[u] !== R.copies[t.cost[u] - 1]) return 'u' + u + ' ' + have[u] + '≠' + R.copies[t.cost[u] - 1];
    return '';
  }

  const API = {
    VERSION: 1, A_BUY, A_ROLL, A_XP, A_END, A_SELL, N_ACTIONS, MAX_ACTS, OBS_LEN,
    RULES_A, RULES_B, RULESETS, ROSTER_A,
    rnd, shuffle, makeRng, getRules, table, unitName, costOf,
    create, legal, legalMask, isLegal, apply, step, view, obs, obsF32, reward, hash, clone, actionLabel,
    strength, unitPow, boardOf, benchOf, interestOf, streakGold, winP, poolCheck, sellValue, completes,
    isCarousel, isPvE, label, alive,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AutoChess = API;
})(this);

/* 윷놀이 — 규칙 코어 (브라우저·Node·Web Worker 공용, 화면과 AI 는 이 함수들만 씀)
   · 상태 = JSON 그대로 저장되는 평범한 객체. Math.random·Date 없음 (난수는 상태 안 mulberry32: s.rng)
   · 윷판 29점: 바깥 20점 + 대각선 8점 + 가운데(방) 1점. 칸 번호는 아래 그림
   · 결정은 늘 s.turn 팀이 함: step(s, 행동번호) → { state, events } (events 는 화면 움직임·소리용)
   · 강화학습: obs(s, team) · legalMask(s) · 행동표는 RL.md

   칸 번호 (위가 북쪽, 말은 오른쪽 아래 '참먹이' 옆에서 시작해 시계 반대 방향으로 돎)
     10 ─── 9 ─── 8 ─── 7 ─── 6 ─── 5      5 = 모(오른쪽 위 모서리) · 10 = 뒷모(왼쪽 위)
     11   26                   21    4      15 = 찌모(왼쪽 아래) · 20 = 참먹이(오른쪽 아래, 출발·도착)
     12        27         22         3      23 = 방(가운데)
                    23                      대각선 A: 5 → 21 → 22 → 23 → 24 → 25 → 15
     13        24         28         2      대각선 B: 10 → 26 → 27 → 23 → 28 → 29 → 20
     14   25                   29    1
     15 ── 16 ── 17 ── 18 ── 19 ── 20(참먹이)
     (바깥 둘레: 1~4 오른쪽 변 아래→위 · 5 모 · 6~9 윗변 · 10 뒷모 · 11~14 왼쪽 변 · 15 찌모 · 16~19 아랫변 · 20 참먹이)
   · 0 = 아직 안 나간 말(대기), 30 = 집에 들어감(남)

   던지기 확률: 가락 4개가 저마다 '배(평평한 면)'가 위로 올 확률 p (기본 0.6) 로 독립.
     배가 위인 가락 수 1 = 도, 2 = 개, 3 = 걸, 4 = 윷, 0 = 모. 빽도(켜면): 표시된 가락 하나만 배가 위일 때 (도 대신)
     p = 0.6 → 빽도 3.8% · 도 11.5% · 개 34.6% · 걸 34.6% · 윷 13.0% · 모 2.6% (실제 윷은 둥근 등이 바닥에 잘 안 서서 배가 더 자주 위로 옴) */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Yut = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WAIT = 0, HOME = 30, NNODE = 29;
  const CORNER_MO = 5, CORNER_BACK = 10, CORNER_JJI = 15, CHAM = 20, CENTER = 23;
  // 결과 종류: 0 빽도 · 1 도 · 2 개 · 3 걸 · 4 윷 · 5 모
  const BACKDO = 0, DO = 1, GAE = 2, GEOL = 3, YUT = 4, MO = 5;
  const STEPS = [-1, 1, 2, 3, 4, 5];
  const NAMES = ['빽도', '도', '개', '걸', '윷', '모'];
  // 행동 번호: 종류*4 + 말 번호 (0~23) · 던지기 24
  const A_THROW = 24, N_ACTIONS = 25, MAXK = 4;

  // ── 난수 (mulberry32, 공개 도메인 · Tommy Ettinger) ─────────────
  function rnd(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ── 판 모양 ───────────────────────────────────────────────
  // 한 칸 앞으로: first = 이번 움직임의 첫 걸음(모서리·방에 '서 있다가' 출발하면 지름길), prev = 바로 앞 칸
  function next(n, first, prev) {
    if (n === WAIT) return 1;
    if (n === HOME) return HOME;
    if (n === CORNER_MO) return first ? 21 : 6;
    if (n === CORNER_BACK) return first ? 26 : 11;
    if (n === CHAM) return HOME;
    if (n === CENTER) { if (first) return 28; return prev === 22 ? 24 : 28; }   // 방에 서 있었으면 참먹이 쪽, 지나가면 곧장
    if (n < 20) return n + 1;
    return { 21: 22, 22: 23, 24: 25, 25: 15, 26: 27, 27: 23, 28: 29, 29: 20 }[n];
  }
  // 뒤로 한 칸 (지나온 길을 모를 때 쓰는 기본값)
  const PRED = [0, 20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 5, 21, 22, 23, 24, 10, 26, 23, 28];
  // 판 그림 좌표 (0~100, 위가 0)
  const XY = (() => {
    const p = [];
    const L = 6, R = 94, T = 6, B = 94, S = (R - L) / 5;
    p[20] = [R, B];
    for (let i = 1; i <= 5; i++) p[i] = [R, B - S * i];           // 오른쪽 변 (아래→위)
    for (let i = 6; i <= 10; i++) p[i] = [R - S * (i - 5), T];    // 윗변 (오른→왼)
    for (let i = 11; i <= 15; i++) p[i] = [L, T + S * (i - 10)];  // 왼쪽 변 (위→아래)
    for (let i = 16; i <= 19; i++) p[i] = [L + S * (i - 15), B];  // 아랫변 (왼→오른)
    const C = 50, lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    p[23] = [C, C];
    p[21] = lerp(p[5], p[23], 1 / 3); p[22] = lerp(p[5], p[23], 2 / 3);
    p[24] = lerp(p[23], p[15], 1 / 3); p[25] = lerp(p[23], p[15], 2 / 3);
    p[26] = lerp(p[10], p[23], 1 / 3); p[27] = lerp(p[10], p[23], 2 / 3);
    p[28] = lerp(p[23], p[20], 1 / 3); p[29] = lerp(p[23], p[20], 2 / 3);
    return p;
  })();
  const NODE_NAME = { 5: '모', 10: '뒷모', 15: '찌모', 20: '참먹이', 23: '방' };
  const EDGES = (() => {          // 그림용 선
    const e = [];
    for (let i = 1; i < 20; i++) e.push([i, i + 1]);
    e.push([20, 1]);
    e.push([5, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 15], [10, 26], [26, 27], [27, 23], [23, 28], [28, 29], [29, 20]);
    return e;
  })();

  // 집까지 남은 걸음 (원하는 곳에 늘 설 수 있다고 칠 때 가장 짧은 길) — AI·관찰용
  const DIST = (() => {
    const d = new Array(31).fill(0);
    const go = n => { if (n === HOME) return 0; let c = 0, x = n, prev = -1; while (x !== HOME) { const y = next(x, true, prev); prev = x; x = y; c++; if (c > 40) break; } return c; };
    for (let n = 0; n <= 29; n++) d[n] = go(n);
    d[HOME] = 0;
    return d;
  })();

  // ── 상태 ─────────────────────────────────────────────────
  function create(opt = {}) {
    const n = Math.max(2, Math.min(4, opt.teams | 0 || 2));
    const k = Math.max(1, Math.min(MAXK, opt.pieces | 0 || 4));
    const seed = (opt.seed >>> 0) || 1;
    const mc = Array.from({ length: n }, (_, t) => Math.max(1, ((opt.members || [])[t] | 0) || 1));
    const s = {
      v: 1, n, k, backdo: opt.backdo !== false, flatP: clampP(opt.flatP),
      seed, rng: seed | 0,
      turn: ((opt.first | 0) % n + n) % n, phase: 'throw', extra: 1, pool: [],
      pos: Array.from({ length: n }, () => new Array(k).fill(WAIT)),
      trail: Array.from({ length: n }, () => Array.from({ length: k }, () => [])),
      mc, mi: new Array(n).fill(0),
      turnNo: 0, throwNo: 0, winner: -1, sticks: null,
      stat: { caps: new Array(n).fill(0), lost: new Array(n).fill(0), yut: new Array(n).fill(0), mo: new Array(n).fill(0), back: new Array(n).fill(0) },
    };
    return s;
  }
  function clampP(p) { p = Number(p); return p > 0.05 && p < 0.95 ? p : 0.6; }
  function clone(s) {
    return {
      ...s, pool: s.pool.slice(), pos: s.pos.map(a => a.slice()), trail: s.trail.map(a => a.map(t => t.slice())),
      mc: s.mc.slice(), mi: s.mi.slice(), sticks: s.sticks ? s.sticks.slice() : null,
      stat: { caps: s.stat.caps.slice(), lost: s.stat.lost.slice(), yut: s.stat.yut.slice(), mo: s.stat.mo.slice(), back: s.stat.back.slice() },
    };
  }

  // 던지기 확률표 (종류별)
  function probs(flatP = 0.6, backdo = true) {
    const p = clampP(flatP), q = 1 - p;
    const r = [0, 4 * p * q * q * q, 6 * p * p * q * q, 4 * p * p * p * q, p * p * p * p, q * q * q * q];
    if (backdo) { r[BACKDO] = p * q * q * q; r[DO] -= r[BACKDO]; }
    return r;
  }
  function kindOfSticks(st, backdo) {
    const f = st[0] + st[1] + st[2] + st[3];
    if (f === 0) return MO;
    if (f === 1) return backdo && st[0] === 1 ? BACKDO : DO;
    return f;   // 2 개 · 3 걸 · 4 윷
  }

  // ── 움직임 계산 ───────────────────────────────────────────
  // 말 하나가 kind 로 가는 길 (지나는 칸 차례대로, 마지막이 도착). 못 가면 null
  function pathOf(s, t, p, kind) {
    const at = s.pos[t][p];
    if (at === HOME) return null;
    if (kind === BACKDO) {
      if (at === WAIT) return null;
      const tr = s.trail[t][p];
      const prev = tr.length >= 2 && tr[tr.length - 1] === at ? tr[tr.length - 2] : PRED[at];
      return [prev];
    }
    const out = [];
    let x = at, prev = -1;
    const n = STEPS[kind];
    for (let i = 0; i < n; i++) {
      const y = next(x, i === 0, prev);
      prev = x; x = y; out.push(x);
      if (x === HOME) break;
    }
    return out;
  }
  const destOf = (s, t, p, kind) => { const pa = pathOf(s, t, p, kind); return pa ? pa[pa.length - 1] : -1; };
  // 같은 칸의 내 말 묶음 (업힌 말)
  function groupOf(s, t, p) {
    const at = s.pos[t][p];
    if (at === WAIT || at === HOME) return [p];
    const g = [];
    for (let i = 0; i < s.k; i++) if (s.pos[t][i] === at) g.push(i);
    return g;
  }
  // 대표 말인지 (대기 말은 가장 작은 번호 하나, 업힌 말은 묶음의 가장 작은 번호)
  function isRep(s, t, p) {
    const at = s.pos[t][p];
    if (at === HOME) return false;
    for (let i = 0; i < p; i++) if (s.pos[t][i] === at) return false;
    return true;
  }

  function legalActions(s) {
    if (s.phase === 'throw') return [A_THROW];
    if (s.phase !== 'move') return [];
    const out = [], t = s.turn, seen = new Set();
    for (const kind of s.pool) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      for (let p = 0; p < s.k; p++) {
        if (!isRep(s, t, p)) continue;
        if (pathOf(s, t, p, kind)) out.push(kind * MAXK + p);
      }
    }
    return out;
  }
  function isLegal(s, a) { return legalActions(s).includes(a); }
  function legalMask(s) { const m = new Uint8Array(N_ACTIONS); for (const a of legalActions(s)) m[a] = 1; return m; }
  const decode = a => (a === A_THROW ? { throw: true } : { kind: Math.floor(a / MAXK), piece: a % MAXK });

  // ── 진행 ─────────────────────────────────────────────────
  function step(s, a) { const c = clone(s); const events = apply(c, a); return { state: c, events }; }

  // 제자리에서 바꿈. events 를 돌려줌
  function apply(s, a) {
    const ev = [];
    if (s.phase === 'end') return ev;
    if (!isLegal(s, a)) throw new Error('할 수 없는 행동: ' + a);
    const t = s.turn;
    if (a === A_THROW) {
      const st = [0, 1, 2, 3].map(() => (rnd(s) < s.flatP ? 1 : 0));
      const kind = kindOfSticks(st, s.backdo);
      s.sticks = st; s.throwNo++;
      s.pool.push(kind); s.extra--;
      ev.push({ type: 'throw', team: t, kind, sticks: st });
      if (kind === YUT || kind === MO) {
        s.extra++;
        if (kind === YUT) s.stat.yut[t]++; else s.stat.mo[t]++;
        ev.push({ type: 'bonus', team: t, why: kind === YUT ? 'yut' : 'mo' });
      }
      if (s.extra <= 0) { s.phase = 'move'; settle(s, ev); }
      return ev;
    }
    const kind = Math.floor(a / MAXK), p = a % MAXK;
    const path = pathOf(s, t, p, kind);
    const group = groupOf(s, t, p);
    const from = s.pos[t][p];
    s.pool.splice(s.pool.indexOf(kind), 1);
    const dest = path[path.length - 1];
    // 지나온 길 기록 (빽도는 한 칸 되돌림)
    let tr;
    if (kind === BACKDO) {
      tr = s.trail[t][p].slice(0, -1);
      if (tr[tr.length - 1] !== dest) tr = [dest];
      s.stat.back[t]++;
    } else tr = s.trail[t][p].concat(path.filter(x => x !== HOME)).slice(-10);
    for (const g of group) { s.pos[t][g] = dest; s.trail[t][g] = dest === HOME ? [] : tr.slice(); }
    ev.push({ type: 'move', team: t, kind, pieces: group.slice(), from, to: dest, path: path.slice(), back: kind === BACKDO });
    if (dest === HOME) {
      ev.push({ type: 'home', team: t, pieces: group.slice() });
    } else {
      // 잡기: 도착 칸의 남의 말은 모두 대기로
      let caught = 0;
      for (let u = 0; u < s.n; u++) {
        if (u === t) continue;
        const vic = [];
        for (let i = 0; i < s.k; i++) if (s.pos[u][i] === dest) { s.pos[u][i] = WAIT; s.trail[u][i] = []; vic.push(i); }
        if (vic.length) { ev.push({ type: 'capture', team: t, victim: u, pieces: vic, at: dest }); caught += vic.length; s.stat.lost[u] += vic.length; }
      }
      if (caught) { s.stat.caps[t] += caught; s.extra++; ev.push({ type: 'bonus', team: t, why: 'capture' }); }
      // 업기: 이미 그 칸에 있던 내 말과 합침
      const others = [];
      for (let i = 0; i < s.k; i++) if (s.pos[t][i] === dest && !group.includes(i)) others.push(i);
      if (others.length) { for (const i of others) s.trail[t][i] = tr.slice(); ev.push({ type: 'stack', team: t, pieces: group.concat(others).sort((x, y) => x - y), at: dest }); }
    }
    if (s.pos[t].every(x => x === HOME)) {
      s.phase = 'end'; s.winner = t; s.pool = []; s.extra = 0;
      ev.push({ type: 'win', team: t });
      return ev;
    }
    if (s.extra > 0) { s.phase = 'throw'; return ev; }
    settle(s, ev);
    return ev;
  }
  // 정해진 결과로 던진 셈 치기 (AI 내다보기·시험용, 난수 안 씀)
  function forceThrow(s, kind) {
    const ev = [];
    if (s.phase !== 'throw') throw new Error('던질 때가 아님');
    const t = s.turn;
    s.pool.push(kind); s.extra--; s.throwNo++;
    s.sticks = kind === MO ? [0, 0, 0, 0] : kind === BACKDO ? [1, 0, 0, 0] : [0, 1, 2, 3].map(i => (i >= 4 - kind ? 1 : 0));
    ev.push({ type: 'throw', team: t, kind, sticks: s.sticks.slice() });
    if (kind === YUT || kind === MO) { s.extra++; ev.push({ type: 'bonus', team: t, why: kind === YUT ? 'yut' : 'mo' }); }
    if (s.extra <= 0) { s.phase = 'move'; settle(s, ev); }
    return ev;
  }
  // 남은 결과로 둘 수 있는 게 없으면 버리고 차례 넘김
  function settle(s, ev) {
    if (s.pool.length && legalActions(s).length) { s.phase = 'move'; return; }
    if (s.pool.length) { ev.push({ type: 'forfeit', team: s.turn, kinds: s.pool.slice() }); s.pool = []; }
    endTurn(s, ev);
  }
  function endTurn(s, ev) {
    const t = s.turn;
    s.mi[t] = (s.mi[t] + 1) % s.mc[t];
    s.turn = (t + 1) % s.n; s.phase = 'throw'; s.extra = 1; s.pool = []; s.turnNo++;
    ev.push({ type: 'turn', team: s.turn, prev: t });
  }

  // ── 보기 · 요약 ───────────────────────────────────────────
  const homeCount = (s, t) => s.pos[t].filter(x => x === HOME).length;
  const waitCount = (s, t) => s.pos[t].filter(x => x === WAIT).length;
  // 판 위 묶음 목록 [{ team, node, pieces }]
  function stacks(s) {
    const out = [];
    for (let t = 0; t < s.n; t++) {
      const m = new Map();
      for (let i = 0; i < s.k; i++) { const x = s.pos[t][i]; if (x > 0 && x < HOME) { if (!m.has(x)) m.set(x, []); m.get(x).push(i); } }
      for (const [node, pieces] of m) out.push({ team: t, node, pieces });
    }
    return out;
  }
  // 남에게 보낼 상태 (난수 상태와 씨앗을 지워 앞으로 나올 윷을 미리 못 보게 — 난수 상태는 씨앗 + 던진 횟수×4 번 부른 값이라 씨앗을 알면 계산됨)
  function view(s) { const c = clone(s); c.rng = 0; c.seed = 0; return c; }

  // ── 강화학습 관찰 (RL.md) ─────────────────────────────────
  // 팀을 나부터 돌려 세운 뒤: 팀마다 칸 0~30 위 말 수/4 (4×31) · 결과 주머니 종류별 수/3 (6) · 단계 (던지기·옮기기) · 팀 수 one-hot(2·3·4) · 말 수/4 · 빽도 켬 · 남은 던지기/3
  const OBS_LEN = 4 * 31 + 6 + 2 + 3 + 1 + 1 + 1;
  function obs(s, team) {
    const o = new Float32Array(OBS_LEN);
    for (let r = 0; r < s.n; r++) {
      const t = (team + r) % s.n;
      for (let i = 0; i < s.k; i++) o[r * 31 + s.pos[t][i]] += 0.25;
    }
    let j = 4 * 31;
    for (const kd of s.pool) o[j + kd] += 1 / 3;
    j += 6;
    o[j + (s.phase === 'move' ? 1 : 0)] = s.phase === 'end' ? 0 : 1; j += 2;
    o[j + s.n - 2] = 1; j += 3;
    o[j++] = s.k / 4;
    o[j++] = s.backdo ? 1 : 0;
    o[j++] = Math.min(1, s.extra / 3);
    return o;
  }
  // 끝난 판의 보상: 이긴 팀 +1, 나머지 -1/(n-1)
  const reward = (s, team) => (s.phase !== 'end' ? 0 : s.winner === team ? 1 : -1 / (s.n - 1));

  return {
    WAIT, HOME, NNODE, CORNER_MO, CORNER_BACK, CORNER_JJI, CHAM, CENTER,
    BACKDO, DO, GAE, GEOL, YUT, MO, STEPS, NAMES, A_THROW, N_ACTIONS, MAXK, OBS_LEN,
    XY, EDGES, NODE_NAME, DIST, PRED,
    rnd, next, create, clone, probs, kindOfSticks, pathOf, destOf, groupOf, isRep,
    legalActions, isLegal, legalMask, decode, step, apply, forceThrow, stacks, homeCount, waitCount, view, obs, reward,
  };
});

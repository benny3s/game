/* 장기 자체 시험 — node game/janggi/test/selftest.js   (빠르게: quick · AI 대국 판 수: games=8)
   1) 판 모양: 궁성 대각선(가운데 4 · 모서리 1 · 변 0) · 궁/사 걸음 수 · 처음 판 초 31수(손으로 셈, 상차림 16가지 모두)
   2) 기물 규칙 하나하나: 포(다리 하나 · 포는 다리 X · 포는 못 잡음 · 궁성 대각선) · 졸(앞·옆 · 적 궁성 앞 대각선만) · 마/상 멱 · 차 궁성 대각선 · 궁/사 궁성 밖 못 나감
      (일부 사례는 neil-armstrong-fig/janggi(MIT) 의 시험을 옮김)
   3) 수 생성 맞춰 보기: 이 파일 안의 '느리지만 곧이곧대로 쓴' 다른 생성기(좌표 객체 · 규칙 문장 그대로)와
      perft(깊이 1~3, 상차림 4가지) · 엔진 perft(깊이 4) · 아무렇게나 둔 판 수천 국면에서 합법 수 집합이 모두 같은지
   4) 장군 · 외통 · 핀 · 빅장(점수/무승부/없음) · 한수 쉼(언제나/둘 곳 없을 때만, 둘 다 쉬면 점수) · 같은 국면 세 번 · 수 제한 · 점수(72 : 73.5) · 상차림 자리 · 기권 · 무르기 · 기보
   5) 아무렇게나 끝까지 둔 판: 반칙 상태 없음 (궁 잡힘 · 궁/사 궁성 밖 · 둔 쪽 궁이 장군에 남음 · 졸 뒤로 …)
   6) AI: 한 수 외통 · 공짜 차 잡기 · 잡힐 기물 피하기 · 결정성 · 선생님 까닭(공짜 · 장군 · 피하기 …)
   7) AI 끼리 (일꾼 스레드): 🐯 고급 > 🐱 중급 > 🐣 초급, 반칙 없음
   8) 학습 입력(RL.md): 관찰 길이 · 행동 번호 겹침 없음 · 합법 수 가림 */
'use strict';
const path = require('path');
const C = require('../core.js');
const AI = require('../ai.js');
const QUICK = process.argv.includes('quick');
const GAMES = +((process.argv.find(a => a.startsWith('games=')) || '').split('=')[1] || (QUICK ? 4 : 8));
const T0 = Date.now();

// ── 일꾼 스레드: AI 끼리 한 판 ──
const WT = require('worker_threads');
if (!WT.isMainThread) {
  const { ta, tb, aCho, seed } = WT.workerData;
  const R = rng(seed);
  const s = C.create();
  const opt = t => t === 'hard' ? { tier: 'hard', nodes: 60000, timeMs: 1e9 } : { tier: t };
  let illegal = 0, maxMs = 0, n = 0;
  while (!s.over && n++ < 400) {
    const aTurn = (s.turn === C.CHO) === aCho;
    let mv;
    if (s.phase === 'setup') mv = (s.turn === C.HAN ? 'h=' : 'c=') + Math.floor(R() * 4);      // 상차림은 아무렇게나 (판마다 다르게)
    else { const r = AI.think(C.toJSON(s), Object.assign({ seed: seed * 977 + s.moves.length }, opt(aTurn ? ta : tb))); maxMs = Math.max(maxMs, r.ms); mv = r.move; }
    if (!mv || C.step(s, mv)[0].type === 'illegal') { illegal = 1; break; }
  }
  WT.parentPort.postMessage({ winner: s.winner, aCho, plies: s.plies, reason: s.reason || 'unfinished', illegal, maxMs, score: C.score(s) });
  return;
}
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
const section = t => console.log('\n■ ' + t);
const L = C.lo;
const sq = (file, rank) => (rank - 1) * 9 + (file - 1);           // 시험 좌표: 칸 1~9 (왼쪽부터) · 줄 1~10 (위부터, 한이 위)
const mk = (t, side) => C.mk(t, side);
const B = list => { const b = new Int8Array(90); for (const [t, side, f, r] of list) b[sq(f, r)] = mk(t, side); return b; };
const dests = (b, from) => { const out = []; L.genPseudo(b, C.sideOf(b[from]), out, false); return out.filter(m => (m >> 7) === from).map(m => m & 127).sort((x, y) => x - y); };
const set = (...ps) => ps.map(([f, r]) => sq(f, r)).sort((x, y) => x - y);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const { K, A, E, H, R, P, CHO, HAN } = C, CN = C.C;

// ════════ 1) 판 모양 ════════
section('판 모양 · 처음 판');
ok(L.diagSteps(sq(5, 2)).length === 4 && L.diagSteps(sq(5, 9)).length === 4, '궁성 가운데 대각선 4');
ok([sq(4, 1), sq(6, 1), sq(4, 3), sq(6, 3), sq(4, 8), sq(6, 10)].every(x => L.diagSteps(x).length === 1), '궁성 모서리 대각선 1');
ok([sq(5, 1), sq(4, 2), sq(6, 2), sq(5, 3), sq(5, 8), sq(4, 9)].every(x => L.diagSteps(x).length === 0), '궁성 변 가운데 대각선 없음');
ok(L.diagSteps(sq(5, 5)).length === 0 && L.diagSteps(sq(3, 2)).length === 0, '궁성 밖 대각선 없음');
ok(L.KSTEP[sq(5, 9)].length === 8 && L.KSTEP[sq(4, 8)].length === 3 && L.KSTEP[sq(5, 10)].length === 3, '궁 걸음: 가운데 8 · 모서리 3 · 변 3');
for (let a = 0; a < 4; a++) for (let h = 0; h < 4; h++) {
  const s = C.create({ setup: [a, h] });
  ok(C.legal(s).filter(x => !x.pass).length === 31, `처음 판 초 31수 (초 ${C.SETUPS[a].name} · 한 ${C.SETUPS[h].name})`);
}
{
  const s = C.create({ setup: [2, 2] }), L1 = C.legal(s);
  const of = t => L1.filter(x => x.piece === t).length;
  ok(of(CN) === 0, '처음 판 포는 못 움직임 (다리가 없거나 포)');
  ok(of(E) === 0 && of(H) === 4, '마상상마: 상 0수 · 마 4수');
  ok(of(R) === 4 && of(A) === 4 && of(K) === 6 && of(P) === 13, '차 4 · 사 4 · 궁 6 · 졸 13 (손으로 셈)');
  const t = C.create({ setup: [3, 3] }), L2 = C.legal(t), of2 = x => L2.filter(y => y.piece === x).length;
  ok(of2(E) === 2 && of2(H) === 2, '상마마상: 상 2수 · 마 2수');
  ok(C.legal(s).some(x => x.pass), '처음 판에도 한수 쉼 가능 (규칙 기본)');
}
// 상차림 자리 (그 사람 자리에서 왼쪽부터)
{
  const s = C.create({ setup: [0, 0] });            // 마상마상 · 마상마상
  ok(C.toFen(s.b, s.turn) === 'reha1aehr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RHEA1AHER c', '상차림 자리: 초는 왼쪽(1칸)부터, 한은 한 자리에서 왼쪽(9칸)부터', C.toFen(s.b, s.turn));
  const t = C.create({ setup: [2, 3] });
  ok(C.toFen(t.b, t.turn).startsWith('reha1aher/') && C.toFen(t.b, t.turn).endsWith('RHEA1AEHR c'), '마상상마(초) · 상마마상(한)');
  const u = C.create();
  ok(u.phase === 'setup' && u.turn === HAN && C.legal(u).map(x => x.uci).join() === 'h=0,h=1,h=2,h=3', '상차림은 한이 먼저');
  ok(C.step(u, 'c=1')[0].type === 'illegal', '한보다 먼저 초가 고를 수 없음');
  C.step(u, 'h=1');
  ok(u.turn === CHO && u.phase === 'setup', '한 다음 초가 고름');
  C.step(u, 'c=3');
  ok(u.phase === 'play' && u.turn === CHO && u.setup.join() === '3,1', '둘 다 고르면 초부터 둠');
}
{
  const s = C.create({ setup: [2, 2] }), sc = C.score(s);
  ok(sc.cho === 72 && sc.han === 73.5, '처음 점수 초 72 · 한 73.5 (덤 1.5)', JSON.stringify(sc));
}

// ════════ 2) 기물 규칙 ════════
section('기물 하나하나');
{
  let b = B([[CN, CHO, 5, 5]]);
  ok(dests(b, sq(5, 5)).length === 0, '포: 넘을 것이 없으면 못 움직임');
  b = B([[CN, CHO, 5, 5], [P, HAN, 5, 3]]);
  ok(same(dests(b, sq(5, 5)), set([5, 2], [5, 1])), '포: 다리 넘어 빈 곳 모두 (다리 앞은 X)');
  b = B([[CN, CHO, 5, 5], [P, CHO, 5, 3]]);
  ok(dests(b, sq(5, 5)).includes(sq(5, 2)), '포: 내 기물도 다리가 됨');
  b = B([[CN, CHO, 5, 5], [P, CHO, 5, 3], [R, HAN, 5, 2]]);
  ok(same(dests(b, sq(5, 5)), set([5, 2])), '포: 다리 너머 첫 상대 기물을 잡고 멈춤');
  b = B([[CN, CHO, 5, 5], [P, CHO, 5, 3], [R, CHO, 5, 1]]);
  ok(same(dests(b, sq(5, 5)), set([5, 2])), '포: 내 기물 앞에서 멈춤');
  ok(dests(B([[CN, CHO, 5, 5], [CN, HAN, 5, 3]]), sq(5, 5)).length === 0 && dests(B([[CN, CHO, 5, 5], [CN, CHO, 5, 3]]), sq(5, 5)).length === 0, '포: 포는 다리가 못 됨 (누구 포든)');
  ok(dests(B([[CN, CHO, 5, 5], [P, CHO, 5, 3], [CN, HAN, 5, 2]]), sq(5, 5)).length === 0, '포: 포는 포를 못 잡음');
  ok(same(dests(B([[CN, CHO, 4, 8], [A, HAN, 5, 9]]), sq(4, 8)), set([6, 10])), '포: 궁성 모서리→모서리 (가운데를 넘어)');
  ok(dests(B([[CN, CHO, 4, 8]]), sq(4, 8)).length === 0, '포: 궁성 가운데가 비면 대각선 없음');
  ok(!dests(B([[CN, CHO, 5, 9], [P, HAN, 4, 8]]), sq(5, 9)).length, '포: 궁성 가운데에서 모서리 한 칸은 넘을 곳 없음');
  b = B([[CN, CHO, 5, 5], [P, CHO, 5, 3], [K, HAN, 5, 2]]);
  ok(L.attacked(b, sq(5, 2), CHO), '포: 다리가 있으면 장군');
  ok(!L.attacked(B([[CN, CHO, 5, 5], [K, HAN, 5, 2]]), sq(5, 2), CHO), '포: 다리가 없으면 장군 아님');
}
{
  ok(same(dests(B([[P, CHO, 5, 5]]), sq(5, 5)), set([5, 4], [4, 5], [6, 5])), '졸: 앞 · 옆 (뒤로 X)');
  ok(dests(B([[P, HAN, 5, 5]]), sq(5, 5)).includes(sq(5, 6)), '병은 아래로 나아감');
  ok(same(dests(B([[P, CHO, 1, 1]]), sq(1, 1)), set([2, 1])), '졸: 판 끝에서는 옆으로만');
  ok(same(dests(B([[P, CHO, 4, 3]]), sq(4, 3)), set([4, 2], [3, 3], [5, 3], [5, 2])), '졸: 적 궁성 모서리에서 가운데로 대각선');
  ok(same(dests(B([[P, CHO, 5, 2]]), sq(5, 2)), set([5, 1], [4, 2], [6, 2], [4, 1], [6, 1])), '졸: 적 궁성 가운데에서 앞 대각선 둘');
  ok(same(dests(B([[P, CHO, 4, 1]]), sq(4, 1)), set([3, 1], [5, 1])), '졸: 적 궁성 끝 모서리에선 대각선 없음');
  ok(same(dests(B([[P, CHO, 5, 9]]), sq(5, 9)), set([5, 8], [4, 9], [6, 9])), '졸: 내 궁성 대각선은 못 씀');
  ok(same(dests(B([[P, HAN, 4, 8]]), sq(4, 8)), set([4, 9], [3, 8], [5, 8], [5, 9])), '병: 초 궁성 모서리에서 앞 대각선');
}
{
  ok(dests(B([[H, CHO, 5, 5]]), sq(5, 5)).length === 8, '마: 빈 판 8곳');
  ok(dests(B([[H, CHO, 5, 5], [P, HAN, 5, 4]]), sq(5, 5)).length === 6, '마: 멱(첫 칸)이 막히면 그쪽 2곳 X');
  ok(dests(B([[E, CHO, 5, 5]]), sq(5, 5)).length === 8, '상: 빈 판 8곳');
  ok(!dests(B([[E, CHO, 5, 5], [P, CHO, 6, 3]]), sq(5, 5)).includes(sq(7, 2)), '상: 둘째 칸(대각선 첫 점)이 막혀도 X');
  ok(dests(B([[E, CHO, 5, 5], [P, CHO, 6, 3]]), sq(5, 5)).length === 7, '상: 막힌 길만 빠짐');
  ok(dests(B([[E, CHO, 5, 5], [P, CHO, 5, 4]]), sq(5, 5)).length === 6, '상: 멱(첫 칸)이 막히면 그쪽 2곳 X');
  ok(dests(B([[E, CHO, 2, 10]]), sq(2, 10)).length === 2, '상: 판 밖으로는 못 감');
}
{
  ok(same(dests(B([[R, CHO, 4, 8]]), sq(4, 8)).filter(x => L.PAL[x] === CHO && x !== sq(4, 9) && x !== sq(4, 10) && x !== sq(5, 8) && x !== sq(6, 8)), set([5, 9], [6, 10])), '차: 궁성 모서리→가운데→모서리');
  ok(!dests(B([[R, CHO, 4, 8], [P, HAN, 5, 9]]), sq(4, 8)).includes(sq(6, 10)), '차: 궁성 가운데가 막히면 반대 모서리 X');
  ok(dests(B([[R, CHO, 4, 3]]), sq(4, 3)).includes(sq(6, 1)), '차: 적 궁성 대각선도 씀');
  ok(!dests(B([[R, CHO, 5, 3]]), sq(5, 3)).some(x => x === sq(4, 2) || x === sq(6, 2)), '차: 궁성 변 가운데는 대각선 없음');
  ok(dests(B([[K, CHO, 5, 9]]), sq(5, 9)).length === 8, '궁: 궁성 가운데 8곳');
  ok(same(dests(B([[K, CHO, 5, 8]]), sq(5, 8)), set([4, 8], [6, 8], [5, 9])), '궁: 궁성 밖으로 못 나감 (변 가운데는 대각선 없음)');
  ok(same(dests(B([[A, CHO, 4, 10]]), sq(4, 10)), set([4, 9], [5, 10], [5, 9])), '사: 모서리 3곳 (궁과 같은 걸음)');
  ok(same(dests(B([[A, HAN, 6, 3]]), sq(6, 3)), set([6, 2], [5, 3], [5, 2])), '사(한): 제 궁성 안에서만');
}

// ════════ 3) 수 생성 맞춰 보기: 곧이곧대로 쓴 두 번째 생성기 ════════
section('수 생성 맞춰 보기 (다른 생성기 · perft)');
// 좌표 {f:1..9, r:1..10}, 판 = Map('f,r' → { side, type }). 규칙 문장을 그대로 옮긴 것 — 느리지만 엔진과 코드를 하나도 같이 쓰지 않음
const REF = (() => {
  const key = (f, r) => f + ',' + r;
  const onBoard = (f, r) => f >= 1 && f <= 9 && r >= 1 && r <= 10;
  const palaceOf = (f, r) => (f >= 4 && f <= 6 ? (r <= 3 ? 'han' : r >= 8 ? 'cho' : null) : null);
  const centreOf = side => (side === 'han' ? [5, 2] : [5, 9]);
  function diag(f, r) {                       // 그어진 대각선만
    const pal = palaceOf(f, r); if (!pal) return [];
    const [cf, cr] = centreOf(pal), df = f - cf, dr = r - cr;
    if (!df && !dr) return [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    if (!df || !dr) return [];
    return [[-df, -dr]];
  }
  const ORT = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  function lines(f, r) {
    const out = [];
    for (const [a, b] of ORT) { const l = []; for (let x = f + a, y = r + b; onBoard(x, y); x += a, y += b) l.push([x, y]); out.push(l); }
    for (const [a, b] of diag(f, r)) { const l = []; for (let x = f + a, y = r + b; onBoard(x, y) && palaceOf(x, y); x += a, y += b) l.push([x, y]); out.push(l); }
    return out;
  }
  function moves(bd, f, r) {
    const pc = bd.get(key(f, r)); if (!pc) return [];
    const land = (x, y) => { const o = bd.get(key(x, y)); return !o || o.side !== pc.side; };
    const out = [];
    switch (pc.type) {
      case 'general': case 'guard':
        for (const [a, b] of ORT.concat(diag(f, r))) { const x = f + a, y = r + b; if (onBoard(x, y) && palaceOf(x, y) === pc.side && land(x, y)) out.push([x, y]); }
        break;
      case 'horse': case 'elephant': {
        const turns = pc.type === 'horse' ? 1 : 2;
        for (const [a, b] of ORT) {
          const ex = f + a, ey = r + b; if (!onBoard(ex, ey) || bd.get(key(ex, ey))) continue;
          const dgs = a === 0 ? [[-1, b], [1, b]] : [[a, -1], [a, 1]];
          for (const [da, db] of dgs) {
            let x = ex, y = ey, okk = true;
            for (let k = 0; k < turns; k++) { x += da; y += db; if (!onBoard(x, y)) { okk = false; break; } if (k < turns - 1 && bd.get(key(x, y))) { okk = false; break; } }
            if (okk && land(x, y)) out.push([x, y]);
          }
        }
        break;
      }
      case 'chariot':
        for (const l of lines(f, r)) for (const [x, y] of l) { const o = bd.get(key(x, y)); if (!o) { out.push([x, y]); continue; } if (o.side !== pc.side) out.push([x, y]); break; }
        break;
      case 'cannon':
        for (const l of lines(f, r)) {
          let i = l.findIndex(([x, y]) => bd.get(key(x, y)));
          if (i < 0 || bd.get(key(...l[i])).type === 'cannon') continue;
          for (const [x, y] of l.slice(i + 1)) { const o = bd.get(key(x, y)); if (!o) { out.push([x, y]); continue; } if (o.side !== pc.side && o.type !== 'cannon') out.push([x, y]); break; }
        }
        break;
      case 'soldier': {
        const fw = pc.side === 'cho' ? -1 : 1;
        const st = [[0, fw], [-1, 0], [1, 0]];
        if (palaceOf(f, r) === (pc.side === 'cho' ? 'han' : 'cho')) for (const d of diag(f, r)) if (d[1] === fw) st.push(d);
        for (const [a, b] of st) { const x = f + a, y = r + b; if (onBoard(x, y) && land(x, y)) out.push([x, y]); }
        break;
      }
    }
    return out;
  }
  const TYPES = ['', 'general', 'guard', 'elephant', 'horse', 'chariot', 'cannon', 'soldier'];
  function fromArr(b) { const bd = new Map(); for (let q = 0; q < 90; q++) if (b[q]) bd.set(key(q % 9 + 1, ((q / 9) | 0) + 1), { side: (b[q] >> 3) ? 'han' : 'cho', type: TYPES[b[q] & 7] }); return bd; }
  function inCheck(bd, side) {
    let g = null; for (const [k, p] of bd) if (p.side === side && p.type === 'general') g = k;
    if (!g) return false;
    for (const [k, p] of bd) if (p.side !== side) { const [f, r] = k.split(',').map(Number); if (moves(bd, f, r).some(([x, y]) => key(x, y) === g)) return true; }
    return false;
  }
  function legal(bd, side) {
    const out = [];
    for (const [k, p] of [...bd]) {
      if (p.side !== side) continue;
      const [f, r] = k.split(',').map(Number);
      for (const [x, y] of moves(bd, f, r)) {
        const nb = new Map(bd); nb.delete(k); nb.set(key(x, y), p);
        if (!inCheck(nb, side)) out.push([f, r, x, y, nb]);
      }
    }
    return out;
  }
  const toInt = ([f, r, x, y]) => (((r - 1) * 9 + f - 1) << 7) | ((y - 1) * 9 + x - 1);
  function perft(bd, side, d) { if (!d) return 1; let n = 0; for (const mv of legal(bd, side)) n += d === 1 ? 1 : perft(mv[4], side === 'cho' ? 'han' : 'cho', d - 1); return n; }
  return { fromArr, legal, toInt, perft, inCheck };
})();
const PERFT = {};
for (const [a, h] of [[2, 2], [3, 3], [0, 1], [1, 0]]) {
  const g = { moves: ['h=' + h, 'c=' + a] }, s = C.fromJSON(g), bd = REF.fromArr(s.b);
  const got = [1, 2, 3].map(d => AI.perft(g, d)), ref = [1, 2, 3].map(d => REF.perft(bd, 'cho', d));
  PERFT[`${C.SETUPS[a].name}/${C.SETUPS[h].name}`] = got;
  ok(same(got, ref), `perft 1~3 엔진 = 다른 생성기 (초 ${C.SETUPS[a].name} · 한 ${C.SETUPS[h].name})`, `${got} vs ${ref}`);
}
{
  // core.genLegal 로 세는 perft 와 엔진(증분 판) perft 비교, 깊이 4
  const g = { moves: ['h=2', 'c=2'] }, s = C.fromJSON(g);
  const cp = (b, side, d) => { if (!d) return 1; let n = 0; for (const m of L.genLegal(b, side)) { const f = m >> 7, t = m & 127, cap = b[t]; b[t] = b[f]; b[f] = 0; n += cp(b, side ^ 1, d - 1); b[f] = b[t]; b[t] = cap; } return n; };
  const e4 = AI.perft(g, 4), c4 = cp(s.b.slice(), CHO, 4);
  PERFT['마상상마/마상상마 d4'] = e4;
  ok(e4 === c4, 'perft 4: 엔진 증분 판 = core 생성기', `${e4} vs ${c4}`);
  console.log('  perft (깊이 1·2·3):', JSON.stringify(PERFT));
}
{
  // 아무렇게나 둔 판 여러 국면에서 합법 수 집합 비교 (잡기 · 장군 · 핀 · 궁성 싸움이 많이 나오게 끝까지)
  const R = rng(4242); let pos = 0, diff = 0, games = 0, chk = 0, first = '';
  const target = QUICK ? 800 : 3000;
  while (pos < target && games < 400) {
    const s = C.create({ setup: [Math.floor(R() * 4), Math.floor(R() * 4)], rules: { bik: 'off' } }); games++;
    while (!s.over && pos < target) {
      const mine = C.legal(s).filter(x => !x.pass).map(x => C.parseMove(x.uci)).sort((a, b) => a - b);
      const bd = REF.fromArr(s.b), side = s.turn ? 'han' : 'cho';
      const ref = REF.legal(bd, side).map(REF.toInt).sort((a, b) => a - b);
      pos++; if (s.check) chk++;
      if (!same(mine, ref)) { diff++; if (!first) first = C.toFen(s.b, s.turn) + ` · ${mine.length} vs ${ref.length}`; }
      if (s.check !== REF.inCheck(bd, side)) { diff++; if (!first) first = '장군 판단 다름 ' + C.toFen(s.b, s.turn); }
      const L1 = C.legal(s), caps = L1.filter(x => x.captured);
      const pick = caps.length && R() < 0.5 ? caps[Math.floor(R() * caps.length)] : L1[Math.floor(R() * L1.length)];
      C.step(s, pick.uci);
    }
  }
  ok(diff === 0, `합법 수 집합 = 다른 생성기 (${pos}국면 · ${games}판 · 장군 ${chk}국면)`, first);
  console.log(`  합법 수 집합 비교: ${pos}국면 (${games}판, 장군 받는 국면 ${chk}) · 다름 ${diff}`);
}

// ════════ 4) 장군 · 끝 ════════
section('장군 · 외통 · 빅장 · 한수 쉼 · 반복 · 점수');
const F = (fen, rules) => C.create({ fen, rules });
{
  const s = F('3k5/9/9/9/9/9/9/9/4K4/R8 c');
  ok(!s.check && C.legal(s).some(x => x.pass), '시작: 장군 아님 · 한수 쉼 가능');
  ok(C.step(s, '0104')[0].type === 'move' && s.check, '차가 줄을 따라 장군');
  ok(C.legal(s).every(x => !x.pass), '장군 받는 중에는 한수 쉼 X');
  ok(C.legal(s).length > 0 && !s.over, '피할 곳이 있으면 외통 아님');
}
{
  // 외통: 한 궁 (4,1) 모서리 · 초 차 (9,2) 가 2줄을 막음 · 다른 차가 1줄로 장군
  const m = F('3k5/8R/9/9/9/9/9/9/4K4/R8 c');
  ok(!m.check, '외통 시험 판: 시작은 장군 아님');
  const e2 = C.step(m, '0111');
  ok(e2[0].type === 'move' && e2.some(e => e.type === 'check'), '1줄 차 장군');
  ok(m.over && m.winner === CHO && m.reason === 'mate', '외통 (피할 곳 · 막을 것 없음)', JSON.stringify(C.status(m)));
}
{
  const s = F('4k4/4h4/9/9/9/9/9/9/3K5/4R4 h');
  ok(!C.legal(s, C.parseSq('25')).length, '핀 걸린 마는 못 움직임 (비키면 차 장군)');
  ok(!s.check, '핀만으로는 장군 아님');
}
{
  const s = F('3k5/9/9/9/9/9/9/9/4K4/3R4r h');
  ok(s.check, '장군 판');
  let all = true;
  for (const x of C.legal(s)) { const t = C.fastClone(s); C.step(t, x.uci); if (L.inCheck(t.b, HAN)) all = false; }
  ok(all && C.legal(s).length === 3, '장군 받을 때는 벗어나는 수만 (궁 2 · 차가 잡기 1)', C.legal(s).map(x => x.uci).join(' '));
}
{
  // 빅장: 초가 궁을 마주 보게 만들면, 한이 풀지 않으면 끝
  const mkS = bik => F('4k4/9/9/9/9/9/9/9/3K5/1R7 c', { bik });
  let s = mkS('points');
  let ev = C.step(s, '9495');
  ok(ev.some(e => e.type === 'bikjang') && s.bik, '빅장을 부름 (궁이 마주 봄)');
  ok(C.legal(s).some(x => x.uci === '1514'), '빅장 받은 쪽: 궁을 옮겨 풀 수 있음');
  C.step(s, 'pass');
  ok(s.over && s.reason === 'bikjang' && s.winner === CHO, '빅장 안 풀면 점수로 (초 13 : 한 1.5)', JSON.stringify(C.status(s)));
  s = mkS('points'); C.step(s, '9495'); C.step(s, '1514');
  ok(!s.over && !s.bik, '궁을 옮겨 빅장을 풀면 계속');
  s = mkS('draw'); C.step(s, '9495'); C.step(s, 'pass');
  ok(s.over && s.winner === null && s.reason === 'bikjang', '빅장 무승부 규칙');
  s = mkS('off'); C.step(s, '9495');
  ok(!s.bik && !s.over, '빅장 없음 규칙: 마주 봐도 아무 일 없음');
  C.step(s, 'pass'); ok(!s.over, '빅장 없음: 쉬어도 계속');
}
{
  const s = F('3k5/9/9/9/9/9/9/9/4K4/R8 c', { bik: 'off' });
  C.step(s, 'pass'); ok(!s.over && s.passes === 1, '한수 쉼 1번은 계속');
  C.step(s, 'pass'); ok(s.over && s.reason === 'pass2' && s.winner === CHO, '서로 쉬면 점수로 끝 (초 차 13 > 한 1.5)', JSON.stringify(C.status(s)));
  const t = F('3k5/9/9/9/9/9/9/9/4K4/R8 c', { bik: 'off', pass: false });
  ok(!C.legal(t).some(x => x.pass), "한수 쉼 '둘 곳 없을 때만': 둘 곳 있으면 X");
  ok(C.step(t, 'pass')[0].type === 'illegal', '…그래서 쉬는 수는 반칙');
  const u = F('4k4/9/9/9/4r4/9/9/9/8r/3K5 c', { pass: false, bik: 'off' });
  ok(!u.check && C.legal(u).length === 1 && C.legal(u)[0].pass, '둘 곳 없고 장군도 아니면 쉬어야 함 (스테일메이트 없음)', C.legal(u).map(x => x.uci).join());
  ok(C.step(u, 'pass')[0].type === 'move' && !u.over, '쉬고 계속');
  const h = F('4k4/9/9/9/9/9/9/9/4K4/R8 c', { bik: 'off' });
  C.step(h, 'pass'); C.step(h, 'pass');
  const sc = C.score(h);
  ok(h.winner === CHO && sc.cho === 13 && sc.han === 1.5, '점수: 초 차 13 · 한 덤 1.5');
  const h2 = F('4k4/3a1a3/9/9/9/9/9/9/4K4/8P c', { bik: 'off' });
  C.step(h2, 'pass'); C.step(h2, 'pass');
  ok(h2.winner === HAN && C.score(h2).han === 7.5, '점수: 한 사 둘 6 + 덤 1.5 > 초 졸 2');
}
{
  // 같은 국면 세 번 → 점수
  const s = F('3k5/9/9/9/9/9/9/9/4K4/R8 c', { bik: 'off' });
  const seq = ['0191', '1424', '9101', '2414', '0191', '1424', '9101', '2414'];
  let i = 0; for (; i < seq.length && !s.over; i++) C.step(s, seq[i]);
  ok(s.over && s.reason === 'repeat' && s.winner === CHO, `같은 국면 세 번 → 점수 (${i}수째)`, JSON.stringify(C.status(s)));
}
{
  const s = C.create({ setup: [2, 2], rules: { limit: 150 } }), R = rng(7);
  while (!s.over) { const L1 = C.legal(s).filter(x => !x.pass && !x.captured); const pick = (L1.length ? L1 : C.legal(s))[Math.floor(R() * (L1.length || C.legal(s).length))]; C.step(s, pick.uci); }
  ok(s.reason === 'limit' ? s.plies === 150 : ['repeat', 'mate', 'bikjang'].includes(s.reason), `수 제한 150 (끝: ${s.reason} · ${s.plies}수)`);
}
{
  const s = C.create({ setup: [2, 2] });
  C.resign(s, CHO); ok(s.over && s.winner === HAN && s.reason === 'resign', '기권');
  const t = C.create({ setup: [2, 2] }); C.step(t, '7978'); C.step(t, '4142'); C.step(t, '7172');
  C.undo(t, 2); ok(t.moves.join() === 'h=2,c=2,7978' && t.turn === HAN, '무르기 2수', t.moves.join());
  const j = C.toJSON(t), u = C.fromJSON(JSON.parse(JSON.stringify(j)));
  ok(C.toFen(u.b, u.turn) === C.toFen(t.b, t.turn), '기보 JSON 다시 만들기');
  ok(C.notation(t.hist[2]) === '79졸78' && C.describe(t.hist[2]) === '초 졸 79→78', '기보 글자 79졸78', C.notation(t.hist[2]));
  ok(C.sqName(C.parseSq('01')) === '01' && C.parseSq('01') === 81, '10째 줄은 0 으로');
  ok(/1\. 초 79졸78/.test(C.kiboText(t, ['가', '나'])), '기보 글');
}

// ════════ 5) 끝까지 둔 판: 반칙 상태 없음 ════════
section('아무렇게나 끝까지 둔 판');
{
  const R = rng(99); let games = 0, bad = '', ends = {}, plies = 0;
  const N = QUICK ? 60 : 250;
  const variants = [{}, { bik: 'draw' }, { bik: 'off' }, { pass: false }, { limit: 150 }];
  for (let g = 0; g < N; g++) {
    const s = C.create({ rules: variants[g % variants.length] });
    while (!s.over) {
      const L1 = C.legal(s);
      if (!L1.length) { bad = bad || '끝나지 않았는데 둘 수가 없음 ' + C.toFen(s.b, s.turn); break; }
      const caps = L1.filter(x => x.captured), noPass = L1.filter(x => !x.pass);
      const pool = caps.length && R() < 0.4 ? caps : noPass.length && R() < 0.97 ? noPass : L1;
      const pick = pool[Math.floor(R() * pool.length)];
      const mover = s.turn, before = s.b.slice();
      const ev = C.step(s, pick.uci);
      if (ev[0].type === 'illegal') { bad = bad || '합법이라던 수가 반칙 ' + pick.uci; break; }
      if (s.phase !== 'play') continue;
      if (L.kingSq(s.b, CHO) < 0 || L.kingSq(s.b, HAN) < 0) { bad = bad || '궁이 잡힘'; break; }
      if (L.inCheck(s.b, mover)) { bad = bad || '둔 쪽 궁이 장군에 남음 ' + pick.uci; break; }
      for (let q = 0; q < 90; q++) { const p = s.b[q]; if (!p) continue; const t = p & 7, sd = p >> 3; if ((t === K || t === A) && L.PAL[q] !== sd) { bad = bad || '궁/사가 궁성 밖'; } }
      if (pick.from != null && (before[pick.from] & 7) === P) { const fr = (pick.from / 9) | 0, tr = (pick.to / 9) | 0; if ((mover === CHO && tr > fr) || (mover === HAN && tr < fr)) bad = bad || '졸이 뒤로 감'; }
      let cnt = 0; for (let q = 0; q < 90; q++) if (s.b[q]) cnt++;
      if (cnt > 32) bad = bad || '기물이 늘어남';
    }
    games++; plies += s.plies; ends[s.reason] = (ends[s.reason] || 0) + 1;
    const re = C.fromJSON(JSON.parse(JSON.stringify(C.toJSON(s))));
    if (C.toFen(re.b, re.turn) !== C.toFen(s.b, s.turn) || re.over !== s.over || re.winner !== s.winner) bad = bad || '기보로 다시 만든 판이 다름';
  }
  ok(!bad, `${games}판 반칙 상태 없음 (평균 ${Math.round(plies / games)}수 · 끝: ${JSON.stringify(ends)})`, bad);
  console.log(`  ${games}판 끝까지 · 평균 ${Math.round(plies / games)}수 · 끝난 까닭 ${JSON.stringify(ends)} · 반칙 ${bad ? 1 : 0}`);
}

// ════════ 6) AI ════════
section('AI · 선생님');
{
  const g = { fen: '3k5/8R/9/9/9/9/9/9/4K4/R8 c' };
  for (const tier of ['normal', 'hard']) {
    const r = AI.think(g, { tier, seed: 3 }), t = C.fromJSON(g); C.step(t, r.move);
    ok(r.mate === 1 && t.over && t.reason === 'mate', `${tier}: 한 수 외통 찾기`, `${r.move} mate ${r.mate}`);
  }
  const g2 = { fen: '4k4/9/9/9/2r6/9/9/9/4K4/2R6 c' };
  for (const tier of ['normal', 'hard']) { const r2 = AI.think(g2, { tier, seed: 1, explain: true }); ok(r2.move === '0353', `${tier}: 공짜 차 잡기`, `${r2.move} ${(r2.why || {}).text}`); }
  const g4 = { fen: '3kr4/9/9/9/4H4/9/9/9/5K3/9 c' };
  const r4 = AI.think(g4, { tier: 'hard', seed: 2, nodes: 30000, timeMs: 1e9, explain: true });
  ok(C.parseMove(r4.move) >> 7 === C.parseSq('55'), '고급: 잡힐 마를 피함', `${r4.move} ${(r4.why || {}).text}`);
  ok(r4.why && /피해요/.test(r4.why.text), "선생님 까닭: '마가 잡힐 뻔해서 피해요'", r4.why && r4.why.text);
  const g5 = { moves: ['h=2', 'c=3', '7978', '4142'] };
  const a = AI.think(g5, { tier: 'hard', seed: 5, nodes: 40000, timeMs: 1e9 }), b = AI.think(g5, { tier: 'hard', seed: 5, nodes: 40000, timeMs: 1e9 });
  ok(a.move === b.move && a.score === b.score && a.nodes === b.nodes, '같은 입력 · 노드 예산 = 같은 수 (결정적)', `${a.move}/${b.move}`);
  const e1 = AI.think(g5, { tier: 'easy', seed: 9 }), e2 = AI.think(g5, { tier: 'easy', seed: 9 });
  ok(e1.move === e2.move, '초급도 씨앗이 같으면 같은 수');
  const r6 = AI.think({ moves: [] }, { tier: 'hard', seed: 1, explain: true });
  ok(/^h=[0-3]$/.test(r6.move) && r6.why && /마|상/.test(r6.why.text), 'AI 상차림 고르기 + 까닭', `${r6.move} ${(r6.why || {}).text}`);
  const why = (g, u) => AI.explain(g, u, {}).text;
  const wf = why({ fen: '4k4/9/9/9/4r4/9/9/9/3K5/4R4 c' }, '0555');
  ok(wf === '차가 공짜로 잡혀요', "까닭: '차가 공짜로 잡혀요'", wf);
  const wc = why({ fen: '3k5/9/9/9/9/9/9/9/4K4/R8 c' }, '0104');
  ok(/^장군!/.test(wc), '까닭: 장군', wc);
  const we = why({ fen: '3k5/9/9/9/9/9/9/9/4K4/3R4r h' }, '1415');
  ok(/^장군 피하기/.test(we), '까닭: 장군 피하기', we);
  const wb = why({ fen: '3k5/9/9/9/9/9/9/9/4K4/3R4r h' }, '0904');
  ok(/장군을 건 차를 잡아요/.test(wb), '까닭: 장군 건 기물 잡기', wb);
  // 빅장 이해: 점수에서 앞선 쪽은 빅장을 부르고, 뒤진 쪽은 피함
  const gb = { fen: '4k4/9/9/9/9/9/9/9/3K5/1R7 c', rules: { bik: 'points' } };
  const rb = AI.think(gb, { tier: 'hard', seed: 1, nodes: 20000, timeMs: 1e9 });
  const tb = C.fromJSON(gb); C.step(tb, rb.move);
  ok(rb.score >= AI.PW - 100 || tb.bik, '고급: 점수에서 앞서면 빅장을 불러 이김 (또는 더 좋은 수)', `${rb.move} ${rb.score}`);
  const gh = { fen: '4k4/9/9/9/9/9/9/9/3K5/1R7 c', moves: ['9495'], rules: { bik: 'points' } };
  const rh = AI.think(gh, { tier: 'normal', seed: 1 });
  const th = C.fromJSON(gh); C.step(th, rh.move);
  ok(!th.over && !th.bik, '중급: 점수에서 뒤지면 빅장을 풀음', `${rh.move}`);
}

// ════════ 8) 학습 입력 ════════
section('학습 입력 (RL.md)');
{
  const R = rng(5); const s = C.create({ setup: [1, 2] }); let okIdx = true, okMask = true, n = 0;
  for (let i = 0; i < 120 && !s.over; i++) {
    const L1 = C.legal(s), seen = new Set();
    for (const x of L1) { const k = C.moveIndex(x.uci, s.turn); if (k < 0 || k >= C.N_ACTIONS || seen.has(k)) okIdx = false; seen.add(k); }
    const mk2 = C.legalMask(s); let c = 0; for (const v of mk2) c += v; if (c !== L1.length) okMask = false;
    const o = C.obs(s); if (o.length !== C.OBS_LEN) okIdx = false;
    C.step(s, L1[Math.floor(R() * L1.length)].uci); n++;
  }
  ok(okIdx, `행동 번호 0..${C.N_ACTIONS - 1} 겹침 없음 · 관찰 ${C.OBS_LEN} (${n}국면)`);
  ok(okMask, '합법 수 가림 개수 = 합법 수 개수');
  const t = C.create({ setup: [2, 2] }), o = C.obs(t);
  let mine = 0; for (let k = 0; k < 7 * 90; k++) mine += o[k];
  ok(mine === 16, '관찰: 내 기물 16개', String(mine));
  ok(C.moveIndex('7978', CHO) !== C.moveIndex('7978', HAN), '한 차례는 판을 돌려 셈');
}

// ════════ 7) AI 끼리 ════════
(async () => {
  section(`AI 끼리 (일꾼 스레드, 짝마다 ${GAMES}판 · 상차림은 판마다 아무렇게나)`);
  const os = require('os'), POOL = Math.max(2, Math.min(os.cpus().length - 1, 10));
  const jobs = [];
  for (const [ta, tb] of [['hard', 'normal'], ['normal', 'easy'], ['hard', 'easy']]) for (let g = 0; g < GAMES; g++) jobs.push({ ta, tb, aCho: g % 2 === 0, seed: 1000 + g * 31 + ta.length * 7 + tb.length });
  const results = [];
  let next = 0;
  await new Promise(done => {
    let live = 0;
    const launch = () => {
      if (next >= jobs.length) { if (!live) done(); return; }
      const j = jobs[next++]; live++;
      const w = new WT.Worker(__filename, { workerData: j });
      w.on('message', r => results.push(Object.assign({}, j, r)));
      w.on('error', e => { results.push(Object.assign({}, j, { illegal: 1, err: String(e) })); });
      w.on('exit', () => { live--; launch(); });
    };
    for (let i = 0; i < POOL; i++) launch();
  });
  const tally = {};
  for (const r of results) {
    const k = `${r.ta}>${r.tb}`, t = tally[k] = tally[k] || { a: 0, b: 0, d: 0, plies: 0, n: 0, illegal: 0, maxMs: 0, reasons: {} };
    const aWin = r.winner == null ? null : (r.winner === C.CHO) === r.aCho;
    if (aWin === true) t.a++; else if (aWin === false) t.b++; else t.d++;
    t.plies += r.plies; t.n++; t.illegal += r.illegal; t.maxMs = Math.max(t.maxMs, r.maxMs || 0); t.reasons[r.reason] = (t.reasons[r.reason] || 0) + 1;
  }
  const TN = { hard: '🐯 고급', normal: '🐱 중급', easy: '🐣 초급' };
  for (const k in tally) {
    const t = tally[k], [a, b] = k.split('>');
    console.log(`  ${TN[a]} vs ${TN[b]}: ${t.a}승 ${t.b}패 ${t.d}무 · 평균 ${Math.round(t.plies / t.n)}수 · 끝 ${JSON.stringify(t.reasons)} · 한 수 최대 ${t.maxMs}ms`);
    ok(t.illegal === 0, `${TN[a]} vs ${TN[b]} 반칙 없음`);
    ok(t.a > t.b, `${TN[a]} 이 ${TN[b]} 보다 셈 (${t.a}:${t.b})`);
  }
  console.log(`\n${fail ? '✗' : '✓'} 통과 ${pass} · 실패 ${fail} · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
  if (fail) { console.log(fails.map(f => '  - ' + f).join('\n')); process.exitCode = 1; }
})();

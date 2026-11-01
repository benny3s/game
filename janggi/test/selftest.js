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
   8) 학습 입력(RL.md): 관찰 길이 · 행동 번호 겹침 없음 · 합법 수 가림
   9) AI 선생님 흐름(intent.js): 상대가 둔 수 읽기('내 차' 말투) · 다음 노림 · 추천이 노림에 맞서는 법 · 형세 말 · 복기 말투는 그대로 */
'use strict';
const path = require('path');
const C = require('../core.js');
const AI = require('../ai.js');
const I = require('../intent.js');
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

{ // 정지 탐색(qs)은 빅장 상태를 알아야 함: 빅장 중인 쪽은 가만있을 수 없음 (그대로 두면 판이 끝나는 규칙) → 가만있는 값(stand-pat)으로 치면 안 됨
  //   한 궁이 두 차(d·f줄)에 막혀 움직일 곳이 e2 뿐 — 거기로 가도 계속 마주 봐서 무승부 규칙이면 끝(0). 가만있는 값으로 치면 한이 기물 하나 없이 몰려 큰 마이너스가 됨
  const g = { fen: '4k4/9/9/9/3R1R3/9/9/9/9/4K4 h', rules: { bik: 'draw' } };
  const st = C.fromJSON(g);
  const mvs = C.legal(st).map(x => x.uci).filter(u => u !== 'pass');   // 한수 쉼은 빅장을 못 풂
  ok(mvs.length === 1 && mvs[0] === '1525', '(시험 조건) 한 궁이 갈 수 있는 곳은 한 곳뿐', mvs.join(' '));
  const pos = new AI._Pos(st); pos.bik = true;
  const S = new AI._Search(pos, {});
  const v = S.qs(-32000, 32000, 1, 0);
  ok(v === 0, `정지 탐색: 빅장 중이고 풀 수 없으면 가만있는 값이 아니라 규칙 결과(무승부 0)로 침 (값 ${v})`);
  const pos2 = new AI._Pos(st);                                  // 빅장 상태가 아니면 그대로 가만있는 값 (바뀌면 안 됨)
  ok(new AI._Search(pos2, {}).qs(-32000, 32000, 1, 0) === pos2.evaluate(), '정지 탐색: 빅장이 아닐 때는 예전처럼 가만있는 값');
}

// ════════ 9) AI 선생님 흐름: 👀 상대 수 읽기 ════════
section('AI 선생님 흐름 (상대 수 읽기 · 노림 · 추천이 맞서는 법)');
{
  const FR = fen => C.fromJSON({ fen, rules: { bik: 'off' } });
  const read = (fen, f, t, opp) => { const s0 = FR(fen), mv = C.legal(s0).find(x => x.from === f && x.to === t); if (!mv) return null; const s1 = C.fastClone(s0); C.step(s1, mv.uci); return I.why(s0, s1, s1.last, { opp }); };
  // 조사
  ok(I.eul('상') === '상을' && I.eul('차') === '차를' && I.ro('졸') === '졸로' && I.ro('궁') === '궁으로' && I.ro('차') === '차로' && I.iga('병') === '병이' && I.wa('포') === '포와', '조사: 받침 따라 (졸로 · 궁으로 · 병이 …)');
  // 상대(한)가 둔 수를 내(초) 쪽에서 읽기 vs 복기(둔 쪽에서)
  const cap = '4k4/9/9/r8/9/9/9/9/4K4/C8 h', capF = sq(1, 4), capT = sq(1, 10);
  let a = read(cap, capF, capT, true), b = read(cap, capF, capT, false);
  ok(a && a.text === '내 포를 공짜로 땄어요', '상대 수 읽기: 내 포를 공짜로 땄어요', a && a.text);
  ok(b && b.text === '포를 공짜로 땄어요', '복기 말투는 그대로 (내 없음)', b && b.text);
  const chk = '4k4/9/9/9/9/9/9/9/4K4/r8 h';
  a = read(chk, sq(1, 10), sq(5, 10), true); b = read(chk, sq(1, 10), sq(5, 10), false);
  ok(a && a.text === '차로 내 궁에 장군을 걸었어요' && b && b.text === '차로 궁을 몰아요', '장군: 상대가 걸면 "내 궁에 장군", 복기는 "궁을 몰아요"', `${a && a.text} / ${b && b.text}`);
  a = read('4k4/9/9/r8/9/9/9/9/4K4/1H7 h', sq(1, 4), sq(2, 4), true);
  ok(a && a.term === '노림' && a.text === '차로 내 마를 노려요' && a.tg.includes(C.H), '조용한 수도 새로 노리게 된 내 기물을 말함', a && a.text);
  ok(read('4k4/9/9/r8/9/9/9/9/4K4/1H7 h', sq(1, 4), sq(2, 4), false) === null, '복기는 조용한 수를 말하지 않음 (기존 그대로)');
  a = read('4k4/9/9/9/1p7/9/9/9/4K4/R8 h', sq(2, 5), sq(1, 5), true);
  ok(a && a.term === '무리수' && /잡힐 수 있는 자리/.test(a.text), '잡힐 자리에 놓은 수를 알려 줌', a && a.text);
  a = read('4k4/9/9/9/4p4/9/9/9/4K4/9 h', sq(5, 5), sq(4, 5), true);
  ok(a && /병을 옆으로 옮겼어요/.test(a.text), '조용한 병 수: 옆으로 옮겼어요', a && a.text);
  // 다음 노림
  const th0 = { move: 'x', from: 19, to: 64, piece: C.R, captured: C.C, check: false, score: 700, mate: 0 };
  let n = I.aim(1, th0, { score: 0, mate: 0 }, { opp: true });
  ok(n && n.term === '기물 따기' && n.text === '다음에 차로 내 포를 따려고 해요' && n.arrow.join() === '19,64' && /내 포 따기/.test(n.lab), '노림: 다음에 차로 내 포를 따려고 해요 (+ 화살표)', n && n.text);
  n = I.aim(1, th0, { score: 0, mate: 0 });
  ok(n && n.text === '다음에 차로 포를 따려고 해요', '노림 복기 말투 (내 없음)', n && n.text);
  ok(I.aim(1, Object.assign({}, th0, { score: 100 }), { score: 0, mate: 0 }, { opp: true }) === null, '1.5점 안 되게 좋아지는 노림은 말하지 않음');
  n = I.aim(1, null, { score: 0, mate: -2 }, { opp: true });
  ok(n && n.term === '외통 위협' && /2수 안에 외통을 당해요/.test(n.text), '내가 어떻게 받아도 외통이면 알림', n && n.text);
  n = I.aim(1, Object.assign({}, th0, { captured: 0, mate: 3 }), { score: 0, mate: 0 }, { opp: true });
  ok(n && /막지 않으면 3수 안에 외통/.test(n.text), '막지 않으면 외통 위협', n && n.text);
  n = I.aim(1, { move: 'x', from: 19, to: 20, piece: C.H, captured: 0, check: false, score: 900, mate: 0 }, { score: 0, mate: 0 }, { opp: true, via: { term: '노림', text: '마로 내 상을 노려요', next: '마로 내 상을 노려요' } });
  ok(n && n.text === '다음에 마로 내 상을 노려요', '조용한 큰 수는 그 수가 하는 일로 설명', n && n.text);
  // 추천이 노림에 맞서는 법 (내 포 · 한 차가 포를 노림)
  const T = (fenH, f, t, piece, capd) => ({ move: C.legal(FR(fenH)).find(x => x.from === f && x.to === t).uci, from: f, to: t, piece, captured: capd, check: false, score: 700, mate: 0, side: 1 });
  const ctr = (fen, th, from, to, kind) => { const s = FR(fen + ' c'), u = C.legal(s).find(x => x.from === from && x.to === to); if (!u) return { kind: 'NOMOVE' }; return I.counter(s, { move: u.uci, why: { kind } }, th, I.aim(1, th, { score: 0, mate: 0 }, { opp: true })); };
  let f1 = '4k4/9/1r7/9/9/3R5/9/1H7/4K4/9', t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.H), c1 = ctr(f1, t1, sq(2, 8), sq(3, 6), 'develop');
  ok(c1 && c1.kind === 'escape' && c1.text === '상대 노림(차로 내 마 따기)을 피하는 수예요', '추천: 노려진 기물을 옮김 → 피하는 수', c1 && c1.text);
  f1 = '4k4/9/1r7/9/9/3R5/9/1C7/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(4, 6), sq(2, 6), 'develop');
  ok(c1 && c1.kind === 'block' && c1.text === '상대 노림(차로 내 포 따기)을 막는 수예요', '추천: 길을 막음 → 막는 수예요', c1 && c1.text);
  c1 = ctr(f1, t1, sq(4, 6), sq(5, 6), 'check');
  ok(c1 && c1.kind === 'check' && /장군으로 상대 노림/.test(c1.text), '추천: 장군으로 먼저 막음', c1 && c1.text);
  f1 = '4k4/9/1r4R2/9/9/9/9/1C7/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(7, 3), sq(2, 3), 'free');
  ok(c1 && c1.kind === 'take' && /노리던 상대 차를 잡아/.test(c1.text), '추천: 노리던 기물을 잡음', c1 && c1.text);
  f1 = '4k4/9/1r7/9/9/3R4c/9/1C7/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(4, 6), sq(9, 6), 'free');
  ok(c1 && c1.kind === 'bigger' && /더 커요/.test(c1.text), '추천: 더 큰 수(공짜 잡기)면 노림보다 크다고 말함', c1 && c1.text);
  f1 = '4k4/9/1r7/9/9/5R3/9/1C7/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(6, 6), sq(6, 8), 'develop');
  ok(c1 && c1.kind === 'defend' && /지켜 주는 수/.test(c1.text), '추천: 차로 받침 → 지켜 주는 수', c1 && c1.text);
  f1 = '4k4/9/1r7/9/9/9/9/1C3R3/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(5, 9), sq(4, 9), 'develop');
  ok(c1 && c1.kind === 'recap', '추천: 원래 받쳐져 있으면 잡혀도 되잡을 수 있다고 말함', c1 && c1.kind);
  f1 = '4k4/9/1r7/9/9/9/9/1C7/4K4/9'; t1 = T(f1 + ' h', sq(2, 3), sq(2, 8), C.R, C.C); c1 = ctr(f1, t1, sq(5, 9), sq(4, 9), 'plain');
  ok(c1 && c1.kind === 'other' && /받지 않아도/.test(c1.text), '추천: 막지도 않으면 그 사정을 짧게 말함', c1 && c1.text);
  ok(I.recText({ kind: 'plain', text: '형세를 차분히 다져요' }, c1) === '형세를 차분히 다져요 — 상대 노림은 받지 않아도 된다고 읽었어요', '까닭 합치기: 덧붙임');
  ok(I.recText({ kind: 'defend', text: '포를 지켜요' }, { kind: 'block', text: '상대 노림(…)을 막는 수예요' }) === '상대 노림(…)을 막는 수예요', '까닭 합치기: 막는 수가 주인공');
  ok(I.recText({ kind: 'free', text: '차가 공짜로 잡혀요' }, { kind: 'take', text: '노리던 상대 차를 잡아 없애요' }) === '차가 공짜로 잡혀요 · 노리던 상대 차를 잡아 없애요', '까닭 합치기: 뚜렷한 까닭은 같이');
  ok(I.recText({ kind: 'plain', text: 'A' }, null) === 'A' && I.recText(null, null) === '', '까닭 합치기: 노림 없으면 그대로');
  // 형세 말
  let f = I.formText({ score: -390, mate: 0 }, 0, { d: -120 });
  ok(f.text === '내가 약 3.9점 뒤져요' && f.delta === '지난 차례보다 −1.2점', '형세: 내가 약 3.9점 뒤져요 (지난 차례보다 −1.2점)', JSON.stringify(f));
  f = I.formText({ score: 250, mate: 0 }, 1, { d: 40 });
  ok(f.text === '내가 약 2.5점 앞서요' && f.delta === '', '형세: 변화 1점 미만이면 말하지 않음', JSON.stringify(f));
  ok(I.formText({ score: 20, mate: 0 }, 0).text === '팽팽해요' && /한이 약 1\.0점 앞서요/.test(I.formText({ score: 100, mate: 0 }, 1, { duo: true }).text), '형세: 팽팽 · 둘이서는 초가/한이');
  ok(/상대가 3수 안에 외통/.test(I.formText({ score: 0, mate: -3 }, 0).text) && /내가 2수 안에 외통을 만들/.test(I.formText({ score: 0, mate: 2 }, 0).text) && /점수로 이겨요/.test(I.formText({ score: 16000, mate: 0 }, 0).text), '형세: 외통 · 점수 승');
  // 엔진까지: 한 차가 내 포를 노리며 도망온 장면 → 읽기 + 추천이 노림에 맞섬 (노드 수 고정 = 같은 결과)
  const s0 = FR('4k4/9/3r5/9/9/3R5/9/1C7/4K4/9 h'), mv0 = C.legal(s0).find(x => x.from === sq(4, 3) && x.to === sq(2, 3)), s1 = C.fastClone(s0); C.step(s1, mv0.uci);
  const nx = s1.last, hint = AI.think(C.toJSON(s1), { tier: 'hard', hint: true, explain: true, nodes: 40000, timeMs: 1e9, seed: 7 });
  const fen1 = C.toFen(s1.b, nx.side), r1 = AI.think({ rules: s1.rules, fen: fen1 }, { tier: 'hard', hint: true, nodes: 30000, timeMs: 1e9, seed: 11 });
  const m1 = C.parseMove(r1.move), sF = C.create({ rules: s1.rules, fen: fen1 }), sF0 = C.fastClone(sF), pc1 = sF.b[m1 >> 7] & 7, cp1 = sF.b[m1 & 127] & 7; C.step(sF, r1.move);
  const th1 = { move: r1.move, from: m1 >> 7, to: m1 & 127, piece: pc1, captured: cp1, check: sF.check, score: r1.score, mate: r1.mate };
  const aim1 = I.aim(nx.side, th1, hint, { opp: true, via: I.why(sF0, sF, sF.last, { opp: true }) }), why1 = I.why(s0, s1, nx, { opp: true }), ct1 = aim1 && I.counter(s1, hint, th1, aim1);
  ok(why1 && why1.text === '잡힐 뻔한 자기 차를 옮겼어요', '흐름: 상대가 한 일 = 잡힐 뻔한 자기 차를 옮김', why1 && why1.text);
  ok(aim1 && aim1.term === '기물 따기' && /내 포를 따려고/.test(aim1.text), '흐름: 다음 노림 = 차로 내 포를 따려고 함', aim1 && aim1.text);
  ok(ct1 && /^상대 노림\(차로 내 포 따기\)|^상대 노림보다|^노리던|^장군으로 상대 노림/.test(ct1.text), '흐름: 추천이 그 노림에 어떻게 맞서는지 말함', `${hint.move} ${ct1 && ct1.text}`);
  console.log(`  흐름 예: 👀 상대 ${C.notation(nx)}: ${why1 && why1.text} · ${aim1 && aim1.text}  /  💡 ${hint.why && hint.why.text} → ${ct1 && ct1.text}`);
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

/* 체스 자체 시험 — node game/chess/test/selftest.js  (빠르게: quick)
   1) 수 생성: 표준 perft 국면 6개를 우리 엔진(ai.js)과 chess.js(core) 둘 다로 세어 알려진 값과 맞춤
   2) 특수 규칙: 캐슬링(권리·체크 통과 금지) · 앙파상 · 승진(덜 승진 포함) · 체크/메이트/스테일메이트 · 같은 국면 세 번 · 50수 · 기물 부족 · 시간 끝 · 기권 · 무르기 · 기보
   3) 엔진: 한 수 메이트 · 두 수 메이트(chess.js 로 전수 확인) · 공짜 기물 잡기 · 첫 수 책이 모두 합법 · 결정성(같은 씨앗 = 같은 수)
   4) AI 선생님 까닭: 포크 · 핀 · 공짜로 잡기 · 캐슬링 · 메이트
   4-2) 대국 중 '상대 수 읽기'(read.js): 👀 상대가 방금 한 일 · 다음 노림 · 📊 형세 말 · 👉 추천이 노림을 막는지
   5) AI 끼리 대국 (일꾼 스레드): 고급 > 중급 > 초급, 반칙 없음
   6) 학습 입력(RL.md): 판 18장 · 수 번호 0..4671 겹침 없음 · 합법 수 가림 */
'use strict';
const path = require('path');
const C = require('../core.js');
const AI = require('../ai.js');
const { Chess } = require('../vendor/chess.js');
const QUICK = process.argv.includes('quick');
const T0 = Date.now();

// 일꾼 스레드: AI 끼리 한 판만 두고 결과를 돌려줌
const WT = require('worker_threads');
if (!WT.isMainThread) {
  const { ta, tb, aWhite, seed } = WT.workerData;
  const s = C.create();
  let illegal = 0, maxMs = 0;
  const opt = t => t === 'hard' ? { tier: 'hard', nodes: 40000, timeMs: 1e9 } : { tier: t };
  while (!s.over && s.moves.length < 220) {
    const aTurn = (C.turn(s) === 'w') === aWhite;
    const r = AI.think(C.toJSON(s), Object.assign({ seed: seed * 977 + s.moves.length }, opt(aTurn ? ta : tb)));
    maxMs = Math.max(maxMs, r.ms);
    if (!r.move || C.step(s, r.move)[0].type === 'illegal') { illegal = 1; break; }
  }
  let winner = s.winner;
  if (!s.over) { const d = C.captured(s).diff; winner = d >= 5 ? 'w' : d <= -5 ? 'b' : null; }   // 220수까지 못 끝나면 기물 5점 이상 앞선 쪽 승
  WT.parentPort.postMessage({ winner, aWhite, plies: s.moves.length, reason: s.reason || 'adjudicated', illegal, maxMs, rec: C.encode(s) });
  return;
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
const eq = (a, b, name) => { const A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, name, A === B ? '' : `${A} ≠ ${B}`); };
const section = t => console.log('\n■ ' + t);
const play = (s, list) => { for (const u of list.split(' ').filter(Boolean)) { const e = C.step(s, u); if (e[0].type === 'illegal') return u; } return null; };
const at = fen => C.create(fen);
const endOf = ev => ev.find(e => e.type === 'end');

// ── 1) perft ──
section('수 생성 (perft)');
const PERFT = [
  ['시작 판', C.START, [20, 400, 8902, 197281, 4865609]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862, 4085603]],
  ['국면 3 (앙파상·핀)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238, 674624]],
  ['국면 4 (승진·캐슬)', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467, 422333]],
  ['국면 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379, 2103487]],
  ['국면 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890, 3894594]],
];
for (const [name, fen, want] of PERFT) {
  const dEng = QUICK ? Math.min(want.length, 4) : want.length, dLib = QUICK ? 3 : 4;
  const got = []; for (let d = 1; d <= dEng; d++) got.push(AI.perft(fen, d));
  eq(got, want.slice(0, dEng), `엔진 perft ${name} (깊이 ${dEng})`);
  const lib = new Chess(fen), g2 = []; for (let d = 1; d <= Math.min(dLib, want.length); d++) g2.push(lib.perft(d));
  eq(g2, want.slice(0, g2.length), `chess.js perft ${name} (깊이 ${g2.length})`);
}

// ── 2) 특수 규칙 ──
section('특수 규칙');
{ // 캐슬링: 양쪽 다 되고, 룩이 넘어옴
  const s = at('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const ev = C.step(s, 'e1g1');
  ok(ev[0].castle === 'k' && JSON.stringify(ev[0].rook) === '["h1","f1"]', '백 킹 쪽 캐슬링 · 룩 h1→f1');
  ok(s.chess.get('f1') && s.chess.get('f1').type === 'r' && !s.chess.get('h1'), '캐슬링 뒤 룩 자리');
  const e2 = C.step(s, 'e8c8');
  ok(e2[0].castle === 'q' && s.chess.get('d8').type === 'r', '흑 퀸 쪽 캐슬링');
}
{ // 킹·룩이 움직이면 권리 없음
  const s = at('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  play(s, 'h1h2 a8a7 h2h1 a7a8');
  ok(!C.legal(s, 'e1').some(m => m.to === 'g1') && C.legal(s, 'e1').some(m => m.to === 'c1'), '룩 h1 이 움직인 뒤 킹 쪽 캐슬링 금지, 퀸 쪽은 됨');
  play(s, 'e1d1 e8d8 d1e1 d8e8');
  ok(!C.legal(s, 'e1').some(m => m.to === 'c1'), '킹이 움직인 뒤 캐슬링 금지');
}
{ // 체크 중 · 지나가는 칸 공격받으면 금지
  const s1 = at('4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1');
  ok(!C.legal(s1, 'e1').some(m => m.to === 'g1' || m.to === 'c1'), '체크 중에는 캐슬링 금지');
  const s2 = at('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1');
  ok(!C.legal(s2, 'e1').some(m => m.to === 'g1') , 'f1 이 공격받으면 킹 쪽 캐슬링 금지');
  const s3 = at('4k3/8/8/8/8/8/1r6/R3K2R w KQ - 0 1');
  ok(C.legal(s3, 'e1').some(m => m.to === 'c1'), 'b1 만 공격받으면 퀸 쪽 캐슬링은 됨');
  eq([AI.perft('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1', 1)], [new Chess('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1').perft(1)], '엔진도 같은 수 개수');
}
{ // 앙파상
  const s = at('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  play(s, 'd7d5');
  const ep = C.legal(s, 'e5').find(m => m.to === 'd6');
  ok(!!ep && ep.flags.includes('e'), '두 칸 전진 바로 뒤 앙파상 가능');
  const ev = C.step(s, 'e5d6');
  ok(ev[0].ep && ev[0].epSq === 'd5' && !s.chess.get('d5'), '앙파상으로 d5 폰이 사라짐');
  const s2 = at('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  play(s2, 'd7d5 e1e2 e8e7');
  ok(!C.legal(s2, 'e5').some(m => m.to === 'd6'), '한 수 지나면 앙파상 불가');
  const s3 = at('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
  ok(!C.legal(s3, 'e5').some(m => m.to === 'd6'), '앙파상하면 킹이 드러나는 핀이면 금지');
}
{ // 승진
  for (const p of ['q', 'r', 'b', 'n']) {
    const s = at('8/4P2k/8/8/8/8/8/K7 w - - 0 1');
    const ev = C.step(s, 'e7e8' + p);
    ok(ev[0].promotion === p && s.chess.get('e8').type === p, `승진 → ${C.KO[p]}`);
  }
  const s = at('8/4P2k/8/8/8/8/8/K7 w - - 0 1');
  ok(C.needsPromotion(s, 'e7', 'e8') && !C.needsPromotion(at(C.START), 'e2', 'e4'), '승진 고르기가 필요한지');
  const ev = C.step(s, 'e7e8');
  ok(ev[0].promotion === 'q', '고르지 않으면 퀸');
  const s2 = at('3r3k/4P3/8/8/8/8/8/K7 w - - 0 1');
  const e2 = C.step(s2, 'e7d8n');
  ok(e2[0].captured === 'r' && e2[0].promotion === 'n', '잡으면서 나이트로 승진');
}
{ // 체크 · 메이트 · 스테일메이트
  const s = C.create();
  play(s, 'f2f3 e7e5 g2g4');
  const ev = C.step(s, 'd8h4');
  ok(ev.some(e => e.type === 'check'), '체크 사건');
  const e = endOf(ev);
  ok(e && e.reason === 'checkmate' && e.winner === 'b' && s.over, '바보 메이트 → 흑 승');
  ok(C.step(s, 'a2a3')[0].type === 'illegal', '끝난 판엔 둘 수 없음');
  const st = at('7k/8/6QK/8/8/8/8/8 w - - 0 1');
  const e2 = endOf(C.step(st, 'g6f7'));
  ok(e2 && e2.reason === 'stalemate' && e2.winner === null, '스테일메이트 → 무승부');
}
{ // 같은 국면 세 번
  const s = C.create();
  const e = endOf([].concat(...'g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8'.split(' ').map(u => C.step(s, u))));
  ok(e && e.reason === 'threefold', '같은 국면 세 번 → 무승부');
}
{ // 50수
  const s = at('4k3/8/8/8/8/8/8/R3K3 w - - 99 80');
  const e = endOf(C.step(s, 'a1a2'));
  ok(e && e.reason === 'fifty', '50수 규칙 → 무승부');
  const s2 = at('4k3/8/8/8/8/8/P7/4K3 w - - 99 80');
  ok(!endOf(C.step(s2, 'a2a3')), '폰이 움직이면 50수 다시 셈');
}
{ // 기물 부족
  ok(endOf(C.step(at('4k3/8/8/8/8/8/3q4/4K3 w - - 0 1'), 'e1d2')).reason === 'insufficient', '킹 대 킹 → 무승부');
  ok(endOf(C.step(at('4k3/8/8/8/8/8/3q4/4KB2 w - - 0 1'), 'e1d2')).reason === 'insufficient', '킹+비숍 대 킹 → 무승부');
  ok(endOf(C.step(at('4k3/8/8/8/8/8/3q4/4KN2 w - - 0 1'), 'e1d2')).reason === 'insufficient', '킹+나이트 대 킹 → 무승부');
  ok(!endOf(C.step(at('4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1'), 'd1d2')), '킹+룩은 계속');
  const sb = at('4k3/8/8/8/8/1b6/8/4KB2 w - - 0 1');          // 같은 색 칸 비숍 둘
  ok(sb.chess.isInsufficientMaterial(), '같은 색 칸 비숍끼리 → 기물 부족');
}
{ // 시간 끝 · 기권
  const s = C.create(); play(s, 'e2e4 e7e5');
  const e = C.timeout(s, 'w')[0];
  ok(e.reason === 'time' && e.winner === 'b', '시간 끝 → 상대 승');
  const s2 = at('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
  ok(C.timeout(s2, 'w')[0].winner === null, '시간 끝이어도 상대가 킹 하나뿐이면 무승부');
  const s3 = at('4k1n1/8/8/8/8/8/8/3QK3 w - - 0 1');
  ok(C.timeout(s3, 'w')[0].winner === null, '상대가 킹+나이트뿐이면 무승부');
  const s4 = C.create(); const r = C.resign(s4, 'b')[0];
  ok(r.reason === 'resign' && r.winner === 'w' && s4.over, '흑 기권 → 백 승');
}
{ // 무르기 · 기보
  const s = C.create(); play(s, 'e2e4 e7e5 g1f3');
  const f2 = C.create(); play(f2, 'e2e4 e7e5');
  C.undo(s, 1);
  eq(C.fen(s), C.fen(f2), '한 수 무르기');
  const m = C.create(); play(m, 'f2f3 e7e5 g2g4 d8h4');
  C.undo(m, 1);
  ok(!m.over && m.winner === null, '메이트 판 무르기 → 다시 둠');
  const r = C.create(); play(r, 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6');
  const d = C.decode(C.encode(r));
  eq(C.fen(d), C.fen(r), '기보 저장·불러오기');
  const rs = C.create(); play(rs, 'e2e4'); C.resign(rs, 'w');
  const d2 = C.decode(C.encode(rs));
  ok(d2.over && d2.reason === 'resign' && d2.winner === 'b', '기권도 기보에 남음');
  const pg = C.pgn(r, { White: 'A', Black: 'B' });
  ok(/1\. e4 c5 2\. Nf3 d6/.test(pg) && /\[White "A"\]/.test(pg), 'PGN');
  eq([C.sanKo('Nf3'), C.sanKo('Qxe7+'), C.sanKo('e8=Q#'), C.sanKo('O-O')], ['나f3', '퀸xe7+', 'e8=퀸#', 'O-O'], '한글 기보 글자');
  const cp = C.create(); play(cp, 'e2e4 d7d5 e4d5 d8d5 b1c3 d5e5');
  const cap = C.captured(cp);
  ok(cap.w.join() === 'p' && cap.b.join() === 'p' && cap.diff === 0, '잡은 기물 · 점수 차');
}

// ── 3) 엔진 ──
section('엔진');
const isMate = (fen, u) => { const s = at(fen); const e = endOf(C.step(s, u)); return !!e && e.reason === 'checkmate'; };
const MATE1 = [
  ['스콜라 메이트', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'],
  ['뒷줄 메이트', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'],
  ['바보 메이트(흑)', 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'],
  ['질식 메이트', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1'],
  ['퀸+킹', '7k/8/6K1/8/8/8/8/Q7 w - - 0 1'],
];
for (const [name, fen] of MATE1) {
  for (const tier of ['normal', 'hard']) {
    const r = AI.think({ start: fen, moves: [] }, { tier, seed: 1, nodes: 200000, timeMs: 1e9 });
    ok(isMate(fen, r.move), `한 수 메이트 (${name}) · ${tier}`, r.move);
  }
}
// 두 수 메이트: 엔진 첫 수 뒤 모든 응수에 한 수 메이트가 있는지 chess.js 로 전수 확인
function forcedMate2(fen, u) {
  const c = new Chess(fen); c.move(C.parseUci(u));
  if (c.isCheckmate()) return true;
  const replies = c.moves({ verbose: true }); if (!replies.length) return false;
  return replies.every(r => { c.move(r); const ok2 = c.moves({ verbose: true }).some(m => { c.move(m); const mt = c.isCheckmate(); c.undo(); return mt; }); c.undo(); return ok2; });
}
const MATE2 = [
  ['룩 몰기', 'k7/8/2K5/8/8/8/8/7R w - - 0 1'],
  ['퀸 희생 뒤 룩', 'r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 1'],
  ['나이트 체크 뒤 비숍', 'r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1'],
  ['두 룩 사다리', '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1'],
];
for (const [name, fen] of MATE2) {
  const r = AI.think({ start: fen, moves: [] }, { tier: 'hard', seed: 1, nodes: 400000, timeMs: 1e9 });
  ok(forcedMate2(fen, r.move) && r.mate > 0 && r.mate <= 2, `두 수 메이트 (${name})`, `${r.move} mate=${r.mate}`);
}
{ // 공짜 기물 · 안 잃기
  const fen = 'rnb1kbnr/pppp1ppp/8/4p1q1/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3';    // 흑 퀸이 c1 비숍에 걸림
  for (const tier of ['normal', 'hard']) { const r = AI.think({ start: fen, moves: [] }, { tier, seed: 2, nodes: 300000, timeMs: 1e9 }); eq(r.move, 'c1g5', `걸린 퀸 잡기 · ${tier}`); }
  const fen2 = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR w KQkq - 0 3';
  const r2 = AI.think({ start: fen2, moves: [] }, { tier: 'hard', seed: 3, nodes: 200000, timeMs: 1e9 });
  const s2 = at(fen2); C.step(s2, r2.move);
  ok(!C.legal(s2).some(m => m.captured === 'q'), '고급은 퀸을 공짜로 내주지 않음', r2.move);
}
{ // 첫 수 책
  let bad = 0;
  for (const line of AI.BOOK_LINES) { const s = C.create(); if (play(s, line)) bad++; }
  ok(bad === 0, `첫 수 책 ${AI.BOOK_LINES.length}줄 모두 합법`);
  const r = AI.think({ moves: ['e2e4'] }, { tier: 'hard', seed: 5 });
  ok(r.book && ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d5', 'g7g6'].includes(r.move), '고급은 책에서 응수', r.move);
}
{ // 결정성
  const g = { moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4', 'd1c2', 'e8g8', 'a2a3'] };
  const a = AI.think(g, { tier: 'hard', seed: 9, nodes: 60000, timeMs: 1e9 }), b = AI.think(g, { tier: 'hard', seed: 9, nodes: 60000, timeMs: 1e9 });
  eq([a.move, a.score, a.nodes], [b.move, b.score, b.nodes], '고급 (노드 예산) 같은 입력 → 같은 수·값·노드');
  const e1 = AI.think(g, { tier: 'easy', seed: 42 }), e2 = AI.think(g, { tier: 'easy', seed: 42 });
  eq(e1.move, e2.move, '초급 같은 씨앗 → 같은 수');
  const seen = new Set(); for (let i = 0; i < 12; i++) seen.add(AI.think(g, { tier: 'easy', seed: i }).move);
  ok(seen.size >= 3, `초급은 씨앗마다 수가 여러 가지 (${seen.size}가지)`);
  const s1 = C.create(), s2 = C.create();
  for (let i = 0; i < 16; i++) { C.step(s1, AI.think(C.toJSON(s1), { tier: 'normal', seed: 100 + i }).move); C.step(s2, AI.think(C.toJSON(s2), { tier: 'normal', seed: 100 + i }).move); }
  eq(C.fen(s1), C.fen(s2), '중급 16수 대국 두 번 → 같은 판');
}
{ // 시간 지키기
  const t = Date.now(); const r = AI.think({ start: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', moves: [] }, { tier: 'hard', seed: 1 });
  const ms = Date.now() - t;
  ok(ms < 1800 && r.depth >= 4, `고급 한 수 ${ms}ms · 깊이 ${r.depth}`);
}

// ── 4) AI 선생님 까닭 ──
section('AI 선생님 까닭');
const why = (fen, u) => AI.explain({ start: fen, moves: [] }, u, { score: 0, mate: 0 });
{
  const f = why('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7');
  ok(f && f.kind === 'fork' && /나이트로 포크/.test(f.text) && /킹과 룩을/.test(f.text), '나이트 포크', f && f.text);
  const p = why('4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', 'f1b5');
  ok(p && p.kind === 'pin', '비숍 핀', p && p.text);
  const w = why('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', 'd1d5');
  ok(w && w.kind === 'win' && /공짜 퀸/.test(w.text), '공짜 퀸 잡기', w && w.text);
  const c = AI.explain({ moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5'.split(' ') }, 'e1g1', { score: 0 });
  ok(c && c.kind === 'castle', '캐슬링', c && c.text);
  const m = why('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8');
  ok(m && m.kind === 'mate', '메이트', m && m.text);
  const r = AI.think({ start: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', moves: [] }, { tier: 'hard', hint: true, explain: true, seed: 1, nodes: 100000, timeMs: 1e9 });
  ok(r.move === 'd5c7' && r.why && r.why.kind === 'fork', '선생님 추천 = 포크 + 까닭', r.move + ' ' + (r.why && r.why.text));
  // 복기 선생님 '🤔 노린 것' (ChessAI.intent): 실제로 둔 수의 까닭 · 한 번 더 둔다면(널 무브) 노리는 수 · 이 수 뒤 형세
  const it = (moves, u) => AI.intent({ moves: moves.split(' ') }, u, { timeMs: 300 });
  const q = it('e2e4 e7e5 f1c4 b8c6', 'd1h5');
  ok(q && q.threat && q.threat.move === 'h5f7' && q.threat.mate > 0, '노림: 퀸h5 → 퀸xf7# 메이트 위협', q && q.threat && q.threat.move);
  const ng = it('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6', 'f3g5');
  ok(ng && ng.threat && ng.threat.move === 'g5f7' && ng.threat.why && ng.threat.why.kind === 'fork', '노림: 나g5 → 나xf7 포크', ng && ng.threat && ng.threat.move);
  const ck = it('e2e4 e7e5 f1c4 b8c6 d1h5 g8f6', 'h5f7');
  ok(ck && ck.check && !ck.threat && ck.mate === 1 && ck.why.kind === 'mate', '체크(메이트)면 노림 없음 · 메이트', ck && ck.why && ck.why.text);
  const bl = it('e2e4 e7e5 f1c4 b8c6 d1h5', 'g8f6');
  ok(bl && bl.mate < 0, '실수: 나f6?? 뒤엔 메이트를 당함', bl && bl.mate);
  ok(AI.intent({ moves: [] }, 'e2e5') === null, '안 되는 수는 null');
}

// ── 4-2) 대국 중 '상대 수 읽기' (👀 · 📊 · 👉) ──
section('대국 중 상대 수 읽기 (ChessAI.intent my·skipScore·reply + read.js)');
{
  const RD = require('../read.js');
  const sanOf = (fen, u) => C.sanLine(C.create(fen), [u], 1)[0];
  // 상대가 둔 수 uci 를 내 쪽(my)에서 읽기: 선생님 추천은 노드 수로 고정해 늘 같은 값
  const live = (start, before, uci, my, reply) => {
    const hist = before.split(' ').filter(Boolean).concat(uci);
    const r = AI.think({ start, moves: hist }, { tier: 'hard', hint: true, explain: true, nodes: 60000, timeMs: 1e9, seed: 7 });
    const it = AI.intent({ start, moves: hist.slice(0, -1) }, uci, { timeMs: 300, my, skipScore: true, reply: reply || r.move });
    return { r, it, o: RD.oppRead(it, r, sanOf) };
  };
  const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', PIN = '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', FREE = '4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1';
  const w = (fen, u, my) => AI.explain({ start: fen, moves: [] }, u, null, my);
  // 한 일(과거형) — 내 기물은 '내', 둘이서면 색 이름
  eq(w(FORK, 'd5c7', '내').opp.done, '나이트로 포크를 걸었어요 (내 킹과 룩을 함께 노려요)', '👀 한 일: 포크');
  eq(w(FORK, 'd5c7', '흑').opp.done, '나이트로 포크를 걸었어요 (흑 킹과 룩을 함께 노려요)', '둘이서면 내 → 색 이름');
  eq(w(PIN, 'f1b5', '내').opp.done, '비숍으로 핀을 걸었어요 (내 나이트가 킹 앞에서 꼼짝 못 해요)', '👀 한 일: 핀');
  eq(w(FREE, 'd1d5', '내').opp.done, '내 퀸을 공짜로 잡았어요', '👀 한 일: 공짜로 잡음');
  ok(AI.explain({ moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5'.split(' ') }, 'e1g1', null, '내').opp.done.includes('캐슬링'), '👀 한 일: 캐슬링');
  ok(AI.explain({ start: FORK, moves: [] }, 'd5c7', null).opp === undefined, 'my 를 안 주면 opp 말은 없음 (복기는 그대로)');
  eq(w(FORK, 'd5c7', '내').text, '나이트로 포크를 걸어요 (킹과 룩을 함께 노려요)', '복기·추천 말은 그대로');
  eq(AI.explain({ moves: ['e2e4'] }, 'e7e6', null, '내').opp.done, '폰을 앞으로 밀었어요', '뚜렷한 일이 없으면 있는 그대로 (자리 다졌다는 짐작은 안 함)');
  // 스칼라 메이트 수: 퀸h5 → 다음 퀸xf7# (메이트 위협) · 추천이 그걸 막으면 👉
  {
    const x = live('', 'e2e4 e7e5 f1c4 b8c6', 'd1h5', '내');
    ok(x.o && x.o.threat && x.o.threat.san === 'Qxf7#' && x.o.threat.text === '메이트 위협' && x.o.threat.from === 'h5' && x.o.threat.to === 'f7', '👀 다음 노림: Qxf7# 메이트 위협 (화살표 h5→f7)', x.o && JSON.stringify(x.o.threat));
    ok(x.o && /^내 .*노리고 있어요$/.test(x.o.done), '👀 한 일은 내 쪽 말로', x.o && x.o.done);
    const n = RD.threatNote({ move: x.r.move, why: x.r.why }, x.o.threat, null);
    ok(n === '상대 노림(Qxf7#)을 막는 수예요', '👉 추천(' + x.r.move + ')이 메이트 노림을 막는 수', n);
    ok(x.o.threat.after && x.o.threat.after.legal === true && x.o.threat.after.kind !== 'mate', '막은 뒤엔 그 수가 메이트가 아님 (reply 확인)', JSON.stringify(x.o.threat.after));
    const bad = live('', 'e2e4 e7e5 f1c4 b8c6', 'd1h5', '내', 'a7a6');                                 // 엉뚱한 수를 두면 여전히 메이트
    ok(bad.o.threat.after && bad.o.threat.after.legal && bad.o.threat.after.kind === 'mate', '막지 않으면 여전히 메이트 (after.kind = mate)', JSON.stringify(bad.o.threat.after));
  }
  // 포크 노림: 나g5 → 다음 나xf7 포크
  {
    const x = live('', 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6', 'f3g5', '내');
    ok(x.o && x.o.threat && x.o.threat.from === 'g5' && x.o.threat.to === 'f7' && /포크/.test(x.o.threat.text) && /내 /.test(x.o.threat.text), '👀 다음 노림: Nxf7 포크 (내 룩·퀸 동시에)', x.o && JSON.stringify(x.o.threat));
  }
  // 첫 수 e4 뒤엔 급한 노림이 없음 · 체크를 건 수는 다음 노림을 읽지 않음
  { const x = live('', '', 'e2e4', '내'); ok(x.o && x.o.threat === null && x.o.done === '폰으로 중앙을 차지했어요', '👀 e4: 급한 노림 없음', x.o && JSON.stringify(x.o)); }
  { const x = live(FORK, '', 'd5c7', '내'); ok(x.o && x.o.check === true && x.o.threat === null && /포크/.test(x.o.done), '👀 체크를 건 포크: 다음 노림은 안 읽음 · check 표시', x.o && JSON.stringify(x.o)); }
  { const t0 = Date.now(), it = AI.intent({ moves: ['e2e4'] }, 'e7e5', { timeMs: 200, my: '내', skipScore: true }); ok(it.score === 0 && it.mate === 0 && it.threat && Date.now() - t0 < 700, 'skipScore: 형세 읽기는 건너뜀 (탐색 한 번만)', Date.now() - t0 + 'ms'); }
  // 📊 형세 말: 실제 AI 없이 만든 값으로 (문구 · 경계)
  const fl = (sc, mate, o, c) => RD.formLine({ score: sc, mate: mate || 0 }, c || 'w', o);
  eq(fl(0), '팽팽해요 (비슷해요)', '📊 비슷');
  eq(fl(200), '내가 폰 2.0개만큼 앞서요', '📊 폰 2개 앞섬');
  eq(fl(-90), '내가 폰 0.9개만큼 뒤져요', '📊 뒤짐');
  eq(fl(-450), '내가 폰 4.5개만큼 크게 뒤져요', '📊 크게 뒤짐');
  eq(fl(29990, 3), '내가 3수 안에 메이트할 수 있어요!', '📊 내가 메이트');
  eq(fl(-29990, -2), '상대가 2수 안에 메이트할 수 있어요 — 조심!', '📊 상대 메이트');
  eq(fl(-150, 0, { duo: true }, 'b'), '흑이 폰 1.5개만큼 뒤져요', '📊 둘이서는 색 이름');
  eq(fl(120, 0, { prev: { score: 300, mate: 0 } }), '내가 폰 1.2개만큼 앞서요 (지난 차례 −1.8)', '📊 지난 차례보다 나빠짐');
  eq(fl(-40, 0, { prev: { score: -140, mate: 0 } }), '내가 폰 0.4개만큼 뒤져요 (지난 차례 +1.0)', '📊 지난 차례보다 나아짐');
  eq(fl(100, 0, { prev: { score: 60, mate: 0 } }), '내가 폰 1.0개만큼 앞서요', '📊 조금 달라진 건 말하지 않음');
  eq(fl(100, 0, { prev: { score: 29990, mate: 2 } }), '내가 폰 1.0개만큼 앞서요', '📊 지난번이 메이트면 비교 안 함');
  { // oppRead 의 '뚜렷한 노림만' 기준
    const mk = (kind, sc, mate, next) => ({ why: { opp: { done: '뭔가 했어요' } }, check: false, threat: { move: 'a1a2', fen: 'x', score: sc, mate, why: { kind, opp: { next } } } });
    const base = { score: 0, mate: 0 };                                     // 내 최선 뒤 상대 쪽 형세 = 0
    const sn = () => 'Ra2';
    ok(RD.oppRead(mk('win', 150, 0, '내 폰 잡기'), base, sn).threat.text === '내 폰 잡기', '노림: 한 번 더 두면 1.5점 나아지는 전술은 말함');
    ok(RD.oppRead(mk('win', 60, 0, '내 폰 잡기'), base, sn).threat === null, '노림: 0.6점짜리는 말하지 않음');
    ok(RD.oppRead(mk('quiet', 400, 0, ''), base, sn).threat === null, '노림: 그저 자리 좋은 수는 말하지 않음');
    ok(RD.oppRead(mk('quiet', 29990, 2, ''), base, sn).threat.text === '메이트 위협', '노림: 메이트는 늘 말함');
    ok(RD.oppRead(mk('win', 29990, 2, '내 폰 잡기'), { score: 29990, mate: 2 }, sn).threat === null, '노림: 내가 먼저 메이트면 말하지 않음');
    ok(RD.oppRead({ error: 'x' }, base, sn) === null && RD.oppRead(null, base, sn) === null, '읽기 실패는 null (줄을 만들지 않음)');
  }
  { // 👉 문구: 추천 수 r 과 상대 노림 T 사이
    const T = o => Object.assign({ from: 'd1', to: 'f7', san: 'Qxf7#', mate: 1, after: { legal: true, kind: 'mate' } }, o);
    const R1 = (m, k) => ({ move: m, why: { kind: k } });
    eq(RD.threatNote(R1('a7a6', 'quiet'), T(), null), '', '👉 받지 않는 까닭이 없으면 말하지 않음');
    eq(RD.threatNote(R1('a7a6', 'win'), T(), null), '상대 노림(Qxf7#)보다 이 수가 더 급해요', '👉 더 급한 수 (노림이 그대로 통함)');
    eq(RD.threatNote(R1('g8h6', 'defend'), T({ after: { legal: true, kind: 'trade' } }), null), '상대 노림(Qxf7#)을 막는 수예요', '👉 막는 수');
    eq(RD.threatNote(R1('f7f6', 'escape'), T({ after: { legal: false, kind: '' } }), s => 'x' + s), '상대 노림(xQxf7#)에 걸린 기물을 피하는 수예요', '👉 노림 받는 기물을 피함 (기보 글자 바꾸기 반영)');
    eq(RD.threatNote(R1('g8h6', 'escape'), T({ after: { legal: false, kind: '' } }), null), '상대 노림(Qxf7#)을 막는 수예요', '👉 노림 받는 칸이 아닌 곳에서 막으면 막는 수');
    eq(RD.threatNote(R1('d8d1', 'win'), T({ after: { legal: true, kind: 'mate' } }), null), '상대 노림(Qxf7#)을 하려던 기물을 바로 잡아요', '👉 노림을 하려던 기물을 잡음');
    eq(RD.threatNote(R1('a7a6', 'win'), T({ mate: 2, after: { legal: true, kind: 'quiet' } }), null), '', '👉 두 수 넘는 메이트는 판 위 사실만으론 못 가려 말하지 않음');
    eq(RD.threatNote(R1('a7a6', 'win'), T({ mate: 0, san: 'Nxf7', after: { legal: true, kind: 'fork' } }), null), '상대 노림(Nxf7)보다 이 수가 더 급해요', '👉 포크 노림이 그대로면 더 급한 수');
    eq(RD.threatNote(R1('a7a6', 'win'), null, null), '', '👉 노림이 없으면 말하지 않음');
    ok(RD.overlaps({ why: { kind: 'defend' } }) && RD.overlaps({ why: { kind: 'escape' } }) && !RD.overlaps({ why: { kind: 'win' } }), '추천 까닭이 지킴·피함이면 한 줄로 합침');
  }
}

// ── 6) 학습 입력 ──
section('학습 입력 (RL)');
{
  const s = C.create(), P = C.planes(s);
  ok(P.length === 18 * 64, '판 18장 × 64칸');
  const sum = k => P.slice(k * 64, k * 64 + 64).reduce((a, b) => a + b, 0);
  ok(sum(0) === 8 && sum(6) === 8 && sum(5) === 1 && P[0 * 64 + 1 * 8 + 4] === 1, '내 폰 8 · 상대 폰 8 · 내 킹 1 · e2 자리');
  play(s, 'e2e4');
  const Q = C.planes(s);
  ok(Q[0 * 64 + 1 * 8 + 3] === 1 && Q[6 * 64 + 4 * 8 + 3] === 1, '흑 차례면 판을 180° 돌려 내 쪽이 아래 (흑 e7 → 둘째 줄 d칸, 백 e4 → 다섯째 줄 d칸)');
  for (const fen of [C.START, PERFT[1][1], PERFT[3][1], 'r1bqkb1r/pPpp1ppp/2n2n2/8/8/8/P1PPPPPP/RNBQKBNR w KQkq - 0 5']) {
    const t = at(fen), L = C.legal(t), idx = L.map(m => C.moveIndex(m.uci, C.turn(t)));
    ok(idx.every(i => i >= 0 && i < 4672) && new Set(idx).size === idx.length, `수 번호 범위·겹침 없음 (${L.length}수)`);
    ok(C.legalMask(t).reduce((a, b) => a + b, 0) === L.length, '합법 수 가림 개수');
  }
}

// ── 5) AI 끼리 대국 ──
async function matches() {
  section('AI 끼리 대국 (일꾼 스레드)');
  const pairs = [['hard', 'easy'], ['normal', 'easy'], ['hard', 'normal']];
  const games = QUICK ? 2 : 4;
  const jobs = [];
  for (const [ta, tb] of pairs) for (let i = 0; i < games; i++) jobs.push({ ta, tb, aWhite: i % 2 === 0, seed: 11 + i });
  const cores = Math.max(2, Math.min(8, require('os').cpus().length - 2));
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: cores }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const r = await new Promise((res, rej) => { const w = new WT.Worker(__filename, { workerData: j }); w.once('message', res); w.once('error', rej); });
      results.push(Object.assign({}, j, r));
    }
  }));
  for (const [ta, tb] of pairs) {
    const rs = results.filter(r => r.ta === ta && r.tb === tb);
    let sc = 0;
    for (const r of rs) { const aCol = r.aWhite ? 'w' : 'b'; sc += r.winner === aCol ? 1 : r.winner ? 0 : 0.5; ok(!r.illegal, `반칙 없음 ${ta}-${tb}`); }
    const need = ta === 'hard' && tb === 'normal' ? rs.length * 0.5 : rs.length * 0.75;
    console.log(`  ${ta} vs ${tb}: ${sc}/${rs.length}  (${rs.map(r => `${r.winner || '='}${Math.ceil(r.plies / 2)}수·${r.reason}`).join(', ')}) · 한 수 최대 ${Math.max(...rs.map(r => r.maxMs))}ms`);
    ok(sc >= need, `${ta} 이 ${tb} 보다 강함 (${sc}/${rs.length})`);
  }
}

matches().then(() => {
  console.log(`\n통과 ${pass} · 실패 ${fail} · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
  if (fail) { console.log(fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
}).catch(e => { console.error(e); process.exit(1); });

/* 오목 자체 시험 — node game/omok/test/selftest.js
   1) 규칙: 금수(렌주 · 쌍삼 금지 · 자유) · 승리 · 무르기 · 기권 · 무승부 · 기보 · 대칭 · 학습 입력
      렌주 금수 판들은 quintet(MIT, Renju Note)의 시험(src/board/forbidden.rs)에서 그대로 옮김
   2) 결정성: 같은 씨앗 · 같은 수 → 같은 상태 지문
   3) AI: 한 수 승리 · 사 막기 · 열린 삼 막기 · VCF/VCT 문제(quintet 벤치 판, renjuportal.com 문제) · 금수 이용
   4) quintet wasm 이 있으면: 무작위 렌주 국면에서 VCF 결과를 서로 맞춰 봄 (금수 판정까지 함께 검사됨)
   5) AI 끼리 대국: 난이도 순서(고급 > 중급 > 초급) · 규칙마다 반칙 없음 · 한 수 시간
   6) AI 선생님(review.js): 상대가 방금 둔 수 읽기 · 상대 노림과 견준 추천 까닭 · 📊 흐름
   빠르게: node selftest.js quick (대국 수를 줄임) */
'use strict';
const fs = require('fs'), path = require('path');
const O = require('../core.js');
const AI = require('../ai.js');
const QUICK = process.argv.includes('quick');
const T0 = Date.now();

// 일꾼 스레드: 대국 한 판만 두고 결과를 돌려준 뒤 끝 (아래 시험은 안 함)
const WT = require('worker_threads');
if (!WT.isMainThread) {
  const { ta, tb, rule, aBlack, seed } = WT.workerData;
  // 사람 흉내 봇: P1 꼼꼼한 초보(한 수 앞만, 사·열린 삼은 늘 막음) · P2 P1 + 짧은 VCF (난이도 간격 확인용)
  const PROXY = { P1: { tier: 'easy', cfg: { blind: 0, pick: [1, 1], o4: 1 } }, P2: { tier: 'easy', cfg: { blind: 0, pick: [1, 1], o4: 1, vcf: [5, 600] } } };
  const who = t => PROXY[t] || { tier: t };
  const s = O.create(15, rule, seed);
  let maxMs = 0, illegal = 0;
  while (!s.over) {
    const aTurn = (s.turn === O.BLACK) === aBlack, P = who(aTurn ? ta : tb);
    const r = AI.think(s, { tier: P.tier, cfg: P.cfg, seed: seed * 31 + s.moves.length, timeMs: 60000 });   // 시간으로는 안 끊기게 (노드 예산만)
    maxMs = Math.max(maxMs, r.ms);
    if (O.play(s, r.move)[0].type === 'illegal') { illegal = 1; break; }
  }
  WT.parentPort.postMessage({ winner: s.winner, aBlack, plies: s.moves.length, maxMs, illegal, rec: O.encode(s) });
  return;
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
function eq(a, b, name) { const A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, name, A === B ? '' : `${A} ≠ ${B}`); }
function section(t) { console.log('\n■ ' + t); }

// ── 판 그림 도우미: 15줄 (맨 위 = 15줄), o 흑 · x 백 · . 빈칸 (quintet 표기와 같음) ──
const N = 15;
const P = name => { const x = 'ABCDEFGHIJKLMNO'.indexOf(name[0]), r = +name.slice(1); return (N - r) * N + x; };
function board(txt) {
  const rows = txt.split('\n').map(l => l.trim()).filter(Boolean);
  if (rows.length !== N) throw new Error('판 줄 수 ' + rows.length);
  const b = new Array(N * N).fill(0);
  rows.forEach((r, y) => { const t = r.split(/\s+/); if (t.length !== N) throw new Error('칸 수 ' + t.length + ' @' + y); t.forEach((c, x) => { b[y * N + x] = c === 'o' ? 1 : c === 'x' ? 2 : 0; }); });
  return b;
}
function stateOf(txt, rule, turn) {
  const s = O.create(N, rule);
  const b = board(txt);
  for (let i = 0; i < b.length; i++) s.board[i] = b[i];
  s.turn = turn || O.BLACK;
  return s;
}
const swapColors = b => b.map(v => v === 1 ? 2 : v === 2 ? 1 : 0);
const fb = (b, name, c, rule) => O.forbiddenAt(b, N, P(name), c, rule);   // 0 · 1 삼삼 · 2 사사 · 3 장목
const KIND = { none: 0, '33': 1, '44': 2, over: 3 };
function show(b) {
  let out = '   A B C D E F G H I J K L M N O\n';
  for (let y = 0; y < N; y++) { out += String(N - y).padStart(2) + ' '; for (let x = 0; x < N; x++) out += '.ox'[b[y * N + x]] + ' '; out += '\n'; }
  return out;
}

// ════════════════════════════════════════════════════════════════
section('렌주 금수 (quintet 시험 판)');
{
  // test_forbiddens: 금수 자리 전체 = C13 삼삼 · D1 장목 · E5 사사 (M13 은 다섯이 되므로 금수 아님)
  const s = stateOf(`
    . . . . . . . . . . . . . . o
    . . o . . . . . . . . x o o .
    . o . o . . . . . . . o . o .
    . . o . . . . . . . . o o x .
    . . . . . . . . . . o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . o . . . . . . . . . . . . .
    . . o . . . . . . . . . . . .
    . . . o . . . . . . . . . . .
    . o o o . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . o o . o o o . . . o o o o .`, 'renju', O.BLACK);
  const m = O.forbiddenMask(s), got = {};
  for (let i = 0; i < m.length; i++) if (m[i]) got[O.coordName(i)] = m[i];
  eq(Object.entries(got).sort(), [['C13', 1], ['D1', 3], ['E5', 2]], '금수 자리 전체 (C13 삼삼 · D1 장목 · E5 사사)');
  ok(!O.isForbidden(s, P('M13')), 'M13: 삼삼이지만 다섯이 되면 금수 아님');
  // 백은 렌주에서 금수 없음
  s.turn = O.WHITE; ok(O.forbiddenMask(s).every(v => !v), '렌주 백: 금수 없음');
}
{
  // test_double_three_eye_makes_five: H8 삼삼. H8 뒤 G8 은 사사지만 다섯(G4-G8)이라 둘 수 있음 → 그 삼은 진짜
  const b = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o . . . . . . . . . .
    . . . . . o . o . . . . . . .
    . . . . . o . . o . . . . . .
    . . . . . . o o . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq(fb(b, 'H8', 1, 'renju'), KIND['33'], '눈 자리가 다섯: H8 은 삼삼');
  b[P('H8')] = 1;
  eq(fb(b, 'G8', 1, 'renju'), 0, '사사이면서 다섯인 G8 은 둘 수 있음');
}
{
  // test_double_three_nested_eye_makes_five: 세 겹 안쪽까지 따져야 H8 이 사삼(가능)으로 나옴
  const b = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . x . . . . . . . . . .
    . . . . . o . x . . . . . . .
    . . . . . . o . . . o . . . .
    . . . . x . x o . o . . . . .
    . . . x o o o . . . . . . . .
    . . . . . x o . . . . . . . .
    . . . . x o . o . . . . . . .
    . . . . . . . . x o . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq(fb(b, 'H8', 1, 'renju'), 0, '겹친 판정: H8 은 금수 아님');
  b[P('H8')] = 1;
  eq(fb(b, 'H7', 1, 'renju'), KIND['33'], '겹친 판정: H8 뒤 H7 은 진짜 삼삼');
  b[P('H7')] = 1;
  eq(fb(b, 'I8', 1, 'renju'), 0, '겹친 판정: I8 은 사사지만 다섯이라 가능');
}
{
  const cases = [
    ['H8 열린 삼 둘', 'H8', '33', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . o . o . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`],
    ['띈 삼 둘 (H5-H6-_-H8 · E5-F6-_-H8)', 'H8', '33', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o . o . . . . . . .
    . . . . o . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`],
    ['백 E8·K8 이 막아 삼 하나뿐', 'H8', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . x . o . o . x . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`],
    ['H8 이 다섯(F8-J8)이면 다른 건 안 봄', 'H8', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o o . o o . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`],
    ['E8-F8-_-H8-_-J8-K8: 사가 모두 장목이라 삼 아님', 'H8', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o o . . . o o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`],
  ];
  for (const [name, at, k, g] of cases) eq(fb(board(g), at, 1, 'renju'), KIND[k], name);
  // 열린 사 자리가 사사라 가짜인 삼: H8 · I7 은 가능, J7 은 진짜 삼삼
  const b = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . x . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o o o x . . . .
    . . . . . . x . . . . . . . .
    . . . . . . o o . . . . . . .
    . . . . . . o . o o x . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq([fb(b, 'H8', 1, 'renju'), fb(b, 'I7', 1, 'renju'), fb(b, 'J7', 1, 'renju')], [0, 0, 1], '가짜 삼: H8·I7 가능, J7 삼삼');
  // tanaseY 예제: 백 O6 하나가 세 겹 아래에서 G8 의 금수 여부를 바꿈
  const withO6 = `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . x . . . . . . . .
    . . o . . o . o . . . . . . .
    . . . . . o . . o o . . . . .
    . . . . o . . . . . . o o . x
    . . . . . . . . o x o o . . .
    . . . . . . . . . . o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`;
  eq(fb(board(withO6), 'G8', 1, 'renju'), 0, '세 겹 판정 (O6 있음): G8 가능');
  const noO6 = board(withO6); noO6[P('O6')] = 0;
  eq(fb(noO6, 'G8', 1, 'renju'), 1, '세 겹 판정 (O6 없음): G8 삼삼');
}
{
  const four = (name, k, g) => eq(fb(board(g), 'H8', 1, 'renju'), KIND[k], name);
  four('두 방향 사 (F8-I8 · F10-I7)', '44', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o . . . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . o o . o . . . . . .
    . . . . . . . . o . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('한 줄 사사 E8-_-G8-H8-I8-_-K8', '44', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o . o . o . o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('한 줄 사사 E8-F8-_-H8-I8-_-K8-L8', '44', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o o . . o . o o . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('한 줄 사사 D8-F8 · J8-L8', '44', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . o o o . . . o o o . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('G8·I8 이 모두 육목이면 사 아님', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . o o o o . . . o o o o . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('두 방향 모두 육목으로만 완성', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . o o o o . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('너무 멀어 사가 안 됨', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . o o o . . . . . o o o . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('어느 사에도 안 붙음', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . o o o o . . . . . o o o o .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('사 하나는 괜찮음', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o o . o . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('대각 사가 육목으로만 완성 (D12 · 백 J6)', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . o . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o . . . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . o o . o . . . . . .
    . . . . . . . . o . . . . . .
    . . . . . . . . . x . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('장목 E8-J8', 'over', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o o o . o o . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  four('E8-H8 만 이어짐: 장목 아님', 'none', `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . o o o . . o o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
}

// ════════════════════════════════════════════════════════════════
section('쌍삼 금지 · 자유 · 렌주 백');
{
  const g33 = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . o . o . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq(fb(g33, 'H8', 1, 'standard'), 1, '쌍삼 금지: 흑 삼삼 금지');
  eq(fb(swapColors(g33), 'H8', 2, 'standard'), 1, '쌍삼 금지: 백도 삼삼 금지');
  eq(fb(swapColors(g33), 'H8', 2, 'renju'), 0, '렌주: 백 삼삼 가능');
  eq(fb(g33, 'H8', 1, 'free'), 0, '자유: 금지 없음');
  // 사사 · 장목은 쌍삼 금지에서 둘 수 있음
  const g44 = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . o . . . . . . . . .
    . . . . . . o . . . . . . . .
    . . . . . o o . o . . . . . .
    . . . . . . . . o . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq([fb(g44, 'H8', 1, 'standard'), fb(swapColors(g44), 'H8', 2, 'standard')], [0, 0], '쌍삼 금지: 사사 가능 (흑·백)');
  // 사삼삼(4-3-3)은 쌍삼이 들어 있어 금지, 사삼은 가능
  const g433 = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . o o o . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . o . . . . . . . . .
    . . . . o . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq(fb(g433, 'H8', 1, 'standard'), 1, '사삼삼은 금지 (쌍삼 금지)');
  eq(fb(g433, 'H8', 1, 'renju'), 1, '사삼삼은 금지 (렌주 흑)');
  const g43 = g433.slice(); g43[P('E5')] = 0;
  eq([fb(g43, 'H8', 1, 'standard'), fb(g43, 'H8', 1, 'renju')], [0, 0], '사삼은 가능');
  // 다섯과 삼삼이 함께면 다섯이 먼저 (금지 아님)
  const g5 = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . o . . . . . . .
    . . . o o o o . o . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  eq(fb(g5, 'H8', 1, 'standard'), 0, '다섯 + 삼은 금지 아님');
  // 한쪽이 막힌 삼은 열린 삼이 아님 → 삼삼 아님
  const gBlocked = g33.slice(); gBlocked[P('F8')] = 2;
  eq(fb(gBlocked, 'H8', 1, 'standard'), 0, '한쪽이 막힌 삼은 셈하지 않음');
  // 쌍삼 금지에서도 가짜 삼(열린 사 자리가 삼삼)이면 셈하지 않음 (렌주 판을 흑백 모두에 적용)
  const gFake = board(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . x . . . . . . . .
    . . o . . o . o . . . . . . .
    . . . . . o . . o o . . . . .
    . . . . o . . . . . . o o . x
    . . . . . . . . o x o o . . .
    . . . . . . . . . . o . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`);
  ok(fb(gFake, 'G8', 1, 'standard') === fb(swapColors(gFake), 'G8', 2, 'standard'), '쌍삼 금지: 흑백 같은 판정');
}
{
  // 승리 조건: 장목(여섯) — 쌍삼 금지 = 아무도 못 이김(둘 수는 있음) · 렌주 = 흑 금수, 백 승리 · 자유 = 승리
  const row = `
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . C C C . C C . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`;
  const tryIt = (rule, c) => { const s = stateOf(row.replace(/C/g, c === 1 ? 'o' : 'x'), rule, c); const ev = O.play(s, P('H8')); return ev[0].type === 'illegal' ? 'illegal' : s.over ? 'win' : 'none'; };
  eq([tryIt('standard', 1), tryIt('standard', 2)], ['none', 'none'], '쌍삼 금지: 장목은 승리 아님 (둘 수는 있음)');
  eq([tryIt('renju', 1), tryIt('renju', 2)], ['illegal', 'win'], '렌주: 흑 장목 금수 · 백 장목 승리');
  eq([tryIt('free', 1), tryIt('free', 2)], ['win', 'win'], '자유: 장목도 승리');
}

// ════════════════════════════════════════════════════════════════
section('수 두기 · 무르기 · 기권 · 무승부 · 기보');
{
  const s = O.create(15, 'standard', 7);
  const h0 = O.hash(s);
  let ev = O.play(s, P('H8'));
  eq(ev.map(e => e.type), ['place'], '첫 수 = place');
  eq([s.turn, s.board[P('H8')], s.moves.length], [O.WHITE, O.BLACK, 1], '돌 · 차례 · 수 수');
  eq(O.play(s, P('H8'))[0].reason, 'occupied', '같은 칸 = occupied');
  eq(O.play(s, 999)[0].reason, 'range', '판 밖 = range');
  eq(O.play(s, 1.5)[0].reason, 'range', '정수 아님 = range');
  O.undo(s);
  eq(O.hash(s), h0, '무르면 처음과 같은 지문');
  // 가로 다섯
  for (const m of ['H8', 'H9', 'I8', 'I9', 'J8', 'J9', 'K8', 'K9']) O.play(s, P(m));
  ev = O.play(s, P('L8'));
  const win = ev.find(e => e.type === 'win');
  ok(win && win.color === O.BLACK && s.over && s.winner === O.BLACK && s.reason === 'five', '흑 다섯 승리');
  eq(s.winLines.map(l => l.map(i => O.coordName(i)).sort()), [['H8', 'I8', 'J8', 'K8', 'L8']], '이긴 줄 칸');
  eq(O.play(s, P('A1'))[0].reason, 'over', '끝난 뒤 = over');
  O.undo(s); ok(!s.over && s.turn === O.BLACK && s.winLines.length === 0, '이긴 수 무르기');
  // 대각선 다섯 (백)
  const d2 = O.create(15, 'free');
  for (const m of ['A1', 'D4', 'A3', 'E5', 'A5', 'F6', 'A7', 'G7']) O.play(d2, P(m));
  ok(!d2.over, '대각선 넷은 아직');
  O.play(d2, P('B9')); O.play(d2, P('H8'));
  ok(d2.over && d2.winner === O.WHITE, '백 ↗ 대각선 다섯');
  // 기권 · 기권 무르기
  const r = O.create(15, 'standard');
  O.play(r, P('H8'));
  ev = O.step(r, O.RESIGN);
  ok(r.over && r.winner === O.BLACK && r.reason === 'resign' && ev[0].type === 'resign', '백 기권 → 흑 승');
  O.undo(r); ok(!r.over && r.turn === O.WHITE && r.moves.length === 1, '기권 무르기');
  // 상대 차례에 기권 (AI 가 생각 중일 때 사람이 기권) → 기보로 되살려도 같은 승자
  const r2 = O.create(15, 'standard'); O.play(r2, P('H8'));
  O.resign(r2, O.BLACK);
  ok(r2.over && r2.winner === O.WHITE && r2.turn === O.WHITE, '흑이 백 차례에 기권 → 백 승');
  const back2 = O.fromRecord(O.encode(r2));
  ok(back2 && back2.winner === O.WHITE && back2.reason === 'resign', '차례 아닌 기권도 기보 왕복 (' + O.encode(r2) + ')');
  eq([O.reward(r2, O.WHITE), O.reward(r2, O.BLACK)], [1, -1], '보상 (이김 1 · 짐 -1)');
  // 무승부: 4×4 판은 다섯이 안 나오므로 가득 차면 무승부
  const t = O.create(4, 'free');
  let last = null;
  for (let i = 0; i < 16; i++) last = O.play(t, i);
  ok(t.over && t.winner === O.EMPTY && t.reason === 'draw' && last.some(e => e.type === 'draw'), '판이 차면 무승부');
  // 위협 신호 (소리·효과용)
  const th = O.create(15, 'standard');
  for (const m of ['H8', 'A1', 'I8', 'A3']) O.play(th, P(m));
  ev = O.play(th, P('J8'));
  ok(ev.some(e => e.type === 'threat' && e.kind === 'three'), '열린 삼 신호');
  O.play(th, P('A5'));
  ev = O.play(th, P('K8'));
  ok(ev.some(e => e.type === 'threat' && e.kind === 'open4'), '열린 사 신호');
}
{
  // 기보: 쓰고 읽기 · 규칙 검사 · 틀린 기보
  const s = O.create(15, 'renju');
  for (const m of ['H8', 'H9', 'I8', 'I9', 'J8', 'J9', 'K8', 'K9', 'L8']) O.play(s, P(m));
  const rec = O.encode(s);
  ok(/^R15:[a-o]+=B5$/.test(rec), '기보 모양 ' + rec);
  const back = O.fromRecord(rec);
  ok(back && O.hash(back) === O.hash(Object.assign(O.clone(s), { rng: back.rng })), '기보 → 같은 판');
  eq(O.decode(rec).moves.length, 9, '기보 수 수');
  ok(O.fromRecord('S15:hhhh') === null, '같은 칸 두 번 = 틀린 기보');
  ok(O.decode('X15:hh') === null && O.decode('S15:h') === null, '모양이 틀린 기보');
  const res = O.create(15, 'standard'); O.play(res, P('H8')); O.step(res, O.RESIGN);
  ok(O.encode(res).endsWith('=Br') && O.fromRecord(O.encode(res)).reason === 'resign', '기권 기보');
  // JSON 으로 저장했다 되살려도 같음
  const j = JSON.parse(JSON.stringify(O.toJSON(s)));
  eq(O.hash(O.fromJSON(j)), O.hash(s), 'JSON 왕복');
  eq(O.coordName(P('H8')), 'H8', '좌표 이름');
}

// ════════════════════════════════════════════════════════════════
section('학습 입력 · 대칭 · 행동표');
{
  const s = O.create(15, 'standard');
  for (const m of ['H8', 'I9', 'J10']) O.play(s, P(m));
  const pl = O.planes(s), NN = 225;
  eq(pl.length, 4 * NN, 'planes 4장');
  ok(pl[P('I9')] === 1 && pl[NN + P('H8')] === 1 && pl[NN + P('J10')] === 1, '0장 = 둘 차례(백) 돌 · 1장 = 상대 돌');
  ok(pl[2 * NN] === 0 && pl[3 * NN + P('J10')] === 1, '2장 = 흑 차례면 1 (지금 백 차례라 0) · 3장 = 마지막 수');
  let okInv = true, okBij = true;
  for (let k = 0; k < 8; k++) {
    const seen = new Set();
    for (let i = 0; i < NN; i++) { const j = O.symIdx(i, k); seen.add(j); if (O.symIdx(j, O.symInv(k)) !== i) okInv = false; }
    if (seen.size !== NN) okBij = false;
  }
  ok(okInv && okBij, '대칭 8가지: 일대일 · 역변환');
  // 대칭 변환한 판의 planes = planes 를 변환한 것
  let okPl = true;
  for (let k = 0; k < 8; k++) {
    const t = O.create(15, 'standard');
    for (const m of s.moves) O.play(t, O.symIdx(m, k));
    const a = O.symArray(pl, k), b = O.planes(t);
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { okPl = false; break; }
  }
  ok(okPl, '대칭: planes 와 판이 같이 돎');
  eq(O.ACTIONS(s), 225, '행동 수 = 225 (칸 번호)');
  const lm = O.legalMask(s);
  ok(lm.length === NN && !lm[P('H8')] && lm[P('A1')], '둘 수 있는 칸 표');
}

// ════════════════════════════════════════════════════════════════
section('결정성');
{
  const run = seed => {
    const s = O.create(15, 'renju', seed);
    while (!s.over && s.moves.length < 120) {
      const legal = O.legalMoves(s);
      const near = legal.filter(i => { const x = i % 15, y = (i - x) / 15; for (const m of s.moves) { const mx = m % 15, my = (m - mx) / 15; if (Math.abs(mx - x) <= 2 && Math.abs(my - y) <= 2) return true; } return !s.moves.length; });
      const pool = near.length ? near : legal;
      O.play(s, pool[Math.floor(O.rand(s) * pool.length)]);
    }
    return { h: O.hash(s), rec: O.encode(s) };
  };
  const a = run(42), b = run(42), c = run(43);
  eq(a.h, b.h, '같은 씨앗 → 같은 지문');
  ok(a.rec === b.rec, '같은 씨앗 → 같은 기보');
  ok(a.h !== c.h, '다른 씨앗 → 다른 판');
  const r1 = O.create(15, 'free', 9), r2 = O.create(15, 'free', 9);
  ok([0, 1, 2, 3].every(() => O.rand(r1) === O.rand(r2)), '상태 안 난수 (mulberry32)');
}

// ════════════════════════════════════════════════════════════════
section('AI 수 읽기');
const QUINTET_CASES = path.join(__dirname, 'cases');
function parseCase(file) {
  const txt = fs.readFileSync(file, 'utf8'); const meta = {}; const rows = []; let inB = false;
  for (const l of txt.split(/\r?\n/)) { if (inB) { if (l.trim()) rows.push(l.trim()); continue; } if (l.startsWith('board:')) { inB = true; continue; } const m = /^(\w+):\s*(.*)$/.exec(l); if (m) meta[m[1]] = m[2]; }
  return { meta, s: stateOf(rows.join('\n'), 'renju', meta.attacker === 'o' ? O.BLACK : O.WHITE) };
}
// 수순 검사: 공격 수마다 사(또는 그 이상) → 수비는 막는 자리 하나 → 끝은 다섯 · 못 막는 사(열린 사·사사) · 막을 자리가 수비 금수
function attackerWins(s, att) {                                        // 수비 차례에서 공격이 이미 이긴 모양인가
  const pts = [];
  for (let q = 0; q < 225; q++) if (!s.board[q]) { s.board[q] = att; if (O.winLines(s.board, 15, q, att, s.rule)) pts.push(q); s.board[q] = 0; }
  if (pts.length >= 2) return true;
  if (pts.length === 1) { const m = O.legalMask(s); return !m[pts[0]]; }
  return false;
}
function checkVcfLine(s0, line) {
  const s = O.clone(s0), att = s.turn;
  for (let i = 0; i < line.length; i++) {
    if (s.turn !== att && attackerWins(s, att)) return 'ok';
    const ev = O.play(s, line[i]);
    if (ev[0].type === 'illegal') return 'illegal ' + i;
    if (s.over) return s.winner === att ? 'ok' : 'lost';
    if (s.turn === 3 - att) {                                          // 방금 공격 수: 사여야 함
      const th = ev.find(e => e.type === 'threat');
      if (!th || (th.kind !== 'four' && th.kind !== 'open4')) return 'not four ' + i;
    }
  }
  return s.turn !== att && attackerWins(s, att) ? 'ok' : 'unfinished';
}
const vctToVerify = [];
{
  const tiers = ['easy', 'normal', 'hard'];
  // 한 수 승리
  const w1 = stateOf(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . x x x . . . . . . .
    . . . . o o o o . . . . . . .
    . . . . . . . x . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`, 'standard', O.BLACK);
  w1.moves = [P('E8'), P('F9'), P('F8'), P('G9'), P('G8'), P('H9'), P('H8'), P('H7')];
  for (const t of tiers) { const r = AI.think(w1, { tier: t, seed: 1 }); ok(['D8', 'I8'].includes(O.coordName(r.move)), `${t}: 한 수 승리 (${O.coordName(r.move)})`); }
  // 사 막기 (모든 난이도)
  const b4 = O.clone(w1); b4.turn = O.WHITE; b4.board[P('H7')] = 0; b4.moves = b4.moves.slice(0, 7);
  for (const t of tiers) for (let sd = 1; sd <= 3; sd++) { const r = AI.think(b4, { tier: t, seed: sd }); ok(['D8', 'I8'].includes(O.coordName(r.move)), `${t}: 사 막기 #${sd} (${O.coordName(r.move)})`); }
  // 열린 삼 막기 (중급·고급): 흑 F8-G8-H8, 양쪽 열림
  const o3 = stateOf(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . x . x . . . . . .
    . . . . . o o o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`, 'standard', O.WHITE);
  o3.moves = [P('G8'), P('G9'), P('F8'), P('I9'), P('H8')];
  for (const t of ['normal', 'hard']) { const r = AI.think(o3, { tier: t, seed: 3 }); ok(['E8', 'I8', 'D8', 'J8'].includes(O.coordName(r.move)), `${t}: 열린 삼 막기 (${O.coordName(r.move)})`); }
  // 금수 이용 (렌주, 백): 백 I9 로 사를 두면 흑이 막을 H8 이 삼삼 금수 → 백 승
  const fu = stateOf(`
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . o . .
    . . . . . . . . . . . x . . .
    . . . . . . . . . . x . . . .
    . . . . . . . . . x . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . o . o . . . . . .
    . . . . . . . o . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .`, 'renju', O.WHITE);
  ok(O.forbiddenAt(fu.board, 15, P('H8'), 1, 'renju') === 1, '금수 이용 판: H8 은 흑 삼삼');
  const pvF = AI._dbg.vcf(fu, O.WHITE, 10, 100000);
  ok(pvF && O.coordName(pvF[0]) === 'I9' && checkVcfLine(fu, pvF) === 'ok', '백 VCF: I9 (흑이 막을 H8 이 금수)', pvF && pvF.map(q => O.coordName(q)).join(','));
  const rF = AI.think(fu, { tier: 'hard', seed: 1 });
  eq(O.coordName(rF.move), 'I9', '고급 백: 금수 자리로 몰아 이김');
  // 쌍삼 금지에서도 같은 판이면 백 승 (흑 H8 이 삼삼)
  const fu2 = O.clone(fu); fu2.rule = 'standard';
  const pvS = AI._dbg.vcf(fu2, O.WHITE, 10, 100000);
  ok(pvS && O.coordName(pvS[0]) === 'I9', '쌍삼 금지: 백도 흑의 삼삼 자리로 몰아 이김');
}
{
  // quintet 벤치 판 (renjuportal.com 문제 포함): VCF 는 고급이 풀고, 수순을 코어로 검사
  const vcfCases = ['vcf_black', 'vcf_counter', 'vcf_white'];
  for (const name of vcfCases) {
    const { meta, s } = parseCase(path.join(QUINTET_CASES, name + '.txt'));
    const pv = AI._dbg.vcf(s, s.turn, +meta.limit, 500000);
    ok(pv && checkVcfLine(s, pv) === 'ok', `VCF ${name}: 찾고 수순 검사`, pv ? checkVcfLine(s, pv) : 'none');
    const r = AI.think(s, { tier: 'hard', seed: 1 });
    ok(pv && (r.move === pv[0] || r.kind === 'vcf'), `VCF ${name}: 고급이 첫 수 ${O.coordName(r.move)} (${r.kind})`);
  }
  for (const name of ['vcf_black_short', 'vcf_white_short']) {
    const { meta, s } = parseCase(path.join(QUINTET_CASES, name + '.txt'));
    ok(!AI._dbg.vcf(s, s.turn, +meta.limit, 500000), `VCF ${name}: 한 수 모자라면 없음`);
  }
  // VCT: 고급이 찾는 첫 수 (quintet 이 있으면 모든 응수를 quintet 으로 다시 확인)
  for (const name of ['vct_black', 'vct_counter', 'vct_dual_forbiddens', 'vct_forbidden_breaker']) {
    const { s } = parseCase(path.join(QUINTET_CASES, name + '.txt'));
    const r = AI._dbg.vct(s, s.turn, 7, 300000);
    ok(!!r, `VCT ${name}: 찾음 ${r ? O.coordName(r.move) + ' (' + r.depth + '수)' : ''}`);
    if (r) vctToVerify.push({ name, s, move: r.move });
  }
  ok(!AI._dbg.vct(parseCase(path.join(QUINTET_CASES, 'vct_black_short.txt')).s, O.BLACK, 3, 300000), 'VCT vct_black_short: 3수 안엔 없음');
}

// ════════════════════════════════════════════════════════════════
section('quintet 로 맞춰 보기 (렌주 VCF · VCT)');
let Q = null;
try {
  const wasm = path.join(__dirname, 'vendor', 'quintet', 'quintet_bg.wasm');
  if (fs.existsSync(wasm)) Q = require('./vendor/quintet/quintet.js').create(fs.readFileSync(wasm));
} catch (e) { console.log('  (quintet 을 못 불러옴: ' + e.message + ')'); }
if (!Q) console.log('  (quintet wasm 이 없어 건너뜀)');
else {
  const qcode = i => { const x = i % 15, y = (i - x) / 15; return x * 15 + (14 - y); };
  const stones = b => { const bl = [], wh = []; for (let i = 0; i < 225; i++) { if (b[i] === 1) bl.push(qcode(i)); else if (b[i] === 2) wh.push(qcode(i)); } return [bl, wh]; };
  const qsolve = (b, att, mode, limit) => { const [bl, wh] = stones(b); return Q.solve(mode, limit, bl, wh, att === 1, 2); };
  // 1) 고급이 찾은 VCT 첫 수: 수비의 모든 응수 뒤에도 quintet 이 공격 VCT 를 찾아야 함
  for (const { name, s, move } of vctToVerify) {
    const A = s.turn, D = 3 - A, b = s.board.slice();
    b[move] = A;
    let refute = -1;
    for (let q = 0; q < 225 && refute < 0; q++) {
      if (b[q] || (D === 1 && O.forbiddenAt(b, 15, q, 1, 'renju'))) continue;
      b[q] = D;
      const dWin = O.winLines(b, 15, q, D, 'renju');
      if (dWin || !qsolve(b, A, 16, 12)) refute = q;
      b[q] = 0;
    }
    ok(refute < 0, `VCT ${name}: ${O.coordName(move)} 뒤 모든 응수가 짐 (quintet)`, refute >= 0 ? '반박 ' + O.coordName(refute) : '');
  }
  // 2) 무작위 렌주 국면: VCF 가 있나 없나가 서로 같아야 함 (흑 공격엔 금수 판정이, 백 공격엔 금수 이용이 걸림)
  let same = 0, diff = 0, checked = 0, lineOk = 0, lines = 0;
  const diffs = [];
  const games = QUICK ? 14 : 40;
  for (let g = 0; g < games; g++) {
    const s = O.create(15, 'renju', 100 + g);
    while (!s.over && s.moves.length < 70) {
      const r = AI.think(s, { tier: s.moves.length % 3 ? 'easy' : 'normal', seed: g * 977 + s.moves.length, maxNodes: 4000 });
      O.play(s, r.move);
      if (s.over || s.moves.length < 12 || s.moves.length % 3) continue;
      for (const att of [1, 2]) {
        // 공정하게: 공격 쪽 차례로 보고, 수비에게 이미 다섯 자리가 있으면 건너뜀
        const t = O.clone(s); t.turn = att;
        const q = qsolve(t.board, att, 0, 14);
        const ours = AI._dbg.vcf(t, att, 14, 300000);
        checked++;
        if (!!q === !!ours) same++; else { diff++; if (diffs.length < 3) diffs.push(`${O.encode(s)} att=${att} quintet=${q ? q.length : 0} ours=${ours ? ours.length : 0}`); }
        if (ours) { lines++; if (checkVcfLine(t, ours) === 'ok') lineOk++; }
      }
    }
  }
  console.log(`  무작위 국면 ${checked}개 · 같음 ${same} · 다름 ${diff} · 우리 수순 검사 ${lineOk}/${lines}`);
  ok(diff === 0, 'VCF 있음/없음이 quintet 과 모두 같음', diffs.join(' | '));
  ok(lineOk === lines, '우리 VCF 수순이 모두 규칙대로');
}

// ════════════════════════════════════════════════════════════════
section('친구랑 자리 (구경 · 상담 2:2)');
{
  const S = require('../seats.js');
  // 방장 h, 그다음 들어온 순서 b(10) → c(20) → d(30) → e(40) — 객체 순서는 일부러 뒤섞음
  const pl = { e: { t: 40 }, c: { t: 20 }, h: { t: 99 }, d: { t: 30 }, b: { t: 10 } };
  eq(S.order(pl, 'h'), ['h', 'b', 'c', 'd', 'e'], '들어온 순서: 방장 먼저, 그다음 t 순');
  const one = S.seat(pl, 'h', 1, false);
  eq([one[1], one[2], one.view], [['h'], ['b'], ['c', 'd', 'e']], '1:1 — 방장 흑 · 첫 손님 백 · 나머지 구경');
  const oneW = S.seat(pl, 'h', 2, false);
  eq([oneW[1], oneW[2]], [['b'], ['h']], '방장이 백을 고르면 첫 손님이 흑');
  // 구경꾼은 둘 수 없음 · 차례인 사람만
  const s = O.create(15, 'free', 1);
  ok(S.canMove(one, 'h', s) && !S.canMove(one, 'b', s), '흑 차례엔 방장만 둠');
  ok(!S.canMove(one, 'c', s) && !S.canMove(one, 'e', s), '구경꾼은 흑 차례에 못 둠');
  O.play(s, 112);
  ok(S.canMove(one, 'b', s) && !S.canMove(one, 'h', s) && !S.canMove(one, 'd', s), '백 차례엔 첫 손님만 (구경꾼 못 둠)');
  eq([S.colorOf(one, 'h'), S.colorOf(one, 'b'), S.colorOf(one, 'c')], [1, 2, 0], '내 색: 구경은 0');
  // 상담: 방장 팀 [h, c] · 상대 [b, d], 같은 색끼리 번갈아 (흑 h c h c… · 백 b d b d…)
  const tm = S.seat(pl, 'h', 1, true);
  eq([tm[1], tm[2], tm.view], [['h', 'c'], ['b', 'd'], ['e']], '상담 — 1·3번째가 방장 팀, 2·4번째가 상대 팀, 5번째부터 구경');
  const s2 = O.create(15, 'free', 2), seq = [];
  const cells = [112, 113, 127, 128, 142, 143, 157, 158];
  for (const c of cells) { seq.push(S.mover(tm, s2.turn, s2.moves.length)); O.play(s2, c); }
  eq(seq, ['h', 'b', 'c', 'd', 'h', 'b', 'c', 'd'], '상담 차례: 흑 h → 백 b → 흑 c → 백 d → …');
  ok(!S.canMove(tm, 'e', s2), '상담에서도 구경꾼은 못 둠');
  // 나감: 1:1 에서 두던 사람이 나가면 그 색이 비고, 상담에서는 팀원이 남음
  eq(S.remove(one, 'b').empty, 2, '1:1 에서 백이 나가면 백이 빔 (판 끝)');
  const rt = S.remove(tm, 'c');
  eq([rt.empty, rt.seats[1]], [0, ['h']], '상담에서 팀원 하나가 나가면 남은 사람이 이어서');
  ok(S.mover(rt.seats, 1, 4) === 'h', '혼자 남은 팀원이 그 색을 계속 둠');
  // 다음 판: 색 바꾸기 · 나간 자리는 구경하던 사람이 순서대로
  const nx = S.reseat(one, pl, 'h', false);
  eq([nx[1], nx[2], nx.view], [['b'], ['h'], ['c', 'd', 'e']], '다음 판: 색을 바꿈');
  const pl2 = Object.assign({}, pl); delete pl2.b;
  const nx2 = S.reseat(one, pl2, 'h', false);
  eq([nx2[1], nx2[2], nx2.view], [['c'], ['h'], ['d', 'e']], '나간 자리는 첫 구경꾼(c)이 앉음');
  const nx3 = S.reseat(one, { h: { t: 1 } }, 'h', false);
  ok(!nx3[1].length && nx3[2].length === 1, '혼자 남으면 한쪽이 비어 있음 (대기실로)');
  const nt = S.reseat(S.seat({ h: { t: 1 }, b: { t: 2 }, c: { t: 3 } }, 'h', 1, true), pl, 'h', true);
  eq([nt[1].length, nt[2].length, nt.view], [2, 2, ['e']], '상담 2:1 판 뒤 새로 온 사람이 빈자리를 채움');
  // 한 판 더 (방장이 고름): 신청한 구경꾼만 빈자리에 · AI 가 대신 앉은 사람은 자리 유지 · 빈자리 수
  const k0 = S.next(one, pl, 'h', false, {});
  eq([k0[1], k0[2], k0.view], [['b'], ['h'], ['c', 'd', 'e']], '방장이 안 고르면 색만 바뀜 (구경꾼은 자동으로 안 앉음)');
  const k1 = S.next(one, pl2, 'h', false, {});
  eq([k1[1], k1[2], k1.view], [[], ['h'], ['c', 'd', 'e']], '나간 자리는 신청한 구경꾼이 없으면 비워 둠');
  const k2 = S.next(one, pl2, 'h', false, { pick: { d: true, c: true } });
  eq([k2[1], k2[2], k2.view], [['c'], ['h'], ['d', 'e']], '신청한 구경꾼 중 먼저 온 사람(c)이 앉음');
  const k3 = S.next(one, pl2, 'h', false, { sub: { b: true }, pick: { c: true } });
  eq([k3[1], k3[2]], [['b'], ['h']], 'AI 가 대신 앉은 사람 자리는 나가 있어도 그대로');
  const t4 = S.seat(pl, 'h', 1, true);                                      // 상담: 팀원 한 명이 빠진 판
  const tr = S.remove(t4, 'c').seats;
  eq(S.free(t4, pl, true, {}), 0, '상담 4명이 다 있으면 빈자리 0');
  eq(S.free(tr, pl, true, {}), 1, '상담에서 한 명을 빼면 빈자리 1');
  eq(S.free(one, pl2, false, {}), 1, '1:1 에서 한 명이 나가면 빈자리 1');
  const kt = S.next(tr, pl, 'h', true, { pick: { e: true } });
  eq([kt[1].length, kt[2].length, kt.view], [2, 2, ['c']], '상담에서 빠진 자리에 신청한 구경꾼이 앉아 다시 2:2 (빠졌던 c 는 구경으로)');
  // 대기실 설명
  eq([S.describe(2, false), S.describe(5, false), S.describe(4, true), S.describe(6, true)], ['2명이 대국해요', '2명 대국 · 3명 구경', '2:2 상담', '2:2 상담 · 2명 구경'], '대기실 설명 글');
}

// ════════════════════════════════════════════════════════════════
section('AI 선생님 까닭 (threatKind: 내 위협 · 상대 자리 막기)');
{
  // main.js coachReason 이 쓰는 판단: 그 자리에 내가 두면 / 상대가 두면 생기는 위협
  const b = new Array(225).fill(0), N = 15;
  [112, 113, 114].forEach(i => { b[i] = 1; });                      // 흑 가로 셋 (H8 I8 J8)
  b[115] = 1; eq(O.threatKind(b, N, 115, 1, 'free'), 'open4', '셋 옆에 두면 열린 사'); b[115] = 0;
  b[111] = 2;                                                       // 한쪽을 백이 막음
  b[115] = 1; eq(O.threatKind(b, N, 115, 1, 'free'), 'four', '한쪽이 막힌 넷은 사'); b[115] = 0;
  b[111] = 0;
  const c = new Array(225).fill(0); [112, 113].forEach(i => { c[i] = 2; });   // 백 가로 둘
  c[114] = 2; eq(O.threatKind(c, N, 114, 2, 'free'), 'three', '상대가 두면 열린 삼 → 막을 자리'); c[114] = 0;
  c[200] = 1; eq(O.threatKind(c, N, 200, 1, 'free'), null, '떨어진 자리는 위협 없음');
}

// ════════════════════════════════════════════════════════════════
section('AI 선생님: 상대 수 읽기 · 노림과 견준 까닭 · 흐름 (review.js — main.js 의 oppRead · coachReason 이 그대로 씀)');
{
  const RV = require('../review.js');
  const nm = i => 'ABCDEFGHIJKLMNO'[i % 15] + (15 - Math.floor(i / 15));
  const seq = (rule, list) => { const s = O.create(15, rule); for (const m of list) { if (O.play(s, P(m))[0].type === 'illegal') throw new Error('illegal ' + m); } return s; };
  // main.js oppRead 와 같은 순서: 방금 수 전 상태 · 내가 손 뺐다고 보고 상대가 한 번 더 둘 곳(AI) → 한 줄 + 위협
  const read = (s, who) => {
    const last = s.moves[s.moves.length - 1], o = s.board[last], prev = O.clone(s); O.undo(prev);
    const sn = O.clone(s); sn.turn = o;
    const r = AI.think(sn, { tier: 'hard', hint: true, timeMs: 500, seed: s.moves.length * 104729 + 7 });
    const w = RV.aimWhy(prev, last, r.move, r.kind, () => '@T@', who || true);
    if (w.thr) w.thr.tn = nm(w.thr.t);
    return { w, t: r.move, kind: r.kind, last, prev };
  };

  // 1) 백이 열린 삼(H10 I10 J10)을 만든 장면 — 흑 차례
  const s1 = seq('free', ['H8', 'H10', 'I9', 'I10', 'K7', 'J10']);
  const a1 = read(s1);
  ok(/열린 삼을 만들었어요/.test(a1.w.done), '상대가 열린 삼을 만들었다고 읽음', a1.w.done);
  ok(a1.w.thr && a1.w.thr.rank >= 3 && /열린 사\(4\)/.test(a1.w.thr.lab) && [P('G10'), P('K10')].includes(a1.w.thr.t), '다음 노림 = 열린 사(4) 자리 (양 끝 중 하나)', JSON.stringify(a1.w.thr));
  ok(/^다음 노림 @T@ → 열린 사\(4\)$/.test(a1.w.next) && a1.w.sharp, '노림 문구 · 판에 ! 찍을 만함', a1.w.next);
  const thr1 = a1.w.thr;
  ok(/상대 노림\((G10|K10) 열린 사\(4\)\)을 막는 자리예요/.test(RV.advise(s1, P('G10'), 'search', thr1, '기본')), '노림 끝을 막는 추천 → 막는 자리예요');
  ok(/막는 자리예요/.test(RV.advise(s1, P('K10'), 'search', thr1, '기본')), '반대쪽 끝도 막는 자리');
  ok(!/막는 자리예요/.test(RV.advise(s1, P('A1'), 'search', thr1, '기본')) && /잊지 마세요/.test(RV.advise(s1, P('A1'), 'search', thr1, '기본')), '엉뚱한 자리면 막는다고 하지 않고 노림을 잊지 말라고만');
  ok(/^기본 — 내 사\(4\) 연속이 먼저라 상대 노림\(.*\)은 막지 않아도 돼요$/.test(RV.advise(s1, P('A1'), 'vcf', thr1, '기본')), '내 사(4) 연속(vcf)이 먼저면 막지 않아도 된다고 까닭을 말함');
  ok(/내 열린 사\(4\)가 먼저라/.test(RV.advise(s1, P('A1'), 'open4', thr1, '기본')) && /내 공격이 더 빨라서/.test(RV.advise(s1, P('A1'), 'vct', thr1, '기본')), '열린 사(4) · vct 도 같은 식');
  ok(/^상대의 사\(4\) 연속 공격을 미리 끊는 자리예요 · 상대 노림\(.*\)도 잊지 마세요$/.test(RV.advise(s1, P('A1'), 'defend-vcf', thr1, '기본')), '연속 사를 끊는 추천은 노림 자리를 막는다고 하지 않고 잊지 말라고 덧붙임');
  eq(RV.advise(s1, P('A1'), 'win', thr1, '기본'), '기본', '바로 이기는 수는 그대로');
  eq(RV.advise(s1, P('G10'), 'search', null, '기본'), '기본', '노림이 없으면 기본 까닭 그대로');
  eq(RV.advise(s1, P('A1'), 'vcf', Object.assign({}, thr1, { rank: 1 }), '기본'), '기본', '상대 노림이 약하면(열린 삼 정도) 막지 않아도 된다는 말은 안 붙임');
  // AI 추천이 실제로 이 노림을 막는 수로 나오고, 문구가 그걸 알아봄
  const rec1 = AI.think(s1, { tier: 'hard', hint: true, timeMs: 700, seed: 3 });
  const why1 = RV.advise(s1, rec1.move, rec1.kind, thr1, '기본');
  ok(/막는 자리예요|미리 끊는 자리예요/.test(why1), 'AI 추천(' + nm(rec1.move) + ' ' + rec1.kind + ')이 막는 자리로 설명됨', why1);
  // 둘이서 판: '내' 대신 지금 둘 색 이름으로
  const a1t = read(s1, '흑의');
  ok(/흑의 열린 삼이 될 자리를/.test(a1t.w.done) && !/내 /.test(a1t.w.done + a1t.w.next), '둘이서 판은 흑·백으로 말함', a1t.w.done);

  // 2) 백이 사(4)를 만든 장면 (G10 이 막혀 있어 K10 → 사) — 꼭 막아야 함
  const s2 = seq('free', ['G10', 'H10', 'A1', 'I10', 'A3', 'J10', 'A5', 'K10']);
  const a2 = read(s2);
  ok(/사\(4\)를 만들었어요 — 꼭 막아야 해요/.test(a2.w.done), '사(4)를 만든 상대 수를 읽음', a2.w.done);
  ok(a2.w.thr && a2.w.thr.rank === 5 && a2.w.thr.t === P('L10') && a2.w.thr.lab === '오목', '다음 노림 = 오목 자리 L10', JSON.stringify(a2.w.thr));
  const rec2 = AI.think(s2, { tier: 'hard', hint: true, timeMs: 300, seed: 3 });
  eq([rec2.move, rec2.kind], [P('L10'), 'block'], '추천은 L10 막기(block)');
  eq(RV.advise(s2, rec2.move, rec2.kind, a2.w.thr, '기본'), '상대 노림(L10 오목)을 꼭 막아야 해요', '꼭 막아야 하는 노림 문구');

  // 3) 내 사(4)가 상대의 약한 노림(열린 삼 만들기)보다 먼저
  const s3 = seq('free', ['C5', 'C4', 'C6', 'H10', 'C7', 'I10', 'H3', 'A15']);   // 흑 C5 C6 C7 (C4 는 백이 막음) · 백 H10 I10 두 개
  const thr3 = { t: P('J10'), atk: 'three', kind: '', lab: '열린 삼', short: '열린 삼', rank: 1, tn: 'J10' };
  ok(RV.fx(s3, P('C8')).atk === 'four', '시험 판: C8 은 사(4)');
  eq(RV.advise(s3, P('C8'), 'search', thr3, '사(4)를 만들어 상대가 막게 해요'), '사(4)를 만들어 상대가 막게 해요 — 내 사(4)가 먼저라 상대 노림(J10 열린 삼)은 바로 막지 않아도 돼요', '내 사(4)가 먼저라 바로 막지 않아도 돼요');

  // 4) 복기(opp 없이)는 예전 말투 그대로 · 첫 돌에는 다음 노림을 말하지 않음
  const rv = RV.aimWhy(a1.prev, a1.last, a1.t, a1.kind, () => '@T@');
  ok(/^상대 열린 삼 자리를 막으면서 열린 삼을 만들었어요$/.test(rv.done) && /^다음 @T@ 열린 사\(4\)$/.test(rv.next) && rv.thr === null, '복기 말투는 그대로 (thr 없음)', rv.text);
  eq(RV.aimWhy(O.create(15, 'free'), P('H8'), P('H7'), 'search', () => '@T@', true).next, '', '첫 돌에는 다음 노림을 말하지 않음');

  // 5) 📊 흐름
  const f1 = RV.flow(s1);
  ok(/^📊 흐름: 상대 쪽이 앞서요 — 막기 어려운 결정타 자리가 상대 2곳 · 내 0곳$/.test(f1), '상대 열린 삼 → 상대 쪽이 앞서요 (결정타 자리 2곳)', f1);
  ok(/^📊 흐름: 백 쪽이 앞서요 — 막기 어려운 결정타 자리가 백 2곳 · 흑 0곳$/.test(RV.flow(s1, { me: '흑', op: '백' })), '둘이서 판은 흑·백 이름으로 말함');
  ok(RV.flow(seq('free', ['H8', 'H9'])) === '', '수가 적은 초반엔 흐름을 말하지 않음');
  ok(RV.flow(seq('free', ['A1', 'O15', 'A15', 'O1', 'H1', 'H15'])) === '', '아무 일 없는 판은 흐름을 말하지 않음');
  const pw = RV.power(s1, 2);
  ok(pw.strong === 2 && pw.five === 0, '백 열린 삼 → 결정타 자리 2곳 (G10 · K10)', JSON.stringify(pw));
  const t0 = Date.now(); for (let i = 0; i < 20; i++) RV.flow(s1);
  ok(Date.now() - t0 < 400, '흐름 계산은 빠름 (20번 ' + (Date.now() - t0) + 'ms)');
}

// ════════════════════════════════════════════════════════════════
section('AI 끼리 대국 (worker_threads 로 여러 판 동시에)');
// 판 하나를 일꾼 스레드에서: 노드 예산으로만 세기를 정하고 시간 상한은 넉넉히 → 같은 씨앗이면 같은 판 (결정적)
function runGames(jobs) {
  const { Worker } = require('worker_threads');
  const par = Math.max(1, Math.min(6, require('os').cpus().length - 1));
  const out = new Array(jobs.length);
  let next = 0;
  return new Promise(done => {
    let live = 0;
    const pump = () => {
      if (next >= jobs.length && !live) return done(out);
      while (live < par && next < jobs.length) {
        const i = next++, w = new Worker(__filename, { workerData: jobs[i] });
        live++;
        w.once('message', r => { out[i] = r; });
        w.once('error', e => { out[i] = { error: String(e) }; });
        w.once('exit', () => { live--; pump(); });
      }
    };
    pump();
  });
}
function summarize(list, aName) {
  let aw = 0, bw = 0, dr = 0, maxMs = 0, illegal = 0, plies = 0, aWhiteW = 0;
  for (const r of list) {
    if (!r || r.error) { illegal++; continue; }
    maxMs = Math.max(maxMs, r.maxMs); plies += r.plies; if (r.illegal) illegal++;
    if (!r.winner) dr++; else if ((r.winner === O.BLACK) === r.aBlack) { aw++; if (!r.aBlack) aWhiteW++; } else bw++;
  }
  return { aw, bw, dr, maxMs, illegal, aWhiteW, avgPlies: Math.round(plies / Math.max(1, list.length)) };
}
const pairs = (ta, tb, rule, n, seed0) => Array.from({ length: n }, (_, g) => ({ ta, tb, rule, aBlack: g % 2 === 0, seed: seed0 * 100 + (g >> 1) }));
(async () => {
  const nStd = QUICK ? 4 : 8, nVar = QUICK ? 2 : 4;
  const nPx = QUICK ? 8 : 16;
  const jobs = [...pairs('hard', 'normal', 'standard', nStd, 1), ...pairs('normal', 'easy', 'standard', QUICK ? 4 : 6, 2),
    ...pairs('hard', 'normal', 'renju', nVar, 3), ...pairs('hard', 'normal', 'free', nVar, 4),
    ...pairs('P1', 'easy', 'standard', nPx, 5), ...pairs('P2', 'normal', 'standard', nPx, 6), ...pairs('P2', 'hard', 'standard', QUICK ? 2 : 4, 7)];
  const t0 = Date.now(), res = await runGames(jobs);
  const pick = (ta, tb, rule) => res.filter((r, i) => jobs[i].ta === ta && jobs[i].tb === tb && jobs[i].rule === rule);
  const line = (nm, rule, r) => console.log(`  ${nm} (${O.RULES[rule].name}, ${r.aw + r.bw + r.dr}판): ${r.aw}승 ${r.bw}패 ${r.dr}무 · 백으로 ${r.aWhiteW}승 · 평균 ${r.avgPlies}수 · 한 수 최대 ${r.maxMs}ms`);
  const hn = summarize(pick('hard', 'normal', 'standard')), ne = summarize(pick('normal', 'easy', 'standard'));
  const hr = summarize(pick('hard', 'normal', 'renju')), hf = summarize(pick('hard', 'normal', 'free'));
  line('고급 vs 중급', 'standard', hn); line('중급 vs 초급', 'standard', ne); line('고급 vs 중급', 'renju', hr); line('고급 vs 중급', 'free', hf);
  const p1e = summarize(pick('P1', 'easy', 'standard')), p2n = summarize(pick('P2', 'normal', 'standard')), p2h = summarize(pick('P2', 'hard', 'standard'));
  line('사람 흉내 P1 vs 초급', 'standard', p1e); line('사람 흉내 P2 vs 중급', 'standard', p2n); line('사람 흉내 P2 vs 고급', 'standard', p2h);
  console.log(`  (${jobs.length}판 · ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  ok(hn.illegal + ne.illegal + hr.illegal + hf.illegal + p1e.illegal + p2n.illegal + p2h.illegal === 0, '모든 대국에서 반칙·오류 없음');
  // 난이도 간격: 꼼꼼한 초보는 🐣 을 대개 이기고, 🐱 은 이길 만하지만 쉽지 않고, 🐯 은 거의 못 이김
  ok(p1e.aw > p1e.bw * 2, '초급: 꼼꼼한 초보(P1)가 대개 이김', `${p1e.aw}:${p1e.bw}`);
  ok(p2n.aw >= Math.max(2, nPx / 8) && p2n.bw > p2n.aw, '중급: P2 가 이길 만하지만 중급이 더 많이 이김', `${p2n.aw}:${p2n.bw}`);
  ok(p2h.aw === 0, '고급: P2 가 못 이김', `${p2h.aw}:${p2h.bw}`);
  if (!QUICK) ok(hn.aw > hn.bw, '쌍삼 금지: 고급이 중급보다 많이 이김');   // 흑이 아주 유리한 규칙이라 판 수가 적으면(quick) 색 운이 큼
  ok(hn.aw + hr.aw + hf.aw > hn.bw + hr.bw + hf.bw, '세 규칙 합계: 고급이 중급보다 많이 이김');
  ok(ne.aw > ne.bw && ne.aw >= ne.bw + 2, '중급이 초급보다 확실히 많이 이김');

  // ════════════════════════════════════════════════════════════════
  console.log(`\n${fail ? '✗' : '✓'} 통과 ${pass} · 실패 ${fail} · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
  if (fail) { console.log(fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
})();

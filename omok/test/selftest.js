/* 오목 자체 시험 — node game/omok/test/selftest.js
   1) 규칙: 금수(렌주 · 쌍삼 금지 · 자유) · 승리 · 무르기 · 기권 · 무승부 · 기보 · 대칭 · 학습 입력
      렌주 금수 판들은 quintet(MIT, Renju Note)의 시험(src/board/forbidden.rs)에서 그대로 옮김
   2) 결정성: 같은 씨앗 · 같은 수 → 같은 상태 지문
   3) AI: 한 수 승리 · 사 막기 · 열린 삼 막기 · VCF/VCT 문제(quintet 벤치 판, renjuportal.com 문제) · 금수 이용
   4) quintet wasm 이 있으면: 무작위 렌주 국면에서 VCF 결과를 서로 맞춰 봄 (금수 판정까지 함께 검사됨)
   5) AI 끼리 대국: 난이도 순서(고급 > 중급 > 초급) · 규칙마다 반칙 없음 · 한 수 시간
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

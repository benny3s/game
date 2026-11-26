// 기억의 미로 규칙 시험 (node survival/test/gn-memmaze_selftest.js [--quick])
//  · 판 · 칸 사이 번호 · 미로 만들기 (벽 32 · 이어짐 · 최단 거리 같음 · 너무 막힌 판 뺌) · 3칸 이동 · 실패 → 출발점 · 되돌아가기 · 더블찬스 · 도착 · 상한
//  · 방송 9화 이동 기록 49턴 재현 (9화 기록 판) · 숨은 정보 (벽은 끝까지 아무도 못 봄 · 구경꾼도) · AI 는 기록만 봄 · 기억 모형 · 💡 = 고급 AI · 3단계 · 속도 · 복기 약속 · 화면 글
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../games/gn-memmaze/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const at = C.at, nm = n => C.at('ABCDEFG'.indexOf(n[0]), +n.slice(1) - 1);
const wallsOf = st => st.wall.map((v, e) => (v ? e : -1)).filter(e => e >= 0);
function playAI(seed, tiers, cfg, cb) {
  const st = C.init({ n: 2, seed, cfg: cfg || {} }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 400) {
    const s = C.needs(st)[0], V = C.view(st, s);
    if (cb) cb(st, s, V);
    const a = C.ai(V, s, tiers[s], r), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
  }
  return st;
}
// 빈 판(벽 없음)에 벽만 골라 넣은 장면
function scene(walls, { turn = 0, pos } = {}) {
  const st = C.init({ n: 2, seed: 5, cfg: {} });
  st.wall.fill(0); for (const e of walls) st.wall[e] = 1;
  st.turn = turn; if (pos) st.pos = pos.slice();
  return st;
}

// ── 1. 판 · 칸 사이 번호 ──
{
  ok(C.NE === 84 && C.NC === 49 && C.ENDS.length === 84, '칸 49 · 칸 사이 84');
  let bad = 0; C.ENDS.forEach(([a, b], e) => { if (C.eid(a, b) !== e || C.eid(b, a) !== e) bad++; });
  ok(!bad, '칸 사이 번호 앞뒤 같음');
  ok(C.eid(at(0, 0), at(1, 1)) < 0 && C.eid(at(6, 0), at(0, 1)) < 0 && C.eid(at(0, 0), at(2, 0)) < 0, '대각선 · 줄 넘김 · 두 칸은 이웃 아님');
  ok(C.cellName(C.S[0]) === 'A1' && C.cellName(C.S[1]) === 'G1' && C.cellName(C.G[0]) === 'G7' && C.cellName(C.G[1]) === 'A7', '출발 A1 · G1 → 도착 G7 · A7 (대각선 반대)');
  ok(C.NB.every((ns, i) => ns.length === ((C.X(i) === 0 || C.X(i) === 6 ? 1 : 0) + (C.Y(i) === 0 || C.Y(i) === 6 ? 1 : 0) === 2 ? 2 : ns.length) && ns.length >= 2), '모서리 이웃 2');
}

// ── 2. 미로 만들기 ──
{
  let bad = [], dists = {};
  for (let sd = 1; sd <= (QUICK ? 12 : 30); sd++) {
    const st = C.init({ n: 2, seed: sd, cfg: {} }), w = st.wall;
    const n = w.filter(Boolean).length, F = C.fairOf(w), d0 = C.bfs(w, C.S[0]);
    const p0 = C.probe(w, 0), p1 = C.probe(w, 1);
    dists[F.d] = (dists[F.d] || 0) + 1;
    if (n !== 32 || !F.ok || d0.some(v => v < 0) || F.d < C.DMIN || F.d > C.DMAX || Math.max(p0, p1) > C.PMAX || Math.abs(p0 - p1) > C.PGAP) bad.push(`${sd}: 벽 ${n} 거리 ${F.d} 탐색 ${p0}/${p1}`);
    if (st.dist !== F.d) bad.push(`${sd}: dist`);
  }
  ok(!bad.length, '미로: 벽 32 · 모두 이어짐 · 둘의 최단 거리 같음 16~20 · 기준 탐색 34턴 이하 · 차이 8턴 이하 ' + bad.slice(0, 3));
  console.log('· 최단 거리 분포', J(dists));
  ok(J(C.init({ n: 2, seed: 9 }).wall) === J(C.init({ n: 2, seed: 9 }).wall) && J(C.init({ n: 2, seed: 9 }).wall) !== J(C.init({ n: 2, seed: 10 }).wall), '같은 씨앗 → 같은 미로 · 다른 씨앗 → 다른 미로');
  const w9 = C.init({ n: 2, seed: 3, cfg: { map: 9 } }).wall, F9 = C.fairOf(w9);
  ok(w9.filter(Boolean).length === 32 && F9.ok && F9.d === 16 && J(C.init({ n: 2, seed: 4, cfg: { map: 9 } }).wall) === J(w9), `9화 기록 판: 벽 32 · 최단 16 · 씨앗과 상관없이 같음 (${F9.d})`);
}

// ── 3. 규칙: 3칸 · 실패 · 되돌아가기 · 더블찬스 · 도착 ──
{
  const W = [C.eid(nm('B1'), nm('C1'))];
  let st = scene(W);
  const before = J(st);
  ok(/3칸을 꼭/.test(C.apply(st, 0, { t: 'go', path: [nm('B1'), nm('B2')], dbl: 0 }).err), '2칸은 안 됨');
  ok(/대각선/.test(C.apply(st, 0, { t: 'go', path: [nm('B2'), nm('B3'), nm('B4')], dbl: 0 }).err), '대각선은 안 됨');
  ok(/3칸까지만/.test(C.apply(st, 0, { t: 'go', path: [nm('B1'), nm('B2'), nm('B3'), nm('B4')], dbl: 0 }).err), '4칸은 안 됨');
  ok(/차례/.test(C.apply(st, 1, { t: 'go', path: [nm('F1'), nm('E1'), nm('D1')], dbl: 0 }).err), '차례 아님');
  ok(J(st) === before, '실패한 apply 는 상태를 안 바꿈');
  // 되돌아가기 (왔던 칸) — 3칸 중 두 방향을 살펴보기
  ok(C.apply(st, 0, { t: 'go', path: [nm('B1'), nm('A1'), nm('A2')], dbl: 0 }).ok && st.pos[0] === nm('A2') && st.turn === 1, '되돌아가도 됨 (B1 → A1 → A2)');
  ok(C.apply(st, 1, { t: 'go', path: [nm('F1'), nm('F2'), nm('F1')], dbl: 0 }).ok && st.pos[1] === nm('F1'), '상대 차례');
  // 벽: 그 즉시 출발점 · 남은 칸은 안 감 · 기록에 부딪힌 칸
  st.pos[0] = nm('B2'); st.turn = 0;
  ok(C.apply(st, 0, { t: 'go', path: [nm('B1'), nm('C1'), nm('D1')], dbl: 0 }).ok && st.pos[0] === C.S[0] && st.fails[0] === 1, '벽 → 출발점 · 실패 1');
  const L = st.last[0];
  ok(L.fail === 1 && J(L.path) === J([nm('B1'), nm('C1')]) && L.from === nm('B2'), '기록: 부딪힌 칸까지만 (B1 → C1 ✖) ' + J(L));
  ok(J(C.knownOf(st.log).wall) === J(W) && C.knownOf(st.log).open.includes(C.eid(nm('B2'), nm('B1'))), '공개된 벽 · 길');
  // 더블찬스: 6칸 · 2번 · 다 쓰면 안 됨
  st = scene([]);
  ok(/6칸을 꼭/.test(C.apply(st, 0, { t: 'go', path: [nm('A2'), nm('A3'), nm('A4')], dbl: 1 }).err), '더블찬스면 6칸');
  ok(C.apply(st, 0, { t: 'go', path: [nm('A2'), nm('A3'), nm('A4'), nm('A5'), nm('A6'), nm('B6')], dbl: 1 }).ok && st.dbl[0] === 1 && st.pos[0] === nm('B6'), '더블찬스 6칸 · 1번 남음');
  st.turn = 0; C.apply(st, 0, { t: 'go', path: [nm('C6'), nm('D6'), nm('E6'), nm('F6'), nm('F5'), nm('F4')], dbl: 1 });
  st.turn = 0;
  ok(st.dbl[0] === 0 && /다 썼어요/.test(C.apply(st, 0, { t: 'go', path: [nm('F3'), nm('F2'), nm('F1'), nm('E1'), nm('D1'), nm('C1')], dbl: 1 }).err), '더블찬스는 2번까지');
  // 도착: 닿는 순간 끝 (3칸보다 적어도) · 도착점을 지나갈 수 없음
  st = scene([], { pos: [nm('F7'), C.S[1]] });
  ok(/거기서 끝/.test(C.apply(st, 0, { t: 'go', path: [nm('G7'), nm('G6'), nm('G5')], dbl: 0 }).err), '도착점을 지나가는 길은 안 됨');
  ok(C.apply(st, 0, { t: 'go', path: [nm('G7')], dbl: 0 }).ok && st.over && st.res.w === 0 && st.res.why === 'goal' && J(C.ranks(st)) === '[0,1]', '1칸만 가도 도착 → 승리');
  // 남의 도착점 · 같은 칸은 그냥 칸
  st = scene([], { pos: [nm('B7'), nm('A6')] });
  ok(C.apply(st, 0, { t: 'go', path: [nm('A7'), nm('A6'), nm('A5')], dbl: 0 }).ok && !st.over, '상대 도착점은 그냥 지나감 · 상대와 같은 칸도 됨');
  // 상한: 둘 다 60턴 → 실제 거리 짧은 쪽
  st = scene([], { pos: [nm('F6'), nm('C2')] }); st.turns = [C.MAXT - 1, C.MAXT - 1]; st.turn = 0;
  C.apply(st, 0, { t: 'go', path: [nm('F5'), nm('F6'), nm('F5')], dbl: 0 });
  ok(!st.over, '59턴은 계속');
  C.apply(st, 1, { t: 'go', path: [nm('C3'), nm('C2'), nm('C3')], dbl: 0 });
  ok(st.over && st.res.why === 'cap' && st.res.w === 0 && J(st.res.d) === J([3, 6]), '상한 60턴 → 도착점에 가까운 쪽 승 ' + J(st.res));
  st = scene([], { pos: [nm('F6'), nm('B6')] }); st.turns = [C.MAXT - 1, C.MAXT - 1]; st.turn = 0;
  C.apply(st, 0, { t: 'go', path: [nm('F5'), nm('F6'), nm('F5')], dbl: 0 }); C.apply(st, 1, { t: 'go', path: [nm('B5'), nm('B6'), nm('B5')], dbl: 0 });
  ok(st.over && st.res.w === -1 && J(C.ranks(st)) === '[0,0]', '상한에서 거리가 같으면 무승부');
}

// ── 4. 방송 9화 이동 기록 49턴 재현 (하연주 = 왼쪽 출발 · 선, 김유현 = 오른쪽) ──
{
  // 나무위키 9화 표의 칸 번호: 아래 줄 S 1~5 S · 2~6줄 6~40 (줄마다 7칸) · 위 줄 G 41~45 G
  const cell = n => (n <= 5 ? at(n, 0) : n <= 40 ? at(n + 1 - 7 * (((n + 1) / 7) | 0), ((n + 1) / 7) | 0) : at(n - 40, 6));
  const HA = ['1 2', '1 7 8', '@8 9 10', '1 7 8', '@8 9 3 4', '@4 5', '1 7 8', '@8 9 3 4', '@4 10 11 12', '@12 19 26', '1 7 8', '@8 9 3 4', '@4 10 11 12', '@12 19 18 17', '@17 24 25 26', '@26 33 40 G', '1 7 8', '@8 9 10', '1 7 8', '@8 9 3 4', '@4 10 11 12', '@12 19 18 17', '@17 24 25 26', '@26 33 40 39', '@39 45 G'];
  const KI = ['5 11 18', '5 11 10', '@10 17', '5 11 12', '@12 19 26', '5 11 12', '@12 19 18 25', '5 11 12', '@12 19 18 17', '@17 24 31', '5 11 12', '@12 19 18 17', '@17 24 23', '5 4', '5 11 12', '@12 19 18 17', '@17 16', '12', '5 11 10', '@10 17', '5 11 10', '@10 4 3 9', '@9 16 15', '5 11 10'];
  const parse = (list, s) => list.map(t => { const f = t[0] === '@', xs = (f ? t.slice(1) : t).split(' '); return { from: f ? cell(+xs.shift()) : C.S[s], path: xs.map(v => (v === 'G' ? C.G[s] : cell(+v))) }; });
  const LOG = [parse(HA, 0), parse(KI, 1)];
  ok(cell(12) === at(6, 1) && cell(26) === at(6, 3) && cell(40) === at(6, 5) && cell(45) === at(5, 6) && cell(6) === at(0, 1), '나무위키 칸 번호 → 판 칸');
  const st = C.init({ n: 2, seed: 77, cfg: { map: 9 } }); st.first = 0; st.turn = 0;
  let bad = [], fails = [0, 0];
  for (let k = 0; k < 25; k++) for (const s of [0, 1]) {
    const m = LOG[s][k]; if (!m) continue;
    if (st.over) { bad.push(`${s} ${k + 1}: 이미 끝`); continue; }
    if (st.pos[s] !== m.from) bad.push(`${s} ${k + 1}턴 시작 칸 ${C.cellName(st.pos[s])} ≠ ${C.cellName(m.from)}`);
    // 방송 기록은 부딪힌 칸까지만 적혀 있음 → 남은 칸은 아무 데로나 채워 보내도 같은 결과여야 함
    const nx = LOG[s][k + 1], won = s === 0 && k === 24, failExp = !won && nx && nx.from === C.S[s] && m.path[m.path.length - 1] !== C.S[s];
    const p = m.path.slice(); while (p.length < 3 && p[p.length - 1] !== C.G[s]) { const last = p[p.length - 1]; p.push(C.NB[last][0]); }
    const r = C.apply(st, s, { t: 'go', path: p, dbl: 0 });
    if (!r.ok) { bad.push(`${s} ${k + 1}: ${r.err}`); continue; }
    const L = st.last[s];
    if ((L.fail >= 0) !== !!failExp) bad.push(`${s} ${k + 1}턴 실패 ${L.fail >= 0} ≠ 기록 ${failExp}`);
    if (failExp && L.fail !== m.path.length - 1) bad.push(`${s} ${k + 1}턴 부딪힌 칸 ${L.fail} ≠ ${m.path.length - 1}`);
    if (L.fail >= 0) fails[s]++;
  }
  ok(!bad.length, '9화 49턴: 시작 칸 · 성공 / 실패 · 부딪힌 칸이 기록과 같음 ' + bad.slice(0, 4).join(' | '));
  ok(st.over && st.res.w === 0 && st.turns[0] === 25 && st.turns[1] === 24, `9화: 하연주가 25턴째 도착해 승리 (${J(st.res)})`);
  ok(fails[0] === 6 && fails[1] === 11, `9화 실패 수 하연주 6 · 김유현 11 (${fails})`);
  console.log(`· 9화 기록 재현: 하연주 25턴 (실패 ${fails[0]}) · 김유현 24턴 (실패 ${fails[1]})`);
}

// ── 5. 숨은 정보: 벽은 끝날 때까지 아무도 못 봄 (구경꾼 · 두 사람 모두) ──
{
  const st = C.init({ n: 2, seed: 21, cfg: {} }), r = mul(3);
  for (let k = 0; k < 8; k++) { const s = C.needs(st)[0]; C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r)); }
  const v0 = C.view(st, 0), v1 = C.view(st, 1), vs = C.view(st, -1), va = C.view(st, 'all');
  ok(v0.walls === null && v1.walls === null && vs.walls === null && v0.dist === null && vs.dist === null && Array.isArray(va.walls) && va.walls.length === 32, '벽 · 최단 거리: 두 사람 · 구경꾼 X, all 만');
  ok(v0.pub === v1.pub && v0.pub === vs.pub && v0.pub === va.pub, 'pub 같음');
  const strip = v => { const o = JSON.parse(J(v)); delete o.seat; return J(o); };
  ok(strip(v0) === strip(v1) && strip(v0) === strip(vs), '두 사람 · 구경꾼 눈은 같음 (나만 아는 것 없음 — 길 · 부딪힌 자리는 서로 보임)');
  ok(!/"wall"\s*:\s*\[\s*(\d+\s*,\s*){20}/.test(J(v0)) && !('rs' in v0) && !('cfg' in v0) && !J(v0).includes('"rs"'), 'view 에 씨앗 · 벽 배열 없음');
  // 아직 아무도 안 부딪힌 벽을 옮겨도 view · AI 는 그대로
  const kn = new Set(C.knownOf(st.log).wall.concat(C.knownOf(st.log).open));
  const hid = wallsOf(st).find(e => !kn.has(e)), free = st.wall.findIndex((v, e) => !v && !kn.has(e));
  const before = J(C.view(st, 0)), aBefore = J(C.ai(C.view(st, st.turn), st.turn, 'hard', mul(1)));
  st.wall[hid] = 0; st.wall[free] = 1;
  ok(J(C.view(st, 0)) === before && J(C.ai(C.view(st, st.turn), st.turn, 'hard', mul(1))) === aBefore, 'AI · view 는 모르는 벽을 안 봄 (옮겨도 같음)');
  st.wall[hid] = 1; st.wall[free] = 0;
  // 끝나면 모두에게 공개
  const e = playAI(22, ['hard', 'hard']);
  ok(Array.isArray(C.view(e, 0).walls) && C.view(e, -1).walls.length === 32 && C.view(e, 1).dist > 0, '끝나면 벽 공개');
  // view 는 복사본
  const vv = C.view(st, 0); vv.pos[0] = 99; vv.log[0].first = 9; vv.last.forEach(x => { if (x) x.path.push(1); });
  ok(st.pos[0] !== 99 && st.log[0].first !== 9 && (!st.last[0] || st.last[0].path.length <= 6), 'view 는 깊은 복사본');
}

// ── 6. 기억 모형: 고급은 다 기억 · 초급은 잊고 헷갈림 ──
{
  let hardAll = 0, easyLess = 0, conf = 0, runs = 0;
  for (let sd = 31; sd < 37; sd++) {
    const st = playAI(sd, ['easy', 'easy']); const V = C.view(st, 0); V.over = false;
    const kn = C.knownOf(V.log), Kh = C.memory(V, 0, 'hard'), Ke = C.memory(V, 0, 'easy');
    runs++;
    if (kn.wall.every(e => Kh[e] === 2) && kn.open.every(e => Kh[e] === 1)) hardAll++;
    const ne = [...Ke].filter(v => v).length, nh = kn.wall.length + kn.open.length;
    if (ne < nh) easyLess++;
    if ([...Ke].some((v, e) => v === 2 && !kn.wall.includes(e))) conf++;
  }
  ok(hardAll === runs, `고급은 공개된 벽 · 길을 다 기억 (${hardAll}/${runs})`);
  ok(easyLess >= runs - 1 && conf >= 1, `초급은 잊고 (${easyLess}/${runs}) · 가끔 벽 자리를 헷갈림 (${conf}/${runs})`);
  // 확실히 아는 것 끌어내기: 칸에 길이 하나도 없고 남은 칸 사이가 하나면 그쪽은 길
  const Kd = new Int8Array(C.NE); const c = nm('A1'); Kd[C.eid(c, nm('A2'))] = 2; C.deduce(Kd);
  ok(Kd[C.eid(c, nm('B1'))] === 1, '모서리 칸의 마지막 칸 사이는 길 (이어진 미로)');
}

// ── 7. AI: 규칙대로 · 보이는 것만 · 💡 = 고급 · 3단계 · 속도 ──
global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} }, addEventListener() {} };
global.window.SVCores = { 'gn-memmaze': C };
require('../games/gn-memmaze/ui.js');
const U = global.window.SVUI['gn-memmaze'];
{
  let errs = 0, caps = 0;
  for (let sd = 1; sd <= (QUICK ? 8 : 24); sd++) {
    const T = ['easy', 'normal', 'hard'];
    try { const st = playAI(sd, [T[sd % 3], T[(sd + 1) % 3]], sd % 4 === 0 ? { map: 9 } : {}); if (!st.over) errs++; if (st.res && st.res.why === 'cap') caps++; } catch (e) { errs++; console.error(e.message); }
  }
  ok(!errs, 'AI 판이 규칙대로 끝까지 ' + errs);
  // 고급은 rnd 를 안 씀 → 💡 와 같음
  const st = playAI(5, ['normal', 'normal'], {}, null); void st;
  let same = 0, n = 0, coachHas = 0;
  const s2 = C.init({ n: 2, seed: 8, cfg: {} }), r = mul(9);
  for (let k = 0; k < 24 && !C.over(s2); k++) {
    const s = C.needs(s2)[0], V = C.view(s2, s);
    const a1 = C.ai(V, s, 'hard', mul(1)), a2 = C.ai(V, s, 'hard', mul(777)), A = C.analyze(V, s);
    n++; if (J(a1) === J(a2) && J(A.path) === J(a1.path) && A.dbl === a1.dbl) same++;
    const full = U.coach(V, s, -1, ['나', 'AI']);
    // '한 번 더' 를 누른 뒤 글 = 고급 AI 길 전체
    const txt = a1.path.map(C.cellName).join(' → ');
    if (full && /data-mzhint/.test(full.why) && !full.rec.includes(txt)) coachHas++;
    C.apply(s2, s, C.ai(V, s, 'normal', r));
  }
  ok(same === n, `💡 = 고급 AI (rnd 와 상관없음) ${same}/${n}`);
  ok(coachHas === n, `단계 힌트: 처음엔 길 전체를 안 보여 줌 ${coachHas}/${n}`);
  // 3단계 사다리
  const G = QUICK ? 30 : 60;
  const ladder = (A, B) => { let w = 0; for (let i = 0; i < G; i++) { const hs = i % 2, t = [B, B]; t[hs] = A; const st = playAI(300 + i * 13, t); const R = C.ranks(st); if (R[hs] === 0) w += R[0] === R[1] ? 0.5 : 1; } return w / G; };
  const he = ladder('hard', 'easy'), hn = ladder('hard', 'normal'), ne = ladder('normal', 'easy');
  ok(he >= 0.75 && hn >= 0.55 && ne >= 0.6, `3단계: 고급 vs 초급 ${(he * 100).toFixed(0)}% · 고급 vs 보통 ${(hn * 100).toFixed(0)}% · 보통 vs 초급 ${(ne * 100).toFixed(0)}%`);
  console.log(`· 3단계: 고급 vs 초급 ${(he * 100).toFixed(0)}% · 고급 vs 보통 ${(hn * 100).toFixed(0)}% · 보통 vs 초급 ${(ne * 100).toFixed(0)}% (${G}판씩)`);
  // 고급끼리 판 길이 (방송 9화는 25턴)
  let tt = 0; for (let i = 0; i < 12; i++) { const st = playAI(500 + i, ['hard', 'hard']); tt += Math.max(st.turns[0], st.turns[1]); }
  ok(tt / 12 <= 32, `고급끼리 평균 ${(tt / 12).toFixed(1)}턴 (방송 9화 25턴)`); console.log(`· 고급끼리 평균 ${(tt / 12).toFixed(1)}턴`);
  // 속도: ai 150 ms · 선생님 200 ms · 판 만들기
  let mx = 0, mc = 0;
  playAI(61, ['hard', 'normal'], {}, (st, s, V) => {
    let t0 = process.hrtime.bigint(); C.ai(V, s, 'hard', mul(1)); mx = Math.max(mx, Number(process.hrtime.bigint() - t0) / 1e6);
    t0 = process.hrtime.bigint(); U.coach(V, s, -1, ['나', 'AI']); U.coach(V, 1 - s, -1, ['나', 'AI']); mc = Math.max(mc, Number(process.hrtime.bigint() - t0) / 1e6);
  });
  let mg = 0; for (let sd = 1; sd <= 10; sd++) { const t0 = process.hrtime.bigint(); C.init({ n: 2, seed: sd * 31 }); mg = Math.max(mg, Number(process.hrtime.bigint() - t0) / 1e6); }
  ok(mx < 150 && mc < 200 && mg < 400, `속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms · 미로 만들기 최대 ${mg.toFixed(0)} ms`);
  console.log(`· 속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms · 미로 만들기 최대 ${mg.toFixed(0)} ms`);
  // 고급 AI 는 아는 벽으로 안 감 · 상대가 찾은 길을 씀
  const sc = scene([C.eid(nm('A1'), nm('A2'))], { turn: 0 });
  C.apply(sc, 0, { t: 'go', path: [nm('A2'), nm('A3'), nm('A4')], dbl: 0 });        // 벽 → 출발점
  sc.turn = 0;
  const a3 = C.ai(C.view(sc, 0), 0, 'hard');
  ok(a3.path[0] !== nm('A2'), '고급: 방금 부딪힌 벽으로 다시 안 감 ' + a3.path.map(C.cellName));
  const sf = scene([], { turn: 1 });
  // 상대(오른쪽)가 G1 → G6 까지 길을 밝혀 줌 → 내가 그 근처에 있으면 그 길을 탐
  for (const p of [[nm('G2'), nm('G3'), nm('G4')], [nm('G5'), nm('G6'), nm('F6')]]) { sf.turn = 1; C.apply(sf, 1, { t: 'go', path: p, dbl: 0 }); }
  sf.turn = 0; sf.pos[0] = nm('G1');
  const af = C.ai(C.view(sf, 0), 0, 'hard'), Af = C.analyze(C.view(sf, 0), 0);
  ok(af.path[0] === nm('G2') && af.dbl === 1 && Af.why !== 'route', '상대가 밝혀 준 길을 따라 더블찬스로 (9화 하연주) ' + af.path.map(C.cellName) + ' ' + af.dbl);
}

// ── 8. 복기 약속: core 안 시계 · Math.random 없음 · view · ai 가 상태 안 바꿈 ──
{
  const src = fs.readFileSync(path.join(__dirname, '../games/gn-memmaze/core.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random|Date\.now|performance\.now/.test(src), 'core 에 Math.random · Date.now 없음');
  const a = playAI(41, ['normal', 'easy']), b = playAI(41, ['normal', 'easy']);
  ok(J(a.log) === J(b.log), '같은 씨앗 → 같은 판');
  const st = C.init({ n: 2, seed: 3 }); C.apply(st, st.turn, C.ai(C.view(st, st.turn), st.turn, 'normal', mul(2)));
  const before = J(st);
  C.view(st, 0); C.view(st, 'all'); C.ai(C.view(st, st.turn), st.turn, 'hard'); C.analyze(C.view(st, st.turn), st.turn); C.legal(st, st.turn);
  ok(J(st) === before, 'view · ai · analyze · legal 이 상태를 안 바꿈');
  ok(C.legal(st, st.turn).length > 0 && C.legal(st, st.turn).every(x => C.checkPath(st.pos[st.turn], st.turn, x.path, 0) === ''), 'legal 은 다 규칙에 맞음');
}

// ── 9. 화면 글 (Node) ──
{
  ok(U.howto.length >= 5 && /^🎯 목표/.test(U.howto[0]) && /^준비물/.test(U.howto[1]) && /^진행/.test(U.howto[2]) && /^승패/.test(U.howto[3]) && /^특수/.test(U.howto[4]), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  ok(/32/.test(U.howto[1]) && /3칸/.test(U.howto[2]) && /더블찬스 2번/.test(U.howto[4]) && /6칸/.test(U.howto[4]), '숫자 · 용어 방송 것 (벽 32 · 3칸 · 더블찬스 2번 · 6칸)');
  const T = U.tutorial();
  ok(T.length >= 4 && T.length <= 8 && T.filter(t => t.interactive).length === 1, '1분 규칙 단계 ' + T.length);
  ok(U.board === true && U.min === 2 && U.max === 2 && U.fitCoach === true && U.opts.find(o => o.k === 'help').def === 0, '한 기기 · 1:1 · 기억 도우미 기본 끔');
  ok(U.actText({ t: 'go', path: [nm('B1'), nm('B2'), nm('C2')], dbl: 0 }) === 'B1 → B2 → C2' && /더블찬스/.test(U.actText({ t: 'go', path: [1, 2, 3, 4, 5, 6], dbl: 1 })) && U.actText(null) === '', '행동 글');
  // 복기: 아는 벽으로 걸어 들어감 → 크게
  const sc = scene([C.eid(nm('B1'), nm('C1'))]);
  C.apply(sc, 0, { t: 'go', path: [nm('B1'), nm('C1'), nm('D1')], dbl: 0 });
  C.apply(sc, 1, { t: 'go', path: [nm('F1'), nm('F2'), nm('F1')], dbl: 0 });
  const Vb = C.view(sc, 0), best = C.ai(Vb, 0, 'hard');
  const rv = U.review(Vb, 0, { t: 'go', path: [nm('B1'), nm('C1'), nm('D1')], dbl: 0 }, best);
  ok(rv.sev >= 90 && /B1–C1/.test(rv.why) && /\d/.test(rv.why), '복기: 아는 벽으로 감 ' + rv.sev + ' ' + rv.why);
  ok(U.review(Vb, 0, best, best).sev === 0, '같은 길이면 0');
  const rw = U.review(Vb, 0, { t: 'go', path: [nm('A2'), nm('A1'), nm('A2')], dbl: 0 }, best);
  ok(rw.sev >= 0 && rw.sev <= 80 && /%/.test(rw.why), '복기: 다른 길 ' + rw.sev + ' ' + rw.why);
  // 선생님 글: 숫자 근거 · 이름 escape · 조사 · 빈칸 없음
  const V0 = C.view(sc, 0), c0 = U.coach(V0, 0, -1, ['나', '<b>김</b>']), c1 = U.coach(V0, 1, -1, ['나', '연주']);
  const all = J(c0) + J(c1);
  ok(!/undefined|NaN|null|\[object/.test(all) && !/<b>김/.test(all) && /&lt;b&gt;김/.test(all), '선생님 글: 빈칸 없음 · 이름 escape ' + J(c0).slice(0, 160));
  ok(/\d+%/.test(c0.why) && /벽/.test(c0.mine) && /한 번 더/.test(c0.why), '선생님 글: 확률 숫자 · 단계 힌트 단추 ' + c0.rec);
  ok(/연주가/.test(c0.opp + J(U.coach(V0, 0, -1, ['나', '연주']))) || /연주는/.test(J(U.coach(V0, 0, -1, ['나', '연주']))), '조사: 연주는 · 연주가');
  ok(/김유현은/.test(U.coach(V0, 0, -1, ['나', '김유현']).opp), '조사: 김유현은');
  const ended = playAI(23, ['hard', 'easy']), ce = U.coach(C.view(ended, 0), 0, -1, ['나', 'AI']);
  ok(/끝났어요/.test(ce.rec) && /최단 거리 \d+칸/.test(ce.why), '끝난 판 선생님 글');
  const res = U.result(C.view(ended, 0), 0);
  ok(/턴/.test(res) && /실패/.test(res) && /벽 32개/.test(res), '결과 글 ' + res.slice(0, 80));
  ok(/^턴 \d+ \/ 60/.test(U.sub(C.view(C.init({ n: 2, seed: 2 }), 0))) && U.sub(C.view(ended, 0)) === '끝', 'sub');
  const ch = U.chip(C.view(sc, 0), 0, 0);
  ok(/🔵A1 ⚡2$/.test(ch.t), '칩 (이름이 안 잘리게 자리 · 더블찬스만) ' + ch.t);
  ok(/9화/.test(U.diff) && /32/.test(U.diff) && /상한/.test(U.diff) && /디글 클래식/.test(U.src), 'src · diff');
}

console.log(`gn-memmaze selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

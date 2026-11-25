// 3층 오목 규칙 시험 (node survival/test/omok3_selftest.js [--quick])
'use strict';
const C = require('../games/omok3/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const pl = to => ({ t: 'place', to }), mv = (from, to) => ({ t: 'move', from, to });
const P = n => { const i = C.LBL.indexOf(n); if (i < 0) throw new Error('칸 이름 없음 ' + n); return i; };
const atQY = (q, y) => C.PTS.findIndex(p => p[0] === q && p[1] === y);
// 손으로 만든 판: stacks = { 칸이름: [아래부터 색(0 검정 · 1 하양)] }
function scene({ stacks = {}, hand = [10, 10], turn = 0, bo = 3 } = {}) {
  const st = C.init({ n: 2, seed: 5, cfg: { bo } });
  st.stk = Array.from({ length: C.NP }, () => []);
  for (const k of Object.keys(stacks)) st.stk[P(k)] = stacks[k].slice();
  st.phase = 'play'; st.hand = hand.slice(); st.turn = turn; st.first = turn; st.first0 = turn; st.ply = 10; st.setup = { seq: [], i: 0 };
  return st;
}
const winOf = st => { const k = [null, {}, {}], m = C.winFull(C.boardOf(st.stk, st.hand), k); return { m, k }; };

// 1) 판 모양
{
  ok(C.NP === 85 && C.PTS.length === 85, '칸 85개');
  const cols = {}; C.PTS.forEach(([q]) => { cols[q] = (cols[q] || 0) + 1; });
  ok(J([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(q => cols[q])) === J([4, 7, 8, 9, 10, 9, 10, 9, 8, 7, 4]), '세로선마다 칸 수 4 7 8 9 10 9 10 9 8 7 4 (영상 화면)');
  ok(C.PTS[C.CENTER][0] === 0 && C.PTS[C.CENTER][1] === 0 && C.LBL[C.CENTER] === 'F5', '정중앙 = F5');
  let sym = true, deg = 0;
  C.NB.forEach((a, p) => { deg += a.length; a.forEach(q => { if (!C.NB[q].includes(p)) sym = false; }); });
  ok(sym, '이웃은 서로');
  ok(C.NB[C.CENTER].length === 6, '가운데 이웃 6');
  ok(C.NB.every(a => a.length >= 3 && a.length <= 6), '이웃 수 3~6');
  ok(new Set(C.LBL).size === 85, '칸 이름이 겹치지 않음');
  ok(C.TRIS.every(t => t.length === 3 && C.NB[t[0]].includes(t[1]) && C.NB[t[0]].includes(t[2]) && C.NB[t[1]].includes(t[2])), '세 칸 묶음은 서로 이웃');
  ok(C.TRIS.length === 138, `서로 이웃한 세 칸 묶음 ${C.TRIS.length} (138)`);
  ok(C.LINES.every(L => L.length >= 5), '줄은 5칸 이상');
  ok(!C.PTS.some(([q, y]) => (q === 0 && Math.abs(y) === 10) || (Math.abs(q) === 5 && Math.abs(y) === 5)), '여섯 꼭짓점은 없음');
}

// 2) 시작 · 기본 배치 (1 · 2 · 2 · 1)
{
  const firsts = new Set();
  for (let seed = 1; seed <= 30; seed++) firsts.add(C.init({ n: 2, seed }).first);
  ok(firsts.size === 2, '1판 선공은 씨앗마다 둘 다 나옴');
  const st = C.init({ n: 2, seed: 3 });
  const f = st.first, s = 1 - f;
  ok(st.phase === 'setup' && J(st.hand) === J([25, 25]) && C.MEN === 25, '돌 25개씩');
  ok(J(st.setup.seq) === J([f, s, s, f, f, s]), '기본 배치 순서 선 1 · 후 2 · 선 2 · 후 1');
  ok(J(C.needs(st)) === J([f]), '선공부터');
  const L0 = C.legal(st, f);
  ok(L0.length === 84 && !L0.some(a => a.to === C.CENTER), '정중앙은 못 놓음 (84칸)');
  ok(!C.apply(st, f, pl(C.CENTER)).ok && /정중앙/.test(C.apply(st, f, pl(C.CENTER)).err), '정중앙 거절');
  ok(!C.apply(st, s, pl(1)).ok, '차례 아님');
  ok(!C.apply(st, f, { t: 'move', from: 1, to: 2 }).ok, '배치 중엔 이동 불가');
  const a1 = P('B3');
  ok(C.apply(st, f, pl(a1)).ok && st.stk[a1].join() === String(f), '첫 돌');
  ok(J(C.needs(st)) === J([s]), '다음은 후공');
  const nb = C.NB[a1][0];
  // 후공은 선공 돌 옆에 놓아도 됨 (자기 돌 옆만 금지)
  ok(C.apply(st, s, pl(nb)).ok, '상대 돌 옆은 됨');
  const nb2 = C.NB[nb].find(x => x !== a1 && !st.stk[x].length && x !== C.CENTER);
  ok(!C.apply(st, s, pl(nb2)).ok && /이웃/.test(C.apply(st, s, pl(nb2)).err), '내 돌 이웃은 거절');
  ok(!C.setupCells(st, s).includes(nb2) && !C.setupCells(st, s).includes(C.CENTER), 'setupCells 도 같음');
  const far = C.PTS.findIndex((p, i) => !st.stk[i].length && i !== C.CENTER && C.NB[i].every(x => !st.stk[x].length || st.stk[x][0] !== s));
  ok(C.apply(st, s, pl(far)).ok, '후공 둘째 돌');
  ok(st.phase === 'setup' && J(C.needs(st)) === J([f]), '선공 2개째 차례');
  // 나머지를 규칙대로 채움
  let guard = 0;
  while (st.phase === 'setup' && guard++ < 20) { const who = C.needs(st)[0]; const c = C.setupCells(st, who); ok(c.length > 0, '둘 곳이 있음'); ok(C.apply(st, who, pl(c[0])).ok, '배치'); }
  ok(st.phase === 'play' && st.turn === f && J(st.hand) === J([22, 22]), '배치 끝 → 선공부터 턴 (돌 22개씩 남음)');
  ok(st.stk.flat().length === 6 && st.stk.filter(a => a.length).length === 6, '돌 6개 (3 · 3)');
}

// 3) 놓기 · 이동 · 쌓기 규칙
{
  const st = scene({ stacks: { E4: [0], E5: [1], F6: [0, 1], F7: [0, 1, 0], G4: [1, 1] }, hand: [3, 3], turn: 0 });
  ok(!C.apply(st, 0, pl(P('E4'))).ok && /빈 칸/.test(C.apply(st, 0, pl(P('E4'))).err), '돌 놓기는 빈 칸만');
  ok(C.apply(st, 0, pl(P('A1'))).ok && st.hand[0] === 2 && st.turn === 1 && st.stk[P('A1')].join() === '0', '놓기');
  // 이동: 맨 위가 내 돌인 칸만 · 이웃으로만
  const s2 = scene({ stacks: { E4: [0], E5: [1], F6: [0, 1], F7: [1, 0], G4: [1, 1] }, hand: [0, 0], turn: 0 });
  ok(!C.apply(s2, 0, mv(P('E5'), P('E4'))).ok, '상대 돌은 못 옮김');
  ok(!C.apply(s2, 0, mv(P('F6'), P('E4'))).ok, '맨 위가 상대 돌(밑이 내 돌)이면 못 옮김');
  ok(!C.apply(s2, 0, pl(P('A1'))).ok && /다 놓았/.test(C.apply(s2, 0, pl(P('A1'))).err), '돌이 없으면 놓기 불가');
  const far = P('A1');
  ok(!C.apply(s2, 0, mv(P('E4'), far)).ok && /이웃/.test(C.apply(s2, 0, mv(P('E4'), far)).err), '이웃이 아니면 불가');
  // 1층 → 빈 칸, 1층 → 1층(올라타기)
  const nbE4 = C.NB[P('E4')];
  ok(nbE4.includes(P('E5')), '(시험 전제) E4 와 E5 는 이웃');
  const a = scene({ stacks: { E4: [0], E5: [1] }, hand: [0, 0], turn: 0 });
  ok(C.apply(a, 0, mv(P('E4'), P('E5'))).ok && J(a.stk[P('E5')]) === J([1, 0]) && a.stk[P('E4')].length === 0, '1층 돌이 1층 돌 위로 → 2층');
  ok(a.last.fl === 2 && a.last.cov === 1, '마지막 수 기록: 2층 · 덮은 색');
  // 1층 → 2층 칸: 못 감 (원래 있던 칸보다 높이 쌓인 칸)
  const b = scene({ stacks: { E4: [0], E5: [1, 0] }, hand: [0, 0], turn: 0 });
  ok(!C.apply(b, 0, mv(P('E4'), P('E5'))).ok && /더 높이/.test(C.apply(b, 0, mv(P('E4'), P('E5'))).err), '1층 돌이 2층 칸으로 못 감');
  ok(J(b.stk[P('E5')]) === J([1, 0]), '거절되면 판은 그대로');
  // 2층 → 2층 칸 = 3층, 2층 → 1층, 3층 칸으로는 못 감
  const c = scene({ stacks: { E4: [1, 0], E5: [1, 1] }, hand: [0, 0], turn: 0 });
  ok(C.apply(c, 0, mv(P('E4'), P('E5'))).ok && J(c.stk[P('E5')]) === J([1, 1, 0]) && J(c.stk[P('E4')]) === J([1]), '2층 돌이 2층 칸 위로 → 3층 (밑 돌이 드러남)');
  const d = scene({ stacks: { E4: [1, 0], E5: [1, 1, 1] }, hand: [0, 0], turn: 0 });
  ok(!C.apply(d, 0, mv(P('E4'), P('E5'))).ok, '3층까지만 (3층 칸에는 못 올라감)');
  const e = scene({ stacks: { E4: [1, 1, 0], E5: [1, 1, 1] }, hand: [0, 0], turn: 0 });
  ok(!C.apply(e, 0, mv(P('E4'), P('E5'))).ok, '3층 돌도 3층 칸에는 못 감');
  const g = scene({ stacks: { E4: [1, 0], E5: [1] }, hand: [0, 0], turn: 0 });
  ok(C.apply(g, 0, mv(P('E4'), P('E5'))).ok && J(g.stk[P('E5')]) === J([1, 0]), '2층 돌이 1층 칸 위로 (내려가며 쌓기)');
  // legal 이 apply 와 같음
  const sc = scene({ stacks: { E4: [0], E5: [1], F6: [1, 0], G4: [1, 1], H6: [0, 1, 0] }, hand: [2, 2], turn: 0 });
  const L = C.legal(sc, 0);
  let consist = true;
  for (const x of L) { const t = scene({ stacks: { E4: [0], E5: [1], F6: [1, 0], G4: [1, 1], H6: [0, 1, 0] }, hand: [2, 2], turn: 0 }); if (!C.apply(t, 0, x).ok) consist = false; }
  ok(consist && L.length > 10, `legal 의 수는 모두 먹음 (${L.length}개)`);
  // legal 에 없는 수는 안 먹음 (모든 칸 쌍 시험)
  let bad = 0; const set = new Set(L.map(J));
  for (let f = 0; f < C.NP; f += 3) for (const t of C.NB[f]) { const x = mv(f, t); const q = scene({ stacks: { E4: [0], E5: [1], F6: [1, 0], G4: [1, 1], H6: [0, 1, 0] }, hand: [2, 2], turn: 0 }); if (C.apply(q, 0, x).ok !== set.has(J(x))) bad++; }
  ok(bad === 0, 'legal 과 apply 가 이동 규칙에서 같음 ' + bad);
}

// 4) 승리 조건
{
  // ① 오목: 정확히 5개 일직선 (세로 · 두 대각선)
  const col = n => [1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, n).map(k => 'F' + k);
  let stacks = {}; col(5).forEach(n => { stacks[n] = [0]; });
  ok(winOf(scene({ stacks })).m === 1 && winOf(scene({ stacks })).k[1].line, '세로 5개 = 오목');
  stacks = {}; col(6).forEach(n => { stacks[n] = [0]; });
  ok(winOf(scene({ stacks })).m === 0, '6개 이상 이어지면 인정 안 됨');
  stacks = {}; col(4).forEach(n => { stacks[n] = [0]; });
  ok(winOf(scene({ stacks })).m === 0, '4개는 아님');
  stacks = {}; ['F1', 'F2', 'F3', 'F5', 'F6'].forEach(n => { stacks[n] = [0]; });
  ok(winOf(scene({ stacks })).m === 0, '끊어지면 아님');
  stacks = {}; ['F1', 'F2', 'F3', 'F4', 'F5'].forEach(n => { stacks[n] = [0]; }); stacks.F6 = [1];
  ok(winOf(scene({ stacks })).m === 1, '옆이 상대 돌이면 정확히 5개 = 승');
  // 대각선: (−2,−2)(−1,−1)(0,0)(1,1)(2,2) 방향 (1,1)
  const diag = [-2, -1, 0, 1, 2].map(k => atQY(k, k)), diag2 = [-2, -1, 0, 1, 2].map(k => atQY(k, -k));
  const mk = idxs => { const st = scene({}); idxs.forEach(i => { st.stk[i] = [1]; }); return st; };
  ok(diag.every(i => i >= 0) && winOf(mk(diag)).m === 2, '대각선(↘) 5개 = 오목');
  ok(diag2.every(i => i >= 0) && winOf(mk(diag2)).m === 2, '대각선(↗) 5개 = 오목');
  // 위에서 본 모습: 맨 위 돌 색깔 (쌓인 칸 포함)
  stacks = { F1: [0], F2: [1, 0], F3: [1, 1, 0], F4: [0], F5: [0] };
  ok(winOf(scene({ stacks })).m === 1, '쌓인 칸은 맨 위 색으로 셈');
  stacks = { F1: [0], F2: [0, 1], F3: [0], F4: [0], F5: [0] };
  ok(winOf(scene({ stacks })).m === 0, '맨 위가 상대 돌이면 끊김');
  // ② 3층 돌 5개
  stacks = {}; ['A1', 'C2', 'E3', 'G4', 'I5'].forEach(n => { stacks[n] = [1, 1, 0]; });
  let w = winOf(scene({ stacks }));
  ok(w.m === 1 && w.k[1].tower5, '3층 돌 5개 (어디든) = 승');
  delete stacks.I5; stacks.I5 = [1, 1];
  ok(winOf(scene({ stacks })).m === 0, '3층 돌 4개는 아님');
  stacks.I5 = [1, 1, 1];
  ok(winOf(scene({ stacks })).m === 0, '3층 돌 5개라도 맨 위가 상대 돌이면 내 것이 아님 (내 4개)');
  // ③ 서로 이웃한 3층 돌 3개
  const tri = C.TRIS[40];
  const st3 = scene({}); tri.forEach(i => { st3.stk[i] = [0, 0, 1]; });
  w = winOf(st3);
  ok(w.m === 2 && w.k[2].tri3, '이웃 세 칸이 모두 3층 = 승');
  const st3b = scene({}); st3b.stk[tri[0]] = [0, 0, 1]; st3b.stk[tri[1]] = [0, 0, 1]; st3b.stk[tri[2]] = [0, 1];
  ok(winOf(st3b).m === 0, '하나가 2층이면 아님');
  // 일직선 세 칸(이웃 아님)은 아님
  const stl = scene({}); ['F1', 'F2', 'F3'].forEach(n => { stl.stk[P(n)] = [1, 1, 0]; });
  ok(winOf(stl).m === 0, '일직선 3층 세 칸은 이웃 삼각형이 아님');
  // 동시에 이루면 그 턴을 둔 사람 승
  {
    const s = scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0] , G5: [0], A1: [1], A2: [1], A3: [1], A4: [1] }, hand: [3, 3], turn: 0 });
    // 검정이 F5 에 놓아 오목 → 승
    ok(C.apply(s, 0, pl(P('F5'))).ok && s.res && s.res.w === 0 && s.res.kind === 'line5' && s.phase === 'between', '놓아서 오목 → 그 판 승');
  }
  {
    // 내가 돌을 옮겨서 상대 줄이 드러나 상대만 이루면 상대가 이김: 하양 줄 4개 + 검정 위에 덮인 하양 돌
    const st = scene({ stacks: { F1: [1], F2: [1], F3: [1], F4: [1], F5: [1, 0], A1: [0] }, hand: [0, 0], turn: 0 });
    // 검정 F5 (위) 돌을 옮기면 아래 하양이 드러나 하양 5개 → 하양 승
    const to = C.NB[P('F5')].find(x => !st.stk[x].length && ![P('F4'), P('F6')].includes(x));
    // F4 는 하양 1층 — 올라타기는 높이가 같아야 하므로 F5 가 2층이면 1층 칸 위로도 가능. 빈 칸으로 옮김
    ok(to >= 0 && C.apply(st, 0, mv(P('F5'), to)).ok && st.res && st.res.w === 1, '내 돌을 치워 상대 줄이 드러나면 상대가 이김');
  }
  {
    // 둘 다 이루는 수: 검정이 오목을 만들면서 동시에 하양 오목도 드러남 → 둔 사람(검정) 승
    const st = scene({ stacks: { F1: [1], F2: [1], F3: [1], F4: [1], F5: [1, 0], G4: [0], G6: [0], H5: [0], E4: [0] }, hand: [0, 0], turn: 0 });
    // 검정 F5 위 돌이 G… 로 옮겨 가며 검정도 5개가 되게는 복잡 — 직접 판정함수로: 하양 5 + 검정 5 가 동시에 있을 때 apply 가 mover 를 고르는지
    const s2 = scene({ stacks: {}, hand: [5, 5], turn: 0 });
    ['F1', 'F2', 'F3', 'F4'].forEach(n => { s2.stk[P(n)] = [0]; });
    ['A1', 'A2', 'A3', 'A4'].forEach(n => { s2.stk[P(n)] = [1]; });
    // 검정이 F5 에 놓으면 검정 오목 (하양은 아직 아님)
    ok(C.apply(s2, 0, pl(P('F5'))).ok && s2.res.w === 0, '(참고) 한쪽만 이루면 그쪽');
    // 동시: 하양 줄을 이미 완성된 채로 두고(시험용) 검정이 완성 → 둔 사람 승
    const s3 = scene({ stacks: {}, hand: [5, 5], turn: 0 });
    ['F1', 'F2', 'F3', 'F4'].forEach(n => { s3.stk[P(n)] = [0]; });
    ['E1', 'E2', 'E3', 'E4', 'E5'].forEach(n => { s3.stk[P(n)] = [1]; });
    ok(C.apply(s3, 0, pl(P('F5'))).ok && s3.res.w === 0, '동시에 이루면 그 턴을 둔 사람이 이김');
    void st;
  }
}

// 5) 판 · 경기 진행
{
  // 움직일 수 없으면 짐
  const st = scene({ stacks: { A1: [0], A2: [1], B1: [1], B2: [1] }, hand: [0, 0], turn: 0 });
  // 하양 돌 모두가 움직일 곳이 있어서 'block' 이 아님 — 빈 칸이 없는 상황은 만들기 어려우니 genMoves 로 직접
  ok(C.genMoves(C.boardOf(st.stk, st.hand), 0, false).length > 0, '검정에게 수가 있음');
  const st2 = scene({ stacks: { E5: [0] }, hand: [0, 5], turn: 1 });
  // 검정의 유일한 돌 E5 를 이웃 6칸 모두 2층 이상으로 둘러싸면(검정은 1층이라 못 올라감) 검정은 움직일 수 없음
  C.NB[P('E5')].forEach(x => { st2.stk[x] = [1, 1]; });
  ok(C.genMoves(C.boardOf(st2.stk, st2.hand), 0, false).length === 0, '둘러싸이면 검정은 수가 없음');
  const far = C.PTS.findIndex((p, i) => !st2.stk[i].length && !C.NB[P('E5')].includes(i) && i !== P('E5'));
  ok(C.apply(st2, 1, pl(far)).ok && st2.res && st2.res.w === 1 && st2.res.why === 'block', '다음 차례가 움직일 수 없으면 그 판은 짐 (방금 둔 쪽 승)');
  // 150 수 상한 = 무승부
  const sc = scene({ stacks: { A1: [0], A2: [1] }, hand: [5, 5], turn: 0 }); sc.ply = C.CAPPLY - 1;
  ok(C.apply(sc, 0, pl(P('C5'))).ok && sc.res && sc.res.w === -1 && sc.res.why === 'cap', `${C.CAPPLY}수에 닿으면 무승부`);
}

// 6) 3판 2선승 · 진 쪽이 선후공을 정함
{
  const st = scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0] }, hand: [5, 5], turn: 0, bo: 3 });
  st.round = 1; st.wins = [0, 0];
  ok(C.apply(st, 0, pl(P('F5'))).ok && st.res.w === 0 && st.wins[0] === 1 && st.phase === 'between' && !st.over, '1판 검정 승 → 판 사이');
  ok(C.auto(st) > 0 && C.needs(st).length === 0, '판 사이는 입력 없이 자동으로 넘어감');
  C.advance(st);
  ok(st.phase === 'order' && st.chooser === 1 && J(C.needs(st)) === J([1]), '진 쪽(하양)이 선후공을 정함');
  ok(!C.apply(st, 0, { t: 'order', first: true }).ok, '이긴 쪽은 고를 수 없음');
  ok(!C.apply(st, 1, { t: 'place', to: 3 }).ok && !C.apply(st, 1, { t: 'order' }).ok, '고르는 단계에서 엉뚱한 행동');
  ok(J(C.legal(st, 1).map(x => x.first)) === J([true, false]), 'legal = 먼저 · 나중');
  const before = J(st);
  ok(C.apply(st, 1, { t: 'order', first: false }).ok && st.round === 2 && st.first === 0 && st.phase === 'setup' && J(C.needs(st)) === J([0]), '하양이 나중을 고르면 검정이 선공');
  ok(before !== J(st), '(바뀜)');
  // 2선승으로 끝
  const st2 = scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0] }, hand: [5, 5], turn: 0, bo: 3 });
  st2.round = 2; st2.wins = [1, 1];
  ok(C.apply(st2, 0, pl(P('F5'))).ok && st2.over && st2.phase === 'end' && J(C.ranks(st2)) === J([0, 1]) && C.needs(st2).length === 0, '3판째 이기면 끝 · 순위');
  const st3 = scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0] }, hand: [5, 5], turn: 0, bo: 3 });
  st3.round = 2; st3.wins = [1, 0];
  C.apply(st3, 0, pl(P('F5')));
  ok(st3.over && st3.wins[0] === 2 && J(C.view(st3, 0).ranks) === J([0, 1]), '2승이면 바로 끝');
  // 단판
  const s1 = scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0] }, hand: [5, 5], turn: 0, bo: 1 });
  C.apply(s1, 0, pl(P('F5')));
  ok(s1.over && s1.maxR === 3, '단판은 한 판에 끝');
  // 무승부 판은 번갈아 선공, 다시 함
  const d = scene({ stacks: { A1: [0], A2: [1] }, hand: [5, 5], turn: 0, bo: 3 }); d.round = 1; d.ply = C.CAPPLY - 1;
  C.apply(d, 0, pl(P('C5')));
  ok(d.res.w === -1 && !d.over && d.phase === 'between', '무승부 → 판 사이');
  C.advance(d);
  ok(d.phase === 'setup' && d.round === 2 && d.first === 1, '무승부 뒤에는 선공이 번갈아 바뀜 (정하는 단계 없음)');
  // 최대 5판
  const m = scene({ stacks: { A1: [0], A2: [1] }, hand: [5, 5], turn: 0, bo: 3 }); m.round = 5; m.ply = C.CAPPLY - 1; m.wins = [2, 2];
  m.wins = [1, 1]; C.apply(m, 0, pl(P('C5')));
  ok(m.over && J(C.ranks(m)) === J([0, 0]), '5판까지 못 가리면 무승부 (공동 1등)');
}

// 7) view · 상태 보존 · 결정성
{
  const st = C.init({ n: 2, seed: 11, cfg: { bo: 3 } });
  const r = mul(3);
  let steps = 0;
  while (!C.over(st) && steps++ < 3000) {
    const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
    const s = nd[0], V = C.view(st, s), vj = J(V), s0 = J(st);
    ok(J(C.view(st, s)) === vj && J(st) === s0, 'view 는 상태를 안 바꿈');
    { const x = C.view(st, 'all'), y = C.view(st, -1); delete x.seat; delete y.seat; ok(J(x) === J(y) && J(C.view(st, 0).stk) === J(y.stk), '모두 공개: 보는 사람이 달라도 판은 같음'); }
    const a = C.ai(V, s, ['easy', 'normal', 'hard'][steps % 3], r);
    ok(J(V) === vj, 'ai 는 받은 view 를 안 바꿈');
    ok(a && C.legal(st, s).some(x => J(x) === J(a)), 'AI 수는 legal 안: ' + J(a) + ' phase ' + st.phase);
    const bad = C.apply(st, 1 - s, { t: 'place', to: 0 });
    ok(!bad.ok && J(st) === s0, '차례 아닌 apply 는 상태를 안 바꿈');
    const bad2 = C.apply(st, s, { t: 'move', from: -5, to: 999 });
    ok(!bad2.ok && J(st) === s0, '엉뚱한 apply 는 상태를 안 바꿈');
    ok(C.apply(st, s, a).ok, 'AI 수가 먹음');
    if (QUICK && steps > 220) break;
  }
  const a1 = C.init({ n: 2, seed: 9 }), a2 = C.init({ n: 2, seed: 9 });
  ok(J(a1) === J(a2), '같은 seed 는 같은 판');
}

// 8) AI 와 선생님
{
  // 이기는 수가 있으면 모든 단계가 둠 (hard · normal) — 세로 4개 + 빈 칸
  const mkst = () => scene({ stacks: { F1: [0], F2: [0], F3: [0], F4: [0], A1: [1], A2: [1], H5: [1] }, hand: [4, 4], turn: 0, bo: 1 });
  for (const tier of ['normal', 'hard']) {
    const st = mkst(), a = C.ai(C.view(st, 0), 0, tier, mul(2));
    ok(a && ((a.t === 'place' && a.to === P('F5')) || (a.t === 'move')), `${tier} 는 이기는 수를 둠 ${J(a)}`);
    const t2 = mkst(); C.apply(t2, 0, a); ok(t2.res && t2.res.w === 0, `${tier} 수가 실제로 이김`);
  }
  // 막아야 하는 수: 하양 4개 + 빈 칸 (검정 차례) — 막는 수를 둠
  const blk = () => scene({ stacks: { F1: [1], F2: [1], F3: [1], F4: [1], A1: [0], A2: [0], H5: [0] }, hand: [4, 4], turn: 0, bo: 1 });
  {
    const st = blk(), V = C.view(st, 0), an = C.analyze(V, 0);
    ok(J(an.opp) === J([P('F5')]) || an.opp.includes(P('F5')), '상대가 이기는 칸 F5 를 짚음 ' + J(an.opp));
    const rec = C.recommend(V, 0);
    ok(rec && C.legal(st, 0).some(x => J(x) === J(rec.a)), '추천은 legal');
    ok(rec.tags.includes('block'), '추천 뜻에 막기 ' + J(rec.tags));
    const a = C.ai(V, 0, 'hard', mul(4)); const t2 = blk(); C.apply(t2, 0, a);
    ok(!t2.res || t2.res.w !== 1, '고급 AI 는 막음 (그 수 뒤에 바로 지지 않음) ' + J(a));
    const ex = C.explain(V, 0, { t: 'place', to: P('K2') });
    ok(ex.tags.includes('noBlock') && ex.oppAfter.includes(P('F5')), '막지 않은 수는 noBlock');
  }
  // 내가 이기는 수: 추천 = 이기는 수 + win 태그
  {
    const st = mkst(), rec = C.recommend(C.view(st, 0), 0);
    ok(rec && rec.tags.includes('win') && rec.kind === 'line5', '이기는 수를 추천 ' + J(rec && rec.tags));
    ok(C.analyze(C.view(st, 0), 0).me.includes(P('F5')), '★ = 내가 이기는 칸');
  }
  // judge 값
  {
    const st = blk(), V = C.view(st, 0), j = C.judge(V, 0, { t: 'place', to: P('K2') }, { t: 'place', to: P('F5') });
    ok(j && j.my !== null && j.best !== null && j.best - j.my > 1000, '막지 않은 수가 훨씬 나쁨 ' + J(j));
    const j2 = C.judge(V, 0, { t: 'place', to: P('F5') }, { t: 'place', to: P('F5') });
    ok(j2 && j2.my === j2.best, '같은 수는 같은 값');
  }
  // 통계
  {
    const st = scene({ stacks: { F1: [0], F2: [1, 0], F3: [1, 1, 0], A1: [1] }, hand: [3, 4], turn: 0 });
    const s0 = C.stats(C.view(st, 0), 0);
    ok(s0.stones === 3 + 0 && s0.f1 === 1 && s0.f2 === 1 && s0.f3 === 1 && s0.hand === 3, '통계: 돌 수 · 층별 ' + J(s0));
  }
  // 기본 배치 AI 도 규칙 안
  for (const tier of ['easy', 'normal', 'hard']) {
    const st = C.init({ n: 2, seed: 21 }); const r = mul(5);
    while (st.phase === 'setup') { const s = C.needs(st)[0]; const a = C.ai(C.view(st, s), s, tier, r); ok(a && C.apply(st, s, a).ok, `${tier} 기본 배치`); }
  }
}

// 9) AI 끼리 한 경기를 끝까지 (규칙 위반 · 멈춤 없이)
{
  const n = QUICK ? 6 : 16, kinds = {};
  for (let g = 0; g < n; g++) {
    const st = C.init({ n: 2, seed: 100 + g, cfg: { bo: g % 2 ? 1 : 3 } }), r = mul(g + 1), tiers = [['easy', 'normal', 'hard'][g % 3], ['hard', 'normal', 'easy'][g % 3]];
    let steps = 0, bad = '';
    while (!C.over(st) && steps++ < 4000) {
      const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
      const s = nd[0], a = C.ai(C.view(st, s), s, tiers[s], r), res = a ? C.apply(st, s, a) : { ok: false, err: '수 없음' };
      if (!res.ok) { bad = res.err + ' ' + J(a); break; }
    }
    ok(!bad && C.over(st), `AI 경기 ${g}: ${bad || '끝나지 않음'}`);
    for (const h of st.hist) kinds[h.why + ':' + h.kind] = (kinds[h.why + ':' + h.kind] || 0) + 1;
  }
  console.log('끝난 판 종류', J(kinds));
}

// 💡 추천 = 고급 AI 의 수 · 시간 예산 (이 PC: ai 한 번 150ms · 선생님 계산 200ms 안)
{
  const ms0 = C.TIER.hard.ms, G = QUICK ? 3 : 6; let n = 0, diff = 0; const ta = [], tc = [];
  for (let g = 0; g < G; g++) {
    const st = C.init({ n: 2, seed: 300 + g, cfg: { bo: 1 } }), r = mul(g + 5); let steps = 0;
    while (!C.over(st) && steps++ < 300) {
      const need = C.needs(st); if (!need.length) { C.advance(st); continue; }
      const s = need[0], V = C.view(st, s);
      let t0 = performance.now(); const a = C.ai(V, s, 'hard', r); ta.push(performance.now() - t0);
      if (V.phase === 'play') {
        t0 = performance.now(); const A = C.analyze(V, s); tc.push(performance.now() - t0);
        C.TIER.hard.ms = 0;   // 마감 없이 같은 읽기 (마감은 느린 기기용 안전장치라 같은 수가 아닐 수 있음)
        const h = C.ai(V, s, 'hard', () => 0.5); C.TIER.hard.ms = ms0;
        n++; if (J(h) !== J(A.rec.a)) diff++;
      }
      C.apply(st, s, a);
    }
  }
  ok(n > 40 && diff === 0, `추천 = 고급 AI (같은 고정 난수) — 다른 수 ${diff}/${n}`);
  const q = (arr, p) => arr.slice().sort((x, y) => x - y)[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  ok(q(ta, 0.99) <= 150 && q(tc, 0.99) <= 200, `시간: ai 99% ${Math.round(q(ta, 0.99))}ms (≤150) · 선생님 계산 99% ${Math.round(q(tc, 0.99))}ms (≤200)`);
  ok(Math.max(...ta) <= 220 && Math.max(...tc) <= 300, `시간 최대(느린 PC 여유): ai ${Math.round(Math.max(...ta))}ms · 선생님 ${Math.round(Math.max(...tc))}ms`);
}

console.log(`omok3 core: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

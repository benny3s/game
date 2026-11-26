// 숫자장기 규칙 시험 (node survival/test/gn-numchess_selftest.js [--quick])
//  · 대결 판정 (합 · 차 · 같은 수 · 지뢰 · 왕) · 이동 · 방송 배치 · 방송 대결 12번 재현 · 승리 조건 넷 + 상한 · 되살리기 · 아이템
//  · 숨은 정보 (구경꾼 · 상대가 숨은 것을 못 봄 · 말 번호로 값이 안 드러남) · AI 는 보이는 것만 · 💡 = 고급 AI · 속도 · 복기 약속 · 화면 글
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../games/gn-numchess/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { MINE: M, KING: K } = C;
const cell = n => C.at('ABCDEFGHI'.indexOf(n[0]), +n.slice(1) - 1);
const pieceAt = (st, n) => { const id = st.grid[cell(n)]; return id >= 0 ? st.pcs[id] : null; };

// 장면: [[칸, 자리, 값]] 만 판에 두고 나머지 말은 판 밖(잃은 말). items 기본 = 둘 다 없음
function scene(list, { turn = 0, items, cfg } = {}) {
  const st = C.init({ n: 2, seed: 5, cfg: Object.assign({ items: 1 }, cfg || {}) });
  st.phase = 'play'; st.turn = turn; st.lay = [[1], [1]];
  st.grid.fill(-1);
  for (const p of st.pcs) { p.out = true; p.c = -1; p.rev = true; p.mv = 1; }
  const used = [0, 0];
  for (const [n, s, v, o] of list) {
    const p = st.pcs[s * 14 + used[s]++];
    p.v = v; p.c = cell(n); p.out = false; p.rev = !!(o && o.rev); p.mv = o && o.mv != null ? o.mv : 1; st.grid[p.c] = p.id;
  }
  st.items = items || [{ p: 0, m: 0, b: 0 }, { p: 0, m: 0, b: 0 }];
  return st;
}
const MV = (a, b) => ({ t: 'mv', from: cell(a), to: cell(b) });
function playAI(seed, tiers, cfg, cb) {
  const st = C.init({ n: 2, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 3000) {
    const nd = C.needs(st);
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s);
      if (cb) cb(st, s, V);
      const a = C.ai(V, s, tiers[s], r), res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${st.phase} ${J(a)} ${res.err}`);
      if (C.over(st)) break;
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// ── 1. 대결 판정 ──
{
  const RANK = [11, 10, 0, 9, 1, 8, 2, 7, 3, 6, 4, 5];            // 방송 문서의 합 대결 순서 (0 · 11 은 아이템 값)
  let bad = 0;
  for (let i = 0; i < RANK.length; i++) for (let j = i + 1; j < RANK.length; j++) { const r = C.numDuel(RANK[i], RANK[j], 'sum'); if (!(r[1] && !r[0])) bad++; }
  ok(!bad, `합 대결 순서 11>10>0>9>1>8>2>7>3>6>4>5 (어긋남 ${bad})`);
  bad = 0;
  for (let a = 0; a <= 11; a++) for (let b = a + 1; b <= 11; b++) { const big = (a === 0 && b >= 10) || (a === 1 && b === 11); const r = C.numDuel(a, b, 'minus'); if (big ? !(r[0] && !r[1]) : !(r[1] && !r[0])) bad++; }
  ok(!bad, `차 대결: 작은 수 승, 11>1 · 11>0 · 10>0 만 큰 수 (어긋남 ${bad})`);
  ok(J(C.numDuel(6, 6, 'sum')) === '[true,true]' && J(C.numDuel(3, 3, 'minus')) === '[true,true]', '같은 수 → 둘 다 제거');
  ok(J(C.duel(7, 7, M, M, 'sum')) === '[true,true]' && J(C.duel(M, M, 2, 2, 'minus')) === '[true,true]', '지뢰 → 둘 다 제거');
  ok(J(C.duel(K, K, 9, 9, 'sum')) === '[true,false]' && J(C.duel(1, 1, K, K, 'sum')) === '[false,true]' && J(C.duel(K, K, K, K, 'sum')) === '[false,false]' && J(C.duel(K, K, M, M, 'sum')) === '[true,false]', '왕: 닿으면 잡힘 · 왕끼리는 그대로');
  let mc = 0; for (let x = 0; x < 9; x++) for (let y = 0; y < 5; y++) if (C.isMinus(C.at(x, y), C.at(x, y + 1))) mc++;
  ok(mc === 18 && C.isMinus(cell('D2'), cell('D3')) && C.isMinus(cell('B4'), cell('B5')) && !C.isMinus(cell('E3'), cell('E4')) && !C.isMinus(cell('C2'), cell('D2')), `마이너스 표시 18곳 (2·3줄 · 4·5줄 사이) ${mc}`);
}

// ── 2. 이동 ──
{
  const st = scene([['C3', 0, 5], ['D3', 0, 2], ['B4', 0, M], ['G3', 1, 6], ['F2', 1, 1]]);
  const d = id => C.destOf(st.grid, st.pcs[id].s, st.pcs[id].c, st.pcs[id].v).map(C.cellName).sort().join(',');
  ok(d(pieceAt(st, 'C3').id) === 'C2,C4,D2,D4', `0번 자리 C3: 양옆 · 앞 대각선 (앞이 막혀 1 · 2칸 X) ${d(pieceAt(st, 'C3').id)}`);
  ok(d(pieceAt(st, 'D3').id) === 'D2,D4,E2,E3,E4,F3', `D3: 앞 1 · 2칸 · 앞 대각선 · 양옆 (뒤 X) ${d(pieceAt(st, 'D3').id)}`);
  ok(d(pieceAt(st, 'B4').id) === '', '지뢰는 못 움직임');
  ok(d(pieceAt(st, 'G3').id) === 'E3,F3,F4,G2,G4', `1번 자리는 왼쪽이 앞 ${d(pieceAt(st, 'G3').id)}`);
  const r = C.apply(st, 0, MV('C3', 'B3'));
  ok(!r.ok && /못 가요/.test(r.err), '뒤로는 못 감 ' + r.err);
  ok(!C.apply(st, 0, MV('B4', 'C4')).ok, '지뢰 이동 거절');
  ok(!C.apply(st, 1, MV('G3', 'F3')).ok, '차례가 아니면 거절');
  ok(!C.apply(st, 0, MV('D3', 'D3')).ok && !C.apply(st, 0, { t: 'mv', from: -1, to: 3 }).ok && !C.apply(st, 0, null).ok, '이상한 행동 거절');
}

// ── 3. 방송 배치 (김경훈 A~C · 장동민 G~I) ──
const KIM = { A2: 7, B2: 9, C1: 1, C2: M, A3: 2, B3: 3, C3: 5, A4: K, B4: M, C4: 6, A5: 10, B5: M, C5: 4, B6: 8 };
const JANG = { H1: 6, G2: 5, H2: M, I2: 9, G3: 3, H3: 1, I3: 8, G4: 4, H4: 2, I4: K, G5: M, H5: M, I5: 10, H6: 7 };
const layOf = (s, o) => { const L = Array(18).fill(0); for (const n in o) L[C.cellSlot(s, cell(n))] = o[n]; return L; };
{
  const st = C.init({ n: 2, seed: 9, cfg: {} });
  ok(J(C.needs(st)) === '[0,1]' && st.phase === 'setup', '배치는 둘이 동시에');
  ok(/지뢰 3개/.test(C.apply(st, 0, { t: 'setup', lay: layOf(0, Object.assign({}, KIM, { B4: 0 })) }).err || ''), '배치 검사: 지뢰 수');
  ok(!C.apply(st, 0, { t: 'setup', lay: [1, 2, 3] }).ok, '배치 검사: 18칸');
  ok(C.apply(st, 0, { t: 'setup', lay: layOf(0, KIM) }).ok, '김경훈 배치 OK');
  const v1 = C.view(st, 1), vS = C.view(st, -1);
  ok(v1.lay === null && vS.lay === null && v1.pcs.every(p => p.c === -1) && v1.pcs.filter(p => p.s === 0).every(p => p.v === null), '배치 중엔 상대 배치가 안 보임');
  ok(J(C.needs(st)) === '[1]' && v1.ready[0] === true, '먼저 낸 사람은 기다림 (낸 것만 공개)');
  ok(C.apply(st, 1, { t: 'setup', lay: layOf(1, JANG) }).ok && st.phase === 'play', '장동민 배치 → 시작');
  const all = C.view(st, 'all'), atV = n => { const p = all.pcs.find(q => !q.out && q.c === cell(n)); return p ? p.v : null; };
  ok(Object.keys(KIM).every(n => atV(n) === KIM[n]) && Object.keys(JANG).every(n => atV(n) === JANG[n]), '방송 배치가 그 칸 그대로');
  const v0 = C.view(st, 0), sp = C.view(st, -1);
  ok(v0.pcs.filter(p => p.s === 1).every(p => p.v === null) && v0.pcs.filter(p => p.s === 0).every(p => p.v != null), '내 말만 보임');
  ok(sp.pcs.every(p => p.v === null) && sp.lay === null && sp.sd === null, '구경꾼은 아무 값도 못 봄');
  ok(v0.pub === C.view(st, 1).pub && v0.pub === sp.pub && v0.pub === all.pub, '공개 지문은 모두 같음');
  // 말 번호로 값이 드러나지 않음: 왕을 다른 칸에 두면 왕의 번호가 달라짐
  const st2 = C.init({ n: 2, seed: 9, cfg: {} });
  const K2 = Object.assign({}, KIM, { A4: 2, A3: K });
  C.apply(st2, 0, { t: 'setup', lay: layOf(0, K2) }); C.apply(st2, 1, { t: 'setup', lay: layOf(1, JANG) });
  ok(st.pcs.find(p => p.s === 0 && p.v === K).id !== st2.pcs.find(p => p.s === 0 && p.v === K).id, '말 번호는 칸 순서 (값과 무관)');
}

// ── 4. 방송 대결 12번 (12화 결승 1회전) ──
{
  const gone = (st, n) => !pieceAt(st, n);
  const has = (st, n, s, v) => { const p = pieceAt(st, n); return !!p && p.s === s && p.v === v; };
  const IT = (a, b) => [Object.assign({ p: 0, m: 0, b: 0 }, a), Object.assign({ p: 0, m: 0, b: 0 }, b)];
  // ① 장동민 7 D6→C6 : 김경훈 8(B6) · 4(C5) — 4 · 7 제거, 8 남음
  let st = scene([['D6', 1, 7], ['B6', 0, 8], ['C5', 0, 4], ['A1', 0, 1], ['I1', 1, 2]], { turn: 1 });
  C.apply(st, 1, MV('D6', 'C6'));
  ok(gone(st, 'C6') && gone(st, 'C5') && has(st, 'B6', 0, 8), '① 7 vs 8 (합 15 → 8) · 7 vs 4 (합 11 → 7) — 4 · 7 제거');
  // ② 김경훈 6 D4→E4 : 장동민 4(F4) — 6 승
  st = scene([['D4', 0, 6], ['F4', 1, 4], ['A1', 0, 1], ['I1', 1, 2]]);
  C.apply(st, 0, MV('D4', 'E4'));
  ok(has(st, 'E4', 0, 6) && gone(st, 'F4'), '② 6 vs 4 (합 10 → 큰 수 6)');
  // ③ 장동민 3 F3→E3 BLIND : 김경훈 6(E4) — 3 승, 김경훈은 결과만
  st = scene([['F3', 1, 3], ['E4', 0, 6], ['A1', 0, 1], ['I1', 1, 2]], { turn: 1, items: IT({}, { b: 1 }) });
  C.apply(st, 1, MV('F3', 'E3'));
  ok(st.phase === 'item' && J(C.needs(st)) === '[1]', '③ 아이템이 남은 사람에게만 물음');
  const j3 = pieceAt(st, 'E3').id;
  ok(C.apply(st, 1, { t: 'item', use: [{ k: 'b', id: j3 }] }).ok, '③ BLIND 사용');
  ok(has(st, 'E3', 1, 3) && gone(st, 'E4') && !st.pcs[j3].rev, '③ 3 vs 6 (합 9 → 작은 수 3) · BLIND 말은 공개 안 됨');
  const f3 = C.view(st, 0).log.filter(e => e.k === 'fight').pop(), f3o = C.view(st, 1).log.filter(e => e.k === 'fight').pop();
  ok(f3.va === null && f3.pairs[0].vb === 6 && f3o.va === 3 && C.view(st, 0).pcs[j3].v === null && C.view(st, -1).pcs[j3].v === null, '③ 상대 · 구경꾼은 결과만 (내 3 은 숨김)');
  // ④ 장동민 3 E3→D3 : 김경훈 5(C3 합) · 1(D2 마이너스) — 5 · 3 제거, 1 남음
  st = scene([['E3', 1, 3], ['C3', 0, 5], ['D2', 0, 1], ['A6', 0, 2], ['I1', 1, 2]], { turn: 1 });
  C.apply(st, 1, MV('E3', 'D3'));
  const l4 = st.log.filter(e => e.k === 'fight').pop();
  ok(gone(st, 'C3') && gone(st, 'D3') && has(st, 'D2', 0, 1) && l4.pairs.find(q => q.bc === cell('D2')).t === 'minus', '④ 3 vs 5 (합 8 → 3) · 3 vs 1 (⊖ 차 2 → 1) — 동시에');
  // ⑤ 장동민 1 E2→D2 −1(=0) : 김경훈 1(D1) · 지뢰(C2) — 셋 다 제거
  st = scene([['E2', 1, 1], ['D1', 0, 1], ['C2', 0, M], ['A6', 0, 2], ['I1', 1, 2]], { turn: 1, items: IT({}, { m: 1 }) });
  C.apply(st, 1, MV('E2', 'D2'));
  C.apply(st, 1, { t: 'item', use: [{ k: 'm', id: pieceAt(st, 'D2').id }] });
  ok(gone(st, 'D2') && gone(st, 'D1') && gone(st, 'C2') && st.items[1].m === 0, '⑤ 0 vs 1 (합 1 → 0) · 지뢰 → 셋 다 제거 · −1 소모');
  // ⑥ 장동민 10 G6→F6 : 김경훈 8(E6) +1(=9) — 10 승
  st = scene([['G6', 1, 10], ['E6', 0, 8], ['A1', 0, 1], ['I1', 1, 2]], { turn: 1, items: IT({ p: 1 }, {}) });
  C.apply(st, 1, MV('G6', 'F6'));
  ok(J(C.needs(st)) === '[0]', '⑥ 지키는 쪽도 아이템을 물음');
  C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: pieceAt(st, 'E6').id }] });
  const l6 = st.log.filter(e => e.k === 'fight').pop();
  ok(has(st, 'F6', 1, 10) && gone(st, 'E6') && l6.pairs[0].eb === 9, '⑥ 10 vs 8+1=9 (합 19 → 10)');
  // ⑦ 장동민 2 G4→F4 −1(=1) : 김경훈 3(E4) — 1 승
  st = scene([['G4', 1, 2], ['E4', 0, 3], ['A1', 0, 1], ['I1', 1, 7]], { turn: 1, items: IT({}, { m: 1 }) });
  C.apply(st, 1, MV('G4', 'F4')); C.apply(st, 1, { t: 'item', use: [{ k: 'm', id: pieceAt(st, 'F4').id }] });
  ok(has(st, 'F4', 1, 2) && gone(st, 'E4'), '⑦ 2−1=1 vs 3 (합 4 → 작은 수 1)');
  // ⑧ 김경훈 9 F1→G1 : 장동민 6(H1) — 9 승
  st = scene([['F1', 0, 9], ['H1', 1, 6], ['A6', 0, 1], ['I6', 1, 2]]);
  C.apply(st, 0, MV('F1', 'G1'));
  ok(has(st, 'G1', 0, 9) && gone(st, 'H1'), '⑧ 9 vs 6 (합 15 → 9)');
  // ⑨ 김경훈 9 H1→I1 : 장동민 9(I2) — 둘 다 제거
  st = scene([['H1', 0, 9], ['I2', 1, 9], ['A6', 0, 1], ['I6', 1, 2]]);
  C.apply(st, 0, MV('H1', 'I1'));
  ok(gone(st, 'I1') && gone(st, 'I2') && st.phase === 'play' && st.turn === 1, '⑨ 9 vs 9 → 둘 다 제거 (끝 줄 도착이어도 되살리기 없음)');
  // ⑩ 김경훈 7 G1→H1 : 장동민 지뢰(H2) — 둘 다 제거
  st = scene([['G1', 0, 7], ['H2', 1, M], ['A6', 0, 1], ['I6', 1, 2]]);
  C.apply(st, 0, MV('G1', 'H1'));
  ok(gone(st, 'H1') && gone(st, 'H2'), '⑩ 7 vs 지뢰 → 둘 다 제거');
  // ⑪ 장동민 8 E2→D2 : 김경훈 2(C2) — 8 승
  st = scene([['E2', 1, 8], ['C2', 0, 2], ['A6', 0, 1], ['I6', 1, 3]], { turn: 1 });
  C.apply(st, 1, MV('E2', 'D2'));
  ok(has(st, 'D2', 1, 8) && gone(st, 'C2'), '⑪ 8 vs 2 (합 10 → 8)');
  // ⑫ 김경훈 왕 A4→B3 : 장동민 8(B2) — 왕이 닿아 잡힘 → 장동민 승
  st = scene([['A4', 0, K], ['B2', 1, 8], ['A6', 0, 1], ['I6', 1, 3]]);
  C.apply(st, 0, MV('A4', 'B3'));
  ok(st.over && st.res.w === 1 && st.res.why === 'king' && J(C.ranks(st)) === '[1,0]', '⑫ 왕이 8 에 닿음 → 장동민 승');
}

// ── 5. 승리 조건 · 상한 ──
{
  let st = scene([['H3', 0, K], ['A1', 0, 5], ['A6', 1, 2]]);
  C.apply(st, 0, MV('H3', 'I3'));
  ok(st.over && st.res.w === 0 && st.res.why === 'kingrun', '④ 왕이 상대 끝 줄 → 승');
  st = scene([['D3', 0, 6], ['F3', 1, 4], ['I6', 1, K]]);
  C.apply(st, 0, MV('D3', 'E3'));
  ok(st.over && st.res.w === 0 && st.res.why === 'all', '③ 왕 빼고 다 잡음 → 승');
  st = scene([['D3', 0, 5], ['F3', 1, 5], ['I6', 1, K]]);
  C.apply(st, 0, MV('D3', 'E3'));
  ok(st.over && st.res.w === 0 && st.res.why === 'all', '두 사람이 함께 다 없어지면 움직인 쪽 승');
  st = scene([['A6', 0, 3], ['I1', 1, K], ['H1', 1, M], ['I2', 1, M], ['H2', 1, M]]);
  C.apply(st, 0, MV('A6', 'B6'));
  ok(st.over && st.res.w === 0 && st.res.why === 'stuck', '① 상대가 움직일 수 없음 → 승');
  st = scene([['A6', 0, 3], ['I1', 1, 4]]);
  ok(!C.apply(st, 0, { t: 'timeout' }).ok, '시간 제한 끔이면 timeout 거절');
  st = scene([['A6', 0, 3], ['I1', 1, 4]], { cfg: { limit: 60 } });
  ok(C.apply(st, 0, { t: 'timeout' }).ok && st.res.w === 1 && st.res.why === 'time', '① 60초 안에 못 움직임 → 상대 승');
  st = scene([['A6', 0, 3], ['A1', 0, 2], ['I1', 1, 4]]);
  st.ply = C.MAXPLY - 1;
  C.apply(st, 0, MV('A6', 'B6'));
  ok(st.over && st.res.w === 0 && st.res.why === 'count', '200수 상한 → 남은 말 많은 쪽');
  st = scene([['A6', 0, 3], ['I1', 1, 4]]); st.ply = C.MAXPLY - 1;
  C.apply(st, 0, MV('A6', 'B6'));
  ok(st.over && st.res.w === -1 && J(C.ranks(st)) === '[0,0]', '200수 상한 · 같으면 무승부');
}

// ── 6. 되살리기 ──
{
  let st = scene([['H3', 0, 5], ['A6', 0, 1], ['I6', 1, 2]]);
  const dead9 = st.pcs.find(p => p.s === 0 && p.out); dead9.v = 9;
  C.apply(st, 0, MV('H3', 'I3'));
  ok(st.phase === 'revive' && J(C.needs(st)) === '[0]', '끝 줄 도착 → 되살리기 물음');
  ok(!C.apply(st, 0, { t: 'revive', id: dead9.id, to: cell('B1') }).ok, '맨 끝 줄이 아니면 거절');
  ok(!C.apply(st, 0, { t: 'revive', id: st.pcs.find(p => p.s === 1 && p.out).id, to: cell('A1') }).ok, '상대 말은 못 살림');
  ok(!C.apply(st, 0, { t: 'revive', id: pieceAt(st, 'A6').id, to: cell('A1') }).ok, '판 위의 말은 못 살림');
  const arr = pieceAt(st, 'I3');
  ok(C.apply(st, 0, { t: 'revive', id: dead9.id, to: cell('A1') }).ok, '되살리기');
  ok(has0(st, 'A1', 9) && st.pcs[dead9.id].rev && !pieceAt(st, 'I3') && arr.out && arr.ex && st.turn === 1, '9 가 A1 에 공개로 · 도착한 말은 빠짐 · 차례 넘김');
  const vo = C.view(st, 1);
  ok(vo.pcs[dead9.id].v === 9 && vo.pcs[arr.id].v === null && vo.log.find(e => e.k === 'rev').exv === null, '상대: 되살린 9 는 보이고 빠진 말 값은 안 보임');
  st = scene([['H3', 0, 5], ['A6', 0, 1], ['I6', 1, 2]]);
  st.pcs.forEach(p => { if (p.s === 0 && p.out) p.v = K; });
  C.apply(st, 0, MV('H3', 'I3'));
  ok(st.phase === 'play' && st.turn === 1, '되살릴 말이 없으면 묻지 않음');
  // 되살린 말도 닿으면 대결
  st = scene([['H3', 0, 5], ['A6', 0, 1], ['B1', 1, 3], ['I6', 1, 2]]);
  const d2 = st.pcs.find(p => p.s === 0 && p.out); d2.v = 9;
  C.apply(st, 0, MV('H3', 'I3'));
  C.apply(st, 0, { t: 'revive', id: d2.id, to: cell('A1') });
  ok(has0(st, 'A1', 9) && !pieceAt(st, 'B1'), '되살린 9 가 B1 의 3 과 대결 (합 12 → 9)');
  st = scene([['H3', 0, 5], ['A6', 0, 1], ['I6', 1, 2]]);
  st.pcs.find(p => p.s === 0 && p.out).v = 9;
  C.apply(st, 0, MV('H3', 'I3'));
  ok(C.apply(st, 0, { t: 'revive', skip: true }).ok && has0(st, 'I3', 5) && st.turn === 1, '되살리지 않기 → 말은 그대로');
  function has0(s, n, v) { const p = pieceAt(s, n); return !!p && p.s === 0 && p.v === v; }
}

// ── 7. 아이템 · 동시 선택 숨김 ──
{
  const full = () => [{ p: 1, m: 1, b: 1 }, { p: 1, m: 1, b: 1 }];
  let st = scene([['D3', 0, 6], ['F3', 1, 4], ['F5', 1, M, { mv: 0 }], ['A1', 0, 2]], { items: full() });
  C.apply(st, 0, MV('D3', 'E3'));
  ok(st.phase === 'item' && J(C.needs(st)) === '[0,1]', '대결 → 아이템 남은 두 사람 동시에');
  const mine0 = pieceAt(st, 'E3').id, his = pieceAt(st, 'F3').id;
  ok(/숫자 말에만|이 대결에/.test(C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: his }] }).err || ''), '상대 말에는 못 씀');
  ok(/같이 쓸 수 없어요/.test(C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: mine0 }, { k: 'm', id: mine0 }] }).err || ''), '+1 · −1 한 말에 같이 X');
  ok(/한 번/.test(C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: mine0 }, { k: 'p', id: mine0 }] }).err || ''), '같은 아이템 두 번 X');
  ok(C.apply(st, 1, { t: 'item', use: [{ k: 'm', id: his }] }).ok, '상대가 먼저 고름');
  const v0 = C.view(st, 0), vS = C.view(st, -1), v1 = C.view(st, 1);
  ok(v0.fight.done[1] && v0.fight.mine === null && vS.fight.mine === null && J(v1.fight.mine) === J([{ k: 'm', id: his }]) && !/"m"/.test(J(v0.fight)), '고른 아이템은 둘 다 고르기 전엔 숨김');
  ok(C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: mine0 }] }).ok, '내 +1');
  const L = st.log.filter(e => e.k === 'fight').pop();
  ok(L.ea === 7 && L.pairs[0].eb === 3 && L.use.length === 2, '아이템 반영 값: 6+1=7 · 4−1=3');
}
{
  const st = scene([['D3', 0, 6], ['F3', 1, 4], ['A1', 0, 2], ['I6', 1, 5]], { items: [{ p: 1, m: 1, b: 1 }, { p: 1, m: 1, b: 1 }] });
  C.apply(st, 0, MV('D3', 'E3'));
  C.apply(st, 1, { t: 'item', use: [{ k: 'm', id: pieceAt(st, 'F3').id }] });
  C.apply(st, 0, { t: 'item', use: [{ k: 'p', id: pieceAt(st, 'E3').id }] });
  ok(pieceAt(st, 'E3') && !pieceAt(st, 'F3') && st.items[0].p === 0 && st.items[1].m === 0, '6+1=7 vs 4−1=3 → 합 10 → 7 승 · 아이템 소모');
  const st2 = scene([['D3', 0, 6], ['F3', 1, 4], ['A1', 0, 2], ['I6', 1, 5]], { cfg: { items: 0 }, items: [{ p: 0, m: 0, b: 0 }, { p: 0, m: 0, b: 0 }] });
  C.apply(st2, 0, MV('D3', 'E3'));
  ok(st2.phase === 'play' && st2.turn === 1, '아이템 끔 → 바로 대결');
}

// ── 8. 숨은 정보 · AI 는 보이는 것만 ──
{
  let leaks = 0, n = 0, mutate = 0, pubBad = 0, recBad = 0, aiDiff = 0;
  const games = QUICK ? 6 : 14;
  for (let g = 0; g < games; g++) {
    playAI(200 + g, g % 2 ? ['hard', 'normal'] : ['normal', 'hard'], g % 3 === 0 ? { marks: 1 } : {}, (st, s, V) => {
      n++;
      const o = 1 - s;
      for (const p of V.pcs) if (p.s === o && !p.rev && p.v != null && !st.over) leaks++;
      const sp = C.view(st, -1);
      for (const p of sp.pcs) if (!p.rev && p.v != null) leaks++;
      for (const e of sp.log) if (e.k === 'fight') { for (const id of e.blind || []) if ((id === e.a ? e.va : (e.pairs.find(q => q.b === id) || {}).vb) != null) leaks++; }
      if (V.lay && J(V.lay) !== J(st.lay[s])) leaks++;
      if (sp.pub !== V.pub) pubBad++;
      // view · ai 는 상태를 안 바꿈
      const before = J(st); C.view(st, o); C.ai(C.view(st, s), s, 'hard', mul(3)); if (J(st) !== before) mutate++;
      // 💡 = 고급 AI: rnd 와 상관없이 같은 수
      if (J(C.ai(V, s, 'hard', mul(1))) !== J(C.ai(V, s, 'hard', mul(99))) || J(C.recommend(V, s)) !== J(C.ai(V, s, 'hard', mul(5)))) recBad++;
      // 상대의 숨은 숫자를 바꿔도 내 view · AI 수가 같음
      if (st.phase === 'play' && n % 3 === 0) {
        const t = JSON.parse(J(st));
        const hid = t.pcs.filter(p => p.s === o && !p.rev && !p.out && p.v <= 10 && p.mv > 0);
        if (hid.length >= 2) {
          const vs = hid.map(p => p.v); vs.push(vs.shift()); hid.forEach((p, i) => { p.v = vs[i]; });
          const V2 = C.view(t, s);
          if (J(V2) !== J(V) || J(C.ai(V2, s, 'hard')) !== J(C.ai(V, s, 'hard'))) aiDiff++;
        }
      }
    });
  }
  ok(!leaks, `상대 · 구경꾼이 숨은 값을 못 봄 (${n}번 중 샘 ${leaks})`);
  ok(!pubBad, '공개 지문 같음 ' + pubBad);
  ok(!mutate, 'view · ai 가 상태를 안 바꿈 ' + mutate);
  ok(!recBad, '💡 추천 = 고급 AI (rnd 무관) ' + recBad);
  ok(!aiDiff, '상대 숨은 숫자를 바꿔도 view · 고급 AI 수가 같음 (보이는 것만 씀) ' + aiDiff);
}

// ── 9. AI 확률 모델 · 3단계 · 속도 ──
{
  // 안 움직인 숨은 말이 움직인 숨은 말보다 지뢰일 확률이 큼, 움직인 말은 지뢰 0
  const st = scene([['A1', 0, 5], ['A2', 0, 1], ['G3', 1, 4, { mv: 0 }], ['G4', 1, 6, { mv: 2 }], ['H5', 1, M, { mv: 0 }], ['I4', 1, K, { mv: 0 }]]);
  const rest = [1, 2, 3, 5, 7, 8, 9, 10, M, M];
  st.pcs.filter(p => p.s === 1 && p.out).forEach((p, i) => { p.rev = true; p.v = rest[i]; });
  const V = C.view(st, 0), D = C.analyze(V, 0).Dopp;
  const u = pieceAt(st, 'G3').id, mv = pieceAt(st, 'G4').id;
  ok(D[mv][M] === 0 && D[u][M] > 0.3 && D[u][K] > 0 && D[mv][K] > 0, `지뢰 확률: 안 움직인 말 ${D[u][M].toFixed(2)} · 움직인 말 ${D[mv][M]}`);
  const sum = D[u].reduce((a, b) => a + b, 0);
  // 판 밖 숨은 말: 움직였던 말이면 지뢰 · 왕 0 (BLIND 로 잡힌 공격 말 · 되살리기로 빠진 말)
  const st3 = scene([['A1', 0, 5], ['G3', 1, 4, { mv: 0 }], ['G4', 1, 6, { mv: 0 }], ['I4', 1, K, { mv: 0 }]]);
  const outs = st3.pcs.filter(p => p.s === 1 && p.out), vals = [1, 2, 3, 5, 7, 8, 9, 10, M, M, M];
  outs.forEach((p, i) => { p.v = vals[i]; p.rev = i < 7; p.mv = i === 7 ? 2 : 0; });
  const D3 = C.analyze(C.view(st3, 0), 0).Dopp, moved = outs[7], still = outs[8];
  ok(D3[moved.id][M] === 0 && D3[moved.id][K] === 0 && D3[still.id][M] > 0, `판 밖 움직였던 숨은 말은 지뢰 0 (${D3[moved.id][M]}) · 안 움직인 말 ${D3[still.id][M].toFixed(2)}`);
  ok(Math.abs(sum - 1) < 1e-9, '분포 합 1');
  // 3단계 사다리
  const ladder = (A, B, N) => { let w = 0, d = 0; for (let g = 0; g < N; g++) { const t = g % 2 ? [B, A] : [A, B]; const s = playAI(500 + g, t, {}); const a = g % 2 ? 1 : 0; if (s.res.w < 0) d++; else if (s.res.w === a) w++; } return (w + d / 2) / N; };
  const N = QUICK ? 16 : 40;
  const he = ladder('hard', 'easy', N), hn = ladder('hard', 'normal', N), ne = ladder('normal', 'easy', N);
  const lad = `3단계: 고급 vs 초급 ${(he * 100).toFixed(0)}% · 고급 vs 보통 ${(hn * 100).toFixed(0)}% · 보통 vs 초급 ${(ne * 100).toFixed(0)}% (${N}판씩)`;
  ok(he >= 0.8 && hn >= 0.6 && ne >= 0.65, lad); console.log('·', lad);
  // 속도: ai 150 ms · 선생님 200 ms
  let mx = 0, mc = 0;
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  global.window.SVCores = { 'gn-numchess': C };
  require('../games/gn-numchess/ui.js');
  const U = global.window.SVUI['gn-numchess'];
  for (let g = 0; g < (QUICK ? 3 : 6); g++) playAI(700 + g, ['hard', 'hard'], {}, (st2, s, V2) => {
    let t0 = process.hrtime.bigint(); C.ai(V2, s, 'hard', mul(1)); mx = Math.max(mx, Number(process.hrtime.bigint() - t0) / 1e6);
    t0 = process.hrtime.bigint(); U.coach(V2, s, -1, ['나', 'AI']); mc = Math.max(mc, Number(process.hrtime.bigint() - t0) / 1e6);
  });
  ok(mx < 150 && mc < 200, `속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms`); console.log(`· 속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms`);
}

// ── 10. 복기 약속: core 안 시계 · Math.random 없음 ──
{
  const src = fs.readFileSync(path.join(__dirname, '../games/gn-numchess/core.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random|Date\.now|performance\.now/.test(src), 'core 에 Math.random · Date.now 없음');
  const a = playAI(41, ['normal', 'easy'], {}), b = playAI(41, ['normal', 'easy'], {});
  ok(J(a.log) === J(b.log), '같은 씨앗 → 같은 판');
  const st = C.init({ n: 2, seed: 3, cfg: {} }), before = J(st);
  C.apply(st, 0, { t: 'mv', from: 0, to: 1 }); C.apply(st, 0, { t: 'setup', lay: [] });
  ok(J(st) === before, '실패한 apply 는 상태를 안 바꿈');
}

// ── 11. 화면 글 (Node) ──
{
  const U = global.window.SVUI['gn-numchess'];
  ok(U.howto.length >= 5 && /^🎯 목표/.test(U.howto[0]) && /^준비물/.test(U.howto[1]) && /^진행/.test(U.howto[2]) && /^승패/.test(U.howto[3]) && /^특수/.test(U.howto[4]), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  const T = U.tutorial();
  ok(T.length >= 4 && T.length <= 8 && T.filter(t => t.interactive).length === 1, '1분 규칙 단계 ' + T.length);
  ok(U.opts.find(o => o.k === 'items').def === 1 && U.opts.find(o => o.k === 'limit').def === 0 && U.board === false, '옵션 기본값 (아이템 켬 · 시간 끔) · 한 기기 판 없음');
  let bad = 0, n = 0, recs = 0, recMis = 0, mineTxt = 0;
  for (let g = 0; g < (QUICK ? 4 : 8); g++) {
    const st = playAI(900 + g, ['normal', 'hard'], g % 2 ? { items: 0 } : {}, (s0, s, V) => {
      n++;
      const co = U.coach(V, s, -1, ['나', 'AI<b>']);
      const txt = co.opp + co.mine + co.rec + co.why;
      if (/undefined|NaN|null|\[object|AI<b>/.test(txt) || !co.rec) { bad++; if (bad < 4) console.error(J(co)); }
      if (/지뢰일 확률 [A-I]\d ~\d+% \(\d+턴째 안 움직임\)/.test(co.opp)) mineTxt++;
      const a = C.ai(V, s, 'hard', () => 0.5);
      if (V.phase === 'play' && a) { recs++; if (!co.rec.includes(`${C.cellName(a.from)} → ${C.cellName(a.to)}`)) recMis++; if (!/\d|승리/.test(co.why)) bad++; }
      const t = U.actText(a, V); if (!t || /undefined/.test(t)) bad++;
    });
    const rs = U.result(C.view(st, 0), 0); if (!/(🏆|🤝)/.test(rs) || /undefined|NaN/.test(rs)) { bad++; console.error(rs); }
    const ch = U.chip(C.view(st, 0), 0); if (!ch.t || /undefined/.test(ch.t)) bad++;
  }
  ok(!bad && n > 50 && recs > 20, `선생님 · 결과 글 깨끗함 (${n}번, 내 차례 ${recs}번, 이상 ${bad})`);
  ok(!recMis, '선생님 💡 = 고급 AI 의 수 ' + recMis);
  ok(mineTxt > 5, '선생님: 지뢰일 확률 ~N% (N턴째 안 움직임) 글 ' + mineTxt);
  // 선생님: 대결 승률 숫자
  const s1 = scene([['D3', 0, 9], ['A1', 0, 1], ['F3', 1, 1, { rev: true }], ['I6', 1, 2]]);
  const c1 = U.coach(C.view(s1, 0), 0, -1, ['나', 'AI']);
  ok(/이길 확률 \d+%/.test(c1.why) || /점수/.test(c1.why), '선생님 대결 확률 글 ' + c1.rec + ' / ' + c1.why);
  // 복기: 왕을 상대 말에 붙이는 수 vs 고급 AI
  const s2 = scene([['C3', 0, K], ['A1', 0, 1], ['A6', 0, 4], ['E3', 1, 5, { rev: true }], ['I6', 1, 2]]);
  const V2 = C.view(s2, 0), b2 = C.ai(V2, 0, 'hard'), r2 = U.review(V2, 0, MV('C3', 'D3'), b2);
  ok(r2.sev >= 70 && /왕/.test(r2.why) && /\d/.test(r2.why), '복기: 왕을 상대 말에 붙임 ' + r2.sev + ' ' + r2.why);
  ok(U.review(V2, 0, b2, b2).sev === 0, '같은 수면 0');
  const r3 = U.review(V2, 0, { t: 'timeout' }, b2);
  // 구경꾼 화면의 선생님 글은 공개된 것만 (NaN 없음)
  const sp = C.view(s2, -1), cs = U.coach(sp, -1, -1, ['나', 'AI']);
  ok(!/undefined|NaN|null/.test(J(cs)) && /구경/.test(cs.rec), '구경꾼 선생님 글 ' + J(cs).slice(0, 120));
  // 아이템 복기: 고른 순서가 달라도 같은 수
  const s4 = scene([['D3', 0, 6], ['F3', 1, 4], ['A1', 0, 2], ['I6', 1, 5]], { items: [{ p: 1, m: 1, b: 1 }, { p: 1, m: 1, b: 1 }] });
  C.apply(s4, 0, MV('D3', 'E3'));
  const V4 = C.view(s4, 0), e3 = pieceAt(s4, 'E3').id, A4 = { t: 'item', use: [{ k: 'p', id: e3 }, { k: 'b', id: e3 }] }, B4 = { t: 'item', use: [{ k: 'b', id: e3 }, { k: 'p', id: e3 }] };
  const r4 = U.review(V4, 0, A4, B4), r5 = U.review(V4, 0, { t: 'item', use: [] }, A4);
  ok(r4.sev === 0 && /기대값/.test(r5.why) && r5.sev >= 0 && r5.sev <= 60, '아이템 복기 ' + r4.sev + ' / ' + r5.sev + ' ' + r5.why);
  ok(r3.sev >= 80, '시간 초과 복기 ' + r3.sev);
  ok(U.actText(MV('C3', 'D3'), V2) === '왕 C3 → D3' && U.actText({ t: 'item', use: [] }, V2) === '아이템 안 씀' && U.actText({ t: 'revive', skip: true }) === '되살리지 않음' && U.actText(MV('C3', 'D3'), null) === 'C3 → D3', '행동 글');
  // 배치 추천은 올바른 배치 · 왕 둘레를 지뢰로
  let layBad = 0, sealed = 0;
  for (let sd = 1; sd <= 20; sd++) { const st = C.init({ n: 2, seed: sd, cfg: {} }); for (const s of [0, 1]) { const L = C.ai(C.view(st, s), s, 'hard').lay; if (C.checkLay(L)) layBad++; const k = L.indexOf(K), y = (k / 3) | 0, d = k % 3; const nb = [[y, d + 1], [y - 1, d], [y + 1, d]].filter(([a, b]) => a >= 0 && a < 6 && b < 3); if (d === 0 && nb.every(([a, b]) => L[a * 3 + b] === M)) sealed++; } }
  ok(!layBad && sealed >= 30, `추천 배치 OK · 왕 둘레 지뢰 ${sealed}/40`);
  const se = U.review(C.view(C.init({ n: 2, seed: 1, cfg: {} }), 0), 0, { t: 'setup', lay: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 11, 0, 0, 0, 0] }, { t: 'setup', lay: C.ai(C.view(C.init({ n: 2, seed: 1, cfg: {} }), 0), 0, 'hard').lay });
  ok(se.sev > 0 && /왕 둘레/.test(se.why), '배치 복기 ' + se.sev + ' ' + se.why);
}

console.log(`gn-numchess selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

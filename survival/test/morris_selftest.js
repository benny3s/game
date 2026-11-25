// 나인 멘스 모리스 규칙 시험 (node survival/test/morris_selftest.js [--quick])
'use strict';
const C = require('../games/morris/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const pl = to => ({ t: 'place', to }), mv = (from, to) => ({ t: 'move', from, to }), rm = at => ({ t: 'remove', at });
// 손으로 만든 판: cells 에 말 · hand 남은 말
function scene({ b = [], w = [], hand = [0, 0], turn = 0, bo = 3 } = {}) {
  const st = C.init({ n: 2, seed: 5, cfg: { bo } });
  st.cells.fill(0); b.forEach(p => { st.cells[p] = 1; }); w.forEach(p => { st.cells[p] = 2; });
  st.hand = hand.slice(); st.turn = turn; st.first = turn; st.first0 = turn; st.rem = false; st.mill = null; st.quiet = 0; st.q3 = 0; st.ply = 10;
  return st;
}

// 1) 판 모양
{
  ok(C.XY.length === 24 && C.MILLS.length === 16, '점 24 · 밀 줄 16');
  const per = Array(24).fill(0); C.MILLS.forEach(m => m.forEach(p => per[p]++));
  ok(per.every(x => x === 2), '모든 점은 밀 줄 두 개에 속함');
  let edges = 0, sym = true;
  C.ADJ.forEach((a, p) => { edges += a.length; a.forEach(q => { if (!C.ADJ[q].includes(p)) sym = false; }); });
  ok(edges === 64 && sym, '선 32개 · 이웃은 서로');
  ok(C.ADJ.every(a => a.length >= 2 && a.length <= 4), '이웃 수 2~4');
  // 이웃 = 좌표에서 같은 줄 · 가장 가까운 점 (대각선 없음)
  const diag = C.ADJ.some((a, p) => a.some(q => C.XY[p][0] !== C.XY[q][0] && C.XY[p][1] !== C.XY[q][1]));
  ok(!diag, '대각선 연결 없음');
  ok(C.LBL[0] === 'a7' && C.LBL[23] === 'g1' && C.LBL[9] === 'a4' && C.LBL[16] === 'd3', '칸 이름 a7 · g1 · a4 · d3');
  ok(new Set(C.LBL).size === 24, '칸 이름이 겹치지 않음');
}

// 2) 시작
{
  const firsts = new Set();
  for (let seed = 1; seed <= 30; seed++) { const st = C.init({ n: 2, seed }); firsts.add(st.first); }
  ok(firsts.size === 2, '선공은 씨앗마다 0 · 1 둘 다 나옴');
  const st = C.init({ n: 2, seed: 3 });
  ok(st.cells.every(c => c === 0) && J(st.hand) === J([9, 9]), '빈 판 · 9개씩');
  ok(J(C.needs(st)) === J([st.turn]) && st.turn === st.first, '선공만 입력');
  const L = C.legal(st, st.turn);
  ok(L.length === 24 && L.every(a => a.t === 'place'), '처음엔 24점 어디든 놓기만');
  ok(C.legal(st, 1 - st.turn).length === 0, '차례 아닌 자리는 수 없음');
  ok(J(C.init({ n: 2, seed: 9 })) === J(C.init({ n: 2, seed: 9 })), '같은 seed 는 같은 판');
  ok(C.init({ n: 2, seed: 1, cfg: { bo: 1 } }).bo === 1 && C.init({ n: 2, seed: 1 }).bo === 3, '판 수 옵션 (기본 3판 2선승)');
}

// 3) 놓기
{
  const st = scene({ hand: [9, 9] });
  ok(!C.apply(st, 1, pl(0)).ok, '차례 아님');
  ok(!C.apply(st, 0, mv(0, 1)).ok && /놓을 말/.test(C.apply(st, 0, mv(0, 1)).err), '놓기 단계엔 옮기기 불가');
  ok(!C.apply(st, 0, rm(1)).ok, '밀 없이 빼기 불가');
  ok(!C.apply(st, 0, pl(24)).ok && !C.apply(st, 0, pl(-1)).ok && !C.apply(st, 0, pl(1.5)).ok, '없는 점');
  ok(C.apply(st, 0, pl(4)).ok && st.cells[4] === 1 && st.hand[0] === 8 && st.turn === 1, '검정 놓기 → 하양 차례');
  ok(!C.apply(st, 1, pl(4)).ok, '이미 말이 있는 점');
  ok(C.apply(st, 1, pl(7)).ok && st.cells[7] === 2 && st.turn === 0, '하양 놓기');
  ok(!C.apply(st, 0, null).ok && !C.apply(st, 0, { t: 'jump' }).ok, '이상한 행동');
}

// 4) 밀 → 빼기 (밀에 든 말은 못 뺌, 모두 밀이면 아무거나)
{
  const st = scene({ b: [0, 1], w: [3, 4, 5, 13], hand: [5, 5] });
  ok(C.apply(st, 0, pl(2)).ok && st.rem === true && st.turn === 0, '밀 완성 → 같은 사람이 빼기 차례');
  ok(J(C.needs(st)) === J([0]), '빼기 차례도 같은 사람');
  ok(J(C.legal(st, 0).map(a => a.at)) === J([13]), '뺄 수 있는 말 = 밀 밖의 13 만');
  ok(!C.apply(st, 0, pl(9)).ok, '빼기 차례에 놓기 불가');
  ok(!C.apply(st, 0, rm(4)).ok && /밀/.test(C.apply(st, 0, rm(4)).err), '밀에 든 말은 못 뺌');
  ok(!C.apply(st, 0, rm(0)).ok && !C.apply(st, 0, rm(20)).ok, '내 말 · 빈 점은 못 뺌');
  ok(C.apply(st, 0, rm(13)).ok && st.cells[13] === 0 && !st.rem && st.turn === 1, '빼고 나면 상대 차례');
  ok(st.log.some(e => e.k === 'pl' && e.mill) && st.log.some(e => e.k === 'rm' && e.at === 13), '기록에 밀 · 빼기');
  const s2 = scene({ b: [0, 1], w: [3, 4, 5], hand: [5, 5] });
  C.apply(s2, 0, pl(2));
  ok(J(C.legal(s2, 0).map(a => a.at)) === J([3, 4, 5]), '상대 말이 모두 밀이면 아무 말이나');
  // 두 줄이 한 번에 밀이 돼도 빼기는 1개
  const s3 = scene({ b: [0, 1, 9, 21], w: [3, 13, 16], hand: [3, 3] });
  ok(C.apply(s3, 0, mv(0, 0)).ok === false, '제자리 옮기기 불가');
  const s4 = scene({ b: [1, 2, 9, 21], w: [3, 13, 16], hand: [2, 2] });
  ok(C.apply(s4, 0, pl(0)).ok && s4.rem && s4.mill.length === 2, '두 줄 동시 밀');
  ok(C.apply(s4, 0, rm(3)).ok && s4.turn === 1 && s4.cells.filter(c => c === 2).length === 2, '두 줄이어도 1개만 뺌');
  // 상대가 판 위에 말이 없으면 빼기 없이 넘어감
  const s5 = scene({ b: [0, 1], w: [], hand: [5, 5] });
  ok(C.apply(s5, 0, pl(2)).ok && !s5.rem && s5.turn === 1, '뺄 상대 말이 없으면 그냥 넘어감');
}

// 5) 옮기기 · 날기
{
  const st = scene({ b: [0, 4, 9, 11], w: [1, 7, 13, 16], hand: [0, 0] });
  const L = C.legal(st, 0).map(a => `${a.from}-${a.to}`).sort();
  ok(J(L) === J(['0-1', '4-3', '4-5', '9-10', '9-21', '11-10', '11-15', '11-6'].filter(x => !['0-1'].includes(x)).sort()), '이웃 빈 점으로만: ' + L);
  ok(!C.apply(st, 0, mv(0, 2)).ok && /이웃/.test(C.apply(st, 0, mv(0, 2)).err), '멀리는 못 감');
  ok(!C.apply(st, 0, pl(2)).ok && /다 놓았/.test(C.apply(st, 0, pl(2)).err), '다 놓은 뒤엔 놓기 불가');
  ok(!C.apply(st, 0, mv(1, 2)).ok, '상대 말은 못 옮김');
  ok(C.apply(st, 0, mv(4, 3)).ok && st.cells[3] === 1 && st.cells[4] === 0 && st.turn === 1, '한 칸 옮기기');
  const f = scene({ b: [0, 13, 22], w: [4, 9, 10, 11, 16], hand: [0, 0] });
  const FL = C.legal(f, 0);
  ok(FL.length === 3 * 16 && FL.every(a => a.t === 'move'), '말 3개 = 아무 빈 점으로 날기 (3 × 16)');
  ok(C.apply(f, 0, mv(0, 20)).ok && f.cells[20] === 1 && f.log[f.log.length - 1].fly === true, '날기 기록');
  const nf = scene({ b: [0, 13, 22, 23], w: [4, 9, 10, 11], hand: [0, 0] });
  ok(!C.apply(nf, 0, mv(0, 20)).ok, '말 4개면 날기 불가');
  const pf = scene({ b: [0, 13, 22], w: [4, 9, 10], hand: [2, 2] });
  ok(C.legal(pf, 0).every(a => a.t === 'place'), '놓을 말이 남았으면 3개여도 놓기');
}

// 6) 판 끝 — 말 2개 · 못 움직임
{
  const st = scene({ b: [0, 1, 13], w: [3, 4, 16], hand: [0, 0] });
  ok(C.apply(st, 0, mv(13, 2)).ok && st.rem, '날아서 밀');
  ok(C.apply(st, 0, rm(16)).ok && st.phase === 'between' && st.wins[0] === 1 && st.res.why === 'two' && st.res.w === 0, '상대 말 2개 → 이 판 승');
  ok(C.needs(st).length === 0 && C.auto(st) > 0, '판 사이: 입력 없음 · 자동으로 넘어감');
  const fb = st.first; C.advance(st);
  ok(st.round === 2 && st.phase === 'play' && st.first === 1 - fb && st.turn === st.first && J(st.hand) === J([9, 9]) && st.cells.every(c => !c), '다음 판: 새 판 · 선공 바뀜');
  // 못 움직임: 검정이 6 → 7 로 막으면 하양 0 · 2 · 4 · 23 이 모두 이웃이 막힘 (하양 4개라 날기 없음)
  const blk = scene({ b: [1, 3, 5, 9, 14, 22, 6, 8], w: [0, 2, 4, 23], hand: [0, 0], turn: 0 });
  ok(C.apply(blk, 0, mv(6, 7)).ok && blk.phase === 'between' && blk.res.why === 'block' && blk.res.w === 0, '상대가 움직일 수 없으면 승');
  const fly3 = scene({ b: [1, 3, 5, 9, 14, 22, 6, 8], w: [0, 2, 4], hand: [0, 0], turn: 0 });
  ok(C.apply(fly3, 0, mv(6, 7)).ok && fly3.phase === 'play' && fly3.turn === 1, '말 3개면 날 수 있어서 막혀도 안 짐');
}
// 6-1) 놓기 단계 합계 2개 → 짐
{
  const st = scene({ b: [0, 1, 20], w: [3], hand: [3, 1] });
  ok(C.apply(st, 0, pl(2)).ok && st.rem, '밀');
  ok(C.apply(st, 0, rm(3)).ok && st.phase === 'between' && st.res.why === 'two', '판 위 0 + 놓을 말 1 = 1개 → 짐');
  const s2 = scene({ b: [0, 1, 20], w: [3, 4], hand: [3, 2] });
  C.apply(s2, 0, pl(2)); C.apply(s2, 0, rm(3));
  ok(s2.phase === 'play' && s2.turn === 1, '판 위 1 + 놓을 말 2 = 3개 → 계속');
}

// 7) 교착 10턴 (한쪽 3개 · 빼기 없이 20수) · 100수 상한
{
  const st = scene({ b: [0, 13, 22], w: [3, 7, 10, 15, 17], hand: [0, 0], turn: 0 });
  let n = 0, guard = 0;
  while (st.phase === 'play' && guard++ < 60) {
    const s = st.turn, L = C.legal(st, s).filter(a => a.t === 'move');
    // 밀이 안 되는 수만 골라 둠
    const quiet = L.find(a => { const c = st.cells.slice(); c[a.from] = 0; c[a.to] = s + 1; return !C.inMill(c, a.to); });
    if (!quiet) break;
    ok(C.apply(st, s, quiet).ok, '교착 수'); n++;
  }
  ok(st.phase === 'between' && st.res.why === 'stall3' && st.res.w === 1 && n === 20, `한쪽 3개 · 빼기 없이 20수 → 말 많은 하양 승 (${n}수, ${st.res && st.res.why})`);
  const eq = scene({ b: [0, 13, 22], w: [3, 7, 17], hand: [0, 0], turn: 0 });
  eq.q3 = 19;
  const q = C.legal(eq, 0).find(a => { const c = eq.cells.slice(); c[a.from] = 0; c[a.to] = 1; return !C.inMill(c, a.to); });
  ok(C.apply(eq, 0, q).ok && eq.phase === 'between' && eq.res.w === -1 && eq.wins[0] + eq.wins[1] === 0, '3:3 교착 → 그 판 무승부');
  C.advance(eq);
  ok(eq.round === 2 && eq.phase === 'play', '무승부 판은 다시 함');
  const cap = scene({ b: [0, 4, 9, 11, 22], w: [1, 7, 13, 16, 19], hand: [0, 0], turn: 0 });
  cap.quiet = 99;
  const q2 = C.legal(cap, 0).find(a => { const c = cap.cells.slice(); c[a.from] = 0; c[a.to] = 1; return !C.inMill(c, a.to); });
  ok(C.apply(cap, 0, q2).ok && cap.phase === 'between' && cap.res.why === 'cap' && cap.res.w === -1, '빼기 없이 100수 · 말 수 같음 → 무승부');
  const c2 = scene({ b: [0, 4, 9, 11, 22, 23], w: [1, 7, 13, 16, 19], hand: [0, 0], turn: 0 });
  c2.quiet = 99;
  const q3 = C.legal(c2, 0).find(a => { const c = c2.cells.slice(); c[a.from] = 0; c[a.to] = 1; return !C.inMill(c, a.to); });
  ok(C.apply(c2, 0, q3).ok && c2.res && c2.res.why === 'cap' && c2.res.w === 0, '100수 → 말 많은 쪽 승');
  // 빼기가 있으면 셈을 0 으로
  const r0 = scene({ b: [0, 1, 13], w: [3, 4, 16, 17], hand: [0, 0] }); r0.q3 = 15; r0.quiet = 50;
  C.apply(r0, 0, mv(13, 2)); C.apply(r0, 0, rm(16));
  ok(r0.q3 === 0 && r0.quiet === 0, '빼면 교착 셈이 0');
}

// 8) 판 수 · 무승부 판 다시 · 최대 판
{
  const st = C.init({ n: 2, seed: 4, cfg: { bo: 3 } });
  const winRound = (s, w) => { s.cells.fill(0); s.hand = [0, 0]; const L = w === 0 ? [0, 1, 13] : [3, 4, 16]; const O = w === 0 ? [3, 4, 16] : [0, 1, 13]; L.forEach(p => { s.cells[p] = w + 1; }); O.forEach(p => { s.cells[p] = 2 - w; }); s.turn = w; s.rem = false; C.apply(s, w, mv(w === 0 ? 13 : 16, w === 0 ? 2 : 5)); C.apply(s, w, rm(w === 0 ? 16 : 13)); };
  winRound(st, 0); ok(st.wins[0] === 1 && !st.over, '1판 검정');
  C.advance(st); winRound(st, 1); ok(J(st.wins) === J([1, 1]) && !st.over, '2판 하양');
  C.advance(st); winRound(st, 0); ok(st.over && J(C.ranks(st)) === J([0, 1]) && st.phase === 'end', '먼저 2승 → 끝');
  ok(C.auto(st) === null && C.needs(st).length === 0, '끝난 뒤 자동 진행 없음');
  ok(st.log[st.log.length - 1].k === 'end', '끝 기록');
  const one = C.init({ n: 2, seed: 4, cfg: { bo: 1 } }); winRound(one, 1);
  ok(one.over && J(C.ranks(one)) === J([1, 0]), '단판은 1승으로 끝');
  const dr = C.init({ n: 2, seed: 4, cfg: { bo: 3 } });
  for (let k = 0; k < 5 && !dr.over; k++) { dr.cells.fill(0); dr.hand = [0, 0]; [0, 13, 22].forEach(p => { dr.cells[p] = 1; }); [3, 7, 17].forEach(p => { dr.cells[p] = 2; }); dr.q3 = 19; dr.turn = 0; const a = C.legal(dr, 0).find(x => { const c = dr.cells.slice(); c[x.from] = 0; c[x.to] = 1; return !C.inMill(c, x.to); }); C.apply(dr, 0, a); C.advance(dr); }
  ok(dr.over && dr.round === 5 && J(C.ranks(dr)) === J([0, 0]), '무승부만 5판 → 무승부로 끝');
  ok(dr.hist.length === 5 && dr.hist.every(h => h.w === -1), '판마다 기록');
  // 선공은 판마다 번갈아
  const alt = C.init({ n: 2, seed: 8 }); const f0 = alt.first; winRound(alt, 0); C.advance(alt); const f1 = alt.first;
  ok(f1 === 1 - f0, '2판 선공은 1판 후공');
}

// 9) 보이는 것 · AI 는 view 만
{
  const st = C.init({ n: 2, seed: 12 });
  C.apply(st, st.turn, pl(4));
  const a = C.view(st, 0), b = C.view(st, 1), w = C.view(st, -1), all = C.view(st, 'all');
  ok(a.pub === b.pub && b.pub === w.pub && w.pub === all.pub, '모두 공개 = 자리마다 pub 같음');
  ok(J(a.cells) === J(st.cells) && J(a.hand) === J(st.hand) && a.total[0] + a.total[1] === 18 && a.board[0] + a.board[1] === 1, 'view 에 판 · 놓을 말 · 합계');
  const before = J(st.cells); a.cells.fill(2); a.hand[0] = 0;
  ok(J(st.cells) === before && st.hand[0] + st.hand[1] === 17, 'view 를 고쳐도 판은 그대로 (복사본)');
  const V = C.view(st, st.turn), act = C.ai(V, st.turn, 'normal', mul(3));
  ok(act && C.legal(st, st.turn).some(x => J(x) === J(act)), 'AI 수는 legal 안에서');
  ok(C.ai(V, 1 - st.turn, 'normal', mul(3)) === null, '차례 아니면 AI 없음');
  const st2 = scene({ b: [0, 1], w: [3, 4, 5, 13, 16], hand: [5, 5] }); C.apply(st2, 0, pl(2));
  const ra = C.ai(C.view(st2, 0), 0, 'hard', mul(2));
  ok(ra && ra.t === 'remove' && [13, 16].includes(ra.at), 'AI 빼기 차례엔 빼기 (밀 밖 말)');
}

// 10) AI 가 바로 보이는 것을 놓치지 않음
{
  // 놓기 단계는 양갈래(밀 자리 두 곳)가 많아 고급은 '당장 밀'보다 상대 양갈래를 먼저 막기도 함 → 놓기 장면은 중급으로, 고급은 옮기기 장면으로
  const s1 = scene({ b: [21, 22], w: [3, 4, 13], hand: [5, 6], turn: 0 });
  ok(J(C.ai(C.view(s1, 0), 0, 'normal', mul(1))) === J(pl(23)), 'normal: 밀 완성 자리에 놓음');
  const s2 = scene({ b: [4, 13], w: [21, 22], hand: [6, 6], turn: 0 });
  ok(J(C.ai(C.view(s2, 0), 0, 'normal', mul(1))) === J(pl(23)), 'normal: 상대 밀 자리를 막음');
  const s1h = scene({ b: [21, 22], w: [10], hand: [7, 8], turn: 0 });
  ok(J(C.ai(C.view(s1h, 0), 0, 'hard', mul(1))) === J(pl(23)), 'hard: 받아칠 수 없는 밀은 바로 만듦');
  const mm = scene({ b: [0, 1, 14, 18, 10], w: [6, 8, 15, 17, 22], hand: [0, 0], turn: 0 });
  ok(J(C.ai(C.view(mm, 0), 0, 'normal', mul(1))) === J(mv(14, 2)), 'normal: 옮겨서 밀 완성 (14 → 2)');   // 고급은 6수 앞을 읽고 다른 수를 더 낫게 보기도 함
  // 상대 2개 줄의 말을 뺀다
  const s3 = scene({ b: [0, 1, 20], w: [9, 10, 23], hand: [3, 3], turn: 0 }); C.apply(s3, 0, pl(2));
  for (const t of ['normal', 'hard']) { const x = C.ai(C.view(s3, 0), 0, t, mul(1)); ok(x && x.t === 'remove' && [9, 10].includes(x.at), `${t}: 곧 밀이 될 줄(9 · 10)의 말을 뺌 (${J(x)})`); }
  // 선생님 보조: 위협 · 설명
  const th = C.threatsOf(s2.cells, s2.hand, 1);
  ok(th.length === 1 && th[0].empty === 23, '위협 = 하양 21 · 22 → 23');
  const ex = C.explain(C.view(s2, 0), 0, pl(23));
  ok(ex.tags.includes('block'), '설명: 막기');
  const ex2 = C.explain(C.view(s1, 0), 0, pl(23));
  ok(ex2.tags[0] === 'mill', '설명: 밀');
  // 옮기기 단계 위협은 그 빈 점으로 올 말이 있어야
  const mv1 = scene({ b: [0, 1, 7, 21], w: [9, 10, 13, 16], hand: [0, 0] });
  ok(C.threatsOf(mv1.cells, mv1.hand, 0).some(t => t.empty === 2) === false, '2 에 올 검정 말이 없으면 위협 아님');
  const mv2 = scene({ b: [0, 1, 14, 21], w: [9, 10, 13, 16], hand: [0, 0] });
  const mv3 = scene({ b: [0, 1, 7], w: [9, 10, 13, 16], hand: [0, 0] });
  ok(C.threatsOf(mv3.cells, mv3.hand, 0).some(t => t.empty === 2), '말 3개(날기)면 어디서든 와서 위협');
  ok(C.threatsOf(mv2.cells, mv2.hand, 0).some(t => t.empty === 2 && t.by.includes(14)), '14 → 2 로 오면 밀 = 위협');
}

// 11) AI 끼리 끝까지 — 결정적 · 합법 · 끝남 · 단계 차이
function play(t0, t1, seed, bo = 3) {
  const st = C.init({ n: 2, seed, cfg: { bo } }); const r = mul(seed * 7 + 1); let steps = 0, bad = 0;
  while (!st.over && steps++ < 4000) {
    if (C.auto(st)) { C.advance(st); continue; }
    const s = st.turn, V = C.view(st, s), a = C.ai(V, s, s === 0 ? t0 : t1, r);
    if (!a || !C.legal(st, s).some(x => J(x) === J(a))) { bad++; break; }
    const res = C.apply(st, s, a); if (!res.ok) { bad++; break; }
    // 말 수: 합계는 9 이하 · 판 위 + 놓을 말 + 빠진 말 = 9
    for (const q of [0, 1]) if (C.onBoard(st.cells, q) + st.hand[q] > 9) bad++;
  }
  return { st, bad, steps };
}
{
  const runs = QUICK ? 4 : 10;
  const tiers = [['easy', 'easy'], ['normal', 'easy'], ['easy', 'normal'], ['normal', 'normal']];
  for (const [a, b] of tiers) for (let s = 1; s <= runs; s++) {
    const { st, bad } = play(a, b, s, s % 3 ? 3 : 1);
    ok(st.over && !bad, `${a} vs ${b} seed ${s}: 끝까지 · 합법 (bad ${bad})`);
    ok(st.hist.length >= 1 && st.hist.length <= st.maxR && st.hist.every(h => ['two', 'block', 'stall3', 'cap'].includes(h.why)), `${a} vs ${b} seed ${s}: 판 기록`);
  }
  const x = play('normal', 'easy', 3), y = play('normal', 'easy', 3);
  ok(J(x.st) === J(y.st), '같은 씨앗 · 같은 rnd = 같은 경기');
  // 단계 차이: normal vs easy (자리 바꿔 가며)
  let nw = 0, games = QUICK ? 10 : 30;
  for (let s = 1; s <= games; s++) { const sw = s % 2; const { st } = play(sw ? 'easy' : 'normal', sw ? 'normal' : 'easy', 100 + s); const r = C.ranks(st); const ns = sw ? 1 : 0; if (r[ns] === 0 && r[1 - ns] === 1) nw++; else if (r[0] === r[1]) nw += 0.5; }
  ok(nw / games >= 0.7, `중급이 초급을 70% 이상 이김 (${nw}/${games})`);
  console.log(`· 중급 vs 초급: ${nw}/${games}`);
  if (!QUICK) {
    let hw = 0; const hg = 6;
    for (let s = 1; s <= hg; s++) { const sw = s % 2; const { st } = play(sw ? 'normal' : 'hard', sw ? 'hard' : 'normal', 200 + s); const r = C.ranks(st); const hs = sw ? 1 : 0; if (r[hs] === 0 && r[1 - hs] === 1) hw++; else if (r[0] === r[1]) hw += 0.5; }
    ok(hw / hg >= 0.6, `고급이 중급을 60% 이상 이김 (${hw}/${hg})`);
    console.log(`· 고급 vs 중급: ${hw}/${hg}`);
  }
  // 고급 한 수 시간
  const st = C.init({ n: 2, seed: 77 }); const r = mul(5); let maxMs = 0;
  for (let k = 0; k < 30 && !st.over; k++) { if (C.auto(st)) { C.advance(st); continue; } const t0 = Date.now(); const a = C.ai(C.view(st, st.turn), st.turn, 'hard', r); maxMs = Math.max(maxMs, Date.now() - t0); C.apply(st, st.turn, a); }
  ok(maxMs < 1500, `고급 한 수가 1.5초 안 (${maxMs}ms)`);
  console.log(`· 고급 한 수 최대 ${maxMs}ms`);
}

// 12) 선생님 글 (ui.js 의 coach 를 Node 에서) — 빈 글 · undefined 없음 · 추천 수는 규칙 안 · 조사
{
  global.window = { SVCores: { morris: C } };
  require('../games/morris/ui.js');
  const U = global.window.SVUI.morris;
  let n = 0, maxMs = 0, sawMill = 0, sawBlock = 0;
  for (const seed of QUICK ? [3] : [3, 8, 13]) {
    const st = C.init({ n: 2, seed }); const r = mul(seed); const since = [-1, -1]; let k = 0;
    while (!st.over && k++ < 400) {
      if (C.auto(st)) { C.advance(st); continue; }
      const s = st.turn, V = C.view(st, s);
      if (k % 2 === 0) {
        const t0 = Date.now(), c = U.coach(V, s, since[s], ['나', 'AI']); maxMs = Math.max(maxMs, Date.now() - t0); n++;
        const txt = c.opp + c.mine + c.rec + c.why;
        ok(c.opp && c.mine && c.rec && !/undefined|NaN|null|\[object/.test(txt), `선생님 글 (seed ${seed} 수 ${k}): ${txt.slice(0, 100)}`);
        ok(!/[a-g][1-7] (을|를|으로|로) /.test(txt), `칸 이름 뒤 조사는 붙여 씀: ${txt.slice(0, 120)}`);
        const rec = C.recommend(V, s);
        ok(rec && C.legal(V, s).some(x => J(x) === J(rec.a)), '추천 수는 규칙 안');
        if (rec && rec.tags.includes('mill')) sawMill++;
        if (rec && rec.tags.includes('block')) sawBlock++;
        ok(c.why.length > 5, '👉 수의 뜻이 비지 않음');
        // 다른 자리(상대)의 선생님 글도 오류 없이
        const o = U.coach(C.view(st, 1 - s), 1 - s, -1, ['나', 'AI']);
        ok(/상대 차례/.test(o.rec) || V.phase !== 'play', '상대 차례엔 추천 대신 기다림 글');
      }
      since[s] = st.log[st.log.length - 1].i;
      C.apply(st, s, C.ai(V, s, 'normal', r));
    }
  }
  ok(sawMill > 0 && sawBlock > 0, `추천에 밀 · 막기가 나옴 (밀 ${sawMill} · 막기 ${sawBlock})`);
  ok(maxMs < 1500, `선생님 글 한 번 1.5초 안 (${maxMs}ms)`);
  console.log(`· 선생님 글 ${n}번 · 최대 ${maxMs}ms`);
  // 결과 글
  const st = C.init({ n: 2, seed: 2, cfg: { bo: 1 } }); const r = mul(2);
  while (!st.over) { if (C.auto(st)) { C.advance(st); continue; } C.apply(st, st.turn, C.ai(C.view(st, st.turn), st.turn, 'normal', r)); }
  const html = U.result(C.view(st, 0), 0);
  ok(/판 승/.test(html) && /1판/.test(html) && !/undefined|NaN/.test(html), '결과 글: ' + html.slice(0, 100));
  ok(!/나가 /.test(html) && !/나의 /.test(html), '결과 글 조사 (내가 · 내 말)');
}

console.log(`나인 멘스 모리스 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

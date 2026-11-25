// 컬러턴 규칙 시험 (node survival/test/colorturn_selftest.js)
'use strict';
const C = require('../games/colorturn/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clone = x => JSON.parse(JSON.stringify(x));
const J = JSON.stringify;
// 빈 판 (지뢰 없음) — 칩 · 지뢰를 손으로 놓고 시험
function blank(turn = 0, seed = 1) {
  const st = C.init({ n: 2, seed });
  st.cells.fill(0); st.known.fill(0); st.mine.fill(0); st.placed = [0, 0]; st.turn = st.first = turn; st.lastTo = -1; st.tc = 0;
  return st;
}
const put = (st, cell, col) => { st.cells[cell] = col; return st; };
const mv = (from, to) => ({ t: 'move', from, to }), pl = to => ({ t: 'place', to });

// 1) 시작
{
  const rows = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const st = C.init({ n: 2, seed });
    for (let r = 0; r < 6; r++) { let k = 0; for (let c = 0; c < 6; c++) k += st.mine[r * 6 + c]; ok(k === 3, `가로 줄 ${r} 지뢰 3개 (seed ${seed})`); }
    ok(st.mine.reduce((a, b) => a + b, 0) === 18, '지뢰 18개');
    ok(st.cells.every(c => c === 0) && st.known.every(k => k === 0), '빈 판 · 아무 칸도 안 밟음');
    ok(st.turn === 0 || st.turn === 1, '선공 0 또는 1');
    rows.add(st.mine.join('') + st.turn);
  }
  ok(rows.size > 30, '씨앗마다 지뢰 모양이 다름');
  const a = C.init({ n: 2, seed: 7 }), b = C.init({ n: 2, seed: 7 });
  ok(J(a) === J(b), '같은 seed 는 같은 판');
  const st = C.init({ n: 2, seed: 3 });
  ok(J(C.needs(st)) === J([st.turn]), '선공만 입력');
  ok(C.legal(st, 1 - st.turn).length === 0, '차례 아닌 자리는 수 없음');
  const L = C.legal(st, st.turn);
  ok(L.length === 6 && L.every(a => a.t === 'place'), '처음엔 내 앞 첫 줄 6칸에 배치만');
}

// 2) 배치
{
  const st = blank(0);
  ok(C.apply(st, 0, pl(0)).ok === false, '검정은 위쪽 줄(상대 앞)에 못 올림');
  ok(C.apply(st, 0, pl(14)).ok === false, '가운데 칸에 못 올림');
  ok(C.apply(st, 1, pl(0)).ok === false, '자기 차례가 아님');
  ok(C.apply(st, 0, pl(32)).ok && st.cells[32] === 1 && st.placed[0] === 1 && st.known[32] === 1, '검정 배치 (안전 칸이 드러남)');
  ok(C.apply(st, 1, pl(32)).ok === false, '이미 칩이 있는 칸');
  ok(C.apply(st, 1, pl(2)).ok && st.cells[2] === 2, '하양은 위쪽 첫 줄');
  ok(C.apply(st, 0, pl(2)).ok === false, '검정이 하양 줄에는 못 올림');
  const s2 = blank(0); s2.placed = [7, 0];
  const r = C.apply(s2, 0, pl(30)); ok(!r.ok && /7개/.test(r.err), '칩 7개를 다 올리면 배치 불가: ' + r.err);
  ok(C.legal(s2, 0).every(a => a.t === 'move'), '다 올린 뒤에는 이동만');
  const s3 = blank(0); for (let k = 0; k < 6; k++) put(s3, 30 + k, 2);
  ok(C.legal(s3, 0).every(a => a.t === 'move'), '첫 줄이 가득 차면 배치 칸 없음');
}

// 3) 지뢰 — 배치 · 이동 · 다시 밟기
{
  const st = blank(0); st.mine[31] = 1;
  ok(C.apply(st, 0, pl(31)).ok && st.cells[31] === 2 && st.known[31] === 2, '지뢰 칸에 배치하면 색이 바뀜 (하양이 됨) · 드러남');
  const e = st.log[st.log.length - 1]; ok(e.k === 'place' && e.flip === true, '기록에 색 바뀜이 남음');
  const m = blank(1); m.mine[8] = 1; put(m, 7, 2); put(m, 20, 1);
  ok(C.apply(m, 1, mv(7, 8)).ok && m.cells[8] === 1 && m.cells[7] === 0 && m.known[8] === 2, '이동으로 지뢰를 밟으면 하양 → 검정');
  // 드러난 지뢰는 그대로 — 다음에 밟으면 또 바뀜 (상대가 방금 움직인 칩만 못 고름)
  put(m, 9, 1); put(m, 30, 2);
  ok(C.apply(m, 0, mv(20, 21)).ok, '검정 한 수');
  ok(C.apply(m, 1, mv(30, 31)).ok, '하양 한 수');
  ok(C.apply(m, 0, mv(8, 14)).ok && m.cells[14] === 1, '검정 칩이 지뢰에서 나옴 (일반 칸)');
  ok(C.apply(m, 1, mv(31, 32)).ok, '하양 한 수');
  ok(C.apply(m, 0, mv(9, 8)).ok && m.cells[8] === 2 && m.known[8] === 2, '드러난 지뢰에 검정 칩이 들어가면 다시 하양');
  const q = blank(0); q.mine[10] = 1; put(q, 16, 1);
  ok(C.apply(q, 0, mv(16, 10)).ok && q.cells[10] === 2, '내 칩이 지뢰를 밟아 상대 색이 될 수도 있음');
  const nm = blank(0); put(nm, 16, 1);
  ok(C.apply(nm, 0, mv(16, 10)).ok && nm.known[10] === 1, '지뢰가 아니면 안전 칸으로 기록');
}

// 4) 이동 규칙
{
  const st = blank(0); put(st, 14, 1); put(st, 15, 2); put(st, 0, 2);
  const dests = (s, seat, from) => C.legal(s, seat).filter(a => a.t === 'move' && a.from === from).map(a => a.to).sort((a, b) => a - b);
  ok(J(dests(st, 0, 14)) === J([7, 8, 9, 13, 19, 20, 21]), '8방향 중 빈칸 (15 는 칩이 있어 제외): ' + dests(st, 0, 14));
  ok(J(dests(st, 0, 0)) === J([1, 6, 7]), '구석 칩은 3칸 (상대 칩도 고를 수 있음): ' + dests(st, 0, 0));
  ok(C.apply(st, 0, mv(14, 16)).ok === false, '두 칸은 못 감');
  ok(C.apply(st, 0, mv(14, 15)).ok === false, '칩이 있는 칸으로 못 감');
  ok(C.apply(st, 0, mv(12, 13)).ok === false, '빈칸에서 못 움직임');
  ok(C.apply(st, 0, mv(14, 14)).ok === false, '제자리 불가');
  ok(C.apply(st, 0, mv(0, 1)).ok && st.cells[1] === 2, '내 차례에 상대(하양) 칩도 움직일 수 있음');
  // 직전 이동 칩 금지
  ok(C.apply(st, 1, mv(1, 2)).ok === false && /방금/.test(C.apply(st, 1, mv(1, 2)).err), '상대가 방금 움직인 칩은 못 고름');
  ok(C.legal(st, 1).every(a => a.from !== 1), 'legal 에도 금지된 칩 없음');
  ok(C.apply(st, 1, mv(15, 16)).ok, '다른 칩은 움직임');
  ok(C.apply(st, 0, mv(1, 2)).ok, '내가 움직인 뒤엔 그 칩도 다시 움직일 수 있음 (금지는 상대가 방금 움직인 칩뿐)');
  // 배치는 '이동'이 아니라서 금지가 안 생김
  const p = blank(0); put(p, 14, 2);
  ok(C.apply(p, 0, pl(30)).ok && p.lastTo === -1, '배치 뒤엔 금지 칩 없음');
  ok(C.apply(p, 1, mv(14, 15)).ok && p.lastTo === 15, '이동하면 도착 칸이 금지');
}

// 5) 4목 판정
{
  const win = (blacks, from, to, white) => {
    const st = blank(0); blacks.forEach(c => put(st, c, 1)); (white || []).forEach(c => put(st, c, 2));
    const r = C.apply(st, 0, mv(from, to)); return { st, r };
  };
  let o = win([6, 7, 8, 15], 15, 9);
  ok(o.r.ok && o.st.over && o.st.win === 0 && J(o.st.line) === J([6, 7, 8, 9]), '가로 4목 → 검정 승');
  o = win([1, 7, 13, 26], 26, 19);
  ok(o.st.over && o.st.win === 0 && J(o.st.line) === J([1, 7, 13, 19]), '세로 4목');
  o = win([0, 7, 14, 20], 20, 21);
  ok(o.st.over && o.st.win === 0 && J(o.st.line) === J([0, 7, 14, 21]), '대각선(↘) 4목');
  o = win([5, 10, 15, 21], 21, 20);
  ok(o.st.over && o.st.win === 0 && J(o.st.line) === J([5, 10, 15, 20]), '대각선(↙) 4목');
  o = win([6, 7, 8, 11], 11, 12);
  ok(!o.st.over, '3개만 이어지면 승 아님');
  o = win([6, 7, 8, 15], 15, 9, [9]);
  ok(!o.r.ok, '빈칸이 아니면 못 감');
  o = win([6, 7, 9, 14], 14, 8, [10]);
  ok(o.st.over && J(o.st.line) === J([6, 7, 8, 9]), '옆에 하양이 있어도 4목은 4목 (10 은 하양)');
  o = win([6, 7, 9, 10, 14], 14, 8);
  ok(o.st.over && J(o.st.line) === J([6, 7, 8, 9, 10]), '5목도 모두 인정: ' + o.st.line);
  o = win([6, 7, 8, 15], 15, 9, []);
  ok(o.st.win === 0 && C.ranks(o.st)[0] === 0 && C.ranks(o.st)[1] === 1, '등수 [0,1]');
  o = win([6, 7, 8, 15], 15, 9); const V = C.view(o.st, 0);
  ok(V.win && V.win.seat === 0 && V.win.why === 'line' && J(V.win.line) === J([6, 7, 8, 9]) && V.over && V.needs.length === 0, '승 정보가 view 에 나옴');
  ok(C.apply(o.st, 1, mv(6, 12)).ok === false, '끝난 뒤엔 못 둠');
  // 하양 승
  const w = blank(1); [18, 19, 20, 27].forEach(c => put(w, c, 2)); put(w, 0, 1);
  ok(C.apply(w, 1, mv(27, 21)).ok && w.over && w.win === 1 && J(C.ranks(w)) === J([1, 0]), '하양 4목 → 하양 승');
  // 상대가 움직여서 내 색 4목이 되어도 내가 승
  const g = blank(1); [6, 7, 8, 15].forEach(c => put(g, c, 1)); put(g, 30, 2);
  ok(C.apply(g, 1, mv(15, 9)).ok && g.over && g.win === 0, '하양이 검정 칩을 움직여 검정 4목이 되면 검정 승');
  // 지뢰로 색이 바뀌어 4목
  const f = blank(1); [6, 7, 8].forEach(c => put(f, c, 1)); put(f, 15, 2); f.mine[9] = 1; f.known[9] = 2;
  ok(C.apply(f, 1, mv(15, 9)).ok && f.over && f.win === 0 && f.cells[9] === 1, '하양 칩이 지뢰로 검정이 되어 4목 → 검정 승');
  // 동시에 4목: 움직인 사람이 승 (손으로 둔 판)
  const d = blank(1); [6, 7, 8, 9].forEach(c => put(d, c, 1)); [18, 19, 20, 21].forEach(c => put(d, c, 2)); put(d, 30, 2);
  ok(C.apply(d, 1, mv(30, 31)).ok && d.over && d.win === 1 && J(d.line) === J([18, 19, 20, 21]), '둘 다 4목이면 움직인 사람(하양)이 승');
  const d2 = blank(0); [6, 7, 8, 9].forEach(c => put(d2, c, 1)); [18, 19, 20, 21].forEach(c => put(d2, c, 2)); put(d2, 30, 2);
  ok(C.apply(d2, 0, mv(30, 31)).ok && d2.over && d2.win === 0, '움직인 사람이 검정이면 검정 승');
}

// 6) 무승부 · 넘김 · 끝
{
  const st = blank(0); put(st, 0, 1); put(st, 35, 2); st.tc = 58;
  ok(C.apply(st, 0, mv(0, 1)).ok && !st.over && st.tc === 59, '59턴째');
  ok(C.apply(st, 1, mv(35, 34)).ok && st.over && st.win === -1 && st.why === 'turns', '60턴이 되도록 4목이 없으면 무승부');
  ok(J(C.ranks(st)) === J([0, 0]), '공동 1등');
  // 넘김: 하양은 칩을 다 올렸고 판에는 방금 움직인 칩 하나뿐
  const p = blank(0); put(p, 10, 1); p.placed = [3, 7];
  ok(C.apply(p, 0, mv(10, 11)).ok, '검정 이동');
  ok(p.turn === 0 && p.log.some(e => e.k === 'pass' && e.s === 1) && p.tc === 2 && p.lastTo === -1, '하양은 둘 수 없어 넘김 → 다시 검정 차례');
  ok(C.needs(p)[0] === 0, 'needs 도 검정');
  ok(C.legal(p, 0).some(a => a.t === 'move' && a.from === 11), '넘긴 뒤엔 그 칩도 다시 움직일 수 있음');
  // 칩이 하나도 없고 다 올린 뒤라면 둘 수 있는 수가 없음 (둘 다 막히면 무승부로 끝나는 길의 바탕)
  const z = blank(0); z.placed = [7, 7];
  ok(C.legal(z, 0).length === 0 && C.gen(z.cells, 0, 7, -1).length === 0, '칩이 없으면 둘 수 있는 수가 없음');
}

// 7) 잘못된 입력
{
  const st = blank(0); put(st, 14, 1); const before = J(C.view(st, 0));
  const bad = [null, undefined, 0, 1, 'x', [], {}, { t: 'place' }, { t: 'place', to: '30' }, { t: 'place', to: 30.5 }, { t: 'place', to: -1 }, { t: 'place', to: 36 }, { t: 'place', to: NaN }, { t: 'move', from: 14 }, { t: 'move', to: 15 },
    { t: 'move', from: '14', to: 15 }, { t: 'move', from: 14, to: 15.2 }, { t: 'move', from: 14, to: 99 }, { t: 'move', from: -1, to: 0 }, { t: 'jump', from: 14, to: 15 }, { t: 'move', from: 14, to: null }, { t: 'pass' }];
  for (const a of bad) { let r; try { r = C.apply(st, 0, a); } catch (e) { r = { ok: 'throw ' + e.message }; } ok(r && r.ok === false, '잘못된 입력 거부: ' + J(a)); }
  for (const s of [-1, 2, 'x', null, undefined, 0.5]) ok(C.apply(st, s, pl(30)).ok === false, '잘못된 자리 ' + s);
  ok(J(C.view(st, 0)) === before, '거부된 입력은 판을 바꾸지 않음');
  ok(C.apply(st, 0, pl(30)).ok, '그래도 바른 수는 됨');
}

// 8) 보이는 것 · 지뢰 비누출
function altWorld(st, r) {
  const alt = clone(st);
  for (let row = 0; row < 6; row++) {
    const cs = [0, 1, 2, 3, 4, 5].map(c => row * 6 + c), rev = cs.filter(i => st.known[i] === 2), unk = cs.filter(i => st.known[i] === 0);
    cs.forEach(i => { alt.mine[i] = st.known[i] === 2 ? 1 : 0; });
    for (let i = unk.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [unk[i], unk[j]] = [unk[j], unk[i]]; }
    unk.slice(0, 3 - rev.length).forEach(i => { alt.mine[i] = 1; });
  }
  return alt;
}
{
  const r = mul(99); let differed = 0, leaks = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const st = C.init({ n: 2, seed }), rr = mul(seed);
    for (let k = 0; k < 14 && !st.over; k++) { const L = C.legal(st, st.turn); C.apply(st, st.turn, L[Math.floor(rr() * L.length)]); }
    if (st.over) continue;
    const alt = altWorld(st, r);
    if (J(alt.mine) !== J(st.mine)) differed++;
    for (const seat of [0, 1, -1, 'all']) {
      const a = C.view(st, seat), b = C.view(alt, seat);
      if (J(a) !== J(b)) leaks++;
      ok(a.mines === null && !('mine' in a), '진행 중에는 지뢰 전체를 안 보임');
    }
    for (const tier of ['easy', 'normal', 'hard']) {
      const s = st.turn;
      const x = C.ai(C.view(st, s), s, tier, mul(seed + 5)), y = C.ai(C.view(alt, s), s, tier, mul(seed + 5));
      ok(J(x) === J(y), `AI(${tier}) 가 숨은 지뢰로 수가 달라짐`);
    }
    ok(J(C.recommend(C.view(st, st.turn), st.turn)) === J(C.recommend(C.view(alt, st.turn), st.turn)), '선생님 추천이 숨은 지뢰로 달라짐');
    ok(J(C.analyze(C.view(st, st.turn), st.turn)) === J(C.analyze(C.view(alt, st.turn), st.turn)), '선생님 분석이 숨은 지뢰로 달라짐');
  }
  ok(differed > 25, '시험용 다른 세상이 실제로 다름 (' + differed + ')');
  ok(leaks === 0, '지뢰 위치가 view 에 샘: ' + leaks);
  // 같은 판 → 어느 자리에서 봐도 같은 내용 + 같은 공개 지문
  const st = C.init({ n: 2, seed: 11 }); const rr = mul(3);
  for (let k = 0; k < 9; k++) { const L = C.legal(st, st.turn); C.apply(st, st.turn, L[Math.floor(rr() * L.length)]); }
  const vs = [0, 1, -1, 'all'].map(s => C.view(st, s));
  ok(new Set(vs.map(v => v.pub)).size === 1, '공개 지문이 같음');
  ok(new Set(vs.map(v => J(Object.assign({}, v, { seat: 0 })))).size === 1, '자리마다 내용이 같음 (판이 공개)');
  ok(vs[2].seat === -1 && vs[3].seat === 'all', '구경꾼 · all 보기');
  // view 를 고쳐도 판이 안 바뀜
  const v = C.view(st, 0); v.cells[0] = 9; v.known[0] = 9; v.log.length = 0;
  ok(st.cells[0] !== 9 && st.known[0] !== 9 && st.log.length > 0, 'view 는 복사본');
  // 끝나면 지뢰 전체가 보임
  const e = blank(0); [6, 7, 8, 15].forEach(c => put(e, c, 1)); e.mine[20] = 1; C.apply(e, 0, mv(15, 9));
  ok(C.view(e, -1).mines && C.view(e, -1).mines[20] === 1, '끝난 뒤에는 지뢰가 다 보임');
  // 안 밟은 칸 확률
  const pb = C.mineProb(C.view(C.init({ n: 2, seed: 2 }), 0));
  ok(pb.every(x => Math.abs(x - 0.5) < 1e-9), '처음엔 모든 칸 1/2');
  const q = blank(0); q.known[0] = 2; q.known[1] = 1; const p2 = C.mineProb(C.view(q, 0));
  ok(p2[0] === 1 && p2[1] === 0 && Math.abs(p2[2] - 0.5) < 1e-9, '줄에 지뢰 2개 남고 안 밟은 칸 4개 → 1/2');
  q.known[2] = 2; q.known[3] = 2; const p3 = C.mineProb(C.view(q, 0));
  ok(p3[4] === 0 && p3[5] === 0, '지뢰 3개가 다 드러나면 나머지는 안전');
}

// 9) 선생님 보조
{
  const st = blank(0); [6, 7, 8].forEach(c => put(st, c, 1)); [20, 21, 22].forEach(c => put(st, c, 2));
  const th = C.threats(st.cells);
  ok(th.some(t => t.col === 1 && t.empty === 9) && th.some(t => t.col === 2 && t.empty === 19 && t.cells.includes(20)), '위협(3개 + 빈칸) 찾기: ' + J(th.map(t => [t.col, t.empty])));
  ok(th.filter(t => t.col === 1).length === 1, '검정 위협은 9 하나뿐 (줄 끝이라 왼쪽은 없음)');
  put(st, 15, 1);
  const V = C.view(st, 0), ex = C.explain(V, 0, mv(15, 9));
  ok(ex.tags.includes('win'), '이기는 수 태그: ' + ex.tags);
  const rec = C.recommend(V, 0);
  ok(rec && J(rec.a) === J(mv(15, 9)) && rec.tags.includes('win'), '이기는 수를 추천');
  const an = C.analyze(V, 0);
  ok(an.me.length >= 1 && an.opp.length >= 1 && an.rec && C.legal(st, 0).some(a => J(a) === J(an.rec.a)), '분석에 위협 · 추천이 있음');
  // 막는 수
  const b = blank(0); [20, 21, 22].forEach(c => put(b, c, 2)); put(b, 14, 1); put(b, 3, 1);
  const eb = C.explain(C.view(b, 0), 0, mv(14, 19));
  ok(eb.tags.includes('block'), '상대 위협을 막는 수 태그: ' + eb.tags);
}

// 10) 끝까지 (AI 끼리) — 규칙 어김 없음 · 무한 루프 없음 · 불변식
function inv(st) {
  ok(st.placed[0] <= 7 && st.placed[1] <= 7, '배치 7개 이하');
  ok(st.cells.filter(Boolean).length === st.placed[0] + st.placed[1], '판 위 칩 수 = 배치한 수');
  for (let r = 0; r < 6; r++) { let k = 0; for (let c = 0; c < 6; c++) k += st.mine[r * 6 + c]; ok(k === 3, '지뢰는 줄마다 3개'); }
  for (let i = 0; i < 36; i++) {
    if (st.known[i] === 2) ok(st.mine[i] === 1, 'known=2 는 지뢰'); else if (st.known[i] === 1) ok(st.mine[i] === 0, 'known=1 은 안전');
    if (st.cells[i]) ok(st.known[i] !== 0, '칩이 있는 칸은 밟힌 칸');
  }
}
function playOut(seed, tiers) {
  const st = C.init({ n: 2, seed }), r = mul(seed * 31 + 7); let steps = 0;
  while (!C.over(st) && steps++ < 400) {
    const s = C.needs(st)[0];
    ok(s !== undefined, '입력 자리가 있음');
    const L = C.legal(st, s); ok(L.length > 0, '둘 수 있는 수가 있음 (없으면 넘겨졌어야 함)');
    if (steps % 7 === 0) for (const a of L) { const c = clone(st); ok(C.apply(c, s, a).ok, 'legal 수는 apply 가 받음 ' + J(a)); }
    const a = C.ai(C.view(st, s), s, tiers[s], r);
    ok(L.some(x => J(x) === J(a)), `AI(${tiers[s]}) 수가 legal 안에 있음 ${J(a)}`);
    const res = C.apply(st, s, a); if (!res.ok) { ok(false, 'AI 가 규칙을 어김 ' + res.err); break; }
    if (steps % 3 === 0) ok(C.apply(clone(st), 1 - s, { t: 'place', to: 99 }).ok === false, '이상한 수 거부');
    inv(st);
  }
  ok(C.over(st), `판이 끝남 (seed ${seed}, ${steps}번)`);
  ok(st.tc <= C.MAXTURN, '60턴을 넘기지 않음');
  const R = C.ranks(st); ok(R.length === 2 && R.includes(0), '등수');
  return st;
}
const tierSets = [['easy', 'easy'], ['normal', 'normal'], ['easy', 'normal'], ['normal', 'hard'], ['hard', 'hard']];
for (let k = 0; k < 200; k++) playOut(1000 + k, tierSets[k % 4]);
for (let k = 0; k < 10; k++) playOut(5000 + k, tierSets[4]);
// 같은 seed + 같은 AI → 같은 결과
{ const a = playOut(777, ['hard', 'normal']), b = playOut(777, ['hard', 'normal']); ok(J(a) === J(b), '같은 seed 는 같은 결과'); }

// 11) 단계별 실력 · 시간
{
  const duel = (A, B, n) => {
    const w = { a: 0, b: 0, d: 0 };
    for (let k = 0; k < n; k++) {
      const tiers = k % 2 ? [B, A] : [A, B], seed = 20000 + k, st = C.init({ n: 2, seed }), r = mul(seed * 13 + 1);
      for (let g = 0; g < 300 && !C.over(st); g++) { const s = C.needs(st)[0]; if (!C.apply(st, s, C.ai(C.view(st, s), s, tiers[s], r)).ok) { ok(false, '규칙 어김'); break; } }
      if (st.win < 0) w.d++; else if (tiers[st.win] === A) w.a++; else w.b++;
    }
    return w;
  };
  const he = duel('hard', 'easy', 200), ne = duel('normal', 'easy', 100), hn = duel('hard', 'normal', 40);
  console.log(`고급 대 초급 ${he.a}승 ${he.b}패 ${he.d}무 · 중급 대 초급 ${ne.a}승 ${ne.b}패 ${ne.d}무 · 고급 대 중급 ${hn.a}승 ${hn.b}패 ${hn.d}무`);
  ok(he.a / 200 > 0.6, `고급이 초급을 이김 (승률 ${(he.a / 2).toFixed(0)}%)`);
  ok(ne.a / 100 > 0.5 && ne.b < ne.a, `중급이 초급보다 강함 (${ne.a}승 ${ne.b}패)`);
  ok(hn.b <= hn.a, `고급이 중급에게 더 지지는 않음 (${hn.a}승 ${hn.b}패)`);
  let mx = 0, tot = 0, cnt = 0;
  for (let k = 0; k < 20; k++) {
    const st = C.init({ n: 2, seed: 30000 + k }), r = mul(k + 1);
    while (!C.over(st)) { const s = C.needs(st)[0], V = C.view(st, s), t0 = process.hrtime.bigint(), a = C.ai(V, s, 'hard', r), ms = Number(process.hrtime.bigint() - t0) / 1e6; mx = Math.max(mx, ms); tot += ms; cnt++; C.apply(st, s, a); }
  }
  console.log(`고급 한 수 평균 ${(tot / cnt).toFixed(1)}ms · 가장 오래 ${mx.toFixed(0)}ms`);
  ok(mx < 300, '고급 한 수가 300ms 안쪽');
}

console.log(`컬러턴 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

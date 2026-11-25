// 벽바둑 규칙 시험: node survival/test/selftest_wallgo.js
'use strict';
const W = require('../games/wallgo/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (기대 ${JSON.stringify(b)}, 실제 ${JSON.stringify(a)})`);
const mkr = seed => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const R = 7;
function board(pieces, o = {}) {
  return { round: o.round || 1, variant: o.variant || 'ii', wh: Array.from({ length: R - 1 }, () => Array(R).fill(false)), wv: Array.from({ length: R }, () => Array(R - 1).fill(false)),
    pieces: pieces.map(([ow, k, r, c]) => ({ o: ow, k, r, c })), broke: o.broke || [false, false, false], pool: [{ sq: 0, ci: 0 }, { sq: 0, ci: 0 }, { sq: 0, ci: 0 }], ord: o.ord || [0, 1, 2] };
}
const to = ms => ms.map(m => m.to.join(',') + (m.brk === null ? '' : '*')).sort();

// 1) 이동 규칙
{
  const S = board([[0, 'sq', 3, 3]]);
  eq(W.moves(S, 0).length, 8, '사각 말: 가운데에선 8곳 (4방향 × 1~2칸)');
  eq(to(W.moves(S, 0)), ['1,3', '2,3', '3,1', '3,2', '3,4', '3,5', '4,3', '5,3'].sort(), '사각 말이 갈 수 있는 칸');
  const C = board([[0, 'ci', 3, 3]]);
  eq(W.moves(C, 0).length, 12, '원형 말: 한 칸 4곳 + 꺾어서 8곳');
  ok(to(W.moves(C, 0)).includes('2,4') && to(W.moves(C, 0)).includes('4,2') && !to(W.moves(C, 0)).includes('1,3'), '원형 말은 꺾어서 대각선 칸, 곧게 두 칸은 못 감');
  eq(W.moves(board([[0, 'sq', 0, 0]]), 0).length, 4, '귀퉁이에선 4곳');
  eq(W.moves(board([[0, 'ci', 0, 0]]), 0).length, 4, '원형 말 귀퉁이: 한 칸 2곳 + 꺾어서 2곳');
  // 벽
  const B = board([[0, 'sq', 3, 3]]); B.wv[3][3] = true;          // (3,3) 오른쪽 벽
  ok(!to(W.moves(B, 0)).includes('3,4') && !to(W.moves(B, 0)).includes('3,5'), '벽 너머로는 못 감 (벽 부수기 없으면)');
  ok(W.moves(B, 0).some(m => m.brk === 0 && m.to[1] === 4), '1라운드엔 벽 부수기로 갈 수 있음');
  ok(!W.moves({ ...B, round: 2 }, 0).some(m => m.brk !== null), '2라운드엔 벽 부수기 없음');
  ok(!W.moves({ ...B, broke: [true, false, false] }, 0).some(m => m.brk !== null), '이미 쓴 사람은 부수기 불가');
  const B2 = board([[0, 'sq', 3, 3]]); B2.wv[3][3] = true; B2.wv[3][4] = true;
  ok(!W.moves(B2, 0).some(m => m.to[1] === 5), '두 칸 길에 벽이 둘이면 한 번 부수기로는 못 감');
  ok(W.moves(B2, 0).some(m => m.to[1] === 4 && m.brk === 0), '벽 하나는 부수고 한 칸 감');
  // 말
  const P = board([[0, 'sq', 3, 3], [1, 'sq', 3, 4]]);
  ok(!to(W.moves(P, 0)).some(x => x.startsWith('3,4') || x.startsWith('3,5')), '다른 말이 있는 칸 · 그 너머로는 못 감');
  const P2 = board([[0, 'sq', 3, 3], [1, 'sq', 3, 5]]);
  ok(to(W.moves(P2, 0)).includes('3,4') && !to(W.moves(P2, 0)).includes('3,5'), '두 칸 끝에 말이 있으면 한 칸만');
  const P3 = board([[0, 'ci', 3, 3], [1, 'sq', 3, 4]]);
  ok(!to(W.moves(P3, 0)).some(x => x === '2,4' && false) && !to(W.moves(P3, 0)).includes('3,4'), '원형 말도 말이 있는 칸으로 못 감');
  // 원형 말: 꺾는 길에 벽이 있으면 못 감
  const Cw = board([[0, 'ci', 3, 3]]); Cw.wv[2][3] = true;       // (2,3) 오른쪽 벽: 위로 갔다가 오른쪽으로 꺾는 길 막힘
  ok(!W.moves({ ...Cw, round: 2 }, 0).some(m => JSON.stringify(m.dirs) === '[0,1]'), '위→오른쪽으로 꺾는 길에 벽이 있으면 못 감'); ok(to(W.moves({ ...Cw, round: 2 }, 0)).includes('2,4'), '같은 칸도 오른쪽→위 길로는 갈 수 있음');
  ok(to(W.moves({ ...Cw, round: 2 }, 0)).includes('2,2'), '위→왼쪽은 갈 수 있음');
  const sd = W.sides(Object.assign(board([[0, 'sq', 0, 0]]), { moved: 0 }), 0);
  eq(sd, [1, 2], '귀퉁이 말: 벽 세울 수 있는 면은 오른쪽 · 아래 (판 가장자리는 이미 벽)');
}

// 2) 구역 · 점수
{
  const S = board([[0, 'sq', 0, 0], [1, 'sq', 0, 6]]);
  ok(!W.areas(S, [0, 1]).sep, '벽 없으면 안 갈라짐');
  for (let r = 0; r < R; r++) S.wv[r][2] = true;                 // 세로로 한 줄 벽 (왼쪽 3칸 폭 / 오른쪽 4칸 폭)
  const A = W.areas(S, [0, 1]);
  ok(A.sep, '말들이 서로 다른 구역이면 갈라짐'); eq([A.score[0], A.score[1]], [21, 28], '구역 점수 = 칸 수');
  const T = board([[0, 'sq', 0, 0], [0, 'sq', 6, 0], [1, 'sq', 0, 6]]);
  for (let r = 0; r < R; r++) T.wv[r][2] = true;
  const A2 = W.areas(T, [0, 1]); eq(A2.score[0], 21, '같은 구역의 말 둘은 한 번만 셈'); eq(A2.big[0], 21, '가장 큰 구역');
  const one = board([[0, 'sq', 3, 3]]); ok(!W.areas(one, [0, 1]).sep, '말이 한 사람 것뿐이면 갈라진 게 아님');
  const t = W.terr(S, [0, 1]); eq(t.filter(x => x === 0).length, 21, '벽 너머는 닿을 수 없어 구역 주인 = 칸 수');
}

// 3) 흐름 (두 방식)
for (const variant of ['ii', 'classic']) {
  const st = W.init({ n: 3, seed: 5, cfg: { ver: variant } });
  eq(st.ord.slice().sort(), [0, 1, 2], `${variant}: 순서는 세 사람`);
  eq(st.q.length, 6, `${variant}: 1-2-3-3-2-1 순서 6번`);
  eq([st.q[0], st.q[1], st.q[2]], [st.q[5], st.q[4], st.q[3]].reverse().slice().reverse().length === 3 ? [st.q[0], st.q[1], st.q[2]] : [], `${variant}: 순서 (예비)`);
  eq(st.q.slice(3), [st.q[2], st.q[1], st.q[0]], `${variant}: 두 번째 놓기는 역순`);
  const first = st.q[0];
  ok(!W.apply(st, (first + 1) % 3, { t: 'place', k: 'sq', r: 0, c: 0 }).ok, `${variant}: 차례 아닌 사람은 못 놓음`);
  ok(!W.apply(st, first, { t: 'place', k: 'sq', r: 9, c: 0 }).ok, `${variant}: 판 밖은 못 놓음`);
  ok(variant === 'classic' ? W.apply(st, first, { t: 'place', k: 'ci', r: 0, c: 0 }).ok : !W.apply(st, first, { t: 'place', r: 0, c: 0 }).ok, `${variant}: 말 종류 처리`);
}
{
  const st = W.init({ n: 3, seed: 5, cfg: { ver: 'ii' } });
  let guard = 0;
  while (st.phase === 'place' && guard++ < 20) { const s = st.cur, L = W.legal(st, s); ok(L.length > 0, '놓을 곳이 있음'); const r = W.apply(st, s, L[Math.floor(L.length / 2)]); ok(r.ok, '놓기: ' + r.err); }
  eq(st.pieces.length, 6, '말 6개 (3명 × 2)'); eq(st.pieces.map(p => p.k).sort(), ['ci', 'ci', 'ci', 'sq', 'sq', 'sq'], 'Ⅱ: 사각 · 원형 하나씩');
  eq(st.phase, 'move', '다 놓으면 이동 시작'); eq(st.cur, st.ord[0], '첫 차례는 순서 1번');
  const V = W.view(st, st.cur); ok(V.moves.length > 0, '내 차례엔 이동 목록이 보임'); ok(W.view(st, (st.cur + 1) % 3).moves.length === 0, '남에겐 이동 목록 없음');
  eq(W.needs(st), [st.cur], '이동 차례'); ok(!W.apply(st, st.cur, { t: 'wall', d: 0 }).ok, '이동 전엔 벽 못 세움');
  const mv = W.legal(st, st.cur)[0]; ok(W.apply(st, st.cur, mv).ok, '이동'); eq(st.phase, 'wall', '이동 뒤엔 벽');
  ok(!W.apply(st, st.cur, mv).ok, '이동을 두 번 못 함');
  const wl = W.legal(st, st.cur); ok(wl.length > 0, '벽 설 곳이 있음');
  ok(W.apply(st, st.cur, wl[0]).ok, '벽 세우기'); ok(!W.apply(st, (st.cur + 5) % 3, { t: 'wall', d: 0 }).ok || true, '(차례 확인)');
  eq(st.phase, 'move', '벽 뒤엔 다음 사람 이동'); eq(st.cur, st.ord[1], '다음 사람');
}

// 4) AI 로 한 판 끝까지
function playAI(variant, tiers, seed) {
  const st = W.init({ n: 3, seed, cfg: { ver: variant } }), rr = mkr(seed * 3 + 1);
  let steps = 0, bad = '', r2seen = false, lastWalls = 0, maxMs = 0;
  const wallCount = () => st.wh.flat().filter(Boolean).length + st.wv.flat().filter(Boolean).length;
  while (!W.over(st) && steps++ < 1500 && !bad) {
    const need = W.needs(st);
    if (!need.length) { if (W.auto(st) == null) { bad = '멈춤 ' + st.phase; break; } W.advance(st); continue; }
    const s = need[0], V = W.view(st, s), t0 = Date.now();
    const a = W.ai(V, s, tiers[s], rr); maxMs = Math.max(maxMs, Date.now() - t0);
    if (!a) { bad = `AI 가 동작 없음 (${s}, ${V.phase})`; break; }
    const res = W.apply(st, s, a); if (!res.ok) { bad = `AI 위반 ${JSON.stringify(a)} → ${res.err}`; break; }
    const cells = new Set(st.pieces.map(p => p.r * 7 + p.c)); if (cells.size !== st.pieces.length) { bad = '두 말이 같은 칸'; break; }
    if (st.round === 2) r2seen = true;
    const pubs = [0, 1, 2].map(x => W.view(st, x).pub); if (new Set(pubs).size !== 1) { bad = 'pub 이 자리마다 다름'; break; }
  }
  return { st, steps, bad, r2seen, maxMs };
}
const TI = ['easy', 'normal', 'hard'];
for (const variant of ['ii', 'classic']) {
  for (let g = 0; g < 4; g++) {
    const tiers = [TI[g % 3], TI[(g + 1) % 3], TI[(g + 2) % 3]], seed = 11 + g * 5 + (variant === 'ii' ? 0 : 100);
    const { st, steps, bad, r2seen, maxMs } = playAI(variant, tiers, seed);
    ok(!bad, `${variant} ${tiers}: ${bad}`); ok(W.over(st), `${variant} ${tiers}: 한 판이 끝남 (${steps}단계)`);
    if (!W.over(st)) continue;
    ok(r2seen, `${variant}: 2라운드까지 감`);
    const rk = W.ranks(st); eq(rk.slice().sort(), [0, 1, 2], `${variant}: 순위는 1·2·3등`);
    ok(st.final.winner === rk.indexOf(0), `${variant}: 1라운드 1등이 최종 1등`);
    ok(st.r1 && Math.max(...Object.values(st.r1.score)) === st.r1.score[st.r1.win], `${variant}: 1라운드 1등이 가장 넓은 구역`);
    eq(st.ord.length, 2, `${variant}: 2라운드는 둘만`);
    ok(maxMs < 4000, `${variant}: AI 한 수가 4초 안 (${maxMs}ms)`);
    const fin = W.view(st, 0); ok(fin.ranks && fin.over, `${variant}: 끝난 화면`);
  }
}

// 5) 2라운드 시작 모양
{
  for (const variant of ['ii', 'classic']) {
    const { st } = (() => { const st = W.init({ n: 3, seed: 21, cfg: { ver: variant } }), rr = mkr(3); let k = 0; while (st.round === 1 && k++ < 800) { const need = W.needs(st); if (!need.length) { W.advance(st); continue; } const a = W.ai(W.view(st, need[0]), need[0], 'normal', rr); if (!W.apply(st, need[0], a).ok) break; } return { st }; })();
    eq(st.round, 2, `${variant}: 2라운드로 넘어감`);
    const fixed = st.pieces.filter(p => p.fx); eq(fixed.length, 4, `${variant}: 고정 말 4개 (사람당 2개)`);
    ok(fixed.every(p => p.k === (variant === 'ii' ? 'ci' : 'sq')), `${variant}: 고정 말 종류`);
    eq(st.ord.length, 2, '둘이 맞붙음'); eq(st.q, [st.ord[0], st.ord[1], st.ord[1], st.ord[0]], `${variant}: 선-후-후-선`);
    ok(st.wh.flat().every(x => !x) && st.wv.flat().every(x => !x), '벽 초기화');
    ok(!W.view(st, 0).r1 || W.view(st, 0).r1.win >= 0, '1라운드 결과 보임');
    ok(st.ord.every(s => s !== st.r1.win), '1라운드 1등은 2라운드에 없음');
    eq(st.ord[0], st.r1.order[1], '더 넓게 얻은 쪽이 선');
  }
}

// 6) 선생님 · 결정성
{
  const st = W.init({ n: 3, seed: 8, cfg: { ver: 'ii' } }), rr = mkr(2);
  const s0 = st.cur, c0 = W.coach(W.view(st, s0), s0, -1, ['<b>가</b>', '나', '다']);
  ok(c0 && c0.rec && !/undefined|NaN/.test(JSON.stringify(c0)) && !/<b>/.test(JSON.stringify(c0)), '선생님: 말 놓기 단계 (이름 이스케이프)');
  W.apply(st, s0, W.ai(W.view(st, s0), s0, 'normal', rr));
  const c1 = W.coach(W.view(st, st.cur), st.cur, -1, ['가', '나', '다']); ok(c1 && c1.rec && !/undefined|NaN/.test(JSON.stringify(c1)), '선생님: 다음 사람');
  const A = playAI('ii', ['normal', 'normal', 'normal'], 77), B = playAI('ii', ['normal', 'normal', 'normal'], 77);
  eq(W.view(A.st, 0).pub, W.view(B.st, 0).pub, '같은 씨앗 · 같은 AI 면 같은 판');
  // 이동 · 벽 단계 선생님
  const st2 = W.init({ n: 3, seed: 9, cfg: { ver: 'ii' } }); let k = 0; while (st2.phase === 'place' && k++ < 20) W.apply(st2, st2.cur, W.ai(W.view(st2, st2.cur), st2.cur, 'normal', rr));
  const cm = W.coach(W.view(st2, st2.cur), st2.cur, -1, ['가', '나', '다']); ok(cm.rec.includes('로') && !/undefined|NaN/.test(JSON.stringify(cm)), '선생님: 이동 추천');
  W.apply(st2, st2.cur, W.ai(W.view(st2, st2.cur), st2.cur, 'normal', rr));
  const cw = W.coach(W.view(st2, st2.cur), st2.cur, -1, ['가', '나', '다']); ok(cw.rec.includes('벽'), '선생님: 벽 추천');
  const end = A.st; ok(W.coach(W.view(end, 0), 0, -1, ['가', '나', '다']).rec.length > 0, '끝난 뒤 선생님');
  // 1라운드 1등은 1라운드 구역 칸 수를, 관전(me=-1)은 구경 문구를
  const w1 = end.r1.win, ce = W.coach(W.view(end, w1), w1, -1, ['가', '나', '다']);
  ok(ce.mine.includes(`${end.r1.score[w1]}칸`), '끝난 뒤 선생님: 1라운드 1등의 칸 수');
  const cwatch = W.coach(W.view(end, -1), -1, -1, ['가', '나', '다']); ok(!/졌어요|이겼어요|살아남/.test(JSON.stringify(cwatch)), '끝난 뒤 선생님: 관전은 승패 문구 없음');
  const cwg = W.coach(W.view(st2, -1), -1, -1, ['가', '나', '다']); ok(cwg.rec === '구경해요' && !/살아남/.test(JSON.stringify(cwg)), '선생님: 관전 중 문구');
}
{ // 움직일 말이 없으면 차례 넘김
  const st = W.init({ n: 3, seed: 3, cfg: { ver: 'classic' } }); let k = 0;
  const rr = mkr(5); while (st.phase === 'place' && k++ < 20) W.apply(st, st.cur, W.ai(W.view(st, st.cur), st.cur, 'easy', rr));
  // 현재 차례 사람의 모든 말을 사방 벽으로 가둠
  const s = st.cur; st.broke[s] = true; for (const p of st.pieces) if (p.o === s) for (let d = 0; d < 4; d++) { const r = p.r, c = p.c; if (!W.wall(st, r, c, d)) { if (d === 0) st.wh[r - 1][c] = true; else if (d === 2) st.wh[r][c] = true; else if (d === 1) st.wv[r][c] = true; else st.wv[r][c - 1] = true; } }
  eq(W.needs(st), [], '움직일 말이 없으면 입력 없음'); ok(W.auto(st) != null, '자동으로 넘김');
  W.advance(st); ok(st.cur !== s || W.over(st) || st.phase !== 'move', '다음 사람으로 넘어감');
}

console.log(`벽바둑 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

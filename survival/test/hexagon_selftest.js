// 헥사곤 규칙 시험 (node survival/test/hexagon_selftest.js [--quick])
'use strict';
const C = require('../games/hexagon/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const NO = C.NO_BUZZ, L = C.LET;
const idx = s => s.split('').map(ch => L.indexOf(ch));
const BOARD = [2, 5, 1, 4, 3, 3, 2, 1, 6, 2, 1, 3, 4, 1, 2, 3, 6, 2, 4];
const fixed = (extra) => C.init({ n: 2, seed: 1, cfg: Object.assign({ board: BOARD, target: 9 }, extra || {}) });
const ready = st => { C.apply(st, 0, { t: 'ready' }); C.apply(st, 1, { t: 'ready' }); };
const buzz = (st, m0, m1) => { C.apply(st, 0, { t: 'buzz', ms: m0 }); C.apply(st, 1, { t: 'buzz', ms: m1 }); };
function playAI(seed, tiers, cfg) {
  const st = C.init({ n: 2, seed, cfg }); let guard = 0;
  while (!C.over(st) && guard++ < 3000) {
    const need = C.needs(st);
    if (!need.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    const s = need[0], a = C.ai(C.view(st, s), s, tiers[s]), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err} (${st.phase})`);
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 판 모양: 19칸 (3 · 4 · 5 · 4 · 3) · 세 칸 줄 27개 · 가운데 칸은 가운데로
{
  ok(C.CELL.length === 19 && J([0, 1, 2, 3, 4].map(r => C.CELL.filter(c => c.row === r).length)) === '[3,4,5,4,3]', '칸 19개 · 줄마다 3 · 4 · 5 · 4 · 3');
  ok(C.LINES.length === 27 && [0, 1, 2].every(d => C.LINES.filter(x => x.d === d).length === 9), '줄 27개 (방향마다 9개)');
  ok(C.LINE_OF.size === 54, '줄마다 두 방향 (ABC · CBA)');
  ok(C.LINE_OF.has(idx('ABC').join(',')) && C.LINE_OF.has(idx('CBA').join(',')) && !C.LINE_OF.has(idx('BCA').join(',')) && !C.LINE_OF.has(idx('ACB').join(',')), 'ABC · CBA 는 되고 BCA · ACB 는 안 됨');
  ok(C.LINE_OF.has(idx('HIJ').join(',')) && C.LINE_OF.has(idx('BFK').join(',')) && C.LINE_OF.has(idx('CFJ').join(',')) && !C.LINE_OF.has(idx('ABD').join(',')) && !C.LINE_OF.has(idx('AEJ').join(',')) === false, '가로 HIJ · 대각선 BFK · CFJ');
  ok(!C.LINE_OF.has(idx('AFL').join(',')) && !C.LINE_OF.has(idx('CDE').join(',')), '꺾인 · 떨어진 세 칸은 줄이 아님');
  ok(C.lineName(C.LINE_OF.get(idx('JKL').join(','))) === 'JKL', '줄 이름');
}

// 2) 처음 상태 · 숫자 범위 · 타깃
{
  const st = C.init({ n: 5, seed: 7 });
  ok(st.n === 2 && st.round === 1 && st.phase === 'look' && J(C.needs(st)) === '[0,1]' && J(st.score) === '[0,0]', '1라운드 · 외우기부터 · 언제나 2명');
  ok(st.R === 10 && st.opt.look === 30 && st.opt.limit === 10, '기본 10라운드 · 30초 · 10초 (방송)');
  ok(C.maxNum(1, 10) === 6 && C.maxNum(3, 10) === 6 && C.maxNum(4, 10) === 7 && C.maxNum(7, 10) === 8 && C.maxNum(10, 10) === 10 && C.maxNum(11, 10) === 9, '라운드별 숫자 범위 (6 → 10)');
  let bad = 0, cnt = {};
  for (let s = 1; s <= 300; s++) {
    const t = C.init({ n: 2, seed: s }), n = t.ans.length;
    cnt[n] = (cnt[n] || 0) + 1;
    if (n < 1 || n > 6 || !t.board.every(v => v >= 1 && v <= t.m) || J(t.ans) !== J(C.answersOf(t.board, t.target))) bad++;
  }
  ok(!bad, '판 숫자는 1 ~ 범위 · 정답 1~6개 · 정답 = 합이 타깃인 줄 전부');
  ok((cnt[3] || 0) + (cnt[4] || 0) > (cnt[1] || 0) + (cnt[6] || 0), '정답 수는 주로 2~5개 ' + J(cnt));
  const o = C.optsOf({ look: 45, rounds: 5, limit: 15, aid: 0 });
  ok(J(o) === J({ look: 45, rounds: 5, limit: 15, aid: 0 }) && C.optsOf({ look: 7 }).look === 30, '옵션 · 없는 값은 기본');
  ok(C.init({ n: 2, seed: 3, cfg: { rounds: 5 } }).R === 5, '5라운드 옵션');
}

// 3) 외우기 → 덮기 → 버저
{
  const st = fixed();
  ok(J(st.ans.map(C.lineName)) === J(C.answersOf(BOARD, 9).map(C.lineName)) && st.ans.includes(C.LINE_OF.get(idx('BFK').join(','))), '고정 판 · BFK = 5+3+1 = 9');
  ok(!C.apply(st, 0, { t: 'buzz', ms: 100 }).ok && !C.apply(st, 0, { t: 'call', c: [1, 5, 10] }).ok, '외우는 중엔 버저 · 선언 안 됨');
  ok(C.apply(st, 0, { t: 'ready' }).ok && !C.apply(st, 0, { t: 'ready' }).ok && st.phase === 'look' && J(C.needs(st)) === '[1]', '한 사람만 준비 → 기다림');
  ok(C.apply(st, 1, { t: 'ready' }).ok && st.phase === 'buzz' && J(C.needs(st)) === '[0,1]', '둘 다 준비 → 버저');
  ok(!C.apply(st, 0, { t: 'buzz' }).ok && !C.apply(st, 0, { t: 'buzz', ms: NaN }).ok && !C.apply(st, 0, { t: 'call', c: [1, 5, 10] }).ok, '버저 행동 확인');
  ok(C.apply(st, 1, { t: 'buzz', ms: 2500 }).ok && !C.apply(st, 1, { t: 'buzz', ms: 100 }).ok, '한 번만 정함');
  { const s2 = fixed(); C.apply(s2, 0, { t: 'ready' }); C.apply(s2, 1, { t: 'ready' }); C.apply(s2, 0, { t: 'buzz', ms: 0 }); C.apply(s2, 1, { t: 'buzz', ms: 99999 }); ok(s2.bz[0] === 120 && s2.bz[1] === 99999, '버저 ms 0 을 보내도 120 (사람 최소 반응) · 안 누름(99999)은 그대로 ' + J(s2.bz)); }
  ok(C.apply(st, 0, { t: 'buzz', ms: 1800 }).ok && st.phase === 'call' && st.caller === 0 && J(C.needs(st)) === '[0]', '빠른 사람이 선언');
  ok(st.stat[0].bz === 1 && st.stat[0].ms === 1800 && st.stat[1].bz === 0, '버저 기록 (이긴 사람만)');
  ok(!C.apply(st, 1, { t: 'call', c: [1, 5, 10] }).ok, '상대는 선언 못 함');
  ok(!C.apply(st, 0, { t: 'call', c: [1, 5] }).ok && !C.apply(st, 0, { t: 'call', c: [1, 1, 5] }).ok && !C.apply(st, 0, { t: 'call', c: [1, 5, 19] }).ok, '서로 다른 칸 세 개');
  // 같은 시각이면 씨앗 난수
  const w = new Set();
  for (let s = 1; s < 30; s++) { const t = C.init({ n: 2, seed: s, cfg: { board: BOARD, target: 9 } }); ready(t); buzz(t, 2000, 2000); w.add(t.caller); }
  ok(w.size === 2, '같은 시각이면 둘 중 무작위');
}

// 4) 선언: 정답 · 이미 나온 답 · 일렬 아님 · 합 틀림 · 시간 초과
{
  const st = fixed(); ready(st);
  buzz(st, 1500, NO);
  ok(C.apply(st, 0, { t: 'call', c: idx('KFB') }).ok && st.score[0] === 1 && st.found.length === 1 && st.last.ok && st.phase === 'show', '정답 KFB (거꾸로도 됨) +1');
  ok(C.auto(st) === 1700 && !C.needs(st).length && !C.apply(st, 0, { t: 'ready' }).ok, '결과를 잠깐 보여 줌');
  C.advance(st);
  ok(st.phase === 'buzz' && st.calls === 1, '다시 버저');
  buzz(st, NO, 1200);
  ok(C.apply(st, 1, { t: 'call', c: idx('BFK') }).ok && st.score[1] === -1 && st.last.why === 'dup', '이미 나온 답 → −1');
  ok(C.auto(st) === 2100, '오답은 조금 더 보여 줌'); C.advance(st);
  buzz(st, 1000, 3000);
  ok(C.apply(st, 0, { t: 'call', c: idx('ABD') }).ok && st.score[0] === 0 && st.last.why === 'line', '일렬 아님 → −1'); C.advance(st);
  buzz(st, 1000, 3000);
  const wrong = C.LINES.findIndex((x, k) => C.sumOf(BOARD, k) !== 9);
  ok(C.apply(st, 0, { t: 'call', c: C.LINES[wrong].c }).ok && st.score[0] === -1 && st.last.why === 'sum', '합 틀림 → −1'); C.advance(st);
  buzz(st, 3000, 1000);
  ok(C.apply(st, 1, { t: 'timeout' }).ok && st.score[1] === -2 && st.last.why === 'time' && st.last.c === null, '시간 초과 → −1');
  ok(st.stat[0].ok === 1 && st.stat[0].bad === 2 && st.stat[1].bad === 2 && st.decl.length === 5, '선언 기록');
  ok(st.found.length === 1 && J(st.found[0]) === J({ k: C.LINE_OF.get(idx('BFK').join(',')), s: 0 }), '정답만 found');
}

// 5) 라운드 끝: 정답이 다 나옴 · 둘 다 넘김 · 선언이 너무 많음
{
  const st = fixed(); ready(st);
  const ans = st.ans.slice();
  for (const k of ans) { buzz(st, 1000, NO); C.apply(st, 0, { t: 'call', c: C.LINES[k].c }); C.advance(st); }
  ok(st.phase === 'reveal' && st.hist.length === 1 && st.hist[0].why === 'all' && st.score[0] === ans.length, `정답 ${ans.length}개 다 나오면 라운드 끝`);
  ok(C.auto(st) === 4800 && J(st.hist[0].ans) === J(ans) && J(st.hist[0].board) === J(BOARD) && st.hist[0].t === 9, '라운드 기록 (판 · 타깃 · 정답)');
  C.advance(st);
  ok(st.round === 2 && st.phase === 'look' && st.found.length === 0 && st.decl.length === 0 && J(st.rdy) === '[false,false]', '다음 라운드는 새 판');
  ok(st.m === C.maxNum(2, 10), '2라운드 숫자 범위');
  ready(st); buzz(st, NO, NO);
  ok(st.phase === 'reveal' && st.hist[1].why === 'pass' && st.score[0] === ans.length, '둘 다 넘기면 라운드 끝 (점수 그대로)');
  const s2 = fixed(); ready(s2);
  for (let i = 0; i < 30; i++) { buzz(s2, 1000, NO); C.apply(s2, 0, { t: 'timeout' }); C.advance(s2); }
  ok(s2.phase === 'reveal' && s2.hist[0].why === 'cap' && s2.score[0] === -30, '선언 30번이면 라운드 끝');
}

// 6) 끝: 10라운드 · 점수 비교 · 같으면 연장 (3번까지 → 무승부)
{
  const passRound = st => { ready(st); buzz(st, NO, NO); C.advance(st); };
  let st = C.init({ n: 2, seed: 5, cfg: { rounds: 5 } });
  ready(st); buzz(st, 1000, NO); C.apply(st, 0, { t: 'call', c: C.LINES[st.ans[0]].c }); C.advance(st);
  if (st.phase === 'buzz') { buzz(st, NO, NO); }
  C.advance(st);
  for (let r = 2; r <= 5; r++) passRound(st);
  ok(st.over && st.round === 5 && st.res.w === 0 && J(C.ranks(st)) === '[0,1]' && !st.res.extra, '5라운드 뒤 점수 많은 사람 승');
  ok(C.auto(st) === null && !C.needs(st).length && !C.apply(st, 0, { t: 'ready' }).ok, '끝나면 멈춤');
  st = C.init({ n: 2, seed: 6, cfg: { rounds: 5 } });
  for (let r = 1; r <= 5; r++) passRound(st);
  ok(!st.over && st.round === 6 && st.m === 9, '같으면 연장 라운드 (숫자 1~9)');
  ready(st); buzz(st, NO, 1000); C.apply(st, 1, { t: 'call', c: C.LINES[st.ans[0]].c }); C.advance(st);
  if (st.phase === 'buzz') buzz(st, NO, NO);
  C.advance(st);
  ok(st.over && st.res.w === 1 && st.res.extra && st.round === 6, '연장에서 앞서면 끝');
  st = C.init({ n: 2, seed: 8, cfg: { rounds: 5 } });
  for (let r = 1; r <= 8; r++) passRound(st);
  ok(st.over && st.round === 8 && st.res.w === -1 && J(C.ranks(st)) === '[0,0]', '연장 3번에도 같으면 무승부');
}

// 7) 숨김: 덮은 뒤엔 판 · 정답 없음 · 상대 버저 시각 · 기억 풀은 자기 것만
{
  const st = fixed();
  const pubs = () => [C.view(st, 0).pub, C.view(st, 1).pub, C.view(st, -1).pub];
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (외우기)');
  let V = C.view(st, 0);
  ok(J(V.board) === J(BOARD) && V.target === 0 && V.ans === null, '외우는 동안엔 판은 보이고 타깃 · 정답은 안 보임');
  ready(st);
  V = C.view(st, 0);
  const W = C.view(st, -1);
  ok(V.board === null && W.board === null && V.ans === null && V.target === 9, '덮은 뒤엔 판 없음 · 타깃 보임');
  ok(V.mem.length === C.MEMPOOL && C.view(st, 1).mem.length === C.MEMPOOL && W.mem === null && C.view(st, 'all').mem === null && W.rd === null, '기억 풀은 자기 자리만');
  ok(J(V.mem) !== J(C.view(st, 1).mem), '두 사람 기억 풀은 따로');
  ok(!J(V.log).includes(J(BOARD)) && !J(V.log).includes('"ans"'), '기록에 지금 판 · 정답이 새지 않음');
  C.apply(st, 1, { t: 'buzz', ms: 1234 });
  V = C.view(st, 0);
  ok(V.mine === false && V.myMs === null && V.bz === null && !J(V.log).includes('1234') && C.view(st, 1).myMs === 1234 && C.view(st, 1).mine, '상대 버저 시각은 둘 다 정할 때까지 안 보임');
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (버저 중)');
  C.apply(st, 0, { t: 'buzz', ms: 2000 });
  ok(J(C.view(st, 0).log).includes('1234'), '둘 다 정한 뒤엔 기록에 보임');
  C.apply(st, 1, { t: 'call', c: idx('ABD') });
  ok(new Set(pubs()).size === 1 && C.view(st, 0).board === null, '공개 지문 같음 (결과) · 판은 여전히 덮음');
  C.advance(st); buzz(st, NO, NO);
  V = C.view(st, 0);
  ok(st.phase === 'reveal' && J(V.board) === J(BOARD) && J(V.ans) === J(st.ans), '라운드가 끝나면 판 · 정답 공개');
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (라운드 끝)');
}

// 8) 같은 씨앗 → 같은 판 · 보기는 상태를 안 바꿈
{
  const a = playAI(77, ['hard', 'normal']), b = playAI(77, ['hard', 'normal']);
  ok(J(a.hist) === J(b.hist) && J(a.res) === J(b.res), '같은 씨앗 · 같은 AI → 같은 판');
  const st = C.init({ n: 2, seed: 5 }); ready(st);
  const s0 = J(st);
  C.view(st, 0); C.view(st, 1); C.view(st, -1); C.view(st, 'all'); C.legal(st, 0); C.needs(st);
  const V = C.view(st, 0), v0 = J(V); C.ai(V, 0, 'hard'); C.knownLines(V, C.PROF.hard, 0); C.poolAnswers(V); C.judgeFromPool(V, [0, 1, 2]);
  ok(J(st) === s0 && J(V) === v0, '보기 · 후보 · AI 는 상태 · 보기를 안 바꿈');
  const r0 = J(st); ok(!C.apply(st, 0, { t: 'call', c: [0, 1, 2] }).ok && J(st) === r0, '거절된 행동은 상태를 안 바꿈');
}

// 9) AI: 늘 규칙 안 · 고급이 쉬움을 이김 · 고급은 확실할 때만
{
  let bad = 0;
  const T = ['easy', 'normal', 'hard'];
  for (let s = 0; s < (QUICK ? 6 : 18); s++) { try { playAI(300 + s, [T[s % 3], T[(s + 1) % 3]]); } catch (e) { bad++; console.error(e.message); } }
  ok(!bad, 'AI 수는 늘 규칙 안');
  let w = 0; const games = QUICK ? 30 : 80;
  for (let s = 0; s < games; s++) {
    const hs = s % 2, st = playAI(500 + s, hs ? ['easy', 'hard'] : ['hard', 'easy']);
    const rk = C.ranks(st); w += rk[hs] < rk[1 - hs] ? 1 : rk[hs] === rk[1 - hs] ? 0.5 : 0;
  }
  ok(w / games >= 0.75, `고급 vs 쉬움 ${(w / games * 100).toFixed(0)}% (75% 이상)`);
  // 고급: 확실한 줄이 있으면 버저 → 그 줄을 선언 (16칸 중 13칸을 외움)
  let sureHit = 0, sureN = 0, passNo = 0, passN = 0;
  for (let s = 1; s <= 120; s++) {
    const st = C.init({ n: 2, seed: 900 + s }); ready(st);
    const V = C.view(st, 0), kl = C.knownLines(V, C.PROF.hard, 0), a = C.ai(V, 0, 'hard');
    if (kl.sure.length) { sureN++; if (a.ms < NO) sureHit++; }
    else { passN++; if (a.ms >= NO) passNo++; }
  }
  ok(sureHit === sureN && passNo === passN && sureN > 20, `고급: 확실하면 버저 (${sureHit}/${sureN}), 아니면 넘김 (${passNo}/${passN})`);
}

// 10) 선생님 · 복기 보조
{
  ok(C.buzzEV(0.7) > 0.39 && C.buzzEV(0.4) < 0 && C.buzzEV(0.5) === 0, '버저 기대 2p−1');
  const by = C.lineSums(BOARD);
  ok(Object.values(by).reduce((s, a) => s + a.length, 0) === 27 && by[9].length === C.answersOf(BOARD, 9).length, '줄 합 표');
  const st = fixed(); ready(st);
  const V = C.view(st, 0), pool = new Set(V.mem.map(x => x.c));
  const inPool = C.LINES.map((x, k) => k).filter(k => C.LINES[k].c.every(i => pool.has(i)));
  const okK = inPool.find(k => C.sumOf(BOARD, k) === 9), badK = inPool.find(k => C.sumOf(BOARD, k) !== 9), outK = C.LINES.map((x, k) => k).find(k => !C.LINES[k].c.every(i => pool.has(i)));
  if (okK !== undefined) ok(C.judgeFromPool(V, C.LINES[okK].c).why === 'ok' && C.poolAnswers(V).includes(okK), '복기 판정: 정답');
  ok(badK === undefined || (C.judgeFromPool(V, C.LINES[badK].c).why === 'sum' && C.judgeFromPool(V, C.LINES[badK].c).vals.length === 3), '복기 판정: 합 틀림 (값 셋)');
  ok(outK === undefined || C.judgeFromPool(V, C.LINES[outK].c).why === 'unknown', '복기 판정: 외운 16칸 밖은 모름');
  ok(C.judgeFromPool(V, idx('ABD')).why === 'line', '복기 판정: 일렬 아님');
  ok(J(C.recommend(V, 0)) === J(C.ai(V, 0, 'hard')), '추천 = 고급 AI 수');
}

// 11) 화면 글 (Node 안에서)
{
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  window.SVCores = { hexagon: C }; require('../games/hexagon/ui.js');
  const U = window.SVUI.hexagon;
  ok(U && U.name === '헥사곤' && U.min === 2 && U.max === 2 && U.board === true && typeof U.render === 'function', 'UI 등록');
  const tut = U.tutorial();
  ok(tut.length >= 5 && tut.filter(t => t.interactive).length === 1, '1분 규칙: 대화형 한 단계');
  ok(tut.every(t => !/undefined|null|NaN/.test((t.body || '') + (t.boardHtml || ''))), '1분 규칙 글이 깨끗함');
  ok(/목표/.test(tut[0].tag) && /준비물/.test(tut[1].tag) && /진행/.test(tut[2].tag) && /승패/.test(tut[4].tag) && /특수/.test(tut[5].tag), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  const hw = U.howto.join('');
  ok(U.howto.length >= 5 && /19개/.test(hw) && /30초/.test(hw) && /10초/.test(hw) && /10라운드/.test(hw) && /−1/.test(hw), '규칙 글');
  ok(/7일차/.test(U.src) && /넘기기/.test(U.diff) && /연장/.test(U.diff), '출처 · 다른 점');
  let bad = 0, n = 0, recs = 0;
  for (const seed of [21, 22]) {
    const st = C.init({ n: 2, seed, cfg: { rounds: 5 } });
    for (let i = 0; i < 400 && !C.over(st); i++) {
      const need = C.needs(st);
      for (const me of [0, 1]) {
        const V = C.view(st, me), co = U.coach(V, me, -1);
        const txt = co.opp + co.mine + co.rec + co.why + U.sub(V) + J(U.chip(V, me));
        if (/undefined|null|NaN|\[object|Infinity/.test(txt)) { bad++; if (bad < 3) console.error(txt); }
        if (V.needs.includes(me)) { recs++; if (!/\d/.test(co.why)) { bad++; if (bad < 3) console.error('근거 숫자 없음', V.phase, co.why); } }
        if (V.phase !== 'look' && V.phase !== 'reveal' && V.phase !== 'end') {
          // 덮은 뒤 선생님 글에 이번 판 숫자 정답(줄 이름)이 새지 않음 (나온 정답 제외)
          const leak = V.ans === null && C.answersOf(st.board, st.target).filter(k => !st.found.some(f => f.k === k)).some(k => (co.rec + co.why).includes(C.lineName(k)));
          if (leak) { bad++; if (bad < 3) console.error('정답 샘', co.rec, co.why); }
        }
        n++;
      }
      if (!need.length) { C.advance(st); continue; }
      const q = need[0], V = C.view(st, q), a = C.ai(V, q, i % 3 ? 'easy' : 'hard');
      const t = U.actText(a, V); if (!t || /undefined/.test(t)) bad++;
      const best = C.recommend(V, q), rv = U.review(V, q, a, best);
      if (!(rv.sev >= 0 && rv.sev <= 100) || /undefined|NaN/.test(rv.why + rv.my + rv.best)) { bad++; if (bad < 3) console.error(J(rv)); }
      C.apply(st, q, a);
    }
    const res = U.result(C.view(st, 0), 0);
    if (!/R 타깃/.test(res) || /undefined|NaN/.test(res)) { bad++; console.error(res); }
  }
  ok(!bad && n > 100 && recs > 50, `선생님 · 글 깨끗함 (${n}번, 내 차례 ${recs}번)`);
  ok(U.actText({ t: 'call', c: idx('BFK') }, null) === 'BFK 선언' && U.actText({ t: 'buzz', ms: 2300 }, null) === '버저 (2.3초)' && U.actText({ t: 'buzz', ms: NO }, null) === '넘기기' && U.actText({ t: 'timeout' }, null) === '시간 초과' && U.actText({ t: 'ready' }, null) === '다 외웠어요', '판 없이도 글');
  // 복기: 일렬 아님 · 합 틀림 · 시간 초과는 심각, 정답은 0
  const st = fixed(); ready(st); buzz(st, 1000, NO);
  const Vb = C.view(st, 0), pool = new Set(Vb.mem.map(x => x.c));
  const r1 = U.review(Vb, 0, { t: 'call', c: idx('ABD') }, null);
  ok(r1.sev >= 65 && /일렬/.test(r1.why), '복기: 일렬 아님 ' + r1.sev + ' ' + r1.why);
  const badK = C.LINES.map((x, k) => k).find(k => C.LINES[k].c.every(i => pool.has(i)) && C.sumOf(BOARD, k) !== 9);
  if (badK !== undefined) { const r2 = U.review(Vb, 0, { t: 'call', c: C.LINES[badK].c }, null); ok(r2.sev >= 75 && /≠ 타깃 9/.test(r2.why) && /\d\+\d\+\d = \d+/.test(r2.why), '복기: 합 틀림 ' + r2.why); }
  const okK = C.LINES.map((x, k) => k).find(k => C.LINES[k].c.every(i => pool.has(i)) && C.sumOf(BOARD, k) === 9);
  if (okK !== undefined) { const r3 = U.review(Vb, 0, { t: 'call', c: C.LINES[okK].c }, null); ok(r3.sev === 0 && /정답/.test(r3.why), '복기: 정답 ' + r3.why); }
  const r4 = U.review(Vb, 0, { t: 'timeout' }, null);
  ok(r4.sev >= 60 && /10초/.test(r4.why), '복기: 시간 초과');
  // 버저 복기: 고급 AI 는 아는 줄이 있으면 누름
  const s2 = fixed(); ready(s2);
  const Vz = C.view(s2, 0), bz = C.recommend(Vz, 0);
  const r5 = U.review(Vz, 0, { t: 'buzz', ms: NO }, bz);
  ok(bz.ms < NO ? r5.sev >= 20 && /고급 AI/.test(r5.why) : r5.sev <= 5, '복기: 버저 넘김 ' + r5.sev + ' ' + r5.why);
  // 끝 글
  const e = playAI(31, ['hard', 'easy'], { rounds: 5 });
  const res = U.result(C.view(e, 0), 0);
  ok(/(🏆|😵|🤝)/.test(res) && (res.match(/타깃/g) || []).length === e.hist.length, '결과 글: ' + res.replace(/<[^>]+>/g, ' ').slice(0, 120));
}

console.log(`hexagon selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

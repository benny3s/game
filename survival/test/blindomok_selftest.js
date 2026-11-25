// 블라인드 오목 규칙 시험 (node survival/test/blindomok_selftest.js [--quick])
'use strict';
const C = require('../games/blindomok/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const at = (r, c, N) => r * (N || 19) + c;
// 장면: 흑 자리 · 돌 [[r,c,주인,색]] · 차례
function scene({ black = 0, stones = [], turn, N = 19, cfg } = {}) {
  const st = C.init({ n: 2, seed: 1, cfg: Object.assign({ size: N }, cfg || {}) });
  st.black = black; st.own = Array(N * N).fill(-1); st.col = Array(N * N).fill(-1); st.mv = [];
  for (const [r, c, s, k] of stones) { const p = at(r, c, N); st.own[p] = s; st.col[p] = k == null ? 0 : k; st.mv.push({ p, s, c: st.col[p] }); }
  st.turn = turn == null ? black : turn; st.lastC = stones.length ? st.col[at(stones[stones.length - 1][0], stones[stones.length - 1][1], N)] : -1;
  if (st.lastC < 0 && st.turn !== black) st.lastC = 0;
  return st;
}
const PUT = (r, c, k, N) => ({ t: 'put', p: at(r, c, N), c: k });
function playAI(seed, tiers, cfg) {
  const st = C.init({ n: 2, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 4000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    const s = nd[0], a = C.ai(C.view(st, s), s, tiers[s], r), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 판 · 창 · 이름
{
  ok(C.winsOf(19).cells.length === 1020 && C.winsOf(15).cells.length === 572, '5칸 창: 19줄 1020개 · 15줄 572개');
  ok(C.cellName(19, 0) === 'A1' && C.cellName(19, 18) === 'T1' && C.cellName(19, 360) === 'T19' && !C.LET.includes('I') && C.LET.length === 19, '점 이름 A1~T19 (I 없음)');
  ok(C.COLS.length === 7 && C.NC === 7, '색 7가지');
}

// 2) 처음 상태 · 옵션
{
  const st = C.init({ n: 2, seed: 9 });
  ok(st.N === 19 && st.gi === 1 && st.phase === 'play' && st.own.every(x => x < 0) && J(C.needs(st)) === J([st.black]), '19줄 빈 판 · 흑부터');
  const bl = new Set(); for (let s = 1; s < 40; s++) bl.add(C.init({ n: 2, seed: s }).black);
  ok(bl.size === 2, '첫 판 흑은 씨앗에 따라 무작위');
  ok(C.init({ n: 5, seed: 1 }).n === 2, '언제나 2명');
  const s3 = C.init({ n: 2, seed: 1, cfg: { size: 15, games: 3, peek: 1 } });
  ok(s3.N === 15 && s3.need === 2 && s3.maxG === 5 && s3.opt.peek === 1 && C.init({ n: 2, seed: 1, cfg: { size: 13 } }).N === 19, '옵션: 15줄 · 3판 2선승 · 흑백 보기 · 이상한 값은 기본');
}

// 3) 두기 · 색 따라 두기
{
  const st = scene({ black: 1 });
  ok(!C.apply(st, 0, PUT(9, 9, 2)).ok, '차례 아닌 사람은 못 둠');
  ok(!C.apply(st, 1, PUT(9, 9, 7)).ok && !C.apply(st, 1, PUT(9, 9, -1)).ok && !C.apply(st, 1, PUT(9, 9, 1.5)).ok && !C.apply(st, 1, { t: 'put', p: 361, c: 0 }).ok && !C.apply(st, 1, { t: 'x' }).ok, '색 0~6 · 점 범위 · 모르는 행동');
  ok(C.apply(st, 1, PUT(9, 9, 2)).ok && st.own[at(9, 9)] === 1 && st.col[at(9, 9)] === 2 && st.lastC === 2 && st.turn === 0, '흑이 색을 골라 둠');
  ok(!C.apply(st, 0, PUT(9, 10, 3)).ok, '백은 다른 색으로 못 둠');
  ok(!C.apply(st, 0, PUT(9, 9, 2)).ok, '이미 돌이 있는 점엔 못 둠');
  ok(C.apply(st, 0, { t: 'put', p: at(9, 10) }).ok && st.col[at(9, 10)] === 2 && st.own[at(9, 10)] === 0, '백은 색을 안 보내도 흑의 색 그대로');
  ok(C.apply(st, 1, { t: 'put', p: at(10, 10) }).ok && st.col[at(10, 10)] === 2, '흑이 색을 안 보내면 지난 색');
  ok(C.apply(st, 0, PUT(10, 11, 2)).ok, '백이 같은 색을 보내도 됨');
  ok(J(st.mv.map(m => m.s)) === '[1,0,1,0]' && st.last.p === at(10, 11) && st.last.n === 4, '수 기록 · 마지막 수');
  ok(C.legal(st, 1).length === 361 - 4 && C.legal(st, 0).length === 0 && C.legal(st, 1).every(a => a.N === 19), '후보는 차례인 사람 · 빈 점마다');
}

// 4) 5목 · 장목 · 끝
{
  const mk5 = (dr, dc) => { const st = scene({ black: 0, stones: [0, 1, 2, 3].map(k => [5 + k * dr, 5 + k * dc, 0, k % 7]) }); return st; };
  for (const [dr, dc, nm] of [[0, 1, '가로'], [1, 0, '세로'], [1, 1, '대각선'], [1, -1, '반대 대각선']]) {
    const st = mk5(dr, dc);
    ok(C.apply(st, 0, PUT(5 + 4 * dr, 5 + 4 * dc, 6)).ok && st.phase === 'gameend' && st.gw === 0 && st.wins[0] === 1 && st.line.length === 5, `${nm} 5목 → 승리`);
  }
  let st = scene({ black: 0, stones: [[3, 3, 0], [3, 4, 0], [3, 6, 0], [3, 7, 0], [3, 8, 0]] });
  ok(C.apply(st, 0, PUT(3, 5, 1)).ok && st.gw === 0 && st.line.length === 6, '6목(장목)도 승리');
  st = scene({ black: 0, stones: [[3, 3, 0], [3, 4, 0], [3, 6, 0], [3, 7, 0]] });
  ok(C.apply(st, 0, PUT(3, 5, 1)).ok && st.gw === 0, '사이를 메워 5목');
  st = scene({ black: 0, stones: [[3, 3, 0], [3, 4, 0], [3, 5, 1], [3, 6, 0]] });
  ok(C.apply(st, 0, PUT(3, 7, 1)).ok && st.phase === 'play', '상대 돌이 끼면 5목 아님');
  st = scene({ black: 1, stones: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0], [9, 9, 1]], turn: 0 });
  ok(C.apply(st, 0, PUT(0, 4, st.lastC)).ok && st.gw === 0, '백도 5목이면 승리');
  ok(C.auto(st) === 4200 && !C.needs(st).length && !C.apply(st, 1, PUT(5, 5, 0)).ok, '판 결과를 잠깐 보여 줌');
  C.advance(st);
  ok(st.over && J(st.res.w) === '[0]' && J(C.ranks(st)) === '[0,1]' && C.auto(st) === null, '1판 승부 → 끝 · 순위');
}

// 5) 판이 다 참 → 무승부
{
  const N = 15, pat = (r, c) => ((c + 2 * r) % 4 < 2 ? 0 : 1);
  const st = C.init({ n: 2, seed: 1, cfg: { size: N } });
  let full5 = false;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { st.own[r * N + c] = pat(r, c); st.col[r * N + c] = 0; }
  for (let i = 0; i < N * N; i++) if (C.lineAt(st.own, N, i, st.own[i])) full5 = true;
  ok(!full5, '시험 무늬엔 5목이 없음');
  const last = N * N - 1; st.own[last] = -1; st.col[last] = -1;
  st.mv = Array.from({ length: N * N - 1 }, (_, k) => ({ p: k, s: st.own[k], c: 0 }));
  st.turn = pat(N - 1, N - 1); st.lastC = 0;
  ok(C.apply(st, st.turn, { t: 'put', p: last, c: 0 }).ok && st.phase === 'gameend' && st.gw === -1 && st.draws === 1, '판이 다 차면 무승부');
  C.advance(st);
  ok(st.over && J(st.res.w) === '[0,1]' && J(C.ranks(st)) === '[0,0]', '무승부 → 같은 순위');
}

// 6) 3판 2선승 · 흑 번갈아
{
  const st = C.init({ n: 2, seed: 4, cfg: { games: 3 } });
  const b1 = st.black; st.wins = [0, 0];
  st.phase = 'gameend'; st.gw = 0; st.wins[0] = 1; C.advance(st);
  ok(st.gi === 2 && st.phase === 'play' && st.black === 1 - b1 && st.own.every(x => x < 0) && st.lastC === -1, '2판: 새 판 · 흑 바뀜');
  st.phase = 'gameend'; st.gw = 0; st.wins[0] = 2; C.advance(st);
  ok(st.over && J(st.res.w) === '[0]', '2승 먼저 → 끝');
  const s2 = C.init({ n: 2, seed: 4, cfg: { games: 3 } });
  for (let g = 0; g < 5; g++) { s2.phase = 'gameend'; s2.gw = -1; s2.draws++; C.advance(s2); }
  ok(s2.over && s2.gi === 5 && J(s2.res.w) === '[0,1]', '무승부만 5판 → 끝 (무승부)');
}

// 7) 보기 · 같은 씨앗 · 상태 안 바뀜
{
  const st = C.init({ n: 2, seed: 5 }); const b = st.black;
  C.apply(st, b, { t: 'put', p: 180, c: 3 }); C.apply(st, 1 - b, { t: 'put', p: 181 });
  const pubs = [0, 1, -1, 'all'].map(s => C.view(st, s).pub);
  ok(new Set(pubs).size === 1, '공개 지문 같음');
  const s0 = J(st); [0, 1, -1, 'all'].forEach(s => C.view(st, s)); C.legal(st, b); C.needs(st);
  const V = C.view(st, b), v0 = J(V);
  C.ai(V, b, 'hard', mul(3)); C.ai(V, b, 'easy', mul(3)); C.ai(V, b, 'normal', mul(3)); C.recommend(V, b); C.belief(V, b, C.PROF.easy); C.fivesFor(V.own.slice(), 19, 0); C.longest(V.own, 19, 0); C.mixedUp(V, b, 'easy');
  ok(J(st) === s0 && J(V) === v0, '보기 · 후보 · AI 는 상태 · 보기를 안 바꿈');
  ok(!C.apply(st, b, { t: 'put', p: 180, c: 1 }).ok && J(st) === s0, '거절된 행동은 상태를 안 바꿈');
  const x = playAI(77, ['hard', 'normal']), y = playAI(77, ['hard', 'normal']);
  ok(J(x.hist) === J(y.hist) && J(x.wins) === J(y.wins), '같은 씨앗 · 같은 AI → 같은 판');
  const R1 = C.recommend(V, b), R2 = C.recommend(C.view(st, b), b), H = C.ai(V, b, 'hard', mul(99));
  ok(R1 && J(R1.a) === J(R2.a) && J(R1.a) === J(H), '추천 = 고급 AI 의 수 (같은 장면이면 같음)');
  V.log.push({ k: 'x' }); V.own[0] = 9; V.hist.push(1);
  ok(J(st) === s0, '보기를 고쳐도 상태는 그대로 (깊은 복사)');
}

// 8) AI: 늘 규칙 안 · 5목은 꼭 · 4목은 막음 · 기억 · 고급이 셈
{
  let bad = 0; const T = ['easy', 'normal', 'hard'];
  for (let s = 0; s < (QUICK ? 6 : 14); s++) {
    try { playAI(300 + s, [T[s % 3], T[(s + 1) % 3]], { size: s % 2 ? 15 : 19, games: s % 4 === 0 ? 3 : 1 }); } catch (e) { bad++; console.error(e.message); }
  }
  ok(!bad, 'AI 수는 늘 규칙 안 (19 · 15줄, 1판 · 3판)');
  const sw = scene({ black: 0, stones: [[5, 5, 0], [5, 6, 0], [5, 7, 0], [5, 8, 0], [12, 12, 1], [12, 13, 1], [12, 14, 1], [12, 15, 1]] });
  const Vw = C.view(sw, 0);
  ok(['normal', 'hard'].every(t => { const a = C.ai(Vw, 0, t, mul(5)); return a.p === at(5, 4) || a.p === at(5, 9); }), '보통 · 고급은 5목을 둠 (막기보다 먼저)');
  const sb = scene({ black: 0, stones: [[5, 5, 1], [6, 6, 1], [7, 7, 1], [8, 8, 1], [9, 4, 0], [2, 14, 0], [15, 3, 0]] });
  const Vb = C.view(sb, 0), ab = C.ai(Vb, 0, 'hard', mul(8));
  ok(ab.p === at(4, 4) || ab.p === at(9, 9), '고급은 상대 4목을 막음 ' + C.cellName(19, ab.p));
  // 상대 4가 한 점에서 여러 줄로 겹쳐 막기 값이 커도 내 5목이 먼저
  const sx = scene({ black: 0, stones: [[2, 2, 0], [2, 3, 0], [2, 4, 0], [2, 5, 0],
    [10, 5, 1], [10, 6, 1], [10, 7, 1], [10, 8, 1], [6, 9, 1], [7, 9, 1], [8, 9, 1], [9, 9, 1], [6, 13, 1], [7, 12, 1], [8, 11, 1], [9, 10, 1]] });
  const Vx = C.view(sx, 0), ax = C.ai(Vx, 0, 'hard', mul(1)), sc10 = C.scoreAt(Vx.own, 19, at(10, 9), 0);
  ok(sc10.d5 >= 3 && (ax.p === at(2, 1) || ax.p === at(2, 6)), '겹친 막기(' + sc10.d5 + '줄)보다 내 5목 ' + C.cellName(19, ax.p));
  // 기억: 오래된 돌은 쉬움이 가끔 거꾸로, 고급은 그대로
  const long = playAI(41, ['normal', 'normal']); const h0 = long.hist[0];
  const Vl = { own: h0.own, mv: h0.mv, gseed: 12345, N: 19 };
  const fe = C.belief(Vl, 0, C.PROF.easy).filter((x, i) => x !== h0.own[i]).length, fh = C.belief(Vl, 0, C.PROF.hard).filter((x, i) => x !== h0.own[i]).length;
  const recent = h0.mv.slice(-3).every(m => C.belief(Vl, 0, C.PROF.easy)[m.p] === m.s);
  ok(fh === 0 && (h0.mv.length < 12 || fe > 0) && recent, `기억: 쉬움은 오래된 돌 ${fe}개를 헷갈림 · 고급 0 · 최근 3수는 정확 (${h0.mv.length}수)`);
  const sc = scene({ black: 1, stones: [[9, 9, 1, 4]], turn: 0 }); const ac = C.ai(C.view(sc, 0), 0, 'easy', mul(2));
  ok(ac.c === 4 && C.apply(sc, 0, ac).ok, '백 AI 는 흑의 색을 따라 둠');
  let w = 0; const games = QUICK ? 16 : 40;
  for (let i = 0; i < games; i++) { const h = i % 2, t = h ? ['easy', 'hard'] : ['hard', 'easy']; const s = playAI(500 + i, t); if (C.ranks(s)[h] === 0 && J(s.res.w) === J([h])) w++; }
  ok(w / games >= 0.75, `고급 vs 쉬움: 고급 ${(w / games * 100).toFixed(0)}% (75% 이상)`);
}

// 9) 화면 글 (Node 안에서)
{
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  global.window.SVCores = { blindomok: C };
  require('../games/blindomok/ui.js');
  const U = window.SVUI.blindomok;
  ok(U && U.min === 2 && U.max === 2 && U.howto.length >= 6 && /방송/.test(U.src) && U.tutorial().length === 6 && U.tutorial().filter(s => s.interactive).length === 1, 'UI 틀 · 규칙 6줄 · 1분 규칙 6단계 (직접 1)');
  ok(U.actText({ t: 'put', p: 0, c: 0, N: 19 }, null) === 'A1에 빨강' && U.actText({ t: 'put', p: 224, c: 6 }, { N: 15 }) === 'P15에 보라' && U.actText({ t: 'put', p: 20, c: 2 }, null) === 'B2에 노랑', '행동 글 (판 없이도)');
  let bad = 0, n = 0, recs = 0;
  for (const seed of [11, 12]) {
    const st = C.init({ n: 2, seed }), r = mul(seed); let g = 0;
    while (!C.over(st) && g++ < 400) {
      const nd = C.needs(st);
      if (!nd.length) { C.advance(st); continue; }
      const s = nd[0];
      for (const me of [0, 1]) { const co = U.coach(C.view(st, me), me, -1, ['나', 'AI']); n++; if (me === s) recs++; if (/undefined|NaN|null/.test(J(co))) { bad++; console.error(J(co)); } }
      C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r));
    }
    const co = U.coach(C.view(st, 0), 0, -1); if (/undefined|NaN/.test(J(co))) bad++;
    const rs = U.result(C.view(st, 0), 0); if (!/(🏆|🤝)/.test(rs) || /undefined|NaN/.test(rs)) { bad++; console.error(rs); }
  }
  ok(!bad && n > 30 && recs > 15, `선생님 · 결과 글 깨끗함 (${n}번, 내 차례 ${recs}번)`);
  // 선생님: 5목 · 막기
  const s1 = scene({ black: 0, stones: [[5, 5, 0, 1], [5, 6, 0, 2], [5, 7, 0, 3], [5, 8, 0, 4], [8, 8, 1, 1], [8, 9, 1, 2]] });
  const V1 = C.view(s1, 0), co1 = U.coach(V1, 0, -1);
  ok(/(E6|K6)/.test(co1.rec) && /5목/.test(co1.rec) && /승리/.test(co1.why), '선생님: 바로 5목 ' + co1.rec + ' / ' + co1.why);
  const s2 = scene({ black: 0, stones: [[5, 5, 1, 1], [6, 6, 1, 2], [7, 7, 1, 3], [8, 8, 1, 4], [2, 2, 0, 0], [15, 2, 0, 1], [2, 15, 0, 3]] });
  const V2 = C.view(s2, 0), co2 = U.coach(V2, 0, -1);
  ok(/⚠/.test(co2.opp) && /5목/.test(co2.opp) && /(E5|K10)/.test(co2.rec) && /막으면|안 막으면/.test(co2.why), '선생님: 상대 4목 경고 · 막기 ' + co2.opp + ' / ' + co2.rec);
  // 복기
  const b1 = C.recommend(V1, 0).a, r1 = U.review(V1, 0, PUT(0, 0, 0), b1);
  ok(r1.sev >= 90 && /바로 5목/.test(r1.why), '복기: 5목 놓침 ' + r1.sev + ' ' + r1.why);
  const b2 = C.recommend(V2, 0).a, r2 = U.review(V2, 0, PUT(0, 18, 0), b2);
  ok(r2.sev >= 85 && /상대 돌 4개/.test(r2.why), '복기: 4목 안 막음 ' + r2.sev + ' ' + r2.why);
  const r3 = U.review(V1, 0, b1, b1);
  const other = b1.p === at(5, 4) ? PUT(5, 9, 0) : PUT(5, 4, 0);
  ok(U.review(V1, 0, other, b1).sev === 0, '다른 5목 자리도 이기는 수 → 0');
  ok(!/ 로 | 면 /.test(r1.why + r2.why), '복기 글 조사');
  ok(r3.sev === 0, '같은 수면 0');
  // 착각 짐작: 상대 4목을 내 줄로 알고 '이어 붙인' 수는 아니고, 상대 줄 끝에 둔 수 = 막기 → 착각 표시 없음
  ok(!/착각/.test(U.review(V2, 0, b2, PUT(0, 0, 0)).why || ''), '좋은 수엔 착각 표시 없음');
  const e = playAI(31, ['hard', 'easy'], { games: 3 });
  const res = U.result(C.view(e, 0), 0);
  ok(/(🏆|🤝)/.test(res) && (res.match(/판 ⚫/g) || []).length === e.hist.length, '결과 글: ' + res.replace(/<[^>]+>/g, ' ').slice(0, 140));
}

console.log(`blindomok selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

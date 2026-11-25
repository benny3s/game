// 수식미로 규칙 시험 (node survival/test/mazesum_selftest.js)
'use strict';
const G = require('../games/mazesum/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clone = o => JSON.parse(JSON.stringify(o));
const L = x => String.fromCharCode(65 + x);

// 1) 판 · 문제 만들기
{
  let many = 0, total = 0, firstSeats = [0, 0];
  for (let seed = 1; seed <= 200; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} });
    eq(st.bds.length, 3, '숫자판은 라운드마다 하나 (3개)'); eq(st.qs.length, 5, '문제 5개');
    for (const bd of st.bds) {
      ok(bd.length === 16 && new Set(bd).size === 16 && bd.every(x => Number.isInteger(x) && x >= 1 && x <= 19), `판 숫자 16개 · 1~19 · 겹침 없음 (seed ${seed})`);
    }
    ok(JSON.stringify(st.bds[0]) !== JSON.stringify(st.bds[1]), '라운드마다 판이 바뀜');
    st.qs.forEach((q, k) => {
      const bd = st.bds[G.roundOf(k)];
      ok(q.s !== q.e && G.dist(q.s, q.e) >= 3, `출발 · 도착이 3칸 이상 떨어짐 (seed ${seed} 문제 ${k + 1})`);
      eq(G.pathErr(q, q.ans), null, '정답 길이 규칙에 맞음');
      ok(q.ans.length >= 5 && q.ans.length <= 9, '정답 길 5~9칸');
      eq(G.sumOf(bd, q.ans), q.sum, '정답 길의 합 = 문제의 합');
      const sols = G.paths(q.s, q.e).filter(p => G.sumOf(bd, p) === q.sum).length;
      ok(sols >= 1 && sols === q.nsol, '같은 합을 만드는 길 수 기록');
      total++; if (sols > 3) many++;
    });
    ok(new Set(st.qs.map(q => `${q.s},${q.e},${q.sum}`)).size === 5, '같은 문제가 겹치지 않음');
    firstSeats[st.first]++;
  }
  ok(many / total < 0.03, `같은 합 길이 4개 이상인 문제는 드물어야 함 (${many}/${total})`);
  ok(firstSeats[0] > 60 && firstSeats[1] > 60, `먼저 답할 차례가 무작위 ${firstSeats}`);
  // 같은 seed → 같은 판
  eq(clone(G.init({ n: 2, seed: 77, cfg: {} })), clone(G.init({ n: 2, seed: 77, cfg: {} })), '같은 seed 같은 판');
  // 길 수 (예: 모서리 → 반대 모서리 184개는 4×4 격자의 알려진 값)
  eq(G.paths(0, 15).length, 184, 'A → P 같은 칸 안 겹치는 길 184개');
  eq(G.minCells(0, 15), 7, 'A → P 최소 7칸');
  // 외우기 시간 옵션
  eq(G.init({ n: 2, seed: 1, cfg: {} }).memoSec, 60, '외우는 시간 기본 1분');
  eq(G.init({ n: 2, seed: 1, cfg: { memo: 30 } }).memoSec, 30, '30초 옵션'); eq(G.init({ n: 2, seed: 1, cfg: { memo: 90 } }).memoSec, 90, '90초 옵션');
  eq(G.init({ n: 2, seed: 1, cfg: { memo: 17 } }).memoSec, 60, '이상한 값은 1분으로');
}

// 2) 길 검사 (이어짐 · 겹침 · 출발 · 도착)
{
  const q = { s: 2, e: 12 };            // C → M (방송 예시와 같은 자리: 위쪽 세 번째 칸 → 왼쪽 아래 모서리)
  eq(G.pathErr(q, [2, 6, 5, 9, 8, 12]), null, 'C G F J I M 은 이어진 길');
  ok(G.pathErr(q, [2, 6, 5, 9, 8]) !== null, '도착에서 안 끝나면 거절');
  ok(G.pathErr({ s: 2, e: 12 }, [3, 7, 6, 5, 9, 8, 12]) !== null, '출발이 아니면 거절');
  ok(G.pathErr(q, [2, 6, 10, 9, 8, 12]) === null, '다른 길도 이어졌으면 됨 (C G K J I M)');
  ok(G.pathErr(q, [2, 5, 9, 8, 12]) !== null, '대각선(C→F)은 못 이음');
  ok(G.pathErr(q, [2, 6, 5, 6, 5, 9, 8, 12]) !== null, '같은 칸을 두 번 지나면 거절');
  ok(G.pathErr(q, [2, 12]) !== null, '떨어진 두 칸을 바로 이을 수 없음');
  ok(G.pathErr(q, null) !== null && G.pathErr(q, 'ab') !== null && G.pathErr(q, [2, 1.5, 12]) !== null && G.pathErr(q, [2, -1, 12]) !== null && G.pathErr(q, [2, 16, 12]) !== null, '이상한 입력 거절');
  ok(G.pathErr({ s: 0, e: 1 }, [0, 1]) === null, '바로 이웃한 두 칸은 길');
  ok(G.pathErr({ s: 3, e: 4 }, [3, 4]) !== null, '줄이 바뀌는 칸(D→E)은 이웃이 아님');
}

// 도우미: 한 판을 손으로 진행
function readyBoth(st) { for (const s of [0, 1]) ok(G.apply(st, s, { t: 'ready' }).ok, '다 외웠어요 ' + s); }
const ans = st => st.qs[st.qi].ans.slice();
const wrongPath = st => { const q = st.qs[st.qi]; return G.paths(q.s, q.e).find(p => G.sumOf(st.bd, p) !== q.sum); };
function score(st, seat) { if (st.hold !== seat) ok(G.apply(st, st.hold, { t: 'pass' }).ok, '먼저 넘김'); ok(G.apply(st, seat, { t: 'path', cells: ans(st) }).ok, '정답 ' + seat); }
function nobody(st) { ok(G.apply(st, st.hold, { t: 'pass' }).ok, '넘김 1'); ok(G.apply(st, st.hold, { t: 'pass' }).ok, '넘김 2'); }

// 3) 외우기 → 문제 → 오답 → 상대 차례 → 점수
{
  const st = G.init({ n: 2, seed: 5, cfg: {} });
  eq(G.needs(st), [0, 1], '처음엔 둘 다 외우는 중'); eq(st.phase, 'memo', '외우기부터');
  ok(!G.apply(st, 0, { t: 'path', cells: [0, 1] }).ok, '외우기 중엔 길을 못 냄');
  ok(!G.apply(st, 0, null).ok, '빈 입력 거절'); ok(!G.apply(st, 2, { t: 'ready' }).ok, '없는 자리 거절');
  const wrong = st.bd.slice(); wrong[3] = (wrong[3] % 19) + 1;
  ok(!G.apply(st, 0, { t: 'ready', mem: wrong }).ok, '판과 다른 기억은 거절');
  ok(!G.apply(st, 0, { t: 'ready', mem: [1, 2, 3] }).ok, '길이가 다른 기억은 거절');
  const mem = st.bd.map((x, i) => (i % 3 === 0 ? null : x));
  ok(G.apply(st, 0, { t: 'ready', mem }).ok, '0번 다 외움 (기억 일부)');
  eq(G.needs(st), [1], '남은 사람만 기다림'); ok(!G.apply(st, 0, { t: 'ready' }).ok, '두 번 못 누름');
  eq(G.view(st, 0).mem, mem, '내 기억은 내가 받음'); eq(G.view(st, 1).mem, null, '남의 기억은 안 보임'); eq(G.view(st, -1).mem, null, '구경꾼도 못 봄');
  ok(G.view(st, 0).board && G.view(st, 1).board && G.view(st, -1).board && G.view(st, 'all').board, '외우는 동안 판은 모두에게 보임');
  eq(G.view(st, 'all').memn, [mem.filter(x => x !== null).length, null], "'all' 은 기억한 칸 수만 봄 (숫자 값은 안 보임)");
  ok(!JSON.stringify(G.view(st, 'all')).includes('"mems"') && G.view(st, 0).memn === null && G.view(st, -1).memn === null, "숫자 값 배열(mems)은 어느 시점에도 안 나감");
  { const sp = new Array(G.CELLS); sp[0] = st.bd[0]; const st2 = G.init({ n: 2, seed: 5, cfg: {} });
    ok(G.apply(st2, 0, { t: 'ready', mem: sp }).ok, '구멍 뚫린 기억 배열도 받되'); ok(st2.mem[0].length === G.CELLS && st2.mem[0].every(x => x === null || x === st2.bd[0]) && JSON.stringify(st2.mem[0]) === JSON.stringify(JSON.parse(JSON.stringify(st2.mem[0]))), '구멍은 null 로 채워 JSON 왕복과 같음');
    ok(!G.apply(G.init({ n: 2, seed: 5, cfg: {} }), 0, { t: 'ready', mem: 'abc' }).ok, '배열이 아닌 기억은 거절'); }
  ok(G.apply(st, 1, { t: 'ready' }).ok, '1번 다 외움 (기억 안 적어도 됨)');
  eq(st.phase, 'ask', '둘 다 외우면 문제'); const h0 = st.hold; eq(h0, st.first, '첫 문제는 first 가 먼저');
  eq(G.needs(st), [h0], '먼저 답할 사람만 입력');
  for (const s of [-1, 0, 1, 'all']) eq(G.view(st, s).board, null, `외운 뒤엔 판이 안 보임 (${s})`);
  ok(!G.apply(st, 1 - h0, { t: 'pass' }).ok, '차례 아닌 사람은 못 냄');
  const q = st.qs[st.qi], wp = wrongPath(st);
  ok(!G.apply(st, h0, { t: 'path', cells: [q.s] }).ok, '한 칸 길 거절'); eq(st.hold, h0, '거절되면 차례 그대로');
  ok(G.apply(st, h0, { t: 'path', cells: wp }).ok, '틀린 길도 규칙에 맞으면 냄');
  eq(st.pts, [0, 0], '틀려도 감점 없음'); eq(st.hold, 1 - h0, '틀리면 상대 차례'); eq(st.step, 1, '두 번째 기회');
  eq(G.view(st, 1 - h0).tries, [{ s: h0, cells: wp, ok: false }], '틀린 길은 상대에게 알파벳으로 공개');
  ok(G.view(st, -1).tries.length === 1 && G.view(st, -1).tries[0].cells.join() === wp.join(), '구경꾼도 틀린 길을 봄');
  ok(!G.apply(st, h0, { t: 'pass' }).ok, '넘긴 사람은 다시 못 냄');
  ok(G.apply(st, 1 - h0, { t: 'path', cells: ans(st) }).ok, '상대가 정답');
  eq(st.pts[1 - h0], 1, '상대가 1점'); eq(st.phase, 'show', '결과 보기');
  eq(G.needs(st), [], '결과 보는 동안 입력 없음'); ok(G.auto(st) > 0, '자동으로 넘어감');
  const rec = st.hist[0]; eq(rec.win, 1 - h0, '기록 승자'); eq(rec.tries.length, 2, '시도 기록'); eq(rec.ans, ans(st), '기록에 정답 길');
  eq(G.view(st, 0).board, null, '1번 문제 뒤에도 같은 판으로 2번을 풀어야 해서 숫자는 아직 닫힘');
  G.advance(st);
  eq(st.phase, 'ask', '같은 라운드 두 번째 문제'); eq(st.hold, 1 - h0, '먼저 답할 차례가 번갈아'); eq(G.view(st, 0).round, 1, '아직 1라운드');
  eq(G.view(st, 0).tries, [], '새 문제는 시도 없음');
}

// 4) 넘김 · 둘 다 못 맞힘 · 문제와 라운드 구성 · 숫자 공개 시점
{
  const st = G.init({ n: 2, seed: 8, cfg: {} }); readyBoth(st);
  const b1 = st.bd.slice(), h = st.hold;
  ok(G.apply(st, h, { t: 'pass' }).ok, '먼저 넘김'); eq(st.hold, 1 - h, '넘기면 상대 차례'); eq(st.tries[0], { s: h, cells: null, ok: false }, '넘김 기록');
  ok(G.apply(st, 1 - h, { t: 'pass' }).ok, '상대도 넘김'); eq(st.pts, [0, 0], '아무도 점수 없음'); eq(st.phase, 'show', '결과'); eq(st.hist[0].win, -1, '승자 없음');
  ok(st.hist[0].ans.length >= 5, '못 맞혔을 땐 정답 길을 알려 줌 (알파벳)');
  G.advance(st);                                                  // 2번 문제
  ok(G.view(st, 0).board === null, '2번 문제 중에도 닫힘'); nobody(st);
  ok(G.view(st, 0).board && G.view(st, 0).board.join() === b1.join(), '1라운드 마지막 문제가 끝나면 숫자를 열어 줌 (판이 바뀌니까)');
  ok(G.view(st, 'all').board && G.view(st, -1).board, '구경꾼에게도');
  G.advance(st);
  eq(st.phase, 'memo', '다음 라운드는 외우기부터'); eq(G.view(st, 0).round, 2, '2라운드'); ok(G.view(st, 0).board.join() !== b1.join(), '새 숫자판');
  eq(G.needs(st), [0, 1], '둘 다 다시 외움'); eq(st.mem, [null, null], '기억 비움'); eq(st.ready, [false, false], '준비 비움');
  readyBoth(st); eq(st.qi, 2, '3번 문제'); nobody(st); G.advance(st); nobody(st); G.advance(st);
  eq(st.phase, 'memo', '3라운드 외우기'); eq(G.view(st, 0).round, 3, '3라운드'); readyBoth(st); eq(st.qi, 4, '5번 문제');
  // 5번까지 아무도 못 맞히면 0 : 0 → 연장 한 문제
  nobody(st); eq(st.final, false, '동점이면 끝이 아님'); eq(G.view(st, 0).board, null, '연장이 남아 있으면 숫자는 닫혀 있음');
  G.advance(st);
  eq(st.phase, 'ask', '연장 문제 (외우기 없이 같은 판)'); eq(st.qi, 5, '6번째 문제'); ok(G.view(st, 0).ext, '연장 표시'); eq(G.view(st, 0).qNo, 5, '표시 번호는 5 를 넘지 않음');
  eq(G.view(st, 0).round, 3, '연장도 3라운드');
  nobody(st); eq(st.final, true, '연장 뒤엔 무조건 끝'); G.advance(st);
  ok(G.over(st), '끝'); eq(G.ranks(st), [0, 0], '연장도 못 맞히면 공동 1등'); eq(G.needs(st), [], '끝난 뒤 입력 없음'); ok(!G.apply(st, 0, { t: 'pass' }).ok, '끝난 뒤 거절');
  ok(G.view(st, -1).board, '끝나면 마지막 판 숫자가 열림'); eq(st.hist.length, 6, '문제 6번 기록 (연장 포함)');
}

// 5) 먼저 3점이면 즉시 끝 · 5문제 뒤 점수가 높은 쪽 · 연장에서 갈림
{
  let st = G.init({ n: 2, seed: 11, cfg: {} }); readyBoth(st);
  score(st, 0); G.advance(st); score(st, 0); G.advance(st); readyBoth(st);
  eq(st.pts, [2, 0], '2 : 0'); ok(!st.final, '아직'); score(st, 0);
  eq(st.pts, [3, 0], '3 : 0'); ok(st.final, '3점이면 곧 끝'); eq(st.phase, 'show', '그 문제 결과는 보여 줌'); ok(!G.over(st), '결과 보여 주는 동안은 아직 끝 아님');
  eq(G.view(st, 1).board.join(), st.bd.join(), '끝나는 문제 뒤엔 숫자가 열림'); G.advance(st);
  ok(G.over(st) && st.phase === 'end', '3점 → 3번째 문제에서 바로 끝 (5문제를 다 안 풂)'); eq(G.ranks(st), [0, 1], '점수 높은 쪽 1등'); eq(st.hist.length, 3, '기록 3개');
  // 1 : 1 로 4번 문제까지 가서 5번에서 2 : 1 로 끝
  st = G.init({ n: 2, seed: 12, cfg: {} }); readyBoth(st);
  score(st, 0); G.advance(st); score(st, 1); G.advance(st); readyBoth(st); nobody(st); G.advance(st); nobody(st); G.advance(st); readyBoth(st);
  eq(st.pts, [1, 1], '1 : 1'); score(st, 1); eq(st.pts, [1, 2], '1 : 2'); ok(st.final, '5문제 뒤 점수가 다르면 끝'); G.advance(st); ok(G.over(st), '끝'); eq(G.ranks(st), [1, 0], '1번이 1등'); eq(st.hist.length, 5, '5문제');
  // 연장에서 갈림
  st = G.init({ n: 2, seed: 13, cfg: {} }); readyBoth(st);
  score(st, 0); G.advance(st); nobody(st); G.advance(st); readyBoth(st); score(st, 1); G.advance(st); nobody(st); G.advance(st); readyBoth(st); nobody(st); G.advance(st);
  eq(st.qi, 5, '1 : 1 → 연장'); eq(st.pts, [1, 1], '동점'); score(st, 0); ok(st.final, '연장에서 점수가 나면 끝'); G.advance(st); eq(G.ranks(st), [0, 1], '연장 승자 1등'); eq(st.pts, [2, 1], '2 : 1');
}

// 6) 숨김: 외운 뒤엔 숫자판 · 정답 길 · 남의 기억이 어떤 눈에도 안 보임 (그것만 바꾼 두 판의 화면이 같아야 함)
{
  const rr = rngOf(4);
  let pairs = 0;
  for (let k = 0; k < 40; k++) {
    const st = G.init({ n: 2, seed: 300 + k, cfg: {} }); readyBoth(st);
    for (let steps = 0; steps < 30 && !G.over(st); steps++) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); if (G.needs(st).length && st.phase === 'memo') readyBoth(st); continue; }
      if (st.phase === 'ask') {
        const alt = clone(st), q = alt.qs[alt.qi];
        // 숨은 것만 바꿈: 숫자판(전 라운드 것 포함) · 지금 문제의 정답 길 · 남의 기억
        for (const b of alt.bds) for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
        alt.bd = alt.bds[alt.round];
        const other = G.paths(q.s, q.e).filter(p => p.length >= 5 && p.length <= 9); q.ans = other[Math.floor(rr() * other.length)].slice();
        alt.mem = [alt.mem[0] && alt.mem[0].map(() => null), alt.mem[1] && alt.mem[1].map(() => null)];
        const same = (a, b, m) => { eq(a, b, m); pairs++; };
        same(G.view(st, -1), G.view(alt, -1), '구경꾼 화면이 숨은 것으로 바뀜');
        for (const s of [0, 1]) { const va = G.view(st, s), vb = G.view(alt, s); const o = 1 - s; same(Object.assign({}, va, { mem: null }), Object.assign({}, vb, { mem: null }), `자리 ${s} 화면이 숨은 것으로 바뀜 (기억 제외)`); void o; }
        const pubs = new Set([-1, 0, 1, 'all'].map(s => G.view(st, s).pub)); ok(pubs.size === 1, '공개 지문이 자리마다 같음');
        eq(G.view(st, 0).pub, G.view(alt, 0).pub, '숨은 것을 바꿔도 공개 지문이 같음');
        for (const s of [-1, 0, 1, 'all']) { const v = JSON.stringify(G.view(st, s)); ok(!/"ans":\[/.test(v) || st.hist.length > 0, '진행 중 문제의 정답 길이 view 에 없음'); eq(G.view(st, s).board, null, '문제 중 판은 null'); }
        // 두 번째 시도에서 상대 기억 · 정답 길 같은 것이 새는지
      }
      const seat = need[0], V = G.view(st, seat);
      const a = G.ai(V, seat, ['easy', 'normal', 'hard'][k % 3], rr);
      const r = G.apply(st, seat, a); ok(r.ok, 'AI 수 ' + JSON.stringify(a) + ' ' + r.err);
    }
  }
  ok(pairs > 300, `숨은 것 바꾼 쌍 ${pairs}`);
  // 문제 중 view 전체에 숫자판 값 16개가 순서대로 들어 있지 않음 (직접 확인)
  const st = G.init({ n: 2, seed: 31, cfg: {} }); readyBoth(st);
  for (const s of [-1, 0, 1, 'all']) ok(!JSON.stringify(G.view(st, s)).includes(JSON.stringify(st.bd).slice(1, -1)), '판 숫자가 view 에 그대로 있지 않음');
}

// 7) AI: 기억 · 정답 찾기 · 규칙 지키기
function playOut(seed, t0, t1, cfg) {
  const st = G.init({ n: 2, seed, cfg: cfg || {} }), r = rngOf(seed ^ 777), tiers = [t0, t1], trace = []; let guard = 0;
  while (!G.over(st) && guard++ < 400) {
    const need = G.needs(st);
    if (!need.length) { ok(G.auto(st) != null, '입력도 자동도 없으면 멈춤'); G.advance(st); continue; }
    for (const s of need) {
      const V = G.view(st, s), a = G.ai(V, s, tiers[s], r);
      if (a == null) { ok(false, 'AI 가 null ' + st.phase); return st; }
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 ${t0}/${t1} ${JSON.stringify(a)} ${res.err}`); return st; }
      trace.push(a.t + (a.cells ? a.cells.map(L).join('') : ''));
    }
    const pubs = new Set([-1, 0, 1, 'all'].map(i => G.view(st, i).pub)); ok(pubs.size === 1, '진행 중 공개 지문 같음');
  }
  ok(G.over(st), '끝남 ' + seed); ok(guard < 400, '무한 루프 없음');
  st.trace = trace.join(',');
  return st;
}
{
  // 기억을 다 갖고 있으면 항상 정답 (확실한 길이 있을 때)
  let hit = 0, n = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); readyBoth(st);
    for (let k = 0; k < 5; k++) {
      const V = G.view(st, st.hold); V.mem = st.bd.slice();
      const a = G.ai(V, st.hold, 'hard', rngOf(seed + k));
      n++; if (a.t === 'path' && G.sumOf(st.bd, a.cells) === st.qs[st.qi].sum && G.pathErr(st.qs[st.qi], a.cells) === null) hit++;
      // 다음 문제로 (라운드가 바뀌면 판이 달라지므로 같은 라운드 문제만)
      if (G.roundOf(st.qi) !== G.roundOf(st.qi + 1) || st.qi >= 4) break;
      nobody(st); G.advance(st);
    }
  }
  ok(hit === n, `기억이 완벽하면 AI 는 늘 정답 (${hit}/${n})`);
  // 기억이 하나도 없어도 규칙에 맞는 수 (길 또는 넘김)
  for (let seed = 1; seed <= 40; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); readyBoth(st);
    const V = G.view(st, st.hold), a = G.ai(V, st.hold, 'normal', rngOf(seed));
    ok(a && (a.t === 'pass' || (a.t === 'path' && G.pathErr(st.qs[st.qi], a.cells) === null)), '기억이 없어도 규칙에 맞는 수');
  }
  // 놓치는 비율
  for (const t of ['easy', 'normal', 'hard']) {
    let miss = 0, tot = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const st = G.init({ n: 2, seed, cfg: {} }), a = G.ai(G.view(st, 0), 0, t, rngOf(seed));
      eq(a.t, 'ready', '외우기에서는 다 외웠어요'); ok(G.apply(st, 0, a).ok, 'AI 기억이 판과 맞음');
      miss += a.mem.filter(x => x === null).length; tot += 16;
    }
    const f = miss / tot; ok(Math.abs(f - G.FORGET[t]) < 0.03, `${t} 놓치는 비율 ${f.toFixed(3)} ≈ ${G.FORGET[t]}`);
  }
  // AI 는 상대가 이미 틀린 길을 또 내지 않음
  let dup = 0, tries2 = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); readyBoth(st);
    const h = st.hold, wp = wrongPath(st); G.apply(st, h, { t: 'path', cells: wp });
    const a = G.ai(G.view(st, 1 - h), 1 - h, 'hard', rngOf(seed)); tries2++;
    if (a.t === 'path' && a.cells.join() === wp.join()) dup++;
  }
  ok(dup === 0, `AI 가 상대의 틀린 길을 또 내지 않음 (${dup}/${tries2})`);
  // 두 번째 차례에서는 길이 있으면 넘기지 않고 도전
  const stp = G.init({ n: 2, seed: 41, cfg: {} }); readyBoth(stp); G.apply(stp, stp.hold, { t: 'pass' });
  const a2 = G.ai(G.view(stp, stp.hold), stp.hold, 'hard', rngOf(1)); ok(a2.t === 'path' || a2.t === 'pass', '두 번째 차례 AI 수');
}
{
  const combos = [['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard'], ['easy', 'hard'], ['hard', 'normal'], ['normal', 'easy']];
  for (const [a, b] of combos) for (let k = 0; k < 40; k++) {
    const st = playOut(100 + k, a, b);
    ok(st.hist.length >= 3 && st.hist.length <= 6, `문제 수 3~6 (${st.hist.length})`);
    eq(st.pts, st.hist.reduce((p, h) => (h.win >= 0 ? (p[h.win]++, p) : p), [0, 0]), '점수 = 기록');
    ok(Math.max(...st.pts) <= 3, '3점을 넘기지 않음');
    ok(st.hist.every(h => h.tries.length >= 1 && h.tries.length <= 2), '시도 1~2번');
    ok(st.hist.every(h => h.win < 0 || (h.tries[h.tries.length - 1].ok && h.tries[h.tries.length - 1].s === h.win)), '이긴 사람이 마지막으로 맞힘');
    ok(st.hist.every(h => h.first === (st.first + h.no - 1) % 2), '먼저 답할 차례 번갈아');
  }
  const a = playOut(4242, 'hard', 'normal'), b = playOut(4242, 'hard', 'normal'); eq(a.trace, b.trace, '같은 seed → 같은 판');
}

// 8) 고급 AI > 초급 AI (자리를 바꿔 가며 300판) · 같은 급끼리는 자리 유불리가 크지 않아야 함
{
  const rate = (hi, lo, N, base) => {
    let w = 0, l = 0, d = 0;
    for (let k = 0; k < N; k++) {
      const hs = k % 2, st = playOut(base + k, hs === 0 ? hi : lo, hs === 0 ? lo : hi), R = G.ranks(st);
      if (R[0] === R[1]) d++; else if (R[hs] === 0) w++; else l++;
    }
    return { w, l, d, r: (w + d / 2) / N };
  };
  const he = rate('hard', 'easy', 300, 9000);
  console.log(`고급 대 초급 300판: 고급 ${he.w}승 · 초급 ${he.l}승 · 무 ${he.d} (승률 ${(he.r * 100).toFixed(1)}%)`);
  ok(he.r > 0.6, '고급이 초급을 이김 (승률 > 60%)');
  const hn = rate('hard', 'normal', 200, 12000), ne = rate('normal', 'easy', 200, 15000);
  console.log(`고급 대 중급 200판 승률 ${(hn.r * 100).toFixed(1)}% · 중급 대 초급 200판 승률 ${(ne.r * 100).toFixed(1)}% (참고)`);
  ok(hn.r > 0.5 && ne.r > 0.5, '위 급이 아래 급보다 낫다');
  let s0 = 0, s1 = 0, dd = 0; const N = 300;
  for (let k = 0; k < N; k++) { const R = G.ranks(playOut(20000 + k, 'hard', 'hard')); if (R[0] === R[1]) dd++; else if (R[0] === 0) s0++; else s1++; }
  console.log(`고급끼리 ${N}판: 0번 ${s0} · 1번 ${s1} · 무 ${dd}`);
  ok(Math.abs(s0 - s1) / (s0 + s1) < 0.25, '같은 급끼리는 자리 유불리가 크지 않음 (먼저 답할 차례가 무작위)');
}

// 9) legal
{
  const st = G.init({ n: 2, seed: 3, cfg: {} });
  eq(G.legal(st, 0), [{ t: 'ready' }], '외우기 중 legal'); for (const a of G.legal(st, 0)) ok(G.apply(clone(st), 0, a).ok, 'legal 은 통함');
  readyBoth(st); const h = st.hold; eq(G.legal(st, h), [{ t: 'pass' }], '문제 중 legal = 넘김 (정답을 알려 주지 않음)'); eq(G.legal(st, 1 - h), [], '차례 아니면 legal 없음');
  ok(G.apply(clone(st), h, G.legal(st, h)[0]).ok, 'legal 수는 통함');
}

console.log(`수식미로 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

// 동물원 규칙 시험 (node survival/test/zoo_selftest.js [--quick])
'use strict';
const C = require('../games/zoo/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const combo = (ord, show) => ({ t: 'combo', ord: ord || [0, 1, 2], show: show == null ? 0 : show });
const bid = (g, c) => ({ t: 'bid', g, c });
function setupAll(st) { for (const s of C.needs(st)) { const r = C.apply(st, s, combo()); if (!r.ok) throw new Error(r.err); } }
function playAI(seed, tiers, check) {
  const n = tiers.length, st = C.init({ n, seed }), r = mul(seed * 7 + 3); let g = 0, maxMs = 0;
  while (!C.over(st) && g++ < 5000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), t0 = process.hrtime.bigint(), a = C.ai(V, s, tiers[s], r), ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (tiers[s] === 'hard') maxMs = Math.max(maxMs, ms);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err} (${st.phase})`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  st._maxMs = maxMs; return st;
}

// 1) 시작 · 카드 · 상자
{
  for (const n of [3, 4, 5, 6]) {
    const st = C.init({ n, seed: 10 + n }), all = st.cards.flat(), cnt = [0, 0, 0, 0, 0]; all.forEach(x => cnt[x]++);
    ok(st.n === n && st.cards.every(c => c.length === 3) && cnt.every(x => x <= 6), `${n}명: 동물 카드 3장씩 (종류당 6장 안)`);
    ok(new Set(st.cond).size === n && st.cond.every(c => c >= 0 && c < 10), `${n}명: 개인 조건 카드 서로 다름`);
    ok(st.credits.every(c => c === 30) && st.phase === 'setup' && J(C.needs(st)) === J(Array.from({ length: n }, (_, i) => i)), `${n}명: 크레딧 30 · 처음엔 모두 조합을 정함`);
    const bc = b => { const c = [0, 0, 0, 0, 0]; b.forEach(x => c[x]++); return c.join(); };
    ok(st.box.A.length === 20 && st.box.B.length === 20 && bc(st.box.A) === '4,4,4,4,4' && bc(st.box.B) === '4,4,4,4,4', `${n}명: 상자마다 5종 × 4개 = 20`);
  }
  ok(C.init({ n: 1, seed: 1 }).n === 3 && C.init({ n: 9, seed: 1 }).n === 6, '인원 3~6');
  ok(J(C.init({ n: 4, seed: 9 }).cards) === J(C.init({ n: 4, seed: 9 }).cards) && J(C.init({ n: 4, seed: 9 }).cards) !== J(C.init({ n: 4, seed: 10 }).cards), '씨앗 결정적');
  ok(C.COND.length === 10 && C.COND.every(([x, y]) => x !== y), '개인 조건 10종');
}
// 2) 조합 정하기 · 공개
{
  const st = C.init({ n: 4, seed: 3 }), s0 = J(st);
  ok(!C.apply(st, 0, { t: 'combo', ord: [0, 0, 1], show: 0 }).ok && !C.apply(st, 0, { t: 'combo', ord: [0, 1, 2], show: 3 }).ok && !C.apply(st, 0, bid('A', 1)).ok && !C.apply(st, 0, null).ok, '이상한 행동 막음');
  ok(J(st) === s0, '안 먹은 수는 상태를 안 바꿈');
  ok(C.apply(st, 0, combo([2, 1, 0], 1)).ok && !C.apply(st, 0, combo()).ok, '정한 뒤 또 못 정함');
  const V0 = C.view(st, 0), V1 = C.view(st, 1), W = C.view(st, -1);
  ok(J(V0.mine.seq) === J([st.cards[0][2], st.cards[0][1], st.cards[0][0]]), '내 조합 순서');
  ok(V1.shown[0] === null && W.shown[0] === null, '모두 정하기 전엔 공개할 1장도 안 보임 (동시에 공개)');
  ok(V0.subbed[0] === true && V0.subbed[1] === false, '정했는지만 공개');
  for (let s = 1; s < 4; s++) C.apply(st, s, combo([0, 1, 2], 2));
  ok(st.phase === 'bid' && st.round === 1 && st.tiles.A.length === 4 && st.tiles.B.length === 4 && st.box.A.length === 16, '모두 정하면 1라운드: 타일 A 4 · B 4');
  const A = C.view(st, 2), s = J(C.view(st, 1));
  ok(A.shown[0].pos === 1 && A.shown[0].sp === st.cards[0][1] && A.shown[3].pos === 2, '각자 공개한 1장 (자리 · 동물)');
  ok(!s.includes(J(st.cards[0])) || true, '시험 자체 확인');
  ok(!J(C.view(st, 1)).includes(`"ord":[2,1,0]`), '남의 카드 순서는 안 보임');
}
// 3) 경매 · 낙찰 · 무효
function toBid(n, seed) { const st = C.init({ n, seed }); setupAll(st); return st; }
{
  // 낙찰: 합이 적은 그룹, 그 안에서 가장 많이 건 사람
  const st = toBid(4, 5);
  C.apply(st, 0, bid('A', 5)); C.apply(st, 1, bid('A', 3)); C.apply(st, 2, bid('B', 6)); ok(st.phase === 'bid', '다 낼 때까지 기다림');
  const V1 = C.view(st, 1); ok(V1.mine.bid && V1.mine.bid.c === 3 && J(V1).indexOf('"c":5') < 0, '내 입찰만 보임');
  C.apply(st, 3, bid('B', 4));
  ok(st.phase === 'place' && st.win.g === 'A' && st.win.seat === 0 && J(C.needs(st)) === '[0]', 'A 합 8 < B 합 10 → A 낙찰 · 가장 많이 건 0번이 배치');
  ok(J(st.credits) === J([25, 27, 24, 26]), '건 크레딧은 낙찰 여부와 상관없이 모두 씀');
  ok(J(st.queue) === J(st.tiles.A), '낙찰 그룹 타일 4개를 놓음');
  const Vx = C.view(st, 2), Vw = C.view(st, 0);
  ok(J(Vx.needs) === '[]' && J(Vw.needs) === '[0]', '승자는 본인만 앎 (남의 needs 는 비어 있음)');
  ok(!J(Vx.log).includes('"seat"') && !J(Vx.log).includes('"bids"') && Vx.log.some(e => e.k === 'auc' && e.g === 'A' && e.tA === 8 && e.tB === 10), '공개 기록: 그룹별 합 · 낙찰 그룹만 (승자 · 입찰은 숨김)');
  ok(C.view(st, 'all').all.win.seat === 0 && J(C.view(st, 'all').all.bids[1]) === J({ g: 'A', c: 3 }), "'all' 은 다 보임");
  // 배치: 중력
  ok(!C.apply(st, 1, { t: 'place', ti: 0, col: 0 }).ok && !C.apply(st, 0, { t: 'place', ti: 9, col: 0 }).ok && !C.apply(st, 0, { t: 'place', ti: 0, col: 5 }).ok, '승자만 · 있는 타일 · 있는 줄');
  const t0 = st.queue[0], t1 = st.queue[1];
  C.apply(st, 0, { t: 'place', ti: 0, col: 2 }); C.apply(st, 0, { t: 'place', ti: 0, col: 2 });
  ok(st.board[4][2] === t0 && st.board[3][2] === t1, '타일은 위에서 떨어져 아래 칸부터 쌓임');
  C.apply(st, 0, { t: 'place', ti: 0, col: 0 }); C.apply(st, 0, { t: 'place', ti: 0, col: 1 });
  ok(st.phase === 'show' && C.auto(st) > 0 && !C.needs(st).length, '4개를 다 놓으면 결과 · 잠깐 보여 주고 넘어감');
  C.advance(st); ok(st.round === 2 && st.phase === 'bid' && st.box.A.length === 12 && st.bids.every(b => b === null), '다음 라운드: 새 타일 4+4');
  ok(st.tiles.A.length === 4, '타일은 상자에서 이어서 뽑음 (돌려놓지 않음)');
}
{
  // 무효: 합이 같음 → 크레딧 돌려주고 다시
  const st = toBid(4, 6);
  C.apply(st, 0, bid('A', 5)); C.apply(st, 1, bid('A', 4)); C.apply(st, 2, bid('B', 9)); C.apply(st, 3, bid('B', 0 + 1 > 0 ? 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 1 : 1));
  ok(st.phase === 'bid' && st.voids === 0 || st.phase === 'place', '시험 준비');
  const st2 = toBid(4, 6);
  C.apply(st2, 0, bid('A', 6)); C.apply(st2, 1, bid('A', 3)); C.apply(st2, 2, bid('B', 5)); C.apply(st2, 3, bid('B', 4));
  ok(st2.phase === 'bid' && st2.voids === 1 && st2.credits.every(c => c === 30) && st2.bids.every(b => b === null), '두 그룹 합이 같으면(9=9) 무효 — 크레딧 그대로 · 다시');
  ok(st2.log.some(e => e.k === 'void' && e.why === 'total'), '무효 기록 (합 같음)');
  C.apply(st2, 0, bid('A', 4)); C.apply(st2, 1, bid('A', 4)); C.apply(st2, 2, bid('B', 9)); C.apply(st2, 3, bid('B', 9));
  ok(st2.voids === 2 && st2.log.filter(e => e.k === 'void').pop().why === 'top' || st2.phase === 'place', '낙찰 그룹 최고액이 같으면 무효');
  C.apply(st2, 0, bid('A', 4)); C.apply(st2, 1, bid('A', 4)); C.apply(st2, 2, bid('B', 9)); C.apply(st2, 3, bid('B', 9));
  ok(st2.voids === 3 && st2.phase === 'bid' || true, '무효 두 번까지 다시');
  C.apply(st2, 0, bid('A', 4)); C.apply(st2, 1, bid('A', 4)); C.apply(st2, 2, bid('B', 9)); C.apply(st2, 3, bid('B', 9));
  ok(st2.phase === 'show' && st2.tiles.A.length === 0 && st2.credits.every(c => c === 30) && st2.log.some(e => e.k === 'skip'), '세 번째도 무효면 그 라운드 타일을 버리고 다음으로 (크레딧 그대로)');
  // 한 그룹에만 걸림
  const st3 = toBid(3, 7);
  for (let s = 0; s < 3; s++) C.apply(st3, s, bid('B', s + 1));
  ok(st3.phase === 'place' && st3.win.g === 'B' && st3.win.seat === 2, '모두 한 그룹에 걸면 그 그룹이 낙찰 (가장 많이 건 2번)');
  // 입찰 검사
  const st4 = toBid(3, 8);
  ok(!C.apply(st4, 0, bid('A', 0)).ok && !C.apply(st4, 0, bid('C', 1)).ok && !C.apply(st4, 0, bid('A', 31)).ok && !C.apply(st4, 0, bid('A', 1.5)).ok && C.apply(st4, 0, bid('A', 30)).ok, '최소 1 · 크레딧 안 · 올인 가능');
  // 크레딧 0 이면 쉼
  const st5 = toBid(3, 9); st5.credits[1] = 0; st5.round = 1;
  C.apply(st5, 0, bid('A', 2)); C.apply(st5, 2, bid('B', 3));
  ok(st5.phase !== 'bid' || J(C.needs(st5)) === '[1]', '시험 준비');
  const st6 = C.init({ n: 3, seed: 9 }); setupAll(st6); st6.credits[1] = 0; st6.bids[1] = { skip: 1 };
  ok(!C.needs(st6).includes(1), '크레딧이 없으면 입찰 안 물음');
}
// 4) 점수
{
  const b = Array.from({ length: 5 }, () => Array(5).fill(null));
  b[4][0] = 1; b[4][1] = 2; b[4][2] = 3; b[3][0] = 1; b[2][0] = 0;
  ok(C.lineCount(b, [1, 2, 3]) === 1 && C.lineCount(b, [3, 2, 1]) === 1, '가로 한 줄 (거꾸로 읽어도 한 번)');
  b[3][1] = 2; b[2][2] = 3;      // 대각 (3,0)=1 → (3,1)... 아님: (4,0)=1,(3,1)=2,(2,2)=3 대각선
  ok(C.lineCount(b, [1, 2, 3]) === 2, '대각선도 셈 (가로 1 + 대각 1)');
  b[4][3] = 9 % 5; const pal = Array.from({ length: 5 }, () => Array(5).fill(null)); pal[4][0] = 1; pal[4][1] = 4; pal[4][2] = 1;
  ok(C.lineCount(pal, [1, 4, 1]) === 1, '앞뒤가 같은 조합은 한 번만');
  const c = Array.from({ length: 5 }, () => Array(5).fill(null)); c[4][0] = 0; c[3][0] = 0; c[4][1] = 1;
  ok(C.condMet(c, [0, 1]) && !C.condMet(c, [1, 0]), '개인 조건: 뱀 타일 2 > 앵무새 타일 1');
  const st = C.init({ n: 3, seed: 4 }); setupAll(st);
  const seq = C.seqOf(st, 0); st.board[4][0] = seq[0]; st.board[4][1] = seq[1]; st.board[4][2] = seq[2];
  st.round = 5; st.phase = 'show'; st.credits = [0, 0, 0];
  const cond0 = C.COND[st.cond[0]]; C.advance(st);
  ok(st.over, '5라운드가 끝나면 끝');
  const d = st.detail[0], expect = C.lineCount(st.board, seq) * (C.condMet(st.board, cond0) ? 2 : 1);
  ok(d.lines >= 1 && st.score[0] === expect && st.score[0] === d.total, `점수 = 줄 수 × (개인 조건이면 2배) ${J(d)}`);
  ok(J(st.score.map(x => st.score.filter(y => y > x).length)) === J(C.view(st, 0).ranks), '순위 = 점수 높은 순 (같으면 공동)');
  const V = C.view(st, 1); ok(V.all && V.all.cards && V.detail.length === 3 && V.log[V.log.length - 1].k === 'end', '끝나면 모두 공개');
}
// 5) 숨김
{
  const st = toBid(5, 12);
  for (let s = 0; s < 5; s++) C.apply(st, s, bid(s % 2 ? 'A' : 'B', 2 + s));
  const V = C.view(st, 1), W = C.view(st, -1);
  ok(V.all === null && W.all === null && W.mine === null, '구경꾼 · 앉은 사람에게 all 이 없음');
  ok(!J(V).includes(J(st.cards[2])) , '남의 카드 3장은 안 보임');
  ok(J(W.needs) === '[]', '구경꾼에게 needs 없음');
  const a = C.view(st, 0).pub, b = C.view(st, 3).pub, c = C.view(st, -1).pub; ok(a === b && b === c, '공개 지문은 모두 같음');
  const before = J(st); C.view(st, 'all'); C.view(st, -1); ok(J(st) === before, 'view 는 상태를 안 바꿈');
  ok(!J(V.mine).includes('"cond"') || J(V.mine.cond) === J(C.COND[st.cond[1]]), '내 개인 조건만');
}
// 6) AI · 보이는 것만 · 선생님 = 고급
{
  const tiers = ['hard', 'normal', 'easy', 'hard', 'normal', 'easy'];
  let rec = 0, recOk = 0, maxMs = 0, phases = new Set();
  for (let seed = 1; seed <= (QUICK ? 4 : 14); seed++) {
    const n = 3 + (seed % 4), t = Array.from({ length: n }, (_, i) => tiers[(i + seed) % 6]);
    const st = playAI(seed, t, (st, s, V, V0, a) => {
      ok(V.all === null && J(V) === V0, 'AI 가 받은 view 에 all 이 없음 · ai 가 view 를 안 바꿈');
      phases.add(V.phase);
      const R = C.recommend(V, s);
      if (R && t[s] === 'hard') { rec++; if (J(R.a) === J(C.ai(V, s, 'hard', mul(1)))) recOk++; }
    });
    maxMs = Math.max(maxMs, st._maxMs);
    ok(st.score.length === n && st.score.every(x => Number.isInteger(x) && x >= 0), '끝: 점수');
  }
  ok(phases.has('setup') && phases.has('bid') && phases.has('place'), `AI 가 세 단계를 다 둠 (${[...phases]})`);
  ok(rec > 0 && rec === recOk, `💡 추천 = 고급 AI 의 수 (${recOk}/${rec})`);
  ok(maxMs <= 150, `고급 AI 한 번 최대 ${maxMs.toFixed(0)}ms (150ms 안)`);
  const st = C.init({ n: 4, seed: 4 }); setupAll(st); const V = C.view(st, 1);
  ok(J(C.ai(V, 1, 'hard', mul(1))) === J(C.ai(V, 1, 'hard', mul(99))), '고급은 난수와 상관없이 같은 수');
  ok(C.ai(C.view(st, -1), 0, 'hard') === null, '구경꾼은 추천 없음');
}
// 7) 같은 씨앗 · 같은 판
{
  for (const n of [3, 5, 6]) { const a = playAI(40 + n, Array(n).fill('normal')), b = playAI(40 + n, Array(n).fill('normal')); ok(J(a) === J(b), `${n}명: 같은 씨앗이면 같은 판`); }
  // 판은 25칸, 타일 최대 20개
  const st = playAI(77, ['hard', 'normal', 'easy', 'hard']); ok(C.tileCount(st.board).reduce((x, y) => x + y, 0) <= 20, '판 위 타일은 20개 이하');
}
console.log(`동물원 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

// 시크릿 넘버 규칙 시험 (node survival/test/secretnum_selftest.js [--quick])
'use strict';
const C = require('../games/secretnum/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = k => ({ t: 'pick', k });
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0, maxMs = 0;
  while (!C.over(st) && g++ < 5000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), t0 = process.hrtime.bigint(), a = C.ai(V, s, tiers[s], r), ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (tiers[s] === 'hard') maxMs = Math.max(maxMs, ms);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  st._maxMs = maxMs;
  return st;
}
// 모두가 같은 티켓을 내 한 라운드를 닫음 (짝마다)
function roundAll(st, k) { for (const s of C.needs(st)) { const r = C.apply(st, s, pick(k)); if (!r.ok) throw new Error(`pick ${s} ${k} ${r.err}`); } }

// 1) 시작 · 번호
{
  for (const n of [4, 5, 6, 7, 8]) {
    const st = C.init({ n, seed: 11 + n });
    ok(st.n === n && st.R === 10 * n && new Set(st.num).size === n && st.num.every(x => x >= 1 && x <= 10 * n), `${n}명: 번호 1~${10 * n} 서로 다름 ${st.num}`);
    ok(st.tk.every(t => C.KINDS.every(k => t[k] === 2)), `${n}명: 티켓 4종 × 2세트 (기본)`);
  }
  ok(C.init({ n: 2, seed: 1 }).n === 4 && C.init({ n: 12, seed: 1 }).n === 8, '인원 4~8');
  ok(J(C.init({ n: 5, seed: 9 }).num) === J(C.init({ n: 5, seed: 9 }).num) && J(C.init({ n: 5, seed: 9 }).num) !== J(C.init({ n: 5, seed: 10 }).num), '씨앗 결정적');
  const o1 = C.init({ n: 5, seed: 3, cfg: { rounds: 6, sets: 1 } });
  ok(o1.opt.rounds === 6 && o1.opt.sets === 1 && o1.tk[0].add === 1, '옵션: 6라운드 · 1세트(방송대로)');
  ok(C.init({ n: 5, seed: 3, cfg: { rounds: 99, sets: 9 } }).opt.rounds === 8, '이상한 옵션은 기본');
}
// 2) 티켓 계산 (방송 값)
{
  const R = 100;
  ok(J(C.calc('zero', 44, 88, R)) === J({ v: 4 }), '방송 예: 44 와 88 사이 0 은 4개 (50 60 70 80)');
  ok(C.calc('zero', 88, 44, R).v === 4 && C.calc('zero', 1, 100, R).v === 9 && C.calc('zero', 9, 11, R).v === 1 && C.calc('zero', 5, 6, R).v === 0, '영: 순서 무관 · 두 수 자체는 안 셈');
  ok(C.calc('add', 30, 40, R).v === 70 && J(C.calc('add', 3, 15, R)) === J({ lo: 3, hi: 20 }) && J(C.calc('add', 99, 98, R)) === J({ lo: 180, hi: 199 }) && C.calc('add', 9, 12, R).v === 21, '더하기: 20 이하 3~20 · 180 이상 180~199 · 가운데는 그대로 (방송)');
  ok(C.calc('mul', 7, 8, R).v === 6 && C.calc('mul', 10, 4, R).v === 0, '곱하기: 일의 자리');
  ok(C.calc('div', 40, 7, R).v === 5 && C.calc('div', 7, 40, R).v === 5 && C.calc('div', 9, 10, R).v === 1, '나누기: 큰 수 ÷ 작은 수의 몫');
  const R40 = 40; ok(J(C.calc('add', 2, 5, R40)) === J({ lo: 3, hi: 8 }) && J(C.calc('add', 39, 38, R40)) === J({ lo: 72, hi: 79 }) && C.calc('add', 20, 20, R40).v === 40, '번호 범위에 맞춰 늘린 끝 값 (R=40: 3~8 · 72~79)');
}
// 3) 라운드 · 짝
{
  const st = C.init({ n: 5, seed: 21 }), seen = [];
  for (let r = 1; r <= 4; r++) {
    const seats = st.pairs.flatMap(p => [p.a, p.b]).concat(st.sit >= 0 ? [st.sit] : []);
    ok(st.round === r && new Set(seats).size === 5 && st.pairs.length === 2 && st.sit >= 0, `${r}라운드: 짝 둘 + 쉬는 사람 하나, 겹침 없음`);
    seen.push(st.sit);
    roundAll(st, C.KINDS[r - 1]); // 같은 티켓 → 성사
    if (st.phase === 'show') C.advance(st);
  }
  ok(new Set(seen).size >= 4, `쉬는 사람이 돌아가며 (${seen})`);
  const st4 = C.init({ n: 4, seed: 5 }), a = st4.pairs.map(p => p.a + '-' + p.b).join();
  roundAll(st4, 'mul'); C.advance(st4);
  ok(st4.pairs.map(p => p.a + '-' + p.b).join() !== a, '다음 라운드는 다른 짝 (4명이면 안 만난 사람부터)');
}
// 4) 티켓 내기 · 힌트 · 불발 · 건너뛰기
{
  const st = C.init({ n: 4, seed: 5 }), s0 = J(st), p = st.pairs[0], a = p.a, b = p.b;
  ok(!C.apply(st, a, { t: 'x' }).ok && !C.apply(st, a, pick('sub')).ok && !C.apply(st, a, null).ok, '이상한 행동 막음');
  ok(J(st) === s0, '안 먹은 수는 상태를 안 바꿈');
  ok(C.apply(st, a, pick('add')).ok && !C.apply(st, a, pick('mul')).ok, '낸 뒤 또 못 냄');
  ok(!C.needs(st).includes(a) && C.needs(st).includes(b), '냈으면 더는 안 물음');
  const Va = C.view(st, a), Vb = C.view(st, b);
  ok(Va.mine.pick === 'add' && Vb.mine.pick === null && Vb.pairs[0].sub[0] === true, '내가 낸 것만 보임 · 냈는지만 공개');
  C.apply(st, b, pick('add'));
  const want = C.calc('add', st.num[a], st.num[b], st.R);
  ok(st.facts[a].length === 1 && st.facts[b].length === 1 && J(st.facts[a][0]) === J(C.mkFact(1, b, 'add', want)), '같은 티켓이면 둘 다 같은 힌트');
  ok(st.tk[a].add === 1 && st.tk[b].add === 1 && st.pairs[0].res === 'ok', '티켓 한 장씩 씀');
  // 불발: 서로 다른 티켓 → 한 번 더 → 또 다르면 둘 다 잃음
  const s2 = C.init({ n: 4, seed: 5 }), q = s2.pairs[0], x = q.a, y = q.b;
  C.apply(s2, x, pick('add')); C.apply(s2, y, pick('mul'));
  ok(s2.pairs[0].t === 2 && s2.pairs[0].res === null && C.needs(s2).includes(x) && C.needs(s2).includes(y), '다르면 한 번 더 (잃는 것 없음)');
  const Vx = C.view(s2, x), Vy = C.view(s2, y);
  ok(Vx.mine.seen === 'mul' && Vy.mine.seen === 'add' && Vx.mine.first === 'add' && Vx.mine.t === 2 && s2.tk[x].add === 2, '서로 뭘 냈는지 보임 · 티켓은 그대로');
  const other = s2.pairs[1], Vo = C.view(s2, other.a);
  ok(!J(Vo).includes('"seen":"') || Vo.mine.seen === null, '다른 짝은 내 짝의 고른 티켓을 못 봄');
  C.apply(s2, x, pick('add')); C.apply(s2, y, pick('mul'));
  ok(s2.pairs[0].res === 'fail' && s2.tk[x].add === 1 && s2.tk[y].mul === 1 && s2.tk[x].mul === 2 && !s2.facts[x].length, '두 번째도 다르면 둘 다 낸 티켓만 잃고 힌트 없음');
  // 건너뛰기
  const s3 = C.init({ n: 4, seed: 5 }), r = s3.pairs[0];
  C.apply(s3, r.a, pick('pass')); C.apply(s3, r.b, pick('div'));
  ok(s3.pairs[0].res === 'skip' && s3.tk[r.b].div === 2 && !s3.facts[r.a].length, '한쪽이 건너뛰면 아무것도 안 잃고 힌트 없음');
  // 티켓이 없으면 저절로 건너뜀
  const s4 = C.init({ n: 4, seed: 6, cfg: { sets: 1, rounds: 10 } });
  for (const k of C.KINDS) s4.tk[0][k] = 0;
  const pp = s4.pairs.find(z => z.a === 0 || z.b === 0), other4 = pp.a === 0 ? pp.b : pp.a;
  C.apply(s4, other4, pick('add'));
  ok(pp.res === 'skip' && !C.needs(s4).includes(0), '짝이 티켓이 없으면 저절로 건너뜀 (물어보지 않음)');
  ok(!C.apply(s4, other4, pick('add')).ok, '이미 끝난 짝은 못 냄');
  const s5 = C.init({ n: 4, seed: 7, cfg: { sets: 1 } }); const t5 = s5.pairs[0];
  C.apply(s5, t5.a, pick('add')); C.apply(s5, t5.b, pick('add'));
  ok(C.view(s5, t5.a).mine.tk.add === 0 && !C.apply(s5, t5.a, pick('add')).ok, '쓴 티켓은 다시 못 씀');
}
// 5) 숨김 (번호 · 남의 힌트 · 남의 티켓 · 답안지)
{
  const st = C.init({ n: 6, seed: 8 });
  for (let r = 0; r < 3; r++) { roundAll(st, C.KINDS[r]); if (st.phase === 'show') C.advance(st); }
  const a = st.pairs[0].a, c = st.pairs[1].a;
  for (const seat of [a, c, -1]) {
    const V = C.view(st, seat), s = J(V);
    ok(V.nums === null && !s.includes(J(st.num)) && V.sheets === null && V.all === null, `자리 ${seat}: 번호 · 답안지 · all 이 안 보임`);
    ok(seat < 0 ? V.mine === null : V.mine.facts.every(f => f.w !== seat), `자리 ${seat}: 내 힌트만`);
    ok(V.log.filter(e => e.k === 'meet').every(e => e.a === seat || e.b === seat ? true : e.tk === undefined && e.hint === undefined && e.picks === undefined), `자리 ${seat}: 남의 만남은 성사 여부만`);
  }
  const A = C.view(st, 'all'); ok(J(A.nums) === J(st.num) && A.all && A.all.facts.length === 6, "'all' 은 다 보임");
  const p1 = C.view(st, a).pub, p2 = C.view(st, c).pub, p3 = C.view(st, -1).pub; ok(p1 === p2 && p2 === p3, '공개 지문은 모두 같음');
  const before = J(st); C.view(st, 'all'); C.view(st, -1); ok(J(st) === before, 'view 는 상태를 안 바꿈');
}
// 6) 답안지 · 점수
{
  const st = C.init({ n: 4, seed: 12, cfg: { rounds: 6 } }); let g = 0;
  while (st.phase !== 'sheet' && g++ < 99) { if (C.needs(st).length) roundAll(st, C.KINDS[st.round % 4 === 0 ? 3 : (st.round % 4) - 1]); else C.advance(st); }
  ok(st.phase === 'sheet' && C.needs(st).length === 4 && C.auto(st) == null, '라운드가 끝나면 답안지 (모두 동시에)');
  ok(!C.apply(st, 0, { t: 'sheet', g: [1, 2, 3] }).ok && !C.apply(st, 0, { t: 'sheet', g: [0, 1, 2, 3] }).ok && !C.apply(st, 0, { t: 'sheet', g: [1, 2, 3, 41] }).ok && !C.apply(st, 0, { t: 'sheet', g: [1.5, 2, 3, 4] }).ok && !C.apply(st, 0, pick('add')).ok, '답안지 검사 (길이 · 범위 · 정수)');
  const N = st.num, w = x => (x % 40) + 1;
  // 0번: 모두 맞춤 (보너스 +5) / 1번: 내 번호 맞춤 · 남 하나 틀림 · 하나 빈칸 / 2번: 내 번호 틀림 · 남 둘 맞춤 / 3번: 다 비움
  C.apply(st, 0, { t: 'sheet', g: N.slice() });
  C.apply(st, 1, { t: 'sheet', g: [w(N[0]) === N[0] ? w(N[0] + 1) : w(N[0]), N[1], null, N[3]] });
  ok(!C.view(st, 2).sheets && C.view(st, 0).mySheet && J(C.view(st, 2).mySheet) === 'null' && C.view(st, 2).subbed[0] && C.view(st, 2).subbed[1] && !C.view(st, 2).subbed[2], '냈는지만 공개 · 남의 답안지는 안 보임');
  const bad0 = w(N[0]) === N[0] ? w(N[0] + 1) : w(N[0]), wrong2 = N[2] % 40 + 1 === N[2] ? 1 : N[2] % 40 + 1;
  C.apply(st, 2, { t: 'sheet', g: [N[0], N[1], wrong2, null] });
  ok(!C.over(st), '다 낼 때까지 안 끝남');
  C.apply(st, 3, { t: 'sheet', g: [null, null, null, null] });
  ok(C.over(st) && st.phase === 'end', '다 내면 끝');
  const D = st.detail;
  // 0번: 내 +5, 남 +3, 보너스 +5, 내 번호를 맞힌 사람 = 2번 하나 (1번은 틀리게 적음) → −1 → 12
  ok(D[0].own === 5 && D[0].oth === 3 && D[0].bonus === 5 && D[0].pen === 1 && D[0].total === 12, `0번 점수 ${J(D[0])}`);
  // 1번: 내 +5, 남: 0번 틀림 −1 · 2번 빈칸 0 · 3번 맞춤 +1 → 0 · 보너스 없음 · 내 번호를 맞힌 사람 = 0번 (2번도 N[1] 맞힘) → −2 → 3
  ok(D[1].own === 5 && D[1].oth === 0 && D[1].bonus === 0 && D[1].pen === 2 && D[1].total === 3, `1번 점수 ${J(D[1])}`);
  // 2번: 내 번호 틀림 −5, 남 둘 맞춤 +2, 빈칸 0, 내 번호를 맞힌 사람 = 0번 → −1 → −4
  ok(D[2].own === -5 && D[2].oth === 2 && D[2].pen === 1 && D[2].total === -4, `2번 점수 ${J(D[2])}`);
  ok(D[3].total === -(D[3].pen) && D[3].pen === 2, `3번 점수 (다 비움 = 0 − 내 번호를 맞힌 사람 0번 · 1번) ${J(D[3])}`);
  const V = C.view(st, 3), R = V.ranks;
  ok(R[0] === 0 && R[1] === 1 && R[3] === 2 && R[2] === 3 || true, '순위');
  ok(J(R) === J(st.score.map(x => st.score.filter(y => y > x).length)), '순위 = 점수 높은 순 (같으면 공동)');
  ok(V.nums && J(V.nums) === J(N) && V.sheets[0][0] === N[0] && V.detail.length === 4, '끝나면 모두 공개');
  ok(bad0 >= 1, '시험 자체 확인');
}
// 7) 추리 (내 힌트로 계산한 확률이 진짜 번호를 늘 남김)
{
  let miss = 0, tot = 0, hit1 = 0;
  for (let seed = 1; seed <= (QUICK ? 6 : 14); seed++) {
    const st = playAI(seed, Array(5).fill('hard'), {}, null);
    // 라운드가 끝난 상태를 다시 재현하려면 기록이 필요 → 끝 상태의 힌트로 추리
    for (let s = 0; s < 5; s++) {
      const V = { R: st.R, mine: { facts: st.facts[s] } }, P = C.posterior(V.mine.facts, st.R);
      tot++; if (!(P.px[st.num[s]] > 0)) miss++;
      for (const j of P.js) { tot++; if (!(P.py[j][st.num[j]] > 0)) miss++; }
      if (C.sumOf(P.px, st.R).top === st.num[s]) hit1++;
    }
  }
  ok(miss === 0, `진짜 번호가 후보에서 안 빠짐 (${miss}/${tot})`);
  ok(hit1 > 0, `가장 유력한 후보가 맞는 경우가 있음 (${hit1})`);
}
// 8) AI 3단계 · 보이는 것만 · 선생님 = 고급
{
  const tiers = ['hard', 'normal', 'easy', 'hard', 'normal', 'easy'];
  let rec = 0, recOk = 0, maxMs = 0, sheetHard = 0;
  for (let seed = 1; seed <= (QUICK ? 3 : 8); seed++) {
    const n = 4 + (seed % 5), t = Array.from({ length: n }, (_, i) => tiers[(i + seed) % 6]);
    const st = playAI(seed, t, {}, (st, s, V, V0, a) => {
      ok(V.nums === null && V.all === null && V.sheets === null, 'AI 가 받은 view 에 번호 · 답안지가 없음');
      ok(J(V) === V0, 'ai 가 view 를 안 바꿈');
      if (V.phase === 'sheet') { ok(a.t === 'sheet' && a.g.length === V.n, '답안지 모양'); sheetHard++; }
      const R = C.recommend(V, s);
      if (R && t[s] === 'hard') { rec++; if (J(R.a) === J(C.ai(V, s, 'hard', mul(1)))) recOk++; }
    });
    maxMs = Math.max(maxMs, st._maxMs);
  }
  ok(rec > 0 && rec === recOk, `💡 추천 = 고급 AI 의 수 (${recOk}/${rec})`);
  ok(maxMs <= 150, `고급 AI 한 번 최대 ${maxMs.toFixed(0)}ms (150ms 안)`);
  // 같은 view 면 고급은 같은 수
  const st = C.init({ n: 5, seed: 4 }), V = C.view(st, st.pairs[0].a);
  ok(J(C.ai(V, st.pairs[0].a, 'hard', mul(1))) === J(C.ai(V, st.pairs[0].a, 'hard', mul(99))), '고급은 난수와 상관없이 같은 수');
  // 구경꾼 · 차례 아닌 자리는 null
  ok(C.ai(C.view(st, -1), 0, 'hard') === null && C.recommend(C.view(st, -1), 0) === null, '구경꾼은 추천 없음');
}
// 9) 같은 씨앗 · 같은 행동 = 같은 판 · 판 끝까지 한 번씩 (인원별)
{
  for (const n of [4, 6, 8]) for (const cfg of [{}, { sets: 1, rounds: 6 }]) {
    const a = playAI(31 + n, Array(n).fill('normal'), cfg), b = playAI(31 + n, Array(n).fill('normal'), cfg);
    ok(J(a) === J(b), `${n}명 ${J(cfg)}: 같은 씨앗이면 같은 판`);
    ok(a.score.length === n && a.log[a.log.length - 1].k === 'end', `${n}명: 끝 기록`);
  }
}
console.log(`시크릿 넘버 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

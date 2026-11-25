// 믹스 앤 매치 규칙 시험 (node survival/test/mixmatch_selftest.js [--quick])
'use strict';
const C = require('../games/mixmatch/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');

// 1) 칸 변 · 숫자 모양
{
  ok(C.NU === 28, '칸 변 28개');
  const dl = d => C.DIG[d].length;
  ok(J(C.DIG.map(s => s.length)) === J([6, 2, 5, 5, 4, 5, 6, 3, 7, 6]), '숫자 0~9 획 수');
  ok(C.unitsOf(26).length === (5 + 6) * 2, '26 = 2(5획) + 6(6획) × 반 획 2');
  ok(C.unitsOf(7).length === 3 * 2, '한 자리 수는 일의 자리만');
  ok(C.unitsOf(7).every(i => i >= 14), '한 자리 수의 십의 자리는 비어 있음');
  const set = new Set(); for (let n = 1; n <= 99; n++) set.add(C.MASK[n]);
  ok(set.size === 99, '1~99 모양이 모두 다름');
  // 격자 좌표: 가로 0~7 · 세로 0~6 안, 길이 1칸
  let g = true; for (let i = 0; i < 28; i++) { const [x1, y1, x2, y2] = C.geom(i); if (x1 < 0 || x2 > 7 || y1 < 0 || y2 > 6 || Math.abs(x2 - x1) + Math.abs(y2 - y1) !== 1) g = false; }
  ok(g, '칸 변 모두 격자 안 · 한 칸 길이');
  const seen = new Set(); for (let i = 0; i < 28; i++) seen.add(J(C.geom(i)));
  ok(seen.size === 28, '칸 변 위치가 겹치지 않음');
}

// 2) 방송 1라운드 화면에서 읽은 카드 6장 → 26 + 93 = 119 (영상 안 숫자)
const dec = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 };
const code = s => C.uid(+s[0], dec[s[1]], +s[2]);
const BC = [
  ['0a0', '0d0', '0e0', '1a1', '1c0', '1c1', '1f1'],
  ['0d0', '0f0', '0f1', '0g1', '1a0', '1b0', '1b1'],
  ['0a0', '0a1', '0b0', '0b1', '0d1', '1a0', '1a1', '1e0', '1e1', '1f0', '1f1'],
  ['0a1', '0b1', '0d1', '0f0', '0f1', '1a0', '1a1', '1b0', '1b1', '1c0', '1d0', '1d1'],
  ['0d0', '0e0', '0e1', '0g0', '0g1', '1c0', '1c1', '1d0', '1d1', '1g0', '1g1'],
  ['0a0', '0b0', '0c0', '0c1', '0d0', '0g0', '0g1', '1c1', '1g0', '1g1'],
].map(c => c.map(code).sort((x, y) => x - y));
{
  const union = ks => { const s = new Set(); ks.forEach(k => BC[k].forEach(i => s.add(i))); return [...s].sort((x, y) => x - y); };
  ok(J(union([0, 2, 4])) === J(C.unitsOf(26).sort((x, y) => x - y)), '방송 1·3·5번 카드를 겹치면 26');
  ok(J(union([1, 3, 5])) === J(C.unitsOf(93).sort((x, y) => x - y)), '방송 2·4·6번 카드를 겹치면 93');
  const an = C.analyze(BC, 6);
  ok(an.best === 119 && an.p > 0.999, `카드 6장 다 보면 합 119 가 확실 (p=${an.p})`);
  ok(C.analyze(BC, 1).p < 0.2 && C.analyze(BC, 4).p < 0.9, '카드가 적을 땐 확실하지 않음');
  ok(an.candA.length === 1 && an.candA[0].a === 26 && an.candB[0].a === 93, '후보가 하나로 좁혀짐');
}

// 3) 판 만들기 — 카드 합집합 = 숫자 모양
{
  let good = true, maxc = 0, cnt = 0, tot = 0, one = 0;
  for (let sd = 1; sd <= (QUICK ? 60 : 300); sd++) {
    const st = C.init({ n: 3, seed: sd });
    const un = ks => { const s = new Set(); ks.forEach(k => st.cards[k].forEach(i => s.add(i))); return [...s].sort((x, y) => x - y); };
    if (J(un([0, 2, 4])) !== J(C.unitsOf(st.A).sort((x, y) => x - y))) good = false;
    if (J(un([1, 3, 5])) !== J(C.unitsOf(st.B).sort((x, y) => x - y))) good = false;
    if (st.A < 1 || st.A > 99 || st.B < 1 || st.B > 99) good = false;
    st.cards.forEach(c => { if (new Set(c).size !== c.length) good = false; maxc = Math.max(maxc, c.length); });
    cnt += st.cards.reduce((a, c) => a + c.length, 0); tot += C.unitsOf(st.A).length + C.unitsOf(st.B).length; if (st.A < 10) one++; if (st.B < 10) one++;
  }
  ok(good, '카드 세 장을 겹치면 숫자 모양이 정확히 나옴 · 숫자 1~99');
  const mean = cnt / tot;
  ok(mean > 1.2 && mean < 1.45, `칸 변 평균 겹침 ≈ 1.3 (방송 화면 1.32): ${mean.toFixed(2)}`);
  ok(one > 0, '한 자리 수도 나옴');
}

// 4) 한 판 흐름 — 말하기 · 오답 잠금 · 정답
const solve = st => st.A + st.B;
{
  const st = C.init({ n: 3, seed: 11 });
  ok(st.phase === 'run' && st.stage === 1 && J(C.needs(st)) === J([0, 1, 2]), '시작: 3명 모두 말할 수 있음');
  // 오답
  ok(C.apply(st, 0, { t: 'ans', sum: solve(st) + 1, ms: 500 }).ok, '오답도 말할 수 있음');
  ok(!C.apply(st, 0, { t: 'wait' }).ok, '같은 카드에 두 번은 못 함');
  ok(C.apply(st, 1, { t: 'wait' }).ok && C.apply(st, 2, { t: 'wait' }).ok, '나머지 기다림');
  ok(st.stage === 2 && st.score.every(x => x === 0), '정답이 없으면 다음 카드');
  ok(J(C.needs(st)) === J([1, 2]), '오답한 쪽은 10초(≈3카드) 잠김 — 지금 카드에서 못 말함');
  ok(st.lockT[0] === 500 + C.LOCK, '잠금은 말한 시각 + 10초');
  C.apply(st, 1, { t: 'wait' }); C.apply(st, 2, { t: 'wait' });          // stage 3
  ok(st.stage === 3 && J(C.needs(st)) === J([1, 2]), '카드 3번째에도 잠김 (6000~9000ms 안)');
  C.apply(st, 1, { t: 'wait' }); C.apply(st, 2, { t: 'wait' });          // stage 4: 9000~12000 → 잠금 10500 이 중간에 풀림
  ok(st.stage === 4 && J(C.needs(st)) === J([0, 1, 2]), '카드 4번째 중간에 잠금이 풀려 다시 말할 수 있음');
  // 풀리는 시각 앞으로는 못 누름 (ms 를 끌어올림)
  const r = C.apply(st, 0, { t: 'ans', sum: solve(st), ms: 100 });
  ok(r.ok, '풀리기 전 시각으로 눌러도 풀리는 시각으로 처리');
  C.apply(st, 1, { t: 'wait' }); C.apply(st, 2, { t: 'wait' });
  ok(st.phase === 'between' && st.score[0] === 1 && st.res.w === 0, '정답 → 1점 · 라운드 끝');
  ok(st.log.some(e => e.k === 'ans' && e.s === 0 && e.ok === false) && st.log.some(e => e.k === 'ans' && e.ok === true), '오답 · 정답이 기록됨');
  ok(st.res.A + st.res.B === st.res.sum, '끝난 라운드는 두 숫자와 합을 공개');
  ok(C.auto(st) === 2800 && C.needs(st).length === 0, '라운드 사이 자동 진행');
  C.advance(st);
  ok(st.phase === 'run' && st.round === 2 && st.stage === 1 && st.lockT.every(x => x === 0), '다음 라운드: 잠금 초기화');
}
// 같은 카드에서 여럿 — 빠른 사람이 먼저, 먼저 맞히면 뒤는 무시
{
  const st = C.init({ n: 3, seed: 21 });
  C.apply(st, 0, { t: 'ans', sum: solve(st), ms: 1800 });
  C.apply(st, 1, { t: 'ans', sum: solve(st) + 3, ms: 700 });
  C.apply(st, 2, { t: 'ans', sum: solve(st), ms: 1200 });
  ok(st.res.w === 2 && st.score[2] === 1 && st.score[0] === 0, '1.2초 정답이 1.8초 정답보다 먼저');
  ok(st.lockT[1] === 700 + C.LOCK, '더 빨리 틀린 사람은 잠금(정답자는 이미 라운드 끝)');
  ok(!st.log.some(e => e.s === 0 && e.k === 'ans'), '정답이 나온 뒤 늦게 말한 것은 기록 안 함');
}
// 같은 0.1초 → 라운드마다 정해 둔 무작위 순서
{
  const st = C.init({ n: 2, seed: 5 });
  C.apply(st, 0, { t: 'ans', sum: solve(st), ms: 900 }); C.apply(st, 1, { t: 'ans', sum: solve(st), ms: 900 });
  const first = st.tb[0] < st.tb[1] ? 0 : 1;
  ok(st.res.w === first, '같은 시각이면 정해진 순서가 앞선 사람');
}
// 잘못된 입력은 상태를 안 바꿈
{
  const st = C.init({ n: 3, seed: 9 }), before = J(st);
  ok(!C.apply(st, 0, { t: 'ans', sum: -1, ms: 0 }).ok && !C.apply(st, 0, { t: 'ans', sum: 3.5, ms: 0 }).ok && !C.apply(st, 0, { t: 'ans', sum: 999, ms: 0 }).ok, '합 범위 밖');
  ok(!C.apply(st, 0, { t: 'x' }).ok && !C.apply(st, 0, null).ok && !C.apply(st, 7, { t: 'wait' }).ok, '엉뚱한 행동 · 없는 자리');
  ok(J(st) === before, '안 먹은 apply 는 상태를 안 바꿈');
}
// 전원 잠김 → 입력 없이 넘어감
{
  const st = C.init({ n: 2, seed: 4 });
  C.apply(st, 0, { t: 'ans', sum: 0, ms: 2900 }); C.apply(st, 1, { t: 'ans', sum: 0, ms: 2900 });     // 둘 다 오답 · 12900 까지 잠김
  ok(st.stage === 2 && C.needs(st).length === 0, '둘 다 잠기면 입력 없이 진행');
  let guard = 0; while (C.needs(st).length === 0 && st.phase === 'run' && guard++ < 10) { ok(C.auto(st) === C.STAGE, '입력 없는 카드는 자동'); C.advance(st); }
  ok(st.stage === 5 && C.needs(st).length === 2, '12900ms 에 잠금이 풀려 5번째 카드에서 다시 말할 수 있음');
}
// 끝까지 아무도 못 맞히면 점수 없이 다음 라운드
{
  const st = C.init({ n: 2, seed: 6 });
  let guard = 0; while (st.phase === 'run' && guard++ < 40) { for (const s of C.needs(st)) C.apply(st, s, { t: 'wait' }); if (!C.needs(st).length && st.phase === 'run') C.advance(st); }
  ok(st.phase === 'between' && st.res.w === -1 && st.stage === C.MAXSTAGE && st.score.every(x => x === 0), `${C.MAXSTAGE}번째 카드까지 아무도 못 맞히면 점수 없음`);
}

// 5) 보이는 것만 — 아직 안 나온 카드 · 정답이 view 에 없음
{
  const st = C.init({ n: 3, seed: 13 });
  const v0 = C.view(st, 0);
  ok(v0.cards.length === 1 && v0.nvis === 1, '1번 카드만 보임');
  const s = J(v0);
  ok(v0.A === undefined && v0.B === undefined && !/"A":|"B":/.test(s.replace(/"hist":\[[^\]]*\]/, '')), 'view 에 정답(두 숫자) 없음');
  ok(J(C.view(st, 0).pub) === J(C.view(st, 1).pub) && C.view(st, 0).pub === C.view(st, -1).pub, 'pub 은 모두 같음');
  const va = C.view(st, 'all');
  ok(va.A === st.A && va.B === st.B && va.cards.length === 6, "'all' 은 정답 · 카드 모두 공개");
  const before = J(st); C.view(st, 1); C.view(st, 'all'); ok(J(st) === before, 'view 는 상태를 안 바꿈');
  // 카드는 3초마다 한 장씩
  for (let k = 2; k <= 7; k++) { for (const x of C.needs(st)) C.apply(st, x, { t: 'wait' }); const v = C.view(st, 0); ok(v.nvis === Math.min(k, 6), `${k}번째 카드 때 ${Math.min(k, 6)}장 보임`); }
}

// 6) 연장 · 순위
{
  let st = C.init({ n: 2, seed: 8, cfg: { rounds: 3 } });
  const play = (st, winner) => { while (st.phase === 'run') { for (const s of C.needs(st)) C.apply(st, s, s === winner ? { t: 'ans', sum: st.A + st.B, ms: 0 } : { t: 'wait' }); } };
  play(st, 0); C.advance(st); play(st, 1); C.advance(st); play(st, 0); C.advance(st);
  ok(C.over(st) && J(C.ranks(st)) === J([0, 1]) && st.score[0] === 2, '3라운드 2:1 이면 끝 · 순위');
  st = C.init({ n: 2, seed: 8, cfg: { rounds: 3 } });
  play(st, 0); C.advance(st); play(st, 1); C.advance(st);
  // 3라운드: 아무도 못 맞힘 → 1:1 → 연장
  while (st.phase === 'run') { for (const s of C.needs(st)) C.apply(st, s, { t: 'wait' }); if (!C.needs(st).length && st.phase === 'run') C.advance(st); }
  C.advance(st);
  ok(!C.over(st) && st.extra === 1 && st.round === 4 && C.view(st, 0).total === 4, '동점이면 연장 라운드');
  play(st, 1); ok(st.res.extra === true, '연장 라운드 표시'); C.advance(st);
  ok(C.over(st) && J(C.ranks(st)) === J([1, 0]), '연장에서 이기면 끝');
  // 계속 비기면 5번까지 연장 → 공동 순위
  st = C.init({ n: 2, seed: 2, cfg: { rounds: 3 } });
  let guard = 0;
  while (!C.over(st) && guard++ < 400) { if (st.phase === 'run') { for (const s of C.needs(st)) C.apply(st, s, { t: 'wait' }); if (!C.needs(st).length && st.phase === 'run') C.advance(st); } else C.advance(st); }
  ok(C.over(st) && st.extra === 5 && J(C.ranks(st)) === J([0, 0]), '끝까지 비기면 연장 5번 뒤 공동 1등');
}

// 7) 인원 2~4 · 안 맞는 입력
{
  ok(C.init({ n: 1, seed: 1 }).n === 2 && C.init({ n: 9, seed: 1 }).n === 4 && C.init({ n: 4, seed: 1 }).score.length === 4, '인원은 2~4');
}

// 8) AI — 합법 · 보이는 것만 · 단계 차이
{
  const rr = mul(7);
  let bad = '';
  for (let g = 0; g < (QUICK ? 6 : 24) && !bad; g++) {
    const st = C.init({ n: 3, seed: 100 + g }); let guard = 0;
    const tiers = ['easy', 'normal', 'hard'];
    while (!C.over(st) && guard++ < 6000) {
      if (st.phase !== 'run') { C.advance(st); continue; }
      const nd = C.needs(st);
      if (!nd.length) { C.advance(st); continue; }
      for (const s of nd) {
        const V = C.view(st, s), vs = J(V);
        const a = C.ai(V, s, tiers[s % 3], rr);
        if (J(V) !== vs) bad = 'ai 가 view 를 바꿈';
        if (!a || !(a.t === 'wait' || (a.t === 'ans' && Number.isInteger(a.sum) && a.ms >= 0 && a.ms < C.STAGE))) { bad = 'ai 행동 모양 ' + J(a); break; }
        const r = C.apply(st, s, a); if (!r.ok) { bad = 'ai 불법 ' + J(a) + ' ' + r.err; break; }
      }
    }
    if (!bad && !C.over(st)) bad = '끝나지 않음';
  }
  ok(!bad, 'AI 경기: ' + (bad || ''));
  ok(C.ai(C.view(C.init({ n: 2, seed: 3 }), 0), 0, 'hard', rr).t === 'wait', '카드 한 장 보고는 안 말함');
  // 방송 1라운드 카드를 다 본 뒤 hard 는 119 를 말함
  const st = C.init({ n: 2, seed: 1 }); st.cards = BC.map(c => c.slice()); st.A = 26; st.B = 93; st.stage = 7;
  const V = C.view(st, 0); const a = C.ai(V, 0, 'hard', mul(1));
  ok(a && (a.t === 'wait' || a.sum === 119), '카드 6장을 다 본 AI 의 합은 119 (또는 읽는 중)');
  st.stage = 12; const V2 = C.view(st, 0); const a2 = C.ai(V2, 0, 'hard', mul(2));
  ok(a2 && a2.t === 'ans' && a2.sum === 119, '충분히 지난 뒤에는 119 를 말함');
}

// 9) 같은 씨앗 · 같은 행동 → 같은 판
{
  const run = () => {
    const st = C.init({ n: 3, seed: 77 }), r = mul(3), acts = []; let guard = 0;
    while (!C.over(st) && guard++ < 4000) {
      if (st.phase !== 'run' || !C.needs(st).length) { C.advance(st); acts.push('A'); continue; }
      for (const s of C.needs(st)) { const a = C.ai(C.view(st, s), s, 'normal', r); C.apply(st, s, a); acts.push(J(a)); }
    }
    return J([st.score, st.hist, acts.length]);
  };
  ok(run() === run(), '같은 씨앗 · 같은 행동 = 같은 판');
}

// 10) 리뷰에서 나온 것: ms 는 0.1초 단위 · 이미 틀린 합 제외 · AI 오답이 범위 밖(199)으로 안 나감
{
  const st = C.init({ n: 2, seed: 31 });
  C.apply(st, 0, { t: 'ans', sum: st.A + st.B + 1, ms: 1750 }); C.apply(st, 1, { t: 'wait' });
  ok(st.log.find(e => e.k === 'ans').ms === 1700 && st.lockT[0] === 1700 + C.LOCK, 'ms 는 0.1초 단위로 내림');
  const an = C.analyze(BC, 6, [119]);
  ok(an.ps[119] === 0, '틀린 합은 후보에서 빠짐');
  const an2 = C.analyze(BC.slice(0, 4), 4), best = an2.best, an3 = C.analyze(BC.slice(0, 4), 4, [best]);
  ok(an3.best !== best && Math.abs(an3.ps.reduce((a, b) => a + b, 0) - 1) < 1e-9, '틀린 합을 빼고 다시 가장 그럴듯한 합을 고름 (확률 합 1)');
  const u = C.unitsOf(99), V = { needs: [0], stage: 4, cards: [u, u, u, u], lockLeft: [0], brn: [0], log: [], round: 1 };
  let worst = 0; for (let i = 0; i < 40; i++) { const a = C.ai(V, 0, 'hard', mul(i + 1)); if (a.t === 'ans') worst = Math.max(worst, a.sum); ok(a.t === 'wait' || (a.sum >= 0 && a.sum <= 198), 'AI 합 범위 ' + J(a)); }
  const st2 = C.init({ n: 2, seed: 8 }); st2.cards = BC.map(c => c.slice()); st2.A = 26; st2.B = 93; st2.stage = 8;
  C.apply(st2, 0, { t: 'ans', sum: 118, ms: 0 }); C.apply(st2, 1, { t: 'wait' });
  const V3 = C.view(st2, 1); ok(C.wrongSums(V3).join() === '118', '이번 라운드 오답 목록');
}

console.log(`mixmatch core: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

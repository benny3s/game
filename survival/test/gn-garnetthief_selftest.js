'use strict';
// 가넷도둑 selftest — 분배 · 벌칙 · 선 순서 · 숨은 정보 · AI
const G = require('../games/gn-garnetthief/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const sampler = G.sampler;
const M = 0, C = 1, P = 2, B = 3;
// 한 라운드를 순서대로 먹임: reals[i], decls[i] (자리 번호 기준)
function round(st, reals, decls) {
  for (const s of st.order.slice()) {
    if (st.over) break;
    const r = ap(st, s, { t: 'pick', c: reals[s], d: decls ? decls[s] : reals[s] }); if (!r.ok) throw new Error('pick ' + s + ' ' + r.err);
  }
}
// 1) 분배표
{
  const eq = (c, g) => G.payout(c).join() === g.join();
  ok(eq([4, 2, 1, 1], [1, 0, 0, 0]), '마피아 4명 > 카르텔: 4개를 1개씩 (남는 것 없음)');
  ok(eq([3, 0, 2, 1], [1, 0, 0, 1]), '마피아 3 · 거지 1: 마피아 1개씩, 남은 1개는 거지');
  ok(eq([2, 2, 3, 1], [0, 0, 1, 1]), '두 조직이 같으면 경찰이 나눔: 4÷3=1씩, 남은 1개 거지');
  ok(eq([0, 0, 3, 5], [0, 0, 1, 0]), '조직이 아무도 없으면 경찰: 1씩 3개, 남은 1개는 거지 5명이 못 나눠 회수');
  ok(eq([1, 0, 0, 7], [4, 0, 0, 0]), '마피아 혼자면 4개 전부');
  ok(G.payout([3, 1, 2, 2]).join() === '1,0,0,0', '마피아 3명: 1개씩 3개 · 남은 1개는 거지 2명이 못 나눠 회수');
  ok(G.payout([0, 0, 0, 4]).join() === '0,0,0,1' && G.payout([0, 0, 0, 2]).join() === '0,0,0,2', '조직 · 경찰이 없으면 거지가 4개를 나눠요');
  ok(G.payout([2, 2, 0, 4]).join() === '0,0,0,1', '두 조직 같고 경찰 없음 → 거지가 4개 나눔');
  ok(G.payout([1, 1, 0, 0]).join() === '0,0,0,0', '두 조직 같고 경찰 · 거지 없음 → 주최 회수');
}
// 2) 시작 · 선 순서
{
  for (const N of [4, 6, 8]) { const st = G.init({ n: N, seed: 1 }); ok(st.gar.every(x => x === 5) && st.rounds === 8 && G.needs(st).join() === '0', `${N}명: 가넷 5개씩 · 8라운드 · 선 1번부터`); }
  ok(G.init({ n: 2, seed: 1 }).n === 4 && G.init({ n: 12, seed: 1 }).n === 8, '인원 4~8명');
  const st = G.init({ n: 4, seed: 1 });
  round(st, [B, B, B, B]);
  ok(st.round === 1 && st.order.join() === '1,2,3,0' && G.needs(st).join() === '1', '다음 라운드는 2번이 선 — 선부터 시계 순서');
  const s8 = G.init({ n: 8, seed: 1 }); for (let r = 0; r < 3; r++) round(s8, Array(8).fill(B));
  ok(s8.order.join() === '3,4,5,6,7,0,1,2', '4라운드 선은 4번');
}
// 3) 차례 · 입력 검증
{
  const st = G.init({ n: 4, seed: 1 });
  ok(!ap(st, 1, { t: 'pick', c: 0, d: 0 }).ok, '내 차례가 아니면 못 해요');
  ok(!ap(st, 0, { t: 'pick', c: 4, d: 0 }).ok && !ap(st, 0, { t: 'pick', c: 0, d: -1 }).ok && !ap(st, 0, { t: 'pick', c: 1.5, d: 0 }).ok, '캐릭터 0~3');
  ok(ap(st, 0, { t: 'pick', c: 0, d: 2 }).ok && G.needs(st).join() === '1', '선 플레이어 다음 사람 차례');
  ok(!ap(st, 0, { t: 'pick', c: 0, d: 0 }).ok, '한 번 고른 뒤엔 못 바꿔요');
  const V1 = G.view(st, 1); ok(V1.decl[0] === 2 && V1.decl[1] === null, '앞사람이 말한 것은 보여요');
}
// 4) 정산 · 벌칙
{
  const st = G.init({ n: 4, seed: 1 });
  // 0 마피아(사실) · 1 마피아(거짓: 경찰이라 말함) · 2 거지(사실) · 3 경찰(거짓: 거지라 말함)
  round(st, [M, M, B, P], [M, P, B, B]);
  // 마피아 2명 > 카르텔 0 → 4÷2=2씩 · 남는 것 없음. 거짓 선언한 1번은 2개를 받아 벌칙 없음, 3번은 0개 + 거짓 → -1
  ok(st.hist[0].gain.join() === '2,2,0,0' && st.hist[0].pen.join() === '0,0,0,1', '가넷을 받은 사람은 거짓이어도 벌칙 없음 · 못 받은 거짓말쟁이만 벌칙');
  ok(st.gar.join() === '7,7,5,4', '가넷: 5+2 · 5+2 · 5 · 5−1');
  // 가넷이 없으면 안 냄
  const z = G.init({ n: 4, seed: 1, cfg: { start: 0 } });
  round(z, [M, M, B, P], [M, P, B, B]);
  ok(z.gar.join() === '2,2,0,0', '가넷이 0개면 벌칙을 안 내요');
  // 사실대로 말했는데 못 받으면 벌칙 없음
  const t = G.init({ n: 4, seed: 1 }); round(t, [M, M, B, P], [M, M, B, P]);
  ok(t.hist[0].pen.join() === '0,0,0,0', '진실을 말하면 못 받아도 벌칙 없음');
  const V = G.view(t, 0); ok(V.hist[0].real.join() === '0,0,3,2' && V.hist[0].counts.join() === '2,0,1,1', '끝난 라운드는 모두의 정체가 공개');
}
// 5) 끝 · 순위
{
  const st = G.init({ n: 4, seed: 1 });
  for (let r = 0; r < 8; r++) round(st, [M, M, M, B]);   // 마피아 3: 1씩 + 남은 1은 거지(3번)
  ok(st.gar.join() === '13,13,13,13', '마피아 3 + 거지 1 을 8번: 모두 +1씩 (13)');
  ok(st.over && st.draw && st.ranks.join() === '0,0,0,0' && st.losers.length === 0, '전원 가넷이 같으면 무승부');
  const u = G.init({ n: 4, seed: 1 });
  for (let r = 0; r < 8; r++) round(u, [M, M, M, M], [M, M, M, P]);   // 마피아 4명: 1씩. 3번이 거짓말하지만 가넷을 받으니 벌칙 없음
  ok(u.over && u.gar.join() === '13,13,13,13', '전원 마피아면 모두 1개 (거짓 선언해도 받으면 벌칙 없음)');
  const w = G.init({ n: 4, seed: 1 });
  for (let r = 0; r < 8; r++) round(w, [M, M, M, P], [M, M, M, P]);   // 마피아 3: 1,1,1 / 경찰 0
  ok(w.over && w.gar.join() === '13,13,13,5' && w.ranks.join() === '0,0,0,3' && w.losers.join() === '3', '1위 공동 · 꼴찌 3번 (공동 순위)');
  ok(G.view(w, 3).ranks.join() === '0,0,0,3' && !ap(w, 0, { t: 'pick', c: 0, d: 0 }).ok, '끝난 판은 막혀요');
}
// 6) 숨은 정보: 남의 진짜 선택은 안 보여요
{
  const mk = (r1, r2) => { const st = G.init({ n: 5, seed: 9 }); ap(st, 0, { t: 'pick', c: r1, d: 0 }); ap(st, 1, { t: 'pick', c: r2, d: 3 }); return st; };
  const A = mk(0, 1), Bt = mk(2, 3);   // 말한 것은 같고(0 · 3) 진짜 고른 것만 다름
  const vA = G.view(A, 2), vB = G.view(Bt, 2);
  ok(JSON.stringify(vA) === JSON.stringify(vB), '말은 같고 진짜 선택만 다른 두 판은 3번에게 똑같이 보여요');
  let same = true;
  for (const t of ['easy', 'normal', 'hard']) for (let k = 0; k < 4; k++) if (JSON.stringify(G.ai(vA, 2, t, sampler(k + 2))) !== JSON.stringify(G.ai(vB, 2, t, sampler(k + 2)))) same = false;
  ok(same, 'AI 가 남의 진짜 선택을 몰라도 똑같이 결정해요');
  ok(JSON.stringify(G.coach(vA, 2, 0, null)) === JSON.stringify(G.coach(vB, 2, 0, null)), '선생님 설명도 숨은 정보에 안 흔들려요');
  ok(!('curReal' in vA) && !('curReal' in G.view(A, -1)) && 'curReal' in G.view(A, 'all'), "구경꾼(-1)은 진짜 선택을 못 보고 'all' 만 봐요");
}
// 7) AI: 늘 규칙 안 · 끝남 · 고급이 초급보다 못하지 않음
{
  for (const N of [4, 6, 8]) {
    const sum = { hard: 0, normal: 0, easy: 0 }, cnt = { hard: 0, normal: 0, easy: 0 };
    for (let g = 0; g < 50; g++) {
      const st = G.init({ n: N, seed: 300 + g }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]), rr = sampler(g * 3 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 400) for (const s of G.needs(st)) {
        const V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
        if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); ap(st, s, G.legal(st, s)[0]); }
      }
      ok(G.over(st), `${N}명 ${g}판 끝남`);
      for (let i = 0; i < N; i++) { sum[T[i]] += st.score[i]; cnt[T[i]]++; }
    }
    const av = t => sum[t] / cnt[t];
    console.log(`  ${N}명: 평균 가넷 hard ${av('hard').toFixed(1)} · normal ${av('normal').toFixed(1)} · easy ${av('easy').toFixed(1)}`);
    ok(av('hard') >= av('easy'), `${N}명: 고급이 초급보다 못하지 않아요`);
  }
}
// 8) 선생님 · view 불변
{
  const st = G.init({ n: 6, seed: 4 }); ap(st, 0, { t: 'pick', c: 0, d: 0 });
  const V = G.view(st, 1), c = G.coach(V, 1, -1, null);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string' && c[k].length > 3) && /기대값/.test(c.why), '선생님: 👀📊💡 + 숫자 근거');
  const sd = V.round * 131 + V.pos * 17 + 1 * 7 + V.hist.length * 3 + 5, a = G.ai(V, 1, 'hard', sampler(sd));
  ok(c.rec.includes(G.CHARS[a.c].n), '💡 = 고급 AI 의 수');
  const before = JSON.stringify(V); G.ai(V, 1, 'hard', sampler(1)); G.coach(V, 1, -1, null);
  ok(JSON.stringify(V) === before, 'ai · 선생님이 받은 view 를 안 바꿔요');
  ok(typeof G.coach(G.view(st, 'all'), 3, -1, null).rec === 'string', "구경('all') 선생님이 안 죽어요");
}
console.log(`가넷도둑 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

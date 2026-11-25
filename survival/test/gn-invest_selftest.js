'use strict';
// 투자와 기부 selftest — 규칙 · 숨은 정보 · AI
const G = require('../games/gn-invest/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const round = (st, bids) => bids.forEach(([v, d], i) => { const r = ap(st, i, { t: 'bid', v, d }); if (!r.ok) throw new Error('bid ' + i + ' ' + r.err); });

// 1) 시작
{
  const st = G.init({ n: 6, seed: 5 }), V = G.view(st, 0);
  ok(st.n === 6 && st.cash.every(c => c === 150) && st.rounds === 9, '6명 · 1인 15만 원(150천 원) · 9라운드');
  ok(G.needs(st).length === 6 && V.round === 0 && V.cash === 150, '처음엔 모두가 동시에 내요');
  ok(G.init({ n: 2, seed: 1 }).n === 3 && G.init({ n: 9, seed: 1 }).n === 6, '인원은 3~6명');
}
// 2) 대주주
{
  ok(G.pickBig([5, 3, 9, 1]) === 2, '투자가 가장 많은 한 명');
  ok(G.pickBig([9, 9, 4, 1]) === 2, '최다가 동률이면 아무도 못 받고 그다음 순위가 받아요');
  ok(G.pickBig([9, 9, 4, 4]) === -1, '그다음도 동률이면 없음');
  ok(G.pickBig([0, 0, 0, 0]) === -1, '모두 0 이면 없음');
  ok(G.pickBig([0, 0, 7, 0]) === 2 && G.pickBig([7, 7, 0, 0]) === -1, '0 은 대주주를 못 받아요 / 한 명만 투자했으면 그 사람');
  ok(G.pickBig([6, 6, 6, 2]) === 3, '세 명 동률이어도 다음 순위 한 명');
}
// 3) 수전노
{
  ok(G.pickMiser([5, 2, 8, 2], -1).join() === '1,3', '기부 최소가 동률이면 모두 수전노');
  ok(G.pickMiser([0, 4, 5, 6], 0).join() === '1', '대주주는 수전노를 안 받고 그다음으로 적게 기부한 사람이 받아요');
  ok(G.pickMiser([3, 3, 3], 1).join() === '0,2', '대주주를 뺀 나머지의 최소');
}
// 4) 입력 검증
{
  const st = G.init({ n: 4, seed: 2 });
  ok(!ap(st, 0, { t: 'bid', v: 100, d: 60 }).ok, '가진 돈보다 많이 낼 수 없어요');
  ok(!ap(st, 0, { t: 'bid', v: -1, d: 3 }).ok && !ap(st, 0, { t: 'bid', v: 1.5, d: 3 }).ok, '음수 · 소수는 안 돼요');
  ok(ap(st, 0, { t: 'bid', v: 50, d: 100 }).ok, '남은 돈 150 을 전부 쓸 수 있어요');
  ok(!ap(st, 0, { t: 'bid', v: 1, d: 1 }).ok, '한 번 낸 뒤엔 바꿀 수 없어요');
  ok(G.needs(st).join() === '1,2,3', '내지 않은 사람만 기다려요');
  ok(!ap(st, 1, { t: 'pass' }).ok, '모르는 행동');
}
// 5) 한 라운드 진행 · 공개 정보
{
  const st = G.init({ n: 4, seed: 3 });
  round(st, [[10, 2], [6, 4], [3, 0], [0, 8]]);
  const V = G.view(st, 1);
  ok(st.round === 1 && V.hist.length === 1, '모두 내면 결과가 나오고 다음 라운드');
  const h = V.hist[0];
  ok(h.ti === 19 && h.td === 14 && h.big === 0 && h.miser.join() === '2', '투자 19 · 기부 14 · 대주주 0번 · 수전노 2번(대주주 제외, 기부 0)');
  ok(h.mv === 6 && h.md === 4 && G.view(st, 0).hist[0].mv === 10, '개인 금액은 나만 알아요');
  ok(V.cash === 140 && G.view(st, 3).cash === 142, '낸 돈은 사라져요');
  ok(V.amts === null && G.view(st, 'all').amts && G.view(st, -1).amts[0].v.join() === '10,6,3,0', '관전은 모두 보이고 참가자는 개인 금액이 안 보여요');
  ok(V.bigC[0] === 1 && V.misC[2] === 1 && V.misC[0] === 0, '표식 집계');
}
// 6) 끝 · 순위 (표식은 공개 정보)
{
  const st = G.init({ n: 4, seed: 4, cfg: { rounds: 3 } });
  round(st, [[9, 5], [4, 0], [1, 4], [0, 6]]);   // 대주주 0, 수전노 1
  round(st, [[0, 3], [8, 0], [2, 4], [3, 6]]);   // 대주주 1, 수전노 0
  ok(!st.over, '아직 라운드가 남았어요');
  round(st, [[0, 1], [5, 0], [1, 3], [2, 4]]);   // 대주주 1, 수전노 0
  ok(st.over && st.bigC.join() === '1,2,0,0' && st.misC.join() === '2,1,0,0', '9라운드(여기선 3) 뒤 끝 — 표식 집계');
  ok(st.losers.join() === '0' && st.ranks.join() === '3,0,1,1' && G.ranks(st).join() === '3,0,1,1', '수전노 최다(0번)가 최하위, 나머지 중 대주주 최다(1번)가 우승, 나머지는 같은 순위');
  ok(st.score.join() === '0,2,0,0', '점수 = 받은 대주주 표식 수 (최하위는 0)');
  ok(!ap(st, 0, { t: 'bid', v: 0, d: 0 }).ok, '끝난 판에는 낼 수 없어요');
  ok(G.view(st, 0).amts && G.view(st, 0).amts.length === 3, '끝나면 모든 금액이 공개돼요');
}
{
  const R = G.rankAll({ n: 3, misC: [1, 1, 1], bigC: [2, 0, 1] });
  ok(R.draw && R.ranks.join() === '0,0,0', '수전노 표식이 모두 같으면 무승부');
  const R2 = G.rankAll({ n: 4, misC: [3, 3, 0, 1], bigC: [0, 5, 2, 2] });
  ok(R2.losers.join() === '0,1' && R2.ranks.join() === '2,2,0,1', '최하위가 둘이면 둘 다 최하위(공동) · 나머지는 대주주 수가 같으면 수전노가 적은 쪽이 앞');
  const R3 = G.rankAll({ n: 4, misC: [0, 0, 1, 2], bigC: [2, 2, 3, 0] });
  ok(R3.ranks.join() === '1,1,0,3', '대주주 수가 같으면 수전노가 적은 쪽이 앞 · 같으면 공동');
  const R4 = G.rankAll({ n: 4, misC: [0, 1, 2, 2], bigC: [3, 3, 1, 0] });
  ok(R4.ranks.join() === '0,1,2,2', '대주주 동률이면 수전노가 적은 사람이 앞서요 (최하위 둘은 꼴찌 공동)');
}
// 7) 숨은 정보: 개인 금액이 달라도 공개 결과가 같으면 공개 · AI · 선생님 결과가 같아요
{
  const A = G.init({ n: 4, seed: 9 }), B = G.init({ n: 4, seed: 9 });
  round(A, [[5, 3], [2, 6], [1, 8], [3, 6]]);
  round(B, [[5, 3], [3, 6], [0, 8], [3, 6]]);   // 1번 · 2번의 투자만 서로 다름 (합계 · 대주주 · 수전노는 같음)
  const va = G.view(A, 0), vb = G.view(B, 0);
  ok(va.pub === vb.pub, '개인 금액이 달라도 공개 결과가 같으면 pub 가 같아요');
  let same = true;
  for (const t of ['easy', 'normal', 'hard']) for (let k = 0; k < 8; k++) { const a = JSON.stringify(G.ai(va, 0, t, sampler(k + 3))), b = JSON.stringify(G.ai(vb, 0, t, sampler(k + 3))); if (a !== b) same = false; }
  ok(same, '다른 사람의 개인 금액을 몰라도 AI 가 똑같이 결정해요');
  ok(JSON.stringify(G.coach(va, 0, 0, null)) === JSON.stringify(G.coach(vb, 0, 0, null)), '선생님 설명도 숨은 정보에 안 흔들려요');
  // 현재 라운드에 다른 사람이 낸 값은 안 보여요
  const C = G.init({ n: 4, seed: 9 }), D = G.init({ n: 4, seed: 9 });
  ap(C, 1, { t: 'bid', v: 40, d: 40 }); ap(D, 1, { t: 'bid', v: 0, d: 0 });
  const vc = G.view(C, 0), vd = G.view(D, 0);
  ok(vc.pub === vd.pub && JSON.stringify(vc.submitted) === JSON.stringify(vd.submitted) && JSON.stringify(G.ai(vc, 0, 'hard', sampler(4))) === JSON.stringify(G.ai(vd, 0, 'hard', sampler(4))), '이번 라운드에 상대가 낸 금액은 누구에게도 안 보여요');
  ok(vc.mineBid === null && G.view(C, 1).mineBid.v === 40, '내가 낸 금액만 나에게 보여요');
}
// 8) AI 가 낸 금액은 늘 규칙 안 · 판이 끝남 · 어려운 AI 가 쉬운 AI 보다 못하지 않아요
{
  for (const N of [3, 4, 5, 6]) {
    const sc = { hard: 0, normal: 0, easy: 0 }, win = { hard: 0, normal: 0, easy: 0 }, cnt = { hard: 0, normal: 0, easy: 0 }, last = { hard: 0, normal: 0, easy: 0 };
    for (let g = 0; g < 80; g++) {
      const st = G.init({ n: N, seed: 500 + g }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]);
      const rr = sampler(g * 3 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 200) {
        for (const s of G.needs(st)) {
          const V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
          if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); const L = G.legal(st, s); ap(st, s, L[0]); }
        }
      }
      ok(G.over(st), `${N}명 ${g}판 끝남`);
      for (let i = 0; i < N; i++) { cnt[T[i]]++; sc[T[i]] += st.score[i]; if (st.ranks[i] === 0 && !st.draw) win[T[i]]++; if (st.losers.includes(i) && !st.draw) last[T[i]]++; }
    }
    console.log(`  ${N}명: 우승 hard ${win.hard} · normal ${win.normal} · easy ${win.easy} / 최하위 hard ${last.hard} · normal ${last.normal} · easy ${last.easy}`);
    const wr = t => win[t] / cnt[t], lr = t => last[t] / cnt[t];
    ok(wr('hard') >= wr('easy') && lr('hard') <= lr('easy') + 0.02, `${N}명: 어려운 AI 가 쉬운 AI 보다 못하지 않아요`);
  }
}
console.log(`투자와 기부 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

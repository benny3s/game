'use strict';
// 호러 레이스 selftest — 이동 규칙 · 코인 포기 순서 · 골인 · 점수 · 숨은 정보 · AI
const G = require('../games/gn-horror/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const sampler = G.sampler;
const sup = (st, list) => list.forEach((s, i) => { const r = ap(st, i, { t: 'sup', s }); if (!r.ok) throw new Error('sup ' + r.err); });
// 지정한 코인을 뽑게 (박스 앞에 끼워 넣고 → draw 가 무작위라 직접 hand 를 정함: 시험용으로 st.hand 를 덮어씀)
function turn(st, coins, zs) {
  const s = st.order[st.idx];
  const r1 = ap(st, s, { t: 'draw' }); if (!r1.ok) throw new Error('draw ' + r1.err);
  // 박스에서 뽑힌 3개를 되돌리고 원하는 코인을 지정 (규칙 시험용)
  st.box.push(...st.hand); st.hand = coins.slice(); coins.forEach(c => { const j = st.box.indexOf(c); if (j >= 0) st.box.splice(j, 1); });
  const r2 = ap(st, s, { t: 'place', z: zs }); if (!r2.ok) throw new Error('place ' + r2.err);
}

// 1) 이동 규칙
{
  const pm = c => G.pickMover(c);
  ok(pm([3, 1, 0, 0, 0]) === 0, '가장 많은 캐릭터가 이동');
  ok(pm([2, 2, 1, 0, 0]) === 2, '최다 동률이면 그 캐릭터들은 못 가고 그다음으로 많은 캐릭터가 이동');
  ok(pm([2, 2, 0, 0, 0]) === -1 && pm([1, 1, 1, 1, 1]) === -1 && pm([0, 0, 0, 0, 0]) === -1, '전부 동률 · 코인 없음이면 아무도 못 가요');
  ok(pm([3, 3, 2, 2, 1]) === 4, '두 겹 동률도 건너뛰어 다음 단독 최다가 이동');
  ok(pm([3, 3, 2, 2, 0]) === -1, '남은 것도 전부 동률이면 아무도 못 가요');
}
// 2) 시작 · 박스
{
  ok(G.init({ n: 2, seed: 1 }).n === 4 && G.init({ n: 12, seed: 1 }).n === 8, '인원 4~8명');
  const st = G.init({ n: 4, seed: 3 });
  ok(!ap(st, 0, { t: 'sup', s: [1, 1] }).ok && !ap(st, 0, { t: 'sup', s: [0] }).ok && !ap(st, 0, { t: 'sup', s: [0, 5] }).ok && !ap(st, 0, { t: 'draw' }).ok, '응원 캐릭터는 서로 다른 2개 · 시작 단계엔 뽑을 수 없어요');
  sup(st, [[0, 1], [0, 1], [2, 3], [3, 4]]);
  ok(st.phase === 'race' && st.boxAll.length === 12 && st.box.length === 12, '남은 3종씩 → 박스 3×인원 = 12개');
  const cnt = [0, 0, 0, 0, 0]; st.boxAll.forEach(c => cnt[c]++);
  ok(cnt.join() === '2,2,3,2,3', '박스 안 캐릭터별 개수 = 인원 − 응원한 사람 수');
  ok(G.needs(st).join() === '0', '1번부터');
}
// 3) 한 라운드: 구역 순서대로 이동
{
  const st = G.init({ n: 4, seed: 3 }); sup(st, [[0, 1], [0, 1], [2, 3], [3, 4]]);
  turn(st, [2, 2, 2], [0, 0, 0]);                 // 0번: 구미호 3개 → 1구역
  turn(st, [3, 3, 4], [1, 1, 1]);                 // 1번: 2구역에 좀비 · 미라
  turn(st, [0, 0, 4], [2, 2, 0]);                 // 2번: 4구역에 뱀파이어 2 · 1구역에 좀비 1
  turn(st, [1, 1, 3], [2, 2, 2]);                 // 3번: 4구역에 강시 2 + 미라 → 뱀파이어2 강시2 동률 → 미라(1) 이동
  const h = st.hist[0];
  ok(h.moves[0] && h.moves[0].c === 2 && h.moves[0].to === 1, '1구역: 구미호 3개 → 1칸');
  ok(h.moves[1] && h.moves[1].c === 3 && h.moves[1].to === 2, '2구역: 미라 2개 → 2칸 (좀비 1개)');
  ok(h.moves[2] && h.moves[2].c === 3 && h.moves[2].to === 6, '4구역: 뱀파이어 2 · 강시 2 동률 · 미라 1개가 단독 → 미라 4칸 (이미 2칸 → 6)');
  ok(st.pos.join() === '0,0,1,6,0', '위치 갱신 (구미호 1 · 미라 6)');
  ok(st.zone.every(z => z.every(x => x === 0)) && st.box.length === 12 && st.order.join() === '0,1,2,3', '라운드가 끝나면 코인은 박스로 · 순서는 그대로');
}
// 4) 코인 포기: 다음 라운드 맨 마지막 · 다음 사람이 1번 · 한 라운드에 한 명
{
  const st = G.init({ n: 5, seed: 4 }); sup(st, [[0, 1], [0, 2], [1, 2], [3, 4], [2, 3]]);
  turn(st, [0, 1, 2], [0, 0, 0]);
  ok(ap(st, 1, { t: 'skip' }).ok && G.needs(st).join() === '2', '1번 다음 2번(자리 1)이 코인을 포기하면 다음은 자리 2');
  ok(!ap(st, 2, { t: 'skip' }).ok, '앞 순서가 이미 포기했으면 못 해요');
  ok(G.view(st, 2).canSkip === false, 'view 도 포기 불가를 알려줘요');
  turn(st, [0, 1, 2], [0, 0, 0]); turn(st, [1, 1, 2], [0, 0, 0]); turn(st, [2, 2, 3], [1, 1, 1]);
  ok(st.round === 1 && st.order.join() === '2,3,4,0,1', '다음 라운드: 포기한 자리 1 은 맨 뒤 · 그다음 자리 2 가 1번 (' + st.order.join() + ')');
  const v = G.view(st, 0); ok(v.hist[0].skipper === 1 && v.hist[0].turns.length === 4, '포기한 사람은 코인을 안 놓아요');
  // 뽑은 뒤엔 포기 못 함
  const s2 = G.init({ n: 4, seed: 4 }); sup(s2, [[0, 1], [0, 1], [2, 3], [3, 4]]);
  ap(s2, 0, { t: 'draw' }); ok(!ap(s2, 0, { t: 'skip' }).ok && ap(s2, 0, { t: 'place', z: [0, 1, 2] }).ok, '뽑고 나서는 포기할 수 없어요 · 뽑은 코인 3개를 놓아야 해요');
  const s3 = G.init({ n: 4, seed: 4 }); sup(s3, [[0, 1], [0, 1], [2, 3], [3, 4]]);
  ap(s3, 0, { t: 'draw' }); ok(!ap(s3, 0, { t: 'place', z: [0, 1] }).ok && !ap(s3, 0, { t: 'place', z: [0, 1, 3] }).ok && !ap(s3, 1, { t: 'draw' }).ok, '코인 3개 모두 · 구역 0~2 · 내 차례만');
}
// 5) 골인 · 점수
{
  const mk = () => { const st = G.init({ n: 4, seed: 3 }); sup(st, [[0, 1], [0, 1], [2, 3], [3, 4]]); return st; };
  const st = mk(); st.pos = [0, 0, 0, 11, 0];
  turn(st, [3, 3, 3], [0, 0, 0]); turn(st, [0, 0, 0], [2, 2, 2]); turn(st, [1, 1, 1], [1, 1, 1]); turn(st, [2, 2, 2], [2, 2, 2]);
  ok(st.over && st.fin === 3 && st.pos.join() === '0,0,0,12,0' && st.hist[0].moves.length === 1, '1구역에서 골인하면 즉시 끝 — 2 · 4구역은 안 움직여요');
  ok(G.charScores([12, 5, 5, 3, 3]).sc.join() === '3,1,1,0,0', '공동 2등은 1점씩');
  ok(G.charScores([12, 8, 5, 5, 1]).sc.join() === '3,2,1,1,0', '공동 3등은 1점씩');
  ok(G.charScores([12, 8, 6, 3, 1]).sc.join() === '3,2,1,0,0', '1등 3 · 2등 2 · 3등 1');
  ok(G.charScores([12, 8, 8, 3, 1]).sc.join() === '3,1,1,0,0', '공동 2등이면 3등(여기선 4등) 응원자는 0점');
  // 점수: 0번 [0,1], 1번 [0,1], 2번 [2,3], 3번 [3,4] — 위치 [5,12,1,2,0] 이면 강시 1등
  const t = mk(); t.pos = [5, 11, 1, 2, 0];
  turn(t, [1, 1, 1], [0, 0, 0]); turn(t, [0, 0, 0], [2, 2, 2]); turn(t, [4, 4, 4], [1, 1, 1]); turn(t, [2, 2, 2], [2, 2, 2]);
  // 1구역: 강시 3 → 12 골인 → 끝. 순위 강시(12) 뱀파이어(5) 미라(2) 구미호(1) 좀비(0)
  ok(t.over && t.pts.join() === '5,5,1,1', '점수: 응원한 두 캐릭터 점수 합 (뱀파이어 2 + 강시 3 = 5)');
  ok(t.over && t.ranks.join() === '0,0,2,2' && t.losers.join() === '2,3', '순위 · 최하위 (' + t.pts.join() + ')');
  const V = G.view(t, 2); ok(V.sup && V.sup.length === 4, '끝나면 모두의 응원 캐릭터가 공개돼요');
  const d = mk(); d.over = false; ok(!ap(t, 0, { t: 'draw' }).ok, '끝난 판은 막혀요');
}
// 6) 숨은 정보
{
  const mk = s1 => { const st = G.init({ n: 4, seed: 9 }); sup(st, [[0, 1], s1, [2, 3], [3, 4]]); return st; };
  const A = mk([0, 2]), B = mk([1, 4]);   // 1번의 응원만 다름 (0번이 보는 것은 같아야 함 — 단, 박스 구성은 달라지므로 뽑히는 코인이 다를 수 있어 view 지문만 비교)
  const vA = G.view(A, 0), vB = G.view(B, 0);
  ok(vA.mySup.join() === vB.mySup.join() && !('supAll' in vA) && vA.sup === null && vA.hand === null, '남의 응원 캐릭터는 안 보이고 내 것만 보여요');
  ok(G.view(A, -1).mySup === null && G.view(A, -1).sup === null && 'supAll' in G.view(A, 'all'), "구경꾼(-1)은 응원도 못 봐요, 'all' 만 봐요");
  // 뽑은 코인은 내 차례 본인만
  const st = mk([0, 2]); ap(st, 0, { t: 'draw' });
  ok(G.view(st, 0).hand && G.view(st, 0).hand.length === 3 && G.view(st, 1).hand === null && G.view(st, -1).hand === null && G.view(st, 1).handOn === true, '뽑은 코인은 놓기 전까지 그 사람만 봐요');
  // 놓은 코인은 모두에게 공개
  ap(st, 0, { t: 'place', z: [0, 1, 2] });
  ok(G.view(st, 3).turns.length === 1 && G.view(st, 3).turns[0].coins.length === 3, '놓은 코인과 구역은 모두에게 공개');
  // 같은 공개 정보 + 다른 남의 응원 → AI · 선생님 결정이 같아야 함 (남의 응원은 view 에 없으니 당연히 같음 — 같은 상황을 만들어 검사)
  const mk2 = sp => { const s = G.init({ n: 4, seed: 9 }); sup(s, [[0, 1], sp, [2, 3], [3, 4]]); s.box = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1]; s.boxAll = s.box.slice(); ap(s, 0, { t: 'draw' }); s.hand = [2, 3, 4]; return s; };
  const X = mk2([0, 2]), Y = mk2([1, 4]);
  X.order = [1, 0, 2, 3]; Y.order = [1, 0, 2, 3]; X.idx = 1; Y.idx = 1;
  const vx = G.view(X, 0), vy = G.view(Y, 0);
  let same = true;
  for (const t of ['easy', 'normal', 'hard']) for (let k = 0; k < 4; k++) if (JSON.stringify(G.ai(vx, 0, t, sampler(k + 2))) !== JSON.stringify(G.ai(vy, 0, t, sampler(k + 2)))) same = false;
  ok(same && vx.pub === vy.pub, '남의 응원 캐릭터를 몰라도 AI 가 똑같이 결정해요');
  ok(JSON.stringify(G.coach(vx, 0, 0, null)) === JSON.stringify(G.coach(vy, 0, 0, null)), '선생님 설명도 숨은 정보에 안 흔들려요');
}
// 7) AI: 늘 규칙 안 · 끝남 · 고급이 초급보다 못하지 않아요
{
  for (const N of [4, 6, 8]) {
    const sum = { hard: 0, normal: 0, easy: 0 }, cnt = { hard: 0, normal: 0, easy: 0 };
    for (let g = 0; g < 40; g++) {
      const st = G.init({ n: N, seed: 300 + g }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]), rr = sampler(g * 3 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 4000) for (const s of G.needs(st)) {
        const V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
        if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); ap(st, s, G.legal(st, s)[0]); }
      }
      ok(G.over(st), `${N}명 ${g}판 끝남`);
      for (let i = 0; i < N; i++) { sum[T[i]] += st.score[i]; cnt[T[i]]++; }
    }
    const av = t => sum[t] / cnt[t];
    console.log(`  ${N}명: 평균 점수 hard ${av('hard').toFixed(2)} · normal ${av('normal').toFixed(2)} · easy ${av('easy').toFixed(2)}`);
    ok(av('hard') >= av('easy') - 0.05, `${N}명: 고급이 초급보다 못하지 않아요`);
  }
}
// 8) 선생님 · view 불변
{
  const st = G.init({ n: 5, seed: 5 }); sup(st, [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]]);
  const V0 = G.view(st, 0), c0 = G.coach(V0, 0, -1, null);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c0[k] === 'string' && c0[k].length > 3), '선생님: 뽑기 전 설명');
  ap(st, 0, { t: 'draw' });
  const V = G.view(st, 0), c = G.coach(V, 0, -1, null);
  ok(/→/.test(c.rec) && /가치/.test(c.why), '선생님: 뽑은 코인을 어디에 놓을지 + 숫자 근거');
  const sd = V.round * 97 + V.idx * 13 + 0 * 5 + 7, a = G.ai(V, 0, 'hard', sampler(sd));
  ok(V.hand.every((cc, k) => c.rec.includes(G.CHARS[cc].n + ' → ' + ['1칸', '2칸', '4칸'][a.z[k]])), '💡 = 고급 AI 의 수');
  const before = JSON.stringify(V); G.ai(V, 0, 'hard', sampler(1)); G.coach(V, 0, -1, null);
  ok(JSON.stringify(V) === before, 'ai · 선생님이 받은 view 를 안 바꿔요');
  ok(typeof G.coach(G.view(st, 'all'), 2, -1, null).rec === 'string', "구경('all') 선생님이 안 죽어요");
}
console.log(`호러 레이스 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

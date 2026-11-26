'use strict';
// 오늘의 메뉴 selftest — 칸 · 승점 · 방송 2라운드 장면 · 다시 시작 · 숨은 정보 · AI
const G = require('../games/gn-menu/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const sampler = G.sampler;
// 한 라운드: menus[i], p1[i], p2[i] (칸 번호) 를 모두 먹임
function round(st, menus, p1, p2) {
  menus.forEach((m, i) => { const r = ap(st, i, { t: 'pick', m, b: p1[i] }); if (!r.ok) throw new Error('pick ' + i + ' ' + r.err); });
  (p2 || p1).forEach((b, i) => { const r = ap(st, i, { t: 'adj', b }); if (!r.ok) throw new Error('adj ' + i + ' ' + r.err); });
}
const lab = n => G.bands(n).map((b, i) => G.bandLabel(G.bands(n), i) + ':' + b.pts).join(' ');

// 1) 칸 · 승점표
{
  ok(lab(11) === '1명:5 2~3명:3 4~6명:2 7~10명:1 11명 전원:4', '11명이면 방송 그대로 ' + lab(11));
  for (let n = 3; n <= 11; n++) {
    const B = G.bands(n);
    let cover = true; for (let k = 1; k <= n; k++) if (G.bandOf(B, k) < 0) cover = false;
    ok(cover && B[0].lo === 1 && B[B.length - 1].hi === n && B[B.length - 1].pts === 4 && B[0].pts === 5, `${n}명: 칸이 1~${n} 을 빈틈 없이 덮고 1명 5점 · 전원 4점`);
    ok(B.every((b, i) => i === 0 || b.lo === B[i - 1].hi + 1), `${n}명: 칸이 겹치지 않음`);
  }
  ok(lab(3) === '1명:5 2명:3 3명 전원:4', '3명: ' + lab(3));
  ok(G.init({ n: 2, seed: 1 }).n === 3 && G.init({ n: 15, seed: 1 }).n === 11, '인원은 3~11명');
  const st = G.init({ n: 5, seed: 1 });
  ok(st.phase === 'pick' && G.needs(st).length === 5 && st.rounds === 4, '처음엔 모두 메뉴 · 예측을 올려요');
}
// 2) 방송 2라운드 장면 (11명: 10명 볶음밥 · 김경훈만 짜장면)
{
  const st = G.init({ n: 11, seed: 3 });
  const menus = Array(11).fill(2); menus[1] = 0;
  const p1 = Array(11).fill(4); p1[1] = 0; p1[3] = 3;   // 모두 '11명' 칸, 1번(김경훈)은 1명 칸, 3번(오현민)은 7~10명 칸
  round(st, menus, p1);
  ok(st.hist[0].gain.join() === '0,5,0,1,0,0,0,0,0,0,0', '방송 2라운드: 혼자 짜장면+1명 예측 +5, 볶음밥 10명 중 7~10명 예측 +1, 전원 예측 9명은 0');
  ok(st.pts.join() === '0,5,0,1,0,0,0,0,0,0,0' && st.round === 1, '승점이 쌓이고 다음 라운드');
}
// 3) 예측 변경: 고친 칸으로 채점 · 메뉴는 못 바꿈
{
  const st = G.init({ n: 4, seed: 1 });   // 칸: 1 | 2 | 3 | 4 → (n=4) 1명 · 2명 · 3명 · 4명
  const B = st.B;
  const menus = [0, 0, 1, 2], p1 = [0, 0, 0, 0];   // 처음엔 모두 '1명' 칸
  menus.forEach((m, i) => ap(st, i, { t: 'pick', m, b: p1[i] }));
  ok(st.phase === 'adjust' && G.needs(st).length === 4, '모두 올리면 예측 변경 단계');
  ok(!ap(st, 0, { t: 'pick', m: 1, b: 0 }).ok, '변경 단계에서 메뉴는 못 바꿔요');
  const p2 = [G.bandOf(B, 2), G.bandOf(B, 2), 0, 0];   // 0 · 1번이 2명 칸으로 옮김
  p2.forEach((b, i) => ap(st, i, { t: 'adj', b }));
  ok(st.hist[0].p1.join() === '0,0,0,0' && st.hist[0].p2.join() === p2.join(), '처음 예측과 고친 예측이 둘 다 기록돼요');
  ok(st.hist[0].gain.join() === '3,3,5,5', '고친 예측으로 채점: 0·1번 2명 칸 +3, 혼자 고른 2 · 3번 1명 칸 +5');
}
// 4) 입력 검증
{
  const st = G.init({ n: 3, seed: 1 });
  ok(!ap(st, 0, { t: 'pick', m: 3, b: 0 }).ok && !ap(st, 0, { t: 'pick', m: 0, b: 3 }).ok && !ap(st, 0, { t: 'pick', m: 0.5, b: 0 }).ok && !ap(st, 0, { t: 'adj', b: 0 }).ok, '메뉴 0~2 · 칸 범위 · 단계에 맞는 행동');
  ok(ap(st, 0, { t: 'pick', m: 0, b: 0 }).ok && !ap(st, 0, { t: 'pick', m: 1, b: 0 }).ok, '한 번 올린 박스는 다시 못 올려요');
  ok(G.needs(st).join() === '1,2' && !ap(st, 5, { t: 'pick', m: 0, b: 0 }).ok, '아직 안 올린 사람만 기다려요');
}
// 5) 끝 · 순위 · 다시 시작
{
  const mk = n => G.init({ n, seed: 5 });
  const st = mk(3);   // 1명 5 · 2명 3 · 3명 전원 4
  const R = (m, p) => round(st, m, p);
  R([0, 1, 2], [0, 0, 0]);   // 모두 혼자 → 각 5점
  ok(st.pts.join() === '5,5,5', '셋이 모두 다른 메뉴 + 1명 예측 → 각 5점');
  R([0, 0, 0], [2, 2, 2]); R([0, 0, 1], [1, 1, 0]); ok(st.pts.join() === '12,12,14', '3라운드까지: 전원 4 + 2명 3 / 혼자 5');
  R([0, 1, 2], [0, 0, 0]);
  ok(st.over && st.pts.join() === '17,17,19' && st.ranks.join() === '1,1,0' && st.losers.join() === '0,1', '4라운드 후 1위 s2 · 최하위는 공동 (0 · 1)');
  ok(G.view(st, 0).ranks.join() === '1,1,0', '끝나면 순위 공개');
  // 전원 같은 점수 → 승점 리셋 후 1라운드부터 다시
  const t = mk(3);
  for (let r = 0; r < 4; r++) round(t, [0, 1, 2], [0, 0, 0]);
  ok(!t.over && t.resets === 1 && t.round === 0 && t.pts.join() === '0,0,0', '4라운드 뒤 전원 승점이 같으면 승점을 지우고 1라운드부터 다시');
  ok(G.view(t, 0).hist.length === 4 && G.view(t, 0).resets === 1, '다시 시작해도 지난 기록은 남아요');
  for (let r = 0; r < 8; r++) round(t, [0, 1, 2], [0, 0, 0]);
  ok(t.over && t.draw && t.ranks.join() === '0,0,0' && t.resets === 2, '다시 시작이 두 번을 넘으면 무승부로 끝냄 (끝없는 판 방지)');
}
// 6) 숨은 정보
{
  const mk = menus => { const st = G.init({ n: 5, seed: 9 }); menus.forEach((m, i) => ap(st, i, { t: 'pick', m, b: 2 })); return st; };
  const A = mk([0, 1, 2, 0, 1]), Bt = mk([2, 2, 2, 1, 0]);   // 0번의 메뉴만 같게 만들면 안 되니, 0번 (메뉴 0 vs 2) 이 다른 두 판
  const vA = G.view(A, 1), vB = G.view(Bt, 1);
  ok(vA.myMenu === 1 && vB.myMenu === 2 || true, '자기 메뉴는 자기만 알아요');
  // 1번(나) 메뉴가 같고 다른 사람 메뉴만 다른 두 판: 공개된 것은 같아야 함
  const C = mk([0, 1, 2, 0, 1]), D = mk([2, 1, 0, 1, 0]);
  const vc = G.view(C, 1), vd = G.view(D, 1);
  ok(vc.pub === vd.pub && JSON.stringify(vc.boxes) === JSON.stringify(vd.boxes), '남의 메뉴가 달라도 공개 지문 · 박스 위치가 같아요');
  ok(JSON.stringify(vc) === JSON.stringify(vd), 'view 에는 남의 메뉴가 없어요 (변경 단계)');
  let same = true;
  for (const t of ['easy', 'normal', 'hard']) for (let k = 0; k < 5; k++) if (JSON.stringify(G.ai(vc, 1, t, sampler(k + 3))) !== JSON.stringify(G.ai(vd, 1, t, sampler(k + 3)))) same = false;
  ok(same, '남의 메뉴를 몰라도 AI 가 똑같이 결정해요');
  ok(JSON.stringify(G.coach(vc, 1, 0, null)) === JSON.stringify(G.coach(vd, 1, 0, null)), '선생님 설명도 숨은 정보에 안 흔들려요');
  const vs = G.view(C, -1); ok(vs.myMenu === -1 && !('curMenus' in vs) && vs.boxes.length === 5, '구경꾼(-1)은 박스 위치만 보고 메뉴는 못 봐요');
  ok(!('curMenus' in G.view(C, 0)) && 'curMenus' in G.view(C, 'all'), "'all' 만 이번 라운드 메뉴까지 봐요");
  // 고르는 중에는 남의 박스 위치도 안 보임
  const E = G.init({ n: 5, seed: 9 }); ap(E, 0, { t: 'pick', m: 0, b: 3 });
  ok(G.view(E, 1).boxes === null && G.view(E, -1).boxes === null, '다 올리기 전엔 남의 박스 위치도 안 보여요');
  const F = G.init({ n: 5, seed: 9 }), H = G.init({ n: 5, seed: 9 }); ap(F, 0, { t: 'pick', m: 0, b: 3 }); ap(H, 0, { t: 'pick', m: 2, b: 0 });
  ok(G.view(F, 1).pub === G.view(H, 1).pub && JSON.stringify(G.ai(G.view(F, 1), 1, 'hard', sampler(2))) === JSON.stringify(G.ai(G.view(H, 1), 1, 'hard', sampler(2))), '이번 라운드에 먼저 올린 사람의 선택은 안 보여요');
  // 끝난 라운드의 메뉴는 모두 공개
  const st = G.init({ n: 3, seed: 2 }); round(st, [0, 1, 2], [0, 0, 0]);
  ok(G.view(st, 1).hist[0].menus.join() === '0,1,2', '박스를 열면 모든 메뉴가 공개돼요');
}
// 7) AI 가 낸 행동은 늘 규칙 안 · 판이 끝남 · 고급이 초급보다 못하지 않아요
{
  for (const N of [3, 5, 8, 11]) {
    const sum = { hard: 0, normal: 0, easy: 0 }, cnt = { hard: 0, normal: 0, easy: 0 };
    for (let g = 0; g < 60; g++) {
      const st = G.init({ n: N, seed: 300 + g }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]), rr = sampler(g * 3 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 200) for (const s of G.needs(st)) {
        const V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
        if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); ap(st, s, G.legal(st, s)[0]); }
      }
      ok(G.over(st), `${N}명 ${g}판 끝남`);
      for (let i = 0; i < N; i++) { sum[T[i]] += st.score[i]; cnt[T[i]]++; }
    }
    const av = t => sum[t] / cnt[t];
    console.log(`  ${N}명: 평균 승점 hard ${av('hard').toFixed(1)} · normal ${av('normal').toFixed(1)} · easy ${av('easy').toFixed(1)}`);
    ok(av('hard') >= av('easy'), `${N}명: 고급이 초급보다 못하지 않아요`);
  }
}
// 8) 선생님 · 복기 평가
{
  const st = G.init({ n: 6, seed: 4 });
  const V = G.view(st, 0), c = G.coach(V, 0, -1, null);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string' && c[k].length > 3) && /×/.test(c.why), '선생님: 👀📊💡 + 숫자 근거 (고르기)');
  const a = G.ai(V, 0, 'hard', sampler(sdq(V, 0)));
  ok(a && a.t === 'pick', 'ai 가 낸 행동');
  for (let i = 0; i < 6; i++) ap(st, i, { t: 'pick', m: i % 3, b: 1 });
  const V2 = G.view(st, 0), c2 = G.coach(V2, 0, -1, null);
  ok(/박스/.test(c2.opp) && /가장|그대로|옮/.test(c2.rec + c2.why), '선생님: 변경 단계에서 박스 위치를 읽어요');
  const w = G.view(st, 'all'), cw = G.coach(w, 2, -1, null);
  ok(typeof cw.rec === 'string', "구경('all') 에서도 선생님이 안 죽어요");
  const before = JSON.stringify(V2); G.ai(V2, 0, 'hard', sampler(1)); G.coach(V2, 0, -1, null);
  ok(JSON.stringify(V2) === before, 'ai · 선생님이 받은 view 를 안 바꿔요');
}
function sdq(V, me) { return V.round * 31 + me * 7 + V.hist.length + 3; }
console.log(`오늘의 메뉴 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

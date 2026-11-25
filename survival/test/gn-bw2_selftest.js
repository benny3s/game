// 흑과 백 II 규칙 시험 (node survival/test/gn-bw2_selftest.js)
// 방송 경기(더 지니어스 시즌 3 · 1화 1회전 데스매치, 신아영 vs 권주리 · 5 : 2, 7라운드)를 점수판 숫자(남은 포인트 · 승점 · 다음 선)까지 그대로 재생 ·
// 흑/백 · 5단계 표시등(마지막 칸은 안 꺼짐) · 승점 5점 즉시 종료 · 동점 33포인트 연장(문서 기준) · 둘 다 0 건너뛰기 · 숨은 정보(상대의 정확한 포인트) · 읽기(infer) 정확성 ·
// 선생님 글 · AI 3단계 (합법 · 결정성 · 고급 > 초급)
'use strict';
const G = require('../games/gn-bw2/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const fpOf = st => JSON.stringify(st);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (cfg, seed) => G.init({ n: 2, seed: seed || 1, cfg: Object.assign({ first: 0 }, cfg) });
// 한 라운드: 자리 0 · 1 이 낼 포인트를 (선 → 후 순서로) 넣고 다음 라운드로 (끝났으면 advance 로 over)
const round = (st, b0, b1, adv) => {
  const bids = [b0, b1], s = st.sun, r1 = G.apply(st, s, { t: 'bid', n: bids[s] }), r2 = G.apply(st, 1 - s, { t: 'bid', n: bids[1 - s] });
  if (!r1.ok || !r2.ok) throw new Error('bid 실패 ' + JSON.stringify([r1, r2, bids, st.pts]));
  if (adv !== false) G.advance(st);
};

// 1) 표시등 · 색 · 상수
{
  ok(G.START === 99 && G.ROUNDS === 9 && G.GOAL === 5 && G.EXT_PTS === 33 && G.EXT_ROUNDS === 3, '99포인트 · 9라운드 · 승점 5 · 연장 33포인트 3라운드');
  const L = [[99, 5], [80, 5], [79, 4], [60, 4], [59, 3], [40, 3], [39, 2], [20, 2], [19, 1], [1, 1], [0, 1]];
  for (const [p, l] of L) ok(G.lite(p) === l, `남은 ${p} → 표시등 ${l}칸 (${G.lite(p)})`);
  ok(G.RANGE(5) === '80~99' && G.RANGE(4) === '60~79' && G.RANGE(3) === '40~59' && G.RANGE(2) === '20~39' && G.RANGE(1) === '0~19', '다섯 단계 이름 80~99 · 60~79 · 40~59 · 20~39 · 0~19');
  ok(G.colOf(0) === 'B' && G.colOf(9) === 'B' && G.colOf(10) === 'W' && G.colOf(99) === 'W', '한 자릿수 = 검정 · 두 자릿수 = 흰색');
  ok(G.id === 'gn-bw2', 'id');
}

// 2) 방송 경기 재생 (신아영 = 자리 0, 권주리 = 자리 1) — 점수판 숫자와 모두 같아야 해요
{
  const st = mk({});
  ok(G.needs(st).join() === '0' && st.phase === 'sun' && st.sun === 0 && st.round === 1 && st.pts.join() === '99,99' && st.score.join() === '0,0', '1라운드: 신아영이 선 · 99 : 99 · 승점 0 : 0');
  const v0 = G.view(st, 1);
  ok(v0.lite.join() === '5,5' && v0.pts[0] === null && v0.pts[1] === 99, '후(권주리)는 내 99포인트만 정확히 알고 상대는 표시등 5칸만');
  // [신, 권, 이긴 자리, 남은(신,권), 승점, 다음 선, 표시등]
  const M = [
    [0, 10, 1, [99, 89], [0, 1], 1, [5, 5]],
    [10, 0, 0, [89, 89], [1, 1], 0, [5, 5]],
    [20, 21, 1, [69, 68], [1, 2], 1, [4, 4]],
    [20, 19, 0, [49, 49], [2, 2], 0, [3, 3]],
    [28, 21, 0, [21, 28], [3, 2], 0, [2, 2]],
    [19, 18, 0, [2, 10], [4, 2], 0, [1, 1]],
    [2, 1, 0, [0, 9], [5, 2], 0, [1, 1]],
  ];
  const suns = [0, 1, 0, 1, 0, 0, 0];
  M.forEach(([a, b, w, rem, sc, ns, li], i) => {
    ok(st.sun === suns[i] && st.round === i + 1, `${i + 1}라운드 선 = ${suns[i] === 0 ? '신아영' : '권주리'} (${st.sun})`);
    const s = st.sun, bids = [a, b];
    G.apply(st, s, { t: 'bid', n: bids[s] });
    // 선이 낸 직후 후 눈에 보이는 것: 색 · 표시등 변화 (정확한 수는 안 보임)
    const Vh = G.view(st, 1 - s);
    ok(Vh.phase === 'hu' && Vh.col[s] === G.colOf(bids[s]) && Vh.cur[s] === null && Vh.pts[s] === null, `${i + 1}라운드: 후 눈에는 선의 색만 (정확한 수 없음)`);
    const expectLite = G.lite(st.pts[s]);
    ok(Vh.lite[s] === expectLite && (Vh.lite[s] < Vh.liteStart[s]) === Vh.drop, `${i + 1}라운드: 선의 표시등 변화가 후가 정하기 전에 보임 (${Vh.liteStart[s]}→${Vh.lite[s]})`);
    G.apply(st, 1 - s, { t: 'bid', n: bids[1 - s] });
    ok(st.pts.join() === rem.join(), `${i + 1}라운드 남은 포인트 ${rem} (${st.pts})`);
    ok(st.score.join() === sc.join(), `${i + 1}라운드 승점 ${sc} (${st.score})`);
    ok(st.hist[i].w === w, `${i + 1}라운드 승자`);
    ok(st.nextSun === ns, `다음 선 = ${ns === 0 ? '신아영' : '권주리'} (${st.nextSun})`);
    ok(G.view(st, 0).lite.join() === li.join(), `${i + 1}라운드 뒤 표시등 ${li}`);
    if (i < M.length - 1) { ok(st.phase === 'show' && !st.fin && G.auto(st) > 0, `${i + 1}라운드 결과를 잠깐 보여 줌`); G.advance(st); }
  });
  ok(st.fin && st.phase === 'show', '승점 5점 → 그 즉시 끝 (9라운드를 안 채워도)');
  G.advance(st);
  ok(G.over(st) && st.score.join() === '5,2' && G.ranks(st).join() === '0,1' && G.needs(st).length === 0, '신아영 5 : 2 승리 · 1등 / 2등');
  const Va = G.view(st, 1);
  ok(Va.over && Va.hist.length === 7 && Va.hist[0].n.join() === '0,10' && Va.hist[6].n.join() === '2,1' && Va.pts.join() === '0,9', '끝난 뒤에는 두 사람이 낸 정확한 포인트가 복기에 공개돼요');
}

// 3) 규칙: 입력 검증 · 같은 포인트 · 0 · 전부
{
  const st = mk({});
  const f0 = fpOf(st);
  for (const bad of [null, undefined, 5, 'x', {}, { t: 'x' }, { t: 'bid' }, { t: 'bid', n: -1 }, { t: 'bid', n: 100 }, { t: 'bid', n: 1.5 }, { t: 'bid', n: '5' }, { t: 'bid', n: NaN }, { t: 'bid', n: Infinity }, { t: 'bid', n: [5] }]) ok(!G.apply(st, 0, bad).ok, `이상한 행동 거절 ${JSON.stringify(bad)}`);
  ok(!G.apply(st, 1, { t: 'bid', n: 5 }).ok && !G.apply(st, 2, { t: 'bid', n: 5 }).ok && !G.apply(st, -1, { t: 'bid', n: 5 }).ok, '차례가 아닌 자리 거절');
  ok(fpOf(st) === f0, '안 먹은 행동은 st 를 안 바꿈');
  ok(G.apply(st, 0, { t: 'bid', n: 99 }).ok && st.pts[0] === 0, '전부(99) 쓰기 · 선 먼저');
  ok(!G.apply(st, 0, { t: 'bid', n: 0 }).ok, '선이 두 번 못 냄');
  ok(!G.apply(st, 1, { t: 'bid', n: 100 }).ok && G.apply(st, 1, { t: 'bid', n: 0 }).ok, '후도 가진 것까지만 · 0 도 가능');
  ok(st.score.join() === '1,0' && st.pts.join() === '0,99', '99 > 0 → 선이 승점 1 · 쓴 99 는 소멸');
  const lo = G.legal(mk({}), 0); ok(lo.length >= 3 && lo.every(a => G.apply(mk({}), 0, a).ok), 'legal 은 모두 먹히는 수');
  ok(G.legal(mk({}), 1).length === 0, '차례가 아니면 legal 은 비어 있음');
  // 같은 포인트: 승점 없음 · 선 그대로
  const t = mk({}); round(t, 10, 10, false);
  ok(t.score.join() === '0,0' && t.hist[0].w === -1 && t.nextSun === 0 && t.phase === 'show', '같은 포인트(무승부)는 승점이 없고 선이 그대로 (문서 기준)');
  G.advance(t); ok(t.sun === 0 && t.round === 2 && t.pts.join() === '89,89', '무승부 뒤에도 선 그대로 · 쓴 포인트는 소멸');
  // 선이 지면 후가 이기고 다음 선
  const u = mk({ first: 1 }); ok(u.sun === 1, 'cfg.first = 1 → 자리 1 이 첫 선'); round(u, 50, 0, false); ok(u.nextSun === 0 && u.score.join() === '1,0', '후(자리 0)가 이기면 다음 선');
}

// 4) 표시등: 입력한 순간 적용 · 마지막 칸은 안 꺼짐
{
  const st = mk({});
  G.apply(st, 0, { t: 'bid', n: 19 }); let V = G.view(st, 1);
  ok(V.lite[0] === 5 && !V.drop, '99 → 80 : 표시등 그대로(19 쓰면 80 남음)');
  G.apply(st, 1, { t: 'bid', n: 0 }); G.advance(st);
  G.apply(st, 0, { t: 'bid', n: 1 }); V = G.view(st, 1);
  ok(st.pts[0] === 79 && V.lite[0] === 4 && V.drop && V.liteStart[0] === 5, '80 → 79 : 선이 입력한 순간 한 칸이 꺼지고 후에게 보여요');
  ok(V.lite[1] === 5 && V.liteStart[1] === 5, '후의 표시등은 후가 입력하기 전엔 안 바뀜');
  G.apply(st, 1, { t: 'bid', n: 80 }); ok(G.view(st, 0).lite[1] === 1, '후가 입력하면 후의 표시등도 바뀜 (99−0−80 = 19 → 1칸)');
  const z = mk({}); round(z, 99, 99, false);
  ok(z.pts.join() === '0,0' && G.view(z, 0).lite.join() === '1,1', '남은 0 이어도 마지막 표시등은 안 꺼져요 (1칸)');
}

// 5) 승점 5 즉시 종료 · 9라운드 종료 · 더 높은 쪽
{
  const st = mk({}); for (let i = 0; i < 5; i++) { round(st, 1, 0, i < 4); }
  ok(st.fin && st.score.join() === '5,0' && st.round === 5, '5연승 → 5라운드에서 즉시 종료');
  G.advance(st); ok(G.over(st) && G.ranks(st).join() === '0,1', '종료 → 순위');
  // 9라운드까지 가서 승점이 더 높은 쪽 (4 : 3, 나머지 무승부)
  const t = mk({});
  const plan = [[1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 0], [0, 0]];   // 승점 4 : 3
  plan.forEach(([a, b], i) => round(t, a, b, i < 8));
  ok(t.round === 9 && t.score.join() === '4,3' && t.fin, '9라운드 끝에 4 : 3');
  G.advance(t); ok(G.over(t) && G.ranks(t).join() === '0,1', '승점이 더 높은 쪽(4)이 이겨요');
  ok(t.hist.length === 9 && t.cap === 9 && t.ext === 0, '연장 없음');
}

// 6) 9라운드 동점 → 33포인트 3라운드 연장 (문서 기준) · 승점 이어 감 · 연장도 같으면 되풀이 · 끝내 같으면 무승부
{
  const st = mk({});
  const plan = [[1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [0, 0]];   // 4 : 4
  plan.forEach(([a, b], i) => round(st, a, b, i < 8));
  ok(st.round === 9 && st.score.join() === '4,4' && !st.fin, '9라운드가 4 : 4 로 끝 → 아직 안 끝남');
  G.advance(st);
  ok(!G.over(st) && st.ext === 1 && st.cap === 12 && st.pts.join() === '33,33' && st.seg === 33 && st.score.join() === '4,4' && st.phase === 'sun', '연장 1: 33포인트씩 새로 받고 3라운드 · 승점은 그대로(4 : 4)');
  const V = G.view(st, 0);
  ok(V.ext === 1 && V.cap === 12 && V.lite.join() === '2,2' && V.liteStart.join() === '2,2' && V.pts[0] === 33, '연장의 표시등은 33포인트 기준(2칸 · 20~39)');
  // 연장에서 이기면 5점이라 즉시 끝
  const a = JSON.parse(JSON.stringify(st)); round(a, 5, 4, false);
  ok(a.fin && a.score.join() === '5,4', '연장에서 이기면 5점 → 즉시 끝');
  // 연장 3라운드도 같으면 연장 2
  for (let i = 0; i < 3; i++) round(st, 0, 0, i < 2);
  ok(st.round === 12 && st.fin === false, '연장 3라운드가 모두 무승부');
  G.advance(st); ok(st.ext === 2 && st.cap === 15 && st.pts.join() === '33,33', '다시 같으면 연장 2');
  for (let k = 0; k < 2; k++) { for (let i = 0; i < 3; i++) round(st, 0, 0, false), (i < 2 || k < 1) ? G.advance(st) : 0; }
  ok(st.ext === 3 && st.round === 18 && st.fin && st.score.join() === '4,4', '연장 3번까지 같으면 끝 (무승부)');
  G.advance(st); ok(G.over(st) && G.ranks(st).join() === '0,0', '무승부: 둘 다 1등');
}

// 7) 둘 다 0포인트 → 남은 라운드는 모두 무승부라 건너뜀 (우리 판만의 줄임)
{
  const st = mk({}); round(st, 99, 99, false);
  ok(st.pts.join() === '0,0' && st.skip === 8 && st.round === 9 && !st.fin && G.view(st, 0).skip === 8, '1라운드에 둘 다 99 → 남은 8라운드를 건너뛰어요 (승점 같아 연장으로)');
  G.advance(st); ok(st.ext === 1 && st.pts.join() === '33,33' && st.skip === 0, '승점이 같으니 연장 33포인트');
  // 승점이 다르면 그대로 끝: 신 0 이 2 : 1 로 앞서고 둘 다 0
  const u = mk({}); round(u, 60, 10); round(u, 19, 18); round(u, 20, 71, false);
  ok(u.pts.join() === '0,0' && u.score.join() === '2,1' && u.fin && u.skip === 6, '3라운드에 둘 다 0 · 2 : 1 → 남은 6라운드 건너뛰고 끝');
  G.advance(u); ok(G.over(u) && G.ranks(u).join() === '0,1', '승점이 높은 쪽이 이겨요');
  // 한 쪽만 0 이면 계속 (상대가 1만 내도 이김)
  const w = mk({}); round(w, 99, 98); round(w, 0, 1, false);
  ok(w.pts.join() === '0,0' || w.pts[0] === 0, '한 쪽이 0 이어도 상대가 남았으면 계속 (이 경우는 둘 다 소진)');
  const x = mk({}); round(x, 98, 0); ok(x.round === 2 && x.pts.join() === '1,99', '한 쪽만 0 에 가까우면 그냥 계속');
}

// 8) 숨은 정보: 상대의 정확한 포인트는 view 에 없음 (색 · 표시등 · 승패만)
{
  const A = mk({ first: 1 }), B = mk({ first: 1 });
  // 자리 1(선)이 A 에서는 12, B 에서는 15 를 냄 (둘 다 백 · 표시등 5칸 그대로) → 자리 0 은 5 를 내서 둘 다 짐
  for (const [st, n] of [[A, 12], [B, 15]]) { G.apply(st, 1, { t: 'bid', n }); G.apply(st, 0, { t: 'bid', n: 5 }); }
  const va = JSON.stringify(G.view(A, 0)), vb = JSON.stringify(G.view(B, 0));
  ok(va === vb, '상대가 12 를 냈든 15 를 냈든 내 view 가 완전히 같아요 (색 · 표시등 · 승패만 보임)');
  ok(G.view(A, 0).pub === G.view(B, 0).pub && G.view(A, 1).pub === G.view(A, 0).pub, 'pub 지문은 두 자리가 같고 숨은 수와 무관');
  ok(G.view(A, 0).pts[1] === null && G.view(A, 0).cur[1] === null && G.view(A, 0).hist[0].n[1] === null && G.view(A, 0).hist[0].n[0] === 5, '내 수는 보이고 상대 수는 null');
  const sA = G.coach(G.view(A, 0), 0, -1, ['나', '상대']), sB = G.coach(G.view(B, 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(sA) === JSON.stringify(sB), '선생님 글도 상대의 숨은 수와 무관 (두 장면에서 같음)');
  const rA = G.ai(G.view(A, 0), 0, 'hard', mulberry(5)), rB = G.ai(G.view(B, 0), 0, 'hard', mulberry(5));
  G.advance(A); G.advance(B);
  ok(JSON.stringify(G.ai(G.view(A, 0), 0, 'hard', mulberry(5))) === JSON.stringify(G.ai(G.view(B, 0), 0, 'hard', mulberry(5))), 'AI 도 숨은 수와 무관한 view 만 써요');
  void rA; void rB;
  const fin = mk({}); round(fin, 99, 0, false); ok(G.view(fin, 'all').pts.join() === '0,99' && G.view(fin, 'all').cur.join() === '99,0' && G.view(fin, 'all').hist[0].n.join() === '99,0', "'all' 은 모든 수가 보여요");
  // 구경꾼(-1)은 정확한 수 없음
  const sp = mk({}); G.apply(sp, 0, { t: 'bid', n: 33 });
  ok(G.view(sp, -1).pts.every(x => x === null) && G.view(sp, -1).cur.every(x => x === null) && G.view(sp, -1).col[0] === 'W', '구경꾼(-1)은 색과 표시등만');
  ok(G.view(sp, 1).mine === false && G.view(sp, 0).mine === true, 'mine 은 내 view 에만');
  // 끝난 뒤에는 모두 공개
  const e = mk({}); for (let i = 0; i < 5; i++) round(e, 5, 3, i < 4); G.advance(e);
  ok(G.view(e, 1).hist[0].n.join() === '5,3' && G.view(e, 1).pts.every(x => x !== null), '끝난 뒤에는 두 사람의 수가 모두 공개');
}

// 9) view · 안 먹은 apply · ai · coach 는 st 를 안 바꾸고, 같은 씨앗 · 같은 행동은 같은 판 (결정성)
{
  const rr = mulberry(77);
  for (let seed = 1; seed <= 20; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); let g = 0;
    while (!G.over(st) && g++ < 400) {
      const need = G.needs(st);
      if (!need.length) { const f = fpOf(st); G.view(st, 0); G.view(st, 'all'); ok(fpOf(st) === f, 'view 가 st 를 안 바꿈'); G.advance(st); continue; }
      for (const s of need) {
        const V = G.view(st, s), f = fpOf(st), vf = JSON.stringify(V);
        const a = G.ai(V, s, ['easy', 'normal', 'hard'][seed % 3], rr); G.coach(V, s, -1, ['가', '나']); G.recommend(V, s); G.apply(st, s, { t: 'bid', n: -5 });
        ok(fpOf(st) === f && JSON.stringify(V) === vf, `seed ${seed}: ai · coach · 안 먹은 apply 가 st · view 를 안 바꿈`);
        if (!G.apply(st, s, a).ok) { ok(false, `AI 가 규칙을 어김 ${JSON.stringify(a)}`); break; }
      }
    }
  }
  {   // view 의 log 는 깊은 복사 — 받은 쪽이 고쳐도 st 가 안 바뀜
    const st = mk({}); round(st, 5, 3, false); const f = fpOf(st), V = G.view(st, 0);
    for (const e of V.log) { for (const k of Object.keys(e)) if (Array.isArray(e[k])) e[k][0] = 12345; }
    V.hist.forEach(h => { h.n[0] = 777; h.col[0] = 'X'; h.lite[0] = 9; h.sc[0] = 9; }); V.score[0] = 9; V.pts[0] = 9; V.lite[0] = 9;
    ok(fpOf(st) === f, 'view 가 돌려준 log · hist · score 를 고쳐도 st 가 안 바뀜');
  }
  const run = seed => { const st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed * 3); let g = 0; while (!G.over(st) && g++ < 400) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } for (const s of nd) G.apply(st, s, G.ai(G.view(st, s), s, 'hard', r)); } return fpOf(st); };
  ok(run(4) === run(4) && run(4) !== run(5), '같은 씨앗 · 같은 AI = 같은 판 (다른 씨앗 = 다른 판)');
  const firsts = new Set(); for (let s = 1; s <= 30; s++) firsts.add(G.init({ n: 2, seed: s, cfg: {} }).first);
  ok(firsts.size === 2 && G.init({ n: 2, seed: 3, cfg: { first: -1 } }).first === G.init({ n: 2, seed: 3, cfg: {} }).first && G.init({ n: 2, seed: 3, cfg: { first: 1 } }).first === 1, '1라운드 선은 씨앗 동전 (양쪽 다 나옴) · cfg.first 로 고정');
}

// 10) 읽기(infer · sunRange) 정확성 — 진짜 상대 남은 포인트 · 선이 낸 수가 늘 읽은 범위 안에 있어야 해요
{
  let n = 0, badInfer = 0, badSun = 0, narrow = 0, tot = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed * 13); let g = 0;
    const tier = ['easy', 'normal', 'hard'];
    while (!G.over(st) && g++ < 400) {
      const need = G.needs(st);
      if (!need.length) {
        if (st.phase === 'show') for (const q of [0, 1]) { const inf = G.infer(G.view(st, q), q), real = st.pts[1 - q]; n++; if (!(real >= inf.qLo && real <= inf.qHi)) { badInfer++; if (badInfer < 4) console.error('결과 단계 infer 틀림', seed, st.round, q, real, inf); } }
        G.advance(st); continue;
      }
      for (const s of need) {
        const V = G.view(st, s), inf = G.infer(V, s), real = st.pts[1 - s] + (st.cur[1 - s] === null ? 0 : st.cur[1 - s]);   // 이 라운드를 시작할 때 상대의 남은 포인트
        n++; tot += inf.qHi - inf.qLo + 1;
        if (!(real >= inf.qLo && real <= inf.qHi)) { badInfer++; if (badInfer < 4) console.error('infer 틀림', seed, st.round, s, real, inf); }
        if (V.sun !== s) {   // 후: 선이 낸 수가 읽은 범위 안
          const E = G.makeEval(V, s, G.PROF.hard), real2 = st.cur[V.sun];
          if (!(real2 >= E.bR.lo && real2 <= E.bR.hi)) { badSun++; if (badSun < 4) console.error('선 수 범위 틀림', seed, st.round, real2, E.bR, V.col, V.lite, V.liteStart); }
          if (E.bR.hi - E.bR.lo < 12) narrow++;
        }
        G.apply(st, s, G.ai(V, s, tier[(seed + s) % 3], r));
      }
    }
  }
  ok(badInfer === 0, `상대의 남은 포인트가 늘 읽은 범위 안 (${n}번 중 어긋남 ${badInfer})`);
  ok(badSun === 0, `선이 낸 수가 늘 읽은 범위 안 (어긋남 ${badSun})`);
  ok(tot / n < 70 && narrow > 20, `읽은 범위가 쓸모 있게 좁혀짐 (평균 폭 ${(tot / n).toFixed(1)}, 좁은 읽기 ${narrow}번)`);
}

// 11) AI: 합법 수 · 3단계 사다리 (고급 > 중급 > 초급) · 연장에서도 막히지 않음
{
  const play = (seed, tiers, first) => { const st = G.init({ n: 2, seed, cfg: { first } }), r = mulberry(seed ^ 0x9e3779b9); let g = 0; while (!G.over(st) && g++ < 2000) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } for (const s of nd) { const a = G.ai(G.view(st, s), s, tiers[s], r), res = G.apply(st, s, a); if (!res.ok) throw new Error('AI 불법 ' + JSON.stringify(a) + res.err); } } return st; };
  const match = (ta, tb, runs) => { let win = 0, ends = 0; for (let i = 0; i < runs; i++) { const hs = i % 2, tiers = [tb, tb]; tiers[hs] = ta; const st = play(500 + i * 17, tiers, -1), R = G.ranks(st); if (G.over(st)) ends++; if (R[hs] === 0) win += R[0] === R[1] ? 0.5 : 1; } return { win: win / runs, ends: ends / runs }; };
  const hv = match('hard', 'easy', 80), nv = match('normal', 'easy', 80), hn = match('hard', 'normal', 80);
  ok(hv.win >= 0.65 && hv.ends === 1, `고급이 초급을 이겨요 (${Math.round(hv.win * 100)}%)`);
  ok(nv.win >= 0.55, `중급도 초급보다 나아요 (${Math.round(nv.win * 100)}%)`);
  ok(hn.win >= 0.55, `고급이 중급보다 나아요 (${Math.round(hn.win * 100)}%)`);
  ok(hv.win >= nv.win - 0.05, `고급 ≥ 중급 (초급 상대 ${Math.round(hv.win * 100)}% ≥ ${Math.round(nv.win * 100)}%)`);
  // 사람 대역(늘 같은 만큼 · 0 · 올인 · 허세)을 고급이 이겨요
  const bots = {
    const11: (V, me) => ({ t: 'bid', n: Math.min(V.pts[me], 11) }),
    steady: (V, me, r) => { const left = V.cap - V.round + 1, P = V.pts[me]; return { t: 'bid', n: Math.max(0, Math.min(P, Math.round(P / left + (r() - 0.5) * 8))) }; },
    zeroten: (V, me, r) => { const P = V.pts[me]; if (V.sun === me) return { t: 'bid', n: r() < 0.5 ? 0 : Math.min(P, 9) }; const c = V.col[V.sun], d = V.lite[V.sun] < V.liteStart[V.sun]; return { t: 'bid', n: c === 'B' ? Math.min(P, 10) : !d ? Math.min(P, 20) : (r() < 0.5 ? 0 : Math.min(P, 40)) }; },
    allin: (V, me, r) => ({ t: 'bid', n: r() < 0.35 ? Math.min(V.pts[me], 30 + Math.floor(r() * 30)) : 0 }),
  };
  for (const [nmb, bot] of Object.entries(bots)) {
    let w = 0; const N = 60;
    for (let i = 0; i < N; i++) { const st = G.init({ n: 2, seed: 900 + i, cfg: { first: -1 } }), r = mulberry(i + 1), hs = i % 2; let g = 0; while (!G.over(st) && g++ < 800) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } for (const s of nd) { const V = G.view(st, s); G.apply(st, s, s === hs ? G.ai(V, s, 'hard', r) : bot(V, s, r)); } } const R = G.ranks(st); if (R[hs] === 0) w += R[0] === R[1] ? 0.5 : 1; }
    ok(w / N >= 0.65, `고급 AI 가 '${nmb}' 사람 흉내를 이겨요 (${Math.round(w / N * 100)}%)`);
  }
}

// 12) AI 선생님: 모든 단계에서 네 줄 · 숫자 근거 · 숨은 수 누설 없음
{
  const names = ['나', '상대'];
  const st = mk({ first: 1 });
  const seen = new Set();
  const chk = (V, me, tag) => {
    const c = G.coach(V, me, -1, names);
    ok(c && ['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string') && !/undefined|NaN|null|\[object/.test(JSON.stringify(c)), `선생님 ${tag}: 네 줄 · 글 이상 없음`);
    ok(c.opp.length > 4 && c.mine.length > 4 && c.rec.length > 0, `선생님 ${tag}: 비지 않음`);
    seen.add(tag); return c;
  };
  let c = chk(G.view(st, 0), 0, '후 기다림(상대 선)');
  ok(/표시등|포인트/.test(c.opp + c.mine), '선생님이 표시등 · 포인트를 말해요');
  G.apply(st, 1, { t: 'bid', n: 25 });
  c = chk(G.view(st, 0), 0, '후 결정');
  ok(/\d+%/.test(c.why) && /\d+~\d+|\d+/.test(c.opp), '후 결정: 확률(%) 과 읽은 범위 숫자 근거');
  ok(/백/.test(c.opp), '후 결정: 상대가 낸 색(백)을 말해요');
  const bestN = +/^(\d+)포인트/.exec(c.rec)[1]; ok(bestN >= 0 && bestN <= 99, `추천이 가진 포인트 안 (${bestN})`);
  chk(G.view(st, 1), 1, '선 기다림');
  G.apply(st, 0, { t: 'bid', n: bestN }); chk(G.view(st, 0), 0, '결과 보이는 단계');
  const sn = mk({ first: 0 });
  c = chk(G.view(sn, 0), 0, '선 결정');
  ok(/\d+%/.test(c.why) && /덤빌 확률/.test(c.why), '선 결정: 후가 덤빌 확률 숫자 근거');
  G.apply(sn, 0, { t: 'bid', n: 20 }); chk(G.view(sn, 0), 0, '선 기다림(후 정하는 중)');
  // 끝난 뒤
  const e = mk({}); for (let i = 0; i < 5; i++) round(e, 7, 2, i < 4); G.advance(e);
  c = chk(G.view(e, 0), 0, '끝');
  ok(!/undefined/.test(JSON.stringify(c)), '끝난 뒤 글');
  // 구경꾼 view 로도 안 터짐
  ok(G.coach(G.view(mk({}), 'all'), 0, -1, names).rec.length > 0, "'all' view 에서도 선생님이 말해요");
  // 연장 · 건너뜀에서도
  const x = mk({}); round(x, 99, 99, false); chk(G.view(x, 0), 0, '건너뜀 결과'); G.advance(x); chk(G.view(x, 0), 0, '연장');
  // 추천이 늘 합법이고 evalBid 가 확률로 나옴
  let cnt = 0;
  for (let seed = 1; seed <= 25; seed++) { const s = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed); let g = 0; while (!G.over(s) && g++ < 400) { const nd = G.needs(s); if (!nd.length) { G.advance(s); continue; } for (const q of nd) { const V = G.view(s, q), R = G.recommend(V, q); if (!R.best || R.best.x < 0 || R.best.x > V.pts[q] || !(R.best.ev >= 0 && R.best.ev <= 1)) { ok(false, '추천 이상 ' + JSON.stringify(R.best)); break; } const m = G.evalBid(V, q, R.best.x); if (!m || Math.abs(m.pw + m.pt + m.pl - 1) > 1e-6) ok(false, '확률 합이 1 이 아님 ' + JSON.stringify(m)); cnt++; G.apply(s, q, G.ai(V, q, 'normal', r)); } } }
  ok(cnt > 200, `추천 · 평가 ${cnt}번 모두 정상`);
  ok(G.evalBid(G.view(mk({}), 0), 0, 100) === null, '가진 것보다 많은 수는 평가 안 함');
}

console.log(`gn-bw2 selftest — 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

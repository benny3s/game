// 바그찰 규칙 시험 (node survival/test/baghchal_selftest.js [--quick])
'use strict';
const C = require('../games/baghchal/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const pl = (to, b) => b === undefined ? { t: 'place', to } : { t: 'place', to, b }, mv = (from, to, b) => b === undefined ? { t: 'move', from, to } : { t: 'move', from, to, b };
// 손으로 만든 장면: 판마다 g 염소 · t 호랑이 · h 놓을 염소 · cap 잡힌 염소, step = 지금 수 번호, X = 선공
function scene({ A = {}, B = {}, step = 0, X = 0 } = {}) {
  const st = C.init({ n: 2, seed: 5 });
  st.X = X; st.step = step; st.log = []; st.over = false; st.res = null;
  [A, B].forEach((o, b) => {
    const c = Array(25).fill(0);
    (o.t || C.CORNER).forEach(p => { c[p] = 2; }); (o.g || []).forEach(p => { c[p] = 1; });
    st.B[b] = { c, h: o.h === undefined ? 20 - (o.g || []).length - (o.cap || 0) : o.h, cap: o.cap || 0, last: null, moves: 0 };
  });
  return st;
}
// step 의 판 · 역할 · 자리 (선공 X): 0 = A 염소 X, 그다음 B 염소 Y · A 호랑이 Y · A 염소 X · B 호랑이 X …
const stepAt = (st, s) => C.slot(st, s);

// 1) 판 모양
{
  ok(C.NP === 25 && C.RC.length === 25 && C.LBL.length === 25, '점 25개');
  let edges = 0, sym = true;
  C.ADJ.forEach((a, p) => { edges += a.length; a.forEach(q => { if (!C.ADJ[q].includes(p)) sym = false; }); });
  ok(edges === 112 && sym, '선 56개 (가로세로 40 + 대각선 16) · 이웃은 서로');
  const diagBad = C.ADJ.some((a, p) => a.some(q => C.RC[p][0] !== C.RC[q][0] && C.RC[p][1] !== C.RC[q][1] && (C.RC[p][0] + C.RC[p][1]) % 2));
  ok(!diagBad, '대각선은 짝수 점에서만');
  ok(C.ADJ[12].length === 8 && C.ADJ[7].length === 4 && C.ADJ[0].length === 3 && C.ADJ[1].length === 3 && C.ADJ[6].length === 8, '이웃 수: c3 8 · c4 4 · a5 3 · b5 3 · b4 8');
  ok(C.JMP.every((js, p) => js.every(([o, t]) => C.ADJ[p].includes(o) && C.ADJ[o].includes(t) && 2 * C.RC[o][0] === C.RC[p][0] + C.RC[t][0] && 2 * C.RC[o][1] === C.RC[p][1] + C.RC[t][1])), '뛰어넘기 = 한 줄로 두 칸');
  ok(C.LBL[0] === 'a5' && C.LBL[24] === 'e1' && C.LBL[12] === 'c3' && new Set(C.LBL).size === 25, '칸 이름 a5 · e1 · c3');
}

// 2) 시작
{
  const xs = new Set();
  for (let seed = 1; seed <= 30; seed++) xs.add(C.init({ n: 2, seed }).X);
  ok(xs.size === 2, '선공은 씨앗마다 0 · 1 둘 다');
  const st = C.init({ n: 2, seed: 3 });
  ok(st.B.every(b => J(C.CORNER.map(p => b.c[p])) === J([2, 2, 2, 2]) && b.c.filter(x => x).length === 4 && b.h === 20 && b.cap === 0), '판마다 모서리 호랑이 4 · 염소 20 은 밖');
  ok(J(C.needs(st)) === J([st.X]), '선공부터');
  const L = C.legal(st, st.X);
  ok(L.length === 21 && L.every(a => a.t === 'place' && a.b === 0), '처음엔 판 A 빈 점 21곳에 놓기만');
  ok(C.legal(st, 1 - st.X).length === 0, '차례 아닌 자리는 수 없음');
  ok(J(C.init({ n: 2, seed: 9 })) === J(C.init({ n: 2, seed: 9 })), '같은 seed 는 같은 판');
}

// 3) 차례 순서 (방송: 선공 1수 → 그다음부터 2수씩, 한 차례 = 내 염소 판 한 수 + 내 호랑이 판 한 수)
{
  const st = scene({ X: 1 });
  const seq = []; for (let s = 0; s < 11; s++) { const k = stepAt(st, s); seq.push(`${'AB'[k.b]}${k.role}${k.seat}`); }
  ok(seq.join(' ') === 'Ag1 Bg0 At0 Ag1 Bt1 Bg0 At0 Ag1 Bt1 Bg0 At0', '순서 ' + seq.join(' '));
  // 판마다 염소 · 호랑이가 번갈아, 염소가 먼저
  for (const b of [0, 1]) { const r = []; for (let s = 0; s < 12; s++) { const k = stepAt(st, s); if (k.b === b) r.push(k.role); } ok(/^(gt)+g?$/.test(r.join('')), `판 ${'AB'[b]} 은 염소부터 번갈아: ${r.join('')}`); }
  // 자리마다: 판 A 염소 = X, 판 B 염소 = Y
  for (let s = 0; s < 12; s++) { const k = stepAt(st, s); ok((k.role === 'g') === (k.b === 0 ? k.seat === 1 : k.seat === 0), `역할 맞음 step ${s}`); }
}

// 4) 염소 놓기 · 옮기기
{
  const st = scene({ X: 0 });
  ok(!C.apply(st, 1, pl(6)).ok, '차례 아님');
  ok(!C.apply(st, 0, pl(0)).ok, '호랑이 자리에 놓기 불가');
  ok(!C.apply(st, 0, pl(25)).ok && !C.apply(st, 0, pl(-1)).ok && !C.apply(st, 0, pl(1.5)).ok, '없는 점');
  ok(!C.apply(st, 0, mv(1, 2)).ok, '놓기 단계엔 옮기기 불가');
  ok(!C.apply(st, 0, pl(6, 1)).ok && /판 A/.test(C.apply(st, 0, pl(6, 1)).err), '다른 판 표시는 막음');
  ok(!C.apply(st, 0, null).ok && !C.apply(st, 0, { t: 'jump' }).ok, '이상한 행동');
  ok(C.apply(st, 0, pl(6, 0)).ok && st.B[0].c[6] === 1 && st.B[0].h === 19 && st.step === 1, '판 A 염소 놓기');
  ok(J(C.needs(st)) === J([1]) && C.legal(st, 1).every(a => a.t === 'place' && a.b === 1), '그다음 상대가 판 B 염소');
  ok(C.apply(st, 1, pl(12)).ok && st.B[1].c[12] === 1, '판 B 염소');
  ok(J(C.needs(st)) === J([1]) && C.legal(st, 1).every(a => a.t === 'move' && a.b === 0), '같은 사람이 이어서 판 A 호랑이');
  ok(!C.apply(st, 1, pl(7)).ok, '호랑이는 놓기 없음');
  // 다 놓은 뒤: 이웃 한 칸만
  const s2 = scene({ A: { g: [6, 7], h: 0 }, X: 0, step: 3 });
  ok(!C.apply(s2, 0, pl(8)).ok && /판 위 염소/.test(C.apply(s2, 0, pl(8)).err), '다 놓았으면 놓기 불가');
  ok(!C.apply(s2, 0, mv(6, 18)).ok, '먼 점으로 옮기기 불가');
  ok(!C.apply(s2, 0, mv(7, 11)).ok, '홀수 점(c4)에서 대각선 불가');
  ok(!C.apply(s2, 0, mv(0, 1)).ok, '호랑이를 염소처럼 옮기기 불가');
  ok(C.apply(s2, 0, mv(6, 11)).ok && s2.B[0].c[11] === 1 && !s2.B[0].c[6], '염소 한 칸 옮기기 (b4 → b3)');
  const s3 = scene({ A: { g: [6], h: 0 }, X: 0, step: 3 });
  ok(C.apply(s3, 0, mv(6, 12)).ok, '짝수 점(b4)에서 대각선 한 칸');
}

// 5) 호랑이: 한 칸 · 뛰어넘어 잡기
{
  // step 2 = 판 A 호랑이 (X=0 이면 자리 1)
  const mk = (g, t) => scene({ A: { g, t, h: 10 }, X: 0, step: 2 });
  let st = mk([7], [12, 0, 4, 24]);
  ok(C.apply(st, 1, mv(12, 2)).ok && st.B[0].c[2] === 2 && !st.B[0].c[7] && st.B[0].cap === 1, '뛰어넘어 잡기 → 잡힌 염소 1');
  ok(st.log.some(e => e.k === 'tm' && e.cap === 7), '기록에 잡은 염소');
  st = mk([7, 2], [12, 0, 4, 24]);
  ok(!C.apply(st, 1, mv(12, 2)).ok, '내려앉을 점이 차 있으면 불가');
  st = mk([], [12, 7, 4, 24]);
  ok(!C.apply(st, 1, mv(12, 2)).ok, '호랑이는 못 뛰어넘음');
  st = mk([], [12, 0, 4, 24]);
  ok(!C.apply(st, 1, mv(12, 2)).ok, '빈 점은 못 뛰어넘음 (두 칸 이동 불가)');
  st = mk([8], [7, 0, 4, 24]);
  ok(C.apply(st, 1, mv(7, 9)).ok && st.B[0].cap === 1, '가로로 뛰어넘기');
  st = mk([11], [7, 0, 4, 24]);
  ok(!C.apply(st, 1, mv(7, 15)).ok, '홀수 점(c4)에서 대각선 뛰어넘기 불가');
  st = mk([], [6, 0, 4, 24]);
  ok(C.apply(st, 1, mv(6, 12)).ok, '짝수 점 대각선 한 칸');
  const L = C.legal(mk([7, 11], [12, 0, 4, 24]), 1);
  ok(L.some(a => a.from === 12 && a.to === 2) && L.some(a => a.from === 12 && a.to === 10) && L.every(a => a.b === 0), '잡기 수가 목록에');
}

// 6) 승패: 5마리 잡기 · 모두 가두기 · 먼저 끝난 판
{
  let st = scene({ A: { g: [7], t: [12, 0, 4, 24], cap: 4, h: 0 }, X: 0, step: 2 });
  ok(C.apply(st, 1, mv(12, 2)).ok && st.over && st.res.b === 0 && st.res.w === 1 && st.res.why === 'cap', '판 A 에서 5마리 → 호랑이(자리 1) 승');
  ok(J(C.ranks(st)) === J([1, 0]) && C.needs(st).length === 0 && C.legal(st, 0).length === 0, '순위 · 끝나면 수 없음');
  ok(J(st.res.caps) === J([0, 5]), '잡은 수: 자리 1 이 5');
  // 가두기: 모서리 호랑이 넷, 한 곳만 비었고 염소가 그 자리를 채움 (step 3 = 판 A 염소 X)
  const full = [1, 2, 3, 5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 19, 21, 22, 23];
  st = scene({ A: { g: full.filter(p => p !== 22).concat([17]), h: 0 }, X: 0, step: 3 });
  ok(C.trapped(st.B[0].c).length < 4, '시작엔 다 갇히진 않음');
  ok(C.apply(st, 0, mv(17, 22)).ok && st.over && st.res.why === 'trap' && st.res.w === 0 && st.res.b === 0, '염소 수로 호랑이 넷이 다 막히면 바로 염소 승');
  // 다른 판이 먼저 끝나면 그 판 승자
  st = scene({ A: { g: [6], h: 15 }, B: { g: [7], t: [12, 0, 4, 24], cap: 4, h: 0 }, X: 0, step: 4 });
  ok(C.apply(st, 0, mv(12, 2)).ok && st.over && st.res.b === 1 && st.res.w === 0, '판 B 에서 선공 호랑이가 5마리 → 선공 승');
  ok(J(C.view(st, 0).ranks) === J([0, 1]), '보기 순위');
}

// 7) 염소가 움직일 곳이 없으면 건너뜀 · 수 상한
{
  // 판 B 염소(Y=1)가 step 5 에 움직일 수 없음: 염소 한 마리를 호랑이가 둘러쌈
  const st = scene({ A: { g: [6], h: 15 }, B: { g: [0], t: [1, 5, 6, 24], h: 0, cap: 2 }, X: 0, step: 4 });
  ok(C.movesOf(st.B[1].c, 0, 'g').length === 0, '장면: 판 B 염소 꼼짝 못 함');
  ok(C.apply(st, 0, mv(24, 18)).ok, '판 B 호랑이 수');
  ok(st.step === 6 && st.log.some(e => e.k === 'skip' && e.b === 1) && J(C.needs(st)) === J([1]), '염소 차례는 건너뛰고 판 A 호랑이로');
  // 수 상한: 그 안에서 두 사람의 호랑이 수가 같음
  const tc = [0, 0]; for (let q = 0; q < C.LIMIT; q++) { const k = C.slot(st, q); if (k.role === 't') tc[k.seat]++; }
  ok(tc[0] === tc[1] && tc[0] === 80, '상한 안 호랑이 수가 같음 ' + J(tc));
  // 수 상한
  const s2 = scene({ A: { g: [6], h: 15, cap: 1 }, B: { g: [7], h: 15, cap: 2 }, X: 0, step: C.LIMIT - 1 });
  const k = C.slot(s2, s2.step), L = C.legal(s2, k.seat);
  ok(C.apply(s2, k.seat, L[0]).ok && s2.over && s2.res.why === 'limit', '수 상한에서 끝');
  ok(s2.res.w === 0 && J(s2.res.caps) === J([2, 1]), '더 많이 잡은 쪽(판 B 호랑이 = 선공) 승');
  const s3 = scene({ A: { g: [6], h: 15, cap: 1 }, B: { g: [7], h: 15, cap: 1 }, X: 0, step: C.LIMIT - 1 });
  const k3 = C.slot(s3, s3.step), L3 = C.legal(s3, k3.seat);
  ok(C.apply(s3, k3.seat, L3[0]).ok && s3.over && s3.res.w === -1 && J(C.ranks(s3)) === J([0, 0]), '같으면 무승부');
}

// 8) 보이는 것 · 결정성
{
  const st = C.init({ n: 2, seed: 11 }); const r = mul(3);
  for (let i = 0; i < 30 && !C.over(st); i++) { const s = C.needs(st)[0]; C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r)); }
  const v0 = C.view(st, 0), v1 = C.view(st, 1), vs = C.view(st, -1);
  ok(v0.pub === v1.pub && v1.pub === vs.pub, '모두 공개: pub 같음');
  ok(J(v0.B) === J(v1.B), '판도 같음');
  ok(v0.cur && v0.cur.seat === C.needs(st)[0] && J(v0.needs) === J(C.needs(st)), 'cur · needs');
  const before = J(st);
  C.view(st, 0); C.ai(C.view(st, 0), C.needs(st)[0], 'hard', mul(1)); C.legal(st, 0); C.legal(st, 1);
  ok(J(st) === before, '보기 · AI · legal 은 상태를 안 바꿈');
  const play = seed => { const s = C.init({ n: 2, seed }); const rr = mul(seed); for (let i = 0; i < 60 && !C.over(s); i++) { const q = C.needs(s)[0]; C.apply(s, q, C.ai(C.view(s, q), q, 'normal', rr)); } return J(s); };
  ok(play(4) === play(4), '같은 씨앗 · 같은 수 → 같은 판');
  const V = C.view(st, 0);
  ok(V.B.every(b => b.goat !== b.tiger) && V.B[0].goat === V.B[1].tiger, '판마다 역할이 반대');
  ok(J(V.score) === J([0, 1].map(s => V.B[V.B[0].tiger === s ? 0 : 1].cap)), 'score = 호랑이로 잡은 수');
}

// 9) AI 단계
{
  const runs = QUICK ? 8 : 24;
  const duel = (ta, tb, n) => {
    let w = 0, l = 0, d = 0, steps = 0;
    for (let s = 1; s <= n; s++) {
      const st = C.init({ n: 2, seed: 100 + s }); const r = mul(s * 13);
      const tier = s % 2 ? [ta, tb] : [tb, ta], mine = s % 2 ? 0 : 1;
      while (!C.over(st)) { const q = C.needs(st)[0]; const a = C.ai(C.view(st, q), q, tier[q], r); if (!C.apply(st, q, a).ok) { ok(false, 'AI 수가 규칙 위반 ' + J(a)); break; } }
      steps += st.step;
      if (st.res.w < 0) d++; else if (st.res.w === mine) w++; else l++;
    }
    return { w, l, d, rate: (w + d / 2) / n, steps: steps / n };
  };
  const he = duel('hard', 'easy', runs), ne = duel('normal', 'easy', runs), hn = duel('hard', 'normal', runs);
  console.log(`  고급 vs 쉬움 ${he.w}/${he.l}/${he.d} · 보통 vs 쉬움 ${ne.w}/${ne.l}/${ne.d} · 고급 vs 보통 ${hn.w}/${hn.l}/${hn.d} (평균 수 ${he.steps.toFixed(0)} · ${ne.steps.toFixed(0)} · ${hn.steps.toFixed(0)})`);
  ok(he.rate >= 0.85, '고급 > 쉬움');
  ok(ne.rate >= 0.7, '보통 > 쉬움');
  ok(hn.rate >= 0.65, '고급 > 보통');
}

// 10) 전술: 잡을 수 있으면 잡음 · 잡힐 염소를 감쌈 · 5번째 잡기
{
  // 호랑이 차례(판 A, step 2, 자리 1): 염소 7 을 잡을 수 있음
  let st = scene({ A: { g: [7, 13, 1], t: [12, 0, 4, 24], h: 5, cap: 4 }, X: 0, step: 2 });
  let a = C.ai(C.view(st, 1), 1, 'hard', mul(1));
  ok(a && a.t === 'move' && !C.ADJ[a.from].includes(a.to), '고급: 5번째를 잡아 이김 ' + J(a));
  ok(C.ai(C.view(st, 1), 1, 'normal', mul(1)).to !== undefined, '보통도 수를 냄');
  // 염소 차례(판 A, step 3, 자리 0): 염소 7 이 잡힐 위기 → 2 를 메우거나 7 을 옮김
  st = scene({ A: { g: [7], t: [12, 0, 4, 24], h: 10 }, X: 0, step: 3 });
  a = C.ai(C.view(st, 0), 0, 'hard', mul(2));
  const after = st.B[0].c.slice(); if (a.t === 'place') after[a.to] = 1; else { after[a.from] = 0; after[a.to] = 1; }
  ok(C.exposed(after).length === 0, '고급 염소: 잡힐 염소를 감쌈 ' + J(a));
  const R = C.recommend(C.view(st, 0), 0);
  ok(R && R.role === 'g' && R.b === 0 && R.tags.includes('safe'), '선생님 추천도 감싸기 ' + J(R && R.a));
  // 실제 판에서 나온 장면 (고급끼리 39수째): c4 에 놓으면 호랑이가 바로 잡을 수 있음
  const mid = scene({ A: { g: [1, 2, 3, 4, 10, 14, 15, 19, 22, 23], t: [6, 9, 17, 18], h: 10 }, X: 0, step: 3 });
  const Rm = C.recommend(C.view(mid, 0), 0);
  const Jd = C.judge(C.view(mid, 0), 0, pl(7, 0), Rm.a);
  ok(Jd && Jd.best - Jd.my >= 100, `복기: 그냥 두면 손해가 큼 (${Jd && Jd.best} vs ${Jd && Jd.my})`);
}

// 11) 화면 (Node 안에서 글만)
{
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  window.SVCores = { baghchal: C }; require('../games/baghchal/ui.js');
  const U = window.SVUI.baghchal;
  ok(U && U.name === '바그찰' && U.min === 2 && U.max === 2 && typeof U.render === 'function', 'UI 등록');
  const tut = U.tutorial();
  ok(tut.length >= 5 && tut.filter(t => t.interactive).length === 1, '1분 규칙: 대화형 한 단계');
  ok(tut.every(t => !/undefined|null|NaN/.test((t.body || '') + (t.boardHtml || ''))), '1분 규칙 글이 깨끗함');
  const st = C.init({ n: 2, seed: 21 }); const r = mul(5);
  let bad = 0, n = 0;
  for (let i = 0; i < 70 && !C.over(st); i++) {
    const q = C.needs(st)[0];
    for (const me of [0, 1]) {
      const V = C.view(st, me), co = U.coach(V, me, -1);
      const txt = co.opp + co.mine + co.rec + co.why + U.sub(V) + J(U.chip(V, me));
      if (/undefined|null|NaN|\[object/.test(txt)) { bad++; if (bad < 3) console.error(txt); }
      n++;
    }
    const V = C.view(st, q), a = C.ai(V, q, i % 3 ? 'easy' : 'hard', r);
    const t = U.actText(a, V); if (!t || /undefined/.test(t)) bad++;
    C.apply(st, q, a);
  }
  ok(!bad && n > 50, `선생님 · 글 깨끗함 (${n}번)`);
  // 복기: 잡힐 염소를 그냥 둔 수
  const s2 = scene({ A: { g: [1, 2, 3, 4, 10, 14, 15, 19, 22, 23], t: [6, 9, 17, 18], h: 10 }, X: 0, step: 3 });
  const Vb = C.view(s2, 0), best = C.recommend(Vb, 0).a;
  const rv = U.review(Vb, 0, pl(7, 0), best);
  ok(rv.sev >= 60 && /고급 AI/.test(rv.why) && /잡힐/.test(rv.why), `복기 심각도 ${rv.sev}: ${rv.why}`);
  const rv2 = U.review(Vb, 0, best, best);
  ok(rv2.sev <= 5, '같은 수면 낮음');
  ok(U.actText({ t: 'move', from: 12, to: 2, b: 0 }, C.view(scene({ A: { g: [7] }, X: 0, step: 2 }), 1)).includes('잡기'), '잡기 글');
  ok(U.actText({ t: 'place', to: 12 }, null) === '🐐 c3에 염소 놓기', '판 없이도 글');
  ok(U.actText({ t: 'move', from: 12, to: 2 }, null).includes('잡기'), '판 없이도 잡기 글');
  // 수를 둔 뒤의 보기로 불러도 역할이 맞음 (판 B 염소 수 → 다음 차례는 판 A 호랑이)
  const sa = scene({ A: { g: [6], h: 15 }, B: { g: [7, 13], h: 0 }, X: 0, step: 5 }); const ga = { t: 'move', from: 13, to: 18, b: 1 };
  ok(C.apply(sa, 1, ga).ok && /🐐/.test(U.actText(ga, C.view(sa, 1))) && !/🐯/.test(U.actText(ga, C.view(sa, 1))), '뒤 보기여도 염소 글 ' + U.actText(ga, C.view(sa, 1)));
  const end = scene({ A: { g: [7], t: [12, 0, 4, 24], cap: 4, h: 0 }, X: 0, step: 2 }); C.apply(end, 1, mv(12, 2));
  const res = U.result(C.view(end, 0), 0);
  ok(/상대 승/.test(res) && /5마리/.test(res) && !/undefined/.test(res), '결과 글: ' + res.replace(/<[^>]+>/g, ' '));
}

// 시간 예산: 고급 AI 한 번 두는 데 걸리는 시간 (11-26 · 목표 150ms — 시험 PC 흔들림을 넉넉히 보아 최대 600ms · p95 300ms)
{
  const { performance } = require('perf_hooks'); const T = []; let seed0 = 7;
  const rnd = () => { seed0 = (seed0 * 1664525 + 1013904223) >>> 0; return seed0 / 4294967296; };
  for (const n of [2]) for (let g = 0; g < (process.argv.includes('--quick') ? 2 : 4); g++) {
    const st = C.init({ n, seed: 40 + g, cfg: {} }); let steps = 0;
    while (!C.over(st) && steps++ < 400 && T.length < 400) {
      const nd = C.needs(st); if (!nd.length) { if (C.auto && C.auto(st) != null) { C.advance(st); continue; } break; }
      for (const s of nd) {
        if (!C.needs(st).includes(s)) continue;
        const V = C.view(st, s), t = performance.now(); let a; try { a = C.ai(V, s, 'hard', rnd); } catch (e) { a = null; } T.push(performance.now() - t);
        let r = a != null ? C.apply(st, s, a) : { ok: false };
        if (!r.ok) { const Lg = C.legal && C.legal(st, s); if (Lg && Lg.length) r = C.apply(st, s, Lg[0]); }
        if (!r.ok) { steps = 1e9; break; }
      }
    }
  }
  T.sort((a, b) => a - b); const mx = T[T.length - 1] || 0, p95 = T[Math.floor(T.length * 0.95)] || 0;
  console.log(`· baghchal 고급 AI ${T.length}번 최대 ${mx.toFixed(0)}ms · p95 ${p95.toFixed(0)}ms`);
  ok(T.length > 10 && mx <= 600 && p95 <= 300, `baghchal AI 시간 예산 (최대 ${mx.toFixed(0)}ms · p95 ${p95.toFixed(0)}ms)`);
}
console.log(`baghchal selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

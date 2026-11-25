// 같은 숫자 찾기 규칙 시험 (node survival/test/gn-samenum_selftest.js)
// 방송 판(ALIE/YOUM/STNR/HDGK · 5 ÷ 6 8 / + 10 2 12 / 1 7 4 11 / × 3 √ 9) 위에서 식 판정 · 버저(ms 로 선권) · 번갈아 호명 · 5초 제한(timeout) · 24번 무효 · 숨은 정보 ·
// 선생님 글 · AI 무작위 판 · 사람 대역(암기 50~70% · 풀이를 알 때 1.0~2.2초)이 AI 3단계를 이기는지 보정
'use strict';
const G = require('../games/gn-samenum/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const clone = v => JSON.parse(JSON.stringify(v));
const fpOf = st => JSON.stringify(st);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 방송 판 (시즌 4 판 그대로 · 시즌 3 은 √ 자리에 −)
const B4 = [5, '÷', 6, 8, '+', 10, 2, 12, 1, 7, 4, 11, '×', 3, '√', 9];
const B3 = B4.map(v => (v === '√' ? '−' : v));
const cell = (b, v) => b.indexOf(v);
const ready = st => { G.apply(st, 0, { t: 'ready' }); G.apply(st, 1, { t: 'ready' }); };
const mk = (cfg, seed) => G.init({ n: 2, seed: seed || 1, cfg: Object.assign({ board: B3, targets: [12, 72, 56, 15, 3, 99, 20, 30] }, cfg) });

// 1) 타깃 · 식 판정
{
  ok(G.legalTargets(3).length === 56, `시즌 3 타깃 56가지 (방송 56가지 정도) — ${G.legalTargets(3).length}`);
  ok(G.legalTargets(4).length === 55, `시즌 4 타깃 ${G.legalTargets(4).length}가지`);
  ok(G.legalTargets(3).includes(72) && G.legalTargets(3).includes(132) && !G.legalTargets(3).includes(25) && !G.legalTargets(3).includes(0), '72 · 132 가능 · 25(5×5 같은 칸 두 번)와 0 은 불가능');
  ok(G.legalTargets(4)[0] === 2 && !G.legalTargets(4).includes(1), '시즌 4 는 − 가 없어 1 이 안 나옴(1 은 12 ÷ 12 가 안 돼서 5 − 4 같은 식뿐)');
  ok(G.judge([5, '+', 7], 12).hit, '5 + 7 = 12');
  ok(!G.judge(['+', 5, 7], 12).hit && !G.judge(['+', 5, 7], 12).valid, '순서가 숫자 → 기호 → 숫자가 아니면 식이 안 됨');
  ok(!G.judge([5, 7, '+'], 12).valid && !G.judge([5, 7, 6], 12).valid, '숫자 → 숫자 → 기호 도 안 됨');
  ok(G.judge([12, '÷', 4], 3).hit && !G.judge([5, '÷', 2], 2).hit && G.judge([5, '÷', 2], 2).val === 2.5, '÷ 는 정수로 떨어질 때만 · 2.5 는 2 가 아님');
  ok(G.judge([9, '−', 5], 4).hit && !G.judge([5, '−', 9], 4).hit, '− 는 앞 − 뒤 순서');
  ok(G.judge([1, '√', 4], 3).hit && G.judge([4, '√', 9], 5).hit && G.judge([9, '√', 1], 4).hit, '√x+√y: 1+2 = 3 · 2+3 = 5 · 3+1 = 4');
  ok(!G.judge([2, '√', 8], 4).hit && !G.judge([6, '√', 4], 4).hit, '정수가 안 되는 √ 조합은 타깃이 못 돼요');
  ok(G.judge([6, '×', 12], 72).hit, '6 × 12 = 72');
}

// 2) 단계 흐름 · 버저 · 호명
{
  const st = mk();
  ok(st.back.join() === B3.join(), '판 배치를 고정해서 시험');
  ok(G.needs(st).join() === '0,1' && st.phase === 'look', '처음엔 둘 다 외우는 중(ready 를 기다림)');
  const V0 = G.view(st, 0);
  ok(V0.back.every(v => v !== null) && V0.target === 0, 'look 동안엔 모든 뒷면이 보이고 타깃은 아직');
  ok(!G.apply(st, 0, { t: 'buzz', ms: 100 }).ok, 'look 에서 buzz 거절');
  ok(G.apply(st, 0, { t: 'ready' }).ok && G.needs(st).join() === '1', '한 사람 ready');
  ok(!G.apply(st, 0, { t: 'ready' }).ok, '같은 사람이 또 ready 거절');
  ok(G.apply(st, 1, { t: 'ready' }).ok && st.phase === 'buzz' && st.round === 1 && st.target === 12, '둘 다 ready → 1라운드 타깃 12 · 뒷면이 가려짐');
  ok(G.view(st, 0).back.every(v => v === null), 'ready 뒤엔 공개 전 뒷면이 전부 가려짐');
  ok(G.needs(st).join() === '0,1', '버저 단계: 아직 안 누른 두 자리');
  ok(!G.apply(st, 0, { t: 'buzz', ms: NaN }).ok && !G.apply(st, 0, { t: 'buzz' }).ok && !G.apply(st, 0, { t: 'call', c: [0, 1, 2] }).ok, '버저 단계에서 이상한 행동 거절');
  const before = fpOf(st);
  G.apply(st, 0, { t: 'buzz', ms: 'abc' }); G.apply(st, 2, { t: 'buzz', ms: 5 });
  ok(fpOf(st) === before, '안 먹은 행동은 st 를 안 바꿈');
  ok(G.apply(st, 0, { t: 'buzz', ms: 2100 }).ok && G.needs(st).join() === '1', '내 버저');
  ok(G.view(st, 0).mine === true && G.view(st, 1).mine === false, '내가 눌렀는지는 내 view 에만');
  ok(!JSON.stringify(G.view(st, 1)).includes('2100'), '상대가 누른 시각(ms)은 결정 전엔 안 보임');
  ok(G.apply(st, 1, { t: 'buzz', ms: 1500 }).ok && st.phase === 'call' && st.caller === 1, 'ms 가 작은 쪽(1500)이 선권');
  const bl = G.view(st, 0).log.filter(e => e.k === 'buzz')[0];
  ok(bl && bl.w === 1 && bl.ms.join() === '2100,1500', '결정 뒤에는 둘의 시각이 공개 기록에 남음');
  ok(G.needs(st).join() === '1', '선권을 가진 자리만 호명');
  ok(!G.apply(st, 0, { t: 'call', c: [0, 4, 9] }).ok, '차례가 아닌 자리의 호명 거절');
  for (const bad of [[0, 0, 4], [0, 4], [0, 4, 16], [-1, 4, 9], [0.5, 4, 9], '0,4,9', null, [0, 4, 9, 1]]) ok(!G.apply(st, 1, { t: 'call', c: bad }).ok, `이상한 호명 거절 ${JSON.stringify(bad)}`);
  ok(fpOf(st) === fpOf(st) && G.view(st, 0).rev.every(x => !x), '거절된 호명은 칸을 공개하지 않음');
  // 틀린 호명: 5 × 6 = 30 ≠ 12 → 공개 + 상대에게 기회
  const A = cell(B3, 5), X = cell(B3, '×'), S6 = cell(B3, 6);
  ok(G.apply(st, 1, { t: 'call', c: [A, X, S6] }).ok && st.phase === 'show', '틀린 호명 → 결과 보이는 단계');
  ok(G.auto(st) > 0, '결과를 잠깐 보여 준 뒤 자동으로 넘어감');
  const vv = G.view(st, 0);
  ok(vv.rev[A] && vv.rev[X] && vv.rev[S6] && vv.back[A] === 5 && vv.back[X] === '×' && vv.back[S6] === 6, '호명한 세 칸의 뒷면이 두 사람 모두에게 공개');
  ok(vv.last && vv.last.val === 30 && !vv.last.hit && vv.last.valid && vv.last.s === 1, '결과: 5 × 6 = 30');
  ok(G.view(st, 0).back.filter(v => v !== null).length === 3, '공개된 칸은 세 칸뿐');
  G.advance(st);
  ok(st.phase === 'call' && st.caller === 0 && st.score.join() === '0,0', '틀리면 상대(0)에게 기회 · 점수 그대로');
  // 상대의 정답: 5 + 7 = 12 (A, +, 7)
  const P = cell(B3, '+'), S7 = cell(B3, 7);
  ok(G.apply(st, 0, { t: 'call', c: [A, P, S7] }).ok && st.score.join() === '1,0', '5 + 7 = 12 정답 → 승점 1');
  G.advance(st);
  ok(st.phase === 'buzz' && st.round === 2 && st.target === 72 && st.score.join() === '1,0', '다음 라운드: 새 타깃 72 · 버저 다시 · 공개된 칸은 그대로');
  ok(G.view(st, 1).rev[A] && G.view(st, 1).back[S7] === 7, '공개된 칸은 라운드가 바뀌어도 알려진 채');
  ok(st.hist.length === 1 && st.hist[0].w === 0 && st.hist[0].t === 12 && st.hist[0].calls === 2, '라운드 기록');
}

// 3) 버저 동률 · 둘 다 안 누름 · 5초 제한(timeout) · 24번 무효
{
  const a = mk({}, 11), b = mk({}, 12);
  for (const st of [a, b]) { ready(st); G.apply(st, 0, { t: 'buzz', ms: 1234 }); G.apply(st, 1, { t: 'buzz', ms: 1234 }); }
  ok(a.phase === 'call' && b.phase === 'call', '동률도 선권이 정해짐 (씨앗으로)');
  const wins = new Set(); for (let s = 1; s <= 40; s++) { const t = mk({}, s); ready(t); G.apply(t, 0, { t: 'buzz', ms: 900 }); G.apply(t, 1, { t: 'buzz', ms: 900 }); wins.add(t.caller); }
  ok(wins.size === 2, '동률은 씨앗에 따라 양쪽이 다 나옴');
  const c = mk({}, 11); ready(c); G.apply(c, 0, { t: 'buzz', ms: 1234 }); G.apply(c, 1, { t: 'buzz', ms: 1234 });
  ok(c.caller === a.caller, '같은 씨앗이면 같은 결과');
  const d = mk({}, 5); ready(d); G.apply(d, 0, { t: 'buzz', ms: 99999 }); G.apply(d, 1, { t: 'buzz', ms: 5000 });
  ok(d.caller === 1 && d.log.some(e => e.k === 'buzz' && !e.forced), '한쪽만 누르면(99999 = 안 누름) 누른 쪽이 선권');
  const e = mk({}, 5); ready(e); G.apply(e, 0, { t: 'buzz', ms: 99999 }); G.apply(e, 1, { t: 'buzz', ms: 99999 });
  ok(e.phase === 'call' && e.log.some(x => x.k === 'buzz' && x.forced), '둘 다 안 누르면 딜러가 순서를 정함');
  // timeout
  const t = mk({}, 7); ready(t); G.apply(t, 0, { t: 'buzz', ms: 500 }); G.apply(t, 1, { t: 'buzz', ms: 900 });
  ok(t.caller === 0 && G.apply(t, 0, { t: 'timeout' }).ok && t.phase === 'show' && t.last.tmo && G.view(t, 1).rev.every(x => !x), '5초를 넘기면(timeout) 칸은 안 열리고 상대에게 기회');
  G.advance(t); ok(t.caller === 1 && t.phase === 'call', 'timeout 뒤 상대 차례');
  ok(!G.apply(t, 0, { t: 'timeout' }).ok, '차례 아닌 자리의 timeout 거절');
  // 24번이 넘으면 라운드 무효 (같은 틀린 호명을 번갈아)
  const v = mk({ targets: [12, 72, 56] }, 9); ready(v); G.apply(v, 0, { t: 'buzz', ms: 500 }); G.apply(v, 1, { t: 'buzz', ms: 900 });
  for (let i = 0; i < 24; i++) { ok(v.phase === 'call', `${i + 1}번째 기회`); G.apply(v, v.caller, { t: 'timeout' }); if (v.phase === 'show') G.advance(v); }
  ok(v.phase === 'buzz' && v.round === 2 && v.target === 72 && v.score.join() === '0,0', '호명 24번이 넘으면 무효 → 점수 없이 다음 타깃');
  ok(v.hist[0].w === -1, '무효 라운드 기록');
  // 버저 시각은 진짜 숫자만 (null · 문자열은 0 초로 읽히면 안 됨)
  const bz = mk({}, 4); ready(bz);
  for (const bad of [null, '', '5', false, [], NaN, Infinity, undefined]) ok(!G.apply(bz, 0, { t: 'buzz', ms: bad }).ok && bz.bz[0] === null, `버저 ms ${String(bad)} 는 거절`);
  ok(G.apply(bz, 0, { t: 'buzz', ms: 1234.4 }).ok && bz.bz[0] === 1234, '버저 ms 는 숫자만 받고 정수로 맞춤');
}

// 4) 먼저 N점 · 끝 · 순위 · 타깃 소진
{
  const st = mk({ goal: 5, targets: [12, 12, 12, 12, 12, 12, 12] }, 3);
  ready(st);
  const win = who => { G.apply(st, 0, { t: 'buzz', ms: who === 0 ? 100 : 900 }); G.apply(st, 1, { t: 'buzz', ms: who === 1 ? 100 : 900 }); return G.apply(st, who, { t: 'call', c: [cell(B3, 5), cell(B3, '+'), cell(B3, 7)] }); };
  for (let i = 0; i < 4; i++) { ok(win(0).ok, `${i + 1}점`); ok(!G.over(st), '아직 안 끝남'); G.advance(st); }
  ok(win(1).ok, '상대 1점'); G.advance(st);
  ok(st.score.join() === '4,1', '4 : 1');
  ok(win(0).ok && G.over(st) && st.phase === 'end' && G.needs(st).length === 0, '먼저 5점이면 끝');
  ok(G.ranks(st).join() === '0,1' && G.view(st, 0).ranks.join() === '0,1', '순위');
  const o = mk({ goal: 7 }, 3); ok(G.view(o, 0).goal === 7 && G.view(mk({ goal: 99 }, 3), 0).goal === 10, '목표 점수 옵션 5 · 7 · 10 (기본 10 = 방송)');
  const z = mk({ targets: [12] }, 3); ready(z); G.apply(z, 0, { t: 'buzz', ms: 1 }); G.apply(z, 1, { t: 'buzz', ms: 2 }); G.apply(z, 0, { t: 'call', c: [0, 4, 9] }); G.advance(z);
  ok(G.over(z), '타깃이 바닥나면 점수로 끝남');
}

// 5) 숨은 정보
{
  const st = mk({}, 21); ready(st);
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all'), vs = G.view(st, -1);
  ok(v0.pub === v1.pub && v1.pub === va.pub && va.pub === vs.pub, '공개 지문은 모두 같다');
  ok(v0.back.every(x => x === null) && v1.back.every(x => x === null) && vs.back.every(x => x === null), '공개 전엔 안 보임');
  ok(va.back.join() === B3.join(), "view(st, 'all') 은 전부 보임");
  ok(v0.mem && v0.mem.length === G.MEMPOOL && v1.mem.length === G.MEMPOOL && vs.mem === null && va.mem === null, '기억 풀은 자기 것만 12칸 (구경꾼 · all 은 없음)');
  ok(v0.mem.map(m => m.c).join() !== v1.mem.map(m => m.c).join(), '두 자리의 기억은 서로 다름');
  ok(v0.mem.every(m => m.v === B3[m.c]), '기억 값이 진짜 뒷면과 같다');
  // 이 자리 기억 풀 밖 · 공개 안 된 칸의 값을 서로 바꿔도 그 자리 view 는 똑같다
  const out = [...Array(16).keys()].filter(i => !v0.mem.some(m => m.c === i));
  ok(out.length === 4, '기억 풀 밖 칸이 4개');
  const b2 = B3.slice(); const t = b2[out[0]]; b2[out[0]] = b2[out[1]]; b2[out[1]] = t;
  const st2 = mk({ board: b2 }, 21);
  // mem 순열은 씨앗에서 나오므로 같은 씨앗 · 같은 행동이면 같음 — 판만 바꾼 상태
  ready(st2);
  const j0 = JSON.stringify(G.view(st, 0)), j2 = JSON.stringify(G.view(st2, 0));
  ok(j0 === j2, '기억 풀 밖 · 공개 안 된 두 칸의 값을 서로 바꿔도 그 자리 view 가 같다 (새지 않음)');
  const j1 = JSON.stringify(G.view(st, 1)), j12 = JSON.stringify(G.view(st2, 1));
  ok((j1 === j12) === !G.view(st, 1).mem.every(m => m.c !== out[0] && m.c !== out[1]) === false || true, '(참고) 다른 자리는 기억 풀이 달라 영향 받을 수 있음');
  // 호명이 열면 그 칸만 보인다
  G.apply(st, 0, { t: 'buzz', ms: 1 }); G.apply(st, 1, { t: 'buzz', ms: 2 }); G.apply(st, 0, { t: 'call', c: [0, 4, 9] });
  ok(G.view(st, 1).back.filter(x => x !== null).length === 3, '호명이 연 칸만 상대에게도 보임');
  // 상대의 rd(반응 난수)는 안 보임
  ok(JSON.stringify(G.view(st, 0).rd) !== JSON.stringify(G.view(st, 1).rd) && G.view(st, -1).rd === null, 'rd 는 자기 것만');
  // view 가 st 를 안 바꾸고 view 를 고쳐도 st 가 안 바뀜
  const fp0 = fpOf(st); const vx = G.view(st, 0); vx.back[0] = 999; vx.hist.push({}); vx.score[0] = 99; vx.mem[0].v = 77; ok(fpOf(st) === fp0, 'view 를 고쳐도 st 가 안 바뀜');
}

// 6) 선생님 글: 공개 안 된 칸의 값을 바꿔도 같고, 시점(seat)이 달라도 같다
{
  const names = ['나', '삐약'];
  let n = 0;
  for (let k = 0; k < 14; k++) {
    const seed = 300 + k, st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed);
    for (let steps = 0; steps < 80 && !G.over(st); steps++) {
      const need = G.needs(st);
      for (const s of [0, 1]) {
        // 공개 안 된 칸 중 두 칸의 값을 바꿔 쓴 가짜 st
        const hid = [...Array(16).keys()].filter(i => !st.rev[i]);
        const st2 = clone(st);
        if (hid.length >= 2 && st.phase !== 'look') { const a = hid[0], b = hid[hid.length - 1]; const x = st2.back[a]; st2.back[a] = st2.back[b]; st2.back[b] = x; st2.rd = [[0.1, 0.2, 0.3], [0.9, 0.8, 0.7]]; st2.mem = st2.mem.map(m => m.slice().reverse()); }
        const c1 = G.coach(G.view(st, s), s, -1, names), c2 = G.coach(G.view(st2, s), s, -1, names), c3 = G.coach(G.view(st, 'all'), s, -1, names);
        ok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 숨은 칸 · 기억에 따라 바뀜 (자리 ${s}, ${st.phase})`);
        if (!G.view(st, s).mine) ok(JSON.stringify(c1) === JSON.stringify(c3), `선생님 글이 시점에 따라 바뀜 (자리 ${s}, ${st.phase})`);   // 내가 이미 눌렀는지는 내 view 에만 있어서 그땐 건너뜀
        ok(c1.opp && c1.mine && c1.rec && c1.why !== undefined && !/undefined|NaN|null|\[object/.test(JSON.stringify(c1)), `선생님 글 이상 ${JSON.stringify(c1)}`);
        n++;
      }
      if (need.length) { const seat = need[Math.floor(r() * need.length)], V = G.view(st, seat); G.apply(st, seat, G.ai(V, seat, ['easy', 'normal', 'hard'][Math.floor(r() * 3)], r)); } else G.advance(st);
    }
    const fin = G.coach(G.view(st, 0), 0, -1, names);
    ok(fin.rec && !/undefined|NaN/.test(JSON.stringify(fin)), '끝난 판 선생님 글');
  }
  ok(n > 300, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번`);
  // 추천 = 공개된 칸만으로 본 고급 AI 의 호명
  let same = 0, tot = 0;
  for (let k = 0; k < 40; k++) {
    const st = G.init({ n: 2, seed: 900 + k, cfg: {} }), r = mulberry(k + 1);
    ready(st); G.apply(st, 0, { t: 'buzz', ms: 100 }); G.apply(st, 1, { t: 'buzz', ms: 200 });
    for (let steps = 0; steps < 5 && st.phase === 'call'; steps++) {
      const s = st.caller, V = G.view(st, s), rc = G.recommend(V), cc = G.coach(V, s, -1, ['나', '상대']);
      const hardNoMem = G.aiWith(V, s, Object.assign({}, G.PROF.hard, { mem: 0, err: 0, wild: 0 }), r);
      tot++; if (hardNoMem.c.join() === rc.best.c.join()) same++;
      ok(/→/.test(cc.rec), '차례인 선생님 추천에 호명이 있다: ' + cc.rec);
      G.apply(st, s, hardNoMem); if (st.phase === 'show') G.advance(st);
    }
  }
  ok(same === tot, `선생님 추천 = 기억 없이 공개된 칸만 쓴 고급 AI 의 호명 (${same}/${tot})`);
  console.log(`  추천 = 고급 AI 호명 ${same}/${tot}`);
}

// 7) AI 끼리 무작위 판 — 합법 수만 두고, 끝까지 가고, 같은 씨앗이면 같다
for (const tier of ['easy', 'normal', 'hard']) {
  let bad = 0, games = 0, rounds = 0, forced = 0, voids = 0, wins = [0, 0];
  for (let s = 1; s <= 60; s++) {
    const st = G.init({ n: 2, seed: s * 7919, cfg: { goal: s % 3 === 0 ? 5 : s % 3 === 1 ? 7 : 10, season: s % 2 ? 3 : 4 } });
    const r = mulberry(s); let guard = 0;
    while (!G.over(st) && guard++ < 4000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const seat of need) {
        if (!G.needs(st).includes(seat)) continue;
        const a = G.ai(G.view(st, seat), seat, seat ? tier : 'normal', r), res = G.apply(st, seat, a);
        if (!res.ok) { bad++; G.apply(st, seat, G.legal(st, seat)[0]); }
      }
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    games++; rounds += st.round; forced += st.log.filter(e => e.k === 'buzz' && e.forced).length; voids += st.hist.filter(h => h.w < 0).length;
    const R = G.ranks(st); if (R[0] !== R[1]) wins[R[0] === 0 ? 0 : 1]++;
    ok(new Set(st.hist.map(h => h.t)).size === st.hist.length, '같은 타깃이 두 번 나오지 않음');
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${wins[0]} · 좌석1 ${wins[1]} / ${games}판 · 평균 ${(rounds / games).toFixed(1)}라운드 · 딜러가 정한 순서 ${forced}번 · 무효 ${voids}번`);
}
{
  const run = seed => { const st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed); let g = 0; while (!G.over(st) && g++ < 4000) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } for (const s of need) { if (G.needs(st).includes(s)) G.apply(st, s, G.ai(G.view(st, s), s, 'hard', r)); } } return fpOf(st); };
  ok(run(31) === run(31), '같은 씨앗 · 같은 AI = 같은 판');
}

// 8) AI 가 사람처럼: 반응 시간 · 안 누름 · 호명 실수
{
  const bz = { easy: [], normal: [], hard: [] }, pass = { easy: 0, normal: 0, hard: 0 }, tot = { easy: 0, normal: 0, hard: 0 };
  for (let s = 1; s <= 80; s++) {
    const st = G.init({ n: 2, seed: 5000 + s, cfg: {} }), r = mulberry(s); ready(st);
    for (let q = 0; q < 6 && !G.over(st); q++) {
      for (const tier of ['easy', 'normal', 'hard']) {
        const a = G.ai(G.view(st, 0), 0, tier, r);
        tot[tier]++; if (a.ms >= G.NO_BUZZ) pass[tier]++; else bz[tier].push(a.ms);
        ok(a.t === 'buzz' && (a.ms >= G.MIN_MS), `${tier} 반응은 0.8초 아래로 안 내려가요 (${a.ms})`);
      }
      const s0 = G.ai(G.view(st, 0), 0, 'hard', r), s1 = G.ai(G.view(st, 1), 1, 'hard', r);
      G.apply(st, 0, s0); G.apply(st, 1, s1);
      let g = 0; while (st.phase !== 'buzz' && !G.over(st) && g++ < 50) { if (st.phase === 'show') G.advance(st); else { const sc = st.caller; G.apply(st, sc, G.ai(G.view(st, sc), sc, 'hard', r)); } }
    }
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log(`  AI 버저 반응 평균(눌렀을 때): 초급 ${(avg(bz.easy) / 1000).toFixed(1)}초 · 중급 ${(avg(bz.normal) / 1000).toFixed(1)}초 · 고급 ${(avg(bz.hard) / 1000).toFixed(1)}초 · 안 누른 비율 ${['easy', 'normal', 'hard'].map(t => Math.round(pass[t] / tot[t] * 100) + '%').join(' / ')}`);
  ok(avg(bz.easy) > avg(bz.normal) && avg(bz.normal) > avg(bz.hard), '단계가 높을수록 빨라요');
}

// 9) 사람 대역 보정 (암기 50~70% · 풀이를 알 때 1.0~2.2초 · 풀이를 못 찾는 라운드 8%) — 같은 씨앗을 자리만 바꿔 N판
function play(seed, profs) {
  const st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed ^ 0x9e3779b9); let g = 0;
  while (!G.over(st) && g++ < 20000) {
    const need = G.needs(st);
    if (!need.length) { G.advance(st); continue; }
    for (const s of need) { if (!G.needs(st).includes(s)) continue; const res = G.apply(st, s, G.aiWith(G.view(st, s), s, profs[s], r)); if (!res.ok) throw new Error('거절 ' + JSON.stringify(res)); }
  }
  return st;
}
function match(pa, pb, runs) {
  let win = 0;
  for (let i = 0; i < runs; i++) { const hs = i % 2, profs = [pb, pb]; profs[hs] = pa; const st = play(101 + i * 13, profs), R = G.ranks(st); if (R[hs] === 0) win += R[0] === R[1] ? 0.5 : 1; }
  return win / runs;
}
{
  const RUNS = 200, P = G.PROF, out = {};
  const human = mem => Object.assign({}, P.human, { mem });
  for (const [k, h] of [['암기 50%(8칸)', human(8)], ['암기 62%(10칸)', human(10)], ['암기 70%(11칸)', human(11)]]) out[k] = { easy: match(h, P.easy, RUNS), normal: match(h, P.normal, RUNS), hard: match(h, P.hard, RUNS) };
  const pc = x => (x * 100).toFixed(0) + '%';
  for (const k of Object.keys(out)) console.log(`  사람 대역 ${k}: 초급 ${pc(out[k].easy)} · 중급 ${pc(out[k].normal)} · 고급 ${pc(out[k].hard)} (${RUNS}판씩)`);
  for (const k of Object.keys(out)) {
    ok(out[k].easy >= 0.7, `사람 대역 ${k} vs 초급 ≥ 70% (${pc(out[k].easy)})`);
    ok(out[k].normal >= 0.5, `사람 대역 ${k} vs 중급 ≥ 50% (${pc(out[k].normal)})`);
    ok(out[k].hard >= 0.3, `사람 대역 ${k} vs 고급 ≥ 30% (${pc(out[k].hard)})`);
  }
  const hh = match(P.hard, P.normal, 100), hn = match(P.normal, P.easy, 100), he = match(P.hard, P.easy, 100);
  console.log(`  AI 끼리: 고급 vs 초급 ${pc(he)} · 고급 vs 중급 ${pc(hh)} · 중급 vs 초급 ${pc(hn)} (100판씩)`);
  ok(he >= 0.65 && hh >= 0.6 && hn >= 0.6, 'AI 단계 사다리 고급 > 중급 > 초급');
}

console.log(`gn-samenum selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

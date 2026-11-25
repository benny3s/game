// 미스터리 사인 규칙 시험 (node survival/test/gn-mysterysign_selftest.js)
// 방송 경기 화면의 힌트 · 정답(11라운드) 48개를 규칙 식으로 다시 계산해 맞는지 · 단계 흐름(아이템 → 숫자 → 버저 → 정답 → 상대 기회 → 다음 힌트 · 16개 무효) · 점수(더블 · 무감점) ·
// 시크릿(상대 view 에서 숫자 감춤) · 숨은 정보 · 선생님 글 · AI 무작위 판 · 사람 대역이 AI 3단계를 이기는지 보정
'use strict';
const G = require('../games/gn-mysterysign/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const clone = v => JSON.parse(JSON.stringify(v));
const fpOf = st => JSON.stringify(st);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const RV = (id, a, b) => G.ruleVal(G.RULES.findIndex(r => r.id === id), String(a), String(b));
const mk = (cfg, seed) => G.init({ n: 2, seed: seed || 1, cfg: Object.assign({ problems: 'tv', items: 'none', first0: 0 }, cfg) });
const num = (st, seat, n) => G.apply(st, seat, { t: 'num', n: String(n) });
const hint = (st, a, b) => { const f = st.front; const r1 = num(st, f, a); const r2 = num(st, 1 - f, b); return r1.ok && r2.ok; };   // 선(front)이 a (앞), 후가 b (뒤)
const buzz2 = (st, m0, m1) => { G.apply(st, 0, { t: 'buzz', ms: m0 }); return G.apply(st, 1, { t: 'buzz', ms: m1 }); };

// 1) 방송 화면의 힌트 · 정답 — 규칙 식이 방송과 같은가
{
  const T = [
    ['dblsub', 34, 4, 64], ['dblsub', 22, 7, 37],
    ['sumdiff', 36, 87, 12351], ['sumdiff', 16, 9, 257],
    ['modbig', 51, 5, 1], ['modbig', 1, 51, 0], ['modbig', 4, 19, 3],
    ['dsumprod', 87, 23, 75], ['dsumprod', 14, 81, 45], ['dsumprod', 1, 197652, 30], ['dsumprod', 21, 15, 18],
    ['countsay', 79, '897687543217', '749282615141312111'], ['countsay', '897687543217', 89, '839273615141312111'], ['countsay', '897687543217', '897687543217', '849276625242322212'], ['countsay', 99, '897687543217', '938273615141312111'],
    ['dsumall', 49, 89, 30], ['dsumall', 17, 23, 13],
    ['clock12', 19, 85, 8], ['clock12', 72, 18, 6], ['clock12', 18, 77, 11], ['clock12', 18, 14, 8], ['clock12', 18, 13, 7],
    ['holes', 26, 51, 1], ['holes', 74, 51, 0], ['holes', 51, 52, 0], ['holes', 51, 10, 1], ['holes', 51, 8, 2], ['holes', 1, 51, 0], ['holes', 8, 10, 3],
    ['sumtimesb', 67, 87, 13398], ['sumtimesb', 22, 98, 11760], ['sumtimesb', 78, 1, 79], ['sumtimesb', 2, 95, 9215], ['sumtimesb', 7, 4, 44],
    ['gcd', 16, 62, 2], ['gcd', 16, 25, 1], ['gcd', 16, 23, 1], ['gcd', 16, 26, 2], ['gcd', 66, 16, 2], ['gcd', 16, 65, 1],
    ['primesbetween', 27, 3, 7], ['primesbetween', 27, 4, 7], ['primesbetween', 27, 5, 6], ['primesbetween', 27, 6, 6], ['primesbetween', 27, 7, 5], ['primesbetween', 27, 2, 8],
    ['sqsum', 9, 11, 202], ['sqsum', 3, 5, 34],
  ];
  for (const [id, a, b, e] of T) ok(RV(id, a, b) === String(e), `${id} ${a} ❓ ${b} = ${e} (나온 값 ${RV(id, a, b)})`);
  ok(T.length === 48, '방송 힌트 · 정답 48개');
  const ans = G.TV.map(([a, b], i) => RV(G.RULES[i].id, a, b));
  ok(ans.join() === '37,257,3,18,1341,13,7,3,44,8,8', `방송 11문제의 정답 ${ans}`);
  ok(G.RULES.length === 23 && G.RULES.slice(0, 11).every((r, i) => r.tv === i + 1) && G.RULES.slice(11).every(r => r.tv === 0), '규칙 23가지: 방송 1~11 + 더한 12가지');
  ok(new Set(G.RULES.map(r => r.id)).size === 23 && G.RULES.every(r => r.txt && r.name && r.kind), '규칙 이름 · 설명이 있음');
  // 모든 규칙: 방송 문제 · 무작위 숫자에서 예외 없이 값이 나오고 같은 입력은 같은 값
  const r = mulberry(5);
  for (const rule of G.RULES) for (let k = 0; k < 30; k++) { const a = 1 + Math.floor(r() * 9999999), b = 1 + Math.floor(r() * 9999999), v = G.ruleVal(G.RULES.indexOf(rule), String(a), String(b)); ok(/^-?\d+$/.test(v) && v === G.ruleVal(G.RULES.indexOf(rule), String(a), String(b)), `${rule.id} ${a} ${b} → ${v}`); }
  ok(G.normNum('7') === '7' && G.normNum(25) === '25' && G.normNum('9999999') === '9999999', '힌트 숫자 1 ~ 9999999');
  for (const bad of ['0', '', '-5', '10000000', '007', '1.5', 'abc', ' 5', null, undefined, 1.5, [], NaN, '１２']) ok(G.normNum(bad) === null, `이상한 힌트 숫자 거절 ${JSON.stringify(bad)}`);
  ok(G.normAns('37') === '37' && G.normAns('-12') === '-12' && G.normAns(' 5 ') === '5' && G.normAns('007') === '7' && G.normAns('-0') === '0', '정답 숫자 맞춤');
  for (const bad of ['', 'abc', '1.5', '--3', '12345678901234567890123456789012', null, NaN]) ok(G.normAns(bad) === null, `이상한 정답 거절 ${JSON.stringify(bad)}`);
}

// 2) 단계 흐름 · 점수
{
  const st = mk();
  ok(st.phase === 'pick' && st.round === 1 && G.needs(st).join() === '0' && st.score.join() === '0,0', '아이템이 없으면 바로 숫자 고르기 · 선(0) 먼저');
  const V0 = G.view(st, 0);
  ok(V0.problem.a === '22' && V0.problem.b === '7' && V0.rounds === 11 && V0.maxHints === 16 && V0.hints.length === 0, '1라운드 문제 22 ❓ 7');
  ok(!JSON.stringify(V0).includes('dblsub') && V0.rule === null, '규칙은 view 에 안 실림');
  ok(!G.apply(st, 1, { t: 'num', n: '5' }).ok, '선이 아닌 자리의 숫자 거절');
  const before = fpOf(st);
  for (const bad of ['0', '', 'x', '-3', '10000000', null]) G.apply(st, 0, { t: 'num', n: bad });
  G.apply(st, 0, { t: 'buzz', ms: 1 }); G.apply(st, 0, { t: 'ans', n: '1' }); G.apply(st, 0, { t: 'item', use: [] }); G.apply(st, 0, null);
  ok(fpOf(st) === before, '안 먹은 행동은 st 를 안 바꿈');
  ok(num(st, 0, 34).ok && G.needs(st).join() === '1' && st.phase === 'pick', '선이 숫자를 내면 후 차례');
  ok(G.view(st, 1).pend && G.view(st, 1).pend.n === '34' && G.view(st, 1).pend.s === 0, '후 플레이어는 선이 낸 숫자를 봐요');
  ok(num(st, 1, 4).ok && st.phase === 'buzz' && st.hints.length === 1, '후가 내면 힌트가 열리고 버저');
  const h = G.view(st, 0).hints[0];
  ok(h.a === '34' && h.b === '4' && h.v === '64' && h.f === 0, '힌트 34 ❓ 4 = 64 (앞 = 선의 숫자 · 뒤 = 후의 숫자)');
  ok(G.needs(st).join() === '0,1' && !G.apply(st, 0, { t: 'num', n: '3' }).ok, '버저 단계: 두 자리 모두 · 숫자는 못 냄');
  for (const bad of [NaN, Infinity, '5', null, undefined, '', false]) ok(!G.apply(st, 0, { t: 'buzz', ms: bad }).ok && st.bz[0] === null, `버저 ms ${String(bad)} 거절`);
  ok(G.apply(st, 0, { t: 'buzz', ms: 9000.4 }).ok && st.bz[0] === 9000 && G.view(st, 0).mine && !G.view(st, 1).mine, '내 버저 (정수로 맞춤)');
  ok(!JSON.stringify(G.view(st, 1)).includes('9000'), '상대가 누른 시각은 결정 전엔 안 보임');
  ok(buzz2(st, 9000, 5000).ok && st.phase === 'ans' && st.caller === 1, '시각이 작은 쪽(1)이 정답 기회');
  const bl = G.view(st, 0).log.filter(e => e.k === 'buzz').pop();
  ok(bl && bl.w === 1 && bl.ms.join() === '9000,5000', '버저 기록');
  ok(G.needs(st).join() === '1' && !G.apply(st, 0, { t: 'ans', n: '37' }).ok, '정답은 버저를 이긴 자리만');
  ok(!G.apply(st, 1, { t: 'ans', n: 'abc' }).ok && !G.apply(st, 1, { t: 'pass' }).ok && !G.apply(st, 1, { t: 'ans' }).ok, '이상한 답 · 첫 기회의 넘기기 거절');
  // 오답 → −1 → 상대 기회
  ok(G.apply(st, 1, { t: 'ans', n: '36' }).ok && st.score.join() === '0,-1' && st.phase === 'show' && !st.last.hit && st.last.gain === -1, '틀리면 −1');
  ok(G.view(st, 0).wrong.join() === '36' && G.auto(st) > 0, '틀린 답은 모두에게 공개');
  G.advance(st);
  ok(st.phase === 'ans2' && st.caller === 0 && G.needs(st).join() === '0', '기회가 상대(0)에게');
  ok(G.apply(st, 0, { t: 'ans', n: '37' }).ok && st.score.join() === '1,-1' && st.last.hit && st.last.end, '상대가 맞히면 +1 · 라운드 끝');
  ok(st.hist.length === 1 && st.hist[0].w === 0 && st.hist[0].ans === '37' && st.hist[0].h === 1, '라운드 기록');
  ok(G.view(st, 0).last.rule === 0 && G.view(st, 0).last.ans === '37', '끝난 라운드엔 숨은 규칙이 공개');
  G.advance(st);
  ok(st.round === 2 && st.phase === 'pick' && st.front === 1 && G.view(st, 0).hints.length === 0 && G.view(st, 0).problem.a === '16' && st.score.join() === '1,-1', '2라운드: 선이 바뀌고(1) 새 문제 16 ❓ 9');
  // 힌트마다 선이 번갈아 · 아무도 안 누르면 다음 힌트
  ok(hint(st, 36, 87) && st.phase === 'buzz' && G.view(st, 0).hints[0].v === '12351', '16 ❓ 9 의 힌트 36 ❓ 87 = 12351 (규칙 합 · 차 이어 쓰기)');
  ok(buzz2(st, 99999, 99999).ok && st.phase === 'pick' && st.hintNo === 2 && st.front === 0, '둘 다 안 누르면 다음 힌트 · 선이 바뀜(0)');
  ok(G.view(st, 1).hints.length === 1 && st.bz.every(x => x === null), '힌트는 쌓여요');
  ok(hint(st, 5, 3) && buzz2(st, 70000, 80000).ok && st.phase === 'pick' && st.hintNo === 3 && st.front === 1, '1분(60000ms) 이상은 안 누른 것으로 봄');
  // 동률 · 한쪽만 누름
  ok(hint(st, 2, 2) && buzz2(st, 99999, 4000).ok && st.caller === 1, '한쪽만 누르면 누른 쪽');
  ok(G.apply(st, 1, { t: 'ans', n: '257' }).ok && st.score.join() === '1,0' && st.last.hit && st.last.stage === 1, '첫 기회에 맞히면 라운드 끝 (선 −1 → 0 점)');
  const wins = new Set(); for (let s = 1; s <= 40; s++) { const t = mk({}, s); hint(t, 3, 4); buzz2(t, 900, 900); wins.add(t.caller); }
  ok(wins.size === 2, '동률은 씨앗에 따라 양쪽이 다 나옴');
  const t1 = mk({}, 11), t2 = mk({}, 11); for (const t of [t1, t2]) { hint(t, 3, 4); buzz2(t, 900, 900); }
  ok(t1.caller === t2.caller, '같은 씨앗이면 같은 결과');
  // 상대 기회에서 넘기기 (감점 없음) → 다음 힌트
  const p = mk({}, 3); hint(p, 3, 4); buzz2(p, 100, 200); G.apply(p, 0, { t: 'ans', n: '1' }); G.advance(p);
  ok(p.phase === 'ans2' && G.apply(p, 1, { t: 'pass' }).ok && p.phase === 'pick' && p.hintNo === 2 && p.score.join() === '-1,0', '기회를 넘기면 감점 없이 다음 힌트');
  // 시간 안에 못 씀 = 오답 처리
  const q = mk({}, 3); hint(q, 3, 4); buzz2(q, 100, 200);
  ok(G.apply(q, 0, { t: 'timeout' }).ok && q.score.join() === '-1,0' && q.last.tmo && q.wrong.length === 0, '시간 초과 = 답 없이 −1 (틀린 답 목록엔 안 올라감)');
  G.advance(q); ok(G.apply(q, 1, { t: 'timeout' }).ok && q.score.join() === '-1,0' && q.phase === 'pick' && q.hintNo === 2, '상대 기회에서 시간이 지나면 넘긴 것과 같아요 (감점 없음 · 다음 힌트)');
  // 16개 무효
  const v = mk({}, 9); let g = 0;
  for (let i = 0; i < 16; i++) { ok(v.phase === 'pick' && v.hintNo === i + 1, `${i + 1}번째 힌트`); hint(v, 5 + i, 3); buzz2(v, 99999, 99999); }
  ok(v.phase === 'show' && v.last.void && v.last.end && v.hist[0].w === -1 && v.hist[0].h === 16 && v.score.join() === '0,0', '힌트 16개를 다 열어도 아무도 못 맞히면 무효 (점수 없음)');
  G.advance(v); ok(v.round === 2 && v.hintNo === 1, '다음 문제로');
}

// 3) 아이템: 더블 스코어 · 무감점 · 시크릿
{
  const a = mk({ items: 'eq' }, 5);
  ok(a.phase === 'item' && G.needs(a).join() === '0,1', '아이템이 있으면 라운드 시작에 먼저 고름 (두 자리)');
  ok(!G.apply(a, 0, { t: 'item', use: ['nope'] }).ok && !G.apply(a, 0, { t: 'item', use: 'double' }).ok && !G.apply(a, 0, { t: 'num', n: '3' }).ok, '이상한 아이템 거절');
  const itBefore = JSON.stringify(G.view(a, 1).items), pubBefore = G.view(a, 1).pub, c1 = clone(a), c2 = clone(a);
  ok(G.apply(a, 0, { t: 'item', use: ['double', 'double', 'safe'] }).ok && G.needs(a).join() === '1' && a.ri.double[0] === 1 && a.ri.safe[0] === 1 && a.ri.secret[0] === 0, '더블 · 무감점 사용 (중복은 한 번)');
  ok(G.view(a, 1).ri.double.join() === '0,0' && G.view(a, 0).ri.double.join() === '1,0', '다 고르기 전엔 상대가 뭘 썼는지 안 보임');
  ok(JSON.stringify(G.view(a, 1).items) === itBefore && G.view(a, 1).items[0].double === 1 && G.view(a, 1).items[0].safe === 1, '아이템 수는 둘 다 고른 뒤에 줄어요 — 먼저 고른 쪽의 선택이 상대 view.items 에 안 새요');
  G.apply(c1, 0, { t: 'item', use: ['double'] }); G.apply(c2, 0, { t: 'item', use: ['secret'] });
  ok(G.view(c1, 1).pub === G.view(c2, 1).pub && JSON.stringify(G.view(c1, 1)) === JSON.stringify(G.view(c2, 1)), '먼저 고른 쪽이 무엇을 골랐는지는 상대 view · pub 에 전혀 안 비침');
  ok(G.view(a, 1).pub !== pubBefore && G.view(a, 1).pub === G.view(a, 'all').pub, '누가 골랐는지(결정한 사람 수)는 공개 지문에 반영');
  ok(G.apply(a, 1, { t: 'item', use: [] }).ok && a.phase === 'pick' && G.view(a, 1).ri.double.join() === '1,0' && G.view(a, 1).ri.safe.join() === '1,0' && a.items[0].double === 0 && a.items[0].safe === 0 && a.items[0].secret === 1 && a.items[1].secret === 1, '둘 다 고르면 공개되고 아이템이 줄고 숫자 단계로');
  hint(a, 34, 4); buzz2(a, 100, 200);
  ok(G.apply(a, 0, { t: 'ans', n: '1' }).ok && a.score.join() === '0,0' && a.last.gain === 0 && a.last.safe, '무감점: 틀려도 0점');
  G.advance(a); ok(G.apply(a, 1, { t: 'ans', n: '2' }).ok && a.score.join() === '0,-1', '무감점은 쓴 사람만 (상대 오답은 −1)');
  G.advance(a); hint(a, 5, 6); buzz2(a, 100, 200);
  ok(G.apply(a, 0, { t: 'ans', n: '37' }).ok && a.score.join() === '2,-1' && a.last.mult === 2 && a.hist[0].dbl.join() === '1,0', '더블 스코어: 정답이면 +2');
  G.advance(a);
  ok(a.round === 2 && a.phase === 'item' && G.view(a, 0).items[0].double === 0 && G.view(a, 1).items[1].double === 1, '다음 라운드: 쓴 아이템은 없어짐 · 상대 것은 그대로 (아이템 한 번씩)');
  ok(G.apply(a, 0, { t: 'item', use: ['double'] }).ok === false, '이미 쓴 아이템은 못 씀');
  // 시크릿
  const s = mk({ items: 'eq', sched: [{ rule: 'dblsub', a: 22, b: 7 }, { rule: 'gcd', a: 12, b: 18 }] }, 6);
  G.apply(s, 0, { t: 'item', use: ['secret'] }); G.apply(s, 1, { t: 'item', use: [] });
  num(s, 0, 5551234);
  ok(G.view(s, 1).pend.n === null && G.view(s, 0).pend.n === '5551234' && G.view(s, 'all').pend.n === '5551234' && !JSON.stringify(G.view(s, 1)).includes('5551234'), '시크릿: 선이 낸 숫자를 후가 못 봄');
  num(s, 1, 8);
  const h0 = G.view(s, 0).hints[0], h1 = G.view(s, 1).hints[0], hv = G.view(s, -1).hints[0];
  ok(h0.a === '5551234' && h0.b === '8' && h0.v === String(2 * 5551234 - 8), '시크릿을 쓴 사람은 자기 숫자가 보임');
  ok(h1.a === null && h1.b === '8' && h1.v === h0.v && hv.a === null, '상대와 구경꾼 view 에서는 감춘 숫자가 null · 힌트 값은 보임');
  ok(!JSON.stringify(G.view(s, 1)).includes('5551234') && !JSON.stringify(G.view(s, -1)).includes('5551234') && !JSON.stringify(s.log).includes('5551234'), '감춘 숫자가 상대 view · 공개 기록 어디에도 없음');
  ok(G.view(s, 'all').hints[0].a === '5551234', "'all' 은 다 보임 (구경 · 복기용)");
  ok(G.candInfo(G.view(s, 1), G.ALL).cands.length >= 0 && G.visibleHints(G.view(s, 1)).length === 0, '감춘 힌트는 후보 계산에서 빠져요');
  buzz2(s, 1000, 2000); G.apply(s, 0, { t: 'ans', n: String(2 * 22 - 7) }); G.advance(s);
  ok(s.round === 2 && s.phase === 'item' && G.view(s, 1).hints.length === 0, '시크릿은 그 라운드 첫 힌트에만');
  // 시크릿은 후 플레이어도 쓸 수 있음 (첫 힌트의 뒤 숫자를 감춤) · 두 번째 힌트는 안 감춤
  const t = mk({ items: 'eq' }, 7); G.apply(t, 0, { t: 'item', use: [] }); G.apply(t, 1, { t: 'item', use: ['secret'] });
  num(t, 0, 3); ok(G.view(t, 1).pend.n === '3', '선이 시크릿이 아니면 후는 선의 숫자를 봐요'); num(t, 1, 4444);
  ok(G.view(t, 0).hints[0].b === null && G.view(t, 1).hints[0].b === '4444', '후가 시크릿이면 뒤 숫자가 선의 view 에서 null');
  buzz2(t, 99999, 99999); hint(t, 6, 7); ok(G.view(t, 0).hints[1].a === '6' && G.view(t, 0).hints[1].b === '7', '두 번째 힌트는 안 감춰요');
  // 아이템 분배
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const x = G.init({ n: 2, seed, cfg: {} }), it = x.items, two = it.findIndex(o => o.double && o.safe);
    ok(two >= 0 && it[1 - two].secret === 1 && !it[1 - two].double && !it[1 - two].safe && !it[two].secret, `방송처럼: 한 쪽 더블 + 무감점 · 한 쪽 시크릿 ${JSON.stringify(it)}`);
  }
  const owners = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sd => G.init({ n: 2, seed: sd, cfg: {} }).items.findIndex(o => o.double))); ok(owners.size === 2, '2개를 가진 쪽은 씨앗에 따라 달라요');
  const e = G.init({ n: 2, seed: 4, cfg: { items: 'none' } }); ok(e.phase === 'pick' && e.items.every(o => !o.double && !o.safe && !o.secret), "'없음' 은 아이템 단계 없이 시작");
}

// 4) 끝 · 순위 · 옵션
{
  const st = mk({ rounds: 5 }, 3);
  ok(st.rounds === 5 && G.view(st, 0).rounds === 5, '5라운드 옵션');
  ok(mk({ rounds: 7 }).rounds === 7 && mk({ rounds: 99 }).rounds === 11 && mk({}).rounds === 11, '라운드 수 5 · 7 · 11 (기본 11 = 방송)');
  const win = who => { hint(st, 3, 4); buzz2(st, who === 0 ? 100 : 900, who === 1 ? 100 : 900); const r = G.apply(st, who, { t: 'ans', n: G.view(st, 'all').rule.ans }); G.advance(st); return r; };
  for (let i = 0; i < 4; i++) { ok(win(0).ok && !G.over(st), `${i + 1}라운드: 0 이 정답`); }
  ok(win(1).ok && G.over(st) && st.phase === 'end' && G.needs(st).length === 0, '마지막 라운드 뒤 끝');
  ok(st.score.join() === '4,1' && G.ranks(st).join() === '0,1' && G.view(st, 0).ranks.join() === '0,1' && st.hist.length === 5, '4 : 1 · 순위');
  const d = mk({ rounds: 5 }, 3); for (let i = 0; i < 5; i++) { hint(d, 3, 4); buzz2(d, 99999, 99999); for (let k = 1; k < 16; k++) { hint(d, 3, 4); buzz2(d, 99999, 99999); } G.advance(d); }
  ok(G.over(d) && G.ranks(d).join() === '0,0' && d.score.join() === '0,0', '동점이면 비겨요 (순위 0,0)');
  // 새 문제: 규칙이 겹치지 않고 문제가 어울려요
  const nw = G.init({ n: 2, seed: 77, cfg: { problems: 'new', items: 'none' } }), ids = nw.sched.map(s => s.rule);
  ok(new Set(ids).size === 11 && nw.sched.every(s => s.a !== s.b && +s.a >= 2 && +s.b <= 31), '새 문제: 규칙 11가지가 안 겹치고 숫자는 2~31');
  const nw2 = G.init({ n: 2, seed: 78, cfg: { problems: 'new', items: 'none' } }); ok(nw.sched.map(s => s.rule).join() !== nw2.sched.map(s => s.rule).join(), '새 문제는 씨앗마다 달라요');
  const tv = G.init({ n: 2, seed: 5, cfg: {} }); ok(tv.sched.map((s, i) => s.rule === i).every(Boolean) && tv.sched.map(s => s.a + '/' + s.b).join() === '22/7,16/9,4/19,21/15,11/14,17/23,18/13,8/10,7/4,16/24,27/2', "'방송 그대로' = 방송 문제 11개 · 순서 그대로");
}

// 5) 숨은 정보
{
  const st = mk({ items: 'eq', sched: [{ rule: 'dblsub', a: 22, b: 7 }, { rule: 'gcd', a: 9876543, b: 8765432 }, { rule: 'holes', a: 7654321, b: 6543210 }] }, 21);
  G.apply(st, 0, { t: 'item', use: [] }); G.apply(st, 1, { t: 'item', use: [] });
  hint(st, 34, 4);
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all'), vs = G.view(st, -1);
  ok(v0.pub === v1.pub && v1.pub === va.pub && va.pub === vs.pub, '공개 지문은 모두 같다');
  ok(v0.rule === null && v1.rule === null && vs.rule === null && va.rule && va.rule.id === 'dblsub' && va.rule.ans === '37', "view(st,'all') 만 숨은 규칙을 보여줌");
  ok(![v0, v1, vs].some(v => /dblsub|8765432|9876543|7654321|6543210/.test(JSON.stringify(v))), '숨은 규칙 · 다음 라운드 문제가 view 에 안 실림');
  ok(v0.kn && v0.kn.length === 23 && v1.kn.length === 23 && vs.kn === null && va.kn === null && v0.kn.join() !== v1.kn.join(), '규칙 지식 순서(kn)는 자기 것만');
  ok(v0.rd && v0.rd.length > 40 && JSON.stringify(v0.rd) !== JSON.stringify(v1.rd) && vs.rd === null && va.rd === null, 'rd 는 자기 것만');
  ok(JSON.stringify(v0.plan) !== undefined && vs.plan === null && va.plan === null, '아이템 계획은 자기 것만');
  // 상대 규칙 지식 · 난수 · 숨은 규칙의 답 · 다음 라운드 문제 · 숨은 규칙 번호를 바꿔도 그 자리 view 는 같다
  const alt = clone(st); alt.kn[1] = alt.kn[1].slice().reverse(); alt.rd[1] = alt.rd[1].map(x => 1 - x); alt.plan[1] = { double: 1, safe: 1, secret: 1 }; alt.sched[1] = { rule: 0, a: '3', b: '5' }; alt.sched[2] = { rule: 5, a: '6', b: '7' }; alt.cur.ans = '123456'; alt.cur.rule = 3;
  ok(JSON.stringify(G.view(alt, 0)) === JSON.stringify(v0), '상대의 지식 · 난수 · 계획 · 숨은 답 · 다음 문제를 바꿔도 내 view 가 같다');
  const fp0 = fpOf(st); const vx = G.view(st, 0); vx.hints[0].v = 'zz'; vx.score[0] = 99; vx.items[0].double = 9; vx.kn.reverse(); vx.log.push({}); vx.hist.push({}); ok(fpOf(st) === fp0, 'view 를 고쳐도 st 가 안 바뀜');
  const w = clone(v0); const wc = JSON.stringify(G.ai(w, 0, 'hard', Math.random)); ok(JSON.stringify(w) === JSON.stringify(v0), 'ai 가 view 를 안 바꿈');
}

// 6) 선생님 글 · 숨은 정보를 바꿔도 같고, 시점이 달라도 같다
{
  const names = ['나', '삐약'];
  let n = 0;
  for (let k = 0; k < 14; k++) {
    const seed = 300 + k, st = G.init({ n: 2, seed, cfg: { problems: k % 2 ? 'new' : 'tv', rounds: 5 } }), r = mulberry(seed);
    for (let steps = 0; steps < 400 && !G.over(st); steps++) {
      const need = G.needs(st);
      for (const s of [0, 1]) {
        const alt = clone(st); alt.kn = alt.kn.map(a => a.slice().reverse()); alt.rd = alt.rd.map(a => a.map(x => 1 - x)); alt.plan = alt.plan.map(() => ({ double: 1, safe: 1, secret: 1 }));
        for (let q = alt.round; q < alt.sched.length; q++) alt.sched[q] = { rule: 0, a: '2', b: '3' };
        alt.cur.rule = (alt.cur.rule + 1) % 23;
        if (st.phase !== 'show') alt.cur.ans = '987654321';        // 정답이 공개된 show 단계는 last.ans 가 이미 공개 정보
        const c1 = G.coach(G.view(st, s), s, -1, names), c2 = G.coach(G.view(alt, s), s, -1, names);
        ok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 숨은 규칙 · 지식 · 난수 · 다음 문제에 따라 바뀜 (자리 ${s}, ${st.phase})`);
        ok(c1.opp && c1.mine && c1.rec && c1.why !== undefined && !/undefined|NaN|null|\[object/.test(JSON.stringify(c1)), `선생님 글 이상 ${JSON.stringify(c1)}`);
        const sc = G.coach(G.view(st, -1), -1, -1, names); ok(!/undefined|NaN|null|\[object/.test(JSON.stringify(sc)), '구경꾼 시점 선생님 글');
        n++;
      }
      if (need.length) { const seat = need[Math.floor(r() * need.length)], V = G.view(st, seat); G.apply(st, seat, G.ai(V, seat, ['easy', 'normal', 'hard'][Math.floor(r() * 3)], r)); } else G.advance(st);
    }
    const fin = G.coach(G.view(st, 0), 0, -1, names);
    ok(fin.rec && !/undefined|NaN/.test(JSON.stringify(fin)), '끝난 판 선생님 글');
  }
  ok(n > 300, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번`);
  // 추천: 후보가 하나로 모이면 '지금 버저' + 그 답 / 숫자 단계는 숫자를 추천 / 후보 수는 숫자 근거
  const st = mk({ sched: [{ rule: 'dblsub', a: 22, b: 7 }] }, 1); hint(st, 34, 4);
  const c = G.coach(G.view(st, 0), 0, -1, names), I = G.candInfo(G.view(st, 0), G.ALL);
  ok(/후보 규칙 \d+가지/.test(c.mine) && I.cands.length >= 1, `선생님이 후보 규칙 수를 숫자로 알려줌: ${c.mine}`);
  const st2 = mk({ sched: [{ rule: 'dblsub', a: 22, b: 7 }] }, 1); hint(st2, 34, 4); buzz2(st2, 100, 99999); G.apply(st2, 0, { t: 'ans', n: '36' });
  G.advance(st2); const c2 = G.coach(G.view(st2, 1), 1, -1, names); ok(/36/.test(c2.opp + c2.mine + c2.why) && c2.rec.length > 4, '틀린 답이 선생님 글에 반영: ' + c2.opp);
  const st3 = mk({}, 1); const c3 = G.coach(G.view(st3, 0), 0, -1, names); ok(/\d/.test(c3.rec) && /앞|뒤/.test(c3.rec), '숫자 단계: 추천 숫자와 위치 ' + c3.rec);
  // 추천 숫자로 낸 힌트 뒤 후보는 처음보다 줄어요
  const st4 = mk({}, 1); const rec4 = G.bestNum(G.view(st4, 0), 0, G.ALL, [0.31, 0.62, 0.13]); num(st4, 0, +rec4.n); const rec4b = G.bestNum(G.view(st4, 1), 1, G.ALL, [0.31, 0.62, 0.13]); num(st4, 1, +rec4b.n);
  const I4 = G.candInfo(G.view(st4, 0), G.ALL); ok(I4.cands.length < 23 && I4.cands.length >= 1 && I4.cands.includes(0), `추천 숫자 ${rec4.n} · ${rec4b.n} 로 낸 힌트 뒤 후보 ${I4.cands.length}가지 (처음 23) · 진짜 규칙은 남아 있음`);
}

// 7) AI 끼리 무작위 판 — 합법 수만 두고, 끝까지 가고, 같은 씨앗이면 같다
for (const tier of ['easy', 'normal', 'hard']) {
  let bad = 0, games = 0, rounds = 0, hints = 0, voids = 0, wins = [0, 0];
  for (let s = 1; s <= 40; s++) {
    const st = G.init({ n: 2, seed: s * 7919, cfg: { problems: s % 2 ? 'tv' : 'new', rounds: s % 3 === 0 ? 5 : s % 3 === 1 ? 7 : 11, items: ['tv', 'eq', 'none'][s % 3] } });
    const r = mulberry(s); let guard = 0;
    while (!G.over(st) && guard++ < 20000) {
      const need = G.needs(st);
      if (!need.length) { ok(G.auto(st) != null, '멈춤 없음'); G.advance(st); continue; }
      for (const seat of need) {
        if (!G.needs(st).includes(seat)) continue;
        const a = G.ai(G.view(st, seat), seat, seat ? tier : 'normal', r), res = G.apply(st, seat, a);
        if (!res.ok) { bad++; console.error('거절', JSON.stringify(a), res.err, st.phase); G.apply(st, seat, G.legal(st, seat)[0]); }
      }
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    games++; rounds += st.hist.length; for (const h of st.hist) { hints += h.h; if (h.w < 0) voids++; }
    const R = G.ranks(st); if (R[0] !== R[1]) wins[R[0] === 0 ? 0 : 1]++;
    ok(st.hist.length === st.rounds && st.hist.every((h, i) => h.r === i + 1), '라운드 기록이 순서대로');
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${wins[0]} · 좌석1 ${wins[1]} / ${games}판 · 라운드당 힌트 ${(hints / rounds).toFixed(1)}개 · 무효 ${voids}번`);
}
{
  const run = seed => { const st = G.init({ n: 2, seed, cfg: {} }), r = mulberry(seed); let g = 0; while (!G.over(st) && g++ < 20000) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } for (const s of need) { if (G.needs(st).includes(s)) G.apply(st, s, G.ai(G.view(st, s), s, 'hard', r)); } } return fpOf(st); };
  ok(run(31) === run(31), '같은 씨앗 · 같은 AI = 같은 판');
  const fp = fpOf(G.init({ n: 2, seed: 5, cfg: {} })); ok(!/[0-9]n\b/.test(fp) && fp.length > 100, 'st 는 JSON 으로 직렬화돼요 (BigInt 없음)');
  // legal 로 고른 수는 언제나 먹어야 해요
  const st = G.init({ n: 2, seed: 8, cfg: {} }); let g = 0;
  while (!G.over(st) && g++ < 5000) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } const s = need[0], L = G.legal(st, s); ok(L.length > 0 && G.apply(st, s, L[g % L.length]).ok, `legal 수 ${st.phase}`); }
}

// 8) AI 가 사람처럼: 반응 시간 · 안 누름 · 단계가 높을수록 빨라요
{
  const bz = { easy: [], normal: [], hard: [] }, pass = { easy: 0, normal: 0, hard: 0 }, tot = { easy: 0, normal: 0, hard: 0 };
  for (let s = 1; s <= 50; s++) {
    const st = G.init({ n: 2, seed: 5000 + s, cfg: { items: 'none' } }), r = mulberry(s);
    for (let steps = 0; steps < 120 && !G.over(st); steps++) {
      const need = G.needs(st); if (!need.length) { G.advance(st); continue; }
      if (st.phase === 'buzz') for (const tier of ['easy', 'normal', 'hard']) { const a = G.ai(G.view(st, 0), 0, tier, r); tot[tier]++; if (a.ms >= G.NO_BUZZ) pass[tier]++; else { bz[tier].push(a.ms); ok(a.t === 'buzz' && a.ms >= 1500 && a.ms < G.WINDOW, `${tier} 반응은 1.5초 ~ 1분 (${a.ms})`); } }
      for (const seat of need) if (G.needs(st).includes(seat)) G.apply(st, seat, G.ai(G.view(st, seat), seat, 'hard', r));
    }
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log(`  AI 버저 반응 평균(눌렀을 때): 초급 ${(avg(bz.easy) / 1000).toFixed(1)}초 · 중급 ${(avg(bz.normal) / 1000).toFixed(1)}초 · 고급 ${(avg(bz.hard) / 1000).toFixed(1)}초 · 안 누른 비율 ${['easy', 'normal', 'hard'].map(t => Math.round(pass[t] / tot[t] * 100) + '%').join(' / ')}`);
  ok(avg(bz.easy) > avg(bz.normal) && avg(bz.normal) > avg(bz.hard), '단계가 높을수록 빨라요');
  ok(pass.easy / tot.easy >= pass.hard / tot.hard, '초급이 더 자주 못 눌러요');
}

// 9) 사람 대역 보정 (규칙 19가지쯤 떠올리고 힌트 셋 이상 본 뒤 확실할 때만 누르고 10~38초) — 같은 씨앗을 자리만 바꿔 N판
function play(seed, profs, cfg) {
  const st = G.init({ n: 2, seed, cfg: cfg || {} }), r = mulberry(seed ^ 0x9e3779b9); let g = 0;
  while (!G.over(st) && g++ < 30000) {
    const need = G.needs(st);
    if (!need.length) { G.advance(st); continue; }
    for (const s of need) { if (!G.needs(st).includes(s)) continue; const res = G.apply(st, s, G.aiWith(G.view(st, s), s, profs[s], r)); if (!res.ok) throw new Error('거절 ' + JSON.stringify(res)); }
  }
  return st;
}
function match(pa, pb, runs, cfg) {
  let win = 0;
  for (let i = 0; i < runs; i++) { const hs = i % 2, profs = [pb, pb]; profs[hs] = pa; const st = play(101 + i * 13, profs, cfg), R = G.ranks(st); if (R[hs] === 0) win += R[0] === R[1] ? 0.5 : 1; }
  return win / runs;
}
{
  const RUNS = 150, P = G.PROF, pc = x => (x * 100).toFixed(0) + '%', out = {};
  const human = k => Object.assign({}, P.human, { K: k });
  for (const [k, h] of [['규칙 17가지', human(17)], ['규칙 19가지', human(19)], ['규칙 21가지', human(21)]]) out[k] = { easy: match(h, P.easy, RUNS), normal: match(h, P.normal, RUNS), hard: match(h, P.hard, RUNS) };
  for (const k of Object.keys(out)) console.log(`  사람 대역 ${k}: 초급 ${pc(out[k].easy)} · 중급 ${pc(out[k].normal)} · 고급 ${pc(out[k].hard)} (${RUNS}판씩)`);
  for (const k of Object.keys(out)) {
    ok(out[k].easy >= 0.7, `사람 대역 ${k} vs 초급 ≥ 70% (${pc(out[k].easy)})`);
    ok(out[k].normal >= 0.45, `사람 대역 ${k} vs 중급 ≥ 45% (${pc(out[k].normal)})`);
  }
  ok(out['규칙 21가지'].hard >= 0.15, `사람 대역(규칙 21가지) vs 고급 ≥ 15% (${pc(out['규칙 21가지'].hard)})`);
  const hh = match(P.hard, P.normal, 100), hn = match(P.normal, P.easy, 100), he = match(P.hard, P.easy, 100);
  console.log(`  AI 끼리: 고급 vs 초급 ${pc(he)} · 고급 vs 중급 ${pc(hh)} · 중급 vs 초급 ${pc(hn)} (100판씩)`);
  ok(he >= 0.65 && hh >= 0.6 && hn >= 0.6, 'AI 단계 사다리 고급 > 중급 > 초급');
}

console.log(`gn-mysterysign selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// 4인 3목 규칙 시험 (node survival/test/four3_selftest.js [--quick])
'use strict';
const C = require('../games/four3/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cell = s => 'ABCD'.indexOf(s[0]) + (+s[1] - 1) * 4;
const P = (s, k) => ({ t: 'place', cell: cell(s), k: k || 1 }), M = (a, b) => ({ t: 'move', from: cell(a), to: cell(b) }), PASS = { t: 'pass' };
// 장면: 판(칸 → 아래부터 색) · 손 말 · 지금 차례
function scene({ n = 4, bd = {}, hand, ti = 0, round = 1, pc }) {
  const st = C.init({ n, seed: 1 });
  st.round = round; st.order = C.orderOf(n, round); st.ti = ti;
  st.bd = Array.from({ length: 16 }, () => []); for (const k in bd) st.bd[cell(k)] = bd[k].slice();
  st.hand = hand ? hand.slice() : Array(n).fill(5); if (pc) st.pc = pc.slice();
  return st;
}
function playAI(seed, tiers, cfg) {
  const st = C.init({ n: tiers.length, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 3000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    const s = nd[0], a = C.ai(C.view(st, s), s, tiers[s], r), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 판 · 줄 · 이웃 · 순서
{
  ok(C.LINES.length === 24, '3목 줄 24개 (가로 8 · 세로 8 · 대각선 8)');
  ok(C.NB[0].length === 3 && C.NB[5].length === 8 && C.NB[3].length === 3 && C.NB[1].length === 5, '이웃: 꼭짓점 3 · 가장자리 5 · 가운데 8');
  ok(C.cellName(0) === 'A1' && C.cellName(15) === 'D4' && C.cellName(6) === 'C2', '칸 이름 A1~D4');
  ok(J(C.orderOf(4, 1)) === '[0,1,2,3]' && J(C.orderOf(4, 2)) === '[2,3,0,1]' && J(C.orderOf(4, 3)) === '[3,0,1,2]' && J(C.orderOf(4, 4)) === '[1,2,3,0]', '4명 순서 = 방송 ABCD · CDAB · DABC · BCDA');
  ok(J(C.orderOf(3, 2)) === '[1,2,0]' && J(C.orderOf(2, 2)) === '[1,0]', '2 · 3명은 한 칸씩 돌림');
}

// 2) 처음 상태
{
  const st = C.init({ n: 4, seed: 9 });
  ok(st.round === 1 && st.phase === 'play' && J(st.hand) === '[5,5,5,5]' && st.bd.every(s => !s.length) && J(C.needs(st)) === '[0]', '1라운드 · 빈 판 · 말 5개씩 · 빨강부터');
  ok(C.init({ n: 9, seed: 1 }).n === 4 && C.init({ n: 1, seed: 1 }).n === 2, '2~4명');
  ok(st.R === 4 && st.opt.timer === 0 && C.init({ n: 4, seed: 1, cfg: { rounds: 2, timer: 90 } }).R === 2, '라운드 옵션');
}

// 3) 새 말 놓기 · 3층 · 말 수
{
  const st = scene({});
  ok(C.apply(st, 0, P('B2', 3)).ok && J(st.bd[cell('B2')]) === '[0,0,0]' && st.hand[0] === 2, '한 칸에 새 말 3개');
  ok(!C.apply(st, 1, P('B2', 1)).ok, '3층 칸엔 못 놓음');
  ok(!C.apply(st, 1, P('C2', 4)).ok && !C.apply(st, 1, { t: 'place', cell: cell('C2'), k: 0 }).ok && !C.apply(st, 1, { t: 'place', cell: 16, k: 1 }).ok, '1~3개 · 칸 범위');
  ok(C.apply(st, 1, P('C2', 2)).ok && !C.apply(st, 2, P('C2', 2)).ok && C.apply(st, 2, P('C2', 1)).ok && J(st.bd[cell('C2')]) === '[1,1,2]', '남의 말 위에도 놓음 · 3층 넘게는 안 됨');
  ok(!C.apply(st, 2, P('A1')).ok && !C.apply(st, 0, P('A1')).ok, '차례 아닌 사람은 못 둠');
  const s2 = scene({ hand: [1, 5, 5, 5] });
  ok(!C.apply(s2, 0, P('A1', 2)).ok && C.apply(s2, 0, P('A1', 1)).ok && s2.hand[0] === 0, '남은 말보다 많이는 못 놓음');
  ok(C.legal(s2, 1).length > 0 && C.legal(s2, 0).length === 0, '후보는 차례인 사람만');
}

// 4) 말 옮기기
{
  const st = scene({ bd: { B2: [1, 0], C3: [2, 2, 2], A1: [3] } });
  ok(!C.apply(st, 0, M('A1', 'B1')).ok, '남의 말은 못 옮김');
  ok(!C.apply(st, 0, M('B2', 'D4')).ok, '이웃 8칸으로만');
  ok(!C.apply(st, 0, M('B2', 'C3')).ok, '3층 칸으로는 못 옮김');
  ok(C.apply(st, 0, M('B2', 'A1')).ok && J(st.bd[cell('B2')]) === '[1]' && J(st.bd[cell('A1')]) === '[3,0]' && st.hand[0] === 5, '맨 위 내 말 1개 옮김 (남의 말 위로도) · 손 말은 그대로');
  const s2 = scene({ bd: { B2: [0, 1] } });
  ok(!C.apply(s2, 0, M('B2', 'B1')).ok, '밑에 깔린 내 말은 못 옮김');
}

// 5) 3목 · 동시 3목 · 드러난 3목
{
  let st = scene({ bd: { A1: [0], B2: [0] } });
  ok(C.apply(st, 0, P('C3')).ok && st.phase === 'roundend' && J(st.rw.w) === '[0]' && st.pc[0] === 3 && st.wins[0] === 1, '대각선 3목 → 라운드 승리 · 피스 3');
  ok(C.auto(st) === 3600 && !C.needs(st).length && !C.apply(st, 1, P('A2')).ok, '라운드 결과를 잠깐 보여 줌');
  st = scene({ bd: { A1: [1], B1: [1], C1: [1, 3], B2: [0], C2: [0], D2: [0, 3] }, ti: 3 });
  // 파랑이 C1 → D1 으로 옮기면 C1 의 노랑이 드러나 노랑 3목 (파랑은 3목 아님)
  ok(C.apply(st, 3, M('C1', 'D1')).ok && J(st.rw.w) === '[1]' && st.pc[1] === 3 && st.pc[3] === 0, '옮기다 드러난 남의 3목 → 그 사람 승리');
  // 빨강이 C2 → C1: 빨강 A1 · B1 · C1 가로 + 드러난 노랑 A2 · B2 · C2 가로 = 동시 3목
  st = scene({ bd: { A1: [0], B1: [0], C2: [1, 0], A2: [1], B2: [1] } });
  ok(C.apply(st, 0, M('C2', 'C1')).ok && st.phase === 'roundend' && J(st.rw.w) === '[0,1]' && st.rw.why === 'multi' && st.pc[0] === 0 && st.pc[1] === 0, '동시 3목 → 아무도 못 받음 ' + J(st.rw));
  ok(C.winnersOf(Array(16).fill(-1)).length === 0, '빈 판 승자 없음');
}

// 6) 넘기기 · 모두 넘김 · 80수
{
  let st = scene({});
  for (let i = 0; i < 3; i++) C.apply(st, st.order[st.ti], PASS);
  ok(st.phase === 'play' && st.passes === 3, '세 명 넘김 → 아직');
  C.apply(st, st.order[st.ti], PASS);
  ok(st.phase === 'roundend' && st.rw.why === 'pass' && J(st.rw.w) === '[]', '모두 연달아 넘기면 승자 없음');
  st = scene({});
  C.apply(st, 0, PASS); C.apply(st, 1, P('A1')); C.apply(st, 2, PASS);
  ok(st.passes === 1 && st.phase === 'play', '넘김 사이에 둔 수가 있으면 다시 셈');
  st = scene({ n: 2, hand: [0, 0], bd: { A1: [0], D4: [1] } });
  let g = 0; while (st.phase === 'play' && g++ < 200) { const s = st.order[st.ti], a = s === 0 ? (st.bd[cell('A1')].length ? M('A1', 'B1') : M('B1', 'A1')) : (st.bd[cell('D4')].length ? M('D4', 'C4') : M('C4', 'D4')); if (!C.apply(st, s, a).ok) break; }
  ok(st.phase === 'roundend' && st.rw.why === 'cap' && st.moves === C.CAP, `${C.CAP}수가 넘으면 승자 없음`);
}

// 7) 라운드 · 끝 · 순위
{
  const st = scene({ bd: { A1: [0], B2: [0] } });
  C.apply(st, 0, P('C3')); C.advance(st);
  ok(st.round === 2 && st.phase === 'play' && st.bd.every(s => !s.length) && J(st.hand) === '[5,5,5,5]' && J(st.order) === '[2,3,0,1]' && J(C.needs(st)) === '[2]', '2라운드: 새 판 · 말 5개 · 초록부터');
  st.pc = [3, 3, 0, 6]; st.round = 4; st.phase = 'roundend'; st.rw = { w: [], why: 'pass' };
  C.advance(st);
  ok(st.over && J(st.res.w) === '[3]' && J(C.ranks(st)) === '[1,1,3,0]' && C.auto(st) === null, '4라운드 뒤 피스 순 · 같으면 같은 순위');
  const s2 = C.init({ n: 4, seed: 2 }); s2.pc = [3, 3, 0, 0]; s2.round = 4; s2.phase = 'roundend'; s2.rw = { w: [], why: 'pass' }; C.advance(s2);
  ok(J(s2.res.w) === '[0,1]' && J(C.ranks(s2)) === '[0,0,2,2]', '공동 1등');
}

// 8) 보기 · 같은 씨앗 · 상태 안 바뀜
{
  const st = C.init({ n: 4, seed: 5 }); C.apply(st, 0, P('B2', 2));
  const pubs = [0, 1, 2, 3, -1, 'all'].map(s => C.view(st, s).pub);
  ok(new Set(pubs).size === 1, '공개 지문 같음 (숨은 것 없음)');
  const s0 = J(st); [0, 1, 2, 3, -1, 'all'].forEach(s => C.view(st, s)); C.legal(st, 1); C.needs(st);
  const V = C.view(st, 1), v0 = J(V); C.ai(V, 1, 'hard', mul(3)); C.ai(V, 1, 'easy', mul(3)); C.recommend(V, 1); C.threats(V); C.evalAct(V, 1, P('A1'), C.PROF.hard);
  ok(J(st) === s0 && J(V) === v0, '보기 · 후보 · AI 는 상태 · 보기를 안 바꿈');
  ok(!C.apply(st, 1, P('B2', 2)).ok && J(st) === s0, '거절된 행동은 상태를 안 바꿈');
  const a = playAI(77, ['hard', 'normal', 'easy', 'normal']), b = playAI(77, ['hard', 'normal', 'easy', 'normal']);
  ok(J(a.hist) === J(b.hist) && J(a.pc) === J(b.pc), '같은 씨앗 · 같은 AI → 같은 판');
  const R1 = C.recommend(V, 1), R2 = C.recommend(C.view(st, 1), 1);
  ok(R1 && J(R1.a) === J(R2.a) && R1.pw >= 0 && R1.pw <= 1, '추천은 같은 장면이면 같음');
}

// 9) AI: 늘 규칙 안 · 바로 3목은 꼭 · 다음 사람 3목 길은 막음 · 고급이 셈
{
  let bad = 0; const T = ['easy', 'normal', 'hard'];
  for (let s = 0; s < (QUICK ? 6 : 15); s++) { try { const n = 2 + s % 3; playAI(300 + s, Array.from({ length: n }, (_, i) => T[(s + i) % 3])); } catch (e) { bad++; console.error(e.message); } }
  ok(!bad, 'AI 수는 늘 규칙 안 (2 · 3 · 4명)');
  const st = scene({ bd: { A1: [0], B2: [0], D1: [1], D2: [1] } });
  const V = C.view(st, 0);
  ok(['normal', 'hard'].every(t => { const a = C.ai(V, 0, t, mul(5)); return a.t === 'place' && a.cell === cell('C3') || a.t === 'move' && a.to === cell('C3'); }), '보통 · 고급은 바로 3목을 둠');
  // 다음 차례(노랑)가 D3 에 두면 세로 3목 → 고급은 D3 를 막음 (D3 에 3층을 쌓거나 노랑 말을 덮음)
  const s2 = scene({ bd: { D1: [1], D2: [1], A4: [0] } });
  const V2 = C.view(s2, 0), a2 = C.ai(V2, 0, 'hard', mul(8));
  const b2 = V2.bd.map(x => x.slice()), h2 = V2.hand.slice();
  C.apply(s2, 0, a2);
  ok(s2.phase === 'play' && !C.winMoves(s2.bd.map(x => x.slice()), s2.hand.slice(), 1, true).length, '고급은 다음 사람 3목 길을 막음 ' + J(a2));
  void b2; void h2;
  let w = 0, pr = 0; const games = QUICK ? 24 : 60;
  for (let i = 0; i < games; i++) {
    const h = i % 4, t = ['easy', 'easy', 'easy', 'easy']; t[h] = 'hard';
    const s = playAI(500 + i, t), rk = C.ranks(s), top = rk.filter(x => x === 0).length;
    if (rk[h] === 0) w += 1 / top;
    let p = 0; for (let j = 0; j < 4; j++) if (j !== h) p += rk[j] > rk[h] ? 1 : rk[j] === rk[h] ? 0.5 : 0; pr += p / 3;
  }
  ok(pr / games >= 0.75, `고급 1 · 쉬움 3: 1등 ${(w / games * 100).toFixed(0)}% · 상대 이김 ${(pr / games * 100).toFixed(0)}% (75% 이상)`);
}

// 10) 화면 글 (Node 안에서)
{
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  window.SVCores = { four3: C }; require('../games/four3/ui.js');
  const U = window.SVUI.four3;
  ok(U && U.name === '4인 3목' && U.min === 2 && U.max === 4 && U.defN === 4 && typeof U.render === 'function', 'UI 등록');
  const tut = U.tutorial();
  ok(tut.length >= 5 && tut.filter(t => t.interactive).length === 1, '1분 규칙: 대화형 한 단계');
  ok(tut.every(t => !/undefined|null|NaN/.test((t.body || '') + (t.boardHtml || ''))), '1분 규칙 글이 깨끗함');
  ok(/목표/.test(tut[0].tag) && /준비물/.test(tut[1].tag) && /진행/.test(tut[2].tag) && /승패/.test(tut[4].tag) && /특수/.test(tut[5].tag), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  const hw = U.howto.join('');
  ok(U.howto.length >= 5 && /4×4/.test(hw) && /3층/.test(hw) && /5개/.test(hw) && /동시 3목/.test(hw) && /4라운드/.test(hw), '규칙 글');
  ok(/6일차/.test(U.src) && /게스트/.test(U.diff) && /넘기기/.test(U.diff), '출처 · 다른 점');
  let bad = 0, n = 0, recs = 0;
  for (const nn of [4, 3, 2]) {
    const st = C.init({ n: nn, seed: 20 + nn, cfg: { rounds: 2 } }), r = mul(nn);
    for (let i = 0; i < 300 && !C.over(st); i++) {
      const need = C.needs(st);
      for (let me = 0; me < nn; me++) {
        if (i % 3 && me !== need[0]) continue;
        const V = C.view(st, me), co = U.coach(V, me, -1);
        const txt = co.opp + co.mine + co.rec + co.why + U.sub(V) + J(U.chip(V, me));
        if (/undefined|null|NaN|\[object|Infinity/.test(txt)) { bad++; if (bad < 3) console.error(txt); }
        if (V.needs.includes(me)) { recs++; if (!/\d/.test(co.why)) { bad++; if (bad < 3) console.error('근거 숫자 없음', co.why); } }
        n++;
      }
      if (!need.length) { C.advance(st); continue; }
      const q = need[0], V = C.view(st, q), a = C.ai(V, q, i % 3 ? 'easy' : 'normal', r);
      const t = U.actText(a, V); if (!t || /undefined/.test(t)) bad++;
      if (i % 4 === 0) { const best = C.recommend(V, q).a, rv = U.review(V, q, a, best); if (!(rv.sev >= 0 && rv.sev <= 100) || /undefined|NaN/.test(rv.why + rv.my + rv.best)) { bad++; if (bad < 3) console.error(J(rv)); } }
      C.apply(st, q, a);
    }
    const res = U.result(C.view(st, 0), 0);
    if (!/1R/.test(res) || /undefined|NaN/.test(res)) { bad++; console.error(res); }
  }
  ok(!bad && n > 60 && recs > 30, `선생님 · 글 깨끗함 (${n}번, 내 차례 ${recs}번)`);
  ok(U.actText(P('B2', 2), null) === 'B2에 새 말 2개' && U.actText(M('A1', 'B2'), null) === 'A1 → B2 옮기기' && U.actText(PASS, null) === '넘기기', '판 없이도 글');
  // 복기: 바로 3목 놓침 · 다음 사람 3목 길 · 드러난 3목
  const s1 = scene({ bd: { A1: [0], B2: [0] } }), V1 = C.view(s1, 0), b1 = C.recommend(V1, 0).a;
  const r1 = U.review(V1, 0, P('D4'), b1);
  ok(r1.sev >= 85 && /바로 3목/.test(r1.why) && /C3/.test(r1.best), '복기: 3목 놓침 ' + r1.sev + ' ' + r1.why);
  const s2 = scene({ bd: { D1: [1], D2: [1], A4: [0] } }), V2 = C.view(s2, 0), b2 = C.recommend(V2, 0).a;
  const r2 = U.review(V2, 0, P('A1'), b2);
  ok(r2.sev >= 70 && /노랑/.test(r2.why), '복기: 다음 사람 3목 길 ' + r2.sev + ' ' + r2.why);
  const s3 = scene({ bd: { A1: [1], B1: [1], C1: [1, 0], D3: [0] } });          // 빨강이 C1 을 옮기면 밑의 노랑이 드러나 노랑 3목
  const V3 = C.view(s3, 0), b3 = C.recommend(V3, 0).a, r3 = U.review(V3, 0, M('C1', 'C2'), b3);
  ok(r3.sev >= 85 && /노랑의 3목이 드러났어요/.test(r3.why), '복기: 옮겨서 남의 3목 ' + r3.sev + ' ' + r3.why);
  const r4 = U.review(V1, 0, b1, b1);
  ok(r4.sev <= 5, '같은 수면 낮음 ' + r4.sev);
  const co = U.coach(V1, 0, -1);
  ok(/C3/.test(co.rec) && /3목/.test(co.rec) && /100%/.test(co.why), '선생님: 바로 3목 ' + co.rec + ' / ' + co.why);
  const co2 = U.coach(V2, 0, -1);
  ok(/노랑/.test(co2.opp) && /D3/.test(co2.opp) && /%/.test(co2.why), '선생님: 상대 3목 길 경고 ' + co2.opp + ' / ' + co2.why);
  const e = playAI(31, ['hard', 'easy', 'easy', 'normal'], { rounds: 2 });
  const res = U.result(C.view(e, 0), 0);
  ok(/(🏆|🤝)/.test(res) && (res.match(/R /g) || []).length === 2, '결과 글: ' + res.replace(/<[^>]+>/g, ' ').slice(0, 140));
}

console.log(`four3 selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

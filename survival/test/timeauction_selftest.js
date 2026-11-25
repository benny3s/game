// 시간 경매 규칙 시험 (node survival/test/timeauction_selftest.js [--quick])
'use strict';
const C = require('../games/timeauction/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const bid = d => ({ t: 'bid', d });
// 한 경매: ds[s] = 쥔 시간 (0.1초) — 저절로 낸 자리는 건너뜀
function round(st, ds) {
  for (let s = 0; s < st.n; s++) if (st.bid[s] == null) { const r = C.apply(st, s, bid(ds[s])); if (!r.ok) throw new Error(`bid ${s} ${ds[s]} ${r.err}`); }
}
const next = st => { if (C.auto(st) != null) C.advance(st); };
function playAI(n, seed, tiers, r) {
  const st = C.init({ n, seed }); let guard = 0;
  while (!C.over(st) && guard++ < 4000) {
    const need = C.needs(st);
    if (!need.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of need) { const a = C.ai(C.view(st, s), s, tiers[s], r); const res = C.apply(st, s, a); if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`); }
  }
  return st;
}

// 1) 시작 · 행동 검사
{
  const st = C.init({ n: 6, seed: 3 });
  ok(st.n === 6 && st.R === 19 && st.round === 1 && st.phase === 'bid', '6명 · 경매 19번 · 1번째 경매부터');
  ok(st.bank.every(b => b === 6000), '모두 10분 = 6000 (0.1초 단위)');
  ok(J(C.needs(st)) === J([0, 1, 2, 3, 4, 5]), '모두 동시에 냄');
  ok(!C.apply(st, 0, bid(-1)).ok && !C.apply(st, 0, bid(1.5)).ok && !C.apply(st, 0, { t: 'x', d: 3 }).ok && !C.apply(st, 0, bid(6001)).ok, '잘못된 행동은 안 먹음');
  ok(C.apply(st, 0, bid(10)).ok && !C.apply(st, 0, bid(20)).ok, '한 번 내면 끝 (두 번 X)');
  ok(C.init({ n: 2, seed: 1 }).n === 3 && C.init({ n: 9, seed: 1 }).n === 8 && C.init({ seed: 1 }).n === 6, '인원 3~8 (기본 6)');
  ok(C.init({ n: 4, seed: 1, cfg: { spd: 4 } }).spd === 4 && C.init({ n: 4, seed: 1, cfg: { spd: 3 } }).spd === 1, '시계 빠르기 1 · 2 · 4 만');
}

// 2) 낙찰 · 유찰 · 아무도 없음 · 진 사람도 시간 잃음
{
  const st = C.init({ n: 4, seed: 5 });
  round(st, [100, 254, 0, 37]);
  ok(st.phase === 'show' && st.res.w === 1 && st.res.t === 254 && !st.res.tie, '가장 오래 쥔 1번 낙찰 (25.4초)');
  ok(J(st.bank) === J([5900, 5746, 6000, 5963]) && J(st.marks) === J([0, 1, 0, 0]), '진 사람도 쥔 시간만큼 잃음 · 포기는 그대로 · 표식 1개');
  ok(C.auto(st) != null, '결과 보여 주고 다음으로'); next(st);
  ok(st.round === 2 && st.phase === 'bid', '2번째 경매');
  round(st, [305, 305, 12, 0]);
  ok(st.res.w === -1 && st.res.tie && st.res.t === 305 && J(st.marks) === J([0, 1, 0, 0]), '0.1초까지 같으면 유찰 — 아무도 표식 없음');
  ok(J(st.bank) === J([5595, 5441, 5988, 5963]), '유찰이어도 쥔 시간은 사라짐');
  next(st); round(st, [0, 0, 0, 0]);
  ok(st.res.w === -1 && !st.res.tie && st.res.t === 0, '아무도 안 누르면 표식 없음');
  next(st); round(st, [1, 0, 0, 0]);
  ok(st.res.w === 0 && st.res.t === 1, '혼자 0.1초만 쥐어도 낙찰');
  // 남은 시간보다 오래 → 다 쓰면 풀림
  next(st); st.bank[2] = 50; round(st, [10, 0, 6000, 0]);
  ok(st.bank[2] === 0 && st.res.w === 2 && st.res.t === 50, '남은 시간을 넘게 쥐면 남은 만큼만 (다 쓰면 버튼이 풀림)');
  next(st);
  ok(st.bid[2] === 0 && !C.needs(st).includes(2), '남은 시간이 0 이면 저절로 포기');
  ok(C.view(st, 0).bid[2] === null && !('bidded' in C.view(st, 0)), '저절로 포기한 것도 남에겐 안 보임');
  const V2 = C.view(st, 2);
  ok(C.legal(st, 2).length === 0 && V2.bank[2] === 0, '0 인 사람은 낼 게 없음');
}

// 3) 끝: 표식 → 남은 시간, 피스 · 탈락 · 추첨
function endScene(marks, bank, seed) {
  const st = C.init({ n: marks.length, seed: seed || 9 });
  st.round = 19; st.marks = marks.slice(); st.bank = bank.slice();
  round(st, Array(marks.length).fill(0));
  return st;
}
{
  let st = endScene([5, 4, 3, 3, 3, 1], [100, 200, 300, 50, 400, 900]);
  ok(st.over && st.phase === 'end' && C.auto(st) == null, '19번째 경매 뒤 끝');
  ok(st.fin.piece === 0 && st.fin.pieceWhy === '' && st.fin.elim === 5 && st.fin.elimWhy === '', '표식 1등 피스 · 꼴찌 탈락 (방송 결과 5·4·3·3·3·1 꼴)');
  ok(J(C.ranks(st)) === J([0, 1, 3, 4, 2, 5]), `등수: 표식 → 남은 시간 (${J(C.ranks(st))})`);
  st = endScene([4, 4, 3, 2, 2, 2], [100, 300, 10, 500, 20, 200]);
  ok(st.fin.piece === 1 && st.fin.pieceWhy === 'time', '1등 표식이 같으면 남은 시간 많은 쪽이 피스');
  ok(st.fin.elim === 4 && st.fin.elimWhy === 'time', '꼴찌 표식이 같으면 남은 시간이 적은 쪽 탈락');
  st = endScene([4, 4, 1, 2], [300, 300, 0, 50]);
  ok(st.fin.piece === -1 && st.fin.pieceWhy === 'tie', '표식 · 남은 시간까지 같으면 피스 없음');
  const rk = C.ranks(st); ok(rk[0] === 0 && rk[1] === 0 && rk[2] === 3, `완전히 같으면 같은 등수 (${J(rk)})`);
  let lot = new Set();
  for (let sd = 1; sd < 40 && lot.size < 2; sd++) { st = endScene([3, 2, 2, 5], [100, 40, 40, 0], sd); ok(st.fin.elimWhy === 'lot' && [1, 2].includes(st.fin.elim), '탈락 후보가 완전히 같으면 추첨'); lot.add(st.fin.elim); }
  ok(lot.size === 2, '추첨은 씨앗에 따라 갈림');
  ok(C.ranks(st)[st.fin.elim] === 3, '탈락은 맨 아래');
}

// 4) 보이는 것 · 숨는 것
{
  const st = C.init({ n: 4, seed: 11 }), pub0 = C.view(st, 0).pub;
  C.apply(st, 1, bid(77));
  ok(C.view(st, 0).pub === pub0, '남이 손을 떼도(냈어도) pub 는 그대로 — 누가 아직 쥐고 있는지 비밀');
  ok(J(C.view(st, 0).needs) === J([0]) && J(C.view(st, 1).needs) === J([]) && J(C.view(st, -1).needs) === J([]) && J(C.view(st, 'all').needs) === J([0, 2, 3]), 'needs 는 나만 (all 만 전부)');
  const V0 = C.view(st, 0), V1 = C.view(st, 1), Vw = C.view(st, -1), Va = C.view(st, 'all');
  ok(V0.bid[1] === null && V1.bid[1] === 77 && Va.bid[1] === 77, '남이 쥔 시간은 안 보임 (나만 · all)');
  ok(V0.bank[1] === null && V0.bank[0] === 6000 && Vw.bank.every(b => b === null), '남의 남은 시간은 안 보임 · 구경꾼은 아무것도');
  ok(V0.pub === V1.pub && V1.pub === Vw.pub && Vw.pub === Va.pub, 'pub 는 자리마다 같음');
  for (let s = 0; s < 4; s++) if (st.bid[s] == null) C.apply(st, s, bid([30, 0, 0, 55][s]));
  const W0 = C.view(st, 0), W2 = C.view(st, 2);
  ok(W0.res.w === 1 && W0.res.t === 77 && W0.res.my === 30 && W0.res.bids === null && W2.res.my === 0, '끝나면 낙찰자 · 낙찰 시간 · 내가 쥔 것만');
  ok(W0.hist[0].bids === null && W0.known[1] === 77 && W0.known[0] === 0, '기록에도 남의 쥔 시간은 없음 · 낙찰로 쓴 시간은 모두 앎');
  ok(!J(W0.log).includes('55') && !J(W0).includes('"d"'), '기록(log)에 남의 쥔 시간이 안 샘');
  const E = endScene([2, 1, 1], [10, 20, 30]), VE = C.view(E, 1);
  ok(VE.bank.every(b => b != null) && VE.hist[0].bids && VE.fin && VE.ranks, '게임이 끝나면 모두 공개');
}

// 5) 결정성 · 안 바꿈 · 끝까지
{
  const tiers = ['hard', 'easy', 'normal', 'easy', 'normal'];
  const a = playAI(5, 21, tiers, mul(5)), b = playAI(5, 21, tiers, mul(5));
  ok(J(a.log) === J(b.log) && J(C.ranks(a)) === J(C.ranks(b)) && J(a.bank) === J(b.bank), '같은 씨앗 · 같은 AI 난수 → 같은 판');
  const st = C.init({ n: 6, seed: 8 }); round(st, [10, 20, 0, 300, 5, 0]); next(st);
  const before = J(st);
  for (let s = 0; s < 6; s++) { const V = C.view(st, s), vb = J(V); C.ai(V, s, 'hard', mul(s)); ok(J(V) === vb, 'ai 는 view 를 안 바꿈 ' + s); C.legal(st, s); C.view(st, 'all'); }
  ok(J(st) === before, 'view · ai · legal 은 판을 안 바꿈');
  let bad = 0; const games = QUICK ? 6 : 18;
  for (let g = 0; g < games; g++) {
    const n = 3 + (g % 6), t = Array.from({ length: n }, (_, i) => ['easy', 'normal', 'hard'][(g + i) % 3]);
    try {
      const s = playAI(n, 100 + g, t, mul(g)), rk = C.ranks(s);
      if (!s.over || s.round !== 19 || s.hist.length !== 19 || s.bank.some(x => x < 0) || rk[s.fin.elim] !== n - 1 || s.marks.reduce((x, y) => x + y, 0) !== s.hist.filter(h => h.w >= 0).length) bad++;
    } catch (e) { bad++; console.error(e.message); }
  }
  ok(bad === 0, `AI 판 ${games}개 (3~8명) 모두 19번 끝까지 · 시간 음수 없음 · 표식 수 맞음`);
}

// 마지막 경매 장면 (4명 · 앞뒤가 맞는 기록): 나 ★2 (남은 300초) · 1번 ★3 · 2번 ★3 (낙찰에 450초씩) · 3번 ★4 (480초)
function lastScene() {
  const st = C.init({ n: 4, seed: 4 }), H = [];
  const add = (w, t, my) => { const b = [my, 0, 0, 0]; if (w > 0) b[w] = t; H.push({ w, t, tie: false, bids: b }); };
  add(0, 300, 300); add(0, 300, 300);
  for (let k = 0; k < 3; k++) { add(1, 1500, 0); add(2, 1500, 0); }
  for (let k = 0; k < 4; k++) add(3, 1200, 600);
  while (H.length < 18) add(-1, 0, 0);
  H.forEach((h, k) => { h.r = k + 1; if (h.w < 0) h.bids = [0, 0, 0, 0]; });
  st.hist = H; st.round = 19; st.marks = [2, 3, 3, 4]; st.bank = [3000, 1500, 1500, 1200];
  st.winR = [[1, 2], [], [], []];
  return st;
}
// 6) AI 실력 · 속도
{
  const bench = (A, B, n, games, seed0) => {
    let beat = 0, tot = 0, tmax = 0;
    for (let g = 0; g < games; g++) {
      const seat = g % n, tiers = Array(n).fill(B); tiers[seat] = A;
      const st = C.init({ n, seed: seed0 + g }), r = mul(seed0 + g);
      while (!C.over(st)) {
        const need = C.needs(st);
        if (!need.length) { C.advance(st); continue; }
        for (const s of need) { const t0 = Date.now(); const a = C.ai(C.view(st, s), s, tiers[s], r); if (s === seat) tmax = Math.max(tmax, Date.now() - t0); C.apply(st, s, a); }
      }
      const rk = C.ranks(st); beat += rk.filter((x, i) => i !== seat && x > rk[seat]).length; tot += n - 1;
    }
    return { p: beat / tot, tmax };
  };
  const g = QUICK ? 12 : 36;
  const hv = bench('hard', 'easy', 6, g, 500), nv = bench('normal', 'easy', 6, QUICK ? 60 : 240, 700), hn = bench('hard', 'normal', 6, QUICK ? 6 : 24, 900);
  console.log(`· 고급 vs 초급 6명 ${(hv.p * 100).toFixed(1)}% · 중급 vs 초급 ${(nv.p * 100).toFixed(1)}% · 고급 vs 중급 ${(hn.p * 100).toFixed(1)}% · 고급 한 수 최대 ${hv.tmax}ms`);
  ok(hv.p >= (QUICK ? 0.6 : 0.68), `고급이 초급보다 확실히 셈 (${(hv.p * 100).toFixed(1)}%)`);
  ok(nv.p >= 0.5, `중급이 초급보다 나음 (${(nv.p * 100).toFixed(1)}%)`);
  ok(hn.p >= (QUICK ? 0.6 : 0.7), `고급이 중급보다 나음 (${(hn.p * 100).toFixed(1)}%)`);
  ok(hv.tmax < 1500, `고급 한 수 1.5초 안 (${hv.tmax}ms)`);
  // 마지막 경매에서 표식 꼴찌면 다 건다 · 혼자 앞서면 시간을 아낀다
  const last = (marks, bank) => { const st = C.init({ n: 4, seed: 4 }); st.round = 19; st.marks = marks; st.bank = bank; for (let k = 0; k < 18; k++) st.hist.push({ r: k + 1, w: k % 4, t: 300, tie: false, bids: [k % 4 === 0 ? 300 : 0, 0, 0, 0] }); return st; };
  let s1 = lastScene(); const a1 = C.ai(C.view(s1, 0), 0, 'hard', mul(3));
  ok(a1.d >= 300, `마지막 경매 꼴찌(★2, 이기면 ★3 동률 · 시간은 내가 많음)면 크게 건다 (${a1.d})`);
  s1 = last([6, 2, 3, 3], [2000, 800, 900, 700]); const a2 = C.ai(C.view(s1, 0), 0, 'hard', mul(3));
  ok(a2.d === 0, `마지막 경매에 혼자 크게 앞서면 포기해 시간을 아낀다 (${a2.d})`);
  const m = C.market(C.view(C.init({ n: 6, seed: 2 }), 0), 0, mul(2), 200);
  ok(m.mx.length === 200 && m.pWin(6000) > 0.9 && m.pWin(0) === 0 && m.none >= 0 && m.none < 1, `남들 최댓값 분포 짐작 (아무도 안 누를 확률 ${(m.none * 100).toFixed(0)}%)`);
}

// 7) 화면 (Node 에서): 선생님 · 행동 글 · 복기 · 결과 · 칩
{
  global.window = { SVCores: { timeauction: C } };
  global.document = { createElement: () => ({}), head: { appendChild() {} } };
  require('../games/timeauction/ui.js');
  const U = global.window.SVUI.timeauction, names = ['나', 'AI1', 'AI2', 'AI3', 'AI4', 'AI5'];
  const st = C.init({ n: 6, seed: 13 });
  let c = U.coach(C.view(st, 0), 0, -1, names);
  ok(/첫 경매/.test(c.opp) && /★0/.test(c.mine) && /(쥐고 떼기|포기)/.test(c.rec) && /%/.test(c.why) && !/undefined|NaN|null/.test(J(c)), `선생님 첫 경매 (${c.rec} / ${c.why})`);
  round(st, [120, 455, 0, 30, 0, 455]); next(st); round(st, [0, 610, 20, 0, 0, 0]); next(st);
  c = U.coach(C.view(st, 0), 0, -1, names);
  ok(/AI1 1:01\.0/.test(c.opp) && /유찰/.test(c.opp) && /시세/.test(c.opp) && !/undefined|NaN/.test(J(c)), `선생님 상대 흐름 (${c.opp})`);
  ok(/내 남은 시간 9:48\.0/.test(c.mine) && /꼴찌|가장 적은/.test(c.mine), `선생님 내 흐름 (${c.mine})`);
  ok(U.actText(bid(0)) === '포기 (안 누름)' && U.actText(bid(1234)) === '123.4초 쥠' && U.actText(null) === '—', '행동 글');
  const Vb = C.view(st, 0), best = C.ai(Vb, 0, 'hard', mul(1));
  const rv0 = U.review(Vb, 0, best, best); ok(rv0.sev === 0, '같은 수 → 복기 0');
  const rv = U.review(Vb, 0, bid(Math.min(6000, Vb.bank[0])), best);
  ok(rv.sev >= 0 && typeof rv.why === 'string' && rv.why.length > 10 && /순위 점수|같은 값/.test(rv.why), `복기 글 (${rv.sev} ${rv.why})`);
  // 마지막 경매에 꼴찌인데 포기 → 크게 아쉬움
  const L = lastScene();
  const VL = C.view(L, 0), rvL = U.review(VL, 0, bid(0), C.ai(VL, 0, 'hard', mul(2)));
  ok(rvL.sev >= 60, `마지막 경매 꼴찌가 포기하면 큰 실수 (${rvL.sev} ${rvL.why})`);
  const E = endScene([5, 4, 3, 3, 3, 1], [100, 200, 300, 50, 400, 900]), VE = C.view(E, 0);
  const res = U.result(VE, 0); ok(/🧩/.test(res) && /❌/.test(res) && /피스/.test(res) && !/undefined|NaN/.test(res), '결과 창');
  ok(U.chip(VE, 0).t.includes('🧩') && U.chip(VE, 5).out && U.chip(C.view(st, 0), 1).t === '★1', '칩');
  ok(U.sub(C.view(st, 0)) === '경매 3/19' && U.sub(VE) === '끝', '부제');
  c = U.coach(VE, 0, -1, names); ok(/피스/.test(c.opp) && /1등/.test(c.mine), '끝난 뒤 선생님');
  ok(U.coach(C.view(st, -1), -1, -1, names).rec === '—', '구경꾼 선생님');
  // 💡 추천 = 고급 AI 의 수 + 시간 예산 (ai 한 번 150ms · 선생님 200ms 안)
  {
    let cmp = 0, bad = 0, mx = 0, cmx = 0;
    for (const sd of [3, 8]) {
      const s2 = C.init({ n: 6, seed: sd }), rr = mul(sd);
      for (let g = 0; g < 8 && !C.over(s2); g++) {
        const need = C.needs(s2); if (!need.length) { if (C.auto(s2) != null) C.advance(s2); else break; continue; }
        const s = need[0], V = C.view(s2, s);
        let t0 = Date.now(); const a = C.ai(V, s, 'hard', U.coachRng(V, s)); mx = Math.max(mx, Date.now() - t0);
        t0 = Date.now(); const cc = U.coach(V, s, -1, names); cmx = Math.max(cmx, Date.now() - t0);
        const want = a.d === 0 ? /^이번엔 포기/ : new RegExp('^' + (a.d / 10).toFixed(1).replace('.', '\.') + '초까지 쥐고 떼기');
        cmp++; if (!want.test(cc.rec)) { bad++; console.error('추천 어긋남', cc.rec, J(a)); }
        for (const q of need) if (C.needs(s2).includes(q)) C.apply(s2, q, C.ai(C.view(s2, q), q, 'normal', rr));
      }
    }
    ok(cmp >= 8 && bad === 0, `💡 추천 = 고급 AI (${cmp}곳 중 어긋남 ${bad})`);
    ok(mx <= 400 && cmx <= 600, `시간 예산 (ai ${mx}ms · 선생님 ${cmx}ms — 느린 PC 여유 포함 기준 400/600)`);
  }
  const T = U.tutorial(); ok(T.length === 6 && T.filter(x => x.interactive).length === 1, '1분 규칙 6쪽 · 직접 해 보기 1쪽');
  ok(U.opts[0].k === 'spd' && U.howto.length >= 7 && /데스룸/.test(U.src), '설명 · 옵션');
}

console.log(`시간 경매 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

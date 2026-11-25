// 베팅 가위바위보 규칙 시험 (node survival/test/gn-betrps_selftest.js)
// 방송 블랙가넷 6화 앞 8판 칩 기록 재현 · 정산(보상 · 베팅 2배 · 환급 · 무승부 베팅 3배) · 칩 0 베팅 불가 · 연장 · 숨은 정보 · AI 무작위 판
'use strict';
const G = require('../games/gn-betrps/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
const W = 1, D = 0, L = -1;
// 한 판을 진행: 선이 role 을 고르고, 승부 쪽 손은 mark 에 대해 result(W/D/L)가 되게, 베팅 쪽은 (kind, n)
const round = (st, role, result, kind, n) => {
  const first = st.first, mark = st.mark;
  const duel = role === 'duel' ? first : 1 - first, better = 1 - duel;
  ap(st, first, { t: 'role', role });
  const h = result === W ? G.beatH(mark) : result === L ? G.loseH(mark) : mark;
  ap(st, duel, { t: 'hand', h });
  if (kind) ap(st, better, { t: 'bet', kind, n });
  const out = st.res; G.advance(st); return out;
};

// 1) 블랙가넷 6화 앞 8판 (김정훈 = 좌석 0, 이종범 = 좌석 1) 칩 기록: 0/1, 0/0, 0/1, 2/2, 1/4, 3/3, 6/6, 9/9
{
  const st = G.init({ n: 2, seed: 4, cfg: { ver: 'b', first: 1, marks: [1, 1, 1, 1, 1, 1, 1, 1] } });
  ok(st.chips[0] === 1 && st.chips[1] === 1 && st.R === 12, '시작 칩 1개씩 · 12판');
  const rec = [[0, 1], [0, 0], [0, 1], [2, 2], [1, 4], [3, 3], [6, 6], [9, 9]];
  // 판별 행동: [role(선 기준), 승부 결과, 베팅 종류, 칩]  (선: 1 → 0 → 1 → 0 → 1 → 0 → 1 → 0)
  const plan = [
    ['duel', L, 'win', 1],   // R1: 이종범이 일부러 짐 → 김정훈 '이긴다' 1칩 실패
    ['duel', L, 'win', 1],   // R2: 김정훈(승부)이 지고 이종범 '이긴다' 실패 (가상 판)
    ['duel', W, 'win', 1],   // R3 (가상): 이종범 승부 승, 보상 1 · 김정훈 칩 0 이라 못 건다 (베팅 불가)
    ['duel', W, 'win', 1],   // R4 (보상 2): 김정훈 승부 승 +2 · 이종범 '이긴다' 적중 +1
    ['duel', W, 'lose', 1],  // R5: 이종범 승부 승 +2 · 김정훈 '진다' 실패 −1
    ['duel', W, 'lose', 1],  // R6: 김정훈 승부 승 +2 · 이종범 '진다' 실패 −1
    ['duel', W, 'win', 3],   // R7 (보상 3): 이종범 승부 승 +3 · 김정훈 '이긴다' 3칩 적중 +3
    ['duel', W, 'win', 3],   // R8: 김정훈 승부 승 +3 · 이종범 '이긴다' 3칩 적중 +3
  ];
  for (let i = 0; i < 8; i++) {
    const p = plan[i], duel = p[0] === 'duel' ? st.first : 1 - st.first, bt = 1 - duel;
    const canBet = st.chips[bt] > 0;
    const out = round(st, p[0], p[1], canBet ? p[2] : null, p[3]);
    ok(out.after[0] === rec[i][0] && out.after[1] === rec[i][1], `R${i + 1}: 김정훈 ${rec[i][0]} / 이종범 ${rec[i][1]} (실제 ${out.after[0]}/${out.after[1]})`);
  }
  ok(st.round === 9, '9판으로 이어짐');
}
// 2) 정산 규칙
{
  const mk = (ver, first, marks) => G.init({ n: 2, seed: 1, cfg: { ver, first, marks: marks || [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } });
  let st = mk('a', 0);
  st.chips = [4, 4];
  let o = round(st, 'duel', W, 'win', 2);       // 좌석 0 승부 승 (+1), 좌석 1 '이긴다' 2칩 적중 → +2
  ok(o.after[0] === 5 && o.after[1] === 6 && o.reward === 1, '승부 승 보상 1 · 베팅 적중은 건 칩만큼 더 (2배 환급)');
  st = mk('a', 0); st.chips = [4, 4];
  o = round(st, 'duel', L, 'win', 3);            // 승부 짐: 보상 없음, '이긴다' 실패 −3
  ok(o.after[0] === 4 && o.after[1] === 1, '승부 져도 잃는 건 없고, 베팅 틀리면 건 칩 상실');
  st = mk('a', 0); st.chips = [4, 4];
  o = round(st, 'duel', D, 'win', 4);            // 비김: 보상 없음, 베팅 환급
  ok(o.after[0] === 4 && o.after[1] === 4 && o.result === 0, '무승부면 승 · 패 베팅은 돌려받음');
  st = mk('a', 0); st.chips = [4, 4];
  ok(!G.apply(st, 0, { t: 'role', role: 'x' }).ok && ap(st, 0, { t: 'role', role: 'bet' }).ok, '역할 선택');
  ok(st.duel === 1 && G.needs(st).sort().join() === '0,1', '선이 베팅을 고르면 상대가 승부 · 둘이 동시에 정함');
  ok(!G.apply(st, 0, { t: 'bet', kind: 'draw', n: 1 }).ok, '그랜드 파이널 판이 아니면 무승부 베팅 거절');
  ok(!G.apply(st, 0, { t: 'bet', kind: 'win', n: 5 }).ok && !G.apply(st, 0, { t: 'bet', kind: 'win', n: 0 }).ok, '칩보다 많이 · 0개 거절');
  ok(!G.apply(st, 1, { t: 'bet', kind: 'win', n: 1 }).ok, '승부 쪽은 베팅 못 함');
  // 판 표
  const A = G.init({ n: 2, seed: 1, cfg: { ver: 'a' } }), B = G.init({ n: 2, seed: 1, cfg: { ver: 'b' } }), Dd = G.init({ n: 2, seed: 1, cfg: { ver: 'd' } });
  ok(A.rewards.join() === '1,1,1,1,2,2,2,2,3,3' && A.R === 10, '블랙가넷 2화: 10판 · 보상 1/2/3');
  ok(B.rewards.join() === '1,1,1,2,2,2,3,3,3,4,4,4' && B.R === 12 && [2, 3, 6, 7, 10, 11].every(r => B.virt[r] !== undefined), '블랙가넷 6화: 12판 · 가상 6판');
  ok(Dd.rewards.join() === '1,1,1,2,2,2,3,3,3,4,4' && Dd.R === 11 && Dd.virt[4] === 0 && Dd.virt[8] === 1 && Dd.drawBet, '그랜드 파이널 3화: 11판 · R4 가위 · R8 바위 · 무승부 베팅');
}
// 3) 무승부 베팅 (그랜드 파이널 판): 맞히면 3배 환급(순이익 2배), 틀리면 상실
{
  const mk = () => { const st = G.init({ n: 2, seed: 2, cfg: { ver: 'd', first: 0, marks: [1, 1, 1] } }); st.chips = [5, 5]; return st; };
  let st = mk(); let o = round(st, 'duel', D, 'draw', 2);
  ok(o.after[1] === 9 && o.after[0] === 5, '비김 적중 +4 (3배 환급)');
  st = mk(); o = round(st, 'duel', W, 'draw', 2);
  ok(o.after[1] === 3 && o.after[0] === 6, '비김 베팅이 틀리면 상실');
}
// 4) 칩 0 베팅 불가 · 칩 0 이어도 승부는 가능
{
  const st = G.init({ n: 2, seed: 3, cfg: { ver: 'a', first: 0, marks: [1, 1, 1, 1] } });
  st.chips = [0, 3];
  ap(st, 0, { t: 'role', role: 'bet' });   // 칩 0 이 베팅 역할 → 지나감, 상대(승부)만 손을 냄
  ok(st.phase === 'play' && G.needs(st).join() === '1', '칩 0 베팅 역할은 지나가고 승부 쪽만 움직임');
  ap(st, 1, { t: 'hand', h: G.beatH(st.mark) });
  ok(st.chips[1] === 4 && st.chips[0] === 0 && st.phase === 'reveal', '승부 승 보상만');
}
// 5) 연장: 같은 칩이면 표식 공개 2판(보상 1) 뒤에도 같으면 무승부
{
  const marks = Array(14).fill(1);
  const st = G.init({ n: 2, seed: 5, cfg: { ver: 'a', first: 0, marks } });
  let n = 0;
  while (!G.over(st) && n++ < 100) {
    const need = G.needs(st);
    if (!need.length) { G.advance(st); continue; }
    const seat = need[0];
    if (st.phase === 'role') ap(st, seat, { t: 'role', role: 'duel' });
    else if (seat === st.duel) ap(st, seat, { t: 'hand', h: st.mark });   // 계속 비김
    else ap(st, seat, { t: 'bet', kind: 'win', n: 1 });
  }
  ok(G.over(st) && st.ot === 2 && st.round === 12, '10판 뒤 연장 2판');
  ok(st.virtual && G.view(st, 0).mark === st.mark, '연장 판은 표식 공개');
  ok(G.ranks(st)[0] === G.ranks(st)[1], '끝까지 같으면 무승부');
}
{
  // 연장 판 보상 1칩, 연장에서 승부가 갈림
  const st = G.init({ n: 2, seed: 6, cfg: { ver: 'a', first: 0, marks: Array(14).fill(1) } });
  let guard = 0;
  while (!(st.round === 11 && st.phase === 'role') && guard++ < 300) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } const seat = need[0]; if (st.phase === 'role') ap(st, seat, { t: 'role', role: 'duel' }); else if (seat === st.duel) ap(st, seat, { t: 'hand', h: st.mark }); else ap(st, seat, { t: 'bet', kind: 'win', n: 1 }); }
  ok(st.round === 11 && st.virtual && G.rewardOf(st, 11) === 1, '11판 = 연장 첫 판, 보상 1');
  ap(st, st.first, { t: 'role', role: 'duel' }); ap(st, st.first, { t: 'hand', h: G.beatH(st.mark) }); ap(st, 1 - st.first, { t: 'bet', kind: 'lose', n: 1 });
  G.advance(st);
  ok(G.over(st), '연장에서 갈리면 끝');
}
// 6) 숨은 정보
{
  const st = G.init({ n: 2, seed: 7, cfg: { ver: 'a', first: 0, marks: [2, 0], hints: [[2, 1], [0, 0]] } });
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all');
  ok(v0.mark === -1 && v1.mark === -1 && va.mark === 2, '증인 표식은 숨김 (구경꾼만 봄)');
  ok(v0.hint === 2 && v1.hint === 1 && va.hint.join() === '2,1', '귀띔은 각자 자기 것만');
  ok(v0.pub === v1.pub && v1.pub === va.pub, '공개 지문 같음');
  ap(st, 0, { t: 'role', role: 'duel' }); ap(st, 0, { t: 'hand', h: 0 });
  const w1 = G.view(st, 1), w0 = G.view(st, 0);
  ok(w1.done[0] === true && w1.done[1] === false && w1.mine === null, '상대가 냈는지만 보이고 내용은 숨김');
  ok(w0.mine && w0.mine.h === 0, '내 선택은 나에게 보임');
  ok(w1.pub !== v1.pub, '낸 사람이 생기면 공개 지문 바뀜');
  ap(st, 1, { t: 'bet', kind: 'lose', n: 1 });
  ok(G.view(st, 0).res && G.view(st, 0).mark === 2, '공개 뒤에는 표식 · 손 · 베팅이 보임');
}
// 선생님 · AI 는 상대 귀띔 · 표식 · 상대 손을 모른다
{
  const mk = (mark, hOpp) => { const st = G.init({ n: 2, seed: 8, cfg: { ver: 'a', first: 0, marks: [mark], hints: [[1, hOpp]] } }); G.apply(st, 0, { t: 'role', role: 'duel' }); return st; };
  const A = mk(0, 2), B = mk(2, 0);
  const ca = G.coach(G.view(A, 0), 0, -1, ['나', '상대']), cb = G.coach(G.view(B, 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(ca) === JSON.stringify(cb) && ca.opp && ca.mine && ca.rec && ca.why, '상대 귀띔 · 표식이 달라도 선생님 글은 같다');
  ok(JSON.stringify(G.ai(G.view(A, 0), 0, 'hard', () => 0.5)) === JSON.stringify(G.ai(G.view(B, 0), 0, 'hard', () => 0.5)), 'AI 도 같은 수');
  const pr = G.myOutcome(G.view(A, 0), 1); ok(Math.abs(pr.win + pr.draw + pr.lose - 1) < 1e-9, '확률 합 1');
  const pd = G.duelOutcome(G.view(A, 1), 1, { d: 0.1, t: 0.1 }); ok(Math.abs(pd.win + pd.draw + pd.lose - 1) < 1e-9, '상대 손 확률 합 1');
}
// 7) AI 끼리 · 합법 수 · 끝까지 · 칩이 음수가 되지 않음
for (const tier of ['easy', 'normal', 'hard']) {
  let w = [0, 0], draws = 0, bad = 0, rounds = 0, wins = 0, bets = 0, deliberate = 0, ot = 0;
  for (let s = 1; s <= 90; s++) {
    const ver = ['a', 'b', 'd'][s % 3];
    const st = G.init({ n: 2, seed: s * 4003, cfg: { ver } });
    const rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    let guard = 0;
    while (!G.over(st) && guard++ < 3000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const seat of need.slice()) {
        if (!G.needs(st).includes(seat)) continue;
        const r = G.apply(st, seat, G.ai(G.view(st, seat), seat, seat ? tier : 'normal', rr));
        if (!r.ok) { bad++; G.apply(st, seat, G.legal(st, seat)[0]); }
      }
      if (st.phase === 'reveal' && st.res) { const R = st.res; if (R.bet) bets++; if (R.result === -1) deliberate++; wins++; }
      ok(st.chips[0] >= 0 && st.chips[1] >= 0, '칩이 음수가 되지 않는다');
    }
    ok(G.over(st), `${tier} ${ver} ${s}: 끝까지 감`);
    rounds += st.round; ot += st.ot;
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else w[R[0] === 0 ? 0 : 1]++;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${w[0]} · 좌석1 ${w[1]} · 무 ${draws} / 90판 · 평균 ${(rounds / 90).toFixed(1)}라운드 · 연장 ${ot}번 · 베팅 ${bets}번 · 승부 패 ${deliberate}번`);
}
console.log(`gn-betrps selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

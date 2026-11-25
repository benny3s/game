// 전략 윷놀이 규칙 시험 (node survival/test/gn-yut_selftest.js)
// 말판 길 계산 · 뒷도 · 지름길 · 업기 · 잡기 · 한 번 더 · 건너뛰기 · 승리 · 비밀 선택(안 새는지) · 안 먹은 행동 · 같은 씨앗 재생 · AI 무작위 판 · 선생님 글
'use strict';
const G = require('../games/gn-yut/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = o => JSON.stringify(o);
const clone = o => JSON.parse(JSON.stringify(o));
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const { HOME, DONE } = G, N = c => G.nodeOf(c), route = c => (c / 20) | 0;

// ── 1) 말판 길 · 지름길 · 뒷도 ──
{
  const f = (c, k) => G.stepFwd(c, k), c3 = f(HOME, 3);
  ok(N(f(HOME, 1)) === 1 && N(f(HOME, 4)) === 4, '집에서 1칸 · 4칸 = 1 · 4번 칸');
  ok(N(f(HOME, 5)) === 5 && route(f(HOME, 5)) === 1, '집에서 모(5칸) = 오른쪽 위 모서리 · 지름길 길');
  ok(N(c3) === 3 && route(c3) === 0, '바깥 길 3번 칸');
  const c5 = f(c3, 2);
  ok(N(c5) === 5 && route(c5) === 1, '3번 칸 + 개 = 모서리에 멈춰 지름길 길');
  ok(N(f(c5, 1)) === 20 && N(f(c5, 2)) === 21, '모서리 + 1 · 2 = 대각선 20 · 21');
  const cc = f(c5, 3);
  ok(N(cc) === 22 && route(cc) === 3, '모서리 + 걸 = 가운데에 멈춤 (도착 쪽 길)');
  ok(N(f(cc, 2)) === 28 && f(cc, 3) === DONE, '가운데 + 2 = 28 · + 3 = 도착');
  ok(N(f(c5, 4)) === 23 && N(f(c5, 5)) === 24, '가운데를 지나가기만 하면 그 대각선을 그대로 (23 · 24)');
  ok(N(f(f(c5, 5), 1)) === 15, '대각선 끝 = 왼쪽 아래 모서리(15)');
  const o4 = f(HOME, 4);
  ok(N(f(o4, 2)) === 6 && route(f(o4, 2)) === 0, '모서리를 지나가기만 하면 바깥 길 그대로');
  const c9 = 8;                                      // 바깥 길 9번 칸
  const c10b = f(c9, 1);
  ok(N(c9) === 9 && N(c10b) === 10 && route(c10b) === 2, '왼쪽 위 모서리에 멈추면 그쪽 지름길 길');
  ok(N(f(c10b, 1)) === 25 && N(f(c10b, 3)) === 22 && route(f(c10b, 3)) === 2, '왼쪽 위 모서리 + 걸 = 가운데 (이 길은 계속 도착 쪽)');
  ok(f(f(c10b, 3), 3) === DONE && N(f(f(c10b, 3), 2)) === 28, '가운데 다음 27 · 28 · 도착');
  const c19 = 18;                                    // 바깥 길 19번 칸
  ok(N(c19) === 19 && f(c19, 1) === DONE, '바깥 19번 칸 + 1 = 도착');
  // 뒷도
  const b = G.stepBack;
  ok(b(f(HOME, 1)) === DONE, '첫 칸의 말 + 뒷도 = 곧바로 도착 (한 바퀴 인정)');
  ok(N(b(c5)) === 4 && route(b(c5)) === 0, '모서리에서 뒷도 = 바깥 4번 칸');
  ok(N(b(f(c5, 1))) === 5 && route(b(f(c5, 1))) === 1, '20번 칸 뒷도 = 모서리(지름길 길)');
  ok(N(b(cc)) === 21, '가운데(도착 쪽 길)에서 뒷도 = 21');
  ok(N(b(f(c10b, 3))) === 26, '가운데(왼쪽 위 길)에서 뒷도 = 26');
  ok(N(b(c10b)) === 9 && route(b(c10b)) === 0, '왼쪽 위 모서리에서 뒷도 = 바깥 9');
  ok(N(b(f(c9, 2))) === 10 && route(b(f(c9, 2))) === 2, '바깥 11번 칸 뒷도 = 왼쪽 위 모서리(지름길 길)');
  ok(N(b(f(f(c5, 5), 1))) === 24, '15번(대각선 도착) 뒷도 = 24');
  ok(N(b(f(cc, 1))) === 22, '27번 뒷도 = 가운데');
  ok(G.dist(HOME) === 20 && G.dist(DONE) === 0 && G.dist(f(HOME, 1)) === 19, '남은 칸 계산');
  ok(G.dist(cc) === 3 && G.dist(c5) === 11 && G.dist(f(HOME, 5)) === 11, '남은 칸 (모서리에서 지름길로 가면 11칸 · 바깥으론 15칸)');
}

// ── 2) 움직이기 · 업기 · 잡기 ──
{
  const T = [0, 1, 1, 0], mk = pc => ({ pc: pc.slice(), team: T, cand: [0, 2], ord: [0, 1, 2, 3], mover: 0 });
  const at = n => (n === 5 ? 24 : n === 10 ? 49 : n - 1);   // 바깥 길 n번 칸 (모서리는 지름길 길)
  const E = Array(8).fill(HOME);
  let pc = E.slice(); pc[0] = at(3); pc[2] = at(6);
  let S = mk(pc), r = G.doMove(S, 0, 0, 3);
  ok(r.cap.length === 1 && r.cap[0] === 2 && S.pc[2] === HOME && N(S.pc[0]) === 6, '상대 말이 있는 칸에 닿으면 잡아서 집으로');
  pc = E.slice(); pc[0] = at(3); pc[2] = at(6); pc[3] = at(6);
  S = mk(pc); r = G.doMove(S, 0, 0, 3);
  ok(r.cap.length === 2 && S.pc[2] === HOME && S.pc[3] === HOME, '업은 상대 말은 같이 잡힘');
  pc = E.slice(); pc[0] = at(3); pc[6] = at(6);
  S = mk(pc); r = G.doMove(S, 0, 0, 3);
  ok(r.cap.length === 0 && r.carry === 0 && N(S.pc[6]) === 6 && N(S.pc[0]) === 6 && S.pc[6] !== HOME, '같은 편의 다른 사람 말은 안 잡고 업지도 않음');
  pc = E.slice(); pc[0] = at(3); pc[1] = at(5);
  S = mk(pc); r = G.doMove(S, 0, 0, 2);
  ok(r.carry === 1 && S.pc[0] === S.pc[1], '같은 사람의 말이 있는 칸에 닿으면 업음');
  S = mk(pc); ok(J(G.legalMoves(S.pc, 0, 2)) === '[0,1]', '업기 전엔 두 말을 고를 수 있음');
  S.pc[1] = S.pc[0]; ok(J(G.legalMoves(S.pc, 0, 2)) === '[0]', '업은 말은 한 덩이라 한 가지만');
  r = G.doMove(S, 0, 0, 3); ok(S.pc[0] === S.pc[1] && N(S.pc[0]) === 6, '업은 말은 같이 움직임');
  ok(J(G.legalMoves(E, 0, 3)) === '[0]', '둘 다 집이면 한 가지만');
  ok(J(G.legalMoves(E, 0, -1)) === '[]', '집에 있는 말은 뒷도로 못 움직임');
  pc = E.slice(); pc[1] = at(1); ok(J(G.legalMoves(pc, 0, -1)) === '[1]', '판 위의 말만 뒷도');
  ok(J(G.legalMoves(pc, 0, 3)) === '[0,1]', '집 말과 판 위 말 둘 다 가능');
  pc[0] = DONE; pc[1] = DONE; ok(J(G.legalMoves(pc, 0, 3)) === '[]' && !G.canPlay(pc, 0), '둘 다 들어온 사람은 못 둠');
  pc = E.slice(); pc[0] = at(1); S = mk(pc); r = G.doMove(S, 0, 0, -1);
  ok(S.pc[0] === DONE && r.done === 1, '첫 칸 말의 뒷도 = 들어옴 (한 바퀴 인정)');
  pc = E.slice(); pc[0] = at(19); S = mk(pc); r = G.doMove(S, 0, 0, 4);
  ok(S.pc[0] === DONE && r.done === 1, '많이 넘쳐도 들어옴');
  // 지름길 위의 상대를 잡는 것 (대각선 칸)
  pc = E.slice(); pc[0] = G.stepFwd(at(3), 2); pc[2] = G.stepFwd(G.stepFwd(at(3), 2), 2);   // 내 말 모서리 · 상대 21번
  S = mk(pc); r = G.doMove(S, 0, 0, 2); ok(r.cap.length === 1 && N(S.pc[0]) === 21, '대각선 칸에서도 잡기');
}

// ── 3) 판 흐름 ──
const stickAll = (st, tf) => { for (let s = 0; s < 4; s++) { const r = G.apply(st, s, { t: 'stick', f: s < tf ? 1 : 0 }); if (!r.ok) return r; } return { ok: true }; };
{
  let st = G.init({ n: 4, seed: 5, cfg: {} });
  ok(st.phase === 'first' && J(G.needs(st)) === '[0]', '처음엔 선 · 후 고르기 (후보 0 이 고름)');
  ok(!G.apply(st, 1, { t: 'first', v: 0 }).ok && !G.apply(st, 0, { t: 'stick', f: 1 }).ok && !G.apply(st, 0, { t: 'first', v: 2 }).ok, '남의 차례 · 엉뚱한 행동 거절');
  ok(G.apply(st, 0, { t: 'first', v: 1 }).ok && st.phase === 'stick' && J(st.ord) === '[2,3,0,1]' && st.mover === 2, '후를 고르면 상대 팀이 먼저 (차례 2 → 3 → 0 → 1)');
  st = G.init({ n: 4, seed: 5, cfg: { first: 0 } });
  ok(st.phase === 'stick' && J(st.ord) === '[0,1,2,3]' && st.mover === 0 && J(G.needs(st)) === '[0,1,2,3]', '선: 0 → 1 → 2 → 3 · 4명이 다 고름');
  ok(G.apply(st, 1, { t: 'stick', f: 1 }).ok && J(G.needs(st)) === '[0,2,3]', '고른 사람은 needs 에서 빠짐');
  const before = J(st);
  ok(!G.apply(st, 1, { t: 'stick', f: 0 }).ok && !G.apply(st, 0, { t: 'stick', f: 2 }).ok && !G.apply(st, 0, { t: 'move', p: 0 }).ok && !G.apply(st, 9, { t: 'stick', f: 1 }).ok && !G.apply(st, 0, null).ok && !G.apply(st, 0, 'x').ok, '두 번 고르기 · 엉뚱한 값 · 없는 자리 거절');
  ok(J(st) === before, '안 먹은 행동은 상태를 안 바꿈');
  // 비밀: 다른 자리의 선택은 모두 고를 때까지 안 보임
  const v0 = G.view(st, 0), v1 = G.view(st, 1), vA = G.view(st, 'all');
  ok(v0.picks[1] === -1 && v1.picks[1] === 1 && vA.picks[1] === 1 && v0.picks[0] === null, '내 선택만 보이고 남의 것은 잠김(-1)');
  ok(!J(v0).includes('"f":1') && v0.log.every(e => e.k !== 'throw'), '기록에도 안 새요');
  ok(v0.pub === v1.pub && v0.pub === vA.pub && v0.pub === G.view(st, -1).pub, '공개 지문은 자리마다 같음');
  G.apply(st, 0, { t: 'stick', f: 0 }); G.apply(st, 2, { t: 'stick', f: 0 }); G.apply(st, 3, { t: 'stick', f: 1 });
  ok(st.phase === 'reveal' && st.res.t === 2 && st.res.n === '개' && st.res.k === 2 && J(G.needs(st)) === '[]' && G.auto(st) > 0, '모두 고르면 합쳐 공개 (앞면 2 = 개)');
  const vr = G.view(st, 0); ok(vr.picks.every(x => x === 0 || x === 1) && vr.res.t === 2, '공개 뒤엔 4명 선택이 다 보임');
  G.advance(st);
  ok(st.phase === 'moved' && N(st.pc[0]) === 2 && st.last.s === 0 && !st.extra, '집 말 둘뿐이면 자동으로 한 가지만 옮김 (개 = 2번 칸)');
  G.advance(st);
  ok(st.phase === 'stick' && st.mover === 1 && st.turn === 2 && st.picks.every(x => x === null), '다음 사람 차례 · 새 던지기');
  { const lg = G.view(st, 2).log, th = lg.find(e => e.k === 'throw'); ok(th && th.t === 2 && J(th.picks) === '[0,1,0,1]', '지난 던지기의 결과 · 선택은 다음 던지기 중에도 기록에 남음 (이미 공개된 것)'); }
}
// 한 번 더 (윷 · 모 · 잡기) · 뒷도 · 건너뛰기
{
  const mk = () => G.init({ n: 4, seed: 6, cfg: { first: 0 } });
  let st = mk(); stickAll(st, 4); G.advance(st);
  ok(st.res.n === '윷' && st.extra && st.phase === 'moved', '윷은 한 번 더');
  G.advance(st); ok(st.mover === 0 && st.phase === 'stick', '한 번 더는 같은 사람이 다시');
  st = mk(); stickAll(st, 0); G.advance(st);
  ok(st.res.n === '모' && N(st.pc[0]) === 5 && route(st.pc[0]) === 1 && st.extra, '모 = 5칸 · 모서리 지름길 · 한 번 더');
  st = mk(); stickAll(st, 1); ok(st.res.n === '뒷도' && st.res.k === -1, '앞면 1 = 뒷도');
  G.advance(st);
  ok(st.phase === 'moved' && st.last.pass === 1 && !st.extra && J(st.pc) === J(Array(8).fill(HOME)), '움직일 말이 없으면 그 차례는 넘어감');
  G.advance(st); ok(st.mover === 1, '넘어간 뒤 다음 사람');
  // 잡으면 한 번 더 (상대 말을 직접 놓고)
  st = mk(); st.pc[0] = G.stepFwd(HOME, 2); st.pc[2] = G.stepFwd(HOME, 4);
  stickAll(st, 2); G.advance(st);
  ok(st.phase === 'move' && J(G.needs(st)) === '[0]' && J(G.legal(st, 0)) === '[{"t":"move","p":0},{"t":"move","p":1}]', '말이 둘 다 움직일 수 있으면 고르기');
  const before = J(st);
  ok(!G.apply(st, 0, { t: 'move', p: 2 }).ok && !G.apply(st, 1, { t: 'move', p: 0 }).ok && !G.apply(st, 0, { t: 'move', p: 'a' }).ok && !G.apply(st, 0, { t: 'stick', f: 1 }).ok && J(st) === before, '엉뚱한 말 · 남의 차례 거절 · 상태 그대로');
  ok(G.apply(st, 0, { t: 'move', p: 0 }).ok && st.pc[2] === HOME && st.extra && st.stat.cap[0] === 1 && st.phase === 'moved', '잡기 = 상대 말 집으로 + 한 번 더');
  G.advance(st); ok(st.mover === 0, '잡은 사람이 한 번 더');
  // 파트너 건너뛰기
  st = mk(); st.pc[2] = DONE; st.pc[3] = DONE;     // 자리 1 (상대 파트너) 의 말 둘이 다 들어옴
  stickAll(st, 2); G.advance(st); G.advance(st);
  ok(st.mover === 2, '말이 다 들어온 파트너(자리 1) 는 차례를 건너뜀 (0 → 2)');
  // 승리: 후보의 말 둘이 들어오면 끝, 파트너가 다 들어오는 건 끝 아님
  st = mk(); st.pc[0] = DONE; st.pc[1] = 17;              // 후보의 첫 말은 들어옴 · 둘째는 바깥 18번 칸
  stickAll(st, 2); G.advance(st);
  ok(G.over(st) && st.win === 0 && st.phase === 'end' && J(G.ranks(st)) === '[0,2,3,1]', '후보(자리 0)의 두 번째 말이 들어오면 승리 · 등수 0 · 승리 팀 파트너(3) 1 · 진 팀 파트너(1) 2 · 진 후보(2) 3 → [0,2,3,1]');
  ok(J(G.needs(st)) === '[]' && !G.apply(st, 0, { t: 'stick', f: 1 }).ok && G.auto(st) === null, '끝난 판에는 행동 없음');
  const vv = G.view(st, 1); ok(vv.over && vv.win === 0 && J(vv.ranks) === '[0,2,3,1]' && vv.score[0] === 2, '끝 view');
  st = mk(); st.pc[6] = DONE; st.pc[7] = DONE; stickAll(st, 3); G.advance(st); G.advance(st);
  ok(!G.over(st) && G.canPlay(st.pc, 3) === false && st.mover !== 3, '파트너의 말 둘이 먼저 들어와도 끝나지 않음');
}
// 뒷도로 한 바퀴를 채우는 승리
{
  const st = G.init({ n: 4, seed: 8, cfg: { first: 0 } });
  st.pc[0] = DONE; st.pc[1] = G.stepFwd(HOME, 1);
  stickAll(st, 1); G.advance(st);
  ok(G.over(st) && st.win === 0, '첫 칸의 마지막 말이 뒷도로 도착하면 승리 (한 바퀴 인정)');
}

// ── 4) 팀 짜기 (mate 1 = 친구랑에서 방장과 두 번째 사람이 한 팀) ──
{
  const st = G.init({ n: 4, seed: 3, cfg: { mate: 1, first: 0 } });
  ok(J(st.team) === '[0,0,1,1]' && J(st.cand) === '[0,2]' && J(st.ord) === '[0,3,2,1]' && st.mover === 0, 'mate 1: 팀 {0,1} 대 {2,3} · 차례 0 → 3 → 2 → 1');
  const S0 = G.init({ n: 4, seed: 3, cfg: { first: 0 } }); ok(J(S0.team) === '[0,1,1,0]' && J(S0.ord) === '[0,1,2,3]', '기본: 팀 {0,3} 대 {1,2} · 차례 0 → 1 → 2 → 3');
  const r = mulberry(4);
  let g = 0; while (!G.over(st) && g++ < 4000) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } for (const s of nd) if (G.needs(st).includes(s)) G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r)); }
  ok(G.over(st) && J(G.ranks(st)).length > 5 && new Set(G.ranks(st)).size === 4, 'mate 1 한 판이 끝까지 감 · 등수 넷 다 다름');
}

// ── 5) AI 무작위 판: 규칙 어김 없음 · 같은 씨앗 재생 · view 가 상태를 안 바꿈 · 공개 지문 · 합법 행동 ──
const TIERS = ['easy', 'normal', 'hard'];
function playGame(seed, tiers, cfg, check) {
  const st = G.init({ n: 4, seed, cfg: cfg || {} }), r = mulberry(seed ^ 0x9e3779b9), acts = [];
  let g = 0, bad = '';
  while (!G.over(st) && g++ < 6000) {
    const nd = G.needs(st);
    if (!nd.length) { if (G.auto(st) == null) { bad = '멈춤 ' + st.phase; break; } acts.push({ adv: 1 }); G.advance(st); if (check) check(st); continue; }
    for (const s of nd) {
      if (!G.needs(st).includes(s)) continue;
      const V = G.view(st, s), snap = J(V);
      const a = G.ai(V, s, tiers[s], r);
      if (J(V) !== snap) bad = 'ai 가 view 를 바꿈';
      const L = G.legal(st, s);
      if (!L.length) bad = 'legal 비어 있음 ' + st.phase;
      if (a == null || !L.some(x => J(x) === J(a))) bad = `ai 수가 legal 이 아님 ${J(a)} / ${J(L)}`;
      const res = G.apply(st, s, a);
      if (!res.ok) { bad = 'AI 가 규칙을 어김 ' + J(a) + ' ' + res.err; break; }
      acts.push({ s, a });
      if (check) check(st);
    }
    if (bad) break;
  }
  return { st, acts, bad, steps: g };
}
function replay(seed, cfg, acts) {
  const st = G.init({ n: 4, seed, cfg: cfg || {} });
  for (const e of acts) { if (e.adv) G.advance(st); else { const r = G.apply(st, e.s, e.a); if (!r.ok) return null; } }
  return st;
}
{
  let games = 0, long = 0, maxThrows = 0, totalThrows = 0;
  for (let i = 0; i < 48; i++) {
    const seed = 100 + i * 31, tiers = [0, 1, 2, 3].map(k => TIERS[(i + k * 5) % 3]);
    const cfg = i % 3 === 0 ? { mate: 1 } : i % 3 === 1 ? { first: 1 } : {};
    const pubs = [];
    const R = playGame(seed, tiers, cfg, st => { const p = [0, 1, 2, 3, -1, 'all'].map(s => G.view(st, s).pub); if (new Set(p).size !== 1) pubs.push(p.join('/')); });
    ok(!R.bad, `AI 판 ${i}: ${R.bad}`);
    ok(G.over(R.st), `AI 판 ${i}: 끝까지 감 (${R.steps} 걸음)`);
    ok(pubs.length === 0, `AI 판 ${i}: 공개 지문이 자리마다 다름 ${pubs[0] || ''}`);
    const R2 = replay(seed, cfg, R.acts);
    ok(R2 && J(R2) === J(R.st), `AI 판 ${i}: 같은 씨앗 + 같은 행동 = 같은 판`);
    ok(new Set(G.ranks(R.st)).size === 4 && G.ranks(R.st).every(x => x >= 0 && x <= 3), `AI 판 ${i}: 등수 0~3 이 하나씩`);
    games++; totalThrows += R.st.stat.throws; maxThrows = Math.max(maxThrows, R.st.stat.throws); if (R.st.stat.throws > 200) long++;
    const w = R.st.win; ok(R.st.pc[R.st.cand[w] * 2] === DONE && R.st.pc[R.st.cand[w] * 2 + 1] === DONE, `AI 판 ${i}: 이긴 팀 후보의 말 둘이 들어옴`);
    ok(R.st.pc[R.st.cand[1 - w] * 2] !== DONE || R.st.pc[R.st.cand[1 - w] * 2 + 1] !== DONE, `AI 판 ${i}: 진 팀 후보는 다 못 들어옴`);
  }
  ok(maxThrows < 400, `가장 긴 판 ${maxThrows}번 던짐 (400 미만)`);
  console.log(`· AI ${games}판: 평균 ${(totalThrows / games).toFixed(1)}번 던짐 · 최대 ${maxThrows}번 · 200번 넘는 판 ${long}`);
}

// ── 6) 비밀 선택이 AI · 선생님에게 안 새는지: 남의 비밀 선택만 다른 두 세계 ──
{
  const base = () => { const st = G.init({ n: 4, seed: 77, cfg: { first: 0 } }); st.pc[0] = G.stepFwd(HOME, 3); st.pc[2] = G.stepFwd(HOME, 6); return st; };
  const A = base(), B = base();
  G.apply(A, 1, { t: 'stick', f: 1 }); G.apply(A, 2, { t: 'stick', f: 0 });
  G.apply(B, 1, { t: 'stick', f: 0 }); G.apply(B, 2, { t: 'stick', f: 1 });
  let same = true;
  for (const s of [0, 3]) {
    const vA = G.view(A, s), vB = G.view(B, s);
    if (J(vA) !== J(vB)) { same = false; console.error('view 가 다름', s); }
    const names = ['나', '민수', '지우', '하나'];
    if (J(G.coach(vA, s, -1, names)) !== J(G.coach(vB, s, -1, names))) { same = false; console.error('선생님 글이 달라짐', s); }
    for (const t of TIERS) if (J(G.ai(vA, s, t, mulberry(5))) !== J(G.ai(vB, s, t, mulberry(5)))) { same = false; console.error('ai 가 달라짐', s, t); }
    if (J(G.stickEval(vA, s, 'hard')) !== J(G.stickEval(vB, s, 'hard'))) { same = false; console.error('stickEval 이 달라짐'); }
  }
  ok(same, '남의 비밀 선택만 다른 두 판: 내 view · 선생님 · AI · 평가가 똑같음 (안 샘)');
  // 공개된 뒤에는 view 가 다름 (정상)
  G.apply(A, 0, { t: 'stick', f: 1 }); G.apply(A, 3, { t: 'stick', f: 1 }); G.apply(B, 0, { t: 'stick', f: 1 }); G.apply(B, 3, { t: 'stick', f: 1 });
  ok(J(G.view(A, 0).picks) !== J(G.view(B, 0).picks), '공개 뒤에는 서로 다른 선택이 보임');
}

// ── 7) 선생님 글 · 복기 글 ──
{
  const names = ['나', '민수', '지우', '하나'];
  ok(G.hasFinal('지민') && !G.hasFinal('민수') && G.hasFinal('1번') && !G.hasFinal('2') && G.hasFinal('3') && !G.hasFinal('AI 하나'), '받침 판별 (지민 O · 민수 X · 1번 O · 2 X · 3 O)');
  let nCoach = 0, bad = 0, cmpN = 0, cmpBad = 0; const seenPh = new Set();
  const st = G.init({ n: 4, seed: 12, cfg: {} }), r = mulberry(12);
  const chk = (s, V) => {
    const c = G.coach(V, s, -1, names); nCoach++;
    const txt = J(c);
    if (!c || ['opp', 'mine', 'rec', 'why'].some(k => typeof c[k] !== 'string') || !c.opp || !c.mine || !c.rec || /undefined|NaN|\[object|null|Infinity/.test(txt) || /<script/i.test(txt)) { bad++; console.error('선생님 글 이상', V.phase, txt.slice(0, 200)); }
    seenPh.add(V.phase + (V.needs.includes(s) ? '-me' : ''));
  };
  let g = 0;
  while (!G.over(st) && g++ < 3000) {
    const nd = G.needs(st);
    if (!nd.length) { for (let s = 0; s < 4; s++) chk(s, G.view(st, s)); G.advance(st); continue; }
    for (const s of nd) {
      if (!G.needs(st).includes(s)) continue;
      const V = G.view(st, s); chk(s, V);
      const a = G.ai(V, s, 'hard', r);
      const t = G.actText(a, V, names); if (typeof t !== 'string' || t.length < 3 || /undefined|NaN/.test(t)) { bad++; console.error('actText 이상', t); }
      const b = G.ai(V, s, 'hard', mulberry(g + s)), c = G.compareActs(V, s, a, b);
      if (c) { cmpN++; if (!Number.isFinite(c.mine) || !Number.isFinite(c.best)) { cmpBad++; console.error('compareActs 이상', J(c).slice(0, 200)); } }
      G.apply(st, s, a);
    }
  }
  for (let s = 0; s < 4; s++) chk(s, G.view(st, s));
  ok(bad === 0 && nCoach > 100, `선생님 · 행동 글 ${nCoach}번 모두 정상`);
  ok(cmpBad === 0 && cmpN > 20, `두 수 견주기 ${cmpN}번 정상`);
  for (const ph of ['first-me', 'stick-me', 'move-me', 'reveal', 'moved', 'end']) ok(seenPh.has(ph) || ph === 'first-me', `선생님이 ${ph} 단계를 다룸`);
  const V0 = G.view(G.init({ n: 4, seed: 1, cfg: {} }), 0), c0 = G.coach(V0, 0, -1, names);
  ok(/선/.test(c0.rec) && /1만 2천 판/.test(c0.why) && /%/.test(c0.why), '선 · 후 단계: 숫자 근거가 있는 추천');
  ok(G.actText({ t: 'stick', f: 1 }) === '앞면 내기' && G.actText({ t: 'first', v: 0 }).includes('선') && G.actText(null) === '—' && G.actText({ t: 'zzz' }) === '—', '행동 글');
}

// ── 8) AI 단계 · 선 · 후 ──
{
  const wins = { easy: 0, hard: 0 }; let n = 0;
  for (let i = 0; i < 80; i++) {
    const hs = i % 4, tiers = Array(4).fill('easy'); tiers[hs] = 'hard';
    const R = playGame(300 + i * 13, tiers, {});
    n++; if (R.st.team[hs] === R.st.win) wins.hard++; else wins.easy++;
  }
  ok(wins.hard / n > 0.7, `고급 한 명(+초급 짝)이 초급 둘을 이긴 비율 ${(wins.hard / n * 100).toFixed(0)}% (70% 넘어야)`);
  console.log(`· 고급 한 명 + 초급 짝 vs 초급 둘: ${(wins.hard / n * 100).toFixed(0)}% (${n}판)`);
  let first = 0, m = 0;
  for (let i = 0; i < 100; i++) {
    const a = playGame(900 + i * 7, Array(4).fill('hard'), { first: 0 }), b = playGame(900 + i * 7, Array(4).fill('hard'), { first: 1 });
    if (a.st.win === 0) first++; if (b.st.win === 1) first++; m += 2;
  }
  ok(first / m > 0.40 && first / m < 0.62, `선(먼저 던지는 쪽) 승률 ${(first / m * 100).toFixed(0)}% — 한쪽으로 크게 쏠리지 않음 (AI 선택 FIRST_PICK=${G.FIRST_PICK}, 큰 표본 1만 2천 판에서 51.6%)`);
  ok(G.FIRST_PICK === 0 && G.ai(G.view(G.init({ n: 4, seed: 1, cfg: {} }), 0), 0, 'hard', Math.random).v === 0, 'AI 는 선을 고름');
}

// ── 9) 상태는 글자로 바꿀 수 있고 view 는 상태를 안 바꿈 ──
{
  const st = G.init({ n: 4, seed: 21, cfg: { first: 0 } });
  const s0 = J(st); G.view(st, 0); G.view(st, 'all'); G.view(st, -1); G.legal(st, 0); G.needs(st);
  ok(J(st) === s0 && J(clone(st)) === s0, 'view · legal · needs 가 상태를 안 바꿈');
  ok(G.ranks(st).every(x => x === 0) && !G.over(st), '끝나기 전 등수는 모두 0');
}
console.log(`전략 윷놀이 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

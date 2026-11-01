/* 원카드 자체 시험 — node game/onecard/test/selftest.js
   규칙 하나하나(손으로 만든 판) · 공격 쌓기 · 특수 카드 · 원카드 외치기 · 파산 · 등수 · 정산(합 0) ·
   결정성(같은 씨앗+같은 입력 = 같은 지문) · 카드 보존 · 보이는 정보만 새는지 · 우리 집 규칙 · 무작위 판 수천 개 ·
   AI 끼리 (오류 없음, 🐣 < 🐱 < 🐯, 같은 판을 자리 돌려 가며) */
'use strict';
const G = require('../core.js');
const AI = require('../ai.js');
const WT = (() => { try { return require('worker_threads'); } catch (e) { return null; } })();
const T0 = Date.now();

// ── AI 대결 (일꾼 스레드에서도 씀): 같은 씨앗 판을 B 자리를 돌려 가며 n 번 → 운을 줄임 ──────────
function playRound(seed, seats, opts, rules) {
  const s = G.create({ players: seats.length, seed, rules });
  const rng = G.makeRng(seed * 31 + 7);
  for (let guard = 0; s.phase !== 'end'; guard++) {
    if (guard > 2000) throw new Error('끝나지 않음');
    let a;
    if (s.phase === 'call') a = AI.race(s, seats, rng).a;
    else {
      const v = G.view(s, s.turn);
      a = AI.choose(v, seats[s.turn], Object.assign({ rng }, opts && opts[seats[s.turn]]));
    }
    if (!G.isLegal(s, a)) throw new Error('AI 가 할 수 없는 행동 ' + a + ' ' + s.phase + ' ' + seats[s.turn]);
    G.apply(s, a, null);
  }
  return s;
}
function duelRange(A, B, n, from, to, opts) {
  const r = { sum: 0, sq: 0, pairs: 0, wins: { [A]: 0, [B]: 0 }, games: 0, err: '' };
  try {
    for (let i = from; i <= to; i++) {
      let x = 0;
      for (let rot = 0; rot < n; rot++) {
        const seats = Array.from({ length: n }, (_, k) => (k === rot ? B : A));
        const s = playRound(7000 + i, seats, opts);
        let others = 0; for (let k = 0; k < n; k++) if (k !== rot) others += G.reward(s, k);
        x += G.reward(s, rot) - others / (n - 1);
        r.wins[seats[s.result.winner]]++; r.games++;
      }
      x /= n; r.sum += x; r.sq += x * x; r.pairs++;
    }
  } catch (e) { r.err = String(e && e.stack || e); }
  return r;
}
if (WT && !WT.isMainThread) {
  const w = WT.workerData;
  WT.parentPort.postMessage(duelRange(w.A, w.B, w.n, w.from, w.to, w.opts));
  return;
}
function duel(A, B, n, pairs, opts) {
  const W = WT ? Math.max(1, Math.min(10, require('os').cpus().length - 2)) : 1;
  const per = Math.ceil(pairs / W), jobs = [];
  for (let w = 0; w < W; w++) {
    const from = 1 + w * per, to = Math.min(pairs, (w + 1) * per);
    if (from > to) continue;
    if (!WT) { jobs.push(Promise.resolve(duelRange(A, B, n, from, to, opts))); continue; }
    jobs.push(new Promise((res, rej) => { const wk = new WT.Worker(__filename, { workerData: { A, B, n, from, to, opts } }); wk.on('message', res); wk.on('error', rej); }));
  }
  return Promise.all(jobs).then(parts => {
    const r = { sum: 0, sq: 0, pairs: 0, wins: { [A]: 0, [B]: 0 }, games: 0, err: '' };
    for (const p of parts) { r.sum += p.sum; r.sq += p.sq; r.pairs += p.pairs; r.games += p.games; r.wins[A] += p.wins[A]; r.wins[B] += p.wins[B]; if (p.err) r.err = p.err; }
    r.edge = r.sum / r.pairs; r.se = Math.sqrt(Math.max(0, r.sq / r.pairs - r.edge * r.edge) / r.pairs);
    return r;
  });
}

// ── 시험 도구 ──────────────────────────────────────────────
let pass = 0, fail = 0;
const section = t => console.log('\n■ ' + t);
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ` (받음 ${JSON.stringify(a)}, 기대 ${JSON.stringify(b)})`);
const throws = (f, m) => { let t = false; try { f(); } catch (e) { t = true; } ok(t, m); };
// 카드 번호: 무늬(0 ♠ 1 ♥ 2 ♦ 3 ♣) × 13 + 숫자(0 A … 12 K)
const C = (su, r) => su * 13 + r;
const S = 0, H = 1, D = 2, CL = 3;
const BJ = G.BJ, CJ = G.CJ;
const P = c => G.A_PLAY + c;
const run = (s, acts) => { let ev = []; for (const a of acts) { const r = G.step(s, a); s = r.state; ev = ev.concat(r.events); } return { s, ev }; };
const total = s => s.deck.length + s.pile.length + s.hands.reduce((a, h) => a + h.length, 0);
const sum = a => a.reduce((x, y) => x + y, 0);

// ────────────────────────────────────────────────────────────
section('카드 구성 · 이름 · 공격 세기');
{
  eq(G.gameCards(1).length, 54, '한 벌 54장');
  eq(G.gameCards(2).length, 108, '두 벌 108장');
  eq([G.suitOf(C(H, 6)), G.rankOf(C(H, 6))], [H, 6], '♥7 무늬·숫자');
  eq([G.suitOf(BJ), G.rankOf(BJ), G.isJoker(BJ), G.isJoker(CJ + 54)], [-1, -1, true, true], '조커는 무늬·숫자 없음');
  eq([G.cardName(0), G.cardName(C(D, 9)), G.cardName(C(CL, 12)), G.cardName(BJ), G.cardName(CJ)], ['♠A', '♦10', '♣K', '흑백 조커', '컬러 조커'], '카드 이름');
  eq([G.isRed(C(H, 3)), G.isRed(C(D, 3)), G.isRed(C(S, 3)), G.isRed(C(CL, 3)), G.isRed(CJ), G.isRed(BJ)], [true, true, false, false, true, false], '빨강 · 검정');
  const R = G.defaultRules();
  eq([G.atkOf(C(H, 1), R), G.atkOf(C(H, 0), R), G.atkOf(C(S, 0), R), G.atkOf(BJ, R), G.atkOf(CJ, R), G.atkOf(C(H, 6), R)], [2, 3, 5, 5, 7, 0], '공격 세기 기본값 (2·A·♠A·흑백·컬러·7)');
  const R2 = G.normRules({ atk2: 3, atkA: 5, atkSA: 7, atkBJ: 7, atkCJ: 10 });
  eq([G.atkOf(C(D, 1), R2), G.atkOf(C(CL, 0), R2), G.atkOf(0, R2), G.atkOf(BJ + 54, R2), G.atkOf(CJ, R2)], [3, 5, 7, 7, 10], '공격 세기 집 규칙');
  eq(G.atkOf(54, R), 5, '두 번째 벌 ♠A 도 5');
}

section('나누기 · 시작 카드 · 선');
{
  for (const n of [2, 3, 4, 5, 6]) {
    const s = G.create({ players: n, seed: 100 + n });
    ok(s.hands.every(h => h.length === 7), `${n}명: 한 사람 7장`);
    eq(total(s), 54, `${n}명: 카드 54장 그대로`);
    ok(!G.isSpecial(s.pile[0]), `${n}명: 시작 카드는 특수 카드가 아님 (${G.cardName(s.pile[0])})`);
    eq([s.suit, s.rank], [G.suitOf(s.pile[0]), G.rankOf(s.pile[0])], `${n}명: 지금 무늬·숫자 = 시작 카드`);
  }
  for (const d of [5, 6, 8]) { const s = G.create({ players: 3, seed: 9, rules: { deal: d } }); ok(s.hands.every(h => h.length === d), `처음 ${d}장씩`); }
  const s7 = G.create({ players: 7, seed: 3 });
  eq([s7.decks, total(s7)], [2, 108], '7명이면 저절로 두 벌');
  const s8 = G.create({ players: 8, seed: 3, rules: { deal: 8 } });
  ok(s8.hands.every(h => h.length === 8) && total(s8) === 108, '8명 · 8장씩 · 두 벌');
  const s2d = G.create({ players: 3, seed: 3, rules: { decks: 2 } });
  eq([s2d.decks, total(s2d)], [2, 108], '규칙으로 두 벌');
  const s6 = G.create({ players: 6, seed: 1, rules: { deal: 8 } });
  ok(s6.hands.every(h => h.length === 7) && s6.deck.length >= 10, '6명·8장이면 더미가 모자라지 않게 7장으로 줄임');
  const sf = G.create({ players: 4, seed: 5, first: 2 });
  eq(sf.turn, 2, '선(first)이 먼저');
  // 시작 카드가 특수면 더미 아래로: 시드 여러 개로
  let bad = 0; for (let i = 0; i < 500; i++) { const s = G.create({ players: 2 + i % 5, seed: i }); if (G.isSpecial(s.pile[0])) bad++; }
  eq(bad, 0, '시작 카드 500판 모두 일반 카드');
  const sorted = G.create({ players: 2, seed: 77 }).hands[0];
  ok(sorted.every((c, i) => i === 0 || G.base(sorted[i - 1]) <= G.base(c)), '손패는 무늬·숫자 순');
}

section('맞춰 내기 (무늬 · 숫자 · 조커 · 먹기)');
{
  let s = G.setup({ hands: [[C(H, 4), C(S, 8), C(D, 8), BJ, CJ, C(CL, 9)], [C(S, 3)]], pile: [C(H, 8)] });
  const L = G.legal(s);
  ok(L.includes(P(C(H, 4))), '같은 무늬 ♥ 낼 수 있음');
  ok(L.includes(P(C(S, 8))) && L.includes(P(C(D, 8))), '같은 숫자 8 낼 수 있음');
  ok(!L.includes(P(C(CL, 9))), '무늬·숫자 다르면 못 냄');
  ok(L.includes(P(CJ)) && !L.includes(P(BJ)), '조커 색 맞추기: ♥ 위엔 컬러 조커만');
  ok(L.includes(G.A_DRAW), '먹기는 늘 됨');
  s = G.setup({ hands: [[BJ, CJ, C(H, 4)], [C(S, 3)]], pile: [C(CL, 8)] });
  ok(G.legal(s).includes(P(BJ)) && !G.legal(s).includes(P(CJ)), '♣ 위엔 흑백 조커만');
  s = G.setup({ hands: [[BJ, CJ, C(H, 4)], [C(S, 3)]], pile: [C(CL, 8)], rules: { jokerPlay: 'any' } });
  ok(G.legal(s).includes(P(BJ)) && G.legal(s).includes(P(CJ)), '조커 아무 때나 (집 규칙)');
  // 먹기: 한 장 받고 차례 넘김
  s = G.setup({ hands: [[C(CL, 9), C(CL, 10)], [C(S, 3), C(S, 4)]], pile: [C(H, 8)], deck: [C(D, 5), C(D, 6)] });
  let r = run(s, [G.A_DRAW]);
  eq([r.s.hands[0].length, r.s.turn, r.s.deck.length], [3, 1, 1], '먹기: 한 장 받고 다음 사람');
  ok(r.ev.some(e => e.t === 'draw' && e.why === 'draw' && e.cards[0] === C(D, 6)), '먹은 카드는 더미 맨 위 (끝)');
  // 조커 위 (공격을 받은 뒤): 아무 카드나
  s = G.setup({ hands: [[C(CL, 9), C(D, 3)], [C(S, 3)]], pile: [C(H, 4), BJ], suit: -1, rank: -1 });
  ok(G.legal(s).includes(P(C(CL, 9))) && G.legal(s).includes(P(C(D, 3))), '조커 위(공격 없음)엔 아무 카드나');
  throws(() => G.apply(G.fastClone(s), P(C(S, 3))), '내 손에 없는 카드는 오류');
}

section('공격 · 받아치기 (쌓기) · 받기');
{
  // 이 묶음은 외치기 창 없이 (외치기는 아래에서 따로)
  const A = o => G.setup(Object.assign({}, o, { rules: Object.assign({ oneCard: false }, o.rules || {}) }));
  // ♥2 → 다음 사람 2장
  let s = A({ players: 3, hands: [[C(H, 1), C(S, 9)], [C(CL, 9), C(CL, 10)], [C(D, 9)]], pile: [C(H, 8)] });
  let r = run(s, [P(C(H, 1))]);
  eq([r.s.atk, r.s.atkStr, r.s.atkKind, r.s.turn], [2, 2, '2', 1], '♥2 공격: 쌓인 2 · 다음 사람 차례');
  ok(r.ev.some(e => e.t === 'attack' && e.total === 2), 'attack 이벤트');
  eq(G.legal(r.s), [G.A_DRAW], '받아칠 카드 없으면 받기만');
  r = run(r.s, [G.A_DRAW]);
  eq([r.s.hands[1].length, r.s.atk, r.s.turn], [4, 0, 2], '2장 받고 차례 넘김 (공격 사라짐)');
  ok(r.ev.some(e => e.t === 'draw' && e.why === 'attack' && e.n === 2), '받기 이벤트 2장');
  // 쌓기: ♥2 → ♥A (3) → 5
  s = A({ players: 3, hands: [[C(H, 1), C(S, 9)], [C(H, 0), C(CL, 10)], [C(D, 9), C(D, 10)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 1)), P(C(H, 0))]);
  eq([r.s.atk, r.s.atkStr, r.s.turn], [5, 3, 2], '♥2 → ♥A 받아치기: 2+3 = 5, 다음 사람');
  ok(r.ev.some(e => e.t === 'counter' && e.total === 5), 'counter 이벤트');
  r = run(r.s, [G.A_DRAW]);
  eq(r.s.hands[2].length, 7, '5장 받음');
  // 같거나 센 것: ♥A(3) 위에 ♥2(2) 못 냄, ♠A(5)는 숫자 같아서 됨
  s = A({ players: 2, hands: [[C(H, 0), C(S, 9)], [C(H, 1), C(S, 0), C(D, 0)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 0))]);
  let L = G.legal(r.s);
  ok(!L.includes(P(C(H, 1))), '같거나 센 것: A(3) 위에 2(2) 못 냄');
  ok(L.includes(P(C(S, 0))) && L.includes(P(C(D, 0))), 'A 위에 ♠A(5)·♦A(3) 됨 (숫자 같음)');
  // 아무 공격 카드
  s.rules = G.normRules({ oneCard: false, counter: 'any' });
  r = run(s, [P(C(H, 0))]);
  ok(G.legal(r.s).includes(P(C(H, 1))), '아무 공격 카드: A 위에 같은 무늬 2 됨');
  // 같은 숫자만
  s.rules = G.normRules({ oneCard: false, counter: 'same' });
  r = run(s, [P(C(H, 0))]);
  L = G.legal(r.s);
  ok(!L.includes(P(C(H, 1))) && L.includes(P(C(S, 0))), '같은 숫자만: A 위엔 A(♠A 포함)만');
  // 못 받아침 (순한 맛)
  s.rules = G.normRules({ oneCard: false, counter: 'off' });
  r = run(s, [P(C(H, 0))]);
  eq(G.legal(r.s), [G.A_DRAW], '쌓기 없음: 공격받으면 받기만');
  // 조커: 흑백(5) 위에 ♠A(5) 됨, ♥A(3) 안 됨, 컬러(7) 됨
  s = A({ players: 2, hands: [[BJ, C(S, 9)], [C(S, 0), C(H, 0), CJ, C(H, 5)]], pile: [C(S, 8)] });
  r = run(s, [P(BJ)]);
  eq([r.s.atk, r.s.suit], [5, -1], '흑백 조커 공격 5 · 무늬 자유');
  L = G.legal(r.s);
  ok(!L.includes(P(C(S, 0))) && L.includes(P(CJ)) && !L.includes(P(C(H, 0))) && !L.includes(P(C(H, 5))), '조커 위: 조커만 받아침 (기본 — 조커는 조커로만)');
  s.rules = G.normRules({ jokerOnly: false, oneCard: false }); r = run(s, [P(BJ)]); L = G.legal(r.s);
  ok(L.includes(P(C(S, 0))) && L.includes(P(CJ)) && !L.includes(P(C(H, 0))), "'조커는 조커로만' 끄면: ♠A(5)·컬러 조커 받아침, ♥A(3) 안 됨");
  r = run(r.s, [P(CJ)]);
  eq(r.s.atk, 12, '흑백 5 + 컬러 7 = 12');
  // 조커 색: ♥2 공격 위에 흑백 조커 안 됨 (색), 컬러 조커 됨
  s = A({ players: 2, hands: [[C(H, 1), C(S, 9)], [BJ, CJ]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 1))]);
  L = G.legal(r.s);
  ok(L.includes(P(CJ)) && !L.includes(P(BJ)), '♥2 공격엔 컬러 조커만 (흑백은 색이 달라서)');
  // 3 으로 2 막기
  s = A({ players: 3, hands: [[C(H, 1), C(S, 9)], [C(H, 2), C(D, 2), C(CL, 10)], [C(D, 9)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 1))]);
  L = G.legal(r.s);
  ok(L.includes(P(C(H, 2))) && !L.includes(P(C(D, 2))), '♥2 공격은 ♥3 으로만 막음');
  r = run(r.s, [P(C(H, 2))]);
  eq([r.s.atk, r.s.turn, r.s.hands[1].length], [0, 2, 2], '막으면 공격 0 · 아무도 안 받고 다음 사람');
  ok(r.ev.some(e => e.t === 'block'), 'block 이벤트');
  s.rules = G.normRules({ oneCard: false, block3: false });
  r = run(s, [P(C(H, 1))]);
  ok(!G.legal(r.s).includes(P(C(H, 2))), '3 막기 끄면 못 막음');
  // '2 공격만' 규칙이면 A 공격은 3 으로 못 막음 (기본은 모든 공격을 막음 — 아래 특수 카드 시험)
  s = A({ players: 2, hands: [[C(H, 0), C(S, 9)], [C(H, 2)]], pile: [C(H, 8)] });
  s.rules = G.normRules({ oneCard: false, block3All: 'two' });
  r = run(s, [P(C(H, 0))]);
  ok(!G.legal(r.s).includes(P(C(H, 2))), "'2 공격만'이면 A 공격은 3 으로 못 막음");
  // 공격 중에는 일반 카드·7·J 못 냄
  s = A({ players: 2, hands: [[C(H, 1), C(S, 9)], [C(H, 6), C(H, 10), C(H, 9)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 1))]);
  eq(G.legal(r.s), [G.A_DRAW], '공격 중엔 7·J·일반 카드 못 냄');
}

section('특수 카드 (J 건너뛰기 · Q 방향 · K 한 번 더 · 7 무늬 바꾸기)');
{
  const pad = h => h.concat([C(S, 4), C(S, 5)]);           // 한 장 남지 않게 (외치기 창 없이)
  const four = (h0, extra) => G.setup(Object.assign({ players: 4, hands: [pad(h0), [C(CL, 3), C(CL, 4)], [C(CL, 5), C(CL, 6)], [C(CL, 7), C(CL, 8)]], pile: [C(H, 8)] }, extra || {}));
  let r = run(four([C(H, 10), C(S, 9)]), [P(C(H, 10))]);
  eq(r.s.turn, 2, 'J: 다음 사람(1) 건너뛰고 2');
  ok(r.ev.some(e => e.t === 'skip' && e.skipped === 1), 'skip 이벤트');
  r = run(four([C(H, 11), C(S, 9)]), [P(C(H, 11))]);
  eq([r.s.dir, r.s.turn], [-1, 3], 'Q: 방향 바뀌고 반대쪽(3)');
  r = run(four([C(H, 12), C(S, 9), C(H, 3)]), [P(C(H, 12))]);
  eq([r.s.turn, r.s.phase], [0, 'play'], 'K: 내가 한 번 더');
  r = run(r.s, [P(C(H, 3))]);
  eq(r.s.turn, 1, 'K 다음 한 장 내면 다음 사람');
  // K 뒤에 낼 게 없으면 먹기
  r = run(four([C(H, 12), C(S, 9), C(S, 3)]), [P(C(H, 12)), G.A_DRAW]);
  eq([r.s.turn, r.s.hands[0].length], [1, 5], 'K 뒤 낼 게 없으면 한 장 먹고 넘김');
  // 7 무늬 바꾸기
  r = run(four([C(H, 6), C(S, 9), C(CL, 9)]), [P(C(H, 6))]);
  eq([r.s.phase, r.s.turn], ['suit', 0], '7: 무늬 고르기 차례');
  eq(G.legal(r.s), [G.A_SUIT, G.A_SUIT + 1, G.A_SUIT + 2, G.A_SUIT + 3], '무늬 네 가지');
  r = run(r.s, [G.A_SUIT + CL]);
  eq([r.s.suit, r.s.rank, r.s.turn, r.s.phase], [CL, G.R_7, 1, 'play'], '♣ 로 바뀌고 다음 사람');
  ok(G.legal(r.s).includes(P(C(CL, 3))), '다음 사람은 ♣ 를 낼 수 있음');
  // 7 이 마지막 카드면 고르지 않고 끝
  let s = G.setup({ players: 3, hands: [[C(H, 6)], [C(CL, 3)], [C(CL, 5)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 6))]);
  eq([r.s.phase, r.s.result && r.s.result.winner], ['end', 0], '7 이 마지막이면 무늬 안 고르고 이김');
  // 둘이서: Q 는 건너뛰기, J 도 내가 또
  const two = h0 => G.setup({ players: 2, hands: [pad(h0), [C(CL, 3), C(CL, 4)]], pile: [C(H, 8)] });
  r = run(two([C(H, 11), C(S, 9)]), [P(C(H, 11))]);
  eq(r.s.turn, 1, '둘이서 Q 기본 = 그냥 상대 차례');
  ok(r.ev.some(e => e.t === 'reverse' && !e.asSkip), 'reverse (asSkip 아님)');
  { const t = two([C(H, 11), C(S, 9)]); t.rules = G.normRules({ qTwo: 'again' });
    r = run(t, [P(C(H, 11))]);
    eq(r.s.turn, 0, "둘이서 Q '한 번 더' = 건너뛰기 (내가 또)"); ok(r.ev.some(e => e.t === 'reverse' && e.asSkip), 'reverse asSkip'); }
  // 3 은 방어 카드: A·조커 공격도 막음 (기본) · '2 공격만'이면 A 는 못 막음 · 조커 공격엔 아무 3
  { const atkA = rules => { const t = G.setup({ players: 2, hands: [pad([C(H, 0), C(S, 9)]), pad([C(H, 2), C(CL, 2)])], pile: [C(H, 8)] }); if (rules) t.rules = G.normRules(rules); return t; };
    r = run(atkA(), [P(C(H, 0))]);
    ok(G.legal(r.s).includes(P(C(H, 2))), '♥A 공격을 ♥3 으로 막을 수 있음 (기본)');
    r = run(r.s, [P(C(H, 2))]);
    eq([r.s.atk, r.ev.some(e => e.t === 'block')], [0, true], '막으면 공격이 사라짐');
    r = run(atkA({ block3All: 'two' }), [P(C(H, 0))]);
    ok(!G.legal(r.s).includes(P(C(H, 2))), "'2 공격만'이면 A 는 3 으로 못 막음");
    const tj = G.setup({ players: 2, hands: [pad([52, C(S, 9)]), pad([C(CL, 2), C(S, 2), C(S, 0), 53])], pile: [C(S, 8)] });
    r = run(tj, [P(52)]);
    ok(!G.legal(r.s).includes(P(C(CL, 2))) && !G.legal(r.s).includes(P(C(S, 2))), '조커 공격은 3 으로 못 막음');
    ok(!G.legal(r.s).includes(P(C(S, 0))), '조커 공격은 ♠A 로 못 받아침 (조커는 조커로만)');
    ok(G.legal(r.s).includes(P(53)), '조커 공격은 조커로 받아침');
    tj.rules = G.normRules({ jokerOnly: false }); }
  r = run(two([C(H, 10), C(S, 9)]), [P(C(H, 10))]);
  eq(r.s.turn, 0, '둘이서 J = 내가 또');
  // 집 규칙으로 끄면 그냥 카드
  const off = { seven: false, jSkip: false, qRev: false, kAgain: false };
  for (const [c, nm] of [[C(H, 6), '7'], [C(H, 10), 'J'], [C(H, 11), 'Q'], [C(H, 12), 'K']]) {
    r = run(four([c, C(S, 9)], { rules: off }), [P(c)]);
    eq([r.s.turn, r.s.dir, r.s.phase], [1, 1, 'play'], `${nm} 끄면 그냥 다음 사람`);
  }
  // 방향이 바뀐 뒤 J
  s = four([C(H, 10), C(S, 9)], { dir: -1 });
  r = run(s, [P(C(H, 10))]);
  eq(r.s.turn, 2, '반대 방향 J: 3 건너뛰고 2');
}

section('☝️ 원카드 외치기 · 벌칙');
{
  const mk = rules => G.setup({ players: 3, hands: [[C(H, 4), C(S, 9)], [C(CL, 3), C(CL, 4)], [C(CL, 5), C(CL, 6)]], pile: [C(H, 8)], deck: [C(D, 4), C(D, 5), C(D, 6)], rules });
  let r = run(mk(), [P(C(H, 4))]);
  eq([r.s.phase, r.s.call && r.s.call.p, r.s.turn], ['call', 0, 0], '한 장 남으면 외치기 창');
  eq(G.legal(r.s).sort((a, b) => a - b), [G.A_CALL, G.A_CATCH + 1, G.A_CATCH + 2, G.A_MISS].sort((a, b) => a - b), '외치기 · 잡기(다른 사람) · 시간 지남');
  let r2 = run(r.s, [G.A_CALL]);
  eq([r2.s.hands[0].length, r2.s.turn, r2.s.phase], [1, 1, 'play'], '제때 외치면 벌칙 없이 다음 사람');
  r2 = run(r.s, [G.A_CATCH + 2]);
  eq([r2.s.hands[0].length, r2.s.turn], [2, 1], '잡히면 1장 먹고 다음 사람');
  ok(r2.ev.some(e => e.t === 'caught' && e.by === 2) && r2.ev.some(e => e.t === 'draw' && e.why === 'penalty'), 'caught 이벤트 · 벌칙 먹기');
  r2 = run(r.s, [G.A_MISS]);
  eq(r2.s.hands[0].length, 2, '시간이 지나도 1장');
  r = run(mk({ callPen: 3 }), [P(C(H, 4)), G.A_MISS]);
  eq(r.s.hands[0].length, 4, '벌칙 3장 (집 규칙)');
  r = run(mk({ oneCard: false }), [P(C(H, 4))]);
  eq([r.s.phase, r.s.turn], ['play', 1], '외치기 끄면 창 없음');
  // K 로 한 장 남으면: 아직 내 차례라 외치기 창 없이 바로 한 번 더 (11-01 — 남이 먼저 잡아 끝내기를 막던 것)
  const s = G.setup({ players: 3, hands: [[C(H, 12), C(H, 3)], [C(CL, 3)], [C(CL, 5)]], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 12))]);
  eq([r.s.turn, r.s.phase], [0, 'play'], 'K 로 한 장 → 외치기 없이 내 차례');
  ok(!G.legal(r.s).includes(G.A_CATCH + 1), '이때 남이 잡을 수 없음');
  r = run(r.s, [P(C(H, 3))]);
  eq([r.s.phase, r.s.result.winner], ['end', 0], '마지막 카드로 이김');
  // 7 로 한 장 남으면: 무늬 고른 다음 외치기
  const s7 = G.setup({ players: 2, hands: [[C(H, 6), C(S, 9)], [C(CL, 3), C(CL, 4)]], pile: [C(H, 8)] });
  r = run(s7, [P(C(H, 6))]);
  eq(r.s.phase, 'suit', '7 → 무늬 먼저');
  r = run(r.s, [G.A_SUIT + S]);
  eq(r.s.phase, 'call', '그다음 외치기');
  // 공격 카드로 한 장 남아도 외치기, 공격은 그대로
  const sa = G.setup({ players: 2, hands: [[C(H, 1), C(S, 9)], [C(CL, 3), C(CL, 4)]], pile: [C(H, 8)] });
  r = run(sa, [P(C(H, 1)), G.A_CALL]);
  eq([r.s.atk, r.s.turn], [2, 1], '공격 + 외치기 뒤 다음 사람이 2장 받을 차례');
}

section('더미 다시 섞기 · 파산');
{
  let s = G.setup({ players: 2, hands: [[C(CL, 9), C(CL, 10)], [C(S, 3), C(S, 4)]], pile: [C(H, 2), C(H, 3), C(H, 4), C(H, 8)], deck: [] });
  let r = run(s, [G.A_DRAW]);
  eq([r.s.pile, r.s.deck.length, r.s.hands[0].length], [[C(H, 8)], 2, 3], '더미가 비면 버린 더미(맨 위만 남김)를 섞어 씀');
  ok(r.ev.some(e => e.t === 'reshuffle' && e.n === 3), 'reshuffle 이벤트');
  // 카드가 아예 없으면 먹기 0장 (그래도 넘어감)
  s = G.setup({ players: 2, hands: [[C(CL, 9)], [C(S, 3)]], pile: [C(H, 8)], deck: [], rules: { oneCard: false } });
  r = run(s, [G.A_DRAW]);
  eq([r.s.hands[0].length, r.s.turn], [1, 1], '먹을 카드가 없으면 그냥 넘어감');
  // 파산: 20장
  const big = Array.from({ length: 18 }, (_, i) => G.gameCards(1).filter(c => G.suitOf(c) === CL || G.suitOf(c) === D)[i]);
  // 0 번이 ♥2 공격 → 1 번(18장)이 2장 받아 20장
  s = G.setup({ players: 3, hands: [[C(H, 1), C(S, 9), C(S, 10)], big, [C(S, 3), C(S, 4)]], pile: [C(H, 8)] });
  const before = total(s);
  r = run(s, [P(C(H, 1)), G.A_DRAW]);
  eq([r.s.out[1], r.s.hands[1].length, r.s.bustAt[1]], [2, 0, 20], '20장이 되면 파산 (손패는 더미로)');
  eq(total(r.s), before, '파산해도 카드 수 그대로');
  eq(r.s.turn, 2, '파산한 사람 다음 사람 차례');
  ok(r.ev.some(e => e.t === 'bust' && e.p === 1), 'bust 이벤트');
  eq(G.nextActive(r.s, 2, 1), 0, '파산한 자리는 건너뜀');
  // 둘 중 하나가 파산하면 끝
  s = G.setup({ players: 2, hands: [[C(H, 1), C(S, 9)], big], pile: [C(H, 8)] });
  r = run(s, [P(C(H, 1)), G.A_CALL, G.A_DRAW]);
  eq([r.s.phase, r.s.result.winner, r.s.result.kind], ['end', 0, 'last'], '둘이서 상대 파산 → 이김');
  eq(r.s.result.pts, [30, -30], '파산 정산: 20장 + 벌금 10장');
  // 파산 끄기
  s = G.setup({ players: 2, hands: [[C(H, 1), C(S, 9)], big], pile: [C(H, 8)], rules: { bust: 0 } });
  r = run(s, [P(C(H, 1)), G.A_CALL, G.A_DRAW]);
  eq([r.s.out[1], r.s.hands[1].length], [0, 20], '파산 없음 규칙');
}

section('끝내기 · 등수 · 정산 (합 0)');
{
  let s = G.setup({ players: 4, hands: [[C(H, 4)], [C(CL, 3), C(CL, 4)], [C(CL, 5), C(CL, 6), C(CL, 7)], [C(D, 7)]], pile: [C(H, 8)] });
  let r = run(s, [P(C(H, 4))]);
  eq([r.s.phase, r.s.result.winner, r.s.result.kind], ['end', 0, 'out'], '다 털면 바로 끝');
  eq(r.s.result.pts, [6, -2, -3, -1], '진 사람은 남은 장수만큼');
  eq(sum(r.s.result.pts), 0, '합 0');
  eq(r.s.result.order, [0, 3, 1, 2], '등수: 이긴 사람 · 남은 장수 적은 순');
  eq(G.pointDeltas(r.s), r.s.result.pts, 'pointDeltas');
  eq([G.reward(r.s, 0), G.reward(r.s, 2)], [6, -3], 'reward');
  // 끝까지 등수
  s = G.setup({ players: 3, hands: [[C(H, 4)], [C(H, 5), C(H, 3)], [C(CL, 5), C(S, 6), C(S, 7)]], pile: [C(H, 8)], rules: { rankAll: true } });
  r = run(s, [P(C(H, 4))]);
  eq([r.s.phase, r.s.out[0], r.s.turn], ['play', 1, 1], '끝까지 등수: 털어도 계속 · 다음 사람');
  ok(r.ev.some(e => e.t === 'out' && e.place === 1), 'out 이벤트 1등');
  r = run(r.s, [P(C(H, 5)), G.A_CALL]);
  eq(r.s.turn, 2, '털고 나간 자리는 건너뜀');
  r = run(r.s, [G.A_DRAW, P(C(H, 3))]);
  eq([r.s.phase, r.s.result.order, r.s.result.kind], ['end', [0, 1, 2], 'rank'], '둘째가 털면 꼴찌가 정해져 끝');
  eq(r.s.result.pts, [15, 0, -15], '등수 한 칸 5장씩 (1등 +15 · 3등 −15)');
  // 판이 너무 길면 끝 (손패 적은 사람이 이김)
  s = G.create({ players: 2, seed: 4 });
  s.turnNo = G.MAX_TURNS - 1;
  const L = G.legal(s);
  r = run(s, [L[L.length - 1]]);
  eq([r.s.phase, r.s.result.kind], ['end', 'cap'], `${G.MAX_TURNS} 수가 넘으면 끝`);
  eq(sum(r.s.result.pts), 0, 'cap 정산 합 0');
  // 다음 판: 이긴 사람이 먼저, 판 번호 +1
  const s0 = G.setup({ players: 3, hands: [[C(H, 4)], [C(CL, 3)], [C(CL, 5)]], pile: [C(H, 8)] });
  s0.turn = 0;
  const e = run(s0, [P(C(H, 4))]).s;
  const nx = G.nextRound(e, { seed: 99 });
  eq([nx.round, nx.first, nx.turn, nx.n], [2, 0, 0, 3], '다음 판: 이긴 사람이 선');
  ok(nx.hands.every(h => h.length === 7), '다음 판 다시 나누기');
}

section('결정성 · 카드 보존 · 숨은 정보');
{
  const play = (seed, n) => {
    let s = G.create({ players: n, seed });
    const rng = G.makeRng(seed + 1), acts = [];
    while (s.phase !== 'end') { const L = G.legal(s); const a = s.phase === 'call' ? G.A_CALL : L[Math.floor(rng() * L.length)]; acts.push(a); s = G.step(s, a).state; }
    return { s, acts };
  };
  const a = play(42, 4), b = play(42, 4);
  eq(G.hash(a.s), G.hash(b.s), '같은 씨앗 + 같은 수 = 같은 지문');
  let s = G.create({ players: 4, seed: 42 });
  for (const x of a.acts) s = G.step(s, x).state;
  eq(G.hash(s), G.hash(a.s), '수를 다시 넣어도 같음 (다시 보기)');
  const s1 = G.create({ players: 3, seed: 5 }), h1 = G.hash(s1);
  G.step(s1, G.legal(s1)[0]);
  eq(G.hash(s1), h1, 'step 은 넣은 상태를 안 바꿈');
  ok(G.hash(G.create({ players: 3, seed: 5 })) !== G.hash(G.create({ players: 3, seed: 6 })), '다른 씨앗 = 다른 판');
  // view: 남의 손패·더미 순서·씨앗 숨김
  s = G.create({ players: 4, seed: 11 });
  const v = G.view(s, 1);
  ok(v.hands[1].every(c => c >= 0) && v.hands[0].every(c => c === -1) && v.hands[2].every(c => c === -1), 'view: 내 손패만 보임');
  ok(v.deck.every(c => c === -1) && v.deck.length === s.deck.length, 'view: 더미는 장수만');
  eq([v.seed, v.rng, v.me], [0, 0, 1], 'view: 씨앗 · 난수 없음');
  // 숨은 카드만 다시 섞은 판과 관찰이 같음
  let same = 0, N = 0;
  const rng = G.makeRng(9);
  for (let i = 0; i < 300; i++) {
    let st = G.create({ players: 2 + i % 5, seed: 300 + i });
    const steps = Math.floor(rng() * 40);
    for (let k = 0; k < steps && st.phase !== 'end'; k++) { const L = G.legal(st); st = G.step(st, st.phase === 'call' ? G.A_CALL : L[Math.floor(rng() * L.length)]).state; }
    if (st.phase === 'end') continue;
    const p = i % st.n, w = G.sampleWorld(G.view(st, p), rng);
    N++;
    const o1 = G.obs(st, p), o2 = G.obs(w, p);
    if (o1.length === G.OBS_LEN && o1.every((x, j) => x === o2[j])) same++;
    ok(total(w) === total(st) && JSON.stringify(w.hands[p]) === JSON.stringify(st.hands[p]) && w.hands.every((h, q) => h.length === st.hands[q].length) && w.deck.length === st.deck.length, `sampleWorld 장수·내 손패 그대로 (${i})`);
    const all = w.deck.concat(w.pile, ...w.hands).sort((x, y) => x - y);
    ok(JSON.stringify(all) === JSON.stringify(G.gameCards(w.decks)), `sampleWorld 카드 한 장씩 (${i})`);
  }
  eq(same, N, `숨은 카드만 다른 판 ${N}개: 관찰(obs, 길이 ${G.OBS_LEN})이 모두 같음`);
  eq(G.legalMask(s).length, G.N_ACTIONS, 'legalMask 길이');
  ok(G.legal(s).every(x => G.legalMask(s)[x] === 1), 'legalMask = legal');
}

section('우리 집 규칙: 검증 · 기본값 · 묶음');
{
  const d = G.defaultRules();
  eq(G.normRules({}), d, '빈 규칙 = 기본');
  eq(G.normRules({ deal: 99, atk2: -3, counter: 'zzz', block3: 'false', bust: 5 }).deal, 8, '범위 밖 → 끝값');
  const n = G.normRules({ deal: 99, atk2: -3, counter: 'zzz', block3: 'false', bust: 5 });
  eq([n.atk2, n.counter, n.block3, n.bust], [1, 'stronger', false, 10], '음수 · 모르는 값 · 문자열 false · 너무 작은 파산');
  eq(G.matchPreset({}), 'basic', '기본 묶음 알아봄');
  for (const p of G.RULE_PRESETS) eq(G.matchPreset(G.presetRules(p.id)), p.id, `묶음 '${p.name}' 알아봄`);
  eq(G.matchPreset(Object.assign(G.presetRules('spicy'), { chipPer: 100 })), 'spicy', '장당 칩은 묶음과 상관없음');
  eq(G.matchPreset({ deal: 6 }), '', '직접 고친 규칙');
  eq(G.presetRules('mild').counter, 'off', "'순한 맛' = 쌓기 없음");
  eq([G.presetRules('spicy').atk2, G.presetRules('spicy').atkCJ], [3, 10], "'화끈한 집' = 공격 더 셈");
  eq(G.diffRules({ deal: 5, rankAll: true }).map(x => x.k), ['deal', 'rankAll'], 'diffRules');
  ok(G.RULE_DEFS.every(x => G.RULE_GROUPS.some(g => g[0] === x.g)), '규칙마다 묶음이 있음');
  // 화끈한 집: 2 공격 3장
  const s = G.setup({ players: 2, hands: [[C(H, 1), C(S, 9)], [C(CL, 3), C(CL, 4)]], pile: [C(H, 8)], rules: G.presetRules('spicy') });
  const r = run(s, [P(C(H, 1)), G.A_CALL, G.A_DRAW]);
  eq(r.s.hands[1].length, 5, "'화끈한 집': 2 공격으로 3장 받음");
}

section('무작위 판 (2~8명 · 무작위 규칙): 오류 없음 · 할 수 있는 수만 · 카드 보존 · 정산 합 0');
{
  const rng = G.makeRng(2026);
  const pick = a => a[Math.floor(rng() * a.length)];
  let games = 0, steps = 0, err = 0, kinds = {}, specials = { counter: 0, block: 0, skip: 0, reverse: 0, again: 0, suit: 0, caught: 0, miss: 0, call: 0, bust: 0, reshuffle: 0 };
  const lens = [];
  for (let i = 0; i < 3000; i++) {
    const rules = {};
    if (i % 2) for (const d of G.RULE_DEFS) if (rng() < 0.3) rules[d.k] = d.t === 'bool' ? rng() < 0.5 : d.t === 'enum' ? pick(d.opts)[0] : d.steps ? pick(d.steps) : d.min + Math.floor(rng() * (d.max - d.min + 1));
    const n = 2 + (i % 7);
    let s = G.create({ players: n, seed: 9000 + i, rules });
    const tot = total(s);
    try {
      while (s.phase !== 'end') {
        const L = G.legal(s);
        let a;
        if (s.phase === 'call') { const x = rng(); a = x < 0.7 ? G.A_CALL : x < 0.85 ? G.A_MISS : pick(L.filter(y => y >= G.A_CATCH && y < G.A_MISS)); }
        else { const plays = L.filter(y => y !== G.A_DRAW); a = plays.length && rng() < 0.85 ? pick(plays) : pick(L); }
        const r = G.step(s, a);
        for (const e of r.events) if (e.t in specials) specials[e.t]++;
        s = r.state; steps++;
        if (total(s) !== tot) throw new Error('카드 수 ' + total(s) + ' ≠ ' + tot);
        if (s.phase !== 'end' && s.out[s.turn] !== 0) throw new Error('빠진 사람 차례');
        if (s.hands.some((h, q) => s.out[q] === 2 && h.length)) throw new Error('파산한 사람 손에 카드');
      }
      if (sum(s.result.pts) !== 0) throw new Error('정산 합 ' + sum(s.result.pts));
      if (s.result.order.length !== n || new Set(s.result.order).size !== n) throw new Error('등수 목록');
      kinds[s.result.kind] = (kinds[s.result.kind] || 0) + 1; lens.push(s.turnNo); games++;
    } catch (e) { err++; if (err < 4) console.log('    오류', i, e.message); }
  }
  eq(err, 0, '무작위 판 3000개 오류 없음');
  lens.sort((a, b) => a - b);
  console.log(`    ${games}판 · ${steps}수 · 끝난 방식 ${JSON.stringify(kinds)} · 판당 수 중간값 ${lens[lens.length >> 1]} (90% ${lens[Math.floor(lens.length * 0.9)]})`);
  console.log(`    나온 일: ${JSON.stringify(specials)}`);
  ok(Object.values(specials).every(x => x > 0), '받아치기·막기·건너뛰기·방향·한 번 더·무늬·외치기·잡기·시간 지남·파산·다시 섞기 모두 나옴');
}

// ── 선생님 흐름 읽기 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠음) ─────────────
//   내 차례에 👀 상대가 방금 한 일과 노림 · 📊 내 형세 · 👉 추천이 그것과 어떻게 이어지는지.
//   AI.record(전 상태, 후 상태, 행동) = 공개 기록(낸 카드 · 장수만) → AI.coach(view, { log, names }) 가 read · mine · mean 을 채움
section('선생님 흐름 읽기 (👀 상대 · 📊 내 흐름 · 👉 수의 의미)');
{
  const names = ['나', '김씨', '박씨', '이씨'];
  const has = typeof AI.record === 'function';
  ok(has, 'AI.record (공개 기록) 가 있음');
  if (has) {
    const flow = (s, acts, o) => {                               // acts 를 차례로 두며 기록 → 내(0번) 눈으로 선생님
      const log = []; let t = s;
      for (const a of acts) { const r = G.step(t, a); log.push(AI.record(t, r.state, a)); t = r.state; }
      return { s: t, log, c: AI.coach(G.view(t, 0), Object.assign({ log, names }, o)) };
    };
    const readText = c => (c.read || []).map(x => x.text).join(' / ');
    // 1) 박씨가 ♠A 로 나(0)에게 5장 공격 — 나는 같은 무늬 3(♠3)으로 막을 수 있음
    {
      const s = G.setup({ players: 3, hands: [[C(H, 4), C(H, 9), C(D, 5), C(CL, 9), C(S, 2), C(H, 0)], [C(CL, 3), C(CL, 4)], [C(S, 0), C(S, 8), C(CL, 11)]], pile: [C(S, 5)], turn: 2 });
      const { c } = flow(s, [P(C(S, 0))]);
      ok(Array.isArray(c.read) && c.read.length >= 1, '👀 상대 흐름 줄이 있음');
      ok(/박씨/.test(readText(c)) && /♠A/.test(readText(c)) && /공격/.test(readText(c)), '👀 박씨 ♠A 공격: ' + readText(c));
      ok(/나에게 5장/.test(readText(c)), '👀 나에게 5장 먹이려는 수: ' + readText(c));
      ok(typeof c.mine === 'string' && /내 패 6장/.test(c.mine) && /김씨 2장/.test(c.mine), '📊 내 패 6장 · 김씨 2장: ' + c.mine);
      ok(/쫓기는/.test(c.mine) && /5장 공격/.test(c.mine) && /막을 3/.test(c.mine), '📊 쫓기는 중 · 5장 공격 · 막을 3 이 있음: ' + c.mine);
      eq(c.card, C(S, 2), '추천: ♠3 으로 막기');
      ok(/박씨/.test(c.mean) && /막/.test(c.mean) && !/다음 사람/.test(c.mean), '👉 박씨의 공격을 막는다고 이름으로 말함: ' + c.mean);
    }
    // 2) 김씨가 낼 게 없어 한 장 먹음 (♥8 위에서) → 김씨는 ♥·8 이 없다
    {
      const s = G.setup({ players: 2, hands: [[C(H, 3), C(S, 7), C(D, 12), C(CL, 5)], [C(CL, 3), C(CL, 4), C(D, 2)]], pile: [C(H, 7)], turn: 1 });
      const { c } = flow(s, [G.A_DRAW]);
      ok(/김씨/.test(readText(c)) && /한 장 먹음/.test(readText(c)) && /낼 게 없/.test(readText(c)), '👀 김씨 한 장 먹음 — 낼 게 없었어요: ' + readText(c));
      ok(/내 패 4장/.test(c.mine) && /김씨 4장/.test(c.mine), '📊 장수 비교: ' + c.mine);
      const m = c.byCard[C(H, 3)].mean;
      ok(/김씨/.test(m) && /♥/.test(m) && /먹었/.test(m), '👉 김씨가 ♥ 이 없어 먹었으니 ♥ 로 이어 가기: ' + m);
    }
    // 3) 김씨가 ♣7 로 ♥ 바꿈 — ♥ 이 많거나 내 ♣ 을 막으려는 것 / 내 7 은 김씨의 ♥ 을 피해 ♣ 로
    {
      const s = G.setup({ players: 2, hands: [[C(H, 6), C(H, 2), C(H, 3), C(CL, 2), C(CL, 3)], [C(CL, 6), C(H, 8), C(H, 9), C(H, 4), C(S, 9)]], pile: [C(CL, 7)], turn: 1 });
      const { c } = flow(s, [P(C(CL, 6)), G.A_SUIT + H]);
      ok(/김씨/.test(readText(c)) && /7/.test(readText(c)) && /♥/.test(readText(c)) && /바꿈/.test(readText(c)), '👀 김씨 7 로 ♥ 바꿈: ' + readText(c));
      ok(/내 ♣/.test(readText(c)), '👀 내 ♣ 을 막으려는 것: ' + readText(c));
      const base = AI.coach(G.view(G.step(G.step(s, P(C(CL, 6))).state, G.A_SUIT + H).state, 0));
      eq(base.byCard[C(H, 6)].suit, H, '(기록 없이는 ♥ 도 ♣ 도 2장이면 앞선 ♥)');
      eq(c.byCard[C(H, 6)].suit, CL, '내 7 은 ♥ 로 바꾼 김씨를 피해 ♣ 로');
      ok(/피해/.test(c.byCard[C(H, 6)].mean) && /♥/.test(c.byCard[C(H, 6)].mean), '👉 ♥ 로 바꾼 김씨를 피해: ' + c.byCard[C(H, 6)].mean);
    }
    // 4) 김씨가 1장 남김 → 원카드 임박
    {
      const s = G.setup({ players: 2, hands: [[C(D, 4), C(S, 9), C(CL, 5)], [C(H, 2), C(H, 9)]], pile: [C(H, 7)], turn: 1 });
      const { c } = flow(s, [P(C(H, 2)), G.A_CALL]);
      ok(/김씨/.test(readText(c)) && /1장 남음/.test(readText(c)) && /원카드 임박/.test(readText(c)), '👀 김씨 1장 남음 — 원카드 임박!: ' + readText(c));
    }
    // 5) 다음 사람이 1장이면 공격 — 이유에 '다음 사람' 대신 이름
    {
      const s = G.setup({ players: 3, hands: [[C(H, 1), C(H, 7), C(S, 9)], [C(CL, 3)], [C(CL, 5), C(CL, 6), C(D, 2)]], pile: [C(H, 8)] });
      const c = AI.coach(G.view(s, 0), { log: [], names });
      eq(c.card, C(H, 1), '추천: 공격');
      ok(/김씨/.test(c.mean) && /1장/.test(c.mean) && !/다음 사람/.test(c.mean), '👉 김씨가 1장 남았으니 공격으로 막아요: ' + c.mean);
      ok(c.read.length === 1 && /아직/.test(c.read[0].text), '👀 아직 상대가 둔 수가 없으면 그렇게 말함: ' + readText(c));
    }
    // 6) 내가 둔 뒤의 기록만 '방금'으로 셈 (내 수 앞의 상대 수는 안 나옴)
    {
      const s = G.setup({ players: 2, hands: [[C(H, 3), C(H, 5), C(S, 9)], [C(CL, 3), C(CL, 4), C(H, 9), C(D, 2)]], pile: [C(H, 7)], turn: 1 });
      const { c, log } = flow(s, [P(C(H, 9)), P(C(H, 3)), G.A_DRAW]);
      ok(log.length === 3 && typeof AI.since === 'function' && AI.since(log, 0).length === 1 && AI.since(log, 0)[0].p === 1, '내 수 뒤 기록만 남김');
      ok(/한 장 먹음/.test(readText(c)) && !/♥9/.test(readText(c)), '방금(내 수 뒤)만: ' + readText(c));
    }
    // 7) 기록 = 장수와 낸 카드만 (먹은 카드 · 남의 손패 안 들어감) + 판 전체를 돌려도 보이는 카드만 말함
    {
      const OK = new Set(['p', 'ph', 'a', 'no', 'round', 'cB', 'cA', 'outA', 'atkB', 'atkA', 'kB', 'lp', 'suitB', 'rankB', 'suitA', 'rankA', 'dirB', 'dirA', 'nxB', 'nxA', 'c', 'drew', 'su', 'skip', 'rev', 'again', 'bust', 'pick', 'by', 'pen']);
      let badKey = 0, leak = 0, texts = 0, tooLong = 0, noRead = 0, noMine = 0, noMean = 0;
      const rng = G.makeRng(515);
      const nameRe = /[♠♥♦♣](?:10|[A2-9JQK])|흑백 조커|컬러 조커/g;
      for (let g = 0; g < 160; g++) {
        const n = 2 + (g % 5);
        let s = G.create({ players: n, seed: 3000 + g });
        const log = [];
        for (let k = 0; k < 400 && s.phase !== 'end'; k++) {
          const L = G.legal(s);
          let a;
          if (s.phase === 'call') a = rng() < 0.8 ? G.A_CALL : L[Math.floor(rng() * L.length)];
          else a = rng() < 0.15 ? L[Math.floor(rng() * L.length)] : AI.choose(G.view(s, s.turn), 'normal', { rng });
          const r = G.step(s, a), rec = AI.record(s, r.state, a);
          for (const key of Object.keys(rec)) if (!OK.has(key)) badKey++;
          for (const key of ['cB', 'cA', 'outA']) if (!Array.isArray(rec[key]) || rec[key].length !== n) badKey++;
          log.push(rec); s = r.state;
          if (s.phase === 'play' && s.turn === 0 && s.out[0] === 0) {
            const v = G.view(s, 0), c = AI.coach(v, { log, names: ['나', '가', '나다', '다라', '라마', '마바', '바사', '사아'] });
            if (!c) continue;
            texts++;
            const seen = new Set(v.pile.concat(v.hands[0], log.filter(x => x.c != null).map(x => x.c)).map(G.cardName));   // 다시 섞여 더미로 간 카드도, 방금 누가 냈는지는 모두가 본 것
            const all = (c.read || []).map(x => x.text).concat([c.mine, c.mean, c.why]).concat(Object.values(c.byCard).map(x => x.mean + ' ' + x.why)).join(' ');
            for (const m of all.match(nameRe) || []) if (!seen.has(m)) { leak++; if (leak < 4) console.log('    누출?', m, all); }
            if (!c.read || !c.read.length) noRead++;
            if (!c.mine) noMine++;
            if (!c.mean) noMean++;
            if ((c.read || []).length > 4) tooLong++;
          }
        }
      }
      eq(badKey, 0, '공개 기록에는 정해진 항목(장수 · 낸 카드)만');
      ok(texts > 300, `내 차례 ${texts}번에 선생님 글 만듦`);
      eq(leak, 0, '👀 📊 👉 글에 보이지 않는 카드 이름이 없음');
      eq([noRead, noMine, noMean, tooLong], [0, 0, 0, 0], '👀 📊 👉 가 늘 있고 👀 는 4줄 이하');
    }
  }
}

(async () => {
  section('AI (할 수 있는 수만 · 같은 씨앗이면 같은 수 · 선생님 · 외치기 경주)');
  {
    let s = G.create({ players: 4, seed: 31 }), bad = 0, n = 0;
    const rng = G.makeRng(5);
    for (let k = 0; k < 400 && s.phase !== 'end'; k++) {
      const a = s.phase === 'call' ? AI.race(s, ['hard', 'normal', 'easy', 'normal'], rng).a : AI.choose(G.view(s, s.turn), ['easy', 'normal', 'hard'][k % 3], { seed: k, samples: 12 });
      if (!G.isLegal(s, a)) bad++;
      n++; s = G.step(s, a).state;
    }
    eq(bad, 0, `AI 수 ${n}개 모두 할 수 있는 수`);
    const v = G.view(G.create({ players: 3, seed: 8 }), 0);
    eq(AI.choose(v, 'hard', { seed: 3, samples: 20 }), AI.choose(v, 'hard', { seed: 3, samples: 20 }), '🐯 같은 씨앗 = 같은 수');
    const c = AI.coach(v);
    ok(c && typeof c.why === 'string' && c.why.length > 4 && G.isLegal(v, c.a), '선생님: 할 수 있는 수 + 한 줄 이유 — ' + (c && c.name + ' · ' + c.why));
    // 선생님: 이기는 수 · 공격 막기
    let t = G.setup({ players: 2, hands: [[C(H, 4)], [C(CL, 3), C(CL, 4)]], pile: [C(H, 8)] });
    eq(AI.coach(G.view(t, 0)).card, C(H, 4), '선생님: 마지막 카드 내기');
    t = G.setup({ players: 3, hands: [[C(H, 1), C(H, 7), C(S, 9)], [C(CL, 3)], [C(CL, 5), C(CL, 6), C(D, 2)]], pile: [C(H, 8)] });
    eq(AI.coach(G.view(t, 0)).card, C(H, 1), '선생님: 다음 사람이 1장이면 공격');
    t = G.setup({ players: 2, hands: [[C(H, 7), C(H, 9), C(S, 9)], [C(CL, 3), C(CL, 4), C(D, 4), C(D, 5)]], pile: [C(H, 8)], atk: 2, atkStr: 2, atkKind: '2' });
    eq(AI.coach(G.view(t, 0)).a, G.A_DRAW, '선생님: 받아칠 카드가 없으면 받기');
    // 외치기 경주: 🐯 이 🐣 보다 잘 외침
    const rate = tier => { const r = G.makeRng(1); let ok2 = 0; const st = G.setup({ players: 3, hands: [[C(H, 4), C(S, 9)], [C(CL, 3), C(CL, 4)], [C(CL, 5), C(CL, 6)]], pile: [C(H, 8)] }); const cs = G.step(st, P(C(H, 4))).state; for (let i = 0; i < 2000; i++) if (AI.race(cs, [tier, 'normal', 'normal'], r).a === G.A_CALL) ok2++; return ok2 / 2000; };
    const re = rate('easy'), rn = rate('normal'), rh = rate('hard');
    console.log(`    외치기 성공률 (🐱 둘이 잡으려 할 때): 🐣 ${(re * 100).toFixed(0)}% · 🐱 ${(rn * 100).toFixed(0)}% · 🐯 ${(rh * 100).toFixed(0)}%`);
    ok(re < rn && rn < rh, '외치기: 🐣 < 🐱 < 🐯');
  }

  section('AI 끼리 (같은 판을 B 자리를 돌려 가며 · 장수 기준 · 여러 스레드)');
  const fmt = r => `${r.edge >= 0 ? '+' : ''}${r.edge.toFixed(2)} ± ${r.se.toFixed(2)}장`;
  let t = Date.now();
  const en = await duel('easy', 'normal', 2, 600);
  eq(en.err, '', '🐣 vs 🐱 (둘이) 오류 없음');
  console.log(`    둘이 🐣 vs 🐱 ${en.games}판: 🐱 이 판마다 ${fmt(en)} 더 · 이긴 판 🐣 ${en.wins.easy} · 🐱 ${en.wins.normal} (${Date.now() - t}ms)`);
  ok(en.edge > 3 * en.se && en.edge > 1, '둘이: 🐱 > 🐣');
  t = Date.now();
  const en4 = await duel('easy', 'normal', 4, 300);
  eq(en4.err, '', '🐣 vs 🐱 (넷이) 오류 없음');
  console.log(`    넷이 🐱 하나 vs 🐣 셋 ${en4.games}판: 🐱 이 판마다 ${fmt(en4)} 더 · 이긴 판 🐣 ${en4.wins.easy} · 🐱 ${en4.wins.normal} (${Date.now() - t}ms)`);
  ok(en4.edge > 3 * en4.se, '넷이: 🐱 > 🐣');
  t = Date.now();
  const nh = await duel('normal', 'hard', 2, 300, { hard: { samples: 40 } });
  eq(nh.err, '', '🐱 vs 🐯 (둘이) 오류 없음');
  console.log(`    둘이 🐱 vs 🐯(40번 섞기) ${nh.games}판: 🐯 이 판마다 ${fmt(nh)} 더 · 이긴 판 🐱 ${nh.wins.normal} · 🐯 ${nh.wins.hard} (${Date.now() - t}ms)`);
  ok(nh.edge > 2 * nh.se, '둘이: 🐯 > 🐱');
  t = Date.now();
  const nh4 = await duel('normal', 'hard', 4, 120, { hard: { samples: 80 } });
  eq(nh4.err, '', '🐱 vs 🐯 (넷이) 오류 없음');
  console.log(`    넷이 🐯 하나 vs 🐱 셋(80번 섞기) ${nh4.games}판: 🐯 이 판마다 ${fmt(nh4)} 더 · 이긴 판 🐱 ${nh4.wins.normal} · 🐯 ${nh4.wins.hard} (${Date.now() - t}ms)`);
  ok(nh4.edge > 1.5 * nh4.se, '넷이: 🐯 > 🐱');

  console.log(`\n${fail ? '실패' : '모두 통과'}: ${pass} 통과 · ${fail} 실패 (${((Date.now() - T0) / 1000).toFixed(1)}초)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

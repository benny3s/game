/* 고스톱 자체 시험 — node game/gostop/test/selftest.js
   규칙 하나하나(손으로 만든 판) · 점수·박 계산 · 결정성(같은 씨앗+같은 입력 = 같은 지문) · 카드 보존 ·
   보이는 정보만 새는지 · AI 끼리 수천 판 (오류 없음, 점수 분포, 🐣 < 🐱 < 🐯) */
'use strict';
const G = require('../core.js');
const AI = require('../ai.js');
const WT = (() => { try { return require('worker_threads'); } catch (e) { return null; } })();
const T0 = Date.now();

// ── AI 대결 (일꾼 스레드에서도 씀) ─────────────────────────
// 같은 판(씨앗)을 자리 바꿔 두 번 → 운을 줄임. 씨앗·난수가 다 정해져 있어 결과는 늘 같음
function playRound(seed, seats, n, bonus, opts) {
  const s = G.create({ players: n, bonus, seed });
  const rng = G.makeRng(seed * 31 + 17 + (seats[0] === seats[1] ? 0 : seats[0].length));
  for (let guard = 0; s.phase !== 'end'; guard++) {
    if (guard > 400) throw new Error('끝나지 않음');
    const p = s.turn, v = G.view(s, p);
    const a = AI.choose(v, seats[p], Object.assign({ rng }, opts && opts[seats[p]]));
    if (!G.isLegal(s, a)) throw new Error('AI 가 할 수 없는 행동 ' + a + ' ' + s.phase + ' ' + seats[p]);
    G.apply(s, a, null);
  }
  return s;
}
function duelRange(A, B, from, to, n, opts) {
  const r = { tot: { [A]: 0, [B]: 0 }, wins: { [A]: 0, [B]: 0 }, rounds: 0, nagari: 0, maxPts: 0, sumWin: 0, nWin: 0, go: 0, diffs: [], err: '' };
  try {
    for (let i = from; i <= to; i++) {
      let d = 0;
      for (const flip of [0, 1]) {
        const seats = n === 2 ? (flip ? [B, A] : [A, B]) : (flip ? [B, A, A] : [A, B, B]);
        const s = playRound(1000 + i, seats, n, i % 3 === 0 ? 2 : 0, opts);
        const res = s.result;
        r.rounds++;
        if (res.kind === 'nagari') r.nagari++;
        else { r.maxPts = Math.max(r.maxPts, res.points); r.sumWin += res.points; r.nWin++; r.wins[seats[res.winner]]++; }
        r.go += s.go.reduce((x, y) => x + y, 0);
        for (let p = 0; p < n; p++) { const x = G.reward(s, p) / seats.filter(z => z === seats[p]).length; r.tot[seats[p]] += x; d += seats[p] === B ? x : -x; }
      }
      r.diffs.push(d / 2);
    }
  } catch (e) { r.err = String(e && e.stack || e); }
  return r;
}
if (WT && !WT.isMainThread) {
  const w = WT.workerData;
  WT.parentPort.postMessage(duelRange(w.A, w.B, w.from, w.to, w.n, w.opts));
  return;
}
// 여러 스레드로 나눠 돌림 (없으면 한 줄로)
function duel(A, B, pairs, n, opts) {
  const W = WT ? Math.max(1, Math.min(8, require('os').cpus().length - 2)) : 1;
  const per = Math.ceil(pairs / W), jobs = [];
  for (let w = 0; w < W; w++) {
    const from = 1 + w * per, to = Math.min(pairs, (w + 1) * per);
    if (from > to) continue;
    if (!WT) { jobs.push(Promise.resolve(duelRange(A, B, from, to, n, opts))); continue; }
    jobs.push(new Promise((res, rej) => { const wk = new WT.Worker(__filename, { workerData: { A, B, from, to, n, opts } }); wk.on('message', res); wk.on('error', rej); }));
  }
  return Promise.all(jobs).then(parts => {
    const r = { tot: { [A]: 0, [B]: 0 }, wins: { [A]: 0, [B]: 0 }, rounds: 0, nagari: 0, maxPts: 0, sumWin: 0, nWin: 0, go: 0, diffs: [], err: '' };
    for (const x of parts) {
      for (const k of [A, B]) { r.tot[k] += x.tot[k]; r.wins[k] += x.wins[k]; }
      for (const k of ['rounds', 'nagari', 'sumWin', 'nWin', 'go']) r[k] += x[k];
      r.maxPts = Math.max(r.maxPts, x.maxPts); r.diffs.push(...x.diffs); if (x.err) r.err = x.err;
    }
    r.avg = { [A]: r.tot[A] / r.rounds, [B]: r.tot[B] / r.rounds };
    const m = r.diffs.reduce((a, b) => a + b, 0) / r.diffs.length;
    const sd = Math.sqrt(r.diffs.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, r.diffs.length - 1));
    r.edge = m; r.se = sd / Math.sqrt(r.diffs.length);
    return r;
  });
}
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('  ✗ ' + name); } };
const eq = (a, b, name) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) pass++; else { fail++; console.log('  ✗ ' + name + '\n      기대 ' + y + '\n      실제 ' + x); } };
const section = t => console.log('· ' + t);
const S = o => G.setup(Object.assign({ players: 2 }, o));
const act = (s, a) => { const ev = []; G.apply(s, a, ev); return ev; };
const P = c => G.A_PLAY + c;
const sorted = a => a.slice().sort((x, y) => x - y);
const has = (ev, t) => ev.some(e => e.t === t);
const PIS = [2, 3, 6, 7, 10, 11, 14, 15, 18, 19];   // 보통 피 10장

// ── 패 구성 ─────────────────────────────────────────────
section('패 구성');
{
  const kinds = [0, 0, 0, 0]; let piSum = 0;
  for (let c = 0; c < 48; c++) { kinds[G.KIND[c]]++; if (G.KIND[c] === G.PI) piSum += G.PIV[c]; }
  eq(kinds, [5, 9, 10, 24], '광 5 · 열끗 9 · 띠 10 · 피 24');
  eq(piSum, 26, '피 값 합 26 (쌍피 두 장)');
  eq([1, 5, 9, 21, 33, 37, 13, 17, 25, 46].map(c => G.RIB[c]), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], '홍단·청단·초단·비띠');
  eq([0, 8, 28, 40, 44].map(c => G.KIND[c]), [0, 0, 0, 0, 0], '광 다섯 장');
  eq([4, 12, 29].map(c => G.BIRD[c]), [1, 1, 1], '고도리 새 세 장');
  eq([48, 49, 50].map(c => G.PIV[c]), [2, 3, 2], '보너스 쌍피·쓰리피·쌍피');
  eq(G.cardName(44), '12월 비광', '이름: 비광');
  eq(G.cardName(32), '9월 열끗(술잔(국진))', '이름: 국진');
  eq(G.cardName(41), '11월 쌍피', '이름: 쌍피');
}

// ── 나누기 ─────────────────────────────────────────────
section('첫 판 선 정하기 (높은 월 · 낮은 월)');
{
  let bad = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) for (const P of [2, 3, 5]) for (const mode of ['high', 'low']) {
    const s = G.create({ players: P, seed, seon: mode }), d = s.seonDraw;
    const ms = d.cards.map(c => G.monthOf(c));
    const want = mode === 'high' ? ms.indexOf(Math.max(...ms)) : ms.indexOf(Math.min(...ms));
    if (d.cards.length !== s.n || new Set(ms).size !== ms.length || d.first !== want || s.first !== want || (s.phase === 'play' && s.turn !== want)) bad++;
    if (JSON.stringify(G.create({ players: P, seed, seon: mode }).seonDraw) !== JSON.stringify(d)) bad++;
    n++;
  }
  eq(bad, 0, n + '판: 월이 겹치지 않고, 높은(낮은) 월이 선, 같은 씨앗이면 같은 결과');
  eq(G.create({ players: 3, seed: 5 }).seonDraw, null, '선 뽑기를 안 하면 seonDraw 없음');
  eq(G.nextRound(Object.assign(G.create({ players: 2, seed: 9, seon: 'high' }), { result: { kind: 'nagari' } })).seonDraw, null, '다음 판은 안 뽑음 (이긴 사람이 선)');
}

section('패 나누기 (맞고 10·8, 3인 7·6, 보너스 0·2·3)');
{
  let bad = 0, chong = 0, tableBonus = 0, redeal = 0;
  for (const [n, H, TB, D] of [[2, 10, 8, 20], [3, 7, 6, 21]]) for (const bonus of [0, 2, 3]) {
    for (let seed = 1; seed <= 300; seed++) {
      const s = G.create({ players: n, bonus, seed });
      const all = sorted([...s.deck, ...s.table, ...s.hands.flat(), ...s.cap.flat()]);
      if (JSON.stringify(all) !== JSON.stringify(G.gameCards(bonus))) bad++;
      if (s.hands.some(h => h.length !== H) || s.table.length !== TB) bad++;
      if (s.deck.length !== D + bonus - s.dealt.bonus.length) bad++;
      if (s.table.some(G.isBonus)) bad++;
      if (G.monthCount(s.table).some(x => x === 4)) bad++;
      if (s.dealt.bonus.some(c => s.cap[s.first].indexOf(c) < 0)) bad++;
      if (s.result) chong++;
      tableBonus += s.dealt.bonus.length ? 1 : 0; redeal += s.dealt.redeal;
    }
  }
  eq(bad, 0, '장수·보존·바닥 보너스·바닥 네 장 없음');
  ok(tableBonus > 0, '바닥 보너스 피가 선에게 가는 판이 있음 (' + tableBonus + ')');
  ok(chong > 0, '총통 판이 가끔 나옴 (' + chong + ')');
}

// ── 점수 ───────────────────────────────────────────────
section('점수 (광·열끗·고도리·띠·단·피·국진·고)');
{
  const T = (cap, kook) => G.tally(S({ cap: [cap, []], kook }), 0);
  eq(T([0, 8, 28]).gwang, 3, '삼광 3점');
  eq(T([0, 8, 44]).gwang, 2, '비삼광 2점');
  eq(T([0, 8]).gwang, 0, '광 두 장 0점');
  eq(T([0, 8, 28, 40]).gwang, 4, '사광 4점');
  eq(T([0, 8, 28, 44]).gwang, 4, '비광 들어간 사광도 4점');
  eq(T([0, 8, 28, 40, 44]).gwang, 15, '오광 15점');
  eq(T([4, 12, 16, 20]).base, 0, '열끗 4장 0점');
  eq(T([4, 12, 16, 20, 24]).yeol, 1, '열끗 5장 1점');
  eq(T([4, 12, 16, 20, 24, 36]).yeol, 2, '열끗 6장 2점');
  eq(T([4, 12, 29]).godori, 5, '고도리 5점');
  eq(T([4, 12, 45]).godori, 0, '제비는 고도리 아님');
  eq(T([4, 12, 29, 16, 20]).base, 6, '고도리 + 열끗 5장 = 6점');
  eq(T([1, 5, 9]).base, 3, '홍단 3점');
  eq(T([21, 33, 37]).base, 3, '청단 3점');
  eq(T([13, 17, 25]).base, 3, '초단 3점');
  eq(T([1, 5, 13, 17]).base, 0, '띠 4장 0점');
  eq(T([1, 5, 13, 17, 46]).base, 1, '띠 5장 1점 (비띠도 띠)');
  eq(T([1, 5, 9, 13, 17]).base, 4, '홍단 + 띠 5장 = 4점');
  eq(T([1, 5, 9, 21, 33, 37, 46]).base, 9, '홍단 + 청단 + 띠 7장(3점) = 9점');
  eq(T(PIS.slice(0, 9)).base, 0, '피 9장 0점');
  eq(T(PIS).base, 1, '피 10장 1점');
  eq(T([...PIS, 22, 23]).base, 3, '피 12장 3점');
  eq(T([...PIS.slice(0, 8), 41]).pi, 10, '쌍피는 두 장으로 셈');
  eq(T([...PIS.slice(0, 8), 47]).base, 1, '피 8장 + 12월 쌍피 = 1점');
  eq(T([...PIS.slice(0, 7), 49]).base, 1, '피 7장 + 보너스 쓰리피 = 1점');
  eq(T([32, 4, 12, 16, 20]).yeol, 1, '국진은 정하기 전엔 열끗');
  eq(T([32, ...PIS.slice(0, 8)], 'P').pi, 10, '국진을 쌍피로 쓰면 피 +2');
  eq(T([32, ...PIS.slice(0, 8)], 'P').y, 0, '쌍피로 쓰면 열끗에서 빠짐');
  eq([0, 1, 2, 3, 4, 5].map(g => G.goTotal(7, g)), [7, 8, 9, 20, 44, 96], '고: 1고 +1 · 2고 +2 · 3고부터 (점수+고)×2^(고-2)');
}

section('정산 (피박·광박·멍박·흔들기·고박·나가리)');
{
  const ST = o => G.settle(S(o), 0, 'stop');
  let r = ST({ cap: [PIS, [22, 23, 26, 27, 30]] });
  eq([r.total, r.per[0].pay], [1, 2], '피박: 진 사람 피 5장 → 두 배');
  eq(ST({ cap: [PIS, []] }).per[0].pay, 1, '피 0장은 피박 아님');
  eq(ST({ cap: [PIS, [22, 23, 26, 27, 30, 31, 34]] }).per[0].pay, 2, '맞고: 피 7장이면 피박');
  eq(ST({ cap: [PIS, [22, 23, 26, 27, 30, 31, 34, 35]] }).per[0].pay, 1, '맞고: 피 8장이면 피박 아님');
  eq(ST({ cap: [[1, 5, 9], [22]] }).per[0].pay, 3, '피로 안 났으면 피박 없음');
  r = G.settle(G.setup({ players: 3, cap: [PIS, [22, 23, 26, 27, 30, 31], [34, 35, 38, 39, 42]] }), 0, 'stop');
  eq(r.per.map(x => x.pay), [1, 2], '3인 피박: 6장 괜찮음 · 5장 피박');
  eq(ST({ cap: [[0, 8, 28], [2]] }).per[0].pay, 6, '광박: 삼광 3점 × 2');
  eq(ST({ cap: [[0, 8, 28], [40]] }).per[0].pay, 3, '광 한 장 있으면 광박 아님');
  r = ST({ cap: [[4, 12, 16, 20, 24, 36, 45], [0]] });
  eq([r.total, r.per[0].pay], [3, 6], '멍박: 열끗 7장(3점) × 2');
  eq(ST({ cap: [[1, 5, 9], [0]], shake: [1, 0] }).per[0].pay, 6, '흔들기 한 번 × 2');
  eq(ST({ cap: [[1, 5, 9], [0]], shake: [2, 0] }).per[0].pay, 12, '흔들기·폭탄 두 번 × 4');
  eq(ST({ cap: [[1, 5, 9], [0]], go: [0, 1] }).per[0].pay, 6, '맞고 고박: 고했다 지면 × 2');
  eq(ST({ cap: [[1, 5, 9, 0, 8, 28], [40]], go: [3, 0] }).total, 18, '3고: 홍단+삼광 6점 → (6+3) × 2 = 18');
  eq(ST({ cap: [[1, 5, 9], [0]], carry: 1 }).per[0].pay, 6, '나가리 다음 판 × 2');
  eq(ST({ cap: [[1, 5, 9], [0]], carry: 2 }).per[0].pay, 12, '나가리 두 번 × 4');
  r = ST({ cap: [[0, 8, 28, ...PIS], [22]], shake: [1, 0] });   // 삼광 3 + 피 1 = 4, 피박 × 광박 × 흔들기
  eq(r.per[0].pay, 4 * 2 * 2 * 2, '박이 겹치면 곱함: 4점 × 피박 × 광박 × 흔들기 = 32');
  r = G.settle(G.setup({ players: 3, cap: [[1, 5, 9], [0], [8]], go: [0, 1, 0], goSeq: [1] }), 0, 'stop');
  eq(r.per.map(x => x.pay), [6, 0], '3인 고박: 고한 사람이 둘 몫을 다 냄');
  eq(r.points, 6, '3인 고박: 이긴 사람이 받는 점은 그대로');
  r = G.settle(G.setup({ players: 3, cap: [[1, 5, 9], [0], [8]], go: [0, 1, 1], goSeq: [1, 2] }), 0, 'stop');
  eq(r.per.map(x => x.pay), [0, 6], '둘 다 고했으면 나중에 고한 사람이 다 냄');
}

// ── 한 차례 규칙 ────────────────────────────────────────
section('짝 맞추기 · 쪽 · 뻑 · 따닥 · 싹쓸이 · 고르기');
{
  let s = S({ hands: [[0, 44], [36, 38]], table: [2, 20], deck: [24, 25, 26] });
  act(s, P(0));
  eq([sorted(s.cap[0]), sorted(s.table), s.turn, s.phase], [[0, 2], [20, 24], 1, 'play'], '같은 월 한 장: 두 장 가져옴, 뒤집은 패는 바닥에');

  s = S({ hands: [[0, 44], [36, 38]], table: [20], deck: [2, 24], cap: [[], [6, 41]] });
  let ev = act(s, P(0));
  ok(has(ev, 'jjok'), '쪽 알림');
  eq([sorted(s.cap[0]), s.cap[1]], [[0, 2, 6], [41]], '쪽: 두 장 + 상대 피 한 장 (값 낮은 피부터)');

  s = S({ hands: [[0, 44], [1, 38]], table: [2], deck: [3, 24, 25, 26], cap: [[6], [7]] });
  ev = act(s, P(0));
  ok(has(ev, 'ppeok'), '뻑 알림');
  eq([sorted(s.table), s.owner[0], s.ppeok[0], s.cap[0]], [[0, 2, 3], 0, 1, [6]], '뻑: 세 장이 바닥에 남고 아무것도 못 가져옴');
  ev = act(s, P(1));
  ok(has(ev, 'eat'), '뻑 먹기 알림');
  eq([sorted(s.cap[1]), s.cap[0], s.owner[0]], [[0, 1, 2, 3, 6, 7], [], -1], '남의 뻑 먹기: 네 장 + 피 한 장');

  s = S({ hands: [[0, 1, 44], [36, 38, 39]], table: [2], deck: [3, 24, 25, 26, 27], cap: [[], [6, 7]] });
  act(s, P(0)); act(s, P(38)); ev = act(s, P(1));
  eq([sorted(s.cap[0]), s.cap[1]], [[0, 1, 2, 3, 6, 7, 24, 25], []], '자뻑 먹기: 네 장 + 피 두 장');

  s = S({ hands: [[0, 44], [36, 38]], table: [2, 3, 20], deck: [1, 24], cap: [[], [6, 7]] });
  ev = act(s, P(0));
  ok(has(ev, 'ttadak'), '따닥 알림');
  eq(sorted(s.cap[0]), [0, 1, 2, 3, 6], '따닥: 네 장 + 피 한 장');
  s = S({ hands: [[0, 44], [36, 38]], table: [2, 3], deck: [1, 24], cap: [[], [6, 7]] });
  ev = act(s, P(0));
  eq([has(ev, 'ttadak'), has(ev, 'sweep'), s.cap[1]], [true, true, []], '따닥으로 바닥이 비면 싹쓸이까지 (피 두 장)');

  s = S({ hands: [[0, 44], [36, 38]], table: [2, 20], deck: [21, 24], cap: [[], [6, 7]] });
  ev = act(s, P(0));
  ok(has(ev, 'sweep'), '싹쓸이 알림');
  eq([s.table, s.cap[1]], [[], [7]], '싹쓸이: 바닥이 비면 피 한 장');

  s = S({ hands: [[1, 44], [36, 38]], table: [0, 2], deck: [24, 25] });
  act(s, P(1));
  eq([s.phase, s.cur.opts], ['pickHand', [0, 2]], '바닥에 다른 두 장: 고르기');
  act(s, G.A_PICK);
  eq([sorted(s.cap[0]), sorted(s.table)], [[0, 1], [2, 24]], '고른 패만 가져옴');

  s = S({ hands: [[1, 44], [36, 38]], table: [2, 3], deck: [24, 25] });
  act(s, P(1));
  eq([s.phase, sorted(s.cap[0])], ['play', [1, 2]], '같은 피 두 장이면 안 물어봄');

  s = S({ hands: [[4, 44], [36, 38]], table: [28, 30], deck: [29, 24] });
  act(s, P(4));
  eq([s.phase, s.cur.opts], ['pickFlip', [28, 30]], '뒤집은 패도 두 장 중 고르기');
  act(s, G.A_PICK + 1);
  eq([sorted(s.cap[0]), sorted(s.table)], [[29, 30], [4, 28]], '뒤집은 패 고르기 결과');

  s = S({ hands: [[0], [36]], table: [20, 2, 3], deck: [24, 25], cap: [[], [6]] });
  act(s, P(0));
  eq(s.cap[1], [6], '처음부터 깔린 세 장을 먹으면 피는 안 받음');

  // 11-01 훈 님: 판 시작부터 깔린 같은 월 세 장을 네 번째 패로 먹으면 피 뺏기 (기본 1장, 규칙 stealDealt)
  s = S({ hands: [[0, 44], [36, 38]], table: [1, 2, 3, 20], deck: [24, 25], cap: [[], [6, 7]] });
  act(s, P(0));
  eq([s.cap[1].length, s.cap[0].indexOf(6) >= 0 || s.cap[0].indexOf(7) >= 0], [1, true], '처음 깔린 세 장 먹기: 기본 피 1장');
  s = S({ hands: [[0, 44], [36, 38]], table: [1, 2, 3, 20], deck: [24, 25], cap: [[], [6, 7]], rules: { stealDealt: 0 } });
  act(s, P(0));
  eq(s.cap[1].length, 2, '처음 깔린 세 장 먹기: 0장 규칙이면 안 뺏음');
}

section('상대 읽기 · 선생님 해설 · 타짜 성격 (11-01)');
{
  // 바닥에 5·10월이 있는데 짝 없이 1월을 버림 → 5·10월 패는 없을 듯 (모두에게 보인 사실)
  let s = S({ hands: [[0, 1], [2, 3]], table: [16, 37], deck: [5, 6, 7, 9, 10, 11] });
  act(s, P(0));
  eq(G.view(s, 1).decl[0], (1 << 4) | (1 << 9), '짝 없이 버리면 바닥에 있던 달을 적어 둠 (상대 화면에도 보임)');
  s = S({ hands: [[0, 1], [2, 3]], table: [16, 2], deck: [5, 6, 7, 9, 10, 11] });
  act(s, P(0));
  eq(s.decl[0], 0, '먹었으면 적지 않음');
  eq(G.fastClone(Object.assign(S({}), { decl: [3, 0] })).decl, [3, 0], '빠른 복사도 같이');
  eq(G.fastClone(Object.assign(S({}), { decl: undefined })).decl, null, '옛 저장 판(decl 없음)도 복사됨');
  // 화면 그대로: 상대가 6월 청단을 먹어 둠 → 내 9월 청단은 '모아요' 가 아니라 '막혔어요'
  s = S({ hands: [[33, 0, 12, 20, 40], [4, 8, 24, 28, 44]], table: [34, 16], deck: [5, 6, 7, 9, 10, 11, 13], cap: [[], [21]] });
  let ch = AI.coachHand(G.view(s, 0));
  ok(/청단은 상대가 한 장 가져가 이미 막혔어요/.test(ch.byCard[33].why) && !/청단 띠를 모아요/.test(ch.byCard[33].why), '막힌 청단은 모으라고 안 함: ' + ch.byCard[33].why);
  s = S({ hands: [[33, 0, 12, 20, 40], [4, 8, 24, 28, 44]], table: [34, 16], deck: [5, 6, 7, 9, 10, 11, 13], cap: [[], []] });
  ok(/청단 띠를 모아요/.test(AI.coachHand(G.view(s, 0)).byCard[33].why), '안 막힌 청단은 모아요');
  s = S({ hands: [[33, 0, 12, 20, 40], [4, 8, 24, 28, 44]], table: [34, 16], deck: [5, 6, 7, 9, 10, 11, 13], cap: [[], [21, 37]] });
  ok(/청단 3점 완성을 막아요/.test(AI.coachHand(G.view(s, 0)).byCard[33].why), '상대 청단 2장이면 차단');
  // 👀 상대 읽기 줄
  s = S({ hands: [[33, 0, 12, 20, 40], [4, 8, 24, 28, 44]], table: [9, 34], deck: [5, 6, 7, 10, 11, 13, 17, 18, 19], cap: [[], [1, 5]] });
  s.decl[1] = 1 << 4;
  const rd = AI.coachHand(G.view(s, 0)).read;
  eq(rd.length, 1, '상대 한 명 읽기');
  ok(/홍단 2\/3 \(남은 3월 홍단: 바닥에 있어요\)/.test(rd[0].text), '모으는 약과 빠진 한 장 자리: ' + rd[0].text);
  ok(/5월 패는 없을 듯/.test(rd[0].text), '짝 없이 버린 달: ' + rd[0].text);
  // 타짜 성격: 모두 할 수 있는 행동만 · 성격은 그 한 수에만 (끝나면 원래대로)
  const names = Object.keys(AI.STYLES);
  eq(names, ['고광렬', '짝귀', '평경장', '아귀'], '타짜 넷 (약한 → 센 순)');
  let bad = 0;
  for (let i = 0; i < 12; i++) {
    const t = G.create({ players: 2 + (i % 2), seed: 300 + i }), rng = G.makeRng(i + 1);
    for (let g = 0; t.phase !== 'end' && g < 400; g++) { const st = t.turn === 0 ? names[i % 4] : names[(i + 1) % 4]; const a = AI.choose(G.view(t, t.turn), 'hard', { rng, samples: 6, style: st }); if (!G.isLegal(t, a)) bad++; G.apply(t, a, null); }
  }
  eq(bad, 0, '타짜 성격: 할 수 없는 행동 없음');
  const s0 = G.create({ players: 2, seed: 77 }), e0 = AI.evalState(s0, 0).v;
  AI.choose(G.view(s0, s0.turn), 'hard', { samples: 6, style: '아귀' });
  eq(AI.evalState(s0, 0).v, e0, '성격은 그 한 수에만 (막기 무게가 원래대로)');
}

section('피 가져오기 · 마지막 차례');
{
  let s = S({ hands: [[0, 44], [36, 38]], table: [20], deck: [2, 24], cap: [[], [41]] });
  act(s, P(0));
  eq([s.cap[1], s.cap[0].indexOf(41) >= 0], [[], true], '쌍피만 있으면 쌍피를 가져옴');
  s = S({ hands: [[0, 44], [36, 38]], table: [20], deck: [2, 24], cap: [[], [16]] });
  act(s, P(0));
  eq(s.cap[1], [16], '피가 없으면 못 가져옴');
  s = S({ hands: [[0], []], table: [20], deck: [2], cap: [[], [6]] });
  act(s, P(0));
  eq(s.cap[1], [6], '마지막 차례 쪽은 피를 안 받음');
  eq([s.phase, s.result.kind, s.result.carryNext], ['end', 'nagari', 1], '아무도 못 나면 나가리');
  const nx = G.nextRound(s);
  eq([nx.carry, nx.first, nx.round], [1, s.first, 2], '나가리 다음 판: 배수 2배 · 선 그대로');
}

section('폭탄 · 흔들기 · 보너스 피 · 국진');
{
  let s = S({ hands: [[0, 1, 2, 44], [36, 38, 39, 40]], table: [3, 20], deck: [24, 25, 26, 27], cap: [[], [6]] });
  const L = G.legal(s);
  ok(L.indexOf(G.A_BOMB) >= 0, '폭탄 할 수 있음');
  ok(L.indexOf(G.A_SHAKE) < 0, '네 번째가 바닥에 있으면 흔들기 대신 폭탄');
  let ev = act(s, G.A_BOMB);
  ok(has(ev, 'bomb'), '폭탄 알림');
  eq([sorted(s.cap[0]), s.pass[0], s.shake[0], s.hands[0]], [[0, 1, 2, 3, 6], 2, 1, [44]], '폭탄: 네 장 + 피 한 장 · 뒤집기만 2번 · 흔들기로 셈');
  act(s, P(36));
  ok(G.legal(s).indexOf(G.A_PASS) >= 0, '폭탄 뒤 뒤집기만 할 수 있음');
  act(s, G.A_PASS);
  eq([s.pass[0], s.hands[0]], [1, [44]], '뒤집기만: 손패는 그대로');

  s = S({ hands: [[0, 1, 2, 44], [36, 38, 39]], table: [20], deck: [24, 25, 26] });
  ok(G.legal(s).indexOf(G.A_SHAKE) >= 0, '같은 월 세 장이면 흔들 수 있음');
  ev = act(s, G.A_SHAKE);
  ok(has(ev, 'shake'), '흔들기 알림');
  eq([s.shake[0], sorted(s.known[0])], [1, [1, 2]], '흔들기: 남은 두 장이 보임');
  const v1 = G.view(s, 1);
  eq([v1.hands[0].filter(c => c >= 0), v1.hands[0].filter(c => c < 0).length], [[1, 2], 1], '상대 화면엔 흔든 패만 보임');
  act(s, P(36));
  ok(G.legal(s).indexOf(G.A_SHAKE + 1) < 0, '같은 월은 한 번만 흔듦');

  s = S({ bonus: 3, hands: [[48, 44], [36, 38]], table: [20], deck: [24, 25, 26] });
  ev = act(s, P(48));
  eq([s.cap[0], sorted(s.hands[0]), s.turn, s.phase], [[48], [24, 44], 0, 'play'], '손의 보너스 피: 바로 먹고 한 장 받아 계속');

  s = S({ bonus: 3, hands: [[0, 44], [36, 38]], table: [2], deck: [49, 20, 24] });
  ev = act(s, P(0));
  eq([sorted(s.cap[0]), s.table], [[0, 2, 49], [20]], '더미의 보너스 피: 먹고 한 장 더 뒤집음');

  s = S({ rules: { kook: 'choose' }, hands: [[34, 44], [36, 38]], table: [32], deck: [24, 25] });
  act(s, P(34));
  eq(s.phase, 'kook', '국진 \'먹을 때 고르기\' 규칙: 어디에 쓸지 물어봄');
  ev = act(s, G.A_KOOK_P);
  eq([s.kook, G.tally(s, 0).pi, G.tally(s, 0).y], ['P', 3, 0], '국진 → 쌍피');
  s = S({ hands: [[0, 44], [36, 38]], table: [20], deck: [2, 24], cap: [[], [32]], kook: 'P' });
  act(s, P(0));
  eq(s.cap[1], [], '쌍피로 쓴 국진은 피로 뺏길 수 있음');
}

section('고/스톱 · 총통 · 3뻑 · 3인 차례');
{
  const CAP7 = [21, 33, 37, 0, 8, 2, 3, 6, 7, 10, 11, 14, 15, 18];   // 청단 3 + 광 두 장 + 피 9장
  let s = S({ hands: [[28, 44, 45], [36, 38, 39]], table: [30], deck: [24, 25, 26, 27, 34], cap: [CAP7, []] });
  let ev = act(s, P(28));
  eq([G.tally(s, 0).base, s.phase, s.turn], [7, 'goStop', 0], '7점 → 고/스톱');
  ok(has(ev, 'canStop'), '고/스톱 알림');
  ev = act(s, G.A_GO);
  eq([s.go[0], s.lastGo[0], s.turn, s.phase], [1, 7, 1, 'play'], '고: 횟수 · 그때 점수 · 상대 차례');
  act(s, P(36)); act(s, P(44));
  eq([s.turn, s.phase], [1, 'play'], '점수가 안 오르면 다시 안 물어봄');

  s = S({ hands: [[28], [36]], table: [30], deck: [24, 25], cap: [CAP7, []] });
  ev = act(s, P(28));
  eq([s.phase, s.result.kind, s.result.winner, s.result.total], ['end', 'stop', 0, 7], '낼 패가 없으면 저절로 스톱');

  s = S({ hands: [[28, 1], [36, 38]], table: [30], deck: [24, 25, 26], cap: [CAP7, [40]] });
  act(s, P(28)); act(s, G.A_STOP);
  eq([s.result.kind, s.result.winner, s.result.points], ['stop', 0, 7], '스톱하면 판 끝');
  s = S({ hands: [[28, 1], [36, 38]], table: [30], deck: [24, 25, 26], cap: [CAP7, []] });
  act(s, P(28)); act(s, G.A_STOP);
  eq(s.result.points, 14, '광 없는 상대에게 광으로 나면 광박 × 2');

  let found = null;
  for (let seed = 1; seed < 6000 && !found; seed++) { const t = G.create({ players: 2, seed }); if (t.result && t.result.kind === 'chongtong') found = t; }
  ok(found && found.phase === 'end' && G.monthCount(found.hands[found.result.winner]).indexOf(4) >= 0 && found.result.total === 10, '총통: 같은 월 네 장 → 10점으로 바로 이김');

  s = S({ hands: [[0, 44], [36, 38]], table: [2], deck: [3, 24], ppeok: [2, 0] });
  act(s, P(0));
  eq([s.phase, s.result.kind, s.result.total], ['end', 'ppeok3', 7], '3뻑: 바로 이김 (맞고 7점)');

  s = G.setup({ players: 3, hands: [[0, 44], [36, 38], [12, 14]], table: [2], deck: [24, 25, 26, 27, 28, 29] });
  act(s, P(0)); const t1 = s.turn; act(s, P(36)); const t2 = s.turn; act(s, P(12));
  eq([t1, t2, s.turn], [1, 2, 0], '3인 차례: 0 → 1 → 2 → 0');

  s = G.setup({ players: 3, hands: [[1, 44], [36], [12]], table: [0], deck: [24, 25, 26], cap: [[5, 9], [], []] });
  act(s, P(1));
  eq([G.tally(s, 0).base, s.phase], [3, 'goStop'], '3인은 3점이면 고/스톱');
}

// ── 결정성 · 보존 · 숨은 정보 ────────────────────────────
section('결정성 · 카드 보존 · 숨은 정보');
function randomRound(seed, n, bonus, check) {
  const rng = G.makeRng(seed * 7919 + 3);
  const s = G.create({ players: n, bonus, seed });
  const trail = [];
  for (let guard = 0; s.phase !== 'end'; guard++) {
    if (guard > 400) throw new Error('끝나지 않는 판 ' + seed);
    const L = G.legal(s);
    if (!L.length) throw new Error('할 수 있는 행동이 없음 ' + seed + ' ' + s.phase);
    const a = L[Math.floor(rng() * L.length)];
    trail.push(a);
    G.apply(s, a, []);
    if (check) check(s);
  }
  return { s, trail };
}
{
  const a = randomRound(42, 2, 3), b = randomRound(42, 2, 3);
  eq(G.hash(a.s), G.hash(b.s), '같은 씨앗 + 같은 입력 → 같은 지문');
  let s = G.create({ players: 2, bonus: 3, seed: 42 });
  for (const x of a.trail) s = G.step(s, x).state;
  eq(G.hash(s), G.hash(a.s), 'step(순수) 으로 다시 둬도 같은 지문');
  const s0 = G.create({ players: 3, bonus: 2, seed: 9 }), h0 = G.hash(s0);
  G.step(s0, G.legal(s0)[0]);
  eq(G.hash(s0), h0, 'step 은 넣은 상태를 안 바꿈');
  eq(G.hash(JSON.parse(JSON.stringify(a.s))), G.hash(a.s), 'JSON 으로 저장했다 불러도 같음');
  ok(G.hash(G.create({ players: 2, seed: 1 })) !== G.hash(G.create({ players: 2, seed: 2 })), '씨앗이 다르면 다른 판');
  const nx1 = G.nextRound(a.s), nx2 = G.nextRound(b.s);
  eq(G.hash(nx1), G.hash(nx2), '다음 판도 결정적');

  let bad = 0, obsBad = 0, leak = 0, rounds = 0, steps = 0;
  const kinds = {};
  const rngW = G.makeRng(5);
  for (let seed = 1; seed <= 1500; seed++) {
    const n = seed % 3 === 0 ? 3 : 2, bonus = [0, 2, 3][seed % 3];
    const all = JSON.stringify(G.gameCards(bonus));
    const { s } = randomRound(seed, n, bonus, st => {
      steps++;
      const pend = st.phase === 'pickHand' || st.phase === 'pickFlip' ? st.cur.caps : [];
      const cards = sorted([...st.deck, ...st.table, ...st.hands.flat(), ...st.cap.flat(), ...pend]);
      if (JSON.stringify(cards) !== all) bad++;
      if (steps % 7 === 0 && st.phase !== 'end') {
        for (let p = 0; p < st.n; p++) {
          const o = G.obs(st, p);
          if (o.length !== G.OBS_LEN || o.some(x => !Number.isFinite(x))) obsBad++;
          // 같은 view 로 숨은 패만 다시 섞은 판 → 관찰이 똑같아야 함 (숨은 정보가 안 샘)
          const w = G.sampleWorld(G.view(st, p), rngW);
          const o2 = G.obs(w, p);
          for (let i = 0; i < o.length; i++) if (o[i] !== o2[i]) { leak++; break; }
          if (JSON.stringify(G.view(w, p)) !== JSON.stringify(G.view(st, p))) leak++;
        }
      }
    });
    rounds++;
    kinds[s.result.kind] = (kinds[s.result.kind] || 0) + 1;
    if (s.result.winner >= 0 && s.result.points !== s.result.per.reduce((x, l) => x + l.pay, 0)) bad++;
  }
  eq(bad, 0, '무작위 ' + rounds + '판 ' + steps + '걸음: 카드가 늘 정확히 한 번씩');
  eq(obsBad, 0, '관찰 길이 ' + G.OBS_LEN + ' · 숫자만');
  eq(leak, 0, '관찰·view 에 숨은 패가 새지 않음');
  console.log('    무작위 판 결과: ' + JSON.stringify(kinds));
}

// ── 인원에 따른 방식 · 4~5명 광 팔기 ───────────────────────
section('인원 → 방식 (2 맞고 · 3 고스톱 · 4~5 광 팔기) · 자리 돌려 쉬기');
{
  eq([2, 3, 4, 5].map(N => { const p = G.tablePlan(N, 0); return [p.n, p.who.length, p.bench.length]; }), [[2, 2, 0], [3, 3, 0], [3, 3, 1], [3, 3, 2]], '인원별 치는 사람 · 쉬는 사람 수');
  eq([G.tablePlan(2, 7).who, G.tablePlan(3, 7).who], [[0, 1], [0, 1, 2]], '3명 이하는 늘 모두 침');
  eq([0, 1, 2, 3, 4].map(r => G.tablePlan(4, r).bench), [[3], [0], [1], [2], [3]], '4명: 한 명씩 돌아가며 쉼');
  eq([0, 1, 2, 3, 4].map(r => G.tablePlan(5, r).bench), [[3, 4], [0, 1], [2, 3], [4, 0], [1, 2]], '5명: 두 명씩 돌아가며 쉼');
  for (const N of [4, 5]) {
    const cnt = Array(N).fill(0);
    for (let r = 0; r < N; r++) for (const b of G.tablePlan(N, r).bench) cnt[b]++;
    eq(cnt, Array(N).fill(N - 3), N + '명: ' + N + '판에 모두 같은 횟수(' + (N - 3) + '번)씩 쉼');
    let ok2 = true;
    for (let r = 0; r < 20; r++) { const p = G.tablePlan(N, r), all = [...p.who, ...p.bench].sort(); if (JSON.stringify(all) !== JSON.stringify(Array.from({ length: N }, (_, i) => i))) ok2 = false; }
    ok(ok2, N + '명: 치는 사람 + 쉬는 사람 = 모두 한 번씩');
  }
  eq([2, 3, 4, 5, 1, 9].map(N => G.modeOf(N).kind), ['matgo', 'gostop', 'gwangpal', 'gwangpal', 'matgo', 'gwangpal'], '인원이 방식을 정함: 2 맞고 · 3 고스톱 · 4~5 광 팔기');
  eq([G.modeOf(4).bench, G.modeOf(5).bench, G.modeOf(3).bench], [1, 2, 0], '쉬는 사람 수');
  const s4 = G.create({ players: 4, seed: 3 });
  eq([s4.n, s4.N, s4.hands.map(h => h.length), s4.table.length], [3, 4, [7, 7, 7], 6], '4명: 한 판은 3인 고스톱 (7장·바닥 6장)');
  eq(G.thresholdOf(s4.n), 3, '4명: 3점부터 고/스톱');
}

section('광 팔기 (쉬는 사람이 쥔 광을 치는 사람이 삼)');
{
  const sorted2 = a => a.slice().sort((x, y) => x - y);
  const total = st => sorted2([...st.deck, ...st.table, ...st.hands.flat(), ...st.cap.flat(), ...(st.sale ? st.sale.hid : [])]);
  const findSeed = (N, bonus, pred) => { for (let seed = 1; seed < 4000; seed++) { const s = G.create({ players: N, bonus, seed }); if (pred(s)) return seed; } return 0; };
  // 안 팔리면(아무도 안 사면) 더미 아래로 돌아감
  const sd = findSeed(4, 0, s => s.phase === 'buy' && s.sale.offers.length === 1);
  ok(sd > 0, '광을 쥔 쉬는 사람이 있는 판이 나옴 (씨앗 ' + sd + ')');
  let s = G.create({ players: 4, seed: sd, bonus: 0 });
  const off = s.sale.offers[0];
  eq([s.phase, s.turn, s.sale.hid.length, s.deck.length, off.cards.every(c => G.KIND[c] === G.GW)], ['buy', s.first, 7, 14, true], '판이 시작되면 광 팔기부터: 선부터 물음 · 쉬는 사람 7장은 더미 위에서 · 내놓는 건 광뿐');
  eq(total(s), G.gameCards(0), '패가 하나도 빠지지 않고 늘 한 번씩');
  const v = G.view(s, s.turn);
  eq([v.sale.hid.every(c => c === -1), v.sale.offers[0].cards], [true, off.cards], '남에게는 쉬는 사람의 다른 패는 안 보이고 내놓은 광만 보임');
  eq(G.legal(s), [G.A_BUY, G.A_NOBUY], '광 팔기 중엔 사기/안 사기만');
  ok(!G.isLegal(s, G.A_PLAY + s.hands[s.turn][0]), '광 팔기 중엔 패를 못 냄');
  const order = [];
  let ev = act(s, G.A_NOBUY); order.push(s.turn);
  ev = act(s, G.A_NOBUY); order.push(s.turn);
  eq(order, [(s.first + 1) % 3, (s.first + 2) % 3], '안 사면 다음 사람에게 물음 (선 → 다음 → 그다음)');
  ev = act(s, G.A_NOBUY);
  eq([s.phase, s.turn, s.deck.length, s.sale.hid.length, s.cap.flat().length, has(ev, 'unsold'), has(ev, 'saleEnd')], ['play', s.first, 21, 0, 0, true, true], '셋 다 안 사면 광은 안 팔리고 더미로 돌아가 본판 시작');
  eq(total(s), G.gameCards(0), '돌려준 뒤에도 패가 그대로');

  // 사면: 산 사람 먹은 패로 + 값은 광 장수 × 1점
  s = G.create({ players: 4, seed: sd, bonus: 0 });
  const buyer = (s.first + 1) % 3;
  act(s, G.A_NOBUY); ev = act(s, G.A_BUY);
  eq([sorted2(s.cap[buyer]), s.phase, s.turn, s.deck.length, has(ev, 'buy')], [sorted2(off.cards), 'play', s.first, 21 - off.cards.length, true], '사면 광이 산 사람 먹은 패로, 나머지 패는 더미 아래로');
  eq(s.sale.sold, [{ seat: off.seat, buyer, cards: off.cards, price: off.cards.length }], '판 기록: 누가 누구 광을 몇 점에 샀나');
  eq(total(s), G.gameCards(0), '산 뒤에도 패가 그대로');
  ok(G.tally(s, buyer).g === off.cards.length, '산 광은 광 점수에 셈');
  // 값 정산 (이기든 지든 산 사람 → 판 사람)
  const t = G.settle(s, buyer, 'stop');
  eq(t.sale, [{ seat: off.seat, buyer, buyerSeat: s.who[buyer], cards: off.cards, price: off.cards.length }], '정산에 광값이 남음');
  ok(t.sale[0].seat !== t.sale[0].buyerSeat && s.bench.indexOf(t.sale[0].seat) >= 0 && s.who.indexOf(t.sale[0].buyerSeat) >= 0, '판 사람은 쉬는 사람 · 산 사람은 치는 사람');

  // 5명: 쉬는 사람이 둘이라 묶음이 둘 나올 수 있음 → 하나씩 차례로
  const s5 = findSeed(5, 0, st => st.phase === 'buy' && st.sale.offers.length === 2);
  ok(s5 > 0, '5명: 쉬는 두 사람 모두 광이 있는 판이 나옴 (씨앗 ' + s5 + ')');
  s = G.create({ players: 5, seed: s5, bonus: 0 });
  eq([s.deck.length, s.sale.hid.length, s.bench.length], [7, 14, 2], '5명: 쉬는 두 사람 14장을 쥐고 더미엔 7장');
  ev = act(s, G.A_BUY);
  eq([s.phase, s.sale.i, s.turn, s.sale.sold.length], ['buy', 1, s.first, 1], '첫 묶음을 사면 두 번째 묶음을 다시 선부터 물음');
  ev = act(s, G.A_NOBUY); act(s, G.A_NOBUY); act(s, G.A_NOBUY);
  eq([s.phase, s.deck.length + s.cap.flat().length + s.hands.flat().length + s.table.length], ['play', 48], '5명: 끝나고 나면 48장이 한 곳에 하나씩');
  eq(total(s), G.gameCards(0), '5명: 패 보존');
  eq(s.sale.offers[1].cards.every(c => s.deck.indexOf(c) >= 0), true, '5명: 안 팔린 광은 더미로 돌아감');

  // 팔 광이 없으면 바로 본판
  const sn = findSeed(4, 0, st => st.phase === 'play');
  ok(sn > 0, '쉬는 사람에게 광이 없으면 바로 시작');
  s = G.create({ players: 4, seed: sn, bonus: 0 });
  eq([s.phase, s.deck.length, s.sale.hid.length], ['play', 21, 0], '광이 없으면 광 팔기 없이 시작 · 쉬는 패는 더미 아래로');
  eq(total(s), G.gameCards(0), '패 보존 (광 없음)');

  // 판 돌리기: 4명·5명 무작위 · AI 수천 판
  let bad = 0, rounds = 0, offered = 0, buys = 0;
  const kinds = {};
  for (let seed = 1; seed <= 1200; seed++) {
    const N = seed % 2 ? 4 : 5, bonus = [0, 2, 3][seed % 3];
    const all = JSON.stringify(G.gameCards(bonus));
    const rng = G.makeRng(seed * 31 + 7);
    let st = G.create({ players: N, bonus, seed }), chain = 0;
    for (; chain < 3; chain++) {
      for (let guard = 0; st.phase !== 'end'; guard++) {
        if (guard > 450) throw new Error('끝나지 않는 판');
        const pend = st.phase === 'pickHand' || st.phase === 'pickFlip' ? st.cur.caps : [];
        if (JSON.stringify(sorted2([...st.deck, ...st.table, ...st.hands.flat(), ...st.cap.flat(), ...pend, ...(st.sale ? st.sale.hid : [])])) !== all) bad++;
        const L = G.legal(st);
        const a = seed % 4 < 2 ? L[Math.floor(rng() * L.length)] : AI.choose(G.view(st, st.turn), ['easy', 'normal'][seed % 2], { rng });
        if (!G.isLegal(st, a)) { bad++; break; }
        G.apply(st, a, []);
      }
      rounds++; kinds[st.result.kind] = (kinds[st.result.kind] || 0) + 1;
      if (st.sale) offered += st.sale.offers.length;
      const r = st.result;
      if (r.sale) for (const x of r.sale) { buys++; if (x.price !== x.cards.length) bad++; }
      if (r.winner >= 0 && r.points !== r.per.reduce((x, l) => x + l.pay, 0)) bad++;
      const prev = st;
      st = G.nextRound(st);
      // 다음 판: 쉬는 사람이 바뀜 · 선은 이전 판 이긴 사람(들어올 수 있으면)
      const pl = G.tablePlan(N, prev.round);
      if (JSON.stringify(st.who) !== JSON.stringify(pl.who) || JSON.stringify(st.bench) !== JSON.stringify(pl.bench)) bad++;
      if (st.who.indexOf(prev.who[r.winner >= 0 ? r.winner : prev.first]) >= 0 && st.who[st.first] !== prev.who[r.winner >= 0 ? r.winner : prev.first]) bad++;
    }
  }
  eq(bad, 0, '4~5명 무작위/AI ' + rounds + '판: 패 보존 · 광값 · 다음 판 자리 · 합계 맞음');
  ok(offered > 100 && buys > 20 && buys < offered, '광이 나오고 일부는 팔림 (내놓은 묶음 ' + offered + ' · 팔린 ' + buys + ')');
  console.log('    4~5명 결과: ' + JSON.stringify(kinds) + ' · 광 묶음 ' + offered + '개 중 ' + buys + '개 팔림');

  // 결정성 + 숨은 정보: 같은 씨앗·같은 입력 → 같은 지문, view/obs 에 쉬는 사람 패가 안 샘
  const run = () => { let st = G.create({ players: 5, seed: s5, bonus: 0 }), r2 = G.makeRng(11); while (st.phase !== 'end') { const L = G.legal(st); G.apply(st, L[Math.floor(r2() * L.length)], []); } return st; };
  eq(G.hash(run()), G.hash(run()), '5명: 같은 씨앗 + 같은 입력 → 같은 지문');
  s = G.create({ players: 5, seed: s5, bonus: 0 });
  const w1 = G.step(s, G.A_BUY).state;
  eq(G.hash(s) === G.hash(G.create({ players: 5, seed: s5, bonus: 0 })), true, 'step 은 넣은 상태를 안 바꿈 (광 팔기)');
  eq(JSON.stringify(w1.cap.flat().length), String(s.sale.offers[0].cards.length), '순수 step 으로 사도 같음');
  let leak = 0;
  for (const p of [0, 1, 2]) { const o = G.obs(s, p); if (o.length !== G.OBS_LEN || o.some(x => !Number.isFinite(x))) leak++; }
  eq(leak, 0, '광 팔기 중에도 관찰은 길이·숫자 정상');
  eq(G.actionLabel(G.A_BUY) + '/' + G.actionLabel(G.A_NOBUY), '광 사기/안 사기', '행동 이름');
}

// ── 우리 집 규칙 ────────────────────────────────────────
section('우리 집 규칙: 검증 · 기본값 · 묶음');
{
  const D = G.defaultRules();
  eq(G.normRules(), D, '규칙이 없으면 전부 기본값');
  eq(G.normRules({}), D, '빈 규칙도 기본값');
  ok(G.RULE_DEFS.length >= 30, '규칙 항목이 서른 개 넘게 있음 (' + G.RULE_DEFS.length + ')');
  eq([G.normRules({ goMatgo: 99 }).goMatgo, G.normRules({ goMatgo: -3 }).goMatgo, G.normRules({ goMatgo: 'abc' }).goMatgo, G.normRules({ goMatgo: '9' }).goMatgo, G.normRules({ goMatgo: 8.6 }).goMatgo], [30, 1, 7, 9, 9], '숫자는 범위 안으로 · 글자는 기본값 · 반올림');
  eq([G.normRules({ chongtong: 'zzz' }).chongtong, G.normRules({ goBonus: 'plus' }).goBonus, G.normRules({ bonus: '3' }).bonus, G.normRules({ bonus: 4 }).bonus], ['score', 'plus', 3, 2], '고르는 값은 목록 안에서만 (숫자 글자도 맞춰 줌 · 틀린 값은 기본 2장)');
  eq([G.normRules({ pibak: false }).pibak, G.normRules({ pibak: 'false' }).pibak, G.normRules({ pibak: 0 }).pibak, G.normRules({ pibak: 1 }).pibak, G.normRules({ pibak: null }).pibak], [false, false, false, true, true], '켬/끔 값 정리');
  ok(!('hacked' in G.normRules({ hacked: 1 })), '모르는 항목은 버림');
  eq(G.normRules(G.normRules({ maxPts: 12, chipPer: 50 })), G.normRules({ maxPts: 12, chipPer: 50 }), '다시 정리해도 그대로');
  eq(G.RULE_PRESETS.map(p => G.matchPreset(G.presetRules(p.id))), G.RULE_PRESETS.map(p => p.id), '묶음마다 자기 자신으로 알아봄 (서로 달라서 헷갈리지 않음)');
  eq(G.matchPreset({}), 'basic', '아무것도 안 바꾸면 기본 묶음');
  eq(G.matchPreset({ pibak: false }), '', '하나만 바꾸면 어느 묶음도 아님');
  eq(G.matchPreset({ chipPer: 50 }), 'basic', '점당 칩은 묶음 판별에 안 들어감');
  eq(G.diffRules({}), [], '기본이면 바뀐 규칙 없음');
  eq(G.diffRules({ pibak: false, shakeX: 3, chongtong: 'win', ppeokFirst: 5 }).map(x => x.label + ':' + x.text), ['피박:끔', '흔들기·폭탄 배수:3배', '총통:승리', '첫뻑 위로금:5점'], '바뀐 규칙만 글로');
  const s0 = G.create({ players: 2, seed: 5 });
  eq(s0.rules, D, '새 판의 규칙은 기본값 (옛 호출 그대로)');
  eq(G.create({ players: 2, seed: 5, rules: { pibak: false } }).rules.pibak, false, '새 판에 규칙을 실어 보냄');
  const s1 = G.create({ players: 3, seed: 8, rules: { gobak: false } });
  eq(G.nextRound(s1).rules.gobak, false, '다음 판도 같은 규칙');
  eq(G.fastClone(s1).rules, s1.rules, '빠른 복사 · view 도 규칙 유지');
  eq(G.view(s1, 0).rules.gobak, false, 'view 에 규칙이 보임');
  eq(G.hash(G.create({ players: 2, seed: 5 })), G.hash(G.create({ players: 2, seed: 5, rules: {} })), '규칙을 안 줘도 {} 줘도 같은 판');
}

section('우리 집 규칙: 고/스톱 기준 · 고 보너스 · 고박');
{
  const CAP7 = [21, 33, 37, 0, 8, 2, 3, 6, 7, 10, 11, 14, 15, 18];   // 청단 3 + 광 두 장 + 피 9장 = 7점
  const play7 = rules => { const s = S({ rules, hands: [[28, 44, 45], [36, 38, 39]], table: [30], deck: [24, 25, 26, 27, 34], cap: [CAP7, []] }); act(s, P(28)); return s; };
  eq(play7({}).phase, 'goStop', '맞고 기본 7점에서 고/스톱');
  let s = play7({ goMatgo: 8 });
  eq([G.tally(s, 0).base, s.phase], [7, 'play'], '맞고 기준 8점이면 7점에선 계속 진행');
  eq(play7({ goMatgo: 5 }).phase, 'goStop', '맞고 기준 5점이면 7점에서도 고/스톱');
  eq([G.thresholdOf(2, G.normRules({ goMatgo: 9 })), G.thresholdOf(3, G.normRules({ goMatgo: 9 })), G.thresholdOf(3, G.normRules({ go3: 5 })), G.thresholdOf(2)], [9, 3, 5, 7], '기준 점수 함수');
  const t3 = rules => { const s = G.setup({ players: 3, rules, hands: [[1, 44], [36], [12]], table: [0], deck: [24, 25, 26], cap: [[5, 9], [], []] }); act(s, P(1)); return s; };
  eq(t3({}).phase, 'goStop', '3인 기본 3점에서 고/스톱');
  eq(t3({ go3: 4 }).phase, 'play', '3인 기준 4점이면 3점에선 계속');
  eq(t3({ go3: 2 }).phase, 'goStop', '3인 기준 2점이면 고/스톱');
  s = G.create({ players: 4, seed: 3, rules: { go3: 6 } });
  eq(G.thresholdOf(s.n, s.rules), 6, '4~5명 광 팔기도 3인 기준을 따름');

  eq([0, 1, 2, 3, 4].map(g => G.goTotal(7, g, 'std')), [7, 8, 9, 20, 44], '고 보너스 기본: 1고 +1 · 2고 +2 · 3고부터 (점수+고)×2^(고-2)');
  eq([0, 1, 2, 3, 4].map(g => G.goTotal(7, g, 'plus')), [7, 8, 9, 10, 11], '고마다 +1점');
  eq([0, 1, 2, 3, 4].map(g => G.goTotal(7, g, 'double')), [7, 14, 28, 56, 112], '고마다 두 배');
  eq([0, 1, 2, 3, 4].map(g => G.goTotal(7, g, 'none')), [7, 7, 7, 7, 7], '고 보너스 없음');
  eq(G.goTotal(7, 3), G.goTotal(7, 3, 'std'), '방식을 안 주면 기본');
  const ST = (rules, o) => G.settle(S(Object.assign({ rules }, o)), 0, 'stop');
  const goCap = [[1, 5, 9, 0, 8, 28], [40]];
  eq(['std', 'plus', 'double', 'none'].map(m => ST({ goBonus: m }, { cap: goCap, go: [3, 0] }).total), [18, 9, 48, 6], '정산: 3고 홍단+삼광 6점 → 기본 18 · +1씩 9 · ×2씩 48 · 없음 6');
  const r = ST({ goBonus: 'double' }, { cap: goCap, go: [2, 0] });
  eq([r.total, r.items.find(i => /고$/.test(i.k)).x], [24, 4], '고마다 두 배: 내역에 ×4');
  eq(ST({ gobak: false }, { cap: [[1, 5, 9], [0]], go: [0, 1] }).per[0].pay, 3, '맞고 고박 끔: 고했다 져도 그대로');
  eq(ST({ gobakX: 3 }, { cap: [[1, 5, 9], [0]], go: [0, 1] }).per[0].pay, 9, '맞고 고박 3배');
  eq(ST({ gobakX: 1 }, { cap: [[1, 5, 9], [0]], go: [0, 1] }).per[0].pay, 3, '고박 1배면 배수 없음');
  const g3 = rules => G.settle(G.setup({ players: 3, rules, cap: [[1, 5, 9], [0], [8]], go: [0, 1, 0], goSeq: [1] }), 0, 'stop');
  eq([g3({}).per.map(x => x.pay), g3({ gobak: false }).per.map(x => x.pay)], [[6, 0], [3, 3]], '3인 고박 끔: 각자 자기 몫만');
}

section('우리 집 규칙: 피박 · 광박 · 멍박 · 흔들기 배수');
{
  const ST = (rules, o) => G.settle(S(Object.assign({ rules }, o)), 0, 'stop').per[0].pay;
  const pibakCap = { cap: [PIS, [22, 23, 26, 27, 30]] };
  eq([ST({}, pibakCap), ST({ pibak: false }, pibakCap), ST({ pibakX: 3 }, pibakCap), ST({ pibakX: 1 }, pibakCap)], [2, 1, 3, 1], '피박: 기본 2 · 끔 1 · 3배 3 · 1배 1');
  const gwangCap = { cap: [[0, 8, 28], [2]] };
  eq([ST({}, gwangCap), ST({ gwangbak: false }, gwangCap), ST({ gwangbakX: 3 }, gwangCap), ST({ gwangbakX: 4, pibak: false }, gwangCap)], [6, 3, 9, 12], '광박: 기본 6 · 끔 3 · 3배 9 · 4배 12');
  const meongCap = { cap: [[4, 12, 16, 20, 24, 36, 45], [0]] };
  eq([ST({}, meongCap), ST({ meongbak: false }, meongCap), ST({ meongbakX: 3 }, meongCap), ST({ meongbakX: 1 }, meongCap)], [6, 3, 9, 3], '멍박(열끗 7장): 기본 6 · 끔 3 · 3배 9 · 1배 3');
  const shk = { cap: [[1, 5, 9], [0]] };
  const sh = (rules, n) => ST(rules, Object.assign({ shake: [n, 0] }, shk));
  eq([sh({}, 1), sh({ shakeX: 3 }, 1), sh({ shakeX: 3 }, 2), sh({ shakeX: 1 }, 2), sh({ shakeX: 4 }, 1)], [6, 9, 27, 3, 12], '흔들기·폭탄: 2배 6 · 3배 9 · 두 번 27 · 1배 3 · 4배 12');
  const both = { cap: [[0, 8, 28, ...PIS], [22]], shake: [1, 0] };
  eq([ST({}, both), ST({ pibakX: 3, gwangbakX: 3, shakeX: 3 }, both)], [32, 4 * 27], '배수가 겹치면 각자 곱함');
  const rr = G.settle(S({ rules: { pibak: false, gwangbak: false }, cap: [[0, 8, 28], [2]] }), 0, 'stop');
  eq(rr.per[0].mults, [], '꺼진 박은 내역에도 안 나옴');
}

section('우리 집 규칙: 총통 · 쓰리뻑 · 국진 · 보너스 피');
{
  let seed = 0;
  for (let sd = 1; sd < 6000 && !seed; sd++) { const t = G.create({ players: 2, seed: sd }); if (t.result && t.result.kind === 'chongtong') seed = sd; }
  ok(seed > 0, '총통이 나오는 씨앗을 찾음 (' + seed + ')');
  const c1 = G.create({ players: 2, seed }), c2 = G.create({ players: 2, seed, rules: { chongtong: 'win' } }), c3 = G.create({ players: 2, seed, rules: { chongtong: 'off' } });
  eq([c1.result.total, c1.result.items[0].k], [10, '총통'], '총통 기본: 10점');
  eq([c2.result.kind, c2.result.total, c2.result.winner === c1.result.winner], ['chongtong', 7, true], '총통 승리: 맞고 기준 점수(7점)로 바로 이김');
  eq([c3.result, c3.phase, c3.hands.flat().length], [null, 'play', 20], '총통 안 씀: 그냥 계속 침');
  let seed3 = 0;
  for (let sd = 1; sd < 6000 && !seed3; sd++) { const t = G.create({ players: 3, seed: sd }); if (t.result && t.result.kind === 'chongtong') seed3 = sd; }
  eq(G.create({ players: 3, seed: seed3, rules: { chongtong: 'win' } }).result.total, 3, '3인 총통 승리: 3점');
  eq(G.create({ players: 3, seed: seed3, rules: { chongtong: 'win', go3: 5 } }).result.total, 5, '총통 승리 점수는 고/스톱 기준을 따름');

  const pp = rules => { const s = S({ rules, hands: [[0, 44], [36, 38]], table: [2], deck: [3, 24], ppeok: [2, 0] }); act(s, P(0)); return s; };
  eq([pp({}).result.total, pp({}).result.kind], [7, 'ppeok3'], '쓰리뻑 기본: 바로 이김, 맞고 7점');
  eq(pp({ ppeok3Pts: 12 }).result.total, 12, '쓰리뻑 점수 12점');
  eq(pp({ ppeok3Pts: 12 }).result.per[0].pay, 12, '쓰리뻑 점수대로 진 사람이 냄');
  let s = pp({ ppeok3: 'off' });
  eq([s.phase, s.result, s.ppeok[0]], ['play', null, 3], '쓰리뻑 안 씀: 뻑 세 번째여도 계속');

  const kk = rules => { const s = S({ rules, hands: [[34, 44], [36, 38]], table: [32], deck: [24, 25] }); act(s, P(34)); return s; };
  eq(kk({}).phase, 'kook', '국진 기본: 먹을 때 고르기 (11-01 밤 베니 님)');
  eq([kk({ kook: 'auto' }).phase, kk({ kook: 'auto' }).kook], ['play', ''], '국진 자동: 안 물어봄, 정하지 않은 채로');
  eq(kk({ kook: 'choose' }).phase, 'kook', '국진 먹을 때 고르기: 물어봄');
  // 자동: 점수 셀 때 가진 사람에게 나은 쪽 — 열끗 4장 + 국진이면 열끗 5장(1점), 피 8장 + 국진이면 쌍피로 피 10장(1점)
  eq(G.tally(S({ cap: [[32, 4, 12, 16, 20], []] }), 0).kookAs, 'Y', '국진 자동: 열끗이 나으면 열끗');
  eq(G.tally(S({ cap: [[32, ...PIS.slice(0, 3)], []] }), 0).kookAs, 'P', '국진 자동: 점수가 같으면 쌍피');
  eq([G.tally(S({ cap: [[32, ...PIS.slice(0, 8)], []] }), 0).kookAs, G.tally(S({ cap: [[32, ...PIS.slice(0, 8)], []] }), 0).base], ['P', 1], '국진 자동: 쌍피가 나으면 쌍피 (피 10장 1점)');
  // 진 사람: 피박을 피하는 쪽으로 (피 6장 + 국진 → 쌍피로 8장이면 피박 아님)
  {
    const t = S({ cap: [[...PIS, 22, 23, 26, 27], [32, 34, 35, 38, 39, 42, 43]] });
    const r = G.settle(t, 0, 'stop');
    eq([r.kookAs && r.kookAs.as, r.per[0].mults.some(m => m.k === '피박')], ['P', false], '국진 자동: 진 사람은 피박을 피하는 쪽 (쌍피)');
  }
  s = kk({ kook: 'yeol' });
  eq([s.phase, s.kook, G.tally(s, 0).y, G.tally(s, 0).pi], ['play', 'Y', 1, 1], '국진 열끗 고정: 안 물어봄 (국진은 열끗, 피 1장은 다른 패)');
  s = kk({ kook: 'ssang' });
  eq([s.phase, s.kook, G.tally(s, 0).y, G.tally(s, 0).pi], ['play', 'P', 0, 3], '국진 쌍피 고정: 안 물어봄 (피 3)');
  eq(G.create({ players: 2, seed: 3, rules: { kook: 'ssang' } }).kook, 'P', '새 판부터 쌍피로 정해 둠');

  s = G.create({ players: 2, seed: 77, rules: { bonus: 3 } });
  eq([s.bonus, s.rules.bonus, G.gameCards(s.bonus).length], [3, 3, 51], '규칙의 보너스 피 3장이 판에 반영');
  s = G.create({ players: 2, seed: 77, bonus: 2, rules: { bonus: 3 } });
  eq([s.bonus, s.rules.bonus], [2, 2], '옛 호출(bonus 따로)이 있으면 그게 먼저');
  s = G.create({ players: 2, seed: 77, rules: { bonus: 0 } });
  eq(s.bonus, 0, '보너스 피 없음');
  eq(G.nextRound(G.create({ players: 2, seed: 77, rules: { bonus: 2 } })).bonus, 2, '다음 판도 보너스 피 유지');
}

section('우리 집 규칙: 첫뻑 · 연뻑 위로금 (뻑한 사람이 받음)');
{
  const mk = (rules, o) => S(Object.assign({ rules, hands: [[0, 44], [1, 38]], table: [2], deck: [3, 24, 25, 26], cap: [[6], [7]] }, o));
  let s = mk({});
  let ev = act(s, P(0));
  eq(s.side, [{ from: 1, to: 0, pts: 3, k: '첫뻑' }], '첫 차례에 뻑: 다른 사람이 위로금 3점(기본)을 줌');
  ok(ev.some(e => e.t === 'ppeok' && e.tag === '첫뻑' && e.pay === 3), '뻑 알림에 첫뻑 위로금');
  act(s, P(1));
  eq(s.side.length, 1, '그 뻑 더미를 먹어도 위로금은 더 안 생김');
  const fin = G.settle(s, 1, 'stop');
  eq(fin.side, [{ from: 1, to: 0, fromSeat: 1, toSeat: 0, pts: 3, k: '첫뻑' }], '정산에 따로 남음 (판 점수와 별개)');

  s = mk({ ppeokFirst: 5 }, { players: 3, hands: [[0, 44], [36, 38], [40, 42]], cap: [[], [6], [7]] });
  act(s, P(0));
  eq(s.side, [{ from: 1, to: 0, pts: 5, k: '첫뻑' }, { from: 2, to: 0, pts: 5, k: '첫뻑' }], '3인: 나머지 두 사람이 5점씩');

  // 첫 바퀴가 지난 뒤의 뻑은 첫뻑이 아님
  s = S({ hands: [[44, 40, 0], [37, 38, 39]], table: [2], deck: [30, 31, 3, 24, 25, 26], cap: [[6], [7]] });
  act(s, P(44)); act(s, P(38)); act(s, P(0));
  eq([s.ppeok[0], s.side], [1, []], '두 번째 차례의 뻑은 첫뻑 아님');

  s = mk({ ppeokFirst: 0 }); act(s, P(0));
  eq(s.side, [], '첫뻑 0점이면 위로금 없음');

  // 연뻑: p0 뻑 → p1 평범 → p0 또 뻑 (첫뻑은 끄고 봄)
  const yeon = rules => S({ rules, hands: [[0, 4, 44], [36, 6, 38]], table: [2, 5], deck: [3, 24, 7, 25, 26, 27], cap: [[], [9, 10]] });
  s = yeon({ ppeokFirst: 0, ppeokYeon: 5 });
  act(s, P(0));
  eq([s.side, s.streak[0]], [[], 1], '첫 뻑은 연뻑이 아님 (연속 1)');
  act(s, P(36));
  eq(s.streak[0], 1, '남의 차례가 끼어도 내 연속은 그대로');
  act(s, P(4));
  eq([s.ppeok[0], s.side], [2, [{ from: 1, to: 0, pts: 5, k: '연뻑' }]], '연달아 두 번째 뻑: 연뻑 위로금 5점');
  s = yeon({ ppeokFirst: 0, ppeokYeon: 5 });
  act(s, P(0)); act(s, P(36)); act(s, P(44));
  eq([s.streak[0], s.phase], [0, 'play'], '뻑 없는 차례가 끼면 연속이 끊김');
}

section('우리 집 규칙: 피 뺏기 장수');
{
  const run = (rules, o, card) => { const s = S(Object.assign({ rules }, o)); const ev = act(s, P(card)); return { s, ev }; };
  const jj = { hands: [[0, 44], [36, 38]], table: [20], deck: [2, 24], cap: [[], [6, 7, 10, 11]] };
  eq([{}, { stealJjok: 2 }, { stealJjok: 3 }, { stealJjok: 0 }].map(r => run(r, jj, 0).s.cap[1].length), [3, 2, 1, 4], '쪽: 기본 1 · 2장 · 3장 · 0장(안 뺏음)');
  const td = { hands: [[0, 44], [36, 38]], table: [2, 3, 20], deck: [1, 24], cap: [[], [6, 7, 10, 11]] };
  eq([{}, { stealTtadak: 2 }, { stealTtadak: 0 }].map(r => run(r, td, 0).s.cap[1].length), [3, 2, 4], '따닥: 기본 1 · 2장 · 0장');
  const sw = { hands: [[0, 44], [36, 38]], table: [2, 20], deck: [21, 24], cap: [[], [6, 7, 10, 11]] };
  eq([{}, { stealSweep: 2 }, { stealSweep: 0 }].map(r => run(r, sw, 0).s.cap[1].length), [3, 2, 4], '싹쓸이: 기본 1 · 2장 · 0장');
  ok(run({ stealSweep: 0 }, sw, 0).ev.some(e => e.t === 'sweep' && e.steal === 0), '피를 안 뺏어도 싹쓸이 알림은 나옴');
  // 쌍피는 2장 몫 (10-31): 피 47(12월 쌍피)·41(11월 쌍피) 와 일반피 6·7
  const swd = (cap1, r) => run(Object.assign({ stealSweep: 2 }, r || {}), Object.assign({}, sw, { cap: [[], cap1] }), 0).s;
  eq(swd([41, 6, 7]).cap[1].slice().sort((x, y) => x - y), [6, 7], '2장 몫 뺏기: 쌍피 한 장으로 (일반피 두 장은 남음)');
  eq(swd([6, 41]).cap[1], [6], '2장 몫: 쌍피가 있으면 쌍피 한 장');
  eq(swd([6, 7]).cap[1], [], '2장 몫: 쌍피가 없으면 일반피 두 장');
  eq(run({}, Object.assign({}, sw, { cap: [[], [41]] }), 0).s.cap[1], [], '1장 몫인데 쌍피뿐이면 쌍피를 줌');
  eq(run({}, Object.assign({}, sw, { cap: [[], [41, 6]] }), 0).s.cap[1], [41], '1장 몫: 일반피부터');
  const bm = { hands: [[0, 1, 2, 44], [36, 38, 39, 40]], table: [3, 20], deck: [24, 25, 26, 27], cap: [[], [6, 7, 10, 11]] };
  eq([{}, { stealBomb: 2 }, { stealBomb: 0 }].map(r => { const s = S(Object.assign({ rules: r }, bm)); act(s, G.A_BOMB); return s.cap[1].length; }), [3, 2, 4], '폭탄: 기본 1 · 2장 · 0장');
  const eat = rules => { const s = S({ rules, hands: [[0, 44], [1, 38]], table: [2], deck: [3, 24, 25, 26], cap: [[6, 7, 10], [14]] }); act(s, P(0)); act(s, P(1)); return s.cap[0].length; };
  eq([eat({}), eat({ stealEat: 2 }), eat({ stealEat: 0 })], [2, 1, 3], '남의 뻑 먹기: 기본 1장 · 2장 · 0장');
  const self = rules => { const s = S({ rules, hands: [[0, 1, 44], [36, 38, 39]], table: [2], deck: [3, 24, 25, 26, 27], cap: [[], [6, 7, 10]] }); act(s, P(0)); act(s, P(38)); act(s, P(1)); return s.cap[1].length; };
  eq([self({}), self({ stealSelf: 3 }), self({ stealSelf: 1 }), self({ stealSelf: 0 })], [1, 0, 2, 3], '자뻑 먹기: 기본 2장 · 3장 · 1장 · 0장');
  // 마지막 차례는 여전히 안 뺏음
  const last = S({ rules: { stealJjok: 3 }, hands: [[0], []], table: [20], deck: [2], cap: [[], [6]] });
  act(last, P(0));
  eq(last.cap[1], [6], '마지막 차례는 몇 장이든 안 뺏음');
}

section('우리 집 규칙: 나가리 · 점수 상한 · 광 팔기');
{
  const ST = (rules, o) => G.settle(S(Object.assign({ rules }, o)), 0, 'stop');
  const cp = { cap: [[1, 5, 9], [0]] };
  eq([ST({}, Object.assign({ carry: 1 }, cp)).per[0].pay, ST({ nagariX: 3 }, Object.assign({ carry: 2 }, cp)).per[0].pay, ST({ nagariX: 1 }, Object.assign({ carry: 2 }, cp)).per[0].pay, ST({ nagariX: 4 }, Object.assign({ carry: 1 }, cp)).per[0].pay], [6, 27, 3, 12], '나가리 배수: 기본 2배 · 3배 두 번 27 · 1배 3 · 4배 12');
  eq(ST({ nagariX: 1 }, Object.assign({ carry: 1 }, cp)).mults, [], '배수 1이면 내역에도 안 나옴');
  const nag = rules => { const s = S({ rules, hands: [[0], []], table: [20], deck: [2], cap: [[], []] }); act(s, P(0)); return s; };
  const n1 = nag({ nagariX: 3 });
  eq([n1.result.kind, n1.result.carryNext, n1.result.nextMult], ['nagari', 1, 3], '나가리 뒤 다음 판 배수 3');
  eq(G.nextRound(n1).carry, 1, '다음 판에 나가리 1칸');
  const chain = (rules, k) => { const s = S({ rules, hands: [[0], []], table: [20], deck: [2], cap: [[], []], carry: k }); act(s, P(0)); return [s.result.carryNext, s.result.nextMult]; };
  eq([chain({}, 2), chain({}, 3), chain({ nagariMax: 5 }, 4), chain({ nagariMax: 1 }, 1), chain({ nagariMax: 0 }, 0)], [[3, 8], [3, 8], [5, 32], [1, 2], [0, 1]], '연속 나가리 한도: 기본 3(8배) · 5까지 32배 · 1까지 · 0이면 안 쌓음');
  eq(S({ rules: { nagariMax: 1 }, carry: 3 }).carry, 1, '새 판의 나가리 칸도 한도 안으로');
  eq(G.carryMult(S({ rules: { nagariX: 3 }, carry: 2 })), 9, '나가리 배수 함수');

  // 최대 점수 상한
  const big = { cap: [[0, 8, 28, ...PIS], [22]], shake: [1, 0] };
  eq([ST({}, big).per[0].pay, ST({ maxPts: 20 }, big).per[0].pay, ST({ maxPts: 100 }, big).per[0].pay], [32, 20, 32], '점수 상한: 없음 32 · 20점이면 20 · 100점이면 그대로');
  const cr = ST({ maxPts: 20 }, big);
  eq([cr.capped, cr.points, cr.per[0].mults[cr.per[0].mults.length - 1].k], [true, 20, '상한 20점'], '상한에 걸린 판 표시 · 이긴 사람이 받는 점도 상한');
  eq(ST({ maxPts: 20 }, { cap: [[1, 5, 9], [0]] }).capped, false, '상한 안이면 걸림 없음');
  const t3 = G.settle(G.setup({ players: 3, rules: { maxPts: 10 }, cap: [[0, 8, 28, 40, 44], [2], [3]], go: [0, 1, 0], goSeq: [1] }), 0, 'stop');
  eq(t3.per.map(x => x.pay), [10, 0], '3인 고박 몫도 상한 안');
  eq(G.settle(S({ rules: { maxPts: 5, ppeok3Pts: 12 } }), 0, 'ppeok3').per[0].pay, 5, '쓰리뻑 점수에도 상한');

  // 광 팔기
  const findSeed = (N, pred, rules) => { for (let seed = 1; seed < 4000; seed++) { const s = G.create({ players: N, seed, rules: Object.assign({ bonus: 0 }, rules) }); if (pred(s)) return seed; } return 0; };
  const off = findSeed(4, s => s.phase === 'buy' && s.sale.offers.length === 1, {});
  ok(off > 0, '광 팔기 판 찾음');
  let s = G.create({ players: 4, seed: off, rules: { saleOn: false, bonus: 0 } });
  eq([s.sale, s.phase, s.deck.length, s.bench.length], [null, 'play', 21, 1], '광 팔기 끔: 쉬는 사람은 패 없이 쉬기만 · 더미는 그대로');
  eq(sorted([...s.deck, ...s.table, ...s.hands.flat(), ...s.cap.flat()]), G.gameCards(0), '광 팔기 끄면 48장이 판에');
  const price = (rules, skip) => { const t = G.create({ players: 4, seed: off, rules: Object.assign({ bonus: 0 }, rules) }); const cards = t.sale.offers[0].cards.length; for (let i = 0; i < skip; i++) act(t, G.A_NOBUY); act(t, G.A_BUY); return [t.sale.sold[0].price, cards]; };
  const p2 = price({ salePrice: 2 }, 0);
  eq(p2[0], p2[1] * 2, '광 한 장 2점');
  eq(price({ salePrice: 0 }, 0)[0], 0, '광 공짜');
  const p5 = price({ salePrice: 5 }, 1);
  eq(p5[0], p5[1] * 5, '광 한 장 5점 (둘째 사람이 삼)');
  const sold = G.create({ players: 4, seed: off, rules: { salePrice: 3, bonus: 0 } }); act(sold, G.A_BUY);
  eq(G.settle(sold, sold.sale.sold[0].buyer, 'stop').sale[0].price, sold.sale.sold[0].cards.length * 3, '정산에 규칙대로 값이 남음');
  // 살 수 있는 사람
  const dl = G.create({ players: 4, seed: off, rules: { saleWho: 'dealer', bonus: 0 } });
  eq([dl.phase, dl.turn], ['buy', dl.first], '선만 살 수 있음: 선에게만 물음');
  const ev = act(dl, G.A_NOBUY);
  eq([dl.phase, dl.turn, ev.some(e => e.t === 'unsold')], ['play', dl.first, true], '선이 안 사면 바로 안 팔림');
  const ot = G.create({ players: 4, seed: off, rules: { saleWho: 'others', bonus: 0 } });
  eq([ot.phase, ot.turn], ['buy', (ot.first + 1) % 3], '선 빼고: 선 다음 사람부터 물음');
  eq(G.askers(ot), [(ot.first + 1) % 3, (ot.first + 2) % 3], '묻는 순서');
  act(ot, G.A_NOBUY);
  eq(ot.turn, (ot.first + 2) % 3, '그다음 사람');
  act(ot, G.A_NOBUY);
  eq([ot.phase, ot.cap[ot.first]], ['play', []], '선은 끝까지 안 물어봄');
}

section('우리 집 규칙: 칩 정산 (점수 변화의 합은 늘 0)');
{
  let s = null;
  for (let seed = 1; seed < 4000 && !s; seed++) { const t = G.create({ players: 4, seed }); if (t.phase === 'buy' && t.sale.offers.length === 1) s = t; }
  act(s, G.A_BUY);
  const buyer = s.sale.sold[0].buyer, seller = s.sale.sold[0].seat, price = s.sale.sold[0].price;
  const w = (buyer + 1) % 3;
  s.cap[w] = [13, 17, 25, 21, 33, 37];            // 초단 + 청단 = 6점
  s.result = G.settle(s, w, 'stop'); s.phase = 'end';
  const d = G.pointDeltas(s);
  eq(d.reduce((a, b) => a + b, 0), 0, '합이 0');
  eq(d.length, 4, '쉬는 사람 자리까지 4칸');
  eq(d[seller], price, '쉬는 사람은 광값을 받음');
  eq(d[s.who[w]], s.result.points, '이긴 사람은 받는 점 그대로');
  eq(d[s.who[buyer]], -price - s.result.per.find(l => l.p === buyer).pay, '광을 산 사람은 광값 + 진 점수');
  // 첫뻑 (나가리여도 주고받음)
  const f = S({ rules: { ppeokFirst: 3 }, hands: [[0], []], table: [2], deck: [3], cap: [[], []] });
  f.side.push({ from: 0, to: 1, pts: 3, k: '첫뻑' });
  f.result = G.settle(f, -1, 'nagari');
  eq(G.pointDeltas(f), [-3, 3], '나가리여도 첫뻑 보너스는 주고받음');
}

// 규칙을 무작위로 섞어 수천 판: 카드 보존 · 합계 0 · 점수 == 낸 합 · 상한 · 오류 없음
section('우리 집 규칙: 무작위 규칙 × 무작위 판 (오류 없음 · 합계 0 · 카드 보존)');
{
  let bad = 0, rounds = 0, zero = 0, capHit = 0, sides = 0;
  const kinds = {};
  const rr = G.makeRng(2024);
  const randRules = () => {
    const r = {};
    for (const d of G.RULE_DEFS) {
      if (d.t === 'bool') r[d.k] = rr() < 0.7;
      else if (d.t === 'num') r[d.k] = rr() < 0.4 ? d.d : d.min + Math.floor(rr() * (Math.min(d.max, d.d * 3 + 3) - d.min + 1));
      else r[d.k] = d.opts[Math.floor(rr() * d.opts.length)][0];
    }
    r.chipPer = 10; r.go3 = Math.min(r.go3, 5); r.goMatgo = Math.min(r.goMatgo, 9);
    return r;
  };
  for (let seed = 1; seed <= 1600; seed++) {
    const N = [2, 3, 4, 5][seed % 4], rules = G.normRules(randRules());
    const rng = G.makeRng(seed * 13 + 1);
    let st = G.create({ players: N, seed, rules });
    for (let chain = 0; chain < 2; chain++) {
      const all = JSON.stringify(G.gameCards(st.bonus));
      for (let guard = 0; st.phase !== 'end'; guard++) {
        if (guard > 500) throw new Error('끝나지 않는 판 ' + seed);
        const pend = st.phase === 'pickHand' || st.phase === 'pickFlip' ? st.cur.caps : [];
        const cards = sorted([...st.deck, ...st.table, ...st.hands.flat(), ...st.cap.flat(), ...pend, ...(st.sale ? st.sale.hid : [])]);
        if (JSON.stringify(cards) !== all) bad++;
        const L = G.legal(st);
        if (!L.length) { bad++; break; }
        const a = seed % 3 ? L[Math.floor(rng() * L.length)] : AI.choose(G.view(st, st.turn), 'easy', { rng });
        if (!G.isLegal(st, a)) { bad++; break; }
        G.apply(st, a, []);
      }
      rounds++; const r = st.result; kinds[r.kind] = (kinds[r.kind] || 0) + 1;
      const d = G.pointDeltas(st);
      if (d.reduce((x, y) => x + y, 0) === 0) zero++; else bad++;
      if (r.winner >= 0 && r.points !== r.per.reduce((x, l) => x + l.pay, 0)) bad++;
      if (rules.maxPts > 0 && r.per.some(l => l.pay > rules.maxPts)) bad++;
      if (r.capped) capHit++;
      sides += r.side.length;
      if (r.per.some(l => l.pay < 0 || !Number.isFinite(l.pay))) bad++;
      if (G.hash(JSON.parse(JSON.stringify(st))) !== G.hash(st)) bad++;
      st = G.nextRound(st);
      if (JSON.stringify(st.rules) !== JSON.stringify(rules)) bad++;
    }
  }
  eq(bad, 0, '무작위 규칙 ' + rounds + '판: 카드 보존 · 점수 합 · 상한 · 저장/복원');
  eq(zero, rounds, '모든 판에서 칩 변화의 합이 0');
  ok(capHit > 20 && sides > 20, '상한에 걸린 판(' + capHit + ')과 첫뻑/연뻑 보너스(' + sides + '건)가 실제로 나옴');
  console.log('    무작위 규칙 결과: ' + JSON.stringify(kinds));
}

// ── AI 끼리 ────────────────────────────────────────────
(async () => {
  section('AI 끼리 (오류 없음 · 점수 분포 · 실력 순서, 같은 판을 자리 바꿔 두 번)');
  const fmt = r => `${r.edge >= 0 ? '+' : ''}${r.edge.toFixed(2)} ± ${r.se.toFixed(2)}`;
  let t = Date.now();
  const ee = await duel('easy', 'easy', 1500, 2);
  eq(ee.err, '', '🐣 끼리 맞고 3,000판 오류 없음');
  console.log(`    맞고 🐣끼리 ${ee.rounds}판: 나가리 ${(100 * ee.nagari / ee.rounds).toFixed(1)}% · 이긴 판 평균 ${(ee.sumWin / ee.nWin).toFixed(1)}점 · 최고 ${ee.maxPts}점 · 고 ${(ee.go / ee.rounds).toFixed(2)}번/판 (${Date.now() - t}ms)`);
  ok(ee.nagari / ee.rounds < 0.3 && ee.sumWin / ee.nWin > 5 && ee.sumWin / ee.nWin < 40, '점수 분포가 그럴듯함 (이긴 판 평균 5~40점, 나가리 30% 아래)');
  ok(Math.abs(ee.edge) < 3 * ee.se + 0.5, '같은 실력끼리는 비슷함 (자리 차이 ' + fmt(ee) + ')');

  t = Date.now();
  const e3 = await duel('easy', 'easy', 500, 3);
  eq(e3.err, '', '🐣 끼리 3인 1,000판 오류 없음');
  console.log(`    3인 🐣끼리 ${e3.rounds}판: 나가리 ${(100 * e3.nagari / e3.rounds).toFixed(1)}% · 이긴 판 평균 ${(e3.sumWin / e3.nWin).toFixed(1)}점 · 최고 ${e3.maxPts}점 (${Date.now() - t}ms)`);

  t = Date.now();
  const en = await duel('easy', 'normal', 400, 2);
  eq(en.err, '', '🐣 vs 🐱 오류 없음');
  console.log(`    맞고 🐣 vs 🐱 ${en.rounds}판: 🐱 이 판마다 ${fmt(en)}점 더 · 이긴 판 🐣 ${en.wins.easy} · 🐱 ${en.wins.normal} (${Date.now() - t}ms)`);
  ok(en.edge > 2 * en.se && en.edge > 1, '맞고: 🐱 > 🐣');

  t = Date.now();
  const en3 = await duel('easy', 'normal', 250, 3);
  eq(en3.err, '', '3인 🐣 vs 🐱🐱 오류 없음');
  console.log(`    3인 🐣 vs 🐱🐱 ${en3.rounds}판: 🐱 이 판마다 ${fmt(en3)}점 더 (${Date.now() - t}ms)`);
  ok(en3.edge > 0, '3인: 🐱 > 🐣');

  t = Date.now();
  const nh = await duel('normal', 'hard', 300, 2, { hard: { samples: 40 } });
  eq(nh.err, '', '🐱 vs 🐯 오류 없음');
  console.log(`    맞고 🐱 vs 🐯(고/스톱 40번 끝까지 두기) ${nh.rounds}판: 🐯 이 판마다 ${fmt(nh)}점 더 · 이긴 판 🐱 ${nh.wins.normal} · 🐯 ${nh.wins.hard} (${Date.now() - t}ms)`);
  ok(nh.edge > 2 * nh.se, '맞고: 🐯 > 🐱');

  t = Date.now();
  const nh3 = await duel('normal', 'hard', 150, 3, { hard: { samples: 40 } });
  eq(nh3.err, '', '3인 🐱 vs 🐯 오류 없음');
  console.log(`    3인 🐯 vs 🐱🐱 ${nh3.rounds}판: 🐯 이 판마다 ${fmt(nh3)}점 더 (${Date.now() - t}ms)`);
  ok(nh3.edge > 0, '3인: 🐯 > 🐱');

  console.log(`
${fail ? '실패' : '모두 통과'}: ${pass} 통과 · ${fail} 실패 (${((Date.now() - T0) / 1000).toFixed(1)}초)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

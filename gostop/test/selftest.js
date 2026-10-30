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

  s = S({ hands: [[34, 44], [36, 38]], table: [32], deck: [24, 25] });
  act(s, P(34));
  eq(s.phase, 'kook', '국진을 먹으면 어디에 쓸지 물어봄');
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
  let s = G.create({ players: 4, seed: sd });
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
  s = G.create({ players: 4, seed: sd });
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
  s = G.create({ players: 5, seed: s5 });
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
  s = G.create({ players: 4, seed: sn });
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
  const run = () => { let st = G.create({ players: 5, seed: s5 }), r2 = G.makeRng(11); while (st.phase !== 'end') { const L = G.legal(st); G.apply(st, L[Math.floor(r2() * L.length)], []); } return st; };
  eq(G.hash(run()), G.hash(run()), '5명: 같은 씨앗 + 같은 입력 → 같은 지문');
  s = G.create({ players: 5, seed: s5 });
  const w1 = G.step(s, G.A_BUY).state;
  eq(G.hash(s) === G.hash(G.create({ players: 5, seed: s5 })), true, 'step 은 넣은 상태를 안 바꿈 (광 팔기)');
  eq(JSON.stringify(w1.cap.flat().length), String(s.sale.offers[0].cards.length), '순수 step 으로 사도 같음');
  let leak = 0;
  for (const p of [0, 1, 2]) { const o = G.obs(s, p); if (o.length !== G.OBS_LEN || o.some(x => !Number.isFinite(x))) leak++; }
  eq(leak, 0, '광 팔기 중에도 관찰은 길이·숫자 정상');
  eq(G.actionLabel(G.A_BUY) + '/' + G.actionLabel(G.A_NOBUY), '광 사기/안 사기', '행동 이름');
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

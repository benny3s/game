// 수식 하이 로우 규칙 시험 (node survival/test/selftest_formula.js)
'use strict';
const F = require('../games/formula/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const card = (color, v) => color * 11 + v;   // 0 금 1 은 2 동 3 흑

// 1) 식 계산 (곱셈 · 나눗셈 먼저)
const E = (vals, o, r) => F.evalEq({ n: vals.map(v => card(3, v)), o, r: r || [0, 0, 0, 0] });
ok(near(E([2, 3, 4, 1], ['+', '*', '-']), 13), '2 + 3 × 4 − 1 = 13');
ok(near(E([8, 4, 10, 0], ['/', '*', '-']), 20), '8 ÷ 4 × 10 − 0 = 20');
ok(near(E([9, 3, 2, 5], ['-', '/', '+']), 12.5), '9 − 3 ÷ 2 + 5 = 12.5');
ok(near(E([9, 3, 2, 5], ['-', '/', '+'], [1, 0, 0, 0]), 6.5), '√9 − 3 ÷ 2 + 5 = 6.5');
ok(!isFinite(E([1, 0, 2, 3], ['/', '+', '-'])), '0 으로 나누면 안 됨');
ok(F.eqText({ n: [card(0, 9), card(1, 3), card(2, 2), card(3, 5)], o: ['-', '/', '+'], r: [1, 0, 0, 0] }) === '√9 − 3 ÷ 2 + 5', '식 글');

// 2) 식 검사
const H = { hid: card(0, 8), open: [card(1, 4), card(2, 10), card(3, 0)], sym: [], muls: 0, roots: 0 };
ok(F.checkEq(H, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '+', '-'], r: [0, 0, 0, 0] }) === null, '바른 식');
ok(F.checkEq(H, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 1)], o: ['/', '+', '-'], r: [0, 0, 0, 0] }) !== null, '없는 카드');
ok(F.checkEq(H, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '/', '-'], r: [0, 0, 0, 0] }) !== null, '÷ 두 번은 안 됨');
ok(F.checkEq(H, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '*', '-'], r: [0, 0, 0, 0] }) !== null, '× 없는데 × 씀');
ok(F.checkEq(H, { n: [card(0, 8), card(1, 4), card(3, 0), card(2, 10)], o: ['/', '/', '+'], r: [0, 0, 0, 0] }) !== null, '0 으로 나눔');
const Hm = { hid: card(0, 8), open: [card(1, 4), card(2, 10), card(3, 0)], sym: [48], muls: 1, roots: 1 };
ok(F.checkEq(Hm, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '*', '-'], r: [0, 1, 0, 0] }) === null, '× · √ 쓴 식');
ok(F.checkEq(Hm, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '+', '-'], r: [0, 1, 0, 0] }) !== null, '× 를 안 씀');
ok(F.checkEq(Hm, { n: [card(0, 8), card(1, 4), card(2, 10), card(3, 0)], o: ['/', '*', '-'], r: [0, 0, 0, 0] }) !== null, '√ 를 안 씀');

// 3) 최선 찾기
const s = F.search([card(0, 10), card(1, 10), card(2, 0), card(3, 5)], 0, 0);
ok(near(s.H.d, 0), '10 10 0 5 → 20 을 만듦 (' + F.eqText(s.H.e) + ')');
const s2 = F.search([card(0, 8), card(1, 4), card(2, 10), card(3, 0)], 1, 0);
ok(near(s2.H.d, 0), '× 가 있으면 8 ÷ 4 × 10 − 0 = 20 (' + F.eqText(s2.H.e) + ')');
// 독립 전수 계산과 비교 (무작위 손 40개)
function brute(cards, muls, roots) {
  const basics = ['+', '-', '/'];
  let bh = 99, bl = 99;
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map(p => [x].concat(p)));
  const opSets = [];
  const pick = (k, start, acc) => { if (acc.length === 3 - muls) { opSets.push(acc.concat(Array(muls).fill('*'))); return; } for (let i = start; i < 3; i++) pick(k, i + 1, acc.concat(basics[i])); };
  pick(0, 0, []);
  const rootSets = []; (function rs(i, left, acc) { if (i === 3) { rootSets.push(acc.concat(left)); return; } for (let x = 0; x <= left; x++) rs(i + 1, left - x, acc.concat(x)); })(0, roots, []);
  for (const p of perms(cards)) for (const os of opSets) for (const o of perms(os)) for (const r of rootSets) {
    const v = F.evalEq({ n: p, o, r }); if (!isFinite(v)) continue;
    bh = Math.min(bh, Math.abs(v - 20)); bl = Math.min(bl, Math.abs(v - 1));
  }
  return { h: bh, l: bl };
}
{ let a = 7; const rr = () => { a = (a * 1103515245 + 12345) >>> 0; return a / 4294967296; };
  for (let k = 0; k < 40; k++) {
    const cs = []; while (cs.length < 4) { const c = Math.floor(rr() * 44); if (!cs.includes(c)) cs.push(c); }
    const mu = Math.floor(rr() * 3), ro = Math.floor(rr() * 3);
    const a1 = F.search(cs, mu, ro), b1 = brute(cs, mu, ro);
    ok(near(a1.H.d, b1.h) && near(a1.L.d, b1.l), `최선 찾기 = 전수 계산 (${cs.map(F.val)} ×${mu} √${ro}: ${a1.H.d}/${b1.h} ${a1.L.d}/${b1.l})`);
  } }

// 4) 끝까지 (AI 끼리) + 칩 보존 + 규칙 어김 없음
function playOut(n, seed, tiers, rounds) {
  const st = F.init({ n, seed, cfg: { rounds } });
  let steps = 0, r = (() => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const total = () => st.chips.reduce((a, b) => a + b, 0) + (st.pot || 0);
  const T0 = total();
  while (!F.over(st) && steps < 4000) {
    const need = F.needs(st);
    if (!need.length) { ok(F.auto(st) != null, '사람 입력이 없는데 자동으로도 안 넘어감 ' + st.phase); F.advance(st); steps++; continue; }
    for (const seat of need) {
      if (!F.needs(st).includes(seat)) continue;
      const V = F.view(st, seat);
      ok(V.hands.every((h, i) => !h || i === seat || h.hid === -1 || st.phase === 'show'), '남의 숨긴 카드가 보임');
      const a = F.ai(V, seat, tiers[seat % tiers.length], r);
      const res = F.apply(st, seat, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase}) ${JSON.stringify(a)} → ${res.err}`); F.apply(st, seat, F.legal(st, seat)[0]); }
      ok(st.chips.every(c => c >= 0), '칩이 음수');
      ok(total() === T0, '칩 합이 바뀜');
      steps++;
    }
  }
  ok(F.over(st), `${n}명 판이 끝남 (seed ${seed}, ${steps}번)`);
  const R = F.ranks(st);
  ok(R.length === n && R.includes(0), '등수');
  // 모두가 같은 공개 지문
  const pubs = new Set([-1, ...Array.from({ length: n }, (_, i) => i)].map(i => F.view(st, i).pub));
  ok(pubs.size === 1, '공개 지문이 자리마다 다름');
  return st;
}
for (let n = 2; n <= 6; n++) for (let k = 0; k < 4; k++) playOut(n, 1000 + n * 17 + k, ['easy', 'normal', 'hard'], 3);
playOut(4, 777, ['hard'], 5);

// 5) 판 도중 공개 지문 같음 + 선생님은 남의 숨긴 카드를 안 읽음
{
  const st = F.init({ n: 3, seed: 4242, cfg: { rounds: 5 } });
  const pubs = new Set([-1, 0, 1, 2].map(i => F.view(st, i).pub));
  ok(pubs.size === 1, '시작 공개 지문');
  // 상대(1번) 숨긴 카드만 다른 판 → 0번 자리 선생님 글이 같아야 함
  const st2 = JSON.parse(JSON.stringify(st));
  const seen = new Set(); st2.H.forEach(h => { if (h) { seen.add(h.hid); h.open.forEach(c => seen.add(c)); h.sym.forEach(c => seen.add(c)); } });
  let alt = -1; for (let c = 0; c < 44; c++) if (!seen.has(c)) { alt = c; break; }
  st2.H[1].hid = alt;
  const c1 = F.coach(F.view(st, 0), 0, -1, ['나', 'A', 'B']), c2 = F.coach(F.view(st2, 0), 0, -1, ['나', 'A', 'B']);
  ok(JSON.stringify(c1) === JSON.stringify(c2), '선생님이 남의 숨긴 카드로 글이 바뀜');
  ok(c1.opp && c1.mine && c1.rec, '선생님 세 줄');
}

// 6) 판돈 나누기 · 스윙
{
  const st = F.init({ n: 3, seed: 99, cfg: { rounds: 3 } });
  // 손을 직접 정함: 0 = 20 정확, 1 = 1 정확, 2 = 애매
  const mk = (hid, open) => ({ hid, open, sym: [], muls: 0, roots: 0 });
  st.H = [mk(card(0, 8), [card(1, 4), card(2, 10), card(3, 0)]), mk(card(0, 3), [card(1, 3), card(2, 1), card(3, 1)]), mk(card(0, 5), [card(1, 6), card(2, 7), card(1, 9)])];
  st.folded = [false, false, false]; st.pot = 9; st.chips = [10, 10, 10];
  st.phase = 'build'; st.eqH = [null, null, null]; st.eqL = [null, null, null]; st.decl = [null, null, null];
  for (let i = 0; i < 3; i++) { const b = F.search([st.H[i].hid, ...st.H[i].open], 0, 0); ok(F.apply(st, i, { t: 'eq', h: b.H.e, l: b.L.e }).ok, '식 제출 ' + i); }
  ok(st.phase === 'bet2', '식 다 내면 2차 베팅');
  // 모두 체크
  for (let g = 0; g < 3 && st.phase === 'bet2'; g++) ok(F.apply(st, st.turn, { t: 'check' }).ok, '체크');
  ok(st.phase === 'declare', '선언 단계');
  F.apply(st, 0, { t: 'decl', d: 'H' }); F.apply(st, 1, { t: 'decl', d: 'L' }); F.apply(st, 2, { t: 'decl', d: 'S' });
  ok(st.phase === 'show', '공개');
  ok(st.res.hi === 0 && st.res.lo === 1 && st.res.swingFail.includes(2), '하이 0 · 로우 1 · 스윙 실패 2');
  ok(st.chips[0] === 15 && st.chips[1] === 14 && st.chips[2] === 10, '판돈 반씩 (홀수 칩은 하이) ' + st.chips);
  const V2 = F.view(st, 2); ok(V2.hands[0].hid === st.H[0].hid, '공개 때는 숨긴 카드도 보임');
}

// 7) 어떻게 놓아도 0 으로 나누게 되는 손 (숫자 0 네 장 · × 없음): 막히지 않고 끝까지 가야 함
{
  const st = F.init({ n: 2, seed: 7, cfg: { rounds: 1 } });
  const mk = (hid, open) => ({ hid, open, sym: [], muls: 0, roots: 0 });
  st.H = [mk(card(0, 0), [card(1, 0), card(2, 0), card(3, 0)]), mk(card(0, 9), [card(1, 4), card(2, 2), card(3, 1)])];
  st.folded = [false, false]; st.pot = 6; st.chips = [7, 7];
  st.phase = 'build'; st.eqH = [null, null]; st.eqL = [null, null]; st.decl = [null, null]; st.turn = -1;
  const V = F.view(st, 0);
  let lg = null, aiA = null;
  try { lg = F.legal(st, 0); aiA = F.ai(V, 0, 'normal', Math.random); } catch (e) { ok(false, '0000 손에서 예외: ' + e.message); }
  ok(lg && lg.length === 1 && lg[0].h && lg[0].l, '0000 손도 낼 식이 있음 (legal)');
  ok(aiA && aiA.t === 'eq', '0000 손 AI 도 식을 냄');
  ok(F.apply(st, 0, lg[0]).ok, '0000 손: 계산 안 되는 식도 이 경우에만 받아 줌');
  const b = F.search([card(0, 9), card(1, 4), card(2, 2), card(3, 1)], 0, 0);
  ok(F.apply(st, 1, { t: 'eq', h: b.H.e, l: b.L.e }).ok, '상대 식 제출');
  for (let g = 0; g < 4 && st.phase === 'bet2'; g++) F.apply(st, st.turn, { t: 'check' });
  ok(st.phase === 'declare', '0000 손 선언 단계까지 감');
  F.apply(st, 0, { t: 'decl', d: 'H' }); F.apply(st, 1, { t: 'decl', d: 'H' });
  ok(st.phase === 'show' && st.res && st.res.hi === 1 && st.res.lo === -1, '0000 손은 하이 맞대결에서 짐 (판이 멈추지 않음)');
  ok(st.chips.reduce((a, x) => a + x, 0) === 20, '칩 합 그대로 (' + st.chips + ')');
  ok(F.coach(F.view(st, 0), 0, -1, ['나', 'A']).opp !== undefined, '0000 손에서도 선생님이 글을 냄');
}
// 7-b) 계산 안 되는 식을 낸 사람이 혼자 하이를 선언해도 판돈을 못 가져감
{
  const st = F.init({ n: 2, seed: 8, cfg: { rounds: 1 } });
  const mk = (hid, open) => ({ hid, open, sym: [], muls: 0, roots: 0 });
  st.H = [mk(card(0, 0), [card(1, 0), card(2, 0), card(3, 0)]), mk(card(0, 9), [card(1, 4), card(2, 2), card(3, 1)])];
  st.folded = [false, false]; st.pot = 6; st.chips = [7, 7];
  st.phase = 'build'; st.eqH = [null, null]; st.eqL = [null, null]; st.decl = [null, null]; st.turn = -1;
  F.apply(st, 0, F.legal(st, 0)[0]);
  const b = F.search([card(0, 9), card(1, 4), card(2, 2), card(3, 1)], 0, 0);
  F.apply(st, 1, { t: 'eq', h: b.H.e, l: b.L.e });
  for (let g = 0; g < 4 && st.phase === 'bet2'; g++) F.apply(st, st.turn, { t: 'check' });
  F.apply(st, 0, { t: 'decl', d: 'H' }); F.apply(st, 1, { t: 'decl', d: 'L' });
  ok(st.phase === 'show' && st.res.hi === -1 && st.res.lo === 1, '계산 안 되는 식은 혼자 하이 선언해도 못 이김 (hi ' + st.res.hi + ' lo ' + st.res.lo + ')');
  ok(st.chips[0] === 7 && st.chips[1] === 13, '판돈은 로우 1등이 가져감 ' + st.chips);
}
// 7-c) 기호 칸에 객체 속성 이름 같은 것을 넣어도 안 됨 + 쉬운 AI 가 처음 몇 가지에서 못 찾아도 식을 냄
{
  const Hh = { hid: card(0, 8), open: [card(1, 4), card(2, 10), card(3, 0)], sym: [], muls: 0, roots: 0 };
  const ns = [card(0, 8), card(1, 4), card(2, 10), card(3, 0)];
  ok(F.checkEq(Hh, { n: ns, o: ['toString', 'constructor', '__proto__'], r: [0, 0, 0, 0] }) !== null, '기호 자리에 속성 이름은 안 됨');
  const H0 = { hid: card(0, 0), open: [card(1, 0), card(2, 0), card(3, 7)], sym: [], muls: 0, roots: 0 };
  const V0 = { phase: 'build', hands: [H0], folded: [false], cur: 0, bet: [0], cap: 0, raises: 0, maxRaise: 3, pot: 0, chips: [10] };
  let rs = 3; const rr = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  let allOk = true;
  for (let t = 0; t < 40; t++) { const a = F.ai(V0, 0, 'easy', rr); if (!a || a.t !== 'eq' || F.checkEq(H0, a.h) || F.checkEq(H0, a.l)) allOk = false; }
  ok(allOk, '0 0 0 7 손 — 쉬운 AI 도 늘 낼 수 있는 식을 냄');
}

console.log(`수식 하이 로우 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

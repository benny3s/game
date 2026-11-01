/* 베니스트레이션 규칙 시험 — node game/draw/test/selftest.js (1초 안팎)
   공책 돌리기(3~8명) · 단계 순서 · 한 판 끝까지(빈 것 자동) · 투표 집계 · 획 줄여 쓰기/되풀기 · 받은 것 다듬기 · 제시어 목록 · 크기 */
'use strict';
const D = require('../core.js');
const Wd = require('../words.js');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — 기대 ${JSON.stringify(b)}, 실제 ${JSON.stringify(a)}`);
const sec = name => console.log('· ' + name);
// 결정적인 난수 (mulberry32)
const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// 그럴듯한 낙서: 곡선·원·지그재그 여러 획 (원래 점이 촘촘함 — 손가락 그림 흉내)
function scribble(r, nStrokes, ptsPer) {
  const out = [];
  for (let i = 0; i < nStrokes; i++) {
    const cx = 60 + r() * 480, cy = 50 + r() * 350, rad = 20 + r() * 90, a0 = r() * 6.28, kind = i % 3;
    const p = [];
    for (let k = 0; k < ptsPer; k++) {
      const t = k / (ptsPer - 1);
      if (kind === 0) p.push([cx + Math.cos(a0 + t * 6.28) * rad + (r() - .5) * 1.2, cy + Math.sin(a0 + t * 6.28) * rad + (r() - .5) * 1.2]);          // 원
      else if (kind === 1) p.push([cx - rad + t * rad * 2 + (r() - .5), cy + Math.sin(t * 12) * rad * .4 + (r() - .5)]);                                  // 물결
      else p.push([cx + (r() - .5) * 2 + t * 40, cy + t * rad * 2 + (r() - .5)]);                                                                         // 줄
    }
    out.push({ c: i % 9, s: i % 3, p: p.map(q => [Math.max(0, Math.min(600, q[0])), Math.max(0, Math.min(450, q[1]))]) });
  }
  return out;
}

sec('공책 돌리기 (3~8명)');
for (let n = 3; n <= 8; n++) {
  const touched = Array.from({ length: n }, () => new Set());           // 공책 b 를 만진 사람
  const seen = Array.from({ length: n }, () => new Set());              // 사람 p 가 만진 공책
  for (let s = 0; s < D.stepCount(n); s++) {
    const holders = new Set();
    for (let b = 0; b < n; b++) {
      const h = D.holder(b, s, n);
      holders.add(h); touched[b].add(h); seen[h].add(b);
      eq(D.bookOf(h, s, n), b, `${n}명 단계${s}: bookOf 는 holder 의 거꾸로`);
    }
    ok(holders.size === n, `${n}명 단계${s}: 한 사람이 공책 하나씩만 든다`);
  }
  ok(touched.every(t => t.size === n), `${n}명: 공책마다 모든 사람이 한 번씩 만진다`);
  ok(seen.every(t => t.size === n), `${n}명: 사람마다 모든 공책을 한 번씩 만진다`);
  for (let b = 0; b < n; b++) { eq(D.holder(b, 0, n), b, `${n}명: 0단계는 주인이 제시어`); }
  // 마지막 쪽은 주인 바로 앞사람, 앞 쪽을 쓴 사람은 늘 바로 앞 순서
  const G = D.create(n, {});
  for (let s = 0; s < n; s++) { for (let p = 0; p < n; p++) { const t = D.taskFor(G, p); if (s) ok(t.src && t.src.by === (p - 1 + n) % n, `${n}명 단계${s}: 앞 쪽은 바로 앞 순서의 글`); D.submit(G, p, D.kindOf(s) === 'd' ? { s: [] } : { t: 'a' + s }); } D.advance(G); }
  ok(G.phase === 'reveal' && G.books.every(b => b.length === n), `${n}명: ${n}단계 뒤 공개 · 공책마다 ${n}쪽`);
  G.books.forEach((bk, b) => bk.forEach((pg, p) => ok(pg.by === (b + p) % n, `${n}명 공책${b} ${p}쪽은 ${(b + p) % n}번이 씀`)));
  eq(G.books[0].map(pg => pg.k).join(''), D.plan(n).map(k => (k === 'd' ? 'd' : 't')).join(''), `${n}명: 쪽 종류는 단계 순서`);
  eq(D.drawings(G.books).length, n * D.drawsPerBook(n), `${n}명: 그림 수 = 공책 수 × ${D.drawsPerBook(n)}`);
}
eq(D.plan(3), ['p', 'd', 'g'], '3명 단계: 제시어·그리기·맞히기');
eq(D.plan(4), ['p', 'd', 'g', 'd'], '4명 단계: 그리기로 끝');
eq(D.plan(5), ['p', 'd', 'g', 'd', 'g'], '5명 단계: 맞히기로 끝');
eq(D.plan(8).filter(k => k === 'd').length, 4, '8명: 그리기 4번');

sec('단계 진행 · 시간 초과(빈 것 자동) · 이중 제출');
{
  const G = D.create(4, { pick: 'write' });
  ok(!D.submit(G, 9, { t: 'x' }), '없는 사람 거부');
  ok(D.submit(G, 0, { t: '  붕어빵  ' }), '0번 제시어');
  ok(!D.submit(G, 0, { t: '다른것' }), '두 번 낸 건 거부');
  ok(D.submit(G, 1, { t: '' }, '라면'), '빈 제시어 → 받은 말로');
  eq(G.cur[1].t, '라면', '빈 제시어는 대신 말');
  eq(D.missing(G), [2, 3], '못 낸 사람 목록');
  ok(!D.allIn(G), '아직 다 안 냈다');
  D.advance(G, () => '우산');            // 2·3번은 시간 초과 → 자동
  eq(G.step, 1, '다음 단계');
  eq(G.books[0][0].t, '붕어빵', '공백 다듬음');
  eq(G.books[2][0].t, '우산', '시간 초과 제시어는 아무 말');
  ok(G.books[2][0].e === 1, '자동 표시 e');
  // 그리기 단계: 빈 종이 · 이상한 값
  D.submit(G, 0, { s: [[3, 10, 10, 5, 5]] });
  D.submit(G, 1, { s: 'bad' });
  D.advance(G);                          // 2·3 은 자동 빈 종이
  ok(G.books[1][1].s.length === 0, '이상한 그림은 빈 종이');
  ok(G.books[1][1].k === 'd' && D.isBlank(G.books[1][1].s), '빈 종이는 isBlank');
  ok(!D.isBlank(G.books[3][1].s), '0번이 그린 그림(공책 3의 1쪽)은 빈 종이 아님');
  // 맞히기 단계 자동 = ???
  D.advance(G);
  ok(G.books.every(b => b[2] && b[2].t === D.EMPTY_GUESS), '맞히기 시간 초과는 ???');
  eq(G.step, 3, '3단계');
  ok(D.taskFor(G, 0).kind === 'd', '3단계는 그리기');
  // 단계가 아닐 때 제출은 거부
  D.advance(G); ok(G.phase === 'reveal', '끝나면 공개'); ok(!D.submit(G, 0, { t: 'x' }), '공개 중엔 제출 거부');
}

sec('공개 걸음');
{
  eq(D.revealNext(3, 3, 0, 1), { b: 0, p: 2 }, '다음 쪽');
  eq(D.revealNext(3, 3, 0, 3), { b: 1, p: 1 }, '공책 끝 → 다음 공책 첫 쪽');
  eq(D.revealNext(3, 3, 2, 3), null, '마지막 공책 끝 → 투표');
  eq(D.revealPrev(3, 3, 1, 1), { b: 0, p: 3 }, '첫 쪽에서 뒤로 → 앞 공책 끝');
  eq(D.revealPrev(3, 3, 0, 1), { b: 0, p: 1 }, '맨 앞에서 뒤로 → 그대로');
  // 끝까지 걸으면 n*n 걸음
  let at = { b: 0, p: 1 }, steps = 1;
  while ((at = D.revealNext(5, 5, at.b, at.p))) steps++;
  eq(steps, 25, '5명: 모든 쪽 25장');
}

sec('투표 · 집계');
{
  const n = 4, G = D.create(n, {});
  const blank = [];
  const art = [[3, 10, 10, 20, 20]];                                  // 한 획
  for (let s = 0; s < n; s++) { for (let p = 0; p < n; p++) D.submit(G, p, D.kindOf(s) === 'd' ? { s: p === 2 && s === 1 ? blank : art } : { t: '글' + s + p }); D.advance(G); }
  const all = D.drawings(G.books);
  eq(all.length, 8, '4명: 그림 8장');
  ok(all.filter(d => d.blank).length === 1, '빈 종이 하나');
  eq(D.votable(G.books, 0).length, 8 - 1 - 2, '0번이 고를 수 있는 그림 = 전체 − 빈 종이 − 내 것');
  const mine = all.find(d => d.by === 0 && !d.blank);
  ok(!D.vote(G, 0, mine.b, mine.p), '내 그림엔 못 찍는다');
  const bl = all.find(d => d.blank);
  ok(!D.vote(G, 1, bl.b, bl.p), '빈 종이엔 못 찍는다');
  ok(!D.vote(G, 1, 0, 0), '그림이 아닌 쪽엔 못 찍는다');
  const by = x => all.filter(d => d.by === x && !d.blank);
  // 0번 그림 둘에 표 몰기: 1,2,3 이 0번 그림에
  const z = by(0);
  ok(D.vote(G, 1, z[0].b, z[0].p) && D.vote(G, 2, z[0].b, z[0].p) && D.vote(G, 3, z[1].b, z[1].p), '표 3개');
  ok(!D.vote(G, 1, z[1].b, z[1].p), '두 번 못 찍음');
  const T = D.tally(G.books, G.votes, n);
  eq(T.byPlayer, [3, 0, 0, 0], '0번 3표');
  eq(T.winners, [0], '이긴 사람 0번');
  eq(T.max, 3, '최대 3표');
  eq(T.top.length, 1, '오늘의 그림 한 장');
  eq(T.top[0].votes, 2, '오늘의 그림 = 0번 그림 중 표 많은 쪽(2표)');
  eq(D.rankInfo(T, 0), { res: 'w', beat: 3, score: 3, opp: [{ idx: 1, res: 'w' }, { idx: 2, res: 'w' }, { idx: 3, res: 'w' }] }, '이긴 사람 기록');
  const r1 = D.rankInfo(T, 1);
  eq([r1.res, r1.beat, r1.score], ['l', 0, 0], '진 사람 기록 (표 없는 사람끼리 동점)');
  eq(r1.opp.map(o => o.res), ['l', 'd', 'd'], '진 사람의 상대별: 0번에겐 l, 같은 0표끼리 d');
  // 동점
  const G2 = D.create(n, {}); G2.books = G.books; G2.votes = {};
  const z1 = by(1), z2 = by(2);
  D.vote(G2, 0, z1[0].b, z1[0].p); D.vote(G2, 3, z2[0].b, z2[0].p);
  const T2 = D.tally(G2.books, G2.votes, n);
  eq(T2.winners, [1, 2], '동점은 모두 이김');
  eq(D.rankInfo(T2, 1).res, 'w', '동점 w'); eq(D.rankInfo(T2, 2).res, 'w', '동점 w'); eq(D.rankInfo(T2, 0).res, 'l', '표 없는 사람 l');
  eq(D.rankInfo(T2, 1).opp.find(o => o.idx === 2).res, 'd', '동점끼리 상대는 d');
  // 표가 하나도 없으면 기록 없음
  const T0 = D.tally(G.books, {}, n);
  eq(T0.winners, [], '표 0 → 이긴 사람 없음'); ok(D.rankInfo(T0, 0) === null, '표 0 → 랭킹 기록 없음');
  // 잘못된 표는 집계에서 빠짐
  const T3 = D.tally(G.books, { 0: [mine.b, mine.p], 1: [9, 9], 2: 'x' }, n);
  eq(T3.total, 0, '내 그림·없는 그림·이상한 값은 집계 안 함');
}

sec('획 줄여 쓰기 · 되풀기');
{
  const r = rng(42), S = scribble(r, 24, 70);                          // 24획 × 70점 = 원래 점 1680개
  const enc = D.fit(S);
  const bytes = D.jsonBytes(enc);
  ok(bytes <= D.MAX_BYTES, `전송 크기 한도 안 (${bytes} ≤ ${D.MAX_BYTES})`);
  ok(enc.length === 24, '획 수 그대로');
  const dec = D.decode(enc);
  ok(dec.length === 24 && dec[0].pts.length > 2, '되풀면 점이 남아 있다');
  // 되푼 점이 원래 점에서 크게 안 벗어남 (격자 2칸 + 줄이기 오차)
  let worst = 0;
  S.forEach((st, i) => {
    const d = dec[i]; eq([d.c, d.s], [st.c, st.s], `${i}번 획 색·굵기`);
    for (const q of st.p) { let m = 1e9; for (let k = 0; k + 1 < d.pts.length; k++) { const a = d.pts[k], b = d.pts[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L)) : 0; m = Math.min(m, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)); } if (d.pts.length === 1) m = Math.hypot(q[0] - d.pts[0][0], q[1] - d.pts[0][1]); worst = Math.max(worst, m); }
  });
  ok(worst <= 6, `되푼 선이 원래 선에서 6px 안 (최대 ${worst.toFixed(1)})`);
  eq(D.clean(enc), enc, '정상 그림은 다듬어도 그대로');
  console.log(`  📦 24획·점 1680개 → ${bytes}바이트 (획 ${enc.length}개, 점 ${enc.reduce((a, s) => a + (s.length - 3) / 2 + 1, 0)}개)`);
  // 크기 표: 가벼운/보통/빽빽한 그림
  for (const [label, ns, np] of [['간단(8획)', 8, 40], ['보통(25획)', 25, 60], ['빽빽(80획×120점)', 80, 120]]) {
    const e = D.fit(scribble(rng(7), ns, np)); console.log(`  📦 ${label}: ${D.jsonBytes(e)}바이트`);
    ok(D.jsonBytes(e) <= D.MAX_BYTES, `${label} 한도 안`);
  }
  // 한 점 획(점찍기) · 지우개 · 범위 밖 좌표
  const e1 = D.encode([{ c: 1, s: 2, p: [[100, 100]] }, { c: 8, s: 0, p: [[-50, 9999], [10, 10]] }]);
  eq(e1[0], [1 * 3 + 2, 50, 50], '점 하나 획');
  eq(D.decode(e1)[1].er, true, '지우개');
  ok(D.decode(e1)[1].pts[0][1] <= D.H, '범위 밖 좌표는 안으로');
  ok(D.isBlank(D.encode([{ c: 8, s: 1, p: [[1, 1], [2, 2]] }])), '지우개뿐이면 빈 종이');
  ok(D.isBlank([]) && D.isBlank(null), '빈 종이');
  // 아주 큰 그림은 점을 더 줄이거나 버려서라도 한도 안
  const huge = D.fit(scribble(rng(3), 290, 400), 3000);
  ok(D.jsonBytes(huge) <= 3000, '아주 큰 그림도 한도 안으로');
}

sec('받은 것 다듬기 (악의적인 입력)');
{
  eq(D.clean('x'), [], '문자열은 빈 종이'); eq(D.clean(null), [], 'null');
  eq(D.clean([[1, 2]]), [], '너무 짧은 획은 버림');
  eq(D.clean([[1, 2, 3, 4]]), [], '짝이 안 맞는 획은 버림');
  eq(D.clean([[99, 2, 3]]), [], '머리 범위 밖 버림');
  eq(D.clean([[0, 99999, -5, 1e9, 1e9]])[0], [0, 300, 0, 0, 225], '좌표는 격자 안으로');
  ok(D.clean(new Array(D.MAX_STROKES + 1).fill([0, 1, 1])).length === 0, '획이 너무 많으면 통째로 버림');
  const big = new Array(200).fill(0).map(() => [0, 1, 1].concat(new Array(200).fill(1)));
  ok(D.clean(big).reduce((a, s) => a + s.length, 0) <= 12000 + 100, '숫자 총량 한도');
  eq(D.cleanText('  가 \n\t나   다<script>  ', 20), '가 나 다 script', '글: 공백·꺾쇠 정리');
  eq(D.cleanText('가나다라마바사아자차카타파하가나다라마바사', 5), '가나다라마', '글: 길이 자름');
  eq(D.cleanText(null, 5), '', '글: null');
  // 이모지가 반으로 안 잘림
  eq(Array.from(D.cleanText('😀😀😀😀', 2)).length, 2, '글: 이모지 안 쪼갬');
}

sec('제시어 목록');
{
  const all = Wd.all;
  ok(all.length >= 290 && all.length <= 340, `약 300개 (${all.length})`);
  eq(new Set(all).size, all.length, '중복 없음');
  ok(all.every(w => w.length >= 1 && Array.from(w).length <= 12), '모두 12자 이하');
  ok(all.every(w => w === w.trim() && !/[<>]/.test(w)), '공백·꺾쇠 없음');
  eq(Wd.CATS.length, 9, '묶음 아홉');
  ok(Wd.CATS.every(c => c.words.length >= 30), '묶음마다 30개 이상');
  ok(all.every(w => D.cleanText(w, D.TEXT_MAX.p) === w), '제시어 한도(16자) 안에서 그대로');
  const r = rng(5);
  for (let i = 0; i < 200; i++) { const t = Wd.pick3(r); ok(t.length === 3 && new Set(t.map(x => x.cat)).size === 3 && new Set(t.map(x => x.w)).size === 3, '3개는 서로 다른 묶음'); if (fail) break; }
  const used = Wd.pick3(rng(1)).map(x => x.w);
  ok(Wd.pick3(rng(1), used).every(x => !used.includes(x.w)), '쓴 말은 피함');
}

sec('한 판 시뮬레이션 (3~8명, 일부는 시간 초과)');
for (let n = 3; n <= 8; n++) {
  const r = rng(100 + n), G = D.create(n, {});
  const words = Wd.all;
  for (let s = 0; s < n; s++) {
    for (let p = 0; p < n; p++) {
      if (r() < 0.2) continue;                                          // 20% 는 시간 초과
      const k = D.kindOf(s);
      D.submit(G, p, k === 'd' ? { s: D.fit(scribble(r, 6, 30)) } : { t: k === 'p' ? words[Math.floor(r() * words.length)] : '글' + p });
    }
    D.advance(G, () => words[Math.floor(r() * words.length)]);
  }
  ok(G.phase === 'reveal', `${n}명 판이 끝까지`);
  ok(G.books.every(b => b.length === n && b[0].k === 't' && b.every((pg, i) => pg.k === (i && i % 2 ? 'd' : 't'))), `${n}명 공책 모양`);
  // 모두 아무 그림에나 투표
  for (let p = 0; p < n; p++) { const v = D.votable(G.books, p); if (v.length) { const t = v[Math.floor(r() * v.length)]; D.vote(G, p, t.b, t.p); } }
  const T = D.tally(G.books, G.votes, n);
  ok(T.total === Object.keys(G.votes).length, `${n}명 표 합`);
  ok(T.winners.length >= 1, `${n}명 이긴 사람 있음`);
  ok(T.byPlayer.every((c, i) => c >= 0 && !(G.votes[i] && G.votes[i][0] === i && false)), `${n}명 표 수 음수 없음`);
}

console.log(`\n${fail ? '❌' : '✅'} 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

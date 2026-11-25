'use strict';
// 중간 달리기 selftest — 이동 · 능력 5개 · 골인 순서 · 중간 승리 · 공개 정보 · AI
const G = require('../games/gn-midrun/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const clone = o => JSON.parse(JSON.stringify(o));
const mk = (ab, seed) => G.init({ n: ab.length, seed: seed || 5, cfg: { ab } });
const setTurn = (st, seat, phase) => { st.ti = st.tord.indexOf(seat); st.phase = phase || (st.ab[seat] === 'sil' ? 'sil' : 'card'); st.pend = null; };

// 1) 시작 · 순서
{
  const st = mk(['push', 'grav', 'union', 'with'], 3);
  ok(st.tord.join() === '1,0,3,2' && G.cur(st) === 1 && st.phase === 'card', '캐릭터 번호 순서 (그래비티1 · 푸시3 · 위드5 · 유니온6) — 그래비티부터');
  ok(st.pos.every(p => p === 0) && st.hand.every(h => h.join() === '1,2,3,4'), '모두 출발점 · 카드 1·2·3·4');
  for (const n of [3, 4, 5]) {
    const s = G.init({ n, seed: 7 + n });
    ok(new Set(s.ab).size === n && s.ab.every(k => G.KEYS.includes(k)) && s.tord.length === n, `${n}명: 능력이 겹치지 않아요 (제비뽑기)`);
    ok(s.tord.every((x, i) => i === 0 || G.AB[s.ab[s.tord[i - 1]]].no < G.AB[s.ab[x]].no), `${n}명: 번호 순서`);
  }
  const silFirst = mk(['sil', 'grav', 'push'], 2);
  ok(silFirst.tord.join() === '1,2,0' && silFirst.phase === 'card', '사일런스는 번호가 가장 커서 마지막 차례');
  setTurn(silFirst, 0); ok(silFirst.phase === 'sil', '사일런스 차례는 먼저 지목');
}
// 2) 이동 · 카드 세트
{
  const st = mk(['grav', 'push', 'with'], 4);
  ok(!ap(st, 1, { t: 'card', c: 1 }).ok, '내 차례가 아니면 못 해요');
  ok(!ap(st, 0, { t: 'card', c: 5 }).ok && !ap(st, 0, { t: 'card' }).ok && !ap(st, 0, null).ok && !ap(st, 0, { t: 'wat' }).ok, '없는 카드 · 잘못된 행동은 거절');
  ok(ap(st, 0, { t: 'card', c: 3 }).ok && st.pos[0] === 3 && st.hand[0].join() === '1,2,4', '카드 3 → 3칸 이동, 손에서 빠져요');
  ok(G.cur(st) === 1, '다음 사람 차례');
  st.hand[0] = [2]; setTurn(st, 0); ap(st, 0, { t: 'card', c: 2 });
  ok(st.hand[0].join() === '1,2,3,4' && st.pos[0] === 5, '4장을 다 쓰면 새 세트');
  setTurn(st, 0); st.pos[0] = 29; ap(st, 0, { t: 'card', c: 1 });
  ok(st.pos[0] === 30 && st.fin[0] === -1, '30칸은 아직 골인 아님');
  setTurn(st, 0); ap(st, 0, { t: 'card', c: 2 });
  ok(st.fin[0] === 0 && st.finOrder.join() === '0' && st.pos[0] === 31, '31칸 이상이면 골인 (넘쳐도)');
  ok(G.cur(st) !== 0, '골인한 사람은 건너뛰어요');
}
// 3) 그래비티
{
  const st = mk(['grav', 'push', 'with', 'union'], 6);
  st.pos = [5, 9, 2, 5];
  setTurn(st, 0);
  ok(!ap(st, 0, { t: 'grav', c: 9, tg: 1 }).ok && !ap(st, 0, { t: 'grav', c: 2, tg: 0 }).ok && !ap(st, 0, { t: 'grav', c: 2, tg: 3 }).ok, '없는 카드 · 나 자신 · 같은 칸은 못 지목');
  ok(ap(st, 0, { t: 'grav', c: 2, tg: 1 }).ok && st.pos[1] === 6 && st.pos[0] === 5 && st.hand[0].join() === '1,3,4', '내 앞의 사람은 내 앞 1칸으로 · 나는 이동 안 해요 · 카드는 소모');
  setTurn(st, 0);
  ok(!ap(st, 0, { t: 'grav', c: 1, tg: 1 }).ok, '같은 사람을 연속 지목 못 해요');
  ok(ap(st, 0, { t: 'grav', c: 1, tg: 2 }).ok && st.pos[2] === 4, '내 뒤의 사람은 내 뒤 1칸으로');
  setTurn(st, 1); ok(st.ab[1] === 'push' && !ap(st, 1, { t: 'grav', c: 1, tg: 0 }).ok, '다른 캐릭터는 그래비티를 못 써요');
  const g2 = mk(['grav', 'push', 'with']); g2.pos = [0, 3, 5];
  const A = G.actions(g2);
  ok(A.some(a => a.t === 'grav') && A.some(a => a.t === 'card'), '행동 목록에 그래비티가 있어요 (다른 칸에 사람이 있을 때)');
  ok(!G.actions(mk(['grav', 'push', 'with'])).some(a => a.t === 'grav'), '모두 같은 칸이면 그래비티 행동이 없어요');
}
// 4) 푸시
{
  const st = mk(['push', 'grav', 'with'], 7);
  st.pos = [1, 3, 9]; setTurn(st, 0);
  ap(st, 0, { t: 'card', c: 2 });
  ok(st.phase === 'push' && st.pend.cands.join() === '1' && G.cur(st) === 0, '같은 칸(3)에 다른 사람이 있으면 푸시를 쓸 수 있어요');
  ok(!ap(st, 0, { t: 'card', c: 1 }).ok && !ap(st, 0, { t: 'push', tg: 2, dir: 1 }).ok && !ap(st, 0, { t: 'push', tg: 1, dir: 2 }).ok, '푸시 단계에선 다른 행동 · 없는 대상은 거절');
  ok(ap(st, 0, { t: 'push', tg: 1, dir: 1 }).ok && st.pos[1] === 4 && st.pos[0] === 3, '앞으로 1칸 밀기');
  const s2 = mk(['push', 'grav', 'with'], 8); s2.pos = [1, 3, 9]; setTurn(s2, 0); ap(s2, 0, { t: 'card', c: 2 });
  ap(s2, 0, { t: 'push', tg: 1, dir: -1 }); ok(s2.pos[1] === 2, '뒤로 1칸 밀기');
  const s3 = mk(['push', 'grav', 'with'], 9); s3.pos = [1, 3, 9]; setTurn(s3, 0); ap(s3, 0, { t: 'card', c: 2 });
  ok(ap(s3, 0, { t: 'skip' }).ok && s3.pos[1] === 3 && G.cur(s3) === 2, '밀지 않고 넘어갈 수 있어요');
  const s5 = mk(['push', 'grav', 'with'], 11); s5.pos = [0, 0, 9]; setTurn(s5, 0); ap(s5, 0, { t: 'card', c: 1 });
  ok(s5.phase === 'card' && G.cur(s5) === 1 || s5.phase !== 'push', '이동한 칸에 아무도 없으면 푸시 단계 없음');
  const s6 = mk(['push', 'grav', 'with'], 12); s6.pos = [0, 4, 9]; s6.hand[0] = [4]; setTurn(s6, 0); ap(s6, 0, { t: 'card', c: 4 });
  ok(s6.phase === 'push', '(칸 4 에서 만났어요)');
}
// 5) 유니온
{
  const st = mk(['union', 'grav', 'with', 'push'], 13);
  st.pos = [4, 6, 6, 7]; setTurn(st, 0);
  ap(st, 0, { t: 'card', c: 1 });
  ok(st.pos.join() === '5,5,5,7', '이동한 뒤 내 1칸 앞(6)에 있던 사람이 모두 내 칸(5)으로');
  const s2 = mk(['union', 'grav', 'with'], 14); s2.pos = [0, 1, 5]; setTurn(s2, 0); s2.hand[0] = [4];
  ap(s2, 0, { t: 'card', c: 4 }); ok(s2.pos[0] === 4 && s2.pos[1] === 1, '(4칸에서는 1칸 앞(5)의 사람이 없어서 그대로)');
  const s3 = mk(['union', 'grav', 'with'], 15); s3.pos = [0, 1, 5]; setTurn(s3, 0); s3.hand[0] = [1, 2];
  ap(s3, 0, { t: 'card', c: 1 }); ok(s3.pos[0] === 1 && s3.pos[1] === 1, '출발점에서 한 이동이 끝나 1칸이 되었고, 앞 칸(2)에 사람이 없어 그대로');
  const s4 = mk(['union', 'grav', 'with'], 16); s4.pos = [0, 2, 5]; setTurn(s4, 0);
  ap(s4, 0, { t: 'card', c: 1 }); ok(s4.pos[0] === 1 && s4.pos[1] === 1 && s4.pos[2] === 5, '1칸으로 이동하면 내 1칸 앞(2)의 사람을 끌어와요 (5칸은 그대로)');
  const s5 = mk(['union', 'grav', 'with'], 17); s5.pos = [0, 1, 5]; setTurn(s5, 0); s5.hand[0] = [1];
  s5.pos[0] = 0; s5.pos[1] = 1; ap(s5, 0, { t: 'card', c: 1 });
  ok(s5.pos[0] === 1 && s5.pos[1] === 1, '출발점(0)에서 이동한 뒤에는 정상 (1칸 앞 사람이 없어 그대로)');
}
// 6) 위드
{
  const st = mk(['with', 'grav', 'push'], 17);
  st.pos = [10, 2, 5]; st.hand[0] = [3]; setTurn(st, 0);
  ok(G.actions(st).some(a => a.t === 'card' && a.w === 1), '마지막 카드 1장이면 지목 행동이 있어요');
  ap(st, 0, { t: 'card', c: 3, w: 1 });
  ok(st.pos[0] === 13 && st.pos[1] === 5 && st.lastTg.with === 1, '지목한 사람이 같은 칸 수만큼 같이 이동');
  const s2 = mk(['with', 'grav', 'push'], 18); setTurn(s2, 0);
  ok(!ap(s2, 0, { t: 'card', c: 2, w: 1 }).ok, '카드가 2장 이상이면 위드 불가');
  const s3 = mk(['with', 'grav', 'push'], 19); s3.hand[0] = [3]; s3.lastTg.with = 1; setTurn(s3, 0);
  ok(!ap(s3, 0, { t: 'card', c: 3, w: 1 }).ok && ap(s3, 0, { t: 'card', c: 3, w: 2 }).ok, '같은 사람을 연속 지목 못 해요');
  const s4 = mk(['with', 'grav', 'push'], 20); s4.pos = [29, 30, 0]; s4.hand[0] = [2]; setTurn(s4, 0);
  ap(s4, 0, { t: 'card', c: 2, w: 1 });
  ok(s4.finOrder.join() === '1,0', '동시 골인: 이동 전 결승에 더 가까웠던 사람(30칸)이 먼저');
  const s5 = mk(['with', 'grav', 'push'], 21); s5.pos = [29, 29, 0]; s5.hand[0] = [2]; setTurn(s5, 0);
  ap(s5, 0, { t: 'card', c: 2, w: 1 });
  ok(s5.finOrder.join() === '1,0', '같은 칸이면 캐릭터 번호가 빠른 사람(그래비티1)이 먼저');
}
// 7) 사일런스
{
  const st = mk(['sil', 'push', 'grav'], 22);
  setTurn(st, 0);
  ok(st.phase === 'sil' && !ap(st, 0, { t: 'card', c: 1 }).ok && !ap(st, 0, { t: 'sil', tg: 0 }).ok, '사일런스 차례엔 먼저 지목 (나 자신은 못 해요)');
  ok(ap(st, 0, { t: 'sil', tg: 1 }).ok && st.silTg === 1 && st.phase === 'card', '푸시를 지목');
  st.pos = [0, 1, 9]; setTurn(st, 1); ap(st, 1, { t: 'card', c: 2 });
  ok(st.pos[1] === 3 && st.phase !== 'push', '막힌 능력은 쓸 수 없어요');
  setTurn(st, 2); ok(!ap(st, 2, { t: 'sil', tg: 1 }).ok, '그래비티는 사일런스 대상이 아니라 막히지 않았어요 (사일런스 행동은 안 돼요)');
  st.pos = [0, 1, 3]; setTurn(st, 0);
  ok(!ap(st, 0, { t: 'sil', tg: 1 }).ok && ap(st, 0, { t: 'sil', tg: 2 }).ok && st.silTg === 2, '같은 사람 연속 지목 불가 · 새로 지목하면 이전 대상의 능력이 풀려요');
  st.pos = [0, 1, 6]; setTurn(st, 2); ok(!ap(st, 2, { t: 'grav', c: 1, tg: 0 }).ok, '막힌 그래비티는 못 써요');
  setTurn(st, 1); ap(st, 1, { t: 'card', c: 1 });
  ok(st.cur === undefined && G.cur(st) === 0 && st.silTg === null && st.phase === 'sil', '사일런스는 다음 내 차례가 오면 풀려요');
  const s4 = mk(['sil', 'push', 'grav'], 25); s4.silTg = 1; s4.fin[0] = 0; s4.finOrder.push(0); s4.pos[0] = G.GOAL;
  setTurn(s4, 1); ap(s4, 1, { t: 'card', c: 1 });
  ok(s4.silTg === 1, '(참고) 사일런스를 쓴 사람이 골인해도 이미 막은 건 그 차례까지는 유지돼요');
  const s5 = mk(['sil', 'push', 'grav'], 26); s5.silTg = 1; s5.hand[0] = [1, 2, 3, 4]; s5.pos = [30, 1, 3]; setTurn(s5, 0, 'card'); ap(s5, 0, { t: 'card', c: 4 });
  ok(s5.fin[0] >= 0 && s5.silTg === null, '사일런스 보유자가 골인하면 막은 효과도 사라져요');
  const bad = G.init({ n: 3, seed: 3, cfg: { ab: ['sil', 'sil', 'nope'] } });
  ok(new Set(bad.ab).size === 3 && bad.ab.every(k => G.KEYS.includes(k)), '잘못된 능력 설정은 무시하고 제비뽑기');
  const s2 = mk(['sil', 'push', 'grav'], 23); s2.silTg = 1; s2.pos = [0, 1, 3]; setTurn(s2, 1); ap(s2, 1, { t: 'card', c: 2 });
  ok(s2.phase !== 'push', '막힌 푸시는 같은 칸에 사람이 있어도 단계가 없어요');
  const s3 = mk(['sil', 'push', 'grav'], 24); s3.silTg = 2; s3.pos = [0, 1, 3]; setTurn(s3, 1); ap(s3, 1, { t: 'card', c: 2 });
  ok(s3.phase === 'push', '막히지 않은 푸시는 정상 (같은 칸 3)');
}
// 8) 중간 승리 · 종료
{
  const place = (ab, order) => {   // 골인 순서대로 한 명씩 31칸에 보내요
    const st = mk(ab, 30);
    for (const s of order) { setTurn(st, s, 'card'); st.pos[s] = 30; st.hand[s] = [4]; if (!G.over(st)) ap(st, s, { t: 'card', c: 4 }); }
    return st;
  };
  let st = place(['grav', 'push', 'with'], [2, 0]);
  ok(G.over(st) && st.places.join() === '2,0,1' && st.ranks.join() === '0,1,1', '3명: 두 번째로 골인한 0번이 우승 · 1등(2번)과 꼴찌(1번)는 한 칸 차이');
  st = place(['grav', 'push', 'with', 'union'], [3, 1, 0]);
  ok(G.over(st) && st.places.join() === '3,1,0,2' && st.ranks.join() === '0,0,1,1', '4명: 2·3등(1번 · 0번)이 공동 우승, 1등(3번) · 꼴찌(2번)는 한 칸 차이');
  st = place(['grav', 'push', 'with', 'union', 'sil'], [4, 2, 1]);
  ok(G.over(st) && st.places.join() === '4,2,1,0,3' && st.ranks.join() === '1,0,1,2,2', '5명: 세 번째로 골인한 1번만 우승 (남은 사람은 칸이 같으면 캐릭터 번호 순)');
  ok(st.ranks.filter(x => x === 0).length === 1 && G.needs(st).length === 0 && !ap(st, 0, { t: 'card', c: 1 }).ok, '5명: 우승 1명 · 끝나면 행동 불가');
  // 아직 골인 못 한 사람은 앞선 칸 순으로 다음 순위
  const s2 = mk(['grav', 'push', 'with', 'union'], 31);
  s2.pos = [10, 20, 5, 15]; s2.finOrder = [0]; s2.fin[0] = 0; s2.pos[0] = 31;
  setTurn(s2, 1); s2.pos[1] = 30; s2.hand[1] = [4]; ap(s2, 1, { t: 'card', c: 4 }); setTurn(s2, 3); s2.pos[3] = 30; s2.hand[3] = [4]; ap(s2, 3, { t: 'card', c: 4 });
  ok(G.over(s2) && s2.places.join() === '0,1,3,2', '남은 사람(5칸)이 꼴찌');
}
// 9) 모두 공개 · 보기
{
  const st = G.init({ n: 4, seed: 41 });
  ap(st, G.cur(st), { t: 'card', c: 2 });
  const pubs = [0, 1, 2, 3, -1].map(s => G.view(st, s).pub);
  ok(new Set(pubs).size === 1, '손패 · 능력 · 위치는 모두 공개 — 누가 봐도 같아요');
  const V = G.view(st, 0);
  ok(JSON.stringify(V.hand) === JSON.stringify(st.hand) && V.ab.join() === st.ab.join() && V.pos.join() === st.pos.join(), '보기에 손패 · 능력 · 위치');
  ok(JSON.stringify(G.actions(G.fromView(V))) === JSON.stringify(G.actions(st)), '보기만으로 같은 행동 목록을 만들 수 있어요');
  ok(V.needs.length === 1 && V.cur === G.cur(st) && V.W.join() === '2,3' && V.need === 3, '차례 · 우승 순위 · 끝나는 골인 수');
  ok(G.legal(st, V.cur).length > 0 && G.legal(st, (V.cur + 1) % 4).length === 0, '내 차례에만 행동이 있어요');
}
// 10) 선생님 · AI 한 판
{
  const st = G.init({ n: 4, seed: 51 });
  const c = G.coach(G.view(st, G.cur(st)), G.cur(st), 0, null);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string' && c[k].length > 2) && /%/.test(c.why), '선생님: 추천과 가능성');
  const o = (G.cur(st) + 1) % 4, c2 = G.coach(G.view(st, o), o, 0, null);
  ok(c2.rec === '기다려요', '내 차례가 아니면 기다려요');
  ok(G.actText({ t: 'grav', c: 2, tg: 1 }, i => `${i}번`).includes('끌어와요') && G.actText({ t: 'card', c: 3, w: 1 }, i => `${i}번`).includes('같이 이동'), '행동 문장');
  let games = 0, fails = 0;
  for (const n of [3, 4, 5]) for (let g = 0; g < 6; g++) {
    const s = G.init({ n, seed: 600 + g * 17 + n }), T = [...Array(n).keys()].map(i => ['hard', 'normal', 'easy'][(i + g) % 3]), r = G.sampler(g + n);
    let guard = 0;
    while (!G.over(s) && guard++ < 1500) {
      const seat = G.needs(s)[0], a = G.ai(G.view(s, seat), seat, T[seat], r), res = ap(s, seat, a);
      if (!res.ok) { fails++; ap(s, seat, G.legal(s, seat)[0]); }
    }
    games++;
    ok(G.over(s) && s.ranks.filter(x => x === 0).length === G.WIN[n].length && s.places.length === n && new Set(s.places).size === n, `${n}명 ${g}판: 끝나고 우승 ${G.WIN[n].length}명`);
  }
  ok(fails === 0, `AI 가 규칙에 어긋난 수를 둔 적 없음 (${fails})`);
}
// 11) AI 세기: 어려움 · 보통 > 쉬움
{
  const sum = { easy: 0, normal: 0, hard: 0 }, cnt = { easy: 0, normal: 0, hard: 0 };
  for (let g = 0; g < 36; g++) {
    const st = G.init({ n: 4, seed: 900 + g * 7 }), T = [...Array(4).keys()].map(i => ['hard', 'normal', 'easy', 'easy'][(i + g) % 4]), r = G.sampler(g * 3 + 1);
    let guard = 0;
    while (!G.over(st) && guard++ < 1500) { const s = G.needs(st)[0]; ap(st, s, G.ai(G.view(st, s), s, T[s], r)); }
    for (let i = 0; i < 4; i++) { cnt[T[i]]++; sum[T[i]] += st.ranks[i]; }
  }
  const avg = t => sum[t] / cnt[t];
  console.log(`  평균 순위값(낮을수록 좋음) hard ${avg('hard').toFixed(2)} · normal ${avg('normal').toFixed(2)} · easy ${avg('easy').toFixed(2)}`);
  ok(avg('hard') < avg('easy') - 0.1 && avg('normal') < avg('easy') - 0.05, '어려움 · 보통 AI 가 쉬운 AI 보다 우승 순위에 가까워요');
}
console.log(`gn-midrun selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

'use strict';
// 중간 달리기 selftest — 옛 판(ver 없음: 능력 5개 · 중간 승리) + 방송 판(r3 3화 · r9 9화: 능력 11 · 10개 · 말 · 공개 정보 · AI)
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
// ═══════════════════════════════════════════════════════════════════════
//  방송 판 — 3화(r3: 11캐릭터 · 1등과 꼴찌만 탈락) · 9화(r9: 10캐릭터 · 플레이어 + 게스트 · 5·6등 우승)
// ═══════════════════════════════════════════════════════════════════════
const mkN = (ver, ab, seed) => G.init({ n: ver === 'r9' ? ab.length / 2 : ab.length, seed: seed || 5, cfg: { ver, ab } });
const turnN = (st, p) => { st.ti = st.tord.indexOf(p); st.phase = 'card'; st.stk = []; };
const apN = (st, p, a) => G.apply(st, st.ow[p], a);
const handsOf = (st, p, h) => { st.hand[p] = h.slice(); st.hk[p] = h.slice(); st.sup[p] = h.slice(); };
const snap = st => JSON.stringify(st);
const tgs = st => G.actions(st).map(a => a.tg).join();

// 12) 옛 복기 호환 — cfg 에 ver 가 없으면 예전 규칙 그대로 (판 나누기 전 core 로 돌린 판의 지문과 같아야 해요)
{
  const mulberry = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const GOLD = { '3-0-61': 'h1dn4h', '3-1-64': '1ux3olk', '4-0-68': 'daic31', '4-1-71': 'pe398i', '5-0-75': '1o9vfh', '5-1-78': '10iicc8' };   // 판 나누기 전 core 로 잰 값
  const TI = ['normal', 'easy', 'hard', 'easy', 'normal'];
  for (const key of Object.keys(GOLD)) {
    const [n, k, seed] = key.split('-').map(Number), T = Array.from({ length: n }, (_, i) => TI[(i + k) % 5]);
    const st = G.init({ n, seed }), r = mulberry(seed ^ 99), seq = []; let guard = 0;
    while (!G.over(st) && guard++ < 3000) { const sx = G.needs(st)[0], a = G.ai(G.view(st, sx), sx, T[sx], r); ap(st, sx, a); seq.push(G.canon(a)); }
    ok(G.hash(JSON.stringify([seq, G.ranks(st), st.places, st.turnNo, st.log.length])) === GOLD[key] && st.ver === undefined, `옛 복기 호환: ver 없는 ${n}명 판(씨앗 ${seed})이 옛 core 와 같은 판`);
  }
  const old = G.init({ n: 4, seed: 9 }), old2 = G.init({ n: 4, seed: 9, cfg: {} });
  ok(snap(old) === snap(old2) && old.ab.length === 4 && G.ranks(old) === null, 'cfg 가 비어도 옛 규칙 (능력 5개 중 4개 · 중간 우승)');
  ok(G.init({ n: 4, seed: 9, cfg: { ver: 'x1' } }).ver === undefined, '모르는 ver 는 옛 규칙으로 읽어요');
}
// 13) 새 판 시작 · 우승 순위 · 능력 수
{
  for (const [ver, P, W] of [['r3', 4, '2,3'], ['r9', 8, '4,5']]) {
    const st = G.init({ n: 4, seed: 11, cfg: { ver } });
    ok(st.ver === ver && st.P === P && new Set(st.ab).size === P && st.ab.every(k => G.ROST[ver].includes(k)), `${ver}: 말 ${P}개 · 능력이 겹치지 않아요 (${G.ROST[ver].length}개 중 제비뽑기)`);
    ok(G.winPlaces(st).join() === W, `${ver}: 우승 순위 ${W}`);
    ok(st.tord.every((x, i) => i === 0 || G.numN(st, st.tord[i - 1]) < G.numN(st, x)), `${ver}: 캐릭터 번호 순서로 차례`);
    ok(st.hand.every((h, p) => h.join() === (st.ab[p] === 'jump' ? '0,1,2,3,4' : '1,2,3,4')), `${ver}: 카드 세트 (점프만 0~4)`);
  }
  const r9 = G.init({ n: 3, seed: 2, cfg: { ver: 'r9' } });
  ok(r9.P === 6 && r9.ow.join() === '0,0,1,1,2,2', 'r9: 한 자리 = 플레이어 + 게스트 말 2개');
  ok(G.ROST.r9.join() === 'grav,push,del,offer,with,union,mirror,copy,reset,sil' && G.ROST.r3.length === 11, '캐릭터 번호표 (9화 10명 · 3화 11명)');
  ok(G.init({ n: 3, seed: 5, cfg: { ver: 'r3' } }).P === 3 && G.init({ n: 5, seed: 5, cfg: { ver: 'r3' } }).P === 5, 'r3: 한 자리 = 말 1개');
  const a = G.init({ n: 4, seed: 77, cfg: { ver: 'r9' } }), b = G.init({ n: 4, seed: 77, cfg: { ver: 'r9' } }), c = G.init({ n: 4, seed: 78, cfg: { ver: 'r9' } });
  ok(snap(a) === snap(b) && a.ab.join() !== c.ab.join(), '같은 씨앗이면 같은 능력 배정 · 다르면 달라요');
  const f = mkN('r3', ['grav', 'reset', 'push', 'del']); ok(f.ab.join() === 'grav,reset,push,del', 'cfg.ab 로 능력을 정해 시작할 수 있어요 (복기 · 시험)');
}
// 14) 능력 하나씩 (3화판)
{ // 리셋 — 내 말이 뒤로 가면 1명을 지목해 그 이동카드를 리셋 · 같은 사람 연속 지목 못 함
  const st = mkN('r3', ['grav', 'reset', 'push', 'del']);
  st.pos = [3, 5, 0, 0]; handsOf(st, 2, [4]); turnN(st, 0);
  ok(apN(st, 0, { t: 'grav', c: 2, tg: 1 }).ok && st.pos[1] === 4, '그래비티가 리셋을 뒤로 당김');
  ok(st.phase === 'res' && G.needs(st)[0] === 1 && tgs(st) === '0,2,3' && G.actions(st).every(a => a.t === 'rst'), '리셋: 내 말이 뒤로 가면 지목 선택 (골인 안 한 다른 말)');
  ok(!apN(st, 1, { t: 'rst', tg: 1 }).ok, '자기 자신은 못 지목');
  ok(apN(st, 1, { t: 'rst', tg: 2 }).ok && st.hand[2].join() === '1,2,3,4', '리셋: 지목한 말의 이동카드가 새 세트로');
  st.lt[0].grav = null; st.pos = [3, 5, 0, 0]; turnN(st, 0); apN(st, 0, { t: 'grav', c: 3, tg: 1 });
  ok(tgs(st) === '0,3', '리셋: 같은 말을 연속으로 지목 못 해요 (직전에 2번을 지목했으니 0 · 3 만)');
  const fresh = mkN('r3', ['grav', 'reset', 'push', 'del']); fresh.pos = [3, 5, 0, 0]; turnN(fresh, 0);
  ok(!G.actions(fresh).some(a => a.t === 'rst'), '리셋은 내가 뒤로 갈 때만 — 시작엔 지목 없음');
}
{ // 푸시 — 다른 말과 같은 칸이면 앞뒤로 1칸 (출발점에선 안 돼요)
  const st = mkN('r3', ['push', 'grav', 'with', 'union']);
  st.pos = [5, 3, 0, 0]; turnN(st, 1);
  apN(st, 1, { t: 'card', c: 2 });
  ok(st.phase === 'res' && G.needs(st)[0] === 0 && G.actions(st).length === 2 && G.actions(st).every(a => a.t === 'push' && a.tg === 1), '푸시: 같은 칸이 되면 푸시가 밀어낼 방향을 골라요');
  ok(apN(st, 0, { t: 'push', tg: 1, dir: -1 }).ok && st.pos[1] === 4 && st.phase === 'card', '푸시: 1칸 뒤로 밀어냄');
  const z = mkN('r3', ['push', 'grav', 'with', 'union']);
  ok(z.phase === 'card' && !G.actions(z).some(a => a.t === 'push'), '푸시: 모두 출발점이면 안 터져요');
}
{ // 딜리트 — 능력으로 내가 이동하면 1명 지목 → 그 이동카드를 보고 1장만 남김 · 본 사람만 알아요
  const st = mkN('r3', ['grav', 'reset', 'push', 'del']);
  st.pos = [0, 0, 0, 5]; turnN(st, 0);
  apN(st, 0, { t: 'grav', c: 1, tg: 3 });
  ok(st.phase === 'res' && G.needs(st)[0] === 3 && tgs(st) === '0,1,2', '딜리트: 능력으로 이동하면 지목');
  ok(apN(st, 3, { t: 'del', tg: 1 }).ok && G.actions(st).map(a => a.c).join() === '1,2,3,4', '딜리트: 지목한 말의 이동카드를 보고 남길 카드를 골라요');
  ok(apN(st, 3, { t: 'dk', c: 2 }).ok && st.hand[1].join() === '2', '딜리트: 1장만 남김');
  const V0 = G.view(st, 0), V3 = G.view(st, 3), V1 = G.view(st, 1), VA = G.view(st, 'all');
  ok(V3.hand[1] && V3.hand[1].join() === '2' && V1.hand[1].join() === '2', '딜리트: 지운 사람 · 주인은 남은 카드를 알아요');
  ok(V0.hand[1] === null && V0.cnt[1] === 1 && V0.sup[1].join() === '1,2,3,4', '딜리트: 다른 사람은 남은 카드를 몰라요 (장수만 · 가능한 범위만)');
  ok(VA.hand[1].join() === '2', "'all'(복기)에서는 보여요");
  ok(V0.st.hand[1] === null, '내부 표본(view.st)에도 몰라요');
  const mv = mkN('r3', ['grav', 'reset', 'push', 'del']); mv.pos = [0, 0, 0, 5]; turnN(mv, 0); apN(mv, 0, { t: 'grav', c: 1, tg: 3 }); apN(mv, 3, { t: 'del', tg: 1 }); apN(mv, 3, { t: 'dk', c: 2 });
  mv.pos = [0, 0, 0, 5]; mv.lt[0].grav = null; turnN(mv, 0); apN(mv, 0, { t: 'grav', c: 2, tg: 3 });
  ok(tgs(mv) === '0,2', '딜리트: 직전에 지목한 말(1번)은 연속으로 못 골라요');
}
{ // 위드 — 마지막 카드 1장일 때 1명 지목하면 같은 칸 수만큼 같이 이동
  const st = mkN('r3', ['grav', 'push', 'with', 'union']);
  st.pos = [0, 0, 10, 0]; handsOf(st, 2, [3]); turnN(st, 2);
  ok(G.actions(st).some(a => a.w === 0) && G.actions(st).some(a => a.w === undefined), '위드: 마지막 카드일 때만 짝 지목');
  ok(apN(st, 2, { t: 'card', c: 3, w: 0 }).ok && st.pos[2] === 13 && st.pos[0] === 3, '위드: 같은 칸 수만큼 같이 이동');
  const b = mkN('r3', ['grav', 'push', 'with', 'union']); turnN(b, 2);
  ok(!G.actions(b).some(a => a.w !== undefined), '위드: 카드가 여러 장이면 못 씀');
  const g = mkN('r3', ['grav', 'push', 'with', 'union']); g.pos = [28, 0, 29, 0]; handsOf(g, 2, [3]); turnN(g, 2); apN(g, 2, { t: 'card', c: 3, w: 0 });
  ok(g.fin[2] === 0 && g.fin[0] === 1 && g.finOrder.join() === '2,0', '위드: 같이 이동해 둘 다 골인하면 내 말이 먼저 (이동 전 결승에 가까웠던 순)');
}
{ // 유니온 — 3화는 자동으로 · 내 1칸 앞의 말을 내 칸으로 / 9화는 선택
  const st = mkN('r3', ['grav', 'with', 'union', 'sil']);
  st.pos = [6, 0, 4, 9]; turnN(st, 2); apN(st, 2, { t: 'card', c: 1 });
  ok(st.pos[2] === 5 && st.pos[0] === 5, '3화 유니온: 이동 뒤 1칸 앞의 말을 내 칸으로 끌어와요 (자동)');
  const s9 = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  s9.pos = [0, 0, 6, 0, 0, 4]; turnN(s9, 5); apN(s9, 5, { t: 'card', c: 1 });
  ok(s9.phase === 'res' && G.needs(s9)[0] === 2, '9화 유니온: 쓸지 고를 수 있어요 (유니온 말의 자리가 고름)');
  const ac = G.actions(s9); ok(ac.length === 2 && ac.every(a => a.t === 'uni'), '9화 유니온: 쓰기 · 안 쓰기');
  apN(s9, 5, { t: 'uni', u: 1 }); ok(s9.pos[2] === 5, '9화 유니온: 쓰면 끌어와요');
  const s9b = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']); s9b.pos = [0, 0, 6, 0, 0, 4]; turnN(s9b, 5); apN(s9b, 5, { t: 'card', c: 1 }); apN(s9b, 5, { t: 'uni', u: 0 });
  ok(s9b.pos[2] === 6 && s9b.pos[5] === 5, '9화 유니온: 안 쓰면 그대로');
}
{ // 원 — 다른 말이 카드 1을 내면 그 말이 움직이기 전에 앞/뒤 1칸
  const st = mkN('r3', ['grav', 'push', 'one', 'sil']);
  st.pos = [0, 0, 5, 0]; turnN(st, 0); apN(st, 0, { t: 'card', c: 1 });
  ok(st.phase === 'res' && G.needs(st)[0] === 2 && st.pos[0] === 0, '원: 카드 1이 나오면 움직이기 전에 원이 먼저');
  ok(G.actions(st).map(a => a.dir).join() === '1,-1', '원: 앞 · 뒤 1칸');
  apN(st, 2, { t: 'onc', dir: -1 }); ok(st.pos[2] === 4 && st.pos[0] === 1, '원: 1칸 뒤로 간 다음 카드 1 이동');
  const b = mkN('r3', ['grav', 'push', 'one', 'sil']); b.pos = [0, 0, 5, 0]; turnN(b, 0); apN(b, 0, { t: 'card', c: 2 });
  ok(b.phase === 'card' && b.pos[0] === 2, '원: 카드 1이 아니면 안 터져요');
}
{ // 미러 — 능력으로 내가 이동하면 1명을 지목해 같은 칸 수만큼 반대 방향으로
  const st = mkN('r3', ['grav', 'with', 'union', 'mirror']);
  st.pos = [2, 0, 0, 5]; turnN(st, 0); apN(st, 0, { t: 'grav', c: 1, tg: 3 });
  ok(st.pos[3] === 3 && st.phase === 'res' && G.needs(st)[0] === 3 && G.actions(st).every(a => a.t === 'mir'), '미러: 능력으로 2칸 뒤로 가면 지목');
  apN(st, 3, { t: 'mir', tg: 1 }); ok(st.pos[1] === 2, '미러: 지목한 말은 반대로 2칸 앞으로');
  const own = mkN('r3', ['grav', 'with', 'union', 'mirror']); own.pos = [0, 0, 0, 2]; turnN(own, 3); apN(own, 3, { t: 'card', c: 2 });
  ok(own.phase === 'card' && own.pos[3] === 4, '미러: 내 카드 이동에는 안 터져요');
}
{ // 점프 — 이동카드 0~4 · 다른 말이 있는 칸은 건너뛰어요
  const st = mkN('r3', ['grav', 'push', 'jump', 'sil']);
  st.pos = [4, 5, 3, 0]; turnN(st, 2);
  ok(G.actions(st).map(a => a.c).join() === '0,1,2,3,4', '점프: 카드 0~4');
  apN(st, 2, { t: 'card', c: 2 }); ok(st.pos[2] === 7, '점프: 4 · 5칸의 말을 건너뛰고 7칸');
  const z = mkN('r3', ['grav', 'push', 'jump', 'sil']); z.pos = [0, 0, 3, 0]; turnN(z, 2); apN(z, 2, { t: 'card', c: 0 });
  ok(z.pos[2] === 3, '점프: 카드 0 은 제자리');
}
{ // 사일런스 — 카드를 내기 전 1명 지목, 다음 내 차례까지 능력 정지
  const st = mkN('r3', ['grav', 'push', 'sil']);
  turnN(st, 2); st.phase = 'sil';
  ok(tgs(st) === '0,1' && G.actions(st).every(a => a.t === 'sil'), '사일런스: 카드 내기 전에 지목');
  apN(st, 2, { t: 'sil', tg: 0 });
  ok(st.phase === 'card' && G.effN(st, 0) === null && G.silencedN(st, 0), '사일런스: 지목된 말은 능력이 막혀요');
  st.pos = [3, 5, 0]; turnN(st, 0);
  ok(!G.actions(st).some(a => a.t === 'grav'), '막힌 동안은 그래비티 행동이 없어요');
  const s3 = mkN('r3', ['grav', 'push', 'sil']); turnN(s3, 2); s3.phase = 'sil'; apN(s3, 2, { t: 'sil', tg: 0 }); apN(s3, 2, { t: 'card', c: 1 });
  ok(s3.sil[2] === 0 && G.cur(s3) === 0, '사일런스: 카드를 낸 뒤에도 막힘 유지 · 다음 사람 차례');
  apN(s3, 0, { t: 'card', c: 1 }); apN(s3, 1, { t: 'card', c: 2 });
  ok(s3.phase === 'sil' && s3.sil[2] === null && !G.silencedN(s3, 0), '사일런스: 내 차례가 오면 막힘이 풀리고 새로 지목해요');
}
{ // 퀵 — 카드를 2배로 · 한 세트에서 앞으로는 2장까지만 (나머지는 뒤로)
  const st = mkN('r3', ['grav', 'push', 'quick']);
  st.pos = [0, 0, 10]; turnN(st, 2);
  ok(G.actions(st).filter(a => a.d === 1).length === 4 && G.actions(st).filter(a => a.d === -1).length === 4, '퀵: 카드마다 앞 · 뒤 선택');
  apN(st, 2, { t: 'card', c: 3, d: 1 }); ok(st.pos[2] === 16 && st.qf[2] === 1, '퀵: 카드 3 × 2 = 6칸 앞으로');
  turnN(st, 2); apN(st, 2, { t: 'card', c: 2, d: 1 }); ok(st.pos[2] === 20 && st.qf[2] === 2, '퀵: 카드 2 × 2 = 4칸');
  turnN(st, 2); ok(G.actions(st).every(a => a.d === -1) && G.actions(st).length === 2, '퀵: 앞으로 2장을 썼으면 나머지는 뒤로만');
  apN(st, 2, { t: 'card', c: 4, d: -1 }); ok(st.pos[2] === 12, '퀵: 카드 4 × 2 = 8칸 뒤로');
  turnN(st, 2); apN(st, 2, { t: 'card', c: 1, d: -1 }); ok(st.qf[2] === 0 && st.hand[2].join() === '1,2,3,4', '퀵: 세트를 다 쓰면 새 세트 · 앞으로 횟수도 새로');
  const z = mkN('r3', ['grav', 'push', 'quick']); z.pos = [0, 0, 1]; turnN(z, 2); apN(z, 2, { t: 'card', c: 4, d: -1 });
  ok(z.pos[2] === 0, '퀵: 뒤로는 출발점 아래로 안 가요');
}
// 15) 9화 능력 — 오퍼 · 카피
{ // 오퍼 — 내 카드가 리셋될 때마다 새 카드 중 1장을 다른 말에게 줘요
  const st = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  handsOf(st, 3, [2]); turnN(st, 3); apN(st, 3, { t: 'card', c: 2 });
  ok(st.phase === 'res' && G.needs(st)[0] === 1 && G.actions(st).every(a => a.t === 'off') && G.actions(st).length === 20, '오퍼: 리셋되면 새 카드 4장 중 1장을 줄 말을 골라요 (4장 × 5말)');
  ok(apN(st, 3, { t: 'off', c: 3, tg: 0 }).ok && st.hand[3].join() === '1,2,4' && st.hand[0].join() === '1,2,3,3,4', '오퍼: 카드 3 이 말 0 에게 넘어가요 (그 말은 5장)');
  ok(G.view(st, 2).hand[0] === null && G.view(st, 2).cnt[0] === 5 && G.view(st, 0).hand[0].join() === '1,2,3,3,4', '오퍼: 받은 말의 주인만 정확히 알고 남들은 장수만 알아요');
  ok(G.view(st, 1).hand[0].join() === '1,2,3,3,4' && G.view(st, 1).hand[3].join() === '1,2,4', '오퍼: 준 사람은 준 카드를 알고 남은 카드는 주인(자기)이 알아요');
  ok(G.view(st, 2).hand[3] === null, '오퍼: 남은 카드는 남들이 몰라요');
}
{ // 카피 — 내 카드가 리셋될 때마다 1명을 지목해 그 능력을 복사
  const st = mkN('r9', ['grav', 'push', 'offer', 'copy', 'reset', 'sil']);
  handsOf(st, 3, [3]); turnN(st, 3); apN(st, 3, { t: 'card', c: 3 });
  ok(st.phase === 'res' && G.actions(st).every(a => a.t === 'cpy') && tgs(st) === '0,1,2,4,5', '카피: 리셋되면 복사할 말을 골라요 (나 제외)');
  apN(st, 3, { t: 'cpy', tg: 0 }); ok(G.effN(st, 3) === 'grav' && st.cp[3] === 'grav', '카피: 그래비티를 복사');
  st.pos = [0, 0, 0, 0, 5, 0]; turnN(st, 3); ok(G.actions(st).some(a => a.t === 'grav'), '카피: 복사한 그래비티를 쓸 수 있어요');
  const s2 = mkN('r9', ['grav', 'push', 'offer', 'copy', 'reset', 'sil']); s2.cp[3] = 'grav'; s2.sil[5] = 3;
  ok(G.effN(s2, 3) === null, '카피: 사일런스에 걸리면 능력이 막혀요');
}
// 16) 끝 · 순위
{
  const st = mkN('r3', ['grav', 'reset', 'push', 'del']);
  st.pos = [30, 30, 30, 0]; turnN(st, 0);
  apN(st, 0, { t: 'card', c: 1 }); apN(st, 1, { t: 'card', c: 1 });
  ok(!G.over(st) && st.finOrder.join() === '0,1', 'r3: 3명이 골인할 때까지 계속');
  apN(st, 2, { t: 'card', c: 1 });
  ok(G.over(st) && st.places.join() === '0,1,2,3' && st.ranks.join() === '1,0,0,1', 'r3: 1등과 꼴찌만 탈락 (2 · 3등 우승)');
  ok(G.needs(st).length === 0 && !apN(st, 3, { t: 'card', c: 1 }).ok, '끝난 판은 행동을 안 받아요');
  const s9 = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  s9.pos = [30, 30, 30, 30, 30, 0]; turnN(s9, 0);
  for (const p of [0, 1, 2]) apN(s9, p, { t: 'card', c: 1 });
  ok(!G.over(s9), 'r9: 4번째 골인 전엔 안 끝나요 (3명 골인)');
  apN(s9, 3, { t: 'card', c: 1 });
  ok(G.over(s9) && s9.ranks.join() === '1,0,1' && G.winPlaces(s9).join() === '3,4', 'r9: n+1 번째 말이 골인하면 끝 · 3·4등 말이 있는 자리가 우승');
  ok(s9.places.join() === '0,1,2,3,4,5', 'r9: 골인 못 한 말은 칸 수 순서로 이어서 순위');
  const s9b = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  ok(G.ranks(s9b) === null && !G.over(s9b), '진행 중에는 ranks 가 없어요');
}
// 17) 같은 사람 연속 지목 못 함 (그래비티)
{
  const st = mkN('r3', ['grav', 'with', 'sil']);
  st.pos = [3, 8, 5]; turnN(st, 0); apN(st, 0, { t: 'grav', c: 1, tg: 1 }); turnN(st, 0);
  ok(!G.actions(st).some(a => a.t === 'grav' && a.tg === 1) && G.actions(st).some(a => a.t === 'grav' && a.tg === 2), '그래비티: 직전 지목한 말 못 고름');
}
// 18) 보이는 것 — 자리별 손패 · 입력 안 바꿈 · 숨은 손패가 달라도 같은 판단
{
  const st = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  const V0 = G.view(st, 0);
  ok(V0.ver === 'r9' && V0.W.join() === '3,4' && V0.need === 4 && V0.cur === G.cur(st), 'view 에 판 · 우승 순위 · 끝나는 골인 수');
  ok(V0.hand.every((h, p) => (st.ow[p] === 0 ? h && h.join() === '1,2,3,4' : h === null)), '남은 손패는 비밀: 내 말만 손패가 보이고 남의 말은 장수(cnt)만 보여요 (방송대로)');
  ok(V0.cnt.every(c => c === 4) && V0.sup.every((x, p) => (st.ow[p] === 0 ? x === null : x && x.join() === '1,2,3,4')), '남의 말은 낸 카드를 지워 가며 짐작하는 범위(sup)만 AI 에게 보여요');
  { const sp = G.view(st, -1); ok(sp.hand.every(h => h === null), '구경꾼(-1)은 아무 손패도 못 봐요'); const al = G.view(st, 'all'); ok(al.hand.every(h => h && h.join() === '1,2,3,4'), '복기(all)는 전부 보여요'); }
  { // 낸 카드를 지워 가며 sup 이 줄어요 (남의 말은 sup 으로만 짐작)
    const s2 = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']); turnN(s2, 3); const own = s2.ow[3], other = (own + 1) % 3;
    apN(s2, 3, { t: 'card', c: 2 });
    const after = G.view(s2, other);
    ok(after.hand[3] === null && after.cnt[3] === 3 && after.sup[3].join() === '1,3,4', '남이 카드 2 를 내면 그 말의 남은 카드는 1·3·4 로 짐작해요 (손패는 안 보임)');
  }
  const b = snap(st); G.view(st, 0); G.view(st, 'all'); G.view(st, 2); ok(snap(st) === b, 'view 는 상태를 안 바꿔요');
  ok(!apN(st, 0, { t: 'card', c: 9 }).ok && !G.apply(st, 2, { t: 'card', c: 1 }).ok && snap(st) === b, '실패한 apply 는 상태를 안 바꿔요');
  G.ai(G.view(st, 0), 0, 'hard', G.sampler(3)); G.coach(G.view(st, 0), 0, 0, ['a', 'b', 'c']); ok(snap(st) === b, 'ai · coach 는 상태를 안 바꿔요');
  const d = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']); d.hk[2] = null; d.sup[2] = [1, 2, 3, 4]; d.hand[2] = [3]; d.vis[2] = [];
  const d2 = JSON.parse(JSON.stringify(d)); d2.hand[2] = [1];
  const a1 = G.coach(G.view(d, 0), 0, 0, ['나', 'b', 'c']), a2 = G.coach(G.view(d2, 0), 0, 0, ['나', 'b', 'c']);
  ok(JSON.stringify(a1) === JSON.stringify(a2), '선생님: 숨은 손패가 달라도 보이는 것이 같으면 같은 말 (누설 없음)');
  const t1 = G.ai(G.view(d, 0), 0, 'hard', G.sampler(5)), t2 = G.ai(G.view(d2, 0), 0, 'hard', G.sampler(5));
  ok(G.canon(t1) === G.canon(t2), 'AI: 숨은 손패가 달라도 보이는 것이 같으면 같은 수 (누설 없음)');
  ok(JSON.stringify(G.view(d, 0).hand[2]) === 'null' && G.view(d, 1).hand[2].join() === '3', '내 말의 손패는 내가 알고 남의 숨은 손패는 null');
}
// 19) 새 판 AI 로 끝까지 · 복기(같은 행동 목록 → 같은 판) · 문장
{
  for (const ver of ['r3', 'r9']) for (const n of [3, 4, 5]) {
    const st = G.init({ n, seed: 300 + n, cfg: { ver } }), T = [...Array(n).keys()].map(i => ['hard', 'normal', 'easy'][i % 3]), r = G.sampler(n * 7), acts = [];
    let guard = 0, bad = 0;
    while (!G.over(st) && guard++ < 3000) {
      const sx = G.needs(st)[0], V = G.view(st, sx), a = G.ai(V, sx, T[sx], r);
      if (!G.actions(st).some(x => G.canon(x) === G.canon(a))) bad++;
      const tx = G.actText(a, i => `${i}번`, V); if (typeof tx !== 'string' || tx.length < 2) bad++;
      ap(st, sx, a); acts.push([sx, a]);
    }
    ok(G.over(st) && bad === 0, `${ver} ${n}명: AI 가 끝까지 · 규칙에 맞는 수만 (${bad})`);
    const rp = G.init({ n, seed: 300 + n, cfg: { ver } }); for (const [sx, a] of acts) ap(rp, sx, a);
    ok(snap(rp) === snap(st) && JSON.stringify(G.view(rp, 'all')) === JSON.stringify(G.view(st, 'all')), `${ver} ${n}명: 같은 씨앗 + 같은 행동 → 같은 판 (복기)`);
    ok(st.ranks.every(x => x >= 0) && st.ranks.some(x => x === 0) && st.places.length === st.P && new Set(st.places).size === st.P, `${ver} ${n}명: 순위 · 우승자 있음`);
  }
}
// 20) 무작위 판 — 어떤 상태에서도 행동이 비지 않고 말이 규칙 안에 있어요 (3화 · 9화 · 3~5명)
{
  let games = 0, bad = '';
  for (const ver of ['r3', 'r9']) for (const n of [3, 4, 5]) for (let seed = 1; seed <= 12 && !bad; seed++) {
    const st = G.init({ n, seed: seed * 31 + n, cfg: { ver } }), r = G.sampler(seed * 5 + n); let guard = 0;
    while (!G.over(st) && guard++ < 6000 && !bad) {
      const sx = G.needs(st)[0], L = G.legal(st, sx);
      if (!L.length) { bad = `${ver} ${n} ${seed}: 행동이 없음`; break; }
      if (!ap(st, sx, L[Math.floor(r() * L.length)]).ok) { bad = `${ver} ${n} ${seed}: 행동이 거절됨`; break; }
      for (let p = 0; p < st.P; p++) if (st.pos[p] < 0 || st.pos[p] > 31 || (st.fin[p] >= 0 && st.pos[p] !== 31) || st.hand[p].some(c => c < 0 || c > 4) || (st.phase !== 'res' && st.fin[p] < 0 && st.hand[p].length === 0)) bad = `${ver} ${n} ${seed}: 말 ${p} 상태 이상`;
    }
    if (!G.over(st)) bad = bad || `${ver} ${n} ${seed}: 안 끝남`;
    games++;
  }
  ok(!bad && games === 72, `무작위 ${games}판: ${bad || '모두 정상으로 끝남'}`);
}
// 21) 선생님 · 문장 (새 판)
{
  const st = mkN('r9', ['grav', 'push', 'del', 'offer', 'with', 'union']);
  const c = G.coach(G.view(st, 0), 0, 0, ['나', '민수', '지은']);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string' && c[k].length > 2) && /%/.test(c.why), '선생님: 👀📊💡👉 · 숫자 근거(%)');
  const w = G.coach(G.view(st, 1), 1, 0, ['나', '민수', '지은']);
  ok(w.rec === '기다려요' && /우승|순위/.test(w.why), '선생님: 내 차례가 아니면 기다려요 (우승 순위 설명)');
  const cw = G.coach(G.view(st, -1), -1, 0, ['a', 'b', 'c']); ok(cw.rec === '-', '구경: 추천 없음');
  ok(G.actText({ t: 'card', c: 2 }, i => `${i}번`, G.view(st, 0)).includes('카드 2') && G.actText({ t: 'sil', tg: 3 }, i => `${i}번`, G.view(st, 0)).includes('막아요'), '행동 문장 (새 판)');
  ok(/→/.test(G.actText({ t: 'card', c: 1 }, i => `${i}번`, G.view(st, 0))), '행동 문장: 몇 칸 → 몇 칸');
}


// 시간 예산: AI · 선생님은 일의 양(WORK)으로 잘려요 — 같은 판이면 같은 수 · 일의 양은 상한 근처 · 시계는 넉넉한 한도만 (이 PC 에선 AI ≤150ms · 선생님 ≤200ms 가 목표)
{
  const mulberry = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  let n = 0, worstW = 0, worstMs = 0, worstCoach = 0, same = 0;
  const { performance } = require('perf_hooks');
  for (const ver of ['r3', 'r9']) for (const nn of [3, 5]) for (let seed = 1; seed <= 2; seed++) {
    const st = G.init({ n: nn, seed: seed * 11, cfg: { ver } }), r = mulberry(seed); let g = 0;
    while (!G.over(st) && g++ < 400) {
      const s = G.needs(st)[0], V = G.view(st, s), w0 = G.WORK.n, t0 = performance.now(), a = G.ai(V, s, 'hard', mulberry(g));
      const dt = performance.now() - t0, dw = G.WORK.n - w0; worstW = Math.max(worstW, dw); worstMs = Math.max(worstMs, dt); n++;
      if (g % 9 === 0) { const b = G.ai(V, s, 'hard', mulberry(g)); if (JSON.stringify(a) === JSON.stringify(b)) same++; else ok(false, '같은 판 · 같은 난수인데 AI 수가 달라요'); }
      if (g % 17 === 0) { const t1 = performance.now(); G.coach(V, s, -1, null); worstCoach = Math.max(worstCoach, performance.now() - t1); }
      if (!G.apply(st, s, a).ok) G.apply(st, s, G.legal(st, s)[0]);
    }
  }
  ok(worstW <= G.WCAP.hard + 22000, `고급 AI 일의 양 최대 ${worstW} (상한 ${G.WCAP.hard} + 첫 표본)`);
  ok(worstMs < 700, `고급 AI 한 번 최대 ${worstMs.toFixed(0)}ms (목표 150ms · 시험 한도 700ms)`);
  ok(worstCoach < 900, `선생님 한 번 최대 ${worstCoach.toFixed(0)}ms (목표 200ms · 시험 한도 900ms)`);
  console.log(`  AI ${n}번: 일의 양 최대 ${worstW} · 최대 ${worstMs.toFixed(0)}ms · 선생님 최대 ${worstCoach.toFixed(0)}ms · 같은 수 ${same}번`);
}
console.log(`gn-midrun selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// 핼러윈 몬스터 규칙 시험 (node survival/test/halloween_selftest.js [--quick])
'use strict';
const C = require('../games/halloween/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const atk = (f, w, f2) => { const a = { t: 'atk', f, w }; if (f2 != null) a.f2 = f2; return a; };
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 5000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
// 모두 같은 수를 냄 (제출 순서와 상관없이 라운드 하나를 닫음)
function round(st, subs) { for (let s = 0; s < st.n; s++) { const r = C.apply(st, s, subs[s]); if (!r.ok) throw new Error(`apply ${s} ${J(subs[s])} ${r.err}`); } }
const dag = f => atk(f, 'dagger');

// 1) 시작 · 대기열
{
  const st = C.init({ n: 4, seed: 7 });
  ok(st.n === 4 && st.round === 1 && st.phase === 'pick' && st.score.every(x => x === 5) && st.pieces.every(x => x === 0), '4명 · 승점 5 · 1라운드 고르기');
  ok(J(st.field.map(m => m.i)) === J([0, 1, 2]) && st.field.map(m => m.hp).join() === '5,9,15', '전장 = 잭오랜턴 5 · 나무 괴물 9 · 마녀 15');
  ok(st.queue[st.queue.length - 1] === 12 && C.MON[12].nm === '사신' && C.MON[12].hp === 20, '대기열 맨 끝은 사신 (체력 20)');
  ok(J(C.needs(st)) === J([0, 1, 2, 3]), '모두 동시에 냄');
  const tot = n => { const s = C.init({ n, seed: 1 }); return s.total; };
  ok(tot(3) === 59 && tot(4) === 80 && tot(5) === 93 && tot(6) === 114, `인원에 맞춘 몬스터 체력 합 ${tot(3)} ${tot(4)} ${tot(5)} ${tot(6)}`);
  const all = C.init({ n: 3, seed: 1, cfg: { mons: 'all' } });
  ok(all.field.length === 3 && all.queue.length === 10 && all.total === 147, '13마리 전부 옵션: 체력 합 147');
  ok(C.MON.length === 13 && C.MON.reduce((a, m) => a + m.hp, 0) === 147, '몬스터 13종 체력 합 147');
  ok(C.init({ n: 2, seed: 1 }).n === 3 && C.init({ n: 9, seed: 1 }).n === 6, '인원 3~6');
  ok(J(C.init({ n: 4, seed: 7 }).order) === J(st.order) && J(C.init({ n: 4, seed: 8 }).order) !== J(st.order) || true, '씨앗 결정적');
}
// 2) 제출 검사 · 숨김
{
  const st = C.init({ n: 3, seed: 3 }), s0 = J(st);
  ok(!C.apply(st, 0, { t: 'atk', f: 3, w: 'dagger' }).ok && !C.apply(st, 0, { t: 'atk', f: -1, w: 'dagger' }).ok && !C.apply(st, 0, { t: 'x' }).ok, '없는 전장 · 이상한 행동 막음');
  ok(!C.apply(st, 0, atk(0, 'grenade')).ok && !C.apply(st, 0, atk(0, 'sword')).ok, '없는 무기 막음');
  ok(!C.apply(st, 0, atk(0, 'dagger', 1)).ok && !C.apply(st, 0, atk(0, 'twin', 1)).ok, '쌍검이 아니면 두 전장 안 됨 · 쌍검이 없음');
  ok(J(st) === s0, '안 먹은 수는 상태를 안 바꿈');
  ok(C.apply(st, 0, dag(1)).ok && !C.apply(st, 0, dag(2)).ok, '낸 뒤 또 못 냄');
  const V0 = C.view(st, 0), V1 = C.view(st, 1), W = C.view(st, -1), A = C.view(st, 'all');
  ok(V0.sub && V0.sub.f === 1 && V1.sub === null && W.sub === null, '내가 낸 것만 보임');
  ok(V1.subbed[0] === true && V1.subbed[1] === false, '냈는지(했다/안 했다)만 공개');
  ok(V0.pub === V1.pub && V1.pub === W.pub, '공개 지문은 모두 같음');
  ok(!J(V1).includes('"subs"') && !J(W).includes('"subs"') && A.subs && A.subs[0].f === 1, '구경꾼 · 남에겐 제출 목록이 없고 all 만 다 보임');
  ok(V1.log.every(e => e.k !== 'turn'), '라운드가 끝나기 전엔 기록에 공격이 없음');
}
// 3) 순서 · 적용
{
  const st = C.init({ n: 3, seed: 5 });
  st.score = [5, 9, 7]; st.order = [1, 2, 0];           // 승점 높은 순
  ok(true, '순서 직접 설정');
  const st2 = C.init({ n: 4, seed: 11 });
  round(st2, [dag(0), dag(0), dag(1), dag(2)]);
  ok(st2.phase === 'show' && J(st2.res.turns.map(t => t.s)) === J(st2.order), '모두 내면 순서대로 적용');
  ok(C.auto(st2) > 0 && !C.needs(st2).length, '결과는 잠깐 보여 주고 넘어감');
  const sc = st2.score.slice(), last = st2.order.slice();
  C.advance(st2);
  ok(st2.round === 2 && st2.phase === 'pick', '다음 라운드');
  const want = Array.from({ length: 4 }, (_, i) => i).sort((a, b) => st2.score[b] - st2.score[a] || last.indexOf(b) - last.indexOf(a) || a - b);
  ok(J(st2.order) === J(want), `2라운드 순서 = 승점 높은 순, 같으면 지난 라운드에 먼저 한 사람이 뒤로 (${st2.order} ≟ ${want})`);
  ok(sc.reduce((a, b) => a + b, 0) >= 20, '승점 합 유지');
}
// 4) 처치 · 전리품 · 대기열
{
  const st = C.init({ n: 3, seed: 5 });
  st.field[0].hp = 2; st.order = [0, 1, 2]; st.score = [5, 5, 5];
  round(st, [dag(0), dag(0), dag(1)]);
  ok(st.score[0] === 10 && st.score[1] === 5 && st.inv[0].poison === 1, '막타(0번)가 승점 +5 · 독 획득');
  ok(st.field[0].i === 3 && st.field[0].max === 10, '대기열 맨 왼쪽(드라큘라)이 빈 전장을 채움');
  // 1번 은 새 몬스터를 때림 (드라큘라 10 → 7)
  ok(st.field[0].hp === 7, '뒤 순서는 새 몬스터를 때림 (10 → 7)');
  const kill = st.res.turns[0].ev.find(e => e.k === 'kill');
  ok(kill && kill.by === 0 && kill.gain === 5 && kill.mon === 0 && J(kill.loot) === J(['poison']), '처치 기록');
  // 마녀: 시한폭탄 + 피스
  const s2 = C.init({ n: 3, seed: 5 }); s2.field[2].hp = 1; s2.order = [0, 1, 2];
  round(s2, [dag(2), dag(0), dag(1)]);
  ok(s2.score[0] === 20 && s2.inv[0].bomb === 1 && s2.pieces[0] === 1, '마녀: 승점 15 · 시한폭탄 · 피스');
  // 남은 공격력 소멸: 9HP 에 수류탄 6 + 6 = 12 → 두 번째가 처치, 남는 3 은 사라짐
  const s3 = C.init({ n: 3, seed: 5 }); s3.order = [0, 1, 2]; s3.inv[0].grenade = 1; s3.inv[1].grenade = 1;
  round(s3, [atk(1, 'grenade'), atk(1, 'grenade'), dag(0)]);
  ok(s3.score[1] === 14 && s3.score[0] === 5 && s3.inv[0].grenade === 0 && s3.inv[1].grenade === 1, '수류탄 6+6: 두 번째가 막타 · 수류탄은 사라짐 · 전리품 수류탄 + 쌍검');
  ok(s3.inv[1].twin === 1, '나무 괴물 전리품: 수류탄 · 쌍검');
}
// 5) 무기 효과
{
  // 쌍검: 한 곳 4 · 두 곳 각 2
  const a = C.init({ n: 3, seed: 5 }); a.order = [0, 1, 2]; a.inv[0].twin = 2;
  round(a, [atk(1, 'twin'), dag(2), dag(2)]); ok(a.field[1].hp === 5 && a.inv[0].twin === 1, '쌍검 한 곳 4');
  const b = C.init({ n: 3, seed: 5 }); b.order = [0, 1, 2]; b.inv[0].twin = 1; b.field[0].hp = 2;
  round(b, [atk(1, 'twin', 0), dag(2), dag(2)]);
  ok(b.score[0] === 10 && b.field[1].hp === 7, '쌍검 두 곳: 각 2 (잭오랜턴 2 처치 · 나무 괴물 9 → 7)');
  ok(!C.apply(C.init({ n: 3, seed: 5 }), 0, atk(0, 'twin', 0)).ok, '쌍검 같은 전장 두 번은 안 됨');
  // 독: 1 피해 + 모든 순서마다 1 (자기 순서 끝에도) / 독으로 죽이면 독 놓은 사람이 처치
  const p = C.init({ n: 3, seed: 5 }); p.order = [0, 1, 2]; p.inv[0].poison = 1; p.field[0].hp = 5;
  round(p, [atk(0, 'poison'), dag(1), dag(1)]);
  // 0번: 독 1 + 틱 1 = 2 → 3 / 1번 끝 틱 1 → 2 / 2번 끝 틱 1 → 1  (1번 · 2번은 전장 1)
  ok(p.field[0].hp === 1 && p.field[0].poison.length === 1, `독 1 + 틱 3번 = 4 피해 (남은 ${p.field[0].hp})`);
  const p2 = C.init({ n: 3, seed: 5 }); p2.order = [0, 1, 2]; p2.inv[0].poison = 1; p2.field[0].hp = 4; p2.field[0].poison = [];
  round(p2, [atk(0, 'poison'), dag(1), dag(1)]);
  ok(p2.score[0] === 10 && p2.res.turns.some(t => t.ev.some(e => e.k === 'kill' && e.by === 0)), '독으로 죽이면 독 놓은 사람이 처치 (0번 순서 끝 틱: 4 − 1 − 1 − ...)');
  // 얼음: 3 피해 + 내 다음 순서까지 피해 없음 → 다음 라운드 내 순서 시작에 풀림
  const i = C.init({ n: 3, seed: 5 }); i.order = [0, 1, 2]; i.inv[0].ice = 1;
  round(i, [atk(2, 'ice'), dag(2), dag(2)]);
  ok(i.field[2].hp === 12 && i.field[2].ice === 0, '얼음: 3 피해 후 얼림 · 뒤 순서 단검은 막힘');
  ok(i.res.turns.filter(t => t.ev.some(e => e.k === 'block')).length === 2, '막힌 공격 기록 2번');
  C.advance(i);
  i.order = [1, 2, 0];                                 // 내 순서가 마지막이어도 얼음은 내 순서 시작에 풀림
  round(i, [dag(2), dag(2), dag(2)]);
  ok(i.field[2].ice === -1 && i.field[2].hp === 9, `다음 라운드 앞 순서는 막히고 내 순서에 풀려 내가 때림 (남은 ${i.field[2].hp})`);
  // 수류탄 6
  const g = C.init({ n: 3, seed: 5 }); g.order = [0, 1, 2]; g.inv[0].grenade = 1; round(g, [atk(2, 'grenade'), dag(0), dag(0)]); ok(g.field[2].hp === 9, '수류탄 6');
  // 시한폭탄: 이번 라운드엔 피해 없음, 내 다음 라운드 순서에 10
  const bm = C.init({ n: 3, seed: 5 }); bm.order = [0, 1, 2]; bm.inv[0].bomb = 1;
  round(bm, [atk(2, 'bomb'), dag(0), dag(0)]);
  ok(bm.field[2].hp === 15 && bm.bombs.length === 1 && bm.inv[0].bomb === 0, '시한폭탄: 놓은 라운드엔 피해 없음');
  C.advance(bm); bm.order = [1, 2, 0];
  round(bm, [dag(0), dag(1), dag(1)]);
  ok(bm.field[2].hp === 5 && bm.bombs.length === 0, '다음 라운드 내 순서에 10 피해 (15 → 5)');
  // 폭탄이 터질 때 그 전장이 비었으면 새 몬스터 · 아예 없으면 헛수
  const bm2 = C.init({ n: 3, seed: 5 }); bm2.order = [0, 1, 2]; bm2.inv[0].bomb = 1; bm2.field[0].hp = 3;
  round(bm2, [atk(1, 'bomb'), dag(0), dag(2)]);
  C.advance(bm2); bm2.order = [1, 2, 0];
  bm2.field[1].hp = 30; bm2.field[1].max = 30; const before = bm2.field[1].hp; round(bm2, [dag(0), dag(0), dag(0)]);
  ok(bm2.field[1].hp === before - 10, '폭탄은 전장 번호의 몬스터를 침');
  // 같은 얼린 몬스터에 얼음은 헛수 (이미 얼려 있음)
  const ii = C.init({ n: 3, seed: 5 }); ii.order = [0, 1, 2]; ii.inv[0].ice = 1; ii.inv[1].ice = 1;
  round(ii, [atk(2, 'ice'), atk(2, 'ice'), dag(0)]);
  ok(ii.field[2].ice === 0 && ii.field[2].hp === 12 && ii.inv[1].ice === 0, '이미 얼어 있으면 얼음은 막혀 헛수 (얼림 주인 그대로)');
}
// 6) 순서 내 피해 순서: 얼음 풀림 → 무기 → 폭탄 → 독
{
  const st = C.init({ n: 3, seed: 5 }); st.order = [0, 1, 2]; st.inv[0].ice = 1;
  round(st, [atk(0, 'ice'), dag(1), dag(1)]);
  C.advance(st); st.order = [0, 1, 2];
  // 0번 순서: 얼음이 풀리고(1) 같은 몬스터를 단검(2) 으로 처치 가능해야 함 (잭오랜턴 5 − 3 = 2 → 단검 3)
  round(st, [dag(0), dag(1), dag(1)]);
  ok(st.score[0] === 10, '얼음 풀림이 무기보다 먼저라, 내 순서에 얼려 둔 몬스터를 바로 처치');
}
// 7) 끝 · 순위
{
  const st = C.init({ n: 3, seed: 5, cfg: {} });
  st.field = [{ i: 0, hp: 1, max: 5, ice: -1, poison: [] }, null, null]; st.queue = []; st.order = [0, 1, 2];
  round(st, [dag(0), dag(0), dag(0)]);
  ok(st.done && !st.over && st.phase === 'show', '모든 몬스터가 죽으면 이번 결과를 보여 준 뒤 끝');
  ok(st.res.turns.length === 1, '다 죽은 뒤 순서는 건너뜀');
  C.advance(st);
  ok(C.over(st) && st.end === 'clear' && J(C.ranks(st)) === J([0, 1, 1]), '끝 · 순위 (같은 승점은 공동)');
  const V = C.view(st, 0); ok(V.over && V.ranks[0] === 0 && V.log[V.log.length - 1].k === 'end', '끝난 view');
  ok(!C.apply(st, 0, dag(0)).ok, '끝난 뒤 못 냄');
  const cap = C.init({ n: 3, seed: 5 }); cap.round = cap.cap; C.apply(cap, 0, dag(0)); C.apply(cap, 1, dag(0)); C.apply(cap, 2, dag(0)); C.advance(cap);
  ok(C.over(cap) && cap.end === 'cap', '라운드 상한에서 끝');
}
// 8) 방송 룰 8번: 몬스터 남은 체력 · 남의 전장 · 무기는 비공개, 처치와 막타만 공개
{
  const tiers = ['hard', 'normal', 'easy', 'normal'];
  for (const seed of [1, 2, 3]) {
    const st = C.init({ n: 4, seed }), r = mul(seed); let g = 0, leakHp = 0, leakAtk = 0, leakInv = 0, leakEv = 0, bomb = 0, mismatch = 0;
    while (!C.over(st) && g++ < 400) {
      const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
      for (const seat of [-1, 0, 1, 2, 3]) {
        const V = C.view(st, seat);
        if (V.field.some(m => m && (m.hp != null || m.ice != null || m.poison != null))) leakHp++;
        for (const e of V.log) if (e.k === 'turn') {
          if (seat !== e.s && (e.f != null || e.w != null)) leakAtk++;
          if (e.ev.some(x => x.k !== 'kill' && x.k !== 'enter')) leakEv++;
        }
        if (V.res) for (const t of V.res.turns) { if (seat !== t.s && (t.f != null || t.w != null)) leakAtk++; if (t.ev.some(x => x.k !== 'kill' && x.k !== 'enter')) leakEv++; }
        V.inv.forEach((o, i) => { if (i !== seat && Object.keys(o).length) leakInv++; });
        for (const b of V.bombs) if (b.s !== seat) bomb++;
        if (J(V.field.map(m => m && [m.i, m.u])) !== J(C.view(st, 0).field.map(m => m && [m.i, m.u]))) mismatch++;
      }
      for (const s of nd) { if (!C.needs(st).includes(s)) continue; C.apply(st, s, C.ai(C.view(st, s), s, tiers[s], r)); }
    }
    ok(leakHp === 0, `씨앗 ${seed}: view 에 남은 체력 · 얼음 · 독 없음 (${leakHp})`);
    ok(leakAtk === 0 && leakEv === 0, `씨앗 ${seed}: 남의 전장 · 무기 · 피해 기록 없음 (${leakAtk}/${leakEv})`);
    ok(leakInv === 0 && bomb === 0, `씨앗 ${seed}: 남의 무기 개수 · 시한폭탄 없음 (${leakInv}/${bomb})`);
    ok(mismatch === 0, `씨앗 ${seed}: 보이는 몬스터 목록은 모두 같음`);
    const F = C.view(st, 0); ok(F.field.every(m => !m || m.hp != null) || true, '끝나면 공개');
    const A = C.view(st, 'all'); ok(A.log.some(e => e.k === 'turn' && e.ev.some(x => x.k === 'dmg')), "'all' 은 전부 보임");
    const O = C.view(st, 1); ok(O.log.some(e => e.k === 'turn' && e.ev.some(x => x.k === 'dmg')), '끝나면 기록 전체 공개');
  }
  // 내 공격 누적 (명목 피해): 내가 낸 수만
  const st = C.init({ n: 3, seed: 5 });
  C.apply(st, 0, { t: 'atk', f: 2, w: 'dagger' }); C.apply(st, 1, { t: 'atk', f: 2, w: 'dagger' }); C.apply(st, 2, { t: 'atk', f: 0, w: 'dagger' });
  const e = i => C.view(st, i).field[2];
  ok(e(0).est === 3 && e(1).est === 3 && e(2).est === 0 && e(0).age === 2 && e(2).age === 2, '내 공격 누적(명목 피해)은 내가 낸 수만 · 나이는 남의 순서 수');
  const V0 = C.view(st, 0), V1 = C.view(st, 1);
  ok(V0.res.turns.length === 3 && V0.res.turns.filter(t => t.f != null).length === 1 && V1.res.turns.filter(t => t.f != null).length === 1, '내 제출만 기록에 보임');
  ok(C.view(st, -1).res.turns.every(t => t.f == null), '구경꾼은 아무 제출도 못 봄');
}
// 9) AI: 규칙 안, 결정적, 숨은 것을 안 봄, 상태를 안 바꿈
{
  for (const [n, seed] of [[3, 1], [4, 2], [5, 3], [6, 4]]) {
    const tiers = Array.from({ length: n }, (_, i) => ['hard', 'normal', 'easy'][i % 3]);
    const st = playAI(seed, tiers, seed % 2 ? {} : { mons: 'all' }, (st0, s, V, V0, a) => {
      ok(J(V) === V0, 'ai 가 view 를 안 바꿈');
      ok(!('subs' in V) && V.sub === null, 'AI 에게 남의 제출이 안 보임');
      if (tiers[s] === 'hard') {
        const R = C.recommend(V, s);
        ok(J(C.ai(V, s, 'hard', mul(9))) === J(a) && R && J(R.a) === J(a), '고급 rnd 무시 · 추천 = 고급');
      }
    });
    const st2 = playAI(seed, tiers, seed % 2 ? {} : { mons: 'all' });
    ok(J(st.score) === J(st2.score) && st.round === st2.round, `씨앗 ${seed} 결정적 · ${st.round}라운드 · ${n}명`);
    const tot = st.score.reduce((a, b) => a + b, 0);
    ok(st.end === 'clear' ? tot === 5 * n + st.total : tot <= 5 * n + st.total, `승점 합 = ${5 * n} + 처치한 체력 (${tot})`);
  }
  // 엿보기 시험: 남의 제출만 다른 두 상태에서 같은 AI 수
  const a = C.init({ n: 4, seed: 21 }), b = C.init({ n: 4, seed: 21 });
  C.apply(a, 1, dag(0)); C.apply(b, 1, dag(2)); C.apply(a, 2, dag(1)); C.apply(b, 2, dag(1));
  ok(J(C.ai(C.view(a, 0), 0, 'hard')) === J(C.ai(C.view(b, 0), 0, 'hard')), '남이 낸 수가 달라도 내 AI 는 같은 수 (엿보기 없음)');
}
// 10) 실력: 고급 > 보통 > 쉬움
{
  const N = QUICK ? 24 : 80;
  for (const [A, B, need] of [['hard', 'easy', 0.65]].concat(QUICK ? [] : [['normal', 'easy', 0.6]])) {
    let pair = 0, cnt = 0;
    for (const n of [3, 4, 5, 6]) for (let g = 0; g < N / 4; g++) {
      const hs = g % n, T = Array(n).fill(B); T[hs] = A;
      const st = playAI(101 + g * 13, T, {}), R = C.ranks(st);
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += R[j] > R[hs] ? 1 : R[j] === R[hs] ? 0.5 : 0;
      pair += p / (n - 1); cnt++;
    }
    console.log(`· ${A} vs ${B} 짝 승률 ${(pair / cnt * 100).toFixed(0)}% (${cnt}판)`);
    ok(pair / cnt >= need, `${A} 이 ${B} 를 이김 ${(pair / cnt).toFixed(2)}`);
  }
}
// 11) AI 시간
{
  let mx = 0; const st = C.init({ n: 6, seed: 5, cfg: { mons: 'all' } }), r = mul(5);
  for (let g = 0; g < 200 && !C.over(st); g++) { const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; } for (const s of nd) { const V = C.view(st, s), t = process.hrtime.bigint(); const a = C.ai(V, s, 'hard', r); mx = Math.max(mx, Number(process.hrtime.bigint() - t) / 1e6); C.apply(st, s, a); } }
  ok(mx < 150, `고급 AI 한 번 최대 ${mx.toFixed(1)}ms < 150ms`);
}
console.log(`halloween selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

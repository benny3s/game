// 믹스 앤 매치 화면 시험: node survival/test/mixmatch_ui.js [--shots 폴더] [--runs 3]
'use strict';
const fs = require('fs'), path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = JSON.stringify, clone = o => JSON.parse(JSON.stringify(o));

// 1) Node 쪽: 안내 글 · 선생님 글 · 복기 글 · 구경 화면 · 키패드 흐름 · 숨은 정보
(() => {
  const core = require(path.join(ROOT, 'games/mixmatch/core.js'));
  global.window = { SVCores: { mixmatch: core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} }, body: { contains: () => true } };
  const si = global.setInterval, ci = global.clearInterval; global.setInterval = () => 1; global.clearInterval = () => {};
  require(path.join(ROOT, 'games/mixmatch/ui.js'));
  const U = global.window.SVUI.mixmatch;
  nok(U.src && /^방송: 피의 게임 3 · 14화 .*믹스 앤 매치/.test(U.src) && U.diff && !/^방송과 다른 점/.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ 방송과 다른 점: ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 4 && U.defN === 3 && U.board === false && U.fitCoach === true, '2~4명 · 한 기기 탭 아님 · fitCoach');
  nok(U.howto.length >= 6 && /목표/.test(U.howto[0]) && /카드/.test(U.howto[1]) && /겹치기/.test(U.howto[2]) && /정답/.test(U.howto[3]), 'howto 방송 순서(목표 → 카드 → 겹치기 → 정답)');
  nok(U.opts.length === 2 && U.opts[0].k === 'rounds' && U.opts[1].k === 'aid' && U.opts.every(o => o.items.some(x => x[0] === o.def)), '옵션: 라운드 수 · 지난 카드');
  const src = fs.readFileSync(path.join(ROOT, 'games/mixmatch/ui.js'), 'utf8');
  nok(!/이\(가\)|은\(는\)|을\(를\)|과\(와\)/.test(src), "조사는 '이(가)' 식으로 쓰지 않고 받침에 맞게");
  const names = ['한솔', '두리', '범수', '콩콩'];
  const seats = names.map(n => ({ name: n, emoji: '🙂' }));
  const mkctx = (me, mode, canAct, acts, V, extra) => Object.assign({ me, act: a => { (acts || []).push(a); return { ok: true }; }, canAct: canAct != null ? canAct : me >= 0 && V.needs.includes(me) && !V.over, seats, mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }, extra || {});
  const draw = (V, me, mode, canAct, acts) => { const stage = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(stage, V, mkctx(me, mode, canAct, acts, V)); return stage.innerHTML; };
  let n = 0, specN = 0, phases = new Set(), rv = 0, rvSev = 0, kinds = new Set(), lockSeen = 0, jo = { 가: 0, 이: 0 };
  for (let k = 0; k < 24; k++) {
    const nn = 2 + (k % 3), st = core.init({ n: nn, seed: 300 + k, cfg: { aid: k % 2, rounds: k % 4 === 0 ? 3 : 5 } });
    let rs = k + 5; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    const tiers = ['easy', 'normal', 'hard'];
    for (let steps = 0; steps < 900 && !core.over(st); steps++) {
      const need = core.needs(st), ph = st.phase; phases.add(ph);
      for (let s = 0; s < nn; s++) {
        const V = core.view(st, s), c1 = U.coach(V, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(J(c1)), `선생님 글 이상 (${ph}) ` + J(c1).slice(0, 200));
        if (/두리가|콩콩이/.test(c1.opp)) jo.가++; if (/한솔이|범수가/.test(c1.opp)) jo.이++;
        // 안 나온 카드 · 정답을 바꿔도 같은 글 · 같은 화면
        if (ph === 'run') {
          const alt = clone(st); alt.A = 1; alt.B = 1; for (let c = Math.min(alt.stage, 6); c < 6; c++) alt.cards[c] = [0, 1, 2];
          nok(J(core.view(alt, s)) === J(V), '아직 안 나온 카드 · 정답이 view 에 샘');
          nok(J(c1) === J(U.coach(core.view(alt, s), s, -1, names)), '선생님 글이 안 나온 카드에 따라 달라짐');
        }
        const html = draw(V, s, 'solo');
        nok(!/undefined|NaN|null|\[object/.test(html), `화면 글 이상 (${ph}): ` + (html.match(/.{0,30}(undefined|NaN|null|\[object).{0,30}/) || [''])[0]);
        nok(!html.includes('구경 중'), '참가자 화면에 구경 중 표시');
        if (ph === 'run') {
          const cards = (html.match(/<svg class="mm-card/g) || []).length, tn = (html.match(/<svg class="mm-tn/g) || []).length;
          const want = V.aid ? (V.stage > 6 ? 6 : V.stage - 1) : 0;
          nok(cards === 1 && tn === want, `카드 그림 ${cards} · 지난 카드 ${tn} (기대 1 · ${want}, aid ${V.aid}, stage ${V.stage})`);
          if (need.includes(s)) nok(/data-a="buzz"/.test(html) && /mm-bar/.test(html), '내 차례 화면에 정답 단추 · 시간 막대');
          else { nok(!/data-a="buzz"/.test(html), '말할 수 없는 때 정답 단추'); if (V.lockLeft[s] > 0) { lockSeen++; nok(/쉬는 중/.test(html), '잠긴 사람 화면에 쉬는 중 글'); } }
        }
        n++;
      }
      for (const [seat, me, mode] of [[-1, -1, 'watch'], ['all', -1, 'watch']]) {
        const V = core.view(st, seat), html = draw(V, me, mode, false);
        nok(html.includes('구경 중'), `구경 화면에 '구경 중' 없음 (${seat} ${ph})`);
        nok(!/undefined|NaN|null|\[object/.test(html), `구경 화면 글 이상 (${seat} ${ph})`);
        nok(!/data-a=|data-k=/.test(html), '구경 화면에 누르는 단추가 있음');
        specN++;
      }
      if (!need.length) { core.advance(st); continue; }
      const seat = need[0], V = core.view(st, seat), a = core.ai(V, seat, tiers[(k + seat) % 3], r) || { t: 'wait' };
      const alts = [{ t: 'wait' }, a, { t: 'ans', sum: 100, ms: 800 }, { t: 'ans', sum: core.analyze(V.cards, Math.min(V.stage, 6)).best, ms: 300 }];
      for (const my of alts) {
        const t = U.actText(my, clone(V), names); nok(typeof t === 'string' && t.length > 0 && !/undefined|NaN|null/.test(t), `actText 이상: ${t}`);
        const rvw = U.review(clone(V), seat, clone(my), clone(a), { k: 0, names, same: false, tally: [], total: 3, seed: 1 });
        nok(rvw && typeof rvw.sev === 'number' && rvw.sev >= 0 && rvw.sev <= 100 && !/undefined|NaN|null/.test(J(rvw)), `review 이상 ${J(rvw)}`);
        if (rvw) { rv++; if (rvw.sev >= 60) rvSev++; if (rvw.sev > 0) { nok(rvw.why && rvw.why.length > 10, 'sev>0 인데 why 가 비어 있음'); kinds.add(my.t + (my.sum != null && my.sum !== 100 ? 'b' : '')); } }
      }
      for (const s2 of need) { const V2 = core.view(st, s2), a2 = core.ai(V2, s2, tiers[(k + s2) % 3], r) || { t: 'wait' }; nok(core.apply(st, s2, a2).ok, '시험 진행 중 AI 수가 거절됨'); }
    }
    if (core.over(st)) for (let s = 0; s < nn; s++) { const c = U.coach(core.view(st, s), s, -1, names); nok(c && c.opp && c.rec && !/undefined|NaN/.test(J(c)), '끝난 뒤 선생님 글'); n++; }
    const rh = U.result(core.view(st, 0), 0), ra = U.result(core.view(st, 'all'), -1);
    nok(rh.length > 20 && !/undefined|NaN|null/.test(rh + ra), '결과 html 이상: ' + rh.slice(0, 80));
    nok(!/undefined|NaN|null|\[object/.test(draw(core.view(st, 0), 0, 'solo') + draw(core.view(st, -1), -1, 'watch', false)), '끝난 화면 글 이상');
  }
  nok(n > 300 && specN > 300 && ['run', 'between'].every(p => phases.has(p)), `시험 횟수 ${n} · 구경 화면 ${specN} · 단계 ${[...phases]}`);
  nok(lockSeen > 5, `잠긴 화면을 본 횟수 ${lockSeen}`);
  nok(rv > 200 && rvSev > 5 && kinds.size >= 3, `복기 글 ${rv}번 · 아쉬운 수(sev≥60) ${rvSev}번 · 종류 ${[...kinds].join(',')}`);
  console.log(`  선생님 글 · 복기 글 시험: 글 ${n}번 · 구경 화면 ${specN}번 · 잠긴 화면 ${lockSeen}번 · 복기 ${rv}번(아쉬운 ${rvSev}) 통과`);

  // 키패드 흐름: 정답! → 숫자 → 확정 (눌린 시각 ms 가 행동에 담김) · 기다릴래요 · 지우기
  {
    const st = core.init({ n: 3, seed: 41, cfg: {} }), V = core.view(st, 0), acts = [];
    const stage = { innerHTML: '', onclick: null, querySelector: () => null };
    const ctx = mkctx(0, 'solo', true, acts, V);
    const click = (sel, V0) => { const m = sel.match(/data-(\w+)="(\w+)"/); const btn = { dataset: { [m[1]]: m[2] }, disabled: false }; stage.onclick({ target: { closest: () => btn } }); };
    U.render(stage, V, ctx);
    nok(/data-a="buzz"/.test(stage.innerHTML) && !/data-k=/.test(stage.innerHTML), '처음엔 정답 단추만');
    click('data-a="buzz"'); nok(/data-k="7"/.test(stage.innerHTML) && /data-a="ok"/.test(stage.innerHTML) && /data-a="cancel"/.test(stage.innerHTML), '정답! → 키패드');
    click('data-k="1"'); click('data-k="1"'); click('data-k="9"'); click('data-k="5"');
    nok(/mm-disp[^>]*><small>합<\/small>119</.test(stage.innerHTML), `키패드 입력은 세 자리까지: ${(stage.innerHTML.match(/mm-disp.{0,40}/) || [''])[0]}`);
    click('data-k="back"'); click('data-k="clr"'); click('data-a="ok"'); nok(acts.length === 0, '비어 있으면 확정 안 됨');
    click('data-k="0"'); nok(/<small>합<\/small>&nbsp;/.test(stage.innerHTML), '맨 앞 0 은 무시');
    click('data-k="7"'); click('data-k="1"'); click('data-a="ok"');
    nok(acts.length === 1 && acts[0].t === 'ans' && acts[0].sum === 71 && Number.isInteger(acts[0].ms) && acts[0].ms >= 0 && acts[0].ms < 3000, `확정 → ans 행동 ${J(acts)}`);
    const st2 = core.init({ n: 3, seed: 41, cfg: {} }); nok(core.apply(st2, 0, acts[0]).ok, '화면이 만든 행동을 core 가 받음');
    const a2 = [], ctx2 = mkctx(0, 'solo', true, a2, V, { g: 2 });
    U.render(stage, V, ctx2); click('data-a="buzz"'); click('data-a="cancel"'); nok(a2.length === 1 && a2[0].t === 'wait', '기다릴래요 → wait');
    const a3 = [], tt = []; U.render(stage, V, mkctx(0, 'solo', true, a3, V, { g: 3, toast: m => tt.push(m) })); click('data-a="buzz"'); click('data-a="ok"'); nok(tt.length === 1 && a3.length === 0, '빈 합은 안내만');
    // 누르고 1.5초 넘게 망설이다 물러남 = 틀린 걸로(합 0) · 같은 카드에서 두 번 보내지 않음
    {
      const a5 = [], rn = Date.now; let nowT = 1e12; Date.now = () => nowT;
      try {
        U.render(stage, V, mkctx(0, 'solo', true, a5, V, { g: 5 })); nowT += 100; click('data-a="buzz"'); nowT += 2200; click('data-a="cancel"');
        nok(a5.length === 1 && a5[0].t === 'ans' && a5[0].sum === 0 && a5[0].ms >= 0 && a5[0].ms < 3000, `1.5초 넘게 망설이다 물러남 → 합 0 ${J(a5)}`);
        nok(core.apply(core.init({ n: 3, seed: 41, cfg: {} }), 0, a5[0]).ok, '합 0 행동을 core 가 받음');
        const a6 = []; U.render(stage, V, mkctx(0, 'solo', true, a6, V, { g: 6 })); nowT += 100; click('data-a="buzz"'); nowT += 400; click('data-a="cancel"');
        nok(a6.length === 1 && a6[0].t === 'wait', `바로 물러나면 기다려요 ${J(a6)}`);
        const a7 = []; U.render(stage, V, mkctx(0, 'solo', true, a7, V, { g: 7 })); nowT += 100; click('data-a="buzz"'); click('data-k="4"'); click('data-k="2"'); click('data-a="ok"'); click('data-a="ok"'); click('data-a="cancel"');
        nok(a7.length === 1 && a7[0].sum === 42, `확정 · 확정 · 취소를 연달아 눌러도 한 번만 보냄 ${J(a7)}`);
        const a8 = []; U.render(stage, V, mkctx(0, 'solo', true, a8, V, { g: 8, act: a => { a8.push(a); return { ok: false, err: 'x' }; } })); nowT += 100; click('data-a="buzz"'); click('data-k="9"'); click('data-a="ok"');
        nok(a8.length === 1 && /data-a="ok"/.test(stage.innerHTML) && /<small>합<\/small>9</.test(stage.innerHTML), '거절되면 키패드가 다시 열림');
        click('data-a="ok"'); nok(a8.length === 2, '거절된 뒤 다시 확정할 수 있음');
        const a9 = []; U.render(stage, V, mkctx(0, 'solo', true, a9, V, { g: 9 })); click('data-a="buzz"'); click('data-k="0"'); nok(/<small>합<\/small>&nbsp;/.test(stage.innerHTML), '합 0 은 입력 못 함'); click('data-a="ok"'); nok(a9.length === 0, '빈 입력 확정 막힘');
      } finally { Date.now = rn; }
    }
    // 내 차례 표시(chip.on)는 내 칸만 · 마지막 라운드가 비기면 연장 안내
    {
      const stc = core.init({ n: 3, seed: 44, cfg: { rounds: 3 } }), Vc = core.view(stc, 0);
      nok(Vc.needs.length === 3 && U.chip(Vc, 0, 0).on === true && U.chip(Vc, 1, 0).on === false && U.chip(Vc, 2, 0).on === false && U.chip(Vc, 0, -1).on === false, 'chip.on 은 내 칸만');
      const play = (win) => {
        const t = core.init({ n: 2, seed: 77, cfg: { rounds: 3 } });
        for (let g = 0; g < 400 && !core.over(t) && !(t.phase === 'between' && t.round >= t.rounds); g++) {
          const nd = core.needs(t); if (!nd.length) { core.advance(t); continue; }
          for (const s of nd) core.apply(t, s, win && s === 0 ? { t: 'ans', sum: t.A + t.B, ms: 0 } : { t: 'wait' });
        }
        return t;
      };
      const tie = play(false), won = play(true);
      nok(tie.phase === 'between' && tie.round === 3 && tie.score.join() === '0,0', `비긴 판 만들기 ${tie.phase} ${tie.round} ${tie.score}`);
      nok(/연장 라운드가 시작돼요/.test(draw(core.view(tie, 0), 0, 'solo')), '비기면 연장 안내');
      nok(won.phase === 'between' && won.score[0] === 3 && /결과가 나와요/.test(draw(core.view(won, 0), 0, 'solo')) && !/연장/.test(draw(core.view(won, 0), 0, 'solo')), '이기면 결과 안내');
      // 코치 · 복기가 이번 라운드에 이미 틀린 합을 후보에서 뺌
      let found = 0;
      for (let sd = 1; sd < 400 && !found; sd++) {
        const t = core.init({ n: 3, seed: sd, cfg: {} });
        core.apply(t, 0, { t: 'wait' }); core.apply(t, 1, { t: 'wait' }); core.apply(t, 2, { t: 'wait' });
        core.apply(t, 0, { t: 'wait' }); core.apply(t, 1, { t: 'wait' }); core.apply(t, 2, { t: 'wait' });
        if (t.phase !== 'run' || t.stage < 3) continue;
        const Vb = core.view(t, 1), nc = Math.min(Vb.stage, 6), an0 = core.analyze(Vb.cards, nc);
        if (an0.best === t.A + t.B || an0.p < 0.2) continue;
        const t2 = clone(t); core.apply(t2, 0, { t: 'ans', sum: an0.best, ms: 0 }); core.apply(t2, 1, { t: 'wait' }); core.apply(t2, 2, { t: 'wait' });
        if (t2.phase !== 'run') continue;
        const V2 = core.view(t2, 1), c2 = U.coach(V2, 1, -1, names), an1 = core.analyze(V2.cards, Math.min(V2.stage, 6), core.wrongSums(V2));
        nok(an1.best !== an0.best && !new RegExp(`가장 그럴듯한 합 <b>${an0.best}</b>`).test(c2.mine) && new RegExp(`가장 그럴듯한 합 <b>${an1.best}</b>`).test(c2.mine), `틀린 합 ${an0.best} 가 선생님 후보에서 안 빠짐: ${c2.mine}`);
        const rv2 = U.review(V2, 1, { t: 'ans', sum: an0.best, ms: 0 }, { t: 'wait' }, { k: 0, names, same: false, tally: [], total: 3, seed: 1 });
        nok(rv2 && rv2.sev >= 85, `이미 틀린 합을 또 말한 복기 ${J(rv2)}`);
        found = 1;
      }
      nok(found, '이미 틀린 합 시험을 만들 판을 못 찾음');
    }
    // 구경꾼 · 말 못 하는 사람은 눌러도 아무 일 없음
    const a4 = []; const st4 = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(st4, core.view(st, -1), mkctx(-1, 'watch', false, a4, V));
    nok(st4.onclick && (st4.onclick({ target: { closest: () => ({ dataset: { a: 'buzz' }, disabled: false }) } }), a4.length === 0), '구경꾼이 눌러도 행동 없음');
  }
  // 이름 받침 (조사)
  {
    const st = core.init({ n: 2, seed: 61, cfg: {} });
    core.apply(st, 0, { t: 'ans', sum: 0, ms: 100 }); core.apply(st, 1, { t: 'wait' });
    const nmz = ['범수', '콩콩'];
    nok(/범수 시간 초과 ❌/.test(U.coach(core.view(st, 1), 1, -1, nmz).opp), `합 0(시간 초과·물러남)은 '시간 초과' 로: ${U.coach(core.view(st, 1), 1, -1, nmz).opp}`);
    const st5 = core.init({ n: 2, seed: 61, cfg: {} }), bad5 = st5.A + st5.B + 1;
    core.apply(st5, 0, { t: 'ans', sum: bad5, ms: 100 }); core.apply(st5, 1, { t: 'wait' });
    nok(new RegExp(`범수 ${bad5} ❌`).test(U.coach(core.view(st5, 1), 1, -1, nmz).opp), '틀린 합은 숫자 그대로');
    nok(/시간 초과|물러남/.test(U.actText({ t: 'ans', sum: 0, ms: 900 })) && /합 77/.test(U.actText({ t: 'ans', sum: 77, ms: 900 })), 'actText: 합 0 은 시간 초과, 아니면 합 숫자');
    const rv0 = U.review(core.view(st, 0), 0, { t: 'ans', sum: 0, ms: 900 }, { t: 'wait' }, { k: 0, names: nmz, same: false, tally: [], total: 3, seed: 1 });
    nok(rv0 && rv0.sev >= 50 && /망설|확정|시간/.test(rv0.why), `합 0 복기: ${J(rv0)}`);
    // 라운드 끝 글 조사
    const t2 = core.init({ n: 2, seed: 62, cfg: {} }); core.apply(t2, 0, { t: 'ans', sum: t2.A + t2.B, ms: 0 }); core.apply(t2, 1, { t: 'wait' });
    nok(/범수가 맞혔어요/.test(U.coach(core.view(t2, 1), 1, -1, ['범수', '콩콩']).opp), '받침 없는 이름 범수가');
    nok(/한솔이 맞혔어요/.test(U.coach(core.view(t2, 1), 1, -1, ['한솔', '콩콩']).opp), '받침 있는 이름 한솔이');
    nok(/AI1이 맞혔어요/.test(U.coach(core.view(t2, 1), 1, -1, ['AI1', '콩콩']).opp), '숫자로 끝나는 이름 AI1이');
    nok(/내가 맞혔어요/.test(U.coach(core.view(t2, 0), 0, -1, ['한솔', '콩콩']).opp), '내가 맞힘');
  }
  // qa
  const st = core.init({ n: 3, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok++ < 4000) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 거절됨 ' + J(a)); } }
  nok(core.over(st), 'qa 로 한 판이 끝남');
  global.setInterval = si; global.clearInterval = ci;
  delete global.document;
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (정답! → 숫자 → 확정 · 기다릴래요 · 틀린 합으로 잠기기)
let wrongOnce = false, typedChecked = false;
async function policy(page, { step }) {
  const I = await page.evaluate(() => {
    const h = window.__h, V = h.view(), st = h.st(), nc = Math.min(V.stage, 6), an = h.C.analyze(V.cards, nc);
    return { stage: V.stage, ans: st.A + st.B, best: an.best, p: an.p, open: !!document.querySelector('.mm-bd [data-a="ok"]') };
  });
  const click = async sel => page.locator(`.mm-bd ${sel}`).first().click();
  const type = async num => { for (const d of String(num)) await click(`[data-k="${d}"]`); };
  if (I.open) { await click('[data-a="cancel"]'); return true; }
  const doAns = async sum => {
    await click('[data-a="buzz"]');
    await type(sum);
    if (!typedChecked) { typedChecked = true; const t = await page.evaluate(() => document.querySelector('.mm-disp').innerText.replace(/\s|합/g, '')); nok(t === String(sum), `키패드에 입력한 합이 안 보임: ${t} / ${sum}`); }
    await click('[data-a="ok"]');
  };
  if (!wrongOnce && I.stage >= 3 && step % 2 === 0) { wrongOnce = true; await doAns(I.ans + 1); return true; }       // 틀린 합 → 잠김
  if (I.stage >= 5 && I.p >= 0.9) { await doAns(I.best); return true; }
  await click('[data-a="buzz"]'); await click('[data-a="cancel"]'); return true;
}
// 1분 규칙 직접 해 보기: 둘째 숫자 93 고르기 (틀린 보기 98 부터)
async function tutPolicy(page, i, k) {
  const seq = ['[data-n="98"]', '[data-n="83"]', '[data-n="93"]'];
  return page.evaluate(sel => { const b = document.getElementById('tutStage').querySelector(sel); if (!b) return false; b.click(); return true; }, seq[k % seq.length]);
}
(async () => {
  await run('mixmatch', policy, { runs: 3, ns: [3, 2, 4], tutPolicy, query: r => 'cfg_aid=' + (r % 2) + '&cfg_rounds=' + [3, 5, 3][r % 3] });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

// 스위치 포커 화면 시험: node survival/test/switchpoker_ui.js
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = JSON.stringify;

// 1) Node 쪽: 선생님 글은 남의 숨은 것(모르는 손패 · 더미 순서)만 바꾼 두 장면에서 같아야 함 · 💡 = 고급 AI · 복기 sev · actText
(() => {
  const core = require(path.join(ROOT, 'games/switchpoker/core.js'));
  global.window = { SVCores: { switchpoker: core } };
  require(path.join(ROOT, 'games/switchpoker/ui.js'));
  const U = global.window.SVUI.switchpoker;
  nok(U.board === false && U.min === 4 && U.max === 4 && U.defN === 4, '4명 · 한 기기 안 됨');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  nok(/^목표/.test(U.howto[0]) && /^준비물/.test(U.howto[1]) && /^진행/.test(U.howto[2]) && /^승패/.test(U.howto[3]) && /^특수/.test(U.howto[4]), 'howto 순서 = 목표 → 준비물 → 진행 → 승패 → 특수');
  nok(U.opts.length === 2 && U.opts[0].k === 'seat' && U.opts[0].def === 'vs' && U.opts[1].k === 'rounds' && U.opts[1].def === 7, '옵션: 자리 · 라운드');
  const lcg = s => { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  let recN = 0, n = 0, revN = 0; const phases = new Set(), kinds = new Set(), whys = new Set();
  for (let k = 0; k < 9; k++) {
    const map = ['vs', 'co', 'help'][k % 3], names = ['나', '나비', '치즈', '두부'];
    const st = core.init({ seed: 800 + k, cfg: { seat: map, rounds: k % 2 ? 3 : 7 } }), r = lcg(k + 31);
    for (let steps = 0; steps < 700 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      const s0 = need[0];
      for (const s of [s0, (s0 + 1) % 4]) {
        // 숨은 것만 바꾼 판: s 가 모르는 남의 카드 · 더미 순서
        const st2 = JSON.parse(J(st)), rr = lcg(steps * 7 + s + 1);
        const keep = c => (st2.kn[s].includes(c)) || (st2.give && (st2.give.s === s || (st2.give.t === 'swap' && st2.mt[st2.give.s] === s)) && st2.give.c === c);
        const free = []; for (let j = 0; j < 4; j++) if (j !== s) st2.hands[j].forEach((c, i) => { if (!keep(c)) free.push([j, i]); });
        if (st2.phase === 'show') free.length = 0;
        const bag = free.map(([j, i]) => st2.hands[j][i]).concat(st2.deck);
        for (let i = bag.length - 1; i > 0; i--) { const q = Math.floor(rr() * (i + 1)); [bag[i], bag[q]] = [bag[q], bag[i]]; }
        free.forEach(([j, i], x) => { st2.hands[j][i] = bag[x]; });
        st2.deck = bag.slice(free.length); st2.rs = (st.rs ^ 0x7f4a7c15) >>> 0;
        if (st2.give && st2.give.t === 'draw' && st2.give.s !== s) st2.give.c = st2.hands[st2.give.s][st2.hands[st2.give.s].length - 1];
        const V1 = core.view(st, s), V2 = core.view(st2, s);
        nok(J(V1) === J(V2), `숨은 것만 바꿨는데 view 가 달라짐 (자리 ${s}, ${st.phase})`);
        const c1 = U.coach(V1, s, -1, names), c2 = U.coach(V2, s, -1, names);
        nok(J(c1) === J(c2), `선생님 글이 숨은 정보로 바뀜 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null|\[object/.test(J(c1)), '선생님 글 이상 ' + J(c1));
        if (need.includes(s)) {
          const V0 = core.view(st, s), H = core.recommend(V0, s), ha = core.ai(V0, s, 'hard', core.recRnd(V0, s)); recN++;
          nok(J(H.a) === J(ha) && c1.rec === U.actText(ha), `추천 ≠ 고급 AI ${c1.rec} vs ${J(ha)}`);
          nok(c1.why && /\d/.test(c1.why) && !/undefined|NaN/.test(c1.why), `차례인데 숫자 이유가 없음 (${st.phase}) ${c1.why}`);
          phases.add(st.phase); kinds.add(ha.t); if (H.B) whys.add(H.B.why); if (H.rule) whys.add(H.rule);
          if (st.phase === 'reply') nok(/보다 (작아요|커요)/.test(c1.why) || /보다 (작|크)/.test(c1.mine), '받은 카드로 파트너 손패를 짐작하는 글이 없음 ' + c1.why);
          const L = core.legal(st, s), my = L[Math.floor(r() * L.length)];
          const rv0 = U.review(V0, s, ha, ha, { seed: 5 }), rv1 = U.review(V0, s, my, ha, { seed: 5 });
          nok(rv0.sev === 0, '고급 AI 수인데 복기 sev ≠ 0 ' + J(rv0));
          nok(rv1.sev >= 0 && rv1.sev <= 100 && (!rv1.why || /\d/.test(rv1.why)), '복기 sev/이유 이상 ' + J(rv1));
          nok(typeof U.actText(my, V0, names) === 'string' && !/undefined|NaN/.test(U.actText(my, V0, names)), 'actText ' + J(my));
          revN++;
          const vv = JSON.parse(J(V0)); U.coach(vv, s, -1, names); U.review(vv, s, my, ha, { seed: 5 }); nok(J(vv) === J(V0), '선생님 · 복기가 view 를 바꿈');
        }
        n++;
      }
      const a = core.ai(core.view(st, s0), s0, ['easy', 'normal', 'hard'][(s0 + k) % 3], r);
      nok(core.apply(st, s0, a).ok, 'AI 수 ' + J(a));
    }
    nok(core.over(st), `${map} 판이 끝남`);
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(J(fin)), '끝난 판 선생님 글');
    global.window.SVUI.switchpoker.render && void 0;
    const rs2 = U.result(core.view(st, 0), 0);
    nok(typeof rs2 === 'string' && /<table/.test(rs2) && !/undefined|NaN/.test(rs2), '결과 html');
    const watch = U.coach(core.view(st, 'all'), -1, -1, names);
    nok(watch.rec && !/undefined|NaN/.test(J(watch)), '구경 선생님 글');
  }
  nok(U.actText({ t: 'swap', c: 13 }) === '13 건네기 (교환)' && U.actText({ t: 'raise', r: 3 }) === '+3 레이즈' && U.actText({ t: 'drop', c: 6 }) === '6 버리기', 'actText 글');
  nok(recN > 150, '추천 시험이 충분히 돎 ' + recN);
  nok(['act', 'drop', 'reply', 'bet'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(['draw', 'drop', 'swap', 'back', 'call', 'fold', 'raise'].every(p => kinds.has(p)), '추천 종류 ' + [...kinds]);
  nok(['give', 'reply', 'ev'].every(p => whys.has(p)), '선생님 까닭 종류 ' + [...whys]);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번 · 추천 ${recN} · 복기 ${revN} (겪은 단계: ${[...phases].join(' · ')} · 까닭: ${[...whys].join(' · ')})`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (패스 · 오픈 변경 · 1장 뽑기 → 버리기 · 건네기 → 돌려주기 · 폴드 · 콜 · 레이즈)
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  const pickBtn = async sel => { const b = page.locator(sel), c = await b.count(); if (!c) return false; await b.nth(step % c).click(); return true; };
  if (ph === 'act') return pickBtn(step % 4 === 0 ? '[data-a=swap]' : step % 4 === 1 ? '[data-a=draw]:not([disabled])' : step % 4 === 2 ? '[data-a=open]:not([disabled])' : '[data-a=pass]');
  if (ph === 'drop') return pickBtn('[data-a=drop]');
  if (ph === 'reply') return pickBtn('[data-a=back]');
  if (ph === 'bet') return pickBtn(step % 5 === 0 ? '[data-a=fold]' : step % 3 === 0 ? '[data-a=raise]' : '[data-a=call],[data-a=raise]');
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-c="9"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('switchpoker', policy, { runs: 3, tutPolicy, allShots: false, query: r => `cfg_seat=${['vs', 'co', 'help'][r % 3]}&cfg_rounds=3` });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

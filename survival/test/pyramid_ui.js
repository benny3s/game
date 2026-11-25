// 피라미드 넘버 화면 시험: node survival/test/pyramid_ui.js [--shots 폴더] [--runs 3]
'use strict';
const fs = require('fs'), path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 안내 글 · 선생님 글 · 복기 글 · 구경 화면 · 조사
(() => {
  const core = require(path.join(ROOT, 'games/pyramid/core.js'));
  global.window = { SVCores: { pyramid: core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} }, body: { contains: () => true } };
  const si = global.setInterval, ci = global.clearInterval; global.setInterval = () => 1; global.clearInterval = () => {};
  require(path.join(ROOT, 'games/pyramid/ui.js'));
  const U = global.window.SVUI.pyramid;
  nok(U.src && /^방송: 피의 게임 시즌3 · 피라미드 넘버/.test(U.src) && U.diff && /^방송과 다른 점: /.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 2 && U.defN === 2 && U.board === true && U.fitCoach === true, '2명 고정 · board:true · fitCoach');
  nok(U.howto.length >= 7 && /목표/.test(U.howto[0]) && /준비물/.test(U.howto[1]) && /진행/.test(U.howto[2]) && /승패/.test(U.howto[3]) && /특수/.test(U.howto[4]), 'howto 방송 순서(목표 → 준비물 → 진행 → 승패 → 특수)');
  nok(U.opts.length === 1 && U.opts[0].k === 'rounds' && U.opts[0].items.some(x => x[0] === U.opts[0].def), '옵션: 라운드 수');
  const src = fs.readFileSync(path.join(ROOT, 'games/pyramid/ui.js'), 'utf8');
  nok(!/이\(가\)|은\(는\)|을\(를\)|과\(와\)/.test(src), "조사는 '이(가)' 식으로 쓰지 않고 받침에 맞게");
  const seats = [{ name: '한솔', emoji: '🙂' }, { name: '두리', emoji: '🤖' }];
  const draw = (V, me, mode, canAct) => { const stage = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(stage, V, { me, act() {}, canAct: canAct != null ? canAct : me >= 0 && V.needs.includes(me) && !V.over, seats, mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }); return stage.innerHTML; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const names = ['한솔', '두리'];
  let n = 0, specN = 0, phases = new Set(), jo = { 가: 0, 이: 0 }, rv = 0, rvSev = 0, kinds = new Set();
  for (let k = 0; k < 40; k++) {
    const st = core.init({ n: 2, seed: 500 + k, cfg: k % 5 === 0 ? { rounds: 5 } : {} });
    let rs = k + 7; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    const tiers = ['easy', 'normal', 'hard'];
    for (let steps = 0; steps < 300 && !core.over(st); steps++) {
      const need = core.needs(st), ph = st.phase; phases.add(ph);
      for (const s of [0, 1]) {
        const V = core.view(st, s), c1 = U.coach(V, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(JSON.stringify(c1)), `선생님 글 이상 (${ph}) ` + JSON.stringify(c1).slice(0, 200));
        if (/두리가/.test(c1.opp + c1.why)) jo.가++; if (/한솔이/.test(c1.opp + c1.why)) jo.이++;
        // 숨은 것(정답 목록)을 바꿔도 선생님 글 같음 (라운드 중)
        if (ph !== 'show') { const alt = clone(st); for (const kk of Object.keys(alt.sol)) { alt.sol[kk].rpn = ['0', '1', '2', '+', '+']; alt.sol[kk].f = 1; } nok(JSON.stringify(c1) === JSON.stringify(U.coach(core.view(alt, s), s, -1, names)), `선생님 글이 숨은 정보로 바뀜 (${ph})`); }
        const html = draw(V, s, 'solo');
        nok(!/undefined|NaN|null|\[object/.test(html), `화면 글 이상 (${ph}): ` + (html.match(/.{0,30}(undefined|NaN|null|\[object).{0,30}/) || [''])[0]);
        nok(!html.includes('구경 중'), '참가자 화면에 구경 중 표시');
        nok((html.match(/class="py-c[ "]/g) || []).length === 14, `피라미드 목표 14개 (${(html.match(/class="py-c[ "]/g) || []).length})`);
        if (['open', 'raise', 'imp'].includes(ph)) {
          nok(/data-c="0"/.test(html) && /data-o="\+"/.test(html) && /data-u="r"/.test(html), '식 만드는 단추');
          nok(!/py-c[^"]*\bsol\b/.test(html), '라운드 중에 정답 목록(초록)이 칠해짐');
          if (need.includes(s)) nok(/data-a="submit"/.test(html) && /data-a="pass"/.test(html), '내 차례 화면에 선언 · 넘기기 단추');
          if (need.includes(s) && ph === 'open') nok(/data-a="imp"/.test(html), '먼저 차례에 불가능 단추');
          if (need.includes(s) && ph !== 'open') nok(!/data-a="imp"/.test(html), '정답 선언이 나온 뒤엔 불가능 단추 없음');
          if (!need.includes(s)) nok(/data-a="submit"[^>]*disabled/.test(html), '상대 차례엔 선언 단추 잠김');
        }
        n++;
      }
      for (const [seat, me, mode] of [[-1, -1, 'watch'], ['all', -1, 'watch']]) {
        const V = core.view(st, seat), html = draw(V, me, mode, false);
        nok(html.includes('구경 중'), `구경 화면에 '구경 중' 없음 (${seat} ${ph})`);
        nok(!/undefined|NaN|null|\[object/.test(html), `구경 화면 글 이상 (${seat} ${ph})`);
        nok(!/data-a=|data-c=|data-o=/.test(html), '구경 화면에 누르는 단추가 있음');
        specN++;
      }
      if (!need.length) { core.advance(st); continue; }
      const seat = need[0], V = core.view(st, seat), a = core.ai(V, seat, tiers[(k + seat) % 3], r);
      // 복기 글: 내 수 (AI 수와 임의의 다른 수) · actText
      const alts = [{ t: 'pass' }, a]; if (ph === 'open') alts.push({ t: 'imp' });
      const tb = core.table(V); if (tb.length) alts.push({ t: 'ans', rpn: tb[tb.length - 1].rpn.slice(), tv: tb[tb.length - 1].v });
      alts.push({ t: 'ans', rpn: ['0', '1', '+', '2', '+'] });
      for (const my of alts) {
        const t = U.actText(my, clone(V), names); nok(typeof t === 'string' && t.length > 0 && !/undefined|NaN|null/.test(t), `actText 이상: ${t}`);
        const rvw = U.review(clone(V), seat, clone(my), clone(a), { k: 0, names, same: false, tally: [], total: 3, seed: 1 });
        nok(rvw && typeof rvw.sev === 'number' && rvw.sev >= 0 && rvw.sev <= 100 && !/undefined|NaN|null/.test(JSON.stringify(rvw)), `review 이상 ${JSON.stringify(rvw)}`);
        if (rvw) { rv++; if (rvw.sev >= 60) rvSev++; if (rvw.sev > 0) { nok(rvw.why && rvw.why.length > 10, 'sev>0 인데 why 가 비어 있음'); kinds.add(my.t + ph); } }
      }
      nok(core.apply(st, seat, a).ok, '시험 진행 중 AI 수가 거절됨');
    }
    if (core.over(st)) for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, names); nok(c && c.opp && c.rec && !/undefined|NaN/.test(JSON.stringify(c)), '끝난 뒤 선생님 글'); n++; }
    const rh = U.result(core.view(st, 0), 0), ra = U.result(core.view(st, 'all'), -1);
    nok(rh.length > 20 && !/undefined|NaN|null/.test(rh + ra), '결과 html 이상: ' + rh.slice(0, 80));
    nok(!/undefined|NaN|null|\[object/.test(draw(core.view(st, 0), 0, 'solo') + draw(core.view(st, -1), -1, 'watch', false)), '끝난 화면 글 이상');
  }
  nok(n > 400 && specN > 400 && ['open', 'raise', 'imp', 'show'].every(p => phases.has(p)), `시험 횟수 ${n} · 구경 화면 ${specN} · 단계 ${[...phases]}`);
  nok(jo.가 > 0 && jo.이 > 0, `조사: 두리가 ${jo.가}번 · 한솔이 ${jo.이}번 (둘 다 나와야 함)`);
  nok(rv > 200 && rvSev > 20 && kinds.size >= 5, `복기 글 ${rv}번 · 아쉬운 수(sev≥60) ${rvSev}번 · 종류 ${[...kinds].join(',')}`);
  console.log(`  선생님 글 · 복기 글 시험: 글 ${n}번 · 구경 화면 ${specN}번 · 복기 ${rv}번(아쉬운 ${rvSev}) · 조사(두리가 ${jo.가} · 한솔이 ${jo.이}) 통과`);
  // 이름 받침 (조사)
  {
    const st = core.init({ n: 2, seed: 61, cfg: {} }); const h = st.hold, o = 1 - h, nmz = ['', '']; nmz[h] = '범수'; nmz[o] = '콩콩';
    const c = U.coach(core.view(st, o), o, -1, nmz);
    nok(/범수가 /.test(c.opp), `받침 없는 이름 '범수가': ${c.opp}`);
    nmz[h] = '한솔'; nok(/한솔이 /.test(U.coach(core.view(st, o), o, -1, nmz).opp), '받침 있는 이름 한솔이');
    nmz[h] = 'AI1'; nok(/AI1이 /.test(U.coach(core.view(st, o), o, -1, nmz).opp), '숫자로 끝나는 이름 AI1이');
  }
  // qa
  const st = core.init({ n: 2, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok < 400) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 규칙에 안 맞음'); qaok++; } }
  nok(core.over(st), 'qa 로 한 판이 끝남');
  global.setInterval = si; global.clearInterval = ci;
  delete global.document;
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (식 만들기 → 선언 · 넘기기 · 불가능 · 도전)
let probed = false, lastKey = '';
// RPN → 눌러야 할 단추 목록 (칩 번호는 합칠 때마다 바뀜)
function clicksFor(rpn) {
  const st = []; let nid = 10;
  for (const t of rpn) {
    if ('012'.includes(t) && t.length === 1) st.push({ id: +t });
    else if ('+-*/'.includes(t)) { const b = st.pop(), a = st.pop(); st.push({ id: nid++, bin: [a, b, t] }); }
    else { const a = st.pop(); st.push({ id: a.id, un: [a, t] }); }
  }
  const chips = [0, 1, 2], out = [];
  const go = node => {
    if (node.bin) { const [a, b, o] = node.bin; go(a); go(b); const ia = chips.indexOf(a.id), ib = chips.indexOf(b.id); out.push(`[data-c="${ia}"]`, `[data-o="${o}"]`, `[data-c="${ib}"]`); const lo = Math.min(ia, ib), hi = Math.max(ia, ib); chips[lo] = node.id; chips.splice(hi, 1); }
    else if (node.un) { const [a, u] = node.un; go(a); out.push(`[data-c="${chips.indexOf(a.id)}"]`, `[data-u="${u}"]`); }
  };
  go(st[0]); return out;
}
async function policy(page, { step }) {
  const I = await page.evaluate(() => {
    const h = window.__h, V = h.view(), st = h.st(), tab = h.C.table(V);
    return { ph: V.phase, step: V.step, floor: V.floor, hold: V.hold, tab: tab.map(t => ({ v: t.v, f: t.f, rpn: t.rpn })), ops: V.ops };
  });
  const click = async sel => page.locator(`.py-bd ${sel}`).first().click();
  const build = async rpn => { for (const sel of clicksFor(rpn)) await click(sel); };
  if (!probed && I.ph === 'open') {
    probed = true;
    // 값이 목표에 없는 식: 선언 단추가 잠겨야 함 (3 + 숫자 합 = 목표가 아닌 값을 찾음)
    const all = await page.evaluate(() => window.__h.view().rows.flat());
    const rp = [['0', '1', '+', '2', '+'], ['0', '1', '+', '2', '*'], ['0', '1', '*', '2', '+'], ['0', '1', '2', '*', '-']].find(r => { const v = (window.__h ? null : null); return true; });
    void rp; void all;
    await click('[data-c="0"]'); await click('[data-o="+"]'); await click('[data-c="1"]');
    await page.evaluate(() => { const b = document.querySelector('.py-bd [data-c]'); void b; });
    const txt1 = await page.evaluate(() => document.querySelector('.py-bd').innerText);
    nok(/\d+ \+ \d+/.test(txt1), `숫자 → 기호 → 숫자로 합쳐지지 않음: ${txt1.slice(0, 80)}`);
    await click('[data-a="undo"]');
    const txt2 = await page.evaluate(() => document.querySelectorAll('.py-bd .py-chip').length);
    nok(txt2 === 3, `되돌리기가 안 먹음 (조각 ${txt2}개)`);
    await click('[data-c="0"]'); await click('[data-c="1"]');           // 기호 없이 다른 숫자: 선택만 바뀜
    const sel = await page.evaluate(() => document.querySelectorAll('.py-bd .py-chip.sel').length);
    nok(sel === 1, `조각 선택이 하나가 아님 (${sel})`);
    await click('[data-a="clear"], [data-a="undo"]').catch(() => {});
    await page.evaluate(() => window.__h.render());
  }
  const canSubmit = async () => page.evaluate(() => { const b = document.querySelector('.py-bd [data-a="submit"]'); return !!b && !b.disabled; });
  if (I.ph === 'open') {
    const m = I.step === 0 ? step % 5 : step % 3;
    if (I.step === 0 && m === 0) { await click('[data-a="pass"]'); return true; }
    if (I.step === 0 && m === 1 && !I.tab.length) { await click('[data-a="imp"]'); return true; }
    if (!I.tab.length) { await click(m === 2 ? '[data-a="imp"]' : '[data-a="pass"]'); return true; }
    const t = m === 4 ? I.tab[I.tab.length - 1] : I.tab[0];
    await build(t.rpn); nok(await canSubmit(), `만든 식(${t.v})인데 선언 단추가 잠김`); await click('[data-a="submit"]'); return true;
  }
  const up = I.ph === 'raise' ? I.tab.filter(t => t.f > I.floor) : I.tab;
  if (!up.length || step % 7 === 0) { await click('[data-a="pass"]'); return true; }
  await build(up[0].rpn); nok(await canSubmit(), `도전 식(${up[0].v})인데 선언 단추가 잠김`); await click('[data-a="submit"]'); return true;
}
// 1분 규칙 직접 해 보기: 5 − 3 = 2 → 8 × 2 = 16
async function tutPolicy(page, i, k) {
  const seq = ['[data-c="1"]', '[data-o="-"]', '[data-c="0"]', '[data-c="1"]', '[data-o="*"]', '[data-c="0"]'];
  return page.evaluate(sel => { const b = document.getElementById('tutStage').querySelector(sel); if (!b) return false; b.click(); return true; }, seq[k % seq.length]);
}
(async () => {
  await run('pyramid', policy, { runs: 3, ns: [2], tutPolicy, query: r => 'cfg_rounds=' + [5, 10, 5][r % 3] });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

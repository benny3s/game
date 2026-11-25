// 수식미로 화면 시험: node survival/test/mazesum_ui.js [--shots 폴더] [--runs 3]
'use strict';
const fs = require('fs'), path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 안내 글 · 선생님 글 (숨은 것 = 숫자판 · 정답 길 · 기억) · 구경 화면 · 조사
(() => {
  const core = require(path.join(ROOT, 'games/mazesum/core.js'));
  global.window = { SVCores: { mazesum: core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} }, body: { contains: () => true } };
  const si = global.setInterval, ci = global.clearInterval; global.setInterval = () => 1; global.clearInterval = () => {};
  require(path.join(ROOT, 'games/mazesum/ui.js'));
  const U = global.window.SVUI.mazesum;
  nok(U.src === '방송: 피의 게임 시즌3 · 수식미로 (8일차 데스매치)' && U.diff && /^방송과 다른 점: /.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 2 && U.defN === 2 && U.board === false, '2명 고정 · board:false');
  nok(U.howto.length >= 7 && /목표/.test(U.howto[0]) && /준비물/.test(U.howto[1]) && /진행/.test(U.howto[2]) && /승패/.test(U.howto[3]) && /특수/.test(U.howto[4]), 'howto 방송 순서(목표 → 준비물 → 진행 → 승패 → 특수)');
  nok(U.opts.length === 1 && U.opts[0].k === 'memo' && U.opts[0].items.some(x => x[0] === U.opts[0].def), '옵션: 외우는 시간');
  const src = fs.readFileSync(path.join(ROOT, 'games/mazesum/ui.js'), 'utf8');
  nok(!/이\(가\)|은\(는\)|을\(를\)|과\(와\)/.test(src), "조사는 '이(가)' 식으로 쓰지 않고 받침에 맞게");
  const seats = [{ name: '한솔', emoji: '🙂' }, { name: '두리', emoji: '🤖' }];
  const draw = (V, me, mode, canAct) => { const stage = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(stage, V, { me, act() {}, canAct: canAct != null ? canAct : me >= 0 && V.needs.includes(me) && !V.over, seats, mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }); return stage.innerHTML; };
  const numsIn = html => [...html.matchAll(/class="n">(\d+)</g)].map(m => +m[1]);
  const clone = o => JSON.parse(JSON.stringify(o));
  const names = ['한솔', '두리'];
  let n = 0, hid = 0, specN = 0, phases = new Set(), jo = { 가: 0, 이: 0 };
  for (let k = 0; k < 40; k++) {
    const st = core.init({ n: 2, seed: 500 + k, cfg: {} });
    let rs = k + 7; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    const tiers = ['easy', 'normal', 'hard'];
    for (let steps = 0; steps < 80 && !core.over(st); steps++) {
      const need = core.needs(st), ph = st.phase; phases.add(ph);
      for (const s of [0, 1]) {
        const V = core.view(st, s), c1 = U.coach(V, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(JSON.stringify(c1)), `선생님 글 이상 (${ph}) ` + JSON.stringify(c1));
        if (/두리가/.test(c1.opp + c1.why)) jo.가++; if (/한솔이/.test(c1.opp + c1.why)) jo.이++;
        // 숨은 것만 바꾼 장면: 숫자판(보이지 않을 때) · 지금 문제의 정답 길 · 두 기억
        if (V.board === null) {
          const alt = clone(st), q = alt.qs[alt.qi];
          for (const b of alt.bds) for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
          alt.bd = alt.bds[alt.round];
          const other = core.paths(q.s, q.e).filter(p => p.length >= 5 && p.length <= 9); q.ans = other[Math.floor(r() * other.length)].slice();
          alt.mem = [null, null];
          const V2 = core.view(alt, s);
          nok(JSON.stringify(Object.assign({}, V, { mem: null })) === JSON.stringify(Object.assign({}, V2, { mem: null })), '(시험 틀 오류) 바꾼 장면의 view 가 달라짐');
          nok(JSON.stringify(c1) === JSON.stringify(U.coach(V2, s, -1, names)), `선생님 글이 숨은 정보로 바뀜 (${ph})`);
          hid++;
        } else if (ph === 'memo') {
          // 외우는 중: 판은 보이는 것. 숨은 것 = 기억(내 · 상대)
          const alt = clone(st); alt.mem = [alt.bd.slice(), alt.bd.slice()];
          nok(JSON.stringify(c1) === JSON.stringify(U.coach(core.view(alt, s), s, -1, names)), '선생님 글이 기억으로 바뀜 (외우기)'); hid++;
        }
        // 화면
        const html = draw(V, s, 'solo');
        nok(!/undefined|NaN|null|\[object/.test(html), `화면 글 이상 (${ph}): ` + (html.match(/.{0,30}(undefined|NaN|null|\[object).{0,30}/) || [''])[0]);
        nok(!html.includes('구경 중'), '참가자 화면에 구경 중 표시');
        const nm = numsIn(html);
        if (V.board) nok(JSON.stringify(nm) === JSON.stringify(V.board) || ph === 'show' || ph === 'end', `숫자판이 열린 화면의 숫자 ${JSON.stringify(nm)} vs ${JSON.stringify(V.board)}`);
        else nok(nm.length === 0, `숫자가 가려진 화면에 숫자가 보임 (${ph}): ${nm}`);
        if (ph === 'ask') nok(!/mz-c[^"]*\bans\b/.test(html), '문제 중 정답 길이 칠해짐');
        if (ph === 'ask' && need.includes(s)) {
          nok(/data-a="submit"/.test(html) && /data-a="pass"/.test(html) && /data-i="\d+"/.test(html), '내 차례 화면에 단추 없음');
          nok(!/data-a="ready"/.test(html), '문제 중에 외웠어요 단추');
        }
        if (ph === 'memo' && need.includes(s)) nok(/data-a="ready"/.test(html), '외우는 중 화면에 외웠어요 단추 없음');
        hid++; n++;
      }
      // 구경꾼 (-1) · AI 구경 ('all')
      for (const [seat, me, mode] of [[-1, -1, 'watch'], ['all', -1, 'watch']]) {
        const V = core.view(st, seat), html = draw(V, me, mode, false);
        nok(html.includes('구경 중'), `구경 화면에 '구경 중' 없음 (${seat} ${ph})`);
        nok(!/undefined|NaN|null|\[object/.test(html), `구경 화면 글 이상 (${seat} ${ph})`);
        nok(!/data-a=|data-i=/.test(html), '구경 화면에 누르는 단추가 있음');
        const nm = numsIn(html);
        if (V.board) nok(nm.length === 16 || ph === 'show' || ph === 'end', `구경 화면 숫자 ${nm.length}`);
        else nok(nm.length === 0, '가려진 구경 화면에 숫자');
        if (seat === 'all' && ph === 'ask') nok(/기억한 칸/.test(html), 'AI 구경에서 AI 가 기억한 칸 수가 안 보임');
        specN++;
      }
      if (!need.length) { core.advance(st); continue; }
      const seat = need[Math.floor(r() * need.length)], a = core.ai(core.view(st, seat), seat, tiers[(k + seat) % 3], r);
      nok(core.apply(st, seat, a).ok, '시험 진행 중 AI 수가 거절됨');
    }
    if (core.over(st)) for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, names); nok(c && c.opp && c.rec && !/undefined|NaN/.test(JSON.stringify(c)), '끝난 뒤 선생님 글'); n++; }
    const rh = U.result(core.view(st, 0), 0), ra = U.result(core.view(st, 'all'), -1);
    nok(rh.length > 20 && !/undefined|NaN|null/.test(rh + ra), '결과 html 이상: ' + rh.slice(0, 80));
    nok(!/undefined|NaN|null|\[object/.test(draw(core.view(st, 0), 0, 'solo') + draw(core.view(st, -1), -1, 'watch', false)), '끝난 화면 글 이상');
  }
  nok(n > 400 && hid > 400 && specN > 200 && ['memo', 'ask', 'show'].every(p => phases.has(p)), `시험 횟수 ${n} · 숨은 것 바꾼 쌍 ${hid} · 구경 화면 ${specN} · 단계 ${[...phases]}`);
  nok(jo.가 > 0 && jo.이 > 0, `조사: 두리가 ${jo.가}번 · 한솔이 ${jo.이}번 (둘 다 나와야 함)`);
  console.log(`  선생님 글 숨은 정보 시험: 글 ${n}번 · 숨은 것(숫자판 · 정답 길 · 기억)을 바꾼 쌍 ${hid}번 · 구경 화면 ${specN}번 · 조사(두리가 ${jo.가} · 한솔이 ${jo.이}) 통과`);
  // 이름 받침 (조사): 같은 문장을 받침 없는 / 있는 이름으로
  {
    const st = core.init({ n: 2, seed: 61, cfg: {} }); for (const s of [0, 1]) core.apply(st, s, { t: 'ready' });
    const h = st.hold, o = 1 - h, nmz = ['', '']; nmz[h] = '범수'; nmz[o] = '콩콩';
    const c = U.coach(core.view(st, o), o, -1, nmz);                  // 나(o)는 기다리는 쪽 → 상대 이름이 문장에 들어감
    nok(/범수가 /.test(c.opp), `받침 없는 이름 '범수가': ${c.opp}`);
    nmz[h] = '한솔'; nok(/한솔이 /.test(U.coach(core.view(st, o), o, -1, nmz).opp), '받침 있는 이름 한솔이');
    nmz[h] = 'AI1'; nok(/AI1이 /.test(U.coach(core.view(st, o), o, -1, nmz).opp), '숫자로 끝나는 이름 AI1이');
  }
  // qa
  const st = core.init({ n: 2, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok < 80) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 규칙에 안 맞음'); qaok++; } }
  nok(core.over(st), 'qa 로 한 판이 끝남');
  global.setInterval = si; global.clearInterval = ci;
  delete global.document;
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (외우기 → 길 잇기 → 넘기기 · 틀린 길 · 정답)
let probed = false;
async function policy(page, { step }) {
  const I = await page.evaluate(() => {
    const h = window.__h, V = h.view(), st = h.st(), o = { ph: V.phase, hold: V.hold, stp: V.step, ready: V.ready[h.ME] };
    if (V.phase === 'ask') {
      const q = V.q; o.q = q; o.ans = st.qs[st.qi].ans; o.wrong = h.C.paths(q.s, q.e).find(p => h.C.sumOf(st.bd, p) !== q.sum);
      const pe = document.querySelector('.mz-path'); o.txt = pe ? pe.textContent : '';
      o.far = [...Array(16).keys()].find(c => c !== q.s && !h.C.NB[q.s].includes(c)); o.near = h.C.NB[q.s][0];
    }
    return o;
  });
  if (I.ph === 'memo') { if (I.ready) return false; await page.locator('[data-a=ready]').click(); return true; }
  if (I.ph !== 'ask' || I.hold !== 0) return false;
  const txt = async () => page.evaluate(() => (document.querySelector('.mz-path') || {}).textContent || '');
  if (!probed) {
    probed = true;
    await page.locator(`.mz-board [data-i="${I.far}"]`).click();                       // 이어지지 않은 칸은 무시
    nok((await txt()) === I.txt, `이어지지 않은 칸을 눌렀는데 길이 바뀜: ${I.txt} → ${await txt()}`);
    await page.locator(`.mz-board [data-i="${I.near}"]`).click();                      // 이웃 칸은 붙음
    nok((await txt()) !== I.txt, '이웃한 칸을 눌렀는데 길이 안 붙음');
    await page.locator('[data-a=undo]').click();                                       // 한 칸 취소
    nok((await txt()) === I.txt, '한 칸 취소가 안 먹음');
  }
  const build = async cells => { for (const c of cells.slice(1)) await page.locator(`.mz-board [data-i="${c}"]`).click(); await page.locator('[data-a=submit]:not([disabled])').click(); };
  const m = I.stp === 0 ? step % 4 : step % 3;
  if (I.stp === 0 && m === 0) { await page.locator('[data-a=pass]').click(); return true; }
  if ((I.stp === 0 && m === 1) || (I.stp === 1 && m === 0)) { await build(I.wrong); return true; }
  await build(I.ans); return true;
}
// 1분 규칙 직접 해 보기: 처음엔 합이 틀린 길(B F G K O = 42)로 한 번 틀리고, 그다음 정답 길(B F J N O = 37)
async function tutPolicy(page, i, k) {
  const seq = [5, 6, 10, 14, 5, 9, 13, 14];
  return page.evaluate(c => { const b = document.getElementById('tutStage').querySelector(`[data-i="${c}"]`); if (!b) return false; b.click(); return true; }, seq[k % seq.length]);
}
(async () => {
  await run('mazesum', policy, { runs: 3, ns: [2], tutPolicy, query: r => 'cfg_memo=' + [60, 30, 90][r % 3] });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

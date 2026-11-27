// 프로젝트 갤럭시 화면 시험: node survival/test/galaxy_ui.js [--shots 폴더] [--runs 4]
//  · Node: AI 선생님 글 (숨은 판 · 남의 비밀이 다른 두 장면에서 view 도 글도 같음 · 추천 = 고급 AI · undefined/NaN 없음)
//  · 브라우저: 화면 단추만 눌러 한 판 끝까지 (4 · 5 · 8 · 6명), 1분 규칙 직접 해 보기
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { run } = require('./s3ui_lib.js');
const GAMES = path.resolve(__dirname, '..', 'games');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

function loadAll(id) {
  const sb = { console }; sb.window = sb; sb.self = sb;
  sb.document = { createElement: () => ({}), head: { appendChild() {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(GAMES, id, 'core.js'), 'utf8'), sb, { filename: 'core.js' });
  vm.runInContext(fs.readFileSync(path.join(GAMES, id, 'ui.js'), 'utf8'), sb, { filename: 'ui.js' });
  return { C: sb.SVCores[id], U: sb.SVUI[id] };
}
(() => {
  const { C, U } = loadAll('galaxy');
  const J = x => JSON.stringify(x);
  nok(U.min === 4 && U.max === 8 && U.board === false, '4~8명 · 한 기기 안 됨');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 다른 점');
  // 영문 글자 · 숫자 뒤에 띄어 쓴 조사가 없어야 함
  const alltxt = [U.diff, U.src, ...U.howto, ...U.tutorial().map(s => s.title + s.body)].join(' ');
  nok(!/[A-Za-z0-9] (를|을|은|는|이|가|로|으로|와|과)( |[^가-힣])/.test(alltxt), '글자 뒤 띄운 조사 ' + (alltxt.match(/.{6}[A-Za-z0-9] (를|을|은|는|이|가|로|으로|와|과)( |[^가-힣]).{4}/) || [''])[0]);
  const names = ['나', '범수', '치즈', '삐약', '모모', '하루', '봄이', '달이'];
  let n = 0, recN = 0, phases = new Set();
  for (let k = 0; k < 5; k++) {
    const nn = [4, 5, 8, 6, 7][k], st = C.init({ n: nn, seed: 600 + k });
    let rs = k + 3; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 400 && !C.over(st); steps++) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      for (const s of [steps % 3 === 0 ? 0 : nn - 1]) {
        const V = C.view(st, s), c1 = U.coach(V, s, -1, names);
        const st2 = JSON.parse(JSON.stringify(st));
        // 드러나지 않은 구역의 천체를 뒤섞고 남의 선택 · 관측 · 코인 아닌 비밀을 바꿈
        const hid = []; for (let i = 0; i < 16; i++) if (st2.rev[i] < 0) hid.push(i);
        const ts = hid.map(i => st2.map[i]); ts.reverse(); hid.forEach((i, j) => { st2.map[i] = ts[j]; });
        for (let j = 0; j < nn; j++) if (j !== s) { st2.know[j] = [{ r: 1, q: 2, w: 3, c: 1 }]; if (st2.pick[j] != null) st2.pick[j] = (st2.pick[j] + 5) % 16; }
        const V2 = C.view(st2, s);
        nok(J(V) === J(V2), `숨은 것만 다른 두 장면의 view 가 달라요 (자리 ${s}, ${st.phase})`);
        const c2 = U.coach(V2, s, -1, names), c3 = U.coach(C.view(st, 'all'), s, -1, names);
        nok(J(c1) === J(c2), '선생님 글이 숨은 정보로 바뀜');
        nok(J(c1) === J(c3), '선생님 글이 다 보기 정보를 읽음');
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null|\[object/.test(J(c1)), '선생님 글 이상 ' + J(c1));
        if (need.includes(s)) {
          nok(c1.why, '내 차례인데 이유가 비었음');
          const ha = C.ai(V, s, 'hard', C.recRnd(V, s)); recN++; phases.add(st.phase);
          if (ha.t === 'pick') nok(c1.rec.startsWith(`${ha.s + 1}번 구역`), `추천 ≠ 고급 AI ${c1.rec} vs ${J(ha)}`);
          else if (ha.t === 'obs') nok(c1.rec.startsWith(U.actText(ha).split(' ')[0]) || c1.rec.includes('관측'), `추천(관측) ${c1.rec}`);
          else nok(/안 해요/.test(c1.rec), `추천(건너뛰기) ${c1.rec}`);
          const myA = C.legal(st, s)[Math.floor(r() * C.legal(st, s).length)], rv = U.review(V, s, myA, ha, {});
          nok(rv && typeof rv.sev === 'number' && isFinite(rv.sev) && !/undefined|NaN|null/.test(rv.why || ''), '복기 글 ' + J(rv));
        }
        n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = C.legal(st, seat);
      C.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    const V0 = C.view(st, 0), rs2 = U.result(V0, 0);
    nok(typeof rs2 === 'string' && /위/.test(rs2) && !/undefined|NaN/.test(rs2), '결과 html');
  }
  nok(recN > 150 && ['obs', 'pick'].every(p => phases.has(p)), `추천 시험 ${recN} · 단계 ${[...phases]}`);
  console.log(`  선생님 글 시험 ${n}번 (추천 ${recN}번)`);
})();

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'obs') {
    const skip = page.locator('[data-a=skip]');
    if (!(await skip.count())) return false;
    if (step % 3 === 0) {
      const ow = await page.evaluate(() => window.__h.view().ow);
      const q = page.locator('[data-q]'), c = await q.count();
      if (c) {
        await q.nth(step % c).click();
        if (ow < 0) await page.locator('.gx-s.go').nth(step % 16).click();
        const ob = page.locator('[data-a=obs]:not([disabled])');
        if (await ob.count()) { await ob.click(); return true; }
      }
    }
    await skip.click(); return true;
  }
  if (ph === 'pick') {
    const b = page.locator('.gx-s.go'), c = await b.count();
    if (!c) return false;
    await b.nth(step % c).click();
    const go = page.locator('[data-a=go]:not([disabled])');
    if (!(await go.count())) return false;
    await go.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('.gx-s.go[data-s="4"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('galaxy', policy, { runs: 4, ns: [4, 5, 8, 6], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

// 아케이드 첫 화면 · 은행 창 시험 (브라우저, 소리 없음): node common/test/home-ui.js
//   11-04 베니 님: 활발한 정도가 한눈에 안 들어옴 → 오늘 크게 · 막대 숫자는 오늘과 가장 많은 날만 · 게임은 가로 막대
//   11-04 베니 님: 은행 금액 조정 왜 함 → 금액 조정·사람 추가 없음, 모두 0원에서 시작해 대결로만 ±
const U = require('../../test/qa/lib/uitest');
U.main(async T => {
  await T.ctx.addInitScript(() => {
    const kst = ms => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
    const days = Array.from({ length: 7 }, (_, i) => kst(Date.now() - (6 - i) * 864e5));
    const tot = [48, 62, 258, 110, 120, 219, 100];
    const perDay = tot.map(n => ({ gostop: { a: Math.round(n * .67) }, nyang: { a: Math.round(n * .3) }, onecard: { a: n - Math.round(n * .67) - Math.round(n * .3) } }));
    window.__HOME_FIXTURE = { stats: { days, rank: { gostop: { a: { name: '규호' } } }, perDay }, presence: {} };
  });
  const p = await T.open('index.html');
  T.ok(await T.waitFor(p, () => !!document.querySelector('.act-plot')), '활발한 정도 그래프가 그려짐');
  const a = await p.evaluate(() => {
    const q = s => document.querySelector(s), bars = [...document.querySelectorAll('.act-plot button')];
    const vis = b => getComputedStyle(b.querySelector('em')).visibility === 'visible';
    return {
      big: q('.act-big b').textContent, chip: q('#pnlActN').textContent, sub: q('.act-sub').textContent.replace(/\s+/g, ' '),
      n: bars.length, heights: bars.map(b => b.querySelector('i').offsetHeight), shown: bars.map(vis),
      days: [...document.querySelectorAll('.act-days span')].map(s => s.textContent),
      games: [...document.querySelectorAll('.act-g')].map(g => [g.querySelector('span').textContent, g.querySelector('i').style.width, g.querySelector('b').textContent]),
      over: document.documentElement.scrollWidth > innerWidth,
      fits: q('.act-plot').scrollHeight <= q('.act-plot').clientHeight,
    };
  });
  T.ok(a.big === '100' && a.chip === '최근 7일', `오늘 숫자 크게 · 윗 칸은 겹치지 않게 '최근 7일' (${a.big}, ${a.chip})`);
  T.ok(/어제 219판/.test(a.sub) && /하루 평균 131판/.test(a.sub), '어제 · 하루 평균 (' + a.sub + ')');
  T.ok(a.n === 7 && a.heights[2] === 60 && a.heights[6] === Math.round(100 / 258 * 60), '막대 7개, 높이는 판 수 비례 (' + a.heights + ')');
  T.ok(a.shown.join() === 'false,false,true,false,false,false,true', '숫자는 가장 많은 날과 오늘만 (' + a.shown + ')');
  T.ok(a.days.length === 7 && a.days[6] === '오늘' && a.days.slice(0, 6).every(d => '일월화수목금토'.includes(d)), '아래는 날짜 숫자 대신 요일 (' + a.days + ')');
  T.ok(a.games.length === 3 && a.games[0][1] === '100%' && parseInt(a.games[1][1]) < 100 && a.games[0][2] === '615', '게임은 많은 순 가로 막대 (' + JSON.stringify(a.games) + ')');
  T.ok(!a.over && a.fits, '화면을 넘치지 않음');
  // 11-05: 아케이드 첫 화면도 아이폰 두 번 톡 확대 막기 (게임은 cozy 에 있음)
  const z = await p.evaluate(() => { const e = new Event('gesturestart', { cancelable: true, bubbles: true }); document.dispatchEvent(e); return { touch: getComputedStyle(document.querySelector('.capsule') || document.body).touchAction, stopped: e.defaultPrevented }; });
  T.ok(z.touch === 'manipulation' && z.stopped, '아케이드 첫 화면 확대 막이 (' + JSON.stringify(z) + ')');
  // 폰: 다른 날 막대를 누르면 그 날 숫자가 뜸
  await p.locator('.act-plot button').nth(1).tap();
  T.ok(await p.locator('.act-plot button').nth(1).locator('em').evaluate(e => getComputedStyle(e).visibility === 'visible'), '다른 날 막대를 누르면 숫자가 보임');

  // 11-05 베니 님 '오늘 71판 누가 했는지': 관리자에게만 — 막대를 누르면 그 날
  const q = await T.open('index.html', 'nohost');   // 시험 도구에선 ?mock 만 관리자, nohost = 관리자 아닌 기기
  await T.waitFor(q, () => !!document.querySelector('.act-plot'));
  T.ok(await q.evaluate(() => !document.querySelector('.act-who')), '관리자가 아니면 누가 했는지 안 보임');
  await p.bringToFront();
  T.ok(await T.waitFor(p, () => !!document.querySelector('.act-who .act-w')), '관리자에게는 누가 했는지 보임');
  await p.locator('.act-plot button').nth(6).tap();
  const who = () => p.evaluate(() => ({ h: document.querySelector('.act-who h5').textContent, rows: [...document.querySelectorAll('.act-w')].map(r => [r.querySelector('span').textContent, r.querySelector('small').textContent, r.querySelector('b').textContent]), over: document.documentElement.scrollWidth > innerWidth }));
  const w1 = await who();
  T.ok(/오늘 누가/.test(w1.h) && w1.rows.length === 1 && w1.rows[0][0] === '규호' && w1.rows[0][2] === '100판' && /맞고 67, 냥도쿠 30/.test(w1.rows[0][1]) && !w1.over, '오늘 누가 몇 판 · 게임별 (' + JSON.stringify(w1) + ')');
  await p.locator('.act-plot button').nth(2).tap();
  const w2 = await who();
  T.ok(!/오늘/.test(w2.h) && /누가/.test(w2.h) && w2.rows[0][2] === '258판', '다른 날 막대를 누르면 그 날 사람 (' + JSON.stringify(w2) + ')');

  // 은행: 모두 0원 시작, 손으로 고치는 칸이 없음
  const b = await p.evaluate(async () => {
    const out = { apiGone: !Bank.adjust && !Bank.addMember };
    await Bank.panel({});
    const box = () => document.querySelector('[data-members]');
    for (let i = 0; i < 40 && !document.querySelector('[data-settle]'); i++) await new Promise(r => setTimeout(r, 100));
    out.settle = !!document.querySelector('[data-settle]');
    out.edit = !!document.querySelector('[data-edit],[data-adj],[data-addn],[data-add]');
    out.words = /금액 조정|사람 추가/.test(document.body.innerText);
    out.note = /모두 0원에서 시작해 대결한 만큼만/.test(document.body.innerText);
    out.list = !!box();
    return out;
  });
  T.ok(b.apiGone, '은행에 금액 조정·사람 추가 함수가 없음');
  T.ok(b.settle && b.list, '은행 창이 열리고 정산 단추가 있음');
  T.ok(!b.edit && !b.words, '금액 조정·사람 추가 칸이 없음');
  T.ok(b.note, "'모두 0원에서 시작해 대결한 만큼만' 안내가 보임");
  T.ok(!T.errors.length, '페이지 오류 없음 (' + T.errors.slice(0, 2).join(' | ') + ')');
}, '첫 화면·은행');

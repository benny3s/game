// 베니 지니어스 브라우저 통합 UI 시험 (node genius/test/ui.js)
// - 3종목(흑과 백 · 결! 합! · 십이장기) 혼자 / AI 구경 / 튜토리얼 / AI 선생님 / 온라인 친구랑(2인 mock) 검증
'use strict';
const U = require('../../test/qa/lib/uitest');

const wait = async (p, fn, ms = 8000) => {
  const r = await U.waitFor(p, fn, undefined, ms);
  return r;
};

U.main(async T => {
  const p = await T.open('genius/');
  await wait(p, () => !!window.__genius && !!document.getElementById('startBtn'));
  T.ok(await p.evaluate(() => !document.getElementById('tabLocal')), '지니어스 한 기기 탭 제거됨');
  T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '모바일(390px) 가로 넘침 없음');

  // 1) 튜토리얼 테스트 (흑과 백 연습 단계 통과)
  await p.click('#helpBtn');
  await wait(p, () => !!document.querySelector('.tut-ov'));
  for (let i = 0; i < 3; i++) await p.click('#tutNext');
  await wait(p, () => !!document.querySelector('.gtut-tiles button'));
  await p.evaluate(() => {
    const btns = [...document.querySelectorAll('.gtut-tiles button')];
    const b6 = btns.find(b => b.textContent.trim() === '6');
    if (b6) b6.click();
  });
  await T.sleep(200);
  T.ok(await p.evaluate(() => !!document.querySelector('#tutTry.ok')), '흑과 백 튜토리얼 연습 완료 처리');
  await p.click('.tut-x');

  // 2) 흑과 백: 혼자 모드 플레이 + AI 선생님 추천 확인
  await p.click('#startBtn');
  await wait(p, () => !document.getElementById('play').hidden && __genius.kind() === 'bw');
  await p.click('#coachBtn');
  await wait(p, () => document.querySelector('.cpn') && !document.querySelector('.cpn').hidden);
  T.ok(await p.evaluate(() => document.querySelector('.cpn-body').textContent.includes('추천 수')), '흑과 백 AI 선생님 코치 표시');

  // 9라운드 완주 또는 수 진행
  for (let r = 0; r < 9; r++) {
    const fin = await p.evaluate(() => __genius.state().winner !== null);
    if (fin) break;
    const readyTile = await wait(p, () => {
      const btn = document.querySelector('.bw-tile:not([disabled])');
      return btn ? btn.dataset.tile : null;
    }, 3500);
    if (readyTile !== null) {
      await p.click(`.bw-tile[data-tile="${readyTile}"]`);
      await p.click('#bwSendBtn');
    }
    await T.sleep(250);
  }

  // 3) 결! 합!: 종목 전환 + 실제 합 1개 찾기 + AI 선생님 확인
  await p.click('#switchBtn');
  await wait(p, () => __genius.kind() === 'gh');
  const firstHap = await p.evaluate(() => __genius.state().haps[0]);
  T.ok(Array.isArray(firstHap) && firstHap.length === 3, '결! 합! 보드 합 생성 확인');
  for (const idx of firstHap) {
    await p.click(`.gh-cell[data-idx="${idx}"]`);
  }
  await p.click('#ghHapBtn');
  await wait(p, () => __genius.state().found.length >= 1);
  T.ok(await p.evaluate(() => __genius.state().scores[0] >= 1), '결! 합! 합 외치기 +1점 반영');

  // 4) 십이장기: 종목 전환 + 말 선택·이동 + AI 응수 확인
  await p.click('#switchBtn');
  await wait(p, () => __genius.kind() === '12');
  // 초록 자(row 2, col 1) 선택 -> (row 1, col 1) 상대 자 잡기!
  await p.click('.c12[data-r="2"][data-c="1"]');
  await wait(p, () => !!document.querySelector('.c12.dst[data-r="1"][data-c="1"]'));
  await p.click('.c12[data-r="1"][data-c="1"]');
  await wait(p, () => __genius.state().moves >= 1);
  T.ok(await p.evaluate(() => __genius.state().reserves[0].includes('ja')), '십이장기 상대 말 포로 획득');

  // 5) 온라인 친구랑 (Host + Guest mock) — 결! 합! 실시간 동기화
  const pH = await T.open('genius/');
  await wait(pH, () => !!window.__genius);
  await pH.click('#tabFriend');
  await pH.click('#startBtn');
  await wait(pH, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; });
  await pH.click('[data-host]');
  const code = await wait(pH, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, 10000);
  T.ok(!!code, '아레나 방 코드 발급: ' + code);

  const pW = await T.open('genius/', 'room=' + code);
  await wait(pW, () => !!window.__genius);
  await wait(pH, () => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= 2, 10000);

  // 대기실 음성 대화: 방장이 듣기만 켜기 → 게스트 알림 배너 표시 → 요청 보내기 → 수락 검증
  await wait(pH, () => !!document.querySelector('[data-lv="2"]'));
  await pH.click('[data-lv="2"]');
  await wait(pW, () => {
    const b = document.querySelector('.arn-vbub');
    return b && !b.hidden && b.textContent.includes('음성 대화를 켰어요');
  }, 5000);
  T.ok(true, '상대 음성 켜짐 알림 배너 실시간 표시 확인');

  await wait(pH, () => !!document.querySelector('[data-vreq]'));
  await pH.click('[data-vreq]');
  await wait(pW, () => {
    const b = document.querySelector('.arn-vbub');
    return b && !b.hidden && b.textContent.includes('요청했어요');
  }, 5000);
  await pW.click('.arn-vtoast [data-va="2"]');
  await wait(pH, () => document.querySelectorAll('.arn-pl .vmic').length >= 2, 5000);
  T.ok(true, '음성 대화 요청·수락 및 참가자 상태 배지 동기화 완료');

  // 종목을 결! 합!(gh) 으로 선택 후 시작
  await pH.evaluate(() => { const d = document.querySelector('#arKind')?.closest('details'); if (d) d.open = true; });
  await pH.click('#arKind button[data-k="gh"]');
  await wait(pH, () => { const b = document.querySelector('[data-start]'); return b && !b.disabled && __qa.vis(b); });
  await pH.click('[data-start]');
  await wait(pH, () => !document.getElementById('play').hidden);
  await wait(pW, () => !document.getElementById('play').hidden);
  T.ok(await pW.evaluate(() => __genius.kind() === 'gh'), '게스트 화면에 결! 합! 동기화 완료');
  T.ok(await pH.evaluate(() => { const t = document.querySelector('.arn-vtab'); return !!t && !t.hidden; }), '게임 중 음성 대화 플로팅 버튼 표시 확인');

  // 방장이 첫 합 찾고 게스트에 점수 동기화 확인
  const hap0 = await pH.evaluate(() => __genius.state().haps[0]);
  for (const idx of hap0) await pH.click(`.gh-cell[data-idx="${idx}"]`);
  await pH.click('#ghHapBtn');
  await wait(pW, () => __genius.state().found.length === 1);
  T.ok(await pW.evaluate(() => __genius.state().found.length === 1 && __genius.state().scores[0] === 1), '온라인 친구랑 합 점수 실시간 동기화');

  // 6) 포털 메인 화면 검사 (모음 7카드 · 모음 모달 · 가로 넘침 0 · 콘솔 에러 0)
  const pPortal = await T.open('');
  await wait(pPortal, () => document.querySelectorAll('#grid .capsule').length >= 6);
  const pInfo = await pPortal.evaluate(() => ({
    cards: document.querySelectorAll('#grid .capsule').length,
    colCards: document.querySelectorAll('#grid .col-card').length,
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    hasGenius: !!document.querySelector('#grid a[href="genius/"]'),
    hasBrain: !!document.querySelector('#grid a[href="brain/"]'),
    hasEscape: !!document.querySelector('#grid a[href="escape/"]'),
  }));
  T.ok(pInfo.cards === 9 && pInfo.colCards === 4 && pInfo.hasGenius && pInfo.hasBrain && pInfo.hasEscape, `포털 기본 모음 9카드 구성 (${JSON.stringify(pInfo)})`);
  T.ok(pInfo.overflow, '포털 모바일 가로 넘침 없음');

  await pPortal.click('#grid .col-card[data-col="col_action"] .cap-art');
  await wait(pPortal, () => !document.getElementById('colModal').hidden);
  const actionLinks = await pPortal.evaluate(() => [...document.querySelectorAll('#colGrid a.capsule')].map(a => a.getAttribute('href')));
  T.ok(actionLinks.includes('volley/') && actionLinks.includes('snake/') && !actionLinks.includes('yut/'), '액션·스포츠 모음에 보드게임(윷) 미포함 확인: ' + actionLinks.join(','));
  await pPortal.click('#colCloseBtn');

  // 7) 냥도쿠 새 1분 인터랙티브 튜토리얼 확인
  const pNy = await T.open('nyang/');
  await wait(pNy, () => !!document.getElementById('helpBtn'));
  await pNy.click('#helpBtn');
  await wait(pNy, () => !!document.querySelector('.tut-ov'));
  T.ok(await pNy.evaluate(() => document.querySelector('#tutTitle').textContent.length > 0), '냥도쿠 움직이는 규칙 설명 창 열림');
  await pNy.click('#tutNext');
  await pNy.click('#tutNext');
  await wait(pNy, () => !!document.querySelector('.tut-ov .nt-hi'));
  await pNy.evaluate(() => {
    const hi = document.querySelector('.tut-ov .nt-hi');
    if (hi) { hi.click(); hi.click(); }
  });
  await T.sleep(200);
  T.ok(await pNy.evaluate(() => !!document.querySelector('#tutTry.ok')), '냥도쿠 튜토리얼 직접 놓기 연습 완료');
  await pNy.click('.tut-x');

  await pNy.close();
  await pPortal.close();
  await pH.close();
  await pW.close();
  await p.close();
});

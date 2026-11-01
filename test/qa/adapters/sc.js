// 스타 봇 세상 어댑터 — 단추판 수준만: 페이지가 오류 없이 열리고, 화면이 넘치거나 단추가 가려지지 않는지 + 몽키
// 게임 화면은 베니 님 PC 의 OpenBW 창(benny-sc://bots/...)이라 웹에는 판이 없음. QA 서버에서는 '관리자 전용' 안내까지만.
module.exports = {
  id: 'sc',
  path: 'sc/',
  query: '',
  ready: () => !!document.getElementById('note') && !/불러오는 중/.test(document.getElementById('note').textContent),
  menu: () => true,
  home: () => location.reload(),
  modes: {},                       // 웹에서 돌릴 판 없음 (엔진 창은 PC)
  gaps: [
    '게임 판(play): 게임은 베니 님 PC 의 OpenBW 창(benny-sc://bots/...)이라 웹 QA 로는 단추판만 시험',
  ],
};

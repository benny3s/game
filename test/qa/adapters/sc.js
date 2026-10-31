// 스타 대결 어댑터 — 메뉴(들어가기 화면) 수준만: 페이지가 오류 없이 열리고, 화면이 넘치거나 단추가 가려지지 않는지 + 몽키
// 이 게임은 엔진이 '이 PC(WSL)의 127.0.0.1:8810 서버'에서만 돌고 (블리자드 파일 · 로컬 전용), 방장 화면도 그 서버가 연 페이지만 방장이 됨.
// GitHub Pages(또는 이 QA 서버)에서 열린 페이지는 '초대 링크가 있어야 들어올 수 있어요' 화면 + (관리자면) 엔진 켜기 상자까지만 → 그 이상(대기실·게임)은 못 돌림.
// 손잡이(window.__sc 같은 것)가 없어 ready 는 화면 요소로만 봄.
module.exports = {
  id: 'sc',
  path: 'sc/',
  query: '',
  ready: () => !!document.getElementById('entry') && !!document.getElementById('enterBtn') && typeof NET !== 'undefined' && !/불러오는 중/.test(document.getElementById('entryNote').textContent),
  menu: () => getComputedStyle(document.getElementById('entry')).display !== 'none',
  home: () => location.reload(),
  modes: {},                       // 한 판 돌릴 길이 없음 (엔진 서버 필요)
  gaps: [
    '게임 판(play)·친구랑(online): 엔진이 이 PC(WSL)의 127.0.0.1:8810 서버에서만 돌고 (블리자드 파일, 로컬 전용) 방장 화면도 그 서버가 연 페이지만 방장이라 QA 서버에서는 대기실·게임 화면에 못 감 — 들어가기 화면만 시험',
  ],
  onlineGap: '스타 대결 방은 PC 엔진 서버(127.0.0.1:8810)가 있는 방장 + sc/net.js(Firebase DB + WebRTC) 라서 하네스(arena-mock)로 못 돌림',
};

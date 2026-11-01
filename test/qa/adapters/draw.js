// 베니스트레이션 어댑터 — 손잡이 __draw: ses · mode · V(친구랑 화면 상태) · G(한 판) · fast · pause · setMin · startHot({names}) · autoAct · fp · probe · scribble · exportTest · rankLog
//  · autoAct() 는 사람이 하듯 진짜 단추·입력칸·포인터 이벤트로 한 가지씩 함
//  · 친구랑: 방장 화면에서 setMin(2) 로 최소 인원을 2 로 낮춰(손님 하나로 시험) → 한 판(제시어→그리기→공개→투표→결과) → ✋ 준비 → 방장 다음 판
module.exports = {
  id: 'draw',
  path: 'draw/',
  query: '',
  hookName: '__draw',
  ready: () => !!window.__draw && !!document.getElementById('home') && !!document.getElementById('startBtn'),
  menu: () => !document.getElementById('home').hidden,
  home: () => { const b = document.getElementById('backBtn'); if (b) { b.click(); b.click(); } },   // 두 번 눌러야 나감 (backGuard)
  setup: () => { __draw.fast(1); __draw.pause(false); window.__qaPause = false; },
  modes: {},                       // 11-01 한 기기 뺌 — 판은 친구랑(online) 검사로만
  probe: () => __draw.probe(),
  drive: () => { __draw.autoAct(); },
  online: {
    open: () => document.getElementById('startBtn').click(),           // 메뉴엔 '👥 친구랑 시작' 하나
    beforeHost: () => { __draw.setMin(2); },                                   // 시험: 손님 하나여도 시작
    started: () => { const s = window.__draw && __draw.ses; return !!(s && s.mode === 'online' && !document.getElementById('play').hidden && s.V); },
    setup: () => { __draw.fast(1); __draw.pause(false); window.__qaPause = false; },
    round: () => { const s = window.__draw && __draw.ses; return s && s.V ? s.V.g : -1; },
    fp: () => __draw.fp(),
    drive: () => { if (window.__qaPause) return; __draw.autoAct(); },
    pause: () => { window.__qaPause = true; __draw.pause(true); },
    resume: () => { window.__qaPause = false; __draw.pause(false); },
  },
};

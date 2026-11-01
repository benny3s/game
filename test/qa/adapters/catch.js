// 베니캐치 어댑터 — 손잡이 __catch: ses · mode · V(친구랑 화면 상태) · G(한 판) · fast · pause · setMin · startHot({names}) · autoAct · fp · probe · scribble · rankLog
//  · autoAct() 는 사람이 하듯 진짜 단추·입력칸·포인터 이벤트로 한 가지씩 함
//  · 친구랑: 방장 화면에서 setMin(2) → 한 판(고르기→그리기·채팅으로 맞히기→정답→…→결과) → ✋ 준비 → 방장 다음 판
//    방장이 맞히는 차례면 autoAct 가 60% 로 진짜 답을 채팅에 씀 (정답·점수 길까지), 손님은 틀린 말만
module.exports = {
  id: 'catch',
  path: 'catch/',
  query: '',
  hookName: '__catch',
  ready: () => !!window.__catch && !!document.getElementById('home') && !!document.getElementById('startBtn'),
  menu: () => !document.getElementById('home').hidden,
  home: () => { const b = document.getElementById('backBtn'); if (b) { b.click(); b.click(); } },   // 두 번 눌러야 나감 (backGuard)
  setup: () => { __catch.fast(1); __catch.pause(false); window.__qaPause = false; },
  modes: {},                       // 11-01 한 기기 뺌 — 판은 친구랑(online) 검사로만
  probe: () => __catch.probe(),
  drive: () => { __catch.autoAct(); },
  online: {
    open: () => document.getElementById('startBtn').click(),           // 메뉴엔 '👥 친구랑 시작' 하나
    beforeHost: () => { __catch.setMin(2); },
    started: () => { const s = window.__catch && __catch.ses; return !!(s && s.mode === 'online' && !document.getElementById('play').hidden && s.V); },
    setup: () => { __catch.fast(1); __catch.pause(false); window.__qaPause = false; },
    round: () => { const s = window.__catch && __catch.ses; return s && s.V ? s.V.g : -1; },
    fp: () => __catch.fp(),
    drive: () => { if (window.__qaPause) return; __catch.autoAct(); },
    pause: () => { window.__qaPause = true; __catch.pause(true); },
    resume: () => { window.__qaPause = false; __catch.pause(false); },
  },
};

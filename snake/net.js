/* 지렁이 대결 — 치트 감지 기록 (관리자만 읽는 snake/ac)
   · 친구랑 방·연결은 다른 게임과 같은 common/arena.js 로 옮김 (11-04): 방장 ↔ 친구 WebRTC, 안 되면 RTDB
   · snake/ac/{방 코드 또는 solo}/{uid}/client = 그 사람 기기가 본 신호 (가짜 입력·변조·주입)
                                       /host   = 게임을 계산하는 쪽(혼자·방장)이 본 내 행동 신호 (반응 속도·회피율)
                                       /peer/{친구 uid} = 방장이 본 친구의 행동 신호
     규칙이 '내 uid 자리'에만 쓰게 하므로 방장이 본 친구 신호도 방장 자리 아래에 둠 (남의 자리에 쓰는 규칙은 옛 snake/rooms 의 방장 기준이라 Arena 방에선 막힘) */
const NET = (() => {
  const db = () => (window.Arena && Arena.db ? Arena.db() : null);           // ?mock 이면 null → 기록 안 함
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  function report(roomKey, uid, part, data) { const d = db(); if (d && !Arena.GUEST) d.ref(`snake/ac/${roomKey}/${uid}/${part}`).set({ ...data, t: TS() }).catch(() => {}); }
  function watchReports(cb) { const d = db(); if (d) d.ref("snake/ac").limitToLast(30).on("value", s => cb(s.val() || {}), e => cb({ __error: e.message })); }
  function watchRooms(cb) { const d = db(); if (d) d.ref(Arena.ROOT + "snake/index").on("value", s => cb(s.val() || {})); }   // 방 목록 색인 (방 전체를 읽으면 게임 상태까지 받아서 무거움)
  function clearReports() { const d = db(); return d ? d.ref("snake/ac").remove() : Promise.resolve(); }

  return { init: () => Arena.init(), db, report, watchReports, watchRooms, clearReports, get uid() { return window.Arena ? Arena.uid : null; }, get ready() { return !!(window.Arena && Arena.ready); } };
})();

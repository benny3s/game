/* 피의 게임 목록 — shell.js 가 불러 첫 화면 카드로 그림 (형식 = survival/README.md)
   각 게임은 games/<id>/core.js · ui.js. 게임 파일을 고치면 그 줄의 v 를 올려요 (브라우저가 새 파일을 받음).
   순서 = 방송 회차 순 (시즌 칸 · 카드가 이 순서로 나옴). 출처 · 방송과 다른 점은 각 ui.js 의 src · diff. */
(window.SVList = window.SVList || []).push(
  // 시즌1
  { id: "bloodrps", prog: "blood", season: "S1", title: "배틀 가위바위보", emoji: "✌️", v: 1, short: "특수 카드로 뒤집는 숨겨 내기 가위바위보" },
  // 시즌2
  { id: "ascend", prog: "blood", season: "S2", title: "오름차순", emoji: "📈", v: 1, short: "숫자를 오름차순으로 길게 이어요" },
  { id: "colorturn", prog: "blood", season: "S2", title: "컬러턴", emoji: "🎨", v: 2, short: "숨은 지뢰 위의 칩 4목 1:1" },
  { id: "numchange", prog: "blood", season: "S2", title: "넘버 체인지", emoji: "🔢", v: 1, short: "합이 큰 쪽이 점수, 큰 블록은 서로 바뀌어요" },
  { id: "ascbattle", prog: "blood", season: "S2", title: "배틀 오름차순", emoji: "⚔️", v: 1, short: "둘이 겨뤄 오름차순을 더 길게 이어요" },
  { id: "numauction", prog: "blood", season: "S2", title: "숫자 경매", emoji: "🔨", v: 1, short: "블록으로 카드를 사는 3~6명 경매" },
  // 시즌3
  { id: "blindbet", prog: "blood", season: "S3", title: "블라인드 베팅", emoji: "🎴", v: 1, short: "남의 카드만 보고 베팅하는 1:1 승부" },
  { id: "mazesum", prog: "blood", season: "S3", title: "수식미로", emoji: "🧭", v: 1, short: "숫자판을 외우고 합이 맞는 길을 찾는 기억 미로" },
  // 시즌X
  { id: "hilo", prog: "blood", season: "SX", title: "하이 앤 로우", emoji: "🃏", v: 1, short: "숨겨 낸 숫자로 점수 카드를 가져가요" },
  { id: "choicehold", prog: "blood", season: "SX", title: "초이스 홀덤", emoji: "♠️", v: 1, short: "카드를 골라 가져가는 1:1 홀덤" },
  { id: "cardchess", prog: "blood", season: "SX", title: "카드 체스", emoji: "♟️", v: 2, short: "카드가 움직임을 정하는 5×5 1:1" }
);

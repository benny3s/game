/* 피의 게임 목록 — shell.js 가 불러 첫 화면 카드로 그림 (형식 = survival/README.md)
   각 게임은 games/<id>/core.js · ui.js. 게임 파일을 고치면 그 줄의 v 를 올려요 (브라우저가 새 파일을 받음).
   순서 = 방송 회차 순 (시즌 칸 · 카드가 이 순서로 나옴). 출처 · 방송과 다른 점은 각 ui.js 의 src · diff. */
(window.SVList = window.SVList || []).push(
  // 시즌1
  { id: "bloodrps", prog: "blood", season: "S1", title: "배틀 가위바위보", emoji: "✌️", v: 3, short: "특수 카드로 뒤집는 숨겨 내기 가위바위보" },
  // 시즌2
  { id: "ascend", prog: "blood", season: "S2", title: "오름차순", emoji: "📈", v: 3, short: "숫자를 오름차순으로 길게 이어요" },
  { id: "colorturn", prog: "blood", season: "S2", title: "컬러턴", emoji: "🎨", v: 4, short: "숨은 지뢰 위의 칩 4목 1:1" },
  { id: "numchange", prog: "blood", season: "S2", title: "넘버 체인지", emoji: "🔢", v: 3, short: "합이 큰 쪽이 점수, 큰 블록은 서로 바뀌어요" },
  { id: "ascbattle", prog: "blood", season: "S2", title: "배틀 오름차순", emoji: "⚔️", v: 3, short: "둘이 겨뤄 오름차순을 더 길게 이어요" },
  { id: "numauction", prog: "blood", season: "S2", title: "숫자 경매", emoji: "🔨", v: 3, short: "블록으로 카드를 사는 3~6명 경매" },
  // 시즌3
  { id: "blindbet", prog: "blood", season: "S3", title: "블라인드 베팅", emoji: "🎴", v: 3, short: "남의 카드만 보고 베팅하는 1:1 승부" },
  { id: "mazesum", prog: "blood", season: "S3", title: "수식미로", emoji: "🧭", v: 3, short: "숫자판을 외우고 합이 맞는 길을 찾는 기억 미로" },
  { id: "pyramid", prog: "blood", season: "S3", title: "피라미드 넘버", emoji: "🔺", v: 1, short: "숫자 3개로 피라미드 속 목표 숫자를 만드는 두뇌 대결" },
  // 시즌X
  { id: "hilo", prog: "blood", season: "SX", title: "하이 앤 로우", emoji: "🃏", v: 3, short: "숨겨 낸 숫자로 점수 카드를 가져가요" },
  { id: "choicehold", prog: "blood", season: "SX", title: "초이스 홀덤", emoji: "♠️", v: 3, short: "카드를 골라 가져가는 1:1 홀덤" },
  { id: "cardchess", prog: "blood", season: "SX", title: "카드 체스", emoji: "♟️", v: 4, short: "카드가 움직임을 정하는 5×5 1:1" },
  { id: "omok3", prog: "blood", season: "SX", title: "3층 오목", emoji: "🔴", v: 1, short: "돌을 3층까지 쌓는 육각 판 오목 — 5개 일직선 · 3층 5개 · 이웃 3층 3개, 1:1 3판 2선승",
    src: "피의 게임 X 4화 데스매치 (1:1) · 확인 영상: 웨이브 '[피의 게임X] 현성주가 던진 미끼를 물어버렸다? 운명을 건 데스매치' 4화 하이라이트 (규칙 설명 화면 · 경기 장면)",
    diff: "방송 화면 그대로: 육각 격자 판(선이 만나는 점 85칸), 돌 25개씩, 기본 배치 선 1 → 후 2 → 선 2 → 후 1(정중앙 · 내 돌 이웃 칸 금지), 한 턴에 놓기 또는 옮기기(올라타기, 3층까지, 원래 칸보다 높은 칸으로는 못 감), 승리 = 오목(정확히 5개, 6개 이상은 안 됨) · 내 돌 5개가 3층 · 이웃한 내 돌 3개가 3층, 동시에 이루면 그 턴을 둔 사람 승, 2라운드부터 진 쪽이 선후공을 정함. 우리가 정한 것: 3판 2선승(방송은 2라운드까지 보임) · 무승부 판은 다시 함(3판 2선승은 최대 5판 · 단판은 최대 3판) · 턴 제한시간 없음(방송은 30초 경고가 나옴) · 움직일 돌이 하나도 없으면 그 판은 짐 · 150수가 지나도 못 가리면 무승부 · 판 모양(85칸)은 영상 화면의 선 · 점을 세어서 정함 · 1판 선공은 무작위." }
);

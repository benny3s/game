/* 베니 서바이벌 · 더 지니어스 목록 (더 지니어스 담당 일꾼 파일 — 게임을 하나 올릴 때마다 한 줄 추가, 그 게임 파일이 바뀌면 v 를 올림)
   '방송과 다른 점(diff)' 은 각 games/<id>/ui.js 의 diff 를 그대로 써요 (여기엔 안 적음). link 가 있는 카드는 기존 베니 지니어스(../genius/)로 이동만 해요. */
(window.SVList = window.SVList || []).push(
  // ── 시즌 1 게임의 법칙 ──
  { id: "gn-indian", prog: "genius", season: "S1", seasonName: "게임의 법칙", title: "인디언 포커", emoji: "🪪", v: 2,
    short: "상대 카드만 보이는 1:1 베팅",
    src: "더 지니어스 시즌 1 인디언 포커 · 6·7·9화 데스매치 · 12화 결승 1회전" },
  { id: "gn-openpass", prog: "genius", season: "S1", seasonName: "게임의 법칙", title: "오픈, 패스", emoji: "🔓", v: 1,
    short: "뒷면 카드를 열거나 넘기며 10칸 수식 만들기",
    src: "더 지니어스 시즌 1 오픈, 패스 · 7화 메인 매치" },
  { id: "gn-link-gyeolhap", prog: "genius", season: "S1", seasonName: "게임의 법칙", title: "결! 합!", emoji: "🔷", link: "../genius/",
    short: "3가지 속성 조합 · 게임 고르기 화면이 열려요",
    src: "더 지니어스 시즌 1 결! 합! · 12화 결승 2회전 (베니 지니어스 모음에서 하기)" },

  // ── 시즌 2 룰 브레이커 ──
  { id: "gn-sunmoon", prog: "genius", season: "S2", seasonName: "룰 브레이커", title: "해 달 별", emoji: "🌓", v: 1,
    short: "정답 칸에 칩을 걸어 3배",
    src: "더 지니어스 시즌 2 해 달 별 · 2화 · 4화" },
  { id: "gn-quattro", prog: "genius", season: "S2", seasonName: "룰 브레이커", title: "콰트로", emoji: "🃏", v: 1,
    short: "색도 숫자도 다른 4장을 먼저 모아요 · 관전 플레이어와 카드 교환",
    src: "더 지니어스 시즌 2 콰트로 · 1화 · 12화 결승 3회전" },
  { id: "gn-holdem", prog: "genius", season: "S2", seasonName: "룰 브레이커", title: "인디언 홀덤", emoji: "🃏", v: 2,
    short: "공유카드 2장 · 상대 카드만 보이는 1:1 베팅",
    src: "더 지니어스 시즌 2 인디언 홀덤 · 7·10화 데스매치 · 12화 결승 1회전" },
  { id: "gn-truth", prog: "genius", season: "S2", seasonName: "룰 브레이커", title: "진실탐지기", emoji: "🔔", v: 1,
    short: "거짓말로 답하는 질문 게임 · 상대 4자리를 먼저 맞혀요",
    src: "더 지니어스 시즌 2 진실탐지기 · 12화 결승 2회전" },
  { id: "gn-link-blackwhite", prog: "genius", season: "S2", seasonName: "룰 브레이커", title: "흑과 백", emoji: "⬛", link: "../genius/",
    short: "색만 보이는 9라운드 · 게임 고르기 화면이 열려요",
    src: "더 지니어스 시즌 2 흑과 백 · 9화 · 11화 (베니 지니어스 모음에서 하기)" },

  // ── 시즌 3 블랙가넷 (양면포커 · 베팅 가위바위보는 시즌 4 그랜드 파이널에도 나와요 — 판 선택에서 골라요) ──
  { id: "gn-fruit", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "과일가게", emoji: "🍎", v: 1,
    short: "과일마다 가장 싼 값을 낸 사람이 독식해요 · 4라운드 수입 대결",
    src: "더 지니어스 시즌 3 과일가게 · 1화 메인 매치" },
  { id: "gn-twoface", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "양면포커", emoji: "🃏", v: 2,
    short: "앞뒤가 다른 카드 · 면을 골라 겨루는 1:1 베팅",
    src: "더 지니어스 시즌 3 양면포커 · 4·5화 · 시즌 4 그랜드 파이널 10화" },
  { id: "gn-betrps", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "베팅 가위바위보", emoji: "✌️", v: 2,
    short: "증인의 표식 · 승부 또는 베팅 · 1:1 심리전",
    src: "더 지니어스 시즌 3 베팅 가위바위보 · 2화 · 6화 · 시즌 4 그랜드 파이널 3화" },
  { id: "gn-stars", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "별자리 게임", emoji: "🌟", v: 2,
    short: "카드로 별을 가져가요 · 같은 숫자는 제외 · 폭탄은 피해요",
    src: "더 지니어스 시즌 3 별자리 게임 · 7화 메인 매치" },
  { id: "gn-invest", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "투자와 기부", emoji: "💰", v: 1,
    short: "대주주는 노리고 수전노는 피해요 · 9라운드 동안 돈을 나눠 써요",
    src: "더 지니어스 시즌 3 투자와 기부 · 8화 메인 매치" },
  { id: "gn-miner", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "광부 게임", emoji: "⛏️", v: 1,
    short: "광부는 광물을 캐고 제시자는 점수를 비밀로 불러요 · 9명 3조",
    src: "더 지니어스 시즌 3 광부 게임 · 5화 메인 매치" },
  { id: "gn-link-twelve", prog: "genius", season: "S3", seasonName: "블랙가넷", title: "십이장기", emoji: "🦁", link: "../genius/",
    short: "포로 · 승급 · 입성 · 게임 고르기 화면이 열려요",
    src: "더 지니어스 시즌 3 십이장기 · 7화 · 12화 결승 (베니 지니어스 모음에서 하기)" },

  // ── 시즌 4 그랜드 파이널 ──
  { id: "gn-howmuch", prog: "genius", season: "S4", seasonName: "그랜드 파이널", title: "하우머치", emoji: "🛒", v: 1,
    short: "손님 5명의 최고가를 넘지 않게 · 가격 맞히기",
    src: "더 지니어스 시즌 4 그랜드 파이널 하우머치 · 11화 메인 매치" }
);

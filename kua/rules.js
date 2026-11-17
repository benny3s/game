/* 베니 크아 — 원작 수치 · 캐릭터 · 아이템 규칙 상수 (kua/rules.js)
   · Node · 브라우저 공용 (UMD)
   · 근거 표: agent-hub/docs/kua-research.md (KR00967 census.json · VBNB_116 실측 · 나무위키 교차 검증)
   · 모든 타이밍/속도/드랍 수치는 이 파일 한 곳에 모아 1줄로 튜닝 가능하게 유지 */
((root, factory) => {
  const mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.KuaRules = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const GRID = {
    COLS: 15,
    ROWS: 13,
    TILE_PX: 40,
    HALF_BOX_PX: 13,        // 캐릭터 충돌 반폭 (R-107)
    CORNER_ASSIST_PX: 14,   // 모서리 걸치기 자동 미끄러짐 허용 폭 (고속 튜닝)
    TOUCH_DIST_PX: 28,      // 갇힘 구출 / 처치 판정 거리 (R-108)
    FLAME_HIT_PX: 24,       // 물줄기 피격 판정 (중심 기준 ±24px)
  };

  const TIMING = {
    TICK_HZ: 60,            // 60Hz 부드러운 PC 아케이드 프레임 및 즉각 응답
    FUSE_MS: 2600,          // 물풍선 폭발 지연 (R-103: ~2.5~2.6초 — 원작 영상 정밀 검증 시 여기만 수정)
    FLAME_MS: 540,          // 물줄기 지속 시간 (VBNB_116 실측 531~562ms, R-156)
    TRAP_DEATH_MS: 6350,    // 물방울 갇힘 -> 사망 시간 (VBNB_116 실측 6332~6355ms, R-159)
    TRAPPED_SPEED_PX: 17,   // 갇힘 상태 기어가기 속도 px/s (VBNB_116 실측 17 px/s, R-161)
    SPEED_PX_PER_LV: 35.0,  // 속도 1단계당 px/s (lv.5 = 175px/s ≈ 4.38칸/초, lv.9 = 315px/s ≈ 7.88칸/초)
    RESCUE_INVULN_MS: 900,  // 구출/바늘 탈출 직후 짧은 무적 보호
    KICK_SPEED_PX: 340,     // 신발/붉은악마 물풍선 차기 속도 px/s
    GLOVE_THROW_TILES: 4,   // 장갑 던지기 비행 칸 수
    THROW_AIR_MS: 260,      // 장갑 던지기 체공 시간
    PUSH_HOLD_MS: 160,      // 밀 수 있는 블록(M) 밀기 홀드 시간
    DEVIL_MS: 7000,         // 마귀(방향 반전) 지속 시간
    MATCH_MS: 180000,       // 기본 경기 제한 시간 (3분)
    WARMUP_MS: 800,         // 라운드 시작 카운트다운 연출
    AIRPLANE_FIRST_MS: 22000, // 아이템 비행기 첫 출격 시각
    AIRPLANE_EVERY_MS: 25000, // 이후 비행기 주기
  };

  // KR00967 Client CharacterTable (census.json C00..C07, C14) 기반 캐릭터 9종
  const CHARS = {
    dao: {
      id: "dao", name: "다오", code: "C00",
      bombs: 1, maxBombs: 10, power: 1, maxPower: 7, speed: 5, maxSpeed: 7,
      color: "#2563eb", trim: "#facc15", skinTone: "#fde68a",
      desc: "물풍선 최대 10개의 대표 균형형 (최고 속도 7)",
    },
    bazzi: {
      id: "bazzi", name: "배찌", code: "C06",
      bombs: 1, maxBombs: 6, power: 1, maxPower: 7, speed: 5, maxSpeed: 9,
      color: "#ef4444", trim: "#ffffff", skinTone: "#fef3c7",
      desc: "최고 속도 9! 압도적 기동력의 스피드형",
    },
    dizni: {
      id: "dizni", name: "디지니", code: "C01",
      bombs: 2, maxBombs: 7, power: 1, maxPower: 9, speed: 4, maxSpeed: 8,
      color: "#eab308", trim: "#38bdf8", skinTone: "#fef2f2",
      desc: "시작 풍선 2개 · 물줄기 최대 9칸 장거리형",
    },
    marid: {
      id: "marid", name: "마리드", code: "C04",
      bombs: 2, maxBombs: 9, power: 1, maxPower: 6, speed: 4, maxSpeed: 8,
      color: "#ec4899", trim: "#fbcfe8", skinTone: "#fef3c7",
      desc: "시작 풍선 2개 · 최대 9개 초반 압박형",
    },
    uni: {
      id: "uni", name: "우니", code: "C02",
      bombs: 1, maxBombs: 6, power: 2, maxPower: 7, speed: 5, maxSpeed: 8,
      color: "#4ade80", trim: "#facc15", skinTone: "#fef9c3",
      desc: "기본 물줄기 2 · 속도 5로 빠른 초반 파밍",
    },
    kepi: {
      id: "kepi", name: "케피", code: "C07",
      bombs: 1, maxBombs: 9, power: 2, maxPower: 8, speed: 4, maxSpeed: 8,
      color: "#9333ea", trim: "#d8b4fe", skinTone: "#ffedd5",
      desc: "기본 물줄기 2 · 후반 9/8/8 올라운더",
    },
    ethi: {
      id: "ethi", name: "에띠", code: "C05",
      bombs: 1, maxBombs: 10, power: 1, maxPower: 8, speed: 4, maxSpeed: 8,
      color: "#65a30d", trim: "#1e293b", skinTone: "#fef3c7",
      desc: "물풍선 10 · 물줄기 8 · 속도 8 대기만성형",
    },
    mos: {
      id: "mos", name: "모스", code: "C03",
      bombs: 1, maxBombs: 8, power: 1, maxPower: 5, speed: 5, maxSpeed: 8,
      color: "#f59e0b", trim: "#fef08a", skinTone: "#fef3c7",
      desc: "초기 속도 5의 경쾌한 근접 교전형",
    },
    rodumani: {
      id: "rodumani", name: "로두마니", code: "C14",
      bombs: 3, maxBombs: 9, power: 3, maxPower: 7, speed: 6, maxSpeed: 9,
      trapDeathMs: 4200, // 원작 디메리트: 물방울에 갇히면 다른 캐릭터보다 빨리 터짐
      color: "#111827", trim: "#dc2626", skinTone: "#fde68a",
      desc: "초기 3/3/6 최강 해적! 단 물방울에 갇히면 더 빨리 터짐",
    },
  };
  const CHAR_ORDER = ["dao", "bazzi", "dizni", "marid", "uni", "kepi", "ethi", "mos", "rodumani"];

  const ITEMS = {
    bomb:        { id: "bomb",        name: "물풍선",     icon: "🎈", desc: "동시 설치 개수 +1",        good: true },
    fluid:       { id: "fluid",       name: "물약",       icon: "🧪", desc: "물줄기 길이 +1칸",         good: true },
    ultra:       { id: "ultra",       name: "울트라 물약", icon: "💠", desc: "물줄기 길이 즉시 최대!",   good: true },
    roller:      { id: "roller",      name: "롤러",       icon: "🛼", desc: "이동 속도 +1단계",          good: true },
    red_devil:   { id: "red_devil",   name: "붉은 악마",   icon: "😈", desc: "속도 즉시 최대 + 풍선 차기", good: true },
    shoe:        { id: "shoe",        name: "신발",       icon: "👟", desc: "물풍선 밀어 차기(킥)",     good: true },
    glove:       { id: "glove",       name: "장갑",       icon: "🥊", desc: "물풍선 위에서 Space로 던지기", good: true },
    needle:      { id: "needle",      name: "바늘",       icon: "🪡", desc: "갇혔을 때 Ctrl로 즉시 탈출", good: true },
    green_devil: { id: "green_devil", name: "초록 악마",   icon: "🤢", desc: "능력치 1단계 하락·아이템 배출", good: false },
    devil:       { id: "devil",       name: "마귀",       icon: "👾", desc: "7초 동안 이동 방향 반전!",   good: false },
  };

  // 블록 파괴 시 드랍 확률 및 가중치 (R-051 기본 3종 비중 우선 + 특수/함정 혼합)
  const DROP_CHANCE = 0.42;
  const DROP_WEIGHTS = [
    ["bomb", 340],
    ["fluid", 280],
    ["roller", 220],
    ["needle", 70],
    ["shoe", 55],
    ["ultra", 35],
    ["red_devil", 28],
    ["glove", 28],
    ["devil", 24],
    ["green_devil", 20],
  ];

  const TEAM_COLORS = [
    { id: 0, name: "블루팀", bg: "#2563eb", light: "#93c5fd" },
    { id: 1, name: "레드팀", bg: "#dc2626", light: "#fca5a5" },
  ];

  function speedPxPerSec(lv) {
    return Math.max(1, lv) * TIMING.SPEED_PX_PER_LV;
  }

  return {
    GRID,
    TIMING,
    CHARS,
    CHAR_ORDER,
    ITEMS,
    DROP_CHANCE,
    DROP_WEIGHTS,
    TEAM_COLORS,
    speedPxPerSec,
  };
});

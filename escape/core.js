/* 비밀 서재 탈출 코어 (escape/core.js) — Node · 브라우저 공용 (UMD)
   · 에피소드 1호: "사라진 시계공의 비밀 서재" (1인 정통 방탈출)
   · 4면(N/E/S/W) 탐색 · 인벤토리 선택/조합 · 시계/책장/자물쇠/UV 단서 · 3단계 상태 인지 힌트 */
((root, factory) => {
  const mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.EscapeCore = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const WALLS = ["N", "E", "S", "W"];
  const WALL_NAMES = { N: "북쪽 · 출구와 시계", E: "동쪽 · 서재 책장", S: "남쪽 · 시계공의 책상", W: "서쪽 · 비밀 액자와 바닥" };
  const BOOK_TARGET = ["red", "gold", "green", "blue"];
  const BOOK_NAMES = { red: "빨강", gold: "금색", green: "초록", blue: "파랑" };

  const ITEMS = {
    silver_key:  { id: "silver_key",  name: "작은 은열쇠",   icon: "🗝️", desc: "책상 위에서 주운 가느다란 은열쇠. 어딘가의 작은 서랍에 맞을 것 같다." },
    magnet:      { id: "magnet",      name: "강력 자석",     icon: "🧲", desc: "작지만 묵직한 쇠붙이도 끌어당기는 U자형 자석." },
    uv_off:      { id: "uv_off",      name: "빈 UV 손전등",  icon: "🔦", desc: "보라색 자외선 램프가 달린 특수 손전등. 하지만 건전지가 빠져 켜지지 않는다." },
    battery:     { id: "battery",     name: "수은 건전지",   icon: "🔋", desc: "손전등이나 작은 시계 장치에 들어가는 원형 건전지." },
    uv_on:       { id: "uv_on",       name: "켜진 UV 손전등",icon: "🟣", desc: "보라빛 자외선을 내뿜는다! 어두운 판이나 벽면의 숨은 형광 글씨를 비춰 볼 수 있다." },
    pendulum:    { id: "pendulum",    name: "황금 시계추",   icon: "🕰️", desc: "아름답게 세공된 황동 시계추. 멈춰 있는 괘종시계에 걸 수 있을 듯하다." },
    thread:      { id: "thread",      name: "명주실",        icon: "🧵", desc: "가늘고 질긴 긴 실타래. 무언가를 묶어 깊은 곳에서 건져 올릴 수 있다." },
    magnet_line: { id: "magnet_line", name: "자석 낚싯줄",   icon: "🎣", desc: "명주실 끝에 자석을 단단히 묶었다. 손이 닿지 않는 쇠붙이를 건져낼 수 있다!" },
    driver:      { id: "driver",      name: "일자 드라이버", icon: "🪛", desc: "날이 단단한 정밀 드라이버. 벽 장식이나 액자의 나사를 풀 수 있다." },
    master_key:  { id: "master_key",  name: "서재 마스터 키",icon: "🔑", desc: "출구 문 상단 열쇠 구멍에 딱 맞는 묵직한 황동 열쇠." },
    seal:        { id: "seal",        name: "황동 인장 메달",icon: "🪙", desc: "출구 문 한가운데 원형 홈에 끼우는 시계공의 인장." },
  };

  function initialState(now = Date.now()) {
    return {
      wall: "S",
      inv: [],
      selected: null,
      zoom: null,
      flags: {
        silverPicked: false,
        diaryRead: false,
        drawerOpen: false,
        shelfOpen: false,
        clockFixed: false,
        boxOpen: false,
        uvClueSeen: false,
        frameOpen: false,
        safeOpen: false,
        grateFished: false,
        doorKeyDone: false,
        doorSealDone: false,
        escaped: false,
      },
      bookSeq: [],
      seenHints: [],
      hintsUsed: 0,
      moves: 0,
      elapsedMs: 0,
      startedAt: now,
      finishedAt: 0,
    };
  }

  const clone = (st) => JSON.parse(JSON.stringify(st));
  function addInv(st, id) { if (!st.inv.includes(id)) st.inv.push(id); }
  function remInv(st, id) {
    st.inv = st.inv.filter(x => x !== id);
    if (st.selected === id) st.selected = null;
  }

  function stepResult(state, ok, msg, sfx = "tap", extra = {}) {
    return { state, ok, msg, sfx, ...extra };
  }

  function turnWall(state, dir) {
    const st = clone(state);
    if (typeof dir === "string" && WALLS.includes(dir)) st.wall = dir;
    else {
      const i = WALLS.indexOf(st.wall);
      st.wall = WALLS[(i + (dir < 0 ? 3 : 1)) % 4];
    }
    st.zoom = null;
    return stepResult(st, true, WALL_NAMES[st.wall], "whoosh");
  }

  function selectItem(state, id) {
    const st = clone(state);
    if (!id || st.selected === id) {
      st.selected = null;
      return stepResult(st, true, "손을 비웠습니다.", "tap");
    }
    if (!st.inv.includes(id)) return stepResult(st, false, "가지고 있지 않은 물건입니다.", "err");
    st.selected = id;
    return stepResult(st, true, `${ITEMS[id].icon} ${ITEMS[id].name} 선택 — 화면의 알맞은 곳에 사용해 보세요.`, "tap");
  }

  // 두 아이템 조합 (인벤토리 화면에서 조합 모드 or 합치기)
  function combineItems(state, idA, idB) {
    if (!idA || !idB || idA === idB) return stepResult(clone(state), false, "서로 다른 두 물건을 골라 주세요.", "err");
    const st = clone(state);
    if (!st.inv.includes(idA) || !st.inv.includes(idB)) return stepResult(st, false, "가방에 없는 물건입니다.", "err");
    const pair = [idA, idB].sort().join("+");
    if (pair === "battery+uv_off") {
      remInv(st, "uv_off"); remInv(st, "battery");
      addInv(st, "uv_on"); st.selected = "uv_on"; st.moves++;
      return stepResult(st, true, "✨ 수은 건전지를 끼우자 보라색 UV 손전등이 환하게 켜졌다!", "combine", { acquired: ["uv_on"] });
    }
    if (pair === "magnet+thread") {
      remInv(st, "magnet"); remInv(st, "thread");
      addInv(st, "magnet_line"); st.selected = "magnet_line"; st.moves++;
      return stepResult(st, true, "✨ 명주실 끝에 자석을 단단히 묶어 '자석 낚싯줄'을 만들었다!", "combine", { acquired: ["magnet_line"] });
    }
    if (pair === "master_key+seal") {
      return stepResult(st, false, "서로 합치는 게 아니라 북쪽 출구 문의 열쇠 구멍과 중앙 홈에 각각 끼워야 합니다.", "err");
    }
    return stepResult(st, false, "이 두 물건은 서로 합칠 수 없을 것 같다.", "err");
  }

  function inspectSpot(state, spotId) {
    const st = clone(state);
    const f = st.flags;
    st.moves++;

    switch (spotId) {
      // ── 남쪽 (책상) ──
      case "lamp":
        return stepResult(st, true, "초록 갓이 씌워진 황동 스탠드. 따뜻한 불빛이 책상 위 종이를 비추고 있다.", "tap");
      case "silver_spot":
        if (f.silverPicked) return stepResult(st, true, "은열쇠가 놓여 있던 자리다.", "tap");
        f.silverPicked = true;
        addInv(st, "silver_key");
        return stepResult(st, true, "🗝️ 종이 옆에서 '작은 은열쇠'를 주웠다! 아래 가방에서 선택해 사용해 보세요.", "pickup", { acquired: ["silver_key"] });
      case "diary":
        f.diaryRead = true;
        st.zoom = "diary";
        return stepResult(st, true, "시계공 할아버지의 일지를 펼쳐 보았다.", "paper");
      case "drawer":
        if (f.drawerOpen) return stepResult(st, true, "이미 열어 본 서랍. 안은 비어 있다.", "tap");
        if (st.selected !== "silver_key") {
          return stepResult(st, false, "오른쪽 서랍이 단단히 잠겨 있다. 가느다란 열쇠가 필요해 보인다.", "lock");
        }
        f.drawerOpen = true;
        remInv(st, "silver_key");
        addInv(st, "magnet");
        addInv(st, "uv_off");
        return stepResult(st, true, "🔓 은열쇠로 서랍을 열었다! 안에서 '강력 자석'과 '빈 UV 손전등'을 얻었다.", "unlock", { acquired: ["magnet", "uv_off"] });
      case "box":
        if (f.boxOpen) return stepResult(st, true, "이미 열려 있는 4자리 다이얼 상자. 드라이버를 꺼냈던 곳이다.", "tap");
        st.zoom = "box";
        return stepResult(st, true, "나무 상자에 4자리 숫자 다이얼 자물쇠가 걸려 있다.", "tap");

      // ── 동쪽 (책장 · 슬레이트) ──
      case "bookshelf":
        if (f.shelfOpen) {
          return stepResult(st, true, "비밀 칸이 열려 있는 고서적 책장이다. 안에는 더 이상 아무것도 없다.", "tap");
        }
        st.zoom = "bookshelf";
        return stepResult(st, true, "가죽 양장본들이 꽂혀 있는 고서적 책장이다. 몇 권의 책등이 유난히 닳아 있다.", "tap");
      case "candle":
        return stepResult(st, true, "반쯤 탄 양초가 놓인 촛대. 벽 위 어두운 석판 바로 아래에 놓여 있다.", "tap");
      case "slate":
        if (st.selected === "uv_on") {
          const firstReveal = !f.uvClueSeen;
          f.uvClueSeen = true;
          if (!firstReveal) st.zoom = "slate";
          return stepResult(st, true, "🟣 보라빛 UV 불빛을 비추자 석판 위에 숨어 있던 형광 기호 '☾ 3 · ★ 7 · ☀ 9'가 떠올랐다!", "magic");
        }
        if (f.uvClueSeen) {
          st.zoom = "slate";
          return stepResult(st, true, "형광 기호 '☾ = 3, ★ = 7, ☀ = 9'가 어둡게 빛나고 있다.", "tap");
        }
        return stepResult(st, true, "차가운 검은 석판이다. 손으로 만져 보아도 맨질맨질할 뿐 아무 글씨도 보이지 않는다.", "tap");

      // ── 북쪽 (괘종시계 · 출구 문) ──
      case "clock":
        if (f.clockFixed) {
          st.zoom = "clock";
          return stepResult(st, true, "괘종시계가 03:45를 가리킨 채 느리게 째깍이고 있다.", "clock");
        }
        if (st.selected === "pendulum") {
          f.clockFixed = true;
          remInv(st, "pendulum");
          addInv(st, "thread");
          return stepResult(st, true, "🕰️ 황금 시계추를 걸자 괘종시계가 3시 45분에서 종을 울리고, 하단 함에서 '명주실'이 떨어졌다!", "clock", { acquired: ["thread"] });
        }
        return stepResult(st, false, "커다란 호두나무 괘종시계다. 유리문 안쪽 시계추 고리가 비어 시곗바늘이 멈춰 서 있다.", "lock");
      case "door":
        return useOnDoor(st, st.selected);

      // ── 서쪽 (액자 · 금고 · 바닥 환풍구) ──
      case "frame":
        if (!f.frameOpen) {
          if (st.selected === "driver") {
            f.frameOpen = true;
            remInv(st, "driver");
            st.zoom = "safe";
            return stepResult(st, true, "🪛 드라이버로 액자 네 귀퉁이 나사를 풀자 액자 뒤에 숨겨진 벽 금고가 나타났다!", "unlock");
          }
          return stepResult(st, false, "벽에 아주 단단히 고정된 금테 액자. 네 모서리에 나사가 박혀 있어 공구가 필요하다.", "lock");
        }
        if (f.safeOpen) return stepResult(st, true, "이미 열려 있는 벽 금고. 황동 인장 메달을 꺼냈던 곳이다.", "tap");
        st.zoom = "safe";
        return stepResult(st, true, "기호(☾ · ★ · ☀) 3자리 다이얼이 달린 숨은 벽 금고다.", "tap");

      case "grate":
        if (f.grateFished) return stepResult(st, true, "깊은 환풍구 아래. 이미 마스터 키를 건져 올렸다.", "tap");
        if (st.selected === "magnet_line") {
          f.grateFished = true;
          remInv(st, "magnet_line");
          addInv(st, "master_key");
          return stepResult(st, true, "🎣 철창 사이로 자석 낚싯줄을 내리자 철컥! '서재 마스터 키'가 올라왔다!", "pickup", { acquired: ["master_key"] });
        }
        return stepResult(st, false, "바닥 환풍구 철창 깊숙한 곳에 반짝이는 쇠 열쇠가 떨어져 있다! 하지만 손가락이 닿지 않는다.", "lock");

      default:
        return stepResult(st, false, "특별한 단서가 보이지 않는다.", "tap");
    }
  }

  function pressBook(state, color) {
    const st = clone(state);
    if (st.flags.shelfOpen) return stepResult(st, true, "이미 책장의 비밀 칸이 열려 있습니다.", "tap");
    if (!BOOK_TARGET.includes(color)) return stepResult(st, false, "잘못된 책입니다.", "err");
    const nextIdx = st.bookSeq.length;
    if (BOOK_TARGET[nextIdx] !== color) {
      st.bookSeq = [];
      st.moves++;
      return stepResult(st, false, `책을 눌렀지만 제자리로 튕겨 나왔다. 순서가 틀린 것 같다 (일지 단서를 다시 보자).`, "err");
    }
    st.bookSeq.push(color);
    st.moves++;
    if (st.bookSeq.length === BOOK_TARGET.length) {
      st.flags.shelfOpen = true;
      addInv(st, "pendulum");
      addInv(st, "battery");
      st.zoom = null;
      return stepResult(st, true, "🔓 철컥! 책장 뒷판이 열리며 '황금 시계추'와 '수은 건전지'를 발견했다!", "unlock", { acquired: ["pendulum", "battery"] });
    }
    return stepResult(st, true, `${BOOK_NAMES[color]} 책이 안쪽으로 딸깍 들어갔다 (${st.bookSeq.length}/4).`, "click");
  }

  function submitBoxCode(state, code) {
    const st = clone(state);
    const norm = String(code || "").replace(/\D/g, "");
    st.moves++;
    if (st.flags.boxOpen) return stepResult(st, true, "이미 상자가 열려 있습니다.", "tap");
    if (norm === "0345") {
      st.flags.boxOpen = true;
      addInv(st, "driver");
      st.zoom = null;
      return stepResult(st, true, "🔓 0345! 나무 상자가 열리며 '일자 드라이버'를 얻었다!", "unlock", { acquired: ["driver"] });
    }
    return stepResult(st, false, "다이얼이 돌아가지 않는다. 시계가 가리키는 네 자리 시각이 아닐까?", "err");
  }

  function submitSafeCode(state, code) {
    const st = clone(state);
    const norm = String(code || "").replace(/\D/g, "");
    st.moves++;
    if (st.flags.safeOpen) return stepResult(st, true, "이미 금고가 열려 있습니다.", "tap");
    if (norm === "379") {
      st.flags.safeOpen = true;
      addInv(st, "seal");
      st.zoom = null;
      return stepResult(st, true, "🔓 ☾3 ★7 ☀9! 육중한 금고가 열리고 안에서 '황동 인장 메달'을 손에 넣었다!", "unlock", { acquired: ["seal"] });
    }
    return stepResult(st, false, "금고가 잠긴 채 꿈쩍도 하지 않는다. 동쪽 어두운 석판의 비밀과 관련이 있을 것 같다.", "err");
  }

  function useOnDoor(state, itemId) {
    const st = clone(state);
    const f = st.flags;
    if (f.escaped) return stepResult(st, true, "이미 출구 문이 열렸습니다!", "escape");

    if (itemId === "master_key" && !f.doorKeyDone) {
      f.doorKeyDone = true;
      remInv(st, "master_key");
      if (f.doorSealDone) {
        f.escaped = true;
        st.finishedAt = Date.now();
        st.zoom = null;
        return stepResult(st, true, "🎉 마지막 자물쇠까지 풀렸다! 육중한 오크 문이 열리며 서재에서 탈출했다!", "escape");
      }
      st.zoom = "door";
      return stepResult(st, true, "🔑 상단 열쇠 구멍 잠금이 풀렸다! 이제 문 중앙의 원형 홈에 인장 메달만 끼우면 된다.", "unlock");
    }

    if (itemId === "seal" && !f.doorSealDone) {
      f.doorSealDone = true;
      remInv(st, "seal");
      if (f.doorKeyDone) {
        f.escaped = true;
        st.finishedAt = Date.now();
        st.zoom = null;
        return stepResult(st, true, "🎉 황동 인장 메달이 딱 들어맞았다! 오크 문이 활짝 열리며 서재 탈출 성공!", "escape");
      }
      st.zoom = "door";
      return stepResult(st, true, "🪙 문 중앙 원형 홈에 인장이 딱 맞물렸다! 이제 상단 열쇠 구멍에 마스터 키를 꽂으면 열린다.", "unlock");
    }

    st.zoom = "door";
    const need = [!f.doorKeyDone && "열쇠 구멍(마스터 키)", !f.doorSealDone && "원형 홈(황동 인장 메달)"].filter(Boolean).join("과 ");
    return stepResult(st, false, `단단한 참나무 출구 문. ${need}가 아직 잠겨 있다.`, "lock");
  }

  function closeZoom(state) {
    const st = clone(state);
    st.zoom = null;
    return stepResult(st, true, "", "tap");
  }

  // 현재 방면(N/E/S/W) 위 클릭 영역 (% 좌표 — 생성 이미지 구도와 일치)
  function getHotspots(state, wall = state.wall) {
    const f = state.flags;
    if (wall === "S") {
      const spots = [
        { id: "lamp",   label: "스탠드 조명",     x: 24, y: 29, w: 13, h: 25, done: false },
        { id: "diary",  label: "시계공의 일지",   x: 32, y: 44, w: 20, h: 12, done: f.diaryRead },
        { id: "box",    label: "4자리 다이얼 상자", x: 60, y: 39, w: 16, h: 16, done: f.boxOpen },
        { id: "drawer", label: "잠긴 서랍",       x: 62, y: 56, w: 16, h: 32, done: f.drawerOpen },
      ];
      if (!f.silverPicked) {
        spots.push({ id: "silver_spot", label: "작은 은열쇠", x: 52, y: 45, w: 7.5, h: 11, done: false, glint: true });
      }
      return spots;
    }
    if (wall === "E") {
      return [
        { id: "bookshelf", label: "고서적 책장", x: 20, y: 11, w: 34, h: 80, done: f.shelfOpen },
        { id: "slate",     label: f.uvClueSeen ? "형광 기호 석판" : "어두운 석판", x: 70, y: 15, w: 22, h: 37, done: f.uvClueSeen },
        { id: "candle",    label: "촛대 테이블", x: 71, y: 52, w: 11, h: 15, done: false },
      ];
    }
    if (wall === "N") {
      return [
        { id: "clock", label: f.clockFixed ? "시계 (03:45)" : "멈춘 괘종시계", x: 13, y: 12, w: 19, h: 80, done: f.clockFixed },
        { id: "door",  label: "출구 문", x: 53, y: 11, w: 34, h: 82, done: f.escaped },
      ];
    }
    return [
      { id: "frame", label: f.frameOpen ? "숨겨진 벽 금고" : "고정된 금테 액자", x: 31, y: 6, w: 38, h: 41, done: f.safeOpen },
      { id: "grate", label: f.grateFished ? "바닥 환풍구" : "깊은 바닥 환풍구", x: 4, y: 74, w: 19, h: 19, done: f.grateFished },
    ];
  }

  // 현재 진행 상태(flags + inv)를 읽어 가장 막힌 곳을 1/2/3단계로 안내
  function getHint(state, level = 1) {
    const f = state.flags;
    const inv = state.inv;
    const L = Math.max(1, Math.min(3, level));

    if (f.escaped) return "이미 서재에서 탈출했습니다! ↺ 새 게임으로 기록을 단축해 보세요.";

    if (!f.silverPicked) {
      return [
        "남쪽 책상 위를 자세히 살펴보세요. 반짝이는 작은 물건이 놓여 있습니다.",
        "남쪽 책상 종이 오른쪽 옆에 있는 은색 열쇠와 일지를 먼저 눌러 보세요.",
        "남쪽(S) 책상 중앙 종이 오른쪽 옆의 [작은 은열쇠]를 클릭해 줍고, 일지를 읽어 보세요.",
      ][L - 1];
    }
    if (!f.drawerOpen) {
      return [
        "방금 주운 열쇠를 남쪽 책상 어딘가에 쓸 수 있을 거예요.",
        "가방에서 [작은 은열쇠]를 선택한 상태로 오른쪽 서랍을 눌러 보세요.",
        "하단 가방에서 🗝️ [작은 은열쇠]를 눌러 선택 테두리를 켠 뒤, 책상 오른쪽 아래 서랍을 누르세요.",
      ][L - 1];
    }
    if (!f.shelfOpen) {
      return [
        "책상 위 일지에 적힌 시와 동쪽 책장의 책들을 연결해 보세요.",
        "일지 속 '불꽃(빨강) → 황금 → 에메랄드(초록) → 밤하늘(파랑)' 순서대로 동쪽 책장의 색깔 책을 눌러야 합니다.",
        "동쪽(E) 책장을 열어 [🔴 빨강 → 🟡 금색 → 🟢 초록 → 🔵 파랑] 순서로 클릭하세요.",
      ][L - 1];
    }
    if (!inv.includes("uv_on") && !f.uvClueSeen) {
      return [
        "가방 속 두 물건을 하나로 합칠 수 있을 것 같아요.",
        "꺼져 있는 UV 손전등에 맞는 부품을 인벤토리에서 합쳐 보세요.",
        "가방 위 [🔗 아이템 합치기]를 눌러 🔦 [빈 UV 손전등]과 🔋 [수은 건전지]를 차례로 누르세요.",
      ][L - 1];
    }
    if (!f.uvClueSeen) {
      return [
        "켜진 UV 손전등으로 동쪽 벽의 빈 석판을 비춰 보세요.",
        "동쪽(E) 벽 오른쪽에 걸린 어두운 석판에 보라색 UV 빛이 닿아야 합니다.",
        "가방에서 🟣 [켜진 UV 손전등]을 선택한 뒤, 동쪽 벽 오른쪽 [어두운 석판]을 누르세요 (☾3 ★7 ☀9).",
      ][L - 1];
    }
    if (!f.clockFixed) {
      return [
        "북쪽 벽의 커다란 괘종시계가 멈춰 있어요. 빠진 부품이 가방에 있지 않나요?",
        "책장에서 찾은 황금 시계추를 북쪽 괘종시계에 걸어 보세요.",
        "북쪽(N) 벽으로 돌린 뒤 🕰️ [황금 시계추]를 선택하고 왼쪽 [괘종시계]를 누르세요.",
      ][L - 1];
    }
    if (!f.boxOpen) {
      return [
        "시계가 멈춘 시각을 유심히 기억해서 남쪽 책상 위 자물쇠에 맞춰 보세요.",
        "괘종시계가 가리킨 네 자리 숫자(3시 45분)를 남쪽 나무 상자에 입력해 보세요.",
        "남쪽(S) 책상 오른쪽 위 [4자리 다이얼 상자]를 열어 숫자 `0345`를 입력하고 여세요.",
      ][L - 1];
    }
    if (!f.frameOpen) {
      return [
        "상자에서 얻은 공구로 다른 벽면의 고정된 장식을 풀 수 있을 거예요.",
        "서쪽 벽 중앙의 커다란 금테 액자 네 귀퉁이에 나사가 박혀 있습니다.",
        "서쪽(W) 벽에서 🪛 [일자 드라이버]를 선택한 상태로 중앙 [금테 액자]를 누르세요.",
      ][L - 1];
    }
    if (!f.safeOpen) {
      return [
        "액자 뒤 숨은 금고에는 세 가지 기호 숫자가 필요합니다. 아까 UV 빛으로 찾은 석판을 기억하세요.",
        "동쪽 어두운 석판에 떠올랐던 ☾ · ★ · ☀ 숫자를 차례로 맞춰 보세요.",
        "서쪽 금고를 눌러 ☾=3, ★=7, ☀=9 → `379`를 입력해 여세요.",
      ][L - 1];
    }
    if (!f.grateFished && !inv.includes("magnet_line")) {
      return [
        "서쪽 바닥 환풍구 깊숙한 곳에 열쇠가 떨어져 있어요. 가방 속 물건 두 개를 합쳐 낚아 올려 보세요.",
        "자석과 명주실을 합치면 긴 낚싯줄이 됩니다.",
        "[🔗 아이템 합치기]를 눌러 🧲 [강력 자석]과 🧵 [명주실]을 합쳐 🎣 [자석 낚싯줄]을 만드세요.",
      ][L - 1];
    }
    if (!f.grateFished) {
      return [
        "자석 낚싯줄로 깊은 환풍구 속 열쇠를 건져 올릴 차례입니다.",
        "서쪽 벽 왼쪽 아래 바닥 환풍구 철창에 낚싯줄을 내려 보세요.",
        "서쪽(W) 벽에서 🎣 [자석 낚싯줄]을 선택한 뒤 왼쪽 아래 [바닥 환풍구]를 누르세요.",
      ][L - 1];
    }
    return [
      "이제 출구 문으로 갈 차례입니다! 가방에 모인 열쇠와 인장 메달을 문에 사용하세요.",
      "북쪽 출구 문을 보면서 마스터 키와 황동 인장 메달을 각각 선택해 문을 눌러 주세요.",
      "북쪽(N) 벽에서 🔑 [서재 마스터 키] 선택→문 클릭, 이어서 🪙 [황동 인장 메달] 선택→문 클릭하면 탈출!",
    ][L - 1];
  }

  // 자가 검증: 시작부터 탈출까지 막힘 없이 완주 가능한지 확인
  function validateSolvable() {
    let st = initialState(1000);
    const steps = [];
    const run = (res, name) => {
      if (!res.ok) throw new Error(`Step failed [${name}]: ${res.msg}`);
      st = res.state;
      steps.push(name);
    };
    run(inspectSpot(st, "silver_spot"), "pick_silver_key");
    run(selectItem(st, "silver_key"), "sel_silver");
    run(inspectSpot(st, "drawer"), "open_drawer");
    run(inspectSpot(st, "diary"), "read_diary");
    for (const c of BOOK_TARGET) run(pressBook(st, c), `book_${c}`);
    run(combineItems(st, "uv_off", "battery"), "combine_uv");
    run(inspectSpot(st, "slate"), "uv_slate");
    run(selectItem(st, "pendulum"), "sel_pendulum");
    run(inspectSpot(st, "clock"), "fix_clock");
    run(submitBoxCode(st, "0345"), "open_box");
    run(selectItem(st, "driver"), "sel_driver");
    run(inspectSpot(st, "frame"), "unscrew_frame");
    run(submitSafeCode(st, "379"), "open_safe");
    run(combineItems(st, "magnet", "thread"), "combine_fishing");
    run(inspectSpot(st, "grate"), "fish_master_key");
    run(selectItem(st, "master_key"), "sel_master_key");
    run(inspectSpot(st, "door"), "unlock_door_key");
    run(selectItem(st, "seal"), "sel_seal");
    run(inspectSpot(st, "door"), "unlock_door_seal");
    if (!st.flags.escaped) throw new Error("Not escaped at final step!");
    return { ok: true, steps };
  }

  return {
    WALLS, WALL_NAMES, BOOK_TARGET, BOOK_NAMES, ITEMS,
    initialState, turnWall, selectItem, combineItems, inspectSpot,
    pressBook, submitBoxCode, submitSafeCode, useOnDoor, closeZoom,
    getHotspots, getHint, validateSolvable,
  };
});

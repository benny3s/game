/* 비밀 서재 탈출 1분 움직이는 규칙 설명 (escape/tutorial.js) */
(() => {
  "use strict";

  function buildSteps() {
    return [
      {
        tag: "탐색",
        title: "1. 동·서·남·북 네 벽면 둘러보기",
        body: "왼쪽·오른쪽 ◀ ▶ 화살표나 위쪽 나침반(N·E·S·W)을 눌러 4면을 둘러보며 수상한 곳을 눌러 보세요.",
        say: "화살표나 나침반으로 네 벽면을 둘러보며 수상한 물건을 눌러 단서를 찾으세요.",
        duration: 5500,
        render: () => `
          <div style="display:grid;gap:8px;place-items:center;font-size:13px">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="padding:8px 12px;border-radius:10px;background:#1e293b;border:1px solid #f59e0b">◀ 서쪽</span>
              <span style="padding:12px 18px;border-radius:12px;background:#111827;border:2px solid #fbbf24;font-weight:800">남쪽 · 책상</span>
              <span style="padding:8px 12px;border-radius:10px;background:#1e293b;border:1px solid #f59e0b">동쪽 ▶</span>
            </div>
            <div style="color:#94a3b8">책상, 책장, 시계, 액자를 탭하면 확대되거나 단서를 얻어요!</div>
          </div>`,
      },
      {
        tag: "아이템 사용",
        title: "2. 직접 해 보기! (열쇠 골라 서랍 열기)",
        body: "가방에서 물건을 먼저 눌러 선택한 뒤, 화면의 잠긴 곳을 누르면 사용됩니다.",
        say: "먼저 아래 가방의 작은 은열쇠를 누른 뒤, 잠긴 서랍을 눌러 열어 보세요.",
        interactive: { hint: "👆 가방의 🗝️ 열쇠를 먼저 누른 다음, 🔒 서랍을 눌러 보세요.", doneText: "완벽해요! 물건 선택 → 화면 클릭 감각을 바로 익히셨네요 👍" },
        render: (el, ctrl) => {
          let sel = false;
          el.innerHTML = `
            <div style="display:grid;gap:10px;place-items:center">
              <button type="button" id="etutBox" style="padding:14px 22px;border-radius:12px;border:2px solid #92400e;background:#291d14;color:#fef3c7;font:800 15px sans-serif;cursor:pointer">🔒 잠긴 책상 서랍</button>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:12px;color:#94a3b8">가방:</span>
                <button type="button" id="etutKey" style="padding:8px 12px;border-radius:10px;border:1.5px solid #475569;background:#172133;color:#f8fafc;font:700 14px sans-serif;cursor:pointer">🗝️ 작은 은열쇠</button>
              </div>
              <div id="etutTip" style="font-size:12px;color:#94a3b8;min-height:18px"></div>
            </div>`;
          const keyBtn = el.querySelector("#etutKey");
          const boxBtn = el.querySelector("#etutBox");
          const tip = el.querySelector("#etutTip");
          keyBtn.onclick = () => {
            sel = !sel;
            ctrl.sfx("tap");
            keyBtn.style.borderColor = sel ? "#fbbf24" : "#475569";
            keyBtn.style.background = sel ? "rgba(251,191,36,0.2)" : "#172133";
            tip.textContent = sel ? "좋아요! 이제 잠긴 서랍을 눌러 보세요." : "열쇠를 다시 선택하세요.";
          };
          boxBtn.onclick = () => {
            if (!sel) {
              ctrl.sfx("bad");
              tip.textContent = "먼저 아래 가방에서 🗝️ 작은 은열쇠를 눌러 선택하세요!";
              return;
            }
            boxBtn.textContent = "🔓 서랍이 열렸습니다!";
            boxBtn.style.borderColor = "#34d399";
            boxBtn.style.background = "rgba(52,211,153,0.18)";
            tip.textContent = "";
            ctrl.complete("완벽해요! 물건 선택 → 화면 클릭 감각을 바로 익히셨네요 👍");
          };
        },
      },
      {
        tag: "아이템 합치기",
        title: "3. 두 아이템 합치기 · 단계별 AI 힌트",
        body: "<b>[🔗 합치기]</b>를 누르고 두 물건을 차례로 고르면 새 도구를 만듭니다. 막히면 <b>🧑‍🏫 힌트</b>로 1~3단계 도움을 받으세요!",
        say: "합치기를 눌러 두 물건을 합쳐 새 도구를 만들고, 막히면 AI 힌트를 단계별로 볼 수 있어요.",
        duration: 6000,
        render: () => `
          <div style="display:grid;gap:8px;place-items:center;font-size:13px">
            <div style="padding:10px 14px;border-radius:12px;background:#131c2e;border:1px solid #334155">
              🔦 손전등 + 🔋 건전지 = <b style="color:#c084fc">🟣 켜진 UV 손전등</b>
            </div>
            <div style="color:#94a3b8">진행 상황은 자동 저장되어 언제든 이어할 수 있어요.</div>
          </div>`,
      },
    ];
  }

  window.EscapeTutorial = {
    open(force = true) {
      if (!window.Tutorial) return;
      if (!force && window.Tutorial.seen("escape_ep1_v1")) return;
      window.Tutorial.open({
        id: "escape_ep1_v1",
        title: "비밀 서재 탈출 — 1분 안내",
        steps: buildSteps(),
      });
    },
  };
})();

/* 베니 크아 — 1분 움직이는 규칙 설명 (kua/tutorial.js) */
(() => {
  "use strict";

  function buildSteps() {
    return [
      {
        tag: "기본 조작",
        title: "1. 방향키 이동 · Space 물풍선",
        body: "<b>방향키(▲▼◀▶)</b>로 움직이고 <b>Space</b>로 물풍선을 놓아 블록을 깨세요. 블록 모서리에 살짝 걸쳐도 자동으로 미끄러져 들어갑니다!",
        say: "방향키로 이동하고 스페이스로 물풍선을 놓아 블록을 깨서 아이템을 모으세요.",
        duration: 5000,
        render: () => `
          <div style="display:grid;gap:8px;place-items:center;font-size:13px">
            <div style="display:flex;gap:10px;align-items:center">
              <kbd style="padding:6px 10px;border-radius:8px;background:#1e293b;border:1px solid #38bdf8;font-weight:800">▲▼◀▶</kbd>
              <span>이동 · 모서리 자동 보정</span>
              <kbd style="padding:6px 12px;border-radius:8px;background:#1e293b;border:1px solid #f59e0b;font-weight:800">Space</kbd>
              <span>물풍선 놓기</span>
            </div>
            <div style="color:#94a3b8">놓자마자 직각(L자) 골목으로 피하는 것이 기본이에요!</div>
          </div>`,
      },
      {
        tag: "물방울 & 바늘",
        title: "2. 물방울에 갇혔을 때 바늘(Ctrl)로 탈출!",
        body: "물줄기에 맞으면 약 <b>6초</b> 동안 물방울에 갇혀 아주 느리게 움직입니다. 적이 닿으면 바로 터지고, 팀원이 닿으면 구출됩니다. <b>바늘(🪡)</b>이 있으면 <b>Ctrl</b>로 즉시 탈출할 수 있어요!",
        say: "물방울에 갇혔을 때 적이 닿기 전에 컨트롤 키로 바늘을 써서 직접 터뜨려 탈출해 보세요.",
        interactive: { hint: "👆 🪡 바늘(Ctrl) 버튼을 눌러 물방울에서 탈출해 보세요!", doneText: "탈출 성공! 구출 직후 짧은 무적 보호 시간도 생깁니다 👍" },
        render: (el, ctrl) => {
          el.innerHTML = `
            <div style="display:grid;gap:10px;place-items:center">
              <div id="ktutBub" style="padding:14px 22px;border-radius:99px;background:rgba(56,189,248,.28);border:2.5px solid #7dd3fc;font:800 16px sans-serif">🫧 물방울에 갇힘!</div>
              <button type="button" id="ktutNeedle" style="padding:9px 18px;border-radius:10px;border:2px solid #f59e0b;background:#1e293b;color:#fde68a;font:800 14px sans-serif;cursor:pointer">🪡 바늘 사용하기 (Ctrl)</button>
            </div>`;
          const btn = el.querySelector("#ktutNeedle");
          const bub = el.querySelector("#ktutBub");
          btn.onclick = () => {
            ctrl.sfx("pop");
            bub.textContent = "✨ 펑! 자유롭게 탈출했어요!";
            bub.style.borderColor = "#34d399";
            bub.style.background = "rgba(16,185,129,.22)";
            btn.disabled = true;
            ctrl.complete("탈출 성공! 구출 직후 짧은 무적 보호 시간도 생깁니다 👍");
          };
        },
      },
      {
        tag: "핵심 아이템",
        title: "3. 신발(킥) · 장갑(던지기) · 붉은 악마",
        body: "<b>🎈 물풍선(+1) · 🧪 물약(+1) · 🛼 롤러(속도+1)</b> 외에 <b>👟 신발</b>은 풍선 밀어 차기, <b>🥊 장갑</b>은 선 풍선 위에서 Space로 던지기, <b>👿 붉은 악마</b>는 속도 최대 + 킥을 부여합니다!",
        say: "신발은 풍선 차기, 장갑은 던지기, 마귀는 방향 반전이니 아이템 아이콘을 잘 보고 먹으세요.",
        duration: 5500,
        render: () => `
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;font-size:12px;text-align:center">
            <div style="padding:8px;border-radius:10px;background:#131c2e;border:1px solid #334155">👟<br><b>신발</b><br><span style="color:#94a3b8">물풍선 킥</span></div>
            <div style="padding:8px;border-radius:10px;background:#131c2e;border:1px solid #334155">🥊<br><b>장갑</b><br><span style="color:#94a3b8">앞으로 던지기</span></div>
            <div style="padding:8px;border-radius:10px;background:#3f121e;border:1px solid #fb7185">👾<br><b>마귀</b><br><span style="color:#fda4af">방향 7초 반전</span></div>
          </div>`,
      },
    ];
  }

  window.KuaTutorial = {
    open(force = true) {
      if (!window.Tutorial) return;
      if (!force && window.Tutorial.seen("kua_v1")) return;
      window.Tutorial.open({
        id: "kua_v1",
        title: "베니 크아 — 1분 안내",
        steps: buildSteps(),
      });
    },
  };
})();

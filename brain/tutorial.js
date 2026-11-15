/* 베니 두뇌 랩 1분 움직이는 규칙 안내 (brain/tutorial.js) */
(() => {
  "use strict";

  const svgMiniMatrix = () => `
    <div style="display:flex;justify-content:center">
      <svg viewBox="0 0 210 210" width="168" height="168" xmlns="http://www.w3.org/2000/svg">
        <rect width="210" height="210" rx="14" fill="#0b1120"/>
        <g transform="translate(8,8)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#38bdf8" stroke-width="2"/><circle cx="30" cy="30" r="16" fill="#38bdf8"/></g>
        <g transform="translate(75,8)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><polygon points="30,12 46,44 14,44" fill="#38bdf8"/></g>
        <g transform="translate(142,8)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><rect x="14" y="14" width="32" height="32" rx="4" fill="#38bdf8"/></g>
        <g transform="translate(8,75)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><polygon points="30,12 46,44 14,44" fill="none" stroke="#fbbf24" stroke-width="3"/></g>
        <g transform="translate(75,75)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><rect x="14" y="14" width="32" height="32" rx="4" fill="none" stroke="#fbbf24" stroke-width="3"/></g>
        <g transform="translate(142,75)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><circle cx="30" cy="30" r="16" fill="none" stroke="#fbbf24" stroke-width="3"/></g>
        <g transform="translate(8,142)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><rect x="14" y="14" width="32" height="32" rx="4" fill="#f472b6"/></g>
        <g transform="translate(75,142)"><rect width="60" height="60" rx="9" fill="#131c2e" stroke="#334155" stroke-width="2"/><circle cx="30" cy="30" r="16" fill="#f472b6"/></g>
        <g transform="translate(142,142)"><rect width="60" height="60" rx="9" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5 3"/><text x="30" y="40" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle">?</text></g>
      </svg>
    </div>`;

  function buildSteps() {
    return [
      {
        tag: "소개",
        title: "1. 네 가지 두뇌 영역 · 두 가지 모드",
        body: "🔷 도형·공간, 🔢 수·패턴, 🕵️ 추리·논리, 🧠 기억·집중 네 영역을 골라 연습하거나 <b>100점 종합 평가</b>를 볼 수 있어요.",
        say: "베니 두뇌 랩은 도형 공간, 수 패턴, 추리 논리, 기억 집중 네 영역을 골라 연습하거나 백점 종합 평가를 볼 수 있어요.",
        duration: 6000,
        render: () => `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:300px;margin:auto;font-size:13px">
            <div style="padding:10px;border-radius:10px;background:#131c2e;border:1px solid #38bdf8"><b>🔷 도형 · 공간</b><br><small style="color:#94a3b8">행렬 · 회전</small></div>
            <div style="padding:10px;border-radius:10px;background:#131c2e;border:1px solid #fbbf24"><b>🔢 수 · 패턴</b><br><small style="color:#94a3b8">수열 · 기호식</small></div>
            <div style="padding:10px;border-radius:10px;background:#131c2e;border:1px solid #f472b6"><b>🕵️ 추리 · 논리</b><br><small style="color:#94a3b8">진실 · 조건표</small></div>
            <div style="padding:10px;border-radius:10px;background:#131c2e;border:1px solid #34d399"><b>🧠 기억 · 집중</b><br><small style="color:#94a3b8">순서 · 위치</small></div>
          </div>`,
      },
      {
        tag: "멘사 행렬",
        title: "2. 3×3 도형 행렬 푸는 요령",
        body: "가로줄마다 모양 3개(● ▲ ■)와 색·채움이 한 번씩 나오죠! 마지막 줄에 □, ●가 나왔으니 <b>?</b>는 분홍 세모(▲)예요.",
        say: "가로줄마다 세 가지 모양과 색이 한 번씩 나옵니다. 마지막 줄은 분홍 세모가 정답이에요.",
        duration: 6000,
        render: () => svgMiniMatrix(),
      },
      {
        tag: "직접 풀기",
        title: "3. 직접 풀어 보기! (수열 연습)",
        body: "규칙을 찾아 물음표에 들어갈 숫자를 눌러 보세요.",
        say: "규칙을 찾아 물음표에 들어갈 숫자를 직접 눌러 보세요.",
        interactive: { hint: "👆 빈칸 ? 에 알맞은 숫자를 눌러 보세요.", doneText: "정답입니다! +3씩 커지는 규칙을 바로 찾으셨네요 👍" },
        render: (el, ctrl) => {
          el.innerHTML = `
            <div style="display:grid;gap:12px;place-items:center">
              <div style="display:flex;gap:8px;font:900 20px sans-serif;align-items:center">
                <span style="padding:8px 12px;border-radius:9px;background:#131c2e;border:1px solid #334155">2</span>
                <span style="padding:8px 12px;border-radius:9px;background:#131c2e;border:1px solid #334155">5</span>
                <span style="padding:8px 12px;border-radius:9px;background:#131c2e;border:1px solid #334155">8</span>
                <span style="padding:8px 12px;border-radius:9px;background:#131c2e;border:1px solid #334155">11</span>
                <span style="padding:8px 12px;border-radius:9px;background:#1e293b;border:2px solid #f59e0b;color:#fbbf24">?</span>
              </div>
              <div class="btut-opts" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                ${[12, 14, 15, 16].map(n => `<button type="button" data-v="${n}" style="min-width:56px;padding:10px 14px;border-radius:10px;border:1.5px solid #475569;background:#172133;color:#f8fafc;font:800 16px sans-serif;cursor:pointer">${n}</button>`).join("")}
              </div>
              <div class="btut-tip" style="font-size:12px;color:#94a3b8;min-height:18px"></div>
            </div>`;
          const tip = el.querySelector(".btut-tip");
          el.querySelectorAll("button").forEach(b => {
            b.onclick = () => {
              const v = +b.dataset.v;
              if (v === 14) {
                b.style.borderColor = "#34d399";
                b.style.background = "rgba(52,211,153,0.22)";
                tip.textContent = "";
                ctrl.complete("정답입니다! +3씩 커지는 규칙을 바로 찾으셨네요 👏");
              } else {
                ctrl.sfx("bad");
                b.style.borderColor = "#fb7185";
                tip.textContent = "힌트: 이웃한 수의 차이를 빼 보세요 (5 - 2 = ?).";
              }
            };
          });
        },
      },
      {
        tag: "성장 그래프",
        title: "4. 100점 성장 이력 · 친구 대결",
        body: "종합 평가를 끝낼 때마다 내 성장 그래프가 쌓이고, 👥 친구랑 탭에서는 같은 문제 8개로 실시간 대결을 할 수 있어요!",
        say: "종합 평가를 끝낼 때마다 성장 그래프가 쌓이고, 친구랑 탭에서는 같은 문제 여덟 개로 대결할 수 있어요.",
        duration: 5500,
        render: () => `
          <div style="text-align:center;display:grid;gap:8px;max-width:290px;margin:auto">
            <div style="padding:12px;border-radius:12px;background:#131c2e;border:1px solid #334155">
              <b style="color:#fbbf24">58점</b> → <b style="color:#38bdf8">72점</b> → <b style="color:#34d399">84점 (+12 ▲)</b>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">4영역(각 25점) 점수 변화 한눈에 보기</div>
            </div>
            <div style="font-size:12.5px;color:#cbd5e1">※ 막히면 언제든 <b>🧑‍🏫 AI 선생님</b>을 눌러 보세요!</div>
          </div>`,
      },
    ];
  }

  window.BrainTutorial = {
    open(force = true) {
      if (!window.Tutorial) return;
      if (!force && window.Tutorial.seen("brain_v1")) return;
      window.Tutorial.open({
        id: "brain_v1",
        title: "베니 두뇌 랩 — 1분 안내",
        steps: buildSteps(),
      });
    },
  };
})();

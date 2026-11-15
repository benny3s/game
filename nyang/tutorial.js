/* 냥도쿠 · 반반 · 냥산책 — 더 지니어스식 움직이는 규칙 브리핑 (nyang/tutorial.js)
   common/tutorial.js 위에서 동작 */
(() => {
  if (window.NyangTutorial) return;
  const COLS = ["#ffd8be", "#bfe8db", "#d7e6ff", "#ead7fa"];
  const CSS = `
.nt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:7px;background:#fff;border-radius:16px;
  width:min(210px,60vw);aspect-ratio:1;box-shadow:0 8px 24px rgba(0,0,0,.45);position:relative;user-select:none}
.nt-c{position:relative;border-radius:9px;display:grid;place-items:center;font-size:22px;font-weight:800;color:#5b4636;
  box-shadow:inset 0 -2px 0 rgba(0,0,0,.12);border:0;padding:0;cursor:pointer;background:#fff;transition:transform .14s,box-shadow .14s}
.nt-c.nt-hi{outline:3px solid #fbbf24;box-shadow:0 0 14px rgba(251,191,36,.8),inset 0 -2px 0 rgba(0,0,0,.12);z-index:2}
.nt-c.nt-bad{outline:2.5px solid #ef4444;background-image:linear-gradient(rgba(239,68,68,.26),rgba(239,68,68,.26))}
.nt-c .nt-x{font-size:18px;font-weight:900;color:rgba(91,70,54,.65)}
.nt-c .nt-n{width:64%;aspect-ratio:1;border-radius:50%;background:#5b4636;color:#fff;font-size:14px;display:grid;place-items:center}
.nt-bcell{background:#fff;border:1.5px solid #ead8c5;font-size:21px}
.nt-bcell.z{background:#ffe9cf}
.nt-bcell.o{background:#ebe6f0}
.nt-sign{position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;border:1.5px solid #c99d77;
  color:#8a5a3a;font:900 13px/1 sans-serif;display:grid;place-items:center;transform:translate(-50%,-50%);z-index:3;pointer-events:none}
.nt-zcell{background:#fff;border:1.5px solid #f1e2d2;position:relative}
.nt-zcell.p{background:#ffe2c4}`;
  let styled = false;
  const ensure = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const REG = [
    [0, 0, 1, 1],
    [0, 2, 1, 1],
    [2, 2, 3, 3],
    [2, 3, 3, 3],
  ];
  const boardHtml = () => `<div class="nt-grid">${REG.flat().map((g, k) => `<button type="button" class="nt-c" data-k="${k}" style="background:${COLS[g]}"></button>`).join("")}</div>`;

  function stepsNyang() {
    return [
      {
        tag: "STEP 1 · 목표",
        title: "가로 · 세로 · 색 땅마다 고양이 1마리!",
        body: "모든 <b>가로줄</b>, <b>세로줄</b>, 그리고 <b>같은 색 구역</b>마다 고양이 🐱 를 <b>딱 한 마리</b>씩만 놓으면 이겨요.",
        say: "냥도쿠는 가로줄, 세로줄, 그리고 같은 색 땅마다 고양이를 딱 한 마리씩 놓는 퍼즐입니다.",
        duration: 5000,
        render(stage, ctrl) {
          stage.innerHTML = boardHtml();
          const ans = [1, 7, 8, 14];
          ans.forEach((k, i) => {
            ctrl.later(() => {
              const el = stage.querySelector(`[data-k="${k}"]`);
              stage.querySelectorAll(".nt-c").forEach(c => c.classList.remove("nt-hi"));
              if (el) { el.innerHTML = "🐱"; el.classList.add("nt-hi"); ctrl.sfx("cat", { combo: i + 1 }); }
            }, 600 + i * 750);
          });
        },
      },
      {
        tag: "STEP 2 · 핵심 금지",
        title: "고양이끼리는 대각선으로도 붙지 마세요!",
        body: "고양이를 놓은 칸의 <span class='tut-bad'>위·아래·양옆·대각선 8칸</span>에는 다른 고양이가 절대 올 수 없어요.",
        say: "고양이끼리는 위아래 양옆은 물론 대각선으로도 붙으면 안 됩니다.",
        duration: 4800,
        render(stage, ctrl) {
          stage.innerHTML = boardHtml();
          const mid = stage.querySelector('[data-k="5"]');
          ctrl.later(() => {
            if (mid) { mid.innerHTML = "🐱"; mid.classList.add("nt-hi"); ctrl.sfx("cat"); }
          }, 400);
          const around = [0, 1, 2, 4, 6, 8, 9, 10];
          ctrl.later(() => {
            around.forEach(k => {
              const c = stage.querySelector(`[data-k="${k}"]`);
              if (c) { c.classList.add("nt-bad"); c.innerHTML = `<span class="nt-x">✕</span>`; }
            });
            ctrl.sfx("x");
          }, 1250);
        },
      },
      {
        tag: "STEP 3 · 직접 해보기",
        title: "한 번 누르면 ✕ · 빠르게 두 번 누르면 🐱!",
        body: "아랫줄 보라색 땅에서 고양이 바로 아래·대각선 칸은 못 쓰죠! <b>반짝이는 칸</b>을 <b>빠르게 두 번</b> 눌러 🐱 를 놓아 보세요.",
        say: "한 번 누르면 엑스 표시, 빠르게 두 번 누르면 고양이를 놓습니다. 반짝이는 칸을 두 번 눌러 보세요.",
        interactive: {
          hint: "👆 노랗게 반짝이는 칸을 빠르게 두 번 톡톡 눌러 보세요!",
          doneText: "🎉 정답! 주변 칸들이 저절로 ✕ 로 정리돼요.",
        },
        render(stage, ctrl) {
          stage.innerHTML = boardHtml() + `<span class="tut-finger" style="right:28%;bottom:8%">👆</span>`;
          for (const k of [1, 7, 8]) { const c = stage.querySelector(`[data-k="${k}"]`); if (c) c.innerHTML = "🐱"; }
          for (const k of [0, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 15]) { const c = stage.querySelector(`[data-k="${k}"]`); if (c) c.innerHTML = `<span class="nt-x">✕</span>`; }
          const tgt = stage.querySelector('[data-k="14"]');
          tgt.classList.add("nt-hi");
          let last = 0, xOn = false, placed = false;
          tgt.onclick = () => {
            if (placed) return;
            const now = performance.now();
            if (now - last < 650) {
              placed = true;
              tgt.innerHTML = "🐱"; tgt.classList.remove("nt-hi");
              const fg = stage.querySelector(".tut-finger"); if (fg) fg.remove();
              ctrl.sfx("cat", { combo: 2 });
              ctrl.complete();
              return;
            }
            last = now; xOn = !xOn;
            tgt.innerHTML = xOn ? `<span class="nt-x">✕</span>` : "";
            ctrl.sfx(xOn ? "x" : "unx");
          };
        },
      },
      {
        tag: "STEP 4 · 고수 추론 팁",
        title: "한 구역이 한 줄에 몰려 있으면?",
        body: "<b>첫째 줄</b> 왼쪽 두 칸이 전부 주황색 구역이죠? 고양이 1마리가 거기 무조건 들어가니, <span class='tut-em'>같은 줄의 나머지 칸은 모두 ✕</span> 예요!",
        say: "한 색 구역이 한 줄 안에만 있다면, 그 줄의 다른 색 칸은 전부 엑스가 됩니다.",
        duration: 5000,
        render(stage, ctrl) {
          stage.innerHTML = boardHtml();
          const row0 = [[0, 0, 1, 1], [2, 2, 1, 3], [2, 2, 3, 3], [2, 2, 3, 3]];
          stage.querySelectorAll(".nt-c").forEach((c, idx) => { c.style.background = COLS[row0[Math.floor(idx / 4)][idx % 4]]; });
          ctrl.later(() => {
            [0, 1].forEach(k => stage.querySelector(`[data-k="${k}"]`).classList.add("nt-hi"));
            ctrl.sfx("hint");
          }, 500);
          ctrl.later(() => {
            [2, 3].forEach(k => { const c = stage.querySelector(`[data-k="${k}"]`); c.classList.add("nt-bad"); c.innerHTML = `<span class="nt-x">✕</span>`; });
            ctrl.sfx("x");
          }, 1500);
        },
      },
    ];
  }

  function stepsBanban() {
    const bbHtml = () => `<div class="nt-grid">${Array.from({ length: 16 }, (_, k) => `<button type="button" class="nt-c nt-bcell" data-k="${k}"></button>`).join("")}
      <i class="nt-sign" style="left:50%;top:38%">×</i><i class="nt-sign" style="left:50%;top:88%">=</i></div>`;
    return [
      {
        tag: "STEP 1 · 반반 규칙",
        title: "줄·열마다 🐈 치즈냥 · 🐈‍⬛ 까망냥 반반!",
        body: "4×4 판이라면 모든 가로줄·세로줄에 <b>치즈냥 2마리</b>, <b>까망냥 2마리</b>씩 똑같이 들어가요.",
        say: "반반 퍼즐은 모든 줄과 열마다 치즈냥과 까망냥을 똑같은 수로 채웁니다.",
        duration: 4600,
        render(stage, ctrl) {
          stage.innerHTML = bbHtml();
          const vals = [0, 1, 0, 1];
          ctrl.later(() => {
            vals.forEach((v, k) => {
              const c = stage.querySelector(`[data-k="${k}"]`);
              c.classList.add(v === 0 ? "z" : "o"); c.textContent = v === 0 ? "🐈" : "🐈‍⬛";
            });
            ctrl.sfx("cat");
          }, 550);
        },
      },
      {
        tag: "STEP 2 · 셋 연속 금지 & 기호",
        title: "셋이 연달아 붙으면 안 돼요 · = 는 같게, × 는 다르게",
        body: "<b>🐈🐈</b> 둘이 붙어 있으면 양옆은 무조건 <b>🐈‍⬛</b>! 칸 사이 <b class='tut-em'>=</b> 는 같은 고양이, <b class='tut-bad'>×</b> 는 다른 고양이예요.",
        say: "같은 고양이 셋이 연달아 붙으면 안 됩니다. 등호는 같은 고양이, 엑스 표시는 다른 고양이입니다.",
        duration: 4800,
        render(stage, ctrl) {
          stage.innerHTML = bbHtml();
          const set = (k, v) => { const c = stage.querySelector(`[data-k="${k}"]`); c.classList.add(v === 0 ? "z" : "o"); c.textContent = v === 0 ? "🐈" : "🐈‍⬛"; };
          set(4, 0); set(5, 0);
          ctrl.later(() => { set(6, 1); stage.querySelector('[data-k="6"]').classList.add("nt-hi"); ctrl.sfx("cat"); }, 900);
        },
      },
      {
        tag: "STEP 3 · 직접 해보기",
        title: "반짝이는 칸을 눌러 치즈냥을 놓아 보세요!",
        body: "위 줄에 이미 까망냥 🐈‍⬛ 둘이 놓였어요. 빈칸은 <b>치즈냥 🐈</b>(한 번 누르기) 차례입니다!",
        interactive: { hint: "👆 반짝이는 칸을 한 번 눌러 치즈냥 🐈 을 놓아 보세요!", doneText: "🎉 잘했어요! 누를 때마다 🐈 → 🐈‍⬛ → 빈칸 으로 바뀌어요." },
        render(stage, ctrl) {
          stage.innerHTML = bbHtml() + `<span class="tut-finger" style="right:14%;top:8%">👆</span>`;
          const set = (k, v) => { const c = stage.querySelector(`[data-k="${k}"]`); c.className = "nt-c nt-bcell " + (v === 0 ? "z" : "o"); c.textContent = v === 0 ? "🐈" : "🐈‍⬛"; };
          set(0, 1); set(1, 0); set(2, 1);
          const tgt = stage.querySelector('[data-k="3"]');
          tgt.classList.add("nt-hi");
          let v = -1;
          tgt.onclick = () => {
            v = v < 0 ? 0 : v === 0 ? 1 : -1;
            tgt.className = "nt-c nt-bcell" + (v === 0 ? " z" : v === 1 ? " o" : "");
            tgt.textContent = v === 0 ? "🐈" : v === 1 ? "🐈‍⬛" : "";
            if (v === 0) {
              const fg = stage.querySelector(".tut-finger"); if (fg) fg.remove();
              ctrl.sfx("cat"); ctrl.complete();
            } else ctrl.sfx("unx");
          };
        },
      },
    ];
  }

  function stepsZip() {
    const zHtml = () => `<div class="nt-grid">${Array.from({ length: 16 }, (_, k) => `<div class="nt-c nt-zcell" data-k="${k}"></div>`).join("")}</div>`;
    return [
      {
        tag: "STEP 1 · 한붓그리기",
        title: "1번부터 순서대로 모든 칸을 한 번씩!",
        body: "<b>1번 칸</b>에서 출발해 위·아래·옆으로만 선을 그어 <b>모든 칸</b>을 빠짐없이 지나 마지막 번호에서 끝내요.",
        say: "냥산책은 일번 칸에서 시작해 순서대로 모든 칸을 한 번씩 지나 마지막 번호에서 끝내는 게임입니다.",
        duration: 4600,
        render(stage, ctrl) {
          stage.innerHTML = zHtml();
          stage.querySelector('[data-k="0"]').innerHTML = `<span class="nt-n">1</span>`;
          stage.querySelector('[data-k="7"]').innerHTML = `<span class="nt-n">2</span>`;
          stage.querySelector('[data-k="12"]').innerHTML = `<span class="nt-n">3</span>`;
          const path = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
          path.forEach((k, i) => ctrl.later(() => {
            const c = stage.querySelector(`[data-k="${k}"]`);
            if (c) { c.classList.add("p"); if (!c.querySelector(".nt-n")) c.textContent = i === path.length - 1 ? "🐈" : "🐾"; }
            if (i % 3 === 0) ctrl.sfx("x");
          }, 300 + i * 210));
        },
      },
      {
        tag: "STEP 2 · 직접 이어 보기",
        title: "1 → 빈칸 → 2번 칸까지 차례대로 눌러 보세요!",
        body: "실제 판에서는 손가락으로 쓱 끌면 이어지고, 지나온 칸을 다시 밟으면 거기까지 깔끔하게 지워져요.",
        interactive: { hint: "👆 1 → 빈칸 → 2 순서대로 눌러 길을 이어 보세요!", doneText: "🎉 완성! 2번을 먼저 밟으면 안내가 뜨며 막아줘요." },
        render(stage, ctrl) {
          stage.innerHTML = zHtml();
          const c0 = stage.querySelector('[data-k="0"]'), c1 = stage.querySelector('[data-k="1"]'), c2 = stage.querySelector('[data-k="2"]');
          c0.innerHTML = `<span class="nt-n">1</span>`; c0.classList.add("nt-hi");
          c2.innerHTML = `<span class="nt-n">2</span>`;
          let step = 0;
          [c0, c1, c2].forEach((el, idx) => {
            el.onclick = () => {
              if (idx !== step) {
                ctrl.sfx("miss");
                const tryEl = document.getElementById("tutTry");
                if (tryEl) tryEl.textContent = step === 0 ? "먼저 1번 칸부터 출발해 보세요!" : step === 1 ? "가운데 빈칸을 먼저 지나야 2번으로 가요!" : "2번 칸을 눌러 마무리하세요!";
                return;
              }
              el.classList.remove("nt-hi"); el.classList.add("p");
              if (idx === 1) el.textContent = "🐾";
              ctrl.sfx(idx === 2 ? "cat" : "x");
              step++;
              if (step === 1) c1.classList.add("nt-hi");
              else if (step === 2) c2.classList.add("nt-hi");
              else ctrl.complete();
            };
          });
        },
      },
    ];
  }

  function open(kind = "q", { onStart, onWatch } = {}) {
    ensure();
    if (!window.Tutorial) return;
    const isB = kind === "b", isZ = kind === "z";
    const title = isB ? "🌗 반반 · 움직이는 설명" : isZ ? "🐾 냥산책 · 움직이는 설명" : "🐱 냥도쿠 · 움직이는 설명";
    const steps = isB ? stepsBanban() : isZ ? stepsZip() : stepsNyang();
    const actions = [];
    if (!isB && !isZ && onWatch) actions.push({ label: "🧠 AI 풀이 구경", onClick(close) { close(); onWatch(); } });
    if (onStart) actions.push({ label: "▶ 지금 바로 풀기", primary: true, onClick(close) { close(); onStart(); } });
    Tutorial.open({ id: "nyang_" + kind, title, steps, actions, autoplay: true });
  }

  window.NyangTutorial = { open };
})();

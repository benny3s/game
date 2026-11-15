// 베니 지니어스 — 더 지니어스 스타일 1분 인터랙티브 규칙 설명
(function (root) {
  "use strict";

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }

  function svgShape(s, fg, bg) {
    const bgs = ["#131823", "#f1f5f9", "#6b7280"];
    const fgs = ["#ef4444", "#3b82f6", "#facc15"];
    const fill = fgs[fg], b = bgs[bg];
    let shape = "";
    if (s === 0) shape = `<polygon points="32,12 52,50 12,50" fill="${fill}" stroke="#0b0f19" stroke-width="3" stroke-linejoin="round"/>`;
    else if (s === 1) shape = `<rect x="14" y="14" width="36" height="36" rx="5" fill="${fill}" stroke="#0b0f19" stroke-width="3"/>`;
    else shape = `<circle cx="32" cy="32" r="19" fill="${fill}" stroke="#0b0f19" stroke-width="3"/>`;
    return `<svg viewBox="0 0 64 64" width="100%" height="100%" style="display:block;border-radius:10px;background:${b};border:2px solid rgba(255,255,255,.18)">${shape}</svg>`;
  }

  function openBW(opts) {
    const steps = [
      {
        title: "0~8 타일과 흑 · 백 색의 비밀",
        say: "각자 0부터 8까지 9장의 타일을 가져요. 짝수(0·2·4·6·8)는 검은색 ⬛, 홀수(1·3·5·7)는 흰색 ⬜ 타일이에요.",
        tts: "각자 0부터 8까지 아홉 장의 타일을 갖습니다. 짝수는 검은색, 홀수는 흰색이에요.",
        ms: 4600,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-bw");
          const row = el("div", "gtut-tiles");
          const tiles = [];
          for (let n = 0; n <= 8; n++) {
            const t = el("div", "gtut-tile " + (n % 2 === 0 ? "blk" : "wht"), String(n));
            tiles.push(t);
            row.appendChild(t);
          }
          const cap = el("div", "gtut-cap", "짝수 5장(⬛) · 홀수 4장(⬜)");
          wrap.append(row, cap);
          stage.appendChild(wrap);
          ctrl.after(() => {
            tiles.forEach((t, i) => { if (i % 2 === 0) t.classList.add("tut-hi"); });
            cap.textContent = "짝수(0·2·4·6·8)는 ⬛ 흑 타일!";
            ctrl.sfx("pop");
          }, 900);
          ctrl.after(() => {
            tiles.forEach((t, i) => { t.classList.toggle("tut-hi", i % 2 === 1); });
            cap.textContent = "홀수(1·3·5·7)는 ⬜ 백 타일!";
            ctrl.sfx("tap");
          }, 2500);
        },
      },
      {
        title: "선공은 색깔만 공개돼요!",
        say: "선공이 타일을 내면 숫자는 절대 보이지 않고 '흑'인지 '백'인지 색깔만 상대에게 공개돼요.",
        tts: "선공이 타일을 내면 숫자는 숨기고 검은색인지 흰색인지만 공개됩니다.",
        ms: 4600,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-duel");
          const left = el("div", "gtut-slot");
          left.innerHTML = `<span class="lbl">선공 (나)</span><div class="card big blk">6</div>`;
          const mid = el("div", "gtut-arrow", "→ 상대 화면에는 →");
          const right = el("div", "gtut-slot");
          right.innerHTML = `<span class="lbl">상대에게 보이는 모습</span><div class="card big blk hidden-num">⬛</div>`;
          wrap.append(left, mid, right);
          stage.appendChild(wrap);
          ctrl.after(() => {
            right.querySelector(".card").classList.add("tut-hi");
            ctrl.sfx("flip");
          }, 800);
        },
      },
      {
        title: "큰 숫자가 +1점! 승자가 다음 선공",
        say: "두 사람의 타일 중 더 큰 숫자를 낸 쪽이 1점을 얻고 다음 라운드 선공이 돼요. 사용한 숫자도 끝까지 비공개라 블러핑이 가능해요!",
        tts: "더 큰 숫자를 낸 사람이 1점을 얻고 다음 라운드 선공이 됩니다.",
        ms: 4800,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-duel");
          const c1 = el("div", "gtut-slot");
          c1.innerHTML = `<span class="lbl">나</span><div class="card big blk">6</div>`;
          const vs = el("div", "gtut-vs", "VS");
          const c2 = el("div", "gtut-slot");
          c2.innerHTML = `<span class="lbl">상대</span><div class="card big wht">3</div>`;
          const res = el("div", "gtut-cap", "과연 누구 숫자가 더 클까요?");
          const box = el("div", "gtut-bw");
          box.append(wrap, res);
          wrap.append(c1, vs, c2);
          stage.appendChild(box);
          ctrl.after(() => {
            c1.querySelector(".card").classList.add("tut-hi");
            res.textContent = "6 > 3! 나 +1점 & 다음 라운드 선공!";
            ctrl.sfx("good");
          }, 1200);
        },
      },
      {
        title: "직접 골라 보기 (연습)",
        say: "상대가 선공으로 ⬜ 백(홀수: 1·3·5·7 중 하나)을 냈어요. 내 패 [1, 4, 6, 8] 중 가성비 좋게 이기거나 확실히 이기는 패를 눌러 보세요!",
        tts: "상대가 흰색 홀수를 냈습니다. 이길 수 있는 짝수 6이나 8을 눌러 보세요.",
        interactive: true,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-bw");
          const opp = el("div", "gtut-opp-pill", "상대 선공: ⬜ 백 (1 · 3 · 5 · 7 중 하나)");
          const row = el("div", "gtut-tiles");
          const note = el("div", "gtut-cap", "이길 확률이 높은 6 또는 8을 눌러 보세요!");
          [1, 4, 6, 8].forEach(n => {
            const btn = el("button", "gtut-tile " + (n % 2 === 0 ? "blk" : "wht"), String(n));
            btn.type = "button";
            btn.onclick = () => {
              if (n === 6 || n === 8) {
                btn.classList.add("tut-hi");
                note.textContent = n === 6
                  ? "완벽해요! 6은 1·3·5를 모두 이기면서 최고 패 8도 아꼈어요!"
                  : "좋아요! 8은 모든 흰 패(1·3·5·7)를 100% 이기는 확실한 수예요!";
                ctrl.sfx("good");
                ctrl.complete();
              } else {
                btn.classList.remove("tut-bad-cell");
                void btn.offsetWidth;
                btn.classList.add("tut-bad-cell");
                note.textContent = `${n}은 상대의 큰 홀수(5·7)에 질 수 있어요. 6이나 8을 눌러 보세요!`;
                ctrl.sfx("bad");
              }
            };
            row.appendChild(btn);
          });
          wrap.append(opp, row, note);
          stage.appendChild(wrap);
        },
      },
    ];
    Tutorial.open({
      id: "genius_bw",
      title: "⬛⬜ 흑과 백 1분 규칙",
      steps,
      actions: [
        { label: "👀 AI 구경", onClick: opts?.onWatch },
        { label: "🎮 바로 시작", primary: true, onClick: opts?.onStart },
      ].filter(a => a.onClick),
    });
  }

  function openGH(opts) {
    const steps = [
      {
        title: "카드의 3가지 속성 보기",
        say: "모든 카드는 ① 모양(세모·네모·동그라미) ② 도형 색(빨·파·노) ③ 배경 색(검·흰·회) 3가지 속성을 가져요.",
        tts: "각 카드는 모양, 도형 색, 배경 색 세 가지 속성을 가집니다.",
        ms: 4600,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-gh");
          const row = el("div", "gtut-gh-row");
          const sample = [
            { s: 0, fg: 0, bg: 0, lbl: "세모·빨강·검정" },
            { s: 1, fg: 1, bg: 1, lbl: "네모·파랑·하양" },
            { s: 2, fg: 2, bg: 2, lbl: "원·노랑·회색" },
          ];
          sample.forEach((c, idx) => {
            const box = el("div", "gtut-gh-item");
            const pic = el("div", "gtut-gh-pic");
            pic.innerHTML = svgShape(c.s, c.fg, c.bg);
            const cap = el("span", "", c.lbl);
            box.append(pic, cap);
            row.appendChild(box);
            ctrl.after(() => { pic.classList.add("tut-hi"); ctrl.sfx("tap"); }, 600 + idx * 700);
          });
          wrap.appendChild(row);
          stage.appendChild(wrap);
        },
      },
      {
        title: "합(Hap): 각 속성이 '모두 같거나' '모두 달라야' 해요!",
        say: "카드 3장을 골랐을 때 모양 · 도형 색 · 배경 색 각각이 전부 똑같거나, 전부 서로 다르면 '합! (+1점)'이에요.",
        tts: "세 장의 모양, 색, 배경이 각각 전부 같거나 전부 다르면 합입니다.",
        ms: 5200,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-gh");
          const row = el("div", "gtut-gh-row");
          // 색: 모두 빨강(같음), 모양: 세모/네모/원(다름), 배경: 검/흰/회(다름)
          [[0, 0, 0], [1, 0, 1], [2, 0, 2]].forEach(([s, fg, bg]) => {
            const pic = el("div", "gtut-gh-pic tut-hi");
            pic.innerHTML = svgShape(s, fg, bg);
            row.appendChild(pic);
          });
          const cap = el("div", "gtut-cap", "모양: 세모·네모·원(모두 다름 ✅) · 색: 빨강×3(모두 같음 ✅) · 배경: 검·흰·회(모두 다름 ✅)");
          wrap.append(row, cap);
          stage.appendChild(wrap);
          ctrl.after(() => ctrl.sfx("good"), 1000);
        },
      },
      {
        title: "직접 '합' 3장을 찾아 눌러 보세요! (연습)",
        say: "아래 4장 중 3장을 골라 '합'을 만들어 보세요! (더 이상 남은 합이 없을 때 '결!'을 누르면 +3점!)",
        tts: "아래 네 장 중 합이 되는 세 장을 눌러 찾아보세요.",
        interactive: true,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const cards = [
            { s: 0, fg: 0, bg: 0 }, // 0: 빨강 세모 검정
            { s: 0, fg: 1, bg: 1 }, // 1: 파랑 세모 하양
            { s: 0, fg: 2, bg: 2 }, // 2: 노랑 세모 회색 -> 0,1,2가 합!
            { s: 1, fg: 0, bg: 2 }, // 3: 빨강 네모 회색 (오답 미끼)
          ];
          const picked = new Set();
          const wrap = el("div", "gtut-gh");
          const row = el("div", "gtut-gh-row");
          const cap = el("div", "gtut-cap", "세 장을 차례로 눌러 보세요 (힌트: 모양이 전부 같거나 다른 조합!)");
          const els = cards.map((c, idx) => {
            const btn = el("button", "gtut-gh-pic");
            btn.type = "button";
            btn.innerHTML = svgShape(c.s, c.fg, c.bg);
            btn.onclick = () => {
              if (picked.has(idx)) { picked.delete(idx); btn.classList.remove("tut-hi"); ctrl.sfx("tap"); return; }
              picked.add(idx);
              btn.classList.add("tut-hi");
              ctrl.sfx("tap");
              if (picked.size === 3) {
                const arr = [...picked].sort((a, b) => a - b);
                if (arr[0] === 0 && arr[1] === 1 && arr[2] === 2) {
                  cap.textContent = "합! +1점! (세모×3 모두 같고, 색과 배경은 전부 달라요)";
                  ctrl.sfx("good");
                  ctrl.complete();
                } else {
                  cap.textContent = "아쉬워요! 세 장 중 두 장만 같은 속성이 섞였어요(-1점). 4번 대신 같은 세모 3장을 골라 보세요!";
                  arr.forEach(i => { els[i].classList.remove("tut-hi"); els[i].classList.add("tut-bad-cell"); });
                  picked.clear();
                  ctrl.sfx("bad");
                }
              }
            };
            row.appendChild(btn);
            return btn;
          });
          wrap.append(row, cap);
          stage.appendChild(wrap);
        },
      },
    ];
    Tutorial.open({
      id: "genius_gh",
      title: "🔷 결! 합! 1분 규칙",
      steps,
      actions: [
        { label: "👀 AI 구경", onClick: opts?.onWatch },
        { label: "🎮 바로 시작", primary: true, onClick: opts?.onStart },
      ].filter(a => a.onClick),
    });
  }

  function open12(opts) {
    const steps = [
      {
        title: "3×4 작은 판 위의 다섯 가지 말",
        say: "왕(8방향) · 장(앞뒤좌우 4방향) · 상(대각 4방향) · 자(앞 1칸). 말마다 나아갈 수 있는 점만 콕 집어 움직여요!",
        tts: "십이장기는 가로 3칸 세로 4칸에서 왕, 장, 상, 자 네 종류의 말로 겨루는 게임입니다.",
        ms: 4800,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-12");
          const list = el("div", "gtut-12-legend");
          [
            ["왕", "모든 방향 1칸", "적진 끝줄 생존 시 TRY 승!"],
            ["장", "상하좌우 4방향", "가로·세로 수비/공격"],
            ["상", "대각선 4방향", "비스듬히 기습"],
            ["자 → 후", "앞 1칸 → 적진 가면 '후' 승급", "후는 6방향 이동!"],
          ].forEach(([k, a, b], i) => {
            const card = el("div", "gtut-12-card");
            card.innerHTML = `<b>${k}</b><span>${a}</span><em>${b}</em>`;
            list.appendChild(card);
            ctrl.after(() => { card.classList.add("tut-hi"); ctrl.sfx("tap"); }, 400 + i * 700);
          });
          wrap.appendChild(list);
          stage.appendChild(wrap);
        },
      },
      {
        title: "잡은 말은 '포로'로 다시 투입!",
        say: "상대 말을 잡으면 내 포로가 돼요. 내 차례에 빈 칸 어디든 포로를 내려놓을 수 있어요! (단, 상대 맨 끝 줄엔 바로 못 놓아요)",
        tts: "상대 말을 잡으면 내 포로가 되어, 내 차례에 빈 칸에 다시 배치할 수 있습니다.",
        ms: 4800,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-12");
          const msg = el("div", "gtut-cap", "상대 [상]을 잡았다! → 내 포로함 📥 → 내 편 [상]으로 빈 칸 배치!");
          const flow = el("div", "gtut-flow");
          flow.innerHTML = `<span class="pc enemy">상</span><span>잡힘 💥</span><span class="pc res">내 포로 [상]</span><span>배치 ✨</span><span class="pc mine">상</span>`;
          wrap.append(flow, msg);
          stage.appendChild(wrap);
          ctrl.after(() => ctrl.sfx("pop"), 900);
        },
      },
      {
        title: "승리 조건 2가지: ① 왕 잡기 ② 적진 입성(Try)",
        say: "상대 왕을 잡거나, 내 왕이 상대 진영 맨 끝 줄에 들어가 상대 한 턴만 무사히 버티면(Try) 즉시 승리해요!",
        tts: "상대 왕을 잡거나, 내 왕이 상대 끝 줄에 들어가 한 턴을 버티면 승리합니다.",
        ms: 4800,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-12");
          const flow = el("div", "gtut-flow");
          flow.innerHTML = `<span class="pc mine">👑 내 왕</span><span>→ 상대 끝줄 입성</span><span class="pc gold">🏆 TRY 승!</span>`;
          const msg = el("div", "gtut-cap", "단, 들어가자마자 상대에게 잡히면 패배하니 안전할 때 들어가세요!");
          wrap.append(flow, msg);
          stage.appendChild(wrap);
          ctrl.after(() => ctrl.sfx("good"), 1100);
        },
      },
      {
        title: "직접 '자'를 적진으로 보내 '후'로 승급시켜 보세요! (연습)",
        say: "아래 미니 판에서 [자]를 한 칸 앞(맨 윗줄)으로 올려서 강한 [후]로 변신시켜 보세요!",
        tts: "자를 한 칸 앞으로 옮겨 후로 승급시켜 보세요.",
        interactive: true,
        render(stage, ctrl) {
          stage.innerHTML = "";
          const wrap = el("div", "gtut-12");
          const grid = el("div", "gtut-12-mini");
          let sel = false;
          const cap = el("div", "gtut-cap", "먼저 가운데 [자]를 누르고, 맨 윗줄(적진)을 누르세요!");
          const cells = [];
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
              const btn = el("button", "gtut-12-cell" + (r === 0 ? " goal" : ""));
              btn.type = "button";
              if (r === 1 && c === 1) btn.innerHTML = `<span class="pc mine">자</span>`;
              else if (r === 0 && c === 2) btn.innerHTML = `<span class="pc enemy">상</span>`;
              btn.onclick = () => {
                if (!sel) {
                  if (r === 1 && c === 1) {
                    sel = true;
                    btn.classList.add("tut-hi");
                    cells[1].classList.add("tut-hi");
                    cap.textContent = "이제 바로 앞 빈 칸(맨 윗줄 가운데)을 눌러 승급하세요!";
                    ctrl.sfx("tap");
                  }
                } else {
                  if (r === 0 && c === 1) {
                    cells[4].innerHTML = "";
                    cells[4].classList.remove("tut-hi");
                    btn.innerHTML = `<span class="pc mine promo">후 ★</span>`;
                    btn.classList.add("tut-hi");
                    cap.textContent = "승급 성공! [후]는 사방+앞대각 6방향으로 움직여요!";
                    ctrl.sfx("good");
                    ctrl.complete();
                  } else {
                    btn.classList.add("tut-bad-cell");
                    ctrl.sfx("bad");
                  }
                }
              };
              cells.push(btn);
              grid.appendChild(btn);
            }
          }
          wrap.append(grid, cap);
          stage.appendChild(wrap);
        },
      },
    ];
    Tutorial.open({
      id: "genius_12",
      title: "🦁 십이장기 1분 규칙",
      steps,
      actions: [
        { label: "👀 AI 구경", onClick: opts?.onWatch },
        { label: "🎮 바로 시작", primary: true, onClick: opts?.onStart },
      ].filter(a => a.onClick),
    });
  }

  function open(kind, opts) {
    if (kind === "gh") return openGH(opts);
    if (kind === "12") return open12(opts);
    return openBW(opts);
  }

  root.GeniusTutorial = { open };
})(window);

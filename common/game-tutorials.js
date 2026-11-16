/* 베니 아케이드 — 복잡 게임 공용 1분 움직이는 규칙 브리핑 (common/game-tutorials.js)
   · 섯다(seotda) · 포커(poker) · 원카드(onecard) · 윷놀이(yut) · 체스(chess) · 장기(janggi) · 바둑(baduk)
   · common/tutorial.js 위에서 동작하며, 홈 메뉴에 '🎬 1분 규칙 설명' 버튼을 자동 연결 */
(() => {
  if (window.GameTutorials) return;

  const CSS = `
.gt-stage{display:grid;gap:10px;justify-items:center;width:100%}
.gt-row{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}
.gt-card{min-width:54px;padding:8px 10px;border-radius:11px;background:#fff;color:#0f172a;border:2px solid #cbd5e1;
  font:900 17px/1.15 var(--round,sans-serif);text-align:center;box-shadow:0 6px 14px rgba(0,0,0,.38);transition:transform .14s,box-shadow .14s;cursor:default}
.gt-card.red{color:#dc2626}.gt-card.btn{cursor:pointer}.gt-card.sm{min-width:44px;padding:6px 8px;font-size:14px}
.gt-card.dark{background:#1e293b;color:#f8fafc;border-color:#475569}
.gt-card.hw{background:linear-gradient(160deg,#fef3c7,#fde68a);color:#7c2d12;border-color:#d97706}
.gt-badge{padding:4px 10px;border-radius:99px;background:rgba(251,191,36,.16);border:1px solid rgba(251,191,36,.45);color:#fde68a;font:800 12.5px var(--round,inherit)}
.gt-cap{font-size:13px;color:#cbd5e1;text-align:center;line-height:1.45;word-break:keep-all}
.gt-grid{display:grid;gap:3px;padding:6px;background:#1e1b18;border-radius:12px;border:1.5px solid rgba(251,191,36,.35)}
.gt-cell{width:46px;height:46px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#2b231b;color:#f8fafc;
  font:900 18px/1 sans-serif;display:grid;place-items:center;cursor:pointer;padding:0;position:relative}
.gt-cell.lt{background:#d6b88d;color:#1c1917}.gt-cell.dk{background:#8c6239;color:#fef3c7}
.gt-goban{display:grid;grid-template-columns:repeat(4,42px);gap:0;padding:10px;border-radius:12px;background:#dcb35c;border:2px solid #8a5a18;box-shadow:0 6px 18px rgba(0,0,0,.5)}
.gt-gcell{width:42px;height:42px;position:relative;border:0;background:transparent;padding:0;cursor:pointer;display:grid;place-items:center}
.gt-gcell::before{content:"";position:absolute;left:0;right:0;top:50%;height:1.5px;background:#451a03}
.gt-gcell::after{content:"";position:absolute;top:0;bottom:0;left:50%;width:1.5px;background:#451a03}
.gt-stone{position:relative;z-index:2;width:28px;height:28px;border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,.45)}
.gt-stone.b{background:radial-gradient(circle at 32% 30%,#475569,#0f172a 75%);border:1px solid #020617}
.gt-stone.w{background:radial-gradient(circle at 32% 30%,#fff,#cbd5e1 85%);border:1px solid #94a3b8}
.gt-yut{width:20px;height:58px;border-radius:9px;background:linear-gradient(180deg,#f5deb3,#c89d66);border:1.5px solid #78350f;
  display:grid;place-items:center;color:#451a03;font:900 12px sans-serif;box-shadow:0 4px 10px rgba(0,0,0,.45);transition:transform .25s}
.gt-yut.back{background:linear-gradient(180deg,#92400e,#5c280a);color:#fde68a}
.gt-btn{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);
  color:#f8fafc;font:800 13px var(--round,inherit);cursor:pointer}`;

  let styled = false;
  const ensureCss = () => {
    if (styled) return;
    styled = true;
    const s = document.createElement("style");
    s.id = "gtut-shared-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  };

  const DEF = {
    seotda: {
      id: "seotda",
      title: "🔥 정통 섯다 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 2장 족보",
          title: "화투 20장 중 2장으로 서열 대결!",
          body: "1~10월 화투 20장에서 2장을 받아 조합해요. <b>38광땡(최강) > 광땡 > 장땡~1땡 > 알리·독사</b> 순이고, 특수 족보가 없으면 끝자리 합(<b>9끗 최고 · 0끗 망통 최약</b>)으로 겨뤄요.",
          say: "정통 섯다는 스무 장의 화투 중 두 장으로 족보를 겨루는 게임입니다. 삼팔광땡이 가장 높고, 땡과 알리가 뒤를 잇습니다.",
          duration: 5000,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-card hw tut-hi">3월 광</div>
                <div class="gt-card hw tut-hi">8월 광</div>
                <span class="gt-badge">👑 38광땡 (최강)</span>
              </div>
              <div class="gt-cap">광땡 &gt; 땡(같은 달 2장) &gt; 알리(1·2)·독사(1·4) &gt; 9끗~0끗(망통)</div>
            </div>`;
            c.after(() => c.sfx("good"), 650);
          },
        },
        {
          tag: "STEP 2 · 배팅 심리",
          title: "1장 공개 1차 배팅 → 2장 본 배팅!",
          body: "먼저 <b>1장을 모두에게 공개</b>하고 1차 배팅을 한 뒤, 두 번째 장을 받아 본 배팅(<b>콜 · 하프 · 따당 · 다이</b>)을 해요. 패가 약하면 과감히 <b>다이</b>로 돈을 아끼세요!",
          say: "첫 장을 보고 일차 배팅을 한 뒤, 두 번째 장을 받아 본 배팅이나 포기를 결정합니다.",
          duration: 4800,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-card hw">1월 광 (오픈)</div>
                <div class="gt-card dark" id="gtHidden">? (비공개)</div>
              </div>
              <div class="gt-row">
                <span class="gt-badge">1차 배팅</span><span>→</span><span class="gt-badge" id="gtB2">2장 확인</span><span>→</span><span class="gt-badge">콜·하프·다이</span>
              </div>
            </div>`;
            c.after(() => {
              const h = st.querySelector("#gtHidden");
              if (h) { h.className = "gt-card hw tut-hi"; h.textContent = "2월 띠 (알리!)"; }
              c.sfx("flip");
            }, 1300);
          },
        },
        {
          tag: "STEP 3 · 직접 승부",
          title: "상대 '7끗'을 이기는 족보를 골라 보세요!",
          body: "상대가 <b>7끗</b>을 들었어요. 아래 3개 조합 중 상대를 확실히 이기는 패를 눌러 보세요!",
          say: "상대가 칠끗입니다. 상대를 이길 수 있는 강한 족보를 눌러 보세요.",
          interactive: { hint: "👆 상대를 이기는 족보 카드를 누르세요!", doneText: "🎉 정답! 알리(1·2)는 모든 끗수보다 훨씬 강해요." },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-badge">상대 패: 7끗 (2월+5월)</div>
              <div class="gt-row">
                <button type="button" class="gt-card btn dark" data-ch="0">4끗<br><small>(6+8)</small></button>
                <button type="button" class="gt-card btn hw tut-hi" data-ch="1">알리!<br><small>(1+2)</small></button>
                <button type="button" class="gt-card btn dark" data-ch="0">망통<br><small>(3+7)</small></button>
              </div>
              <div class="gt-cap" id="gtMsg">어떤 패로 승부할까요?</div>
            </div>`;
            st.querySelectorAll("[data-ch]").forEach(b => {
              b.onclick = () => {
                if (b.dataset.ch === "1") {
                  st.querySelector("#gtMsg").textContent = "알리(1·2) 승리! 콜이나 하프로 판돈을 가져옵니다.";
                  c.complete();
                } else {
                  b.classList.add("tut-bad-cell");
                  st.querySelector("#gtMsg").textContent = "7끗보다 약해요! 특수 족보 '알리(1+2)'를 눌러 보세요.";
                  c.sfx("bad");
                }
              };
            });
          },
        },
      ],
    },

    poker: {
      id: "poker",
      title: "♠️ 텍사스 홀덤 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 5장 조합",
          title: "내 손패 2장 + 바닥 5장 중 최고의 5장!",
          body: "나만 보는 <b>홀 카드 2장</b>과 모두와 공유하는 <b>바닥 5장(플랍 3·턴 1·리버 1)</b> 합 7장 중 <b>가장 강한 5장 족보</b>를 만든 사람이 판돈을 가져가요.",
          say: "내 카드 두 장과 바닥 카드 다섯 장을 합쳐 가장 강한 다섯 장 족보를 만들면 승리합니다.",
          duration: 5000,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row"><span class="gt-badge">내 패</span><div class="gt-card tut-hi">A♠</div><div class="gt-card tut-hi">K♠</div></div>
              <div class="gt-row"><span class="gt-badge">바닥</span><div class="gt-card sm tut-hi">Q♠</div><div class="gt-card sm tut-hi">J♠</div><div class="gt-card sm tut-hi">10♠</div><div class="gt-card sm red">4♦</div><div class="gt-card sm">2♣</div></div>
              <div class="gt-cap">✨ A·K·Q·J·10♠ 같은 무늬 → 로열 스트레이트 플러시!</div>
            </div>`;
            c.after(() => c.sfx("good"), 800);
          },
        },
        {
          tag: "STEP 2 · 서열 & 액션",
          title: "체크 · 콜 · 레이즈 · 폴드 심리전",
          body: "서열은 <b>원페어 &lt; 투페어 &lt; 트리플 &lt; 스트레이트 &lt; 플러시 &lt; 풀하우스 &lt; 포카드</b> 순! 패가 불리하면 <b>폴드</b>로 빠지고, 좋으면 <b>레이즈</b>로 판돈을 키우세요.",
          say: "체크와 콜, 레이즈, 폴드를 적절히 섞어 상대를 흔드는 심리전 게임입니다.",
          duration: 4800,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <span class="gt-badge">풀하우스</span><span>&gt;</span><span class="gt-badge">플러시</span><span>&gt;</span><span class="gt-badge">스트레이트</span><span>&gt;</span><span class="gt-badge">트리플</span>
              </div>
              <div class="gt-row">
                <span class="gt-btn">체크(패스)</span><span class="gt-btn">콜(맞추기)</span><span class="gt-btn tut-hi">레이즈(올리기)</span><span class="gt-btn">폴드(포기)</span>
              </div>
            </div>`;
            c.after(() => c.sfx("tap"), 900);
          },
        },
        {
          tag: "STEP 3 · 직접 고르기",
          title: "바닥 카드와 어울려 '풀하우스'를 만드는 패는?",
          body: "바닥에 <b>K♥ K♦ 7♣ 7♠ 2♥</b>가 깔렸어요. 이길 확률이 가장 높은 홀 카드를 골라 보세요!",
          say: "바닥에 킹 두 장과 칠 두 장이 있습니다. 풀하우스를 완성하는 손패를 골라 보세요.",
          interactive: { hint: "👆 풀하우스(같은 숫자 3장+2장)가 완성되는 손패를 누르세요!", doneText: "🎉 정답! K 3장 + 7 2장 '킹 풀하우스' 완성!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row"><div class="gt-card sm red">K♥</div><div class="gt-card sm red">K♦</div><div class="gt-card sm">7♣</div><div class="gt-card sm">7♠</div><div class="gt-card sm red">2♥</div></div>
              <div class="gt-row">
                <button type="button" class="gt-btn tut-hi" data-ok="1">K♣ 9♠</button>
                <button type="button" class="gt-btn" data-ok="0">A♦ J♣</button>
                <button type="button" class="gt-btn" data-ok="0">5♣ 6♠</button>
              </div>
              <div class="gt-cap" id="gtMsg">바닥의 K·K·7·7과 짝이 맞는 카드는?</div>
            </div>`;
            st.querySelectorAll("[data-ok]").forEach(b => {
              b.onclick = () => {
                if (b.dataset.ok === "1") { st.querySelector("#gtMsg").textContent = "완벽해요! K-K-K-7-7 풀하우스로 압승합니다!"; c.complete(); }
                else { b.classList.add("tut-bad-cell"); st.querySelector("#gtMsg").textContent = "바닥과 짝이 맞아야 풀하우스가 됩니다. K♣ 9♠를 눌러 보세요!"; c.sfx("bad"); }
              };
            });
          },
        },
      ],
    },

    onecard: {
      id: "onecard",
      title: "☝️ 원카드 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 기본 규칙",
          title: "같은 무늬 또는 같은 숫자 내기!",
          body: "바닥 맨 위 카드와 <b>무늬</b>나 <b>숫자</b>가 같으면 낼 수 있어요. 낼 카드가 없으면 더미에서 1장 먹고, <b>내 손패를 제일 먼저 0장</b> 만들면 승리!",
          say: "맨 위 카드와 무늬나 숫자가 같은 카드를 내어 손패를 모두 털면 이깁니다.",
          duration: 4600,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div><div class="gt-cap">바닥 맨 위</div><div class="gt-card">♠ 7</div></div>
                <span>← 가능 →</span>
                <div class="gt-card tut-hi">♠ J</div>
                <div class="gt-card red tut-hi">♥ 7</div>
              </div>
              <div class="gt-cap">무늬(♠) 또는 숫자(7) 중 하나만 같으면 OK!</div>
            </div>`;
            c.after(() => c.sfx("pop"), 800);
          },
        },
        {
          tag: "STEP 2 · 공격 & 특수카드",
          title: "공격은 더 센 카드로 막고 넘기세요!",
          body: "<b>2(+2) → A(+3) → ♠A(+5) → 조커(+5~7)</b> 공격이 날아오면 <b>동급 이상 공격 카드</b>로 누적해 다음 사람에게 넘길 수 있어요! 1장 남으면 <b>☝️ 원카드!</b> 꼭 누르기!",
          say: "공격 카드는 같은 급 이상의 공격 카드로 방어해 다음 사람에게 넘길 수 있습니다.",
          duration: 5000,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-card red">♥ 2<br><small>+2</small></div><span>→</span>
                <div class="gt-card">♣ A<br><small>+5</small></div><span>→</span>
                <div class="gt-card tut-hi">🃏 조커<br><small>+10!</small></div>
              </div>
              <div class="gt-cap">7(무늬바꿈) · J(점프) · Q(방향반대) · K(한번더)</div>
            </div>`;
            c.after(() => c.sfx("tap"), 900);
          },
        },
        {
          tag: "STEP 3 · 직접 방어하기",
          title: "상대 ♥ 2(+2장) 공격을 막아 넘겨 보세요!",
          body: "지금 안 막으면 카드 2장을 먹어야 해요! 아래 손패 중 공격을 받아칠 수 있는 카드를 눌러 보세요.",
          say: "하트 투 공격이 들어왔습니다. 막아 넘길 수 있는 카드를 눌러 보세요.",
          interactive: { hint: "👆 2 또는 A 또는 조커 카드를 눌러 방어하세요!", doneText: "🎉 방어 성공! 다음 사람에게 공격을 넘겼어요!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-badge">들어온 공격: ♥ 2 (+2장)</div>
              <div class="gt-row">
                <button type="button" class="gt-card btn red tut-hi" data-ok="1">♦ 2</button>
                <button type="button" class="gt-card btn" data-ok="0">♠ 9</button>
                <button type="button" class="gt-card btn red" data-ok="0">♥ Q</button>
              </div>
              <div class="gt-cap" id="gtMsg">일반 하트 카드로는 공격을 못 막아요!</div>
            </div>`;
            st.querySelectorAll("[data-ok]").forEach(b => {
              b.onclick = () => {
                if (b.dataset.ok === "1") { st.querySelector("#gtMsg").textContent = "나이스! ♦ 2로 받아쳐 +4장 공격으로 넘겼습니다!"; c.complete(); }
                else { b.classList.add("tut-bad-cell"); st.querySelector("#gtMsg").textContent = "공격 상태에선 일반 카드(9, Q)를 못 내요. ♦ 2를 누르세요!"; c.sfx("bad"); }
              };
            });
          },
        },
      ],
    },

    yut: {
      id: "yut",
      title: "🎲 윷놀이 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 윷가락 5가지 + 백도",
          title: "도·개·걸·윷·모! 윷·모·잡기는 한 번 더!",
          body: "젖혀진(배 보인) 개수대로 <b>도(1) · 개(2) · 걸(3) · 윷(4) · 모(5)</b>! 표시된 한 개만 젖혀지면 <b>뒤로 1칸(백도)</b>이에요. <b>윷·모</b>가 나오거나 상대 말을 잡으면 <b>한 번 더</b> 던져요!",
          say: "도와 개, 걸, 윷, 모 칸수만큼 이동하고, 윷이나 모 또는 상대를 잡으면 한 번 더 던집니다.",
          duration: 5000,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-yut">✕</div><div class="gt-yut">○</div><div class="gt-yut">○</div><div class="gt-yut back">■</div>
              </div>
              <div class="gt-cap" id="gtY">젖혀진 3개 → <b>걸 (3칸)!</b> (모두 등이면 <b>모 5칸 · 한번더!</b>)</div>
            </div>`;
            c.after(() => {
              const y = st.querySelectorAll(".gt-yut")[3];
              if (y) { y.classList.remove("back"); y.classList.add("tut-hi"); y.textContent = "○"; }
              st.querySelector("#gtY").innerHTML = "4개 모두 배 → <b>윷 (4칸) + 한 번 더! 🎉</b>";
              c.sfx("good");
            }, 1500);
          },
        },
        {
          tag: "STEP 2 · 업기 · 잡기 · 지름길",
          title: "꼭짓점에 정확히 멈추면 지름길 진입!",
          body: "모서리(오른쪽 위·왼쪽 위)에 <b>딱 멈추면 대각선 지름길</b>로 가로지를 수 있어요! 내 말끼리 만나면 <b>업고</b> 함께 달리고, 상대 말 위에 멈추면 <b>잡아 돌려보내요</b>.",
          say: "모서리에 정확히 멈추면 지름길로 갈 수 있고, 내 말을 업어서 함께 이동할 수도 있습니다.",
          duration: 4800,
          render(st) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <span class="gt-badge">🐎+🐎 업기 (같이 이동!)</span>
                <span class="gt-badge">💥 잡기 (한 번 더!)</span>
                <span class="gt-badge">↗️ 모서리 지름길</span>
              </div>
              <div class="gt-cap">말 4개가 먼저 참(출발점)을 통과해 골인하면 승리!</div>
            </div>`;
          },
        },
        {
          tag: "STEP 3 · 직접 잡아보기",
          title: "'개(2칸)'가 나왔어요! 상대 말을 잡아 보세요!",
          body: "내 말(🔵)이 1번 칸에 있고, 상대 말(🔴)이 3번 칸에 있어요. 두 칸 앞 상대 말 칸을 눌러 잡아 보세요!",
          say: "개가 나왔습니다. 두 칸 앞의 상대 말을 눌러 잡고 한 번 더 던져 보세요.",
          interactive: { hint: "👆 2칸 앞 🔴 상대 말 칸을 눌러 잡으세요!", doneText: "🎉 쾅! 상대 말을 잡고 보너스 한 번 더 획득!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-badge">나온 윷: 개 (2칸)</div>
              <div class="gt-row">
                <span class="gt-cell">🔵 1</span><span>→</span><span class="gt-cell">2</span><span>→</span>
                <button type="button" class="gt-cell tut-hi" data-hit="1">🔴 3</button><span>→</span><span class="gt-cell">4</span>
              </div>
            </div>`;
            st.querySelector("[data-hit]").onclick = e => {
              e.currentTarget.textContent = "🔵 3!";
              c.complete();
            };
          },
        },
      ],
    },

    chess: {
      id: "chess",
      title: "♟️ 체스 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 핵심 기물",
          title: "여섯 가지 말의 움직임만 알면 끝!",
          body: "<b>퀸(♛)</b>은 직선+대각 무한, <b>룩(♜)</b>은 십자 무한, <b>비숍(♝)</b>은 대각 무한, <b>나이트(♞)</b>는 유일하게 기물을 뛰어넘는 L자 이동! <b>폰(♟)</b>은 앞으로 1칸(대각선 공격).",
          say: "퀸은 모든 방향, 룩은 직선, 비숍은 대각선, 나이트는 엘 자로 뛰어넘어 이동합니다.",
          duration: 5000,
          render(st) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-card dark">♛<br><small>직+대각</small></div>
                <div class="gt-card dark">♜<br><small>십자직선</small></div>
                <div class="gt-card dark">♝<br><small>대각선</small></div>
                <div class="gt-card dark tut-hi">♞<br><small>L자 점프</small></div>
              </div>
              <div class="gt-cap">폰이 상대 끝줄에 닿으면 원하는 기물(보통 ♛ 퀸)로 승급해요!</div>
            </div>`;
          },
        },
        {
          tag: "STEP 2 · 체크와 체크메이트",
          title: "피할 곳이 하나도 없으면 체크메이트 승리!",
          body: "킹(♚)을 공격하는 건 <b>체크</b>(반드시 피해야 함), 어느 칸으로도 피하거나 막을 수 없는 상태가 <b>체크메이트(승리!)</b>예요. 막혀서 둘 수 없는데 체크가 아니면 <b>스테일메이트(무승부)</b>!",
          say: "상대 킹이 공격을 피할 길이 전혀 없게 만들면 체크메이트로 승리합니다.",
          duration: 4800,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row"><span class="gt-badge">♚ 공격 = 체크</span><span>→</span><span class="gt-badge tut-hi">피할 곳 0 = 🏆 체크메이트!</span></div>
              <div class="gt-cap">캐슬링: 킹과 룩 사이가 비어 있고 둘 다 안 움직였을 때 한 번에 안전 수비!</div>
            </div>`;
            c.after(() => c.sfx("tap"), 800);
          },
        },
        {
          tag: "STEP 3 · 직접 체크메이트",
          title: "퀸(♕)을 옮겨 한 수 체크메이트를 만들어 보세요!",
          body: "우리 <b>룩(♖)</b>이 2번째 줄을 지키고 있어요. 아래 판에서 <b>퀸(♕)</b>을 검은 킹(♚) 바로 앞 칸으로 옮겨 메이트해 보세요!",
          say: "하얀 퀸을 검은 킹 바로 앞 칸으로 옮겨 체크메이트를 완성해 보세요.",
          interactive: { hint: "👆 ♕(퀸)을 누른 뒤 검은 킹 바로 아래 칸을 누르세요!", doneText: "🎉 체크메이트! 룩의 보호 덕분에 킹이 퀸을 잡을 수 없어요!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage"><div class="gt-grid" style="grid-template-columns:repeat(3,46px)" id="gtCh"></div></div>`;
            const g = st.querySelector("#gtCh");
            const pos = { "0,1": "♚", "1,0": "♖", "2,2": "♕" };
            let sel = false;
            for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "gt-cell " + ((r + col) % 2 === 0 ? "lt" : "dk");
              btn.textContent = pos[`${r},${col}`] || "";
              if (r === 2 && col === 2) btn.classList.add("tut-hi");
              btn.onclick = () => {
                if (!sel) {
                  if (r === 2 && col === 2) { sel = true; btn.classList.remove("tut-hi"); g.children[4].classList.add("tut-hi"); c.sfx("tap"); }
                } else if (r === 1 && col === 1) {
                  g.children[8].textContent = "";
                  btn.textContent = "♕";
                  btn.classList.add("tut-hi");
                  c.complete();
                } else { c.sfx("bad"); }
              };
              g.appendChild(btn);
            }
          },
        },
      ],
    },

    janggi: {
      id: "janggi",
      title: "🏮 장기 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 궁성 & 포(包)",
          title: "포(包)는 반드시 다른 말 '하나'를 뛰어넘어요!",
          body: "차(車)는 직선 무제한, 그리고 장기만의 핵심 <b>포(包)</b>는 <b>앞에 다리(아군/적군 상관없이 1개, 단 포는 제외)가 있을 때만</b> 그 말을 뛰어넘어 가거나 잡을 수 있어요.",
          say: "장기의 포는 반드시 다른 기물 하나를 다리로 삼아 뛰어넘어야만 이동하고 공격할 수 있습니다.",
          duration: 5000,
          render(st) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <div class="gt-card">포</div><span>→</span><div class="gt-card dark">쫄 (다리 1개!)</div><span>→</span><div class="gt-card red tut-hi">💥 궁 장군!</div>
              </div>
              <div class="gt-cap">※ 포는 포를 넘을 수도, 포를 잡을 수도 없어요!</div>
            </div>`;
          },
        },
        {
          tag: "STEP 2 · 마·상 길목(멱) & 외통",
          title: "마(馬)와 상(象)은 첫 칸이 막히면(멱) 못 가요!",
          body: "마는 직선1+대각1, 상은 직선1+대각2 이동! 출발 직전 길목(멱)에 다른 말이 있으면 막혀요. 궁성 안 대각선 줄도 탈 수 있고, 피할 수 없으면 <b>외통수(승리)</b>!",
          say: "마와 상은 길목에 말이 걸리면 이동할 수 없고, 상대 궁을 외통으로 몰면 이깁니다.",
          duration: 4800,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row">
                <span class="gt-badge">馬: 직1+대각1</span>
                <span class="gt-badge">象: 직1+대각2</span>
                <span class="gt-badge tut-hi">궁성: 대각선 이동 OK</span>
              </div>
            </div>`;
            c.after(() => c.sfx("tap"), 800);
          },
        },
        {
          tag: "STEP 3 · 직접 포 장군!",
          title: "'포'로 다리(병)를 넘어 한나라 '궁'을 장군 쳐 보세요!",
          body: "맨 아래 <b>초(포)</b>를 누른 뒤 가운데 <b>졸(다리)</b>을 뛰어넘어 맨 위 <b>한(궁)</b> 칸을 눌러 보세요!",
          say: "아래 포를 누른 뒤 다리를 넘어 위쪽 한나라 궁을 눌러 장군을 불러 보세요.",
          interactive: { hint: "👆 [초 포]를 누른 뒤 [한 궁]을 눌러 뛰어넘기 장군!", doneText: "🎉 장군! 포는 다리 1개를 넘어 바로 공격할 수 있어요!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage"><div class="gt-grid" style="grid-template-columns:56px" id="gtJg"></div></div>`;
            const g = st.querySelector("#gtJg");
            const lane = ["한(궁)", "빈칸", "졸(다리)", "초(포)"];
            let sel = false;
            lane.forEach((lbl, idx) => {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "gt-cell lt" + (idx === 3 ? " tut-hi" : "");
              btn.style.width = "76px"; btn.style.fontSize = "13px";
              btn.textContent = lbl;
              btn.onclick = () => {
                if (!sel) {
                  if (idx === 3) { sel = true; btn.classList.remove("tut-hi"); g.children[0].classList.add("tut-hi"); c.sfx("tap"); }
                } else if (idx === 0) {
                  g.children[3].textContent = "빈칸";
                  btn.textContent = "초(포) 장군!";
                  btn.classList.add("tut-hi");
                  c.complete();
                } else { c.sfx("bad"); }
              };
              g.appendChild(btn);
            });
          },
        },
      ],
    },

    baduk: {
      id: "baduk",
      title: "⚫⚪ 바둑 1분 규칙",
      steps: [
        {
          tag: "STEP 1 · 숨구멍(활로)",
          title: "선으로 이어진 빈 칸이 돌의 '생명(활로)'!",
          body: "바둑돌은 선이 교차하는 점에 둬요. 돌 상하좌우로 연결된 빈 칸이 <b>활로</b>이고, 활로가 <b>딱 1개</b>만 남으면 <b>단수(위기!)</b>, 다 막히면 돌이 따여요.",
          say: "돌의 상하좌우에 연결된 빈 칸이 숨구멍이며, 마지막 하나까지 막히면 돌을 따냅니다.",
          duration: 4800,
          render(st, c) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row"><div class="gt-stone w"></div><span>← 3면이 막히면</span><span class="gt-badge">단수 (숨구멍 1개)</span><span>→ 막으면 💥 따냄!</span></div>
              <div class="gt-cap">※ 연결된 같은 색 돌들은 숨구멍(활로)을 함께 공유해요.</div>
            </div>`;
            c.after(() => c.sfx("tap"), 900);
          },
        },
        {
          tag: "STEP 2 · 집 짓기 & 덤",
          title: "내 돌로 둘러싼 빈 공간('집') + 따낸 돌이 점수!",
          body: "바둑의 목표는 상대보다 더 넓은 <b>빈 공간(집)</b>을 자기 색으로 둘러싸는 거예요. 먼저 두는 흑이 유리하므로 보통 백에게 <b>덤(6집 반)</b>을 줘요.",
          say: "자기 돌로 둘러싼 빈 칸인 집과 따낸 돌을 합쳐 더 많은 쪽이 이깁니다.",
          duration: 4800,
          render(st) {
            st.innerHTML = `<div class="gt-stage">
              <div class="gt-row"><span class="gt-badge">⬛ 둘러싼 빈 칸 = 내 집</span><span class="gt-badge">+ 💥 따낸 상대 돌</span></div>
              <div class="gt-cap">※ 방금 1점 따낸 자리에 곧장 되따내는 건 <b>패(한 수 쉬고 둘 수 있음)</b> 규칙으로 금지!</div>
            </div>`;
          },
        },
        {
          tag: "STEP 3 · 직접 따내기",
          title: "단수에 몰린 백 돌(⚪)을 따내 보세요!",
          body: "가운데 백 돌 1점의 활로가 아래 1칸만 남았어요. <b>노랗게 표시된 마지막 자리</b>를 눌러 백 돌을 잡아 보세요!",
          say: "백 돌이 단수에 몰려 있습니다. 노랗게 반짝이는 마지막 숨구멍에 흑돌을 두어 따내 보세요.",
          interactive: { hint: "👆 백 돌 아래 반짝이는 교차점을 눌러 따내세요!", doneText: "🎉 찰칵! 백 돌 1점을 깔끔하게 따냈어요!" },
          render(st, c) {
            st.innerHTML = `<div class="gt-stage"><div class="gt-goban" id="gtBd"></div></div>`;
            const bd = st.querySelector("#gtBd");
            // 4x4 교차점: (1,1)=w, (0,1)=b, (1,0)=b, (1,2)=b, target=(2,1)
            const map = { "0,1": "b", "1,0": "b", "1,2": "b", "1,1": "w" };
            for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "gt-gcell" + (r === 2 && col === 1 ? " tut-hi" : "");
              const stn = map[`${r},${col}`];
              if (stn) btn.innerHTML = `<span class="gt-stone ${stn}"></span>`;
              btn.onclick = () => {
                if (r === 2 && col === 1) {
                  btn.innerHTML = `<span class="gt-stone b"></span>`;
                  btn.classList.remove("tut-hi");
                  bd.children[5].innerHTML = ""; // (1,1) 백돌 따냄!
                  c.complete();
                } else { c.sfx("bad"); }
              };
              bd.appendChild(btn);
            }
          },
        },
      ],
    },
  };

  function open(gameId) {
    ensureCss();
    const d = DEF[gameId];
    if (!d || !window.Tutorial) return false;
    Tutorial.open(d);
    return true;
  }

  function autoWire() {
    if (typeof document === "undefined") return;
    const m = location.pathname.match(/\/([a-z]+)\/(?:index\.html)?$/i);
    const gid = m && m[1];
    if (!gid || !DEF[gid]) return;
    const row = document.querySelector("#home .row.center.minor, #menuCard .row.center.minor");
    if (row && !document.getElementById("tutBtn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.id = "tutBtn";
      btn.textContent = "🎬 1분 규칙 설명";
      btn.onclick = () => open(gid);
      row.prepend(btn);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoWire);
  else autoWire();

  window.GameTutorials = { open, ids: Object.keys(DEF) };
})();
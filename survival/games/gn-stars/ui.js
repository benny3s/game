/* 베니 서바이벌 · 별자리 게임 — 화면 (테이블의 별 · 폭탄 · 플레이어별 별자리 · 카드 1~5 · 가져가기 · 교환 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-stars"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NEED = G.NEED, COL = G.COL, CN = G.CN, CP = G.CP;
  const CSS = `
.st-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.st-rd{font:900 14px var(--round);color:#fff;background:rgba(99,102,241,.28);border:1px solid rgba(165,180,252,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.st-bg{font:800 12px var(--round);color:var(--soft);white-space:nowrap}
.st-tab{flex:none;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:7px;border-radius:14px;background:linear-gradient(135deg,rgba(30,27,75,.75),rgba(0,0,0,.35));border:1px solid rgba(165,180,252,.4)}
.st-tab .it{display:grid;justify-items:center;gap:0;font:900 19px var(--round);line-height:1.1;padding:3px 0;border-radius:10px;background:rgba(255,255,255,.05)}
.st-tab .it small{font:700 10px var(--round);color:var(--soft)}
.st-tab .it.z{opacity:.35}
.st-tab .it.b b{filter:none}
.c0{color:#f87171}.c1{color:#facc15}.c2{color:#60a5fa}.c3{color:#4ade80}
.st-pls{flex:none;display:grid;gap:3px}
.st-p{display:grid;grid-template-columns:54px 30px 1fr auto 24px;gap:4px;align-items:center;padding:3px 6px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12);font:700 12px var(--round);color:var(--soft)}
.st-p.me{border-color:#fde68a;background:rgba(253,230,138,.1)}
.st-p.on{box-shadow:0 0 0 2px rgba(56,189,248,.55)}
.st-p.out{opacity:.55}
.st-p .nm{color:#fff;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-p .cd{display:grid;place-items:center;height:22px;border-radius:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);font:900 14px var(--round);color:#fff}
.st-p .cd.x{color:#fca5a5;text-decoration:line-through;border-color:rgba(252,165,165,.5)}
.st-p .cd.ok{color:#86efac;border-color:rgba(134,239,172,.5)}
.st-p .cs{display:flex;gap:3px;flex-wrap:nowrap;min-width:0}
.st-p .cs i{font-style:normal;font:900 12px var(--round);padding:1px 4px;border-radius:7px;background:rgba(255,255,255,.07);white-space:nowrap}
.st-p .cs i small{font:700 10px var(--round);color:var(--soft)}
.st-p .cs i.dn{background:rgba(255,255,255,.18);box-shadow:0 0 0 1.5px currentColor inset}
.st-p .bm{font-size:12px;white-space:nowrap}
.st-p .pt{font:900 14px var(--round);color:#fde68a;text-align:right}
.st-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.st-info b{color:#fde68a}
.st-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.st-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.st-cards button{display:grid;justify-items:center;padding:6px 0 5px;border-radius:12px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;font:900 22px var(--round);cursor:pointer;line-height:1.05}
.st-cards button small{font:700 10px var(--round);color:var(--soft)}
.st-cards button.sel{border-color:#fde68a;background:rgba(253,230,138,.2)}
.st-cards button:disabled{opacity:.4;cursor:default}
.st-swap{display:grid;gap:4px;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.28);font:800 12px var(--round);color:#e2e8f0}
.st-swap .row{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.st-swap button{padding:3px 9px;border-radius:99px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font:900 13px var(--round);cursor:pointer}
.st-pick{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.st-pick .c{display:grid;justify-items:center;gap:2px;padding:5px 2px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.16);font:900 17px var(--round)}
.st-pick .c small{font:700 10px var(--round);color:var(--soft)}
.st-pick .c .stp{display:flex;gap:3px;align-items:center}
.st-pick .c button{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);background:rgba(255,255,255,.1);color:#fff;font:900 16px var(--round);cursor:pointer;padding:0;line-height:1}
.st-pick .c button:disabled{opacity:.3;cursor:default}
.st-pick .c .n{min-width:14px;text-align:center;color:#fde68a;font-size:17px}
.st-pick .c.z{opacity:.3}
.st-res{flex:none;display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.st-res span{padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font:800 12px var(--round);color:#e2e8f0;white-space:nowrap}
.st-res span.x{color:#fca5a5;border-color:rgba(252,165,165,.4)}
.st-res span.me{border-color:#fde68a;color:#fde68a}
.st-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.st-tut .st-pls{width:100%}
@media (max-height:780px){.st-tab .it{font-size:17px}.st-p{padding:2px 5px}.st-acts{gap:5px}.st-cards button{font-size:19px;padding:4px 0}.st-info{font-size:11.5px}}
@media (max-height:690px){.st-tab .it small{display:none}.st-p .cd{height:19px;font-size:13px}.st-p{font-size:11px}.st-cards button small{display:none}.st-pick .c small{display:none}.st-res span{font-size:11px;padding:1px 6px}.st-bg{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.phase}|${V.picker}`;
    if (!RS || RS.key !== key) RS = { key, sel: 0, take: [0, 0, 0, 0, 0] };
    return RS;
  };
  const stars = (x, c) => (x > 0 ? `<b class="c${c}">${"★".repeat(Math.min(x, 6))}${x > 6 ? x : ""}</b>` : "");
  const takeTxt = t => t.map((x, c) => (x > 0 ? (c < 4 ? stars(x, c) : `💣${x > 1 ? x : ""}`) : "")).filter(Boolean).join("") || "빈손";
  function tableHtml(V) {
    const cell = c => `<div class="it c${c} ${V.table[c] ? "" : "z"}"><b>★</b>${V.table[c]}<small>${COL[c]}</small></div>`;
    return `<div class="st-tab">${[0, 1, 2, 3].map(cell).join("")}<div class="it b ${V.tbomb ? "" : "z"}"><b>💣</b>${V.tbomb}<small>폭탄</small></div></div>`;
  }
  function playersHtml(V, ctx, me) {
    const shown = V.rev;
    return `<div class="st-pls">${[...Array(V.n).keys()].map(i => {
      let cd = "·", cls = "";
      if (shown) { cd = shown.cards[i]; cls = shown.elim[i] ? "x" : ""; }
      else if (V.phase === "card") { if (i === me && V.mine) { cd = V.mine; cls = "ok"; } else if (V.cards && V.cards[i]) { cd = V.cards[i]; } else cd = V.done[i] ? "✅" : "⏳"; }
      const stars4 = [0, 1, 2, 3].map(c => `<i class="c${c} ${V.hold[i][c] >= NEED[c] ? "dn" : ""}">★${V.hold[i][c]}<small>/${NEED[c]}</small></i>`).join("");
      return `<div class="st-p ${i === me ? "me" : ""} ${V.needs.includes(i) && !V.over ? "on" : ""} ${V.bombs[i] >= 3 ? "out" : ""}"><span class="nm">${i === me ? "나" : esc(nameOf(ctx, i))}</span><span class="cd ${cls}">${cd}</span><span class="cs">${stars4}</span><span class="bm">${V.bombs[i] ? "💣".repeat(V.bombs[i]) : ""}</span><span class="pt" title="승점">${V.points[i]}</span></div>`;
    }).join("")}</div>`;
  }
  function resHtml(V, ctx, me) {
    if (!V.rev) return "";
    const nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    const ex = V.rev.elim.map((e, i) => (e ? i : -1)).filter(i => i >= 0);
    return `<div class="st-res">${V.rev.takes.map(t => `<span class="${t.s === me ? "me" : ""}">${nm(t.s)} <small>(${t.k})</small> ➜ ${takeTxt(t.take)}</span>`).join("")}${ex.length ? `<span class="x">겹쳐서 제외: ${ex.map(i => `${nm(i)}(${V.rev.cards[i]})`).join(" ")}</span>` : ""}</div>`;
  }
  function swapHtml(V, me) {
    const rows = [0, 1, 2, 3].filter(x => G.freeOf(V.hold[me], x) >= 3).map(x => `<div class="row"><b class="c${x}">★</b> ${COL[x]} 3개 ➜ ${[0, 1, 2, 3].filter(y => y !== x && V.bag[y] > 0).map(y => `<button data-sw="${x}-${y}" class="c${y}">★</button>`).join("")}</div>`);
    return rows.length ? `<div class="st-swap"><div>🔄 같은 색 3개 = 원하는 색 1개 (눌러서 교환)</div>${rows.join("")}</div>` : "";
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const left = V.bag.reduce((a, b) => a + b, 0);
    let h = `<div class="st-top"><span class="st-rd">${V.round}라운드</span><span class="st-bg">별 ${left}개 남음 · 별자리 3개 완성 · 폭탄 3개면 끝</span></div>`;
    h += tableHtml(V);
    h += playersHtml(V, ctx, watch ? -1 : me);
    let acts = "";
    if (V.phase === "card") {
      if (watch) h += `<div class="st-info">구경 중 — ${V.done.filter(Boolean).length}/${V.n}명이 카드를 냈어요</div>`;
      else if (V.mine) h += `<div class="st-info">✅ <b>${V.mine}번</b> 카드를 냈어요 — 다른 사람을 기다려요…</div>`;
      else if (mine) {
        h += `<div class="st-info">카드 1~5 중 하나를 비밀로 내요. <b>같은 숫자를 낸 사람은 제외</b> · 낮은 숫자부터 그 숫자만큼 가져가요</div>`;
        acts = `<div class="st-acts">${swapHtml(V, me)}<div class="st-cards">${[1, 2, 3, 4, 5].map(c => `<button data-c="${c}" class="${S.sel === c ? "sel" : ""}">${c}<small>${c}개</small></button>`).join("")}</div><button class="btn big primary" data-a="card" ${S.sel ? "" : "disabled"}>${S.sel ? `${S.sel}번 카드 내기` : "카드를 골라요"}</button></div>`;
      } else h += `<div class="st-info">다른 사람이 정하는 중이에요…</div>`;
    } else if (V.phase === "pick") {
      h += resHtml(V, ctx, watch ? -1 : me);
      if (mine && V.picker === me) {
        const sum = S.take.reduce((a, b) => a + b, 0);
        h += `<div class="st-info">내 차례! 테이블에서 <b>${V.pickK}개</b>를 골라요 (지금 ${sum}개) — 폭탄은 되도록 피해요</div>`;
        const tb = [...V.table, V.tbomb];
        acts = `<div class="st-acts">${swapHtml(V, me)}<div class="st-pick">${tb.map((tc, t) => `<div class="c ${tc ? "" : "z"} ${t < 4 ? "c" + t : ""}"><b>${t < 4 ? "★" : "💣"}</b><div class="stp"><button data-m="${t}" ${S.take[t] > 0 ? "" : "disabled"}>−</button><span class="n">${S.take[t]}</span><button data-p="${t}" ${S.take[t] < tc && sum < V.pickK ? "" : "disabled"}>+</button></div><small>테이블 ${tc}</small></div>`).join("")}</div><button class="btn big primary" data-a="take" ${sum === V.pickK ? "" : "disabled"}>${sum === V.pickK ? "이대로 가져가기" : `${V.pickK - sum}개 더 골라요`}</button></div>`;
      } else h += `<div class="st-info">${V.picker === me && !watch ? "" : `<b>${esc(nameOf(ctx, V.picker))}</b>가 ${V.pickK}개를 고르는 중이에요…`}</div>`;
    } else {
      h += resHtml(V, ctx, watch ? -1 : me);
      h += `<div class="st-info">${V.over ? (V.why === "bomb" ? `💥 ${V.loser === me ? "내가" : esc(nameOf(ctx, V.loser)) + "가"} 폭탄 3개!` : (V.why === "cons" ? "🌟 별자리 3개 완성!" : "별을 다 나눴어요") + (V.loser >= 0 ? ` · 승점 꼴찌(탈락 후보): ${V.loser === me ? "나" : esc(nameOf(ctx, V.loser))}` : "")) : "곧 다음 라운드가 시작돼요…"}</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.sw) { const [x, y] = t.dataset.sw.split("-").map(Number); ctx.sfx("tap"); ctx.act({ t: "swap", from: x, to: y }); return; }
      if (t.dataset.c) { S.sel = +t.dataset.c; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.p !== undefined) { S.take[+t.dataset.p]++; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.m !== undefined) { S.take[+t.dataset.m]--; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "card" && S.sel) { ctx.sfx("pop"); ctx.act({ t: "card", c: S.sel }); return; }
      if (t.dataset.a === "take") { ctx.sfx("pop"); ctx.act({ t: "take", take: S.take.slice() }); }
    };
  }
  function result(V) {
    const why = V.why === "bomb" ? "폭탄 3개로 끝" : V.why === "cons" ? "별자리 3개 완성으로 끝" : "별이 바닥나서 끝";
    return `<b>${V.round}라운드</b> · ${why} · 승점 ${V.points.join(" · ")}`;
  }
  function tutorial() {
    style();
    const row = (nm, cd, cls, vals, bm, pt) => `<div class="st-p ${cls || ""}"><span class="nm">${nm}</span><span class="cd ${cd === "×" ? "x" : ""}">${cd}</span><span class="cs">${vals.map((v, c) => `<i class="c${c} ${v >= NEED[c] ? "dn" : ""}">★${v}<small>/${NEED[c]}</small></i>`).join("")}</span><span class="bm">${bm}</span><span class="pt">${pt}</span></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "별을 모아 별자리를 완성해요", body: "별자리는 4가지예요. <b>🔴 양자리 3개 → 2점 · 🟡 화살자리 4개 → 3점 · 🔵 카시오페아 5개 → 5점 · 🟢 거문고자리 6개 → 7점</b>. 별이 모이면 저절로 완성돼요. 최종 우승은 별자리 개수가 아니라 <b>승점 합계</b>가 높은 사람이에요.",
        boardHtml: `<div class="st-tut"><div class="st-pls">${row("나", "·", "me", [3, 4, 2, 0], "", 5)}</div></div>`, ms: 6600 },
      { tag: "STEP 2 · 카드", title: "카드를 동시에 내요 — 같은 숫자는 제외!", body: "라운드마다 테이블에 <b>별 여러 개와 폭탄 1개</b>가 놓여요. 모두 <b>1~5 카드 한 장</b>을 비밀로 내고 동시에 공개해요. <b>같은 숫자를 낸 사람끼리는 이번 라운드에서 전부 제외</b>돼요. 남은 사람은 <b>낮은 숫자부터</b> 차례로 그 숫자만큼 테이블에서 가져가요.",
        boardHtml: `<div class="st-tut"><div class="st-pls">${row("가", 1, "", [0, 0, 0, 0], "", 0)}${row("나", 2, "me", [0, 0, 0, 0], "", 0)}${row("다", "×", "", [0, 0, 0, 0], "", 0)}${row("라", "×", "", [0, 0, 0, 0], "", 0)}${row("마", 5, "", [0, 0, 0, 0], "", 0)}</div></div>`, ms: 7600 },
      { tag: "STEP 3 · 폭탄", title: "폭탄 3개를 받으면 탈락이에요", body: "테이블에는 <b>💣 폭탄</b>도 있어요. 별이 먼저 떨어지면 높은 숫자를 낸 사람이 폭탄을 떠안기 쉬워요. <b>폭탄 3개를 받으면 그 즉시 게임이 끝나고 탈락</b>이에요. 별만 많이 모으려고 높은 숫자만 내면 위험해요!",
        boardHtml: `<div class="st-tut"><div class="st-pls">${row("나", 5, "me", [1, 0, 1, 0], "💣💣", 1)}</div></div>`, ms: 6400 },
      { tag: "STEP 4 · 교환", title: "같은 색 별 3개 = 원하는 색 1개", body: "같은 색 별이 <b>3개 있으면 원하는 색 별 1개</b>로 바꿀 수 있어요 (언제든). 쓸모없는 색을 모아 필요한 색으로 바꾸는 게 요령이에요. 별이나 폭탄을 다른 사람과 주고받을 수는 없어요.",
        boardHtml: `<div class="st-tut"><div class="st-swap"><div>🔄 같은 색 3개 = 원하는 색 1개</div><div class="row"><b class="c0">★</b> 빨강 3개 ➜ <button class="c2">★</button></div></div></div>`, ms: 6000 },
      { tag: "STEP 5 · 끝", title: "언제 끝나요?", body: "<b>① 누가 폭탄 3개를 받으면</b> 끝(그 사람 탈락) · <b>② 누가 별자리 3개를 완성하면</b> 끝(승점 1등이 우승, 꼴찌가 탈락) · <b>③ 별이 바닥나면</b> 승점 비교. 낮은 숫자는 폭탄을 피하기 쉽지만 같은 숫자끼리 부딪히기 쉬워요. 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="st-tut"><div class="st-pls">${row("가", 4, "", [3, 4, 5, 0], "💣", 10)}${row("나", 2, "me", [3, 0, 1, 6], "", 9)}</div></div>`, ms: 7600 },
      { tag: "STEP 6 · 직접", title: "이번 라운드에서 제외되는 숫자는?", body: "다섯 명이 <b>2 · 3 · 3 · 4 · 5</b> 카드를 냈어요. 같은 숫자를 낸 사람은 전부 제외돼요. 제외되는 숫자를 눌러요!",
        interactive: { hint: "👆 제외되는 숫자를 눌러요", doneText: "✅ 3을 낸 두 명이 겹쳐서 제외! 남은 2 · 4 · 5가 낮은 숫자부터 가져가요." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="st-tut"><div class="st-pls">${row("가", 2, "", [0, 0, 0, 0], "", 0)}${row("나", 3, "me", [0, 0, 0, 0], "", 0)}${row("다", 3, "", [0, 0, 0, 0], "", 0)}${row("라", 4, "", [0, 0, 0, 0], "", 0)}${row("마", 5, "", [0, 0, 0, 0], "", 0)}</div><div class="st-cards" style="width:100%;grid-template-columns:repeat(4,1fr)">${[2, 3, 4, 5].map(c => `<button data-w="${c}">${c}</button>`).join("")}</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (b.dataset.w === "3") { ctrl.sfx("win"); ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-stars"] = {
    name: "별자리 게임", emoji: "🌟", short: "카드로 별을 가져가요 · 같은 숫자는 제외 · 폭탄은 피해요", min: 4, max: 7, defN: 7, board: false,
    show: "더 지니어스 · 시즌 3 · 별자리 게임", season: "시즌 3 블랙가넷",
    opts: [],
    diff: "방송은 7명(별 7개 + 폭탄 1개) — 우리는 4~7명이고 테이블의 별 수는 인원만큼이에요 · 별자리는 별이 모이면 자동 완성돼요 · 방송의 흰 별(만능 별)은 쓰이지 않아 뺐어요 · 방송의 거래·약속(말로 하는 교섭)은 없어요 · 30라운드가 넘으면 승점 비교로 끝나요",
    howto: [
      "별자리 4가지 — 🔴3개=2점 · 🟡4개=3점 · 🔵5개=5점 · 🟢6개=7점 (별이 모이면 자동 완성)",
      "라운드마다 <b>카드 1~5 한 장</b>을 비밀로 내고 동시 공개 — <b>같은 숫자는 제외</b>",
      "낮은 숫자부터 <b>그 숫자만큼</b> 테이블의 별 · 폭탄을 가져가요 (같은 색 3개 = 원하는 색 1개 교환)",
      "<b>폭탄 3개</b>면 탈락 · <b>별자리 3개</b> 완성이면 끝 · 우승은 승점 합계",
    ],
    sub: V => (V.over ? "끝" : `${V.round}라운드 · 별 ${V.bag.reduce((a, b) => a + b, 0)}개 남음`),
    chip: (V, i) => ({ t: `${V.points[i]}점${V.bombs[i] ? ` 💣${V.bombs[i]}` : ""}`, on: V.needs.includes(i) && !V.over, out: V.bombs[i] >= 3 }),
    render, result,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

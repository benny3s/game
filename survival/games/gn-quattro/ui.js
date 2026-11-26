/* 베니 서바이벌 · 콰트로 — 화면 (내 카드 4장 · 관전 플레이어 11명 · 열기 / 교환 / 엿보기 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const G = window.SVCores["gn-quattro"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.qt-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.qt-rd{font:900 14px var(--round);color:#fff;background:rgba(234,179,8,.22);border:1px solid rgba(250,204,21,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.qt-bg{font:800 12px var(--round);color:var(--soft);white-space:nowrap}
.qt-hand{flex:none;display:grid;gap:4px;justify-items:center;padding:6px 6px 7px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)}
.qt-hand.me{border-color:#fde68a;background:rgba(253,230,138,.07)}
.qt-hand .lb{font:800 11.5px var(--round);color:var(--soft)}
.qt-row{display:flex;gap:7px;justify-content:center}
.qt-t{position:relative;display:grid;place-items:center;align-content:center;gap:0;width:54px;height:70px;border-radius:10px;border:2px solid rgba(255,255,255,.25);font:900 24px var(--round);color:#fff;cursor:default;user-select:none;padding:0;box-sizing:border-box}
.qt-t i{font:normal 11px var(--round);opacity:.9;line-height:1}
.qt-t u{position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);font:800 9px var(--round);text-decoration:none;background:rgba(0,0,0,.55);border-radius:99px;padding:0 5px;white-space:nowrap}
.qt-t.c0{background:#b91c1c}.qt-t.c1{background:#1d4ed8}.qt-t.c2{background:#a16207}.qt-t.c3{background:#15803d}.qt-t.c4{background:#0f172a}
.qt-t.hid{background:rgba(255,255,255,.08);color:#94a3b8;border-style:dashed}
.qt-t.op{border-color:#fde68a;box-shadow:0 0 0 2px rgba(253,230,138,.28)}
button.qt-t{cursor:pointer}
button.qt-t.sel{transform:translateY(-5px);border-color:#fff;box-shadow:0 5px 14px rgba(0,0,0,.5)}
.qt-t.sm{width:34px;height:42px;font-size:17px;border-radius:8px}
.qt-t.sm i{display:none}
.qt-gs{flex:none;display:grid;gap:4px}
.qt-gs .lb{font:800 11.5px var(--round);color:var(--soft);text-align:center}
.qt-gg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.qt-gg button{padding:5px 0;border-radius:9px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font:800 12px var(--round);cursor:pointer;white-space:nowrap}
.qt-gg button.ex{opacity:.4;cursor:default;text-decoration:line-through}
.qt-gg button.sel{border-color:#fde68a;background:rgba(253,230,138,.2)}
.qt-gg button.pk{border-color:#a78bfa}
.qt-pk{flex:none;display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;font:700 12px var(--round);color:#ddd6fe;padding:4px 8px;border-radius:10px;background:rgba(124,58,237,.14);border:1px solid rgba(167,139,250,.4)}
.qt-pk b{color:#fff}
.qt-log{flex:1 1 auto;min-height:36px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.1)}
.qt-ev{padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.05);font:700 11.5px var(--round);color:#e2e8f0;line-height:1.35}
.qt-ev.m{border-left:3px solid #fde68a}.qt-ev.o{border-left:3px solid #38bdf8}
.qt-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.qt-info b{color:#fde68a}.qt-info .warn{color:#fca5a5}
.qt-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;flex:none}
.qt-acts button{padding:9px 6px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 14px var(--round);cursor:pointer}
.qt-acts button.go{border-color:#fde68a;background:rgba(253,230,138,.2)}
.qt-acts button:disabled{opacity:.4;cursor:default}
.qt-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.qt-tut .qt-info{width:100%}
@media (max-height:780px){.qt-t{width:46px;height:58px;font-size:21px}.qt-t.sm{width:30px;height:36px;font-size:15px}.qt-hand{padding:4px}.qt-acts button{padding:7px 4px;font-size:13px}.qt-info{font-size:11.5px}}
@media (max-height:690px){.qt-t{width:42px;height:50px;font-size:19px}.qt-t i{display:none}.qt-gg button{padding:3px 0;font-size:11px}.qt-hand .lb,.qt-gs .lb{display:none}.qt-info.hint{display:none}.qt-bg{display:none}.qt-ev{font-size:11px;padding:1px 6px}.qt-pk{font-size:11px;padding:2px 6px}.qt-hand{gap:2px}.qt-acts button{padding:6px 3px;font-size:12.5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const tile = (c, o, cls) => (c === null || c === undefined ? `<b class="qt-t hid ${cls || ""}">?</b>` : `<b class="qt-t c${G.col(c)}${o ? " op" : ""} ${cls || ""}"><i>${G.COLN[G.col(c)]}</i>${G.num(c)}${o ? "<u>공개</u>" : ""}</b>`);
  const cname = c => `${G.CEM[G.col(c)]}${G.num(c)}`;
  const WHY = { sum: "둘 다 콰트로 — 합이 큰 쪽", max: "합이 같아 가장 큰 숫자로", one: "한 명만 콰트로", zero: "검정 0을 열어서", none: "둘 다 콰트로를 못 만들어서", tie: "합도 가장 큰 숫자도 같아서" };
  let RS = null;
  const rs = (V, ctx) => {
    const last = V.log.length ? V.log[V.log.length - 1].i : 0, key = `${ctx.g}|${last}|${V.turn}|${V.peekUsed ? 1 : 0}`;
    if (!RS || RS.key !== key) RS = { key, g: ctx.g, card: null, guest: null };
    return RS;
  };
  function logHtml(V, ctx, me, watch) {
    const who = s => (watch ? esc(nameOf(ctx, s)) : s === me ? "나" : esc(nameOf(ctx, s)));
    const rows = V.log.filter(e => e.k !== "end").slice(-6).map(e => {
      const cls = !watch && e.s === me ? "m" : "o";
      if (e.k === "start") return `<div class="qt-ev o">🎲 ${who(e.first)} 먼저 시작해요</div>`;
      if (e.k === "open") return `<div class="qt-ev ${cls}"><b>${who(e.s)}</b>: ${cname(e.card)} 카드를 열었어요</div>`;
      if (e.k === "swap") return `<div class="qt-ev ${cls}"><b>${who(e.s)}</b>: 관전 ${e.g + 1}번과 카드를 교환했어요</div>`;
      return "";
    });
    return `<div class="qt-log" id="qt-log">${rows.join("") || `<div class="qt-ev">아직 아무도 카드를 열지 않았어요.</div>`}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const mineSeat = watch ? 0 : me, oppSeat = 1 - mineSeat, R = V.rules;
    const nOpenMine = V.mine.filter(x => x.o).length, openedMine = V.mine.filter(x => x.o).map(x => x.c);
    const top = V.over ? "끝" : watch ? `${esc(nameOf(ctx, V.turn))} 차례` : V.turn === me ? "내 차례" : "상대 차례";
    let h = `<div class="qt-top"><span class="qt-rd">🃏 ${top}</span><span class="qt-bg">${R.mustAll ? `교환 ${watch ? V.nExs.join(" · ") : V.nEx} / ${G.GUESTS}명` : `교환 ${watch ? V.nExs.join(" · ") : V.nEx} / 최대 ${R.maxEx}명`}${R.peek ? ` · 엿보기 ${V.peekUsed ? "사용" : "가능"}` : ""}</span></div>`;
    // 상대 카드
    h += `<div class="qt-hand"><div class="lb">${watch ? esc(nameOf(ctx, oppSeat)) : "상대"} · 열린 카드 ${V.opp.filter(x => x.o).length}/4 · 교환 ${V.nExs[oppSeat]}명</div><div class="qt-row">${V.opp.map(x => tile(x.c, x.o)).join("")}</div></div>`;
    // 관전 플레이어
    if (!watch && !V.over) {
      h += `<div class="qt-gs"><div class="lb">관전 플레이어 ${G.GUESTS}명 (AI) — 한 사람과 한 번만 교환</div><div class="qt-gg">${V.gex.map((ex, g) => `<button data-g="${g}" class="${ex ? "ex" : ""}${S.guest === g ? " sel" : ""}${V.peeked && V.peeked.g === g ? " pk" : ""}" ${ex || !mine ? "disabled" : ""}>${ex ? "✓" : ""}${g + 1}${V.peeked && V.peeked.g === g ? "👁" : ""}</button>`).join("")}</div></div>`;
      if (V.peeked) {
        const recv = G.guestPick(V.peeked.cards, openedMine, R.zeroLoses);
        h += `<div class="qt-pk">👁 관전 ${V.peeked.g + 1}번의 카드 ${V.peeked.cards.map(c => tile(c, false, "sm")).join("")}${nOpenMine >= 1 ? ` — 교환하면 <b>${cname(V.peeked.cards[recv])}</b>${ja(cname(V.peeked.cards[recv]),"을")} 받아요` : ""}</div>`;
      }
    } else if (watch) h += `<div class="qt-info">관전 플레이어 ${G.GUESTS}명은 AI — 교환을 하면 열린 카드와 안 겹치는 가장 큰 카드를 줘요</div>`;
    h += logHtml(V, ctx, me, watch);
    // 내 카드
    h += `<div class="qt-hand me"><div class="lb">${watch ? esc(nameOf(ctx, mineSeat)) : "내 카드"} · 열린 카드 ${nOpenMine}/4</div><div class="qt-row">${V.mine.map((x, i) => (mine && !x.o ? `<button class="qt-t c${G.col(x.c)}${S.card === i ? " sel" : ""}" data-c="${i}"><i>${G.COLN[G.col(x.c)]}</i>${G.num(x.c)}</button>` : tile(x.c, x.o))).join("")}</div></div>`;
    // 안내 · 버튼
    let acts = "";
    if (V.over) {
      const w = V.draw ? "무승부예요" : V.winner === me && !watch ? "🎉 내가 이겼어요!" : `${esc(nameOf(ctx, V.winner))}가 이겼어요`;
      h += `<div class="qt-info"><b>${w}</b> · ${esc(WHY[V.why] || "")}${V.hands ? ` · 합 ${V.hands.map(x => x.reduce((s, y) => s + G.num(y.c), 0)).join(" : ")}` : ""}</div>`;
    } else if (mine) {
      const blockOpen = R.mustAll && nOpenMine === 3 && V.nEx < G.GUESTS, selC = S.card !== null ? V.mine[S.card].c : null;
      const zeroWarn = R.zeroLoses && selC === 0;
      const hint = nOpenMine === 0 ? "먼저 카드를 <b>1장 열어야</b> 교환할 수 있어요 — 카드를 누르고 [열기]" : "카드를 열거나, <b>카드 + 관전 플레이어</b>를 눌러 교환해요";
      h += `<div class="qt-info hint">${hint}${blockOpen ? `<br><span class="warn">마지막 카드는 ${G.GUESTS}명과 모두 교환한 뒤에 열 수 있어요 (${V.nEx}/${G.GUESTS})</span>` : ""}</div>`;
      if (zeroWarn) h += `<div class="qt-info"><span class="warn">⚠️ 검정 0은 열면 바로 져요 — 교환으로 바꿔요</span></div>`;
      const canOpen = S.card !== null && !blockOpen && !zeroWarn, canSwap = nOpenMine >= 1 && V.nEx < R.maxEx && S.card !== null && S.guest !== null && !V.gex[S.guest], canPeek = R.peek && !V.peekUsed && S.guest !== null && !V.gex[S.guest];
      acts = `<div class="qt-acts"><button data-a="open" class="${canOpen ? "go" : ""}" ${canOpen ? "" : "disabled"}>🔓 카드 열기</button><button data-a="swap" class="${canSwap ? "go" : ""}" ${canSwap ? "" : "disabled"}>${canSwap ? `🔁 교환 (↔ 관전 ${S.guest + 1})` : "🔁 교환"}</button>${R.peek && !V.peekUsed ? `<button data-a="peek" class="${canPeek ? "go" : ""}" ${canPeek ? "" : "disabled"}>👁 엿보기${canPeek ? ` (관전 ${S.guest + 1})` : ""}</button>` : ""}</div>`;
    } else h += `<div class="qt-info">${watch ? "구경 중" : "상대가 생각하는 중이에요…"}</div>`;
    h += acts;
    stage.innerHTML = h;
    const lg = stage.querySelector("#qt-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      if (t.dataset.c !== undefined) { const i = +t.dataset.c; S.card = S.card === i ? null : i; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.g !== undefined) { const g = +t.dataset.g; S.guest = S.guest === g ? null : g; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "open" && S.card !== null) { ctx.sfx("pop"); ctx.act({ t: "open", c: S.card }); return; }
      if (t.dataset.a === "swap" && S.card !== null && S.guest !== null) { ctx.sfx("pop"); ctx.act({ t: "swap", c: S.card, g: S.guest }); return; }
      if (t.dataset.a === "peek" && S.guest !== null) { ctx.sfx("pop"); ctx.act({ t: "peek", g: S.guest }); }
    };
  }
  function result(V) {
    const t = V.hands ? V.hands.map(h => h.map(x => cname(x.c)).join(" ")).join(" / ") : "";
    return `${V.draw ? "무승부" : "승부 갈림"} · ${WHY[V.why] || ""}${t ? ` · ${t}` : ""}`;
  }
  function tutorial() {
    style();
    const row = (list, extra) => `<div class="qt-row">${list.map(c => tile(c, extra && extra.has && extra.has(c))).join("")}</div>`;
    const mk = G.mk;
    const four = [mk(0, 3), mk(1, 9), mk(2, 7), mk(3, 10)];
    return [
      { tag: "STEP 1 · 목표", title: "콰트로 — 색도 숫자도 모두 다른 4장", body: "카드는 <b>빨강 · 파랑 · 초록 · 노랑</b> 각 1~10 (그리고 검정 0 한 장) — 모두 41장이에요. 딜러가 섞어 <b>탈락후보 두 사람에게 4장씩</b>, 나머지 11명에게 3장씩 나눠 줘요. 4장을 <b>색도 숫자도 전부 다르게</b> 모으면 <b>콰트로</b>, 합이 더 큰 콰트로를 만든 쪽이 승자예요. 가장 큰 콰트로는 7 + 8 + 9 + 10 = 34!",
        boardHtml: `<div class="qt-tut">${row(four)}<div class="qt-info">🟥3 · 🟦9 · 🟨7 · 🟩10 → 색 4개 · 숫자 4개 모두 달라서 콰트로! (합 29)</div></div>`, ms: 7000 },
      { tag: "STEP 2 · 열기와 교환", title: "열어야 교환할 수 있어요", body: "먼저 카드 <b>1장을 오픈</b>해야 교환을 시작할 수 있어요 (오픈한 카드는 모두에게 보이고, <b>교환할 수 없어요</b>). 교환은 나머지 플레이어(관전 플레이어)와 카드 <b>1장씩 맞바꾸기</b> — 한 사람과 한 번만 할 수 있어요. 더 바꿀 게 없으면 나머지 카드도 오픈해요.",
        boardHtml: `<div class="qt-tut"><div class="qt-row">${tile(mk(0, 7), true)}${tile(mk(1, 3), false)}${tile(mk(2, 3), false)}${tile(mk(3, 10), false)}</div><div class="qt-info">🟥7은 열어 둔 카드 — 나머지 3장은 아직 비밀 (교환하면 바뀔 수 있어요)</div></div>`, ms: 7000 },
      { tag: "STEP 3 · 관전 플레이어", title: "열린 카드와 안 겹치는 가장 큰 카드를 줘요", body: "방송에선 관전 플레이어와 협상하지만, 우리 판의 관전 플레이어(AI)는 교환할 때 <b>내가 열어 둔 카드와 색 · 숫자가 겹치지 않는 카드</b> 중 가장 큰 카드를 줘요. 맞는 카드가 없으면 가장 낮은 카드를 줘요 — 그래서 <b>좋은 카드를 일찍 열어 두는 게</b> 유리해요.",
        boardHtml: `<div class="qt-tut"><div class="qt-row">${tile(mk(0, 7), true)}</div><div class="qt-info">열린 카드 🟥7 · 관전 플레이어의 카드:</div><div class="qt-row">${tile(mk(0, 9), false, "sm")}${tile(mk(1, 9), false, "sm")}${tile(mk(1, 4), false, "sm")}</div><div class="qt-info">🟥9는 색이 겹쳐요 → 🟦9를 줘요 (안 겹치는 카드 중 가장 커요)</div></div>`, ms: 8000 },
      { tag: "STEP 4 · 승패", title: "합이 큰 콰트로가 이겨요", body: "마지막 카드까지 오픈하면 판정해요. <b>둘 다 콰트로</b>면 합이 큰 쪽 → 합이 같으면 <b>더 높은 숫자 카드</b>를 가진 쪽이 이겨요. <b>한 명만 콰트로</b>면 그쪽 승리, 못 만든 쪽은 패배 (둘 다 못 하면 무승부). 1화 판은 4장을 다 열기 전에 <b>11명 전원과 교환</b>(총 11번)해야 하고, 오픈된 <b>검정 0은 무조건 패배</b>예요. 12화 판은 교환 3명까지, 검정 0도 색 하나로 인정해요.",
        boardHtml: `<div class="qt-tut"><div class="qt-info">나 ${[mk(2, 10), mk(1, 9), mk(3, 8), mk(0, 2)].map(cname).join(" ")} = <b>29</b></div><div class="qt-info">상대 ${[mk(0, 9), mk(1, 8), mk(2, 7), mk(3, 5)].map(cname).join(" ")} = <b>29</b> → 합이 같아요</div><div class="qt-info">가장 높은 숫자 10 · 9 → 내가 이겨요!</div></div>`, ms: 10000 },
      { tag: "STEP 5 · 직접", title: "교환할 카드를 골라 봐요", body: "🟥7은 열어 뒀어요. <b>콰트로가 되려면</b> 어떤 카드를 바꿔야 할까요? (힌트: 숫자가 겹치는 카드가 있어요)",
        interactive: { hint: "👆 바꿔야 할 카드를 눌러요", doneText: "✅ 숫자 3이 두 장(🟦3 · 🟨3)이라 콰트로가 안 돼요 — 둘 중 한 장을 교환해요!" },
        render(stage, ctrl) {
          const cs = [mk(0, 7), mk(1, 3), mk(2, 3), mk(3, 10)];
          stage.innerHTML = `<div class="qt-tut"><div class="qt-row">${cs.map((c, i) => (i === 0 ? tile(c, true) : `<button class="qt-t c${G.col(c)}" data-w="${i}"><i>${G.COLN[G.col(c)]}</i>${G.num(c)}</button>`)).join("")}</div><div class="qt-info" id="qt-tm">어떤 카드를 바꿀까요?</div></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return; const i = +b.dataset.w;
            if (i === 1 || i === 2) { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#qt-tm"); if (m) m.textContent = "이 카드는 다른 카드와 안 겹쳐요 — 숫자가 같은 카드를 찾아봐요"; }
          };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-quattro"] = {
    name: "콰트로", emoji: "🃏", short: "색도 숫자도 다른 4장을 먼저 모아요 · 관전 플레이어와 카드 교환", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 2 · 콰트로", season: "시즌 2 룰 브레이커",
    opts: [{ k: "ver", label: "판", items: [["a", "1화 1회전 (11명 전원과 교환)"], ["b", "12화 결승 3회전 (교환 3명 · 엿보기)"]], def: "a" }],
    diff: "방송은 탈락후보와 나머지 플레이어 11명이 협상해서 카드를 주고받지만, 우리는 관전 플레이어가 AI라서 '열린 카드와 안 겹치는 가장 큰 카드'를 줘요 (없으면 가장 낮은 카드, 1화 판은 0을 안 줘요) · 차례를 번갈아 한 가지씩 해요 (방송은 동시에) · 엿보기는 차례를 쓰지 않아요 · 12화 판의 멀리건과 아이템은 뺐어요 · 비기면 12화 방송은 게임을 다시 하지만 우리는 무승부로 끝내요 (둘 다 콰트로를 못 만들 때는 방송 설명이 없어요)",
    howto: [
      "카드는 <b>빨강 · 파랑 · 초록 · 노랑</b> 각 1~10 + 검정 <b>0</b> 한 장 = 41장 — 딜러가 섞어 <b>탈락후보 두 사람에게 4장씩</b>, 나머지 11명(관전 플레이어)에게 3장씩",
      "<b>콰트로</b> = 숫자도 색도 모두 다른 4장 — 합이 더 큰 콰트로를 만든 쪽이 승자 (최대 34)",
      "먼저 <b>1장을 오픈</b>해야 교환할 수 있고, 오픈한 카드는 교환할 수 없어요 · 교환은 관전 플레이어와 <b>1장씩</b>, 한 사람과 <b>한 번만</b>",
      "마지막 카드까지 오픈하면 판정 — <b>둘 다 콰트로</b>면 합이 큰 쪽 → 합이 같으면 더 높은 숫자를 가진 쪽 · 한 명만 콰트로면 그쪽 승 · 둘 다 못 하면 무승부",
      "1화 판: 4장을 다 열기 전에 11명 전원과 교환 (총 11번) · 오픈된 0은 무조건 패 / 12화 판: 교환은 3명까지, 관전 플레이어 1명의 카드 3장을 엿볼 수 있고, 검정 0도 색 하나로 인정",
    ],
    sub: V => (V.over ? "끝" : V.rules.mustAll ? `교환 ${V.nExs.join(" : ")} / ${G.GUESTS}` : `교환 ${V.nExs.join(" : ")} / ${V.rules.maxEx}`),
    chip: (V, i) => ({ t: `교환 ${V.nExs[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (같은 가상 관전 플레이어 손으로 두 수를 끝까지 둬 콰트로 확률 · 합을 견줌)
    actText: (a, V) => {
      if (!a) return "—";
      const own = i => (Number.isInteger(i) && V && V.mine && V.mine[i] && typeof V.mine[i].c === "number" ? cname(V.mine[i].c) : Number.isInteger(i) ? `${i + 1}번째 카드` : "카드");
      if (a.t === "open") return `${own(a.c)} 카드 열기`;
      if (a.t === "swap") return `${own(a.c)} 카드를 관전 ${Number.isInteger(a.g) ? a.g + 1 : "?"}번과 교환`;
      if (a.t === "peek") return `관전 ${Number.isInteger(a.g) ? a.g + 1 : "?"}번의 카드 3장 엿보기`;
      return "—";
    },
    review: (V, seat, myA, bestA, info) => {
      if (!V || !myA || !bestA || !V.mine || !V.rules || (seat !== 0 && seat !== 1) || V.turn !== seat || V.over) return null;
      if (myA.t === "peek" && bestA.t === "peek") return { sev: 0, why: `엿보기는 아직 안 바꾼 관전 플레이어 ${V.gex.filter(x => !x).length}명 누구를 골라도 똑같아요 — 아직 아무도 카드를 모르는 사람이라 처음엔 차이가 없어요` };
      if (myA.t === "peek" || !["open", "swap", "peek"].includes(myA.t) || !["open", "swap", "peek"].includes(bestA.t)) return null;
      if (JSON.stringify(myA) === JSON.stringify(bestA)) return null;
      const k = info && Number.isFinite(info.k) ? info.k : 0, sd = info && Number.isFinite(info.seed) ? info.seed : 1, seedv = ((sd ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0) || 1;
      const NORM = G.UB + G.UW * 26, pc = x => `${Math.round(x * 100)}%`, sm = x => (x.q ? ` (합 평균 ${x.sum.toFixed(0)})` : "");
      const opened = V.mine.filter(x => x.o).map(x => x.c), card = myA.t === "open" && V.mine[myA.c] ? V.mine[myA.c].c : null;
      const zero = card === 0 && V.rules.zeroLoses ? "검정 0을 열면 바로 지는 판이에요 · " : card !== null && G.qCap(opened) !== null && G.qCap(opened.concat(card)) === null ? "이 카드를 열면 이미 열린 카드와 색이나 숫자가 겹쳐 콰트로를 못 만들어요 · " : "";
      let ref = bestA, note = "", rn = "고급 AI 수";
      if (bestA.t === "peek") {   // 고급 AI 는 늘 엿보기부터 해요 (차례를 안 씀) — 엿보기 없이 둔 내 수는 '엿보기 없이 둘 수 있는 가장 좋은 수'와 견줘요
        ref = G.bestPlain(V, seedv, 24); if (!ref) return null; rn = "엿보기 없는 최선 수";
        note = ` · 고급 AI는 먼저 엿보기를 해요 (차례를 안 써요) — 엿보기 없이 가장 좋은 수: ${window.SVUI["gn-quattro"].actText(ref, V)}`;
        if (JSON.stringify(myA) === JSON.stringify(ref)) return { sev: 0, why: "엿보기 없이 둘 수 있는 가장 좋은 수예요 — 고급 AI는 그 전에 엿보기부터 해요 (차례를 안 써서 먼저 써도 손해가 없어요)" };
      }
      const c = G.compareActs(V, myA, ref, seedv, 160);
      if (c.same) return { sev: 0, why: "관전 플레이어 누구와 바꿔도 같은 수예요 — 아직 카드를 모르는 사람은 서로 구별이 안 되니 결과도 같아요" };
      const dP = (c.best.u - c.mine.u) / NORM * 100, sev = dP <= 1 ? 0 : Math.round(Math.min(100, (dP - 1) * 3));   // 콰트로 확률(합 반영) 1%p 상당이 깎일 때마다 3점 (약 21%p 깎여야 60점 = 📒)
      const why = dP > 2 ? `${zero}콰트로가 될 확률 약 ${pc(c.best.q)}${sm(c.best)} → 내 수 ${pc(c.mine.q)}${sm(c.mine)} (끝까지 160번씩 가상으로 둠)${note}`
        : dP < -2 ? `이번엔 내 수 쪽이 더 좋게 나왔어요 (내 수 ${pc(c.mine.q)}${sm(c.mine)} · ${rn} ${pc(c.best.q)}${sm(c.best)})${note}`
          : `${zero}두 수의 결과가 거의 같아요 (${rn} ${pc(c.best.q)}${sm(c.best)} · 내 수 ${pc(c.mine.q)}${sm(c.mine)})${note}`;
      return { sev, why };
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd) || (V.legal && V.legal[0]) || null,
    tutorial,
  };
})();

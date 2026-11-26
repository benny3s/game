/* 베니 서바이벌 · 무거운 13 — 화면 (받침대 3개 · 카드+칩 동시 선택 · 놓는 순서 · 패스 · 벌점 · 1분 규칙) */
(() => {
  "use strict";
  const H = window.SVCores.heavy13;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SUM = a => a.reduce((x, y) => x + y, 0);
  const PN = ["빨강", "초록", "파랑"], CN = ["빨강", "초록", "파랑", "무지개"];
  const COL = ["#ef4444", "#22c55e", "#3b82f6"];
  const RAIN = "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)";
  const CSS = `
.h13-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.h13-pill{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:4px 10px;white-space:nowrap}
.h13-pill.gold{background:rgba(245,179,1,.16);border-color:rgba(245,179,1,.5);color:#fde68a}
.h13-peds{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;flex:none}
.h13-ped{border:2px solid var(--c);background:rgba(0,0,0,.26);border-radius:12px;padding:4px 6px;display:grid;gap:3px;align-content:start;min-width:0;transition:box-shadow .2s}
.h13-ped.hot{box-shadow:0 0 0 2px rgba(248,113,113,.55) inset}
.h13-ped.me{background:rgba(245,179,1,.12)}
.h13-ped .hd{display:flex;justify-content:space-between;align-items:baseline;font:800 12px var(--round);color:var(--c)}
.h13-ped .hd b{font:900 16px var(--round);color:#fff;font-variant-numeric:tabular-nums}
.h13-ped .hd b.warn{color:#fca5a5}
.h13-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.h13-bar i{display:block;height:100%;border-radius:99px;background:var(--c)}
.h13-rocks{display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start;min-height:22px}
.h13-rk{display:inline-grid;place-items:center;width:24px;height:22px;border-radius:7px;background:#94a3b8;color:#0f172a;font:900 13px var(--round);border:1px solid rgba(255,255,255,.4)}
.h13-rk.new{background:#fde68a;border-color:#f59e0b}
.h13-ped .sm{font-size:10.5px;color:var(--soft);text-align:right}
.h13-pl{display:grid;gap:2px;flex:none}
.h13-row{display:grid;grid-template-columns:16px minmax(0,60px) 32px 1fr auto;gap:4px;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.2);border-radius:9px;padding:2px 6px;min-height:26px}
.h13-row.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.h13-row.me{border-color:rgba(134,239,172,.4);background:rgba(34,197,94,.07)}
.h13-row .no{font:800 11px var(--round);color:var(--soft);text-align:center}
.h13-row .nm{font:700 12px var(--round);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.h13-row .pn{font:900 15px var(--round);color:#fde68a;text-align:right;font-variant-numeric:tabular-nums}
.h13-row .pn small{font-size:9px;color:var(--soft)}
.h13-mini{display:flex;gap:2px;align-items:center;min-width:0}
.h13-mc{display:inline-grid;place-items:center;width:15px;height:17px;border-radius:4px;background:#e2e8f0;color:#0f172a;font:800 10px var(--round)}
.h13-mc.x{background:rgba(255,255,255,.08);color:rgba(255,255,255,.28)}
.h13-w{display:inline-block;width:12px;height:12px;border-radius:50%;background:${RAIN};margin-left:3px;border:1px solid rgba(255,255,255,.5)}
.h13-w.x{opacity:.25}
.h13-pk{display:inline-flex;align-items:center;gap:3px;font:800 11.5px var(--round);white-space:nowrap;color:#e2e8f0}
.h13-dot{display:inline-block;width:13px;height:13px;border-radius:50%;border:1px solid rgba(255,255,255,.55)}
.h13-pk .ok{color:#86efac}.h13-pk .bad{color:#fca5a5}.h13-pk .cur{color:#fde68a}
.h13-me{display:grid;gap:5px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:6px 8px;flex:none}
.h13-me .lb{font:700 11.5px var(--round);color:#86efac;display:flex;justify-content:space-between;gap:6px}
.h13-cards{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.h13-card{border:2px solid #64748b;background:#f1f5f9;color:#0f172a;border-radius:9px;padding:5px 0;font:900 18px var(--round);cursor:pointer}
.h13-card:disabled{opacity:.22;cursor:not-allowed}
.h13-card.sel{border-color:#f59e0b;background:#fef3c7;transform:translateY(-3px);box-shadow:0 5px 8px rgba(0,0,0,.4)}
.h13-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.h13-chip{display:flex;align-items:center;justify-content:center;gap:5px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;border-radius:10px;padding:5px 0;font:800 12px var(--round);cursor:pointer;white-space:nowrap}
.h13-chip .h13-dot{width:14px;height:14px;margin:0}
.h13-chip:disabled{opacity:.25;cursor:not-allowed}
.h13-chip.sel{border-color:#f59e0b;background:rgba(245,179,1,.2)}
.h13-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.h13-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.h13-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:6px}
.h13-btns .btn{padding:9px 6px;font-size:13.5px}
.h13-btns .btn small{display:block;font-size:11px;opacity:.85;font-weight:600}
.h13-btns .btn.danger{border-color:#f87171;background:rgba(127,29,29,.35)}
.h13-sum{display:grid;gap:4px;font-size:12.5px;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.07);border-radius:12px;padding:7px 9px}
.h13-sum .r{display:flex;gap:6px;align-items:baseline}
.h13-sum .r.bad{color:#fca5a5}
.h13-tut{display:grid;gap:8px;justify-items:center;width:100%}
.h13-tut .h13-peds{width:100%}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let lastSeats = [];
  const nameOf = i => (lastSeats[i] && lastSeats[i].name) || `${i + 1}번`;
  const nm = i => esc(nameOf(i));
  const josa = (i, a, b) => { const s = nameOf(i), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28 ? a : b) : `${a}(${b})`; };
  const dot = k => `<span class="h13-dot" style="background:${k === 3 ? RAIN : COL[k]}"></span>`;
  const PH = { choose: "카드 · 칩 고르기", place: "바위 놓기", show: "결과", end: "끝" };

  // ── 받침대 ──
  function pedHtml(p, rocks, opts = {}) {
    const s = SUM(rocks), warn = s >= 10;
    const newN = opts.newCnt || {};
    return `<div class="h13-ped${warn ? " hot" : ""}${opts.cls || ""}" style="--c:${COL[p]}"><div class="hd"><span>${PN[p]}<small style="font-size:10px;color:var(--soft)"> ${rocks.length}개</small></span><b class="${warn ? "warn" : ""}">${s}<small style="font-size:10px;color:var(--soft)"> /13</small></b></div><div class="h13-bar"><i style="width:${Math.min(100, (s / 13) * 100)}%"></i></div><div class="h13-rocks">${rocks.map((w, k) => `<span class="h13-rk${k >= rocks.length - (newN[p] || 0) ? " new" : ""}">${w}</span>`).join("")}</div></div>`;
  }
  const pedsHtml = (V, opts) => `<div class="h13-peds">${[0, 1, 2].map(p => pedHtml(p, V.ped[p], opts)).join("")}</div>`;

  // ── 사람 줄 ──
  function rowHtml(V, ctx, s) {
    const me = ctx.me, revealed = !!V.picks;
    const ord = V.order.indexOf(s) + 1, put = V.puts.find(x => x.s === s);
    const mini = Array.from({ length: V.per }, (_, c) => `<span class="h13-mc${V.cards[s][c] ? "" : " x"}">${c}</span>`).join("");
    const w = `<span class="h13-w${V.chips[s][3] ? "" : " x"}" title="무지개 칩"></span>`;
    let st = "";
    if (V.phase === "choose") st = V.picked[s] ? `<span class="ok">✓ 골랐음</span>` : `<span style="color:var(--soft)">고르는 중…</span>`;
    else if (revealed) {
      const pk = V.picks[s], tag = `<span>${pk.card}</span>${dot(pk.chip)}`;
      if (put) st = `${tag}<span class="${put.over ? "bad" : "ok"}">${put.over ? `💥벌점 ${put.got}` : "✓"}</span>`;
      else if (V.passed[s]) st = `${tag}<span style="color:var(--soft)">패스</span>`;
      else if (V.cur === s) st = `${tag}<span class="cur">▶ 지금</span>`;
      else st = tag;
    }
    return `<div class="h13-row${me === s ? " me" : ""}${V.cur === s && V.phase === "place" ? " turn" : ""}"><span class="no">${revealed && ord ? ord : ""}</span><span class="nm">${nm(s)}${V.lead === s ? " 🚩" : ""}</span><span class="pn">${V.pen[s]}<small>점</small></span><span class="h13-mini">${mini}${w}</span><span class="h13-pk">${st}</span></div>`;
  }

  // ── 고르기 상태 ──
  let SEL = null;
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}`; if (!SEL || SEL.key !== key) SEL = { key, card: null, chip: null }; return SEL; };

  function preview(V, p, w) {
    const before = V.pedSum[p], after = before + w, over = after >= 13;
    return { before, after, over, got: over ? V.ped[p].length : 0 };
  }

  function showHtml(V) {
    const R = V.res; if (!R) return "";
    const bad = R.puts.filter(p => p.got > 0);
    let h = `<div class="h13-sum"><b>${V.round}라운드 결과</b>`;
    if (!bad.length) h += `<div class="r">🙌 아무도 넘치지 않았어요 — 벌점 없음</div>`;
    for (const p of bad) h += `<div class="r bad">💥 <b>${nm(p.s)}</b>${josa(p.s, "이", "가")} ${PN[p.ped]} 받침대에 ${p.card}을 놓다 합 ${p.after} → 바위 ${p.got}개 수거 = 벌점 ${p.got}</div>`;
    h += `<div class="r" style="color:var(--soft)">${bad.length ? `다음 라운드 선은 <b style="color:#fde68a">${nm(R.next)}</b> (마지막 벌점자)` : `선은 그대로 ${nm(R.next)}`}</div></div>`;
    return h;
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats || lastSeats;
    const me = ctx.me, watch = me < 0;
    let h = `<div class="h13-top"><span class="h13-pill">${V.round} / ${V.rounds} 라운드</span><span class="h13-pill gold">세트 ${V.set}</span><span class="h13-pill gold">🚩 선 ${nm(V.lead)}</span></div>`;
    const newCnt = {}; if (V.phase === "place" || V.phase === "show") for (const p of V.puts) if (!p.over) newCnt[p.ped] = (newCnt[p.ped] || 0) + 1; else newCnt[p.ped] = 1;
    h += pedsHtml(V, { newCnt });
    h += `<div class="h13-pl">${[...Array(V.n).keys()].map(s => rowHtml(V, ctx, s)).join("")}</div>`;

    let acts = "";
    const myTurn = ctx.canAct && V.phase === "place" && V.cur === me;
    if (V.phase === "choose" && !watch) {
      if (V.mine) {
        h += `<div class="h13-me"><div class="lb"><span>이번에 낸 것</span><span>카드 <b>${V.mine.card}</b> · ${CN[V.mine.chip]} 칩</span></div></div>`;
        acts = `<div class="note">다른 사람을 기다려요 (${V.picked.filter(Boolean).length}/${V.n})</div>`;
      } else if (ctx.canAct) {
        const S = selFor(V, ctx);
        const cards = Array.from({ length: V.per }, (_, c) => `<button class="h13-card${S.card === c ? " sel" : ""}" data-card="${c}" ${V.cards[me][c] ? "" : "disabled"}>${c}</button>`).join("");
        const chips = [0, 1, 2, 3].map(k => `<button class="h13-chip${S.chip === k ? " sel" : ""}" data-chip="${k}" ${V.chips[me][k] ? "" : "disabled"}>${dot(k)}${k === 3 ? "무지개" : PN[k]} ${V.chips[me][k]}</button>`).join("");
        h += `<div class="h13-me"><div class="lb"><span>바위 카드 (무게)</span><span>칩 색 = 올릴 받침대</span></div><div class="h13-cards">${cards}</div><div class="h13-chips">${chips}</div></div>`;
        acts = `<button class="btn primary" style="padding:11px" data-a="ok" ${S.card !== null && S.chip !== null ? "" : "disabled"}>${S.card !== null && S.chip !== null ? `✔ 카드 ${S.card} + ${CN[S.chip]} 칩 내기` : "카드와 칩을 하나씩 골라요"}</button>`;
      }
    } else if (V.phase === "choose") acts = `<div class="note">${V.picked.filter(Boolean).length}/${V.n} 명이 골랐어요…</div>`;
    else if (V.phase === "place") {
      if (myTurn) {
        const pk = V.picks[me], w = pk.card, rainbow = pk.chip === 3;
        const btn = p => { const pv = preview(V, p, w); return `<button class="btn${pv.over ? " danger" : " primary"}" data-put="${rainbow ? p : ""}">${rainbow ? dot(p) + " " + PN[p] + "에 놓기" : "놓기"}<small>합 ${pv.before} → ${pv.after}${pv.over ? ` · 넘침! 벌점 ${pv.got}` : " · 안전"}</small></button>`; };
        h += `<div class="h13-me"><div class="lb"><span>내 차례 — 바위 <b>${w}</b> ${rainbow ? "(무지개 칩)" : `→ ${PN[pk.chip]} 받침대`}</span><span>${V.order.indexOf(me) + 1}번째</span></div></div>`;
        acts = `<div class="h13-btns">${rainbow ? [0, 1, 2].map(btn).join("") : btn(pk.chip)}${V.canPass ? `<button class="btn" data-a="pass">패스<small>가장 나중에 놓기</small></button>` : ""}</div><div class="note">${V.canPass ? "패스는 라운드에 한 번 · 패스한 바위는 다른 사람이 다 놓은 뒤에 놓아요" : "마지막 차례라 패스할 수 없어요"}</div>`;
      } else {
        const who = V.cur >= 0 ? nameOf(V.cur) : "";
        acts = `<div class="note">${esc(who)} 차례예요${V.cur === me ? "" : "…"}</div>`;
      }
    } else if (V.phase === "show") acts = showHtml(V);
    else if (V.over) acts = `<div class="h13-sum"><b>14라운드 끝!</b> 벌점이 가장 적은 사람이 1등이에요</div>`;
    h += `<div class="h13-acts">${acts}</div>`;
    stage.innerHTML = h;
    const redo = () => render(stage, V, ctx);
    stage.onclick = e => {
      const c = e.target.closest("[data-card]");
      if (c && !c.disabled) { const S = selFor(V, ctx); S.card = S.card === +c.dataset.card ? null : +c.dataset.card; ctx.sfx("tap"); redo(); return; }
      const k = e.target.closest("[data-chip]");
      if (k && !k.disabled) { const S = selFor(V, ctx); S.chip = S.chip === +k.dataset.chip ? null : +k.dataset.chip; ctx.sfx("tap"); redo(); return; }
      const pu = e.target.closest("[data-put]");
      if (pu && !pu.disabled) { ctx.sfx("pop"); ctx.act(pu.dataset.put === "" ? { t: "put" } : { t: "put", ped: +pu.dataset.put }); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      if (b.dataset.a === "ok") { const S = selFor(V, ctx); if (S.card === null || S.chip === null) return; ctx.sfx("pop"); ctx.act({ t: "pick", card: S.card, chip: S.chip }); }
      else if (b.dataset.a === "pass") { ctx.sfx("pop"); ctx.act({ t: "pass" }); }
    };
  }

  function result(V) {
    const order = [...Array(V.n).keys()].sort((a, b) => V.ranks[a] - V.ranks[b] || V.pen[a] - V.pen[b]);
    return `<div class="h13-sum">${order.map(s => `<div class="r"><b>${nm(s)}</b> · 벌점 ${V.pen[s]}점${V.lastPen[s] >= 0 ? "" : " (한 번도 안 맞음!)"}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const demo = (rocks, extra = {}) => `<div class="h13-peds">${[0, 1, 2].map(p => pedHtml(p, rocks[p] || [], extra)).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "받침대 합이 13이 되면 안 돼요", body: "카드 <b>0~6</b>은 바위의 무게예요. 빨강 · 초록 · 파랑 <b>받침대 3개</b>에 바위를 올리다가 합이 <b>13 이상</b>이 되면, 그 받침대의 바위를 <b>전부 수거</b>하고 수거한 개수만큼 <b>벌점</b>을 받아요. 벌점이 가장 적은 사람이 1등!",
        boardHtml: `<div class="h13-tut">${demo([[6, 4], [3, 2], []])}<small>빨강은 합 10 — 여기에 3 이상을 올리면 넘쳐요</small></div>`, ms: 6400 },
      { tag: "STEP 2 · 직접", title: "넘치지 않는 바위를 골라요", body: "빨강 받침대 합이 <b>10</b>이에요. 내 바위 <b>1 · 3 · 5</b> 중 올려도 <b>안 넘치는</b> 바위를 눌러 보세요.",
        interactive: { hint: "👆 안 넘치는 바위를 눌러요", doneText: "✅ 10 + 1 = 11 — 안전해요!" },
        render(stage, ctrl) {
          const draw = msg => { stage.innerHTML = `<div class="h13-tut">${demo([[6, 4], [], []])}<div style="display:flex;gap:8px">${[1, 3, 5].map(w => `<button class="h13-card" style="width:60px" data-w="${w}">${w}</button>`).join("")}</div><small>${msg || "빨강 칩으로 낸 바위 — 어떤 걸 올릴까요?"}</small></div>`; };
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return; const w = +b.dataset.w; ctrl.sfx("tap");
            if (w === 1) { draw("10 + 1 = 11 — 넘치지 않았어요!"); ctrl.complete(); }
            else draw(`10 + ${w} = ${10 + w} → 13 이상! 바위 2개를 수거해 벌점 2예요. 다른 바위를 골라 봐요`);
          };
          draw();
        } },
      { tag: "STEP 3 · 내기", title: "카드 1장 + 칩 1개를 동시에 몰래 내요", body: "라운드마다 모두 <b>카드 1장과 칩 1개</b>를 비공개로 내요. <b>칩 색 = 올릴 받침대</b>, <b>무지개 칩</b>은 놓을 때 아무 받침대나 골라요 (한 번뿐!). 7라운드가 끝나면 카드와 칩을 다시 받고, 모두 <b>14라운드</b>를 해요.",
        boardHtml: `<div class="h13-tut"><div class="h13-chips" style="width:100%">${[0, 1, 2, 3].map(k => `<span class="h13-chip">${dot(k)}${k === 3 ? "무지개" : PN[k]} ×${k === 3 ? 1 : 2}</span>`).join("")}</div><div class="h13-cards" style="width:100%">${[0, 1, 2, 3, 4, 5, 6].map(c => `<span class="h13-card" style="text-align:center">${c}</span>`).join("")}</div></div>`, ms: 6600 },
      { tag: "STEP 4 · 순서", title: "무지개 → 큰 숫자 → 선 표식 순서로 놓아요", body: "칩이 먼저 공개되고 카드가 공개되면, <b>무지개를 낸 사람</b>이 먼저, 그다음 <b>큰 숫자</b>부터 차례로 놓아요 (같으면 🚩 선 표식에서 시계방향). 놓을 때 <b>받침대 합</b>을 보고 판단하세요.",
        boardHtml: `<div class="h13-tut"><div class="h13-pl" style="width:100%">${["무지개 2", "6 (빨강)", "6 (초록)", "3 (파랑)"].map((t, i) => `<div class="h13-row" style="grid-template-columns:20px 1fr"><span class="no">${i + 1}</span><span class="nm" style="max-width:none">${t}</span></div>`).join("")}</div><small>같은 6이면 선 표식에서 가까운 사람이 먼저</small></div>`, ms: 6400 },
      { tag: "STEP 5 · 직접", title: "넘칠 것 같으면 패스해요", body: "빨강 합이 <b>11</b>인데 내 바위가 <b>4</b>예요. 지금 놓으면 넘쳐서 벌점 3! <b>패스</b>하면 내 바위는 다른 사람이 다 놓은 <b>뒤에</b> 놓여요 (라운드에 한 번). 패스를 눌러 보세요.",
        interactive: { hint: "👆 패스를 눌러 보세요", doneText: "✅ 패스! 다른 사람이 먼저 놓고 내가 마지막에 놓아요" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="h13-tut">${demo([[6, 5], [], []])}<div class="h13-btns" style="width:100%"><button class="btn danger" data-a="put">놓기<small>합 11 → 15 · 넘침! 벌점 2</small></button><button class="btn" data-a="pass">패스<small>가장 나중에 놓기</small></button></div><small id="m">내 바위 4 → 빨강</small></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-a]"); if (!b) return; ctrl.sfx("tap");
            if (b.dataset.a === "pass") { stage.querySelector("#m").textContent = "다른 사람이 먼저 놓고, 내 바위는 마지막에 놓여요 — 그 사이 받침대가 넘쳐 비워질 수도 있어요!"; ctrl.complete(); }
            else stage.querySelector("#m").textContent = "넘쳐서 바위 2개 수거 = 벌점 2! 다시 생각해 봐요";
          };
        } },
      { tag: "STEP 6 · 승부", title: "벌점이 적을수록 위", body: "마지막으로 벌점을 받은 사람이 다음 라운드의 🚩 선. 14라운드 뒤 <b>벌점이 가장 적은 사람</b>이 1등 — 벌점이 같으면 <b>더 최근에 벌점을 받은 사람</b>이 아래예요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 낼 카드와 칩을 알려 줘요.",
        boardHtml: `<div class="h13-tut"><span style="font-size:42px">🏆</span><small>벌점 0 = 가장 좋아요</small></div>`, ms: 5600 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.heavy13 = {
    name: "무거운 13", emoji: "🪨", short: "받침대 합이 13이 되면 바위를 떠안아요", min: 3, max: 7, defN: 5, board: false,
    howto: [
      "카드(0~6 바위 무게) 1장 + 칩 1개를 <b>동시에 비공개</b>로 내요 · 칩 색 = 받침대",
      "<b>무지개 → 큰 숫자</b> 순으로 놓고, <b>패스</b>는 라운드마다 한 번 — 다른 사람이 다 놓은 뒤에 놓아요 (패스한 사람이 여럿이면 거꾸로) · 마지막으로 놓을 차례는 패스할 수 없어요",
      "받침대 합이 <b>13 이상</b>이 되면 그 받침대 바위를 전부 수거 = 개수만큼 벌점",
      "7라운드마다 카드·칩 다시 받고 총 14라운드 — 벌점이 가장 적은 사람이 1등",
    ],
    note: "방송과 다른 점: 3~7명 (빈 자리는 AI · 방송은 7명), 첫 선은 무작위, 넘친 뒤 방금 놓은 바위는 받침대에 남아요, 놓을 길이 하나뿐인 차례는 자동으로 놓아요.",
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds}라운드 · ${PH[V.phase] || ""}`),
    chip: (V, i) => ({ t: `벌점 ${V.pen[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글
    actText: (a) => {
      const CN = ["빨강", "초록", "파랑", "무지개"], PN = ["빨강", "초록", "파랑"];
      if (!a) return "—";
      if (a.t === "pick") return `바위 ${a.card} · ${CN[a.chip]} 칩`;
      if (a.t === "put") return a.ped != null ? `${PN[a.ped]} 받침대에 놓음` : "바위를 놓음";
      if (a.t === "pass") return "패스 (맨 나중에 놓기)";
      return "—";
    },
    // 🎞️ 복기: 내 수 vs 고급 AI 수 — 이번 라운드 기대 벌점 차이 (남은 카드 · 칩에서 남들이 무작위로 낸다고 보고 흉내)
    review: (V, seat, myA, bestA, info) => {
      if (!V || !myA) return null;
      const rng = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      const rr = rng(((info && info.seed) | 0) + (V.round | 0) * 7 + seat * 131);
      const CN = ["빨강", "초록", "파랑", "무지개"], PN = ["빨강", "초록", "파랑"];
      if (V.phase === "choose" && myA.t === "pick") {
        const L = H.evalChoose(V, seat, 60, rr), mine = L.find(o => o.card === myA.card && o.chip === myA.chip);
        const best = (bestA && L.find(o => o.card === bestA.card && o.chip === bestA.chip)) || L[0];
        if (!mine || !best) return null;
        const tx = o => `바위 ${o.card} · ${CN[o.chip]} 칩`;
        return { sev: Math.max(0, Math.min(100, Math.round((mine.e - best.e) * 60))), why: `남들이 남은 카드 · 칩을 무작위로 낸다고 보고 60번 흉내 낸 이번 라운드 기대 벌점 — 내 선택 ${tx(mine)} ${mine.e.toFixed(2)}개 / 고급 AI 선택 ${tx(best)} ${best.e.toFixed(2)}개` };
      }
      if (V.phase === "place" && (myA.t === "put" || myA.t === "pass")) {
        const L = H.evalPlace(V, seat), chip = V.picks && V.picks[seat] ? V.picks[seat].chip : -1;
        const match = a => o => (a.t === "pass" ? o.kind === "pass" : o.kind === "put" && (chip !== 3 || o.pi === a.ped));
        const mine = L.find(match(myA)), best = (bestA && L.find(match(bestA))) || L[0];
        if (!mine || !best) return null;
        const tx = o => o.kind === "pass" ? "패스" : chip === 3 ? `${PN[o.pi]} 받침대에 놓기` : "놓기";
        return { sev: Math.max(0, Math.min(100, Math.round((mine.e - best.e) * 40))), why: `남은 차례를 끝까지 흉내 낸 내 벌점 — 내 선택(${tx(mine)}) ${mine.e}개 / 고급 AI 선택(${tx(best)}) ${best.e}개` };
      }
      return null;
    },
    coach: (V, me, since, names) => H.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => H.ai(V, me, "easy", rnd),
  };
})();

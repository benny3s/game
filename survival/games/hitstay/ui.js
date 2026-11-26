/* 베니 서바이벌 · HIT, STAY — 화면 (한계 숫자 · 공개 카드 고르기 · 베팅 · HIT/STAY · 공개 · 1분 규칙) */
(() => {
  "use strict";
  const H = window.SVCores.hitstay;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SUM = a => a.reduce((x, y) => x + y, 0);
  const CSS = `
.hs-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.hs-lim{font:900 17px var(--round);color:#fff;background:linear-gradient(135deg,#e11d48,#9f1239);border:1px solid #fda4af;border-radius:99px;padding:4px 14px;white-space:nowrap}
.hs-pot{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:4px 11px;white-space:nowrap}
.hs-ph{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:4px 10px;white-space:nowrap}
.hs-log{flex:1 1 90px;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.hs-opps{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:6px;flex:none}
.hs-opp{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:12px;padding:5px 6px;display:grid;gap:3px;min-width:0}
.hs-opp.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.hs-opp.fold{opacity:.4}
.hs-opp .hd{display:flex;gap:4px;align-items:center;font:700 12px var(--round);min-width:0}
.hs-opp .hd b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.hs-opp .hd i{font-style:normal;font-size:11px;color:#fde68a;white-space:nowrap}
.hs-cards{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.hs-c{position:relative;display:inline-grid;place-items:center;width:26px;height:34px;border-radius:6px;background:#f8fafc;color:#0f172a;font:900 15px/1 var(--round);border:2px solid #64748b}
.hs-c.neg{color:#be123c;border-color:#fb7185}
.hs-c.top{border-color:#eab308;background:#fef9c3}
.hs-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 4px,#991b1b 4px 8px);border-color:#fca5a5;color:#fecaca;font-size:12px}
.hs-c.hid::after{content:"🔒";position:absolute;top:-7px;right:-7px;font-size:10px}
.hs-c.pick{cursor:pointer;outline:2px dashed #fde68a;outline-offset:2px}
.hs-big .hs-c{width:40px;height:54px;font-size:23px;border-radius:9px}
.hs-sum{font:800 12px var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.hs-sum.bad{color:#f87171}
.hs-me{display:flex;flex-direction:column;gap:6px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:7px 9px;flex:none}
.hs-me .hd{display:flex;justify-content:space-between;font:700 12.5px var(--round);color:#86efac}
.hs-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.hs-meter{height:8px;border-radius:99px;background:rgba(255,255,255,.1);position:relative;overflow:hidden}
.hs-meter i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#22c55e,#eab308)}
.hs-meter i.bad{background:#ef4444}
.hs-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.hs-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.hs-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px}
.hs-btns .btn{padding:12px 8px;font-size:14.5px}
.hs-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.hs-show{display:grid;gap:5px;font-size:12.5px;overflow:auto;min-height:0}
.hs-show .r{display:grid;grid-template-columns:auto 1fr auto;gap:2px 8px;align-items:center;padding:5px 8px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.hs-show .r.win{border-color:var(--gold);background:rgba(245,179,1,.1)}
.hs-show .r b{font:800 13px var(--round)}
.hs-show .r .g{font:900 14px var(--round);color:#4ade80}
.hs-show .r .e{grid-column:1/-1;color:var(--soft);font-variant-numeric:tabular-nums}
.hs-tut{display:grid;gap:8px;justify-items:center}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const cardHtml = (v, extra = "") => v === null || v === undefined ? `<span class="hs-c back${extra}">?</span>` : `<span class="hs-c${v < 0 ? " neg" : ""}${extra}">${v}</span>`;
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const PH = { reveal: "카드 공개", bet1: "1차 베팅", hit: "HIT · STAY", bet2: "2차 베팅", show: "결과", end: "끝" };
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = i => esc(nameOf(ctx, i));
    if (e.k === "bet") return `${nm(e.s)} ${e.a === "raise" ? `레이즈 ${e.to}칩` : e.a === "call" ? "콜" : e.a === "check" ? "체크" : "폴드"}`;
    if (e.k === "hit") return `${nm(e.s)} HIT → ${e.c}`;
    if (e.k === "stay") return `${nm(e.s)} STAY`;
    if (e.k === "reveal") return `${nm(e.s)} ${e.c} 공개`;
    if (e.k === "hand") return `${e.h}번째 라운드 · 기본 ${e.ante}칩`;
    if (e.k === "out") return `${e.s.map(nm).join(" · ")} 탈락`;
    return "";
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, myH = me >= 0 ? V.hands[me] : null, watch = me < 0;
    let h = `<div class="hs-top"><span class="hs-lim">한계 ${V.L}</span><span class="hs-pot">🪙 판돈 ${V.pot}</span><span class="hs-ph">${V.hand}라운드 · ${PH[V.phase] || ""}</span><span class="hs-log">${logText(V, ctx)}</span></div>`;
    const showing = V.phase === "show" && V.res;      // 결과 표가 모든 카드를 다시 보여 주니 이때는 카드 칸을 줄임
    const opps = showing ? [] : V.hands.map((x, i) => i).filter(i => i !== me);
    if (opps.length) h += `<div class="hs-opps">${opps.map(i => {
      const O = V.hands[i];
      if (!O) return `<div class="hs-opp fold"><div class="hd"><b>${esc(nameOf(ctx, i))}</b><i>${V.alive[i] ? "쉼" : "탈락"}</i></div></div>`;
      const st = V.folded[i] ? "폴드" : V.phase.startsWith("bet") ? (V.bet[i] ? `건 ${V.bet[i]}` : "") : V.phase === "hit" ? (V.stay[i] ? "STAY" : "…") : V.phase === "reveal" ? (V.revealed[i] ? "✓" : "…") : "";
      const turn = V.needs.includes(i) && V.phase !== "reveal";
      const all = V.phase !== "reveal" && O.hid.every(x => x !== null);
      const total = all ? SUM(O.open.concat(O.hid)) : null;
      return `<div class="hs-opp${V.folded[i] ? " fold" : ""}${turn ? " turn" : ""}"><div class="hd"><b>${esc(nameOf(ctx, i))}</b><i>${st}</i></div><div class="hs-cards">${O.open.map((c, k) => cardHtml(c, k === 0 ? " top" : "")).join("")}${O.hid.map(c => (c === null ? cardHtml(null, " hid") : cardHtml(c))).join("")}</div><div class="hs-sum${total !== null && total > V.L ? " bad" : ""}">${V.phase === "reveal" ? "카드 3장 받음" : total !== null ? `합 ${total}` : `공개 합 ${SUM(O.open)} + 숨은 ${O.hidN}장`}</div></div>`;
    }).join("")}</div>`;
    if (myH && !showing) {
      const mine = V.phase === "reveal" ? (myH.raw || []) : myH.open.concat(myH.hid);
      const sum = SUM(mine), over = sum > V.L;
      const pickable = V.phase === "reveal" && ctx.canAct;
      h += `<div class="hs-me"><div class="hd"><span>내 카드 ${V.folded[me] ? "· 폴드" : ""}</span><span class="hs-sum${over ? " bad" : ""}">합 ${V.phase === "reveal" ? "?" : sum} / 한계 ${V.L}${over && V.phase !== "reveal" ? " · bust!" : ""}</span></div>
        <div class="hs-row hs-big">${V.phase === "reveal" ? mine.map((c, k) => `<span class="hs-c${c < 0 ? " neg" : ""}${pickable ? " pick" : ""}" data-k="${k}">${c}</span>`).join("") : myH.open.map((c, k) => cardHtml(c, k === 0 ? " top" : "")).join("") + myH.hid.map(c => cardHtml(c, " hid")).join("")}</div>
        ${V.phase === "reveal" ? "" : `<div class="hs-meter"><i class="${over ? "bad" : ""}" style="width:${Math.max(0, Math.min(100, (sum / V.L) * 100))}%"></i></div>`}</div>`;
    }
    let acts = "";
    if (V.phase === "show" && V.res) acts = showHtml(V, ctx);
    else if (!watch && myH && !V.folded[me]) {
      if (V.phase === "reveal") acts = ctx.canAct ? `<div class="note">3장 중 모두에게 <b>보여 줄 1장</b>을 눌러요 · 나머지 2장은 나만 봐요</div>` : `<div class="note">공개 카드를 고르는 중… (${V.revealed.filter(Boolean).length}/${V.hands.filter(Boolean).length})</div>`;
      else if (V.phase === "bet1" || V.phase === "bet2") {
        if (ctx.canAct) {
          const toCall = V.cur - V.bet[me], raises = [];
          if (V.cap > V.cur) for (const to of [V.cur + 1, V.cur + 3, V.cap]) if (to <= V.cap && to > V.cur && !raises.includes(to)) raises.push(to);
          acts = `<div class="note">${toCall > 0 ? `앞사람이 ${V.cur}칩까지 걸었어요 · 콜하려면 ${toCall}칩` : "아직 건 칩이 없어요"} · 이 라운드 최대 ${V.cap}칩</div>
            <div class="hs-btns">${toCall > 0 ? `<button class="btn primary" data-a="call">콜 ${toCall}</button>` : `<button class="btn primary" data-a="check">체크</button>`}
            ${raises.map(to => `<button class="btn" data-a="raise" data-to="${to}">레이즈 ${to}</button>`).join("")}<button class="btn fold" data-a="fold">폴드</button></div>`;
        } else acts = `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 차례예요…" : ""}</div>`;
      } else if (V.phase === "hit") {
        if (ctx.canAct) acts = `<div class="note">한 장 더 받을까요? 받은 카드는 모두에게 보여요 · 한계 ${V.L}을 넘으면 그 라운드 최하위 · 남은 카드 ${V.deckN}장</div>
          <div class="hs-btns"><button class="btn primary" data-a="hit" ${V.deckN ? "" : "disabled"}>HIT</button><button class="btn" data-a="stay">STAY</button></div>`;
        else acts = `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 가 고르는 중…" : ""}</div>`;
      }
    } else if (myH && V.folded[me]) acts = `<div class="note">이번 라운드는 접었어요 · 다음 라운드를 기다려요</div>`;
    else if (watch && V.phase !== "show") acts = `<div class="note">${V.needs.length ? V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") + " 생각 중…" : ""}</div>`;
    h += `<div class="hs-acts"${showing ? ' style="margin-top:0"' : ""}>${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const c = e.target.closest(".hs-c.pick");
      if (c) { ctx.sfx("pop"); ctx.act({ t: "reveal", k: +c.dataset.k }); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      ctx.sfx("pop");
      if (a === "raise") { ctx.act({ t: "raise", to: +b.dataset.to }); return; }
      ctx.act({ t: a });
    };
  }
  function showHtml(V, ctx) {
    const R = V.res;
    if (R.fold) return `<div class="hs-show"><div class="r win"><span>🏆</span><b>${esc(nameOf(ctx, R.win[0]))}</b><span class="g">+${R.pot}</span><span class="e">다른 사람이 모두 접어서 판돈을 가져가요</span></div></div>`;
    const gain = Object.fromEntries(R.gain);
    return `<div class="hs-show">${R.rows.map(x => `<div class="r${gain[x.i] > 0 ? " win" : ""}"><span>${R.win.includes(x.i) ? "🏆" : x.bust ? "💥" : "·"}</span><b>${esc(nameOf(ctx, x.i))}${x.bust ? " bust" : ""}</b><span class="g">${gain[x.i] > 0 ? "+" + gain[x.i] : ""}</span><span class="e">${x.cards.join(" + ")} = <b>${x.sum}</b> (한계 ${R.L}${x.bust ? ` · ${x.over} 넘음` : ` · ${x.d} 모자람`}) · ${x.n}장</span></div>`).join("")}${(() => { const f = V.folded.map((x, i) => (x && V.hands[i] ? i : -1)).filter(i => i >= 0); return f.length ? `<div class="r"><span>🏳</span><b>폴드</b><span></span><span class="e">${f.map(i => esc(nameOf(ctx, i))).join(" · ")}</span></div>` : ""; })()}${R.draw ? `<div class="r"><span>🤝</span><b>무승부</b><span></span><span class="e">판돈을 똑같이 나눠요 · 남는 칩은 선에 가까운 사람</span></div>` : ""}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const row = (a, b) => `<div class="hs-tut"><div class="hs-row hs-big">${a.map(c => cardHtml(c)).join("")}</div>${b || ""}</div>`;
    return [
      { tag: "STEP 1 · 카드", title: "숫자 카드의 합을 한계에 맞춰요", body: "카드는 <b>7 · 6 · 5 · 4 · 3 · 2 · 1 · −1</b> (큰 수일수록 적고, −1은 합을 깎아 줘요). 라운드마다 <b>한계 숫자(5~12)</b>가 정해지고, 카드 합이 한계에 <b>가까울수록</b> 이겨요.",
        boardHtml: row([7, 5, 3, 1, -1], `<span class="hs-lim">한계 9</span>`), ms: 5400 },
      { tag: "STEP 2 · 받기", title: "3장 받고 1장만 보여 줘요", body: "기본 베팅 1칩을 내고 카드 <b>3장</b>을 받아요. 그중 <b>1장만 공개</b>하고 나머지 2장은 나만 봐요. 그리고 1차 베팅 (콜 · 레이즈 · 폴드).",
        boardHtml: `<div class="hs-tut"><div class="hs-row hs-big"><span class="hs-c top">4</span>${cardHtml(3, " hid")}${cardHtml(2, " hid")}</div><small>🔒 숨긴 카드는 나만 · 공개한 카드는 모두에게 보여요</small></div>`, ms: 5400 },
      { tag: "STEP 3 · HIT", title: "직접 해 봐요: 9에 딱 맞추기", body: "한계 <b>9</b>, 내 카드 3장 <b>4 + 2 + 1 = 7</b>. <b>HIT</b>(한 장 더)로 9를 맞춰 보세요. 넘으면 <b>bust</b> — 그 라운드 최하위예요!",
        interactive: { hint: "👆 HIT를 눌러 보세요 (두 번 누르면 넘어요)", doneText: "✅ 7 + 2 = 9, 한계에 딱 맞았어요!" },
        render(stage, ctrl) {
          const deck = [2, 5]; let sum = 7, k = 0, msg = "";
          const draw = () => {
            stage.innerHTML = `<div class="hs-tut"><span class="hs-lim">한계 9</span><div class="hs-row hs-big">${cardHtml(4)}${cardHtml(2)}${cardHtml(1)}${deck.slice(0, k).map(c => cardHtml(c)).join("")}</div><b style="font-size:18px">합 ${sum}</b><div class="hs-btns" style="width:100%"><button class="btn primary" data-a="hit">HIT</button><button class="btn" data-a="stay">STAY</button></div><small>${msg}</small></div>`;
            if (sum === 9) ctrl.complete();
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-a]"); if (!b) return;
            ctrl.sfx("tap");
            if (b.dataset.a === "hit") { if (k < deck.length) { sum += deck[k++]; } msg = sum > 9 ? "💥 넘었어요! STAY 하면 처음으로 돌아가요" : ""; }
            else { if (sum > 9) { sum = 7; k = 0; msg = ""; } else msg = "7은 9에 2 모자라요 — 한 번 HIT 해 볼까요?"; }
            draw();
          };
          draw();
        } },
      { tag: "STEP 4 · 승부", title: "가까운 쪽이 판돈을 가져가요", body: "모두 STAY 하면 2차 베팅 뒤 카드를 공개해요. 합이 한계에 <b>가장 가까운 사람</b>이 판돈 전부! 같으면 <b>카드가 더 많은 쪽</b>이 이기고, 그래도 같으면 판돈을 나눠요.",
        boardHtml: `<div class="hs-tut"><div class="hs-row"><b>🏆 9 (3장)</b><span>vs</span><b>8 (3장)</b></div><small>한계 9 · 넘긴 사람은 무조건 지는 쪽</small></div>`, ms: 5600 },
      { tag: "STEP 5 · 끝", title: "칩이 0이 되면 탈락", body: "칩 30개로 시작해서 <b>먼저 0이 된 사람부터 탈락</b>, 한 명 남을 때까지 계속해요. 10라운드마다 기본 베팅이 1칩씩 늘어요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 HIT 해도 되는지 알려 줘요.",
        boardHtml: `<div class="hs-tut"><span style="font-size:42px">🏆</span></div>`, ms: 5000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.hitstay = {
    name: "HIT, STAY", emoji: "✋", short: "카드 합을 한계 숫자에 맞춰요", min: 2, max: 6, defN: 4, board: false,
    opts: [{ k: "chips", label: "시작 칩", items: [[30, "30칩 (방송 그대로)"], [15, "15칩 (빠르게)"]], def: 30 }],
    howto: [
      "카드 3장을 받고 <b>1장만 공개</b> · 2장은 나만 봐요 (공개는 모두 고른 뒤 한꺼번에)",
      "<b>한계 숫자(5~12)</b>에 합이 가까울수록 승 — 넘기면(bust) 최하위",
      "베팅 뒤 <b>HIT</b>(한 장 더, 모두에게 공개) 또는 <b>STAY</b>, 다시 베팅",
      "칩이 0이 되면 탈락 · 마지막 한 명이 1등",
    ],
    note: "방송과 다른 점: 피스 · 상금 없이 2~6명, 베팅에서 아무도 안 걸었으면 체크 가능, STAY 한 사람은 다시 HIT 못 함.",
    sub: V => (V.over ? "끝" : `${V.hand}라운드 · 한계 ${V.L} · ${PH[V.phase] || ""}`),
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over && V.phase !== "reveal", out: !V.alive[i] }),
    render,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (HIT/STAY 는 이길 확률, 베팅은 콜 기대값)
    actText: (a, V) => {
      if (!a) return "—";
      const sp = V && V.seat != null ? V.seat : -1;
      if (a.t === "reveal") { const raw = V && V.hands && sp >= 0 && V.hands[sp] && V.hands[sp].raw; return raw ? `카드 ${raw[a.k]} 공개` : `${a.k + 1}번째 카드 공개`; }
      if (a.t === "check") return "체크";
      if (a.t === "call") return V && sp >= 0 && V.bet ? `콜 ${Math.max(0, V.cur - V.bet[sp])}칩` : "콜";
      if (a.t === "raise") return `레이즈 → ${a.to}칩`;
      if (a.t === "fold") return "폴드";
      if (a.t === "hit") return "HIT (카드 한 장 더)";
      if (a.t === "stay") return "STAY";
      return "—";
    },
    review: (V, seat, myA, bestA, info) => {
      const rng = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      if (!V || !myA) return null;
      const rr = rng(((info && info.seed) | 0) + (V.hand | 0) * 7 + seat * 131 + (V.deckN | 0)), pct = x => Math.round(x * 100) + "%";
      if (V.phase === "hit" && (myA.t === "hit" || myA.t === "stay")) {
        const p = H.hitPlan(V, seat, "hard", rr), mine = myA.t === "hit" ? p.hit : p.stay, best = Math.max(p.hit, p.stay);
        return { sev: Math.min(100, Math.round((best - mine) * 400)), why: `합 ${p.cur}/${V.L} · HIT 하면 이길 확률 ${pct(p.hit)} · STAY면 ${pct(p.stay)} · 뽑으면 한계를 넘을 위험 ${pct(p.bustRisk)}` };
      }
      if ((V.phase === "bet1" || V.phase === "bet2") && ["check", "call", "raise", "fold"].includes(myA.t)) {
        const p = H.betPlan(V, seat, "hard", rr), ev = p.p * p.potAfter - p.toCall;
        const loss = myA.t === "fold" ? Math.max(0, ev) : (p.toCall > 0 ? Math.max(0, -ev) : 0);
        return { sev: Math.min(100, Math.round(loss * 25)), why: `이길 확률 ${pct(p.p)} · 걸린 칩 ${p.potAfter} · 콜 비용 ${p.toCall} → 콜 기대값 ${ev >= 0 ? "+" : ""}${ev.toFixed(1)}칩${myA.t === "fold" ? " (기대값이 플러스면 폴드는 손해)" : ""}` };
      }
      return null;
    },
    coach: (V, me, since, names) => H.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => H.ai(V, me, "easy", rnd),
  };
})();

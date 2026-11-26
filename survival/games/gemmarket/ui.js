/* 베니 서바이벌 · 보석 암시장 — 화면 (구매자 칸 · 휴지통 · 사람 카드 교환 · 정산표 · 마니또 곱셈 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const G = window.SVCores.gemmarket;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CARDS = G.CARDS, KN = G.KN;
  const EMO = { d: "💎", g: "🥇", s: "🥈", c: "🥉", b: "💣" };
  const CSS = `
.gm-top{display:flex;align-items:center;gap:8px;flex:none}
.gm-rd{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:4px 12px;white-space:nowrap}
.gm-ph{font:800 13px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 10px;white-space:nowrap}
.gm-log{flex:1;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.gm-prog{display:flex;gap:2px;flex:none}
.gm-prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}
.gm-prog i.done{background:rgba(253,230,138,.55)}
.gm-prog i.now{background:#86efac;box-shadow:0 0 0 1px #86efac}
.gm-board{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;flex:none}
.gm-card{position:relative;display:grid;justify-items:center;align-content:center;gap:1px;min-height:68px;padding:6px 2px;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:linear-gradient(165deg,rgba(255,255,255,.07),rgba(0,0,0,.3));color:var(--ink);font:inherit}
.gm-card .lb{font:700 11px var(--round);color:var(--soft)}
.gm-card .em{font-size:23px;line-height:1.05}
.gm-card .nm{font:900 15px var(--round)}
.gm-card.down .em{filter:grayscale(1) opacity(.5)}
.gm-card.t-b{border-color:#f87171;background:linear-gradient(165deg,rgba(239,68,68,.25),rgba(0,0,0,.3))}
.gm-card.t-d{border-color:#7dd3fc}
.gm-card.t-g{border-color:#fcd34d}
.gm-card.can{cursor:pointer;border-color:#fde68a;box-shadow:0 0 0 1px rgba(253,230,138,.4)}
.gm-card.sel{border-color:#86efac;box-shadow:0 0 0 3px rgba(134,239,172,.55)}
.gm-card.peek{border-color:#c4b5fd;box-shadow:0 0 0 3px rgba(196,181,253,.5)}
.gm-card .note{position:absolute;right:3px;top:2px;font:800 10px var(--round);color:#c4b5fd}
.gm-players{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;flex:none}
.gm-pl{display:grid;justify-items:center;gap:1px;padding:5px 2px;border-radius:12px;border:1.5px solid rgba(255,255,255,.14);background:rgba(0,0,0,.24);color:var(--ink);font:inherit;min-width:0}
.gm-pl .e{font-size:20px;line-height:1}
.gm-pl .n{font:800 11px var(--round);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm-pl .s{font:700 10.5px var(--round);color:var(--soft)}
.gm-pl.turn{border-color:#86efac;background:rgba(34,197,94,.16)}
.gm-pl.lead .n::before{content:"⭐"}
.gm-pl.can{cursor:pointer;border-color:#fde68a}
.gm-pl.sel{border-color:#86efac;box-shadow:0 0 0 3px rgba(134,239,172,.55)}
.gm-pl.me{border-style:dashed}
.gm-pl.out{opacity:.4}
.gm-mine{display:flex;align-items:center;gap:10px;flex:none}
.gm-mine .gm-card{width:84px;min-height:78px;flex:none}
.gm-mine .tx{font-size:12.5px;color:var(--soft);display:grid;gap:3px}
.gm-mine .tx b{color:#fde68a}
.gm-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.gm-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.gm-acts .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gm-show{display:grid;gap:4px;font-size:12px;font-variant-numeric:tabular-nums}
.gm-show .hd{font:800 12.5px var(--round);color:#fde68a;text-align:center}
.gm-show .r{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:2px 8px;align-items:center;padding:3px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.gm-show .r.me{border-color:#86efac}
.gm-show .r b{font:800 12px var(--round);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm-show .r .g{font:900 13px var(--round);color:#fde68a;text-align:right;min-width:30px}
.gm-show .r .g.neg{color:#f87171}
.gm-fin{display:grid;gap:5px;font-size:12.5px;font-variant-numeric:tabular-nums}
.gm-fin .r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:5px 9px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.gm-fin .r.me{border-color:#86efac}
.gm-fin .r i{font-style:normal;font:900 14px var(--round);color:#fde68a}
.gm-fin .r i.neg{color:#f87171}
.gm-fin .r small{grid-column:2/-1;color:var(--soft)}
.gm-tut{display:grid;gap:8px;justify-items:center;width:100%}
.gm-tut .gm-board{width:100%}
.gm-opts{display:flex;gap:10px;justify-content:center}
.gm-opts button{min-width:62px}
@media (max-height:700px){.gm-top{gap:6px}.gm-board{gap:5px}.gm-card{min-height:52px;padding:3px 2px}.gm-card .em{font-size:19px}.gm-card .nm{font-size:13px}.gm-players{grid-template-columns:repeat(5,1fr);gap:4px}.gm-pl{padding:3px 1px}.gm-pl .e{font-size:16px}.gm-pl .s{font-size:9.5px}.gm-mine{gap:8px}.gm-mine .gm-card{width:72px;min-height:60px}.gm-mine .tx{font-size:11.5px;gap:1px}.gm-acts{gap:5px}.gm-acts .btn.big{min-height:44px;padding:6px 6px;font-size:13.5px}.gm-acts .note{font-size:11.5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const emo = (ctx, i) => (ctx.seats[i] && ctx.seats[i].emoji) || "🙂";
  let lastSeats = [];

  // ── 카드 그림 ──
  const num = c => (CARDS[c].k === "b" ? String(CARDS[c].v) : String(CARDS[c].v));
  function faceHtml(c, cls = "", label = "") {
    const C = CARDS[c];
    return `<span class="gm-card t-${C.k} ${cls}">${label ? `<span class="lb">${label}</span>` : ""}<span class="em">${EMO[C.k]}</span><span class="nm">${KN[C.k]} ${num(c)}</span></span>`;
  }
  const backHtml = (cls = "", label = "", extra = "") => `<span class="gm-card down ${cls}">${label ? `<span class="lb">${label}</span>` : ""}<span class="em">🂠</span><span class="nm">?</span>${extra}</span>`;

  // ── 선택 상태 (내 차례마다 새로) ──
  let SEL = null;
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.step}`; if (!SEL || SEL.key !== key) SEL = { key, to: -1, peek: false }; return SEL; };

  const toLabel = (to, ctx) => (to < 3 ? `구매자 ${to + 1}칸` : to === 3 ? "휴지통" : nameOf(ctx, to - 4));
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    if (e.k === "swap") return `${esc(nameOf(ctx, e.s))} ↔ ${esc(toLabel(e.to, ctx))}`;
    if (e.k === "peek") return `${esc(nameOf(ctx, e.s))} 몰래 봄`;
    if (e.k === "round") return `${e.r}라운드 시작 · 선 ${esc(nameOf(ctx, e.lead))}`;
    return "";
  }
  // 내가 봤던 칸 (본 뒤 바뀌었는지)
  function peekInfo(V, me) {
    const out = {};
    if (me < 0) return out;
    for (const e of V.kn) if (e.k === "peek") {
      const changed = V.swaps.filter(x => x.to === e.loc && x.step >= e.st).length;
      out[e.loc] = { c: e.c, changed };
    }
    return out;
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats;
    const me = ctx.me, watch = me < 0, S = V.sec, n = V.n;
    const myTurn = !watch && ctx.canAct && V.phase === "swap";
    const sel = myTurn ? selFor(V, ctx) : { to: -1, peek: false };
    const turnSeat = V.turn;
    let h = `<div class="gm-top"><span class="gm-rd">${V.round} / ${V.rounds}</span><span class="gm-ph">${V.phase === "swap" ? `교환 ${V.step + 1}/${V.total}` : V.phase === "show" ? "결과" : "끝"}</span><span class="gm-log">${logText(V, ctx)}</span></div>`;
    h += `<div class="gm-prog">${Array.from({ length: V.total }, (_, k) => `<i class="${V.phase !== "swap" || k < V.step ? "done" : k === V.step ? "now" : ""}"></i>`).join("")}</div>`;
    // 판 가운데: 구매자 3칸 + 휴지통
    const pk = peekInfo(V, me), R = V.res;
    const spot = (loc, label) => {
      const can = myTurn && (sel.peek ? (!V.peeked && true) : !V.bombLock);
      let inner;
      if (R) { const c = loc < 3 ? R.slots[loc] : R.trash; inner = faceHtml(c, "", label); }
      else if (S) { const c = loc < 3 ? S.slots[loc] : S.trash; inner = faceHtml(c, "", label + " (구경)"); }
      else if (pk[loc]) inner = faceHtml(pk[loc].c, "peek", label).replace("</span></span>", `</span><span class="note">${pk[loc].changed ? `🔍 본 뒤 ${pk[loc].changed}번 바뀜` : "🔍 내가 봄"}</span></span>`);
      else inner = backHtml("", label);
      return `<button type="button" class="gm-slot" data-to="${loc}" ${can ? "" : "disabled"} style="all:unset;display:block;cursor:${can ? "pointer" : "default"}">${inner.replace('class="gm-card ', `class="gm-card ${can ? "can " : ""}${sel.to === loc ? "sel " : ""}`)}</button>`;
    };
    h += `<div class="gm-board">${spot(0, "구매자 1")}${spot(1, "구매자 2")}${spot(2, "구매자 3")}${spot(3, "휴지통")}</div>`;
    // 사람들
    const cell = i => {
      const isMe = i === me, can = myTurn && !isMe && !sel.peek, left = V.order.slice(V.step + (V.phase === "swap" ? 0 : 99)).filter(x => x === i).length;
      const cls = `gm-pl${i === turnSeat ? " turn" : ""}${i === V.lead ? " lead" : ""}${can ? " can" : ""}${sel.to === 4 + i ? " sel" : ""}${isMe ? " me" : ""}`;
      return `<button type="button" class="${cls}" data-to="${4 + i}" ${can ? "" : "disabled"}><span class="e">${esc(emo(ctx, i))}</span><span class="n">${esc(isMe ? "나" : nameOf(ctx, i))}</span><span class="s">점수 ${V.score[i]}${V.phase === "swap" ? ` · 남은 ${left}` : ""}</span></button>`;
    };
    // 결과 화면에서는 아래 순위 목록이 사람 칸을 대신해요 (9명도 한 화면에 들어가게)
    if (!(V.phase === "show" && R)) h += `<div class="gm-players">${Array.from({ length: n }, (_, i) => cell(i)).join("")}</div>`;
    // 내 카드
    if (!watch && V.phase === "swap") {
      let card, tx;
      if (V.mine != null) { card = faceHtml(V.mine, "", "내 카드"); tx = `<span>지금 내 차례 — 내 카드를 어디와 바꿀까요?</span><span>${V.bombLock ? "<b>폭탄</b>이라 사람과만 바꿀 수 있어요" : "구매자 칸 · 휴지통 · 사람 중 하나"}</span>`; }
      else if (V.seen) { card = faceHtml(V.seen.c, "", "마지막에 본 카드").replace('class="gm-card ', 'class="gm-card down '); tx = `<span>내 카드는 <b>내 차례에만</b> 볼 수 있어요</span><span>마지막으로 본 카드예요 — 그 뒤 누가 바꿨을 수 있어요</span>`; }
      else { card = backHtml("", "내 카드"); tx = "<span>내 카드는 내 차례에만 볼 수 있어요</span>"; }
      tx += `<span>내 점수가 곱해지는 사람: <b>${V.forWho >= 0 ? esc(nameOf(ctx, V.forWho)) : "?"}</b></span>`;
      h += `<div class="gm-mine">${card}<div class="tx">${tx}</div></div>`;
    }
    // 아래 행동 칸
    let acts = "";
    if (V.phase === "show" && R) acts = showHtml(V, ctx);
    else if (V.phase === "swap") {
      if (myTurn) {
        const can = sel.to >= 0;
        acts = `<div class="row2"><button class="btn primary big" data-a="swap" ${can ? "" : "disabled"}>${can ? `↔ ${esc(toLabel(sel.to, ctx))}${ja(esc(toLabel(sel.to, ctx)),"와")} 교환` : "바꿀 곳을 눌러요"}</button><button class="btn big${sel.peek ? " primary" : ""}" data-a="peek" ${V.peeked ? "disabled" : ""}>${V.peeked ? "👁 이미 봤어요" : sel.peek ? "👁 볼 칸을 눌러요" : "👁 몰래 보기"}</button></div>
          <div class="note">${sel.peek ? "구매자 칸이나 휴지통을 누르면 그 카드를 볼 수 있어요" : `교환은 꼭 해야 해요 · 사람 카드는 모르는 채로 바꿔요${V.peeked ? "" : " · 몰래 보기는 게임 중 한 번"}`}</div>`;
      } else acts = `<div class="note">${watch ? "AI 들이 교환하는 중…" : turnSeat >= 0 ? `${esc(nameOf(ctx, turnSeat))} 차례예요…` : ""}</div>`;
    }
    h += `<div class="gm-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const peekB = e.target.closest("[data-a=peek]");
      if (peekB && !peekB.disabled) { const s = selFor(V, ctx); s.peek = !s.peek; if (s.peek) s.to = -1; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const sw = e.target.closest("[data-a=swap]");
      if (sw && !sw.disabled) { const s = selFor(V, ctx); if (s.to >= 0) { const to = s.to; s.to = -1; sw.disabled = true; ctx.sfx("pop"); ctx.act({ t: "swap", to }); } return; }
      const t = e.target.closest("[data-to]");
      if (t && !t.disabled) {
        const to = +t.dataset.to, s = selFor(V, ctx);
        if (s.peek && to < 4) { ctx.sfx("pop"); s.peek = false; ctx.act({ t: "peek", loc: to }); return; }
        if (!s.peek) { s.to = s.to === to ? -1 : to; ctx.sfx("tap"); render(stage, V, ctx); }
      }
    };
  }
  function showHtml(V, ctx) {
    const R = V.res, me = ctx.me, b = R.buyers;
    const buyers = ["d", "g", "s", "c"].filter(k => b[k]).map(k => `${EMO[k]} ${KN[k]} ×${b[k]}`).join(" · ") || "보석 구매자 없음";
    let rows = `<div class="hd">구매자: ${buyers}</div>`;
    rows += Array.from({ length: V.n }, (_, i) => i).sort((a, c) => R.gains[c] - R.gains[a]).map(i => {
      const g = R.gains[i], cum = V.score[i];
      return `<div class="r${i === me ? " me" : ""}"><b>${esc(emo(ctx, i))} ${esc(i === me ? "나" : nameOf(ctx, i))}</b><span>${EMO[CARDS[R.hands[i]].k]}${num(R.hands[i])}</span><span class="g${R.bonus[i] ? "" : ""}">${R.bonus[i] ? `+${R.bonus[i]}` : ""}</span><span class="g${g < 0 ? " neg" : ""}">${g >= 0 ? "+" : ""}${g} <small style="color:var(--soft)">(${cum})</small></span></div>`;
    }).join("");
    rows += `<div class="hd" style="color:var(--soft);font-weight:600">버린 카드: ${R.out.length ? R.out.map(c => EMO[CARDS[c].k] + num(c)).join(" ") : "없음"} · 괄호는 지금까지 합 · +3은 내 폭탄을 가져간 사람이 있어서 받은 점수</div>`;
    return `<div class="gm-show">${rows}</div>`;
  }
  function result(V) {
    if (!V.final) return "";
    const F = V.final, order = Array.from({ length: V.n }, (_, i) => i).sort((a, b) => F.ranks[a] - F.ranks[b]);
    const nm = i => esc((lastSeats[i] && lastSeats[i].name) || `${i + 1}번`);
    return `<div class="gm-fin">${order.map(i => `<div class="r${i === V.seat ? " me" : ""}"><span>${F.ranks[i] + 1}등</span><b>${esc((lastSeats[i] && lastSeats[i].emoji) || "")} ${nm(i)}</b><i class="${F.fin[i] < 0 ? "neg" : ""}">${F.fin[i]}</i><small>내 점수 ${F.score[i]} × 마니또 ${nm(F.manito[i])}의 ${F.score[F.manito[i]]}</small></div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 카드", title: "보석 카드와 폭탄 카드", body: "카드는 <b>13장</b>: 다이아 5·6 / 금 4·5 / 은 2·3·4 / 동 1·1·2·2 / <b>폭탄 −6 · −4</b>. 사람마다 1장씩 뒷면으로 받고, 가운데에 <b>구매자 칸 3개 + 휴지통 1칸</b>이 놓여요. 내 카드는 내 차례에만 볼 수 있어요.",
        boardHtml: `<div class="gm-tut"><div class="gm-board">${faceHtml(0)}${faceHtml(3)}${faceHtml(5)}${faceHtml(11)}</div><small>다이아 · 금 · 은 · 폭탄 (동은 1~2점)</small></div>`, ms: 5600 },
      { tag: "STEP 2 · 교환", title: "내 카드를 바꿔요 — 꼭 해야 해요", body: "내 차례에 내 카드를 <b>다른 사람 카드 · 구매자 칸 카드 · 휴지통 카드</b> 중 하나와 맞바꿔요. 순서는 선부터 <b>한 바퀴 정순, 한 바퀴 역순</b> — 선은 첫 교환과 마지막 교환을 둘 다 해요.",
        boardHtml: `<div class="gm-tut"><div class="gm-prog" style="width:100%">${Array.from({ length: 8 }, (_, k) => `<i class="${k < 3 ? "done" : k === 3 ? "now" : ""}"></i>`).join("")}</div><b>1 → 2 → 3 → 4 → 4 → 3 → 2 → 1</b><small>4명일 때 교환 순서 (선 = 1번)</small></div>`, ms: 5600 },
      { tag: "STEP 3 · 직접", title: "점수 계산해 보기", body: "라운드가 끝나면 내 카드와 <b>같은 종류 구매자 칸마다</b> 카드 숫자만큼 점수를 받아요. 구매자 칸이 <b>은 · 은 · 금</b> 이고 내가 <b>은 3</b>을 들고 있다면 몇 점일까요?",
        interactive: { hint: "👆 점수를 골라요", doneText: "✅ 은 3 × 은 구매자 2칸 = 6점!" },
        render(stage, ctrl) {
          const draw = (msg) => {
            stage.innerHTML = `<div class="gm-tut"><div class="gm-board">${faceHtml(5, "", "구매자 1")}${faceHtml(6, "", "구매자 2")}${faceHtml(3, "", "구매자 3")}${faceHtml(5, "", "내 카드")}</div><div class="gm-opts">${[3, 6, 9].map(v => `<button type="button" class="btn" data-v="${v}">${v}점</button>`).join("")}</div><small>${msg || "구매자 칸의 종류를 세어 보세요"}</small></div>`;
          };
          stage.onclick = e => { const b = e.target.closest("[data-v]"); if (!b) return; if (+b.dataset.v === 6) { ctrl.complete(); draw("정답! 같은 종류 구매자 한 칸마다 한 번씩 받아요"); } else { ctrl.sfx("tap"); draw(`${b.dataset.v}점은 아니에요 — 은 구매자가 몇 칸인지 다시 세어 봐요`); } };
          draw();
        } },
      { tag: "STEP 4 · 폭탄", title: "폭탄은 사람에게만 넘겨요", body: "폭탄을 들고 끝나면 숫자만큼 <b>깎여요</b>. 폭탄은 구매자 칸 · 휴지통에 못 넣고 <b>사람과만</b> 바꿔요. 누가 내 폭탄을 가져가면 나는 그 자리에서 <b>+3점</b>! 그리고 <b>−6 폭탄을 든 사람</b>이 다음 라운드 선이에요.",
        boardHtml: `<div class="gm-tut"><div class="gm-board">${faceHtml(11, "", "−6")}${faceHtml(12, "", "−4")}</div><small>다음 선 = −6 폭탄 보유자 → −4 보유자 → 그대로</small></div>`, ms: 5600 },
      { tag: "STEP 5 · 마니또", title: "내 순위는 마니또와 곱해요", body: "3라운드 점수를 모은 뒤 <b>내 점수 × 내 마니또의 점수</b> 가 최종 점수예요. 사람들이 한 바퀴로 이어져 있고, 나는 <b>내가 누구의 마니또인지</b>만 알아요. 내 마니또가 누구인지는 몰라요.",
        boardHtml: `<div class="gm-tut"><div class="gm-fin" style="width:100%"><div class="r me"><span>예</span><b>🙂 나</b><i class="neg">−156</i><small>내 점수 13 × 마니또의 −12</small></div></div><small>막히면 <b>🧑‍🏫 AI 선생님</b>이 어디와 바꿀지 알려 줘요</small></div>`, ms: 6000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.gemmarket = {
    name: "보석 암시장", emoji: "💎", short: "카드를 바꿔 구매자에게 팔고, 마니또 점수와 곱해요", min: 4, max: 9, defN: 9, board: false,
    opts: [],
    howto: [
      "3라운드, 사람마다 <b>뒷면 카드 1장</b> · 가운데 구매자 칸 3개 + 휴지통 — 내 카드는 <b>처음 받을 때 한 번</b>, 그 뒤엔 내 차례에만 볼 수 있어요 (교환으로 받은 카드는 내 다음 차례에 봐요)",
      "내 차례에 내 카드를 <b>사람 · 구매자 칸 · 휴지통</b> 카드와 꼭 바꿔요 (정순 한 바퀴 → 역순 한 바퀴) · <b>폭탄</b>은 사람과만 바꿀 수 있어요",
      "끝나면 내 보석과 같은 종류의 <b>구매자 칸마다 숫자만큼</b> 점수 · 폭탄은 깎임 · 누가 내 폭탄을 가져가면 <b>+3</b> · 다음 라운드 선은 <b>−6 폭탄</b>을 든 사람 → 없으면 <b>−4 폭탄</b>을 든 사람 → 없으면 그대로",
      "최종 점수 = <b>내 점수 × 내 마니또의 점수</b> (나는 내가 누구의 마니또인지만 알아요) · 높은 순서가 순위",
    ],
    note: "방송과 다른 점: 4~9명 (방송은 9명, 빈 자리는 AI), 피스가 없어서 구매자 · 휴지통 카드 몰래 보기는 게임 중 한 번 공짜, 3분 제한 · 대화 없음 (방송은 대화로 서로의 마니또를 알아내지만 여기서는 내 마니또를 끝까지 몰라요 — 고급 AI · 선생님은 공개된 점수와 '내가 누구의 마니또인지'만으로 계산해요), 첫 선은 무작위, 점수가 같으면 내 점수가 높은 쪽이 위.",
    sub: V => (V.over ? "끝" : V.phase === "swap" ? `${V.round} / ${V.rounds}라운드 · 교환 ${V.step + 1}/${V.total}` : `${V.round} / ${V.rounds}라운드 · 결과`),
    chip: (V, i) => ({ t: V.over && V.final ? `${V.final.fin[i]}` : `${V.score[i]}점`, on: V.needs.includes(i) && !V.over }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 가 계산한 '최종 순위에서 남을 이길 몫' 과 견줌 — 마니또는 모르는 것으로 보고)
    actText: (a, V, names) => {
      if (!a) return "—";
      const PL = ["구매자 1칸", "구매자 2칸", "구매자 3칸", "휴지통"];
      if (a.t === "peek") return `${PL[a.loc] || "?"} 몰래 봄`;
      if (a.t === "swap") return `${G.toText(a.to, names)}${ja(G.toText(a.to, names),"와")} 교환`;
      return "—";
    },
    review: (V, seat, myA, bestA, info) => {
      if (!V || !myA || !bestA || myA.t !== "swap" || bestA.t !== "swap" || V.mine == null) return null;
      const r = (() => { let a = (((info && info.seed) | 0) + V.round * 131 + V.step * 17 + seat) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      const L = G.evalRank(V, seat, 120, r), best = L[0], mine = L.find(x => x.to === myA.to);
      if (!best || !mine) return null;
      const names = info && info.names;
      const f = x => (x >= 0 ? "+" : "") + x.toFixed(1), pc = x => Math.round(x * 100) + "%";
      return { sev: Math.max(0, Math.min(100, Math.round((best.ev - mine.ev) * 240))), why: `최종 순위에서 남을 이길 몫 — 고급 AI가 본 최선 ${G.toText(best.to, names)} ${pc(best.win)} (이번 라운드 ${f(best.pts)}점) / 내 선택 ${G.toText(myA.to, names)} ${pc(mine.win)} (${f(mine.pts)}점) · 마니또는 모르는 것으로 보고, 남은 교환은 무작위로 가정` };
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
  };
})();

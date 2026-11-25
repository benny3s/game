/* 베니 서바이벌 · 빅 스몰 — 화면 (딜러 카드 · 대결 카드 · 베팅 · 손패 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.bigsmall;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bits = K.bits, R = K.R;
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 7일차 결승전 1회전 (1:1)";
  const DIFF = "1라운드 역할은 무작위 (방송은 베네핏 가진 사람이 정함) · 대결 카드를 뒷면으로 먼저 낸 뒤 베팅 · 베팅은 1개부터 가진 칩 전부까지 · 18라운드 뒤 칩이 같으면 무승부 — 셋은 방송 글에 없어서 우리가 정함 · 남은 카드(두 사람 손패 · 남은 딜러 카드)는 화면에 보여 줌 (방송은 노트로 셈)";
  const SIDE = { B: "빅", S: "스몰" }, ARW = { B: "▲", S: "▼" };
  const AMTWHY = { one: "틀려도 크게 안 잃을 만큼", kelly: "맞을 · 틀릴 확률 차이에 맞춰 (절반 켈리)", need: "내 마지막 베팅이라 상대를 따라잡을 만큼", all: "틀릴 수 없어 전부" };
  const pct = p => `${Math.round(p * 100)}%`;
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const ga = w => { const j = jong(w); return j < 0 ? "이(가)" : j ? "이" : "가"; };
  // 숫자 뒤 조사 '을/를' — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침
  const josaEul = v => /^(0|1|3|6|7|8|10)$/.test(String(v)) ? "을" : "를";
  const eul = v => `${v}${josaEul(v)}`;

  const CSS = `
.bs-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.bs-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:4px 10px}
.bs-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.bs-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.bs-pill.sm{font-weight:700;color:var(--soft)}
.bs-pill.r{margin-left:auto;flex:none}
.bs-chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}
.bs-who{display:flex;align-items:center;gap:6px;min-width:0;padding:4px 9px;border-radius:12px;background:rgba(0,0,0,.25);border:1.5px solid rgba(255,255,255,.1)}
.bs-who.on{border-color:var(--gold)}
.bs-who .nm{min-width:0;display:grid;line-height:1.2}
.bs-who .nm b{font:800 12px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-who .nm i{font:700 10.5px var(--round);font-style:normal;color:var(--soft);white-space:nowrap}
.bs-who .c{margin-left:auto;font:900 22px/1 var(--round);color:#fde68a;font-variant-numeric:tabular-nums;white-space:nowrap}
.bs-who .c small{font-size:11px;margin-right:2px}
.bs-table{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:end;flex:none;padding:6px 4px 4px;border-radius:14px;background:radial-gradient(ellipse at 50% 30%,rgba(22,101,52,.55),rgba(5,46,22,.6));border:1px solid rgba(134,239,172,.25)}
.bs-slot{display:grid;justify-items:center;gap:3px;min-width:0}
.bs-slot>i{font:700 10.5px var(--round);font-style:normal;color:#bbf7d0;white-space:nowrap}
.bs-card{width:54px;height:74px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(#fff,#e2e8f0);border:2px solid #94a3b8;color:#0f172a;font:900 30px/1 var(--round);box-shadow:0 3px 8px rgba(0,0,0,.45)}
.bs-card.dl{border-color:#f5b301;background:linear-gradient(#fffbeb,#fde68a)}
.bs-card.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 6px,#991b1b 6px 12px);border-color:#fecaca;color:#fecaca;font-size:22px}
.bs-card.none{background:transparent;border:2px dashed rgba(255,255,255,.25);box-shadow:none;color:rgba(255,255,255,.35);font-size:16px}
.bs-card.w{box-shadow:0 0 0 3px #4ade80,0 3px 8px rgba(0,0,0,.45)}
.bs-bet{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;align-content:center;background:rgba(0,0,0,.3);border:2px dashed rgba(253,230,138,.4);color:#fde68a;font:900 15px/1.15 var(--round);text-align:center}
.bs-bet.B{border:2px solid #4ade80;color:#bbf7d0;background:rgba(34,197,94,.18)}
.bs-bet.S{border:2px solid #f87171;color:#fecaca;background:rgba(239,68,68,.16)}
.bs-bet small{font:800 11px var(--round)}
.bs-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.bs-info b{color:#fde68a}
.bs-info .g{color:#86efac}.bs-info .r{color:#fca5a5}
.bs-info.end{font:800 13.5px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.bs-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.bs-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.bs-act{display:grid;gap:6px;flex:none}
.bs-lbl{display:flex;justify-content:space-between;gap:6px;font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.bs-lbl b{color:#fff}
.bs-hand{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}
.bs-h{position:relative;height:50px;border-radius:9px;border:2px solid #cbd5e1;background:linear-gradient(#f8fafc,#e2e8f0);color:#0f172a;font:900 21px/1 var(--round);padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.bs-h{cursor:default;display:grid;place-items:center}
.bs-h.gt{border-color:#22c55e}.bs-h.lt{border-color:#ef4444}.bs-h.eq{border-color:#94a3b8;border-style:dashed}
.bs-h small{position:absolute;right:3px;bottom:2px;font:800 9px var(--round);color:#475569}
.bs-h.gt small{color:#15803d}.bs-h.lt small{color:#b91c1c}
.bs-h.x{background:#1e293b;border-color:#334155;color:#475569;text-decoration:line-through;cursor:default}
.bs-h.sel{background:linear-gradient(#fde68a,#f59e0b);border-color:#fff;box-shadow:0 3px 10px rgba(245,158,11,.55)}
.bs-mini{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}
.bs-mini span{min-width:22px;height:26px;padding:0 3px;border-radius:5px;display:grid;place-items:center;font:900 13px/1 var(--round);background:#f1f5f9;color:#0f172a;border:2px solid #94a3b8}
.bs-mini span.gt{border-color:#22c55e}.bs-mini span.lt{border-color:#ef4444}.bs-mini span.x{opacity:.25;text-decoration:line-through}
.bs-sides{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.bs-sd{height:50px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font:900 17px/1.1 var(--round);cursor:pointer;display:grid;place-items:center;align-content:center;padding:0}
.bs-sd small{font:700 10.5px var(--round);color:var(--soft)}
.bs-sd.B.on{background:rgba(34,197,94,.3);border-color:#4ade80}
.bs-sd.S.on{background:rgba(239,68,68,.3);border-color:#f87171}
.bs-amt{display:flex;gap:5px;align-items:center;justify-content:center}
.bs-amt button{min-width:44px;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:800 15px var(--round);cursor:pointer;padding:0 6px}
.bs-amt button:disabled{opacity:.35;cursor:default}
.bs-amt .n{min-width:58px;text-align:center;font:900 22px/1 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.bs-amt .n small{font-size:11px;color:var(--soft);display:block;font-weight:700}
.bs-go{height:46px;border-radius:12px;border:0;background:linear-gradient(#22c55e,#15803d);color:#fff;font:900 15px var(--round);cursor:pointer}
.bs-go:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);cursor:default}
.bs-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.bs-tut .bs-table{width:min(100%,300px)}
.bs-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.bs-tmsg b{color:#fde68a}
@media (max-height:650px){.bs-card{width:46px;height:62px;font-size:25px}.bs-bet{width:62px;height:62px;font-size:13px}.bs-h{height:46px}.bs-sd{height:46px}.bs-who .c{font-size:19px}.bs-info{min-height:2.4em;font-size:12px}}
@media (min-height:760px){.bs-card{width:62px;height:86px;font-size:34px}.bs-bet{width:84px;height:84px}.bs-h{height:56px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  const vs = (v, D) => v > D ? "gt" : v < D ? "lt" : "eq";

  // 손패 줄 (작게) — 딜러 카드와 견줘 색: 초록 = 빅 · 빨강 = 스몰
  const miniHand = (mask, D, gone) => `<div class="bs-mini">${Array.from({ length: 11 }, (_, v) => (mask >> v & 1) ? `<span class="${D ? vs(v, D) : ""}">${v}</span>` : gone ? `<span class="x">${v}</span>` : "").join("")}</div>`;
  const countTxt = (mask, D) => { const H = bits(mask); const b = H.filter(v => v > D).length, s = H.filter(v => v < D).length, t = H.length - b - s; return { b, s, t, txt: `빅 ${b} · 스몰 ${s}${t ? ` · 같음 ${t}` : ""}` }; };
  function resLine(h, me, ctx) {
    const nm = s => me === s ? "나" : me >= 0 ? "상대" : esc(nameOf(ctx, s));
    const d = h.duel, b = 1 - d;
    const duel = h.P > h.D ? `<span class="g">${nm(d)} 대결 승 +${h.g}</span>` : h.P === h.D ? "대결 비김" : `${nm(d)} 대결 패`;
    const bet = h.b > 0 ? `<span class="g">${nm(b)} ${SIDE[h.side]} ${h.amt} 맞음 +${h.b}</span>` : h.b < 0 ? `<span class="r">${nm(b)} ${SIDE[h.side]} ${h.amt} 틀림 −${h.amt}</span>` : `${nm(b)} 베팅 돌려받음`;
    return `카드 <b>${h.P}</b> vs 딜러 <b>${h.D}</b> → ${duel} · ${bet}`;
  }
  function endLine(V, me, ctx) {
    const r = V.res; if (!r) return "";
    const nm = s => me === s ? "나" : me >= 0 ? "상대" : esc(nameOf(ctx, s));
    if (r.w < 0) return `🤝 무승부 — 18라운드 뒤 칩 ${r.chips[0]} : ${r.chips[1]}`;
    const why = r.why === "zero" ? `${me === 1 - r.w ? "내" : nm(1 - r.w) + "의"} 칩이 0개가 됐어요` : `18라운드 뒤 칩 ${r.chips[r.w]} : ${r.chips[1 - r.w]}`;
    return `${me < 0 || me === r.w ? "🏆" : "😵"} ${nm(r.w)} 승 — ${why}`;
  }

  // 이 기기에서만: 고른 카드 · 베팅 쪽 · 칩 수 (라운드 · 단계가 바뀌면 지움)
  let SEL = { key: "" };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.r}|${V.phase}|${ctx.me}`; if (SEL.key !== key) SEL = { key, card: -1, side: "", amt: 1 }; return SEL; };

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, S = selFor(V, ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    const isDuel = me === V.duel, opp = me >= 0 ? 1 - me : -1;
    // 윗줄
    const roleTxt = over ? (V.res.w < 0 ? "🤝 무승부" : me < 0 ? `🏆 ${esc(nameOf(ctx, V.res.w))} 승` : me === V.res.w ? "🏆 내 승" : "😵 상대 승") : me < 0 ? `${esc(nameOf(ctx, V.duel))} 대결 · ${esc(nameOf(ctx, V.bettor))} 베팅` : isDuel ? "🃏 내가 대결" : "🪙 내가 베팅";
    let h = `<div class="bs-top"><span class="bs-pill ${over ? "" : can ? "me" : "turn"}">${can ? (V.phase === "duel" ? "카드 낼 차례" : "베팅할 차례") : over ? "끝" : V.phase === "show" ? "결과" : me < 0 ? (V.phase === "duel" ? "카드 고르는 중" : "베팅 중") : "상대 차례"}</span>`;
    h += `<span class="bs-pill sm">${roleTxt}</span><span class="bs-pill sm r">${Math.min(V.r, R)}/${R}R</span></div>`;
    // 칩
    const seatsShown = me >= 0 ? [me, opp] : [0, 1];
    h += `<div class="bs-chips">`;
    for (const s of seatsShown) {
      const nm = me >= 0 ? (s === me ? "나" : "상대") : nameOf(ctx, s);
      h += `<div class="bs-who${V.needs.includes(s) && !over ? " on" : ""}"><span class="nm"><b>${esc(nm)}</b><i>${s === V.duel ? "🃏 대결" : "🪙 베팅"}</i></span><span class="c"><small>🪙</small>${V.chips[s]}</span></div>`;
    }
    h += `</div>`;
    // 테이블: 딜러 카드 · 대결 카드 · 베팅
    const showP = V.P >= 0 && (V.phase !== "duel");
    const pCls = showP ? `bs-card${V.phase === "show" || over ? (V.P > V.D ? " w" : "") : ""}` : V.phase === "bet" ? "bs-card back" : "bs-card none";
    const pTxt = showP ? V.P : V.phase === "bet" ? "?" : "대기";
    const bet = V.bet && (V.phase === "show" || over) ? V.bet : null;
    h += `<div class="bs-table"><div class="bs-slot"><span class="bs-card dl">${V.D}</span><i>딜러</i></div>`
      + `<div class="bs-slot"><span class="${pCls}">${pTxt}</span><i>${me >= 0 ? (isDuel ? "내 카드" : "상대 카드") : "대결 카드"}</i></div>`
      + `<div class="bs-slot"><span class="bs-bet${bet ? " " + bet.side : ""}">${bet ? `${ARW[bet.side]} ${SIDE[bet.side]}<small>${bet.amt}칩</small>` : "베팅"}</span><i>${me >= 0 ? (isDuel ? "상대 베팅" : "내 베팅") : "베팅"}</i></div></div>`;
    // 안내
    const who = s => me === s ? "내가" : me >= 0 ? "상대가" : `${esc(nameOf(ctx, s))}${ga(nameOf(ctx, s))}`;
    let info = "", ic = "";
    const last = V.last;
    if (over) { info = `${endLine(V, me, ctx)}${last ? `<br>${resLine(last, me, ctx)}` : ""}`; ic = V.res.w < 0 ? " end mid" : me >= 0 && me !== V.res.w ? " end bad" : " end"; }
    else if (V.phase === "show" && last) info = `${resLine(last, me, ctx)} · 곧 다음 라운드`;
    else if (can && V.phase === "duel") info = `딜러 <b>${V.D}</b> — 낼 카드를 골라요. <b>${V.D}</b>보다 크면 대결 승 (+차이), 상대는 빅 · 스몰에 걸어요`;
    else if (can && V.phase === "bet") { const c = countTxt(V.hand[V.duel], V.D); info = `상대 카드가 딜러 <b>${V.D}</b>보다 클까요? 상대 손패 ${c.txt}`; }
    else if (V.phase === "duel") info = `${who(V.duel)} 딜러 <b>${V.D}</b>${josaEul(V.D)} 보고 카드를 고르는 중…`;
    else info = `${who(V.bettor)} 빅 · 스몰에 거는 중…${isDuel && V.P >= 0 ? ` (내 카드 ${V.P})` : ""}`;
    h += `<div class="bs-info${ic}"><span>${info}</span></div>`;
    // 아래: 할 일
    h += `<div class="bs-act">`;
    const D = V.phase === "show" || over ? 0 : V.D;
    if (can && V.phase === "duel") {
      const H = V.handOwn ? V.handOwn[me] : V.hand[me];
      h += `<div class="bs-lbl"><span>내 손패 · 초록 = 딜러보다 큼</span><b>${bits(H).length}장</b></div><div class="bs-hand">`;
      for (let v = 0; v <= 10; v++) {
        const has = H >> v & 1;
        h += has ? `<button type="button" class="bs-h ${vs(v, V.D)}${S.card === v ? " sel" : ""}" data-card="${v}" aria-label="카드 ${v}">${v}${v > V.D ? `<small>+${v - V.D}</small>` : ""}</button>` : `<span class="bs-h x">${v}</span>`;
      }
      h += `</div><button type="button" class="bs-go" data-go="card"${S.card < 0 ? " disabled" : ""}>${S.card < 0 ? "카드를 골라요" : `카드 ${S.card} 내기 (뒷면)`}</button>`;
    } else if (can && V.phase === "bet") {
      const c = V.chips[me], amt = Math.max(1, Math.min(c, S.amt)); S.amt = amt;
      h += `<div class="bs-lbl"><span>상대 손패 · 초록 = 빅 · 빨강 = 스몰</span><b>${countTxt(V.hand[V.duel], V.D).txt}</b></div>${miniHand(V.hand[V.duel], V.D, true)}`;
      h += `<div class="bs-sides"><button type="button" class="bs-sd B${S.side === "B" ? " on" : ""}" data-side="B">▲ 빅<small>상대 카드 &gt; ${V.D}</small></button><button type="button" class="bs-sd S${S.side === "S" ? " on" : ""}" data-side="S">▼ 스몰<small>상대 카드 &lt; ${V.D}</small></button></div>`;
      h += `<div class="bs-amt"><button type="button" data-amt="-1"${amt <= 1 ? " disabled" : ""} aria-label="칩 하나 덜">−</button><span class="n">${amt}<small>/ ${c}칩</small></span><button type="button" data-amt="+1"${amt >= c ? " disabled" : ""} aria-label="칩 하나 더">+</button>`
        + `<button type="button" data-amt="=1">1</button><button type="button" data-amt="=3"${c < 3 ? " disabled" : ""}>3</button><button type="button" data-amt="=${c}">전부</button></div>`;
      h += `<button type="button" class="bs-go" data-go="bet"${S.side ? "" : " disabled"}>${S.side ? `${SIDE[S.side]}에 ${amt}칩 걸기` : "빅 · 스몰을 골라요"}</button>`;
    } else if (me >= 0) {
      // 기다리는 동안: 두 손패 (상대 · 나)
      const oppH = V.hand[opp], myH = V.handOwn ? V.handOwn[me] : V.hand[me];
      h += `<div class="bs-lbl"><span>상대 손패</span><b>${bits(oppH).length}장</b></div>${miniHand(oppH, D, true)}`;
      h += `<div class="bs-lbl"><span>내 손패</span><b>${bits(myH).length}장</b></div>${miniHand(myH, D, true)}`;
      h += `<div class="bs-lbl"><span>남은 딜러 카드 — 나 몫 ${bits(V.dset[me]).join(" ") || "없음"}</span><span>상대 몫 ${bits(V.dset[opp]).join(" ") || "없음"}</span></div>`;
    } else {
      for (const s of [0, 1]) h += `<div class="bs-lbl"><span>${esc(nameOf(ctx, s))} 손패</span><b>${bits(V.hand[s]).length}장</b></div>${miniHand(V.hand[s], D, true)}`;
    }
    h += `</div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 1500)) return;   // 두 번 탭 막기 (온라인에서 거절돼도 잠깐 뒤 다시 누를 수 있게)
      const t = e.target.closest("[data-card],[data-side],[data-amt],[data-go]"); if (!t || t.disabled) return;
      if (t.dataset.card !== undefined) { const v = +t.dataset.card; S.card = S.card === v ? -1 : v; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.side) { S.side = t.dataset.side; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.amt) {
        const s = t.dataset.amt, c = V.chips[me];
        S.amt = s[0] === "=" ? +s.slice(1) : S.amt + (+s);
        S.amt = Math.max(1, Math.min(c, S.amt)); ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      if (t.dataset.go === "card" && S.card >= 0) { const v = S.card; S.card = -1; send({ t: "card", v }); return; }
      if (t.dataset.go === "bet" && S.side) send({ t: "bet", side: S.side, amt: S.amt });
    };
  }

  // ── 행동 글 ──
  const actText = a => !a ? "" : a.t === "card" ? `카드 ${a.v} 내기` : a.t === "bet" ? `${SIDE[a.side]}에 ${a.amt}칩` : "";

  // ── 선생님 ──
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me;
    // 👀 상대 흐름
    const mine = V.hist.filter(h => h.duel === opp), bets = V.hist.filter(h => h.duel === me);
    const p = [];
    const recent = V.hist.filter(h => h.r > 0).slice(-2).map(h => h.duel === opp ? `${h.r}R 상대 대결: 딜러 ${h.D}에 ${h.P} (${h.P > h.D ? "빅" : h.P < h.D ? "스몰" : "같음"})` : `${h.r}R 상대 베팅: ${SIDE[h.side]} ${h.amt}칩 (${h.b > 0 ? "맞음" : h.b < 0 ? "틀림" : "돌려받음"})`);
    p.push(recent.length ? recent.join(" · ") + "." : "아직 지난 라운드가 없어요.");
    if (mine.length >= 2) { const hi = mine.filter(h => h.P > h.D).length; p.push(`상대는 대결 ${mine.length}번 중 ${hi}번 딜러보다 큰 카드를 냈어요.`); }
    if (bets.length >= 2) { const avg = bets.reduce((s, h) => s + h.amt, 0) / bets.length; p.push(`상대 베팅은 평균 ${avg.toFixed(1)}칩.`); }
    if (!V.over && V.phase !== "show" && V.duel === opp) p.push(`지금 상대 손패: ${countTxt(V.hand[opp], V.D).txt} (딜러 ${V.D} 기준).`);
    // 📊 내 흐름
    const left = R - V.r + (V.phase === "show" || V.over ? 0 : 1);
    let myDuel = 0, myBet = 0;
    for (let r = R - left + 1; r <= R; r++) { if ((V.first + r - 1) % 2 === me) myDuel++; else myBet++; }
    // 이번 라운드 뒤 남은 대결 기대 칩: 이번에 대결하는 사람은 낼 카드(또는 숨긴 카드)를 고급 AI 균형으로 평균해 손패에서 뺌
    const ev = s => {
      const own = V.handOwn && s === me ? V.handOwn[s] : V.hand[s];
      if (V.over || V.phase === "show" || s !== V.duel || (s === me && V.phase === "bet")) return K.Vf(own, V.dset[s]);
      const E = K.equilibrium(V);
      return E.rows.reduce((t, P, i) => t + E.x[i] * K.Vf(V.hand[s] & ~(1 << P), V.dset[s]), 0);
    };
    const df = V.chips[me] - V.chips[opp];
    let m = `칩 나 ${V.chips[me]} · 상대 ${V.chips[opp]} (${df ? (df > 0 ? "+" : "−") + Math.abs(df) : "같음"}). 남은 라운드 ${left} (내 대결 ${myDuel} · 베팅 ${myBet}).`;
    if (!V.over) m += ` 이번 라운드 뒤 남은 대결(나 ${K.pop(V.dset[me])}번 · 상대 ${K.pop(V.dset[opp])}번)로 기대되는 칩, 베팅 빼고: 나 +${ev(me).toFixed(1)} · 상대 +${ev(opp).toFixed(1)}.`;
    m += " 0 은 늘 스몰 · 10 은 늘 빅이에요.";
    // 💡 추천 · 👉 뜻 (고급 AI 의 계산)
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (!V.needs.includes(me)) rec = V.phase === "show" ? "결과를 보는 중 — 다음 라운드를 준비해요." : "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else {
      const Rr = K.recommend(V, me);
      rec = `${actText(Rr.a)}.`;
      if (V.phase === "duel") {
        const c = countTxt(V.hand[me], V.D), mix = Rr.mix.map(([P, q]) => `${P} ${pct(q)}`).join(" · ");
        why = `상대가 보기엔 내 손패가 ${c.txt} — 늘 같은 식으로 내면 읽혀요. 고급 AI 계산은 ${mix} 로 섞어 내기 (그러면 빅일 확률 ${pct(Rr.pB)} · 스몰 ${pct(Rr.pS)}${Rr.pT > 0.01 ? ` · 같음 ${pct(Rr.pT)}` : ""})`;
        if (Rr.a.v > V.D) why += ` · ${eul(Rr.a.v)} 내면 대결 승 +${Rr.a.v - V.D}`;
        else if (Rr.a.v === V.D) why += ` · 같은 숫자는 대결도 베팅도 비겨요 (큰 카드를 아끼고 상대 베팅을 무르기)`;
        else why += ` · 이번엔 대결을 버리고 큰 카드를 아껴요`;
      } else {
        why = Rr.sure ? `상대 손패에 ${Rr.side === "B" ? `딜러 ${V.D}보다 작은` : `딜러 ${V.D}보다 큰`} 카드가 없어 틀릴 수 없어요 — 전부 걸어도 돼요`
          : `상대 손패 ${countTxt(V.hand[V.duel], V.D).txt}. 상대가 섞어 낸다고 보면 ${SIDE[Rr.side]} 맞을 확률 ${pct(Rr.pw)} · 틀릴 확률 ${pct(Rr.pl)}${Rr.pt > 0.01 ? ` · 돌려받음 ${pct(Rr.pt)}` : ""} → 칩은 ${AMTWHY[Rr.why] || AMTWHY.one} ${Rr.a.amt}개`;
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J || J.my === null || J.best === null) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const loss = Math.max(0, (J.best - J.my) * 100);
    const sev = loss >= 15 ? 90 : loss >= 8 ? 75 : loss >= 4 ? 60 : loss >= 2 ? 40 : loss > 0.7 ? 20 : 5;
    const r = [];
    if (Vb.phase === "duel") {
      const E = J.E, inMix = E.x[E.rows.indexOf(myA.v)] >= 0.05;
      if (!inMix) r.push(`고급 AI 는 이 장면에서 ${E.rows.filter((P, i) => E.x[i] >= 0.05).join(" · ")} 중에서 섞어 내요`);
      if (myA.v > Vb.D && bestA.v <= Vb.D) r.push("큰 카드를 지금 쓰면 남은 대결에서 받을 칩이 줄어요");
      if (myA.v < Vb.D && bestA.v > Vb.D) r.push(`${eul(bestA.v)} 내면 대결 승 +${bestA.v - Vb.D}`);
    } else {
      const B = K.betChoice(Vb);
      if (myA.side !== B.side) r.push(`상대 손패로 보면 ${SIDE[B.side]} 쪽이 더 잘 맞아요 (맞을 확률 ${pct(B.pw)} · 틀릴 ${pct(B.pl)})`);
      if (B.sure && myA.amt < Vb.chips[seat]) r.push("틀릴 수 없는 판이라 전부 걸 수 있었어요");
      if (!B.sure && myA.amt > bestA.amt + 2) r.push(`건 칩이 많아 틀리면 크게 잃어요`);
    }
    const why = loss <= 0.7 ? `고급 AI: ${best} — 이길 확률(어림)로 보면 내 수와 거의 같아요`
      : `고급 AI: ${best} — 이길 확률(어림) ${pct(J.best)} vs 내 수 ${pct(J.my)}${r.length ? " · " + r.join(" · ") : ""}`;
    return { sev, why, my, best };
  }

  function result(V, me) {
    const ctx = {}, line = endLine(V, me, ctx);
    const rows = V.hist.slice(-6).map(h => `${h.r}R · ${resLine(h, me, ctx)}`).join("<br>");
    return `${line}<br>${rows}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const table = (D, P, bet) => `<div class="bs-table"><div class="bs-slot"><span class="bs-card dl">${D}</span><i>딜러</i></div><div class="bs-slot"><span class="bs-card${P === "?" ? " back" : P > D ? " w" : ""}">${P}</span><i>대결 카드</i></div><div class="bs-slot"><span class="bs-bet${bet ? " " + bet[0] : ""}">${bet ? `${ARW[bet[0]]} ${SIDE[bet[0]]}<small>${bet[1]}칩</small>` : "베팅"}</span><i>베팅</i></div></div>`;
    const tb = x => `<div class="bs-tut">${x}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "18라운드 · 칩이 많으면 승", body: "두 사람 모두 <b>칩 10개</b>로 시작. 라운드마다 한 사람은 <b>🃏 대결</b>, 다른 사람은 <b>🪙 베팅</b> — 역할은 라운드마다 바뀌어요. <b>18라운드</b> 뒤 칩이 많은 사람이 이기고, 상대 칩을 <b>0개</b>로 만들면 바로 이겨요.",
        boardHtml: tb(table(3, "?", null)), ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "내 카드 0~10 · 딜러 1~9", body: "내 손패는 숫자 <b>0~10</b> 11장 (한 번 쓰면 버림). 딜러는 사람마다 <b>1~9</b> 카드 한 벌을 따로 가지고, 내가 대결할 때 내 몫에서 한 장을 공개해요.",
        boardHtml: tb(miniHand(0x7FF, 0, false)), ms: 5200 },
      { tag: "STEP 3 · 대결", title: "딜러보다 크면 차이만큼", body: "대결하는 사람은 공개된 딜러 카드를 보고 내 카드 한 장을 <b>뒷면</b>으로 내요. 딜러보다 <b>크면 차이만큼 칩</b>을 받아요 (7 vs 3 → +4). 작거나 같으면 칩 변화 없음.",
        boardHtml: tb(table(3, 7, null)), ms: 5600 },
      { tag: "STEP 4 · 베팅", title: "빅 · 스몰에 칩 걸기", body: "베팅하는 사람은 대결 카드가 딜러보다 <b>크면 빅 ▲</b>, <b>작으면 스몰 ▼</b> 에 칩을 걸어요. 맞으면 건 만큼 <b>더 받고</b>, 틀리면 건 칩을 <b>잃어요</b>. 같은 숫자면 돌려받아요.",
        boardHtml: tb(table(3, 7, ["S", 2])), ms: 5600 },
      { tag: "STEP 5 · 직접", title: "틀릴 수 없는 베팅", body: "딜러 <b>7</b>, 상대 손패는 <b>0 · 2 · 5</b> 뿐 — 무엇을 내도 7보다 작아요. <b>스몰</b>을 고르고 걸어 봐요!",
        interactive: { hint: "👆 스몰 → 걸기", doneText: "✅ 맞았어요! 상대 손패를 세면 확실한 베팅이 보여요" },
        render(stage, ctrl) {
          let side = "", done = false, msg = "상대 카드는 7보다 클까요, 작을까요?";
          const draw = () => {
            stage.innerHTML = `<div class="bs-tut">${table(7, done ? 5 : "?", done ? ["S", 3] : null)}${miniHand((1 << 0) | (1 << 2) | (1 << 5), 7, false)}`
              + `<div class="bs-sides" style="width:min(100%,300px)"><button type="button" class="bs-sd B${side === "B" ? " on" : ""}" data-side="B">▲ 빅<small>&gt; 7</small></button><button type="button" class="bs-sd S${side === "S" ? " on" : ""}" data-side="S"${side !== "S" ? ' data-tp="1"' : ""}>▼ 스몰<small>&lt; 7</small></button></div>`
              + `<button type="button" class="bs-go" style="width:min(100%,300px)" data-go="1"${side === "S" && !done ? ' data-tp="1"' : ""}${side ? "" : " disabled"}>${side ? `${SIDE[side]}에 3칩 걸기` : "빅 · 스몰을 골라요"}</button><div class="bs-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-side],[data-go]"); if (!t || t.disabled) return;
            if (t.dataset.side) { side = t.dataset.side; ctrl.sfx("tap"); msg = side === "B" ? "상대 손패에 7보다 큰 카드가 있나요? <b>0 · 2 · 5</b> 뿐이에요" : "좋아요 — 이제 <b>걸기</b>!"; draw(); return; }
            if (side !== "S") { ctrl.sfx("tap"); msg = "빅이면 틀려요 — 손패가 모두 7보다 작아요. <b>스몰</b>!"; draw(); return; }
            done = true; ctrl.sfx("win"); msg = "🏆 <b>스몰 맞음 +3칩!</b> 상대는 5를 냈어요"; draw(); ctrl.complete();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패", title: "카드는 아껴 쓰기", body: "각자 대결은 <b>9번</b>, 카드는 11장이라 <b>2장이 남아요</b>. 0 은 늘 스몰 · 10 은 늘 빅이라 상대가 읽기 쉬워요 — 섞어 내야 해요. 🧑‍🏫 선생님은 상대 손패를 세서 빅 · 스몰 확률과 걸 칩을 알려 줘요.",
        boardHtml: tb(table(5, 10, ["B", 4])), ms: 6400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.bigsmall = {
    name: "빅 스몰", emoji: "🎲", short: "딜러 카드보다 큰 카드로 대결 · 상대는 빅/스몰에 칩 베팅, 18라운드", min: 2, max: 2, defN: 2, board: false,
    opts: [], src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: <b>18라운드</b> 뒤 칩이 많은 사람 승 · 상대 칩을 <b>0개</b>로 만들면 바로 승",
      "준비물: 두 사람 모두 숫자 카드 <b>0~10</b> (11장) · <b>칩 10개</b>, 딜러는 사람마다 <b>1~9</b> 카드 한 벌",
      "진행: 라운드마다 한 사람은 <b>대결</b>, 다른 사람은 <b>베팅</b> (라운드마다 바뀜). 딜러가 대결하는 사람 몫에서 한 장 공개 → 대결하는 사람이 카드 한 장을 뒷면으로 냄 → 베팅하는 사람이 <b>빅</b>(더 큼) · <b>스몰</b>(더 작음)에 칩을 검",
      "승패: 대결 카드가 딜러보다 크면 <b>차이만큼 칩</b> · 베팅이 맞으면 건 만큼 더, 틀리면 건 칩을 잃음 · 같은 숫자면 대결은 그대로, 베팅은 돌려받음",
      "쓴 카드는 버림 — 각자 대결 9번, 카드 2장은 남음",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => V.over ? "끝" : `${V.r}/${R}라운드`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

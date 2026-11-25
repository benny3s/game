/* 베니 서바이벌 · 의심 베팅 — 화면 (선언 · 인정 · 의심 → 콜 · 레이즈 · 포기 → 카드 공개 · 슬롯 사기 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.doubtbet;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COL = ["빨강", "노랑", "초록", "파랑", "보라", "레인보우"], SHORT = ["빨", "노", "초", "파", "보", "🌈"];
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 6일차 메인 매치 (5명) · 규칙 확인: 나무위키 6일차 문서 (룰 · 라운드 진행표, 넷플릭스 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "3~6명 (빈 자리는 AI, 방송 5명) · 시작 피스는 모두 같게 (5개 · 8개 옵션, 방송은 그때까지 모은 피스) · 베팅은 피스부터 쓰고 모자라면 슬롯칩 (방송은 골라 냄) · 피스와 슬롯칩이 모두 없으면 탈락 · '인원 − 2명 (최소 2명)이 남을 때까지' (5명이면 방송처럼 3명) · 슬롯 사기는 라운드 시작 때만 · 40라운드 상한 (짧게 20 옵션) · 3분 시계 없음 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";

  const CSS = `
.db-top{display:flex;align-items:center;gap:8px;flex:none}
.db-rd{font:900 15px/1 var(--round);color:#fde68a;white-space:nowrap}.db-rd small{font:700 11px var(--round);color:var(--soft)}
.db-bid{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:4px 8px;border-radius:12px;background:rgba(0,0,0,.32);border:1.5px solid rgba(255,255,255,.18);font:800 13px/1.25 var(--round);color:#fff;text-align:center}
.db-bid b{font-size:16px}.db-bid small{font:700 11px var(--round);color:var(--soft)}
.db-tot{font:800 12px/1.2 var(--round);color:var(--soft);white-space:nowrap;text-align:right}.db-tot b{color:#fff;font-size:15px}
.db-dot{display:inline-block;width:14px;height:14px;border-radius:50%;border:1.5px solid rgba(255,255,255,.8);flex:none}
.db-seats{display:grid;gap:4px;flex:none;padding-top:9px}
.db-st{min-width:0;border-radius:10px;padding:3px 2px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.14);text-align:center;font:700 11px/1.3 var(--round);color:var(--soft);position:relative}
.db-st b{display:block;color:#fff;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-st.on{border-color:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,.35)}
.db-st.me b{color:#86efac}
.db-st.out{opacity:.38;text-decoration:line-through}
.db-st.bd{background:rgba(249,115,22,.18)}.db-st.dt{background:rgba(239,68,68,.2)}
.db-st em{position:absolute;right:1px;top:-11px;font:900 10px/16px var(--round);font-style:normal;padding:0 4px;border-radius:8px;background:#f97316;color:#111}
.db-hand{display:flex;align-items:center;justify-content:center;gap:5px;flex:none;min-height:50px}
.db-lb{font:800 11px/1.2 var(--round);color:var(--soft);writing-mode:horizontal-tb;margin-right:2px}
.db-cd{width:34px;height:46px;border-radius:7px;border:2px solid rgba(255,255,255,.75);display:grid;place-items:center;font:900 12px/1 var(--round);color:rgba(0,0,0,.6);flex:none;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.db-cd.c0{background:#ef4444}.db-cd.c1{background:#facc15}.db-cd.c2{background:#22c55e}.db-cd.c3{background:#3b82f6}.db-cd.c4{background:#a855f7}
.db-cd.c5{background:conic-gradient(#ef4444,#facc15,#22c55e,#3b82f6,#a855f7,#ef4444);color:#fff}
.db-cd.sm{width:24px;height:32px;border-radius:5px;font-size:10px;border-width:1.5px}
.db-cd.dim{opacity:.28}
.db-cd.hit{outline:2.5px solid #fff;outline-offset:1px}
.db-rev{display:grid;gap:3px;flex:none}
.db-rr{display:flex;align-items:center;gap:4px;min-height:34px}
.db-rr b{width:54px;flex:none;font:800 11.5px/1.2 var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-rr i{margin-left:auto;font:800 12px var(--round);font-style:normal;color:#fde68a}
.db-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.db-info b{color:#fde68a}.db-info .g{color:#86efac}.db-info .r{color:#fca5a5}
.db-info.end{font:800 13px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.db-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.db-act{display:grid;gap:6px;flex:none}
.db-cols{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
.db-col{min-height:46px;border-radius:12px;border:2px solid rgba(255,255,255,.2);color:#111;font:900 13px/1.1 var(--round);padding:2px;cursor:pointer;display:grid;place-items:center;-webkit-tap-highlight-color:transparent}
.db-col small{display:block;font:800 10px var(--round);opacity:.8}
.db-col.on{border:3px solid #fff;box-shadow:0 0 0 2px rgba(255,255,255,.35)}
.db-col:not(.on){filter:saturate(.75) brightness(.8)}
.db-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px}
.db-row.r3{grid-template-columns:minmax(0,1fr) minmax(0,1.7fr)}
.db-row.one{grid-template-columns:minmax(0,1fr)}
.db-stp{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;border-radius:12px;background:rgba(0,0,0,.3);border:1.5px solid rgba(255,255,255,.16)}
.db-stp b{text-align:center;font:900 16px/1 var(--round);color:#fff;white-space:nowrap}
.db-stp button{min-height:44px;border:0;background:transparent;color:#fff;font:900 20px/1 var(--round);cursor:pointer;-webkit-tap-highlight-color:transparent}
.db-stp button:disabled{opacity:.25;cursor:default}
.db-b{min-height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:900 14px/1.15 var(--round);padding:2px 6px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.db-b:disabled{opacity:.35;cursor:default}
.db-b.go{border:0;background:linear-gradient(#f97316,#c2410c)}
.db-b.bad{border-color:rgba(248,113,113,.7);background:rgba(127,29,29,.55)}
.db-b small{display:block;font:700 10.5px var(--round);opacity:.85}
.db-buy{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.db-buy .db-b{min-width:88px}
.db-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.db-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.db-tmsg b{color:#fde68a}
.db-res{display:grid;gap:3px;font-size:12.5px;line-height:1.4}
@media (max-height:700px){.db-cd{width:30px;height:40px}.db-hand{min-height:44px}.db-col{min-height:44px}.db-b{min-height:44px}.db-info{min-height:2.4em;font-size:12px}.db-rr{min-height:30px}.db-cd.sm{width:22px;height:29px}.db-act{gap:5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const nmOf = (names, s, me) => (s === me ? "나" : (names && names[s]) || `${s + 1}번`);
  const seatNames = ctx => (ctx.seats || []).map((x, i) => (x && x.name) || `${i + 1}번`);
  const dot = c => `<span class="db-dot" style="background:${["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#a855f7"][c]}"></span>`;
  const card = (x, cls) => `<span class="db-cd c${x}${cls ? " " + cls : ""}" title="${COL[x]}">${SHORT[x]}</span>`;
  const bidTxt = b => `${COL[b.c]} ${b.cnt}장`;
  const pct = p => `${Math.floor(p * 100 + 1e-9)}%`;   // 버림 (85% 문턱 글과 맞게)
  const purse = (V, s) => V.pc[s] + V.chips[s];

  // 고르는 중인 선언 · 레이즈 (상태가 바뀌면 새로)
  let SEL = { key: "" };
  function selFor(V, ctx) {
    const D = V.duel, me = ctx.me;
    const key = `${ctx.g}|${V.round}|${V.phase}|${V.bid ? V.bid.s + ":" + V.bid.cnt : ""}|${D ? D.put[D.b] + ":" + D.put[D.d] + ":" + D.turn : ""}|${me}|${me >= 0 ? V.buy[me] : ""}`;
    if (SEL.key !== key) {
      let c = 0, best = -1;
      for (let i = 0; i < 5; i++) { const k = V.hand.filter(x => x === i).length; if (k > best) { best = k; c = i; } }
      SEL = { key, c, cnt: V.bid ? V.bid.cnt + 1 : 1, amt: 1, to: D && me >= 0 ? D.put[me === D.b ? D.d : D.b] + 1 : 1, sent: 0 };
    }
    return SEL;
  }

  function seatsHtml(V, me, names, show) {
    const B = show && V.last ? V.last : null;
    let h = `<div class="db-seats" style="grid-template-columns:repeat(${V.order.length},minmax(0,1fr))">`;
    for (const s of V.order) {
      const D = V.duel;
      let cls = "";
      if (V.needs.includes(s) && !V.over) cls += " on";
      if (s === me) cls += " me";
      if (V.out[s]) cls += " out";
      if ((D && s === D.b) || (B && s === B.b) || (!D && !B && V.bid && V.bid.s === s)) cls += " bd";
      if ((D && s === D.d) || (B && s === B.d)) cls += " dt";
      const em = D && (s === D.b || s === D.d) ? `<em>💎${D.put[s]}</em>` : s === V.starter && !V.out[s] && !show && !V.over ? `<em>선</em>` : "";
      h += `<div class="db-st${cls}" data-s="${s}"><b>${esc(nmOf(names, s, me))}</b><span>${V.out[s] ? "탈락" : `💎${V.pc[s]} ▣${V.slots[s]}`}</span>${em}</div>`;
    }
    return h + `</div>`;
  }
  function revealHtml(L, me, names) {
    let h = `<div class="db-rev">`;
    L.cards.forEach((hd, s) => {
      if (!hd.length) return;
      const hit = hd.filter(x => x === L.bid.c || x === 5).length;
      h += `<div class="db-rr" data-s="${s}"><b>${esc(nmOf(names, s, me))}</b>${hd.map(x => card(x, "sm" + (x === L.bid.c || x === 5 ? " hit" : " dim"))).join("")}<i>${hit}</i></div>`;
    });
    return h + `</div>`;
  }
  function settleTxt(L, me, names) {
    const nm = s => esc(nmOf(names, s, me));
    if (L.fold) return `${nm(L.lose)} 포기 → <b>${nm(L.win)}</b> 판돈 💎${L.m} (카드 안 깜)`;
    const ok = L.have >= L.bid.cnt;
    return `${COL[L.bid.c]} + 🌈 = <b>${L.have}장</b> ${ok ? "≥" : "<"} 선언 ${L.bid.cnt}장 → <b>${nm(L.win)}</b> ${ok ? "(선언)" : "(의심)"} 승 · 💎${L.m}`;
  }
  function logTxt(e, me, names) {
    const nm = s => esc(nmOf(names, s, me));
    if (!e) return "";
    if (e.k === "bid") return `${nm(e.s)}: ${e.acc ? "인정 → " : ""}<b>${COL[e.c]} ${e.cnt}장</b> 선언 · 💎${e.amt}`;
    if (e.k === "doubt") return `${nm(e.s)}: <span class="r">의심!</span> (${nm(e.on)} 선언)`;
    if (e.k === "raise") return `${nm(e.s)}: 레이즈 → 💎${e.to}`;
    if (e.k === "call") return `${nm(e.s)}: 콜${e.amt ? ` +${e.amt}` : ""}`;
    if (e.k === "allin") return `${nm(e.s)}: 올인 +${e.amt}`;
    if (e.k === "fold") return `${nm(e.s)}: 포기`;
    if (e.k === "buy") return `${nm(e.s)}: 슬롯 ${e.n}개 삼`;
    if (e.k === "deal") return `라운드 ${e.r} — 카드를 나눴어요`;
    return "";
  }
  const lastLog = V => { for (let i = V.log.length - 1; i >= 0; i--) { const e = V.log[i]; if (["bid", "doubt", "raise", "call", "allin", "fold", "buy", "deal"].includes(e.k)) return e; } return null; };

  function actHtml(V, me, S, names) {
    if (V.phase === "buy") {
      const max = Math.min(V.pc[me], 5 - V.slots[me]);
      let h = `<div class="db-buy">`;
      for (let k = 0; k <= max; k++) h += `<button type="button" class="db-b${k ? " go" : ""}" data-x="buy" data-k="${k}">${k ? `슬롯 ${k}개 사기<small>피스 −${k}</small>` : "안 삼"}</button>`;
      return h + `</div>`;
    }
    if (V.phase === "bid" || V.phase === "resp") {
      const lo = V.bid ? V.bid.cnt + 1 : 1, P = purse(V, me);
      S.cnt = Math.min(20, Math.max(lo, S.cnt)); S.amt = Math.max(1, Math.min(P, S.amt));
      let h = `<div class="db-cols">`;
      for (let c = 0; c < 5; c++) h += `<button type="button" class="db-col${S.c === c ? " on" : ""}" data-col="${c}" style="background:${["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#a855f7"][c]}">${COL[c]}<small>내 ${V.hand.filter(x => x === c).length}</small></button>`;
      h += `</div><div class="db-row"><div class="db-stp"><button type="button" data-st="cnt-"${S.cnt <= lo ? " disabled" : ""} aria-label="장수 줄이기">−</button><b>${S.cnt}장</b><button type="button" data-st="cnt+"${S.cnt >= 20 ? " disabled" : ""} aria-label="장수 늘리기">+</button></div>`;
      h += `<div class="db-stp"><button type="button" data-st="amt-"${S.amt <= 1 ? " disabled" : ""} aria-label="베팅 줄이기">−</button><b>💎${S.amt}</b><button type="button" data-st="amt+"${S.amt >= P ? " disabled" : ""} aria-label="베팅 늘리기">+</button></div></div>`;
      const chipWarn = S.amt > V.pc[me] ? `<small>슬롯칩 ${S.amt - V.pc[me]}개 포함</small>` : `<small>${V.bid ? "앞사람 베팅은 돌려줌" : "선 선언"}</small>`;
      h += `<div class="db-row${V.phase === "resp" ? " r3" : " one"}">${V.phase === "resp" ? `<button type="button" class="db-b bad" data-x="doubt">의심<small>${esc(nmOf(names, V.bid.s, me))} 선언</small></button>` : ""}<button type="button" class="db-b go" data-x="bid"${lo > 20 ? " disabled" : ""}>${V.phase === "resp" ? "인정 · " : ""}${COL[S.c]} ${S.cnt}장 선언${chipWarn}</button></div>`;
      return `<div class="db-act">${h}</div>`;
    }
    if (V.phase === "duel") {
      const D = V.duel, op = me === D.b ? D.d : D.b, need = D.put[op] - D.put[me], P = purse(V, me);
      const lo = D.put[op] + 1, hi = D.put[me] + P;
      S.to = Math.max(lo, Math.min(hi, S.to));
      const canFold = !(D.first && me === D.d), canRaise = hi >= lo;
      let h = `<div class="db-row"><div class="db-stp"><button type="button" data-st="to-"${S.to <= lo ? " disabled" : ""} aria-label="레이즈 줄이기">−</button><b>💎${canRaise ? S.to : "-"}</b><button type="button" data-st="to+"${S.to >= hi ? " disabled" : ""} aria-label="레이즈 늘리기">+</button></div>`;
      h += `<button type="button" class="db-b" data-x="raise"${canRaise ? "" : " disabled"}>레이즈<small>${canRaise ? `내 몫 💎${S.to}까지` : "더 낼 것이 없음"}</small></button></div>`;
      h += `<div class="db-row"><button type="button" class="db-b bad" data-x="fold"${canFold ? "" : " disabled"}>포기<small>${canFold ? `−💎${D.put[me]}` : "의심한 사람은 먼저 콜 · 레이즈"}</small></button>`;
      h += need > P ? `<button type="button" class="db-b go" data-x="allin">올인<small>+💎${P} 넣고 공개</small></button>` : `<button type="button" class="db-b go" data-x="call">콜<small>${need ? `+💎${need} → ` : ""}공개</small></button>`;
      h += `</div>`;
      return `<div class="db-act">${h}</div>`;
    }
    return "";
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, names = seatNames(ctx), S = selFor(V, ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me) && !V.out[me];
    const show = V.phase === "show" || (over && V.last && V.last.round === V.round);
    const L = show ? V.last : null;
    const bid = L ? L.bid : V.bid;
    let h = `<div class="db-top"><div class="db-rd">R${V.round}<small>/${V.opt.rounds}</small></div><div class="db-bid">${bid ? `${dot(bid.c)}<span><b>${COL[bid.c]} ${bid.cnt}장</b> 이상 <small>${esc(nmOf(names, bid.s, me))}${!L && V.bid ? ` · 💎${V.bid.amt}` : ""}</small></span>` : `<small>${V.phase === "buy" ? "슬롯 사기" : "아직 선언 없음"}</small>`}</div><div class="db-tot">테이블<br>${V.total ? `<b>${V.total}</b>장` : "<b>—</b>"}</div></div>`;
    h += seatsHtml(V, me, names, show);
    if (L && L.cards) h += revealHtml(L, me, names);
    else if (me >= 0 && !V.out[me]) h += `<div class="db-hand"><span class="db-lb">내 카드</span>${V.hand.length ? V.hand.map(x => card(x)).join("") : `<small>${V.phase === "buy" ? "슬롯을 정하면 카드를 받아요" : "—"}</small>`}</div>`;
    else h += `<div class="db-hand"><small>${me >= 0 ? "탈락 — 구경 중" : "구경 중"}</small></div>`;
    let info = "", ic = "";
    if (over) {
      const r = me >= 0 ? V.ranks[me] : -1, top = V.ranks.map((x, s) => s).filter(s => V.ranks[s] === 0);
      const sc = s => (V.out[s] ? "탈락" : `💎${V.final[s]}`);
      info = me >= 0 ? (r === 0 ? (top.length > 1 ? `🏆 공동 1위 (${sc(me)})` : `🏆 1위! 최종 ${sc(me)}`) : `${r + 1}위 (${sc(me)}) — 1위 ${esc(top.map(s => nmOf(names, s, me)).join(" · "))} ${sc(top[0])}`) : `🏆 ${esc(top.map(s => nmOf(names, s, me)).join(" · "))} 1위 (${sc(top[0])})`;
      ic = me >= 0 && r > 0 ? " end bad" : " end";
    } else if (L) {
      info = settleTxt(L, me, names);
      ic = me >= 0 && (L.win === me || L.lose === me) ? (L.win === me ? " end" : " end bad") : "";
    } else if (can) {
      if (V.phase === "buy") info = `🎯 슬롯 사기 — 피스 1개 = 슬롯 1개 (지금 ▣${V.slots[me]} · 💎${V.pc[me]}, 최대 5)`;
      else if (V.phase === "bid") info = `🎯 내가 선 — 색 · 장수 · 베팅을 골라 선언해요 (테이블 ${V.total}장)`;
      else if (V.phase === "resp") info = `🎯 ${esc(nmOf(names, V.bid.s, me))}: <b>${bidTxt(V.bid)}</b> 이상 — 인정(더 높게 선언) 또는 의심`;
      else { const D = V.duel, op = me === D.b ? D.d : D.b; info = D.first && me === D.d ? `🎯 의심했어요 — 콜(💎${D.put[op]} 맞추기) 또는 레이즈` : `🎯 ${esc(nmOf(names, op, me))} 💎${D.put[op]} vs 나 💎${D.put[me]} — 콜 · 레이즈 · 포기`; }
    } else {
      const e = lastLog(V);
      info = e ? logTxt(e, me, names) : "";
      if (V.needs.length && !V.over) info += `${info ? " · " : ""}${V.phase === "buy" ? "슬롯 정하는 중…" : `${esc(nmOf(names, V.needs[0], me))} 차례…`}`;
    }
    h += `<div class="db-info${ic}"><span>${info}</span></div>`;
    if (can) h += actHtml(V, me, S, names);
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 10000)) return;   // 보낸 수가 반영되면 SEL 이 새로 생김
      const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
      const d = t.dataset;
      if (d.col) { S.c = +d.col; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.st) {
        const f = d.st.slice(0, -1), dir = d.st.endsWith("+") ? 1 : -1;
        S[f] += dir; ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      if (d.x === "buy") send({ t: "buy", k: +d.k });
      else if (d.x === "bid") send({ t: "bid", c: S.c, cnt: S.cnt, amt: S.amt });
      else if (d.x === "doubt") send({ t: "doubt" });
      else if (d.x === "call") send({ t: "call" });
      else if (d.x === "allin") send({ t: "allin" });
      else if (d.x === "fold") send({ t: "fold" });
      else if (d.x === "raise") send({ t: "raise", to: S.to });
    };
  }

  function actText(a) {
    if (!a) return "";
    if (a.t === "buy") return a.k ? `슬롯 ${a.k}개 사기` : "슬롯 안 삼";
    if (a.t === "bid" && COL[a.c]) return `${COL[a.c]} ${a.cnt}장 선언 · 💎${a.amt}`;
    if (a.t === "doubt") return "의심";
    if (a.t === "call") return "콜";
    if (a.t === "allin") return "올인";
    if (a.t === "fold") return "포기";
    if (a.t === "raise") return `레이즈 → 💎${a.to}`;
    return "";
  }

  // ── 선생님 ──
  let CC = { key: "", r: null };
  function recOf(V, me) { const key = `${V.pub}|${V.round}|${V.log.length ? V.log[V.log.length - 1].i : 0}|${me}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me) }; return CC.r; }
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  function coach(V, me, since, names) {
    const watch = !(me >= 0 && me < V.n) || V.out[me];
    const nm = s => esc(nmOf(names, s, watch ? -1 : me));
    const p = [];
    const calls = V.prev.concat(V.bid ? [V.bid] : []);
    if (calls.length) p.push(`이번 라운드: ${calls.map(b => `${nm(b.s)} ${bidTxt(b)}`).join(" → ")}.`);
    else p.push(`라운드 ${V.round} — 테이블 카드 ${V.total || "?"}장 (사람마다 슬롯 수만큼).`);
    if (V.duel) p.push(`의심: ${nm(V.duel.d)} — 판돈 선언 💎${V.duel.put[V.duel.b]} · 의심 💎${V.duel.put[V.duel.d]}.`);
    if (V.bid && !watch) { const k = K.readOf(V, me, V.bid.c); if (k >= 2) p.push(`${k}명이 ${COL[V.bid.c]} 선언 — 손에 있을 수도, 허세일 수도 (추천 계산에는 안 넣어요).`); }
    if (V.hist.length) { const h = V.hist[V.hist.length - 1]; p.push(`지난 라운드: ${COL[h.c]} ${h.cnt}장 ${h.fold ? "→ 포기" : `→ 실제 ${h.have}장`} → ${nm(h.win)} 승 💎${h.m}.`); }
    p.push(`피스: ${V.order.filter(s => !V.out[s]).map(s => `${nm(s)} ${V.pc[s]}`).join(" · ")}.`);
    if (watch) return { opp: p.join(" "), mine: `테이블 카드 ${V.total}장 · 남은 사람 ${V.out.filter(x => !x).length}명.`, rec: "구경 중이에요.", why: "" };
    const cnt = [0, 1, 2, 3, 4, 5].map(c => V.hand.filter(x => x === c).length);
    let m = V.hand.length ? `내 카드 ${V.hand.length}장: ${[0, 1, 2, 3, 4].filter(c => cnt[c]).map(c => `${COL[c]} ${cnt[c]}`).join(" · ") || "색 없음"}${cnt[5] ? ` · 🌈 ${cnt[5]}` : ""}.` : `카드를 아직 안 받았어요.`;
    if (V.bid && V.hand.length) { const I = K.infoOf(V, V.bid.c); m += ` ${COL[V.bid.c]}(+🌈) 내 손 ${I.mine}장 + 모르는 ${I.U}장에서 기대 ${f1(I.exp - I.mine)}장 = 모두 약 ${f1(I.exp)}장.`; }
    else if (V.hand.length) m += ` 한 색(+🌈)은 테이블의 약 1/3 — ${V.total}장이면 ${f1(V.total / 3)}장쯤.`;
    m += ` 나 💎${V.pc[me]} · ▣${V.slots[me]} (${V.ranks[me] + 1}위).`;
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (V.phase === "show") rec = "결과를 보고 다음 라운드를 기다려요.";
    else if (!V.needs.includes(me)) rec = "내 차례가 되면 추천해 드려요.";
    else {
      const R = recOf(V, me), a = R.a;
      rec = `${actText(a)}.`;
      if (V.phase === "buy") why = a.k ? `피스 ${V.pc[me]}개 — 넉넉하면(4개 이상) 슬롯을 사요: 카드를 1장 더 받아 읽기가 정확해지고, 끝나면 슬롯도 1점이라 점수 손해가 없어요.` : `피스 ${V.pc[me]}개 — 적을 땐 베팅용 피스로 남겨요 (슬롯칩을 걸면 지는 순간 슬롯이 줄어요). 슬롯 ▣${V.slots[me]}.`;
      else if (V.phase === "bid" || V.phase === "resp") {
        const head = V.bid ? `'${bidTxt(V.bid)} 이상'이 맞을 확률 ${pct(R.pBid)} → 의심하면 이길 확률 ${pct(1 - R.pBid)}. ` : "";
        if (a.t === "doubt") why = head + (R.pick ? `더 부르면 가장 나은 '${bidTxt(R.pick)}'도 맞을 확률 ${pct(R.pick.p)}라 의심이 나아요 (의심은 앞사람 베팅 💎${V.bid.amt}만큼 걸림).` : `더 부를 장수가 없어요.`);
        else why = head + `'${COL[a.c]} ${a.cnt}장'이 맞을 확률 ${pct(R.pMine)} (내 손 ${R.infoMine.mine}장 + 남의 카드에서 기대 ${f1(R.infoMine.exp - R.infoMine.mine)}장) ${R.pMine >= 0.72 ? " — 72% 이상인 선언 중 가장 높은 장수라 다음 사람이 더 어려워져요" : " — 72% 넘는 선언이 없어 가장 안전한 것"}. 베팅 💎${a.amt}: 확실할수록 크게 (85% 넘으면 3 · 72% 넘으면 2 · 아니면 1, 가진 피스 안에서).`;
      } else {
        const D = V.duel, op = me === D.b ? D.d : D.b, pw = me === D.b ? R.pBid : 1 - R.pBid, need = D.put[op] - D.put[me];
        const P = purse(V, me), mine = D.put[me] + Math.min(Math.max(0, need), P);
        why = `내가 이길 확률 ${pct(pw)} ('${bidTxt(V.bid)} 이상'이 맞을 확률 ${pct(R.pBid)}). ${need > P ? `올인하면 (가진 💎${P}) 이길 때 +💎${Math.min(D.put[op], mine)}` : `콜하면 이길 때 +💎${D.put[op]}`} · 질 때 −💎${mine}${!(D.first && me === D.d) ? `, 포기하면 −💎${D.put[me]}` : ""}. ${a.t === "raise" ? "80% 넘게 유리하면 판돈을 키워요." : a.t === "fold" ? "콜의 기대값이 포기보다 나빠요." : ""}`;
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J || J.kind === "buy") return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    if (J.kind === "bid") {
      const loss = J.best - J.my;
      const sev = loss >= 0.3 ? 70 : loss >= 0.15 ? 45 : 5;
      let why;
      if (sev <= 5) why = "좋은 수예요";
      else if (myA.t === "doubt") why = `의심이 이길 확률 ${pct(J.my)} — 추천 선언 ${best}의 맞을 확률은 ${pct(J.best)}`;
      else if (bestA.t === "doubt") why = `내 선언이 맞을 확률 ${pct(J.my)} — 앞 선언이 틀릴 확률 ${pct(J.best)}라 의심이 나았어요`;
      else why = `내 선언이 맞을 확률 ${pct(J.my)} · 추천 ${best} ${pct(J.best)}`;
      return { sev, why, my, best };
    }
    const pw = J.pw;
    if (myA.t === "fold" && pw >= 0.5) return { sev: 70, why: `이길 확률 ${pct(pw)}인데 포기 — 콜이 나았어요`, my, best };
    if ((myA.t === "call" || myA.t === "allin") && pw < 0.3 && bestA.t === "fold") return { sev: 45, why: `이길 확률 ${pct(pw)} — 포기하면 💎${J.mine}만 잃어요`, my, best };
    if (myA.t === "raise" && pw < 0.5) return { sev: 45, why: `이길 확률 ${pct(pw)}에서 레이즈 — 판돈만 커져요`, my, best };
    return { sev: 5, why: "좋은 수예요", my, best };
  }

  function result(V, me, names) {
    const who = s => (s === me ? " 나" : names && names[s] ? ` ${esc(names[s])}` : ` ${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const head = `${V.round}라운드 · ${V.end === "left" ? `${V.out.filter(x => !x).length}명이 남아 끝` : "라운드 상한으로 끝"} · 의심 ${V.hist.length}번 (공개 ${V.hist.filter(h => !h.fold).length})`;
    return `<div class="db-res"><div>${head}</div>${order.map(s => `<div>${V.ranks[s] + 1}위${who(s)} ${V.out[s] ? `탈락 (${V.outAt[s]}라운드)` : `<b>💎${V.final[s]}</b> = 피스 ${V.pc[s]} + 슬롯 ${V.slots[s]}`}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const tb = x => `<div class="db-tut">${x}</div>`;
    const NM = ["나", "AI1", "AI2"];
    const seatsDemo = (put, on) => `<div class="db-seats" style="grid-template-columns:repeat(3,minmax(0,1fr));width:100%">${[0, 1, 2].map(s => `<div class="db-st${on === s ? " on" : ""}${s === 0 ? " me" : ""}${put && s === 1 ? " bd" : ""}${put && s === 0 ? " dt" : ""}"><b>${NM[s]}</b><span>💎5 ▣5</span>${put && put[s] != null ? `<em>💎${put[s]}</em>` : ""}</div>`).join("")}</div>`;
    const HAND = [0, 2, 2, 3, 4], ALL = [HAND, [0, 1, 1, 3, 5], [1, 2, 3, 4, 5]];   // 초록+🌈 = 5 · 노랑+🌈 = 5
    return [
      { tag: "STEP 1 · 목표", title: "피스를 가장 많이", body: "남의 카드까지 합쳐 <b>어떤 색이 몇 장</b> 있는지 맞히거나, 남의 말을 <b>의심</b>해 피스를 따요. 끝날 때 <b>피스</b>(+ 남은 슬롯 1개당 1)가 가장 많은 사람이 1위.",
        boardHtml: tb(seatsDemo(null, 0)), ms: 6400 },
      { tag: "STEP 2 · 준비물", title: "카드 60장 · 슬롯 5개", body: "빨강 · 노랑 · 초록 · 파랑 · 보라 · <b>레인보우</b> 각 10장. 각자 <b>슬롯 5개 · 슬롯칩 4개</b> — 라운드마다 슬롯 하나에 카드 1장. <b>내 카드만</b> 봐요. 레인보우는 선언한 색으로 쳐요.",
        boardHtml: tb(`<div class="db-hand">${[0, 1, 2, 3, 4, 5].map(x => card(x)).join("")}</div>`), ms: 7000 },
      { tag: "STEP 3 · 선언", title: "인정하거나 의심하거나", body: "선부터 '<b>빨강 5장 이상</b>'처럼 색 · 장수를 말하고 피스를 1개 이상 걸어요. 다음 사람은 <b>인정</b>(앞사람 베팅을 돌려주고 <b>더 많은 장수</b>로 새로 선언, 색은 자유) 또는 <b>의심</b>.",
        boardHtml: tb(`<div class="db-bid" style="width:100%">${dot(0)}<span><b>빨강 5장</b> 이상 <small>AI1 · 💎1</small></span></div><div class="db-info"><span>AI2: 인정 → <b>초록 6장</b> 선언 · 💎1</span></div>`), ms: 7200 },
      { tag: "STEP 4 · 의심 · 공개", title: "콜 · 레이즈 · 포기", body: "의심한 사람부터 <b>콜</b>(같은 만큼) 또는 <b>레이즈</b>. 레이즈를 받으면 콜 · 레이즈 · <b>포기</b>(카드 안 까고 상대가 판돈). 모두 콜하면 공개 — 그 색 + 🌈 가 <b>선언보다 적으면 의심한 사람</b>, 같거나 많으면 선언한 사람이 판돈을 다 가져요.",
        boardHtml: tb(revealHtml({ cards: ALL, bid: { c: 2, cnt: 6 } }, 0, NM) + `<div class="db-info"><span>초록 + 🌈 = <b>5장</b> &lt; 선언 6장 → 의심한 사람 승</span></div>`), ms: 7800 },
      { tag: "STEP 5 · 직접", title: "노랑 9장? 의심!", body: "3명 · 테이블 15장. AI1이 <b>노랑 9장 이상</b>을 걸었어요. 내 손에 노랑 · 🌈는 0장 — 모르는 10장에서 노랑+🌈는 평균 약 3.6장. <b>의심 → 콜</b>로 확인해요.",
        interactive: { hint: "👆 의심 → 콜", doneText: "✅ 노랑 + 🌈 = 5장 < 9장 → 의심 승, 💎1 얻음" },
        render(stage, ctrl) {
          let step = 0, msg = "앞사람 선언이 맞을 확률이 아주 낮아요 — <b>의심</b>을 눌러요";
          const BID = { s: 1, c: 1, cnt: 9 };
          const draw = () => {
            let h = `<div class="db-bid" style="width:100%">${dot(1)}<span><b>노랑 9장</b> 이상 <small>AI1 · 💎1</small></span></div>`;
            h += seatsDemo(step >= 1 ? { 0: step >= 2 ? 1 : 0, 1: 1 } : null, step === 0 ? 0 : step === 1 ? 0 : -1);
            if (step < 2) {
              h += `<div class="db-hand"><span class="db-lb">내 카드</span>${HAND.map(x => card(x)).join("")}</div>`;
              h += step === 0 ? `<div class="db-row r3" style="width:100%"><button type="button" class="db-b bad" data-x="doubt" data-tp="1">의심<small>AI1 선언</small></button><button type="button" class="db-b go" data-x="bid">인정 · 노랑 10장 선언<small>앞사람 베팅은 돌려줌</small></button></div>`
                : `<div class="db-row" style="width:100%"><button type="button" class="db-b bad" data-x="fold" disabled>포기<small>의심한 사람은 먼저 콜 · 레이즈</small></button><button type="button" class="db-b go" data-x="call" data-tp="1">콜<small>+💎1 → 공개</small></button></div>`;
            } else h += revealHtml({ cards: ALL, bid: BID }, 0, NM);
            stage.innerHTML = `<div class="db-tut">${h}<div class="db-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
            const x = t.dataset.x;
            if (step === 0 && x === "bid") { ctrl.sfx("tap"); msg = "노랑 10장은 더 어려워요 (모두 약 3.6장) — 다음 사람이 의심하면 져요. <b>의심</b>이 나아요!"; draw(); return; }
            if (step === 0 && x === "doubt") { step = 1; ctrl.sfx("tap"); msg = "의심한 사람은 먼저 <b>콜</b>(💎1 맞추기) 또는 레이즈 — 콜을 눌러요"; draw(); return; }
            if (step === 1 && x === "call") { step = 2; ctrl.sfx("win"); msg = "🏆 공개! 노랑 + 🌈 = <b>5장</b> &lt; 9장 → 의심한 내가 이겨 판돈 💎1을 가져와요"; draw(); ctrl.complete(); }
          };
          draw();
        } },
      { tag: "STEP 6 · 특수", title: "슬롯 · 피스 · 끝", body: "<b>슬롯칩을 잃으면 슬롯이 줄어</b> 카드도 덜 받아요 (얻은 슬롯칩은 피스로). 피스 1개로 슬롯 1개를 살 수 있어요 (최대 5). 다음 라운드 선은 의심에서 진 사람, <b>15라운드부터 5라운드마다 피스 1개</b>, 10라운드마다 자리 추첨. 인원 − 2명(최소 2명, 5명이면 3명)이 남으면 끝.",
        boardHtml: tb(`<div class="db-hand">${card(3)}${card(0)}${card(5)}${card(1)}<span class="db-cd" style="background:rgba(255,255,255,.08);border-style:dashed">−</span></div><div class="db-info"><span>슬롯칩 1개를 잃음 → ▣4</span></div>`), ms: 7600 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.doubtbet = {
    name: "의심 베팅", emoji: "🎲", short: "모두의 카드 중 어떤 색이 몇 장? 더 높게 선언하거나 의심하기 — 레인보우는 아무 색, 피스를 걸고 콜 · 레이즈 · 포기", min: 3, max: 6, defN: 5, board: false,
    opts: [
      { k: "pieces", label: "시작 피스", items: [[5, "5개"], [8, "8개"]], def: 5 },
      { k: "rounds", label: "라운드 상한", items: [[40, "40라운드"], [20, "20라운드 (짧게)"]], def: 40 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 끝날 때 <b>피스</b>가 가장 많은 사람이 1위 — 남은 슬롯 1개당 피스 1개를 더해요",
      "준비물: 카드 60장 (빨강 · 노랑 · 초록 · 파랑 · 보라 · <b>레인보우</b> 각 10장), 각자 <b>슬롯 5개 · 슬롯칩 4개</b>와 피스",
      "라운드마다 섞어서 슬롯마다 카드 1장 — <b>내 카드만</b> 봐요",
      "선언: 선부터 '<b>어떤 색이 모두 몇 장 이상</b>' (1~20장, 레인보우로는 선언 못 함) + 피스나 슬롯칩 <b>1개 이상</b> 베팅",
      "다음 사람은 <b>인정</b> (앞사람 베팅을 돌려주고 <b>더 많은 장수</b>로 새로 선언, 색은 자유) 또는 <b>의심</b>",
      "의심: 의심한 사람부터 <b>콜 · 레이즈</b> → 레이즈를 받으면 콜 · 레이즈 · <b>포기</b> (포기하면 카드를 안 까고 상대가 판돈을 다 가짐)",
      "모두 콜하면 공개: 그 색 + <b>레인보우</b>가 선언보다 <b>적으면 의심한 사람</b>, 같거나 많으면 선언한 사람이 판돈을 다 가짐",
      "슬롯칩을 잃으면 슬롯이 줄어 카드도 덜 받음 · 얻은 슬롯칩은 피스로 · 피스 1개로 슬롯 1개 (최대 5) · 마지막 슬롯은 못 걸음",
      "다음 라운드 선 = 의심에서 진 사람 · <b>15라운드부터 5라운드마다 피스 1개</b> · 10라운드마다 자리 추첨 · <b>인원 − 2명</b>(최소 2명, 5명이면 3명)이 남으면 끝",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : V.phase === "show" ? `라운드 ${V.round} 결과` : V.phase === "buy" ? `라운드 ${V.round} · 슬롯 사기` : `라운드 ${V.round} · 테이블 ${V.total}장`),
    chip: (V, i) => ({ t: V.out[i] ? "탈락" : `💎${V.pc[i]} ▣${V.slots[i]}`, on: V.needs.includes(i) && !V.over, out: !!V.out[i] }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

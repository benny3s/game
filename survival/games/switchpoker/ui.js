/* 베니 서바이벌 · 스위치 포커 — 화면 (2:2 · 오픈 카드 · 교환 · 버리기 · 베팅 · 결과 · 1분 규칙 · AI 선생님) */
(() => {
  "use strict";
  const K = window.SVCores.switchpoker;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 1 · 7 · 8 은 ㄹ 받침) · t = 이 · 은 · 을 · 와 · 로
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const jw = (w, t) => `${w}${ja(w, t)}`;
  const CSS = `
.sp-w{display:contents}
.sp-top{display:flex;align-items:center;gap:6px;flex:none;min-height:24px}
.sp-rd{font:900 12.5px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:2px 9px;white-space:nowrap}
.sp-ph{font:800 12px var(--round);color:#fde68a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.sp-pot{font:900 13px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);border-radius:99px;padding:2px 9px;white-space:nowrap}
.sp-pot small{font:700 10.5px var(--round);color:var(--soft)}
.sp-ops{display:grid;gap:4px;flex:none}
.sp-op{display:grid;grid-template-columns:92px auto minmax(0,1fr);gap:7px;align-items:center;min-height:40px;padding:3px 7px;border-radius:11px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.09)}
.sp-op.now{border-color:#fde68a;background:rgba(245,179,1,.08)}
.sp-op.mate{box-shadow:inset 3px 0 0 #4ade80}
.sp-op.foe{box-shadow:inset 3px 0 0 #fb7185}
.sp-op.out{opacity:.55}
.sp-op.win{border-color:#4ade80;background:rgba(34,197,94,.13)}
.sp-nm{display:grid;line-height:1.15;min-width:0}
.sp-nm b{font:800 12.5px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-nm small{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap}
.sp-nm small i{font-style:normal;color:#fde68a}
.sp-cs{display:flex;gap:3px;align-items:center}
.sp-st{display:grid;justify-items:end;line-height:1.2;min-width:0}
.sp-st b{font:900 12.5px var(--round);color:#fde68a;white-space:nowrap}
.sp-st small{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sp-st small.f{color:#fb7185}
.sp-c{position:relative;display:grid;place-items:center;flex:none;border-radius:7px;background:#f8fafc;color:#0f172a;border:2px solid #e11d48;font:900 15px/1 var(--round);width:26px;height:34px;box-shadow:0 1px 2px rgba(0,0,0,.35)}
.sp-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 4px,#991b1b 4px 8px);border-color:#fca5a5;color:#fecaca;font-size:12px}
.sp-c.kn{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.35)}
.sp-c.dim{opacity:.4}
.sp-c.L{width:44px;height:58px;font-size:24px;border-radius:9px;border-width:3px}
.sp-c.op{border-color:#6d28d9;background:#ede9fe}
.sp-c.empty{background:transparent;border:1.5px dashed rgba(255,255,255,.25);box-shadow:none;color:transparent}
.sp-c.plus::after{content:"+";position:absolute;right:-8px;top:-8px;font:900 12px/1 var(--round);color:#0f172a;background:#c4b5fd;border-radius:99px;padding:1px 3px}
.sp-mid{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:10px;align-items:center;flex:none;padding:3px 2px}
.sp-pile{display:grid;justify-items:center;gap:2px}
.sp-pile small{font:800 10.5px var(--round);color:var(--soft);white-space:nowrap}
.sp-disc{display:grid;gap:2px;min-width:0}
.sp-disc small{font:700 10.5px var(--round);color:var(--soft);line-height:1.3}
.sp-disc .sp-cs{flex-wrap:wrap;gap:2px}
.sp-disc .sp-c{width:20px;height:26px;font-size:11.5px;border-width:1.5px}
.sp-me{display:grid;gap:3px;flex:none}
.sp-mm{display:contents}
.sp-hand{display:flex;gap:7px;justify-content:center}
.sp-h{position:relative;display:grid;place-items:center;flex:0 1 62px;min-height:62px;border-radius:10px;background:#f8fafc;color:#0f172a;border:3px solid #e11d48;font:900 27px/1 var(--round);box-shadow:0 3px 8px rgba(0,0,0,.4)}
.sp-h.new::after{content:"새";position:absolute;top:-7px;right:-5px;font:900 10px/1 var(--round);color:#0f172a;background:#fde68a;border-radius:99px;padding:2px 4px}
.sp-h.got::after{content:"받음";position:absolute;top:-7px;right:-7px;font:900 9.5px/1 var(--round);color:#0f172a;background:#86efac;border-radius:99px;padding:2px 4px}
.sp-sum{text-align:center;font:800 12px var(--round);color:#e2e8f0;line-height:1.35}
.sp-sum b{color:#fde68a}
.sp-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.sp-note{text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.sp-note b{color:#fde68a}
.sp-row{display:grid;grid-template-columns:repeat(var(--k,2),1fr);gap:6px}
.sp-row .btn{min-height:46px;padding:5px 4px;font:800 13.5px/1.2 var(--round)}
.sp-row .btn small{display:block;font:700 10.5px var(--round);opacity:.85}
.sp-row .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.sp-res{flex:none;text-align:center;font:800 12.5px var(--round);color:#fde68a;line-height:1.45;border-radius:11px;padding:4px 8px;background:rgba(34,197,94,.12);border:1px solid rgba(74,222,128,.4)}
.sp-res.bad{background:rgba(239,68,68,.12);border-color:rgba(248,113,113,.45)}
.sp-res.mid{background:rgba(245,179,1,.1);border-color:rgba(245,179,1,.4)}
.sp-res small{display:block;font:700 11.5px var(--round);color:#e2e8f0}
.sp-tut{display:grid;gap:8px;justify-items:center;width:100%}
.sp-tut small{font-size:12px;color:var(--soft);text-align:center;line-height:1.45}
.sp-tut .sp-hand{width:100%;max-width:330px}
.sp-tut .sp-cs{justify-content:center;flex-wrap:wrap}
@media (max-height:700px){.sp-op{min-height:36px;padding:2px 7px}.sp-c{width:24px;height:31px;font-size:14px}.sp-c.L{width:38px;height:50px;font-size:21px}.sp-h{min-height:54px;font-size:24px}.sp-row .btn{min-height:44px;padding:3px 4px}}
.sv-coachfit .sp-top small,.sv-coachfit .sp-note,.sv-coachfit .sp-disc small,.sv-coachfit .sp-sum{display:none}
.sv-coachfit .sp-op{min-height:28px;padding:1px 7px}
.sv-coachfit .sp-nm{grid-auto-flow:column;justify-content:start;gap:4px;align-items:center}
.sv-coachfit .sp-st{grid-auto-flow:column;gap:4px;align-items:center}
.sv-coachfit .sp-c{width:20px;height:25px;font-size:12px;border-width:1.5px}
.sv-coachfit .sp-c.L{width:30px;height:39px;font-size:17px;border-width:2px}
.sv-coachfit .sp-pile small{font-size:9.5px}
.sv-coachfit .sp-mid{padding:0 2px}
.sv-coachfit .sp-h{min-height:42px;font-size:20px;flex-basis:50px}
.sv-coachfit .sp-res{padding:2px 6px;font-size:11.5px}
.sv-coachfit .sp-res small{display:none}
.sv-coachfit .sp-row .btn{min-height:44px;padding:2px 4px;font-size:13px}
.sv-coachfit .sp-row .btn small{display:none}
.sv-coachfit .sp-rl{display:none}
.sv-coachfit .sp-nm{grid-template-columns:minmax(28px,1fr) auto}
.sv-coachfit .sp-mm{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;flex:none}
.sv-coachfit .sp-mm .sp-mid{min-width:0}
.sv-coachfit .sp-mm .sp-hand{gap:5px;padding:0 5px 0 0}
.sv-coachfit .sp-mm .sp-h{min-height:40px;flex:none;width:38px;font-size:19px;border-width:2.5px}`;
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [];
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const card = (c, cls) => `<span class="sp-c ${cls || ""}">${c}</span>`;
  const back = cls => `<span class="sp-c back ${cls || ""}">?</span>`;
  const role = (V, i) => (V.mn[i] ? "👑 주" : "🤝 조력자");
  const teamLb = (V, me, t) => (me >= 0 ? (V.tm[me] === t ? "우리 팀" : "상대 팀") : t === 0 ? "A팀" : "B팀");
  // 이번 라운드 그 자리가 한 일 (공개된 것만)
  function lastAct(V, j) {
    const L = V.log; let i = L.length - 1; while (i >= 0 && !(L[i].k === "round" && L[i].r === V.round)) i--;
    let act = "", bet = "";
    for (let k = i + 1; k < L.length; k++) {
      const e = L[k];
      if (e.k === "act" && e.s === j) act = e.t === "pass" ? "패스" : e.t === "open" ? `오픈 ${e.old}→${e.c}` : e.t === "draw" ? "1장 뽑음" : "교환";
      else if (e.k === "drop" && e.s === j) act = `${e.c} 버림`;
      else if (e.k === "back" && e.s === j) act = act || "교환 받음";
      else if (e.k === "bet" && e.s === j) bet = e.t === "fold" ? "폴드" : e.t === "call" ? "콜" : e.t === "check" ? "체크" : `+${e.r} (→${e.lv})`;
    }
    return bet || act;
  }
  function opRow(V, ctx, j) {
    const me = ctx.me, R = V.phase === "show" || V.over ? V.res : null, all = V.hands ? V.hands[j] : null;
    const known = me >= 0 && V.mate[me] === j ? V.kn || [] : [];
    let cs;
    if (R && R.hands[j]) cs = R.hands[j].map(c => card(c)).join("");
    else if (all) cs = all.map(c => card(c, V.fold[j] ? "dim" : "")).join("");
    else { const n = V.handN[j]; cs = known.map(c => card(c, "kn")).join("") + Array(Math.max(0, n - known.length)).fill(back(V.fold[j] ? "dim" : "")).join(""); }
    let st;
    if (R) st = R.hands[j] ? `= ${R.sums[j]}${R.getOpen === j ? " (+오픈)" : ""}` : V.fold[j] ? "폴드" : R.win === j ? "승 (모두 폴드)" : "";
    else if (V.cur === j && !V.over) st = V.phase === "reply" ? "돌려줄 카드 고르는 중" : V.phase === "drop" ? "버리는 중" : V.phase === "bet" ? "베팅 차례" : "차례";
    else st = lastAct(V, j);
    const team = me >= 0 ? (V.tm[j] === V.tm[me] ? " mate" : " foe") : V.tm[j] === 0 ? " mate" : " foe";
    const cls = `sp-op${V.cur === j && !R && !V.over ? " now" : ""}${team}${V.fold[j] && !R ? " out" : ""}${R && R.win === j ? " win" : ""}`;
    return `<div class="${cls}"><span class="sp-nm"><b>${esc(nameOf(ctx, j))}</b><small>${V.mn[j] ? "👑" : "🤝"}<span class="sp-rl"> ${V.mn[j] ? "주" : "조력자"} ·</span> <i>🪙${V.chips[j]}</i></small></span><span class="sp-cs">${cs}</span><span class="sp-st"><b>${V.bet[j] ? `건 칩 ${V.bet[j]}` : ""}</b><small class="${V.fold[j] ? "f" : ""}">${esc(st)}</small></span></div>`;
  }
  const phName = V => (V.over ? "끝" : { act: "카드 턴", drop: "버리기", reply: "교환", bet: "베팅", show: "결과" }[V.phase] || "");

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, ph = V.phase, over = V.over, actor = ctx.canAct && me >= 0 && V.needs.includes(me) && !over;
    const R = ph === "show" || over ? V.res : null;
    const nm = i => (i === me ? "나" : nameOf(ctx, i));
    let h = `<div class="sp-top"><span class="sp-rd">${V.round}/${V.R}R</span><span class="sp-ph">${phName(V)}${!R && V.phase === "bet" ? ` · ${V.opened ? `콜 ${V.level}개` : "처음 거는 차례"}` : ""}</span><span class="sp-pot">🪙 팟 ${R ? R.pot : V.pot}${!R && V.carry ? ` <small>(이월 ${V.carry})</small>` : ""}</span></div>`;
    // 다른 세 사람: 파트너 먼저, 그다음 상대 (차례 순서)
    const others = me >= 0 ? [V.mate[me]].concat(V.order.filter(j => V.tm[j] !== V.tm[me])) : V.order.slice();
    h += `<div class="sp-ops">${others.map(j => opRow(V, ctx, j)).join("")}</div>`;
    // 가운데: 더미 · 오픈 · 버린 카드
    const openCls = R && R.getOpen >= 0 ? "L op plus" : "L op";
    const midH = `<div class="sp-mid"><span class="sp-pile">${V.deckN ? back("L") : `<span class="sp-c L empty"></span>`}<small>더미 ${V.deckN}</small></span><span class="sp-pile">${card(V.open, openCls)}<small>오픈</small></span><span class="sp-disc"><small>버린 카드 ${V.disc.length ? "" : "없음"}</small><span class="sp-cs">${V.disc.map(d => card(d.c)).join("")}</span><small>가장 낮은 합 한 사람만 오픈을 더해요</small></span></div>`;
    if (R) {
      const W = R.win, mine = me >= 0 && W >= 0 && V.tm[W] === V.tm[me];
      const lowTxt = R.act.length > 1 ? (R.getOpen >= 0 ? `가장 낮은 ${esc(nm(R.getOpen))} ${R.base[R.getOpen]}+오픈 ${R.open} = ${R.sums[R.getOpen]}` : "가장 낮은 합이 여럿 → 오픈 카드는 아무도 못 받음") : "";
      const head = W < 0 ? `🤝 가장 큰 합이 같아요 — 팟 ${R.pot} 다음 라운드로 이월` : R.act.length === 1 ? `🏳️ 모두 폴드 → ${esc(nm(W))} 팟 ${R.pot}` : `🏆 ${esc(nm(W))} ${R.sums[W]}로 팟 ${R.pot}`;
      h += `<div class="sp-res${W < 0 ? " mid" : me >= 0 && !mine ? " bad" : ""}">${head}${lowTxt ? `<small>${lowTxt}</small>` : ""}</div>`;
    }
    // 내 손패
    let mine = "", acts = "";
    if (me >= 0 && V.hand) {
      const g = V.give, isNew = c => ph === "drop" && g && g.s === me && g.c === c, isGot = c => ph === "reply" && g && g.c === c && V.mate[me] === g.s;
      mine = `<div class="sp-me"><div class="sp-hand">${V.hand.map(c => `<span class="sp-h${isNew(c) ? " new" : ""}${isGot(c) ? " got" : ""}">${c}</span>`).join("")}</div>`;
      const sm = V.hand.length === 2 ? V.hand[0] + V.hand[1] : null;
      mine += `<div class="sp-sum">${role(V, me)} · 칩 <b>${V.chips[me]}</b>${V.bet[me] ? ` (건 칩 ${V.bet[me]})` : ""}${sm != null ? ` · 2장 합 <b>${sm}</b> (가장 낮으면 +${V.open} = ${sm + V.open})` : ""}</div></div>`;
    }
    if (over) acts = `<div class="sp-note">아래 결과 창에서 라운드 기록을 볼 수 있어요</div>`;
    else if (me < 0) acts = `<div class="sp-note">구경 중이에요${V.hands ? " · 모든 손패가 보여요" : " · 손패는 가려져 있어요"}</div>`;
    else if (R) acts = `<div class="sp-note">곧 ${V.round + 1}라운드${R.win < 0 ? " (이월이라 기본 베팅 없음)" : ""} — 선공 팀이 바뀌어요</div>`;
    else if (!actor) {
      const c = V.cur, who = esc(jw(nm(c), "이"));
      acts = `<div class="sp-note">${ph === "reply" ? `${who} 돌려줄 카드를 고르는 중…` : ph === "drop" ? `${who} 버릴 카드를 고르는 중…` : ph === "bet" ? `${who} 베팅 중…` : `${who} 고르는 중…`}</div>`;
    } else if (ph === "act") {
      const mt = V.mate[me];
      acts = `<div class="sp-note">넷 중 하나 — 교환은 ${esc(nameOf(ctx, mt))}에게 1장을 건네면 1장을 돌려받아요</div>`;
      acts += `<div class="sp-row" style="--k:3"><button class="btn" data-a="pass">⏭ 패스</button><button class="btn" data-a="open" ${V.deckN ? "" : "disabled"}>🔄 오픈 변경<small>지금 ${V.open}</small></button><button class="btn" data-a="draw" ${V.deckN ? "" : "disabled"}>🂠 1장 뽑기<small>3장 중 1장 버림</small></button></div>`;
      acts += `<div class="sp-row">${V.hand.map(c => `<button class="btn primary" data-a="swap" data-c="${c}">🤝 ${c} 건네기</button>`).join("")}</div>`;
    } else if (ph === "drop") {
      acts = `<div class="sp-note">더미에서 <b>${V.give && V.give.c}</b>${ja(V.give && V.give.c, "을")} 뽑았어요 — 버릴 카드 (모두가 봐요)</div><div class="sp-row" style="--k:3">${V.hand.map(c => `<button class="btn" data-a="drop" data-c="${c}">${c} 버리기</button>`).join("")}</div>`;
    } else if (ph === "reply") {
      acts = `<div class="sp-note">${esc(nameOf(ctx, V.give.s))}${ja(nameOf(ctx, V.give.s), "이")} <b>${V.give.c}</b>${ja(V.give.c, "을")} 건넸어요 — 돌려줄 카드 (받은 카드를 돌려줘도 돼요)</div><div class="sp-row" style="--k:3">${V.hand.map(c => `<button class="btn" data-a="back" data-c="${c}">${c} 돌려주기</button>`).join("")}</div>`;
    } else if (ph === "bet") {
      const L = K.betLegal(V.level, V.cap, V.opened, V.chips[me], V.bet[me]), call = L.find(a => a.t === "call"), rs = L.filter(a => a.t === "raise").map(a => a.r);
      const need = V.level - V.bet[me];
      const pick = [...new Set([1, 2, 3, 5, 10].filter(r => rs.includes(r)).concat(rs.length ? [rs[rs.length - 1]] : []))].slice(0, 5);
      acts = `<div class="sp-note">${V.opened ? `콜 = ${need}개 더 (모두 ${V.level}개)` : "처음 거는 사람은 1개 이상 더 걸거나 폴드"} · 이번 판 상한 ${V.cap}개</div>`;
      acts += `<div class="sp-row"><button class="btn fold" data-a="fold">🏳️ 폴드</button>${call ? `<button class="btn primary" data-a="call">${need ? `📞 콜 +${need}` : "✋ 체크"}<small>모두 ${V.level}개</small></button>` : `<button class="btn" disabled>콜 없음<small>먼저 걸어야 해요</small></button>`}</div>`;
      if (pick.length) acts += `<div class="sp-row" style="--k:${pick.length}">${pick.map(r => `<button class="btn" data-a="raise" data-r="${r}">+${r}<small>→ ${V.level + r}</small></button>`).join("")}</div>`;
    }
    h += `<div class="sp-mm">${midH}${mine}</div><div class="sp-acts">${acts}</div>`;
    stage.innerHTML = `<div class="sp-w">${h}</div>`;
    stage.onclick = e => {
      if (!actor) return;
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a, c = +b.dataset.c, r = +b.dataset.r;
      ctx.sfx(a === "fold" ? "tap" : a === "raise" || a === "call" ? "pop" : "tap");
      if (a === "pass" || a === "open" || a === "draw" || a === "fold" || a === "call") ctx.act({ t: a });
      else if (a === "swap" || a === "drop" || a === "back") ctx.act({ t: a, c });
      else if (a === "raise") ctx.act({ t: "raise", r });
    };
  }

  // ── 결과 창: 라운드 기록 ──
  function result(V, me) {
    const nm = i => esc(i === me ? "나" : String(NAMES[i] || `${i + 1}번`).slice(0, 5));
    const rows = V.hist.map(x => `<tr><td>${x.r}R</td><td>${x.win < 0 ? "이월" : `<b>${nm(x.win)}</b>`}</td><td>${x.pot}</td><td style="font-size:11px;color:var(--soft)">${x.act.length > 1 ? x.act.map(j => `${nm(j)} ${x.sums[j]}`).join(" · ") : "모두 폴드"} · 오픈 ${x.open}</td></tr>`).join("");
    const mains = [0, 1].map(t => V.mainOf[t]);
    const why = V.why.startsWith("zero") ? "칩 0 → 그 팀 패배" : V.why.startsWith("main") ? "주 플레이어 칩 비교" : V.why.startsWith("team") ? "주 칩이 같아 팀 칩 합" : "무승부";
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead><tr><th></th><th>팟</th><th>칩</th><th>공개 합</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:5px;font-size:12px">주 플레이어 칩 ${mains.map(s => `${nm(s)} <b>${V.chips[s]}</b>`).join(" : ")} · ${why}</div><div style="margin-top:3px;font-size:11.5px;color:var(--soft)">방송: 7라운드 뒤 주 플레이어 칩이 많은 팀 승 · 칩이 0이 되면 바로 패배</div>`;
  }

  // ── AI 선생님 (보이는 것만 — 💡 는 고급 AI와 같은 계산) ──
  const pct = p => `${Math.round(p * 100)}%`;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const sgn = x => (x >= 0 ? "+" : "") + f1(x);
  const actText = a => !a ? "—" : a.t === "pass" ? "패스" : a.t === "open" ? "오픈 카드 변경" : a.t === "draw" ? "더미에서 1장 뽑기" : a.t === "swap" ? `${a.c} 건네기 (교환)` : a.t === "drop" ? `${a.c} 버리기` : a.t === "back" ? `${a.c} 돌려주기` : a.t === "fold" ? "폴드" : a.t === "call" ? "콜" : a.t === "raise" ? `+${a.r} 레이즈` : "행동";
  function flow(V, me, nm) {
    const L = V.log, bits = []; let i = L.length - 1; while (i >= 0 && !(L[i].k === "round" && L[i].r === V.round)) i--;
    for (let k = i + 1; k < L.length; k++) {
      const e = L[k]; if (e.s === me) continue;
      if (e.k === "act" && e.t === "open") bits.push(`${nm(e.s)} 오픈 ${e.old}→${e.c}`);
      else if (e.k === "act" && e.t === "pass") bits.push(`${nm(e.s)} 패스`);
      else if (e.k === "act" && e.t === "swap" && V.mate[me] !== e.s) bits.push(`${nm(e.s)}→${nm(V.mate[e.s])} 교환`);
      else if (e.k === "drop") bits.push(`${nm(e.s)} 1장 뽑아 ${e.c} 버림 (남은 2장이 ${e.c}보다 클 때가 많음)`);
      else if (e.k === "bet" && e.t !== "check") bits.push(`${nm(e.s)} ${e.t === "fold" ? "폴드" : e.t === "call" ? "콜" : `+${e.r}`}`);
    }
    return bits;
  }
  // 파트너 손패 짐작 (교환 약속으로)
  function mateRead(V, me, nm) {
    const mt = V.mate[me], who = nm(mt);
    if (V.phase === "reply" && V.give && V.give.s === mt && V.give.c != null) {
      const g = V.give.c;
      return V.mn[mt] ? `${jw(who, "이")} ${jw(g, "을")} 건넸어요 — 주는 가장 낮은 카드를 건네니 ${who}의 남은 카드는 ${g}보다 커요.` : `${jw(who, "이")} ${jw(g, "을")} 건넸어요 — 조력자는 가장 높은 카드를 건네니 ${who}의 남은 카드는 ${g}보다 작아요 (합은 ${g * 2 - 1} 아래).`;
    }
    const sw = (V.swaps || []).filter(x => x.r === V.round), last = sw[sw.length - 1];
    if (!last) return V.kn && V.kn.length ? `${who} 손에 ${V.kn.join("·")} (교환으로 앎).` : "";
    const ref = last.a === me ? last.y : last.x, known = V.kn && V.kn.length ? ` · ${who} 손에 ${V.kn.join("·")}` : "";
    return last.a === me ? `내가 ${jw(last.x, "을")} 건네고 ${jw(last.y, "을")} 돌려받았어요${known} — ${V.mn[mt] ? `주는 가장 낮은 카드를 돌려주니 남은 카드는 ${ref}보다 커요` : `조력자는 가장 높은 카드를 돌려주니 남은 카드는 ${ref}보다 작아요`}.` : `${jw(who, "이")} ${jw(last.x, "을")} 건넸어요${known} — ${V.mn[mt] ? `주는 가장 낮은 카드를 건네니 남은 카드는 ${ref}보다 커요` : `조력자는 가장 높은 카드를 건네니 남은 카드는 ${ref}보다 작아요`}.`;
  }
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    if (V.over) {
      const m = [0, 1].map(t => V.mainOf[t]);
      return { opp: `끝 — 주 플레이어 칩 ${m.map(s => `${nm(s)} ${V.chips[s]}`).join(" : ")}`, mine: me >= 0 ? (V.ranks && V.ranks[me] === 0 ? "우리 팀이 이겼어요!" : "아쉬워요") : "구경 중이었어요.", rec: me >= 0 && V.ranks && V.ranks[me] === 0 ? "수고했어요" : "한 판 더 해 봐요", why: "" };
    }
    if (me < 0 || !V.hand) return { opp: `${V.round}/${V.R}라운드 · 팟 ${V.pot}`, mine: "구경 중이에요.", rec: "누가 무엇을 버리고 누가 교환하는지 보세요", why: "버린 카드는 모두가 봐요 — 그보다 높은 2장을 남겼을 때가 많아요. 교환은 팀 안에서만 보여요." };
    const fl = flow(V, me, nm), mr = mateRead(V, me, nm);
    const opp = (fl.length ? fl.slice(-4).join(" · ") : `${V.round}라운드 시작`) + ` · 팟 ${V.pot}${V.carry ? ` (이월 ${V.carry})` : ""}.`;
    const sm = V.hand.length === 2 ? V.hand[0] + V.hand[1] : null;
    const mine = `${V.mn[me] ? "주" : "조력자"} · 칩 ${V.chips[me]}${sm != null ? ` · 2장 합 ${sm}` : ` · 손패 ${V.hand.join("·")}`} · 오픈 ${V.open}${mr ? ` · ${mr}` : ""}`;
    if (!V.needs.includes(me)) return { opp, mine, rec: "다른 사람 차례를 기다려요", why: V.phase === "bet" ? "남의 레이즈는 손패가 좋다는 신호예요. 칩 0이 되면 팀이 바로 지니 남은 칩도 봐요." : "남이 버린 카드 · 오픈 변경을 보면 그 사람이 높은 합을 노리는지, 가장 낮은 합 + 오픈 카드를 노리는지 짐작할 수 있어요." };
    const H = K.recommend(V, me), a = H.a, rec = actText(a);
    let why = "";
    if (V.phase === "bet") {
      const B = H.B;
      if (B.why === "move") why = `상대가 다 접고 팀원 둘만 남았어요 — 조력자 칩을 주에게 옮길 기회예요 (방송 3라운드 최혜선 → 홍진호처럼). 조력자가 올리면(남은 라운드 몫 ${B.keep}개는 남김) 주가 1개 더 올리고, 조력자가 접으면 팟 ${V.pot}${ja(V.pot, "이")} 주에게 가요.`;
      else {
        why = `남 손패를 ${K.S_BET}번 뽑아 보면(버린 카드 · 레이즈 · 교환 단서로 무게) 끝까지 갈 때 내가 이길 확률 ${pct(B.pM)} · 우리 팀 ${pct(B.pT)} · 동점 이월 ${pct(B.pTie)}. `;
        why += `${a.t === "fold" ? "" : ""}콜 기대 ${sgn(B.EVc)}칩 / 폴드 ${sgn(B.EVf)}칩 (팀 기준, 조력자 칩은 절반 무게)`;
        if (a.t === "fold") why += ` — 콜이 폴드보다 ${f1(K.FOLD_M)}칩 넘게 낫지 않으면 접어요.`;
        else if (a.t === "raise" && B.why === "value") why += ` — 이길 확률이 55%를 넘어 ${a.r}개 더 (넘는 만큼 크게${V.mn[me] ? "" : ", 조력자는 남은 라운드 몫을 남겨요"}).`;
        else why += ".";
      }
    } else {
      const O = (H.O || []).slice().sort((x, y) => y.p - x.p), txt = x => `${actText(x.a).replace(" (교환)", "")} ${pct(x.p)}`;
      const mineO = (H.O || []).find(x => JSON.stringify(x.a) === JSON.stringify(a));
      if (H.rule === "give") why = `약속: 조력자는 가장 높은 카드를 건네요 — 주가 3장 중 높은 2장을 갖고, 주는 받은 카드로 내 남은 카드가 그보다 작다는 걸 알아요. 끝까지 가면 우리 팀이 가장 큰 합일 확률 ${mineO ? pct(mineO.p) : "-"} (${O.filter(x => x !== mineO).slice(0, 2).map(txt).join(" · ")}).`;
      else if (H.rule === "reply") why = `${mr} 약속대로 ${V.mn[me] ? "가장 낮은" : "가장 높은"} ${jw(a.c, "을")} 돌려줘요 → 우리 팀이 가장 큰 합일 확률 ${mineO ? pct(mineO.p) : "-"}${O.length > 1 ? ` (${O.filter(x => x !== mineO).slice(0, 2).map(txt).join(" · ")})` : ""}.`;
      else why = `남 손패 · 더미를 ${K.S_CARD}번 뽑아 뒷사람 수까지 굴려 보면 우리 팀이 가장 큰 합일 확률 — ${O.slice(0, 4).map(txt).join(" · ")}.${V.phase === "act" && V.mn[me] ? " (주가 먼저 건네는 교환은 약속에 없어요 — 파트너가 읽기 어려워요)" : ""}`;
    }
    return { opp, mine, rec, why };
  }

  // ── 🎞️ 복기: 아쉬운 수 (선생님과 같은 계산) ──
  const seeded = a0 => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const K_P = 120, K_CHIP = 6;                                // 팀이 가장 클 확률 1%p 손해 = sev 1.2 · 칩 1개 손해 = sev 6
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || V.over || !V.needs || !V.needs.includes(seat) || !V.hand) return none;
      const isBest = bestA && JSON.stringify(myA) === JSON.stringify(bestA), inTally = !!(info && info.same);
      const fin = (s, why) => ({ sev: isBest ? 0 : inTally ? Math.min(Math.max(0, Math.round(s)), 20) : Math.max(0, Math.min(100, Math.round(s))), why });
      const seed = ((((info && info.seed) | 0) ^ Math.imul(V.round * 8 + V.k + 1, 2654435761) ^ Math.imul(seat + 1, 374761393) ^ Math.imul(V.level + 3, 40503)) >>> 0) || 1;
      if (V.phase === "bet") {
        const B = K.betEval(V, seat, K.S_BET, seeded(seed));
        const ev = a => (a.t === "fold" ? B.EVf : B.EVc), my = ev(myA), best = ev(bestA || B.a);
        if (myA.t === "raise" && (!bestA || bestA.t !== "raise")) return fin(Math.max(0, best - my) * K_CHIP + Math.max(0, 0.55 - B.pM) * myA.r * 8, `+${myA.r} 레이즈 — 이길 확률 ${pct(B.pM)} (고급 AI는 55% 넘을 때만) · 콜 ${sgn(B.EVc)} / 폴드 ${sgn(B.EVf)}칩`);
        return fin(Math.max(0, best - my) * K_CHIP, `${actText(myA)} → 칩 기대 ${sgn(my)} / 고급 AI ${actText(bestA || B.a)} → ${sgn(best)} (이길 확률 ${pct(B.pM)} · 우리 팀 ${pct(B.pT)})`);
      }
      const O = K.cardEval(V, seat, K.cardOpts(V, seat), K.S_CARD, seeded(seed)), f = a => O.find(x => JSON.stringify(x.a) === JSON.stringify(a));
      const m = f(myA), b = f(bestA) || O.slice().sort((x, y) => y.v - x.v)[0];
      if (!m || !b) return none;
      const rule = (V.phase === "reply" || (V.phase === "act" && !V.mn[seat])) && bestA && myA.t !== bestA.t ? " · 교환 약속과 달라 파트너가 읽기 어려워요" : V.phase === "reply" && bestA && myA.c !== bestA.c ? " · 교환 약속과 달라 파트너가 읽기 어려워요" : "";
      return fin(Math.max(0, b.p - m.p) * K_P + (rule ? 10 : 0), `${actText(myA)} → 우리 팀이 가장 클 확률 ${pct(m.p)} / 고급 AI ${actText(bestA || b.a)} → ${pct(b.p)}${rule}`);
    } catch (e) { /* 계산 못 하면 아래 */ }
    return none;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const hand = (cs, cls) => `<div class="sp-hand">${cs.map((c, i) => `<span class="sp-h ${(cls && cls[i]) || ""}">${c}</span>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "주 플레이어의 칩을 지켜라", body: "2:2 팀전이에요. 팀마다 <b>주 플레이어</b> 한 명과 <b>조력자</b> 한 명. 7라운드가 끝났을 때 <b>주 플레이어 칩</b>이 많은 팀이 이겨요. 누구든 칩이 0이 되면 그 팀이 바로 져요.",
        boardHtml: `<div class="sp-tut"><span style="font-size:40px">🃏</span><small>👑 주 · 🤝 조력자 — 칩 20개씩</small></div>`, ms: 6400 },
      { tag: "STEP 2 · 준비물", title: "1~15 카드 · 2장씩 · 오픈 카드", body: "라운드마다 1~15 카드를 섞어 한 사람에 <b>2장</b>. 남은 카드 중 1장을 <b>오픈 카드</b>로 펼쳐요. 라운드 시작 때 모두 칩 1개를 걸어요 (기본 베팅).",
        boardHtml: `<div class="sp-tut"><span class="sp-cs">${card(4)}${card(11)}${back()}${back()}</span><span class="sp-cs">${card(12, "L op")}</span><small>오픈 카드</small></div>`, ms: 6000 },
      { tag: "STEP 3 · 진행", title: "내 턴: 넷 중 하나", body: "① <b>오픈 카드 변경</b>: 더미에서 새 오픈 카드 ② <b>교환</b>: 파트너에게 1장을 건네고 1장을 돌려받음 ③ <b>버리기</b>: 더미에서 1장을 가져와 3장 중 1장을 공개로 버림 ④ <b>패스</b>. 선공 팀 조력자 → 주 → 다른 팀 조력자 → 주 차례예요.",
        boardHtml: `<div class="sp-tut"><small>⏭ 패스 · 🔄 오픈 변경 · 🂠 1장 뽑기 · 🤝 건네기</small></div>`, ms: 8600 },
      { tag: "STEP 4 · 직접 해 봐요", title: "14를 뽑았어요. 무엇을 버릴까요?", body: "손패 9 · 13에 더미에서 <b>14</b>를 가져왔어요 (방송 1라운드 김영광). 3장 중 1장을 버려 <b>2장 합이 가장 크게</b> 남겨 봐요.",
        interactive: { hint: "👆 버릴 카드를 눌러요", doneText: "✅ 9를 버려 13+14 = 27!" },
        render(stage, ctrl) {
          let msg = "", done = false;
          const three = [9, 13, 14];
          const draw = () => {
            stage.innerHTML = `<div class="sp-tut"><div class="sp-hand">${three.map(x => (done ? `<span class="sp-h" style="${x === 9 ? "opacity:.3" : ""}">${x}</span>` : `<button type="button" class="sp-h${x === 14 ? " new" : ""}" data-c="${x}">${x}</button>`)).join("")}</div><small>${msg}</small></div>`;
            if (done) ctrl.complete();
          };
          stage.onclick = e => {
            const bt = e.target.closest("[data-c]"); if (!bt || done) return;
            const x = +bt.dataset.c; ctrl.sfx("tap");
            const rest = three.filter(y => y !== x);
            if (x === 9) { done = true; msg = "🏆 13+14 = 27 — 방송에서 이 손패로 1라운드 팟을 가져갔어요!"; }
            else msg = `🤔 ${jw(x, "을")} 버리면 ${rest.join("+")} = ${rest[0] + rest[1]}. 더 크게 남길 수 있어요!`;
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 베팅", title: "콜 · 레이즈 · 폴드", body: "턴이 끝나면 같은 순서로 베팅해요. <b>콜</b> = 가장 많이 건 만큼 맞추기, <b>레이즈</b> = 더 걸기(1~10개), <b>폴드</b> = 포기(건 칩은 팟에 남음). 모두 같아지면 남은 사람이 2장을 공개해요.",
        boardHtml: `<div class="sp-tut"><small>🏳️ 폴드 · 📞 콜 · +1 +2 +3 …</small></div>`, ms: 7600 },
      { tag: "STEP 6 · 승패", title: "가장 큰 합이 팟을 · 가장 낮으면 오픈 카드", body: "공개한 2장 합이 <b>가장 낮은 한 사람</b>은 오픈 카드를 더해 3장 합! 그다음 합이 <b>가장 큰 사람</b>이 팟을 다 가져가요. 가장 큰 합이 같으면 팟은 다음 라운드로 이월 (기본 베팅 없음).",
        boardHtml: `<div class="sp-tut">${hand([1, 8], ["", ""])}<small>방송 7라운드 최혜선: 1+8 + 오픈 14 = <b>23</b>으로 역전승</small></div>`, ms: 7800 },
      { tag: "STEP 7 · 특수", title: "교환은 신호 · 칩 옮기기", body: "교환한 카드는 두 사람만 봐요. AI 조력자는 <b>가장 높은 카드</b>를 건네요 — 받은 카드보다 파트너 남은 카드가 작다는 신호! 상대가 다 접고 팀원만 남으면 조력자 칩을 주에게 옮길 수도 있어요 (방송 3라운드). 막히면 <b>🧑‍🏫 AI 선생님</b>!",
        boardHtml: `<div class="sp-tut"><small>🤝 조력자 13 건넴 → 주 3장 중 높은 2장 · 3 돌려줌</small></div>`, ms: 8200 },
    ];
  }

  const SRC = "방송: 피의 게임 3 · 스위치 포커 (1일차 데스매치, 2:2 — 주 플레이어 + 조력자)";
  const DIFF = "방송과 다른 점: 레이즈는 한 번에 1~10개 · 베팅을 처음 여는 사람은 1개 이상 걸거나 폴드 · 남은 사람 중 칩(건 것 포함)이 가장 적은 사람만큼까지만 걸 수 있음(사이드 팟 없음 — 방송 7라운드 칩과 맞음) · 이 셋은 방송에 나오지 않아 우리가 정함 · 1라운드 선공 팀은 추첨 · 교환한 카드는 두 사람만, 상대는 교환했다는 것만 봄 · 폴드한 사람 카드는 공개 안 함 · 칩 0은 라운드 승부 뒤에 봄 (기본 베팅으로 0이 되면 그 라운드는 올인) · 두 팀 다 칩 0이면 주 칩 → 팀 칩 합 · 7라운드 끝 동점도 같게, 그래도 같으면 무승부 · 마지막 이월 팟은 사라짐 · 팀원끼리 말하기 없음 (방송은 팀 회의 · 눈짓) — AI 조력자는 교환하는 카드로만 신호 · 자리 옵션: 맞대결(친구 둘이면 주끼리) · 한 팀 · 내가 조력자 · 3라운드짜리 짧은 판 옵션";
  window.SVUI = window.SVUI || {};
  window.SVUI.switchpoker = {
    actText,
    name: "스위치 포커", emoji: "🔀", short: "2장 합이 가장 크게 — 파트너와 카드를 바꿔 주 플레이어 칩을 지켜라", min: 4, max: 4, defN: 4, board: false,
    opts: [
      { k: "seat", label: "자리", items: [["vs", "맞대결 (친구 둘이면 주끼리)"], ["co", "한 팀 (나 = 주, 다음 사람 = 조력자)"], ["help", "내가 조력자 (다음 사람이 주)"]], def: "vs" },
      { k: "rounds", label: "라운드", items: [[7, "7라운드 (방송)"], [3, "3라운드 (짧게)"]], def: 7 },
    ],
    howto: [
      "목표: 2:2 팀전 — 7라운드가 끝났을 때 <b>주 플레이어 칩</b>이 많은 팀 승 · 누구든 칩이 0이 되면 그 팀이 바로 패배",
      "준비물: 1~15 숫자 카드 · 칩 20개씩 · 라운드마다 2장씩 받고 남은 카드 중 1장을 오픈 카드로 · 라운드 시작 때 기본 베팅 1개",
      "진행: 선공 팀(1라운드 추첨 · 그 뒤 번갈아) 조력자 → 주 → 다른 팀 조력자 → 주 순서로 넷 중 하나 — ① 오픈 카드 변경 ② 교환(파트너에게 1장 건네면 파트너가 1장 돌려줌 · 받은 카드를 돌려줘도 됨) ③ 버리기(더미에서 1장 가져와 3장 중 1장을 공개로 버림) ④ 패스 · 그다음 같은 순서로 베팅: 콜 · 레이즈 · 폴드",
      "승패: 베팅이 맞춰지면 남은 사람이 2장 공개 — 합이 <b>가장 낮은 한 사람</b>은 오픈 카드를 더해 3장 합 (가장 낮은 사람이 여럿이면 아무도 못 받음) · 합이 <b>가장 큰 사람</b>이 팟을 다 가져감",
      "특수: 가장 큰 합이 같으면 팟은 다음 라운드로 이월 (그 라운드는 기본 베팅 없음) · 혼자 남으면 공개 없이 팟 · 교환은 팀 안에서만 보임 — 받은 카드가 파트너 손패의 단서",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF, fitCoach: true,
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드 · ${phName(V)} · 팟 ${V.pot}`),
    chip: (V, i) => ({ t: `${V.mn[i] ? "👑" : "🤝"}🪙${V.chips[i]}${V.fold[i] && !V.over && V.phase !== "show" ? " 폴드" : ""}`, on: V.needs.includes(i) && !V.over, out: V.chips[i] <= 0 || (V.fold[i] && V.phase === "bet") }),
    render, result, coach, tutorial, review,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

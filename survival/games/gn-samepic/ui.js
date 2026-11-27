/* 베니 서바이벌 · 같은 그림 찾기 — 화면 (벨트 두 줄 · 4×4 그림판 · 한 칸씩 열기 · 맞히면 이어서/멈추기 · 선생님 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const G = window.SVCores["gn-samepic"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const { NP, GOAL, LET } = G;
  const PICS = ["🍎", "🐶", "🚗", "⭐", "🌙", "🎈", "🔑", "🐟", "🍕", "🎵", "🌸", "⚽", "🔔", "🍀", "🎁", "🦋"];
  const em = p => (p == null || p < 0 ? "?" : PICS[p] || "?");
  const SRC = "방송: 더 지니어스 시즌 1 11화 · 시즌 2 8화 · 시즌 4 7화 데스매치 같은 그림 찾기 (1:1) — 나무위키 '같은 그림 찾기' 문서 룰 · 회차 문서 확인 (치킨차차를 닮은 컨베이어 벨트 기억 게임)";
  const DIFF = "그림 16개는 우리가 고른 이모지예요 (방송 그림 아님) · 기본은 시즌 4 판 (둘 다 12번째 칸에서 출발 · 선후공은 동전) — 시즌 1·2 판(가넷 많은 쪽 10번째 · 적은 쪽 8번째, 선후공은 많은 쪽이 정함)은 옵션이고 가넷 많은 쪽은 무작위로 정해요 · 나무위키에 결승점 · 떨어지는 칸이 적혀 있지 않아 '벨트 20번째 칸에 닿으면 승 · 벨트 뒤끝(1번째 칸)에서 더 밀리면 떨어져 패'로 우리가 정함 · 틀리면 벨트가 한 칸 물러나며 말도 같이 밀려 같은 목표 그림이 그대로예요 (방송 화면 설명을 이렇게 읽음) · 맞힌 뒤 '한 번 더 확인'은 방송처럼 선택이라 멈추기 단추가 있어요 · 연 그림은 둘 다 보는 공개 정보라 한 기기에서도 둘이 할 수 있어요 · 방송 사람은 판의 그림을 기억해야 해서 '열었던 그림 보이기'는 옵션(기본 끔)";
  const CSS = `
.sp-bl{flex:none;display:grid;gap:3px;border-radius:12px;padding:5px 6px 5px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.12)}
.sp-bl.me{border-color:rgba(134,239,172,.55)}.sp-bl.on{box-shadow:0 0 0 2px var(--gold)}
.sp-bh{display:flex;justify-content:space-between;align-items:baseline;font:800 12px var(--round);color:var(--soft);gap:6px}
.sp-bh .nm{max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0}
.sp-bh b{font:900 14px var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.sp-bh small{font:700 10.5px var(--round);color:var(--soft)}
.sp-cells{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.sp-cd{position:relative;height:34px;border-radius:8px;display:grid;place-items:center;font-size:21px;line-height:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.sp-cd.past{opacity:.35}.sp-cd.void{opacity:.12}
.sp-cd.tg{border:2px solid #fb7185;background:rgba(225,29,72,.25);box-shadow:0 0 8px rgba(251,113,133,.55)}
.sp-cd .pc{position:absolute;left:50%;bottom:-3px;transform:translateX(-50%);font-size:12px;line-height:1;z-index:2}
.sp-cd.me .pc{filter:drop-shadow(0 0 3px #fde68a)}
.sp-cd.fin::after{content:"🏁";position:absolute;right:-1px;top:-5px;font-size:11px}
.sp-mt{height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;position:relative}
.sp-mt i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#facc15 45%,#4ade80)}
.sp-st{flex:none;min-height:36px;display:grid;place-items:center;text-align:center;font:700 12.5px/1.35 var(--round);color:var(--soft);padding:0 2px}
.sp-st b{color:#fde68a}.sp-st .ok{color:#86efac}.sp-st .no{color:#fca5a5}
.sp-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.sp-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.sp-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.sp-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.sp-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
.sp-board{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:min(100%,clamp(176px,calc(100dvh - 430px),300px));aspect-ratio:1}
.sp-c{position:relative;display:grid;place-items:center;border-radius:12px;border:2px solid rgba(255,255,255,.18);background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04));font:900 22px var(--round);color:#e2e8f0;cursor:pointer;padding:0;min-width:0;min-height:0}
.sp-c:disabled{cursor:default}
.sp-c.can{border-color:rgba(253,230,138,.55)}
.sp-c .e{font-size:30px;line-height:1}
.sp-c.fl{background:#f8fafc;color:#0f172a;border-color:#fff;animation:spFl .25s ease}
.sp-c.fl.okp{border-color:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.5)}
.sp-c.fl.nop{border-color:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,.4)}
.sp-c.fl .l{position:absolute;left:5px;top:2px;font:800 10px var(--round);color:#475569}
.sp-c .mm{position:absolute;right:3px;bottom:1px;font-size:13px;opacity:.75;line-height:1}
.sp-c.seen{background:rgba(255,255,255,.06)}
@keyframes spFl{from{transform:rotateY(80deg)}to{transform:rotateY(0)}}
.sp-act{flex:none;display:grid;gap:6px}
.sp-row{display:flex;gap:6px}
.sp-row button{flex:1;min-width:0;height:48px;border-radius:13px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 14.5px var(--round);cursor:pointer;padding:0 6px;line-height:1.15}
.sp-row button.sub{background:rgba(255,255,255,.1);color:#e2e8f0;border:1px solid rgba(255,255,255,.2)}
.sp-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.sp-tut .sp-board{width:min(100%,230px)}
.sp-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.sp-tmsg b{color:#fde68a}
@media (max-height:650px){.sp-row button{height:46px}.sp-st{min-height:32px;font-size:12px}.sp-cd{height:30px;font-size:19px}}
.sv-coachfit .sp-board{width:min(100%,max(136px,calc(var(--sv-sh,360px) - 200px)));gap:4px}
.sv-coachfit .sp-c{font-size:15px;border-radius:9px;border-width:1.5px}
.sv-coachfit .sp-c.fl .l{font-size:8px;left:3px;top:1px}
.sv-coachfit .sp-c .mm{font-size:10px}
.sv-coachfit .sp-bl{gap:2px;padding:3px 6px}
.sv-coachfit .sp-mt{display:none}
.sv-coachfit .sp-st{min-height:24px;font-size:11.5px;line-height:1.25}
.sv-coachfit .sp-cd{height:24px;font-size:16px;border-radius:6px}
.sv-coachfit .sp-c .e{font-size:19px}
.sv-coachfit .sp-row button{height:44px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를"), eun = w => (hasFinal(w) ? "은" : "는");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  const pct = x => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  const CN = k => `${LET[k]}칸`;

  function actText(a) {
    if (!a || typeof a !== "object") return "";
    if (a.t === "open") return `${CN(a.k)} 열기`;
    if (a.t === "stop") return "멈추기";
    if (a.t === "first") return `${a.who + 1}번 자리가 먼저`;
    return "";
  }
  const WHY = { goal: "결승점(20번째 칸)에 먼저 닿았어요", fall: "상대가 벨트 뒤끝에서 떨어졌어요" };

  // 벨트 한 줄: 말 둘레 7칸 (뒤 2 · 말 · 앞 4 — 다음 칸이 빨간 테두리 = 지금 찾을 그림)
  function beltHtml(V, s, ctx, label, mine) {
    const pos = V.pos[s], bt = V.belt[s];
    let cells = "";
    for (let j = -2; j <= 4; j++) {
      const slot = pos + j, idx = slot - 1, ok = slot >= 1 && slot <= 20, c = ok ? bt[idx] : null;
      const cls = `sp-cd${j < 0 ? " past" : ""}${j === 1 ? " tg" : ""}${!ok ? " void" : ""}${slot === 20 ? " fin" : ""}${j === 0 && mine ? " me" : ""}`;
      cells += `<span class="${cls}" data-slot="${slot}">${c != null ? em(c) : ""}${j === 0 ? `<i class="pc">${mine ? "🔶" : "🔷"}</i>` : ""}</span>`;
    }
    const on = V.cur === s && !V.over;
    return `<div class="sp-bl${mine ? " me" : ""}${on ? " on" : ""}"><div class="sp-bh"><span class="nm">${esc(label)}</span><small>떨어지기까지 ${Math.max(0, pos - 1)}번 틀려도 돼요</small><b>${pos}/${GOAL}</b></div><div class="sp-cells">${cells}</div><div class="sp-mt"><i style="width:${Math.max(0, Math.min(100, (pos / GOAL) * 100))}%"></i></div></div>`;
  }

  const S = { pk: "", sent: 0, ctx: null, V: null, stage: null };
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return false;
    if (S.sent && Date.now() - S.sent < 500) return false;
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); return false; }
    c.sfx("pop"); return true;
  }

  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || !(me === 0 || me === 1) || ctx.mode === "local";
    const persp = watch ? 0 : me, op = 1 - persp, local = ctx.mode === "local";
    const can = !!ctx.canAct && !V.over && (V.needs || []).includes(me) && me >= 0;
    const lastI = V.log && V.log.length ? V.log[V.log.length - 1].i : 0;
    const pk = `${ctx.g}|${me}|${V.phase}|${lastI}`;
    if (pk !== S.pk) { S.pk = pk; S.sent = 0; }
    const nm = i => (!watch && i === me ? "나" : nameOf(ctx, i));
    const who = i => (!watch && i === me ? "내" : esc(nameOf(ctx, i)));
    const subj = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const lastOpen = G.lastOpen(V), showAll = (ctx.mode === "watch" && V.pic) || V.over, memo = !!(V.opt && V.opt.memo);
    const lastEv = V.log && V.log.length ? V.log[V.log.length - 1] : null;
    let st = "", actH = "";
    // 방금 일어난 일
    let lastTxt = "";
    if (lastEv && lastEv.k === "open") lastTxt = `${subj(lastEv.s)} ${CN(lastEv.p)}을 열었어요 → ${em(lastEv.pic)} ${lastEv.ok ? `<span class="ok">· 맞아요! ${lastEv.to}번째 칸</span>` : `<span class="no">· 틀려요 (목표 ${em(lastEv.tg)}) ${lastEv.to > 0 ? lastEv.to + "번째 칸으로" : "떨어졌어요"}</span>`}`;
    else if (lastEv && lastEv.k === "stop") lastTxt = `${subj(lastEv.s)} 멈췄어요`;
    else if (lastEv && lastEv.k === "first") lastTxt = `${subj(lastEv.s)} ${who(lastEv.who)} 쪽이 먼저 열기로 했어요`;
    const board = (pickable) => {
      let h = "";
      for (let k = 0; k < NP; k++) {
        const isLast = lastEv && lastEv.k === "open" && lastEv.p === k;
        const pic = V.known[k] >= 0 ? V.known[k] : -1, full = showAll && V.pic ? V.pic[k] : -1;
        let cls = "sp-c" + (pickable ? " can" : ""), inner = `<span class="l0">${LET[k]}</span>`;
        if (isLast) { cls += ` fl ${lastEv.ok ? "okp" : "nop"}`; inner = `<span class="l">${LET[k]}</span><span class="e">${em(lastEv.pic)}</span>`; }
        else if (memo && pic >= 0) { cls += " seen"; inner += `<span class="mm">${em(pic)}</span>`; }
        else if (showAll && full >= 0) { cls += " seen"; inner += `<span class="mm">${em(full)}</span>`; }
        h += `<button type="button" class="${cls}" data-k="${k}"${pickable ? "" : " disabled"} aria-label="${LET[k]}칸${isLast ? " " + em(lastEv.pic) : ""}">${inner}</button>`;
      }
      return `<div class="sp-board">${h}</div>`;
    };
    let pickable = false;
    if (V.over) {
      const R = V.res || {}, w = R.w, ok = !watch && w === me;
      st = `<div class="sp-res ${watch || ok ? "ok" : "no"}">${watch ? `🏆 ${esc(nameOf(ctx, w))} 승리` : ok ? "🏆 내가 이겼어요!" : `💥 ${esc(nameOf(ctx, w))} 승리 — 졌어요`}<small>${WHY[R.why] || ""} · 연 칸 ${R.opens}번 · 모든 그림 공개</small></div>`;
    } else if (V.phase === "first") {
      if (can) {
        st = `<span>🎲 <b>가넷이 많은 쪽</b>이에요 — 누가 먼저 열지 정해요<br>먼저 여는 쪽은 아무것도 모르고 열어야 해서 한 칸 손해예요</span>`;
        actH = `<div class="sp-row"><button type="button" class="sub" data-first="${me}">내가 먼저</button><button type="button" data-first="${1 - me}">${esc(nameOf(ctx, 1 - me))}${iga(nameOf(ctx, 1 - me))} 먼저</button></div>`;
      } else st = `<span>🎲 ${esc(nameOf(ctx, V.rich))} (가넷 많은 쪽)이 누가 먼저 열지 정하는 중…</span>`;
    } else {
      const myTurn = can && V.cur === me;
      pickable = myTurn;
      if (myTurn) {
        st = `<span>${lastTxt ? lastTxt + "<br>" : ""}<b>내 차례</b> — 목표 ${em(V.tgt[me])} 가 있을 칸을 눌러요${V.can ? ` · 이미 맞혔어요, 한 번 더 열거나 멈춰요` : ""}</span>`;
        if (V.can) actH = `<div class="sp-row"><button type="button" class="sub" data-a="stop">✋ 멈추기</button></div>`;
      } else {
        const cur = V.cur;
        st = `<span>${lastTxt ? lastTxt + "<br>" : ""}${cur >= 0 ? `${esc(nm(cur))} 차례 — 목표 ${em(V.tgt[cur])} 를 찾는 중…` : ""}</span>`;
      }
    }
    stage.innerHTML = `${beltHtml(V, op, ctx, nameOf(ctx, op), false)}${beltHtml(V, persp, ctx, watch ? nameOf(ctx, persp) : "나", !watch)}<div class="sp-st">${st}</div><div class="sp-wrap">${board(pickable)}</div>${actH ? `<div class="sp-act">${actH}</div>` : ""}`;
    void local;
    stage.onclick = e => {
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.over) return;
      const t = e.target.closest("[data-k],[data-a],[data-first]"); if (!t || t.disabled) return;
      if (t.dataset.first != null) { send({ t: "first", who: +t.dataset.first }); return; }
      if (t.dataset.a === "stop") { send({ t: "stop" }); return; }
      if (t.dataset.k != null) send({ t: "open", k: +t.dataset.k });
    };
  }

  // ── 선생님 (보이는 것만 — 연 칸의 그림 · 벨트 · 말 위치) ──
  function coachText(V, me, since, names, full) {
    void since;
    if (!(me === 0 || me === 1)) me = V.needs && V.needs.length ? V.needs[0] : 0;
    const op = 1 - me, raw = i => (i === me ? "나" : String((Array.isArray(names) && names[i]) || "상대")), nmx = i => esc(raw(i));
    if (V.over) { const w = V.res && V.res.w; return { opp: `${nmx(op)} ${V.pos[op]}/${GOAL}칸`, mine: `내 말 ${V.pos[me]}/${GOAL}칸`, rec: "끝났어요.", why: `${w === me ? "내가" : nmx(op) + iga(raw(op))} 이겼어요 — ${WHY[V.res.why] || ""}.` }; }
    const A = G.analyze(V, me), Ao = G.analyze(V, op), lo = G.lastOpen(V);
    const oppKnown = Ao.loc >= 0;
    const opp = `${nmx(op)} 말 ${V.pos[op]}/${GOAL}칸 · 목표 ${em(V.tgt[op])} ${oppKnown ? `— 이미 ${CN(Ao.loc)}에서 나왔어요 (기억하면 바로 열어요)` : "— 아직 못 본 그림이에요"}${lo ? ` · 마지막으로 ${lo.s === me ? "내가" : nmx(lo.s) + iga(raw(lo.s))} 연 칸 ${CN(lo.p)} ${em(lo.pic)}` : ""}`;
    const spare = Math.max(0, V.pos[me] - 1);
    const mine = `내 말 ${V.pos[me]}/${GOAL}칸 (결승까지 ${GOAL - V.pos[me]}칸 · ${spare}번 더 틀려도 안 떨어져요) · 목표 ${em(V.tgt[me])} ${A.loc >= 0 ? "— 자리를 이미 봤어요" : `— 아직 못 봤어요 (못 연 ${A.unkN}칸 중 하나)`}`;
    if (!(V.needs || []).includes(me)) {
      return { opp, mine, rec: `${nmx(op)} 차례를 기다려요.`, why: `상대가 여는 칸의 그림도 같이 보여요 — 내 목표 ${em(V.tgt[me])}${eul(em(V.tgt[me]))} 만나면 칸 이름을 기억해 두세요.` };
    }
    const a = G.ai(V, me, "hard", () => 0.5);
    let rec = "", why = "";
    if (V.phase === "first") {
      rec = a && a.who !== me ? "상대가 먼저 열게 해요" : "내가 먼저 열어요";
      why = "먼저 여는 쪽은 아무 그림도 모르고 한 칸을 열어야 해서 한 칸 손해 — 뒤에 여는 쪽이 새로 나온 그림을 보고 시작해요.";
    } else if (a && a.t === "open") {
      const U = A.unkN, known = A.loc >= 0 && a.k === A.loc;
      const fo = lo && lo.s !== me && a.k === lo.p && V.known[lo.p] >= 0;
      if (known) { rec = full ? `${CN(a.k)} 열기` : "목표 그림 자리를 봤어요 — 그 칸을 열어요"; why = `목표 ${em(V.tgt[me])}${eun(em(V.tgt[me]))} ${CN(A.loc)}에서 봤어요 → 맞힐 확률 100%${A.nextLoc[0] >= 0 ? ` · 다음 목표도 ${CN(A.nextLoc[0])}에서 봤어요` : ""}.`; }
      else if (fo) { rec = full ? `${CN(a.k)} 열기 (상대가 방금 연 칸)` : "새 정보를 안 주는 칸을 열어요"; why = `못 본 ${U}칸 중 맞힐 확률은 ${pct(1 / Math.max(1, U))} 뿐인데 새 그림이 상대 목표 쪽이 되면 위험해요 — 이미 나온 칸을 따라 열면 한 칸 잃지만 아무 정보도 안 나가요.`; }
      else { rec = full ? `${CN(a.k)} 열기` : `아직 안 연 ${U}칸 중 하나를 열어요`; const e = A.ex; why = `맞힐 확률 ${pct(e.pS)} (못 본 ${U}칸 중 하나) · 틀려도 새 그림이 둘 다에게 보여서 이후 찾기가 쉬워져요${V.pos[op] >= 14 ? " — 상대가 결승 가까이라 위험도 커요" : ""}.`; }
    } else if (a && a.t === "stop") {
      const U = A.unkN; rec = "멈추기"; why = `다음 목표 ${em(V.tgt[me])}의 자리를 아직 몰라요 — 열면 맞힐 확률이 ${pct(1 / Math.max(1, U))} 뿐이라, 멈추고 상대가 열게 해요 (상대가 여는 칸이 내 목표일 수도 있어요).`;
    } else { rec = "—"; why = ""; }
    return { opp, mine, rec, why };
  }
  let HINT = { key: "", open: false, full: "" };
  function coach(V, me, since, names) {
    const key = `${V.pub}|${me}`;
    if (HINT.key !== key) HINT = { key, open: false, full: "" };
    const c = coachText(V, me, since, names, HINT.open);
    if (!HINT.open && (V.needs || []).includes(me) && !V.over && V.phase !== "first") {
      const f = coachText(V, me, since, names, true);
      if (f.rec !== c.rec) {
        HINT.full = `<b>💡 ${f.rec}</b>`;
        c.why = `${c.why || ""} <button type="button" class="sp-hbtn" data-sphint style="margin:2px 4px 2px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.12);color:#fde68a;font:800 12.5px var(--round);cursor:pointer">💡 한 번 더 — 칸 알려 주기</button>`;
      }
    }
    return c;
  }
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-sphint]");
    if (!b) return;
    e.preventDefault(); HINT.open = true;
    const sp = document.createElement("span"); sp.innerHTML = HINT.full; b.replaceWith(sp);
  }, true);

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    if (!Vb || !myA || !bestA) return { sev: 0, why: "", my, best };
    const same = JSON.stringify(myA) === JSON.stringify(bestA);
    if (same) return { sev: 0, why: "고급 AI와 같은 수", my, best };
    const A = G.analyze(Vb, seat), U = Math.max(1, A.unkN), tg = em(Vb.tgt[seat]);
    if (myA.t === "first") return { sev: 25, why: "먼저 여는 쪽은 아무 그림도 모르고 한 칸을 열어야 해서 한 칸 손해예요", my, best };
    if (bestA.t === "open" && A.loc >= 0 && bestA.k === A.loc && !(myA.t === "open" && myA.k === A.loc)) {
      if (myA.t === "stop") return { sev: 78, why: `목표 ${tg}의 자리(${CN(A.loc)})를 이미 봤는데 멈췄어요 — 열면 확률 100% 로 한 칸 전진`, my, best };
      return { sev: 88, why: `목표 ${tg}의 자리(${CN(A.loc)})를 이미 봤는데 다른 칸을 열었어요 — 맞힐 확률 ${pct(V1(Vb, myA, seat))} 대 100%`, my, best };
    }
    if (myA.t === "open" && bestA.t === "stop") return { sev: Math.min(70, 25 + Math.round((1 - 1 / U) * 40)), why: `다음 목표 ${tg}의 자리를 몰라서 맞힐 확률 ${pct(1 / U)} 뿐 — 열었다가 틀리면 한 칸 후진이에요`, my, best };
    if (myA.t === "stop" && bestA.t === "open") return { sev: 20, why: `고급 AI는 ${actText(bestA)} — 멈추는 것도 나쁘지 않지만 정보를 줄 칸이 있었어요`, my, best };
    if (myA.t === "open" && bestA.t === "open") {
      const pm = V1(Vb, myA, seat), pb = V1(Vb, bestA, seat);
      if (pm < pb) return { sev: Math.round(25 + 40 * (pb - pm)), why: `내 칸 맞힐 확률 ${pct(pm)} · 고급 AI 칸 ${pct(pb)} — 이미 나온 그림의 칸은 맞힐 수 없어요`, my, best };
      return { sev: 18, why: `맞힐 확률은 비슷해요(내 칸 ${pct(pm)} · 고급 AI ${pct(pb)}) — 새 그림이 상대에게 주는 정보 차이만 있어요`, my, best };
    }
    return { sev: 5, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
  }
  function V1(V, a, seat) { if (a.t !== "open") return 0; const p = V.known[a.k]; return p >= 0 ? (p === V.tgt[seat] ? 1 : 0) : 1 / Math.max(1, V.known.filter(x => x < 0).length); }

  function result(V, me) {
    const R = V.res || {}, nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    const head = R.w == null ? "" : me >= 0 && R.w === me ? "🏆 내가 이겼어요" : `🏆 ${nm(R.w)} 승리`;
    return `${head} — ${WHY[R.why] || ""}<br>연 칸 ${R.opens}번 · 말 ${nm(0)} ${V.pos[0]}칸 : ${nm(1)} ${V.pos[1]}칸`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const bV = { pos: [12, 12], belt: [[3, 7, 1, 9, 0, 2, 5, 8, 11, 4, 6, 10, 13, 14, 15, 3, 7, 1, 9, 0], [5, 2, 8, 0, 3, 7, 1, 9, 4, 6, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3]], cur: -1, over: false };
    const boardOf = (pics, sel) => `<div class="sp-board">${Array.from({ length: NP }, (_, k) => `<button type="button" class="sp-c${sel && sel.has(k) ? " fl" + (pics[k] === 0 ? " okp" : " nop") : ""}" data-k="${k}">${sel && sel.has(k) ? `<span class="l">${LET[k]}</span><span class="e">${em(pics[k])}</span>` : LET[k]}</button>`).join("")}</div>`;
    const tb = x => `<div class="sp-tut">${x}</div>`;
    const LAY = [8, 3, 12, 0, 5, 9, 14, 1, 6, 11, 2, 15, 7, 13, 4, 10];       // 칸 → 그림 (직접 해 보기용, 🍎 = 0 이 D칸)
    return [
      { tag: "STEP 1 · 목표", title: "결승점에 먼저 도착해요", body: "내 앞 <b>컨베이어 벨트</b> 위의 말을 <b>20번째 칸 🏁</b>까지 먼저 보내면 승리! 반대로 벨트 뒤끝으로 밀려 <b>떨어지면 패배</b>예요.",
        boardHtml: tb(beltHtml(bV, 0, {}, "내 벨트", true)), ms: 5200 },
      { tag: "STEP 2 · 준비물", title: "그림판 16칸 · 그림 카드 벨트", body: "그림판은 앞면에 <b>알파벳 A~P</b>, 뒷면에 <b>서로 다른 그림 16장</b>. 벨트의 카드는 그 16개 그림을 <b>3묶음 섞어</b> 채운 것이고, 두 사람의 벨트는 서로 보여요. 시즌 4는 둘 다 <b>12번째 칸</b>에서 출발해요.",
        boardHtml: tb(boardOf(LAY)), ms: 6000 },
      { tag: "STEP 3 · 진행", title: "말 앞 카드와 같은 그림을 찾아요", body: "내 차례에 <b>말 바로 앞 카드(빨간 테두리)</b>와 같은 그림이 있을 칸을 알파벳으로 골라 <b>한 칸</b> 열어요. 열린 그림은 <b>두 사람 모두</b> 봐요. 맞으면 <b>한 칸 전진</b>하고 한 번 더 열거나 멈출 수 있고, 틀리면 벨트가 <b>한 칸 후진</b>하고 상대 차례예요.",
        boardHtml: tb(beltHtml(bV, 1, {}, "예시", false)), ms: 7000 },
      { tag: "STEP 4 · 직접", title: "목표 그림 🍎 을 찾아 보세요", body: "빨간 테두리 카드가 <b>🍎</b> 예요. 칸을 눌러 열어 보면서 🍎 가 있는 칸을 찾아요. 열었던 그림은 다시 덮이니 <b>어디였는지 기억</b>하세요.",
        interactive: { hint: "👆 🍎 가 있는 칸", doneText: "✅ 찾았어요! 한 칸 전진" },
        render(stage, ctrl) {
          let done = false, msg = "한 칸씩 눌러 열어요", open = new Set(), tries = 0;
          const draw = () => { stage.innerHTML = `<div class="sp-tut">${boardOf(LAY, open)}<div class="sp-tmsg">${msg}</div></div>`; };
          stage.onclick = e => {
            if (done) return; const t = e.target.closest("[data-k]"); if (!t) return;
            const k = +t.dataset.k; open = new Set([k]); tries++;
            if (LAY[k] === 0) { done = true; msg = `🎉 ${LET[k]}칸에 🍎 가 있었어요! ${tries}번 만에 찾았어요 — 말이 한 칸 전진`; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
            msg = `${LET[k]}칸은 ${em(LAY[k])} — 🍎 가 아니에요. 실제 게임이면 벨트가 한 칸 후진해요. 다른 칸을 열어 봐요`; ctrl.sfx("tap"); draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "먼저 20번째 칸이면 승리", body: "<b>결승점(20번째 칸)</b>에 먼저 닿으면 승리. 같은 그림을 못 찾아 계속 후진하다 벨트에서 <b>떨어지면 패배</b>. 상대가 연 칸의 그림도 보이니 잘 기억해 두면 내 목표를 빨리 찾아요.",
        boardHtml: tb(beltHtml({ pos: [19, 5], belt: bV.belt, cur: -1, over: false }, 0, {}, "내 벨트", true)), ms: 5600 },
      { tag: "STEP 6 · 특수 규칙", title: "멈추기 · 따라 열기", body: "맞힌 뒤 <b>한 번 더</b> 열지 <b>멈출지</b> 고를 수 있어요. 모르는 칸을 열면 새 그림이 상대에게도 보이니, 상대가 방금 연 칸을 <b>따라 열면</b> 새 정보를 주지 않아요 (그래도 틀리면 한 칸 후진). 시즌 1·2 판은 가넷 많은 쪽이 <b>10번째</b>, 적은 쪽이 <b>8번째</b>에서 출발해요.",
        boardHtml: tb(boardOf(LAY, new Set([3, 12]))), ms: 7000 },
    ];
  }

  function qa(V, me, rnd) { return G.ai(V, me, "normal", rnd); }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-samepic"] = {
    name: "같은 그림 찾기", emoji: "🖼️", short: "말 앞 카드와 같은 그림을 그림판에서 찾아 결승점으로 — 틀리면 벨트가 밀려요", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [
      { k: "ver", label: "출발 (방송 시즌)", items: [[4, "시즌 4 — 둘 다 12번째 · 동전"], [1, "시즌 1·2 — 10번째 vs 8번째"]], def: 4 },
      { k: "memo", label: "열었던 그림 보이기", items: [[0, "끔 (방송)"], [1, "켬 (연습)"]], def: 0 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 내 벨트 위의 말을 <b>결승점(20번째 칸)</b>까지 상대보다 먼저 보내요 — 벨트 뒤끝으로 밀려 떨어지면 패배 (1:1 데스매치)",
      "준비물: 그림판 <b>16칸</b> (앞면 알파벳 A~P · 뒷면 서로 다른 그림 16장) · 각자 <b>20칸 컨베이어 벨트</b> (그림 16개를 3묶음 섞어 채운 카드, 서로 보임) · 시즌 4는 둘 다 <b>12번째 칸</b>에서 출발, 선후공은 동전",
      "진행: 내 차례에 <b>말 바로 앞 카드와 같은 그림</b>이 있을 그림판 칸을 알파벳으로 골라 한 칸 열어요 (열린 그림은 둘 다 봄) — 맞으면 <b>한 칸 전진</b>하고 한 번 더 열거나 멈출 수 있어요 · 틀리면 벨트가 <b>한 칸 후진</b>하고 맨 앞에 새 카드가 채워지고 상대 차례",
      "승패: 결승점에 먼저 도착하면 승 · 같은 그림을 못 찾아 벨트에서 떨어지면 패",
      "특수: 상대가 연 칸만 따라 열면 새 정보를 주지 않아요 (방송 전략) · 시즌 1·2 판은 가넷 많은 쪽 <b>10번째</b>, 적은 쪽 <b>8번째</b>에서 출발하고 많은 쪽이 선후공을 정해요 · ※ 같은 숫자 찾기(수식 만들기)와는 다른 게임이에요",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `말 ${V.pos[0]} : ${V.pos[1]} · 목표 ${em(V.tgt[0])} / ${em(V.tgt[1])}`),
    chip: (V, i) => ({ t: `${V.pos[i]}/${GOAL}`, on: !V.over && (V.needs || []).includes(i), out: !!(V.over && V.res && V.res.w !== i) }),
    render, coach, coachFull: (V, me, since, names) => coachText(V, me, since, names, true), result, tutorial, review, actText, qa,
  };
})();

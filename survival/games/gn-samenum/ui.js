/* 베니 서바이벌 · 같은 숫자 찾기 — 화면 (4×4 판 · 5초 암기 · 타깃넘버 · 버저 · 호명 3칸 · 공개 · 점수판 · 1분 규칙)
   시계는 UI 만 가져요: 버저 시각(ms)은 타깃이 공개된 순간부터 재서 행동에 실어 보내고({t:"buzz", ms}), 5초 제한이 끝나면 {t:"timeout"} 을 보내요. */
(() => {
  "use strict";
  const G = window.SVCores["gn-samenum"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NO = G.NO_BUZZ, LOCK = 650, BUZZ_WIN = 15000;
  const CSS = `
.sn-top{display:grid;grid-template-columns:70px 1fr 70px;gap:6px;flex:none}
.sn-sc{border-radius:14px;background:rgba(0,0,0,.32);border:1.5px solid rgba(255,255,255,.14);display:grid;place-items:center;align-content:center;padding:3px 2px;min-width:0;height:58px}
.sn-sc small{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sn-sc b{font:900 25px/1.05 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.sn-sc.me{border-color:#86efac}
.sn-sc.on{box-shadow:0 0 0 2px var(--gold)}
.sn-tg{border-radius:14px;background:linear-gradient(135deg,rgba(225,29,72,.38),rgba(0,0,0,.38));border:1.5px solid rgba(251,113,133,.65);display:grid;place-items:center;align-content:center;padding:3px;text-align:center;height:58px;min-width:0}
.sn-tg small{font:700 10.5px var(--round);color:#fecdd3;white-space:nowrap}
.sn-tg b{font:900 34px/1.05 var(--round);color:#fff;font-variant-numeric:tabular-nums}
.sn-tg.rev b{animation:snRev .28s ease var(--d,0ms) both}
.sn-tg.rev small{animation:snRev .2s ease var(--d,0ms) both}
.sn-st{flex:none;text-align:center;font:700 13px/1.35 var(--round);color:var(--ink);min-height:36px;display:grid;place-items:center;align-content:center}
.sn-st b{color:#fde68a}
.sn-st .ok{color:#86efac}.sn-st .no{color:#fca5a5}
.sn-board{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:min(100%,300px);width:min(100%,clamp(196px,calc(100dvh - 395px),300px));aspect-ratio:1;margin:0 auto;flex:none}
.sn-c{position:relative;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:linear-gradient(165deg,rgba(255,255,255,.1),rgba(0,0,0,.34));color:#fff;display:grid;place-items:center;padding:0;min-width:44px;min-height:44px;font:inherit;cursor:default;touch-action:manipulation}
.sn-c .l{font:900 24px/1 var(--round);letter-spacing:.5px}
.sn-c .v{display:none;font:900 22px/1 var(--round);font-variant-numeric:tabular-nums}
.sn-c .v.op{color:#fbbf24}
.sn-c .v.sq{font-size:13px}
.sn-c.pick{cursor:pointer;border-color:rgba(253,230,138,.45)}
.sn-c.pick:active{transform:scale(.95)}
.sn-c.look .v,.sn-c.seen .v,.sn-c.now .v,.sn-c.peek .v{display:block}
.sn-c.look .l,.sn-c.seen .l,.sn-c.now .l,.sn-c.peek .l{position:absolute;left:5px;top:3px;font-size:11px;color:var(--soft);font-weight:800}
.sn-c.seen .v{opacity:.5}
.sn-c.seen{background:linear-gradient(165deg,rgba(255,255,255,.05),rgba(0,0,0,.28));border-style:dashed}
.sn-c.peek .v{opacity:.3;font-size:16px}
.sn-c.look{border-color:rgba(251,113,133,.55)}
.sn-c.now{border-color:#fde68a;background:linear-gradient(165deg,rgba(245,179,1,.28),rgba(0,0,0,.34));box-shadow:0 0 0 2px #fde68a}
.sn-c.now .v{font-size:27px}.sn-c.now .v.sq{font-size:15px}
.sn-c.now.flip{animation:snFlip .5s ease both}
.sn-c.win{border-color:#4ade80;box-shadow:0 0 0 2px #4ade80,0 0 18px rgba(74,222,128,.5)}
.sn-c.lose{border-color:#f87171;box-shadow:0 0 0 2px #f87171}
.sn-c.sel{border-color:#fde68a;background:rgba(253,230,138,.2);box-shadow:0 0 0 2px #fde68a}
.sn-c.sel::after{content:attr(data-n);position:absolute;right:4px;top:2px;font:900 12px var(--round);color:#111;background:#fde68a;border-radius:99px;min-width:17px;text-align:center;line-height:17px}
.sn-c.step{border-color:#fde68a}
.sn-act{display:flex;gap:8px;margin-top:auto;flex:none;align-items:stretch}
.sn-act .sn-buzz{flex:1;min-width:0}
.sn-act .sn-pass{flex:none;width:92px;padding:4px;line-height:1.2}
.sn-act.one .sn-pass{width:auto;flex:1}
.sn-act.loc .sn-pass{width:74px}
.sn-buzz{height:66px;border-radius:18px;border:0;background:linear-gradient(180deg,#fb7185,#be123c);color:#fff;font:900 22px var(--round);box-shadow:0 6px 0 #881337,0 10px 18px rgba(0,0,0,.4);touch-action:manipulation;cursor:pointer;user-select:none;-webkit-user-select:none}
.sn-buzz:active,.sn-buzz.hit{transform:translateY(4px);box-shadow:0 2px 0 #881337}
.sn-buzz.hit{animation:snFlash .3s ease}
.sn-buzz.lock{opacity:.35;animation:snUnlock .2s ease var(--d,0ms) both}
.sn-buzz.nolock{animation:none}
.sn-act.loc .sn-buzz{font-size:16px;line-height:1.15;padding:0 4px}
.sn-buzz.b2{background:linear-gradient(180deg,#60a5fa,#1d4ed8);box-shadow:0 6px 0 #1e3a8a,0 10px 18px rgba(0,0,0,.4)}
.sn-buzz.b2:active,.sn-buzz.b2.hit{box-shadow:0 2px 0 #1e3a8a}
.sn-pass{border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:var(--ink);border-radius:12px;font:800 13px var(--round);padding:8px 10px;cursor:pointer;min-height:40px}
.sn-bar{height:7px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}
.sn-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#fde68a,#fb7185);transform-origin:left}
.sn-steps{display:flex;gap:5px;justify-content:center;flex:none}
.sn-steps span{font:800 12px var(--round);padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);color:var(--soft)}
.sn-steps span.on{border-color:#fde68a;color:#fde68a}
.sn-steps span.done{background:rgba(253,230,138,.18);color:#fff}
.sn-res{flex:none;text-align:center;padding:6px 8px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);font:800 15px/1.35 var(--round)}
.sn-res.ok{border-color:#4ade80;color:#bbf7d0;background:rgba(34,197,94,.14)}
.sn-res.no{border-color:#f87171;color:#fecaca;background:rgba(248,113,113,.1)}
.sn-res small{display:block;font:600 12px var(--round);color:var(--soft)}
.sn-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.sn-tut .sn-board{width:min(100%,250px)}
.sn-tut .sn-tg{width:150px}
.sn-tut .sn-buzz{width:170px;height:50px;font-size:17px}
@keyframes snRev{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes snFlip{from{transform:rotateY(90deg)}to{transform:none}}
@keyframes snFlash{0%{filter:brightness(2.2)}100%{filter:none}}
@keyframes snUnlock{from{opacity:.35}to{opacity:1}}
@media (max-height:700px){.sn-tg b{font-size:30px}.sn-sc,.sn-tg{height:52px}.sn-buzz{height:58px}.sn-st{min-height:34px;font-size:12.5px}.sn-res{padding:4px 8px;font-size:14px}}
@media (min-height:780px){.sn-st{min-height:70px}}
.sv-coachfit .sn-board{width:min(100%,calc(var(--sv-sh,360px) - 160px))}
.sv-coachfit .sn-buzz{height:48px;font-size:19px}
.sv-coachfit .sn-sc,.sv-coachfit .sn-tg{height:46px}
.sv-coachfit .sn-tg b{font-size:26px}
.sv-coachfit .sn-st{min-height:0;font-size:11.5px;line-height:1.3}
.sv-coachfit .sn-c{min-width:0;min-height:0}
.sv-coachfit .sn-c .l{font-size:19px}
.sv-coachfit .sn-c .v{font-size:17px}
.sv-coachfit .sn-c.look .l,.sv-coachfit .sn-c.seen .l,.sv-coachfit .sn-c.now .l,.sv-coachfit .sn-c.peek .l{font-size:9px;left:3px;top:1px}
.sv-coachfit .sn-board{gap:4px}
.sv-coachfit .sn-res{padding:3px 6px;font-size:12.5px}.sv-coachfit .sn-res small{font-size:10.5px}
.sv-coachfit .sn-pass{min-height:0;padding:3px 6px;font-size:12px}
.sv-coachfit .sn-act.loc .sn-buzz{font-size:13px}
@media (max-width:400px){.sn-top{grid-template-columns:62px 1fr 62px}.sn-sc b{font-size:22px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는");
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const secs = ms => (ms >= NO ? "안 누름" : (ms / 1000).toFixed(1) + "초");
  const vHtml = v => (typeof v === "number" ? `<span class="v">${v}</span>` : v === "√" ? `<span class="v op sq">√+√</span>` : `<span class="v op">${esc(v)}</span>`);

  // ── 이 화면의 시계 · 선택 (한 판 안에서 단계가 바뀌면 새로 시작) ──
  const S = { pk: "", armed: "", stage: null, ctx: null, V: null, tm: 0, iv: 0, t0: 0, dl: 0, sel: [], asg: {}, sent: false, lockUntil: 0 };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected) { clearInterval(S.iv); S.iv = 0; return; }
    const bar = st.querySelector("[data-bar]");
    if (!bar || !S.dl) return;
    const left = Math.max(0, S.dl - nowMs()), dur = +bar.dataset.bar || 1;
    bar.firstElementChild.style.transform = `scaleX(${Math.min(1, left / dur)})`;
    const cd = st.querySelector("[data-cd]"); if (cd) cd.textContent = String(Math.ceil(left / 1000));
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = nowMs() + ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 80);
  }
  function act(a) { const c = S.ctx; return c && c.canAct ? c.act(a) : { ok: false }; }
  const whenAct = (fn, tries) => { const c = S.ctx; if (c && c.canAct) return fn(); if ((tries == null ? 12 : tries) > 0) { const pk = S.pk; setTimeout(() => { if (S.pk === pk) whenAct(fn, (tries == null ? 12 : tries) - 1); }, 250); } };
  function doReady() {
    for (let n = 0; n < 2; n++) {            // 한 기기(두 사람)에선 두 자리 모두 준비
      const c = S.ctx, V = S.V; if (!c || !c.canAct || !V || V.phase !== "look") return;
      c.sfx("tap"); const r = c.act({ t: "ready" });
      if (!r || !r.ok || c.mode !== "local") return;
    }
  }
  // 한 기기(두 사람): 한 사람이 누르면 그 시각, 다른 사람은 '못 누름' — 차례인 자리부터 한 행동씩 보냄
  function flushLocal() {
    for (let n = 0; n < 2; n++) {
      const c = S.ctx, V = S.V; if (!c || !c.canAct || !V || V.phase !== "buzz") return;
      const s = c.me, ms = S.asg[s]; if (ms == null) return;
      S.asg[s] = null; const r = c.act({ t: "buzz", ms }); if (!r || !r.ok) return;
    }
  }
  const humans = ctx => [0, 1].filter(i => ctx.seats && ctx.seats[i] && ctx.seats[i].kind !== "ai" && !ctx.seats[i].sub);
  function pressBuzz(seat) {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "buzz" || S.sent) return;
    const t = nowMs();
    if (t < S.lockUntil) return;                                  // 타깃이 공개되기 전에 누른 건 그냥 무시
    const ms = Math.max(0, Math.round(t - S.t0));
    try { if (navigator.vibrate) navigator.vibrate(28); } catch (e) {}
    if (c.mode === "local") {
      if (!c.canAct) return;
      const hs = humans(c), other = hs.find(i => i !== seat);
      if (S.asg[seat] != null || (V.needs && !V.needs.includes(seat))) return;
      S.sent = true; S.asg[seat] = ms; if (other != null && V.needs.includes(other)) S.asg[other] = NO;
      clearTimers(); flushLocal(); return;
    }
    if (!c.canAct) return;
    S.sent = true; clearTimers(); c.act({ t: "buzz", ms });
  }
  function passBuzz() {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "buzz" || S.sent || !c.canAct) return;
    S.sent = true; clearTimers();
    if (c.mode === "local") { for (const i of humans(c)) if (V.needs.includes(i) && S.asg[i] == null) S.asg[i] = NO; flushLocal(); return; }
    c.act({ t: "buzz", ms: NO });
  }
  function pickCell(i) {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "call" || !c.canAct) return;
    const k = S.sel.indexOf(i);
    if (k >= 0) { S.sel.splice(k, 1); c.sfx("tap"); render(S.stage, V, c); return; }
    if (S.sel.length >= 3) return;
    S.sel.push(i); c.sfx("tap");
    if (S.sel.length === 3) { const call = S.sel.slice(); S.sel = []; clearTimers(); c.sfx("pop"); c.act({ t: "call", c: call }); return; }
    render(S.stage, V, c);
  }

  // ── 그리기 ──
  function boardHtml(V, ctx, o) {
    const showAll = o.look, last = V.phase === "show" && V.last && V.last.c ? V.last.c : [];
    return `<div class="sn-board">${V.back.map((v, i) => {
      const vis = V.rev[i] || showAll;
      let cls = "sn-c", val = "";
      const k = last.indexOf(i);
      if (showAll) { cls += " look"; val = vHtml(v); }
      else if (k >= 0) { cls += ` now${o.anim ? " flip" : ""}`; if (V.last.hit) cls += " win"; else if (!V.last.valid) cls += " lose"; val = vHtml(v); }
      else if (vis && V.cfg.aid) { cls += " seen"; val = vHtml(v); }
      else if (o.peek && v !== null && v !== undefined) { cls += " peek"; val = vHtml(v); }
      const si = o.sel.indexOf(i);
      if (si >= 0) cls += " sel";
      if (o.pick) cls += " pick";
      if (o.pick && si < 0 && o.sel.length < 3) cls += " step";
      return `<button type="button" class="${cls}" data-c="${i}"${si >= 0 ? ` data-n="${si + 1}"` : ""} ${o.pick ? "" : "tabindex=\"-1\""} aria-label="${G.LET[i]} 칸">${`<span class="l">${G.LET[i]}</span>`}${val}</button>`;
    }).join("")}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, local = ctx.mode === "local", watch = ctx.mode === "watch" || me < 0, peek = ctx.mode === "watch";
    const pk = `${ctx.g}|${V.round}|${V.phase}|${V.calls}`;
    if (pk !== S.pk) {
      S.pk = pk; clearTimers(); S.armed = ""; S.sel = []; S.asg = {}; S.sent = false; S.dl = 0;
      const t = nowMs(), lock = ctx.fast || watch ? 0 : LOCK;
      S.t0 = t + lock; S.lockUntil = t + lock;
    }
    const L = !watch && !local ? me : 0, R = 1 - L, cfg = V.cfg || {};
    const label = i => (!watch && !local && i === me ? "나" : esc(nameOf(ctx, i)));
    const subj = i => (!watch && !local && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const turn = i => (V.phase === "call" ? V.caller === i : V.phase === "buzz" ? V.needs.includes(i) : false);
    const scoreBox = i => `<div class="sn-sc${!watch && !local && i === me ? " me" : ""}${turn(i) && !V.over ? " on" : ""}"><small>${label(i)}</small><b>${V.score[i]}</b></div>`;
    const lookNow = V.phase === "look" && (watch || local || !V.rdy[me]);
    const canAct = !!ctx.canAct;
    const rem = Math.max(0, S.lockUntil - nowMs()), anim = nowMs() - (S.lockUntil - (ctx.fast || watch ? 0 : LOCK)) < 700;
    const lkc = rem > 0 ? " lock" : " nolock", lks = rem > 0 ? ` style="--d:${Math.round(rem)}ms"` : "";
    let top, st = "", actH = "";
    // 가운데: 타깃넘버 (look 에선 남은 시간)
    if (V.phase === "look") top = `<div class="sn-tg"><small>${lookNow ? "남은 시간" : "다 외웠어요"}</small><b data-cd>${lookNow ? (cfg.look || 5) : "✔"}</b></div>`;
    else top = `<div class="sn-tg${V.phase === "buzz" && rem > 0 && !watch ? " rev" : ""}"${lks}><small>타깃넘버 · ${V.round}라운드</small><b>${V.target}</b></div>`;
    const sel = V.phase === "call" && canAct && V.caller === me ? S.sel : [];
    let sp = null;                                     // 호명 단계: 숫자 → 기호 → 숫자 안내
    if (V.phase === "look") {
      if (lookNow) { st = canAct ? `<span>👀 모든 뒷면이에요 — <b>기호 위치와 숫자</b>를 외워요!</span>` : `<span>👀 판을 보여 주는 중이에요</span>`; if (canAct) actH = `<div class="sn-bar" data-bar="${(ctx.fast ? 350 : (cfg.look || 5) * 1000)}"><i></i></div><div class="sn-act one"><button type="button" class="sn-pass" data-a="ready">다 외웠어요 (준비)</button></div>`; }
      else st = `<span>가려졌어요 — 상대가 다 외울 때까지 기다려요…</span>`;
    } else if (V.phase === "buzz") {
      if (watch) st = `<span>🔔 두 사람이 버저 경쟁 중…</span>`;
      else if (local) {
        const hs = humans(ctx), done = i => !V.needs.includes(i);
        if (!canAct || hs.every(done)) st = `<span>🔔 버저를 견주는 중…</span>`;
        else { st = `<span>🔔 풀이가 떠오르면 <b>먼저 버저!</b> 먼저 누른 사람이 5초 안에 호명해요</span>`; actH = `<div class="sn-bar" data-bar="${ctx.fast ? 4000 : BUZZ_WIN}"><i></i></div><div class="sn-act loc"><button type="button" class="sn-buzz${lkc}"${lks} data-buzz="${hs[0]}">🔔 ${esc(nameOf(ctx, hs[0]))}<br>버저!</button><button type="button" class="sn-pass" data-a="pass">둘 다<br>패스</button><button type="button" class="sn-buzz b2${lkc}"${lks} data-buzz="${hs[1]}">🔔 ${esc(nameOf(ctx, hs[1]))}<br>버저!</button></div>`; }
      } else if (V.mine) st = `<span>✅ 눌렀어요! 상대와 시간을 견주는 중…</span>`;
      else if (canAct) { st = `<span>🔔 풀이가 떠오르면 <b>먼저 버저!</b> 모르면 넘겨요 — 먼저 누른 사람이 5초 안에 호명해요</span>`; actH = `<div class="sn-bar" data-bar="${ctx.fast ? 4000 : BUZZ_WIN}"><i></i></div><div class="sn-act"><button type="button" class="sn-buzz${lkc}"${lks} data-buzz="${me}">🔔 버저!</button><button type="button" class="sn-pass" data-a="pass">모르겠어요<br>(넘기기)</button></div>`; }
      else st = `<span>…</span>`;
    } else if (V.phase === "call") {
      const bz = V.calls === 0 ? (V.log || []).slice().reverse().find(e => e.k === "buzz" && e.r === V.round) : null;
      const bzTxt = bz ? (bz.forced ? "🎲 둘 다 안 눌러서 딜러가 정했어요 — " : `🔔 ${subj(bz.w)} 먼저 눌렀어요 (${secs(bz.ms[bz.w])}${bz.ms[1 - bz.w] < NO ? ` · ${secs(bz.ms[1 - bz.w])}` : ""}) — `) : "";
      const lastTxt = V.last && V.calls > 0 ? (V.last.tmo ? `⏱ ${subj(V.last.s)} 시간 안에 못 불렀어요 — ` : `❌ ${subj(V.last.s)} 틀렸어요 — `) : "";
      if (V.caller === me && canAct) {
        const lim = cfg.limit | 0;
        st = `<span>${bzTxt}${lastTxt}<b>${local ? esc(nameOf(ctx, me)) + " 님 " : ""}알파벳 3칸</b>을 눌러 호명해요 ${lim ? `(${lim}초)` : ""}</span>`;
        sp = S.sel.length;
        actH = `${lim ? `<div class="sn-bar" data-bar="${lim * 1000}"><i></i></div>` : ""}<div class="sn-steps">${["숫자", "기호", "숫자"].map((t, i) => `<span class="${sp === i ? "on" : sp > i ? "done" : ""}">${i + 1} ${t}${S.sel[i] !== undefined ? ` · ${G.LET[S.sel[i]]}` : ""}</span>`).join("")}</div>`;
      } else st = `<span>${bzTxt}${lastTxt}${watch || local ? esc(nameOf(ctx, V.caller)) : subj(V.caller)} ${watch || local ? "" : ""}호명하는 중이에요…</span>`;
    } else {   // show · end: 방금 호명의 결과
      const Lc = V.last;
      if (Lc) {
        const who = subj(Lc.s);
        if (Lc.tmo) st = `<div class="sn-res no">⏱ ${who} 시간 안에 호명하지 못했어요<small>${Lc.void ? "호명이 24번을 넘어 이번 라운드는 무효예요" : "상대에게 기회가 넘어가요"}</small></div>`;
        else {
          const f = Lc.valid ? `${Lc.v[0]} ${Lc.v[1] === "√" ? "√+√" : Lc.v[1]} ${Lc.v[2]} = <b>${Lc.val}</b>` : `${Lc.v.map(x => (x === "√" ? "√+√" : x)).join(" · ")}`;
          const cells = Lc.c.map(i => G.LET[i]).join(" → ");
          st = Lc.hit ? `<div class="sn-res ok">🎉 ${who} 정답! ${cells}<br>${f} = 타깃 ${V.target}<small>+1점${V.over ? "" : " · 다음 라운드로 넘어가요"}</small></div>`
            : `<div class="sn-res no">${cells}<br>${Lc.valid ? `${f} ≠ 타깃 ${V.target}` : `${f} — 숫자 → 기호 → 숫자 순서가 아니에요`}<small>${Lc.void ? "호명이 24번을 넘어 이번 라운드는 무효예요" : `열린 ${Lc.newc}칸은 둘 다 봤어요 · 상대에게 기회가 넘어가요`}</small></div>`;
        }
      } else st = V.over ? `<span>끝났어요</span>` : `<span>…</span>`;
    }
    stage.innerHTML = `${`<div class="sn-top">${scoreBox(L)}${top}${scoreBox(R)}</div>`}<div class="sn-st">${st}</div>${boardHtml(V, ctx, { look: lookNow, peek, anim, sel, pick: V.phase === "call" && canAct && V.caller === me })}${actH}`;
    // 시계 · 누르기 연결
    const fresh = S.armed !== pk;
    if (canAct && fresh) {
      if (V.phase === "look") { S.armed = pk; arm(ctx.fast ? 350 : (cfg.look || 5) * 1000, () => whenAct(doReady)); }
      else if (V.phase === "buzz" && !V.mine) { S.armed = pk; arm(ctx.fast ? 4000 : BUZZ_WIN, () => whenAct(passBuzz)); }
      else if (V.phase === "call" && V.caller === me && (cfg.limit | 0) > 0) { S.armed = pk; arm((cfg.limit | 0) * 1000, () => whenAct(() => { S.sel = []; act({ t: "timeout" }); })); }
    }
    stage.onpointerdown = e => {
      const b = e.target.closest("[data-buzz]"); if (!b) return;
      e.preventDefault(); b.classList.add("hit"); pressBuzz(+b.dataset.buzz);
    };
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.buzz != null) { if (!S.sent) { t.classList.add("hit"); pressBuzz(+t.dataset.buzz); } return; }   // 터치가 아닌 클릭(키보드 · 시험)도 같은 길
      if (t.dataset.a === "pass") { passBuzz(); return; }
      if (t.dataset.a === "ready") { doReady(); return; }
      if (t.dataset.c != null && t.classList.contains("pick")) pickCell(+t.dataset.c);
    };
  }
  const result = (V, me) => {
    const H = V.hist || [], mine = H.filter(h => h.w === me).length, voids = H.filter(h => h.w < 0).length;
    const first = me >= 0 ? H.filter(h => h.bz && h.first === me && !(h.bz[0] >= NO && h.bz[1] >= NO)).length : 0;
    return `<b>${V.round}라운드</b> · 최종 ${V.score[0]} : ${V.score[1]}${me >= 0 ? ` · 버저를 먼저 누른 라운드 ${first}번 · 내가 맞힌 라운드 ${mine}번` : ""}${voids ? ` · 무효 ${voids}번` : ""}<br>타깃 ${H.map(h => h.t).join(" · ")}`;
  };

  // ── 1분 규칙 ──
  const B3 = [5, "÷", 6, 8, "+", 10, 2, 12, 1, 7, 4, 11, "×", 3, "−", 9];
  const tutBoard = (mode, sel, win) => `<div class="sn-board">${B3.map((v, i) => {
    const si = (sel || []).indexOf(i), isW = (win || []).includes(i);
    return `<button type="button" class="sn-c${mode === "back" ? " look" : ""}${si >= 0 ? " sel" : ""}${isW ? " win now" : ""}${mode === "pick" ? " pick" : ""}" data-c="${i}"${si >= 0 ? ` data-n="${si + 1}"` : ""}><span class="l">${G.LET[i]}</span>${mode === "front" ? "" : vHtml(v)}</button>`;
  }).join("")}</div>`;
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 판", title: "알파벳 16칸 — 뒷면은 숫자와 연산기호", body: "4×4 = <b>16칸</b>이에요. 칸마다 앞면엔 <b>알파벳</b>이 있고, 뒷면엔 <b>숫자 1~12</b>와 <b>연산기호 + − × ÷</b>가 하나씩 숨어 있어요. (시즌 4는 − 대신 특수 기호 √x+√y)",
        boardHtml: `<div class="sn-tut">${tutBoard("front")}</div>`, ms: 6000 },
      { tag: "STEP 2 · 암기", title: "시작 전 5초 동안 뒷면을 보여 줘요", body: "게임 시작 전 <b>5초 동안 모든 뒷면</b>을 보여 줘요. 이때 <b>어느 알파벳 뒤에 무엇이 있는지</b> 외워 두세요. 그다음엔 다시 가려져요.",
        boardHtml: `<div class="sn-tut">${tutBoard("back")}<small>5초 안에 외워요!</small></div>`, ms: 6400 },
      { tag: "STEP 3 · 타깃넘버", title: "타깃넘버가 나오면 먼저 버저!", body: "라운드마다 <b>타깃넘버</b>가 하나 공개돼요. 판의 숫자와 기호로 그 수를 만들 수 있는 사람이 <b>먼저 버저</b>를 누르고, <b>5초 안에</b> 수식을 불러요.",
        boardHtml: `<div class="sn-tut"><div class="sn-tg"><small>타깃넘버 · 1라운드</small><b>12</b></div><button type="button" class="sn-buzz" tabindex="-1">🔔 버저!</button></div>`, ms: 6400 },
      { tag: "STEP 4 · 호명", title: "알파벳 3개 = 숫자 → 기호 → 숫자", body: "수식은 <b>알파벳 3개</b>를 <b>숫자 → 연산기호 → 숫자</b> 순서로 불러요 (같은 칸은 한 번만). 부른 칸의 뒷면이 순서대로 <b>공개</b>돼요. 타깃 <b>12</b>를 만들어 보세요!",
        interactive: { hint: "👆 칸을 숫자 → 기호 → 숫자 순서로 눌러요 (예: 5 + 7)", doneText: "✅ 맞았어요! 부른 식의 값이 타깃과 같으면 승점 1점이에요" },
        render(stage, ctrl) {
          let sel = [], solved = false;
          const draw = (msg, win) => { stage.innerHTML = `<div class="sn-tut"><div class="sn-tg"><small>타깃넘버</small><b>12</b></div>${tutBoard("pick", sel, win)}<small>${msg}</small></div>`; };
          draw("판의 숫자와 기호가 모두 보여요 (실제 게임에선 가려져 있어요)");
          stage.onclick = e => {
            const c = e.target.closest("[data-c]"); if (!c || solved) return;
            const i = +c.dataset.c, k = sel.indexOf(i);
            if (k >= 0) sel.splice(k, 1); else if (sel.length < 3) sel.push(i);
            ctrl.sfx("tap");
            if (sel.length < 3) { draw(`${sel.length}번째 칸을 골랐어요`); return; }
            const j = G.judge(sel.map(x => B3[x]), 12);
            if (j.hit) { solved = true; draw(`${sel.map(x => B3[x]).join(" ")} = ${j.val} ✔`, sel); ctrl.sfx("win"); ctrl.complete(); }
            else { const t = j.valid ? `${sel.map(x => B3[x]).join(" ")} = ${j.val} — 타깃 12가 아니에요, 다시!` : "숫자 → 기호 → 숫자 순서로 눌러요, 다시!"; sel = []; draw(t); }
          };
        } },
      { tag: "STEP 5 · 승부", title: "틀리면 상대에게 기회, 먼저 10점", body: "식이 타깃과 <b>같으면 승점 1점</b>! 틀리거나 5초를 넘기면 <b>상대에게 기회</b>가 넘어가요 (이후엔 버저 없이 번갈아 호명). 열린 칸은 <b>둘 다</b> 보니까 상대의 호명도 잘 보세요. <b>먼저 10점</b>을 얻으면 승리! 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="sn-tut"><span style="font-size:42px">🏆</span><small>틀린 호명 → 상대 차례 → 정답 나올 때까지 번갈아</small></div>`, ms: 6400 },
    ];
  }

  // ── 복기 고리 ──
  const callTxt = c => (Array.isArray(c) ? c.map(i => G.LET[i]).join(" → ") : "");
  const pcs = x => Math.round(x * 100) + "%";
  function actText(a, V) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "ready") return "다 외웠어요";
    if (a.t === "buzz") return Number.isFinite(+a.ms) && +a.ms < NO ? `버저 ${secs(+a.ms)}` : "버저 안 누름 (넘김)";
    if (a.t === "timeout") return "시간 안에 호명 못함";
    if (a.t === "call" && G.validCall(a.c)) return `호명 ${callTxt(a.c)}`;
    return "—";
  }
  const fmtSure = (c, known) => `${callTxt(c)} (${c.map(i => known[i]).join(" ")})`;
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !V.rev || !Array.isArray(V.back) || (seat !== 0 && seat !== 1)) return null;
    if (myA.t === "ready") return null;
    const rc = G.recommend(V), sure = rc.sure, T = V.target;
    if (V.phase === "buzz" && myA.t === "buzz") {
      const my = +myA.ms, pressed = my < NO;
      if (pressed) {
        if (!sure.length) return { sev: 0, why: `공개된 칸만으로는 타깃 ${T} 풀이가 없었어요 — 외운 칸으로 누른 거라면 좋은 판단이에요 (고급 AI도 외운 12칸을 써요)` };
        const b = bestA && bestA.t === "buzz" && bestA.ms < NO ? bestA.ms : null;
        const slow = b != null && my - b > 800;
        return { sev: slow ? Math.min(55, Math.round((my - b) / 1000 * 20)) : 0, why: `공개된 칸만으로 ${fmtSure(sure[0], rc.known)} = ${T} 풀이가 있었어요${b != null ? ` · 고급 AI는 약 ${secs(b)}에 눌렀을 거예요 (나 ${secs(my)})` : ""}` };
      }
      if (sure.length) return { sev: 75, why: `공개된 칸만으로 ${fmtSure(sure[0], rc.known)} = ${T} 풀이가 있었는데 안 눌렀어요 — 눌렀다면 정답 확률 100%로 1점이에요`, best: `버저 → ${callTxt(sure[0])}` };
      return { sev: 0, why: `공개된 칸만으로는 풀이가 없어서 넘긴 건 좋은 판단이에요 (공개 칸 기준 가장 높은 호명도 약 ${pcs(rc.best.p)})` };
    }
    if (V.phase !== "call") return null;
    const pBest = sure.length ? 1 : rc.best.p, bestC = sure.length ? sure[0] : rc.best.c, bestNew = bestC.filter(i => !V.rev[i]).length;
    if (myA.t === "timeout") return { sev: Math.round(pBest * 100), why: `시간 안에 호명하지 못했어요 — 공개된 칸 기준 ${callTxt(bestC)} 이면 정답 확률 약 ${pcs(pBest)}였어요`, best: callTxt(bestC) };
    if (myA.t !== "call" || !G.validCall(myA.c)) return null;
    const known = rc.known, pMine = G.callProb(known, V.season, T, myA.c), mineNew = myA.c.filter(i => !V.rev[i]).length;
    if (myA.c.join() === bestC.join()) return null;
    const d = pBest - pMine, sev = Math.max(0, Math.round(d * 100));
    const why = d > 0.02 ? `공개된 칸 기준 정답 확률 ${pcs(pBest)} (${callTxt(bestC)}) → 내 호명 ${pcs(pMine)} · 새로 공개되는 칸 ${bestNew}개 vs ${mineNew}개`
      : d < -0.02 ? `이번엔 내 호명이 공개된 칸 기준 확률이 더 높아요 (내 ${pcs(pMine)} · 고급 AI 수 ${pcs(pBest)}) — 외운 칸을 잘 쓴 거예요`
        : `두 호명의 정답 확률이 비슷해요 (${pcs(pMine)} · ${pcs(pBest)}) · 새로 공개되는 칸 ${mineNew}개 vs ${bestNew}개`;
    return { sev, why, best: `${callTxt(bestC)} (${pcs(pBest)})` };
  }
  // 자동 시험 · 시험 틀의 내 차례 수: 사람처럼 1.5~4.5초에 누르고, 호명은 보통 AI 가 정함
  function qa(V, me, rnd) {
    if (V.phase === "look") return { t: "ready" };
    if (V.phase === "buzz") return { t: "buzz", ms: 1500 + Math.floor(rnd() * 3000) };
    if (V.phase === "call") return G.ai(V, me, "normal", rnd);
    return null;
  }

  // 💡 는 단계 힌트: 처음엔 '식이 있다 · 쓰는 기호' 만, '한 번 더' 를 누르면 칸 · 식 전체 (그 차례 동안 펼친 채)
  let HINT = { key: "", open: false, full: "" };
  function coachHint(V, me, since, names) {
    const key = `${V.pub}|${V.round}|${V.calls}|${V.phase}|${me}`;
    if (HINT.key !== key) HINT = { key, open: false, full: "" };
    const c = G.coach(V, me, since, names, { full: HINT.open });
    if (c && c.more && !HINT.open) {
      const f = G.coach(V, me, since, names, { full: true });
      HINT.full = `<b>${f.rec}</b> ${f.why || ""}`;
      c.why = `${c.why || ""} <button type="button" class="sn-hbtn" data-snhint style="margin:2px 4px 2px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.12);color:#fde68a;font:800 12.5px var(--round);cursor:pointer">💡 한 번 더 — 전체 식 보기</button>`;
    }
    return c;
  }
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-snhint]");
    if (!b) return;
    e.preventDefault(); HINT.open = true;
    const sp = document.createElement("span"); sp.innerHTML = HINT.full; b.replaceWith(sp);
  }, true);

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-samenum"] = {
    name: "같은 숫자 찾기", emoji: "🔢", short: "외운 판으로 타깃넘버를 만들어요 · 버저 + 호명 3칸", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    show: "더 지니어스 · 시즌 3 · 시즌 4 · 같은 숫자 찾기", season: "시즌 3 블랙가넷 · 시즌 4 그랜드 파이널",
    opts: [
      { k: "goal", label: "목표 점수", items: [[10, "10점 (방송)"], [7, "7점"], [5, "5점"]], def: 10 },
      { k: "season", label: "시즌", items: [[3, "시즌 3 (− 있음)"], [4, "시즌 4 (√x+√y)"]], def: 3 },
      { k: "look", label: "외우는 시간", items: [[5, "5초 (방송)"], [10, "10초"], [15, "15초"]], def: 5 },
      { k: "limit", label: "호명 제한", items: [[5, "5초 (방송)"], [10, "10초"], [0, "없음"]], def: 5 },
      { k: "aid", label: "기억 도우미", items: [[1, "켬"], [0, "끔 (방송)"]], def: 1 },
    ],
    diff: "버저는 화면의 큰 단추예요 — 타깃이 보인 순간부터 잰 시간(ms)으로 먼저 누른 쪽이 호명하고, AI는 풀이를 알 때만 눌러요 (초급 3~5초 · 중급 1.5~3초 · 고급 1~2.7초, 0.8초보다 빨리는 안 눌러요 · 풀이를 알면 초급도 가끔 못 눌러요) · 둘 다 안 누르면 딜러가 호명 순서를 정해요 (방송은 누를 때까지 기다림) · 목표 5·7점은 짧게 하는 옵션 · 기억 도우미(켬)는 한 번 열린 칸의 값을 판에 흐리게 남겨요 (방송은 외워야 함) · 호명이 24번을 넘으면 라운드 무효 · 한 기기에선 화면 양쪽 단추로 각자 버저",
    howto: [
      "<b>4×4 = 16칸</b> — 앞면은 알파벳, 뒷면은 <b>숫자 1~12</b>와 <b>연산기호</b> (+ − × ÷, 시즌 4는 − 대신 √x+√y)",
      "시작 전 <b>5초 동안</b> 모든 뒷면을 보여 줘요 — 외워 두세요",
      "라운드마다 <b>타깃넘버</b>가 나와요 (판의 숫자 · 기호로 만들 수 있는 수)",
      "<b>먼저 버저</b>를 누른 사람이 <b>5초 안에</b> 알파벳 3개를 <b>숫자 → 기호 → 숫자</b> 순서로 호명해요 — 부른 칸의 뒷면이 공개돼요",
      "식이 타깃과 같으면 <b>승점 1</b> · 틀리거나 5초를 넘기면 <b>상대에게 기회</b> (번갈아, 정답이 나올 때까지)",
      "<b>먼저 10점</b>을 얻으면 승리",
      "<b>특수</b> — 한 라운드에서 호명이 <b>24번</b>을 넘으면 그 라운드는 <b>무효</b>예요 (끝없는 판을 막으려는 우리 판 상한, 방송엔 없어요)",
    ],
    sub: V => (V.over ? "끝" : `${V.round}라운드 · 먼저 ${V.goal}점`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: coachHint,
    qa, tutorial,
  };
})();

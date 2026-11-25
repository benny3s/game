/* 베니 서바이벌 · 헥사곤 — 화면 (육각 판 19칸 · 외우기 · 버저 · 세 칸 선언 · 선생님 · 1분 규칙 · 복기)
   시계는 UI 만 가져요: 버저 시각(ms)은 타깃이 공개된 순간부터 재서 {t:"buzz", ms} 로, 10초 제한이 끝나면 {t:"timeout"} 을 보내요. */
(() => {
  "use strict";
  const K = window.SVCores.hexagon;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const LET = K.LET, NO = K.NO_BUZZ, LOCK = 600, BUZZ_WIN = 90000;
  const SRC = "방송: 데블스 플랜 (시즌 1) · 7일차 결승전 2회전 (1:1)";
  const DIFF = "판 숫자 · 타깃은 씨앗 난수로 만들어요 (방송 10판처럼 숫자 1~10, 정답 1~6개) · '모르겠어요(넘기기)' 로 바로 넘길 수 있고 두 사람 다 넘기면 라운드 끝 (방송은 90초 동안 아무도 안 누르면 끝) · 일렬이 아닌 세 칸은 화면에서 막아요 · 라운드가 끝나면 판과 정답을 잠깐 보여 줘요 · 한 라운드 선언은 30번까지 (넘으면 그 라운드 끝 — 끝없는 라운드 방지 상한) · 연장은 3라운드까지 (그래도 같으면 무승부) · 피스 베네핏(시작 1점)은 없어요 · '나온 정답 보기' 옵션 (기본 켬, 방송은 끔)";
  const CSS = `
.hx-top{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:stretch;flex:none}
.hx-sc{display:grid;place-items:center;align-content:center;border-radius:12px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.12);padding:2px 6px;min-width:0}
.hx-sc small{font:700 11px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hx-sc b{font:900 24px/1.05 var(--round);color:#fff;font-variant-numeric:tabular-nums}
.hx-sc.me{border-color:rgba(74,222,128,.6)}.hx-sc.on{border-color:var(--gold);box-shadow:0 0 0 2px rgba(245,179,1,.25)}
.hx-tg{display:grid;place-items:center;align-content:center;min-width:104px;padding:2px 10px;border-radius:12px;background:linear-gradient(#1e1b4b,#312e81);border:1.5px solid #818cf8}
.hx-tg small{font:700 10.5px var(--round);color:#c7d2fe;white-space:nowrap}
.hx-tg b{font:900 30px/1 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.hx-tg.look{background:linear-gradient(#422006,#713f12);border-color:#f59e0b}
.hx-st{flex:none;min-height:38px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.hx-st b{color:#fde68a}
.hx-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.hx-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.hx-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.hx-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.hx-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
.hx-board{position:relative;width:min(100%,336px);aspect-ratio:1/0.924}
.hx-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.hx-c{position:absolute;width:19.4%;height:22.4%;margin:0;padding:0;border:0;background:transparent;cursor:default;-webkit-tap-highlight-color:transparent;transform:translate(-50%,-50%)}
.hx-c::before{content:"";position:absolute;inset:0;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:#64748b}
.hx-c i{position:absolute;inset:2.5px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(#334155,#1e293b);display:grid;place-items:center;font-style:normal}
.hx-c{container-type:size}
.hx-c .l{font:900 min(21px,52cqh)/1 var(--round);color:#cbd5e1}
.hx-c .v{font:900 min(25px,56cqh)/1 var(--round);color:#0f172a}
.hx-c .lt{position:absolute;left:0;right:0;top:15%;text-align:center;font:800 9.5px var(--round);color:#64748b}
.hx-c.face i{background:linear-gradient(#fffbeb,#fde68a)}
.hx-c.face .v{margin-top:min(7px,16cqh)}
.hx-c.face::before{background:#f59e0b}
.hx-c.peek .v{font-size:15px;color:#94a3b8;position:absolute;bottom:14%;left:0;right:0;text-align:center}
.hx-c.pick{cursor:pointer}.hx-c.pick::before{background:#a5b4fc}
.hx-c.sel::before{background:#facc15}.hx-c.sel i{background:linear-gradient(#4338ca,#312e81)}
.hx-c.sel .l{color:#fff}
.hx-c[data-n]::after{content:attr(data-n);position:absolute;right:12%;top:8%;width:18px;height:18px;border-radius:50%;background:#facc15;color:#1e1b4b;font:900 11px/18px var(--round);text-align:center;z-index:4}
.hx-c.hit::before{background:#4ade80}.hx-c.bad::before{background:#f87171}
.hx-c.ans::before{background:#facc15}
.hx-act{flex:none;display:grid;gap:6px}
.hx-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.hx-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#facc15);transform-origin:left;transform:scaleX(1)}
.hx-row{display:flex;gap:6px}
.hx-buzz{flex:1;min-width:0;height:58px;border-radius:16px;border:0;background:linear-gradient(#fb7185,#be123c);color:#fff;font:900 20px var(--round);box-shadow:0 5px 0 #881337;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.hx-buzz.b2{background:linear-gradient(#60a5fa,#1d4ed8);box-shadow:0 5px 0 #1e3a8a}
.hx-buzz:active,.hx-buzz.hit{transform:translateY(3px);box-shadow:0 2px 0 #881337}
.hx-buzz.lock{opacity:.4}
.hx-row.loc .hx-buzz{font-size:15px;line-height:1.15}
.hx-pass{flex:0 0 auto;min-width:92px;height:58px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:800 13px/1.2 var(--round);cursor:pointer;padding:0 8px}
.hx-go{flex:1;height:50px;border-radius:14px;border:0;background:linear-gradient(#22c55e,#15803d);color:#fff;font:900 15px var(--round);cursor:pointer}
.hx-steps{display:flex;gap:6px;justify-content:center}
.hx-steps span{min-width:64px;height:44px;border-radius:10px;display:grid;place-items:center;font:800 13px var(--round);color:var(--soft);background:rgba(0,0,0,.25);border:1.5px dashed rgba(255,255,255,.2)}
.hx-steps span.on{border:1.5px solid #facc15;color:#fde68a}.hx-steps span.done{border:1.5px solid #a5b4fc;color:#fff;background:rgba(99,102,241,.3)}
.hx-clr{min-width:56px;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:800 12.5px var(--round);cursor:pointer}
.hx-ans{font-size:12px;line-height:1.45;color:var(--soft);text-align:center}
.hx-ans b{color:#fde68a}.hx-ans .g{color:#86efac}.hx-ans .r{color:#fca5a5}
.hx-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.hx-tut .hx-board{width:min(100%,250px)}
.hx-tut .hx-c .v{font-size:18px;margin-top:9px}.hx-tut .hx-c .lt{font-size:8.5px;top:12%}.hx-tut .hx-c .l{font-size:16px}
.hx-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.hx-tmsg b{color:#fde68a}
@media (max-height:650px){.hx-board{width:min(100%,300px)}.hx-sc b{font-size:21px}.hx-tg b{font-size:26px}.hx-buzz,.hx-pass{height:52px}.hx-st{min-height:34px;font-size:12px}.hx-c .v{font-size:22px}.hx-c .l{font-size:18px}}
.sv-coachfit .hx-board{width:min(100%,calc((var(--sv-sh) - 178px) * 1.08))}
.sv-coachfit .hx-st{min-height:30px;font-size:11.5px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가");
  const eunL = x => (/[LMNR]$/.test(x) ? "은" : "는");          // 알파벳 끝 소리: 엘 · 엠 · 엔 · 알 만 받침
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const num = x => (x < 0 ? "−" + -x : String(x));
  const secs = ms => (ms >= NO ? "안 누름" : (ms / 1000).toFixed(1) + "초");
  const lineTxt = k => K.lineName(k);
  const sumTxt = (board, k) => `${K.LINES[k].c.map(i => board[i]).join("+")}=${K.sumOf(board, k)}`;
  // 칸 자리 (판 상자 안 %): 줄마다 3 · 4 · 5 · 4 · 3칸, 칸 너비 = 판 너비 / 5
  const POS = K.CELL.map(c => {
    const cnt = 5 - Math.abs(c.r), j = c.q - Math.max(-2, -2 - c.r);
    const x = ((5 - cnt) / 2 + j + 0.5) / 5 * 100;
    const y = (0.5774 + c.row * 0.866) / 4.6188 * 100;
    return { x, y };
  });

  // ── 이 화면의 시계 · 선택 ──
  const S = { pk: "", armed: "", stage: null, ctx: null, V: null, tm: 0, iv: 0, t0: 0, dl: 0, dur: 1, sel: [], asg: {}, sent: false, lockUntil: 0, msg: "" };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; };
  // 행동이 안 먹으면(차례가 늦게 넘어옴 등) 단추 · 시계를 되살려 멈추지 않게
  const retry = () => { S.sent = false; S.armed = ""; if (S.stage && S.V && S.ctx) render(S.stage, S.V, S.ctx); };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected) { clearInterval(S.iv); S.iv = 0; return; }
    const bar = st.querySelector("[data-bar]"); if (!bar || !S.dl) return;
    const left = Math.max(0, S.dl - nowMs());
    bar.firstElementChild.style.transform = `scaleX(${Math.min(1, left / S.dur)})`;
    st.querySelectorAll("[data-cd]").forEach(cd => { cd.textContent = String(Math.ceil(left / 1000)); });
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = nowMs() + ms; S.dur = ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 100);
  }
  const whenAct = (fn, tries) => { const c = S.ctx; if (c && c.canAct) return fn(); if ((tries == null ? 12 : tries) > 0) { const pk = S.pk; setTimeout(() => { if (S.pk === pk) whenAct(fn, (tries == null ? 12 : tries) - 1); }, 250); } };
  const humans = ctx => [0, 1].filter(i => ctx.seats && ctx.seats[i] && ctx.seats[i].kind !== "ai" && !ctx.seats[i].sub);
  function doReady() {
    for (let n = 0; n < 2; n++) {                       // 한 기기(두 사람)에선 두 자리 모두 준비
      const c = S.ctx, V = S.V; if (!c || !c.canAct || !V || V.phase !== "look") return;
      c.sfx("tap"); if (c.mode === "local") S.readyAll = S.pk; const r = c.act({ t: "ready" });
      if (!r || !r.ok || c.mode !== "local") return;
    }
  }
  function flushLocal() {
    for (let n = 0; n < 2; n++) {
      const c = S.ctx, V = S.V; if (!c || !c.canAct || !V || V.phase !== "buzz") return;
      const s = c.me, ms = S.asg[s]; if (ms == null) return;
      S.asg[s] = null; const r = c.act({ t: "buzz", ms }); if (!r || !r.ok) { S.asg[s] = ms; return; }
    }
  }
  function pressBuzz(seat) {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "buzz" || S.sent) return;
    const t = nowMs(); if (t < S.lockUntil) return;
    const ms = Math.max(0, Math.round(t - S.t0));
    try { if (navigator.vibrate) navigator.vibrate(28); } catch (e) {}
    if (c.mode === "local") {
      if (!c.canAct) return;
      const hs = humans(c), other = hs.find(i => i !== seat);
      if (S.asg[seat] != null || !V.needs.includes(seat)) return;
      S.sent = true; S.asg[seat] = ms; if (other != null && V.needs.includes(other)) S.asg[other] = NO;
      clearTimers(); flushLocal(); return;
    }
    if (!c.canAct) return;
    S.sent = true; clearTimers(); const r = c.act({ t: "buzz", ms }); if (!r || !r.ok) retry();
  }
  function passBuzz() {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "buzz" || S.sent || !c.canAct) return;
    S.sent = true; clearTimers();
    if (c.mode === "local") { for (const i of humans(c)) if (V.needs.includes(i) && S.asg[i] == null) S.asg[i] = NO; flushLocal(); return; }
    const r = c.act({ t: "buzz", ms: NO }); if (!r || !r.ok) retry();
  }
  function pickCell(i) {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "call" || !c.canAct) return;
    const k = S.sel.indexOf(i);
    if (k >= 0) { S.sel.splice(k, 1); S.msg = ""; c.sfx("tap"); render(S.stage, V, c); return; }
    if (S.sel.length >= 3) return;
    S.sel.push(i); c.sfx("tap");
    if (S.sel.length === 3) {
      if (!K.LINE_OF.has(S.sel.join(","))) { S.msg = `${S.sel.map(x => LET[x]).join("")}${eunL(LET[S.sel[2]])} 일렬이 아니에요 — 가로 · 대각선 한 줄로, 가운데 칸을 두 번째로 골라요`; S.sel = []; render(S.stage, V, c); return; }
      const call = S.sel.slice(); S.sel = []; S.msg = ""; clearTimers(); c.sfx("pop"); const r = c.act({ t: "call", c: call }); if (!r || !r.ok) retry(); return;
    }
    S.msg = ""; render(S.stage, V, c);
  }

  // ── 판 그리기 ──
  // o: { face: 숫자 보임 · peek: 흐리게 숫자 · pick: 고르기 · sel · hit/bad: 방금 선언 칸 · lines: [[k, 색]] }
  function boardHtml(V, o) {
    const sel = o.sel || [], hl = o.hl || {};
    let svg = "";
    if (o.lines && o.lines.length) {
      svg = `<svg viewBox="0 0 100 92.4" preserveAspectRatio="none">${o.lines.map(([k, col, dash]) => { const c = K.LINES[k].c, a = POS[c[0]], b = POS[c[2]];
        return `<line x1="${a.x}" y1="${a.y * 0.924}" x2="${b.x}" y2="${b.y * 0.924}" stroke="${col}" stroke-width="1.3" stroke-linecap="round" opacity=".72"${dash ? ' stroke-dasharray="3 2.5"' : ""}/>`; }).join("")}</svg>`;
    }
    return `<div class="hx-board" aria-label="헥사곤 판">${K.CELL.map((_, i) => {
      const p = POS[i], si = sel.indexOf(i), face = o.face && V.board, peek = !face && o.peek && V.board;
      let cls = "hx-c";
      if (face) cls += " face"; if (peek) cls += " peek";
      if (o.pick) cls += " pick"; if (si >= 0) cls += " sel";
      if (hl[i]) cls += " " + hl[i];
      const inner = face ? `<span class="lt">${LET[i]}</span><span class="v">${V.board[i]}</span>` : `<span class="l">${LET[i]}</span>${peek ? `<span class="v">${V.board[i]}</span>` : ""}`;
      return `<button type="button" class="${cls}" data-c="${i}"${si >= 0 ? ` data-n="${si + 1}"` : ""}${o.pick ? "" : ' tabindex="-1" disabled'} style="left:${p.x.toFixed(2)}%;top:${p.y.toFixed(2)}%" aria-label="${LET[i]} 칸"><i>${inner}</i></button>`;
    }).join("")}${svg}</div>`;
  }

  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, local = ctx.mode === "local", watch = ctx.mode === "watch" || me < 0;
    const pk = `${ctx.g}|${V.round}|${V.phase}|${V.calls}`;
    if (pk !== S.pk) {
      S.pk = pk; clearTimers(); S.armed = ""; S.sel = []; S.asg = {}; S.sent = false; S.dl = 0; S.msg = "";
      const t = nowMs(), lock = ctx.fast || watch ? 0 : LOCK;
      S.t0 = t + lock; S.lockUntil = t + lock;
    }
    const opt = V.opt || {}, L = !watch && !local ? me : 0, Rr = 1 - L, canAct = !!ctx.canAct;
    const label = i => (!watch && !local && i === me ? "나" : esc(nameOf(ctx, i)));
    const subj = i => (!watch && !local && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const turn = i => (V.phase === "call" ? V.caller === i : V.phase === "buzz" || V.phase === "look" ? V.needs.includes(i) : false);
    const scoreBox = i => `<div class="hx-sc${!watch && !local && i === me ? " me" : ""}${turn(i) && !V.over ? " on" : ""}"><small>${label(i)}</small><b>${num(V.score[i])}</b></div>`;
    const lookNow = V.phase === "look" && (watch || local || !V.rdy[me]);
    const rTxt = V.round > V.R ? `연장 ${V.round - V.R}` : `${V.round}/${V.R}R`;
    let top, st = "", actH = "", bo = { face: false, peek: watch && !!V.board, pick: false, sel: [], hl: {}, lines: [] };
    if (V.phase === "look") top = `<div class="hx-tg look"><small>${rTxt} · ${lookNow ? "외우는 시간" : "다 외웠어요"}</small><b data-cd>${lookNow ? opt.look || 30 : "✔"}</b></div>`;
    else top = `<div class="hx-tg"><small>${rTxt} · 타깃 넘버</small><b>${V.target}</b></div>`;
    const foundTxt = () => {
      if (!opt.aid || !V.found.length) return V.found.length ? `이번 라운드 정답 ${V.found.length}개 나옴` : "";
      return `나온 정답: ${V.found.map(f => `<b>${lineTxt(f.k)}</b>`).join(" · ")}`;
    };
    if (V.phase === "look") {
      bo.face = lookNow || watch;
      if (lookNow) {
        st = canAct || local ? `<span>👀 숫자 ${V.m ? `1~${V.m}` : ""} 19칸을 외워요 — 덮은 뒤 <b>타깃 넘버</b>가 나와요</span>` : `<span>👀 판을 보여 주는 중이에요</span>`;
        if (canAct) actH = `<div class="hx-bar" data-bar><i></i></div><div class="hx-row"><button type="button" class="hx-go" data-a="ready">다 외웠어요 (<span data-cd>${opt.look || 30}</span>초)</button></div>`;
      } else st = `<span>덮었어요 — 상대가 다 외울 때까지 기다려요…</span>`;
    } else if (V.phase === "buzz") {
      const ft = foundTxt();
      if (watch) st = `<span>🔔 버저 경쟁 중…${ft ? `<br>${ft}` : ""}</span>`;
      else if (local) {
        const hs = humans(ctx), done = i => !V.needs.includes(i);
        if (!canAct || hs.every(done)) st = `<span>🔔 버저를 견주는 중…</span>`;
        else {
          st = `<span>🔔 합이 <b>${V.target}</b>인 세 칸이 떠오르면 <b>먼저 버저!</b>${ft ? `<br>${ft}` : ""}</span>`;
          actH = `<div class="hx-bar" data-bar><i></i></div><div class="hx-row loc"><button type="button" class="hx-buzz" data-buzz="${hs[0]}">🔔 ${esc(nameOf(ctx, hs[0]))}</button><button type="button" class="hx-pass" data-a="pass">둘 다<br>넘기기</button><button type="button" class="hx-buzz b2" data-buzz="${hs[1]}">🔔 ${esc(nameOf(ctx, hs[1]))}</button></div>`;
        }
      } else if (V.mine) st = `<span>${V.myMs >= NO ? "넘겼어요" : "✅ 눌렀어요!"} 상대와 견주는 중…</span>`;
      else if (canAct) {
        st = `<span>🔔 합이 <b>${V.target}</b>인 세 칸(가로 · 대각선)이 떠오르면 <b>버저!</b> 오답은 −1${ft ? `<br>${ft}` : ""}</span>`;
        actH = `<div class="hx-bar" data-bar><i></i></div><div class="hx-row"><button type="button" class="hx-buzz" data-buzz="${me}">🔔 버저!</button><button type="button" class="hx-pass" data-a="pass">모르겠어요<br>(넘기기)</button></div>`;
      } else st = `<span>…</span>`;
    } else if (V.phase === "call") {
      const bz = (V.log || []).slice().reverse().find(e => e.k === "buzz" && e.r === V.round);
      const bzTxt = bz && bz.w >= 0 ? `🔔 ${subj(bz.w)} 먼저 (${secs(bz.ms[bz.w])}${bz.ms[1 - bz.w] < NO ? ` · ${secs(bz.ms[1 - bz.w])}` : ""}) — ` : "";
      if (V.caller === me && canAct || local && canAct) {
        bo.pick = true; bo.sel = S.sel;
        st = S.msg ? `<span class="hx-res no">${esc(S.msg)}</span>` : `<span>${bzTxt}<b>${local ? esc(nameOf(ctx, V.caller)) + " 님, " : ""}세 칸</b>을 차례로 눌러 선언해요 (<span data-cd>${opt.limit || 10}</span>초)</span>`;
        actH = `<div class="hx-bar" data-bar><i></i></div><div class="hx-steps">${[0, 1, 2].map(i => `<span class="${S.sel.length === i ? "on" : S.sel.length > i ? "done" : ""}">${i === 1 ? "가운데" : i + 1 + "번째"}${S.sel[i] !== undefined ? ` · ${LET[S.sel[i]]}` : ""}</span>`).join("")}<button type="button" class="hx-clr" data-a="clr"${S.sel.length ? "" : " disabled"}>다시</button></div>`;
      } else st = `<span>${bzTxt}${subj(V.caller)} 세 칸을 선언하는 중…</span>`;
    } else if (V.phase === "show" && V.last) {
      const Lc = V.last, who = subj(Lc.s), cells = Lc.c ? Lc.c.map(i => LET[i]).join("") : "";
      if (Lc.c) Lc.c.forEach(i => { bo.hl[i] = Lc.ok ? "hit" : "bad"; });
      const why = Lc.why === "time" ? `${opt.limit || 10}초 안에 못 불렀어요` : Lc.why === "dup" ? "이미 나온 답이에요" : Lc.why === "line" ? "일렬이 아니에요" : `합이 ${V.target}${iga(V.target)} 아니에요`;
      st = Lc.ok ? `<div class="hx-res ok">🎉 ${who} <b>${cells}</b> 정답! +1<small>선언한 칸은 열지 않아요 · 버저를 다시 견줘요</small></div>`
        : `<div class="hx-res no">❌ ${who} ${cells ? `<b>${cells}</b> ` : ""}오답 −1<small>${why}</small></div>`;
    } else if (V.phase === "reveal" || V.over) {
      const H = V.hist[V.hist.length - 1];
      bo.face = true;
      if (H) {
        const fk = new Set(H.found.map(f => f.k));
        bo.lines = H.ans.map(k => [k, fk.has(k) ? "#4ade80" : "#facc15", !fk.has(k)]);
        H.ans.forEach(k => K.LINES[k].c.forEach(i => { bo.hl[i] = "ans"; }));
        const who = f => (watch || local ? esc(nameOf(ctx, f.s)) : f.s === me ? "나" : "상대");
        const list = H.ans.map(k => { const f = H.found.find(x => x.k === k); return `<span class="${f ? "g" : ""}">${lineTxt(k)}(${sumTxt(H.board, k)})${f ? ` ✔${who(f)}` : ""}</span>`; }).join(" · ");
        const endTxt = V.over ? (V.res.w < 0 ? `🤝 무승부 ${V.score[0]} : ${V.score[1]}` : `${watch || local ? "🏆 " + esc(nameOf(ctx, V.res.w)) + " 승" : V.res.w === me ? "🏆 내가 이겼어요" : "😵 상대 승"} — ${V.score[L]} : ${V.score[Rr]}`) : "";
        st = `<div class="hx-res ${V.over ? (V.res.w === me || V.res.w < 0 || watch || local ? "ok" : "no") : "ok"}">${endTxt ? endTxt + "<br>" : ""}${H.r > V.R ? `연장 ${H.r - V.R}` : `${H.r}라운드`} 정답 ${H.ans.length}개 · 타깃 ${H.t}<small>${H.why === "pass" ? "두 사람 다 넘겨서 끝났어요" : H.why === "all" ? "정답이 다 나왔어요" : "선언이 너무 많아 끝냈어요"}</small></div>`;
        actH = `<div class="hx-ans">${list}</div>`;
      }
    }
    stage.innerHTML = `<div class="hx-top">${scoreBox(L)}${top}${scoreBox(Rr)}</div><div class="hx-st">${st}</div><div class="hx-wrap">${boardHtml(V, bo)}</div>${actH ? `<div class="hx-act">${actH}</div>` : ""}`;
    // 시계
    if (canAct && S.armed !== pk) {
      if (V.phase === "look" && lookNow) { S.armed = pk; arm(ctx.fast ? 400 : (opt.look || 30) * 1000, () => whenAct(doReady)); }
      else if (V.phase === "buzz" && (!V.mine || local)) { S.armed = pk; arm(ctx.fast ? 4000 : BUZZ_WIN, () => whenAct(passBuzz)); }
      else if (V.phase === "call" && (V.caller === me || local)) { S.armed = pk; arm((opt.limit || 10) * 1000, () => whenAct(() => { S.sel = []; const c = S.ctx; if (c && c.canAct) { const r = c.act({ t: "timeout" }); if (!r || !r.ok) retry(); } })); }
    }
    // 한 기기: 자리가 늦게 넘어와 남은 사람 몫(넘기기 · 준비)이 못 나갔으면 마저 보냄
    if (local && canAct) {
      if (V.phase === "buzz" && S.asg[me] != null) { const p0 = S.pk; setTimeout(() => { if (S.pk === p0) flushLocal(); }, 0); }
      else if (V.phase === "look" && S.readyAll === pk && V.needs.includes(me)) { setTimeout(() => { if (S.pk === pk) doReady(); }, 0); }
    }
    if (S.dl) tick();
    stage.onpointerdown = e => {
      const b = e.target.closest("[data-buzz]"); if (!b) return;
      e.preventDefault(); b.classList.add("hit"); pressBuzz(+b.dataset.buzz);
    };
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.buzz != null) { if (!S.sent) { t.classList.add("hit"); pressBuzz(+t.dataset.buzz); } return; }
      if (t.dataset.a === "pass") { passBuzz(); return; }
      if (t.dataset.a === "ready") { doReady(); return; }
      if (t.dataset.a === "clr") { S.sel = []; S.msg = ""; render(stage, V, ctx); return; }
      if (t.dataset.c != null && t.classList.contains("pick")) pickCell(+t.dataset.c);
    };
  }

  // ── 행동 글 ──
  function actText(a) {
    if (!a) return "";
    if (a.t === "ready") return "다 외웠어요";
    if (a.t === "buzz") return a.ms >= NO ? "넘기기" : `버저 (${secs(a.ms)})`;
    if (a.t === "call") return Array.isArray(a.c) ? `${a.c.map(i => LET[i]).join("")} 선언` : "선언";
    if (a.t === "timeout") return "시간 초과";
    return "";
  }

  // ── 선생님 ──
  function coach(V, me) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, so = V.stat[opp], sm = V.stat[me];
    // 👀 상대 흐름
    const p = [];
    if (so.bz) p.push(`상대는 버저 ${so.bz}번 — 정답 ${so.ok} · 오답 ${so.bad}, 평균 ${(so.ms / so.bz / 1000).toFixed(1)}초에 눌렀어요.`);
    else p.push("상대는 아직 버저를 누른 적이 없어요.");
    const oThis = V.found.filter(f => f.s === opp).length;
    if (V.phase !== "look" && oThis) p.push(`이번 라운드 상대 정답 ${oThis}개.`);
    const lastH = V.hist[V.hist.length - 1];
    if (lastH && V.phase === "look") p.push(`지난 라운드 정답 ${lastH.ans.length}개 중 상대 ${lastH.found.filter(f => f.s === opp).length}개 · 나 ${lastH.found.filter(f => f.s === me).length}개.`);
    // 📊 내 흐름
    const df = V.score[me] - V.score[opp], left = Math.max(0, V.R - V.round) + (V.phase === "reveal" || V.over ? 0 : 1);
    let m = `점수 나 ${V.score[me]} · 상대 ${V.score[opp]} (${df ? (df > 0 ? "+" : "−") + Math.abs(df) : "같음"}) · 남은 라운드 ${V.round > V.R ? "연장" : left + "개"}.`;
    if (sm.bz) m += ` 내 버저 ${sm.bz}번 — 정답률 ${Math.round(sm.ok / Math.max(1, sm.ok + sm.bad) * 100)}%.`;
    if (V.phase === "buzz" || V.phase === "call" || V.phase === "show") m += ` 이번 라운드 정답 ${V.found.length}개 나옴 (몇 개인지는 비밀 — 이 게임은 라운드마다 1~6개).`;
    // 💡 추천 · 👉 뜻
    let rec = "", why = "";
    if (V.over) { rec = "끝났어요."; why = `최종 ${V.score[me]} : ${V.score[opp]}.`; }
    else if (V.phase === "look" && (V.rdy || [])[me]) { rec = "덮었어요 — 외운 줄 합을 떠올리며 기다려요."; why = "상대가 다 외우면 타깃 넘버가 나와요."; }
    else if (V.phase === "look") {
      const by = K.lineSums(V.board || []), cand = Object.keys(by).map(Number).filter(s => by[s].length >= 2 && by[s].length <= 5).sort((a, b) => by[b].length - by[a].length || a - b);
      const top3 = cand.slice(0, 3).map(s => `${s} (${by[s].length}줄: ${by[s].slice(0, 3).map(lineTxt).join(" · ")})`);
      rec = top3.length ? `줄 합을 외워 두세요 — ${top3.join(", ")}` : "큰 숫자 칸부터 외워요.";
      const big = (V.board || []).map((v, i) => [v, i]).filter(([v]) => v >= Math.max(5, (V.m || 6) - 1)).map(([v, i]) => `${LET[i]}=${v}`);
      why = `줄 27개 중 타깃은 정답이 1~6개인 합에서 나와요 — 이 판에서 정답이 2~5개인 합은 ${cand.length}가지. 큰 숫자 칸(${big.slice(0, 5).join(" · ") || "없음"})은 큰 타깃의 열쇠예요.`;
    } else if (V.phase === "buzz") {
      const need = left > 0 ? Math.ceil((-df + 1) / left) : 0;
      rec = df > 0 && left <= 2 ? "확실한 줄만 버저 — 지키는 쪽이 유리해요." : df < 0 && left <= 2 ? "따라잡아야 해요 — 거의 확실하면 과감히 버저!" : "세 칸이 다 확실하면 버저, 아니면 넘기기.";
      why = `오답은 −1 이라 맞을 확률 p 가 50% 를 넘어야 버저가 이득이에요 (기대 2p−1점: 70% 면 ${sgn(K.buzzEV(0.7))} · 40% 면 ${sgn(K.buzzEV(0.4))}).`;
      if (df < 0 && left > 0) why += ` 지금 ${-df}점 뒤져 남은 ${left}라운드에 라운드당 약 ${need}개를 더 맞혀야 해요.`;
      else if (df > 0) why += ` ${df}점 앞서 있어요 — 오답 하나가 상대 정답 하나와 같아요.`;
    } else if (V.phase === "call") {
      rec = V.caller === me ? "가로 · 대각선 한 줄의 세 칸을, 가운데 칸을 두 번째로 불러요." : "상대가 선언 중이에요 — 나온 답을 기억해 두세요.";
      why = `${opt0(V).limit || 10}초 안에 못 부르면 −1 · 이미 나온 답(이번 라운드 ${V.found.length}개${V.found.length ? ": " + V.found.map(f => lineTxt(f.k)).join(" · ") : ""})도 오답이에요.`;
    } else if (V.phase === "show") {
      rec = "결과를 보는 중 — 곧 버저를 다시 견줘요.";
      why = V.last && V.last.ok ? `정답이 하나 줄었어요 (지금까지 ${V.found.length}개).` : `오답 −1 — 남은 정답 수는 그대로예요 (지금까지 ${V.found.length}개).`;
    } else {
      const H = V.hist[V.hist.length - 1];
      rec = "다음 라운드는 새 판이에요 — 다시 외워요.";
      why = H ? `이번 판 정답 ${H.ans.length}개: ${H.ans.map(k => `${lineTxt(k)}(${sumTxt(H.board, k)})`).join(" · ")} · 찾은 것 ${H.found.length}개.` : "";
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }
  const opt0 = V => V.opt || {};
  const sgn = x => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1);

  // ── 복기 고리 ── (끝난 뒤라 그 자리의 기억 풀 16칸 = 진짜 값으로 판정)
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    if (!myA || !Vb) return { sev: 0, why: "", my, best };
    const answers = K.poolAnswers(Vb), pool = []; (Vb.mem || []).forEach(x => { pool[x.c] = x.v; });
    const ex = answers.length ? `${lineTxt(answers[0])}(${LINE_SUM(pool, answers[0])})` : "";
    if (myA.t === "call") {
      const J = K.judgeFromPool(Vb, myA.c);
      if (J.why === "ok") return { sev: 0, why: `정답 — ${my.replace(" 선언", "")} 합 ${J.sum}`, my, best };
      if (J.why === "line") return { sev: 70, why: `일렬이 아닌 세 칸이라 오답 −1${ex ? ` · 정답 예: ${ex}` : ""}`, my, best };
      if (J.why === "dup") return { sev: 70, why: `이미 나온 답이라 오답 −1${ex ? ` · 남은 정답 예: ${ex}` : ""}`, my, best };
      if (J.why === "sum") return { sev: 80, why: `${J.vals.join("+")} = ${J.sum} ≠ 타깃 ${Vb.target} → −1${ex ? ` · 정답 예: ${ex}` : ""}`, my, best };
      return { sev: 10, why: "판의 일부를 몰라(외운 16칸 밖) 판정하지 않았어요", my, best };
    }
    if (myA.t === "timeout") return { sev: 65, why: `${(Vb.opt || {}).limit || 10}초 안에 못 불러 −1${ex ? ` · 정답 예: ${ex}` : ""}`, my, best };
    if (myA.t === "buzz" && bestA && bestA.t === "buzz") {
      const iP = myA.ms < NO, bP = bestA.ms < NO, hs = K.knownLines(Vb, K.PROF.hard, seat).sure, hk = hs.length ? hs[0] : -1;
      if (!iP && bP) return { sev: answers.length ? 40 : 20, why: `고급 AI 는 ${hk >= 0 ? lineTxt(hk) + `(${LINE_SUM(pool, hk)}) 줄` : "합이 맞는 줄"}을 외워 두고 ${secs(bestA.ms)}에 눌렀어요 — 맞히면 +1`, my, best };
      if (iP && !bP) return { sev: 25, why: `고급 AI 는 세 칸이 다 확실한 줄이 없어 넘겼어요 — 맞을 확률이 50% 아래면 버저는 손해 (기대 2p−1점)`, my, best };
      if (iP && bP && myA.ms > bestA.ms + 1500) return { sev: 15, why: `둘 다 누를 장면 — 고급 AI 는 ${secs(bestA.ms)}, 나는 ${secs(myA.ms)}`, my, best };
      return { sev: 5, why: "고급 AI 와 같은 판단이에요", my, best };
    }
    return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
  }
  const LINE_SUM = (pool, k) => `${K.LINES[k].c.map(i => pool[i]).join("+")}=${K.LINES[k].c.reduce((s, i) => s + pool[i], 0)}`;

  function result(V, me) {
    const H = V.hist || [], m = me >= 0 ? me : 0, o = 1 - m;
    const head = V.res ? (V.res.w < 0 ? `🤝 무승부 ${V.score[0]} : ${V.score[1]}` : `${me < 0 || me === V.res.w ? "🏆" : "😵"} ${me < 0 ? `${V.res.w + 1}번 승` : me === V.res.w ? "내 승" : "상대 승"} — ${V.score[m]} : ${V.score[o]}`) : "";
    const rows = H.map(h => `${h.r > V.R ? "연장" : h.r + "R"} 타깃 ${h.t} · 정답 ${h.ans.length}개 중 ${me >= 0 ? `나 ${h.found.filter(f => f.s === m).length} · 상대 ${h.found.filter(f => f.s === o).length}` : `${h.found.length}개 찾음`}`).join("<br>");
    return `${head}<br>${rows}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const demo = [2, 5, 1, 4, 3, 3, 2, 1, 6, 2, 1, 3, 4, 1, 2, 3, 6, 2, 4];
    const Vd = { board: demo };
    const tb = x => `<div class="hx-tut">${x}</div>`;
    const card = (t, sm) => `<div class="hx-top" style="width:min(100%,280px)"><div class="hx-sc"><small>나</small><b>0</b></div><div class="hx-tg${sm ? " look" : ""}"><small>${sm || "타깃 넘버"}</small><b>${t}</b></div><div class="hx-sc"><small>상대</small><b>0</b></div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "10라운드 · 점수 많으면 승", body: "라운드마다 <b>타깃 넘버</b>를 만드는 세 칸을 찾아 버저! <b>10라운드</b> 뒤 점수가 많은 사람이 이겨요 (같으면 연장).",
        boardHtml: tb(card(9) + boardHtml({}, {})), ms: 5200 },
      { tag: "STEP 2 · 준비물", title: "육각 칸 19개", body: "정육각형 칸 19개가 <b>3 · 4 · 5 · 4 · 3</b> 줄로 모인 판. 앞면은 <b>숫자</b>, 뒷면은 알파벳 <b>A~S</b>. 라운드마다 새 판이에요.",
        boardHtml: tb(boardHtml(Vd, { face: true })), ms: 5600 },
      { tag: "STEP 3 · 진행", title: "30초 외우고 → 덮고 → 타깃", body: "<b>30초</b> 동안 숫자를 보여 주고 뒷면으로 덮어요. 그다음 타깃 넘버가 나오면 <b>가로 · 대각선으로 이어진 세 칸</b>의 합이 타깃인 조합을 떠올려요.",
        boardHtml: tb(card(30, "외우는 시간") + boardHtml(Vd, { face: true })), ms: 6000 },
      { tag: "STEP 4 · 직접", title: "합이 9 인 세 칸", body: "타깃 <b>9</b> — 숫자를 보고 합이 9 인 <b>일렬 세 칸</b>을 차례로 눌러 봐요 (가운데 칸은 두 번째로).",
        interactive: { hint: "👆 B → F → K (5+3+1)", doneText: "✅ 정답 +1! 실제 게임에선 숫자가 가려진 채로 불러요" },
        render(stage, ctrl) {
          let sel = [], got = [], done = false, msg = "타깃 9 — 세 칸을 골라요";
          const target = [1, 5, 10];       // B F K = 5 + 3 + 1
          const draw = () => {
            const hl = {}; if (done) got.forEach(i => { hl[i] = "hit"; });
            stage.innerHTML = `<div class="hx-tut">${card(9)}${boardHtml(Vd, { face: true, pick: !done, sel: done ? [] : sel, hl, lines: done ? [[K.LINE_OF.get(got.join(",")), "#4ade80"]] : [] })}<div class="hx-tmsg">${msg}</div></div>`;
            if (!done) { const j = sel.findIndex((x, i) => x !== target[i]); const nx = j >= 0 ? sel[j] : target[sel.length]; const b = stage.querySelector(`[data-c="${nx}"]`); if (b) b.setAttribute("data-tp", "1"); }
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-c]"); if (!t) return;
            const i = +t.dataset.c, k = sel.indexOf(i);
            if (k >= 0) { sel.splice(k, 1); ctrl.sfx("tap"); draw(); return; }
            sel.push(i); ctrl.sfx("tap");
            if (sel.length < 3) { msg = `${sel.map(x => LET[x]).join(" → ")} …`; draw(); return; }
            const line = K.LINE_OF.get(sel.join(","));
            const s = sel.reduce((a, x) => a + demo[x], 0);
            if (line === undefined) { msg = `${sel.map(x => LET[x]).join("")}${eunL(LET[sel[2]])} 일렬이 아니에요 — 다시!`; sel = []; draw(); return; }
            if (s !== 9) { msg = `${sel.map(x => demo[x]).join("+")} = ${s} — 9 가 아니에요 (실제 게임이면 −1). 다시!`; sel = []; draw(); return; }
            done = true; got = sel.slice(); ctrl.sfx("win"); msg = `🎉 <b>${sel.map(x => LET[x]).join("")}</b> = ${sel.map(x => demo[x]).join("+")} = 9 정답!`; draw(); ctrl.complete();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "정답 +1 · 오답 −1", body: "먼저 버저를 누른 사람이 <b>10초</b> 안에 알파벳 세 개로 선언해요. 정답 <b>+1</b>, 오답 <b>−1</b> — 이미 나온 답 · 일렬이 아닌 세 칸 · 시간 초과도 오답이에요. 모르면 <b>넘기기</b>.",
        boardHtml: tb(`<div class="hx-row" style="width:min(100%,280px)"><button type="button" class="hx-buzz" tabindex="-1">🔔 버저!</button><button type="button" class="hx-pass" tabindex="-1">모르겠어요<br>(넘기기)</button></div>`), ms: 6000 },
      { tag: "STEP 6 · 특수 규칙", title: "정답 수는 비밀", body: "선언한 칸은 열지 않고, 나온 정답도 판에 안 적어요 — <b>외워 둬야</b> 해요. 정답이 몇 개인지는 비밀이고, 다 나오거나 아무도 안 누르면 라운드가 끝나요. 🧑‍🏫 선생님은 외우는 동안 <b>줄 합</b>을 세어 알려 줘요.",
        boardHtml: tb(boardHtml(Vd, { face: true, hl: { 1: "ans", 5: "ans", 10: "ans" }, lines: [[K.LINE_OF.get("1,5,10"), "#facc15", true]] })), ms: 6400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.hexagon = {
    name: "헥사곤", emoji: "🔷", short: "30초 외운 육각 판 19칸 — 합이 타깃인 일렬 세 칸을 버저로, 10라운드", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [
      { k: "look", label: "외우는 시간", items: [[30, "30초 (방송)"], [45, "45초"], [60, "60초"]], def: 30 },
      { k: "rounds", label: "라운드", items: [[10, "10라운드 (방송)"], [5, "5라운드"]], def: 10 },
      { k: "limit", label: "선언 제한", items: [[10, "10초 (방송)"], [15, "15초"]], def: 10 },
      { k: "aid", label: "나온 정답 보기", items: [[1, "켬"], [0, "끔 (방송)"]], def: 1 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 라운드마다 <b>타깃 넘버</b>를 만드는 세 칸을 찾아 점수 — <b>10라운드</b> 뒤 점수가 많은 사람 승 (같으면 연장)",
      "준비물: 정육각형 칸 <b>19개</b> (3 · 4 · 5 · 4 · 3 줄). 앞면 숫자 · 뒷면 알파벳 <b>A~S</b>, 라운드마다 새 판",
      "진행: <b>30초</b> 동안 숫자를 보여 주고 덮음 → 타깃 넘버 공개 → <b>가로 · 대각선으로 이어진 세 칸</b>의 합이 타깃인 조합을 알면 버저 → <b>10초</b> 안에 알파벳 세 개로 선언 (가운데 칸은 가운데로)",
      "승패: 정답 <b>+1</b> · 오답 <b>−1</b> (이미 나온 답 · 일렬 아님 · 시간 초과도 오답)",
      "특수: 선언한 칸은 열지 않고 나온 정답도 판에 안 적음 · 정답 수는 비밀 · 정답이 다 나오거나 아무도 안 누르면 라운드 끝 · 한 라운드에 선언이 <b>30번</b>을 넘으면 그 라운드는 끝 (끝없는 라운드를 막는 상한)",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => V.over ? "끝" : V.round > V.R ? `연장 ${V.round - V.R}` : `${V.round}/${V.R}라운드`,
    chip: (V, i) => ({ t: `⭐${num(V.score[i])}`, on: !V.over && (V.phase === "call" ? V.caller === i : V.needs.includes(i)), out: false }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me) => K.ai(V, me, "normal"),
  };
})();

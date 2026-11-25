/* 베니 서바이벌 · 미스터리 사인 — 화면 (문제 a ❓ b = ? · 힌트 판 · 숫자 키패드 · 버저 1분 · 정답 쓰기 · 아이템)
   시계는 UI 만 가져요: 버저 시각(ms)은 힌트가 열린 순간부터 재서 행동에 실어 보내고({t:"buzz", ms}), 1분이 지나면 넘기기({t:"buzz", ms:99999}), 답 쓰기 제한이 끝나면 {t:"timeout"} 을 보내요. */
(() => {
  "use strict";
  const G = window.SVCores["gn-mysterysign"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NO = G.NO_BUZZ, WIN = G.WINDOW, LOCK = 650, ANS_LIMIT = 40000;
  const IC = { double: "✖2", safe: "🛡️", secret: "🔒" };
  const IDESC = { double: "이 라운드 정답의 승점이 2배", safe: "이 라운드 오답에 감점이 없어요", secret: "첫 힌트에서 내 숫자를 상대에게 감춰요" };
  const CSS = `
.ms-top{display:grid;grid-template-columns:70px 1fr 70px;gap:6px;flex:none}
.ms-sc{border-radius:14px;background:rgba(0,0,0,.32);border:1.5px solid rgba(255,255,255,.14);display:grid;place-items:center;align-content:center;padding:3px 2px;min-width:0;height:52px}
.ms-sc small{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.ms-sc b{font:900 24px/1.05 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.ms-sc.me{border-color:#86efac}
.ms-sc.on{box-shadow:0 0 0 2px var(--gold)}
.ms-mid{border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.34),rgba(0,0,0,.38));border:1.5px solid rgba(196,181,253,.55);display:grid;place-items:center;align-content:center;padding:3px;text-align:center;height:52px;min-width:0}
.ms-mid small{font:700 10.5px var(--round);color:#ddd6fe;white-space:nowrap}
.ms-mid b{font:900 20px/1.1 var(--round);color:#fff}
.ms-it{display:flex;justify-content:space-between;gap:6px;flex:none;font:700 11px var(--round);color:var(--soft);min-height:20px}
.ms-it span{display:inline-flex;gap:4px;align-items:center;min-width:0}
.ms-it i{font-style:normal;white-space:nowrap;padding:1px 6px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:var(--ink);font-weight:800}
.ms-it i.act{background:rgba(251,191,36,.24);border-color:#fbbf24;color:#fde68a}
.ms-q{flex:none;display:flex;justify-content:center;align-items:center;gap:10px;padding:4px 6px;border-radius:16px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.14);font:900 34px/1.1 var(--round);color:#fff;font-variant-numeric:tabular-nums;min-height:54px}
.ms-q .sg{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:11px;background:linear-gradient(145deg,#7c3aed,#4c1d95);box-shadow:0 3px 0 #2e1065;font-size:26px}
.ms-q .eq{color:var(--soft)}.ms-q .a{color:#fde68a}
.ms-hs{flex:1 1 0;min-height:46px;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:row;gap:3px 6px;align-content:start;overflow:hidden;padding:5px 6px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.12);font:800 15px/1.2 var(--round)}
.ms-hs.empty{display:grid;place-items:center;color:var(--soft);font-size:12.5px;grid-template-columns:1fr}
.ms-hs.r8{font-size:11.5px;gap:1px 6px}.ms-hs.r6{font-size:12.5px;gap:2px 6px}.ms-hs.r4{font-size:14px}
.ms-h{display:flex;align-items:center;gap:4px;white-space:nowrap;min-width:0;background:rgba(255,255,255,.06);border-radius:8px;padding:1px 6px;justify-content:center}
.ms-h .sg{font-style:normal;font-size:.8em}.ms-h .v{color:#fde68a}.ms-h .lk{font-size:.75em}.ms-h.new{animation:msIn .35s ease both}.ms-h .mk{color:var(--soft);font-weight:700}
.ms-st{flex:none;text-align:center;font:700 13px/1.35 var(--round);color:var(--ink);min-height:36px;display:grid;place-items:center;align-content:center}
.ms-st b{color:#fde68a}
.ms-buf{flex:none;display:flex;gap:8px;align-items:center;justify-content:center;height:40px;border-radius:12px;background:rgba(0,0,0,.3);border:2px solid #fde68a;font:900 24px var(--round);color:#fff;font-variant-numeric:tabular-nums;letter-spacing:1px;overflow:hidden}
.ms-buf small{font:700 11px var(--round);color:var(--soft);letter-spacing:0}
.ms-buf.empty{color:rgba(255,255,255,.35);font-size:15px;border-color:rgba(255,255,255,.2)}
.ms-pad{flex:none;display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.ms-pad button{height:36px;border-radius:10px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:900 18px var(--round);touch-action:manipulation;cursor:pointer;min-width:0;padding:0}
.ms-pad button:active{transform:scale(.94);background:rgba(253,230,138,.25)}
.ms-pad button.go{grid-column:span 3;background:linear-gradient(180deg,#a78bfa,#6d28d9);border-color:#c4b5fd;font-size:16px}
.ms-pad button.go:disabled{opacity:.4}
.ms-pad button.fn{color:#fde68a}
.ms-act{display:flex;gap:8px;flex:none;align-items:stretch}
.ms-act .ms-buzz{flex:1;min-width:0}
.ms-act .ms-pass{flex:none;width:96px;padding:4px;line-height:1.2}
.ms-act.loc .ms-pass{width:72px}
.ms-act.loc .ms-buzz{font-size:15px;line-height:1.15;padding:0 4px}
.ms-buzz{height:62px;border-radius:18px;border:0;background:linear-gradient(180deg,#fb7185,#be123c);color:#fff;font:900 20px var(--round);box-shadow:0 6px 0 #881337,0 10px 18px rgba(0,0,0,.4);touch-action:manipulation;cursor:pointer;user-select:none;-webkit-user-select:none}
.ms-buzz:active,.ms-buzz.hit{transform:translateY(4px);box-shadow:0 2px 0 #881337}
.ms-buzz.lock{opacity:.35;animation:msUnlock .2s ease var(--d,0ms) both}
.ms-buzz.nolock{animation:none}
.ms-buzz.b2{background:linear-gradient(180deg,#60a5fa,#1d4ed8);box-shadow:0 6px 0 #1e3a8a,0 10px 18px rgba(0,0,0,.4)}
.ms-buzz.b2:active,.ms-buzz.b2.hit{box-shadow:0 2px 0 #1e3a8a}
.ms-pass{border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:var(--ink);border-radius:12px;font:800 13px var(--round);padding:8px 10px;cursor:pointer;min-height:40px}
.ms-bar{height:7px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}
.ms-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#fde68a,#fb7185);transform-origin:left}
.ms-res{flex:none;text-align:center;padding:6px 8px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);font:800 15px/1.35 var(--round)}
.ms-res.ok{border-color:#4ade80;color:#bbf7d0;background:rgba(34,197,94,.14)}
.ms-res.no{border-color:#f87171;color:#fecaca;background:rgba(248,113,113,.1)}
.ms-res small{display:block;font:600 12px/1.35 var(--round);color:var(--soft)}
.ms-items{flex:none;display:grid;gap:6px}
.ms-ichip{display:flex;align-items:center;gap:8px;text-align:left;padding:7px 10px;border-radius:12px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:var(--ink);font:800 14px var(--round);cursor:pointer;min-height:44px}
.ms-ichip small{display:block;font:600 11.5px var(--round);color:var(--soft)}
.ms-ichip b{font:900 18px var(--round);min-width:34px;text-align:center}
.ms-ichip.on{border-color:#fbbf24;background:rgba(251,191,36,.2);color:#fff}
.ms-go{height:46px;border-radius:14px;border:0;background:linear-gradient(180deg,#a78bfa,#6d28d9);color:#fff;font:900 16px var(--round);box-shadow:0 4px 0 #3b0764;cursor:pointer;touch-action:manipulation}
.ms-spy{flex:none;text-align:center;font:700 11.5px var(--round);color:#c4b5fd}
.ms-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.ms-tut .ms-q{width:min(100%,260px)}
.ms-tut .ms-hs{width:min(100%,260px);flex:none;min-height:0}
.ms-tut .ms-buzz{width:170px;height:50px;font-size:17px}
.ms-tut .ms-pad{width:min(100%,280px)}
.ms-tut .ms-buf{width:min(100%,260px)}
@keyframes msIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
@keyframes msUnlock{from{opacity:.35}to{opacity:1}}
@media (max-height:700px){.ms-q{font-size:30px;min-height:48px}.ms-q .sg{width:38px;height:38px;font-size:22px}.ms-sc,.ms-mid{height:46px}.ms-buzz{height:56px}.ms-st{min-height:32px;font-size:12.5px}.ms-pad button{height:34px}.ms-buf{height:36px}.ms-res{padding:4px 8px;font-size:14px}}
.sv-coachfit .ms-q{font-size:24px;min-height:40px}
.sv-coachfit .ms-q .sg{width:32px;height:32px;font-size:18px}
.sv-coachfit .ms-sc,.sv-coachfit .ms-mid{height:40px}
.sv-coachfit .ms-sc b{font-size:19px}
.sv-coachfit .ms-st{min-height:0;font-size:11.5px;line-height:1.3}
.sv-coachfit .ms-pad button{height:30px;font-size:16px}
.sv-coachfit .ms-buf{height:32px;font-size:20px}
.sv-coachfit .ms-buzz{height:46px;font-size:17px}
.sv-coachfit .ms-it{display:none}
.sv-coachfit .ms-res{padding:3px 6px;font-size:12.5px}.sv-coachfit .ms-res small{font-size:10.5px}
.sv-coachfit .ms-pass{min-height:0;padding:3px 6px;font-size:12px}
.sv-coachfit .ms-ichip{min-height:34px;padding:3px 8px}.sv-coachfit .ms-ichip small{display:none}
.sv-coachfit .ms-go{height:38px}
.sv-coachfit .ms-act.loc .ms-buzz{font-size:13px}
@media (max-width:400px){.ms-top{grid-template-columns:62px 1fr 62px}.ms-sc b{font-size:21px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는");
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const secs = ms => (ms >= NO ? "안 누름" : (ms / 1000).toFixed(1) + "초");
  const SG = `<i class="sg">❓</i>`;

  // ── 이 화면의 시계 · 입력 (한 판 안에서 단계가 바뀌면 새로 시작) ──
  const S = { pk: "", armed: "", stage: null, ctx: null, V: null, tm: 0, iv: 0, t0: 0, dl: 0, buf: "", sel: [], asg: {}, sent: false, lockUntil: 0, seen: 0 };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected) { clearInterval(S.iv); S.iv = 0; return; }
    const bar = st.querySelector("[data-bar]");
    if (!bar || !S.dl) return;
    const left = Math.max(0, S.dl - nowMs()), dur = +bar.dataset.bar || 1;
    bar.firstElementChild.style.transform = `scaleX(${Math.min(1, left / dur)})`;
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = nowMs() + ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 100);
  }
  const whenAct = (fn, tries) => { const c = S.ctx; if (c && c.canAct) return fn(); if ((tries == null ? 12 : tries) > 0) { const pk = S.pk; setTimeout(() => { if (S.pk === pk) whenAct(fn, (tries == null ? 12 : tries) - 1); }, 250); } };
  const humans = ctx => [0, 1].filter(i => ctx.seats && ctx.seats[i] && ctx.seats[i].kind !== "ai" && !ctx.seats[i].sub);
  // 한 기기(두 사람): 한 사람이 누르면 그 시각, 다른 사람은 '못 누름' — 차례인 자리부터 한 행동씩 보냄
  function flushLocal() {
    for (let n = 0; n < 2; n++) {
      const c = S.ctx, V = S.V; if (!c || !c.canAct || !V || V.phase !== "buzz") return;
      const s = c.me, ms = S.asg[s]; if (ms == null) return;
      S.asg[s] = null; const r = c.act({ t: "buzz", ms }); if (!r || !r.ok) return;
    }
  }
  function pressBuzz(seat) {
    const c = S.ctx, V = S.V; if (!c || !V || V.phase !== "buzz" || S.sent) return;
    const t = nowMs();
    if (t < S.lockUntil) return;                                  // 힌트가 열리기 전에 누른 건 그냥 무시
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
  function keyIn(k) {
    const V = S.V, c = S.ctx; if (!V || !c || !c.canAct) return;
    const pick = V.phase === "pick", maxLen = pick ? 7 : 20;
    if (k === "back") S.buf = S.buf.slice(0, -1);
    else if (k === "neg") { if (!pick) S.buf = S.buf.startsWith("-") ? S.buf.slice(1) : "-" + S.buf; }
    else if (/^\d$/.test(k)) {
      const neg = S.buf.startsWith("-"), digits = S.buf.replace("-", "");
      if (digits.length >= maxLen) return;
      if (pick && digits === "" && k === "0") return;            // 힌트 숫자는 0으로 시작할 수 없어요
      if (digits === "0") S.buf = (neg ? "-" : "") + k; else S.buf += k;
    }
    c.sfx("tap"); render(S.stage, V, c);
  }
  function sendBuf() {
    const V = S.V, c = S.ctx; if (!V || !c || !c.canAct) return;
    if (V.phase === "pick") { const n = G.normNum(S.buf); if (!n) { c.toast && c.toast("0 을 뺀 1 ~ 9999999 의 숫자를 써요"); return; } S.buf = ""; clearTimers(); c.sfx("pop"); c.act({ t: "num", n }); return; }
    if (V.phase === "ans" || V.phase === "ans2") { const n = G.normAns(S.buf); if (n === null) { c.toast && c.toast("정답을 숫자로 써요"); return; } S.buf = ""; clearTimers(); c.sfx("pop"); c.act({ t: "ans", n }); }
  }

  // ── 그리기 ──
  // 힌트의 숫자 한 칸 — sec: 이 숫자를 낸 사람이 시크릿을 썼는지 · hide: 이 화면에서는 감춰야 하는지
  function numHtml(v, sec, hide) {
    if (hide || v === null || v === undefined) return `<span class="mk">${sec ? "🔒" : "?"}</span>`;
    return `<b>${esc(v)}</b>${sec ? `<span class="lk">🔒</span>` : ""}`;
  }
  // who: 이 화면을 보는 자리 (-1 = 구경 · 전부 보임, -2 = 한 기기 두 사람이 같이 보는 화면 · 시크릿 숫자는 전부 감춤)
  function hintsHtml(V, who) {
    const H = V.hints;
    if (!H.length) return `<div class="ms-hs empty">아직 힌트가 없어요 — 숫자를 하나씩 내면 첫 힌트가 열려요</div>`;
    const rows = Math.ceil(H.length / 2), cls = rows <= 3 ? "" : rows <= 4 ? "r4" : rows <= 6 ? "r6" : "r8";
    return `<div class="ms-hs ${cls}">${H.map((h, k) => {
      const sa = !!h.sec[h.f], sb = !!h.sec[1 - h.f], hide = (sec, seat) => sec && who !== -1 && (who === -2 || seat !== who);
      return `<div class="ms-h${k === H.length - 1 && S.seen !== H.length ? " new" : ""}">${numHtml(h.a, sa, hide(sa, h.f))}${SG}${numHtml(h.b, sb, hide(sb, 1 - h.f))}<span>=</span><b class="v">${esc(h.v)}</b></div>`;
    }).join("")}</div>`;
  }
  const padHtml = (ans, ok) => `<div class="ms-pad">${"1234567890".split("").map(d => `<button type="button" data-k="${d}">${d}</button>`).join("")}${ans ? `<button type="button" class="fn" data-k="neg">−</button>` : `<button type="button" class="fn" disabled style="opacity:.25">·</button>`}<button type="button" class="fn" data-k="back">⌫</button><button type="button" class="go" data-a="send"${ok ? "" : " disabled"}>보내기</button></div>`;
  function itemsRow(V, ctx, L, R, watch, local) {
    const compact = ITEMS_OF(V, 0).length + ITEMS_OF(V, 1).length > 4;     // 양쪽에 아이템이 많으면 이름 없이 그림만
    const grp = i => {
      const it = ITEMS_OF(V, i);
      return `<span>${it.length ? it.map(x => `<i class="${x.act ? "act" : ""}" title="${esc(G.ITEM_NAME[x.k])}">${IC[x.k]}${compact ? "" : ` ${esc(G.ITEM_NAME[x.k])}`}</i>`).join("") : "아이템 없음"}</span>`;
    };
    return `<div class="ms-it">${grp(L)}${grp(R)}</div>`;
  }
  const ITEMS_OF = (V, i) => G.ITEMS.filter(k => V.items[i][k] || V.ri[k][i]).map(k => ({ k, act: !!V.ri[k][i] }));
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, local = ctx.mode === "local", watch = ctx.mode === "watch" || me < 0;
    const pk = `${ctx.g}|${V.round}|${V.phase}|${V.hintNo}|${V.tries}|${V.pend ? 1 : 0}`;
    if (pk !== S.pk) {
      const phaseOnly = S.pk.split("|").slice(0, 4).join("|") === pk.split("|").slice(0, 4).join("|");   // 같은 단계 안에서 pend 만 바뀐 경우는 입력칸을 지우지 않음
      S.pk = pk; clearTimers(); S.armed = ""; S.sent = false; S.dl = 0; S.asg = {};
      if (!phaseOnly || V.phase !== "pick") S.buf = ""; if (V.phase === "item") S.sel = [];
      const t = nowMs(), lock = ctx.fast || watch ? 0 : LOCK;
      S.t0 = t + lock; S.lockUntil = t + lock;
    }
    const L = !watch && !local ? me : 0, R = 1 - L, canAct = !!ctx.canAct, who = watch ? -1 : local ? (V.phase === "item" || V.phase === "pick" ? me : -2) : me;
    const label = i => (!watch && !local && i === me ? "나" : esc(nameOf(ctx, i)));
    const subj = i => (!watch && !local && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const turn = i => V.needs.includes(i);
    const scoreBox = i => `<div class="ms-sc${!watch && !local && i === me ? " me" : ""}${turn(i) && !V.over ? " on" : ""}"><small>${label(i)}</small><b>${V.score[i]}</b></div>`;
    const rem = Math.max(0, S.lockUntil - nowMs());
    const lkc = rem > 0 ? " lock" : " nolock", lks = rem > 0 ? ` style="--d:${Math.round(rem)}ms"` : "";
    const mid = `<div class="ms-mid"><small>${V.round}/${V.rounds}라운드</small><b>힌트 ${Math.max(1, V.hintNo)}</b><small>최대 ${V.maxHints}개</small></div>`;
    const pq = V.problem || { a: "?", b: "?" };
    const q = `<div class="ms-q"><span class="a">${esc(pq.a)}</span><span class="sg">❓</span><span class="a">${esc(pq.b)}</span><span class="eq">=</span><span>?</span></div>`;
    let st = "", actH = "";
    const frontName = V.front === me && !watch && !local ? "내가" : `${esc(nameOf(ctx, V.front))}${iga(nameOf(ctx, V.front))}`;
    const myTurn = canAct && V.needs.includes(me);
    if (V.phase === "item") {
      const mine = V.items[me] || {};
      if (watch) st = `<span>🎒 두 사람이 아이템을 고르는 중…</span>`;
      else if (myTurn) {
        st = `<span>🎒 이번 라운드에 쓸 <b>아이템</b>을 골라요 <small>(한 번씩만 쓸 수 있어요)</small></span>`;
        const have = G.ITEMS.filter(k => mine[k]);
        actH = `<div class="ms-items">${have.map(k => `<button type="button" class="ms-ichip${S.sel.includes(k) ? " on" : ""}" data-item="${k}"><b>${IC[k]}</b><span>${esc(G.ITEM_NAME[k])}<small>${IDESC[k]}</small></span></button>`).join("")}</div><button type="button" class="ms-go" data-a="itemgo">${S.sel.length ? "골라 둔 아이템을 쓰고 시작" : "아이템 없이 시작"}</button>`;
      } else st = `<span>🎒 ${esc(local ? "" : "")}상대가 아이템을 고르는 중…</span>`;
    } else if (V.phase === "pick") {
      const isBack = !!V.pend;
      const sec1 = V.hintNo === 1 && V.ri.secret.some(x => x);
      if (watch) st = `<span>✏️ ${subj(isBack ? 1 - V.front : V.front)} 힌트 숫자를 고르는 중…</span>`;
      else if (myTurn) {
        const pn = V.pend ? (V.pend.n === null || (local && sec1 && V.ri.secret[V.pend.s]) ? "비공개(시크릿)" : V.pend.n) : null;
        st = isBack ? `<span>✏️ 선 ${subj(V.front)} 낸 숫자는 <b>${esc(pn)}</b> — 내 숫자는 <b>뒤</b>에 들어가요</span>` : `<span>✏️ 내가 <b>선</b> — 내 숫자가 <b>앞</b>에 들어가요 <small>(0 은 빼고 1~9999999)</small></span>`;
        actH = `<div class="ms-buf${S.buf ? "" : " empty"}"><small>${isBack ? "뒤" : "앞"}</small>${S.buf ? esc(S.buf) : "숫자를 눌러요"}</div>${padHtml(false, !!G.normNum(S.buf))}`;
      } else st = `<span>✏️ ${isBack ? "내 숫자가 앞에 이미 들어갔어요 — 상대가 뒤 숫자를 고르는 중…" : "선 상대가 숫자를 고르는 중… (내 숫자는 뒤에 들어가요)"}</span>`;
    } else if (V.phase === "buzz") {
      if (watch) st = `<span>🔔 두 사람이 규칙을 찾는 중…</span>`;
      else if (local) {
        const hs = humans(ctx), done = i => !V.needs.includes(i);
        if (!canAct || hs.every(done)) st = `<span>🔔 버저를 견주는 중…</span>`;
        else { st = `<span>🔔 규칙을 찾았으면 <b>먼저 버저!</b> 먼저 누른 사람이 정답을 대요 (1분)</span>`; actH = `<div class="ms-bar" data-bar="${ctx.fast ? 4000 : WIN}"><i></i></div><div class="ms-act loc"><button type="button" class="ms-buzz${lkc}"${lks} data-buzz="${hs[0]}">🔔 ${esc(nameOf(ctx, hs[0]))}<br>버저!</button><button type="button" class="ms-pass" data-a="pass">둘 다<br>패스</button><button type="button" class="ms-buzz b2${lkc}"${lks} data-buzz="${hs[1]}">🔔 ${esc(nameOf(ctx, hs[1]))}<br>버저!</button></div>`; }
      } else if (V.mine) st = `<span>✅ 눌렀어요! 상대와 시간을 견주는 중…</span>`;
      else if (canAct) { st = `<span>🔔 규칙을 찾았으면 <b>먼저 버저!</b> 모르겠으면 넘기고 다음 힌트를 봐요 (1분)</span>`; actH = `<div class="ms-bar" data-bar="${ctx.fast ? 4000 : WIN}"><i></i></div><div class="ms-act"><button type="button" class="ms-buzz${lkc}"${lks} data-buzz="${me}">🔔 버저!</button><button type="button" class="ms-pass" data-a="pass">모르겠어요<br>(다음 힌트)</button></div>`; }
      else st = `<span>…</span>`;
    } else if (V.phase === "ans" || V.phase === "ans2") {
      const bz = V.phase === "ans" ? V.log.slice().reverse().find(e => e.k === "buzz" && e.r === V.round && e.h === V.hintNo && e.w >= 0) : null;
      const bzTxt = bz ? `🔔 ${subj(bz.w)} 먼저 눌렀어요 (${secs(bz.ms[bz.w])}${bz.ms[1 - bz.w] < NO ? ` · 상대 ${secs(bz.ms[1 - bz.w])}` : ""}) — ` : "";
      const lastTxt = V.phase === "ans2" && V.last ? `❌ ${subj(V.last.s)} ${V.last.n === null ? "시간 안에 못 썼어요" : "틀렸어요"} — ` : "";
      const wr = V.wrong.length ? ` <small>이미 틀린 답: ${esc(V.wrong.join(" · "))}</small>` : "";
      if (myTurn) {
        st = `<span>${bzTxt}${lastTxt}<b>${local ? esc(nameOf(ctx, me)) + " 님 " : ""}정답</b>을 써요 ${V.phase === "ans" ? "<small>(틀리면 −1)</small>" : "<small>(자신 없으면 넘겨도 돼요)</small>"}${wr}</span>`;
        actH = `<div class="ms-bar" data-bar="${ctx.fast ? 5000 : ANS_LIMIT}"><i></i></div><div class="ms-buf${S.buf ? "" : " empty"}"><small>정답</small>${S.buf ? esc(S.buf) : "숫자를 눌러요"}</div>${padHtml(true, G.normAns(S.buf) !== null)}${V.phase === "ans2" ? `<button type="button" class="ms-pass" data-a="apass">넘기기 (감점 없음)</button>` : ""}`;
      } else st = `<span>${bzTxt}${lastTxt}${watch || local ? esc(nameOf(ctx, V.caller)) : subj(V.caller)} 정답을 쓰는 중이에요…${wr}</span>`;
    } else {   // show · end
      const Lc = V.last;
      if (Lc) {
        const w = Lc.s >= 0 ? subj(Lc.s) : "", rule = Lc.end && Lc.rule !== undefined ? `<small>🔎 숨은 규칙: ${esc(G.RULES[Lc.rule].txt)} → 정답 <b>${esc(Lc.ans)}</b></small>` : "";
        if (Lc.hit) st = `<div class="ms-res ok">🎉 ${w} 정답 <b>${esc(Lc.n)}</b>! +${Lc.gain}점${Lc.mult === 2 ? " (더블 스코어 ×2)" : ""}${rule}<small>${V.over ? "" : "다음 라운드로 넘어가요"}</small></div>`;
        else if (Lc.void) st = `<div class="ms-res no">😶 힌트 ${Lc.h}개를 다 열어도 아무도 못 맞혔어요${rule}<small>이번 라운드는 점수 없이 넘어가요</small></div>`;
        else st = `<div class="ms-res no">${Lc.tmo ? `⏱ ${w} 시간 안에 답을 못 썼어요` : `❌ ${w} <b>${esc(Lc.n)}</b> — 오답`} ${Lc.gain ? `${Lc.gain}점` : "· 감점 없음"}<small>${Lc.stage === 1 ? `기회가 ${esc(watch || local ? nameOf(ctx, 1 - Lc.s) : (1 - Lc.s) === me ? "나" : nameOf(ctx, 1 - Lc.s))}에게 넘어가요` : "아무도 못 맞혀서 다음 힌트로 넘어가요"}</small></div>`;
      } else st = V.over ? `<span>끝났어요</span>` : `<span>…</span>`;
    }
    const spy = watch && V.rule ? `<div class="ms-spy">🔎 숨은 규칙: ${esc(V.rule.txt)} (정답 ${esc(V.rule.ans)})</div>` : "";
    stage.innerHTML = `<div class="ms-top">${scoreBox(L)}${mid}${scoreBox(R)}</div>${itemsRow(V, ctx, L, R, watch, local)}${q}${hintsHtml(V, who)}<div class="ms-st">${st}</div>${spy}${actH}`;
    S.seen = V.hints.length;
    // 시계 · 누르기 연결
    const fresh = S.armed !== pk;
    if (canAct && fresh) {
      if (V.phase === "buzz" && !V.mine) { S.armed = pk; arm(ctx.fast ? 4000 : WIN, () => whenAct(passBuzz)); }
      else if ((V.phase === "ans" || V.phase === "ans2") && V.caller === me) { S.armed = pk; arm(ctx.fast ? 5000 : ANS_LIMIT, () => whenAct(() => { S.buf = ""; const c = S.ctx; if (c && c.canAct) c.act({ t: S.V.phase === "ans" ? "timeout" : "pass" }); })); }
    }
    stage.onpointerdown = e => {
      const b = e.target.closest("[data-buzz]"); if (!b) return;
      e.preventDefault(); b.classList.add("hit"); pressBuzz(+b.dataset.buzz);
    };
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.buzz != null) { if (!S.sent) { t.classList.add("hit"); pressBuzz(+t.dataset.buzz); } return; }
      if (t.dataset.k != null) { keyIn(t.dataset.k); return; }
      if (t.dataset.item) { const k = t.dataset.item, i = S.sel.indexOf(k); if (i >= 0) S.sel.splice(i, 1); else S.sel.push(k); ctx.sfx("tap"); render(S.stage, V, ctx); return; }
      const a = t.dataset.a;
      if (a === "pass") passBuzz();
      else if (a === "send") sendBuf();
      else if (a === "itemgo") { const use = S.sel.slice(); S.sel = []; clearTimers(); ctx.sfx("pop"); ctx.act({ t: "item", use }); }
      else if (a === "apass") { clearTimers(); ctx.act({ t: "pass" }); }
    };
  }
  const result = (V, me) => {
    const H = V.hist || [], mine = me >= 0 ? H.filter(h => h.w === me).length : 0, voids = H.filter(h => h.w < 0).length;
    return `<b>${V.round}라운드</b> · 최종 ${V.score[0]} : ${V.score[1]}${me >= 0 ? ` · 내가 맞힌 라운드 ${mine}번` : ""}${voids ? ` · 무효 ${voids}번` : ""}<br>숨은 규칙 ${H.map(h => G.RULES[h.rule].name).join(" · ")}`;
  };

  // ── 규칙 단계 (방송 규칙 영상 순서) ──
  const tq = (a, b, r) => `<div class="ms-q"><span class="a">${a}</span><span class="sg">❓</span><span class="a">${b}</span><span class="eq">=</span><span>${r === undefined ? "?" : r}</span></div>`;
  const th = (rows) => `<div class="ms-hs">${rows.map(r => `<div class="ms-h"><b>${r[0]}</b>${SG}<b>${r[1]}</b><span>=</span><b class="v">${r[2]}</b></div>`).join("")}</div>`;
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 문제", title: "두 숫자와 미스터리 사인 ❓", body: "결승 두 번째 게임이에요. <b>11라운드</b> 동안 라운드마다 <b>두 개의 숫자와 미스터리 사인</b>으로 된 문제가 열려요. 두 분은 <b>숨은 규칙</b>을 찾아내서 문제의 정답을 맞혀요.",
        boardHtml: `<div class="ms-tut">${tq(22, 7)}<small>숨은 규칙은 ❓ 자리에 들어가는 계산이에요</small></div>`, ms: 6400 },
      { tag: "STEP 2 · 힌트", title: "0을 뺀 숫자를 하나씩 내면 힌트", body: "두 사람이 <b>0을 제외한 숫자</b>를 하나씩 내요. 힌트는 문제와 <b>같은 규칙</b>에 <b>선 플레이어의 숫자는 앞, 후 플레이어의 숫자는 뒤</b>에 넣은 답이에요. 예를 들어 규칙이 <b>'두 수를 각각 제곱해서 더한 값'</b>이고 선이 9, 후가 11을 냈다면 9² + 11² = <b>202</b> 가 첫 힌트예요.",
        boardHtml: `<div class="ms-tut">${tq(3, 5)}${th([[9, 11, 202]])}<small>이 힌트로 규칙을 찾으면 3² + 5² = ? 를 구할 수 있어요</small></div>`, ms: 7600 },
      { tag: "STEP 3 · 직접 해 보기", title: "힌트에서 규칙을 찾아 정답을!", body: "힌트 <b>9 ❓ 11 = 202</b> 에서 규칙을 찾았다면 문제 <b>3 ❓ 5</b> 의 정답은 무엇일까요?",
        interactive: { hint: "👆 정답을 눌러 쓰고 '보내기'를 눌러요", doneText: "✅ 맞았어요! 3² + 5² = 34 예요 — 이렇게 힌트에서 규칙을 찾아요" },
        render(stage, ctrl) {
          let buf = "", solved = false, msg = "힌트 9 ❓ 11 = 202 를 보고 규칙을 떠올려 봐요";
          const draw = () => { stage.innerHTML = `<div class="ms-tut">${tq(3, 5)}${th([[9, 11, 202]])}<div class="ms-buf${buf ? "" : " empty"}"><small>정답</small>${buf || "숫자를 눌러요"}</div>${padHtml(true, /^-?\d+$/.test(buf))}<small>${msg}</small></div>`; };
          draw();
          stage.onclick = e => {
            const t = e.target.closest("button"); if (!t || solved || t.disabled) return;
            const k = t.dataset.k, a = t.dataset.a;
            if (k === "back") buf = buf.slice(0, -1); else if (k === "neg") buf = buf.startsWith("-") ? buf.slice(1) : "-" + buf; else if (k && buf.replace("-", "").length < 8) buf += k;
            else if (a === "send") {
              if (buf === "34") { solved = true; msg = "3² + 5² = 9 + 25 = 34 ✔"; draw(); ctrl.sfx("win"); ctrl.complete(); return; }
              msg = `${buf} 는 아니에요 — 9² + 11² = 202 처럼 각각 제곱해서 더해 봐요, 다시!`; buf = "";
            }
            ctrl.sfx("tap"); draw();
          };
        } },
      { tag: "STEP 4 · 버저", title: "첫 힌트가 열리면 1분 — 먼저 버저!", body: "첫 번째 힌트가 열리면 <b>1분</b>의 시간이 주어져요. 숨은 규칙을 찾은 사람이 <b>먼저 버저</b>를 누르면 <b>정답을 맞힐 기회</b>가 와요.",
        boardHtml: `<div class="ms-tut">${tq(3, 5)}${th([[9, 11, 202]])}<button type="button" class="ms-buzz" tabindex="-1">🔔 버저!</button></div>`, ms: 6400 },
      { tag: "STEP 5 · 점수", title: "맞히면 +1 · 틀리면 −1, 기회는 상대에게", body: "정답을 맞히면 <b>승점 1점</b>을 얻어요. 틀리면 <b>승점 1점이 감점</b>되고 <b>기회는 상대 플레이어에게</b> 넘어가요.",
        boardHtml: `<div class="ms-tut"><div class="ms-res ok">🎉 정답 34! +1점</div><div class="ms-res no">❌ 오답 — 1점<small>기회가 상대에게 넘어가요</small></div></div>`, ms: 6400 },
      { tag: "STEP 6 · 다음 힌트", title: "1분 안에 아무도 못 맞히면 두 번째 힌트", body: "1분 안에 아무도 정답을 맞히지 못하면 <b>다시 한 명씩 숫자를 내서 두 번째 힌트</b>를 확인해요 (이번엔 선과 후가 바뀌어요). <b>힌트가 16개</b>가 열릴 때까지 아무도 못 맞히면 <b>다음 문제</b>로 넘어가요. 한 사람이 정답을 맞히면 그 라운드가 끝나요. <b>11라운드</b>가 끝났을 때 <b>승점이 더 높은 사람</b>이 승리해요.",
        boardHtml: `<div class="ms-tut">${th([[9, 11, 202], [14, 2, 200], [6, 6, 72], [1, 30, 901]])}<small>힌트 최대 16개 · 11라운드</small></div>`, ms: 7600 },
      { tag: "STEP 7 · 아이템", title: "더블 스코어 · 시크릿 · 무감점", body: `미스터리 사인에는 아이템이 쓰여요 (한 번씩). <b>더블 스코어</b> — 라운드 시작 때 쓰면 그 라운드 정답을 맞혔을 때 <b>쓴 사람만 승점을 2배</b>로 얻어요. <b>시크릿</b> — 첫 힌트에서 <b>내가 낸 숫자가 상대에게 공개되지 않아요</b>. <b>무감점</b> — 쓴 라운드에 한해 <b>틀려도 감점이 없어요</b>.`,
        boardHtml: `<div class="ms-tut"><div class="ms-items" style="width:min(100%,280px)">${G.ITEMS.map(k => `<div class="ms-ichip on"><b>${IC[k]}</b><span>${esc(G.ITEM_NAME[k])}<small>${IDESC[k]}</small></span></div>`).join("")}</div></div>`, ms: 7600 },
    ];
  }

  // ── 복기 고리 ──
  const pcs = x => Math.round(x * 100) + "%";
  const ITN = { double: "더블 스코어", safe: "무감점", secret: "시크릿" };
  function actText(a, V) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "item") return Array.isArray(a.use) && a.use.length ? `아이템 ${a.use.map(k => ITN[k] || k).join(" · ")}` : "아이템 안 씀";
    if (a.t === "num") return `숫자 ${a.n}`;
    if (a.t === "buzz") return Number.isFinite(+a.ms) && +a.ms < NO ? `버저 ${secs(+a.ms)}` : "버저 안 누름 (다음 힌트)";
    if (a.t === "ans") return `정답 ${a.n}`;
    if (a.t === "timeout") return "시간 안에 답을 못 씀";
    if (a.t === "pass") return "기회를 넘김";
    return "—";
  }
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !V.problem || (seat !== 0 && seat !== 1)) return null;
    if (myA.t === "item") return null;
    const I = G.candInfo(V, G.ALL), nC = I.cands.length;
    if (V.phase === "pick" && myA.t === "num") {
      const my = G.normNum(myA.n); if (!my || !nC) return null;
      const rd = V.rd || [0.3, 0.6, 0.1], r3 = [rd[0], rd[1], rd[2]], rec = G.bestNum(V, seat, G.ALL, r3), mineSc = G.numScore(V, seat, I, +my, r3);
      const d = mineSc.exp - rec.exp;
      if (d <= 0.05) return { sev: 0, why: `내 숫자 ${my} 로도 후보 ${nC}가지가 약 ${mineSc.cls}가지 결과로 잘 갈라져요` };
      return { sev: Math.min(70, Math.round(d / Math.max(1, mineSc.exp) * 100)), why: `내 숫자 ${my} → 후보 ${nC}가지 중 남는 '문제의 답' 평균 ${mineSc.exp.toFixed(1)}개 · 추천 ${rec.n} → ${rec.exp.toFixed(1)}개 (후보를 더 잘 갈라요)`, best: `숫자 ${rec.n}` };
    }
    if (V.phase === "buzz" && myA.t === "buzz") {
      const pressed = +myA.ms < NO;
      if (!nC) return pressed ? { sev: 35, why: "보이는 힌트에 맞는 규칙이 하나도 안 떠오르는데 눌렀어요 — 틀리면 −1 이에요" } : null;
      if (pressed) return I.conf < 0.5 ? { sev: 45, why: `답이 갈리는데(가장 많은 답 ${I.best.ans} 도 후보 ${I.best.ids.length}/${I.total}가지 = ${pcs(I.conf)}) 눌렀어요 — 틀리면 −1` } : { sev: 0, why: `후보 규칙 ${I.total}가지 중 ${I.best.ids.length}가지가 ${I.best.ans} 를 내요 (${pcs(I.conf)})` };
      if (I.sure) return { sev: 75, why: `후보 규칙 ${nC}가지가 모두 같은 답 ${I.best.ans} 를 냈는데 안 눌렀어요 — 눌렀다면 정답 확률 100% 로 +1 이에요`, best: `버저 → ${I.best.ans}` };
      return { sev: 0, why: `답이 ${I.groups.length}종류로 갈려서(최대 ${pcs(I.conf)}) 넘긴 건 좋은 판단이에요` };
    }
    if ((V.phase === "ans" || V.phase === "ans2") && (myA.t === "ans" || myA.t === "timeout" || myA.t === "pass")) {
      if (!nC) return null;
      if (myA.t === "ans") {
        const n = G.normAns(myA.n); if (n === null || !I.best) return null;
        if (n === I.best.ans) return { sev: 0, why: `후보 규칙 ${I.total}가지 중 ${I.best.ids.length}가지(${pcs(I.conf)})가 ${n} 를 내요` };
        const g = I.groups.find(x => x.ans === n);
        return { sev: I.sure ? 85 : Math.min(70, Math.round((I.conf - (g ? g.ids.length / I.total : 0)) * 100)), why: `후보 규칙 ${I.total}가지 중 ${I.best.ids.length}가지가 ${I.best.ans} 를 내요 (${pcs(I.conf)}) · 내가 쓴 ${n} 는 ${g ? `${g.ids.length}가지뿐 (${pcs(g.ids.length / I.total)})` : "어느 후보에서도 안 나와요"}`, best: `정답 ${I.best.ans}` };
      }
      if (myA.t === "timeout") return { sev: 60, why: `시간 안에 답을 못 썼어요 — 후보 기준 가장 유력한 답은 ${I.best ? `${I.best.ans} (${pcs(I.conf)})` : "없었어요"}`, best: I.best ? `정답 ${I.best.ans}` : undefined };
      if (I.best && I.sure) return { sev: 65, why: `후보 규칙이 모두 ${I.best.ans} 를 내는데 넘겼어요 — 썼다면 +1 이에요`, best: `정답 ${I.best.ans}` };
    }
    return null;
  }
  // 자동 시험 · 시험 틀의 내 차례 수: 사람처럼 힌트를 몇 개 본 뒤 누르고 답은 보통 AI 가 정함
  function qa(V, me, rnd) {
    if (V.phase === "item") return { t: "item", use: [] };
    if (V.phase === "pick") return { t: "num", n: String(2 + Math.floor(rnd() * 40)) };
    if (V.phase === "buzz") { const a = G.ai(V, me, "normal", rnd); return a.ms < NO ? { t: "buzz", ms: 15000 + Math.floor(rnd() * 20000) } : { t: "buzz", ms: NO }; }
    if (V.phase === "ans" || V.phase === "ans2") return G.ai(V, me, "normal", rnd);
    return null;
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-mysterysign"] = {
    name: "미스터리 사인", emoji: "🔮", short: "숨은 규칙을 힌트로 찾아 정답을 맞혀요 · 버저 + 아이템", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    show: "더 지니어스 · 시즌 4 그랜드 파이널 · 미스터리 사인", season: "시즌 4 그랜드 파이널 12화 결승 2회전",
    opts: [
      { k: "problems", label: "문제", items: [["tv", "방송 그대로 (11문제)"], ["new", "새 문제 (규칙 섞기)"]], def: "tv" },
      { k: "rounds", label: "라운드 수", items: [[11, "11라운드 (방송)"], [7, "7라운드"], [5, "5라운드"]], def: 11 },
      { k: "items", label: "아이템", items: [["tv", "방송처럼 (2개 · 1개)"], ["eq", "둘 다 3개씩"], ["none", "없음"]], def: "tv" },
    ],
    diff: "상대는 AI 한 명이고 화면의 큰 단추로 버저를 눌러요 — 힌트가 열린 순간부터 잰 시간(ms)이 작은 쪽이 먼저 답해요 (방송은 실제 버저) · 힌트 숫자는 0을 뺀 1~9,999,999 만 쓸 수 있어요 (방송에서는 12자리 숫자도 썼어요) · 숨은 규칙은 방송 1~11라운드의 11가지(영상 화면과 힌트로 확인) + 규칙 영상의 예시(제곱의 합) + 새로 더한 11가지, '방송 그대로'는 방송 문제 11개 그대로 · 8라운드(구멍 개수) · 10라운드(최대공약수) · 11라운드(사이 소수 개수) 규칙 이름은 방송 설명 글을 못 봐서 힌트와 정답(3 · 8)으로 맞춰 본 것이에요 (영상 미확인) · 첫 라운드 선은 씨앗으로 정하고 라운드마다 번갈아요 (힌트마다 번갈아는 방송과 같고, 라운드 선 순서는 영상 미확인) · 한 힌트의 두 숫자는 차례로 내고 후는 선이 낸 숫자를 봐요 · 아이템은 한 판에 한 번씩 (방송 장동민 = 더블 + 무감점, 김경훈 = 시크릿 — 씨앗으로 어느 쪽이 2개를 가질지 정해요, 아이템 한 번씩은 영상 미확인) · 정답 쓰기는 40초 · 첫 기회에서 시간이 지나면 오답(−1) 처리, 상대 기회에서는 넘기기(시간이 지나도 감점 없음)로 제가 정했어요 (영상 미확인) · 11라운드 뒤 동점은 비겨요 (방송 설명 없음) · 협상 · 팀 정치 없음",
    howto: [
      "<b>11라운드</b> — 라운드마다 <b>두 개의 숫자와 미스터리 사인 ❓</b>으로 된 문제가 열려요. 숨은 규칙을 찾아 정답을 맞혀요",
      "두 사람이 <b>0을 뺀 숫자를 하나씩</b> 내서 <b>힌트</b>를 얻어요 — 선 플레이어의 숫자는 <b>앞</b>, 후 플레이어의 숫자는 <b>뒤</b>에 같은 규칙으로 들어가요 (예: 규칙이 제곱의 합이고 9, 11 → 202)",
      "첫 힌트가 열리면 <b>1분</b> — 규칙을 찾은 사람이 <b>먼저 버저</b>를 눌러 정답을 대요",
      "맞히면 <b>+1점</b> · 틀리면 <b>−1점</b>이고 <b>기회는 상대</b>에게 넘어가요",
      "1분 안에 아무도 못 맞히면 <b>다음 힌트</b> (선 · 후가 바뀌어요) · <b>16개</b>까지 아무도 못 맞히면 다음 문제",
      "한 사람이 맞히면 그 라운드 끝 · <b>11라운드</b> 뒤 <b>점수가 높은 사람</b>이 승리",
      "아이템 (한 번씩) — <b>더블 스코어</b>(그 라운드 정답 2배) · <b>시크릿</b>(첫 힌트에서 내 숫자 감춤) · <b>무감점</b>(그 라운드 오답에 감점 없음)",
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds}라운드 · 힌트 ${Math.max(1, V.hintNo)}`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa, tutorial,
  };
})();

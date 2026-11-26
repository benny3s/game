/* 베니 서바이벌 · 시간 경매 — 화면 (3~8명 · 꾹 누르는 단추 · 5초 카운트다운 · 낙찰자만 공개 · 1분 규칙 · AI 선생님 · 복기) */
(() => {
  "use strict";
  const K = window.SVCores.timeauction;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.ta-top{display:flex;gap:8px;align-items:center;flex:none;min-height:38px}
.ta-rd{flex:none;min-width:52px;height:38px;border-radius:10px;display:grid;place-items:center;align-content:center;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.45);font:900 18px/1 var(--round);color:#fde68a}
.ta-rd small{font:700 9.5px var(--round);color:var(--soft)}
.ta-info{min-width:0;flex:1;display:grid;gap:1px}
.ta-info .l1{font:800 12.5px var(--round);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ta-info .l1 b{color:#fde68a}
.ta-info .l2{font-size:11.5px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ta-ps{display:grid;gap:2px;flex:none}
.ta-p{display:grid;grid-template-columns:minmax(0,1fr) 54px 96px;gap:6px;align-items:center;height:24px;padding:0 6px;border-radius:7px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08)}
.ta-p.me{border-color:rgba(134,239,172,.45);background:rgba(34,197,94,.08)}
.ta-p.win{background:rgba(245,179,1,.2);border-color:#f5b301}
.ta-p.dead{background:rgba(127,29,29,.35);border-color:rgba(248,113,113,.5)}
.ta-p.pc{background:rgba(245,179,1,.16);border-color:#f5b301}
.ta-p .nm{min-width:0;font:800 12px var(--round);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ta-p .mk{font:900 12.5px var(--round);color:#f5b301;white-space:nowrap;font-variant-numeric:tabular-nums}
.ta-p .mk small{font:700 9.5px var(--round);color:var(--soft)}
.ta-p .kn{text-align:right;font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden}
.ta-p .kn b{color:#e2e8f0}
.ta-hold{display:grid;grid-template-columns:minmax(0,1fr) 118px;gap:10px;align-items:center;flex:none;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:8px 10px}
.ta-clock{display:grid;gap:2px;min-width:0}
.ta-clock small{font:700 11px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ta-clock .big{font:900 34px/1.05 var(--round);font-variant-numeric:tabular-nums;color:#f8fafc;letter-spacing:.5px;white-space:nowrap}
.ta-clock .big.cd{color:#fde68a}
.ta-clock .big.run{color:#fca5a5}
.ta-clock .bank b{color:#86efac;font-variant-numeric:tabular-nums}
.ta-btn{width:108px;height:108px;border-radius:50%;justify-self:end;border:4px solid #b91c1c;background:radial-gradient(circle at 35% 30%,#f87171,#b91c1c 70%);color:#fff;font:900 16px/1.2 var(--round);box-shadow:0 6px 0 #7f1d1d,0 8px 18px rgba(0,0,0,.45);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer}
.ta-btn small{display:block;font:700 10.5px var(--round);opacity:.85}
.ta-btn.on{transform:translateY(5px);box-shadow:0 1px 0 #7f1d1d,0 3px 8px rgba(0,0,0,.45);background:radial-gradient(circle at 35% 30%,#fca5a5,#dc2626 70%)}
.ta-btn:disabled{filter:grayscale(.8) brightness(.7);cursor:default}
.ta-acts{display:grid;gap:4px;margin-top:auto;flex:none}
.ta-acts .note{font-size:12px;color:var(--soft);text-align:center;line-height:1.35}
.ta-acts .note b{color:#fde68a}
.ta-acts .btn{min-height:44px}
.ta-res{border:1px solid var(--gold);background:rgba(245,179,1,.1);border-radius:12px;padding:6px 10px;display:grid;gap:2px;text-align:center}
.ta-res .t{font:900 15px var(--round)}
.ta-res .d{font-size:12px;color:var(--soft);line-height:1.35}
.ta-res .d b{color:#e2e8f0}
.ta-tut{display:grid;gap:8px;justify-items:center;width:100%}
.ta-tut .row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center}
.ta-tut small{color:var(--soft);text-align:center}
.ta-tut .tag{font:800 12px var(--round);padding:3px 8px;border-radius:8px;background:rgba(0,0,0,.3)}
.ta-tut .q{min-width:64px;min-height:44px;border-radius:10px;border:2px solid #cbd5e1;background:linear-gradient(#f8fafc,#e2e8f0);color:#0f172a;font:900 14px var(--round);cursor:pointer}
.ta-rs{display:grid;gap:4px}
.ta-rs .r{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:baseline}
.ta-rs .n{margin-top:4px;color:var(--soft);font-size:13px}
@media (max-height:650px){.ta-p{height:21px}.ta-btn{width:92px;height:92px;font-size:14px}.ta-hold{grid-template-columns:minmax(0,1fr) 98px;padding:6px 10px}.ta-clock .big{font-size:29px}.ta-acts .note{font-size:11.5px}}
@media (min-height:760px){.ta-p{height:28px}.ta-btn{width:120px;height:120px}.ta-hold{grid-template-columns:minmax(0,1fr) 128px;padding:12px}}
`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  // ── 조사 (받침: 숫자 0·1·3·6·7·8 은 있음, 1·7·8 은 ㄹ) ──
  const jongOf = raw => {
    const s = String(raw).replace(/<[^>]*>/g, "").replace(/[\s)\]"'.,!?…·]+$/, ""), ch = s.slice(-1), c = ch.charCodeAt(0);
    if (!ch) return 0;
    if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (/[0-9]/.test(ch)) return "178".includes(ch) ? 2 : "036".includes(ch) ? 1 : 0;
    if (/[A-Za-z]/.test(ch)) return "lLrR".includes(ch) ? 2 : "mMnN".includes(ch) ? 1 : 0;
    return 0;
  };
  const JO = { ga: ["이", "가"], un: ["은", "는"], ul: ["을", "를"], wa: ["과", "와"] };
  const josa = (raw, k) => (k === "ro" ? (jongOf(raw) === 1 ? "으로" : "로") : JO[k][jongOf(raw) ? 0 : 1]);
  const J = (raw, k) => `${esc(raw)}${josa(raw, k)}`;
  const ME = { ga: "내가", un: "나는", ul: "나를", wa: "나와" };
  const pct = p => `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
  const fmt = K.fmt, sec = d => `${(Math.max(0, d) / 10).toFixed(1)}초`;
  let NAMES = [];
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const who = (ctx, i, k) => (i === ctx.me && ME[k] ? ME[k] : J(nameOf(ctx, i), k));

  function resLine(h, nm) {
    if (!h) return "";
    if (h.w >= 0) return `${nm(h.w)} 낙찰 ${fmt(h.t)}`;
    return h.tie ? `유찰 (같은 시간 ${fmt(h.t)})` : "아무도 안 눌러 유찰";
  }

  // ── 꾹 누르는 단추 (화면만의 시계 — 손을 떼면 그 시간을 한 번에 냄) ──
  const H = { key: "", mode: "idle", src: "", t0: 0, iv: 0, ctx: null, V: null, me: -1, sent: false };
  const speed = () => (H.V ? H.V.spd || 1 : 1) * ((typeof window !== "undefined" && +window.__TA_SPEED) || 1);
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  function held(at) {                                   // → { cd: 남은 카운트다운 초 (0 이면 끝), d: 쥔 시간 0.1초 } · at = 손을 뗀 순간 (이벤트 시각)
    const el = Math.max(0, ((at != null ? at : now()) - H.t0) * speed());
    if (el < K.CD * 1000) return { cd: Math.ceil((K.CD * 1000 - el) / 1000), d: 0 };
    return { cd: 0, d: Math.floor((el - K.CD * 1000) / 100) };
  }
  function paint() {
    const big = document.getElementById("taClk"), bank = document.getElementById("taBank"), lab = document.getElementById("taLab");
    if (!big || H.mode === "idle") return;
    const h = held(), b = H.V.bank[H.me];
    if (h.cd > 0) { big.textContent = String(h.cd); big.className = "big cd"; if (lab) lab.textContent = "카운트다운 — 지금 떼면 포기"; return; }
    const d = Math.min(h.d, b);
    big.textContent = sec(d); big.className = "big run";
    if (bank) bank.textContent = fmt(b - d);
    if (lab) lab.textContent = "시간이 줄어드는 중 — 원할 때 떼요";
    if (d >= b) release();                               // 다 쓰면 버튼이 저절로 풀림
  }
  function press(src, at) {
    if (H.mode !== "idle" || H.sent || !H.ctx || !H.V || !H.V.needs.includes(H.me) || !H.ctx.canAct) return;
    H.mode = "hold"; H.src = src; H.t0 = at != null ? at : now();
    const b = document.querySelector(".ta-btn"); if (b) b.classList.add("on");
    H.ctx.sfx && H.ctx.sfx("tap");
    clearInterval(H.iv); H.iv = setInterval(paint, 50); paint();
  }
  // 손을 뗌 → 한 번에 냄. 카운트다운이 끝난 뒤면 적어도 0.1초 (카운트다운을 넘겼으면 포기가 아님)
  function release(src, at) {
    if (H.mode !== "hold" || (src && H.src && src !== H.src)) return;   // 손가락으로 누른 건 손가락으로, 스페이스는 스페이스로
    clearInterval(H.iv); H.iv = 0;
    const h = held(at), b = H.V.bank[H.me], d = h.cd > 0 ? 0 : Math.max(1, Math.min(h.d, b));
    H.mode = "idle"; H.sent = true;
    H.ctx.sfx && H.ctx.sfx(d ? "pop" : "tap");
    const res = H.ctx.act({ t: "bid", d });
    if (res && res.ok === false) H.sent = false;        // 안 먹었으면 다시 누를 수 있게
  }
  let keysOn = false;
  const typing = e => { const t = e.target; return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ""))); };
  function keys() {
    if (keysOn || typeof window === "undefined") return; keysOn = true;
    window.addEventListener("keydown", e => { if (e.code === "Space" && !e.repeat && !typing(e) && document.querySelector("button.ta-btn[data-live]:not([disabled])")) { e.preventDefault(); press("key", e.timeStamp); } });
    window.addEventListener("keyup", e => { if (e.code === "Space" && H.mode === "hold" && H.src === "key") { e.preventDefault(); release("key", e.timeStamp); } });
    // 단추가 다시 그려지거나 손가락이 단추 밖에서 떨어져도 · 창을 떠나도 손을 뗀 것으로
    document.addEventListener("pointerup", e => { if (H.mode === "hold" && H.src === "ptr") release("ptr", e.timeStamp); }, true);
    document.addEventListener("pointercancel", () => { if (H.mode === "hold" && H.src === "ptr") release("ptr"); }, true);
    window.addEventListener("blur", () => release());
    document.addEventListener("visibilitychange", () => { if (document.hidden) release(); });
  }

  // 한 사람 줄: 이름 · 표식 · 낙찰로 쓴 시간 (끝나면 남은 시간)
  function row(V, ctx, i) {
    const me = ctx.me, R = V.res, F = V.fin;
    const cls = `ta-p${i === me ? " me" : ""}${R && R.w === i && V.phase !== "bid" ? " win" : ""}${F && F.elim === i ? " dead" : ""}${F && F.piece === i ? " pc" : ""}`;
    const tag = F ? (F.piece === i ? " 🧩" : F.elim === i ? " ❌" : "") : "";
    const nm = `<div class="nm">${esc(i === me && nameOf(ctx, i) !== "나" ? `${nameOf(ctx, i)} (나)` : nameOf(ctx, i))}${tag}</div>`;
    const mk = `<div class="mk">★${V.marks[i]}${V.winR[i].length ? ` <small>${V.winR[i].slice(-3).join("·")}</small>` : ""}</div>`;
    const kn = V.over && V.bank[i] != null ? `<div class="kn">남음 <b>${fmt(V.bank[i])}</b></div>`
      : i === me && V.bank[i] != null ? `<div class="kn">내 남음 <b>${fmt(V.bank[i])}</b></div>`
      : `<div class="kn" title="낙찰로 쓴 시간 (진 경매에 쓴 시간은 아무도 몰라요)">낙찰에 <b>${fmt(V.known[i])}</b></div>`;
    return `<div class="${cls}">${nm}${mk}${kn}</div>`;
  }

  function resHtml(V, ctx) {
    const R = V.res; if (!R) return "";
    const me = ctx.me, nm = i => esc(nameOf(ctx, i));
    let t = R.w >= 0 ? `🏆 ${who(ctx, R.w, "ga")} 낙찰 — ${fmt(R.t)}` : R.tie ? `🤝 유찰 — 가장 오래 쥔 사람이 둘 이상 (${fmt(R.t)})` : "🙊 아무도 안 눌러서 유찰";
    let d = "";
    if (me >= 0 && R.my != null) d = R.my === 0 ? "나는 이번에 포기 (시간 그대로)" : R.w === me ? `나는 ${sec(R.my)} 쥐고 낙찰 ★` : `나는 ${sec(R.my)} 쥐고 못 땄어요 (쓴 시간은 사라짐)`;
    if (me >= 0 && V.bank[me] != null) d += `${d ? " · " : ""}내 남은 시간 <b>${fmt(V.bank[me])}</b>`;
    if (V.over && V.fin) {
      const F = V.fin, row0 = s => F.rows.find(x => x.s === s);
      t = F.piece >= 0 ? `🧩 피스 — ${nm(F.piece)} (★${row0(F.piece).m}${F.pieceWhy === "time" ? ` · 남은 시간 ${fmt(row0(F.piece).b)} 더 많음` : ""})` : "🧩 1등이 표식 · 남은 시간까지 같아서 피스 없음";
      d = `❌ 탈락 — ${nm(F.elim)} (★${row0(F.elim).m}${F.elimWhy === "time" ? ` · 표식 같고 남은 시간 ${fmt(row0(F.elim).b)}로 가장 적음` : F.elimWhy === "lot" ? " · 표식 · 남은 시간까지 같아 추첨" : ""}) · 마지막 경매: ${resLine(R, nm)}`;
    }
    return `<div class="ta-res"><div class="t">${t}</div><div class="d">${d}</div></div>`;
  }

  function render(stage, V, ctx) {
    style(); keys();
    NAMES = (ctx.seats || []).map(s => (s && s.name) || "");
    const me = ctx.me, watch = !(me >= 0), n = V.n;
    const myTurn = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const key = `${ctx.g}|${V.round}|${V.phase}|${me}`;
    if (H.key !== key) { clearInterval(H.iv); H.iv = 0; H.key = key; H.mode = "idle"; H.sent = false; }
    H.ctx = ctx; H.V = V; H.me = me;
    if (H.mode === "hold" && document.getElementById("taClk")) return;   // 쥐고 있는 동안은 다시 그리지 않음 (손가락이 단추에서 안 떨어지게)
    const last = V.hist[V.hist.length - 1], nm = i => esc(nameOf(ctx, i));
    const l1 = V.over ? "경매가 모두 끝났어요" : !watch && V.bank[me] != null ? `내 남은 시간 <b>${fmt(V.bank[me])}</b> · 표식 ★${V.marks[me]} · 남은 경매 ${V.R - V.round + (V.phase === "bid" ? 1 : 0)}번` : `남은 경매 ${V.R - V.round + (V.phase === "bid" ? 1 : 0)}번 · 시세 ${fmt(V.price)}`;
    const l2 = last ? `지난 경매: ${resLine(last, nm)}` : "첫 경매 — 모두 버튼을 누르고 시작해요";
    let h = `<div class="ta-top"><div class="ta-rd"><small>경매</small>${V.round}<small>/${V.R}</small></div><div class="ta-info"><div class="l1">${l1}</div><div class="l2">${l2}</div></div></div>`;
    const order = []; if (watch) for (let i = 0; i < n; i++) order.push(i); else { order.push(me); for (let k = 1; k < n; k++) order.push((me + k) % n); }
    h += `<div class="ta-ps">${order.map(i => row(V, ctx, i)).join("")}</div>`;
    let acts = "";
    if (V.over) acts = `${resHtml(V, ctx)}<div class="note">게임이 끝났어요 · 결과 창을 확인해요</div>`;
    else if (V.phase === "show") acts = resHtml(V, ctx);
    else if (!watch && V.phase === "bid") {
      const mine = V.bid[me], b = V.bank[me];
      const big = mine != null ? sec(mine) : "0.0초", lab = mine != null ? (mine === 0 ? "이번 경매는 포기했어요" : "냈어요 — 다른 사람을 기다려요") : myTurn ? "단추를 꾹 누르면 5초 카운트다운" : "기다리는 중";
      h += `<div class="ta-hold"><div class="ta-clock"><small id="taLab">${lab}</small><div class="big" id="taClk">${big}</div><small class="bank">내 남은 시간 <b id="taBank">${fmt(b)}</b></small></div>
        <button type="button" class="ta-btn" data-live="1" ${myTurn ? "" : "disabled"} aria-label="꾹 누르기">꾹<br>누르기<small>${myTurn ? "떼면 그 시간만큼" : mine != null ? "냈어요" : "—"}</small></button></div>`;
      acts = myTurn
        ? `<div class="note">단추를 <b>꾹</b> 누르고 5초 뒤부터 시간이 줄어요. <b>가장 오래 쥔 사람</b>이 낙찰 — 진 사람도 쓴 시간은 사라져요</div><button type="button" class="btn" data-a="pass">이번 경매 포기 (안 누르기)</button>`
        : `<div class="note">${mine != null ? (mine === 0 ? "포기했어요 · " : `${sec(mine)} 쥐었어요 · `) : ""}모두 손을 뗄 때까지 기다려요… (누가 아직 쥐고 있는지는 비밀)</div>`;
    } else acts = `<div class="note">경매 ${V.round} — 다들 버튼을 쥐고 있어요… (구경 중)</div>`;
    h += `<div class="ta-acts">${acts}</div>`;
    stage.innerHTML = h;
    const btn = stage.querySelector(".ta-btn");
    if (btn && H.mode === "hold") { btn.classList.add("on"); paint(); }   // 쥐는 도중 다시 그려졌으면 이어서
    if (btn && myTurn) {
      btn.onpointerdown = e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) { /* 없음 */ } press("ptr", e.timeStamp); };
      btn.onpointerup = e => { e.preventDefault(); release("ptr", e.timeStamp); };
      btn.onpointercancel = () => release("ptr");
      btn.onlostpointercapture = () => release("ptr");
      btn.oncontextmenu = e => e.preventDefault();
    }
    stage.onclick = e => {
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      if (b.dataset.a === "pass" && myTurn && H.mode === "idle" && !H.sent) { H.sent = true; ctx.sfx && ctx.sfx("tap"); const res = ctx.act({ t: "bid", d: 0 }); if (res && res.ok === false) H.sent = false; }
    };
  }

  // ── 결과 창 ──
  function result(V, me) {
    const nm = i => esc(NAMES[i] || `${i + 1}번`), F = V.fin;
    if (!F) return "";
    let h = `<div class="ta-rs">`;
    const rk = V.ranks || [];
    for (const x of F.rows) h += `<div class="r"><b>${rk[x.s] + 1}</b><span>${nm(x.s)}${F.piece === x.s ? " 🧩" : ""}${F.elim === x.s ? " ❌ 탈락" : ""}</span><span>★${x.m} · 남음 ${fmt(x.b)}</span></div>`;
    if (me >= 0) {
      const won = V.winR[me] || [], used = (V.hist || []).reduce((s, h2) => s + (h2.bids ? h2.bids[me] : h2.my || 0), 0), lost = (V.hist || []).reduce((s, h2) => s + (h2.w !== me ? (h2.bids ? h2.bids[me] : h2.my || 0) : 0), 0);
      h += `<div class="n">${F.elim === me ? "표식이 가장 적어 탈락했어요." : F.piece === me ? "표식 1등 — 피스를 얻었어요! 🧩" : `${(rk[me] || 0) + 1}등으로 살아남았어요.`} 낙찰 ${won.length}번${won.length ? ` (${won.join(" · ")})` : ""} · 쓴 시간 ${fmt(used)} 중 진 경매에 ${fmt(lost)}</div>`;
    }
    return h + `</div>`;
  }

  // ── 행동 글 (복기) ──
  function actText(a) {
    if (!a || a.t !== "bid") return "—";
    return a.d === 0 ? "포기 (안 누름)" : `${sec(a.d)} 쥠`;
  }

  // ── AI 선생님 (보이는 것만) ──
  let CC = { key: "", out: null };
  const seedOf = key => { let s = 2166136261; for (const ch of key) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); } return s >>> 0; };
  const rngOf = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const coachKey = (V, me) => `${V.pub}|${me}|${V.bank[me]}|${V.bid[me]}`;
  const coachRng = (V, me) => rngOf(seedOf(coachKey(V, me)));     // 추천 = 고급 AI 의 수 (같은 고정 난수로 decide(hard))
  function coach(V, me, since, names) {
    const rawN = i => (names && names[i]) || `${i + 1}번`, nm = i => esc(rawN(i));
    if (me == null || me < 0 || !V || !V.marks) return { opp: "구경 중이에요. 자리에 앉으면 경매마다 알려 드려요.", mine: "표식과 낙찰 시간을 지켜보고 있어요.", rec: "—", why: "" };
    if (V.over && V.fin) {
      const F = V.fin;
      return { opp: `피스 ${F.piece >= 0 ? nm(F.piece) : "없음"} · 탈락 ${nm(F.elim)} — 표식 ${F.rows.map(x => x.m).join(" · ")}`, mine: F.elim === me ? "표식이 가장 적어 탈락했어요." : `나는 ${(V.ranks ? V.ranks[me] : 0) + 1}등 · ★${V.marks[me]} · 남은 시간 ${fmt(V.bank[me])}`, rec: "다시 한 판 해 볼까요?", why: "진 경매에 쓴 시간이 아까웠다면, 시세보다 조금 높게 짧게 끝내는 연습을 해 봐요." };
    }
    const key = coachKey(V, me);
    if (CC.key === key && CC.out) return CC.out;
    const others = []; for (let i = 0; i < V.n; i++) if (i !== me) others.push(i);
    // 👀 상대 흐름
    const rc = V.hist.slice(-3).map(h => (h.w >= 0 ? `${nm(h.w)} ${fmt(h.t)}` : h.tie ? `유찰 ${fmt(h.t)}` : "아무도 없음"));
    const recent = rc.length > 1 && rc.every(x => x === "아무도 없음") ? `최근 ${rc.length}번은 아무도 안 눌렀어요` : `최근 낙찰: ${rc.join(" · ")}`;
    const maxO = Math.max(...others.map(i => V.marks[i])), leaders = others.filter(i => V.marks[i] === maxO);
    const spent = others.slice().sort((a, b) => V.known[b] - V.known[a])[0];
    let opp = V.hist.length ? `${recent}. 시세(최근 낙찰 시간) 약 ${fmt(V.price)}` : "첫 경매예요 — 아직 아무도 시간을 안 썼어요";
    if (V.hist.length) opp += ` · 표식 1등 ${leaders.slice(0, 2).map(nm).join(" · ")} ★${maxO}${V.known[spent] > 0 ? ` · 낙찰에 가장 많이 쓴 사람 ${nm(spent)} ${fmt(V.known[spent])}` : ""}`;
    opp += ".";
    // 📊 내 흐름
    const L = V.R - V.round + (V.phase === "bid" ? 1 : 0), minO = Math.min(...others.map(i => V.marks[i])), m = V.marks[me];
    const low = others.filter(i => V.marks[i] <= m).length;
    const risk = m < minO ? "지금 표식 꼴찌예요 — 이대로면 탈락" : m === minO ? `표식이 가장 적은 쪽과 같아요 (${low}명) — 같으면 남은 시간이 적은 쪽이 탈락` : `꼴찌보다 ★${m - minO} 앞서요`;
    const mine = `★${m} · ${risk} · 내 남은 시간 ${fmt(V.bank[me] || 0)} (남은 경매 ${L}번이면 한 번에 약 ${fmt(Math.round((V.bank[me] || 0) / Math.max(1, L)))}).`;
    const out = { opp, mine, rec: "", why: "" };
    if (V.phase === "show") { out.rec = "곧 다음 경매예요."; out.why = V.res && V.res.w === me ? "낙찰! 표식 1개를 얻었어요." : V.res && V.res.my > 0 ? "진 경매에 쓴 시간은 돌아오지 않아요 — 시세를 보고 다시 판단해요." : ""; }
    else if (!V.needs.includes(me)) { out.rec = V.bid[me] === 0 ? "이번 경매는 포기했어요." : `${sec(V.bid[me] || 0)} 쥐었어요 — 결과를 기다려요.`; }
    else {
      const r = coachRng(V, me), d = K.decide(V, me, "hard", r), mk = K.market(V, me, rngOf(seedOf(key) ^ 0x5bd1e995), 240);
      if (d) {
        const best = d.list[0], pass = d.list.find(x => x.d === 0), alt = d.list.find(x => x !== best && x.d !== 0 && x.k > 0);
        out.rec = best.d === 0 ? "이번엔 포기 (안 누르기)" : `${sec(best.d)}까지 쥐고 떼기`;
        const pW = best.d > 0 ? mk.pWin(best.d) : 0;
        const pts = x => Math.round(x.v * 100);
        out.why = best.d > 0
          ? `이 시간이면 낙찰 확률 약 ${pct(pW)} (남들이 아무도 안 누를 확률 ${pct(mk.none)}) · 굴려 보면 순위 점수 ${pts(best)}${pass && pass !== best ? ` (포기하면 ${pts(pass)})` : ""} — 100 = 모두를 앞섬.`
          : `남들 중 누군가 오래 쥘 것 같아요 (아무도 안 누를 확률 ${pct(mk.none)}) · 굴려 보면 포기가 순위 점수 ${pts(best)}${alt ? ` (${sec(alt.d)} 쥐면 ${pts(alt)})` : ""} — 시간을 아끼면 마지막에 남은 시간으로 앞서요.`;
      }
    }
    CC = { key, out };
    return out;
  }

  // ── 복기 고리: 같은 씨앗으로 두 수를 끝까지 굴려 '순위 점수'(100 = 모두를 앞섬) 차이 ──
  function review(Vb, seat, myA, bestA) {
    if (!Vb || Vb.phase !== "bid" || !myA || !bestA || myA.t !== "bid" || bestA.t !== "bid") return { sev: 0, why: "" };
    if (myA.d === bestA.d) return { sev: 0, why: "고급 AI와 같은 선택이에요.", my: actText(myA), best: actText(bestA) };
    const Jd = K.judge(Vb, seat, myA, bestA);
    if (!Jd || !Jd.my || !Jd.best) return { sev: 0, why: "견줄 수 없는 장면이에요." };
    const loss = (Jd.best.v - Jd.my.v) * 100;
    const sev = loss >= 12 ? 80 : loss >= 7 ? 60 : loss >= 4 ? 40 : loss >= 1.5 ? 20 : 5;
    let why = `고급 AI: ${actText(bestA)} — 같은 상황을 여러 번 굴려 보면 순위 점수 ${Math.round(Jd.best.v * 100)}, 내 수는 ${Math.round(Jd.my.v * 100)} (100 = 모두를 앞섬) · 이번 낙찰 확률 ${pct(Jd.best.win)} vs 내 수 ${pct(Jd.my.win)}`;
    if (loss < 1.5) why = `고급 AI: ${actText(bestA)} — 굴려 보면 내 수와 거의 같은 값이에요 (차이 ${Math.max(0, loss).toFixed(1)}점)`;
    return { sev, why, my: actText(myA), best: actText(bestA) };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const btn = (t, x = "") => `<span class="ta-btn${x}" style="display:inline-grid;place-items:center;width:84px;height:84px;font-size:13px;cursor:default">${t}</span>`;
    return [
      { tag: "STEP 1 · 목표", title: "19번의 경매에서 표식 모으기", body: "모두 <b>10분(600초)</b>의 시간 통장을 들고 시작해요. 경매는 <b>19번</b>. 낙찰되면 <b>승리 표식 ★</b> 1개. 끝났을 때 표식이 <b>가장 적으면 탈락</b>, 가장 많으면 <b>피스</b>!",
        boardHtml: `<div class="ta-tut"><div class="row"><span class="tag">⏱ 10:00.0</span><span class="tag">경매 19번</span></div><small>0.1초 단위로 기록돼요</small></div>`, ms: 6000 },
      { tag: "STEP 2 · 진행", title: "꾹 누르고 → 5초 → 시간이 줄어요", body: "경매가 시작되면 모두 버튼을 <b>누른 채</b> 기다려요. <b>5초 카운트다운</b> 안에 떼면 이번 경매는 <b>포기</b> (시간 안 듦). 5초가 지나면 쥐고 있는 사람 모두 <b>시간이 줄어요</b>.",
        boardHtml: `<div class="ta-tut"><div class="row">${btn("5…4…3")}${btn("12.3초", " on")}</div><small>원할 때 손을 떼면 그만큼 쓴 거예요</small></div>`, ms: 6400 },
      { tag: "STEP 3 · 낙찰", title: "가장 오래 쥔 사람이 낙찰", body: "<b>마지막까지 쥔 사람</b>이 낙찰 → 표식 ★. 하지만 <b>진 사람도 쓴 시간은 사라져요</b>. 누가 참가했는지 · 남의 남은 시간은 <b>비밀</b> — 공개되는 건 낙찰자와 경매 시간뿐.",
        boardHtml: `<div class="ta-tut"><div class="row"><span class="tag">AI1 20.0초</span><span class="tag">AI2 35.4초 🏆</span><span class="tag">나 포기</span></div><small>AI1은 20초를 잃고, AI2는 35.4초를 쓰고 표식 ★</small></div>`, ms: 6600 },
      { tag: "STEP 4 · 직접", title: "이번 표식은 누구 것?", body: "세 사람이 쥔 시간이 <b>AI1 12.0초 · AI2 30.5초 · AI3 30.5초</b>예요. 표식은 누가 가져갈까요?",
        interactive: { hint: "👆 답을 눌러요", doneText: "✅ 가장 오래 쥔 사람이 0.1초까지 같으면 유찰 — 아무도 못 가져요 (시간은 다 사라져요)" },
        render(stage, ctrl) {
          let msg = "";
          const draw = () => {
            stage.innerHTML = `<div class="ta-tut"><div class="row"><span class="tag">AI1 12.0초</span><span class="tag">AI2 30.5초</span><span class="tag">AI3 30.5초</span></div>
              <div class="row"><button type="button" class="q" data-v="1">AI1</button><button type="button" class="q" data-v="2">AI2</button><button type="button" class="q" data-v="3">AI3</button><button type="button" class="q" data-v="n">아무도</button></div><small>${msg || "0.1초까지 따져요"}</small></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b) return;
            if (b.dataset.v === "n") { ctrl.sfx("win"); msg = "정답! 30.5초 둘이 같아서 유찰"; draw(); ctrl.complete(); }
            else { ctrl.sfx("tap"); msg = b.dataset.v === "1" ? "AI1은 가장 짧게 쥐었어요." : "AI2와 AI3이 0.1초까지 같아요 — 그럼 어떻게 될까요?"; draw(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 다 쓰면", title: "남은 시간을 다 쓰면 버튼이 풀려요", body: "남은 시간보다 오래 쥘 수 없어요. 0이 되면 남은 경매는 모두 <b>포기</b>예요 (탈락은 아님). 내 남은 시간은 화면에 보여 드려요 (방송은 기억해야 했어요).",
        boardHtml: `<div class="ta-tut"><div class="row"><span class="tag">⏱ 0.0초</span>${btn("—")}</div></div>`, ms: 6000 },
      { tag: "STEP 6 · 끝", title: "표식 → 남은 시간으로 순위", body: "19번이 끝나면 <b>표식 가장 많은 사람</b>이 피스 🧩 (같으면 남은 시간이 많은 쪽). <b>표식 가장 적은 사람 탈락</b> (같으면 남은 시간이 적은 쪽). 막히면 <b>🧑‍🏫 AI 선생님</b>!",
        boardHtml: `<div class="ta-tut"><span style="font-size:40px">🧩</span><small>표식을 너무 비싸게 사면 마지막에 남은 시간 싸움에서 밀려요</small></div>`, ms: 6400 },
    ];
  }

  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 2일차 감옥 매치";
  const DIFF = "※ 방송과 다른 점: 3~8명 (방송 6명 — 시간 10분 · 경매 19번은 그대로) · 내 남은 시간은 화면에 보여 줌 (방송은 기억) · 게임이 끝나면 모두의 남은 시간 · 쥔 시간 공개 · 탈락 후보가 표식 · 남은 시간까지 같으면 추첨 · 시계 빠르기를 고를 수 있음 (보기만 빨라짐) — 방송 글에 없어서 우리가 정함";
  window.SVUI = window.SVUI || {};
  window.SVUI.timeauction = {
    name: "시간 경매", emoji: "⏱️", short: "10분 시간 통장 · 19번 경매 — 가장 오래 쥔 사람이 표식, 진 사람도 시간은 잃음", min: 3, max: 8, defN: 6, board: false,
    opts: [{ k: "spd", label: "시계 빠르기", items: [[1, "1배 (방송)"], [2, "2배"], [4, "4배"]], def: 1 }],
    src: SRC, diff: DIFF,
    howto: [
      "목표: 19번의 경매에서 승리 표식을 모아요. 끝났을 때 표식이 가장 적으면 탈락, 가장 많으면 피스",
      "준비물: 사람마다 시간 통장 10분 (600초, 0.1초 단위) · 가려진 개인 버튼",
      "진행: 경매마다 모두 버튼을 누른 채 시작 → 5초 카운트다운 안에 떼면 이번 경매 포기 (시간 안 듦) → 5초 뒤부터 쥔 사람 모두 시간이 줄어듦 → 원할 때 손을 뗌",
      "낙찰: 마지막까지 쥔 사람이 낙찰 → 표식 1개. 진 사람도 쥔 시간은 사라짐. 가장 오래 쥔 사람이 0.1초까지 같으면 유찰 (아무도 표식 없음)",
      "비밀: 공개되는 건 낙찰자와 경매 시간뿐 — 누가 참가했는지 · 남의 남은 시간은 모름. 남은 시간을 다 쓰면 버튼이 저절로 풀림",
      "끝: 표식 가장 많은 사람이 피스 (같으면 남은 시간이 많은 쪽, 그것도 같으면 피스 없음) · 표식 가장 적은 사람 탈락 (같으면 남은 시간이 적은 쪽)",
      SRC, DIFF,
    ],
    sub: V => (V.over ? "끝" : `경매 ${V.round}/${V.R}`),
    chip: (V, i) => ({ t: V.fin && V.fin.elim === i ? "❌" : V.fin && V.fin.piece === i ? `🧩★${V.marks[i]}` : `★${V.marks[i]}`, on: i === V.seat && V.needs.includes(i) && !V.over, out: !!(V.fin && V.fin.elim === i) }),
    render, coach, coachRng, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

/* 베니 서바이벌 · 수식 경매 — 화면 (경매 순서 · 타일 · 서 있는 입찰 · 내 큐브 트레이 · 상대 타일 · 가넷 특별경매 · 1분 규칙)
   시계는 UI 만 가져요: 창마다 제한 시간(옵션)이 끝나면 {t:"pass"} 를 보내요. 한 창에서 고른 것은 모두가 고른 뒤에 밝혀져요 */
(() => {
  "use strict";
  const G = window.SVCores["gn-formulaauction"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.fa-lot{display:grid;grid-template-columns:58px 1fr 104px;gap:6px;flex:none;align-items:stretch}
.fa-no,.fa-hi{border-radius:14px;background:rgba(0,0,0,.32);border:1.5px solid rgba(255,255,255,.14);display:grid;place-items:center;align-content:center;padding:3px 2px;min-width:0;height:60px;text-align:center}
.fa-no small,.fa-hi small{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap}
.fa-no b{font:900 26px/1.05 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.fa-hi b{font:900 20px/1.1 var(--round);color:#fff;white-space:nowrap}
.fa-hi em{font:800 11px var(--round);font-style:normal;color:#fde68a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.fa-hi.on{border-color:#fde68a;background:rgba(253,230,138,.12)}
.fa-tl{border-radius:14px;background:linear-gradient(135deg,rgba(37,99,235,.34),rgba(0,0,0,.4));border:1.5px solid rgba(147,197,253,.6);display:flex;align-items:center;justify-content:center;gap:8px;height:60px;min-width:0;padding:0 6px}
.fa-tl.sp{background:linear-gradient(135deg,rgba(245,179,1,.42),rgba(0,0,0,.4));border-color:#fde68a}
.fa-tl.gone{opacity:.55}
.fa-tl small{font:800 11px/1.2 var(--round);color:#fef3c7;text-align:left}
.fa-t{display:inline-grid;place-items:center;min-width:34px;height:34px;padding:0 4px;border-radius:9px;font:900 22px/1 var(--round);box-sizing:border-box;font-variant-numeric:tabular-nums}
.fa-t.n{background:#dbeafe;color:#1e3a8a;border:2px solid #60a5fa}
.fa-t.o{background:#fef3c7;color:#92400e;border:2px solid #f59e0b}
.fa-t.abs{background:linear-gradient(180deg,#fde68a,#f59e0b);color:#451a03;border:2px solid #fff7ed;min-width:40px;height:40px;font-size:26px}
.fa-t.m{min-width:27px;height:27px;font-size:17px;border-radius:7px}
.fa-t.mm{min-width:22px;height:22px;font-size:14px;border-radius:6px;padding:0 2px}
.fa-t.s.xs{min-width:14px;height:14px;font-size:10px;border-radius:4px;padding:0 1px;border-width:1px}
.fa-t.s{min-width:17px;height:17px;border-radius:5px;font-size:11.5px;padding:0 2px;border-width:1.5px}
.fa-st{flex:none;text-align:center;font:700 12.5px/1.35 var(--round);color:var(--ink);min-height:34px;display:grid;place-items:center;align-content:center}
.fa-st b{color:#fde68a}
.fa-st .no{color:#fca5a5}.fa-st .ok{color:#86efac}
.fa-ps{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:5px}
.fa-p{position:relative;border-radius:12px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.14);padding:4px 6px;min-width:0;display:grid;gap:2px;align-content:start}
.fa-p.hi{border-color:#fde68a;background:rgba(253,230,138,.1)}
.fa-p.win{border-color:#4ade80;box-shadow:0 0 0 2px #4ade80}
.fa-p.wt{box-shadow:0 0 0 2px rgba(251,191,36,.55)}
.fa-p .nm{display:flex;gap:4px;align-items:center;font:800 12px var(--round);color:#e2e8f0;white-space:nowrap;min-width:0}
.fa-p .nm span{overflow:hidden;text-overflow:ellipsis;min-width:0}
.fa-p .nm i{font-style:normal;font:900 10.5px var(--round);color:#fde68a;margin-left:auto;white-space:nowrap}
.fa-p .tl{display:flex;flex-wrap:wrap;gap:2px;min-height:17px;align-items:center}
.fa-p .tl em{font:700 10.5px var(--round);font-style:normal;color:var(--soft)}
.fa-p .cu{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fa-p .cu b{color:#e2e8f0}
.fa-me{flex:none;display:grid;gap:4px;padding:5px 6px;border-radius:14px;background:rgba(134,239,172,.07);border:1.5px solid rgba(134,239,172,.5)}
.fa-me .hd{display:flex;gap:6px;align-items:center;min-width:0}
.fa-me .hd .tl{display:flex;flex-wrap:wrap;gap:3px;align-items:center;min-width:0}
.fa-me .hd .tl em{font:700 11px var(--round);font-style:normal;color:var(--soft)}
.fa-me .fm{font:800 11.5px/1.3 var(--round);color:#bbf7d0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fa-me .fm small{color:var(--soft);font-weight:700}
.fa-tray{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.fa-cb{position:relative;height:42px;min-width:44px;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:linear-gradient(165deg,#334155,#0f172a);color:#fff;font:900 21px/1 var(--round);cursor:pointer;touch-action:manipulation;padding:0;font-variant-numeric:tabular-nums}
.fa-cb:active{transform:scale(.95)}
.fa-cb.gone{opacity:.16;border-style:dashed;cursor:default}
.fa-cb.off{opacity:.62;cursor:default}
.fa-cb.abs{background:linear-gradient(180deg,#fde68a,#d97706);color:#451a03;border-color:#fff7ed}
.fa-cb.blk{border-color:#f87171}
.fa-cb.blk::after{content:"막기";position:absolute;right:2px;top:1px;font:900 9px var(--round);color:#fecaca}
.fa-cb.sel{border-color:#fde68a;box-shadow:0 0 0 2px #fde68a;background:linear-gradient(165deg,#92400e,#1c1917)}
.fa-act{display:flex;gap:8px;flex:none;margin-top:auto;align-items:stretch}
.fa-go{flex:1;min-width:0;height:48px;border-radius:15px;border:0;background:linear-gradient(180deg,#fb7185,#be123c);color:#fff;font:900 17px var(--round);box-shadow:0 5px 0 #881337,0 8px 16px rgba(0,0,0,.4);cursor:pointer;touch-action:manipulation;padding:0 6px}
.fa-go:active{transform:translateY(3px);box-shadow:0 2px 0 #881337}
.fa-go:disabled{opacity:.35;box-shadow:none;cursor:default}
.fa-go.blue{background:linear-gradient(180deg,#60a5fa,#1d4ed8);box-shadow:0 5px 0 #1e3a8a,0 8px 16px rgba(0,0,0,.4)}
.fa-pass{flex:none;width:96px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:var(--ink);border-radius:13px;font:800 14px var(--round);cursor:pointer;min-height:44px}
.fa-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}
.fa-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#fde68a,#fb7185);transform-origin:left}
.fa-gs{display:flex;align-items:center;justify-content:center;gap:10px}
.fa-gs button{width:48px;height:42px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 22px var(--round);cursor:pointer;touch-action:manipulation}
.fa-gs b{font:900 26px var(--round);color:#fde68a;min-width:70px;text-align:center}
.fa-gs small{font:700 11px var(--round);color:var(--soft)}
.fa-res{flex:none;text-align:center;padding:5px 8px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);font:800 14px/1.35 var(--round)}
.fa-res.ok{border-color:#4ade80;color:#bbf7d0;background:rgba(34,197,94,.14)}
.fa-res.no{border-color:#f87171;color:#fecaca;background:rgba(248,113,113,.1)}
.fa-res small{display:block;font:600 11.5px var(--round);color:var(--soft)}
.fa-bn{display:inline-flex;gap:3px;align-items:center;flex-wrap:wrap;justify-content:center}
.fa-bn i{font-style:normal;font:800 10.5px var(--round);padding:0 5px;border-radius:99px;background:rgba(248,113,113,.16);border:1px solid rgba(248,113,113,.45);color:#fecaca}
.fa-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.fa-tut .fa-tray{width:100%;box-sizing:border-box}
.fa-tut .fa-tl{width:170px;justify-content:center}
.fa-tut small{color:var(--soft);text-align:center;line-height:1.4}
.fa-tut .row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center}
.fa-tut .cube{display:inline-grid;place-items:center;min-width:34px;height:34px;border-radius:9px;border:2px solid rgba(255,255,255,.35);background:linear-gradient(165deg,#334155,#0f172a);color:#fff;font:900 18px var(--round)}
.fa-tut .cube.x{opacity:.3;text-decoration:line-through}
.fa-tut .cube.w{border-color:#4ade80;box-shadow:0 0 0 2px #4ade80}
.fa-tut .cube.b{border-color:#f87171;box-shadow:0 0 0 2px #f87171}
@media (max-height:700px){.fa-no,.fa-hi,.fa-tl{height:50px}.fa-no b{font-size:22px}.fa-cb{height:36px;font-size:19px}.fa-go{height:44px}.fa-st{min-height:30px;font-size:12px}.fa-p{padding:3px 6px;gap:1px}.fa-me{padding:4px 6px;gap:3px}}
.sv-coachfit .fa-no,.sv-coachfit .fa-hi,.sv-coachfit .fa-tl{height:42px}
.sv-coachfit .fa-no b{font-size:19px}.sv-coachfit .fa-hi b{font-size:16px}
.sv-coachfit .fa-t{min-width:28px;height:28px;font-size:18px}
.sv-coachfit .fa-st{min-height:0;font-size:11.5px}
.sv-coachfit .fa-p .tl{min-height:0}.sv-coachfit .fa-p .cu{display:none}
.sv-coachfit .fa-cb{height:32px;min-width:0;font-size:16px}
.sv-coachfit .fa-go{height:38px;font-size:15px}.sv-coachfit .fa-pass{min-height:0;font-size:12.5px}
.sv-coachfit .fa-me .fm{display:none}
.sv-coachfit .fa-res{padding:3px 6px;font-size:12px}.sv-coachfit .fa-res small{font-size:10.5px}
@media (max-width:400px){.fa-lot{grid-template-columns:52px 1fr 96px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는"), eul = w => (hasFinal(w) ? "을" : "를");
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const asc = (a, b) => a - b;

  // ── 이 화면의 시계 · 선택 (창이 바뀌면 새로 시작) ──
  const S = { pk: "", armed: "", stage: null, ctx: null, V: null, tm: 0, iv: 0, dl: 0, sel: 0, gv: 0 };
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
    if (!S.iv) S.iv = setInterval(tick, 80);
  }
  const whenAct = (fn, tries) => { const c = S.ctx; if (c && c.canAct) return fn(); if ((tries == null ? 12 : tries) > 0) { const pk = S.pk; setTimeout(() => { if (S.pk === pk) whenAct(fn, (tries == null ? 12 : tries) - 1); }, 250); } };
  function send(a) { const c = S.ctx; if (!c || !c.canAct) return; clearTimers(); S.dl = 0; c.sfx(a.t === "pass" ? "tap" : "pop"); c.act(a); }
  function pickCube(c) {
    const V = S.V, ctx = S.ctx; if (!V || !ctx || !ctx.canAct || !V.needs.includes(ctx.me)) return;
    S.sel = S.sel === c ? 0 : c; ctx.sfx("tap"); render(S.stage, V, ctx);
  }
  function stepG(d) {
    const V = S.V, ctx = S.ctx; if (!V || !ctx || !ctx.canAct) return;
    const lo = (V.hi ? V.hi.g : 0) + 1, hi = V.gar[ctx.me];
    S.gv = Math.max(lo, Math.min(hi, (S.gv || lo) + d)); ctx.sfx("tap"); render(S.stage, V, ctx);
  }

  // ── 그리기 ──
  const tileChips = (nums, ops, small) => {
    const n = nums.length + ops.length, z = small ? (n > 8 ? " s xs" : " s") : n > 9 ? " mm" : n > 6 ? " m" : "";      // 타일이 많으면 한 줄에 들어가게 작게
    const a = nums.slice().sort(asc).map(v => `<i class="fa-t n${z}">${v}</i>`).concat(ops.map(o => `<i class="fa-t o${z}">${esc(o)}</i>`));
    return a.length ? a.join("") : `<em>타일 없음</em>`;
  };
  const lotTile = V => {
    const t = V.tile;
    if (t.sp) return `<div class="fa-tl sp"><i class="fa-t abs">11</i><small>특별경매<br>절대큐브</small></div>`;
    return `<div class="fa-tl${V.phase === "show" || V.over ? " gone" : ""}">${t.n ? `<i class="fa-t n">${t.n}</i>` : ""}${t.o ? `<i class="fa-t o">${esc(t.o)}</i>` : ""}</div>`;
  };
  function cardHtml(V, ctx, j, watch) {
    const nm = esc(nameOf(ctx, j)), standing = V.hi && V.hi.s === j, ans = V.ans[j] && (V.phase === "bid" || V.phase === "gbid") && !V.needs.includes(j);
    const hasAbs = V.cubes[j].includes(11), sum = V.cubes[j].reduce((a, b) => a + b, 0), cubeTxt = `큐브 <b>${V.cubes[j].length - (hasAbs ? 1 : 0)}</b>${hasAbs ? "+11" : ""} · 합 ${sum}`;
    const tag = standing ? `▶ ${V.phase === "gbid" ? `가넷 ${V.hi.g}` : `큐브 ${V.hi.c}`}` : V.over && V.winner === j ? "🏆" : (V.needs.includes(j) ? "…" : (ans ? "✔" : ""));
    const win = V.over && V.endBy === "ten" && V.winner === j, hiForm = V.over && V.fin && V.fin[j] ? `<div class="cu">${esc(V.fin[j].expr)} = <b>${esc(G.fmtV(V.fin[j].v))}</b></div>` : `<div class="cu">${cubeTxt} · 가넷 ${V.gar[j]}</div>`;
    return `<div class="fa-p${standing ? " hi" : ""}${win ? " win" : ""}${V.needs.includes(j) && !V.over ? " wt" : ""}" data-p="${j}"><div class="nm"><span>${nm}</span><i>${tag}</i></div><div class="tl">${tileChips(V.nums[j], V.ops[j], true)}</div>${hiForm}</div>`;
  }
  const burnChips = (V, ctx, me, watch) => (V.burn.length ? `<span class="fa-bn">${V.burn.map(b => `<i>${!watch && b.s === me ? "나" : esc(nameOf(ctx, b.s))} ${b.c}</i>`).join("")}</span>` : "");
  function resultHtml(V, ctx, me, watch) {
    const L = V.last, who = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const bn = burnChips(V, ctx, me, watch);
    if (!L) return `<span>…</span>`;
    const tt = L.tile ? `${L.tile[0] || ""}${L.tile[0] && L.tile[1] ? " " : ""}${L.tile[1] || ""}` : "";
    if (L.k === "win") return `<div class="fa-res ok">🎉 ${L.lot}회 ${who(L.s)} 큐브 ${L.c} 로 낙찰 — 「${esc(tt)}」<small>낸 큐브는 모두 버려져요 ${bn}</small></div>`;
    if (L.k === "void") return `<div class="fa-res no">🚫 ${L.lot}회 낙찰방해! 같은 큐브 ${L.c} 가 나와서 경매가 무효예요<small>타일도 큐브도 버려져요 ${bn}</small></div>`;
    if (L.k === "gwin") return `<div class="fa-res ok">🏅 ${who(L.s)} 가넷 ${L.g}개로 절대큐브 11 을 얻었어요<small>졌던 사람의 가넷은 그대로 돌려줘요</small></div>`;
    if (L.k === "gnone") return `<div class="fa-res no">아무도 가넷을 부르지 않아 절대큐브가 사라졌어요</div>`;
    return `<div class="fa-res no">${L.lot}회 입찰한 사람이 없어 타일이 버려졌어요</div>`;
  }
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, canAct = !!ctx.canAct && !watch;
    const pk = `${ctx.g}|${V.lot}|${V.win}|${V.phase}`;
    if (pk !== S.pk) { S.pk = pk; clearTimers(); S.armed = ""; S.sel = 0; S.gv = 0; S.dl = 0; }
    const mineTurn = canAct && V.needs.includes(me) && !V.over;
    const g = V.phase === "gbid", cfg = V.cfg || {};
    const who = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    // 위: 경매 번호 · 타일 · 서 있는 입찰
    const hi = V.hi ? `<div class="fa-hi on"><small>서 있는 입찰</small><b>${g ? `가넷 ${V.hi.g}` : `큐브 ${V.hi.c}`}</b><em>${!watch && V.hi.s === me ? "나" : esc(nameOf(ctx, V.hi.s))}</em></div>` : `<div class="fa-hi"><small>서 있는 입찰</small><b>—</b><em>${V.over || V.phase === "show" ? "" : "아직 없어요"}</em></div>`;
    const top = `<div class="fa-lot"><div class="fa-no"><small>경매</small><b>${V.lot}</b><small>/ ${V.nlot}회</small></div>${lotTile(V)}${hi}</div>`;
    // 가운데: 안내
    let st = "", actH = "";
    if (V.over) {
      const w = V.winner;
      if (V.endBy === "ten") st = `<div class="fa-res ok">🏆 ${who(w)} 10 을 완성했어요! <b>${esc(V.fin[w].expr)} = 10</b><small>나머지는 공동 최하위예요</small></div>`;
      else { const f = V.fin, best = V.ranks.map((r, i) => (r === 0 ? i : -1)).filter(i => i >= 0); st = `<div class="fa-res ${best.includes(me) && !watch ? "ok" : "no"}">24회가 끝났어요 — 10 에 가장 가까운 수식<br>${best.map(i => `${!watch && i === me ? "나" : esc(nameOf(ctx, i))}${f[i] ? ` ${esc(f[i].expr)} = ${esc(G.fmtV(f[i].v))}` : " (수식 없음)"}`).join(" · ")}<small>차이가 같으면 높은 숫자가 우세해요</small></div>`; }
    } else if (V.phase === "show") st = resultHtml(V, ctx, me, watch);
    else if (mineTurn) {
      const need = g ? `가넷 ${(V.hi ? V.hi.g : 0) + 1}개 이상` : V.hi ? `큐브 ${V.hi.c} 이상 · 같으면 방해` : "큐브 아무거나";
      st = `<span>${V.mine ? "" : `✋ <b>${g ? "가넷으로 절대큐브 11 을 사요" : V.hi ? "받아칠까요?" : "입찰할까요?"}</b> ${need}`}${!g && V.burn.length ? ` ${burnChips(V, ctx, me, watch)}` : ""}</span>`;
    } else if (V.mine) {
      st = `<span>✅ ${V.mine.t === "pass" ? "이번 창은 넘겼어요" : g ? `가넷 ${V.mine.g}개를 걸었어요` : `큐브 ${V.mine.c} 를 냈어요`} — 모두 고를 때까지 기다려요 ${burnChips(V, ctx, me, watch)}</span>`;
    } else if (watch) st = `<span>👀 ${V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") || "…"} ${V.needs.length ? "고르는 중" : ""} ${burnChips(V, ctx, me, watch)}</span>`;
    else if (V.hi && V.hi.s === me) st = `<span>내가 서 있어요 — 다른 사람이 받아치는지 기다려요 ${burnChips(V, ctx, me, watch)}</span>`;
    else st = `<span>${g ? "가넷을 걸 수 없어요" : "낼 수 있는 큐브가 없어요"} — 기다려요 ${burnChips(V, ctx, me, watch)}</span>`;
    // 상대 카드
    const order = watch ? Array.from({ length: V.n }, (_, i) => i) : Array.from({ length: V.n - 1 }, (_, k) => (me + 1 + k) % V.n);
    const cards = `<div class="fa-ps">${order.map(j => cardHtml(V, ctx, j, watch)).join("")}</div>`;
    // 내 영역
    let mine = "";
    if (!watch) {
      const my = V.cubes[me], standingMe = V.hi && V.hi.s === me, mm = V.hi ? V.hi.c : 1;
      const slots = Array.from({ length: 10 }, (_, k) => k + 1).concat(my.includes(11) ? [11] : []);
      const tray = g ? `<div class="fa-gs"><button type="button" data-g="-1" aria-label="가넷 줄이기">−</button><b>${S.gv || ((V.hi ? V.hi.g : 0) + 1)}개<br><small>가진 가넷 ${V.gar[me]}개</small></b><button type="button" data-g="1" aria-label="가넷 늘리기">+</button></div>`
        : `<div class="fa-tray">${slots.map(c => {
          const has = my.includes(c), on = mineTurn && !V.mine && has && c >= mm, blk = on && V.hi && c === V.hi.c;
          return `<button type="button" class="fa-cb${!has ? " gone" : !on ? " off" : ""}${c === 11 ? " abs" : ""}${blk ? " blk" : ""}${S.sel === c ? " sel" : ""}" data-c="${c}"${on ? "" : " tabindex=\"-1\""} aria-label="큐브 ${c}">${c}</button>`;
        }).join("")}</div>`;
      const fm = G.formTxt(V, me), step = G.stepTxt(V, me);
      mine = `<div class="fa-me"><div class="hd"><div class="tl">${tileChips(V.nums[me], V.ops[me], false)}</div></div><div class="fm">${esc(fm)}${V.over ? "" : ` <small>· ${esc(step)}</small>`}</div>${tray}</div>`;
      if (mineTurn && !V.mine) {
        const lim = cfg.limit | 0, sel = S.sel, valid = g ? true : sel > 0, gvv = S.gv || ((V.hi ? V.hi.g : 0) + 1);
        const goTxt = g ? `가넷 ${gvv}개 걸기` : sel ? (V.hi && sel === V.hi.c ? `큐브 ${sel} 로 막기` : `큐브 ${sel} 내기`) : "큐브를 골라요";
        actH = `${lim ? `<div class="fa-bar" data-bar="${(ctx.fast ? 3000 : lim * 1000)}"><i></i></div>` : ""}<div class="fa-act"><button type="button" class="fa-pass" data-a="pass">넘기기</button><button type="button" class="fa-go${V.hi && sel === V.hi.c ? "" : " blue"}" data-a="go"${valid ? "" : " disabled"}>${goTxt}</button></div>`;
      }
    }
    stage.innerHTML = `${top}<div class="fa-st">${st}</div>${cards}${mine}${actH}`;
    // 시계
    if (mineTurn && !V.mine && S.armed !== pk) {
      const lim = cfg.limit | 0;
      if (lim > 0) { S.armed = pk; arm(ctx.fast ? 3000 : lim * 1000, () => whenAct(() => send({ t: "pass" }))); }
    }
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.c != null) { const c = +t.dataset.c; if (!t.classList.contains("gone") && !t.classList.contains("off")) pickCube(c); return; }
      if (t.dataset.g != null) { stepG(+t.dataset.g); return; }
      if (t.dataset.a === "pass") { send({ t: "pass" }); return; }
      if (t.dataset.a === "go") {
        const V2 = S.V; if (!V2) return;
        if (V2.phase === "gbid") send({ t: "gbid", g: S.gv || ((V2.hi ? V2.hi.g : 0) + 1) });
        else if (S.sel) send({ t: "bid", c: S.sel });
      }
    };
  }
  const result = (V, me) => {
    const H = V.hist || [], won = me >= 0 ? H.filter(h => h.k === "win" && h.s === me).length : 0, voids = H.filter(h => h.k === "void").length, none = H.filter(h => h.k === "none").length;
    const w = V.winner, f = V.fin && w >= 0 ? V.fin[w] : null;
    return `<b>${V.lot}회</b>까지 · ${V.endBy === "ten" && f ? `우승 수식 ${esc(f.expr)} = 10` : "24회까지 아무도 10 을 못 만들었어요"}${me >= 0 ? ` · 내가 낙찰한 경매 ${won}번` : ""} · 낙찰방해 ${voids}번 · 입찰 없음 ${none}번<br>내 큐브 ${me >= 0 ? V.cubes[me].length : "-"}장 남음`;
  };

  // ── 1분 규칙 ──
  const cubeRow = (arr, cls) => `<div class="row">${arr.map(c => `<i class="cube ${(cls && cls[c]) || ""}">${c}</i>`).join("")}</div>`;
  const tutTiles = (nums, ops) => `<div class="row">${tileChips(nums, ops, false)}</div>`;
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 준비", title: "숫자큐브 10개로 24번의 경매에 나서요", body: "모두 <b>숫자큐브 1~10</b> 10개를 받아요 (방송은 5명). 경매에는 <b>숫자 타일</b>과 <b>기호 타일</b>(+ − × ÷)이 순서표대로 나오고, 큐브가 입찰에 쓰는 돈이에요. 타일을 사 모아 <b>답이 10 인 수식</b>을 가장 먼저 만들면 우승!",
        boardHtml: `<div class="fa-tut">${cubeRow([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}<div class="fa-tl" style="width:200px"><i class="fa-t n">1</i><i class="fa-t o">×</i><small>이런 타일이 24번 나와요</small></div></div>`, ms: 7000 },
      { tag: "STEP 2 · 입찰", title: "높은 큐브가 낙찰 — 낸 큐브는 모두 사라져요", body: "타일이 공개되면 큐브 한 장을 내서 입찰해요. <b>더 높은 큐브가 안 나오면 낙찰</b>! 한 경매에 여러 번 낼 수 있지만 <b>낸 큐브는 이긴 사람 것도 전부 버려져요</b>. 아래 예: 성규가 1 → 3 → 5, 김경란이 2 → 4 를 냈고 성규 낙찰 — 큐브 6장이 사라졌어요.",
        boardHtml: `<div class="fa-tut"><div class="fa-tl" style="width:150px"><i class="fa-t n">3</i></div><div class="row"><small>성규</small>${cubeRow([1, 3, 5], { 1: "x", 3: "x", 5: "w" })}</div><div class="row"><small>김경란</small>${cubeRow([2, 4], { 2: "x", 4: "x" })}</div><small>높은 큐브를 한 번에 내면 적게 써요</small></div>`, ms: 7000 },
      { tag: "STEP 3 · 낙찰방해", title: "같은 큐브가 나오면 경매가 무효예요", body: "<b>같은 큐브</b>가 나오면 그 경매는 <b>무효</b>예요(낙찰방해) — 큐브도 타일도 모두 버려져요. 상대가 꼭 필요한 타일을 사려고 큐브 5 를 냈어요. <b>막으려면 같은 큐브 5 </b>를 눌러 보세요!",
        interactive: { hint: "👆 상대가 큐브 5 를 냈어요 — 같은 큐브를 눌러 막아 봐요", doneText: "✅ 같은 큐브 5 가 나와 경매가 무효가 됐어요 — 상대가 낸 5 도 버려져요" },
        render(stage, ctrl) {
          let done = false;
          const draw = msg => { stage.innerHTML = `<div class="fa-tut"><div class="fa-tl" style="width:160px"><i class="fa-t n">10</i><i class="fa-t o">÷</i></div><div class="fa-hi on" style="width:150px"><small>서 있는 입찰</small><b>큐브 5</b><em>상대</em></div><div class="fa-tray">${[5, 6, 7, 8, 9, 10].map(c => `<button type="button" class="fa-cb${c === 5 ? " blk" : ""}" data-c="${c}">${c}</button>`).join("")}</div><small>${msg}</small></div>`; };
          draw("내 큐브 중 어떤 걸 내면 좋을까요?");
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || done) return;
            const c = +b.dataset.c; ctrl.sfx("tap");
            if (c === 5) { done = true; draw("같은 큐브! 낙찰방해로 경매가 무효예요 🚫"); ctrl.sfx("win"); ctrl.complete(); }
            else draw(c > 5 ? `큐브 ${c} 는 상대보다 높아서 내가 낙찰해요 (큐브 ${c} 와 상대의 5 모두 버려져요) — 막으려면 같은 5 를 눌러요` : "5 보다 낮은 큐브는 낼 수 없어요");
          };
        } },
      { tag: "STEP 4 · 특별경매", title: "13회는 가넷으로 사는 절대큐브 11", body: "13회는 <b>가넷</b>으로 응찰해 <b>숫자큐브 11</b>(절대큐브)을 사요. 11 은 <b>어떤 경매에서든 이겨요</b>. 가넷을 1개씩 올려 가며 겨루고, <b>낙찰받지 못한 사람의 가넷은 돌려받아요</b>.",
        boardHtml: `<div class="fa-tut"><div class="fa-tl sp" style="width:190px"><i class="fa-t abs">11</i><small>특별경매<br>절대큐브</small></div><div class="fa-gs"><button type="button" tabindex="-1">−</button><b>8개</b><button type="button" tabindex="-1">+</button></div><small>시작 가넷은 사람마다 달라요 (7 · 14 · 15 · 11 · 7개)</small></div>`, ms: 7000 },
      { tag: "STEP 5 · 수식", title: "타일을 모두 써서 답이 10 인 수식을 만들어요", body: "가진 타일을 <b>숫자 → 기호 → 숫자</b> 순서로 놓아요 (곱셈 · 나눗셈이 먼저). 타일을 <b>모두</b> 써서 답이 <b>10</b> 이면 그 자리에서 우승이에요. 아래 타일 <b>1 · 10 · ÷</b> 로 10 을 만들어 보세요 (성규의 우승 수식이에요)!",
        interactive: { hint: "👆 타일을 눌러 순서대로 놓아요 (숫자 → 기호 → 숫자)", doneText: "✅ 10 ÷ 1 = 10 — 타일을 모두 써서 10 이 됐어요!" },
        render(stage, ctrl) {
          const T = [{ k: "n", v: 1 }, { k: "n", v: 10 }, { k: "o", v: "÷" }];
          let seq = [], done = false;
          const draw = msg => {
            stage.innerHTML = `<div class="fa-tut"><div class="row" style="min-height:42px">${seq.length ? seq.map(i => `<i class="fa-t ${T[i].k}">${T[i].v}</i>`).join("") : "<small>여기에 놓여요</small>"}</div><div class="row">${T.map((t, i) => (seq.includes(i) ? "" : `<button type="button" class="fa-t ${t.k}" data-t="${i}" style="cursor:pointer">${t.v}</button>`)).join("")}</div><small>${msg}</small></div>`;
          };
          draw("타일 3개를 모두 놓아요");
          stage.onclick = e => {
            const b = e.target.closest("[data-t]"); if (!b || done) return;
            seq.push(+b.dataset.t); ctrl.sfx("tap");
            if (seq.length < 3) { draw(`${seq.length}번째 타일을 놓았어요`); return; }
            const ok = T[seq[0]].k === "n" && T[seq[1]].k === "o" && T[seq[2]].k === "n";
            if (!ok) { seq = []; draw("숫자 → 기호 → 숫자 순서로 놓아요, 다시!"); return; }
            const v = G.evalSeq([T[seq[0]].v, T[seq[2]].v], [T[seq[1]].v]);
            if (v[1] === 1 && v[0] === 10) { done = true; draw(`${T[seq[0]].v} ${T[seq[1]].v} ${T[seq[2]].v} = 10 ✔`); ctrl.sfx("win"); ctrl.complete(); }
            else { const t = `${T[seq[0]].v} ${T[seq[1]].v} ${T[seq[2]].v} = ${G.fmt(v)} — 10 이 아니에요, 다시!`; seq = []; draw(t); }
          };
        } },
      { tag: "STEP 6 · 끝", title: "먼저 10 · 아니면 24회에 가장 가까운 수식", body: "누가 <b>먼저 10</b> 을 완성하면 그 자리에서 게임 끝! 24회까지 아무도 못 만들면 <b>10 에 가장 가까운 수식</b>이 우승이고, 차이가 같으면 <b>높은 숫자</b>가 우세해요 (9 와 11 이면 11). 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="fa-tut"><span style="font-size:42px">🏆</span><small>10 완성 → 즉시 우승 · 못 만든 사람은 공동 최하위</small></div>`, ms: 6400 },
    ];
  }

  // ── 복기 고리 ──
  const actText = a => (!a || typeof a !== "object" ? "—" : a.t === "pass" ? "넘김" : a.t === "bid" ? `큐브 ${a.c} 입찰` : a.t === "gbid" ? `가넷 ${a.g}개` : "—");
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || typeof myA !== "object" || !Array.isArray(V.cubes) || seat < 0 || seat >= V.n || !V.needs || !V.needs.includes(seat)) return null;
    if (V.phase === "gbid") return null;
    const pl = G.planFor(V, seat, "hard"), c = pl.cands, mine = c.find(x => x.a.t === myA.t && (myA.t === "pass" || x.a.c === myA.c));
    if (!mine) return null;
    let best = c[0]; for (const x of c) if (x.u > best.u + 1e-9) best = x;
    const d = best.u - mine.u; if (d <= 0.02) return { sev: 0, why: `이 창에선 좋은 수예요 — ${mine.why}` };
    const sev = Math.max(0, Math.min(100, Math.round(d * 100)));
    const me = G.actTxt(myA), bb = G.actTxt(best.a);
    return { sev, why: `${V.lot}회: ${me} (${mine.why}) → 고급 AI 는 ${bb} (${best.why}) — 값 차이 ${d.toFixed(2)} (큐브 1칸 = 0.03)`, best: bb };
  }
  // 자동 시험 · 시험 틀의 내 차례 수: 보통 AI 의 수
  function qa(V, me, rnd) { return V.needs.includes(me) ? G.ai(V, me, "normal", rnd) : null; }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-formulaauction"] = {
    name: "수식 경매", emoji: "🧮", short: "큐브로 타일을 사 모아 답이 10 인 수식을 먼저 만들어요", min: G.MIN_N, max: G.MAX_N, defN: G.MAX_N, board: false, fitCoach: true,
    show: "더 지니어스 · 시즌 1 · 수식 경매", season: "시즌 1 게임의 법칙",
    opts: [
      { k: "limit", label: "창 제한 시간", items: [[10, "10초"], [5, "5초 (방송)"], [0, "없음"]], def: 10 },
    ],
    diff: "방송은 타일이 공개되면 5초 안에 손을 들어 큐브를 내는 실시간 경쟁이에요. 우리 판은 5초 반응을 '창'으로 바꿨어요 — 창마다 모두가 (넘기기 · 큐브 한 장) 을 동시에 고르고, 같은 창에서 낸 큐브 중 가장 큰 것이 이겨요 (가장 큰 큐브가 둘 이상이거나 서 있는 입찰과 같으면 낙찰방해로 무효). 낸 큐브가 모두 버려지는 것 · 낙찰방해 · 13회 절대큐브는 방송 그대로 · 창 제한 시간은 옵션(기본 10초, 방송 5초, 없음) · 가넷은 13회에서만 쓰고 같은 가넷을 부르면 추첨이에요 · 방송의 협상 · 가넷 주고받기 · 작전타임(6 · 12 · 18회 후 10분)은 한 기기 · AI 로 안 돼서 뺐어요 · 방송은 5명, 우리 판은 3~5명 (AI 는 방송 출연자 성격이 아니에요) · 우승해도 가넷을 받는 보상은 계산하지 않아요 · 문서(나무위키) 기준 · 영상 미확인: 입찰이 없으면 타일이 버려져요 · 타일을 모두 써야 10 으로 쳐요 · 숫자를 붙여 두 자리 수는 못 만들어요 · 곱셈 · 나눗셈 먼저, 소수 · 분수로 떨어지는 답도 그대로 계산해요 (방송 영상에서 확인한 완성 수식은 모두 정수예요)",
    howto: [
      "모두 <b>숫자큐브 1~10</b> 10개를 받아요 (13회에 이기면 <b>절대큐브 11</b> 하나 더)",
      "<b>24번의 경매</b> — 숫자 · 기호 타일이 순서표대로 나와요 (14~22회는 숫자 + 기호 묶음)",
      "큐브 한 장으로 입찰해요. <b>더 높은 큐브가 안 나오면 낙찰</b> · 낸 큐브는 <b>이긴 사람 것도 전부 버려져요</b>",
      "<b>같은 큐브</b>가 나오면 그 경매는 <b>무효</b>(낙찰방해) — 큐브도 타일도 버려져요",
      "<b>13회 특별경매</b>: 가넷으로 응찰해 <b>절대큐브 11</b> (어떤 경매든 이겨요) · 못 이긴 사람의 가넷은 돌려받아요",
      "가진 타일을 <b>모두</b> 써서 숫자 → 기호 → 숫자 … 로 놓은 식이 <b>10</b> 이면 즉시 우승 (곱셈 · 나눗셈 먼저)",
      "24회까지 아무도 못 만들면 <b>10 에 가장 가까운 수식</b>이 우승 (같으면 높은 숫자) · 나머지는 공동 최하위",
    ],
    sub: V => (V.over ? "끝" : `${V.lot} / ${V.nlot}회 · ${V.special ? "특별경매" : `타일 ${V.tile.n || ""}${V.tile.n && V.tile.o ? " " : ""}${V.tile.o || ""}`}`),
    chip: (V, i) => ({ t: `큐브 ${V.cubes[i].length}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa, tutorial,
  };
})();

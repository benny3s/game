/* 베니 서바이벌 · 중간 달리기 — 화면 (31칸 길 · 카드 1~4 · 능력 5개 · 중간 순위로 골인하면 우승) */
(() => {
  "use strict";
  const G = window.SVCores["gn-midrun"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COL = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7"];
  const CSS = `
.mr-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.mr-rd{font:900 14px var(--round);color:#fff;background:rgba(34,197,94,.22);border:1px solid rgba(74,222,128,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.mr-bg{font:800 12px var(--round);color:#fde68a;line-height:1.3;min-width:0;max-width:100%}
.mr-trk{flex:none;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:4px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)}
.mr-c{position:relative;min-height:33px;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);display:flex;flex-wrap:wrap;gap:1px;align-content:center;justify-content:center;padding:9px 1px 1px;box-sizing:border-box}
.mr-c i{position:absolute;top:0;left:3px;font:700 8px var(--round);font-style:normal;color:#64748b}
.mr-c.goal{background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.5)}
.mr-c.goal i{color:#fde68a}
.mr-k{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;font:900 9px var(--round);color:#fff;border:1.5px solid rgba(255,255,255,.7);box-sizing:border-box}
.mr-k.me{border-color:#fff;box-shadow:0 0 0 2px #fde68a}
.mr-k.cur{animation:mrPulse 1s ease-in-out infinite}
@keyframes mrPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
.mr-pl{flex:none;display:grid;gap:3px}
.mr-p{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;padding:3px 7px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0}
.mr-p.me{border-color:#fde68a;background:rgba(253,230,138,.08)}
.mr-p.cur{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.3)}
.mr-p.fin{opacity:.6}
.mr-p.win{border-color:#86efac;background:rgba(34,197,94,.14);opacity:1}
.mr-p .nm{font:800 12px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mr-p .ab{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mr-p .tx{display:grid;gap:0;min-width:0}
.mr-p .ps{font:900 13px var(--round);color:#fde68a;white-space:nowrap}
.mr-h{display:flex;gap:2px}
.mr-h b{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:5px;background:rgba(255,255,255,.14);font:900 10px var(--round);color:#fff}
.mr-h b.u{opacity:.25}
.mr-ln{flex:none;text-align:center;font:700 11.5px var(--round);color:#cbd5e1;min-height:15px}
.mr-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.mr-info b{color:#fde68a}.mr-info .warn{color:#fca5a5}
.mr-box{flex:none;display:grid;gap:6px}
.mr-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.mr-cards button{padding:11px 0;border-radius:13px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 20px var(--round);cursor:pointer}
.mr-cards button.go{border-color:#fde68a;background:rgba(253,230,138,.2)}
.mr-cards button:disabled{opacity:.25;cursor:default}
.mr-tg{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.mr-tg button{padding:7px 10px;border-radius:10px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:800 12.5px var(--round);cursor:pointer}
.mr-tg button.on{border-color:#fde68a;background:rgba(253,230,138,.2)}
.mr-tg .lb{align-self:center;font:800 11.5px var(--round);color:var(--soft)}
.mr-md{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.mr-md button{padding:7px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:800 12.5px var(--round);cursor:pointer}
.mr-md button.on{border-color:#fde68a;background:rgba(253,230,138,.2)}
.mr-rs{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:4px;align-content:start}
.mr-rw{padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font:700 12px var(--round);color:#e2e8f0}
.mr-rw.me{border-color:#fde68a}.mr-rw.win{border-color:#86efac;background:rgba(34,197,94,.12)}
.mr-rw b{color:#fff}
.mr-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.mr-tut .mr-info{width:100%}
.mr-opt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.mr-opt button{padding:10px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 17px var(--round);cursor:pointer}
@media (max-height:780px){.mr-c{min-height:29px}.mr-cards button{padding:8px 0;font-size:18px}.mr-info{font-size:11.5px}.mr-p{padding:2px 6px}}
@media (max-height:690px){.mr-c{min-height:26px;padding-top:7px}.mr-k{width:13px;height:13px;font-size:8px}.mr-info.hint{display:none}.mr-p .tx{display:flex;gap:6px;align-items:baseline}.mr-p .rt{display:flex!important;gap:6px;align-items:center}.mr-cards button{padding:6px 0;font-size:16px}.mr-tg button{padding:5px 8px}.mr-md button{padding:5px 3px}}
@media (max-height:690px) and (min-width:0){.mr-pl{gap:2px}.mr-p{padding:1px 6px}.mr-c{min-height:23px;padding-top:6px}.mr-ln{min-height:13px;font-size:11px}.mr-box,.mr-tg,.mr-md{gap:4px}}
.mr-tg button,.mr-md button{min-height:36px}
@media (max-height:690px){.mr-tg.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(60px,1fr))}.mr-tg.g .lb{display:none}.mr-tg.g button{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;padding:2px 2px}.mr-tg.g .pp{font-size:10.5px;font-weight:700;opacity:.85}}
@media (max-height:650px){.mr-n5 .mr-info.ask{display:none}}
.mr-n5 .mr-p .tx{display:flex;gap:6px;align-items:baseline}.mr-n5 .mr-p .rt{display:flex!important;gap:6px;align-items:center}.mr-n5 .mr-pl{gap:2px}.mr-n5 .mr-p{padding:1px 6px}.mr-n5 .mr-c{min-height:26px;padding-top:7px}.mr-n5 .mr-ln{min-height:13px}.mr-n5 .mr-info.hint{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const who = (ctx, me, watch, i) => (i === me && !watch ? "나" : esc(nameOf(ctx, i)));
  const ini = (ctx, me, watch, i) => (i === me && !watch ? "나" : esc(Array.from(String(nameOf(ctx, i)).replace(/\s/g, ""))[0] || "?"));
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.turnNo}|${ctx.me}`;
    if (!RS || RS.key !== key) RS = { key, g: ctx.g, mode: "move", tg: null, w: null, t: 0 };
    return RS;
  };
  function trackHtml(V, ctx, me, watch) {
    const cells = [];
    for (let i = 0; i < 32; i++) cells.push([]);
    for (let s = 0; s < V.n; s++) cells[Math.min(V.pos[s], 31)].push(s);
    return `<div class="mr-trk">${cells.map((l, i) => `<div class="mr-c ${i === 31 ? "goal" : ""}"><i>${i === 0 ? "출발" : i === 31 ? "🏁" : i}</i>${l.map(s => `<span class="mr-k ${s === me && !watch ? "me" : ""} ${V.cur === s ? "cur" : ""}" style="background:${COL[s % 5]}">${ini(ctx, me, watch, s)}</span>`).join("")}</div>`).join("")}</div>`;
  }
  function playersHtml(V, ctx, me, watch) {
    const place = s => V.fin[s] >= 0 ? V.fin[s] + 1 : 0;
    return `<div class="mr-pl">${V.tord.map(s => {
      const a = G.AB[V.ab[s]], sil = V.silTg === s && !V.over;
      const winner = V.over && V.ranks[s] === 0;
      const cls = [s === me && !watch ? "me" : "", V.cur === s && !V.over ? "cur" : "", V.fin[s] >= 0 && !V.over ? "fin" : "", winner ? "win" : ""].join(" ");
      const hand = V.fin[s] >= 0 ? "" : `<div class="mr-h">${G.SETC.map(c => `<b class="${V.hand[s].includes(c) ? "" : "u"}">${c}</b>`).join("")}</div>`;
      return `<div class="mr-p ${cls}"><span class="mr-k" style="background:${COL[s % 5]};width:18px;height:18px;font-size:10px">${ini(ctx, me, watch, s)}</span><div class="tx"><div class="nm">${who(ctx, me, watch, s)} ${sil ? "🔇" : ""}</div><div class="ab">${a.em} ${a.name}${sil ? " (막힘)" : ""}</div></div>${V.fin[s] >= 0 ? `<span class="ps">🏁 ${place(s)}등</span>` : `<div class="rt" style="display:grid;gap:1px;justify-items:end"><span class="ps">${V.pos[s]}칸</span>${hand}</div>`}</div>`;
    }).join("")}</div>`;
  }
  function logLine(V, ctx, me, watch) {
    const e = V.log.slice().reverse().find(x => ["card", "grav", "push", "sil", "union", "goal", "nopush"].includes(x.k));
    if (!e) return "";
    const w = i => who(ctx, me, watch, i);
    if (e.k === "card") return `${w(e.s)}: 카드 ${e.c}${e.w !== null && e.w !== undefined ? ` (🤝 ${w(e.w)}도 같이 ${e.c}칸)` : ""}`;
    if (e.k === "grav") return `${w(e.s)}: 🧲 카드 ${e.c}를 버리고 ${w(e.tg)}를 ${e.to}칸으로 끌어왔어요`;
    if (e.k === "push") return `${w(e.s)}: 👊 ${w(e.tg)}를 ${e.dir > 0 ? "앞" : "뒤"}으로 1칸 밀었어요`;
    if (e.k === "sil") return `${w(e.s)}: 🔇 ${w(e.tg)}의 능력을 막았어요`;
    if (e.k === "union") return `${w(e.s)}: 🧩 ${e.pulled.map(w).join("·")}를 끌어왔어요`;
    if (e.k === "goal") return `${w(e.s)}: 🏁 ${e.place}등으로 골인!`;
    return `${w(e.s)}: 밀지 않았어요`;
  }
  function renderOld(stage, V, ctx) {
    style();
    if (stage.classList) stage.classList.toggle("mr-n5", V.n >= 5);   // 5명이면 줄을 더 촘촘히 (폰 한 화면)
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const myAb = watch ? null : G.AB[V.ab[me]], wTxt = V.W.map(w => `${w}등`).join("·");
    let h = `<div class="mr-top"><span class="mr-rd">🏃 ${V.over ? "끝" : `${V.round + 1}라운드`}</span><span class="mr-bg">${V.over ? "" : `우승 = ${wTxt}으로 골인${myAb ? ` · 내 능력 ${myAb.em} ${myAb.name}` : ""}`}</span></div>`;
    h += trackHtml(V, ctx, me, watch) + (V.over ? "" : playersHtml(V, ctx, me, watch));   // 끝 화면은 아래 순위 목록이 같은 내용이라 줄여서 폰 한 화면에
    if (V.over) {
      h += `<div class="mr-rs">${V.places.map((s, i) => `<div class="mr-rw ${s === me && !watch ? "me" : ""} ${V.ranks[s] === 0 ? "win" : ""}"><b>${i + 1}등${V.fin[s] >= 0 ? " 골인" : " (미골인)"} · ${who(ctx, me, watch, s)}</b> ${V.ranks[s] === 0 ? "🏆 우승" : V.fin[s] < 0 ? `(${V.pos[s]}칸에서 끝)` : ""}</div>`).join("")}</div>`;
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="mr-info"><b>${first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 우승 순위는 ${wTxt}이에요</div>`;
      stage.innerHTML = h; stage.onclick = null; return;
    }
    h += `<div class="mr-ln">${logLine(V, ctx, me, watch)}</div>`;
    const c = V.cur;
    if (!mine) {
      h += `<div class="mr-info">${watch ? "구경 중" : `${who(ctx, me, watch, c)} 차례예요 — ${G.AB[V.ab[c]].em} ${G.AB[V.ab[c]].name}: ${G.AB[V.ab[c]].d}`}</div>`;
    } else if (V.phase === "sil") {
      const tg = G.silTargets(G.fromView(V), me);
      h += `<div class="mr-info"><b>🔇 능력을 막을 사람</b>을 골라요 — 다음 내 차례까지 그 사람의 능력이 안 써져요 (같은 사람을 연속으로는 못 해요)</div><div class="mr-tg">${tg.map(t => `<button data-sil="${t}">${who(ctx, me, watch, t)} ${G.AB[V.ab[t]].em}</button>`).join("")}</div>`;
    } else if (V.phase === "push") {
      h += `<div class="mr-info"><b>👊 푸시</b> — ${V.pend.tile}칸에 있는 사람을 밀 수 있어요</div><div class="mr-tg">${V.pend.cands.map(t => `<span class="lb">${who(ctx, me, watch, t)}</span><button data-push="${t}" data-dir="-1">⬅ 뒤로 1칸</button>${V.pend.tile + 1 < G.GOAL ? `<button data-push="${t}" data-dir="1">앞으로 1칸 ➡</button>` : ""}`).join("")}<button data-skip="1">밀지 않고 넘어가요</button></div>`;
    } else {
      const st = G.fromView(V), hand = V.hand[me], canGrav = V.ab[me] === "grav" && !G.silenced(st, me), gt = canGrav ? G.gravTargets(st, me) : [];
      const last = hand.length === 1, wt = V.ab[me] === "with" && !G.silenced(st, me) && last ? G.withTargets(st, me) : [];
      if (S.mode === "grav" && !gt.length) S.mode = "move";
      if (canGrav) h += `<div class="mr-md"><button data-mode="move" class="${S.mode === "move" ? "on" : ""}">🏃 카드로 이동</button><button data-mode="grav" class="${S.mode === "grav" ? "on" : ""}" ${gt.length ? "" : "disabled"}>🧲 이동 대신 끌어오기</button></div>`;
      if (canGrav && S.mode === "grav") h += `<div class="mr-tg g"><span class="lb">끌어올 사람</span>${gt.map(t => `<button data-gt="${t}" class="${S.tg === t ? "on" : ""}">${who(ctx, me, watch, t)} <span class="pp">(${V.pos[t]}칸)</span></button>`).join("")}</div>`;
      if (wt.length) h += `<div class="mr-tg"><span class="lb">🤝 같이 이동할 사람 (마지막 카드)</span><button data-w="-1" class="${S.w === null ? "on" : ""}">없음</button>${wt.map(t => `<button data-w="${t}" class="${S.w === t ? "on" : ""}">${who(ctx, me, watch, t)}</button>`).join("")}</div>`;
      const needTg = canGrav && S.mode === "grav" && S.tg === null;
      h += `<div class="mr-info ${S.mode === "grav" && S.tg === null ? "ask" : "hint"}">${S.mode === "grav" ? (S.tg === null ? "끌어올 사람을 먼저 골라요" : "버릴 카드를 골라요 (이동은 안 해요)") : "이동할 카드를 골라요 — 카드 수만큼 앞으로 가요"}</div><div class="mr-cards">${G.SETC.map(k => `<button data-c="${k}" class="${hand.includes(k) && !needTg ? "go" : ""}" ${hand.includes(k) && !needTg ? "" : "disabled"}>${k}</button>`).join("")}</div>`;
    }
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      const d = t.dataset;
      if (d.mode) { S.mode = d.mode; S.tg = null; ctx.sfx("tap"); renderOld(stage, V, ctx); return; }
      if (d.gt !== undefined) { S.tg = +d.gt; ctx.sfx("tap"); renderOld(stage, V, ctx); return; }
      if (d.w !== undefined) { S.w = +d.w < 0 ? null : +d.w; ctx.sfx("tap"); renderOld(stage, V, ctx); return; }
      const now = Date.now();
      if (now - S.t < 450 || (S.busy === V.pub && now - S.t < 1500)) return;   // 같은 화면에서 두 번 보내지 않아요
      S.t = now; S.busy = V.pub;
      if (d.sil !== undefined) { ctx.sfx("pop"); ctx.act({ t: "sil", tg: +d.sil }); return; }
      if (d.skip) { ctx.sfx("tap"); ctx.act({ t: "skip" }); return; }
      if (d.push !== undefined) { ctx.sfx("pop"); ctx.act({ t: "push", tg: +d.push, dir: +d.dir }); return; }
      if (d.c !== undefined) {
        ctx.sfx("pop");
        if (S.mode === "grav" && S.tg !== null) ctx.act({ t: "grav", c: +d.c, tg: S.tg });
        else { const a = { t: "card", c: +d.c }; if (S.w !== null) a.w = S.w; ctx.act(a); }
      }
    };
  }
  function result(V) {
    if (!V.ranks) return "끝나지 않은 판";
    const first = V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean);
    return `우승 ${first.join("·")}번 (우승 순위 ${V.W.join("·")}등) · 순위 ${V.places.map(s => s + 1).join(" → ")}`;
  }
  function tutorial() {
    style();
    const trk = (ps) => `<div class="mr-trk" style="width:100%;grid-template-columns:repeat(8,1fr)">${[...Array(16).keys()].map(i => `<div class="mr-c" style="min-height:30px"><i>${i}</i>${ps.filter(p => p.p === i).map(p => `<span class="mr-k" style="background:${p.c}">${p.n}</span>`).join("")}</div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "1등도 꼴찌도 아닌 '중간'으로 골인해요", body: "출발점(START)에서 <b>31칸</b> 앞의 결승점(GOAL)까지 달려요. 하지만 이기는 건 1등이 아니라 <b>중간 순위</b>예요! <b>9화판</b>은 한 자리가 말 2개(플레이어 + 게스트)를 굴려서 5명이면 10개 말 중 <b>5 · 6등</b>이 우승이고 6등이 골인하면 끝나요. <b>3화판</b>은 한 말씩 달려서 <b>1등과 꼴찌만 탈락</b>, 나머지는 모두 우승이에요.",
        boardHtml: `<div class="mr-tut"><div class="mr-info">9화 (5명 · 말 10개): 1 · 2 · 3 · 4 · <b>🏆 5 · 🏆 6</b> · 7 · 8 · 9 · 10등</div><div class="mr-info">3화 (4명): 🥇 1등 탈락 · <b>🏆 2 · 3등</b> · 4등(꼴찌) 탈락</div></div>`, ms: 8000 },
      { tag: "STEP 2 · 이동카드", title: "이동카드 1 · 2 · 3 · 4 를 한 장씩 써요", body: "내 차례에 이동카드 한 장을 내면 <b>그 숫자만큼 앞으로</b> 가요. 4장을 다 쓰면 새 4장을 받는데 이걸 <b>리셋</b>이라고 해요. 이동 순서는 캐릭터 번호로 정해져 있어서 번호가 작은 캐릭터부터 한 말씩 움직여요. <b>낸 카드와 남은 장수만 공개</b>예요 — 상대 손패는 비밀이라 낸 카드로 짐작해야 해요.",
        boardHtml: `<div class="mr-tut">${trk([{ p: 3, c: COL[0], n: "나" }, { p: 5, c: COL[1], n: "A" }, { p: 5, c: COL[2], n: "B" }])}<div class="mr-pl" style="width:100%"><div class="mr-p me"><span class="mr-k" style="background:${COL[0]};width:18px;height:18px">나</span><div class="tx"><div class="nm">나</div><div class="ab">🧩 유니온</div></div><div style="display:grid;gap:1px;justify-items:end"><span class="ps">3칸</span><div class="mr-h"><b class="u">1</b><b class="u">2</b><b>3</b><b>4</b></div></div></div></div><div class="mr-info">1 · 2 를 써서 3칸, 3 · 4 가 남았어요 (상대에겐 '2장 남음' 만 보여요)</div></div>`, ms: 8500 },
      { tag: "STEP 3 · 능력", title: "캐릭터마다 특수능력이 달라요", body: "🧲<b>그래비티</b> 카드를 버리고 한 말을 내 1칸 앞 · 뒤로 당겨요. 👊<b>푸시</b> 같은 칸의 말을 1칸 밀어내요. 🤝<b>위드</b> 마지막 카드로 한 말과 같이 이동. 🧩<b>유니온</b> 내 1칸 앞의 말을 끌어와요. 🔇<b>사일런스</b> 다음 내 차례까지 능력을 막아요. 🗑️<b>딜리트</b> 다른 능력으로 내가 움직이면 한 말의 카드를 보고 1장만 남겨요. 🪞<b>미러</b> 다른 능력으로 움직이면 한 말을 같은 칸 수만큼 반대로 보내요. ♻️<b>리셋</b> 내가 뒤로 가면 한 말의 카드를 리셋. 🎁<b>오퍼</b> · 📋<b>카피</b> 카드가 리셋될 때 카드를 주거나 능력을 복사해요 (9화). ☝️<b>원</b> · 🦘<b>점프</b> · ⚡<b>퀵</b> (3화).",
        boardHtml: `<div class="mr-tut"><div class="mr-info">다른 말을 지목하는 능력은 같은 말에게 연속으로 쓸 수 없고, 골인하면 능력이 사라져요. 능력은 한 말씩 번호 순으로 처리하고, 그 이동에서 터지는 능력을 먼저 끝내요.</div></div>`, ms: 11000 },
      { tag: "STEP 4 · 작전", title: "빨리 가는 게 아니라 순서를 맞춰요", body: "너무 빨라도 너무 느려도 안 돼요. 앞선 말을 <b>끌어오거나 무력화하고</b>, 뒤처진 말을 <b>밀어서 기다리게</b> 해서, 내 말이 <b>우승 순위로 골인</b>하게 만드는 게임이에요. 골인은 31칸에 닿거나 넘기면 돼요 (넘쳐도 골인).",
        boardHtml: `<div class="mr-tut"><div class="mr-info">낸 카드로 상대의 남은 카드를 짐작하고, 내 능력으로 순서를 바꿔 봐요.</div></div>`, ms: 7000 },
      { tag: "STEP 5 · 직접", title: "유니온을 쓰면 상대는 어디로 갈까요?", body: "나(🧩 유니온)는 <b>9칸</b>, A 는 <b>11칸</b>이에요. 카드 <b>1</b>을 내면 10칸이 되고, 내 <b>1칸 앞(11칸)</b>에 있는 A 가 끌려와요. A 는 몇 칸이 될까요?",
        interactive: { hint: "👆 A 가 갈 칸을 골라요", doneText: "✅ 10칸! 내가 이동한 칸(10)으로 A 가 끌려와서 둘이 같은 칸이 돼요." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="mr-tut">${trk([{ p: 9, c: COL[0], n: "나" }, { p: 11, c: COL[1], n: "A" }])}<div class="mr-opt">${["9", "10", "11", "12"].map(x => `<button data-w="${x}">${x}</button>`).join("")}</div><div class="mr-info" id="mr-tm">나 9칸 + 카드 1 → 10칸. A 는?</div></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return;
            if (b.dataset.w === "10") { ctrl.sfx("win"); ctrl.complete(); }
            else { ctrl.sfx("tap"); const m = stage.querySelector("#mr-tm"); if (m) m.textContent = b.dataset.w === "11" ? "11칸은 원래 자리예요 — 유니온이 끌어와요" : "내가 이동한 뒤의 칸(10)으로 끌어와요"; }
          };
        } },
    ];
  }

  // ═══ 방송 판 화면 (3화 · 9화) — 말(piece) 하나하나 · 손패는 내 것만 (딜리트로 본 것도 포함) ═══
  const NCSS = `
.mr-st{flex:none;display:flex;flex-wrap:wrap;gap:2px 6px;justify-content:space-between;align-items:center;font:700 10.5px var(--round);color:#94a3b8;min-height:17px}
.mr-st .mr-sl{display:flex;flex-wrap:wrap;gap:2px;align-items:center}
.mr-st .mr-wn{font:800 11px var(--round);color:#fde68a;white-space:nowrap}
.mr-tg.n button{min-height:38px}
@media (max-height:660px){.mr-tg.n{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:3px}.mr-tg.n .lb{grid-column:1/-1;text-align:center;line-height:1.1}.mr-tg.n button{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}.mr-fin:empty{display:none}.mr-tg.n button .l2{display:block;line-height:1;font-size:11px}.mr-tg.n button{padding:1px 2px!important}.mr-pc{padding:0 5px}.mr-pc .nm,.mr-pc .ps{line-height:1.15}.mr-st{min-height:13px}.mr-c{min-height:22px;padding-top:6px}.mr-ln{min-height:12px;font-size:11px}.mr-info{line-height:1.3}.mr-tg.n button{min-height:36px;padding-top:3px;padding-bottom:3px}.mr-cards.n button{padding:4px 0}}
.mr-rs.two{grid-template-columns:1fr 1fr}
.mr-rs.two .mr-rw{padding:4px 6px;font-size:11.5px}
.mr-rw small{font:700 10px var(--round);color:#94a3b8}
.mr-k.e{width:17px;height:17px;font-size:11px;background:rgba(15,23,42,.9);border:2px solid var(--c,#fff);line-height:1}
.mr-k.e.me{box-shadow:0 0 0 1.5px #fde68a}
.mr-c .mr-n{position:absolute;right:3px;top:0;font:900 9px var(--round);color:#fde68a}
.mr-fin{flex:none;text-align:center;font:800 11px var(--round);color:#fde68a;min-height:14px}
.mr-g2{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:3px}
.mr-g2.one{grid-template-columns:1fr}
.mr-pc{display:grid;grid-template-columns:auto 1fr auto;gap:4px;align-items:center;padding:2px 5px;border-radius:9px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);border-left:4px solid var(--c,#fff);min-width:0}
.mr-pc.me{background:rgba(253,230,138,.08)}
.mr-pc.cur{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.3)}
.mr-pc.fin{opacity:.55}
.mr-pc.win{border-color:#86efac;background:rgba(34,197,94,.14);opacity:1}
.mr-pc .no{font:900 9.5px var(--round);color:#64748b}
.mr-pc .nm{font:800 11.5px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mr-pc .nm small{font:700 9.5px var(--round);color:var(--soft)}
.mr-pc .ps{font:900 11.5px var(--round);color:#fde68a;white-space:nowrap;text-align:right}
.mr-pc .hd{font:800 9.5px var(--round);color:#cbd5e1;white-space:nowrap;text-align:right}
.mr-pc .hd b{display:inline-grid;place-items:center;min-width:12px;height:12px;border-radius:4px;background:rgba(255,255,255,.16);color:#fff;margin-left:1px;font:900 9px var(--round)}
.mr-cards.n{grid-template-columns:repeat(auto-fit,minmax(56px,1fr))}
.mr-cards.n button small{font:800 9px var(--round);opacity:.8}
.mr-tg button small{font:700 10px var(--round);opacity:.8}
@media (max-height:780px){.mr-pc{padding:1px 5px}.mr-k.e{width:15px;height:15px;font-size:10px}.mr-st{min-height:15px}}
@media (max-height:690px){.mr-pc .hd{display:none}.mr-fin{min-height:12px}.mr-cards.n button{padding:6px 0;font-size:16px}}`;
  let nstyled = false;
  const nstyle = () => { style(); if (nstyled) return; nstyled = true; const s = document.createElement("style"); s.textContent = NCSS; document.head.appendChild(s); };
  let RN = null;
  const rsN = (V, ctx) => {
    const key = `${ctx.g}|${V.pub}|${ctx.me}`;
    if (!RN || RN.key !== key) RN = { key, mode: "move", tg: null, w: null, d: undefined, c: null, t: 0, busy: RN && RN.g === ctx.g ? RN.busy : null, g: ctx.g };
    return RN;
  };
  const abOf = (V, p) => G.NAB[V.ab[p]];
  function pName(V, ctx, me, watch, p, short) {   // 말 이름 — 3화: 자리 이름 + 능력 · 9화: 능력 (자리)
    const a = abOf(V, p), ow = who(ctx, me, watch, V.ow[p]);
    return V.ver === "r9" ? `${a.em} ${a.name}${short ? "" : ` <small>(${ow})</small>`}` : `${ow} <small>${a.em}${a.name}</small>`;
  }
  const effK = (V, p) => (V.fin[p] >= 0 || V.sil.some((t, i) => t === p && V.fin[i] < 0) ? null : V.ab[p] === "copy" ? V.cp[p] : V.ab[p]);
  function trackN(V, ctx, me, watch) {
    const cells = Array.from({ length: 32 }, () => []);
    for (let p = 0; p < V.P; p++) cells[Math.min(V.pos[p], 31)].push(p);
    const tok = p => `<span class="mr-k e ${V.ow[p] === me && !watch ? "me" : ""} ${V.curP === p && !V.over ? "cur" : ""}" style="--c:${COL[V.ow[p] % 5]}">${abOf(V, p).em}</span>`;
    const wn = V.over ? "" : `<span class="mr-wn">${V.ver === "r9" ? "9화 · 우승 5·6등".replace("5·6", `${V.W[0]}·${V.W[1]}`) : "3화 · 1등 · 꼴찌만 탈락"}</span>`;
    const start = `<div class="mr-st"><span class="mr-sl">출발선 ${cells[0].length ? cells[0].map(tok).join("") : "· 아직 없어요"}</span>${wn}</div>`;
    const trk = `<div class="mr-trk">${cells.map((l, i) => `<div class="mr-c ${i === 31 ? "goal" : ""}"><i>${i === 0 ? "출발" : i === 31 ? "🏁" : i}</i>${i === 0 || i === 31 ? (l.length ? `<b class="mr-n">${l.length}</b>` : "") : l.map(tok).join("")}</div>`).join("")}</div>`;
    const fin = V.finOrder.length ? `<div class="mr-fin">🏁 ${V.finOrder.map((p, i) => `${i + 1}등 ${abOf(V, p).em}`).join(" · ")}</div>` : `<div class="mr-fin"></div>`;
    return start + trk + fin;
  }
  function handHtml(V, p) {
    if (V.fin[p] >= 0) return "";
    const h = V.hand[p];
    return h ? h.map(c => `<b>${c}</b>`).join("") : `<b title="상대 카드는 비밀이에요">?</b>×${V.cnt[p]}`;
  }
  function piecesHtml(V, ctx, me, watch) {
    const two = V.P > 5;
    return `<div class="mr-g2 ${two ? "" : "one"}">${V.tord.map((p, ti) => {
      const a = abOf(V, p), winner = V.over && V.ranks[V.ow[p]] === 0 && V.places.indexOf(p) + 1 >= V.W[0] && V.places.indexOf(p) + 1 <= V.W[V.W.length - 1];
      const cls = [V.ow[p] === me && !watch ? "me" : "", V.curP === p && !V.over ? "cur" : "", V.fin[p] >= 0 && !V.over ? "fin" : "", winner ? "win" : ""].join(" ");
      const marks = (V.sil.some((t, i) => t === p && V.fin[i] < 0) ? " 🔇" : "") + (V.ab[p] === "copy" ? (V.cp[p] ? ` →${G.NAB[V.cp[p]].em}` : " →?") : "") + (V.ab[p] === "quick" && V.fin[p] < 0 ? ` ⏩${V.qf[p]}/2` : "");
      const right = V.fin[p] >= 0 ? `<span class="ps">🏁 ${V.fin[p] + 1}등</span>` : `<div><div class="ps">${V.pos[p]}칸</div><div class="hd">${handHtml(V, p)}</div></div>`;
      return `<div class="mr-pc ${cls}" style="--c:${COL[V.ow[p] % 5]}"><span class="no">${ti + 1}</span><div class="nm">${pName(V, ctx, me, watch, p, two)}${marks}</div>${right}</div>`;
    }).join("")}</div>`;
  }
  function logLineN(V, ctx, me, watch) {
    const e = V.log.slice().reverse().find(x => ["card", "grav", "push", "sil", "uni", "goal", "one", "mir", "rst", "del", "dk", "off", "cpy", "rs", "nouni"].includes(x.k));
    if (!e) return "";
    const pn = p => pName(V, ctx, me, watch, p, true).replace(/<\/?small>/g, ""), ab = p => abOf(V, p);
    switch (e.k) {
      case "card": return `${pn(e.p)}: 카드 ${e.c}${e.d ? (e.d > 0 ? " ×2 앞으로" : " ×2 뒤로") : ""}${e.w !== null && e.w !== undefined ? ` (🤝 ${pn(e.w)}도 같이 ${e.c}칸)` : ""}`;
      case "grav": return `${pn(e.p)}: 🧲 카드 ${e.c}를 버리고 ${pn(e.tg)}를 ${e.to}칸으로`;
      case "push": return `${pn(e.p)}: 👊 ${pn(e.tg)}를 ${e.dir > 0 ? "앞" : "뒤"}으로 1칸 밀었어요`;
      case "sil": return `${pn(e.p)}: 🔇 ${pn(e.tg)}의 능력을 막았어요`;
      case "uni": return `${pn(e.p)}: 🧩 ${e.pulled.map(pn).join("·")}를 끌어왔어요`;
      case "nouni": return `${pn(e.p)}: 🧩 끌어오지 않았어요`;
      case "one": return `${pn(e.p)}: ☝️ ${e.dir > 0 ? "앞" : "뒤"}으로 1칸 움직였어요`;
      case "mir": return `${pn(e.p)}: 🪞 ${pn(e.tg)}를 반대로 ${Math.abs(e.d)}칸 보냈어요`;
      case "rst": return `${pn(e.p)}: ♻️ ${pn(e.tg)}의 카드를 리셋했어요`;
      case "del": return `${pn(e.p)}: 🗑️ ${pn(e.tg)}의 카드를 봤어요`;
      case "dk": return `${pn(e.p)}: 🗑️ ${pn(e.q)}의 카드를 ${e.n}장 없앴어요`;
      case "off": return `${pn(e.p)}: 🎁 ${pn(e.tg)}에게 카드를 1장 줬어요`;
      case "cpy": return `${pn(e.p)}: 📋 ${pn(e.tg)}의 ${G.NAB[e.ab] ? G.NAB[e.ab].name : "능력"}을 복사했어요`;
      case "rs": return `${pn(e.p)}: 카드가 새로 4장으로 리셋됐어요`;
      case "goal": return `${pn(e.p)}: 🏁 ${e.place}등으로 골인!`;
    }
    return "";
  }
  const wTxtN = V => (V.ver === "r9" ? `${V.W[0]} · ${V.W[1]}등` : `1등과 꼴찌만 빼고 모두`);
  function infoN(V, ctx, me, watch, acts, S) {   // 지금 할 일 · 안내 글
    const j = V.job, pn = p => pName(V, ctx, me, watch, p, true).replace(/<\/?small>/g, "");
    if (V.phase === "sil") return `<b>🔇 능력을 막을 말</b>을 골라요 — 다음 내 차례까지 그 말의 능력이 안 써져요 (같은 말을 연속으로는 못 해요)`;
    if (j) switch (j.k) {
      case "push": return `<b>👊 푸시</b> — 같은 칸에 있는 말: ${pn(j.q)}${V.pos[j.q] ? ` (${V.pos[j.q]}칸)` : ""}. 앞이나 뒤로 1칸 밀어내요`;
      case "uni": return `<b>🧩 유니온</b> — 내 1칸 앞의 말들을 내 칸으로 끌어올까요? (9화는 고를 수 있어요)`;
      case "onc": return `<b>☝️ 원</b> — 누가 카드 1을 냈어요. 그 말이 움직이기 전에 앞이나 뒤로 1칸 움직여요`;
      case "mir": return `<b>🪞 미러</b> — 능력으로 ${Math.abs(j.d)}칸 ${j.d > 0 ? "앞으로" : "뒤로"} 움직였어요. 같은 칸 수만큼 <b>반대로 보낼 말</b>을 골라요`;
      case "rst": return `<b>♻️ 리셋</b> — 내 말이 뒤로 갔어요. 이동카드를 <b>리셋할 말</b>을 골라요`;
      case "del": return `<b>🗑️ 딜리트</b> — 다른 능력으로 움직였어요. 이동카드를 <b>볼 말</b>을 골라요 (본 뒤 1장만 남겨요)`;
      case "dk": return `<b>🗑️ ${pn(j.q)}</b>의 카드예요 — <b>남길 1장</b>을 골라요 (나머지는 없어져요)`;
      case "off": return `<b>🎁 오퍼</b> — 카드가 리셋됐어요. 새 카드 중 <b>줄 1장</b>과 <b>받을 말</b>을 골라요`;
      case "cpy": return `<b>📋 카피</b> — 카드가 리셋됐어요. <b>복사할 능력</b>의 말을 골라요 (다음 리셋까지 내 능력이에요)`;
    }
    const hasG = acts.some(a => a.t === "grav"), hasW = acts.some(a => a.w !== undefined), hasD = acts.some(a => a.d !== undefined);
    if (S.mode === "grav") return S.tg === null ? `끌어올 말을 먼저 골라요` : `버릴 카드를 골라요 (이동은 안 해요)`;
    return `이동할 카드를 골라요 — 카드 수만큼 앞으로 가요${hasD ? " (⚡ 퀵: 카드가 2배)" : ""}${hasW ? " · 🤝 마지막 카드는 같이 갈 말도 골라요" : ""}${hasG ? "" : ""}`;
  }
  function renderN(stage, V, ctx) {
    nstyle();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rsN(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const myPs = watch ? [] : [...Array(V.P).keys()].filter(p => V.ow[p] === me);
    const wTxt = wTxtN(V);
    let h = trackN(V, ctx, me, watch) + (V.over ? "" : piecesHtml(V, ctx, me, watch));
    if (V.over) {
      h += `<div class="mr-rs ${V.P > 5 ? "two" : ""}">${V.places.map((p, i) => { const win = V.ranks[V.ow[p]] === 0 && i + 1 >= V.W[0] && i + 1 <= V.W[V.W.length - 1]; return `<div class="mr-rw ${V.ow[p] === me && !watch ? "me" : ""} ${win ? "win" : ""}"><b>${i + 1}등</b> ${pName(V, ctx, me, watch, p)}${V.fin[p] < 0 ? ` <small>${V.pos[p]}칸에서 끝</small>` : ""}${win ? " 🏆" : ""}</div>`; }).join("")}</div>`;
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="mr-info"><b>${first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 우승 순위는 ${V.ver === "r9" ? `${V.W[0]} · ${V.W[1]}등` : "1등과 꼴찌를 뺀 모두"}예요</div>`;
      stage.innerHTML = h; stage.onclick = null; return;
    }
    h += `<div class="mr-ln">${logLineN(V, ctx, me, watch)}</div>`;
    const cp = V.curP, acts = mine ? G.actions(G.fromView(V)) : [];
    if (!mine) {
      const a = abOf(V, cp);
      h += `<div class="mr-info">${watch ? "구경 중 · " : ""}${who(ctx, me, watch, V.cur)} 차례예요 — ${a.em} ${a.name}${V.job ? ` (${({ push: "푸시", uni: "유니온", onc: "원", mir: "미러", rst: "리셋", del: "딜리트", dk: "딜리트", off: "오퍼", cpy: "카피" })[V.job.k] || ""} 선택)` : ""}: ${a.d}</div>`;
    } else {
      const j = V.job, pn = p => pName(V, ctx, me, watch, p, true), lab = p => `<span class="l1">${abOf(V, p).em} ${abOf(V, p).name}</span> <span class="l2">${V.ver === "r3" ? "" : `<small>${who(ctx, me, watch, V.ow[p])}</small> `}<small>${V.pos[p]}칸</small></span>`;
      h += `<div class="mr-info${V.phase === "card" && S.mode !== "grav" ? " hint" : ""}">${infoN(V, ctx, me, watch, acts, S)}</div>`;
      const btn = (i, label, on) => `<button data-i="${i}" class="${on ? "on" : ""}">${label}</button>`;
      if (V.phase === "card") {
        const cardActs = acts.filter(a => a.t === "card"), gravActs = acts.filter(a => a.t === "grav");
        const hand = V.hand[cp] || [], uniqC = hand.filter((c, i) => hand.indexOf(c) === i);
        const wOpts = [...new Set(cardActs.filter(a => a.w !== undefined).map(a => a.w))], dOpts = [...new Set(cardActs.filter(a => a.d !== undefined).map(a => a.d))];
        if (S.mode === "grav" && !gravActs.length) S.mode = "move";
        if (S.d === undefined && dOpts.length) S.d = dOpts.includes(1) ? 1 : dOpts[0];
        h += `<div class="mr-info" style="font-size:11.5px">내 차례 말: <b>${abOf(V, cp).em} ${abOf(V, cp).name}</b> · ${V.pos[cp]}칸 · 카드 ${hand.join(" · ") || "-"}</div>`;
        if (gravActs.length) h += `<div class="mr-md"><button data-mode="move" class="${S.mode === "move" ? "on" : ""}">🏃 카드로 이동</button><button data-mode="grav" class="${S.mode === "grav" ? "on" : ""}">🧲 이동 대신 끌어오기</button></div>`;
        if (S.mode === "grav") h += `<div class="mr-tg n"><span class="lb">끌어올 말</span>${[...new Set(gravActs.map(a => a.tg))].map(t => `<button data-gt="${t}" class="${S.tg === t ? "on" : ""}">${lab(t)}</button>`).join("")}</div>`;
        else {
          if (dOpts.length) h += `<div class="mr-md">${dOpts.map(d => `<button data-d="${d}" class="${S.d === d ? "on" : ""}">${d > 0 ? "⏩ 앞으로 ×2" : "⏪ 뒤로 ×2"}</button>`).join("")}</div>`;
          if (wOpts.length) h += `<div class="mr-tg n"><span class="lb">🤝 같이 이동할 말 (마지막 카드)</span><button data-w="-1" class="${S.w === null ? "on" : ""}">없음</button>${wOpts.map(t => `<button data-w="${t}" class="${S.w === t ? "on" : ""}">${lab(t)}</button>`).join("")}</div>`;
        }
        const needTg = S.mode === "grav" && S.tg === null;
        const ok = c => !needTg && (S.mode === "grav" ? gravActs.some(a => a.c === c && a.tg === S.tg) : cardActs.some(a => a.c === c && (S.w !== null ? a.w === S.w : a.w === undefined) && (S.d === undefined ? true : a.d === S.d)));
        h += `<div class="mr-cards n">${uniqC.map(c => { const k = hand.filter(x => x === c).length; return `<button data-c="${c}" class="${ok(c) ? "go" : ""}" ${ok(c) ? "" : "disabled"}>${c}${k > 1 ? ` <small>×${k}</small>` : ""}</button>`; }).join("")}</div>`;
      } else if (V.phase === "sil") {
        h += `<div class="mr-tg n">${acts.map((a, i) => btn(i, lab(a.tg))).join("")}</div>`;
      } else if (j && (j.k === "push" || j.k === "onc")) {
        h += `<div class="mr-tg n">${acts.map((a, i) => btn(i, a.dir > 0 ? "앞으로 1칸 ➡" : "⬅ 뒤로 1칸")).join("")}</div>`;
      } else if (j && j.k === "uni") {
        h += `<div class="mr-tg n">${acts.map((a, i) => btn(i, a.u ? "🧩 끌어와요" : "그냥 넘어가요")).join("")}</div>`;
      } else if (j && j.k === "dk") {
        const q = j.q; h += `<div class="mr-info" style="font-size:11.5px">내가 본 카드: <b>${(V.hand[q] || []).join(" · ")}</b></div><div class="mr-cards n">${acts.map((a, i) => `<button data-i="${i}" class="go">${a.c}</button>`).join("")}</div>`;
      } else if (j && j.k === "off") {
        const cs = [...new Set(acts.map(a => a.c))], ts = [...new Set(acts.map(a => a.tg))];
        h += `<div class="mr-cards n">${cs.map(c => `<button data-oc="${c}" class="${S.c === c ? "go" : ""}">${c}</button>`).join("")}</div>`;
        h += `<div class="mr-tg n"><span class="lb">받을 말</span>${ts.map(t => `<button data-ot="${t}" ${S.c === null ? "disabled" : ""}>${lab(t)}</button>`).join("")}</div>`;
      } else {
        h += `<div class="mr-tg n">${acts.map((a, i) => btn(i, lab(a.tg))).join("")}</div>`;
      }
    }
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      const d = t.dataset;
      if (d.mode) { S.mode = d.mode; S.tg = null; ctx.sfx("tap"); renderN(stage, V, ctx); return; }
      if (d.gt !== undefined) { S.tg = +d.gt; ctx.sfx("tap"); renderN(stage, V, ctx); return; }
      if (d.w !== undefined) { S.w = +d.w < 0 ? null : +d.w; ctx.sfx("tap"); renderN(stage, V, ctx); return; }
      if (d.d !== undefined) { S.d = +d.d; ctx.sfx("tap"); renderN(stage, V, ctx); return; }
      if (d.oc !== undefined) { S.c = +d.oc; ctx.sfx("tap"); renderN(stage, V, ctx); return; }
      const now = Date.now();
      if (now - S.t < 450 || (S.busy === V.pub && now - S.t < 1500)) return;   // 같은 화면에서 두 번 보내지 않아요
      S.t = now; S.busy = V.pub;
      let a = null;
      if (d.i !== undefined) a = acts[+d.i];
      else if (d.ot !== undefined) a = acts.find(x => x.t === "off" && x.c === S.c && x.tg === +d.ot);
      else if (d.c !== undefined) {
        if (S.mode === "grav" && S.tg !== null) a = acts.find(x => x.t === "grav" && x.c === +d.c && x.tg === S.tg);
        else a = acts.find(x => x.t === "card" && x.c === +d.c && (S.w !== null ? x.w === S.w : x.w === undefined) && (S.d === undefined ? true : x.d === S.d));
      }
      if (a) { ctx.sfx("pop"); ctx.act(a); } else S.t = 0;
    };
  }
  const render = (stage, V, ctx) => (V && V.ver ? renderN(stage, V, ctx) : renderOld(stage, V, ctx));

  const chipN = (V, i) => {
    const ps = [...Array(V.P).keys()].filter(p => V.ow[p] === i), pc = p => (V.over ? `${V.places.indexOf(p) + 1}등` : V.fin[p] >= 0 ? `🏁${V.fin[p] + 1}등` : `${V.pos[p]}칸`);
    return { t: ps.map(pc).join("·"), on: V.needs.includes(i) && !V.over, out: false };
  };
  const resultN = V => {
    if (!V.ranks) return "끝나지 않은 판";
    const first = V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean);
    return `우승 ${first.join("·")}번 (${V.ver === "r9" ? "9화" : "3화"} · 우승 순위 ${V.ver === "r9" ? V.W.join("·") + "등" : "1등 · 꼴찌만 빼고"}) · 순위 ${V.places.map(p => G.NAB[V.ab[p]].em).join(" → ")}`;
  };
  const DIFF = "방송 9화는 플레이어 5명 + 게스트 5명이 10개 캐릭터(1 그래비티 · 2 푸시 · 3 딜리트 · 4 오퍼 · 5 위드 · 6 유니온 · 7 미러 · 8 카피 · 9 리셋 · 10 사일런스)를 추첨볼 번호 순서대로 고르고 6등이 골인하면 끝나요 (5 · 6등 우승), 3화는 11명이 11개 캐릭터(1 그래비티 · 2 리셋 · 3 푸시 · 4 딜리트 · 5 위드 · 6 유니온 · 7 원 · 8 미러 · 9 점프 · 10 사일런스 · 11 퀵)를 우선권 경매 · 지목 순서로 고르고 전원 골인하면 끝나요 (1등과 꼴찌는 데스매치) — 우리는 캐릭터를 고르지 않고 제비뽑기로 받아요 · 9화판은 한 자리가 말 2개(플레이어 + 게스트)를 굴리고, 5명일 때만 방송처럼 10개 · 5·6등이에요 (3명은 말 6개 · 3·4등 우승, 4명은 말 8개 · 4·5등 우승으로 줄여요) · 3화판은 한 자리 = 한 말이고 11개 중 3~5개를 제비뽑기로 받아요 (1등 · 꼴찌만 탈락, 나머지는 모두 우승) · 방송처럼 남은 손패는 비밀이고 낸 카드와 장수만 공개예요 (딜리트로 본 사람만 알아요) · 능력이 이어질 때는 문서대로 '한 능력으로 여러 말이 움직이면 번호 순, 그 이동에서 터지는 능력부터 끝내고 다음 말'로 하고, 방송 설명에 없는 순서는 우리가 정했어요 — 이동이 모두 끝나면 푸시 → 유니온 → 카드 리셋(오퍼 → 카피) · 푸시는 같은 칸에 있으면 반드시 밀어내요 · 유니온은 9화는 고를 수 있고 3화는 무조건 · 딜리트는 본 뒤 남길 1장을 내가 골라요 · 문서가 짧은 퀵(뒤로는 ×2 로 계산) · 점프('2장일 때 리셋'은 안 쓰고 5장을 다 쓰면 새 5장)는 우리가 풀었고, 능력으로는 골인시킬 수 없어요 (위드 · 카드 이동만 골인) · 3화는 영상을 못 구해 문서와 예고 영상 기준이에요 · 옛 복기는 5개 능력 옛 규칙 그대로 다시 재생돼요";
  window.SVUI = window.SVUI || {};
  window.SVUI["gn-midrun"] = {
    name: "중간 달리기", emoji: "🏃", short: "1등도 꼴찌도 아닌 중간으로 골인해요 · 방송 3화 · 9화 판 · 능력 13개", min: 3, max: 5, defN: 4, board: false,
    show: "더 지니어스 · 시즌 3 · 중간 달리기", season: "시즌 3 블랙가넷",
    opts: [{ k: "ver", label: "판", items: [["r9", "9화 (캐릭터 10 · 5·6등 우승)"], ["r3", "3화 (캐릭터 11 · 1등 · 꼴찌만 탈락)"]], def: "r9" }],
    diff: DIFF,
    howto: [
      "출발점(START)에서 결승점(GOAL)까지 <b>31칸</b> — 이기는 건 1등이 아니라 <b>중간으로 골인</b>한 말이에요. <b>9화판</b>: 한 자리가 말 2개(플레이어 + 게스트)를 굴리고, 10개 말 중 <b>5 · 6등</b>이 우승 (6등이 골인하면 끝) · <b>3화판</b>: 한 말씩, <b>1등과 꼴찌만 탈락</b>",
      "캐릭터마다 <b>특수능력</b>이 달라요 (제비뽑기) · 🧲그래비티 ♻️리셋 👊푸시 🗑️딜리트 🎁오퍼 🤝위드 🧩유니온 🪞미러 📋카피 ☝️원 🦘점프 ⚡퀵 🔇사일런스 · 번호가 작은 캐릭터부터 한 말씩 움직여요",
      "이동카드 <b>1 · 2 · 3 · 4</b> 한 세트 — 한 장 내면 그 칸만큼 이동, 다 쓰면 새 4장(리셋) · <b>낸 카드와 장수만 공개</b>, 남은 손패는 비밀이에요 (딜리트로 본 사람만 알아요)",
      "능력이 이어지면 <b>번호가 빠른 말부터 움직이고, 그 이동에서 터지는 능력을 먼저 끝낸 뒤</b> 다음 말로 가요 · 다른 말을 <b>지목</b>하는 능력은 같은 말에게 연속으로 못 써요 · 골인한 말은 능력이 사라져요",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}라운드`),
    chip: (V, i) => (V.ver ? chipN(V, i) : ({ t: V.over ? `${V.places.indexOf(i) + 1}등` : V.fin[i] >= 0 ? `🏁${V.fin[i] + 1}등` : `${V.pos[i]}칸`, on: V.needs.includes(i) && !V.over, out: false })),
    render, result: V => (V && V.ver ? resultN(V) : result(V)),
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (같은 표본으로 두 수를 끝까지 해 봐서 우승 순위로 골인할 확률을 견줘요 · 보이는 것만, 모르는 손패는 표본)
    actText: (a, V, names) => G.actText(a, i => (names && names[i]) || `${i + 1}번`, V),
    review: (V, seat, myA, bestA, info) => {
      try {
        if (!V || !myA || !bestA || typeof seat !== "number" || V.over || V.cur !== seat) return null;
        const seed = ((info && info.seed) >>> 0) ^ Math.imul(((info && info.k) | 0) + 1, 0x9e3779b1) ^ Math.imul(V.turnNo + 1, 0x85ebca6b);
        const c = G.compareActs(V, seat, myA, bestA, seed >>> 0, V.ver ? 120 : 300);
        if (!c) return null;
        const loss = Math.max(0, c.dV), noise = loss < 2 * c.se + 0.005;   // 보상 차이가 표본 오차 안이면 '거의 같음'
        let sev = Math.round(Math.min(100, (100 * loss) / 0.14));
        if (noise) sev = Math.min(sev, 15);
        const pc = x => `${Math.round(x * 100)}%`, wTxt = V.W.map(w => `${w}등`).join("·"), pp = V.ver ? V.curP : seat;
        const place = 1 + V.pos.filter((p, i) => i !== pp && p > V.pos[pp]).length;
        const tail = noise ? " — 두 수의 차이는 표본 오차 안이라 거의 같아요" : c.dV < 0 ? "" : ` (기대 점수 ${c.best.v.toFixed(2)} vs ${c.my.v.toFixed(2)})`;
        return { sev, why: `우승 순위(${V.ver === "r3" ? "1등 · 꼴찌만 빼고" : wTxt})로 골인할 확률: 고급 AI 수 약 ${pc(c.best.wp)} → 내 수 ${pc(c.my.wp)}${tail} · 지금 내 말 ${V.pos[pp]}칸(${place}위)` };
      } catch (e) { return null; }
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

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
@media (max-height:690px){.mr-c{min-height:26px;padding-top:7px}.mr-k{width:13px;height:13px;font-size:8px}.mr-info.hint{display:none}.mr-p .tx{display:flex;gap:6px;align-items:baseline}.mr-cards button{padding:6px 0;font-size:16px}.mr-tg button{padding:5px 8px}.mr-md button{padding:5px 3px}}`;
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
      return `<div class="mr-p ${cls}"><span class="mr-k" style="background:${COL[s % 5]};width:18px;height:18px;font-size:10px">${ini(ctx, me, watch, s)}</span><div class="tx"><div class="nm">${who(ctx, me, watch, s)} ${sil ? "🔇" : ""}</div><div class="ab">${a.em} ${a.name}${sil ? " (막힘)" : ""}</div></div>${V.fin[s] >= 0 ? `<span class="ps">🏁 ${place(s)}등</span>` : `<div style="display:grid;gap:1px;justify-items:end"><span class="ps">${V.pos[s]}칸</span>${hand}</div>`}</div>`;
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
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const myAb = watch ? null : G.AB[V.ab[me]], wTxt = V.W.map(w => `${w}등`).join("·");
    let h = `<div class="mr-top"><span class="mr-rd">🏃 ${V.over ? "끝" : `${V.round + 1}라운드`}</span><span class="mr-bg">${V.over ? "" : `우승 = ${wTxt}으로 골인${myAb ? ` · 내 능력 ${myAb.em} ${myAb.name}` : ""}`}</span></div>`;
    h += trackHtml(V, ctx, me, watch) + playersHtml(V, ctx, me, watch);
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
      if (canGrav && S.mode === "grav") h += `<div class="mr-tg"><span class="lb">끌어올 사람</span>${gt.map(t => `<button data-gt="${t}" class="${S.tg === t ? "on" : ""}">${who(ctx, me, watch, t)} (${V.pos[t]}칸)</button>`).join("")}</div>`;
      if (wt.length) h += `<div class="mr-tg"><span class="lb">🤝 같이 이동할 사람 (마지막 카드)</span><button data-w="-1" class="${S.w === null ? "on" : ""}">없음</button>${wt.map(t => `<button data-w="${t}" class="${S.w === t ? "on" : ""}">${who(ctx, me, watch, t)}</button>`).join("")}</div>`;
      const needTg = canGrav && S.mode === "grav" && S.tg === null;
      h += `<div class="mr-info ${S.mode === "grav" && S.tg === null ? "" : "hint"}">${S.mode === "grav" ? (S.tg === null ? "끌어올 사람을 먼저 골라요" : "버릴 카드를 골라요 (이동은 안 해요)") : "이동할 카드를 골라요 — 카드 수만큼 앞으로 가요"}</div><div class="mr-cards">${G.SETC.map(k => `<button data-c="${k}" class="${hand.includes(k) && !needTg ? "go" : ""}" ${hand.includes(k) && !needTg ? "" : "disabled"}>${k}</button>`).join("")}</div>`;
    }
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      const d = t.dataset;
      if (d.mode) { S.mode = d.mode; S.tg = null; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.gt !== undefined) { S.tg = +d.gt; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.w !== undefined) { S.w = +d.w < 0 ? null : +d.w; ctx.sfx("tap"); render(stage, V, ctx); return; }
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
      { tag: "STEP 1 · 목표", title: "1등도 꼴찌도 아닌 '중간'으로 골인해요", body: "출발점(START)에서 <b>31칸</b> 앞의 결승점(GOAL)까지 달려요. 하지만 이기는 건 1등이 아니라 <b>중간 순위</b>예요! 3명이면 <b>2등</b>, 4명이면 <b>2 · 3등</b>, 5명이면 <b>3등</b>으로 골인한 사람이 우승이에요. (방송 9화는 10명 중 5 · 6등이 우승이었어요)",
        boardHtml: `<div class="mr-tut"><div class="mr-info">3명: 🥇 1등 · <b>🏆 2등</b> · 3등</div><div class="mr-info">4명: 1등 · <b>🏆 2등 · 🏆 3등</b> · 4등</div><div class="mr-info">5명: 1 · 2 · <b>🏆 3등</b> · 4 · 5</div></div>`, ms: 7500 },
      { tag: "STEP 2 · 이동카드", title: "이동카드 1 · 2 · 3 · 4 를 한 장씩 써요", body: "내 차례에 이동카드 한 장을 내면 <b>그 숫자만큼 앞으로</b> 가요. 4장을 다 쓰면 새 4장을 받아요. 이동 순서는 캐릭터 번호로 정해져 있어서 번호가 작은 캐릭터부터 한 명씩 움직여요. <b>남은 카드는 모두에게 보여요</b> — 상대가 다음에 얼마나 갈 수 있는지 알 수 있어요.",
        boardHtml: `<div class="mr-tut">${trk([{ p: 3, c: COL[0], n: "나" }, { p: 5, c: COL[1], n: "A" }, { p: 5, c: COL[2], n: "B" }])}<div class="mr-pl" style="width:100%"><div class="mr-p me"><span class="mr-k" style="background:${COL[0]};width:18px;height:18px">나</span><div class="tx"><div class="nm">나</div><div class="ab">🧩 유니온</div></div><div style="display:grid;gap:1px;justify-items:end"><span class="ps">3칸</span><div class="mr-h"><b class="u">1</b><b class="u">2</b><b>3</b><b>4</b></div></div></div></div><div class="mr-info">나는 1 · 2 를 써서 3칸, 3 · 4 가 남았어요</div></div>`, ms: 8500 },
      { tag: "STEP 3 · 능력", title: "캐릭터마다 특수능력이 달라요", body: "번호가 작은 캐릭터부터 한 명씩 움직여요. 🧲<b>그래비티</b>: 이동카드 1장을 버리고 이동을 포기하면, 지목한 한 명을 내 1칸 앞(앞선 사람) 또는 1칸 뒤(뒤처진 사람)로 당겨요. 👊<b>푸시</b>: 이동해서 같은 칸에 다른 캐릭터가 있게 되면 1칸 앞이나 뒤로 밀어요. 🤝<b>위드</b>: 마지막 남은 이동카드 1장으로 이동할 때 한 명을 지목해 같이 이동. 🧩<b>유니온</b>: 내 1칸 앞의 사람을 모두 내 칸으로 끌어와요. 🔇<b>사일런스</b>: 카드를 내기 전 한 명을 지목해 다음 내 턴까지 능력을 무력화해요.",
        boardHtml: `<div class="mr-tut"><div class="mr-info">다른 사람을 지목하는 능력(그래비티 · 위드 · 사일런스)은 같은 사람에게 연속으로 쓸 수 없어요. 골인하면 능력이 사라지고, 푸시로 골인시킬 수는 없어요.</div></div>`, ms: 10000 },
      { tag: "STEP 4 · 작전", title: "빨리 가는 게 아니라 순서를 맞춰요", body: "너무 빨라도 너무 느려도 안 돼요. 앞선 사람을 <b>끌어오거나 무력화하고</b>, 뒤처진 사람을 <b>밀어서 기다리게</b> 해서, 내가 <b>우승 순위로 골인</b>하게 만드는 게임이에요. 골인은 31칸에 닿거나 넘기면 돼요 (넘쳐도 골인).",
        boardHtml: `<div class="mr-tut"><div class="mr-info">상대의 남은 카드로 다음 이동을 예측하고, 내 능력으로 순서를 바꿔 봐요.</div></div>`, ms: 7000 },
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

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-midrun"] = {
    name: "중간 달리기", emoji: "🏃", short: "1등도 꼴찌도 아닌 중간으로 골인해요 · 이동카드 1~4 · 능력 5개", min: 3, max: 5, defN: 4, board: false,
    show: "더 지니어스 · 시즌 3 · 중간 달리기", season: "시즌 3 블랙가넷",
    opts: [],
    diff: "방송 9화는 플레이어 5명 + 게스트 5명이 10개 캐릭터(1 그래비티 · 2 푸시 · 3 딜리트 · 4 오퍼 · 5 위드 · 6 유니온 · 7 미러 · 8 카피 · 9 리셋 · 10 사일런스)를 추첨 번호 순서대로 골라 가지고, 6등이 골인하면 끝나요 (5 · 6등이 우승) — 우리는 3~5명이 제비뽑기로 능력을 받고 인원에 맞춰 중간(3명 2등 · 4명 2·3등 · 5명 3등)이 우승이에요 · 능력은 연쇄가 생기지 않는 5개(그래비티 · 푸시 · 위드 · 유니온 · 사일런스)만 써요 — 딜리트 · 오퍼 · 미러 · 카피 · 리셋은 서로 이어 터지는 처리 순서가 방송 설명에 없어서 뺐어요 (3화에 있던 점프 · 퀵 · 원도 영상을 못 구해서 뺐어요) · 방송은 낸 카드만 공개하고 남은 손패는 비밀이지만(딜리트가 상대 이동카드를 '확인'해요) 우리 5개 능력으로는 손패가 낸 카드로 다 계산돼서 모두 공개로 했어요 · 9화 푸시는 같은 칸에 있을 수 없어서 밀어내야 하지만 우리는 안 밀고 넘길 수도 있어요 · 9화 유니온은 쓸지 고를 수 있지만(3화는 무조건) 우리는 무조건 끌어와요 · 푸시로 골인시킬 수 없고, 그래비티는 같은 칸의 사람은 지목할 수 없어요",
    howto: [
      "출발점(START)에서 결승점(GOAL)까지 <b>31칸</b> — 이기는 건 1등이 아니라 <b>중간으로 골인</b>한 사람 (3명 2등 · 4명 2·3등 · 5명 3등)",
      "캐릭터마다 <b>특수능력</b>이 달라요 (제비뽑기) · 🧲그래비티 👊푸시 🤝위드 🧩유니온 🔇사일런스 · 번호가 작은 캐릭터부터 한 명씩 움직여요",
      "이동카드 <b>1 · 2 · 3 · 4</b> 한 세트 — 한 장 내면 그 칸만큼 이동, 4장을 다 쓰면 새 4장 · 남은 카드는 모두 공개",
      "다른 사람을 <b>지목</b>하는 능력(그래비티 · 위드 · 사일런스)은 같은 사람에게 연속으로 못 써요 · 골인한 사람은 능력이 사라지고, 마지막 우승 순위가 골인하는 순간 끝나요",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}라운드`),
    chip: (V, i) => ({ t: V.over ? `${V.places.indexOf(i) + 1}등` : V.fin[i] >= 0 ? `🏁${V.fin[i] + 1}등` : `${V.pos[i]}칸`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (같은 표본으로 두 수를 끝까지 해 봐서 우승 순위로 골인할 확률을 견줘요 · 모두 공개라 그 자리 view 로 충분)
    actText: (a, V, names) => G.actText(a, i => (names && names[i]) || `${i + 1}번`, V),
    review: (V, seat, myA, bestA, info) => {
      try {
        if (!V || !myA || !bestA || typeof seat !== "number" || V.over || V.cur !== seat) return null;
        const seed = ((info && info.seed) >>> 0) ^ Math.imul(((info && info.k) | 0) + 1, 0x9e3779b1) ^ Math.imul(V.turnNo + 1, 0x85ebca6b);
        const c = G.compareActs(V, seat, myA, bestA, seed >>> 0, 300);
        if (!c) return null;
        const names = info && info.names, nmOf = i => (names && names[i]) || `${i + 1}번`, nmf = i => (i === seat ? "나" : nmOf(i));
        const loss = Math.max(0, c.dV), noise = loss < 2 * c.se + 0.005;   // 보상 차이가 표본 오차 안이면 '거의 같음'
        let sev = Math.round(Math.min(100, (100 * loss) / 0.14));
        if (noise) sev = Math.min(sev, 15);
        const pc = x => `${Math.round(x * 100)}%`, wTxt = V.W.map(w => `${w}등`).join("·");
        const place = 1 + V.pos.filter(p => p > V.pos[seat]).length;
        const tail = noise ? " — 두 수의 차이는 표본 오차 안이라 거의 같아요" : c.dV < 0 ? "" : ` (기대 점수 ${c.best.v.toFixed(2)} vs ${c.my.v.toFixed(2)})`;
        return { sev, why: `우승 순위(${wTxt})로 골인할 확률: 고급 AI 수 약 ${pc(c.best.wp)} → 내 수 ${pc(c.my.wp)}${tail} · 지금 내 ${V.pos[seat]}칸(${place}위)` };
      } catch (e) { return null; }
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

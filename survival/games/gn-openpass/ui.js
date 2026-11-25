/* 베니 서바이벌 · 오픈, 패스 — 화면 (팩 구입 → 카드 20장 제출 → 오픈 / 패스로 10칸 수식판 채우기 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-openpass"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.op-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.op-rd{font:900 14px var(--round);color:#fff;background:rgba(14,165,233,.22);border:1px solid rgba(56,189,248,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.op-bg{font:800 12px var(--round);color:#fde68a;line-height:1.3;min-width:0;max-width:100%}
.op-pl{flex:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:4px}
.op-p{display:grid;gap:0;padding:4px 6px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0;cursor:default}
.op-p.me{border-color:#fde68a;background:rgba(253,230,138,.08)}
.op-p.cur{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.3)}
.op-p.win{border-color:#86efac;background:rgba(34,197,94,.14)}
.op-p.lose{border-color:#fca5a5;background:rgba(239,68,68,.12)}
.op-p .nm{font:800 11.5px var(--round);color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.op-p .vl{font:900 14px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.op-p .st{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap}
.op-bd{flex:none;display:grid;gap:4px;padding:6px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)}
.op-bd .lb{font:800 11.5px var(--round);color:var(--soft);text-align:center}
.op-sl{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.op-s{display:grid;place-items:center;height:38px;border-radius:9px;border:2px dashed rgba(255,255,255,.2);font:900 20px var(--round);color:#fff;background:rgba(255,255,255,.04);position:relative}
.op-s.f{border-style:solid}
.op-s.cb{background:#1f2937;border-color:#6b7280}.op-s.cr{background:#b91c1c;border-color:#fca5a5}.op-s.cu{background:#1d4ed8;border-color:#93c5fd}
.op-s.sy{color:#fde68a}
.op-s.dim{opacity:.38}
.op-s.new{animation:opPop .35s ease-out}
@keyframes opPop{0%{transform:scale(.6) rotate(-8deg)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
.op-ex{text-align:center;font:900 14px var(--round);color:#fff;line-height:1.35;word-break:break-word}
.op-ex b{color:#fde68a;font-size:17px}
.op-dk{flex:none;display:grid;grid-template-columns:repeat(10,1fr);gap:3px}
.op-c{display:grid;place-items:center;height:25px;border-radius:6px;border:2px solid transparent;font:800 11px var(--round);color:#fff;position:relative;box-sizing:border-box}
.op-c.cb{background:#1f2937}.op-c.cr{background:#b91c1c}.op-c.cu{background:#1d4ed8}
.op-c.pass{opacity:.28}
.op-c.pass::after{content:"✕";position:absolute;font-size:12px;color:#fff}
.op-c.now{border-color:#fde68a;box-shadow:0 0 0 2px rgba(253,230,138,.45)}
.op-c.op{border-color:rgba(255,255,255,.55)}
.op-c.sy{color:#fde68a}
.op-ln{flex:none;text-align:center;font:700 11.5px var(--round);color:#cbd5e1;min-height:15px}
.op-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.op-info b{color:#fde68a}.op-info .warn{color:#fca5a5}
.op-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:none}
.op-acts button{padding:11px 6px;border-radius:13px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 15px var(--round);cursor:pointer}
.op-acts button.go{border-color:#fde68a;background:rgba(253,230,138,.2)}
.op-acts button:disabled{opacity:.4;cursor:default}
.op-pk{flex:none;display:grid;gap:5px}
.op-pr{display:grid;grid-template-columns:30px 1fr auto;gap:7px;align-items:center;padding:6px 8px;border-radius:11px;background:rgba(0,0,0,.26);border:1px solid rgba(255,255,255,.14)}
.op-sw{width:26px;height:34px;border-radius:6px;border:2px solid rgba(255,255,255,.4)}
.op-sw.cb{background:#1f2937}.op-sw.cr{background:#b91c1c}.op-sw.cu{background:#1d4ed8}
.op-pr .tx{display:grid;gap:0;min-width:0}
.op-pr .tx b{font:900 13.5px var(--round);color:#fff}
.op-pr .tx span{font:700 11px var(--round);color:var(--soft);line-height:1.3}
.op-st{display:flex;align-items:center;gap:6px}
.op-st button{width:32px;height:32px;border-radius:10px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 17px var(--round);cursor:pointer;padding:0}
.op-st button:disabled{opacity:.35;cursor:default}
.op-st i{min-width:18px;text-align:center;font:900 16px var(--round);font-style:normal;color:#fde68a}
.op-sub{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:4px;align-content:start}
.op-gp{display:grid;gap:3px}
.op-gp .lb{font:800 11px var(--round);color:var(--soft)}
.op-ch{display:grid;grid-template-columns:repeat(8,1fr);gap:3px}
.op-ch button{display:grid;place-items:center;gap:0;padding:3px 0 2px;border-radius:8px;border:2px solid rgba(255,255,255,.25);color:#fff;font:900 15px var(--round);cursor:pointer;line-height:1.1;min-width:0}
.op-ch button.cb{background:#1f2937}.op-ch button.cr{background:#b91c1c}.op-ch button.cu{background:#1d4ed8}
.op-ch button i{font:800 10px var(--round);font-style:normal;opacity:.9}
.op-ch button.on{border-color:#fde68a;box-shadow:0 0 0 2px rgba(253,230,138,.4)}
.op-ch button.sy{color:#fde68a}
.op-ch button:not(.on){opacity:.62}
.op-sum{flex:none;display:flex;gap:6px;align-items:center;justify-content:center;font:800 12.5px var(--round);color:var(--soft);flex-wrap:wrap}
.op-sum b{color:#fff}.op-sum .bad{color:#fca5a5}
.op-sum button{padding:5px 10px;border-radius:9px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:800 12px var(--round);cursor:pointer}
.op-rs{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:4px;align-content:start}
.op-rw{padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.op-rw.me{border-color:#fde68a}.op-rw.win{border-color:#86efac;background:rgba(34,197,94,.12)}.op-rw.lose{border-color:#fca5a5;background:rgba(239,68,68,.1)}
.op-rw b{color:#fff}.op-rw .v{float:right;font:900 14px var(--round);color:#fde68a}
.op-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.op-tut .op-info{width:100%}
.op-tut .op-sl{width:100%}
.op-opt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.op-opt button{padding:10px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 17px var(--round);cursor:pointer}
@media (max-height:780px){.op-s{height:33px;font-size:18px}.op-c{height:22px}.op-info{font-size:11.5px}.op-acts button{padding:8px 4px;font-size:14px}.op-p{padding:3px 5px}.op-ex b{font-size:15px}.op-pr{padding:4px 7px}.op-sw{height:30px}.op-ch button{font-size:14px}}
@media (max-height:690px){.op-s{height:28px;font-size:16px}.op-c{height:19px;font-size:10px}.op-bd .lb{display:none}.op-info.hint{display:none}.op-p .st{display:none}.op-bg{display:none}.op-acts button{padding:6px 3px;font-size:13px}.op-pr .tx span{font-size:10px}.op-sw{height:28px}.op-ch button{padding:2px 0 1px;font-size:13px}.op-pl{gap:3px}.op-pl.bu{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const face = f => (typeof f === "number" ? String(f) : G.symTxt(f));
  const CB = { b: "cb", r: "cr", u: "cu" };
  const cardTxt = (b, f) => `${G.BACK_NAME[b]} ${face(f)}`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.phase}|${ctx.me}`;
    if (!RS || RS.key !== key) RS = { key, g: ctx.g, buy: [0, 0, 0], sel: null, t: 0 };
    return RS;
  };
  const spent = p => G.buyCost(p);
  // 수식판 칸 색은 '열린 카드의 뒷면 색' 을 쓰려고 trace · deck 정보를 같이 받아요
  const boardCells = (V, o) => {
    const out = []; let j = 0;
    const tr = V.tr[o], backs = V.backs ? V.backs[o] : null;
    for (let i = 0; i < tr.length; i++) if (tr[i] === "o") { out.push({ f: V.boards[o][j++], b: backs ? backs[i] : "b" }); }
    return out;
  };
  const slotRow = (cells, nNew) => {
    let h = "";
    for (let i = 0; i < G.SLOTS; i++) {
      const c = cells[i];
      h += c === undefined ? `<div class="op-s"></div>` : `<div class="op-s f ${CB[c.b]} ${typeof c.f === "string" ? "sy" : ""} ${i === nNew ? "new" : ""}">${face(c.f)}</div>`;
    }
    return h;
  };
  const deckRow = (V, o) => {
    const tr = V.tr[o], backs = V.backs[o], pos = V.pos[o], faces = boardCells(V, o); let j = 0, h = "";
    for (let i = 0; i < G.DECK; i++) {
      const b = CB[backs[i]];
      if (i < pos) {
        if (tr[i] === "o") { const c = faces[j++]; h += `<div class="op-c ${b} op ${typeof c.f === "string" ? "sy" : ""}">${face(c.f)}</div>`; }
        else h += `<div class="op-c ${b} pass"></div>`;
      } else h += `<div class="op-c ${b} ${i === pos && V.phase === "play" && V.cur === o ? "now" : ""}"></div>`;
    }
    return h;
  };
  const who = (ctx, V, me, watch, i) => (i === me && !watch ? "나" : esc(nameOf(ctx, i)));
  const lastLine = (V, ctx, me, watch) => {
    const e = V.log.slice().reverse().find(x => x.k === "open" || x.k === "pass" || x.k === "done");
    if (!e) return "";
    const nm = who(ctx, V, me, watch, e.s);
    if (e.k === "open") return `${nm}: ${cardTxt(e.b, e.f)} 카드를 열었어요${e.forced ? " (패스를 다 써서 자동)" : ""}`;
    if (e.k === "pass") return `${nm}: ${G.BACK_NAME[V.backs[e.s][Math.max(0, V.pos[e.s] - 1)]] || ""} 카드를 패스했어요 (앞면은 비밀)`;
    return `${nm}: 수식이 끝났어요 = ${esc(e.v)}`;
  };
  function renderBuy(stage, V, ctx, me, watch, mine, S) {
    let h = `<div class="op-top"><span class="op-rd">🃏 ${mine ? "추가 팩 구입" : "구입 중"}</span><span class="op-bg">가넷 ${V.gar}개 · 순서 ${V.order.map(s => who(ctx, V, me, watch, s)).join(" → ")}</span></div>`;
    h += `<div class="op-pl bu">${[...Array(V.n).keys()].map(i => `<div class="op-p ${i === me && !watch ? "me" : ""}"><div class="nm">${who(ctx, V, me, watch, i)}</div><div class="st">${V.buyDone[i] ? "✅ 정했어요" : "생각 중…"}</div></div>`).join("")}</div>`;
    if (mine) {
      const left = V.gar - spent(S.buy);
      h += `<div class="op-info hint">기본 카드 20장에 <b>팩</b>을 더해 카드를 늘려요 (가넷 ${V.gar}개) — 안 사도 돼요. 구입은 모두 정한 뒤에 공개돼요.</div><div class="op-pk">`;
      G.PACKS.forEach((p, i) => {
        const nums = p.nums.join(" "), cnt = x => p.sym[x] || 0;
        h += `<div class="op-pr"><div class="op-sw ${CB[p.b]}"></div><div class="tx"><b>${G.BACK_NAME[p.b]} 팩 · ${p.price}가넷</b><span>숫자 ${esc(nums)} · × ${cnt("*")} + ${cnt("+")} − ${cnt("-")} ÷ ${cnt("/")}</span></div><div class="op-st"><button data-p="${i}" data-d="-1" ${S.buy[i] <= 0 ? "disabled" : ""}>−</button><i>${S.buy[i]}</i><button data-p="${i}" data-d="1" ${left < p.price || S.buy[i] >= G.MAXBUY ? "disabled" : ""}>+</button></div></div>`;
      });
      h += `</div><div class="op-sum">쓰는 가넷 <b>${spent(S.buy)}</b> · 남는 가넷 <b>${left}</b></div><button class="btn big primary" data-a="buy">🛒 이대로 정하기</button>`;
    } else h += `<div class="op-info">${watch ? "구경 중" : V.buyDone[me] ? "✅ 정했어요 — 다른 사람을 기다려요" : "기다리는 중…"} (${V.buyDone.filter(Boolean).length}/${V.n}명)</div>`;
    return h;
  }
  const buysLine = (V, ctx, me, watch) => V.buys.every(b => b === null) ? "" : `<div class="op-info hint">구입 · ${V.buys.map((b, i) => `${who(ctx, V, me, watch, i)} ${b ? G.packTxt(b).replace(/ 팩/g, "").replace("추가 팩 없음", "없음") : "-"}`).join(" / ")}</div>`;
  function renderSubmit(stage, V, ctx, me, watch, mine, S) {
    let h = `<div class="op-top"><span class="op-rd">🃏 ${mine ? "낼 카드 20장 고르기" : "카드 제출 중"}</span><span class="op-bg">${V.subDone.filter(Boolean).length}/${V.n}명 냈어요</span></div>`;
    h += buysLine(V, ctx, me, watch);
    if (mine && V.pool) {
      if (!S.sel) S.sel = G.pickDeck(Object.fromEntries(V.pool.map(g => [g.key, g.n])), 10);
      const tot = Object.values(S.sel).reduce((s, x) => s + x, 0), nn = V.pool.filter(g => typeof g.f === "number").reduce((s, g) => s + (S.sel[g.key] || 0), 0);
      h += `<div class="op-info hint">카드를 누르면 한 장씩 늘어요 (가진 수를 넘으면 0 으로). 낸 카드는 <b>섞여서 뒷면으로</b> 깔려요 — 뒷면 색만 보여요.</div><div class="op-sub">`;
      for (const col of G.BACKS) {
        const gs = V.pool.filter(g => g.b === col); if (!gs.length) continue;
        h += `<div class="op-gp"><div class="lb">${G.BACK_NAME[col]} 뒷면</div><div class="op-ch">${gs.map(g => `<button class="${CB[col]} ${typeof g.f === "string" ? "sy" : ""} ${S.sel[g.key] ? "on" : ""}" data-k="${g.key}">${face(g.f)}<i>${S.sel[g.key] || 0}/${g.n}</i></button>`).join("")}</div></div>`;
      }
      h += `</div><div class="op-sum">${tot}/20장 · 숫자 ${nn} · 기호 ${tot - nn} <button data-a="rec">추천 채우기</button><button data-a="clr">비우기</button></div><button class="btn big primary" data-a="sub" ${tot === G.DECK ? "" : "disabled"}>📥 이 20장을 낼게요</button>`;
    } else h += `<div class="op-info">${watch ? "구경 중" : V.subDone[me] ? "✅ 냈어요 — 다른 사람을 기다려요" : "기다리는 중…"}</div>`;
    return h;
  }
  function renderPlay(stage, V, ctx, me, watch, mine, S) {
    const cur = V.cur, o = V.over ? (watch ? V.order[0] : me) : cur >= 0 ? cur : me;
    const val = i => (V.vals[i] ? G.showVal(V.vals[i]) : G.showVal(G.evalBoard(V.boards[i])));
    let h = `<div class="op-top"><span class="op-rd">🃏 ${V.over ? "끝" : mine ? "내 차례" : `${who(ctx, V, me, watch, cur)} 차례`}</span><span class="op-bg">순서 ${V.order.map(s => who(ctx, V, me, watch, s)).join(" → ")}</span></div>`;
    h += `<div class="op-pl">${V.order.map((i, ix) => {
      const cls = [i === me && !watch ? "me" : "", !V.over && i === cur ? "cur" : "", V.over && V.ranks[i] === 0 ? "win" : "", V.over && V.ranks[i] === Math.max(...V.ranks) && V.ranks[i] > 0 ? "lose" : ""].join(" ");
      return `<div class="op-p ${cls}"><div class="nm">${ix + 1}. ${who(ctx, V, me, watch, i)}</div><div class="vl">${V.vals[i] ? "" : "≈ "}${val(i)}</div><div class="st">${V.vals[i] ? "✔ 끝" : `${V.boards[i].length}/${G.SLOTS}칸 · 패스 ${V.passes[i]}/${G.MAXPASS}`}</div></div>`;
    }).join("")}</div>`;
    if (!V.over) {
      const cells = boardCells(V, o), fresh = V.log.length && V.log[V.log.length - 1].k === "open" && V.log[V.log.length - 1].s === o ? cells.length - 1 : -1;
      h += `<div class="op-bd"><div class="lb">${who(ctx, V, me, watch, o)} 수식판 (${V.boards[o].length}/${G.SLOTS}) · 패스 ${V.passes[o]}/${G.MAXPASS}</div><div class="op-sl">${slotRow(cells, fresh)}</div><div class="op-ex">${esc(G.exprText(V.boards[o])) || "—"} = <b>${val(o)}</b></div><div class="op-dk">${deckRow(V, o)}</div></div>`;
      h += `<div class="op-ln">${lastLine(V, ctx, me, watch)}</div>`;
    } else {
      h += `<div class="op-rs">${V.order.slice().sort((a, b) => V.ranks[a] - V.ranks[b]).map(i => {
        const cls = [i === me && !watch ? "me" : "", V.ranks[i] === 0 ? "win" : "", V.ranks[i] === Math.max(...V.ranks) && V.ranks[i] > 0 ? "lose" : ""].join(" ");
        return `<div class="op-rw ${cls}"><span class="v">${G.showVal(V.vals[i])}</span><b>${V.ranks[i] + 1}위 · ${who(ctx, V, me, watch, i)}</b><br>${esc(G.exprText(V.boards[i])) || "—"}</div>`;
      }).join("")}</div>`;
    }
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), mx = Math.max(...V.ranks), lows = V.ranks.map((x, i) => (x === mx ? i : -1)).filter(i => i >= 0);
      h += `<div class="op-info"><b>${first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 가장 작은 값(탈락 후보): ${lows.length === V.n ? "없음" : lows.map(i => (i === me && !watch ? "나" : esc(nameOf(ctx, i)))).join(" · ")}</div>`;
    } else if (mine) {
      const p = V.pos[me], col = V.backs[me][p], left = G.MAXPASS - V.passes[me];
      h += `<div class="op-info hint">${G.BACK_NAME[col]} 뒷면 카드예요 — 앞면은 오픈해야 알 수 있어요 · 패스는 ${left}장 더 쓸 수 있어요${left <= 0 ? ` <span class="warn">(다 썼어요)</span>` : ""}</div>`;
      h += `<div class="op-acts"><button data-a="open" class="go">🔓 오픈</button><button data-a="pass" ${left <= 0 ? "disabled" : ""}>⏭ 패스 (남은 ${left})</button></div>`;
    } else h += `<div class="op-info">${watch ? "구경 중" : "다른 사람이 고르는 중이에요…"}</div>`;
    return h;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const h = V.phase === "buy" ? renderBuy(stage, V, ctx, me, watch, mine, S) : V.phase === "submit" ? renderSubmit(stage, V, ctx, me, watch, mine, S) : renderPlay(stage, V, ctx, me, watch, mine, S);
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      if (V.phase === "buy") {
        if (t.dataset.p !== undefined) {
          const i = +t.dataset.p, d = +t.dataset.d, nb = S.buy.slice(); nb[i] = Math.max(0, nb[i] + d);
          if (spent(nb) <= V.gar) { S.buy = nb; ctx.sfx("tap"); render(stage, V, ctx); }
          return;
        }
        if (t.dataset.a === "buy") { ctx.sfx("pop"); ctx.act({ t: "buy", p: S.buy.slice() }); }
        return;
      }
      if (V.phase === "submit") {
        const pool = Object.fromEntries((V.pool || []).map(g => [g.key, g.n]));
        if (t.dataset.k) { const k = t.dataset.k, c = ((S.sel[k] || 0) + 1) % (pool[k] + 1); if (c) S.sel[k] = c; else delete S.sel[k]; ctx.sfx("tap"); render(stage, V, ctx); return; }
        if (t.dataset.a === "rec") { S.sel = G.pickDeck(pool, 10); ctx.sfx("tap"); render(stage, V, ctx); return; }
        if (t.dataset.a === "clr") { S.sel = {}; ctx.sfx("tap"); render(stage, V, ctx); return; }
        if (t.dataset.a === "sub" && Object.values(S.sel).reduce((s, x) => s + x, 0) === G.DECK) { ctx.sfx("pop"); ctx.act({ t: "submit", sel: Object.assign({}, S.sel) }); }
        return;
      }
      if (Date.now() - S.t < 450) return;   // 연타로 카드가 두 장 열리는 것을 막아요
      if (t.dataset.a === "open") { S.t = Date.now(); ctx.sfx("pop"); ctx.act({ t: "open" }); }
      else if (t.dataset.a === "pass") { S.t = Date.now(); ctx.sfx("tap"); ctx.act({ t: "pass" }); }
    };
  }
  function result(V) {
    if (!V.ranks) return "끝나지 않은 판";
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    const mx = V.ranks ? Math.max(...V.ranks) : 0, lows = V.ranks ? V.ranks.map((x, i) => (x === mx ? i + 1 : 0)).filter(Boolean) : [];
    return `우승 ${first.join("·")}번 (${G.showVal(V.vals[first[0] - 1])})${lows.length < V.n ? ` · 가장 작은 값 ${lows.join("·")}번 (${G.showVal(V.vals[lows[0] - 1])})` : ""}`;
  }
  // ── 🎞️ 복기 고리 ──
  // 행동 한 줄 글. V = 그 수를 두기 전 그 자리 view (없어도 됨)
  function actText(a, V) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "buy") { if (!Array.isArray(a.p) || a.p.length !== 3) return "추가 팩 구입"; const p = a.p.map(x => +x || 0); return p.some(Boolean) ? `${G.packTxt(p)} 구입 (가넷 ${G.buyCost(p)}개)` : "추가 팩 안 사요"; }
    if (a.t === "submit") return a.sel && typeof a.sel === "object" ? `카드 20장 제출 · ${G.selTxt(a.sel)}` : "카드 20장 제출";
    if (a.t === "open" || a.t === "pass") {
      const s = V && V.phase === "play" && V.cur >= 0 ? V.cur : -1, col = s >= 0 && V.backs && V.backs[s] ? V.backs[s][V.pos[s]] : null;
      const cd = V && s >= 0 && V.decks && V.decks[s] && V.decks[s][V.pos[s]];   // 다 공개된 view(끝난 뒤)면 앞면까지
      const head = col ? `${G.BACK_NAME[col]} 뒷면 카드` : "카드";
      if (a.t === "open") return cd ? `${head} 오픈 → ${cardTxt(cd.b, cd.f)}` : `${head} 오픈`;
      return `${head} 패스${s >= 0 ? ` (${V.passes[s] + 1}/${G.MAXPASS}번째)` : ""}`;
    }
    return "—";
  }
  // 내 수(myA)와 고급 AI 수(bestA) 를 같은 평가로 재요. 비교 못 하면 null
  //  · 오픈/패스 = 이길 확률 차이 (먼저 끝낸 사람이 있으면 지금 최고를 넘길 확률) · 구입/제출 = 그 덱끼리 맞붙었을 때 내 덱이 질 확률
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || typeof myA !== "object" || typeof bestA !== "object") return null;
    if (JSON.stringify(myA) === JSON.stringify(bestA)) return null;   // 같은 수
    const k = info && Number.isInteger(info.k) ? info.k : 0, base = ((((info && info.seed) | 0) ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0) || 1;
    const pc = x => Math.round(x * 100) + "%", cap = (sev, same) => Math.max(0, Math.min(same ? 50 : 100, Math.round(sev)));   // 같은 수를 고급 AI 도 두는 경우(info.same)는 큰 실수로 안 셈
    const same = !!(info && info.same);
    if (V.phase === "play" && (myA.t === "open" || myA.t === "pass") && (bestA.t === "open" || bestA.t === "pass")) {
      const ev = G.evalPlay(V, seat, base, 500);
      if (!ev || ev.pass === null) return null;
      const mine = myA.t === "open" ? ev.open : ev.pass, best = bestA.t === "open" ? ev.open : ev.pass, loss = Math.max(0, best - mine);
      const col = V.backs && V.backs[seat] ? G.BACK_NAME[V.backs[seat][V.pos[seat]]] : "";
      const lead = ev.win ? `지금 최고(${G.showVal(ev.T)})를 넘길 확률` : `이길 확률(상대 ${ev.nOpp}명도 내 덱과 비슷하다고 볼 때)`;
      return { sev: cap(100 * loss / 0.25, same), why: `${col ? col + " 뒷면 카드 · " : ""}${lead}: 고급 AI 수(${bestA.t === "open" ? "오픈" : "패스"}) 약 ${pc(best)} → 내 수(${myA.t === "open" ? "오픈" : "패스"}) ${pc(mine)} · 끝까지 해 봤을 때 대표 값 오픈 약 ${ev.vOpen} vs 패스 약 ${ev.vPass} (칸 ${V.boards[seat].length}/${G.SLOTS} · 패스 ${V.passes[seat]}/${G.MAXPASS})` };
    }
    if (V.phase === "buy" && myA.t === "buy" && Array.isArray(myA.p) && Array.isArray(bestA.p)) {
      const mp = myA.p.map(x => +x || 0), bp = bestA.p.map(x => +x || 0);
      const a = G.evalBuy(mp, base, 600), b = G.evalBuy(bp, base + 1, 600), pw = G.beatProb(a.out, b.out);
      return { sev: cap(200 * (0.5 - pw), same), why: `각자 그 팩으로 가장 좋게 20장을 골라 맞붙으면 내 덱이 이길 확률 약 ${pc(pw)} (대표 값 내 구입 약 ${G.lgShow(a.v)} vs 고급 AI 구입 약 ${G.lgShow(b.v)}) · 내 구입 ${G.packTxt(mp)} / 고급 AI ${G.packTxt(bp)}` };
    }
    if (V.phase === "submit" && myA.t === "submit" && myA.sel && bestA.sel) {
      const a = G.evalDeck(myA.sel, base, 600), b = G.evalDeck(bestA.sel, base + 1, 600), pw = G.beatProb(a.out, b.out);
      return { sev: cap(200 * (0.5 - pw), same), why: `이 20장끼리 맞붙으면 내 덱이 이길 확률 약 ${pc(pw)} (대표 값 내 덱 약 ${G.lgShow(a.v)} vs 고급 AI 덱 약 ${G.lgShow(b.v)}) · 내 덱 ${G.selTxt(myA.sel)} / 고급 AI ${G.selTxt(bestA.sel)}` };
    }
    return null;
  }
  function tutorial() {
    style();
    const cells = (arr, hl) => `<div class="op-sl">${[...Array(G.SLOTS).keys()].map(i => { const f = arr[i]; return f === undefined ? `<div class="op-s"></div>` : `<div class="op-s f ${typeof f === "string" ? "sy" : ""} ${hl && hl.includes(i) ? "dim" : ""}" style="background:#334155">${face(f)}</div>`; }).join("")}</div>`;
    const ex = arr => `${G.exprText(arr)} = <b>${G.showVal(G.evalBoard(arr))}</b>`;
    const A = [10, "*", 8, "*", 8, "*", 8, "*", 7];
    const B = [3, 4, "+", "*", 5, "-"];
    return [
      { tag: "STEP 1 · 목표", title: "수식판 10칸으로 큰 값을 만들어요", body: "카드를 한 장씩 <b>오픈</b>하면 수식판 칸에 차례로 들어가요. 완성한 수식의 <b>값이 가장 큰 사람이 우승</b>, 가장 작은 사람이 탈락 후보예요. (방송 기록: 10×8×8×8×7 = 35,840)",
        boardHtml: `<div class="op-tut">${cells(A)}<div class="op-info op-ex">${ex(A)}</div></div>`, ms: 7000 },
      { tag: "STEP 2 · 카드와 팩", title: "카드는 기본 20장 + 가넷으로 산 팩", body: "기본 카드는 <b>숫자 0~9 각 1장</b>과 기호 <b>− 3 · ÷ 3 · × 2 · + 2</b>. 가넷으로 팩(<b>검정 1 · 빨강 2 · 파랑 3 가넷</b>)을 사서 카드를 늘리고, 그중 <b>20장</b>을 골라 내요. 큰 숫자와 ×(곱셈)가 많은 파랑 팩이 가장 강해요. 팩마다 <b>뒷면 색이 달라요</b> (기본 카드는 모두 검정 뒷면).",
        boardHtml: `<div class="op-tut"><div class="op-sl">${["검정", "빨강", "파랑"].map((n, i) => `<div class="op-s f ${["cb", "cr", "cu"][i]}" style="font-size:12px">${n}</div>`).join("")}</div><div class="op-info">파랑 뒷면에는 7·8·9 가 많고, 빨강은 4·5·6 이 많아요 — 뒷면 색은 힌트일 뿐 (검정에도 7·8 이 있어요)</div></div>`, ms: 8000 },
      { tag: "STEP 3 · 오픈 / 패스", title: "앞면은 열기 전엔 몰라요", body: "내가 낸 20장은 <b>섞여서 뒷면으로</b> 깔려요 (색만 보여요). 카드마다 <b>오픈</b>(수식판에 들어가요) 또는 <b>패스</b>(수식에서 빠져요) — 패스는 <b>최대 10장</b>, 10칸이 차면 끝나요. 패스를 다 쓰면 남은 카드는 자동으로 열려요.",
        boardHtml: `<div class="op-tut"><div class="op-dk" style="width:100%">${["cu", "cb", "cu", "cr", "cu", "cb", "cu", "cu", "cr", "cb"].map((c, i) => `<div class="op-c ${c} ${i === 3 ? "now" : ""} ${i === 1 ? "pass" : ""}"></div>`).join("")}</div><div class="op-info">⏭ 두 번째 카드는 패스 (✕) · 노란 테두리가 지금 카드예요</div></div>`, ms: 7500 },
      { tag: "STEP 4 · 계산 규칙", title: "겹친 카드는 맨 왼쪽만, 곱셈이 먼저", body: "숫자가 연달아 나오면 <b>맨 왼쪽 숫자만</b>, 기호가 연달아 나오면 <b>맨 왼쪽 기호만</b> 써요. <b>맨 끝 기호는 무효</b>, 맨 앞이 기호면 그 앞에 0 이 있는 것으로 계산해요. × ÷ 가 + − 보다 먼저예요.",
        boardHtml: `<div class="op-tut">${cells(B, [1, 3, 5])}<div class="op-info op-ex">${ex(B)}<br>(흐린 카드: 겹치거나 끝에 있어서 무효)</div></div>`, ms: 9000 },
      { tag: "STEP 5 · 직접", title: "9 × 다음에 어떤 카드가 올 때 가장 클까요?", body: "수식판이 <b>9 ×</b> 에요. 다음 카드의 앞면이 <b>2 · 7 · + · ÷</b> 중 하나일 때 값이 가장 커지는 카드는?",
        interactive: { hint: "👆 가장 큰 값이 되는 카드를 눌러요", doneText: "✅ 7 이 오면 9 × 7 = 63! 기호가 또 나오면 맨 왼쪽 기호(×)만 쓰여서 값이 안 변하고, 칸만 차지해요." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="op-tut">${cells([9, "*"])}<div class="op-opt">${["2", "7", "+", "÷"].map(x => `<button data-w="${x}">${x}</button>`).join("")}</div><div class="op-info" id="op-tm">9 × ? — 어떤 카드가 가장 클까요?</div></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return;
            if (b.dataset.w === "7") { ctrl.sfx("win"); ctrl.complete(); }
            else { ctrl.sfx("tap"); const m = stage.querySelector("#op-tm"); if (m) m.textContent = b.dataset.w === "2" ? "9 × 2 = 18 — 더 큰 숫자가 있어요" : "기호가 또 나오면 맨 왼쪽 기호(×)만 쓰여서 칸만 차지해요"; }
          };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-openpass"] = {
    name: "오픈, 패스", emoji: "🔓", short: "뒷면 카드를 열거나 넘기며 10칸 수식판으로 가장 큰 값을 만들어요", min: 2, max: 7, defN: 4, board: false,
    show: "더 지니어스 · 시즌 1 · 오픈, 패스", season: "시즌 1 게임의 법칙",
    opts: [{ k: "gar", label: "시작 가넷", items: [[0, "추가 팩 없음 (기본 카드만)"], [4, "가넷 4개 (방송 평균)"], [8, "가넷 8개"]], def: 4 }],
    diff: "방송은 후보마다 시작 가넷이 달라 가넷이 적은 사람부터 순서를 정하지만, 우리는 모두 같은 가넷으로 시작하고 순서는 무작위예요 · 카드 나눠 쓰기(공동 구입)와 뒷면 방향 요령은 없어요 · 0 으로 나누면 그 항은 0, 소수는 그대로 비교(같은 값이면 같은 등수) · 곱셈 · 나눗셈 먼저(방송 설명으로 추정) · 최대 7명",
    howto: [
      "카드는 <b>기본 20장</b> + 가넷으로 산 <b>팩</b> (검정 1 · 빨강 2 · 파랑 3 가넷) — 그중 <b>20장</b>을 골라 내요",
      "내 카드는 <b>섞여서 뒷면으로</b> 깔려요 (색만 보여요) · 한 장씩 <b>오픈</b>(수식판 다음 칸) 또는 <b>패스</b>(최대 10장)",
      "숫자가 연달아면 <b>맨 왼쪽만</b>, 기호가 연달아면 <b>맨 왼쪽 기호만</b> · 끝 기호는 무효 · 맨 앞 기호는 앞에 0 · × ÷ 먼저",
      "10칸이 차면 끝 — 한 사람씩 차례로 해요 · <b>값이 가장 큰 사람 우승</b>, 가장 작은 사람이 탈락 후보",
    ],
    sub: V => (V.over ? "끝" : V.phase === "buy" ? "팩 구입" : V.phase === "submit" ? "카드 제출" : `${V.vals.filter(Boolean).length}/${V.n}명 끝`),
    chip: (V, i) => ({ t: V.phase === "play" || V.over ? (V.vals[i] ? G.showVal(V.vals[i]) : `${V.boards[i].length}/${G.SLOTS}`) : V.phase === "buy" ? (V.buyDone[i] ? "구입 ✓" : "구입 중") : (V.subDone[i] ? "제출 ✓" : "고르는 중"), on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (이길 확률 · 덱 맞대결로 고급 AI 수와 견줌)
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

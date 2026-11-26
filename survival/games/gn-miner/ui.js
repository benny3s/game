/* 베니 서바이벌 · 광부 게임 — 화면 (3조 · 광부는 자기 차례에 광물을 한 번에 원하는 만큼 꺼내거나 스톱 · 제시자는 비밀로 점수를 제시 · 정산 · 1분 규칙)
   판 옵션 ver: "b" 방송대로(기본) · "a" 예전 한 개씩 (옛 복기는 cfg 에 ver 가 없어서 예전 규칙으로 재생돼요) */
(() => {
  "use strict";
  const G = window.SVCores["gn-miner"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.mn-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.mn-rd{font:900 14px var(--round);color:#fff;background:rgba(234,179,8,.22);border:1px solid rgba(250,204,21,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.mn-bg{font:800 12px var(--round);color:#fde68a;line-height:1.3;min-width:0;max-width:100%}
.mn-tm{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.mn-t{display:grid;gap:0;padding:4px 6px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0}
.mn-t.mine{border-color:#fde68a;background:rgba(253,230,138,.08)}
.mn-t.dig{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.3)}
.mn-t .nm{font:900 12px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-t .mb{font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-t .sc{font:800 11px var(--round);color:#fde68a}
.mn-mine{flex:none;display:grid;gap:4px;padding:6px 8px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)}
.mn-tray{display:flex;flex-wrap:wrap;gap:3px;min-height:26px;align-content:flex-start}
.mn-tray span{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.08);font-size:15px;line-height:1}
.mn-tray span.new{animation:mnPop .3s ease-out}
@keyframes mnPop{0%{transform:scale(.4)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
.mn-tray .emp{width:auto;background:none;color:var(--soft);font:700 12px var(--round);padding:2px 0}
.mn-st{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;font:800 12.5px var(--round);color:#e2e8f0}
.mn-st b{color:#fde68a}.mn-st .bad{color:#fca5a5}
.mn-lf{display:flex;gap:7px;font:700 11px var(--round);color:var(--soft);flex-wrap:wrap}
.mn-od{display:flex;gap:4px;align-items:center;flex-wrap:wrap;font:800 11.5px var(--round);color:var(--soft)}
.mn-od i{font-style:normal;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,.08);color:#e2e8f0;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.mn-od i.cur{background:rgba(56,189,248,.3);color:#fff;border:1px solid #38bdf8}
.mn-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.mn-info b{color:#fde68a}.mn-info .warn{color:#fca5a5}
.mn-bid{flex:none;display:grid;gap:6px}
.mn-val{text-align:center;font:900 30px var(--round);color:#fde68a;line-height:1}
.mn-val small{font:800 12px var(--round);color:var(--soft)}
.mn-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.mn-row button,.mn-pre button{padding:8px 0;border-radius:10px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:800 13px var(--round);cursor:pointer}
.mn-pre{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.mn-pre button{padding:6px 0;font-size:12px}
.mn-pre button.on{border-color:#fde68a;background:rgba(253,230,138,.2)}
.mn-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:none}
.mn-acts button{padding:12px 6px;border-radius:13px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 15px var(--round);cursor:pointer}
.mn-acts button.go{border-color:#fde68a;background:rgba(253,230,138,.2)}
.mn-acts button:disabled{opacity:.4;cursor:default}
.mn-acts.k3{grid-template-columns:auto 1fr auto}
.mn-step{display:flex;align-items:center;gap:3px}
.mn-step button{width:38px;padding:12px 0;font-size:17px}
.mn-step b{min-width:28px;text-align:center;font:900 18px var(--round);color:#fde68a}
.mn-gr{font:800 11.5px var(--round);color:#e2e8f0;line-height:1.35}
.mn-gr b{color:#fde68a}
.mn-last{flex:1 1 auto;min-height:50px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:5px 8px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1);font:700 11.5px var(--round);color:#e2e8f0;line-height:1.4}
.mn-last b{color:#fff}.mn-last .ok{color:#86efac}.mn-last .no{color:#fca5a5}
.mn-bids{display:flex;flex-wrap:wrap;gap:3px}
.mn-bids span{padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.07);font:700 11px var(--round);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.mn-bids span.hi{background:rgba(239,68,68,.18)}.mn-bids span.lo{background:rgba(34,197,94,.18)}
.mn-rs{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:4px;align-content:start}
.mn-rw{padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font:700 12px var(--round);color:#e2e8f0}
.mn-rw.me{border-color:#fde68a}.mn-rw.win{border-color:#86efac;background:rgba(34,197,94,.12)}.mn-rw.lose{border-color:#fca5a5;background:rgba(239,68,68,.1)}
.mn-rw b{color:#fff}.mn-rw .v{float:right;font:900 14px var(--round);color:#fde68a}
.mn-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.mn-tut .mn-info{width:100%}
.mn-opt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.mn-opt button{padding:10px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 17px var(--round);cursor:pointer}
@media (max-height:780px){.mn-val{font-size:26px}.mn-row button{padding:6px 0}.mn-acts button{padding:9px 4px;font-size:14px}.mn-info{font-size:11.5px}.mn-t{padding:3px 5px}}
@media (max-height:690px){.mn-gr{font-size:11px}.mn-step button{padding:9px 0}.mn-info.hint{display:none}.mn-bg{display:none}.mn-lf{display:none}.mn-tray span{width:21px;height:21px;font-size:13px}.mn-val{font-size:22px}.mn-row button{padding:4px 0;font-size:12px}.mn-pre button{padding:4px 0}.mn-acts button{padding:7px 3px;font-size:13px}.mn-t .mb{display:none}.mn-last{min-height:40px;font-size:11px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const who = (ctx, me, watch, i) => (i === me && !watch ? "나" : esc(nameOf(ctx, i)));
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.turn}|${ctx.me}`;
    if (!RS || RS.key !== key) RS = { key, g: ctx.g, v: 4, k: 3, t: 0, sent: false };
    return RS;
  };
  const tray = (drawn, fresh) => {   // fresh = 방금 꺼낸 개수 (true 면 1개)
    const cut = Math.max(0, drawn.length - 24), shown = drawn.slice(cut), nf = fresh === true ? 1 : +fresh || 0;   // 24개가 넘으면 최근 것만 (줄이 길어지지 않게)
    return `<div class="mn-tray">${cut ? `<span class="emp">앞 ${cut}개 …</span>` : ""}${shown.length ? shown.map((x, i) => `<span class="${nf && i >= shown.length - nf ? "new" : ""}" title="${G.NAME[x]}">${G.EM[x]}</span>`).join("") : `<span class="emp">아직 아무것도 안 꺼냈어요</span>`}</div>`;
  };
  const grabCnt = xs => ["g", "s", "c", "d", "b"].map(k => { const c = xs.filter(x => x === k).length; return c ? `${G.EM[k]}${c}` : ""; }).filter(Boolean).join(" ");
  const left = L => ["g", "s", "c", "d", "b"].map(k => `${G.EM[k]}${L[k]}`).join(" ");
  const kindTxt = h => {
    const vs = Object.keys(h.bids).map(s => h.bids[s]), same = Math.max(...vs) === Math.min(...vs);
    return h.kind === "bomb" ? `<span class="no">💣 폭탄 ${h.B}개 — 광부 0점 · 제시자는 제시한 점수를 받아요</span>` : h.kind === "ok" ? `<span class="ok">✅ 채굴 ${h.M} ≥ 제시 합 ${h.S} — 제시자는 제시한 점수 · 광부는 (M−S)÷3 씩</span>` : `<span class="no">❌ 채굴 ${h.M} < 제시 합 ${h.S} — 제시자 0점 · 광부는 M÷3 씩 · ${same ? "제시가 모두 같아서 감점은 없어요" : "최고 제시자는 감점, 최저 제시자가 가져가요"}</span>`;
  };
  function lastHtml(V, ctx, me, watch) {
    const h = V.hist[V.hist.length - 1];
    if (!h) return `<div class="mn-last">아직 끝난 조가 없어요. 조가 끝나면 제시 점수와 정산이 여기에 공개돼요.</div>`;
    const seats = Object.keys(h.bids).map(Number), mx = Math.max(...seats.map(s => h.bids[s])), mn = Math.min(...seats.map(s => h.bids[s]));
    const chips = seats.map(s => `<span class="${h.kind === "short" && mx !== mn ? (h.bids[s] === mx ? "hi" : h.bids[s] === mn ? "lo" : "") : ""}">${who(ctx, me, watch, s)} ${h.bids[s]}점 → <b>${h.d[s] > 0 ? "+" : ""}${h.d[s]}</b></span>`).join("");
    const mi = h.miners.map(s => `${who(ctx, me, watch, s)} ${h.d[s] > 0 ? "+" : ""}${h.d[s]}`).join(" · "), gr = h.grabs && h.grabs.length ? `<div>🧺 꺼낸 순서 ${h.grabs.map(x => `${who(ctx, me, watch, x.s)} ${x.xs.length}개`).join(" → ")}</div>` : "";
    return `<div class="mn-last"><div><b>지난 조 (${h.g + 1}조 광부)</b> ${h.drawn.map(x => G.EM[x]).join("")}</div>${gr}<div>${kindTxt(h)}</div><div class="mn-bids">${chips}</div><div>⛏ 광부 ${mi}</div></div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const myG = watch ? -1 : V.gOf[me], isMiner = !watch && V.miners.includes(me), isPres = !watch && V.pres.includes(me);
    const mineAct = !watch && ctx.canAct && V.needs.includes(me);
    const role = V.over ? "끝" : watch ? "구경 중" : isMiner ? "⛏ 광부" : "📝 제시자";
    let h = `<div class="mn-top"><span class="mn-rd">${V.over ? "⛏ 끝" : `${role}`}</span><span class="mn-bg">${V.over ? "" : `${V.round + 1}라운드 · 순서 ${V.pos + 1}/3 · ${V.phase === "bid" ? "제시 중" : "채굴 중"}`}</span></div>`;
    h += `<div class="mn-tm">${V.groups.map((g, gi) => `<div class="mn-t ${gi === myG ? "mine" : ""} ${!V.over && gi === V.gOf[V.miners[0]] ? "dig" : ""}"><div class="nm">${gi + 1}조${gi === myG ? " ⭐" : ""}${!V.over && gi === V.gOf[V.miners[0]] ? " ⛏" : ""}</div><div class="mb">${g.map(s => who(ctx, me, watch, s)).join("·")}</div><div class="sc">합계 ${V.tscore[gi]}점</div></div>`).join("")}</div>`;
    if (V.over) {
      const mx = Math.max(...V.ranks), first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), lows = V.ranks.map((x, i) => (x === mx ? i : -1)).filter(i => i >= 0);
      h += `<div class="mn-rs">${V.score.map((s, i) => i).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b).map(i => `<div class="mn-rw ${i === me && !watch ? "me" : ""} ${V.ranks[i] === 0 ? "win" : ""} ${V.ranks[i] === mx && mx > 0 ? "lose" : ""}"><span class="v">${V.score[i]}점</span><b>${V.ranks[i] + 1}위 · ${who(ctx, me, watch, i)}</b> <span style="color:var(--soft)">${V.gOf[i] + 1}조</span></div>`).join("")}</div>`;
      h += `<div class="mn-info"><b>${first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 꼴찌(탈락후보):${lows.map(i => (i === me && !watch ? "나" : esc(nameOf(ctx, i)))).join(" · ")}</div>`;
      stage.innerHTML = h; stage.onclick = null; return;
    }
    // 광산
    const B = V.ver === "b", lastEv = V.log.length ? V.log[V.log.length - 1] : null, lastDraw = lastEv && lastEv.k === "draw" ? (B ? lastEv.n : 1) : 0;
    const lg = B && V.grabs && V.grabs.length ? V.grabs[V.grabs.length - 1] : null, maxN = V.bagN;
    if (S.k > maxN) S.k = Math.max(1, maxN);
    h += `<div class="mn-mine">${tray(V.drawn, lastDraw)}${lg ? `<div class="mn-gr">🧺 방금 <b>${who(ctx, me, watch, lg.s)}</b> ${lg.xs.length}개 → ${grabCnt(lg.xs)}</div>` : ""}<div class="mn-st"><span>채굴 <b>${V.M}점</b></span><span class="${V.B >= 2 ? "bad" : ""}">💣 ${V.B}/3</span><span>남은 광물 ${V.bagN}개</span></div><div class="mn-lf">남은 것: ${left(V.left)}</div><div class="mn-od">⛏ 순서 ${V.miners.map((s, k) => `<i class="${V.phase === "mine" && V.cur === s ? "cur" : ""}">${k + 1}. ${who(ctx, me, watch, s)}</i>`).join("")}</div></div>`;
    // 행동
    if (V.phase === "bid") {
      if (isPres && !V.bidDone[me] && mineAct) {
        h += `<div class="mn-info">광부가 캘 점수(M)가 <b>제시 6명의 합(S) 이상</b>이어야 모두 점수를 받아요 · 모자라면 제시자 0점, 가장 높게 낸 사람은 감점</div>`;
        h += `<div class="mn-bid"><div class="mn-val">${S.v}<small> 점 (1~50)</small></div><div class="mn-row">${[-5, -1, 1, 5].map(x => `<button data-d="${x}">${x > 0 ? "+" : "−"}${Math.abs(x)}</button>`).join("")}</div><div class="mn-pre">${[1, 3, 5, 10, 20, 50].map(x => `<button data-v="${x}" class="${S.v === x ? "on" : ""}">${x}</button>`).join("")}</div><button class="btn big primary" data-a="bid">📤 ${S.v}점으로 제시</button></div>`;
      } else h += `<div class="mn-info">${watch ? `구경 중 — 제시자 ${V.bidDone.filter(Boolean).length}/6명이 정했어요${V.bids ? `<br>비밀 제시: ${V.pres.map(s => `${who(ctx, me, watch, s)} ${V.bids[s] ?? "…"}`).join(" · ")}` : ""}` : isMiner ? `제시자 6명이 점수를 정하는 중이에요… (${V.bidDone.filter(Boolean).length}/6) — 곧 내 조가 광물을 캐요` : V.bidDone[me] ? `✅ 내 제시 <b>${V.mineBid}점</b> (비밀) — 다른 제시자를 기다려요 (${V.bidDone.filter(Boolean).length}/6)` : "기다리는 중…"}</div>`;
    } else if (mineAct && B) {
      h += `<div class="mn-info hint">내 차례 — 광산에서 <b>원하는 만큼 한 번에</b> 꺼내거나(1개도 · 여러 개도), 그만 캐고 <b>스톱</b>해요 · 폭탄이 <b>3개 이상</b>이면 광부 0점!</div>`;
      h += `<div class="mn-pre">${[1, 2, 3, 5, 8, 12].map(x => `<button data-k="${x}" class="${S.k === x ? "on" : ""}" ${x > maxN ? "disabled" : ""}>${x}</button>`).join("")}</div>`;
      h += `<div class="mn-acts k3"><div class="mn-step"><button data-dk="-1" aria-label="하나 줄이기">−</button><b>${S.k}</b><button data-dk="1" aria-label="하나 늘리기">+</button></div><button data-a="draw" class="go">⛏ ${S.k}개 꺼내기</button><button data-a="stop">✋ 스톱</button></div>`;
    } else if (mineAct) {
      h += `<div class="mn-info">내 차례 — 광물을 <b>꺼내거나</b> 그만 캐고 <b>스톱</b>해요 · 폭탄이 3개 나오면 광부 0점!</div><div class="mn-acts"><button data-a="draw" class="go">⛏ 광물 꺼내기</button><button data-a="stop">✋ 스톱</button></div>`;
    } else h += `<div class="mn-info">${watch ? "구경 중" : V.cur === me ? "내 차례…" : `${who(ctx, me, watch, V.cur)}가 고르는 중이에요…`}${V.bids && watch ? `<br>비밀 제시 합 ${Object.values(V.bids).reduce((a, b) => a + b, 0)}점` : ""}</div>`;
    h += lastHtml(V, ctx, me, watch);
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !mineAct) return;
      if (V.phase === "bid") {
        if (S.sent) return;   // 제시한 뒤에는 값을 못 바꿔요 (연타로 두 번 보내지 않아요)
        if (t.dataset.d) { S.v = Math.max(1, Math.min(50, S.v + +t.dataset.d)); ctx.sfx("tap"); render(stage, V, ctx); return; }
        if (t.dataset.v) { S.v = +t.dataset.v; ctx.sfx("tap"); render(stage, V, ctx); return; }
        if (t.dataset.a === "bid") { S.sent = true; ctx.sfx("pop"); ctx.act({ t: "bid", v: S.v }); }
        return;
      }
      if (t.dataset.k || t.dataset.dk) { S.k = Math.max(1, Math.min(maxN, t.dataset.k ? +t.dataset.k : S.k + +t.dataset.dk)); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (Date.now() - S.t < 450) return;
      if (t.dataset.a === "draw") { S.t = Date.now(); ctx.sfx("pop"); ctx.act(B ? { t: "draw", n: S.k } : { t: "draw" }); }
      else if (t.dataset.a === "stop") { S.t = Date.now(); ctx.sfx("tap"); ctx.act({ t: "stop" }); }
    };
  }
  function result(V) {
    if (!V.ranks) return "끝나지 않은 판";
    const mx = Math.max(...V.ranks), first = V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean), lows = V.ranks.map((x, i) => (x === mx ? i + 1 : 0)).filter(Boolean);
    return `우승 ${first.join("·")}번 (${V.score[first[0] - 1]}점) · 꼴찌 ${lows.join("·")}번 (${V.score[lows[0] - 1]}점)`;
  }
  function tutorial() {
    style();
    const tr = list => tray(list);
    return [
      { tag: "STEP 1 · 목표", title: "9명이 3조 — 광부와 제시자", body: "9명이 <b>3명씩 3조</b>로 나뉘어요. 한 번에 한 조가 <b>광부</b>(광물을 캐요), 나머지 6명은 <b>제시자</b>(방송에서는 '플레이어')예요. <b>3라운드</b> 동안 모든 조가 광부를 3번씩 해요. 같은 조는 광물을 함께 캘 뿐 <b>단체전이 아니라서</b>, <b>개인 승점 합계 1위가 우승</b> · 꼴찌는 탈락후보예요!",
        boardHtml: `<div class="mn-tut"><div class="mn-tm" style="width:100%">${[0, 1, 2].map(g => `<div class="mn-t ${g === 0 ? "dig" : ""}"><div class="nm">${g + 1}조${g === 0 ? " ⛏" : ""}</div><div class="mb">${g === 0 ? "광부" : "제시자"}</div><div class="sc">합계 0점</div></div>`).join("")}</div><div class="mn-info">1조가 광부일 때 2 · 3조 6명이 제시자예요</div></div>`, ms: 7000 },
      { tag: "STEP 2 · 광물", title: "금 3 · 은 2 · 동 1 · 💎 ×2 · 💣 0", body: "광산에는 광물 <b>49개</b> — 🟡금 · ⚪은 · 🟤동 각 14개(3 · 2 · 1승점), 💣폭탄 5개, 💎다이아몬드 2개(캔 승점의 합을 2배로). 광부가 캔 승점 합이 <b>M</b> 이에요. 꺼낸 광물은 모두에게 보여요.",
        boardHtml: `<div class="mn-tut">${tr(["g", "g", "s", "c", "b", "d"])}<div class="mn-info">3 + 3 + 2 + 1 + 0 = 9 → 💎 ×2 = <b>18점</b> (💣 1개)</div></div>`, ms: 7000 },
      { tag: "STEP 3 · 꺼내기", title: "차례마다 원하는 만큼 한 번에, 아니면 스톱", body: "광부 셋이 돌아가며 자기 차례에 광산에서 <b>원하는 만큼 한 번에</b> 꺼내요 (1개도 · 여러 개도 괜찮아요). 꺼내기 전에 <b>스톱</b>하면 거기서 끝이고, <b>폭탄이 3개 이상</b>이 되면 바로 끝나요 (한 번에 꺼낸 것 안에서도 세요). 예: 1조가 4개 → 1개 → 8개를 꺼내고 스톱 → 💎1 💣2 🟤2 ⚪3 🟡5 = 46점.",
        boardHtml: `<div class="mn-tut">${tr(["d", "b", "b", "c", "c", "s", "s", "s", "g", "g", "g", "g", "g"])}<div class="mn-info">1 · 2 · 2 · 3 · 5 → (15 + 6 + 2) × 2 = <b>46점</b> (💣 2개)</div></div>`, ms: 9000 },
      { tag: "STEP 4 · 제시", title: "제시자는 비밀로 1~50점을 불러요", body: "광부가 캐기 전에 제시자 6명이 <b>나눠 갖고 싶은 승점</b>(1~50)을 비밀로 제시해요. 광물의 총 승점을 <b>M</b>, 제시 6명의 합을 <b>S</b> 라 해요. 캐기가 끝나면 제시한 승점이 공개돼요.",
        boardHtml: `<div class="mn-tut"><div class="mn-bids" style="justify-content:center"><span>제시자A 1점</span><span>B 7점</span><span>C 10점</span><span>D 8점</span><span>E 13점</span><span>F 11점</span></div><div class="mn-info">S = 1 + 7 + 10 + 8 + 13 + 11 = <b>50</b></div></div>`, ms: 7000 },
      { tag: "STEP 5 · 정산", title: "M이 S 이상이면 모두 받아요", body: "① <b>M ≥ S</b>: 제시자는 제시한 승점을 받고, 남은 (M−S)를 광부 3명이 똑같이 나눠요. ② <b>폭탄 3개</b>: 광부는 승점을 못 받고 제시자는 제시한 승점을 그대로 받아요. ③ <b>M &lt; S</b>: 제시자는 전원 0점, 광부 3명이 M을 똑같이 나누고, <b>가장 높게 낸 사람은 그 승점만큼 감점</b>되어 가장 낮게 낸 사람이 가져가요.",
        boardHtml: `<div class="mn-tut"><div class="mn-info">① M 76, S 50 → 제시자 각자 제시한 승점 · 광부 각 (76−50)÷3 = <b>+8</b> (남는 2는 버려요)</div><div class="mn-info">② 폭탄 3개 → 광부 0 · 제시자는 제시한 그대로 (예: 1 · 48 · 10 · 25 · 1 · 50)</div><div class="mn-info">③ M 76, S 109 (1 · 8 · 10 · 25 · 50 · 15) → 제시자 0 · 광부 각 +25 · 최고(50) −50, 최저(1) +50</div></div>`, ms: 11000 },
      { tag: "STEP 6 · 직접", title: "광부 한 사람은 몇 점을 받을까요?", body: "광부가 <b>M = 30점</b>을 캤고 제시자 6명의 합은 <b>S = 18점</b>이에요. 폭탄은 2개뿐이에요. 광부 한 사람이 받는 점수는?",
        interactive: { hint: "👆 광부 한 사람의 점수를 눌러요", doneText: "✅ M ≥ S 라서 남은 (30 − 18) = 12 점을 광부 3명이 나눠 한 사람당 4점이에요!" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="mn-tut">${tr(["g", "g", "g", "g", "s", "c", "d", "b", "b"])}<div class="mn-opt">${["4", "6", "10", "0"].map(x => `<button data-w="${x}">${x}</button>`).join("")}</div><div class="mn-info" id="mn-tm">M 30 · S 18 → 한 사람은?</div></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return;
            if (b.dataset.w === "4") { ctrl.sfx("win"); ctrl.complete(); }
            else { ctrl.sfx("tap"); const m = stage.querySelector("#mn-tm"); if (m) m.textContent = b.dataset.w === "10" ? "30 ÷ 3은 M이 S 보다 작을 때의 몫이에요 — 지금은 M이 더 커요" : b.dataset.w === "6" ? "(M − S) = 12를 3명이 나눠요" : "폭탄은 2개라 0점이 되지 않아요 (3개부터)"; }
          };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-miner"] = {
    name: "광부 게임", emoji: "⛏️", short: "광물을 캐는 광부와 점수를 비밀로 제시하는 제시자 · 9명 3조", min: 9, max: 9, defN: 9, board: false,
    show: "더 지니어스 · 시즌 3 · 광부 게임", season: "시즌 3 블랙가넷",
    opts: [{ k: "ver", label: "판", items: [["b", "방송대로"], ["a", "예전 한 개씩"]], def: "b" }],
    diff: "방송은 같은 조 광부끼리 말을 맞추고 제시자와도 협상하지만(폭탄 몇 개로 자폭 + 높은 제시 같은 연합), 우리는 협상 · 연합 없이 각자 판단해요 (AI는 일부러 폭탄을 노리는 자폭은 안 해요) · 광부는 방송처럼 자기 차례에 한 번에 원하는 만큼 꺼내거나 스톱해요 — 방송은 한 손으로 집는 만큼이라 정확한 개수 제한이 영상에 없어서(1조는 4개 · 1개 · 8개, 3조는 1~6개씩, 한 조는 스무 개쯤 한꺼번에 쏟았어요) 우리는 광산에 남은 만큼까지 고를 수 있게 했어요 · 스톱은 자기 차례에 꺼내기 전에만, 꺼내기와 스톱을 한 차례에 같이는 못 해요 (문서 기준 · 영상 미확인) · 폭탄이 3개 이상이 되면 그 차례에 꺼낸 것을 모두 센 뒤 바로 끝나요 (한 번에 4개가 나와 끝난 조도 있었어요) · 판 옵션을 '예전 한 개씩'으로 하면 한 번에 1개씩만 꺼내는 옛 규칙이에요 · 채굴 순서는 방송은 조원끼리 정하고 우리는 조마다 무작위 · 광물 49개는 조마다 다시 채워요 (방송 문서에도 캔 광물은 광산으로 돌려놓는다고 해요 · 영상 미확인) · 다이아몬드는 하나마다 ×2(둘이면 ×4, 방송 설명에 없어서 정한 것) · 방송 화면에도 캔 광물의 종류별 개수가 모두에게 보여요 · 나눠 떨어지지 않는 승점은 버려요 · 방송은 제시하는 6명을 '플레이어'라고 불러요 (우리는 제시자) · 방송의 폭탄 무게 구별(소품)은 없어요 · 9명 고정 (사람이 적으면 AI가 채워요)",
    howto: [
      "9명이 <b>3명씩 3조</b> — 한 번에 한 조가 <b>광부</b>, 나머지 6명이 <b>제시자</b>(방송에서는 '플레이어') · 3라운드 동안 모든 조가 광부를 3번씩 해요 · 같은 조는 단체전이 아니라 광물만 함께 캐요",
      "제시자는 <b>비밀로 1~50점</b>을 제시 → 광부 셋이 돌아가며 자기 차례에 광산에서 광물(🟡3 · ⚪2 · 🟤1 승점 · 💎합계×2 · 💣)을 <b>한 번에 원하는 만큼</b> 꺼내거나(1개도 · 여러 개도) 꺼내기 전에 <b>스톱</b> · 💣가 <b>3개 이상</b>이 되면 바로 끝 (캔 승점 M · 제시 6명의 합 S)",
      "① <b>M ≥ S</b>: 제시자는 제시한 승점, 광부는 (M−S)÷3 씩 · ② <b>폭탄 3개</b>: 광부 0점, 제시자는 제시한 승점 · ③ <b>M &lt; S</b>: 제시자 0점, 광부 M÷3 씩, 최고 제시자 감점 → 최저 제시자가 가져가요",
      "개인 승점 합계 <b>1위 우승</b> · 꼴찌 탈락후보 · 2라운드부터는 조원 승점 합이 낮은 조가 먼저 캐요",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}라운드 · 순서 ${V.pos + 1}/3`),
    chip: (V, i) => ({ t: `${V.over ? "" : V.miners.includes(i) ? "⛏" : ""}${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (제시 점수 · 꺼내기/스톱을 같은 표본으로 견줘 평균 점수 손해를 재요 — 남의 비밀 제시는 안 써요)
    actText: (a, V) => {
      if (!a || typeof a !== "object") return "—";
      if (a.t === "bid") return Number.isInteger(a.v) ? `📝 ${a.v}점 제시 (비밀)` : "—";
      if (a.t === "draw") { const n = Number.isInteger(a.n) ? `${a.n}개 ` : ""; return V && typeof V.M === "number" ? `⛏ 광물 ${n}꺼내기 (지금 채굴 ${V.M}점 · 💣${V.B}/3 · 남은 ${V.bagN}개)` : `⛏ 광물 ${n}꺼내기`; }
      if (a.t === "stop") return V && typeof V.M === "number" ? `✋ 스톱 (채굴 ${V.M}점으로 마감 · 💣${V.B}/3)` : "✋ 스톱";
      return "—";
    },
    review: (V, seat, myA, bestA, info) => {
      try {
        if (!V || !myA || !bestA || typeof seat !== "number" || V.over) return null;
        const seed = ((info && info.seed) >>> 0) ^ Math.imul(((info && info.k) | 0) + 1, 0x9e3779b1) ^ Math.imul(V.turn + 1, 0x85ebca6b);
        const sg = x => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}`, SCALE = 10;   // 이 정도 점수를 한 수로 잃으면 sev 100 (한 조에 평균 5점 안팎씩 쌓이니 6점 이상 잃어야 📒 에 담겨요)
        const sevOf = (c) => { const loss = Math.max(0, c.dEv), noise = loss < 2 * c.se + 0.05; let sev = Math.round(Math.min(100, (100 * loss) / SCALE)); if (noise) sev = Math.min(sev, 15); return { sev, noise }; };
        if (V.phase === "bid" && myA.t === "bid" && bestA.t === "bid") {
          const c = G.compareBids(V, seat, myA.v, bestA.v, seed >>> 0, 1200);
          if (!c) return null;
          const { sev, noise } = sevOf(c), pc = x => `${Math.round(x * 100)}%`;
          return { sev, why: `평균 점수: 고급 AI ${bestA.v}점 제시 ${sg(c.evBest)}점(제시 합이 채굴보다 클 확률 ${pc(c.pShortBest)}) → 내 ${myA.v}점 제시 ${sg(c.evMy)}점(${pc(c.pShortMy)})${noise ? " — 거의 같아요" : ""} · 광부는 평균 ${Math.round(c.avgM)}점을 캘 것 같고 다른 ${V.pres.length - 1}명 제시 합은 ${Math.round(c.avgOthers)}점쯤으로 봤어요` };
        }
        if (V.ver === "b" && V.phase === "mine" && V.cur === seat && (myA.t === "draw" || myA.t === "stop") && (bestA.t === "draw" || bestA.t === "stop")) {
          const c = G.compareMineB(V, seat, myA, bestA, seed >>> 0, 500);
          if (!c) return null;
          const { sev, noise } = sevOf(c), pc = x => `${Math.round(x * 100)}%`, lab = a => (a.t === "stop" ? "스톱" : `${a.n === undefined ? 1 : a.n}개 꺼내기`), need = 3 - V.B;
          return { sev, why: `득실 평균(내 몫 − 제시자 평균 몫): 고급 AI ${lab(bestA)} ${sg(c.evBest)}점${c.pBustBest > 0 ? `(폭탄 ${need}개 이상 될 확률 ${pc(c.pBustBest)})` : ""} → 내 ${lab(myA)} ${sg(c.evMy)}점${c.pBustMy > 0 ? `(${pc(c.pBustMy)})` : ""}${noise ? " — 거의 같아요" : ""} · 지금 채굴 ${V.M}점 · 💣 ${V.B}/3 · 광산에 남은 ${V.bagN}개 중 폭탄 ${V.left.b}개 · 제시 합은 평균 ${Math.round(c.avgS)}점쯤으로 봤어요` };
        }
        if (V.phase === "mine" && V.cur === seat && (myA.t === "draw" || myA.t === "stop") && (bestA.t === "draw" || bestA.t === "stop")) {
          const c = G.compareMine(V, seat, myA.t, bestA.t, seed >>> 0, 600);
          if (!c) return null;
          const { sev, noise } = sevOf(c), lab = t => (t === "draw" ? "꺼내기" : "스톱"), val = t => (t === "draw" ? c.dDraw : c.dStop);
          return { sev, why: `내 몫 평균: 고급 AI ${lab(bestA.t)} ${sg(val(bestA.t))}점 → 내 ${lab(myA.t)} ${sg(val(myA.t))}점${noise ? " — 거의 같아요" : ""} · 지금 채굴 ${V.M}점 · 💣 ${V.B}/3 · 다음에 폭탄이 나올 확률 약 ${Math.round(c.pBomb * 100)}% · 제시 합은 평균 ${Math.round(c.avgS)}점쯤으로 봤어요` };
        }
        return null;
      } catch (e) { return null; }
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

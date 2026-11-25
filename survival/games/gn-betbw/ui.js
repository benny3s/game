/* 베니 서바이벌 · 베팅! 흑과 백 — 화면 (가림막 뒤 배치 · 첫 번째 타일부터 승부 · 추가 베팅 / 포기 · 정산 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-betbw"];
  const NT = G.NT, CN = G.CNAME, colOf = G.colOf;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(s.charAt(s.length - 1)) && s !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const pc = x => Math.round(x * 100) + "%";
  const sg = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const CSS = `
.bw-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.bw-rd{font:900 14px var(--round);color:#fff;background:rgba(100,116,139,.35);border:1px solid rgba(203,213,225,.5);border-radius:99px;padding:3px 11px;white-space:nowrap}
.bw-pill{font:800 12.5px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);border-radius:99px;padding:2px 9px;white-space:nowrap}
.bw-pill.ok{color:#bbf7d0;border-color:rgba(134,239,172,.6)}
.bw-pill.bad{color:#fecaca;border-color:rgba(252,165,165,.6)}
.bw-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.bw-info b{color:#fde68a}
.bw-t{display:grid;place-items:center;width:100%;max-width:34px;height:34px;border-radius:8px;font:900 19px/1 var(--round);border:2px solid #64748b;box-sizing:border-box;position:relative}
.bw-t.c0{background:#0b0f19;color:#f8fafc;border-color:#94a3b8}
.bw-t.c1{background:#f8fafc;color:#0f172a;border-color:#cbd5e1}
.bw-t.q{font-size:15px}
.bw-t.w{box-shadow:0 0 0 2px #fde68a}
.bw-t.l{opacity:.4}
.bw-t.f{opacity:.55}
.bw-t.f::after{content:"";position:absolute;left:3px;right:3px;top:50%;border-top:2.5px solid #f87171;transform:rotate(-35deg)}
.bw-t.lg{max-width:46px;height:46px;font-size:26px;border-radius:10px}
.bw-lab{flex:none;display:flex;justify-content:space-between;font:800 11.5px var(--round);color:var(--soft);padding:0 3px}
.bw-lab b{color:#e2e8f0}
.bw-board{flex:none;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px}
.bw-col{display:grid;justify-items:center;align-content:start;gap:2px;padding:3px 0 4px;border-radius:9px;border:1.5px solid transparent;background:rgba(255,255,255,.045);min-width:0;position:relative}
.bw-col.now{border-color:#fde68a;background:rgba(253,230,138,.13)}
.bw-col.pk{border:1.5px dashed #86efac;cursor:pointer;background:rgba(134,239,172,.1)}
.bw-ix{font:800 9.5px var(--round);color:var(--soft);font-style:normal}
.bw-n{font:900 13px var(--round);color:#fde68a;min-height:16px;line-height:16px;border-radius:6px;padding:0 3px}
.bw-n.lo{background:rgba(248,113,113,.28);color:#fff}
.bw-n.win{background:rgba(74,222,128,.28);color:#bbf7d0}
.bw-n.lose{background:rgba(248,113,113,.2);color:#fecaca}
.bw-n small{display:block;font:800 9px/9px var(--round);color:#bbf7d0}
.bw-mid{font:800 9px var(--round);color:var(--soft);line-height:8px}
.bw-res{flex:none;display:grid;gap:3px;text-align:left;font:700 13px var(--round);color:#e2e8f0;padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);line-height:1.45}
.bw-res .big{font:900 15px var(--round);color:#bbf7d0}
.bw-res .big.bad{color:#fecaca}.bw-res .big.mid{color:#fde68a}
.bw-res small{color:var(--soft);font-weight:700}
.bw-acts{display:grid;gap:7px;flex:none;margin-top:auto}
.bw-two{display:grid;grid-template-columns:1.4fr 1fr;gap:8px}
.bw-two .btn,.bw-acts .btn{display:grid;gap:1px;padding:9px 6px;font-size:14.5px;line-height:1.25}
.bw-two .btn small{font:700 11px var(--round);color:var(--soft)}
.bw-mode{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.bw-mode button{padding:7px 4px;border-radius:12px;border:2px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 13.5px var(--round);cursor:pointer}
.bw-mode button.sel{border-color:#fde68a;background:rgba(253,230,138,.17)}
.bw-sg{flex:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.bw-cell{display:grid;justify-items:center;gap:2px;padding:4px 1px 5px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font:700 10.5px var(--round);cursor:pointer;min-width:0}
.bw-cell.sel{border-color:#fde68a;background:rgba(253,230,138,.2);box-shadow:0 0 0 2px rgba(253,230,138,.45)}
.bw-cell.ro{cursor:default}
.bw-cell small{color:var(--soft);font-size:10px}
.bw-cell .bw-b{font:900 14px var(--round);color:#fde68a}
.bw-step{flex:none;display:flex;gap:5px;align-items:center;justify-content:center;min-height:36px}
.bw-step button{min-width:42px;height:34px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 8px}
.bw-step button:disabled{opacity:.3}
.bw-cur{min-width:96px;text-align:center;font:800 12.5px var(--round);color:#fde68a;line-height:1.3}
.bw-help{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}
.bw-help button{padding:6px 4px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#e2e8f0;font:700 12.5px var(--round);cursor:pointer}
.bw-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.bw-row{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
.bw-row .bw-t{width:34px}
.bw-tut .bw-board{width:100%}
.bw-tut .bw-acts{width:100%;margin-top:0}
@media (max-height:760px){.bw-t{height:30px;font-size:17px}.bw-t.lg{height:40px;max-width:40px;font-size:23px}.bw-res{font-size:12.5px;padding:6px 8px}.bw-info{font-size:12px}.bw-cell{padding:3px 1px 4px}.bw-step{min-height:32px}}
@media (max-height:690px){.bw-t{height:27px;font-size:15px;max-width:30px}.bw-col{padding:2px 0 3px}.bw-n{font-size:12px;min-height:14px;line-height:14px}.bw-two .btn small{display:none}.bw-two .btn,.bw-acts .btn{padding:7px 5px}.bw-cell small{display:none}.bw-cell .bw-b{font-size:13px}.bw-t.lg{height:34px;max-width:34px;font-size:20px}.bw-res{padding:5px 8px;gap:2px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const tile = (x, col, cls = "") => `<span class="bw-t c${col}${x === null || x === undefined ? " q" : ""} ${cls}" title="${CN[col]}색 타일">${x === null || x === undefined ? "?" : x}</span>`;

  // ── 배치 · 고르기 상태 (다시 그려도 이어지게) ──
  let SS = null, DS = null;
  const ssOf = ctx => {
    const key = `${ctx.g}|setup`;
    if (!SS || SS.key !== key) SS = { key, ent: G.NUM.map(x => ({ x, b: 1 })), sel: -1, mode: "order", rn: 12345 };
    return SS;
  };
  const dsOf = (V, ctx) => {
    const key = `${ctx.g}|${V.pos}|${V.phase}`;
    if (!DS || DS.key !== key) DS = { key, pick: false, tk: new Array(NT).fill(0) };
    return DS;
  };
  const lcg = S => { S.rn = (Math.imul(S.rn, 1103515245) + 12345) >>> 0; return (S.rn >>> 8) / 16777216; };

  // ── 가림막 뒤: 순서 · 칩 배치 ──
  function renderSetup(stage, V, ctx) {
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    if (watch) {
      stage.innerHTML = `<div class="bw-top"><span class="bw-rd">🎴 가림막 뒤에서 배치 중</span></div><div class="bw-info">${[0, 1].map(i => `${esc(nameOf(ctx, i))} ${V.p[i].done ? "✅ 정했어요" : "⏳ 정하는 중"}`).join(" · ")}<br>타일 10개의 순서를 정하고 칩 30개를 나눠 걸어요.</div>`;
      stage.onclick = null; return;
    }
    const mine = ctx.canAct && V.needs.includes(me);
    if (!mine) {                                            // 이미 정함: 내 배치를 보여 주고 기다려요
      const P = V.p[me], cells = G.NUM.map((_, i) => `<div class="bw-cell ro"><small>${i + 1}번째</small>${tile(P.num[i], colOf(P.num[i]))}<b class="bw-b">🪙${P.init ? P.init[i] : "?"}</b></div>`).join("");
      stage.innerHTML = `<div class="bw-top"><span class="bw-rd">🎴 내 배치 (확정)</span><span class="bw-pill ok">🔒 가림막 뒤</span></div><div class="bw-sg">${cells}</div><div class="bw-info">✅ 정했어요 — <b>${esc(nameOf(ctx, 1 - me))}</b>${eun(nameOf(ctx, 1 - me))} 아직 정하는 중이에요…<br>가림막이 치워지면 서로의 <b>타일 색</b>과 <b>칩 수</b>가 보여요 (숫자는 비밀).</div>`;
      stage.onclick = null; return;
    }
    const S = ssOf(ctx), rem = G.CH - sum(S.ent.map(e => e.b)), sel = S.sel >= 0 ? S.ent[S.sel] : null;
    const cells = S.ent.map((e, i) => `<button type="button" class="bw-cell${S.sel === i ? " sel" : ""}" data-i="${i}" aria-label="${i + 1}번째 ${e.x} ${e.b}칩"><small>${i + 1}번째</small>${tile(e.x, colOf(e.x))}<b class="bw-b">🪙${e.b}</b></button>`).join("");
    let step;
    if (S.mode === "order") step = `<div class="bw-step"><button type="button" data-mv="-1" ${sel && S.sel > 0 ? "" : "disabled"}>◀</button><span class="bw-cur">${sel ? `${S.sel + 1}번째 ${CN[colOf(sel.x)]} ${sel.x} — 바꿀 자리를 눌러요` : "옮길 타일을 눌러요"}</span><button type="button" data-mv="1" ${sel && S.sel < NT - 1 ? "" : "disabled"}>▶</button></div>`;
    else step = `<div class="bw-step"><button type="button" data-d="-5" ${sel && sel.b > 1 ? "" : "disabled"}>−5</button><button type="button" data-d="-1" ${sel && sel.b > 1 ? "" : "disabled"}>−1</button><span class="bw-cur">${sel ? `${S.sel + 1}번째 · <b>${sel.b}칩</b>` : "칩을 걸 타일을 눌러요"}</span><button type="button" data-d="1" ${sel && rem > 0 ? "" : "disabled"}>+1</button><button type="button" data-d="5" ${sel && rem > 0 ? "" : "disabled"}>+5</button></div>`;
    stage.innerHTML = `<div class="bw-top"><span class="bw-rd">🎴 순서와 칩 (가림막 뒤)</span><span class="bw-pill ${rem === 0 ? "ok" : rem < 0 ? "bad" : ""}">남은 칩 ${rem}</span></div>
      <div class="bw-info">타일 10개의 <b>대결 순서</b>를 정하고 칩 <b>30개를 모두</b> 나눠 걸어요 (타일마다 <b>1칩 이상</b> · 시작하면 바꿀 수 없어요)</div>
      <div class="bw-mode"><button type="button" data-m="order" class="${S.mode === "order" ? "sel" : ""}">↔ 순서 정하기</button><button type="button" data-m="chip" class="${S.mode === "chip" ? "sel" : ""}">🪙 칩 걸기</button></div>
      <div class="bw-sg">${cells}</div>${step}
      <div class="bw-help"><button type="button" data-h="rand">🎲 무작위 추천 배치</button><button type="button" data-h="reset">↺ 처음으로</button></div>
      <div class="bw-acts"><button type="button" class="btn big primary" data-a="setup" ${rem === 0 ? "" : "disabled"}>${rem === 0 ? "🔒 이대로 정했어요 (가림막 시작)" : rem > 0 ? `칩 ${rem}개를 더 걸어요` : `칩 ${-rem}개를 줄여요`}</button></div>`;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const rr = () => render(stage, V, ctx);
      if (t.dataset.m) { S.mode = t.dataset.m; S.sel = -1; ctx.sfx("tap"); rr(); return; }
      if (t.dataset.i !== undefined) {
        const i = +t.dataset.i;
        if (S.mode === "order" && S.sel >= 0 && S.sel !== i) { const a = S.ent[S.sel]; S.ent[S.sel] = S.ent[i]; S.ent[i] = a; S.sel = -1; ctx.sfx("pop"); }
        else { S.sel = S.sel === i ? -1 : i; ctx.sfx("tap"); }
        rr(); return;
      }
      if (t.dataset.mv && S.sel >= 0) { const j = S.sel + +t.dataset.mv; if (j >= 0 && j < NT) { const a = S.ent[S.sel]; S.ent[S.sel] = S.ent[j]; S.ent[j] = a; S.sel = j; ctx.sfx("tap"); } rr(); return; }
      if (t.dataset.d && S.sel >= 0) {
        const k = +t.dataset.d, e1 = S.ent[S.sel], r0 = G.CH - sum(S.ent.map(x => x.b));
        e1.b = k > 0 ? e1.b + Math.min(k, r0) : e1.b - Math.min(-k, e1.b - 1); ctx.sfx("tap"); rr(); return;
      }
      if (t.dataset.h === "reset") { SS = null; ctx.sfx("tap"); rr(); return; }
      if (t.dataset.h === "rand") {
        const m = G.makeSetup("hard", () => lcg(S)); S.ent = m.order.map((x, i) => ({ x, b: m.bets[i] })); S.sel = -1; ctx.sfx("pop"); rr(); return;
      }
      if (t.dataset.a === "setup" && G.CH - sum(S.ent.map(x => x.b)) === 0) { ctx.sfx("pop"); ctx.act({ t: "setup", order: S.ent.map(e => e.x), bets: S.ent.map(e => e.b) }); }
    };
  }

  // ── 판 (승부 중) ──
  function renderBoard(stage, V, ctx) {
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, v0 = watch ? 0 : me, o = 1 - v0;
    const P0 = V.p[v0], P1 = V.p[o], D = V.dec, R = V.last;
    const mine = !watch && ctx.canAct && V.needs.includes(me) && V.phase === "decide";
    const S = dsOf(V, ctx), inPick = mine && S.pick && D.ex > 0;
    const pcap = j => P0.cur[j] - 1, taken = sum(S.tk);
    // 보드
    let cols = "";
    for (let j = 0; j < NT; j++) {
      const Rj = V.res[j] || null, isNow = j === V.pos && V.phase !== "end";
      let cO, cM, cls = "", clsO = "", clsM = "", tO = tile(P1.num[j], P1.col[j]), tM = tile(P0.num[j], P0.col[j]);
      if (Rj) {
        const fold = Rj.act === "fold";
        cO = fold ? Rj.a[o] : Rj.m; cM = fold ? Rj.a[v0] : Rj.m;
        if (Rj.w === v0) { clsM = "win"; clsO = "lose"; } else if (Rj.w === o) { clsO = "win"; clsM = "lose"; }
        const wM = Rj.w === v0, wO = Rj.w === o;
        tO = tile(P1.num[j], P1.col[j], `${fold ? (Rj.low === o ? "f" : "") : wO ? "w" : wM ? "l" : ""}`);
        tM = tile(P0.num[j], P0.col[j], `${fold ? (Rj.low === v0 ? "f" : "") : wM ? "w" : wO ? "l" : ""}`);
      } else { cO = P1.cur[j]; cM = P0.cur[j]; if (j === V.pos && D) { if (D.low === o) clsO = "lo"; else clsM = "lo"; } }
      let badge = "";
      if (!Rj && j > V.pos && inPick) { cls += (S.tk[j] > 0 || (taken < D.ex && pcap(j) - S.tk[j] >= 1)) ? " pk" : ""; cM = cM - S.tk[j]; badge = S.tk[j] ? `<small>−${S.tk[j]}</small>` : ""; }
      cols += `<div class="bw-col${isNow ? " now" : ""}${cls}" ${cls.includes("pk") ? `data-pk="${j}"` : ""}><i class="bw-ix">${j + 1}</i>${tO}<b class="bw-n ${clsO}">${cO}</b><span class="bw-mid">vs</span><b class="bw-n ${clsM}">${cM}${badge}</b>${tM}</div>`;
    }
    const hand0 = P0.hand, hand1 = P1.hand;
    let h = `<div class="bw-top"><span class="bw-rd">${Math.min(V.pos + 1, NT)} / ${NT} 타일</span><span class="bw-pill">🪙 ${watch ? esc(nameOf(ctx, v0)) : "내"} 손 ${hand0}</span><span class="bw-pill">${esc(nameOf(ctx, o))} 손 ${hand1}</span><span class="bw-pill ${V.chips[v0] >= G.WIN_AT ? "ok" : ""}" title="60칩 중 31칩 이상이면 승리">31↑ 승</span></div>`;
    h += `<div class="bw-lab"><span><b>${esc(nameOf(ctx, o))}</b> ▼ 색만 보이는 타일 · 위 숫자 = 걸린 칩</span></div><div class="bw-board">${cols}</div><div class="bw-lab"><span><b>${watch ? esc(nameOf(ctx, v0)) : "나"}</b> ▲ ${watch ? "" : "내 타일은 숫자가 보여요"}</span></div>`;
    // 아래 칸: 고르기 · 기다림 · 결과
    let acts = "", info = "";
    const res = (V.phase === "show" || V.phase === "end") && R;
    if (res) h += resHtml(V, ctx, R, watch ? -1 : me, v0, o);
    if (V.phase === "decide") {
      const hi = D.hi, lo = D.low;
      if (mine) {
        const my = P0.num[V.pos], col = P1.col[V.pos];
        const cand = V.cfg && V.cfg.aid ? G.NUM.filter(x => colOf(x) === col && !V.res.some(r => r.num && r.num[o] === x)) : null;
        const need = D.hu ? (D.ex ? `내 손 <b>${D.hu}칩</b> + 다른 타일에서 <b>${D.ex}칩</b>` : `내 손의 칩 <b>${D.hu}칩</b>`) : `내 다른 타일에서 <b>${D.ex}칩</b>`;
        info = `<div class="bw-info"><b>${V.pos + 1}번째 타일</b> — ${esc(nameOf(ctx, o))} <b>${D.h}칩</b> · 나 <b>${D.l}칩</b> (내가 더 적게 걸어서 내가 골라요)<br>내 타일 <b>${CN[colOf(my)]} ${my}</b> · 상대 타일은 <b>${CN[col]}색</b>${cand ? ` (남은 후보 <b>${cand.join(" ")}</b>)` : ""}<br>${D.can ? `맞추려면 <b>+${D.need}칩</b> — ${need} · 포기하면 내 ${D.l}칩을 잃어요` : `맞추려면 ${D.need}칩이 필요한데 칩이 모자라 <b>포기</b>만 할 수 있어요`}</div>`;
        if (inPick) {
          acts = `<div class="bw-info">다른 타일에서 <b>${D.ex}칩</b>을 가져와요 — 위 판에서 <b>초록 점선</b> 타일을 눌러 칩을 빼요 (<b>${taken} / ${D.ex}</b>) · 타일마다 1칩은 남아요</div>
            <div class="bw-acts"><button type="button" class="btn big primary" data-a="ok" ${taken === D.ex ? "" : "disabled"}>${taken === D.ex ? `✅ ${D.need}칩 더 걸고 오픈` : `${D.ex - taken}칩을 더 골라요`}</button>
            <div class="bw-two" style="grid-template-columns:1fr 1fr"><button type="button" class="btn" data-a="reset">↺ 다시 고르기</button><button type="button" class="btn" data-a="back">← 돌아가기</button></div></div>`;
        } else {
          const canM = D.can;
          acts = `<div class="bw-acts"><div class="bw-two"><button type="button" class="btn primary" data-a="match" ${canM ? "" : "disabled"}>💰 추가 베팅 +${D.need}<small>${canM ? `이기면 +${D.h} · 지면 −${D.h}` : "칩이 모자라요"}</small></button><button type="button" class="btn" data-a="fold">🏳️ 포기<small>내 ${D.l}칩을 잃어요</small></button></div></div>`;
        }
      } else if (!watch) {
        info = `<div class="bw-info">${V.pos + 1}번째 타일 — ${esc(nameOf(ctx, lo))}${eun(nameOf(ctx, lo))} <b>${D.l}칩</b>, ${esc(nameOf(ctx, hi))}${eun(nameOf(ctx, hi))} <b>${D.h}칩</b><br>${esc(nameOf(ctx, lo))}${iga(nameOf(ctx, lo))} <b>추가 베팅</b> · <b>포기</b>를 고르는 중이에요…</div>`;
      } else {
        info = `<div class="bw-info">${V.pos + 1}번째 타일 — ${esc(nameOf(ctx, lo))} <b>${D.l}칩</b> vs ${esc(nameOf(ctx, hi))} <b>${D.h}칩</b> · ${esc(nameOf(ctx, lo))}${iga(nameOf(ctx, lo))} 고르는 중이에요…</div>`;
      }
    } else if (V.phase === "show") info = `<div class="bw-info">잠시 뒤 ${V.pos + 2}번째 타일로 넘어가요…</div>`;
    h += info + acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const pk = e.target.closest("[data-pk]");
      if (pk && inPick) {
        const j = +pk.dataset.pk;
        if (S.tk[j] < pcap(j) && sum(S.tk) < D.ex) S.tk[j]++; else if (S.tk[j] > 0) S.tk[j]--;
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      const t = e.target.closest("button"); if (!t || t.disabled || !mine) return;
      const a = t.dataset.a;
      if (a === "fold") { ctx.sfx("pop"); ctx.act({ t: "fold" }); }
      else if (a === "match") {
        if (D.ex === 0) { ctx.sfx("pop"); ctx.act({ t: "match", take: [] }); return; }
        // 먼저 내 숫자가 낮은 뒤쪽 타일부터 가져오기로 채워 둠 (바꿀 수 있어요)
        const order = []; for (let j = V.pos + 1; j < NT; j++) order.push(j);
        order.sort((x, y) => P0.num[x] - P0.num[y] || y - x);
        S.tk = new Array(NT).fill(0); let left = D.ex;
        for (const j of order) { const k = Math.min(left, pcap(j)); if (k > 0) { S.tk[j] = k; left -= k; } if (!left) break; }
        S.pick = true; ctx.sfx("tap"); render(stage, V, ctx);
      } else if (a === "reset") { S.tk = new Array(NT).fill(0); ctx.sfx("tap"); render(stage, V, ctx); }
      else if (a === "back") { S.pick = false; S.tk = new Array(NT).fill(0); ctx.sfx("tap"); render(stage, V, ctx); }
      else if (a === "ok" && sum(S.tk) === D.ex) { const take = []; for (let j = 0; j < NT; j++) if (S.tk[j]) take.push([j, S.tk[j]]); ctx.sfx("pop"); ctx.act({ t: "match", take }); }
    };
  }
  function resHtml(V, ctx, R, me, v0, o) {
    const nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    const t = R.p + 1;
    let big = "", cls = "", line = "";
    const d = R.d[v0];
    if (R.act === "fold") {
      line = `🏳️ ${nm(R.low)}${iga(nm(R.low))} ${t}번째 타일을 <b>포기</b>했어요 — 숫자는 열리지 않고 걸린 칩 <b>${R.a[0] + R.a[1]}개</b>는 ${nm(R.w)}${iga(nm(R.w))} 가져가요`;
    } else if (R.w < 0) {
      line = `⚔️ ${nm(v0)} <b>${R.num[v0]}</b> vs ${nm(o)} <b>${R.num[o]}</b> → <b>같은 숫자</b> — 각자 걸었던 칩 ${R.m}개를 돌려받아요`;
    } else {
      line = `⚔️ ${nm(v0)} <b>${R.num[v0]}</b> vs ${nm(o)} <b>${R.num[o]}</b> → ${nm(R.w)}${iga(nm(R.w))} 이겨요 — 걸린 칩 ${R.m} + ${R.m} = <b>${R.m * 2}개</b>를 가져가요${R.act === "equal" ? " (같은 칩이라 바로 오픈)" : ""}`;
    }
    if (me >= 0) { big = d > 0 ? `🎉 이번 타일은 내가 +${d}칩` : d < 0 ? `이번 타일은 상대가 +${-d}칩 앞서요` : "이번 타일은 비겼어요"; cls = d > 0 ? "" : d < 0 ? "bad" : "mid"; }
    const pull = R.pull && R.pull.length ? `<div><small>맞추려고 ${R.pull.map(x => `${x[0] + 1}번째에서 ${x[1]}칩`).join(" · ")} 가져왔어요${R.hu ? ` · 손의 ${R.hu}칩도 썼어요` : ""}</small></div>` : (R.act === "match" && R.hu ? `<div><small>손의 칩 ${R.hu}개로 맞췄어요</small></div>` : "");
    return `<div class="bw-res">${me >= 0 ? `<div class="big ${cls}">${big}</div>` : ""}<div>${line}</div>${pull}<div><small>칩 합계: ${nm(v0)} <b>${R.ch[v0]}</b> · ${nm(o)} <b>${R.ch[o]}</b> (31칩 이상이면 승리)</small></div></div>`;
  }
  function render(stage, V, ctx) {
    style();
    if (V.phase === "setup") renderSetup(stage, V, ctx); else renderBoard(stage, V, ctx);
  }
  function result(V, me) {
    const R = V.res || [], v = me === 1 ? 1 : 0, o = 1 - v;
    const won = R.filter(r => r.w === v).length, lost = R.filter(r => r.w === o).length, draw = R.filter(r => r.w < 0).length;
    const myF = R.filter(r => r.act === "fold" && r.low === v).length, opF = R.filter(r => r.act === "fold" && r.low === o).length, mt = R.filter(r => r.act === "match" && r.low === v).length;
    return `칩 <b>${V.chips[v]} : ${V.chips[o]}</b> · 이긴 타일 ${won}개 · 진 타일 ${lost}개${draw ? ` · 같은 숫자 ${draw}개` : ""} · 내가 추가 베팅 ${mt}번 · 포기 ${myF}번 (상대 포기 ${opF}번)`;
  }

  // ── 1분 규칙 (방송 순서: 가림막 · 칩 지급 → 순서 · 베팅 → 가림막 치움 → 추가 베팅 / 포기 → 끝) ──
  function tutorial() {
    style();
    const mini = (arr, cols, bets, nowI) => `<div class="bw-board">${arr.map((x, j) => `<div class="bw-col${j === nowI ? " now" : ""}"><i class="bw-ix">${j + 1}</i>${tile(x === null ? null : x, cols[j])}<b class="bw-n">${bets[j]}</b></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 준비", title: "가림막 · 타일 10개 · 칩 30개", body: "<b>가운데 가림막</b>이 놓인 채 시작해요. 두 사람은 각자 <b>숫자 타일 10개</b>(0~9)와 <b>칩 30개</b>를 받아요. 짝수 0 · 2 · 4 · 6 · 8 은 <b>흑</b>, 홀수 1 · 3 · 5 · 7 · 9 는 <b>백</b> 타일이에요 (높은 숫자가 이겨요).",
        boardHtml: `<div class="bw-tut"><div class="bw-row">${[0, 2, 4, 6, 8].map(x => tile(x, 0, "lg")).join("")}</div><div class="bw-row">${[1, 3, 5, 7, 9].map(x => tile(x, 1, "lg")).join("")}</div><div class="bw-pill">🪙 칩 30개</div></div>`, ms: 6200 },
      { tag: "STEP 2 · 순서와 베팅", title: "대결 순서를 정하고 칩 30개를 나눠 걸어요", body: "시작하면 <b>타일 10개의 대결 순서</b>를 미리 정해 뒷면으로 놓고, 칩 <b>30개를 10개 타일에 나눠 베팅</b>해요. 타일마다 <b>1칩 이상</b>, 30개를 <b>모두</b> 걸어야 하고 승부가 시작되면 <b>바꾸거나 더 걸 수 없어요</b>. (방송의 오현민: 12 · 4 · 4 · 4 · 나머지 6개는 1칩씩)",
        boardHtml: `<div class="bw-tut">${mini([null, null, null, null, null, null, null, null, null, null], [1, 0, 1, 0, 0, 1, 0, 1, 0, 1], [12, 4, 4, 4, 1, 1, 1, 1, 1, 1], -1)}<div class="bw-pill">12 + 4 + 4 + 4 + 1×6 = 30칩</div></div>`, ms: 6800 },
      { tag: "STEP 3 · 승부", title: "가림막을 치우면 색과 칩 수만 보여요", body: "가림막이 치워지면 서로의 타일 <b>색(흑/백)</b>과 타일마다 걸린 <b>칩 수</b>만 보여요 — <b>숫자는 비밀</b>이에요. 첫 번째 타일부터 차례로 승부해요. 건 칩이 <b>같으면 바로 오픈</b>, <b>다르면 적게 건 쪽</b>이 <b>추가 베팅</b> 또는 <b>포기</b>를 골라요.",
        boardHtml: `<div class="bw-tut"><div class="bw-board" style="grid-template-columns:repeat(2,58px);justify-content:center"><div class="bw-col now"><i class="bw-ix">1</i>${tile(null, 1)}<b class="bw-n">12</b><span class="bw-mid">vs</span><b class="bw-n lo">1</b>${tile(3, 1)}</div><div class="bw-col"><i class="bw-ix">2</i>${tile(null, 0)}<b class="bw-n">4</b><span class="bw-mid">vs</span><b class="bw-n">4</b>${tile(4, 0)}</div></div><div class="bw-info">위 = 상대 (색 · 칩만) / 아래 = 나 (숫자까지)</div></div>`, ms: 6600 },
      { tag: "STEP 4 · 직접", title: "적게 건 쪽이 고르는 갈림길", body: "첫 번째 타일에서 상대는 <b>12칩</b>, 나는 <b>1칩</b>을 걸었어요. 내 타일은 <b>백 3</b>, 상대 타일은 <b>흑</b> (0 · 2 · 4 · 6 · 8 중 하나). <b>추가 베팅</b>이 이득일까요, <b>포기</b>가 나을까요? 눌러 봐요!",
        interactive: { hint: "👆 고르고 눌러 봐요 (포기가 정답이에요)", doneText: "✅ 포기! 3 은 흑 0 · 2 만 이겨서 40% — 맞추면 기대 −2.4칩, 포기하면 −1칩만 잃어요" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="bw-tut"><div class="bw-board" style="grid-template-columns:58px;justify-content:center"><div class="bw-col now"><i class="bw-ix">1</i>${tile(null, 0)}<b class="bw-n">12</b><span class="bw-mid">vs</span><b class="bw-n lo">1</b>${tile(3, 1)}</div></div><div class="bw-info" id="bwmsg">11칩을 더 걸어야 맞출 수 있어요</div><div class="bw-acts"><div class="bw-two"><button type="button" class="btn" data-t="m">💰 추가 베팅 +11</button><button type="button" class="btn primary" data-t="f">🏳️ 포기</button></div></div></div>`;
          stage.onclick = e => {
            const b = e.target.closest("[data-t]"); if (!b) return;
            const msg = stage.querySelector("#bwmsg");
            if (b.dataset.t === "f") { ctrl.sfx("win"); b.classList.add("sel"); ctrl.complete(); }
            else { ctrl.sfx("tap"); if (msg) msg.innerHTML = "3 이 이기는 건 상대 0 · 2 뿐이에요 (5개 중 2개 = 40%) — 지면 12칩을 잃어요. 다시 골라 봐요!"; }
          };
        } },
      { tag: "STEP 5 · 정산과 끝", title: "높은 숫자가 칩을 가져가요 · 칩이 많은 쪽 승", body: "<b>추가 베팅</b>으로 칩을 같게 맞추면 두 타일을 <b>오픈</b>해 <b>높은 숫자</b>가 걸린 칩을 모두 가져가요. 보태는 칩은 <b>손에 딴 칩</b>부터, 없으면 <b>내 다른 타일의 칩</b>을 빼서 써요 (타일마다 1칩은 남아야 해요). <b>포기</b>하면 숫자는 열리지 않고 걸린 칩은 상대 몫! 10개 타일이 모두 끝났을 때 <b>칩이 더 많은 쪽</b>(60칩 중 31칩 이상)이 이겨요 — 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="bw-tut"><div class="bw-res"><div class="big">12칩 vs 1칩 → 포기 → 손 13칩</div><div>방송: 13 → 21 → 29 → 37 → 최종 <b>37 : 23</b></div><small>높은 숫자 승 · 같은 숫자는 각자 칩 돌려받기</small></div></div>`, ms: 7600 },
    ];
  }

  // ── 🎞️ 복기 ──
  const takeTxt = t => (t && t.length ? t.map(x => `${x[0] + 1}번째 −${x[1]}`).join(", ") : "");
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "setup") {
      if (!G.isPerm(a.order) || !G.okBets(a.bets)) return "배치";
      const I = G.setupInfo(a.order, a.bets);
      return `배치 — 9·8·7 타일에 ${I.top3}칩 · 숫자 0~5 여섯 타일에 ${I.weak6}칩 · 가장 큰 베팅 ${I.max}칩 (${I.maxPos + 1}번째 · 숫자 ${I.maxNum})`;
    }
    if (a.t === "fold") return V && V.dec ? `포기 (${V.pos + 1}번째 타일 · 내 ${V.dec.l}칩 잃음)` : "포기";
    if (a.t === "match") {
      const tk = takeTxt(a.take);
      return V && V.dec ? `추가 베팅 +${V.dec.need}칩 (${V.pos + 1}번째 타일${V.dec.hu ? ` · 손 ${V.dec.hu}칩` : ""}${tk ? ` · ${tk}` : ""})` : `추가 베팅${tk ? ` (${tk})` : ""}`;
    }
    return "—";
  }
  const sameTake = (a, b) => JSON.stringify((a || []).slice().sort()) === JSON.stringify((b || []).slice().sort());
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || (seat !== 0 && seat !== 1)) return null;
    if (V.phase === "setup") {
      if (myA.t !== "setup" || bestA.t !== "setup" || !G.isPerm(myA.order) || !G.okBets(myA.bets) || !G.isPerm(bestA.order) || !G.okBets(bestA.bets)) return null;
      const m = G.setupInfo(myA.order, myA.bets), b = G.setupInfo(bestA.order, bestA.bets);
      return { sev: 0, why: `내 배치: 9·8·7 에 ${m.top3}칩 · 약한 숫자(0~5) 6곳에 ${m.weak6}칩 · 1칩만 건 타일 ${m.ones}개 / 고급 AI 배치: 9·8·7 에 ${b.top3}칩 · 0~5 에 ${b.weak6}칩 · 1칩 타일 ${b.ones}개 — 배치는 정답이 없어요 (센 타일에 몰수록 상대가 포기하기 쉽지만 읽혀요)` };
    }
    if (V.phase !== "decide" || !V.needs || !V.needs.includes(seat) || myA.t !== "fold" && myA.t !== "match" || bestA.t !== "fold" && bestA.t !== "match") return null;
    if (myA.t === bestA.t && (myA.t === "fold" || sameTake(myA.take, bestA.take))) return null;
    const m = G.evalAct(V, seat, myA), b = G.evalAct(V, seat, bestA);
    if (!m || !b) return null;
    const gap = b.ev - m.ev, scale = Math.max(3, 0.25 * V.chips[seat]);
    let sev = gap < 0.15 ? 0 : 100 * gap / scale;
    if (info && info.same) sev = Math.min(sev, 20);
    if (myA.t === bestA.t) sev = Math.min(sev, 25);                                      // 같은 결정에서 가져오는 타일만 다름
    sev = Math.max(0, Math.min(100, Math.round(sev)));
    const col = CN[V.p[1 - seat].col[V.pos]];
    const base = `내 타일 ${m.x} · 상대 ${col}색 후보 기준 이길 확률 ${pc(m.pw)} · 비길 ${pc(m.pt)} · 질 ${pc(m.pl)}`;
    const ev = e => e.kind === "fold" ? `포기 ${sg(e.ev)}칩` : `추가 베팅 ${sg(e.ev)}칩 (이기면 +${e.h} · 지면 −${e.h}${e.cost ? ` · 다른 타일에서 가져온 칩 효과 ${sg(-e.cost)}` : ""})`;
    const tail = gap >= 0.15 ? ` — 기대 칩 ${gap.toFixed(1)} 차이` : gap <= -0.15 ? " — 이 계산으로는 내 수가 더 높아요 (고급 AI 는 상대 배치 습관도 추정해요)" : " — 거의 같아요";
    return { sev, why: `${base}. 고급 AI 수 (${actText(bestA, V)}): ${ev(b)} / 내 수 (${actText(myA, V)}): ${ev(m)}${tail}` };
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-betbw"] = {
    name: "베팅! 흑과 백", emoji: "⚫", short: "타일 순서와 칩 30개를 몰래 걸어 두고 맞출지 포기할지 고르는 1:1 데스매치", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 3 · 베팅! 흑과 백", season: "시즌 3 블랙가넷 · 11화 데스매치",
    opts: [
      { k: "aid", label: "기억 도우미", items: [[1, "켬 (상대 남은 숫자 후보)"], [0, "끔 (방송)"]], def: 1 },
    ],
    diff: "AI 와 둬요 — 방송은 사람 둘이 가림막을 사이에 두고 칩을 손으로 옮기고 \"추가 베팅하시겠습니까?\" 에 말로 답했는데, 여기서는 화면에서 순서 · 칩을 정하고 [추가 베팅 / 포기] 단추와 가져올 타일 고르기로 대신해요 (한 기기 두 사람 모드는 순서 · 베팅이 비밀이라 없어요) · 같은 숫자일 때 각자 건 칩을 돌려받는 것은 나무위키 기준이고 영상으로는 확인하지 못했어요 · 30 : 30 동점은 방송 규칙에 없어 무승부로 둬요 · 추가 베팅 칩을 손의 칩부터 쓰는 것은 딜러 낭독(\"보유한 칩이 없다면 다른 타일에서\")을 그대로 따른 해석이에요 · 기억 도우미(켬)는 상대 타일에서 아직 안 열린 숫자 후보를 적어 줘요 (방송은 외워야 함)",
    howto: [
      "<b>1:1 데스매치</b> — 가운데 <b>가림막</b>이 놓인 채 시작해요. 각자 <b>숫자 타일 10개</b>(0~9 · 짝수 0·2·4·6·8 = <b>흑</b>, 홀수 1·3·5·7·9 = <b>백</b>)와 <b>칩 30개</b>를 받아요",
      "타일 10개의 <b>대결 순서</b>를 미리 정해 뒷면으로 놓고, 칩 <b>30개를 10개 타일에 나눠 베팅</b> — 타일마다 <b>1칩 이상</b>, 30개 <b>모두</b> · 승부가 시작되면 <b>바꾸거나 더 걸 수 없어요</b>",
      "<b>가림막을 치우면</b> 서로의 타일 <b>색(흑/백)</b>과 걸린 <b>칩 수</b>만 보여요 (숫자는 비밀) — <b>첫 번째 타일</b>부터 차례로 승부",
      "건 칩이 <b>같으면 바로 오픈</b> · <b>다르면 칩을 적게 건 쪽</b>이 골라요: <b>추가 베팅</b>(상대와 같아지게 칩을 보태요 → 두 타일을 <b>오픈</b>, <b>높은 숫자</b>가 걸린 칩을 모두 가져가요) 또는 <b>포기</b>(숫자는 열리지 않고 걸린 칩은 상대 몫)",
      "보태는 칩은 <b>손에 딴 칩</b>부터, 없으면 <b>내 다른 타일에 걸린 칩</b>을 빼서 써요 (타일마다 1칩은 남아야 해요)",
      "10개 타일이 모두 끝났을 때 <b>칩이 더 많은 쪽</b> 승리 (60칩 중 31칩 이상)",
    ],
    sub: V => (V.phase === "setup" ? "가림막 뒤에서 배치" : V.over ? "끝" : `${V.pos + 1}/${NT}번째 타일 · 31칩 이상 승`),
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

/* 베니 서바이벌 · 배틀 가위바위보 — 화면 (카드 고르기 · 동시 공개 · 지난 라운드 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const B = window.SVCores.bloodrps;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const EM = ["✌️", "✊", "🖐️"], RPS = B.RPS, SPN = B.SPN, SPE = { V: "🏆", C: "🔄", B: "" };
  const CSS = `
.br-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:nowrap}
.br-sc{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 11px;white-space:nowrap;font-variant-numeric:tabular-nums}
.br-log{flex:1;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.br-side{display:flex;align-items:center;gap:5px;flex:none;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:12px;padding:5px 8px;min-width:0}
.br-side .nm{font:800 12.5px var(--round);min-width:0;max-width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.br-side .cn{font:800 13px var(--round);padding:2px 6px;border-radius:8px;background:rgba(255,255,255,.08);white-space:nowrap}
.br-side .cn.z{opacity:.28;text-decoration:line-through}
.br-side .sp{margin-left:auto;display:flex;gap:4px}
.br-side .sp i{font-style:normal;font-size:12px;font-weight:800;padding:2px 6px;border-radius:8px;border:1px solid rgba(251,191,36,.5);background:rgba(251,191,36,.12);color:#fde68a;white-space:nowrap}
.br-side .sp i.z{opacity:.28;text-decoration:line-through;border-color:rgba(255,255,255,.2);background:none;color:var(--soft)}
.br-table{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;flex:none}
.br-slot{display:grid;gap:3px;justify-items:center;min-width:0}
.br-slot small{font-size:11.5px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.br-vs{font:900 15px var(--round);color:#fb7185}
.br-card{position:relative;display:grid;justify-items:center;align-content:center;gap:1px;width:104px;height:86px;border-radius:14px;background:#f8fafc;color:#0f172a;border:3px solid #e11d48;box-shadow:0 5px 14px rgba(0,0,0,.45)}
.br-card .e{font-size:32px;line-height:1}
.br-card b{font:900 14px var(--round)}
.br-card em{font:800 11.5px var(--round);font-style:normal;color:#64748b;white-space:nowrap}
.br-card em.V{color:#b45309}.br-card em.C{color:#6d28d9}
.br-card.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 7px,#991b1b 7px 14px);border-color:#fca5a5;color:#fecaca}
.br-card.back .e{font-size:28px}.br-card.back em{color:#fecaca}
.br-card.win{box-shadow:0 0 0 3px #4ade80,0 0 20px rgba(74,222,128,.55)}
.br-card.lose{opacity:.62}
.br-card.pre{border-style:dashed;opacity:.85}
.br-res{flex:none;text-align:center;border-radius:12px;padding:6px 9px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.br-res b{display:block;font:900 15px var(--round);color:#bbf7d0}
.br-res span{display:block;font-size:12.5px;color:#d1fae5}
.br-res.bad{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.br-res.bad b{color:#fecaca}.br-res.bad span{color:#fee2e2}
.br-res.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.br-res.mid b{color:#fde68a}.br-res.mid span{color:#fef3c7}
.br-hist{display:flex;gap:5px;flex:none;align-items:stretch}
.br-hl{display:grid;align-content:end;gap:2px;font-size:10.5px;color:var(--soft);text-align:right;padding-bottom:1px;line-height:1.2}
.br-hl span{height:17px;display:grid;align-items:center}
.br-h{flex:1;min-width:0;display:grid;gap:2px;justify-items:center;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);padding:2px 0 3px;font-size:13px;line-height:1.1}
.br-h i{font:800 10px var(--round);font-style:normal;color:var(--soft)}
.br-h span{height:17px;display:grid;align-items:center;white-space:nowrap}
.br-h.w{border-color:#4ade80;background:rgba(34,197,94,.14)}.br-h.l{border-color:#f87171;background:rgba(239,68,68,.12)}.br-h.t{border-color:#fbbf24;background:rgba(245,179,1,.1)}
.br-h.cur{border-color:#fff;box-shadow:0 0 0 1px #fff}
.br-pick{display:grid;gap:5px;margin-top:auto;flex:none}
.br-lb{font:800 12px var(--round);color:var(--soft)}
.br-lb b{color:#fde68a}
.br-rps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.br-rb{display:grid;justify-items:center;gap:0;padding:6px 4px 5px;border-radius:13px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:inherit;cursor:pointer;line-height:1.15}
.br-rb .e{font-size:28px;line-height:1.1}.br-rb b{font:900 14px var(--round)}.br-rb small{font-size:11px;color:var(--soft)}
.br-rb.on{border-color:#fde68a;background:rgba(245,179,1,.22);box-shadow:0 0 0 2px rgba(253,230,138,.35)}
.br-rb:disabled{opacity:.28;cursor:default}
.br-spb{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.br-sb{display:grid;justify-items:center;gap:0;padding:5px 3px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:inherit;cursor:pointer;line-height:1.2}
.br-sb b{font:900 13.5px var(--round);white-space:nowrap}.br-sb small{font-size:10.5px;color:var(--soft);white-space:nowrap}
.br-sb.on{border-color:#c4b5fd;background:rgba(124,58,237,.35);box-shadow:0 0 0 2px rgba(196,181,253,.3)}
.br-sb:disabled{opacity:.28;cursor:default}
.br-pick .btn.big{padding:12px 8px;font-size:15.5px}
.br-note{flex:none;text-align:center;font-size:13px;color:var(--soft);line-height:1.45;margin-top:auto}
.br-note b{color:#fde68a}
.br-tut{display:grid;gap:8px;justify-items:center;width:100%}
.br-tut .br-card{width:84px;height:72px}.br-tut .br-card .e{font-size:26px}
.br-tut .row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
.br-tut .br-rps{width:100%}
.br-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.br-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px}
@media (max-height:760px){.br-card{width:92px;height:72px}.br-card .e{font-size:27px}.br-rb .e{font-size:23px}.br-rb{padding:4px 3px}.br-rb small{display:none}.br-sb small{display:none}.br-pick{gap:4px}.br-pick .btn.big{padding:10px 8px}.br-res span{display:none}}
@media (max-height:690px){.br-card{width:84px;height:62px}.br-card .e{font-size:22px}.br-card b{font-size:12.5px}.br-lb{font-size:11px}.br-rb .e{font-size:20px}.br-rb b{font-size:12.5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const mini = c => EM[c.r] + SPE[c.s];
  const cardHtml = (c, cls = "") => `<div class="br-card ${cls}"><span class="e">${EM[c.r]}</span><b>${RPS[c.r]}</b><em class="${c.s}">${c.s === "B" ? "빈 카드" : SPE[c.s] + " " + SPN[c.s]}</em></div>`;
  const backHtml = (t, cls = "") => `<div class="br-card back ${cls}"><span class="e">🔒</span><em>${t}</em></div>`;

  let SEL = null;     // 이 기기에서 고르는 중인 카드
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}`; if (!SEL || SEL.key !== key) SEL = { key, r: null, s: "B" }; return SEL; };

  // 한 라운드가 어떻게 가려졌는지 (원문 판정 그대로)
  function why(rec, me, nm) {
    const c0 = rec.c[0], c1 = rec.c[1], w = rec.w, lab = i => (i === me ? "나" : nm(i));
    const wn = w >= 0 ? lab(w) : "";
    if (rec.how === "V") return `${wn}의 빅토리 → 가위바위보와 상관없이 이겨요`;
    if (rec.how === "C>V") return `체인지가 빅토리를 이겨요 → ${wn} 승`;
    if (rec.how === "C") return `체인지 → 카드를 맞바꿔 ${lab(0)} ${RPS[c1.r]} vs ${lab(1)} ${RPS[c0.r]}${w < 0 ? " → 비김" : ` → ${wn} 승`}`;
    if (rec.how === "void") return `같은 특수 카드 → 효과가 사라지고 가위바위보만 (${RPS[c0.r]} vs ${RPS[c1.r]})${w < 0 ? " → 비김" : ` → ${wn} 승`}`;
    return w < 0 ? `${RPS[c0.r]} vs ${RPS[c1.r]} → 같아서 비겨요` : `${RPS[c0.r]} vs ${RPS[c1.r]} → ${wn} 승`;
  }
  function resHtml(rec, me, nm) {
    const cls = rec.w < 0 ? "mid" : me < 0 || rec.w === me ? "" : "bad";
    const head = rec.w < 0 ? `🤝 비겼어요 · 둘 다 +${rec.pts[0]}점` : me >= 0 ? (rec.w === me ? `🏆 이겼어요 · +${rec.pts[me]}점` : `😵 졌어요 · +0점`) : `🏆 ${esc(nm(rec.w))} 승 · +${rec.pts[rec.w]}점`;
    return `<div class="br-res ${cls}"><b>${head}</b><span>${esc(why(rec, me, nm))}</span></div>`;
  }
  function sideHtml(V, i, label) {
    const L = V.left[i], S = V.sp[i];
    return `<div class="br-side"><span class="nm">${esc(label)}</span>${[0, 1, 2].map(r => `<span class="cn${L[r] ? "" : " z"}" title="${RPS[r]} 남은 ${L[r]}장">${EM[r]}${L[r]}</span>`).join("")}<span class="sp"><i class="${S.V ? "" : "z"}">🏆 빅토리</i><i class="${S.C ? "" : "z"}">🔄 체인지</i></span></div>`;
  }
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    if (e.k === "lock") return `${esc(nameOf(ctx, e.s))} 카드를 냈어요`;
    if (e.k === "result") return `${e.r}라운드 공개`;
    if (e.k === "round") return `${e.r}라운드 시작`;
    return "";
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const A = spec ? 0 : me, O = 1 - A, nm = i => nameOf(ctx, i), show = V.phase === "show" || V.phase === "end", R = V.res;
    const myName = spec ? esc(nm(A)) : "나";
    let h = `<div class="br-top"><span class="br-sc">${spec ? esc(nm(A)) : "나"} ${V.pts[A]} : ${V.pts[O]} ${esc(nm(O))}</span><span class="br-log">${spec ? "👀 구경 중" : logText(V, ctx)}</span></div>`;
    h += sideHtml(V, O, nm(O));
    if (spec) h += sideHtml(V, A, nm(A));
    // 가운데 판
    let oc, mc, ocls = "", mcls = "";
    if (show && R) {
      oc = cardHtml(R.c[O], R.w === O ? "win" : R.w === A ? "lose" : ""); mc = cardHtml(R.c[A], R.w === A ? "win" : R.w === O ? "lose" : "");
    } else {
      const sel = spec ? null : selFor(V, ctx);
      const subs = V.subs;
      oc = subs && subs[O] ? cardHtml(subs[O], "pre") : backHtml(V.submitted[O] ? "냈어요" : "고민 중…");
      if (V.mine) mc = cardHtml(V.mine, "pre");
      else if (subs && subs[A]) mc = cardHtml(subs[A], "pre");
      else if (sel && sel.r != null) mc = cardHtml({ r: sel.r, s: sel.s }, "pre");
      else mc = `<div class="br-card pre"><span class="e">❔</span><em>${spec ? (V.submitted[A] ? "냈어요" : "고민 중…") : "카드를 골라요"}</em></div>`;
      void ocls; void mcls;
    }
    h += `<div class="br-table"><div class="br-slot">${oc}<small>${esc(nm(O))}</small></div><span class="br-vs">VS</span><div class="br-slot">${mc}<small>${myName}</small></div></div>`;
    if (show && R) h += resHtml(R, spec ? -1 : me, nm);
    // 지난 라운드 줄
    let tiles = "";
    for (let i = 0; i < V.R; i++) {
      const r = V.hist[i];
      if (r) tiles += `<div class="br-h ${r.w < 0 ? "t" : r.w === A ? "w" : "l"}${show && r === V.hist[V.hist.length - 1] && !V.over ? " cur" : ""}" title="${i + 1}라운드"><i>${i + 1}</i><span>${mini(r.c[A])}</span><span>${mini(r.c[O])}</span></div>`;
      else tiles += `<div class="br-h${i + 1 === V.round && !V.over ? " cur" : ""}"><i>${i + 1}</i><span>·</span><span>·</span></div>`;
    }
    h += `<div class="br-hist"><div class="br-hl"><span>${spec ? esc(String(nm(A)).slice(0, 4)) : "나"}</span><span>${esc(String(nm(O)).slice(0, 4))}</span></div>${tiles}</div>`;
    // 아래 칸
    if (!show && !spec && ctx.canAct) {
      const sel = selFor(V, ctx), L = V.left[me], S = V.sp[me];
      h += `<div class="br-pick"><div class="br-lb">① <b>가위바위보 카드</b> 한 장 (6장 중 5장만 써요)</div>
        <div class="br-rps">${[0, 1, 2].map(r => `<button type="button" class="br-rb${sel.r === r ? " on" : ""}" data-r="${r}" ${L[r] ? "" : "disabled"} aria-label="${RPS[r]}"><span class="e">${EM[r]}</span><b>${RPS[r]}</b><small>남은 ${L[r]}장</small></button>`).join("")}</div>
        <div class="br-lb">② <b>특수 카드</b> (빅토리 · 체인지는 한 번뿐 · 안 쓰면 빈 카드)</div>
        <div class="br-spb">${["V", "C", "B"].map(s => `<button type="button" class="br-sb${sel.s === s ? " on" : ""}" data-s="${s}" ${s === "B" || S[s] ? "" : "disabled"} aria-label="${SPN[s]}"><b>${s === "B" ? "▫️ 빈 카드" : SPE[s] + " " + SPN[s]}</b><small>${s === "V" ? "무조건 이겨요" : s === "C" ? "서로 카드를 바꿔요" : "그냥 가위바위보"}</small></button>`).join("")}</div>
        <button class="btn primary big" data-a="submit" ${sel.r == null ? "disabled" : ""}>${sel.r == null ? "가위바위보 카드를 먼저 골라요" : `🔒 ${EM[sel.r]} ${RPS[sel.r]}${sel.s === "B" ? "" : " + " + SPN[sel.s]} 내기`}</button></div>`;
    } else if (!show && !spec && V.mine) {
      h += `<div class="br-note">🔒 카드를 냈어요 · <b>${esc(nm(O))}</b> 이(가) 낼 때까지 기다려요…</div>`;
    } else if (!show) {
      h += `<div class="br-note">${spec ? (V.subs ? "두 사람이 동시에 카드를 숨겨 내요 — 구경 중이라 둘 다 보여요" : "두 사람이 동시에 카드를 숨겨 내요 — 다 내면 같이 열어요") : "잠시만요…"}</div>`;
    } else if (V.over) {
      h += `<div class="br-note">모든 라운드가 끝났어요 · <b>${V.pts[A]} : ${V.pts[O]}</b></div>`;
    } else {
      h += `<div class="br-note">잠시 뒤 다음 라운드가 시작돼요…</div>`;
    }
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const sel = selFor(V, ctx);
      if (t.dataset.r != null) { sel.r = +t.dataset.r; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.s) { sel.s = t.dataset.s; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "submit" && sel.r != null) { ctx.sfx("pop"); ctx.act({ r: sel.r, s: sel.s }); }
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const A = me >= 0 ? me : 0, O = 1 - A, who = me >= 0 ? ["나", "상대"] : ["1번", "2번"];
    const rows = V.hist.map(r => `<div>${r.r}라운드 · ${who[0]} ${B.cardText(r.c[A])} vs ${who[1]} ${B.cardText(r.c[O])} → <b>${r.w < 0 ? "비김 +1" : r.w === A ? "승 +2" : "패 +0"}</b></div>`).join("");
    return `<div>승점 ${who[0]} <b>${V.pts[A]}</b> : <b>${V.pts[O]}</b> ${who[1]}</div>${rows}`;
  }

  // ── AI 선생님 (보이는 것만) ──
  const pc = x => Math.round(x * 100);
  const cntTxt = L => `가위 ${L[0]} · 바위 ${L[1]} · 보 ${L[2]}`;
  function coach(V, me, since, names) {
    const o = 1 - me, on = esc((names && names[o]) || "상대"), left = V.R - V.round + (V.phase === "pick" ? 1 : 0);
    const ended = V.over || (V.phase === "show" && V.round >= V.R);
    const L = V.left[o], S = V.sp[o], tot = L[0] + L[1] + L[2];
    let opp = `${on}: ${cntTxt(L)} 남았고, ` + (S.V && S.C ? "빅토리와 체인지를 둘 다 아직 갖고 있어요." : S.V ? "빅토리만 남았어요 (체인지는 썼어요)." : S.C ? "체인지만 남았어요 (빅토리는 썼어요)." : "특수 카드를 다 썼어요 — 이제 가위바위보만 와요.");
    const mx = Math.max(...L), top = [0, 1, 2].filter(r => L[r] === mx);
    if (tot && top.length === 1 && mx > Math.min(...L)) opp += ` 남은 카드 중 ${RPS[top[0]]}가 가장 많아서(${mx}/${tot}) 낼 가능성이 제일 커요.`;
    const used = V.hist.map(h => h.c[o]).filter(c => c.s !== "B").length;
    if (V.hist.length) opp += ` 지금까지 특수 카드를 ${used}번 썼어요.`;
    const d = V.pts[me] - V.pts[o], lead = d > 0 ? `${d}점 앞서요` : d < 0 ? `${-d}점 뒤져요` : "동점이에요";
    let mine = `승점 나 ${V.pts[me]} : ${V.pts[o]} ${on} (${lead}). 내 남은 카드는 ${cntTxt(V.left[me])}, ` + (V.sp[me].V && V.sp[me].C ? "빅토리 · 체인지 모두 있어요." : V.sp[me].V ? "빅토리만 남았어요." : V.sp[me].C ? "체인지만 남았어요." : "특수 카드는 다 썼어요.");
    if (ended) return { opp, mine, rec: "모든 라운드가 끝났어요. 결과를 확인해요.", why: "가위바위보 6장 중 5장만 쓰니, 마지막까지 어떤 카드를 남기는지가 승부를 갈랐어요." };
    mine += ` 남은 라운드 ${left}번.`;
    if (V.phase === "show") return { opp, mine, rec: "공개한 카드를 확인해요. 곧 다음 라운드가 시작돼요.", why: "쓴 가위바위보 · 빅토리 · 체인지는 다시 못 쓰니, 방금 나온 카드를 상대 남은 카드에서 빼고 세어 둬요." };
    const ch = B.chances(V, me);
    if (V.submitted[me] || !ch.acts.length) return { opp, mine, rec: "카드를 냈어요. 상대를 기다려요.", why: "내 카드는 이미 정해졌어요. 공개된 뒤 상대 남은 카드를 다시 세어 봐요." };
    const as = ch.acts.slice().sort((a, b) => b.ev - a.ev), b0 = as[0], b1 = as[1];
    const name = a => `${EM[a.r]} ${RPS[a.r]}${a.s === "B" ? "" : " + " + SPN[a.s]}`;
    let rec = `${name(b0)} (끝까지 이길 가능성 약 ${pc(b0.ev)}%, 이번 라운드 기대 ${b0.pts.toFixed(1)}점)이 가장 좋아 보여요.`;
    if (b1 && b0.ev - b1.ev < 0.03) rec += ` ${name(b1)} 도 거의 같아요 — 상대가 읽지 못하게 섞어 내도 좋아요.`;
    if (left === 1 && (V.sp[me].V || V.sp[me].C)) rec += " 마지막이라 안 쓴 특수 카드는 지금 써야 점수가 돼요.";
    let ex;
    if (left === 1) ex = "마지막 라운드예요. 남겨 둔 빅토리 · 체인지는 점수로 바꿀 마지막 기회라 아껴 두면 낭비예요.";
    else if (S.V && S.C) ex = "상대에게 빅토리가 남아 있으면 내 체인지가 그걸 이겨요. 체인지는 빅토리를 이기지만, 빈 카드 앞에서는 서로의 가위바위보 카드를 바꿀 뿐이에요.";
    else if (!S.V && !S.C) ex = "상대 특수 카드가 없어요. 내 빅토리는 막을 방법이 없고, 체인지는 가위바위보 결과를 뒤집어요.";
    else if (S.V) ex = "상대는 빅토리만 남았어요. 내가 체인지를 갖고 있으면 상대 빅토리를 이길 수 있어요.";
    else ex = "상대는 체인지만 남았어요. 내 빅토리를 내면 체인지를 안 낸 상대를 이기고, 상대 체인지가 나오면 내가 져요.";
    return { opp, mine, rec, why: ex };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const c = (r, s = "B", cls = "") => cardHtml({ r, s }, cls);
    return [
      { tag: "STEP 1 · 목표", title: "5라운드 동안 승점을 더 모아요", body: "한 라운드마다 가위바위보로 겨뤄요. <b>이기면 2점 · 비기면 1점 · 지면 0점</b>이에요. 5라운드가 끝났을 때 승점이 높은 쪽이 이겨요 (같으면 공동 1등).",
        boardHtml: `<div class="br-tut"><div class="row">${c(0)}<span class="br-vs">VS</span>${c(2)}</div><small>가위 → 보를 이겨요 · 이긴 쪽 +2점</small></div>`, ms: 5200 },
      { tag: "STEP 2 · 카드", title: "카드는 9장 (가위바위보 6 + 특수 3)", body: "<b>가위 2 · 바위 2 · 보 2장</b>에 특수 카드 <b>빅토리 1 · 체인지 1 · 빈 카드</b>가 있어요. 빈 카드는 특수 카드를 안 낼 때 쓰고, 여러 번 낼 수 있어요.",
        boardHtml: `<div class="br-tut"><div class="row">${c(0)}${c(1)}${c(2)}</div><div class="row"><span class="br-sb on" style="padding:6px 10px"><b>🏆 빅토리</b></span><span class="br-sb on" style="padding:6px 10px"><b>🔄 체인지</b></span><span class="br-sb" style="padding:6px 10px"><b>▫️ 빈 카드</b></span></div></div>`, ms: 5600 },
      { tag: "STEP 3 · 직접", title: "동시에 내고 한꺼번에 공개!", body: "매 라운드 <b>가위바위보 카드 1장 + 특수 카드 1장</b>을 동시에 숨겨 내고 한꺼번에 열어요. 상대가 <b>가위 + 빈 카드</b>를 냈다고 해 볼게요. 이기는 카드를 눌러 보세요!",
        interactive: { hint: "👆 가위를 이기는 카드를 눌러요", doneText: "✅ 바위가 가위를 이겨요! (+2점)" },
        render(stage, ctrl) {
          let done = false, msg = "";
          const draw = () => {
            stage.innerHTML = `<div class="br-tut"><div class="row"><div>${c(0, "B", done ? "lose" : "")}<small>상대가 낸 카드</small></div><span class="br-vs">VS</span><div>${done ? c(1, "B", "win") : backHtml("내가 낼 카드")}<small>나</small></div></div>
              <div class="br-rps">${[0, 1, 2].map(r => `<button type="button" class="br-rb" data-r="${r}"><span class="e">${EM[r]}</span><b>${RPS[r]}</b></button>`).join("")}</div><div class="msg">${esc(msg)}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-r]"); if (!b || done) return;
            const r = +b.dataset.r;
            if (r === 1) { done = true; msg = "🏆 이겼어요! 바위 > 가위"; ctrl.sfx("win"); draw(); ctrl.complete(); }
            else { msg = r === 0 ? "가위끼리는 비겨요 — 다시!" : "보는 가위에게 져요 — 다시!"; ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 4 · 특수", title: "빅토리 · 체인지 · 같은 특수 카드", body: "<b>🏆 빅토리</b>는 가위바위보와 상관없이 이겨요. <b>🔄 체인지</b>는 서로의 가위바위보 카드를 맞바꾼 뒤 겨루고, 상대가 빅토리면 체인지가 이겨요. <b>같은 특수 카드를 둘 다 내면</b> 효과가 사라져 가위바위보만 해요.",
        boardHtml: `<div class="br-tut"><div class="row"><b>🏆 빅토리</b><span>vs</span><b>빈 카드</b><span>→ 빅토리 승</span></div><div class="row"><b>🔄 체인지</b><span>vs</span><b>🏆 빅토리</b><span>→ 체인지 승</span></div><div class="row"><b>🔄 체인지</b><span>vs</span><b>빈 카드</b><span>→ 카드 맞바꾸고 가위바위보</span></div><div class="row"><b>🏆</b><span>vs</span><b>🏆</b><span>→ 효과 없음</span></div></div>`, ms: 7000 },
      { tag: "STEP 5 · 아껴 쓰기", title: "쓴 카드는 다시 못 써요", body: "한 번 낸 가위바위보 카드 · 빅토리 · 체인지는 <b>다시 못 써요</b> (가위바위보 6장 중 <b>5장만</b> 써요). 쓴 카드는 서로 보이니까 상대 <b>남은 카드를 세면</b> 뭘 낼지 읽혀요.",
        boardHtml: `<div class="br-tut"><div class="br-side" style="width:100%"><span class="nm">상대</span><span class="cn">✌️2</span><span class="cn">✊1</span><span class="cn z">🖐️0</span><span class="sp"><i class="z">🏆 빅토리</i><i>🔄 체인지</i></span></div><small>보를 다 썼다면 → 가위는 안전해요</small></div>`, ms: 5600 },
      { tag: "STEP 6 · 끝", title: "막히면 AI 선생님!", body: "승점은 <b>이기면 2 · 비기면 1 · 지면 0</b>이에요. 안 쓴 특수 카드는 마지막 라운드까지 갖고 있어도 점수가 안 돼요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 남은 카드와 추천 카드를 알려 줘요.",
        boardHtml: `<div class="br-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4400 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌1 · 배틀 가위바위보";
  const DIFF = "방송과 다른 점: 팀전이 아니라 1:1이에요 · 승점은 이기면 2점, 비기면 1점, 지면 0점으로 우리가 정했어요 (방송 문서에 점수 기준이 없어요) · 5라운드 뒤 승점이 높은 쪽이 이기고 같으면 공동 1등이에요 · 동시에 숨겨 내서 한 기기로는 못 해요";
  window.SVUI = window.SVUI || {};
  window.SVUI.bloodrps = {
    actText: a => a && a.r != null ? ["가위", "바위", "보"][a.r] + (a.s === "V" ? " + 빅토리" : a.s === "C" ? " + 체인지" : " + 빈 카드") : "—",     // 🎞️ 복기 행동 글
    name: "배틀 가위바위보", emoji: "✌️", short: "특수 카드로 뒤집는 숨겨 내기 가위바위보", min: 2, max: 2, defN: 2, board: false,
    opts: [],
    howto: [
      "<b>목표</b> — 5라운드 동안 승점을 더 모아요 (이기면 2점 · 비기면 1점 · 지면 0점)",
      "<b>카드</b> — 가위 · 바위 · 보 2장씩 + <b>빅토리</b> 1장 + <b>체인지</b> 1장 + 빈 카드(여러 번)",
      "<b>진행</b> — 라운드마다 가위바위보 카드 1장 + 특수 카드 1장을 동시에 숨겨 내고 한꺼번에 공개해요",
      "<b>승패</b> — 보통은 가위바위보 · 한 번 쓴 가위바위보 · 빅토리 · 체인지는 다시 못 써요 (쓴 카드는 서로 보여요)",
      "<b>특수</b> — 빅토리는 무조건 이김 · 체인지는 서로의 가위바위보 카드를 맞바꿈(상대가 빅토리면 체인지가 이김) · 같은 특수 카드끼리는 효과가 사라져요",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${Math.min(V.round, V.R)} / ${V.R} 라운드`),
    chip: (V, i) => ({ t: `${V.pts[i]}점`, on: V.phase === "pick" && V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial,
    qa: (V, me, rnd) => B.ai(V, me, "easy", rnd),
  };
})();

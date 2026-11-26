/* 베니 서바이벌 · 넘버 체인지 — 화면 (블록 고르기 · 히든 찬스 · 블록 교환 · 상대 손 짐작 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const N = window.SVCores.numchange;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.nc-top{display:flex;align-items:center;gap:8px;flex:none}
.nc-sc{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.nc-goal{flex:1;min-width:0;text-align:right;font-size:12px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nc-dots{display:flex;gap:3px;flex:none}
.nc-dots i{flex:1;min-width:0;height:18px;border-radius:6px;display:grid;place-items:center;font:800 10px var(--round);font-style:normal;color:var(--soft);border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2)}
.nc-dots i.w{background:rgba(34,197,94,.3);border-color:#4ade80;color:#dcfce7}.nc-dots i.l{background:rgba(239,68,68,.28);border-color:#f87171;color:#fee2e2}.nc-dots i.t{background:rgba(245,179,1,.2);border-color:#fbbf24;color:#fef3c7}
.nc-dots i.cur{border-color:#fff;box-shadow:0 0 0 1px #fff;color:#fff}
.nc-b{--bc:#7dd3fc;display:inline-grid;place-items:center;width:38px;height:44px;border-radius:9px;border:2px solid rgba(255,255,255,.6);background:var(--bc);color:#0b1220;font:900 21px var(--round);box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),0 3px 6px rgba(0,0,0,.4);padding:0}
.nc-b.v1{--bc:#7dd3fc}.nc-b.v2{--bc:#5eead4}.nc-b.v3{--bc:#86efac}.nc-b.v4{--bc:#fde047}.nc-b.v5{--bc:#fdba74}.nc-b.v6{--bc:#fb923c}.nc-b.v7{--bc:#fb7185}
.nc-b.q{--bc:repeating-linear-gradient(45deg,#7f1d1d 0 5px,#991b1b 5px 10px);color:#fecaca;border-color:#fca5a5}
button.nc-b{cursor:pointer;touch-action:manipulation;transition:transform .08s}
button.nc-b.sel{transform:translateY(-7px);box-shadow:0 0 0 3px #fff,0 8px 12px rgba(0,0,0,.5)}
.nc-opp{display:flex;align-items:center;gap:8px;flex:none;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:12px;padding:5px 8px;min-width:0}
.nc-opp .lb{flex:none;font:800 12px var(--round);line-height:1.25;min-width:54px}
.nc-opp .lb small{display:block;font-weight:700;color:var(--soft);font-size:11px}
.nc-oc{flex:1;min-width:0;display:grid;gap:2px;justify-items:stretch}
.nc-oc b{font:800 11px var(--round);text-align:center;color:var(--soft)}
.nc-oc i{height:10px;border-radius:3px;border:1px dashed rgba(255,255,255,.18);background:none}
.nc-oc i.s{border:1px solid rgba(255,255,255,.55);background:var(--bc)}
.nc-oc i.m{border:1.5px dashed var(--bc);background:none}
.nc-oc.v1{--bc:#7dd3fc}.nc-oc.v2{--bc:#5eead4}.nc-oc.v3{--bc:#86efac}.nc-oc.v4{--bc:#fde047}.nc-oc.v5{--bc:#fdba74}.nc-oc.v6{--bc:#fb923c}.nc-oc.v7{--bc:#fb7185}
.nc-table{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;flex:none}
.nc-slot{display:grid;gap:4px;justify-items:center;min-width:0;padding:6px 4px;border-radius:14px;border:2px solid transparent}
.nc-slot .bl{display:flex;gap:6px;align-items:center;min-height:44px}
.nc-slot .sm{font:900 15px var(--round);color:#fde68a;min-height:20px;white-space:nowrap}
.nc-slot small{font-size:11.5px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.nc-slot.win{border-color:#4ade80;background:rgba(34,197,94,.12);box-shadow:0 0 16px rgba(74,222,128,.35)}
.nc-slot.lose{opacity:.7}
.nc-vs{font:900 15px var(--round);color:#fb7185}
.nc-res{flex:none;text-align:center;border-radius:12px;padding:6px 9px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.nc-res>b{display:block;font:900 15px var(--round);color:#bbf7d0}
.nc-res>span{display:block;font-size:12.5px;color:#d1fae5}.nc-res span b{color:#fff}
.nc-res.bad{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.nc-res.bad>b{color:#fecaca}.nc-res.bad>span{color:#fee2e2}
.nc-res.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.nc-res.mid>b{color:#fde68a}.nc-res.mid>span{color:#fef3c7}
.nc-pick{display:grid;gap:6px;margin-top:auto;flex:none}
.nc-hand{display:grid;grid-template-columns:repeat(7,1fr);gap:5px 4px;justify-items:center;padding-top:7px}
.nc-e{width:38px;height:44px;border-radius:9px;border:1.5px dashed rgba(255,255,255,.14)}
.nc-hid{display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 13px var(--round);cursor:pointer}
.nc-hid.on{border-color:#c4b5fd;background:rgba(124,58,237,.35)}
.nc-hid:disabled{opacity:.35;cursor:default}
.nc-hint{font-size:11.5px;color:#ddd6fe;text-align:center;line-height:1.35}
.nc-pick .btn.big{padding:12px 8px;font-size:15.5px}
.nc-note{flex:none;text-align:center;font-size:13px;color:var(--soft);line-height:1.45;margin-top:auto}
.nc-note b{color:#fde68a}
.nc-tut{display:grid;gap:8px;justify-items:center;width:100%}
.nc-tut .row{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
.nc-tut .nc-hand{width:100%;grid-template-columns:repeat(7,1fr)}
.nc-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.nc-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px}
@media (max-height:760px){.nc-b,.nc-e{width:34px;height:38px;font-size:19px}.nc-slot .bl{min-height:38px}.nc-pick{gap:5px}.nc-pick .btn.big{padding:10px 8px}.nc-hint{display:none}.nc-res>span{font-size:12px}}
@media (max-height:690px){.nc-b,.nc-e{width:32px;height:34px;font-size:18px}.nc-slot .bl{min-height:34px}.nc-slot{padding:3px 4px}.nc-hand{padding-top:5px}.nc-oc i{height:8px}.nc-top{gap:6px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const blk = (v, extra = "") => `<span class="nc-b v${v} ${extra}">${v}</span>`;
  const qblk = () => `<span class="nc-b q">?</span>`;

  let SEL = null;     // 이 기기에서 고르는 중인 블록 [{ v, k }] + 히든 찬스 켬
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.phase}`; if (!SEL || SEL.key !== key) SEL = { key, p: [], h: false }; return SEL; };

  const cols = (cnt, sure, maybe) => {
    let h = "";
    for (let v = 1; v <= N.MAXV; v++) {
      const s = sure ? sure[v] : cnt[v], m = maybe ? maybe[v] : cnt[v];
      h += `<div class="nc-oc v${v}"><b>${v}</b>${[0, 1].map(k => `<i class="${k < s ? "s" : k < m ? "m" : ""}"></i>`).join("")}</div>`;
    }
    return h;
  };
  const oppRow = (V, label, A) => {
    if (V.hands) return `<div class="nc-opp"><div class="lb">${esc(label)}<small>블록 ${V.sizes[A]}개</small></div>${cols(V.hands[A])}</div>`;
    if (V.opp) return `<div class="nc-opp"><div class="lb">${esc(label)}<small>블록 ${V.opp.n}개${V.opp.worlds.length > 1 ? " · 짐작" : ""}</small></div>${cols(null, V.opp.sure, V.opp.maybe)}</div>`;
    return `<div class="nc-opp"><div class="lb">${esc(label)}<small>블록 ${V.sizes[A]}개</small></div></div>`;
  };
  const pairHtml = (P, hidden) => P ? `${blk(P[0])}${blk(P[1])}` : hidden ? `${qblk()}${qblk()}` : "";
  const curRound = V => (V.phase === "pick" ? V.round + 1 : V.round);
  const roundLabel = V => { const c = curRound(V); return c > V.R ? "연장전" : `${c} / ${V.R} 라운드`; };

  function exchHtml(R, A, O, spec, nm) {
    const lab = i => (spec ? nm(i) : i === A ? "나" : nm(i));
    if (!R.h[0] && !R.h[1]) return `큰 블록을 바꿨어요 · ${esc(lab(A))}의 <b>${R.give[A]}</b> → ${esc(lab(O))}, ${esc(lab(O))}의 <b>${R.give[O]}</b> → ${esc(lab(A))} · 작은 블록 ${R.drop[A]} · ${R.drop[O]}${ja(R.drop[O],"은")} 딜러가 가져가요`;
    const who = [0, 1].filter(s => R.h[s]).map(s => lab(s)).join(" · ");
    return `🎭 ${esc(who)}의 히든 찬스 — 합과 낸 블록은 비공개예요 · ` + (R.give[A] != null ? `내가 준 블록 <b>${R.give[A]}</b> · 받은 블록 <b>${R.give[O]}</b>` : "블록이 오갔어요");
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const A = spec ? 0 : me, O = 1 - A, nm = i => nameOf(ctx, i), show = V.phase === "show" || V.phase === "end", R = V.res;
    const myLab = spec ? esc(nm(A)) : "나";
    let h = `<div class="nc-top"><span class="nc-sc">${myLab} ${V.score[A]} : ${V.score[O]} ${esc(nm(O))}</span><span class="nc-goal">${spec ? "👀 구경 중 · " : ""}🎯 ${V.winAt}점 먼저${curRound(V) > V.R ? " · 연장전" : ""}</span></div>`;
    let dots = "";
    const total = Math.max(V.R, V.hist.length);
    for (let i = 0; i < total; i++) {
      const r = V.hist[i];
      dots += r ? `<i class="${r.w < 0 ? "t" : r.w === A ? "w" : "l"}${show && i === V.hist.length - 1 && !V.over ? " cur" : ""}" title="${i + 1}라운드">${i + 1}</i>` : `<i class="${i + 1 === curRound(V) && !V.over ? "cur" : ""}">${i + 1}</i>`;
    }
    h += `<div class="nc-dots">${dots}</div>`;
    h += oppRow(V, nm(O), O);
    if (spec) h += oppRow(V, nm(A), A);
    // 가운데 판
    let oc, mc, ocls = "", mcls = "";
    if (show && R) {
      const sm = s => (R.S[s] != null ? `합 ${R.S[s]}` : "🎭 합 비공개");
      ocls = R.w === O ? " win" : R.w === A ? " lose" : ""; mcls = R.w === A ? " win" : R.w === O ? " lose" : "";
      oc = `<div class="bl">${pairHtml(R.P[O], true)}</div><div class="sm">${sm(O)}</div>`; mc = `<div class="bl">${pairHtml(R.P[A], true)}</div><div class="sm">${sm(A)}</div>`;
    } else {
      const sel = spec ? null : selFor(V, ctx), subs = V.subs;
      oc = subs && subs[O] ? `<div class="bl">${pairHtml([Math.max(subs[O].a, subs[O].b), Math.min(subs[O].a, subs[O].b)])}</div><div class="sm">합 ${subs[O].a + subs[O].b}${subs[O].h ? " 🎭" : ""}</div>` : `<div class="bl">${V.submitted[O] ? `${qblk()}${qblk()}` : ""}</div><div class="sm">${V.submitted[O] ? "🔒 냈어요" : "고민 중…"}</div>`;
      if (V.mine) mc = `<div class="bl">${pairHtml([Math.max(V.mine.a, V.mine.b), Math.min(V.mine.a, V.mine.b)])}</div><div class="sm">합 ${V.mine.a + V.mine.b}${V.mine.h ? " 🎭" : ""} · 🔒</div>`;
      else if (subs && subs[A]) mc = `<div class="bl">${pairHtml([Math.max(subs[A].a, subs[A].b), Math.min(subs[A].a, subs[A].b)])}</div><div class="sm">합 ${subs[A].a + subs[A].b}${subs[A].h ? " 🎭" : ""}</div>`;
      else if (sel && sel.p.length) mc = `<div class="bl">${sel.p.map(x => blk(x.v)).join("")}${sel.p.length < 2 ? `<span class="nc-e"></span>` : ""}</div><div class="sm">${sel.p.length === 2 ? `합 ${sel.p[0].v + sel.p[1].v}` : "하나 더 골라요"}</div>`;
      else mc = `<div class="bl"><span class="nc-e"></span><span class="nc-e"></span></div><div class="sm">${spec ? (V.submitted[A] ? "🔒 냈어요" : "고민 중…") : "블록 두 개를 골라요"}</div>`;
    }
    h += `<div class="nc-table"><div class="nc-slot${ocls}">${oc}<small>${esc(nm(O))}</small></div><span class="nc-vs">VS</span><div class="nc-slot${mcls}">${mc}<small>${myLab}</small></div></div>`;
    if (show && R) {
      const cls = R.w < 0 ? "mid" : spec || R.w === A ? "" : "bad";
      const head = R.w < 0 ? "🤝 합이 같아요 · 득점 없음" : spec ? `🏆 ${esc(nm(R.w))} +1점` : R.w === A ? "🏆 이겼어요 · +1점" : "😵 졌어요 · 상대 +1점";
      h += `<div class="nc-res ${cls}"><b>${head}</b><span>${exchHtml(R, A, O, spec, nm)}</span></div>`;
    }
    // 아래 칸
    if (!show && !spec && ctx.canAct) {
      const sel = selFor(V, ctx), H = V.hand;
      let grid = "";
      for (let k = 0; k < 2; k++) for (let v = 1; v <= N.MAXV; v++) grid += H[v] > k ? `<button type="button" class="nc-b v${v}${sel.p.some(x => x.v === v && x.k === k) ? " sel" : ""}" data-v="${v}" data-k="${k}" aria-label="블록 ${v}">${v}</button>` : `<span class="nc-e"></span>`;
      const two = sel.p.length === 2;
      h += `<div class="nc-pick"><div class="nc-hand">${grid}</div>
        <button type="button" class="nc-hid${sel.h ? " on" : ""}" data-a="hid" ${V.hid[me] ? "disabled" : ""}>${V.hid[me] ? "🎭 히든 찬스는 이미 썼어요" : sel.h ? "🎭 히든 찬스 켜짐 (누르면 꺼요)" : "🎭 히든 찬스 쓰기 (한 번뿐)"}</button>
        ${sel.h ? `<div class="nc-hint">합 · 낸 블록이 상대에게 안 보여요. 대신 상대가 낸 두 블록 중 하나를 무작위로 받아요.</div>` : ""}
        <button class="btn primary big" data-a="submit" ${two ? "" : "disabled"}>${two ? `🔒 ${sel.p[0].v} + ${sel.p[1].v} = ${sel.p[0].v + sel.p[1].v} 내기${sel.h ? " (히든)" : ""}` : "블록 두 개를 골라요"}</button></div>`;
    } else if (!show && !spec && V.mine) h += `<div class="nc-note">🔒 블록을 냈어요 · <b>${esc(nm(O))}</b>${ja(esc(nm(O)),"이")} 낼 때까지 기다려요…</div>`;
    else if (!show) h += `<div class="nc-note">${spec ? "두 사람이 동시에 블록 두 개를 숨겨 내요" : "잠시만요…"}</div>`;
    else if (V.over) h += `<div class="nc-note">게임이 끝났어요 · <b>${V.score[A]} : ${V.score[O]}</b></div>`;
    else h += `<div class="nc-note">잠시 뒤 다음 라운드가 시작돼요…</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const sel = selFor(V, ctx);
      if (t.dataset.v) {
        const v = +t.dataset.v, k = +t.dataset.k, at = sel.p.findIndex(x => x.v === v && x.k === k);
        if (at >= 0) sel.p.splice(at, 1); else { if (sel.p.length >= 2) sel.p.shift(); sel.p.push({ v, k }); }
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.a === "hid") { sel.h = !sel.h; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "submit" && sel.p.length === 2) { ctx.sfx("pop"); ctx.act({ a: sel.p[0].v, b: sel.p[1].v, h: sel.h }); }
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const A = me >= 0 ? me : 0, O = 1 - A, who = me >= 0 ? ["나", "상대"] : ["1번", "2번"];
    const side = (r, s) => (r.P[s] ? `${r.P[s][0]}+${r.P[s][1]}=${r.S[s]}` : "🎭 비공개");
    const rows = V.hist.map(r => `<div>${r.r}라운드 · ${who[0]} ${side(r, A)} vs ${who[1]} ${side(r, O)} → <b>${r.w < 0 ? "무득점" : r.w === A ? "승 +1" : "패"}</b></div>`).join("");
    return `<div>점수 ${who[0]} <b>${V.score[A]}</b> : <b>${V.score[O]}</b> ${who[1]}${V.score[0] === V.score[1] ? " (공동 1등)" : ""}</div>${rows}`;
  }

  // ── AI 선생님 (보이는 것만) ──
  const pc = x => Math.round(x * 100);
  const handTxt = c => { const a = []; for (let v = N.MAXV; v >= 1; v--) if (c[v] > 0) a.push(c[v] > 1 ? `${v}×${c[v]}` : `${v}`); return a.join(" · ") || "없음"; };
  const KEY = "큰 합을 내면 큰 블록이 상대에게 넘어간다";
  function coach(V, me, since, names) {
    const o = 1 - me, on = esc((names && names[o]) || "상대"), cur = curRound(V), rl = cur > V.R ? "연장전" : `${cur}/${V.R}라운드`;
    const O = V.opp;
    const sc = `점수 나 ${V.score[me]} : ${V.score[o]} ${on} (${V.winAt}점 먼저 · ${V.over ? "끝" : rl})`;
    if (V.over) return { opp: `${on}의 블록은 ${O ? O.n : V.sizes[o]}개 남았어요.`, mine: `${sc}.`, rec: "게임이 끝났어요. 결과를 확인해요.", why: `${KEY}는 점이 이 게임의 핵심이에요. 다음 판엔 큰 블록을 언제 쓸지 생각해 봐요.` };
    let opp = `${on}${ja(on,"은")} 블록 ${O.n}개를 갖고 있어요. `;
    if (O.worlds.length === 1) opp += `손이 다 보여요: ${handTxt(O.worlds[0])}. `;
    else opp += `히든 찬스 때문에 정확히는 몰라요 (확실한 블록 ${O.sure.reduce((a, b) => a + b, 0)}개 + 가능한 손 ${O.worlds.length}가지). `;
    const dist = N.oppDist(V), sums = dist.map(d => d.P[0] + d.P[1]);
    if (sums.length) opp += `낼 수 있는 합은 ${Math.min(...sums)} ~ ${Math.max(...sums)}예요. `;
    if (V.style && V.style.n >= 3) opp += V.style.aggr >= 0.65 ? "지금까지 합이 높은 쪽을 자주 냈어요. " : V.style.aggr <= 0.35 ? "지금까지 낮은 합을 자주 냈어요 (큰 블록을 아끼는 편). " : "";
    opp += V.hid[o] ? "히든 찬스는 이미 썼어요." : "히든 찬스는 아직 안 썼어요 (쓰면 합이 숨겨져요).";
    const mine = `${sc}. 내 블록 ${V.sizes[me]}개: ${V.hand ? handTxt(V.hand) : ""}. ${V.hid[me] ? "히든 찬스는 썼어요." : "히든 찬스가 아직 남았어요."}`;
    if (V.phase === "show") return { opp, mine, rec: "공개한 블록을 확인해요. 곧 다음 라운드가 시작돼요.", why: `${KEY}는 점이 핵심이에요. 방금 오간 블록으로 서로의 손이 어떻게 바뀌었는지 다시 확인해요.` };
    if (V.submitted[me]) return { opp, mine, rec: "블록을 냈어요. 상대를 기다려요.", why: `${KEY}는 점이 핵심이에요. 공개된 뒤 오간 블록으로 내 손도 바뀌어요.` };
    const ch = N.chances(V, me), b = ch.best;
    if (!b) return { opp, mine, rec: "낼 수 있는 블록이 없어요.", why: `${KEY}는 점이 핵심이에요.` };
    let rec = `가장 좋아 보이는 선택은 ${b.a} + ${b.b} = ${b.a + b.b} 예요 (이길 확률 ${pc(b.pWin)}% · 비길 ${pc(b.pTie)}% · 질 ${pc(b.pLose)}%).`;
    const hi = ch.acts.find(x => x.a + x.b > b.a + b.b && x.pWin - b.pWin >= 0.15);
    if (hi) rec += ` 더 확실히 이기려면 ${hi.a} + ${hi.b} (${pc(hi.pWin)}%)도 있지만 큰 블록 ${hi.a}${ja(hi.a,"을")} 상대에게 넘겨요.`;
    let ex = `${KEY}는 점이 핵심이에요 (대신 상대의 큰 블록이 내게 와요).`;
    if (V.score[me] >= V.winAt - 1) ex += " 한 점만 더 얻으면 이겨요 — 이번 라운드는 꼭 이길 합을 만들어요.";
    else if (V.score[o] >= V.winAt - 1) ex += " 상대가 한 점만 더 얻으면 이겨요 — 이번에 지면 안 돼요.";
    else if (b.pWin >= 0.6) ex += " 이길 만큼만 내고 큰 블록은 아껴요.";
    else if (b.pWin < 0.3) ex += " 이번엔 이기기 어려워요. 작은 블록으로 져 주면 내 손에서 나가는 블록은 작고, 상대의 큰 블록을 받아 와요.";
    else ex += " 합이 비슷하게 맞붙는 라운드라 상대 남은 블록을 세어 합의 범위를 좁혀요.";
    return { opp, mine, rec, why: ex };
  }

  // ── 🎞️ 복기 고리 ──
  // 내 수와 고급 AI 수를 '끝까지 이길 확률'로 견줘요. 계산은 core 의 고급 AI(hardPick)와 같은 방식 — 상대 손은 view.opp.worlds(보이는 것으로 좁힌 가능한 손들),
  // 상대 성향은 view.style(지금까지 낸 합), 그다음 라운드는 가볍게 끝까지 둬 봄. core 가 내보내지 않는 작은 도우미라 아래에 같은 꼴로 둠(core 의 stepSim · simRest 와 맞춰야 함).
  // 이번 라운드 이길 확률은 N.chances(coach 가 쓰는 것) 그대로. 쓰는 것은 그 수를 두기 직전 내 view 뿐이에요 (상대가 낸 블록 · 앞날 오가는 블록은 안 봄).
  const mulb = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function pairAtQ(H, q, r) {
    const ps = N.pairsOf(H).sort((x, y) => (x[0] + x[1]) - (y[0] + y[1]) || x[0] - y[0]);
    return ps[Math.max(0, Math.min(ps.length - 1, Math.round((q + (r() - 0.5) * 0.25) * (ps.length - 1))))];
  }
  function lowWin(H, S1) {
    let win = null, low = null;
    for (const p of N.pairsOf(H)) { const s = p[0] + p[1]; if (!low || s < low[0] + low[1]) low = p; if (s > S1 && (!win || s < win[0] + win[1])) win = p; }
    return win || low;
  }
  function stepSim(H, sc, P0, P1, h0, h1, r) {
    const S0 = P0[0] + P0[1], S1 = P1[0] + P1[1];
    if (S0 > S1) sc[0]++; else if (S1 > S0) sc[1]++;
    N.exchange(H, [P0, P1], [h0, h1], r);
  }
  function simRest(H, sc, k, q, r) {
    while (sc[0] < N.WINPT && sc[1] < N.WINPT && k < N.ROUNDS + 1 && !(k === N.ROUNDS && sc[0] !== sc[1])) {
      const P1 = pairAtQ(H[1], q, r), guess = pairAtQ(H[1], q, r);
      stepSim(H, sc, lowWin(H[0], guess[0] + guess[1]), P1, false, false, r); k++;
    }
    return sc[0] > sc[1] ? 1 : sc[0] < sc[1] ? 0 : 0.5;
  }
  function oppSamples(V, SAMP, base) {
    const Ws = V.opp.worlds, out = [];
    const n0 = V.style ? V.style.n : 0, a = n0 ? V.style.aggr : 0.5, sg = 0.3 / Math.sqrt(n0 + 1) + 0.1;
    const QS = [0, 0.25, 0.5, 0.75, 1], wq = QS.map(q => Math.exp(-((q - a) * (q - a)) / (2 * sg * sg))), wt = wq.reduce((x, y) => x + y, 0);
    for (let s = 0; s < SAMP; s++) {
      const r = mulb(base + s * 977); let x = r() * wt, k = 0; while (k < 4 && (x -= wq[k]) > 0) k++;
      const W = Ws[Math.floor(r() * Ws.length)];
      out.push({ W, q: QS[k], P1: pairAtQ(W, QS[k], r), seed: (r() * 4294967296) >>> 0 });
    }
    return out;
  }
  const sevOf = gap => (gap < 0.05 ? 0 : Math.min(100, Math.round(gap * 300)));        // 모의 대결 승률 20%p 차이 ≈ 60 (📒) — 모의가 낙관적이라 완만하게
  const blkTxt = (P, h) => `${P[0]}+${P[1]}=${P[0] + P[1]}${h ? " (히든)" : ""}`;
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !V.opp || !V.hand || !myA || !bestA || V.phase !== "pick" || !V.needs.includes(seat)) return none;
      const norm = a => (a.a >= a.b ? [a.a, a.b] : [a.b, a.a]);
      const PM = norm(myA), PB = norm(bestA), hM = !!myA.h, hB = !!bestA.h;
      if (!N.pairsOf(V.hand).some(p => p[0] === PM[0] && p[1] === PM[1]) || !N.pairsOf(V.hand).some(p => p[0] === PB[0] && p[1] === PB[1])) return none;
      const my = `블록 ${PM[0]} · ${PM[1]}${hM ? " (히든 찬스)" : ""}`, best = `블록 ${PB[0]} · ${PB[1]}${hB ? " (히든 찬스)" : ""}`;
      const ch = N.chances(V, seat), rd = P => { const x = ch.acts.find(y => y.a === P[0] && y.b === P[1]); return x ? Math.round(x.pWin * 100) : 0; };
      if (PM[0] === PB[0] && PM[1] === PB[1] && hM === hB) return { sev: 0, why: `고급 AI와 같은 블록이에요 (${blkTxt(PM, hM)}) — 이번 라운드 이길 확률 ${rd(PM)}%`, my, best };
      const base = ((((info && info.seed | 0) ^ Math.imul(V.round + 1, 7919) ^ Math.imul(V.score[0] * 8 + V.score[1] + 1, 104729) ^ Math.imul(V.sizes[0] + seat + 5, 31) ^ V.hand.reduce((s, x, i) => s + x * (i + 3) * 101, 0)) >>> 0) * 31) >>> 0;
      const SM = oppSamples(V, 400, base);
      const val = (P, h) => {
        let t = 0;
        for (const sm of SM) { const H = [V.hand.slice(), sm.W.slice()], sc = [V.score[seat], V.score[1 - seat]], r = mulb(sm.seed); stepSim(H, sc, P, sm.P1, h, false, r); t += simRest(H, sc, V.round + 1, sm.q, r); }
        return t / SM.length;
      };
      const vm = val(PM, hM), vb = val(PB, hB), gap = vb - vm, pc = x => Math.round(x * 100);
      let sev = sevOf(gap); if (info && info.same) sev = Math.min(sev, 15);
      const side = (P, h, first) => `${blkTxt(P, h)}: ${first ? "이번 라운드 이길 확률 " : ""}${rd(P)}%, 큰 블록 ${P[0]} 넘김`;
      const gt = gap >= 0.05 ? `끝까지 모의 대결해 보면 고급 AI 수가 ${pc(gap)}%p 앞서요` : gap <= -0.05 ? "끝까지 모의 대결해 보면 내 수가 더 나아요" : "끝까지 모의 대결해 보면 거의 같아요";
      return { sev, my, best, why: `내 ${side(PM, hM, true)} / 고급 AI ${side(PB, hB, false)} — ${gt}` };
    } catch (e) { return none; }
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 블록", title: "1~7 블록 두 세트, 모두 14개", body: "사람마다 <b>1부터 7까지 숫자 블록을 두 세트</b>, 모두 14개를 가지고 시작해요. 상대는 내 블록 중 어떤 걸 쓰는지 몰라요.",
        boardHtml: `<div class="nc-tut"><div class="row">${[1, 2, 3, 4, 5, 6, 7].map(v => blk(v)).join("")}</div><div class="row">${[1, 2, 3, 4, 5, 6, 7].map(v => blk(v)).join("")}</div></div>`, ms: 5200 },
      { tag: "STEP 2 · 한 라운드", title: "두 블록을 숨겨 내고, 합이 큰 쪽이 1점", body: "한 라운드에 <b>블록 두 개를 동시에 숨겨 내고</b> 한꺼번에 열어요. <b>두 수의 합이 큰 쪽이 1점</b>, 합이 같으면 아무도 점수를 못 얻어요.",
        boardHtml: `<div class="nc-tut"><div class="row"><div class="nc-slot win"><div class="bl">${blk(7)}${blk(4)}</div><div class="sm">합 11</div></div><span class="nc-vs">VS</span><div class="nc-slot"><div class="bl">${blk(5)}${blk(5)}</div><div class="sm">합 10</div></div></div><small>합 11 > 10 → 왼쪽이 1점</small></div>`, ms: 5200 },
      { tag: "STEP 3 · 직접", title: "합이 9보다 크게 내 봐요", body: "상대가 <b>합 9</b>를 냈다고 해 볼게요. 블록 두 개를 눌러 <b>합이 9보다 크게</b> 만들면 이겨요!",
        interactive: { hint: "👆 블록 두 개를 골라 합 10 이상으로", doneText: "✅ 합이 더 크면 1점! (큰 블록은 상대에게 넘어가요)" },
        render(stage, ctrl) {
          let sel = [], done = false, msg = "";
          const draw = () => {
            const sum = sel.reduce((a, v) => a + v, 0);
            stage.innerHTML = `<div class="nc-tut"><div class="row"><div class="nc-slot"><div class="bl">${blk(5)}${blk(4)}</div><div class="sm">상대 합 9</div></div><span class="nc-vs">VS</span><div class="nc-slot${done ? " win" : ""}"><div class="bl">${sel.map(v => blk(v)).join("")}${sel.length < 2 ? `<span class="nc-e"></span>` : ""}${sel.length < 1 ? `<span class="nc-e"></span>` : ""}</div><div class="sm">${sel.length === 2 ? "합 " + sum : "내 블록"}</div></div></div>
              <div class="nc-hand">${[1, 2, 3, 4, 5, 6, 7].map(v => `<button type="button" class="nc-b v${v}${sel.includes(v) ? " sel" : ""}" data-v="${v}">${v}</button>`).join("")}</div><div class="msg">${esc(msg)}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b || done) return;
            const v = +b.dataset.v;
            if (sel.includes(v)) { sel = sel.filter(x => x !== v); msg = ""; ctrl.sfx("tap"); draw(); return; }
            sel.push(v);
            if (sel.length < 2) { msg = ""; ctrl.sfx("tap"); draw(); return; }
            if (sel[0] + sel[1] > 9) { done = true; msg = `🏆 합 ${sel[0] + sel[1]} > 9 · 이겼어요!`; ctrl.sfx("win"); draw(); ctrl.complete(); }
            else { msg = `합 ${sel[0] + sel[1]} … 9보다 커야 해요. 다시 골라요!`; sel = []; ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 4 · 교환", title: "큰 블록은 서로 바꾸고, 작은 블록은 사라져요", body: "라운드가 끝나면 낸 두 블록 중 <b>큰 블록끼리 서로 맞바꾸고</b>, 작은 블록은 <b>딜러가 가져가요</b>. 그래서 블록이 매 라운드 1개씩 줄어 14 → 2개가 돼요. <b>큰 합을 내면 큰 블록이 상대에게 넘어가요!</b>",
        boardHtml: `<div class="nc-tut"><div class="row"><div class="nc-slot"><div class="bl">${blk(7)}${blk(3)}</div><small>나</small></div><span class="nc-vs">⇄</span><div class="nc-slot"><div class="bl">${blk(6)}${blk(2)}</div><small>상대</small></div></div><small>7 ↔ 6 서로 바뀜 · 작은 블록 3 · 2는 딜러에게</small></div>`, ms: 6200 },
      { tag: "STEP 5 · 히든 찬스", title: "한 번만, 합을 숨겨요", body: "게임 중 <b>한 번</b> 히든 찬스를 쓸 수 있어요. 쓰면 그 라운드의 <b>내 합 · 낸 블록이 상대에게 안 보이고</b> 승패만 알려져요. 대신 상대는 자기가 낸 블록 <b>중 하나를 무작위로</b> 나와 바꿔요.",
        boardHtml: `<div class="nc-tut"><div class="row"><div class="nc-slot"><div class="bl">${qblk()}${qblk()}</div><div class="sm">🎭 합 비공개</div></div></div><small>상대에게는 승패만 보여요</small></div>`, ms: 5600 },
      { tag: "STEP 6 · 끝", title: "7점 먼저 · 12라운드", body: "<b>7점을 먼저</b> 얻으면 바로 이겨요. 12라운드가 끝나면 점수가 높은 쪽이 이기고, 같으면 남은 블록 2개로 <b>연장 1판</b>이에요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 상대 손 짐작과 이길 확률을 알려 줘요.",
        boardHtml: `<div class="nc-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4800 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌2 · 넘버 체인지";
  const DIFF = "방송과 다른 점: 팀전이 아니라 1:1이에요 · 서로 바꾸는 블록은 '낸 두 블록 중 큰 블록'으로 우리가 정했어요 (방송 문서에 어느 블록인지 없어요) · 히든 찬스를 둘 다 같은 라운드에 쓰면 둘 다 무작위로 한 장씩 넘겨요 · 히든 찬스 뒤 상대 손은 '가능한 경우'로 보여 줘요 · 동시에 숨겨 내서 한 기기로는 못 해요";
  window.SVUI = window.SVUI || {};
  window.SVUI.numchange = {
    actText: a => a && a.a != null ? `블록 ${a.a} · ${a.b}${a.h ? " (히든 찬스)" : ""}` : "—",                                                   // 🎞️ 복기 행동 글
    name: "넘버 체인지", emoji: "🔢", short: "합이 큰 쪽이 점수, 큰 블록은 서로 바뀌어요", min: 2, max: 2, defN: 2, board: false,
    opts: [],
    howto: [
      "<b>목표</b> — 7점을 먼저 얻으면 바로 승 · 12라운드가 끝나면 점수가 높은 쪽 (같으면 남은 블록 2개로 연장 1판)",
      "<b>블록</b> — 사람마다 1~7 블록 2세트, 모두 14개",
      "<b>진행</b> — 라운드마다 블록 두 개를 동시에 숨겨 내고 한꺼번에 공개 · 두 수의 합이 큰 쪽이 1점 (같으면 득점 없음)",
      "<b>교환</b> — 낸 두 블록 중 큰 블록끼리 서로 바꾸고, 작은 블록은 딜러가 가져가요 (블록이 매 라운드 1개씩 줄어요)",
      "<b>히든 찬스</b> — 게임 중 한 번, 그 라운드의 내 합 · 낸 블록을 비공개로 해요 (승패만 공개). 대신 상대는 낸 두 블록 중 하나를 무작위로 골라 나와 바꿔요",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : roundLabel(V)),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.phase === "pick" && V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review,
    qa: (V, me, rnd) => N.ai(V, me, "easy", rnd),
  };
})();

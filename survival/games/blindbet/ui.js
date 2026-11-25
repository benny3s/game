/* 베니 서바이벌 · 블라인드 베팅 — 화면 (상대 블라인드만 보임 · 베팅 · 오픈 카드 · 나온 카드 기록 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const BB = window.SVCores.blindbet;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const range = n => Array.from({ length: n }, (_, k) => k + 1);
  const CSS = `
.bb-top{display:flex;align-items:center;gap:8px;flex:none}
.bb-pot{font:900 16px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap}
.bb-pot small{font-weight:700;color:var(--soft);font-size:11.5px}
.bb-meta{flex:1;min-width:0;text-align:right;font-size:12px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-spec{flex:none;text-align:center;font:800 12.5px var(--round);color:#bfdbfe;background:rgba(59,130,246,.16);border:1px solid rgba(96,165,250,.5);border-radius:10px;padding:3px 8px}
.bb-table{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:start;flex:none}
.bb-col{display:grid;gap:3px;justify-items:center;min-width:0;padding:5px 3px 4px;border-radius:14px;border:2px solid transparent}
.bb-col.win{border-color:#4ade80;background:rgba(34,197,94,.12);box-shadow:0 0 14px rgba(74,222,128,.3)}
.bb-col.lose{opacity:.72}
.bb-col .lb{font:800 12px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.bb-col .lb b{color:#fff}
.bb-eq{display:flex;align-items:center;gap:3px}
.bb-eq .pl{font:900 15px var(--round);color:var(--soft)}
.bb-col .sm{font:900 15px var(--round);color:#fde68a;min-height:20px;white-space:nowrap}
.bb-vs{font:900 15px var(--round);color:#fb7185;align-self:center}
.bb-c{position:relative;display:grid;place-items:center;border-radius:10px;background:#f8fafc;color:#0f172a;font:900 30px/1 var(--round);border:3px solid #e11d48;box-shadow:0 4px 10px rgba(0,0,0,.45)}
.bb-c.bl{width:58px;height:74px}
.bb-c.op{width:44px;height:58px;font-size:23px;border-color:#6d28d9}
.bb-c.big{border-color:#f5b301;box-shadow:0 0 0 2px rgba(245,179,1,.35),0 4px 10px rgba(0,0,0,.45)}
.bb-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 6px,#991b1b 6px 12px);border-color:#fca5a5;color:#fecaca}
.bb-c.opb{background:repeating-linear-gradient(45deg,#312e81 0 6px,#3730a3 6px 12px);border-color:#a5b4fc;color:#e0e7ff}
.bb-c.empty{background:none;border:2px dashed rgba(255,255,255,.2);box-shadow:none;color:transparent}
.bb-c.pre{border-style:dashed;opacity:.9}
.bb-c.lo::after{content:"⚡";position:absolute;right:-7px;top:-8px;font-size:14px}
.bb-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.bb-info b{color:#fde68a}
.bb-strip{display:flex;align-items:center;gap:2px;flex:none}
.bb-strip .lb{flex:none;width:30px;font:800 11px var(--round);color:var(--soft)}
.bb-strip i{flex:1;min-width:0;height:20px;border-radius:5px;display:grid;place-items:center;font:800 11px var(--round);font-style:normal;color:#e0e7ff;background:rgba(99,102,241,.3);border:1px solid rgba(165,180,252,.5)}
.bb-strip i.z{opacity:.22;text-decoration:line-through}
.bb-strip i.lo{border-color:#fbbf24}
.bb-seen{flex:none;display:grid;gap:2px}
.bb-seen .lb{font:800 11px var(--round);color:var(--soft)}
.bb-seen .lb small{font-weight:600}
.bb-seen .g{display:grid;grid-template-columns:repeat(12,1fr);gap:2px}
.bb-seen .g span{display:grid;justify-items:center;border-radius:5px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);padding:1px 0;line-height:1.1}
.bb-seen .g b{font:800 11px var(--round);color:#fff}
.bb-seen .g i{font-style:normal;font-size:7px;letter-spacing:0;color:#fde68a;height:9px}
.bb-seen .g span.z{opacity:.3}
.bb-seen .g span.now{border-color:#fb7185;background:rgba(251,113,133,.2)}
.bb-seen .g span.big b{color:#fca5a5}
.bb-res{flex:none;text-align:center;border-radius:12px;padding:6px 9px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.bb-res>b{display:block;font:900 15px var(--round);color:#bbf7d0}
.bb-res>span{display:block;font-size:12.5px;color:#d1fae5}
.bb-res.bad{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.bb-res.bad>b{color:#fecaca}.bb-res.bad>span{color:#fee2e2}
.bb-res.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.bb-res.mid>b{color:#fde68a}.bb-res.mid>span{color:#fef3c7}
.bb-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.bb-btns{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.bb-btns .btn{padding:11px 8px;font-size:15px}
.bb-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.bb-raise{display:flex;gap:5px;align-items:center;justify-content:center;flex-wrap:nowrap}
.bb-raise button{min-width:38px;height:32px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 10px;white-space:nowrap}
.bb-raise button:disabled{opacity:.3}
.bb-raise .to{min-width:52px;text-align:center;font:900 19px var(--round);color:#fde68a}
.bb-opens{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.bb-ob{position:relative;height:42px;border-radius:11px;border:2px solid rgba(165,180,252,.6);background:rgba(99,102,241,.28);color:#fff;font:900 19px var(--round);cursor:pointer;touch-action:manipulation}
.bb-ob.on{border-color:#fde68a;background:rgba(245,179,1,.3);box-shadow:0 0 0 2px rgba(253,230,138,.35);transform:translateY(-2px)}
.bb-ob.lo::after{content:"⚡";position:absolute;right:-3px;top:-8px;font-size:12px}
.bb-acts .btn.big{padding:12px 8px;font-size:15.5px}
.bb-note{text-align:center;font-size:13px;color:var(--soft);line-height:1.45}
.bb-note b{color:#fde68a}
.bb-tut{display:grid;gap:8px;justify-items:center;width:100%}
.bb-tut .row{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
.bb-tut .bb-opens{width:100%}
.bb-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.bb-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px}
@media (max-height:760px){.bb-c.bl{width:50px;height:62px;font-size:26px}.bb-c.op{width:38px;height:50px;font-size:20px}.bb-ob{height:36px}.bb-res>span{font-size:12px}.bb-btns .btn{padding:9px 8px}.bb-acts{gap:5px}}
@media (max-height:690px){.bb-c.bl{width:44px;height:54px;font-size:23px}.bb-c.op{width:34px;height:44px;font-size:18px}.bb-ob{height:32px;font-size:17px}.bb-col{padding:3px 2px}.bb-strip i{height:17px}.bb-raise button{height:28px}.bb-btns .btn{padding:7px 8px}.bb-acts .btn.big{padding:8px}.bb-info{font-size:11.5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const bc = v => `<div class="bb-c bl${v >= BB.BIGB ? " big" : ""}">${v}</div>`;
  const bcBack = () => `<div class="bb-c bl back">?</div>`;
  const oc = (v, extra = "") => `<div class="bb-c op${v <= BB.LOWOPEN ? " lo" : ""} ${extra}">${v}</div>`;

  let RS = null, SEL = null;
  const raiseState = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.tno}|${V.cur}`; if (!RS || RS.key !== key) RS = { key, to: Math.min(V.cap, V.cur + 1) }; return RS; };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.tno}`; if (!SEL || SEL.key !== key) SEL = { key, v: null }; return SEL; };

  function resBlock(R, A, spec, nm) {
    const lab = i => (spec ? esc(nm(i)) : i === A ? "나" : esc(nm(i)));
    let cls = "", head, sub;
    if (R.fold) {
      const wi = R.w, fi = R.folder;
      cls = spec || wi === A ? "" : "bad";
      head = spec ? `🏳️ ${lab(fi)} 폴드 → ${lab(wi)} 판돈 ${R.gain}칩` : wi === A ? `🏆 상대가 폴드! 판돈 ${R.gain}칩을 가져가요` : `🏳️ 내가 폴드 · 상대가 판돈 ${R.gain}칩을 가져가요`;
      sub = `블라인드 ${lab(0)} <b>${R.blind[0]}</b> · ${lab(1)} <b>${R.blind[1]}</b>` + (R.bonus ? ` · 💥 폴드한 쪽 블라인드가 ${BB.BIGB} 이상이라 칩 ${R.bonus}개를 더 내요` : "");
    } else if (R.w < 0) {
      cls = "mid"; head = "🤝 합도 오픈 카드도 같아요";
      sub = `판돈 ${R.carried}칩은 다음 턴으로 넘어가요 · ${lab(0)} ${R.blind[0]}+${R.open[0]}=${R.sums[0]} · ${lab(1)} ${R.blind[1]}+${R.open[1]}=${R.sums[1]}`;
    } else {
      cls = spec || R.w === A ? "" : "bad";
      head = spec ? `🏆 ${lab(R.w)} 승 · 판돈 ${R.gain}칩` : R.w === A ? `🏆 이겼어요 · 판돈 ${R.gain}칩` : `😵 졌어요 · 상대가 판돈 ${R.gain}칩`;
      sub = `${lab(0)} ${R.blind[0]}+${R.open[0]}=<b>${R.sums[0]}</b> vs ${lab(1)} ${R.blind[1]}+${R.open[1]}=<b>${R.sums[1]}</b>` + (R.sums[0] === R.sums[1] ? " · 합이 같아서 오픈 카드가 큰 쪽 승" : "") + (R.bonus ? ` · ⚡ 오픈 ${R.open[R.w]} 로 이겨서 칩 ${R.bonus}개를 더 가져가요` : "");
    }
    return `<div class="bb-res ${cls}"><b>${head}</b><span>${sub}</span></div>`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const A = spec ? 0 : me, O = 1 - A, nm = i => nameOf(ctx, i), myLab = spec ? esc(nm(A)) : "나";
    const R = V.res, reveal = (V.phase === "show" || V.phase === "end") && !!R;
    const potTxt = reveal ? (R.w >= 0 || R.fold ? R.gain : R.carried || 0) : V.pot;
    let h = `<div class="bb-top"><span class="bb-pot">🪙 ${reveal ? (R.w < 0 && !R.fold ? "이월" : "판돈") : "판돈"} ${potTxt}${!reveal && V.carry > 0 ? ` <small>(이월 ${V.carry} 포함)</small>` : ""}</span><span class="bb-meta">${V.phase === "bet" ? `${V.first === A ? myLab : esc(nm(V.first))} 먼저 베팅` : `칩 ${myLab} ${V.chips[A]} : ${V.chips[O]} ${esc(nm(O))}`}</span></div>`;
    if (spec) h += `<div class="bb-spec">👀 구경 중 — 두 블라인드가 다 보여요</div>`;
    // 판: 블라인드 + 오픈 = 합
    const col = s => {
      const lab = s === A ? (spec ? `<b>${myLab}</b> 블라인드` : `<b>내</b> 블라인드${reveal ? "" : " (안 보임)"}`) : (spec ? `<b>${esc(nm(s))}</b> 블라인드` : `<b>${esc(nm(s))}</b> 블라인드${reveal ? "" : " (보임)"}`);
      let blind, open, sum = "", cls = "";
      if (reveal) {
        blind = bc(R.blind[s]);
        open = R.fold ? `<div class="bb-c op empty">·</div>` : oc(R.open[s]);
        sum = R.fold ? (R.folder === s ? "🏳️ 폴드" : "") : `= ${R.sums[s]}`;
        cls = R.w === s ? " win" : R.w === 1 - s ? " lose" : "";
      } else {
        blind = V.blind[s] != null ? bc(V.blind[s]) : bcBack();
        const sel = !spec && s === A ? selFor(V, ctx) : null;
        if (V.picks && V.picks[s] != null) open = oc(V.picks[s], "pre");
        else if (s === A && !spec && V.mine != null) open = oc(V.mine, "pre");
        else if (V.picked[s]) open = `<div class="bb-c op opb">🔒</div>`;
        else if (sel && sel.v != null && V.phase === "pick") open = oc(sel.v, "pre");
        else open = `<div class="bb-c op empty">·</div>`;
        sum = V.phase === "pick" ? (V.picked[s] ? "🔒 냈어요" : "") : "";
      }
      return `<div class="bb-col${cls}"><div class="lb">${lab}</div><div class="bb-eq">${blind}<span class="pl">+</span>${open}</div><div class="sm">${sum}</div></div>`;
    };
    h += `<div class="bb-table">${col(O)}<span class="bb-vs">VS</span>${col(A)}</div>`;
    if (reveal) h += resBlock(R, A, spec, nm);
    else h += `<div class="bb-info">${V.phase === "bet" ? `건 칩 ${myLab} <b>${V.bet[A]}</b> · ${esc(nm(O))} <b>${V.bet[O]}</b> · 이 턴 최대 ${V.cap}칩 · 레이즈 ${V.raises}/${V.maxRaise}` : V.phase === "pick" ? `둘 다 <b>${V.cur}칩</b>씩 걸었어요 · 오픈 카드를 한 장씩 동시에 내요` : ""}</div>`;
    // 오픈 카드 · 나온 블라인드
    const picking = !spec && !reveal && V.phase === "pick" && ctx.canAct;
    const strip = (s, label) => `<div class="bb-strip"><span class="lb">${label}</span>${range(BB.OPENN).map(v => `<i class="${V.left[s].includes(v) ? "" : "z"}${v <= BB.LOWOPEN ? " lo" : ""}" title="${V.left[s].includes(v) ? "남음" : "썼어요"}">${v}</i>`).join("")}</div>`;
    h += strip(O, spec ? esc(String(nm(O)).slice(0, 3)) : "상대");
    if (!picking) h += strip(A, spec ? esc(String(nm(A)).slice(0, 3)) : "나");
    const used = Array(BB.BMAX + 1).fill(0); V.seen.forEach(v => { used[v]++; });
    const vis = !reveal && !V.over ? V.blind.filter(x => x != null) : [];
    const rem = v => Math.max(0, 2 - used[v] - vis.filter(x => x === v).length);
    h += `<div class="bb-seen"><div class="lb">남은 블라인드 카드 <small>(1~12 두 장씩${spec || reveal || V.over ? "" : " · 상대 것은 뺐어요"})</small></div><div class="g">${range(BB.BMAX).map(v => `<span class="${rem(v) <= 0 ? "z" : ""}${vis.includes(v) ? " now" : ""}${v >= BB.BIGB ? " big" : ""}" title="${v} 남은 ${rem(v)}장"><b>${v}</b><i>${"●".repeat(rem(v))}</i></span>`).join("")}</div></div>`;
    // 아래 행동 칸
    let acts = "";
    if (reveal) acts = V.over ? `<div class="bb-note">게임이 끝났어요 · 칩 <b>${V.chips[A]} : ${V.chips[O]}</b></div>` : `<div class="bb-note">잠시 뒤 다음 턴이 시작돼요…</div>`;
    else if (!spec && V.phase === "bet" && ctx.canAct) {
      const toCall = V.cur - V.bet[me], RSt = raiseState(V, ctx), canRaise = V.raises < V.maxRaise && V.cap > V.cur;
      acts = `<div class="bb-btns"><button class="btn primary" data-a="call">${toCall > 0 ? `콜 ${toCall}칩` : "체크 (콜)"}</button>${toCall > 0 ? `<button class="btn fold" data-a="fold" title="내 블라인드가 ${BB.BIGB} 이상이면 칩 ${BB.EXTRA}개를 더 내요">폴드 ⚠️</button>` : `<button class="btn" disabled>폴드 불가</button>`}</div>
        ${canRaise ? `<div class="bb-raise"><button data-r="-1" ${RSt.to <= V.cur + 1 ? "disabled" : ""}>−</button><span class="to">${RSt.to}칩</span><button data-r="1" ${RSt.to >= V.cap ? "disabled" : ""}>+1</button><button data-r="3" ${RSt.to >= V.cap ? "disabled" : ""}>+3</button><button data-r="max" ${RSt.to >= V.cap ? "disabled" : ""}>최대 ${V.cap}</button></div><button class="btn big" data-a="raise">레이즈 → ${RSt.to}칩까지</button>` : `<div class="bb-note">더 올릴 수 없어요 (레이즈 ${V.maxRaise}번 또는 칩 한도)</div>`}
        ${toCall > 0 ? `<div class="bb-note" style="font-size:11.5px">⚠️ 내 블라인드는 안 보여요 — ${BB.BIGB} 이상인 채 폴드하면 칩 ${BB.EXTRA}개를 더 내요</div>` : ""}`;
    } else if (!spec && V.phase === "bet") acts = `<div class="bb-note"><b>${esc(nm(V.turn >= 0 ? V.turn : O))}</b> 차례예요…</div>`;
    else if (picking) {
      const sel = selFor(V, ctx);
      acts = `<div class="bb-opens">${V.left[me].map(v => `<button type="button" class="bb-ob${v <= BB.LOWOPEN ? " lo" : ""}${sel.v === v ? " on" : ""}" data-v="${v}" aria-label="오픈 카드 ${v}">${v}</button>`).join("")}</div>
        <button class="btn primary big" data-a="open" ${sel.v == null ? "disabled" : ""}>${sel.v == null ? "오픈 카드를 골라요 (⚡ 1·2 로 이기면 +10칩)" : `🔒 오픈 ${sel.v} 내기`}</button>`;
    } else if (!spec && V.phase === "pick" && V.mine != null) acts = `<div class="bb-note">🔒 오픈 카드를 냈어요 · <b>${esc(nm(O))}</b> 이(가) 낼 때까지 기다려요…</div>`;
    else acts = `<div class="bb-note">${spec ? (V.needs.length ? V.needs.map(i => esc(nm(i))).join(" · ") + " 생각 중…" : "") : "잠시만요…"}</div>`;
    h += `<div class="bb-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.r) {
        const RSt = raiseState(V, ctx), d = t.dataset.r;
        RSt.to = d === "max" ? V.cap : Math.max(V.cur + 1, Math.min(V.cap, RSt.to + +d));
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.v) { selFor(V, ctx).v = +t.dataset.v; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const a = t.dataset.a;
      if (a === "call") { ctx.sfx("pop"); ctx.act({ t: "call" }); }
      else if (a === "fold") { ctx.sfx("pop"); ctx.act({ t: "fold" }); }
      else if (a === "raise") { ctx.sfx("pop"); ctx.act({ t: "raise", to: raiseState(V, ctx).to }); }
      else if (a === "open") { const s = selFor(V, ctx); if (s.v != null) { ctx.sfx("pop"); ctx.act({ t: "open", v: s.v }); } }
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const A = me >= 0 ? me : 0, O = 1 - A, who = me >= 0 ? ["나", "상대"] : ["1번", "2번"];
    const H = V.hist, win = H.filter(x => !x.fold && x.w === A).length, lose = H.filter(x => !x.fold && x.w === O).length, tie = H.filter(x => !x.fold && x.w < 0).length;
    const fA = H.filter(x => x.fold && x.folder === A).length, fO = H.filter(x => x.fold && x.folder === O).length;
    const low = H.filter(x => x.bonus && !x.fold).length, pen = H.filter(x => x.bonus && x.fold).length;
    return `<div>칩 ${who[0]} <b>${V.chips[A]}</b> : <b>${V.chips[O]}</b> ${who[1]}</div>`
      + `<div>이긴 턴 ${win} · 진 턴 ${lose} · 비긴 턴 ${tie} · 폴드 ${who[0]} ${fA}번 / ${who[1]} ${fO}번${H.length >= 40 ? " (최근 40턴)" : ""}</div>`
      + `<div>⚡ 오픈 1·2 보너스 ${low}번 · 💥 블라인드 ${BB.BIGB}+ 폴드 벌칙 ${pen}번</div>`;
  }

  // ── AI 선생님 (보이는 것만 — 내 블라인드는 나도 모르니 쓰지 않아요) ──
  const pc = x => Math.round(x * 100);
  const sgn = x => (x >= 0 ? "+" : "") + x.toFixed(1);
  function coach(V, me, since, names) {
    const o = 1 - me, on = esc((names && names[o]) || "상대"), L = V.left[o], bo = V.blind[o];
    const head = `칩 나 ${V.chips[me]} : ${V.chips[o]} ${on} · ${V.round}/${V.R} 라운드 ${V.tno}번째 턴`;
    if (V.over || V.phase === "show" || V.phase === "end" || bo == null) {
      return { opp: `${on}의 남은 오픈 카드: ${L.join(" ") || "없음"}.`, mine: `${head}. 내 남은 오픈 카드: ${V.left[me].join(" ") || "없음"}.`, rec: V.over ? "게임이 끝났어요. 결과를 확인해요." : "공개된 카드를 확인해요. 곧 다음 턴이 시작돼요.", why: "쓴 블라인드와 오픈 카드는 화면 표에 기록돼요. 남은 카드를 세면 다음 블라인드를 짐작하기 쉬워져요." };
    }
    const ch = BB.chances(V, me), w = ch.wts;
    let eB = 0; w.forEach((p, v) => { eB += p * v; });
    const nr = V.acts.filter(x => x.s === o && x.a === "raise").length;
    let opp = `${on}의 블라인드는 <b>${bo}</b>예요 (나는 보이고, 상대는 자기 것을 몰라요). `;
    opp += bo >= BB.BIGB ? `${BB.BIGB} 이상이라 상대가 폴드하면 칩 ${BB.EXTRA}개를 더 내서 쉽게 접지 않을 거예요. ` : bo <= 3 ? "블라인드가 작아서 오픈 카드가 커야 이길 수 있어요. " : "";
    opp += `남은 오픈 카드: ${L.join(" ") || "없음"}${L.some(x => x <= BB.LOWOPEN) ? " (⚡ 1·2 가 남아 있어요)" : ""}.`;
    if (nr) opp += ` 이번 턴 상대가 레이즈를 ${nr}번 했어요 — 상대 눈에 내 블라인드가 낮아 보였을 수 있어요.`;
    const mine = `${head}. 판돈 ${V.pot}칩${V.carry ? ` (이월 ${V.carry} 포함)` : ""}. 내 블라인드는 아직 안 나온 카드 중 하나예요 — 평균 ${eB.toFixed(1)}, ${BB.BIGB} 이상일 확률 ${pc(ch.pBig)}%. 내 남은 오픈 카드: ${V.left[me].join(" ")}.`;
    const toCall = V.cur - V.bet[me];
    let rec, ex;
    if (V.phase === "bet" && V.needs.includes(me) && ch.opts.length) {
      const os = ch.opts.slice().sort((a, b) => b.ev - a.ev), b0 = os[0];
      const nmO = x => (x.a.t === "fold" ? "폴드" : x.a.t === "call" ? (toCall > 0 ? `콜 ${toCall}칩` : "체크") : `레이즈 → ${x.a.to}칩`);
      rec = `${nmO(b0)} 이(가) 가장 좋아 보여요 (기대 칩 ${sgn(b0.ev)}).` + (os[1] ? ` 다음은 ${nmO(os[1])} (${sgn(os[1].ev)}).` : "");
      ex = "블라인드 + 오픈 카드의 합이 큰 쪽이 판돈을 가져가요. 내 블라인드를 모르니 상대 베팅과 나온 카드 표로 짐작해요." + (toCall > 0 ? ` 폴드하면 내 블라인드가 ${BB.BIGB} 이상일 확률(${pc(ch.pBig)}%)만큼 칩 ${BB.EXTRA}개를 더 낼 수 있어요.` : "");
    } else if (V.phase === "bet") {
      rec = ch.best ? `상대 차례예요. 이대로 공개까지 가면 오픈 카드는 ${ch.best.x}번이 가장 좋아요 (이길 확률 약 ${pc(ch.best.pWin)}%).` : "상대 차례예요.";
      ex = "베팅이 끝나면 둘 다 오픈 카드를 한 장씩 동시에 내요. 지금은 상대가 어떻게 거는지 보고 내 블라인드를 짐작해요.";
    } else if (V.picked[me]) {
      rec = "오픈 카드를 냈어요. 상대를 기다려요.";
      ex = "오픈 카드는 낸 뒤에 되돌릴 수 없어요. 공개되면 쓴 카드가 표에 기록돼요.";
    } else {
      const b = ch.best, lo = ch.rows.find(r => r.x <= BB.LOWOPEN);
      rec = b ? `오픈 카드 <b>${b.x}</b> 를 내면 이길 확률 약 ${pc(b.pWin)}% (비길 ${pc(b.pTie)}%, 기대 칩 ${sgn(b.ev)})로 가장 좋아요.` : "낼 카드가 없어요.";
      if (lo && b && lo.x !== b.x) rec += ` ⚡ ${lo.x}번은 이기면 보너스 10칩이지만 이길 확률이 ${pc(lo.pWin)}%예요.`;
      ex = "높은 오픈 카드를 이길 판에 쓰고, 질 것 같으면 낮은 카드를 아껴요. 1·2 로 이기면 상대 칩 10개를 더 가져오지만, 상대가 1·2 로 이기면 내가 10개를 잃어요.";
    }
    return { opp, mine, rec, why: ex };
  }

  // ── 🎞️ 복기: 아쉬운 수 (선생님과 같은 계산 — 보이는 것만 · 기대 칩 차이로 sev) ──
  const sg = x => (x < -0.049 ? "−" : "+") + Math.abs(x).toFixed(1);
  const sameA = (a, b) => !!a && !!b && a.t === b.t && a.to === b.to && a.v === b.v;
  const REV_K = 28;                                   // 기대 칩 1개 손해 = sev 28 (≈ 2.2칩 손해부터 📒)
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || V.over || (seat !== 0 && seat !== 1) || !V.needs || !V.needs.includes(seat)) return none;
      const isBest = sameA(myA, bestA), inTally = !!(info && info.same);
      const fin = (s, why) => ({ sev: isBest ? 0 : inTally ? Math.max(0, Math.min(20, Math.round(s))) : Math.max(0, Math.min(100, Math.round(s))), why });   // 고급 AI 도 두는 수면 아쉬운 장면이 아니에요
      const ch = BB.chances(V, seat), pcn = x => Math.max(1, Math.min(99, Math.round(x * 100)));
      if (V.phase === "bet" && ch.opts.length && ["call", "fold", "raise"].includes(myA.t)) {
        const toCall = V.cur - V.bet[seat];
        const evOf = a => {                                  // 선생님이 쓰는 options 로 그 행동의 기대 칩 (선택지에 없는 레이즈 금액은 한도를 그 금액으로 두고 다시 셈)
          if (!a) return null;
          let L = ch.opts;
          if (a.t === "raise" && !L.some(o => o.a.t === "raise" && o.a.to === a.to)) {
            if (!Number.isInteger(a.to) || a.to <= V.cur || V.raises >= V.maxRaise) return null;
            L = BB.options(Object.assign({}, V, { cap: Math.max(V.cap, a.to) }), seat, ch.wts, true);
          }
          const o = L.find(x => x.a.t === a.t && (a.t !== "raise" || x.a.to === a.to));
          return o ? o.ev : null;
        };
        const mine = evOf(myA); if (mine == null) return none;
        const cands = ch.opts.slice();
        if (bestA && !cands.some(o => sameA(o.a, bestA))) { const e = evOf(bestA); if (e != null) cands.push({ a: bestA, ev: e }); }
        if (!cands.some(o => sameA(o.a, myA))) cands.push({ a: myA, ev: mine });
        cands.sort((x, y) => y.ev - x.ev);
        const best = cands[0], solid = cands.find(o => o.a.t !== "raise");     // 폴드 · 콜은 상대 반응을 가정하지 않는 값
        const nmA = a => (a.t === "fold" ? "폴드" : a.t === "call" ? (toCall > 0 ? `콜 ${toCall}칩` : "체크") : `레이즈 → ${a.to}칩`);
        // 확실한 손해 = 폴드 · 콜 중 가장 좋은 것보다 낮을 때 / 더 걸어 벌 수 있었던 몫은 상대가 접을 확률 가정에 기대니 반만 · 📒 에는 안 담음
        const hard = solid ? Math.max(0, solid.ev - mine) : 0, soft = Math.max(0, best.ev - Math.max(mine, solid ? solid.ev : mine));
        const sev = Math.max(hard * REV_K, Math.min(59, soft * REV_K * 0.5));
        const ref = hard > 0.05 ? solid : best, odds = `이길 확률 ~${pcn(ch.p)}%`;
        const note = Math.max(V.cur, myA.to || 0) >= 8 ? " (큰 베팅은 위험 보정 포함)" : myA.t === "fold" || ref.a.t === "fold" ? ` (폴드엔 블라인드 ${BB.BIGB}+ 벌칙 ${pcn(ch.pBig)}% 포함)` : "";
        const why = ref.ev - mine < 0.05 ? `${odds} · 기대 칩 ${nmA(myA)} ${sg(mine)}${cands[1] ? ` (다음 ${nmA(cands[1].a)} ${sg(cands[1].ev)})` : ""}${note}`
          : `${odds} · 기대 칩 내 ${nmA(myA)} ${sg(mine)} / 최선 ${nmA(ref.a)} ${sg(ref.ev)}${note}`;
        return fin(sev, why);
      }
      if (V.phase === "pick" && myA.t === "open" && ch.rows.length) {
        // 오픈 카드: 상대가 고르게 낼 때의 기대 칩(선생님 숫자)을, 고급 AI 가 실제로 섞어 내는 카드(10% 이상)끼리 견줘요 — 그 카드는 틀린 수가 아님
        const T = Math.max(V.bet[0], V.bet[1]), se = BB.showEV(V, seat, ch.wts, T, true), i0 = se.X.indexOf(myA.v), mine = ch.rows.find(r => r.x === myA.v);
        if (i0 < 0 || !mine || !se.mix) return none;
        const mp = se.mix[i0] || 0, sup = se.X.map((x, i) => i).filter(i => se.mix[i] >= 0.1);
        if (!sup.length) sup.push(se.mix.indexOf(Math.max(...se.mix)));
        const bi = sup.reduce((m, i) => (se.rowMean[i] > se.rowMean[m] ? i : m), sup[0]), best = ch.rows.find(r => r.x === se.X[bi]) || ch.rows[0];
        const loss = Math.max(0, best.ev - mine.ev);
        const mixTxt = mp >= 0.08 ? ` · 고급 AI 도 ${pcn(mp)}% 섞어 내요` : "";
        const why = best.x === myA.v || loss < 0.05 ? `오픈 ${myA.v}: 이길 확률 ~${pcn(mine.pWin)}% · 기대 ${sg(mine.ev)}칩${mixTxt}`
          : `오픈 ${myA.v}: 이길 확률 ~${pcn(mine.pWin)}% · 기대 ${sg(mine.ev)}칩 / 고급 AI 가 즐겨 내는 ${best.x}: ~${pcn(best.pWin)}% · ${sg(best.ev)}칩${mixTxt}`;
        return fin(mp >= 0.1 ? Math.min(15, loss * REV_K) : loss * REV_K, why);
      }
    } catch (e) { /* 계산 못 하면 아래 */ }
    return none;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 준비물", title: "오픈 카드 · 블라인드 카드 · 칩", body: "<b>오픈 카드 1~10</b>은 사람마다 한 세트, <b>블라인드 카드 1~12</b>는 두 세트(24장)를 같이 써요. 칩은 <b>30개씩</b> 가지고 시작해요.",
        boardHtml: `<div class="bb-tut"><div class="row">${[3, 7, 10].map(v => oc(v)).join("")}${bc(5)}${bc(12)}</div><small>🟣 오픈(내가 고름) · 🔴 블라인드(딜러가 줌) · 🪙 칩 30개</small></div>`, ms: 5200 },
      { tag: "STEP 2 · 블라인드", title: "내 카드는 못 보고, 상대 카드는 보여요", body: "턴마다 딜러가 두 사람에게 <b>블라인드 카드 한 장씩</b> 줘요. <b>내 것은 못 보고 상대 것만</b> 보여요. 상대도 내 카드만 봐요. 서로 모르는 자기 카드를 베팅으로 짐작해요.",
        boardHtml: `<div class="bb-tut"><div class="row"><div class="bb-col"><div class="lb"><b>상대</b> 블라인드 (보임)</div>${bc(9)}</div><span class="bb-vs">VS</span><div class="bb-col"><div class="lb"><b>내</b> 블라인드 (안 보임)</div>${bcBack()}</div></div></div>`, ms: 5600 },
      { tag: "STEP 3 · 베팅", title: "기본 1칩 → 콜 · 레이즈 · 폴드", body: "먼저 <b>기본 1칩</b>씩 내요. 지난 턴 승자부터 <b>레이즈</b>(더 걸기) · <b>콜</b>(따라가기, 안 걸었으면 체크) · <b>폴드</b>(포기)를 골라요. 상대 남은 칩보다 많이는 못 걸어요.",
        boardHtml: `<div class="bb-tut"><span class="bb-pot">🪙 판돈 6</span><div class="bb-btns" style="width:100%"><span class="btn primary">콜 2칩</span><span class="btn fold">폴드</span></div><small>폴드하면 상대가 판돈을 가져가요</small></div>`, ms: 5600 },
      { tag: "STEP 4 · 직접", title: "오픈 카드로 합을 이겨 봐요", body: "베팅이 맞으면 오픈 카드를 한 장씩 동시에 내요. <b>블라인드 + 오픈 카드</b>의 합이 큰 쪽이 이겨요. 상대는 <b>9 + 4 = 13</b>이에요. 내 블라인드 <b>6</b>에 오픈 카드를 더해 13을 넘겨 보세요!",
        interactive: { hint: "👆 합이 13보다 크게 되는 오픈 카드를 눌러요", doneText: "✅ 합이 크면 판돈을 가져가요!" },
        render(stage, ctrl) {
          let done = false, msg = "", pick = null;
          const draw = () => {
            stage.innerHTML = `<div class="bb-tut"><div class="row"><div class="bb-col"><div class="lb"><b>상대</b></div><div class="bb-eq">${bc(9)}<span class="pl">+</span>${oc(4)}</div><div class="sm">= 13</div></div><span class="bb-vs">VS</span><div class="bb-col${done ? " win" : ""}"><div class="lb"><b>나</b></div><div class="bb-eq">${bc(6)}<span class="pl">+</span>${pick != null ? oc(pick, done ? "" : "pre") : `<div class="bb-c op empty">·</div>`}</div><div class="sm">${pick != null ? "= " + (6 + pick) : ""}</div></div></div>
              <div class="bb-opens">${range(10).map(v => `<button type="button" class="bb-ob${v <= 2 ? " lo" : ""}" data-v="${v}">${v}</button>`).join("")}</div><div class="msg">${esc(msg)}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b || done) return;
            pick = +b.dataset.v;
            if (6 + pick > 13) { done = true; msg = `🏆 6 + ${pick} = ${6 + pick} > 13 · 이겼어요!`; ctrl.sfx("win"); draw(); ctrl.complete(); }
            else { msg = `6 + ${pick} = ${6 + pick} … 13을 못 넘어요. 다시!`; ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 보너스", title: "⚡ 1·2 승리 보너스와 💥 11·12 폴드 벌칙", body: "오픈 카드 <b>1 또는 2로 이기면</b> 상대 칩 <b>10개를 더</b> 가져와요. 반대로 <b>폴드한 사람의 블라인드가 11 또는 12</b>면 칩 <b>10개를 더</b> 내요. 합이 같으면 오픈 카드가 큰 쪽이 이기고, 오픈도 같으면 판돈은 다음 턴으로 넘어가요.",
        boardHtml: `<div class="bb-tut"><div class="row">${oc(1)}<span>이기면 → <b>+10칩</b></span></div><div class="row">${bc(12)}<span>폴드하면 → <b>−10칩</b></span></div></div>`, ms: 6400 },
      { tag: "STEP 6 · 끝", title: "오픈 카드를 다 쓰면 라운드 끝", body: "오픈 카드 10장을 다 쓰면 한 라운드가 끝나요 (폴드한 턴은 카드를 안 써요). <b>두 라운드</b> 뒤 칩이 많은 쪽이 이기고, 상대 칩이 다 없어지면 바로 이겨요. 필기는 없어요 — 화면의 <b>남은 블라인드 표</b>를 보고, 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="bb-tut"><span style="font-size:42px">🏆</span></div>`, ms: 5400 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌3 · 블라인드 베팅";
  const DIFF = "방송과 다른 점: 합이 같으면 오픈 카드가 큰 쪽이 이기고, 오픈 카드도 같으면 판돈을 다음 턴으로 넘겨요 (방송 문서 각주를 보고 추정했어요) · 칩은 두 라운드에 걸쳐 이어지고, 라운드마다 오픈 카드 1~10과 블라인드 24장을 새로 섞어요 · 한 턴에 레이즈는 4번까지, 걸린 칩이 없으면 폴드 대신 체크만 돼요 · 필기가 없는 대신 화면이 남은 블라인드와 쓴 오픈 카드를 보여 줘요 · 구경하는 사람은 두 블라인드를 다 봐요 · 동시에 숨겨 내서 한 기기로는 못 해요";
  window.SVUI = window.SVUI || {};
  window.SVUI.blindbet = {
    actText: a => !a ? "—" : a.t === "call" ? "콜(체크)" : a.t === "fold" ? "폴드" : a.t === "raise" ? `레이즈 → ${a.to}칩` : a.t === "open" ? `오픈 카드 ${a.v}` : "행동",   // 🎞️ 복기 행동 글
    name: "블라인드 베팅", emoji: "🎴", short: "남의 카드만 보고 베팅하는 1:1 승부", min: 2, max: 2, defN: 2, board: false,
    opts: [],
    howto: [
      "<b>목표</b> — 칩 30개로 시작해 <b>두 라운드</b> 뒤 칩이 더 많은 쪽이 이겨요 (상대 칩이 다 없어지면 바로 승)",
      "<b>준비물</b> — 오픈 카드 1~10(한 세트씩) · 블라인드 카드 1~12 두 세트(24장) · 칩",
      "<b>진행</b> — 턴마다 블라인드 카드를 한 장씩 받아요 (내 것은 못 보고 상대 것만 보임) → 기본 1칩 → 콜 · 레이즈 · 폴드 → 오픈 카드를 동시에 한 장씩",
      "<b>승패</b> — 블라인드 + 오픈 카드의 합이 큰 쪽이 그 턴 칩을 가져가요 · 폴드하면 상대가 가져가요",
      "<b>특수</b> — 오픈 1 · 2 로 이기면 상대 칩 10개를 더 · 폴드한 사람의 블라인드가 11 · 12 면 칩 10개를 더 내요 · 오픈 10장을 다 쓰면 라운드 끝",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${V.round} / ${V.R} 라운드 · ${V.tno}번째 턴`),
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: V.over && V.chips[i] <= 0 }),
    render, coach, result, tutorial, review,
    qa: (V, me, rnd) => BB.ai(V, me, "easy", rnd),
  };
})();

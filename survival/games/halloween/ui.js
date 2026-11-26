/* 베니 서바이벌 · 핼러윈 몬스터 — 화면 (전장 3칸 · 몰래 전장 + 무기 제출 → 순서대로 적용 · 공격 기록 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.halloween, MON = K.MON, WP = K.WP;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 3일차 메인 매치 (11명) · 규칙 확인: 나무위키 데스룸 3일차 문서 (룰 · 몬스터 13종 표 · 무기 효과 · 피해 순서 각주 · 4 · 5라운드 기록, 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "3~6명 개인전 (방송 11명 · 동맹 · 승점 양도 · 스카우터 · 순서 바꾸기 · 피스 아이템 없음, 피스는 모으기만) · 인원에 맞춰 몬스터 일부만 (방송 순서로 자르고 사신은 마지막 — 13마리 전부 옵션) · 라운드 상한 (일부 20 · 전부 30) · 제출 2분 제한 없음 · 승점이 같으면 공동 순위 · 독은 여러 번 겹쳐 놓을 수 있고 독으로 죽이면 독 놓은 사람이 처치 · 얼어 있는 몬스터에는 얼음도 독도 안 먹음 · 방송 룰 8번 그대로 몬스터 남은 체력 · 남의 전장 · 무기 선택은 끝까지 비공개 (처치 · 막타만 공개) — 화면은 내가 낸 수의 누적(명목 피해)만 적어 줌 · 사신(13번)은 방송 표에 체력 · 전리품이 '??' 이고 대기열에 들어올 때 20 · 피스 2개로 공개돼서 그 값으로 씀 · 승점이 같으면 순서는 방송 룰대로 (첫 라운드 추첨 · 이후 지난 라운드에 먼저 공격한 사람이 뒤로) — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const CSS = `
.hw-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.hw-rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.hw-ord{flex:1 1 100%;min-width:0;display:flex;flex-wrap:wrap;gap:3px;align-items:center;font:700 11.5px/1.2 var(--round);color:var(--soft)}
.hw-ord em{font-style:normal;color:#fde68a;margin-right:3px;font-weight:900}
.hw-ord .o{border-radius:99px;padding:2px 7px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis}
.hw-ord .o.me{color:#86efac;border-color:#86efac;font-weight:900}
.hw-show .r .t br{display:none}.hw-show .r .t .k{margin-left:4px}
.hw-field.cp .hw-mon{padding:3px 3px 4px}.hw-field.cp .em{font-size:22px}.hw-field.cp .lt{display:none}.hw-field.cp .st{min-height:0}
.hw-field{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;flex:none}
.hw-mon{position:relative;border-radius:14px;padding:6px 3px 7px;text-align:center;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.14);color:#fff;display:grid;gap:2px;justify-items:center;font-family:var(--round);min-width:0}
.hw-mon.pick{cursor:pointer}.hw-mon.pick:active{transform:scale(.97)}
.hw-mon.sel{border-color:#fde68a;box-shadow:0 0 0 2px rgba(253,230,138,.5);background:rgba(245,179,1,.12)}
.hw-mon.sel2{border-color:#a5b4fc;box-shadow:0 0 0 2px rgba(165,180,252,.5)}
.hw-mon.empty{opacity:.35;border-style:dashed}
.hw-mon .no{position:absolute;left:5px;top:3px;font:900 11px var(--round);color:var(--soft)}
.hw-mon .em{font-size:30px;line-height:1.05}
.hw-mon b{font-size:12.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hw-hp{width:88%;height:9px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.hw-hp i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b)}
.hw-mon .hv{font:800 11.5px var(--round);color:#fecaca;font-variant-numeric:tabular-nums}.hw-mon .hv2{font:700 10.5px var(--round);color:var(--soft)}
.hw-mon .st{min-height:0;font-size:12px;display:flex;gap:3px;justify-content:center;flex-wrap:wrap}
.hw-mon .lt{font-size:10.5px;color:var(--soft);white-space:nowrap}
.hw-q{display:flex;align-items:center;gap:5px;flex:none;font:700 11.5px var(--round);color:var(--soft);overflow:hidden}
.hw-q span{font-size:17px;opacity:.85}
.hw-me{display:flex;flex-direction:column;gap:6px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:7px 8px;flex:none}
.hw-me .hd{display:flex;justify-content:space-between;gap:6px;font:700 12px var(--round);color:#86efac}
.hw-ws{display:flex;gap:6px;flex-wrap:wrap}
.hw-w{flex:1 1 0;min-width:62px;border-radius:12px;padding:5px 3px;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:800 12px/1.2 var(--round);min-height:44px;display:grid;justify-items:center;gap:1px}
.hw-w .e{font-size:19px}.hw-w small{font:700 10.5px var(--round);color:var(--soft)}
.hw-w.on{border-color:#fde68a;background:rgba(245,179,1,.16)}
.hw-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.hw-acts .note{text-align:center;font-size:12px;color:var(--soft);line-height:1.35}
.hw-acts .btn{padding:12px 8px;font-size:15px}
.hw-show{display:grid;gap:3px;font-size:12px;min-height:0;overflow:auto}
.hw-show .r{display:grid;grid-template-columns:20px minmax(0,1fr);gap:1px 6px;padding:4px 7px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);line-height:1.3}
.hw-show .r.kill{border-color:var(--gold);background:rgba(245,179,1,.1)}
.hw-show .r .p{font:900 11px var(--round);color:var(--soft);text-align:center;padding-top:1px}
.hw-show .r .t b{font-weight:800}.hw-show .r .t .k{color:#fde68a;font-weight:800}.hw-show .r .t .x{color:var(--soft)}
.hw-sc{font:700 11.5px var(--round);color:var(--soft);text-align:center}
.hw-res{display:grid;gap:3px;font-size:12.5px}
.hw-tut{display:grid;gap:8px;justify-items:center;width:100%}
.hw-tut .hw-field{width:100%}
.sv-coachfit .hw-q,.sv-coachfit .hw-sc{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const W = w => `${WP[w].em}${WP[w].nm}`;
  const LOOT = l => (l === "peace" ? "🧩피스" : WP[l].em + WP[l].nm);
  const sel = { key: "", f: null, f2: null, w: "dagger" };

  function monHtml(m, f, o = {}) {
    if (!m) return `<div class="hw-mon empty"><span class="no">${f + 1}</span><span class="em">·</span><b>빈 전장</b></div>`;
    const D = MON[m.i], st = [];
    if (m.mi) st.push(`<span title="내가 건 얼음">🧊</span>`);
    if (m.mp) st.push(`<span title="내가 묻힌 독">☠️${m.mp > 1 ? "×" + m.mp : ""}</span>`);
    if (o.bombs) { const b = o.bombs.filter(x => x.f === f).length; if (b) st.push(`<span title="내 시한폭탄">💣${b > 1 ? "×" + b : ""}</span>`); }
    const cls = `hw-mon${o.pick ? " pick" : ""}${o.sel ? " sel" : ""}${o.sel2 ? " sel2" : ""}`;
    return `<div class="${cls}" data-f="${f}"><span class="no">${f + 1}</span><span class="em">${D.em}</span><b>${D.nm}</b><span class="hv">♥ 최대 ${m.max}</span><span class="hv2">내 공격 ${m.est || 0}</span><span class="st">${st.join("")}</span><span class="lt">${D.loot.map(l => (l === "peace" ? "🧩" : WP[l].em)).join("")}</span></div>`;
  }
  const phase = { pick: "공격 고르기", show: "결과", end: "끝" };
  function evText(t, nm, me) {
    const kills = t.ev.filter(e => e.k === "kill").map(e => `<span class="k">${MON[e.mon].em}${MON[e.mon].nm} 처치 +${e.gain}${e.loot.length ? " " + e.loot.map(LOOT).join("") : ""}</span>${e.by !== t.s ? ` (${e.by === me ? "나" : esc(nm(e.by))} 독 · 폭탄 · 막타)` : ""}`);
    const own = t.w != null ? ` ${WP[t.w].em} 전장 ${t.f + 1}${t.f2 != null ? `·${t.f2 + 1}` : ""}` : "";
    return `<b>${t.s === me ? "나" : esc(nm(t.s))}</b>${own || ' <span class="x">공격 (비공개)</span>'}${kills.length ? "<br>" + kills.join(" ") : ""}`;
  }
  function showHtml(V, ctx) {
    const nm = i => nameOf(ctx, i);
    if (!V.res) return "";
    return `<div class="hw-show">${V.res.turns.map(t => `<div class="r${t.ev.some(e => e.k === "kill") ? " kill" : ""}"><span class="p">${t.p + 1}</span><span class="t">${evText(t, nm, V.seat)}</span></div>`).join("")}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, nm = i => nameOf(ctx, i), watch = me < 0;
    const key = `${V.round}|${V.phase}|${me}`; if (sel.key !== key) { sel.key = key; sel.f = null; sel.f2 = null; sel.w = "dagger"; }
    if (ctx.canAct && sel.f != null && !V.field[sel.f]) { sel.f = null; sel.f2 = null; }
    const can = ctx.canAct && V.phase === "pick" && !watch && !V.sub;
    const myInv = me >= 0 ? V.inv[me] : {};
    let h = `<div class="hw-top"><span class="hw-ord"><em>순서</em>${V.order.map((s, p) => `<span class="o${s === me ? " me" : ""}">${p + 1} ${esc(nm(s))}</span>`).join("")}</span></div>`;
    const tight = V.n >= 5 && (V.phase === "show" || V.over);
    h += `<div class="hw-field${tight ? " cp" : ""}">${V.field.map((m, f) => monHtml(m, f, { pick: can && !!m, sel: sel.f === f, sel2: sel.f2 === f, bombs: V.bombs, nm })).join("")}</div>`;
    if (!tight) h += `<div class="hw-q">대기열 ${V.queue.length ? V.queue.map(i => `<span title="${MON[i].nm}">${MON[i].em}</span>`).join("") : "없음"}</div>`;
    let acts = "";
    if (V.phase === "show") acts = (tight ? "" : `<div class="hw-sc">남의 공격 · 몬스터 남은 체력은 비공개 — 처치와 막타만 공개돼요</div>`) + showHtml(V, ctx);
    else if (V.over) acts = showHtml(V, ctx);
    else if (watch) acts = `<div class="note">${V.needs.length ? V.needs.map(i => esc(nm(i))).join(" · ") + " 고르는 중…" : ""}</div>`;
    else if (V.sub) acts = `<div class="note">${WP[V.sub.w].em} 전장 ${V.sub.f + 1}${V.sub.f2 != null ? `·${V.sub.f2 + 1}` : ""} 를 냈어요 · 다른 사람을 기다려요 (${V.subbed.filter(Boolean).length}/${V.n})</div>`;
    else if (can) {
      const ws = ["dagger"].concat(K.SPECIAL.filter(w => myInv[w] > 0));
      const target = sel.f == null ? "위에서 공격할 전장을 눌러요" : `전장 ${sel.f + 1} ${MON[V.field[sel.f].i].nm}${sel.w === "twin" ? (sel.f2 != null ? ` + 전장 ${sel.f2 + 1} (각 2)` : " — 다른 전장을 한 번 더 누르면 두 곳 (각 2)") : ""}`;
      acts = `<div class="hw-me"><div class="hd"><span>내 무기 · 순서 ${V.pos + 1}/${V.n}</span><span>승점 ${V.score[me]}${V.pieces[me] ? ` · 🧩${V.pieces[me]}` : ""}</span></div>
        <div class="hw-ws">${ws.map(w => `<button class="hw-w${sel.w === w ? " on" : ""}" data-w="${w}"><span class="e">${WP[w].em}</span>${WP[w].nm}<small>${w === "dagger" ? "공격 3 · ∞" : `공격 ${WP[w].dmg} · ×${myInv[w]}`}</small></button>`).join("")}</div></div>
        <div class="note">${esc(target)}${sel.w !== "dagger" ? ` · ${WP[sel.w].d}` : ""}</div><button class="btn primary" data-a="go" ${sel.f == null ? "disabled" : ""}>공격!</button>`;
    }
    h += `<div class="hw-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const w = e.target.closest("[data-w]");
      if (w && can) { ctx.sfx("tap"); sel.w = w.dataset.w; if (sel.w !== "twin") sel.f2 = null; render(stage, V, ctx); return; }
      const m = e.target.closest(".hw-mon.pick");
      if (m && can) { ctx.sfx("tap"); const f = +m.dataset.f; if (sel.w === "twin" && sel.f != null && f !== sel.f) sel.f2 = sel.f2 === f ? null : f; else { sel.f = f; sel.f2 = null; } render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a=go]");
      if (b && !b.disabled && can && sel.f != null) { ctx.sfx("pop"); const a = { t: "atk", f: sel.f, w: sel.w }; if (sel.w === "twin" && sel.f2 != null) a.f2 = sel.f2; ctx.act(a); }
    };
  }

  // ── 선생님 ──
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) return { opp: "판이 끝났어요.", mine: `내 승점 ${V.score[me]} · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    const lastTurns = V.res ? V.res.turns : [];
    // 👀 상대 흐름: 공개된 것 (처치 · 막타 · 얻은 무기)
    const kl = lastTurns.flatMap(t => t.ev.filter(e => e.k === "kill"));
    let opp = kl.length ? `지난 라운드 처치: ${kl.map(e => `${e.by === me ? "나" : nm(e.by)}가 ${MON[e.mon].nm} (+${e.gain})`).join(", ")}` : (V.round > 1 ? "지난 라운드엔 처치가 없었어요 — 남의 공격은 비공개예요." : "첫 라운드예요 — 남의 선택 · 몬스터 남은 체력은 비공개, 처치만 공개돼요.");
    const holders = V.loot.map((l, s) => ({ s, n: l.map(w => WP[w].em).join("") })).filter(x => x.s !== me && x.n);
    if (holders.length) opp += ` · 얻은 특수 무기 (쓴 것은 몰라요): ${holders.map(x => `${nm(x.s)} ${x.n}`).join(" ")}`;
    // 📊 내 흐름
    const mineInv = V.inv[me], ws = K.SPECIAL.filter(w => mineInv[w] > 0).map(w => `${WP[w].em}${WP[w].nm}${mineInv[w] > 1 ? "×" + mineInv[w] : ""}`);
    const lead = Math.max(...V.score), pos = V.order.indexOf(me) + 1;
    const mine = `승점 ${V.score[me]} (1위 ${lead}${V.score[me] === lead ? " = 나" : ` · ${lead - V.score[me]}점 차`}) · 공격 순서 ${pos}/${V.n}${pos === V.n ? " (마지막 — 막타를 노려요)" : pos === 1 ? " (맨 먼저 — 남이 막타를 가로채기 쉬워요)" : ""} · 무기 ${ws.length ? ws.join(" ") : "단검뿐"} · 몬스터: ${V.field.map((m, f) => (m ? `${f + 1}번 ${MON[m.i].nm} 최대 ${m.max} (내 공격 ${m.est})` : `${f + 1}번 비었음`)).join(", ")}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me) && V.phase === "pick") {
      const R = K.recommend(V, me), a = R && R.a;
      if (a) {
        const row = R.rows.find(r => r.a.f === a.f && r.a.w === a.w && (r.a.f2 == null ? null : r.a.f2) === (a.f2 == null ? null : a.f2)) || R.rows[0], m = V.field[a.f];
        rec = `전장 ${a.f + 1}${a.f2 != null ? `·${a.f2 + 1}` : ""} ${W(a.w)}`;
        const ex = K.expectBefore(V, me), eh = ex.hp[a.f], alt = R.rows.filter(r => r !== row).slice(0, 1)[0];
        why = `${MON[m.i].nm}의 남은 체력은 안 보여요 — 최대 ${m.max}에서 내 공격 ${m.est}과 지나간 순서 ${m.age}번을 합쳐 지금 약 ${ex.cur[a.f] == null ? "?" : ex.cur[a.f].toFixed(1)}로 짐작하고, 내 앞 ${pos - 1}명이 때리고 나면 약 ${eh == null ? "?" : eh.toFixed(1)} 남을 거예요. 이 수로 내가 마지막 일격을 넣을 확률 ${pc(row.kill)} (기대 ${row.u >= 0 ? "+" : ""}${row.u.toFixed(1)}점)${alt ? ` · 다음 후보 ${W(alt.a.w)} 전장 ${alt.a.f + 1}: ${pc(alt.kill)}` : ""}.${a.w !== "dagger" ? ` 특수 무기는 쓰면 사라지니 막타가 될 때만 써요.` : ""}`;
      }
    } else if (V.phase === "show") { rec = "결과를 보고 다음 라운드를 준비해요"; why = "몬스터 체력은 숨겨져 있어요 — 처치 기록과 내가 준 피해로 막타 자리를 짐작해 봐요."; }
    return { opp, mine, rec, why };
  }

  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const kills = V.log.filter(e => e.k === "turn").flatMap(t => t.ev.filter(e => e.k === "kill"));
    const by = Array(V.n).fill(0); kills.forEach(e => { by[e.by]++; });
    return `<div class="hw-res"><div>${V.round}라운드 · ${V.end === "clear" ? "몬스터를 모두 처치" : "라운드 상한으로 끝"} · 처치 ${kills.length}마리</div>${order.map(s => `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${V.score[s]}점</b> · 막타 ${by[s]}번${V.pieces[s] ? ` · 🧩${V.pieces[s]}` : ""}</div>`).join("")}</div>`;
  }
  const actText = (a, V) => {
    if (!a) return "—";
    const f = x => `전장 ${x + 1}${V && V.field && V.field[x] ? " " + MON[V.field[x].i].nm : ""}`;
    return `${f(a.f)}${a.f2 != null ? ` + ${f(a.f2)}` : ""} · ${W(a.w)}`;
  };
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !K.judge) return null;
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    const d = J.best.u - J.my.u;
    return { sev: Math.max(0, Math.min(100, Math.round(d * 14))), why: `내 수(${actText(myA, V)}): 막타 확률 ${pc(J.my.kill)} · 기대 ${J.my.u.toFixed(1)}점 / 추천(${actText(bestA, V)}): 막타 확률 ${pc(J.best.kill)} · 기대 ${J.best.u.toFixed(1)}점` };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const F = (arr, o) => `<div class="hw-tut"><div class="hw-field">${arr.map((m, f) => monHtml(m, f, o && o(m, f))).join("")}</div></div>`;
    const mm = (i, est) => ({ i, u: i, max: MON[i].hp, est: est || 0, mp: 0, mi: false });
    return [
      { tag: "STEP 1 · 목표", title: "몬스터의 마지막 일격을 노려요", body: "전장에 서 있는 <b>몬스터 3마리</b>를 때려 쓰러뜨려요. 몬스터의 <b>체력 = 처치 승점</b> — <b>마지막 일격</b>을 넣은 사람이 그 승점과 <b>전리품</b>을 가져가요. 몬스터가 모두 쓰러지면 끝, 승점이 가장 높은 사람이 1등!",
        boardHtml: F([mm(0, 5), mm(1, 9), mm(2, 15)]), ms: 6800 },
      { tag: "STEP 2 · 순서", title: "모두 몰래 정하고 순서대로 적용", body: "승점 <b>5점 + 단검(공격 3)</b>으로 시작해요. 라운드마다 모두가 <b>전장 번호 + 무기 1개</b>를 몰래 내고, <b>승점이 높은 순서</b>대로 차례차례 적용돼요. 몬스터의 <b>남은 체력도 남의 선택도 끝까지 비공개</b> — 처치와 막타만 공개돼요.",
        boardHtml: `<div class="hw-tut"><div class="hw-top"><span class="hw-ord"><em>순서</em><span class="o me">1 나</span><span class="o">2 AI1</span><span class="o">3 AI2</span></span></div><small>낸 전장 · 무기는 모두 낸 뒤에야 공개돼요</small></div>`, ms: 7000 },
      { tag: "STEP 3 · 무기", title: "특수 무기는 전리품으로", body: "단검은 늘 돌려받아요. 몬스터를 처치하면 <b>🧨수류탄(6) · ⚔️쌍검(4, 두 전장이면 각 2) · ☠️독(1 + 모든 순서마다 1) · 🧊얼음(3 + 내 다음 순서까지 피해 면역) · 💣시한폭탄(내 다음 라운드에 10)</b> 같은 특수 무기를 얻고, 쓰면 사라져요.",
        boardHtml: `<div class="hw-tut"><div class="hw-ws" style="width:100%">${["dagger"].concat(K.SPECIAL).map(w => `<span class="hw-w"><span class="e">${WP[w].em}</span>${WP[w].nm}<small>${WP[w].dmg}</small></span>`).join("")}</div></div>`, ms: 7600 },
      { tag: "STEP 4 · 직접", title: "막타 자리를 찾아요", body: "잭오랜턴은 <b>최대 체력 5</b>이고 내가 앞서 단검(3)으로 한 번 때렸어요 (내 공격 3). 남은 체력은 안 보이지만 한 번 더 때리면 쓰러질 수 있어요! 잭오랜턴을 눌러 <b>공격!</b>",
        interactive: { hint: "👆 전장 1 을 누르고 공격!", doneText: "✅ 마지막 일격! 승점 +5 · ☠️독 획득" },
        render(stage, ctrl) {
          let f = null, done = false;
          const draw = () => {
            stage.innerHTML = `<div class="hw-tut">${F([mm(0, 3), mm(1, 0), mm(2, 0)], (m, i) => ({ pick: !done, sel: f === i }))}<div class="note" style="font-size:12.5px;color:var(--soft)">${done ? "🎃 처치! 승점 5 → 10 · ☠️독 획득" : f == null ? "공격할 전장을 눌러요" : "전장 " + (f + 1)}</div><button class="btn primary" data-a="go" ${f == null || done ? "disabled" : ""} style="width:100%">공격!</button></div>`;
          };
          stage.onclick = e => {
            const m = e.target.closest(".hw-mon.pick"); if (m) { ctrl.sfx("tap"); f = +m.dataset.f; draw(); return; }
            const b = e.target.closest("[data-a=go]"); if (b && !b.disabled) { ctrl.sfx("pop"); if (f === 0) { done = true; draw(); ctrl.complete(); } else { f = null; draw(); } }
          };
          draw();
        } },
      { tag: "STEP 5 · 끝", title: "승점이 가장 높은 사람이 1등", body: "몬스터가 모두 쓰러지면 승점이 가장 높은 사람이 이겨요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 막타 확률을 계산해 줘요.",
        boardHtml: `<div class="hw-tut"><span style="font-size:44px">🏆</span></div>`, ms: 5200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.halloween = {
    name: "핼러윈 몬스터", emoji: "🎃", short: "몬스터의 마지막 일격을 노려요", min: 3, max: 6, defN: 4, board: false, src: SRC, diff: DIFF,
    opts: [{ k: "mons", label: "몬스터", items: [["fit", "인원에 맞춰 (빠르게)"], ["all", "13마리 전부 (방송 그대로)"]], def: "fit" }],
    howto: [
      "방송: 몬스터 체력 = 처치 승점, <b>마지막 일격</b>을 넣은 사람이 승점 + 전리품(특수 무기)을 가져가요 (전장 3칸 + 대기열)",
      "승점 5 · 단검(공격 3)으로 시작 · 라운드마다 <b>전장 번호 + 무기 1개</b>를 몰래 내요",
      "<b>승점 높은 순서</b>대로 적용 (같으면 첫 라운드는 추첨, 이후엔 지난 라운드에 먼저 공격한 사람이 뒤로) · 몬스터 남은 체력 · 남의 선택은 <b>끝까지 비공개</b> — 처치와 마지막 공격자만 공개돼요",
      "무기: 🧨수류탄 6 · ⚔️쌍검 4(두 곳이면 각 2) · ☠️독(모든 순서마다 1) · 🧊얼음(다음 순서까지 면역) · 💣시한폭탄(다음 라운드 10)",
      "몬스터가 모두 쓰러지면 끝 — 승점 1등이 승리 (같으면 공동 1위) · 마지막 몬스터 💀사신은 체력 20 · 피스 2개",
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.cap} 라운드 · ${V.phase === "pick" ? "공격 고르기" : "결과"}`),
    chip: (V, i) => ({ t: `${V.score[i]}점${V.pieces[i] ? `🧩${V.pieces[i]}` : ""}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

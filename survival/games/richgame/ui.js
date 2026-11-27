/* 베니 서바이벌 · 부자 게임 — 화면 (종목 네 칸 · 칩 걸기 · 가격표 · 아이템 · 선생님 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const G = window.SVCores["richgame"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const { NC, NR, CHIPS, KIND, CODE } = G;
  const ICON = ["🏢", "🪙", "🛢️", "📈"];
  const SRC = "방송: 피의 게임 시즌 1 6일차 메인 매치 부자 게임 — 나무위키 '피의 게임(시즌 1)/6일차' 문서 룰 · 가격표 R1~R5 · 종목 정체 확인";
  const DIFF = "인원은 3~6명 (방송 인원은 문서에 없음, 지하층은 따로 참가) · 칩 교환 · 양도(정치 요소)는 폰에서 못 해 뺐어요 · 아이템은 개인 자금으로 사지 않고 등락 정보 · 정보 공개권을 한 장씩 줘요 (정보 공개권은 방송 가격 모드에서 종목 정체를 알려 주고, 새 시세 모드에서는 변동 크기를 알려 줘요) · 등락 정보는 2라운드부터 (첫 라운드는 비교할 지난 가격이 없음) · 폭등 = 지난 라운드의 1.4배 이상 · 상승 · 하락 · 폭락 = 0.6배 이하 (기준은 우리가 정함) · 개인 자금 칩 구입은 없어요 · 라운드가 끝나면 모두의 입찰을 공개해요 (방송은 입찰이 비공개) · 가격은 그 라운드가 끝나야 공개되고 지난 가격만 보여요 (방송은 라운드 기준 시점 가격을 조건 없이 보여 준다는 글이 없어 이렇게 읽음) · 집계는 얻은 금액만 (방송 개인 자금은 안 셈) · 기본은 방송 시세 5라운드 — 실제 시세라 종목 정체(세종시 아파트 · 리플 · 휘발유 · 남양유업)를 아는 사람이 유리했지만 우리 판에선 정체를 모르고 가격 흐름만 보고 걸어서 알맹이가 '칩 나누기'에 가까워요 · '새 시세'는 종목마다 무작위 가격 경로 (변동 작음 · 보통 · 큼이 섞임)";
  const CSS = `
.rg-top{flex:none;display:flex;justify-content:space-between;align-items:center;font:800 12.5px var(--round);color:var(--soft);gap:6px}
.rg-top b{color:#fde68a}
.rg-cols{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.rg-col{display:grid;grid-template-rows:auto auto 1fr;gap:3px;border-radius:12px;padding:4px 3px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.12);min-width:0;text-align:center}
.rg-col.pk{border-color:#fde68a;cursor:pointer}
.rg-hd{font:900 14px var(--round);color:#e2e8f0;line-height:1.2;background:none;border:0;padding:0;cursor:default}
.rg-hd small{display:block;font:700 10px var(--round);color:var(--soft)}
.rg-hist{display:grid;gap:1px;font:700 10.5px/1.25 var(--round);color:var(--soft);font-variant-numeric:tabular-nums}
.rg-hist span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rg-hist .w{color:#86efac}.rg-hist .u{color:#64748b}.rg-hist .cur{color:#fde68a}
.rg-ctl{display:grid;grid-template-rows:44px 28px 44px;gap:2px;align-self:end}
.rg-ctl button{height:44px;border-radius:10px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 20px var(--round);cursor:pointer;padding:0}
.rg-ctl button.m{background:rgba(255,255,255,.12);color:#e2e8f0;border:1px solid rgba(255,255,255,.2)}
.rg-ctl button:disabled{opacity:.3}
.rg-ctl .n{display:flex;align-items:baseline;justify-content:center;gap:3px;font:900 20px var(--round);color:#fde68a;line-height:28px;white-space:nowrap;overflow:hidden}
.rg-ctl .n small{font:700 9.5px var(--round);color:var(--soft)}
.rg-st{flex:none;min-height:34px;display:grid;place-items:center;text-align:center;font:700 12.5px/1.35 var(--round);color:var(--soft);padding:0 2px}
.rg-st b{color:#fde68a}.rg-st .ok{color:#86efac}.rg-st .no{color:#fca5a5}
.rg-act{flex:none;display:grid;gap:6px}
.rg-row{display:flex;gap:6px}
.rg-row button{flex:1;min-width:0;height:46px;border-radius:13px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 14.5px var(--round);cursor:pointer;padding:0 6px;line-height:1.15}
.rg-row button.sub{background:rgba(255,255,255,.1);color:#e2e8f0;border:1px solid rgba(255,255,255,.2)}
.rg-row button.on{background:linear-gradient(#a78bfa,#7c3aed);color:#fff}
.rg-row button:disabled{opacity:.35}
.rg-res{border-radius:12px;padding:6px 10px;font:800 13px/1.4 var(--round);text-align:center}
.rg-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.rg-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.rg-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.rg-rank{display:grid;gap:2px;font:700 12px var(--round);color:#e2e8f0;text-align:left;padding:2px 6px}
.rg-rank div{display:flex;justify-content:space-between;gap:8px}
.rg-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.rg-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.rg-tmsg b{color:#fde68a}
.rg-tut .rg-row{width:100%}
@media (max-height:650px){.rg-ctl{grid-template-rows:40px 24px 40px}.rg-ctl button{height:40px}.rg-st{min-height:30px;font-size:12px}.rg-hist{font-size:10px}}
.sv-coachfit .rg-ctl{grid-template-rows:34px 22px 34px}.sv-coachfit .rg-ctl button{height:34px}
.sv-coachfit .rg-hist{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는"), eul = w => (hasFinal(w) ? "을" : "를");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const pct = x => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  const eok = m => `${Math.round(m / 100) / 100}억`, eokS = eok;
  const short = s => { const t = String(s); return t.length > 3 ? t.slice(0, 3) : t; };
  const TRD = { surge: "🚀 폭등", up: "🔼 상승", down: "🔽 하락", crash: "💥 폭락" };

  function actText(a) {
    if (!a || typeof a !== "object") return "";
    if (a.t === "bid") return a.bids.map((b, c) => `${CODE[c]} ${b}`).join(" · ");
    if (a.t === "item") return `${a.k === "trend" ? "등락 정보" : "정보 공개권"} → ${CODE[a.c]} 종목`;
    return "";
  }

  const S = { pk: "", draft: [0, 0, 0, 0], pick: "", sent: 0, ctx: null, V: null, stage: null };
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return false;
    if (S.sent && Date.now() - S.sent < 500) return false;
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); return false; }
    c.sfx("pop"); return true;
  }
  const lastRound = V => (V.hist.length ? V.hist[V.hist.length - 1] : null);

  function resultHtml(V, me, nameFn) {
    const order = V.money.map((m, s) => ({ s, m })).sort((a, b) => b.m - a.m || a.s - b.s);
    const rows = order.map(x => `<div><span>${V.ranks[x.s] + 1}등 ${esc(nameFn(x.s))}</span><b>${eok(x.m)}</b></div>`).join("");
    return `<div class="rg-rank">${rows}</div>`;
  }

  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || !(me >= 0 && me < V.n);
    const can = !!ctx.canAct && !watch && !V.over && (V.needs || []).includes(me);
    const pk = `${ctx.g}|${me}|${V.round}`;
    if (pk !== S.pk) { S.pk = pk; S.draft = [0, 0, 0, 0]; S.pick = ""; S.sent = 0; }
    const nm = i => (!watch && i === me ? "나" : nameOf(ctx, i));
    const subj = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const lr = lastRound(V), done = V.done || [];
    const myIntel = V.intel || [];
    // 종목 칸
    const intelOf = c => myIntel.filter(e => e.c === c && (e.r === V.round || e.k === "id"));
    let cols = "";
    for (let c = 0; c < NC; c++) {
      const hist = V.hist.map(h => { const w = h.win[c]; return `<span class="${w === me && !watch ? "w" : w < 0 ? "u" : ""}">${eokS(h.prices[c])}${w >= 0 ? " " + esc(short(nm(w))) : " 유찰"}</span>`; }).join("");
      const itx = intelOf(c).map(e => `<span class="cur">${e.k === "trend" ? TRD[e.v] : "🔎 " + esc(e.text)}</span>`).join("");
      const left = V.chips[me >= 0 ? me : 0][c];
      const pickable = can && !!S.pick && !done[me];
      const ctl = can && !done[me] ? `<div class="rg-ctl"><button type="button" data-p="${c}" aria-label="${CODE[c]} 칩 늘리기"${S.draft[c] >= left ? " disabled" : ""}>＋</button><div class="n">${S.draft[c]}<small>/ 남은 ${left}</small></div><button type="button" class="m" data-m="${c}" aria-label="${CODE[c]} 칩 줄이기"${S.draft[c] <= 0 ? " disabled" : ""}>－</button></div>` : `<div class="rg-ctl"><div></div><div class="n">${V.mine && !watch ? V.mine[c] : "·"}<small>/ 남은 ${left}</small></div><div></div></div>`;
      cols += `<div class="rg-col${pickable ? " pk" : ""}" data-c="${c}"><button type="button" class="rg-hd" data-hd="${c}"${pickable ? "" : " tabindex=-1"}>${CODE[c]} ${ICON[c]}<small>${KIND[c]}</small></button><div class="rg-hist">${hist}<span class="cur">${V.over ? "" : `R${V.round + 1} ?`}</span>${itx}</div>${ctl}</div>`;
    }
    let st = "", actH = "";
    // 직전 라운드 결과
    let lastTxt = "";
    if (lr) lastTxt = `R${lr.r + 1} 결과: ` + [0, 1, 2, 3].map(c => `${CODE[c]} ${lr.win[c] >= 0 ? `<b>${esc(short(nm(lr.win[c])))}</b>(${lr.wb[c]}칩)` : "유찰"}`).join(" · ");
    if (V.over) {
      const order = V.ranks, w = V.money.indexOf(Math.max(...V.money)), ok = !watch && V.ranks[me] === 0;
      st = `<div class="rg-res ${watch || ok ? "ok" : "no"}">${watch ? `🏆 ${esc(nm(w))} 우승` : ok ? "🏆 내가 1등이에요!" : `내 순위 ${V.ranks[me] + 1}등 — 1등은 ${esc(nm(w))}`} (${eok(Math.max(...V.money))})<small>종목 정체: ${V.ident.map((x, c) => `${CODE[c]} ${esc(x)}`).join(" · ")}</small></div>${resultHtml(V, me, nm)}`;
      void order;
    } else if (can) {
      const used = S.draft.reduce((a, b) => a + b, 0);
      st = `<span>${lastTxt ? lastTxt + "<br>" : ""}<b>R${V.round + 1}</b> — 종목마다 칩을 걸어요${S.pick ? ` · <b>${S.pick === "trend" ? "등락 정보" : "정보 공개권"}</b> 쓸 종목을 눌러요` : ""}</span>`;
      const it = V.items[me] || {};
      const ib = (k, lab, dis) => `<button type="button" class="sub${S.pick === k ? " on" : ""}" data-it="${k}"${it[k] > 0 && !dis ? "" : " disabled"}>${lab}</button>`;
      actH = `<div class="rg-row">${V.opt.items ? ib("trend", `📈 등락 정보 ${it.trend || 0}`, V.round < 1) + ib("id", `🔎 정보 공개권 ${it.id || 0}`, false) : ""}</div><div class="rg-row"><button type="button" data-a="bid">걸기 확정 (칩 ${used}개)</button></div>`;
    } else if (watch) st = `<span>${lastTxt ? lastTxt + "<br>" : ""}R${V.round + 1} 입찰 중… (${done.filter(x => x).length}/${V.n}명 걸었어요)</span>`;
    else st = `<span>${lastTxt ? lastTxt + "<br>" : ""}✅ 걸었어요 — 다른 사람 ${V.n - done.filter(x => x).length}명을 기다려요</span>`;
    const topline = `<div class="rg-top"><span>라운드 <b>${Math.min(V.round + 1, NR)}</b> / ${NR}</span><span>내 금액 <b>${!watch ? eok(V.money[me]) : "—"}</b></span></div>`;
    stage.innerHTML = V.over ? `${topline}<div class="rg-st">${st}</div><div class="rg-cols">${cols}</div>` : `${topline}<div class="rg-cols">${cols}</div><div class="rg-st">${st}</div>${actH ? `<div class="rg-act">${actH}</div>` : ""}`;
    stage.onclick = e => {
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.over) return;
      const t = e.target.closest("[data-p],[data-m],[data-a],[data-it],[data-hd],.rg-col.pk"); if (!t || t.disabled) return;
      const rr = () => render(stage, VV, c), left = k => VV.chips[c.me][k];
      if (t.dataset.p != null) { const k = +t.dataset.p; if (S.draft[k] < left(k)) S.draft[k]++; c.sfx("tap"); rr(); return; }
      if (t.dataset.m != null) { const k = +t.dataset.m; if (S.draft[k] > 0) S.draft[k]--; c.sfx("tap"); rr(); return; }
      if (t.dataset.it) { S.pick = S.pick === t.dataset.it ? "" : t.dataset.it; c.sfx("tap"); rr(); return; }
      if (t.dataset.a === "bid") { send({ t: "bid", bids: S.draft.slice() }); return; }
      const col = t.closest("[data-c]"); if (S.pick && col) { const k = S.pick, cc = +col.dataset.c; S.pick = ""; send({ t: "item", k, c: cc }); }
    };
  }

  // ── 선생님 (보이는 것만 — 지난 가격 · 모두의 지난 입찰 · 내 칩) ──
  function coach(V, me, since, names) {
    void since;
    if (!(me >= 0 && me < V.n)) me = V.needs && V.needs.length ? V.needs[0] : 0;
    const raw = i => (i === me ? "나" : String((Array.isArray(names) && names[i]) || `${i + 1}번`)), nmx = i => esc(raw(i));
    const rank = V.money.filter(m => m > V.money[me]).length + 1;
    if (V.over) return { opp: `1등 ${eok(Math.max(...V.money))}`, mine: `내 금액 ${eok(V.money[me])} (${rank}등)`, rec: "끝났어요.", why: `종목 정체: ${V.ident.map((x, c) => `${CODE[c]} ${x}`).join(" · ")}` };
    const lr = lastRound(V);
    let opp;
    if (lr) {
      const wins = [...Array(V.n).keys()].map(p => ({ p, n: lr.win.filter(w => w === p).length })).filter(x => x.n).map(x => `${nmx(x.p)} ${x.n}종목`).join(" · ");
      const top = [0, 1, 2, 3].map(c => `${CODE[c]} ${lr.wb[c]}칩`).join(" · ");
      opp = `직전 R${lr.r + 1}: 낙찰 ${wins || "없음"} (이긴 칩 ${top}) — 평균 입찰이 높은 종목은 경쟁이 세요.`;
    } else opp = "아직 지난 입찰이 없어요 — 이번 라운드는 남들이 얼마나 걸지 모르니 보통 1~3칩 사이가 많아요 (같은 칩이 가장 많으면 그 입찰은 무효!).";
    const spent = [0, 1, 2, 3].map(c => CHIPS - V.chips[me][c]);
    const mine = `내 금액 ${eok(V.money[me])} (${rank}등) · 남은 칩 ${V.chips[me].map((x, c) => `${CODE[c]} ${x}`).join(" · ")} (쓴 칩 ${spent.reduce((a, b) => a + b, 0)}개)`;
    if (!(V.needs || []).includes(me)) return { opp, mine, rec: "다른 사람을 기다려요.", why: "모두 걸면 이번 라운드 가격이 공개돼요." };
    const a = G.ai(V, me, "hard", () => 0.5);
    let rec = "", why = "";
    if (a && a.t === "item") { rec = `${actText(a)}`; why = `2라운드부터 등락 정보로 ${CODE[a.c]} 종목(지난 가격 ${eokS(V.hist[V.hist.length - 1].prices[a.c])})이 오를지 내릴지 미리 알면 칩을 어디에 쓸지 정하기 쉬워요 — 아이템은 한 번뿐.`; }
    else if (a && a.t === "bid") {
      const A = G.analyze(V, me);
      rec = A.bids.map((b, c) => `${CODE[c]} ${b}`).join(" · ");
      why = A.det.filter(d => d.best > 0).map(d => `${CODE[d.c]}: 기대 가격 ${eokS(d.ep)} · ${d.best}칩이면 이길 확률 ~${pct(d.wp[d.best])}`).join(" / ") || "이번 라운드는 이길 확률 대비 칩이 아까워 아껴요 (칩은 돌려받지 못해요).";
    }
    return { opp, mine, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    if (!Vb || !myA || !bestA) return { sev: 0, why: "", my, best };
    if (JSON.stringify(myA) === JSON.stringify(bestA)) return { sev: 0, why: "고급 AI와 같은 수", my, best };
    if (myA.t === "item" || bestA.t === "item") return { sev: myA.t === "item" ? 10 : 25, why: "아이템은 한 번뿐이라 쓰는 때가 중요해요 (고급 AI는 2 · 4라운드 가격이 큰 종목에 써요)", my, best };
    const em = G.evalBids(Vb, seat, myA.bids), eb = G.evalBids(Vb, seat, bestA.bids), d = eb.ev - em.ev;
    const worst = em.rows.slice().sort((x, y) => (eb.rows[y.c].v - y.v) - (eb.rows[x.c].v - x.v))[0];
    return { sev: Math.max(0, Math.min(90, Math.round((d / 10000) * 70))), why: `기대 이득 내 걸기 ${eokS(em.ev)} · 고급 AI ${eokS(eb.ev)} (${worst ? `${CODE[worst.c]} 종목 ${worst.b}칩 → 이길 확률 ${pct(worst.p)} / 고급 ${eb.rows[worst.c].b}칩 ${pct(eb.rows[worst.c].p)}` : ""})`, my, best };
  }

  function result(V, me) {
    const w = V.money.indexOf(Math.max(...V.money)), nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    return `${me >= 0 && V.ranks[me] === 0 ? "🏆 내가 1등이에요" : `🏆 ${nm(w)} 1등`} (${eok(Math.max(...V.money))}) — 내 금액 ${me >= 0 ? eok(V.money[me]) : "—"}<br>종목 정체: ${V.ident ? V.ident.map((x, c) => `${CODE[c]} ${x}`).join(" · ") : ""}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const col = (c, extra) => `<div class="rg-col" style="min-width:76px"><div class="rg-hd">${CODE[c]} ${ICON[c]}<small>${KIND[c]}</small></div><div class="rg-hist">${extra || ""}</div></div>`;
    const tb = x => `<div class="rg-tut">${x}</div>`;
    const cols4 = `<div class="rg-cols" style="width:100%">${[0, 1, 2, 3].map(c => col(c, `<span>칩 ${CHIPS}개</span>`)).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "5라운드 뒤 금액이 가장 많은 사람이 승리", body: "<b>부자 게임</b> — 종목에 칩을 걸어 이기면 그 종목의 <b>금액</b>을 가져요. 5라운드를 마치고 <b>가진 금액이 가장 많은 사람</b>이 우승해요.",
        boardHtml: tb(`<div class="rg-res ok">🏆 5라운드 뒤 금액이 가장 많은 사람</div>`), ms: 5000 },
      { tag: "STEP 2 · 준비물", title: "종목 4개 · 종목별 칩 10개", body: "종목은 <b>A 부동산 · B 가상화폐 · C 현물 · D 주식</b> (정체는 끝에 공개). 각자 <b>종목마다 칩 10개</b>씩 받고, 그 칩은 <b>그 종목에만</b> 걸 수 있어요. 쓴 칩은 <b>돌려받지 못해요</b>.",
        boardHtml: tb(cols4), ms: 6000 },
      { tag: "STEP 3 · 진행", title: "동시에 걸고 → 가격이 공개돼요", body: "라운드마다 종목에 <b>칩을 몇 개 걸지</b> 정해요 (0개도 되고 모두 비공개로 동시에). 다 걸면 그 라운드 <b>가격</b>이 공개되고, 종목마다 <b>칩을 가장 많이 건 사람</b>이 그 종목 금액을 가져요.",
        boardHtml: tb(cols4), ms: 6200 },
      { tag: "STEP 4 · 직접", title: "경쟁자보다 많이 걸어 보세요", body: "A 종목에 경쟁자 둘이 <b>2칩</b>과 <b>3칩</b>을 걸었어요. 내가 몇 칩을 걸면 A 를 가져올까요?",
        interactive: { hint: "👆 칩 개수를 눌러요", doneText: "✅ 가장 많이 걸어 A 를 가져요!" },
        render(stage, ctrl) {
          let done = false, msg = "칩 개수를 골라요 (경쟁자: 2칩 · 3칩)";
          const draw = () => { stage.innerHTML = `<div class="rg-tut">${col(0, "<span>가격 5.7억</span>")}<div class="rg-row">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="sub" data-bid="${n}">${n}칩</button>`).join("")}</div><div class="rg-tmsg">${msg}</div></div>`; };
          stage.onclick = e => {
            if (done) return; const t = e.target.closest("[data-bid]"); if (!t) return;
            const n = +t.dataset.bid;
            if (n >= 4) { done = true; msg = `🎉 ${n}칩이 가장 많아서 A 의 <b>5.7억</b>을 가져요!`; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
            msg = n === 3 ? "3칩은 경쟁자의 3칩과 <b>같아서 무효</b> → 차순위 2칩이 가져가요. 다시!" : `${n}칩은 3칩보다 적어서 경쟁자가 가져가요. 다시!`; ctrl.sfx("tap"); draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "금액 합계가 가장 큰 사람", body: "5라운드 뒤 <b>얻은 금액의 합</b>이 가장 많은 사람이 승리. 끝나면 종목 <b>정체</b>(부동산 · 코인 · 현물 · 주식이 뭐였는지)가 공개돼요.",
        boardHtml: tb(`<div class="rg-res ok">A 5.7억 + C 6.19억 … 합계 비교</div>`), ms: 5600 },
      { tag: "STEP 6 · 특수 규칙", title: "같은 칩은 무효 · 아이템", body: "가장 많은 칩이 <b>같으면 그 입찰은 무효</b> → 차순위 입찰자가 가져요 (없으면 <b>유찰</b>). 칩이 없어도 차례는 넘어가요. 아이템 <b>등락 정보</b>(고른 종목이 이번 라운드 오르내릴지)와 <b>정보 공개권</b>(종목 정체)은 한 번씩 써요.",
        boardHtml: tb(`<div class="rg-res ok">🚀 폭등 · 🔼 상승 · 🔽 하락 · 💥 폭락</div>`), ms: 6200 },
    ];
  }

  function qa(V, me, rnd) { return G.ai(V, me, "normal", rnd); }

  window.SVUI = window.SVUI || {};
  window.SVUI["richgame"] = {
    name: "부자 게임", emoji: "💰", short: "종목에 칩을 걸어 금액을 가져와요 — 5라운드 뒤 가장 부자가 승리", min: 3, max: 6, defN: 4, board: false, fitCoach: true,
    opts: [
      { k: "mode", label: "시세", items: [[0, "방송 시세 (R1~R5 가격표)"], [1, "새 시세 (무작위 경로)"]], def: 0 },
      { k: "items", label: "아이템", items: [[1, "등락 정보 · 정보 공개권"], [0, "없음"]], def: 1 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 5라운드 동안 종목에 칩을 걸어 금액을 가져와, 가진 금액이 가장 많은 사람이 승리 (피의 게임 시즌 1 6일차 메인 매치)",
      "준비물: 종목 4개 — <b>A 부동산 · B 가상화폐 · C 현물 · D 주식</b> (정체는 끝에 공개) · 각자 <b>종목마다 칩 10개</b> (그 종목에만 걸 수 있고, 쓴 칩은 돌려받지 못함)",
      "진행: 라운드마다 모두 동시에 · 비공개로 종목마다 칩을 걸어요 (0개도 됨, 칩이 없어도 참여) → 그 라운드 <b>가격</b>이 공개되고, 종목마다 <b>칩을 가장 많이 건 사람</b>이 그 종목의 금액을 가져요",
      "승패: 5라운드 뒤 <b>얻은 금액의 합</b>이 가장 많은 사람이 승리 — 끝나면 종목 정체 공개 (세종시 아파트 33평 · 리플 40만 개 · 휘발유 45,000L · 남양유업 14,000주)",
      "특수: 가장 많은 칩이 <b>같으면 그 입찰은 무효</b> → 차순위 입찰자가 가져가요 (차순위가 없으면 유찰) · 아이템 <b>등락 정보</b>(고른 종목의 이번 라운드 등락: 폭등 · 상승 · 하락 · 폭락, 2라운드부터)와 <b>정보 공개권</b>(종목 정체)은 한 번씩",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `라운드 ${V.round + 1}/${NR}`),
    chip: (V, i) => ({ t: eokS(V.money[i]), on: !V.over && (V.needs || []).includes(i), out: !!(V.over && V.ranks[i] > 0) }),
    render, coach, result, tutorial, review, actText, qa,
  };
})();

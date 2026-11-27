/* 베니 서바이벌 · 동물원 — 화면 (5×5 중력 판 · A/B 타일 · 크레딧 경매 · 조합 순서 · 개인 조건 · 낙찰 · 배치 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.zoo, SP = K.SP, COND = K.COND;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 데블스 플랜 시즌 1 · 4일차 메인 매치 (9명) · 규칙 확인: 나무위키 4일차 문서 (룰 · 크레딧 경매 · 낙찰 규칙 · 점수 · 라운드 기록, 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "3~6명 (방송 9명) · 입찰은 모두 동시에 몰래 (방송은 한 명씩 차례로, 정순 · 역순을 번갈아 해서 뒤 사람이 앞 사람 눈치를 보는 전략이 있었는데 그 맛이 빠짐) · 배치 방식은 방송 원문상 입찰할 때 함께 정하는 것으로 읽히지만 우리는 낙찰된 뒤 타일을 골라 놓음 · 대화 · 동맹 · 도와주기 · 피스 증감 없음 (순위만) · 카드 3장 순서와 공개할 1장은 내가 고름 · 개인 조건 10종은 우리가 만든 'A 타일이 B 타일보다 많다' 10개 · 타일은 상자(A · B)마다 5종 × 4개 = 20개씩 5라운드 (방송 글이 '박스마다 20개' 와 '합쳐 20개' 로 엇갈려 '박스마다 20개' 로 함 · 판 25칸에 낙찰 타일 20개) · 무효(합이 같거나 낙찰 그룹 최고액이 같음)는 한 라운드에서 두 번까지 다시 하고 세 번째도 무효면 타일을 버림 · 한 그룹에만 걸렸으면 그 그룹이 낙찰 · 크레딧이 0 이면 그 라운드는 쉼 · 같은 조합 줄은 한 번만 셈 · 낙찰 승자의 정체는 끝까지 비공개 (끝나면 공개) · 같은 조합 줄은 한 번만 세는 것은 원문에 없는 우리 해석 · 한계: 타일 추첨 · 숨은 조합이 운이라 인원이 많을수록 0점 동률이 많아요";
  const CSS = `
.zo-top{display:flex;align-items:center;gap:4px;flex:none;flex-wrap:wrap}
.zo-rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.zo-chip{font:800 12px var(--round);border-radius:99px;padding:2px 7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);white-space:nowrap}
.zo-main{display:flex;gap:8px;align-items:flex-start;flex:none}
.zo-board{display:grid;grid-template-columns:repeat(5,var(--cz,30px));gap:2px;padding:4px;border-radius:12px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.14);flex:none}
.zo-c{width:var(--cz,30px);height:var(--cz,30px);border-radius:7px;background:rgba(255,255,255,.07);display:grid;place-items:center;font-size:calc(var(--cz,30px) * .6);line-height:1;padding:0;border:0;color:#fff}
.zo-c.pick{background:rgba(245,179,1,.16);cursor:pointer}
.zo-c.last{box-shadow:inset 0 0 0 2px #fde68a}
.zo-side{display:grid;gap:6px;flex:1 1 0;min-width:0}
.zo-box{border-radius:12px;padding:5px 6px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.14);color:#fff;font:800 12px var(--round);display:grid;gap:3px;text-align:left}
.zo-box.sel{border-color:#fde68a;background:rgba(245,179,1,.14)}
.zo-box.win{border-color:#86efac;background:rgba(34,197,94,.1)}
.zo-box .t{display:flex;flex-wrap:wrap;justify-content:center;gap:1px 3px;font-size:20px;line-height:1.15;text-align:center}
.zo-box .h{display:flex;justify-content:space-between;color:var(--soft);font-size:11.5px}
.zo-me{display:flex;flex-direction:column;gap:5px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:6px 8px;flex:none}
.zo-me .hd{font:700 12.5px/1.35 var(--round);color:#bbf7d0}.zo-me .hd b{color:#fff}
.zo-seq{display:flex;gap:6px;align-items:center;justify-content:center;font-size:26px}
.zo-seq i{font-style:normal;font-size:14px;color:var(--soft)}
.zo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.zo-cd{border-radius:12px;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;justify-items:center;gap:2px;padding:6px 2px;font:800 12px var(--round);min-height:70px}
.zo-cd .e{font-size:28px;line-height:1}
.zo-cd.show{border-color:#fde68a;background:rgba(245,179,1,.16)}
.zo-cd .mv{display:flex;gap:8px;font-size:15px}
.zo-cd .mv span{padding:3px 8px;border-radius:8px;background:rgba(255,255,255,.1)}
.zo-bid{display:grid;grid-template-columns:auto 1fr auto auto;gap:6px;align-items:center}
.zo-bid button.s{width:36px;height:36px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:900 20px var(--round)}
.zo-bid .v{text-align:center;font:900 22px var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.zo-q{display:flex;gap:6px;justify-content:center}
.zo-q button{width:42px;height:42px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);font-size:28px;line-height:1;padding:0}
.zo-q button.on{border-color:#fde68a;background:rgba(245,179,1,.2)}
.zo-quick{display:flex;gap:6px;justify-content:center}
.zo-quick button{min-height:34px;padding:0 10px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:700 12px var(--round)}
.zo-go{min-height:38px;padding:6px;font-size:15px}
.zo-wait{text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.zo-rv{display:flex;flex-wrap:wrap;max-height:20px;overflow:hidden;gap:4px;flex:none;font:700 11.5px var(--round);color:var(--soft)}
.zo-rv span{border-radius:99px;padding:1px 6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);white-space:nowrap}
.zo-rv span.me{color:#86efac;border-color:#86efac}
.zo-res{font:700 12.5px/1.45 var(--round);text-align:center;color:#fff}
.zo-tbl{display:grid;gap:3px;font:700 12px var(--round);flex:none}
.zo-tbl .r{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.5fr) 1fr 30px;gap:4px;align-items:center;padding:3px 6px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.zo-tbl .r.me{border-color:#86efac}.zo-tbl .r b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zo-tbl .r .p{font:900 14px var(--round);color:#fde68a;text-align:right}
.zo-tut{display:grid;gap:8px;justify-items:center;width:100%}
.zo-tut .opt{display:flex;gap:8px;justify-content:center}
.zo-tut .opt button{min-width:96px;min-height:46px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:900 16px var(--round)}
.sv-coachfit .zo-board{--cz:28px;padding:3px}.sv-coachfit .zo-main{flex-direction:column;align-items:stretch;gap:4px}.sv-coachfit .zo-side{grid-template-columns:1fr 1fr;gap:6px;width:100%;flex:none}.sv-coachfit .zo-side .zo-box{flex:1;padding:3px 5px}.sv-coachfit .zo-box .t{font-size:17px}.sv-coachfit .zo-board{align-self:center}.sv-coachfit .zo-bid button.s{width:34px;height:34px}.sv-coachfit .zo-go{min-height:34px;padding:4px}.sv-coachfit .zo-me .hd{font-size:11.5px}.sv-coachfit .zo-q button{width:36px;height:36px;font-size:22px}.sv-coachfit .zo-rv,.sv-coachfit .zo-quick{display:none}.sv-coachfit .zo-me{padding:5px 6px;gap:4px}.sv-coachfit .zo-cd{min-height:54px;padding:3px 2px}
.zo-hbtn{margin-left:4px;font:800 11.5px var(--round);padding:4px 9px;border-radius:99px;border:1px solid #fde68a;background:rgba(245,179,1,.14);color:#fde68a}`;
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const E = sp => SP[sp].em, N = sp => SP[sp].nm;
  const seqHtml = seq => `<div class="zo-seq">${seq.map((x, i) => (i ? `<i>→</i>` : "") + E(x)).join("")}</div>`;
  const condTxt = c => `${E(c[0])}${N(c[0])} 타일이 ${E(c[1])}${N(c[1])} 타일보다 많다`;
  const S = { key: "", g: null, c: 1, ord: [0, 1, 2], show: 1, tile: 0, last: null };

  function boardHtml(V, can, last) {
    let h = `<div class="zo-board">`;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const x = V.board[r][c]; h += `<button class="zo-c${can ? " pick" : ""}${last && last.r === r && last.c === c ? " last" : ""}" data-c="${c}" ${can ? "" : "tabindex=-1"}>${x == null ? "" : E(x)}</button>`; }
    return h + `</div>`;
  }
  function boxHtml(V, g, o) {
    const t = V.tiles[g];
    return `<div class="zo-box${o.sel ? " sel" : ""}${o.win ? " win" : ""}" data-g="${g}"><div class="h"><span>그룹 ${g}</span><span>${o.sum != null ? "합 " + o.sum : o.win ? "낙찰" : ""}</span></div><div class="t">${t.length ? t.map(x => `<span>${E(x)}</span>`).join("") : "·"}</div></div>`;
  }
  function revealHtml(V, ctx) {
    const me = ctx.me; if (V.phase === "setup") return "";
    return `<div class="zo-rv">${V.shown.map((x, i) => (x ? `<span class="${i === me ? "me" : ""}">${i === me ? "나" : esc(nameOf(ctx, i))} ${x.pos + 1}번째 ${E(x.sp)}</span>` : "")).join("")}</div>`;
  }
  function lastAuc(V) { for (let i = V.log.length - 1; i >= 0; i--) if (V.log[i].k === "auc" && V.log[i].r === V.round) return V.log[i]; return null; }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, m = V.mine, watch = me < 0 || !m, nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    if (V.over && V.all) return renderEnd(stage, V, ctx);
    const key = `${V.round}|${V.phase}|${V.voids}|${me}|${V.n}|${V.queue.length}`;
    if (S.key !== key) { const ph = S.key.split("|")[1]; S.key = key; if (V.phase === "bid") { S.g = null; S.c = 1; } if (V.phase === "place") S.tile = 0; if (V.phase === "setup" && ph !== "setup") { S.ord = [0, 1, 2]; S.show = 1; } }
    const placing = !watch && V.phase === "place" && m.isWin && ctx.canAct;
    const bidding = !watch && V.phase === "bid" && ctx.canAct && !m.bid && !m.skip;
    const auc = V.phase === "show" || V.phase === "place" ? lastAuc(V) : null;
    let h = `<div class="zo-top"><span class="zo-rd">${V.phase === "setup" ? "준비" : `라운드 ${V.round}/${V.rounds}`}</span>${m ? `<span class="zo-chip">💰 ${m.credits}</span>` : ""}${m && m.seq && V.phase !== "setup" ? `<span class="zo-chip" title="내 조합 · 개인 조건">${m.seq.map(E).join("")} · ${E(m.cond[0])}&gt;${E(m.cond[1])}</span>` : ""}${V.voids ? `<span class="zo-chip">무효 ${V.voids}</span>` : ""}</div>`;
    if (V.phase !== "setup") h += `<div class="zo-main">${boardHtml(V, placing, S.last)}<div class="zo-side">${boxHtml(V, "A", { sel: bidding && S.g === "A", win: auc && auc.g === "A", sum: auc ? auc.tA : null })}${boxHtml(V, "B", { sel: bidding && S.g === "B", win: auc && auc.g === "B", sum: auc ? auc.tB : null })}</div></div>`;
    h += revealHtml(V, ctx);
    let mid = "";
    if (watch) mid = `<div class="zo-wait">${V.phase === "place" ? "낙찰된 사람이 타일을 놓는 중…" : V.needs.length ? V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") + " 고르는 중…" : ""}</div>`;
    else if (V.phase === "setup") {
      if (m.ord) mid = `<div class="zo-me"><div class="hd">내 조합이 정해졌어요 ${seqHtml(m.seq)} — 다른 사람을 기다려요 (${V.subbed.filter(Boolean).length}/${V.n})</div></div>`;
      else {
        const cards = m.cards;
        mid = `<div class="zo-me"><div class="hd">카드 3장을 <b>순서대로</b> 놓아 조합을 만들어요 (이 순서로 판에 놓인 줄 1개당 1점). 카드를 눌러 <b>공개할 1장</b> 👁</div>
          <div class="zo-cards">${S.ord.map((ci, p) => `<div class="zo-cd${S.show === p ? " show" : ""}" data-show="${p}"><span class="e">${E(cards[ci])}</span>${N(cards[ci])}<span class="mv"><span data-mv="${p}:-1">◀</span><span data-mv="${p}:1">▶</span></span>${S.show === p ? "👁 공개" : "비공개"}</div>`).join("")}</div>
          <div class="hd">개인 조건 (이루면 점수 2배): <b>${condTxt(m.cond)}</b></div><button class="btn primary zo-go" data-a="combo">이 조합으로 정했어요</button></div>`;
      }
    } else if (V.phase === "bid") {
      if (m.skip) mid = `<div class="zo-me"><div class="hd">크레딧이 없어서 이번 라운드는 쉬어요 💤</div></div>`;
      else if (m.bid) mid = `<div class="zo-me"><div class="hd">그룹 ${m.bid.g}에 <b>${m.bid.c}</b> 걸었어요 — 다른 사람을 기다려요 (${V.subbed.filter(Boolean).length}/${V.n})</div></div>`;
      else if (bidding) {
        const g = S.g, c = Math.max(1, Math.min(m.credits, S.c));
        mid = `<div class="zo-me"><div class="hd"><b>그룹</b>을 눌러 고르고 몰래 걸어요 (합 적은 쪽 낙찰)</div>
          <div class="zo-bid"><button class="s" data-d="-1">−</button><div class="v">${c} <small style="font-size:12px;color:var(--soft)">/ ${m.credits}</small></div><button class="s" data-d="1">+</button><button class="s" data-set="${m.credits}" style="font-size:12px;width:52px">올인</button></div>
          <button class="btn primary zo-go" data-a="bid" ${g ? "" : "disabled"}>${g ? `그룹 ${g}에 ${c} 걸기` : "그룹을 골라요 (A · B)"}</button></div>`;
      }
    } else if (V.phase === "place") {
      if (placing) {
        const q = V.queue, t = Math.min(S.tile, q.length - 1);
        mid = `<div class="zo-me"><div class="hd"><b>내가 낙찰!</b> 타일을 골라 판의 <b>줄</b>을 눌러요 — 위에서 떨어져 아래 칸부터 쌓여요 (${q.length}개 남음)</div>
          <div class="zo-q">${q.map((sp, i) => `<button data-q="${i}" class="${i === t ? "on" : ""}">${E(sp)}</button>`).join("")}</div></div>`;
      } else mid = `<div class="zo-wait">${auc ? `그룹 ${auc.g} 낙찰 (합 ${auc.g === "A" ? auc.tA : auc.tB}) — ` : ""}낙찰된 사람이 타일을 놓는 중… (누구인지는 비밀이에요)</div>`;
    } else if (V.phase === "show") {
      const au = lastAuc(V), mine = m.bid, v = V.log.filter(e => e.k === "skip" && e.r === V.round).length;
      mid = `<div class="zo-res">${v ? "이 라운드는 무효가 세 번 나서 타일을 버렸어요" : au ? `그룹 A 합 ${au.tA} · 그룹 B 합 ${au.tB} → <b>그룹 ${au.g} 낙찰</b> — 승자는 비밀, 놓인 타일이 판에 쌓였어요` : ""}${mine ? `<br>내 입찰: 그룹 ${mine.g} ${mine.c}` : ""}</div>`;
    }
    h += mid;
    if (watch && V.nums == null && V.all) h += `<div class="zo-rv">${V.all.seq.map((q, i) => `<span>${esc(nameOf(ctx, i))} ${q ? q.map(E).join("") : ""}</span>`).join("")}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      if (watch) return;
      const d = e.target.closest("[data-d]"), box = e.target.closest("[data-g]"), st = e.target.closest("[data-set]"), q = e.target.closest("[data-q]"), mv = e.target.closest("[data-mv]"), cd = e.target.closest("[data-show]"), cell = e.target.closest(".zo-c.pick"), a = e.target.closest("[data-a]");
      if (bidding) {
        if (box) { ctx.sfx("tap"); S.g = box.dataset.g; return render(stage, V, ctx); }
        if (d) { ctx.sfx("tap"); S.c = Math.max(1, Math.min(m.credits, S.c + +d.dataset.d)); return render(stage, V, ctx); }
        if (st) { ctx.sfx("tap"); S.c = Math.max(1, Math.min(m.credits, +st.dataset.set)); return render(stage, V, ctx); }
        if (a && a.dataset.a === "bid" && !a.disabled && S.g) { ctx.sfx("pop"); ctx.act({ t: "bid", g: S.g, c: Math.max(1, Math.min(m.credits, S.c)) }); }
        return;
      }
      if (placing) {
        if (q) { ctx.sfx("tap"); S.tile = +q.dataset.q; return render(stage, V, ctx); }
        if (cell) { const c = +cell.dataset.c, row = K.dropRow(V.board, c); if (row < 0) return ctx.toast("그 줄은 가득 찼어요"); ctx.sfx("pop"); S.last = { r: row, c }; ctx.act({ t: "place", ti: Math.min(S.tile, V.queue.length - 1), col: c }); }
        return;
      }
      if (V.phase === "setup" && ctx.canAct && !m.ord) {
        if (mv) { const [p, dd] = mv.dataset.mv.split(":").map(Number), p2 = p + dd; if (p2 < 0 || p2 > 2) return; ctx.sfx("tap"); const o = S.ord; [o[p], o[p2]] = [o[p2], o[p]]; if (S.show === p) S.show = p2; else if (S.show === p2) S.show = p; return render(stage, V, ctx); }
        if (cd) { ctx.sfx("tap"); S.show = +cd.dataset.show; return render(stage, V, ctx); }
        if (a && a.dataset.a === "combo") { ctx.sfx("pop"); ctx.act({ t: "combo", ord: S.ord.slice(), show: S.show }); }
      }
    };
  }
  function renderEnd(stage, V, ctx) {
    const me = ctx.me, A = V.all, nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const wins = V.log.filter(e => e.k === "auc").map(e => `${e.r}R ${e.g} ${e.seat === me ? "나" : esc(nameOf(ctx, e.seat))}(${e.bids[e.seat].c})`).join(" · ");
    stage.innerHTML = `<div class="zo-top"><span class="zo-rd">🏁 끝</span></div><div class="zo-main">${boardHtml(V, false, null)}<div class="zo-side"><div class="zo-res" style="text-align:left">조합 줄 1개당 1점 · 개인 조건 이루면 2배<br>낙찰: ${wins || "없음"}</div></div></div>
      <div class="zo-tbl">${order.map(s => { const d = V.detail[s]; return `<div class="r${s === me ? " me" : ""}"><b>${V.ranks[s] + 1}위 ${nm(s)}</b><span>${A.seq[s].map(E).join("→")} ${d.lines}줄</span><span>${E(A.cond[s][0])}&gt;${E(A.cond[s][1])} ${d.cond ? "✅×2" : "✗"}</span><span class="p">${d.total}</span></div>`; }).join("")}</div>`;
    stage.onclick = null;
  }

  // ── 선생님 ──
  const nmOf = (names, i) => esc((names && names[i]) || `${i + 1}번`);
  const pc = x => Math.round(x * 100) + "%";
  function progress(V, me) {
    const m = V.mine, ev = K.evalBoard(V.board, m.seq, m.cond), lines = K.lineCount(V.board, m.seq), c = K.tileCount(V.board), d = c[m.cond[0]] - c[m.cond[1]];
    return { ev, lines, d };
  }
  function coach(V, me, since, names) {
    const watch = !(me >= 0 && me < V.n) || !V.mine, au = lastAuc(V);
    let opp = au ? `지난 경매(${au.r}라운드): A 합 ${au.tA} · B 합 ${au.tB} → 그룹 ${au.g} 낙찰 (승자는 비밀). 합이 적은 쪽이 낙찰이라 남들도 눈치를 보며 걸어요.` : "아직 경매 전이에요 — 남의 크레딧 · 입찰 · 조합 순서는 비공개예요.";
    const sh = V.shown.map((x, i) => (x && i !== me ? `${nmOf(names, i)} ${x.pos + 1}번째 ${E(x.sp)}` : null)).filter(Boolean);
    if (sh.length) opp += ` 공개된 카드: ${sh.join(", ")}.`;
    if (watch) return { opp, mine: "구경 중이에요.", rec: "자리에 앉으면 추천해 드려요.", why: "" };
    const m = V.mine;
    if (V.over) { const d = V.detail[me]; return { opp: "판이 끝났어요.", mine: `내 조합 ${m.seq.map(E).join("→")} ${d.lines}줄${d.cond ? " · 개인 조건 달성 ×2" : ""} = ${d.total}점 · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" }; }
    const pr = V.phase === "setup" ? null : progress(V, me), left = Math.max(1, V.rounds - V.round + 1);
    const mine = V.phase === "setup" ? `내 카드 ${m.cards.map(E).join("")} · 개인 조건 ${condTxt(m.cond)}` : `내 조합 ${m.seq.map(E).join("→")} (판에 ${pr.lines}줄 · 가능성 점수 약 ${pr.ev.toFixed(1)}) · 개인 조건 ${condTxt(m.cond)} (지금 ${pr.d >= 0 ? "+" : ""}${pr.d}) · 크레딧 ${m.credits} · 남은 라운드 ${left}`;
    let rec = "다음 차례를 기다려요", why = "";
    if (V.phase === "bid" && V.needs.includes(me)) {
      const R = K.recommend(V, me), a = R.a, row = R.rows[0], alt = R.rows.find(r => r.a.g !== a.g) || R.rows[1];
      rec = `그룹 ${a.g}에 ${a.c} 걸기`;
      why = `내 조합에 맞는 타일의 가치는 A ${R.VA.toFixed(1)}점 · B ${R.VB.toFixed(1)}점이에요 (조합에 든 동물이 많을수록 · 개인 조건에 도움이 될수록 커요). 남은 크레딧 ${m.credits}개를 ${left}라운드에 나누면 한 번에 약 ${(m.credits / left).toFixed(0)}씩이고, 이 금액이면 낙찰 확률 약 ${pc(row.p)}${alt ? ` (다음 후보 그룹 ${alt.a.g} ${alt.a.c}: ${pc(alt.p)})` : ""}. 합이 적은 쪽이 이기니 너무 많이 걸면 오히려 져요.`;
    } else if (V.phase === "place" && V.needs.includes(me)) {
      const R = K.recommend(V, me), a = R.a, row = R.rows[0];
      rec = `${E(V.queue[a.ti])} 타일을 ${a.col + 1}번째 줄에`;
      why = `판의 내 조합 가능성 점수가 ${R.cur.toFixed(1)}점에서 약 ${row.u.toFixed(1)}점으로 올라요 (끝난 줄 + 아직 이을 수 있는 줄의 일부, 개인 조건이 이뤄질 가능성만큼 ×2). 위에서 떨어지니 아래 칸이 먼저 차요.`;
    } else if (V.phase === "setup" && V.needs.includes(me)) {
      const R = K.recommend(V, me), a = R.a; rec = `${a.ord.map(i => E(m.cards[i])).join("→")} 순서 · ${a.show + 1}번째 카드 공개`;
      why = "조합은 거꾸로 읽어도 되니 앞뒤가 같은 모양이면 한 번만 세요. 같은 동물이 두 장이면 그중 하나를 공개해 진짜 순서를 숨겨요.";
    } else if (V.phase === "show") { rec = "결과를 보고 다음 라운드를 준비해요"; why = "남은 라운드가 줄수록 크레딧을 남기지 말고 써요 — 끝나면 남은 크레딧은 아무 값도 없어요."; }
    return { opp, mine, rec, why };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    return `<div class="zo-res" style="text-align:left">${order.map(s => { const d = V.detail[s]; return `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${d.total}점</b> · ${V.all.seq[s].map(E).join("→")} ${d.lines}줄${d.cond ? " · 개인 조건 ×2" : ""}</div>`; }).join("")}</div>`;
  }
  const actText = (a, V) => {
    if (!a) return "—";
    if (a.t === "bid") return `그룹 ${a.g}에 ${a.c} 걸기`;
    if (a.t === "place") return `${V && V.queue ? E(V.queue[a.ti]) + " " : ""}타일을 ${a.col + 1}번째 줄에`;
    if (a.t === "combo") return `조합 순서 ${a.ord.join("")} · ${a.show + 1}번째 공개`;
    return "—";
  };
  function review(V, seat, myA, bestA) {
    if (!V || !myA || !K.judge) return null;
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    if (J.kind === "bid") { const d = J.best.u - J.my.u; return { sev: Math.max(0, Math.min(100, Math.round(d * 70))), why: `내 입찰은 낙찰 확률 약 ${pc(J.my.p)} · 기대 ${J.my.u.toFixed(2)} / 추천은 낙찰 확률 약 ${pc(J.best.p)} · 기대 ${J.best.u.toFixed(2)} (타일 가치 − 크레딧 값)` }; }
    const d = J.best - J.my; return { sev: Math.max(0, Math.min(100, Math.round(d * 40))), why: `내 배치 후 조합 가능성 점수 ${J.my.toFixed(1)} / 추천 배치 ${J.best.toFixed(1)}` };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const tiles = (arr) => `<div class="zo-box" style="width:100%"><div class="t">${arr.map(E).join("")}</div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "내 동물 조합을 판에 만들어요", body: "동물 카드 <b>3장을 순서대로</b> 놓은 게 내 <b>조합</b>이에요 (1장만 공개, 나머지는 비밀). 5×5 판에 타일을 쌓아 <b>내 조합이 순서대로 놓인 줄</b>(가로 · 세로 · 대각선, 거꾸로도)을 만들면 <b>1줄당 1점</b>!",
        boardHtml: `<div class="zo-tut"><div class="zo-seq">🐍<i>→</i>🦁<i>→</i>🐵</div><small>내 조합 예시</small></div>`, ms: 6400 },
      { tag: "STEP 2 · 경매", title: "A · B 그룹에 크레딧을 몰래 걸어요", body: "라운드마다 <b>A 그룹 4개 · B 그룹 4개</b> 타일이 공개돼요. 모두 <b>A 또는 B</b>를 골라 크레딧(30개로 시작)을 <b>몰래 1 이상</b> 걸어요. 걸면 <b>못 따도 돌려받지 못해요</b>. 5라운드 동안 아껴 써요!",
        boardHtml: `<div class="zo-tut"><div style="display:flex;gap:8px;width:100%"><div class="zo-box" style="flex:1"><div class="h"><span>그룹 A</span></div><div class="t">🐍🦁🐵🐘</div></div><div class="zo-box" style="flex:1"><div class="h"><span>그룹 B</span></div><div class="t">🦜🐍🦁🐵</div></div></div></div>`, ms: 7600 },
      { tag: "STEP 3 · 낙찰", title: "합이 적은 그룹, 그 안의 최고액이 승자", body: "<b>걸린 크레딧 합이 적은 그룹</b>이 낙찰돼요. 그 그룹에서 <b>가장 많이 건 사람</b>이 승자 — 4개 타일을 판에 <b>위에서 떨어뜨려</b> 놓아요 (승자는 비밀!). 합이 같거나 최고액이 같으면 <b>무효</b>, 다시 걸어요. 안 뽑힌 그룹 타일은 버려요.",
        boardHtml: `<div class="zo-tut"><div class="zo-res">A 합 8 · B 합 10 → <b>A 낙찰</b></div></div>`, ms: 7400 },
      { tag: "STEP 4 · 직접", title: "어느 그룹이 낙찰일까요?", body: "그룹 A에 모두 합쳐 <b>8</b>, 그룹 B에 모두 합쳐 <b>10</b>이 걸렸어요. 낙찰 그룹은?",
        interactive: { hint: "👆 낙찰 그룹을 눌러요", doneText: "✅ 합이 적은 A 낙찰!" },
        render(stage, ctrl) {
          let done = false;
          const draw = () => { stage.innerHTML = `<div class="zo-tut"><div class="zo-res">A 합 8 · B 합 10</div><div class="opt"><button data-v="A" ${done ? "disabled" : ""}>그룹 A</button><button data-v="B" ${done ? "disabled" : ""}>그룹 B</button></div></div>`; };
          stage.onclick = e => { const b = e.target.closest("[data-v]"); if (!b || done) return; ctrl.sfx("tap"); if (b.dataset.v === "A") { done = true; draw(); ctrl.complete(); } else ctrl.toast("합이 적은 쪽이 낙찰이에요"); };
          draw();
        } },
      { tag: "STEP 5 · 점수", title: "개인 조건을 이루면 점수 2배", body: "나만 아는 <b>개인 조건 카드</b>('뱀 타일이 앵무새 타일보다 많다' 같은)가 있어요. 5라운드가 끝났을 때 판의 타일이 그 조건을 이루면 <b>점수 2배</b>! 점수가 가장 높은 사람이 1등이에요.",
        boardHtml: `<div class="zo-tut"><span style="font-size:40px">🐍 &gt; 🦜</span></div>`, ms: 6400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.zoo = {
    name: "동물원", emoji: "🦁", short: "크레딧 경매로 타일을 따서 내 동물 조합을 판에 쌓아요", min: 3, max: 6, defN: 4, board: false, src: SRC, diff: DIFF,
    opts: [],
    howto: [
      "목표: 5×5 판에 내 동물 조합 <b>3칸 줄</b>을 최대한 많이 만들어 점수가 가장 높은 사람이 1등 (같으면 공동)",
      "준비: 동물 카드 3장을 순서대로 놓은 <b>조합</b>(1장만 공개)과 <b>개인 조건 카드</b>(비공개), 크레딧 30 · 5라운드",
      "진행: 라운드마다 <b>A 그룹 · B 그룹</b> 타일이 공개 → 모두 <b>A 또는 B</b>에 크레딧을 <b>몰래 1 이상</b> 걸어요 (못 따도 돌려받지 못함 · 올인 가능) · <b>걸린 합이 적은 그룹</b>이 낙찰, 그 그룹에서 <b>가장 많이 건 사람</b>(비밀)이 타일을 판에 <b>위에서 떨어뜨려</b> 놓아요 · 안 뽑힌 타일은 버려요",
      "승패: 끝나면 내 조합이 (가로 · 세로 · 대각선, 거꾸로도) 순서대로 놓인 줄 <b>1개당 1점</b> · <b>개인 조건</b>(예: 뱀 타일이 앵무새 타일보다 많다)을 이루면 점수 <b>2배</b>",
      "특수: 합이 같거나 최고액이 같으면 <b>무효</b>라 다시 걸어요 (두 번까지, 세 번째도 무효면 타일을 버려요) · <b>한 그룹에만 걸렸으면 그 그룹이 낙찰</b> · 크레딧이 0 이면 그 라운드는 쉬어요",
    ],
    sub: V => (V.over ? "끝" : V.phase === "setup" ? "조합 정하기" : `${V.round}/${V.rounds} 라운드 · ${V.phase === "bid" ? "입찰" : V.phase === "place" ? "배치" : "결과"}`),
    chip: (V, i) => ({ t: V.over ? `${V.score[i]}점` : V.phase === "setup" || V.phase === "bid" ? (V.subbed[i] ? "냄" : "…") : "", on: !V.over && V.needs.includes(i), out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

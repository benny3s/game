/* 베니 서바이벌 · 경매 빙고 — 화면 (도형 상자 · 코인 입찰 · 낙찰가 표 · 내 빙고판 · 1분 규칙) */
(() => {
  "use strict";
  const A = window.SVCores.auctionbingo;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SH = A.SHAPES;
  const CSS = `
.ab-top{display:flex;align-items:center;gap:8px;flex:none}
.ab-rd{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:4px 12px;white-space:nowrap}
.ab-ph{font:800 13px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 10px;white-space:nowrap}
.ab-log{flex:1;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.ab-boxes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:none}
.ab-box{display:grid;justify-items:center;align-content:start;gap:4px;min-height:96px;padding:8px 4px;border-radius:14px;border:1.5px solid rgba(255,255,255,.14);background:linear-gradient(165deg,rgba(255,255,255,.06),rgba(0,0,0,.28));color:var(--ink);font:inherit;cursor:default}
.ab-box.can{cursor:pointer;border-color:#fde68a;box-shadow:0 0 0 1px rgba(253,230,138,.45)}
.ab-box.mine{border-color:#86efac;background:linear-gradient(165deg,rgba(34,197,94,.2),rgba(0,0,0,.25))}
.ab-box .sh{font:900 30px/1 var(--round);color:#fff}
.ab-box .who{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;font-size:16px;line-height:1.1;min-height:20px}
.ab-box .tl{font:700 12px var(--round);color:var(--soft)}
.ab-box .pr{font:900 14px var(--round);color:#fde68a}
.ab-box .pr.sec{color:#f9a8d4}
.ab-mid{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;flex:none}
.ab-board{display:grid;grid-template-columns:repeat(3,30px);gap:3px}
.ab-cell{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;font:900 15px var(--round);background:rgba(255,255,255,.06);border:1.5px dashed rgba(255,255,255,.22);color:rgba(255,255,255,.35)}
.ab-cell.on{background:rgba(245,179,1,.28);border:1.5px solid #fde68a;color:#fff}
.ab-cell.maybe{background:rgba(245,179,1,.08);border:1.5px solid rgba(253,230,138,.55);color:#fde68a}
.ab-cell.line{background:rgba(34,197,94,.35);border-color:#4ade80}
.ab-bt{font-size:12px;color:var(--soft);display:grid;gap:3px}
.ab-bt b{color:#fde68a}
.ab-hist{border-collapse:collapse;font-size:11.5px;text-align:center;font-variant-numeric:tabular-nums}
.ab-hist th,.ab-hist td{padding:1px 5px;border:1px solid rgba(255,255,255,.08)}
.ab-hist th{color:var(--soft);font-weight:700}
.ab-hist td.sec{color:#f9a8d4}
.ab-hist td.no{color:rgba(255,255,255,.25)}
.ab-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.ab-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.ab-coins{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.ab-coin{display:grid;place-items:center;height:44px;border-radius:50%;aspect-ratio:1;justify-self:center;width:44px;border:2px solid #b45309;background:radial-gradient(circle at 35% 30%,#fde68a,#d97706);color:#451a03;font:900 17px var(--round);cursor:pointer;box-shadow:0 2px 0 #78350f}
.ab-coin.sel{transform:translateY(-4px);box-shadow:0 0 0 3px #86efac,0 4px 0 #78350f}
.ab-coin.gone{opacity:.18;cursor:default;box-shadow:none}
.ab-bidsum{display:flex;justify-content:space-between;align-items:center;font:800 14px var(--round)}
.ab-bidsum .v{color:#fde68a}
.ab-bidsum .bad{color:#f87171;font-size:12px}
.ab-show{display:grid;gap:5px;font-size:12.5px}
.ab-show .r{display:grid;grid-template-columns:auto 1fr auto;gap:2px 8px;align-items:center;padding:5px 8px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.ab-show .r.me{border-color:#86efac}
.ab-show .r b{font:800 13px var(--round)}
.ab-show .r i{font-style:normal;color:#fde68a;font:800 13px var(--round)}
.ab-show .r .e{grid-column:1/-1;color:var(--soft)}
.ab-fin{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.ab-fin .p{display:grid;gap:3px;justify-items:center;font-size:12px}
.ab-fin .p .ab-board{grid-template-columns:repeat(3,20px);gap:2px}
.ab-fin .p .ab-cell{width:20px;height:20px;font-size:11px;border-radius:5px}
.ab-tut{display:grid;gap:8px;justify-items:center}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const emo = (ctx, i) => (ctx.seats[i] && ctx.seats[i].emoji) || "🙂";
  let lastSeats = [];
  const PH = { pick: "도형 선택", bid: "입찰", show: "결과", end: "끝" };

  function boardHtml(cells, lineCells, maybeCells) {
    return `<div class="ab-board">${A.BOARD.map((s, k) => `<span class="ab-cell${cells && cells[k] ? " on" : maybeCells && maybeCells[k] ? " maybe" : ""}${lineCells && lineCells[k] ? " line" : ""}">${SH[s]}</span>`).join("")}</div>`;
  }
  const lineCellsOf = cells => { const out = Array(9).fill(false); A.LINES.forEach(L => { if (L.every(x => cells[x])) L.forEach(x => { out[x] = true; }); }); return out; };

  let SEL = null;
  const selKey = (V, ctx) => `${ctx.g}|${V.round}`;
  function selFor(V, ctx) { const key = selKey(V, ctx); if (!SEL || SEL.key !== key) SEL = { key, set: new Set() }; return SEL; }

  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    if (e.k === "pick") return `${esc(nameOf(ctx, e.s))} → ${SH[e.sh]}`;
    if (e.k === "bid") return `${esc(nameOf(ctx, e.s))} 입찰 완료`;
    if (e.k === "round") return `${e.r}라운드 시작`;
    return "";
  }
  function histHtml(V) {
    if (!V.hist.length) return "";
    return `<table class="ab-hist"><tr><th>낙찰가</th>${V.hist.map(h => `<th>${h.r}R</th>`).join("")}</tr>${[0, 1, 2].map(s => `<tr><th>${SH[s]}</th>${V.hist.map(h => h.cnt[s] ? (h.secret[s] ? `<td class="sec">?</td>` : `<td>${h.price[s]}</td>`) : `<td class="no">-</td>`).join("")}</tr>`).join("")}</table>`;
  }
  function mineSummary(V, me) {
    const est = A.estTiles(V);
    const sure = [0, 0, 0], maybe = [0, 0, 0];
    for (const m of V.mine) { sure[m.sh] += m.sure || 0; maybe[m.sh] += m.maybe || 0; }
    const ps = A.place(sure), pm = A.place(sure.map((x, s) => x + maybe[s]));
    return { est, sure, maybe, ps, pm };
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats;
    const me = ctx.me, watch = me < 0, S = V.sec;
    let h = `<div class="ab-top"><span class="ab-rd">${V.round} / ${V.rounds}</span><span class="ab-ph">${PH[V.phase] || ""}</span><span class="ab-log">${logText(V, ctx)}</span></div>`;
    // 상자 셋
    const myPick = me >= 0 ? V.picks[me] : -1;
    const canPick = !watch && ctx.canAct && V.phase === "pick";
    h += `<div class="ab-boxes">${[0, 1, 2].map(s => {
      const who = V.order.filter(i => V.picks[i] === s);
      const sel = myPick === s;
      const pr = V.res ? (V.res.cnt[s] ? (V.res.secret[s] ? `<span class="pr sec">시크릿</span>` : `<span class="pr">${V.res.price[s]}원</span>`) : `<span class="tl">없음</span>`) : "";
      return `<button type="button" class="ab-box${canPick ? " can" : ""}${sel ? " mine" : ""}" data-s="${s}" ${canPick ? "" : "disabled"}><span class="sh">${SH[s]}</span><span class="who">${who.map(i => `<span title="${esc(nameOf(ctx, i))}">${esc(emo(ctx, i))}</span>`).join("")}</span><span class="tl">${who.length ? `타일 ${who.length}개 걸림` : "비어 있음"}</span>${pr}</button>`;
    }).join("")}</div>`;
    // 내 빙고판 + 지난 낙찰가
    if (!watch) {
      const m = mineSummary(V, me), lc = lineCellsOf(m.ps.cells);
      h += `<div class="ab-mid">${boardHtml(m.ps.cells, lc, m.pm.cells)}<div class="ab-bt"><span>내 코인 <b>${V.coinCnt[me]}개</b> (${A.COINS.filter((v, k) => V.coins[k]).reduce((a, b) => a + b, 0)}원)</span><span>받은 타일 확실 <b>○${m.sure[0]} △${m.sure[1]} ☆${m.sure[2]}</b>${m.maybe.some(x => x) ? ` · 모름 ○${m.maybe[0]} △${m.maybe[1]} ☆${m.maybe[2]}` : ""}</span><span>빙고 ${m.ps.lines}줄${m.pm.lines > m.ps.lines ? ` (최대 ${m.pm.lines})` : ""}</span></div></div>`;
    } else {
      h += `<div class="ab-bt">${Array.from({ length: V.n }, (_, i) => `${esc(emo(ctx, i))} ${esc(nameOf(ctx, i))} 🪙${V.coinCnt[i]}${V.bidDone[i] && V.phase === "bid" ? "✔" : ""}`).join(" · ")}</div>`;
    }
    h += histHtml(V);
    // 아래 행동 칸
    let acts = "";
    if (V.phase === "show" && V.res) acts = showHtml(V, ctx, S);
    else if (V.phase === "pick") {
      acts = canPick ? `<div class="note">티켓을 넣을 도형을 눌러요 · 앞사람이 넣은 곳이 위에 보여요</div>` : `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 차례예요…" : ""}</div>`;
    } else if (V.phase === "bid") {
      if (!watch && V.myBid) acts = `<div class="note">입찰 완료 (${V.myBid.map(k => A.COINS[k]).join("+")} = ${V.myBid.reduce((a, k) => a + A.COINS[k], 0)}원) · 다른 사람을 기다려요 (${V.bidDone.filter(Boolean).length}/${V.n})</div>`;
      else if (!watch && ctx.canAct) {
        const sel = selFor(V, ctx), keep = V.rounds - V.round, have = V.coins.filter(Boolean).length;
        const val = [...sel.set].reduce((a, k) => a + A.COINS[k], 0), left = have - sel.set.size;
        const bad = !sel.set.size ? "코인을 골라요" : left < keep ? `나머지 ${keep}라운드용으로 ${keep}개는 남겨야 해요` : "";
        acts = `<div class="ab-bidsum"><span>${SH[myPick]} 에 입찰</span><span class="v">${val}원 · ${sel.set.size}개 ${bad ? `<span class="bad">${bad}</span>` : ""}</span></div>
          <div class="ab-coins">${A.COINS.map((v, k) => `<button type="button" class="ab-coin${V.coins[k] ? "" : " gone"}${sel.set.has(k) ? " sel" : ""}" data-k="${k}" ${V.coins[k] ? "" : "disabled"}>${v}</button>`).join("")}</div>
          <button class="btn primary big" data-a="bid" ${bad ? "disabled" : ""}>✔ 입찰 확정</button>
          <div class="note">쓴 코인은 이기든 지든 사라져요 · 남은 코인 개수가 마지막 동점 가림에 쓰여요</div>`;
      } else acts = `<div class="note">${watch ? "모두 입찰 중…" : "다른 사람 입찰을 기다려요"} (${V.bidDone.filter(Boolean).length}/${V.n})</div>`;
    }
    h += `<div class="ab-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const box = e.target.closest(".ab-box.can");
      if (box) { ctx.sfx("pop"); ctx.act({ t: "pick", s: +box.dataset.s }); return; }
      const coin = e.target.closest(".ab-coin");
      if (coin && !coin.disabled) { const sel = selFor(V, ctx), k = +coin.dataset.k; if (sel.set.has(k)) sel.set.delete(k); else sel.set.add(k); ctx.sfx("tap"); render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a]");
      if (b && !b.disabled && b.dataset.a === "bid") { const sel = selFor(V, ctx); ctx.sfx("pop"); ctx.act({ t: "bid", c: [...sel.set].sort((x, y) => x - y) }); }
    };
  }
  function showHtml(V, ctx, S) {
    const R = V.res, me = ctx.me;
    let rows = [0, 1, 2].filter(s => R.cnt[s]).map(s => {
      const who = V.order.filter(i => R.picks[i] === s);
      return `<div class="r"><span>${SH[s]}</span><b>${who.map(i => esc(emo(ctx, i)) + esc(nameOf(ctx, i))).join(" · ")}</b><i>${R.secret[s] ? "시크릿" : R.price[s] + "원"}</i></div>`;
    }).join("");
    if (S) {
      const rec = S.myr.map(x => x[x.length - 1]);
      rows += `<div class="r"><span>🔍</span><b>입찰 (구경 전용)</b><i></i><span class="e">${rec.map((m, i) => `${esc(emo(ctx, i))}${esc(nameOf(ctx, i))} ${SH[m.sh]} ${m.v}원`).join(" · ")}</span></div>`;
    } else if (me >= 0 && V.mine.length) {
      const m = V.mine[V.mine.length - 1];
      const t = m.won === true ? (m.cnt > 1 ? `이겼어요 — 타일 최소 1개, 동률이 아니었다면 ${m.cnt}개를 받았을 거예요` : "이겼어요 — 타일 1개를 받았어요") : m.won === false ? "졌어요 — 이 도형 타일은 못 받아요" : "시크릿이라 이겼는지는 몰라요 — 마지막에 공개돼요";
      rows += `<div class="r me"><span>🙋</span><b>나: ${SH[m.sh]} 에 ${m.v}원</b><i></i><span class="e">${t}</span></div>`;
    }
    return `<div class="ab-show">${rows}</div>`;
  }
  function result(V) {
    if (!V.final) return "";
    const order = V.final.rows.slice().sort((a, b) => V.final.ranks[a.i] - V.final.ranks[b.i]);
    return `<div class="ab-fin">${order.map(x => `<div class="p"><b>${esc((lastSeats[x.i] && lastSeats[x.i].name) || (x.i + 1) + "번")}</b>${boardHtml(x.cells, lineCellsOf(x.cells))}<span>${x.lines}줄 · ${x.fill}칸 · 코인 ${x.coins}</span><small>○${x.tiles[0]} △${x.tiles[1]} ☆${x.tiles[2]}</small></div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 판", title: "빙고판을 도형으로 채워요", body: "9칸짜리 판에 <b>○ 4칸 · △ 3칸 · ☆ 2칸</b>이 정해져 있어요. 7라운드 동안 도형 타일을 모아 <b>빙고 줄이 가장 많은 사람</b>이 이겨요.",
        boardHtml: `<div class="ab-tut">${boardHtml(null)}<small>가로 · 세로 · 대각선 한 줄이면 빙고 (8줄)</small></div>`, ms: 5400 },
      { tag: "STEP 2 · 선택", title: "티켓을 도형 상자에 넣어요", body: "라운드마다 티켓 1장을 <b>○ △ ☆ 중 한 상자</b>에 넣어요. 이긴 사람은 그 상자에 들어간 <b>티켓 수만큼</b> 타일을 받아요. 앞사람이 넣은 곳이 보여서 눈치싸움이 돼요.",
        boardHtml: `<div class="ab-tut"><div class="ab-boxes" style="width:100%"><span class="ab-box"><span class="sh">○</span><span class="who">🙂🐱</span><span class="tl">타일 2개</span></span><span class="ab-box"><span class="sh">△</span><span class="who">🐯</span><span class="tl">타일 1개</span></span><span class="ab-box"><span class="sh">☆</span><span class="who"></span><span class="tl">비어 있음</span></span></div></div>`, ms: 5600 },
      { tag: "STEP 3 · 입찰", title: "직접 해 봐요: 코인으로 이기기", body: "같은 상자에 든 사람끼리 <b>코인을 많이 낸 쪽</b>이 이겨요. 낸 코인은 이기든 지든 사라지고, 코인은 쪼갤 수 없어요. 상대가 <b>3원</b>을 냈어요 — 코인을 눌러 <b>4원 이상</b>을 만들어 보세요!",
        interactive: { hint: "👆 코인을 눌러 합이 4원 이상이 되게", doneText: "✅ 이겼어요! 하지만 코인이 줄었어요" },
        render(stage, ctrl) {
          const vals = [1, 2, 3, 5], sel = new Set();
          const draw = () => {
            const v = [...sel].reduce((a, k) => a + vals[k], 0);
            stage.innerHTML = `<div class="ab-tut"><b>상대 3원 vs 나 ${v}원</b><div class="ab-coins" style="width:100%">${vals.map((x, k) => `<button type="button" class="ab-coin${sel.has(k) ? " sel" : ""}" data-k="${k}">${x}</button>`).join("")}</div></div>`;
            if (v >= 4) ctrl.complete();
          };
          stage.onclick = e => { const b = e.target.closest(".ab-coin"); if (!b) return; const k = +b.dataset.k; if (sel.has(k)) sel.delete(k); else sel.add(k); ctrl.sfx("tap"); draw(); };
          draw();
        } },
      { tag: "STEP 4 · 발표", title: "낙찰가만 보여요", body: "결과는 <b>도형별 낙찰가</b>만 공개돼요. 가장 비싼 도형은 가격도 <b>시크릿</b>! 누가 어떤 타일을 받았는지는 마지막 7라운드가 끝날 때 공개돼요 — 내 입찰값과 낙찰가를 견주어 짐작해야 해요.",
        boardHtml: `<div class="ab-tut"><table class="ab-hist"><tr><th>낙찰가</th><th>1R</th><th>2R</th></tr><tr><th>○</th><td>1</td><td class="sec">?</td></tr><tr><th>△</th><td>3</td><td>2</td></tr><tr><th>☆</th><td class="sec">?</td><td class="no">-</td></tr></table></div>`, ms: 6000 },
      { tag: "STEP 5 · 승부", title: "코인 아껴 쓰기", body: "코인은 <b>10개</b>인데 7번을 내야 해서 매번 <b>1개 이상</b> 남겨 둬야 해요. 순위는 <b>빙고 줄 수 → 채운 칸 수 → 남은 코인 수</b>. 막히면 <b>🧑‍🏫 AI 선생님</b>이 어느 도형에 얼마를 낼지 알려 줘요.",
        boardHtml: `<div class="ab-tut"><span style="font-size:42px">🏆</span></div>`, ms: 5200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.auctionbingo = {
    name: "경매 빙고", emoji: "🎯", short: "도형을 경매로 모아 빙고", min: 3, max: 8, defN: 5, board: false,
    opts: [],
    howto: [
      "7라운드, 라운드마다 티켓 1장을 <b>○ △ ☆</b> 상자 중 한 곳에 넣어요 (앞사람이 넣는 게 보여요)",
      "코인을 <b>비공개</b>로 내서 같은 상자 안에서 가장 많이 낸 사람이 <b>그 상자 티켓 수만큼 타일</b>을 가져가요 (동률이면 나눠요)",
      "낙찰가만 공개되고 가장 비싼 상자는 <b>시크릿</b> · 누가 받았는지는 마지막에 공개",
      "빙고 줄 수 → 채운 칸 → 남은 코인 순으로 순위",
    ],
    note: "방송과 다른 점: 피스 · 게스트 · 징표 없이 3~8명, 상자에 넣는 순서는 차례대로 (라운드마다 시작 자리가 돎), 대화 없음, 남은 코인 개수는 모두에게 보여요.",
    sub: V => (V.over ? "끝" : `${V.round} / ${V.rounds}라운드 · ${PH[V.phase] || ""}`),
    chip: (V, i) => ({ t: V.over && V.final ? `${V.final.rows[i].lines}줄` : `🪙${V.coinCnt[i]}`, on: V.needs.includes(i) && !V.over }),
    render, result,
    coach: (V, me, since, names) => A.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => (V.phase === "pick" ? { t: "pick", s: Math.floor(rnd() * 3) } : A.ai(V, me, "easy", rnd)),
  };
})();

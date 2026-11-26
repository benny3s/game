/* 베니 서바이벌 · 낮과 밤 — 화면 (12칸 시계 · 코인 비밀 제출 · 시침 · 구간 점수 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.daynight;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 피의 게임 시즌 2 · 8일차 메인 매치 (8명) · 규칙 확인: 나무위키 피의 게임2/8일차 문서 (룰 14가지 · 14라운드 진행표 · 최종 점수, 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "4~8명 (방송 8명) · 시침이 움직이는 칸 수 = 가장 많이 낸 코인 (아무도 안 내면 1칸) — 방송 글이 모호해 14라운드 진행표로 확인 · 낸 코인은 최다 제출까지 전부 소멸 (원문 '나머지 제출 코인은 소멸' 이 모호해 우리가 정함) · 밤에는 몇 칸 갔는지도 비공개 (우리 해석) · 구간은 낮 1개 · 밤 1개씩 무작위 (겹칠 수 있음), 24칸 움직일 때마다 다시 뽑음 · 알파벳은 처음에 무작위로 나눠 끝날 때 공개, 라운드마다 알파벳별 득점과 합계를 공개 (원문은 득점만) · 먼저 10점 (동시에 넘으면 높은 쪽 · 30라운드까지) · 방송의 승자 보상 (개인자금 · 투표 면제권) · 최하위 탈락 투표 · 코인 구매 · 회의 · 협상 · 연합은 없음 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const CSS = `
.dn-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.dn-rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.dn-me{flex:1 1 120px;min-width:0;display:flex;gap:6px;align-items:center;justify-content:flex-end;font:800 12.5px var(--round);color:var(--soft)}
.dn-chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 9px;border:2px solid rgba(255,255,255,.25);font:900 13px var(--round);white-space:nowrap;background:rgba(0,0,0,.28);color:#fff}
.dn-clock{display:grid;gap:5px;flex:none}
.dn-band{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.dn-cell{position:relative;height:40px;border-radius:10px;border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;font:900 16px var(--round);color:#fff}
.dn-cell.d{background:linear-gradient(#f59e0b55,#fde68a22)}.dn-cell.n{background:linear-gradient(#1e1b4b,#312e81)}
.dn-cell.here{outline:3px solid #fde68a;outline-offset:1px}
.dn-cell.hid{opacity:.55}
.dn-cell small{position:absolute;bottom:1px;left:0;right:0;text-align:center;font:800 9.5px var(--round);color:#fde68a;line-height:1}
.dn-cell .hand{position:absolute;top:-6px;right:0;font-size:16px}
.dn-note{text-align:center;font-size:12px;color:var(--soft);line-height:1.35}
.dn-score{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;flex:none}
.dn-score .dn-chip{font-size:12.5px;padding:2px 8px}.dn-score .dn-chip.me{border-color:#fde68a;color:#fde68a}
.dn-bid{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;flex:none}
.dn-bid button{width:48px;height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:900 22px var(--round)}
.dn-bid button:disabled{opacity:.3}
.dn-bid b{text-align:center;font:900 26px var(--round);color:#fde68a}
.dn-bid small{display:block;font:800 11px var(--round);color:var(--soft)}
.dn-quick{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;flex:none}
.dn-quick button{min-height:44px;border-radius:10px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:800 14px var(--round)}
.dn-quick button.on{border-color:#fde68a;color:#fde68a}
.dn-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.dn-acts .btn{padding:12px 8px;font-size:15px}
.dn-show{display:grid;gap:3px;font-size:12.5px}
.dn-show .r{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:2px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.dn-show .r.me{border-color:#fde68a}.dn-show .r .l{font:900 14px var(--round);min-width:18px}
.dn-show .r .g{font:900 14px var(--round);color:#4ade80;min-width:28px;text-align:right}.dn-show .r.z .g{color:var(--soft)}
.dn-show .r .x{color:var(--soft);font-size:12px}
.dn-res{display:grid;gap:3px;font-size:12.5px}
.dn-tut{display:grid;gap:8px;justify-items:center;width:100%}
.sv-coachfit .dn-cell{height:30px;font-size:14px}.sv-coachfit .dn-cell small{display:none}.sv-coachfit .dn-note,.sv-coachfit .dn-score,.sv-coachfit .dn-bid small{display:none}
.sv-coachfit .dn-quick{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:1fr}.sv-coachfit .dn-bid button{width:44px;height:44px}.sv-coachfit .dn-bid b{font-size:22px}.sv-coachfit .dn-acts .btn{padding:9px 8px}.sv-coachfit .dn-show .r{padding:1px 8px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const sel = { key: "", c: 0 };
  const pc = x => Math.round(x * 100) + "%";
  const posText = V => (V.hist.length === 0 ? "시침은 1칸 (낮)" : V.vis != null ? `시침은 ${V.vis}칸 (낮)` : "시침은 밤 (7~12 어딘가)");

  function clockHtml(V, tut) {
    const z = V.zone, cell = c => {
      const day = K.isDay(c), here = V.hist.length ? V.vis === c : c === 1, mine = z && (z[0] === c || z[1] === c);
      return `<div class="dn-cell ${day ? "d" : "n"}${here ? " here" : ""}${!day && V.vis != null ? " hid" : ""}" title="${c}칸">${c}${here ? '<span class="hand">🕐</span>' : ""}${mine ? `<small>★ ${day ? "+1" : "+2"}</small>` : ""}</div>`;
    };
    return `<div class="dn-clock"><div class="dn-band">${[1, 2, 3, 4, 5, 6].map(cell).join("")}</div><div class="dn-band">${[7, 8, 9, 10, 11, 12].map(cell).join("")}</div></div>`;
  }
  function scoreHtml(V) {
    const mine = V.myLetter;
    return `<div class="dn-score">${V.tot.map((t, l) => { const L = K.LET[l]; return `<span class="dn-chip${L === mine ? " me" : ""}">${L}${L === mine ? " (나)" : ""} ${t}점</span>`; }).join("")}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = me < 0, nm = i => nameOf(ctx, i);
    const key = `${V.round}|${V.phase}|${me}`; if (sel.key !== key) { sel.key = key; sel.c = 0; }
    const can = ctx.canAct && !watch && !V.over;
    let h = `<div class="dn-top"><span class="dn-rd">${V.round}/${V.cap} 라운드 · ${V.goal}점 먼저</span>${watch ? "" : `<span class="dn-me"><span class="dn-chip">🪙 ${V.coins}</span><span class="dn-chip">나 = ${V.myLetter}</span></span>`}</div>`;
    h += clockHtml(V);
    h += `<div class="dn-note">${watch ? posText(V) + " · 구간 · 코인은 숨겨져 있어요" : `${posText(V)} · 내 구간 낮 ${V.zone[0]}칸 (+1) · 밤 ${V.zone[1]}칸 (+2)`}</div>`;
    if (V.phase !== "show" && !V.over) h += scoreHtml(V);
    let acts = "";
    if (V.phase === "show" || V.over) {
      const H = V.hist[V.hist.length - 1];
      if (H) acts = `<div class="dn-show"><div class="dn-note"><b>${H.r}라운드</b> — ${H.vis != null ? `시침이 ${H.vis}칸에 섰어요 (낮)` : "시침이 밤 구간으로 갔어요 (몇 칸인지는 비밀)"}${H.redraw ? " · 구간 새로 뽑음" : ""}</div>${H.byLetter.map((g, l) => `<div class="r${K.LET[l] === V.myLetter ? " me" : ""}${g ? "" : " z"}"><span class="l">${K.LET[l]}</span><span class="x">합계 ${H.totLetter[l]}점</span><span class="g">${g ? "+" + g : "0"}</span></div>`).join("")}${V.over ? `<div class="dn-note">알파벳 공개: ${V.letters.map((L, s) => `${L}=${s === me ? "나" : esc(nm(s))}`).join(" · ")}</div>` : ""}</div>`;
    } else if (watch) acts = `<div class="dn-note">${V.needs.length ? V.needs.map(i => esc(nm(i))).join(" · ") + " 코인 정하는 중…" : ""}</div>`;
    else if (V.myBid != null) acts = `<div class="dn-note">코인 ${V.myBid}개를 냈어요 · 다른 사람을 기다려요 (${V.subbed.filter(Boolean).length}/${V.n})</div>`;
    else if (can) {
      const mx = V.coins, q = [0, 1, 2, 3, 5].filter(x => x <= mx);
      acts = `<div class="dn-bid"><button data-d="-1" ${sel.c <= 0 ? "disabled" : ""}>−</button><div style="text-align:center"><b>${sel.c}개</b><small>가진 코인 ${mx}개 중 · 가장 많이 낸 수만큼 시침이 가요 (아무도 안 내면 1칸)</small></div><button data-d="1" ${sel.c >= mx ? "disabled" : ""}>＋</button></div>
        <div class="dn-quick">${q.map(x => `<button data-q="${x}" class="${sel.c === x ? "on" : ""}">${x}</button>`).join("")}<button data-q="${mx}" class="${sel.c === mx && !q.includes(mx) ? "on" : ""}">전부</button></div>
        <div class="dn-acts" style="margin:0"><button class="btn primary" data-a="bid">${sel.c}개 내기</button></div>`;
    }
    h += `<div class="dn-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      if (!can || V.phase !== "bid" || V.myBid != null) return;
      const d = e.target.closest("[data-d]"), q = e.target.closest("[data-q]"), a = e.target.closest("[data-a]");
      if (d && !d.disabled) { ctx.sfx("tap"); sel.c = Math.max(0, Math.min(V.coins, sel.c + +d.dataset.d)); render(stage, V, ctx); return; }
      if (q) { ctx.sfx("tap"); sel.c = Math.min(V.coins, +q.dataset.q); render(stage, V, ctx); return; }
      if (a) { ctx.sfx("pop"); ctx.act({ t: "bid", c: sel.c }); }
    };
  }

  function coach(V, me, since, names) {
    if (V.over) return { opp: "판이 끝났어요.", mine: `내 점수 ${V.myScore}점 · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    const H = V.hist, gone = V.tot.map((t, l) => [K.LET[l], t]).filter(x => x[0] !== V.myLetter).sort((a, b) => b[1] - a[1]);
    const opp = !H.length ? "첫 라운드예요 — 시침은 1칸에 있고, 남이 코인을 쓰는 습관은 아직 몰라요." : `${posText(V)}${V.hist[H.length - 1].redraw ? " (구간이 새로 뽑혔어요)" : ""} · 남의 점수는 알파벳으로만 보여요: ${gone.slice(0, 4).map(x => `${x[0]} ${x[1]}점`).join(" · ")}`;
    const mine = `${V.round}/${V.cap} 라운드 · 내 점수 ${V.myScore} · 코인 ${V.coins}개 · 내 구간 낮 ${V.zone[0]}칸(+1) · 밤 ${V.zone[1]}칸(+2)`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me)) {
      const R = K.recommend(V, me);
      if (R) {
        const c = R.a.c, cells = R.cells.sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => `${x[0]}칸 ${pc(x[1])}`).join(" · ");
        rec = c ? `코인 ${c}개 내기` : "코인 0개 내기 (아끼기)";
        why = `시침이 지금 있을 칸을 추정하면 ${cells}. 코인 ${c}개를 내면 다음 시침이 내 구간에 설 때의 기대 점수는 ${R.row.u.toFixed(2)}점 (0개 내면 ${R.none.u.toFixed(2)}점). 코인은 한 번 내면 사라져서 한 개마다 ${R.cost.toFixed(2)}점쯤으로 쳤어요.`;
      }
    } else if (V.phase === "show") { rec = "결과를 보고 다음 라운드를 준비해요"; why = "시침이 밤에 있으면 내 득점으로 위치를 좁혀요: 점수가 없었다면 내 구간이 아닌 칸이에요."; }
    return { opp, mine, rec, why };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const why = V.end === "goal" ? `${V.goal}점 도달` : `${V.cap}라운드 끝`;
    return `<div class="dn-res"><div>${V.round}라운드 · ${why}</div>${order.map(s => `<div>${V.ranks[s] + 1}위 ${who(s)} (${V.letters[s]}) <b>${V.finalScore[s]}점</b></div>`).join("")}</div>`;
  }
  const actText = a => (!a ? "—" : `코인 ${a.c}개 내기`);
  function review(V, seat, myA, bestA) {
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    const d = (J.best.net - J.my.net) || 0;
    return { sev: Math.max(0, Math.min(100, Math.round(d * 120))), why: `내 ${myA.c}개: 기대 ${J.my.u.toFixed(2)}점 (코인 값 뺀 ${J.my.net.toFixed(2)}) / 추천 ${bestA.c}개: 기대 ${J.best.u.toFixed(2)}점 (코인 값 뺀 ${J.best.net.toFixed(2)})` };
  }

  function tutorial() {
    style();
    const mini = (here, mine) => `<div class="dn-tut"><div class="dn-clock" style="width:100%"><div class="dn-band">${[1, 2, 3, 4, 5, 6].map(c => `<div class="dn-cell d${c === here ? " here" : ""}">${c}${c === here ? '<span class="hand">🕐</span>' : ""}${c === mine ? "<small>★ +1</small>" : ""}</div>`).join("")}</div></div></div>`;
    return [
      { tag: "STEP 1 · 시계", title: "12칸 시계 · 낮 6칸, 밤 6칸", body: "시침은 1칸에서 시작해요. <b>1~6은 낮</b> — 시침이 어디 있는지 모두에게 보여요. <b>7~12는 밤</b> — 시침이 어디 있는지 <b>비밀</b>이에요.",
        boardHtml: mini(1, 0), ms: 6000 },
      { tag: "STEP 2 · 구간", title: "내 구간에 서면 점수", body: "나만 아는 <b>낮 구간 1개</b>(서면 +1점)와 <b>밤 구간 1개</b>(서면 +2점)를 받아요. 시침이 내 칸에 서는 라운드에 점수를 얻어요. 남과 구간이 겹칠 수 있어요. 점수는 이름 없이 <b>알파벳</b>으로만 알려줘요.",
        boardHtml: mini(4, 4), ms: 6600 },
      { tag: "STEP 3 · 코인", title: "코인으로 시침을 움직여요", body: "코인은 <b>20개</b>. 라운드마다 모두 <b>비밀로</b> 코인을 내요. <b>가장 많이 낸 수만큼</b> 시침이 움직이고, 낸 코인은 모두 사라져요. 아무도 안 내도 시침은 <b>1칸</b> 가요.",
        boardHtml: `<div class="dn-tut"><div class="dn-show" style="width:100%"><div class="r"><span class="l">나</span><span class="x">3개 냄</span><span class="g">−3</span></div><div class="r"><span class="l">AI</span><span class="x">1개 냄</span><span class="g">−1</span></div><div class="dn-note">가장 많이 낸 3개 → 시침 3칸 이동</div></div></div>`, ms: 7000 },
      { tag: "STEP 4 · 끝", title: "10점을 먼저!", body: "먼저 <b>10점</b>이 되면 끝나요 (30라운드까지 아무도 안 되면 그때 1등). 구간은 시침이 <b>24칸</b> 움직일 때마다 새로 뽑아요. 코인을 아끼는 것도, 쓰는 것도 작전이에요.",
        boardHtml: `<div class="dn-tut"><div class="dn-score"><span class="dn-chip">A 8점</span><span class="dn-chip me">B (나) 10점</span><span class="dn-chip">C 6점</span></div></div>`, ms: 6400 },
      { tag: "STEP 5 · 직접", title: "코인을 몇 개 낼까요?", body: "시침은 지금 5칸이고, 내 낮 구간은 <b>6칸</b>이에요. 다른 사람은 모두 코인을 안 낸다고 해요. 내 구간에 서려면 코인을 몇 개 내야 할까요?",
        interactive: { hint: "👆 숫자를 눌러 보세요 (코인을 아끼는 쪽이 이득이에요)", doneText: "✅ 0개여도 시침은 1칸 가요 → 6칸 +1점, 코인도 아껴요!" },
        render(stage, ctrl) {
          let n = null;
          const draw = () => {
            const mv = n == null ? 0 : Math.max(1, n), at = ((5 - 1 + mv) % 12) + 1;
            const res = n == null ? "" : n <= 1 ? `시침 1칸 이동 → ${at}칸 · +1점${n ? " (코인 1개 아낄 수 있었어요)" : ""}` : `시침 ${n}칸 이동 → ${at}칸 · 내 구간이 아니에요`;
            stage.innerHTML = `${mini(5, 6)}<div class="dn-quick" style="width:100%;margin-top:8px">${[0, 1, 2, 3, 4].map(k => `<button data-n="${k}" class="${n === k ? "on" : ""}">${k}</button>`).join("")}</div><b style="display:block;text-align:center;font-size:14px;color:#fde68a;min-height:20px;margin-top:6px">${res}</b>`;
            if (n === 0) ctrl.complete();
          };
          stage.onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; ctrl.sfx("tap"); n = +b.dataset.n; draw(); };
          draw();
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.daynight = {
    name: "낮과 밤", emoji: "🕐", short: "코인으로 시침을 움직여 내 구간에 세워요", min: 4, max: 8, defN: 6, board: false, fitCoach: true, src: SRC, diff: DIFF,
    opts: [],
    howto: [
      "목표: 먼저 <b>10점</b>을 모으면 끝 (동시에 넘으면 높은 쪽 · 점수가 같으면 공동 1위)",
      "준비: <b>12칸 시계</b> · 시침은 1칸에서 시작 · 코인 20개 · 나만 아는 <b>낮 구간 1칸(+1점)</b> · <b>밤 구간 1칸(+2점)</b>",
      "진행: <b>1~6 낮</b>(시침 보임) · <b>7~12 밤</b>(시침 숨김) · 라운드마다 코인을 비밀로 내요 — <b>가장 많이 낸 수만큼</b> 시침이 움직이고 (아무도 안 내면 1칸) 낸 코인은 모두 사라져요",
      "점수: 시침이 선 칸이 내 구간이면 득점 · 점수는 이름 없이 <b>알파벳</b>으로만 공개 (라운드마다 합계도)",
      "특수: 구간은 시침이 <b>24칸</b> 움직일 때마다 새로 뽑아요",
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.cap} 라운드 · ${V.phase === "bid" ? "코인 내기" : "결과"}`),
    chip: (V, i) => ({ t: i === V.seat ? `${V.myLetter} ${V.myScore}점` : V.phase === "bid" ? (V.subbed[i] ? "✓" : "…") : "", on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

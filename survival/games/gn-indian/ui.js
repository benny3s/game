/* 베니 서바이벌 · 인디언 포커 — 화면 (상대 카드만 보임 · 베팅 · 카드 세기 · 공개 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-indian"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.ip-top{display:flex;align-items:center;gap:8px;flex:none;flex-wrap:wrap}
.ip-rd{font:900 14px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.ip-pot{font:900 16px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap}
.ip-pot small{font-weight:700;color:var(--soft);font-size:11.5px}
.ip-table{flex:none;display:grid;gap:6px;justify-items:center}
.ip-seat{display:grid;justify-items:center;gap:3px;min-width:0}
.ip-lb{font:700 12.5px var(--round);color:var(--soft)}
.ip-lb b{color:#fff}
.ip-bet{font:800 12.5px var(--round);color:#fde68a;min-height:16px}
.ip-card{position:relative;display:grid;place-items:center;width:96px;height:132px;border-radius:14px;background:#f8fafc;color:#0f172a;font:900 66px/1 var(--round);border:4px solid #e11d48;box-shadow:0 6px 16px rgba(0,0,0,.45)}
.ip-card.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 7px,#991b1b 7px 14px);border-color:#fca5a5;color:#fecaca}
.ip-card.back::after{content:"🔒";position:absolute;right:-8px;top:-8px;font-size:20px}
.ip-card.ten{border-color:#f5b301}
.ip-card.win{box-shadow:0 0 0 3px #4ade80,0 0 22px rgba(74,222,128,.6)}
.ip-card.lose{opacity:.7}
.ip-card .lbl{position:absolute;bottom:-1px;left:0;right:0;text-align:center;font:700 10px var(--round);color:#64748b}
.ip-forehead{font-size:11.5px;color:var(--soft);text-align:center}
.ip-track{display:flex;gap:3px;justify-content:center;flex-wrap:wrap;flex:none}
.ip-pip{display:grid;justify-items:center;font:800 11px var(--round);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);border-radius:7px;padding:2px 5px;min-width:26px}
.ip-pip i{font-style:normal;letter-spacing:1px;font-size:10px;color:#fde68a}
.ip-pip.gone{opacity:.35}.ip-pip.see{border-color:#fb7185}
.ip-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.ip-info b{color:#fde68a}
.ip-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.ip-btns{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ip-btns .btn{padding:12px 8px;font-size:15px}
.ip-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.ip-raise{display:flex;gap:5px;align-items:center;justify-content:center;flex-wrap:wrap}
.ip-raise button{min-width:38px;height:34px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 10px}
.ip-raise button:disabled{opacity:.3}
.ip-raise .to{min-width:52px;text-align:center;font:900 20px var(--round);color:#fde68a}
.ip-res{flex:none;text-align:center;font:800 15px var(--round);color:#bbf7d0;padding:7px;border-radius:12px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.ip-res.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.ip-res.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.ip-tut{display:grid;gap:8px;justify-items:center;font-size:14px}
.ip-tut .row{display:flex;gap:14px;align-items:flex-end}
.ip-tut .ip-card{width:62px;height:86px;font-size:42px;border-width:3px}
@media (max-height:780px){.ip-card{width:74px;height:100px;font-size:50px;border-width:3px}.ip-track{gap:2px}.ip-pip{padding:1px 3px;min-width:24px}.ip-btns .btn{padding:9px 6px}.ip-table{gap:3px}}
@media (max-height:690px){.ip-card{width:60px;height:80px;font-size:40px}.ip-forehead,.ip-warn{display:none}.ip-acts{gap:5px}.ip-info{font-size:11.5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const raiseState = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.cur}`; if (!RS || RS.key !== key) RS = { key, to: Math.min(V.cap, V.cur + 1) }; return RS; };
  const card = (v, cls = "", label = "") => v > 0 ? `<div class="ip-card ${v === 10 ? "ten " : ""}${cls}">${v}${label ? `<span class="lbl">${label}</span>` : ""}</div>` : `<div class="ip-card back ${cls}">?${label ? `<span class="lbl">${label}</span>` : ""}</div>`;

  function trackHtml(V, seeOpp) {
    const used = V.used || [], opp = seeOpp;
    let h = "";
    for (let r = 1; r <= 10; r++) {
      const n = used.filter(x => x === r).length;
      const left = 2 - n;
      h += `<span class="ip-pip${left <= 0 ? " gone" : ""}${opp === r ? " see" : ""}" title="${r} — 남은 ${left}장${opp === r ? " (상대 카드)" : ""}">${r}<i>${"●".repeat(Math.max(0, left))}${"○".repeat(Math.min(2, n))}</i></span>`;
    }
    return `<div class="ip-track" aria-label="남은 카드 세기">${h}</div>`;
  }
  function resText(V, ctx, me) {
    const R = V.res; if (!R) return "";
    const nm = i => i === me ? "나" : esc(nameOf(ctx, i));
    if (R.type === "draw") return `<div class="ip-res mid">🤝 무승부 (${R.cards[0]} = ${R.cards[1]})<br>판돈 ${R.pot}칩은 다음 판 이긴 사람이 가져가요 (다음 판은 기본 베팅 없음)</div>`;
    if (R.type === "fold") {
      const mineFold = R.folder === me;
      return `<div class="ip-res ${R.win === me ? "" : "bad"}">${nm(R.folder)} 폴드 → ${nm(R.win)} +${R.gain}칩${R.pen ? `<br>💥 폴드한 카드가 10! 페널티 ${R.pen}칩을 더 냈어요` : ""}${mineFold && !R.pen ? "" : ""}</div>`;
    }
    return `<div class="ip-res ${me >= 0 && R.win !== me ? "bad" : ""}">${nm(R.win)} 승! (${R.cards[R.win]} > ${R.cards[1 - R.win]}) · +${R.gain}칩</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const top = watch ? 1 : 1 - me, bot = watch ? 0 : me;
    const reveal = V.phase === "reveal" || V.phase === "end";
    const R = V.res;
    let h = `<div class="ip-top"><span class="ip-rd">${V.round}${V.maxR < 30 ? ` / ${V.maxR}` : ""} 판</span><span class="ip-pot">🪙 판돈 ${reveal ? (R ? R.pot : 0) : V.pot}${V.carry && !reveal ? ` <small>(이월 ${V.carry} 포함)</small>` : ""}</span></div>`;
    const winCls = i => (reveal && R && R.type !== "draw" && R.win === i ? "win" : reveal && R && R.type !== "draw" ? "lose" : "");
    const bet = i => (V.phase === "bet" ? `건 칩 ${V.contrib[i]}` : "");
    const topCard = watch ? V.cards[top] : V.cards[top];
    h += `<div class="ip-table">
      <div class="ip-seat"><div class="ip-lb"><b>${esc(nameOf(ctx, top))}</b> · 칩 ${V.chips[top]}</div>${card(topCard, winCls(top), watch ? "" : "이마의 카드")}<div class="ip-bet">${bet(top)}</div></div>
      <div class="ip-forehead">${watch ? "구경 중 — 두 카드가 다 보여요" : "상대 이마의 카드가 보여요 · 내 카드는 상대만 봐요"}</div>
      <div class="ip-seat">${card(V.cards[bot], winCls(bot), watch ? "" : "내 이마 (안 보임)")}<div class="ip-bet">${bet(bot)}</div><div class="ip-lb"><b>${watch ? esc(nameOf(ctx, bot)) : "나"}</b> · 칩 ${V.chips[bot]}</div></div>
    </div>`;
    h += trackHtml(V, watch ? 0 : V.cards[top]);
    let acts = "";
    if (reveal) {
      h += resText(V, ctx, watch ? -1 : me);
    } else if (!watch && ctx.canAct) {
      const need = V.cur - V.contrib[me], RSt = raiseState(V, ctx);
      const first = V.contrib[1 - me] === V.cur && V.contrib[me] === V.cur;
      h += `<div class="ip-info">${need > 0 ? `상대가 <b>${V.cur}칩</b>까지 걸었어요 · 콜하면 <b>${need}칩</b> 더` : `내가 먼저예요 · 콜은 <b>바로 공개</b>, 레이즈는 상대가 고를 차례`} · 최대 ${V.cap}칩</div>`;
      acts = `<div class="ip-acts">
        <div class="ip-btns"><button class="btn primary" data-a="call">${need > 0 ? `콜 ${need}칩 · 공개` : "콜 · 바로 공개"}</button><button class="btn fold" data-a="fold" title="내 카드가 10이면 칩 10개를 더 내요">폴드 ⚠️</button></div>
        ${V.canRaise ? `<div class="ip-raise"><button data-r="-1" ${RSt.to <= V.cur + 1 ? "disabled" : ""}>−</button><span class="to">${RSt.to}칩</span><button data-r="1" ${RSt.to >= V.cap ? "disabled" : ""}>+1</button><button data-r="5" ${RSt.to >= V.cap ? "disabled" : ""}>+5</button><button data-r="max" ${RSt.to >= V.cap ? "disabled" : ""}>올인 ${V.cap}</button></div><button class="btn big" data-a="raise">레이즈 → ${RSt.to}칩까지</button>` : `<div class="ip-info">더 올릴 칩이 없어요</div>`}
        <div class="ip-info ip-warn">⚠️ 내 카드가 <b>10</b>인 채 폴드하면 칩 10개를 더 내요</div></div>`;
    } else {
      const who = V.needs.length ? esc(nameOf(ctx, V.needs[0])) : "";
      h += `<div class="ip-info">${who} 차례예요…${V.contrib[V.turn === 0 ? 1 : 0] > V.contrib[V.turn] && V.turn !== me ? "" : ""}</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const RSt = raiseState(V, ctx);
      if (t.dataset.r) {
        const d = t.dataset.r;
        RSt.to = d === "max" ? V.cap : Math.max(V.cur + 1, Math.min(V.cap, RSt.to + +d));
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.a === "call") { ctx.sfx("pop"); ctx.act({ t: "call" }); }
      else if (t.dataset.a === "fold") { ctx.sfx("pop"); ctx.act({ t: "fold" }); }
      else if (t.dataset.a === "raise") { ctx.sfx("pop"); ctx.act({ t: "raise", to: RSt.to }); }
    };
  }
  function result(V) {
    const H = V.hist || [];
    const w = H.filter(x => x.type !== "draw").length, d = H.length - w;
    return `<b>${V.round}판</b> · 무승부 ${d}번 · 폴드 ${H.filter(x => x.type === "fold").length}번 · 10 폴드 페널티 ${H.filter(x => x.pen).length}번`;
  }
  function tutorial() {
    style();
    const c = (v, cls = "") => card(v, cls);
    return [
      { tag: "STEP 1 · 카드", title: "내 카드는 상대만 봐요", body: "카드는 <b>1 ~ 10</b> 두 장씩 20장이에요. 각자 카드 한 장을 <b>이마에 붙여서</b> 상대 카드만 보여요. 내 카드가 뭔지는 <b>상대 표정과 베팅</b>으로 짐작해야 해요.",
        boardHtml: `<div class="ip-tut"><div class="row"><div>${c(8)}<small>상대 카드 (보임)</small></div><div>${c(0)}<small>내 카드 (안 보임)</small></div></div></div>`, ms: 5600 },
      { tag: "STEP 2 · 베팅", title: "기본 1칩 · 콜 · 레이즈 · 폴드", body: "매 판 <b>기본 베팅 1칩</b>씩 내요. 선부터 <b>레이즈</b>(더 걸기) · <b>콜</b>(따라가며 공개) · <b>폴드</b>(포기, 낸 칩만 잃음)를 골라요. 콜하면 두 카드가 공개되고 <b>높은 숫자</b>가 판돈을 다 가져가요.",
        boardHtml: `<div class="ip-tut"><span class="ip-pot">🪙 판돈 8</span><div class="ip-btns" style="width:100%"><span class="btn primary">콜 3칩</span><span class="btn fold">폴드</span></div></div>`, ms: 5600 },
      { tag: "STEP 3 · 직접", title: "누가 이길까요?", body: "상대 카드가 <b>2</b>예요. 내 카드가 2보다 클 가능성이 높으니 <b>레이즈</b>가 좋아요! 눌러서 판돈을 키워 봐요.",
        interactive: { hint: "👆 '레이즈'를 눌러요", doneText: "✅ 상대 카드가 낮으면 레이즈! (내 카드는 7이었어요)" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="ip-tut"><div>${c(2)}</div><div class="ip-btns" style="width:100%"><button class="btn primary" data-k="call">콜 · 공개</button><button class="btn" data-k="raise">레이즈</button><button class="btn fold" data-k="fold">폴드</button></div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; if (b.dataset.k === "raise") { ctrl.sfx("win"); stage.innerHTML = `<div class="ip-tut"><div class="row">${c(2, "lose")}${c(7, "win")}</div><div class="ip-res">내 카드 7 > 2 · 레이즈가 통했어요!</div></div>`; ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 4 · 함정", title: "10 을 들고 폴드하면 −10칩", body: "내 카드가 <b>10</b>인 채 폴드하면 칩 <b>10개를 더</b> 내야 해요. 내 카드를 모르니까 큰 베팅에 겁먹고 폴드했다가 당하는 게 핵심 함정! 같은 숫자면 <b>무승부</b>라 판돈이 다음 판 승자에게 가요.",
        boardHtml: `<div class="ip-tut"><div class="ip-res bad">내가 폴드 → 내 카드는 10!<br>기본 1칩 + 페널티 10칩 = −11칩</div></div>`, ms: 6000 },
      { tag: "STEP 5 · 세기", title: "남은 카드를 세요", body: "공개된 카드는 버려져요. 20장 안에서 <b>남은 숫자</b>를 세면 내 카드를 더 잘 짐작해요 (화면 아래 숫자 줄). 칩이 0이 되면 바로 패배! 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="ip-tut"><div class="ip-track">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => `<span class="ip-pip${r === 3 || r === 9 ? " gone" : ""}">${r}<i>${r === 3 || r === 9 ? "○○" : "●●"}</i></span>`).join("")}</div></div>`, ms: 5000 },
    ];
  }

  // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 의 기대 칩 평가 evalActs 로 두 수를 같은 잣대로 잼)
  const pcs = x => Math.round(x * 100) + "%";
  const sgn = v => (v < -0.05 ? "−" : "+") + Math.abs(v).toFixed(1);
  const mul = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const actText = (a, V) => {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "fold") return "폴드";
    if (a.t === "call") { const need = V && V.contrib && V.turn != null && V.contrib[V.turn] != null ? V.cur - V.contrib[V.turn] : 0; return need > 0 ? `콜 — ${need}칩 더 맞춰서 공개` : "콜 — 바로 공개"; }
    if (a.t === "raise" && Number.isFinite(+a.to)) { const to = a.to | 0; return `레이즈 → ${to}칩까지${V && V.cap && to >= V.cap ? " (올인)" : ""}`; }
    return "—";
  };
  const shortAct = a => (a.t === "fold" ? "폴드" : a.t === "call" ? "콜" : `레이즈 ${a.to | 0}칩`);
  const okAct = a => !!a && (a.t === "fold" || a.t === "call" || (a.t === "raise" && Number.isFinite(+a.to)));
  // sev = (고급 AI 수의 기대 칩 − 내 수의 기대 칩) ÷ (시작 칩의 15%) × 100 → 시작 칩 45 면 손해 약 4칩부터 60 (📒), 25 면 약 2.3칩
  const review = (V, seat, myA, bestA, info) => {
    if (!V || V.phase !== "bet" || !(seat === 0 || seat === 1) || !okAct(myA) || !okAct(bestA)) return null;
    const key = a => (a.t === "raise" ? `raise ${a.to | 0}` : a.t);
    if (key(myA) === key(bestA)) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0;
    const E = G.evalActs(V, seat, mul(seed), [myA, bestA]), em = E.ex[0], eb = E.ex[1], loss = eb - em;
    if (!Number.isFinite(em) || !Number.isFinite(eb)) return null;
    const sev = Math.round(Math.min(100, Math.max(0, 100 * loss / Math.max(2, 0.15 * (V.start || 30)))));
    const o = V.cards[1 - seat], P = E.P, fold = myA.t === "fold" || bestA.t === "fold";
    const why = `내 수 ${shortAct(myA)} 기대 칩 ${sgn(em)} · 고급 AI ${shortAct(bestA)} 기대 칩 ${sgn(eb)}${loss <= 0.05 ? " (거의 같아요)" : ""} — 상대 카드 ${o} 기준 내 카드가 더 클 확률 약 ${pcs(P.win)}${P.draw >= 0.01 ? ` · 같을 확률 ${pcs(P.draw)}` : ""}${fold ? ` · 내 카드가 10일 확률 ${pcs(P.p10)} (10 을 들고 폴드하면 −10칩)` : ""}${bestA.t === "raise" && P.win < 0.4 ? " · 상대가 접을 가능성까지 계산한 값이에요" : ""}`;
    return { sev, why };
  };

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-indian"] = {
    name: "인디언 포커", emoji: "🪪", short: "상대 카드만 보이는 1:1 베팅", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 1 · 인디언 포커", season: "시즌 1 게임의 법칙",
    opts: [
      { k: "chips", label: "시작 칩", items: [[45, "45칩 (7화)"], [25, "25칩 (결승)"]], def: 45 },
      { k: "rounds", label: "판 수", items: [[30, "끝까지 (최대 30판)"], [12, "12판 승부"]], def: 30 },
    ],
    diff: "선(먼저 거는 사람)은 첫 판 동전 던지기, 이후 번갈아요 (방송 문서에 없음) · 무승부 뒤 판은 기본 베팅 없음 (홀덤 규칙을 따름) · 30판이 넘으면 칩이 많은 쪽 승리",
    howto: [
      "카드는 <b>1~10 두 장씩 20장</b> — 내 카드는 이마에 붙어 <b>상대만 봐요</b>",
      "기본 1칩 → 선부터 <b>콜 · 레이즈 · 폴드</b>. 콜하면 공개, <b>높은 숫자</b>가 판돈을 가져가요",
      "내 카드가 <b>10인 채 폴드하면 칩 10개를 더</b> 내요 · 같은 숫자면 무승부(판돈 이월)",
      "칩이 0이 되면 바로 패배 · 남은 카드를 세면 유리해요",
    ],
    sub: V => V.over ? "끝" : `${V.round}판${V.carry ? ` · 이월 ${V.carry}` : ""}`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: V.chips[i] <= 0 }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

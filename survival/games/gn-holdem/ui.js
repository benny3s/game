/* 베니 서바이벌 · 인디언 홀덤 — 화면 (공유카드 2장 · 상대 카드만 보임 · 조합 · 베팅 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-holdem"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CAT = G.CAT;
  const CSS = `
.hd-top{display:flex;align-items:center;gap:8px;flex:none;flex-wrap:wrap}
.hd-rd{font:900 14px var(--round);color:#fff;background:rgba(14,165,233,.25);border:1px solid rgba(56,189,248,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.hd-pot{font:900 16px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap}
.hd-pot small{font-weight:700;color:var(--soft);font-size:11.5px}
.hd-table{flex:none;display:grid;gap:5px;justify-items:center}
.hd-seat{display:grid;justify-items:center;gap:3px;min-width:0}
.hd-lb{font:700 12.5px var(--round);color:var(--soft)}
.hd-lb b{color:#fff}
.hd-bet{font:800 12.5px var(--round);color:#fde68a;min-height:15px}
.hd-card{position:relative;display:grid;place-items:center;width:84px;height:112px;border-radius:13px;background:#f8fafc;color:#0f172a;font:900 58px/1 var(--round);border:4px solid #0ea5e9;box-shadow:0 6px 16px rgba(0,0,0,.45)}
.hd-card.back{background:repeating-linear-gradient(45deg,#0c4a6e 0 7px,#075985 7px 14px);border-color:#7dd3fc;color:#bae6fd}
.hd-card.back::after{content:"🔒";position:absolute;right:-8px;top:-8px;font-size:19px}
.hd-card.sh{border-color:#f5b301;width:64px;height:86px;font-size:44px;border-radius:11px}
.hd-card.win{box-shadow:0 0 0 3px #4ade80,0 0 22px rgba(74,222,128,.6)}
.hd-card.lose{opacity:.7}
.hd-card .lbl{position:absolute;bottom:-1px;left:0;right:0;text-align:center;font:700 10px var(--round);color:#64748b}
.hd-cat{position:absolute;top:-9px;left:50%;transform:translateX(-50%);white-space:nowrap;font:900 11px var(--round);padding:1px 8px;border-radius:99px;color:#0f172a;background:#fde68a;border:1px solid #f5b301}
.hd-cat.c3{background:#fca5a5;border-color:#ef4444}.hd-cat.c2{background:#fdba74;border-color:#f97316}
.hd-sharedrow{display:flex;gap:10px;align-items:center;justify-content:center}
.hd-sharedlb{font:800 11.5px var(--round);color:#fde68a;text-align:center;line-height:1.3}
.hd-sharedlb small{display:block;font-weight:700;color:var(--soft);font-size:11px}
.hd-forehead{font-size:11.5px;color:var(--soft);text-align:center}
.hd-track{display:flex;gap:3px;justify-content:center;flex-wrap:wrap;flex:none}
.hd-pip{display:grid;justify-items:center;font:800 11px var(--round);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);border-radius:7px;padding:2px 4px;min-width:25px}
.hd-pip i{font-style:normal;letter-spacing:0;font-size:9px;color:#fde68a}
.hd-pip.gone{opacity:.35}.hd-pip.sh{border-color:#f5b301}.hd-pip.see{border-color:#38bdf8}
.hd-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.hd-info b{color:#fde68a}
.hd-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.hd-btns{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.hd-btns .btn{padding:12px 8px;font-size:15px}
.hd-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.hd-raise{display:flex;gap:5px;align-items:center;justify-content:center;flex-wrap:wrap}
.hd-raise button{min-width:38px;height:34px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 10px}
.hd-raise button:disabled{opacity:.3}
.hd-raise .to{min-width:52px;text-align:center;font:900 20px var(--round);color:#fde68a}
.hd-res{flex:none;text-align:center;font:800 14.5px var(--round);color:#bbf7d0;padding:7px;border-radius:12px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.hd-res.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.hd-res.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.hd-order{flex:none;text-align:center;font:700 11.5px var(--round);color:var(--soft)}
.hd-order b{color:#fde68a}
.hd-tut{display:grid;gap:8px;justify-items:center;font-size:14px}
.hd-tut .row{display:flex;gap:12px;align-items:flex-end}
.hd-tut .hd-card{width:56px;height:76px;font-size:38px;border-width:3px}
.hd-tut .hd-card.sh{width:50px;height:68px;font-size:34px}
.hd-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px;margin-top:2px}
.hd-table>.hd-seat:first-child .hd-lb{margin-bottom:8px}
@media (max-height:780px){.hd-card .lbl{display:none}.hd-card{width:66px;height:88px;font-size:46px;border-width:3px}.hd-card.sh{width:52px;height:70px;font-size:36px}.hd-track{gap:2px}.hd-pip{padding:1px 3px;min-width:23px}.hd-btns .btn{padding:9px 6px}.hd-table{gap:3px}.hd-sharedrow{gap:8px}}
@media (max-height:690px){.hd-card{width:52px;height:68px;font-size:36px}.hd-card.sh{width:44px;height:58px;font-size:30px}.hd-forehead,.hd-warn,.hd-order{display:none}.hd-acts{gap:5px}.hd-info{font-size:11.5px}.hd-pip i{display:none}.hd-lb{font-size:11.5px}.hd-sharedlb small{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const raiseState = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.cur}`; if (!RS || RS.key !== key) RS = { key, to: Math.min(V.cap, V.cur + 1) }; return RS; };
  const card = (v, cls = "", label = "", cat = 0) => {
    const badge = cat > 0 ? `<span class="hd-cat c${cat}">${CAT[cat]}</span>` : "";
    return v > 0 ? `<div class="hd-card ${cls}">${badge}${v}${label ? `<span class="lbl">${label}</span>` : ""}</div>` : `<div class="hd-card back ${cls}">?${label ? `<span class="lbl">${label}</span>` : ""}</div>`;
  };

  function trackHtml(V, watch, me) {
    // 40장(숫자마다 4장) 중 지금까지 보인 것: 지난 판들 + (이번 판이 진행 중이면) 공유카드 · 보이는 카드
    const reveal = V.phase === "reveal" || V.phase === "end";
    const seen = Array(11).fill(0);
    for (const c of V.used) seen[c]++;
    if (!reveal) {
      for (const c of V.shared) seen[c]++;
      V.cards.forEach((c, i) => { if (c > 0) seen[c]++; });
    }
    let h = "";
    for (let r = 1; r <= 10; r++) {
      const left = Math.max(0, 4 - seen[r]);
      const isSh = !reveal && V.shared.includes(r);
      h += `<span class="hd-pip${left <= 0 ? " gone" : ""}${isSh ? " sh" : ""}" title="${r} — 보이지 않은 카드 ${left}장"><span>${r}</span><i>×${left}</i></span>`;
    }
    return `<div class="hd-track" aria-label="안 보인 카드 세기">${h}</div>`;
  }
  function resText(V, ctx, me) {
    const R = V.res; if (!R) return "";
    const nm = i => i === me ? "나" : esc(nameOf(ctx, i));
    const cs = i => `${R.cards[i]}(${CAT[R.cat[i]]})`;
    if (R.type === "draw") return `<div class="hd-res mid">🤝 무승부 (${cs(0)} = ${cs(1)})<br>판돈 ${R.pot}칩은 다음 판 이긴 사람이 가져가요 (다음 판은 기본 베팅 없음)</div>`;
    if (R.type === "fold") {
      return `<div class="hd-res ${R.win === me ? "" : "bad"}">${nm(R.folder)} 폴드 → ${nm(R.win)} +${R.gain}칩${R.pen ? `<br>💥 폴드한 카드가 ${CAT[R.cat[R.folder]]}! 페널티 ${R.pen}칩을 더 냈어요` : ""}<br><small>카드 ${nm(0)} ${cs(0)} · ${nm(1)} ${cs(1)}</small></div>`;
    }
    return `<div class="hd-res ${me >= 0 && R.win !== me ? "bad" : ""}">${nm(R.win)} 승! ${cs(R.win)} > ${cs(1 - R.win)} · +${R.gain}칩</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const top = watch ? 1 : 1 - me, bot = watch ? 0 : me;
    const reveal = V.phase === "reveal" || V.phase === "end";
    const R = V.res;
    let h = `<div class="hd-top"><span class="hd-rd">${V.round}${V.maxR < 30 ? ` / ${V.maxR}` : ""} 판</span><span class="hd-pot">🪙 판돈 ${reveal ? (R ? R.pot : 0) : V.pot}${V.carry && !reveal ? ` <small>(이월 ${V.carry} 포함)</small>` : ""}</span></div>`;
    const winCls = i => (reveal && R && R.type !== "draw" && R.win === i ? "win" : reveal && R && R.type !== "draw" ? "lose" : "");
    const bet = i => (V.phase === "bet" ? `건 칩 ${V.contrib[i]}` : "");
    const cat = i => (V.cards[i] > 0 ? G.cat(V.shared, V.cards[i]) : 0);
    h += `<div class="hd-table">
      <div class="hd-seat"><div class="hd-lb"><b>${esc(nameOf(ctx, top))}</b> · 칩 ${V.chips[top]}</div>${card(V.cards[top], winCls(top), watch ? "" : "이마의 카드", cat(top))}<div class="hd-bet">${bet(top)}</div></div>
      <div class="hd-sharedrow">${card(V.shared[0], "sh")}<div class="hd-sharedlb">공유카드<small>둘 다 보여요</small></div>${card(V.shared[1], "sh")}</div>
      <div class="hd-seat">${card(V.cards[bot], winCls(bot), watch ? "" : "내 이마 (안 보임)", reveal ? cat(bot) : 0)}<div class="hd-bet">${bet(bot)}</div><div class="hd-lb"><b>${watch ? esc(nameOf(ctx, bot)) : "나"}</b> · 칩 ${V.chips[bot]}</div></div>
    </div>`;
    h += trackHtml(V, watch, me);
    h += `<div class="hd-order">조합 순서: <b>트리플</b> &gt; <b>스트레이트</b> &gt; <b>더블</b> &gt; 없음 · 같으면 내 카드 숫자</div>`;
    let acts = "";
    if (reveal) {
      h += resText(V, ctx, watch ? -1 : me);
    } else if (!watch && ctx.canAct) {
      const need = V.cur - V.contrib[me], RSt = raiseState(V, ctx);
      h += `<div class="hd-info">${need > 0 ? `상대가 <b>${V.cur}칩</b>까지 걸었어요 · 콜하면 <b>${need}칩</b> 더` : `내가 먼저예요 · 콜은 <b>바로 공개</b>, 레이즈는 상대가 고를 차례`} · 최대 ${V.cap}칩</div>`;
      acts = `<div class="hd-acts">
        <div class="hd-btns"><button class="btn primary" data-a="call">${need > 0 ? `콜 ${need}칩 · 공개` : "콜 · 바로 공개"}</button><button class="btn fold" data-a="fold" title="내 카드가 스트레이트·트리플이면 칩 10개를 더 내요">폴드 ⚠️</button></div>
        ${V.canRaise ? `<div class="hd-raise"><button data-r="-1" ${RSt.to <= V.cur + 1 ? "disabled" : ""}>−</button><span class="to">${RSt.to}칩</span><button data-r="1" ${RSt.to >= V.cap ? "disabled" : ""}>+1</button><button data-r="5" ${RSt.to >= V.cap ? "disabled" : ""}>+5</button><button data-r="max" ${RSt.to >= V.cap ? "disabled" : ""}>올인 ${V.cap}</button></div><button class="btn big" data-a="raise">레이즈 → ${RSt.to}칩까지</button>` : `<div class="hd-info">더 올릴 칩이 없어요</div>`}
        <div class="hd-info hd-warn">⚠️ 내 카드가 <b>스트레이트·트리플</b>인 채 폴드하면 칩 <b>10</b>개를 더 내요${V.doublePen ? ` (더블은 ${V.doublePen}개)` : ""}</div></div>`;
    } else {
      const who = V.needs.length ? esc(nameOf(ctx, V.needs[0])) : "";
      h += `<div class="hd-info">${who} 차례예요…</div>`;
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
    return `<b>${V.round}판</b> · 무승부 ${d}번 · 폴드 ${H.filter(x => x.type === "fold").length}번 · 폴드 페널티 ${H.filter(x => x.pen).length}번`;
  }
  function tutorial() {
    style();
    const c = (v, cls = "", cat = 0, label = "") => card(v, cls, label, cat);
    const cell = (v, cap, cls = "", cat = 0) => `<div>${c(v, cls, cat)}<small>${cap}</small></div>`;
    return [
      { tag: "STEP 1 · 카드", title: "공유카드 2장 + 이마의 카드", body: "카드는 <b>1 ~ 10 네 장씩 40장</b>이에요. 매 판 <b>공유카드 2장</b>이 모두에게 보이고, 각자 카드 한 장을 <b>이마에 붙여서</b> 상대 카드만 보여요. 내 카드가 뭔지는 상대 표정과 베팅으로 짐작해요.",
        boardHtml: `<div class="hd-tut"><div class="row">${cell(8, "상대 카드 (보임)")}${cell(3, "공유", "sh")}${cell(7, "공유", "sh")}${cell(0, "내 카드 (안 보임)")}</div></div>`, ms: 6200 },
      { tag: "STEP 2 · 조합", title: "트리플 > 스트레이트 > 더블", body: "내 카드와 공유카드 둘이 만드는 조합이에요. <b>트리플</b>은 세 장이 같은 숫자, <b>스트레이트</b>는 세 장이 이어지는 숫자(<b>10과 1도 이어져요</b>), <b>더블</b>은 내 카드가 공유 하나와 같은 경우예요. 조합이 높은 쪽이 이기고, 같은 조합이면 <b>내 카드 숫자</b>가 큰 쪽이 이겨요.",
        boardHtml: `<div class="hd-tut"><div class="row">${cell(4, "공유", "sh")}${cell(5, "공유", "sh")}${cell(6, "스트레이트", "", 2)}</div><div class="row">${cell(9, "공유", "sh")}${cell(10, "공유", "sh")}${cell(1, "10 → 1 도 이어짐", "", 2)}</div></div>`, ms: 7600 },
      { tag: "STEP 3 · 베팅", title: "기본 1칩 · 콜 · 레이즈 · 폴드", body: "매 판 <b>기본 베팅 1칩</b>씩 내요. 선부터 <b>레이즈</b>(더 걸기) · <b>콜</b>(따라가며 공개) · <b>폴드</b>(포기, 낸 칩만 잃음)를 골라요. 콜하면 카드가 공개돼요. 같으면 <b>무승부</b>라 판돈이 다음 판 승자에게 가요.",
        boardHtml: `<div class="hd-tut"><span class="hd-pot">🪙 판돈 8</span><div class="hd-btns" style="width:100%"><span class="btn primary">콜 3칩</span><span class="btn fold">폴드</span></div></div>`, ms: 5600 },
      { tag: "STEP 4 · 직접", title: "누가 이길까요?", body: "공유카드가 <b>2 · 9</b> (간격이 멀어 스트레이트 · 트리플이 안 나와요)이고 상대 카드는 <b>1</b>이에요. 숫자 싸움이니 내 카드가 1보다 클 가능성이 높아요 — <b>레이즈</b>를 눌러 판돈을 키워 봐요!",
        interactive: { hint: "👆 '레이즈'를 눌러요", doneText: "✅ 상대 카드가 낮으면 레이즈! (내 카드는 6이었어요)" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="hd-tut"><div class="row">${c(2, "sh")}${c(9, "sh")}${c(1)}</div><div class="hd-btns" style="width:100%"><button class="btn primary" data-k="call">콜 · 공개</button><button class="btn" data-k="raise">레이즈</button><button class="btn fold" data-k="fold">폴드</button></div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; if (b.dataset.k === "raise") { ctrl.sfx("win"); stage.innerHTML = `<div class="hd-tut"><div class="row">${c(2, "sh")}${c(9, "sh")}</div><div class="row">${c(1, "lose")}${c(6, "win")}</div><div class="hd-res">내 카드 6 > 1 · 레이즈가 통했어요!</div></div>`; ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 5 · 함정", title: "조합을 들고 폴드하면 −10칩", body: "내 카드가 <b>스트레이트나 트리플</b>인 채 폴드하면 칩 <b>10개를 더</b> 내야 해요 (결승 판은 <b>더블 폴드도 5개</b>). 공유카드 간격이 <b>0~2</b>면 조합이 나올 수 있으니 큰 베팅에 쉽게 접지 마세요! 간격이 3 이상이면 큰 페널티는 걱정 안 해도 돼요.",
        boardHtml: `<div class="hd-tut"><div class="hd-res bad">내가 폴드 → 내 카드가 스트레이트!<br>기본 1칩 + 페널티 10칩 = −11칩</div></div>`, ms: 6400 },
      { tag: "STEP 6 · 세기", title: "안 보인 카드를 세요", body: "공개된 카드와 공유카드를 빼고 <b>남은 숫자</b>를 세면 내 카드를 더 잘 짐작해요 (화면 아래 숫자 줄). 칩이 0이 되면 바로 패배! 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="hd-tut"><div class="hd-track">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => `<span class="hd-pip${r === 3 || r === 7 ? " sh" : ""}"><span>${r}</span><i>×${r === 3 || r === 7 ? 3 : 4}</i></span>`).join("")}</div></div>`, ms: 5000 },
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
  // sev = (고급 AI 수의 기대 칩 − 내 수의 기대 칩) ÷ (시작 칩의 15%) × 100 → 시작 칩 15 면 손해 약 1.4칩부터 60 (📒), 20 이면 1.8칩
  const review = (V, seat, myA, bestA, info) => {
    if (!V || V.phase !== "bet" || !(seat === 0 || seat === 1) || !okAct(myA) || !okAct(bestA)) return null;
    const key = a => (a.t === "raise" ? `raise ${a.to | 0}` : a.t);
    if (key(myA) === key(bestA)) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0;
    const E = G.evalActs(V, seat, mul(seed), [myA, bestA]), em = E.ex[0], eb = E.ex[1], loss = eb - em;
    if (!Number.isFinite(em) || !Number.isFinite(eb)) return null;
    const sev = Math.round(Math.min(100, Math.max(0, 100 * loss / Math.max(2, 0.15 * (V.start || 15)))));
    const y = V.cards[1 - seat], P = E.P, fold = myA.t === "fold" || bestA.t === "fold", cy = G.cat(V.shared, y);
    const why = `내 수 ${shortAct(myA)} 기대 칩 ${sgn(em)} · 고급 AI ${shortAct(bestA)} 기대 칩 ${sgn(eb)}${loss <= 0.05 ? " (거의 같아요)" : ""} — 공유 ${V.shared[0]}·${V.shared[1]} · 상대 카드 ${y}${cy ? `(${G.CAT[cy]})` : ""} 기준 이길 확률 약 ${pcs(P.win)}${P.draw >= 0.01 ? ` · 무승부 ${pcs(P.draw)}` : ""}${fold && P.penE >= 0.05 ? ` · 조합을 들고 폴드하면 페널티 (기대 −${P.penE.toFixed(1)}칩)` : ""}${bestA.t === "raise" && P.win < 0.4 ? " · 상대가 접을 가능성까지 계산한 값이에요" : ""}`;
    return { sev, why };
  };

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-holdem"] = {
    name: "인디언 홀덤", emoji: "🃏", short: "공유카드 2장 · 상대 카드만 보이는 1:1 베팅", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 2 · 인디언 홀덤", season: "시즌 2 룰 브레이커",
    opts: [
      { k: "ver", label: "판", items: [["a", "7화 (칩 15 · 폴드 페널티 10)"], ["b", "결승 (칩 20 · 더블 폴드 5 추가)"]], def: "a" },
      { k: "rounds", label: "판 수", items: [[30, "끝까지 (최대 30판)"], [12, "12판 승부"]], def: 30 },
    ],
    diff: "선(먼저 거는 사람)은 첫 판 동전 던지기, 이후 번갈아요 (방송 문서에 없음) · 무승부 뒤 판은 기본 베팅 없음 · 공유카드 둘이 같고 내 카드가 다르면 '없음' · 30판이 넘으면 칩이 많은 쪽 승리",
    howto: [
      "카드는 <b>1~10 네 장씩 40장</b> · 공유카드 2장이 보이고, 내 카드는 이마에 붙어 <b>상대만 봐요</b>",
      "조합 <b>트리플 &gt; 스트레이트(10과 1도 이어짐) &gt; 더블</b> · 같은 조합이면 내 카드 숫자가 큰 쪽",
      "기본 1칩 → 선부터 <b>콜 · 레이즈 · 폴드</b>. 콜하면 공개 · 같으면 무승부(판돈 이월)",
      "<b>스트레이트 · 트리플을 든 채 폴드하면 칩 10개를 더</b> 내요 (결승 판은 더블 5개도) · 칩이 0이면 패배",
    ],
    sub: V => V.over ? "끝" : `${V.round}판${V.carry ? ` · 이월 ${V.carry}` : ""}`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: V.chips[i] <= 0 }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

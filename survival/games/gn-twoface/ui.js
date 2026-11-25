/* 베니 서바이벌 · 양면포커 — 화면 (앞뒤 양면 카드 · 면 고르기 · 베팅 · 양면베팅 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-twoface"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SIDE = ["앞면", "뒷면"];
  const CSS = `
.tf-top{display:flex;align-items:center;gap:8px;flex:none;flex-wrap:wrap}
.tf-rd{font:900 14px var(--round);color:#fff;background:rgba(168,85,247,.25);border:1px solid rgba(192,132,252,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.tf-pot{font:900 16px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap}
.tf-pot small{font-weight:700;color:var(--soft);font-size:11.5px}
.tf-table{flex:none;display:grid;gap:6px;justify-items:center}
.tf-seat{display:grid;justify-items:center;gap:3px;min-width:0}
.tf-lb{font:700 12.5px var(--round);color:var(--soft)}
.tf-lb b{color:#fff}
.tf-bet{font:800 12.5px var(--round);color:#fde68a;min-height:15px;text-align:center}
.tf-card{display:flex;gap:6px;padding:6px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16)}
.tf-face{position:relative;display:grid;place-items:center;width:76px;height:98px;border-radius:12px;background:#f8fafc;color:#0f172a;font:900 52px/1 var(--round);border:4px solid #a855f7;box-shadow:0 5px 14px rgba(0,0,0,.45)}
.tf-face.bk{border-color:#38bdf8}
.tf-face.unk{background:repeating-linear-gradient(45deg,#3b0764 0 7px,#581c87 7px 14px);color:#e9d5ff;border-color:#c084fc}
.tf-face.bk.unk{background:repeating-linear-gradient(45deg,#0c4a6e 0 7px,#075985 7px 14px);color:#bae6fd;border-color:#7dd3fc}
.tf-face.unk::after{content:"🔒";position:absolute;right:-7px;top:-8px;font-size:17px}
.tf-face .sd{position:absolute;bottom:2px;left:0;right:0;text-align:center;font:800 10px var(--round);color:#64748b}
.tf-face.unk .sd{color:#e9d5ff}
.tf-face.sel{box-shadow:0 0 0 3px #fde68a,0 0 18px rgba(253,230,138,.55);transform:translateY(-3px)}
.tf-face.tap{cursor:pointer}
.tf-face.tap:hover{transform:translateY(-3px)}
.tf-face.dim{opacity:.5}
.tf-face.win{box-shadow:0 0 0 3px #4ade80,0 0 22px rgba(74,222,128,.6)}
.tf-face.lose{opacity:.6}
.tf-dbl{position:absolute;top:-10px;left:50%;transform:translateX(-50%);white-space:nowrap;font:900 11px var(--round);padding:1px 9px;border-radius:99px;color:#0f172a;background:#fca5a5;border:1px solid #ef4444}
.tf-cardw{position:relative}
.tf-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.tf-info b{color:#fde68a}
.tf-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.tf-btns{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.tf-btns .btn{padding:11px 8px;font-size:15px}
.tf-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.tf-row{display:flex;gap:5px;align-items:center;justify-content:center}
.tf-row button.st{min-width:36px;height:34px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 9px}
.tf-row button.st:disabled{opacity:.3}
.tf-row .to{min-width:46px;text-align:center;font:900 19px var(--round);color:#fde68a}
.tf-row .btn{flex:1;padding:9px 6px;font-size:14px}
.tf-row .btn.dbl{background:rgba(190,18,60,.35);border-color:#fb7185}
.tf-res{flex:none;text-align:center;font:800 14.5px var(--round);color:#bbf7d0;padding:7px;border-radius:12px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);line-height:1.4}
.tf-res.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.tf-res.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.tf-res small{font-weight:700;color:var(--soft)}
.tf-tut{display:grid;gap:8px;justify-items:center;font-size:14px}
.tf-tut .row{display:flex;gap:12px;align-items:flex-end}
.tf-tut .tf-face{width:54px;height:72px;font-size:36px;border-width:3px}
.tf-tut .tf-card{gap:4px;padding:4px}
.tf-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px;margin-top:2px}
@media (max-height:780px){.tf-face{width:62px;height:80px;font-size:42px;border-width:3px}.tf-face .sd{display:none}.tf-table{gap:4px}.tf-btns .btn{padding:9px 6px}.tf-acts{gap:5px}}
@media (max-height:690px){.tf-face{width:52px;height:66px;font-size:34px}.tf-card{gap:4px;padding:4px}.tf-info{font-size:11.5px}.tf-lb{font-size:11.5px}.tf-bet{min-height:13px;font-size:11.5px}.tf-warn{display:none}.tf-row .btn{padding:7px 5px;font-size:13px}.tf-btns .btn{padding:8px 6px;font-size:14px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.cur}|${V.dbl.join()}|${V.turn}`;
    if (!RS || RS.key !== key) RS = { key, side: V.side[ctx.me] >= 0 ? V.side[ctx.me] : (RS && RS.keep >= 0 && RS.round === V.round ? RS.keep : 1), to: Math.min(V.cap, V.cur + 1), x: Math.max(V.dRange.lo, 1), round: V.round, keep: -1 };
    return RS;
  };
  const faceHtml = (v, kind, opt = {}) => {
    const unk = !(v > 0);
    return `<div class="tf-face ${kind === 1 ? "bk" : ""}${unk ? " unk" : ""}${opt.sel ? " sel" : ""}${opt.tap ? " tap" : ""}${opt.dim ? " dim" : ""}${opt.win ? " win" : ""}${opt.lose ? " lose" : ""}"${opt.tap ? ` data-side="${kind}"` : ""}>${unk ? "?" : v}<span class="sd">${SIDE[kind]}${opt.note ? ` · ${opt.note}` : ""}</span></div>`;
  };
  const cardHtml = (c, o = {}) => `<div class="tf-cardw">${o.dbl ? `<span class="tf-dbl">양면베팅 ${o.dbl}</span>` : ""}<div class="tf-card">${faceHtml(c.f, 0, o.f || {})}${faceHtml(c.b, 1, o.b || {})}</div></div>`;

  function resText(V, ctx, me) {
    const R = V.res; if (!R) return "";
    const nm = i => i === me ? "나" : esc(nameOf(ctx, i));
    const fv = i => `${nm(i)} ${SIDE[R.side[i]] || "뒷면"} ${R.side[i] === 0 ? R.cards[i][0] : R.cards[i][1]}`;
    if (R.type === "draw") return `<div class="tf-res mid">🤝 무승부 (${fv(0)} = ${fv(1)})<br><small>판돈 ${R.pot}칩은 다음 판 이긴 사람이 가져가요</small></div>`;
    if (R.type === "fold") return `<div class="tf-res ${R.win === me ? "" : "bad"}">${nm(R.folder)} 폴드 → ${nm(R.win)} +${R.gain}칩${R.pen ? `<br>💥 양면베팅에 폴드! 페널티 ${R.pen}칩을 더 냈어요` : ""}</div>`;
    if (R.type === "dbl") {
      const D = R.D, S = 1 - D, v = R.side[S] === 0 ? R.cards[S][0] : R.cards[S][1];
      return `<div class="tf-res ${me >= 0 && R.win !== me ? "bad" : ""}">${R.ok ? `🎯 ${nm(D)}의 양면베팅 성공! (앞 ${R.cards[D][0]} · 뒤 ${R.cards[D][1]} 모두 > ${nm(S)} ${SIDE[R.side[S]]} ${v})<br>+${R.gain}칩 (보너스 ${R.bonus})` : `💨 ${nm(D)}의 양면베팅 실패 (앞 ${R.cards[D][0]} · 뒤 ${R.cards[D][1]} vs ${nm(S)} ${SIDE[R.side[S]]} ${v})<br>${nm(R.win)} +${R.gain}칩`}</div>`;
    }
    return `<div class="tf-res ${me >= 0 && R.win !== me ? "bad" : ""}">${nm(R.win)} 승! ${fv(R.win)} > ${fv(1 - R.win)} · +${R.gain}칩</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const top = watch ? 1 : 1 - me, bot = watch ? 0 : me;
    const reveal = V.phase === "reveal" || V.phase === "end", R = V.res, open = reveal && R && R.show;
    const bet = V.phase === "bet";
    const mineTurn = !watch && ctx.canAct && V.needs.includes(me);
    const S = mineTurn ? rs(V, ctx) : null;
    const oppDbl = V.dbl[1 - me] > 0 && !watch;
    let h = `<div class="tf-top"><span class="tf-rd">${V.round}${V.maxR < 30 ? ` / ${V.maxR}` : ""} 판</span><span class="tf-pot">🪙 판돈 ${reveal ? (R ? R.pot : 0) : V.pot}${V.carry && !reveal ? ` <small>(이월 ${V.carry} 포함)</small>` : ""}</span></div>`;
    const faceState = (i, k) => {
      const o = {};
      if (V.side[i] === k) o.sel = true;
      else if (V.side[i] >= 0) o.dim = true;
      if (open && R.type !== "draw" && R.type !== "dbl" && V.side[i] === k) o[R.win === i ? "win" : "lose"] = true;
      if (open && R.type === "dbl") { if (R.D === i) o[R.ok ? "win" : "lose"] = true; else if (V.side[i] === k) o[R.ok ? "lose" : "win"] = true; }
      return o;
    };
    const dbltag = i => (V.dbl[i] > 0 ? `${V.dbl[i]}칩` : "");
    const betTxt = i => (bet ? `${V.dbl[i] > 0 ? `양면베팅 ${V.dbl[i]}칩 · ` : ""}건 칩 ${V.contrib[i]}${V.side[i] >= 0 ? ` · ${SIDE[V.side[i]]}으로 승부` : ""}` : "");
    const topO = { dbl: dbltag(top), f: faceState(top, 0), b: faceState(top, 1) };
    const botO = { dbl: dbltag(bot), f: faceState(bot, 0), b: faceState(bot, 1) };
    if (S && V.side[me] < 0) { botO.f.tap = botO.b.tap = true; (S.side === 0 ? botO.f : botO.b).sel = true; }
    h += `<div class="tf-table">
      <div class="tf-seat"><div class="tf-lb"><b>${esc(nameOf(ctx, top))}</b> · 칩 ${V.chips[top]}</div>${cardHtml(V.cards[top], topO)}<div class="tf-bet">${betTxt(top)}</div></div>
      <div class="tf-seat">${cardHtml(V.cards[bot], botO)}<div class="tf-bet">${betTxt(bot)}</div><div class="tf-lb"><b>${watch ? esc(nameOf(ctx, bot)) : "나"}</b> · 칩 ${V.chips[bot]}</div></div>
    </div>`;
    let acts = "";
    if (reveal) {
      h += resText(V, ctx, watch ? -1 : me);
    } else if (mineTurn) {
      const need = V.cur - V.contrib[me], R2 = V.dRange;
      const chosen = V.side[me] >= 0;
      if (oppDbl) {
        h += `<div class="tf-info">상대가 <b>양면베팅 ${V.dbl[1 - me]}칩</b>! 콜하면 <b>${need}칩</b> 더 · 상대의 앞 · 뒤가 <b>둘 다</b> 내 면보다 크면 상대 성공 (칩 10개 더 잃어요)</div>`;
        acts = `<div class="tf-acts"><div class="tf-btns"><button class="btn primary" data-a="call">콜 ${need}칩 · ${SIDE[S.side]}</button><button class="btn fold" data-a="fold" title="양면베팅에 폴드하면 칩 10개를 더 내요">폴드 ⚠️ −10</button></div>${chosen ? "" : `<div class="tf-info">👆 위 내 카드에서 승부할 면을 눌러요 (지금 ${SIDE[S.side]})</div>`}</div>`;
      } else {
        h += `<div class="tf-info">${need > 0 ? `상대가 <b>${V.cur}칩</b>까지 걸었어요 · 콜하면 <b>${need}칩</b> 더` : V.chk ? `상대가 넘겼어요 · 콜하면 <b>바로 공개</b>` : `내가 먼저예요 · 넘기거나(상대도 넘기면 공개) 걸어요`}${chosen ? ` · 내 면 <b>${SIDE[V.side[me]]}</b> 고정` : `<br>👆 위 내 카드의 <b>앞면 / 뒷면</b>을 눌러 승부할 면을 골라요 (한 번 고르면 못 바꿔요)`}</div>`;
        const canD = R2.hi >= R2.lo;
        S.x = Math.max(R2.lo, Math.min(R2.hi, S.x));
        acts = `<div class="tf-acts">
          <div class="tf-btns"><button class="btn primary" data-a="call">${need > 0 ? `콜 ${need}칩 · 공개` : V.chk ? "콜 · 바로 공개" : "넘기기"}</button><button class="btn fold" data-a="fold">폴드</button></div>
          ${V.canRaise ? `<div class="tf-row"><button class="st" data-r="-1" ${S.to <= V.cur + 1 ? "disabled" : ""}>−</button><span class="to">${S.to}칩</span><button class="st" data-r="1" ${S.to >= V.cap ? "disabled" : ""}>+1</button><button class="st" data-r="5" ${S.to >= V.cap ? "disabled" : ""}>+5</button><button class="btn" data-a="raise">레이즈 → ${S.to}칩</button></div>` : ""}
          ${canD ? `<div class="tf-row"><button class="st" data-x="-1" ${S.x <= R2.lo ? "disabled" : ""}>−</button><span class="to">${S.x}칩</span><button class="st" data-x="1" ${S.x >= R2.hi ? "disabled" : ""}>+</button><button class="btn dbl" data-a="double" title="앞 · 뒤 두 면에 각각 ${S.x}칩 (내 총액 ${1 + 2 * S.x}칩). 성공하면 상대 칩 10개 추가!">양면베팅 ×${S.x} · 총 ${1 + 2 * S.x}칩</button></div>` : ""}
          <div class="tf-info tf-warn">양면베팅은 <b>앞 · 뒤 둘 다</b> 상대 면보다 커야 성공 (성공 +10칩, 실패하면 건 칩 전부)</div></div>`;
      }
    } else {
      const who = V.needs.length ? esc(nameOf(ctx, V.needs[0])) : "";
      h += `<div class="tf-info">${who} 차례예요…</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const f = e.target.closest("[data-side]");
      if (f && S && V.side[me] < 0) { S.side = +f.dataset.side; RS.keep = S.side; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const t = e.target.closest("button"); if (!t || t.disabled || !S) return;
      if (t.dataset.r) { S.to = Math.max(V.cur + 1, Math.min(V.cap, S.to + +t.dataset.r)); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.x) { S.x = Math.max(V.dRange.lo, Math.min(V.dRange.hi, S.x + +t.dataset.x)); ctx.sfx("tap"); render(stage, V, ctx); return; }
      const side = V.side[me] >= 0 ? V.side[me] : S.side;
      if (t.dataset.a === "call") { ctx.sfx("pop"); ctx.act({ t: "call", side }); }
      else if (t.dataset.a === "fold") { ctx.sfx("pop"); ctx.act({ t: "fold" }); }
      else if (t.dataset.a === "raise") { ctx.sfx("pop"); ctx.act({ t: "raise", to: S.to, side }); }
      else if (t.dataset.a === "double") { ctx.sfx("pop"); ctx.act({ t: "double", x: S.x }); }
    };
  }
  function result(V) {
    const H = V.hist || [];
    const dbl = H.filter(x => x.type === "dbl");
    return `<b>${V.round}판</b> · 무승부 ${H.filter(x => x.type === "draw").length}번 · 양면베팅 ${dbl.length}번(성공 ${dbl.filter(x => x.ok).length}) · 폴드 페널티 ${H.filter(x => x.pen).length}번`;
  }
  function tutorial() {
    style();
    const c = (f, b, o = {}) => cardHtml({ f, b }, o);
    return [
      { tag: "STEP 1 · 카드", title: "앞면과 뒷면이 다른 카드", body: "양면 카드의 앞 · 뒤에는 <b>서로 다른 숫자(1~10)</b>가 적혀 있어요. 두 사람은 <b>칩 30개</b>씩(그랜드 파이널은 40개)으로 시작하고, 상대 칩을 <b>모두 얻으면 승리</b>예요. 매 판 카드를 한 장씩 받는데 <b>뒷면은 본인만</b> 확인해요. 우리 판은 <b>상대 앞면만 보이고</b> 내 앞면은 가려요.",
        boardHtml: `<div class="tf-tut"><div class="row"><div>${c(7, 0)}<small>상대 카드 (앞면만 보임)</small></div><div>${c(0, 8)}<small>내 카드 (뒷면만 보임)</small></div></div></div>`, ms: 7200 },
      { tag: "STEP 2 · 기본베팅 · 면", title: "기본베팅 뒤 베팅할 면을 정해요", body: "판마다 <b>기본베팅</b>으로 칩 1개씩을 내고 <b>선</b> 플레이어부터 베팅해요. 베팅할 <b>면(앞면 또는 뒷면)</b>을 정하면 시작한 뒤엔 못 바꿔요. 베팅 방법은 셋이에요 — <b>같은 개수</b>를 걸면(콜) 바로 숫자를 공개해 <b>큰 쪽</b> 승 · <b>더 많이</b> 걸면(레이즈) 이어가고 · <b>포기</b>(폴드)하면 상대 승. 숫자가 같으면 무승부이고, 판돈은 <b>다음 판 이긴 사람</b>이 가져가요.",
        boardHtml: `<div class="tf-tut"><div class="row">${c(7, 0, { b: { sel: true } })}${c(0, 8, { f: {}, b: { sel: true } })}</div><span class="tf-pot">🪙 판돈 8</span></div>`, ms: 8800 },
      { tag: "STEP 3 · 직접", title: "어느 면이 이길까요?", body: "상대 앞면은 <b>3</b>이에요. 상대가 앞면을 고르면 3으로 겨뤄요. 내 뒷면은 <b>8</b> — 내 카드의 <b>뒷면</b>을 눌러 골라 봐요!",
        interactive: { hint: "👆 내 카드의 뒷면(8)을 눌러요", doneText: "✅ 뒷면 8 > 상대 앞면 3 · 알고 있는 큰 숫자를 골랐어요!" },
        render(stage, ctrl) {
          const paint = pick => { stage.innerHTML = `<div class="tf-tut"><div class="row"><div>${c(3, 0)}<small>상대</small></div></div><div class="row"><div class="tf-cardw"><div class="tf-card">${faceHtml(0, 0, { tap: true })}${faceHtml(8, 1, { tap: true, sel: pick === 1 })}</div></div></div></div>`; };
          paint(-1);
          stage.onclick = e => { const f = e.target.closest("[data-side]"); if (!f) return; if (f.dataset.side === "1") { ctrl.sfx("win"); paint(1); ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 4 · 양면베팅", title: "앞 · 뒤 둘 다 크면 +10칩", body: "자신 있으면 <b>양면베팅</b> — 상대가 건 칩과 같은 수의 칩을 <b>앞면 · 뒷면 두 곳에 각각</b> 걸어요 (<b>2배</b>로 거는 셈이에요 · 우리 판은 더 많이도 돼요). 내 두 숫자가 상대가 고른 면보다 <b>모두 높으면 승리</b> → 상대 칩 <b>10개를 추가로</b> 가져와요. 한 면이라도 같거나 낮으면 상대 승! 건 칩을 모두 잃어요.",
        boardHtml: `<div class="tf-tut"><div class="row">${c(9, 6, { dbl: "1칩", f: { win: true }, b: { win: true } })}${c(2, 4, { b: { sel: true } })}</div><div class="tf-res">앞 9 · 뒤 6 모두 &gt; 상대 뒷면 4 → 성공 +10칩</div></div>`, ms: 7000 },
      { tag: "STEP 5 · 함정", title: "양면베팅에 포기하면 −10칩", body: "상대가 <b>양면베팅</b>을 걸었을 때 <b>포기</b>(폴드)하면 칩 <b>10개를 더</b> 내요! 하지만 상대 앞면은 내가 볼 수 있으니, 상대 앞면이 내 면보다 <b>낮거나 같으면 그 양면베팅은 반드시 실패</b> — 이럴 땐 콜! 일반 베팅에 포기하면 낸 칩만 잃어요.",
        boardHtml: `<div class="tf-tut"><div class="tf-res bad">양면베팅에 포기 → 기본 1칩 + 페널티 10칩 = −11칩</div></div>`, ms: 6400 },
    ];
  }

  // ── 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 와 같은 확률 · 기대 칩 평가로 견줌) ──
  const pcT = x => Math.round(x * 100) + "%";
  const sgnT = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    const me = V && typeof V.seat === "number" && V.seat >= 0 ? V.seat : -1, opp = me >= 0 ? 1 - me : -1;
    const sd = me >= 0 && V && V.side && V.side[me] >= 0 ? V.side[me] : a.side, st = sd === 0 || sd === 1 ? ` (${SIDE[sd]})` : "";
    if (a.t === "fold") return me >= 0 && V && V.dbl && V.dbl[opp] > 0 ? "폴드 (양면베팅 폴드 · 페널티 10칩)" : "폴드";
    if (a.t === "call") {
      if (me >= 0 && V && V.dbl && V.dbl[opp] > 0) return `양면베팅 ${V.dbl[opp]}칩 콜`;
      const need = me >= 0 && V && V.contrib ? V.cur - V.contrib[me] : null;
      return need > 0 ? `콜 ${need}칩${st}` : need === 0 ? (V.chk ? `콜 · 바로 공개${st}` : `기본 베팅만 하고 넘기기${st}`) : `콜${st}`;
    }
    if (a.t === "raise") return `${a.to != null ? a.to + "칩까지 " : ""}베팅${st}`;
    if (a.t === "double") return a.x != null ? `양면베팅 ${a.x}칩 (앞 · 뒤 각각)` : "양면베팅";
    return "—";
  }
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || V.phase !== "bet" || (seat !== 0 && seat !== 1)) return null;
    const sideOf = a => (V.side[seat] >= 0 ? V.side[seat] : a.side === 0 || a.side === 1 ? a.side : -1);
    if (myA.t === bestA.t && (myA.to | 0) === (bestA.to | 0) && (myA.x | 0) === (bestA.x | 0) && sideOf(myA) === sideOf(bestA)) return null;   // 같은 수
    const m = G.evalAct(V, seat, myA, "hard"), b = G.evalAct(V, seat, bestA, "hard");
    if (!m || !b) return null;
    const stat = e => (e.kind === "fold" ? `낸 칩만 잃어 기대 칩 ${sgnT(e.ev)}` : e.kind === "foldDbl" ? `페널티 10칩까지 기대 칩 ${sgnT(e.ev)}` : e.kind === "double" ? `양면베팅 성공 확률 ${pcT(e.p)} · 기대 칩 ${sgnT(e.ev)}` : `${e.kind === "callDbl" ? "상대 양면베팅이 실패할 확률" : "이길 확률"} ${pcT(e.p)} · 기대 칩 ${sgnT(e.ev)}`);
    const scale = Math.max(4, 0.2 * (V.start || 30)), gap = b.ev - m.ev;
    let sev = gap < 0.15 ? 0 : 100 * gap / scale;
    if (info && info.same) sev = Math.min(sev, 20);                                            // 고급 AI 도 가끔 두는 수
    if (myA.t === bestA.t && (myA.t === "raise" || myA.t === "double") && m.side === b.side) sev = Math.min(sev, 30);   // 베팅 크기만 다른 것은 판단 차이
    sev = Math.max(0, Math.min(100, Math.round(sev)));
    const tail = gap >= 0.15 ? ` — 기대 칩 ${gap.toFixed(1)} 차이 (시작 칩의 ${Math.round(100 * gap / (V.start || 30))}%)` : gap <= -0.15 ? " — 이 계산으로는 내 수가 더 높아요 (고급 AI 는 상대 반응까지 봐요)" : " — 거의 같아요";
    return { sev, why: `고급 AI 수 (${actText(bestA, V, info && info.names)}): ${stat(b)} / 내 수 (${actText(myA, V, info && info.names)}): ${stat(m)}${tail}` };
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-twoface"] = {
    name: "양면포커", emoji: "🃏", short: "앞뒤가 다른 카드 · 면을 골라 겨루는 1:1 베팅", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 3 · 양면포커", season: "시즌 3 블랙가넷 · 시즌 4 그랜드 파이널",
    opts: [
      { k: "ver", label: "판", items: [["a", "블랙가넷 (카드 90장 · 칩 30)"], ["b", "그랜드 파이널 (200장 · 앞뒤 홀짝 반대 · 칩 40)"]], def: "a" },
      { k: "rounds", label: "판 수", items: [[30, "칩 다 잃을 때까지 (최대 30판)"], [12, "12판 승부"]], def: 30 },
    ],
    diff: "선은 첫 판 동전 던지기, 이후 번갈아요 (방송 문서에 없음) · 양면베팅은 방송처럼 상대가 건 칩과 같은 수를 앞 · 뒷면에 각각 걸고, 우리 판은 더 많이도 걸 수 있어요 (레이즈는 없음) · 양면베팅이 실패하면 건 칩(1 + 2×) 전부를 잃어요 (방송 문서에 정확한 정산 없음) · 양면베팅에 포기하면 10칩을 더 내는 규칙은 방송 규칙 화면에는 안 나와요 (회차 문서 기준) · 방송은 앞면이 '공개된 상태'라고만 설명해요 — 우리 판은 내 앞면을 가리고 상대 앞면만 보여줘요 · 30판이 넘으면 칩이 많은 쪽 승리",
    howto: [
      "양면 카드: 앞 · 뒷면에 <b>서로 다른 숫자(1~10)</b> · 칩 <b>30개</b>씩(그랜드 파이널 40개)으로 시작해 상대 칩을 <b>모두 얻으면</b> 승리 · 내 뒷면과 상대 앞면만 보여요",
      "판마다 <b>기본베팅</b> 1칩씩 → <b>선</b>부터 베팅할 <b>면(앞 · 뒷)</b>을 정해요 (시작하면 못 바꿔요)",
      "베팅은 셋 중 하나 — <b>같은 개수</b>(콜): 바로 공개, 큰 숫자 승 · <b>더 많이</b>(레이즈): 계속 · <b>포기</b>(폴드): 상대 승 · 같은 숫자는 무승부(판돈은 다음 판 승자가)",
      "<b>양면베팅</b>: 앞 · 뒷면 두 곳에 각각 걸어요(2배) → 두 숫자가 <b>모두</b> 상대 면보다 높으면 승 + 상대 칩 <b>10개 추가</b> · 하나라도 같거나 낮으면 패",
      "양면베팅에 <b>포기하면 칩 10개를 더</b> 내요",
    ],
    sub: V => V.over ? "끝" : `${V.round}판${V.carry ? ` · 이월 ${V.carry}` : ""}`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: V.chips[i] <= 0 }),
    render, result,
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

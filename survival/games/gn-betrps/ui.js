/* 베니 서바이벌 · 베팅 가위바위보 — 화면 (증인 표식 · 귀띔 · 승부 또는 베팅 · 정산 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-betrps"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const HAND = G.HAND, EM = G.EM;
  const KIND = { win: "이긴다", lose: "진다", draw: "비긴다" };
  const CSS = `
.bp-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.bp-rd{font:900 14px var(--round);color:#fff;background:rgba(244,63,94,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.bp-rw{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);border-radius:99px;padding:3px 11px;white-space:nowrap}
.bp-strip{display:flex;gap:3px;flex:none;flex-wrap:wrap;justify-content:center}
.bp-dot{min-width:22px;text-align:center;font:800 11px var(--round);color:var(--soft);border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);border-radius:7px;padding:1px 3px}
.bp-dot.now{color:#0f172a;background:#fde68a;border-color:#f5b301}
.bp-dot.done{opacity:.45}
.bp-dot.v{border-style:dashed}
.bp-wit{flex:none;display:flex;gap:10px;align-items:center;justify-content:center;padding:8px 10px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14)}
.bp-mark{display:grid;place-items:center;width:70px;height:70px;border-radius:14px;font:900 40px/1 var(--round);background:repeating-linear-gradient(45deg,#4c0519 0 7px,#881337 7px 14px);border:3px solid #fb7185;color:#fecdd3;box-shadow:0 5px 14px rgba(0,0,0,.4)}
.bp-mark.open{background:#f8fafc;color:#0f172a;font-size:38px}
.bp-mark.open small{display:block;font:800 11px var(--round);margin-top:-2px}
.bp-hint{font-size:12.5px;color:var(--soft);line-height:1.5;min-width:0;flex:1}
.bp-hint b{color:#fde68a}
.bp-hint .em{font-size:19px}
.bp-chips{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bp-c{display:grid;justify-items:center;gap:1px;padding:5px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)}
.bp-c.me{border-color:rgba(251,191,36,.6)}
.bp-c small{font:700 11.5px var(--round);color:var(--soft)}
.bp-c b{font:900 22px var(--round);color:#fde68a}
.bp-c i{font-style:normal;font:800 11px var(--round);color:#bbf7d0}
.bp-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.bp-info b{color:#fde68a}
.bp-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.bp-roles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bp-roles .btn{display:grid;gap:2px;padding:10px 6px;font-size:14px;line-height:1.3}
.bp-roles .btn small{font:700 11px var(--round);color:var(--soft)}
.bp-hands{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bp-hands button{display:grid;place-items:center;gap:0;padding:8px 4px;border-radius:16px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font:800 13px var(--round);cursor:pointer}
.bp-hands button b{font-size:34px;line-height:1.2}
.bp-hands button.sel{border-color:#fde68a;background:rgba(253,230,138,.18);box-shadow:0 0 0 2px rgba(253,230,138,.5)}
.bp-kinds{display:grid;gap:6px}
.bp-kinds.k2{grid-template-columns:1fr 1fr}.bp-kinds.k3{grid-template-columns:1fr 1fr 1fr}
.bp-kinds button{padding:9px 4px;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font:800 14px var(--round);cursor:pointer}
.bp-kinds button.sel{border-color:#fde68a;background:rgba(253,230,138,.18)}
.bp-kinds button small{display:block;font:700 10.5px var(--round);color:var(--soft)}
.bp-row{display:flex;gap:5px;align-items:center;justify-content:center}
.bp-row button.st{min-width:36px;height:34px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;padding:0 10px}
.bp-row button.st:disabled{opacity:.3}
.bp-row .to{min-width:50px;text-align:center;font:900 20px var(--round);color:#fde68a}
.bp-res{flex:none;display:grid;gap:3px;text-align:left;font:700 13.5px var(--round);color:#e2e8f0;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);line-height:1.45}
.bp-res .big{font:900 15.5px var(--round);color:#bbf7d0}
.bp-res .big.bad{color:#fecaca}.bp-res .big.mid{color:#fde68a}
.bp-res small{color:var(--soft);font-weight:700}
.bp-tut{display:grid;gap:8px;justify-items:center;font-size:14px}
.bp-tut .row{display:flex;gap:12px;align-items:center}
.bp-tut .bp-mark{width:58px;height:58px;font-size:32px}
@media (max-height:780px){.bp-mark.open small{display:none}.bp-mark{width:56px;height:56px;font-size:32px}.bp-hands button b{font-size:28px}.bp-acts{gap:5px}.bp-c b{font-size:19px}.bp-hint{font-size:12px}}
@media (max-height:690px){.bp-strip{display:none}.bp-wit{padding:5px 8px}.bp-mark{width:46px;height:46px;font-size:26px}.bp-hint{font-size:11.5px}.bp-c{padding:3px}.bp-c b{font-size:17px}.bp-info{font-size:11.5px}.bp-hands button{padding:5px 3px}.bp-hands button b{font-size:24px}.bp-roles .btn small{display:none}.bp-res{font-size:12.5px;padding:6px 8px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.phase}|${V.duel}`;
    if (!RS || RS.key !== key) RS = { key, hand: -1, kind: "win", n: 1 };
    return RS;
  };
  const markBox = (V, hide) => (V.mark >= 0 && !hide ? `<div class="bp-mark open">${EM[V.mark]}<small>${HAND[V.mark]}</small></div>` : `<div class="bp-mark">?</div>`);

  function strip(V) {
    let h = "";
    for (let r = 1; r <= V.total; r++) {
      const rw = G.rewardOf({ R: V.R, rewards: V.rewards }, r), virt = r > V.R || V.virt[r] !== undefined;
      h += `<span class="bp-dot${r === V.round ? " now" : r < V.round ? " done" : ""}${virt ? " v" : ""}" title="${r}판 · 보상 ${rw}칩${virt ? " · 표식 공개" : ""}">${rw}</span>`;
    }
    return `<div class="bp-strip" aria-label="판별 보상">${h}</div>`;
  }
  function resHtml(V, ctx, me) {
    const R = V.res; if (!R) return "";
    const nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    const rt = R.result === 1 ? "승" : R.result === 0 ? "무승부" : "패";
    const mineWin = me >= 0 ? (R.duel === me ? R.result === 1 : R.bet && R.bet.d > 0) : null;
    let big = "", cls = "";
    if (me >= 0) {
      const dm = R.after[me] - R.before[me], dn = R.after[1 - me] - R.before[1 - me];
      big = dm > dn ? `🎉 이번 판은 내가 +${dm - dn}칩 앞서요` : dm < dn ? `이번 판은 상대가 +${dn - dm}칩 앞서요` : "이번 판은 비겼어요";
      cls = dm > dn ? "" : dm < dn ? "bad" : "mid";
    }
    void mineWin;
    const bet = R.bet ? `${nm(R.better)}의 베팅: <b>${KIND[R.bet.kind]}</b> ${R.bet.n}칩 → ${R.bet.d > 0 ? `적중 +${R.bet.d}칩` : R.bet.d < 0 ? `실패 ${R.bet.d}칩` : "비겨서 돌려받음"}` : `${nm(R.better)}는 칩이 없어 베팅하지 못했어요`;
    return `<div class="bp-res">${me >= 0 ? `<div class="big ${cls}">${big}</div>` : ""}<div>🎭 증인 표식 <b>${EM[R.mark]} ${HAND[R.mark]}</b>${R.virtual ? "" : ` <small>(귀띔: ${nm(0)} ${EM[R.hints[0]]} · ${nm(1)} ${EM[R.hints[1]]})</small>`}</div><div>⚔️ ${nm(R.duel)}의 손 <b>${EM[R.hand]} ${HAND[R.hand]}</b> → <b>${rt}</b>${R.result === 1 ? ` · 보상 +${R.reward}칩` : ""}</div><div>🎲 ${bet}</div><div><small>칩: ${nm(0)} ${R.before[0]} → <b>${R.after[0]}</b> · ${nm(1)} ${R.before[1]} → <b>${R.after[1]}</b></small></div></div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const reveal = V.phase === "reveal" || V.phase === "end", R = V.res;
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const S = mine ? rs(V, ctx) : null;
    const view0 = watch ? 0 : me, other = 1 - view0;
    const role = V.duel < 0 ? "" : V.duel === view0 ? `${watch ? esc(nameOf(ctx, view0)) : "나"} 승부 · ${esc(nameOf(ctx, other))} 베팅` : `${esc(nameOf(ctx, other))} 승부 · ${watch ? esc(nameOf(ctx, view0)) : "나"} 베팅`;
    let h = `<div class="bp-top"><span class="bp-rd">${V.round}${V.round > V.R ? " (연장)" : ` / ${V.R}`} 판</span><span class="bp-rw">🏅 보상 ${V.reward}칩</span>${V.virtual ? `<span class="bp-rw">👻 표식 공개 판</span>` : ""}${role ? `<span class="bp-rw">${role}</span>` : ""}</div>`;
    h += strip(V);
    // 증인
    let hint;
    if (V.virtual) hint = `가상 플레이어 판 — 표식이 <b>${EM[V.mark]} ${HAND[V.mark]}</b>로 처음부터 공개돼요.`;
    else if (watch) hint = `귀띔: ${esc(nameOf(ctx, 0))} <span class="em">${EM[V.hint[0]]}</span> · ${esc(nameOf(ctx, 1))} <span class="em">${EM[V.hint[1]]}</span> <small>(구경 중)</small>`;
    else hint = `증인이 나에게만 귀띔해요: <span class="em">${EM[V.hint]}</span> <b>${HAND[V.hint]}</b><br><small>맞을 확률 50% · 틀리면 나머지 둘 중 하나. 상대도 자기 귀띔을 받았어요.</small>`;
    h += `<div class="bp-wit">${markBox(V, false)}<div class="bp-hint">🎭 <b>증인의 표식</b>${reveal ? " (공개됐어요)" : ""}<br>${hint}</div></div>`;
    h += `<div class="bp-chips"><div class="bp-c me"><small>${watch ? esc(nameOf(ctx, view0)) : "나"}</small><b>🪙 ${V.chips[view0]}</b>${reveal && R ? `<i>${R.after[view0] - R.before[view0] >= 0 ? "+" : ""}${R.after[view0] - R.before[view0]}</i>` : ""}</div><div class="bp-c"><small>${esc(nameOf(ctx, other))}</small><b>🪙 ${V.chips[other]}</b>${reveal && R ? `<i>${R.after[other] - R.before[other] >= 0 ? "+" : ""}${R.after[other] - R.before[other]}</i>` : ""}</div></div>`;
    let acts = "";
    if (reveal) {
      h += resHtml(V, ctx, watch ? -1 : me);
    } else if (V.phase === "role") {
      if (mine) {
        h += `<div class="bp-info">내가 <b>선</b>이에요 — 역할을 골라요 (나머지는 상대 몫).<br><b>⚔️ 승부</b> = 표식과 가위바위보 · <b>🎲 베팅</b> = 상대 승부 결과 맞히기</div>`;
        acts = `<div class="bp-acts"><div class="bp-roles"><button class="btn primary" data-role="duel">⚔️ 승부<small>증인 표식과 가위바위보 · 이기면 +${V.reward}칩</small></button><button class="btn" data-role="bet">🎲 베팅<small>상대 승부에 이긴다/진다${V.drawBet ? "/비긴다" : ""} 걸기</small></button></div></div>`;
      } else h += `<div class="bp-info">${esc(nameOf(ctx, V.first))}가 역할을 고르는 중이에요…</div>`;
    } else if (mine) {
      const duel = V.duel === me;
      if (V.mine) {
        h += `<div class="bp-info">✅ ${V.mine.t === "hand" ? `손을 냈어요: <b>${EM[V.mine.h]} ${HAND[V.mine.h]}</b>` : `<b>${KIND[V.mine.kind]}</b>에 ${V.mine.n}칩을 걸었어요`} — 상대를 기다려요…</div>`;
      } else if (duel) {
        h += `<div class="bp-info">⚔️ 내가 <b>승부</b> — 손을 골라요. 상대는 내 손을 모른 채 <b>이긴다/진다${V.drawBet ? "/비긴다" : ""}</b>에 걸어요.</div>`;
        acts = `<div class="bp-acts"><div class="bp-hands">${[0, 1, 2].map(i => `<button data-h="${i}" class="${S.hand === i ? "sel" : ""}"><b>${EM[i]}</b>${HAND[i]}</button>`).join("")}</div><button class="btn big primary" data-a="hand" ${S.hand < 0 ? "disabled" : ""}>${S.hand < 0 ? "손을 골라요" : `${EM[S.hand]} ${HAND[S.hand]} 내기`}</button></div>`;
      } else {
        const mx = V.chips[me]; S.n = Math.max(1, Math.min(mx, S.n)); if (S.kind === "draw" && !V.drawBet) S.kind = "win";
        const ks = V.drawBet ? ["win", "lose", "draw"] : ["win", "lose"];
        h += `<div class="bp-info">🎲 내가 <b>베팅</b> — 상대 승부 결과를 맞혀요 (적중 +건 칩 · 틀리면 −건 칩 · 비기면 돌려받음${V.drawBet ? " · 비긴다 적중은 +2배" : ""}).</div>`;
        acts = `<div class="bp-acts"><div class="bp-kinds k${ks.length}">${ks.map(k => `<button data-k="${k}" class="${S.kind === k ? "sel" : ""}">${KIND[k]}<small>${k === "draw" ? "맞히면 +2배" : "상대 승부가"}</small></button>`).join("")}</div>
          <div class="bp-row"><button class="st" data-n="-1" ${S.n <= 1 ? "disabled" : ""}>−</button><span class="to">${S.n}칩</span><button class="st" data-n="1" ${S.n >= mx ? "disabled" : ""}>+1</button><button class="st" data-n="max" ${S.n >= mx ? "disabled" : ""}>전부 ${mx}</button></div>
          <button class="btn big primary" data-a="bet">${KIND[S.kind]}에 ${S.n}칩 걸기</button></div>`;
      }
    } else if (!watch && V.phase === "play") {
      h += `<div class="bp-info">${V.duel === me ? "손을 낸" : ""} ${V.mine ? `✅ 정했어요 — 상대를 기다려요…` : `상대가 정하는 중이에요…`}</div>`;
    } else {
      h += `<div class="bp-info">${V.done.map((d, i) => `${esc(nameOf(ctx, i))} ${d ? "✅" : "⏳"}`).join(" · ")}</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !S) return;
      if (t.dataset.role) { ctx.sfx("pop"); ctx.act({ t: "role", role: t.dataset.role }); return; }
      if (t.dataset.h) { S.hand = +t.dataset.h; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.k) { S.kind = t.dataset.k; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.n) { const mx = V.chips[me]; S.n = t.dataset.n === "max" ? mx : Math.max(1, Math.min(mx, S.n + +t.dataset.n)); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "hand" && S.hand >= 0) { ctx.sfx("pop"); ctx.act({ t: "hand", h: S.hand }); }
      else if (t.dataset.a === "bet") { ctx.sfx("pop"); ctx.act({ t: "bet", kind: S.kind, n: S.n }); }
    };
  }
  function result(V) {
    const H = V.hist || [];
    const bets = H.filter(x => x.bet), hit = bets.filter(x => x.bet.d > 0).length;
    return `<b>${V.round}판</b> · 승부 승 ${H.filter(x => x.result === 1).length}번 · 무승부 ${H.filter(x => x.result === 0).length}번 · 베팅 ${bets.length}번(적중 ${hit}번)${V.ot ? ` · 연장 ${V.ot}판` : ""}`;
  }
  function tutorial() {
    style();
    const mk = (m, open = true) => `<div class="bp-mark${open ? " open" : ""}">${open ? `${EM[m]}<small>${HAND[m]}</small>` : "?"}</div>`;
    return [
      { tag: "STEP 1 · 라운드", title: "칩 1개씩 · 라운드마다 숨은 표식", body: "탈락 후보 두 사람은 <b>칩 1개</b>씩으로 시작해요. 라운드마다 <b>관전 플레이어</b>(우리 화면에선 증인)가 정한 가위 · 바위 · 보 <b>표식</b>이 숨어 있고, 한 사람은 그 표식과 <b>가위바위보 승부</b>, 다른 사람은 그 결과에 <b>베팅</b>해요. 정해진 라운드가 끝났을 때 <b>칩이 더 많은 쪽</b>이 승리해요.",
        boardHtml: `<div class="bp-tut"><div class="row">${mk(0, false)}<span>⚔️ 승부 vs 🎲 베팅</span></div></div>`, ms: 6200 },
      { tag: "STEP 2 · 선 · 후", title: "선 플레이어가 승부 · 베팅을 골라요", body: "<b>선 플레이어</b>가 먼저 <b>승부</b>나 <b>베팅</b> 중 하나를 고르면 <b>후 플레이어</b>는 고르지 않은 쪽이 돼요 (선은 첫 라운드 동전 던지기, 2라운드부터 번갈아). 승부하는 사람은 손을 비밀로 내고, 베팅하는 사람은 그 승부가 <b>승리인지 패배인지</b> 칩 <b>1개 이상</b>을 걸어요 (둘이 동시에 정해요). 칩이 없으면 베팅은 안 해도 돼요.",
        boardHtml: `<div class="bp-tut"><div class="row"><span class="bp-rw">⚔️ 손 ✌️✊✋</span><span class="bp-rw">🎲 이긴다 / 진다</span></div></div>`, ms: 6400 },
      { tag: "STEP 3 · 정산", title: "보상 · 맞히면 2배 · 비기면 환급", body: "승부에서 <b>이기면 그 라운드 보상 칩</b>을 받아요 (후반일수록 커져요, 위 숫자 줄 · 그랜드 파이널은 1~3라운드 1개 → 10 · 11라운드 4개). 베팅은 <b>맞히면 건 칩의 2배</b>를 받고, <b>틀리면 건 칩을 잃고</b>, 승부가 <b>무승부면 건 칩을 그대로 돌려받아요</b>. 그랜드 파이널 판은 <b>무승부</b>(비긴다)에 걸어 맞히면 <b>3배</b>!",
        boardHtml: `<div class="bp-tut"><div class="bp-res"><div class="big">승부 승 → 보상 +2칩</div><div>🎲 이긴다 3칩 적중 → 건 칩의 2배 (+3칩)</div><div>🎲 진다 3칩 → −3칩 · 비기면 0</div></div></div>`, ms: 6200 },
      { tag: "STEP 4 · 직접", title: "귀띔을 믿고 손을 내요", body: "증인이 나에게 <b>✌️ 가위</b>라고 귀띔했어요 (맞을 확률 50%). 표식이 가위라면 이기는 손은? <b>✊ 바위</b>를 눌러 봐요!",
        interactive: { hint: "👆 가위를 이기는 손을 눌러요", doneText: "✅ 바위는 가위를 이겨요! (귀띔이 틀리면 질 수도 있어서 베팅 쪽이 노릴 수 있어요)" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="bp-tut"><div class="row">${mk(0, false)}<div class="bp-hint">귀띔: <span class="em">✌️</span> <b>가위</b></div></div><div class="bp-hands" style="width:100%">${[0, 1, 2].map(i => `<button data-h="${i}"><b>${EM[i]}</b>${HAND[i]}</button>`).join("")}</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-h]"); if (!b) return; if (+b.dataset.h === 1) { ctrl.sfx("win"); b.classList.add("sel"); ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 5 · 작전", title: "일부러 지기 · 비김으로 굳히기", body: "상대가 <b>'이긴다'</b>에 걸 것 같으면 <b>일부러 져서</b> 그 칩을 태울 수도 있어요 — 단, 읽히면 보상을 놓쳐요. 크게 앞서면 표식과 <b>같은 손으로 비겨</b> 베팅을 무효로 만들어 굳히는 작전도 있어요. 막판 보상 큰 판이 승부처예요. 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="bp-tut"><div class="row"><div class="bp-res"><div class="big mid">일부러 지기: 상대 베팅 −칩</div><div class="big">비김 굳히기: 보상 · 베팅 모두 0</div></div></div></div>`, ms: 6800 },
    ];
  }

  // ── 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 와 같은 승부 · 베팅 기대값으로 견줌) ──
  const pcT = x => Math.round(x * 100) + "%";
  const sgnT = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "role") return a.role === "duel" ? "승부 (내가 가위바위보)" : a.role === "bet" ? "베팅 (상대 승부에 걸기)" : "—";
    if (a.t === "hand") return a.h === 0 || a.h === 1 || a.h === 2 ? `${EM[a.h]} ${HAND[a.h]} 내기` : "—";
    if (a.t === "bet") return KIND[a.kind] ? `'${KIND[a.kind]}'에 ${a.n}칩 베팅` : "—";
    return "—";
  }
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || myA.t !== bestA.t || (seat !== 0 && seat !== 1) || !V.needs || !V.needs.includes(seat)) return null;
    if (myA.role === bestA.role && myA.h === bestA.h && myA.kind === bestA.kind && (myA.n | 0) === (bestA.n | 0)) return null;   // 같은 수
    const m = G.evalAct(V, seat, myA), b = G.evalAct(V, seat, bestA);
    if (!m || !b) return null;
    // 칩 규모(내 칩 + 이번 판 보상)의 30% 가 100점 · 승부 / 베팅 고르기는 고급 AI 도 확률로 고르는 갈림길이라 1.8배 느슨하게
    const scale = Math.max(2, 0.3 * (V.chips[seat] + V.reward)) * (myA.t === "role" ? 1.8 : 1), gap = b.ev - m.ev;
    let sev = gap < 0.1 ? 0 : 100 * gap / scale;
    if (info && info.same) sev = Math.min(sev, 20);                                            // 고급 AI 도 가끔 두는 수
    if (myA.t === "bet" && myA.kind === bestA.kind) sev = Math.min(sev, 30);                   // 같은 쪽에 거는 칩 수만 다른 것은 판단 차이
    sev = Math.max(0, Math.min(100, Math.round(sev)));
    const stat = e => e.kind === "duel" ? `승부하면 ${EM[e.hand]}${HAND[e.hand]}로 이길 확률 ${pcT(e.p)} · 기대 칩 ${sgnT(e.ev)}`
      : e.kind === "bet" ? `베팅하면 상대가 이길 확률 ${pcT(e.p)}${e.noChips ? " (내 칩이 없어 걸 수 없음)" : ""} · 기대 칩 ${sgnT(e.ev)}`
      : e.kind === "hand" ? `이길 확률 ${pcT(e.p)} · 비길 확률 ${pcT(e.pd)} · 기대 칩 ${sgnT(e.ev)}`
      : `맞힐 확률 ${pcT(e.p)} → 기대 칩 ${sgnT(e.ev)}`;
    const tail = gap >= 0.1 ? ` — 기대 칩 ${gap.toFixed(1)} 차이` : gap <= -0.1 ? " — 이 계산으로는 내 수가 더 높아요 (고급 AI 는 앞섬 · 뒤짐도 봐요)" : " — 거의 같아요";
    return { sev, why: `고급 AI 수 (${actText(bestA, V, info && info.names)}): ${stat(b)} / 내 수 (${actText(myA, V, info && info.names)}): ${stat(m)}${tail}` };
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-betrps"] = {
    name: "베팅 가위바위보", emoji: "✌️", short: "증인의 표식 · 승부 또는 베팅 · 1:1 심리전", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 3 · 베팅 가위바위보", season: "시즌 3 블랙가넷 · 시즌 4 그랜드 파이널",
    opts: [
      { k: "ver", label: "판", items: [["a", "시즌 3풍 (10판)"], ["b", "시즌 3풍 (12판 · 가상 플레이어)"], ["d", "그랜드 파이널 3화 (11판 · 무승부 베팅)"]], def: "a" },
    ],
    diff: "증인(방송의 관전 플레이어)은 AI가 맡아요 — 귀띔은 두 사람에게 따로, 맞을 확률 50% (방송은 관전 플레이어 사람이 표식을 정하고 말로 도와요) · 동점이면 표식을 공개한 연장 2판 뒤에도 같으면 무승부 (방송 규칙 화면에는 동점 규칙이 없어요) · 시즌 3풍 두 판(10판 · 12판)은 방송 영상에서 확인하지 못했어요 — 시즌 3 방송(결승 3회전)은 14라운드에 아이템 3개(드로우 베팅 · 표식 미리 뒤집기 · 칩 1개 추가)가 있었고 우리 판에는 없어요",
    howto: [
      "정해진 라운드 동안 가위바위보 <b>승부</b> 또는 승부에 대한 <b>베팅</b>을 해서, 끝났을 때 <b>칩이 더 많은 쪽</b> 승리 · 둘 다 칩 <b>1개</b>씩으로 시작",
      "라운드마다 <b>관전 플레이어</b>(화면의 증인)의 숨은 <b>표식</b>(가위/바위/보) — 나에게는 <b>50%만 맞는 귀띔</b>이 와요 · 가상 플레이어 라운드는 표식이 처음부터 공개",
      "<b>선</b>이 승부 · 베팅 중 하나를 고르면 <b>후</b>는 남은 쪽 — 둘이 동시에 비밀로 정해요 (선은 첫 라운드 동전 던지기, 이후 번갈아)",
      "<b>승부</b>: 표식과 가위바위보, 이기면 <b>라운드 보상</b> 칩 (후반일수록 큼 · 그랜드 파이널 1→4개)",
      "<b>베팅</b>: 승부 결과(승리 · 패배)에 칩 1개 이상 — 맞히면 건 칩의 <b>2배</b>, 틀리면 잃고, 무승부면 돌려받아요 (그랜드 파이널은 무승부 적중 <b>3배</b>) · 칩이 없으면 베팅은 안 해도 돼요",
      "<b>특수</b> — 마지막 판 뒤에도 칩이 같으면 표식을 공개한 <b>연장 2판</b>(보상 1칩) · 그래도 같으면 <b>무승부</b> (끝없는 판을 막는 우리 판 상한, 방송 규칙엔 동점 규칙이 없어요)",
    ],
    sub: V => V.over ? "끝" : `${V.round}/${V.R}판 · 보상 ${V.reward}`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

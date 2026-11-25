/* 베니 서바이벌 · 투자와 기부 — 화면 (투자 · 기부 금액 · 표식 · 라운드 기록 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-invest"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.iv-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.iv-rd{font:900 14px var(--round);color:#fff;background:rgba(34,197,94,.22);border:1px solid rgba(74,222,128,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.iv-bg{font:800 12.5px var(--round);color:#fde68a;white-space:nowrap}
.iv-pl{flex:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:5px}
.iv-p{display:grid;gap:1px;padding:5px 8px;border-radius:11px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0}
.iv-p.me{border-color:#fde68a;background:rgba(253,230,138,.08)}
.iv-p.wait{border-color:#38bdf8}
.iv-p .nm{font:800 12px var(--round);color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iv-p .mk{font:900 14px var(--round);color:#fff;white-space:nowrap}
.iv-p .st{font:700 11px var(--round);color:var(--soft)}
.iv-p.lose{border-color:#fca5a5;background:rgba(239,68,68,.12)}
.iv-p.win{border-color:#86efac;background:rgba(34,197,94,.14)}
.iv-log{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.iv-ev{padding:3px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.iv-ev b{color:#fff}.iv-ev .big{color:#fde68a}.iv-ev .mis{color:#fca5a5}.iv-ev .my{display:block;font:700 11px var(--round);color:var(--soft)}
.iv-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.iv-info b{color:#fde68a}
.iv-box{flex:none;display:grid;gap:6px}
.iv-line{display:grid;grid-template-columns:62px 1fr;gap:6px;align-items:center}
.iv-line .lb{font:900 13px var(--round);color:#fff}
.iv-line .val{font:900 17px var(--round);color:#fde68a;text-align:center}
.iv-st{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.iv-st button{padding:7px 0;border-radius:10px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:800 12.5px var(--round);cursor:pointer}
.iv-sum{font:800 12.5px var(--round);color:var(--soft);text-align:center}
.iv-sum b{color:#fff}.iv-sum .bad{color:#fca5a5}
.iv-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.iv-tut .iv-log{width:100%;box-sizing:border-box;min-height:0}
.iv-tut .iv-pl{width:100%}
.iv-opt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.iv-opt button{padding:9px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 14px var(--round);cursor:pointer}
@media (max-height:780px){.iv-p{padding:3px 7px}.iv-st button{padding:5px 0}.iv-line .val{font-size:15px}.iv-info{font-size:11.5px}}
@media (max-height:690px){.iv-info.hint{display:none}.iv-p .st{display:none}.iv-ev{font-size:11px;padding:2px 6px}.iv-bg{display:none}.iv-pl{gap:3px}.iv-box{gap:4px}.iv-st button{padding:4px 0;font-size:12px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const won = G.won;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}`;
    if (!RS || RS.key !== key) RS = { key, g: ctx.g, v: 0, d: 0 };
    return RS;
  };
  function histHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = V.hist.map(h => {
      const mine = !watch && h.mv !== null ? `<span class="my">내가 낸 금액 — 투자 ${won(h.mv)} · 기부 ${won(h.md)}</span>` : "";
      const am = V.amts && V.amts[h.r] ? `<span class="my">${V.amts[h.r].v.map((x, i) => `${nm(i)} 투자 ${x}·기부 ${V.amts[h.r].d[i]}`).join(" / ")} (천 원)</span>` : "";
      return `<div class="iv-ev"><b>${h.r + 1}라운드</b> · 투자 합 ${won(h.ti)} · 기부 합 ${won(h.td)}<br><span class="big">🏆 대주주 ${h.big >= 0 ? nm(h.big) : "없음"}</span> · <span class="mis">🪙 수전노 ${h.miser.map(nm).join(" · ")}</span>${watch ? am : mine}</div>`;
    });
    return `<div class="iv-log" id="iv-log">${rows.length ? rows.join("") : `<div class="iv-ev">아직 공개된 라운드가 없어요. 모두가 투자와 기부 금액을 정하면 합계 · 대주주 · 수전노만 공개돼요.</div>`}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const top = V.over ? "끝" : mine ? "내 차례 · 금액 정하기" : watch ? "모두 정하는 중" : V.submitted[me] ? "다른 사람을 기다려요" : "대기";
    let h = `<div class="iv-top"><span class="iv-rd">💰 ${V.over ? V.rounds : V.round + 1} / ${V.rounds} 라운드 · ${top}</span>${!watch ? `<span class="iv-bg">내 돈 ${won(V.cash)}</span>` : ""}</div>`;
    h += `<div class="iv-pl">${[...Array(V.n).keys()].map(i => {
      const cls = [i === me && !watch ? "me" : "", V.over && V.losers.includes(i) && !V.draw ? "lose" : "", V.over && V.ranks && V.ranks[i] === 0 && !V.draw ? "win" : ""].join(" ");
      const stt = V.over ? (V.draw ? "무승부" : V.ranks[i] === 0 ? "🎉 우승" : V.losers.includes(i) ? "최하위" : `${V.ranks[i] + 1}위`) : V.submitted[i] ? "✅ 냈어요" : "생각 중…";
      return `<div class="iv-p ${cls}"><div class="nm">${i === me && !watch ? "나" : esc(nameOf(ctx, i))}</div><div class="mk">🏆 ${V.bigC[i]} · 🪙 ${V.misC[i]}</div><div class="st">${stt}${V.cashes ? ` · ${won(V.cashes[i])}` : ""}</div></div>`;
    }).join("")}</div>`;
    h += histHtml(V, ctx, me, watch);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="iv-info"><b>${V.draw ? "수전노 표식이 모두 같아 무승부예요" : first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 최하위(탈락 후보): ${V.draw ? "없음" : V.losers.map(i => (i === me && !watch ? "나" : esc(nameOf(ctx, i)))).join(" · ")}</div>`;
    } else if (mine) {
      const rem = V.cash - S.v - S.d, rLeft = V.rounds - V.round;
      h += `<div class="iv-info hint">투자가 가장 많으면 🏆 대주주 · 기부가 가장 적으면 🪙 수전노 (대주주는 면제) — 남은 ${rLeft}라운드에 돈을 나눠 써요</div>`;
      const stepper = (f, label) => `<div class="iv-line"><span class="lb">${label}</span><div><div class="val">${won(S[f])}</div><div class="iv-st">${[-5, -1, 1, 5].map(x => `<button data-f="${f}" data-s="${x}">${x > 0 ? "+" : "−"}${Math.abs(x) * 1000 >= 1000 ? Math.abs(x) + "천" : ""}</button>`).join("")}<button data-f="${f}" data-s="max">최대</button></div></div></div>`;
      h += `<div class="iv-box">${stepper("v", "💹 투자")}${stepper("d", "🎁 기부")}<div class="iv-sum">내는 돈 <b>${won(S.v + S.d)}</b> · 남는 돈 <span class="${rem < 0 ? "bad" : ""}"><b>${won(rem)}</b></span></div><button class="btn big primary" data-a="bid" ${rem < 0 ? "disabled" : ""}>💸 이대로 내기</button></div>`;
    } else if (watch) h += `<div class="iv-info">구경 중 — ${V.submitted.filter(Boolean).length}/${V.n}명이 냈어요</div>`;
    else h += `<div class="iv-info">${V.submitted[me] ? `✅ 냈어요 (투자 ${won(V.mineBid.v)} · 기부 ${won(V.mineBid.d)}) — ${V.submitted.filter(Boolean).length}/${V.n}명이 냈어요` : "기다리는 중…"}</div>`;
    stage.innerHTML = h;
    const lg = stage.querySelector("#iv-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.f) {
        const f = t.dataset.f, o = f === "v" ? "d" : "v", cap = V.cash - S[o];
        S[f] = t.dataset.s === "max" ? Math.max(0, cap) : Math.max(0, Math.min(cap, S[f] + +t.dataset.s));
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.a === "bid" && S.v + S.d <= V.cash) { ctx.sfx("pop"); ctx.act({ t: "bid", v: S.v, d: S.d }); }
    };
  }
  function result(V) {
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    return `${V.draw ? "무승부 (수전노 표식이 모두 같아요)" : `우승 ${first.join("·")}번 · 최하위 ${V.losers.map(i => i + 1).join("·")}번`} · 대주주 ${V.bigC.join("/")} · 수전노 ${V.misC.join("/")}`;
  }
  function tutorial() {
    style();
    const pl = (list) => `<div class="iv-pl">${list.map(x => `<div class="iv-p ${x.me ? "me" : ""}"><div class="nm">${x.n}</div><div class="mk">${x.mk}</div><div class="st">${x.st || ""}</div></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "9라운드 동안 돈을 나눠 써요", body: "각자 <b>15만 원</b>을 받고 <b>9라운드</b>를 해요. 라운드마다 모두가 <b>투자</b>와 <b>기부</b> 금액을 비밀로 정해요 (0원도 가능). 낸 돈은 돌려받지 못하고, 끝날 때 남은 돈은 의미가 없어요.",
        boardHtml: `<div class="iv-tut">${pl([{ n: "나", mk: "💰 150,000원", me: 1 }, { n: "2번", mk: "💰 150,000원" }, { n: "3번", mk: "💰 150,000원" }])}</div>`, ms: 6500 },
      { tag: "STEP 2 · 표식", title: "대주주와 수전노", body: "라운드가 끝나면 <b>투자 합계 · 기부 합계</b>와 두 가지 표식만 공개돼요. <b>🏆 대주주</b> = 투자를 가장 많이 한 1명 (같은 금액이면 아무도 못 받고 그다음 사람이 받아요). <b>🪙 수전노</b> = 기부를 가장 적게 한 사람 (같으면 모두) — 단 <b>대주주는 수전노를 받지 않아요</b>.",
        boardHtml: `<div class="iv-tut"><div class="iv-log"><div class="iv-ev"><b>1라운드</b> · 투자 합 19,000원 · 기부 합 14,000원<br><span class="big">🏆 대주주 1번</span> · <span class="mis">🪙 수전노 3번</span></div></div></div>`, ms: 7500 },
      { tag: "STEP 3 · 승패", title: "수전노가 가장 많으면 최하위", body: "9라운드가 끝나면 <b>수전노 표식이 가장 많은 사람이 최하위</b>(탈락 후보)예요. 최하위를 뺀 나머지 중 <b>🏆 대주주 표식이 가장 많은 사람이 우승</b>! 그러니 대주주를 노리되, 수전노만큼은 피해야 해요.",
        boardHtml: `<div class="iv-tut">${pl([{ n: "나", mk: "🏆 3 · 🪙 1", st: "🎉 우승", me: 1 }, { n: "2번", mk: "🏆 2 · 🪙 2", st: "2위" }, { n: "3번", mk: "🏆 0 · 🪙 4", st: "최하위" }])}</div>`, ms: 7000 },
      { tag: "STEP 4 · 작전", title: "돈은 남기면 의미가 없어요", body: "정보는 공개된 합계뿐이에요. <b>노릴 라운드</b>엔 투자에 몰고 기부는 조금만, <b>버릴 라운드</b>엔 투자 없이 기부로 수전노를 피해요. 투자한 돈을 잃고도 수전노까지 받을 수 있으니, 남은 돈과 남은 라운드를 늘 같이 계산해요.",
        boardHtml: `<div class="iv-tut"><div class="iv-log"><div class="iv-ev"><b>노리는 라운드</b> 투자 25,000원 · 기부 1,000원<br><b>버리는 라운드</b> 투자 0원 · 기부 8,000원</div></div></div>`, ms: 7000 },
      { tag: "STEP 5 · 직접", title: "대주주는 누구일까요?", body: "투자 금액이 <b>A 5천 · B 9천 · C 9천 · D 4천</b>이에요. 같은 금액이면 아무도 대주주가 못 돼요. 대주주는 누구일까요?",
        interactive: { hint: "👆 대주주를 눌러요", doneText: "✅ B · C 가 9천 원으로 같아서 둘 다 못 받고, 그다음으로 많이 낸 A(5천 원)가 대주주예요!" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="iv-tut"><div class="iv-info"><b>A 5천 · B 9천 · C 9천 · D 4천</b></div><div class="iv-opt">${["A", "B", "C", "D"].map(x => `<button data-w="${x}">${x}</button>`).join("")}</div><div class="iv-info" id="iv-tm">대주주는?</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (b.dataset.w === "A") { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#iv-tm"); if (m) m.textContent = b.dataset.w === "D" ? "D 는 가장 적게 냈어요" : "9천 원이 두 명이면 동률이라 둘 다 못 받아요"; } };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-invest"] = {
    name: "투자와 기부", emoji: "💰", short: "대주주는 노리고 수전노는 피해요 · 9라운드 동안 돈을 나눠 써요", min: 3, max: 6, defN: 6, board: false,
    show: "더 지니어스 · 시즌 3 · 투자와 기부", season: "시즌 3 블랙가넷",
    opts: [],
    diff: "방송은 1천 · 5천 · 1만 · 5만 원권으로 거스름돈 없이 내지만 우리는 1,000원 단위로 자유롭게 내요 (남은 돈 안에서) · 방송의 연합 · 협상은 AI 가 대신해요 · 대주주 동률은 '다음 금액 한 명만 받는' 걸로 정했어요 · 수전노 표식이 모두 같으면 무승부 · 3~6명 (방송은 6명)",
    howto: [
      "각자 <b>15만 원</b>으로 <b>9라운드</b> — 라운드마다 <b>투자</b>와 <b>기부</b> 금액을 비밀로 정해요 (낸 돈은 사라져요)",
      "🏆 <b>대주주</b> = 투자 최다 1명 (동률이면 그다음 금액 한 명) · 🪙 <b>수전노</b> = 기부 최소자 (동률이면 모두, 대주주는 면제)",
      "라운드가 끝나면 <b>투자 합 · 기부 합 · 두 표식</b>만 공개 — 개인 금액은 비밀",
      "9라운드 뒤 <b>수전노 최다 = 최하위</b> · 나머지 중 <b>대주주 최다 = 우승</b>",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}/${V.rounds} 라운드`),
    chip: (V, i) => ({ t: `🏆${V.bigC[i]} 🪙${V.misC[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

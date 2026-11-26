/* 베니 서바이벌 · 가넷도둑 — 화면 (순서대로 고르고 말하기 · 거짓 선언 · 역순 공개 기록 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-garnetthief"], C = G.CHARS;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.gt-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.gt-rd{font:900 14px var(--round);color:#fff;background:rgba(239,68,68,.2);border:1px solid rgba(248,113,113,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.gt-bg{font:800 12.5px var(--round);color:#fde68a;white-space:nowrap}
.gt-seats{flex:none;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.gt-s{display:grid;gap:1px;justify-items:center;padding:4px 2px;border-radius:11px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.12);min-width:0;font-family:var(--round);color:#e2e8f0}
.gt-s.now{border-color:#fde68a;background:rgba(253,230,138,.1)}
.gt-s.me .nm{color:#fde68a}
.gt-s .nm{font-weight:900;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.gt-s .gr{font-weight:800;font-size:11px;color:#a5f3fc}
.gt-s .dc{font-size:18px;line-height:1.15;min-height:21px}
.gt-s .rl{font-size:10px;color:#c4b5fd;line-height:1}
.gt-lb{flex:none;font:800 12px var(--round);color:var(--soft);text-align:center}
.gt-row{flex:none;display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.gt-row button{display:grid;gap:0;justify-items:center;padding:6px 1px;border-radius:12px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;font:900 12.5px var(--round);cursor:pointer;min-height:50px}
.gt-row button .em{font-size:21px;line-height:1.15}
.gt-row button.sel{border-color:#fde68a;background:rgba(253,230,138,.16)}
.gt-row button.lie.sel{border-color:#fca5a5;background:rgba(248,113,113,.18)}
.gt-log{flex:1 1 auto;min-height:56px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.gt-ev{padding:3px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.gt-ev b{color:#fff}.gt-ev .win{color:#fde68a}.gt-ev .bad{color:#fca5a5}
.gt-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.gt-info b{color:#fde68a}
.gt-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.gt-tut .gt-seats,.gt-tut .gt-log{width:100%;box-sizing:border-box}
.gt-opt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.gt-opt button{padding:9px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 13px var(--round);cursor:pointer}
@media (max-height:780px){.gt-row button{min-height:44px}.gt-row button .em{font-size:18px}.gt-info{font-size:11.5px}}
@media (max-height:690px){.gt-info.hint{display:none}.gt-bg{display:none}.gt-ev{font-size:11px;padding:2px 6px}.gt-row button{min-height:40px;padding:3px 1px}.gt-row button .em{font-size:16px}.gt-lb{display:none}.gt-s .dc{font-size:15px;min-height:17px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const ce = c => (C[c] ? `${C[c].e}${C[c].n}` : "?");
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.pos}`;
    if (!RS || RS.key !== key) RS = { key, c: -1, d: -1, touched: false };
    return RS;
  };
  function logHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = V.hist.map(h => {
      const winTxt = h.win < 0 ? "조직 수가 같거나 없어 경찰 차례" : `${C[h.win].n} 승`;
      const got = h.gain.map((g, i) => (g > 0 ? `${nm(i)} +${g}` : "")).filter(Boolean);
      const lie = h.liars.map(i => `${nm(i)}(${C[h.real[i]].n}→"${C[h.decl[i]].n}"${h.pen[i] ? " −1" : ""})`);
      const mine = !watch && me >= 0 ? `<br>내 선택 ${ce(h.real[me])}${h.decl[me] !== h.real[me] ? ` · 말한 것 ${ce(h.decl[me])}` : ""} → 가넷 ${h.before[me]} → <b>${h.after[me]}</b>` : "";
      return `<div class="gt-ev"><b>${h.r + 1}라운드</b> (선 ${nm(h.leader)}) · ${h.counts.map((c, k) => `${C[k].e}${c}`).join(" ")} → ${winTxt}${mine}<br><span class="win">${got.length ? got.join(" · ") : "가넷을 받은 사람이 없어요"}</span>${lie.length ? `<br><span class="bad">거짓 선언 ${lie.join(" · ")}</span>` : "<br>거짓 선언 없음"}</div>`;
    });
    return `<div class="gt-log" id="gt-log">${rows.length ? rows.join("") : `<div class="gt-ev">아직 공개된 라운드가 없어요. 선 플레이어부터 한 명씩 캐릭터를 몰래 고르고 모두가 듣게 말해요 (거짓말도 가능!).</div>`}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const cur = V.needs[0], lead = V.order[0];
    const top = V.over ? "끝" : mine ? "내 차례 · 고르고 말하기" : watch ? `${esc(nameOf(ctx, cur))} 차례` : cur >= 0 && cur !== me ? `${esc(nameOf(ctx, cur))} 차례` : "대기";
    let h = `<div class="gt-top"><span class="gt-rd">🔫 ${V.over ? V.rounds : V.round + 1} / ${V.rounds} 라운드 · ${top}</span>${!watch ? `<span class="gt-bg">내 가넷 ${V.gar[me]}</span>` : ""}</div>`;
    const orderSeats = V.over ? [...Array(V.n).keys()] : V.order;
    h += `<div class="gt-seats">${orderSeats.map((i, k) => {
      const said = V.decl[i] !== null && V.decl[i] !== undefined, now = !V.over && i === cur, meCard = !watch && i === me;
      const real = V.curReal && V.curReal[i] >= 0 && V.curReal[i] !== null ? `<span class="rl">진짜 ${C[V.curReal[i]].e}</span>` : "";
      return `<div class="gt-s ${now ? "now" : ""} ${meCard ? "me" : ""}"><span class="nm">${V.over ? "" : `${k + 1} `}${meCard ? "나" : esc(nameOf(ctx, i))}</span><span class="gr">🪙 ${V.gar[i]}</span><span class="dc">${said ? C[V.decl[i]].e : now ? "🤔" : "·"}</span>${real}</div>`;
    }).join("")}</div>`;
    if (mine) {
      const d = S.touched ? S.d : S.c;
      h += `<div class="gt-lb">① 진짜로 고를 캐릭터 (아무도 못 봐요)</div><div class="gt-row">${C.map((x, c) => `<button data-c="${c}" class="${S.c === c ? "sel" : ""}"><span class="em">${x.e}</span>${x.n}</button>`).join("")}</div>`;
      h += `<div class="gt-lb">② 모두에게 말하기 (거짓도 돼요)</div><div class="gt-row">${C.map((x, c) => `<button data-d="${c}" class="${S.c >= 0 && d === c ? "sel" : ""} ${S.c >= 0 && c !== S.c ? "lie" : ""}"><span class="em">${x.e}</span>${S.c >= 0 && c === S.c ? "사실" : x.n}</button>`).join("")}</div>`;
    }
    h += logHtml(V, ctx, me, watch);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="gt-info"><b>${V.draw ? "가넷이 모두 같아 무승부예요" : first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 가넷 ${V.score.map((x, i) => `${i === me && !watch ? "나" : esc(nameOf(ctx, i))} ${x}`).join(" / ")}</div>`;
    } else if (mine) {
      const d = S.touched ? S.d : S.c;
      h += `<div class="gt-info hint">앞사람이 말한 것을 보고 정해요. 이번 라운드에 가넷을 <b>하나도 못 받으면</b> 거짓말한 사람만 1개를 내요.</div>`;
      h += `<button class="btn big primary" data-a="go" ${S.c >= 0 && d >= 0 ? "" : "disabled"}>${S.c >= 0 && d >= 0 ? (d === S.c ? `🔘 ${C[S.c].n} 고르고 사실대로 말하기` : `🔘 ${C[S.c].n} 고르고 "${C[d].n}"(이)라고 말하기`) : "🔘 먼저 캐릭터를 골라요"}</button>`;
    } else if (watch) h += `<div class="gt-info">구경 중 — ${V.pos}/${V.n}명이 말했어요</div>`;
    else h += `<div class="gt-info">${V.pos}/${V.n}명이 말했어요 — ${cur >= 0 ? `${esc(nameOf(ctx, cur))} 차례를 기다려요` : ""}</div>`;
    stage.innerHTML = h;
    const lg = stage.querySelector("#gt-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.c !== undefined) { S.c = +t.dataset.c; if (!S.touched) S.d = S.c; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.d !== undefined) { S.d = +t.dataset.d; S.touched = true; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "go" && S.c >= 0) { ctx.sfx("pop"); ctx.act({ t: "pick", c: S.c, d: S.touched ? S.d : S.c }); }
    };
  }
  // ── 🎞️ 복기 고리 ──────────────────────────────────────────────
  function actText(a) {
    if (!a || a.t !== "pick" || !C[a.c]) return "—";
    const d = a.d === undefined || a.d === null ? a.c : a.d;
    return d === a.c ? `${ce(a.c)} 선택 · 사실대로 말함` : `${ce(a.c)} 선택 · "${C[d] ? C[d].n : "?"}"(이)라고 거짓말`;
  }
  const sg = x => (Math.abs(x) < 0.005 ? "0" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(/0$/, ""));
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || (info && info.same) || myA.t !== "pick" || bestA.t !== "pick" || !C[myA.c] || !C[bestA.c]) return null;
    const md = myA.d === undefined || myA.d === null ? myA.c : myA.d, bd = bestA.d === undefined || bestA.d === null ? bestA.c : bestA.d;
    if (myA.c === bestA.c && md === bd) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0, T = G.evalMove(V, seat, seed), mine = T.ev[myA.c][md], best = T.ev[bestA.c][bd], loss = best - mine;
    if (loss < 0.08) return null;
    return { sev: Math.max(0, Math.min(100, Math.round(100 * loss / 1.2))), why: `내 수(${ce(myA.c)}${md === myA.c ? "" : ` · "${C[md].n}"라 말함`})의 기대 가넷은 ${sg(mine)}개, 고급 AI 의 수(${ce(bestA.c)}${bd === bestA.c ? "" : ` · "${C[bd].n}"라 말함`})는 ${sg(best)}개예요 (앞사람의 말을 정직도만큼 믿고 뒤 사람의 반응을 어림한 값 · 벌칙 포함).` };
  }
  function result(V) {
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    return `${V.draw ? "무승부 (가넷이 모두 같아요)" : `우승 ${first.join("·")}번 · 최하위 ${V.losers.map(i => i + 1).join("·")}번`}${V.score ? ` · 가넷 ${V.score.join("/")}` : ""}`;
  }
  function tutorial() {
    style();
    const seats = cs => `<div class="gt-seats">${cs.map(c => `<div class="gt-s ${c.now ? "now" : ""}"><span class="nm">${c.n}</span><span class="gr">🪙 ${c.g}</span><span class="dc">${c.d}</span></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "8라운드 뒤 가넷이 가장 많은 사람이 우승", body: "라운드마다 주최 측이 <b>가넷 4개</b>를 걸어요. 모두 <b>마피아 · 카르텔 · 경찰 · 거지</b> 중 하나를 몰래 고르고, 가넷을 가장 많이 모은 사람이 우승 · 가장 적은 사람이 탈락후보예요. (방송은 8명 · 우리는 4~8명, 시작 가넷은 모두 5개)",
        boardHtml: `<div class="gt-tut"><div class="gt-opt">${C.map(x => `<button disabled>${x.e}<br>${x.n}</button>`).join("")}</div></div>`, ms: 7000 },
      { tag: "STEP 2 · 말하기", title: "선 플레이어부터 순서대로 — 거짓말도 돼요", body: "선 플레이어(1번부터 한 라운드씩 돌아가며)부터 차례로 캐릭터를 <b>몰래 고른 뒤</b> 모두가 듣게 <b>'내가 고른 것'</b>을 말해요. 이때 <b>거짓으로 말해도 돼요</b> — 뒷사람은 앞사람의 말을 듣고 고르니까 순서가 중요해요.",
        boardHtml: `<div class="gt-tut">${seats([{ n: "1 삐약", g: 5, d: "🔫" }, { n: "2 나비", g: 5, d: "👮" }, { n: "3 나", g: 5, d: "🤔", now: 1 }, { n: "4 범수", g: 5, d: "·" }])}</div>`, ms: 8500 },
      { tag: "STEP 3 · 가넷 나누기", title: "더 많이 고른 조직이 4개를 나눠요", body: "모두 정체를 공개하면 <b>마피아와 카르텔 중 더 많은 쪽</b>이 4개를 똑같이 나눠요 (남는 것은 못 가져가요). 두 조직 수가 <b>같거나 아무도 없으면 경찰</b>이 나누고, 나누고 남은 가넷은 <b>거지</b>가 나눠요. 그래도 남으면 주최 측이 회수해요.",
        boardHtml: `<div class="gt-tut"><div class="gt-log"><div class="gt-ev">🔫3 🧳1 👮2 🥣2 → 마피아 승<br><span class="win">마피아 3명 +1씩 (남은 1개는 거지 2명이 못 나눠서 회수)</span></div><div class="gt-ev">🔫1 🧳1 👮3 🥣3 → 두 조직 같음 → 경찰 +1씩, 남은 1개는 거지 3명이 못 나눠서 회수</div></div></div>`, ms: 9500 },
      { tag: "STEP 4 · 벌칙", title: "못 받았는데 거짓말했다면 가넷 1개 반납", body: "이번 라운드에 가넷을 <b>한 개도 못 받은 사람 중 거짓으로 말한 사람</b>은 벌칙으로 <b>가넷 1개</b>를 내요 (없으면 안 내요). 거짓말을 했어도 가넷을 받았다면 벌칙은 없고, 사실대로 말했다면 못 받아도 벌칙은 없어요. 3 · 7라운드의 가넷 양도는 이 게임에서 뺐어요.",
        boardHtml: `<div class="gt-tut"><div class="gt-log"><div class="gt-ev bad">거짓 선언 나비(👮→"🥣" −1) · 가넷 5 → 4</div><div class="gt-ev">가넷을 받았다면 거짓말해도 벌칙이 없어요</div></div></div>`, ms: 8500 },
      { tag: "STEP 5 · 직접", title: "누가 가넷을 받을까요?", body: "공개 결과: 마피아 2명, 카르텔 1명, 경찰 1명, 거지 1명이에요. 마피아 2명이 4개를 똑같이 나누면 한 명당 몇 개일까요?",
        interactive: { hint: "👆 개수를 눌러요", doneText: "✅ 4÷2 = 2개씩! 카르텔 · 경찰 · 거지는 0개예요 (거지에게는 남는 가넷이 없어요)." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="gt-tut"><div class="gt-info"><b>🔫2 🧳1 👮1 🥣1</b> — 마피아 승</div><div class="gt-opt">${[0, 1, 2, 3].map(i => `<button data-w="${i}">${i}개</button>`).join("")}</div><div class="gt-info" id="gt-tm">마피아 한 명이 받는 가넷은?</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (+b.dataset.w === 2) { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#gt-tm"); if (m) m.textContent = "가넷 4개를 마피아 2명이 똑같이 나눠요"; } };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-garnetthief"] = {
    name: "가넷도둑", emoji: "🔫", short: "마피아 · 카르텔 · 경찰 · 거지 중 하나를 고르고 거짓말도 해요 · 8라운드", min: 4, max: 8, defN: 8, board: false,
    show: "더 지니어스 · 시즌 4 그랜드 파이널 · 6화 메인 매치", season: "시즌 4 그랜드 파이널",
    opts: [],
    diff: "방송은 8명이지만 우리는 4~8명 (빈 자리는 AI) · 선 플레이어는 1번부터 한 라운드씩 돌아가며(4명이면 두 바퀴) · 방송의 시작 가넷은 사람마다 4~8개였지만 우리는 모두 5개 · 3 · 7라운드 가넷 양도(연합 요소)와 방송의 대화 · 연합 · 스파이는 없어요 · 방송에 없는 동점 규칙은 가넷이 같으면 공동 순위, 전원이 같으면 무승부로 우리가 정했어요 · 방송의 단독 우승 생명의 징표는 없어요",
    howto: [
      "<b>8라운드</b> 뒤 <b>가넷이 가장 많은 사람이 우승</b> · 가장 적은 사람이 탈락후보 — 라운드마다 주최 측이 가넷 4개를 걸어요 (방송은 8명 · 우리는 4~8명)",
      "<b>마피아 · 카르텔 · 경찰 · 거지</b> 중 하나를 몰래 고르고, <b>선 플레이어부터 순서대로</b> 내가 고른 것을 모두가 듣게 말해요 — <b>거짓말도 돼요</b>",
      "마지막에 고른 사람부터 역순으로 정체 공개 → <b>마피아 · 카르텔 중 더 많이 고른 조직</b>이 4개를 똑같이 나눠요 (남는 것은 못 가져감) · 두 조직 수가 같거나 둘 다 0명이면 <b>경찰</b>이 나눠요 · 남은 가넷은 <b>거지</b>가 나눠요 · 그래도 남으면 회수",
      "이번 라운드에 가넷을 <b>한 개도 못 받은 사람 중 거짓으로 말한 사람</b>은 벌칙으로 가넷 1개를 내요 (없으면 안 냄)",
      "특수: 3 · 7라운드 가넷 양도는 없어요 (대화 · 연합 요소라 뺌)",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}/${V.rounds} 라운드`),
    chip: (V, i) => ({ t: `🪙${V.gar[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

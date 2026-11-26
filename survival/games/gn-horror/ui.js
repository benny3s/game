/* 베니 서바이벌 · 호러 레이스 — 화면 (응원 캐릭터 2개 · 트랙 · 구역 3개 · 코인 뽑아 놓기 · 코인 포기 · 1분 규칙) */
(() => {
  "use strict";
  const jo = (w, a, b) => { const s = String(w), k = s.charCodeAt(s.length - 1); return s + (k >= 0xAC00 && k <= 0xD7A3 && (k - 0xAC00) % 28 !== 0 ? a : b); };   // 받침 맞춰 조사 (이/가 · 을/를 · 이라고/라고)
  const ro = w => { const s = String(w), k = s.charCodeAt(s.length - 1), t = (k - 0xAC00) % 28; return s + (k >= 0xAC00 && k <= 0xD7A3 && t !== 0 && t !== 8 ? "으로" : "로"); };   // (으)로: 받침 없거나 ㄹ 이면 '로'

  const G = window.SVCores["gn-horror"], C = G.CHARS, ZN = ["1칸", "2칸", "4칸"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.hr-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.hr-rd{font:900 14px var(--round);color:#fff;background:rgba(239,68,68,.2);border:1px solid rgba(248,113,113,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.hr-bg{font:800 12.5px var(--round);color:#fde68a;white-space:nowrap}
.hr-track{flex:none;display:grid;gap:3px;padding:5px 6px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12)}
.hr-lane{display:grid;grid-template-columns:28px 1fr 46px;gap:5px;align-items:center}
.hr-lane .em{font-size:18px;line-height:1;text-align:center}
.hr-lane .bar{position:relative;height:16px;border-radius:8px;background:rgba(255,255,255,.09);overflow:hidden}
.hr-lane .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:8px;background:linear-gradient(90deg,#7c3aed,#c084fc);transition:width .25s}
.hr-lane.mine .bar i{background:linear-gradient(90deg,#d97706,#fde68a)}
.hr-lane .bar b{position:absolute;right:0;top:0;bottom:0;width:2px;background:#f87171}
.hr-lane .ps{font:900 11.5px var(--round);color:#e2e8f0;text-align:right}
.hr-lane.mine .ps{color:#fde68a}
.hr-zones{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.hr-z{display:grid;gap:2px;align-content:start;justify-items:center;padding:4px 3px;border-radius:12px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.14);min-width:0;min-height:62px;font-family:var(--round);color:#e2e8f0}
.hr-z .t{font-weight:900;font-size:12.5px;color:#fff}
.hr-z .cs{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;font-size:12px;font-weight:800}
.hr-z .cs span{padding:1px 4px;border-radius:7px;background:rgba(255,255,255,.12)}
.hr-z .go{font-size:10.5px;color:#fde68a;font-weight:800}
.hr-hand{flex:none;display:grid;gap:4px}
.hr-coin{display:grid;grid-template-columns:78px 1fr;gap:5px;align-items:center}
.hr-coin .cn{font:900 12.5px var(--round);color:#fff;white-space:nowrap}
.hr-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.hr-opts button,.hr-sup button{padding:8px 1px;border-radius:11px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;font:900 12.5px var(--round);cursor:pointer;min-height:40px}
.hr-opts button.sel,.hr-sup button.sel{border-color:#fde68a;background:rgba(253,230,138,.16)}
.hr-sup{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.hr-sup button{display:grid;justify-items:center;gap:0;min-height:56px}.hr-sup button .em{font-size:22px;line-height:1.15}
.hr-lb{flex:none;font:800 12px var(--round);color:var(--soft);text-align:center}
.hr-log{flex:1 1 auto;min-height:48px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.hr-ev{padding:3px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.hr-ev b{color:#fff}.hr-ev .win{color:#fde68a}
.hr-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.hr-info b{color:#fde68a}
.hr-btns{flex:none;display:grid;grid-template-columns:1fr auto;gap:6px}
.hr-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.hr-tut .hr-zones,.hr-tut .hr-track,.hr-tut .hr-log{width:100%;box-sizing:border-box}
.hr-opt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%}
.hr-opt button{padding:9px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 13px var(--round);cursor:pointer}
@media (max-height:780px){.hr-lane .bar{height:13px}.hr-lane .em{font-size:15px}.hr-info{font-size:11.5px}.hr-z{min-height:54px}.hr-opts button{min-height:36px;padding:6px 1px}.hr-sup button{min-height:48px}}
@media (max-height:690px){.hr-info.hint{display:none}.hr-bg{display:none}.hr-ev{font-size:11px;padding:2px 6px}.hr-lane .bar{height:11px}.hr-lane .em{font-size:13px}.hr-lane{gap:3px}.hr-track{padding:3px 5px;gap:2px}.hr-z{min-height:44px;padding:2px}.hr-coin{grid-template-columns:70px 1fr}.hr-opts button{min-height:32px;padding:3px 1px;font-size:12px}.hr-lb{display:none}.hr-sup button{min-height:44px}.hr-top{gap:4px}}.sv-coachfit .hr-lb,.sv-coachfit .hr-info,.sv-coachfit .hr-bg{display:none}
.sv-coachfit .hr-log,.sv-coachfit .hr-z .go{display:none}.sv-coachfit .hr-z .cs{flex-wrap:nowrap;gap:1px;font-size:11px}.sv-coachfit .hr-z .cs span{padding:0 1px;font-size:10.5px;white-space:nowrap;min-width:0}.sv-coachfit .hr-z .t{font-size:11.5px}.sv-coachfit .hr-btns button{min-height:32px;padding-top:4px;padding-bottom:4px}.sv-coachfit .hr-coin{gap:3px}
.sv-coachfit .hr-lane .bar{height:8px}.sv-coachfit .hr-lane .em{font-size:11px;line-height:1}.sv-coachfit .hr-lane .ps{font-size:10.5px;line-height:1}.sv-coachfit .hr-lane{min-height:0}.sv-coachfit .hr-lane{grid-template-columns:22px 1fr 40px}.sv-coachfit .hr-lane{gap:2px}.sv-coachfit .hr-track{padding:3px 5px;gap:1px}
.sv-coachfit .hr-z{min-height:24px;padding:1px 2px}.sv-coachfit .hr-hand{gap:2px}.sv-coachfit .hr-opts button{min-height:24px;padding:1px 1px}.sv-coachfit .hr-rd{padding:1px 9px;font-size:12px}.sv-coachfit .hr-sup button{min-height:40px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const ce = c => (C[c] ? `${C[c].e}${C[c].n}` : "?");
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.phase}|${V.round}|${V.idx}|${V.handOn}`;
    if (!RS || RS.key !== key) RS = { key, sel: [], z: [-1, -1, -1] };
    return RS;
  };
  const zoneHtml = V => `<div class="hr-zones">${V.zone.map((cnt, z) => {
    const mover = G.pickMover(cnt), chips = cnt.map((n, c) => (n ? `<span>${C[c].e}${n}</span>` : "")).join("");
    return `<div class="hr-z"><span class="t">${ZN[z]} 구역</span><span class="cs">${chips || "·"}</span><span class="go">${mover >= 0 ? `지금은 ${C[mover].e} +${G.MOVES[z]}` : chips ? "지금은 아무도 못 가요" : ""}</span></div>`;
  }).join("")}</div>`;
  function trackHtml(V, me, watch) {
    const sup = V.over ? (V.sup && !watch && me >= 0 ? V.sup[me] : []) : (V.mySup || []);
    return `<div class="hr-track">${C.map((c, i) => `<div class="hr-lane ${!watch && sup.includes(i) ? "mine" : ""}"><span class="em">${c.e}</span><span class="bar"><i style="width:${Math.min(100, V.pos[i] / V.goal * 100)}%"></i><b></b></span><span class="ps">${!watch && sup.includes(i) ? "⭐" : ""}${V.pos[i]}/${V.goal}</span></div>`).join("")}</div>`;
  }
  function logHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = [];
    V.hist.forEach(h => {
      const mv = h.moves.map((m, z) => (m ? `${ZN[z]} 구역 ${C[m.c].e}${C[m.c].n} +${G.MOVES[z]}` : null)).filter(Boolean);
      rows.push(`<div class="hr-ev"><b>${h.r + 1}라운드</b>${h.skipper >= 0 ? ` · ${nm(h.skipper)} 코인 포기` : ""}<br><span class="win">${mv.length ? mv.join(" · ") : "아무도 이동하지 못했어요"}</span></div>`);
    });
    const cur = V.turns.map(t => `${nm(t.s)} ${t.coins.map((c, k) => C[c].e + ZN[t.z[k]]).join(" ")}`);
    if (cur.length) rows.push(`<div class="hr-ev"><b>${V.round + 1}라운드 놓은 코인</b><br>${cur.join("<br>")}</div>`);
    if (V.skipper >= 0 && !V.over) rows.push(`<div class="hr-ev">${jo(nm(V.skipper), "이", "가")} 코인을 포기했어요 — 이번 라운드엔 더 포기할 수 없어요</div>`);
    return `<div class="hr-log" id="hr-log">${rows.length ? rows.join("") : `<div class="hr-ev">아직 라운드가 없어요. 순서대로 코인 3개를 뽑아 구역에 놓으면, 구역마다 코인이 가장 많은 캐릭터가 달려요.</div>`}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const curName = V.cur >= 0 ? esc(nameOf(ctx, V.cur)) : "";
    const top = V.over ? "끝" : V.phase === "pick" ? (mine ? "내 차례 · 응원 고르기" : "모두 응원 고르는 중") : mine ? (V.hand ? "내 차례 · 코인 놓기" : "내 차례 · 코인 뽑기") : `${curName} 차례`;
    let h = `<div class="hr-top"><span class="hr-rd">🧛 ${V.phase === "pick" ? "시작 전" : `${V.over ? V.round : V.round + 1}라운드`} · ${top}</span>${!watch && V.mySup ? `<span class="hr-bg">내 응원 ${ce(V.mySup[0])} ${ce(V.mySup[1])}</span>` : ""}</div>`;
    if (V.phase === "pick") {
      if (mine) {
        h += `<div class="hr-lb">우승시키고 싶은 캐릭터 2개를 몰래 골라요 (나머지 3개 코인은 박스로 가요)</div><div class="hr-sup">${C.map((c, i) => `<button data-s="${i}" class="${S.sel.includes(i) ? "sel" : ""}"><span class="em">${c.e}</span>${c.n}</button>`).join("")}</div>`;
        h += `<div class="hr-info hint">내가 응원하는 캐릭터의 코인은 박스에 안 들어가요 — 모두가 응원하는 캐릭터는 코인이 없어서 못 움직여요!</div>`;
        h += `<button class="btn big primary" data-a="sup" ${S.sel.length === 2 ? "" : "disabled"}>${S.sel.length === 2 ? `✅ ${C[S.sel[0]].n} · ${C[S.sel[1]].n} 응원하기` : "캐릭터 2개를 골라요"}</button>`;
      } else h += `<div class="hr-info">${V.supDone.filter(Boolean).length}/${V.n}명이 응원 캐릭터를 냈어요</div>`;
    } else {
      h += trackHtml(V, me, watch) + zoneHtml(V);
      if (mine && V.hand) {
        h += `<div class="hr-hand">${V.hand.map((c, k) => `<div class="hr-coin"><span class="cn">${C[c].e} ${C[c].n}${V.mySup.includes(c) ? " ⭐" : ""}</span><div class="hr-opts">${ZN.map((zn, z) => `<button data-k="${k}" data-z="${z}" class="${S.z[k] === z ? "sel" : ""}">${zn}</button>`).join("")}</div></div>`).join("")}</div>`;
      }
      h += logHtml(V, ctx, me, watch);
      if (mine && V.hand) {
        const ready = S.z.every(x => x >= 0);
        h += `<button class="btn big primary" data-a="place" ${ready ? "" : "disabled"}>${ready ? "🪙 이대로 놓기" : "코인 3개를 모두 구역에 놓아요"}</button>`;
      } else if (mine) {
        h += `<div class="hr-btns"><button class="btn big primary" data-a="draw">🎲 코인 3개 뽑기</button>${V.canSkip ? `<button class="btn big" data-a="skip">✋ 포기</button>` : ""}</div>`;
        h += `<div class="hr-info hint">박스에 ${V.boxLeft}개가 남았어요. 포기하면 다음 라운드 맨 마지막 순서가 돼요 (뽑은 뒤엔 못 해요).</div>`;
      } else if (V.over) {
        const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
        h += `<div class="hr-info"><b>${V.draw ? "점수가 모두 같아 무승부예요" : first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 점수 ${V.score.map((x, i) => `${i === me && !watch ? "나" : esc(nameOf(ctx, i))} ${x}`).join(" / ")}<br>응원: ${V.sup.map((s, i) => `${i === me && !watch ? "나" : esc(nameOf(ctx, i))} ${C[s[0]].e}${C[s[1]].e}`).join(" · ")}</div>`;
      } else h += `<div class="hr-info">${curName} 차례를 기다려요 · 박스 ${V.boxLeft}/${V.boxTotal}</div>`;
    }
    stage.innerHTML = h;
    const lg = stage.querySelector("#hr-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.s !== undefined) { const i = +t.dataset.s, k = S.sel.indexOf(i); if (k >= 0) S.sel.splice(k, 1); else { if (S.sel.length >= 2) S.sel.shift(); S.sel.push(i); } ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.k !== undefined) { S.z[+t.dataset.k] = +t.dataset.z; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "sup" && S.sel.length === 2) { ctx.sfx("pop"); ctx.act({ t: "sup", s: S.sel.slice().sort((a, b) => a - b) }); }
      if (t.dataset.a === "draw") { ctx.sfx("pop"); ctx.act({ t: "draw" }); }
      if (t.dataset.a === "skip") { ctx.sfx("pop"); ctx.act({ t: "skip" }); }
      if (t.dataset.a === "place" && S.z.every(x => x >= 0)) { ctx.sfx("pop"); ctx.act({ t: "place", z: S.z.slice() }); }
    };
  }
  // ── 🎞️ 복기 고리 ──────────────────────────────────────────────
  function actText(a, V) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "sup" && Array.isArray(a.s)) return `응원 ${a.s.map(ce).join(" · ")}`;
    if (a.t === "draw") return "코인 3개 뽑기";
    if (a.t === "skip") return "코인 포기";
    if (a.t === "place" && Array.isArray(a.z)) return (V && V.hand ? V.hand.map((c, k) => `${C[c].e}${ZN[a.z[k]]}`).join(" ") : a.z.map(z => ZN[z]).join(" · ")) + "에 놓음";
    return "—";
  }
  const f2 = x => x.toFixed(2).replace(/0$/, "");
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || (info && info.same) || myA.t !== "place" || bestA.t !== "place" || !V.hand || !V.mySup) return null;
    if (myA.z.join() === bestA.z.join()) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0, E = G.evalPlace(V, seat, V.hand, seed);
    const iM = E.pl.findIndex(p => p.join() === myA.z.join()), iB = E.pl.findIndex(p => p.join() === bestA.z.join());
    if (iM < 0 || iB < 0) return null;
    const loss = E.ev[iB] - E.ev[iM]; if (loss < 0.12) return null;
    const txt = z => V.hand.map((c, k) => `${C[c].e}${ZN[z[k]]}`).join(" ");
    return { sev: Math.max(0, Math.min(100, Math.round(100 * loss / 1.2))), why: `내 놓기(${txt(myA.z)})는 이번 라운드 끝에 내 응원 캐릭터 가치가 약 ${f2(E.ev[iM])}, 고급 AI의 놓기(${txt(bestA.z)})는 약 ${f2(E.ev[iB])}예요 (뒷사람이 공개된 코인 비율대로 뽑아 아무 구역에나 놓는다고 어림, 가치 = 지금 끝났을 때의 응원 점수 + 앞선 정도).` };
  }
  function result(V) {
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    return `${V.draw ? "무승부 (점수가 모두 같아요)" : `우승 ${first.join("·")}번 · 최하위 ${V.losers.map(i => i + 1).join("·")}번`}${V.score ? ` · 점수 ${V.score.join("/")}` : ""}`;
  }
  function tutorial() {
    style();
    const lane = (e, p, mine) => `<div class="hr-lane ${mine ? "mine" : ""}"><span class="em">${e}</span><span class="bar"><i style="width:${p / 13 * 100}%"></i><b></b></span><span class="ps">${mine ? "⭐" : ""}${p}/13</span></div>`;
    const zone = (t, chips, go) => `<div class="hr-z"><span class="t">${t}</span><span class="cs">${chips.map(x => `<span>${x}</span>`).join("")}</span><span class="go">${go}</span></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "응원한 캐릭터를 1등으로 보내요", body: "뱀파이어 · 강시 · 구미호 · 미라 · 좀비가 <b>12칸 트랙</b>(출발점과 결승점 사이)을 달려요. 결승점에 들어가려면 <b>13칸</b>을 가야 해요. 각자 <b>우승시키고 싶은 캐릭터 2개</b>를 몰래 고르고, 그 캐릭터가 <b>1등이면 3점 · 2등 2점 · 3등 1점</b>을 받아요 (두 캐릭터 점수를 더해요). 점수가 가장 높으면 우승이에요. (방송은 12명 · 우리는 4~8명)",
        boardHtml: `<div class="hr-tut"><div class="hr-track">${lane("🧛", 7, 1)}${lane("👲", 4, 0)}${lane("🦊", 9, 1)}${lane("🤕", 2, 0)}${lane("🧟", 5, 0)}</div></div>`, ms: 8500 },
      { tag: "STEP 2 · 코인", title: "코인은 박스에서 무작위로 뽑아요", body: "각자 캐릭터 코인 5종을 1개씩 받고, 응원할 2종은 제출해요. <b>나머지 3종은 코인 박스</b>로 가요. 그래서 모두가 응원하는 캐릭터는 코인이 없어 움직이기 어렵고, 아무도 응원하지 않는 캐릭터는 코인이 많아요. 라운드마다 순서대로 박스에서 <b>코인 3개를 무작위로 뽑아</b> 구역에 놓아요.",
        boardHtml: `<div class="hr-tut"><div class="hr-log"><div class="hr-ev"><b>1번</b> 🧟 🦊 🧛 코인 3개 뽑음 → 마음대로 구역에 놓기</div><div class="hr-ev">뽑은 코인은 그 차례에 모두 놓아야 하고, 놓은 코인은 모두가 봐요.</div></div></div>`, ms: 9000 },
      { tag: "STEP 3 · 구역", title: "구역마다 코인이 가장 많은 캐릭터가 달려요", body: "구역은 <b>1칸 · 2칸 · 4칸</b> 세 곳이에요. 모두 놓고 나면 1칸 구역부터 차례로, 그 구역에서 <b>코인이 가장 많은 캐릭터</b>가 구역 칸 수만큼 가요. 최다가 <b>같은 캐릭터가 둘 이상이면 모두 못 가고</b> 그다음으로 많은 캐릭터가 가요. 모두 같으면 아무도 못 가요.",
        boardHtml: `<div class="hr-tut"><div class="hr-zones">${zone("1칸 구역", ["🦊3", "🧛1"], "🦊 +1")}${zone("2칸 구역", ["🤕2", "🧟2", "🧛1"], "🧛 +2")}${zone("4칸 구역", ["🧛2", "👲2"], "아무도 못 가요")}</div></div>`, ms: 9500 },
      { tag: "STEP 4 · 포기와 끝", title: "코인 포기 · 골인", body: "차례에 코인을 뽑는 대신 <b>코인 포기</b>를 선언하면 다음 라운드의 <b>맨 마지막 순서</b>가 돼요 (포기한 사람의 다음 사람이 다음 라운드 1번). 뽑은 뒤엔 못 하고, 한 라운드에 한 명만 해요. 한 캐릭터가 <b>13칸째(결승점)에 닿으면 그 즉시 끝</b>나고 가까운 순서로 2 · 3등이에요. 공동 2등이면 그 캐릭터 응원자는 1점씩, 3등 응원자는 0점이에요.",
        boardHtml: `<div class="hr-tut"><div class="hr-log"><div class="hr-ev">순서 1 2 3 4 5 · 2번이 포기 → 다음 라운드 순서 3 4 5 1 2</div><div class="hr-ev">13칸째 결승점에 닿으면 즉시 끝 — 1구역에서 닿으면 2 · 4구역은 안 움직여요</div></div></div>`, ms: 9000 },
      { tag: "STEP 5 · 직접", title: "누가 갈까요?", body: "4칸 구역에 🧛 뱀파이어 코인 2개, 👲 강시 코인 2개, 🤕 미라 코인 1개가 놓였어요. 어느 캐릭터가 4칸 이동할까요?",
        interactive: { hint: "👆 캐릭터를 눌러요", doneText: "✅ 뱀파이어와 강시는 2개로 같아서 둘 다 못 가고, 그다음으로 많은 미라가 4칸 가요!" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="hr-tut"><div class="hr-zones" style="grid-template-columns:1fr">${zone("4칸 구역", ["🧛2", "👲2", "🤕1"], "")}</div><div class="hr-opt">${["🧛 뱀파이어", "👲 강시", "🤕 미라"].map((x, i) => `<button data-w="${i}">${x}</button>`).join("")}</div><div class="hr-info" id="hr-tm">누가 4칸 갈까요?</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (+b.dataset.w === 2) { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#hr-tm"); if (m) m.textContent = "가장 많은 코인이 둘이면 둘 다 못 가요 — 그다음으로 많은 쪽을 봐요"; } };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-horror"] = {
    name: "호러 레이스", emoji: "🧛", short: "응원할 캐릭터 2개를 몰래 고르고 코인을 놓아 달리게 해요 · 결승점까지 13칸", min: 4, max: 8, defN: 6, board: false,
    show: "더 지니어스 · 시즌 4 그랜드 파이널 · 2화 메인 매치", season: "시즌 4 그랜드 파이널",
    opts: [],
    diff: "방송은 12명이지만 우리는 4~8명 (빈 자리는 AI, 코인 박스는 3×인원 개) · 방송의 연합 · 대화 · 코인 감별(자석 · 무게)은 없어요 · 골인은 방송과 같이 13칸(출발점과 결승점 사이 12칸 + 결승점)에 닿거나 넘으면 · 첫 라운드 순서는 방송의 번호 공 추첨처럼 씨앗으로 정해요 (이후는 방송과 같이 돌려요) · 방송은 코인을 1개씩 뽑거나 한꺼번에 뽑아도 되지만 우리는 3개를 한꺼번에만 뽑아요 · 끝없이 안 끝나는 판을 막으려는 40라운드 상한은 우리가 넣었어요 · 점수 동점은 공동 순위로 우리가 정했어요 (방송은 가넷 환산) · 방송의 단독 우승 생명의 징표는 없어요 · 9화 호러 레이스 Ⅱ(웅덩이 · 업히기 · 이동 1·2·3칸)는 만들지 않았어요",
    howto: [
      "캐릭터 5종이 <b>12칸 트랙</b>을 달려요 (결승점에 들어가려면 13칸) — 각자 <b>우승시키고 싶은 캐릭터 2개</b>를 몰래 고르고 (방송은 12명 · 우리는 4~8명), 응원한 캐릭터가 <b>1등 3점 · 2등 2점 · 3등 1점</b> (두 캐릭터 점수를 더함) — 점수가 가장 높으면 우승 · 가장 낮으면 탈락후보",
      "남은 3종의 코인은 <b>코인 박스</b>에 모여요 · 라운드마다 순서대로 박스에서 <b>코인 3개를 무작위로 뽑아</b> 구역 3곳(이동 <b>1칸 · 2칸 · 4칸</b>)에 마음대로 나눠 놓아요 (뽑은 코인은 그 차례에 모두 놓아요)",
      "모두 놓으면 1칸 → 2칸 → 4칸 구역 순으로 <b>그 구역에서 코인이 가장 많은 캐릭터</b>가 이동 · 최다가 동률이면 그 캐릭터들은 못 가고 그다음으로 많은 캐릭터가 이동 · 모두 같으면 아무도 못 가요",
      "<b>코인 포기</b>: 뽑기 전에 선언하면 다음 라운드 맨 마지막 순서가 돼요 (한 라운드에 한 명 · 앞 순서가 이미 포기했으면 못 함 · 포기한 사람의 다음 사람이 다음 라운드 1번)",
      "한 캐릭터가 골인(13칸째 결승점)하면 그 즉시 끝 (1칸 구역에서 골인하면 2 · 4칸 구역은 안 움직여요) · 가까운 순서로 2 · 3등 · 공동 2등 응원자는 1점씩 · 3등 응원자는 0점 · 공동 3등은 1점씩",
      "특수: 끝없이 안 끝나는 판을 막으려고 40라운드가 지나면 그때 위치로 끝내요",
    ],
    sub: V => (V.over ? "끝" : V.phase === "pick" ? "응원 고르기" : `${V.round + 1}라운드`),
    chip: (V, i) => ({ t: V.over ? `${V.score[i]}점` : V.phase === "pick" ? (V.supDone[i] ? "✅" : "…") : V.order.indexOf(i) + 1 + "번", on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

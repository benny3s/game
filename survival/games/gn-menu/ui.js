/* 베니 서바이벌 · 오늘의 메뉴 — 화면 (메뉴 3종 · 예측 칸 · 박스 옮기기 · 공개 기록 · 1분 규칙) */
(() => {
  "use strict";
  const jo = (w, a, b) => { const s = String(w), k = s.charCodeAt(s.length - 1); return s + (k >= 0xAC00 && k <= 0xD7A3 && (k - 0xAC00) % 28 !== 0 ? a : b); };   // 받침 맞춰 조사 (이/가 · 을/를 · 이라고/라고)
  const ro = w => { const s = String(w), k = s.charCodeAt(s.length - 1), t = (k - 0xAC00) % 28; return s + (k >= 0xAC00 && k <= 0xD7A3 && t !== 0 && t !== 8 ? "으로" : "로"); };   // (으)로: 받침 없거나 ㄹ 이면 '로'

  const G = window.SVCores["gn-menu"], M = G.MENUS;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.mn-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.mn-rd{font:900 14px var(--round);color:#fff;background:rgba(239,68,68,.2);border:1px solid rgba(248,113,113,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.mn-bg{font:800 12.5px var(--round);color:#fde68a;white-space:nowrap}
.mn-menus{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.mn-menus button{display:grid;gap:0;justify-items:center;padding:7px 2px;border-radius:13px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;font:900 13px var(--round);cursor:pointer;min-height:56px}
.mn-menus button .em{font-size:24px;line-height:1.15}
.mn-menus button.sel{border-color:#fde68a;background:rgba(253,230,138,.16)}
.mn-menus button:disabled{cursor:default;opacity:.55}.mn-menus button.sel:disabled{opacity:1}
.mn-lb{flex:none;font:800 12px var(--round);color:var(--soft);text-align:center}
.mn-board{flex:none;display:grid;gap:5px}
.mn-c{display:grid;gap:3px;align-content:start;justify-items:center;padding:5px 3px;border-radius:12px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.14);min-width:0;min-height:84px;cursor:pointer;color:#fff;font-family:var(--round)}
.mn-c.sel{border-color:#fde68a;background:rgba(253,230,138,.1)}
.mn-c .rg{font-weight:900;font-size:13px;line-height:1.1;white-space:nowrap}
.mn-c .pt{font-weight:800;font-size:11.5px;color:#fde68a}
.mn-c .bx{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;min-height:20px}
.mn-c .bx i{font-style:normal;font-weight:800;font-size:10.5px;line-height:1;padding:3px 4px;border-radius:7px;background:rgba(255,255,255,.14);color:#e2e8f0}
.mn-c .bx i.me{background:#fde68a;color:#422006}
.mn-c:disabled{cursor:default}
.mn-log{flex:1 1 auto;min-height:56px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.mn-ev{padding:3px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.mn-ev b{color:#fff}.mn-ev .win{color:#fde68a}.mn-ev .rs{color:#fca5a5}
.mn-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.mn-info b{color:#fde68a}
.mn-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.mn-tut .mn-board,.mn-tut .mn-log{width:100%;box-sizing:border-box}
.mn-opt{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%}
.mn-opt button{padding:9px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 13px var(--round);cursor:pointer}
@media (max-height:780px){.mn-menus button{min-height:48px}.mn-menus button .em{font-size:20px}.mn-c{min-height:70px}.mn-info{font-size:11.5px}}
@media (max-height:690px){.mn-info.hint{display:none}.mn-bg{display:none}.mn-ev{font-size:11px;padding:2px 6px}.mn-menus button{min-height:44px;padding:4px 2px}.mn-menus button .em{font-size:18px}.mn-c{min-height:60px;padding:3px 2px}.mn-lb{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const short = (ctx, i) => Array.from(nameOf(ctx, i)).slice(0, 2).join("");
  const mn = m => (M[m] ? `${M[m].e}${M[m].n}` : "?");
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.resets}|${V.phase}`;
    if (!RS || RS.key !== key) RS = { key, m: V.phase === "adjust" ? V.myMenu : -1, b: V.phase === "adjust" ? V.myBox : -1 };
    return RS;
  };
  const lab = (B, i) => G.bandLabel(B, i);
  function logHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = []; let ser = 0;
    V.hist.forEach((h, k) => {
      if (h.series !== ser) { ser = h.series; rows.push(`<div class="mn-ev"><span class="rs">🔁 전원 승점이 같아서 승점을 지우고 1라운드부터 다시 시작했어요</span></div>`); }
      const got = h.gain.map((g, i) => (g > 0 ? `${nm(i)} +${g}` : "")).filter(Boolean);
      const mine = !watch && me >= 0 ? `<br>내 메뉴 ${mn(h.menus[me])} · 모임 ${h.size[me]}명 · 예측 ${lab(V.B, h.p2[me])}${h.p1[me] !== h.p2[me] ? ` (처음 ${lab(V.B, h.p1[me])})` : ""} → <b>${h.gain[me] ? "+" + h.gain[me] : "0"}</b>` : "";
      rows.push(`<div class="mn-ev"><b>${h.r + 1}라운드</b> · ${h.cnt.map((c, m) => `${M[m].e}${c}명`).join(" ")}${mine}<br><span class="win">${got.length ? "득점 " + got.join(" · ") : "아무도 점수를 못 땄어요"}</span></div>`);
    });
    if (V.draw) rows.push(`<div class="mn-ev"><span class="rs">두 번 다시 해도 전원 승점이 같아 무승부로 끝났어요</span></div>`);
    return `<div class="mn-log" id="mn-log">${rows.length ? rows.join("") : `<div class="mn-ev">아직 공개된 라운드가 없어요. 같은 메뉴를 고른 사람이 몇 명일지 맞히면 승점을 받아요.</div>`}</div>`;
  }
  function boardHtml(V, ctx, me, watch, S, canPick) {
    const B = V.B;
    return `<div class="mn-board" style="grid-template-columns:repeat(${B.length},1fr)">${B.map((b, i) => {
      const chips = [];
      if (V.boxes) V.boxes.forEach((x, j) => { if (x === i && (watch || j !== me)) chips.push(`<i>${esc(short(ctx, j))}</i>`); });
      if (!watch && S.b === i) chips.unshift(`<i class="me">나</i>`);
      return `<button class="mn-c ${!watch && S.b === i ? "sel" : ""}" data-b="${i}" ${canPick ? "" : "disabled"}><span class="rg">${lab(B, i)}</span><span class="pt">${b.pts}점</span><span class="bx">${chips.join("")}</span></button>`;
    }).join("")}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const top = V.over ? "끝" : mine ? (V.phase === "pick" ? "내 차례 · 메뉴와 예측" : "내 차례 · 박스 옮길까요?") : watch ? "모두 정하는 중" : V.needs.includes(me) ? "대기" : "다른 사람을 기다려요";
    let h = `<div class="mn-top"><span class="mn-rd">🍜 ${V.over ? V.rounds : V.round + 1} / ${V.rounds} 라운드 · ${top}</span>${!watch ? `<span class="mn-bg">내 승점 ${V.pts[me]}</span>` : ""}</div>`;
    const locked = V.phase === "adjust" || !mine;
    if (!watch) {
      const cur = V.phase === "pick" && !V.needs.includes(me) ? V.myMenu : V.phase === "adjust" ? V.myMenu : S.m;
      h += `<div class="mn-lb">${V.phase === "adjust" ? "🔒 내 메뉴 (카드는 못 바꿔요)" : "① 메뉴 고르기"}</div><div class="mn-menus">${M.map((x, m) => `<button data-m="${m}" class="${cur === m ? "sel" : ""}" ${locked ? "disabled" : ""}><span class="em">${x.e}</span>${x.n}</button>`).join("")}</div>`;
    }
    if (!V.over) h += `<div class="mn-lb">${watch ? "예측 칸 (같은 메뉴를 고른 사람 수)" : V.phase === "adjust" ? "② 다른 사람의 박스를 보고 옮기기" : "② 같은 메뉴 고른 사람 수 예측 (나 포함)"}</div>`;
    const canB = mine && !V.over;
    if (!V.over) h += boardHtml(V, ctx, me, watch, !watch && V.phase === "pick" && !mine ? { b: V.myBox } : S, canB);
    h += logHtml(V, ctx, me, watch);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="mn-info"><b>${V.draw ? "무승부예요" : first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 승점 ${V.score.map((x, i) => `${i === me && !watch ? "나" : esc(nameOf(ctx, i))} ${x}`).join(" / ")}</div>`;
    } else if (mine && V.phase === "pick") {
      h += `<div class="mn-info hint">메뉴는 박스 안에 몰래 넣어요. 같은 메뉴를 고른 사람이 <b>나를 포함해 몇 명</b>일지 칸을 골라요 — 적을수록 점수가 높고, 전원 같으면 4점!</div>`;
      h += `<button class="btn big primary" data-a="pick" ${S.m >= 0 && S.b >= 0 ? "" : "disabled"}>📦 박스 올리기</button>`;
    } else if (mine) {
      h += `<div class="mn-info hint">모두의 박스가 올라왔어요. 박스 위치를 보고 한 번만 옮길 수 있어요 (옮기지 않아도 돼요).</div>`;
      h += `<button class="btn big primary" data-a="adj">${S.b === V.myBox ? "✅ 그대로 확정" : "🔁 옮겨서 확정"}</button>`;
    } else if (watch) h += `<div class="mn-info">구경 중 — ${V.n - V.needs.length}/${V.n}명이 정했어요</div>`;
    else h += `<div class="mn-info">${V.phase === "adjust" ? `✅ 확정했어요 (${lab(V.B, V.myAdj)}) — ` : `✅ 올렸어요 (${mn(V.myMenu)} · ${lab(V.B, V.myBox)}) — `}${V.n - V.needs.length}/${V.n}명이 정했어요</div>`;
    stage.innerHTML = h;
    const lg = stage.querySelector("#mn-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.m !== undefined) { S.m = +t.dataset.m; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.b !== undefined) { S.b = +t.dataset.b; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "pick" && S.m >= 0 && S.b >= 0) { ctx.sfx("pop"); ctx.act({ t: "pick", m: S.m, b: S.b }); }
      if (t.dataset.a === "adj") { ctx.sfx("pop"); ctx.act({ t: "adj", b: S.b }); }
    };
  }
  // ── 🎞️ 복기 고리 ──────────────────────────────────────────────
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    const bl = b => (V && V.B && V.B[b] ? lab(V.B, b) : `${(b | 0) + 1}번째 칸`);
    if (a.t === "pick" && M[a.m]) return `${mn(a.m)} 선택 · ${bl(a.b)} 예측`;
    if (a.t === "adj") return V && V.myBox >= 0 ? (a.b === V.myBox ? `${bl(a.b)} 그대로 확정` : `${bl(V.myBox)} → ${ro(bl(a.b))} 옮김`) : `${ro(bl(a.b))} 확정`;
    return "—";
  }
  const pc = x => Math.round(x * 100) + "%";
  const sg = x => x.toFixed(2).replace(/\.?0+$/, "") || "0";
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || !V.B || (info && info.same) || JSON.stringify(myA) === JSON.stringify(bestA)) return null;
    const B = V.B;
    if (V.phase === "pick" && myA.t === "pick" && bestA.t === "pick" && M[myA.m] && B[myA.b] && B[bestA.b]) {
      const T = G.pickTable(V, seat), mine = T[myA.m].ev[myA.b], best = T[bestA.m].ev[bestA.b], loss = best - mine;
      if (loss < 0.12) return null;
      return { sev: Math.max(0, Math.min(100, Math.round(100 * loss / 1.3))), why: `${mn(myA.m)}에서 ${lab(B, myA.b)} 칸은 맞을 확률 약 ${pc(T[myA.m].pr[myA.b])} × ${B[myA.b].pts}점 = 기대 ${sg(mine)}점, 고급 AI의 ${lab(B, bestA.b)} 칸은 약 ${pc(T[bestA.m].pr[bestA.b])} × ${B[bestA.b].pts}점 = ${sg(best)}점이에요 (다들 고르게 고른다고 보고 어림한 값).` };
    }
    if (V.phase === "adjust" && myA.t === "adj" && bestA.t === "adj" && B[myA.b] && B[bestA.b]) {
      const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0, E = G.evalAdjust(V, seat, seed), mine = E.ev[myA.b], best = E.ev[bestA.b], loss = best - mine;
      if (loss < 0.12) return null;
      return { sev: Math.max(0, Math.min(100, Math.round(100 * loss / 1.3))), why: `내 메뉴와 다른 사람의 박스 위치로 어림한 내 모임 크기: ${lab(B, myA.b)} 칸 약 ${pc(E.pr[myA.b])} × ${B[myA.b].pts}점 = 기대 ${sg(mine)}점, 고급 AI의 ${lab(B, bestA.b)} 칸은 약 ${pc(E.pr[bestA.b])} × ${B[bestA.b].pts}점 = ${sg(best)}점이에요.` };
    }
    return null;
  }
  function result(V) {
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    return `${V.draw ? "무승부 (승점이 모두 같아요)" : `우승 ${first.join("·")}번 · 최하위 ${V.losers.map(i => i + 1).join("·")}번`}${V.score ? ` · 승점 ${V.score.join("/")}` : ""}`;
  }
  function tutorial() {
    style();
    const B11 = G.bands(11);
    const board = (sel, chips) => `<div class="mn-board" style="grid-template-columns:repeat(5,1fr)">${B11.map((b, i) => `<div class="mn-c ${sel === i ? "sel" : ""}"><span class="rg">${G.bandLabel(B11, i)}</span><span class="pt">${b.pts}점</span><span class="bx">${(chips[i] || []).map(c => `<i class="${c === "나" ? "me" : ""}">${c}</i>`).join("")}</span></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "같은 메뉴를 고른 사람 수를 맞혀요", body: "<b>4라운드</b> 동안 <b>짜장면 · 짬뽕 · 볶음밥</b> 중 하나를 몰래 고르고, 나와 같은 메뉴를 고른 사람이 <b>나를 포함해 몇 명</b>일지 예측해요. 맞히면 승점! 합계 승점이 가장 높으면 우승, 가장 낮으면 탈락후보예요. (방송은 11명 · 우리는 3~11명)",
        boardHtml: `<div class="mn-tut"><div class="mn-menus" style="width:100%">${M.map(x => `<button disabled><span class="em">${x.e}</span>${x.n}</button>`).join("")}</div></div>`, ms: 7000 },
      { tag: "STEP 2 · 예측 칸", title: "적게 겹칠수록 점수가 높아요", body: "예측 칸은 5개예요 (11명 기준): <b>1명 5점 · 2~3명 3점 · 4~6명 2점 · 7~10명 1점 · 전원 4점</b>. 혼자만 다른 메뉴면 5점이지만 맞히기 어렵고, 가운데 칸은 맞히기 쉬운 대신 점수가 낮아요. 인원이 적으면 칸 범위가 비율로 줄어요.",
        boardHtml: `<div class="mn-tut">${board(-1, [])}</div>`, ms: 9000 },
      { tag: "STEP 3 · 박스 옮기기", title: "다른 사람의 박스를 보고 한 번 옮겨요", body: "모두 박스를 올리면 <b>누가 어느 칸에 올렸는지</b>가 공개돼요. 메뉴 카드는 바꿀 수 없지만 <b>박스는 다른 칸으로 옮길 수 있어요</b> (방송은 1분 동안, 우리는 동시에 한 번). 다른 사람의 박스는 힌트일 뿐 정답이 아니에요.",
        boardHtml: `<div class="mn-tut">${board(2, [[], [], ["나", "삐약", "나비", "범수"], ["치즈"], []])}</div>`, ms: 8500 },
      { tag: "STEP 4 · 공개", title: "박스를 열어 맞힌 사람만 승점", body: "모든 박스를 열어 메뉴를 공개해요. 예측이 맞은 사람은 같은 메뉴를 고른 사람 수에 해당하는 승점을 받고, 틀리면 0점이에요. 4라운드가 끝났는데 <b>모두 승점이 같으면</b> 승점을 지우고 1라운드부터 다시 해요 (우리는 최대 2번까지).",
        boardHtml: `<div class="mn-tut"><div class="mn-log"><div class="mn-ev"><b>2라운드</b> · 🍜1명 🌶️0명 🍚10명<br><span class="win">득점 삐약 +5 · 치즈 +1</span></div><div class="mn-ev">전원이 같은 메뉴일 줄 알고 '전원' 칸에 올린 9명은 0점이었어요 (방송 2라운드).</div></div></div>`, ms: 9000 },
      { tag: "STEP 5 · 직접", title: "내 칸을 골라 봐요", body: "11명 중 나는 짜장면을 골랐고, 나 말고 <b>4명</b>이 같은 짜장면을 골랐어요. 나를 포함하면 5명이에요 — 어느 칸에 올려야 점수를 받을까요?",
        interactive: { hint: "👆 맞는 칸을 눌러요", doneText: "✅ 나 포함 5명 → 4~6명 칸 (2점)! 나를 빼고 세지 않게 조심해요." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="mn-tut"><div class="mn-opt">${B11.map((b, i) => `<button data-w="${i}">${G.bandLabel(B11, i)}</button>`).join("")}</div><div class="mn-info" id="mn-tm">나 포함 몇 명 칸일까요?</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (+b.dataset.w === 2) { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#mn-tm"); if (m) m.textContent = "나 포함 5명이에요 — 어느 칸에 5가 들어가는지 봐요"; } };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-menu"] = {
    name: "오늘의 메뉴", emoji: "🍜", short: "같은 메뉴를 고른 사람 수를 맞혀요 · 박스를 옮길 마지막 기회 · 4라운드", min: 3, max: 11, defN: 11, board: false,
    show: "더 지니어스 · 시즌 4 그랜드 파이널 · 3화 메인 매치", season: "시즌 4 그랜드 파이널",
    opts: [],
    diff: "방송은 11명이지만 우리는 3~11명 (빈 자리는 AI) · 인원이 적으면 예측 칸 범위를 비율로 줄이고 빈 칸은 없애요 (11명이면 방송 그대로) · 칸 점수는 칸의 크기(1명 5 · 2~3명 3 · 4~6명 2 · 7~10명 1 · 전원 4)를 따르니 인원이 적으면 칸이 줄어 점수가 달라져요 (예: 4명이면 1명 5 · 2명 3 · 3명 1 · 4명 전원 4, 5명이면 3명 2 · 4명 1) · 첫 예측도 모두 동시에 비공개로 정해요 · 방송의 20분 정보 교환 · 담합(11인 연합 · 카드박스 비밀 뚜껑 · 마지막 1분 몰래 옮기기)은 대화가 없어 뺐고 예측 변경은 모두 동시에 한 번만 해요 · 방송은 승점 4점마다 가넷을 주지만 우리는 승점만 비교해요 · 전원 승점이 같아 다시 시작하는 것은 최대 2번까지(그래도 같으면 무승부) · 방송의 단독 우승 생명의 징표는 없어요",
    howto: [
      "<b>4라운드</b> 동안 승점을 모아 합계가 가장 높으면 우승 · 가장 낮으면 탈락후보 (방송은 11명 · 우리는 3~11명)",
      "각자 <b>짜장면 · 짬뽕 · 볶음밥</b> 중 하나를 몰래 고르고, <b>나와 같은 메뉴를 고른 사람이 나를 포함해 몇 명</b>일지 예측 칸에 박스를 올려요",
      "모두 올린 뒤 <b>다른 사람의 박스 위치를 보고 한 번</b> 옮길 수 있어요 (메뉴는 못 바꿔요) — 그다음 박스를 열어 공개",
      "예측이 맞은 사람만 승점: <b>1명 5점 · 2~3명 3점 · 4~6명 2점 · 7~10명 1점 · 전원 4점</b> (인원이 적으면 칸 범위가 비율로 줄어요) · 틀리면 0점",
      "특수: 4라운드 뒤 모두 승점이 같으면 승점을 지우고 1라운드부터 다시 (우리는 최대 2번)",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}/${V.rounds} 라운드${V.resets ? ` · 다시 ${V.resets}` : ""}`),
    chip: (V, i) => ({ t: `${V.pts[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

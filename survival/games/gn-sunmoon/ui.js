/* 베니 서바이벌 · 해 달 별 — 화면 (귀띔 · 칸별 베팅 · 공개 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-sunmoon"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.sm-top{display:flex;align-items:center;gap:8px;flex:none;flex-wrap:wrap}
.sm-rd{font:900 14px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.sm-role{font:800 12.5px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:4px 10px;white-space:nowrap}
.sm-wit{flex:none;border:1px dashed rgba(255,255,255,.22);border-radius:12px;padding:7px 10px;background:rgba(0,0,0,.2);font-size:13px;line-height:1.4;color:var(--ink)}
.sm-wit b{color:#fde68a}
.sm-wit .big{font-size:20px;vertical-align:-2px}
.sm-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;flex:none}
.sm-col{border:1.5px solid rgba(255,255,255,.14);border-radius:14px;background:linear-gradient(165deg,rgba(255,255,255,.07),rgba(0,0,0,.28));padding:7px 5px 8px;display:grid;justify-items:center;gap:4px;min-width:0}
.sm-col.ans{border-color:#4ade80;box-shadow:0 0 0 2px #4ade80,0 0 18px rgba(74,222,128,.45)}
.sm-col .ic{font-size:30px;line-height:1}
.sm-col .nm{font:800 13px var(--round);color:#fff}
.sm-col .opp{font:700 12px var(--round);color:#fca5a5;min-height:16px}
.sm-col .mine{font:900 22px var(--round);color:#fde68a;font-variant-numeric:tabular-nums;min-width:2ch;text-align:center}
.sm-step{display:flex;gap:5px;align-items:center}
.sm-step button{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 20px var(--round);cursor:pointer;padding:0}
.sm-step button:disabled{opacity:.3;cursor:default}
.sm-all{border:1px solid rgba(255,255,255,.2);background:rgba(124,58,237,.3);color:#fff;border-radius:99px;font:700 11.5px var(--round);padding:3px 9px;cursor:pointer}
.sm-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.sm-info b{color:#fde68a}
.sm-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.sm-ans{flex:none;text-align:center;font:900 18px var(--round);color:#bbf7d0;padding:6px;border-radius:12px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45)}
.sm-res{display:grid;gap:5px;flex:none}
.sm-res .r{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:6px 9px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);font-size:12.5px}
.sm-res .r b{font:800 13px var(--round)}
.sm-res .r .g{font:900 14px var(--round)}
.sm-res .r .g.up{color:#4ade80}.sm-res .r .g.dn{color:#f87171}
.sm-hist{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;flex:none}
.sm-hist span{font-size:12px;border-radius:8px;padding:2px 6px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.1)}
.sm-tut{display:grid;gap:8px;justify-items:center;font-size:14px}
.sm-tut .sm-cols{width:100%}
@media (max-width:400px){.sm-step button{width:29px;height:29px;font-size:17px}.sm-step{gap:3px}.sm-col{padding:6px 3px}.sm-col .mine{font-size:19px;min-width:1.6ch}.sm-all{padding:3px 6px;font-size:11px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const sum = G.sum;
  let B = null;
  const bet = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.phase}`; if (!B || B.key !== key) B = { key, b: [0, 0, 0] }; return B; };

  function colsHtml(V, ctx, me, mode) {
    // mode: "bet" (내가 거는 중) | "view" (보기만)
    const oppSeat = me >= 0 ? 1 - me : -1;
    const showAns = V.mark >= 0;
    const Bt = mode === "bet" ? bet(V, ctx) : null;
    const lim = V.phase === "first" ? { min: 0, max: V.lim } : V.range || { min: 0, max: 0 };
    const tot = Bt ? sum(Bt.b) : 0;
    return `<div class="sm-cols">${[0, 1, 2].map(k => {
      const ob = oppSeat >= 0 && V.bets[oppSeat] ? V.bets[oppSeat][k] : (me < 0 && V.bets[V.first] ? V.bets[V.first][k] : null);
      const mb = me >= 0 && V.bets[me] ? V.bets[me][k] : null;
      const oppLine = ob != null ? `${me < 0 ? esc(nameOf(ctx, V.first)) : "상대"} ${ob}칩` : "";
      const mineHtml = mode === "bet"
        ? `<div class="sm-step"><button type="button" data-d="-1" data-k="${k}" ${Bt.b[k] <= 0 ? "disabled" : ""} aria-label="${G.MARKS[k]} 줄이기">−</button><span class="mine">${Bt.b[k]}</span><button type="button" data-d="1" data-k="${k}" ${tot >= lim.max ? "disabled" : ""} aria-label="${G.MARKS[k]} 늘리기">+</button></div><button type="button" class="sm-all" data-all="${k}">여기에 몰빵</button>`
        : `<span class="mine">${mb != null ? mb : ""}</span>`;
      return `<div class="sm-col${showAns && V.mark === k ? " ans" : ""}"><span class="ic">${G.EM[k]}</span><span class="nm">${G.MARKS[k]}</span><span class="opp">${oppLine}</span>${mineHtml}</div>`;
    }).join("")}</div>`;
  }
  function revealHtml(V, ctx) {
    const R = V.res; if (!R) return "";
    const rows = [0, 1].map(i => {
      const t = sum(R.bets[i]), g = R.gain[i], net = g - t;
      return `<div class="r"><b>${esc(nameOf(ctx, i))}${i === R.f ? " (선)" : " (후)"}</b><span class="g ${net > 0 ? "up" : net < 0 ? "dn" : ""}">${net > 0 ? "+" : ""}${net}칩</span><span>${R.bets[i].map((x, k) => x ? `${G.EM[k]}${x}` : "").filter(Boolean).join(" ") || "걸지 않음"}</span><span>→ ${R.chips[i]}칩</span></div>`;
    }).join("");
    return `<div class="sm-ans">정답은 ${G.EM[R.mark]} ${G.MARKS[R.mark]}!</div><div class="sm-res">${rows}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const roleTxt = V.first === me ? "내가 선 (먼저)" : V.second === me ? "내가 후 (뒤에)" : `선 ${esc(nameOf(ctx, V.first))}`;
    let h = `<div class="sm-top"><span class="sm-rd">${V.round} / ${V.R} 라운드</span><span class="sm-role">${roleTxt}</span></div>`;
    const myHint = !watch ? V.hint[me] : -1;
    if (V.phase !== "end" || V.res) {
      if (!watch) h += `<div class="sm-wit">관전 플레이어 <b>${esc(V.wit)}</b> 님이 내게 귀띔해요: ${myHint >= 0 ? `<span class="big">${G.EM[myHint]}</span> <b>${G.MARKS[myHint]}</b>이래요` : "…"} <small style="color:var(--soft)">(맞을 확률 50% · 상대에겐 따로 말해요)</small></div>`;
      else h += `<div class="sm-wit">관전 플레이어 <b>${esc(V.wit)}</b> 님의 귀띔 — ${[0, 1].map(i => V.hint[i] >= 0 ? `${esc(nameOf(ctx, i))}: ${G.EM[V.hint[i]]}` : "").join(" · ")}</div>`;
    }
    const reveal = V.phase === "reveal" || V.phase === "end";
    let acts = "";
    if (reveal) {
      h += revealHtml(V, ctx);
    } else if (!watch && ctx.canAct) {
      h += colsHtml(V, ctx, me, "bet");
      const lim = V.phase === "first" ? { min: 0, max: V.lim } : V.range, Bt = bet(V, ctx), tot = sum(Bt.b);
      const okTot = tot >= lim.min && tot <= lim.max;
      h += `<div class="sm-info">${V.phase === "first" ? `선이에요 — <b>0 ~ ${lim.max}칩</b>까지 걸 수 있어요 (상대 칩 ${V.chips[1 - me]}의 절반)` : `후예요 — 상대가 ${sum(V.bets[V.first] || [0, 0, 0])}칩을 걸었어요. <b>${lim.min} ~ ${lim.max}칩</b> (선의 2배 이상 · 모자라면 올인)`}<br>지금 건 칩 <b>${tot}</b></div>`;
      acts = `<div class="sm-acts"><button class="btn primary big" data-go="1" ${okTot ? "" : "disabled"}>${tot === 0 && lim.min === 0 ? "한 칩도 안 걸기" : "✔ 걸기"}</button></div>`;
    } else {
      h += colsHtml(V, ctx, me, "view");
      const who = V.needs.length ? V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") : "";
      h += `<div class="sm-info">${who ? `${who} ${V.needs.includes(V.first) ? "(선)가 거는 중…" : "(후)가 거는 중…"}` : ""}</div>`;
    }
    if (V.hist.length) h += `<div class="sm-hist">${V.hist.map(x => `<span title="${x.r}라운드">${x.r}R ${G.EM[x.mark]}</span>`).join("")}</div>`;
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const Bt = bet(V, ctx), lim = V.phase === "first" ? { min: 0, max: V.lim } : V.range;
      if (t.dataset.d) {
        const k = +t.dataset.k, d = +t.dataset.d;
        if (d > 0 && sum(Bt.b) >= lim.max) return;
        if (d < 0 && Bt.b[k] <= 0) return;
        Bt.b[k] += d; ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.all != null) { Bt.b = [0, 0, 0]; Bt.b[+t.dataset.all] = lim.max; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.go) { ctx.sfx("pop"); ctx.act({ t: "bet", b: Bt.b.slice() }); }
    };
  }
  function result(V) {
    return `<b>라운드별 정답</b> ${V.hist.map(x => `${x.r}R ${G.EM[x.mark]}`).join(" · ")}`;
  }

  function tutorial() {
    style();
    const cols = (a, b, ans) => `<div class="sm-cols">${[0, 1, 2].map(k => `<div class="sm-col${ans === k ? " ans" : ""}"><span class="ic">${G.EM[k]}</span><span class="nm">${G.MARKS[k]}</span>${a ? `<span class="opp">${a[k] ? "선 " + a[k] : ""}</span>` : ""}<span class="mine">${b ? b[k] || "" : ""}</span></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 표식", title: "관전 플레이어가 컵 아래 표식을 숨겨요", body: "탈락후보 두 사람은 <b>베팅 칩 4개</b>씩 받고 시작해요. 관전 플레이어는 번호 순서대로 한 라운드에 한 명씩, 자기 컵 아래 <b>해 · 달 · 별</b> 중 하나의 <b>표식</b>을 숨겨 둬요 (2화는 10명 · 4화는 8명 → 10라운드 · 8라운드). 그 표식이 정답이에요.",
        boardHtml: `<div class="sm-tut"><div class="sm-cols"><div class="sm-col"><span class="ic">🥤</span><span class="nm">컵</span></div></div><small>우리 판에선 관전 플레이어가 두 사람에게 따로 귀띔을 줘요 (맞을 확률 50% · 방송은 대화로 정보를 얻어요)</small></div>`, ms: 6200 },
      { tag: "STEP 2 · 선", title: "선 플레이어가 먼저, 상대 칩의 절반까지", body: "<b>선 플레이어</b>가 먼저 원하는 표식에 베팅해요. 걸 수 있는 건 <b>상대가 가진 칩의 절반까지</b>(소수는 버림)이고, <b>베팅하지 않아도 돼요</b>. 해 · 달 · 별 <b>세 칸에 나눠서</b> 걸어도 돼요.",
        boardHtml: `<div class="sm-tut">${cols(null, [1, 0, 0], -1)}<small>상대 칩 4개 → 선은 최대 2칩 (해에 1칩 베팅)</small></div>`, ms: 5600 },
      { tag: "STEP 3 · 후", title: "후 플레이어는 선이 건 칩의 2배 이상", body: "선이 베팅하면 <b>후 플레이어</b>가 이어서 베팅해요. 반드시 선이 베팅한 칩의 <b>2배 이상</b> 걸어야 해요 (칩이 모자라면 올인). 선이 1칩 걸었다면 후는 2칩 이상! 선 · 후는 라운드마다 바뀌어요.",
        boardHtml: `<div class="sm-tut">${cols([1, 0, 0], [2, 1, 0], -1)}<small>선 1칩 → 후는 2칩 이상 (해 2칩 + 달 1칩)</small></div>`, ms: 5600 },
      { tag: "STEP 4 · 정산", title: "표식을 맞힌 칸은 3배", body: "베팅이 끝나면 컵을 뒤집어 표식을 확인해요. <b>맞힌 칸은 베팅한 칩의 3배</b>로 돌려받고, 틀린 칸의 칩은 모두 잃어요. 세 칸에 똑같이 나눠 걸면 본전이에요.",
        interactive: { hint: "👆 달 칸을 눌러 컵을 열어 봐요 (정답이 🌙 달이에요)", doneText: "✅ 맞힌 칸은 3배! 칩 2 → 6" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="sm-tut">${cols(null, [0, 2, 0], -1)}<small>🌙 달에 2칩을 걸었어요 — 달 칸을 눌러서 컵을 열어 봐요</small></div>`;
          let on = false;
          stage.onclick = e => { const c = e.target.closest(".sm-col"); if (!c || on) return; const k = [...stage.querySelectorAll(".sm-col")].indexOf(c); if (k === 1) { on = true; ctrl.sfx("win"); c.classList.add("ans"); c.querySelector(".mine").textContent = "6"; ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 5 · 끝", title: "칩이 더 적은 쪽이 최종 탈락자", body: "마지막 관전 플레이어(10번 또는 8번)의 베팅까지 끝났을 때 <b>칩이 더 적은 쪽이 최종 탈락자</b>예요. 도중에 칩을 모두 잃어도 바로 최종 탈락자! 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="sm-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4800 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-sunmoon"] = {
    name: "해 달 별", emoji: "🌓", short: "정답 칸에 칩을 걸어 3배", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 2 · 해 달 별", season: "시즌 2 룰 브레이커",
    opts: [{ k: "rounds", label: "방송 판", items: [[10, "10라운드 (2화 · 10명)"], [8, "8라운드 (4화 · 8명)"]], def: 10 }],
    diff: "관전 플레이어는 AI가 맡고, 방송처럼 대화로 정보를 얻는 대신 한 줄 귀띔(맞을 확률 50%)을 줘요 · 표식은 라운드마다 AI가 정해요 (방송은 시작 전에 컵 아래 숨겨 둬요) · 1라운드 선은 동전 던지기 (방송은 가넷이 많은 쪽이 골라요) · 칩이 모자란 후는 올인으로 처리해요 (방송 설명 문구엔 없어요) · 방송의 가넷 베팅(관전 플레이어가 우승자 맞히기)은 없어요",
    howto: [
      "<b>탈락후보</b> 두 사람이 <b>베팅 칩 4개</b>씩 받고 시작해요 — 관전 플레이어가 번호 순서대로 한 라운드에 한 명씩, 자기 컵 아래 <b>해 · 달 · 별</b> 중 하나의 <b>표식</b>을 숨겨요 (그 표식이 정답)",
      "<b>선 플레이어</b>가 먼저 원하는 표식에 베팅 — 0 ~ <b>상대 칩의 절반</b>까지 (안 걸어도 돼요) · <b>후 플레이어</b>는 선이 건 칩의 <b>2배 이상</b> (모자라면 올인) · 세 칸에 나눠 걸 수 있어요",
      "컵을 열어 표식을 맞힌 칸은 베팅한 칩의 <b>3배</b>, 틀린 칸의 칩은 모두 잃어요 · 선 · 후는 라운드마다 바뀌어요",
      "마지막 플레이어(2화 10번 · 4화 8번)의 베팅까지 끝났을 때 칩이 <b>더 적은 쪽이 최종 탈락자</b> — 칩을 모두 잃으면 중간에도 최종 탈락자예요",
    ],
    sub: V => V.over ? "끝" : `${V.round} / ${V.R}라운드`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: V.chips[i] <= 0 }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (같은 난수로 두 베팅을 끝까지 가상으로 둬 이길 확률을 견줌)
    actText: (a, V) => {
      if (!a || a.t !== "bet" || !Array.isArray(a.b) || a.b.length !== 3 || !a.b.every(x => Number.isFinite(x))) return "—";
      const tot = sum(a.b), role = V && typeof V.seat === "number" ? (V.seat === V.first ? "선 · " : V.seat === V.second ? "후 · " : "") : "";
      if (tot <= 0) return role + "한 칩도 안 걸음";
      const on = [0, 1, 2].filter(k => a.b[k] > 0);
      return role + (on.length === 1 ? `${G.EM[on[0]]}${G.MARKS[on[0]]}에 ${tot}칩 몰아 걸기` : `${on.map(k => `${G.EM[k]}${G.MARKS[k]} ${a.b[k]}칩`).join(" · ")} (모두 ${tot}칩)`);
    },
    review: (V, seat, myA, bestA, info) => {
      if (!V || !myA || !bestA || myA.t !== "bet" || bestA.t !== "bet" || !Array.isArray(myA.b) || !Array.isArray(bestA.b)) return null;
      if ((V.phase !== "first" && V.phase !== "second") || (seat !== 0 && seat !== 1) || !V.hint || V.hint[seat] === undefined) return null;
      if (myA.b.join() === bestA.b.join()) return null;
      const k = info && Number.isFinite(info.k) ? info.k : 0, sd = info && Number.isFinite(info.seed) ? info.seed : 1;
      const K = 400, [m, b] = G.compareBets(V, seat, myA.b, bestA.b, ((sd ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0) || 1, K);
      const dW = (b.win - m.win) * 100, pc = x => Math.round(x * 100) + "%";
      const sev = dW <= 0 ? 0 : Math.round(Math.min(100, dW * 3.4));   // 이길 확률이 1%p 깎일 때마다 3.4점 (약 18%p 깎여야 60점 = 📒)
      const sg = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n), span = x => { const g = x.b.map(v => 3 * v - x.total); const lo = Math.min(...g), hi = Math.max(...g); return lo === hi ? `${sg(lo)}칩` : `${sg(lo)}~${sg(hi)}칩`; };
      const tail = `이번 라운드 결과 범위 (정답 칸에 따라) 고급 AI 수 ${span(b)} · 내 수 ${span(m)}`;
      const why = dW > 2 ? `이길 확률 약 ${pc(b.win)} → 내 수 ${pc(m.win)} (끝까지 ${K}번씩 가상으로 둠) · ${tail}`
        : dW < -2 ? `이번엔 내 수 쪽이 이길 확률이 더 높게 나왔어요 (내 수 ${pc(m.win)} · 고급 AI 수 ${pc(b.win)}) · ${tail}`
          : `두 수의 이길 확률이 거의 같아요 (고급 AI 수 ${pc(b.win)} · 내 수 ${pc(m.win)}) · ${tail}`;
      return { sev, why };
    },
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

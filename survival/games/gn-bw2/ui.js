/* 베니 서바이벌 · 흑과 백 II — 화면 (포인트 정하기 · 흑/백 공개 · 5단계 표시등 · 승점 · 1분 규칙)
   숨은 정보: 상대의 정확한 포인트는 끝나기 전엔 화면에 없어요 (색 · 표시등 · 승패만). 이 화면은 view 가 준 것만 그려요. */
(() => {
  "use strict";
  const G = window.SVCores["gn-bw2"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는");
  const CN = { B: "흑(검정)", W: "백(흰색)" };
  const CSS = `
.bw-sc{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;flex:none}
.bw-s{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:7px;align-items:center;justify-items:start;border-radius:14px;background:rgba(0,0,0,.32);border:1.5px solid rgba(255,255,255,.14);padding:4px 9px;min-width:0;height:52px}
.bw-s.me{border-color:#86efac}
.bw-s.on{box-shadow:0 0 0 2px var(--gold)}
.bw-s small{grid-column:1 / 3;font:700 10.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.bw-s b{font:900 24px/1 var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.bw-pips{display:flex;gap:3px;flex-wrap:nowrap}
.bw-pips i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.16)}
.bw-pips i.on{background:#fde68a}
.bw-rd{text-align:center;font:800 11px/1.3 var(--round);color:var(--soft);white-space:nowrap}
.bw-rd b{display:block;color:#fff;font-size:13px}
.bw-pan{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:none}
.bw-p{border-radius:14px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.14);padding:6px 6px 7px;display:grid;gap:4px;justify-items:center;min-width:0}
.bw-p.me{border-color:rgba(134,239,172,.5)}
.bw-p.won{border-color:#fde68a;box-shadow:0 0 0 2px rgba(253,230,138,.55)}
.bw-nm{display:flex;align-items:center;gap:5px;max-width:100%;min-width:0}
.bw-nm b{font:800 12.5px var(--round);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.bw-role{font:900 10.5px var(--round);padding:1px 7px;border-radius:99px;flex:none}
.bw-role.sun{background:#fde68a;color:#422006}
.bw-role.hu{background:rgba(255,255,255,.16);color:#e2e8f0}
.bw-lamps{display:flex;gap:5px}
.bw-lamps i{width:15px;height:15px;border-radius:50%;background:#1f2937;border:1.5px solid rgba(255,255,255,.2)}
.bw-lamps i.on{background:radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 55%,#d97706);border-color:#fde68a;box-shadow:0 0 8px rgba(251,191,36,.8)}
.bw-lamps i.out{animation:bwOut 1s ease 2;border-color:#fb7185}
.bw-lamps i.last{outline:1px dashed rgba(253,230,138,.55);outline-offset:1px}
.bw-rng{font:700 11px var(--round);color:var(--soft);text-align:center;line-height:1.25;white-space:nowrap}
.bw-rng b{font:900 15px var(--round);color:#fde68a}
.bw-tile{width:100%;height:46px;border-radius:11px;display:grid;place-items:center;align-content:center;line-height:1.1;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.bw-tile b{font:900 22px/1 var(--round);font-variant-numeric:tabular-nums}
.bw-tile small{font:800 10.5px var(--round)}
.bw-tile.B{background:#09090b;color:#fff;border:2px solid #71717a}
.bw-tile.W{background:#f8fafc;color:#0f172a;border:2px solid #fff}
.bw-tile.none{background:transparent;border:2px dashed rgba(255,255,255,.25);color:var(--soft);font:700 12px var(--round);box-shadow:none}
.bw-tile.flip{animation:bwFlip .45s ease both}
.bw-st{flex:none;text-align:center;font:700 12.5px/1.4 var(--round);color:var(--ink);min-height:40px;display:grid;place-items:center;align-content:center}
.bw-st b{color:#fde68a}
.bw-st .ok{color:#86efac}.bw-st .no{color:#fca5a5}
.bw-st small{display:block;font:600 11.5px var(--round);color:var(--soft)}
.bw-hist{display:flex;gap:3px;justify-content:center;flex:none}
.bw-h{width:31px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:center;padding:2px 0 4px;font:800 11px/1 var(--round);color:var(--soft)}
.bw-h.now{border-color:#fde68a;color:#fde68a}
.bw-h.up{opacity:.4}
.bw-h .w1{color:#86efac}.bw-h .w2{color:#fca5a5}
.bw-h .cc{display:flex;gap:2px}
.bw-h .cc i{width:10px;height:8px;border-radius:2px;border:1px solid #71717a;background:#09090b}
.bw-h .cc i.W{background:#fff;border-color:#fff}
.bw-in{display:grid;gap:6px;margin-top:auto;flex:none}
.bw-row{display:grid;grid-template-columns:46px 40px minmax(0,1fr) 40px 46px;gap:5px;align-items:center}
.bw-row button{height:42px;border-radius:12px;border:1.5px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round);cursor:pointer;touch-action:manipulation;padding:0}
.bw-row button:active{transform:scale(.95)}
.bw-row button:disabled{opacity:.3}
.bw-num{width:100%;min-width:0;height:46px;border-radius:12px;text-align:center;font:900 26px var(--round);border:2.5px solid;padding:0;-moz-appearance:textfield;appearance:textfield;font-variant-numeric:tabular-nums}
.bw-num::-webkit-inner-spin-button,.bw-num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.bw-num.B{background:#09090b;color:#fff;border-color:#71717a}
.bw-num.W{background:#f8fafc;color:#0f172a;border-color:#fff}
.bw-rg{width:100%;height:22px;accent-color:var(--gold);margin:0;touch-action:pan-y}
.bw-pre{display:flex;gap:5px}
.bw-pre button{flex:1 1 0;min-width:0;padding:5px 2px;border-radius:10px;border:1.5px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:var(--ink);font:800 12px var(--round);cursor:pointer;touch-action:manipulation;min-height:32px;white-space:nowrap}
.bw-pv{text-align:center;font:700 11.5px/1.35 var(--round);color:var(--soft)}
.bw-pv b{color:#fde68a}
.bw-wait{margin-top:auto}
.bw-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.bw-tut .bw-pan{width:100%}
.bw-tut .bw-lampr{display:flex;align-items:center;gap:9px;font:800 12.5px var(--round)}
.bw-tut .bw-lampr small{color:var(--soft)}
.bw-tut .bw-qs{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
.bw-tut .bw-qs button{min-width:56px;height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:900 17px var(--round);cursor:pointer}
.bw-tut .bw-qs button.good{border-color:#4ade80;background:rgba(34,197,94,.2)}
.bw-tut .bw-qs button.bad{border-color:#f87171;background:rgba(248,113,113,.15)}
@keyframes bwOut{0%,100%{filter:none}50%{filter:brightness(2.4)}}
@keyframes bwFlip{from{transform:rotateX(90deg)}to{transform:none}}
@media (max-height:700px){.bw-st{min-height:34px;font-size:12px}.bw-tile{height:40px}.bw-tile b{font-size:19px}.bw-s{height:46px}.bw-pre button{min-height:28px}.bw-in{gap:4px}.bw-row button{height:38px}.bw-num{height:42px;font-size:23px}}
@media (max-height:660px){.bw-hist{display:none}}
.sv-coachfit .bw-hist,.sv-coachfit .bw-pre,.sv-coachfit .bw-pv{display:none}
.sv-coachfit .bw-st{min-height:0;font-size:11.5px;line-height:1.3}
.sv-coachfit .bw-st small{display:none}
.sv-coachfit .bw-tile{height:34px}.sv-coachfit .bw-tile b{font-size:17px}.sv-coachfit .bw-tile small{font-size:9.5px}
.sv-coachfit .bw-s{height:40px}.sv-coachfit .bw-s b{font-size:20px}
.sv-coachfit .bw-p{gap:3px;padding:4px 5px 5px}
.sv-coachfit .bw-lamps i{width:12px;height:12px}
.sv-coachfit .bw-rg{height:16px}
.sv-coachfit .bw-row button{height:34px}.sv-coachfit .bw-num{height:36px;font-size:21px}
.sv-coachfit .bw-in{gap:3px}
@media (max-width:400px){.bw-s b{font-size:22px}.bw-row{grid-template-columns:42px 36px minmax(0,1fr) 36px 42px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const lampsHtml = (L, L0) => { let h = ""; for (let k = 1; k <= 5; k++) h += `<i class="${k <= L ? "on" : ""}${k > L && L0 != null && k <= L0 ? " out" : ""}${k === 1 ? " last" : ""}"></i>`; return `<span class="bw-lamps" role="img" aria-label="표시등 ${L}칸">${h}</span>`; };
  const pipsHtml = n => { let h = ""; for (let k = 1; k <= G.GOAL; k++) h += `<i class="${k <= n ? "on" : ""}"></i>`; return `<span class="bw-pips">${h}</span>`; };

  // 이 화면의 입력 상태 (라운드 · 단계가 바뀌면 새로 시작)
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.phase}|${V.ext}|${V.hist.length}`;
    if (!RS || RS.key !== key) RS = { key, n: 0, sent: false };
    return RS;
  };

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || (me !== 0 && me !== 1);
    const L = watch ? 0 : me, R = 1 - L;
    const nm = i => (!watch && i === me ? "나" : esc(nameOf(ctx, i)));
    const sj = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const mine = !watch && !!ctx.canAct && V.needs.includes(me) && !V.over;
    const S = mine ? rs(V, ctx) : null;
    const segLen = V.ext ? G.EXT_ROUNDS : G.ROUNDS, base = V.cap - segLen, rr = Math.min(segLen, Math.max(1, V.round - base));
    const last = V.hist.length ? V.hist[V.hist.length - 1] : null, shown = (V.phase === "show" || V.phase === "end") && last;

    // 위: 승점
    const scoreBox = i => `<div class="bw-s${!watch && i === me ? " me" : ""}${V.needs.includes(i) && !V.over ? " on" : ""}"><small>${nm(i)}</small><b>${V.score[i]}</b>${pipsHtml(V.score[i])}</div>`;
    let h = `<div class="bw-sc">${scoreBox(L)}<div class="bw-rd"><b>${V.ext ? `연장 ${V.ext}` : "라운드"} ${rr}/${segLen}</b>먼저 ${V.goal}점</div>${scoreBox(R)}</div>`;

    // 두 사람 칸: 선/후 · 표시등 · 이번 라운드 낸 것
    const pan = i => {
      const placed = V.placed[i], col = V.col[i], n = V.cur[i], exact = typeof n === "number";
      const won = shown && last.w === i;
      const tile = placed
        ? `<div class="bw-tile ${col}${shown ? " flip" : ""}"><b>${exact ? n : "?"}</b><small>${col === "W" ? (exact ? "백 (흰색)" : "백 · 10~99") : (exact ? "흑 (검정)" : "흑 · 0~9")}</small></div>`
        : `<div class="bw-tile none">${V.needs.includes(i) && !V.over ? "정하는 중…" : V.over ? "—" : "기다려요"}</div>`;
      const pt = V.pts[i] !== null && V.pts[i] !== undefined;
      return `<div class="bw-p${!watch && i === me ? " me" : ""}${won ? " won" : ""}"><div class="bw-nm"><b>${nm(i)}</b><span class="bw-role ${V.sun === i ? "sun" : "hu"}">${V.sun === i ? "선" : "후"}</span></div>${lampsHtml(V.lite[i], V.liteStart[i])}<div class="bw-rng">${pt ? `남은 <b>${V.pts[i]}</b> · ` : ""}${V.lite[i]}칸 · ${G.RANGE(V.lite[i])}</div>${tile}</div>`;
    };
    h += `<div class="bw-pan">${pan(L)}${pan(R)}</div>`;

    // 안내 글
    const dropTxt = i => (V.lite[i] < V.liteStart[i] ? `표시등이 ${V.liteStart[i]}칸 → <b>${V.lite[i]}칸</b>으로 꺼졌어요` : "표시등은 그대로예요");
    let st = "";
    const extNote = V.ext && !V.hist.some(e => e.ext === V.ext) && V.phase === "sun" ? `<small>9라운드 뒤에도 승점이 같아 ${V.seg}포인트씩 새로 받고 3라운드를 더 해요</small>` : "";
    if (V.over) {
      const w = V.score[0] === V.score[1] ? -1 : V.score[0] > V.score[1] ? 0 : 1;
      st = w < 0 ? `<span><b>🤝 끝까지 비겼어요</b> (${V.score[0]} : ${V.score[1]})</span>` : !watch ? `<span class="${w === me ? "ok" : "no"}"><b>${w === me ? "🎉 내가 이겼어요!" : "아쉽게 졌어요"}</b> ${V.score[me]} : ${V.score[1 - me]} · 상대 포인트는 복기에서 다 볼 수 있어요</span>` : `<span><b>${nm(w)} 승리!</b> ${V.score[0]} : ${V.score[1]}</span>`;
    } else if (V.phase === "show" && last) {
      const t = last.w < 0 ? `같은 포인트라 승점은 없어요` : last.w === me && !watch ? `<span class="ok">🎉 내가 승점 1점!</span>` : `<span class="${watch ? "" : "no"}">${sj(last.w)} 승점 1점을 가져가요</span>`;
      const nx = V.fin ? (V.score[0] >= V.goal || V.score[1] >= V.goal ? `승점 ${V.goal}점을 먼저 얻어 끝났어요` : V.score[0] === V.score[1] ? "연장까지 같아 끝났어요" : `${segLen}라운드가 끝났어요`)
        : V.round >= V.cap ? `${segLen}라운드가 끝났지만 승점이 같아 ${G.EXT_PTS}포인트로 ${G.EXT_ROUNDS}라운드를 더 해요`
          : `다음 라운드는 ${nm(V.nextSun)}${last.w < 0 ? " 그대로" : ""} 선`;
      st = `<span>${last.r}라운드 · ${t}<small>${nm(last.sun)}(선) ${CN[last.col[last.sun]]} · ${nm(1 - last.sun)}(후) ${CN[last.col[1 - last.sun]]} · ${esc(String(nx))}${V.skip ? ` · 둘 다 0포인트라 남은 ${V.skip}라운드는 모두 무승부로 건너뛰어요` : ""}</small></span>`;
    } else if (V.phase === "sun") {
      if (mine) st = `<span>내가 <b>선</b> — 쓸 포인트를 먼저 정해요<small>상대(후)는 내 <b>색</b>과 <b>표시등 변화</b>를 보고 정해요</small>${extNote}</span>`;
      else st = `<span>${sj(V.sun)} 선으로 포인트를 정하는 중이에요…${extNote}</span>`;
    } else if (V.phase === "hu") {
      if (mine) st = `<span>${sj(V.sun)} 선으로 <b>${CN[V.col[V.sun]]}</b>을 냈어요<small>${dropTxt(V.sun)} · 이제 내가 정해요 (더 많이 쓰면 승점 1점)</small></span>`;
      else if (!watch && V.sun === me) st = `<span>✅ 정했어요 — 상대가 내 색과 표시등을 보고 정하는 중이에요…<small>내 포인트는 ${V.cur[me]} (${CN[V.col[me]]}) · ${dropTxt(me)}</small></span>`;
      else st = `<span>${sj(V.sun)} ${CN[V.col[V.sun]]}을 냈고, ${sj(1 - V.sun)} 후로 정하는 중이에요… <small>${dropTxt(V.sun)}</small></span>`;
    }
    h += `<div class="bw-st">${st}</div>`;

    // 라운드 기록 (색 = 두 사람이 낸 색, 위 글씨 = 이긴 쪽)
    {
      let hs = "";
      for (let r = base + 1; r <= V.cap; r++) {
        const e = V.hist.find(x => x.r === r && x.ext === V.ext);
        if (e) hs += `<span class="bw-h${!V.over && r === V.round && V.phase === "show" ? " now" : ""}" title="${r - base}라운드"><span class="${e.w === L ? "w1" : e.w === R ? "w2" : ""}">${e.w < 0 ? "＝" : watch ? (e.w === L ? "◀" : "▶") : e.w === me ? "나" : "상"}</span><span class="cc"><i class="${e.col[L]}"></i><i class="${e.col[R]}"></i></span></span>`;
        else hs += `<span class="bw-h${r === V.round && !V.over ? " now" : " up"}" title="${r - base}라운드"><span>${r - base}</span><span class="cc"></span></span>`;
      }
      h += `<div class="bw-hist" aria-label="라운드 기록 (칸 안 네모는 왼쪽 · 오른쪽 사람이 낸 색)">${hs}</div>`;
    }

    // 입력 (내 차례)
    let focusNum = false;
    if (mine) {
      const P = V.pts[me];
      S.n = Math.max(0, Math.min(P, S.n | 0));
      const half = Math.round(P / 2), pre = [[0, "0"], [Math.min(9, P), `${Math.min(9, P)} 흑`], [Math.min(10, P), `${Math.min(10, P)} 백`], [half, `절반 ${half}`], [P, `전부 ${P}`]].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i);
      h += `<div class="bw-in"><div class="bw-row"><button type="button" data-d="-10">−10</button><button type="button" data-d="-1">−1</button><input class="bw-num ${S.n >= 10 ? "W" : "B"}" type="number" inputmode="numeric" min="0" max="${P}" value="${S.n}" aria-label="쓸 포인트"><button type="button" data-d="1">+1</button><button type="button" data-d="10">+10</button></div>
        <input class="bw-rg" type="range" min="0" max="${P}" step="1" value="${S.n}" aria-label="쓸 포인트 고르기">
        <div class="bw-pre">${pre.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("")}</div>
        <div class="bw-pv" data-pv></div>
        <button type="button" class="btn big primary" data-go></button></div>`;
      focusNum = true;
    } else h += `<div class="bw-wait"></div>`;
    stage.innerHTML = h;
    if (!mine) { stage.onclick = null; stage.oninput = null; return; }

    // 입력 연결 — 눌러도 화면을 다시 안 그리고 값만 바꿔요 (슬라이더 끌기가 안 끊기게)
    const P = V.pts[me], num = stage.querySelector(".bw-num"), rg = stage.querySelector(".bw-rg"), pv = stage.querySelector("[data-pv]"), go = stage.querySelector("[data-go]");
    const paint = (fromNum) => {
      const n = S.n, after = P - n, Lq = G.lite(after), L0 = G.lite(P);
      if (!fromNum && num.value !== String(n)) num.value = String(n);
      if (rg.value !== String(n)) rg.value = String(n);
      num.className = `bw-num ${n >= 10 ? "W" : "B"}`;
      const drop = Lq < L0;
      pv.innerHTML = `${n >= 10 ? "백(흰색 · 두 자릿수)" : "흑(검정 · 한 자릿수)"} · 쓰면 남는 <b>${after}</b>포인트 · 표시등 ${L0}칸${drop ? ` → <b>${Lq}칸 (꺼져요)</b>` : " 그대로"}`;
      go.textContent = `${n} 포인트로 정하기`;
      stage.querySelector("[data-d='-1']").disabled = stage.querySelector("[data-d='-10']").disabled = n <= 0;
      stage.querySelector("[data-d='1']").disabled = stage.querySelector("[data-d='10']").disabled = n >= P;
    };
    const set = (v, fromNum) => { S.n = Math.max(0, Math.min(P, Math.round(+v) || 0)); paint(fromNum); };
    paint(false);
    stage.oninput = e => {
      const t = e.target;
      if (t === rg) { set(rg.value, false); }
      else if (t === num) { if (num.value === "") return; const v = +num.value; set(v, v >= 0 && v <= P && num.value === String(v)); }
    };
    stage.onchange = e => { if (e.target === num) set(num.value, false); };
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.d) { ctx.sfx("tap"); set(S.n + (+t.dataset.d), false); return; }
      if (t.dataset.v != null) { ctx.sfx("tap"); set(+t.dataset.v, false); return; }
      if (t.hasAttribute("data-go")) {
        if (S.sent) return;
        set(num.value === "" ? S.n : num.value, false);
        S.sent = true; ctx.sfx("pop"); const r = ctx.act({ t: "bid", n: S.n });
        if (!r || !r.ok) S.sent = false;
      }
    };
    void focusNum;
  }

  const result = (V, me) => {
    const H = V.hist || [], mi = me === 0 || me === 1 ? me : -1, a = mi >= 0 ? mi : 0, b = 1 - a;
    const my = H.filter(x => x.w === a).length, op = H.filter(x => x.w === b).length;
    const numOf = (x, i) => (typeof x.n[i] === "number" ? x.n[i] : "?");
    const spent = i => H.reduce((s, x) => s + (typeof x.n[i] === "number" ? x.n[i] : 0), 0);
    const seg = [];
    for (const x of H) { if (!seg.length || seg[seg.length - 1].ext !== x.ext) seg.push({ ext: x.ext, rows: [] }); seg[seg.length - 1].rows.push(x); }
    const lines = seg.map(g => `${g.ext ? `<b>연장 ${g.ext}</b> ` : ""}${g.rows.map(x => `${numOf(x, a)}:${numOf(x, b)}${x.w === a ? "✔" : x.w === b ? "✘" : "＝"}`).join(" · ")}`).join("<br>");
    return `<b>${H.length}라운드</b> · 최종 승점 ${mi >= 0 ? `나 ${V.score[a]} : 상대 ${V.score[b]}` : `${V.score[0]} : ${V.score[1]}`}${V.ext ? ` · 연장 ${V.ext}번` : ""}<br>이긴 라운드 ${my}번 · 진 라운드 ${op}번 · 쓴 포인트 ${mi >= 0 ? "나" : "1번"} ${spent(a)} · ${mi >= 0 ? "상대" : "2번"} ${spent(b)}<br><small>라운드별 낸 포인트 (${mi >= 0 ? "나:상대" : "1번:2번"}, ✔ 내가 이김)</small><br>${lines}`;
  };

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const panel = (name, role, L, pts, tile) => `<div class="bw-p"><div class="bw-nm"><b>${name}</b><span class="bw-role ${role}">${role === "sun" ? "선" : "후"}</span></div>${lampsHtml(L, null)}<div class="bw-rng">${pts}</div>${tile}</div>`;
    const t = (c, txt, sm) => `<div class="bw-tile ${c}"><b>${txt}</b><small>${sm}</small></div>`;
    return [
      { tag: "STEP 1 · 시작", title: "99포인트씩 · 9라운드", body: "두 사람이 각각 <b>99포인트</b>씩 가지고 시작해요. 게임은 총 <b>9라운드</b>예요. 라운드마다 99포인트 중 <b>원하는 만큼</b> 써요 (0 도 괜찮아요). 쓴 포인트는 <b>사라져요</b>.",
        boardHtml: `<div class="bw-tut"><div class="bw-pan">${panel("나", "sun", 5, "남은 <b>99</b> · 5칸 · 80~99", `<div class="bw-tile none">0~99 중에서</div>`)}${panel("상대", "hu", 5, "5칸 · 80~99", `<div class="bw-tile none">0~99 중에서</div>`)}</div></div>`, ms: 6200 },
      { tag: "STEP 2 · 선 · 후 · 흑과 백", title: "색만 보이고 정확한 수는 비밀", body: "<b>선 플레이어</b>가 먼저 정하면 쓴 포인트가 <b>한 자릿수(0~9)면 검정</b>, <b>두 자릿수(10~99)면 흰색</b>으로만 공개돼요. <b>후 플레이어</b>가 정하면 <b>더 많이 쓴 쪽이 승점 1점</b>을 얻어요.",
        boardHtml: `<div class="bw-tut"><div class="bw-pan">${panel("선", "sun", 5, "먼저 정해요", t("B", "?", "흑 · 0~9"))}${panel("후", "hu", 5, "보고 정해요", t("W", "?", "백 · 10~99"))}</div></div>`, ms: 6400 },
      { tag: "STEP 3 · 표시등", title: "남은 포인트는 5단계 표시등으로만", body: "남은 포인트는 <b>5단계 표시등</b>으로만 공개돼요. <b>20포인트</b>씩 줄어들 때마다 한 칸씩 꺼지고, 포인트를 <b>입력한 순간</b> 적용돼서 선이 칸을 낮추면 후가 정하기 <b>전에</b> 보여요. 마지막 한 칸은 0 이어도 <b>안 꺼져요</b>.",
        boardHtml: `<div class="bw-tut">${[[5, "80~99"], [4, "60~79"], [3, "40~59"], [2, "20~39"], [1, "0~19 (마지막 칸은 안 꺼져요)"]].map(([l, r]) => `<div class="bw-lampr">${lampsHtml(l, null)}<span>${r}</span></div>`).join("")}</div>`, ms: 6600 },
      { tag: "STEP 4 · 직접", title: "표시등을 한 칸 꺼 봐요", body: "99포인트에서 <b>표시등이 한 칸 꺼지려면</b> 최소 몇 포인트를 써야 할까요? (80 아래로 내려가야 해요) 눌러 봐요!",
        interactive: { hint: "👆 한 칸이 꺼지는 가장 작은 포인트를 눌러요", doneText: "✅ 99 − 20 = 79 → 60~79 칸이라 한 칸이 꺼져요! (19 를 쓰면 80 이라 안 꺼져요)" },
        render(stage, ctrl) {
          let done = false;
          const draw = (msg, picked, good) => { stage.innerHTML = `<div class="bw-tut">${lampsHtml(5, null)}<div class="bw-qs">${[10, 19, 20, 21, 30].map(v => `<button type="button" data-v="${v}" class="${picked === v ? (good ? "good" : "bad") : ""}">${v}</button>`).join("")}</div><small>${msg}</small></div>`; };
          draw("남은 99포인트 · 표시등 5칸 (80~99)");
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b || done) return;
            const v = +b.dataset.v;
            if (v === 20) { done = true; draw("99 − 20 = 79 → 4칸 (60~79) ✔", v, true); ctrl.sfx("win"); ctrl.complete(); }
            else { ctrl.sfx("tap"); draw(v < 20 ? `99 − ${v} = ${99 - v} → 아직 80~99 칸이라 안 꺼져요, 다시!` : `99 − ${v} = ${99 - v} → 꺼지지만 더 작은 수로도 돼요, 다시!`, v, false); }
          };
        } },
      { tag: "STEP 5 · 승부", title: "승점 5점 먼저 · 이긴 사람이 다음 선", body: "라운드마다 <b>승점 1점</b>씩, <b>승점 5점을 먼저</b> 얻으면 그 즉시 승리! 9라운드가 끝나면 <b>승점이 높은 쪽</b>이 이겨요. 후는 선의 <b>색</b>과 <b>표시등 변화</b>로 낸 수를 짐작해서 <b>딱 한 끝 더</b> 내는 심리전이에요 — 방송에서도 1 차이로 갈렸어요. 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="bw-tut"><div class="bw-sc" style="width:100%"><div class="bw-s me"><small>나</small><b>5</b>${pipsHtml(5)}</div><div class="bw-rd"><b>WIN</b>먼저 5점</div><div class="bw-s"><small>상대</small><b>4</b>${pipsHtml(4)}</div></div></div>`, ms: 6600 },
    ];
  }

  // ── 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 와 같은 승리 확률 어림으로 견줌) ──
  const pc = x => Math.round(x * 100) + "%";
  function actText(a, V) {
    if (!a || typeof a !== "object" || a.t !== "bid" || !Number.isFinite(+a.n)) return "—";
    const n = Math.round(+a.n);
    return `${n}포인트 (${n >= 10 ? "백·흰색" : "흑·검정"})`;
  }
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || myA.t !== "bid" || bestA.t !== "bid" || (seat !== 0 && seat !== 1) || !V.needs || !V.needs.includes(seat)) return null;
    if ((myA.n | 0) === (bestA.n | 0)) return null;
    const m = G.evalBid(V, seat, myA.n | 0), b = G.evalBid(V, seat, bestA.n | 0);
    if (!m || !b) return null;
    const gap = b.ev - m.ev;                        // 이기게 될 확률(어림)의 차이 · 25%p 가 100점
    let sev = gap < 0.02 ? 0 : 100 * gap / 0.25;
    if (info && info.same) sev = Math.min(sev, 20);  // 고급 AI 도 가끔 두는 수
    sev = Math.max(0, Math.min(100, Math.round(sev)));
    const isSun = V.sun === seat;
    const stat = (e, a) => `${a}포인트(${e.col === "W" ? "백" : "흑"}): 이번 라운드 이길 확률 약 ${pc(e.pw)}${e.pt > 0.01 ? ` · 비길 확률 ${pc(e.pt)}` : ""} · 남는 ${e.Pn}포인트${e.drop ? ` (표시등 ${e.lite}칸으로 꺼져요)` : ""} → 끝내 이길 확률 약 ${pc(e.ev)}`;
    const reading = !isSun && b.bLo != null ? ` · 선이 낸 수는 ${b.bLo === b.bHi ? b.bLo : `${b.bLo}~${b.bHi}`}로 읽혀요 (확실히 이기려면 ${b.sure}포인트)` : (isSun && b.pc != null ? ` · 상대가 덤빌 확률 약 ${pc(b.pc)}` : "");
    const tail = gap >= 0.02 ? ` — 이길 확률 ${Math.round(gap * 100)}%p 차이` : gap <= -0.02 ? " — 이 계산으로는 내 수가 더 높아요 (고급 AI 는 앞섬 · 뒤짐도 봐요)" : " — 거의 같아요";
    return { sev, why: `고급 AI 수 ${stat(b, bestA.n | 0)} / 내 수 ${stat(m, myA.n | 0)}${reading}${tail}`, best: actText(bestA) };
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-bw2"] = {
    name: "흑과 백 II", emoji: "☯️", short: "99포인트를 9라운드에 나눠 써요 · 색과 표시등만 보이는 1:1 데스매치", min: 2, max: 2, defN: 2, board: false, fitCoach: true,
    show: "더 지니어스 · 시즌 3 · 흑과 백 II", season: "시즌 3 블랙가넷",
    opts: [
      { k: "first", label: "1라운드 선", items: [[-1, "동전 던지기"], [0, "첫 번째 자리"], [1, "두 번째 자리"]], def: -1 },
    ],
    diff: "1라운드 선은 방송에서 상대가 정하거나 코인 토스인데 우리는 동전(옵션으로 고정 가능) · 방송은 태블릿에 손으로 쓰고 우리는 숫자 단추(시간 제한 없음, 방송에도 시간 제한은 안 나와요) · 같은 포인트(무승부)면 승점 없이 선 그대로, 9라운드 뒤에도 승점이 같으면 33포인트를 새로 받아 3라운드 연장(승점은 그대로 이어서, 최대 3번 → 그래도 같으면 무승부)은 나무위키 기준이라 영상으로 확인하지 못했어요 · 둘 다 0포인트가 되면 남은 라운드는 모두 무승부라 건너뛰어요(우리 판만) · 상대의 정확한 포인트는 끝난 뒤 복기에서만 공개해요 (방송은 경기 중 점수판에 남은 포인트가 나와요) · 숨은 포인트라 한 기기 두 사람 모드는 없어요 (AI · 친구랑)",
    howto: [
      "두 사람이 각각 <b>99포인트</b>씩 가지고 시작해요 · 게임은 총 <b>9라운드</b>",
      "라운드마다 99포인트 중 <b>원하는 만큼</b>(0 도 가능) 써요 — <b>선 플레이어</b>가 먼저 정하면 한 자릿수(0~9)는 <b>검정</b> · 두 자릿수(10~99)는 <b>흰색</b>으로만 공개돼요 (정확한 수는 비밀)",
      "<b>후 플레이어</b>가 정하면 <b>더 많이 쓴 쪽이 승점 1점</b> · 쓴 포인트는 사라져요 · 이긴 사람이 다음 라운드의 선 (문서 기준)",
      "남은 포인트는 <b>5단계 표시등</b>으로만 공개돼요 (80~99 · 60~79 · 40~59 · 20~39 · 0~19) — 20포인트씩 줄 때마다 한 칸씩 꺼지고 <b>입력한 순간</b> 적용돼요 · 마지막 칸은 0 이어도 안 꺼져요",
      "선이 칸을 낮추면 후가 정하기 <b>전에</b> 보여요 — 선의 색과 표시등 변화로 낸 수를 짐작해요",
      "<b>승점 5점을 먼저</b> 얻으면 즉시 승리 · 9라운드가 끝났을 때 <b>승점이 더 높은 쪽</b> 승리",
      "<b>특수</b> — 9라운드 뒤에도 승점이 같으면 <b>33포인트로 3라운드 연장</b> (문서 기준) · 연장을 <b>최대 3번</b> 해도 같으면 <b>무승부</b> (끝없는 판을 막는 우리 판 상한, 방송엔 없어요)",
    ],
    sub: V => (V.over ? "끝" : `${V.ext ? `연장 ${V.ext} · ` : ""}${Math.max(1, V.round - (V.cap - (V.ext ? G.EXT_ROUNDS : G.ROUNDS)))}/${V.ext ? G.EXT_ROUNDS : G.ROUNDS}라운드 · 먼저 ${V.goal}점`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

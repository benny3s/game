/* 베니 서바이벌 · 진실탐지기 — 화면 (내 패스워드 · 질문 · 거짓 답 · 탐지기 · 정답 시도 · 아이템 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-truth"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.tr-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.tr-rd{font:900 14px var(--round);color:#fff;background:rgba(236,72,153,.25);border:1px solid rgba(244,114,182,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.tr-bg{font:800 12px var(--round);color:var(--soft);white-space:nowrap}
.tr-codes{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tr-cb{display:grid;gap:3px;justify-items:center;padding:6px 6px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);min-width:0}
.tr-cb.me{border-color:#fde68a;background:rgba(253,230,138,.08)}
.tr-cb .lb{font:800 11px var(--round);color:var(--soft)}
.tr-cb .dg{display:flex;gap:4px}
.tr-cb .dg b{display:grid;place-items:center;width:24px;height:30px;border-radius:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);font:900 19px var(--round);color:#fff}
.tr-cb.me .dg b{color:#fde68a}
.tr-cb .kn{font:700 11px var(--round);color:#fca5a5;text-align:center;min-height:14px;line-height:1.2}
.tr-it{flex:none;display:flex;gap:5px;flex-wrap:wrap;justify-content:center;font:800 11.5px var(--round)}
.tr-it span{padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:#e2e8f0;white-space:nowrap}
.tr-it span.u{opacity:.45;text-decoration:line-through}
.tr-it span.me{border-color:#fde68a}
.tr-log{flex:1 1 auto;min-height:70px;overflow-y:auto;display:grid;gap:4px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.tr-ev{padding:4px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.tr-ev.m{border-left:3px solid #fde68a}
.tr-ev.o{border-left:3px solid #38bdf8}
.tr-ev b{color:#fff}
.tr-ev .an{color:#bbf7d0}
.tr-ev .an.ring{color:#fca5a5}
.tr-ev .nt{display:block;font:700 11px var(--round);color:var(--soft)}
.tr-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.tr-info b{color:#fde68a}
.tr-info .warn{color:#fca5a5}
.tr-acts{display:grid;gap:6px;flex:none}
.tr-tabs{display:flex;gap:5px}
.tr-tabs button{flex:1;padding:6px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font:800 12.5px var(--round);cursor:pointer;white-space:nowrap}
.tr-tabs button.sel{border-color:#fde68a;background:rgba(253,230,138,.18)}
.tr-tabs button.it{border-color:rgba(244,114,182,.6);background:rgba(236,72,153,.18)}
.tr-sel{display:flex;gap:5px;flex-wrap:wrap}
.tr-sel select,.tr-in{padding:7px 8px;border-radius:10px;border:2px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);color:#fff;font:800 13.5px var(--round);min-width:0}
.tr-sel select#tr-kind{flex:1 1 100%}
.tr-in{width:100%;box-sizing:border-box;font:900 20px var(--round);letter-spacing:6px;text-align:center}
.tr-pv{font:800 13px var(--round);color:#fde68a;text-align:center;min-height:17px}
.tr-yn{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tr-yn button,.tr-nums button{padding:10px 4px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 16px var(--round);cursor:pointer}
.tr-yn button.sel,.tr-nums button.sel{border-color:#fde68a;background:rgba(253,230,138,.2)}
.tr-nums{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.tr-nums button{padding:7px 0;font-size:15px}
.tr-row{display:flex;gap:6px}
.tr-row button.sub{flex:none;padding:0 12px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 13px var(--round);cursor:pointer}
.tr-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.tr-tut .tr-log{width:100%;box-sizing:border-box;min-height:0}
@media (max-height:780px){.tr-cb .dg b{width:22px;height:27px;font-size:17px}.tr-acts{gap:4px}.tr-yn button{padding:8px 4px}.tr-info{font-size:11.5px}}
.tr-it span em{font-style:normal}
@media (max-height:690px){.tr-it span em{display:none}.tr-it{gap:3px;font-size:11px}.tr-it span{padding:1px 6px}.tr-info.hint{display:none}.tr-cb .lb{display:none}.tr-cb .kn{min-height:0}.tr-bg{display:none}.tr-ev{font-size:11.5px;padding:3px 7px}.tr-sel select{padding:5px 6px;font-size:12.5px}.tr-tabs button{padding:5px 3px;font-size:12px}.tr-in{font-size:18px;padding:5px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const KINDS = [
    { id: "digit", label: "n번째 숫자는 무엇?", ps: ["i"] }, { id: "par", label: "n번째 숫자가 짝수?", ps: ["i"] }, { id: "gt", label: "n번째 숫자가 d보다 큰가?", ps: ["i", "d"] },
    { id: "has", label: "숫자 d가 들어 있나?", ps: ["d"] }, { id: "cnt", label: "숫자 d가 몇 번 나오나?", ps: ["d"] }, { id: "sum", label: "네 숫자의 합은?", ps: [] },
    { id: "sumge", label: "합이 t 이상인가?", ps: ["t"] }, { id: "pair", label: "두 자리 숫자의 합은?", ps: ["i", "j"] }, { id: "cmp", label: "한 자리가 다른 자리보다 큰가?", ps: ["i", "j"] },
    { id: "eq", label: "두 자리가 같은가?", ps: ["i", "j"] }, { id: "max", label: "가장 큰 숫자는?", ps: [] }, { id: "min", label: "가장 작은 숫자는?", ps: [] },
    { id: "dist", label: "서로 다른 숫자는 몇 가지?", ps: [] }, { id: "ev", label: "짝수는 몇 개?", ps: [] },
  ];
  const PLBL = { i: "자리", j: "자리", d: "숫자", t: "합" };
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.hist.length}|${V.phase}|${V.turn}|${V.acts}`;
    if (!RS || RS.key !== key) {
      const keep = RS && RS.g === ctx.g ? RS : null;
      RS = { key, g: ctx.g, tab: keep && V.phase === "ask" ? keep.tab : "ask", kind: keep ? keep.kind : "has", p: keep ? Object.assign({}, keep.p) : { i: 0, j: 1, d: 5, t: 18 }, guess: "", code: keep ? keep.code : "", ans: null };
    }
    return RS;
  };
  function qOf(S) {
    const q = { k: S.kind }, ps = KINDS.find(k => k.id === S.kind).ps;
    for (const p of ps) q[p] = S.p[p];
    if (S.kind === "gt" && q.d > 8) q.d = 8;
    if ((S.kind === "pair" || S.kind === "eq") && q.i >= q.j) { const a = Math.min(q.i, q.j), b = Math.max(q.i, q.j); q.i = a; q.j = a === b ? Math.min(3, a + 1) : b; if (q.i === q.j) { q.i = 2; q.j = 3; } }
    if (S.kind === "cmp" && q.i === q.j) q.j = (q.i + 1) % 4;
    return q;
  }
  const digits = (code, mask) => `<div class="dg">${(code || "????").split("").map(c => `<b>${mask ? "?" : esc(c)}</b>`).join("")}</div>`;
  function codesHtml(V, ctx, me, watch) {
    const opp = watch ? 1 : 1 - me, mineCode = watch ? (V.codes && V.codes[0]) : V.myCode, oppCode = V.codes ? V.codes[opp] : null;
    const kn = i => (V.known[i].length ? `없는 숫자: ${V.known[i].join(" · ")}` : "");
    const first = watch ? 0 : me;
    return `<div class="tr-codes"><div class="tr-cb me"><div class="lb">${watch ? esc(nameOf(ctx, 0)) : "🔒 내 패스워드"}</div>${digits(mineCode, !mineCode)}<div class="kn">${kn(first) ? "상대가 아는 것 · " + kn(first) : "&nbsp;"}</div></div><div class="tr-cb"><div class="lb">${watch ? esc(nameOf(ctx, 1)) : "상대 패스워드"}</div>${digits(oppCode, !oppCode)}<div class="kn">${kn(opp) ? "공개됨 · " + kn(opp) : "&nbsp;"}</div></div></div>`;
  }
  function itemsHtml(V, ctx, me, watch) {
    if (V.ver === "b" || V.phase === "code") return "";
    const chips = i => {
      const out = [];
      if (V.items.first === i) out.push(`<span title="선 플레이어">🚩<em> 선 플레이어</em></span>`);
      if (V.items.ex[i]) out.push(`<span class="${V.items.usedEx[i] ? "u" : ""}" title="진실 페널티 면제">🛡<em> 페널티 면제</em></span>`);
      if (V.items.dbl[i]) out.push(`<span class="${V.items.usedDbl[i] ? "u" : ""}" title="더블 턴">⚡<em> 더블 턴</em></span>`);
      if (V.items.nul[i]) out.push(`<span class="${V.items.usedNul[i] ? "u" : ""}" title="아이템 무효화">🚫<em> 아이템 무효화</em></span>`);
      return out.join("");
    };
    const a = watch ? 0 : me, b = 1 - a;
    return `<div class="tr-it"><span class="me">${watch ? esc(nameOf(ctx, a)) : "나"}</span>${chips(a)}<span class="nm">${esc(nameOf(ctx, b))}</span>${chips(b)}</div>`;
  }
  function logHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = V.hist.map(e => {
      if (e.g !== undefined) return `<div class="tr-ev ${e.by === me ? "m" : "o"}"><b>${nm(e.by)}</b> 🎯 정답 시도 <b>${esc(e.g)}</b> — ${e.ok ? "정답!" : "틀렸어요"}</div>`;
      const asker = e.by === me && !watch, ans = G.ansText(e.q, e.v);
      let note = "";
      if (asker) note = e.rang ? `사실: ${G.isYN(e.q) ? ans : `${ans}`} (진실이 나왔어요)` : G.isYN(e.q) ? `거짓이니 사실은 "${e.v ? "아니오" : "예"}"` : `사실은 ${ans}가 아니에요`;
      return `<div class="tr-ev ${e.by === me ? "m" : "o"}"><b>${nm(e.by)}</b> ${esc(G.qText(e.q))}<div class="an ${e.rang ? "ring" : ""}">→ ${watch ? nm(1 - e.by) : e.by === me ? esc(nameOf(ctx, 1 - me)) : "나"}의 답: <b>${esc(ans)}</b>${e.rang ? " 🔔 진실! (탐지기가 울렸어요)" : ""}${e.rev !== null && e.rev !== undefined ? ` · 공개: 패스워드에 <b>${e.rev}</b> 없음` : ""}${e.exu ? " · 🛡 면제 사용" : ""}${e.nul ? " · 🚫 무효화" : ""}</div>${note ? `<span class="nt">${note}</span>` : ""}</div>`;
    });
    return `<div class="tr-log" id="tr-log">${rows.length ? rows.join("") : `<div class="tr-ev">아직 질문이 없어요. 질문 하나 → 거짓 답 → 다음 사람 차례예요.</div>`}</div>`;
  }
  function selHtml(S) {
    const k = KINDS.find(x => x.id === S.kind), q = qOf(S);
    const opts = ps => (ps === "i" || ps === "j" ? [0, 1, 2, 3].map(x => [x, `${x + 1}번째`]) : ps === "d" ? [...Array(S.kind === "gt" ? 9 : 10).keys()].map(x => [x, `숫자 ${x}`]) : [...Array(36).keys()].map(x => [x + 1, `${x + 1}`]));
    const pre = G.qValid(q) ? G.qText(q) : "질문을 다시 골라요";
    return `<div class="tr-sel"><select id="tr-kind">${KINDS.map(x => `<option value="${x.id}" ${x.id === S.kind ? "selected" : ""}>${x.label}</option>`).join("")}</select>${k.ps.map((p, n) => `<select data-p="${p}" title="${PLBL[p]}">${opts(p).map(([v, l]) => `<option value="${v}" ${(q[p] ?? S.p[p]) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`).join("")}</div><div class="tr-pv">${esc(pre)}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const top = V.phase === "code" ? "패스워드 정하기" : V.over ? "끝" : V.turn === me && !watch ? (V.phase === "ask" ? "내 차례 · 질문 / 정답" : V.phase === "answer" ? "상대가 답하는 중" : "내 차례") : V.phase === "answer" ? "내가 거짓으로 답할 차례" : `${esc(nameOf(ctx, V.turn))} 차례`;
    let h = `<div class="tr-top"><span class="tr-rd">🔔 ${top}</span><span class="tr-bg">행동 ${V.count} / ${V.limit}${V.doubled ? " · ⚡ 더블 턴 중" : ""}</span></div>`;
    h += codesHtml(V, ctx, me, watch) + itemsHtml(V, ctx, me, watch);
    if (V.phase !== "code") h += logHtml(V, ctx, me, watch);
    let acts = "";
    if (V.phase === "code") {
      if (watch) h += `<div class="tr-info">둘 다 4자리 패스워드를 정하는 중이에요…</div>`;
      else if (V.done[me]) h += `<div class="tr-info">✅ 정했어요 — 상대를 기다려요…</div>`;
      else if (mine) {
        h += `<div class="tr-info">🔒 <b>0~9 숫자 4개</b>를 비밀로 정해요 (같은 숫자 반복 가능). 상대가 질문으로 알아내려 해요!</div>`;
        const ok = /^[0-9]{4}$/.test(S.code);
        acts = `<div class="tr-acts"><div class="tr-row"><input id="tr-c" class="tr-in" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000" value="${esc(S.code)}"><button class="sub" data-rand="1">🎲 무작위</button></div><button class="btn big primary" id="tr-ok" data-a="code" ${ok ? "" : "disabled"}>이 패스워드로 정하기</button></div>`;
      }
    } else if (V.phase === "ask") {
      if (watch || !mine) h += `<div class="tr-info">${watch ? "구경 중" : `<b>${esc(nameOf(ctx, V.turn))}</b>가 질문이나 정답을 고르는 중이에요…`}</div>`;
      else {
        const canDbl = V.ver === "a" && V.items.dbl[me] && !V.items.usedDbl[me] && !V.doubled && V.acts === 1;
        h += `<div class="tr-info ${V.doubled ? "" : "hint"}">${V.doubled ? `⚡ 더블 턴 — 이번 턴에 <b>${V.acts}번</b> 더 할 수 있어요` : "질문하거나 정답을 말해요. <b>답은 늘 거짓말</b>이에요 — 답의 반대가 사실!"}</div>`;
        acts = `<div class="tr-acts"><div class="tr-tabs"><button data-tab="ask" class="${S.tab === "ask" ? "sel" : ""}">💬 질문하기</button><button data-tab="guess" class="${S.tab === "guess" ? "sel" : ""}">🎯 정답 시도</button>${canDbl ? `<button class="it" data-item="double">⚡ 더블 턴</button>` : ""}</div>`;
        if (S.tab === "ask") acts += `${selHtml(S)}<button class="btn big primary" data-a="ask">이 질문 하기</button>`;
        else acts += `<input id="tr-g" class="tr-in" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="상대 패스워드 4자리" value="${esc(S.guess)}"><button class="btn big primary" id="tr-gok" data-a="guess" ${/^[0-9]{4}$/.test(S.guess) ? "" : "disabled"}>정답 시도 (틀리면 턴이 넘어가요)</button>`;
        acts += `</div>`;
      }
    } else if (V.phase === "answer") {
      const q = V.pend, ansBy = 1 - V.pendBy;
      h += `<div class="tr-info"><b>${V.pendBy === me && !watch ? "내 질문" : esc(nameOf(ctx, V.pendBy)) + "의 질문"}</b>: ${esc(G.qText(q))}</div>`;
      if (watch) h += `<div class="tr-info">${esc(nameOf(ctx, ansBy))}가 거짓으로 답하는 중…</div>`;
      else if (!mine) h += `<div class="tr-info">상대가 거짓으로 답하는 중이에요…</div>`;
      else if (G.isYN(q)) acts = `<div class="tr-acts"><div class="tr-info"><span class="warn">⚠️ 반드시 거짓으로 답해요!</span> 사실과 같은 답을 하면 탐지기가 울리고 쓰이지 않은 숫자 하나가 공개돼요.</div><div class="tr-yn"><button data-v="1" class="${S.ans === true ? "sel" : ""}">예</button><button data-v="0" class="${S.ans === false ? "sel" : ""}">아니오</button></div><button class="btn big primary" data-a="answer" ${S.ans === null ? "disabled" : ""}>${S.ans === null ? "예 / 아니오를 골라요" : `"${S.ans ? "예" : "아니오"}"라고 답하기`}</button></div>`;
      else {
        const [lo, hi] = G.DOM[q.k], small = hi - lo < 10;
        acts = `<div class="tr-acts"><div class="tr-info"><span class="warn">⚠️ 반드시 거짓으로 답해요!</span> 사실과 같은 값을 말하면 탐지기가 울려요. (${lo} ~ ${hi} 중에서)</div>${small ? `<div class="tr-nums">${[...Array(hi - lo + 1).keys()].map(x => `<button data-v="${x + lo}" class="${S.ans === x + lo ? "sel" : ""}">${x + lo}</button>`).join("")}</div>` : `<div class="tr-row"><input id="tr-n" class="tr-in" type="number" inputmode="numeric" min="${lo}" max="${hi}" placeholder="${lo}~${hi}" value="${S.ans ?? ""}" style="letter-spacing:0"></div>`}<button class="btn big primary" id="tr-aok" data-a="answer" ${S.ans === null || S.ans < lo || S.ans > hi ? "disabled" : ""}>${S.ans === null ? "값을 골라요" : `${S.ans}라고 답하기`}</button></div>`;
      }
    } else if (V.phase === "nul") {
      const np = V.nulPend;
      h += `<div class="tr-info">${np.user === me && !watch ? "내가" : esc(nameOf(ctx, np.user)) + "가"} <b>${np.item === "double" ? "⚡ 더블 턴" : "🛡 진실 페널티 면제"}</b>를 쓰려고 해요.</div>`;
      if (mine) acts = `<div class="tr-acts"><div class="tr-info">🚫 <b>아이템 무효화</b>로 막을까요? (한 번뿐)</div><div class="tr-yn"><button data-nu="1">무효화 쓰기</button><button data-nu="0">그냥 두기</button></div></div>`;
      else h += `<div class="tr-info">상대가 무효화를 쓸지 정하는 중이에요…</div>`;
    } else {
      h += `<div class="tr-info">${V.over ? (V.draw ? "행동이 너무 많아 무승부예요" : `${V.winner === me && !watch ? "🎉 내가" : esc(nameOf(ctx, V.winner)) + "가"} 패스워드를 맞혔어요!`) : ""}</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    const lg = stage.querySelector("#tr-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    const inpC = stage.querySelector("#tr-c"), inpG = stage.querySelector("#tr-g"), inpN = stage.querySelector("#tr-n");
    if (inpC) inpC.oninput = () => { S.code = inpC.value.replace(/[^0-9]/g, "").slice(0, 4); inpC.value = S.code; const b = stage.querySelector("#tr-ok"); if (b) b.disabled = !/^[0-9]{4}$/.test(S.code); };
    if (inpG) inpG.oninput = () => { S.guess = inpG.value.replace(/[^0-9]/g, "").slice(0, 4); inpG.value = S.guess; const b = stage.querySelector("#tr-gok"); if (b) b.disabled = !/^[0-9]{4}$/.test(S.guess); };
    if (inpN) inpN.oninput = () => { const v = parseInt(inpN.value, 10); S.ans = Number.isFinite(v) ? v : null; const [lo, hi] = G.DOM[V.pend.k], b = stage.querySelector("#tr-aok"); if (b) { b.disabled = S.ans === null || S.ans < lo || S.ans > hi; b.textContent = S.ans === null ? "값을 골라요" : `${S.ans}라고 답하기`; } };
    stage.onchange = e => {
      const t = e.target; if (!t) return;
      if (t.id === "tr-kind") { S.kind = t.value; ctx.sfx("tap"); render(stage, V, ctx); }
      else if (t.dataset && t.dataset.p) { S.p[t.dataset.p] = +t.value; ctx.sfx("tap"); render(stage, V, ctx); }
    };
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.tab) { S.tab = t.dataset.tab; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.rand) { S.code = String(Math.floor(Math.random() * 10000)).padStart(4, "0"); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.v !== undefined) { S.ans = G.isYN(V.pend) ? t.dataset.v === "1" : +t.dataset.v; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.nu !== undefined) { ctx.sfx("pop"); ctx.act({ t: "nullify", use: t.dataset.nu === "1" }); return; }
      if (t.dataset.item === "double") { ctx.sfx("pop"); ctx.act({ t: "item", item: "double" }); return; }
      if (t.dataset.a === "code") { ctx.sfx("pop"); ctx.act({ t: "code", code: S.code }); return; }
      if (t.dataset.a === "ask") { const q = qOf(S); if (G.qValid(q)) { ctx.sfx("pop"); ctx.act({ t: "ask", q }); } return; }
      if (t.dataset.a === "guess") { ctx.sfx("pop"); ctx.act({ t: "guess", code: S.guess }); return; }
      if (t.dataset.a === "answer" && S.ans !== null) { ctx.sfx("pop"); ctx.act({ t: "answer", v: S.ans }); }
    };
  }
  function result(V) {
    const asks = V.hist.filter(e => e.q).length, rings = V.hist.filter(e => e.rang).length;
    return V.draw ? `행동이 너무 많아 무승부 · 질문 ${asks}번` : `질문 ${asks}번 · 탐지기가 울린 횟수 ${rings}번 · ${V.codes ? `패스워드 ${V.codes[0]} / ${V.codes[1]}` : ""}`;
  }
  // ── 🎞️ 복기 고리 ──
  // 행동 한 줄 글. V = 그 수를 두기 전 그 자리 view (없어도 됨)
  function actText(a, V) {
    if (!a || typeof a !== "object") return "—";
    const me = V && Number.isInteger(V.seat) && V.seat >= 0 ? V.seat : -1, shown = x => (typeof x === "boolean" ? (x ? "예" : "아니오") : String(x));
    if (a.t === "code") return typeof a.code === "string" && /^[0-9]{4}$/.test(a.code) ? `비밀 패스워드 ${a.code} 정하기` : "비밀 패스워드 정하기";
    if (a.t === "ask") return G.qValid(a.q) ? `질문 · ${G.qText(a.q)}` : "질문";
    if (a.t === "guess") {
      const g = typeof a.code === "string" ? a.code : "????";
      if (me >= 0 && V.hist && typeof a.code === "string") {
        try { const C = G.candidates(V, me); return `정답 시도 ${g} (후보 ${C.length.toLocaleString("ko-KR")}개 중 ${C.some(c => c.join("") === g) ? "하나" : "이미 후보에서 빠진 숫자"})`; } catch (e) { /* 아래로 */ }
      }
      return `정답 시도 ${g}`;
    }
    if (a.t === "answer") {
      if (me >= 0 && V.pend && V.myCode) {
        try { const q = V.pend, truth = G.evalQ(q, G.parse(V.myCode)); return `"${G.ansText(q, a.v)}"라고 답함${truth === a.v ? " (진실 — 탐지기가 울려요)" : " (거짓 ✅)"}`; } catch (e) { /* 아래로 */ }
      }
      return `"${shown(a.v)}"라고 답함`;
    }
    if (a.t === "item") return a.item === "double" ? "⚡ 더블 턴 쓰기" : "아이템 쓰기";
    if (a.t === "nullify") return a.use ? "🚫 아이템 무효화 쓰기" : "무효화 안 쓰고 그냥 두기";
    return "—";
  }
  // 내 수(myA)와 고급 AI 수(bestA) 뒤의 '대략 이길 확률' 을 같은 경주 계산(G.evalActs)으로 재요. 비교 못 하면 null
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || typeof myA !== "object" || typeof bestA !== "object" || myA.t === "code") return null;
    if (JSON.stringify(myA) === JSON.stringify(bestA)) return null;
    let ev = null; try { ev = G.evalActs(V, seat, [myA, bestA]); } catch (e) { ev = null; }
    const em = ev && ev[0], eb = ev && ev[1];
    if (!em || !eb || !isFinite(em.p) || !isFinite(eb.p)) return null;
    const pc = x => Math.round(x * 100) + "%", n0 = x => Math.round(x).toLocaleString("ko-KR");
    const loss = Math.max(0, eb.p - em.p);
    let cap = 100; if (em.item || eb.item) cap = 30; if (V.phase === "nul") cap = 45; if (info && info.same) cap = Math.min(cap, 50);   // 아이템은 나중에 써도 되니 큰 손해로 안 셈
    const sev = Math.min(cap, Math.round(100 * loss / 0.5));
    const my = actText(myA, V), best = actText(bestA, V), cmp = `이길 확률 약 ${pc(eb.p)}(고급 AI 수) → 내 수 ${pc(em.p)}`;
    let why;
    if (V.phase === "answer") why = `상대가 내 패스워드를 좁힌 후보: 내 답 뒤 약 ${n0(em.Ma)}개 (${em.rang ? "진실이라 숫자도 하나 공개돼요" : "거짓"}) / 고급 AI 답 뒤 약 ${n0(eb.Ma)}개 (${eb.rang ? "진실" : "거짓"}) — ${cmp}`;
    else if (V.phase === "nul") why = `내 후보 ${n0(em.N)}개 · 상대 후보 ${n0(em.M)}개 — ${cmp}${em.Nn !== undefined ? ` (무효화로 상대 숫자 하나가 공개되면 내 후보가 약 ${n0(Math.max(1, em.N * 0.656))}개로 줄어요)` : ""} · 무효화는 한 번뿐이라 아껴 두는 것도 선택이에요`;
    else {
      const q2 = em.R !== undefined && eb.R !== undefined ? ` · 질문 뒤 남을 후보 기대 ${n0(em.R)}개 vs 고급 AI 수 ${n0(eb.R)}개` : "";
      const g1 = em.pw !== undefined ? ` · 내 정답 시도가 맞을 확률 ${pc(em.pw)}${em.inC ? "" : " (이미 아닌 숫자예요)"}` : "";
      why = `내 후보 ${n0(em.N)}개 · 상대가 내 패스워드를 좁힌 후보 ${n0(em.M)}개 — ${cmp}${q2}${g1}${em.item || eb.item ? " · 더블 턴은 나중에 써도 돼서 큰 손해로 안 세요" : ""} (후보를 절반씩 줄이는 경주로 어림한 값)`;
    }
    return { sev, why, my, best };
  }
  function tutorial() {
    style();
    const ev = (cls, who, q, ans, extra) => `<div class="tr-ev ${cls}"><b>${who}</b> ${q}<div class="an ${extra ? "ring" : ""}">→ 답: <b>${ans}</b>${extra || ""}</div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "상대의 4자리 패스워드를 먼저 맞혀요", body: "각자 <b>0~9 숫자 4개</b>를 비밀로 정해요 (같은 숫자를 반복해도 돼요). 번갈아 질문해서 상대 패스워드를 <b>순서까지 정확히</b> 먼저 맞히면 이겨요.",
        boardHtml: `<div class="tr-tut"><div class="tr-codes" style="width:100%"><div class="tr-cb me"><div class="lb">🔒 내 패스워드</div>${digits("1928", false)}</div><div class="tr-cb"><div class="lb">상대 패스워드</div>${digits("????", true)}</div></div></div>`, ms: 6000 },
      { tag: "STEP 2 · 질문", title: "질문은 한 턴에 하나 — 답은 늘 거짓말!", body: "내 턴에 상대 패스워드에 대해 질문 <b>하나</b>를 해요 (짝수인가요? 합은 얼마? 어떤 숫자가 들어 있나요?). 답하는 쪽은 <b>반드시 거짓으로</b> 답해요. 그러니 <b>답의 반대가 사실</b>이에요!",
        boardHtml: `<div class="tr-tut"><div class="tr-log">${ev("m", "나", "2번째 숫자가 짝수인가요?", "예", "")}<span class="tr-info" style="padding:0 6px">거짓이니 사실은 <b>아니오</b> — 2번째 숫자는 홀수!</span></div></div>`, ms: 7000 },
      { tag: "STEP 3 · 탐지기", title: "진실을 말하면 탐지기가 울려요", body: "실수로 <b>사실과 같은 답</b>을 하면 🔔 탐지기가 울리고, <b>진실 페널티</b>로 내 패스워드에 쓰이지 않은 숫자 하나가 상대에게 공개돼요. 정답 시도는 한 턴을 쓰고, 틀리면 턴만 넘어가요.",
        boardHtml: `<div class="tr-tut"><div class="tr-log">${ev("o", "상대", "가장 큰 숫자는 무엇인가요?", "9", " 🔔 진실! · 공개: 패스워드에 <b>3</b> 없음")}</div></div>`, ms: 6600 },
      { tag: "STEP 4 · 아이템", title: "아이템 4가지 (결승판)", body: "<b>🚩 선 플레이어</b>: 먼저 시작 · <b>🛡 진실 페널티 면제</b>: 진실을 말해도 숫자 공개 없음 · <b>⚡ 더블 턴</b>: 한 턴에 질문 2개 (또는 질문 + 정답 시도) · <b>🚫 아이템 무효화</b>: 상대 아이템 하나를 막기. 모두 한 번뿐이고, 방송처럼 한 사람은 선 + 면제, 다른 사람은 더블 + 무효화를 가져요.",
        boardHtml: `<div class="tr-tut"><div class="tr-it"><span class="me">나</span><span>🚩 선 플레이어</span><span>🛡 페널티 면제</span></div><div class="tr-it"><span>상대</span><span>⚡ 더블 턴</span><span>🚫 아이템 무효화</span></div></div>`, ms: 7000 },
      { tag: "STEP 5 · 직접", title: "거짓 답을 골라 봐요", body: "내 패스워드는 <b>1928</b>이에요. 상대가 <b>\"숫자 9가 들어 있나요?\"</b>라고 물었어요. 탐지기가 울리지 않게 <b>거짓으로</b> 답해 봐요!",
        interactive: { hint: "👆 거짓 답을 눌러요", doneText: "✅ 사실은 '예'(9가 있어요)라서 '아니오'가 거짓 — 탐지기가 울리지 않아요!" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="tr-tut"><div class="tr-codes" style="width:100%"><div class="tr-cb me"><div class="lb">🔒 내 패스워드</div>${digits("1928", false)}</div><div class="tr-cb"><div class="lb">상대 패스워드</div>${digits("????", true)}</div></div><div class="tr-info"><b>숫자 9가 들어 있나요?</b></div><div class="tr-yn" style="width:100%"><button data-w="yes">예</button><button data-w="no">아니오</button></div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (b.dataset.w === "no") { ctrl.sfx("win"); ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-truth"] = {
    name: "진실탐지기", emoji: "🔔", short: "거짓말로 답하는 질문 게임 · 상대 4자리를 먼저 맞혀요", min: 2, max: 2, defN: 2, board: false,
    show: "더 지니어스 · 시즌 2 · 진실탐지기", season: "시즌 2 룰 브레이커",
    opts: [{ k: "ver", label: "판", items: [["a", "12화 결승 (아이템 4종)"], ["b", "아이템 없음"]], def: "a" }],
    diff: "방송은 자유롭게 말로 질문하지만 우리는 정해진 틀(자리 · 합 · 포함 · 크기 비교 등)에서 골라요 · 탐지기는 앱이 판정해요 · 진실 페널티로 공개할 숫자는 쓰이지 않은 숫자 중 무작위 · 면제는 진실을 말하면 자동으로 쓰여요 · 더블 턴은 질문 2개 또는 질문 1개 + 정답 시도 · 행동이 너무 많아 120번을 넘으면 무승부",
    howto: [
      "각자 <b>0~9 숫자 4개</b>를 비밀로 정해요 — 번갈아 질문하고, 상대 패스워드를 <b>순서까지</b> 먼저 맞히면 승리",
      "질문은 한 턴에 하나 — 답하는 쪽은 <b>반드시 거짓으로</b> 답해요 (답의 반대가 사실!)",
      "<b>진실을 말하면 탐지기가 울려요</b> 🔔 → 쓰이지 않은 숫자 하나가 상대에게 공개",
      "정답 시도도 한 턴 (틀리면 턴만 넘어가요) · 아이템: 선 · 페널티 면제 · 더블 턴 · 무효화",
    ],
    sub: V => (V.over ? "끝" : `행동 ${V.count}/${V.limit}`),
    chip: (V, i) => ({ t: V.items && V.items.first === i ? "🚩 선" : "", on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (두 수를 '대략 이길 확률' 로 견줌)
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

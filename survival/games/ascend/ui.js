/* 베니 서바이벌 · 오름차순 — 화면 (시트 · 숫자 부르기 · 칸 고르기 · 라운드 공개 · 1분 규칙) */
(() => {
  "use strict";
  const A = window.SVCores.ascend;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.as-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.as-rd{font:900 14px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:3px 11px;white-space:nowrap}
.as-n{font:800 12.5px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.as-log{flex:1 1 90px;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.as-said{display:flex;gap:4px;align-items:center;flex-wrap:wrap;flex:none;font-size:12px;color:var(--soft)}
.as-said i{font:800 12px var(--round);font-style:normal;color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:0 6px;min-width:18px;text-align:center}
.as-call{display:flex;align-items:center;gap:10px;flex:none;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.08);border-radius:14px;padding:6px 10px}
.as-big{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#e11d48,#9f1239);border:2px solid #fda4af;font:900 25px var(--round);color:#fff}
.as-call small{font-size:12.5px;line-height:1.4;color:#e2e8f0}
.as-who{display:flex;gap:5px;flex-wrap:wrap;flex:none;font-size:12px}
.as-who span{padding:2px 8px;border-radius:99px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12);color:var(--soft);white-space:nowrap}
.as-who span.ok{border-color:#4ade80;color:#bbf7d0;background:rgba(22,163,74,.2)}
.as-me{display:flex;flex-direction:column;gap:5px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:6px 8px;flex:none}
.as-me .hd{display:flex;justify-content:space-between;gap:6px;font:700 12.5px var(--round);color:#86efac}
.as-me .hd span:last-child{color:#fde68a;text-align:right}
.as-sheet{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px}
.as-c{position:relative;display:grid;place-items:center;aspect-ratio:3/4;border-radius:7px;background:#f8fafc;color:#0f172a;font:900 17px/1 var(--round);border:2px solid #64748b;padding:0;min-width:0}
.as-c::before{content:attr(data-i);position:absolute;left:2px;top:1px;font:700 8px/1 var(--round);color:rgba(15,23,42,.45)}
.as-c.e{background:rgba(255,255,255,.07);border:2px dashed rgba(255,255,255,.28);color:#fde68a}
.as-c.e::before{color:rgba(255,255,255,.4)}
.as-c.run{border-color:#eab308;background:#fef9c3;box-shadow:0 2px 0 #eab308}
.as-c.pick{cursor:pointer;border-color:#fde68a;animation:as-pulse 1.4s ease-in-out infinite}
.as-c.sel{background:rgba(245,179,1,.3);border:2px solid #fde68a;transform:translateY(-3px);animation:none}
.as-c i{font-style:normal;font-size:17px;opacity:.9}
@keyframes as-pulse{50%{background:rgba(253,230,138,.18)}}
.as-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.as-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.as-nums{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.as-nums .btn{padding:11px 0;font:900 20px var(--round)}
.as-stack{display:grid;gap:4px;flex:none}
.as-row{display:grid;grid-template-columns:54px 1fr 34px;gap:5px;align-items:center;padding:4px 6px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.as-row.me{border-color:#86efac;background:rgba(34,197,94,.1)}
.as-row.top{border-color:var(--gold)}
.as-row b{font:800 12px var(--round);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.as-row em{font:900 14px var(--round);font-style:normal;color:#4ade80;text-align:right}
.as-row .as-c{font-size:12px;border-width:1.5px;border-radius:5px;aspect-ratio:auto;height:24px}
.as-row .as-c::before{display:none}
.as-row .as-sheet{gap:2px}
.as-hid{grid-column:1/-1;font-size:11.5px;color:var(--soft)}
.as-head{flex:none;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.as-tut{display:grid;gap:8px;justify-items:center;width:100%}
.as-tut .as-sheet{width:100%}
.as-tut small{font-size:12px;color:var(--soft);text-align:center}
.as-tut .as-big{width:50px;height:50px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [], SEL = { key: "", c: -1 };

  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  // 받침에 따라 이/가 (내 이름은 '내가')
  const ga = (name, isMe) => {
    if (isMe) return "내가";
    const ch = String(name).slice(-1), c = ch.charCodeAt(0);
    return `${name}${(c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch)) ? "이" : "가"}`;
  };
  const rangeTxt = r => (r.len > 1 ? `${r.from + 1}~${r.from + r.len}번째 칸` : r.len ? `${r.from + 1}번째 칸` : "");
  // 빈칸을 '무엇이든 들어갈 수 있는 칸'으로 보았을 때 이어 볼 수 있는 가장 긴 구간 (위쪽 한계)
  function potential(sh) {
    let best = 0;
    for (let a = 0; a < sh.length; a++) {
      let last = 0, b = a;
      for (; b < sh.length; b++) { const x = sh[b]; if (x != null) { if (x < last) break; last = x; } }
      best = Math.max(best, b - a);
    }
    return best;
  }
  function cells(sh, o = {}) {
    const run = o.run && o.run.len > 1 ? o.run : null;
    return sh.map((v, c) => {
      const cls = `as-c${v == null ? " e" : ""}${run && c >= run.from && c < run.from + run.len ? " run" : ""}${o.sel === c ? " sel" : ""}`;
      const inner = v != null ? v : o.sel === c && o.ghost ? `<i>${o.ghost}</i>` : "";
      return o.pick && v == null
        ? `<button type="button" class="${cls} pick" data-c="${c}" data-i="${c + 1}" aria-label="${c + 1}번째 빈칸">${inner}</button>`
        : `<span class="${cls}" data-i="${c + 1}">${inner}</span>`;
    }).join("");
  }
  const sheetHtml = (sh, o) => `<div class="as-sheet">${cells(sh, o)}</div>`;
  function callerOf(V) { for (let k = V.log.length - 1; k >= 0; k--) if (V.log[k].k === "say") return V.log[k].s; return -1; }
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    if (e.k === "say") return `${esc(ga(nameOf(ctx, e.s), e.s === ctx.me))} ${e.v} 을(를) 불렀어요`;
    if (e.k === "put") return `${esc(ga(nameOf(ctx, e.s), e.s === ctx.me))} 적었어요`;
    if (e.k === "round") return `${e.r}번째 라운드 시작`;
    if (e.k === "end") return `${e.r}번째 라운드 끝`;
    return "";
  }
  // 모두의 시트를 한 줄씩 (라운드가 끝났거나 구경할 때)
  function stackHtml(V, ctx, sheets) {
    const runs = sheets.map(sh => (sh ? A.runOf(sh) : { len: 0, from: 0 }));
    const best = Math.max(...runs.map(r => r.len));
    return `<div class="as-stack">${sheets.map((sh, i) => `<div class="as-row${i === ctx.me ? " me" : ""}${sh && runs[i].len === best ? " top" : ""}"><b>${esc(nameOf(ctx, i))}</b>${sh ? sheetHtml(sh, { run: runs[i] }) : `<span class="as-hid">🔒 라운드가 끝나면 보여요</span>`}<em>${sh ? runs[i].len : ""}</em></div>`).join("")}</div>`;
  }

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, mine = V.sheet, allSeen = V.sheets.every(Boolean);
    const key = `${ctx.g}|${V.round}|${V.said.length}|${V.phase}`;
    if (SEL.key !== key) SEL = { key, c: -1 };
    let h = `<div class="as-top"><span class="as-rd">${V.round}/${V.R}판</span><span class="as-n">${V.over ? "끝" : `소리친 숫자 ${V.said.length}/${A.DECL}`}</span><span class="as-log">${logText(V, ctx)}</span></div>`;
    const showAll = V.phase === "show" || V.over || (me < 0 && allSeen);
    if (V.phase === "show" || V.over) {
      const R = V.res;
      h += `<div class="as-head">${V.over ? "🏁 마지막 라운드 결과" : `📋 ${R ? R.r : V.round}번째 라운드 결과`} · 이어진 칸 수 = 점수</div>${stackHtml(V, ctx, V.sheets)}`;
      h += `<div class="as-acts"><div class="note">${V.over ? "아래 결과 창에서 순위를 볼 수 있어요" : "곧 다음 라운드가 시작돼요…"}</div></div>`;
      stage.innerHTML = h; stage.onclick = null; return;
    }
    h += `<div class="as-said">불린 숫자 ${V.said.length ? V.said.map(n => `<i>${n}</i>`).join("") : "아직 없어요"}</div>`;
    if (V.phase === "put") {
      const cs = callerOf(V);
      h += `<div class="as-call"><span class="as-big">${V.cur}</span><small><b>${esc(ga(nameOf(ctx, cs), cs === me))}</b> 부른 숫자예요 · 모두 지금 자기 시트 빈칸에 적어요</small></div>`;
      h += `<div class="as-who">${V.done.map((d, i) => (i === me ? "" : `<span class="${d ? "ok" : ""}">${d ? "✓" : "…"} ${esc(nameOf(ctx, i))}</span>`)).join("")}</div>`;
    } else if (V.phase === "say") {
      h += `<div class="as-call"><span class="as-big">?</span><small><b>${esc(ga(nameOf(ctx, V.turn), V.turn === me))}</b> 숫자를 부를 차례예요 · 부른 숫자는 모두의 시트에 똑같이 들어가요</small></div>`;
    }
    let acts = "";
    if (showAll) h += stackHtml(V, ctx, V.sheets);
    else if (mine) {
      const run = A.runOf(mine), empties = mine.filter(x => x == null).length, pot = potential(mine);
      const pick = V.phase === "put" && ctx.canAct;
      h += `<div class="as-me"><div class="hd"><span>내 시트</span><span>이어진 ${run.len}칸${run.len > 1 ? ` (${rangeTxt(run)})` : ""} · 최대 ${pot}칸 가능 · 빈칸 ${empties}</span></div>${sheetHtml(mine, { run, pick, sel: SEL.c, ghost: V.cur })}</div>`;
      if (V.phase === "say" && ctx.canAct) acts = `<div class="note">내 시트에 가장 잘 맞는 숫자를 불러요</div><div class="as-nums">${Array.from({ length: 10 }, (_, k) => `<button class="btn" data-a="say" data-v="${k + 1}">${k + 1}</button>`).join("")}</div>`;
      else if (pick) acts = `<div class="note">${SEL.c >= 0 ? `${SEL.c + 1}번째 칸에 ${V.cur} 을(를) 적을까요?` : `${V.cur} 을(를) 적을 빈칸을 눌러요`}</div><button class="btn primary big" data-a="put" ${SEL.c >= 0 ? "" : "disabled"}>✔ 여기에 적기</button>`;
      else if (V.phase === "put") acts = `<div class="note">다른 사람이 적는 중… (${V.done.filter(Boolean).length}/${V.n})</div>`;
      else acts = `<div class="note">${esc(ga(nameOf(ctx, V.turn), V.turn === me))} 숫자를 고르는 중…</div>`;
    } else acts = `<div class="note">구경 중이에요 · 시트는 라운드가 끝나면 보여요</div>`;
    h += `<div class="as-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const pc = e.target.closest("[data-c]");
      if (pc) { const c = +pc.dataset.c; ctx.sfx("tap"); SEL.c = SEL.c === c ? -1 : c; render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      ctx.sfx("pop");
      if (b.dataset.a === "say") ctx.act({ t: "say", v: +b.dataset.v });
      else if (b.dataset.a === "put" && SEL.c >= 0) ctx.act({ t: "put", c: SEL.c });
    };
  }

  // ── 결과 창 한 줄 더 ──
  function result(V, me) {
    const nm = i => esc(String(NAMES[i] || `${i + 1}번`).slice(0, 4));
    const head = `<tr><th></th>${V.totals.map((_, i) => `<th${i === me ? ' style="color:#86efac"' : ""}>${nm(i)}</th>`).join("")}</tr>`;
    const rows = V.hist.map(x => `<tr><td>${x.r}판</td>${x.runs.map((n, i) => `<td${n === Math.max(...x.runs) ? ' style="color:#fde68a;font-weight:800"' : ""}>${n}칸</td>`).join("")}</tr>`).join("");
    const sum = `<tr><td><b>합</b></td>${V.totals.map(t => `<td><b>${t}</b></td>`).join("")}</tr>`;
    const last = V.hist[V.hist.length - 1];
    const mineLast = last && me >= 0 && last.sheets[me] ? `<div style="margin-top:6px">내 마지막 시트: ${last.sheets[me].join(" · ")} → <b>${last.runs[me]}칸</b> (${rangeTxt({ len: last.runs[me], from: last.froms[me] })})</div>` : "";
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead>${head}</thead><tbody>${rows}${sum}</tbody></table>${mineLast}`;
  }

  // ── AI 선생님 (보이는 것만 읽음) ──
  const seeded = (a0) => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const f1 = x => (Math.round(x * 10) / 10).toString();
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    if (V.over) return { opp: "판이 끝났어요.", mine: `누적 ${V.totals[me]}점 · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    const sh = V.sheet;
    if (!sh) return { opp: "구경 중이에요.", mine: "자리에 앉으면 내 시트를 읽어 드려요.", rec: "상대가 부르는 숫자 흐름을 봐 두세요.", why: "" };
    // 👀 상대 흐름: 내 지난 차례 뒤로 불린 숫자 · 지난 라운드 점수
    const calls = V.log.filter(e => e.i > since && e.k === "say" && e.s !== me);
    const said = V.said, big = said.filter(x => x >= 7).length, small = said.filter(x => x <= 4).length;
    let opp = calls.length ? calls.slice(-3).map(e => `${ga(nm(e.s), false)} ${e.v}`).join(" · ") + " 을(를) 불렀어요 — " : "";
    opp += said.length ? `이번 라운드 불린 숫자 ${said.join("·")}${big - small >= 2 ? " (큰 수가 많아 뒤쪽 칸이 먼저 차는 흐름)" : small - big >= 2 ? " (작은 수가 많아 앞쪽 칸이 먼저 차는 흐름)" : ""}. ` : "아직 불린 숫자가 없어요. ";
    opp += "상대 시트는 라운드가 끝나야 보여요";
    const lastH = V.hist[V.hist.length - 1];
    if (lastH) opp += ` · 지난 라운드 이어진 칸: ${lastH.runs.map((n, i) => `${i === me ? "나" : nm(i)} ${n}`).join(" · ")}`;
    // 📊 내 흐름
    const run = A.runOf(sh), empties = sh.filter(x => x == null).length, pot = potential(sh);
    const mine = `시트 ${10 - empties}/10칸 · 가장 긴 구간 ${run.len}칸${run.len > 1 ? ` (${rangeTxt(run)})` : ""} · 빈칸을 잘 채우면 최대 ${pot}칸까지 · 누적 ${V.totals[me]}점`;
    const r = seeded(V.round * 131 + V.said.length * 17 + me * 7 + sh.reduce((a, x) => a + (x || 0), 0));
    let rec = "상대 차례를 기다려요", why = "";
    if (V.phase === "put" && V.needs.includes(me)) {
      const L = A.evalPut(sh, V.cur, A.seqs(r, 60, empties), 5), best = L[0];
      let a = best.c - 1; while (a >= 0 && sh[a] == null) a--;
      let b = best.c + 1; while (b < 10 && sh[b] == null) b++;
      rec = `${V.cur} 을(를) ${best.c + 1}번째 칸에`;
      const ln = a >= 0 ? `왼쪽 이웃 ${sh[a]}` : "왼쪽은 시트 끝", rn = b < 10 ? `오른쪽 이웃 ${sh[b]}` : "오른쪽은 시트 끝";
      why = `${ln} · ${rn} 사이에 ${V.cur} 이(가) 들어가면 오름차순이 끊기지 않고 양쪽 빈칸에 쓸 여지도 남아요. 앞으로 숫자가 고르게 불린다고 보면 이어질 칸 수 예상은 약 ${f1(best.ev)}칸${L[1] ? ` (다음으로 좋은 ${L[1].c + 1}번째 칸은 ${f1(L[1].ev)}칸)` : ""}이에요.`;
    } else if (V.phase === "say" && V.needs.includes(me)) {
      const L = A.evalSay(sh, 30, r, 2), best = L[0];
      rec = `${best.v} 을(를) 불러요`;
      why = `모두의 시트에 똑같이 들어가는 숫자예요. ${best.v} 은(는) 내 시트 ${best.c + 1}번째 칸에 잘 맞아 예상 ${f1(best.ev)}칸까지 이어져요 — 내 시트에만 딱 맞는 숫자를 고르는 게 이득이에요.`;
    } else if (V.phase === "put") { rec = "다른 사람이 적는 중이에요"; why = `불린 숫자 ${V.cur} 은(는) 이미 내 시트에 적었어요. 상대는 같은 숫자를 어디에 둘지 고민 중이에요.`; }
    else if (V.phase === "say") { rec = `${ga(nm(V.turn), false)} 숫자를 부를 차례예요`; why = "부르는 사람도 내 시트가 아니라 자기 시트에 맞는 숫자를 고르기 쉬워요."; }
    return { opp, mine, rec, why };
  }

  // ── 🎞️ 복기 고리 ──
  // 내 수와 고급 AI 수를 coach 와 같은 계산(A.evalPut · A.evalSay: 남은 칸에 1~10 이 고르게 온다고 보고 시트를 끝까지 채워 본
  // 이어진 칸 수의 기대)으로, 같은 표본에 대어 견줘요. 그 수를 두기 직전 내 시트(V.sheet)와 불린 숫자만 써요 (남의 시트 · 결과는 안 봄).
  const josa = (n, a, b) => ("013678".includes(String(n).slice(-1)) ? a : b);        // 숫자 뒤 받침 (0 1 3 6 7 8 = 받침 있음)
  const sevOf = gap => (gap < 0.2 ? 0 : Math.min(100, Math.round(gap * 45)));         // 이어질 칸 수 기대 1칸 차이 ≈ 45 (1.35칸이면 📒)
  function nbTxt(sh, c, v) {
    let a = c - 1; while (a >= 0 && sh[a] == null) a--;
    let b = c + 1; while (b < sh.length && sh[b] == null) b++;
    const fit = (a < 0 || sh[a] <= v) && (b >= sh.length || v <= sh[b]);
    return `왼쪽 이웃 ${a >= 0 ? sh[a] : "없음"} · 오른쪽 이웃 ${b < sh.length ? sh[b] : "없음"}${fit ? "" : " → 오름차순이 끊겨요"}`;
  }
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      const sh = V && V.sheet;
      if (!sh || !myA || !bestA || (V.phase !== "put" && V.phase !== "say") || myA.t !== V.phase) return none;
      const empt = sh.filter(x => x == null).length; if (!empt) return none;
      const r = seeded(((info && info.seed | 0) ^ Math.imul(V.round, 131) ^ Math.imul(V.said.length + 1, 17) ^ Math.imul(seat + 3, 7) ^ sh.reduce((s, x) => s + (x || 0) * 31, 0)) >>> 0);
      const S = 120;
      if (V.phase === "put") {
        const v = V.cur, L = A.evalPut(sh, v, A.seqs(r, S, empt), 10);
        const m = L.find(x => x.c === myA.c), b = L.find(x => x.c === bestA.c) || L[0];
        if (!m || !b) return none;
        if (m.c === b.c) return { sev: 0, why: `고급 AI 와 같은 칸이에요 (${m.c + 1}번째 칸 · ${nbTxt(sh, m.c, v)}) — 이어질 칸 예상 ${f1(m.ev)}칸`, my: `${v}${josa(v, "을", "를")} ${m.c + 1}번째 칸에`, best: `${v}${josa(v, "을", "를")} ${b.c + 1}번째 칸에` };
        let sev = sevOf(b.ev - m.ev); if (info && info.same) sev = Math.min(sev, 15);
        return {
          sev, my: `${v}${josa(v, "을", "를")} ${m.c + 1}번째 칸에`, best: `${v}${josa(v, "을", "를")} ${b.c + 1}번째 칸에`,
          why: `${v}${josa(v, "을", "를")} ${m.c + 1}번째 칸(${nbTxt(sh, m.c, v)})에 두면 이어질 칸 예상 ${f1(m.ev)}칸, ${b.c + 1}번째 칸이면 ${f1(b.ev)}칸이에요${b.ev - m.ev >= 0.2 ? ` (${f1(b.ev - m.ev)}칸 차이)` : " (거의 같아요)"}`,
        };
      }
      const L = A.evalSay(sh, S, r, 3), m = L.find(x => x.v === myA.v), b = L.find(x => x.v === bestA.v) || L[0];
      if (!m || !b) return none;
      if (m.v === b.v) return { sev: 0, why: `고급 AI 와 같은 숫자예요 — ${m.v}${josa(m.v, "은", "는")} 내 시트 ${m.c + 1}번째 칸에 맞아 이어질 칸 예상 ${f1(m.ev)}칸`, my: `${m.v} 소리침`, best: `${b.v} 소리침` };
      let sev = sevOf(b.ev - m.ev); if (info && info.same) sev = Math.min(sev, 15);
      return {
        sev, my: `${m.v} 소리침`, best: `${b.v} 소리침`,
        why: `내가 부른 ${m.v}${josa(m.v, "은", "는")} 내 시트 ${m.c + 1}번째 칸에 맞아 이어질 칸 예상 ${f1(m.ev)}칸, 고급 AI 의 ${b.v}${josa(b.v, "은", "는")} ${b.c + 1}번째 칸에 맞아 ${f1(b.ev)}칸이에요${b.ev - m.ev >= 0.2 ? ` (${f1(b.ev - m.ev)}칸 차이)` : " (거의 같아요)"}`,
      };
    } catch (e) { return none; }
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const mini = (sh, run) => `<div class="as-sheet">${cells(sh, { run })}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "숫자를 작은 쪽에서 큰 쪽으로 길게 이어요", body: "10칸 시트에 1~10 숫자를 적어요. 왼쪽에서 오른쪽으로 <b>점점 커지는(같아도 OK) 칸</b>이 가장 길게 이어질수록 높은 점수예요.",
        boardHtml: `<div class="as-tut">${mini([1, 2, 2, 4, 5, 5, 7, 3, 9, 6], { from: 0, len: 7 })}<small>노란 칸 7개가 이어져요 → 이 시트는 7점</small></div>`, ms: 5200 },
      { tag: "STEP 2 · 시작", title: "딜러가 숫자 1개를 먼저 적어 줘요", body: "라운드가 시작되면 딜러가 <b>1~10 중 숫자 하나</b>를 내 시트 아무 칸에 적어 줘요. 이 숫자는 <b>나만</b> 볼 수 있어요.",
        boardHtml: `<div class="as-tut">${mini([null, null, null, null, null, 6, null, null, null, null])}<small>🔒 6 은 딜러가 정한 칸 · 나머지는 내가 채워요</small></div>`, ms: 5000 },
      { tag: "STEP 3 · 진행", title: "한 명씩 숫자를 부르면 모두가 적어요", body: "순번대로 한 사람이 1~10 중 숫자를 불러요 (같은 숫자를 또 불러도 돼요). 모두가 <b>동시에</b> 그 숫자를 자기 시트의 <b>빈칸 하나</b>에 적어요. 아홉 번 부르면 10칸이 다 차요.",
        boardHtml: `<div class="as-tut"><div class="as-call" style="width:100%"><span class="as-big">7</span><small>순번인 사람이 "7!" 을 불렀어요 → 내 빈칸에 7 을 적어요</small></div>${mini([2, null, null, 5, null, 6, null, null, 9, null])}</div>`, ms: 5800 },
      { tag: "STEP 4 · 직접 해 봐요", title: "불린 숫자를 알맞은 칸에 적어요", body: "빈칸 3개에 불린 숫자 <b>2 → 5 → 8</b> 을 차례로 적어서 10칸을 모두 이어 보세요. 앞 칸보다 작거나 뒤 칸보다 크면 끊겨요!",
        interactive: { hint: "👆 반짝이는 빈칸을 눌러 숫자를 적어요", doneText: "✅ 1~10 이 한 줄로 이어졌어요!" },
        render(stage, ctrl) {
          const base = [1, null, 3, 4, null, 6, 7, null, 9, 10], q = [2, 5, 8];
          let sh = base.slice(), k = 0, msg = "";
          const draw = () => {
            const run = A.runOf(sh);
            stage.innerHTML = `<div class="as-tut"><div class="as-call" style="width:100%"><span class="as-big">${k < q.length ? q[k] : "✓"}</span><small>${k < q.length ? `${q[k]} 을(를) 적을 빈칸을 눌러요` : "모두 적었어요!"}</small></div>${`<div class="as-sheet">${cells(sh, { pick: k < q.length, run })}</div>`}<small>${msg}</small></div>`;
            if (k >= q.length && run.len === 10) ctrl.complete();
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || k >= q.length) return;
            const c = +b.dataset.c; sh[c] = q[k]; ctrl.sfx("tap");
            if (sh.filter(x => x != null).some((x, i, a) => i && x < a[i - 1])) { msg = `💥 ${q[k]} 이(가) 거기 들어가면 끊겨요 — 처음부터 다시!`; sh = base.slice(); k = 0; }
            else { msg = ""; k++; }
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "가장 긴 구간이 점수 · 라운드를 모아요", body: "시트가 다 차면 모두의 시트를 공개해요. 가장 길게 이어진 칸 수가 그 라운드 점수예요. <b>2라운드(옵션 3)</b> 점수를 더해 가장 높은 사람이 1등, 같으면 공동 1등!",
        boardHtml: `<div class="as-tut"><div class="as-stack" style="width:100%"><div class="as-row me"><b>나</b>${mini([1, 2, 4, 4, 5, 8, 8, 3, 9, 6], { from: 0, len: 7 })}<em>7</em></div><div class="as-row"><b>상대</b>${mini([4, 6, 2, 3, 5, 5, 9, 1, 7, 8], { from: 2, len: 6 })}<em>6</em></div></div></div>`, ms: 5600 },
      { tag: "STEP 6 · 우리 판", title: "돌아가며 9번 · 남의 시트는 끝나야 보여요", body: "방송은 9명이 한 번씩 불렀지만 여기는 2~6명이 <b>돌아가며 9번</b> 불러요. 남의 시트는 라운드가 끝나야 보여요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 어느 칸에 적을지 알려 줘요.",
        boardHtml: `<div class="as-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4600 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌2 · 오름차순";
  const DIFF = "방송과 다른 점: 2~6명이 돌아가며 9번 불러요 · 순서 입찰은 없고 시작 순번이 라운드마다 한 칸씩 돌아요 · 딜러 숫자가 들어갈 칸은 무작위 · 점수는 라운드마다 가장 긴 구간 칸 수를 더해요 · 남의 시트는 라운드가 끝나야 보여요";
  window.SVUI = window.SVUI || {};
  window.SVUI.ascend = {
    actText: a => !a ? "—" : a.t === "say" ? `${a.v} 소리침` : a.t === "put" ? `시트 ${(a.c | 0) + 1}번 칸에 적음` : "행동",                       // 🎞️ 복기 행동 글
    name: "오름차순", emoji: "📈", short: "숫자를 오름차순으로 길게 이어요", min: 2, max: 6, defN: 4, board: false,
    opts: [{ k: "rounds", label: "판 수", items: [[2, "2판 (방송)"], [3, "3판"]], def: 2 }],
    howto: [
      "10칸 시트에 숫자를 적어 <b>왼쪽에서 오른쪽으로 커지는 칸</b>을 가장 길게 이어요 (같은 숫자도 이어짐)",
      "라운드가 시작되면 딜러가 내 시트 아무 칸에 숫자 1개를 적어 줘요 (나만 봄)",
      "순번대로 한 명씩 <b>1~10 중 숫자 하나를 불러요</b> → 모두가 동시에 그 숫자를 자기 시트 빈칸에 적어요 (9번이면 10칸이 다 참)",
      "가장 길게 이어진 칸 수가 라운드 점수 · 점수를 더해 가장 높은 사람이 1등, 같으면 공동",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}판 · 소리친 숫자 ${V.said.length}/${A.DECL}`),
    chip: (V, i) => ({ t: `${V.totals[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, coach, tutorial, review,
    qa: (V, me, rnd) => A.ai(V, me, "easy", rnd),
  };
})();

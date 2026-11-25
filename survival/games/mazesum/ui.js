/* 베니 서바이벌 · 수식미로 — 화면 (외우기 · 길 잇기 · 틀린 길 보기 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const M = window.SVCores.mazesum;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = M.letter;
  const CSS = `
.mz-top{display:flex;align-items:center;gap:6px;flex:none}
.mz-sc{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 11px;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis}
.mz-spec{font-size:12px;color:var(--soft);white-space:nowrap}
.mz-dots{margin-left:auto;display:flex;gap:5px;align-items:center}
.mz-dots i{display:block;width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.3)}
.mz-dots i.w{background:#4ade80;border-color:#4ade80}.mz-dots i.l{background:#f87171;border-color:#f87171}.mz-dots i.n{background:#94a3b8;border-color:#94a3b8}
.mz-dots i.cur{border-color:#fff;box-shadow:0 0 0 1px #fff}
.mz-info{flex:none;display:grid;gap:3px;text-align:center;border-radius:12px;padding:6px 8px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);line-height:1.35}
.mz-q{display:flex;justify-content:center;align-items:baseline;gap:7px;font:800 13px var(--round);flex-wrap:nowrap;white-space:nowrap}
.mz-q .big{font:900 21px var(--round);color:#fde68a}
.mz-q .arr{color:var(--soft)}
.mz-q .sum{margin-left:6px;padding-left:9px;border-left:1px solid rgba(255,255,255,.2)}
.mz-q .cd{font:900 20px var(--round);color:#fde68a;font-variant-numeric:tabular-nums}
.mz-st{font-size:12.5px;color:var(--soft);line-height:1.4}
.mz-st b{color:#fde68a}
.mz-st .cd{font:900 15px var(--round);color:#fde68a;font-variant-numeric:tabular-nums;margin-left:4px}
.mz-tr{display:grid;gap:1px;font-size:12px;color:#fecaca}
.mz-tr span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mz-bar{height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.mz-bar b{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#fde68a);width:100%}
.mz-info.win{background:rgba(34,197,94,.14);border-color:rgba(74,222,128,.45)}.mz-info.win .t{color:#bbf7d0}
.mz-info.lose{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.mz-info.lose .t{color:#fecaca}
.mz-info.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.mz-info.mid .t{color:#fde68a}
.mz-info .t{font:900 15px var(--round)}
.mz-board{--mzc:60px;display:grid;grid-template-columns:repeat(4,var(--mzc));gap:5px;justify-content:center;flex:none}
.mz-c{position:relative;width:var(--mzc);height:var(--mzc);padding:0;border-radius:11px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.22);background:linear-gradient(160deg,#4c2f6e,#2e1d47);color:#f5f3ff;font:inherit;cursor:default}
button.mz-c{cursor:pointer}
.mz-c .n{font:900 21px var(--round);line-height:1}
.mz-c.front{background:#f8fafc;color:#0f172a;border-color:#fcd34d}
.mz-c .l{position:absolute;left:4px;top:2px;font:800 10px var(--round);font-style:normal;color:#64748b}
.mz-c em{position:absolute;left:0;right:0;bottom:1px;font:900 9px var(--round);font-style:normal;text-align:center;letter-spacing:.02em}
.mz-c.st{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.35)}.mz-c.st em{color:#4ade80}.mz-c.front.st em{color:#15803d}
.mz-c.en{border-color:#fb923c;box-shadow:0 0 0 2px rgba(251,146,60,.35)}.mz-c.en em{color:#fdba74}.mz-c.front.en em{color:#c2410c}
.mz-c u{position:absolute;right:2px;top:2px;min-width:15px;text-align:center;font:900 10px var(--round);text-decoration:none;background:#fde68a;color:#422006;border-radius:7px;padding:0 3px;line-height:14px}
.mz-c.on{background:linear-gradient(160deg,#8b5cf6,#6d28d9);border-color:#ddd6fe;color:#fff}
.mz-c.front.on{background:#ddd6fe;color:#2e1065}
.mz-c.last{box-shadow:0 0 0 3px rgba(221,214,254,.6)}
.mz-c.bad{outline:2px dashed rgba(248,113,113,.85);outline-offset:-4px}
.mz-c.ans{background:linear-gradient(160deg,#22c55e,#15803d);border-color:#bbf7d0;color:#fff}
.mz-c.front.ans{background:#bbf7d0;color:#14532d}
.mz-path{flex:none;text-align:center;font:800 13px var(--round);color:#ddd6fe;min-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mz-path small{color:var(--soft);font-weight:700}
.mz-act{display:grid;grid-template-columns:1fr 1fr 2fr;gap:6px;flex:none;margin-top:auto}
.mz-act .btn{padding:10px 4px;font-size:13.5px;white-space:nowrap}
.mz-act .btn.big{font-size:14.5px}
.mz-one{display:grid;gap:5px;flex:none;margin-top:auto}
.mz-one .btn.big{padding:12px 8px;font-size:15.5px}
.mz-note{flex:none;text-align:center;font-size:13px;color:var(--soft);line-height:1.45;margin-top:auto}
.mz-note b{color:#fde68a}
.mz-tut{display:grid;gap:8px;justify-items:center;width:100%}
.mz-tut .mz-board{--mzc:46px;gap:4px}
.mz-tut .mz-c .n{font-size:17px}
.mz-tut .mz-c em{font-size:8px}
.mz-tut .pair{display:flex;gap:12px;align-items:center;justify-content:center}
.mz-tut .pair .mz-board{--mzc:34px;gap:3px}
.mz-tut .pair .mz-c{border-radius:8px}.mz-tut .pair .mz-c .n{font-size:13px}.mz-tut .pair .mz-c .l{display:none}
.mz-tut .pair .ar{font-size:20px;color:#fde68a}
.mz-tut .row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;font:800 13px var(--round)}
.mz-tut .row .big{font:900 20px var(--round);color:#fde68a}
.mz-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.mz-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px}
@media (max-height:760px){.mz-board{--mzc:56px}.mz-c .n{font-size:19px}.mz-info{padding:5px 8px}.mz-q .big{font-size:19px}.mz-act .btn{padding:8px 4px}.mz-one .btn.big{padding:10px 8px}}
@media (max-height:690px){.mz-board{--mzc:50px;gap:4px}.mz-c{border-radius:9px}.mz-c .n{font-size:17px}.mz-c .l{font-size:9px;left:3px;top:1px}.mz-c em{font-size:8px}.mz-c u{font-size:9px;line-height:13px;min-width:13px}.mz-st{font-size:12px}.mz-q .big{font-size:17px}.mz-q .cd{font-size:17px}.mz-path{font-size:12px;min-height:16px}.mz-act .btn{padding:7px 3px;font-size:13px}.mz-one .btn.big{padding:8px 8px;font-size:14.5px}.mz-info .t{font-size:14px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;

  // 받침에 따라 이/가 · 은/는 (내 이름은 '내가' · '나는'). 이름은 여기서 한 번만 escape.
  const jong = s => { const ch = String(s).slice(-1), c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch); };
  const sf = (n, a, b) => (jong(n) ? a : b);                                   // 받침 있으면 a, 없으면 b
  const iga = (n, isMe) => (isMe ? "내가" : esc(n) + sf(n, "이", "가"));
  const eun = (n, isMe) => (isMe ? "나는" : esc(n) + sf(n, "은", "는"));
  const pathTxt = cells => cells.map(L).join(" → ");
  const fmt = sec => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  // ── 판 그리기 (앞면 = 숫자 · 뒷면 = 알파벳) ──
  function boardHtml(o) {
    let h = "";
    for (let i = 0; i < M.CELLS; i++) {
      const k = o.sel ? o.sel.indexOf(i) : -1, ka = o.ans ? o.ans.indexOf(i) : -1;
      const cls = ["mz-c"];
      if (o.nums) cls.push("front");
      if (o.q && i === o.q.s) cls.push("st");
      if (o.q && i === o.q.e) cls.push("en");
      if (k >= 0) cls.push("on");
      if (k >= 0 && k === o.sel.length - 1) cls.push("last");
      if (ka >= 0) cls.push("ans");
      if (o.bad && o.bad.includes(i)) cls.push("bad");
      const face = o.nums ? `<b class="n">${o.nums[i]}</b><i class="l">${L(i)}</i>` : `<b class="n">${L(i)}</b>`;
      const tag = o.q && i === o.q.s ? "<em>출발</em>" : o.q && i === o.q.e ? "<em>도착</em>" : "";
      const ord = k >= 0 ? `<u>${k + 1}</u>` : ka >= 0 ? `<u>${ka + 1}</u>` : "";
      h += o.act ? `<button type="button" class="${cls.join(" ")}" data-i="${i}" aria-label="${L(i)}칸">${face}${tag}${ord}</button>` : `<div class="${cls.join(" ")}" aria-label="${L(i)}칸">${face}${tag}${ord}</div>`;
    }
    return `<div class="mz-board">${h}</div>`;
  }
  // 길 누르기: 맨 끝 칸 → 취소 · 앞 칸 → 거기까지 되돌림 · 이웃한 새 칸 → 이음 · 도착한 뒤엔 더 못 잇음
  function tap(path, i, q) {
    const k = path.indexOf(i);
    if (k >= 0) return k === 0 ? path : path.slice(0, k === path.length - 1 ? k : k + 1);
    const last = path[path.length - 1];
    if (last === q.e || !M.NB[last].includes(i)) return null;
    return path.concat(i);
  }

  // 이 기기에서 만드는 중인 길 (문제 · 차례가 바뀌면 새로)
  let SEL = null;
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.qi}|${V.step}`; if (!SEL || SEL.key !== key) SEL = { key, path: [V.q.s] }; return SEL; };

  // 외우는 시간 · 두 번째 차례 30초 (화면이 재고 끝나면 대신 눌러 줌 — 규칙 자체는 시계가 없음)
  let TM = { key: "", id: 0, t0: 0, limit: 0, act: null, ctx: null };
  const stopTm = () => { if (TM.id) clearInterval(TM.id); TM = { key: "", id: 0, t0: 0, limit: 0, act: null, ctx: null }; };
  const leftSec = () => TM.limit - (Date.now() - TM.t0) / 1000;
  function paint(stage) {
    const left = leftSec(), cd = stage.querySelector(".cd"), bar = stage.querySelector(".mz-bar b");
    if (cd) cd.textContent = fmt(left);
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, left / TM.limit * 100))}%`;
    return left;
  }
  function tick(stage) {
    if (!document.body.contains(stage) || !stage.querySelector(".cd")) { stopTm(); return; }
    if (paint(stage) <= 0) { const a = TM.act, c = TM.ctx; stopTm(); if (c && a) c.act(a); }
  }
  function timers(stage, V, ctx, spec) {
    let key = "", limit = 0, act = null;
    if (!spec && ctx.canAct) {
      if (V.phase === "memo" && !V.ready[ctx.me]) { key = `m|${ctx.g}|${V.round}`; limit = V.memoSec; act = { t: "ready" }; }
      else if (V.phase === "ask" && V.hold === ctx.me && V.step === 1) { key = `s|${ctx.g}|${V.qi}`; limit = 30; act = { t: "pass" }; }
    }
    if (!key) { stopTm(); return; }
    if (TM.key !== key) { stopTm(); TM = { key, id: 0, t0: Date.now(), limit, act, ctx, stage: null }; TM.id = setInterval(() => tick(stage), 250); }
    TM.ctx = ctx; paint(stage);
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const A = spec ? 0 : me, O = 1 - A, nm = i => nameOf(ctx, i), lab = i => (spec ? nm(i) : i === me ? "나" : nm(i));
    const memo = V.phase === "memo", ask = V.phase === "ask", show = V.phase === "show" || V.phase === "end", q = V.q;
    const canIn = !spec && !!ctx.canAct && ask && V.hold === me;
    const total = V.ext || V.hist.length > M.TOTAL ? M.TOTAL + 1 : M.TOTAL;
    let dots = "";
    for (let i = 0; i < total; i++) {
      const r = V.hist[i];
      dots += `<i class="${r ? (r.win < 0 ? "n" : r.win === A ? "w" : "l") : ""}${!r && i === V.qi && !V.over && !memo ? " cur" : ""}" title="${i + 1}번 문제${i >= M.TOTAL ? " (연장)" : ""}"></i>`;
    }
    let h = `<div class="mz-top"><span class="mz-sc">${esc(lab(A))} ${V.pts[A]} : ${V.pts[O]} ${esc(lab(O))}</span>${spec ? '<span class="mz-spec">👀 구경 중</span>' : ""}<span class="mz-dots">${dots}</span></div>`;
    let nums = null, sel = null, ans = null, bad = null;

    if (memo) {
      nums = V.board;
      const rdy = i => `${V.ready[i] ? "✅" : "⏳"} ${esc(lab(i))}`;
      const mine = !spec && V.ready[me];
      let mem = "";
      if (spec && V.memn) mem = ` · 기억한 칸 ${esc(nm(A))} ${V.memn[A] == null ? "-" : V.memn[A]} / ${esc(nm(O))} ${V.memn[O] == null ? "-" : V.memn[O]}`;
      h += `<div class="mz-info"><div class="mz-q"><span>🧠 ${V.round}라운드 · 숫자 16개를 외워요</span>${!spec && !mine ? `<span class="cd">${fmt(V.memoSec)}</span>` : ""}</div>${!spec && !mine ? `<div class="mz-bar"><b></b></div>` : ""}<div class="mz-st">${rdy(A)} · ${rdy(O)}${mem}</div></div>`;
    } else if (ask && q) {
      if (canIn) sel = selFor(V, ctx).path;
      const lastTry = V.tries.filter(t => t.cells).pop(), wrong = !!(V.tries.length && V.tries[0].cells);
      bad = lastTry ? lastTry.cells : null;
      let st;
      if (canIn && V.step === 0) st = `🎯 <b>내가 먼저</b> 풀어요 — 확신이 없으면 넘겨도 돼요`;
      else if (canIn) st = `🔁 ${iga(nm(O), false)} ${wrong ? "틀렸어요" : "넘겼어요"} — 이번엔 <b>내 차례</b> <span class="cd">${fmt(30)}</span>`;
      else if (V.step === 0) st = spec ? `👀 <b>${esc(nm(V.hold))}</b>${sf(nm(V.hold), "이", "가")} 먼저 풀어요` : `⏳ ${iga(nm(O), false)} 먼저 푸는 중이에요…`;
      else st = spec ? `👀 <b>${esc(nm(V.hold))}</b>${sf(nm(V.hold), "이", "가")} 이어서 도전 중이에요` : `⏳ ${iga(nm(O), false)} 내 ${wrong ? "오답을 보고" : "넘김을 보고"} 도전 중이에요…`;
      let mem = "";
      if (spec && V.memn) mem = `<div class="mz-st">기억한 칸 ${esc(nm(A))} ${V.memn[A] == null ? "-" : V.memn[A]} / ${esc(nm(O))} ${V.memn[O] == null ? "-" : V.memn[O]}</div>`;
      const trs = V.tries.map(t => `<span>${esc(lab(t.s))} ${t.cells ? `${esc(pathTxt(t.cells))} ❌ 오답` : "넘김 🙋"}</span>`).join("");
      h += `<div class="mz-info"><div class="mz-q"><span>출발 <b class="big">${L(q.s)}</b></span><span class="arr">→</span><span>도착 <b class="big">${L(q.e)}</b></span><span class="sum">합 <b class="big">${q.sum}</b></span></div><div class="mz-st">${st}</div>${trs ? `<div class="mz-tr">${trs}</div>` : ""}${mem}</div>`;
    } else if (show) {
      const R = V.hist[V.hist.length - 1];
      if (R) {
        ans = R.ans; nums = V.board;
        const cls = R.win < 0 ? "mid" : spec || R.win === me ? "win" : "lose";
        const head = R.win < 0 ? "🤝 아무도 못 맞혔어요 · 점수 없음" : spec ? `🏆 ${esc(nm(R.win))} 정답! +1점` : R.win === me ? "🏆 내가 맞혔어요! +1점" : `😵 ${esc(nm(R.win))} 정답 · 상대 +1점`;
        const sub = `${R.win < 0 ? "정답 길 예" : "정답 길"} ${esc(pathTxt(R.ans))} (합 ${R.sum})`;
        h += `<div class="mz-info ${cls}"><div class="t">${head}</div><div class="mz-st">${sub}${V.board ? " · 숫자가 열렸어요" : ""}</div></div>`;
      }
    }
    h += boardHtml({ nums, q: ask || show ? q : null, sel, ans, bad: ask ? bad : null, act: canIn });

    // 아래
    if (canIn) {
      const path = sel, last = path[path.length - 1], done = last === q.e;
      h += `<div class="mz-path">${esc(pathTxt(path))} <small>(${path.length}칸${done ? " · 도착!" : ""})</small></div>`;
      h += `<div class="mz-act"><button type="button" class="btn" data-a="undo" ${path.length > 1 ? "" : "disabled"}>↩ 한 칸 취소</button><button type="button" class="btn" data-a="pass">🙋 넘기기</button><button type="button" class="btn primary big" data-a="submit" ${done ? "" : "disabled"}>${done ? "✅ 이 길이 정답!" : `${L(q.e)} 까지 이어요`}</button></div>`;
    } else if (memo && !spec) {
      h += V.ready[me]
        ? `<div class="mz-note">✅ 다 외웠어요 — <b>${esc(nm(O))}</b>${sf(nm(O), "이", "가")} 끝날 때까지 기다려요 (판은 계속 볼 수 있어요)</div>`
        : `<div class="mz-one"><button type="button" class="btn primary big" data-a="ready">✅ 다 외웠어요</button></div>`;
    } else if (memo) {
      h += `<div class="mz-note">👀 구경 중 — 숫자판을 다 외우면 알파벳 뒷면으로 바뀌어요</div>`;
    } else if (ask) {
      h += `<div class="mz-note">${spec ? "👀 구경 중 — 숫자는 알파벳 뒤에 가려져 있어요" : `숫자는 알파벳 뒤에 가려져 있어요 — 외운 숫자를 떠올려 <span style="white-space:nowrap">합 <b>${q.sum}</b>인 길을 찾아요</span>`}</div>`;
    } else if (V.over) {
      h += `<div class="mz-note">끝났어요 · <b>${V.pts[A]} : ${V.pts[O]}</b></div>`;
    } else {
      h += `<div class="mz-note">잠시 뒤 ${V.final ? "결과가 나와요" : "다음 문제가 시작돼요"}…</div>`;
    }
    stage.innerHTML = h;
    timers(stage, V, ctx, spec);
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.i != null && canIn) {
        const s = selFor(V, ctx), np = tap(s.path, +t.dataset.i, q);
        if (np) { s.path = np; ctx.sfx("tap"); render(stage, V, ctx); } else ctx.toast("이어진 칸(위 · 아래 · 왼쪽 · 오른쪽)만 누를 수 있어요");
        return;
      }
      const a = t.dataset.a;
      if (a === "ready") { ctx.sfx("pop"); ctx.act({ t: "ready" }); }
      else if (a === "pass" && canIn) { ctx.sfx("tap"); ctx.act({ t: "pass" }); }
      else if (a === "undo" && canIn) { const s = selFor(V, ctx); if (s.path.length > 1) { s.path = s.path.slice(0, -1); ctx.sfx("tap"); render(stage, V, ctx); } }
      else if (a === "submit" && canIn) { const s = selFor(V, ctx); if (s.path[s.path.length - 1] === q.e) { ctx.sfx("pop"); ctx.act({ t: "path", cells: s.path.slice() }); } }
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const A = me >= 0 ? me : 0, O = 1 - A, who = me >= 0 ? ["나", "상대"] : ["1번", "2번"];
    const rows = V.hist.map(h => `<div>${h.no}번${h.ext ? "(연장)" : ""} · ${L(h.s)} → ${L(h.e)} 합 ${h.sum} · <b>${h.win < 0 ? "아무도 못 맞힘" : h.win === A ? who[0] + " 정답" : who[1] + " 정답"}</b> · ${h.ans.map(L).join("")}</div>`).join("");
    return `<div>점수 ${who[0]} <b>${V.pts[A]}</b> : <b>${V.pts[O]}</b> ${who[1]}</div>${rows}`;
  }

  // ── AI 선생님 (보이는 것만: 문제 · 틀린 길 · 점수. 숫자판은 외우는 동안만 보임) ──
  function coach(V, me, since, names) {
    const o = 1 - me, on = (names && names[o]) || "상대", p = V.pts, d = p[me] - p[o];
    const lead = d > 0 ? `${d}점 앞서요` : d < 0 ? `${-d}점 뒤져요` : "동점이에요";
    const base = `점수 나 ${p[me]} : ${p[o]} ${esc(on)} (${lead}) · 먼저 ${V.win}점이면 끝나요`;
    const oi = iga(on, false), ot = eun(on, false);
    if (V.over || V.phase === "end") return { opp: `${ot} 끝까지 같은 숫자판을 외우고 같은 문제를 풀었어요.`, mine: `${base}. 모두 끝났어요.`, rec: "결과를 확인해요. 틀린 문제는 정답 길을 다시 보고 그 칸의 숫자를 떠올려 봐요.", why: "수식미로는 계산보다 기억이에요. 숫자를 칸 위치와 함께 묶어 외웠는지가 승부를 갈라요." };
    if (V.phase === "memo") {
      const b = V.board, mx = Math.max(...b), mn = Math.min(...b), im = b.indexOf(mx), ii = b.indexOf(mn);
      return {
        opp: `${ot} 지금 같은 숫자판을 보며 외우고 있어요${V.ready[o] ? " (벌써 다 외웠다고 눌렀어요)" : ""}. 방송처럼 둘이 똑같은 숫자를 봐요.`,
        mine: `${base}. ${V.round}라운드는 문제가 ${M.PLAN[V.round - 1]}개 나와요. 아직 숫자가 보이는 동안이에요.`,
        rec: `가장 큰 수는 ${mx}(${L(im)} 칸), 가장 작은 수는 ${mn}(${L(ii)} 칸)이에요. 극단값부터 외우고, 나머지는 한 줄씩 묶어(예: ${L(0)}~${L(3)} 줄) 읽어 두세요.`,
        why: "문제에는 출발 · 도착 알파벳과 합만 나오고 숫자는 알파벳 뒤로 가려져요. 칸 위치와 숫자를 짝지어 외우는 게 전부예요.",
      };
    }
    const q = V.q, mc = M.minCells(q.s, q.e), avg = q.sum / mc, np = M.paths(q.s, q.e).length;
    const info = `이번 문제 ${V.qNo}/${V.qTotal}${V.ext ? "(연장)" : ""}: ${L(q.s)} → ${L(q.e)}, 합 ${q.sum}. 가장 짧은 길이 ${mc}칸이라 한 칸 평균 ${avg.toFixed(1)}, 이어진 길은 ${np}가지예요.`;
    if (V.phase === "show") {
      const R = V.hist[V.hist.length - 1], who = !R || R.win < 0 ? "아무도 못 맞혔어요" : R.win === me ? "내가 맞혔어요" : `${esc(on)} 정답이에요`;
      return {
        opp: R && R.tries.length ? `${ot} 이 문제에서 ${R.tries.map(t => (t.cells ? "길을 냈고" : "넘겼고")).join(" → ")} (${who}).` : `${ot} 이 문제를 풀지 않았어요.`,
        mine: `${base}. ${info}`,
        rec: R ? `정답 길은 ${pathTxt(R.ans)} (칸 숫자를 더하면 ${q.sum}) — 확인해요.${V.board ? " 이번 라운드가 끝나 숫자가 열렸어요 — 내가 기억한 숫자와 맞는지 봐요." : " 같은 숫자판으로 다음 문제가 나오면 이 길이 힌트가 돼요."}` : "결과를 확인해요.",
        why: "정답 길을 알파벳으로 보여 줘요. 합이 같은 다른 길이 있어도 합만 맞으면 정답이에요.",
      };
    }
    const first = V.step === 0, mine = V.hold === me, last = V.tries.length ? V.tries[V.tries.length - 1] : null;
    const hint = avg >= 12 ? `한 칸 평균이 높아요(${avg.toFixed(1)}) — 큰 수가 모인 곳을 지나는 짧은 길부터 떠올려 봐요.` : avg <= 8 ? `한 칸 평균이 낮아요(${avg.toFixed(1)}) — 작은 수가 많은 길이거나 칸이 많은 돌아가는 길일 수 있어요.` : `평균이 중간(${avg.toFixed(1)})이라 짧은 길과 한두 칸 돌아가는 길을 비교해 봐요.`;
    if (mine && first) return {
      opp: `${ot} 지금 기다리고 있어요. 내가 틀리거나 넘기면 ${oi} 내 길을 힌트 삼아 이어서 도전해요.`,
      mine: `${base}. ${info} 내가 먼저 푸는 차례예요.`,
      rec: `${hint} 정답 길은 보통 5~9칸이에요.`,
      why: `틀려도 점수는 안 깎이지만 ${oi} 내 오답을 힌트로 써요. 확신이 없으면 넘겨서 ${oi} 먼저 틀리게 두는 것도 방법이에요 (단 ${oi} 맞히면 +1점).`,
    };
    if (mine) return {
      opp: last && last.cells ? `${oi} ${pathTxt(last.cells)} 길로 답했는데 틀렸어요 — 그 길은 정답이 아니에요.` : `${ot} 이 문제를 넘겼어요. 확신이 없었다는 뜻이에요.`,
      mine: `${base}. ${info} 이번엔 내가 이어서 도전해요 (30초).`,
      rec: last && last.cells ? `틀린 길(${pathTxt(last.cells)})은 빼고, 그 길에서 한두 칸만 바꾼 길부터 떠올려 봐요. ${hint}` : `${hint} ${oi} 포기했으니 내 기억에서 가장 그럴듯한 길을 골라요.`,
      why: "이번 기회는 감점이 없어요. 확신이 없어도 꼭 한 번 도전해요 — 틀려도 그 문제는 점수 없이 끝날 뿐이에요.",
    };
    if (first) return {
      opp: `${oi} 먼저 푸는 중이에요. 내가 정답 길을 알아도 내 차례가 올 때까지 기다려요.`,
      mine: `${base}. ${info}`,
      rec: `기다리는 동안 내 후보 길을 정리해 둬요. ${hint}`,
      why: `${oi} 틀리면 그 길이 공개돼요 — 그 길을 빼면 후보가 줄어서 내가 더 맞히기 쉬워져요.`,
    };
    return {
      opp: last && last.cells ? `${oi} 내 오답을 보고 이어서 도전하고 있어요.` : `${oi} 내가 넘긴 문제에 도전하고 있어요.`,
      mine: `${base}. ${info} 내가 먼저 답했지만 못 맞혔어요.`,
      rec: "결과를 기다려요. 상대가 맞히면 정답 길과 내 기억을 비교해 봐요.",
      why: "내 오답은 공개돼서 상대의 힌트가 돼요. 다음 문제에서는 확신이 설 때만 내는 게 안전해요.",
    };
  }

  // ── 🎞️ 복기 고리 ──
  // 숫자판은 외우기가 끝나면 view 에 없고, 사람이 외운 칸은 기록에 남지 않아요 (view.mem = null — AI 만 기억을 실어 보냄).
  // 그래서 '내 기억으로 본 가능성' 은 못 견줘요: 고급 AI 는 내 기억을 모른 채 합만 보고 고르므로 그 수와 견주는 것은 의미가 없음.
  // 여기서는 문제(출발 · 도착 · 합) · 앞서 틀린 길 · 숫자 규칙(1~19 서로 다름)만으로 말할 수 있는 것만 짚어요 — 확실히 손해인 수 (불가능한 합 · 같은 오답 길 · 공짜 기회 버리기) + 중립 숫자.
  // sev 는 늘 60 아래: 연습 판은 숫자판을 다시 못 보여 줘서(외우기부터가 아님) 📒 에 담을 만한 장면이 아니에요.
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || (seat !== 0 && seat !== 1)) return none;
      if (V.phase === "memo") return myA.t === "ready" ? { sev: 0, why: "외운 칸은 기록에 남지 않아서 이 수는 AI 와 견주지 않아요", my: "다 외웠어요", best: "다 외웠어요" } : none;
      const q = V.q; if (V.phase !== "ask" || !q || V.hold !== seat) return none;
      const np = M.paths(q.s, q.e).length;
      const bt = bestA && bestA.t === "path" && Array.isArray(bestA.cells) ? `길 ${pathTxt(bestA.cells)}` : bestA && bestA.t === "pass" ? "넘김" : "";
      const best = bt ? `${bt} (내 기억 없이 합만 보고)` : undefined;
      if (myA.t === "pass") {
        if (V.step === 1) return { sev: 50, why: `이번 기회는 틀려도 감점이 없어요 — 이어진 길 ${np}가지 중 합 ${q.sum}${sf(q.sum, "이", "가")} 맞는 길은 보통 1~3개라, 길을 하나 내 보는 쪽이 잃을 게 없어요`, my: "넘김", best };
        return { sev: 0, why: `먼저 넘기면 상대가 이어서 풀어요 — 확신이 없을 때 쓰는 수예요 (이어진 길 ${np}가지)`, my: "넘김", best };
      }
      if (myA.t !== "path" || M.pathErr(q, myA.cells)) return none;
      const cells = myA.cells, n = cells.length, key = cells.join(","), lo = n * (n + 1) / 2, hi = n * (39 - n) / 2;
      const my = `길 ${pathTxt(cells)}`;
      if (q.sum < lo || q.sum > hi) return { sev: 55, why: `${n}칸 길은 서로 다른 1~19 의 합이라 ${lo}~${hi} 사이만 나와요 — 문제의 합 ${q.sum}${sf(q.sum, "은", "는")} 이 길로 만들 수 없어요`, my, best };
      if (V.tries.some(t => t.cells && t.cells.join(",") === key)) return { sev: 55, why: "이 길은 앞서 오답으로 나온 길이에요 — 같은 길을 또 내면 똑같이 틀려요", my, best };
      const avg = (q.sum / n).toFixed(1);
      return { sev: 0, why: `내 길 ${n}칸: 합 ${q.sum}${sf(q.sum, "이", "가")}면 칸마다 평균 ${avg} (1~19 의 평균은 10) · 외운 숫자는 기록에 없어서 AI 와는 견주지 않아요`, my, best };
    } catch (e) { return none; }
  }

  // ── 1분 규칙 ──
  const TBD = [7, 3, 12, 9, 15, 4, 8, 1, 11, 6, 17, 2, 5, 14, 10, 13], TQ = { s: 1, e: 14, sum: 37 };
  function tutorial() {
    style();
    const mini = (nums, ex = {}) => `<div class="mz-tut"><div class="pair">${boardHtml({ nums })}<span class="ar">→</span>${boardHtml(ex)}</div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "문제를 맞혀 먼저 3점!", body: "3라운드 동안 <b>문제 5개</b>가 나와요. 문제를 맞히면 <b>1점</b>이고, <b>먼저 3점</b>을 따면 바로 이겨요. 5문제가 끝났을 때는 점수가 높은 쪽이 이겨요.",
        boardHtml: `<div class="mz-tut"><div class="row"><span>나 <b class="big">2</b></span><span>:</span><span><b class="big">1</b> 상대</span></div><small>3점 먼저 따면 그 자리에서 승리 · 라운드는 3번, 문제는 5개</small></div>`, ms: 5200 },
      { tag: "STEP 2 · 외우기", title: "숫자판을 외우면 알파벳으로 덮여요", body: "라운드가 시작되면 4×4 판의 <b>숫자 16개</b>가 1분 동안 보여요. 시간이 끝나면 숫자는 사라지고 <b>알파벳(A~P)</b> 뒷면만 남아요. 라운드가 바뀌면 숫자판도 새로 바뀌어요.",
        boardHtml: mini(TBD.slice(), {}), ms: 6200 },
      { tag: "STEP 3 · 문제", title: "출발 · 도착 알파벳과 합이 나와요", body: "문제는 <b>출발 B → 도착 O, 합 37</b> 같은 모양이에요. 위 · 아래 · 왼쪽 · 오른쪽으로 <b>이웃한 칸</b>만 이어서, 지나간 칸(출발 · 도착 포함)의 숫자를 모두 더해 <b>정답 합</b>이 되는 길을 찾아요. 같은 칸은 한 번만 지나요.",
        boardHtml: `<div class="mz-tut"><div class="row"><span>출발 <b class="big">B</b></span><span>→</span><span>도착 <b class="big">O</b></span><span>합 <b class="big">37</b></span></div>${boardHtml({ q: TQ })}</div>`, ms: 7200 },
      { tag: "STEP 4 · 직접", title: "합이 37이 되는 길을 이어 보세요", body: "연습이라 숫자가 보여요 (진짜 판에서는 알파벳 뒤에 가려져요). <b>B에서 O까지</b> 이웃한 칸을 눌러 이어서 숫자의 합이 <b>37</b>이 되게 해 보세요!",
        interactive: { hint: "👆 B 다음 칸부터 눌러 O 까지 이어요 (합 37)", doneText: "✅ 합 37! 이렇게 길을 이어요" },
        render(stage, ctrl) {
          let path = [TQ.s], done = false, msg = "";
          const sumNow = () => M.sumOf(TBD, path);
          const draw = () => {
            stage.innerHTML = `<div class="mz-tut"><div class="row"><span>출발 <b class="big">B</b></span><span>→</span><span>도착 <b class="big">O</b></span><span>합 <b class="big">37</b></span></div>${boardHtml({ nums: TBD, q: TQ, sel: path, act: !done })}<div class="mz-path">${esc(pathTxt(path))} <small>(지금까지 합 ${sumNow()})</small></div><div class="msg">${esc(msg)}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-i]"); if (!b || done) return;
            const np = tap(path, +b.dataset.i, TQ);
            if (!np) { msg = "이웃한 칸(위 · 아래 · 왼쪽 · 오른쪽)만 이을 수 있어요"; ctrl.sfx("tap"); draw(); return; }
            path = np; msg = ""; ctrl.sfx("tap");
            if (path[path.length - 1] === TQ.e) {
              if (sumNow() === TQ.sum) { done = true; msg = "🏆 정답! 합이 37이에요"; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
              msg = `합 ${sumNow()} — 37이 아니에요. 다시!`; path = [TQ.s];
            }
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 차례와 오답", title: "틀려도 감점은 없어요", body: "문제마다 <b>먼저 답할 차례</b>가 번갈아 와요. 길을 완성했다고 믿으면 정답을 내고, 확신이 없으면 <b>넘겨도</b> 돼요. 틀리거나 넘기면 <b>상대가 이어서 한 번</b> 도전하고 (감점은 없어요), 상대도 못 맞히면 그 문제는 점수 없이 끝나요. 틀린 길은 서로 알파벳으로 보여요.",
        boardHtml: `<div class="mz-tut"><div class="row"><span>🎯 내가 먼저</span><span>→ ❌ 오답</span><span>→ 🔁 상대 차례</span></div><small>맞히면 +1점 · 틀려도 −점은 없어요</small></div>`, ms: 7000 },
      { tag: "STEP 6 · 끝", title: "막히면 AI 선생님!", body: "<b>먼저 3점</b>이면 바로 끝나고, 5문제 뒤에도 같으면 <b>연장 1문제</b>를 더 풀어요 (그래도 같으면 공동 1등). 막히면 <b>🧑‍🏫 AI 선생님</b>이 문제의 길 수와 평균 숫자 같은 단서를 알려 줘요. 외우는 시간은 판을 시작할 때 고를 수 있어요.",
        boardHtml: `<div class="mz-tut"><span style="font-size:42px">🧭</span></div>`, ms: 5200 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌3 · 수식미로 (8일차 데스매치)";
  const DIFF = "방송과 다른 점: 방송은 둘이 동시에 풀다가 먼저 외친 사람이 답하지만 우리는 문제마다 먼저 답할 차례를 번갈아 줘요 (틀리거나 넘기면 상대가 이어서 한 번 도전, 30초) · 상대도 틀리면 그 문제는 아무도 점수 없이 끝나요 · 숫자는 1~19 중 16개(겹침 없음), 같은 칸은 한 번만 지나요 · 5문제 뒤 점수가 같으면 연장 1문제, 그래도 같으면 공동 1등이에요 · 외우는 시간은 1분(30초 · 90초 고를 수 있어요) · 길을 고르는 모습이 상대에게 보이고 서로 외우는 시간을 맞춰야 해서 한 기기로는 못 해요";
  window.SVUI = window.SVUI || {};
  window.SVUI.mazesum = {
    actText: a => !a ? "—" : a.t === "pass" ? "넘김" : a.t === "ready" ? "다 외웠어요" : a.t === "path" ? `길 ${(a.cells || []).map(c => "ABCDEFGHIJKLMNOP"[c]).join(" → ")}` : "행동",   // 🎞️ 복기 행동 글
    name: "수식미로", emoji: "🧭", short: "숫자판을 외우고 합이 맞는 길을 찾는 기억 미로", min: 2, max: 2, defN: 2, board: false,
    opts: [{ k: "memo", label: "외우는 시간", items: [[30, "30초"], [60, "1분"], [90, "90초"]], def: 60 }],
    howto: [
      "<b>목표</b> — 문제를 맞혀 먼저 <b>3점</b> (3라운드 · 문제 5개, 5문제 뒤엔 점수가 높은 쪽)",
      "<b>준비물</b> — 4×4 숫자판: 칸마다 숫자(1~19, 겹침 없음), 뒷면은 알파벳 A~P",
      "<b>진행</b> — 라운드마다 숫자판 앞면을 1분 외우면 알파벳 뒷면으로 덮여요 → 출발 · 도착 알파벳과 정답 합이 나와요 (1 · 2라운드는 문제 2개, 3라운드는 1개)",
      "<b>승패</b> — 위 · 아래 · 왼쪽 · 오른쪽으로 이웃한 칸을 이어, 지나간 칸(출발 · 도착 포함, 같은 칸은 한 번만)의 숫자 합이 정답이면 <b>1점</b>",
      "<b>특수</b> — 틀려도 감점은 없지만 상대가 이어서 도전해요 · 먼저 3점이면 바로 끝 · 문제마다 먼저 답할 차례가 번갈아 와요",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : V.phase === "memo" ? `${V.round}라운드 · 외우기` : `${V.round}라운드 · 문제 ${V.qNo}/${V.qTotal}${V.ext ? " 연장" : ""}`),
    chip: (V, i) => ({ t: `${V.pts[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review,
    qa: (V, me, rnd) => M.ai(V, me, "easy", rnd),
  };
})();

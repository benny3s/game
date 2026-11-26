/* 베니 서바이벌 · 피라미드 넘버 — 화면 (피라미드 · 수식 만들기 · 정답/불가능 선언 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const M = window.SVCores.pyramid;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.py-top{display:flex;align-items:center;gap:6px;flex:none}
.py-sc{font:900 15px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 11px;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis}
.py-spec{font-size:12px;color:var(--soft);white-space:nowrap}
.py-rd{margin-left:auto;font:800 12px var(--round);color:var(--soft);white-space:nowrap}
.py-info{flex:none;display:grid;gap:3px;text-align:center;border-radius:12px;padding:6px 8px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);line-height:1.35}
.py-st{font-size:12.5px;color:var(--soft);line-height:1.4}
.py-st b{color:#fde68a}
.py-st .cd{font:900 15px var(--round);color:#fde68a;font-variant-numeric:tabular-nums;margin-left:4px}
.py-tr{display:grid;gap:1px;font-size:11.5px;color:#e9d5ff;text-align:left}
.py-tr span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.py-tr .bad{color:#fecaca}.py-tr .ok{color:#bbf7d0}
.py-info.win{background:rgba(34,197,94,.14);border-color:rgba(74,222,128,.45)}.py-info.win .t{color:#bbf7d0}
.py-info.lose{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.py-info.lose .t{color:#fecaca}
.py-info.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.py-info.mid .t{color:#fde68a}
.py-info .t{font:900 15px var(--round)}
.py-ops-line{display:flex;gap:8px;align-items:center;justify-content:center;flex:none;font:800 12.5px var(--round);color:var(--soft)}
.py-ops-line b{font:900 22px var(--round);color:#fde68a;background:rgba(0,0,0,.28);border:1px solid rgba(245,179,1,.35);border-radius:10px;min-width:38px;padding:0 8px;text-align:center;line-height:34px}
.py-pyr{display:grid;gap:4px;flex:none}
.py-row{position:relative;display:flex;justify-content:center;gap:5px}
.py-fl{position:absolute;left:0;top:50%;transform:translateY(-50%);font:800 10px var(--round);color:var(--soft);line-height:1.15;text-align:left}
.py-fl b{display:block;color:#fde68a;font-size:11px}
.py-c{width:52px;height:34px;border-radius:9px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.22);background:linear-gradient(160deg,#4c2f6e,#2e1d47);color:#f5f3ff;font:900 17px var(--round);position:relative;font-variant-numeric:tabular-nums}
.py-row.f4 .py-c{border-color:rgba(253,230,138,.55)}
.py-row.f3 .py-c{border-color:rgba(251,146,60,.5)}
.py-row.f2 .py-c{border-color:rgba(167,139,250,.5)}
.py-c.low{opacity:.4}
.py-c.hit{background:linear-gradient(160deg,#0ea5e9,#0369a1);border-color:#bae6fd;color:#fff}
.py-c.lead{background:linear-gradient(160deg,#f59e0b,#b45309);border-color:#fde68a;color:#fff;box-shadow:0 0 0 2px rgba(253,230,138,.35)}
.py-c.sol{background:linear-gradient(160deg,#22c55e,#15803d);border-color:#bbf7d0;color:#fff}
.py-c.won{box-shadow:0 0 0 3px #fde68a}
.py-c u{position:absolute;right:2px;top:-6px;font:900 9px var(--round);text-decoration:none;background:#fde68a;color:#422006;border-radius:7px;padding:0 4px;line-height:13px}
.py-bd{display:grid;gap:5px;flex:none;margin-top:auto}
.py-chips{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.py-chip{min-width:56px;max-width:100%;padding:3px 9px;border-radius:12px;border:2px solid rgba(255,255,255,.28);background:linear-gradient(160deg,#4c2f6e,#2e1d47);color:#f5f3ff;font:900 17px var(--round);cursor:pointer;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.py-chip small{display:block;font:800 11px var(--round);color:#fde68a}
.py-chip.sel{background:linear-gradient(160deg,#8b5cf6,#6d28d9);border-color:#ddd6fe}
.py-chip[disabled]{cursor:default}
.py-val{text-align:center;font:800 12.5px var(--round);color:#ddd6fe;min-height:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.py-val b{color:#fde68a}
.py-opb{display:grid;grid-template-columns:repeat(4,1fr) 6px repeat(3,1fr);gap:4px}
.py-opb .btn{padding:7px 0;font:900 17px var(--round);min-width:0}
.py-opb .btn.on{background:linear-gradient(160deg,#f59e0b,#d97706);color:#fff}
.py-opb i{display:block}
.py-act{display:grid;gap:5px;grid-auto-flow:column;grid-auto-columns:1fr}
.py-act .btn{padding:9px 3px;font-size:13px;white-space:nowrap}
.py-act .btn.big{font-size:14px}
.py-note{flex:none;text-align:center;font-size:13px;color:var(--soft);line-height:1.45;margin-top:auto}
.py-note b{color:#fde68a}
.py-sol{display:grid;gap:2px;text-align:left;font-size:12px;color:#d9f99d;margin-top:2px}
.py-sol span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.py-sol i{font-style:normal;color:var(--soft)}
.py-tut{display:grid;gap:8px;justify-items:center;width:100%}
.py-tut .py-c{width:42px;height:30px;font-size:15px;border-radius:8px}
.py-tut .py-row{gap:4px}
.py-tut .row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;font:800 13px var(--round)}
.py-tut .row .big{font:900 20px var(--round);color:#fde68a}
.py-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.py-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px}
.py-tut .py-chip{font-size:15px;min-width:50px}
.py-tut .py-opb .btn{padding:6px 0;font-size:15px}
@media (max-height:760px){.py-c{height:31px;font-size:16px}.py-info{padding:5px 8px}.py-chip{font-size:16px}.py-act .btn{padding:8px 3px}}
@media (max-height:690px){.py-c{height:28px;width:49px;font-size:15px;border-radius:8px}.py-pyr{gap:3px}.py-fl{font-size:9px}.py-fl b{font-size:10px}.py-ops-line b{line-height:28px;font-size:19px}.py-chip{font-size:15px;padding:2px 8px}.py-chip small{font-size:10px}.py-opb .btn{padding:5px 0;font-size:16px}.py-act .btn{padding:7px 2px;font-size:12.5px}.py-st{font-size:12px}.py-bd{gap:4px}}
.sv-coachfit .py-c{height:24px;width:46px;font-size:14px;border-radius:7px}
.sv-coachfit .py-pyr{gap:2px}.sv-coachfit .py-fl{display:none}.sv-coachfit .py-ops-line{display:none}.sv-coachfit .py-tr{display:none}.sv-coachfit .py-sol{display:none}
.py-hbtn{display:inline-block;margin:2px 4px 2px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.12);color:#fde68a;font:800 12.5px var(--round);cursor:pointer}
.sv-coachfit .py-chip{padding:1px 7px;font-size:14px}.sv-coachfit .py-chip small{display:none}.sv-coachfit .py-opb .btn{padding:4px 0;font-size:15px}.sv-coachfit .py-act .btn{padding:6px 2px;font-size:12px}.sv-coachfit .py-info{padding:3px 8px}.sv-coachfit .py-val{min-height:14px;font-size:12px}.sv-coachfit .py-bd{gap:3px}.sv-coachfit .py-note{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;

  // 받침에 따라 이/가 · 은/는 (내 이름은 '내가' · '나는'). 이름은 여기서 한 번만 escape.
  const jong = s => { const ch = String(s).slice(-1), c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch); };
  const sf = (n, a, b) => (jong(n) ? a : b);
  const iga = (n, isMe) => (isMe ? "내가" : esc(n) + sf(n, "이", "가"));
  const eun = (n, isMe) => (isMe ? "나는" : esc(n) + sf(n, "은", "는"));
  const fmt = sec => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fstr = M.fstr, SYM = M.SYM;
  const exprOf = (rpn, ops) => M.infix(rpn, ops);

  // ── 수식 만들기 (숫자 조각을 눌러 합치는 방식: 숫자 → 기호 → 숫자 · 제곱 · 세제곱 · 루트는 조각 하나에) ──
  let B = null;
  const bNew = (key, ops) => ({ key, ops: ops.slice(), chips: ops.map((n, i) => ({ rpn: [String(i)], v: [n, 1] })), sel: -1, op: null, undo: [] });
  const bFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${ctx.me}|${V.ops.join(",")}`; if (!B || B.key !== key) B = bNew(key, V.ops); return B; };
  const unaryUsed = Bx => Bx.chips.reduce((n, c) => n + c.rpn.filter(t => t === "s" || t === "c" || t === "r").length, 0);
  function bChip(Bx, i) {                         // → 안내(오류) 글 또는 null
    if (Bx.sel === i) { Bx.sel = -1; Bx.op = null; return null; }
    if (Bx.sel >= 0 && Bx.op) {
      const a = Bx.chips[Bx.sel], b = Bx.chips[i], rpn = a.rpn.concat(b.rpn, [Bx.op]), r = M.evalRpn(rpn, Bx.ops, true);
      if (!r.ok) return r.err;
      Bx.undo.push(JSON.stringify(Bx.chips));
      const lo = Math.min(Bx.sel, i), hi = Math.max(Bx.sel, i);
      Bx.chips[lo] = { rpn, v: r.v }; Bx.chips.splice(hi, 1); Bx.sel = -1; Bx.op = null; return null;
    }
    Bx.sel = i; Bx.op = null; return null;
  }
  function bOp(Bx, o) {
    if (Bx.chips.length < 2) return "이을 숫자가 더 없어요";
    if (Bx.sel < 0) return "먼저 숫자를 누르고 기호를 눌러요";
    Bx.op = Bx.op === o ? null : o; return null;
  }
  function bUn(Bx, u) {
    if (Bx.sel < 0) return "먼저 숫자(또는 계산한 조각)를 누르고 ² ³ √ 를 눌러요";
    if (unaryUsed(Bx) >= M.UMAX) return "제곱 · 세제곱 · 루트는 식 전체에서 한 번만 쓸 수 있어요";
    const c = Bx.chips[Bx.sel], rpn = c.rpn.concat([u]), r = M.evalRpn(rpn, Bx.ops, true);
    if (!r.ok) return r.err;
    Bx.undo.push(JSON.stringify(Bx.chips)); Bx.chips[Bx.sel] = { rpn, v: r.v }; Bx.sel = -1; Bx.op = null; return null;
  }
  function bUndo(Bx) { if (!Bx.undo.length) return; Bx.chips = JSON.parse(Bx.undo.pop()); Bx.sel = -1; Bx.op = null; }
  function bClear(Bx) { const k = Bx.key, o = Bx.ops; Object.assign(Bx, bNew(k, o)); }
  const bDone = Bx => Bx.chips.length === 1;
  const bVal = Bx => (bDone(Bx) ? Bx.chips[0].v : null);
  const chipsHtml = (Bx, dis) => `<div class="py-chips">${Bx.chips.map((c, i) => `<button type="button" class="py-chip${Bx.sel === i ? " sel" : ""}" data-c="${i}" ${dis ? "disabled" : ""}><span>${esc(exprOf(c.rpn, Bx.ops))}</span>${c.rpn.length > 1 ? `<small>= ${esc(fstr(c.v))}</small>` : ""}</button>`).join("")}</div>`;
  const opsHtml = (Bx, dis) => {
    const b = (k, a, s) => `<button type="button" class="btn${a ? " on" : ""}" data-${k}="${s[0]}" ${dis ? "disabled" : ""} aria-label="${s[1]}">${s[2]}</button>`;
    return `<div class="py-opb">${[["+", "더하기", "+"], ["-", "빼기", "−"], ["*", "곱하기", "×"], ["/", "나누기", "÷"]].map(s => b("o", Bx.op === s[0], s)).join("")}<i></i>${[["s", "제곱", "²"], ["c", "세제곱", "³"], ["r", "루트", "√"]].map(s => b("u", false, s)).join("")}</div>`;
  };
  // 이 기기에서 눌린 것을 고침: data-c / data-o / data-u / data-a=undo|clear → 오류 글 또는 null (바뀌었는지는 changed 로)
  function bClick(Bx, t) {
    if (t.dataset.c != null) return bChip(Bx, +t.dataset.c);
    if (t.dataset.o != null) return bOp(Bx, t.dataset.o);
    if (t.dataset.u != null) return bUn(Bx, t.dataset.u);
    if (t.dataset.a === "undo") { bUndo(Bx); return null; }
    if (t.dataset.a === "clear") { bClear(Bx); return null; }
    return undefined;
  }
  const floorOfV = (V, v) => M.floorOf(V.rows, v);

  // ── 피라미드 ──
  function pyrHtml(V, o = {}) {
    let h = "";
    V.floors.forEach((f, i) => {
      h += `<div class="py-row f${f}"><span class="py-fl"><b>${f}층</b>${f}점</span>`;
      for (const v of V.rows[i]) {
        const cls = ["py-c"];
        if (o.low != null && f <= o.low) cls.push("low");
        if (o.hit != null && v === o.hit) cls.push("hit");
        if (o.lead != null && v === o.lead) cls.push("lead");
        if (o.sol && o.sol.has(v)) cls.push("sol");
        if (o.won != null && v === o.won) cls.push("won");
        h += `<div class="${cls.join(" ")}" data-v="${v}">${v}${o.sol && o.sol.has(v) && o.won === v ? "<u>★</u>" : ""}</div>`;
      }
      h += `</div>`;
    });
    return `<div class="py-pyr">${h}</div>`;
  }
  const opsLine = V => `<div class="py-ops-line"><span>연산용 숫자</span>${V.ops.map(n => `<b>${n}</b>`).join("")}</div>`;

  // 이 기기가 보는 라운드 흐름 한 줄씩
  function traceLines(V, ctx, lab) {
    let started = false;                                         // 첫 정답 · 불가능 선언 뒤의 넘김 = 포기
    const tr = V.trace.map(t => { const g = Object.assign({ late: started }, t); if (t.k === "ok" || t.k === "imp") started = true; return g; });
    return tr.slice(-3).map(t => {
      const w = esc(lab(t.s));
      if (t.k === "pass") return `<span>${w} ${t.late ? "포기" : "넘김"} 🙋</span>`;
      if (t.k === "imp") return `<span>${w} 🤔 불가능 선언</span>`;
      if (t.k === "ok") return `<span class="ok">${w} ${esc(exprOf(t.rpn, V.ops))} = ${t.v} → <b>${t.f}층</b> ✅</span>`;
      return `<span class="bad">${w} ${esc(exprOf(t.rpn, V.ops))} = ${esc(String(t.v))} ❌ 목표에 없어요</span>`;
    }).join("");
  }
  const lastOk = V => { for (let i = V.trace.length - 1; i >= 0; i--) if (V.trace[i].k === "ok") return V.trace[i]; return null; };

  // 화면이 재는 시간: 도전 30초 · 불가능 도전 1분 (끝나면 넘기기를 대신 눌러 줌 — 규칙은 시계가 없음)
  let TM = { key: "", id: 0, t0: 0, limit: 0, act: null, ctx: null };
  const stopTm = () => { if (TM.id) clearInterval(TM.id); TM = { key: "", id: 0, t0: 0, limit: 0, act: null, ctx: null }; };
  const leftSec = () => TM.limit - (Date.now() - TM.t0) / 1000;
  function paint(stage) { const left = leftSec(), cd = stage.querySelector(".cd"); if (cd) cd.textContent = fmt(left); return left; }
  function tick(stage) {
    if (!document.body.contains(stage) || !stage.querySelector(".cd")) { stopTm(); return; }
    if (paint(stage) <= 0) { const a = TM.act, c = TM.ctx; stopTm(); if (c && a) c.act(a); }
  }
  function timers(stage, V, ctx, spec) {
    let key = "", limit = 0;
    if (!spec && ctx.canAct && V.needs.includes(ctx.me)) {
      if (V.phase === "raise") { key = `r|${ctx.g}|${V.round}|${V.floor}`; limit = 30; }
      else if (V.phase === "imp") { key = `i|${ctx.g}|${V.round}`; limit = 60; }
    }
    if (!key) { stopTm(); return; }
    if (TM.key !== key) { stopTm(); TM = { key, id: 0, t0: Date.now(), limit, act: { t: "pass" }, ctx }; TM.id = setInterval(() => tick(stage), 250); }
    TM.ctx = ctx; paint(stage);
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const A = spec ? 0 : me, O = 1 - A, nm = i => nameOf(ctx, i), lab = i => (spec ? nm(i) : i === me ? "나" : nm(i));
    const ph = V.phase, show = ph === "show" || ph === "end", R = V.res, live = ph === "open" || ph === "raise" || ph === "imp";
    const canIn = !spec && !!ctx.canAct && V.needs.includes(me) && !V.over;
    const Bx = live && !spec ? bFor(V, ctx) : null;
    const val = Bx ? bVal(Bx) : null, intV = val && val[1] === 1 ? val[0] : null, tf = intV != null ? floorOfV(V, intV) : 0;
    const lo = lastOk(V);
    let h = `<div class="py-top"><span class="py-sc">${esc(lab(A))} ${V.pts[A]} : ${V.pts[O]} ${esc(lab(O))}</span>${spec ? '<span class="py-spec">👀 구경 중</span>' : ""}<span class="py-rd">${V.round}/${V.rounds}라운드</span></div>`;

    let st = "", cls = "", head = "";
    if (!spec && live && V.needs.includes(me) && !canIn) st = "⏳ 잠시만요 — 곧 내 차례가 열려요";
    else if (ph === "open") {
      if (canIn) st = V.step === 0 ? `🎯 <b>내가 먼저</b> — 식을 만들어 선언하거나, 넘기거나, 불가능을 선언해요` : `🔁 ${iga(nm(O), false)} 넘겼어요 — <b>이번엔 내 차례</b> (선언 · 넘기기 · 불가능)`;
      else st = spec ? `👀 <b>${esc(nm(V.hold))}</b>${sf(nm(V.hold), "이", "가")} ${V.step === 0 ? "먼저" : "넘긴 뒤 이어서"} 풀어요` : `⏳ ${iga(nm(V.hold), false)} ${V.step === 0 ? "먼저" : "이어서"} 푸는 중이에요 — 나도 미리 식을 만들어 둬요`;
    } else if (ph === "raise") {
      const who = lo ? lab(lo.s) : "", sc = lo ? `<b>${lo.f}층(${lo.v})</b>` : "";
      if (canIn) st = `🔁 ${iga(nm(V.lead), V.lead === me)} ${sc}${ja(sc,"을")} 만들었어요 — <b>${V.floor + 1}층 이상</b>만 이길 수 있어요 · 틀려도 감점 없음 <span class="cd">${fmt(30)}</span>`;
      else st = spec ? `👀 ${esc(who)} ${sc} 완성 — <b>${esc(nm(V.chal))}</b>${sf(nm(V.chal), "이", "가")} 더 높은 층에 도전 중` : `⏳ 내가 ${sc}${ja(sc,"을")} 만들었어요 — ${iga(nm(V.chal), false)} 더 높은 층에 도전 중이에요`;
    } else if (ph === "imp") {
      const d = V.decl;
      if (canIn) st = `🤔 ${iga(nm(d), false)} <b>불가능</b>이라 했어요 — 목표 하나만 만들면 선언한 쪽 −3점, 나는 그 층 점수! <span class="cd">${fmt(60)}</span>`;
      else st = spec ? `👀 ${esc(nm(d))}${sf(nm(d), "이", "가")} 불가능 선언 — ${esc(nm(1 - d))}${sf(nm(1 - d), "이", "가")} 도전 중` : `🤔 내가 <b>불가능</b>을 선언했어요 — ${iga(nm(O), false)} 못 찾으면 <b>+5점</b>, 찾으면 −3점`;
    } else if (show && R) {
      const sc = d => (d > 0 ? `+${d}` : `${d}`);
      if (R.kind === "none") { cls = "mid"; head = "🤝 아무도 목표를 못 만들었어요 · 점수 없음"; }
      else if (R.kind === "imp") {
        const ok = R.win === R.decl, me1 = !spec && R.win === me;
        cls = spec ? "mid" : me1 ? "win" : "lose";
        head = ok ? (spec ? `🤔 ${esc(nm(R.decl))} 불가능 선언 성공! ${sc(M.IMP_WIN)}점` : R.decl === me ? "🤔 내 불가능 선언 성공! +5점" : `😵 ${esc(nm(R.decl))}의 불가능 선언 성공 (+5점)`)
          : (spec ? `🔎 ${esc(nm(R.win))} 목표를 찾았어요! ${R.f}층 +${R.f}점 · 선언한 쪽 −3점` : me1 ? `🔎 내가 ${R.f}층을 찾았어요! +${R.f}점 · 상대 −3점` : `😵 불가능 선언이 틀렸어요 · −3점 (상대 +${R.f}점)`);
      } else {
        cls = spec ? "mid" : R.win === me ? "win" : "lose";
        head = spec ? `🏆 ${esc(nm(R.win))} ${R.f}층 완성! +${R.f}점` : R.win === me ? `🏆 내가 ${R.f}층까지 만들었어요! +${R.f}점` : `😵 ${esc(nm(R.win))} ${R.f}층까지 만들었어요 · 상대 +${R.f}점`;
      }
      const pn = [0, 0]; let started = false;                      // 정답 · 불가능 선언 전의 오답 = −1점 (도전 중 오답은 감점 없음)
      for (const t of R.trace) { if (t.k === "ok" || t.k === "imp") started = true; else if (t.k === "bad" && !started) pn[t.s]--; }
      const pen = pn.map((x, i) => (x < 0 ? `${esc(lab(i))} ${x}점` : "")).filter(Boolean).join(" · ");
      st = `${pen ? `오답 감점: ${pen} · ` : ""}${R.sol.length ? "만들 수 있었던 목표를 초록색으로 보여 줘요" : "이 숫자로는 만들 수 있는 목표가 없었어요"}`;
    }
    const trs = live ? traceLines(V, ctx, lab) : "";
    if (show && R) h += `<div class="py-info ${cls}"><div class="t">${head}</div><div class="py-st">${st}</div></div>`;
    else if (V.over) h += `<div class="py-info mid"><div class="t">끝났어요 · ${V.pts[A]} : ${V.pts[O]}</div></div>`;
    else h += `<div class="py-info"><div class="py-st">${st}</div>${trs ? `<div class="py-tr">${trs}</div>` : ""}</div>`;

    // 피라미드
    const po = {};
    if (show && R) { po.sol = new Set(R.sol.map(s => s.v)); const lastW = [...R.trace].reverse().find(t => t.k === "ok"); po.won = lastW ? lastW.v : null; V = Object.assign({}, V, { rows: R.rows, ops: R.ops }); }
    else {
      if (ph === "raise") po.low = V.floor;
      if (lo && V.phase !== "open") po.lead = lo.v;
      if (val && intV != null && tf > 0) po.hit = intV;
    }
    h += opsLine(V) + pyrHtml(V, po);

    // 아래
    if (Bx) {
      const dis = false;
      let sub = "";
      if (val) {
        if (intV != null && tf > 0) sub = ph === "raise" && tf <= V.floor ? `= <b>${intV}</b> → ${tf}층 (이미 ${V.floor}층까지 나왔어요)` : `= <b>${intV}</b> → <b>${tf}층</b> 목표예요 (${tf}점)`;
        else sub = `= <b>${esc(fstr(val))}</b> → 목표에 없는 숫자예요`;
      } else sub = Bx.sel >= 0 ? (Bx.op ? `<b>${esc(SYM[Bx.op])}</b> 뒤에 이을 숫자를 눌러요` : "기호를 눌러요 (+ − × ÷) · 또는 ² ³ √") : "숫자 → 기호 → 숫자 순서로 눌러 식을 만들어요";
      const okSub = canIn && val && intV != null && tf > 0 && (ph !== "raise" || tf > V.floor);
      const submit = `<button type="button" class="btn primary big" data-a="submit" ${okSub ? "" : "disabled"}>${okSub ? `✅ ${tf}층 ${intV} 선언` : canIn ? "✅ 선언" : "⏳ 상대 차례"}</button>`;
      let acts = `<button type="button" class="btn" data-a="undo" ${Bx.undo.length ? "" : "disabled"}>↩ 되돌리기</button>`;
      if (canIn && ph === "open") acts += `<button type="button" class="btn" data-a="pass">🙋 넘기기</button><button type="button" class="btn" data-a="imp">🤔 불가능</button>`;
      else if (canIn) acts += `<button type="button" class="btn" data-a="pass">🙋 포기</button>`;
      else acts += `<button type="button" class="btn" data-a="clear" ${Bx.chips.length < V.ops.length ? "" : "disabled"}>🗑 처음부터</button>`;
      acts += submit;
      h += `<div class="py-bd">${chipsHtml(Bx, false)}<div class="py-val">${sub}</div>${opsHtml(Bx, dis)}<div class="py-act">${acts}</div></div>`;
    } else if (spec && live) h += `<div class="py-note">👀 구경 중 — 연산용 숫자 3개를 모두 써서 목표 숫자를 만들어요</div>`;
    else if (show && R) {
      const list = R.sol.slice(0, 5).map(s => `<span>${s.f}층 <b>${s.v}</b> = ${esc(exprOf(s.rpn, R.ops))}</span>`).join("");
      h += R.sol.length ? `<div class="py-sol">${list}${R.sol.length > 5 ? `<span><i>… 외 ${R.sol.length - 5}개 (모두 ${R.sol.length}개)</i></span>` : ""}</div>` : "";
      h += `<div class="py-note">${V.over ? `끝났어요 · <b>${V.pts[A]} : ${V.pts[O]}</b>` : `잠시 뒤 ${V.round >= V.rounds ? "결과가 나와요" : "다음 라운드가 시작돼요"}…`}</div>`;
    } else if (V.over) h += `<div class="py-note">끝났어요 · <b>${V.pts[A]} : ${V.pts[O]}</b></div>`;

    stage.innerHTML = h;
    timers(stage, V, ctx, spec);
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const a = t.dataset.a;
      if (a === "pass" && canIn) { ctx.sfx("tap"); ctx.act({ t: "pass" }); return; }
      if (a === "imp" && canIn) { ctx.sfx("pop"); ctx.act({ t: "imp" }); return; }
      if (a === "submit" && canIn) {
        const b2 = bFor(Object.assign({}, V), ctx), v2 = bVal(b2); if (!v2 || v2[1] !== 1) return;
        ctx.sfx("pop"); ctx.act({ t: "ans", rpn: b2.chips[0].rpn.slice(), tv: v2[0] }); return;
      }
      if (!Bx) return;
      const err = bClick(Bx, t);
      if (err === undefined) return;
      if (err) ctx.toast(err); else ctx.sfx("tap");
      render(stage, V, ctx);
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const A = me >= 0 ? me : 0, O = 1 - A, who = me >= 0 ? ["나", "상대"] : ["1번", "2번"];
    const rows = V.hist.map(h => {
      const w = h.win < 0 ? "아무도 못 만듦" : h.kind === "imp" ? (h.win === h.decl ? `${h.win === A ? who[0] : who[1]} 불가능 성공` : `${h.win === A ? who[0] : who[1]} 찾음(${h.f}층)`) : `${h.win === A ? who[0] : who[1]} ${h.f}층`;
      return `<div>${h.no}라운드 · <b>${w}</b> · ${h.d[A] >= 0 ? "+" : ""}${h.d[A]} : ${h.d[O] >= 0 ? "+" : ""}${h.d[O]}</div>`;
    }).join("");
    return `<div>점수 ${who[0]} <b>${V.pts[A]}</b> : <b>${V.pts[O]}</b> ${who[1]}</div>${rows}`;
  }

  // ── AI 선생님 (보이는 것: 연산용 숫자 · 목표 14개 · 선언. 정답 풀이는 숫자가 공개돼 있어 따져 줄 수 있음) ──
  function plan(V) {
    const tab = M.table(V), byF = { 1: 0, 2: 0, 3: 0, 4: 0 };
    tab.forEach(t => { byF[t.f]++; });
    const q = 1 - tab.reduce((p, t) => p * (1 - M.FIND.hard[M.diffOf(t.cost)]), 1);   // 고급 상대가 하나라도 찾을 확률
    return { tab, n: tab.length, byF, top: tab[0] || null, q };
  }
  const byFtxt = p => [4, 3, 2, 1].filter(f => p.byF[f]).map(f => `${f}층 ${p.byF[f]}개`).join(" · ");
  const pct = x => `${Math.round(x * 100)}%`;
  // 💡 는 고급 AI 의 수를 그대로 설명하고, 단계 힌트: 처음엔 목표 · 쓰는 기호만, '한 번 더' 를 누르면 전체 식 (그 차례 동안 펼친 채)
  const FIXRND = () => 0.5;
  let CC = { key: "", open: false, full: "" };
  const ckey = (V, me) => `${V.pub}|${V.round}|${me}`;
  function ccFor(V, me) { const k = ckey(V, me); if (CC.key !== k) CC = { key: k, open: false, full: "" }; return CC; }
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-pyhint]");
    if (!b) return;
    e.preventDefault(); CC.open = true;
    const sp = document.createElement("span"); sp.innerHTML = CC.full; b.replaceWith(sp);
  }, true);
  const KIND = { "+": "+", "-": "−", "*": "×", "/": "÷", s: "²", c: "³", r: "√" };
  const opsOf = t => { const u = []; for (const x of t.rpn) if (KIND[x] && !u.includes(KIND[x])) u.push(KIND[x]); return u.join(" "); };
  // 고급 AI 의 수 → { a: 그 수, t: 노리는 목표(없으면 null) }
  function hardMove(V, me, tab) { const a = M.ai(V, me, "hard", FIXRND); const t = a && a.t === "ans" ? tab.find(x => x.v === a.tv) || null : null; return { a, t }; }
  // 목표를 알려 주되 식은 숨기는 한 줄 + 한 번 더 단추 (CC.full 에 전체 식)
  function staged(V, me, t, tail) {
    const c = ccFor(V, me); c.full = `<b>${esc(M.infix(t.rpn, V.ops))} = ${t.v}</b>`;
    return { head: `${t.f}층 <b>${t.v}</b>${ja(t.v,"을")} 만들어요 — 식에는 <b>${esc(opsOf(t))}</b>${ja(opsOf(t), "이")} 들어가요.`, btn: c.open ? c.full : `<button type="button" class="py-hbtn" data-pyhint>💡 한 번 더 — 전체 식 보기</button>`, tail };
  }
  function coach(V, me, since, names) {
    if (typeof document !== "undefined") style();
    if (me !== 0 && me !== 1) me = 0;
    const o = 1 - me, on = (names && names[o]) || "상대", p = V.pts, d = p[me] - p[o];
    const lead = d > 0 ? `${d}점 앞서요` : d < 0 ? `${-d}점 뒤져요` : "동점이에요";
    const base = `점수 나 ${p[me]} : ${p[o]} ${esc(on)} (${lead}) · ${V.round}/${V.rounds}라운드`;
    const oi = iga(on, false), ot = eun(on, false);
    if (V.over || V.phase === "end") return { opp: `${ot} 끝까지 같은 연산용 숫자와 같은 피라미드를 보고 풀었어요.`, mine: `${base}. 모두 끝났어요.`, rec: "기록을 보며 못 만든 목표의 식을 다시 확인해요.", why: "승점은 마지막으로 완성한 층 수예요. 쉬운 식으로 1층을 먼저 선언하면 상대가 더 높은 층을 찾을 기회를 줘요." };
    if (V.phase === "show" && V.res) {
      const R = V.res, tp = R.sol[0];
      return {
        opp: R.kind === "none" ? `${ot} 이번 라운드에 목표를 만들지 못했어요.` : R.kind === "imp" ? `${oi} ${R.decl === o ? "불가능을 선언했어요" : "불가능 선언에 도전했어요"}.` : `${oi} ${R.win === o ? `${R.f}층까지 만들었어요` : "더 높은 층을 못 찾았어요"}.`,
        mine: `${base}. 이번 라운드: 만들 수 있었던 목표 ${R.sol.length}개 (${[4, 3, 2, 1].filter(f => R.sol.some(s => s.f === f)).map(f => `${f}층 ${R.sol.filter(s => s.f === f).length}개`).join(" · ") || "없음"}).`,
        rec: tp ? `가장 높았던 ${tp.f}층 ${tp.v} = ${M.infix(tp.rpn, R.ops)} — 이런 식을 떠올릴 수 있는지 확인해요.` : "만들 수 있는 목표가 없는 라운드였어요 — 이럴 땐 '불가능 선언'이 맞아요.",
        why: tp ? "높은 층 목표는 나눗셈 · 제곱 · 루트가 섞인 식인 경우가 많아요. 쉬운 +, −, × 로 안 되면 ÷ 와 ² ³ √ 한 번을 써 보는 순서로 찾아요." : "불가능이 틀리면 −3점이니 14개를 다 따져 본 뒤에만 선언해요.",
      };
    }
    const P = plan(V), top = P.top, ex = t => `${M.infix(t.rpn, V.ops)} = ${t.v}`;
    const mine = V.needs.includes(me), tr = V.trace[V.trace.length - 1];
    const stat = P.n ? `이 숫자 3개(${V.ops.join(" · ")})로 만들 수 있는 목표는 ${P.n}개 (${byFtxt(P)})` : `이 숫자 3개(${V.ops.join(" · ")})로는 14개 목표를 하나도 못 만들어요`;
    if (V.phase === "open") {
      const mid = P.tab.find(t => t.f < (top ? top.f : 0) && t.cost < 3.1) || null;
      if (mine) { const H = hardMove(V, me, P.tab), t = H.t; return {
        opp: V.step === 0 ? `${ot} 지금 기다려요. 내가 넘기거나 틀리면 ${oi} 같은 선택(선언 · 넘기기 · 불가능)을 해요.` : `${oi} 먼저 넘겼어요 — 쉽게 보이는 목표가 없었다는 뜻이에요.`,
        mine: `${base}. ${stat}.`,
        ...(t ? (() => { const S = staged(V, me, t); return { rec: S.head, why: `${S.btn} ${t.f === 4 ? "4층은 상대가 도전할 더 높은 층이 없어 바로 4점으로 끝나요." : `${t.f}층을 먼저 선언하면 상대는 ${t.f + 1}층 이상을 찾아야 해서 내 ${t.f}점이 지켜질 확률이 높아요. 상대(고급 기준)가 이 중 하나라도 찾을 확률은 ${pct(P.q)}예요.`}` }; })()
          : H.a && H.a.t === "imp" ? { rec: P.n ? `🤔 <b>불가능 선언</b> — 고급 AI는 이 숫자로 만들 수 있는 목표 ${P.n}개가 모두 어렵다고 보고 불가능을 선언해요 (상대가 찾을 확률 ${pct(P.q)}).` : `🤔 <b>불가능 선언</b>이 맞아요 — 목표 14개를 모두 따져 봐도 하나도 못 만들어요.`, why: P.n ? `맞으면 +5점, 틀리면 −3점이에요. 만들 수 있는 목표가 있어서 위험한 선택이에요.` : `불가능이 맞으면 +5점이에요 (상대가 찾을 확률 0%). 틀리면 −3점이니 14개를 다 따져 본 뒤에만 선언해요.` }
          : { rec: P.n ? `🙋 <b>넘기기</b> — 고급 AI는 만들 수 있는 목표 ${P.n}개가 모두 어려워 넘겨요 (불가능 선언은 상대가 찾을 확률 ${pct(P.q)}라 위험해요).` : `🙋 <b>넘기기</b>.`, why: "넘기면 상대가 같은 선택을 해요. 둘 다 넘기면 점수 없이 끝나요." }),
      }; }
      return {
        opp: `${oi} 먼저 푸는 중이에요${V.step ? " (내가 넘긴 뒤 이어서)" : ""}. 나도 미리 식을 만들어 둘 수 있어요.`,
        mine: `${base}. ${stat}.`,
        rec: top ? (() => { const w = M.found(V, me, "hard", P.tab)[0] || top, S = staged(V, me, w); return `기다리는 동안 ${S.head.replace("를 만들어요", "를 준비해요")} ${S.btn}`; })() : `만들 수 있는 목표가 없어요 — ${oi} 선언하면 내 차례에 '불가능'을 받을 수 있어요.`,
        why: top ? `${oi} 먼저 선언해도 내가 더 높은 층(${top.f}층)을 만들면 이겨요. 상대가 ${top.f}층에 닿을 확률은 ${pct(P.q)} 안팎이에요.` : "불가능 선언은 먼저 차례 때만 할 수 있어요. 기다리는 동안 목표 14개를 하나씩 지워 봐요.",
      };
    }
    if (V.phase === "raise") {
      const up = P.tab.filter(t => t.f > V.floor), lo = lastOk(V), HR = hardMove(V, me, P.tab);
      if (mine) return {
        opp: `${oi} ${lo ? `${lo.f}층 ${lo.v}` : "목표"}${ja(lo ? lo.v : "목표", "을")} 만들었어요 — 내가 더 높은 층을 못 만들면 ${oi} ${V.floor}점을 가져가요.`,
        mine: `${base}. ${V.floor}층보다 높은 목표 중 만들 수 있는 것은 ${up.length}개${up.length ? ` (${[4, 3, 2].filter(f => up.some(t => t.f === f)).map(f => `${f}층 ${up.filter(t => t.f === f).length}개`).join(" · ")})` : ""}.`,
        rec: HR.t ? (() => { const S = staged(V, me, HR.t); return `${S.head.replace("를 만들어요", "로 도전해요")}`; })() : `🙋 <b>포기</b> — 고급 AI는 ${V.floor + 1}층 이상을 찾지 못해 포기해요${up.length ? ` (실제로는 ${up.length}개 있지만 어려운 식이에요)` : ""}.`,
        why: HR.t ? `${staged(V, me, HR.t).btn} 성공하면 내가 ${HR.t.f}점으로 앞서고 ${oi} 다시 도전해야 해요. 틀려도 감점은 없어요 (${V.wrongMax}번까지).` : "도전 중 틀려도 감점은 없지만 못 만드는 목표는 시간만 써요. 포기하면 상대가 지금 층 점수만 가져가요.",
      };
      return {
        opp: `${oi} 내가 만든 ${V.floor}층 위로 도전 중이에요.`,
        mine: `${base}. 내가 ${V.floor}층을 만들었고, 더 높은 층 중 만들 수 있는 것은 ${up.length}개예요.`,
        rec: "결과를 기다려요. 상대가 더 높은 층을 만들면 이번엔 내가 도전해요.",
        why: up.length ? `더 높은 층이 ${up.length}개 있어서 상대가 찾을 수 있어요(고급 기준 ${pct(1 - up.reduce((q, t) => q * (1 - M.FIND.hard[M.diffOf(t.cost)]), 1))}).` : `더 높은 층을 만들 수 있는 방법이 없어서 이 ${V.floor}점은 지켜졌어요.`,
      };
    }
    // 불가능 선언 뒤
    const dm = V.decl === me, HI = dm ? { t: null } : hardMove(V, me, P.tab);
    if (dm) return {
      opp: `${oi} 1분 안에 목표 하나를 만들어 보려고 해요. 만들면 내가 −3점이에요.`,
      mine: `${base}. 내가 불가능을 선언했어요. ${stat}.`,
      rec: "기다려요.",
      why: P.n ? `사실 ${P.n}개를 만들 수 있어서 상대가 찾을 확률은 ${pct(P.q)} 안팎이에요 — 못 찾기를 바라야 해요.` : "실제로 하나도 못 만들어서 +5점이 확정에 가까워요.",
    };
    return {
      opp: `${oi} 불가능을 선언했어요 — 내가 하나라도 만들면 ${oi} −3점이에요.`,
      mine: `${base}. ${stat}.`,
      rec: HI.t ? staged(V, me, HI.t).head.replace("를 만들어요", "를 선언해요") + ` (선언한 쪽 −3 · 나 +${HI.t.f})` : `🙋 <b>포기</b>해요 — ${P.n ? "고급 AI는 이 목표들을 찾지 못해요" : "만들 수 있는 목표가 없어요"} (상대 +5점).`,
      why: HI.t ? `${staged(V, me, HI.t).btn} 낮은 층이라도 하나만 만들면 ${HI.t.f + 3}점 차이로 이겨요.` : "정말 만들 수 없으면 +5점을 내줄 수밖에 없어요.",
    };
  }

  // ── 복기 글 ──
  const kindOf = (V, a) => {
    if (!a) return { k: "none", f: 0 };
    if (a.t === "pass") return { k: "pass", f: 0 };
    if (a.t === "imp") return { k: "imp", f: 0 };
    const r = V && V.ops ? M.evalRpn(a.rpn, V.ops) : null;
    if (!r || !r.ok) return { k: "ans", f: 0, bad: true };
    const v = r.v[1] === 1 ? r.v[0] : null, f0 = v != null ? M.floorOf(V.rows, v) : 0, low = V.phase === "raise" && f0 > 0 && f0 <= V.floor;
    return { k: "ans", f: low ? 0 : f0, f0, low, v, s: v != null ? v : fstr(r.v), e: M.infix(a.rpn, V.ops) };
  };
  function actText(a, V, names) {
    if (!a) return "—";
    if (a.t === "pass") return V && (V.phase === "raise" || V.phase === "imp") ? "포기" : "넘김";
    if (a.t === "imp") return "불가능 선언";
    if (a.t !== "ans") return "행동";
    const k = V && V.ops ? kindOf(V, a) : null;
    return k && k.e ? `선언 ${k.e} = ${k.s} ${k.f ? `(${k.f}층)` : "(목표에 없음)"}` : "정답 선언";
  }
  function review(Vb, seat, myA, bestA) {
    if (!Vb || !Vb.ops) return null;
    const P = plan(Vb), my = kindOf(Vb, myA), bs = kindOf(Vb, bestA), top = P.top, ph = Vb.phase;
    const stat = P.n ? `만들 수 있는 목표 ${P.n}개 (${byFtxt(P)})` : "만들 수 있는 목표가 하나도 없었어요";
    const ex = t => `${t.f}층 ${t.v} = ${M.infix(t.rpn, Vb.ops)}`;
    const best = bs.k === "ans" && bs.e ? `${bs.f}층 ${bs.v} = ${bs.e}` : bs.k === "imp" ? "불가능 선언" : bs.k === "pass" ? (ph === "open" ? "넘김" : "포기") : "";
    const mine = my.k === "ans" && my.e ? `${my.f ? `${my.f}층 ${my.v}` : my.low ? `${my.f0}층 ${my.v}(이미 나온 층 이하)` : "목표에 없는 값 " + my.s} = ${my.e}` : my.k === "imp" ? "불가능 선언" : my.k === "pass" ? (ph === "open" ? "넘김" : "포기") : "";
    let sev = 0, why = "";
    if (my.bad) { sev = 0; why = "규칙에 맞지 않는 식이에요."; }
    else if (my.k === "ans" && my.f === 0) {
      sev = ph === "open" ? 85 : 25;
      why = my.low ? `${my.f0}층 ${my.v} = ${my.e}${ja(my.e,"은")} 이미 나온 ${Vb.floor}층 이하라 도전이 안 돼요 (감점 없음). ${stat}.` : ph === "open" ? `오답 −1점: ${my.e} = ${my.s}${ja(my.s,"은")} 피라미드에 없어요. ${stat}${top ? ` — 예: ${ex(top)}` : ""}.` : `도전 중 틀린 시도예요 (감점 없음, ${Vb.wrongMax}번까지). ${stat}.`;
    } else if (my.k === "imp") {
      if (P.n > 0) { sev = 92; why = `불가능이 아니었어요: ${stat} (예 ${ex(top)}). 상대가 찾으면 −3점에 상대 +${top.f}점이에요. 고급 상대가 찾을 확률 ${pct(P.q)}.`; }
    } else if (my.k === "pass") {
      if (bs.k === "ans" && bs.f > (ph === "raise" ? Vb.floor : 0)) {
        sev = Math.min(88, 22 + 16 * bs.f); why = `${ph === "open" ? "넘겼지만" : ph === "imp" ? "포기했지만" : "포기했지만"} ${bs.f}층 ${bs.v} = ${bs.e}${ja(bs.e,"을")} 만들 수 있었어요. ${stat}.${ph === "imp" ? ` 만들었다면 상대 −3 · 나 +${bs.f}.` : ""}`;
      } else if (bs.k === "imp" && P.n === 0) { sev = 58; why = `불가능 선언으로 +5점을 얻을 수 있었어요: ${stat}. 상대가 찾을 방법이 없어요.`; }
    } else if (my.k === "ans" && bs.k === "ans" && my.f < bs.f) {
      sev = Math.min(88, 22 + 18 * (bs.f - my.f)); why = `${my.f}층 ${my.v}에서 멈췄어요 — ${bs.f}층 ${bs.v} = ${bs.e} 까지 만들 수 있었어요. ${stat}. 낮은 층을 먼저 선언하면 상대가 더 높은 층을 찾을 기회가 생겨요(고급 상대 ${pct(P.q)}).`;
    } else if (my.k === "ans" && bs.k !== "ans") { sev = 0; }
    return { sev, why, my: mine, best };
  }

  // ── 1분 규칙 ──
  const TOPS = [[15, 20], [24, 31, 44], [9, 13, 27, 38], [11, 16, 21, 35, 40]];
  const TV = { ops: [3, 5, 8], rows: TOPS, floors: [4, 3, 2, 1] };
  let TB = null;
  function tutorial() {
    style();
    const demo = (o, extra = "") => `<div class="py-tut">${opsLine(TV)}${pyrHtml(TV, o || {})}${extra}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "숫자 3개로 피라미드의 목표를 만들어요", body: "라운드마다 <b>연산용 숫자 3개</b>와, 피라미드로 놓인 <b>목표 숫자 14개</b>가 나와요 (4층 2개 · 3층 3개 · 2층 4개 · 1층 5개). 숫자 3개를 <b>모두 한 번씩</b> 써서 목표 중 하나를 만들면 돼요.",
        boardHtml: demo(), ms: 6500 },
      { tag: "STEP 2 · 수식", title: "+ − × ÷ 와 제곱 · 세제곱 · 루트", body: "쓸 수 있는 기호는 <b>+ − × ÷</b> 와 <b>² ³ √</b> (식 전체에서 한 번, 루트는 제곱수만). 예: 3 · 5 · 8로 <b>8 × (5 − 3) = 16</b> — 1층 목표 16을 만들어요.",
        boardHtml: demo({ hit: 16 }, `<div class="row"><span class="big">8 × (5 − 3) = 16</span></div><small>숫자를 눌러 식을 만드는 방법은 다음 단계에서 해 봐요</small>`), ms: 6500 },
      { tag: "STEP 3 · 직접", title: "3 · 5 · 8로 16을 만들어 보세요", body: "숫자(조각)를 누르고 → 기호를 누르고 → 다른 숫자를 누르면 하나로 합쳐져요. 숫자 3개가 모두 하나로 합쳐졌을 때 <b>16</b>이 되게 해 보세요 (예: 8 × (5 − 3), 3 + 5 + 8).",
        interactive: { hint: "👆 숫자 → 기호 → 숫자 순서로 눌러요 (목표 16)", doneText: "✅ 16! 이렇게 식을 만들어요" },
        render(stage, ctrl) {
          TB = bNew("tut", TV.ops); let done = false, msg = "";
          const draw = () => {
            const v = bVal(TB);
            stage.innerHTML = `<div class="py-tut"><div class="row"><span>목표 <b class="big">16</b></span><small>(1층 · 1점)</small></div>${chipsHtml(TB, done)}<div class="py-val">${v ? `= <b>${esc(fstr(v))}</b>` : TB.sel >= 0 ? (TB.op ? `<b>${esc(SYM[TB.op])}</b> 뒤에 이을 숫자를 눌러요` : "기호를 눌러요") : "숫자부터 눌러요"}</div>${opsHtml(TB, done)}<div class="py-act"><button type="button" class="btn" data-a="undo" ${TB.undo.length ? "" : "disabled"}>↩ 되돌리기</button><button type="button" class="btn" data-a="clear">🗑 처음부터</button></div><div class="msg">${esc(msg)}</div></div>`;
          };
          stage.onclick = e => {
            const t = e.target.closest("button"); if (!t || t.disabled || done) return;
            const err = bClick(TB, t); if (err === undefined) return;
            msg = err || ""; ctrl.sfx("tap");
            const v = bVal(TB);
            if (v && v[1] === 1 && v[0] === 16) { done = true; msg = `🏆 정답! ${exprOf(TB.chips[0].rpn, TB.ops)} = 16`; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
            if (v) msg = `= ${fstr(v)} — 16이 아니에요. ↩ 되돌리거나 다시 해 봐요`;
            draw();
          };
          draw();
        } },
      { tag: "STEP 4 · 선언 · 도전", title: "선언하면 상대가 더 높은 층에 도전해요", body: "식을 만든 사람이 <b>정답 선언</b>을 해요. 목표에 없는 값이면 <b>−1점</b>! 맞으면 상대에게 <b>30초</b> — 더 높은 층 목표를 만들면 이번엔 내가 도전할 차례예요 (이때는 틀려도 감점 없음). 가장 높은 층을 만든 쪽이 그 <b>층 수만큼</b> 점수를 받아요.",
        boardHtml: demo({ lead: 16, low: 1 }, `<div class="row"><span>🧑 1층(16) ✅</span><span>→</span><span>🤖 더 높은 층 도전!</span></div><small>4층을 만들면 도전 시간 없이 바로 끝나요 (4점)</small>`), ms: 7500 },
      { tag: "STEP 5 · 불가능", title: "아무 목표도 못 만들 것 같다면?", body: "아무도 정답을 선언하지 않았다면 <b>불가능 선언</b>을 할 수 있어요. 상대가 1분 안에 하나도 못 만들면 선언한 쪽 <b>+5점</b>, 하나라도 만들면 선언한 쪽 <b>−3점</b>에 상대는 그 층 점수! 14개를 다 따져 본 뒤에 해요.",
        boardHtml: `<div class="py-tut"><div class="row"><span>🤔 불가능!</span><span>→</span><span>못 찾음 <b class="big">+5</b></span><span>/</span><span>찾음 <b class="big">−3</b></span></div><small>불가능은 정답 선언이 나오기 전에만 할 수 있어요</small></div>`, ms: 6500 },
      { tag: "STEP 6 · 우리 방식", title: "차례를 번갈아 먼저 풀어요", body: "방송은 둘이 동시에 푸는 순발력 싸움이지만, 여기서는 <b>라운드마다 먼저 차례</b>가 번갈아 와요 (선언 · 넘기기 · 불가능 중 하나). 10라운드 뒤 점수가 높은 쪽이 이겨요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 만들 수 있는 목표와 식을 알려 줘요.",
        boardHtml: `<div class="py-tut"><span style="font-size:42px">🔺</span></div>`, ms: 5800 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌X · 피라미드 넘버 (9일차 파이널 1라운드 · 10화) · 확인한 자료: 나무위키 '피의 게임X' 일차 표 · 웨이브 공식 하이라이트 영상";
  const DIFF = "방송과 다른 점: 방송은 둘이 동시에 푸는 순발력 싸움이지만 우리는 라운드마다 먼저 차례를 번갈아 줘요 (선언 · 넘기기 · 불가능, 둘 다 넘기면 점수 없이 끝) · 화면 시계(30초 · 1분)가 끝나면 포기를 대신 눌러 줘요 · 쓸 수 있는 기호는 영상에서 다 확인하지 못해 + − × ÷ 와 제곱 · 세제곱 · 루트(식 전체에서 한 번)로 정했어요 · 목표는 1~60, 연산용 숫자는 1~9 중 서로 다른 3개 · 도전 중 틀린 시도는 4번까지만 받고 넘어가요(끝없는 판을 막으려 우리가 넣은 상한) · 화면에서는 목표에 없는 값은 선언 단추가 잠겨 오답 −1점이 나오지 않아요(AI와 규칙은 방송과 같음)";
  window.SVUI = window.SVUI || {};
  window.SVUI.pyramid = {
    actText, review,
    name: "피라미드 넘버", emoji: "🔺", short: "숫자 3개로 피라미드 속 목표를 만드는 두뇌 대결", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [{ k: "rounds", label: "라운드 수", items: [[10, "10라운드 (방송)"], [5, "5라운드 (짧게)"]], def: 10 }],
    howto: [
      "<b>목표</b> — 10라운드 동안 목표 숫자를 만들어 점수를 모아요 (점수 = 마지막으로 완성한 목표의 층 수, 1층 1점 … 4층 4점)",
      "<b>준비물</b> — 라운드마다 연산용 숫자 3개 + 피라미드로 놓인 목표 숫자 14개 (4층 2 · 3층 3 · 2층 4 · 1층 5)",
      "<b>진행</b> — 연산용 숫자 3개를 <b>모두 한 번씩</b> 써서 목표 하나를 만드는 식을 만들고 <b>정답 선언</b>해요 (+ − × ÷ · ² ³ √ 는 한 번)",
      "<b>승패</b> — 정답이면 상대가 더 높은 층에 도전(틀려도 감점 없음) → 성공하면 다시 상대에게 도전 기회, 가장 높은 층을 만든 쪽이 그 층 점수를 받아요. 오답 선언은 −1점. 10라운드 뒤 점수가 높은 쪽이 승",
      "<b>특수</b> — 아무도 선언하지 않았을 때 <b>불가능 선언</b>: 상대가 1분 안에 하나도 못 만들면 +5점, 만들면 −3점 (상대는 그 층 점수). 도전 중 틀린 시도는 <b>4번까지</b>예요 (넘으면 도전 끝)",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds}라운드 · ${V.phase === "open" ? (V.step ? "이어서 선언" : "먼저 선언") : V.phase === "raise" ? `${V.floor}층 위로 도전` : V.phase === "imp" ? "불가능 선언" : "결과"}`),
    chip: (V, i) => ({ t: `${V.pts[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial,
    qa: (V, me, rnd) => M.ai(V, me, "easy", rnd),
  };
})();

/* 베니 서바이벌 · 수식 피라미드 — 화면 (피라미드 10칸 · 3칸 골라 정답 선언 · 찾은 답 · 라운드 끝 정답 공개 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.eqpyramid;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = K.L;
  const ROWS = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];
  const SYM = { "+": "+", "-": "−", "×": "×", "÷": "÷" };
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 6일차 감옥 매치 (2명)";
  const DIFF = "2~4명 (빈 자리는 AI) · 버저 대신 차례를 번갈아 (한 차례에 답 하나 또는 넘기기, 라운드마다 첫 차례가 돌아감) · 모두 이어서 넘기면 라운드 끝 → 못 찾은 답 공개 · 10초 · 3분 시계 없음 (라운드마다 차례 수 상한) · 문제는 새로 만든 판 (정답 2~8개) 또는 방송 10판 옵션 · 짧게 5라운드 옵션 · 점수가 같으면 공동 순위 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";

  const CSS = `
.ep-top{display:flex;align-items:center;justify-content:center;gap:12px;flex:none}
.ep-tg{display:grid;place-items:center;min-width:74px;padding:3px 12px;border-radius:14px;background:linear-gradient(#7c2d12,#431407);border:2px solid #fb923c;box-shadow:0 0 14px rgba(251,146,60,.35)}
.ep-tg small{font:800 10px var(--round);color:#fed7aa;letter-spacing:.05em}
.ep-tg b{font:900 30px/1.05 var(--round);color:#fff;font-variant-numeric:tabular-nums}
.ep-meta{display:grid;gap:2px;font:700 12px/1.3 var(--round);color:var(--soft)}
.ep-meta b{color:#fde68a}
.ep-pyr{display:grid;gap:5px;justify-items:center;flex:none}
.ep-row{display:flex;gap:5px;justify-content:center}
.ep-c{position:relative;width:64px;height:50px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:linear-gradient(#1e293b,#0f172a);color:#fff;font:900 21px/1 var(--round);display:grid;place-items:center;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ep-c i{position:absolute;left:5px;top:2px;font:800 10px/1.2 var(--round);font-style:normal;color:rgba(255,255,255,.55)}
.ep-c em{position:absolute;right:-6px;top:-7px;width:20px;height:20px;border-radius:50%;background:#fbbf24;color:#111;font:900 12px/20px var(--round);font-style:normal;text-align:center}
.ep-v{font:inherit;white-space:nowrap;display:flex;align-items:baseline;gap:1px;padding-top:6px}
.ep-c.on{border-color:#fbbf24;background:linear-gradient(#78350f,#451a03)}
.ep-c:disabled{cursor:default;opacity:1}
.ep-c .o-×,.ep-c .o-÷{color:#93c5fd}.ep-c .o-\\+,.ep-c .o-−{color:#fca5a5}
.ep-c.hl{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.45)}
.ep-ex{flex:none;text-align:center;font:900 19px/1.3 var(--round);color:#fff;min-height:1.35em;letter-spacing:.02em}
.ep-ex .q{color:#fde68a}.ep-ex small{font:700 12px var(--round);color:var(--soft)}
.ep-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.ep-info b{color:#fde68a}.ep-info .g{color:#86efac}.ep-info .r{color:#fca5a5}
.ep-info.end{font:800 13px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.ep-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.ep-act{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr);gap:6px;flex:none}
.ep-b{min-height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:900 14px/1.15 var(--round);padding:2px 6px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ep-b:disabled{opacity:.35;cursor:default}
.ep-b.go{border:0;background:linear-gradient(#f97316,#c2410c)}
.ep-b.go:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);opacity:1}
.ep-list{flex:none;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;min-height:24px}
.ep-k{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;font:800 11.5px/1.5 var(--round);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;white-space:nowrap}
.ep-k.ok{background:rgba(34,197,94,.18);border-color:rgba(74,222,128,.5)}
.ep-k.me{outline:1.5px solid #fff}
.ep-k.x{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.45);color:#fecaca;text-decoration:line-through}
.ep-k.miss{background:rgba(148,163,184,.12);border-style:dashed;color:#cbd5e1}
.ep-k small{font:700 10px var(--round);color:var(--soft)}
.ep-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.ep-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.ep-tmsg b{color:#fde68a}
.ep-res{display:grid;gap:3px;font-size:12.5px;line-height:1.4}
@media (max-height:700px){.ep-c{width:60px;height:44px;font-size:19px}.ep-pyr{gap:4px}.ep-row{gap:4px}.ep-tg b{font-size:26px}.ep-b{min-height:44px}.ep-info{min-height:2.4em;font-size:12px}.ep-ex{font-size:17px}}
@media (min-height:760px){.ep-c{width:70px;height:56px;font-size:23px}.ep-b{min-height:52px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const nmOf = (names, s, me) => (s === me ? "나" : (names && names[s]) || `${s + 1}번`);
  const seatNames = ctx => (ctx.seats || []).map((x, i) => (x && x.name) || `${i + 1}번`);
  const cellTxt = c => `${SYM[c.op]}${c.n}`;
  const exprHtml = (cells, k) => {
    if (!k.length) return "";
    const p = [...k].map((ch, j) => { const c = cells[L.indexOf(ch)]; return j === 0 ? `${c.n}` : `${SYM[c.op]} ${c.n}`; });
    return p.join(" ");
  };

  let SEL = { key: "" };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.cnt}|${V.phase}|${ctx.me}`; if (SEL.key !== key) SEL = { key, k: "", sent: 0 }; return SEL; };

  function pyrHtml(cells, sel, can, hl, attr) {
    let h = `<div class="ep-pyr">`;
    for (const row of ROWS) {
      h += `<div class="ep-row">`;
      for (const i of row) {
        const ch = L[i], c = cells[i], at = sel.indexOf(ch);
        const extra = attr ? attr(ch) : "";
        h += `<button type="button" class="ep-c${at >= 0 ? " on" : ""}${hl && hl.includes(ch) ? " hl" : ""}" data-c="${ch}"${can ? "" : " disabled"}${extra} aria-label="${ch} ${cellTxt(c)}"><i>${ch}</i><b class="ep-v"><span class="o-${SYM[c.op]}">${SYM[c.op]}</span>${c.n}</b>${at >= 0 ? `<em>${at + 1}</em>` : ""}</button>`;
      }
      h += `</div>`;
    }
    return h + `</div>`;
  }
  function listHtml(V, me, names, showMiss) {
    const got = new Set(V.found.map(x => x.k));
    let h = V.found.map(x => `<span class="ep-k ok${x.s === me ? " me" : ""}" data-k="${x.k}">${x.k} <small>${esc(nmOf(names, x.s, me))}</small></span>`).join("");
    const bad = V.tries.filter(x => x.res === "wrong" || x.res === "dup").slice(-3);
    h += bad.map(x => `<span class="ep-k x" data-k="${x.k}">${x.k} <small>${esc(nmOf(names, x.s, me))} −1</small></span>`).join("");
    if (showMiss && V.ans) h += V.ans.filter(k => !got.has(k)).map(k => `<span class="ep-k miss" data-k="${k}">${k} <small>${exprHtml(V.cells, k)}</small></span>`).join("");
    return `<div class="ep-list">${h || `<span class="ep-k"><small>아직 찾은 답 없음</small></span>`}</div>`;
  }
  function lastTry(V, me, names) {
    const t = V.tries[V.tries.length - 1]; if (!t) return "";
    const who = esc(nmOf(names, t.s, me));
    if (t.res === "pass") return `${who} 넘김`;
    const ex = exprHtml(V.cells, t.k);
    if (t.res === "ok") return `${who} <b>${t.k}</b> = ${ex} = ${V.target} <span class="g">정답 +1</span>`;
    if (t.res === "dup") return `${who} <b>${t.k}</b> — 이미 나온 답 <span class="r">−1</span>`;
    return `${who} <b>${t.k}</b> = ${ex} = ${t.v} <span class="r">오답 −1</span>`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, S = selFor(V, ctx), names = seatNames(ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    const rend = V.phase === "rend" || over;
    const B = rend && V.last ? V.last : null;
    const cells = B ? B.cells : V.cells, target = B ? B.target : V.target;
    let h = `<div class="ep-top"><div class="ep-tg"><small>타깃 넘버</small><b>${target}</b></div><div class="ep-meta"><span>라운드 <b>${B ? B.round : V.round}</b> / ${V.R}</span><span>찾은 답 <b>${(B ? B.found : V.found).length}</b>${rend ? ` / ${(B ? B.ans : V.ans || []).length}` : ""}개</span></div></div>`;
    h += pyrHtml(cells, can ? S.k : "", can, null);
    h += `<div class="ep-ex">${can ? (S.k.length ? `${exprHtml(cells, S.k)} <span class="q">= ?</span>` : `<small>칸 3개를 순서대로 눌러요</small>`) : ""}</div>`;
    let info = "", ic = "";
    if (over) {
      const top = Math.max(...V.sc), w = V.sc.map((x, s) => s).filter(s => V.sc[s] === top);
      info = me >= 0 ? (w.includes(me) ? (w.length > 1 ? `🏆 공동 1위 (${top}점)` : `🏆 이겼어요! ${top}점`) : `${V.ranks[me] + 1}위 (${V.sc[me]}점) — 1위 ${esc(w.map(s => nmOf(names, s, me)).join(" · "))} ${top}점`) : `🏆 ${esc(w.map(s => nmOf(names, s, me)).join(" · "))} 1위 (${top}점)`;
      ic = me >= 0 && V.ranks[me] > 0 ? " end bad" : " end";
    } else if (rend && B) {
      const missed = B.ans.length - B.found.length;
      info = `라운드 ${B.round} 끝 — ${B.why === "all" ? "정답을 모두 찾았어요" : B.why === "pass" ? "모두 넘겨서 끝" : "차례를 다 써서 끝"}${missed ? ` · 못 찾은 답 <b>${missed}개</b> (점선)` : ""}`;
    } else if (can) info = `🎯 내 차례 — 답을 말하거나 넘겨요${V.tries.length ? ` · 직전 ${lastTry(V, me, names)}` : ""}`;
    else info = V.tries.length ? lastTry(V, me, names) : `${esc(nmOf(names, V.turn, me))} 차례…`;
    h += `<div class="ep-info${ic}"><span>${info}</span></div>`;
    if (can) h += `<div class="ep-act"><button type="button" class="ep-b" data-x="clear"${S.k ? "" : " disabled"}>지우기</button><button type="button" class="ep-b" data-x="pass">넘기기</button><button type="button" class="ep-b go" data-x="say"${S.k.length === 3 ? "" : " disabled"}>${S.k.length === 3 ? `${S.k} 정답 선언` : `${3 - S.k.length}칸 더`}</button></div>`;
    h += rend && B ? listHtml({ found: B.found, tries: [], ans: B.ans, cells: B.cells }, me, names, true) : listHtml(V, me, names, false);
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 10000)) return;   // 보낸 수가 반영되면 SEL 이 새로 생김
      const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
      const d = t.dataset;
      if (d.c) {
        const at = S.k.indexOf(d.c);
        if (at >= 0) S.k = S.k.replace(d.c, ""); else if (S.k.length < 3) S.k += d.c;
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (d.x === "clear") { S.k = ""; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      if (d.x === "pass") send({ t: "pass" });
      else if (d.x === "say" && S.k.length === 3) send({ t: "say", k: S.k });
    };
  }

  function actText(a, V) {
    if (!a) return "";
    if (a.t === "pass") return "넘기기";
    if (a.t === "say" && K.isK(a.k)) return V && V.cells ? `${a.k} (${exprHtml(V.cells, a.k)} = ${K.valTxt(K.evalK(V.cells, a.k))})` : `${a.k} 선언`;
    return "";
  }

  // ── 선생님 ──
  let CC = { key: "", r: null };
  function recOf(V, me) { const key = `${V.pub}|${V.round}|${V.cnt}|${me}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me) }; return CC.r; }
  function wayOf(cells, k) {
    const i = L.indexOf(k[0]), j = L.indexOf(k[1]), m = L.indexOf(k[2]);
    const a = cells[i].n, b = cells[j].n, c = cells[m].n, o1 = cells[j].op, o2 = cells[m].op, hi = o => o === "×" || o === "÷";
    if (!hi(o1) && hi(o2)) { const t = K.calc2(b, o2, c); return `뒤 두 칸 먼저: ${b} ${SYM[o2]} ${c} = ${t} → ${a} ${SYM[o1]} ${t}`; }
    const t = K.calc2(a, o1, b); return `앞 두 칸 먼저: ${a} ${SYM[o1]} ${b} = ${t} → ${t} ${SYM[o2]} ${c}`;
  }
  function coach(V, me, since, names) {
    const watch = !(me >= 0 && me < V.n);
    if (watch) me = -1;
    const nm = s => esc(nmOf(names, s, me));
    const p = [];
    const others = V.tries.filter(x => x.s !== me).slice(-3);
    if (others.length) p.push(`최근: ${others.map(x => (x.res === "pass" ? `${nm(x.s)} 넘김` : `${nm(x.s)} ${x.k} ${x.res === "ok" ? "정답" : x.res === "dup" ? "중복 −1" : `오답(${x.v}) −1`}`)).join(" / ")}.`);
    else p.push(`라운드 ${V.round} 시작 — 타깃 ${V.target}.`);
    p.push(`점수 ${V.sc.map((x, s) => `${nm(s)} ${x}`).join(" · ")}.`);
    if (V.hist.length) { const h = V.hist[V.hist.length - 1]; p.push(`지난 라운드 정답 ${h.nAns}개 중 ${h.found.length}개가 나왔어요.`); }
    if (watch) return { opp: p.join(" "), mine: `찾은 답 ${V.found.length}개 · 이번 라운드 시도 ${V.tries.length}번.`, rec: "구경 중이에요.", why: "" };
    const mineOk = V.found.filter(x => x.s === me).length, mineBad = V.tries.filter(x => x.s === me && (x.res === "wrong" || x.res === "dup")).length;
    let m = `내 점수 ${V.sc[me]} (${V.ranks[me] + 1}위) · 이번 라운드 내 정답 ${mineOk}개 · 오답 ${mineBad}개.`;
    m += ` 계산 순서: 곱셈 · 나눗셈 먼저, 첫 칸은 부호 없이 숫자만.`;
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (V.phase !== "play") rec = "다음 라운드를 기다려요.";
    else if (!V.needs.includes(me)) rec = "내 차례가 되면 추천해 드려요.";
    else {
      const R = recOf(V, me);
      if (R.a.t === "pass") { rec = "넘기기."; why = `남은 정답이 없어요 — 말하면 오답 −1. 모두 이어서 넘기면 라운드가 끝나요.`; }
      else {
        const k = R.a.k, ex = exprHtml(V.cells, k);
        rec = `${k} — ${ex} = ${V.target}.`;
        why = `${wayOf(V.cells, k)} → ${V.target}. 아직 안 나온 정답이 ${R.rows.length}개 있어요${R.rows.length > 1 ? ` (가장 쉬운 것부터 · 다음은 ${R.rows[1].k})` : ""}. 틀리면 −1 이니 확실할 때만 선언해요.`;
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const loss = J.best - J.my;
    const sev = loss >= 2 ? 80 : loss >= 1 ? (J.my < 0 ? 70 : 45) : 5;
    let why;
    if (J.my < 0 && myA.t === "say") why = Vb.found && Vb.found.some(x => x.k === myA.k) ? "이미 나온 답이라 −1 — 찾은 답 목록을 먼저 봐요" : `값이 ${K.valTxt(K.evalK(Vb.cells, myA.k))} 라서 오답 −1 — ${bestA.t === "say" ? `${best} 가 정답` : "모르면 넘기는 게 0점"}`;
    else if (J.my === 0 && J.best > 0) why = `남은 정답이 ${J.left}개 있었어요 — ${best}`;
    else why = "좋은 수예요";
    return { sev, why, my, best };
  }

  function result(V, me, names) {
    const who = s => (s === me ? " 나" : names && names[s] ? ` ${esc(names[s])}` : ` ${s + 1}번`);
    const order = V.sc.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const tot = V.hist.reduce((a, h) => a + h.nAns, 0), got = V.hist.reduce((a, h) => a + h.found.length, 0);
    return `<div class="ep-res"><div>${V.R}라운드 · 정답 ${tot}개 중 ${got}개 찾음</div>${order.map(s => `<div>${V.ranks[s] + 1}위${who(s)} <b>${V.sc[s]}점</b> — 정답 ${V.hist.reduce((a, h) => a + h.found.filter(x => x.s === s).length, 0)}개</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const B1 = K.TV[0];   // 방송 1라운드: 타깃 10
    const tb = x => `<div class="ep-tut">${x}</div>`;
    const top = t => `<div class="ep-top"><div class="ep-tg"><small>타깃 넘버</small><b>${t}</b></div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "타깃 넘버 만들기", body: "피라미드 10칸 중 <b>3칸</b>을 골라 <b>타깃 넘버</b>가 되는 수식을 만들어요. 정답 하나에 <b>+1점</b>, 10라운드 뒤 점수가 높은 사람이 이겨요.",
        boardHtml: tb(top(B1.target) + pyrHtml(B1.cells, "", false, null)), ms: 6400 },
      { tag: "STEP 2 · 준비물", title: "부호 + 숫자 칸 10개", body: "칸마다 <b>+ − × ÷</b> 부호와 숫자가 있어요 (A~J). 라운드마다 새 피라미드와 타깃 넘버가 나와요. 정답이 몇 개인지는 알려 주지 않아요.",
        boardHtml: tb(pyrHtml(B1.cells, "", false, ["A", "B", "C", "D"])), ms: 6000 },
      { tag: "STEP 3 · 계산", title: "첫 칸은 숫자만", body: "고른 순서대로 이어 써요. <b>첫 칸의 부호는 무시</b>하고, 계산은 <b>곱셈 · 나눗셈 먼저</b>. 예) B · J · D = 5 × 3 − 5 = <b>10</b>.",
        boardHtml: tb(pyrHtml(B1.cells, "BJD", false, null) + `<div class="ep-ex">5 × 3 − 5 <span class="q">= 10</span></div>`), ms: 7200 },
      { tag: "STEP 4 · 점수", title: "틀리면 −1", body: "맞히면 <b>+1</b>. 값이 다르거나 <b>이미 나온 답</b>을 또 말하면 <b>−1</b>. 순서가 다르면 다른 답 — J · B · D 는 3 ÷ 5 − 5 라 오답이에요.",
        boardHtml: tb(`<div class="ep-list"><span class="ep-k ok">BJD <small>나 +1</small></span><span class="ep-k x">JBD <small>가 −1</small></span><span class="ep-k x">BJD <small>가 중복 −1</small></span></div>`), ms: 6600 },
      { tag: "STEP 5 · 직접", title: "7 + 9 ÷ 3", body: "타깃 <b>10</b>. A(×7)를 첫 칸으로 쓰면 그냥 7. 다음 C(+9), H(÷3) — 나눗셈이 먼저라 7 + 3 = 10! <b>A → C → H</b> 순서로 누르고 선언해요.",
        interactive: { hint: "👆 A → C → H → 정답 선언", doneText: "✅ ACH = 7 + 9 ÷ 3 = 10 → +1점" },
        render(stage, ctrl) {
          let k = "", done = false, msg = "A 칸부터 눌러요";
          const want = "ACH";
          const draw = () => {
            const onPath = want.startsWith(k), tp = done || !onPath ? "" : k.length < 3 ? want[k.length] : "";
            let h = top(B1.target) + pyrHtml(B1.cells, k, !done, done ? [...want] : null, ch => (ch === tp ? ' data-tp="1"' : ""));
            h += `<div class="ep-ex">${k ? `${exprHtml(B1.cells, k)} <span class="q">= ${done ? 10 : "?"}</span>` : ""}</div>`;
            if (!done) h += `<div class="ep-act"><button type="button" class="ep-b" data-x="clear"${k ? "" : " disabled"}${!onPath ? ' data-tp="1"' : ""}>지우기</button><button type="button" class="ep-b" data-x="pass" disabled>넘기기</button><button type="button" class="ep-b go" data-x="say"${k.length === 3 ? "" : " disabled"}${k === want ? ' data-tp="1"' : ""}>${k.length === 3 ? `${k} 정답 선언` : `${3 - k.length}칸 더`}</button></div>`;
            stage.innerHTML = `<div class="ep-tut">${h}<div class="ep-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
            const d = t.dataset;
            if (d.c) { const at = k.indexOf(d.c); if (at >= 0) k = k.replace(d.c, ""); else if (k.length < 3) k += d.c; ctrl.sfx("tap"); msg = k.length === 3 ? (k === want ? "<b>정답 선언</b>을 눌러요" : `${exprHtml(B1.cells, k)} = ${K.valTxt(K.evalK(B1.cells, k))} — 10이 아니에요. 지우고 A → C → H!`) : `${exprHtml(B1.cells, k)} …`; draw(); return; }
            if (d.x === "clear") { k = ""; ctrl.sfx("tap"); msg = "A 칸부터 눌러요"; draw(); return; }
            if (d.x === "say") {
              const v = K.evalK(B1.cells, k);
              if (!(v && v[1] === 1 && v[0] === 10)) { ctrl.sfx("tap"); msg = `${K.valTxt(v)} 라서 오답이에요 (실제 게임이면 −1). 지우고 다시!`; k = ""; draw(); return; }
              done = true; ctrl.sfx("win"); msg = "🏆 <b>ACH = 7 + 9 ÷ 3 = 10</b> → 정답 +1점!"; draw(); ctrl.complete();
            }
          };
          draw();
        } },
      { tag: "STEP 6 · 진행 · 끝", title: "번갈아 · 모두 넘기면 끝", body: "방송은 버저 싸움이지만 여기서는 <b>차례를 번갈아</b> 한 번에 답 하나 또는 <b>넘기기</b>. 정답을 다 찾거나 <b>모두 이어서 넘기면</b> 라운드 끝 → 못 찾은 답을 보여 줘요. 🧑‍🏫 선생님은 아직 안 나온 정답과 계산 순서를 알려 줘요.",
        boardHtml: tb(`<div class="ep-list"><span class="ep-k ok">BJD <small>나</small></span><span class="ep-k ok">JHC <small>가</small></span><span class="ep-k miss">CEI <small>9 × 2 − 8</small></span></div>`), ms: 7200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.eqpyramid = {
    name: "수식 피라미드", emoji: "🔢", short: "피라미드 10칸 중 3칸으로 타깃 넘버 만들기 — 첫 칸 부호는 무시, 곱셈 · 나눗셈 먼저, 틀리면 −1", min: 2, max: 4, defN: 2, board: false,
    opts: [
      { k: "src", label: "문제", items: [["new", "새 문제"], ["tv", "방송 10판"]], def: "new" },
      { k: "rounds", label: "라운드", items: [[10, "10라운드"], [5, "5라운드 (짧게)"]], def: 10 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 피라미드 칸 3개로 <b>타깃 넘버</b>가 되는 수식 만들기 — 정답 하나에 +1점, 10라운드 뒤 점수가 높은 사람이 이김",
      "준비물: 라운드마다 <b>10칸 피라미드</b>(A~J, 칸마다 + − × ÷ 와 숫자)와 <b>타깃 넘버</b> 공개",
      "진행: 3칸을 순서대로 골라 선언 — <b>같은 칸은 두 번 못 씀</b>, <b>첫 칸의 부호는 무시</b> (숫자만)",
      "계산: <b>사칙 연산 순서</b> (곱셈 · 나눗셈 먼저) — 예) 타깃 10 · A ×7 · C +9 · H ÷3 → 7 + 9 ÷ 3 = 10",
      "점수: 정답 <b>+1</b> · 오답 또는 <b>이미 나온 답</b> <b>−1</b>",
      "끝: 모든 정답이 나오면 라운드 끝 → 10라운드 뒤 점수가 높은 사람이 승리",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : V.phase === "rend" ? `라운드 ${V.round} 끝` : `라운드 ${V.round}/${V.R} · 타깃 ${V.target}`),
    chip: (V, i) => ({ t: `${V.sc[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

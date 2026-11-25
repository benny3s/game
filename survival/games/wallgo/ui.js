/* 베니 서바이벌 · 벽바둑 — 화면 (7×7 판 · 말 놓기 → 이동 → 벽 · 예상 영역 색 · 1분 규칙) */
(() => {
  "use strict";
  const W = window.SVCores.wallgo;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const R = 7, COL = ["239,68,68", "59,130,246", "34,197,94"], HEX = ["#ef4444", "#3b82f6", "#22c55e"], DN = ["위", "오른쪽", "아래", "왼쪽"];
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
  const CSS = `
.wg-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.wg-pill{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:4px 10px;white-space:nowrap}
.wg-pill.gold{background:rgba(245,179,1,.16);border-color:rgba(245,179,1,.5);color:#fde68a}
.wg-pls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;flex:none}
.wg-pl{display:flex;align-items:center;gap:5px;min-width:0;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);border-radius:10px;padding:4px 6px;font:700 11.5px var(--round)}
.wg-pl.cur{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.wg-pl.out{opacity:.5}
.wg-pl .dot{flex:none;width:12px;height:12px;border-radius:50%;border:1.5px solid #fff}
.wg-pl b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto;min-width:0}
.wg-pl span{flex:none;color:var(--soft);font-size:10.5px;white-space:nowrap}
.wg-lab{display:grid;place-items:center;font:700 10px var(--round);color:var(--soft);height:14px}
.wg-cell{position:relative;aspect-ratio:1/1;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:default;min-width:0}
.wg-cell.go{cursor:pointer}
.wg-cell.dest{outline:3px solid #fde047;outline-offset:-3px;cursor:pointer;background-color:rgba(253,224,71,.16)}
.wg-cell.dest.brk{outline:3px dashed #fb923c;background-color:rgba(251,146,60,.2)}
.wg-cell.dest.cf{outline-color:#fff;background-color:rgba(251,146,60,.45)}
.wg-cell.last{outline:2px dashed rgba(255,255,255,.7);outline-offset:-4px}
.wg-pc{display:block;width:62%;height:62%;background:var(--pc);border:2.5px solid #fff;box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,.45)}
.wg-pc.sq{border-radius:7px}.wg-pc.ci{border-radius:50%}
.wg-pc.fx::after{content:"";position:absolute;right:15%;top:15%;width:7px;height:7px;border-radius:50%;background:#fff;opacity:.85}
.wg-pc.mv{box-shadow:0 0 0 3px rgba(253,224,71,.85),0 2px 6px rgba(0,0,0,.5)}
.wg-pc.can{animation:wgp 1s ease-in-out infinite}
.wg-pc.sel{transform:scale(1.12);box-shadow:0 0 0 3px #fff,0 3px 8px rgba(0,0,0,.5)}
@keyframes wgp{50%{transform:scale(1.08)}}
.wg-wrap{display:grid;grid-template-columns:14px 1fr;width:100%;flex:none}
.wg-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:2px solid #cbd5e1;border-radius:4px}
.wg-cols{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.wg-rows{display:grid;grid-template-rows:repeat(7,minmax(0,1fr))}
.wg-acts{display:grid;gap:6px;flex:none}
.wg-acts .note{text-align:center;font-size:12.5px;color:var(--soft);min-height:16px}
.wg-kinds{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.wg-kinds .btn{padding:8px 4px;font-size:13px}
.wg-kinds .btn.sel{border-color:#fde047;background:rgba(253,224,71,.18)}
.wg-sides{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.wg-sides .btn{padding:9px 2px;font-size:13px}
.wg-sum{display:grid;gap:4px;font-size:12.5px;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.07);border-radius:12px;padding:7px 9px;flex:none}
.wg-sum .r{display:flex;gap:8px;justify-content:space-between;align-items:baseline}
.wg-tut{display:grid;gap:7px;justify-items:center;width:100%}
.wg-tut small{color:var(--soft);text-align:center}
.wg-tut .wg-wrap{max-width:270px}
.wg-tut .wg-sides{width:100%}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let lastSeats = [];
  const nameOf = i => (lastSeats[i] && lastSeats[i].name) || `${i + 1}번`;
  const nm = i => esc(nameOf(i));
  const josa = (i, a, b) => { const s = nameOf(i), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28 ? a : b) : `${a}(${b})`; };

  // ── 판 그리기 (V 와 같은 모양이면 무엇이든: 시험판 · 튜토리얼도 같은 함수) ──
  const mirror = (r, c, d) => [r + DR[d], c + DC[d], (d + 2) % 4];
  function boardHtml(V, o = {}) {
    const lw = o.lastWall, lm = o.lastMove, byCell = {};
    V.pieces.forEach((p, i) => { byCell[p.r * R + p.c] = i; });
    const same = (r, c, d) => { if (!lw) return false; const m = mirror(lw.r, lw.c, lw.d); return (lw.r === r && lw.c === c && lw.d === d) || (m[0] === r && m[1] === c && m[2] === d); };
    const wc = (r, c, d) => (same(r, c, d) ? "#ffffff" : "#fbbf24");
    let cols = `<div class="wg-cols">${"ABCDEFG".split("").map(l => `<span class="wg-lab">${l}</span>`).join("")}</div>`;
    let rows = `<div class="wg-rows">${[1, 2, 3, 4, 5, 6, 7].map(n => `<span class="wg-lab" style="height:auto">${n}</span>`).join("")}</div>`;
    let g = `<div class="wg-grid">`;
    for (let r = 0; r < R; r++) for (let c = 0; c < R; c++) {
      const sh = [];
      if (r > 0 && V.wh[r - 1][c]) sh.push(`inset 0 4px 0 0 ${wc(r, c, 0)}`);
      if (r < R - 1 && V.wh[r][c]) sh.push(`inset 0 -4px 0 0 ${wc(r, c, 2)}`);
      if (c < R - 1 && V.wv[r][c]) sh.push(`inset -4px 0 0 0 ${wc(r, c, 1)}`);
      if (c > 0 && V.wv[r][c - 1]) sh.push(`inset 4px 0 0 0 ${wc(r, c, 3)}`);
      const t = V.terr ? V.terr[r * R + c] : -1, k = `${r},${c}`, dst = o.dest && o.dest[k], pi = byCell[r * R + c];
      let cls = "wg-cell";
      if (dst) cls += ` dest${dst === "brk" ? " brk" : ""}${o.conf === k ? " cf" : ""}`;
      if (o.go && o.go(r, c, pi)) cls += " go";
      if (lm && ((lm.to[0] === r && lm.to[1] === c) || (lm.from[0] === r && lm.from[1] === c))) cls += " last";
      const bg = t >= 0 && !dst ? `background:rgba(${COL[t]},.2);` : "";
      let pc = "";
      if (pi !== undefined) { const p = V.pieces[pi]; pc = `<i class="wg-pc ${p.k}${p.fx ? " fx" : ""}${V.moved === pi ? " mv" : ""}${o.can && o.can.has(pi) ? " can" : ""}${o.sel === pi ? " sel" : ""}" style="--pc:${HEX[p.o]}"></i>`; }
      g += `<div class="${cls}" data-r="${r}" data-c="${c}" style="${bg}${sh.length ? `box-shadow:${sh.join(",")}` : ""}">${pc}</div>`;
    }
    g += `</div>`;
    return `<div class="wg-wrap"><span></span>${cols}${rows}${g}</div>`;
  }

  // ── 상태 ──
  let SEL = null;
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.t}|${V.phase}|${V.qi}`; if (!SEL || SEL.key !== key) SEL = { key, pi: null, conf: null, kind: null }; return SEL; };
  const lastOf = (V, k) => { for (let i = V.log.length - 1; i >= 0; i--) { if (V.log[i].k === k) return V.log[i]; if (V.log[i].k === "round") return null; } return null; };   // 새 라운드가 시작되면 지난 라운드 표시는 안 보임
  const KOK = { sq: "■ 사각 말", ci: "● 원형 말" };

  function strip(V, ctx) {
    const cnt = [0, 0, 0]; for (const x of V.terr) if (x >= 0) cnt[x]++;
    return `<div class="wg-pls">${[0, 1, 2].map(s => {
      const act = V.ord.includes(s), tail = !act ? "🏆 생존" : V.phase === "place" && V.pieces.every(p => p.o !== s) && V.round === 1 ? "말 놓는 중" : `${cnt[s]}칸${V.round === 1 ? ` 🔨${V.broke[s] ? "✗" : "✓"}` : ""}`;
      return `<div class="wg-pl${V.cur === s && !V.over ? " cur" : ""}${act ? "" : " out"}"><i class="dot" style="background:${HEX[s]}"></i><b>${nm(s)}</b><span>${tail}</span></div>`;
    }).join("")}</div>`;
  }
  function r1Html(V) {
    if (!V.r1) return "";
    const sc = V.r1.score, ord = V.r1.order;
    return `<div class="wg-sum"><b>1라운드 끝 — ${nm(V.r1.win)}${josa(V.r1.win, "이", "가")} 1등 (생존 확정)</b><div class="r" style="color:var(--soft)"><span>구역 합 ${ord.map(s => `${nm(s)} ${sc[s]}`).join(" · ")}</span></div></div>`;
  }
  function overHtml(V) {
    const r2 = V.res;
    let h = `<div class="wg-sum"><b>끝!</b>`;
    if (V.r1) h += `<div class="r"><span>1라운드: ${nm(V.r1.win)}${josa(V.r1.win, "이", "가")} 1등</span><span>${V.r1.order.map(s => `${nm(s)} ${V.r1.score[s]}`).join(" · ")}</span></div>`;
    if (r2) h += `<div class="r"><span>2라운드: ${nm(V.w2)}${josa(V.w2, "이", "가")} 이김</span><span>${r2.order.map(s => `${nm(s)} ${r2.score[s]}`).join(" · ")}</span></div>`;
    return h + `</div>`;
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats || lastSeats;
    const me = ctx.me, watch = me < 0, S = selFor(V, ctx);
    const myTurn = ctx.canAct && V.cur === me && !V.over;
    let h = `<div class="wg-top"><span class="wg-pill">${V.over ? "끝" : `${V.round}라운드${V.round === 1 ? " · 3명" : " · 1:1"}`}</span><span class="wg-pill gold">${V.phase === "place" ? "말 놓기" : V.phase === "move" ? "① 말 이동" : V.phase === "wall" ? "② 벽 세우기" : "끝"}</span><span class="wg-pill gold">${V.variant === "ii" ? "Ⅱ (사각 · 원형 말)" : "원작 (사각 말)"}</span></div>`;
    h += strip(V, ctx);
    if (V.round === 2 && V.phase === "place" && V.t === 0 && !V.over) h += r1Html(V);
    const o = { lastWall: lastOf(V, "wall"), lastMove: lastOf(V, "move"), dest: null, can: null, sel: S.pi, conf: S.conf };
    const placeable = myTurn && V.phase === "place";
    if (placeable) o.go = (r, c, pi) => pi === undefined;
    if (myTurn && V.phase === "move") {
      const idxs = new Set(V.moves.map(m => m.p)); o.can = S.pi === null ? idxs : null;
      o.go = (r, c, pi) => (pi !== undefined && idxs.has(pi)) || (S.pi !== null && o.dest && o.dest[`${r},${c}`]);
      if (S.pi !== null) { o.dest = {}; for (const m of V.moves) if (m.p === S.pi) { const k = `${m.to[0]},${m.to[1]}`; if (o.dest[k] !== "ok") o.dest[k] = m.brk === null ? "ok" : "brk"; } }
    }
    h += boardHtml(V, o);

    let acts = "";
    if (V.over) acts = overHtml(V);
    else if (V.phase === "place") {
      if (placeable) {
        const left = V.pool[me];
        if (!S.kind || !left[S.kind]) S.kind = left.sq ? "sq" : "ci";
        acts = V.variant === "ii" ? `<div class="wg-kinds">${["sq", "ci"].map(k => `<button class="btn${S.kind === k ? " sel" : ""}" data-kind="${k}" ${left[k] ? "" : "disabled"}>${KOK[k]} ${left[k]}</button>`).join("")}</div>` : "";
        acts += `<div class="note">${V.variant === "ii" ? `${KOK[S.kind]} 을 ` : "말을 "}놓을 <b>빈 칸</b>을 눌러요 (남은 말 ${left.sq + left.ci}개)</div>`;
      } else acts = `<div class="note">${V.cur >= 0 ? `${nm(V.cur)} 차례 — 말을 놓는 중…` : ""}</div>`;
    } else if (V.phase === "move") {
      if (myTurn) acts = `<div class="note">${S.pi === null ? "움직일 <b>내 말</b>을 눌러요 (깜빡이는 말)" : `갈 곳을 눌러요 <b>(노란 테두리)</b>${V.round === 1 && !V.broke[me] ? " · 주황 점선 = 벽 부수기(한 번뿐, 두 번 눌러 확정)" : ""}`}</div>${S.pi !== null ? `<button class="btn" data-a="cancel">↩ 다른 말 고르기</button>` : ""}`;
      else acts = `<div class="note">${V.cur >= 0 ? `${nm(V.cur)} 차례${V.needs.length ? " — 말을 움직이는 중…" : " — 움직일 말이 없어 넘겨요"}` : ""}</div>`;
    } else if (V.phase === "wall") {
      if (myTurn) acts = `<div class="note">움직인 말의 <b>어느 면</b>에 벽을 세울까요? (꼭 한 곳)</div><div class="wg-sides">${[0, 1, 2, 3].map(d => `<button class="btn" data-wall="${d}" ${V.sides.includes(d) ? "" : "disabled"}>${["▲ 위", "▶ 오른쪽", "▼ 아래", "◀ 왼쪽"][d]}</button>`).join("")}</div>`;
      else acts = `<div class="note">${V.cur >= 0 ? `${nm(V.cur)}${josa(V.cur, "이", "가")} 벽을 세우는 중…` : ""}</div>`;
    }
    h += `<div class="wg-acts">${acts}</div>`;
    stage.innerHTML = h;
    const redo = () => render(stage, V, ctx);
    stage.onclick = e => {
      const kb = e.target.closest("[data-kind]");
      if (kb && !kb.disabled) { S.kind = kb.dataset.kind; ctx.sfx("tap"); redo(); return; }
      const wb = e.target.closest("[data-wall]");
      if (wb && !wb.disabled) { ctx.sfx("pop"); const r = ctx.act({ t: "wall", d: +wb.dataset.wall }); if (r && r.ok === false && r.err) ctx.toast(r.err); return; }
      const cb = e.target.closest("[data-a=cancel]");
      if (cb) { S.pi = null; S.conf = null; ctx.sfx("tap"); redo(); return; }
      const cell = e.target.closest(".wg-cell");
      if (!cell || !myTurn) return;
      const r = +cell.dataset.r, c = +cell.dataset.c, pi = V.pieces.findIndex(p => p.r === r && p.c === c);
      if (V.phase === "place") {
        if (pi >= 0) return;
        ctx.sfx("pop"); const res = ctx.act({ t: "place", k: V.variant === "ii" ? S.kind : "sq", r, c }); if (res && res.ok === false && res.err) ctx.toast(res.err); return;
      }
      if (V.phase !== "move") return;
      if (pi >= 0 && V.pieces[pi].o === me) { if (V.moves.some(m => m.p === pi)) { S.pi = S.pi === pi ? null : pi; S.conf = null; ctx.sfx("tap"); redo(); } else ctx.toast("그 말은 움직일 수 없어요"); return; }
      if (S.pi === null) return;
      const cand = V.moves.filter(m => m.p === S.pi && m.to[0] === r && m.to[1] === c).sort((a, b) => (a.brk === null ? 0 : 1) - (b.brk === null ? 0 : 1));
      if (!cand.length) return;
      const mv = cand[0], key = `${r},${c}`;
      if (mv.brk !== null && S.conf !== key) { S.conf = key; ctx.sfx("tap"); redo(); return; }
      ctx.sfx("pop"); const res = ctx.act({ t: "move", p: mv.p, dirs: mv.dirs, brk: mv.brk }); if (res && res.ok === false && res.err) ctx.toast(res.err);
    };
  }

  function result(V) { return V.over ? overHtml(V) : ""; }

  // ── 1분 규칙 ──
  function demo(pieces, o = {}) {
    const S = { round: 1, variant: "ii", wh: Array.from({ length: R - 1 }, () => Array(R).fill(false)), wv: Array.from({ length: R }, () => Array(R - 1).fill(false)), pieces, broke: [false, false, false], pool: [], ord: [0, 1] };
    for (const [r, c, d] of o.walls || []) { if (d === 0) S.wh[r - 1][c] = true; else if (d === 2) S.wh[r][c] = true; else if (d === 1) S.wv[r][c] = true; else S.wv[r][c - 1] = true; }
    return { ...S, terr: o.noTerr ? null : W.terr(S, [0, 1]), moved: -1 };
  }
  const P = (o, k, r, c) => ({ o, k, r, c, fx: false });
  function tutorial() {
    style();
    const sqMoves = [[1, 3], [2, 3], [4, 3], [5, 3], [3, 1], [3, 2], [3, 4], [3, 5]];
    const sepWalls = []; for (let r = 0; r < R; r++) sepWalls.push([r, 2, 1]);
    return [
      { tag: "STEP 1 · 목표", title: "말을 움직이고 벽을 세워 내 영역을 넓혀요", body: "7×7 판에서 차례마다 <b>① 말 하나 이동 → ② 그 말의 한 면에 벽 설치</b>를 해요. 벽으로 판이 갈라지면, 내 말이 있는 구역의 <b>칸 수 합</b>이 가장 큰 사람이 이겨요.",
        boardHtml: `<div class="wg-tut">${boardHtml(demo([P(0, "sq", 2, 1), P(1, "sq", 4, 5)], { walls: [[2, 1, 1], [3, 3, 2]] }), { })}<small>색 = 그 말이 먼저 닿을 수 있는 칸(예상 영역)</small></div>`, ms: 7200 },
      { tag: "STEP 2 · 직접", title: "사각 말은 한 방향으로 1~2칸", body: "사각 말(■)은 위·아래·왼쪽·오른쪽 <b>한 방향으로 1칸 또는 2칸</b> 갈 수 있어요. 다른 말이 있는 칸이나 벽 너머로는 못 가요. 가운데 말이 갈 수 있는 칸을 눌러 보세요.",
        interactive: { hint: "👆 갈 수 있는 칸을 눌러요", doneText: "✅ 한 방향으로 1~2칸 — 맞아요!" },
        render(stage, ctrl) {
          const V = demo([P(0, "sq", 3, 3), P(1, "sq", 0, 0)], { noTerr: true });
          const draw = msg => {
            stage.innerHTML = `<div class="wg-tut">${boardHtml(V, {})}<small>${msg || "하나만 눌러 보세요"}</small></div>`;
            stage.querySelectorAll(".wg-cell").forEach(c => { c.dataset.w = `${c.dataset.r},${c.dataset.c}`; c.classList.add("go"); });
          };
          stage.onclick = e => {
            const c = e.target.closest("[data-w]"); if (!c) return; ctrl.sfx("tap");
            const r = +c.dataset.r, cc = +c.dataset.c;
            if (sqMoves.some(m => m[0] === r && m[1] === cc)) { draw(`✅ ${"ABCDEFG"[cc]}${r + 1} — 한 방향으로 ${Math.abs(r - 3) + Math.abs(cc - 3)}칸!`); ctrl.complete(); }
            else draw("그 칸은 못 가요 — 한 방향으로 1~2칸만이에요");
          };
          draw();
        } },
      { tag: "STEP 3 · 원형 말", title: "원형 말은 한 칸 + 꺾어서 한 칸 (Ⅱ)", body: "시즌 3 의 원형 말(●)은 한 칸 가고, 원하면 <b>왼쪽/오른쪽으로 꺾어서 한 칸 더</b> 갈 수 있어요. 곧게 두 칸은 못 가요. (원작 벽바둑은 사각 말만 써요)",
        boardHtml: `<div class="wg-tut">${boardHtml({ ...demo([P(0, "ci", 3, 3), P(1, "sq", 0, 0)], { noTerr: true }) }, { dest: Object.fromEntries([[2, 3], [4, 3], [3, 2], [3, 4], [2, 2], [2, 4], [4, 2], [4, 4]].map(x => [x.join(","), "ok"])) })}<small>노란 칸이 원형 말이 갈 수 있는 곳이에요</small></div>`, ms: 7800 },
      { tag: "STEP 4 · 직접", title: "움직인 말의 한 면에 벽을 꼭 세워요", body: "이동이 끝나면 그 말의 <b>위·오른쪽·아래·왼쪽 중 한 면</b>에 벽을 세워요 (이미 벽이 있는 면은 안 돼요). 벽으로 상대를 막고 내 영역을 지켜요. 한 면을 골라 보세요.",
        interactive: { hint: "👆 벽 세울 면을 눌러요", doneText: "✅ 벽이 섰어요 — 이제 상대 차례!" },
        render(stage, ctrl) {
          const draw = (d, msg) => {
            const V = demo([P(0, "sq", 3, 3), P(1, "sq", 3, 6)], { walls: d >= 0 ? [[3, 3, d]] : [] });
            stage.innerHTML = `<div class="wg-tut">${boardHtml(V, { lastWall: d >= 0 ? { r: 3, c: 3, d } : null })}<div class="wg-sides">${[0, 1, 2, 3].map(x => `<button class="btn" data-w="${x}">${["▲ 위", "▶ 오른쪽", "▼ 아래", "◀ 왼쪽"][x]}</button>`).join("")}</div><small>${msg || "방금 움직인 가운데 말의 한 면을 골라요"}</small></div>`;
          };
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; ctrl.sfx("tap"); const d = +b.dataset.w; draw(d, `${DN[d]}쪽에 벽을 세웠어요!`); ctrl.complete(); };
          draw(-1);
        } },
      { tag: "STEP 5 · 승부", title: "판이 갈라지면 끝 — 칸 수 합이 큰 쪽이 이겨요", body: "모든 사람의 말이 벽으로 <b>서로 다른 구역</b>에 갈라지면 바로 끝나요. 말이 있는 구역의 칸 수를 합해 가장 큰 사람이 이겨요 (같으면 가장 넓은 한 구역). 위 판은 왼쪽 21칸 대 오른쪽 28칸이에요.",
        boardHtml: `<div class="wg-tut">${boardHtml(demo([P(0, "sq", 3, 1), P(1, "sq", 3, 5)], { walls: sepWalls }), {})}<small>벽으로 갈라졌어요 — ■ 21 : 28 ■</small></div>`, ms: 7600 },
      { tag: "STEP 6 · 2라운드", title: "1라운드 1등은 생존, 나머지 둘이 1:1", body: "1라운드는 <b>3명</b>이 하고, 1라운드에서 한 번 <b>벽 부수기</b>(길의 벽 하나를 부수고 이동)를 쓸 수 있어요. 1등은 살아남고, 나머지 둘은 2라운드에서 말 4개씩으로 1:1 — 벽 부수기는 없고, <b>진 사람이 탈락</b>해요.",
        boardHtml: `<div class="wg-tut"><span style="font-size:42px">🏆</span><small>1라운드 1등 = 생존 확정 · 2라운드 승자 = 2등</small></div>`, ms: 6400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.wallgo = {
    name: "벽바둑", emoji: "🧱", short: "말을 움직이고 벽을 세워 영역을 넓혀요", min: 3, max: 3, defN: 3, board: false,
    opts: [{ k: "ver", label: "방식", items: [["ii", "Ⅱ (시즌 3 · 사각 + 원형 말)"], ["classic", "원작 (시즌 2 · 사각 말)"]], def: "ii" }],
    howto: [
      "7×7 판에서 차례마다 <b>말 하나 이동 → 그 말의 한 면에 벽</b>을 세워요",
      "사각 말(■) 한 방향 1~2칸 · 원형 말(●, Ⅱ) 한 칸 + 꺾어 한 칸 · 1라운드엔 <b>벽 부수기</b> 한 번",
      "모두의 말이 벽으로 갈라지면 끝 — 말이 있는 구역의 <b>칸 수 합</b>이 큰 사람이 이겨요",
      "1라운드 1등은 생존, 나머지 둘이 2라운드(1:1) — 진 사람 탈락 · 모두가 연달아 움직일 수 없으면 그 라운드도 끝나요",
    ],
    note: "방송과 다른 점: 시간 제한(90초) 없음, 3명 고정(빈 자리는 AI), 2라운드 고정 말 자리는 선 B2·F6 / 후 F2·B6 으로 우리가 정함, 같은 점수·같은 큰 구역이면 나중에 두는 사람이 위, 움직일 말이 없으면 차례 넘김. 방송은 데스룸 5일차 '벽바둑'(시즌 2)과 데드 어게인 4일차 '벽바둑 Ⅱ'(시즌 3) 둘 다 이 규칙이에요.",
    sub: V => (V.over ? "끝" : `${V.round}라운드 · ${V.phase === "place" ? "말 놓기" : V.phase === "move" ? "말 이동" : "벽 세우기"}`),
    chip: (V, i) => { const act = V.ord.includes(i); return { t: V.over ? (V.ranks[i] === 0 ? "🏆" : V.ranks[i] === 1 ? "2등" : "탈락") : !act ? "생존 ✓" : V.cur === i ? "내 차례" : "", on: V.cur === i && !V.over, out: V.over ? V.ranks[i] === 2 : false }; },
    render, result,
    // 🎞️ 복기: 행동 한 줄 글
    actText: (a, V) => {
      const DN = ["위", "오른쪽", "아래", "왼쪽"];
      if (!a) return "—";
      if (a.t === "place") return `${W.coord(a.r, a.c)} 에 ${a.k === "ci" ? "원형" : "사각"} 말 놓음`;
      if (a.t === "move") { const P = V && V.pieces && V.pieces[a.p]; return `${P ? W.coord(P.r, P.c) + " 말 이동: " : "말 이동: "}${(a.dirs || []).map(d => DN[d]).join(" → ")}${a.brk != null ? " (벽 부수기)" : ""}`; }
      if (a.t === "wall") return `${DN[a.d]}쪽에 벽`;
      return "—";
    },
    // 🎞️ 복기: 내 수 vs 고급 AI 수 — 두고 난 뒤 (내가 먼저 닿는 칸 − 가장 센 상대) 차이. 갈라졌으면 실제 순위 규칙으로 ±60
    review: (V, seat, myA, bestA, info) => {
      if (!V || !myA) return null;
      const rng = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      const rr = rng(((info && info.seed) | 0) + (V.round | 0) * 7 + seat * 131 + (V.t | 0));
      const DN = ["위", "오른쪽", "아래", "왼쪽"], f = x => (x >= 0 ? "+" : "") + x.toFixed(1);
      const out = (mine, best, what) => ({ sev: Math.max(0, Math.min(100, Math.round((best.e - mine.e) * 20))), why: `${what} 평가값 (내가 먼저 닿는 칸 수 − 가장 센 상대의 칸 수, 구역이 갈라지면 승패 ±60 가산) — 내 수 ${f(mine.e)} / 고급 AI 수 ${f(best.e)}` });
      if (V.phase === "move" && myA.t === "move") {
        const L = W.candMoves(W.fromView(V), seat, rr, 0), same = (x, a) => a && x.mv.p === a.p && String(x.mv.dirs) === String(a.dirs) && (x.mv.brk ?? null) === (a.brk ?? null);
        const mine = L.find(x => same(x, myA)), best = (bestA && L.find(x => same(x, bestA))) || L[0];
        return mine && best ? out(mine, best, "움직인 뒤 가장 좋은 벽까지 쳤을 때") : null;
      }
      if (V.phase === "wall" && myA.t === "wall") {
        const L = W.wallEvals(W.fromView(V), seat), mine = L.find(x => x.d === myA.d), best = (bestA && L.find(x => x.d === bestA.d)) || L[0];
        return mine && best ? out(mine, best, `${DN[myA.d]}쪽 벽 vs ${DN[best.d]}쪽 벽`) : null;
      }
      if (V.phase === "place" && myA.t === "place") {
        const L = W.placeOpts(V, seat, rr), same = (x, a) => a && (!a.k || x.k === a.k) && x.r === a.r && x.c === a.c;
        const mine = L.find(x => same(x, myA)), best = (bestA && L.find(x => same(x, bestA))) || L[0];
        return mine && best ? out(mine, best, "말을 놓은 자리") : null;
      }
      return null;
    },
    coach: (V, me, since, names) => W.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => W.ai(V, me, "easy", rnd),
  };
})();

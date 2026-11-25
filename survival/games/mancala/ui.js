/* 베니 서바이벌 · 균형의 만칼라 — 화면 (14칸 고리 · 가운데 점수판 · 놓는 순서 고르기 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.mancala;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NC = K.NC, DEV = K.DEV, ANG = K.ANG, COLS = K.COLS;
  const CSH = ["빨", "파", "초"];
  const PC = ["#2dd4bf", "#d6b48a", "#facc15", "#c4b5fd", "#a3e635", "#7dd3fc", "#fb923c"];   // 말 색 (방송: 청록 · 연갈 · 노랑 · 연보라 · 연두 · 하늘 · 주황)
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 5일차 메인 매치 (7명)";
  const DIFF = "3~7명 (빈 자리는 AI) · 순서는 무작위 한 줄 (방송은 추첨) · 12바퀴(인원 × 12 차례)가 지나도 안 끝나면 그때 끝 (짧게 6바퀴 옵션) · 최종 점수가 같으면 공동 순위 · 피스 · 15점 이하 페널티 · 1위의 피스 빼앗기 · 상금 미션은 없음 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const eul = w => { const j = jong(w); return j < 0 ? "을(를)" : j ? "을" : "를"; };
  const pct = p => `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
  const sgn = x => (x > 0 ? `+${x}` : String(x));

  const CSS = `
.mc-board{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) minmax(0,1fr);grid-template-rows:repeat(6,minmax(46px,auto));gap:3px;flex:none}
.mc-cell{position:relative;min-height:46px;border-radius:10px;border:2px solid rgba(255,255,255,.14);padding:13px 3px 3px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:2px;justify-content:center;background:rgba(0,0,0,.25);font:inherit;color:#fff;-webkit-tap-highlight-color:transparent}
button.mc-cell{cursor:pointer}
.mc-cell>i{position:absolute;left:5px;top:1px;font:800 9.5px/1.2 var(--round);font-style:normal;color:rgba(255,255,255,.7)}
.mc-cell>em{position:absolute;right:4px;top:1px;font:900 9.5px/1.2 var(--round);font-style:normal;color:#fde68a}
.mc-cell.c0{background:rgba(220,38,38,.28);border-color:rgba(248,113,113,.45)}
.mc-cell.c1{background:rgba(37,99,235,.3);border-color:rgba(96,165,250,.45)}
.mc-cell.c2{background:rgba(22,163,74,.28);border-color:rgba(74,222,128,.45)}
.mc-cell.dev{background:linear-gradient(#18181b,#3f0a0a);border-color:#ef4444}
.mc-cell.ang{background:linear-gradient(#f8fafc33,#fef3c766);border-color:#fde68a}
.mc-cell.can{box-shadow:0 0 0 2px rgba(251,191,36,.55)}
.mc-cell.sel{border-color:#fbbf24;background-color:rgba(251,191,36,.3)}
.mc-cell.path{border-style:dashed;border-color:#fde68a}
.mc-cell.land{border-style:solid;border-color:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,.6)}
.mc-cell.from{opacity:.55;border-style:dashed}
.mc-cell.lastl{box-shadow:0 0 0 2px rgba(255,255,255,.55)}
.mc-p{width:15px;height:15px;border-radius:50%;display:grid;place-items:center;font:900 9px/1 var(--round);color:#0f172a;border:1px solid rgba(0,0,0,.35);flex:none}
.mc-p.me{outline:2px solid #fff;outline-offset:0}
.mc-cell.many .mc-p{width:11px;height:11px;font-size:7px}
.mc-p.gh{opacity:.85;outline:1.5px dashed #fff}
.mc-p.nx{background:transparent!important;border:1.5px dashed rgba(255,255,255,.6);color:#fde68a}
.mc-mid{grid-column:2;grid-row:2 / span 4;border-radius:12px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.12);padding:3px 4px;display:flex;flex-direction:column;gap:1px;min-width:0;overflow:hidden}
.mc-hd,.mc-sr{display:grid;grid-template-columns:13px minmax(0,1fr) 15px 15px 15px 22px;gap:2px;align-items:center;font:800 10.5px/1.25 var(--round);color:#fff;white-space:nowrap}
.mc-hd{color:var(--soft);font-size:9.5px}
.mc-hd b:nth-child(3),.mc-sr b:nth-child(3){color:#fca5a5}.mc-hd b:nth-child(4),.mc-sr b:nth-child(4){color:#93c5fd}.mc-hd b:nth-child(5),.mc-sr b:nth-child(5){color:#86efac}
.mc-sr b,.mc-hd b{text-align:right;font-variant-numeric:tabular-nums}
.mc-sr .f{color:#fde68a;text-align:right}
.mc-sr span{overflow:hidden;text-overflow:ellipsis}
.mc-sr.me{background:rgba(34,197,94,.18);border-radius:4px}
.mc-sr.cur span{color:var(--gold)}
.mc-sr .mc-p{width:12px;height:12px;font-size:7.5px}
.mc-sr .hot{color:#f87171}
.mc-arrow{margin-top:auto;text-align:center;font:700 9.5px var(--round);color:var(--soft)}
.mc-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.mc-info b{color:#fde68a}.mc-info .g{color:#86efac}.mc-info .r{color:#fca5a5}
.mc-info.end{font:800 13px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.mc-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.mc-act{display:grid;gap:5px;flex:none}
.mc-hand{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.mc-b{min-height:46px;min-width:44px;border-radius:11px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:900 13.5px/1.15 var(--round);padding:2px 8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;-webkit-tap-highlight-color:transparent}
.mc-b small{font:700 10px var(--round);color:var(--soft)}
.mc-b:disabled{opacity:.35;cursor:default}
.mc-b.on{background:rgba(251,191,36,.28);border-color:#fbbf24}
.mc-b.go{border:0;background:linear-gradient(#a855f7,#6b21a8)}
.mc-b.go:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);opacity:1}
.mc-b .mc-p{width:18px;height:18px;font-size:10px}
.mc-row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:5px}
.mc-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.mc-lbl{display:flex;justify-content:space-between;gap:6px;font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.mc-lbl b{color:#fff;overflow:hidden;text-overflow:ellipsis}
.mc-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.mc-tut .mc-board,.mc-tut .mc-act{width:min(100%,330px)}
.mc-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.mc-tmsg b{color:#fde68a}
.mc-res{display:grid;gap:3px;font-size:12.5px;line-height:1.4}
@media (max-height:700px){.mc-board{grid-template-rows:repeat(6,minmax(44px,auto));gap:2px}.mc-cell{min-height:44px;padding-top:12px}.mc-b{min-height:44px}.mc-info{min-height:2.4em;font-size:12px}.mc-act{gap:4px}}
@media (min-height:760px){.mc-board{grid-template-rows:repeat(6,minmax(54px,auto))}.mc-cell{min-height:54px;padding-top:15px}.mc-p{width:17px;height:17px;font-size:10px}.mc-b{min-height:50px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const nmOf = (names, s, me) => (s === me ? "나" : (names && names[s]) || `${s + 1}번`);
  const seatNames = ctx => (ctx.seats || []).map((x, i) => (x && x.name) || `${i + 1}번`);
  const dot = (s, me, cls) => `<span class="mc-p${s === me ? " me" : ""}${cls ? " " + cls : ""}" style="background:${PC[s % PC.length]}" data-o="${s}">${s + 1}</span>`;
  const colName = (kind, col) => (kind === -1 ? `악마칸 → ${COLS[col]}` : kind === -2 ? `천사칸 → ${COLS[col]}` : COLS[col]);
  // 칸 자리: 위(악마) · 오른쪽 01~06 · 아래(천사) · 왼쪽 07~12 (아래에서 위로)
  const POS = i => (i === DEV ? [1, 2] : i === ANG ? [6, 2] : i < ANG ? [i, 3] : [6 - (i - 8), 1]);
  const cellCls = i => { const c = K.colOf(i); return c === -1 ? "dev" : c === -2 ? "ang" : "c" + c; };
  const cellName = i => (i === DEV ? "😈악마" : i === ANG ? "😇천사" : K.labelOf(i));
  const cellTxt = i => (i === DEV ? "악마칸" : i === ANG ? "천사칸" : `${K.labelOf(i)}칸`);
  const landTxt = i => (i === DEV ? "악마칸" : i === ANG ? "천사칸" : `${K.labelOf(i)}칸(${COLS[K.colOf(i)]})`);

  // 이 기기에서만: 고른 칸 · 놓는 순서 (장면이 바뀌면 지움)
  let SEL = { key: "" };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.turn}|${V.pi}|${V.phase}|${ctx.me}`; if (SEL.key !== key) SEL = { key, from: -1, seq: [], stk: [], col: undefined, place: -1, sent: 0 }; return SEL; };
  const bagLeft = (V, S) => { const b = V.cells[S.from].slice(); for (const o of S.seq) b.splice(b.indexOf(o), 1); return b; };

  function boardHtml(V, me, names, S, can, opt) {
    const o = opt || {};
    const path = {}, ghost = {};
    let land = -1;
    if (S && S.from >= 0) {
      const k = V.cells[S.from].length;
      for (let j = 0; j < k; j++) { const c = (S.from + 1 + j) % NC; path[c] = (path[c] || []).concat([j]); }
      land = (S.from + k) % NC;
      S.seq.forEach((ow, j) => { const c = (S.from + 1 + j) % NC; (ghost[c] = ghost[c] || []).push(ow); });
    }
    const lastL = V.last && !o.noLast ? V.last.land : -1;
    let h = `<div class="mc-board">`;
    for (let i = 0; i < NC; i++) {
      const [r, c] = POS(i), st = `grid-row:${r};grid-column:${c}`;
      const pcs = S && S.from === i ? [] : V.cells[i];
      let inner = `<i>${cellName(i)}</i>`;
      if (lastL === i && !(S && S.from >= 0)) inner += `<em>+${V.last.pts}</em>`;
      inner += pcs.map(ow => dot(ow, me)).join("");
      if (ghost[i]) inner += ghost[i].map(ow => dot(ow, me, "gh")).join("");
      if (path[i]) { const left = path[i].filter(j => j >= S.seq.length); inner += left.map(j => `<span class="mc-p nx">${j + 1}</span>`).join(""); }
      let cls = "mc-cell " + cellCls(i);
      if (pcs.length + (ghost[i] ? ghost[i].length : 0) + (path[i] ? path[i].length : 0) > 6) cls += " many";
      let clickable = false;
      if (can && V.phase === "place") { if (V.cells[i].length < 2) { cls += " can"; clickable = true; } if (S.place === i) cls += " sel"; }
      if (can && V.phase === "move") {
        if (V.cells[i].includes(me)) { clickable = true; if (S.from < 0) cls += " can"; }
        if (S.from === i) cls += " from";
      }
      if (path[i]) cls += land === i ? " land" : " path";
      if (lastL === i && !(S && S.from >= 0)) cls += " lastl";
      h += clickable ? `<button type="button" class="${cls}" style="${st}" data-cell="${i}" aria-label="${cellName(i)}">${inner}</button>` : `<div class="${cls}" style="${st}" data-cell="${i}">${inner}</div>`;
    }
    // 가운데 점수판
    h += `<div class="mc-mid"><div class="mc-hd"><span></span><span>이름</span><b>빨</b><b>파</b><b>초</b><b>최종</b></div>`;
    for (const s of V.order) {
      const sc = V.sc[s], hi = Math.max(...sc);
      h += `<div class="mc-sr${s === me ? " me" : ""}${V.cur === s && !V.over ? " cur" : ""}" data-s="${s}">${dot(s, me)}<span>${esc(nmOf(names, s, me))}</span>${sc.map(x => `<b${x === hi && x >= 24 ? ' class="hot"' : ""}>${x}</b>`).join("")}<b class="f">${V.fin[s]}</b></div>`;
    }
    h += `<div class="mc-arrow">↻ 시계 방향 · 30점이면 끝</div></div>`;
    return h + `</div>`;
  }

  function endLine(V, me, names) {
    if (!V.res) return "";
    const f = V.fin, top = Math.max(...f), w = f.map((x, s) => s).filter(s => f[s] === top);
    const why = V.end === "goal" ? `${esc(nmOf(names, V.res.by, me))} 한 색 30점 → 끝 · ` : "바퀴 다 돎 → 끝 · ";
    if (me >= 0) return why + (w.includes(me) ? (w.length > 1 ? `🏆 공동 1위 (${top}점)` : `🏆 1위! 최종 ${top}점`) : `${V.ranks[me] + 1}위 (최종 ${f[me]}점) — 1위 ${esc(w.map(s => nmOf(names, s, me)).join(" · "))} ${top}점`);
    return why + `🏆 ${esc(w.map(s => nmOf(names, s, me)).join(" · "))} 1위 (${top}점)`;
  }
  function lastLine(V, me, names) {
    const L = V.last; if (!L) return "";
    const who = nmOf(names, L.s, me), ow = nmOf(names, L.owner, me);
    return `${esc(who)}: ${K.labelOf(L.from)}칸 ${L.seq.length}개 → <b>${K.labelOf(L.land)}</b> · ${esc(ow)} ${colName(L.kind, L.col)} <b>+${L.pts}</b>`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, S = selFor(V, ctx), names = seatNames(ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    let h = boardHtml(V, me, names, S, can);
    let info = "", ic = "";
    if (over) { info = endLine(V, me, names); ic = me >= 0 && V.ranks[me] > 0 ? " end bad" : " end"; }
    else if (V.phase === "place") info = can ? `🎯 내 차례 — 내 말을 놓을 칸을 골라요 (한 칸에 2개까지 · 남은 내 말 ${4 - V.mine}개)` : `${esc(nmOf(names, V.cur, me))} 말 놓는 중… (남은 ${V.left}개)`;
    else if (can) {
      if (S.from < 0) info = `🎯 내 차례 — 내 말(<b>흰 테</b>)이 있는 칸을 골라요${V.last ? ` · 직전 ${lastLine(V, me, names)}` : ""}`;
      else {
        const k = V.cells[S.from].length, land = (S.from + k) % NC;
        if (S.seq.length < k) info = `손에 든 말 ${k - S.seq.length}개 — 누르는 순서대로 <b>${S.seq.length + 1}번</b> 칸부터 놓아요 · 마지막 말이 <b>${K.labelOf(land)}</b>에 도착`;
        else { const P = K.preview(V.cells, V.sc, S.from, S.seq), col = P.opts.includes(S.col) ? S.col : P.opts[0]; info = `<b>${esc(nmOf(names, P.owner, me))}</b> ${colName(P.col, col)} <b>+${P.pts}</b>${P.owner === me ? ` → 최종 ${V.fin[me]} → <b>${K.fin(V.sc[me].map((x, c) => (c === col ? x + P.pts : x)))}</b>` : ""}`; }
      }
    } else info = V.last ? lastLine(V, me, names) : `${esc(nmOf(names, V.cur, me))} 차례…`;
    h += `<div class="mc-info${ic}"><span>${info}</span></div><div class="mc-act">`;
    if (can && V.phase === "place") {
      h += `<button type="button" class="mc-b go" data-go="place"${S.place < 0 ? " disabled" : ""}>${S.place < 0 ? "칸을 골라요" : `${cellTxt(S.place)}에 놓기`}</button>`;
    } else if (can && S.from >= 0) {
      const left = bagLeft(V, S), owners = [...new Set(left)].sort((a, b) => (a === me ? -1 : b === me ? 1 : a - b));
      const k = V.cells[S.from].length;
      h += `<div class="mc-lbl"><span>${K.labelOf(S.from)}칸 말 ${k}개 · 놓은 ${S.seq.length}</span><b>${S.seq.length ? S.seq.map(o => esc(nmOf(names, o, me))).join("→") : "누를 말을 골라요"}</b></div>`;
      if (left.length) h += `<div class="mc-hand">${owners.map(o => `<button type="button" class="mc-b" data-o="${o}">${dot(o, me)}${esc(nmOf(names, o, me))}<small>×${left.filter(x => x === o).length}</small></button>`).join("")}</div>`;
      if (!left.length) {
        const P = K.preview(V.cells, V.sc, S.from, S.seq);
        if (P.opts.length > 1) h += `<div class="mc-row3">${P.opts.map(c => `<button type="button" class="mc-b${(P.opts.includes(S.col) ? S.col : P.opts[0]) === c ? " on" : ""}" data-col="${c}">${COLS[c]}</button>`).join("")}</div>`;
      }
      h += `<div class="mc-row2"><button type="button" class="mc-b" data-undo="1">${S.seq.length ? "되돌리기" : "다른 칸"}</button><button type="button" class="mc-b go" data-go="move"${left.length ? " disabled" : ""}>${left.length ? `${left.length}개 더 놓아요` : "이동"}</button></div>`;
    }
    h += `</div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 4000)) return;   // 두 번 탭 막기 (보낸 뒤 장면이 바뀌면 SEL 이 새로 생김)
      const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
      const d = t.dataset;
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      if (d.cell !== undefined) {
        const i = +d.cell;
        if (V.phase === "place") S.place = S.place === i ? -1 : i;
        else { if (S.from === i) { S.from = -1; S.seq = []; } else { S.from = i; S.seq = []; S.stk = []; S.col = undefined; const b = V.cells[i]; if (new Set(b).size === 1) S.seq = b.slice(); } }
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (d.o !== undefined) {
        const o = +d.o; S.stk.push(S.seq.length); S.seq.push(o);
        const left = bagLeft(V, S); if (left.length && new Set(left).size === 1) S.seq = S.seq.concat(left);   // 한 사람 말만 남으면 자동
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (d.col !== undefined) { S.col = +d.col; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.undo !== undefined) {
        S.col = undefined;
        if (S.stk.length) S.seq.length = S.stk.pop();
        else { S.from = -1; S.seq = []; }
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (d.go === "place" && S.place >= 0) send({ t: "place", c: S.place });
      else if (d.go === "move" && S.from >= 0 && !bagLeft(V, S).length) {
        const a = { t: "move", from: S.from, seq: S.seq.slice() };
        const P = K.preview(V.cells, V.sc, S.from, S.seq);
        if (P.opts.length > 1) a.col = P.opts.includes(S.col) ? S.col : P.opts[0];
        send(a);
      }
    };
  }

  // ── 행동 글 (V = 그 수 전 그 자리 보기, 없을 수 있음) ──
  function actText(a, V) {
    if (!a) return "";
    if (a.t === "place") return `${cellTxt(a.c)}에 말 놓기`;
    if (a.t === "move" && Array.isArray(a.seq)) {
      const k = a.seq.length, land = (a.from + k) % NC;
      const nm = o => (V && typeof V.seat === "number" && o === V.seat ? "나" : `${o + 1}번`);
      let x = `${K.labelOf(a.from)}칸 ${k}개 (${a.seq.map(nm).join("→")}) → ${K.labelOf(land)}`;
      if (V && V.cells && V.cells[a.from] && V.cells[a.from].length === k) {
        const P = K.preview(V.cells, V.sc, a.from, a.seq), col = P.opts.includes(a.col) ? a.col : P.opts[0];
        x += ` · ${nm(P.owner)} ${colName(P.col, col)} +${P.pts}`;
      }
      return x;
    }
    return "";
  }

  // ── 선생님 ──
  let CC = { key: "", r: null };
  function recOf(V, me) { const key = `${V.pub}|${V.order.join()}|${V.maxT}|${me}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me) }; return CC.r; }
  const moveTxt = (a, V, me, names) => {
    const P = K.preview(V.cells, V.sc, a.from, a.seq), col = P.opts.includes(a.col) ? a.col : P.opts[0];
    const order = a.seq.map(o => esc(nmOf(names, o, me)));
    return { txt: `${K.labelOf(a.from)}칸 말 ${a.seq.length}개를 ${order.join("→")} 순서로 → ${K.labelOf(P.land)} (${esc(nmOf(names, P.owner, me))} ${colName(P.col, col)} +${P.pts})`, P, col };
  };
  function coach(V, me, since, names) {
    const n = V.n, watch = !(me >= 0 && me < n);
    if (watch) me = -1;
    const nm = s => esc(nmOf(names, s, me));
    const p = [];
    // 👀 상대 흐름
    const recent = V.hist.slice(-Math.min(3, V.hist.length));
    if (recent.length) p.push(`최근: ${recent.map(L => `${nm(L.s)} ${K.labelOf(L.from)}→${K.labelOf(L.land)} (${nm(L.owner)} ${colName(L.kind, L.col)} +${L.pts})`).join(" / ")}.`);
    else if (V.phase === "place") p.push(`말 놓기 — 모두 ${V.n * 4 - V.left}개 놓음, 남은 ${V.left}개.`);
    const hot = V.order.filter(s => Math.max(...V.sc[s]) >= 22).map(s => `${nm(s)} ${COLS[V.sc[s].indexOf(Math.max(...V.sc[s]))]} ${Math.max(...V.sc[s])}`);
    if (hot.length) p.push(`30점 가까움: ${hot.join(" · ")} — 누가 그 색을 더 받으면 바로 끝나요.`);
    const top = V.order.slice().sort((a, b) => V.fin[b] - V.fin[a] || a - b).slice(0, 3);
    if (V.phase === "move") p.push(`최종 점수 1~3위: ${top.map(s => `${nm(s)} ${V.fin[s]}`).join(" · ")}.`);
    const dv = V.cells[DEV].length, an = V.cells[ANG].length;
    p.push(`악마칸 말 ${dv}개 · 천사칸 ${an}개 — 다른 칸에서 마지막 말 1개가 도착하면 ${dv + 1} · ${an + 1}점.`);
    if (watch) return { opp: p.join(" "), mine: `최종 점수 ${V.order.map(s => `${nm(s)} ${V.fin[s]}`).join(" · ")}.`, rec: "구경 중이에요.", why: "" };
    // 📊 내 흐름
    const sc = V.sc[me], lo = Math.min(...sc), hi = Math.max(...sc);
    let m = `내 점수 빨 ${sc[0]} · 파 ${sc[1]} · 초 ${sc[2]} → 최종 ${lo} − (${hi} − ${lo}) = ${V.fin[me]} (${V.ranks[me] + 1}위).`;
    const loC = K.tiedCols(sc, -2).map(c => COLS[c]).join(" · "), hiC = K.tiedCols(sc, -1).map(c => COLS[c]).join(" · ");
    m += lo === hi ? ` 세 색이 같아요 (${lo}점) — 천사 · 악마칸에 도착하면 옮긴 사람이 색을 골라요.` : ` 가장 모자란 색 ${loC} (천사칸 → 이 색) · 가장 많은 색 ${hiC} (악마칸 → 이 색).`;
    if (V.phase === "place") m += ` 놓은 내 말 ${V.mine}/4.`;
    // 💡 추천 · 👉 뜻 (고급 AI)
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (!V.needs.includes(me)) rec = "내 차례가 되면 추천해 드려요.";
    else {
      const R = recOf(V, me);
      if (V.phase === "place") {
        const c = R.a.c, k = V.cells[c].length + 1, land = (c + k) % NC, nx = R.rows.find(x => x.c !== c);
        rec = `${cellTxt(c)}에 놓기.`;
        const myCells = V.cells.filter(x => x.includes(me)).length, here = V.cells[c].includes(me), free = V.cells.filter(x => x.length < 2).length;
        why = `놓으면 이 칸 말이 ${k}개 → 누가 옮기면 마지막 말이 ${landTxt(land)}에 도착해요${land === ANG ? " — 내 말을 마지막에 두면 모자란 색을 채워요" : land === DEV ? " — 남의 말을 보내 그 사람 균형을 깰 수 있어요" : ""}. ${here ? "내 말과 같은 칸이라 고를 칸이 늘지 않아요" : "내 말을 흩어 놓아야 내 차례에 고를 칸이 많아요"} (내 말이 있는 칸 ${myCells}개 · 놓을 수 있는 칸 ${free}개${nx ? ` · 다음 후보 ${cellTxt(nx.c)}` : ""}).`;
      } else {
        const b = R.rows[0], T = moveTxt(R.a, V, me, names);
        rec = `${T.txt}.`;
        const alt = R.rows.find(r => r.from !== b.from || r.pv.owner !== b.pv.owner);
        why = `다음 내 차례까지 16번 굴려 본 '상대를 이길 몫' ${pct(b.v)}${alt ? ` (다른 후보 ${K.labelOf(alt.from)}→${K.labelOf(alt.pv.land)} = ${esc(nmOf(names, alt.pv.owner, me))} +${alt.pv.pts} · ${pct(alt.v)})` : ""}.`;
        if (T.P.owner === me) { const f1 = K.fin(sc.map((x, c) => (c === T.col ? x + T.P.pts : x))); why += ` 내 ${COLS[T.col]} ${sc[T.col]} → ${sc[T.col] + T.P.pts} · 최종 ${V.fin[me]} → ${f1}${f1 !== V.fin[me] ? "" : sc[T.col] === lo && sc.filter(x => x === lo).length > 1 ? " (모자란 색이 둘이라 최종은 그대로지만 하나가 채워져요)" : " (가운데 색이라 최종은 그대로)"}.`; }
        else {
          const own = R.rows.find(r => r.pv.owner === me);
          why += ` ${esc(nmOf(names, T.P.owner, me))}에게 ${colName(T.P.col, T.col)}${T.P.col === -1 ? " — 가장 많은 색을 더 키워 그 사람의 균형을 깨요" : ""}. ${own ? `내 말로 받는 가장 좋은 수(${K.labelOf(own.from)}→${K.labelOf(own.pv.land)} +${own.pv.pts})는 ${pct(own.v)}라 이 수가 나아요` : "지금은 내 말로 점수를 받는 수가 없어요"}.`;
        }
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const loss = Math.max(0, J.best.v - J.my.v) * 100;
    const sev = loss >= 25 ? 90 : loss >= 15 ? 75 : loss >= 8 ? 60 : loss >= 4 ? 40 : loss > 1.5 ? 20 : 5;
    const r = [];
    const pm = J.my.pv, pb = J.best.pv;
    if (pm.owner !== seat && pb.owner === seat) r.push("내 말을 마지막에 놓으면 내가 점수를 받아요");
    if (pm.owner === seat && pm.col === -1 && Vb.sc[seat] && Math.max(...Vb.sc[seat]) > Math.min(...Vb.sc[seat])) r.push("악마칸은 가장 많은 색을 키워 최종 점수가 깎여요");
    if (pb.col === -2 && pb.owner === seat && pm.col !== -2) r.push("천사칸은 가장 모자란 색을 채워 줘요");
    const why = loss <= 1.5 ? `고급 AI: ${best} — 굴려 본 이길 몫이 거의 같아요 (${pct(J.best.v)} vs ${pct(J.my.v)})`
      : `고급 AI: ${best} — 굴려 본 이길 몫 ${pct(J.best.v)} vs 내 수 ${pct(J.my.v)}${r.length ? " · " + r.join(" · ") : ""}`;
    return { sev, why, my, best };
  }

  function result(V, me, names) {
    const who = s => (s === me ? " 나" : names && names[s] ? ` ${esc(names[s])}` : "");
    const order = V.order.slice().sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const rows = order.map(s => `${V.ranks[s] + 1}위${who(s)} <b>${V.fin[s]}점</b> — 빨 ${V.sc[s][0]} · 파 ${V.sc[s][1]} · 초 ${V.sc[s][2]}`);
    return `<div class="mc-res"><div>${Math.ceil(V.turn / V.n)}바퀴 · ${V.turn}차례 · 최종 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색)</div>${rows.map(x => `<div>${x}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const tb = x => `<div class="mc-tut">${x}</div>`;
    const mkV = (cells, sc, order) => ({ n: sc.length, cells, sc, fin: sc.map(K.fin), order, phase: "move", cur: 0, over: false, last: null, needs: [] });
    const blank = () => Array.from({ length: NC }, () => []);
    // 처음 배치 그림 (칸마다 2개)
    const c0 = [[1], [0, 2], [3], [], [1, 3], [0], [2], [0, 1], [3], [2], [], [1, 0], [3], [2]];
    const V0 = mkV(c0, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 1, 2, 3]);
    const names = ["나", "가", "다", "라"];
    // 직접 해 보기: 05칸에 [나, 가] → 06(초록) · 천사. 천사에 말 2개 → 3점. 내 점수 빨 5 · 파 5 · 초 1 → 천사 = 초록 +3
    const c5 = blank(); c5[5] = [1, 0]; c5[ANG] = [2, 3]; c5[6] = [3]; c5[1] = [0, 2]; c5[10] = [0, 1]; c5[DEV] = [1, 1]; c5[12] = [0, 3]; c5[3] = [2]; c5[9] = [2, 3];
    const SC5 = [[5, 5, 1], [6, 2, 4], [3, 3, 3], [8, 1, 2]];
    return [
      { tag: "STEP 1 · 목표", title: "세 색을 고르게", body: "빨강 · 파랑 · 초록 점수를 모아요. <b>최종 점수 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색)</b>. 13 · 11 · 20 이면 11 − (20 − 11) = <b>2점</b>. 한 색만 많으면 오히려 손해예요!",
        boardHtml: tb(`<div class="mc-board" style="grid-template-rows:auto"><div class="mc-mid" style="grid-row:1;grid-column:1 / span 3"><div class="mc-hd"><span></span><span>이름</span><b>빨</b><b>파</b><b>초</b><b>최종</b></div><div class="mc-sr me">${dot(0, 0)}<span>나</span><b>13</b><b>11</b><b>20</b><b class="f">2</b></div><div class="mc-sr">${dot(1, 0)}<span>가</span><b>15</b><b>15</b><b>15</b><b class="f">15</b></div><div class="mc-sr">${dot(2, 0)}<span>다</span><b>28</b><b>3</b><b>9</b><b class="f">-22</b></div></div></div>`), ms: 7000 },
      { tag: "STEP 2 · 준비물", title: "14칸 고리 · 말 4개", body: "게임판은 <b>빨강 · 파랑 · 초록</b> 접시가 번갈아 놓인 고리 — 맨 위 <b>😈악마칸</b>, 맨 아래 <b>😇천사칸</b>. 각자 말 4개를 순서대로 1개씩 놓아요 (<b>한 칸에 2개까지</b>).",
        boardHtml: tb(boardHtml(V0, 0, names, null, false, { noLast: true })), ms: 6400 },
      { tag: "STEP 3 · 진행", title: "전부 집어 하나씩", body: "내 차례에는 <b>내 말이 있는 칸</b> 하나를 골라 그 칸의 말을 <b>전부</b> 집고, 다음 칸부터 <b>시계 방향</b>으로 1개씩 놓아요. 어느 말을 어디 놓을지는 내가 정해요. <b>마지막 말의 주인</b>이 그 칸의 말 수만큼 그 칸 색 점수를 받아요.",
        boardHtml: tb(boardHtml(mkV(c5, SC5, [0, 1, 2, 3]), 0, names, { from: 5, seq: [], col: undefined }, false, { noLast: true })), ms: 7600 },
      { tag: "STEP 4 · 천사 · 악마", title: "모자란 색 / 많은 색", body: "마지막 말이 <b>😇천사칸</b>이면 그 주인의 <b>가장 적은 색</b>, <b>😈악마칸</b>이면 <b>가장 많은 색</b> 점수가 올라요 (동률이면 옮긴 사람이 색을 골라요). 내 말은 천사로, 남의 말은 악마로!",
        boardHtml: tb(`<div class="mc-board" style="grid-template-rows:auto"><div class="mc-cell ang" style="grid-row:1;grid-column:1"><i>😇천사</i>${dot(0, 0)}${dot(2, 0)}</div><div class="mc-mid" style="grid-row:1;grid-column:2;min-height:60px;justify-content:center"><div class="mc-arrow" style="margin:0">천사 = 가장 적은 색 ↑<br>악마 = 가장 많은 색 ↑</div></div><div class="mc-cell dev" style="grid-row:1;grid-column:3"><i>😈악마</i>${dot(1, 0)}${dot(3, 0)}</div></div>`), ms: 6800 },
      { tag: "STEP 5 · 직접", title: "내 말을 천사칸에", body: "05칸에 <b>가</b>와 <b>내</b> 말이 있어요. 06(초록) → 천사 순서로 놓여요. 내 가장 적은 색은 <b>초록 1점</b> — <b>가</b>를 먼저, <b>나</b>를 마지막에 놓아 천사칸에서 점수를 받아요!",
        interactive: { hint: "👆 05칸 → 가 → 나 → 이동", doneText: "✅ 천사칸 말 3개 → 내 초록 +3 · 최종 −3 → 3" },
        render(stage, ctrl) {
          const S = { from: -1, seq: [], col: undefined };
          let done = false, msg = "05칸(오른쪽 다섯째)을 눌러요";
          const V = mkV(c5.map(c => c.slice()), SC5.map(x => x.slice()), [0, 1, 2, 3]);
          const draw = () => {
            const tCell = !done && S.from !== 5, tO = !done && S.from === 5 ? (S.seq.length === 0 ? 1 : S.seq.length === 1 ? 0 : -1) : -1, tGo = !done && S.from === 5 && S.seq.length === 2;
            let h = boardHtml(V, 0, names, done ? null : S, !done, { noLast: !done });
            if (tCell) h = h.replace('data-cell="5"', 'data-cell="5" data-tp="1"');
            let act = "";
            if (!done && S.from === 5) {
              const left = V.cells[5].slice(); for (const o of S.seq) left.splice(left.indexOf(o), 1);
              act = `<div class="mc-act"><div class="mc-hand">${[...new Set(left)].map(o => `<button type="button" class="mc-b" data-o="${o}"${tO === o ? ' data-tp="1"' : ""}>${dot(o, 0)}${names[o]}</button>`).join("")}</div><div class="mc-row2"><button type="button" class="mc-b" data-undo="1">되돌리기</button><button type="button" class="mc-b go" data-go="1"${tGo ? ' data-tp="1"' : ""}${S.seq.length === 2 ? "" : " disabled"}>이동</button></div></div>`;
            }
            stage.innerHTML = `<div class="mc-tut">${h}${act}<div class="mc-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("button"); if (!t || t.disabled || !stage.contains(t)) return;
            const d = t.dataset;
            if (d.cell !== undefined) { const i = +d.cell; S.from = i; S.seq = []; ctrl.sfx("tap"); msg = i === 5 ? "먼저 <b>가</b>의 말을 06에, 그다음 <b>나</b>를 천사칸에" : `${K.labelOf(i)}칸도 되지만 이번엔 <b>05칸</b>을 골라요`; if (i !== 5) S.from = -1; draw(); return; }
            if (d.o !== undefined) { S.seq.push(+d.o); ctrl.sfx("tap"); msg = S.seq.length === 2 ? (S.seq[1] === 0 ? "마지막 말 = <b>나</b> → 천사칸! <b>이동</b>을 눌러요" : "마지막 말이 <b>가</b>예요 — 가가 점수를 받아요. 되돌리기!") : `${names[+d.o]} → 06칸`; draw(); return; }
            if (d.undo !== undefined) { S.seq.pop(); ctrl.sfx("tap"); draw(); return; }
            if (S.seq[1] !== 0) { ctrl.sfx("tap"); msg = "마지막 말이 <b>가</b>라서 가의 가장 적은 색(파랑)이 올라요 — <b>나</b>를 마지막에!"; S.seq = []; draw(); return; }
            // 옮기기
            V.cells[5] = []; V.cells[6].push(1); V.cells[ANG].push(0); V.sc[0][2] += 3; V.fin = V.sc.map(K.fin);
            V.last = { land: ANG, pts: 3 };
            done = true; ctrl.sfx("win"); msg = "🏆 <b>천사칸 말 3개 → 내 초록 +3</b> · 최종 −3 → 3"; draw(); ctrl.complete();
          };
          draw();
        } },
      { tag: "STEP 6 · 끝 · 특수", title: "30점이면 바로 끝", body: "누구든 <b>한 색 30점</b>이 되면 그 즉시 게임이 끝나고 최종 점수로 순위를 매겨요 (12바퀴가 지나도 끝). 남의 말을 <b>악마칸</b>으로 보내면 그 사람의 많은 색이 더 커져 균형이 깨져요. 🧑‍🏫 선생님은 다음 내 차례까지 16번 굴려 보고 칸 · 놓는 순서를 추천해요.",
        boardHtml: tb(`<div class="mc-board" style="grid-template-rows:auto"><div class="mc-mid" style="grid-row:1;grid-column:1 / span 3"><div class="mc-hd"><span></span><span>이름</span><b>빨</b><b>파</b><b>초</b><b>최종</b></div><div class="mc-sr">${dot(1, 0)}<span>가</span><b class="hot">30</b><b>12</b><b>14</b><b class="f">-6</b></div><div class="mc-sr me">${dot(0, 0)}<span>나</span><b>17</b><b>15</b><b>16</b><b class="f">13</b></div></div></div>`), ms: 7200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.mancala = {
    name: "균형의 만칼라", emoji: "⚖️", short: "14칸 고리 만칼라 — 마지막 말의 주인이 점수, 빨 · 파 · 초를 고르게 모아요 (천사 · 악마칸)", min: 3, max: 7, defN: 5, board: false,
    opts: [{ k: "laps", label: "최대 길이", items: [[12, "12바퀴"], [6, "6바퀴 (짧게)"]], def: 12 }],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 빨강 · 파랑 · 초록 점수를 고르게 — <b>최종 점수 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색)</b> (13 · 11 · 20 → 2점)",
      "준비물: 14칸 고리 — <b>빨강 · 파랑 · 초록</b> 접시가 번갈아, 맨 위 <b>악마칸</b> · 맨 아래 <b>천사칸</b> · 각자 말 <b>4개</b>",
      "준비: 순서대로 말을 1개씩 게임판에 놓음 (<b>한 칸에 최대 2개</b>)",
      "진행: 내 말이 있는 칸의 말을 <b>전부</b> 집어 다음 칸부터 <b>시계 방향</b>으로 1개씩 놓음 (어느 말을 어디에 놓을지는 옮기는 사람이 정함)",
      "점수: <b>마지막으로 놓은 말의 주인</b>이 그 칸의 말 수(자기 말 포함)만큼 그 칸 색 점수를 얻음",
      "특수: <b>천사칸</b> = 그 주인의 가장 적은 색 · <b>악마칸</b> = 가장 많은 색 (동률이면 옮긴 사람이 색을 고름)",
      "끝: 누군가 <b>한 색 30점</b> 이상이 되면 즉시 끝 → 최종 점수로 순위",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : V.phase === "place" ? `말 놓기 · 남은 ${V.left}개` : `${Math.floor(V.turn / V.n) + 1}바퀴 · ${V.turn + 1}번째 차례`),
    chip: (V, i) => ({ t: `${V.fin[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

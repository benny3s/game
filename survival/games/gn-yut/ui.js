/* 베니 서바이벌 · 전략 윷놀이 — 화면 (29점 십자 판 · 4명 비밀 윷 고르기 · 말 고르기 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-yut"];
  const esc = G.esc;
  // ── 판 좌표 (viewBox 300 × 308) ─────────────────────────────
  const NP = [];
  (() => {
    const A = 30, B = 270, st = 48, lerp = (p, q, t) => [Math.round(p[0] + (q[0] - p[0]) * t), Math.round(p[1] + (q[1] - p[1]) * t)];
    NP[0] = [B, B]; NP[5] = [B, A]; NP[10] = [A, A]; NP[15] = [A, B]; NP[22] = [150, 150];
    for (let k = 1; k <= 4; k++) { NP[k] = [B, B - st * k]; NP[5 + k] = [B - st * k, A]; NP[10 + k] = [A, A + st * k]; NP[15 + k] = [A + st * k, B]; }
    for (const [a, c, n0] of [[5, 22, 20], [22, 15, 23], [10, 22, 25], [22, 0, 27]]) { NP[n0] = lerp(NP[a], NP[c], 1 / 3); NP[n0 + 1] = lerp(NP[a], NP[c], 2 / 3); }
  })();
  const BIG = n => n === 0 || n === 5 || n === 10 || n === 15 || n === 22;
  const TEAMCOL = [["#2563eb", "#60a5fa"], ["#dc2626", "#f87171"]];            // 파랑 팀 (후보 · 짝) · 빨강 팀
  const TEAMNM = ["파랑", "빨강"];
  const CSS = `
.yt-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap;min-height:24px}
.yt-rd{font:900 13.5px var(--round);color:#fff;background:rgba(245,179,1,.2);border:1px solid rgba(245,179,1,.55);border-radius:99px;padding:3px 10px;white-space:nowrap}
.yt-tm{font:800 12px var(--round);border-radius:99px;padding:3px 9px;white-space:nowrap;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.28);color:#fff}
.yt-tm i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.yt-board{position:relative;flex:1 1 0;min-height:92px;min-width:0}
.yt-board svg{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.yt-bd{fill:#3a2a1c;stroke:#c9a35e;stroke-width:3}
.yt-ln{stroke:#b98f4e;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
.yt-nd{fill:#241810;stroke:#c9a35e;stroke-width:2}
.yt-nd.big{fill:#2f2012;stroke:#f5b301;stroke-width:3}
.yt-nd.c22{stroke-dasharray:3 3}
.yt-lb{font:800 10px var(--round);fill:#fde68a;text-anchor:middle}
.yt-tk circle{stroke-width:2.5}
.yt-tk text{font:900 12px var(--round);fill:#fff;text-anchor:middle;paint-order:stroke;stroke:rgba(0,0,0,.65);stroke-width:2.4px}
.yt-tk.can{cursor:pointer}
.yt-tk.can circle.hl{fill:none;stroke:#fde68a;stroke-width:2.5;animation:ytPulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.yt-tk.sel circle.hl{stroke:#4ade80;stroke-width:3.5}
@keyframes ytPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.22);opacity:.55}}
.yt-mk{fill:none;stroke-width:3.5}
.yt-mk.last{stroke:#fde68a}.yt-mk.from{stroke:rgba(253,230,138,.5);stroke-dasharray:3 3}
.yt-mk.dest{stroke:#4ade80;animation:ytPulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.yt-pv{stroke:#4ade80;stroke-width:3;stroke-dasharray:5 5;fill:none;opacity:.85}
.yt-hit{fill:transparent;cursor:pointer}
.yt-throw{display:flex;align-items:stretch;gap:6px;flex:none}
.yt-sk{flex:1 1 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;min-width:0}
.yt-sc{display:grid;justify-items:center;align-content:center;gap:2px;padding:4px 2px;border-radius:10px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.14);min-width:0;min-height:44px}
.yt-sc.me{border-color:#86efac}
.yt-sc.on{border-color:#fde68a}
.yt-sc small{font:700 10.5px var(--round);color:var(--soft);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yt-sc .q{font:900 15px/1 var(--round);color:#94a3b8;height:24px;display:grid;place-items:center}
.yt-sc .q.ok{color:#86efac}
.yt-st{display:inline-block;width:11px;height:24px;border-radius:6px;border:1.5px solid rgba(0,0,0,.55);box-sizing:border-box}
.yt-st.f{background:repeating-linear-gradient(180deg,#f6dfae 0 5px,#c9a05a 5px 7px)}
.yt-st.b{background:#5b3a1e}
.yt-sc.flip .yt-st{animation:ytFlip .5s ease-out}
@keyframes ytFlip{0%{transform:rotateY(90deg) scaleY(.7)}100%{transform:none}}
.yt-rs{flex:none;width:76px;display:grid;justify-items:center;align-content:center;gap:0;border-radius:10px;background:rgba(245,179,1,.14);border:1.5px solid rgba(245,179,1,.5);padding:2px 4px}
.yt-rs b{font:900 20px/1.1 var(--round);color:#fde68a}
.yt-rs small{font:700 10.5px var(--round);color:#e2e8f0;text-align:center}
.yt-rs.ex{background:rgba(74,222,128,.16);border-color:#4ade80}.yt-rs.ex b{color:#bbf7d0}
.yt-rs.bk{background:rgba(248,113,113,.16);border-color:#f87171}.yt-rs.bk b{color:#fecaca}
.yt-rs.idle b{font-size:16px;color:#cbd5e1}
.yt-ln2{flex:none;text-align:center;font:700 12px var(--round);color:#cbd5e1;min-height:15px;line-height:1.3}
.yt-ln2 b{color:#fde68a}
.yt-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.yt-info b{color:#fde68a}
.yt-yard{display:flex;gap:4px;flex:none;justify-content:space-between}
.yt-ys{display:flex;align-items:center;gap:3px;padding:2px 5px 2px 2px;border-radius:99px;background:rgba(0,0,0,.26);border:1px solid rgba(255,255,255,.1);min-width:0}
.yt-ys.on{border-color:#fde68a}
.yt-ys .av{width:19px;height:19px;border-radius:50%;display:grid;place-items:center;font:900 10px var(--round);color:#fff;border:1.5px solid rgba(255,255,255,.5);flex:none;overflow:hidden}
.yt-ys .av.cd{border-color:#f5b301}
.yt-pp{width:15px;height:15px;border-radius:50%;display:grid;place-items:center;font:900 9px var(--round);color:#fff;border:1.5px solid rgba(255,255,255,.55);box-sizing:border-box;flex:none}
.yt-pp.o{background:transparent!important;color:#94a3b8;border-color:rgba(255,255,255,.28)}
.yt-pp.d{background:#16a34a!important;border-color:#86efac}
.yt-acts{display:grid;gap:6px;flex:none}
.yt-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.yt-two button{min-height:52px;border-radius:14px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.09);color:#fff;font:900 16px var(--round);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 8px}
.yt-two button small{font:700 11px var(--round);color:var(--soft);display:block}
.yt-two button:active{transform:scale(.97)}
.yt-two button.on{border-color:#4ade80;background:rgba(74,222,128,.2)}
.yt-two button:disabled{opacity:.4;cursor:default}
.yt-pb{display:grid;gap:1px;justify-items:center;line-height:1.25}
.yt-pb b{font:900 15px var(--round)}
.yt-pb em{font:700 11px var(--round);font-style:normal;color:#fde68a;min-height:14px}
.yt-tut{display:grid;gap:8px;justify-items:center;font-size:13.5px;width:100%}
.yt-tut .yt-bw{position:relative;width:min(100%,250px);aspect-ratio:300/308}
.yt-tut .yt-bw svg{position:absolute;left:0;top:0;width:100%;height:100%}
.yt-tut .yt-info{width:100%}
.yt-tut .yt-sk{width:100%}
.yt-tab{border-collapse:collapse;width:100%;font-size:12.5px}
.yt-tab td,.yt-tab th{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.1);text-align:center}
.yt-tab th{color:var(--soft);font-weight:700}
.sv-coachfit .yt-info,.sv-coachfit .yt-yard{display:none}
@media (max-height:700px){.yt-two button{min-height:46px;font-size:15px}.yt-sc{min-height:40px;padding:3px 2px}.yt-sc .q{height:20px}.yt-st{height:20px}.yt-info{font-size:12px}}
@media (max-width:360px){.yt-rs{width:66px}.yt-ys .av{width:17px;height:17px}.yt-pp{width:13px;height:13px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const who = (ctx, me, watch, i) => (i === me && !watch ? "나" : esc(nameOf(ctx, i)));
  const ini = (ctx, me, watch, i) => (i === me && !watch ? "나" : esc(Array.from(String(nameOf(ctx, i)).replace(/\s/g, ""))[0] || "?"));
  const seatCol = (V, s, mt) => TEAMCOL[V.team[s] === mt ? 0 : 1][V.cand[V.team[s]] === s ? 0 : 1];
  const iga = (ctx, me, watch, i) => { if (i === me && !watch) return "내가"; const n = nameOf(ctx, i); return esc(n) + (G.hasFinal(n) ? "이" : "가"); };
  const teamWord = (t, mt) => TEAMNM[t === mt ? 0 : 1];                          // 보는 사람 팀 = 파랑
  const stickHtml = f => `<i class="yt-st ${f === 1 ? "f" : "b"}"></i>`;

  // ── 판 그림 ──────────────────────────────────────────────────
  // o: { tokens:[{n, dx, col, txt, ring, can, sel, p, s}], last:{from,to}, prev:{from,to}, hit:true, labels:true }
  function boardSvg(o) {
    o = o || {};
    const xy = n => NP[n], line = (...ns) => `<polyline class="yt-ln" points="${ns.map(n => xy(n).join(",")).join(" ")}"/>`;
    let s = `<svg viewBox="0 0 300 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="윷판">`;
    s += `<rect class="yt-bd" x="10" y="10" width="280" height="280" rx="22"/>`;
    s += line(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 0) + line(5, 20, 21, 22, 23, 24, 15) + line(10, 25, 26, 22, 27, 28, 0);
    for (let n = 0; n < 29; n++) { const [x, y] = xy(n); s += `<circle class="yt-nd${BIG(n) ? " big" : ""}${n === 22 ? " c22" : ""}" cx="${x}" cy="${y}" r="${BIG(n) ? 12 : 7}"/>`; }
    if (o.labels !== false) {
      s += `<text class="yt-lb" x="270" y="297">출발 · 도착</text><path d="M287 205 l-6 10 h12 z" fill="#fde68a" opacity=".75"/>`;
      s += `<text class="yt-lb" x="150" y="127" opacity=".8">가운데</text>`;
    }
    const L = o.last || {};
    if (L.from != null && L.from >= 0) s += `<circle class="yt-mk from" cx="${xy(L.from)[0]}" cy="${xy(L.from)[1]}" r="${BIG(L.from) ? 16 : 11}"/>`;
    if (L.to != null && L.to >= 0) s += `<circle class="yt-mk last" cx="${xy(L.to)[0]}" cy="${xy(L.to)[1]}" r="${BIG(L.to) ? 17 : 13}"/>`;
    else if (L.to === -2) s += `<circle class="yt-mk last" cx="${xy(0)[0]}" cy="${xy(0)[1]}" r="17"/>`;
    const P = o.prev;
    if (P && P.to != null) {
      const tn = P.to === -2 ? 0 : P.to, a = xy(P.from >= 0 ? P.from : 0), b = xy(tn);
      if (P.from !== tn) s += `<line class="yt-pv" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
      s += `<circle class="yt-mk dest" cx="${b[0]}" cy="${b[1]}" r="${BIG(tn) ? 17 : 13}"/>`;
    }
    for (const t of o.tokens || []) {
      const [x0, y] = xy(t.n), x = x0 + (t.dx || 0);
      s += `<g class="yt-tk${t.can ? " can" : ""}${t.sel ? " sel" : ""}"${t.p != null ? ` data-p="${t.p}" data-s="${t.s}"` : ""}>`;
      if (t.can) s += `<circle class="hl" cx="${x}" cy="${y}" r="15"/>`;
      s += `<circle cx="${x}" cy="${y}" r="11" fill="${t.col}" stroke="${t.ring ? "#f5b301" : "rgba(255,255,255,.85)"}"/><text x="${x}" y="${y + 4.2}">${esc(t.txt)}</text></g>`;
    }
    if (o.hit) for (const n of o.hit) { const [x, y] = xy(n); s += `<circle class="yt-hit" data-n="${n}" cx="${x}" cy="${y}" r="17"/>`; }
    return s + `</svg>`;
  }
  // 판 위의 말들을 칸별로 모아 토큰으로 (같은 사람의 두 말이 한 칸에 있으면 하나로 '×2')
  function tokensOf(V, mt, can, sel) {
    const by = {};
    for (let s = 0; s < 4; s++) {
      const a = V.pc[s * 2], b = V.pc[s * 2 + 1], na = a >= 0 && a < G.DONE ? G.nodeOf(a) : -1, nb = b >= 0 && b < G.DONE ? G.nodeOf(b) : -1;
      if (na >= 0 && na === nb) (by[na] = by[na] || []).push({ s, p: 0, txt: "×2", two: true });
      else { if (na >= 0) (by[na] = by[na] || []).push({ s, p: 0, txt: "1" }); if (nb >= 0) (by[nb] = by[nb] || []).push({ s, p: 1, txt: "2" }); }
    }
    const out = [];
    for (const n of Object.keys(by)) {
      const l = by[n]; l.forEach((t, i) => out.push({ n: +n, dx: l.length > 1 ? (i ? 10 : -10) : 0, col: seatCol(V, t.s, mt), txt: t.txt, ring: V.cand[V.team[t.s]] === t.s, can: !!can && can.s === t.s && can.p.includes(t.p), sel: sel != null && can && can.s === t.s && sel === t.p, p: t.p, s: t.s }));
    }
    return out;
  }

  // 화면 상태 (한 번에 한 번만 보내기 · 고른 말)
  let PS = null;
  const ps = (V, ctx) => {
    const key = `${ctx.g}|${V.turn}|${V.phase}|${ctx.me}`;
    if (!PS || PS.key !== key) PS = { key, sel: null, t: 0, busy: "" };
    return PS;
  };
  function logLine(V, ctx, me, watch) {
    const L = V.last; if (!L) return "";
    const w = who(ctx, me, watch, L.s);
    if (L.pass) return `${w}: ${L.t != null && G.RES[L.t] ? G.RES[L.t].n : ""} — 움직일 말이 없어 넘어갔어요`;
    const R = G.RES[L.t], k = L.k;
    return `${w}: <b>${R.n}</b>(${k < 0 ? "뒤로 1칸" : `${k}칸`}) · ${L.p + 1}번 말${L.unit && L.unit.length > 1 ? "(업은 말)" : ""}${L.cap && L.cap.length ? " · <b>상대 말을 잡았어요!</b>" : ""}${L.done ? ` · ${L.done}개 들어왔어요` : ""}${L.ex ? " · <b>한 번 더</b>" : ""}`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, mt = watch ? V.team[0] : V.team[me];
    const canAct = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const S = ps(V, ctx), ph = V.phase;
    const mover = V.mover, moverMine = !watch && V.team[mover] === mt;
    // 위: 몇 번째 · 차례 · 팀 색
    let h = `<div class="yt-top">`;
    if (!V.over && ph !== "first") h += `<span class="yt-tm"><i style="background:${seatCol(V, mover, mt)}"></i>${who(ctx, me, watch, mover)} 차례${V.extra && (ph === "moved") ? " (한 번 더)" : ""}</span>`;
    h += `<span class="yt-tm"><i style="background:${TEAMCOL[0][0]}"></i>${watch ? "파랑 팀" : "우리"}</span><span class="yt-tm"><i style="background:${TEAMCOL[1][0]}"></i>${watch ? "빨강 팀" : "상대"}</span></div>`;
    // 판
    let can = null, sel = null, prev = null;
    if (canAct && ph === "move" && mover === me) {
      const mv = G.moveList(V); can = { s: me, p: mv };
      sel = mv.includes(S.sel) ? S.sel : null; if (sel === null) S.sel = null;
      if (sel !== null) { const mf = G.moveFacts(V, me, sel); prev = { from: mf.from, to: mf.nc === G.DONE ? -2 : mf.to }; }
    }
    const L = V.last && (ph === "moved" || ph === "move" || ph === "stick" || ph === "reveal") ? { from: V.last.from, to: V.last.to } : null;
    h += `<div class="yt-board">${boardSvg({ tokens: tokensOf(V, mt, can, sel), last: L, prev })}</div>`;
    // 말 집 · 들어온 말
    const seatsOrd = [0, 1, 2, 3].sort((a, b) => (V.team[a] === mt ? 0 : 1) - (V.team[b] === mt ? 0 : 1) || (V.cand[V.team[b]] === b ? 1 : 0) - (V.cand[V.team[a]] === a ? 1 : 0));
    h += `<div class="yt-yard">${seatsOrd.map(s => `<span class="yt-ys${V.needs.includes(s) && !V.over ? " on" : ""}"><span class="av${V.cand[V.team[s]] === s ? " cd" : ""}" style="background:${seatCol(V, s, mt)}">${ini(ctx, me, watch, s)}</span>${[0, 1].map(p => { const c = V.pc[s * 2 + p]; return `<span class="yt-pp ${c === G.DONE ? "d" : c === G.HOME ? "" : "o"}" style="background:${seatCol(V, s, mt)}">${c === G.DONE ? "✓" : p + 1}</span>`; }).join("")}</span>`).join("")}</div>`;
    // 윷 던지기 줄: 4명의 선택 + 결과
    const shown = ph === "reveal" || ph === "move" || ph === "moved" || ph === "end" || watch;
    const R = (ph === "reveal" || ph === "move" || ph === "moved" || ph === "end") ? V.res : null;
    const cell = s => {
      const pk = V.picks[s], mine = s === me && !watch, on = V.needs.includes(s) && ph === "stick";
      let g;
      if (pk === 0 || pk === 1) g = `${stickHtml(pk)}`; else if (pk === -1) g = `<span class="q ok">🔒</span>`; else g = `<span class="q">…</span>`;
      return `<div class="yt-sc${mine ? " me" : ""}${on ? " on" : ""}${R && ph === "reveal" ? " flip" : ""}">${g}<small>${who(ctx, me, watch, s)}</small></div>`;
    };
    let rs = `<div class="yt-rs idle"><b>?</b><small>${ph === "first" ? "선 · 후 먼저" : "고르는 중"}</small></div>`;
    if (R) rs = `<div class="yt-rs${R.ex ? " ex" : R.k < 0 ? " bk" : ""}"><b>${R.n}</b><small>${R.k < 0 ? "뒤로 1칸" : `${R.k}칸`}${R.ex ? " · 한 번 더" : ""}</small></div>`;
    h += `<div class="yt-throw"><div class="yt-sk">${[0, 1, 2, 3].map(cell).join("")}</div>${rs}</div>`;
    // 한 줄 소식 · 안내
    h += `<div class="yt-ln2">${logLine(V, ctx, me, watch)}</div>`;
    let info = "", acts = "";
    if (V.over) {
      const wt = V.win;
      info = `<b>${watch ? TEAMNM[wt === V.team[0] ? 0 : 1] : teamWord(wt, mt)} 팀 승리!</b> — ${V.cand[wt] === me && !watch ? "내" : `후보 ${who(ctx, me, watch, V.cand[wt])}의`} 말 둘이 먼저 들어왔어요`;
    } else if (ph === "first") {
      if (canAct) {
        info = `<b>선 · 후</b>를 골라요 — 선은 먼저 던지고, 후는 나중에 던져요`;
        acts = `<div class="yt-two"><button type="button" data-v="0"><span>🥇 선<small>먼저 던져요</small></span></button><button type="button" data-v="1"><span>🥈 후<small>나중에 던져요</small></span></button></div>`;
      } else info = `${iga(ctx, me, watch, V.needs[0] || 0)} 선 · 후를 고르는 중이에요…`;
    } else if (ph === "stick") {
      if (canAct) {
        info = `${moverMine ? "우리 쪽" : "상대 쪽"} ${who(ctx, me, watch, mover)} 차례 — 앞면 · 뒷면 중 <b>하나를 몰래</b> 골라요. 4명의 앞면 수가 결과예요 (4 윷 · 3 걸 · 2 개 · 1 뒷도 · 0 모)`;
        acts = `<div class="yt-two"><button type="button" data-f="1">${stickHtml(1)}<span>앞면</span></button><button type="button" data-f="0">${stickHtml(0)}<span>뒷면</span></button></div>`;
      } else if (!watch && V.picked[me]) info = `골랐어요 — 나머지 ${4 - V.picked.filter(Boolean).length}명을 기다려요`;
      else info = watch ? "4명이 비밀로 앞면 · 뒷면을 고르는 중이에요" : "다른 사람이 고르는 중이에요…";
    } else if (ph === "reveal") {
      info = R ? `4명의 앞면이 <b>${R.t}개</b> → <b>${R.n}</b>!` : "";
    } else if (ph === "move") {
      if (canAct && mover === me) {
        const mv = G.moveList(V);
        info = sel === null ? `움직일 <b>말을 골라요</b> — 누르면 도착 칸을 미리 보여 줘요` : `도착 칸을 확인했나요? <b>같은 말을 한 번 더</b> 누르면 움직여요`;
        acts = `<div class="yt-two">${mv.map(p => {
          const mf = G.moveFacts(V, me, p), tag = mf.tags.length ? mf.tags.map(x => (/잡기/.test(x) ? "잡기!" : /들어와/.test(x) ? "들어와요" : /업/.test(x) ? "업어요" : /지름길|가운데/.test(x) ? "지름길" : /한 바퀴/.test(x) ? "한 바퀴" : x)).join(" · ") : (mf.nc === G.DONE ? "들어와요" : mf.from < 0 ? "판에 올려요" : "앞으로");
          return `<button type="button" class="yt-pb${sel === p ? " on" : ""}" data-p="${p}"><b>${p + 1}번 말${sel === p ? " ✔" : ""}</b><em>${esc(tag)}</em></button>`;
        }).join("")}</div>`;
      } else info = `${iga(ctx, me, watch, mover)} 어느 말을 움직일지 고르는 중이에요…`;
    } else if (ph === "moved") {
      info = V.extra ? `<b>한 번 더!</b> 같은 사람이 다시 던져요` : "";
    }
    if (info) h += `<div class="yt-info">${info}</div>`;
    h += acts;
    stage.innerHTML = h;
    stage.onclick = e => {
      if (!canAct) return;
      const b = e.target.closest("button,[data-p],[data-go]"); if (!b || b.disabled) return;
      const now = Date.now();
      const send = a => { if (now - S.t < 450 || (S.busy === V.pub && now - S.t < 1500)) return; S.t = now; S.busy = V.pub; ctx.sfx("pop"); ctx.act(a); };
      if (b.dataset.v !== undefined) { send({ t: "first", v: +b.dataset.v }); return; }
      if (b.dataset.f !== undefined) { send({ t: "stick", f: +b.dataset.f }); return; }
      if (b.dataset.p !== undefined && ph === "move" && mover === me) {
        const p = +b.dataset.p; if (!G.moveList(V).includes(p)) return;
        if (S.sel === p) { send({ t: "move", p }); return; }
        S.sel = p; ctx.sfx("tap"); render(stage, V, ctx);
      }
    };
  }

  // ── 결과 · 복기 ───────────────────────────────────────────
  function result(V, me) {
    if (!V || !V.over) return "";
    const mt = me >= 0 ? V.team[me] : V.team[0], wt = V.win, wn = teamWord(wt, mt), ln = teamWord(1 - wt, mt);
    const mine = me >= 0 ? (V.team[me] === wt ? "🎉 우리 팀이 이겼어요 · " : "아쉽게 졌어요 · ") : "";
    return `<b>${mine}${wn} 팀 승리</b> — 탈락후보의 말 둘이 먼저 들어왔어요 · 잡기 ${wn} ${V.stat.cap[wt]}번 · ${ln} ${V.stat.cap[1 - wt]}번 · 던진 횟수 ${V.stat.throws}번 (${ln} 팀 후보가 탈락)`;
  }
  const reviewNm = (names, i) => (names && names[i]) || `${i + 1}번`;
  function review(V, seat, myA, bestA, info) {
    try {
      const c = G.compareActs(V, seat, myA, bestA);
      if (!c) return null;
      const loss = Math.max(0, G.cl(c.best) - G.cl(c.mine));
      if (c.kind === "stick") {
        const sev = Math.min(100, Math.round(loss * 6)), fm = c.sf.f[c.fm], fb = c.sf.f[c.fb], nmf = f => (f === 1 ? "앞면" : "뒷면");
        const lead = loss < 0.4 ? `두 쪽의 기대 점수가 거의 같아요 (앞면 ${G.sg(c.sf.f[1].ev)} · 뒷면 ${G.sg(c.sf.f[0].ev)})` : `${nmf(c.fb)}이 ${loss.toFixed(1)}칸 어치 더 나아요 (${nmf(c.fb)} ${G.sg(c.best)} · ${nmf(c.fm)} ${G.sg(c.mine)}, 던진 뒤 말판 점수 기대값)`;
        return { sev, why: `${lead} — ${nmf(c.fb)}이면 말 잡기 ${G.pct(fb.cap)} · 한 번 더 ${G.pct(fb.extra)} · 평균 ${fb.k.toFixed(1)}칸 / ${nmf(c.fm)}이면 ${G.pct(fm.cap)} · ${G.pct(fm.extra)} · ${fm.k.toFixed(1)}칸 (나머지 셋은 반반으로 봄)` };
      }
      if (c.kind === "move") {
        const sev = Math.min(100, Math.round(loss * 8)), txt = (mf, p) => `${p + 1}번 말(${mf.tags.length ? mf.tags.join(" · ") : mf.nc === G.DONE ? "들어와요" : `${mf.k < 0 ? "뒤로 1칸" : `${mf.k}칸 앞`}`}${mf.risk > 0.005 ? ` · 잡힐 위험 ${G.pct(mf.risk)}` : ""})`;
        const lead = loss < 0.4 ? "두 수의 기대 점수가 거의 같아요" : `고급 AI 수가 ${loss.toFixed(1)}칸 어치 더 나아요`;
        return { sev, why: `${lead} — 고급 AI 수 ${txt(c.bf, bestA.p)} 기대 ${G.sg(c.best)} · 내 수 ${txt(c.mf, myA.p)} 기대 ${G.sg(c.mine)} (던진 뒤 말판 점수, 칸 환산)` };
      }
    } catch (e) { return null; }
    return null;
  }

  // ── 1분 규칙 ─────────────────────────────────────────────
  const tutBoard = (o, w) => `<div class="yt-bw"${w ? ` style="width:min(100%,${w}px)"` : ""}>${boardSvg(o)}</div>`;
  const stickRow = (fs, labels) => `<div class="yt-sk">${fs.map((f, i) => `<div class="yt-sc">${stickHtml(f)}<small>${labels ? labels[i] : ""}</small></div>`).join("")}</div>`;
  function tutorial() {
    style();
    const tk = (n, col, txt, ring, dx) => ({ n, col, txt, ring, dx: dx || 0 });
    const B1 = TEAMCOL[0][0], B2 = TEAMCOL[0][1], R1 = TEAMCOL[1][0], R2 = TEAMCOL[1][1];
    return [
      { tag: "STEP 1 · 팀전", title: "2:2 — 후보의 말 둘이 먼저 들어오면 승리", body: "탈락후보 두 명이 각자 <b>파트너</b>를 한 명씩 골라 <b>4명</b>이 해요. 모두 <b>말 2개</b>씩! <b>탈락후보의 말 둘이 먼저 다 들어오는 팀</b>이 이겨요. 파트너의 말은 돕는 데만 쓰여요 (먼저 들어와도 승패는 그대로).",
        boardHtml: `<div class="yt-tut"><div class="yt-yard" style="width:100%;flex-wrap:wrap;justify-content:center"><span class="yt-ys"><span class="av cd" style="background:${B1}">나</span><span class="yt-pp" style="background:${B1}">1</span><span class="yt-pp" style="background:${B1}">2</span><small style="color:var(--soft)">후보</small></span><span class="yt-ys"><span class="av" style="background:${B2}">짝</span><span class="yt-pp" style="background:${B2}">1</span><span class="yt-pp" style="background:${B2}">2</span></span></div><div class="yt-yard" style="width:100%;flex-wrap:wrap;justify-content:center"><span class="yt-ys"><span class="av cd" style="background:${R1}">상</span><span class="yt-pp" style="background:${R1}">1</span><span class="yt-pp" style="background:${R1}">2</span><small style="color:var(--soft)">후보</small></span><span class="yt-ys"><span class="av" style="background:${R2}">짝</span><span class="yt-pp" style="background:${R2}">1</span><span class="yt-pp" style="background:${R2}">2</span></span></div><div class="yt-info">금색 테두리 = 탈락후보 · 차례는 후보A → 파트너B → 후보B → 파트너A …</div></div>`, ms: 6500 },
      { tag: "STEP 2 · 윷 고르기", title: "윷은 한 명이 던지지 않아요", body: "4명이 각자 <b>앞면만 있는 윷</b>과 <b>뒷면만 있는 윷</b> 한 개씩을 가져요. 매 차례 4명이 <b>몰래 하나씩 골라</b> 함께 던져요. 남이 뭘 골랐는지는 다 고를 때까지 몰라요!",
        boardHtml: `<div class="yt-tut">${stickRow([1, 0], ["앞면만 있는 윷", "뒷면만 있는 윷"])}<div class="yt-info">파트너와도 말을 못 해요 — 눈치로 맞춰요</div></div>`, ms: 6500 },
      { tag: "STEP 3 · 결과", title: "앞면이 몇 개인지가 결과", body: "4명이 고른 것을 합쳐요. <b>앞면 4개 = 윷</b>(4칸, 한 번 더) · 3개 = 걸(3칸) · 2개 = 개(2칸) · 1개 = <b>뒷도</b>(한 칸 뒤로) · 0개 = <b>모</b>(5칸, 한 번 더). 방송처럼 <b>도는 모두 뒷도</b>예요. 출발점 바로 앞 칸의 말이 뒷도로 출발점에 닿으면 한 바퀴를 돈 걸로 쳐요.",
        boardHtml: `<div class="yt-tut"><table class="yt-tab"><tr><th>앞면 수</th><th>이름</th><th>움직임</th></tr><tr><td>4</td><td><b>윷</b></td><td>4칸 · 한 번 더</td></tr><tr><td>3</td><td>걸</td><td>3칸</td></tr><tr><td>2</td><td>개</td><td>2칸</td></tr><tr><td>1</td><td>뒷도</td><td>한 칸 뒤로</td></tr><tr><td>0</td><td><b>모</b></td><td>5칸 · 한 번 더</td></tr></table></div>`, ms: 8000 },
      { tag: "STEP 4 · 판", title: "29점 십자 판 · 지름길", body: "출발점(오른쪽 아래)에서 <b>반시계 방향</b>으로 한 바퀴 돌아 다시 출발점에 닿으면 들어와요. <b>모서리 · 가운데에 정확히 멈추면</b> 지름길을 타요 (지나가기만 하면 그대로). 오른쪽 위 모서리 → 가운데 → 왼쪽 아래, 왼쪽 위 모서리 → 가운데 → 출발점.",
        boardHtml: `<div class="yt-tut">${tutBoard({ tokens: [tk(5, B1, "1", true), tk(10, R1, "1", true)] })}</div>`, ms: 8000 },
      { tag: "STEP 5 · 잡기 · 업기", title: "잡으면 한 번 더 · 같은 사람 말은 업어요", body: "내 말이 <b>상대 말이 있는 칸</b>에 닿으면 잡아서 상대 말은 처음 자리로! 잡으면 <b>한 번 더</b>. 같은 사람의 말 둘이 한 칸에 모이면 <b>업어서</b> 한꺼번에 움직여요. 같은 편 다른 사람의 말과는 한 칸에 같이 있어도 따로 움직이고 서로 잡지 않아요.",
        boardHtml: `<div class="yt-tut">${tutBoard({ tokens: [tk(3, B1, "×2", true), tk(6, R1, "1", true, -10), tk(6, R2, "2", false, 10), tk(12, B2, "1", false)] })}<div class="yt-info">파랑 후보의 업은 말(×2)이 걸(3칸)이면 → 빨강 말을 잡아요</div></div>`, ms: 8000 },
      { tag: "STEP 6 · 직접", title: "모서리에 멈춘 말이 걸을 던졌어요", body: "오른쪽 위 <b>모서리</b>(🔵)에 멈춘 내 말에게 <b>걸(3칸)</b>이 나왔어요. 지름길을 타면 어디에 닿을까요? 판에서 도착 칸을 눌러요.",
        interactive: { hint: "👆 닿는 칸을 눌러요", doneText: "✅ 가운데! 모서리에 멈춘 말은 지름길을 타서, 3칸 가면 가운데에 닿아요" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="yt-tut">${tutBoard({ tokens: [tk(5, B1, "1", true)], hit: [8, 21, 22, 24] })}<div class="yt-info" id="yt-tm">모서리의 말 + 걸(3칸) → 어디?</div></div>`;
          let done = false;
          stage.onclick = e => {
            const c = e.target.closest("[data-n]"); if (!c || done) return;
            const n = +c.dataset.n, m = stage.querySelector("#yt-tm");
            if (n === 22) { done = true; ctrl.sfx("win"); if (m) m.textContent = "맞아요! 대각선으로 1 → 2 → 3칸, 가운데예요"; ctrl.complete(); }
            else { ctrl.sfx("tap"); if (m) m.textContent = n === 8 ? "그쪽은 바깥 길이에요 — 모서리에 멈췄으니 지름길로 가요!" : n === 21 ? "그건 2칸이에요 — 한 칸 더 가요" : "그건 가운데를 지나쳐요 — 3칸만 가요"; }
          };
        } },
      { tag: "STEP 7 · 차례 · 작전", title: "윷은 같이, 말은 차례대로", body: "윷은 4명이 다 같이 고르고, <b>말은 차례인 사람</b>만 움직여요. 모 · 윷 · 잡기로 한 번 더가 나오면 <b>같은 사람</b>이 다시 던져요. 말 둘이 다 들어온 파트너는 차례를 건너뛰어요. 상대가 모를 것 같은 쪽을 고르고, 파트너 말을 징검다리로 쓰거나 상대의 모 · 윷 · 뒷도를 견제해 봐요. 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="yt-tut"><span style="font-size:42px">🎲</span><div class="yt-info">선 · 후는 시작할 때 한 번 골라요</div></div>`, ms: 7000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-yut"] = {
    name: "전략 윷놀이", emoji: "🎲", short: "4명이 몰래 고른 앞·뒷면 윷으로 후보의 말 둘을 먼저 들여요 · 2:2 팀전", min: 4, max: 4, defN: 4, board: false, fitCoach: true,
    show: "더 지니어스 · 시즌 1 · 전략 윷놀이", season: "시즌 1 게임의 법칙",
    src: "더 지니어스 시즌 1 전략 윷놀이 · 3·4·10화 데스매치 · 시즌 4 그랜드 파이널 2화 데스매치",
    opts: [{ k: "mate", label: "내 짝 자리", items: [[3, "4번째 자리"], [1, "2번째 자리 (친구랑 내 짝)"]], def: 3 }],
    diff: "혼자(AI) = 나 + AI 짝 vs AI 둘, 친구랑 = 사람이 자리에 앉고 나머지는 AI (한 기기 여럿은 없어요) · 방송이 말하지 않아 우리가 정한 것: 아직 판에 안 들어온 말은 뒷도로 못 움직여요(움직일 말이 없으면 그 차례는 넘어가요) · 업기는 같은 사람의 말끼리만이고 같은 편 다른 사람의 말과는 한 칸에 같이 있어도 따로 움직이고 서로 잡지 않아요 · 결과는 쌓지 않고 바로 움직이며 모 · 윷 · 잡기의 한 번 더는 같은 사람이 다시 던져요 · 말 둘이 다 들어온 사람은 차례를 건너뛰어요 · 모서리에 정확히 멈춘 말만 지름길을 타요 · 시작할 때 선 · 후를 고르는 건 방송과 같고, AI가 고를 땐 선을 골라요(방송은 선이 불리하다는 평이었지만 우리 판은 AI 끼리 1만 2천 판에서 먼저 던지는 쪽이 52% 였어요)",
    howto: [
      "<b>2:2 팀전</b> — 탈락후보 둘이 각자 파트너를 골라 4명이 해요. 모두 말 2개씩, <b>탈락후보의 말 둘이 먼저 다 들어오는 팀</b>이 이겨요 (파트너 말은 돕는 데만 써요)",
      "일반 윷놀이와 다른 점 ① — 한 명이 윷 4개를 던지지 않아요",
      "② — 4명이 각자 앞면만 있는 윷 · 뒷면만 있는 윷 한 개씩을 가지고, 매 차례 <b>몰래 하나를 골라 함께 던져요</b> (앞면 수 4 윷 · 3 걸 · 2 개 · 1 뒷도 · 0 모)",
      "③ — 도는 모두 <b>뒷도</b>(한 칸 뒤로) · 출발점 바로 앞 칸의 말이 뒷도로 출발점에 닿아도 한 바퀴를 돈 것으로 쳐요",
      "그 외는 일반 윷놀이와 같아요 — 29점 십자 판 · 모서리 · 가운데에 멈추면 지름길 · 같은 사람 말 업기 · 잡기 · 윷 · 모 · 잡기는 한 번 더",
      "차례는 후보A → 파트너B → 후보B → 파트너A … · 윷은 4명이 다 고르고, 말은 차례인 사람이 움직여요 · 시작할 때 선 · 후를 골라요",
    ],
    sub: V => (V.over ? "끝" : V.phase === "first" ? "선 · 후" : `${V.turn}번째 던지기`),
    chip: (V, i, me) => ({ t: `${V.team[i] === V.team[me >= 0 ? me : 0] ? "🔵" : "🔴"}${V.cand[V.team[i]] === i ? "★" : "♦"}${V.score[i]}/2`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, tutorial,
    actText: (a, V, names) => G.actText(a, V, names),
    review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
  };
})();

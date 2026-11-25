/* 베니 서바이벌 · 4인 3목 — 화면 (4×4 판 · 쌓인 말 · 새 말 놓기 / 옮기기 · 선생님 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const K = window.SVCores.four3;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COLS = K.COLS, DOT = ["🔴", "🟡", "🟢", "🔵"], CN = K.cellName;
  const SRC = "방송: 데블스 플랜 (시즌 1) · 6일차 상금 매치 (4명)";
  const DIFF = "스페셜 게스트 · 상금 미션(세 사람 협력)은 없고 모두 각자 · 2~4명 (빈 자리는 AI — 2~3명이면 라운드마다 순서를 한 칸씩 돌려요, 방송 순서표는 4명일 때만) · '넘기기' 단추 (방송은 90초를 넘기면 패스) · 모두 연달아 넘기거나 한 라운드 80수가 넘으면 그 라운드는 승자 없음 · 끝에 피스가 같으면 같은 순위 (방송은 동점자 연장전) · 시작 피스는 0 · 차례 시계는 기본 끔 (옵션 90초)";
  const CSS = `
.f3-ord{display:flex;gap:4px;flex:none}
.f3-p{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;height:40px;border-radius:11px;background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.1);font:800 12px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;padding:0 3px}
.f3-p .dt{width:13px;height:13px;border-radius:50%;flex:none;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
.f3-p .tx{display:grid;line-height:1.1;min-width:0;text-align:left}
.f3-p b{color:#fff;font-weight:900;font-size:12.5px}
.f3-p small{font:700 10.5px var(--round);color:var(--soft)}
.f3-p.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.18);color:#fff}
.f3-p.me{background:rgba(255,255,255,.07)}
.f3-p .k{font:900 10px var(--round);opacity:.7}
.f3-st{flex:none;min-height:38px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.f3-st b{color:#fde68a}
.f3-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.f3-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.f3-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.f3-res.mid{color:#e2e8f0;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.45)}
.f3-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.f3-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
.f3-board{position:relative;width:min(100%,320px);aspect-ratio:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:5px;padding:6px;border-radius:16px;background:linear-gradient(#5b3a1e,#3f2812);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25)}
.f3-board svg{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);pointer-events:none;z-index:3}
.f3-c{position:relative;border:0;border-radius:10px;background:linear-gradient(#d6b07a,#c39a5f);padding:0;margin:0;cursor:default;-webkit-tap-highlight-color:transparent;display:grid;place-items:center;min-width:0;min-height:0}
.f3-c .nm{position:absolute;left:5px;top:3px;font:800 9.5px var(--round);color:rgba(63,40,18,.6)}
.f3-c{overflow:hidden}
.f3-c .d{width:58%;max-height:84%;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),0 2px 3px rgba(0,0,0,.35)}
.f3-c .d[data-h="2"]{width:66%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),0 3px 0 rgba(0,0,0,.25),0 5px 3px rgba(0,0,0,.3)}
.f3-c .d[data-h="3"]{width:74%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),0 3px 0 rgba(0,0,0,.25),0 6px 0 rgba(0,0,0,.2),0 8px 3px rgba(0,0,0,.3)}
.f3-c .d i{display:grid;place-items:center;width:100%;height:100%;font:900 12px var(--round);color:rgba(0,0,0,.55);font-style:normal}
.f3-c .ly{position:absolute;right:4px;bottom:4px;display:flex;flex-direction:column-reverse;gap:1.5px}
.f3-c .ly i{display:block;width:9px;height:5px;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
.c0{background:#ef4444}.c1{background:#facc15}.c2{background:#22c55e}.c3{background:#3b82f6}
.f3-c.pick{cursor:pointer}
.f3-c.sel{box-shadow:0 0 0 3px #fff,0 0 12px rgba(255,255,255,.6)}
.f3-c.tgt{cursor:pointer;box-shadow:inset 0 0 0 3px #a5f3fc;background:linear-gradient(#e7c896,#d4ad72)}
.f3-c.last{box-shadow:inset 0 0 0 2.5px rgba(255,255,255,.85)}
.f3-c.from{box-shadow:inset 0 0 0 2.5px rgba(255,255,255,.4);outline:2px dashed rgba(255,255,255,.5);outline-offset:-6px}
.f3-c.full .nm::after{content:" 3층";color:rgba(127,29,29,.75)}
.f3-act{flex:none;display:grid;gap:6px}
.f3-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.f3-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#facc15);transform-origin:left}
.f3-row{display:flex;gap:6px}
.f3-row button{flex:1;min-width:0;height:48px;border-radius:13px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:900 14px var(--round);cursor:pointer;padding:0 4px}
.f3-row button.pl{background:linear-gradient(#4ade80,#16a34a);border:0;color:#052e16}
.f3-row button.mv{background:linear-gradient(#67e8f9,#0891b2);border:0;color:#083344}
.f3-row button:disabled{opacity:.35;cursor:default}
.f3-row button.ps{flex:0 0 auto;min-width:72px;font-size:13px}
.f3-hint{font-size:12px;color:var(--soft);text-align:center;line-height:1.3}
.f3-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.f3-tut .f3-board{width:min(100%,236px)}
.f3-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.f3-tmsg b{color:#fde68a}
@media (max-height:650px){.f3-board{width:min(100%,292px)}.f3-row button{height:46px}.f3-st{min-height:34px;font-size:12px}.f3-p{height:38px}}
.sv-coachfit .f3-board{width:min(100%,calc(var(--sv-sh) - 160px))}
.sv-coachfit .f3-st{min-height:30px;font-size:11.5px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eunn = w => (hasFinal(w) ? "은" : "는");
  const colName = i => COLS[i] || `${i + 1}번`;

  // ── 행동 글 ──
  function actText(a) {
    if (!a) return "";
    if (a.t === "place") return `${CN(a.cell)}에 새 말 ${a.k || 1}개`;
    if (a.t === "move") return `${CN(a.from)} → ${CN(a.to)} 옮기기`;
    if (a.t === "pass") return "넘기기";
    return "";
  }

  // ── 판 그리기 ── o: { pick, sel, tgts:Set, last, lines:[[k,col]] }
  function boardHtml(V, o) {
    o = o || {};
    const top = V.top || V.bd.map(s => (s.length ? s[s.length - 1] : -1)), L = o.last;
    let svg = "";
    if (o.lines && o.lines.length) {
      const P = i => [(i % 4 + 0.5) * 25, (Math.floor(i / 4) + 0.5) * 25];
      svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${o.lines.map(([k, col]) => { const c = K.LINES[k], a = P(c[0]), b = P(c[2]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>`; }).join("")}</svg>`;
    }
    return `<div class="f3-board" aria-label="4인 3목 판">${V.bd.map((sk, i) => {
      let cls = "f3-c";
      if (o.pick) cls += " pick";
      if (o.sel === i) cls += " sel";
      if (o.tgts && o.tgts.has(i)) cls += " tgt";
      if (L && L.t === "place" && L.cell === i) cls += " last";
      if (L && L.t === "move" && L.to === i) cls += " last";
      if (L && L.t === "move" && L.from === i) cls += " from";
      if (sk.length >= K.H) cls += " full";
      const t = top[i];
      const disc = t >= 0 ? `<span class="d c${t}" data-h="${sk.length}"><i>${sk.length > 1 ? sk.length : ""}</i></span>` : "";
      const ly = sk.length > 1 ? `<span class="ly">${sk.map(c => `<i class="c${c}"></i>`).join("")}</span>` : "";
      const tp = o.tp === i ? ' data-tp="1"' : "";
      return `<button type="button" class="${cls}" data-c="${i}"${tp}${o.pick ? "" : ' tabindex="-1"'} aria-label="${CN(i)}${t >= 0 ? ` ${colName(t)} ${sk.length}층` : " 빈 칸"}"><span class="nm">${CN(i)}</span>${disc}${ly}</button>`;
    }).join("")}${svg}</div>`;
  }
  const linesOf = (V, who) => K.LINES.map((L, k) => k).filter(k => { const t = V.top || [], c = K.LINES[k]; return t[c[0]] >= 0 && t[c[0]] === t[c[1]] && t[c[0]] === t[c[2]] && (who == null || who.includes(t[c[0]])); });

  // ── 이 화면의 선택 · 시계 ──
  const S = { pk: "", sel: -1, mode: "", tm: 0, iv: 0, dl: 0, dur: 1, armed: "", stage: null, ctx: null, V: null, sent: 0 };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; S.dl = 0; };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected) { clearInterval(S.iv); S.iv = 0; return; }
    const bar = st.querySelector("[data-bar]"); if (!bar || !S.dl) return;
    const left = Math.max(0, S.dl - nowMs());
    bar.firstElementChild.style.transform = `scaleX(${Math.min(1, left / S.dur)})`;
    st.querySelectorAll("[data-cd]").forEach(cd => { cd.textContent = String(Math.ceil(left / 1000)); });
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = nowMs() + ms; S.dur = ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 200);
  }
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return;
    if (S.sent && Date.now() - S.sent < 1200) return;       // 두 번 탭 막기
    const left = S.dl ? Math.max(0, S.dl - nowMs()) : 0;
    S.sent = Date.now(); clearTimers();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; S.armed = ""; S.resume = left ? { pk: S.pk, left } : null; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); }
    else c.sfx(a.t === "pass" ? "tap" : "pop");
  }

  // 판은 남은 자리(가로 · 세로 중 작은 쪽)에 맞춘 정사각형
  function fitBoard(stage) {
    const w = stage.querySelector(".f3-wrap"), b = w && w.firstElementChild; if (!b) return;
    b.style.width = b.style.height = "";
    const sz = Math.floor(Math.min(w.clientWidth, w.clientHeight || 9999, 320));
    if (sz > 60) { b.style.width = sz + "px"; b.style.height = sz + "px"; }
  }
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, canAct = !!ctx.canAct;
    const pk = `${ctx.g}|${V.round}|${V.moves}|${V.phase}`;
    if (pk !== S.pk) { S.pk = pk; S.sel = -1; S.mode = ""; S.sent = 0; S.armed = ""; clearTimers(); }
    const nm = i => (!watch && i === me ? "나" : colName(i));
    const subj = i => (!watch && i === me ? "내가" : `${colName(i)}${iga(colName(i))}`);
    // 순서 줄
    const ordH = `<div class="f3-ord">${V.order.map((s, j) => `<div class="f3-p${V.cur === s ? " on" : ""}${!watch && s === me ? " me" : ""}"><span class="k">${j + 1}</span><span class="dt c${s}"></span><span class="tx"><b>${!watch && s === me ? "나" : esc(colName(s))}</b><small>✋${V.hand[s]} 🧩${V.pc[s]}</small></span></div>`).join("")}</div>`;
    let st = "", actH = "", bo = { last: V.last };
    const L = V.last;
    const lastTxt = L ? `${subj(L.s)} ${L.t === "pass" ? "넘겼어요" : actText(L)}` : "";
    if (V.phase === "play") {
      const myTurn = canAct && V.cur === me;
      if (myTurn) {
        bo.pick = true; bo.sel = S.sel;
        const top = V.top, mineTop = S.sel >= 0 && top[S.sel] === me;
        const tg = S.sel >= 0 && mineTop ? new Set(K.NB[S.sel].filter(t => V.bd[t].length < K.H)) : new Set();
        if (S.mode === "move") bo.tgts = tg;
        const timer = V.opt && V.opt.timer ? `<div class="f3-bar" data-bar><i></i></div>` : "";
        if (S.mode === "move") {
          st = `<span><b>${CN(S.sel)}</b>의 내 말을 옮길 칸을 골라요 (이웃 · 3층 아닌 칸)</span>`;
          actH = `${timer}<div class="f3-row"><button type="button" data-a="cancel">취소</button><button type="button" class="ps" data-a="pass">넘기기</button></div>`;
        } else if (S.sel >= 0) {
          const h = V.bd[S.sel].length, hd = V.hand[me];
          st = `<span><b>${CN(S.sel)}</b> ${h ? `${h}층 · 맨 위 ${nm(top[S.sel])}` : "빈 칸"} — 새 말 몇 개?${mineTop ? " 또는 <b>옮기기</b>" : ""}</span>`;
          actH = `${timer}<div class="f3-row">${[1, 2, 3].map(k => `<button type="button" class="pl" data-k="${k}"${k > hd || h + k > K.H ? " disabled" : ""}>＋${k}</button>`).join("")}${mineTop ? `<button type="button" class="mv" data-a="move"${tg.size ? "" : " disabled"}>옮기기</button>` : ""}<button type="button" class="ps" data-a="pass">넘기기</button></div>`;
        } else {
          st = `<span>${lastTxt ? lastTxt + "<br>" : ""}<b>내 차례</b> · 칸을 골라요 (남은 말 ${V.hand[me]}개)</span>`;
          actH = `${timer}<div class="f3-row"><button type="button" class="ps" data-a="pass" style="flex:1">넘기기${V.opt && V.opt.timer ? ` (<span data-cd>${V.opt.timer}</span>초)` : ""}</button></div>`;
        }
      } else {
        st = `<span>${lastTxt ? lastTxt + "<br>" : ""}${V.cur >= 0 ? `${subj(V.cur)} 두는 중…` : ""}</span>`;
      }
    } else if (V.rw) {
      const w = V.rw.w, H = V.hist[V.hist.length - 1];
      bo.lines = linesOf(V, w).map(k => [k, "#fff"]);
      const head = w.length === 1 ? `🏆 ${subj(w[0])} 3목! 피스 +3` : w.length > 1 ? `💥 ${w.map(nm).join(" · ")} 동시 3목 — 아무도 못 받음` : V.rw.why === "pass" ? "모두 넘겨서 승자 없음" : "80수가 지나 승자 없음";
      const cls = w.length === 1 ? (watch || w[0] === me ? "ok" : "no") : "mid";
      const endTxt = V.over ? `<br>${V.res.w.length > 1 ? "🤝 공동 1등 " + V.res.w.map(nm).join(" · ") : V.res.w[0] === me && !watch ? "🏆 내가 1등!" : `🏆 ${nm(V.res.w[0])} 1등`} — 피스 ${V.order.slice().sort((a, b) => a - b).map(s => `${nm(s)} ${V.pc[s]}`).join(" · ")}` : "";
      st = `<div class="f3-res ${cls}">${head}${endTxt}<small>${V.round}라운드 · ${H ? H.moves : V.moves}수${L ? ` · 마지막: ${subj(L.s)} ${actText(L)}` : ""}</small></div>`;
    }
    stage.innerHTML = `${ordH}<div class="f3-st">${st}</div><div class="f3-wrap">${boardHtml(V, bo)}</div>${actH ? `<div class="f3-act">${actH}</div>` : ""}`;
    fitBoard(stage);
    if (window.ResizeObserver) {            // 선생님 창이 열리고 닫혀 판 자리가 바뀌면 판 크기도 다시 맞춤 (판 크기가 인라인이라 CSS 로는 안 줄어듦)
      if (render.ro) render.ro.disconnect();
      const w = stage.querySelector(".f3-wrap"); let last = w ? w.clientHeight : 0;
      if (w && w.firstElementChild) { render.ro = new ResizeObserver(() => { if (Math.abs(w.clientHeight - last) > 1) { last = w.clientHeight; fitBoard(stage); } }); render.ro.observe(w); }
    }
    if (canAct && V.phase === "play" && V.cur === me && V.opt && V.opt.timer && S.armed !== pk) {
      S.armed = pk;
      const ms = S.resume && S.resume.pk === pk ? Math.max(3000, S.resume.left) : V.opt.timer * 1000;   // 보내기가 실패해도 시계는 처음부터가 아니라 남은 만큼
      S.resume = null;
      arm(ms, () => send({ t: "pass" }));
    }
    if (S.dl) tick();
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.phase !== "play" || VV.cur !== c.me) return;
      if (t.dataset.a === "pass") { send({ t: "pass" }); return; }
      if (t.dataset.a === "cancel") { S.mode = ""; c.sfx("tap"); render(stage, VV, c); return; }
      if (t.dataset.a === "move") { S.mode = "move"; c.sfx("tap"); render(stage, VV, c); return; }
      if (t.dataset.k) { if (S.sel >= 0) send({ t: "place", cell: S.sel, k: +t.dataset.k }); return; }
      if (t.dataset.c != null) {
        const i = +t.dataset.c;
        if (S.mode === "move") {
          if (t.classList.contains("tgt")) { send({ t: "move", from: S.sel, to: i }); return; }
          if (i === S.sel) { S.mode = ""; render(stage, VV, c); return; }
          S.mode = ""; S.sel = i; c.sfx("tap"); render(stage, VV, c); return;
        }
        S.sel = S.sel === i ? -1 : i; c.sfx("tap"); render(stage, VV, c);
      }
    };
  }

  // ── 선생님 ──
  function coach(V, me, since, names) {
    void since; void names;
    if (!(me >= 0 && me < V.n)) me = V.cur >= 0 ? V.cur : 0;
    const nx = K.nextsOf(V, me), th = V.phase === "play" ? K.threats(V) : [];
    const thOf = p => th.find(x => x.p === p);
    const wtxt = a => (a.t === "place" ? `${K.cellName(a.cell)}에 놓기` : `${K.cellName(a.from)}→${K.cellName(a.to)}`);
    // 👀 상대 흐름
    const opp = "내 다음 차례들 — " + nx.map(p => {
      const t = thOf(p);
      return `${colName(p)} (말 ${V.hand[p]} · 피스 ${V.pc[p]}${t ? ` · ⚠ ${t.acts.slice(0, 2).map(wtxt).join(" / ")}면 바로 3목` : ""})`;
    }).join(" → ");
    // 📊 내 흐름
    let myTops = 0, buried = 0;
    V.bd.forEach(sk => sk.forEach((c, j) => { if (c === me) { if (j === sk.length - 1) myTops++; else buried++; } }));
    const pos = V.order.indexOf(me) + 1, best = Math.max(...V.pc), gap = best - V.pc[me];
    const mine = `피스 ${V.pc[me]}${gap > 0 ? ` (1등과 ${gap} 차이)` : V.pc.filter(p => p === best).length > 1 ? " (공동 1등)" : " (1등)"} · ${V.round}/${V.R}라운드 · 이번 라운드 순서 ${pos}번째 · 남은 말 ${V.hand[me]}개 · 맨 위 내 말 ${myTops}개 · 밑에 깔린 내 말 ${buried}개.`;
    let rec = "", why = "";
    if (V.over) { rec = "끝났어요."; why = `최종 피스 ${V.order.slice().sort((a, b) => a - b).map(s => `${colName(s)} ${V.pc[s]}`).join(" · ")}.`; }
    else if (V.phase !== "play") { rec = "라운드 결과를 보는 중 — 다음 라운드는 순서가 바뀌어요."; why = `라운드 승자는 피스 3개 · 지금까지 ${V.hist.length}라운드 끝 (남은 ${V.R - V.round}라운드).`; }
    else if (V.cur !== me) {
      const t = thOf(V.cur);
      rec = `${colName(V.cur)} 차례를 기다려요.`;
      why = t ? `${colName(V.cur)}${iga(colName(V.cur))} ${wtxt(t.acts[0])}면 바로 3목이에요 (지금 판에서 3목 길 ${t.acts.length}개).` : `지금 판에서 ${colName(V.cur)}에게 바로 3목 길은 없어요 (3목 줄 24개 기준).`;
    } else {
      const R = K.recommend(V, me);
      if (R) {
        rec = `${actText(R.a)}${R.tag === "win" ? " — 바로 3목!" : ""}`;
        const n1 = nx[0], t1 = thOf(n1);
        if (R.tag === "win") why = `이 수로 ${R.a.t === "place" ? K.cellName(R.a.cell) : K.cellName(R.a.to)} 포함 3목 완성 — 라운드 승리, 피스 +3 (이길 확률 100%).`;
        else {
          const parts = [];
          if (R.pw != null) parts.push(`남은 수를 20번 굴려 보니 이 수로 라운드를 이길 확률 약 ${Math.round(R.pw * 100)}% · 남이 이길 확률 ${Math.round(R.pl * 100)}%`);
          if (t1 && !(R.danger || []).includes(n1)) parts.push(`다음 차례 ${colName(n1)}의 3목 길(${wtxt(t1.acts[0])})을 막아요`);
          if (R.mine) parts.push(`둔 뒤 내 3목 길 ${R.mine}개`);
          if (R.a.t === "pass") parts.push("어디에 둬도 다음 사람에게 3목 길을 내줘서 넘기는 게 나아요");
          why = parts.join(" · ") + ".";
        }
      } else { rec = "넘기기"; why = "둘 수 있는 수가 없어요 (말 0개 · 옮길 말 없음)."; }
    }
    return { opp, mine, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    if (!Vb || !myA || !bestA || Vb.phase !== "play") return { sev: 0, why: "", my, best };
    const P = K.PROF.hard, em = K.evalAct(Vb, seat, myA, P), eb = K.evalAct(Vb, seat, bestA, P);
    const nx = K.nextsOf(Vb, seat)[0];
    if (eb.tag === "win" && em.tag !== "win") return { sev: 92, why: `${best} 하면 바로 3목이었어요 — 라운드 승리 · 피스 +3 을 놓침`, my, best };
    if (em.tag === "give") return { sev: 88, why: `내 말을 옮겨 ${colName(em.who)}의 3목이 드러났어요 (${colName(em.who)} 피스 +3)`, my, best };
    if (em.tag === "multi" && eb.tag !== "multi") return { sev: 60, why: `동시 3목이 되어 아무도 피스를 못 받았어요 — 고급 AI 는 ${best}`, my, best };
    if ((em.danger || []).includes(nx) && !(eb.danger || []).includes(nx)) {
      return { sev: 78, why: `이 수 뒤 다음 차례 ${colName(nx)}에게 바로 3목 길이 생겨요 — 고급 AI 는 ${best} 로 막아요`, my, best };
    }
    // 굴려 본 이길 확률로 비교
    const R = K.recommend(Vb, seat), rows = R && R.cand || [];
    const f = a => rows.find(r => JSON.stringify(r.a) === JSON.stringify(a));
    const rm = f(myA), rb = f(bestA) || R;
    if (rb && rb.pw != null) {
      const pm = rm && rm.pw != null ? rm.pw : null;
      if (pm == null) return { sev: 30, why: `고급 AI 가 본 후보 10개 밖의 수 — 고급 AI 의 ${best} 는 이길 확률 약 ${Math.round(rb.pw * 100)}%`, my, best };
      const d = (rb.pw - 0.45 * rb.pl) - (pm - 0.45 * rm.pl);
      return { sev: Math.max(0, Math.min(55, Math.round(d * 120))), why: `굴려 보니 이길 확률 내 수 ${Math.round(pm * 100)}% · 고급 AI 수 ${Math.round(rb.pw * 100)}% (남이 이길 확률 ${Math.round(rm.pl * 100)}% · ${Math.round(rb.pl * 100)}%)`, my, best };
    }
    return { sev: 10, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
  }

  function result(V, me) {
    const nm = i => (me >= 0 && i === me ? "나" : colName(i));
    const head = V.res ? (V.res.w.length > 1 ? `🤝 공동 1등 ${V.res.w.map(nm).join(" · ")}` : `${me >= 0 && V.res.w[0] === me ? "🏆 내가 1등" : `🏆 ${nm(V.res.w[0])} 1등`}`) : "";
    const pcs = V.pc.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([p, i]) => `${DOT[i]} ${nm(i)} ${p}`).join(" · ");
    const rows = (V.hist || []).map(h => `${h.r}R ${h.order.map(s => DOT[s]).join("")} → ${h.w.length === 1 ? `${nm(h.w[0])} 3목 +3` : h.w.length > 1 ? "동시 3목 (없음)" : "승자 없음"} (${h.moves}수)`).join("<br>");
    return `${head}<br>피스 ${pcs}<br>${rows}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const mk = cells => { const bd = Array.from({ length: 16 }, () => []); for (const [c, arr] of cells) bd[c] = arr.slice(); return { bd, top: bd.map(s => (s.length ? s[s.length - 1] : -1)) }; };
    const tb = x => `<div class="f3-tut">${x}</div>`;
    const ord = (o, cur) => `<div class="f3-ord" style="width:min(100%,300px)">${o.map((s, j) => `<div class="f3-p${s === cur ? " on" : ""}"><span class="k">${j + 1}</span><span class="dt c${s}"></span><b>${COLS[s]}</b></div>`).join("")}</div>`;
    const W = mk([[0, [0]], [5, [1, 0]], [10, [2, 3, 0]], [3, [1]], [12, [3]], [6, [2]]]);
    const S0 = mk([[0, [0]], [5, [0]], [10, [1]], [11, [0]], [6, [2, 2]], [9, [3]]]);
    return [
      { tag: "STEP 1 · 목표", title: "내 색 3개를 한 줄로", body: "판을 <b>위에서 볼 때</b>(칸마다 맨 위 말) 내 색 말 3개가 가로 · 세로 · 대각선 한 줄이면 그 라운드 <b>승리 — 피스 3개</b>!",
        boardHtml: tb(boardHtml(W, { lines: [[K.LINES.findIndex(L => L.join() === "0,5,10"), "#fff"]] })), ms: 5200 },
      { tag: "STEP 2 · 준비물", title: "4×4 판 · 4색 말 5개씩", body: "16칸(A1~D4) 판에 <b>빨강 · 노랑 · 초록 · 파랑</b> 네 사람. 각자 말 <b>5개</b>로 라운드를 시작해요 (라운드마다 새로).",
        boardHtml: tb(ord([0, 1, 2, 3], 0) + boardHtml(mk([]), {})), ms: 5200 },
      { tag: "STEP 3 · 진행", title: "놓기 또는 옮기기", body: "내 차례엔 하나만: <b>새 말 놓기</b> = 한 칸에 새 말 1~3개 (한 칸은 <b>3층</b>까지, 남의 말 위도 됨) · <b>말 옮기기</b> = 맨 위에 있는 내 말 1개를 <b>이웃 8칸</b>으로.",
        boardHtml: tb(boardHtml(mk([[5, [1, 1, 0]], [6, [2]], [9, [0]], [10, [3]]]), { last: { t: "move", from: 9, to: 10 } })), ms: 6400 },
      { tag: "STEP 4 · 직접", title: "덮어서 3목", body: "나는 <b>빨강</b>. A1 · B2 가 내 말 — <b>C3</b> 의 노랑 위에 새 말을 놓으면 대각선 3목!",
        interactive: { hint: "👆 C3 → ＋1", doneText: "✅ 3목! 노랑 말은 내 말 밑에 깔려 못 움직여요" },
        render(stage, ctrl) {
          let V = { bd: S0.bd.map(x => x.slice()), top: S0.top.slice() }, sel = -1, done = false, msg = "C3 칸을 골라요";
          const draw = () => {
            const lines = done ? [[K.LINES.findIndex(L => L.join() === "0,5,10"), "#fff"]] : [];
            const act = !done && sel >= 0 ? `<div class="f3-row" style="width:min(100%,280px)">${[1, 2, 3].map(k => `<button type="button" class="pl" data-k="${k}"${sel === 10 && k === 1 ? ' data-tp="1"' : ""}${V.bd[sel].length + k > 3 ? " disabled" : ""}>＋${k}</button>`).join("")}</div>` : "";
            stage.innerHTML = `<div class="f3-tut">${boardHtml(V, { pick: !done, sel, lines, tp: !done && sel !== 10 ? 10 : -1 })}${act}<div class="f3-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("button"); if (!t || t.disabled) return;
            if (t.dataset.k) {
              const k = +t.dataset.k;
              for (let j = 0; j < k; j++) V.bd[sel].push(0);
              V.top = V.bd.map(s => (s.length ? s[s.length - 1] : -1));
              const w = K.winnersOf(V.top);
              if (w.length === 1 && w[0] === 0) { done = true; ctrl.sfx("win"); msg = `🎉 <b>A1 · B2 · C3</b> 대각선 3목! (C3 ${V.bd[10].length}층)`; draw(); ctrl.complete(); return; }
              msg = `${CN(sel)}에 놓았지만 3목이 아니에요 — 다시!`; V = { bd: S0.bd.map(x => x.slice()), top: S0.top.slice() }; sel = -1; ctrl.sfx("tap"); draw(); return;
            }
            if (t.dataset.c != null) { sel = +t.dataset.c; msg = sel === 10 ? "새 말 1개면 충분해요 — <b>＋1</b>" : `${CN(sel)}… 3목이 되는 칸은 C3 예요`; ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "라운드 승자 피스 3개", body: "3목을 만든 사람이 <b>피스 3개</b>. 한 수로 두 사람 이상이 <b>동시에 3목</b>이면 아무도 못 받아요 (말을 옮기다 밑의 남의 말이 드러날 때). <b>4라운드</b> 뒤 피스가 가장 많은 사람이 이겨요.",
        boardHtml: tb(boardHtml(W, { lines: [[K.LINES.findIndex(L => L.join() === "0,5,10"), "#fff"]] })), ms: 6000 },
      { tag: "STEP 6 · 특수 규칙", title: "라운드마다 순서가 바뀜", body: "1R 빨노초파 → 2R <b>초파빨노</b> → 3R <b>파빨노초</b> → 4R <b>노초파빨</b>. 어떤 수로도 4층은 안 되고, 할 수 있는 게 없으면 패스 (방송은 90초를 넘겨도 패스). 🧑‍🏫 선생님은 이번 라운드 남은 수를 여러 번 굴려 본 <b>이길 확률</b>로 수를 골라 줘요.",
        boardHtml: tb([[0, 1, 2, 3], [2, 3, 0, 1], [3, 0, 1, 2], [1, 2, 3, 0]].map(o => ord(o, -1)).join("")), ms: 6400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.four3 = {
    name: "4인 3목", emoji: "🟥", short: "4×4 판에 말을 쌓고 옮겨 — 위에서 본 내 색 3개 한 줄, 4라운드 피스 대결", min: 2, max: 4, defN: 4, board: false, fitCoach: true,
    opts: [
      { k: "timer", label: "차례 시계", items: [[0, "끔"], [90, "90초 (방송)"]], def: 0 },
      { k: "rounds", label: "라운드", items: [[4, "4라운드 (방송)"], [2, "2라운드"]], def: 4 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 판을 위에서 볼 때 <b>내 색 맨 위 말 3개</b>가 가로 · 세로 · 대각선 한 줄 → 라운드 승리, <b>피스 3개</b>",
      "준비물: <b>4×4</b> 판 16칸(A1~D4) · 빨강 · 노랑 · 초록 · 파랑 말 <b>5개씩</b> (라운드마다 새로)",
      "진행: 차례마다 하나 — <b>새 말 놓기</b>(한 칸에 1~3개, 남의 말 위도 됨, 한 칸 <b>3층</b>까지) 또는 <b>말 옮기기</b>(맨 위 내 말 1개를 이웃 8칸으로)",
      "승패: 3목 만든 사람 피스 +3 · <b>동시 3목</b>이면 아무도 못 받음 · <b>4라운드</b> 뒤 피스 많은 사람 승",
      "특수: 라운드마다 순서가 바뀜 (1R 빨노초파 · 2R 초파빨노 · 3R 파빨노초 · 4R 노초파빨) · 4층 불가 · 할 게 없으면 패스 · 2~3명이면 순서를 한 칸씩 돌림 · 한 라운드 <b>80수</b>가 넘으면 그 라운드는 승자 없음 (끝없는 판 방지 상한)",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드${V.cur >= 0 ? ` · ${colName(V.cur)} 차례` : ""}`),
    chip: (V, i) => ({ t: `${DOT[i]} 🧩${V.pc[i]}`, on: !V.over && V.cur === i, out: false }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me, rnd) => K.ai(V, me, "normal", rnd),
  };
})();

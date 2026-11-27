/* 베니 서바이벌 · 컬러 링크 — 화면 (색 말 놓기 → 불가능 선언 → 길 이어 증명 · 선생님 · 1분 규칙 · 복기)
   시계는 UI 만 가져요: 시간 제한(옵션)이 켜져 있으면 내 차례(놓기 3분 · 증명 5분)에 재다가 끝나면 {t:"timeout"} 을 보내요. */
(() => {
  "use strict";
  const K = window.SVCores.colorlink;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const { COLORS, MINLEN } = K;
  const SRC = "방송: 데블스 플랜: 데드 어게인 · 7일차 결승 2회전 컬러 링크 (장동민 vs 현경렬) — 나무위키 '데블스 플랜: 데드 어게인/7일차' 룰 + 영상 대조 (마지막 라운드 풀이 해설 영상 자막: 6칸 · 불가능 선언 뒤 5분 증명 · 3대 2)";
  const DIFF = "판 크기 · 벽 · 미리 놓인 말은 방송 화면을 구하지 못해 우리가 만든 판 (7×7 에서 9×9, 라운드마다 처음 판은 반드시 풀 수 있게 만들어요) · 쓰는 색은 라운드마다 6~8색 (방송 14색 28개 중) · 색 14개 이름표는 A~L + 검정 X · 흰색 Y로 우리가 정함 · 놓을 말을 다 놓아 더 못 놓으면 불가능 선언만 할 수 있고 · 아무도 안 놓은 처음엔 선언 불가 · 길은 칸을 눌러 이어요 (끌어서도 됨) · 시간 제한 3분 · 5분은 옵션 (기본 끔, 켜면 시간 초과가 바로 그 라운드 패) · 5라운드 안에 3점이 안 나올 수 없어서 (한 라운드마다 1점) 동점 연장 없음";
  const CSS = `
.cl-st{flex:none;min-height:40px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.cl-st b{color:#fde68a}
.cl-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.cl-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.cl-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.cl-res.mid{color:#e2e8f0;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.45)}
.cl-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.cl-bar{flex:none;display:flex;justify-content:center;gap:10px;align-items:center;font:700 11.5px/1.25 var(--round);color:var(--soft);flex-wrap:wrap}
.cl-bar .rd{padding:1px 8px;border-radius:999px;background:rgba(148,163,184,.18);color:#e2e8f0}
.cl-bar .sc b{color:#fde68a}
.cl-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
.cl-board{--c:36px;display:grid;grid-template-columns:repeat(var(--nx),var(--c));grid-template-rows:repeat(var(--ny),var(--c));padding:3px;border-radius:10px;background:#0b1220;box-shadow:inset 0 0 0 1px rgba(148,163,184,.35);user-select:none;-webkit-user-select:none;touch-action:manipulation}
.cl-board.drawing{touch-action:none}
.cl-cl{position:relative;display:grid;place-items:center;border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.025)}
.cl-cl.wl{background:repeating-linear-gradient(45deg,#334155,#334155 3px,#1e293b 3px,#1e293b 7px);border-color:#0f172a}
.cl-cl.pk{cursor:pointer}
.cl-cl.lp{box-shadow:inset 0 0 0 2px rgba(253,230,138,.85)}
.cl-cl.pt{background:color-mix(in srgb,var(--tc) 38%,#0b1220)}
.cl-cl.pt::after{content:"";width:54%;height:54%;border-radius:50%;background:var(--tc);box-shadow:0 0 0 1px rgba(255,255,255,.25)}
.cl-cl.pt .cl-pc{position:absolute}
.cl-cl.hd{box-shadow:inset 0 0 0 2px #fff}
.cl-cl.gh{background:color-mix(in srgb,var(--tc) 32%,transparent);border-style:dashed}
.cl-cl.bad{box-shadow:inset 0 0 0 2px #f87171}
.cl-pc{width:80%;height:80%;border-radius:50%;display:grid;place-items:center;font:900 calc(var(--c)*.42)/1 var(--round);background:var(--pc);color:var(--tx);box-shadow:inset 0 -3px 0 rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.25);pointer-events:none;position:relative}
.cl-pc.pre::after{content:"";position:absolute;right:-1px;top:-1px;width:30%;height:30%;border-radius:50%;background:#e2e8f0;border:1px solid #0f172a}
.cl-pc.pend{outline:2px dashed #fff;outline-offset:1px}
.cl-pc.mate{background:transparent;color:var(--pc);border:3px solid var(--pc);box-shadow:none}
.cl-dot{width:26%;height:26%;border-radius:50%;background:rgba(255,255,255,.75);pointer-events:none}
.cl-act{flex:none;display:grid;gap:6px}
.cl-tray{display:flex;gap:5px;justify-content:center;flex-wrap:wrap}
.cl-chip{position:relative;width:44px;height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);display:grid;place-items:center;cursor:pointer;padding:0;color:inherit}
.cl-chip i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:900 13px/1 var(--round);background:var(--pc);color:var(--tx);box-shadow:inset 0 -2px 0 rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.25);pointer-events:none}
.cl-chip small{position:absolute;right:2px;bottom:0;font:800 9.5px/1.2 var(--round);color:#e2e8f0;background:rgba(15,23,42,.85);border-radius:6px;padding:0 3px;pointer-events:none}
.cl-chip.on{border-color:#fff;background:rgba(255,255,255,.18);box-shadow:0 0 0 2px rgba(255,255,255,.35)}
.cl-chip.pd{border-style:dashed}
.cl-chip.off{opacity:.3;cursor:default}
.cl-chip.okc small{background:#15803d}
.cl-chip.shc small{background:#b45309}
.cl-row{display:flex;gap:6px}
.cl-row button{flex:1;min-width:0;height:46px;border-radius:13px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 14.5px var(--round);cursor:pointer;padding:0 6px;line-height:1.15}
.cl-row button.sub{background:rgba(255,255,255,.1);color:#e2e8f0;border:1px solid rgba(255,255,255,.2)}
.cl-row button.dg{background:linear-gradient(#fb7185,#e11d48);color:#fff1f2}
.cl-row button.dg.ask{background:linear-gradient(#fbbf24,#d97706);color:#451a03}
.cl-row button small{display:block;font:700 10.5px var(--round);opacity:.85}
.cl-row button:disabled{opacity:.33;cursor:default}
.cl-tbar{height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.cl-tbar i{display:block;height:100%;background:#facc15;transform-origin:left;transition:transform .1s linear}
.cl-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.cl-tut .cl-board{--c:34px}
.cl-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.cl-tmsg b{color:#fde68a}
@media (max-height:650px){.cl-row button{height:44px}.cl-st{min-height:34px;font-size:12px}}
.sv-coachfit .cl-st{min-height:30px;font-size:11.5px}
.sv-coachfit .cl-bar{display:none}
.sv-coachfit .cl-chip{width:44px;height:44px}`;
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는"), eul = w => (hasFinal(w) ? "을" : "를"), wa = w => (hasFinal(w) ? "과" : "와");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  const pct = x => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  const FIX = () => 0.5;                                    // 💡 = 고급 AI (고급은 rnd 를 안 씀)
  const lum = h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b; };
  const tx = k => (lum(COLORS[k].h) > 150 ? "#111827" : "#fff");
  const cvar = k => `--pc:${COLORS[k].h};--tc:${COLORS[k].h};--tx:${tx(k)}`;
  const CN = (V, c) => K.cname2(V.W, c);
  const kn = k => K.cname(k);
  const putText = (V, put) => put.map(p => `${kn(p.k)} ${CN(V, p.c)}`).join(" · ");
  const WHY = { proved: "불가능 선언에 맞서 길을 이어 증명했어요", giveup: "불가능 선언 — 증명하지 못했어요", time: "시간 안에 하지 못했어요" };

  // ── 행동 글 ──
  function actText(a, V) {
    if (!a || typeof a !== "object") return "";
    if (a.t === "first") return a.mine ? "먼저 하기" : "나중에 하기";
    if (a.t === "declare") return "불가능 선언";
    if (a.t === "timeout") return "시간 초과";
    if (a.t === "giveup") return "증명 포기";
    if (a.t === "place") return V && V.W ? `놓기 ${putText(V, a.put || [])}` : `놓기 ${(a.put || []).map(p => kn(p.k)).join(" · ")}`;
    if (a.t === "prove") return `증명: 길 ${Object.keys(a.paths || {}).length}개 이음`;
    return "";
  }

  // ── 판 그리기 ──
  // o: { pend: {칸: 색}, paths: {색: [칸]}, ghost: {색: [칸]}, act, last: Set, pick: bool, mate: Set, bad: Set }
  function cellInner(V, c, o) {
    const k = V.grid[c];
    if (V.wall[c]) return "";
    if (k >= 0) return `<i class="cl-pc${V.pre.includes(c) ? " pre" : ""}" style="${cvar(k)}">${COLORS[k].l}</i>`;
    if (o.pend && o.pend[c] != null) return `<i class="cl-pc pend" style="${cvar(o.pend[c])}">${COLORS[o.pend[c]].l}</i>`;
    if (o.mate && o.mate[c] != null) return `<i class="cl-pc mate" style="${cvar(o.mate[c])}">${COLORS[o.mate[c]].l.toLowerCase()}</i>`;
    return "";
  }
  function cellClass(V, c, o) {
    let cl = "cl-cl";
    if (V.wall[c]) return cl + " wl";
    if (o.last && o.last.has(c)) cl += " lp";
    if (o.pk) cl += " pk";
    if (o.owner && o.owner[c] != null && V.grid[c] < 0 && !(o.mate && o.mate[c] != null)) cl += " pt";
    else if (o.ghostOwner && o.ghostOwner[c] != null && V.grid[c] < 0) cl += " gh";
    if (o.head === c) cl += " hd";
    if (o.bad && o.bad.has(c)) cl += " bad";
    return cl;
  }
  function cellStyle(V, c, o) {
    const k = o.owner && o.owner[c] != null ? o.owner[c] : o.ghostOwner && o.ghostOwner[c] != null ? o.ghostOwner[c] : null;
    return k != null && !V.wall[c] ? `${cvar(k)}` : "";
  }
  function ownerMap(paths) { const m = {}; for (const k of Object.keys(paths || {})) for (const c of paths[k]) m[c] = +k; return m; }
  function mateMap(V, paths) {            // 한 개만 놓인 색의 길 끝 = 짝을 놓을 자리
    const m = {};
    for (const k of Object.keys(paths || {})) { const p = paths[k]; if (p.length && V.grid[p[p.length - 1]] < 0 && p.length >= 2) m[p[p.length - 1]] = +k; }
    return m;
  }
  function boardHtml(V, o) {
    o = o || {};
    const n = V.W * V.H;
    o.owner = o.owner || ownerMap(o.paths); o.ghostOwner = o.ghostOwner || ownerMap(o.ghost);
    if (!o.mate) o.mate = mateMap(V, o.paths);
    let h = "";
    for (let c = 0; c < n; c++) {
      const st = cellStyle(V, c, o);
      h += `<div class="${cellClass(V, c, o)}" data-c="${c}"${st ? ` style="${st}"` : ""} aria-label="${CN(V, c)}${V.wall[c] ? " 벽" : V.grid[c] >= 0 ? " " + kn(V.grid[c]) : ""}">${cellInner(V, c, o)}</div>`;
    }
    return `<div class="cl-board${o.drawing ? " drawing" : ""}" data-nx="${V.W}" data-ny="${V.H}" style="--nx:${V.W};--ny:${V.H}" aria-label="컬러 링크 판">${h}</div>`;
  }

  // ── 이 화면의 선택 · 시계 ──
  const S = { pk: "", stage: null, ctx: null, V: null, sel: -1, pend: [], dq: false, paths: {}, act: -1, drag: false, lastC: -1, hint: false, sent: 0, tm: 0, iv: 0, dl: 0, dur: 0, armed: "", pm: "" };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; S.dl = 0; };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected || !S.dl) { clearInterval(S.iv); S.iv = 0; return; }
    const left = Math.max(0, S.dl - Date.now()), bar = st.querySelector(".cl-tbar i"), cd = st.querySelector("[data-cd]");
    if (bar) bar.style.transform = `scaleX(${Math.min(1, left / (S.dur || 1))})`;
    if (cd) { const sec = Math.ceil(left / 1000); cd.textContent = sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}` : String(sec); }
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = Date.now() + ms; S.dur = ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 200);
  }
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return false;
    if (S.sent && Date.now() - S.sent < 700) return false;        // 두 번 탭 막기
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); return false; }
    S.sel = -1; S.pend = []; S.dq = false; c.sfx("pop");
    return true;
  }
  function fitBoard(stage) {
    const w = stage.querySelector(".cl-wrap"), b = w && w.firstElementChild; if (!b) return;
    const nx = +b.dataset.nx || 8, ny = +b.dataset.ny || 8;
    const c = Math.floor(Math.min((w.clientWidth - 12) / nx, ((w.clientHeight || 9999) - 10) / ny, 46));
    if (c >= 16) b.style.setProperty("--c", c + "px");
  }
  const lenOk = (V, k, p) => { if (!p || !p.length) return false; const ps = []; for (let c = 0; c < V.grid.length; c++) if (V.grid[c] === k) ps.push(c); return p.length >= MINLEN && (ps.length === 2 ? V.grid[p[p.length - 1]] === k && p[0] !== p[p.length - 1] : true); };
  const pieceCells = (V, k) => { const o = []; for (let c = 0; c < V.grid.length; c++) if (V.grid[c] === k) o.push(c); return o; };
  const inPlay = V => V.cols.filter(k => V.grid.includes(k));

  // ── 증명 (길 잇기) ──
  function proofStep(V, c, ctx) {
    const nb = K.nbOf(V.W, V.H), P = S.paths, own = ownerMap(P), g = V.grid[c];
    const A = S.act, p = A >= 0 ? P[A] : null, head = p && p.length ? p[p.length - 1] : -1;
    const complete = k => { const q = P[k]; return !!q && q.length > 1 && V.grid[q[q.length - 1]] === k && q[0] !== q[q.length - 1]; };
    const toast = m => { if (m && ctx && ctx.toast) ctx.toast(m); return false; };
    if (A >= 0 && head >= 0 && !complete(A) && nb[head].includes(c) && own[c] == null) {
      if (V.wall[c]) return toast("벽은 지날 수 없어요");
      if (g >= 0 && !(g === A && c !== p[0])) return toast("다른 색 말은 밟을 수 없어요");
      p.push(c); return true;
    }
    if (g >= 0) {                                         // 말을 누르면 그 색 길을 시작 · 고르기
      if (!P[g] || !P[g].length) P[g] = [c];
      else if (P[g].length === 1 && P[g][0] !== c && g !== S.act) P[g] = [c];
      S.act = g; return true;
    }
    if (own[c] != null) { const k = own[c], i = P[k].indexOf(c); P[k] = P[k].slice(0, i + 1); S.act = k; return true; }
    if (V.wall[c]) return toast("벽이에요");
    return toast(A >= 0 ? "이어 가는 끝 칸 옆(위 · 아래 · 좌 · 우)을 눌러요" : "먼저 이을 색의 말을 눌러요");
  }
  function paintProof(stage, V, ctx) {
    const o = { paths: S.paths, head: S.act >= 0 && S.paths[S.act] && S.paths[S.act].length ? S.paths[S.act][S.paths[S.act].length - 1] : -1, drawing: true };
    o.owner = ownerMap(S.paths); o.mate = mateMap(V, S.paths); o.ghostOwner = S.hint ? ownerMap(S.hintPaths || {}) : {};
    if (!S.hint) o.ghostOwner = {};
    for (const el of stage.querySelectorAll(".cl-cl")) {
      const c = +el.dataset.c, cls = cellClass(V, c, o), st = cellStyle(V, c, o), inner = cellInner(V, c, o);
      if (el.className !== cls) el.className = cls;
      if ((el.getAttribute("style") || "") !== st) { if (st) el.setAttribute("style", st); else el.removeAttribute("style"); }
      if (el.innerHTML !== inner) el.innerHTML = inner;
    }
    const tray = stage.querySelector(".cl-tray");
    if (tray) tray.innerHTML = proofChips(V);
    const ps = stage.querySelector(".cl-ps"); if (ps) ps.innerHTML = proofStatus(V);
    const sub = stage.querySelector("[data-a='prove']");
    if (sub) { const n = inPlay(V).filter(k => lenOk(V, k, S.paths[k])).length, all = inPlay(V).length; sub.disabled = n !== all; sub.innerHTML = `제출<small>${n}/${all}색 이음</small>`; }
  }
  function proofChips(V) {
    return inPlay(V).map(k => {
      const p = S.paths[k], ok = lenOk(V, k, p), n = p ? p.length : 0, single = pieceCells(V, k).length === 1;
      return `<button type="button" class="cl-chip${S.act === k ? " on" : ""}${ok ? " okc" : n ? " shc" : ""}" data-chip="${k}" style="${cvar(k)}" aria-label="${kn(k)} ${ok ? "이음" : n + "칸"}"><i>${COLORS[k].l}</i><small>${ok ? "✓" : `${n}/${MINLEN}`}${single && !ok ? "" : ""}</small></button>`;
    }).join("");
  }
  function proofStatus(V) {
    const n = inPlay(V).filter(k => lenOk(V, k, S.paths[k])).length, all = inPlay(V).length;
    const single = inPlay(V).filter(k => pieceCells(V, k).length === 1);
    return `🧩 <b>증명</b> ${n}/${all}색 — 말을 누르고 이어 갈 칸을 눌러요 (끌어도 돼요) · ${MINLEN}칸 이상${single.length ? `<br>${single.map(k => COLORS[k].l).join("·")}는 짝이 없어 ${MINLEN}칸째에서 멈추면 거기에 짝을 놓아요` : ""}`;
  }

  // ── 그리기 ──
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || !(me === 0 || me === 1);
    const op = watch ? 1 : 1 - me;
    const can = !!ctx.canAct && !watch && !V.over && (V.needs || []).includes(me);
    const lastI = V.log && V.log.length ? V.log[V.log.length - 1].i : 0;
    const pk = `${ctx.g}|${me}|${V.round}|${V.phase}|${lastI}`;
    if (pk !== S.pk) { S.pk = pk; S.sel = -1; S.pend = []; S.dq = false; S.paths = {}; S.act = -1; S.hint = false; S.hintPaths = null; S.sent = 0; clearTimers(); }
    const nm = i => (!watch && i === me ? "나" : nameOf(ctx, i));
    const subj = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    let st = "", actH = "", bo = { last: new Set() };
    const lastPlace = (V.log || []).slice().reverse().find(e => e.k === "place");
    if (lastPlace && V.phase !== "show" && !V.over) for (const p of lastPlace.put) bo.last.add(p.c);
    const lim = V.opt && V.opt.limit ? 1 : 0;
    let wrapNote = "";

    if (V.phase === "choose") {
      if (can) {
        st = `<span><b>${V.round}라운드</b> — 지난 라운드에서 졌어요. 먼저 놓을까요, 나중에 놓을까요?<br>선공은 처음에 말 1개만 놓아요</span>`;
        actH = `<div class="cl-row"><button type="button" data-a="first1">먼저 할래요<small>선공 (처음 1개)</small></button><button type="button" class="sub" data-a="first0">나중에 할래요<small>후공</small></button></div>`;
      } else st = `<span><b>${V.round}라운드</b> — ${subj(V.chooser)} 먼저 할지 나중에 할지 고르는 중…</span>`;
    } else if (V.phase === "place") {
      const myTurn = can && V.cur === me, tm = lim && myTurn ? ` · ⏱ <b data-cd>${K.LIM_PLACE / 60}분 0</b>초` : "";
      const lp = lastPlace && lastPlace.s !== me ? `<br>${esc(nm(lastPlace.s))}${eun(nm(lastPlace.s))} 방금 ${putText(V, lastPlace.put)}에 놓았어요` : "";
      if (myTurn) {
        const ks = V.cols.filter(k => V.stock[k] > 0), need = V.need, pd = {};
        for (const p of S.pend) pd[p.c] = p.k;
        bo.pend = pd; bo.pk = true;
        if (!need) {
          st = `<span><b>내 차례</b> — 놓을 말이 없어요. <b>불가능 선언</b>만 할 수 있어요${tm}</span>`;
        } else {
          const first = V.nPlace === 0;
          st = `<span><b>내 차례</b> — ${first ? "선공이라 말 <b>1개</b>" : `서로 다른 색 <b>${need}개</b>`}를 놓아요 (${S.pend.length}/${need})${S.sel >= 0 ? ` · <b>${kn(S.sel)}</b>${eul(kn(S.sel))} 놓을 빈 칸을 눌러요` : " · 색을 먼저 눌러요"}${lp}${tm}</span>`;
        }
        const chips = ks.map(k => { const pd2 = S.pend.some(p => p.k === k); return `<button type="button" class="cl-chip${S.sel === k ? " on" : ""}${pd2 ? " pd" : ""}" data-chip="${k}" style="${cvar(k)}" aria-label="${kn(k)} 남은 ${V.stock[k]}개"><i>${COLORS[k].l}</i><small>${V.stock[k]}</small></button>`; }).join("");
        const ask = S.dq;
        actH = `${lim ? `<div class="cl-tbar"><i></i></div>` : ""}${need ? `<div class="cl-tray">${chips}</div>` : ""}<div class="cl-row">${need ? `<button type="button" data-a="put"${S.pend.length === need ? "" : " disabled"}>놓기<small>${S.pend.length}/${need}</small></button><button type="button" class="sub" data-a="undo"${S.pend.length ? "" : " disabled"}>되돌리기</button>` : ""}<button type="button" class="dg${ask ? " ask" : ""}" data-a="decl"${V.canDeclare ? "" : " disabled"}>${ask ? "정말 불가능? 한 번 더" : "불가능!"}<small>${ask ? "누르면 선언해요" : V.canDeclare ? "이을 수 없다고 봐요" : "아직 선언 못 해요"}</small></button></div>`;
      } else {
        st = `<span>${lp ? lp.replace(/^<br>/, "") + "<br>" : ""}${esc(nm(V.cur))} 차례 — 생각하는 중…</span>`;
      }
    } else if (V.phase === "prove") {
      const mineP = can && V.prover === me, tm = lim && mineP ? ` · ⏱ <b data-cd>${K.LIM_PROVE / 60}분 0</b>초` : "";
      if (mineP) {
        bo.paths = S.paths; bo.drawing = true; if (S.hint && S.hintPaths) bo.ghost = S.hintPaths;
        bo.head = S.act >= 0 && S.paths[S.act] && S.paths[S.act].length ? S.paths[S.act][S.paths[S.act].length - 1] : -1;
        bo.pk = true;
        st = `<span>${subj(V.decl)} <b>불가능</b>이라고 선언했어요!<br><span class="cl-ps">${proofStatus(V)}</span>${tm}</span>`;
        const nOk = inPlay(V).filter(k => lenOk(V, k, S.paths[k])).length, all = inPlay(V).length;
        actH = `${lim ? `<div class="cl-tbar"><i></i></div>` : ""}<div class="cl-tray">${proofChips(V)}</div><div class="cl-row"><button type="button" data-a="prove"${nOk === all ? "" : " disabled"}>제출<small>${nOk}/${all}색 이음</small></button><button type="button" class="sub" data-a="clr1"${S.act >= 0 && S.paths[S.act] && S.paths[S.act].length ? "" : " disabled"}>색 지움</button><button type="button" class="sub" data-a="clr">전부 지움</button><button type="button" class="sub" data-a="giveup">포기</button></div>`;
      } else {
        st = `<span>${subj(V.decl)} <b>불가능</b>이라고 선언했어요!<br>${esc(nm(V.prover))}${eun(nm(V.prover))} 모든 색을 이어 증명하는 중…</span>`;
      }
    } else if (V.phase === "show" || V.over) {
      const R = V.rres || {}, w = R.w;
      const pr = V.proof && V.proof.ok ? V.proof.paths : null;
      if (pr) { bo.paths = pr; }
      const you = !watch && w === me, head = watch ? `🏆 ${esc(nm(w))} ${R.scores ? `${R.scores[w]}점` : ""}` : you ? "✅ 이번 라운드는 내 점수!" : "💥 이번 라운드는 상대 점수";
      const why = R.why === "proved" ? `${subj(V.prover)} 모든 색을 겹치지 않게 이어 증명했어요` : R.why === "giveup" ? `${subj(V.prover)} 증명하지 못했어요 — 불가능 선언이 맞았어요` : `시간 안에 하지 못했어요`;
      const sc = `${esc(nm(0))} ${V.scores[0]} : ${V.scores[1]} ${esc(nm(1))}`;
      if (V.over) {
        const W2 = V.res.w, cls = watch ? "ok" : W2 === me ? "ok" : "no";
        st = `<div class="cl-res ${cls}">${watch ? `🏆 ${esc(nm(W2))} 승리` : W2 === me ? "🏆 내가 이겼어요!" : `💥 ${esc(nameOf(ctx, W2))} 승리 — 졌어요`} (${sc})<small>${why} · ${V.round}라운드</small></div>`;
      } else st = `<div class="cl-res ${you ? "ok" : "no"}">${head} — ${sc}<small>${why} · 곧 다음 라운드</small></div>`;
    }
    const sbar = "";
    void op; void wrapNote;
    stage.innerHTML = `<div class="cl-st">${st}</div>${sbar}<div class="cl-wrap">${boardHtml(V, bo)}</div>${actH ? `<div class="cl-act">${actH}</div>` : ""}`;
    fitBoard(stage);
    if (window.ResizeObserver) {
      if (S.ro) S.ro.disconnect();
      const w = stage.querySelector(".cl-wrap"); let last = w ? w.clientHeight : 0;
      if (w) { S.ro = new ResizeObserver(() => { if (Math.abs(w.clientHeight - last) > 1) { last = w.clientHeight; fitBoard(stage); } }); S.ro.observe(w); }
    }
    // 시계: 놓기 3분 · 증명 5분 (옵션) — 끝나면 {t:"timeout"}
    const mineNow = can && (V.phase === "place" ? V.cur === me : V.phase === "prove" && V.prover === me);
    if (lim && mineNow && S.armed !== pk) {
      S.armed = pk;
      arm(ctx.fast ? 4000 : (V.phase === "place" ? K.LIM_PLACE : K.LIM_PROVE) * 1000, () => { const c = S.ctx; if (c && c.canAct) send({ t: "timeout" }); }); tick();
    } else if (S.dl) tick();
    stage.onclick = onClick;
    stage.onpointerdown = onDown; stage.onpointermove = onMove; stage.onpointerup = onUp; stage.onpointercancel = onUp;
  }
  const cellOf = e => { const el = e.target && e.target.closest ? e.target.closest("[data-c]") : null; return el ? +el.dataset.c : -1; };
  function onDown(e) {
    const V = S.V, c = S.ctx; if (!V || !c || !c.canAct || V.phase !== "prove" || V.prover !== c.me) return;
    const t = cellOf(e); if (t < 0) return;
    S.drag = true; S.lastC = t;
    if (proofStep(V, t, c)) c.sfx("tap");
    paintProof(S.stage, V, c);
    e.preventDefault && e.preventDefault();
  }
  function onMove(e) {
    const V = S.V, c = S.ctx; if (!S.drag || !V || !c) return;
    const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest ? el.closest("[data-c]") : null;
    if (!cell) return;
    const t = +cell.dataset.c; if (t === S.lastC) return;
    S.lastC = t;
    const A = S.act, p = A >= 0 ? S.paths[A] : null, head = p && p.length ? p[p.length - 1] : -1;
    if (head < 0 || !K.nbOf(V.W, V.H)[head].includes(t)) return;            // 끌 때는 이어 가는 칸 (한 칸씩)만
    if (proofStep(V, t, null)) paintProof(S.stage, V, c);
  }
  function onUp() { S.drag = false; S.lastC = -1; }
  function onClick(e) {
    const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.over) return;
    const t = e.target.closest("[data-c],button,[data-chip]"); if (!t || t.disabled) return;
    const me = c.me, rr = () => render(S.stage, VV, c);
    if (VV.phase === "choose") {
      if (t.dataset.a === "first1") send({ t: "first", mine: true }); else if (t.dataset.a === "first0") send({ t: "first", mine: false });
      return;
    }
    if (VV.phase === "place" && VV.cur === me) {
      if (t.dataset.chip != null) { const k = +t.dataset.chip; S.sel = S.sel === k ? -1 : k; S.dq = false; c.sfx("tap"); rr(); return; }
      if (t.dataset.a === "undo") { S.pend = []; S.sel = -1; S.dq = false; rr(); return; }
      if (t.dataset.a === "put") { send({ t: "place", put: S.pend.map(p => ({ c: p.c, k: p.k })) }); return; }
      if (t.dataset.a === "decl") { if (!S.dq) { S.dq = true; c.sfx("tap"); rr(); return; } send({ t: "declare" }); return; }
      if (t.dataset.c != null) {
        const cc = +t.dataset.c; S.dq = false;
        const i = S.pend.findIndex(p => p.c === cc);
        if (i >= 0) { S.pend.splice(i, 1); c.sfx("tap"); rr(); return; }
        if (VV.wall[cc] || VV.grid[cc] >= 0) { c.toast && c.toast(VV.wall[cc] ? "벽이에요" : "이미 말이 있는 칸이에요"); return; }
        if (S.sel < 0) { c.toast && c.toast("먼저 아래에서 놓을 색을 눌러요"); return; }
        const j = S.pend.findIndex(p => p.k === S.sel);
        if (j >= 0) S.pend[j] = { c: cc, k: S.sel };
        else if (S.pend.length >= VV.need) { c.toast && c.toast(`이번엔 ${VV.need}개만 놓아요 — 놓은 말을 눌러 빼거나 되돌려요`); return; }
        else S.pend.push({ c: cc, k: S.sel });
        S.sel = -1; c.sfx("tap"); rr(); return;
      }
      return;
    }
    if (VV.phase === "prove" && VV.prover === me) {
      if (t.dataset.chip != null) {
        const k = +t.dataset.chip; S.act = k;
        if (!S.paths[k] || !S.paths[k].length) S.paths[k] = [pieceCells(VV, k)[0]];
        c.sfx("tap"); paintProof(S.stage, VV, c); return;
      }
      if (t.dataset.a === "clr1") { if (S.act >= 0) S.paths[S.act] = []; paintProof(S.stage, VV, c); return; }
      if (t.dataset.a === "clr") { S.paths = {}; S.act = -1; paintProof(S.stage, VV, c); return; }
      if (t.dataset.a === "giveup") { send({ t: "giveup" }); return; }
      if (t.dataset.a === "prove") { const paths = {}; for (const k of inPlay(VV)) paths[k] = (S.paths[k] || []).slice(); send({ t: "prove", paths }); return; }
      // 칸 누름은 pointerdown 에서 이미 처리 (여기서 또 하면 두 번 눌림)
    }
  }

  // ── 선생님 (판은 모두에게 보임 — 숨은 정보 없음) ──
  let HINT = { key: "", open: false };
  function descOpp(V, me, nmx) {
    const op = 1 - me, lp = (V.log || []).slice().reverse().find(e => e.k === "place");
    if (lp && lp.s === op) return `${nmx(op)} 방금 ${putText(V, lp.put)}에 놓았어요`;
    if (lp) return `내가 놓은 뒤 ${nmx(op)} 차례예요`;
    return V.pre.length ? `처음부터 놓인 말 ${V.pre.length}개 · 벽 ${V.wall.filter(x => x).length}칸 — 아직 아무도 안 놓았어요` : "아직 아무도 안 놓았어요";
  }
  function coach(V, me, since, names) {
    void since;
    if (!(me === 0 || me === 1)) me = V.needs && V.needs.length ? V.needs[0] : 0;
    const op = 1 - me, raw = i => (i === me ? "나" : String((Array.isArray(names) && names[i]) || "상대")), nmx = i => `${esc(raw(i))}${i === me ? "" : iga(raw(i))}`.replace(/^(.*)(이|가)$/, (m, a, b) => `${a}${b}`);
    const B = K.boardInfo(V), left = V.cols.reduce((a, k) => a + V.stock[k], 0);
    const opp = descOpp(V, me, i => (i === me ? "내가" : `${esc(raw(i))}${iga(raw(i))}`));
    const mine = `빈 칸 ${B.free}칸 · 지금 놓인 ${B.colors}색을 이으려면 최소 ${B.need}칸 필요 → 여유 ${B.free - B.need}칸 · 놓을 말 ${left}개 남음 · ${V.round}라운드 ${V.scores[me]}:${V.scores[op]}`;
    let rec = "", why = "";
    if (V.over) return { opp, mine, rec: "끝났어요.", why: V.res && V.res.w === me ? "내가 3점을 먼저 땄어요." : "상대가 3점을 먼저 땄어요." };
    if (V.phase === "show") return { opp, mine, rec: "다음 라운드를 기다려요.", why: "" };
    if (!(V.needs || []).includes(me)) {
      rec = V.phase === "prove" ? `${esc(raw(V.prover))}${V.prover === me ? "" : eun(raw(V.prover))} 증명하는 중이에요.` : `${esc(raw(op))} 차례를 기다려요.`;
      why = `지금 판은 ${K.solveV(V, V.grid, 6000).res === 1 ? "풀 수 있어요 (모든 색을 겹치지 않게 이을 방법이 있어요)" : K.solveV(V, V.grid, 6000).res === 0 ? "풀 수 없어 보여요 — " + K.unsatWhy(V) : "풀 수 있는지 한눈에 안 보여요"}.`;
      return { opp, mine, rec, why };
    }
    const a = K.ai(V, me, "hard", FIX);
    if (V.phase === "choose") {
      rec = a && a.mine ? "먼저 하기 (선공)" : "나중에 하기 (후공)";
      why = `놓을 말이 ${left}개 남았어요 — 선공은 1개 · 이후 2개씩 놓으니 ${left % 2 === 1 ? "내가 마지막 말을 놓게 돼요 (상대가 더 놓을 수 없어 선언해야 해요)" : "상대가 마지막 말을 놓게 돼요 — 대신 판이 꽉 차기 전에 승부가 나요"}.`;
      return { opp, mine, rec, why };
    }
    if (V.phase === "place" && a) {
      if (a.t === "declare") {
        rec = "불가능 선언";
        const r = K.solveV(V, V.grid, 20000);
        why = r.res === 0 ? `이을 수 없는 판이에요 — ${K.unsatWhy(V)}. 선언하면 ${esc(raw(op))}${eun(raw(op))} 증명하지 못해요.` : `놓을 말이 없어요. 판은 풀리지만 선언 말고는 할 수 없어요.`;
      } else if (a.t === "place") {
        rec = `${putText(V, a.put)}에 놓기`;
        const g = K.withPut(V, a.put), r = K.solveV(V, g, 20000), B2 = K.boardInfo({ W: V.W, H: V.H, wall: V.wall, grid: g });
        const rate = K.squeeze(V, a.put, g, K.seeded(K.keyOf(V, me, 9)), 5, 700, { left: 9000 });
        const ex = r.res === 1 ? Object.keys(r.paths)[0] : null;
        why = `놓은 뒤에도 ${r.res === 1 ? `모든 색을 겹치지 않게 이을 수 있어요${ex != null ? ` (예: ${kn(+ex)} 길 ${r.paths[ex].length}칸)` : ""}` : "이을 수 있는지 확인이 길어요"} · 여유 ${B2.free - B2.need}칸 · 상대가 안전한 수를 찾을 확률 약 ${pct(rate)} (표본 5번)`;
      }
    } else if (V.phase === "prove" && a) {
      const ps = a.paths || {};
      const keys = Object.keys(ps);
      const first = keys.length ? +keys[0] : -1;
      if (a.t === "giveup") { rec = "증명하기 어려워요"; why = `고급 AI가 이을 길을 찾지 못했어요 — ${K.unsatWhy(V)}`; }
      else {
        HINT = HINT.key === `${V.pub}|${me}` ? HINT : { key: `${V.pub}|${me}`, open: false };
        const step = c0 => c0 >= 0 ? `${kn(first)} 길은 ${CN(V, ps[first][0])}에서 ${CN(V, ps[first][1])} 쪽으로 시작해요` : "";
        const full = keys.map(k => `${kn(+k)}: ${ps[k].map(c => CN(V, c)).join("→")}`).join(" · ");
        rec = HINT.open ? `<b>${full}</b>` : `${step(first)} (색 ${keys.length}개 모두 이을 수 있어요)`;
        why = `${HINT.open ? "" : `<button type="button" data-clhint style="margin:2px 4px 2px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.12);color:#fde68a;font:800 12.5px var(--round);cursor:pointer">💡 한 번 더 — 모든 길 보기</button> `}${esc(raw(V.decl))}${V.decl === me ? "" : eun(raw(V.decl))} 불가능이라고 했지만 풀 수 있는 판이에요 — 증명하면 내가 1점이에요.`;
      }
    }
    return { opp, mine, rec, why };
  }
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-clhint]");
    if (!b) return;
    e.preventDefault(); HINT.open = true;
    const V = S.V; if (!V) return;
    const a = K.ai(V, S.ctx ? S.ctx.me : 0, "hard", FIX);
    if (a && a.paths) { S.hint = true; S.hintPaths = a.paths; if (S.stage && S.ctx) paintProof(S.stage, V, S.ctx); }
    const p = b.closest("p"), rec = p && p.previousElementSibling;
    b.remove();
    if (rec && a && a.paths) rec.innerHTML = `💡 <b>추천</b> <b>${Object.keys(a.paths).map(k => `${kn(+k)}: ${a.paths[k].map(c => CN(V, c)).join("→")}`).join(" · ")}</b>`;
  }, true);

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    if (!Vb || !myA || !bestA) return { sev: 0, why: "", my, best };
    const canon = a => JSON.stringify(a && a.t === "place" ? { t: "place", put: (a.put || []).map(p => `${p.k}@${p.c}`).sort() } : a && a.t === "prove" ? { t: "prove" } : a);
    if (canon(myA) === canon(bestA)) return { sev: 0, why: "고급 AI와 같은 수", my, best };
    if (myA.t === "timeout") return { sev: 90, why: "시간 안에 하지 못해 그 라운드를 졌어요", my, best };
    if (Vb.phase === "choose") return { sev: 10, why: `놓을 말 ${Vb.cols.reduce((a, k) => a + Vb.stock[k], 0)}개 — 마지막 말을 놓는 쪽이 유리해서 홀짝으로 골라요`, my, best };
    if (Vb.phase === "place") {
      if (myA.t === "declare") {
        const r = K.solveV(Vb, Vb.grid, 20000);
        if (r.res === 1) return { sev: 92, why: `이 판은 풀 수 있었어요 (예: ${Object.keys(r.paths).slice(0, 1).map(k => `${kn(+k)} 길 ${r.paths[k].length}칸`)}) — 선언은 틀렸어요`, my, best };
        if (r.res === 0) return { sev: 0, why: `풀 수 없는 판이었어요 — ${K.unsatWhy(Vb)} · 선언이 맞았어요`, my, best };
        return { sev: 25, why: "풀 수 있는지 확인되지 않은 판에서 선언했어요", my, best };
      }
      if (myA.t === "place") {
        const ev = K.evalPut(Vb, myA.put, 12000);
        if (ev.res === 0) return { sev: 93, why: `이 수를 두면 풀 수 없는 판이 돼요 (${K.unsatWhy({ W: Vb.W, H: Vb.H, wall: Vb.wall, grid: ev.g })}) — 상대가 선언하면 증명하지 못해요`, my, best };
        if (ev.res < 0) return { sev: 50, why: "이 수를 둔 뒤 풀 수 있는지 확인이 어려워요 (탐색이 길어요) — 위험한 수예요", my, best };
        if (bestA.t === "declare") return { sev: 80, why: `판이 이미 풀 수 없었어요 (${K.unsatWhy(Vb)}) — 선언했으면 이겼어요`, my, best };
        const Rn = K.seeded(K.keyOf(Vb, seat, 9)), me2 = K.squeeze(Vb, myA.put, ev.g, Rn, 6, 700, { left: 12000 });
        const gb = K.withPut(Vb, bestA.put), be = K.squeeze(Vb, bestA.put, gb, K.seeded(K.keyOf(Vb, seat, 9)), 6, 700, { left: 12000 });
        const d = me2 - be;
        return { sev: Math.max(0, Math.min(55, Math.round(d * 100))), why: `둘 다 풀 수 있는 수예요 · 상대가 안전한 수를 찾을 확률(표본) 내 수 ${pct(me2)} · 고급 AI 수 ${pct(be)}`, my, best };
      }
    }
    if (Vb.phase === "prove") {
      if (myA.t === "giveup") return { sev: 88, why: "이을 수 있는 판이었는데 포기했어요", my, best };
      return { sev: 0, why: "", my, best };
    }
    return { sev: 0, why: "", my, best };
  }

  function result(V, me) {
    const nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    const w = V.res ? V.res.w : -1, rends = (V.log || []).filter(e => e.k === "rend");
    const head = w < 0 ? "" : me >= 0 && w === me ? "🏆 내가 이겼어요" : `🏆 ${nm(w)} 승리`;
    return `${head} — ${nm(0)} ${V.scores[0]} : ${V.scores[1]} ${nm(1)}<br>${rends.map(e => `${e.r + 1}라운드 ${e.w === me ? "내 점수" : nm(e.w) + " 점수"}(${WHY[e.why] || ""})`).join(" · ")}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    // 작은 연습 판 (5×5): A 두 개를 6칸 이상의 길로 잇기
    const mkV = (W, H, grid, wall) => ({ W, H, grid, wall: wall || Array(W * H).fill(0), pre: [], cols: [], stock: [] });
    const tb = x => `<div class="cl-tut">${x}</div>`;
    const g1 = Array(25).fill(-1); g1[0] = 0; g1[4 * 5 + 4] = 0; g1[2] = 7; g1[20] = 7;
    const V1 = mkV(5, 5, g1);
    const P1 = { 0: [0, 1, 6, 7, 12, 13, 18, 19, 24] };
    const g2 = Array(25).fill(-1); g2[6] = 0; g2[8] = 0; g2[12] = 5;
    const w2 = Array(25).fill(0); w2[11] = 1; w2[13] = 1; w2[17] = 1;
    const V2 = mkV(5, 5, g2, w2);
    const g3 = Array(25).fill(-1); g3[0] = 3; g3[4] = 3; g3[10] = 4; g3[14] = 4; g3[20] = 8;
    const w3 = Array(25).fill(0); w3[7] = 1; w3[12] = 1; w3[17] = 1;
    const V3 = mkV(5, 5, g3, w3);
    const g6 = Array(25).fill(-1); g6[0] = 0; g6[18] = 5; g6[22] = 5;
    const V6 = mkV(5, 5, g6);
    // 직접: 5×5 판에서 A 두 말을 길이 6칸 이상으로 잇기
    const gT = Array(25).fill(-1); gT[0] = 0; gT[4] = 0;
    const VT = mkV(5, 5, gT);
    return [
      { tag: "STEP 1 · 목표", title: "같은 색 두 말을 선으로 이어요", body: "색마다 말이 <b>2개</b>. 같은 색끼리 칸을 따라 <b>겹치지 않는 길</b>로 이어야 하고, 길 하나는 시작 · 끝 칸까지 합쳐 <b>최소 6칸</b>이에요.",
        boardHtml: tb(boardHtml(V1, { paths: P1 })), ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "판 · 벽 · 14색 28개 말", body: "라운드마다 다른 판이에요. <b>벽</b> 칸과 <b>미리 놓인 말</b>(작은 하얀 점)이 있고, 말은 <b>A~L · 검정 X · 흰색 Y</b> 14색. 다른 색 말 · 벽은 밟을 수 없어요.",
        boardHtml: tb(boardHtml(V2, { owner: {} })), ms: 6000 },
      { tag: "STEP 3 · 진행", title: "번갈아 서로 다른 색 2개", body: "선공은 말 <b>1개</b>, 그다음부터 번갈아 <b>서로 다른 색 2개</b>를 빈 칸에 놓아요 (3분). 1라운드 선후공은 동전, 다음부터는 진 사람이 골라요. 판이 꽉 찰수록 이을 길이 줄어요.",
        boardHtml: tb(boardHtml(V3, { owner: {}, pend: { 11: 6, 22: 2 } })), ms: 6000 },
      { tag: "STEP 4 · 직접", title: "길은 6칸 이상!", body: "5×5 판의 <b>A</b> 두 말을 이어 보세요. 가까워도 길은 <b>6칸 이상</b>이라 빙 돌아야 해요. 왼쪽 위 A를 누르고 이어 갈 칸을 차례로 눌러요 (끌어도 돼요).",
        interactive: { hint: "👆 A에서 시작해 6칸 넘게 이어요", doneText: "✅ 6칸 이상으로 이었어요!" },
        render(stage, ctrl) {
          let done = false, msg = "A 말을 눌러 시작해요";
          const path = []; let act = false;
          const nb = K.nbOf(5, 5);
          const draw = () => { stage.innerHTML = `<div class="cl-tut">${boardHtml(VT, { paths: path.length ? { 0: path } : {}, pk: true, head: path.length ? path[path.length - 1] : -1 })}<div class="cl-tmsg">${msg}</div></div>`; };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-c]"); if (!t) return;
            const c = +t.dataset.c;
            if (!act) { if (c === 0 || c === 4) { path.length = 0; path.push(c); act = true; msg = `A에서 시작 — 이어 갈 칸을 눌러요 (${path.length}칸)`; ctrl.sfx("tap"); draw(); } return; }
            const head = path[path.length - 1];
            if (path.length > 1 && c === path[path.length - 2]) { path.pop(); msg = `한 칸 되돌렸어요 (${path.length}칸)`; draw(); return; }
            if (!nb[head].includes(c) || path.includes(c)) { msg = "이어 가는 끝 칸 옆 빈 칸을 눌러요"; ctrl.sfx("tap"); draw(); return; }
            path.push(c);
            if ((c === 0 || c === 4) && c !== path[0]) {
              if (path.length >= MINLEN) { done = true; msg = `🎉 <b>${path.length}칸</b> — 6칸 이상으로 이었어요!`; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
              path.pop(); msg = `짝에 닿았지만 <b>${path.length + 1}칸</b>이에요 — 6칸 이상이어야 해요. 돌아서 가 봐요`; ctrl.sfx("tap"); draw(); return;
            }
            msg = `${path.length}칸 — 계속 이어요 (짝 A까지, 6칸 이상)`; ctrl.sfx("tap"); draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "불가능 선언 → 증명", body: "상대가 놓은 뒤 <b>이을 수 없다</b>고 보면 <b>불가능</b>을 선언해요. 그러면 방금 놓은 사람이 <b>5분 안에</b> 모든 색을 이어 증명해야 해요. 성공하면 증명한 사람 <b>1점</b>, 실패하면 선언한 사람 1점. <b>5라운드, 먼저 3점</b>.",
        boardHtml: tb(boardHtml(V1, { paths: P1 })), ms: 6000 },
      { tag: "STEP 6 · 특수 규칙", title: "한 개만 놓인 색 · 시간", body: "한 색이 말 <b>1개</b>만 놓였으면 증명할 때 <b>짝도 놓아서</b> 이어요 (길 끝 빈 칸에 짝을 놓아요). 마지막 말까지 놓아 더 놓을 게 없으면 선언뿐이에요. 방송의 <b>3분 · 5분</b> 제한은 옵션이고, 시간 안에 못 하면 그 라운드를 져요.",
        boardHtml: tb(boardHtml(V6, { paths: { 0: [0, 1, 2, 3, 4, 9] } })), ms: 6000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.colorlink = {
    name: "컬러 링크", emoji: "🔗", short: "같은 색 말을 겹치지 않게 이을 수 있을까? — 불가능 선언 · 증명 대결", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [{ k: "limit", label: "시간 제한", items: [[0, "없음"], [1, "놓기 3분 · 증명 5분 (방송)"]], def: 0 }],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 같은 색 말 두 개를 <b>겹치지 않는 길</b>로 이을 수 있는 판을 이어 가다가, 상대의 <b>불가능 선언</b>을 증명으로 막거나 내가 선언을 맞혀 <b>먼저 3점</b> (5라운드, 결승 2회전)",
      "준비물: 라운드마다 다른 판 (벽 · 미리 놓인 말) · 말 14색 28개 (색마다 2개) · 같은 색끼리 이은 길 하나는 시작 · 끝 칸 포함 <b>최소 6칸</b>, 다른 색 말 · 벽은 못 밟음",
      "진행: 선공은 말 <b>1개</b>, 그다음부터 번갈아 <b>서로 다른 색 2개</b>를 빈 칸에 놓아요 (제한 3분, 못 놓으면 그 라운드 패). 1라운드 선후공은 동전, 다음 라운드부터는 진 사람이 먼저 할지 정해요",
      "승패: 상대가 놓은 뒤 이을 수 없다고 보면 <b>불가능 선언</b> → 마지막에 놓은 사람이 <b>5분 안에</b> 모든 색을 겹치지 않게 이어 증명. 증명 성공 = 증명한 사람 1점, 실패 = 선언한 사람 1점. 5라운드 중 먼저 3점",
      "특수: 한 색이 1개만 놓였으면 증명 때 <b>짝도 놓아서</b> 이어요 · 놓을 말을 다 놓아 더 못 놓으면 선언만 가능 · 방송의 3분 · 5분 제한은 옵션 (기본 끔) · 판은 우리가 만든 것이라 방송 판과 달라요",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds} 라운드 · ${V.win}점 선승`),
    chip: (V, i) => ({ t: `${V.scores[i]}점`, on: !V.over && (V.needs || []).includes(i), out: !!(V.over && V.res && V.res.w !== i) }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "normal", rnd),
  };
})();

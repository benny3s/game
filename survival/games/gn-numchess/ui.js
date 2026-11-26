/* 베니 서바이벌 · 숫자장기 — 화면 (9 × 6 판 · 몰래 배치 · 말 고르기 → 갈 칸 · 대결 아이템 · 되살리기 · 선생님 · 1분 규칙 · 복기)
   시계는 UI 만 가져요: 60초 제한(옵션)이 켜져 있으면 내 차례에 재다가 끝나면 {t:"timeout"} 을 보내요. */
(() => {
  "use strict";
  const K = window.SVCores["gn-numchess"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const { W, H, MINE, KING, LETX } = K;
  const SRC = "방송: 더 지니어스 그랜드 파이널 (시즌 4) · 12화 결승 1회전 숫자장기 (장동민 vs 김경훈) — tvN 공식 룰 영상 「Finals Round 1 Number Janggi Rules Video」 · 디글 클래식 「[더지니어스4] 숫자장기」 클립 · 나무위키 '더 지니어스: 그랜드 파이널/12화' 확인";
  const DIFF = "결승 아이템은 각자 +1 · −1 · BLIND 한 벌씩 (방송은 탈락자에게 받은 아이템이라 장동민 BLIND · −1 · 아이템 복사, 김경훈 +1 · 아이템 무효화 — 복사 · 무효화는 없음) · 아이템은 옵션 (기본 켬) · 선은 동전 던지기 대신 무작위 · 60초 제한은 옵션 (기본 끔, 켜면 시간 안에 못 움직이면 패배) · 200수(각 100수)가 넘으면 왕 빼고 남은 말이 많은 쪽 승, 같으면 무승부 (끝없는 판 방지 상한) · 한 수로 두 사람 말이 함께 다 없어지면 움직인 쪽 승 · 되살리기: 끝 줄에 닿은 말은 공개하지 않고 빠지고, 되살린 말은 내 진영 맨 끝 줄 빈칸에 (빈칸이 없거나 잃은 말이 없으면 묻지 않음 · 지뢰도 되살릴 수 있음) · 아이템을 쓸지는 대결마다 아이템이 남은 사람에게 동시에 물음 · 마이너스 표시 자리는 방송 판 그림대로 2·3줄 · 4·5줄 사이 18곳 · 한 기기 두 사람 판은 없음 (말을 숨겨야 해서) · '안 움직인 말 표시'는 옵션 (기본 끔)";
  const CSS = `
.nc-st{flex:none;min-height:38px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.nc-st b{color:#fde68a}
.nc-st .bad{color:#fca5a5}.nc-st .good{color:#86efac}
.nc-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.nc-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.nc-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.nc-res.mid{color:#e2e8f0;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.45)}
.nc-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.nc-bar{flex:none;display:grid;gap:2px;font:700 11px/1.25 var(--round);color:var(--soft)}
.nc-bar .sd{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-height:18px}
.nc-bar .nm{max-width:7em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0}
.nc-bar .it{padding:0 5px;border-radius:6px;background:rgba(167,139,250,.2);color:#ddd6fe}
.nc-bar .it.off{opacity:.3;text-decoration:line-through}
.nc-bar .lo{display:inline-grid;place-items:center;min-width:16px;height:16px;padding:0 2px;border-radius:4px;font-size:10px;background:rgba(255,255,255,.1);color:#cbd5e1;text-decoration:line-through}
.nc-bar .dot{width:9px;height:9px;border-radius:3px;display:inline-block}
.nc-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
@media (max-width:430px){.nc-wrap{justify-items:end}}
.nc-board{--c:36px;display:grid;grid-template-columns:12px repeat(var(--nx),var(--c));grid-template-rows:12px repeat(var(--ny),var(--c));padding:2px 3px 3px 1px;border-radius:10px;background:#0b1220;box-shadow:inset 0 0 0 1px rgba(148,163,184,.35);user-select:none;-webkit-user-select:none;touch-action:manipulation}
.nc-ax{display:grid;place-items:center;font:700 9px/1 var(--round);color:#64748b}
.nc-cl{position:relative;display:grid;place-items:center;border:1px solid rgba(148,163,184,.15);background:rgba(255,255,255,.02)}
.nc-cl.ca{background:rgba(250,204,21,.07)}.nc-cl.cb{background:rgba(96,165,250,.09)}
.nc-cl.mb{border-bottom:2px solid #ef4444}
.nc-cl.mb::after{content:"−";position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:12px;height:12px;border-radius:50%;background:#ef4444;color:#fff;font:900 11px/11px var(--round);text-align:center;z-index:3;pointer-events:none}
.nc-cl.pk{cursor:pointer}
.nc-cl.lf{background:rgba(255,255,255,.07)}
.nc-cl.lt{box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
.nc-cl.ft{background:rgba(248,113,113,.2)}
.nc-cl.dst::before{content:"";width:30%;height:30%;border-radius:50%;background:rgba(74,222,128,.9);box-shadow:0 0 6px rgba(74,222,128,.7)}
.nc-cl.dst.fx{box-shadow:inset 0 0 0 2px #f87171}
.nc-cl.dst.fx::before{content:"⚔";width:auto;height:auto;background:none;box-shadow:none;font:900 calc(var(--c)*.42)/1 var(--round);color:#fca5a5}
.nc-cl.tg .nc-pc{outline:2px dashed #c4b5fd;outline-offset:1px}
.nc-cl.sel .nc-pc,.nc-cl.tgs .nc-pc{outline:3px solid #fff;outline-offset:1px}
.nc-cl.sel{background:rgba(255,255,255,.14)}
.nc-pc{width:84%;height:84%;border-radius:7px;display:grid;place-items:center;font:900 calc(var(--c)*.44)/1 var(--round);position:relative;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);pointer-events:none}
.nc-pc.a{background:linear-gradient(#fde68a,#f59e0b);color:#422006}
.nc-pc.b{background:linear-gradient(#1e3a8a,#172554);color:#bfdbfe;border:1px solid #3b82f6}
.nc-pc.b.hid::before{content:"?";opacity:.38}
.nc-pc.b.rv{background:#f8fafc;color:#1d4ed8;border:2px solid #3b82f6}
.nc-pc.b.sh{background:linear-gradient(#bfdbfe,#93c5fd);color:#1e3a8a}
.nc-pc .ey{position:absolute;top:1px;right:2px;font-size:8px;line-height:1;z-index:2}
.nc-pc.a.rv{border:2px dashed rgba(255,255,255,.9)}
.nc-pc .um{position:absolute;top:2px;right:3px;width:5px;height:5px;border-radius:50%;background:#94a3b8}
.nc-pc .md{position:absolute;bottom:-5px;right:-5px;font:900 9px/12px var(--round);min-width:14px;height:12px;border-radius:6px;background:#7c3aed;color:#fff}
.nc-pc.e{font-size:calc(var(--c)*.5)}
.nc-act{flex:none;display:grid;gap:6px}
.nc-row{display:flex;gap:6px}
.nc-row button{flex:1;min-width:0;height:48px;border-radius:13px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 14.5px var(--round);cursor:pointer;padding:0 6px;line-height:1.15}
.nc-row button.sub{background:rgba(255,255,255,.1);color:#e2e8f0;border:1px solid rgba(255,255,255,.2)}
.nc-row button.tg{background:rgba(255,255,255,.08);color:#e2e8f0;border:2px solid rgba(167,139,250,.45)}
.nc-row button.tg.on{background:linear-gradient(#a78bfa,#7c3aed);color:#fff;border-color:#ddd6fe}
.nc-row button small{display:block;font:700 10.5px var(--round);opacity:.85}
.nc-row button:disabled{opacity:.33;cursor:default}
.nc-dead{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}
.nc-dead button{width:44px;height:44px;border-radius:10px;border:2px solid rgba(250,204,21,.45);background:linear-gradient(#fde68a,#f59e0b);color:#422006;font:900 17px var(--round);cursor:pointer;padding:0}
.nc-dead button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.nc-tbar{height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.nc-tbar i{display:block;height:100%;background:#facc15;transform-origin:left;transition:transform .1s linear}
.nc-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.nc-tut .nc-board{--c:38px}
.nc-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.nc-tmsg b{color:#fde68a}
@media (max-height:650px){.nc-row button{height:46px}.nc-st{min-height:34px;font-size:12px}}
.sv-coachfit .nc-st{min-height:30px;font-size:11.5px}
.sv-coachfit .nc-bar{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는"), eul = w => (hasFinal(w) ? "을" : "를"), wa = w => (hasFinal(w) ? "과" : "와");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  const pct = x => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  const CN = c => K.cellName(c);
  const vTxt = v => (v == null ? "?" : v === MINE ? "💣" : v === KING ? "👑" : String(v));
  const vWord = v => (v == null ? "?" : v === MINE ? "지뢰" : v === KING ? "왕" : String(v));
  const ITN = { p: "+1", m: "−1", b: "BLIND" };
  const FIX = () => 0.5;                                    // 💡 = 고급 AI (고급은 rnd 를 안 씀)

  // ── 행동 글 ──
  function actText(a, V) {
    if (!a || typeof a !== "object") return "";
    const pv = id => { const p = V && V.pcs ? V.pcs[id] : null; return p && p.v != null ? vWord(p.v) : ""; };
    if (a.t === "setup") return "말 배치";
    if (a.t === "timeout") return "시간 초과";
    if (a.t === "mv") { const p = V && V.pcs ? V.pcs.find(q => !q.out && q.c === a.from) : null; const w = p && p.v != null ? `${vWord(p.v)} ` : ""; return `${w}${CN(a.from)} → ${CN(a.to)}`; }
    if (a.t === "item") return a.use && a.use.length ? a.use.map(u => `${ITN[u.k]}${pv(u.id) ? `(${pv(u.id)})` : ""}`).join(" · ") : "아이템 안 씀";
    if (a.t === "revive") return a.skip ? "되살리지 않음" : `${pv(a.id) || "잃은 말"} 되살리기 → ${CN(a.to)}`;
    return "";
  }

  // ── 판 그리기 ──  o: { persp, region, sel, dst:{c:'m'|'f'}, pick, last, ft:Set, lay, tg:Set, tgs, marks, mods:{id:±1}, tp, showAll }
  function boardHtml(V, o) {
    o = o || {};
    const persp = o.persp === 1 ? 1 : 0, flip = persp === 1;
    const [x0, x1, y0, y1] = o.region || [0, W - 1, 0, H - 1];
    const nx = x1 - x0 + 1, ny = y1 - y0 + 1;
    const pos = new Map();
    if (o.lay) o.lay.forEach((v, k) => { if (v) pos.set(K.slotCell(persp, k), { id: -1, s: persp, v, mv: 0, rev: false, k }); });
    else for (const p of V.pcs) if (!p.out && p.c >= 0) pos.set(p.c, p);
    let h = `<span class="nc-ax"></span>`;
    for (let dx = x0; dx <= x1; dx++) h += `<span class="nc-ax">${LETX[flip ? W - 1 - dx : dx]}</span>`;
    for (let dy = y0; dy <= y1; dy++) {
      const y = flip ? H - 1 - dy : dy;
      h += `<span class="nc-ax">${y + 1}</span>`;
      for (let dx = x0; dx <= x1; dx++) {
        const x = flip ? W - 1 - dx : dx, c = K.at(x, y), p = pos.get(c);
        let cls = "nc-cl" + (dx <= 2 ? " ca" : dx >= W - 3 ? " cb" : "") + ((dy === 1 || dy === 3) && dy < H - 1 ? " mb" : "");
        if (o.pick && o.pick(c)) cls += " pk";
        if (o.sel === c) cls += " sel";
        if (o.dst && o.dst[c]) cls += " dst" + (o.dst[c] === "f" ? " fx" : "");
        if (o.last && o.last.to === c) cls += " lt"; else if (o.last && o.last.from === c) cls += " lf";
        if (o.ft && o.ft.has(c)) cls += " ft";
        if (o.tg && p && o.tg.has(p.id)) cls += o.tgs === p.id ? " tgs" : " tg";
        let inner = "";
        if (p) {
          const side = p.s === persp ? "a" : "b", v = p.v, e = v === MINE || v === KING ? " e" : "";
          let pc = `nc-pc ${side}${e}`;
          if (side === "b") pc += v == null ? " hid" : p.rev ? " rv" : " sh";
          else if (p.rev && !o.showAll) pc += " rv";
          const md = o.mods && o.mods[p.id] ? `<i class="md">${o.mods[p.id] > 0 ? "+1" : "−1"}</i>` : "";
          inner = `<i class="${pc}">${v == null ? "" : vTxt(v)}${side === "a" && p.rev && !o.showAll ? `<i class="ey">👁</i>` : ""}${side === "b" && v == null && o.marks && !p.mv ? `<i class="um"></i>` : ""}${md}</i>`;
        }
        const tp = o.tp === c ? ' data-tp="1"' : "";
        h += `<div class="${cls}" data-c="${c}"${tp} aria-label="${CN(c)}${p ? " " + (p.s === persp ? "내 말 " : "상대 말 ") + vWord(p.v) : ""}">${inner}</div>`;
      }
    }
    return `<div class="nc-board" data-nx="${nx}" data-ny="${ny}" style="--nx:${nx};--ny:${ny}" aria-label="숫자장기 판">${h}</div>`;
  }

  // ── 대결 글 ──
  function fightText(e, who, persp) {
    if (!e || e.k !== "fight") return "";
    const mv = `${who(e.s)} ${vTxt(e.va)}${e.ea != null && e.va != null && e.ea !== e.va && e.va <= 10 ? `(${e.ea})` : ""}`;
    const parts = e.pairs.map(q => {
      const bw = `${who(1 - e.s)} ${vTxt(q.vb)}${q.eb != null && q.vb != null && q.eb !== q.vb && q.vb <= 10 ? `(${q.eb})` : ""}`;
      let how = "";
      if (e.va != null && q.vb != null && e.va <= 10 && q.vb <= 10) { const k = q.t === "minus" ? Math.abs(e.ea - q.eb) : e.ea + q.eb; how = q.t === "minus" ? `⊖ 차 ${k}` : `합 ${k}`; }
      else if (q.t === "minus") how = "⊖";
      const out = q.ad && q.bd ? "둘 다 제거" : q.ad ? `${vTxt(e.va)} 제거` : q.bd ? `${vTxt(q.vb)} 제거` : "그대로";
      return `${bw}${how ? ` (${how})` : ""} → <b>${out}</b>`;
    });
    const it = (e.use || []).map(u => `${who(u.s)} ${ITN[u.k]}`).join(" · ");
    void persp;
    return `⚔ ${mv} ${CN(e.at)}: ${parts.join(" · ")}${it ? ` <small>🎒 ${it}</small>` : ""}`;
  }
  const WHY = { king: "왕을 잡았어요", kingrun: "왕이 상대 진영 끝 줄에 닿았어요", all: "왕 빼고 상대 말을 모두 잡았어요", stuck: "상대가 움직일 말이 없었어요", time: "상대가 시간 안에 못 움직였어요", count: "200수 — 남은 말 수로 가렸어요" };

  // ── 이 화면의 선택 · 시계 ──
  const S = { pk: "", stage: null, ctx: null, V: null, sel: -1, tg: -1, use: {}, rv: -1, sw: -1, lay: null, layKey: "", sent: 0, tm: 0, iv: 0, dl: 0, dur: 0, armed: "" };
  const clearTimers = () => { clearTimeout(S.tm); S.tm = 0; S.dl = 0; };
  function tick() {
    const st = S.stage;
    if (!st || !st.isConnected || !S.dl) { clearInterval(S.iv); S.iv = 0; return; }
    const left = Math.max(0, S.dl - Date.now()), bar = st.querySelector(".nc-tbar i"), cd = st.querySelector("[data-cd]");
    if (bar) bar.style.transform = `scaleX(${Math.min(1, left / (S.dur || 1))})`;
    if (cd) cd.textContent = String(Math.ceil(left / 1000));
  }
  function arm(ms, fn) {
    clearTimers(); S.dl = Date.now() + ms; S.dur = ms;
    const pk = S.pk;
    S.tm = setTimeout(() => { if (S.pk === pk) fn(); }, ms);
    if (!S.iv) S.iv = setInterval(tick, 200);
  }
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return false;
    if (S.sent && Date.now() - S.sent < 900) return false;        // 두 번 탭 막기
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); return false; }
    S.sel = -1; S.use = {}; S.rv = -1; S.sw = -1; c.sfx("pop");
    return true;
  }
  function fitBoard(stage) {
    const w = stage.querySelector(".nc-wrap"), b = w && w.firstElementChild; if (!b) return;
    const nx = +b.dataset.nx || W, ny = +b.dataset.ny || H;
    const inset = window.innerWidth <= 430 ? 18 : 0;
    const c = Math.floor(Math.min((w.clientWidth - inset - 18) / nx, ((w.clientHeight || 9999) - 18) / ny, 50));
    if (c >= 18) b.style.setProperty("--c", c + "px");
  }
  const mineIn = (V, me) => { const F = V.fight; if (!F) return []; return (V.pcs[F.a].s === me ? [F.a] : []).concat(F.pairs.filter(q => V.pcs[q.b].s === me).map(q => q.b)); };
  const itemOk = (V, me, k, id) => { const p = V.pcs[id]; if (!p || !(V.items[me][k] > 0)) return false; return k === "b" ? p.v !== KING : p.v != null && p.v <= 10; };
  function gridOf(V) { const g = Array(W * H).fill(-1); for (const p of V.pcs) if (!p.out && p.c >= 0) g[p.c] = p.id; return g; }
  function dstOf(V, me, from) {
    const g = gridOf(V), id = g[from], p = id >= 0 ? V.pcs[id] : null, o = {};
    if (!p || p.s !== me || p.v === MINE) return o;
    for (const t of K.destOf(g, me, from, p.v)) { g[from] = -1; o[t] = K.N4[t].some(j => g[j] >= 0 && V.pcs[g[j]].s !== me) ? "f" : "m"; g[from] = id; }
    return o;
  }

  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || !(me === 0 || me === 1);
    const persp = watch ? 0 : me, op = 1 - persp;
    const can = !!ctx.canAct && !watch && !V.over && (V.needs || []).includes(me);
    const lastI = V.log && V.log.length ? V.log[V.log.length - 1].i : 0;
    const pk = V.phase === "setup" ? `${ctx.g}|${me}|setup` : `${ctx.g}|${me}|${V.phase}|${V.ply}|${lastI}`;
    if (pk !== S.pk) { S.pk = pk; S.sel = -1; S.use = {}; S.rv = -1; S.sw = -1; S.sent = 0; S.tg = -1; clearTimers(); }
    const nm = i => (!watch && i === me ? "나" : nameOf(ctx, i));
    const who = i => (!watch && i === me ? "내" : esc(nameOf(ctx, i)));
    const subj = i => (!watch && i === me ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const marks = !!(V.opt && V.opt.marks);
    let st = "", actH = "", bo = { persp, marks, showAll: watch };
    // 방금 일어난 대결 · 되살리기만 (그 뒤에 이동이 있었으면 지난 일)
    const lastEv = V.last && !(V.log || []).some(e => e.k === "mv" && e.i > V.last.i) ? V.last : null;
    const LM = V.lastMv;
    let lastTxt = lastEv && lastEv.k === "fight" ? fightText(lastEv, who, persp) : lastEv && lastEv.k === "rev" ? `↺ ${subj(lastEv.s)} ${vTxt(lastEv.v)}${eul(vWord(lastEv.v))} 되살려 ${CN(lastEv.to)}에` : "";
    if (!lastTxt && LM && V.phase !== "setup") lastTxt = `${who(LM.s)} 수: ${CN(LM.from)} → ${CN(LM.to)}`;
    if (LM && V.phase !== "setup") bo.last = LM;
    if (lastEv && lastEv.k === "fight") bo.ft = new Set([lastEv.at].concat(lastEv.pairs.map(q => q.bc)));
    const lim = V.opt && V.opt.limit ? V.opt.limit | 0 : 0;

    if (V.phase === "setup" && !V.over) {
      const key = `${ctx.g}|${me}|${V.sd}`;
      if (!watch && S.layKey !== key) { S.layKey = key; const a = K.ai(V, me, "hard", FIX); S.lay = a && a.lay ? a.lay.slice() : K.layEasy(Math.random); }
      const done = !watch && V.lay;
      bo.lay = watch ? null : done ? V.lay : S.lay;
      if (can && !done) {
        bo.pick = c => K.cellSlot(me, c) >= 0; bo.sel = S.sw >= 0 ? K.slotCell(me, S.sw) : -1;
        st = S.sw >= 0 ? `<span><b>${CN(K.slotCell(me, S.sw))}</b>${eul(CN(K.slotCell(me, S.sw)))} 골랐어요 (${S.lay[S.sw] ? vTxt(S.lay[S.sw]) : "빈칸"}) — 바꿀 칸을 눌러요</span>` : `<span><b>몰래 배치</b> — 두 칸을 차례로 누르면 자리가 바뀌어요<br>👑 왕은 💣 지뢰로 둘러싸면 아무도 못 닿아요</span>`;
        actH = `<div class="nc-row"><button type="button" class="sub" data-a="rec">추천 배치</button><button type="button" class="sub" data-a="mix">섞기</button><button type="button" data-a="lay">배치 완료</button></div>`;
      } else st = watch ? `<span>두 사람이 몰래 말을 배치하는 중…</span>` : `<span>✅ 배치 끝 — ${esc(nameOf(ctx, op))}의 배치를 기다려요</span>`;
    } else if (V.over) {
      const R = V.res || {}, w = R.w;
      const cls = w == null || w < 0 ? "mid" : watch || w === me ? "ok" : "no";
      const head = w == null || w < 0 ? `🤝 무승부 — 남은 말 ${R.cnt ? R.cnt.join(" : ") : ""}` : watch ? `🏆 ${esc(nm(w))} 승리` : w === me ? "🏆 내가 이겼어요!" : `💥 ${esc(nameOf(ctx, w))} 승리 — 졌어요`;
      const why = w >= 0 ? WHY[R.why] || "" : WHY.count;
      st = `<div class="nc-res ${cls}">${head}<small>${why}${lastTxt ? " · " + lastTxt.replace(/<small>.*<\/small>/, "") : ""} · 모든 말 공개</small></div>`;
    } else if (V.phase === "play") {
      const myTurn = can && V.cur === me;
      if (myTurn) {
        const sel = S.sel, dst = sel >= 0 ? dstOf(V, me, sel) : null;
        bo.sel = sel; bo.dst = dst;
        bo.pick = c => { const p = V.pcs.find(q => !q.out && q.c === c); return (p && p.s === me && p.v !== MINE) || !!(dst && dst[c]); };
        const tm = lim ? ` · ⏱ <b data-cd>${lim}</b>초` : "";
        if (sel >= 0) { const p = V.pcs.find(q => !q.out && q.c === sel); const nf = Object.values(dst).filter(x => x === "f").length; st = `<span>${p && p.v === KING ? "👑 왕" : `말 ${vTxt(p && p.v)}`} (${CN(sel)}) — 갈 칸을 눌러요 (초록 점${nf ? " · ⚔ = 바로 대결" : ""})${tm}</span>`; }
        else st = `<span>${lastTxt ? lastTxt + "<br>" : ""}<b>내 차례</b> — 움직일 말을 눌러요${tm}</span>`;
        if (lim) actH = `<div class="nc-tbar"><i></i></div>`;
      } else st = `<span>${lastTxt ? lastTxt + "<br>" : ""}${esc(nm(V.cur))} 차례 — 생각하는 중…</span>`;
    } else if (V.phase === "item") {
      const F = V.fight, A = V.pcs[F.a];
      const head = `⚔ <b>대결!</b> ${who(A.s)} ${vTxt(A.v)} → ${CN(F.at)}: ${F.pairs.map(q => `${who(V.pcs[q.b].s)} ${vTxt(V.pcs[q.b].v)}${q.t === "minus" ? "(⊖)" : ""}`).join(" · ")}`;
      bo.ft = new Set([F.at].concat(F.pairs.map(q => V.pcs[q.b].c)));
      if (can && !F.done[me]) {
        const ids = mineIn(V, me);
        if (S.tg < 0 || !ids.includes(S.tg)) S.tg = ids[0];
        bo.tg = new Set(ids); bo.tgs = S.tg; bo.pick = c => ids.some(id => V.pcs[id].c === c);
        bo.mods = {}; if (S.use.p != null) bo.mods[S.use.p] = 1; if (S.use.m != null) bo.mods[S.use.m] = -1;
        const tv = V.pcs[S.tg] ? vTxt(V.pcs[S.tg].v) : "?";
        st = `<span>${head}<br>🎒 아이템을 쓸까요? ${ids.length > 1 ? "(점선 말을 눌러 고름) " : ""}— 고른 말 <b>${tv}</b></span>`;
        const btn = k => { const on = S.use[k] != null, okk = on || itemOk(V, me, k, S.tg); const lab = on ? `${ITN[k]}<small>${vTxt(V.pcs[S.use[k]].v)}에</small>` : `${ITN[k]}<small>${V.items[me][k] > 0 ? "남음 1" : "다 씀"}</small>`; return `<button type="button" class="tg${on ? " on" : ""}" data-it="${k}"${okk ? "" : " disabled"}>${lab}</button>`; };
        const n = Object.keys(S.use).length;
        actH = `${lim ? `<div class="nc-tbar"><i></i></div>` : ""}<div class="nc-row">${["p", "m", "b"].map(btn).join("")}</div><div class="nc-row"><button type="button" class="sub" data-a="noitem">안 써요</button><button type="button" data-a="item"${n ? "" : " disabled"}>${n ? `${n}개 쓰기` : "쓰기"}</button></div>`;
      } else st = `<span>${head}<br>${!watch && F.done[me] ? "✅ 골랐어요 — 상대를 기다려요" : "🎒 아이템을 쓸지 고르는 중…"}</span>`;
    } else if (V.phase === "revive") {
      const R = V.revv, arr = V.pcs[R.id];
      if (can && R.s === me) {
        const dead = V.pcs.filter(p => p.s === me && p.out && p.v !== KING);
        const cells = []; for (let y = 0; y < H; y++) { const c = K.at(K.BACK[me], y); if (!V.pcs.some(p => !p.out && p.c === c)) cells.push(c); }
        bo.sel = arr.c;
        if (S.rv >= 0) { bo.dst = {}; for (const c of cells) bo.dst[c] = "m"; bo.pick = c => cells.includes(c); }
        st = `<span>🎉 ${vTxt(arr.v)}${iga(vWord(arr.v))} 상대 끝 줄 ${CN(arr.c)}에 닿았어요!<br>${S.rv >= 0 ? `<b>${vTxt(V.pcs[S.rv].v)}</b>${eul(vWord(V.pcs[S.rv].v))} 놓을 내 끝 줄 칸을 눌러요` : "이 말 대신 잃은 말 하나를 <b>되살릴</b> 수 있어요 (숫자 공개)"}</span>`;
        actH = `${lim ? `<div class="nc-tbar"><i></i></div>` : ""}<div class="nc-dead">${dead.map(p => `<button type="button" data-dead="${p.id}" class="${S.rv === p.id ? "on" : ""}" aria-label="${vWord(p.v)} 되살리기">${vTxt(p.v)}</button>`).join("")}</div><div class="nc-row"><button type="button" class="sub" data-a="keep">되살리지 않기</button></div>`;
      } else st = `<span>${lastTxt ? lastTxt + "<br>" : ""}↺ ${subj(R.s)} 끝 줄에 닿아 되살릴 말을 고르는 중…</span>`;
    }
    // 두 사람 줄 (아이템 · 잃은 말)
    const side = s => {
      const it = V.items[s], lost = V.pcs.filter(p => p.s === s && p.out);
      const its = V.opt && V.opt.items ? ["p", "m", "b"].map(k => `<span class="it${it[k] > 0 ? "" : " off"}">${ITN[k]}</span>`).join("") : "";
      return `<div class="sd"><i class="dot" style="background:${s === persp ? "#f59e0b" : "#3b82f6"}"></i><span class="nm">${esc(nm(s))}</span> 말 ${V.score ? V.score[s] : 0}${its ? " · " + its : ""}${lost.length ? ` · 잃은 말 ${lost.map(p => `<span class="lo">${vTxt(p.v)}</span>`).join("")}` : ""}</div>`;
    };
    const bar = V.phase === "setup" && !V.over ? "" : `<div class="nc-bar">${side(op)}${side(persp)}</div>`;
    stage.innerHTML = `<div class="nc-st">${st}</div>${bar}<div class="nc-wrap">${boardHtml(V, bo)}</div>${actH ? `<div class="nc-act">${actH}</div>` : ""}`;
    fitBoard(stage);
    if (window.ResizeObserver) {
      if (S.ro) S.ro.disconnect();
      const w = stage.querySelector(".nc-wrap"); let last = w ? w.clientHeight : 0;
      if (w) { S.ro = new ResizeObserver(() => { if (Math.abs(w.clientHeight - last) > 1) { last = w.clientHeight; fitBoard(stage); } }); S.ro.observe(w); }
    }
    // 시계 (60초 옵션)
    // 아이템 · 되살리기도 시간이 지나면 '안 써요' · '되살리지 않기'로 (판이 멈추지 않게)
    if (lim && can && S.armed !== pk && (V.phase === "play" ? V.cur === me : V.phase === "item" ? !V.fight.done[me] : V.phase === "revive" && V.revv.s === me)) {
      S.armed = pk;
      const dflt = V.phase === "play" ? { t: "timeout" } : V.phase === "item" ? { t: "item", use: [] } : { t: "revive", skip: true };
      arm(ctx.fast ? 4000 : lim * 1000, () => { const c = S.ctx; if (c && c.canAct) send(dflt); }); tick();
    }
    else if (S.dl) tick();
    stage.onclick = e => {
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.over) return;
      const t = e.target.closest("[data-c],button"); if (!t || t.disabled) return;
      const rr = () => render(stage, VV, c);
      if (VV.phase === "setup") {
        if (t.dataset.a === "rec") { const a = K.ai(VV, me, "hard", FIX); S.lay = a.lay.slice(); S.sw = -1; c.sfx("tap"); rr(); return; }
        if (t.dataset.a === "mix") { S.lay = K.layGood(Math.random, false); S.sw = -1; c.sfx("tap"); rr(); return; }
        if (t.dataset.a === "lay") { send({ t: "setup", lay: S.lay.slice() }); return; }
        if (t.dataset.c != null) {
          const k = K.cellSlot(me, +t.dataset.c); if (k < 0) return;
          if (S.sw < 0) S.sw = k; else { if (S.sw !== k) { const x = S.lay[S.sw]; S.lay[S.sw] = S.lay[k]; S.lay[k] = x; } S.sw = -1; }
          c.sfx("tap"); rr();
        }
        return;
      }
      if (VV.phase === "play" && VV.cur === me && t.dataset.c != null) {
        const cc = +t.dataset.c;
        if (S.sel >= 0) { const d = dstOf(VV, me, S.sel); if (d[cc]) { send({ t: "mv", from: S.sel, to: cc }); return; } }
        const p = VV.pcs.find(q => !q.out && q.c === cc);
        if (p && p.s === me) {
          if (p.v === MINE) { c.toast("지뢰는 움직일 수 없어요"); return; }
          if (!Object.keys(dstOf(VV, me, cc)).length) { c.toast("그 말은 지금 갈 곳이 없어요"); return; }
          S.sel = S.sel === cc ? -1 : cc; c.sfx("tap"); rr(); return;
        }
        if (S.sel >= 0) { S.sel = -1; rr(); }
        return;
      }
      if (VV.phase === "item") {
        if (t.dataset.c != null) { const p = VV.pcs.find(q => !q.out && q.c === +t.dataset.c); if (p && mineIn(VV, me).includes(p.id)) { S.tg = p.id; c.sfx("tap"); rr(); } return; }
        const k = t.dataset.it;
        if (k) {
          if (S.use[k] != null) delete S.use[k];
          else if (itemOk(VV, me, k, S.tg)) { S.use[k] = S.tg; if (k === "p" && S.use.m === S.tg) delete S.use.m; if (k === "m" && S.use.p === S.tg) delete S.use.p; }
          c.sfx("tap"); rr(); return;
        }
        if (t.dataset.a === "noitem") { send({ t: "item", use: [] }); return; }
        if (t.dataset.a === "item") { send({ t: "item", use: Object.keys(S.use).map(kk => ({ k: kk, id: S.use[kk] })) }); return; }
        return;
      }
      if (VV.phase === "revive") {
        if (t.dataset.dead != null) { const id = +t.dataset.dead; S.rv = S.rv === id ? -1 : id; c.sfx("tap"); rr(); return; }
        if (t.dataset.a === "keep") { send({ t: "revive", skip: true }); return; }
        if (t.dataset.c != null && S.rv >= 0) { send({ t: "revive", id: S.rv, to: +t.dataset.c }); return; }
      }
    };
  }

  // ── 선생님 (보이는 것만 — 남은 숫자 분포 · 안 움직인 말 = 지뢰 후보 · 공개된 숫자 기억) ──
  const sumRate = v => { let w = 0; for (let u = 1; u <= 10; u++) if (u !== v && K.numDuel(v, u, "sum")[1]) w++; return w / 9; };
  function hiddenStats(V, me) {
    const op = 1 - me, A = K.analyze(V, me), D = A.Dopp;
    const hid = V.pcs.filter(p => p.s === op && !p.out && p.c >= 0 && p.v == null);
    const mineTop = hid.slice().sort((a, b) => D[b.id][MINE] - D[a.id][MINE] || a.c - b.c)[0];
    const kingTop = hid.slice().sort((a, b) => D[b.id][KING] - D[a.id][KING] || a.c - b.c)[0];
    return { A, D, hid, mineTop, kingTop };
  }
  function oddsLine(o) { return `이길 확률 ${pct(o.win)} · 질 확률 ${pct(o.lose)} · 함께 제거 ${pct(o.both)}`; }
  function coach(V, me, since, names) {
    void since;
    if (!(me === 0 || me === 1)) me = V.needs && V.needs.length ? V.needs[0] : 0;
    const op = 1 - me, raw = i => (i === me ? "나" : String((Array.isArray(names) && names[i]) || "상대")), nmx = i => esc(raw(i));
    const its = s => (V.opt && V.opt.items ? ["p", "m", "b"].filter(k => V.items[s][k] > 0).map(k => ITN[k]).join(" · ") || "없음" : "끔");
    let opp = "", mine = "", rec = "", why = "";
    if (!(V.seat === me || V.seat === "all")) {           // 이 자리의 말이 안 보이는 화면(구경꾼)이면 공개된 것만
      const rv = s => V.pcs.filter(p => p.s === s && !p.out && p.rev).length;
      return { opp: `${nmx(op)} 남은 말 ${V.score ? V.score[op] : 0}개 (공개 ${rv(op)})`, mine: `${nmx(me)} 남은 말 ${V.score ? V.score[me] : 0}개 (공개 ${rv(me)})`, rec: "구경 중이에요.", why: "자리에 앉으면 숨은 말 확률과 추천 수를 알려 드려요." };
    }
    if (V.phase === "setup" && !V.over) {
      opp = `${nmx(op)} ${V.ready[op] ? "배치를 마쳤어요" : "배치하는 중"} — 상대 말 14개 (숫자 1~10 · 💣 지뢰 3 · 👑 왕 1)는 처음엔 모두 뒤집혀 있어요.`;
      mine = `내 진영 18칸 중 14칸에 말 · 빈칸 4칸 (옆으로 비킬 자리). 합 대결 이길 확률 1 · 10 → ${pct(sumRate(1))} · ${pct(sumRate(10))}, 5 → ${pct(sumRate(5))}.`;
      const a = K.ai(V, me, "hard", FIX);
      if (a && a.lay) {
        const kk = a.lay.indexOf(KING), ms = a.lay.map((v, k) => (v === MINE ? k : -1)).filter(k => k >= 0);
        rec = `추천 배치: 👑 ${CN(K.slotCell(me, kk))} · 💣 ${ms.map(k => CN(K.slotCell(me, k))).join(" · ")} · 10 ${CN(K.slotCell(me, a.lay.indexOf(10)))} · 9 ${CN(K.slotCell(me, a.lay.indexOf(9)))}`;
        const near = ms.filter(k => Math.abs(((k / 3) | 0) - ((kk / 3) | 0)) + Math.abs((k % 3) - (kk % 3)) === 1).length;
        why = `지뢰는 움직이지 않아서 왕 둘레 ${near}칸을 막으면 상대 말이 왕에 닿을 길이 없어요. 9 · 10 은 큰 수끼리 싸움(합 10 이상)에 강하고, 1 은 작은 수끼리(합 10 미만)에서 이겨요.`;
      }
      return { opp, mine, rec, why };
    }
    if (V.over) {
      const R = V.res || {};
      return { opp: `${nmx(op)} 남은 말 ${V.score[op]}개`, mine: `내 남은 말 ${V.score[me]}개`, rec: "끝났어요.", why: R.w == null || R.w < 0 ? "무승부." : `${R.w === me ? "내가" : nmx(op) + iga(raw(op))} 이겼어요 — ${WHY[R.why] || ""}.` };
    }
    const H0 = hiddenStats(V, me), D = H0.D;
    const opT = V.turns[op];
    const lastOp = (V.log || []).slice().reverse().find(e => e.k === "mv" && e.s === op);
    const mt = H0.mineTop, kt = H0.kingTop;
    const shown = V.pcs.filter(p => p.s === op && p.v != null && (p.rev || p.out)).map(p => vTxt(p.v));
    opp = `${nmx(op)} 숨은 말 ${H0.hid.length}개${lastOp ? ` · 마지막 ${CN(lastOp.from)}→${CN(lastOp.to)}` : ""}${mt ? ` · 💣 지뢰일 확률 ${CN(mt.c)} ~${pct(D[mt.id][MINE])}${mt.mv ? "" : opT ? ` (${opT}턴째 안 움직임)` : " (아직 아무 말도 안 움직임)"}` : ""}${kt && D[kt.id][KING] > 0 ? ` · 👑 왕일 확률 ${CN(kt.c)} ~${pct(D[kt.id][KING])}` : ""}${shown.length ? ` · 알려진 숫자 ${shown.join(" ")}` : ""} · 🎒 ${its(op)}`;
    const myK = V.pcs.find(p => p.s === me && p.v === KING && !p.out);
    const qk = myK ? H0.A.Dme[myK.id][KING] : 0;
    const myRev = V.pcs.filter(p => p.s === me && !p.out && p.rev).length;
    mine = `내 말 ${V.score[me]}개 + 왕 (공개 ${myRev}) · 잃은 말 ${V.pcs.filter(p => p.s === me && p.out).length} · 🎒 ${its(me)} · 상대가 보기에 내 왕이 ${myK ? CN(myK.c) : "?"}일 확률 ~${pct(qk)}.`;
    if (!(V.needs || []).includes(me)) {
      rec = `${nmx(op)} 차례를 기다려요.`;
      why = mt ? `안 움직인 말일수록 지뢰 · 왕일 수 있어요 — ${CN(mt.c)}${eun(CN(mt.c))} 지뢰 ~${pct(D[mt.id][MINE])}.` : "공개된 숫자를 기억해 두세요.";
      return { opp, mine, rec, why };
    }
    const a = K.ai(V, me, "hard", FIX);
    if (V.phase === "play" && a) {
      const p = V.pcs.find(q => !q.out && q.c === a.from);
      rec = `${p && p.v === KING ? "👑 왕" : `말 ${vTxt(p && p.v)}`}: ${CN(a.from)} → ${CN(a.to)}`;
      const rows = K.evalMoves(V, me), r = rows.find(x => x.a.from === a.from && x.a.to === a.to) || rows[0];
      const g = gridOf(V); g[a.from] = -1; g[a.to] = p ? p.id : -1;
      const nb = K.N4[a.to].map(j => g[j]).filter(j => j >= 0 && V.pcs[j].s === op);
      if (nb.length && p) {
        why = nb.map(b => { const t = K.isMinus(a.to, V.pcs[b].c) ? "minus" : "sum", o = K.duelOdds(p.v, 0, D[b], t); return `${CN(V.pcs[b].c)}의 ${vTxt(V.pcs[b].v)}${wa(vWord(V.pcs[b].v))} ${t === "minus" ? "⊖ 차" : "합"} 대결 — ${oddsLine(o)}${D[b][MINE] > 0.01 ? ` (지뢰 ~${pct(D[b][MINE])})` : ""}${D[b][KING] > 0.01 ? ` (왕 ~${pct(D[b][KING])})` : ""}`; }).join(" · ");
        if (r && r.info && r.info.mod) why += ` · ${r.info.mod > 0 ? "+1" : "−1"} 아이템을 쓰면 더 유리해요`;
      } else if (p && p.v === KING && K.X(a.to) === K.FAR[me]) why = "👑 왕이 상대 진영 끝 줄에 닿아요 — 바로 승리!";
      else {
        const fr = K.X(a.to) === K.FAR[me] ? " · 상대 끝 줄에 닿아 잃은 말을 되살릴 수 있어요" : "";
        let reach = 0; for (const c of K.N4[a.to]) if (g[c] < 0) for (const q of V.pcs) if (q.s === op && !q.out && q.c >= 0 && D[q.id][MINE] < 0.999 && K.destOf(g, op, q.c, -1).includes(c)) { reach++; break; }
        why = `맞닿는 말 없이 자리 잡기 — 다음 차례 상대가 이 말 옆으로 올 수 있는 칸 ${reach}곳${fr} (점수 ${r ? r.v.toFixed(1) : "0"})`;
      }
    } else if (V.phase === "item" && a) {
      const F = V.fight, ids = mineIn(V, me), use = a.use || [];
      rec = use.length ? use.map(u => `${ITN[u.k]} → ${vTxt(V.pcs[u.id].v)}`).join(" · ") : "아이템 안 써요";
      const mods = {}; for (const u of use) if (u.k !== "b") mods[u.id] = u.k === "p" ? 1 : -1;
      const A = V.pcs[F.a];
      const rows = A.s === me ? F.pairs.map(q => { const o0 = K.duelOdds(A.v, 0, D[q.b], q.t), o1 = K.duelOdds(A.v, mods[A.id] || 0, D[q.b], q.t); return `${CN(V.pcs[q.b].c)} ${vTxt(V.pcs[q.b].v)}: 이길 확률 ${pct(o0.win)}${mods[A.id] ? ` → ${pct(o1.win)}` : ""}`; })
        : ids.map(id => { const q = F.pairs.find(x => x.b === id), dm = K.mover(D[A.id]), o0 = K.duelOdds(V.pcs[id].v, 0, dm, q.t), o1 = K.duelOdds(V.pcs[id].v, mods[id] || 0, dm, q.t); return `내 ${vTxt(V.pcs[id].v)} 이길 확률 ${pct(o0.win)}${mods[id] ? ` → ${pct(o1.win)}` : ""}`; });
      why = `${rows.join(" · ")}${use.some(u => u.k === "b") ? " · BLIND 는 살아남을 강한 말의 정체를 계속 숨겨요" : ""}${!use.length ? " · 아이템은 한 번뿐 — 판이 크게 갈리는 대결에 아껴요" : ""}`;
    } else if (V.phase === "revive" && a) {
      if (a.skip) { rec = "되살리지 않기"; why = "잃은 말이 끝 줄에 닿은 말보다 약해요 — 그대로 두는 편이 나아요."; }
      else { const p = V.pcs[a.id]; rec = `${vTxt(p.v)}${eul(vWord(p.v))} ${CN(a.to)}에 되살리기`; why = `잃은 말 중 가장 쓸모 있는 말 (${p.v <= 10 ? `합 대결 이길 확률 ${pct(sumRate(p.v))}` : "지뢰 — 왕 둘레를 다시 막아요"}) · 되살린 말은 숫자가 공개돼요.`; }
    }
    return { opp, mine, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    if (!Vb || !myA || !bestA) return { sev: 0, why: "", my, best };
    const canon = a => JSON.stringify(a && a.t === "item" ? { t: "item", use: (a.use || []).map(u => u.k + u.id).sort() } : a);
    if (canon(myA) === canon(bestA)) return { sev: 0, why: "고급 AI 와 같은 수", my, best };
    if (myA.t === "timeout") return { sev: 85, why: "시간 안에 못 움직여 졌어요", my, best };
    if (Vb.phase === "play" && myA.t === "mv" && bestA.t === "mv") {
      const rows = K.evalMoves(Vb, seat), f = a => rows.find(r => r.a.from === a.from && r.a.to === a.to);
      const rm = f(myA), rb = f(bestA) || rows[0];
      if (!rm || !rb) return { sev: 0, why: "", my, best };
      const d = rb.v - rm.v;
      const sev = d >= 40 ? Math.min(98, 70 + Math.round(d / 5)) : Math.max(0, Math.min(65, Math.round(d * 13)));
      const fx = r => (r.info && r.info.fight ? `대결 뒤 내 말이 살 확률 ${pct(1 - r.info.pAd)}` : "대결 없음");
      return { sev, why: `수 점수 내 수 ${rm.v.toFixed(1)} · 고급 AI 수 ${rb.v.toFixed(1)} (${fx(rm)} / ${fx(rb)})${d >= 40 ? " — 왕이 걸린 수였어요" : ""}`, my, best };
    }
    if (Vb.phase === "item" && myA.t === "item") {
      const em = K.itemEval(Vb, seat, myA.use), eb = K.itemEval(Vb, seat, bestA.use), e0 = K.itemEval(Vb, seat, []);
      return { sev: Math.max(0, Math.min(60, Math.round((eb - em) * 10))), why: `이 대결의 기대값 (말 값 · 아이템 값 뺌) 내 선택 ${em.toFixed(1)} · 고급 AI ${eb.toFixed(1)} · 안 쓰면 ${e0.toFixed(1)}`, my, best };
    }
    if (Vb.phase === "revive" && myA.t === "revive") {
      const val = a => (a.skip ? 0 : K.VAL[Vb.pcs[a.id].v] || 0), d = val(bestA) - val(myA);
      return { sev: Math.max(0, Math.min(45, Math.round(d * 12))), why: `되살린 말 값 ${val(myA).toFixed(1)} · 고급 AI ${val(bestA).toFixed(1)} (합 · 차 대결 이길 확률로 매긴 값)`, my, best };
    }
    if (Vb.phase === "setup" && myA.t === "setup" && Array.isArray(myA.lay)) {
      const L = myA.lay, kk = L.indexOf(KING), y = (kk / 3) | 0, d = kk % 3;
      const nb = [[y, d - 1], [y, d + 1], [y - 1, d], [y + 1, d]].filter(([yy, dd]) => yy >= 0 && yy < 6 && dd >= 0 && dd < 3);
      const open = nb.filter(([yy, dd]) => L[yy * 3 + dd] !== MINE).length;
      return { sev: Math.min(35, open * 9 + d * 6), why: `왕 둘레 ${nb.length}칸 중 지뢰가 아닌 칸 ${open}곳 · 왕 깊이 ${d === 0 ? "맨 끝 줄" : d === 1 ? "가운데 줄" : "앞줄"}`, my, best };
    }
    return { sev: 0, why: "", my, best };
  }

  function result(V, me) {
    const nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    const R = V.res || {};
    const head = R.w == null ? "" : R.w < 0 ? "🤝 무승부" : me >= 0 && R.w === me ? "🏆 내가 이겼어요" : `🏆 ${nm(R.w)} 승리`;
    const fights = (V.log || []).filter(e => e.k === "fight").length;
    return `${head} — ${R.w >= 0 ? WHY[R.why] || "" : WHY.count}<br>${V.ply}수 · 대결 ${fights}번 · 남은 말 ${nm(0)} ${V.score[0]} : ${nm(1)} ${V.score[1]}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const mkV = list => ({ pcs: list.map(([x, y, s, v, rev], i) => ({ id: i, s, v, c: K.at(x, y), out: false, rev: !!rev, mv: 1 })) });
    const tb = x => `<div class="nc-tut">${x}</div>`;
    const full = mkV([[0, 0, 0, 12], [1, 0, 0, MINE], [0, 1, 0, MINE], [2, 0, 0, 10], [2, 2, 0, 1], [2, 3, 0, 5], [1, 4, 0, MINE], [2, 5, 0, 9], [1, 2, 0, 3], [0, 3, 0, 7], [1, 1, 0, 2], [2, 1, 0, 6], [1, 3, 0, 8], [0, 5, 0, 4],
      [8, 0, 1, null], [7, 0, 1, null], [6, 1, 1, null], [6, 2, 1, null], [7, 2, 1, null], [8, 2, 1, null], [6, 3, 1, null], [7, 4, 1, null], [8, 4, 1, null], [6, 5, 1, null], [7, 5, 1, null], [8, 5, 1, null], [7, 1, 1, null], [8, 3, 1, null]]);
    const MOVE = mkV([[3, 2, 0, 6], [5, 1, 1, null]]);
    const mvDst = {}; { const g = Array(W * H).fill(-1); g[K.at(3, 2)] = 0; g[K.at(5, 1)] = 1; for (const t of K.destOf(g, 0, K.at(3, 2), 6)) mvDst[t] = "m"; }
    const WIN = mkV([[7, 2, 0, KING], [5, 4, 1, 3, 1], [3, 1, 0, 8]]);
    const SPEC = mkV([[3, 1, 0, 4], [4, 1, 1, MINE, 1], [3, 3, 0, 9, 1], [4, 3, 1, KING, 1], [6, 3, 0, 2]]);
    const T0 = [[3, 1, 0, 7], [5, 0, 1, 2, 1], [5, 2, 1, 4, 1]];
    const GOAL = K.at(4, 2), REG = [2, 6, 0, 2];
    return [
      { tag: "STEP 1 · 목표", title: "상대 왕을 잡아요", body: "상대 <b>👑 왕</b>을 잡거나, 왕 빼고 상대 말을 <b>모두</b> 잡거나, 내 왕이 상대 진영 <b>맨 끝 줄</b>에 닿으면 승리 — 상대가 움직일 수 없어도 이겨요.",
        boardHtml: tb(boardHtml(WIN, { persp: 0, region: [2, 8, 0, 5], ft: new Set([K.at(8, 2)]) })), ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "9 × 6 판 · 말 14개", body: "각자 숫자 <b>1~10</b> · <b>💣 지뢰 3</b> · <b>👑 왕 1</b>. 내 진영(3줄 × 6칸)에 <b>몰래</b> 놓고 뒤집어 둬요. 빨간 선은 <b>마이너스 표시</b> 18개.",
        boardHtml: tb(boardHtml(full, { persp: 0 })), ms: 6000 },
      { tag: "STEP 3 · 진행", title: "번갈아 한 칸씩", body: "말 하나를 <b>양옆 · 앞 대각선 1칸</b>, 또는 <b>앞으로 1~2칸</b> (뛰어넘기 X). 뒤로는 못 가고 💣 지뢰는 못 움직여요.",
        boardHtml: tb(boardHtml(MOVE, { persp: 0, region: [1, 7, 0, 4], sel: K.at(3, 2), dst: mvDst })), ms: 6000 },
      { tag: "STEP 4 · 직접", title: "대결: 합이 10 이상이면 큰 수", body: "움직인 뒤 상대 말과 <b>앞뒤 · 양옆</b>으로 닿으면 대결! 두 수의 합이 <b>10 이상이면 큰 수</b>, <b>10 미만이면 작은 수</b>가 이겨요. 빨간 선을 사이에 두면 합 대신 <b>차이</b>로. 내 <b>7</b>로 상대 <b>4</b>를 잡는 칸을 눌러요.",
        interactive: { hint: "👆 4 를 잡는 칸", doneText: "✅ 7 + 4 = 11 → 10 이상이라 큰 수 7 승!" },
        render(stage, ctrl) {
          let done = false, msg = "초록 점 = 갈 수 있는 칸";
          const V0 = () => mkV(T0);
          let V = V0();
          const dst = {}; { const g = Array(W * H).fill(-1); V.pcs.forEach(p => { g[p.c] = p.id; }); for (const t of K.destOf(g, 0, K.at(3, 1), 7)) dst[t] = K.N4[t].some(j => g[j] >= 1) ? "f" : "m"; }
          const draw = (ft) => { stage.innerHTML = `<div class="nc-tut">${boardHtml(V, { persp: 0, region: REG, sel: done ? -1 : K.at(3, 1), dst: done ? null : dst, tp: done ? -1 : GOAL, ft })}<div class="nc-tmsg">${msg}</div></div>`; };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-c]"); if (!t) return;
            const c = +t.dataset.c; if (!dst[c]) return;
            const nb = V.pcs.filter(p => p.s === 1 && K.N4[c].includes(p.c));
            if (!nb.length) { msg = `${CN(c)} — 아무와도 안 닿아요. 4 옆 칸을 골라 봐요`; ctrl.sfx("tap"); draw(); return; }
            const res = nb.map(p => { const t2 = K.isMinus(c, p.c) ? "minus" : "sum", r = K.duel(7, 7, p.v, p.v, t2), k = t2 === "minus" ? Math.abs(7 - p.v) : 7 + p.v; return { p, t2, r, k }; });
            const ft = new Set([c].concat(nb.map(p => p.c)));
            if (res.length === 1 && res[0].p.v === 4 && !res[0].r[0]) { done = true; msg = `🎉 7 + 4 = <b>11</b> → 10 이상이라 <b>큰 수 7</b> 승! 상대 4 제거`; V.pcs = V.pcs.filter(p => p !== res[0].p); V.pcs[0].c = c; ctrl.sfx("win"); draw(ft); ctrl.complete(); return; }
            msg = res.map(x => `${x.t2 === "minus" ? `⊖ 차 ${x.k}` : `합 ${x.k}`} (7 vs ${x.p.v}) → ${x.r[0] && x.r[1] ? "둘 다 제거" : x.r[0] ? "7 제거" : `${x.p.v} 제거`}`).join(" · ") + " — 7 이 살아서 4 만 잡는 칸은?";
            ctrl.sfx("tap"); V = V0(); draw(ft);
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "넷 중 하나면 승리", body: "① 상대가 말을 못 움직임 (방송: 60초 안에) ② 상대 왕을 잡음 ③ 왕 빼고 상대 말을 다 잡음 ④ 내 왕이 상대 진영 맨 끝 줄에 닿음.",
        boardHtml: tb(boardHtml(WIN, { persp: 0, region: [2, 8, 0, 5] })), ms: 5600 },
      { tag: "STEP 6 · 특수 규칙", title: "지뢰 · 왕 · 되살리기 · 아이템", body: "💣 지뢰와 닿으면 <b>둘 다 제거</b>. 👑 왕은 닿는 순간 잡혀요 (왕끼리는 그대로). 대결한 말은 <b>공개</b>. 상대 끝 줄에 닿은 말 대신 잃은 말 하나를 <b>되살려요</b>. 결승 아이템 <b>+1 · −1 · BLIND</b>(결과만 공개)는 대결 전에 써요.",
        boardHtml: tb(boardHtml(SPEC, { persp: 0, region: [2, 7, 0, 4], ft: new Set([K.at(3, 1), K.at(4, 1), K.at(3, 3), K.at(4, 3)]) })), ms: 7000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-numchess"] = {
    name: "숫자장기", emoji: "♟️", short: "숨긴 숫자 말로 하는 장기 — 합이 10 이상이면 큰 수, 미만이면 작은 수가 이겨요", min: 2, max: 2, defN: 2, board: false, fitCoach: true,
    opts: [
      { k: "items", label: "결승 아이템", items: [[1, "+1 · −1 · BLIND (방송)"], [0, "없음"]], def: 1 },
      { k: "limit", label: "시간 제한", items: [[0, "없음"], [60, "60초 (방송)"]], def: 0 },
      { k: "marks", label: "안 움직인 말 표시", items: [[0, "끔 (방송)"], [1, "켬 (연습)"]], def: 0 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 상대 <b>👑 왕</b>을 잡거나 · 왕 빼고 상대 말을 모두 잡거나 · 내 왕이 상대 진영 <b>맨 끝 줄</b>에 닿거나 · 상대가 못 움직이면 승리 (결승 1회전)",
      "준비물: 가로 9 × 세로 6 판 (<b>마이너스 표시</b> 18개) · 각자 말 14개 — 숫자 <b>1~10</b> · <b>💣 지뢰 3</b> · <b>👑 왕 1</b>, 내 진영(3줄 × 6칸)에 몰래 놓고 뒤집어 둠",
      "진행: 번갈아 말 하나를 <b>양옆 · 앞 대각선 1칸</b>, <b>앞으로 1~2칸</b> (뒤로 · 뛰어넘기 X · 지뢰는 못 움직임). 움직인 뒤 상대 말과 앞뒤 · 양옆으로 닿으면 <b>대결</b> — 두 수의 합이 <b>10 이상이면 큰 수</b>, <b>10 미만이면 작은 수</b> 승 · 같은 수는 둘 다 제거 · 마이너스 표시를 사이에 두면 합 대신 <b>차이</b>로 · 여럿과 닿으면 동시에",
      "승패: ① 상대가 말을 못 움직임 ② 상대 왕을 잡음 ③ 왕 빼고 상대 말을 다 잡음 ④ 내 왕이 상대 진영 맨 끝 줄에 닿음",
      "특수: 💣 지뢰와 닿으면 둘 다 제거 · 👑 왕은 닿는 순간 잡힘 (왕끼리는 그대로) · 대결한 말은 공개 · 상대 진영 맨 끝 줄에 닿은 말 대신 잃은 말 하나를 숫자 공개로 되살림 · 결승 아이템 <b>+1 · −1 · BLIND</b>(상대는 결과만 봄)는 대결 전에 씀 · 방송의 60초 제한은 옵션 · <b>200수</b>가 넘으면 남은 말 수로 (끝없는 판 방지 상한)",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : V.phase === "setup" ? "몰래 배치" : V.phase === "item" ? "⚔ 대결 아이템" : V.phase === "revive" ? "↺ 되살리기" : `${V.ply}수 · 말 ${V.score[0]} : ${V.score[1]}`),
    chip: (V, i) => ({ t: V.phase === "setup" && !V.over ? (V.ready[i] ? "배치 끝" : "배치 중") : `말 ${V.score[i]}${V.opt && V.opt.items ? ` · 🎒${["p", "m", "b"].filter(k => V.items[i][k] > 0).length}` : ""}`, on: !V.over && (V.needs || []).includes(i), out: !!(V.over && V.res && V.res.w >= 0 && V.res.w !== i) }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "normal", rnd),
  };
})();

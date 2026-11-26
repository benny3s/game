/* 베니 서바이벌 · 기억의 미로 — 화면 (7×7 판 · 보이지 않는 벽 · 칸을 차례로 눌러 3칸 길 → 이동 · 더블찬스 · 선생님 단계 힌트 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const K = window.SVCores["gn-memmaze"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const N = K.N, CN = K.cellName, EN = K.edgeName;
  const COL = ["#38bdf8", "#fb923c"], DOT = ["🔵", "🟠"];
  const SRC = "방송: 더 지니어스 블랙가넷 (시즌 3) · 8화 데스매치 (김유현 vs 신아영) · 9화 데스매치 (하연주 vs 김유현) — 디글 클래식 「[#더지니어스3] 기억의 미로」 규칙 설명 · 나무위키 「더 지니어스:블랙 가넷/8화 · 9화」 이동 기록";
  const DIFF = "방송 판 그림을 못 구해 미로는 판마다 새로 만들어요 (벽 32개 · 이어진 미로 · 두 사람의 최단 거리 같음 16~20칸, 8화 판은 16칸) · 너무 막혀 오래 걸리는 미로는 뺐어요 (방송처럼 25턴 안팎에 끝나게) · '9화 기록 판'(옵션)은 9화 이동 기록 49턴의 성공 · 실패 자리 36곳에 맞추고 나머지 벽은 우리가 채웠어요 · 선은 무작위 (방송은 데스매치에 지목된 사람이 출발점과 선을 고름) · 1번 자리가 왼쪽 출발 · 상대가 가는 길과 부딪힌 자리는 서로 보여요 (방송처럼 같은 판을 지켜봄) · 판에는 바로 앞 차례의 길만 남고 그 전 것은 기억해야 해요 · '기억 도우미'(옵션)는 알아낸 벽 · 지나간 칸 사이를 판에 그려요 (방송은 바닥 표시 금지) · 각자 60턴이 지나면 지금 자리에서 도착점까지 실제 거리가 짧은 쪽 승 (끝없는 판을 막는 상한)";
  const CSS = `
.mz-st{flex:none;min-height:40px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.mz-st b{color:#fde68a}
.mz-st .c0{color:${COL[0]}}.mz-st .c1{color:${COL[1]}}
.mz-st .bad{color:#fca5a5}.mz-st .ok{color:#86efac}
.mz-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.mz-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.mz-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.mz-res.mid{color:#e2e8f0;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.45)}
.mz-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.mz-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
@media (max-width:430px){.mz-wrap{justify-items:end}}
.mz-board{position:relative;width:min(100%,380px);aspect-ratio:1;border-radius:12px;background:radial-gradient(circle at 50% 45%,#1b2a4a,#0b1224 78%);box-shadow:inset 0 0 0 2px rgba(148,163,184,.45);overflow:hidden}
.mz-board svg{display:block;width:100%;height:100%;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.mz-board .gl{stroke:rgba(148,163,184,.28);stroke-width:.25;stroke-dasharray:.9 .9}
.mz-board .fr{fill:none;stroke:rgba(203,213,225,.7);stroke-width:.7}
.mz-board .lb{fill:rgba(203,213,225,.6);font:700 2.4px var(--round,sans-serif);text-anchor:middle;dominant-baseline:central}
.mz-board .cl{font:800 2.2px var(--round,sans-serif);text-anchor:middle;dominant-baseline:central}
.mz-board .wl{stroke:#ef4444;stroke-width:1.1;stroke-linecap:round}
.mz-board .wa{stroke:rgba(239,68,68,.55);stroke-width:.8;stroke-linecap:round}
.mz-board .op{stroke:rgba(134,239,172,.42);stroke-width:.7;stroke-linecap:round}
.mz-board .tr{fill:none;stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round;opacity:.75}
.mz-board .tr.nw{stroke-dasharray:100;stroke-dashoffset:100;animation:mzdraw .9s ease-out forwards}
.mz-board .xx{fill:#ef4444;font:900 4.4px var(--round,sans-serif);text-anchor:middle;dominant-baseline:central}
.mz-board .xx.nw{opacity:0;animation:mzpop .35s .85s forwards}
.mz-board .pl{fill:none;stroke:#fde68a;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2 1.2}
.mz-board .pn{fill:#fde68a;stroke:#78350f;stroke-width:.25}
.mz-board .pt{fill:#422006;font:900 2.6px var(--round,sans-serif);text-anchor:middle;dominant-baseline:central}
.mz-board .nx{fill:rgba(253,230,138,.14);stroke:rgba(253,230,138,.8);stroke-width:.45;stroke-dasharray:1.2 .8}
.mz-board .tk{stroke:#0b1224;stroke-width:.6}
.mz-board .tk.me{stroke:#fff;stroke-width:.75}
.mz-board .hit{fill:transparent;cursor:pointer}
@keyframes mzdraw{to{stroke-dashoffset:0}}
@keyframes mzpop{to{opacity:1}}
.mz-act{flex:none;display:flex;gap:6px}
.mz-act button{flex:1;min-width:0;height:48px;border-radius:13px;border:0;font:900 14.5px var(--round);cursor:pointer;padding:0 6px;white-space:nowrap}
.mz-act .go{flex:1.35;background:linear-gradient(#4ade80,#16a34a);color:#052e16}
.mz-act .go:disabled{opacity:.38;cursor:default}
.mz-act .sub{background:rgba(255,255,255,.08);color:var(--ink,#e5e7eb);border:1px solid rgba(255,255,255,.16)}
.mz-act .sub:disabled{opacity:.38;cursor:default}
.mz-act .db.on{background:linear-gradient(#fde047,#f59e0b);color:#422006;border-color:#fde68a}
.mz-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.mz-tut .mz-board{width:min(100%,250px)}
.mz-tut .mz-act{width:min(100%,250px)}
.mz-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.mz-tmsg b{color:#fde68a}
@media (max-height:650px){.mz-act button{height:46px}.mz-st{min-height:36px;font-size:12px}}
.sv-coachfit .mz-st{min-height:30px;font-size:11.5px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  // 받침 (숫자 · 영문 뒤: 0영 1일 3삼 6육 7칠 8팔 10십 · L엘 M엠 N엔 R알 = 받침 있음) · 으로/로 는 ㄹ 받침이면 '로'
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678lmnr]$/i.test(s); };
  const rieul = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 === 8; return /[178lr]$/i.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eun = w => (hasFinal(w) ? "은" : "는"), eul = w => (hasFinal(w) ? "을" : "를"), ro = w => (hasFinal(w) && !rieul(w) ? "으로" : "로");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const pathTxt = (p, sep) => p.map(CN).join(sep || " → ");
  const failEdge = ev => (ev && ev.fail >= 0 ? K.eid(ev.fail ? ev.path[ev.fail - 1] : ev.from, ev.path[ev.fail]) : -1);

  // ── 행동 글 ──
  function actText(a) {
    if (!a || a.t !== "go" || !Array.isArray(a.path)) return "";
    return `${pathTxt(a.path)}${a.dbl ? " (⚡ 더블찬스)" : ""}`;
  }
  // 한 차례 결과 글 (who = 이미 escape 한 주어)
  function evText(ev, who) {
    if (!ev) return "";
    const p = `${CN(ev.from)} → ${pathTxt(ev.path)}${ev.dbl ? " ⚡" : ""}`;
    if (ev.goal) return `${who} ${p} — 🏁 도착!`;
    if (ev.fail >= 0) return `${who} ${p} — <span class="bad">💥 ${EN(failEdge(ev))} 사이 벽! 출발점으로</span>`;
    return `${who} ${p} — <span class="ok">무사히 ${ev.path.length}칸</span>`;
  }

  // ── 판 그리기 ── o: { me, walls, wallCls, openE, trails:[{ev,nw}], plan:{from,path}, nexts, hits, tp, goalMark }
  const U = 10, ML = 4, MT = 1, SZ = ML + N * U + 1, SH = MT + N * U + 4;
  const cx = i => ML + K.X(i) * U + U / 2, cy = i => MT + (N - 1 - K.Y(i)) * U + U / 2;
  function edgeSeg(e) {
    const [a, b] = K.ENDS[e];
    if (K.Y(a) === K.Y(b)) { const x = ML + (K.X(a) + 1) * U, y = MT + (N - 1 - K.Y(a)) * U; return [x, y + 0.9, x, y + U - 0.9]; }
    const y = MT + (N - 1 - K.Y(a)) * U, x = ML + K.X(a) * U; return [x + 0.9, y, x + U - 0.9, y];
  }
  const edgeMid = e => { const s = edgeSeg(e); return [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]; };
  function boardSvg(V, o) {
    o = o || {};
    let h = `<rect x="${ML}" y="${MT}" width="${N * U}" height="${N * U}" fill="rgba(15,23,42,.35)"/>`;
    for (let k = 1; k < N; k++) { const z = k * U; h += `<line class="gl" x1="${ML + z}" y1="${MT}" x2="${ML + z}" y2="${MT + N * U}"/><line class="gl" x1="${ML}" y1="${MT + z}" x2="${ML + N * U}" y2="${MT + z}"/>`; }
    for (let k = 0; k < N; k++) h += `<text class="lb" x="${ML + k * U + U / 2}" y="${MT + N * U + 2}">${K.LETX[k]}</text><text class="lb" x="${ML / 2}" y="${MT + (N - 1 - k) * U + U / 2}">${k + 1}</text>`;
    // 출발 · 도착
    for (let s = 0; s < 2; s++) {
      for (const [c, t] of [[K.S[s], "출발"], [K.G[s], "도착"]]) {
        const x = ML + K.X(c) * U, y = MT + (N - 1 - K.Y(c)) * U;
        h += `<rect x="${x + 0.4}" y="${y + 0.4}" width="${U - 0.8}" height="${U - 0.8}" rx="1.4" fill="${COL[s]}" fill-opacity="${t === "도착" ? 0.2 : 0.13}" stroke="${COL[s]}" stroke-opacity=".55" stroke-width=".35"/><text class="cl" x="${x + U / 2}" y="${y + (t === "도착" ? 2.2 : U - 2.2)}" fill="${COL[s]}">${t === "도착" ? "🏁 도착" : "출발"}</text>`;
      }
    }
    if (o.goalMark != null) { const c = o.goalMark; h += `<text x="${cx(c)}" y="${cy(c)}" font-size="5" text-anchor="middle" dominant-baseline="central">⭐</text>`; }
    if (o.openE) for (const e of o.openE) { const [a, b] = K.ENDS[e]; h += `<line class="op" x1="${cx(a)}" y1="${cy(a)}" x2="${cx(b)}" y2="${cy(b)}"/>`; }
    if (o.walls) for (const e of o.walls) { const s = edgeSeg(e); h += `<line class="${o.wallCls || "wl"}" data-w="${e}" x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}"/>`; }
    // 바로 앞 차례의 길 (자리 색) · 부딪힌 자리 ✖
    for (const T of o.trails || []) {
      const ev = T.ev; if (!ev) continue;
      const ok = ev.fail >= 0 ? ev.path.slice(0, ev.fail) : ev.path;
      const pts = [ev.from].concat(ok).map(c => `${cx(c).toFixed(1)},${cy(c).toFixed(1)}`);
      let tail = "";
      if (ev.fail >= 0) { const m = edgeMid(failEdge(ev)); pts.push(`${m[0].toFixed(1)},${m[1].toFixed(1)}`); tail = `<text class="xx${T.nw ? " nw" : ""}" data-x="${ev.s}" x="${m[0]}" y="${m[1]}">✖</text>`; }
      if (pts.length > 1) h += `<polyline class="tr${T.nw ? " nw" : ""}" data-tr="${ev.s}" pathLength="100" points="${pts.join(" ")}" stroke="${COL[ev.s]}"/>`;
      h += tail;
    }
    // 고른 길
    if (o.plan && o.plan.path.length) {
      const pts = [o.plan.from].concat(o.plan.path).map(c => `${cx(c)},${cy(c)}`).join(" ");
      h += `<polyline class="pl" points="${pts}"/>`;
      const cnt = {};
      o.plan.path.forEach((c, j) => { const k = cnt[c] = (cnt[c] || 0) + 1, dx = (k - 1) * 2.6 - 1.6, dy = -2.6; h += `<circle class="pn" data-pn="${j}" cx="${cx(c) + dx}" cy="${cy(c) + dy}" r="1.75"/><text class="pt" x="${cx(c) + dx}" y="${cy(c) + dy}">${j + 1}</text>`; });
    }
    if (o.nexts) for (const c of o.nexts) { const x = ML + K.X(c) * U, y = MT + (N - 1 - K.Y(c)) * U; h += `<rect class="nx" data-nx="${c}" x="${x + 0.8}" y="${y + 0.8}" width="${U - 1.6}" height="${U - 1.6}" rx="1.2"/>`; }
    // 말 (같은 칸이면 살짝 비켜서)
    const same = V.pos[0] === V.pos[1];
    for (let s = 0; s < 2; s++) {
      const c = V.pos[s], dx = same ? (s ? 1.9 : -1.9) : 0;
      h += `<circle class="tk${o.me === s ? " me" : ""}" data-tk="${s}" data-at="${c}" cx="${cx(c) + dx}" cy="${cy(c) + 1}" r="2.7" fill="${COL[s]}"/>`;
    }
    h += `<rect class="fr" x="${ML}" y="${MT}" width="${N * U}" height="${N * U}"/>`;
    if (o.hits) for (let i = 0; i < K.NC; i++) { const x = ML + K.X(i) * U, y = MT + (N - 1 - K.Y(i)) * U; h += `<rect class="hit" x="${x}" y="${y}" width="${U}" height="${U}" data-c="${i}"${o.tp === i ? ' data-tp="1"' : ""}><title>${CN(i)}</title></rect>`; }
    return `<div class="mz-board" aria-label="기억의 미로 판 7×7"><svg viewBox="0 0 ${SZ} ${SH}" xmlns="http://www.w3.org/2000/svg">${h}</svg></div>`;
  }

  // ── 이 화면의 선택 ──
  const S = { pk: "", path: [], dbl: 0, sent: 0, stage: null, ctx: null, V: null, seen: -1, g: null };
  const need = () => (S.dbl ? K.DSTEP : K.STEP);
  const lastGo = V => { for (let k = V.log.length - 1; k >= 0; k--) if (V.log[k].k === "go") return V.log[k]; return null; };
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return;
    if (S.sent && Date.now() - S.sent < 1200) return;       // 두 번 탭 막기
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); }
    else { S.path = []; S.dbl = 0; }
  }
  function fitBoard(stage) {
    const w = stage.querySelector(".mz-wrap"), b = w && w.firstElementChild; if (!b) return;
    b.style.width = b.style.height = "";
    const inset = window.innerWidth <= 430 && !w.closest(".mz-tut") ? 18 : 0;   // 왼쪽 가장자리 🐞 버튼이 1줄 번호를 가리지 않게
    const sz = Math.floor(Math.min(w.clientWidth - inset, (w.clientHeight || 9999) * SZ / SH, 380));
    if (sz > 80) { b.style.width = sz + "px"; b.style.height = Math.floor(sz * SH / SZ) + "px"; }
  }
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, local = ctx.mode === "local", canAct = !!ctx.canAct;
    const pk = `${ctx.g}|${V.turns.join(",")}|${V.turn}|${V.over ? 1 : 0}`;
    if (pk !== S.pk) { S.pk = pk; S.path = []; S.dbl = 0; S.sent = 0; }
    // 새 차례 결과: 길을 그려 가며 보여 주고 소리 (처음 그릴 때 · 복기 · 빠르게는 그냥)
    const LG = lastGo(V), lastSeq = V.log.length ? V.log[V.log.length - 1].i : -1;
    if (S.g !== ctx.g) { S.g = ctx.g; S.seen = lastSeq; }
    const fresh = LG && LG.i > S.seen && !ctx.fast;
    if (LG && LG.i > S.seen) { if (ctx.sfx) ctx.sfx(LG.goal ? "win" : LG.fail >= 0 ? "bad" : "pop"); }
    S.seen = Math.max(S.seen, lastSeq);
    const isMe = i => !watch && !local && i === me;
    const nm = i => (isMe(i) ? "나" : nameOf(ctx, i));
    const subj = i => (isMe(i) || nameOf(ctx, i) === "나" ? "내가" : `<span class="c${i}">${esc(nameOf(ctx, i))}</span>${iga(nameOf(ctx, i))}`);
    const showAll = V.over || watch;
    const help = !!(V.opt && V.opt.help);
    const bo = { me: watch || local ? -1 : me, trails: [0, 1].map(s => ({ ev: V.last[s], nw: fresh && V.last[s] && V.last[s].i === LG.i })) };
    if (showAll && V.walls) { bo.walls = V.walls; bo.wallCls = V.over ? "wl" : "wa"; }
    else if (help) { bo.walls = V.known.wall; bo.openE = V.known.open; }
    let st = "", actH = "";
    const lastTxt = LG ? evText(LG, subj(LG.s)) : "";
    if (V.over) {
      const R = V.res || {}, w = R.w;
      const cls = w < 0 ? "mid" : watch || local || w === me ? "ok" : "no";
      const head = w < 0 ? `🤝 무승부 — 둘 다 ${K.MAXT}턴, 도착점까지 ${R.d ? R.d[0] : "?"}칸` : R.why === "cap" ? `⏱ ${K.MAXT}턴 끝 — ${subj(w)} 도착점에 더 가까워요 (${R.d[w]}칸 vs ${R.d[1 - w]}칸)` : `🏁 ${subj(w)} 먼저 도착! (${V.turns[w]}턴 · 실패 ${V.fails[w]}번)`;
      st = `<div class="mz-res ${cls}">${head}<small>벽 32개 공개 — 빨간 줄 · 최단 거리 ${V.dist}칸${!watch && !local && me >= 0 && w >= 0 ? (w === me ? " · 내가 이겼어요" : " · 졌어요") : ""}</small></div>`;
    } else if (V.cur === me && canAct) {
      const from = V.pos[me], L = need(), end = S.path.length ? S.path[S.path.length - 1] : from;
      const done = S.path.length === L || (S.path.length > 0 && end === K.G[me]);
      bo.plan = { from, path: S.path };
      bo.hits = true;
      if (!done) bo.nexts = K.NB[end];
      const head = `<b>${local ? esc(nm(me)) + " 차례" : "내 차례"}</b> <span class="c${me}">${DOT[me]}</span> ${CN(from)}에서 ${L}칸${S.dbl ? " (⚡ 더블찬스)" : ""}`;
      st = S.path.length ? `<span>${head}<br>${pathTxt([from].concat(S.path))}${done ? " — '이동'으로 확정 (마지막 칸을 다시 누르면 지워요)" : ` · ${S.path.length}/${L}`}</span>`
        : `<span>${lastTxt ? lastTxt + "<br>" : ""}${head} — 지나갈 칸을 차례로 눌러요</span>`;
      const dl = V.dbl[me];
      actH = `<div class="mz-act"><button type="button" class="sub db${S.dbl ? " on" : ""}" data-a="dbl"${dl > 0 ? "" : " disabled"}>⚡ 더블 ${dl}</button><button type="button" class="sub" data-a="clr"${S.path.length ? "" : " disabled"}>↩ 다시</button><button type="button" class="go" data-a="go"${done ? "" : " disabled"}>이동 ▶ ${S.path.length}/${L}</button></div>`;
    } else {
      st = `<span>${lastTxt ? lastTxt + "<br>" : ""}${V.cur >= 0 ? `<span class="c${V.cur}">${DOT[V.cur]} ${esc(nm(V.cur))}</span> 차례 · 가는 길과 부딪히는 자리를 외워 두세요` : ""}${watch && V.walls ? " · 구경: 벽이 흐리게 보여요" : ""}</span>`;
    }
    stage.innerHTML = `<div class="mz-st">${st}</div><div class="mz-wrap">${boardSvg(V, bo)}</div>${actH}`;
    fitBoard(stage);
    if (window.ResizeObserver) {
      if (S.ro) S.ro.disconnect();
      const w = stage.querySelector(".mz-wrap"); let last = w ? w.clientHeight : 0;
      if (w) { S.ro = new ResizeObserver(() => { if (Math.abs(w.clientHeight - last) > 1 || !w.firstElementChild.style.width) { last = w.clientHeight; fitBoard(stage); } }); S.ro.observe(w); }
    }
    stage.onclick = e => {
      const t = e.target.closest("[data-c],button"); if (!t || t.disabled) return;
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.over || VV.cur !== c.me) return;
      const m = c.me, from = VV.pos[m], L = need(), end = S.path.length ? S.path[S.path.length - 1] : from;
      const done = S.path.length === L || (S.path.length > 0 && end === K.G[m]);
      if (t.dataset.a === "dbl") { if (VV.dbl[m] > 0) { S.dbl = S.dbl ? 0 : 1; if (!S.dbl && S.path.length > K.STEP) S.path.length = K.STEP; if (c.sfx) c.sfx("tap"); render(stage, VV, c); } return; }
      if (t.dataset.a === "clr") { S.path = []; if (c.sfx) c.sfx("tap"); render(stage, VV, c); return; }
      if (t.dataset.a === "go") { if (done) send({ t: "go", path: S.path.slice(), dbl: S.dbl }); return; }
      if (t.dataset.c == null) return;
      const cell = +t.dataset.c;
      if (S.path.length && cell === end) { S.path.pop(); if (c.sfx) c.sfx("tap"); render(stage, VV, c); return; }
      if (done) { if (c.toast) c.toast(`${L}칸을 다 골랐어요 — '이동'을 누르거나 마지막 칸을 눌러 지워요`); return; }
      if (K.eid(end, cell) < 0) { if (c.toast) c.toast("이어진 칸(가로 · 세로 한 칸)만 골라요 — 대각선 X"); return; }
      S.path.push(cell); if (c.sfx) c.sfx("tap"); render(stage, VV, c);
    };
  }

  // ── 선생님 (완벽히 기억한다고 보고 · 💡 는 단계 힌트: 처음엔 첫 칸 방향, '한 번 더' 로 길 전체) ──
  const pct = x => `${Math.round(x * 100)}%`;
  function coachFull(V, me, since, names, full) {
    void since;
    if (!(me >= 0 && me < 2)) me = V.cur >= 0 ? V.cur : 0;
    const op = 1 - me;
    const raw = i => (i === me ? "나" : String((Array.isArray(names) && names[i]) || "상대"));
    const nmx = i => esc(raw(i));
    const Kh = K.memory(V, me, "hard"), oR = K.knownRoute(Kh, V.pos[op], K.G[op]), myR = K.knownRoute(Kh, V.pos[me], K.G[me]);
    const kn = V.known || { open: [], wall: [] };
    const oL = V.last[op];
    const opp = `${nmx(op)}${eun(raw(op))} ${CN(V.pos[op])} · 실패 ${V.fails[op]}번 · 더블찬스 ${V.dbl[op]}번 남음 · 도착점까지 아는 길 ${oR.n >= 0 ? `${oR.n}칸${oR.n <= (V.dbl[op] > 0 ? K.DSTEP : K.STEP) ? " — ⚠ 다음 차례에 도착할 수 있어요" : ""}` : "아직 안 이어짐"}${oL ? ` · 지난 차례 ${oL.fail >= 0 ? `${EN(failEdge(oL))} 사이 벽에 부딪힘` : `${CN(oL.from)} → ${CN(oL.path[oL.path.length - 1])}`}` : ""}`;
    const mine = `나는 ${CN(V.pos[me])} · ${V.turns[me]}턴 · 실패 ${V.fails[me]}번 · 더블찬스 ${V.dbl[me]}번 · 지금까지 밝혀진 벽 ${kn.wall.length}개 / 32 · 지나간 칸 사이 ${kn.open.length}곳 · 아는 길만으로 도착까지 ${myR.n >= 0 ? `${myR.n}칸` : "아직 안 이어짐"}.`;
    if (V.over) {
      const R = V.res || {};
      return { opp, mine, rec: "끝났어요.", why: `${R.w < 0 ? "무승부" : `${nmx(R.w)} 승리`} · 최단 거리 ${V.dist}칸 · 벽 32개가 판에 공개됐어요 (빨간 줄).`, more: false };
    }
    if (V.cur !== me) {
      return { opp, mine, rec: `${nmx(op)} 차례를 기다려요.`, why: `${nmx(op)}${iga(raw(op))} 가는 길과 부딪히는 자리를 외워 두세요 — 9화 하연주처럼 상대가 찾은 길을 따라가도 돼요.`, more: false };
    }
    const A = K.analyze(V, me);
    if (!A) return { opp, mine, rec: "움직일 길이 없어요", why: "", more: false };
    const P = A.path, B = A.best, d0 = K.dirOf(V.pos[me], P[0]);
    const L = P.length, unk = B.unk;
    // 1단계는 칸 사이 이름 없이 숫자만 (어디가 위험한지까지 말하면 길이 다 보임) · 전체는 '한 번 더'
    const riskTxt = !unk ? "모두 아는 길 — 벽 걱정 없음"
      : full ? `처음 가는 칸 사이 ${unk}곳 (${B.unkE.map(e => `${EN(e)} 벽일 확률 ${pct(A.pe[e])}`).join(" · ")})`
        : `처음 가는 칸 사이 ${unk}곳 (벽일 확률 ${B.unkE.map(e => pct(A.pe[e])).join(" · ")})`;
    const tag = { dblGoal: "⚡ 더블찬스 6칸 안에 도착점이에요 — 지금 끝내요.", dbl: "⚡ 아는 길이 길게 이어져서 더블찬스로 한 번에 가요 (실패 걱정 없는 칸이 많을 때 쓰기 좋아요).", route: "", wander: "" }[A.why] || "";
    const hurry = A.threat ? ` ⚠ ${nmx(op)}${iga(raw(op))} 다음 차례에 도착할 수 있어서 위험해도 서둘러요.` : "";
    const rec = full
      ? `${pathTxt([V.pos[me]].concat(P))}${A.dbl ? " (⚡ 더블찬스)" : ""}${B.goal ? " — 🏁 도착" : ""}`
      : `첫 칸은 ${K.DIRK[d0]} (${CN(P[0])}) · ${L}칸 중 처음 가는 칸 사이 ${unk}곳${A.dbl ? " · ⚡ 더블찬스 써요" : ""}`;
    const why = full
      ? `${riskTxt}${unk ? " · 실패하면 출발점에서 다시" : ""}.`
      : `무사히 갈 확률 ${pct(B.alive)} — ${riskTxt}. 남은 벽 ${32 - A.nw}개를 모르는 칸 사이 ${A.nu}곳에 나눠 보고, 칸마다 이미 열린 길 수로 고쳐 쟀어요.${myR.n >= 0 && !unk ? ` 아는 길만으로 도착까지 ${myR.n}칸.` : ""} ${tag}${hurry}`.trim();
    return { opp, mine, rec, why, more: !full };
  }
  let HINT = { key: "", open: false, full: "" };
  function coach(V, me, since, names) {
    const key = `${V.pub}|${me}`;
    if (HINT.key !== key) HINT = { key, open: false, full: "" };
    const c = coachFull(V, me, since, names, HINT.open);
    if (c && c.more && !HINT.open) {
      const f = coachFull(V, me, since, names, true);
      HINT.full = `<b>${f.rec}</b> — ${f.why || ""}`;
      c.why = `${c.why || ""} <button type="button" class="mz-hbtn" data-mzhint style="margin:2px 4px 2px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(250,204,21,.55);background:rgba(250,204,21,.12);color:#fde68a;font:800 12.5px var(--round);cursor:pointer">💡 한 번 더 — 길 전체 보기</button>`;
    }
    if (c) delete c.more;
    return c;
  }
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-mzhint]");
    if (!b) return;
    e.preventDefault(); HINT.open = true;
    const sp = document.createElement("span"); sp.innerHTML = HINT.full; b.replaceWith(sp);
  }, true);

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA), best = actText(bestA);
    if (!Vb || Vb.over || !myA || !bestA || myA.t !== "go" || bestA.t !== "go") return { sev: 0, why: "", my, best };
    if (JSON.stringify(myA.path) === JSON.stringify(bestA.path) && !!myA.dbl === !!bestA.dbl) return { sev: 0, why: "고급 AI와 같은 길", my, best };
    const A = K.analyze(Vb, seat); if (!A) return { sev: 0, why: "", my, best };
    const m = A.eval(myA.path), b = A.eval(bestA.path);
    if (m.goal && m.alive > 0.999) return { sev: 0, why: "아는 길로 도착 — 이기는 길", my, best };
    if (m.wallHit >= 0) {
      // 언제 · 누가 부딪힌 벽인지
      let who = "", ago = 0; const F = K.factsOf(Vb.log).F, nGo = K.factsOf(Vb.log).nGo;
      for (const f of F) if (f.e === m.wallHit && f.w) { who = f.s === seat ? "내가" : "상대가"; ago = nGo - f.k; }
      return { sev: 92, why: who ? `${EN(m.wallHit)} 사이는 ${ago}차례 전에 ${who} 부딪힌 벽이었어요 — 기억했다면 피할 수 있었어요 (고급 AI는 ${best})` : `${EN(m.wallHit)} 사이는 둘레에서 밝혀진 길 · 남은 벽 수로 보면 확실히 벽이었어요 (고급 AI는 ${best})`, my, best };
    }
    if (b.goal && b.alive > 0.999 && !m.goal) return { sev: 85, why: `아는 길로 바로 도착할 수 있었어요 — 고급 AI는 ${best}`, my, best };
    const dE = m.E - b.E;
    const sev = Math.max(0, Math.min(80, Math.round(dE * 5)));
    const dblNote = myA.dbl && !bestA.dbl ? " · 더블찬스를 모르는 길에 쓰면 실패할 때 아까워요" : !myA.dbl && bestA.dbl ? " · 아는 길이 길어 더블찬스로 한 번에 갈 수 있었어요" : "";
    return { sev, why: `무사히 갈 확률 내 길 ${pct(m.alive)} · 고급 AI 길 ${pct(b.alive)} — 기대 짐작 거리 ${m.E.toFixed(1)} vs ${b.E.toFixed(1)}칸${dblNote}`, my, best };
  }

  function result(V, me) {
    const nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    const R = V.res; if (!R) return "";
    const head = R.w < 0 ? "🤝 무승부" : me >= 0 && R.w === me ? "🏁 내가 먼저 도착했어요" : `🏁 ${nm(R.w)}${iga(nm(R.w))} 먼저 도착`;
    const rows = [0, 1].map(s => `${DOT[s]} ${nm(s)} · ${V.turns[s]}턴 · 실패 ${V.fails[s]}번 · 더블찬스 ${K.DBL - V.dbl[s]}번 씀${R.d ? ` · 도착점까지 ${R.d[s]}칸` : ""}`).join("<br>");
    return `${head}${R.why === "cap" ? ` (${K.MAXT}턴 상한)` : ""}<br>${rows}<br>벽 32개 · 최단 거리 ${V.dist}칸`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const at = K.at, A1 = at(0, 0);
    const base = (p0, p1) => ({ pos: [p0 == null ? K.S[0] : p0, p1 == null ? K.S[1] : p1], opt: {} });
    const tb = x => `<div class="mz-tut">${x}</div>`;
    const E = (a, b) => K.eid(a, b);
    // 예시 길 · 실패
    const ev1 = { s: 1, from: K.S[1], path: [at(6, 1), at(6, 2), at(5, 2)], fail: -1, dbl: 0, goal: false };
    const ev2 = { s: 0, from: at(1, 1), path: [at(1, 2), at(2, 2), at(2, 3)], fail: 2, dbl: 0, goal: false };
    const ev3 = { s: 0, from: A1, path: [at(1, 0), at(1, 1), at(1, 2), at(2, 2), at(2, 3), at(3, 3)], fail: -1, dbl: 1, goal: false };
    const sampleW = (() => { const st = K.init({ n: 2, seed: 7 }); return st.wall.map((v, e) => (v ? e : -1)).filter(e => e >= 0); })();
    // 직접: A1 → ⭐ C2 를 3칸에 (벽 둘은 연습이라 보여 줌)
    const TW = [E(A1, at(0, 1)), E(at(1, 0), at(2, 0))], GOAL = at(2, 1), RIGHT = [at(1, 0), at(1, 1), at(2, 1)];
    return [
      { tag: "STEP 1 · 목표", title: "대각선 반대쪽 도착점에 먼저", body: "두 사람은 아래쪽 양 모서리에서 출발해요. <b>대각선 방향 위쪽 모서리</b>가 내 도착점 — <b>먼저 닿으면 승리</b>! (방송: 블랙가넷 8 · 9화 데스매치)",
        boardHtml: tb(boardSvg(base(), { me: 0 })), ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "7×7 판 · 보이지 않는 벽 32개", body: "칸과 칸 사이에 <b>보이지 않는 벽 32개</b>가 숨어 있어요 (그림은 예시라 보여 줘요). 도착점까지의 <b>최단 거리는 둘이 같아요</b>. 벽은 끝날 때까지 안 보여요.",
        boardHtml: tb(boardSvg(base(), { me: 0, walls: sampleW, wallCls: "wa" })), ms: 6000 },
      { tag: "STEP 3 · 진행", title: "번갈아 3칸씩", body: "차례마다 <b>꼭 3칸</b> — 가로 · 세로로 한 칸씩 (대각선 X), 왔던 칸으로 되돌아가도 돼요. <b>상대가 가는 길도 다 보여요</b> — 외워 두면 내 길에 써요.",
        boardHtml: tb(boardSvg(base(null, at(5, 2)), { me: 0, trails: [{ ev: ev1 }] })), ms: 6000 },
      { tag: "STEP 4 · 직접", title: "벽을 피해 ⭐까지 3칸", body: "연습이라 벽 둘을 빨갛게 보여 줘요. <b>지나갈 칸을 차례로</b> 눌러 ⭐ C2까지 3칸 길을 만들고 <b>이동</b>!",
        interactive: { hint: "👆 칸 3개 → 이동", doneText: "✅ 도착! 벽 자리를 외워 두면 다음에도 안 부딪혀요" },
        render(stage, ctrl) {
          let path = [], done = false, msg = "출발점 A1에서 시작 — 이어진 칸을 눌러요", trail = null;
          const V = base();
          const draw = () => {
            const end = path.length ? path[path.length - 1] : A1, full = path.length === 3, right = full && path.every((c, j) => c === RIGHT[j]);
            const tp = !done && !full ? RIGHT[path.length] : -1;
            const ok = path.every((c, j) => c === RIGHT[j]);
            const btn = !done ? `<div class="mz-act"><button type="button" class="sub" data-a="clr"${path.length ? "" : " disabled"}>↩ 다시</button><button type="button" class="go" data-a="go"${full ? "" : " disabled"}${right ? ' data-tp="1"' : ""}>이동 ▶ ${path.length}/3</button></div>` : "";
            stage.innerHTML = `<div class="mz-tut">${boardSvg(Object.assign({}, V, { pos: [done ? GOAL : A1, K.S[1]] }), { me: 0, walls: TW, goalMark: GOAL, plan: done ? null : { from: A1, path }, nexts: done || full ? null : K.NB[end], hits: !done, tp: ok ? tp : -1, trails: trail ? [{ ev: trail, nw: true }] : [] })}${btn}<div class="mz-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-c],button"); if (!t || t.disabled) return;
            const end = path.length ? path[path.length - 1] : A1;
            if (t.dataset.a === "clr") { path = []; msg = "처음부터 — A1에서 이어진 칸을 눌러요"; ctrl.sfx("tap"); draw(); return; }
            if (t.dataset.a === "go") {
              let cur = A1, fail = -1;
              for (let j = 0; j < path.length; j++) { if (TW.includes(E(cur, path[j]))) { fail = j; break; } cur = path[j]; }
              if (fail >= 0) { trail = { s: 0, from: A1, path: path.slice(0, fail + 1), fail, dbl: 0, goal: false }; msg = `💥 ${EN(E(fail ? path[fail - 1] : A1, path[fail]))} 사이 벽! 출발점 A1로 돌아가요 — 다시`; path = []; ctrl.sfx("tap"); draw(); return; }
              if (cur !== GOAL) { trail = { s: 0, from: A1, path: path.slice(), fail: -1, dbl: 0, goal: false }; msg = `${CN(cur)}… ⭐ C2가 아니에요 — 다시`; path = []; ctrl.sfx("tap"); draw(); return; }
              done = true; trail = { s: 0, from: A1, path: path.slice(), fail: -1, dbl: 0, goal: false };
              msg = "🎉 <b>도착!</b> A1 → B1 → B2 → C2 — 위 · 오른쪽 벽을 돌아서 갔어요"; ctrl.sfx("win"); draw(); ctrl.complete(); return;
            }
            if (t.dataset.c == null) return;
            const c = +t.dataset.c;
            if (path.length && c === end) { path.pop(); msg = "마지막 칸을 지웠어요"; ctrl.sfx("tap"); draw(); return; }
            if (path.length >= 3) { msg = "3칸을 다 골랐어요 — <b>이동</b>을 누르거나 ↩ 다시"; draw(); return; }
            if (E(end, c) < 0) { msg = "이어진 칸(가로 · 세로 한 칸)만 골라요"; draw(); return; }
            path.push(c); msg = path.length < 3 ? `${pathTxt([A1].concat(path))} · ${path.length}/3` : `${pathTxt([A1].concat(path))} — <b>이동</b>으로 확정`; ctrl.sfx("tap"); draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 실패", title: "벽을 지나가면 출발점으로", body: "이동 중 벽을 지나가면 <b>그 즉시 이동 실패</b> — 출발점으로 돌아가고 <b>다음 턴은 출발점부터</b>. 벽을 기억해 두는 게 전부예요.",
        boardHtml: tb(boardSvg(base(), { me: 0, trails: [{ ev: ev2 }], walls: [K.eid(at(2, 2), at(2, 3))] })), ms: 6000 },
      { tag: "STEP 6 · 더블찬스", title: "2번 · 그 턴은 6칸", body: "⚡ <b>더블찬스</b>를 쓰면 그 턴은 <b>6칸</b> (쓰면 꼭 6칸) — 각자 <b>2번</b>. 실패해서 다시 갈 때 <b>아는 길</b>을 한 번에 가면 좋아요.",
        boardHtml: tb(boardSvg(base(at(3, 3)), { me: 0, trails: [{ ev: ev3 }] })), ms: 6000 },
      { tag: "STEP 7 · 승패 · 특수", title: "먼저 도착 · 상대 길 따라가기", body: "도착점에 <b>닿는 순간 승리</b> (남은 칸은 안 가도 돼요). 9화 하연주는 상대가 찾은 길을 따라가 이겼어요. 끝없는 판을 막으려고 각자 <b>60턴</b>이 지나면 도착점에 더 가까운 쪽 승. 🧑‍🏫 선생님은 다 기억한다고 보고 길을 골라 줘요.",
        boardHtml: tb(boardSvg(base(at(5, 6), at(1, 5)), { me: 0 })), ms: 6800 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-memmaze"] = {
    name: "기억의 미로", emoji: "🧱", short: "보이지 않는 벽 32개를 외워 대각선 끝 도착점에 먼저 — 3칸씩 · 1:1", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [
      { k: "help", label: "기억 도우미", items: [[0, "끔 (방송)"], [1, "켬 — 알아낸 벽 · 길 그림"]], def: 0 },
      { k: "map", label: "미로", items: [[0, "판마다 새 미로"], [9, "9화 기록 판 (늘 같은 판)"]], def: 0 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 아래쪽 모서리에서 출발해 <b>대각선 방향 위쪽 모서리</b>(도착점)에 <b>먼저</b> 닿으면 승리 (방송: 블랙가넷 8 · 9화 데스매치 — 지면 탈락)",
      "준비물: 가로 7 × 세로 7 판 · 칸과 칸 사이에 <b>보이지 않는 벽 32개</b> · 도착점까지 최단 거리는 둘이 같음",
      "진행: 선 플레이어부터 번갈아 <b>3칸씩</b> (3칸보다 적게는 X) · 가로 · 세로 아무 방향, <b>대각선 X</b> · 왔던 칸으로 되돌아가도 돼요 · 상대가 가는 길과 부딪힌 자리는 서로 보여요",
      "승패: 이동 중 벽을 지나가면 <b>그 즉시 출발점으로</b>, 다음 턴은 출발점부터 · 도착점에 먼저 닿으면 승리 (닿는 순간 끝)",
      `특수: <b>⚡ 더블찬스 2번</b> — 그 턴은 6칸 (쓰면 꼭 6칸) · 벽은 끝날 때까지 안 보여 주고 표시도 못 해요 (기억 도우미는 연습 옵션) · 각자 <b>${K.MAXT}턴</b>이 지나면 도착점까지 실제 거리가 짧은 쪽 승 (끝없는 판을 막는 상한)`,
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `턴 ${Math.min(K.MAXT, V.turns[V.cur] + 1)} / ${K.MAXT} · 먼저 도착하면 승리`),
    chip: (V, i) => ({ t: `${DOT[i]}${CN(V.pos[i])} ⚡${V.dbl[i]}`, on: !V.over && V.cur === i, out: !!(V.over && V.res && V.res.w >= 0 && V.res.w !== i) }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me, rnd) => K.ai(V, me, "normal", rnd),
  };
})();

/* 베니 서바이벌 · 바그찰 — 화면 (판 두 개 · 지금 둘 판을 크게, 다른 판은 작게 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const K = window.SVCores.baghchal;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NP = K.NP, RC = K.RC, LBL = K.LBL, BN = K.BN;
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 7일차 결승전 2회전 (1:1)";
  const DIFF = `한 수 90초 제한 · 연습 시간 없음 · 선공은 무작위 (방송은 베네핏 가진 사람이 정함) · 차례는 방송 글의 순서대로 '내 염소 판 한 수 → 내 호랑이 판 한 수' (선공 첫 차례만 염소 한 수) · 대각선은 전통 바그찰 판대로 · 움직일 염소가 없으면 그 수는 건너뜀 · 두 판 합쳐 ${K.LIMIT}수(호랑이 80수씩)가 지나도 안 끝나면 호랑이로 더 많이 잡은 사람 승, 같으면 무승부 — 방송 글에 없어서 우리가 정함`;
  const ICON = { g: "🐐", t: "🐯" }, ROLE = { g: "염소", t: "호랑이" };
  const pos = v => (9 + v * 20.5).toFixed(2);
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const ga = w => { const j = jong(w); return j < 0 ? "이(가)" : j ? "이" : "가"; };

  const CSS = `
.bc-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.bc-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:4px 10px}
.bc-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.bc-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.bc-pill.sm{font-weight:700;color:var(--soft)}
.bc-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}
.bc-card{display:flex;align-items:center;gap:6px;min-width:0;min-height:58px;padding:4px 6px;border-radius:12px;background:rgba(0,0,0,.25);border:1.5px solid rgba(255,255,255,.1);color:var(--soft);font:700 11px/1.3 var(--round);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.bc-card.on{border-color:var(--gold);background:rgba(245,179,1,.12)}
.bc-card.vw{box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.bc-card b{color:#fff;font-weight:800}
.bc-card .tx{min-width:0;overflow:hidden}
.bc-card .tx>span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bc-card .cp{color:#fca5a5}
.bc-card .cp.t{color:#fde68a}
.bc-mini{flex:none;width:48px;height:48px;position:relative;border-radius:7px;background:#3b2c1b}
.bc-mini svg{position:absolute;inset:0;width:100%;height:100%}
.bc-mini svg line{stroke:rgba(253,230,138,.35);stroke-width:1;vector-effect:non-scaling-stroke}
.bc-mini i{position:absolute;width:15%;height:15%;transform:translate(-50%,-50%);border-radius:50%}
.bc-mini i.g{background:#f8fafc}
.bc-mini i.t{background:#f97316;box-shadow:0 0 0 1px #431407}
.bc-wrap{flex:none;width:min(100%,calc(100vh - 352px));width:min(100%,calc(100dvh - 352px));margin:0 auto}
.bc-board{position:relative;aspect-ratio:1/1;border-radius:14px;background:linear-gradient(160deg,#47331f,#2b1d10);border:2px solid rgba(253,230,138,.25);box-shadow:inset 0 0 18px rgba(0,0,0,.5)}
.bc-board.mg{border-color:rgba(134,239,172,.55)}
.bc-board.mt{border-color:rgba(251,146,60,.65)}
.bc-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.bc-board svg line{stroke:rgba(253,230,138,.5);stroke-width:2;vector-effect:non-scaling-stroke}
.bc-board svg line.jp{stroke:#f43f5e;stroke-width:3;stroke-dasharray:5 4}
.bc-p{position:absolute;width:17%;height:17%;transform:translate(-50%,-50%);display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.bc-p{cursor:default}
.bc-p::before{content:"";width:16%;height:16%;border-radius:50%;background:rgba(253,230,138,.55)}
.bc-p.f::before{display:none}
.bc-pc{width:74%;height:74%;border-radius:50%;display:grid;place-items:center;font-size:clamp(14px,5.2vw,26px);line-height:1;box-shadow:0 2px 4px rgba(0,0,0,.6)}
.bc-pc.g{background:radial-gradient(circle at 35% 30%,#fff,#d6d3d1 78%);border:2px solid #57534e}
.bc-pc.t{background:radial-gradient(circle at 35% 30%,#fdba74,#c2410c 78%);border:2px solid #431407}
.bc-p.pl::after,.bc-p.tg::after,.bc-p.tj::after{content:"";position:absolute;inset:16%;border-radius:50%;pointer-events:none}
.bc-p.pl::after{border:2px dashed #f5b301}
.bc-p.tg::after{border:2.5px dashed #4ade80;background:rgba(74,222,128,.16)}
.bc-p.tj::after{border:2.5px dashed #f43f5e;background:rgba(244,63,94,.18)}
.bc-p.mv .bc-pc{box-shadow:0 0 0 2px rgba(253,230,138,.75),0 2px 4px rgba(0,0,0,.6)}
.bc-p.sel .bc-pc{box-shadow:0 0 0 3.5px #fde68a,0 0 12px #fde68a}
.bc-p.vx .bc-pc{box-shadow:0 0 0 3px #f43f5e,0 0 10px #f43f5e}
.bc-p.tr .bc-pc{filter:grayscale(.7) brightness(.8)}
.bc-p.lm::after{content:"";position:absolute;inset:4%;border-radius:50%;border:2px solid rgba(96,165,250,.95);pointer-events:none}
.bc-p.lf::before{background:rgba(96,165,250,.9);width:26%;height:26%}
.bc-x{position:absolute;font:900 16px var(--round);font-style:normal;color:#f43f5e;pointer-events:none;text-shadow:0 1px 2px #000}
.bc-bang,.bc-star,.bc-lock{position:absolute;right:2%;top:2%;width:17px;height:17px;border-radius:50%;background:#e11d48;color:#fff;font:900 11px/17px var(--round);text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none;z-index:2}
.bc-star{background:#f5b301;color:#3b2a00;box-shadow:0 0 0 2px #fff7d6}
.bc-lock{background:#334155;font-size:9px}
.bc-lb{position:absolute;transform:translate(-50%,0);font:700 8px var(--round);font-style:normal;color:rgba(253,230,138,.45);pointer-events:none}
.bc-info{flex:none;text-align:center;font-size:12.5px;line-height:1.4;color:var(--soft);min-height:2.8em;display:grid;place-items:center}
.bc-info b{color:#fde68a}
.bc-info.end{font:800 14px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:5px 8px}
.bc-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.bc-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.bc-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.bc-tut .bc-wrap{width:min(100%,232px)}
.bc-tut .bc-lb{display:none}
.bc-tut .bc-pc{font-size:17px}
.bc-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.bc-tmsg b{color:#fde68a}
.sv-coachfit .bc-wrap{width:min(100%,calc(var(--sv-sh,360px) - 122px))}
.sv-coachfit .bc-info{display:none}
@media (max-height:650px){.bc-lb{display:none}.bc-card{min-height:52px}.bc-mini{width:42px;height:42px}}
@media (min-height:760px){.bc-wrap{width:min(100%,calc(100dvh - 380px))}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");

  // 판 선: 가로 · 세로 5줄씩 + 전통 대각선 (큰 X 와 가운데 마름모)
  const DIAG = [[0, 24], [4, 20], [2, 10], [10, 22], [22, 14], [14, 2]];
  function linesSvg(cls = "") {
    const P = p => [pos(RC[p][1]), pos(RC[p][0])];
    let g = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"${cls}>`;
    for (let k = 0; k < 5; k++) { g += `<line x1="${pos(0)}" y1="${pos(k)}" x2="${pos(4)}" y2="${pos(k)}"/><line x1="${pos(k)}" y1="${pos(0)}" x2="${pos(k)}" y2="${pos(4)}"/>`; }
    for (const [a, b] of DIAG) { const A = P(a), B = P(b); g += `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`; }
    return g;
  }
  // 큰 판 — o: 점마다 붙일 클래스 · 표시
  function boardHtml(c, o = {}) {
    const btn = o.btn !== false, tag = btn ? "button" : "span";
    const has = (k, i) => o[k] && o[k].has(i);
    let g = linesSvg();
    for (const [a, b] of o.jumps || []) g += `<line class="jp" x1="${pos(RC[a][1])}" y1="${pos(RC[a][0])}" x2="${pos(RC[b][1])}" y2="${pos(RC[b][0])}"/>`;
    g += `</svg>`;
    for (let i = 0; i < NP; i++) {
      const v = c[i], x = pos(RC[i][1]), y = pos(RC[i][0]);
      let cls = `bc-p${v ? " f" : ""}`;
      for (const k of ["pl", "mv", "sel", "tg", "tj", "vx", "tr", "lm", "lf"]) if (has(k, i)) cls += " " + k;
      let inner = v ? `<span class="bc-pc ${v === 1 ? "g" : "t"}">${v === 1 ? ICON.g : ICON.t}</span>` : "";
      if (has("x", i)) inner += `<i class="bc-x">✕</i>`;
      if (v === 1 && has("bang", i)) inner += `<span class="bc-bang">!</span>`;
      else if (v === 1 && has("star", i)) inner += `<span class="bc-star">★</span>`;
      if (v === 2 && has("tr", i)) inner += `<span class="bc-lock">🔒</span>`;
      const what = v === 1 ? "염소" : v === 2 ? "호랑이" : "빈 점";
      g += `<${tag}${btn ? ' type="button"' : ""} class="${cls}" data-c="${i}"${has("tp", i) ? ' data-tp="1"' : ""} style="left:${x}%;top:${y}%" aria-label="${LBL[i]} ${what}">${inner}</${tag}>`;
      if (o.labels) g += `<i class="bc-lb" style="left:${x}%;top:${(+y + 7.6).toFixed(2)}%">${LBL[i]}</i>`;
    }
    return `<div class="bc-wrap"><div class="bc-board${o.frame ? " " + o.frame : ""}" aria-label="${esc(o.aria || "바그찰 판")}">${g}</div></div>`;
  }
  function miniHtml(c) {
    let g = linesSvg() + `</svg>`;
    for (let i = 0; i < NP; i++) if (c[i]) g += `<i class="${c[i] === 1 ? "g" : "t"}" style="left:${pos(RC[i][1])}%;top:${pos(RC[i][0])}%"></i>`;
    return `<span class="bc-mini" aria-hidden="true">${g}</span>`;
  }

  // 이 기기에서만 쓰는 것: 눌러 둔 말 · 들여다보는 판 (수가 바뀌면 지움)
  let SEL = { key: "", from: -1, peek: -1 };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.step}|${ctx.me}`; if (SEL.key !== key) SEL = { key, from: -1, peek: -1 }; return SEL; };
  // 내 차례 안에서 몇 번째 수인지 (선공 첫 차례는 한 수뿐)
  function partOf(V) {
    const s = V.step, k = V.cur;
    if (!k) return "";
    if (s === 0) return "1/1";
    return (s - 1) % 2 === 0 ? "1/2" : "2/2";
  }
  const roleOn = (V, seat, b) => V.B[b].goat === seat ? "g" : "t";
  const boardOfRole = (V, seat, role) => V.B[0][role === "g" ? "goat" : "tiger"] === seat ? 0 : 1;

  function endLine(V, me, ctx) {
    const r = V.res; if (!r) return "";
    const nm = s => me === s ? "나" : me >= 0 ? "상대" : esc(nameOf(ctx, s));
    if (r.why === "limit") {
      const head = r.w < 0 ? `🤝 무승부 — ${K.LIMIT}수 동안 안 끝남, 잡은 염소 ${r.caps[0]} : ${r.caps[1]} 같음` : `${me < 0 ? "🏆" : me === r.w ? "🏆" : "😵"} ${nm(r.w)} 승 — ${K.LIMIT}수 동안 안 끝나 호랑이로 더 많이 잡은 쪽 (${r.caps[r.w]} : ${r.caps[1 - r.w]})`;
      return head;
    }
    const b = r.b, g = V.B[b].goat, t = V.B[b].tiger;
    const why = r.why === "cap" ? `판 ${BN[b]}에서 ${me === t ? "내" : nm(t) + "의"} 호랑이가 염소 ${K.WINCAP}마리를 잡았어요` : `판 ${BN[b]}에서 ${me === g ? "내" : nm(g) + "의"} 염소가 호랑이 4마리를 모두 가뒀어요`;
    return `${me < 0 ? "🏆" : me === r.w ? "🏆" : "😵"} ${nm(r.w)} 승 — ${why}`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, k = V.cur, can = !!ctx.canAct && me >= 0 && !over && k && k.seat === me;
    const S = selFor(V, ctx);
    const actB = k ? k.b : (V.res && V.res.b >= 0 ? V.res.b : 0);
    const vb = S.peek >= 0 ? S.peek : actB, mine = can && vb === actB;
    const bd = V.B[vb];
    const L = mine ? K.legal(V, me) : [];
    const placeT = new Set(), moveF = new Map();
    for (const a of L) {
      if (a.t === "place") placeT.add(a.to);
      else { if (!moveF.has(a.from)) moveF.set(a.from, new Map()); moveF.get(a.from).set(a.to, a); }
    }
    if (S.from >= 0 && !moveF.has(S.from)) S.from = -1;
    const o = { labels: true, pl: S.from < 0 && placeT.size ? placeT : null, mv: S.from < 0 ? new Set(moveF.keys()) : null, sel: new Set(S.from >= 0 ? [S.from] : []), tr: new Set(bd.trapped) };
    if (S.from >= 0) {
      const tg = new Set(), tj = new Set(), vx = new Set(), jumps = [];
      for (const [to] of moveF.get(S.from)) {
        if (K.ADJ[S.from].includes(to)) { tg.add(to); continue; }
        const J = K.JMP[S.from].find(z => z[1] === to);
        tj.add(to); vx.add(J[0]); jumps.push([S.from, to]);
      }
      Object.assign(o, { tg, tj, vx, jumps });
    }
    const L0 = bd.last;
    if (L0 && !over) { o.lm = new Set([L0.t]); o.lf = new Set(L0.f >= 0 && !bd.c[L0.f] ? [L0.f] : []); if (L0.o >= 0 && !bd.c[L0.o]) o.x = new Set([L0.o]); }
    if (ctx.coachOn && !over) {
      const ex = new Set(bd.exposed), vme = me >= 0 ? me : (k ? k.seat : 0);
      if (bd.goat === vme) o.bang = ex; else o.star = ex;
    }
    const myRole = me >= 0 ? roleOn(V, me, vb) : null;
    o.frame = myRole ? (myRole === "g" ? "mg" : "mt") : "";
    o.aria = `판 ${BN[vb]}`;

    // 윗줄
    const nmK = k ? nameOf(ctx, k.seat) : "";
    const turnTxt = over ? "끝" : can ? `내 차례 ${partOf(V)}` : `${esc(nmK)} 차례`;
    let h = `<div class="bc-top"><span class="bc-pill ${over ? "" : can ? "me" : "turn"}">${turnTxt}</span>`;
    if (k) h += `<span class="bc-pill sm">판 ${BN[k.b]} · ${ICON[k.role]} ${ROLE[k.role]} ${k.role === "g" && V.B[k.b].h > 0 ? "놓기" : "수"}</span>`;
    h += `</div>`;
    // 판 두 개 (작게) — 누르면 그 판을 크게
    h += `<div class="bc-cards">`;
    for (let b = 0; b < 2; b++) {
      const x = V.B[b], gN = me >= 0 ? (x.goat === me ? "나" : "상대") : nameOf(ctx, x.goat), tN = me >= 0 ? (x.tiger === me ? "나" : "상대") : nameOf(ctx, x.tiger);
      const head = me >= 0 ? `판 ${BN[b]} · 나 ${ICON[roleOn(V, me, b)]}` : `판 ${BN[b]}`;
      const cls = `bc-card${k && k.b === b ? " on" : ""}${vb === b ? " vw" : ""}`;
      h += `<button type="button" class="${cls}" data-v="${b}" aria-label="판 ${BN[b]} 보기">${miniHtml(x.c)}<span class="tx"><span><b>${esc(head)}</b></span>`
        + `<span>🐐 ${esc(gN)} · <span class="cp${me >= 0 && x.tiger === me ? " t" : ""}">잡힘 ${x.cap}/${K.WINCAP}</span></span>`
        + `<span>${x.h > 0 ? `놓을 염소 ${x.h}` : `🐯 ${esc(tN)} · 갇힘 ${x.trapped.length}/4`}</span></span></button>`;
    }
    h += `</div>`;
    h += boardHtml(bd.c, o);

    // 아래 안내
    let info, ic = "";
    if (over) { info = endLine(V, me, ctx); ic = V.res.w < 0 ? " end mid" : me >= 0 && me !== V.res.w ? " end bad" : " end"; }
    else if (can && vb !== actB) info = `판 ${BN[vb]}${ja(BN[vb],"을")} 보는 중 — 지금 둘 판은 <b>판 ${BN[actB]}</b> (위에서 눌러 돌아가요)`;
    else if (can && k.role === "g") {
      if (bd.h > 0) info = `<b>빈 점</b>(금색 점선)에 🐐 염소를 놓아요 · 놓을 염소 ${bd.h}마리`;
      else if (S.from >= 0) info = `옮길 <b>빈 점</b>(초록 점선)을 눌러요 · 그 염소를 다시 누르면 취소`;
      else info = `옮길 <b>🐐 염소</b>를 누르고, 선을 따라 이웃 빈 점으로 한 칸`;
    } else if (can) {
      info = S.from >= 0 ? `<b>초록</b> = 한 칸 · <b>빨강</b> = 염소를 뛰어넘어 잡기 · 다시 누르면 취소` : `움직일 <b>🐯 호랑이</b>를 눌러요 — 한 칸, 또는 옆 염소를 뛰어넘어 잡기`;
    } else {
      info = `${esc(nmK)}${ga(nmK)} 판 ${BN[k.b]}에서 ${ICON[k.role]} ${ROLE[k.role]} 수를 고르는 중…`;
      if (me >= 0 && vb !== actB) info = `판 ${BN[vb]}${ja(BN[vb],"을")} 보는 중 · ${info}`;
    }
    h += `<div class="bc-info${ic}"><span>${info}</span></div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      const cd = e.target.closest("[data-v]");
      if (cd) { const b = +cd.dataset.v; S.peek = b === actB ? -1 : b; S.from = -1; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const t = e.target.closest("[data-c]"); if (!t || !mine) return;
      const c = +t.dataset.c;
      if (S.from >= 0) {
        const m = moveF.get(S.from);
        // 빈 점(초록 · 빨강)을 누르거나, 잡을 염소(빨간 테)를 바로 눌러도 됨
        const J = bd.c[c] === 1 && K.JMP[S.from].find(z => z[0] === c);
        const a = m && (m.get(c) || (J && m.get(J[1])));
        if (a) { S.from = -1; ctx.sfx("pop"); ctx.act(a); return; }
      }
      if (placeT.has(c)) { ctx.sfx("pop"); ctx.act(L.find(a => a.t === "place" && a.to === c)); return; }
      const mineV = k.role === "g" ? 1 : 2;
      if (bd.c[c] === mineV && !(k.role === "g" && bd.h > 0)) {
        if (moveF.has(c)) { S.from = S.from === c ? -1 : c; ctx.sfx("tap"); render(stage, V, ctx); return; }
        ctx.toast(k.role === "t" ? "그 호랑이는 갈 곳이 없어요 (갇힘)" : "그 염소는 옮길 빈 점이 없어요", 1300); return;
      }
      if (k.role === "g" && bd.h > 0 && bd.c[c]) { ctx.toast(`아직 놓을 염소가 ${bd.h}마리 — 빈 점에 놓아요`, 1400); return; }
      if (bd.c[c] && bd.c[c] !== mineV) { ctx.toast(k.role === "g" ? "이 판에서 나는 🐐 염소예요" : "이 판에서 나는 🐯 호랑이예요", 1300); return; }
      if (S.from >= 0) { S.from = -1; render(stage, V, ctx); }
    };
  }

  // ── 행동 글 ──
  const L = i => LBL[i];
  const list = a => [...new Set(a)].sort((x, y) => x - y).map(L).join(" · ");
  function actText(a, V) {
    if (!a) return "";
    const b = a.b !== undefined ? a.b : V && V.cur ? V.cur.b : -1, pre = b >= 0 ? `판 ${BN[b]} ` : "";
    if (a.t === "place") return `${pre}🐐 ${L(a.to)}에 염소 놓기`;
    // 역할은 판 내용으로 (수 앞 · 뒤 어느 쪽 보기여도 맞게) — 이웃이 아닌 곳으로 가는 수는 호랑이 잡기뿐
    const jump = !K.ADJ[a.from].includes(a.to);
    const pc = V && V.B && b >= 0 ? (V.B[b].c[a.from] || V.B[b].c[a.to]) : 0;
    const role = jump || pc === 2 ? "t" : pc === 1 ? "g" : null;
    if (role === "t") return `${pre}🐯 ${L(a.from)} → ${L(a.to)}${jump ? " (염소 잡기)" : ""}`;
    if (role === "g") return `${pre}🐐 ${L(a.from)} → ${L(a.to)}`;
    return `${pre}${L(a.from)} → ${L(a.to)}`;
  }

  // ── 선생님 (모두 공개 — 보이는 것 그대로) ──
  function whyText(V, r) {
    const t = r.tags, out = [];
    const [e0, e1] = r.exp || [[], []], [m0, m1] = r.mob || [0, 0], [t0, t1] = r.trapped || [0, 0];
    if (r.role === "g") {
      if (t.includes("trap")) out.push(`호랑이를 하나 더 가둬요 (갇힌 호랑이 ${t0} → ${t1}마리, 4마리 다 가두면 승)`);
      if (t.includes("safe")) out.push(`잡힐 수 있던 염소 ${e0.length}마리 → ${e1.length}마리로 막아요`);
      if (m1 < m0) out.push(`호랑이가 움직일 길 ${m0} → ${m1}개로 줄어요`);
      if (t.includes("expose")) out.push(`다만 이 수 뒤에도 ${list(e1)} 염소는 잡힐 수 있어요 — 몇 수 앞까지 읽어 보면 이게 손해가 가장 적어요`);
      else if (!out.length) out.push("호랑이가 바로 잡을 수 있는 염소가 없는 안전한 수예요");
    } else {
      if (t.includes("cap")) out.push(`${L(r.cap)} 염소를 잡아요 (잡은 염소 ${V.B[r.b].cap} → ${V.B[r.b].cap + 1}/${K.WINCAP})`);
      if (t.includes("fork")) out.push(`다음에 잡을 수 있는 염소가 ${e1.length}마리 (${list(e1)}) — 상대가 한 번에 다 막기 어려워요`);
      else if (e1.length === 1 && !t.includes("cap")) out.push(`${L(e1[0])} 염소를 노려요`);
      if (t.includes("free")) out.push(`갇힌 호랑이를 풀어요 (${t0} → ${t1}마리)`);
      if (m1 > m0 && !t.includes("cap")) out.push(`호랑이가 움직일 길 ${m0} → ${m1}개로 늘어요 (갇히지 않게)`);
      if (!out.length) out.push("당장 잡을 수는 없어요 — 갇히지 않게 자리를 넓혀요");
    }
    return out.join(" · ");
  }
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, k = V.cur, gB = boardOfRole(V, me, "g"), tB = 1 - gB;
    const G = V.B[gB], T = V.B[tB];
    // 👀 상대 흐름
    const evs = V.log.filter(e => e.i > since && e.s === opp && (e.k === "pl" || e.k === "gm" || e.k === "tm"));
    const p = [];
    if (!evs.length) p.push(V.step === 0 ? "아직 아무도 두지 않았어요." : "내 지난 차례 뒤 상대가 둔 수는 없어요.");
    else {
      const parts = evs.slice(-3).map(e => e.k === "pl" ? `판 ${BN[e.b]} 🐐 ${L(e.to)}에 놓음` : e.k === "gm" ? `판 ${BN[e.b]} 🐐 ${L(e.from)} → ${L(e.to)}` : `판 ${BN[e.b]} 🐯 ${L(e.from)} → ${L(e.to)}${e.cap >= 0 ? ` (내 ${L(e.cap)} 염소 잡음!)` : ""}`);
      p.push(`상대: ${parts.join(" · ")}${evs.length > 3 ? ` (그 전 ${evs.length - 3}번 더)` : ""}.`);
    }
    if (!V.over) {
      if (G.exposed.length) p.push(`판 ${BN[gB]}: 상대 호랑이가 다음 수에 ${list(G.exposed)} 염소를 잡을 수 있어요 — 판에 '!' 로 표시했어요.`);
      else p.push(`판 ${BN[gB]}: 상대 호랑이가 바로 잡을 수 있는 내 염소는 없어요.`);
    }
    // 📊 내 흐름
    let m = `판 ${BN[gB]} (나 🐐): 잡힘 ${G.cap}/${K.WINCAP} · ${G.h > 0 ? `놓을 염소 ${G.h}` : `판 위 염소 ${G.on}`} · 갇힌 호랑이 ${G.trapped.length}/4.`;
    m += ` 판 ${BN[tB]} (나 🐯): 잡음 ${T.cap}/${K.WINCAP} · 상대 ${T.h > 0 ? `놓을 염소 ${T.h}` : `판 위 염소 ${T.on}`} · 내 호랑이 갇힘 ${T.trapped.length}/4.`;
    if (!V.over && T.exposed.length) m += ` 지금 내 호랑이가 잡을 수 있는 염소: ${list(T.exposed)} (★).`;
    m += ` 먼저 끝나는 판이 승부를 정해요 · 남은 ${V.left}수 (다 쓰면 호랑이로 더 많이 잡은 쪽 승, 지금 ${T.cap} : ${G.cap}).`;
    // 💡 추천 · 👉 뜻
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (!k || k.seat !== me) rec = "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else {
      const R = K.recommend(V, me);
      if (!R) rec = "둘 수 있는 수가 없어요.";
      else { rec = `${actText(Object.assign({ b: R.b }, R.a), V)}.`; why = whyText(V, R); }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const J = K.judge(Vb, seat, myA, bestA);
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    if (!J || J.my === null || J.best === null) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const W = J.WINV - 50, loss = Math.max(0, Math.round(J.best - J.my));
    const k = Vb.cur, em = K.explain(Vb, k, myA), eb = K.explain(Vb, k, bestA), has = (e, t) => e.tags.includes(t);
    let sev, why;
    if (J.best >= W && J.my < W) { sev = 100; why = `고급 AI의 수(${best})면 몇 수 안에 이 판을 이기는 길이 있었어요`; }
    else if (J.my <= -W && J.best > -W) { sev = 100; why = `이 수 뒤엔 상대가 몇 수 안에 이 판을 이기는 길이 생겨요 — ${best}${ja(best,"로")} 버틸 수 있었어요`; }
    else {
      sev = loss >= 300 ? 90 : loss >= 150 ? 75 : loss >= 90 ? 60 : loss >= 45 ? 40 : loss > 10 ? 20 : 5;
      const r = [];
      if (k.role === "g") {
        const a = (em.exp || [[], []])[1].length, b = (eb.exp || [[], []])[1].length;
        if (a > b) r.push(`내 수 뒤 잡힐 수 있는 염소 ${a}마리 (고급 AI 수 뒤엔 ${b}마리)`);
        if (has(eb, "trap") && !has(em, "trap")) r.push("고급 AI 수는 호랑이를 하나 더 가둬요");
      } else {
        if (has(eb, "cap") && !has(em, "cap")) r.push("그때 염소를 바로 잡을 수 있었어요");
        if (has(eb, "fork") && !has(em, "fork")) r.push("고급 AI 수는 잡을 곳을 두 군데 이상 만들어요");
        if (has(eb, "free") && !has(em, "free")) r.push("고급 AI 수는 갇힌 호랑이를 풀어요");
      }
      why = loss <= 10 ? `고급 AI: ${best} — 몇 수 앞까지 읽어도 내 수와 거의 같은 값이에요 (차이 ${loss}점, 잡힌 염소 1마리 ≈ 160점)`
        : `고급 AI: ${best} — 몇 수 앞까지 읽으면 내 수보다 약 ${loss}점 나아요 (잡힌 염소 1마리 ≈ 160점)${r.length ? " · " + r.join(" · ") : ""}`;
    }
    return { sev, why, my, best };
  }

  function result(V, me) {
    const caps = V.res ? V.res.caps : [0, 0];
    const line = endLine(V, me, {});
    const mine = me >= 0 ? `<br>호랑이로 잡은 염소: 나 ${caps[me]} · 상대 ${caps[1 - me]} · 두 판 합쳐 ${V.step}수` : `<br>호랑이로 잡은 염소 ${caps[0]} : ${caps[1]} · 두 판 합쳐 ${V.step}수`;
    return `${line}${mine}`;
  }

  // ── 1분 규칙 ──
  const put = (g, t) => { const c = Array(NP).fill(0); g.forEach(i => { c[i] = 1; }); t.forEach(i => { c[i] = 2; }); return c; };
  const S_ = a => new Set(a);
  function tutorial() {
    style();
    const tb = (c, o) => `<div class="bc-tut">${boardHtml(c, Object.assign({ btn: false }, o))}</div>`;
    // 갇힌 호랑이 · (선생님 표시) 잡힐 염소를 판에서 바로 셈
    const tbM = (c, o) => tb(c, Object.assign({ tr: S_(K.trapped(c)) }, o.coach ? { bang: S_(K.exposed(c)) } : {}, o));
    return [
      { tag: "STEP 1 · 목표", title: "판 두 개 · 역할을 바꿔서", body: "판이 <b>두 개</b>예요. 한 판에선 내가 <b>🐐 염소</b>, 다른 판에선 <b>🐯 호랑이</b> — 상대는 그 반대. 두 판 중 <b>먼저 끝나는 판</b>의 승자가 이겨요.",
        boardHtml: tb(put([], K.CORNER), {}), ms: 5600 },
      { tag: "STEP 2 · 염소", title: "20마리 놓고 → 한 칸씩", body: "염소는 <b>20마리</b>를 하나씩 <b>빈 점</b>에 놓아요. 다 놓기 전엔 옮길 수 없고, 다 놓은 뒤엔 <b>선을 따라 한 칸</b>. 호랑이 <b>4마리를 모두 못 움직이게</b> 가두면 염소 승!",
        boardHtml: tbM(put([1, 2, 3, 5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 19, 21, 22, 23], K.CORNER), {}), ms: 6000 },
      { tag: "STEP 3 · 호랑이", title: "한 칸 · 뛰어넘어 잡기", body: "호랑이는 <b>선을 따라 한 칸</b>, 또는 바로 옆 염소를 <b>한 줄로 뛰어넘어</b> 그 너머 <b>빈 점</b>에 내려앉으며 잡아요(한 번에 한 마리). <b>5마리</b> 잡으면 호랑이 승! 대각선은 선이 그어진 곳만.",
        boardHtml: tb(put([7, 6], [12, 0, 4, 24]), { sel: S_([12]), tj: S_([2]), vx: S_([7]), tg: S_([8, 11, 13, 16, 17, 18]), jumps: [[12, 2]] }), ms: 6400 },
      { tag: "STEP 4 · 차례", title: "내 차례 = 염소 한 수 + 호랑이 한 수", body: "선공이 <b>염소 한 수</b>로 시작하고, 그다음부터 한 사람의 차례는 <b>내 염소 판 한 수 → 내 호랑이 판 한 수</b>. 지금 둘 판이 저절로 크게 떠요. 위의 작은 판을 누르면 다른 판을 볼 수 있어요.",
        boardHtml: tb(put([7, 11, 13], K.CORNER), { pl: S_([1, 2, 3, 5, 6, 8, 9, 10, 12, 14, 15, 16, 17, 18, 19, 21, 22, 23]) }), ms: 6000 },
      { tag: "STEP 5 · 직접", title: "호랑이로 염소를 잡아 봐요", body: "가운데 🐯 호랑이를 누르고, 바로 위 🐐 염소를 <b>뛰어넘어</b> 빨간 점선 빈 점에 내려앉아 봐요!",
        interactive: { hint: "👆 가운데 호랑이 → 빨간 점선", doneText: "✅ 잡았어요! 5마리면 호랑이 승" },
        render(stage, ctrl) {
          const c = put([7, 11, 16, 17], [12, 0, 4, 24]);
          let step = 0, msg = "가운데 <b>🐯 호랑이</b>(c3)를 눌러요";
          const draw = () => {
            const o = { btn: true };
            if (step === 0) { o.mv = S_([12]); o.tp = S_([12]); }
            else if (step === 1) { o.sel = S_([12]); o.tj = S_([2, 10, 20, 22]); o.vx = S_([7, 11, 16, 17]); o.tg = S_([6, 8, 13, 18]); o.jumps = [[12, 2], [12, 10], [12, 20], [12, 22]]; o.tp = S_([2]); }
            else { o.lm = S_([2]); o.x = S_([7]); }
            stage.innerHTML = `<div class="bc-tut">${boardHtml(c, o)}<div class="bc-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || step === 2) return;
            const i = +b.dataset.c;
            if (step === 0) {
              if (i !== 12) { ctrl.sfx("tap"); msg = "가운데(c3)의 <b>🐯 호랑이</b>를 눌러요"; draw(); return; }
              step = 1; ctrl.sfx("tap"); msg = "빨간 점선 = 염소를 뛰어넘어 잡는 자리 — 예: 맨 위 <b>c5</b>로 뛰어 봐요"; draw(); return;
            }
            if (i === 2 || i === 10 || i === 20 || i === 22) { const ov = (12 + i) / 2; c[12] = 0; c[ov] = 0; c[i] = 2; step = 2; ctrl.sfx("win"); msg = `🏆 <b>${L(ov)} 염소를 잡았어요!</b> 뛰어넘은 염소가 판에서 빠져요`; draw(); ctrl.complete(); return; }
            ctrl.sfx("tap"); msg = [6, 8, 13, 18].includes(i) ? "초록은 그냥 한 칸이에요 — 잡으려면 <b>빨간 점선</b>!" : "빨간 점선 빈 점을 눌러요"; draw();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패", title: "먼저 끝나는 판이 승부", body: `호랑이가 염소 <b>${K.WINCAP}마리</b>를 잡거나, 염소가 호랑이 4마리를 <b>모두 가두면</b> 그 판이 끝나고 그 판의 승자가 게임 승자예요. 두 판 합쳐 <b>${K.LIMIT}수</b>가 지나면 호랑이로 더 많이 잡은 사람이 이겨요. 🧑‍🏫 선생님은 잡힐 염소에 '!' · 잡을 염소에 '★' 를 짚어 줘요.`,
        boardHtml: tbM(put([1, 2, 5, 6, 7, 10, 11, 13, 17], [0, 12, 4, 24]), { coach: true }), ms: 6800 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.baghchal = {
    name: "바그찰", emoji: "🐯", short: "두 판 동시에 — 한 판은 염소 · 한 판은 호랑이, 먼저 끝나는 판이 승부", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 판 <b>두 개</b>를 동시에 — 한 판에선 <b>🐐 염소</b>, 다른 판에선 <b>🐯 호랑이</b>. <b>먼저 끝나는 판</b>의 승자가 승리",
      "준비: 가로세로 5줄 판 두 개, 판마다 모서리에 호랑이 4마리 · 염소 20마리는 밖에서 시작",
      "염소: 20마리를 다 놓을 때까지 <b>빈 점에 하나씩 놓기</b> → 다 놓으면 <b>선을 따라 한 칸</b>",
      "호랑이: <b>선을 따라 한 칸</b>, 또는 옆 염소를 <b>한 줄로 뛰어넘어</b> 그 너머 빈 점에 내려앉으며 잡기 (한 번에 한 마리)",
      `차례: 선공이 염소 한 수로 시작 → 그다음부터 한 차례 = <b>내 염소 판 한 수 + 내 호랑이 판 한 수</b>`,
      `승패: 호랑이가 염소 <b>${K.WINCAP}마리</b>를 잡으면 호랑이 승 · 호랑이 4마리가 <b>모두 못 움직이면</b> 염소 승`,
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => V.over ? "끝" : `남은 ${V.left}수`,
    chip: (V, i) => ({ t: `🐯${V.score[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

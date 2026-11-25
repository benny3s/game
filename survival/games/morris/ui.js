/* 베니 서바이벌 · 나인 멘스 모리스 — 화면 (점 24개 판 · 놓기 / 옮기기 / 날기 · 밀 → 빼기 · 3판 2선승 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.morris;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NP = 24, XY = K.XY, LBL = K.LBL;
  const COL = ["검정", "하양"], DOT = ["⚫", "⚪"];
  const SRC = "방송: 데블스 플랜 시즌 1 · 7일차 결승전 1회전 (1:1)";
  const DIFF = "놓기 90초 제한 없음 · 1판 선공은 무작위, 다음 판부터 번갈아 (방송은 1 · 3판 선후공을 베네핏 가진 사람이 정함) · 상대 말이 모두 밀이면 아무 말이나 뺌 · '교착 10턴' = 빼기 없이 둘이 10번씩, 3:3 이면 그 판 무승부 · 빼기 없이 100수가 지나면 말이 적은 쪽 패 · 무승부 판은 다시 함 (최대 5판) — 방송 글에 없어서 우리가 정함";
  const pos = v => (7 + v * 86 / 6).toFixed(2);
  // 받침에 맞춘 조사 (한글이 아니면 '이(가)')
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const ga = w => { const j = jong(w); return j < 0 ? "이(가)" : j ? "이" : "가"; };
  // 칸 이름(a7 · d1 …) 뒤 조사 — 끝 숫자를 읽는 소리로: 일 · 삼 · 육 · 칠 은 받침 있음 (일 · 칠 은 ㄹ 받침이라 '로')
  const eul = lb => /[1367]$/.test(lb) ? `${lb}을` : `${lb}를`;
  const ro = lb => /[36]$/.test(lb) ? `${lb}으로` : `${lb}로`;

  const CSS = `
.mo-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.mo-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:4px 10px}
.mo-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.mo-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.mo-pill.rm{background:rgba(245,179,1,.25);border-color:#f5b301;color:#fde68a}
.mo-pill.sm{font-weight:700;color:var(--soft)}
.mo-pill.r{margin-left:auto}
.mo-hands{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}
.mo-hand{display:flex;align-items:center;gap:5px;min-width:0;padding:3px 8px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.mo-hand.on{border-color:var(--gold)}
.mo-hand b{color:#fff;font-weight:800;overflow:hidden;text-overflow:ellipsis;min-width:0}
.mo-hand .ds{display:flex;gap:2px;flex:none}
.mo-hand .ds i{width:8px;height:8px;border-radius:50%;display:block}
.mo-hand .ds i.b{background:radial-gradient(circle at 35% 30%,#64748b,#0b0f17 70%);box-shadow:0 0 0 1px #94a3b8}
.mo-hand .ds i.w{background:#f1f5f9;box-shadow:0 0 0 1px #334155}
.mo-hand .n{margin-left:auto;color:#fde68a;font-weight:800;font-variant-numeric:tabular-nums}
.mo-wrap{flex:none;width:min(100%,calc(100vh - 318px));width:min(100%,calc(100dvh - 318px));margin:0 auto}
.mo-board{position:relative;aspect-ratio:1/1;border-radius:14px;background:linear-gradient(160deg,#3a2a1c,#26190f);border:1px solid rgba(253,230,138,.25);box-shadow:inset 0 0 18px rgba(0,0,0,.5)}
.mo-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.mo-board svg rect,.mo-board svg line{fill:none;stroke:rgba(253,230,138,.55);stroke-width:2;vector-effect:non-scaling-stroke}
.mo-board svg line.ml{stroke:#4ade80;stroke-width:5}
.mo-p{position:absolute;width:14%;height:14%;transform:translate(-50%,-50%);display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.mo-p{cursor:default}
.mo-p::before{content:"";width:23%;height:23%;border-radius:50%;background:rgba(253,230,138,.6)}
.mo-p.f::before{display:none}
.mo-pc{width:78%;height:78%;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.6)}
.mo-pc.b{background:radial-gradient(circle at 35% 30%,#64748b,#0b0f17 68%);border:2px solid #cbd5e1}
.mo-pc.w{background:radial-gradient(circle at 35% 30%,#fff,#cbd5e1 78%);border:2px solid #334155}
.mo-p.pl::after,.mo-p.tg::after{content:"";position:absolute;inset:14%;border-radius:50%;pointer-events:none}
.mo-p.pl::after{border:2px dashed #f5b301}
.mo-p.tg::after{border:2.5px dashed #4ade80;background:rgba(74,222,128,.16)}
.mo-p.mv .mo-pc{box-shadow:0 0 0 2px rgba(253,230,138,.7),0 2px 4px rgba(0,0,0,.6)}
.mo-p.sel .mo-pc{box-shadow:0 0 0 3.5px #fde68a,0 0 12px #fde68a}
.mo-p.rm .mo-pc{box-shadow:0 0 0 3px #f43f5e,0 0 12px #f43f5e;animation:moPulse 1s ease-in-out infinite alternate}
.mo-p.lk .mo-pc{opacity:.85}
.mo-p.ml .mo-pc{box-shadow:0 0 0 3px #4ade80,0 0 12px #4ade80}
.mo-p.lm::after{content:"";position:absolute;inset:2%;border-radius:50%;border:2px solid rgba(96,165,250,.9);pointer-events:none}
.mo-p.lf::before{background:rgba(96,165,250,.9);width:34%;height:34%}
.mo-x{position:absolute;font:900 15px var(--round);font-style:normal;color:#f43f5e;pointer-events:none;text-shadow:0 1px 2px #000}
.mo-bang,.mo-star{position:absolute;right:-6%;top:-6%;width:18px;height:18px;border-radius:50%;background:#e11d48;color:#fff;font:900 12px/18px var(--round);text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none;z-index:2}
.mo-star{background:#f5b301;color:#3b2a00;box-shadow:0 0 0 2px #fff7d6}
.mo-lb{position:absolute;transform:translate(-50%,-2px);font:700 8px var(--round);font-style:normal;color:rgba(253,230,138,.45);pointer-events:none}
@keyframes moPulse{from{transform:scale(1)}to{transform:scale(1.07)}}
.mo-info{flex:none;text-align:center;font-size:12.5px;line-height:1.4;color:var(--soft);min-height:2.8em;display:grid;place-items:center}
.mo-info b{color:#fde68a}
.mo-info.end{font:800 14px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:5px 8px}
.mo-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.mo-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.mo-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.mo-tut .mo-wrap{width:min(100%,236px)}
.mo-tut .mo-lb{display:none}
.mo-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.mo-tmsg b{color:#fde68a}
.sv-coachfit .mo-wrap{width:min(100%,calc(var(--sv-sh,360px) - 70px))}
.sv-coachfit .mo-info{display:none}
@media (max-height:640px){.mo-lb{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || COL[i];

  // 판 그리기 (경기 화면 · 1분 규칙 공용) — o: 점마다 붙일 클래스 · 표시
  function boardHtml(cells, o = {}) {
    const btn = o.btn !== false, tag = btn ? "button" : "span";
    const has = (k, i) => o[k] && o[k].has(i);
    const P = XY.map(([x, y]) => [pos(x), pos(y)]);
    let g = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">`;
    for (const k of [0, 1, 2]) { const a = pos(k), w = (86 - k * 86 / 3).toFixed(2); g += `<rect x="${a}" y="${a}" width="${w}" height="${w}"/>`; }
    g += `<line x1="${pos(3)}" y1="${pos(0)}" x2="${pos(3)}" y2="${pos(2)}"/><line x1="${pos(3)}" y1="${pos(4)}" x2="${pos(3)}" y2="${pos(6)}"/>`;
    g += `<line x1="${pos(0)}" y1="${pos(3)}" x2="${pos(2)}" y2="${pos(3)}"/><line x1="${pos(4)}" y1="${pos(3)}" x2="${pos(6)}" y2="${pos(3)}"/>`;
    for (const m of o.millLines || []) { const a = P[m[0]], b = P[m[2]]; g += `<line class="ml" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
    g += `</svg>`;
    for (let i = 0; i < NP; i++) {
      const c = cells[i];
      let cls = `mo-p${c ? " f" : ""}`;
      for (const k of ["pl", "mv", "sel", "tg", "rm", "lk", "ml", "lm", "lf"]) if (has(k, i)) cls += " " + k;
      let inner = c ? `<span class="mo-pc ${c === 1 ? "b" : "w"}"></span>` : "";
      if (has("x", i)) inner += `<i class="mo-x">✕</i>`;
      if (!c && has("bang", i)) inner += `<span class="mo-bang">!</span>`;
      else if (!c && has("star", i)) inner += `<span class="mo-star">★</span>`;
      const what = c ? `${COL[c - 1]} 말` : "빈 점";
      g += `<${tag}${btn ? ' type="button"' : ""} class="${cls}" data-c="${i}"${has("tp", i) ? ' data-tp="1"' : ""} style="left:${P[i][0]}%;top:${P[i][1]}%" aria-label="${LBL[i]} ${what}">${inner}</${tag}>`;
      if (o.labels) g += `<i class="mo-lb" style="left:${P[i][0]}%;top:${(+P[i][1] + 7).toFixed(2)}%">${LBL[i]}</i>`;   // 점 이름 (단추 밖, 바로 아래)
    }
    return `<div class="mo-wrap"><div class="mo-board" aria-label="나인 멘스 모리스 판">${g}</div></div>`;
  }

  // 눌러 둔 말 (이 기기에서만 · 차례가 바뀌면 지움)
  let SEL = { key: "", from: -1 };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.ply}|${V.turn}|${V.rem}|${ctx.me}`; if (SEL.key !== key) SEL = { key, from: -1 }; return SEL; };
  const handHtml = (V, s, label, on) => {
    const dots = Array.from({ length: V.hand[s] }, () => `<i class="${s ? "w" : "b"}"></i>`).join("");
    return `<div class="mo-hand${on ? " on" : ""}"><b>${esc(label)}</b><span class="ds" aria-label="놓을 말 ${V.hand[s]}개">${dots}</span><span class="n">${V.hand[s] ? "" : `판 ${V.board[s]}`}</span></div>`;
  };
  const whyTxt = (r, who, other) => ({
    two: `${other === "나" ? "내" : other + "의"} 말이 2개가 됐어요`, block: `${other === "나" ? "내가" : other + ga(other)} 움직일 수 없게 됐어요`,
    stall3: "교착 10턴 — 말이 적은 쪽이 졌어요", cap: "빼기 없이 100수 — 말이 적은 쪽이 졌어요",
  })[r] || "";
  function roundLine(res, me, ctx) {
    const nm = s => me === s ? "나" : me >= 0 ? "상대" : esc(nameOf(ctx, s));
    const tagC = s => nm(s) === COL[s] ? "" : `(${COL[s]})`;
    if (res.w < 0) return `🤝 ${res.r}판 무승부 — ${res.why === "stall3" ? "3:3 교착 10턴" : "빼기 없이 100수, 말 수 같음"} · 이 판은 다시 해요`;
    return `${me < 0 ? "🏆" : me === res.w ? "🏆" : "😵"} ${res.r}판 ${nm(res.w)}${tagC(res.w)} 승 — ${whyTxt(res.why, nm(res.w), nm(1 - res.w))}`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, play = V.phase === "play" && !over, can = !!ctx.canAct && me >= 0 && play && V.turn === me;
    const S = selFor(V, ctx);
    const L = can ? K.legal(V, me) : [];
    const placeT = new Set(), moveF = new Map(), rmT = new Set();
    for (const a of L) {
      if (a.t === "place") placeT.add(a.to);
      else if (a.t === "remove") rmT.add(a.at);
      else { if (!moveF.has(a.from)) moveF.set(a.from, new Set()); moveF.get(a.from).add(a.to); }
    }
    if (S.from >= 0 && !moveF.has(S.from)) S.from = -1;
    const tg = S.from >= 0 ? moveF.get(S.from) : null;
    const o = { labels: true, pl: S.from < 0 ? placeT : null, mv: S.from < 0 ? new Set(moveF.keys()) : null, sel: new Set(S.from >= 0 ? [S.from] : []), tg: tg || null, rm: rmT };
    // 상대가 뺄 말을 고르는 중이면 내 말 중 빠질 수 있는 것을 보여 줌
    if (play && V.rem && !can) o.rm = new Set(K.removable(V.cells, 1 - V.turn));
    if (play && V.rem) { o.ml = new Set([].concat(...(V.mill || []))); o.millLines = V.mill || []; }
    const L0 = V.last;
    if (L0 && play) { o.lm = new Set(L0.t >= 0 ? [L0.t] : []); o.lf = new Set(L0.f >= 0 && !V.cells[L0.f] ? [L0.f] : []); if (L0.rm >= 0 && !V.cells[L0.rm]) o.x = new Set([L0.rm]); }
    if (ctx.coachOn && play) {
      const vme = me >= 0 ? me : V.turn;
      o.bang = new Set(K.threatsOf(V.cells, V.hand, 1 - vme).map(t => t.empty));
      o.star = new Set(K.threatsOf(V.cells, V.hand, vme).map(t => t.empty));
    }

    // 윗줄 · 놓을 말
    const turnTxt = over ? "끝" : V.phase === "between" ? "판 끝" : can ? (V.rem ? "🎯 뺄 말 고르기" : "내 차례") : `${esc(nameOf(ctx, V.turn))} 차례`;
    const stepTxt = !play ? "" : V.rem ? "밀!" : V.hand[V.turn] > 0 ? "놓기" : V.fly[V.turn] ? "날기" : "옮기기";
    let h = `<div class="mo-top"><span class="mo-pill ${over || !play ? "" : can ? (V.rem ? "rm" : "me") : "turn"}">${turnTxt}</span>`;
    if (stepTxt) h += `<span class="mo-pill sm">${stepTxt}</span>`;
    h += `</div>`;
    const bot = me >= 0 ? me : 0, top = 1 - bot;
    const lab = s => me >= 0 ? `${s === me ? "나" : "상대"} ${DOT[s]}` : `${nameOf(ctx, s)} ${DOT[s]}`;
    h += `<div class="mo-hands">${handHtml(V, top, lab(top), play && V.turn === top)}${handHtml(V, bot, lab(bot), play && V.turn === bot)}</div>`;
    h += boardHtml(V.cells, o);

    // 아래 안내
    let info, ic = "";
    if (over) {
      const w = V.wins[0] === V.wins[1] ? -1 : V.wins[0] > V.wins[1] ? 0 : 1;
      if (w < 0) { info = `🤝 무승부 — 판 승 ${V.wins[0]} : ${V.wins[1]}`; ic = " end mid"; }
      else { info = `${me < 0 ? `🏆 ${esc(nameOf(ctx, w))}(${COL[w]})` : me === w ? "🏆 내" : "😵 상대"} 승리! 판 승 ${V.wins[w]} : ${V.wins[1 - w]}`; ic = me >= 0 && me !== w ? " end bad" : " end"; }
    } else if (V.phase === "between" && V.res) {
      info = `${roundLine(V.res, me, ctx)} · 곧 ${V.round + 1}판을 시작해요`; ic = V.res.w < 0 ? " end mid" : me >= 0 && me !== V.res.w ? " end bad" : " end";
    } else if (can) {
      if (V.rem) info = `🎯 <b>밀 완성!</b> 뺄 <b>상대 말</b>(빨간 테)을 눌러요${K.removable(V.cells, 1 - me).some(p => K.inMill(V.cells, p)) ? " — 상대 말이 모두 밀이라 아무거나 돼요" : " · 밀에 든 말은 못 빼요"}`;
      else if (V.hand[me] > 0) info = `<b>빈 점</b>(금색 점선)을 눌러 말을 놓아요 · 남은 말 ${V.hand[me]}개`;
      else if (S.from >= 0) info = `옮길 <b>빈 점</b>(초록 점선)을 눌러요 · 그 말을 다시 누르면 취소`;
      else info = V.fly[me] ? `말이 3개 — <b>아무 빈 점</b>으로 날 수 있어요. 옮길 내 말을 눌러요` : `옮길 <b>내 말</b>을 누르고, 선을 따라 이웃 빈 점으로 한 칸`;
      if (V.q3 > 0) info += ` · 교착 ${V.q3}/${V.Q3}수`;
    } else {
      const nm = nameOf(ctx, V.turn);
      info = V.rem ? `${esc(nm)}${ga(nm)} 밀을 만들어 뺄 말을 고르는 중…` : `${esc(nameOf(ctx, V.turn))} 차례예요…`;
      if (V.q3 > 0) info += ` · 교착 ${V.q3}/${V.Q3}수`;
    }
    h += `<div class="mo-info${ic}"><span>${info}</span></div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      const b = e.target.closest("[data-c]"); if (!b || !ctx.canAct || me < 0 || !play) return;
      const c = +b.dataset.c;
      if (V.rem) {
        if (rmT.has(c)) { ctx.sfx("pop"); ctx.act({ t: "remove", at: c }); return; }
        ctx.toast(V.cells[c] === 2 - me ? "밀(3개 한 줄)에 든 말은 못 빼요" : "빨간 테가 있는 상대 말을 눌러요", 1400);
        return;
      }
      if (S.from >= 0 && tg && tg.has(c)) { const from = S.from; S.from = -1; ctx.sfx("pop"); ctx.act({ t: "move", from, to: c }); return; }
      if (placeT.has(c)) { ctx.sfx("pop"); ctx.act({ t: "place", to: c }); return; }
      if (V.cells[c] === me + 1 && V.hand[me] === 0) {
        if (moveF.has(c)) { S.from = S.from === c ? -1 : c; ctx.sfx("tap"); render(stage, V, ctx); return; }
        ctx.toast("그 말은 옮길 빈 점이 없어요", 1300); return;
      }
      if (V.cells[c] && V.hand[me] > 0) { ctx.toast(`아직 놓을 말이 ${V.hand[me]}개 — 빈 점에 놓아요`, 1400); return; }
      if (S.from >= 0) { S.from = -1; render(stage, V, ctx); }
    };
  }

  // ── 선생님 (판이 모두 공개라 보이는 것 그대로) ──
  const L = i => LBL[i];
  const list = a => [...new Set(a)].sort((x, y) => x - y).map(L).join(" · ");
  const actText = a => a.t === "place" ? `${L(a.to)} 에 말 놓기` : a.t === "move" ? `${L(a.from)} 말을 ${ro(L(a.to))} 옮기기` : `${L(a.at)} 의 상대 말 빼기`;
  function whyText(V, me, r) {
    const t = r.tags, out = [];
    if (t.includes("win")) out.push("상대 말이 2개가 돼서 이 판을 이겨요");
    if (t.includes("mill")) out.push(`밀이 완성돼서 상대 말을 하나 빼요${r.rm >= 0 ? ` (${eul(L(r.rm))} 빼면 좋아요)` : ""}`);
    if (t.includes("breakTwo")) out.push("상대가 곧 밀을 만들려던 줄의 말이라, 빼면 위협이 사라져요");
    else if (t.includes("breakRun")) out.push("상대가 밀 자리로 옮겨 오려던 말이라, 빼면 위협이 줄어요");
    if (t.includes("block")) out.push("상대가 다음에 밀을 만들 빈 점을 먼저 막아요");
    if (t.includes("two")) out.push("내 말 2개 + 빈 점 1개 줄이 생겨 다음 차례에 밀을 노려요");
    if (t.includes("open")) out.push("밀을 잠깐 열어서 다음에 다시 닫으면 또 뺄 수 있어요");
    if (t.includes("fly")) out.push("말이 3개라 멀리 날아가요");
    if (t.includes("skipMill")) out.push(`${L(r.millAt)} 에서 밀을 바로 만들 수도 있지만, 몇 수 앞까지 읽어 보면 이 수가 더 나아요 (밀 자리는 그대로 남거나 상대의 더 큰 위협을 먼저 막아요)`);
    if (t.includes("cantBlock")) out.push(`상대 밀 자리(${list(r.opE)})로 갈 수 있는 내 말이 없어서 막을 수는 없어요 — 대신 다음을 준비해요`);
    else if (t.includes("noBlock")) out.push(`상대 밀 자리(${list(r.opE)})를 막는 것보다 이 수가 낫다고 읽었어요`);
    else if (r.oppAfter > 0 && !t.includes("mill") && !t.includes("win")) out.push(`다만 이 수 뒤에도 상대가 밀을 만들 자리가 ${r.oppAfter}곳 남아요`);
    if (t.includes("squeeze")) out.push(`상대가 움직일 수 있는 길이 ${r.mob[0]}개 → ${r.mob[1]}개로 줄어요 (하나도 없으면 상대 패)`);
    if (V.rem && !out.length) out.push("밀 밖의 말 중에서 상대에게 가장 쓸모 있는 말을 골랐어요");
    if (!V.rem && !out.length && !r.oppAfter) out.push("상대에게 밀 자리를 내주지 않는 안전한 수예요");
    return out.length ? out.join(" · ") : "큰 위험도 큰 이득도 없는 무난한 수예요";
  }
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, A = K.analyze(V, me), play = V.phase === "play" && !V.over;
    // 👀 상대 흐름
    const evs = V.log.filter(e => e.i > since && e.s === opp && (e.k === "pl" || e.k === "mv" || e.k === "rm"));
    const p = [];
    if (!evs.length) p.push(V.ply === 0 && V.round === 1 ? "아직 아무도 말을 두지 않았어요." : "내 지난 차례 뒤 상대가 둔 수는 없어요.");
    else {
      const parts = evs.slice(-3).map(e => e.k === "pl" ? `${L(e.to)} 에 놓음${e.mill ? "(밀!)" : ""}` : e.k === "mv" ? `${L(e.from)} → ${L(e.to)}${e.fly ? " 날기" : ""}${e.mill ? "(밀!)" : ""}` : `내 ${L(e.at)} 말을 뺌`);
      p.push(`상대: ${parts.join(" · ")}${evs.length > 3 ? ` (그 전 ${evs.length - 3}번 더)` : ""}.`);
    }
    if (play) {
      if (A.opp.length) p.push(`상대가 다음 차례에 ${list(A.opp.map(t => t.empty))} 에 말을 넣으면 밀이에요 — 판에 '!' 로 표시했어요.`);
      else p.push("지금 상대가 바로 만들 수 있는 밀은 없어요.");
    }
    // 📊 내 흐름
    let m = `내 말 ${V.total[me]}개 (판 위 ${V.board[me]} · 놓을 말 ${V.hand[me]}) · 상대 ${V.total[opp]}개.`;
    if (V.bo === 3) m += ` 판 승 ${V.wins[me]} : ${V.wins[opp]} (2승이면 끝).`;
    if (play && A.me.length) m += ` 내가 ${list(A.me.map(t => t.empty))} 에 넣으면 밀 (★).`;
    if (play && V.fly[me]) m += " 내 말이 3개라 날 수 있어요 — 2개가 되면 져요.";
    if (play && V.fly[opp]) m += " 상대는 말이 3개라 아무 데로나 날아와요 — 내 2개 줄을 조심!";
    if (play && V.q3 > 0) m += ` 교착 ${V.q3}/${V.Q3}수 — 빼기 없이 ${V.Q3}수가 되면 말이 적은 쪽이 져요.`;
    // 💡 추천 · 👉 뜻
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (V.phase !== "play") rec = "판이 끝났어요 — 다음 판을 준비해요.";
    else if (V.turn !== me) rec = "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else if (!A.rec) rec = "둘 수 있는 수가 없어요.";
    else { rec = `${actText(A.rec.a)}${A.rec.rm >= 0 ? ` → 밀 완성, 그다음 ${L(A.rec.rm)} 의 상대 말 빼기` : ""}.`; why = whyText(V, me, A.rec); }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J || J.my === null || J.best === null) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요" };
    const W = J.WINV - 50, loss = Math.max(0, Math.round(J.best - J.my));
    const ex = a => K.explain(Vb, seat, a), em = ex(myA), eb = ex(bestA), has = (e, t) => e.tags.includes(t);
    let sev, why;
    if (J.best >= W && J.my < W) { sev = 100; why = `고급 AI 의 수(${actText(bestA)})면 몇 수 안에 이 판을 이기는 길이 있었어요`; }
    else if (J.my <= -W && J.best > -W) { sev = 100; why = `이 수 뒤엔 상대가 몇 수 안에 이기는 길이 생겨요 — ${actText(bestA)} 로 버틸 수 있었어요`; }
    else {
      sev = loss >= 150 ? 90 : loss >= 90 ? 75 : loss >= 60 ? 60 : loss >= 30 ? 40 : loss > 8 ? 20 : 5;
      const r = [];
      if (Vb.rem) {
        if (has(eb, "breakTwo") && !has(em, "breakTwo")) r.push("상대가 곧 밀을 만들 줄의 말을 빼야 했어요");
        else if (has(eb, "breakRun") && !has(em, "breakRun")) r.push("밀 자리로 옮겨 올 상대 말을 빼야 했어요");
      } else {
        if (has(eb, "mill") && !has(em, "mill")) r.push("그때 밀을 만들어 상대 말 하나를 뺄 수 있었어요");
        if (has(eb, "block") && !has(em, "block")) r.push(`상대 밀 자리(${list(eb.opE)})를 막아야 했어요`);
        if ((em.oppAfter || 0) > (eb.oppAfter || 0)) r.push(`내 수 뒤 상대 밀 자리가 ${em.oppAfter}곳 (고급 AI 수 뒤엔 ${eb.oppAfter || 0}곳)`);
        if (has(eb, "squeeze") && !has(em, "squeeze")) r.push(`고급 AI 수는 상대 길을 ${eb.mob[0]} → ${eb.mob[1]}개로 줄여요`);
      }
      why = loss <= 8 ? `고급 AI: ${actText(bestA)} — 몇 수 앞까지 읽어도 내 수와 거의 같은 값이에요 (차이 ${loss}점, 말 1개 = 100점)`
        : `고급 AI: ${actText(bestA)} — 몇 수 앞까지 읽으면 내 수보다 약 ${loss}점 나아요 (말 1개 = 100점)${r.length ? " · " + r.join(" · ") : ""}`;
    }
    return { sev, why, my: actText(myA), best: actText(bestA) };
  }

  function result(V, me) {
    const ctx = {};
    const rows = V.hist.map(r => roundLine(r, me, ctx)).join("<br>");
    const w = V.wins[0] === V.wins[1] ? -1 : V.wins[0] > V.wins[1] ? 0 : 1;
    const head = w < 0 ? `<b>무승부</b> — 판 승 ${V.wins[0]} : ${V.wins[1]}` : `<b>${me === w ? "나" : me >= 0 ? "상대" : COL[w]}${me >= 0 ? `(${COL[w]})` : ""} 승리</b> — 판 승 ${V.wins[w]} : ${V.wins[1 - w]}`;
    return `${head}<br>${rows}`;
  }

  // ── 1분 규칙 ──
  const put = (...xs) => { const c = Array(NP).fill(0); xs.forEach(([col, ...is]) => is.forEach(i => { c[i] = col; })); return c; };
  const S_ = a => new Set(a);
  function tutorial() {
    style();
    const tb = (cells, o) => `<div class="mo-tut">${boardHtml(cells, Object.assign({ btn: false }, o))}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "직선 세 점 = 밀", body: "선으로 이어진 <b>세 점</b>에 내 말 3개를 나란히 두면 <b>밀</b>! 밀을 만들 때마다 <b>상대 말 1개를 빼요</b>. 상대 말을 2개로 만들거나 못 움직이게 하면 이겨요.",
        boardHtml: tb(put([1, 21, 22, 23], [2, 3, 13, 16]), { ml: S_([21, 22, 23]), millLines: [[21, 22, 23]] }), ms: 5600 },
      { tag: "STEP 2 · 놓기", title: "9개씩 번갈아 놓기", body: "검정 · 하양 말 <b>9개씩</b>. 선공부터 번갈아 <b>빈 점</b>에 하나씩 놓아요. 9개를 다 놓기 전엔 <b>옮길 수 없어요</b>. 놓다가 밀이 되어도 바로 빼요!",
        boardHtml: tb(put([1, 4, 10], [2, 7, 13]), { pl: S_([0, 1, 2, 9, 11, 21, 22]) }), ms: 5600 },
      { tag: "STEP 3 · 옮기기", title: "선을 따라 한 칸", body: "다 놓은 뒤엔 내 말 하나를 <b>선을 따라 이웃한 빈 점</b>으로 한 칸 옮겨요(초록 점선). 대각선은 없어요. 움직일 말이 하나도 없으면 <b>져요</b>.",
        boardHtml: tb(put([1, 4, 9, 11, 22], [2, 1, 7, 13]), { sel: S_([4]), tg: S_([3, 5]) }), ms: 5600 },
      { tag: "STEP 4 · 빼기", title: "밀에 든 말은 못 빼요", body: "밀을 만들면 상대 말을 빼는데, 상대의 <b>밀(3개 한 줄)에 든 말은 못 빼요</b>(빨간 테만 가능). 상대 말이 모두 밀이면 아무거나 돼요.",
        boardHtml: tb(put([1, 21, 22, 23], [2, 3, 4, 5, 13, 16]), { ml: S_([21, 22, 23]), millLines: [[21, 22, 23]], rm: S_([13, 16]), lk: S_([3, 4, 5]) }), ms: 6000 },
      { tag: "STEP 5 · 직접", title: "밀을 만들고 빼 봐요", body: "검정 말 2개가 맨 아래 줄에 있어요. <b>남은 한 점</b>에 놓아 밀을 만들고, 빨간 테 <b>하양 말</b>을 빼 봐요!",
        interactive: { hint: "👆 g1 빈 점 → 빨간 테 말", doneText: "✅ 밀 완성 + 빼기! 이렇게 상대 말을 줄여요" },
        render(stage, ctrl) {
          const cells = put([1, 21, 22, 10], [2, 3, 4, 5, 14, 16]);
          let step = 0, msg = "맨 아래 줄의 <b>빈 점</b>(금색 점선)에 놓아 보세요";
          const draw = () => {
            const o = { btn: true };
            if (step === 0) { o.pl = S_([23]); o.tp = S_([23]); }
            else if (step === 1) { o.ml = S_([21, 22, 23]); o.millLines = [[21, 22, 23]]; o.rm = S_([14, 16]); o.tp = S_([14, 16]); }
            else { o.ml = S_([21, 22, 23]); o.millLines = [[21, 22, 23]]; }
            stage.innerHTML = `<div class="mo-tut">${boardHtml(cells, o)}<div class="mo-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || step === 2) return;
            const c = +b.dataset.c;
            if (step === 0) {
              if (c !== 23) { ctrl.sfx("tap"); msg = cells[c] ? "빈 점을 눌러요 — 검정 2개 옆 <b>g1</b>" : "그 점은 밀이 안 돼요. 검정 2개와 <b>같은 줄</b>의 빈 점!"; draw(); return; }
              cells[23] = 1; step = 1; ctrl.sfx("pop"); msg = "🎯 <b>밀 완성!</b> 이제 빨간 테 <b>하양 말</b>을 눌러 빼요"; draw(); return;
            }
            if (c === 14 || c === 16) { cells[c] = 0; step = 2; ctrl.sfx("win"); msg = "🏆 <b>하나 뺐어요!</b> 위쪽 하양 3개는 밀이라 못 빼요"; draw(); ctrl.complete(); return; }
            ctrl.sfx("tap"); msg = [3, 4, 5].includes(c) ? "그 말은 <b>밀</b>(하양 3개 한 줄)이라 못 빼요 — 빨간 테 말!" : "빨간 테가 있는 <b>하양 말</b>을 눌러요"; draw();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패", title: "3개면 날기 · 3판 2선승", body: "말이 <b>3개</b> 남으면 선을 안 따라 <b>아무 빈 점으로 날 수 있어요</b>. 말이 <b>2개</b>가 되거나 못 움직이면 그 판을 져요. 한쪽이 3개인 채 빼기 없이 <b>10턴</b>이면 말이 적은 쪽이 져요. <b>3판 2선승</b>! 🧑‍🏫 선생님이 '!'(상대 밀 자리)를 짚어 줘요.",
        boardHtml: tb(put([1, 0, 13, 22], [2, 4, 9, 10, 11, 16, 19]), { sel: S_([13]), tg: S_([1, 2, 3, 5, 6, 7, 8, 12, 14, 15, 17, 18, 20, 21, 23]) }), ms: 6800 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.morris = {
    name: "나인 멘스 모리스", emoji: "⚫", short: "세 점을 이어 밀 → 상대 말 빼기, 3판 2선승", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    src: SRC, diff: DIFF,
    opts: [{ k: "bo", label: "판 수", items: [[3, "3판 2선승 (방송)"], [1, "단판"]], def: 3 }],
    howto: [
      "🎯 목표: 상대 말을 <b>2개</b>로 만들거나 <b>못 움직이게</b> 하면 그 판 승 · <b>3판 2선승</b>",
      "점 24개 판, 검정 · 하양 말 <b>9개씩</b>. 선공부터 번갈아 <b>빈 점에 놓기</b> — 9개를 다 놓을 때까지 옮기기 없음",
      "다 놓은 뒤엔 내 말 하나를 <b>선을 따라 이웃한 빈 점</b>으로 한 칸 (대각선 없음)",
      "선으로 이어진 세 점에 내 말 3개 = <b>밀</b> → 상대 말 1개 빼기 (상대의 <b>밀에 든 말은 못 뺌</b>)",
      "내 말이 <b>3개</b>면 아무 빈 점으로 <b>날기</b> · 한쪽이 3개인 채 교착 <b>10턴</b>이면 말이 적은 쪽 패",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => `${V.over ? "끝" : V.bo === 3 ? `${V.round}판` : `단판${V.round > 1 ? ` (${V.round}번째)` : ""}`}${V.bo === 3 || V.over ? ` · ${DOT[0]}${V.wins[0]} : ${V.wins[1]}${DOT[1]}` : ""}`,
    chip: (V, i) => ({ t: `${DOT[i]}${V.total[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: a => actText(a),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

/* 베니 서바이벌 · 링 더 벨 — 화면 (교환 · 벨 · 포카드 · 2:2 조합 골라 공개 · 결과 · 1분 규칙 · AI 선생님) */
(() => {
  "use strict";
  const K = window.SVCores.ringbell;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const col = K.col, num = K.num, cname = K.cname;
  const SY = ["●", "■", "▲", "◆"];                         // 색마다 모양도 달리 (색약 배려)
  const CSS = `
.rb-top{display:flex;align-items:center;gap:6px;flex:none;min-height:24px}
.rb-rd{font:900 12.5px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:2px 9px;white-space:nowrap}
.rb-ph{font:800 12px var(--round);color:#fde68a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rb-wins{margin-left:auto;font:800 12px var(--round);color:#e2e8f0;white-space:nowrap}
.rb-ops{display:grid;gap:4px;flex:none}
.rb-op{display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:6px;align-items:center;min-height:40px;padding:3px 6px;border-radius:11px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.09)}
.rb-op.now{border-color:#fde68a;background:rgba(245,179,1,.08)}
.rb-op.mate{box-shadow:inset 3px 0 0 #4ade80}
.rb-op.foe{box-shadow:inset 3px 0 0 #fb7185}
.rb-nm{display:grid;line-height:1.15;min-width:0}
.rb-nm b{font:800 12.5px var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-nm small{font:700 10.5px var(--round);color:#fb7185;letter-spacing:-.5px;white-space:nowrap}
.rb-nm small.t{color:var(--soft)}
.rb-cs{display:flex;gap:3px;align-items:center;min-width:0;flex-wrap:nowrap}
.rb-st{font:800 11px var(--round);color:#fde68a;white-space:nowrap;text-align:right}
.rb-st.lose{color:#fb7185}
.rb-c{--cc:#64748b;position:relative;display:grid;place-items:center;flex:none;border-radius:7px;background:var(--cc);color:#fff;border:2px solid rgba(255,255,255,.85);font:900 15px/1 var(--round);width:26px;height:34px;box-shadow:0 1px 2px rgba(0,0,0,.35)}
.rb-c i{position:absolute;top:1px;left:2px;font:700 8px/1 sans-serif;font-style:normal;opacity:.9}
.rb-c.c2{color:#422006}
.rb-c.back{background:repeating-linear-gradient(45deg,#1e293b 0 4px,#273449 4px 8px);border-color:#475569;color:#94a3b8;font-size:12px}
.rb-c.dim{opacity:.35}
.rb-c.on{outline:2px solid #fde68a;outline-offset:1px}
.rb-c.L{width:46px;height:62px;font-size:24px;border-radius:9px}
.rb-c.L i{font-size:11px;top:3px;left:4px}
.rb-c.empty{background:transparent;border:1.5px dashed rgba(255,255,255,.25);box-shadow:none}
.rb-mid{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:10px;align-items:center;flex:none;padding:4px 2px}
.rb-pile{display:grid;justify-items:center;gap:2px}
.rb-pile small{font:800 10.5px var(--round);color:var(--soft);white-space:nowrap}
.rb-disc{display:grid;gap:2px;min-width:0}
.rb-disc small{font:700 10.5px var(--round);color:var(--soft)}
.rb-disc .rb-cs{flex-wrap:wrap;gap:2px}
.rb-disc .rb-c{width:20px;height:27px;font-size:11.5px;border-width:1.5px}
.rb-disc .rb-c i{display:none}
.rb-bell{flex:none;text-align:center;font:800 12.5px var(--round);color:#fde68a;background:rgba(245,179,1,.1);border:1px solid rgba(245,179,1,.35);border-radius:10px;padding:4px 8px}
.rb-me{display:grid;gap:4px;flex:none}
.rb-hand{display:flex;gap:6px;justify-content:center}
.rb-h{position:relative;display:grid;place-items:center;flex:1 1 0;max-width:62px;min-height:66px;border-radius:10px;background:var(--cc);color:#fff;border:2.5px solid rgba(255,255,255,.85);font:900 25px/1 var(--round);padding:0}
.rb-h i{position:absolute;top:4px;left:5px;font:700 11px/1 sans-serif;font-style:normal}
.rb-h small{position:absolute;bottom:3px;left:0;right:0;text-align:center;font:800 9px/1 var(--round);opacity:.9}
.rb-h.c2{color:#422006}
.rb-h.on{box-shadow:0 0 0 3px #fde68a}
.rb-h.sel{transform:translateY(-5px);box-shadow:0 0 0 3px #fff,0 4px 10px rgba(0,0,0,.5)}
.rb-h.new::after{content:"새";position:absolute;top:-7px;right:-5px;font:900 10px/1 var(--round);color:#0f172a;background:#fde68a;border-radius:99px;padding:2px 4px}
.rb-h.x{opacity:.45}
.rb-sum{text-align:center;font:800 12px var(--round);color:#e2e8f0;line-height:1.35}
.rb-sum b{color:#fde68a}
.rb-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.rb-note{text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.rb-note b{color:#fde68a}
.rb-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.rb-two.one{grid-template-columns:1fr}
.rb-two .btn{min-height:46px;padding:6px 4px;font:800 13.5px/1.2 var(--round)}
.rb-two .btn small{display:block;font:700 10.5px var(--round);opacity:.85}
.rb-res{flex:none;text-align:center;font:800 12.5px var(--round);color:#fde68a;line-height:1.45}
.rb-res .w{color:#86efac}
.rb-res .l{color:#fb7185}
.rb-tut{display:grid;gap:8px;justify-items:center;width:100%}
.rb-tut small{font-size:12px;color:var(--soft);text-align:center;line-height:1.45}
.rb-tut .rb-hand{width:100%;max-width:330px}
.rb-tut .rb-cs{justify-content:center;flex-wrap:wrap}
.rb-w{display:contents}
.rb-hp{color:#fb7185;letter-spacing:-1px}
.rb-w.n3 .rb-op,.rb-w.n4 .rb-op{min-height:34px;padding:2px 6px}
.rb-w.n3 .rb-c,.rb-w.n4 .rb-c{width:23px;height:30px;font-size:13.5px}
.rb-w.n3 .rb-c.L,.rb-w.n4 .rb-c.L{width:38px;height:50px;font-size:20px}
.rb-w.n4 .rb-nm{grid-auto-flow:column;justify-content:start;gap:4px;align-items:center}
.rb-w.n4 .rb-op{grid-template-columns:84px minmax(0,1fr) auto}
.rb-w.n3 .rb-mid,.rb-w.n4 .rb-mid{padding:0 2px}
.rb-w.n3 .rb-h,.rb-w.n4 .rb-h{min-height:54px;font-size:22px}
.rb-w.n4 .rb-bell{padding:2px 8px;font-size:12px}
.rb-w.n4 .rb-note{font-size:12px;line-height:1.3}
.sv-coachfit .rb-w.n4 .rb-bell,.sv-coachfit .rb-w.n4 .rb-sum{display:none}
.sv-coachfit .rb-w.n3 .rb-op,.sv-coachfit .rb-w.n4 .rb-op{min-height:26px;padding:1px 6px}
.sv-coachfit .rb-w.n3 .rb-c,.sv-coachfit .rb-w.n4 .rb-c{width:19px;height:24px;font-size:11.5px;border-width:1.5px}
.sv-coachfit .rb-w .rb-c i{display:none}
.sv-coachfit .rb-w.n3 .rb-c.L,.sv-coachfit .rb-w.n4 .rb-c.L{width:30px;height:40px;font-size:16px}
.sv-coachfit .rb-w.n4 .rb-pile small{font-size:9.5px}
.sv-coachfit .rb-w.n3 .rb-h,.sv-coachfit .rb-w.n4 .rb-h{min-height:44px;font-size:18px}
.sv-coachfit .rb-top,.sv-coachfit .rb-note,.sv-coachfit .rb-disc small{display:none}
.sv-coachfit .rb-op{min-height:30px;padding:1px 6px}
.sv-coachfit .rb-c{width:22px;height:28px;font-size:13px}
.sv-coachfit .rb-c.L{width:36px;height:48px;font-size:19px}
.sv-coachfit .rb-mid{padding:0 2px}
.sv-coachfit .rb-h{min-height:48px;font-size:20px}
.sv-coachfit .rb-h small{display:none}
.sv-coachfit .rb-sum{font-size:11px}
.sv-coachfit .rb-bell{padding:2px 6px;font-size:11.5px}
.sv-coachfit .rb-two .btn{min-height:44px;padding:3px 4px}`;
  const CC = ["#dc2626", "#2563eb", "#eab308", "#16a34a"];
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [], SEL = { key: "" };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const josa = (name, a, b) => { const ch = String(name).slice(-1), c = ch.charCodeAt(0); return `${name}${(c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch)) ? a : b}`; };
  const ga = (name, isMe) => (isMe ? "내가" : josa(name, "이", "가"));
  const sumOf = cs => cs.reduce((x, c) => x + num(c), 0);
  const comboTxt = cs => (!cs || !cs.length ? "—" : cs.length === 1 ? `${cname(cs[0])}` : num(cs[0]) === num(cs[1]) ? `${cs.map(c => K.CN[col(c)]).join("·")} ${num(cs[0])}` : `${K.CN[col(cs[0])]} ${cs.map(num).join("+")}`);
  const hearts = n => (n > 0 ? "❤".repeat(n) : "💀");
  const heartsH = n => (n > 0 ? `<span class="rb-hp">${"❤".repeat(n)}</span>` : "💀");
  const card = (c, cls) => (c < 0 ? `<span class="rb-c back ${cls || ""}">?</span>` : `<span class="rb-c c${col(c)} ${cls || ""}" style="--cc:${CC[col(c)]}" title="${cname(c)}"><i>${SY[col(c)]}</i>${num(c)}</span>`);
  const back = cls => `<span class="rb-c back ${cls || ""}">?</span>`;
  const teamTxt = (V, ctx, t) => V.teams[t].map(s => (s === ctx.me ? "나" : nameOf(ctx, s))).join("·");

  // 다른 사람 한 줄: 이름 · 목숨 · 손패(아는 카드는 앞면) · 상태
  function opRow(V, ctx, j) {
    const me = ctx.me, open = V.phase === "show" || V.over, R = open ? V.res : null, shown = V.shown && V.shown[j];
    const hn = V.handN[j], known = V.known[j] || [], all = V.hands ? V.hands[j] : null;
    let cs = "";
    if (R && R.combo[j] && R.combo[j].length) {
      const cmb = R.combo[j];
      cs = cmb.map(c => card(c, "on")).join("") + (all ? all.filter(c => !cmb.includes(c)).map(c => card(c, "dim")).join("") : Array(Math.max(0, hn - cmb.length)).fill(back("dim")).join(""));
    } else if (shown) {
      cs = shown.map(c => card(c, "on")).join("") + (all ? all.filter(c => !shown.includes(c)).map(c => card(c, "dim")).join("") : Array(Math.max(0, hn - shown.length)).fill(back("dim")).join(""));
    } else if (all) cs = all.map(c => card(c, known.includes(c) ? "on" : "")).join("");
    else cs = known.map(c => card(c, "on")).join("") + Array(Math.max(0, hn - known.length)).fill(back()).join("");
    let st = "", lose = false;
    if (R) { st = R.kind === "four" ? (R.lost[j] ? `−${R.lost[j]}` : j === R.who ? "🀄" : "") : `${R.sums[j]}${R.lost[j] ? ` −${R.lost[j]}` : ""}`; lose = R.lost[j] > 0; }
    else if (shown) st = `= ${sumOf(shown)}`;
    else if (V.bell === j) st = "🔔";
    else if (V.cur === j && !V.over) st = V.phase === "drop" ? "버리는 중" : V.phase === "reveal" ? "고르는 중" : "차례";
    const team = V.teams.length === 2 && V.n === 4 && me >= 0 ? (V.teamOf[j] === V.teamOf[me] ? " mate" : " foe") : "";
    return `<div class="rb-op${V.cur === j && !open && !V.over ? " now" : ""}${team}"><span class="rb-nm"><b>${esc(nameOf(ctx, j))}</b><small${V.lives[j] ? "" : ' class="t"'}>${team === " mate" ? "🤝" : ""}${hearts(V.lives[j])}</small></span><span class="rb-cs">${cs}</span><span class="rb-st${lose ? " lose" : ""}">${esc(st)}</span></div>`;
  }

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, ph = V.phase, over = V.over, actor = ctx.canAct && me >= 0 && V.needs.includes(me) && !over;
    const key = `${ctx.g}|${V.round}|${V.set}|${ph}|${V.turns}|${V.cur}|${V.rv ? V.rv.k : -1}`;
    if (SEL.key !== key) SEL = { key, drop: -1, show: null };
    const open = ph === "show" || over, R = open ? V.res : null;
    const phTxt = over ? "끝" : ph === "turn" ? (V.bell >= 0 ? "벨 뒤 한 번씩 교환" : "교환 · 벨") : ph === "drop" ? "버리기" : ph === "reveal" ? "조합 공개" : "결과";
    const winsTxt = V.teams.length === 2 ? `${V.R > 1 ? `${V.need}선승 · ` : ""}${V.wins[me >= 0 ? V.teamOf[me] : 0]} : ${V.wins[me >= 0 ? 1 - V.teamOf[me] : 1]}` : me >= 0 ? `라운드 ${V.wins[V.teamOf[me]]}승` : "";
    let h = `<div class="rb-top"><span class="rb-rd">${V.round}/${V.R}R · ${V.set}세트</span><span class="rb-ph">${phTxt}</span><span class="rb-wins">${esc(winsTxt)}</span></div>`;
    // 다른 사람 (차례 순서: 내 다음부터)
    const others = []; for (let k = 1; k <= V.n; k++) { const j = ((me >= 0 ? me : -1) + k + V.n) % V.n; if (j !== me) others.push(j); }
    if (me < 0) others.sort((a, b) => a - b);
    h += `<div class="rb-ops">${others.map(j => opRow(V, ctx, j)).join("")}</div>`;
    // 가운데: 더미 · 앞면 · 깔린 카드
    const disc = V.disc.slice(-8);
    h += `<div class="rb-mid"><span class="rb-pile">${V.deckN ? back("L") : `<span class="rb-c L empty"></span>`}<small>더미 ${V.deckN}</small></span><span class="rb-pile">${V.up >= 0 ? card(V.up, "L") : `<span class="rb-c L empty"></span>`}<small>앞면</small></span><span class="rb-disc"><small>깔린 카드 ${V.disc.length}${V.disc.length > 8 ? " (최근 8)" : ""}</small><span class="rb-cs">${disc.map(c => card(c)).join("")}</span></span></div>`;
    if (!open && V.bell >= 0 && (ph === "turn" || ph === "drop")) h += `<div class="rb-bell">🔔 ${esc(ga(me === V.bell ? "나" : nameOf(ctx, V.bell), me === V.bell))} 벨! 남은 사람이 한 번씩 바꾼 뒤 공개 (${V.after.length + 1}명 남음)</div>`;
    if (!open && ph === "reveal") h += `<div class="rb-bell">${V.rv.kind === "deck" ? "더미가 떨어졌어요" : `🔔 ${esc(ga(V.rv.who === me ? "나" : nameOf(ctx, V.rv.who), V.rv.who === me))} 친 벨`} — 차례대로 조합 공개 (${V.rv.k}/${V.n})</div>`;
    // 결과
    if (R) {
      const m = Math.min(...R.sums), low = R.sums.map((x, j) => (x === m ? j : -1)).filter(j => j >= 0);
      let t = R.kind === "four" ? `🀄 ${esc(ga(R.who === me ? "나" : nameOf(ctx, R.who), R.who === me))} 포카드! 상대 ${V.n === 4 ? "팀 모두" : "모두"} 목숨 −1` : `가장 낮은 합 ${m}: ${low.map(j => `${esc(j === me ? "나" : nameOf(ctx, j))} −${R.lost[j]}`).join(" · ")}${R.kind === "bell" && R.lost[R.who] === 2 ? " (벨 친 사람이라 −1 더)" : ""}`;
      if (V.rres) {
        const wonMe = me >= 0 && V.rres.win.includes(V.teamOf[me]);
        t += `<br><span class="${me < 0 ? "" : wonMe ? "w" : "l"}">${V.round}라운드 ${V.rres.win.map(x => esc(teamTxt(V, ctx, x))).join(" · ")} 승${V.rres.why === "bell" ? " (함께 0 → 마지막 벨)" : V.rres.why === "lot" ? " (추첨)" : V.rres.why === "lives" ? " (목숨 합)" : ""}</span>`;
      }
      h += `<div class="rb-res">${t}</div>`;
    }
    // 내 손패
    let mine = "", acts = "";
    if (me >= 0 && V.hand) {
      const hand = V.hand, b = K.best(hand), isShow = ph === "reveal" && actor;
      if (isShow && !SEL.show) SEL.show = b.cards.slice();
      const myShown = (V.shown && V.shown[me]) || (R && R.combo[me] && R.combo[me].length ? R.combo[me] : null);
      const hi = isShow ? SEL.show : myShown || b.cards;
      const isDrop = ph === "drop" && actor;
      mine = `<div class="rb-me"><div class="rb-hand">${hand.map(c => {
        const cls = `${hi.includes(c) ? " on" : ""}${(isDrop && SEL.drop === c) || (isShow && SEL.show.includes(c)) ? " sel" : ""}${ph === "drop" && V.got === c ? " new" : ""}${myShown && !myShown.includes(c) ? " x" : ""}`;
        const inner = `<i>${SY[col(c)]}</i>${num(c)}<small>${K.CN[col(c)]}</small>`;
        return isDrop || isShow ? `<button type="button" class="rb-h c${col(c)}${cls}" style="--cc:${CC[col(c)]}" data-c="${c}" aria-label="${cname(c)}">${inner}</button>` : `<span class="rb-h c${col(c)}${cls}" style="--cc:${CC[col(c)]}">${inner}</span>`;
      }).join("")}</div>`;
      let sumTxt;
      if (isShow) { const ok = K.validCombo(SEL.show); sumTxt = ok ? `고른 조합 <b>${esc(comboTxt(SEL.show))} = ${sumOf(SEL.show)}</b>${sumOf(SEL.show) < b.sum ? ` (가장 큰 조합 ${b.sum})` : ""}` : `같은 숫자끼리나 같은 색끼리만 함께 낼 수 있어요`; }
      else if (myShown) sumTxt = `내 공개 조합 <b>${esc(comboTxt(myShown))} = ${sumOf(myShown)}</b>`;
      else if (isDrop && SEL.drop >= 0) { const rest = hand.filter(c => c !== SEL.drop), rb = K.best(rest); sumTxt = `${esc(josa(cname(SEL.drop), "을", "를"))} 버리면 <b>${esc(comboTxt(rb.cards))} = ${rb.sum}</b>`; }
      else sumTxt = `가장 큰 조합 <b>${esc(comboTxt(b.cards))} = ${b.sum}</b> · 목숨 ${heartsH(V.lives[me])}`;
      mine += `<div class="rb-sum">${sumTxt}</div></div>`;
    }
    if (over) acts = `<div class="rb-note">아래 결과 창에서 라운드 결과를 볼 수 있어요</div>`;
    else if (me < 0) acts = `<div class="rb-note">구경 중이에요 · 모든 손패가 보여요 (밝은 카드 = 모두가 아는 카드)</div>`;
    else if (open) acts = `<div class="rb-note">${V.rres ? "곧 다음 라운드 — 목숨이 다시 3개, 선은 추첨" : `곧 다음 세트 · 선은 ${esc(R && R.order[0] === me ? "나" : nameOf(ctx, R ? R.order[0] : 0))}`}</div>`;
    else if (!actor) {
      const c = V.cur, who = esc(ga(c === me ? "나" : nameOf(ctx, c), c === me));
      acts = `<div class="rb-note">${ph === "reveal" ? `${who} 공개할 조합을 고르는 중…` : ph === "drop" ? `${who} 버릴 카드를 고르는 중…` : `${who} 고르는 중…`}${V.bell < 0 && ph !== "reveal" ? ` · 더미 ${V.deckN}장` : ""}</div>`;
    } else if (ph === "turn") {
      const after = V.bell >= 0, fv = K.fourV(V.hand);
      acts = `<div class="rb-note">${after ? "벨이 울렸어요 — <b>한 번</b> 바꿔요 (가져온 카드를 그대로 버려도 돼요)" : "앞면이나 더미에서 한 장 가져와 한 장 버려요 · 자신 있으면 벨!"}</div>`;
      acts += `<div class="rb-two"><button class="btn" data-a="up" ${V.up >= 0 ? "" : "disabled"}>⬆ 앞면 가져오기<small>${V.up >= 0 ? esc(cname(V.up)) : "없음"}</small></button><button class="btn" data-a="deck" ${V.deckN ? "" : "disabled"}>🂠 더미에서<small>${V.deckN}장 남음</small></button></div>`;
      if (!after) acts += `<div class="rb-two${fv ? "" : " one"}"><button class="btn primary" data-a="bell">🔔 벨 — 지금 합 ${K.best(V.hand).sum}</button>${fv ? `<button class="btn primary" data-a="four">🀄 포카드 ${fv}</button>` : ""}</div>`;
    } else if (ph === "drop") {
      acts = `<div class="rb-note">버릴 카드를 눌러요 · 가져온 카드 <b>${esc(cname(V.got))}</b>${V.src === "up" ? " (앞면 — 모두가 봤어요)" : ""}</div><div class="rb-two one"><button class="btn primary" data-a="drop" ${SEL.drop >= 0 ? "" : "disabled"}>${SEL.drop >= 0 ? `${esc(cname(SEL.drop))} 버리기` : "카드를 먼저 골라요"}</button></div>`;
    } else if (ph === "reveal") {
      const ok = K.validCombo(SEL.show);
      acts = `<div class="rb-note">카드를 눌러 조합을 골라요 (같은 숫자끼리 · 같은 색끼리)</div><div class="rb-two"><button class="btn" data-a="best">가장 큰 조합</button><button class="btn primary" data-a="show" ${ok ? "" : "disabled"}>공개${ok ? ` — 합 ${sumOf(SEL.show)}` : ""}</button></div>`;
    }
    h += `${mine}<div class="rb-acts">${acts}</div>`;
    stage.innerHTML = `<div class="rb-w n${V.n}">${h}</div>`;
    stage.onclick = e => {
      if (!actor) return;
      const hc = e.target.closest("[data-c]");
      if (hc) {
        const c = +hc.dataset.c; ctx.sfx("tap");
        if (ph === "drop") SEL.drop = SEL.drop === c ? -1 : c;
        else if (ph === "reveal") { const i = SEL.show.indexOf(c); if (i >= 0) SEL.show.splice(i, 1); else SEL.show.push(c); }
        render(stage, V, ctx); return;
      }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      ctx.sfx(a === "bell" || a === "four" || a === "show" ? "pop" : "tap");
      if (a === "up" || a === "deck") { ctx.act({ t: "take", src: a }); return; }
      if (a === "bell") { ctx.act({ t: "bell" }); return; }
      if (a === "four") { ctx.act({ t: "four" }); return; }
      if (a === "drop" && SEL.drop >= 0) { ctx.act({ t: "drop", c: SEL.drop }); return; }
      if (a === "show" && K.validCombo(SEL.show)) { ctx.act({ t: "show", cards: SEL.show.slice().sort((x, y) => num(x) - num(y) || x - y) }); return; }
      if (a === "best") SEL.show = K.best(V.hand).cards.slice();
      render(stage, V, ctx);
    };
  }

  // ── 결과 창 한 줄 더 ──
  function result(V, me) {
    const nm = i => esc(i === me ? "나" : String(NAMES[i] || `${i + 1}번`).slice(0, 5));
    const team = t => V.teams[t].map(nm).join("·");
    const rows = V.rounds.map(x => `<tr><td>${x.r}R</td><td><b>${x.win.map(team).join(" · ")}</b></td><td style="font-size:11px;color:var(--soft)">${x.why === "out" ? `${x.out.map(team).join(" · ")} 목숨 0` : x.why === "bell" ? "함께 0 → 마지막 벨" : x.why === "lives" ? "목숨 합" : "추첨"}</td></tr>`).join("");
    const life = V.teams.length > 2 ? `<div style="margin-top:4px;font-size:11.5px;color:var(--soft)">라운드마다 남은 목숨 합: ${V.lifeSum.map((x, i) => `${nm(i)} ${x}`).join(" · ")}</div>` : "";
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead><tr><th></th><th>이긴 쪽</th><th>까닭</th></tr></thead><tbody>${rows}</tbody></table>${life}<div style="margin-top:5px;font-size:11.5px;color:var(--soft)">방송: 2:2 팀전 · 3라운드 중 2라운드를 먼저 이긴 팀 생존</div>`;
  }

  // ── AI 선생님 (보이는 것만 — 💡 는 고급 AI 와 같은 계산) ──
  const pct = p => `${Math.round(p * 100)}%`;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const sgn = x => (x >= 0 ? "+" : "") + f1(x);
  const recTxt = (a, V) => !a ? "기다려요" : a.t === "take" ? (a.src === "up" ? `앞면 ${cname(V.up)} 가져오기` : "더미에서 한 장") : a.t === "bell" ? "🔔 벨 치기" : a.t === "four" ? "🀄 포카드 선언" : a.t === "drop" ? `${cname(a.c)} 버리기` : a.t === "show" ? `${comboTxt(a.cards)} 공개 (합 ${sumOf(a.cards)})` : "—";
  function flow(V, me, nm) {
    const L = V.log, bits = [];
    let start = -1;
    for (let i = L.length - 1; i >= 0; i--) { const e = L[i]; if (e.k === "set") { start = i; break; } if (e.s === me && (e.k === "drop" || e.k === "show")) { start = i; break; } }
    let take = null;
    for (const e of L.slice(start + 1)) {
      if (e.s === me) continue;
      if (e.k === "take") take = e;
      else if (e.k === "drop") { bits.push(`${nm(e.s)} ${take && take.s === e.s ? (take.src === "up" ? `앞면 ${cname(take.c)} 가져감` : "더미") : ""} → ${e.same ? "가져온 걸 그대로" : ""} ${cname(e.c)} 버림`.replace(/\s+/g, " ")); take = null; }
      else if (e.k === "bell") bits.push(`🔔 ${nm(e.s)} 벨`);
      else if (e.k === "show") bits.push(`${nm(e.s)} 공개 ${e.sum}`);
    }
    return bits;
  }
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    const teamTxt2 = t => V.teams[t].map(nm).join("·");
    if (V.over) { const W = V.teams.map((_, t) => V.wins[t]); return { opp: `끝 — ${V.teams.map((_, t) => `${teamTxt2(t)} ${W[t]}승`).join(" · ")}`, mine: me >= 0 ? `${V.ranks && V.ranks[me] === 0 ? "이겼어요!" : "아쉬워요"}` : "구경 중이었어요.", rec: me >= 0 && V.ranks && V.ranks[me] === 0 ? "수고했어요" : "한 판 더 해 봐요", why: "" }; }
    if (me < 0 || !V.hand) return { opp: `${V.round}라운드 ${V.set}세트 · 더미 ${V.deckN}장`, mine: "구경 중이에요.", rec: "누가 앞면에서 무엇을 가져가는지 보세요", why: "앞면에서 가져간 카드는 모두가 알아요 — 그 색 · 숫자를 모으는 중이라는 단서예요." };
    const fl = flow(V, me, nm);
    const knownTxt = V.known.map((k, j) => (j !== me && k.length ? `${nm(j)} ${k.map(cname).join("·")}` : "")).filter(Boolean);
    let opp = (fl.length ? `${fl.slice(-4).join(" · ")}` : `${V.set}세트 시작`) + (knownTxt.length ? ` · 아는 카드: ${knownTxt.join(", ")}` : "") + ` · 더미 ${V.deckN}장.`;
    const b = K.best(V.hand);
    const mine = `내 가장 큰 조합 ${comboTxt(b.cards)} = ${b.sum} · 목숨 ${V.lives[me]}${V.n === 4 ? ` · 팀원 ${nm(V.teams[V.teamOf[me]].find(s => s !== me))} 목숨 ${V.lives[V.teams[V.teamOf[me]].find(s => s !== me)]}` : ""} · ${V.R > 1 && V.teams.length === 2 ? `라운드 ${V.wins[V.teamOf[me]]} : ${V.wins[1 - V.teamOf[me]]}` : `${V.round}/${V.R}라운드`}`;
    if (!V.needs.includes(me)) {
      return { opp, mine, rec: "다른 사람 차례를 기다려요", why: V.phase === "reveal" ? "공개는 차례대로예요. 먼저 낸 합을 보고 뒤 사람이 고를 수 있어요." : `남이 앞면에서 가져간 카드(밝게 표시)는 그 사람이 모으는 색 · 숫자의 단서예요. 그 색 · 숫자는 앞면으로 버리지 않는 게 좋아요.` };
    }
    const H = K.recommend(V, me), a = H.a;
    const rec = recTxt(a, V);
    let why = "";
    if (V.phase === "reveal") {
      const U = H.U.slice().sort((x, y) => y.u - x.u), mineU = H.U.find(x => x.sum === H.best);
      why = (H.U.length > 1 ? `${V.rv.order.indexOf(me) === V.n - 1 ? "앞사람 공개 합을 다 보고" : `아직 안 낸 사람 손패를 ${K.S_REV}번 뽑아 보면`} — ` : "") + H.U.slice(0, 4).map(x => `합 ${x.sum} 내면 팀 득실 ${sgn(x.u)}`).join(" · ") + ".";
      if (H.pick < H.best) why += ` 가장 큰 ${H.best}보다 ${josa(H.pick, "을", "를")} 내면 ${sgn(U[0].u - mineU.u)} 나아요 — 팀원 대신 내가 맞는 '탱킹'이에요.`;
      else why += ` 가장 큰 조합을 그대로 내요.`;
      return { opp, mine, rec, why };
    }
    if (V.phase === "drop") {
      const L = H.L, alt = L.find(x => x.c !== a.c);
      why = `${josa(cname(a.c), "을", "를")} 버리면 남는 조합 ${L[0].sum} (한 장 더 볼 기대까지 ${f1(L[0].v)})${alt ? ` · 다음 후보 ${cname(alt.c)} 버리면 ${alt.sum} (${f1(alt.v)})` : ""}.`;
      if (V.bell < 0) { const nx = (me + 1) % V.n; if (V.known[nx].length) why += ` 다음 차례 ${nm(nx)}의 아는 카드 ${josa(V.known[nx].map(cname).join("·"), "과", "와")} 겹치는 색 · 숫자는 앞면으로 넘기지 않게 따졌어요.`; }
      return { opp, mine, rec, why };
    }
    if (a.t === "four") return { opp, mine, rec, why: `같은 숫자 ${H.four} 4장! 선언하면 조합 비교 없이 상대 ${V.n === 4 ? "팀 두 사람" : "모두"} 목숨 −1 이에요.` };
    const E = H.E, T = H.T;
    if (a.t === "bell") {
      why = `남 손패를 ${K.S_HARD}번 뽑아 벨 뒤 한 번씩 바꾼 결과를 보면 — 내가 가장 낮을 확률 ${pct(E.pLow)} · 상대가 가장 낮을 확률 ${pct(E.pOpp)}, 목숨 득실 ${sgn(E.U)} (문턱 ${f1(H.th)} 넘음). 지금 합 ${E.mine}.`;
      return { opp, mine, rec, why };
    }
    why = "";
    if (E) why += `벨은 아직 — 지금 치면 내가 가장 낮을 확률 ${pct(E.pLow)}, 목숨 득실 ${sgn(E.U)} (문턱 ${f1(K.bellT(V.n) - (V.deckN <= V.n ? 0.25 : 0))}). `;
    if (T) why += `${V.up >= 0 ? `앞면 ${josa(cname(V.up), "을", "를")}` : "앞면을"} 가져오면 기대 조합 ${f1(T.up)} · 더미는 ${f1(T.deck)} (지금 ${f1(T.now)}, 한 장 더 볼 기대 포함).`;
    if (V.bell >= 0) why = `벨 뒤 마지막 한 번이에요. 앞면을 가져오면 ${f1(T.up)} · 더미는 ${f1(T.deck)} (지금 ${f1(T.now)}).`;
    return { opp, mine, rec, why };
  }

  // ── 🎞️ 복기: 아쉬운 수 (선생님과 같은 계산) ──
  const seeded = a0 => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const K_LIFE = 40, K_SUM = 8;                            // 목숨 1 손해 = sev 40 · 기대 조합 1점 손해 = sev 8
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || V.over || !V.needs || !V.needs.includes(seat) || !V.hand) return none;
      const isBest = bestA && JSON.stringify(myA) === JSON.stringify(bestA), inTally = !!(info && info.same);
      const fin = (s, why) => ({ sev: isBest ? 0 : inTally ? Math.min(Math.max(0, Math.round(s)), 20) : Math.max(0, Math.min(100, Math.round(s))), why });
      const seed = ((((info && info.seed) | 0) ^ Math.imul(V.round * 16 + V.set, 2654435761) ^ Math.imul(V.turns + 1, 40503) ^ Math.imul(seat + 1, 374761393)) >>> 0) || 1;
      if (V.phase === "reveal" && myA.t === "show") {
        const H = K.revealPick(V, seat, seeded(seed)), mS = sumOf(myA.cards), u = x => { const r = H.U.find(y => y.sum === x); return r ? r.u : null; };
        const um = u(mS), ub = u(H.pick); if (um == null || ub == null) return none;
        return fin((ub - um) * K_LIFE, `내 공개 합 ${mS} → 팀 득실 ${sgn(um)} / 고급 AI 합 ${H.pick} → ${sgn(ub)} (가장 큰 조합 ${H.best})`);
      }
      if (V.phase === "drop" && myA.t === "drop") {
        const P = K.pool(V, seat), lam = K.lamOf(V), L = K.dropPick(V, seat, P, lam, 1), m = L.find(x => x.c === myA.c), b = L[0];
        if (!m) return none;
        return fin((b.v - m.v) * K_SUM, `${cname(myA.c)} 버림 → 남는 조합 ${m.sum} (기대 ${f1(m.v)}) / 고급 AI ${cname(b.c)} 버림 → ${b.sum} (${f1(b.v)})`);
      }
      if (V.phase === "turn") {
        if (bestA && bestA.t === "four" && myA.t !== "four") return fin(70, `같은 숫자 4장 — 포카드를 선언하면 상대 ${V.n === 4 ? "팀 두 사람" : "모두"} 목숨 −1 확정이었어요`);
        const th = K.bellT(V.n) - (V.deckN <= V.n ? 0.25 : 0);
        const E = V.bell < 0 ? K.bellEV(V, seat, K.S_HARD, seeded(seed)) : null;
        if (myA.t === "bell" && E) return fin(Math.max(0, th - E.U) * K_LIFE, `벨 → 내가 가장 낮을 확률 ${pct(E.pLow)} · 목숨 득실 ${sgn(E.U)} (고급 AI 는 ${josa(f1(th), "을", "를")} 넘을 때만 쳐요)`);
        if (bestA && bestA.t === "bell" && E) return fin(Math.max(0, E.U - th) * K_LIFE + 6, `벨을 쳤다면 상대가 가장 낮을 확률 ${pct(E.pOpp)} · 목숨 득실 ${sgn(E.U)} (문턱 ${f1(th)} 넘음) — 기다리면 남도 조합을 키워요`);
        if (myA.t === "take" && bestA && bestA.t === "take") {
          const T = K.takeEval(V, seat, K.pool(V, seat), K.lamOf(V)), v = s => (s === "up" ? T.up : T.deck);
          return fin((v(bestA.src) - v(myA.src)) * K_SUM, `${myA.src === "up" ? "앞면" : "더미"} → 기대 조합 ${f1(v(myA.src))} / 고급 AI ${bestA.src === "up" ? "앞면" : "더미"} → ${f1(v(bestA.src))}`);
        }
      }
    } catch (e) { /* 계산 못 하면 아래 */ }
    return none;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const c = (k, v) => k * 10 + v - 1, R_ = 0, B_ = 1, Y_ = 2, G_ = 3;
    const row = cs => `<span class="rb-cs">${cs.map(x => card(x)).join("")}</span>`;
    const hand = (cs, hi) => `<div class="rb-hand">${cs.map(x => `<span class="rb-h c${col(x)}${hi && hi.includes(x) ? " on" : ""}" style="--cc:${CC[col(x)]}"><i>${SY[col(x)]}</i>${num(x)}<small>${K.CN[col(x)]}</small></span>`).join("")}</div>`;
    const H0 = [c(R_, 7), c(R_, 8), c(R_, 2), c(B_, 9)], NEW = c(R_, 10);
    return [
      { tag: "STEP 1 · 목표", title: "조합 합이 가장 낮지 않게!", body: "모두 <b>목숨 3개</b>로 시작해요. 세트가 끝날 때 손패 <b>조합의 숫자 합이 가장 낮은 사람</b>이 목숨을 잃어요. 상대 팀 누군가의 목숨을 먼저 0으로 만들면 그 라운드를 이겨요 — 2:2는 팀원 한 명만 0이어도 그 팀이 져요 (방송: 2:2 팀전 · 3라운드 중 2라운드 먼저).",
        boardHtml: `<div class="rb-tut"><span style="font-size:40px">🔔</span><small>❤❤❤ — 0이 되면 그 라운드 패배</small></div>`, ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "4색 × 1~10 = 40장", body: "빨강 · 파랑 · 노랑 · 초록 카드에 1~10. 세트마다 섞어 <b>4장씩</b> 나누고, 남은 카드는 <b>뒷면 더미</b>, 맨 위 한 장은 <b>앞면</b>으로 놓아요.",
        boardHtml: `<div class="rb-tut">${row([c(R_, 1), c(B_, 4), c(Y_, 7), c(G_, 10)])}<small>모양도 색마다 달라요 ● 빨강 · ■ 파랑 · ▲ 노랑 · ◆ 초록</small></div>`, ms: 5200 },
      { tag: "STEP 3 · 진행", title: "내 차례: 교환 · 벨 · 포카드", body: "① <b>교환</b>: 앞면이나 더미에서 한 장 가져와 손패 한 장을 앞면으로 버려요 (앞면에서 가져간 카드는 모두가 봐요). ② <b>벨</b>: 나머지 사람이 한 번씩 더 바꾼 뒤 벨 친 사람부터 조합 공개. ③ <b>포카드</b>: 같은 숫자 4장이면 선언!",
        boardHtml: `<div class="rb-tut"><div class="rb-mid" style="grid-template-columns:auto auto"><span class="rb-pile">${back("L")}<small>더미</small></span><span class="rb-pile">${card(c(Y_, 6), "L")}<small>앞면</small></span></div></div>`, ms: 8200 },
      { tag: "STEP 4 · 조합", title: "같은 숫자끼리, 또는 같은 색끼리", body: "조합은 손패에서 1~4장 — 2장 이상이면 <b>모두 같은 숫자</b>이거나 <b>모두 같은 색</b>이어야 해요. 아래 손패라면 빨강 7+8+2 = <b>17</b>이 가장 커요 (파랑 9는 혼자 9).",
        boardHtml: `<div class="rb-tut">${hand(H0, [c(R_, 7), c(R_, 8), c(R_, 2)])}<small>밝은 테두리 = 가장 큰 조합</small></div>`, ms: 6400 },
      { tag: "STEP 5 · 직접 해 봐요", title: "빨강 10을 가져왔어요. 무엇을 버릴까요?", body: "손패 빨강 7 · 8 · 2 · 파랑 9에 <b>빨강 10</b>을 가져왔어요. 한 장을 버려 <b>조합 합이 가장 크게</b> 남겨 봐요.",
        interactive: { hint: "👆 버릴 카드를 눌러요", doneText: "✅ 파랑 9를 버려 빨강 7+8+2+10 = 27!" },
        render(stage, ctrl) {
          let msg = "", done = false, drop = -1;
          const five = H0.concat([NEW]);
          const draw = () => {
            const rest = drop >= 0 ? five.filter(x => x !== drop) : five, b = K.best(rest);
            stage.innerHTML = `<div class="rb-tut"><div class="rb-hand">${five.map(x => (done ? `<span class="rb-h c${col(x)}${b.cards.includes(x) && x !== drop ? " on" : ""}" style="--cc:${CC[col(x)]};${x === drop ? "opacity:.3" : ""}"><i>${SY[col(x)]}</i>${num(x)}<small>${K.CN[col(x)]}</small></span>` : `<button type="button" class="rb-h c${col(x)}${x === NEW ? " new" : ""}" style="--cc:${CC[col(x)]}" data-c="${x}"><i>${SY[col(x)]}</i>${num(x)}<small>${K.CN[col(x)]}</small></button>`)).join("")}</div><small>${msg}</small></div>`;
            if (done) ctrl.complete();
          };
          stage.onclick = e => {
            const bt = e.target.closest("[data-c]"); if (!bt || done) return;
            const x = +bt.dataset.c; ctrl.sfx("tap"); drop = x;
            const b = K.best(five.filter(y => y !== x));
            if (x === c(B_, 9)) { done = true; msg = "🏆 빨강 4장 7+8+2+10 = 27 — 한 색 4장이 가장 커요!"; }
            else msg = `🤔 ${josa(cname(x), "을", "를")} 버리면 ${comboTxt(b.cards)} = ${b.sum}. 더 크게 남길 수 있어요!`;
            draw();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패", title: "가장 낮은 합 −1, 벨 친 사람이 가장 낮으면 −2", body: "공개 후 합이 <b>가장 낮은 사람</b>(같으면 모두) 목숨 −1. <b>벨 친 사람</b>이 가장 낮으면 −1 더! 다음 세트는 벨 친 사람이 먼저 해요. 목숨이 0이 되면 그 팀이 그 라운드를 져요.",
        boardHtml: `<div class="rb-tut"><small>나 17 · 상대 🔔 12 → 상대 −2</small></div>`, ms: 6400 },
      { tag: "STEP 7 · 특수", title: "포카드 · 더미 끝 · 2:2 탱킹", body: "<b>포카드</b>: 비교 없이 상대 목숨 −1. <b>더미가 다 떨어지면</b> 바로 공개 (벨 벌점 없음). <b>2:2</b> 에서는 공개 때 조합을 골라 내요 — 목숨이 적은 팀원 대신 일부러 낮게 내 맞는 '탱킹'도 돼요. 막히면 <b>🧑‍🏫 AI 선생님</b>!",
        boardHtml: `<div class="rb-tut">${row([c(R_, 5), c(B_, 5), c(Y_, 5), c(G_, 5)])}<small>포카드 5 → 상대 모두 −1</small></div>`, ms: 7200 },
    ];
  }

  const SRC = "방송: 피의 게임 X · 링 더 벨 (5일차 데스매치, 2:2 팀전)";
  const DIFF = "방송과 다른 점: 2명 = 1:1 (기본) · 4명 = 2:2 팀전 (차례가 팀을 번갈아) — 방송은 팀이 3명 이상이고 라운드마다 2명씩 나와 교체도 함(3라운드 김경훈 교체), 우리는 같은 4명 고정 · 3명 = 각자 3라운드를 다 하고 이긴 라운드 수 → 남은 목숨 합 · 1:1 · 3명은 조합을 자동으로(합이 가장 큰 것) 공개, 2:2는 방송처럼 골라 공개 · 벨이 울린 뒤의 교환은 한 번씩 꼭 함(가져온 카드를 그대로 버리면 그대로) · 다음 세트 선 = 벨 친 사람 · 포카드 선언한 사람 · 더미가 떨어졌으면 공개를 시작한 사람 · 포카드 선언은 벨 전, 교환하기 전 손패 4장일 때만 (교환 중에 모이면 다음 차례에 — 방송 글은 '자기 차례에'만) · 9세트가 끝나도 0이 없으면 팀 목숨 합 → 같으면 추첨 (2~4명은 9세트 안에 반드시 누군가 0이 되니 실제로는 안 생김) · 함께 0이면 그 라운드에 마지막으로 벨(포카드 포함)을 친 팀 승 — 마지막 세트가 더미가 떨어져 끝났어도 같음, 그 라운드에 벨이 없었으면 추첨 · 9세트 끝 · 추첨 처리는 방송에 없어 우리가 정함 · 팀원끼리 말하기 없음, 라운드 전 전략 회의 · 벨 신호 약속도 없음 (방송은 회의 · 대화) · 1라운드짜리 짧은 판 옵션";
  window.SVUI = window.SVUI || {};
  window.SVUI.ringbell = {
    actText: a => !a ? "—" : a.t === "take" ? (a.src === "up" ? "앞면 가져오기" : "더미에서 한 장") : a.t === "bell" ? "🔔 벨" : a.t === "four" ? "🀄 포카드 선언" : a.t === "drop" ? `${cname(a.c)} 버림` : a.t === "show" ? `${comboTxt(a.cards)} 공개 (합 ${sumOf(a.cards)})` : "행동",
    name: "링 더 벨", emoji: "🔔", short: "조합 합이 가장 낮지 않게 — 자신 있으면 벨!", min: 2, max: 4, defN: 2, board: false,
    opts: [{ k: "rounds", label: "라운드", items: [[3, "3라운드 2선승 (방송)"], [1, "1라운드 (짧게)"]], def: 3 }],
    howto: [
      "목표: 세트마다 손패 조합의 숫자 합이 <b>가장 낮지 않게</b> — 사람마다 목숨 3, 상대 팀 누군가의 목숨이 먼저 0이 되면 그 라운드 승 (2:2는 팀원 한 명만 0이어도 그 팀이 짐 · 방송: 2:2 팀전, 3라운드 중 2라운드 먼저)",
      "준비물: 4색(빨강 · 파랑 · 노랑 · 초록) × 1~10 = 40장 · 라운드마다 목숨 3으로 시작 · 라운드는 최대 9세트, 세트마다 4장씩 · 남은 카드는 뒷면 더미, 맨 위 한 장은 앞면",
      "진행: 1세트 선은 무작위 · 내 차례에 셋 중 하나 — ① 교환: 앞면이나 더미에서 한 장 가져와 한 장을 앞면으로 버림 (앞면에서 가져간 카드는 모두가 앎) ② 벨: 나머지가 한 번씩 바꾼 뒤 벨 친 사람부터 공개 ③ 포카드 선언",
      "승패: 조합 = 손패 1~4장, 2장 이상이면 모두 같은 숫자 또는 모두 같은 색 · 합이 가장 낮은 사람(같으면 모두) 목숨 −1, <b>벨 친 사람이 가장 낮으면 −1 더</b> · 다음 세트 선은 벨 친 사람 · 목숨 0이면 그 팀이 라운드 패배 (함께 0이면 마지막으로 벨 친 팀 승)",
      "특수: 포카드 = 비교 없이 상대 팀 모두 −1 · 더미가 떨어지면 비운 사람의 다음 사람부터 바로 공개 (벨 벌점 없음) · 2:2는 공개 때 조합을 골라 내요 (방송의 '탱킹' — 팀원 대신 일부러 낮게)",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF, fitCoach: true,
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드 · ${V.set}세트 · ${{ turn: V.bell >= 0 ? "벨 뒤 교환" : "교환", drop: "버리기", reveal: "공개", show: "결과" }[V.phase] || ""}`),
    chip: (V, i) => ({ t: `${V.lives[i] ? `❤️${V.lives[i]}` : "💀"}${V.teams.length === 2 && V.R > 1 ? ` ${V.wins[V.teamOf[i]]}승` : ""}`, on: V.needs.includes(i) && !V.over, out: V.lives[i] === 0 }),
    render, result, coach, tutorial, review,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

/* 베니 서바이벌 · 초이스 홀덤 — 화면 (1:1 · 카드 놓기/고르기 · 베팅 · 공개 · 1분 규칙 · AI 선생님) */
(() => {
  "use strict";
  const C = window.SVCores.choicehold;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.cho-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.cho-pot{font:900 16px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 12px;white-space:nowrap}
.cho-ph{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:3px 10px;white-space:nowrap}
.cho-log{flex:1 1 80px;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.cho-pl{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:14px;padding:6px 9px;display:grid;gap:5px;flex:none}
.cho-pl.me{border-color:rgba(134,239,172,.35);background:rgba(34,197,94,.07)}
.cho-pl.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.cho-pl .hd{display:flex;align-items:center;gap:6px;font:700 13px var(--round);min-width:0}
.cho-pl .hd b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cho-pl .hd i{font-style:normal;font-size:12px;color:#fde68a;white-space:nowrap}
.cho-role{font:800 11px var(--round);border-radius:99px;padding:1px 8px;background:rgba(124,58,237,.35);border:1px solid #c4b5fd;color:#fff}
.cho-row{display:flex;gap:10px;align-items:flex-end}
.cho-slot{display:grid;justify-items:center;gap:2px}
.cho-slot small{font-size:10.5px;color:var(--soft);white-space:nowrap}
.cho-note{flex:1;min-width:0;font-size:12px;color:var(--soft);align-self:center;line-height:1.4}
.cho-note b{color:#fde68a}
.cho-c{--cc:#64748b;position:relative;display:inline-grid;place-items:center;width:40px;height:54px;border-radius:9px;background:#f8fafc;color:#0f172a;
  font:900 24px/1 var(--round);border:2px solid var(--cc);box-shadow:inset 0 -6px 0 var(--cc);flex:none}
.cho-c.v1{--cc:#eab308}.cho-c.v2{--cc:#38bdf8}.cho-c.v3{--cc:#4ade80}.cho-c.v4{--cc:#fb923c}.cho-c.v5{--cc:#c084fc}
.cho-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 4px,#991b1b 4px 8px);border-color:#fca5a5;box-shadow:none;color:#fecaca;font-size:18px}
.cho-c.empty{background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.25);box-shadow:none;color:rgba(255,255,255,.4);font-size:16px}
.cho-c.used{outline:2px solid #fde68a;outline-offset:1px}
.cho-c.sm{width:32px;height:44px;font-size:19px;border-radius:8px}
.cho-c.lg{width:54px;height:74px;font-size:32px;border-radius:12px}
.cho-board{display:flex;align-items:center;justify-content:center;gap:8px;flex:none}
.cho-board small{font-size:11px;color:var(--soft);margin-right:2px}
.cho-pick{border:1.5px solid var(--gold);background:rgba(245,179,1,.09);border-radius:14px;padding:8px;display:grid;gap:7px;box-shadow:0 0 14px rgba(245,179,1,.25);flex:none}
.cho-pick .ttl{text-align:center;font:800 13px var(--round);color:#fde68a}
.cho-pick .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cho-pick .opt{display:grid;justify-items:center;gap:5px;min-width:0}
.cho-pick .opt .lb{font-size:11.5px;color:var(--soft);text-align:center}
.cho-pick .btn{width:100%;padding:9px 6px;font-size:13.5px}
.cho-pick .sub{text-align:center;font-size:12px;color:var(--soft)}
.cho-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.cho-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.cho-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(86px,1fr));gap:6px}
.cho-btns .btn{padding:12px 8px;font-size:14.5px}
.cho-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.cho-show{display:grid;gap:5px;font-size:12.5px;min-height:0}
.cho-show .r{display:grid;grid-template-columns:auto 1fr auto;gap:2px 8px;align-items:center;padding:5px 8px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.cho-show .r.win{border-color:var(--gold);background:rgba(245,179,1,.1)}
.cho-show .r b{font:800 13px var(--round)}
.cho-show .r .g{font:900 14px var(--round);color:#4ade80}
.cho-show .r .e{grid-column:1/-1;color:var(--soft)}
.cho-show .why{text-align:center;color:var(--soft);font-size:12px}
.cho-tut{display:grid;gap:8px;justify-items:center}
.cho-tut .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center}
.cho-tut small{color:var(--soft);text-align:center}
.cho-rs{display:grid;gap:5px}
.cho-rs .r{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
@media (max-height:720px){
.cho-c{width:34px;height:46px;font-size:21px;border-radius:8px}
.cho-c.lg{width:44px;height:56px;font-size:26px;border-radius:10px}
.cho-c.sm{width:28px;height:38px;font-size:17px}
.cho-pl{padding:4px 8px;gap:3px}
.cho-row{gap:8px}
.cho-pick{padding:6px;gap:5px}
.cho-pick .btn{padding:7px 4px;font-size:13px}
.cho-pick .opt{gap:3px}
.cho-pick .sub,.cho-pick .opt .lb{font-size:11px}
.cho-show .r{padding:3px 8px}
.cho-acts{gap:5px}
.cho-btns .btn{padding:10px 6px}
}
@media (max-height:660px){
.cho-c{width:30px;height:40px;font-size:19px}
.cho-c.lg{width:38px;height:48px;font-size:23px}
.cho-c.sm{width:26px;height:34px;font-size:15px}
.cho-pl{padding:3px 7px;gap:2px}
.cho-pick{padding:5px;gap:4px}
.cho-pick .btn{padding:6px 4px}
.cho-pick .ttl{font-size:12px}
.cho-note br{display:none}
.cho-slot small{font-size:9.5px}
}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  let NAMES = [], LAST = null;          // 마지막으로 그린 자리 이름 · 마지막 판 결과 (결과 창용)
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  // ── 조사 (게임 안에서만) — 받침에 따라 이/가 · 은/는 · 을/를 · 과/와 · 이나/나 · 으로/로 · 이에요/예요 · 이었어요/였어요, 붙여 씀. 내 자리는 내가 · 나는 · 나를 · 나와
  // 받침: 0 없음 · 1 있음 · 2 ㄹ 받침 (한글 받침 · 숫자 0·1·3·6·7·8 은 받침 있음 · 영문은 마지막 글자 읽는 소리 L·M·N·R 만 받침 있음)
  const jongOf = raw => {
    const s = String(raw).replace(/<[^>]*>/g, "").replace(/[\s)\]"'.,!?…·]+$/, ""), ch = s.slice(-1), c = ch.charCodeAt(0);
    if (!ch) return 0;
    if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (/[0-9]/.test(ch)) return "178".includes(ch) ? 2 : "036".includes(ch) ? 1 : 0;
    if (/[A-Za-z]/.test(ch)) return "lLrR".includes(ch) ? 2 : "mMnN".includes(ch) ? 1 : 0;
    return 0;
  };
  const JO = { ga: ["이", "가"], un: ["은", "는"], ul: ["을", "를"], wa: ["과", "와"], ina: ["이나", "나"], ie: ["이에요", "예요"], ieos: ["이었어요", "였어요"] };
  const josa = (raw, k) => (k === "ro" ? (jongOf(raw) === 1 ? "으로" : "로") : JO[k][jongOf(raw) ? 0 : 1]);
  const J = (raw, k) => `${esc(raw)}${josa(raw, k)}`;                         // 이름 · 값 + 조사 (붙여 씀)
  const ME = { ga: "내가", un: "나는", ul: "나를", wa: "나와" };
  const who = (ctx, i, k) => (i === ctx.me && ME[k] ? ME[k] : J(nameOf(ctx, i), k));
  const pct = x => `${Math.round(x * 100)}%`;
  const PH = { bet1: "1차 베팅", place: "카드 놓기", take: "카드 고르기", bet2: "2차 베팅", show: "공개", end: "끝" };
  const CN = C.NAMES;

  const card = (v, extra = "") => (v == null ? `<span class="cho-c back${extra}">?</span>` : `<span class="cho-c v${v}${extra}" aria-label="카드 ${v}">${v}</span>`);
  const emptyCard = (extra = "", t = "") => `<span class="cho-c empty${extra}">${t}</span>`;

  // ── 조합 이름 (카드 4장이면 '지금까지', 5장이면 확정) ──
  function comboOf(cards) {
    if (cards.length >= 5) {
      const h = C.evalHand(cards.slice(0, 5));
      const nm = h.r === 4 ? "스트레이트 (1-2-3-4-5)" : `${CN[h.r]} (${h.nums.join(" · ")})`;
      return { r: h.r, used: h.used, name: nm, short: CN[h.r] };
    }
    const cnt = [0, 0, 0, 0, 0, 0]; cards.forEach(v => cnt[v]++);
    const g = cnt.map((c, v) => [c, v]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const key = g.map(x => x[0]).join("");
    const r = { 4: 6, 31: 3, 22: 2, 211: 1 }[key] || 0;
    const used = g.filter(x => x[0] >= 2).map(x => x[1]);
    return { r, used, name: r ? `${CN[r]} (${used.join(" · ")})` : "아직 짝 없음", short: r ? CN[r] : "짝 없음" };
  }
  const mineCards = (V, i) => [V.pc[i]].concat(V.sec[i] != null ? [V.sec[i]] : [], V.com).filter(v => v != null);

  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = i => esc(nameOf(ctx, i));
    if (e.k === "bet") return `${nm(e.s)} ${e.a === "raise" ? `레이즈 ${e.to}칩` : e.a === "call" ? (e.x > 0 ? `콜 ${e.x}칩` : "넘김") : "폴드"}`;
    if (e.k === "place") return `${nm(e.s)} 앞면 ${e.c}`;
    if (e.k === "take") return `${nm(e.s)} ${e.d === "up" ? `앞면(${e.c}) 가져감` : "뒷면 가져감"}`;
    if (e.k === "hand") return `${e.h}번째 판 · 기본 ${e.ante}칩`;
    return "";
  }

  // ── 플레이어 칸 ──
  function panel(V, ctx, i, isMe, usedSet) {
    const showP = V.pc[i] != null, secV = V.sec[i];
    let sec;
    if (secV != null) sec = `<div class="cho-slot">${card(secV, usedSet && usedSet.has(secV) ? " used" : "")}<small>받은 카드</small></div>`;
    else if (!isMe && V.osec != null) sec = `<div class="cho-slot">${card(V.osec, " mine")}<small>받은 카드(내가 앎)</small></div>`;
    else if (V.taken != null) sec = `<div class="cho-slot">${card(null)}<small>받은 카드(비공개)</small></div>`;
    else sec = `<div class="cho-slot">${emptyCard("", "…")}<small>받을 카드</small></div>`;
    const pcUsed = usedSet && showP && usedSet.has(V.pc[i]) ? " used" : "";
    const role = V.first === i ? "선" : "후";
    const stat = `칩 ${V.chips[i]}${V.phase.startsWith("bet") && V.bet[i] ? ` · 건 ${V.bet[i]}` : ""}`;
    const myCards = mineCards(V, i), cmb = showP ? comboOf(V.phase === "show" || (V.sec[i] != null) ? myCards : [V.pc[i]].concat(V.com)) : null;
    const note = cmb ? `<div class="cho-note">${V.phase === "show" ? "조합" : "지금 조합"} <b>${esc(cmb.name)}</b>${V.sec[i] == null && V.phase !== "show" ? "<br>카드 한 장을 더 받아요" : ""}</div>` : `<div class="cho-note">${V.phase === "show" ? "" : "개인 카드는 비공개예요"}</div>`;
    return `<div class="cho-pl${isMe ? " me" : ""}${V.needs.includes(i) && V.phase.startsWith("bet") ? " turn" : ""}"><div class="hd"><b>${esc(nameOf(ctx, i))}</b><span class="cho-role">${role}</span><i>${stat}</i></div>
      <div class="cho-row"><div class="cho-slot">${showP ? card(V.pc[i], pcUsed) : card(null)}<small>개인 카드</small></div>${sec}${note}</div></div>`;
  }

  function render(stage, V, ctx) {
    style();
    NAMES = ctx.seats.map(s => (s && s.name) || "");
    if (V.phase === "show" && V.res) LAST = { hand: V.hand, res: JSON.parse(JSON.stringify(V.res)), com: V.com.slice(), names: NAMES.slice() };
    const me = ctx.me, bottom = me >= 0 ? me : 0, top = 1 - bottom, watch = me < 0;
    const sh = V.phase === "show" && V.res && !V.res.fold;
    const usedFor = i => (sh && V.pc[i] != null && V.sec[i] != null ? new Set(comboOf(mineCards(V, i)).used) : null);
    const usedCom = new Set(); if (sh) for (const i of [0, 1]) { const u = usedFor(i); if (u) u.forEach(v => usedCom.add(v)); }
    let h = `<div class="cho-top"><span class="cho-pot">🪙 판돈 ${V.pot}</span><span class="cho-ph">${PH[V.phase] || ""}</span><span class="cho-log">${logText(V, ctx)}</span></div>`;
    h += panel(V, ctx, top, false, usedFor(top));
    h += `<div class="cho-board"><small>공유 카드</small>${V.com.map(c => card(c, sh && usedCom.has(c) ? " used" : "")).join("")}</div>`;
    h += panel(V, ctx, bottom, !watch, usedFor(bottom));
    // 아래 칸
    let acts = "";
    const myTurn = ctx.canAct && !watch;
    if (V.phase === "show" && V.res) acts = showHtml(V, ctx);
    else if (V.phase === "place") {
      const first = V.first, imF = !watch && me === first;
      if (myTurn && V.give) {
        acts = `<div class="cho-pick"><div class="ttl">🃏 받은 두 장 중 한 장을 앞면으로 놓아요</div>
          <div class="two">${[0, 1].map(k => `<div class="opt">${card(V.give[k], " lg")}<button class="btn primary" data-a="place" data-up="${k}">이 카드를 앞면으로</button></div>`).join("")}</div>
          <div class="sub">나머지 한 장은 뒷면이에요 — 상대는 못 봐요</div></div>`;
      } else if (watch && V.give) {
        acts = `<div class="cho-pick"><div class="ttl">${who(ctx, first, "ga")} 카드를 놓는 중</div><div class="two">${V.give.map(c => `<div class="opt">${card(c, " lg")}<div class="lb">받은 카드</div></div>`).join("")}</div></div>`;
      } else acts = `<div class="cho-pick"><div class="ttl">${who(ctx, first, "ga")} 카드 2장을 놓는 중이에요…</div><div class="two">${emptyCard(" lg", "?")}${emptyCard(" lg", "?")}</div><div class="sub">앞면 한 장 · 뒷면 한 장</div></div>`;
    } else if (V.phase === "take") {
      const first = V.first, back = 1 - first;
      const downC = V.down;     // 뒷면 카드 값은 선(놓은 사람)·구경만 봄
      const upCard = card(V.up, " lg");
      if (myTurn) {
        acts = `<div class="cho-pick"><div class="ttl">🃏 앞면 · 뒷면 중 한 장을 가져가요</div>
          <div class="two"><div class="opt">${upCard}<button class="btn primary" data-a="take" data-d="up">앞면 가져오기</button><div class="lb">보이는 카드 ${V.up}</div></div>
          <div class="opt">${card(null, " lg")}<button class="btn" data-a="take" data-d="down">뒷면 가져오기</button><div class="lb">뭔지 몰라요 (도박)</div></div></div>
          <div class="sub">고르지 않은 카드는 ${who(ctx, first, "ga")} 가져가요.</div></div>`;
      } else {
        acts = `<div class="cho-pick"><div class="ttl">${who(ctx, back, "ga")} 카드를 고르는 중이에요…</div><div class="two"><div class="opt">${upCard}<div class="lb">앞면</div></div><div class="opt">${downC != null ? card(downC, " lg mine") : card(null, " lg")}<div class="lb">뒷면${downC != null && !watch ? " (내가 놓은 카드)" : ""}</div></div></div></div>`;
      }
    } else if (V.phase === "bet1" || V.phase === "bet2") {
      if (myTurn) {
        const toCall = V.cur - V.bet[me], raises = [];
        if (V.raises < V.maxRaise && V.cap > V.cur) for (const to of [V.cur + 1, V.cur + 3, V.cap]) if (to <= V.cap && to > V.cur && !raises.includes(to)) raises.push(to);
        acts = `<div class="note">${toCall > 0 ? `상대가 ${V.cur}칩까지 걸었어요 · 콜하려면 ${toCall}칩` : "아직 걸린 칩이 없어요 · 콜하면 그냥 넘어가요"} · 이번 베팅 최대 ${V.cap}칩 · 레이즈 ${V.maxRaise - V.raises}번 남음</div>
          <div class="cho-btns"><button class="btn primary" data-a="call">${toCall > 0 ? `콜 ${toCall}` : "콜 (넘기기)"}</button>${raises.map(to => `<button class="btn" data-a="raise" data-to="${to}">레이즈 ${to}</button>`).join("")}<button class="btn fold" data-a="fold">폴드</button></div>`;
      } else acts = `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 차례예요…" : ""}</div>`;
    } else if (V.over) acts = `<div class="note">게임이 끝났어요</div>`;
    h += `<div class="cho-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      ctx.sfx("pop");
      if (a === "raise") { ctx.act({ t: "raise", to: +b.dataset.to }); return; }
      if (a === "place") { ctx.act({ t: "place", up: +b.dataset.up }); return; }
      if (a === "take") { ctx.act({ t: "take", d: b.dataset.d }); return; }
      ctx.act({ t: a });
    };
  }

  // ── 공개 결과 ──
  function whyWin(a, b) {
    if (a.r !== b.r) return "조합이 더 높아요";
    const na = a.nums, nb = b.nums;
    if (na.join() !== nb.join()) return "같은 조합이라 조합 숫자가 높은 쪽이 이겨요";
    return "조합 숫자가 같아서 남은 개인 카드가 높은 쪽이 이겨요";
  }
  function rowInfo(R, V, i) {
    const x = R.rows[i], cards = [x.pc, x.sec].concat(V.com), h = C.evalHand(cards), p = x.p;
    return { r: h.r, nums: h.nums, name: h.r === 4 ? "스트레이트" : `${CN[h.r]} ${h.nums.join("·")}`, p };
  }
  function showHtml(V, ctx) {
    const R = V.res;
    if (R.fold) return `<div class="cho-show"><div class="r win"><span>🏆</span><b>${esc(nameOf(ctx, R.win))}</b><span class="g">+${R.pot}</span><span class="e">${who(ctx, R.folder, "ga")} 폴드해서 판돈을 가져가요</span></div></div>`;
    const inf = [0, 1].map(i => rowInfo(R, V, i));
    const rows = [0, 1].map(i => `<div class="r${R.win === i ? " win" : ""}"><span>${R.win === i ? "🏆" : R.tie ? "🤝" : "·"}</span><b>${esc(nameOf(ctx, i))}</b><span class="g">${R.win === i ? "+" + R.pot : ""}</span><span class="e">${esc(inf[i].name)}</span></div>`).join("");
    const why = R.tie ? "조합 · 숫자 · 남은 카드가 모두 같아요 — 판돈은 다음 판으로 넘어가요 (같은 선)" : `${esc(nameOf(ctx, R.win))} 승 — ${whyWin(inf[R.win], inf[1 - R.win])}`;
    return `<div class="cho-show">${rows}<div class="why">${why}</div></div>`;
  }
  function result(V, me) {
    const nm = i => esc(NAMES[i] || `${i + 1}번`);
    const f = V.final || {}, why = f.why === "ante" ? "기본 베팅을 낼 칩이 없어서 끝났어요" : f.why === "hands" ? `${V.maxHand}판을 모두 마쳤어요` : "";
    let h = `<div class="cho-rs"><div class="r"><b>마지막 칩</b> ${nm(0)} ${V.chips[0]}칩 · ${nm(1)} ${V.chips[1]}칩</div>`;
    if (why) h += `<div class="r">${why}</div>`;
    if (LAST && LAST.res) {
      const R = LAST.res;
      if (R.fold) h += `<div class="r"><b>마지막 판 (${LAST.hand}판)</b> ${esc(LAST.names[R.folder] || "")} 폴드 → 판돈 ${R.pot}칩은 ${esc(LAST.names[R.win] || "")}</div>`;
      else {
        const inf = [0, 1].map(i => rowInfo(R, { com: LAST.com }, i));
        h += `<div class="r"><b>마지막 판 (${LAST.hand}판)</b> ${esc(LAST.names[0] || "1번")} ${esc(inf[0].name)} 대 ${esc(LAST.names[1] || "2번")} ${esc(inf[1].name)}${R.tie ? " · 무승부(이월)" : ` · ${esc(LAST.names[R.win] || "")} 승`}</div>`;
      }
    }
    void me;
    return h + "</div>";
  }

  // ── AI 선생님 (보이는 것만 · 숨은 카드 이름은 부르지 않음) ──
  function recent(V, since) {
    const L = V.log; let k = L.length - 1;
    for (; k >= 0; k--) if (L[k].k === "hand") break;
    return L.slice(k + 1).filter(e => e.i > since);
  }
  // 상대 개인 카드(와 두 번째 카드)를 모를 때, 상대 조합이 어느 정도일지 (올렸으면 센 쪽에 가중)
  function oppRange(V, me, f) {
    const known = [V.pc[me]].concat(V.com, V.sec[me] != null ? [V.sec[me]] : [], V.osec != null ? [V.osec] : []);
    const pool = [0, 4, 4, 4, 4, 4]; known.forEach(v => pool[v]--);
    const dist = [0, 0, 0, 0, 0, 0, 0]; let W = 0;
    const secUnknown = V.taken != null && V.osec == null;     // 상대가 두 번째 카드를 받았는데 내가 모를 때
    for (let o = 1; o <= 5; o++) {
      if (pool[o] <= 0) continue; const w1 = pool[o]; pool[o]--;
      if (secUnknown) {
        for (let t = 1; t <= 5; t++) {
          if (pool[t] <= 0) continue; const r = comboOf([o, t].concat(V.com)).r, w = w1 * pool[t] * Math.pow(f, r);
          dist[r] += w; W += w;
        }
      } else {
        const r = comboOf([o].concat(V.osec != null ? [V.osec] : [], V.com)).r, w = w1 * Math.pow(f, r);
        dist[r] += w; W += w;
      }
      pool[o]++;
    }
    const share = fn => { let s = 0; for (let r = 0; r <= 6; r++) if (fn(r)) s += dist[r]; return W ? s / W : 0; };
    return { two: share(r => r >= 2), three: share(r => r >= 3), pair: share(r => r >= 1) };
  }
  function coach(V, me, since, names) {
    const rawN = i => (names && names[i]) || `${i + 1}번`, nm = i => esc(rawN(i));
    const wj = (i, k) => (i === me && ME[k] ? ME[k] : J(rawN(i), k));      // 이름 + 조사 (나는 '내가 · 나는')
    if (me == null || me < 0 || !V || V.pc[me] == null) return { opp: "구경 중이에요. 자리에 앉으면 내 차례마다 알려 드려요.", mine: "두 사람의 칩 · 카드를 지켜보고 있어요.", rec: "—", why: "" };
    const opp = 1 - me, ev = recent(V, since).filter(e => e.s === opp), ph = V.phase;
    const raisedNow = recent(V, -1).some(e => e.k === "bet" && e.s === opp && e.a === "raise" && e.ph === ph);
    const raisedAny = recent(V, -1).some(e => e.k === "bet" && e.s === opp && e.a === "raise");
    const f = raisedNow ? 1.3 : raisedAny ? 1.15 : 1;
    const acts = ev.map(e => (e.k === "bet" ? (e.a === "raise" ? `${e.to}칩까지 올렸어요` : e.a === "call" ? (e.x > 0 ? `${e.x}칩 콜했어요` : "그냥 넘겼어요(콜)") : "폴드했어요") : e.k === "place" ? `카드 한 장을 앞면(${e.c})으로 놓았어요` : e.k === "take" ? `${e.d === "up" ? `앞면(${e.c})` : "뒷면"} 카드를 가져갔어요` : ""));
    const out = { opp: "", mine: "", rec: "", why: "" };
    // 끝 · 공개
    if (V.over) {
      return { opp: `게임이 끝났어요 — 칩 ${nm(0)} ${V.chips[0]} · ${nm(1)} ${V.chips[1]}`, mine: V.ranks && V.ranks[me] === 0 ? "내가 이겼어요." : "아쉽지만 졌어요.", rec: "한 판 더 해 볼까요?", why: "" };
    }
    if (ph === "show" && V.res) {
      const R = V.res;
      if (R.fold) return { opp: `${wj(R.folder, "ga")} 폴드했어요.`, mine: `판돈 ${R.pot}칩을 ${wj(R.win, "ga")} 가져가요. 칩 ${V.chips[me]} 대 ${V.chips[opp]}.`, rec: "곧 다음 판이 시작돼요.", why: "폴드하면 이미 낸 칩은 돌려받지 못해요." };
      const a = rowInfo(R, V, me), b = rowInfo(R, V, opp);
      return { opp: `${wj(opp, "un")} ${J(b.name, "ieos")}.`, mine: `나는 ${esc(a.name)} — ${R.tie ? "비겼어요" : R.win === me ? "이겼어요" : "졌어요"}. 칩 ${V.chips[me]} 대 ${V.chips[opp]}.`, rec: "곧 다음 판이 시작돼요.", why: R.tie ? "같은 조합 · 같은 숫자 · 같은 남은 카드라 판돈이 다음 판으로 넘어가요." : (R.win === me ? "내 조합이 더 높았어요." : "상대 조합이 더 높았어요.") };
    }
    // 상대 흐름
    const rd = oppRange(V, me, f), rd0 = f > 1 ? oppRange(V, me, 1) : rd;
    const rdTxt = `${V.taken == null ? "지금 4장 기준으로 " : ""}상대 조합 짐작: 투페어 이상 ${pct(rd.two)}${f > 1 ? ` (안 올렸다면 ${pct(rd0.two)})` : ""} · 트리플 이상 ${pct(rd.three)}`;
    out.opp = (acts.length ? `${wj(opp, "ga")} ${acts.join(" → ")}. ` : `내 차례 뒤로 ${wj(opp, "ga")} 한 일은 아직 없어요. `) + rdTxt + (raisedNow ? " — 올렸으니 센 조합 쪽으로 가중했어요." : ".");
    // 내 흐름
    const mc = comboOf(mineCards(V, me).length >= 5 ? mineCards(V, me) : [V.pc[me]].concat(V.com));
    const sec = V.sec[me] != null;
    let eqTxt = "";
    if (ph === "bet1" || ph === "bet2") { const q = C.equity(V, me, f); eqTxt = ` 내 승률 약 ${pct(q.win + q.tie / 2)} (비김 ${pct(q.tie)}).`; }
    out.mine = `내 카드 ${V.pc[me]}${sec ? ` · ${V.sec[me]}` : ""} + 공유 ${V.com.join(" ")} → ${esc(mc.name)}${sec ? "" : " (두 번째 카드는 아직)"}. 칩 ${V.chips[me]} 대 ${V.chips[opp]} · 판돈 ${V.pot}칩 · ${V.hand}/${V.maxHand}판.${eqTxt}`;
    // 추천
    if (!V.needs.includes(me)) { out.rec = "지금은 상대 차례예요. 내 차례가 오면 다시 알려 드려요."; out.why = "그동안 상대가 하는 일을 보면 패를 읽을 수 있어요."; return out; }
    if (ph === "bet1" || ph === "bet2") {
      const bp = C.betPlan(V, me, "hard", () => 0.5), a = bp.a;
      out.rec = a.t === "fold" ? "폴드" : a.t === "raise" ? `레이즈 ${a.to}칩` : bp.toCall > 0 ? `콜 ${bp.toCall}칩` : "콜 (넘기기)";
      out.why = a.t === "fold" ? `내 승률 ${J(pct(bp.e), "ga")} 콜 손익분기(${bp.toCall}÷(판돈 ${V.pot}+${bp.toCall}) = ${pct(bp.need)})보다 낮아요.`
        : a.t === "raise" ? `내 승률 ${J(pct(bp.e), "ro")} 꽤 높아서 판돈을 키워요${bp.raised ? " (상대가 올린 것까지 따졌어요)" : ""}.`
          : bp.toCall > 0 ? `내 승률 ${J(pct(bp.e), "ga")} 콜 손익분기 ${J(pct(bp.need), "ul")} 넘어서 따라가요.` : `칩을 더 걸 만큼 확실하진 않아서 그냥 넘겨요 (승률 ${pct(bp.e)}).`;
    } else if (ph === "place" && V.give) {
      const ev2 = C.placeEval(V, me), k = ev2[0] >= ev2[1] ? 0 : 1;
      out.rec = `앞면 ${V.give[k]} (나머지 ${J(V.give[1 - k], "un")} 뒷면)`;
      out.why = Math.abs(ev2[k] - ev2[1 - k]) < 0.01 ? `어느 쪽을 앞면으로 놓아도 내 기대 승률은 ${J(pct(ev2[k]), "ro")} 비슷해요.`
        : `후가 앞면을 가져갈지 뒷면을 가져갈지 고르는 것까지 따지면 내 기대 승률이 ${pct(ev2[k])} 대 ${J(pct(ev2[1 - k]), "ro")} 이쪽이 나아요.`;
    } else if (ph === "take" && V.up != null) {
      const te = C.takeEval(V.pc[me], V.com, V.up), up = te.up >= te.down;
      out.rec = up ? `앞면(${V.up}) 가져오기` : "뒷면 가져오기";
      out.why = `앞면은 확실한 값(${V.up}), 뒷면은 모르는 카드 — 기대 승률 앞면 ${pct(te.up)} 대 뒷면 ${J(pct(te.down), "ie")}.`;
    } else { out.rec = "잠깐만 기다려요."; out.why = ""; }
    return out;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const row = cs => `<div class="row">${cs.join("")}</div>`;
    const sm = (v, x = "") => card(v, " sm" + x);
    return [
      { tag: "STEP 1 · 카드", title: "1~5 카드 20장 · 칩 20개", body: "카드는 <b>1 ~ 5</b> 네 세트(20장)예요. 각자 <b>칩 20개</b>로 시작해요. 한 판마다 먼저 <b>기본 베팅 1칩</b>씩 내고 시작하고, 10판마다 1칩씩 늘어요.",
        boardHtml: `<div class="cho-tut">${row([1, 2, 3, 4, 5].map(v => card(v)))}<span class="cho-pot">🪙 20칩</span></div>`, ms: 5200 },
      { tag: "STEP 2 · 진행", title: "개인 1장 + 공유 3장 → 카드 고르기", body: "각자 <b>개인 카드 1장</b>(나만 봐요), 한가운데 <b>공유 카드 3장</b>이 열려요. 1차 베팅 뒤 <b>선</b>이 받은 카드 2장을 <b>앞면 · 뒷면</b>으로 놓고 <b>후</b>가 한 장을 골라요. 남은 한 장은 선 몫이에요. 2차 베팅 뒤 공개!",
        boardHtml: `<div class="cho-tut"><div class="row">${card(4, " mine")}<span>+</span>${sm(4)}${sm(2)}${sm(5)}</div><small>내 개인 카드 + 공유 카드 3장 · 여기에 고른 카드 한 장이 더해져요</small></div>`, ms: 5800 },
      { tag: "STEP 3 · 직접", title: "앞면 vs 뒷면 골라 보기", body: "내가 <b>후</b>예요. 내 카드 <b>4</b>, 공유 <b>4 · 2 · 5</b>. 선이 앞면 <b>4</b> 한 장과 뒷면 한 장을 놓았어요. 앞면은 <b>확실한 값</b>, 뒷면은 <b>뭔지 모르는 도박</b>이에요. 하나 골라 보세요!",
        interactive: { hint: "👆 앞면 · 뒷면 중 하나를 눌러요", doneText: "✅ 고르지 않은 카드는 선이 가져가요. 앞면=확실, 뒷면=도박!" },
        render(stage, ctrl) {
          const draw = (pick) => {
            const msg = pick === "up" ? "앞면 4를 받았어요 → 4 · 4 · 4 <b>트리플</b>! 뒷면은 선이 가져가고, 뭔지는 공개 때까지 몰라요." : pick === "down" ? "뒷면은 5였어요 → 4 · 5 <b>투페어</b>. 앞면이 4였다면 트리플이었어요!" : "";
            stage.innerHTML = `<div class="cho-tut"><div class="row">${card(4, " mine")}<span>+</span>${sm(4)}${sm(2)}${sm(5)}</div>
              <div class="row">${card(4, " lg")}${pick === "down" ? card(5, " lg") : card(null, " lg")}</div>
              ${pick ? `<small>${msg}</small>` : `<div class="row" style="width:100%"><button class="btn primary" data-d="up" style="flex:1">앞면 가져오기</button><button class="btn" data-d="down" style="flex:1">뒷면 가져오기</button></div>`}</div>`;
            if (pick) ctrl.complete();
          };
          stage.onclick = e => { const b = e.target.closest("[data-d]"); if (!b) return; ctrl.sfx("tap"); draw(b.dataset.d); };
          draw("");
        } },
      { tag: "STEP 4 · 조합", title: "포카드 > 풀하우스 > 스트레이트 > …", body: "개인 카드 2장 + 공유 3장 = 5장으로 조합을 만들어요. <b>포카드 &gt; 풀하우스 &gt; 스트레이트(1-2-3-4-5) &gt; 트리플 &gt; 투페어 &gt; 원페어</b>. 숫자가 1~5뿐이라 늘 원페어는 있어요. 같은 조합이면 조합 숫자 → 조합에 안 쓴 개인 카드가 높은 쪽이 이겨요.",
        boardHtml: `<div class="cho-tut"><div class="row">${[3, 3, 3, 5, 5].map(v => sm(v, " used")).join("")}</div><small>풀하우스 (3 트리플 + 5 원페어)</small><div class="row">${[1, 2, 3, 4, 5].map(v => sm(v, " used")).join("")}</div><small>스트레이트 (1-2-3-4-5)</small></div>`, ms: 6600 },
      { tag: "STEP 5 · 베팅", title: "콜 · 레이즈 · 폴드", body: "선부터 말해요. <b>콜</b>(따라 걸기, 걸린 칩이 없으면 그냥 넘김) · <b>레이즈</b>(더 걸기, 한 베팅에 3번까지) · <b>폴드</b>(포기하면 상대가 판돈 전부). 둘이 칩을 맞추면 베팅 끝!",
        boardHtml: `<div class="cho-tut"><span class="cho-pot">🪙 판돈 7</span><div class="cho-btns" style="width:100%"><span class="btn primary">콜 2</span><span class="btn">레이즈 5</span><span class="btn fold">폴드</span></div></div>`, ms: 5400 },
      { tag: "STEP 6 · 끝", title: "40판 안에 칩을 모으면 승리", body: "조합까지 같으면 판돈은 다음 판으로 넘어가요. <b>기본 베팅을 낼 칩이 없으면 패배</b>, 40판을 채우면 칩이 더 많은 쪽이 이겨요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 상대 패 범위 · 내 승률을 알려 줘요.",
        boardHtml: `<div class="cho-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4800 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌X · 초이스 홀덤 (파이널 2라운드)";
  const DIFF = "※ 방송과 다른 점: 체크가 없고 콜이 체크 역할이에요 · 레이즈는 한 베팅에 3번까지, 둘 중 칩이 적은 쪽만큼까지만 · 카드 선택용 2장은 덱에서 뽑고 판마다 새로 섞어요 · 2차 베팅도 선이 먼저 · 40판(이월 제외)이 끝나면 칩 많은 쪽 승리.";
  window.SVUI = window.SVUI || {};
  window.SVUI.choicehold = {
    name: "초이스 홀덤", emoji: "🎴", short: "카드를 골라 가져가는 1:1 홀덤", min: 2, max: 2, defN: 2, board: false,
    opts: [],
    src: SRC, diff: DIFF,
    howto: [
      "<b>목표</b>: 개인 카드 2장 + 공유 카드 3장으로 더 높은 조합을 만들어 판돈(칩)을 가져가요",
      "<b>준비물</b>: 1~5 카드 4세트 20장 · 칩 20개씩 · 기본 베팅 1칩 (10판마다 1칩씩 늘어요)",
      "<b>진행</b>: 개인 1장 · 공유 3장 → 1차 베팅 → <b>선이 카드 2장을 앞면 · 뒷면으로 놓고 후가 한 장을 골라요</b> → 2차 베팅 → 공개",
      "<b>승패</b>: 포카드 &gt; 풀하우스 &gt; 스트레이트(1-2-3-4-5) &gt; 트리플 &gt; 투페어 &gt; 원페어 · 같으면 조합 숫자 → 남은 개인 카드 · 다 같으면 판돈 이월",
      "<b>특수</b>: 폴드하면 상대가 판돈을 가져가요 · 기본 베팅을 낼 칩이 없으면 패배 · 40판을 채우면 칩 많은 쪽 승",
      SRC,
      DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.hand}/${V.maxHand}판 · 기본 ${V.ante}칩 · ${PH[V.phase] || ""}`),
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: !!(V.over && V.ranks && V.ranks[i] > 0) }),
    render, result, coach,
    qa: (V, me, rnd) => C.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

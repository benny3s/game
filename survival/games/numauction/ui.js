/* 베니 서바이벌 · 숫자 경매 — 화면 (3~6명 · 블록 고르기 · 입찰/패스 · 반납 고르기 · 공개 · 1분 규칙 · AI 선생님) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const N = window.SVCores.numauction;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const BL = N.BLOCKS, NB = N.NB;
  const CSS = `
.nau-top{display:flex;gap:9px;align-items:center;flex:none}
.nau-card{flex:none;width:46px;height:54px;border-radius:9px;display:grid;place-items:center;align-content:center;border:2px solid #94a3b8;background:#f8fafc;color:#0f172a;font:900 24px/1 var(--round);box-shadow:0 2px 8px rgba(0,0,0,.4)}
.nau-card small{font:800 9.5px var(--round);color:#475569;margin-bottom:1px}
.nau-card.kg{border-color:#eab308;background:#fef3c7}
.nau-card.kb{border-color:#fb7185;background:#ffe4e6;color:#9f1239}
.nau-card.kb b,.nau-card.kg b{font-size:15px}
.nau-info{min-width:0;flex:1;display:grid;gap:1px}
.nau-info .l1{font:800 13px var(--round)}
.nau-info .l2{font:800 13px var(--round);color:#fde68a}
.nau-info .l3{font-size:11.5px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nau-trk{display:grid;grid-template-columns:repeat(16,1fr);gap:1px;flex:none}
.nau-t{height:19px;display:grid;place-items:center;border-radius:4px;font:800 10.5px var(--round);background:rgba(255,255,255,.14);color:#e2e8f0}
.nau-t.kg{background:rgba(234,179,8,.38);color:#fde68a}
.nau-t.kb{background:rgba(251,113,133,.34);color:#fecdd3}
.nau-t.seen{opacity:.28}
.nau-t.cur{opacity:1;outline:2px solid #fff;outline-offset:0}
.nau-opps{display:grid;gap:3px;flex:none}
.nau-o{display:grid;grid-template-columns:102px 1fr auto;gap:6px;align-items:center;padding:2px 7px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:10px;min-height:25px}
.nau-o.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.nau-o.pass{opacity:.5}
.nau-o .nm{min-width:0;display:flex;gap:5px;align-items:baseline;overflow:hidden;white-space:nowrap}
.nau-o .nm b{font:800 12px var(--round);overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:56px}
.nau-o .nm i{font-style:normal;font-size:10.5px;color:#fde68a;white-space:nowrap;flex:none}
.nau-won{display:flex;gap:2px;align-items:center;overflow:hidden;min-width:0}
.nau-won em{font-style:normal;font-size:11px;color:var(--soft)}
.nau-cc{display:inline-grid;place-items:center;min-width:15px;height:17px;padding:0 2px;border-radius:4px;background:#f1f5f9;color:#0f172a;font:900 10.5px var(--round);border:1px solid #94a3b8;flex:none}
.nau-cc.kg{background:#fde68a;border-color:#eab308}
.nau-cc.kb{background:#fecdd3;border-color:#fb7185;color:#9f1239}
.nau-nums{display:flex;gap:7px;justify-content:flex-end;font:700 11.5px/1.2 var(--round);font-variant-numeric:tabular-nums;white-space:nowrap}
.nau-nums b{color:#fde68a}
.nau-nums .low{color:#fb7185}
.nau-me{border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:12px;padding:5px 7px;display:grid;gap:4px;flex:none}
.nau-me.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.nau-me .hd{display:flex;justify-content:space-between;align-items:center;gap:6px;font:700 12px var(--round);color:#86efac}
.nau-me .hd .sc{color:#fde68a;white-space:nowrap}
.nau-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.nau-b{border:2px solid rgba(255,255,255,.3);background:linear-gradient(#475569,#334155);color:#fff;border-radius:9px;height:38px;font:900 17px var(--round);cursor:pointer;padding:0;position:relative;transition:transform .08s}
.nau-b.m2{background:linear-gradient(#0f766e,#115e59)}
.nau-b.m3{background:linear-gradient(#b45309,#92400e)}
.nau-b.sel{background:linear-gradient(#fbbf24,#d97706);border-color:#fff;color:#1c1917;transform:translateY(-3px);box-shadow:0 4px 10px rgba(245,158,11,.5)}
.nau-b.pile{background:rgba(124,58,237,.45);border:2px dashed #c4b5fd;cursor:default}
.nau-b.gone{opacity:.2;cursor:default;text-decoration:line-through;background:#1e293b}
.nau-b.sum{display:grid;place-items:center;background:transparent;border:2px dashed rgba(255,255,255,.28);color:#fde68a;font-size:13px;cursor:default}
.nau-acts{display:grid;gap:5px;margin-top:auto;flex:none}
.nau-acts .note{text-align:center;font-size:12px;color:var(--soft);line-height:1.35}
.nau-acts .note b{color:#fde68a}
.nau-btns{display:grid;grid-template-columns:1fr 1.35fr 1fr;gap:6px}
.nau-btns .btn{padding:10px 4px;font-size:13.5px}
.nau-btns .btn.pass{background:rgba(127,29,29,.35);border-color:#f87171}
.nau-res{border:1px solid var(--gold);background:rgba(245,179,1,.1);border-radius:12px;padding:7px 10px;display:grid;gap:2px;text-align:center}
.nau-res .t{font:900 15px var(--round)}
.nau-res .d{font-size:12px;color:var(--soft)}
.nau-ret{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
.nau-rb{border:2px solid #fde68a;background:rgba(245,179,1,.15);color:#fff;border-radius:10px;min-width:48px;height:44px;font:900 18px var(--round);cursor:pointer;padding:0 8px}
.nau-rb.kg{background:rgba(234,179,8,.35)}
.nau-tut{display:grid;gap:8px;justify-items:center;width:100%}
.nau-tut .row{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;align-items:center}
.nau-tut .nau-grid{width:100%}
.nau-tut small{color:var(--soft);text-align:center}
.nau-tut .bidbox{font:800 14px var(--round);padding:5px 12px;border-radius:99px;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);color:#fde68a}
.nau-rs{display:grid;gap:4px}
.nau-rs .r{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:baseline}
.nau-rs .r.bad{color:#fca5a5}
.nau-rs .n{font-size:12px;color:var(--soft)}
@media (max-height:660px){
.nau-b{height:33px;font-size:15px}
.nau-card{width:42px;height:48px}
.nau-t{height:17px}
.nau-res{padding:5px 8px}
.nau-me{padding:4px 6px;gap:3px}
}
@media (min-height:760px){
.nau-b{height:44px;font-size:19px}
.nau-o{min-height:30px;padding:3px 8px}
.nau-card{width:52px;height:62px}
.nau-t{height:22px}
.nau-me{padding:7px 9px;gap:6px}
.nau-btns .btn{padding:12px 4px}
}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  let NAMES = [], S = { key: "", sel: new Set() };       // 마지막으로 그린 이름 · 이번 입찰에서 고른 블록
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  // ── 조사 (게임 안에서만) — 받침에 따라 이/가 · 은/는 · 을/를 · 과/와 · 이나/나 · 으로/로 · 이에요/예요, 붙여 씀. 내 자리는 내가 · 나는 · 나를 · 나와
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
  const fmt = x => (Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toFixed(1));
  const kind = c => (N.isItem(c) ? "i" : N.isGood(c) ? "g" : "b");
  const cardTxt = c => (N.isItem(c) ? String(c + 1) : N.isGood(c) ? "G" : c === N.M5 ? "−5" : c === N.HALF ? "½" : "↩");
  const cardLong = c => (N.isItem(c) ? `매물 ${c + 1}점` : N.isGood(c) ? "GOOD (점수 ×2)" : c === N.M5 ? "−5점" : c === N.HALF ? "점수 절반" : "매물 반납");
  const cc = (c, extra = "") => `<span class="nau-cc k${kind(c)}${extra}" title="${cardLong(c)}">${cardTxt(c)}</span>`;
  const mag = v => (v <= 4 ? "m1" : v <= 12 ? "m2" : "m3");
  const SUM = a => a.reduce((x, y) => x + y, 0);
  const bSum = idx => SUM(idx.map(k => BL[k]));
  const PHN = { bid: "입찰", ret: "반납 고르기", show: "결과", end: "끝" };

  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = i => esc(nameOf(ctx, i));
    if (e.k === "round") return `${e.r}라운드 — ${who(ctx, e.f, "ga")} 먼저`;
    if (e.k === "bid") return `${nm(e.s)} 입찰 합 ${e.tot}`;
    if (e.k === "pass") return `${nm(e.s)} 패스${e.forced ? " (낼 블록 부족)" : ""}`;
    if (e.k === "win") return `${nm(e.s)} 낙찰 (블록 ${e.paid} 사라짐)`;
    if (e.k === "ret") return `${nm(e.s)} ${cardLong(e.c)} 반납`;
    if (e.k === "end") return "경매 끝";
    return "";
  }
  const wonChips = (V, i) => V.won[i].map(c => cc(c)).join("") + (V.debt[i] ? `<em>반납 예정 ${V.debt[i]}</em>` : "");

  function stateOf(V, ctx, i) {
    if (V.phase === "bid") {
      if (!V.active[i]) return "패스";
      if (V.pileSum[i] > 0) return `입찰 ${V.pileSum[i]}${V.topSeat === i ? " 👑" : ""}`;
      return V.turn === i ? "차례" : "대기";
    }
    if (V.res && V.res.w === i) return V.phase === "ret" ? "반납 고르는 중" : N.isBad(V.res.c) ? "받음" : "낙찰";
    return "";
  }
  function oppRow(V, ctx, i, lowI) {
    const turn = V.needs.includes(i) && !V.over;
    return `<div class="nau-o${turn ? " turn" : ""}${V.phase === "bid" && !V.active[i] ? " pass" : ""}"><div class="nm"><b>${esc(nameOf(ctx, i))}</b><i>${stateOf(V, ctx, i)}</i></div>
      <div class="nau-won">${V.won[i].length || V.debt[i] ? wonChips(V, i) : "<em>—</em>"}</div>
      <div class="nau-nums"><span>⭐<b>${fmt(V.score[i])}</b></span><span class="${lowI === i ? "low" : ""}" title="남은 블록 합">🧱${V.haveSum[i]}${lowI === i ? "!" : ""}</span></div></div>`;
  }
  // 남은 블록 합이 혼자 가장 적은 사람 (점수 1등이어도 이러면 자격을 잃으니 표시)
  const lowestOf = V => { const m = Math.min(...V.haveSum), c = V.haveSum.filter(x => x === m).length; return c === 1 ? V.haveSum.indexOf(m) : -1; };

  function render(stage, V, ctx) {
    style();
    NAMES = ctx.seats.map(s => (s && s.name) || "");
    const me = ctx.me, watch = me < 0, n = V.n, myTurn = !watch && ctx.canAct && V.needs.includes(me);
    const key = `${ctx.g}|${V.round}|${watch ? -1 : V.pileSum[me]}|${V.top}|${V.turn}|${V.phase}`;
    if (S.key !== key) S = { key, sel: new Set() };
    const card = V.card, kd = kind(card);
    const L1 = V.over ? "경매가 끝났어요" : `${V.round}라운드 · 남은 카드 ${V.left.length}장`;
    const bidTxt = V.over ? "" : V.phase === "bid" ? (V.top > 0 ? `최고 입찰 <b>${V.top}</b> · ${esc(nameOf(ctx, V.topSeat))}` : "아직 입찰이 없어요") : cardLong(card);
    let h = `<div class="nau-top"><div class="nau-card k${kd}" aria-label="${cardLong(card)}"><small>${kd === "i" ? "매물" : kd === "g" ? "GOOD" : "BAD"}</small><b>${N.isItem(card) ? card + 1 : N.isGood(card) ? "×2" : card === N.M5 ? "−5" : card === N.HALF ? "½" : "↩"}</b></div>
      <div class="nau-info"><div class="l1">${L1}${V.over ? "" : ` · <span style="font-weight:600">${cardLong(card)}</span>`}</div><div class="l2">${bidTxt}</div><div class="l3">${logText(V, ctx)}</div></div></div>`;
    // 카드 16장 (나온 것은 흐리게)
    let trk = "";
    for (let c = 0; c < N.NC; c++) trk += `<span class="nau-t k${kind(c)}${V.seen.includes(c) ? " seen" : ""}${c === card && !V.over ? " cur" : ""}" title="${cardLong(c)}">${cardTxt(c)}</span>`;
    h += `<div class="nau-trk" aria-label="경매 카드 16장">${trk}</div>`;
    // 다른 사람
    const order = []; if (watch) for (let i = 0; i < n; i++) order.push(i); else for (let k = 1; k < n; k++) order.push((me + k) % n);
    const lowI = lowestOf(V);
    h += `<div class="nau-opps">${order.map(i => oppRow(V, ctx, i, lowI)).join("")}</div>`;
    // 내 칸
    let selSum = 0, free = [];
    if (!watch) {
      const pile = V.pile[me], have = V.have[me];
      free = have.filter(k => !pile.includes(k));
      selSum = SUM([...S.sel].map(k => BL[k]));
      let grid = "";
      for (let k = 0; k < NB; k++) {
        const isHave = have.includes(k), inPile = pile.includes(k), sel = S.sel.has(k);
        const cls = `nau-b ${mag(BL[k])}${!isHave ? " gone" : inPile ? " pile" : sel ? " sel" : " free"}`;
        grid += `<button type="button" class="${cls}" data-b="${k}" ${myTurn && V.phase === "bid" && isHave && !inPile ? "" : "disabled"} aria-label="블록 ${BL[k]}">${BL[k]}</button>`;
      }
      grid += `<span class="nau-b sum">${myTurn && V.phase === "bid" ? (selSum ? `+${selSum}` : "") : V.pileSum[me] ? `낸 ${V.pileSum[me]}` : ""}</span>`;
      h += `<div class="nau-me${myTurn ? " turn" : ""}"><div class="hd"><span>나 · 남은 블록 ${have.length}개 · 합 ${V.haveSum[me]}${lowI === me ? " ⚠가장 적음" : ""}</span><span class="sc">⭐ ${fmt(V.score[me])}점</span></div>
        ${V.won[me].length || V.debt[me] ? `<div class="nau-won">${wonChips(V, me)}</div>` : ""}<div class="nau-grid">${grid}</div></div>`;
    }
    // 아래 칸
    let acts = "";
    if (V.over) acts = `<div class="note">경매가 끝났어요 · 결과 창을 확인해요</div>`;
    else if (V.phase === "show" && V.res) acts = resHtml(V, ctx);
    else if (V.phase === "ret") {
      if (myTurn) {
        const opts = V.won[me].filter(c => N.isItem(c) || N.isGood(c));
        acts = `<div class="note"><b>매물 반납!</b> 가진 카드 중 한 장을 돌려줘요</div><div class="nau-ret">${opts.map(c => `<button type="button" class="nau-rb k${kind(c)}" data-ret="1" data-c="${c}">${c < 10 ? c + 1 + "점" : "GOOD"}</button>`).join("")}</div>`;
      } else acts = `<div class="note">${V.turn >= 0 ? who(ctx, V.turn, "ga") + " 돌려줄 카드를 고르는 중…" : ""}</div>`;
    } else if (V.phase === "bid") {
      if (myTurn) {
        const pile = V.pileSum[me], need = V.top - pile, tot = pile + selSum, ok = selSum > 0 && tot > V.top;
        const bad = N.isBad(card);
        const msg = selSum === 0 ? (V.top > 0 ? `최고 <b>${V.top}</b> · 내 입찰 ${pile} → <b>${need + 1}</b> 이상 더 얹어요` : "첫 입찰이에요 · 블록을 눌러 얹어요")
          : ok ? `내 입찰 합 <b>${tot}</b> (최고 ${V.top} 초과) ✓` : `합 ${tot} — 최고 ${J(V.top, "ul")} 넘겨야 해요 (${V.top + 1 - tot} 더)`;
        acts = `<div class="note">${msg}${bad ? "<br>⚠ 거꾸로 경매 — 먼저 패스하면 이 카드를 내가 받아요" : ""}</div>
          <div class="nau-btns"><button class="btn" data-a="rec" ${N.pickAdd(maskOf(free), need + 1) ? "" : "disabled"}>✨ 추천 묶음</button>
          <button class="btn primary" data-a="bid" ${ok ? "" : "disabled"}>입찰 ${selSum ? tot : ""}</button>
          <button class="btn pass" data-a="pass">${bad ? "패스 (받기)" : "패스"}</button></div>`;
      } else if (watch || !V.active[me]) acts = `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 차례예요…" : ""}${!watch && !V.active[me] ? " · 나는 이번 라운드를 패스했어요" : ""}</div>`;
      else acts = `<div class="note">${V.turn >= 0 ? esc(nameOf(ctx, V.turn)) + " 차례예요…" : ""}</div>`;
    }
    h += `<div class="nau-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const rb = e.target.closest("[data-ret]");
      if (rb) { ctx.sfx("pop"); ctx.act({ t: "ret", c: +rb.dataset.c }); return; }
      const bb = e.target.closest("[data-b]");
      if (bb) { if (bb.disabled) return; const k = +bb.dataset.b; if (S.sel.has(k)) S.sel.delete(k); else S.sel.add(k); ctx.sfx("tap"); render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === "rec") {
        const need = V.top - V.pileSum[me], m = N.pickAdd(maskOf(V.have[me].filter(k => !V.pile[me].includes(k))), need + 1);
        S.sel = new Set(listOf(m)); ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      ctx.sfx("pop");
      if (a === "bid") { ctx.act({ t: "bid", c: [...S.sel].sort((x, y) => x - y) }); return; }
      if (a === "pass") { ctx.act({ t: "pass" }); return; }
    };
  }
  const maskOf = idx => idx.reduce((m, k) => m | (1 << k), 0);
  const listOf = m => { const a = []; for (let k = 0; k < NB; k++) if (m & (1 << k)) a.push(k); return a; };

  function resHtml(V, ctx) {
    const R = V.res, nm = esc(nameOf(ctx, R.w)), c = R.c;      // 낙찰자 이름 (조사는 who 로)
    const blk = R.blocks.length ? `블록 ${R.paid} (${R.blocks.map(k => BL[k]).join("+")}) 사라짐` : "블록은 하나도 안 썼어요";
    let t, d;
    if (N.isBad(c)) {
      t = `${who(ctx, R.w, "ga")} 먼저 패스해서 받아요`;
      d = `${cardLong(c)} · ${R.blocks.length ? blk : "블록은 안 썼어요"}${R.ret != null ? ` · ${cardLong(R.ret)} 반납` : R.debt ? " · 돌려줄 카드가 없어 다음 매물 1장을 반납해요" : ""}`;
    } else {
      t = `🏆 ${nm} 낙찰`;
      d = `${cardLong(c)} · ${blk}${R.back != null ? ` · 반납 때문에 ${R.back + 1}점 매물은 바로 돌려줘요` : ""}`;
    }
    return `<div class="nau-res"><div class="t">${t}</div><div class="d">${d}</div></div>`;
  }

  // ── 결과 창 ──
  function result(V, me) {
    const F = V.final; if (!F) return "";
    const nm = i => esc(NAMES[i] || `${i + 1}번`), R = F.ranks;
    const order = R.map((r, i) => i).sort((a, b) => R[a] - R[b] || F.rem[b] - F.rem[a]);
    let h = `<div class="nau-rs">`;
    for (const i of order) {
      const mark = F.dq === i ? "⛔ 자격 박탈" : F.out.includes(i) ? "❌ 탈락" : "";
      h += `<div class="r${mark ? " bad" : ""}"><b>${nm(i)}</b><span class="n">남은 블록 ${F.rem[i]} · ${V.won[i].map(c => cardTxt(c)).join(" ") || "카드 없음"}</span><span>${fmt(F.score[i])}점 ${mark}</span></div>`;
    }
    if (F.dq >= 0) h += `<div class="n">${F.dq === me ? "나는" : J(NAMES[F.dq] || `${F.dq + 1}번`, "un")} 점수가 가장 높았지만 남은 블록(${F.rem[F.dq]})이 가장 적어서 자격을 잃고, 다음 점수가 1등이 돼요.</div>`;
    return h + `</div>`;
  }

  // ── AI 선생님 (보이는 것만) ──
  const cardVal = (V, c) => (N.isItem(c) ? c + 1 : N.isGood(c) ? Math.round((55 / V.n) * 10) / 10 : 0);
  function coach(V, me, since, names) {
    const rawN = i => (names && names[i]) || `${i + 1}번`, nm = i => esc(rawN(i));
    const wj = (i, k) => (i === me && ME[k] ? ME[k] : J(rawN(i), k));      // 이름 + 조사 (나는 '내가 · 나는')
    if (me == null || me < 0 || !V || V.score == null) return { opp: "구경 중이에요. 자리에 앉으면 내 차례마다 알려 드려요.", mine: "점수와 남은 블록을 지켜보고 있어요.", rec: "—", why: "" };
    const n = V.n, card = V.card, ph = V.phase;
    if (V.over) {
      const F = V.final, rk = F.ranks[me] + 1;
      return { opp: `경매가 끝났어요 — 점수 ${V.score.map((s, i) => `${nm(i)} ${fmt(s)}`).join(" · ")}`, mine: F.dq === me ? "점수는 1등이었지만 남은 블록이 가장 적어서 자격을 잃었어요." : `나는 ${rk}등 (${fmt(V.score[me])}점).`, rec: "다시 한 판 해 볼까요?", why: "끝에 블록을 남겨 두는 것도 점수만큼 중요해요." };
    }
    // 이번 라운드 · 지난 라운드 흐름
    const L = V.log; let k = L.length - 1; while (k >= 0 && L[k].k !== "round") k--;
    const evs = L.slice(k + 1).filter(e => e.i > since && e.s !== me && (e.k === "bid" || e.k === "pass"));
    const v = cardVal(V, card), bads = N.isBad(card);
    const bidTxt = evs.map(e => (e.k === "bid" ? `${nm(e.s)} 합 ${e.tot}` : `${nm(e.s)} 패스`)).join(" → ");
    let read = "";
    if (V.top > 0 && V.topSeat !== me && !bads && v > 0) read = ` → ${wj(V.topSeat, "un")} 이 카드를 블록 ${V.top} 이상으로 쳐요 (1점당 약 ${(V.top / v).toFixed(1)})`;
    else if (V.top > 0 && bads) read = ` → 거꾸로 경매라 ${wj(V.topSeat, "un")} 받기 싫어서 합을 올린 거예요`;
    const passed = V.active.map((a, i) => (!a && i !== me ? i : -1)).filter(i => i >= 0 && ph === "bid");
    if (passed.length && !bads && V.top > 0) read += ` · 패스한 ${passed.map(nm).join(", ")}${josa(rawN(passed[passed.length - 1]), "un")} ${V.top}보다 낮게 봐요`;
    const lw = [...L].reverse().find(e => e.k === "win");
    const lastTxt = lw && lw.c != null ? (N.isItem(lw.c) ? ` 지난 낙찰: ${wj(lw.s, "ga")} ${lw.c + 1}점 매물을 블록 ${lw.paid}에 (1점당 약 ${(lw.paid / (lw.c + 1)).toFixed(1)}).` : ` 지난 카드(${cardLong(lw.c)}): ${wj(lw.s, "ga")} 가져갔어요 (블록 ${lw.paid}).`) : "";
    const out = { opp: (bidTxt ? `내 차례 뒤로 ${bidTxt}${read}.` : "내 차례 뒤로 아직 아무도 입찰하지 않았어요.") + lastTxt, mine: "", rec: "", why: "" };
    // 내 흐름
    const low = Math.min(...V.haveSum), lowI = V.haveSum.indexOf(low), uniqLow = V.haveSum.filter(x => x === low).length === 1;
    const rank = 1 + V.score.filter((s, i) => i !== me && (s > V.score[me] || (s === V.score[me] && V.haveSum[i] > V.haveSum[me]))).length;
    const top = Math.max(...V.score), leader = V.score.indexOf(top);
    let dq = "";
    if (uniqLow && V.score.filter(s => s === top).length === 1 && leader === lowI) dq = lowI === me ? " ⚠ 지금 1등인데 남은 블록이 가장 적어요 — 이대로 끝나면 자격을 잃어요." : ` ${wj(lowI, "un")} 점수 1등이지만 남은 블록이 가장 적어서 지금 끝나면 자격을 잃어요.`;
    const gl = V.left.filter(N.isGood).length, hl = V.left.includes(N.HALF) ? 1 : 0;
    out.mine = `내 점수 ${fmt(V.score[me])}점 (${rank}/${n}위) · 남은 블록 ${V.have[me].length}개 합 ${V.haveSum[me]} · 가장 적은 사람 ${nm(lowI)} ${low}.${dq} 남은 카드 ${V.left.length}장 (GOOD ${gl}장${hl ? " · 점수 절반 아직" : ""}).`;
    // 추천
    if (ph === "show") { out.rec = "곧 다음 라운드예요."; out.why = ""; return out; }
    if (ph === "ret") {
      if (V.needs.includes(me)) { const a = N.ai(V, me, "hard", () => 0.5); out.rec = `${J(a && a.c != null ? cardLong(a.c) : "한 장", "ul")} 돌려줘요`; out.why = "돌려준 뒤에도 내 점수가 가장 높게 남는 카드를 골랐어요."; }
      else { out.rec = "다른 사람이 돌려줄 카드를 고르는 중이에요."; out.why = ""; }
      return out;
    }
    if (!V.active[me]) { out.rec = "이번 라운드는 패스했어요 — 결과를 기다려요."; out.why = "패스하면 낸 블록은 돌려받아요."; return out; }
    const p = N.plan(V, me, "hard", () => 0.5), val = p.val;
    const price = `이 카드는 약 ${fmt(Math.round(val * 10) / 10)}점 · 지금 1점은 블록 약 ${p.p.toFixed(1)}개분`;
    if (!V.needs.includes(me)) { out.rec = `지금은 ${nm(V.turn)} 차례예요.`; out.why = `${price} → 내가 낼 만한 한도는 약 ${J(Math.round(p.willing), "ie")}.`; return out; }
    if (p.a.t === "bid") {
      out.rec = `블록 ${p.a.c.map(i => BL[i]).join(" + ")} 입찰 (내 합 ${p.tot})`;
      out.why = bads ? `${price}. 먼저 패스하면 약 ${fmt(Math.round(p.pen * 10) / 10)}점 손해라서 합을 올려 다음 사람이 못 넘기게 해 봐요.`
        : `${price} → 한도 약 ${Math.round(p.willing)} 안이라서 겨우 넘기는 만큼만 올려요.`;
    } else {
      out.rec = bads ? "패스 (이 카드를 받아요)" : "패스";
      out.why = bads ? `${price}. 합을 더 올리면 낸 블록이 사라지니 받는 쪽이 나아요.` : `${price} → 한도 약 ${J(Math.round(p.willing), "ga")} 지금 최고(${V.top}) 이하라서 블록을 아껴요.`;
    }
    return out;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const blk = (v, x = "") => `<span class="nau-b ${mag(v)}${x}" style="height:30px;display:inline-grid;place-items:center;width:38px;font-size:14px;cursor:default">${v}</span>`;
    return [
      { tag: "STEP 1 · 목표", title: "블록으로 카드를 사서 점수 1등", body: "모두 <b>자금 블록 11개</b>(1·2·3·4·6·8·10·12·15·20·25)로 시작해요. 블록을 내고 <b>경매 카드</b>를 사서 점수를 모아요. 카드는 <b>매물 1~10점</b>, <b>GOOD</b>(점수 2배), 그리고 <b>BAD</b> 3장이에요.",
        boardHtml: `<div class="nau-tut"><div class="row">${[1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25].map(v => blk(v)).join("")}</div><div class="row">${[0, 2, 5, 9].map(c => cc(c)).join("")}${[10, 13, 14, 15].map(c => cc(c)).join("")}</div><small>블록은 한 번 쓰면 사라져요 · 카드 16장 중 점수 카드는 GOOD 3장 + 매물 10장</small></div>`, ms: 6200 },
      { tag: "STEP 2 · 진행", title: "돌아가며 올리거나 패스", body: "카드 1장이 열리면 차례대로 <b>블록을 얹어서 합을 앞사람보다 크게</b> 올려요. 올리기 싫으면 <b>패스</b> — 낸 블록을 돌려받고 그 라운드에서 빠져요. 한 명만 남으면 그 사람이 낙찰, <b>낸 블록은 사라져요</b>.",
        boardHtml: `<div class="nau-tut"><div class="row"><span class="bidbox">AI1 · 합 9</span><span class="bidbox">AI2 · 패스</span><span class="bidbox" style="color:#86efac">나 · 합 11?</span></div><small>합이 제일 큰 사람은 차례가 안 와요 · 합을 못 넘기면 저절로 패스</small></div>`, ms: 5800 },
      { tag: "STEP 3 · 직접", title: "딱 넘기는 만큼만 입찰", body: "AI1이 합 <b>9</b>를 걸었어요. 블록을 눌러서 합이 9를 <b>겨우 넘는</b>(10~11) 묶음을 만들고 <b>입찰</b>해 보세요. 더 많이 내면 그만큼 블록이 사라져 손해예요!",
        interactive: { hint: "👆 블록을 눌러 합 10~11을 만들고 입찰", doneText: "✅ 겨우 넘기는 묶음! 블록은 아껴야 끝까지 버텨요" },
        render(stage, ctrl) {
          const vals = [2, 3, 6, 8, 12, 20], sel = new Set(); let msg = "";
          const draw = () => {
            const sum = [...sel].reduce((a, v) => a + v, 0), ok = sum > 9;
            stage.innerHTML = `<div class="nau-tut"><span class="bidbox">AI1 · 합 9 (최고)</span>
              <div class="nau-grid">${vals.map(v => `<button type="button" class="nau-b ${mag(v)}${sel.has(v) ? " sel" : ""}" data-v="${v}">${v}</button>`).join("")}</div>
              <b style="font-size:16px">내 합 ${sum}</b>
              <div class="nau-btns" style="width:100%;grid-template-columns:1.4fr 1fr"><button class="btn primary" data-a="bid" ${ok ? "" : "disabled"}>입찰 ${sum || ""}</button><button class="btn pass" data-a="pass">패스</button></div><small>${msg}</small></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v],[data-a]"); if (!b || b.disabled) return;
            if (b.dataset.v) { const v = +b.dataset.v; if (sel.has(v)) sel.delete(v); else sel.add(v); ctrl.sfx("tap"); msg = ""; draw(); return; }
            const sum = [...sel].reduce((a, v) => a + v, 0);
            if (b.dataset.a === "pass") { ctrl.sfx("tap"); sel.clear(); msg = "패스하면 블록은 돌려받지만 이 카드는 못 가져와요. 입찰해 볼까요?"; draw(); return; }
            if (sum >= 10 && sum <= 11) { ctrl.sfx("win"); msg = `합 ${J(sum, "ro")} AI1의 9를 겨우 넘었어요!`; draw(); ctrl.complete(); }
            else { ctrl.sfx("tap"); msg = sum > 11 ? `합 ${J(sum, "un")} 너무 많이 냈어요 — 낙찰돼도 블록이 ${J(sum, "ina")} 사라져요. 더 작게!` : "합이 9를 넘어야 해요"; draw(); }
          };
          draw();
        } },
      { tag: "STEP 4 · BAD", title: "BAD 카드는 거꾸로예요", body: "<b>−5점</b> · <b>점수 절반</b> · <b>매물 반납</b>(가진 매물이나 GOOD 1장을 돌려줘요)이 나오면 반대로 <b>가장 먼저 패스한 사람이 받아요</b>. 그 사람 빼고 모두 낸 블록을 돌려받아요. 그래서 일부러 합을 올려 남이 못 넘기게 만들기도 해요.",
        boardHtml: `<div class="nau-tut"><div class="row">${[13, 14, 15].map(c => cc(c, "")).join("")}</div><div class="row"><span class="bidbox">AI1 · 합 8</span><span class="bidbox" style="color:#fca5a5">AI2 · 패스 → 받음</span></div><small>먼저 패스한 AI2가 이 카드를 받고, 낸 블록은 사라져요</small></div>`, ms: 6200 },
      { tag: "STEP 5 · 점수", title: "매물 합 → GOOD ×2 → −5 → 절반", body: "내 점수 = <b>가진 매물 숫자의 합</b> → <b>GOOD 한 장마다 ×2</b> → <b>−5점 카드가 있으면 −5</b> → <b>점수 절반 카드가 있으면 ÷2</b> 순서로 계산해요. 소수 한 자리까지 나와요.",
        boardHtml: `<div class="nau-tut"><div class="row">${cc(6)}${cc(4)}${cc(10)}</div><small>매물 7 + 5 = 12 → GOOD ×2 = 24 → −5 = 19 → 절반 = <b>9.5점</b></small></div>`, ms: 6200 },
      { tag: "STEP 6 · 끝", title: "GOOD 3장 + 점수 절반이 팔리면 끝", body: "GOOD 3장과 점수 절반 카드가 모두 낙찰되면 끝나요. <b>점수가 높은 사람이 1등</b>이지만, 1등이 <b>남은 블록이 혼자 가장 적으면 자격을 잃어요</b>(차순위가 1등). 최하위는 탈락! 막히면 <b>🧑‍🏫 AI 선생님</b>이 시장 가격(1점당 블록)을 알려 줘요.",
        boardHtml: `<div class="nau-tut"><span style="font-size:42px">🏆</span><small>점수만 보고 블록을 다 써 버리면 오히려 위험해요</small></div>`, ms: 6200 },
    ];
  }

  // ── 🎞️ 복기 (ui.review): 선생님과 같은 계산(N.plan · N.outlook) — 카드 값(점) · 1점의 블록 값 → 한도 ─────────────
  // 입찰: 합이 한도(= 카드 값 × 1점당 블록 × 0.92)보다 높으면, 낙찰될 때 넘친 블록 ÷ 1점당 블록 = 점수 손해 (sev = 점수 × 20 → 3점부터 60)
  //   패스: 한도가 (지금 최고 + 1) 보다 크면 겨우 넘겨 낙찰됐을 때의 이득 × 1/2 (상대가 더 올릴 수 있어서) 를 놓친 것 — 같은 식 · 같은 환산
  // BAD 카드: 다음 사람이 못 넘길 합까지 올릴 수 있으면(블록은 모두 공개) 그 사람이 대신 받고 나는 블록을 돌려받음 → 패스하면 카드 점수 + 낸 블록 전부 손해 (확실)
  //   그 밖의 BAD 판단은 어림이라 sev 35 까지만. 반납 고르기: 돌려준 뒤 점수(미래 매물 기대 포함) 차이 그대로 (sev = 점수 × 20)
  const rvNoRev = () => ({ sev: 0, why: "" });
  const rvSev = (pts, cap) => Math.max(0, Math.min(cap || 100, Math.round(pts * 20)));
  const rvNext = (V, from) => { for (let k = 1; k <= V.n; k++) { const i = (from + k) % V.n; if (V.active[i]) return i; } return -1; };
  const rvLab = c => (N.isItem(c) ? `매물 ${c + 1}점` : N.isGood(c) ? "GOOD" : cardLong(c));
  function review(V, seat, myA, bestA, info) {
    try {
      if (!V || !myA || !bestA || V.over || !Array.isArray(V.have) || !V.have[seat]) return rvNoRev();
      if (JSON.stringify(myA) === JSON.stringify(bestA) || (info && info.same)) return rvNoRev();
      let out = rvNoRev();
      if (V.phase === "ret" && myA.t === "ret") {
        const o = N.outlook(V, "hard"), cs = V.won[seat], fb = o.fut / V.n, opts = cs.filter(c => N.isItem(c) || N.isGood(c));
        const sc = c => N.scoreOf(cs.filter(x => x !== c), fb), mine = sc(myA.c);
        let top = opts[0]; for (const c of opts) if (sc(c) > sc(top)) top = c;
        if (!opts.includes(myA.c) || top == null) return rvNoRev();
        const loss = Math.max(0, sc(top) - mine);
        out = { sev: rvSev(loss), why: `돌려준 뒤 예상 점수: ${rvLab(myA.c)} 반납 ${fmt(mine)}점 vs ${rvLab(top)} 반납 ${fmt(sc(top))}점 (앞으로 올 매물 기대 포함)${loss < 0.05 ? " — 같아요" : ""}`, my: `${rvLab(myA.c)} 반납`, best: `${rvLab(top)} 반납` };
      } else if (V.phase === "bid" && (myA.t === "bid" || myA.t === "pass")) {
        const hp = N.plan(V, seat, "hard", () => 0.5), val = hp.val, price = hp.p, L = Math.max(0, hp.willing), top = V.top, pile = V.pileSum[seat];
        const vTxt = (val < 0 ? "−" : "") + fmt(Math.round(Math.abs(val) * 10) / 10), head = `카드 약 ${vTxt}점 · 1점≈블록 ${price.toFixed(1)}개`;
        const lTxt = `한도 약 ${Math.round(L)}${Math.max(0, val) * price * 0.92 > 0 && L < Math.max(0, val) * price * 0.92 * 0.7 ? "(블록을 남겨야 해서 줄어요)" : ""}`;
        const add = myA.t === "bid" ? (myA.c || []).reduce((s, k) => s + (N.BLOCKS[k] || 0), 0) : 0, T = pile + add;
        if (N.isBad(V.card)) {
          const pen = Math.max(0, -val), X = rvNext(V, seat);
          const freeIdx = V.have[seat].filter(i => !V.pile[seat].includes(i)), freeSum = freeIdx.reduce((s, i) => s + N.BLOCKS[i], 0);
          const kTot = X >= 0 && X !== seat ? Math.max(V.haveSum[X], top + 1) : -1, canKill = kTot > 0 && kTot - pile <= freeSum;
          if (canKill && pen > 0.05) {
            const kill = myA.t === "bid" && T >= kTot;
            if (kill) out = { sev: 0, why: `${head}. 합 ${T}${ja(T,"은")} 다음 사람이 낼 수 있는 블록(${V.haveSum[X]})을 넘어 그 사람이 대신 받고, 나는 낸 블록을 돌려받아요 — 확실히 피한 수예요` };
            else {
              const loss = myA.t === "pass" ? pen + pile / price : 0.5 * pen;
              out = { sev: rvSev(loss, myA.t === "pass" ? 100 : 45), why: `${head}. 받으면 약 −${fmt(Math.round(pen * 10) / 10)}점${myA.t === "pass" && pile > 0 ? ` · 낸 블록 ${pile}도 사라져요` : ""} — 합 ${kTot} 까지 올리면 다음 사람이 못 넘겨 대신 받고 나는 블록을 돌려받아요${myA.t === "pass" ? "" : " (이 합이면 확실)"}` };
            }
          } else {
            const minM = N.pickAdd(freeIdx.reduce((m, i) => m | (1 << i), 0), Math.max(1, top - pile + 1)), S = minM ? pile + (() => { let t = 0; for (let k = 0; k < N.NB; k++) if (minM & (1 << k)) t += N.BLOCKS[k]; return t; })() : 0;
            const gain = minM ? 0.4 * (pen * price + pile) - 0.6 * S : -1;      // 고급 AI 의 어림 (합을 올리면 다음 사람이 받아 줄 확률 약 40%)
            const lossB = myA.t === "pass" ? Math.max(0, gain) : Math.max(0, -(0.4 * (pen * price + pile) - 0.6 * T));
            out = { sev: rvSev(lossB / price, 35), why: `${head}. 받으면 약 −${fmt(Math.round(pen * 10) / 10)}점 — 확실히 피할 합이 없어 어림이에요 (올리면 낸 블록을 잃을 위험)` };
          }
        } else if (myA.t === "bid") {
          const over = T - L, pts = over > 0 ? over / price : 0;
          out = { sev: rvSev(pts), why: `${head} → ${lTxt}. 합 ${T} 낙찰이면 한도보다 ${Math.max(0, Math.round(over))}블록(≈${fmt(Math.round(pts * 10) / 10)}점) ${over > 0 ? "비싸요" : "— 한도 안이에요"}` };
        } else {
          const surplus = L - (top + 1), pts = surplus > 0 ? (0.5 * surplus) / price : 0;
          out = { sev: rvSev(pts), why: `${head} → ${lTxt} 인데 지금 최고 ${top}. 합 ${top + 1} 만 내도 ${surplus > 0 ? `이득 약 ${fmt(Math.round((surplus / price) * 10) / 10)}점이 남는 카드예요` : "남지 않아 패스도 괜찮아요"}` };
        }
      }
      const ok = x => typeof x === "string" && !/undefined|NaN|null|Infinity/.test(x);
      if (!out || typeof out.sev !== "number" || !isFinite(out.sev) || !ok(out.why)) return rvNoRev();
      if (out.my && !ok(out.my)) delete out.my;
      if (out.best && !ok(out.best)) delete out.best;
      return out;
    } catch (e) { return rvNoRev(); }
  }

  const SRC = "방송: 피의 게임 시즌2 · 숫자 경매 (세미파이널)";
  const DIFF = "※ 방송과 다른 점: 3~6명이 해요 · 입찰은 돌아가며 한 명씩 (합이 제일 큰 사람은 차례가 안 와요) · 모두 패스해 한 명만 남으면 블록 없이도 낙찰 · 블록 추가 구매는 없고 블록 · 점수는 모두 공개 · GOOD은 장마다 ×2 · 반납한 카드는 게임에서 빠져요.";
  window.SVUI = window.SVUI || {};
  window.SVUI.numauction = {
    actText: a => !a ? "—" : a.t === "pass" ? "패스" : a.t === "bid" ? `블록 ${(a.c || []).join(" + ")} (합 ${(a.c || []).reduce((s, v) => s + v, 0)})` : a.t === "ret" ? `돌려줄 카드 ${a.c < 10 ? a.c + 1 + "점" : "GOOD"}` : "행동",   // 🎞️ 복기 행동 글
    name: "숫자 경매", emoji: "🔨", short: "블록으로 카드를 사는 3~6명 경매", min: 3, max: 6, defN: 5, board: false,
    opts: [],
    src: SRC, diff: DIFF,
    howto: [
      "<b>목표</b>: 경매 카드를 사서 점수 1등 — 단 남은 블록이 혼자 가장 적은 1등은 자격을 잃어요",
      "<b>준비물</b>: 사람마다 자금 블록 11개 (1·2·3·4·6·8·10·12·15·20·25) · 경매 카드 16장 (매물 1~10 · GOOD 3 · BAD 3)",
      "<b>진행</b>: 카드 1장 공개 → 차례대로 블록을 얹어 합을 앞사람보다 크게, 또는 패스 (낸 블록 돌려받고 빠짐) → 한 명 남으면 낙찰, 낸 블록은 사라져요",
      "<b>승패</b>: 매물 합 → GOOD ×2 → −5 → 점수 절반 순으로 점수를 매겨요 · 점수 높은 쪽이 1등, 같으면 남은 블록이 많은 쪽 · 최하위는 탈락",
      "<b>특수</b>: BAD(−5 · 점수 절반 · 매물 반납)는 거꾸로 — 먼저 패스한 사람이 받아요 · GOOD 3장과 점수 절반이 팔리면 끝",
      SRC,
      DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}라운드 · ${PHN[V.phase] || ""} · ${cardLong(V.card)}`),
    chip: (V, i) => ({ t: `${fmt(V.score[i])}점${V.over && V.final && V.final.dq === i ? " ⛔" : ""}`, on: V.needs.includes(i) && !V.over, out: !!(V.over && V.final && V.final.out.includes(i)) }),
    render, result, coach, review,
    qa: (V, me, rnd) => N.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

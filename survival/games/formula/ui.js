/* 베니 서바이벌 · 수식 하이 로우 — 화면 (판 · 베팅 · 식 만들기 · 선언 · 공개 · 1분 규칙) */
(() => {
  "use strict";
  const F = window.SVCores.formula;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.fx-top{display:flex;align-items:center;gap:8px;flex:none}
.fx-pot{font:900 17px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:4px 12px;white-space:nowrap}
.fx-ph{font:800 13px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:4px 10px;white-space:nowrap}
.fx-log{flex:1;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.fx-opps{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:6px;flex:none}
.fx-opp{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:12px;padding:5px 6px;display:grid;gap:3px;min-width:0}
.fx-opps.cmp{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.fx-opps.cmp .fx-opp{padding:3px 5px;gap:2px;border-radius:10px;align-content:start}
.fx-opps.cmp .fx-opp .hd{font-size:11.5px}
.fx-opps.cmp .fx-cards{gap:2px}
.fx-opps.cmp .fx-opp.fold .fx-cards{display:none}
.fx-opps.cmp .fx-c{width:18px;height:25px;font-size:12px;border-radius:5px;border-width:1.5px;box-shadow:inset 0 -4px 0 var(--cc)}
.fx-opps.cmp .fx-c.back,.fx-opps.cmp .fx-c.sym{box-shadow:none}
.fx-opp.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.fx-opp.fold{opacity:.4}
.fx-opp .hd{display:flex;gap:4px;align-items:center;font:700 12px var(--round);min-width:0}
.fx-opp .hd b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.fx-opp .hd i{font-style:normal;font-size:11px;color:#fde68a;white-space:nowrap}
.fx-cards{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.fx-c{--cc:#64748b;position:relative;display:inline-grid;place-items:center;width:26px;height:34px;border-radius:6px;background:#f8fafc;color:#0f172a;
  font:900 15px/1 var(--round);border:2px solid var(--cc);box-shadow:inset 0 -5px 0 var(--cc)}
.fx-c.k0{--cc:#eab308}.fx-c.k1{--cc:#94a3b8}.fx-c.k2{--cc:#c2410c}.fx-c.k3{--cc:#111827}
.fx-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 4px,#991b1b 4px 8px);border-color:#fca5a5;box-shadow:none;color:#fecaca;font-size:12px}
.fx-c.sym{background:#312e81;color:#e0e7ff;border-color:#a5b4fc;box-shadow:none}
.fx-c.hid::after{content:"🔒";position:absolute;top:-7px;right:-7px;font-size:10px}
.fx-big .fx-c{width:38px;height:50px;font-size:22px;border-radius:9px}
.fx-op{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:rgba(124,58,237,.35);border:1px solid #a78bfa;font:900 15px var(--round);color:#fff}
.fx-me{display:flex;flex-direction:column;gap:6px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:7px 9px;flex:none}
.fx-me .hd{display:flex;justify-content:space-between;font:700 12.5px var(--round);color:#86efac}
.fx-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.fx-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.fx-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.fx-acts.bld{display:flex;flex-direction:column;flex:1 1 0;min-height:0;margin-top:0}
.fx-bs{display:grid;gap:6px;align-content:start;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.fx-acts.bld>.btn{flex:none}
.fx-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px}
.fx-btns .btn{padding:12px 8px;font-size:14.5px}
.fx-btns .btn.fold{background:rgba(127,29,29,.35);border-color:#f87171}
.fx-eq{display:grid;gap:4px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:12px;padding:6px 7px}
.fx-eq .lb{display:flex;justify-content:space-between;font:800 12.5px var(--round)}
.fx-eq .lb .v{color:#fde68a;font-variant-numeric:tabular-nums}
.fx-eq .lb .v.bad{color:#f87171}
.fx-toks{display:flex;gap:4px;align-items:center;justify-content:center}
.fx-t{border:0;padding:0;cursor:pointer;background:none;display:grid;place-items:center;transition:transform .1s}
.fx-t.sel{transform:translateY(-4px);filter:drop-shadow(0 0 6px #fde68a)}
.fx-t .fx-c{width:34px;height:44px;font-size:19px}
.fx-t .fx-op{width:30px;height:30px;font-size:17px}
.fx-t .rt{position:absolute;top:-8px;left:-4px;font:900 13px var(--round);color:#c4b5fd;text-shadow:0 1px 2px #000}
.fx-pool{display:flex;gap:4px;align-items:center;justify-content:center;font-size:11.5px;color:var(--soft)}
.fx-rts{display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:11.5px;color:var(--soft)}
.fx-rts button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:var(--ink);border-radius:8px;padding:3px 8px;font:700 12px var(--round);cursor:pointer}
.fx-rts button.on{background:rgba(124,58,237,.45);border-color:#c4b5fd}
.fx-show{display:grid;gap:5px;font-size:12.5px;overflow:auto;min-height:0}
.fx-show .r{display:grid;grid-template-columns:auto 1fr auto;gap:2px 8px;align-items:center;padding:5px 8px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.fx-show .r.win{border-color:var(--gold);background:rgba(245,179,1,.1)}
.fx-show .r b{font:800 13px var(--round)}
.fx-show .r .g{font:900 14px var(--round);color:#4ade80}
.fx-show .r .e{grid-column:1/-1;color:var(--soft);font-variant-numeric:tabular-nums}
.fx-show .r .e em{font-style:normal;color:#fde68a}
.fx-tut{display:grid;gap:8px;justify-items:center}
.fx-tut .fx-toks{gap:5px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const PH = { bet1: "1차 베팅", bet2: "2차 베팅", build: "식 만들기", declare: "선언", show: "공개", end: "끝" };
  const cardHtml = (c, extra = "") => {
    if (c < 0) return `<span class="fx-c back${extra}">?</span>`;
    if (F.isNum(c)) return `<span class="fx-c k${F.col(c)}${extra}" title="${F.COLORS[F.col(c)]} ${F.val(c)}">${F.val(c)}</span>`;
    return `<span class="fx-c sym${extra}">${F.isRoot(c) ? "√" : "×"}</span>`;
  };
  const opHtml = o => `<span class="fx-op">${F.OPN[o]}</span>`;
  const fmt = F.fmt;
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = i => esc(nameOf(ctx, i));
    if (e.k === "bet") return `${nm(e.s)} ${e.a === "raise" ? `레이즈 ${e.to}칩` : e.a === "call" ? "콜" : e.a === "check" ? "체크" : "폴드"}`;
    if (e.k === "deal") return `${nm(e.s)} ${F.cardName(e.c)} 받음`;
    if (e.k === "built") return `${nm(e.s)} 식 완성`;
    if (e.k === "declared") return `${nm(e.s)} 선언 완료`;
    if (e.k === "hand") return `${e.h}번째 판 시작`;
    return "";
  }

  // ── 식 만들기 상태 (이 기기에서만) ──
  let B = null;
  function builderFor(V, me, g) {
    const h = V.hands[me];
    const nums = [h.hid].concat(h.open);
    const key = `${g}|${V.hand}|${me}|${nums.join()}|${h.sym.join()}`;
    if (B && B.key === key) return B;
    const held = ["+", "-", "/"].concat(Array(h.muls).fill("*"));
    const ops = Array(h.muls).fill("*").concat(["+", "-", "/"].slice(0, 3 - h.muls)).slice(0, 3);
    // 처음 줄은 '낼 수 있는 식'으로 (0 으로 나누는 식이 처음부터 떠 있지 않게): 숫자 차례를 몇 가지 바꿔 보며 처음으로 계산되는 것을 씀
    const ORD = [[0, 1, 2, 3], [1, 0, 2, 3], [0, 1, 3, 2], [2, 1, 0, 3], [3, 2, 1, 0], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2]];
    const mk = first => {
      const cand = first ? ORD : ORD.slice().reverse();
      for (const p of cand) {
        const n = p.map(k => nums[k]), rc = Array(h.roots).fill(nums[p[0]]);
        if (isFinite(F.evalEq({ n, o: ops, r: n.map(c => rc.filter(x => x === c).length) }))) return { n, o: ops.slice(), rc };
      }
      return { n: nums.slice(), o: ops.slice(), rc: Array(h.roots).fill(nums[0]) };
    };
    B = { key, held, rows: { H: mk(true), L: mk(false) }, sel: null };
    return B;
  }
  const rowEq = row => ({ n: row.n.slice(), o: row.o.slice(), r: row.n.map(c => row.rc.filter(x => x === c).length) });
  const poolOf = row => { const left = B.held.slice(); for (const o of row.o) { const k = left.indexOf(o); if (k >= 0) left.splice(k, 1); } return left; };
  function rowHtml(V, me, side) {
    const row = B.rows[side], e = rowEq(row), H = V.hands[me];
    const err = F.checkEq(H, e), v = F.evalEq(e);
    const target = side === "H" ? 20 : 1;
    const sel = B.sel;
    const isSel = (k, i) => sel && sel.side === side && sel.k === k && sel.i === i;
    let toks = "";
    row.n.forEach((c, i) => {
      const rts = row.rc.filter(x => x === c).length;
      toks += `<button type="button" class="fx-t${isSel("n", i) ? " sel" : ""}" data-side="${side}" data-k="n" data-i="${i}" aria-label="숫자 ${F.val(c)}"><span style="position:relative">${cardHtml(c)}${rts ? `<span class="rt">${"√".repeat(rts)}</span>` : ""}</span></button>`;
      if (i < 3) toks += `<button type="button" class="fx-t${isSel("o", i) ? " sel" : ""}" data-side="${side}" data-k="o" data-i="${i}" aria-label="기호">${opHtml(row.o[i])}</button>`;
    });
    const pool = poolOf(row);
    const poolH = pool.length ? `<div class="fx-pool">뺀 기호 ${pool.map((o, i) => `<button type="button" class="fx-t${isSel("p", i) ? " sel" : ""}" data-side="${side}" data-k="p" data-i="${i}">${opHtml(o)}</button>`).join("")} <span>← 눌러서 바꾸기</span></div>` : "";
    let rts = "";
    for (let j = 0; j < row.rc.length; j++) rts += `<div class="fx-rts">√${j + 1} 붙일 숫자 ${row.n.map(c => `<button type="button" data-side="${side}" data-root="${j}" data-c="${c}" class="${row.rc[j] === c ? "on" : ""}">${F.val(c)}</button>`).join("")}</div>`;
    const vTxt = err ? `<span class="v bad">${esc(err.replace(/^.*: /, ""))}</span>` : `<span class="v">= ${fmt(v)} · ${target}까지 ${fmt(Math.abs(v - target))}</span>`;
    return `<div class="fx-eq"><div class="lb"><span>${side === "H" ? "🔼 하이 식 (20)" : "🔽 로우 식 (1)"}</span>${vTxt}</div><div class="fx-toks">${toks}</div>${poolH}${rts}</div>`;
  }
  function tapTok(side, k, i) {
    const row = B.rows[side], s = B.sel;
    if (s && s.side === side && s.k === k && s.i === i) { B.sel = null; return; }
    if (s && s.side === side) {
      if (s.k === "n" && k === "n") { const t = row.n[s.i]; row.n[s.i] = row.n[i]; row.n[i] = t; B.sel = null; return; }
      const opK = x => x === "o" || x === "p";
      if (s.k === "p" && k === "p") { B.sel = { side, k, i }; return; }   // 뺀 기호끼리는 바꿀 것이 없음 → 다시 고름
      if (opK(s.k) && opK(k)) {
        const pool = poolOf(row);
        const get = (kk, ii) => kk === "o" ? row.o[ii] : pool[ii];
        if (s.k === "o" && k === "o") { const t = row.o[s.i]; row.o[s.i] = row.o[i]; row.o[i] = t; }
        else { const oi = s.k === "o" ? s.i : i, pi = s.k === "p" ? s.i : i; row.o[oi] = get("p", pi); }
        B.sel = null; return;
      }
    }
    B.sel = { side, k, i };
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, myH = me >= 0 ? V.hands[me] : null;
    const opps = V.hands.map((h, i) => i).filter(i => i !== me);
    let h = `<div class="fx-top"><span class="fx-pot">🪙 판돈 ${V.pot}</span><span class="fx-ph">${PH[V.phase] || ""}</span><span class="fx-log">${logText(V, ctx)}</span></div>`;
    const watchAll = ctx.mode === "watch" || me < 0;
    h += `<div class="fx-opps${opps.length >= 4 ? " cmp" : ""}">${opps.map(i => {
      const H = V.hands[i];
      if (!H) return `<div class="fx-opp fold"><div class="hd"><b>${esc(nameOf(ctx, i))}</b><i>쉼</i></div></div>`;
      const st = V.folded[i] ? "폴드" : V.phase.startsWith("bet") ? (V.bet[i] ? `건 ${V.bet[i]}` : "") : V.phase === "build" ? (V.built[i] ? "✓ 식" : "…") : V.phase === "declare" ? (V.declared[i] ? "✓ 선언" : "…") : V.decl[i] ? { H: "🔼하이", L: "🔽로우", S: "↕스윙" }[V.decl[i]] : "";
      const turn = V.needs.includes(i) && V.phase.startsWith("bet");
      return `<div class="fx-opp${V.folded[i] ? " fold" : ""}${turn ? " turn" : ""}"><div class="hd"><b>${esc(nameOf(ctx, i))}</b><i>${st}</i></div><div class="fx-cards">${cardHtml(H.hid)}${H.open.map(c => cardHtml(c)).join("")}${H.sym.map(c => cardHtml(c)).join("")}</div></div>`;
    }).join("")}</div>`;
    if (myH && !(V.phase === "build" && ctx.canAct)) {
      h += `<div class="fx-me"><div class="hd"><span>내 카드 ${V.folded[me] ? "· 폴드" : ""}</span><span>기호 ${["+", "-", "/"].map(o => F.OPN[o]).join(" ")}${myH.muls ? " · ×" + myH.muls : ""}${myH.roots ? " · √" + myH.roots : ""}</span></div>
        <div class="fx-row fx-big">${cardHtml(myH.hid, " hid")}${myH.open.map(c => cardHtml(c)).join("")}${myH.sym.map(c => cardHtml(c)).join("")}</div></div>`;
    }
    // 아래 행동 칸
    let acts = "", bld = false;
    if (V.phase === "show" && V.res) { acts = showHtml(V, ctx); bld = true; }
    else if (!watchAll && myH && !V.folded[me]) {
      if ((V.phase === "bet1" || V.phase === "bet2")) {
        if (ctx.canAct) {
          const toCall = V.cur - V.bet[me];
          const raises = [];
          if (V.raises < V.maxRaise && V.cap > V.cur) { for (const to of [V.cur + 1, V.cur + 3, V.cap]) if (to <= V.cap && to > V.cur && !raises.includes(to)) raises.push(to); }
          acts = `<div class="note">${toCall > 0 ? `앞사람이 ${V.cur}칩까지 걸었어요 · 콜하려면 ${toCall}칩` : "아직 건 칩이 없어요"} · 이 판 최대 ${V.cap}칩</div>
            <div class="fx-btns">${toCall > 0 ? `<button class="btn primary" data-a="call">콜 ${toCall}</button>` : `<button class="btn primary" data-a="check">체크</button>`}
            ${raises.map(to => `<button class="btn" data-a="raise" data-to="${to}">레이즈 ${to}</button>`).join("")}
            <button class="btn fold" data-a="fold">폴드</button></div>`;
        } else acts = `<div class="note">${esc(nameOf(ctx, V.turn))} 차례예요…</div>`;
      } else if (V.phase === "build") {
        if (ctx.canAct) {
          const b = builderFor(V, me, ctx.g);
          void b;
          acts = `<div class="fx-bs">${rowHtml(V, me, "H")}${rowHtml(V, me, "L")}<div class="note">같은 종류 두 개를 차례로 누르면 자리가 바뀌어요</div></div><button class="btn primary big" data-a="eq">✔ 식 두 개 내기</button>`;
          bld = true;
        } else acts = `<div class="note">다른 사람이 식을 만드는 중… (${V.built.filter(Boolean).length}/${V.hands.filter((x, i) => x && !V.folded[i]).length})</div>`;
      } else if (V.phase === "declare") {
        if (ctx.canAct) {
          const vh = F.evalEq(V.eqH[me]), vl = F.evalEq(V.eqL[me]);
          acts = `<div class="note">어느 쪽으로 겨룰까요? (모두 동시에 공개)</div><div class="fx-btns">
            <button class="btn primary" data-a="decl" data-d="H">🔼 하이 · ${fmt(vh)}</button>
            <button class="btn primary" data-a="decl" data-d="L">🔽 로우 · ${fmt(vl)}</button>
            <button class="btn" data-a="decl" data-d="S">↕ 스윙</button></div>`;
        } else acts = `<div class="note">다른 사람 선언을 기다려요… (${V.declared.filter(Boolean).length}/${V.hands.filter((x, i) => x && !V.folded[i]).length})</div>`;
      }
    } else if (myH && V.folded[me]) acts = `<div class="note">이번 판은 접었어요 · 다음 판을 기다려요</div>`;
    else if (watchAll && V.phase !== "show") acts = `<div class="note">${V.needs.length ? V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") + " 생각 중…" : ""}</div>`;
    h += `<div class="fx-acts${bld ? " bld" : ""}">${acts}</div>`;
    const oldBs = stage.querySelector(".fx-bs"), sy = oldBs ? oldBs.scrollTop : 0;   // 토큰을 눌러 다시 그려도 스크롤 자리 유지
    stage.innerHTML = h;
    if (sy) { const nb = stage.querySelector(".fx-bs"); if (nb) nb.scrollTop = sy; }
    stage.onclick = e => {
      const t = e.target.closest("[data-side]");
      if (t && B) {
        if (t.dataset.root != null) { B.rows[t.dataset.side].rc[+t.dataset.root] = +t.dataset.c; }
        else tapTok(t.dataset.side, t.dataset.k, +t.dataset.i);
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      ctx.sfx("pop");
      if (a === "eq") { ctx.act({ t: "eq", h: rowEq(B.rows.H), l: rowEq(B.rows.L) }); return; }
      if (a === "decl") { ctx.act({ t: "decl", d: b.dataset.d }); return; }
      if (a === "raise") { ctx.act({ t: "raise", to: +b.dataset.to }); return; }
      ctx.act({ t: a });
    };
  }
  function showHtml(V, ctx) {
    const R = V.res;
    if (R.fold) return `<div class="fx-show"><div class="r win"><span>🏆</span><b>${esc(nameOf(ctx, R.win[0]))}</b><span class="g">+${R.pot}</span><span class="e">다른 사람이 모두 접어서 판돈을 가져가요</span></div></div>`;
    const gain = Object.fromEntries(R.gain);
    return `<div class="fx-show">${R.rows.map(x => {
      const tag = { H: "🔼하이", L: "🔽로우", S: "↕스윙" }[x.d] || "";
      const win = gain[x.i] > 0;
      const fail = R.swingFail.includes(x.i);
      const showH = x.d !== "L", showL = x.d !== "H";
      return `<div class="r${win ? " win" : ""}"><span>${x.i === R.hi ? "🔼" : x.i === R.lo ? "🔽" : fail ? "💥" : "·"}</span><b>${esc(nameOf(ctx, x.i))} ${tag}${fail ? " 실패" : ""}</b><span class="g">${win ? "+" + gain[x.i] : ""}</span>
        <span class="e">${showH ? `${esc(x.eH)} = <em>${fmt(x.vH)}</em>` : ""}${showH && showL ? " · " : ""}${showL ? `${esc(x.eL)} = <em>${fmt(x.vL)}</em>` : ""}</span></div>`;
    }).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const k = (v, c) => `<span class="fx-c k${c}">${v}</span>`;
    return [
      { tag: "STEP 1 · 카드", title: "숫자 카드 + 기호 카드", body: "숫자 0~10 이 <b>금 · 은 · 동 · 흑</b> 네 색으로 있어요. 모두 <b>+ − ÷</b> 기호를 한 장씩 갖고 시작해요. 가끔 <b>√</b> 나 <b>×</b> 카드가 와요.",
        boardHtml: `<div class="fx-tut"><div class="fx-row fx-big">${k(10, 0)}${k(7, 1)}${k(3, 2)}${k(0, 3)}<span class="fx-c sym">√</span><span class="fx-c sym">×</span></div><div class="fx-row">${opHtml("+")}${opHtml("-")}${opHtml("/")}</div></div>`, ms: 5200 },
      { tag: "STEP 2 · 받기", title: "숨긴 1장 + 공개 3장", body: "처음에 <b>숨긴 숫자 1장</b>(나만 봄)과 <b>공개 2장</b>을 받고 1차 베팅 → 공개 1장을 더 받아요. √ 나 × 가 오면 숫자를 한 장 더 받아요.",
        boardHtml: `<div class="fx-tut"><div class="fx-row fx-big"><span class="fx-c k0 hid">8</span>${k(4, 1)}${k(10, 2)}<span class="fx-c back">?</span></div><small>🔒 숨긴 카드는 나만 · 나머지는 모두에게 보여요</small></div>`, ms: 5200 },
      { tag: "STEP 3 · 식", title: "직접 해 봐요: 20 만들기", body: "숫자 4장 · 기호 3개를 <b>모두</b> 써서 한 줄 식을 만들어요. <b>곱셈 · 나눗셈이 먼저</b>예요. 숫자 둘을 차례로 눌러 자리를 바꿔 <b>20</b>을 만들어 보세요!",
        interactive: { hint: "👆 숫자 두 개를 차례로 눌러 자리 바꾸기", doneText: "✅ 10 + 10 − 0 ÷ 5 = 20!" },
        render(stage, ctrl) {
          const ids = [5, 10, 0, 21]; let order = [0, 1, 2, 3], sel = -1;   // 금5 금10 금0 은10
          const ops = ["+", "-", "/"];
          const draw = () => {
            const e = { n: order.map(i => ids[i]), o: ops, r: [0, 0, 0, 0] }, v = F.evalEq(e);
            stage.innerHTML = `<div class="fx-tut"><div class="fx-toks">${order.map((oi, p) => `<button type="button" class="fx-t${sel === p ? " sel" : ""}" data-p="${p}">${cardHtml(ids[oi])}</button>${p < 3 ? opHtml(ops[p]) : ""}`).join("")}</div><b style="font-size:18px">= ${fmt(v)}</b></div>`;
            if (Math.abs(v - 20) < 1e-9) ctrl.complete();
          };
          stage.onclick = e => { const b = e.target.closest("[data-p]"); if (!b) return; const p = +b.dataset.p; if (sel < 0) sel = p; else { const t = order[sel]; order[sel] = order[p]; order[p] = t; sel = -1; } ctrl.sfx("tap"); draw(); };
          draw();
        } },
      { tag: "STEP 4 · 베팅", title: "카드 사이사이 칩 걸기", body: "참가비 1칩을 내고, 카드를 받는 사이 두 번 걸어요. <b>체크</b>(안 걸고 넘김) · <b>콜</b>(따라 걸기) · <b>레이즈</b>(더 걸기) · <b>폴드</b>(포기). 한 판에 거는 칩은 남은 사람 중 가장 적은 칩까지예요.",
        boardHtml: `<div class="fx-tut"><span class="fx-pot">🪙 판돈 9</span><div class="fx-btns" style="width:100%"><span class="btn primary">콜 2</span><span class="btn">레이즈 5</span><span class="btn fold">폴드</span></div></div>`, ms: 5600 },
      { tag: "STEP 5 · 선언", title: "하이(20) · 로우(1) · 스윙", body: "식을 두 개(하이용 · 로우용) 만든 뒤 2차 베팅, 그리고 모두 동시에 <b>하이</b> 또는 <b>로우</b>를 골라요. 하이 1등 · 로우 1등이 판돈을 <b>반씩</b>! <b>스윙</b>은 두 쪽 다 이기면 전부, 하나라도 지면 빈손.",
        boardHtml: `<div class="fx-tut"><div class="fx-row"><b>🔼 19.5</b><span>vs</span><b>🔽 1.2</b></div><small>같으면 하이는 가장 큰 숫자 카드, 로우는 가장 작은 숫자 카드가 이겨요</small></div>`, ms: 6000 },
      { tag: "STEP 6 · 끝", title: "칩을 가장 많이 남기면 1등", body: "칩 20개로 5판(또는 8판). 칩이 다 떨어지면 탈락. 막히면 <b>🧑‍🏫 AI 선생님</b>이 상대 흐름 · 내 확률 · 추천 수를 알려 줘요.",
        boardHtml: `<div class="fx-tut"><span style="font-size:42px">🏆</span></div>`, ms: 4200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.formula = {
    name: "수식 하이 로우", emoji: "🧮", short: "식으로 1 · 20 맞히기 + 칩", min: 2, max: 6, defN: 4, board: false,
    opts: [{ k: "rounds", label: "판 수", items: [[5, "5판"], [8, "8판"]], def: 5 }],
    howto: [
      "숫자 카드 4장과 <b>+ − ÷</b>(가끔 √ · ×)로 식을 만들어 <b>20(하이)</b>이나 <b>1(로우)</b>에 가깝게",
      "숨긴 1장 + 공개 3장, 카드 사이사이 <b>두 번 베팅</b> (체크 · 콜 · 레이즈 · 폴드)",
      "하이 1등 · 로우 1등이 판돈을 반씩, <b>스윙</b>은 둘 다 이겨야 전부",
      "칩을 가장 많이 남기면 1등",
    ],
    sub: (V) => V.over ? "끝" : `${V.hand} / ${V.R}판 · ${PH[V.phase] || ""}`,
    chip: (V, i) => ({ t: `🪙${V.chips[i]}`, on: V.needs.includes(i) && !V.over, out: !V.hands[i] && V.chips[i] <= 0 }),
    render,
    coach: (V, me, since, names) => F.coach(V, me, since, names),
    qa: (V, me, rnd) => F.ai(V, me, "easy", rnd),                  // 자동 시험이 내 차례에 둘 수 (shell · 화면 시험틀)
    tutorial,
  };
})();

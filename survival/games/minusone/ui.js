/* 베니 서바이벌 · 하나 빼기 — 화면 (3~8명 · 2장 내기 → 공개 → 몰래 1장 쓰기 · 정산 · 1분 규칙 · AI 선생님 · 복기) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const K = window.SVCores.minusone;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.m1-top{display:flex;gap:8px;align-items:center;flex:none;min-height:38px}
.m1-rd{flex:none;min-width:52px;height:38px;border-radius:10px;display:grid;place-items:center;align-content:center;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.45);font:900 18px/1 var(--round);color:#fde68a}
.m1-rd small{font:700 9.5px var(--round);color:var(--soft)}
.m1-info{min-width:0;flex:1;display:grid;gap:1px}
.m1-info .l1{font:800 12.5px var(--round);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m1-info .l1 b{color:#fde68a}
.m1-info .l2{font-size:11.5px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m1-ps{display:grid;gap:2px;flex:none}
.m1-p{display:grid;grid-template-columns:minmax(0,1fr) 40px 20px 79px 50px;gap:5px;align-items:center;height:22px;padding:0 5px;border-radius:7px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08)}
.m1-p.me{border-color:rgba(134,239,172,.45);background:rgba(34,197,94,.08)}
.m1-p.turn{box-shadow:inset 0 0 0 1px var(--gold)}
.m1-p.win{background:rgba(245,179,1,.2);border-color:#f5b301}
.m1-p.safe{opacity:.55}
.m1-p.dead{opacity:.55;background:rgba(127,29,29,.3)}
.m1-p .nm{min-width:0;display:flex;gap:4px;align-items:baseline;white-space:nowrap;overflow:hidden}
.m1-p .nm b{font:800 11.5px var(--round);overflow:hidden;text-overflow:ellipsis;min-width:0}
.m1-p .nm i{font-style:normal;font-size:10px;color:var(--soft);flex:none}
.m1-p .wide{grid-column:2 / 5;font-size:10.5px;color:#86efac;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m1-p.dead .wide{color:#fca5a5}
.m1-pair{display:flex;gap:4px}
.m1-mc{width:18px;height:18px;border-radius:4px;display:grid;place-items:center;font:900 11px/1 var(--round);background:#f1f5f9;color:#0f172a;border:1px solid #94a3b8}
.m1-mc.bk{background:repeating-linear-gradient(45deg,#475569 0 3px,#334155 3px 6px);border-color:#64748b}
.m1-mc.no{background:transparent;border:1px dashed rgba(255,255,255,.25)}
.m1-mc.dim{opacity:.38}
.m1-mc.ok{background:transparent;border:1px solid rgba(134,239,172,.6);color:#86efac}
.m1-mc.w{background:#fde68a;border-color:#f59e0b;box-shadow:0 0 6px rgba(245,158,11,.8)}
.m1-mc.d{background:#fecdd3;border-color:#fb7185;color:#9f1239;text-decoration:line-through}
.m1-hd{display:flex;gap:1px}
.m1-hd span{width:9px;height:14px;border-radius:2px;display:grid;place-items:center;font:800 8.5px/1 var(--round);background:rgba(255,255,255,.75);color:#0f172a}
.m1-hd span.x{background:rgba(255,255,255,.08);color:rgba(255,255,255,.25)}
.m1-hd span.h{background:#fbbf24}
.m1-sc{text-align:right;font:800 11px var(--round);font-variant-numeric:tabular-nums;white-space:nowrap}
.m1-sc b{color:#fde68a}
.m1-sc em{font-style:normal;color:#f5b301}
.m1-me{border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:12px;padding:5px 7px;display:grid;gap:4px;flex:none}
.m1-me.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.m1-me .hd{display:flex;justify-content:space-between;gap:6px;font:700 11.5px var(--round);color:#86efac;white-space:nowrap;overflow:hidden}
.m1-me .hd span:last-child{color:var(--soft);overflow:hidden;text-overflow:ellipsis}
.m1-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.m1-c{position:relative;height:44px;border-radius:9px;border:2px solid #cbd5e1;background:linear-gradient(#f8fafc,#e2e8f0);color:#0f172a;font:900 21px/1 var(--round);padding:0;cursor:pointer;transition:transform .08s}
.m1-c small{position:absolute;right:4px;bottom:3px;font:800 9px var(--round);color:#475569}
.m1-c.sel{background:linear-gradient(#fde68a,#f59e0b);border-color:#fff;transform:translateY(-2px);box-shadow:0 3px 10px rgba(245,158,11,.55)}
.m1-c.h{background:rgba(251,191,36,.18);border:2px dashed #fbbf24;color:#fde68a;cursor:default}
.m1-c.h small{color:#fbbf24}
.m1-c.x{background:#1e293b;border-color:#334155;color:#475569;text-decoration:line-through;cursor:default}
.m1-c.pk{border-color:#f5b301;box-shadow:0 0 0 2px #f5b301;animation:m1P 1s ease-in-out infinite alternate}
.m1-c.used{background:linear-gradient(#fde68a,#f59e0b)}
.m1-c:disabled:not(.h):not(.x){opacity:.5;cursor:default}
@keyframes m1P{from{box-shadow:0 0 0 2px #f5b301}to{box-shadow:0 0 0 4px rgba(245,179,1,.55),0 0 12px rgba(245,179,1,.6)}}
.m1-acts{display:grid;gap:4px;margin-top:auto;flex:none}
.m1-acts .note{text-align:center;font-size:12px;color:var(--soft);line-height:1.35}
.m1-acts .note b{color:#fde68a}
.m1-acts .btn{min-height:44px;font-size:14px}
.m1-res{border:1px solid var(--gold);background:rgba(245,179,1,.1);border-radius:12px;padding:5px 9px;display:grid;gap:1px;text-align:center}
.m1-res .t{font:900 14px var(--round)}
.m1-res .d{font-size:11.5px;color:var(--soft);line-height:1.35}
.m1-res.st{border-color:#86efac;background:rgba(34,197,94,.12)}
.m1-tut{display:grid;gap:8px;justify-items:center;width:100%}
.m1-tut .row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center}
.m1-tut small{color:var(--soft);text-align:center}
.m1-tut .m1-c{width:58px}
.m1-tut .tag{font:800 12px var(--round);padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);color:#fde68a}
.m1-rs{display:grid;gap:4px}
.m1-rs .r{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:baseline}
.m1-rs .r b{color:#fde68a}
.m1-rs .n{font-size:12px;color:var(--soft)}
@media (min-height:760px){
.m1-p{height:26px}
.m1-mc{width:20px;height:20px;font-size:12px}
.m1-c{height:50px;font-size:23px}
.m1-me{padding:7px 9px;gap:6px}
}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  // ── 조사 (받침: 숫자 0·1·3·6·7·8 은 있음, 1·7·8 은 ㄹ) ──
  const jongOf = raw => {
    const s = String(raw).replace(/<[^>]*>/g, "").replace(/[\s)\]"'.,!?…·]+$/, ""), ch = s.slice(-1), c = ch.charCodeAt(0);
    if (!ch) return 0;
    if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (/[0-9]/.test(ch)) return "178".includes(ch) ? 2 : "036".includes(ch) ? 1 : 0;
    if (/[A-Za-z]/.test(ch)) return "lLrR".includes(ch) ? 2 : "mMnN".includes(ch) ? 1 : 0;
    return 0;
  };
  const JO = { ga: ["이", "가"], un: ["은", "는"], ul: ["을", "를"], wa: ["과", "와"], ie: ["이에요", "예요"] };
  const josa = (raw, k) => (k === "ro" ? (jongOf(raw) === 1 ? "으로" : "로") : JO[k][jongOf(raw) ? 0 : 1]);
  const J = (raw, k) => `${esc(raw)}${josa(raw, k)}`;
  const ME = { ga: "내가", un: "나는", ul: "나를", wa: "나와" };
  const pct = p => `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
  let NAMES = [], S = { key: "", sel: [] };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const who = (ctx, i, k) => (i === ctx.me && ME[k] ? ME[k] : J(nameOf(ctx, i), k));
  const aliveN = V => V.alive.filter(Boolean).length;
  const left = V => (V.next ? V.next.r - V.round : 0);                    // 이번 라운드 뒤 정산까지 남은 라운드 (0 = 이번 라운드 끝에 정산)
  const setTxt = V => (!V.next ? "" : `${V.next.r}라운드 끝 정산 · ${V.next.k > 1 ? `${V.next.k}명 생존 · 1명 탈락` : "1명 생존"}`);

  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = i => esc(nameOf(ctx, i));
    if (e.k === "round" || e.k === "forced" || e.k === "lock") { const done = V.subbed.filter((x, s) => x && V.alive[s]).length; return `2장 낸 사람 ${done}/${aliveN(V)}`; }
    if (e.k === "open" || e.k === "mark") { const done = V.picked.filter((x, s) => x && V.alive[s]).length; return `공개! 쓸 카드 고른 사람 ${done}/${aliveN(V)}`; }
    if (e.k === "res") return e.w >= 0 ? `${nm(e.w)} ${J(e.c, "ro")} 승리 (+${e.c}점 ★)` : "하나뿐인 숫자가 없어 승자 없음";
    if (e.k === "settle") return e.fin ? `마지막 정산 — ${e.surv.map(nm).join(" · ")} 생존` : `정산 — ${nm(e.surv[0])} 생존`;
    if (e.k === "reset") return "카드 8장이 다시 돌아왔어요";
    if (e.k === "end") return "게임 끝";
    return "";
  }

  // 한 사람 줄: 이름 · 낸 2장 · 쓴 카드 · 남은 카드 · 승점/표식
  function row(V, ctx, i) {
    const me = ctx.me, R = V.res, shown = V.phase === "show" || V.phase === "end";
    const sk = V.safe.indexOf(i);
    const cls = `m1-p${i === me ? " me" : ""}${V.needs.includes(i) && !V.over ? " turn" : ""}${shown && R && R.w === i ? " win" : ""}${sk >= 0 ? " safe" : ""}${V.elim === i ? " dead" : ""}`;
    const nm = `<div class="nm"><b>${esc(i === me && nameOf(ctx, i) !== "나" ? `${nameOf(ctx, i)} (나)` : nameOf(ctx, i))}</b>${V.alive[i] && !V.over ? `<i>${V.phase === "sub" ? (V.subbed[i] ? "✓" : "⏳") : V.phase === "pick" ? (V.picked[i] ? "✓" : "⏳") : ""}</i>` : ""}</div>`;
    const sc = `<div class="m1-sc">⭐<b>${V.score[i]}</b> <em>★${V.marks[i]}</em></div>`;
    const st = (sk >= 0 || V.elim === i) ? (V.setl || []).find(x => x.surv.includes(i) || x.elim === i) : null;
    const just = shown && R && R.sub && R.sub[i] && st && st.r === V.round;     // 이번 라운드에 생존 · 탈락 → 이번 라운드 카드는 보여 줌
    if ((sk >= 0 || V.elim === i) && !just) {
      const txt = V.elim === i ? `❌ 탈락 (${st ? st.r : V.round}라운드)` : `✅ ${sk + 1}번째 생존 (${st ? st.r : "?"}라운드)`;
      return `<div class="${cls}">${nm}<div class="wide">${txt}</div>${sc}</div>`;
    }
    const sub = V.sub[i], useRes = shown && R && R.pick && R.pick[i] ? R.pick[i] : null;
    const subShow = shown && R && R.sub ? R.sub[i] : sub;
    let pair;
    if (subShow) pair = subShow.map(c => `<span class="m1-mc${useRes && c !== useRes ? " dim" : ""}">${c}</span>`).join("");
    else if (V.subbed[i]) pair = `<span class="m1-mc bk"></span><span class="m1-mc bk"></span>`;
    else pair = `<span class="m1-mc no"></span><span class="m1-mc no"></span>`;
    let mk;
    if (useRes) mk = `<span class="m1-mc${R.w === i ? " w" : R.dup.includes(useRes) ? " d" : ""}">${useRes}</span>`;
    else if (V.phase === "pick" && V.picked[i]) mk = V.pick[i] ? `<span class="m1-mc ok">${V.pick[i]}</span>` : `<span class="m1-mc ok">✓</span>`;
    else mk = `<span class="m1-mc no"></span>`;
    const hand = new Set(V.hand[i]);
    let hd = "";
    for (let c = 1; c <= K.NC; c++) hd += `<span class="${!hand.has(c) ? "x" : V.hold[i] === c ? "h" : ""}">${c}</span>`;
    return `<div class="${cls}">${nm}<div class="m1-pair">${pair}</div>${mk}<div class="m1-hd" title="남은 카드 (노랑 = 이번 라운드 쉼)">${hd}</div>${sc}</div>`;
  }

  function resHtml(V, ctx) {
    const R = V.res; if (!R) return "";
    const nm = i => esc(nameOf(ctx, i));
    const used = V.alive.map((a, s) => (R.pick[s] ? s : -1)).filter(s => s >= 0).map(s => R.pick[s]).sort((a, b) => a - b);
    let t = R.w >= 0 ? `🏆 ${who(ctx, R.w, "ga")} ${J(R.c, "ro")} 승리 · +${R.c}점 ★1` : "🤝 하나뿐인 숫자가 없어 승자 없음";
    let d = `쓴 카드 ${used.join(" · ") || "—"}${R.dup.length ? ` · 겹쳐서 빠짐: ${R.dup.join(", ")}` : ""}`;
    let cls = "m1-res";
    if (R.settle) {
      const X = R.settle, row0 = s => X.rows.find(x => x.s === s), sum = s => { const x = row0(s); return x ? `승점 ${x.sc} + ★${x.m} = ${x.t}` : ""; };
      cls += " st";
      const why = X.why === "marks" ? " (같은 점수 → 표식이 많아서)" : X.why === "recent" ? " (점수 · 표식 같음 → 더 최근에 이겨서)" : X.why === "lot" ? " (모두 같아서 추첨)" : "";
      if (X.fin) { const w0 = X.why0 === "marks" ? ` · 1 · 2등은 같은 점수 → 표식으로` : X.why0 === "recent" ? ` · 1 · 2등은 더 최근에 이긴 쪽이 먼저` : X.why0 === "lot" ? ` · 1 · 2등은 추첨` : ""; t = `🏁 마지막 정산 — ${X.surv.map(nm).join(" · ")} 생존, ${nm(X.elim)} 탈락`; d = `${X.rows.map(x => `${nm(x.s)} ${x.t}`).join(" · ")}${why}${w0}`; }
      else { t = `✅ 정산 — ${nm(X.surv[0])} 생존 (${sum(X.surv[0])})`; d = `${R.w >= 0 ? `이번 라운드 ${nm(R.w)} ${R.c} 승리 · ` : ""}남은 사람 승점은 0으로, 표식은 그대로${why}`; }
    } else if (R.reset) d += " · 카드 8장이 다시 돌아와요";
    return `<div class="${cls}"><div class="t">${t}</div><div class="d">${d}</div></div>`;
  }

  function render(stage, V, ctx) {
    style();
    NAMES = (ctx.seats || []).map(s => (s && s.name) || "");
    const me = ctx.me, watch = !(me >= 0), n = V.n;
    const myTurn = !watch && ctx.canAct && V.needs.includes(me) && !V.over;
    const key = `${ctx.g}|${V.round}|${V.phase}|${me}`;
    if (S.key !== key) S = { key, sel: [] };
    const l1 = V.over ? "게임이 끝났어요" : `${setTxt(V)}${left(V) > 0 ? ` (<b>${left(V)}</b>라운드 뒤)` : " (<b>이번 라운드</b>)"}`;
    let h = `<div class="m1-top"><div class="m1-rd"><small>라운드</small>${V.round}<small>/${V.R}</small></div><div class="m1-info"><div class="l1">${l1}</div><div class="l2">${logText(V, ctx)}${V.reset < V.R && !V.over ? ` · 카드 리셋 ${V.reset}라운드 끝` : ""}</div></div></div>`;
    const order = []; if (watch) for (let i = 0; i < n; i++) order.push(i); else { order.push(me); for (let k = 1; k < n; k++) order.push((me + k) % n); }
    h += `<div class="m1-ps">${order.map(i => row(V, ctx, i)).join("")}</div>`;
    // 내 카드
    if (!watch && V.alive[me] && !V.over) {
      const hand = new Set(V.hand[me]), mySub = V.sub[me] || [], pickPh = V.phase === "pick", subPh = V.phase === "sub";
      let grid = "";
      for (let c = 1; c <= K.NC; c++) {
        const has = hand.has(c), hold = V.hold[me] === c, si = S.sel.indexOf(c);
        let cls = "m1-c", lab = "", en = false;
        if (!has) { cls += " x"; lab = "씀"; }
        else if (hold) { cls += " h"; lab = "쉼"; }
        else if (subPh) { en = myTurn; if (si >= 0) { cls += " sel"; lab = si ? "오른쪽" : "왼쪽"; } else if (mySub.includes(c)) { cls += " sel"; lab = mySub[0] === c ? "왼쪽" : "오른쪽"; } }
        else if (pickPh && mySub.includes(c)) { if (V.pick[me] === c) { cls += " used"; lab = "쓸 카드"; } else if (myTurn) { cls += " pk"; en = true; lab = "쓰기?"; } else lab = "냄"; }
        grid += `<button type="button" class="${cls}" data-c="${c}" ${en ? "" : "disabled"} aria-label="카드 ${c}${lab ? " " + lab : ""}">${c}${lab ? `<small>${lab}</small>` : ""}</button>`;
      }
      const hold = V.hold[me];
      h += `<div class="m1-me${myTurn ? " turn" : ""}"><div class="hd"><span>내 카드 ${V.usable[me].length}장 낼 수 있음</span><span>${hold ? `${J(hold, "un")} 이번 라운드만 쉼` : "쉬는 카드 없음"}</span></div><div class="m1-grid">${grid}</div></div>`;
    }
    // 아래 칸
    let acts = "";
    if (V.over) acts = `${resHtml(V, ctx)}<div class="note">게임이 끝났어요 · 결과 창을 확인해요</div>`;
    else if (V.phase === "show") acts = resHtml(V, ctx);
    else if (V.phase === "sub") {
      if (myTurn) {
        const ok = S.sel.length === 2;
        acts = `<div class="note">${ok ? `왼쪽 <b>${S.sel[0]}</b> · 오른쪽 <b>${S.sel[1]}</b> — 모두 내면 2장씩 공개돼요` : `카드 <b>2장</b>을 눌러 골라요 (${S.sel.length}/2) · 공개 뒤 둘 중 하나만 써요`}</div>
          <button type="button" class="btn primary" data-a="sub" ${ok ? "" : "disabled"}>${ok ? `${S.sel[0]} · ${S.sel[1]} 내기` : "2장 내기"}</button>`;
      } else acts = `<div class="note">${watch || !V.alive[me] ? "" : "냈어요 · "}다른 사람이 2장을 고르는 중… (${V.subbed.filter((x, s) => x && V.alive[s]).length}/${aliveN(V)})</div>`;
    } else if (V.phase === "pick") {
      if (myTurn) acts = `<div class="note"><b>공개!</b> 내 2장 중 <b>쓸 카드</b>를 눌러요 (몰래) — 겹치면 빠지고 가장 낮은 숫자가 이겨요</div>`;
      else acts = `<div class="note">${!watch && V.alive[me] && V.pick[me] != null ? `${J(V.pick[me], "ul")} 쓰기로 했어요 · ` : ""}쓸 카드를 고르는 중… (${V.picked.filter((x, s) => x && V.alive[s]).length}/${aliveN(V)})</div>`;
    }
    h += `<div class="m1-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const cb = e.target.closest("[data-c]");
      if (cb && !cb.disabled) {
        const c = +cb.dataset.c;
        if (V.phase === "pick") { ctx.sfx("pop"); ctx.act({ t: "pick", c }); return; }
        const k = S.sel.indexOf(c);
        if (k >= 0) S.sel.splice(k, 1); else if (S.sel.length < 2) S.sel.push(c); else { S.sel.shift(); S.sel.push(c); }
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      if (b.dataset.a === "sub" && S.sel.length === 2) { ctx.sfx("pop"); ctx.act({ t: "sub", c: S.sel.slice() }); }
    };
  }

  // ── 결과 창 ──
  function result(V, me) {
    const nm = i => esc(NAMES[i] || `${i + 1}번`);
    let h = `<div class="m1-rs">`;
    for (const X of V.setl || []) {
      const sum = s => { const x = X.rows.find(r => r.s === s); return x ? `승점 ${x.sc} + ★${x.m} = ${x.t}` : ""; };
      if (X.fin) h += `<div class="r"><b>${X.r}R</b><span>✅ ${X.surv.map(s => `${nm(s)} (${sum(s)})`).join(" · ")}<br>❌ ${nm(X.elim)} (${sum(X.elim)})</span></div>`;
      else h += `<div class="r"><b>${X.r}R</b><span>✅ ${nm(X.surv[0])} (${sum(X.surv[0])})</span></div>`;
    }
    if (me >= 0 && V.ranks) h += `<div class="n">${V.elim === me ? "마지막 정산에서 탈락했어요." : `나는 ${V.safe.indexOf(me) + 1}번째로 생존 — ${V.ranks[me] + 1}등 (먼저 생존할수록 위)`} · 내가 이긴 라운드 ${V.wins[me]}번</div>`;
    return h + `</div>`;
  }

  // ── 행동 글 (복기) ──
  function actText(a, V) {
    if (!a) return "—";
    if (a.t === "sub" && a.c) return `${a.c[0]} · ${a.c[1]} 냄`;
    if (a.t === "pick") {
      const s = V && Number.isInteger(V.seat) ? V.seat : -1, p = s >= 0 && V.sub && V.sub[s];
      return p ? `${J(a.c, "ul")} 씀 (${p.find(x => x !== a.c)} 쉼)` : `${J(a.c, "ul")} 씀`;
    }
    return "행동";
  }

  // ── AI 선생님 (보이는 것만) ──
  let CC = { key: "", out: null };
  function coach(V, me, since, names) {
    const rawN = i => (names && names[i]) || `${i + 1}번`, nm = i => esc(rawN(i));
    const wj = (i, k) => (i === me && ME[k] ? ME[k] : J(rawN(i), k));
    if (me == null || me < 0 || !V || !V.alive) return { opp: "구경 중이에요. 자리에 앉으면 라운드마다 알려 드려요.", mine: "승점 · 표식과 남은 카드를 지켜보고 있어요.", rec: "—", why: "" };
    if (V.over) {
      const rk = V.ranks ? V.ranks[me] + 1 : 0;
      return { opp: `정산 순서 — ${V.safe.map(nm).join(" → ")}${V.elim >= 0 ? ` · 탈락 ${nm(V.elim)}` : ""}`, mine: V.elim === me ? "마지막 정산에서 탈락했어요." : `나는 ${V.safe.indexOf(me) + 1}번째로 생존 (${rk}등).`, rec: "다시 한 판 해 볼까요?", why: "겹치기 쉬운 낮은 숫자와 남이 피할 숫자를 같이 내 보세요." };
    }
    if (!V.alive[me]) return { opp: logText(V, { seats: (names || []).map(x => ({ name: x })), me }), mine: `나는 ${V.safe.indexOf(me) + 1}번째로 생존했어요 — 남은 사람들의 싸움을 구경해요.`, rec: "—", why: "" };
    const key = `${V.pub}|${me}`;
    if (CC.key === key && CC.out) return CC.out;
    const al = V.alive.map((a, s) => (a ? s : -1)).filter(s => s >= 0), others = al.filter(s => s !== me);
    // 👀 상대 흐름
    let opp;
    if (V.phase === "pick") {
      const cnt = {}; for (const s of others) for (const c of V.sub[s] || []) cnt[c] = (cnt[c] || 0) + 1;
      const hot = Object.keys(cnt).map(Number).filter(c => cnt[c] >= 2).sort((a, b) => a - b);
      opp = `공개된 2장: ${others.map(s => `${nm(s)} ${(V.sub[s] || []).join("·")}`).join(" · ")}.${hot.length ? ` ${hot.slice(0, 3).map(c => `${c}${ja(c,"은")} ${cnt[c]}명이 들고 있어 겹치기 쉬워요`).join(" · ")}.` : ""}`;
    } else {
      const h = V.hist[V.hist.length - 1];
      if (!h) opp = "첫 라운드예요 — 아직 아무도 낸 적이 없어요.";
      else {
        const used = h.pick.map((c, s) => (c ? `${nm(s)} ${c}` : "")).filter(Boolean).join(" · ");
        opp = `${V.phase === "show" ? "이번" : "지난"} 라운드 쓴 카드: ${used}. ${h.w >= 0 ? `${wj(h.w, "ga")} ${J(h.c, "ro")} 이겼어요` : "하나뿐인 숫자가 없어 승자가 없었어요"}${h.dup.length ? ` (겹쳐서 빠짐 ${h.dup.join(", ")})` : ""}.`;
      }
    }
    // 📊 내 흐름
    const tot = s => V.score[s] + V.marks[s];
    const rank = 1 + others.filter(s => tot(s) > tot(me) || (tot(s) === tot(me) && V.marks[s] > V.marks[me])).length;
    const lead = others.slice().sort((a, b) => tot(b) - tot(a) || V.marks[b] - V.marks[a])[0];
    const gap = lead != null ? tot(lead) - tot(me) : 0;
    const mine = `${setTxt(V)}${left(V) > 0 ? ` (${left(V)}라운드 뒤)` : " (이번 라운드 끝)"} · 나 승점 ${V.score[me]} + ★${V.marks[me]} = ${tot(me)} (${rank}/${al.length}위)${lead != null ? ` · ${gap > 0 ? `1위 ${nm(lead)} ${tot(lead)}점 (나보다 ${gap}점 앞)` : gap === 0 ? (others.every(s => tot(s) === tot(me)) ? "모두 같은 점수" : `${nm(lead)}${josa(rawN(lead), "wa")} 같은 점수`) : `2위 ${nm(lead)}보다 ${-gap}점 앞`}` : ""} · 낼 수 있는 카드 ${V.usable[me].join(" ")}${V.hold[me] ? ` (${V.hold[me]} 쉼)` : ""}.`;
    const out = { opp, mine, rec: "", why: "" };
    if (V.phase === "show") { out.rec = "곧 다음 라운드예요."; out.why = V.res && V.res.w === me ? "이겼어요! 이긴 숫자만큼 승점 + 표식 1개." : ""; }
    else if (!V.needs.includes(me)) { out.rec = V.phase === "sub" ? "2장을 냈어요 — 공개를 기다려요." : `${J(V.pick[me], "ul")} 쓰기로 했어요 — 결과를 기다려요.`; out.why = ""; }
    else {
      let seed = 2166136261; for (const ch of key) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619); }
      let a = seed >>> 0; const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const d = K.decide(V, me, "coach", r), ch = K.chances(V, me);
      if (d) {
        const best = d.list[0], alt = d.list.find(x => x !== best && x.k > 0);
        const sv = x => `${left(V) > 0 ? "이번 정산" : "이번 라운드 끝 정산"} 생존 약 ${pct(x.surv)}`;
        if (d.a.t === "sub") {
          const [x, y] = d.a.c;
          out.rec = `${x} · ${y} 내기`;
          out.why = `굴려 보면 ${sv(best)}${alt ? ` (다음 후보 ${alt.a.c.join("·")} ${pct(alt.surv)})` : ""} · 그 카드로 이길 확률 (지금 짐작): ${x} 약 ${pct(ch[x] || 0)} · ${y} 약 ${pct(ch[y] || 0)}.`;
        } else {
          const c = d.a.c, o = (V.sub[me] || []).find(z => z !== c);
          out.rec = `${J(c, "ul")} 쓰기`;
          out.why = `${c}${ja(c,"이")} 이길 확률 약 ${pct(ch[c] || 0)} (이기면 +${c}점 ★) · ${o}${ja(o,"은")} ${pct(ch[o] || 0)} · 굴려 보면 ${sv(best)}${alt ? ` (${o} 쓰면 ${pct(alt.surv)})` : ""}.`;
        }
        out.why = out.why.replace(/(\d) 이\(가\)/g, (m, dg) => `${dg}${josa(dg, "ga")}`).replace(/(\d) 은\(는\)/g, (m, dg) => `${dg}${josa(dg, "un")}`);
      }
    }
    out.opp = out.opp.replace(/(\d) 은\(는\)/g, (m, dg) => `${dg}${josa(dg, "un")}`);
    CC = { key, out };
    return out;
  }

  // ── 복기 고리: 같은 씨앗으로 두 수를 굴려 '순위 점수'(100 = 맨 먼저 생존 · 0 = 탈락) 차이 ──
  function review(Vb, seat, myA, bestA) {
    if (!Vb || (Vb.phase !== "sub" && Vb.phase !== "pick") || !myA || !bestA) return { sev: 0, why: "" };
    const same = JSON.stringify(myA) === JSON.stringify(bestA) || (myA.t === "sub" && bestA.t === "sub" && myA.c.slice().sort().join() === bestA.c.slice().sort().join());
    if (same) return { sev: 0, why: "고급 AI와 같은 선택이에요.", my: actText(myA, Vb), best: actText(bestA, Vb) };
    const Jd = K.judge(Vb, seat, myA, bestA);
    if (!Jd || !Jd.my || !Jd.best) return { sev: 0, why: "견줄 수 없는 장면이에요." };
    const loss = Math.max(0, (Jd.best.v - Jd.my.v) * 100), dSurv = Math.max(0, (Jd.best.surv - Jd.my.surv) * 100);
    const L = Math.max(loss, dSurv * 0.7);                 // 이번 정산 생존 확률 10%p 차이 ≈ 순위 점수 7점
    const sev = L >= 12 ? 80 : L >= 7 ? 60 : L >= 4 ? 40 : L >= 1.5 ? 20 : 5;
    const ch = K.chances(Vb, seat), when = Vb.next ? `${Vb.next.r}라운드 정산` : "정산";
    let why = `고급 AI: ${actText(bestA, Vb)} — 같은 상황을 여러 번 굴려 보면 ${when} 생존 약 ${pct(Jd.best.surv)}, 내 수는 ${pct(Jd.my.surv)} · 순위 점수 ${loss.toFixed(1)}점 차이 (100점 = 맨 먼저 생존)`;
    if (myA.t === "pick" && bestA.t === "pick") why += ` · ${myA.c}${josa(myA.c, "ga")} 이길 확률 약 ${pct(ch[myA.c] || 0)}, ${bestA.c}${josa(bestA.c, "un")} ${pct(ch[bestA.c] || 0)}`;
    if (L < 1.5) why = `고급 AI: ${actText(bestA, Vb)} — 굴려 보면 내 수와 거의 같은 값이에요 (차이 ${loss.toFixed(1)}점)`;
    return { sev, why, my: actText(myA, Vb), best: actText(bestA, Vb) };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const card = (c, x = "", lab = "") => `<span class="m1-c${x}" style="display:inline-grid;place-items:center;cursor:default">${c}${lab ? `<small>${lab}</small>` : ""}</span>`;
    return [
      { tag: "STEP 1 · 목표", title: "정산 때 점수 1등이면 생존", body: "모두 숫자 카드 <b>1~8</b>을 한 장씩 들고 시작해요. 라운드를 이기면 점수를 얻고, <b>정산</b> 때 점수가 가장 높은 1명이 <b>생존</b>해서 빠져요. 끝까지 남은 마지막 1명은 <b>탈락</b>!",
        boardHtml: `<div class="m1-tut"><div class="row">${[1, 2, 3, 4, 5, 6, 7, 8].map(c => card(c)).join("")}</div><small>7명이면 3 · 6 · 9 · 12라운드에 1명씩, 18라운드에 2명 생존</small></div>`, ms: 6000 },
      { tag: "STEP 2 · 진행", title: "2장 내고 → 공개 → 몰래 1장 쓰기", body: "라운드마다 <b>2장</b>을 왼쪽 · 오른쪽에 내요. 모두 내면 2장씩 <b>공개</b>! 그다음 둘 중 <b>쓸 카드 1장</b>을 몰래 골라요 (하나 빼기).",
        boardHtml: `<div class="m1-tut"><div class="row"><span class="tag">나</span>${card(2, " sel", "왼쪽")}${card(5, " sel", "오른쪽")}</div><div class="row"><span class="tag">AI1</span>${card(1)}${card(4)}<span class="tag">AI2</span>${card(1)}${card(3)}</div><small>남의 2장을 보고 내 쪽을 정해요</small></div>`, ms: 6200 },
      { tag: "STEP 3 · 승리", title: "겹친 숫자는 빼고, 가장 낮은 숫자", body: "쓴 카드 중 <b>같은 숫자끼리는 빠지고</b>, 남은 것 중 <b>가장 낮은 숫자</b>를 쓴 사람이 이겨요. 이기면 그 <b>숫자만큼 승점</b> + <b>승리의 표식 ★</b> 1개.",
        boardHtml: `<div class="m1-tut"><div class="row">${card(1, " x")}${card(1, " x")}${card(3, " used")}${card(6)}</div><small>1 · 1은 겹쳐서 빠지고 → 3이 승리 (+3점 ★)</small></div>`, ms: 6200 },
      { tag: "STEP 4 · 직접", title: "어떤 카드를 쓸까요?", body: "AI들이 쓴 카드는 <b>1 · 1 · 4</b>예요. 내 2장은 <b>2</b>와 <b>6</b>. 이기는 카드를 눌러 보세요!",
        interactive: { hint: "👆 이기는 카드를 눌러요", doneText: "✅ 1 · 1이 겹쳐 빠지니 2가 가장 낮아요!" },
        render(stage, ctrl) {
          let msg = "";
          const draw = () => {
            stage.innerHTML = `<div class="m1-tut"><div class="row"><span class="tag">AI가 쓴 카드</span>${card(1)}${card(1)}${card(4)}</div>
              <div class="row"><button type="button" class="m1-c pk" data-v="2">2</button><button type="button" class="m1-c pk" data-v="6">6</button></div><small>${msg || "겹친 숫자는 빠져요"}</small></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b) return;
            if (+b.dataset.v === 2) { ctrl.sfx("win"); msg = "2로 승리! +2점 ★"; draw(); ctrl.complete(); }
            else { ctrl.sfx("tap"); msg = "6을 쓰면 4가 더 낮아서 AI가 이겨요. 1 · 1은 겹쳐서 빠진다는 걸 기억!"; draw(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 카드", title: "쓴 카드는 사라지고, 안 쓴 카드는 한 번 쉬어요", body: "쓴 카드는 버려요. 내고 안 쓴 카드는 <b>바로 다음 라운드에만</b> 못 내요 (쉼). <b>6 · 12라운드가 끝나면</b> 카드 8장이 다시 돌아와요.",
        boardHtml: `<div class="m1-tut"><div class="row">${card(2, " x", "씀")}${card(5, " h", "쉼")}${card(1)}${card(3)}</div><small>2를 쓰고 5를 남기면 → 다음 라운드엔 1 · 3 · 4 · 6 · 7 · 8 중에서</small></div>`, ms: 6400 },
      { tag: "STEP 6 · 정산", title: "표식 1개 = 1점 더해서 1등이 생존", body: "정산 때 <b>승점 + 표식 수</b>가 가장 높은 1명이 생존해요. 같으면 <b>표식 많은 쪽</b> → 그래도 같으면 <b>더 최근에 이긴 쪽</b>. 남은 사람 승점은 0으로 돌아가고 <b>표식은 남아요</b>. 3명이 남으면 6라운드 뒤 2명 생존! 막히면 <b>🧑‍🏫 AI 선생님</b>이 이길 확률을 알려 줘요.",
        boardHtml: `<div class="m1-tut"><span style="font-size:40px">✅</span><small>낮은 숫자는 잘 이기지만 점수가 작고, 높은 숫자는 드물게 이기지만 점수가 커요</small></div>`, ms: 6800 },
    ];
  }

  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 1일차 감옥 매치";
  const DIFF = "※ 방송과 다른 점: 3~8명 (방송 7명 — 3명보다 많으면 3라운드마다 1명 생존, 3명 남으면 6라운드 뒤 2명 생존이라 7명이면 방송과 같음) · 하나뿐인 숫자가 없으면 그 라운드는 승자 없음 · 점수 · 표식 · 최근 승리까지 같으면 추첨 · 남은 카드는 화면에 보여 줌 · 낼 카드가 딱 2장이면 저절로 냄 · 카드 되돌림은 인원과 상관없이 6라운드마다 · 순위는 먼저 생존한 순서 — 방송 글에 없어서 우리가 정함";
  window.SVUI = window.SVUI || {};
  window.SVUI.minusone = {
    name: "하나 빼기", emoji: "✌️", short: "2장 내고 하나 빼기 — 겹치지 않은 가장 낮은 숫자가 승리", min: 3, max: 8, defN: 7, board: false,
    opts: [],
    src: SRC, diff: DIFF,
    howto: [
      "목표: 정산 때 점수가 가장 높으면 생존해서 빠져요. 마지막까지 남은 1명이 탈락",
      "준비물: 사람마다 숫자 카드 1~8 각 1장 (8장)",
      "진행: 라운드마다 2장을 왼쪽 · 오른쪽 칸에 냄 → 모두 내면 2장씩 공개 → 둘 중 쓸 카드 1장을 몰래 고름 (하나 빼기)",
      "승리: 쓴 카드 중 같은 숫자끼리는 빼고, 가장 낮은 숫자를 쓴 사람이 이 라운드 승리 → 그 숫자만큼 승점 + 승리의 표식 1개",
      "카드: 쓴 카드는 버리고, 안 쓴 카드는 바로 다음 라운드에만 못 냄. <b>6라운드마다</b>(6 · 12 · 18…) 8장이 다시 돌아옴 — 7명이면 방송처럼 6 · 12 (마지막 18은 판이 끝남), 인원이 달라 판이 더 길면 그 뒤에도 6라운드마다",
      "정산: 3 · 6 · 9 · 12 · 18라운드 끝 (7명 기준). 승점 + 표식 수가 가장 높은 1명 생존 → 같으면 표식 많은 쪽 → 그래도 같으면 더 최근에 이긴 쪽. 남은 사람 승점은 0으로, 표식은 그대로",
      "마지막: 3명이 남으면 6라운드를 더 하고 상위 2명 생존, 1명 탈락",
      SRC, DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드${V.next ? ` · 정산 ${V.next.r}R` : ""}`),
    chip: (V, i) => (V.elim === i ? { t: "❌", on: false, out: true } : V.safe.includes(i) ? { t: `✅${V.safe.indexOf(i) + 1}`, on: false, out: true }
      : { t: `⭐${V.score[i]}★${V.marks[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

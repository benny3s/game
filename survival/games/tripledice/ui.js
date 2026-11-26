/* 베니 서바이벌 · 트리플 다이스 — 화면 (주사위 11개 · 예측 카드 · 제출 3번 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.tripledice;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PREDS = K.PREDS, KINDS = K.KINDS;
  const RANGE = ["0점", "0 초과 7 미만", "7 이상 10 이하", "10 초과"];
  const RSHORT = ["0점", "1~6점", "7~10점", "11점~"];
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 4일차 감옥 매치 (4명)";
  const DIFF = "2~4명 (빈 자리는 AI · 3명이면 1위 6 · 2위 3 · 3위 0, 2명이면 6 · 0) · 1라운드 선은 무작위 (방송은 주사위로 정함) · 다음 라운드 선 = 지난 라운드 마지막 제출 1위 (방송 진행 그대로) · 선 동률이 누적 승점까지 같으면 앞 순서 · 예측은 모두 한꺼번에 몰래 (방송은 선부터 차례로, 어차피 비공개) · 지난 라운드에 안 낸 히든 주사위는 게임이 끝날 때까지 가림 · 라운드 수 옵션 2라운드 · 피스 · 탈락은 없음 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const CATC = ["sg", "db", "st", "tr"];
  const fmt = x => (Math.abs(x % 1) > 1e-9 ? x.toFixed(1) : String(Math.round(x)));
  const pct = p => `${Math.round(p * 100)}%`;
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const eun = w => { const j = jong(w); return j < 0 ? "은(는)" : j ? "은" : "는"; };
  const eul = w => { const j = jong(w); return j < 0 ? "을(를)" : j ? "을" : "를"; };

  const CSS = `
.td-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.td-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:4px 10px}
.td-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.td-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.td-pill.sm{font-weight:700;color:var(--soft)}
.td-pill.r{margin-left:auto;flex:none}
.td-tbl{display:grid;gap:4px;flex:none;padding:5px;border-radius:14px;background:radial-gradient(ellipse at 50% 20%,rgba(15,118,110,.45),rgba(4,47,46,.6));border:1px solid rgba(94,234,212,.22)}
.td-row{display:grid;grid-template-columns:20px minmax(0,1fr) auto auto;grid-template-areas:"o n s g" "o l l l";column-gap:6px;row-gap:2px;align-items:center;padding:3px 6px;border-radius:10px;background:rgba(0,0,0,.22);border:1.5px solid transparent}
.td-row.me{background:rgba(34,197,94,.12)}
.td-row.cur{border-color:var(--gold)}
.td-row.top{border-color:#fbbf24;background:rgba(251,191,36,.14)}
.td-ord{grid-area:o;align-self:center;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:900 11px var(--round);color:#0f172a;background:#99f6e4}
.td-ord.f{background:#fbbf24}
.td-nm{grid-area:n;min-width:0;font:800 12.5px/1.2 var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.td-l2{grid-area:l;display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden}
.td-l2>i{flex:none;font:700 10.5px var(--round);font-style:normal;color:var(--soft);white-space:nowrap}
.td-l2 .ok{color:#86efac}.td-l2 .no{color:#fca5a5}.td-l2 .pd{color:#fde68a}
.td-sub{grid-area:s;display:flex;gap:2px;align-items:center}
.td-sub em{font:800 10.5px var(--round);font-style:normal;margin-left:3px;white-space:nowrap}
.td-g{grid-area:g;min-width:34px;text-align:right;font:900 14px/1 var(--round);color:#fde68a;font-variant-numeric:tabular-nums;white-space:nowrap}
.td-g small{font:700 9.5px var(--round);color:var(--soft);margin-right:2px}
.td-left{display:flex;gap:2px;min-width:0}
.td-m{min-width:15px;height:16px;padding:0 2px;border-radius:4px;display:grid;place-items:center;font:900 11px/1 var(--round);background:#f1f5f9;color:#0f172a}
.td-m.r{background:#dc2626;color:#fff}.td-m.b{background:#2563eb;color:#fff}
.td-d{display:block;flex:none}
.td-slot{width:22px;height:22px;border-radius:5px;border:1.5px dashed rgba(255,255,255,.25)}
.sg{color:#cbd5e1}.db{color:#5eead4}.st{color:#c4b5fd}.tr{color:#fcd34d}
.td-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.td-info b{color:#fde68a}
.td-info .g{color:#86efac}.td-info .r{color:#fca5a5}
.td-info.end{font:800 13px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.td-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.td-act{display:grid;gap:5px;flex:none}
.td-lbl{display:flex;justify-content:space-between;gap:6px;font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.td-lbl b{color:#fff;overflow:hidden;text-overflow:ellipsis}
.td-hand{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}
.td-h{position:relative;height:46px;border-radius:10px;border:2px solid transparent;background:rgba(255,255,255,.06);padding:0;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.td-h{cursor:default}
.td-h .td-d{width:38px;height:38px}
.td-h.x{opacity:.2}
.td-h.sel{border-color:#fbbf24;background:rgba(251,191,36,.22);transform:translateY(-2px)}
.td-h small{position:absolute;left:2px;top:1px;font:800 8.5px var(--round);color:#fca5a5}
.td-h.b small{color:#93c5fd}
.td-hand.sm{grid-template-columns:repeat(11,minmax(0,1fr));gap:2px}
.td-hand.sm .td-h{height:32px;border-radius:7px;border-width:1.5px}
.td-hand.sm .td-h .td-d{width:min(26px,100%);height:auto}
.td-hand.sm .td-h small{display:none}
.td-preds{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.td-pc{height:48px;border-radius:10px;border:2px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font:900 14px/1.1 var(--round);display:grid;place-items:center;align-content:center;padding:0;cursor:pointer}
.td-pc small{font:700 9.5px var(--round);color:var(--soft)}
.td-pc.on{background:rgba(251,191,36,.28);border-color:#fbbf24}
.td-go{height:46px;border-radius:12px;border:0;background:linear-gradient(#14b8a6,#0f766e);color:#fff;font:900 15px var(--round);cursor:pointer}
.td-go:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);cursor:default}
.td-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.td-tut .td-tbl,.td-tut .td-hand,.td-tut .td-preds,.td-tut .td-go{width:min(100%,320px)}
.td-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.td-tmsg b{color:#fde68a}
.td-res{display:grid;gap:3px;font-size:12.5px;line-height:1.4}
@media (max-height:700px){.td-row{padding:2px 5px}.td-h{height:44px}.td-h .td-d{width:34px;height:34px}.td-pc{height:44px}.td-go{height:44px}.td-info{min-height:2.4em;font-size:12px}.td-tbl{gap:3px;padding:4px}}
@media (min-height:760px){.td-h{height:52px}.td-h .td-d{width:42px;height:42px}.td-row{padding:5px 7px}.td-hand.sm .td-h{height:38px}.td-hand.sm .td-h .td-d{width:min(30px,100%);height:auto}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  // ── 주사위 그림 ──
  const PIP = { 1: [[15, 15]], 2: [[9, 9], [21, 21]], 3: [[8, 8], [15, 15], [22, 22]], 4: [[9, 9], [21, 9], [9, 21], [21, 21]], 5: [[8, 8], [22, 8], [15, 15], [8, 22], [22, 22]], 6: [[9, 8], [21, 8], [9, 15], [21, 15], [9, 22], [21, 22]] };
  const FACE = { w: ["#f8fafc", "#0f172a", "#94a3b8"], r: ["#dc2626", "#fff", "#fca5a5"], b: ["#2563eb", "#fff", "#93c5fd"] };
  function die(v, k, px) {
    const [bg, pc, bd] = FACE[k] || FACE.w, sz = px ? ` width="${px}" height="${px}"` : "";
    const inner = v == null ? `<text x="15" y="20.5" text-anchor="middle" font-size="15" font-weight="900" fill="${pc}">?</text>` : PIP[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.9" fill="${pc}"/>`).join("");
    return `<svg class="td-d" viewBox="0 0 30 30"${sz} data-v="${v == null ? "" : v}" data-k="${k}"><rect x="1" y="1" width="28" height="28" rx="6" fill="${bg}" stroke="${bd}" stroke-width="1.5"/>${inner}</svg>`;
  }
  const mini = (v, k) => `<span class="td-m ${k === "w" ? "" : k}">${v == null ? "?" : v}</span>`;
  const comboTxt = vs => (vs.some(v => v == null) ? "" : K.nameOf(vs));
  const comboCls = vs => (vs.some(v => v == null) ? "" : CATC[K.catOf(K.keyOf(vs))]);
  const nmOf = (names, s, me) => (s === me ? "나" : (names && names[s]) || `${s + 1}번`);
  const seatNames = ctx => (ctx.seats || []).map((x, i) => (x && x.name) || `${i + 1}번`);
  const kindTxt = k => (k === "r" ? "빨강" : k === "b" ? "파랑" : "흰");

  // 예측 상태 한 줄 — 맞히려면 얼마나 더 (x = 이번 라운드 승점, left = 남은 제출 수, top = 한 번에 얻을 수 있는 최대)
  function needTxt(p, x, left, top) {
    const mx = x + left * top;
    if (p === 0) return x > 0 ? `ZERO는 이미 깨졌어요 (${fmt(x)}점)` : left ? `ZERO — 남은 ${left}번도 단독 꼴찌여야 해요` : "ZERO 성공 (+40)";
    if (p === 1) return x >= 7 ? `MIN은 이미 넘쳤어요 (${fmt(x)}점)` : x > 0 ? `MIN 범위 안 (${fmt(x)}점) — 7점이 되지 않게` : mx > 0 ? "MIN — 한 번은 점수를 얻어야 해요 (7점 미만으로)" : "MIN 실패 (0점)";
    if (p === 2) return x > 10 ? `MORE는 이미 넘쳤어요 (${fmt(x)}점)` : x >= 7 ? `MORE 범위 안 (${fmt(x)}점) — 10점을 넘지 않게 (+${fmt(10 - x)}까지)` : mx >= 7 ? `MORE — ${fmt(7 - x)}~${fmt(10 - x)}점 더` : `MORE는 남은 제출로 7점이 안 돼요`;
    return x > 10 ? `MAX 성공 범위 (${fmt(x)}점) — 더 얻을수록 2배` : mx > 10 ? `MAX — ${fmt(10 - x)}점 넘게 더` : "MAX는 남은 제출로 10점을 넘길 수 없어요";
  }

  // 이 기기에서만: 고른 주사위 · 예측 카드 (장면이 바뀌면 지움)
  let SEL = { key: "" };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.trick}|${V.phase}|${ctx.me}`; if (SEL.key !== key) SEL = { key, sel: [], pred: -1, sent: 0 }; return SEL; };

  // 지금 제출에서 보이는 가장 높은 조합 (앞사람들)
  function shownTop(V) {
    let best = -1, who = -1;
    for (let j = 0; j < V.ti; j++) { const o = V.order[j], d = V.subs[o]; if (!d) continue; const vs = d.map(x => x.v); if (vs.some(v => v == null)) continue; const k = K.keyOf(vs); if (k > best) { best = k; who = o; } }
    return { k: best, who };
  }
  const handOrder = V => (s => { const ds = V.dice[s]; const w = [...Array(9).keys()].sort((a, b) => (ds[a].v ?? 0) - (ds[b].v ?? 0) || a - b); return w.concat([9, 10]); });

  function rowsHtml(V, me, names, opts) {
    const o = opts || {};
    const lastT = V.tricks.length ? V.tricks[V.tricks.length - 1] : null;
    const H = (V.phase === "rend" || V.over) && V.hist.length ? V.hist[V.hist.length - 1] : null;
    let h = `<div class="td-tbl">`;
    V.order.forEach((s, j) => {
      const isMe = s === me, cur = V.phase === "play" && V.cur === s && !V.over;
      const top = V.phase === "trick" && lastT && lastT.top === s;
      const nm = nmOf(names, s, me);
      // 예측 표시
      let pd;
      if (H) { const ok = H.ok[s]; pd = `<span class="${ok ? "ok" : "no"}">${PREDS[H.pred[s]]} ${ok ? "✓" : "✗"}</span> ${fmt(H.rp[s])}점${ok ? (H.pred[s] === 0 ? " +40" : " ×2") : ""}`; }
      else if (V.pred[s] >= 0) pd = `<span class="pd">🔒 ${PREDS[V.pred[s]]}</span>`;
      else pd = V.predDone[s] ? "🔒" : V.phase === "pred" ? "예측 중…" : "🔒";
      // 낸 주사위
      let sub = "", g = "";
      const d = V.phase === "trick" && lastT ? lastT.subs[s].v.map((v, i) => ({ v, k: lastT.subs[s].k[i] })) : V.phase === "play" ? V.subs[s] : null;
      if (d) { const vs = d.map(x => x.v); sub = d.map(x => die(x.v, x.k, 22)).join("") + (comboTxt(vs) ? `<em class="${comboCls(vs)}">${esc(comboTxt(vs))}</em>` : ""); }
      else if (V.phase === "play") sub = `<span class="td-slot"></span><span class="td-slot"></span><span class="td-slot"></span>`;
      if (V.phase === "trick" && lastT) g = `${top ? "👑" : ""}+${fmt(lastT.pts[s])}`;
      else if (V.over) g = `${fmt(V.tot[s])}점`;
      else if (H) g = `+${fmt(H.gain[s])}`;
      else if (V.phase === "play") g = `<small>이번</small>${fmt(V.rp[s])}`;
      else g = `<small>총</small>${fmt(V.tot[s])}`;
      // 남은 주사위 (나는 아래 손에 있으니 생략)
      let left = "";
      if (!isMe && !o.noLeft && !V.over && V.phase !== "rend") {
        const ds = V.dice[s], idx = handOrder(V)(s).filter(i => !ds[i].u);
        left = `<span class="td-left">${idx.map(i => mini(ds[i].v, ds[i].k)).join("")}</span>`;
      }
      h += `<div class="td-row${isMe ? " me" : ""}${cur ? " cur" : ""}${top ? " top" : ""}" data-s="${s}"><span class="td-ord${j === 0 ? " f" : ""}">${j === 0 ? "선" : j + 1}</span><span class="td-nm">${esc(nm)}</span><span class="td-sub">${sub}</span><span class="td-g">${g}</span><span class="td-l2"><i>${pd}</i>${left}</span></div>`;
    });
    return h + `</div>`;
  }

  function endLine(V, me, names) {
    const r = V.res; if (!r) return "";
    const w = r.w.map(s => nmOf(names, s, me));
    const best = fmt(r.tot[r.w[0]]);
    if (me >= 0) return r.w.includes(me) ? (r.w.length > 1 ? `🏆 공동 1위 (${best}점) — ${esc(w.join(" · "))}` : `🏆 1위! ${best}점`) : `${V.ranks[me] + 1}위 (${fmt(r.tot[me])}점) — 1위 ${esc(w.join(" · "))} ${best}점`;
    return `🏆 ${esc(w.join(" · "))} 1위 (${best}점)`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, S = selFor(V, ctx), names = seatNames(ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    const ph = V.phase;
    let h = rowsHtml(V, me, names);
    // 안내
    let info = "", ic = "";
    const lastT = V.tricks.length ? V.tricks[V.tricks.length - 1] : null;
    if (over) { info = endLine(V, me, names); ic = me >= 0 && !V.res.w.includes(me) ? " end bad" : " end"; }
    else if (ph === "pred") info = can ? "🎯 내 차례 — 이번 라운드 승점을 <b>몰래</b> 예측해요 · 맞히면 <b>2배</b> · ZERO <b>+40</b>" : `다른 사람이 예측하는 중… (${V.needs.length}명 남음)`;
    else if (ph === "play") {
      const T = shownTop(V);
      const topTxt = T.who >= 0 ? `지금 보이는 1위: <b>${esc(K.nameOf(V.subs[T.who].map(x => x.v)))}</b> (${esc(nmOf(names, T.who, me))})` : V.ti > 0 ? "앞사람 조합에 히든 주사위가 섞여 있어요" : "내가 처음 — 다음 사람들이 보고 내요";
      if (can) {
        if (S.sel.length === 3) { const vs = S.sel.map(i => V.dice[me][i].v), k = K.keyOf(vs); info = `<b>${esc(K.nameOf(vs))}</b> — ${T.who >= 0 ? (k > T.k ? '<span class="g">보이는 1위를 이겨요</span>' : k === T.k ? "보이는 1위와 같아요 (나눠 가짐)" : '<span class="r">보이는 1위보다 낮아요</span>') : topTxt}`; }
        else info = `🎯 내 차례 — 주사위 <b>3개</b>를 골라요 · ${topTxt}`;
      } else info = `${esc(nmOf(names, V.cur, me))} 차례 — 고르는 중… · ${topTxt}`;
    } else if (ph === "trick" && lastT) {
      const tn = nmOf(names, lastT.top, me), vs = lastT.subs[lastT.top].v;
      info = `👑 ${esc(tn)} 1위 <b>${esc(K.nameOf(vs))}</b> — ${V.trick < 3 ? "다음 제출의 선" : "라운드 정산으로"}`;
    } else if (ph === "rend" && V.hist.length) {
      const Hh = V.hist[V.hist.length - 1], hit = V.order.filter(s => Hh.ok[s]).map(s => nmOf(names, s, me));
      info = `${Hh.r}라운드 끝 — 예측 맞힘: <b>${hit.length ? esc(hit.join(" · ")) : "없음"}</b>${V.round < V.R ? " · 곧 다음 라운드" : ""}`;
    }
    h += `<div class="td-info${ic}"><span>${info}</span></div>`;
    // 아래: 내 주사위 · 할 일
    h += `<div class="td-act">`;
    if (me >= 0 && !over && ph !== "rend") {
      const ds = V.dice[me], left = ds.filter(x => !x.u).length;
      const idxLeft = [...Array(11).keys()].filter(i => !ds[i].u);
      const bs = K.bestSets(ds.map(x => x.v), idxLeft).map(b => K.nameOf(b.d.map(i => ds[i].v)));
      const big = can && ph === "play";
      h += `<div class="td-lbl"><span>내 주사위 ${left}개 · 빨강 · 파랑은 나만</span><b>${esc(bs.join(" · "))}</b></div><div class="td-hand${big ? "" : " sm"}">`;
      for (const i of handOrder(V)(me)) {
        const x = ds[i], pick = can && ph === "play" && !x.u, on = S.sel.includes(i);
        const tag = x.k === "w" ? "" : `<small>${x.k === "r" ? "빨" : "파"}</small>`;
        h += pick ? `<button type="button" class="td-h ${x.k}${on ? " sel" : ""}" data-i="${i}" aria-label="${kindTxt(x.k)} ${x.v}">${die(x.v, x.k)}${tag}</button>`
          : `<span class="td-h ${x.k}${x.u ? " x" : ""}">${die(x.v, x.k)}${tag}</span>`;
      }
      h += `</div>`;
    }
    if (can && ph === "pred") {
      h += `<div class="td-preds">${PREDS.map((p, i) => `<button type="button" class="td-pc${S.pred === i ? " on" : ""}" data-p="${i}">${p}<small>${RSHORT[i]}</small></button>`).join("")}</div>`;
      h += `<button type="button" class="td-go" data-go="pred"${S.pred < 0 ? " disabled" : ""}>${S.pred < 0 ? "예측 카드를 골라요" : `${PREDS[S.pred]} (${RANGE[S.pred]}) 몰래 내기`}</button>`;
    } else if (can && ph === "play") {
      const vs = S.sel.map(i => V.dice[me][i].v);
      h += `<button type="button" class="td-go" data-go="sub"${S.sel.length !== 3 ? " disabled" : ""}>${S.sel.length !== 3 ? `주사위 ${3 - S.sel.length}개 더 골라요` : `${esc(K.nameOf(vs))} 내기${S.sel.some(i => KINDS[i] !== "w") ? " (히든은 뒷면)" : ""}`}</button>`;
    }
    h += `</div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 1200)) return;   // 두 번 탭 막기
      const t = e.target.closest("[data-i],[data-p],[data-go]"); if (!t || t.disabled) return;
      if (t.dataset.i !== undefined) {
        const i = +t.dataset.i, k = S.sel.indexOf(i);
        if (k >= 0) S.sel.splice(k, 1); else { if (S.sel.length >= 3) S.sel.shift(); S.sel.push(i); }
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (t.dataset.p !== undefined) { const p = +t.dataset.p; S.pred = S.pred === p ? -1 : p; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      if (t.dataset.go === "pred" && S.pred >= 0) send({ t: "pred", p: S.pred });
      else if (t.dataset.go === "sub" && S.sel.length === 3) { const d = S.sel.slice().sort((a, b) => a - b); S.sel = []; send({ t: "sub", d }); }
    };
  }

  // ── 행동 글 (V = 그 수 전 그 자리 보기, 없을 수 있음) ──
  function actText(a, V) {
    if (!a) return "";
    if (a.t === "pred") return `예측 ${PREDS[a.p] || "?"} (${RANGE[a.p] || ""})`;
    if (a.t === "sub" && Array.isArray(a.d)) {
      const s = V && typeof V.seat === "number" && V.seat >= 0 ? V.seat : -1, ds = s >= 0 && V.dice ? V.dice[s] : null;
      const hid = a.d.filter(i => KINDS[i] !== "w").map(i => kindTxt(KINDS[i]));
      if (ds && a.d.every(i => ds[i] && ds[i].v != null)) { const vs = a.d.map(i => ds[i].v); return `${vs.slice().sort((x, y) => y - x).join("·")} 내기 (${K.nameOf(vs)}${hid.length ? ` · ${hid.join(" · ")} 포함` : ""})`; }
      return `주사위 3개 내기 (흰 ${a.d.length - hid.length}${hid.length ? ` · ${hid.join(" · ")}` : ""})`;
    }
    return "";
  }

  // ── 선생님 ──
  let CC = { key: "", r: null };
  function recOf(V, me) { const key = `${V.pub}|${me}|${V.pred[me]}|${JSON.stringify(V.dice[me])}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me) }; return CC.r; }
  function coach(V, me, since, names) {
    const n = V.n, watch = !(me >= 0 && me < n);
    if (watch) me = -1;
    const nm = s => esc(nmOf(names, s, me));
    const opps = V.order.filter(s => s !== me);
    // 👀 상대 흐름
    const p = [];
    const lastT = V.tricks.length ? V.tricks[V.tricks.length - 1] : null;
    if (lastT) p.push(`직전 제출: ${lastT.order.map(s => `${nm(s)} ${K.nameOf(lastT.subs[s].v)} +${fmt(lastT.pts[s])}`).join(" · ")}.`);
    else if (V.hist.length) { const H = V.hist[V.hist.length - 1]; p.push(`지난 라운드 예측: ${V.order.map(s => `${nm(s)} ${PREDS[H.pred[s]]}${H.ok[s] ? "✓" : "✗"}`).join(" · ")}.`); }
    if (!V.over && V.trick >= 1 && (V.tricks.length >= 1)) {
      const z = opps.filter(s => V.rp[s] === 0);
      if (z.length) p.push(`${z.map(nm).join(" · ")}: 이번 라운드 아직 0점 — ZERO(+40) 일 수 있어요. 같은 꼴찌가 한 번만 생겨도 ZERO는 깨져요.`);
    }
    if (!V.over) {
      const strong = [];
      for (const s of opps) {
        const ds = V.dice[s], idx = [...Array(9).keys()].filter(i => !ds[i].u);
        const bs = K.bestSets(ds.map(x => x.v), idx).filter(b => K.catOf(b.k) >= 2);
        const hid = [9, 10].filter(i => !ds[i].u).length;
        if (bs.length) strong.push(`${nm(s)} 흰 주사위에 ${bs.map(b => K.nameOf(b.d.map(i => ds[i].v))).join(" · ")}${hid ? ` (+히든 ${hid})` : ""}`);
      }
      if (strong.length) p.push(strong.slice(0, 3).join(" / ") + ".");
    }
    if (!p.length) p.push("아직 지난 제출이 없어요 — 흰 주사위는 모두 보여요.");
    if (watch) return { opp: p.join(" "), mine: `총점 ${V.order.map(s => `${nm(s)} ${fmt(V.tot[s])}`).join(" · ")}.`, rec: "구경 중이에요.", why: "" };
    // 📊 내 흐름
    const rk = V.tot.filter(t => t > V.tot[me] + 1e-9).length + 1;
    let m = `총점 ${fmt(V.tot[me])} (${rk}위)`;
    const others = V.tot.filter((t, s) => s !== me); const lead = Math.max(...others);
    m += V.tot.every(t => t === V.tot[me]) ? " · 모두 같음" : V.tot[me] >= lead ? ` · 2위와 +${fmt(V.tot[me] - lead)}` : ` · 1위와 −${fmt(lead - V.tot[me])}`;
    m += `. 남은 라운드 ${V.R - V.round + (V.phase === "rend" || V.over ? 0 : 1)}.`;
    if (!V.over && V.phase !== "rend") {
      const ds = V.dice[me], idx = [...Array(11).keys()].filter(i => !ds[i].u && ds[i].v != null);
      const bs = K.bestSets(ds.map(x => x.v), idx).map(b => K.nameOf(b.d.map(i => ds[i].v)));
      const P = K.PTS[n] || K.PTS[4], leftT = V.phase === "pred" ? 3 : 3 - V.trick + (V.phase === "play" ? 1 : 0);
      if (V.pred[me] >= 0) m += ` ${needTxt(V.pred[me], V.rp[me], leftT, P[0])} (남은 제출 ${leftT}번).`;
      m += ` 내 센 묶음: ${bs.join(" · ")}. 순위 점수 ${P.join(" · ")}${n === 4 ? "" : ` (${n}명)`}.`;
    }
    // 💡 추천 · 👉 뜻 (고급 AI 의 계산)
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (!V.needs.includes(me)) rec = V.phase === "trick" || V.phase === "rend" ? "결과를 보는 중이에요." : "내 차례가 되면 추천해 드려요.";
    else {
      const R = recOf(V, me);
      if (V.phase === "pred") {
        rec = `예측 ${PREDS[R.a.p]} (${RANGE[R.a.p]}).`;
        why = `라운드를 36번 굴려 본 고급 AI 계산 — ${R.rows.slice().sort((a, b) => a.p - b.p).map(r => `${PREDS[r.p]} 맞을 ${pct(r.ok)} · 기대 ${fmt(Math.round(r.ev * 10) / 10)}점`).join(" / ")}. 기대 승점(2배 · +40 포함)이 가장 큰 쪽이에요.`;
      } else {
        const ds = V.dice[me], vs = R.a.d.map(i => ds[i].v), b = R.rows[0], b2 = R.rows.find(r => r.d.join() !== b.d.join());
        rec = `${vs.slice().sort((x, y) => y - x).join("·")} 내기 (${K.nameOf(vs)}).`;
        const T = shownTop(V), k = K.keyOf(vs);
        const tn = T.who >= 0 ? K.nameOf(V.subs[T.who].map(x => x.v)) : "";
        const tag = T.who >= 0 ? (k > T.k ? `보이는 1위 ${tn}${eul(tn)} 이겨요` : `보이는 1위 ${tn}보다 낮게 — 이번엔 버리고 센 묶음을 아껴요`)
          : k === Math.max(...R.rows.map(r => r.k)) ? "가장 센 묶음으로 1위를 노려요" : k === Math.min(...R.rows.map(r => r.k)) ? "가장 약한 묶음을 버려요" : "센 묶음은 아끼고 중간 묶음으로";
        why = `${tag}. 이 수로 라운드 끝까지 24번 굴려 보면 ${PREDS[V.pred[me]]} 맞을 ${pct(b.ok)} · 기대 ${fmt(Math.round(b.ev * 10) / 10)}점${b2 ? ` (다음 후보 ${K.nameOf(b2.d.map(i => ds[i].v))}: ${pct(b2.ok)} · ${fmt(Math.round(b2.ev * 10) / 10)}점)` : ""}.`;
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J || !J.my || !J.best) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const loss = Math.max(0, J.best.ev - J.my.ev);
    const sev = loss >= 8 ? 90 : loss >= 5 ? 75 : loss >= 3 ? 60 : loss >= 1.5 ? 40 : loss > 0.5 ? 20 : 5;
    const r = [];
    if (myA.t === "pred") {
      if (myA.p === 0) r.push("ZERO는 세 번 모두 단독 꼴찌여야 해요");
      if (myA.p === 3 && bestA.p < 3) r.push("MAX는 세 번 중 두 번은 1위를 해야 해요");
    } else {
      const ds = Vb.dice[seat], mk = K.keyOf(myA.d.map(i => ds[i].v)), bk = K.keyOf(bestA.d.map(i => ds[i].v));
      if (mk > bk) r.push("센 묶음을 지금 쓰면 남은 제출이 약해지거나 예측 범위를 넘어요");
      else if (mk < bk) r.push("여기서는 점수를 챙겨야 예측 범위에 들어가요");
    }
    const f = x => fmt(Math.round(x * 10) / 10);
    const why = loss <= 0.5 ? `고급 AI: ${best} — 굴려 본 기대 승점이 내 수와 거의 같아요 (${f(J.best.ev)} vs ${f(J.my.ev)})`
      : `고급 AI: ${best} — 굴려 본 기대 승점 ${f(J.best.ev)} (맞을 ${pct(J.best.ok)}) vs 내 수 ${f(J.my.ev)} (맞을 ${pct(J.my.ok)})${r.length ? " · " + r.join(" · ") : ""}`;
    return { sev, why, my, best };
  }

  function result(V, me, names) {
    const order = V.tot.map((t, s) => s).sort((a, b) => V.tot[b] - V.tot[a] || a - b);
    const who = s => (s === me ? " 나" : names && names[s] ? ` ${esc(names[s])}` : "");
    const rows = order.map(s => `${V.ranks[s] + 1}위${who(s)} <b>${fmt(V.tot[s])}점</b> — ${V.hist.map(H => `${H.r}R ${PREDS[H.pred[s]]}${H.ok[s] ? "✓" : "✗"} +${fmt(H.gain[s])}`).join(" · ")}`);
    return `<div class="td-res"><div>라운드별 예측 · 얻은 승점 (✓ = 맞힘 · 2배, ZERO는 +40)</div>${rows.map(x => `<div>${x}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const tb = x => `<div class="td-tut">${x}</div>`;
    const handRow = (vals, kinds, sel, hideHidden) => `<div class="td-hand">${vals.map((v, i) => `<span class="td-h ${kinds[i]}${sel && sel.includes(i) ? " sel" : ""}">${die(hideHidden && kinds[i] !== "w" ? null : v, kinds[i])}</span>`).join("")}</div>`;
    const K11 = KINDS;
    const sample = [1, 2, 3, 3, 4, 5, 5, 5, 6, 6, 2];
    const fakeRow = (ord, nm, pd, ds, g, top) => `<div class="td-row${top ? " top" : ""}"><span class="td-ord${ord === "선" ? " f" : ""}">${ord}</span><span class="td-nm">${nm}</span><span class="td-sub">${ds.map(([v, k]) => die(v, k, 22)).join("")}<em class="${CATC[K.catOf(K.keyOf(ds.map(x => x[0])))]}">${K.nameOf(ds.map(x => x[0]))}</em></span><span class="td-g">${g}</span><span class="td-l2"><i>${pd}</i></span></div>`;
    const predRow = on => `<div class="td-preds">${PREDS.map((p, i) => `<span class="td-pc${on === i ? " on" : ""}">${p}<small>${RSHORT[i]}</small></span>`).join("")}</div>`;
    // 직접 해 보기: 지금 1위 4 트리플 — 이길 수 있는 건 5 트리플 하나
    const TV = [5, 2, 6, 5, 1, 3, 6, 5, 4, 2, 1], TK = KINDS, GOAL = [0, 3, 7];
    return [
      { tag: "STEP 1 · 목표", title: "4라운드 · 승점 1위", body: "라운드마다 주사위 조합으로 <b>승점</b>을 따요. 라운드 시작에 이번 라운드 승점을 <b>예측</b>해서 맞히면 <b>2배</b>. 4라운드 뒤 승점이 가장 많은 사람이 1위예요 (방송: 단독 1위 피스 · 꼴찌 탈락).",
        boardHtml: tb(predRow(2)), ms: 6000 },
      { tag: "STEP 2 · 준비물", title: "흰 주사위 9 + 빨강 · 파랑", body: "라운드마다 각자 주사위 <b>11개</b>를 굴려요. <b>흰 주사위 9개</b>는 모두에게 보이고, <b>빨강 · 파랑</b> 히든 주사위는 <b>나만</b> 봐요 (남에게는 ?).",
        boardHtml: tb(handRow(sample, K11) + handRow(sample, K11, null, true)), ms: 6000 },
      { tag: "STEP 3 · 진행 ① 예측", title: "ZERO · MIN · MORE · MAX", body: "주사위를 보고 이번 라운드 승점을 <b>몰래</b> 예측해요. <b>ZERO</b> 0점 · <b>MIN</b> 0 초과 7 미만 · <b>MORE</b> 7 이상 10 이하 · <b>MAX</b> 10 초과. 라운드가 끝나면 공개돼요.",
        boardHtml: tb(predRow(-1)), ms: 6400 },
      { tag: "STEP 4 · 진행 ② 제출", title: "3개씩 세 번 · 조합 순위", body: "<b>선</b>부터 차례로 주사위 3개를 내요 (히든은 뒷면 → 모두 낸 뒤 공개). <b>트리플 &gt; 스트레이트 &gt; 더블 &gt; 싱글</b>, 같으면 높은 숫자. 1위 <b>6</b> · 2위 <b>3</b> · 3위 <b>1</b> · 4위 <b>0</b>점 (동률은 평균), <b>1위가 다음 선</b>. 세 번 내면 남은 2개는 버려요.",
        boardHtml: tb(`<div class="td-tbl">${fakeRow("선", "가", "🔒", [[6, "w"], [6, "w"], [6, "r"]], "👑+6", true)}${fakeRow(2, "나", "🔒", [[3, "w"], [4, "w"], [5, "w"]], "+3")}${fakeRow(3, "다", "🔒", [[5, "w"], [5, "w"], [1, "w"]], "+1")}${fakeRow(4, "라", "🔒", [[1, "w"], [2, "w"], [4, "b"]], "+0")}</div>`), ms: 7600 },
      { tag: "STEP 5 · 직접", title: "4 트리플을 이겨 봐요", body: "앞사람이 <b>4 트리플</b>을 냈어요. 내 주사위로 이길 수 있는 조합 3개를 골라 <b>내기</b>!",
        interactive: { hint: "👆 주사위 3개 → 내기", doneText: "✅ 5 트리플로 1위! 다음 제출의 선이 돼요" },
        render(stage, ctrl) {
          let sel = [], done = false, msg = "스트레이트 · 더블은 트리플을 못 이겨요";
          const draw = () => {
            const wrong = sel.find(i => !GOAL.includes(i)), nextI = GOAL.find(i => !sel.includes(i));
            const tp = wrong !== undefined ? wrong : sel.length < 3 ? nextI : -1;
            const vs = sel.map(i => TV[i]);
            stage.innerHTML = `<div class="td-tut"><div class="td-tbl">${fakeRow("선", "가", "🔒", [[4, "w"], [4, "w"], [4, "w"]], done ? "+3" : "")}${done ? fakeRow(2, "나", "🔒", GOAL.map(i => [TV[i], "w"]), "👑+6", true) : ""}</div>`
              + `<div class="td-hand">${TV.map((v, i) => `<button type="button" class="td-h ${TK[i]}${sel.includes(i) ? " sel" : ""}" data-i="${i}"${tp === i && !done ? ' data-tp="1"' : ""}>${die(v, TK[i])}</button>`).join("")}</div>`
              + `<button type="button" class="td-go" data-go="1"${sel.length === 3 && !done ? ' data-tp="1"' : ""}${sel.length === 3 && !done ? "" : " disabled"}>${sel.length === 3 ? `${K.nameOf(vs)} 내기` : `주사위 ${3 - sel.length}개 더 골라요`}</button><div class="td-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-i],[data-go]"); if (!t || t.disabled) return;
            if (t.dataset.i !== undefined) { const i = +t.dataset.i, k = sel.indexOf(i); if (k >= 0) sel.splice(k, 1); else { if (sel.length >= 3) sel.shift(); sel.push(i); } ctrl.sfx("tap"); msg = sel.length === 3 ? `<b>${K.nameOf(sel.map(j => TV[j]))}</b> — 내기를 눌러요` : "트리플을 이기려면 더 높은 트리플!"; draw(); return; }
            const vs = sel.map(i => TV[i]);
            if (K.keyOf(vs) <= K.keyOf([4, 4, 4])) { ctrl.sfx("tap"); msg = `<b>${K.nameOf(vs)}</b>${eun(K.nameOf(vs))} 4 트리플보다 낮아요 — <b>5</b> 세 개를 찾아봐요`; sel = []; draw(); return; }
            done = true; ctrl.sfx("win"); msg = "🏆 <b>5 트리플 1위 +6!</b>"; draw(); ctrl.complete();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패 · 특수", title: "예측 2배 · ZERO +40", body: "라운드 끝에 예측이 맞으면 그 라운드 승점 <b>2배</b> (MORE 9점 → 18점). <b>ZERO</b>를 맞히면 <b>+40</b> — 세 번 모두 <b>단독 꼴찌</b>여야 해서 다른 사람이 같은 꼴찌를 만들면 깨져요. 🧑‍🏫 선생님은 라운드를 굴려 보고 예측 · 낼 주사위를 숫자로 추천해요.",
        boardHtml: tb(`<div class="td-tbl">${fakeRow("선", "가", '<span class="ok">MORE ✓</span> · 9점 ×2', [[5, "w"], [5, "w"], [5, "w"]], "+18")}${fakeRow(2, "나", '<span class="ok">ZERO ✓</span> · 0점 +40', [[1, "w"], [2, "w"], [4, "w"]], "+40")}</div>`), ms: 7200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.tripledice = {
    name: "트리플 다이스", emoji: "🎲", short: "흰 주사위 9 · 히든 2 — 승점을 예측하고 3개씩 세 번 조합 대결, 4라운드", min: 2, max: 4, defN: 4, board: false,
    opts: [{ k: "rounds", label: "라운드", items: [[4, "4라운드 (방송)"], [2, "2라운드 (짧게)"]], def: 4 }],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: <b>4라운드</b> 뒤 승점 1위 — 라운드마다 예측을 맞히면 승점 2배",
      "준비물: 각자 <b>흰 주사위 9개</b>(모두에게 공개) + <b>빨강 · 파랑</b> 히든 주사위(나만 봄)를 라운드마다 굴림",
      "진행 ① 예측: 이번 라운드 승점을 몰래 냄 — <b>ZERO</b> 0점 · <b>MIN</b> 0 초과 7 미만 · <b>MORE</b> 7 이상 10 이하 · <b>MAX</b> 10 초과",
      "진행 ② 제출: 선부터 주사위 <b>3개</b>씩 (히든은 뒷면 → 모두 낸 뒤 공개), 한 라운드에 <b>세 번</b> · 남은 2개는 버림",
      "조합: <b>트리플</b>(같은 수 3) &gt; <b>스트레이트</b>(이어진 3, 6-1은 안 이어짐) &gt; <b>더블</b> &gt; <b>싱글</b> · 같으면 조합 숫자 → 남은 숫자가 높은 쪽 · 완전히 같으면 동률",
      "승점: 1위 <b>6</b> · 2위 <b>3</b> · 3위 <b>1</b> · 4위 <b>0</b> (동률은 평균) · 1위가 다음 제출의 선 (동률이면 누적 승점이 높은 사람)",
      "라운드 끝: 예측이 맞으면 그 라운드 승점 <b>2배</b> · <b>ZERO</b>를 맞히면 <b>+40</b> (세 번 모두 단독 꼴찌여야 함)",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드 · ${V.phase === "pred" ? "예측" : V.phase === "rend" ? "정산" : `제출 ${V.trick}/3`}`),
    chip: (V, i) => ({ t: `${fmt(V.tot[i])}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

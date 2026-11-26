/* 베니 서바이벌 · 하우머치 — 화면 (상품 · 손님 5명 합계 · 정보 질문 · 가격 제시 · 결과 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-howmuch"];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = x => Math.round(x).toLocaleString("ko-KR");
  // 1억 2,345만 6,789원 식으로 읽기 쉽게
  function ko(x) {
    x = Math.round(x); if (x <= 0) return "0원";
    const eok = Math.floor(x / 100000000), man = Math.floor((x % 100000000) / 10000), rest = x % 10000;
    return [eok ? `${eok}억` : "", man ? `${num(man)}만` : "", rest ? `${num(rest)}` : ""].filter(Boolean).join(" ") + "원";
  }
  const short = x => (x >= 100000000 ? `${+(x / 100000000).toFixed(2)}억` : x >= 10000 ? `${+(x / 10000).toFixed(x >= 1000000 ? 0 : 1)}만` : `${x}`);
  const CSS = `
.hm-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.hm-rd{font:900 14px var(--round);color:#fff;background:rgba(16,185,129,.25);border:1px solid rgba(52,211,153,.5);border-radius:99px;padding:4px 11px;white-space:nowrap}
.hm-pt{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);border-radius:99px;padding:3px 11px;white-space:nowrap}
.hm-item{flex:none;text-align:center;font:900 19px var(--round);color:#fff;padding:9px 10px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,.25),rgba(0,0,0,.3));border:1px solid rgba(52,211,153,.5)}
.hm-item small{display:block;font:700 11.5px var(--round);color:var(--soft);margin-top:2px}
.hm-guests{flex:none;display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.hm-g{display:grid;justify-items:center;gap:1px;padding:5px 2px;border-radius:11px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0;cursor:default}
.hm-g.pick{cursor:pointer}
.hm-g.sel{border-color:#fde68a;background:rgba(253,230,138,.14)}
.hm-g.selp{border-color:#38bdf8;background:rgba(56,189,248,.14)}
.hm-g.sel.selp{border-color:#fde68a;box-shadow:0 0 0 2px rgba(56,189,248,.7)}
.hm-g b{font-size:19px;line-height:1}
.hm-g span{font:700 10px var(--round);color:var(--soft);white-space:nowrap}
.hm-g i{font-style:normal;font:900 11.5px var(--round);color:#fde68a}
.hm-g em{font-style:normal;font:800 10.5px var(--round);color:#7dd3fc;line-height:1.15;text-align:center}
.hm-bud{flex:none;display:grid;gap:3px}
.hm-b{display:grid;grid-template-columns:62px 1fr auto;gap:6px;align-items:center;font:700 11.5px var(--round);color:var(--soft)}
.hm-b b{color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-b .bar{height:7px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}
.hm-b .bar i{display:block;height:100%;background:linear-gradient(90deg,#10b981,#fde68a)}
.hm-b.me b{color:#fde68a}
.hm-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.hm-info b{color:#fde68a}
.hm-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.hm-q{display:grid;gap:5px;padding:7px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14)}
.hm-q .t{font:800 12.5px var(--round);color:#e2e8f0}
.hm-kinds{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.hm-kinds button{padding:7px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font:800 13px var(--round);cursor:pointer}
.hm-kinds button.sel{border-color:#fde68a;background:rgba(253,230,138,.18)}
.hm-inp{display:grid;gap:5px}
.hm-inp input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff;font:900 20px var(--round);text-align:right}
.hm-inp input:focus{outline:none;border-color:#fde68a}
.hm-ko{text-align:right;font:800 12.5px var(--round);color:#fde68a;min-height:16px}
.hm-pre{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.hm-pre button{padding:5px 9px;border-radius:99px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 12.5px var(--round);cursor:pointer}
.hm-res{flex:none;display:grid;gap:4px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);font:700 13px var(--round);color:#e2e8f0}
.hm-res .big{font:900 15px var(--round);color:#bbf7d0}
.hm-res .big.bad{color:#fecaca}.hm-res .big.mid{color:#fde68a}
.hm-res .row{display:grid;grid-template-columns:62px 1fr auto;gap:6px;align-items:center}
.hm-res .row.w{color:#bbf7d0}.hm-res .row.x{color:#fca5a5;text-decoration:line-through}.hm-res .row.d{color:#fde68a}
.hm-res .row span:last-child{font-size:11.5px;color:var(--soft);text-align:right}
.hm-hist{flex:none;display:flex;gap:4px;overflow-x:auto;padding-bottom:2px}
.hm-h{flex:none;display:grid;justify-items:center;padding:3px 7px;border-radius:9px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12);font:700 10.5px var(--round);color:var(--soft);white-space:nowrap}
.hm-h b{color:#fde68a;font-size:11.5px}
.hm-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.hm-tut .hm-res{width:100%;box-sizing:border-box}
@media (max-height:780px){.hm-item{font-size:17px;padding:7px}.hm-g b{font-size:17px}.hm-acts{gap:5px}.hm-inp input{padding:7px 10px;font-size:18px}.hm-b{font-size:11px}}
@media (max-height:690px){.hm-item small{display:none}.hm-hist{display:none}.hm-info{font-size:11.5px}.hm-pre button{padding:4px 8px;font-size:12px}.hm-res{font-size:12px;padding:6px 8px}.hm-bud .hm-b:not(.me){display:none}.hm-q{padding:5px}.hm-g{padding:3px 1px}.hm-top{gap:4px}.hm-top>span{padding:3px 8px;font-size:12px}.hm-bud{display:none}.hm-info{line-height:1.25}.hm-ko{min-height:0;font-size:11.5px}.hm-inp{gap:3px}.hm-inp input{padding:5px 10px;font-size:16px}.hm-pre{gap:3px}.hm-pre button{padding:3px 7px;font-size:11.5px}.hm-kinds button{padding:4px 3px;font-size:12px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.phase}`;
    if (!RS || RS.key !== key) {
      const top = V.guests.map((g, i) => i).sort((a, b) => V.guests[b].total - V.guests[a].total);
      RS = { key, kind: "price", guest: top[V.pubSeat === ctx.me ? 1 : 0], pubKind: "price", pubGuest: top[0], p: "" };
    }
    return RS;
  };
  const ansTxt = a => (a.kind === "price" ? `가격 ${short(a.ans)}원` : `${a.ans}등`);

  function guestsHtml(V, S, pickMode) {
    return `<div class="hm-guests">${V.guests.map((g, i) => {
      const pa = V.pubAns && V.pubAns.guest === i ? V.pubAns : null, pr = V.priv && !Array.isArray(V.priv) && V.priv.guest === i ? V.priv : null;
      const cls = `${pickMode ? "pick" : ""}${S && pickMode === "priv" && S.guest === i ? " sel" : ""}${S && pickMode === "pub" && S.pubGuest === i ? " selp" : ""}`;
      return `<div class="hm-g ${cls}" data-g="${i}" title="${g.name} · 10개 합계 ${num(g.total)}원"><b>${g.em}</b><span>${g.name}</span><i>${short(g.total)}</i>${pa ? `<em>📢 ${ansTxt(pa)}</em>` : ""}${pr ? `<em>🔒 ${ansTxt(pr)}</em>` : ""}</div>`;
    }).join("")}</div>`;
  }
  function budHtml(V, ctx, me) {
    return `<div class="hm-bud">${V.left.map((l, i) => `<div class="hm-b ${i === me ? "me" : ""}"><b>${i === me ? "나" : esc(nameOf(ctx, i))}</b><span class="bar"><i style="width:${Math.max(0, l / V.budget * 100)}%"></i></span><span>${short(l)}원 · ${V.points[i]}점</span></div>`).join("")}</div>`;
  }
  function histHtml(V) {
    if (!V.hist.length) return "";
    return `<div class="hm-hist">${V.hist.map(h => `<span class="hm-h" title="${esc(h.item)}">R${h.r}<b>M ${short(h.M)}</b>${h.winner < 0 ? "무득점" : `${h.winner + 1}번 +${h.pts}`}</span>`).join("")}</div>`;
  }
  function resHtml(V, ctx, me) {
    const R = V.res; if (!R) return "";
    const nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    let big = "", cls = "mid";
    if (R.winner < 0) big = "이번 판은 아무도 득점하지 못했어요";
    else if (me >= 0) { big = R.winner === me ? `🎉 내가 이겼어요! +${R.pts}점` : `${nm(R.winner)}가 +${R.pts}점`; cls = R.winner === me ? "" : "bad"; }
    else big = `${nm(R.winner)} +${R.pts}점`;
    return `<div class="hm-res"><div class="big ${cls}">${big}</div><div>🎯 손님 최고가 <b>M = ${ko(R.M)}</b></div>${R.bids.map((b, i) => `<div class="row ${R.winner === i ? "w" : R.over[i] ? "x" : R.dup[i] ? "d" : ""}"><b>${nm(i)}</b><span>${num(b)}원</span><span>${R.winner === i ? "🏆 승" : R.over[i] ? "🚫 M 초과" : R.dup[i] ? "⚠️ 같은 값 무효" : "유효 (더 높은 값이 있음)"}</span></div>`).join("")}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0;
    const reveal = V.phase === "reveal" || V.phase === "end";
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const S = mine || V.phase === "info" ? rs(V, ctx) : null;
    let h = `<div class="hm-top"><span class="hm-rd">${V.round} / ${V.rounds} 판</span><span class="hm-pt">🏅 이번 판 ${V.pts}점</span>${watch ? "" : `<span class="hm-pt">💰 남은 예산 ${short(V.left[me])}원</span>`}</div>`;
    h += `<div class="hm-item">🛒 ${esc(V.item)}<small>손님 5명이 몰래 정한 가격 중 가장 높은 값(M)을 넘지 않게!</small></div>`;
    const infoPick = mine && V.phase === "info";
    h += guestsHtml(V, S, infoPick ? "priv" : "");
    h += budHtml(V, ctx, watch ? -1 : me);
    if (V.phase !== "info" && !reveal) h += histHtml(V);
    let acts = "";
    if (reveal) {
      h += resHtml(V, ctx, watch ? -1 : me);
    } else if (V.phase === "info") {
      if (infoPick && !V.done[me]) {
        const isPub = V.pubSeat === me;
        acts = `<div class="hm-acts">
          <div class="hm-q"><div class="t">🔒 내 비공개 질문 — 나만 알아요 <small>(위 손님을 눌러 고르기)</small></div><div class="hm-kinds"><button data-k="price" class="${S.kind === "price" ? "sel" : ""}">💰 낸 가격</button><button data-k="rank" class="${S.kind === "rank" ? "sel" : ""}">🥇 몇 번째로 높은지</button></div></div>
          ${isPub ? `<div class="hm-q"><div class="t">📢 이번 판 공개 질문 — 모두 같은 답을 봐요</div><div class="hm-kinds"><button data-pk="price" class="${S.pubKind === "price" ? "sel" : ""}">💰 낸 가격</button><button data-pk="rank" class="${S.pubKind === "rank" ? "sel" : ""}">🥇 몇 번째로 높은지</button></div><div class="hm-info">공개 질문을 던질 손님을 아래에서 골라요</div><div class="hm-kinds" style="grid-template-columns:repeat(5,1fr)">${V.guests.map((g, i) => `<button data-pg="${i}" class="${S.pubGuest === i ? "sel" : ""}">${g.em}</button>`).join("")}</div></div>` : `<div class="hm-info">📢 공개 질문은 <b>${esc(nameOf(ctx, V.pubSeat))}</b>가 골라요</div>`}
          <button class="btn big primary" data-a="info">질문 확정 (${V.guests[S.guest].name} ${S.kind === "price" ? "가격" : "순위"}${isPub ? ` · 공개 ${V.guests[S.pubGuest].name} ${S.pubKind === "price" ? "가격" : "순위"}` : ""})</button></div>`;
      } else h += `<div class="hm-info">${V.done.map((d, i) => `${i === me ? "나" : esc(nameOf(ctx, i))} ${d ? "✅" : "⏳"}`).join(" · ")} <br>정보 질문을 고르는 중이에요…</div>`;
    } else if (V.phase === "bid") {
      if (watch) h += `<div class="hm-info">구경 중 — 손님 가격: ${V.prices.map((p, i) => `${V.guests[i].em}${short(p)}`).join(" ")} · 제시 ${V.done.map((d, i) => (d ? "✅" : "⏳")).join("")}</div>`;
      else if (V.mine !== null && V.mine !== undefined) h += `<div class="hm-info">✅ <b>${num(V.mine)}원</b>을 냈어요 — 다른 사람을 기다려요…</div>`;
      else if (mine) {
        const mx = V.bidMax, p = parseInt(S.p.replace(/[^0-9]/g, ""), 10) || 0;
        h += `<div class="hm-info">${V.noInfo ? "10라운드는 정보 확인 없이 바로 제시! 이기면 <b>4점</b>" : "정보를 참고해 이번 상품 가격을 비밀로 제시해요"} · 최대 <b>${num(mx)}원</b> (남은 라운드 몫 1원씩 제외)</div>`;
        acts = `<div class="hm-acts"><div class="hm-inp"><input id="hm-in" type="text" inputmode="numeric" autocomplete="off" placeholder="가격(원)" value="${S.p ? num(p) : ""}"><div class="hm-ko" id="hm-ko">${p ? ko(p) + (p > mx ? " — 너무 커요" : "") : "&nbsp;"}</div></div>
          <div class="hm-pre">${[["10만", 100000], ["100만", 1000000], ["1천만", 10000000], ["5천만", 50000000], ["1억", 100000000]].map(([l, v]) => `<button data-set="${v}">${l}</button>`).join("")}<button data-add="-1">−1</button><button data-add="1">+1</button><button data-add="-10000">−1만</button><button data-add="10000">+1만</button></div>
          <button class="btn big primary" id="hm-ok" data-a="bid" ${p >= 1 && p <= mx ? "" : "disabled"}>${p ? `${num(p)}원 제시하기` : "가격을 적어요"}</button></div>`;
      } else h += `<div class="hm-info">다른 사람이 정하는 중이에요…</div>`;
    }
    h += acts;
    stage.innerHTML = h;
    const apply = () => {
      if (!S) return;
      const p = parseInt(S.p.replace(/[^0-9]/g, ""), 10) || 0, mx = V.bidMax, ko_ = stage.querySelector("#hm-ko"), ok = stage.querySelector("#hm-ok");
      if (ko_) ko_.textContent = p ? ko(p) + (p > mx ? " — 너무 커요" : "") : "";
      if (ok) { ok.disabled = !(p >= 1 && p <= mx); ok.textContent = p ? `${num(p)}원 제시하기` : "가격을 적어요"; }
    };
    const inp = stage.querySelector("#hm-in");
    if (inp) inp.oninput = () => { S.p = inp.value; apply(); };
    stage.onclick = e => {
      if (!S) return;
      const g = e.target.closest("[data-g]");
      if (g && infoPick && V.phase === "info") { S.guest = +g.dataset.g; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.k) { S.kind = t.dataset.k; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.pk) { S.pubKind = t.dataset.pk; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.pg) { S.pubGuest = +t.dataset.pg; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.set) { S.p = String(t.dataset.set); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.add) { const p = parseInt(S.p.replace(/[^0-9]/g, ""), 10) || 0; S.p = String(Math.max(1, p + +t.dataset.add)); ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "info") { const a = { t: "info", kind: S.kind, guest: S.guest }; if (V.pubSeat === me) a.pub = { kind: S.pubKind, guest: S.pubGuest }; ctx.sfx("pop"); ctx.act(a); }
      else if (t.dataset.a === "bid") { const p = parseInt(S.p.replace(/[^0-9]/g, ""), 10) || 0; if (p >= 1 && p <= V.bidMax) { ctx.sfx("pop"); ctx.act({ t: "bid", p }); } }
    };
  }
  // ── 🎞️ 복기 고리 ──────────────────────────────────────────────
  const okG = g => Number.isInteger(g) && g >= 0 && g < 5;
  const okQ = q => !!q && (q.kind === "price" || q.kind === "rank") && okG(q.guest);
  const gn = g => `${G.GEM[g]}${G.GUESTS[g]}`, kn = k => (k === "price" ? "가격" : "순위"), kt = k => (k === "price" ? "가격은" : "순위는");
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "info") {
      if (!okQ(a)) return "—";
      return `🔒 ${gn(a.guest)} ${kn(a.kind)} 묻기${okQ(a.pub) ? ` · 📢 공개 ${gn(a.pub.guest)} ${kn(a.pub.kind)} 묻기` : ""}`;
    }
    if (a.t === "bid" && Number.isFinite(a.p) && a.p >= 1) return `${ko(a.p)} 제시`;
    return "—";
  }
  const pc = x => Math.round(x * 100) + "%", pc1 = x => (x < 0.01 ? "1% 미만" : pc(x)), f2 = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || (info && info.same) || JSON.stringify(myA) === JSON.stringify(bestA)) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0;
    if (V.phase === "bid" && myA.t === "bid" && bestA.t === "bid" && Number.isFinite(myA.p) && Number.isFinite(bestA.p) && V.left && V.left[seat] != null) {
      const ev = G.evalBids(V, seat, [myA.p, bestA.p], seed), [m, b] = ev.bids, med = Math.max(1, ev.med);
      const gap = b.util - m.util, scale = 0.3 * V.pts + 0.4;
      const round10k = x => x >= 10000 && x % 10000 === 0;
      const same0 = round10k(myA.p) && !round10k(bestA.p);
      const sev = Math.max(0, Math.min(100, Math.round(100 * gap / scale + (same0 && gap > 0.05 ? 5 : 0))));
      const head = gap < -0.05 ? "내 수의 기대 점수가 더 높게 나와요 — " : gap < 0.05 ? "두 수의 기대 점수가 비슷해요 — " : "";
      return { sev, why: `${head}이길 확률 내 ${ko(myA.p)}(추정 M 중앙의 ${pc1(myA.p / med)}) ${pc(m.pw)} / 고급 AI ${ko(bestA.p)}(${pc1(bestA.p / med)}) ${pc(b.pw)} · 추정 M 중앙 ${ko(ev.med)} (80% 범위 ${ko(ev.q10)} ~ ${ko(ev.q90)}) · 이번 판 ${V.pts}점, 예산 값을 빼면 기대 점수 ${f2(m.util)} vs ${f2(b.util)}${same0 ? " · 딱 떨어지는 값은 남과 겹쳐 무효가 되기 쉬워요" : ""}` };
    }
    if (V.phase === "info" && myA.t === "info" && bestA.t === "info" && okQ(myA) && okQ(bestA)) {
      const iv = G.infoValue(V, seed), val = q => iv[q.kind][q.guest];
      const vm = val(myA), vb = val(bestA), pubOn = V.pubSeat === seat && okQ(myA.pub) && okQ(bestA.pub);
      const pm = pubOn ? val(myA.pub) : 0, pb = pubOn ? val(bestA.pub) : 0;
      const d = Math.max(0, vb - vm) + 0.5 * Math.max(0, pb - pm);
      const sev = Math.max(0, Math.min(100, Math.round(90 * d * (0.5 + 0.25 * V.pts))));
      const priv = `내 질문 ${gn(myA.guest)} ${kt(myA.kind)} 최고가(M)의 불확실성을 약 ${pc(vm)} 줄이고, 고급 AI의 ${gn(bestA.guest)} ${kt(bestA.kind)} 약 ${pc(vb)} 줄여요 (그 손님이 최고가를 냈을 확률 약 ${pc(iv.pMax[bestA.guest])})`;
      const pubT = pubOn && (myA.pub.guest !== bestA.pub.guest || myA.pub.kind !== bestA.pub.kind) ? ` · 공개 질문은 내 ${gn(myA.pub.guest)} ${kn(myA.pub.kind)} 약 ${pc(pm)} vs 고급 AI ${gn(bestA.pub.guest)} ${kn(bestA.pub.kind)} 약 ${pc(pb)}` : "";
      return { sev, why: `${vm >= vb && pm >= pb ? "내 질문도 비슷하게 좋아요 — " : ""}${priv}${pubT}` };
    }
    return null;
  }
  function result(V) {
    const H = V.hist || [];
    return `<b>${V.round}라운드</b> · 득점 없는 판 ${H.filter(x => x.winner < 0).length}번 · 같은 값 무효 ${H.filter(x => x.dup.some(Boolean)).length}번 · 쓴 예산 ${short(V.spent.reduce((a, b) => Math.max(a, b), 0))}원(최대)`;
  }
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 게임", title: "게스트들이 미리 정한 가격 중 최고가를 맞혀요", body: "상품이 <b>10개</b> 나오고, 라운드마다 한 개씩 열려요 (게스트들이 낸 가격이 낮은 상품부터). <b>게스트</b> 5명(AI, 화면의 손님)이 게임 전에 상품마다 가격을 미리 정해 두었고 공개되지 않아요. 그중 <b>가장 높은 값 = M</b>이에요. M을 넘지 않으면서 <b>가장 높은 가격</b>을 낸 사람이 <b>승점</b>을 얻어요! 처음부터 보이는 것은 손님 아래 숫자, <b>10개 상품에 낸 가격 총합</b>뿐이에요.",
        boardHtml: `<div class="hm-tut"><div class="hm-item">🛒 아이스 아메리카노 한 잔<small>손님 5명 가격 중 최고가가 M</small></div></div>`, ms: 8600 },
      { tag: "STEP 2 · 정보", title: "게스트에게 물어봐요 (1 ~ 9라운드)", body: "제시 전에 질문으로 <b>공개 정보 1개</b>(모두가 같은 답을 봐요)와 <b>비공개 정보 1개</b>(나만 확인)를 알아내요. 질문은 둘: <b>🥇 게스트 순위 확인</b>(그 게스트가 5명 중 몇 번째로 높은 가격을 냈는지) / <b>💰 가격 확인</b>(그 게스트가 낸 가격). 총합이 큰 게스트가 최고가를 냈을 가능성이 높아요.",
        boardHtml: `<div class="hm-tut"><div class="hm-guests" style="width:100%"><div class="hm-g sel"><b>🎩</b><span>손님 1</span><i>2.2억</i><em>🔒 가격 1,000만원</em></div><div class="hm-g"><b>🧢</b><span>손님 2</span><i>1.8억</i></div><div class="hm-g"><b>🎀</b><span>손님 3</span><i>2.3억</i><em>📢 1등</em></div><div class="hm-g"><b>🕶️</b><span>손님 4</span><i>2.2억</i></div><div class="hm-g"><b>🎒</b><span>손님 5</span><i>2.1억</i></div></div></div>`, ms: 7600 },
      { tag: "STEP 3 · 승자", title: "가장 높은 가격이 여럿이면 그다음 가격", body: "각자 비밀로 이번 상품 가격을 제시해요 — <b>1원부터</b>, 10개 합쳐 <b>2억 원</b>을 넘으면 안 돼요. M은 모두 낸 뒤 공개돼요. <b>M을 넘지 않으면서 가장 높은 가격</b>이 이기고 (M과 같은 값도 괜찮아요), 가장 높은 가격이 <b>여럿이면 그다음으로 높은 가격</b>이 이겨요 (같은 값은 서로 무효). 예를 들어 M이 <b>1,000만원</b>일 때 <b>1,100만 · 990만 · 300만원</b>을 냈다면 990만원이 승점!",
        boardHtml: `<div class="hm-tut"><div class="hm-res"><div>🎯 M = 10,000,000원</div><div class="row x"><b>A</b><span>11,000,000원</span><span>🚫 M 초과</span></div><div class="row w"><b>B</b><span>9,900,000원</span><span>🏆 승</span></div><div class="row"><b>C</b><span>3,000,000원</span><span>유효 (더 높은 값이 있음)</span></div></div></div>`, ms: 9600 },
      { tag: "STEP 4 · 직접", title: "누가 이길까요?", body: "M은 <b>100만원</b>이에요. 세 사람이 <b>나 999,999원 · 철수 1,000,000원 · 영희 1,000,000원</b>을 냈어요. 가장 높은 값이 겹치면 그다음 값이 이겨요. 이번 판의 승자를 눌러요!",
        interactive: { hint: "👆 승자를 눌러요", doneText: "✅ 철수와 영희는 같은 값이라 무효 — 999,999원을 낸 내가 이겼어요!" },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="hm-tut"><div class="hm-res"><div>🎯 M = 1,000,000원</div><div class="row"><b>나</b><span>999,999원</span><span></span></div><div class="row"><b>철수</b><span>1,000,000원</span><span></span></div><div class="row"><b>영희</b><span>1,000,000원</span><span></span></div></div><div class="hm-kinds" style="grid-template-columns:repeat(3,1fr);width:100%"><button class="hm-pre" data-w="0" style="padding:10px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round)">나</button><button data-w="1" style="padding:10px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round)">철수</button><button data-w="2" style="padding:10px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:800 14px var(--round)">영희</button></div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (b.dataset.w === "0") { ctrl.sfx("win"); ctrl.complete(); } else ctrl.sfx("tap"); };
        } },
      { tag: "STEP 5 · 승점", title: "승점은 뒤로 갈수록 커요", body: "승점은 <b>1~7라운드 1점 · 8, 9라운드 2점 · 10라운드 4점</b>(합 15)이에요. <b>10라운드는 정보 없이</b> 바로 제시해요. 가격 합계 2억이 10개 전체의 예산이라서 <b>앞에서 너무 크게 쓰면 10라운드에 큰 값을 못 내요</b>. 10라운드 뒤 <b>승점이 가장 높은 사람이 우승자</b>, 같으면 <b>10라운드 승점을 얻은 사람</b>이 우승자예요. 끝자리를 어긋나게 해서 남과 같은 값을 피하는 것도 요령이에요. 막히면 <b>🧑‍🏫 AI 선생님</b>에게 물어봐요.",
        boardHtml: `<div class="hm-tut"><div class="hm-bud" style="width:100%"><div class="hm-b me"><b>나</b><span class="bar"><i style="width:35%"></i></span><span>7천만원 · 3점</span></div><div class="hm-b"><b>철수</b><span class="bar"><i style="width:80%"></i></span><span>1.6억원 · 2점</span></div></div></div>`, ms: 9000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-howmuch"] = {
    name: "하우머치", emoji: "🛒", short: "손님 5명의 최고가를 넘지 않게 · 가격 맞히기", min: 2, max: 6, defN: 3, board: false,
    show: "더 지니어스 · 시즌 4 · 하우머치", season: "시즌 4 그랜드 파이널",
    opts: [],
    diff: "방송의 '게스트' 5명은 화면에서 '손님'으로 나와요 — AI라서 가격은 게임마다 새로 만들어져요 (방송은 게스트가 직접 정함) · 10분 토론은 없고 정보 질문만 · 공개 정보는 방송에선 플레이어 세 명이 상의해 정하지만 우리는 라운드마다 돌아가며 한 사람이 골라요 · 방송은 3명이고 우승자를 뺀 두 명이 탈락후보(데스매치)지만 우리는 2~6명이고 순위만 가려요 · 모두 최고가 초과면 득점 없음 · 남은 라운드마다 최소 1원은 남겨야 제시할 수 있어요",
    howto: [
      "상품 10개 — <b>게스트</b>(화면의 손님) 5명이 미리 낸 가격 중 <b>최고가(M)</b>를 넘지 않으면서 <b>가장 높은 가격</b>을 낸 사람이 <b>승점</b> (게스트별 10개 가격 총합만 처음부터 공개)",
      "1~9라운드: 질문으로 <b>공개 정보 1개 · 비공개 정보 1개</b> — <b>게스트 순위 확인</b>(몇 번째로 높은 가격?) · <b>가격 확인</b>",
      "가격은 비밀로 <b>1원부터</b>, 10개 합쳐 <b>2억 원</b>까지 · 가장 높은 가격이 여럿이면 <b>그다음 가격</b>이 이겨요 (같은 값은 서로 무효 · M 초과도 무효)",
      "승점 <b>1~7라운드 1점 · 8, 9라운드 2점 · 10라운드 4점</b> (10라운드는 정보 없이 제시) · 총 승점 우승, 같으면 <b>10라운드 승자</b>",
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds}라운드 · ${V.pts}점`),
    chip: (V, i) => ({ t: `${V.points[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (이길 확률 · 정보가 줄이는 불확실성으로 두 수를 견줌)
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

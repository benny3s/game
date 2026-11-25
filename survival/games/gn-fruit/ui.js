/* 베니 서바이벌 · 과일가게 — 화면 (내 과일 · 희망가 · 아이템(교체 / 비밀) · 공개된 판매가 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores["gn-fruit"], F = G.FRUITS;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.fr-top{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.fr-rd{font:900 14px var(--round);color:#fff;background:rgba(239,68,68,.2);border:1px solid rgba(248,113,113,.55);border-radius:99px;padding:4px 11px;white-space:nowrap}
.fr-bg{font:800 12.5px var(--round);color:#fde68a;white-space:nowrap}
.fr-board{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.fr-c{display:grid;gap:1px;justify-items:center;padding:5px 4px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);min-width:0}
.fr-c.mine{border-color:#fde68a;background:rgba(253,230,138,.08)}
.fr-c .em{font-size:24px;line-height:1.1}
.fr-c .nm{font:800 12px var(--round);color:#e2e8f0}
.fr-c .sl{font:700 10.5px var(--round);color:var(--soft);text-align:center;line-height:1.3}
.fr-c .sl b{color:#fde68a}
.fr-log{flex:1 1 auto;min-height:60px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:4px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.1)}
.fr-ev{padding:3px 8px;border-radius:9px;background:rgba(255,255,255,.06);font:700 12px var(--round);color:#e2e8f0;line-height:1.4}
.fr-ev b{color:#fff}.fr-ev .sw{color:#a5f3fc}.fr-ev .hid{color:#c4b5fd}.fr-ev .win{color:#fde68a}
.fr-info{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.45}
.fr-info b{color:#fde68a}
.fr-box{flex:none;display:grid;gap:6px}
.fr-line{display:grid;grid-template-columns:70px 1fr;gap:6px;align-items:center}
.fr-line .lb{font:900 13px var(--round);color:#fff;line-height:1.2}
.fr-line .lb small{display:block;font:700 10.5px var(--round);color:var(--soft)}
.fr-pr{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.fr-pr button,.fr-sec button,.fr-sw button{padding:8px 0;border-radius:10px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:900 13.5px var(--round);cursor:pointer}
.fr-pr button.sel,.fr-sec button.sel{border-color:#fde68a;background:rgba(253,230,138,.2)}
.fr-sec{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.fr-sec button{padding:6px 0;font-size:12px}
.fr-sw{display:grid;gap:6px}
.fr-sw button{padding:10px 6px}
.fr-tut{display:grid;gap:8px;justify-items:center;font-size:14px;width:100%}
.fr-tut .fr-board,.fr-tut .fr-log{width:100%;box-sizing:border-box}
.fr-opt{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%}
.fr-opt button{padding:9px 0;border-radius:11px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:900 14px var(--round);cursor:pointer}
@media (max-height:780px){.fr-c .em{font-size:20px}.fr-pr button{padding:6px 0}.fr-info{font-size:11.5px}.fr-c .sl{font-size:10px}}
@media (max-height:690px){.fr-info.hint{display:none}.fr-bg{display:none}.fr-ev{font-size:11px;padding:2px 6px}.fr-c .sl{display:none}.fr-box{gap:4px}.fr-pr button{padding:4px 0;font-size:12.5px}.fr-sec button{padding:4px 0}.fr-line .lb small{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const won = G.won, fn = f => `${F[f].e} ${F[f].n}`;
  let RS = null;
  const rs = (V, ctx) => {
    const key = `${ctx.g}|${V.round}|${V.phase}`;
    if (!RS || RS.key !== key) { const p = {}; if (V.seat >= 0 && V.own[V.seat]) for (const f of V.own[V.seat]) p[f] = 5; RS = { key, g: ctx.g, p, sec: -1 }; }
    return RS;
  };
  function logHtml(V, ctx, me, watch) {
    const nm = i => (watch ? esc(nameOf(ctx, i)) : i === me ? "나" : esc(nameOf(ctx, i)));
    const rows = V.hist.map(h => {
      const sw = h.swaps.map(x => `<span class="sw">🔄 ${nm(x.s)}: ${fn(x.from)} → ${fn(x.to)} 교체</span>`).join("<br>");
      const fr = h.fruits.filter(x => x.sellers.length).map(x => {
        if (x.hidden && x.price === null) {
          const mine = !watch ? x.sellers.map((s, k) => (s === me && x.inc[k] !== null ? `내 수입 ${won(x.inc[k])}` : "")).filter(Boolean).join("") : "";
          return `${F[x.f].e} <span class="hid">🔒 비밀 — 판매가와 수입이 숨겨졌어요${mine ? ` (${mine})` : ""}</span>`;
        }
        const wins = x.sellers.map((s, k) => (x.inc[k] > 0 ? `${nm(s)} ${won(x.inc[k])}` : "")).filter(Boolean);
        const all = wins.length === x.sellers.length;
        return `${F[x.f].e} 판매가 <b>${won(x.price)}</b> · ${all ? (x.price === G.PMAX ? "모두 같게 나눠 가졌어요" : "모두 최저가라 나눠 가졌어요") : `<span class="win">${wins.join(" · ")} 독식</span>`}`;
      });
      const secret = h.secretBy.length ? `<br><span class="hid">🔒 ${watch ? h.secretBy.map(nm).join("·") : "내가"} 비밀 아이템을 썼어요</span>` : "";
      return `<div class="fr-ev"><b>${h.r + 1}라운드</b>${sw ? "<br>" + sw : ""}<br>${fr.join("<br>")}${secret}</div>`;
    });
    return `<div class="fr-log" id="fr-log">${rows.length ? rows.join("") : `<div class="fr-ev">아직 공개된 라운드가 없어요. 과일마다 가장 싼 값을 낸 사람이 그 과일의 수입을 독식해요.</div>`}</div>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, S = rs(V, ctx);
    const mine = !watch && ctx.canAct && V.needs.includes(me);
    const top = V.over ? "끝" : mine ? (V.phase === "swap" ? "내 차례 · 교체할까요?" : "내 차례 · 희망가 정하기") : watch ? "모두 정하는 중" : V.needs.includes(me) ? "대기" : "다른 사람을 기다려요";
    let h = `<div class="fr-top"><span class="fr-rd">🍎 ${V.over ? V.rounds : V.round + 1} / ${V.rounds} 라운드 · ${top}</span>${!watch ? `<span class="fr-bg">내 수입 ${won(V.income)}${V.item ? " · 아이템 1개" : ""}</span>` : ""}</div>`;
    h += `<div class="fr-board">${[0, 1, 2].map(f => `<div class="fr-c ${!watch && V.own[me].includes(f) ? "mine" : ""}"><div class="em">${F[f].e}</div><div class="nm">${F[f].n} · ${V.sellersOf[f].length}명</div><div class="sl">${V.sellersOf[f].map(i => (i === me && !watch ? "<b>나</b>" : esc(nameOf(ctx, i)))).join(" · ")}</div></div>`).join("")}</div>`;
    h += logHtml(V, ctx, me, watch);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="fr-info"><b>${V.draw ? "수입이 모두 같아 무승부예요" : first.includes(me) && !watch ? "🎉 내가 우승했어요!" : `${first.map(i => esc(nameOf(ctx, i))).join(" · ")} 우승`}</b> · 수입 ${V.incomes.map((x, i) => `${i === me && !watch ? "나" : esc(nameOf(ctx, i))} ${won(x)}`).join(" / ")}</div>`;
    } else if (mine && V.phase === "swap") {
      const mineF = V.own[me], other = [0, 1, 2].filter(f => !mineF.includes(f))[0];
      if (V.item) {
        h += `<div class="fr-info hint">🔄 <b>교체</b>: 희망가를 내기 전에 내 과일 하나를 ${fn(other)}(으)로 바꿔요 — 모두에게 공개되고 끝까지 유지돼요. 아이템은 교체 · 비밀 중 <b>한 번</b>만 써요.</div>`;
        h += `<div class="fr-sw">${mineF.map(f => `<button data-sw="${f}">${fn(f)} → ${fn(other)} 로 교체하기</button>`).join("")}<button data-sw="no">교체 안 하고 희망가 정하기</button></div>`;
      } else {
        h += `<div class="fr-info hint">🔄 아이템을 이미 썼어요 — 이번 라운드는 교체할 수 없어요.</div>`;
        h += `<div class="fr-sw"><button data-sw="no">계속해서 희망가 정하기</button></div>`;
      }
    } else if (mine) {
      const own = V.own[me];
      h += `<div class="fr-info hint">과일마다 <b>가장 싼 값을 낸 사람</b>이 (판매가 × 판매자 수)를 독식해요. 모두 같은 값이면 똑같이 나눠요 — 5천 원이면 과일마다 5천 원씩!</div>`;
      h += `<div class="fr-box">${own.map(f => `<div class="fr-line"><div class="lb">${fn(f)}<small>판매자 ${V.sellersOf[f].length}명</small></div><div class="fr-pr">${[1, 2, 3, 4, 5].map(p => `<button data-f="${f}" data-p="${p}" class="${S.p[f] === p ? "sel" : ""}">${p}천</button>`).join("")}</div></div>`).join("")}`;
      if (V.item) h += `<div class="fr-line"><div class="lb">🔒 비밀<small>한 번만</small></div><div class="fr-sec"><button data-s="-1" class="${S.sec < 0 ? "sel" : ""}">안 써요</button>${[0, 1, 2].map(f => `<button data-s="${f}" class="${S.sec === f ? "sel" : ""}">${F[f].e}${F[f].n}</button>`).join("")}</div></div>`;
      h += `<button class="btn big primary" data-a="price">💸 이대로 내기</button></div>`;
    } else if (watch) h += `<div class="fr-info">구경 중 — ${V.n - V.needs.length}/${V.n}명이 정했어요</div>`;
    else h += `<div class="fr-info">${V.phase === "price" && V.mineP ? `✅ 냈어요 (${V.own[me].map(f => `${F[f].e}${V.mineP[f]}천`).join(" ")}${V.mineSecret >= 0 ? ` · 🔒 ${F[V.mineSecret].e} 비밀` : ""}) — ` : ""}${V.n - V.needs.length}/${V.n}명이 정했어요</div>`;
    stage.innerHTML = h;
    const lg = stage.querySelector("#fr-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled) return;
      if (t.dataset.sw !== undefined) { ctx.sfx("pop"); if (t.dataset.sw === "no") ctx.act({ t: "noswap" }); else { const from = +t.dataset.sw, to = [0, 1, 2].filter(f => !V.own[me].includes(f))[0]; ctx.act({ t: "swap", from, to }); } return; }
      if (t.dataset.p) { S.p[+t.dataset.f] = +t.dataset.p; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.s !== undefined) { S.sec = +t.dataset.s; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (t.dataset.a === "price") { ctx.sfx("pop"); const a = { t: "price", p: Object.assign({}, S.p) }; if (S.sec >= 0) a.secret = S.sec; ctx.act(a); }
    };
  }
  // ── 🎞️ 복기 고리 ──────────────────────────────────────────────
  const fe = f => (F[f] ? `${F[f].e}${F[f].n}` : "?");
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "noswap") return "교체 안 함";
    if (a.t === "swap") return F[a.from] && F[a.to] ? `${fe(a.from)} → ${fe(a.to)} 교체` : "—";
    if (a.t === "price" && a.p && typeof a.p === "object") {
      const parts = Object.keys(a.p).map(Number).filter(f => F[f]).sort().map(f => `${fe(f)} ${a.p[f]}천 원`);
      if (!parts.length) return "—";
      if (Number.isInteger(a.secret) && F[a.secret]) parts.push(`🔒 ${fe(a.secret)} 비밀`);
      return parts.join(" · ");
    }
    return "—";
  }
  // 받침에 맞춰 조사 (과일 이름 끝)
  const jp = (f, a, b) => { const w = F[f] ? F[f].n : "", k = w.charCodeAt(w.length - 1); return fe(f) + (k >= 0xAC00 && k <= 0xD7A3 && (k - 0xAC00) % 28 !== 0 ? a : b); };
  const sg = x => (Math.abs(x) < 0.05 ? "0.0" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(1));
  const pc = x => Math.round(x * 100) + "%";
  const sameAct = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function review(V, seat, myA, bestA, info) {
    if (!V || !myA || !bestA || !V.own || !V.own[seat] || sameAct(myA, bestA) || (info && info.same)) return null;
    const ob = G.observe(V, seat), left = V.rounds - V.round;
    if (V.phase === "swap") {
      if (myA.t !== "swap" || bestA.t !== "noswap" || !F[myA.from] || !F[myA.to]) return null;
      const kf = V.sellersOf[myA.from].length, kt = V.sellersOf[myA.to].length, qt = G.cutProbs(V, seat, myA.to, ob).reduce((s, x) => s * (1 - x), 1);
      return { sev: kt >= kf ? 30 : 18, why: `교체하면 ${fe(myA.from)} ${kf}명 → ${kf - 1}명, ${fe(myA.to)} ${kt}명 → ${kt + 1}명이에요. 혼자 4천 원으로 깎아 독식하는 몫도 ${4 * kf}천 → ${4 * (kt + 1)}천 원으로 바뀌지만 ${F[myA.to].n}에서 누가 깎을 확률이 약 ${pc(1 - qt)}라 뚜렷한 이득은 없고, 아이템(교체 · 비밀 중 한 번뿐)을 써 버려요.` };
    }
    if (V.phase !== "price" || myA.t !== "price" || bestA.t !== "price" || !myA.p || !bestA.p) return null;
    const seed = (((info && info.seed) | 0) ^ Math.imul((((info && info.k) | 0) + 1), 0x9e3779b1)) >>> 0;
    const evs = G.evalPrices(V, seat, seed), parts = []; let loss = 0;
    for (const e of evs) {
      const pm = myA.p[e.f], pb = bestA.p[e.f];
      if (pm === pb || !(pm >= 1 && pm <= G.PMAX) || !(pb >= 1 && pb <= G.PMAX)) continue;
      const d = e.adj[pb] - e.adj[pm]; loss += Math.max(0, d);
      parts.push({ d, c: 1 - e.q.reduce((s, x) => s * (1 - x), 1), t: `${fe(e.f)} 내 ${pm}천 원 ${sg(e.adj[pm])}천 vs 고급 AI ${pb}천 원 ${sg(e.adj[pb])}천` });
    }
    // 🔒 비밀 아이템: 깎은 과일을 숨길 때만 값어치가 있어요 (한 번뿐 · 마지막 라운드엔 지킬 다음 라운드가 없음)
    const mySec = Number.isInteger(myA.secret) && myA.secret >= 0 ? myA.secret : -1, bSec = Number.isInteger(bestA.secret) && bestA.secret >= 0 ? bestA.secret : -1;
    let sx = 0, sxt = "";
    if (mySec >= 0 && (left === 1 || !(myA.p[mySec] < G.PMAX))) { sx = 14; sxt = left === 1 ? "마지막 라운드에 비밀을 쓰면 숨겨서 지킬 다음 라운드가 0번이에요" : `깎지 않은 ${jp(mySec, "을", "를")} 숨기면 가릴 게 없어요 (아이템은 한 번뿐)`; }
    else if (left > 1 && mySec < 0 && bSec >= 0 && V.own[seat].some(f => myA.p[f] < G.PMAX)) { sx = 10; sxt = `값을 깎았는데 비밀을 안 썼어요 — 고급 AI 는 깎은 ${jp(bSec, "을", "를")} 🔒 로 숨겨 남은 ${left - 1}라운드의 보복을 줄여요`; }
    if (!parts.length && !sx) return null;
    parts.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const sev = Math.max(0, Math.min(100, Math.round(100 * loss / 14 + sx)));
    const dsum = parts.reduce((x, p) => x + p.d, 0), head = parts.length ? (dsum < -0.35 ? "내 수의 기대 수입이 더 높게 나와요 — " : loss < 0.35 ? "두 수의 기대 수입이 거의 같아요 — " : "") + parts.map(p => p.t).join(" · ") + ` (기대 수입 = 다음 라운드 보복 위험까지 뺀 값 · 이 과일 판매자 중 누가 깎을 확률 약 ${pc(parts[0].c)})` : "";
    return { sev, why: [head, sxt].filter(Boolean).join(" · ") };
  }
  function result(V) {
    const first = V.ranks ? V.ranks.map((x, i) => (x === 0 ? i + 1 : 0)).filter(Boolean) : [];
    return `${V.draw ? "무승부 (수입이 모두 같아요)" : `우승 ${first.join("·")}번 · 최하위 ${V.losers.map(i => i + 1).join("·")}번`}${V.incomes ? ` · 수입 ${V.incomes.join("/")}천 원` : ""}`;
  }
  function tutorial() {
    style();
    const board = (cs) => `<div class="fr-board">${cs.map(c => `<div class="fr-c ${c.mine ? "mine" : ""}"><div class="em">${c.e}</div><div class="nm">${c.n}</div><div class="sl">${c.s}</div></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "과일을 팔아 수입을 가장 많이 벌어요", body: "각자 <b>서로 다른 과일 2개</b>의 판매권을 받아요 (누가 무슨 과일을 파는지는 모두 알아요). <b>4라운드</b> 동안 모은 수입이 가장 많은 사람이 우승, 가장 적은 사람이 탈락 후보예요.",
        boardHtml: `<div class="fr-tut">${board([{ e: "🍎", n: "사과 · 4명", s: "나 · 2번 · 3번 · 5번", mine: 1 }, { e: "🍇", n: "포도 · 4명", s: "나 · 2번 · 4번 · 6번", mine: 1 }, { e: "🍉", n: "수박 · 4명", s: "3번 · 4번 · 5번 · 6번" }])}</div>`, ms: 7000 },
      { tag: "STEP 2 · 희망가", title: "과일마다 희망가를 비밀로 내요", body: "라운드마다 내 과일마다 <b>1천 ~ 5천 원</b>의 희망가를 모두 동시에, 비밀로 정해요. 그 과일의 <b>판매가는 판매자들의 희망가 중 가장 낮은 값</b>이에요.",
        boardHtml: `<div class="fr-tut"><div class="fr-log"><div class="fr-ev">🍎 사과 판매자 4명의 희망가: 5천 · 5천 · 5천 · 5천 → 판매가 5천</div><div class="fr-ev">🍇 포도 판매자 4명의 희망가: 5천 · 4천 · 5천 · 5천 → 판매가 4천</div></div></div>`, ms: 7000 },
      { tag: "STEP 3 · 수입", title: "가장 싼 값을 낸 사람이 독식해요", body: "<b>최저가를 낸 사람</b>이 (판매가 × 그 과일 판매자 수)를 수입으로 가져가고, 나머지 판매자는 그 과일에서 <b>0원</b>이에요. 최저가가 같으면 수입을 똑같이 나눠요 (나머지는 버려요). 모두가 5천 원을 내면 과일마다 5천 원씩 (1인 1만 원) 나눠 가지지만, 혼자 4천 원을 내면 <b>4천 × 4명 = 1만 6천 원</b>을 독식!",
        boardHtml: `<div class="fr-tut"><div class="fr-log"><div class="fr-ev">🍇 판매가 <b>4,000원</b> · <span class="win">3번 16,000원 독식</span></div><div class="fr-ev">🍎 판매가 <b>5,000원</b> · 모두 같게 나눠 가졌어요</div></div></div>`, ms: 8500 },
      { tag: "STEP 4 · 아이템", title: "교체 또는 비밀 — 딱 한 번", body: "아이템은 4라운드 중 <b>한 번</b>만, 둘 중 하나예요. <b>🔄 교체</b>: 희망가를 내기 전에 내 과일 하나를 다른 과일로 바꿔요 (모두에게 공개, 끝까지 유지). <b>🔒 비밀</b>: 과일 하나의 판매가와 수입 공개를 막아요 (누가 썼는지도 비밀). 값을 깎은 걸 숨기면 보복을 피할 수 있어요.",
        boardHtml: `<div class="fr-tut"><div class="fr-log"><div class="fr-ev"><span class="sw">🔄 3번: 🍎 사과 → 🍉 수박 교체</span></div><div class="fr-ev">🍇 <span class="hid">🔒 비밀 — 판매가와 수입이 숨겨졌어요</span></div></div></div>`, ms: 8000 },
      { tag: "STEP 5 · 직접", title: "수입을 비교해 봐요", body: "사과 판매자 4명이 모두 5천 원을 냈어요 → 한 명당 <b>5천 원</b>. 그런데 <b>나만 4천 원</b>을 냈다면 내 사과 수입은 얼마일까요?",
        interactive: { hint: "👆 내 수입을 눌러요", doneText: "✅ 4천 원 × 판매자 4명 = 1만 6천 원! 나머지는 0원이에요 (대신 다음 라운드부터 다른 사람도 값을 깎을 수 있어요)." },
        render(stage, ctrl) {
          stage.innerHTML = `<div class="fr-tut"><div class="fr-info"><b>🍎 사과 판매자 4명</b> — 나만 희망가 4천 원, 나머지 3명은 5천 원</div><div class="fr-opt">${["0원", "4천 원", "1만 원", "1만 6천 원", "2만 원"].map((x, i) => `<button data-w="${i}">${x}</button>`).join("")}</div><div class="fr-info" id="fr-tm">내 사과 수입은?</div></div>`;
          stage.onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; if (+b.dataset.w === 3) { ctrl.sfx("win"); ctrl.complete(); } else { ctrl.sfx("tap"); const m = stage.querySelector("#fr-tm"); if (m) m.textContent = "최저가를 낸 사람이 (판매가 × 판매자 수)를 가져가요 — 4천 × 4명"; } };
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI["gn-fruit"] = {
    name: "과일가게", emoji: "🍎", short: "과일마다 가장 싼 값을 낸 사람이 독식해요 · 4라운드 수입 대결", min: 3, max: 6, defN: 6, board: false,
    show: "더 지니어스 · 시즌 3 · 과일가게", season: "시즌 3 블랙가넷",
    opts: [],
    diff: "방송은 13명에 과일 6종(판매자 4~5명)이지만 우리는 사람 수에 맞춰 과일 3종만 쓰고 각자 한 과일을 빼고 두 과일을 팔아요 (6명이면 과일마다 4명) · 방송의 큰 연합 · 협상은 AI 가 대신해요 · 전원 수입이 같으면 무승부 (방송의 연장 라운드는 뺐어요) · 가격 단위는 1천 원",
    howto: [
      "각자 <b>서로 다른 과일 2개</b>를 팔아요 (누가 뭘 파는지는 모두 공개) — <b>4라운드</b> 누적 수입 1위가 우승",
      "과일마다 <b>희망가(1천~5천 원)</b>를 비밀로 동시에 내요 — 판매가 = 그 과일 판매자들 중 <b>최저가</b>",
      "<b>최저가를 낸 사람</b>이 (판매가 × 판매자 수)를 독식 · 최저가가 같으면 똑같이 나눠요 · 나머지는 0원",
      "아이템은 <b>한 번</b>: 🔄 교체(내 과일 하나를 바꿈, 공개) 또는 🔒 비밀(과일 하나의 판매가 · 수입을 숨김)",
    ],
    sub: V => (V.over ? "끝" : `${V.round + 1}/${V.rounds} 라운드`),
    chip: (V, i) => ({ t: V.own[i].map(f => F[f].e).join(""), on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글 · 아쉬운 수 (고급 AI 와 같은 모형으로 두 수의 기대 수입을 견줌)
    actText, review,
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
    tutorial,
  };
})();

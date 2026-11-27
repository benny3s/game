/* 베니 서바이벌 · 블라인드 경매 — 화면 (매물 카드 고르기 · 큐브 공개 입찰 · 특수 카드 비공개 입찰 · 교환/강탈 · 결과 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.blindauction, ITEMS = K.ITEMS, SPECIAL = K.SPECIAL;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리) · t = 이 · 은 · 을 · 와 · 로
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const SRC = "피의 게임 X 4일차 3회전 머니 챌린지 <블라인드 경매> · 확인한 자료: 나무위키 '피의 게임X/4일차' 문서(규칙 · 매물 카드 표 · 라운드별 낙찰 기록 · 최종 결과) + 공식 클립 자막(입찰 · 특수 카드 장면). 방송 규칙: 매물 카드 30장(물품 22 + 이익 4 + 손해 4)에서 선 플레이어가 한 장씩 고름 · 큐브 11개(1~25)로 공개 입찰 · 특수 카드는 효과를 먼저 보이고 비공개 입찰 · 3번째 특수 카드가 나오면 끝 · 큐브 합이 가장 적은 사람은 가치 50% 삭감 · 큐브를 다 쓴 사람은 꼴찌";
  const DIFF = "3~5명 개인전 (방송 5팀 · 팀 회의 · 아이템 상점 · 협상 · 연합 없음) · 물품 22장 중 7장(마이클 잭슨 재킷 4.9억 · 파텍 필립 시계 265.5억 · 우주여행 6.5억 · 코비 유니폼 101.5억 · 워렌 버핏 점심 275.3억 · 성수동 아크로 290억 · 오타니 사인 카드 43.5억)은 방송 값 그대로 · 나머지 15장의 이름 · 값은 우리가 지어 총액을 방송과 같은 1,818억 7,000만 원에 맞춤 · 이익 · 손해 카드 4종(교환권 · 강탈 · 최고가 반납 · 50% 삭감)은 방송에 나온 것을 바탕으로 우리가 정함 (방송 글은 이익 4장 · 손해 4장까지만 — 종류마다 2장씩은 우리가 정함) — 교환 · 강탈은 따낸 즉시 쓰거나 안 씀 (방송은 보관했다 사용) · 아무도 안 부르고 한 명만 남으면 가장 작은 큐브 1개로 가져감 · 큐브를 다 쓴 사람(합 0)은 꼴찌이면서 '큐브 합 최소' 50% 삭감도 받고, 그때 남은 사람 중 가장 적은 사람은 삭감 안 받음 · 큐브가 없는 사람은 특수 카드 입찰에서 0이라 손해 카드는 늘 그 사람에게 감 (방송 글에 두 규칙이 겹칠 때 처리가 없어 우리가 정함) · 물품 값은 낙찰자만 알고, 다른 사람은 이름으로 짐작해요";
  const CSS = `
.ba{display:flex;flex-direction:column;gap:5px;height:100%;min-height:0}
.ba-top{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;font:700 12px/1.2 var(--round);color:var(--soft);flex:none}
.ba-top .rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.ba-top .tag{border-radius:99px;padding:2px 8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);white-space:nowrap}
.ba-top .tag.hot{color:#fca5a5;border-color:#fca5a5}
.ba-p{display:grid;gap:3px;flex:none}.ba-p.two{grid-template-columns:1fr 1fr}.ba-p.two .r{padding:3px 6px;gap:4px;font-size:11px;min-height:26px}.ba-p.two .on{font-size:11.5px}
.ba-p .r{display:flex;align-items:center;gap:6px;padding:3px 8px;min-height:28px;border-radius:10px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);font:700 12px/1.2 var(--round)}
.ba-p .r.me{border-color:rgba(134,239,172,.55)}.ba-p .r.cur{border-color:#fde68a;background:rgba(245,179,1,.12)}.ba-p .r.out{opacity:.45}
.ba-p .nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ba-p .cu{color:#93c5fd;white-space:nowrap}.ba-p .on{font:900 13px var(--round);color:#fde68a;white-space:nowrap}.ba-p .tb{color:var(--soft);font-weight:600;white-space:nowrap;font-size:11px}
.ba-cards{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;flex:none}
.ba-cards .btn{min-height:44px;font:900 15px var(--round);padding:2px;position:relative}
.ba-cards .btn.gone{opacity:.18}
.ba-card{border-radius:14px;border:2px solid #fde68a;background:rgba(245,179,1,.1);padding:6px 10px;text-align:center;flex:none;font-family:var(--round)}
.ba-card .big{font:900 17px/1.25 var(--round);color:#fff}.ba-card .sm{font:700 11.5px/1.3 var(--round);color:var(--soft)}
.ba-card.gain{border-color:#86efac;background:rgba(134,239,172,.1)}.ba-card.loss{border-color:#fca5a5;background:rgba(252,165,165,.1)}
.ba-cubes{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;flex:none}
.ba-cubes .btn{min-height:44px;font:900 18px var(--round);padding:2px}
.ba-cubes .btn.sel{background:#fde68a;color:#3b2a00;border-color:#fde68a}.ba-cubes .btn.used{opacity:.22}
.ba-acts{display:flex;gap:6px;flex:none}.ba-acts .btn{flex:1 1 0;min-height:46px}
.ba-note{font:700 12px/1.35 var(--round);color:var(--soft);text-align:center;flex:none}
.ba-note b{color:#fde68a}
.ba-mine{flex:none;font:700 11.5px/1.3 var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ba-mine b{color:#fde68a}
.ba-it{display:inline-flex;gap:3px;align-items:center;border-radius:99px;padding:2px 8px;font:700 11.5px/1.2 var(--round);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);max-width:100%}
.ba-it b{color:#fde68a}.ba-it.q{opacity:.75}
.ba-res{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;font-size:12.5px;line-height:1.4;min-height:0;overflow:auto}
.ba-res .big{font:900 15px var(--round);color:#fde68a;text-align:center}
.ba-res .r small{display:block;color:var(--soft);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ba-res .r{padding:3px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.ba-pick{display:grid;gap:4px;flex:none}.ba-pick .btn{min-height:44px;text-align:left;padding:4px 10px;font:700 12.5px/1.25 var(--round)}
.ba-tut{display:grid;gap:8px;justify-items:center;width:100%}.ba-tut .ba-cubes{width:100%}
.sv-coachfit .ba-note{display:none}.sv-coachfit .ba-cards .btn,.sv-coachfit .ba-cubes .btn{min-height:44px}.sv-coachfit .ba-p .r{min-height:24px;padding:2px 8px}
.sv-coachfit .ba-card .sm{display:none}.sv-coachfit .ba-card{padding:3px 10px}.sv-coachfit .ba-card .big{font-size:15px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const rn = V => (V.phase === "pick" && !V.over ? V.round + 1 : V.round);
  const sum = a => (a || []).reduce((x, y) => x + y, 0);
  const fv = v => { const o = Math.round(v / 1000) / 10; return `${o}억`; };
  const itemH = (it, mine) => `<span class="ba-it${mine ? "" : " q"}">${it.em} ${esc(it.nm)}${it.v != null ? ` <b>${fv(it.v)}${it.h ? " (절반)" : ""}</b>` : ""}</span>`;
  const sel = { key: "", c: new Set(), a: 0, b: -1, cardPos: -1 };
  const resetSel = key => { sel.key = key; sel.c = new Set(); sel.a = -1; sel.b = -1; };
  const SK = { swap: "교환권", steal: "강탈", drop: "최고가 반납", half: "50% 삭감" };

  function resHtml(V, ctx) {
    const R = V.res, nm = i => esc(nameOf(ctx, i)), me = ctx.me;
    const who = s => (s === me ? "내가" : nm(s) + ja(nameOf(ctx, s), "이")), whom = s => (s === me ? "나" : nm(s));
    if (V.over) {
      const f = V.fin || [], order = f.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
      return `<div class="ba-res"><div class="big">${{ special: "3번째 특수 카드 — 경매 끝!", deck: "카드가 다 나와서 끝", cubes: "모두 큐브를 다 써서 끝" }[V.end] || "끝"}</div>${order.map(s => { const x = f[s]; return `<div class="r">${V.ranks[s] + 1}위 <b>${whom(s)}</b> — 물품 ${fv(x.items)}${x.half ? " → 큐브 합이 가장 적어 절반" : ""} = <b>${fv(x.total)}</b> · ♦${x.cube}${x.out ? " (큐브 없음 → 꼴찌)" : ""}<small>${V.items[s].map(it => it.em + esc(it.nm) + " " + fv(it.v)).join(" · ") || "물품 없음"}</small></div>`; }).join("")}</div>`;
    }
    if (!R) return "";
    let h = "";
    if (R.k === "item") {
      const it = ITEMS[R.id], mineV = V.items[R.w].find(x => x.id === R.id);
      h += `<div class="big">${it.em} ${esc(it.nm)}</div><div class="r">${who(R.w)} 낙찰 — ${R.free ? `아무도 안 불러 큐브 ${R.spent[0] || 0} 하나로 가져갔어요` : `큐브 ${R.spent.join(" + ")} = <b>${sum(R.spent)}</b>`}</div>`;
      h += R.w === me && mineV && mineV.v != null ? `<div class="r">내가 확인한 값: <b>${fv(mineV.v)}</b> (다른 사람은 몰라요)</div>` : `<div class="r">값은 낙찰자만 알아요</div>`;
      if (R.lost != null) h += `<div class="r">⬇️ 반납 대기 때문에 가장 비싼 물품(${esc(ITEMS[R.lost].nm)})이 사라졌어요</div>`;
    } else if (R.k === "end3") h += `<div class="big">${SPECIAL[R.e].em} ${SPECIAL[R.e].nm} — 3번째 특수 카드!</div><div class="r">경매 없이 바로 끝나요</div>`;
    else {
      const E = SPECIAL[R.e]; h += `<div class="big">${E.em} ${E.nm}</div>`;
      if (R.tied && R.win.length === V.n) h += `<div class="r">비공개 입찰이 또 같아 모두에게 적용돼요</div>`;
      else if (R.tied) h += `<div class="r">동률이 풀리지 않아 ${R.k === "gain" ? "이익은 사라졌어요" : "모두에게 적용"}</div>`;
      else h += `<div class="r">${R.k === "gain" ? "가장 크게" : "가장 작게"} 낸 ${R.win.map(s => `<b>${whom(s)}</b>`).join(", ")} — ${R.k === "gain" ? "이익을" : "손해를"} 받아요</div>`;
      for (const d of R.detail || []) h += `<div class="r">${whom(d.s)}: ${d.gone ? "가장 비싼 물품이 사라졌어요" : d.pending ? "물품이 없어서 다음에 얻는 물품에 바로 적용돼요" : `보유 물품 ${d.half}장의 가치가 절반`}</div>`;
      if (R.swap) { const s = R.swap, w = R.win[0]; h += `<div class="r">${whom(w)} ← ${esc(nameOf(ctx, s.from))}의 ${esc(ITEMS[s.got].nm)}${s.give != null ? ` · 대신 ${esc(ITEMS[s.give].nm)} 줌` : ""}</div>`; }
      else if (R.unused) h += `<div class="r">쓸 수 있는 물품이 없거나 안 써서 지나갔어요</div>`;
      else if (R.sw) h += `<div class="r">받은 사람이 쓸 물품을 고르는 중…</div>`;
    }
    if (V.rankInfo && V.rankInfo.after === V.round && V.spec === 2) h += `<div class="r">📊 물품 총액 순위(값은 비공개): ${V.rankInfo.order.map((s, i) => `${i + 1}위 ${whom(s)}`).join(" · ")}</div>`;
    return `<div class="ba-res">${h}</div>`;
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, nm = i => nameOf(ctx, i), watch = me < 0, ph = V.phase;
    const key = `${V.round}|${ph}|${V.bid ? V.bid.high + "|" + V.bid.cur : ""}|${V.sb ? V.sb.tries + "|" + V.sb.got.join("") : ""}|${me}`;
    if (sel.key !== key) resetSel(key);
    const can = ctx.canAct && !watch && !V.over && V.needs.includes(me);
    const cubeSum = s => (s === me ? sum(V.hand) : sum(V.pubHand[s]));
    let h = `<div class="ba"><div class="ba-top"><span class="rd">${V.over ? "끝" : `${rn(V)}번째 카드`}</span>${V.over ? "" : `<span class="tag${V.spec >= 2 ? " hot" : ""}">⚡특수 ${V.spec}/${V.endAt}</span><span class="tag">남은 카드 ${V.left}</span><span class="tag">물품 ${V.itemsLeft}장 남음</span>`}</div>`;
    const rows = Array.from({ length: V.n }, (_, s) => {
      const b = V.bid, cur = (ph === "bid" && b.cur === s) || (ph === "pick" && V.lead === s), out = b && b.pass[s];
      const tb = b ? (b.pass[s] ? "포기" : b.tab[s].length ? `🧊 ${b.tot[s]}${b.hi === s ? " ★최고" : ""}` : "") : "";
      const hid = V.hid[s] ? ` (몰래 ${V.hid[s]}개 씀)` : "";
      return `<div class="r${s === me ? " me" : ""}${cur ? " cur" : ""}${out ? " out" : ""}"><span class="nm">${s === me ? "나" : esc(nm(s))}${cur && (ph === "pick" || ph === "bid") ? " ◀" : ""}</span><span class="tb">${tb}</span><span class="cu">♦ ${cubeSum(s)}</span><span class="on">🎁${V.items[s].length}${s === me && V.items[s].length && V.n < 4 ? ` ${fv(V.items[s].reduce((a, x) => a + x.v, 0))}` : ""}</span></div>`;
    }).join("");
    if (!V.over) h += `<div class="ba-p${V.n >= 4 ? " two" : ""}">${rows}</div>`;
    if (V.over || ph === "show") h += resHtml(V, ctx);
    else if (ph === "pick") {
      h += `<div class="ba-note">${V.lead === me && can ? "<b>내 차례</b> — 뒤집힌 카드 한 장을 골라요 (물품 · 이익 · 손해 중 무엇이 나올지 몰라요)" : `${esc(nm(V.lead))}${ja(nm(V.lead), "이")} 카드를 고르는 중…`}</div>`;
      h += `<div class="ba-cards">${Array.from({ length: K.NCARD }, (_, p) => { const left = V.avail.includes(p); return `<button class="btn${left ? "" : " gone"}" data-card="${p}" ${left && can ? "" : "disabled"}>${left ? p + 1 : "·"}</button>`; }).join("")}</div>`;
    } else if (ph === "bid") {
      const b = V.bid, it = ITEMS[b.id];
      h += `<div class="ba-card"><div class="big">${it.em} ${esc(it.nm)}</div><div class="sm">값은 낙찰자만 알아요 · 지금 최고 <b style="color:#fde68a">${b.high || "없음"}</b>${b.hi >= 0 ? ` (${b.hi === me ? "나" : esc(nm(b.hi))})` : ""}</div></div>`;
      if (can) {
        const chosen = [...sel.c], add = sum(chosen), nt = b.tot[me] + add, ok = chosen.length && nt > b.high;
        h += `<div class="ba-cubes">${V.hand.map(c => `<button class="btn${sel.c.has(c) ? " sel" : ""}" data-cube="${c}">${c}</button>`).join("")}</div>`;
        h += `<div class="ba-note">내 테이블 ${b.tot[me]} + 고른 ${add} = <b>${nt}</b> ${nt > b.high ? "→ 부를 수 있어요" : `→ ${b.high + 1} 이상이어야 해요`}</div>`;
        h += `<div class="ba-acts"><button class="btn primary" data-a="bid" ${ok ? "" : "disabled"}>${ok ? `🧊 ${nt} 부르기` : "부르기"}</button><button class="btn" data-a="pass">포기</button></div>`;
      } else h += `<div class="ba-note">${V.needs.length ? `${esc(nm(b.cur))} 차례 — 높게 부르거나 포기해요` : ""}</div>`;
    } else if (ph === "sbid") {
      const E = SPECIAL[V.sb.e];
      h += `<div class="ba-card ${E.k}"><div class="big">${E.em} ${E.nm}</div><div class="sm">${E.k === "gain" ? "이익 — 가장 크게 비공개 입찰한 사람이 받아요" : "손해 — 가장 작게 입찰한 사람이 받아요"} · ${E.d} · 낸 큐브는 모두 사라져요${V.sb.tries > 1 ? " · <b>동률 재입찰</b>" : ""}</div></div>`;
      if (can) {
        const chosen = [...sel.c];
        h += `<div class="ba-cubes">${V.hand.map(c => `<button class="btn${sel.c.has(c) ? " sel" : ""}" data-cube="${c}">${c}</button>`).join("")}</div>`;
        h += `<div class="ba-note">비공개로 낼 큐브 합 <b>${sum(chosen)}</b> (남은 큐브 ${sum(V.hand)})</div><div class="ba-acts"><button class="btn primary" data-a="sbid" ${chosen.length ? "" : "disabled"}>🔒 비공개 입찰</button></div>`;
      } else h += `<div class="ba-note">${watch ? "비공개 입찰 중…" : V.sb.mine ? "입찰했어요 · 다른 사람을 기다려요" : V.sb.who.includes(me) ? "기다려요" : "이번 입찰은 동률인 사람만 해요"} (${V.sb.got.filter(Boolean).length}/${V.sb.who.length} 완료)</div>`;
    } else if (ph === "swap") {
      const e = V.sw.e, w = V.sw.s;
      h += `<div class="ba-card gain"><div class="big">${SPECIAL[e].em} ${esc(nm(w))} — ${e === "swap" ? "바꿀 물품 고르기" : "가져올 물품 고르기"}</div></div>`;
      if (can) {
        if (e === "swap") h += `<div class="ba-note">① 내 물품을 고르고 ② 상대 물품을 골라요</div><div class="ba-mine">${V.items[me].map((it, i) => `<button class="btn${sel.a === i ? " sel" : ""}" data-mine="${i}" style="min-height:44px">${it.em} ${esc(it.nm)} ${it.v != null ? fv(it.v) : ""}</button>`).join("")}</div>`;
        h += `<div class="ba-pick">${V.items.map((a, s) => (s === me ? "" : a.map((it, i) => `<button class="btn" data-take="${s}|${i}" ${e === "swap" && sel.a < 0 ? "disabled" : ""}>${esc(nm(s))} — ${it.em} ${esc(it.nm)}</button>`).join(""))).join("")}</div>`;
        h += `<div class="ba-acts"><button class="btn" data-a="keep">안 쓰기</button></div>`;
      } else h += `<div class="ba-note">고르는 중…</div>`;
    }
    if (!V.over && ph !== "show" && ph !== "swap" && !watch) { const t = V.items[me].length ? V.items[me].map(it => `${it.em}${it.nm.split(" ")[0]} ${fv(it.v)}${it.h ? "(절반)" : ""}`).join(" · ") : "아직 없어요"; h += `<div class="ba-mine">🎁 ${esc(t.length > 34 ? t.slice(0, 33) + "…" : t)}</div>`; }
    h += `</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const b = e.target.closest("button"); if (!b || b.disabled || !can) return;
      if (b.dataset.card != null) { ctx.sfx("pop"); ctx.act({ t: "card", pos: +b.dataset.card }); return; }
      if (b.dataset.cube != null) { ctx.sfx("tap"); const c = +b.dataset.cube; if (sel.c.has(c)) sel.c.delete(c); else sel.c.add(c); render(stage, V, ctx); return; }
      if (b.dataset.mine != null) { ctx.sfx("tap"); sel.a = +b.dataset.mine; render(stage, V, ctx); return; }
      if (b.dataset.take) { ctx.sfx("pop"); const [from, theirs] = b.dataset.take.split("|").map(Number); ctx.act(V.sw.e === "swap" ? { t: "swap", from, theirs, mine: sel.a } : { t: "steal", from, theirs }); return; }
      const a = b.dataset.a;
      if (a === "bid") { ctx.sfx("pop"); ctx.act({ t: "bid", cubes: [...sel.c].sort((x, y) => x - y) }); }
      else if (a === "pass") { ctx.sfx("tap"); ctx.act({ t: "pass" }); }
      else if (a === "sbid") { ctx.sfx("pop"); ctx.act({ t: "sbid", cubes: [...sel.c].sort((x, y) => x - y) }); }
      else if (a === "keep") { ctx.sfx("tap"); ctx.act({ t: "keep" }); }
    };
  }

  function actText(a, V) {
    if (!a) return "—";
    if (a.t === "card") return `${a.pos + 1}번 카드 고름`;
    if (a.t === "pass") return "포기";
    if (a.t === "bid") return `큐브 ${a.cubes.join(" + ")}${ja(a.cubes[a.cubes.length - 1], "로")} 부르기 (+${sum(a.cubes)})`;
    if (a.t === "sbid") return `비공개 입찰 큐브 ${a.cubes.length}개 (합 ${sum(a.cubes)})`;
    if (a.t === "swap") return "물품 교환";
    if (a.t === "steal") return "물품 강탈";
    if (a.t === "keep") return "안 씀";
    return "";
  }
  // ── 선생님 ──
  let CC = { key: "", r: null, open: false, full: "" };
  const recOf = (V, me) => { const key = `${V.pub}|${me}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me), open: false, full: "" }; return CC.r; };
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-bahint]");
    if (!b) return; e.preventDefault(); CC.open = true;
    const sp = document.createElement("span"); sp.innerHTML = CC.full; b.replaceWith(sp);
  }, true);
  const LV = id => { const b = K.BAND[id]; return b < 10 ? "작은 값" : b < 40 ? "중간 값" : b < 100 ? "꽤 큰 값" : "아주 큰 값"; };
  function coach(V, me, since, names) {
    const nm = i => esc((names && names[i]) || `${i + 1}번`), watch = !(me >= 0 && me < V.n);
    const others = Array.from({ length: V.n }, (_, s) => s).filter(s => s !== me);
    const opp = others.map(s => `${nm(s)} 큐브 약 ${sum(V.pubHand[s])}${V.hid[s] ? ` (몰래 ${V.hid[s]}개 씀)` : ""} · 물품 ${V.items[s].length}장`).join(" / ") + ".";
    if (V.over) return { opp: "판이 끝났어요.", mine: watch ? "" : `내 순위 ${V.ranks[me] + 1}위`, rec: "한 판 더 해 봐요!", why: "" };
    if (watch) return { opp, mine: `${rn(V)}번째 카드 · 특수 ${V.spec}/${V.endAt}.`, rec: "구경 중이에요.", why: "" };
    const myItems = V.items[me].reduce((a, x) => a + x.v, 0), myC = sum(V.hand), minO = Math.min(...others.map(s => sum(V.pubHand[s]) - V.hid[s] * 8));
    const mine = `물품 ${V.items[me].length}장 (값 합 ${fv(myItems)}) · 남은 큐브 ${myC}${myC <= minO ? " — 지금 큐브 합이 가장 적어 끝나면 가치가 절반이 될 수 있어요!" : ""} · 특수 카드 ${V.spec}/${V.endAt}.`;
    let rec = "기다려요", why = "";
    if (V.needs.includes(me)) {
      const R = recOf(V, me), a = R && R.a;
      if (V.phase === "pick") { rec = "아무 카드나 골라도 돼요"; why = `남은 카드 ${V.left}장 중 물품 약 ${V.itemsLeft}장 · 특수 ${K.NCARD - 22 - V.spec}장 — 특수 카드가 ${V.endAt - V.spec}번 더 나오면 끝이라 큐브를 너무 아끼면 남아요.`; }
      else if (V.phase === "bid" && a) {
        const b = V.bid, tot = a.t === "bid" ? b.tot[me] + sum(a.cubes) : null;
        if (a.t === "bid") { rec = `<b>${tot}</b>까지 올려 불러요.`; CC.full = `큐브 <b>${a.cubes.join(" + ")}</b> (이름으로 짐작하면 ${LV(b.id)}).`; }
        else { rec = "<b>포기</b>해요."; CC.full = `이름으로 짐작하면 ${LV(b.id)} — 이 값에 큐브를 더 쓰기엔 아까워요.`; }
        why = `${CC.open ? CC.full + " " : ""}내 큐브 합 ${myC}을 앞으로 나올 물품(약 ${R.ahead ? R.ahead.toFixed(1) : "?"}장)에 값어치대로 나누면 이 물품에 쓸 만큼은 약 ${Math.round(R.w)}예요.`;
        if (!CC.open) rec += ` <button type="button" class="ep-hbtn" data-bahint>💡 전체 보기</button>`;
      } else if (V.phase === "sbid" && a) {
        const e = V.sb.e; rec = `비공개로 <b>큐브 ${sum(a.cubes)}</b> 정도 내요.`; CC.full = `큐브 <b>${a.cubes.join(" + ")}</b> 를 내요.`;
        why = `${CC.open ? CC.full + " " : ""}${SPECIAL[e].k === "gain" ? "이익은 가장 크게 내야 받지만 낸 큐브는 모두 사라져요 — 이득이 큰 만큼만 내요." : "손해는 가장 작게 낸 사람이 받아요 — 내 손해가 클수록 더 내서 피해요."}`;
        if (!CC.open) rec += ` <button type="button" class="ep-hbtn" data-bahint>💡 전체 보기</button>`;
      } else if (V.phase === "swap" && a) {
        rec = a.t === "keep" ? "<b>안 써요</b>" : "<b>쓰는 게 좋아요</b>"; why = a.t === "keep" ? "바꿔도 이득이 작아요." : "상대가 가진 물품 중 이름으로 가장 비싸 보이는 것을 노려요.";
      }
    } else if (V.phase === "show") { rec = "결과를 보고 다음 카드를 준비해요"; why = "이번 결과가 위에 나와 있어요."; }
    return { opp, mine, rec, why };
  }
  function review(V, seat, myA, bestA) {
    if (!V || !myA || !K.judge || V.phase !== "bid") return null;
    const J = K.judge(V, seat, myA, bestA); if (!J || !J.my || !J.best) return null;
    const d = J.best.u - J.my.u, sev = Math.max(0, Math.min(100, Math.round(d * 100)));
    return { sev, why: `내 수(${actText(myA, V)}) / 고급 AI(${actText(bestA, V)}) — 이 물품에 쓸 한도는 약 ${Math.round(J.best.w)}` };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`), f = V.fin || [];
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    return `<div class="ba-res"><div>${rn(V)}번째 카드에서 끝 · 특수 ${V.spec}/${V.endAt}</div>${order.map(s => `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${f[s] ? fv(f[s].total) : ""}</b>${f[s] && f[s].half ? " (큐브 최저 → 절반)" : ""}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const cu = [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25];
    return [
      { tag: "STEP 1 · 목표", title: "값을 모르고 사는 경매예요", body: "매물 카드 30장은 뒤집혀 있고 <b>물품 22장 · 이익 4장 · 손해 4장</b>이에요. 물품의 <b>값은 낙찰받은 사람만</b> 알아요. 끝났을 때 <b>가진 물품 값의 합</b>이 가장 큰 사람이 이겨요!",
        boardHtml: `<div class="ba-tut"><div class="ba-card"><div class="big">🎁 물품 ?억</div><div class="sm">값은 낙찰자만 확인</div></div></div>`, ms: 7600 },
      { tag: "STEP 2 · 큐브", title: "큐브 11개로만 값을 불러요", body: "모두 같은 <b>큐브 11개</b>(1 · 2 · 3 · 4 · 6 · 8 · 10 · 12 · 15 · 20 · 25)를 가져요. 낙찰받으면 낸 큐브는 <b>사라져요</b>. 높게 부르거나 <b>포기</b>하고, 한 명만 남으면 낙찰! 포기하면 낸 큐브는 돌려받아요.",
        boardHtml: `<div class="ba-tut"><div class="ba-cubes">${cu.map(c => `<div class="btn">${c}</div>`).join("")}</div></div>`, ms: 7600 },
      { tag: "STEP 3 · 직접", title: "큐브를 골라 불러 봐요", body: "지금 최고가는 <b>12</b>예요. 아래 큐브를 눌러 <b>합이 13 이상</b>이 되게 골라 부르기를 눌러요.",
        interactive: { hint: "👆 합이 13 이상이 되게 큐브를 골라 부르기", doneText: "✅ 최고가를 넘겨 불렀어요" },
        render(stage, ctrl) {
          const pick = new Set(); let done = false;
          const draw = () => {
            const t = [...pick].reduce((a, b) => a + b, 0);
            stage.innerHTML = `<div class="ba-tut"><div class="ba-card"><div class="big">⌚ 시계 · 최고 12</div></div><div class="ba-cubes">${cu.map(c => `<button class="btn${pick.has(c) ? " sel" : ""}" data-t="${c}" ${done ? "disabled" : ""}>${c}</button>`).join("")}</div><div class="ba-note">고른 합 <b>${t}</b></div><div class="ba-acts" style="width:100%"><button class="btn primary" data-go="1" ${t >= 13 && !done ? "" : "disabled"}>🧊 ${t} 부르기</button></div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("button"); if (!b || b.disabled) return;
            if (b.dataset.t != null) { ctrl.sfx("tap"); const c = +b.dataset.t; if (pick.has(c)) pick.delete(c); else pick.add(c); draw(); }
            else if (b.dataset.go) { ctrl.sfx("pop"); done = true; draw(); ctrl.complete(); }
          };
          draw();
        } },
      { tag: "STEP 4 · 특수 카드", title: "이익 · 손해 카드는 몰래 입찰해요", body: "<b>이익</b>(교환권 · 강탈)은 비공개로 <b>가장 크게</b> 낸 사람이, <b>손해</b>(최고가 반납 · 50% 삭감)는 <b>가장 작게</b> 낸 사람이 받아요. 입찰한 큐브는 모두 사라져요. 특수 카드가 <b>3번째</b> 나오면 경매가 바로 끝나요!",
        boardHtml: `<div class="ba-tut"><div class="ba-card gain"><div class="big">🫳 카드 강탈</div><div class="sm">가장 크게 → 이익</div></div><div class="ba-card loss"><div class="big">✂️ 50% 삭감</div><div class="sm">가장 작게 → 손해</div></div></div>`, ms: 9000 },
      { tag: "STEP 5 · 큐브 지키기", title: "큐브 합이 가장 적으면 절반!", body: "끝났을 때 <b>남은 큐브 합이 가장 적은 사람</b>은 물품 값이 <b>50%</b>로 깎이고, 큐브를 <b>다 쓴 사람은 꼴찌</b>예요. 너무 아끼면 남고, 너무 쓰면 깎여요 — 적당히!",
        boardHtml: `<div class="ba-tut"><div class="ba-card"><div class="big">290억 → 145억 😱</div><div class="sm">큐브 합 꼴찌의 물품 값</div></div></div>`, ms: 8000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.blindauction = {
    name: "블라인드 경매", emoji: "🔨", short: "값을 모르는 물품을 큐브로 사요 — 이름으로 짐작하고, 큐브는 아껴 써요", min: 3, max: 5, defN: 4, board: false, src: SRC, diff: DIFF,
    howto: [
      "방송: 뒤집힌 매물 카드 30장(물품 22 · 이익 4 · 손해 4) 중 <b>선 플레이어가 한 장</b>을 골라요 — 가장 값진 물품을 모은 사람이 이겨요",
      "모두 <b>큐브 11개</b>(1~25)를 가지고 <b>공개 입찰</b>해요 (선부터 높게 부르거나 포기 · 큐브는 합으로 불러요) · 한 명만 남으면 낙찰 — 낙찰자가 낸 큐브는 <b>사라지고</b>, 포기한 사람은 낸 큐브를 돌려받아요 · 물품 <b>값은 낙찰자만</b> 알아요",
      "<b>이익 · 손해 카드</b>는 효과를 보고 큐브를 <b>비공개</b>로 입찰해요 — 이익은 가장 크게, 손해는 가장 작게 낸 사람이 받아요 (낸 큐브는 모두 사라짐 · 동률이면 다시)",
      "<b>3번째 특수 카드</b>가 나오면 경매 없이 바로 끝! 끝나면 가진 물품 값의 합으로 순위를 정해요",
      "특별 규칙: <b>큐브 합이 가장 적은 사람은 가치 50% 삭감</b> · 큐브를 다 쓴 사람은 꼴찌 · 동률은 남은 큐브가 많은 쪽",
    ],
    sub: V => (V.over ? "끝" : `${rn(V)}번째 카드 · 특수 ${V.spec}/${V.endAt} · ${{ pick: "카드 고르기", bid: "입찰", sbid: "비공개 입찰", swap: "물품 고르기", show: "결과" }[V.phase] || ""}`),
    chip: (V, i) => ({ t: `🎁${V.items[i].length} ♦${sum(V.pubHand[i])}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

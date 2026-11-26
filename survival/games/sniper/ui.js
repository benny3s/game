/* 베니 서바이벌 · 저격 홀덤 — 화면 (카드 1~10 · 공유 4장 · 베팅 · 저격 · 생존 75개 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const K = window.SVCores.sniper;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CATS = K.CATS;
  const CAT2 = ["하이<br>카드", "원<br>페어", "투<br>페어", "트리플", "스트<br>레이트", "풀<br>하우스", "포<br>카드"];
  const SRC = "방송: 데블스 플랜: 데스룸 (시즌 2) · 3일차 감옥 매치 (5명)";
  const DIFF = "3~6명 (빈 자리는 AI) · 선은 무작위로 시작해 라운드마다 다음 사람 (방송은 카드를 뽑아 정함) · 레이즈는 1개 단위 · 포기한 사람은 저격 안 함 · 생존한 사람의 남는 칩은 한 사람에게 몰아 줌 (칩이 0 인 사람에게 1개씩 먼저) · 라운드 시작에 칩이 0 인 사람이 있으면 그 사람이 탈락하고 끝 · 80라운드가 지나면 칩이 가장 적은 사람이 탈락 · 시작 칩 20개 옵션 (생존 25개) — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const pct = p => `${Math.round(p * 100)}%`;
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const eul = w => { const j = jong(w); return j < 0 ? "을(를)" : j ? "을" : "를"; };
  const hn = (c, num) => K.handName(c, num);

  const CSS = `
.sn-tbl{display:grid;gap:3px;flex:none;padding:4px;border-radius:14px;background:radial-gradient(ellipse at 50% 15%,rgba(21,128,61,.5),rgba(5,46,22,.65));border:1px solid rgba(134,239,172,.22)}
.sn-row{display:grid;grid-template-columns:20px minmax(0,68px) minmax(0,1fr) auto 34px;grid-template-areas:"o n t p c";column-gap:5px;align-items:center;padding:3px 6px;border-radius:9px;background:rgba(0,0,0,.24);border:1.5px solid transparent;min-height:24px}
.sn-row.two{grid-template-areas:"o n t p c" "o x x x x";row-gap:2px}
.sn-row.me{background:rgba(34,197,94,.14)}
.sn-row.cur{border-color:var(--gold)}
.sn-row.win{border-color:#fbbf24;background:rgba(251,191,36,.16)}
.sn-row.gone{opacity:.5}
.sn-row.fold .sn-t{color:rgba(255,255,255,.4)}
.sn-o{grid-area:o;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:900 10.5px var(--round);color:#0f172a;background:#bbf7d0}
.sn-o.f{background:#fbbf24}.sn-o.s{background:#4ade80}.sn-o.x{background:#f87171;color:#fff}
.sn-n{grid-area:n;min-width:0;font:800 12.5px/1.2 var(--round);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sn-t{grid-area:t;min-width:0;font:700 11.5px/1.2 var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sn-t .r{color:#fca5a5}.sn-t .g{color:#86efac}.sn-t .y{color:#fde68a}
.sn-p{grid-area:p;font:800 11px var(--round);color:#fde68a;white-space:nowrap}
.sn-ch{grid-area:c;text-align:right;font:900 14px/1 var(--round);color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap}
.sn-x{grid-area:x;display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;font:700 11px var(--round);color:var(--soft);white-space:nowrap}
.sn-x b{color:#fff}.sn-x .hit{color:#fca5a5}.sn-x .gain{color:#86efac;margin-left:auto}
.sn-mc{flex:none;min-width:17px;height:20px;padding:0 2px;border-radius:4px;display:grid;place-items:center;font:900 12px/1 var(--round);background:#f8fafc;color:#0f172a}
.sn-mid{display:flex;align-items:flex-end;justify-content:center;gap:10px;flex:none}
.sn-grp{display:grid;gap:2px;justify-items:center}
.sn-grp>i{font:700 10.5px var(--round);font-style:normal;color:var(--soft)}
.sn-cards{display:flex;gap:3px}
.sn-c{width:34px;height:46px;border-radius:7px;display:grid;place-items:center;font:900 20px/1 var(--round);background:linear-gradient(#fff,#e2e8f0);color:#0f172a;border:2px solid #cbd5e1;box-shadow:0 2px 4px rgba(0,0,0,.35)}
.sn-c.back{background:repeating-linear-gradient(45deg,#7f1d1d 0 4px,#991b1b 4px 8px);border-color:#fca5a5}
.sn-c.use{border-color:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,.5)}
.sn-c.dim{opacity:.45}
.sn-pot{display:grid;justify-items:center;font:700 10.5px var(--round);color:var(--soft)}
.sn-pot b{font:900 20px/1.1 var(--round);color:#fde68a}
.sn-hn{flex:none;text-align:center;font:700 12px/1.3 var(--round);color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sn-hn b{color:#fff}.sn-hn .r{color:#fca5a5}
.sn-info{flex:none;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);min-height:2.7em;display:grid;place-items:center}
.sn-info b{color:#fde68a}.sn-info .g{color:#86efac}.sn-info .r{color:#fca5a5}
.sn-info.end{font:800 13px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:4px 8px}
.sn-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.sn-act{display:grid;gap:5px;flex:none}
.sn-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.sn-g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
.sn-g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:5px}
.sn-cats{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
.sn-nums{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
.sn-b{min-height:46px;border-radius:11px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:900 14px/1.15 var(--round);padding:2px 4px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sn-b small{display:block;font:700 10px var(--round);color:var(--soft)}
.sn-b:disabled{opacity:.35;cursor:default}
.sn-b.on{background:rgba(251,191,36,.28);border-color:#fbbf24}
.sn-b.fold{background:rgba(127,29,29,.55);border-color:rgba(248,113,113,.5)}
.sn-b.go{border:0;background:linear-gradient(#16a34a,#166534)}
.sn-b.go:disabled{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);opacity:1}
.sn-cats .sn-b{font:800 11px/1.15 var(--round);padding:0 1px;min-height:46px}
.sn-nums .sn-b{min-height:44px;font-size:17px}
.sn-lbl{display:flex;justify-content:space-between;gap:6px;font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.sn-lbl b{color:#fff;overflow:hidden;text-overflow:ellipsis}
.sn-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.sn-tut .sn-tbl,.sn-tut .sn-act{width:min(100%,330px)}
.sn-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.sn-tmsg b{color:#fde68a}
.sn-res{display:grid;gap:3px;font-size:12.5px;line-height:1.4}
@media (max-height:700px){.sn-c{width:28px;height:34px;font-size:17px;border-width:1.5px}.sn-b{min-height:44px}.sn-cats .sn-b{min-height:44px}.sn-info{min-height:1.5em;font-size:12px}.sn-row{padding:1px 5px;min-height:20px;border-width:1px}.sn-o{width:18px;height:18px;font-size:10px}.sn-n,.sn-t{line-height:1.1}.sn-tbl{gap:1px;padding:2px}.sn-act{gap:4px}.sn-mid{gap:8px}.sn-grp>i{font-size:9.5px;line-height:1}.sn-hn{font-size:11.5px}.sn-pot b{font-size:18px}}
@media (min-height:760px){.sn-c{width:38px;height:52px;font-size:22px}.sn-row{padding:4px 7px}.sn-b{min-height:50px}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };

  const card = (v, cls) => (v == null ? `<span class="sn-c back${cls ? " " + cls : ""}"></span>` : `<span class="sn-c${cls ? " " + cls : ""}" data-v="${v}">${v}</span>`);
  const mc = v => `<span class="sn-mc">${v}</span>`;
  const nmOf = (names, s, me) => (s === me ? "나" : (names && names[s]) || `${s + 1}번`);
  const seatNames = ctx => (ctx.seats || []).map((x, i) => (x && x.name) || `${i + 1}번`);
  const seatOrder = V => { const o = []; for (let i = 0; i < V.n; i++) o.push((V.first + i) % V.n); const live = o.filter(s => V.surv[s] < 0 && !V.out[s]); return live.concat(o.filter(s => V.surv[s] >= 0).sort((a, b) => V.surv[a] - V.surv[b]), o.filter(s => V.out[s])); };
  const actOf = a => (a.t === "fold" ? "포기" : a.t === "check" ? "체크" : a.t === "call" ? `콜 ${a.n}` : a.t === "raise" ? `레이즈 ${a.to}` : "");
  // 이번 라운드 행동 (마지막 것)
  function lastActs(V) {
    const out = {}; let i = -1;
    for (let k = V.log.length - 1; k >= 0; k--) if (V.log[k].k === "round" && V.log[k].r === V.round) { i = k; break; }
    if (i < 0) return out;
    for (let k = i + 1; k < V.log.length; k++) { const e = V.log[k]; if (e.k === "board") for (const x in out) delete out[x]; else if (e.k === "act" && e.a && e.a.t !== "snipe") out[e.s] = e.a; }
    return out;
  }
  const snTxt = x => (!x ? "" : x.pass ? "저격 안 함" : `🎯 ${hn(x.c, x.num)}`);
  // 내 지금 족보 (보이는 공유 카드 기준)
  const myHand = (V, me) => (me >= 0 && V.hands[me] ? K.best(V.hands[me].concat(V.board)) : null);
  const useIdx = (cards, h) => cards.map(v => h && h.use.includes(v));

  // 이 기기에서만: 고른 레이즈 · 저격 (장면이 바뀌면 지움)
  let SEL = { key: "" };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.phase}|${V.maxPut}|${V.ti}|${ctx.me}`; if (SEL.key !== key) SEL = { key, to: 0, c: -1, num: 0, sent: 0 }; return SEL; };

  function rowsHtml(V, me, names) {
    const show = V.phase === "show" && V.last, L = show ? V.last : null, acts = lastActs(V);
    let h = `<div class="sn-tbl">`, j = 0;
    for (const s of seatOrder(V)) {
      const isMe = s === me, gone = V.surv[s] >= 0 || V.out[s], live = !gone;
      const cur = !V.over && V.cur === s && (V.phase === "bet1" || V.phase === "bet2" || V.phase === "snipe" || V.phase === "gift");
      let ord, oc = "";
      if (V.surv[s] >= 0) { ord = "✓"; oc = " s"; } else if (V.out[s]) { ord = "✕"; oc = " x"; } else { ord = j === 0 ? "선" : String(j + 1); oc = j === 0 ? " f" : ""; j++; }
      let t = "", x = "", cls = "";
      if (V.surv[s] >= 0) t = `<span class="g">생존 ${V.surv[s] + 1}번째 (${V.survR[s]}R)</span>`;
      else if (V.out[s]) t = `<span class="r">탈락</span>`;
      else if (show) {
        const H = L.hands[s];
        if (L.put[s] > 0 && !V.inH[s] && !H) t = "포기";
        else if (H) { t = H.hit ? '<span class="r">저격됨</span>' : ""; x = `${mc(H.cards[0])}${mc(H.cards[1])}<b>${esc(hn(H.c, H.num))}</b>${H.hit ? '<span class="hit">🎯 저격당해 꼴찌</span>' : ""}`; }
        else t = L.fold && L.win.includes(s) ? '<span class="g">혼자 남음</span>' : "";
        if (L.win.includes(s)) { cls = " win"; x = x || ""; }
        if (L.gain[s]) x = (x || "") + `<span class="gain">+${L.gain[s]}</span>`;
        if (V.snipes[s]) t += `${t ? " · " : ""}${snTxt(V.snipes[s])}`;
      } else if (V.phase === "snipe" || V.phase === "gift") {
        t = !V.inH[s] ? "포기" : V.snipes[s] ? snTxt(V.snipes[s]) : cur ? '<span class="y">저격 고르는 중…</span>' : "저격 기다림";
      } else {
        const a = acts[s];
        t = !V.inH[s] ? "포기" : cur ? '<span class="y">고르는 중…</span>' : a ? actOf(a) : "";
      }
      if (live && !V.inH[s] && !show) cls += " fold";
      if (x) cls += " two";
      const put = live && V.put[s] > 0 && !V.over ? `걸음 ${V.put[s]}` : "";
      h += `<div class="sn-row${isMe ? " me" : ""}${cur ? " cur" : ""}${gone ? " gone" : ""}${cls}" data-s="${s}"><span class="sn-o${oc}">${ord}</span><span class="sn-n">${esc(nmOf(names, s, me))}</span><span class="sn-t">${t}</span><span class="sn-p">${put}</span><span class="sn-ch">${gone ? "" : V.chips[s]}</span>${x ? `<span class="sn-x">${x}</span>` : ""}</div>`;
    }
    return h + `</div>`;
  }

  function midHtml(V, me) {
    const mh = myHand(V, me), bd = [];
    for (let i = 0; i < 4; i++) bd.push(i < V.board.length ? card(V.board[i], mh && V.board.length && mh.use.includes(V.board[i]) ? "use" : "") : card(null));
    let h = `<div class="sn-mid"><div class="sn-grp"><i>공유 카드</i><div class="sn-cards">${bd.join("")}</div></div><div class="sn-pot">판돈<b>${V.phase === "show" && V.last ? V.last.pot : V.pot}</b>${V.over ? "" : `상한 ${V.cap}`}</div>`;
    if (me >= 0 && V.hands[me]) h += `<div class="sn-grp"><i>내 패</i><div class="sn-cards">${V.hands[me].map(v => card(v, (mh && mh.use.includes(v) ? "use" : "") + (!V.inH[me] ? " dim" : ""))).join("")}</div></div>`;
    return h + `</div>`;
  }

  function endLine(V, me, names) {
    const r = V.res; if (!r) return "";
    const out = r.out.map(s => nmOf(names, s, me));
    if (me >= 0) {
      if (V.out[me]) return `탈락… 끝까지 생존하지 못했어요`;
      if (V.surv[me] >= 0) return `🏆 생존 ${V.surv[me] + 1}번째 (${V.survR[me]}라운드)${out.length ? ` · 탈락 ${esc(out.join(" · "))}` : ""}`;
      return `${V.ranks[me] + 1}위 · 칩 ${V.chips[me]}개로 살아남음${out.length ? ` · 탈락 ${esc(out.join(" · "))}` : ""}`;
    }
    return out.length ? `탈락 ${esc(out.join(" · "))}` : "끝";
  }

  function showLine(V, me, names) {
    const L = V.last; if (!L) return "";
    const w = L.win.map(s => nmOf(names, s, me));
    if (L.fold) return `모두 포기 — <b>${esc(w.join(" · "))}</b> 판돈 ${L.pot}개`;
    const hs = Object.keys(L.hands).map(Number), hit = hs.filter(s => L.hands[s].hit);
    if (hs.length && hit.length === hs.length) return `모두 저격당했어요 — 판돈 ${L.pot}개를 나눠 가져요`;
    const H = L.hands[L.win[0]];
    const tag = w.length > 1 ? `무승부 — ${esc(w.join(" · "))} 나눠 가짐` : `🏆 <b>${esc(w[0])}</b> ${esc(hn(H.c, H.num))}로 판돈 <b>${L.pot}</b>개`;
    return tag + (hit.length ? ` · <span class="r">저격당함 ${esc(hit.map(s => nmOf(names, s, me)).join(" · "))}</span>` : "");
  }

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, S = selFor(V, ctx), names = seatNames(ctx);
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    const ph = V.phase;
    let h = rowsHtml(V, me, names) + midHtml(V, me);
    const mh = myHand(V, me);
    if (me >= 0 && mh && !over && V.surv[me] < 0) {
      const hitMe = V.snipes.some(x => x && !x.pass && x.c === mh.c && x.num === mh.num);
      h += `<div class="sn-hn">내 족보 <b>${esc(hn(mh.c, mh.num))}</b>${V.board.length < 4 ? " (공유 2장 기준)" : ""}${hitMe && V.inH[me] ? ' · <span class="r">저격당함!</span>' : ""} · 칩 ${V.chips[me]} → 생존 ${V.goal}</div>`;
    }
    let info = "", ic = "";
    const c = me >= 0 ? V.maxPut - V.put[me] : 0;
    if (over) { info = endLine(V, me, names); ic = me >= 0 && V.out[me] ? " end bad" : " end"; }
    else if (ph === "bet1" || ph === "bet2") {
      const st = ph === "bet1" ? "1차 베팅" : "2차 베팅";
      info = can ? `🎯 내 차례 · ${st} — ${c > 0 ? `콜하려면 <b>${c}</b>개` : "모두 맞춤 — 체크하거나 올려요"}` : `${st} — ${esc(nmOf(names, V.cur, me))} 차례…`;
    } else if (ph === "snipe") info = can ? "🎯 내 차례 — 저격할 <b>족보</b> + <b>가장 높은 숫자</b> (저격당하면 꼴찌)" : `저격 — ${esc(nmOf(names, V.cur, me))} 차례…`;
    else if (ph === "show") info = showLine(V, me, names);
    else if (ph === "gift") info = can ? `🎉 생존 확정! 남는 칩 <b>${V.gift.left}</b>개를 줄 사람을 골라요` : `${esc(nmOf(names, V.gift.s, me))} 생존 확정 — 남는 칩 ${V.gift.left}개를 나눠 주는 중…`;
    h += `<div class="sn-info${ic}"><span>${info}</span></div><div class="sn-act">`;
    if (can && (ph === "bet1" || ph === "bet2")) {
      const room = V.cap - V.maxPut, lo = V.maxPut + 1;
      if (room > 0) { if (!(S.to >= lo && S.to <= V.cap)) S.to = Math.min(V.cap, V.maxPut + Math.max(1, Math.round(V.pot / 2))); }
      h += `<div class="sn-g3"><button type="button" class="sn-b fold" data-b="fold">포기<small>걸은 ${V.put[me]}개 잃음</small></button>`
        + (c > 0 ? `<button type="button" class="sn-b" data-b="call">콜<small>${c}개 더</small></button>` : `<button type="button" class="sn-b" data-b="check">체크<small>0개</small></button>`)
        + (room > 0 ? `<button type="button" class="sn-b go" data-b="raise">레이즈<small>판에 총 ${S.to} (+${S.to - V.put[me]})</small></button>` : `<button type="button" class="sn-b" disabled>레이즈<small>상한 ${V.cap}</small></button>`) + `</div>`;
      if (room > 0) h += `<div class="sn-g4"><button type="button" class="sn-b" data-r="-1"${S.to <= lo ? " disabled" : ""}>−1</button><button type="button" class="sn-b" data-r="1"${S.to >= V.cap ? " disabled" : ""}>+1</button><button type="button" class="sn-b" data-r="pot">판돈<small>+${Math.max(1, Math.min(V.cap, V.maxPut + V.pot) - V.maxPut)}</small></button><button type="button" class="sn-b" data-r="max">최대<small>${V.cap}</small></button></div>`;
    } else if (can && ph === "snipe") {
      h += `<div class="sn-cats">${CAT2.map((t, i) => `<button type="button" class="sn-b${S.c === i ? " on" : ""}" data-c="${i}">${t}</button>`).join("")}</div>`;
      h += `<div class="sn-nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="sn-b${S.num === n ? " on" : ""}" data-n="${n}"${S.c === 4 && n < 5 ? " disabled" : ""}>${n}</button>`).join("")}</div>`;
      const ok = S.c >= 0 && S.num > 0 && K.validSnipe(S.c, S.num);
      h += `<div class="sn-g2"><button type="button" class="sn-b" data-s="pass">저격 안 함</button><button type="button" class="sn-b go" data-s="go"${ok ? "" : " disabled"}>${ok ? `🎯 ${esc(hn(S.c, S.num))} 저격` : S.c < 0 ? "족보를 골라요" : "숫자를 골라요"}</button></div>`;
    } else if (can && ph === "gift") {
      h += `<div class="sn-lbl"><span>남는 칩 ${V.gift.left}개 — 한 사람에게</span><b>${V.gift.ones.length ? `칩 0 이던 ${esc(V.gift.ones.map(s => nmOf(names, s, me)).join(" · "))}에게 1개씩 먼저 줬어요` : ""}</b></div>`;
      h += `<div class="sn-g3">${V.gift.to.map(s => `<button type="button" class="sn-b" data-to="${s}">${esc(nmOf(names, s, me))}<small>칩 ${V.chips[s]}</small></button>`).join("")}</div>`;
    }
    h += `</div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can || (S.sent && Date.now() - S.sent < 1200)) return;   // 두 번 탭 막기
      const t = e.target.closest("[data-b],[data-r],[data-c],[data-n],[data-s],[data-to]"); if (!t || t.disabled) return;
      const send = a => { S.sent = Date.now(); ctx.sfx("pop"); const r = ctx.act(a); if (r && r.ok === false) S.sent = 0; };
      const d = t.dataset;
      if (d.r !== undefined) {
        const lo = V.maxPut + 1;
        S.to = d.r === "max" ? V.cap : d.r === "pot" ? Math.min(V.cap, V.maxPut + Math.max(1, V.pot)) : Math.max(lo, Math.min(V.cap, S.to + +d.r));
        ctx.sfx("tap"); render(stage, V, ctx); return;
      }
      if (d.c !== undefined) { const i = +d.c; S.c = S.c === i ? -1 : i; if (S.c === 4 && S.num > 0 && S.num < 5) S.num = 0; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.n !== undefined) { const n = +d.n; S.num = S.num === n ? 0 : n; ctx.sfx("tap"); render(stage, V, ctx); return; }
      if (d.b === "fold") send({ t: "fold" });
      else if (d.b === "check") send({ t: "check" });
      else if (d.b === "call") send({ t: "call" });
      else if (d.b === "raise") send({ t: "raise", to: S.to });
      else if (d.s === "pass") send({ t: "snipe", pass: true });
      else if (d.s === "go" && S.c >= 0 && S.num > 0) send({ t: "snipe", c: S.c, num: S.num });
      else if (d.to !== undefined) send({ t: "gift", to: +d.to });
    };
  }

  // ── 행동 글 (V = 그 수 전 그 자리 보기, 없을 수 있음) ──
  function actText(a, V) {
    if (!a) return "";
    const s = V && typeof V.seat === "number" && V.seat >= 0 ? V.seat : -1;
    if (a.t === "fold") return "포기";
    if (a.t === "check") return "체크";
    if (a.t === "call") return V && s >= 0 ? `콜 (${V.maxPut - V.put[s]}개)` : "콜";
    if (a.t === "raise") return `레이즈 → 판에 총 ${a.to}개${V && s >= 0 ? ` (+${a.to - V.put[s]})` : ""}`;
    if (a.t === "snipe") return a.pass ? "저격 안 함" : `${hn(a.c, a.num)} 저격`;
    if (a.t === "gift") return `남는 칩을 ${a.to + 1}번 자리에게`;
    return "";
  }

  // ── 선생님 ──
  let CC = { key: "", r: null };
  function recOf(V, me) { const key = `${V.pub}|${me}|${JSON.stringify(V.hands[me])}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me) }; return CC.r; }
  function coach(V, me, since, names) {
    const n = V.n, watch = !(me >= 0 && me < n);
    if (watch) me = -1;
    const nm = s => esc(nmOf(names, s, me));
    const p = [];
    // 👀 상대 흐름
    const acts = lastActs(V), alive = seatOrder(V).filter(s => V.surv[s] < 0 && !V.out[s]), opp = alive.filter(s => s !== me);
    if (V.phase === "show" && V.last) p.push(`이번 판: ${showLine(V, me, names).replace(/<[^>]+>/g, "")}.`);
    else if (V.phase !== "gift") {
      const xs = opp.map(s => (!V.inH[s] ? `${nm(s)} 포기` : acts[s] ? `${nm(s)} ${actOf(acts[s])}` : "")).filter(Boolean);
      if (xs.length) p.push(`이번 라운드: ${xs.join(" · ")}.`);
      const rz = opp.filter(s => V.inH[s] && acts[s] && acts[s].t === "raise");
      if (rz.length) p.push(`${rz.map(nm).join(" · ")}: 레이즈 — 센 패일 때가 많아서 선생님은 그쪽 패를 세게 보고 계산해요.`);
      if (V.phase === "snipe") { const sn = V.ord.filter(s => V.snipes[s]).map(s => `${nm(s)} ${snTxt(V.snipes[s])}`); if (sn.length) p.push(`앞 저격: ${sn.join(" · ")}.`); }
    }
    if (V.board.length) {
      const bh = K.best(V.board);
      if (bh.c >= 1) p.push(`공유 카드만으로 ${hn(bh.c, bh.num)} — 이것보다 못한 사람은 모두 이 족보라 한 번의 저격에 여럿이 꼴찌가 될 수 있어요.`);
    }
    const live = alive;
    const near = live.filter(s => s !== me).map(s => [s, V.goal - V.chips[s]]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    if (near.length) p.push(`생존(${V.goal})까지: ${near.map(([s, d]) => `${nm(s)} ${d > 0 ? "+" + d : "도달"}`).join(" · ")}.`);
    if (watch) return { opp: p.join(" "), mine: `칩 ${live.map(s => `${nm(s)} ${V.chips[s]}`).join(" · ")}.`, rec: "구경 중이에요.", why: "" };
    // 📊 내 흐름
    let m;
    if (V.surv[me] >= 0) m = `생존 확정 (${V.surv[me] + 1}번째, ${V.survR[me]}라운드).`;
    else if (V.out[me]) m = "탈락했어요.";
    else {
      const rk = live.filter(s => V.chips[s] > V.chips[me]).length + 1;
      m = `칩 ${V.chips[me]}개 (남은 ${live.length}명 중 ${rk}위) · 생존까지 +${Math.max(0, V.goal - V.chips[me])} · 이번 라운드 ${V.put[me]}개 걸음.`;
      const mh = myHand(V, me);
      if (mh && V.inH[me] && !V.over && V.phase !== "show") m += ` 내 족보 ${hn(mh.c, mh.num)}${V.board.length < 4 ? " (공유 2장 기준, 2장 더 나와요)" : ""}.`;
    }
    // 💡 추천 · 👉 뜻 (고급 AI 의 계산)
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (!V.needs.includes(me)) rec = V.phase === "show" ? "결과를 보는 중이에요." : "내 차례가 되면 추천해 드려요.";
    else {
      const R = recOf(V, me);
      if (V.phase === "bet1" || V.phase === "bet2") {
        const a = R.a, read = Object.keys(lastActs(V)).some(s => +s !== me) ? "상대 베팅 반영 · " : "";
        rec = a.t === "fold" ? "포기." : a.t === "check" ? "체크." : a.t === "call" ? `콜 (${R.c}개).` : `레이즈 → 판에 총 ${a.to}개.`;
        m += ` 승률 ${pct(R.eq)} (${read}300번 굴려 봄 · ${R.opps + 1}명 중 공평 몫 ${pct(R.fair)}).`;
        if (a.t === "fold") why = `콜 ${R.c}개로 판돈 ${R.pot + R.c}개를 노리려면 승률 ${pct(R.need)}는 돼야 하는데 ${pct(R.eq)}예요 — 더 넣으면 손해.`;
        else if (a.t === "raise" && R.bl) why = `승률 ${pct(R.eq)}로 약하지만 가끔 올려서 패가 읽히지 않게 (블러프). 모두 포기하면 판돈 ${R.pot}개가 내 것.`;
        else if (a.t === "raise") why = `승률 ${pct(R.eq)} > 올릴 기준 ${pct(R.rT)} (공평 몫 ${pct(R.fair)} 보다 높음) — 이길 때 더 받게 판을 키워요.${R.c ? ` 콜만 해도 필요한 승률은 ${pct(R.need)}.` : ""}`;
        else if (a.t === "call") why = `승률 ${pct(R.eq)} ≥ 필요한 승률 ${pct(R.need)} (콜 ${R.c} ÷ 판돈 ${R.pot + R.c}, 사람 수 여유 포함) — 따라가요. 올릴 기준 ${pct(R.rT)} 에는 못 미쳐요.`;
        else why = `승률 ${pct(R.eq)} < 올릴 기준 ${pct(R.rT)} — 공짜로 다음을 봐요.`;
      } else if (V.phase === "snipe") {
        const rows = R.rows, b = rows[0], ps = rows.find(r => r.pass), top = rows.filter(r => !r.pass).slice(0, 3);
        rec = b.pass ? "저격 안 함." : `${hn(b.c, b.num)} 저격.`;
        const mh = myHand(V, me);
        const self = mh && !b.pass && b.c === mh.c && b.num === mh.num ? ` 내 족보와 같아요 — 더 센 같은 족보를 가진 상대를 막고 무승부를 노려요.` : "";
        why = `260번 굴려 본 이길 몫 — ${top.map(r => `${hn(r.c, r.num)} ${pct(r.w)} (상대가 이 족보일 확률 ${pct(r.f)})`).join(" · ")} · 저격 안 함 ${pct(ps.w)}. 판돈 ${V.pot}개.${self}`;
      } else if (V.phase === "gift") {
        const a = R.a; rec = `${nm(a.to)}에게 주기.`;
        why = `칩이 가장 적은 사람(${V.chips[a.to]}개)에게 — 내 순위는 이미 정해졌으니 탈락 위험이 가장 큰 사람을 도와요.`;
      }
    }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요", my, best };
    const f = x => (Math.round(x * 10) / 10).toFixed(1);
    const loss = Math.max(0, J.best.ev - J.my.ev);
    const sev = loss >= 8 ? 90 : loss >= 5 ? 75 : loss >= 3 ? 60 : loss >= 1.5 ? 40 : loss > 0.5 ? 20 : 5;
    let why;
    if (J.kind === "bet") {
      const r = [];
      if (myA.t === "fold" && bestA.t !== "fold") r.push(`승률 ${pct(J.eq)}면 판돈 ${J.pot}개에서 버티는 게 나아요`);
      if (myA.t !== "fold" && bestA.t === "fold") r.push(`승률 ${pct(J.eq)}로 칩 ${J.c}개를 더 넣으면 손해예요`);
      if (myA.t === "raise" && bestA.t !== "raise" && bestA.t !== "fold") r.push("승률이 올릴 만큼 높지 않아요");
      if (bestA.t === "raise" && myA.t !== "raise" && myA.t !== "fold") r.push("센 패는 올려서 판을 키워야 이길 때 더 받아요");
      why = loss <= 0.5 ? `고급 AI: ${best} — 승률 ${pct(J.eq)}${ja(pct(J.eq),"로")} 셈한 기대 칩이 거의 같아요 (${f(J.best.ev)} vs ${f(J.my.ev)})`
        : `고급 AI: ${best} — 승률 ${pct(J.eq)}${ja(pct(J.eq),"로")} 셈한 기대 칩 ${f(J.best.ev)} vs 내 수 ${f(J.my.ev)}${r.length ? " · " + r.join(" · ") : ""}`;
    } else {
      why = loss <= 0.5 ? `고급 AI: ${best} — 이길 몫이 거의 같아요 (${pct(J.best.w)} vs ${pct(J.my.w)})`
        : `고급 AI: ${best} — 굴려 본 이길 몫 ${pct(J.best.w)} vs 내 수 ${pct(J.my.w)} (판돈 ${J.pot}개)${!bestA.pass ? ` · 상대가 ${hn(bestA.c, bestA.num)}일 확률 ${pct(J.best.f)}` : ""}`;
    }
    return { sev, why, my, best };
  }

  function result(V, me, names) {
    const who = s => (s === me ? " 나" : names && names[s] ? ` ${esc(names[s])}` : "");
    const order = V.ranks.map((r, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const rows = order.map(s => `${V.ranks[s] + 1}위${who(s)} — ${V.surv[s] >= 0 ? `<b>생존 ${V.surv[s] + 1}번째</b> (${V.survR[s]}라운드)` : V.out[s] ? "<b>탈락</b>" : `칩 <b>${V.chips[s]}</b>개로 남음`}`);
    const big = V.hist.reduce((m, H) => (H.pot > m.pot ? H : m), { pot: 0 });
    return `<div class="sn-res"><div>${V.round}라운드 · 가장 큰 판돈 ${big.pot}개${big.r ? ` (${big.r}라운드)` : ""}</div>${rows.map(x => `<div>${x}</div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const tb = x => `<div class="sn-tut">${x}</div>`;
    const cards = (vs, use) => `<div class="sn-cards">${vs.map((v, i) => card(v, use && use[i] ? "use" : "")).join("")}</div>`;
    const grp = (lbl, x) => `<div class="sn-grp"><i>${lbl}</i>${x}</div>`;
    const fakeRow = (ord, nm, t, put, ch, x, cls) => `<div class="sn-row${x ? " two" : ""}${cls ? " " + cls : ""}"><span class="sn-o${ord === "선" ? " f" : ""}">${ord}</span><span class="sn-n">${nm}</span><span class="sn-t">${t}</span><span class="sn-p">${put}</span><span class="sn-ch">${ch}</span>${x ? `<span class="sn-x">${x}</span>` : ""}</div>`;
    // 직접 해 보기: 공유 7 7 3 9 · 내 패 9 2 (9 투페어) · 가가 크게 레이즈 → 7 트리플 저격
    const BD = [7, 7, 3, 9], MY = [9, 2], GOAL = { c: 3, num: 7 };
    return [
      { tag: "STEP 1 · 목표", title: "칩 75개 → 생존 확정", body: "각자 칩 <b>60개</b>로 시작해요. 칩이 <b>75개</b>가 되면 75개를 내고 <b>생존 확정</b>. 끝까지 생존하지 못한 사람이 <b>탈락</b>해요 (방송: 5명 중 1명).",
        boardHtml: tb(`<div class="sn-tbl">${fakeRow("✓", "가", '<span class="g">생존 1번째</span>', "", "")}${fakeRow("선", "나", "", "", "60")}${fakeRow("2", "다", "", "", "44")}</div>`), ms: 6000 },
      { tag: "STEP 2 · 준비물", title: "카드 1~10 네 벌 · 칩", body: "카드는 <b>1~10</b> 네 벌(40장). 라운드마다 모두 칩 <b>1개</b>를 기본으로 걸고, <b>개인 카드 2장</b>(나만 봄)을 받아요. 가운데에는 <b>공유 카드</b> 4장 — 먼저 2장, 나중에 2장을 펼쳐요.",
        boardHtml: tb(`<div class="sn-mid">${grp("공유 카드", `<div class="sn-cards">${card(4)}${card(8)}${card(null)}${card(null)}</div>`)}<div class="sn-pot">판돈<b>5</b></div>${grp("내 패", cards([8, 2]))}</div>`), ms: 6000 },
      { tag: "STEP 3 · 진행 ① 베팅", title: "1차 베팅 → 2장 → 2차 베팅", body: "공유 카드 2장을 보고 <b>1차 베팅</b>, 2장을 더 펼치고 <b>2차 베팅</b>. 차례대로 <b>체크 · 콜 · 레이즈 · 포기</b> — 모두 같은 칩을 걸면 끝. 한 라운드에 거는 칩은 <b>칩이 가장 적은 사람의 칩 수</b>까지예요.",
        boardHtml: tb(`<div class="sn-tbl">${fakeRow("선", "가", "레이즈 6", "걸음 6", "54")}${fakeRow("2", "나", "콜 5", "걸음 6", "54")}${fakeRow("3", "다", "포기", "걸음 1", "59", "", "fold")}</div>`), ms: 7000 },
      { tag: "STEP 4 · 진행 ② 족보", title: "공유 4 + 개인 2 → 가장 좋은 조합", body: "<b>포카드 &gt; 풀하우스 &gt; 스트레이트</b>(5장 연속) <b>&gt; 트리플 &gt; 투페어 &gt; 원페어 &gt; 하이카드</b>. 족보 이름은 <b>가장 높은 숫자 + 족보</b> (4·5·6·7·8 → 8 스트레이트, 7·7·5·5 → 7 투페어, 풀하우스는 트리플 숫자).",
        boardHtml: tb(`<div class="sn-mid">${grp("공유 카드", cards([7, 5, 7, 1], [1, 1, 1, 0]))}${grp("내 패", cards([5, 3], [1, 0]))}</div><div class="sn-hn">내 족보 <b>7 투페어</b> (7·7·5·5)</div>`), ms: 7000 },
      { tag: "STEP 5 · 직접", title: "저격 — 상대 족보를 맞혀요", body: "2차 베팅이 끝나면 개인 카드를 펼치기 전에 <b>선부터</b> 족보 하나를 <b>저격</b>해요. 저격당한 족보는 <b>꼴찌</b>! 가가 크게 레이즈했어요 — 공유 7 · 7이 있으니 <b>7 트리플</b>이 의심돼요. 저격해 봐요.",
        interactive: { hint: "👆 트리플 → 7 → 저격", doneText: "✅ 가의 7 트리플이 꼴찌 — 9 투페어로 판돈을 가져요" },
        render(stage, ctrl) {
          let c = -1, num = 0, done = false, msg = "가의 레이즈 — 7이 한 장 더 있을지도";
          const draw = () => {
            const ok = c >= 0 && num > 0 && K.validSnipe(c, num);
            const tc = done ? -1 : c !== GOAL.c ? GOAL.c : -1, tn = done || tc >= 0 ? -1 : num !== GOAL.num ? GOAL.num : -1, tg = !done && tc < 0 && tn < 0;
            stage.innerHTML = `<div class="sn-tut"><div class="sn-tbl">${fakeRow("선", "나", done ? "🎯 7 트리플" : '<span class="y">저격 고르는 중…</span>', "걸음 9", "50", "", "me cur")}${fakeRow("2", "가", done ? '<span class="r">저격됨</span> 7 트리플' : "레이즈 9", "걸음 9", "50", done ? `${mc(7)}${mc(5)}<b>7 트리플</b><span class="hit">🎯 저격당해 꼴찌</span>` : "")}</div>`
              + `<div class="sn-mid">${grp("공유 카드", cards(BD, [1, 1, 0, 1]))}<div class="sn-pot">판돈<b>18</b></div>${grp("내 패", cards(MY, [1, 0]))}</div><div class="sn-hn">내 족보 <b>9 투페어</b> (9·9·7·7)</div>`
              + `<div class="sn-act"><div class="sn-cats">${CAT2.map((t, i) => `<button type="button" class="sn-b${c === i ? " on" : ""}" data-c="${i}"${tc === i ? ' data-tp="1"' : ""}>${t}</button>`).join("")}</div>`
              + `<div class="sn-nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="sn-b${num === n ? " on" : ""}" data-n="${n}"${tn === n ? ' data-tp="1"' : ""}${c === 4 && n < 5 ? " disabled" : ""}>${n}</button>`).join("")}</div>`
              + `<button type="button" class="sn-b go" data-go="1"${ok && tg ? ' data-tp="1"' : ""}${ok && !done ? "" : " disabled"}>${ok ? `🎯 ${hn(c, num)} 저격` : "족보와 숫자를 골라요"}</button></div><div class="sn-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-c],[data-n],[data-go]"); if (!t || t.disabled) return;
            if (t.dataset.c !== undefined) { const i = +t.dataset.c; c = c === i ? -1 : i; ctrl.sfx("tap"); draw(); return; }
            if (t.dataset.n !== undefined) { const n = +t.dataset.n; num = num === n ? 0 : n; ctrl.sfx("tap"); draw(); return; }
            if (c === GOAL.c && num === GOAL.num) { done = true; ctrl.sfx("win"); msg = "🏆 <b>가의 7 트리플 저격!</b> 남은 내 9 투페어가 1등"; draw(); ctrl.complete(); return; }
            const name = hn(c, num);
            msg = c === 2 && num === 9 ? `<b>${name}</b>는 내 족보예요 — 내 것을 지우면 안 돼요` : `<b>${name}</b>${eul(name)} 저격했지만 가는 그 족보가 아니었어요 — <b>트리플 · 7</b>을 골라요`;
            ctrl.sfx("tap"); c = -1; num = 0; draw();
          };
          draw();
        } },
      { tag: "STEP 6 · 승패 · 특수", title: "저격당하면 꼴찌 · 75개면 생존", body: "가장 높은 족보가 <b>판돈</b>을 가져요. 같은 등급이면 족보 숫자 → <b>높은 개인 카드</b> → 다른 개인 카드, 완전히 같거나 모두 저격당하면 똑같이 나눠요. <b>75개</b>를 모은 사람은 생존 확정 — 남는 칩은 다른 사람에게 줘요 (칩 0 인 사람에게는 1개 이상). 🧑‍🏫 선생님은 상대 베팅까지 읽어 승률 · 저격을 숫자로 추천해요.",
        boardHtml: tb(`<div class="sn-tbl">${fakeRow("선", "나", "🎯 7 트리플", "", "68", `${mc(9)}${mc(2)}<b>9 투페어</b><span class="gain">+18</span>`, "win")}${fakeRow("2", "가", '<span class="r">저격됨</span>', "", "50", `${mc(7)}${mc(5)}<b>7 트리플</b><span class="hit">🎯 저격당해 꼴찌</span>`)}</div>`), ms: 7600 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.sniper = {
    name: "저격 홀덤", emoji: "🎯", short: "카드 1~10 홀덤 — 베팅하고, 펼치기 전에 상대 족보를 저격! 칩 75개면 생존", min: 3, max: 6, defN: 5, board: false,
    opts: [{ k: "chips", label: "시작 칩", items: [[60, "60개 (방송)"], [20, "20개 (짧게 · 생존 25)"]], def: 60 }],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 칩 <b>75개</b>를 모아 생존 확정 (75개를 냄) — 끝까지 생존하지 못한 사람이 탈락",
      "준비물: 카드 <b>1~10 네 벌</b>(40장) · 각자 칩 <b>60개</b> · 라운드마다 기본 베팅 <b>1개</b> → 개인 카드 <b>2장</b>(나만 봄)",
      "진행 ① 공유 카드 2장 → <b>1차 베팅</b> → 공유 카드 2장 더 → <b>2차 베팅</b> · 체크 · 콜 · 레이즈 · 포기, 모두 같은 칩이면 끝 · 한 라운드에 거는 칩은 <b>칩이 가장 적은 사람의 칩 수</b>까지",
      "진행 ② 족보 = 공유 4장 + 개인 2장의 가장 좋은 조합: <b>포카드 &gt; 풀하우스 &gt; 스트레이트</b>(5장 연속) <b>&gt; 트리플 &gt; 투페어 &gt; 원페어 &gt; 하이카드</b>",
      "진행 ③ <b>저격</b>: 개인 카드를 펼치기 전에 선부터 족보 하나를 선언 (가장 높은 숫자 + 족보, 풀하우스는 트리플 숫자 · 안 해도 됨) — 저격당한 족보는 <b>꼴찌</b>",
      "승패: 가장 높은 족보가 판돈을 가짐 · 같은 등급이면 족보에 쓴 숫자(투페어 · 풀하우스는 둘째 숫자까지) → 높은 개인 카드 → 다른 개인 카드 · 완전히 같거나 모두 저격당하면 똑같이 나눔 (남는 칩은 베팅 순서가 빠른 사람부터 1개씩)",
      "특수: 칩이 <b>75개</b> 이상이면 75개를 내고 생존 확정 → 남는 칩은 다른 사람에게 (칩 0 인 사람에게는 1개 이상)",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}라운드 · ${{ bet1: "1차 베팅", bet2: "2차 베팅", snipe: "저격", show: "공개", gift: "칩 나눠 주기" }[V.phase] || ""}`),
    chip: (V, i) => ({ t: V.surv[i] >= 0 ? "생존" : V.out[i] ? "탈락" : `${V.chips[i]}개`, on: V.needs.includes(i) && !V.over, out: !!V.out[i] }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

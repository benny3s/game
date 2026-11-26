/* 베니 서바이벌 · 메인 컬러 — 화면 (카드 8장 · 메인 컬러 비밀 투표 · 카드 제출 · 가장 많이 낸 사람 0점 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.maincolor;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 피의 게임 시즌 2 · 9일차 메인 매치 (7명) · 규칙 확인: 나무위키 피의 게임2/9일차 문서 (룰 · 각주 · 5라운드 기록, 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "3~7명 (방송 7명) · 카드 8장은 한 장마다 검정 · 하양 · 회색이 같은 확률 (방송은 덱 구성 비공개) · 투표 뒤 색별 득표 수는 공개 (누가 무엇을 골랐는지는 비공개) · 제출은 모두 정한 뒤 한꺼번에 공개 · 가장 많이 낸 사람이 여럿이면 모두 0점 · 총점이 같으면 공동 순위 · 짧게 3라운드 옵션 · 피 · 개인자금 아이템 (추가 투표 · 색 바꾸기) · 협상은 없음 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const CN = ["검정", "하양", "회색"], CE = ["⚫", "⚪", "🔘"];
  const CSS = `
.mc-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.mc-rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.mc-main{flex:1 1 150px;min-width:0;display:flex;gap:5px;align-items:center;justify-content:flex-end;font:800 12.5px var(--round);color:var(--soft)}
.mc-chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 9px;border:2px solid rgba(255,255,255,.3);font:900 13px var(--round);white-space:nowrap}
.mc-chip.c0{background:#111827;color:#fff}.mc-chip.c1{background:#f8fafc;color:#111827}.mc-chip.c2{background:#94a3b8;color:#111827}
.mc-hand{display:flex;gap:8px;justify-content:center;flex:none}
.mc-st{display:grid;justify-items:center;gap:3px;min-width:0;flex:1 1 0}
.mc-card{position:relative;width:min(100%,68px);aspect-ratio:3/4;border-radius:10px;border:3px solid;display:grid;place-items:center;font:900 26px var(--round)}
.mc-card.c0{background:#111827;border-color:#cbd5e1;color:#fff}.mc-card.c1{background:#f8fafc;border-color:#64748b;color:#111827}.mc-card.c2{background:#94a3b8;border-color:#e2e8f0;color:#111827}
.mc-card small{position:absolute;bottom:2px;right:5px;font:800 10px var(--round);opacity:.8}
.mc-card.dim{opacity:.28}
.mc-nm{font:800 12px var(--round);color:var(--soft)}
.mc-vote{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;flex:none}
.mc-vote button{border-radius:14px;padding:12px 4px;border:3px solid;font:900 16px var(--round);min-height:54px}
.mc-vote button.c0{background:#111827;border-color:#cbd5e1;color:#fff}.mc-vote button.c1{background:#f8fafc;border-color:#64748b;color:#111827}.mc-vote button.c2{background:#94a3b8;border-color:#e2e8f0;color:#111827}
.mc-vote button.on{outline:4px solid #fde68a;outline-offset:1px}
.mc-step{display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:7px;border-radius:12px;padding:5px 8px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.1);font:800 13px var(--round)}
.mc-step .sw{width:26px;height:34px;border-radius:6px;border:2px solid}
.mc-step .sw.c0{background:#111827;border-color:#cbd5e1}.mc-step .sw.c1{background:#f8fafc;border-color:#64748b}.mc-step .sw.c2{background:#94a3b8;border-color:#e2e8f0}.mc-step .sw.cp{background:linear-gradient(90deg,#111827 50%,#f8fafc 50%);border-color:#94a3b8}
.mc-step button{width:44px;height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:900 20px var(--round)}
.mc-step button:disabled{opacity:.3}
.mc-step b{min-width:34px;text-align:center;font-size:18px;color:#fde68a}
.mc-step small{color:var(--soft);font-size:11px;line-height:1.2}
.mc-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.mc-acts .note{text-align:center;font-size:12px;color:var(--soft);line-height:1.35}
.mc-acts .btn{padding:12px 8px;font-size:15px}
.mc-row2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mc-sum{text-align:center;font:800 13px var(--round);color:#fde68a}
.mc-show{display:grid;gap:3px;font-size:12.5px}
.mc-show .r{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center;padding:4px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.mc-show .r.zero{border-color:#f87171;background:rgba(127,29,29,.22)}
.mc-show .r b{font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mc-show .r .g{font:900 14px var(--round);color:#4ade80;min-width:30px;text-align:right}.mc-show .r.zero .g{color:#f87171}
.mc-show .r .x{color:var(--soft);font-size:12px;white-space:nowrap}
.mc-hist{display:flex;gap:4px;flex-wrap:wrap;align-items:center;font:700 11px var(--round);color:var(--soft)}
.mc-res{display:grid;gap:3px;font-size:12.5px}
.mc-tut{display:grid;gap:8px;justify-items:center;width:100%}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const chip = c => `<span class="mc-chip c${c}">${CE[c]} ${CN[c]}</span>`;
  const mainText = M => M.map(c => CN[c]).join(" · ");
  const sel = { key: "", b: 0, w: 0, g: 0, p: 0 };
  const cardHtml = (c, n, o = "") => `<div class="mc-st"><div class="mc-card c${c}${n ? "" : " dim"}${o}">${n}<small>${CN[c]}</small></div></div>`;
  const subText = r => { const o = []; if (r.b) o.push(`⚫${r.b}`); if (r.w) o.push(`⚪${r.w}`); if (r.g) o.push(`🔘${r.g}`); if (r.p) o.push(`⚫⚪${r.p}짝`); return o.join(" ") || "0장"; };

  function histHtml(V) {
    if (!V.hist.length) return "";
    return `<span class="mc-hist" style="flex:1 1 100%">지난 메인 컬러 ${V.hist.map((h, i) => `<span class="mc-chip c${h.main[0]}" title="${i + 1}라운드">${h.main.map(c => CE[c]).join("")}</span>`).join("")}</span>`;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, nm = i => nameOf(ctx, i), watch = me < 0;
    const key = `${V.round}|${V.phase}|${me}`; if (sel.key !== key) { sel.key = key; sel.b = sel.w = sel.g = sel.p = 0; }
    const can = ctx.canAct && !watch && !V.over;
    let h = `<div class="mc-top"><span class="mc-rd">${V.round}/${V.rounds} 라운드</span><span class="mc-main">${V.main.length ? `메인 컬러 ${V.main.map(c => `<span class="mc-chip c${c}">${CE[c]} ${CN[c]} ${V.tally ? V.tally[c] + "표" : ""}</span>`).join("")}` : "메인 컬러 투표 중"}</span>${V.hist.length && V.phase === "vote" ? histHtml(V) : ""}</div>`;
    if (!watch && V.hand.length) h += `<div class="mc-hand">${V.hand.map((n, c) => cardHtml(c, n, V.phase === "sub" && !V.main.includes(c) && !(c < 2 && V.main.includes(2)) ? " dim" : "")).join("")}</div><div class="mc-nm" style="text-align:center">내 카드 ${K.CARDS}장</div>`;
    else if (watch) h += `<div class="mc-nm" style="text-align:center">구경 중 — 손패 · 투표는 숨겨져 있어요</div>`;
    let acts = "";
    if (V.phase === "show" || V.over) {
      const R = V.res; if (R) acts = `<div class="mc-show">${R.rows.slice().sort((a, b) => b.got - a.got || a.s - b.s).map(r => `<div class="r${r.zero ? " zero" : ""}"><b>${r.s === me ? "나" : esc(nm(r.s))}</b><span class="x">${subText(r)} · ${r.phys}장${r.zero ? " · 🚫 가장 많이 냄" : ""}</span><span class="g">${r.got ? "+" + r.got : "0"}</span></div>`).join("")}</div>`;
    } else if (watch) acts = `<div class="note">${V.needs.length ? V.needs.map(i => esc(nm(i))).join(" · ") + (V.phase === "vote" ? " 투표 중…" : " 카드 고르는 중…") : ""}</div>`;
    else if (V.phase === "vote") {
      if (V.myVote != null) acts = `<div class="note">${CN[V.myVote]}에 투표했어요 · 다른 사람을 기다려요 (${V.voted.filter(Boolean).length}/${V.n})</div>`;
      else if (can) acts = `<div class="note">어느 색을 <b>메인 컬러</b>로 할까요? 가장 많은 표를 받은 색이 정해져요 (같으면 모두)</div><div class="mc-vote">${[0, 1, 2].map(c => `<button class="c${c}" data-vote="${c}">${CE[c]} ${CN[c]}</button>`).join("")}</div>`;
    } else if (V.phase === "sub") {
      if (V.mySub) acts = `<div class="note">카드를 냈어요 · 다른 사람을 기다려요 (${V.subbed.filter(Boolean).length}/${V.n})</div>`;
      else if (can) {
        const M = V.main, H = V.hand, rows = [];
        if (M.includes(0)) rows.push(["b", 0, H[0] - sel.p]); if (M.includes(1)) rows.push(["w", 1, H[1] - sel.p]); if (M.includes(2)) rows.push(["g", 2, H[2]]);
        const pairMax = M.includes(2) ? Math.min(H[0] - sel.b, H[1] - sel.w) : 0;
        const phys = sel.b + sel.w + sel.g + 2 * sel.p, pts = K.ptsOf(sel, M);
        acts = `<div class="mc-acts" style="margin:0">${rows.map(([k, c, mx]) => stepHtml(k, `c${c}`, `${CN[c]} 카드`, sel[k], mx, `${H[c]}장 중`)).join("")}${M.includes(2) ? stepHtml("p", "cp", "검정+하양 짝", sel.p, pairMax, "회색 1장으로 침 (2장 씀)") : ""}</div>
          <div class="mc-sum">낼 카드 ${phys}장 → 점수 ${pts}${phys ? " · 가장 많이 내면 0점!" : ""}</div>
          <div class="mc-row2"><button class="btn" data-a="all">낼 수 있는 만큼</button><button class="btn primary" data-a="sub">카드 내기</button></div>`;
      }
    }
    h += `<div class="mc-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const v = e.target.closest("[data-vote]");
      if (v && can && V.phase === "vote" && V.myVote == null) { ctx.sfx("pop"); ctx.act({ t: "vote", c: +v.dataset.vote }); return; }
      const st = e.target.closest("[data-k]");
      if (st && can && !st.disabled) {
        ctx.sfx("tap"); const k = st.dataset.k, d = +st.dataset.d, H = V.hand;
        const lim = { b: H[0] - sel.p, w: H[1] - sel.p, g: H[2], p: Math.min(H[0] - sel.b, H[1] - sel.w) };
        sel[k] = Math.max(0, Math.min(lim[k], sel[k] + d));
        if (sel.b + sel.p > H[0]) sel.b = H[0] - sel.p; if (sel.w + sel.p > H[1]) sel.w = H[1] - sel.p;
        render(stage, V, ctx); return;
      }
      const b = e.target.closest("[data-a]"); if (!b || !can) return;
      if (b.dataset.a === "all") { ctx.sfx("tap"); const M = V.main, H = V.hand; sel.b = M.includes(0) ? H[0] : 0; sel.w = M.includes(1) ? H[1] : 0; sel.g = M.includes(2) ? H[2] : 0; sel.p = 0; render(stage, V, ctx); return; }
      if (b.dataset.a === "sub") { ctx.sfx("pop"); ctx.act({ t: "sub", b: sel.b, w: sel.w, g: sel.g, p: sel.p }); }
    };
  }
  function stepHtml(k, cls, label, n, max, sub) {
    return `<div class="mc-step"><span class="sw ${cls}"></span><span>${label}<br><small>${sub}</small></span><button data-k="${k}" data-d="-1" ${n <= 0 ? "disabled" : ""}>−</button><b>${n}</b><button data-k="${k}" data-d="1" ${n >= max ? "disabled" : ""}>＋</button></div>`;
  }

  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) return { opp: "판이 끝났어요.", mine: `내 점수 ${V.score[me]} · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    // 👀 지난 라운드들에서 상대들이 한 일 (공개된 것만)
    const H = V.hist; let opp;
    if (!H.length) opp = "첫 라운드예요 — 남의 습관은 아직 몰라요. 모두 낼 수 있는 만큼 낸다면 가장 많이 가진 사람이 0점이 돼요.";
    else {
      const avg = Array(V.n).fill(0), zeros = Array(V.n).fill(0);
      for (const h of H) for (const r of h.rows) { avg[r.s] += r.phys / H.length; if (r.zero) zeros[r.s]++; }
      const last = H[H.length - 1];
      const z = last.rows.filter(r => r.zero && r.phys > 0).map(r => r.s === me ? "나" : nm(r.s));
      opp = `지난 ${last.main.map(c => CN[c]).join("·")} 라운드: ${z.length ? z.join(", ") + " 가 가장 많이 내서 0점" : "아무도 안 냄"} · 평균 낸 장수 ${avg.map((a, s) => (s === me ? null : `${nm(s)} ${a.toFixed(1)}`)).filter(Boolean).slice(0, 4).join(" · ")}`;
    }
    const lead = Math.max(...V.score);
    const mine = `${V.round}/${V.rounds} 라운드 · 내 점수 ${V.score[me]} (1위 ${lead}${V.score[me] === lead ? " = 나" : ` · ${lead - V.score[me]}점 차`})${V.hand.length ? ` · 손패 ⚫${V.hand[0]} ⚪${V.hand[1]} 🔘${V.hand[2]}` : ""}${V.main.length ? ` · 메인 컬러 ${mainText(V.main)}` : ""}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me)) {
      const R = K.recommend(V, me);
      if (R && V.phase === "vote") {
        const c = R.a.c, o = R.vote.map((x, i) => `${CN[i]} ${x.toFixed(1)}`).join(" · ");
        rec = `${CN[c]}에 투표`; why = `각 색이 메인 컬러가 될 때 내 기대 점수: ${o}. 내 손패(⚫${V.hand[0]} ⚪${V.hand[1]} 🔘${V.hand[2]})로 점수는 쌓되 가장 많이 내서 0점이 되지 않을 색이 좋아요.`;
      } else if (R && V.phase === "sub") {
        const a = R.a, J = K.judge(V, me, a, a), ph = K.physOf(a), pts = K.ptsOf(a, V.main);
        rec = ph ? `${subText(a)} (${ph}장) 내기` : "카드를 내지 않기";
        why = `상대 중 가장 많이 낼 장수는 평균 약 ${R.oppMax.toFixed(1)}장으로 봐요. ${ph}장을 내면 점수 ${pts}, 내가 가장 많이 내서 0점이 될 확률 ${pc(J.myTop)} → 기대 점수 ${J.my.toFixed(1)}.${ph < R.best.phys ? "" : ""}`;
      }
    } else if (V.phase === "show") { rec = "결과를 보고 다음 라운드를 준비해요"; why = "가장 많이 낸 사람은 0점 — 내가 낸 장수 · 상대가 낸 장수를 기억해 두세요."; }
    return { opp, mine, rec, why };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    const zeros = Array(V.n).fill(0); for (const h of V.hist) for (const r of h.rows) if (r.zero && r.phys > 0) zeros[r.s]++;
    return `<div class="mc-res"><div>${V.rounds}라운드 · 메인 컬러 ${V.hist.map(h => h.main.map(c => CN[c]).join("+")).join(" → ")}</div>${order.map(s => `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${V.score[s]}점</b> · 0점 맞은 라운드 ${zeros[s]}번</div>`).join("")}</div>`;
  }
  const actText = (a, V) => {
    if (!a) return "—";
    if (a.t === "vote") return `${CN[a.c]}에 투표`;
    return `${subText(a)} 내기 (${K.physOf(a)}장)`;
  };
  function review(V, seat, myA, bestA) {
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    const d = J.best - J.my || 0, o = J.kind === "vote" ? 0 : 0; void o;
    if (J.kind === "vote") return { sev: Math.max(0, Math.min(100, Math.round((J.best - J.my) * 25))), why: `${CN[myA.c]} 투표 기대 점수 ${J.my.toFixed(1)} / 추천 ${CN[bestA.c]} ${J.best.toFixed(1)}` };
    return { sev: Math.max(0, Math.min(100, Math.round(d * 25))), why: `내 ${J.myPhys}장: 0점 맞을 확률 ${pc(J.myTop)} · 기대 ${J.my.toFixed(1)}점 / 추천 ${J.bestPhys}장: 0점 확률 ${pc(J.bestTop)} · 기대 ${J.best.toFixed(1)}점` };
  }

  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 목표", title: "5라운드 점수를 모아요", body: "라운드마다 <b>검정 · 하양 · 회색</b> 카드 <b>8장</b>을 무작위로 받아요 (나만 봐요). 5라운드 점수의 합이 가장 높은 사람이 이겨요.",
        boardHtml: `<div class="mc-tut"><div class="mc-hand" style="width:100%">${cardHtml(0, 3)}${cardHtml(1, 2)}${cardHtml(2, 3)}</div></div>`, ms: 6000 },
      { tag: "STEP 2 · 투표", title: "메인 컬러를 비밀로 투표", body: "모두가 <b>비밀로 색 하나</b>에 투표해요. 가장 많은 표를 받은 색이 <b>메인 컬러</b> — 표가 같으면 <b>같은 표를 받은 색 모두</b>가 메인 컬러예요.",
        boardHtml: `<div class="mc-tut"><div class="mc-hist" style="justify-content:center"><span class="mc-chip c2">🔘 회색 4표</span><span class="mc-chip c0">⚫ 검정 2표</span><span class="mc-chip c1">⚪ 하양 1표</span></div><small>→ 메인 컬러 = 회색</small></div>`, ms: 6400 },
      { tag: "STEP 3 · 제출", title: "메인 컬러 카드가 1장 1점", body: "메인 컬러 카드를 골라 내요. <b>1장당 1점</b>. 회색이 메인이면 <b>검정 1장 + 하양 1장</b>을 짝지어 회색 1장(1점)으로 칠 수도 있어요 (카드는 2장 써요).",
        boardHtml: `<div class="mc-tut"><div class="mc-show" style="width:100%"><div class="r"><b>나</b><span class="x">🔘3 ⚫⚪1짝 · 5장</span><span class="g">+4</span></div></div></div>`, ms: 6600 },
      { tag: "STEP 4 · 0점", title: "가장 많이 내면 0점!", body: "카드를 낸 뒤 <b>남은 카드가 가장 적은 사람</b> — 즉 가장 많이 낸 사람은 그 라운드 <b>0점</b>이에요 (같은 사람이 여럿이면 모두). 많이 내고 싶지만 너무 많이 내면 안 돼요!",
        boardHtml: `<div class="mc-tut"><div class="mc-show" style="width:100%"><div class="r zero"><b>AI1</b><span class="x">🔘5 · 🚫 가장 많이 냄</span><span class="g">0</span></div><div class="r"><b>나</b><span class="x">🔘3</span><span class="g">+3</span></div></div></div>`, ms: 6800 },
      { tag: "STEP 5 · 직접", title: "몇 장을 낼까요?", body: "메인 컬러는 회색, 나는 회색 5장을 갖고 있어요. 다른 두 사람은 각각 <b>4장 · 2장</b>을 냈다고 해요. <b>0점을 피하는 가장 높은 점수</b>는 몇 장일까요?",
        interactive: { hint: "👆 장수 버튼을 눌러 보세요 (4장이면 같은 장수라 모두 0점!)", doneText: "✅ 3장 → 가장 많이 내지 않아 +3점!" },
        render(stage, ctrl) {
          let n = null;
          const draw = () => {
            const res = n == null ? "" : n > 4 ? `🚫 ${n}장 — 가장 많이 냈어요 → 0점` : n === 4 ? "🚫 4장 — AI 와 같은 장수라 둘 다 0점" : `+${n}점`;
            stage.innerHTML = `<div class="mc-tut"><div class="mc-show" style="width:100%"><div class="r"><b>AI1</b><span class="x">🔘4</span><span class="g">?</span></div><div class="r"><b>AI2</b><span class="x">🔘2</span><span class="g">?</span></div></div>
              <div class="mc-hand" style="width:100%">${cardHtml(2, 5)}</div><div class="mc-vote" style="grid-template-columns:repeat(5,1fr);width:100%">${[1, 2, 3, 4, 5].map(k => `<button class="c2${n === k ? " on" : ""}" data-n="${k}">${k}</button>`).join("")}</div><b style="font-size:14px;color:#fde68a;min-height:20px">${res}</b></div>`;
            if (n === 3) ctrl.complete();
          };
          stage.onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; ctrl.sfx("tap"); n = +b.dataset.n; draw(); };
          draw();
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.maincolor = {
    name: "메인 컬러", emoji: "🎨", short: "메인 컬러에 투표하고, 가장 많이 내지 않게 카드를 내요", min: 3, max: 7, defN: 5, board: false, src: SRC, diff: DIFF,
    opts: [{ k: "rounds", label: "라운드", items: [[5, "5라운드 (방송 그대로)"], [3, "3라운드 (빠르게)"]], def: 5 }],
    howto: [
      "방송: 라운드마다 검정 · 하양 · 회색 카드 <b>8장</b>을 무작위로 받아요 (5라운드)",
      "모두 <b>비밀로 색 하나에 투표</b> — 가장 많은 표를 받은 색이 <b>메인 컬러</b> (동점이면 모두)",
      "메인 컬러 카드를 내요 · <b>1장당 1점</b> · 회색이 메인이면 검정 + 하양 짝도 회색 1장으로 쳐요",
      "남은 카드가 가장 적은 사람 = <b>가장 많이 낸 사람은 그 라운드 0점</b> (여럿이면 모두)",
      "5라운드 점수 합계 1등이 승리",
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds} 라운드 · ${V.phase === "vote" ? "메인 컬러 투표" : V.phase === "sub" ? "카드 내기" : "결과"}`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

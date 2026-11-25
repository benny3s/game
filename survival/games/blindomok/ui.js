/* 베니 서바이벌 · 블라인드 오목 — 화면 (19줄 판 · 색만 보이는 돌 · 색 고르기 · 고스트 돌 → 두기 · 선생님 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const K = window.SVCores.blindomok;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const COLS = K.COLS, NC = K.NC;
  const HEX = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#2563eb", "#a855f7"];
  const SRC = "방송: 데블스 플랜 (시즌 1) · 6일차 비밀의 방 (1명 vs NPC)";
  const DIFF = "1:1 사람끼리도 (방송은 플레이어 vs NPC) · 첫 판 흑은 무작위, 다음 판은 번갈아 (방송은 플레이어가 흑) · 5개 이상 한 줄이면 승리 (장목 인정 · 33 금지 없음) · 5목은 심판이 바로 알려 줌 · 판이 다 차면 무승부 · 피스 걸기 없음 · 판 수 (3판 2선승) · 판 크기 (15줄) · '흑백 보기' 연습은 옵션 · 색은 방송 규칙 화면의 7가지";
  const CSS = `
.bo-st{flex:none;min-height:38px;display:grid;place-items:center;text-align:center;font-size:12.5px;line-height:1.35;color:var(--soft);padding:0 2px}
.bo-st b{color:#fde68a}
.bo-st .cd{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
.bo-res{border-radius:12px;padding:4px 10px;font:800 13.5px/1.35 var(--round)}
.bo-res.ok{color:#bbf7d0;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.5)}
.bo-res.no{color:#fecaca;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.5)}
.bo-res.mid{color:#e2e8f0;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.45)}
.bo-res small{display:block;font:700 11px var(--round);color:var(--soft)}
.bo-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center}
.bo-board{position:relative;width:min(100%,380px);aspect-ratio:1;border-radius:12px;background:radial-gradient(circle at 50% 40%,#0f2f52,#06172a 75%);box-shadow:inset 0 0 0 2px rgba(56,189,248,.75),0 0 16px rgba(56,189,248,.3);overflow:hidden}
.bo-board svg{display:block;width:100%;height:100%;touch-action:manipulation}
.bo-board .gl{stroke:rgba(56,189,248,.62);stroke-width:.45}
.bo-board .hp{fill:rgba(125,211,252,.85)}
.bo-board .hit{fill:transparent;cursor:pointer}
.bo-act{flex:none;display:grid;gap:6px}
.bo-pal{display:flex;gap:4px}
.bo-pal button{flex:1;min-width:0;height:44px;border-radius:12px;border:2px solid rgba(0,0,0,.35);cursor:pointer;padding:0;box-shadow:inset 0 -4px 0 rgba(0,0,0,.22)}
.bo-pal button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.5),inset 0 -4px 0 rgba(0,0,0,.22)}
.bo-row{display:flex;gap:6px}
.bo-row button{flex:1;min-width:0;height:48px;border-radius:13px;border:0;background:linear-gradient(#4ade80,#16a34a);color:#052e16;font:900 15px var(--round);cursor:pointer;padding:0 6px}
.bo-row button:disabled{opacity:.35;cursor:default}
.bo-fix{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:48px;padding:0 12px;border-radius:13px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font:800 12.5px var(--round);color:var(--soft);white-space:nowrap}
.bo-fix i{width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
.bo-tut{display:grid;gap:8px;justify-items:center;width:100%;font-size:13px}
.bo-tut .bo-board{width:min(100%,250px)}
.bo-tmsg{min-height:2.6em;text-align:center;line-height:1.4;color:var(--soft)}
.bo-tmsg b{color:#fde68a}
.bo-sw{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.bo-sw i{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25),0 0 0 1px rgba(0,0,0,.35)}
@media (max-height:650px){.bo-row button{height:46px}.bo-pal button{height:44px}.bo-st{min-height:34px;font-size:12px}}
.sv-coachfit .bo-st{min-height:30px;font-size:11.5px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const hasFinal = w => { const s = String(w || ""), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return /[013678]$/.test(s); };
  const iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const nameOf = (ctx, i) => (ctx && ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  const CN = (V, p) => K.cellName((V && V.N) || 19, p);
  const sideOf = (V, s) => (s === V.black ? "흑" : "백");

  // ── 행동 글 ──
  function actText(a, V) {
    if (!a || a.t !== "put") return "";
    const N = a.N || (V && V.N) || 19;
    return `${K.cellName(N, a.p)}에 ${COLS[a.c] || "같은 색"}`;
  }

  // ── 판 그리기 ── o: { pick, sel, selC, reveal, last, line, tp }
  function boardHtml(V, o) {
    o = o || {};
    const N = V.N, U = 10, M = 7, SZ = M * 2 + (N - 1) * U;
    const X = i => M + (i % N) * U, Y = i => M + Math.floor(i / N) * U;
    let h = "";
    for (let k = 0; k < N; k++) {
      const z = M + k * U;
      h += `<line class="gl" x1="${M}" y1="${z}" x2="${SZ - M}" y2="${z}"/><line class="gl" x1="${z}" y1="${M}" x2="${z}" y2="${SZ - M}"/>`;
    }
    const st = N === 19 ? [3, 9, 15] : N === 15 ? [3, 7, 11] : [2, Math.floor(N / 2), N - 3];
    for (const r of st) for (const c of st) h += `<circle class="hp" cx="${M + c * U}" cy="${M + r * U}" r="1.1"/>`;
    for (let i = 0; i < N * N; i++) {
      const c = V.col[i]; if (c < 0) continue;
      const x = X(i), y = Y(i);
      h += `<circle class="sn" data-i="${i}" cx="${x}" cy="${y}" r="4.45" fill="${HEX[c]}" stroke="rgba(0,0,0,.55)" stroke-width=".55"/><circle cx="${x - 1.3}" cy="${y - 1.5}" r="1.4" fill="rgba(255,255,255,.32)"/>`;
      if (o.reveal) { const b = V.own[i] === V.black; h += `<circle class="rv" data-i="${i}" cx="${x}" cy="${y}" r="1.85" fill="${b ? "#000" : "#fff"}" stroke="${b ? "#fff" : "#000"}" stroke-width=".35"/>`; }
    }
    if (o.last && o.last.p >= 0 && V.col[o.last.p] >= 0) h += `<circle class="lm" cx="${X(o.last.p)}" cy="${Y(o.last.p)}" r="5.6" fill="none" stroke="#fff" stroke-width=".8"/>`;
    if (o.line && o.line.length) { const a = o.line[0], b = o.line[o.line.length - 1]; h += `<line class="wl" x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>`; }
    if (o.sel != null && o.sel >= 0) {
      const x = X(o.sel), y = Y(o.sel);
      h += `<circle class="gh" data-i="${o.sel}" cx="${x}" cy="${y}" r="4.45" fill="${HEX[o.selC] || "#fff"}" opacity=".6" stroke="#fff" stroke-width=".7" stroke-dasharray="1.6 1"/><line x1="${x}" y1="${M}" x2="${x}" y2="${SZ - M}" stroke="rgba(253,230,138,.35)" stroke-width=".5"/><line x1="${M}" y1="${y}" x2="${SZ - M}" y2="${y}" stroke="rgba(253,230,138,.35)" stroke-width=".5"/>`;
    }
    if (o.pick) for (let i = 0; i < N * N; i++) if (V.col[i] < 0) h += `<rect class="hit" x="${X(i) - U / 2}" y="${Y(i) - U / 2}" width="${U}" height="${U}" data-p="${i}"${o.tp === i ? ' data-tp="1"' : ""}><title>${CN(V, i)}</title></rect>`;
    return `<div class="bo-board" aria-label="블라인드 오목 판 ${N}줄"><svg viewBox="0 0 ${SZ} ${SZ}" xmlns="http://www.w3.org/2000/svg">${h}</svg></div>`;
  }

  // ── 이 화면의 선택 ──
  const S = { pk: "", sel: -1, col: 0, stage: null, ctx: null, V: null, sent: 0 };
  function send(a) {
    const c = S.ctx; if (!c || !c.canAct) return;
    if (S.sent && Date.now() - S.sent < 1200) return;       // 두 번 탭 막기
    S.sent = Date.now();
    const r = c.act(a);
    if (!r || !r.ok) { S.sent = 0; if (r && r.err && c.toast) c.toast(r.err); if (S.stage && S.V) render(S.stage, S.V, c); }
    else { S.sel = -1; c.sfx("pop"); }
  }
  // 판은 남은 자리(가로 · 세로 중 작은 쪽)에 맞춘 정사각형
  function fitBoard(stage) {
    const w = stage.querySelector(".bo-wrap"), b = w && w.firstElementChild; if (!b) return;
    b.style.width = b.style.height = "";
    const sz = Math.floor(Math.min(w.clientWidth, w.clientHeight || 9999, 380));
    if (sz > 80) { b.style.width = sz + "px"; b.style.height = sz + "px"; }
  }
  function render(stage, V, ctx) {
    style();
    S.stage = stage; S.ctx = ctx; S.V = V;
    const me = ctx.me, watch = ctx.mode === "watch" || me < 0, local = ctx.mode === "local", canAct = !!ctx.canAct;
    const pk = `${ctx.g}|${V.gi}|${V.mv.length}|${V.phase}`;
    if (pk !== S.pk) { S.pk = pk; S.sel = -1; S.sent = 0; }
    const isMe = i => !watch && !local && i === me;
    const nm = i => (isMe(i) ? "나" : nameOf(ctx, i));
    const subj = i => (isMe(i) ? "내가" : `${esc(nameOf(ctx, i))}${iga(nameOf(ctx, i))}`);
    const dot = c => `<i class="cd" style="background:${HEX[c]}"></i>`;
    const reveal = watch || !!(V.opt && V.opt.peek) || V.phase !== "play";
    const L = V.last;
    const lastTxt = L ? `${subj(L.s)} 방금 <b>${CN(V, L.p)}</b>에 ${dot(L.c)} ${COLS[L.c]}` : "";
    let st = "", actH = "", bo = { last: L, reveal };
    if (V.phase === "play") {
      const myTurn = canAct && V.cur === me;
      if (myTurn) {
        const black = me === V.black;
        const c = black ? S.col : V.lastC;
        bo.pick = true; bo.sel = S.sel; bo.selC = c;
        if (S.sel >= 0) st = `<span><b>${CN(V, S.sel)}</b>에 ${dot(c)} <b>${COLS[c]}</b> — '두기'로 확정 (다른 점을 누르면 옮겨요)</span>`;
        else st = `<span>${lastTxt ? lastTxt + "<br>" : ""}<b>${local ? esc(nm(me)) + " 차례" : "내 차례"} · ${sideOf(V, me)}</b> — ${black ? "색을 고르고 둘 곳을 눌러요" : "둘 곳을 눌러요"}</span>`;
        const put = `<button type="button" data-a="put"${S.sel >= 0 ? "" : " disabled"}>${S.sel >= 0 ? `두기 · ${CN(V, S.sel)}` : "두기"}</button>`;
        if (black) actH = `<div class="bo-pal">${COLS.map((n, k) => `<button type="button" data-col="${k}" class="${k === S.col ? "on" : ""}" style="background:${HEX[k]}" aria-label="${n}" title="${n}"></button>`).join("")}</div><div class="bo-row">${put}</div>`;
        else actH = `<div class="bo-row"><span class="bo-fix"><i style="background:${HEX[c]}"></i>흑을 따라 ${COLS[c]}</span>${put}</div>`;
      } else {
        st = `<span>${lastTxt ? lastTxt + "<br>" : ""}${V.cur >= 0 ? `${esc(nm(V.cur))} (${sideOf(V, V.cur)}) 두는 중…` : ""}</span>`;
      }
    } else {
      const H = V.hist[V.hist.length - 1], w = V.phase === "gameend" ? V.gw : H ? H.w : -1;
      bo.line = H && H.line; bo.last = H && H.mv.length ? H.mv[H.mv.length - 1] : null;
      const cls = w < 0 ? "mid" : watch || local || w === me ? "ok" : "no";
      let head = w < 0 ? "판이 다 차서 무승부" : `🏆 ${subj(w)} 5목! (${sideOf(V, w)} · ${H ? H.moves : V.mv.length}수)`;
      if (V.over && V.res) {
        const ww = V.res.w;
        head = ww.length > 1 ? `🤝 무승부 — ${V.wins[0]} : ${V.wins[1]}` : watch || local ? `🏆 ${esc(nm(ww[0]))} 승리 (${V.wins[ww[0]]}승)` : ww[0] === me ? `🏆 내가 이겼어요 (${V.wins[me]}승)` : `💥 ${esc(nm(ww[0]))} 승리 — 졌어요`;
      }
      st = `<div class="bo-res ${V.over && V.res ? (V.res.w.length > 1 ? "mid" : watch || local || V.res.w[0] === me ? "ok" : "no") : cls}">${head}<small>밑면 공개 — 가운데 점 ● 흑 · ○ 백${V.need > 1 ? ` · ${V.gi}판 · ${V.wins[0]} : ${V.wins[1]} (${V.need}선승)` : ""}</small></div>`;
      if (H && V.phase !== "play") { V = Object.assign({}, V, { own: H.own, col: H.col }); }
    }
    stage.innerHTML = `<div class="bo-st">${st}</div><div class="bo-wrap">${boardHtml(V, bo)}</div>${actH ? `<div class="bo-act">${actH}</div>` : ""}`;
    fitBoard(stage);
    stage.onclick = e => {
      const t = e.target.closest("[data-p],button"); if (!t || t.disabled) return;
      const c = S.ctx, VV = S.V; if (!c || !c.canAct || !VV || VV.phase !== "play" || VV.cur !== c.me) return;
      if (t.dataset.col != null) { S.col = +t.dataset.col; c.sfx("tap"); render(stage, VV, c); return; }
      if (t.dataset.a === "put") { if (S.sel >= 0) send(VV.cur === VV.black ? { t: "put", p: S.sel, c: S.col, N: VV.N } : { t: "put", p: S.sel, N: VV.N }); return; }
      if (t.dataset.p != null) { const p = +t.dataset.p; S.sel = S.sel === p ? -1 : p; c.sfx("tap"); render(stage, VV, c); }
    };
  }

  // ── 선생님 (완벽히 기억한다고 보고 — 열면 누구 돌인지 짚어 줘요) ──
  function coach(V, me, since, names) {
    void since;
    if (!(me >= 0 && me < 2)) me = V.cur >= 0 ? V.cur : 0;
    const op = 1 - me, N = V.N;
    const nmx = i => (i === me ? "나" : esc((Array.isArray(names) && names[i]) || "상대"));
    const fiveOp = V.phase === "play" ? K.fivesFor(V.own.slice(), N, op) : [];
    const lo = K.longest(V.own, N, op), lm = K.longest(V.own, N, me);
    const opLast = [...V.mv].reverse().find(m => m.s === op);
    // 상대가 다음 수로 열린 4 를 만드는 자리 (= 상대 열린 3)
    const o3 = [];
    if (V.phase === "play" && !fiveOp.length) for (const i of K.candidates(V)) { const sc = K.scoreAt(V.own, N, i, op); if (sc.a4 >= 2) o3.push(i); }   // 두면 5목 자리가 두 곳 생기는 점
    const opp = `${nmx(op)} (${sideOf(V, op)})${opLast ? ` 마지막 수 ${CN(V, opLast.p)} ${COLS[opLast.c]}` : " 아직 안 둠"} · 가장 긴 줄 ${lo}목${fiveOp.length ? ` · ⚠ ${fiveOp.slice(0, 2).map(p => CN(V, p)).join(" / ")}에 두면 바로 5목!` : o3.length ? ` · ⚠ ${o3.slice(0, 2).map(p => CN(V, p)).join(" / ")}에 두면 5목 자리가 두 곳 (열린 3 꼴)` : ""}`;
    const mineN = V.own.filter(x => x === me).length, allN = V.mv.length, colsN = new Set(V.col.filter(c => c >= 0)).size;
    const mine = `나는 ${sideOf(V, me)} · 내 돌 ${mineN}개 · 판 위 돌 ${allN}개 (색 ${colsN}가지 — 흑 · 백이 같은 색을 나눠 써서 색만으로는 못 가려요) · 내 가장 긴 줄 ${lm}목${V.need > 1 ? ` · ${V.gi}판 ${V.wins[me]} : ${V.wins[op]}` : ""}.`;
    let rec = "", why = "";
    if (V.over) { rec = "끝났어요."; why = V.res ? `${V.wins[0]} : ${V.wins[1]}${V.draws ? ` (무승부 ${V.draws}판)` : ""}.` : ""; }
    else if (V.phase !== "play") { rec = "판 결과를 보는 중 — 밑면이 공개됐어요."; why = V.need > 1 ? `${V.need}선승 · 지금 ${V.wins[me]} : ${V.wins[op]} · 다음 판은 흑 · 백이 바뀌어요.` : "한 판 승부예요."; }
    else if (V.cur !== me) { rec = `${nmx(op)} 차례를 기다려요.`; why = fiveOp.length ? `${nmx(op)}${iga(nmx(op))} ${CN(V, fiveOp[0])}에 두면 5목 — 이미 늦었을 수 있어요.` : `상대가 둔 자리와 색을 기억해 두세요 (백은 흑과 같은 색을 써요).`; }
    else {
      const R = K.recommend(V, me);
      if (R) {
        const a = R.a;
        rec = `${CN(V, a.p)}에 두기${me === V.black ? ` (색은 ${COLS[a.c]})` : ""}${R.tag === "win" ? " — 바로 5목!" : ""}`;
        const sc = `5칸 창 점수 공격 ${Math.round(R.att)} · 수비 ${Math.round(R.def)}`;
        const T = {
          win: `내 돌 4개와 한 줄이 되는 자리 — 여기 두면 5목, 바로 승리.`,
          block5: `${nmx(op)} 돌 4개가 한 줄이에요 — 여기를 안 막으면 다음 수에 5목으로 져요.`,
          four: `두면 다음 수에 5목이 되는 자리가 두 곳 (열린 4 · 4-4) — 상대가 한 번에 다 못 막아요 (${sc}).`,
          block3: `${nmx(op)}${iga(nmx(op))} 여기 두면 5목 자리가 두 곳 생겨요 (열린 3 꼴) — 미리 막아요 (${sc}).`,
          four1: `4목을 만들어 상대가 막게 해요 — 주도권을 쥐어요 (${sc}).`,
          build: `내 줄을 키우면서 상대 줄 옆을 막는 자리 (${sc}).`,
        };
        why = T[R.tag] || T.build;
        if (me === V.black && R.tag !== "win") { let nb = 0; const r0 = Math.floor(a.p / N), c0 = a.p % N; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const r = r0 + dr, cc = c0 + dc; if (r >= 0 && r < N && cc >= 0 && cc < N && V.col[r * N + cc] >= 0) nb++; } if (nb) why += ` 색은 둘레에 많은 ${COLS[a.c]} — 상대가 헷갈려요 (내 기억이 먼저라면 줄마다 한 색으로).`; }
      } else { rec = "둘 곳이 없어요"; why = "판이 다 찼어요."; }
    }
    return { opp, mine, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const my = actText(myA, Vb), best = actText(bestA, Vb);
    if (!Vb || !myA || !bestA || Vb.phase !== "play" || myA.t !== "put" || bestA.t !== "put") return { sev: 0, why: "", my, best };
    if (myA.p === bestA.p) return { sev: 0, why: "고급 AI 와 같은 자리", my, best };
    const N = Vb.N, own = Vb.own, sm = K.scoreAt(own, N, myA.p, seat), sb = K.scoreAt(own, N, bestA.p, seat), bp = CN(Vb, bestA.p);
    if (sm.a5) return { sev: 0, why: "5목 — 이기는 수", my, best };
    // 내 돌 · 상대 돌을 거꾸로 기억했다면 좋은 수였나 (착각 짐작)
    const flip = own.map(x => (x < 0 ? x : 1 - x)), sf = K.scoreAt(flip, N, myA.p, seat);
    const mixed = sf.att + 0.95 * sf.def > 3 * (sm.att + 0.95 * sm.def) && sf.att + 0.95 * sf.def > 400 ? " (내 돌 · 상대 돌을 바꿔 기억했다면 좋은 수 — 착각했을 수 있어요)" : "";
    if (sb.a5 && !sm.a5) return { sev: 95, why: `${bp}에 두면 바로 5목이었어요 — 내 돌 4개가 그 줄에 있었어요${mixed}`, my, best };
    if (sb.d5 && !sm.d5 && !sm.a5) return { sev: 90, why: `상대 돌 4개가 한 줄이었어요 — ${bp}에 막아야 다음 수에 안 져요${mixed}`, my, best };
    if (sb.a4 >= 2 && sm.a4 < 2 && !sm.d5) return { sev: 62, why: `${bp}에 두면 다음 수에 5목 자리가 두 곳 (열린 4 · 4-4) — 이기는 길이었어요${mixed}`, my, best };
    if (sb.d4 >= 2 && sm.d4 < 2 && sm.a4 < 2 && !sm.d5) return { sev: 68, why: `상대가 다음 수에 5목 자리 두 곳을 만드는 점(열린 3 꼴)을 안 막았어요 — 고급 AI 는 ${bp}${mixed}`, my, best };
    const vm = sm.att + 0.95 * sm.def, vb = sb.att + 0.95 * sb.def;
    const d = vb > 0 ? (vb - vm) / vb : 0;
    return { sev: Math.max(0, Math.min(50, Math.round(d * 60))), why: `5칸 창 점수 내 수 ${Math.round(vm)} · 고급 AI 수 ${Math.round(vb)}${mixed}`, my, best };
  }

  function result(V, me) {
    const nm = i => (me >= 0 && i === me ? "나" : `${i + 1}번`);
    const R = V.res;
    const head = !R ? "" : R.w.length > 1 ? `🤝 무승부 ${V.wins[0]} : ${V.wins[1]}` : me >= 0 && R.w[0] === me ? "🏆 내가 이겼어요" : `🏆 ${nm(R.w[0])} 승리`;
    const rows = (V.hist || []).map(h => `${h.g}판 ⚫ ${nm(h.black)} · ${h.moves}수 → ${h.w < 0 ? "무승부 (판이 참)" : `${nm(h.w)} 5목 (${h.w === h.black ? "흑" : "백"})`} · 색 ${new Set(h.col.filter(c => c >= 0)).size}가지`).join("<br>");
    return `${head}<br>${rows}`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const N = 9, mk = (stones, black) => { const own = Array(N * N).fill(-1), col = Array(N * N).fill(-1); for (const [p, s, c] of stones) { own[p] = s; col[p] = c; } return { N, own, col, black: black == null ? 0 : black }; };
    const at = (r, c) => r * N + c;
    const tb = x => `<div class="bo-tut">${x}</div>`;
    const W5 = mk([[at(4, 2), 0, 0], [at(4, 3), 0, 2], [at(4, 4), 0, 0], [at(4, 5), 0, 5], [at(4, 6), 0, 3], [at(3, 3), 1, 0], [at(5, 4), 1, 2], [at(3, 5), 1, 0], [at(5, 6), 1, 5], [at(2, 4), 1, 3]]);
    const W5line = [at(4, 2), at(4, 3), at(4, 4), at(4, 5), at(4, 6)];
    const PAIR = mk([[at(4, 4), 0, 0], [at(3, 4), 1, 0], [at(4, 5), 0, 2], [at(5, 5), 1, 2], [at(3, 3), 0, 6], [at(5, 3), 1, 6]]);
    // 직접: 나(흑) 대각선 4개 — 색은 섞였고 백도 같은 색으로 둘레에
    const T0 = mk([[at(1, 1), 0, 0], [at(2, 2), 0, 2], [at(3, 3), 0, 0], [at(4, 4), 0, 5], [at(1, 2), 1, 0], [at(2, 3), 1, 2], [at(4, 3), 1, 0], [at(3, 5), 1, 5], [at(6, 6), 1, 3], [at(6, 2), 0, 3], [at(0, 0), 1, 3]]);
    const GOAL = at(5, 5);
    return [
      { tag: "STEP 1 · 목표", title: "내 돌 5개를 한 줄로", body: "오목이에요 — <b>내 돌 5개</b>가 가로 · 세로 · 대각선 한 줄이면 승리! (그림은 연습이라 가운데 점으로 ● 흑 · ○ 백을 보여 줘요)",
        boardHtml: tb(boardHtml(W5, { reveal: true, line: W5line })), ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "19줄 판 · 색 돌", body: "돌 <b>밑면</b>은 흑돌 · 백돌이지만 <b>윗면과 옆</b>은 7가지 색으로 덮여 있어요. 위에서는 <b>색만</b> 보여서 누구 돌인지 몰라요.",
        boardHtml: tb(`<div class="bo-sw">${HEX.map(h => `<i style="background:${h}"></i>`).join("")}</div>` + boardHtml(W5, {})), ms: 5600 },
      { tag: "STEP 3 · 진행", title: "흑이 색을 고르면 백은 따라", body: "<b>흑</b>이 먼저 색을 골라 두고, <b>백</b>은 방금 흑이 쓴 <b>같은 색</b>으로 둬요. 그래서 색마다 흑 · 백이 섞여요 — 둔 자리와 차례를 <b>기억</b>하는 게 전부!",
        boardHtml: tb(boardHtml(PAIR, { reveal: true })), ms: 6400 },
      { tag: "STEP 4 · 직접", title: "기억해서 5목", body: "나는 <b>흑</b>. 대각선으로 내 돌 4개 (빨강 · 노랑 · 빨강 · 파랑) — 이어지는 <b>빈 점</b>을 눌러 고스트 돌을 놓고 <b>두기</b>!",
        interactive: { hint: "👆 대각선 다음 점 → 두기", doneText: "✅ 5목! 색이 섞여도 내 돌만 기억하면 돼요" },
        render(stage, ctrl) {
          let V = { N, own: T0.own.slice(), col: T0.col.slice(), black: 0 }, sel = -1, done = false, line = null, msg = "연습이라 가운데 점(● 흑)을 보여 줘요";
          const draw = () => {
            const btn = !done ? `<div class="bo-row" style="width:min(100%,250px)"><button type="button" data-a="put"${sel >= 0 ? "" : " disabled"}${sel === GOAL ? ' data-tp="1"' : ""}>${sel >= 0 ? `두기 · ${K.cellName(N, sel)}` : "두기"}</button></div>` : "";
            stage.innerHTML = `<div class="bo-tut">${boardHtml(V, { reveal: true, pick: !done, sel, selC: 6, line, tp: !done && sel !== GOAL ? GOAL : -1 })}${btn}<div class="bo-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const t = e.target.closest("[data-p],button"); if (!t || t.disabled) return;
            if (t.dataset.a === "put" && sel >= 0) {
              V.own[sel] = 0; V.col[sel] = 6;
              const L = K.lineAt(V.own, N, sel, 0);
              if (L) { done = true; line = L; ctrl.sfx("win"); msg = `🎉 <b>5목!</b> 빨강 · 노랑 · 빨강 · 파랑 · 보라 — 색은 달라도 다 내 흑돌`; draw(); ctrl.complete(); return; }
              msg = `${K.cellName(N, sel)}… 5목이 아니에요 — 대각선 끝을 다시!`; V = { N, own: T0.own.slice(), col: T0.col.slice(), black: 0 }; sel = -1; ctrl.sfx("tap"); draw(); return;
            }
            if (t.dataset.p != null) { sel = +t.dataset.p; msg = sel === GOAL ? "맞아요 — <b>두기</b>로 확정" : `${K.cellName(N, sel)}… 4개가 이어지는 대각선 끝은 다른 점이에요`; ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "먼저 5목이면 승리", body: "5개 이상 한 줄이 되면 심판이 바로 알려 주고 그 판은 끝 — <b>밑면 공개</b>! 방송은 이기면 <b>피스 10개</b>, 지면 가진 피스를 모두 잃고 <b>바로 탈락</b>이었어요. 판이 다 차면 무승부.",
        boardHtml: tb(boardHtml(W5, { reveal: true, line: W5line })), ms: 6000 },
      { tag: "STEP 6 · 특수 규칙", title: "기억이 무기", body: "속임수 · 반칙(밑면 훔쳐보기)은 즉시 패배. 방송에서는 '네 번째 공격 돌은 노란색'처럼 <b>나만의 색 규칙</b>으로 기억했어요 (백도 같은 색으로 막으니 그 색 짝 중 <b>먼저 둔 쪽</b>이 흑). 🧑‍🏫 선생님은 완벽히 기억한다고 보고 수를 골라 줘요.",
        boardHtml: tb(boardHtml(PAIR, {})), ms: 6800 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.blindomok = {
    name: "블라인드 오목", emoji: "🎨", short: "윗면은 색, 밑면만 흑백 — 누구 돌인지 기억해서 두는 19줄 오목", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    opts: [
      { k: "size", label: "판", items: [[19, "19줄 (방송)"], [15, "15줄"]], def: 19 },
      { k: "games", label: "판 수", items: [[1, "1판 (방송)"], [3, "3판 2선승"]], def: 1 },
      { k: "peek", label: "흑백 보기", items: [[0, "끔 (방송)"], [1, "켬 (연습)"]], def: 0 },
    ],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: <b>내 돌 5개</b>를 가로 · 세로 · 대각선 한 줄로 먼저 → 승리 (방송: 이기면 피스 10개 · 지면 모든 피스를 잃고 탈락)",
      "준비물: <b>19줄</b> 판 · 돌 밑면은 흑돌 / 백돌, 윗면과 옆은 <b>7가지 색</b> — 위에서는 누구 돌인지 안 보여요",
      "진행: <b>흑</b>이 먼저 색을 골라 두고, <b>백</b>은 방금 흑이 쓴 <b>같은 색</b>으로 둬요 · 번갈아",
      "승패: 5개 이상 한 줄이면 심판이 알려 주고 끝 · 밑면 공개 · 판이 다 차면 무승부",
      "특수: 내 돌 · 상대 돌은 <b>기억</b>으로만 · 속임수 · 반칙(밑면 보기)은 즉시 패배",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.need > 1 ? `${V.gi}판 · ${V.wins[0]}:${V.wins[1]} · ` : ""}${V.cur >= 0 ? `${V.cur === V.black ? "흑" : "백"} 차례 · ${V.mv.length}수` : "판 끝"}`),
    chip: (V, i) => ({ t: `${i === V.black ? "⚫ 흑" : "⚪ 백"}${V.need > 1 ? ` · ${V.wins[i]}승` : ""}`, on: !V.over && V.cur === i, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "normal", rnd),
  };
})();

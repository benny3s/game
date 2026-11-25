/* 베니 서바이벌 · 컬러턴 — 화면 (6×6 판 · 칩 올리기 / 옮기기 · 숨은 지뢰 · 🔒 · '!' 표시 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.colorturn;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = 6, NC = 36;
  const COL = ["검정", "하양"], DOT = ["⚫", "⚪"];
  const lbl = i => "ABCDEF"[i % W] + (((i / W) | 0) + 1);              // 칸 이름: 가로 A~F · 위에서 1~6줄
  const SRC = "방송: 피의 게임 시즌2 · 컬러턴 (2일차 데스매치 1:1)";
  const DIFF = "※ 방송과 다른 점: 선공은 무작위 · 4목이 둘 다 생기면 움직인 사람이 승 · 드러난 지뢰는 사라지지 않고 다시 밟으면 또 색이 바뀜 · 칩을 못 움직이면 차례를 넘김 · 60턴이 넘으면 무승부 (방송 원문에 없어서 우리가 정함)";

  const CSS = `
.ct-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.ct-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:4px 10px}
.ct-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.ct-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.ct-pill.sm{font-weight:700;color:var(--soft)}
.ct-pill.r{margin-left:auto}
.ct-wrap{flex:none;display:grid;grid-template-columns:minmax(0,1fr) 24px;gap:4px;width:min(100%,calc(100vh - 300px));width:min(100%,calc(100dvh - 300px));margin:0 auto}
.ct-board{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:repeat(6,minmax(0,1fr));gap:3px;aspect-ratio:1/1;padding:4px;border-radius:14px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1)}
.ct-rh{display:grid;grid-template-rows:repeat(6,minmax(0,1fr));gap:3px;padding:5px 0}
.ct-rh i{display:grid;place-items:center;font:800 10.5px var(--round);font-style:normal;color:#c4b5fd;font-variant-numeric:tabular-nums}
.ct-rh i.z{color:rgba(255,255,255,.25)}
.ct-c{position:relative;display:grid;place-items:center;min-width:0;min-height:0;padding:0;border:0;border-radius:8px;background:#2a2040;color:#fff;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.ct-c{cursor:default}
.ct-c.u{background:repeating-linear-gradient(135deg,#2e2446 0 5px,#251b39 5px 10px)}
.ct-c.s{background:#173a2b;box-shadow:inset 0 0 0 1.5px rgba(74,222,128,.45)}
.ct-c.m{background:#4a1322;box-shadow:inset 0 0 0 1.5px rgba(251,113,133,.75)}
.ct-c.hm{background:#3a1a2a;box-shadow:inset 0 0 0 1.5px rgba(251,113,133,.35)}
.ct-chip{width:76%;height:76%;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.55)}
.ct-chip.b{background:radial-gradient(circle at 35% 30%,#64748b,#0b0f17 68%);border:2px solid #cbd5e1}
.ct-chip.w{background:radial-gradient(circle at 35% 30%,#fff,#cbd5e1 78%);border:2px solid #334155}
.ct-ok{position:absolute;right:3px;top:1px;font:900 11px var(--round);font-style:normal;color:#4ade80;pointer-events:none}
.ct-bomb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:19px;line-height:1;pointer-events:none}
.ct-bomb.on{left:auto;top:1px;right:1px;transform:none;font-size:12px}
.ct-bomb.dim{opacity:.55}
.ct-lb{position:absolute;left:3px;bottom:1px;font:700 8.5px var(--round);font-style:normal;opacity:.4;pointer-events:none}
.ct-lock{position:absolute;left:-3px;top:-5px;font-size:13px;filter:drop-shadow(0 1px 1px #000);pointer-events:none;z-index:2}
.ct-bang,.ct-star{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#e11d48;color:#fff;font:900 14px/22px var(--round);text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none;z-index:2}
.ct-star{background:#f5b301;color:#3b2a00;box-shadow:0 0 0 2px #fff7d6}
.ct-c.pl::after,.ct-c.tg::after{content:"";position:absolute;inset:5px;border-radius:50%;pointer-events:none}
.ct-c.pl::after{border:2px dashed #f5b301}
.ct-c.tg::after{border:2.5px dashed #4ade80;background:rgba(74,222,128,.14)}
.ct-c.mv{outline:1.5px solid rgba(253,230,138,.5);outline-offset:-3px}
.ct-c.sel{box-shadow:0 0 0 3px #fde68a;z-index:1}
.ct-c.lm{outline:2px solid rgba(96,165,250,.8);outline-offset:-2px}
.ct-c.win .ct-chip{box-shadow:0 0 0 3px #4ade80,0 0 14px #4ade80}
.ct-info{flex:none;text-align:center;font-size:12.5px;line-height:1.4;color:var(--soft);min-height:2.8em;display:grid;place-items:center}
.ct-info b{color:#fde68a}
.ct-info.end{font:800 14.5px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:5px 8px}
.ct-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.ct-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.ct-legend{flex:none;display:flex;flex-wrap:wrap;gap:2px 10px;justify-content:center;font-size:10.5px;color:var(--soft);line-height:1.3}
.ct-legend i.lg{display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:-1px;margin-right:3px}
.ct-legend i.lg.u{background:repeating-linear-gradient(135deg,#4a3b6b 0 3px,#33274f 3px 6px)}
.ct-legend i.lg.s{background:#173a2b;box-shadow:inset 0 0 0 1px #4ade80}
.ct-legend i.lg.m{background:#4a1322;box-shadow:inset 0 0 0 1px #fb7185}
.ct-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.ct-tut .ct-wrap{display:block;width:min(100%,232px)}
.ct-tut .ct-board{padding:3px;gap:2px;border-radius:10px}
.ct-tut .ct-lb{display:none}
.ct-tut .ct-bomb{font-size:15px}
.ct-tut .ct-bomb.on{font-size:10px}
.ct-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.ct-tmsg b{color:#fde68a}
.ct-pair{display:flex;align-items:center;gap:8px;justify-content:center}
.ct-pair .ct-c{width:54px;height:54px}
.ct-pair .ar{font:900 20px var(--round);color:#fde68a}
@media (max-height:660px){.ct-legend{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || COL[i];

  // 눌러 둔 칩 (이 기기에서만 · 차례가 바뀌면 지움)
  let SEL = { key: "", from: -1 };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.tc}|${V.turn}|${ctx.me}`; if (SEL.key !== key) SEL = { key, from: -1 }; return SEL; };

  const rowOf = (V, r) => { let rev = 0, unk = 0; for (let c = 0; c < W; c++) { const k = V.known[r * W + c]; if (k === 2) rev++; else if (k === 0) unk++; } return { rev, unk, left: Math.max(0, 3 - rev) }; };

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, can = !!ctx.canAct && me >= 0 && !over, flip = me === 1;
    const S = selFor(V, ctx);
    const L = can ? K.legal(V, me) : [];
    const placeT = new Set(), moveF = new Map();
    for (const a of L) {
      if (a.t === "place") placeT.add(a.to);
      else { if (!moveF.has(a.from)) moveF.set(a.from, new Set()); moveF.get(a.from).add(a.to); }
    }
    if (S.from >= 0 && !moveF.has(S.from)) S.from = -1;
    const tg = S.from >= 0 ? moveF.get(S.from) : null;
    // '!' 표시 = 선생님이 말하는 위험한 칸 (선생님 창이 열려 있을 때만): 빈칸에 같은 색이 들어가면 4목이 되는 줄
    const bang = new Set(), star = new Set();
    if (ctx.coachOn && !over) for (const t of K.threats(V.cells)) { if (me >= 0 && t.col === me + 1) star.add(t.empty); else bang.add(t.empty); }
    const win = new Set(V.win ? V.win.line : []);
    const lastEv = V.log.length ? V.log[V.log.length - 1] : null;
    const lm = lastEv && (lastEv.k === "place" || lastEv.k === "move") && !over ? lastEv.to : -1;
    const order = []; for (let i = 0; i < NC; i++) order.push(flip ? NC - 1 - i : i);

    const cell = i => {
      const k = V.known[i], c = V.cells[i], hid = !!(V.mines && V.mines[i] && k !== 2);
      let cls = `ct-c ${k === 2 ? "m" : k === 1 ? "s" : "u"}${hid ? " hm" : ""}`;
      if (S.from === i) cls += " sel";
      else if (can && moveF.has(i)) cls += " mv";
      if (tg && tg.has(i)) cls += " tg";
      if (can && S.from < 0 && placeT.has(i)) cls += " pl";
      if (win.has(i)) cls += " win";
      if (i === lm) cls += " lm";
      let inner = "";
      if (c) inner += `<span class="ct-chip ${c === 1 ? "b" : "w"}"></span>`;
      if (k === 2 || hid) inner += `<span class="ct-bomb${c ? " on" : ""}${k === 2 ? "" : " dim"}">💣</span>`;
      else if (k === 1) inner += `<i class="ct-ok">✓</i>`;
      inner += `<i class="ct-lb">${lbl(i)}</i>`;
      if (i === V.lastTo && !over) inner += `<span class="ct-lock">🔒</span>`;
      if (!c && bang.has(i)) inner += `<span class="ct-bang">!</span>`;
      else if (!c && star.has(i)) inner += `<span class="ct-star">★</span>`;
      const what = (c ? `${COL[c - 1]} 칩` : "빈칸") + (k === 2 ? ", 드러난 지뢰" : k === 1 ? ", 밟아 본 안전한 칸" : ", 안 밟은 칸");
      return `<button type="button" class="${cls}" data-c="${i}" aria-label="${lbl(i)} ${what}">${inner}</button>`;
    };
    const rows = [];
    for (let d = 0; d < W; d++) {
      const r = flip ? W - 1 - d : d, R = rowOf(V, r);
      rows.push(over ? `<i class="z">✔</i>` : R.unk ? `<i title="이 줄에 안 밟은 칸 ${R.unk}개 · 그중 지뢰 ${R.left}개">${R.left}/${R.unk}</i>` : `<i class="z">·</i>`);
    }

    // 윗줄
    const turnTxt = over ? "끝" : can ? "내 차례" : `${esc(nameOf(ctx, V.turn))} 차례`;
    let h = `<div class="ct-top"><span class="ct-pill ${over ? "" : can ? "me" : "turn"}">${turnTxt}</span><span class="ct-pill sm">대기 칩 ${DOT[0]}${V.left[0]} ${DOT[1]}${V.left[1]}</span></div>`;
    h += `<div class="ct-wrap"><div class="ct-board" aria-label="컬러턴 판">${order.map(cell).join("")}</div><div class="ct-rh" aria-hidden="true">${rows.join("")}</div></div>`;

    // 아래 안내
    let info, ic = "";
    if (over) {
      const w = V.win;
      if (w && w.seat >= 0) {
        const mine = me === w.seat, lose = me >= 0 && !mine;
        info = `${me < 0 ? `🏆 ${COL[w.seat]}` : mine ? `🏆 내 ${COL[w.seat]}` : `😵 상대 ${COL[w.seat]}`} 4목 완성! <span style="font-weight:700">· 숨은 지뢰 ${V.mines ? V.mines.filter(Boolean).length : 18}개를 모두 보여 줘요</span>`;
        ic = lose ? " end bad" : " end";
      } else { info = `🤝 무승부 — ${w && w.why === "stuck" ? "둘 다 움직일 수 없었어요" : `${V.maxTurn}턴이 지나도 4목이 없었어요`} · 지뢰를 모두 보여 줘요`; ic = " end mid"; }
    } else if (can) {
      const lock = V.lastTo >= 0 ? " 🔒 칩은 상대가 방금 옮겨서 못 골라요." : "";
      if (S.from >= 0) info = `옮길 <b>빈칸</b>(초록 점선)을 눌러요 · 그 칩을 다시 누르면 취소.${lock}`;
      else if (V.left[me] > 0) info = `<b>빈칸(금색 점선)</b>에 새 칩을 올리거나, <b>판 위 칩</b>을 눌러 옮겨요 (남은 칩 ${V.left[me]}개).${lock}`;
      else info = `칩을 다 올렸어요 — <b>판 위 칩</b>을 눌러 옮겨요.${lock}`;
      if (lastEv && lastEv.k === "pass") info = `상대는 둘 수 있는 수가 없어 넘겼어요. ` + info;
    } else info = `${esc(nameOf(ctx, V.turn))} 차례예요…${lastEv && lastEv.k === "pass" ? " (상대는 둘 수 있는 수가 없어 넘겼어요)" : ""}`;
    h += `<div class="ct-info${ic}"><span>${info}</span></div>`;
    h += `<div class="ct-legend"><span><i class="lg u"></i>안 밟은 칸</span><span><i class="lg s"></i>밟아 본 안전한 칸</span><span><i class="lg m"></i>드러난 지뢰</span><span>줄 끝 = 지뢰 수/안 밟은 칸 수</span></div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      const b = e.target.closest("[data-c]"); if (!b || !ctx.canAct || me < 0) return;
      const c = +b.dataset.c;
      if (S.from >= 0 && tg && tg.has(c)) { const from = S.from; S.from = -1; ctx.sfx("pop"); ctx.act({ t: "move", from, to: c }); return; }
      if (placeT.has(c)) { S.from = -1; ctx.sfx("pop"); ctx.act({ t: "place", to: c }); return; }
      if (V.cells[c]) {
        if (moveF.has(c)) { S.from = S.from === c ? -1 : c; ctx.sfx("tap"); render(stage, V, ctx); return; }
        ctx.toast(c === V.lastTo ? "상대가 방금 옮긴 칩은 못 골라요" : "그 칩은 옮길 빈칸이 없어요", 1400);
        return;
      }
      if (S.from >= 0) { S.from = -1; render(stage, V, ctx); }
    };
  }

  // ── 선생님 (보이는 것만으로 · 안 밟은 칸은 확률로만 말함) ──
  function replay(log, upto) {
    const c = Array(NC).fill(0);
    for (const e of log) {
      if (e.i > upto) break;
      if (e.k === "place") c[e.to] = e.flip ? 2 - e.s : e.s + 1;
      else if (e.k === "move") { const k = c[e.from]; c[e.from] = 0; c[e.to] = e.flip ? 3 - k : k; }
    }
    return c;
  }
  const list = a => [...new Set(a)].sort((x, y) => x - y).map(lbl).join(" · ");
  const actText = a => a.t === "place" ? `새 칩을 ${lbl(a.to)} 에 올리기` : `${lbl(a.from)} 칩을 ${lbl(a.to)} 로 옮기기`;
  function whyText(V, me, r) {
    const t = r.tags, a = r.a, mc = me + 1, out = [];
    if (t.includes("win")) out.push("4목이 완성돼서 바로 이겨요");
    if (t.includes("block")) out.push("상대의 3목 줄을 끊어서 위협을 줄여요");
    if (t.includes("threat")) out.push("내 3목 줄이 늘어서 다음 차례에 위협이 돼요");
    if (t.includes("mine")) {
      const col = a.t === "place" ? mc : V.cells[a.from];
      out.push(3 - col === mc ? "이미 드러난 지뢰 칸이라 상대 색 칩이 내 색으로 바뀌어요" : "이미 드러난 지뢰 칸이라 내 색 칩이 상대 색으로 바뀌지만, 이 수가 가장 낫다고 읽었어요");
    }
    if (t.includes("gamble")) out.push(`안 밟은 칸이라 지뢰일 수도 있어요 (확률 약 ${Math.round((r.p || 0) * 100)}%) — 지뢰면 칩 색이 바뀌어요`);
    if (t.includes("safe")) out.push("이미 밟아 본 안전한 칸이에요");
    return out.length ? out.join(" · ") : "큰 위험도 큰 이득도 없는 무난한 수예요";
  }
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, mc = me + 1, A = K.analyze(V, me), over = !!V.over;
    // 👀 상대 흐름
    const evs = V.log.filter(e => e.i > since && e.s === opp && (e.k === "place" || e.k === "move" || e.k === "pass"));
    const p = [];
    if (!evs.length) p.push(V.tc === 0 ? "아직 아무도 칩을 두지 않았어요." : "내 지난 차례 뒤 상대가 둔 수는 없어요.");
    if (evs.length) {
      const e = evs[evs.length - 1], more = evs.length > 1 ? ` (그 전에도 ${evs.length - 1}번 더 두었어요)` : "";
      if (e.k === "pass") p.push(`상대는 움직일 수 있는 수가 없어 차례를 넘겼어요${more}.`);
      else p.push(`상대가 ${e.k === "place" ? `${lbl(e.to)} 에 새 칩을 올렸어요` : `${lbl(e.from)} 칩을 ${lbl(e.to)} 로 옮겼어요`}${e.flip ? " — 지뢰를 밟아 칩 색이 바뀌었어요" : ""}${more}.`);
    }
    if (!over && V.turn === me && V.lastTo >= 0) p.push(`방금 옮긴 칩(${lbl(V.lastTo)})은 🔒 이라 이번 차례에 못 골라요.`);
    if (A.opp.length) p.push(`상대 색 3개가 이어진 줄이 ${A.opp.length}개 있어요 — 빈칸 ${list(A.opp.map(t => t.empty))} 에 상대 색이 들어가면 4목! (판에 '!' 로 표시했어요)`);
    else p.push("지금 상대의 3목 위협은 없어요.");
    // 📊 내 흐름
    const before = since >= 0 ? replay(V.log, since).filter(c => c === mc).length : -1;
    let m = `내 칩(${COL[me]})은 판 위 ${V.score[me]}개 · 남은 칩 ${V.left[me]}개${before >= 0 && before !== V.score[me] ? ` (지난 내 차례 전 ${before}개)` : ""} · 상대는 판 위 ${V.score[opp]}개예요.`;
    if (A.me.length) m += ` 내 3목 줄 ${A.me.length}개 — 빈칸 ${list(A.me.map(t => t.empty))} 에 내 색이 들어가면 4목 (★).`;
    const rp = [];
    for (let r = 0; r < W; r++) { const unk = []; for (let c = 0; c < W; c++) if (V.known[r * W + c] === 0) unk.push(r * W + c); if (unk.length) rp.push({ r, p: A.mineProb[unk[0]] }); }
    if (rp.length) { rp.sort((a, b) => a.p - b.p || a.r - b.r); m += ` 안 밟은 칸이 지뢰일 확률은 줄마다 달라요 — 가장 낮은 곳은 ${rp[0].r + 1}줄(약 ${Math.round(rp[0].p * 100)}%).`; }
    // 💡 추천 · 👉 뜻
    let rec, why = "";
    if (over) rec = "끝났어요.";
    else if (V.turn !== me) rec = "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else if (!A.rec) rec = "움직일 수 있는 수가 없어서 차례가 넘어가요.";
    else { rec = `${actText(A.rec.a)}.`; why = whyText(V, me, A.rec); }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  function result(V, me) {
    const w = V.win; if (!w) return "";
    const who = s => me === s ? `나(${COL[s]})` : me >= 0 ? `상대(${COL[s]})` : COL[s];
    const head = w.seat >= 0 ? `<b>${who(w.seat)} 4목 완성</b> — ${w.line.map(lbl).join(" · ")}` : `<b>무승부</b> — ${w.why === "stuck" ? "둘 다 움직일 수 없었어요" : `${V.maxTurn}턴이 지나도 4목이 없었어요`}`;
    const f = [0, 0]; V.log.forEach(e => { if ((e.k === "place" || e.k === "move") && e.flip) f[e.s]++; });
    return `${head}<br>💣 지뢰를 밟은 횟수 — ${who(0)} ${f[0]}번 · ${who(1)} ${f[1]}번 (드러난 지뢰 ${V.known.filter(k => k === 2).length}개 / 전체 18개) · ${V.tc}턴`;
  }

  // ── 1분 규칙 ──
  function miniBoard(cells, o = {}) {
    const t = o.btn ? "button" : "span", at = o.btn ? ' type="button"' : "";
    let g = "";
    for (let i = 0; i < NC; i++) {
      const c = cells[i];
      const k = (o.m || []).includes(i) ? 2 : (o.s || []).includes(i) ? 1 : 0;
      const cls = `ct-c ${k === 2 ? "m" : k === 1 ? "s" : "u"}${(o.pl || []).includes(i) ? " pl" : ""}${(o.tg || []).includes(i) ? " tg" : ""}${(o.win || []).includes(i) ? " win" : ""}`;
      g += `<${t}${at} class="${cls}" data-c="${i}"${(o.tp || []).includes(i) ? ' data-tp="1"' : ""}>${c ? `<span class="ct-chip ${c === 1 ? "b" : "w"}"></span>` : ""}${k === 2 ? `<span class="ct-bomb${c ? " on" : ""}">💣</span>` : ""}${(o.lock || []).includes(i) ? `<span class="ct-lock">🔒</span>` : ""}</${t}>`;
    }
    return `<div class="ct-wrap"><div class="ct-board">${g}</div></div>`;
  }
  const put = (...xs) => { const c = Array(NC).fill(0); xs.forEach(([col, ...is]) => is.forEach(i => { c[i] = col; })); return c; };
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 목표", title: "내 색 칩 4개를 한 줄로", body: "6×6 판에서 <b>내 색 칩 4개</b>를 가로 · 세로 · 대각선 한 방향으로 이으면 이겨요. 칩은 검정 · 하양 <b>7개씩</b>이에요.",
        boardHtml: `<div class="ct-tut">${miniBoard(put([1, 12, 19, 26, 33], [2, 2, 10, 15]), { win: [12, 19, 26, 33] })}</div>`, ms: 5200 },
      { tag: "STEP 2 · 한 턴", title: "올리기 · 옮기기 중 하나", body: "내 차례엔 <b>둘 중 하나</b>만! ① 안 올린 칩을 <b>내 앞 첫 줄</b> 빈칸에 올려요(금색 점선). ② 판 위 칩 1개를 <b>주변 8칸 빈칸</b>으로 옮겨요(초록 점선). 칩은 <b>내 색이든 상대 색이든</b> 옮길 수 있어요.",
        boardHtml: `<div class="ct-tut">${miniBoard(put([1, 31, 33], [2, 14]), { pl: [30, 32, 34, 35], tg: [7, 8, 9, 13, 15, 19, 20, 21] })}</div>`, ms: 6400 },
      { tag: "STEP 3 · 잠금", title: "방금 옮긴 칩은 못 골라요", body: "상대가 바로 전 턴에 <b>옮긴 칩</b>은 🔒 이 붙어요. 내 차례에는 그 칩을 옮길 수 없어요 (새 칩을 올리는 건 괜찮아요).",
        boardHtml: `<div class="ct-tut">${miniBoard(put([1, 25, 31], [2, 14, 20]), { lock: [20] })}</div>`, ms: 5200 },
      { tag: "STEP 4 · 지뢰", title: "밟으면 색이 바뀌어요", body: "판 아래에는 <b>지뢰 18개</b>가 숨어 있어요 (가로 줄마다 3개). 아무도 위치를 몰라요. 지뢰 칸에 칩이 들어가면 <b>칩 색이 바뀌고</b> 지뢰가 드러나요. 드러난 지뢰는 그대로 남아서 또 밟으면 또 바뀌어요!",
        boardHtml: `<div class="ct-tut"><div class="ct-pair"><span class="ct-c u"><span class="ct-chip b"></span></span><span class="ar">➜</span><span class="ct-c u"></span><span class="ar">=</span><span class="ct-c m"><span class="ct-chip w"></span><span class="ct-bomb on">💣</span></span></div><div class="ct-tmsg">검정 칩이 숨은 지뢰 칸에 들어가 <b>하양</b>이 됐어요</div></div>`, ms: 6000 },
      { tag: "STEP 5 · 직접", title: "4목을 완성해요", body: "검정 칩 3개가 이어져 있어요. 내 앞 첫 줄(맨 아래)의 <b>빈칸</b>에 칩을 올려서 <b>4개를 이어</b> 봐요!",
        interactive: { hint: "👆 3개 옆 빈칸을 눌러요", doneText: "✅ 4목 완성! 이렇게 이으면 이겨요" },
        render(stage, ctrl) {
          const cells = put([1, 31, 32, 33], [2, 3, 9]);
          let done = false, msg = "맨 아래 줄의 <b>빈칸</b>을 눌러 보세요";
          const draw = (win) => {
            stage.innerHTML = `<div class="ct-tut">${miniBoard(cells, { btn: true, pl: done ? [] : [30, 34, 35], tp: done ? [] : [30, 34], win })}<div class="ct-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || done) return;
            const c = +b.dataset.c;
            if (![30, 34, 35].includes(c)) { ctrl.sfx("tap"); return; }
            if (c === 35) { ctrl.sfx("tap"); msg = "그 칸은 끊겨 있어서 4목이 안 돼요. <b>3개 바로 옆</b> 칸을 눌러요"; draw([]); return; }
            cells[c] = 1; done = true; msg = "🏆 <b>4목 완성!</b> 가로로 4개가 이어졌어요"; ctrl.sfx("win");
            draw(c === 30 ? [30, 31, 32, 33] : [31, 32, 33, 34]); ctrl.complete();
          };
          draw([]);
        } },
      { tag: "STEP 6 · 승패", title: "먼저 4목, 아니면 무승부", body: "4목이 이어지면 그 색이 이겨요 — 상대 차례에 <b>내 색 4목이 생겨도 내 승</b>! 60턴이 지나도 없으면 무승부예요. 지뢰는 AI 도 못 봐요. 줄 끝 숫자(지뢰 수/안 밟은 칸 수)와 <b>🧑‍🏫 AI 선생님</b>의 확률이 단서예요.",
        boardHtml: `<div class="ct-tut"><span style="font-size:42px">🏆</span><div class="ct-pair"><span class="ct-pill">2/4</span><span class="ar">= 안 밟은 칸 4개 중 지뢰 2개</span></div></div>`, ms: 6200 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.colorturn = {
    name: "컬러턴", emoji: "🎨", short: "숨은 지뢰 위의 칩 4목 1:1", min: 2, max: 2, defN: 2, board: true,
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: <b>내 색 칩 4개</b>를 가로 · 세로 · 대각선 한 줄로 이으면 승",
      "6×6 판, 검정 · 하양 칩 <b>7개씩</b>. 판 아래엔 <b>지뢰 18개</b>가 숨어 있어요 (가로 줄마다 3개, 둘 다 위치를 몰라요)",
      "내 차례엔 하나만 — <b>① 올리기</b>: 안 올린 칩을 내 앞 첫 줄 빈칸에 · <b>② 옮기기</b>: 칩 1개(<b>어느 색이든</b>)를 주변 8칸 빈칸으로",
      "상대가 방금 옮긴 칩(🔒)은 이번 차례에 못 골라요",
      "지뢰 칸에 칩이 들어가면 <b>칩 색이 바뀌고</b> 지뢰가 드러나요 (드러난 뒤에도 남아요)",
      "4목이 생기면 그 색 승 — 상대 차례에 내 색 4목이 이어져도 내 승 · 60턴이 지나면 무승부",
      SRC, DIFF,
    ],
    sub: V => V.over ? "끝" : `${Math.min(V.tc + 1, V.maxTurn)} / ${V.maxTurn}턴`,
    chip: (V, i) => ({ t: `${DOT[i]}${V.score[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

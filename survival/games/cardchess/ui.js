/* 베니 서바이벌 · 카드 체스 — 화면 (5×5 판 · 보는 방향 ▲▼ · 성 🏰 · 카드 2장 + 대기 · 카드/말/칸 순서 없이 누르기 · '!' 표시 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  const Q = window.SVCores.cardchess;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SZ = 5, NS = 25;
  const CN = Q.CARDS, SIDE = ["백", "흑"];                                  // 카드 이름 · 자리 0 = 백(아래) · 1 = 흑(위)
  const lbl = i => "ABCDE"[i % SZ] + (((i / SZ) | 0) + 1);               // 칸 이름: 가로 A~E · 위에서 1~5줄
  const SRC = "방송: 피의 게임 시즌X · 카드 체스 (9일차 파이널 3R 1:1)";
  const DIFF = "※ 방송과 다른 점: 시작 카드는 무작위로 나눠요 (방송은 후공이 고름) · 선공은 백 (2세트부터 진 쪽) · 말은 모두 같고 카드가 움직임을 정해요 · 움직일 수 없으면 차례를 넘겨요 · 60턴이 넘으면 말이 더 많은 쪽 승 · 말이 되돌아와 내 쪽 끝 줄에 닿아도 뒤돌아봐요";
  const NOTE = ["상하좌우 1칸", "대각선 1칸", "앞 2칸 · 앞 대각선", "2칸 + 직각 1칸", "붙은 말 뛰어넘기", "8방향 1칸"];
  // 카드 그림 (5×5, 가운데 = 말, 위쪽 = 말이 보는 쪽) — 초록 = 갈 수 있는 칸
  const PAT = [
    [[1, 2], [3, 2], [2, 1], [2, 3]],
    [[1, 1], [1, 3], [3, 1], [3, 3]],
    [[1, 2], [0, 2], [1, 1], [1, 3]],
    [[0, 1], [0, 3], [4, 1], [4, 3], [1, 0], [3, 0], [1, 4], [3, 4]],
    [[0, 0], [0, 2], [0, 4], [2, 0], [2, 4], [4, 0], [4, 2], [4, 4]],
    [[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2], [3, 3]],
  ];
  const NEAR = [[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2], [3, 3]];

  const CSS = `
.cc-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.cc-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:4px 10px}
.cc-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.cc-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.cc-pill.sm{font-weight:700;color:var(--soft)}
.cc-opp{flex:none;display:flex;align-items:center;gap:6px;min-width:0}
.cc-ol{font:700 11.5px var(--round);color:var(--soft);white-space:nowrap}
.cc-wrap{flex:none;width:min(100%,calc(100vh - 410px));width:min(100%,calc(100dvh - 410px));margin:0 auto}
.cc-board{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:2px;aspect-ratio:1/1;padding:4px;border-radius:14px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12)}
.cc-c{position:relative;display:grid;place-items:center;min-width:0;min-height:0;padding:0;border:0;border-radius:6px;font:inherit;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.cc-c{cursor:default}
.cc-c.l1{background:#3b2d54}.cc-c.l2{background:#2a1f3f}
.cc-c.cs{box-shadow:inset 0 0 0 2px rgba(245,179,1,.6)}
.cc-cs{position:absolute;right:2px;top:0;font-size:12px;font-style:normal;opacity:.8;pointer-events:none}
.cc-lb{position:absolute;left:3px;bottom:1px;font:700 8.5px var(--round);font-style:normal;opacity:.4;pointer-events:none}
.cc-p{position:relative;width:70%;height:70%;border-radius:50%;display:grid;place-items:center;box-shadow:0 2px 5px rgba(0,0,0,.55);transition:transform .15s}
.cc-p.w{background:radial-gradient(circle at 35% 30%,#fff,#cbd5e1 80%);border:2.5px solid #475569;color:#0f172a}
.cc-p.b{background:radial-gradient(circle at 35% 30%,#475569,#0b0f17 70%);border:2.5px solid #cbd5e1;color:#f1f5f9}
.cc-ar{font-style:normal;font-size:15px;line-height:1}
.cc-p.mv{box-shadow:0 0 0 2.5px rgba(253,230,138,.65),0 2px 5px rgba(0,0,0,.55)}
.cc-p.sel{box-shadow:0 0 0 3.5px #fde68a,0 0 12px #fde68a;transform:scale(1.06)}
.cc-p.ask{animation:ccp .8s ease-in-out infinite alternate}
@keyframes ccp{from{transform:scale(1)}to{transform:scale(1.12)}}
.cc-c.tg::after{content:"";position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(74,222,128,.85);pointer-events:none}
.cc-c.tg.cap::after{width:auto;height:auto;inset:2px;border-radius:7px;background:rgba(244,63,94,.14);border:3px solid #fb7185}
.cc-c.pick{box-shadow:inset 0 0 0 3px #fde68a}
.cc-c.mt{outline:2px solid rgba(96,165,250,.85);outline-offset:-2px}
.cc-c.mf::before{content:"";position:absolute;inset:30%;border-radius:50%;border:2px dotted rgba(96,165,250,.8);pointer-events:none}
.cc-bang{position:absolute;right:0;top:0;width:18px;height:18px;border-radius:50%;background:#e11d48;color:#fff;font:900 12px/18px var(--round);text-align:center;box-shadow:0 0 0 1.5px #fff;z-index:2;pointer-events:none}
.cc-hand{flex:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr);gap:6px}
.cc-card{position:relative;display:flex;align-items:center;gap:6px;text-align:left;border:1.5px solid rgba(255,255,255,.18);background:linear-gradient(165deg,rgba(255,255,255,.07),rgba(0,0,0,.28));border-radius:12px;padding:5px 6px;color:var(--ink);font:inherit;min-width:0}
button.cc-card{cursor:pointer;-webkit-tap-highlight-color:transparent}
.cc-card .tx{display:grid;gap:1px;min-width:0}
.cc-card b{font:900 14px var(--round);color:#fff;white-space:nowrap}
.cc-card small{font-size:10.5px;line-height:1.2;color:var(--soft);word-break:keep-all}
.cc-card.on{border-color:#fde68a;box-shadow:0 0 0 2px #fde68a;background:linear-gradient(165deg,rgba(245,179,1,.25),rgba(0,0,0,.25))}
.cc-card.ok{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.6)}
.cc-card.no{opacity:.4}
.cc-card.wt{border-style:dashed;opacity:.85}
.cc-card.sm{padding:3px 6px;border-radius:9px;--q:4px}
.cc-card.sm b{font-size:12.5px}
.cc-dg{display:grid;grid-template-columns:repeat(5,var(--q,7px));gap:1px;flex:none}
.cc-dg i{width:var(--q,7px);height:var(--q,7px);border-radius:2px;background:rgba(255,255,255,.1)}
.cc-dg i.c{background:#94a3b8}.cc-dg i.d{background:#4ade80}.cc-dg i.n{background:rgba(148,163,184,.5)}
.cc-info{flex:none;text-align:center;font-size:12.5px;line-height:1.4;color:var(--soft);min-height:2.8em;display:grid;place-items:center;border-radius:12px;border:1px solid transparent;padding:3px 8px}
.cc-info b{color:#fde68a}
.cc-info.warn{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5);font-weight:800}
.cc-info.good{color:#bbf7d0;background:rgba(34,197,94,.14);border-color:rgba(74,222,128,.45);font-weight:800}
.cc-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4);font-weight:800}
.cc-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.cc-tut .cc-wrap{width:min(100%,232px)}
.cc-tut .cc-board{padding:3px;gap:2px;border-radius:10px}
.cc-tut .cc-lb{display:none}
.cc-tut .cc-ar{font-size:13px}
.cc-cards{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.cc-flow{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}
.cc-flow .ar{font:900 16px var(--round);color:#fde68a}
.cc-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.cc-tmsg b{color:#fde68a}
@media (max-height:660px){.cc-card small{display:none}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || SIDE[i];

  const dg = card => {
    const on = PAT[card] || [];
    let g = "";
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const d = on.some(p => p[0] === r && p[1] === c), n = card === 4 && NEAR.some(p => p[0] === r && p[1] === c);
      g += `<i${r === 2 && c === 2 ? ' class="c"' : d ? ' class="d"' : n ? ' class="n"' : ""}></i>`;
    }
    return `<span class="cc-dg" aria-hidden="true">${g}</span>`;
  };
  const tile = (card, o = {}) => {
    const t = o.btn ? "button" : "div", at = o.btn ? ` type="button" data-card="${o.slot}"${o.tp ? ' data-tp="1"' : ""}` : "";
    return `<${t} class="cc-card${o.cls ? " " + o.cls : ""}"${at}>${dg(card)}<span class="tx"><b>${CN[card]}</b>${o.note === false ? "" : `<small>${o.sub || NOTE[card]}</small>`}</span></${t}>`;
  };
  const piece = (o, up, cls = "") => `<span class="cc-p ${o === 1 ? "w" : "b"}${cls}"><i class="cc-ar">${up ? "▲" : "▼"}</i></span>`;

  // 눌러 둔 것 (이 기기에서만 · 차례가 바뀌면 지움): 카드 · 말 · 갈 칸 — 어느 것부터 눌러도 됨
  let SEL = { key: "", card: -1, from: -1, to: -1 };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.set}|${V.tc}|${V.turn}|${ctx.me}`; if (SEL.key !== key) SEL = { key, card: -1, from: -1, to: -1 }; return SEL; };

  // 이긴 이유 (보는 사람 기준): w = 이긴 자리 · me = 내 자리(-1 = 구경)
  const whyOf = (why, w, me) => {
    if (why === "turns") return "60턴이 지나(또는 둘 다 못 움직여) 말 수로 가렸어요";
    const win = me >= 0 ? w === me : null, nm = SIDE[w];
    if (why === "wipe") return me < 0 ? `${nm}이 상대 말을 모두 없앴어요` : win ? "상대 말을 모두 없앴어요" : "내 말이 모두 사라졌어요";
    if (why === "castle") return me < 0 ? `${nm} 말이 상대 성에서 한 턴을 버텼어요` : win ? "내 말이 상대 성에서 한 턴을 버텼어요" : "상대 말이 내 성에서 한 턴을 버텼어요";
    return "";
  };

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, play = V.phase === "play" && !over;
    const can = !!ctx.canAct && me >= 0 && play, flip = me === 1;
    const bot = me >= 0 ? me : 0, top = 1 - bot;
    const S = selFor(V, ctx);
    const L = can ? Q.legal(V, me) : [];
    const mset = m => (S.card < 0 || m.slot === S.card) && (S.from < 0 || m.from === S.from) && (S.to < 0 || m.to === S.to);
    const okSel = () => L.some(mset);
    const fix = keep => { for (const k of ["to", "from", "card"]) { if (k === keep) continue; if (okSel()) return; S[k] = -1; } };
    const exec = () => {
      if (S.to < 0) return false;
      const ms = L.filter(mset);
      if (ms.length !== 1) return false;
      const m = ms[0]; S.card = S.from = S.to = -1;
      ctx.sfx(V.cells[m.to] ? "pop" : "tap");
      const r = ctx.act({ t: "mv", slot: m.slot, from: m.from, to: m.to });
      if (r && r.ok === false) render(stage, V, ctx);
      return true;
    };
    fix("none");
    const cs = L.filter(m => (S.card < 0 || m.slot === S.card) && (S.from < 0 || m.from === S.from));        // 갈 칸 후보
    const tgt = new Set((S.card >= 0 || S.from >= 0) ? cs.map(m => m.to) : []);
    const movers = new Set(L.filter(m => (S.card < 0 || m.slot === S.card) && (S.to < 0 || m.to === S.to)).map(m => m.from));
    const amb = S.to >= 0 ? L.filter(mset) : [];
    const ambSlots = new Set(amb.map(m => m.slot)), ambFrom = new Set(amb.map(m => m.from));
    const askCard = amb.length > 1 && ambSlots.size > 1, askPiece = amb.length > 1 && ambFrom.size > 1;
    const hang = new Set(ctx.coachOn && me >= 0 && play ? Q.attacked(V, me) : []);                          // '!' = 선생님이 말하는 잡힐 내 말
    const order = []; for (let i = 0; i < NS; i++) order.push(flip ? NS - 1 - i : i);

    const cell = i => {
      const o = V.cells[i], f = V.face[i], r = (i / SZ) | 0, c = i % SZ, ci = V.castle.indexOf(i);
      let cls = `cc-c ${(r + c) % 2 ? "l2" : "l1"}`;
      if (ci >= 0) cls += " cs";
      if (tgt.has(i)) cls += o ? " tg cap" : " tg";
      if (S.to === i) cls += " pick";
      if (V.last && V.phase === "play") { if (V.last.to === i) cls += " mt"; else if (V.last.from === i) cls += " mf"; }
      let inner = "";
      if (o) {
        const mine = can && o === me + 1, up = (f < 0) !== flip;
        let pc = "";
        if (mine && S.from === i) pc += " sel";
        else if (mine && movers.has(i)) pc += " mv";
        if (mine && askPiece && ambFrom.has(i)) pc += " ask";
        inner += piece(o, up, pc);
      }
      if (ci >= 0) inner += `<i class="cc-cs">🏰</i>`;
      inner += `<i class="cc-lb">${lbl(i)}</i>`;
      if (o && hang.has(i)) inner += `<span class="cc-bang">!</span>`;
      const what = o ? `${SIDE[o - 1]} 말` : "빈칸";
      return `<button type="button" class="${cls}" data-c="${i}" aria-label="${lbl(i)} ${what}${ci >= 0 ? ", " + SIDE[ci] + " 성" : ""}">${inner}</button>`;
    };

    // 윗줄
    const turnTxt = over ? "끝" : V.phase === "between" ? "세트 끝" : can ? "내 차례" : `${esc(nameOf(ctx, V.turn))} 차례`;
    let h = `<div class="cc-top"><span class="cc-pill ${over || V.phase === "between" ? "" : can ? "me" : "turn"}">${turnTxt}</span>`;
    if (V.sets > 1) h += `<span class="cc-pill sm">세트 ${V.set} · ${me >= 0 ? `내 ${V.wins[me]} : ${V.wins[1 - me]} 상대` : `백 ${V.wins[0]} : ${V.wins[1]} 흑`}</span>`;
    h += `</div>`;
    h += `<div class="cc-opp"><span class="cc-ol">${me >= 0 ? "상대" : SIDE[top]} 카드</span>${V.hand[top].map(c => tile(c, { cls: "sm", note: false })).join("")}</div>`;
    h += `<div class="cc-wrap"><div class="cc-board">${order.map(cell).join("")}</div></div>`;
    // 내 카드 둘 + 대기 카드
    const slotCls = s => {
      if (!can) return "";
      const used = L.some(m => m.slot === s), fits = L.some(m => m.slot === s && (S.from < 0 || m.from === S.from) && (S.to < 0 || m.to === S.to));
      let c = "";
      if (S.card === s) c += " on";
      else if (!used) c += " no";
      else if (S.card < 0 && (S.from >= 0 || S.to >= 0) && fits) c += " ok";
      return c;
    };
    h += `<div class="cc-hand">${V.hand[bot].map((c, s) => tile(c, { btn: can, slot: s, cls: slotCls(s).trim() })).join("")}${tile(V.wait, { cls: "wt", sub: "대기 카드" })}</div>`;

    // 아래 안내 (곧 끝나는 세트 · 성 경고 · 할 일)
    let info = "", ic = "";
    const lastSet = V.res;
    if (V.phase === "between" && lastSet) {
      const w = lastSet.w;
      info = `${w < 0 ? "🤝 이 세트는 비겼어요 (다시 해요)" : me >= 0 ? (w === me ? "🏆 이번 세트는 내가 이겼어요" : "😵 이번 세트는 졌어요") : `🏆 ${SIDE[w]} 승`}${w >= 0 ? ` · ${whyOf(lastSet.why, w, me)}` : ""} — 곧 다음 세트`;
      ic = w >= 0 && me >= 0 && w !== me ? " warn" : " good";
    } else if (over) {
      const R = V.ranks || [0, 0], w = R[0] === R[1] ? -1 : R[0] === 0 ? 0 : 1;
      info = w < 0 ? "🤝 무승부" : me >= 0 ? (w === me ? "🏆 내가 이겼어요!" : "😵 졌어요") : `🏆 ${SIDE[w]} 승!`; ic = w >= 0 && me >= 0 && w !== me ? " warn" : " good";
    } else if (play) {
      const oc = V.castle[1 - bot], mc = V.castle[bot];
      if (can && amb.length > 1) info = askCard ? "<b>어느 카드로</b> 움직일까요? 반짝이는 카드를 눌러요" : "<b>어느 말을</b> 움직일까요? 반짝이는 말을 눌러요";
      else if (me >= 0 && V.cells[oc] === me + 1) { info = "🏰 내 말이 상대 성에 올라 있어요 — 상대가 이번에 못 잡으면 내가 이겨요!"; ic = " good"; }
      else if (me >= 0 && V.cells[mc] === (1 - me) + 1) { info = "⚠️ 상대 말이 내 성에 올라 있어요 — 이번 차례에 잡지 못하면 져요!"; ic = " warn"; }
      else if (me < 0 && (V.cells[V.castle[0]] === 2 || V.cells[V.castle[1]] === 1)) { const k = V.cells[V.castle[0]] === 2 ? 0 : 1; info = `🏰 ${SIDE[1 - k]} 말이 ${SIDE[k]} 성에 올라 있어요 — ${SIDE[k]}이 못 잡으면 ${SIDE[1 - k]} 승`; ic = " mid"; }
      else if (can) {
        if (S.card >= 0 && S.from < 0) info = `<b>${CN[V.hand[me][S.card]]}</b> 카드로 움직일 말을 눌러요 (노란 테두리 말)`;
        else if (S.from >= 0) info = `갈 칸을 눌러요 (초록 점 · 빨간 테두리 = 상대 말 잡기)${S.card < 0 ? " — 두 카드로 갈 수 있는 칸이 같이 보여요" : ""}`;
        else info = `<b>카드</b>를 고르고 → <b>말</b>을 누르고 → <b>갈 칸</b>을 눌러요 (말부터 눌러도 돼요)`;
      } else info = `${esc(nameOf(ctx, V.turn))} 차례예요…${V.log.length && V.log[V.log.length - 1].k === "pass" ? " (움직일 수 없어 넘긴 차례가 있었어요)" : ""}`;
    }
    h += `<div class="cc-info${ic}"><span>${info}</span></div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!can) return;
      const cd = e.target.closest("[data-card]"), ce = e.target.closest("[data-c]");
      if (cd) {
        const s = +cd.dataset.card;
        if (!L.some(m => m.slot === s)) { ctx.toast("이 카드로는 움직일 수 있는 말이 없어요", 1400); return; }
        S.card = S.card === s ? -1 : s; fix("card"); ctx.sfx("tap");
        if (!exec()) render(stage, V, ctx);
        return;
      }
      if (!ce) return;
      const c = +ce.dataset.c;
      if (cs.some(m => m.to === c)) {                                              // 갈 칸 (카드 · 말을 골라 둔 상태에서)
        S.to = S.to === c ? -1 : c; fix("to"); ctx.sfx("tap");
        if (!exec()) render(stage, V, ctx);
        return;
      }
      if (V.cells[c] === me + 1) {                                                 // 내 말
        if (!L.some(m => m.from === c)) { ctx.toast("그 말은 지금 갈 곳이 없어요", 1400); return; }
        S.from = S.from === c ? -1 : c; fix("from"); ctx.sfx("tap");
        if (!exec()) render(stage, V, ctx);
        return;
      }
      if (L.some(m => m.to === c)) {                                               // 갈 칸부터 눌러 본 경우 (카드 · 말은 뒤에 고름)
        S.to = c; fix("to"); ctx.sfx("tap");
        if (!exec()) render(stage, V, ctx);
        return;
      }
      S.card = S.from = S.to = -1; render(stage, V, ctx);
    };
  }

  // ── 선생님 (판이 모두 보이는 게임 — 보이는 그대로 읽음) ──
  const cardOf = (V, s, slot) => CN[V.hand[s][slot]];
  function whyText(r) {
    const t = r.tags, out = [];
    if (t.includes("win")) out.push("상대 말이 모두 사라져서 바로 이겨요");
    if (t.includes("capture")) out.push("상대 말을 잡아요");
    if (t.includes("castle")) out.push("상대 성에 올라가요 — 상대가 다음 차례에 이 말을 잡지 못하면 이겨요");
    if (t.includes("defend")) out.push("내 성에 올라온 상대 말을 잡아서 막아요");
    if (t.includes("escape")) out.push("잡힐 뻔한 말을 안전한 곳으로 피해요");
    if (t.includes("trade")) out.push("잡긴 하지만 바로 되잡힐 수 있어요 (맞교환)");
    else if (t.includes("danger")) out.push("도착 칸이 상대 카드로 잡힐 수 있어요 (그래도 가장 낫다고 읽었어요)");
    else if (t.includes("safe")) out.push("도착 칸은 상대 카드로 닿지 않아 안전해요");
    return out.length ? out.join(" · ") : "무난한 수예요";
  }
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, A = Q.analyze(V, me), over = !!V.over, play = V.phase === "play" && !over;
    const ev = V.log.filter(e => e.i > since);
    // 👀 상대 흐름
    const mv = ev.filter(e => e.s === opp && (e.k === "mv" || e.k === "pass")), p = [];
    if (!mv.length) p.push(V.tc === 0 ? "아직 아무도 말을 움직이지 않았어요." : "내 지난 차례 뒤 상대가 움직인 건 없어요.");
    if (mv.length) {
      const e = mv[mv.length - 1], more = mv.length > 1 ? ` (그 전에도 ${mv.length - 1}번 더 움직였어요)` : "";
      if (e.k === "pass") p.push(`상대는 움직일 수 있는 수가 없어 차례를 넘겼어요${more}.`);
      else p.push(`상대가 ${CN[e.c]} 카드로 ${lbl(e.from)} → ${lbl(e.to)} 로 움직였어요${e.cap ? " — 내 말을 잡았어요" : ""}${more}.`);
    }
    if (play) {
      if (V.cells[V.castle[me]] === opp + 1) p.push(`⚠️ 상대 말이 내 성(${lbl(V.castle[me])})에 올라 있어요 — 이번 차례에 잡지 못하면 져요!`);
      else if (A.hanging.length) p.push(`${V.turn === me ? "지금 그대로라면 상대가 다음 차례에" : "상대가 이번 차례에"} 잡을 수 있는 내 말이 ${A.hanging.length}개예요 (${A.hanging.map(lbl).join(" · ")}) — 판에 '!' 로 표시했어요.`);
      else p.push("지금은 상대가 바로 잡을 수 있는 내 말이 없어요.");
      p.push(`상대 앞 카드 — ${CN[V.hand[opp][0]]} · ${CN[V.hand[opp][1]]}.`);
    }
    // 📊 내 흐름
    const caps = s => ev.filter(e => e.k === "mv" && e.s === s && e.cap).length;
    let m = `내 말(${SIDE[me]}) ${V.counts[me]}개 · 상대 ${V.counts[opp]}개예요.`;
    if (since >= 0 && (caps(me) || caps(opp))) m += ` 지난 내 차례 뒤 내가 ${caps(me)}개 잡고 ${caps(opp)}개 잡혔어요.`;
    if (V.sets > 1) m += ` 세트는 ${V.set}세트째, 내 ${V.wins[me]} : ${V.wins[opp]} 상대.`;
    if (play && V.cells[V.castle[opp]] === me + 1) m += " 내 말이 상대 성에 올라 있어요!";
    if (play) m += ` 내 앞 카드는 ${CN[V.hand[me][0]]} · ${CN[V.hand[me][1]]}, 대기 카드는 ${CN[V.wait]}.`;
    if (play && V.turn === me && A.targets.length) m += ` 지금 잡을 수 있는 상대 말이 ${A.targets.length}개 있어요 (${A.targets.map(lbl).join(" · ")}).`;
    // 💡 추천 · 👉 뜻
    let rec, why = "";
    if (over) rec = "끝났어요.";
    else if (V.phase === "between") rec = "세트가 끝났어요 — 곧 다음 세트가 시작돼요.";
    else if (V.turn !== me) rec = "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else if (!A.rec) rec = "움직일 수 있는 수가 없어서 차례가 넘어가요.";
    else { const a = A.rec.a; rec = `${cardOf(V, me, a.slot)} 카드로 ${lbl(a.from)} 의 말을 ${lbl(a.to)} 로 움직이기${V.cells[a.to] ? " (상대 말 잡기)" : ""}.`; why = whyText(A.rec); }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  function result(V, me) {
    const sets = V.log.filter(e => e.k === "set"), who = s => me === s ? `나(${SIDE[s]})` : me >= 0 ? `상대(${SIDE[s]})` : SIDE[s];
    const rows = sets.map(e => `${V.sets > 1 ? `${e.set}세트 ` : ""}${e.w < 0 ? "무승부 — 말 수가 같았어요" : `${who(e.w)} 승 — ${whyOf(e.why, e.w, me)}`}`);
    const head = V.sets > 1 ? `<b>세트 ${who(0)} ${V.wins[0]} : ${V.wins[1]} ${who(1)}</b>` : `<b>${V.wins[0] === V.wins[1] ? "무승부" : `${who(V.wins[0] > V.wins[1] ? 0 : 1)} 승`}</b>`;
    return `${head}<br>${rows.join("<br>")}`;
  }

  // ── 1분 규칙 ──
  function mini(cells, o = {}) {
    const t = o.btn ? "button" : "span", at = o.btn ? ' type="button"' : "";
    let g = "";
    for (let i = 0; i < NS; i++) {
      const r = (i / SZ) | 0, c = i % SZ, ci = i === 22 ? 0 : i === 2 ? 1 : -1;
      const cls = `cc-c ${(r + c) % 2 ? "l2" : "l1"}${ci >= 0 && o.cs !== false ? " cs" : ""}${(o.tg || []).includes(i) ? ((o.cap || []).includes(i) ? " tg cap" : " tg") : ""}`;
      const up = (o.faces || {})[i] != null ? o.faces[i] < 0 : cells[i] === 1;
      g += `<${t}${at} class="${cls}" data-c="${i}"${(o.tp || []).includes(i) ? ' data-tp="1"' : ""}>${cells[i] ? piece(cells[i], up, (o.sel || []).includes(i) ? " sel" : "") : ""}${ci >= 0 && o.cs !== false ? `<i class="cc-cs">🏰</i>` : ""}</${t}>`;
    }
    return `<div class="cc-wrap"><div class="cc-board">${g}</div></div>`;
  }
  const start = () => { const c = Array(NS).fill(0); for (let i = 0; i < 5; i++) { c[20 + i] = 1; c[i] = 2; } return c; };
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 목표", title: "상대 말 전멸, 또는 성 버티기", body: "5×5 판에 말이 <b>5개씩</b> 첫 줄에 서 있고, 모두 상대 쪽(▲▼)을 봐요. 상대 말을 <b>모두 없애거나</b>, 내 말을 <b>상대 성(🏰, 상대 첫 줄 가운데)</b>에 올려서 한 턴을 버티면 이겨요.",
        boardHtml: `<div class="cc-tut">${mini(start())}</div>`, ms: 5600 },
      { tag: "STEP 2 · 카드", title: "카드가 움직임을 정해요", body: "카드 5장: 내 앞 2장 · 상대 앞 2장 · 대기 1장. 말은 다 같고 <b>카드가 어떻게 움직일지</b> 정해요 (초록 칸). 어태커는 말이 <b>보는 쪽</b>으로 가요. 점퍼는 <b>붙은 말을 뛰어넘어</b> 바로 뒤에 내려요.",
        boardHtml: `<div class="cc-tut"><div class="cc-cards">${[0, 1, 2, 3, 4].map(c => tile(c, { cls: "sm" })).join("")}</div></div>`, ms: 6400 },
      { tag: "STEP 3 · 한 턴", title: "카드 → 말 → 칸", body: "내 차례: ① 앞 카드 2장 중 <b>1장</b> 고르기 ② <b>말</b> 누르기 ③ <b>갈 칸</b> 누르기 (말부터 눌러도 돼요). 상대 말이 있으면 <b>잡아요</b>. 쓴 카드는 대기로, 대기 카드가 내 앞으로 와요.",
        boardHtml: `<div class="cc-tut"><div class="cc-flow">${tile(0, { cls: "sm" })}${tile(1, { cls: "sm" })}<span class="ar">➜ 쓴 카드는</span>${tile(3, { cls: "wt sm" })}</div><div class="cc-tmsg">쓴 카드는 <b>대기</b> 자리로, 대기 카드는 <b>내 앞</b>으로 돌아요</div></div>`, ms: 5600 },
      { tag: "STEP 4 · 직접", title: "비숍으로 상대 말 잡기", body: "내 앞 카드는 <b>룩 · 비숍</b>이에요. <b>비숍 카드</b>를 고르고 → 내 말(▲) → 대각선의 상대 말을 눌러 잡아 봐요!",
        interactive: { hint: "👆 반짝이는 것을 차례로 눌러요", doneText: "✅ 비숍으로 대각선 상대 말을 잡았어요!" },
        render(stage, ctrl) {
          const cells = Array(NS).fill(0); cells[17] = 1; cells[11] = 2; cells[3] = 2; cells[22] = 1;
          const faces = { 17: -1, 22: -1, 11: 1, 3: 1 };
          let card = -1, from = -1, done = false, msg = "카드를 고르고 → 내 말을 누르고 → 갈 칸을 눌러요";
          const draw = () => {
            const tg = from === 17 ? (card === 1 ? [11, 13, 21, 23] : card === 0 ? [12, 16, 18] : []) : [];
            const nextCard = card !== 1, nextPiece = card === 1 && from < 0, nextDest = card === 1 && from === 17;
            stage.innerHTML = `<div class="cc-tut">${mini(cells, { btn: true, faces, tg, cap: [11], sel: from === 17 ? [17] : [], tp: done ? [] : nextPiece ? [17] : nextDest ? [11] : [] })}
              <div class="cc-hand" style="width:100%;grid-template-columns:1fr 1fr">${tile(0, { btn: true, slot: 0, cls: card === 0 ? "on" : "", note: false })}${tile(1, { btn: true, slot: 1, cls: card === 1 ? "on" : "", note: false, tp: !done && nextCard })}</div>
              <div class="cc-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            if (done) return;
            const cd = e.target.closest("[data-card]"), ce = e.target.closest("[data-c]");
            if (cd) {
              card = +cd.dataset.card; from = -1; ctrl.sfx("tap");
              msg = card === 1 ? "비숍은 <b>대각선 1칸</b>이에요. 이제 내 말(아래쪽 ▲)을 눌러요" : "룩은 상하좌우뿐이라 대각선의 상대 말을 못 잡아요. <b>비숍</b>을 골라요";
              draw(); return;
            }
            if (!ce) return;
            const c = +ce.dataset.c;
            if (c === 17) { if (card < 0) { msg = "먼저 위에서 <b>비숍 카드</b>를 골라요"; ctrl.sfx("tap"); draw(); return; } from = from === 17 ? -1 : 17; ctrl.sfx("tap"); msg = from === 17 ? "초록 점 · 빨간 테두리가 갈 수 있는 칸이에요. 빨간 테두리(상대 말)를 눌러요" : "내 말을 눌러요"; draw(); return; }
            if (from === 17 && card === 1 && c === 11) {
              cells[11] = 1; cells[17] = 0; faces[11] = -1; done = true; from = -1; ctrl.sfx("win");
              msg = "🏆 <b>잡았어요!</b> 상대 말은 사라지고 내 말이 그 칸에 서요"; draw(); ctrl.complete(); return;
            }
            ctrl.sfx("tap");
          };
          draw();
        } },
      { tag: "STEP 5 · 특수", title: "끝 줄에서 뒤돌아봐요", body: "말이 <b>보는 쪽 끝 줄</b>에 닿으면 뒤를 돌아봐요 (▲ → ▼, 어태커 방향도 바뀌어요). 판 위 말이 <b>2개만</b> 남으면 점퍼 카드는 <b>퀸</b>(8방향 1칸)이 돼요.",
        boardHtml: `<div class="cc-tut">${mini((() => { const c = Array(NS).fill(0); c[2] = 1; c[22] = 1; c[12] = 2; return c; })(), { faces: { 2: 1, 22: -1, 12: 1 } })}<div class="cc-flow">${tile(4, { cls: "sm", note: false })}<span class="ar">말 2개 → </span>${tile(5, { cls: "sm", note: false })}</div></div>`, ms: 6200 },
      { tag: "STEP 6 · 승패", title: "한 세트 · 세트 옵션", body: "성 버티기: 내 말이 상대 성에 올라 있는데 <b>상대가 다음 차례에 못 잡으면</b> 이겨요. 움직일 수 없으면 차례를 넘기고, 60턴이 넘으면 말이 많은 쪽 승. 3세트 옵션은 <b>먼저 2승</b> (2세트부터 진 쪽이 먼저). 막히면 <b>🧑‍🏫 AI 선생님</b>이 추천해요.",
        boardHtml: `<div class="cc-tut"><span style="font-size:42px">🏰</span></div>`, ms: 6000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.cardchess = {
    name: "카드 체스", emoji: "♟️", short: "카드가 움직임을 정하는 5×5 1:1", min: 2, max: 2, defN: 2, board: true,
    opts: [{ k: "sets", label: "세트 수", items: [[1, "1세트"], [3, "3세트 (먼저 2승)"]], def: 3 }],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 상대 말을 <b>모두 없애거나</b>, 내 말을 <b>상대 성(🏰)</b>에 올리고 한 턴을 버텨요",
      "5×5 판, 말 5개씩 (모두 상대 쪽 ▲▼ 을 봐요) · 성 = 각자 첫 줄 가운데 칸 · 카드 5장: 룩 · 비숍 · 어태커 · 나이트 · 점퍼 (내 앞 2 · 상대 앞 2 · 대기 1)",
      "내 차례: 앞 카드 <b>1장</b> → 그 카드대로 말 <b>1개</b> 이동 · 상대 말이 있는 칸이면 <b>잡기</b> · 쓴 카드는 대기로, 대기 카드가 내 앞으로",
      "룩 상하좌우 1 · 비숍 대각선 1 · 어태커 보는 쪽 직진 2 또는 앞 대각선 1 · 나이트 2칸+직각 1(뛰어넘음) · 점퍼 붙은 말 뛰어넘기 (말이 2개만 남으면 퀸 = 8방향 1칸)",
      "말이 보는 쪽 끝 줄에 닿으면 <b>뒤돌아봐요</b>",
      "승리: 상대 전멸, 또는 내 말이 상대 성에 올라 있는데 상대가 다음 차례에 못 잡으면 승 · 60턴이 넘으면 말이 많은 쪽 · 3세트 옵션은 먼저 2승",
      SRC, DIFF,
    ],
    sub: V => V.over ? "끝" : `${V.sets > 1 ? `${V.set}세트 · ` : ""}${Math.min(V.tc + 1, V.maxTurn)} / ${V.maxTurn}턴`,
    chip: (V, i) => ({ t: V.sets > 1 ? `${V.wins[i]}승 · ${V.counts[i]}개` : `${V.counts[i]}개`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial,
    qa: (V, me, rnd) => Q.ai(V, me, "easy", rnd),
  };
})();

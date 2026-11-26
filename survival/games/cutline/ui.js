/* 베니 서바이벌 · 커트라인 — 화면 (순서 입찰 · 순서 정하기 · 슬롯 A~D에 카드 놓기 · 규칙 카드 · 공개 · 1분 규칙 · AI 선생님) */
(() => {
  "use strict";
  const K = window.SVCores.cutline;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SL = K.SL, PTS = K.PTS, RT = K.RULE_TXT;
  const PAL = ["#4ade80", "#f472b6", "#60a5fa", "#facc15", "#fb923c", "#a78bfa", "#2dd4bf", "#f87171"];
  const CSS = `
.ct-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap;min-height:26px}
.ct-rd{font:900 13px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:2px 10px;white-space:nowrap}
.ct-ph{font:800 12px var(--round);color:#fde68a;white-space:nowrap}
.ct-me{margin-left:auto;display:flex;gap:5px;align-items:center;font:800 12px var(--round);white-space:nowrap}
.ct-me span{background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:2px 8px;color:#fde68a}
.ct-me span.rl{color:#c4b5fd;border-color:rgba(167,139,250,.5)}
.ct-me span.rl.x{opacity:.45;text-decoration:line-through}
.ct-ord{display:flex;gap:3px;align-items:center;flex:none;overflow:hidden}
.ct-ord small{font-size:10.5px;color:var(--soft);white-space:nowrap;margin-right:2px}
.ct-od{display:grid;place-items:center;min-width:22px;height:20px;padding:0 3px;border-radius:6px;font:800 10.5px var(--round);color:#0f172a;opacity:.55}
.ct-od.now{opacity:1;box-shadow:0 0 0 2px #fff}
.ct-od.me{outline:2px solid #86efac;outline-offset:1px}
.ct-od.done{opacity:.3}
.ct-board{display:grid;gap:4px;flex:none}
.ct-row{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr);gap:5px;align-items:center;min-height:44px;padding:3px 5px;border-radius:11px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.09)}
.ct-row.tgt{border-color:#fde68a;background:rgba(245,179,1,.08);cursor:pointer}
.ct-row.full{opacity:.75}
.ct-lb{display:grid;justify-items:center;line-height:1.05}
.ct-lb b{font:900 17px var(--round);color:#fff}
.ct-lb small{font:700 10px var(--round);color:var(--soft);white-space:nowrap}
.ct-lb small.hot{color:#fde68a}
.ct-mini{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;flex:none}
.ct-mini span{display:grid;justify-items:center;padding:3px 2px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.09);line-height:1.15}
.ct-mini b{font:900 15px var(--round);color:#fff}
.ct-mini small{font:700 10px var(--round);color:var(--soft)}
.ct-mini i{font-style:normal;font:700 9.5px var(--round);color:var(--soft);opacity:.8;white-space:nowrap}
.ct-lock{flex:none;text-align:center;font-size:11px;color:var(--soft);line-height:1.3}
.ct-cells{display:flex;gap:3px;flex-wrap:nowrap;min-width:0}
.ct-c{--oc:#64748b;position:relative;display:grid;place-items:center;width:30px;height:36px;flex:none;border-radius:7px;background:#f8fafc;color:#0f172a;border:2px solid var(--oc);border-top-width:5px;font:900 16px/1 var(--round)}
.ct-c i{position:absolute;top:-1px;left:0;right:0;text-align:center;font:800 8px/1 var(--round);font-style:normal;color:#334155;opacity:.85;overflow:hidden;white-space:nowrap}
.ct-c b{margin-top:6px}
.ct-c.back{background:repeating-linear-gradient(45deg,#1e293b 0 4px,#273449 4px 8px);color:#94a3b8;font-size:13px}
.ct-c.back i{color:#e2e8f0}
.ct-c.mine{box-shadow:0 0 0 2px #86efac}
.ct-c.pend{border-style:dashed;background:#fef3c7}
.ct-c.empty{background:transparent;border:1.5px dashed rgba(255,255,255,.18);border-top-width:1.5px}
.ct-c.reg{background:#dcfce7}
.ct-c.reg::after{content:"✓";position:absolute;right:-3px;bottom:-5px;font:900 11px/1 var(--round);color:#16a34a;background:#f0fdf4;border-radius:99px;padding:1px 2px}
.ct-c.drop{background:#fee2e2;color:#b91c1c;opacity:.75}
.ct-c.drop b{text-decoration:line-through}
.ct-c.gone{background:#e2e8f0;color:#64748b;opacity:.6}
.ct-c.gone b{text-decoration:line-through}
.ct-c u{position:absolute;bottom:1px;left:0;right:0;text-align:center;text-decoration:none;font:800 7.5px/1 var(--round);color:#7c3aed}
.ct-lb em{font:800 9.5px/1.1 var(--round);font-style:normal;color:#c4b5fd;white-space:nowrap}
.ct-lb em.mine{color:#86efac}
.ct-lb em.pend{color:#fbbf24}
.ct-rules{flex:none;font-size:11px;color:#e9d5ff;text-align:center;line-height:1.35}
.ct-rules b{color:#fff}
.ct-hand{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;flex:none}
.ct-h{position:relative;display:grid;justify-items:center;align-content:center;gap:1px;min-height:46px;border-radius:10px;border:2px solid #64748b;background:#f8fafc;color:#0f172a;padding:2px 0;font:900 19px/1 var(--round)}
.ct-h small{font:800 9.5px/1 var(--round);color:#475569}
.ct-h.sel{background:#fef3c7;border-color:#f59e0b;transform:translateY(-3px)}
.ct-h:disabled{opacity:.3}
.ct-h.hi small{color:#b45309}
.ct-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.ct-note{text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.ct-note b{color:#fde68a}
.ct-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ct-two.one{grid-template-columns:1fr}
.ct-two .btn{padding:11px 4px;font:800 14px var(--round);min-height:44px}
.ct-step{display:grid;grid-template-columns:44px 1fr 44px;gap:6px;align-items:center}
.ct-step .btn{min-height:44px;padding:0;font:900 18px var(--round)}
.ct-step output{text-align:center;font:900 20px var(--round);color:#fde68a}
.ct-rule{display:grid;grid-template-columns:1fr 44px 52px 44px;gap:5px;align-items:center}
.ct-rule .btn{min-height:44px;padding:0 6px;font:800 13px var(--round)}
.ct-rule output{text-align:center;font:900 16px var(--round);color:#fde68a;white-space:nowrap}
.ct-rule.solo{grid-template-columns:1fr}
.ct-pl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
.ct-pl .btn{min-height:44px;padding:2px;font:800 12.5px var(--round);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-msg{flex:none;text-align:center;font:800 12.5px var(--round);color:#fde68a;line-height:1.4}
.ct-gain{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;flex:none}
.ct-gain span{font:800 11.5px var(--round);border-radius:99px;padding:2px 8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.14)}
.ct-gain span.me{border-color:#86efac;color:#86efac}
.ct-tut{display:grid;gap:8px;justify-items:center;width:100%}
.ct-tut small{font-size:12px;color:var(--soft);text-align:center;line-height:1.45}
.ct-tut .ct-board{width:100%;max-width:340px}
.ct-pts{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
.ct-pts span{font:800 12px var(--round);border-radius:8px;padding:3px 7px;background:#f8fafc;color:#0f172a}
.ct-pts span b{color:#b45309}
.ct-rl{display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;font-size:11.5px;color:#e9d5ff;width:100%;max-width:340px}
.sv-coachfit .ct-lock,.sv-coachfit .ct-top,.sv-coachfit .ct-ord,.sv-coachfit .ct-note,.sv-coachfit .ct-gain,.sv-coachfit .ct-rules{display:none}
.sv-coachfit .ct-board{gap:3px}
.sv-coachfit .ct-row{min-height:30px;padding:1px 5px;grid-template-columns:46px minmax(0,1fr)}
.sv-coachfit .ct-lb small{font-size:9px}
.sv-coachfit .ct-lb b{font-size:13px;line-height:1}
.sv-coachfit .ct-lb em{display:none}
.sv-coachfit .ct-c{height:27px;width:27px;border-top-width:4px;font-size:13px}
.sv-coachfit .ct-c b{margin-top:5px}
.sv-coachfit .ct-c i{font-size:7px}
.sv-coachfit .ct-c.empty{border-top-width:1.5px}
.sv-coachfit .ct-h{min-height:44px;font-size:17px}
.sv-coachfit .ct-acts{gap:5px}
.sv-coachfit .ct-step .btn,.sv-coachfit .ct-rule .btn,.sv-coachfit .ct-two .btn{min-height:44px;padding-top:4px;padding-bottom:4px}`;
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [], SEL = { key: "" };

  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const josa = (name, a, b) => { const ch = String(name).slice(-1), c = ch.charCodeAt(0); return `${name}${(c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch)) ? a : b}`; };
  const ga = (name, isMe) => (isMe ? "내가" : josa(name, "이", "가"));
  const sum = a => a.reduce((x, y) => x + y, 0);
  // 카드 위 이름 글자: 첫 글자, 겹치면(나비 · AI1 …) 첫 글자 + 끝 글자
  const clean = nm => String(nm || "?").replace(/^[^\p{L}\p{N}]+/u, "") || "?";
  let INI_KEY = "", INI = [];
  function inits(ctx) {
    const ns = (ctx.seats || []).map(s => s && s.name), key = ctx.me + "|" + ns.join("|");
    if (key === INI_KEY) return INI;
    const one = ns.map((n, i) => (i === ctx.me ? "나" : clean(n).slice(0, 1)));
    INI = one.map((x, i) => {
      if (i === ctx.me) return x;
      const c = clean(ns[i]), dup = x === "나" || one.some((y, j) => j !== i && y === x);
      return dup && c.length > 1 ? c.slice(0, 1) + c.slice(-1) : x;
    });
    INI_KEY = key; return INI;
  }
  const ini = (ctx, p) => (p === ctx.me ? "나" : inits(ctx)[p] || String(p + 1));

  // 슬롯 판 (화면 · 1분 규칙 공용) — o: { only, lab, pend, rule, tgt }
  function boardHtml(V, ctx, o) {
    const me = ctx.me, open = V.phase === "show" || V.over, res = open ? V.res : null;
    if (!V.defs) {                                       // 입찰 · 순서 정하기: 이번 라운드 표는 아직 비공개 (1차 제출 때 공개)
      const last = V.hist && V.hist.length ? V.hist[V.hist.length - 1] : null;
      return `<div class="ct-mini">${[0, 1, 2, 3].map(s => `<span><b>${SL[s]}</b><small>?장·?</small>${last ? `<i>지난 ${last.slots[s].max}장·${last.slots[s].lim}</i>` : ""}</span>`).join("")}</div><div class="ct-lock">🔒 이번 라운드 슬롯 표(최대 카드 수 · LIMIT)는 1차 제출 때 공개</div>`;
    }
    return `<div class="ct-board">${(o.only || [0, 1, 2, 3]).map(s => {
      const def = V.defs[s], placed = V.board[s], R = res ? res.slots[s] : null, pend = o.pend ? o.pend.filter(c => c.s === s) : [];
      const full = placed.length + pend.length >= def.max;
      let cells = "";
      for (let i = 0; i < def.max; i++) {
        if (i < placed.length) {
          const c = placed[i], col = PAL[c.p % 8], mine = c.p === me, nm = ini(ctx, c.p);
          if (R) {
            const x = R.cards[i], cls = x.gone ? "gone" : x.reg ? "reg" : "drop";
            cells += `<span class="ct-c ${cls}${mine ? " mine" : ""}" style="--oc:${col}" title="${esc(nameOf(ctx, c.p))}"><i>${esc(nm)}</i><b>${x.val}</b>${x.val !== x.v ? `<u>6→1</u>` : ""}</span>`;
          } else if (c.v != null) cells += `<span class="ct-c${mine ? " mine" : ""}" style="--oc:${col}"><i>${esc(nm)}</i><b>${c.v}</b></span>`;
          else cells += `<span class="ct-c back" style="--oc:${col}"><i>${esc(nm)}</i><b>?</b></span>`;
        } else if (i < placed.length + pend.length) {
          const c = pend[i - placed.length];
          cells += `<span class="ct-c pend mine" style="--oc:${PAL[me % 8]}"><i>나</i><b>${c.v}</b></span>`;
        } else cells += `<span class="ct-c empty"></span>`;
      }
      let lbl = `${def.max}장·${def.lim}`, hot = false, tag = "";
      if (R) {
        lbl = `합 ${R.sum}/${R.effLim}`; hot = R.effLim !== R.lim || R.effMax !== R.max || R.low;
        if (R.rule) tag = `<em class="${R.rule.p === me ? "mine" : ""}">📜${esc(R.rule.r)} ${esc(ini(ctx, R.rule.p))}</em>`;
      } else if (o.rule && o.rule.s === s) tag = `<em class="pend">📜${esc(V.letter)} 🪙${o.rule.c}</em>`;
      else if (V.myRule && V.myRule.s === s) tag = `<em class="mine">📜${esc(V.myRule.r)} 🪙${V.myRule.c}</em>`;
      const tgt = o.tgt && o.tgt(s, full);
      return `<div class="ct-row${tgt ? " tgt" : ""}${full && !R ? " full" : ""}" ${tgt ? `data-slot="${s}" role="button" aria-label="${SL[s]} 슬롯"` : ""}><span class="ct-lb"><b>${(o.lab && o.lab[s]) || SL[s]}</b><small class="${hot ? "hot" : ""}">${lbl}</small>${tag}</span><span class="ct-cells">${cells}</span></div>`;
    }).join("")}</div>`;
  }
  // 공개 때 적용된 규칙 카드 한 줄
  function rulesLine(V, ctx) {
    if (!V.res) return "";
    const xs = V.res.slots.map((R, s) => (R.rule ? `${SL[s]} ← <b>${esc(R.rule.r)}</b> ${esc(RT[R.rule.r])} (${esc(R.rule.p === ctx.me ? "나" : nameOf(ctx, R.rule.p))}${R.lost ? ` · 밀린 규칙 ${R.lost}장` : ""})` : "")).filter(Boolean);
    return xs.length ? `<div class="ct-rules">📜 ${xs.join(" · ")}</div>` : "";
  }

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, ph = V.phase, over = V.over, actor = ctx.canAct && V.needs.includes(me) && !over;
    const key = `${ctx.g}|${V.round}|${ph}|${V.ti}`;
    if (SEL.key !== key) SEL = { key, cards: [], pick: 0, rule: null, ruleMode: false, bid: 0, ord: [] };
    const myTurn = actor && ph === "place", need = V.need;
    const coins = me >= 0 ? V.coins[me] : null;
    // 위 줄: 라운드 · 단계 · 내 코인 · 규칙 카드
    const phTxt = over ? "끝" : ph === "bid" ? "순서 결정권 입찰" : ph === "order" ? "순서 정하는 중" : ph === "place" ? `${V.sec}차 제출 ${V.sec === 1 ? V.ti + 1 : V.ti - V.n + 1}/${V.n}` : "공개 · 등록";
    let h = `<div class="ct-top"><span class="ct-rd">${V.round}/${V.R}라운드</span><span class="ct-ph">${phTxt}</span>${me >= 0 ? `<span class="ct-me"><span>🪙 ${coins}</span>${V.letter ? `<span class="rl${V.ruleUsed ? " x" : ""}">📜 ${esc(V.letter)}</span>` : ""}</span>` : ""}</div>`;
    // 순서 줄 (1차 순서, 지금 차례)
    if (V.ord.length && (ph === "place" || ph === "show")) {
      const t = V.turn;
      h += `<div class="ct-ord"><small>${V.sec === 2 ? "2차(역순)" : "1차 순서"}</small>${V.ord.map((p, k) => { const done = ph === "place" && (V.sec === 1 ? k < V.ti : k > 2 * V.n - 1 - V.ti); return `<span class="ct-od${p === t ? " now" : ""}${p === me ? " me" : ""}${done ? " done" : ""}" style="background:${PAL[p % 8]}">${esc(ini(ctx, p))}</span>`; }).join("")}</div>`;
    }
    // 판
    const pend = myTurn ? SEL.cards : null;
    h += boardHtml(V, ctx, {
      pend, rule: myTurn ? SEL.rule : null,
      tgt: myTurn ? (s, full) => (SEL.ruleMode ? true : SEL.pick > 0 && SEL.cards.length < need && !full) : null,
    });
    // 공개 결과
    if ((ph === "show" || over) && V.res) {
      const g = V.res.gain, order = g.map((x, i) => i).sort((a, b) => g[b] - g[a]);
      h += rulesLine(V, ctx) + `<div class="ct-msg">${V.round}라운드 결과${me >= 0 ? ` · 내 점수 +${g[me]}` : ""}</div><div class="ct-gain">${order.map(i => `<span class="${i === me ? "me" : ""}">${esc(nameOf(ctx, i))} +${g[i]}</span>`).join("")}</div>`;
    }
    // 내 손패
    let mine = "", acts = "";
    if (me >= 0 && V.hand && !over) {
      const used = [0, 0, 0, 0, 0, 0, 0]; for (const c of SEL.cards) used[c.v]++;
      mine = `<div class="ct-hand">${[1, 2, 3, 4, 5, 6].map(v => { const left = V.hand[v] - (myTurn ? used[v] : 0), can = myTurn && left > 0 && SEL.cards.length < need; return `<button type="button" class="ct-h${SEL.pick === v && myTurn ? " sel" : ""}${PTS[v] >= 5 ? " hi" : ""}" data-v="${v}" ${can ? "" : "disabled"} aria-label="숫자 ${v}">${v}<small>×${left} · ${PTS[v]}점</small></button>`; }).join("")}</div>`;
    }
    if (over) acts = `<div class="ct-note">아래 결과 창에서 순위를 볼 수 있어요</div>`;
    else if (me < 0) acts = `<div class="ct-note">구경 중이에요 · 뒷면 카드는 라운드가 끝나야 공개돼요</div>`;
    else if (ph === "bid" && actor) {
      const b = Math.max(0, Math.min(coins, SEL.bid));
      acts = `<div class="ct-note sm">가장 많이 낸 사람이 <b>1차 제출 순서</b>를 정해요 · 낸 코인은 져도 사라지고 액수는 비공개</div><div class="ct-step"><button class="btn" data-a="bm" ${b > 0 ? "" : "disabled"}>−</button><output>🪙 ${b}</output><button class="btn" data-a="bp" ${b < coins ? "" : "disabled"}>+</button></div><div class="ct-two one"><button class="btn primary" data-a="bid">${b ? `코인 ${b}개 입찰` : "입찰 안 함 (0개)"}</button></div>`;
    } else if (ph === "bid") acts = `<div class="ct-note">다른 사람이 입찰하는 중… (${V.bidDone.filter(Boolean).length}/${V.n})</div>`;
    else if (ph === "order" && actor) {
      const left = Array.from({ length: V.n }, (_, i) => i).filter(i => !SEL.ord.includes(i));
      acts = `<div class="ct-note">순서 결정권을 얻었어요! 1차 제출 순서대로 눌러요 (${SEL.ord.length}/${V.n})${SEL.ord.length ? ` · ${SEL.ord.map(i => esc(i === me ? "나" : nameOf(ctx, i))).join(" → ")}` : ""}</div><div class="ct-pl">${left.map(i => `<button class="btn" data-a="op" data-p="${i}">${esc(i === me ? "나" : nameOf(ctx, i))}</button>`).join("")}</div><div class="ct-two"><button class="btn" data-a="or" ${SEL.ord.length ? "" : "disabled"}>↩ 다시</button><button class="btn primary" data-a="ok" ${SEL.ord.length === V.n ? "" : "disabled"}>✅ 이 순서로</button></div>`;
    } else if (ph === "order") acts = `<div class="ct-note">${esc(ga(nameOf(ctx, V.win), false))} 순서 결정권을 얻어 순서를 정하는 중…</div>`;
    else if (myTurn) {
      const k = SEL.cards.length, canRule = V.letter && !V.ruleUsed && coins > 0;
      const tip = SEL.ruleMode ? `규칙 카드 <b>${esc(V.letter)}</b>(${esc(RT[V.letter])})를 놓을 슬롯을 눌러요` : k < need ? (SEL.pick ? `<b>${SEL.pick}</b>${josa(SEL.pick, "을", "를").slice(1)} 놓을 슬롯을 눌러요` : `${V.sec}차 제출 — 숫자 카드 ${need}장 중 ${k + 1}번째를 골라요`) : "다 놓았어요 · 제출해요";
      acts = `<div class="ct-note">${tip}</div>`;
      if (canRule) {
        if (SEL.rule) { const c = SEL.rule.c; acts += `<div class="ct-rule"><button class="btn" data-a="rx">📜 ${esc(V.letter)} → ${SL[SEL.rule.s]} ✕</button><button class="btn" data-a="cm" ${c > 1 ? "" : "disabled"}>−</button><output>🪙${c}</output><button class="btn" data-a="cp" ${c < coins ? "" : "disabled"}>+</button></div>`; }
        else acts += `<div class="ct-rule solo"><button class="btn${SEL.ruleMode ? " primary" : ""}" data-a="rm">📜 규칙 카드 ${esc(V.letter)} (${esc(RT[V.letter])}) ${SEL.ruleMode ? "— 슬롯을 눌러요" : "같이 내기"}</button></div>`;
      }
      acts += `<div class="ct-two"><button class="btn" data-a="un" ${k || SEL.rule || SEL.pick ? "" : "disabled"}>↩ 되돌리기</button><button class="btn primary" data-a="go" ${k === need ? "" : "disabled"}>✅ 제출 (${k}/${need})</button></div>`;
    } else if (ph === "place") {
      const t = V.turn, after = (() => { let c = 0; for (let x = V.ti + 1; x < 2 * V.n; x++) if ((x < V.n ? V.ord[x] : V.ord[2 * V.n - 1 - x]) === me) c++; return c; })();
      acts = `<div class="ct-note">${esc(ga(nameOf(ctx, t), t === me))} ${V.need}장 놓는 중…${after ? ` · 내 차례 ${after}번 더` : " · 내 카드는 다 냈어요"}</div>`;
    } else acts = `<div class="ct-note">곧 다음 라운드 입찰이 시작돼요…</div>`;
    h += `${mine}<div class="ct-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      if (!actor) return;
      const hv = e.target.closest("[data-v]");
      if (hv && !hv.disabled && myTurn) { ctx.sfx("tap"); SEL.ruleMode = false; SEL.pick = SEL.pick === +hv.dataset.v ? 0 : +hv.dataset.v; render(stage, V, ctx); return; }
      const row = e.target.closest("[data-slot]");
      if (row && myTurn) {
        const s = +row.dataset.slot;
        ctx.sfx("tap");
        if (SEL.ruleMode) { SEL.rule = { s, c: Math.max(1, Math.min(coins, SEL.rule ? SEL.rule.c : Math.ceil(coins / 3))) }; SEL.ruleMode = false; }
        else if (SEL.pick > 0 && SEL.cards.length < need) {
          SEL.cards.push({ v: SEL.pick, s });
          const used = SEL.cards.filter(c => c.v === SEL.pick).length;
          if (used >= V.hand[SEL.pick] || SEL.cards.length >= need) SEL.pick = 0;
        }
        render(stage, V, ctx); return;
      }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a;
      ctx.sfx(a === "bid" || a === "go" || a === "ok" ? "pop" : "tap");
      if (a === "bm") SEL.bid = Math.max(0, SEL.bid - 1);
      else if (a === "bp") SEL.bid = Math.min(coins, SEL.bid + 1);
      else if (a === "bid") { ctx.act({ t: "bid", c: Math.max(0, Math.min(coins, SEL.bid)) }); return; }
      else if (a === "op") SEL.ord.push(+b.dataset.p);
      else if (a === "or") SEL.ord = [];
      else if (a === "ok") { ctx.act({ t: "order", ord: SEL.ord.slice() }); return; }
      else if (a === "rm") SEL.ruleMode = !SEL.ruleMode;
      else if (a === "rx") SEL.rule = null;
      else if (a === "cm" && SEL.rule) SEL.rule.c = Math.max(1, SEL.rule.c - 1);
      else if (a === "cp" && SEL.rule) SEL.rule.c = Math.min(coins, SEL.rule.c + 1);
      else if (a === "un") { if (SEL.pick) SEL.pick = 0; else if (SEL.cards.length) SEL.cards.pop(); else SEL.rule = null; SEL.ruleMode = false; }
      else if (a === "go") { ctx.act({ t: "place", cards: SEL.cards.map(c => ({ v: c.v, s: c.s })), rule: SEL.rule ? { s: SEL.rule.s, c: SEL.rule.c } : null }); return; }
      render(stage, V, ctx);
    };
  }

  // ── 결과 창 한 줄 더 ──
  function result(V, me) {
    const nm = i => esc(String(NAMES[i] || `${i + 1}번`).slice(0, 5));
    const order = V.score.map((_, i) => i).sort((a, b) => (V.ranks ? V.ranks[a] - V.ranks[b] : V.score[b] - V.score[a]));
    const rows = order.map(i => `<tr${i === me ? ' style="color:#86efac"' : ""}><td><b>${nm(i)}</b></td>${V.rsc[i].map(x => `<td>${x}</td>`).join("")}<td><b>${V.score[i]}</b></td><td>${V.coins[i] == null ? "" : V.coins[i]}</td></tr>`).join("");
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead><tr><th></th>${V.hist.map(x => `<th>${x.r}R</th>`).join("")}<th>합</th><th>🪙</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:5px;font-size:11.5px;color:var(--soft)">방송: 1·2위가 파이널 직행 · 동점은 남은 코인</div>`;
  }

  // ── AI 선생님 (보이는 것만) ──
  const pct = p => `${Math.round(p * 100)}%`;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const cardTxt = cs => cs.map(c => `${c.v}→${SL[c.s]}`).join(" · ");
  const placeTxt = a => `${cardTxt(a.cards)}${a.rule ? ` + 규칙 카드 → ${SL[a.rule.s]} (코인 ${a.rule.c})` : ""}`;
  function rankOf(V, me) { return V.score.filter(x => x > V.score[me]).length + 1; }
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    if (V.over && me < 0) return { opp: "3라운드가 모두 끝났어요.", mine: "구경 중이었어요.", rec: `1등 ${nm(V.ranks.indexOf(0))} ${Math.max(...V.score)}점`, why: "" };
    if (V.over) { const rk = V.ranks[me]; return { opp: "3라운드가 모두 끝났어요.", mine: me >= 0 ? `내 점수 ${V.score[me]}점 · ${rk + 1}등 · 남은 코인 ${V.coins[me]}` : "", rec: rk <= 1 ? "파이널 직행권! 수고했어요" : "아쉬워요, 한 판 더 해 봐요", why: "" }; }
    if (me < 0 || !V.hand) return { opp: `지금 ${V.round}라운드`, mine: "구경 중이에요.", rec: "누가 어느 슬롯에 카드를 몰아넣는지 보세요", why: "" };
    // 👀 상대 흐름
    const bits = [], log = V.log;
    let lastMine = -1; for (let i = log.length - 1; i >= 0; i--) { if (log[i].k === "place" && log[i].s === me) { lastMine = i; break; } if (log[i].k === "round") break; }
    let start = lastMine; if (start < 0) { for (let i = log.length - 1; i >= 0; i--) if (log[i].k === "round") { start = i; break; } }
    const moves = log.slice(start + 1).filter(e => e.k === "place" && e.s !== me).map(e => `${nm(e.s)} ${e.sl.map(s => SL[s]).join("·")}`);
    if (V.phase === "place" && moves.length) bits.push(`${lastMine >= 0 ? "내 지난 차례 뒤" : "이번 라운드"} ${moves.slice(-5).join(", ")}에 놓았어요`);
    if (V.phase === "place") {
      const fills = V.defs.map((d, s) => `${SL[s]} ${V.board[s].length}/${d.max}`).join(" · ");
      bits.push(`슬롯 찬 칸 ${fills}`);
    }
    const hi6 = sum(V.left.map((c, j) => (j === me ? 0 : c[6]))), hi5 = sum(V.left.map((c, j) => (j === me ? 0 : c[5])));
    if (V.hist.length) bits.push(`지난 라운드에 공개된 카드를 빼면 남에게 6이 ${hi6}장 · 5가 ${hi5}장 남았어요`);
    const last = V.hist[V.hist.length - 1];
    if (last && V.phase === "bid") { const t = last.gain.indexOf(Math.max(...last.gain)); bits.push(`지난 ${last.r}라운드 최고 점수: ${nm(t)} +${last.gain[t]}`); }
    if (V.phase === "order" || (V.phase === "place" && V.win >= 0)) bits.push(V.win >= 0 ? `이번 순서 결정권은 ${nm(V.win)} (코인 액수는 비공개)` : "");
    const opp = (bits.filter(Boolean).join(" · ") || `${V.round}라운드 시작 — 모두 몰래 순서 결정권 입찰 중이에요`) + ".";
    const mine = `내 점수 ${V.score[me]}점 (${rankOf(V, me)}등) · 코인 ${V.coins[me]} · 남은 카드 ${[1, 2, 3, 4, 5, 6].map(v => (V.hand[v] ? `${v}×${V.hand[v]}` : "")).filter(Boolean).join(" ")}${V.letter ? ` · 규칙 카드 ${V.letter}(${RT[V.letter]})${V.ruleUsed ? " 냄" : ""}` : ""}`;
    let rec = "다른 사람 차례를 기다려요", why = "";
    if (!V.needs.includes(me)) {
      if (V.phase === "place") why = `내 차례가 오면 그때까지 놓인 카드 수 · 슬롯 LIMIT을 보고 정해요. 숫자 4(6점) · 3(5점) · 2(4점)가 점수가 커요.`;
      return { opp, mine, rec, why };
    }
    if (V.phase === "bid") {
      const a = K.recommend(V, me).a;
      rec = a.c ? `코인 ${a.c}개 입찰` : "입찰하지 않아요 (0개)";
      why = `순서 결정권은 1차 제출 순서를 정하는 권리인데, AI 끼리 2만 판 남짓 둬 보면 자리에 따른 차이는 라운드당 1점 안팎이에요. 코인은 규칙 카드(슬롯마다 코인 많은 사람 것만 적용)와 동점 가르기에 쓰여서 아껴 둬요 — 지금 코인 ${V.coins[me]}개. 낸 코인은 져도 사라지고, 이번 라운드 슬롯 표는 1차 제출 때 공개돼요.`;
      return { opp, mine, rec, why };
    }
    if (V.phase === "order") {
      const a = K.recommend(V, me).a, pos = a.ord.indexOf(me) + 1;
      rec = `나를 1차 ${pos}번째로 (${a.ord.map(nm).join(" → ")})`;
      why = `1차 ${pos}번째면 2차(역순)는 ${V.n - pos + 1}번째예요. AI 끼리 둬 보면 순서의 70% 쯤 자리가 라운드당 1점 안팎 유리했어요. 뒤쪽 자리일수록 남이 어디에 몇 장 놓았는지 보고 고를 수 있지만, 맨 끝은 빈 칸이 거의 없어 고를 곳이 줄어요.`;
      return { opp, mine, rec, why };
    }
    // 카드 놓기
    const H = K.recommend(V, me), a = H.a, L = H.L;
    rec = placeTxt(a);
    const top = L[0], b2 = L.find(x => cardTxt(x.a.cards) !== cardTxt(a.cards));
    const pr = H.best.preg || top.preg;
    const per = a.cards.map((c, i) => `${c.v}(${PTS[c.v]}점)${josa(c.v, "이", "가").slice(-1)} ${SL[c.s]}에 등록될 확률 ~${pct(pr[i] || 0)}`).join(", ");
    const s0 = a.cards[0].s, d0 = V.defs[s0];
    const slotTxt = `${SL[s0]} 슬롯은 최대 ${d0.max}장 · LIMIT ${d0.lim}, 지금 ${V.board[s0].length}장이 놓였어요`;
    why = `${slotTxt}. ${per} — 이번 라운드 내 기대 점수 ${f1(H.best.pts)}점${b2 ? ` (다음 후보 ${cardTxt(b2.a.cards)} ${f1(b2.pts)}점)` : ""}.`;
    if (H.ruled) why += ` 규칙 카드 ${V.letter}(${RT[V.letter]})를 ${SL[a.rule.s]}에 코인 ${a.rule.c}개와 내면 기대 +${f1(H.ruled.gain)}점 (코인 값 뺀 것).`;
    else if (V.letter && !V.ruleUsed && V.coins[me] > 0) why += V.sec === 1 ? ` 규칙 카드는 정보가 더 많은 2차 때까지 아껴 둬요.` : ` 규칙 카드 ${V.letter}는 이번엔 코인값만큼 이득이 없어 아껴요.`;
    return { opp, mine, rec, why };
  }

  // ── 🎞️ 복기: 아쉬운 수 (선생님과 같은 계산 — K.evalActs, 같은 표본에서 내 수 vs 고급 AI 수) ──
  const seeded = a0 => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const REV_K = 12;                                        // 기대 1점 손해 = sev 12 (5점 손해부터 📒)
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || V.over || !V.needs || !V.needs.includes(seat) || !V.hand) return none;
      const isBest = bestA && JSON.stringify(myA) === JSON.stringify(bestA), inTally = !!(info && info.same);
      const fin = (s, why) => ({ sev: isBest ? 0 : inTally ? Math.min(Math.max(0, Math.round(s)), 20) : Math.max(0, Math.min(100, Math.round(s))), why });
      if (V.phase === "bid" && myA.t === "bid") {
        const cost = [0, 0.3, 0.22, 0.06][V.round] || 0.1;
        return fin(myA.c * cost * REV_K, myA.c ? `입찰 ${myA.c}코인 — 순서 자리 차이는 라운드당 1점 안팎이라 코인 ${myA.c}개(규칙 카드 값 약 ${f1(myA.c * cost)}점)가 더 아까워요` : "입찰 0 — 코인을 규칙 카드에 아꼈어요");
      }
      if (V.phase === "order" && myA.t === "order") return fin(4, `1차 ${myA.ord.indexOf(seat) + 1}번째를 골랐어요 (자리 차이는 라운드당 1점 안팎)`);
      if (V.phase === "place" && myA.t === "place" && bestA && bestA.t === "place") {
        const seed = ((((info && info.seed) | 0) ^ Math.imul(V.round, 2654435761) ^ Math.imul(V.ti + 1, 40503) ^ Math.imul(seat + 1, 374761393)) >>> 0) || 1;
        const E = K.evalActs(V, seat, [myA, bestA], 60, seeded(seed), K.FIT);
        const loss = Math.max(0, E[1].ev - E[0].ev);
        const why = `내 ${placeTxt(myA)} → 이번 라운드 기대 ${f1(E[0].pts)}점${myA.rule ? ` (코인 값 빼면 ${f1(E[0].ev)})` : ""} / ${isBest ? "같은 수" : `고급 AI ${placeTxt(bestA)} → ${f1(E[1].pts)}점${bestA.rule ? ` (코인 값 빼면 ${f1(E[1].ev)})` : ""}`}`;
        return fin(loss * REV_K, why);
      }
    } catch (e) { /* 계산 못 하면 아래 */ }
    return none;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const fakeV = (defs, board, res) => ({ defs, board, phase: res ? "show" : "place", over: false, res, letter: null, myRule: null });
    const slotRes = (cards, def) => { const R = K.resolveSlot(cards, null, def); return { cards: cards.map((c, i) => ({ ...c, val: R.val[i], reg: R.reg[i], gone: !!(R.gone && R.gone[i]) })), sum: R.sum, lim: def.lim, effLim: R.lim, max: def.max, effMax: R.max, low: R.low, rule: null }; };
    const one = (def, cards, open, lab) => boardHtml(fakeV([def], [cards], open ? { slots: [slotRes(cards, def)] } : null), ctx0, { only: [0], lab: [lab] });
    const ctx0 = { me: 0, seats: [{ name: "나" }, { name: "악어" }, { name: "진호" }, { name: "민아" }] };
    const EX = [{ max: 6, lim: 18 }, { max: 5, lim: 16 }, { max: 5, lim: 13 }, { max: 4, lim: 11 }];   // 예시 표 (방송 표는 라운드마다 1차 제출 때 공개)
    const ptsHtml = `<div class="ct-pts">${[1, 2, 3, 4, 5, 6].map(v => `<span>${v} → <b>${PTS[v]}점</b></span>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "슬롯에 카드를 등록해 점수를 모아요", body: "<b>3라운드</b> 동안 슬롯 A~D에 숫자 카드를 놓아 <b>등록</b>되면 점수를 얻어요. 3라운드 점수 합이 가장 높은 사람이 이겨요 (방송: 8명 중 <b>1·2위가 파이널 직행</b>).",
        boardHtml: `<div class="ct-tut">${boardHtml(fakeV(EX, [[], [], [], []]), ctx0, {})}<small>예시 표 — 최대 카드 수 · LIMIT(등록된 숫자 합의 상한). 실제 판에서는 라운드마다 바뀌고 1차 제출 때 공개돼요</small></div>`, ms: 5600 },
      { tag: "STEP 2 · 준비물", title: "숫자 카드 1~6 두 벌 + 코인 20개", body: "각자 색으로 나뉜 숫자 카드 <b>1~6 두 벌(12장)</b>과 <b>코인 20개</b>를 받아요. 라운드마다 슬롯의 <b>최대 카드 수</b>와 <b>LIMIT</b>이 바뀌고, 그 표는 <b>1차 제출이 시작될 때</b> 공개돼요.",
        boardHtml: `<div class="ct-tut"><div class="ct-hand" style="width:100%;max-width:330px">${[1, 2, 3, 4, 5, 6].map(v => `<span class="ct-h">${v}<small>×2 · ${PTS[v]}점</small></span>`).join("")}</div><small>🪙 코인 20 · 📜 규칙 카드는 라운드마다 1장</small></div>`, ms: 5200 },
      { tag: "STEP 3 · 진행", title: "입찰 → 1차 1장 → 2차 2장 → 공개", body: "① 코인을 몰래 내 <b>순서 결정권</b>을 입찰해요 (최다가 순서를 정함, 아무도 안 내면 추첨, 낸 코인은 진 사람 것도 사라짐). ② <b>규칙 카드</b>를 1장씩 받아요. ③ <b>1차</b>: 순서대로 카드 1장을 뒷면으로. ④ <b>2차</b>: 역순으로 2장. ⑤ 공개하면 슬롯마다 <b>높은 숫자부터 등록</b>, 같은 숫자는 먼저 놓은 카드 먼저, <b>LIMIT을 넘기게 되는 카드는 버리고</b> 다음 낮은 카드를 봐요.",
        boardHtml: `<div class="ct-tut">${one({ max: 5, lim: 12 }, [{ p: 1, v: 6 }, { p: 2, v: 5 }, { p: 0, v: 4 }, { p: 3, v: 1 }], true, "A")}<small>A (LIMIT 12): 6 → 5 = 11, 4는 15가 돼 버림, 1 → 12 등록</small></div>`, ms: 9000 },
      { tag: "STEP 4 · 직접 해 봐요", title: "어떤 숫자를 넣어야 점수가 가장 클까요?", body: "B 슬롯은 <b>LIMIT 13</b>, 이미 <b>6</b>과 <b>5</b>가 놓였어요. 점수는 1→1 · 2→4 · 3→5 · 4→6 · 5→3 · 6→2점이에요. 내 카드 중 <b>등록되면서 점수가 가장 큰</b> 숫자를 눌러 봐요.",
        interactive: { hint: "👆 숫자를 눌러 결과를 봐요", doneText: "✅ 2를 넣어 4점! (6 · 5 · 2 = 13)" },
        render(stage, ctrl) {
          let msg = "", done = false, pick = 0;
          const draw = () => {
            const cards = [{ p: 1, v: 6 }, { p: 2, v: 5 }].concat(pick ? [{ p: 0, v: pick }] : []);
            stage.innerHTML = `<div class="ct-tut">${one({ max: 4, lim: 13 }, cards, !!pick, "B")}<div class="ct-hand" style="width:100%;max-width:330px">${[1, 2, 3, 4, 5, 6].map(v => (done ? `<span class="ct-h${v === pick ? " sel" : ""}" style="${v === pick ? "" : "opacity:.35"}">${v}<small>${PTS[v]}점</small></span>` : `<button type="button" class="ct-h" data-v="${v}">${v}<small>${PTS[v]}점</small></button>`)).join("")}</div><small>${msg}</small></div>`;
            if (done) ctrl.complete();
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b || done) return;
            const v = +b.dataset.v; ctrl.sfx("tap"); pick = v;
            const R = K.resolveSlot([{ p: 1, v: 6 }, { p: 2, v: 5 }, { p: 0, v }], null, { max: 4, lim: 13 }), got = R.reg[2] ? PTS[v] : 0;
            if (v === 2) { done = true; msg = "🏆 6 · 5 · 2 = 13 딱 맞아 등록 → 4점!"; }
            else if (!R.reg[2]) msg = `💥 ${josa(v, "을", "를")} 넣으면 합이 ${11 + v}, LIMIT 13을 넘어 버려져요. 다시 골라요!`;
            else if (v === 6) msg = `🤔 6은 먼저 놓인 6 다음으로 등록돼 12 — 대신 5가 버려져요. 그래도 6은 ${got}점뿐이에요. 다시!`;
            else msg = `🙂 ${josa(v, "은", "는")} 등록되지만 ${got}점이에요. 더 큰 점수가 있어요!`;
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "숫자마다 점수가 달라요", body: "등록된 카드만 점수가 돼요: <b>1→1 · 2→4 · 3→5 · 4→6 · 5→3 · 6→2점</b>. 큰 숫자는 먼저 등록되지만 점수가 작아요! 3라운드 합이 가장 높은 사람이 이기고, 동점이면 <b>남은 코인</b>이 많은 쪽이 앞서요.",
        boardHtml: `<div class="ct-tut">${ptsHtml}</div>`, ms: 6400 },
      { tag: "STEP 6 · 특수 규칙", title: "규칙 카드 A~H", body: "숫자 카드를 낼 때 원하는 슬롯에 <b>코인과 함께</b> 규칙 카드를 낼 수 있어요. 한 슬롯에 여럿이면 <b>코인을 가장 많이 낸 사람 것만</b> 적용되고 나머지는 코인과 함께 사라져요 (누구 규칙인지는 공개, 코인 수는 비공개).",
        boardHtml: `<div class="ct-tut"><div class="ct-rl">${K.LETTERS.split("").map(r => `<span><b>${r}</b> ${esc(RT[r])}</span>`).join("")}</div></div>`, ms: 8200 },
      { tag: "STEP 7 · 우리 판", title: "3~8명 · 8명보다 적으면 슬롯이 작아져요", body: "방송은 8명이에요. 인원이 적으면 슬롯의 최대 카드 수 · LIMIT을 인원에 맞춰 줄여요. 남이 낸 카드는 뒷면이라 <b>누구 카드인지만</b> 보여요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 등록될 확률과 기대 점수로 알려 줘요.",
        boardHtml: `<div class="ct-tut"><span style="font-size:42px">✂️</span></div>`, ms: 5400 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌3 · 커트라인 (11~12일차 파이널 인 1차)";
  const DIFF = "방송과 다른 점: 3~8명(방송 8명) — 8명보다 적으면 슬롯의 최대 카드 수 · LIMIT을 인원 ÷ 8 배로 줄이고 올림해요 · 그 라운드 슬롯 표는 1차 제출이 시작되면 모두에게 공개(방송은 제출하러 방에 들어가 확인) · 방송의 2차 게임(메모리 카운트) · 4명 즉시 탈락 없이 커트라인 순위로만 끝 · 입찰 동점은 추첨(방송은 투표룸에 먼저 들어간 사람), 규칙 카드 코인 동점은 먼저 낸 쪽 · 규칙 카드는 코인 1개 이상과 함께 라운드에 한 장, 안 쓰면 사라지고 놓인 규칙 카드는 공개 때까지 안 보여요 · 남의 코인 수는 끝날 때까지 비공개 · 동점은 모든 등수에서 남은 코인으로 가르고 그래도 같으면 공동";
  window.SVUI = window.SVUI || {};
  window.SVUI.cutline = {
    actText: (a, V, names) => !a ? "—" : a.t === "bid" ? (a.c ? `순서 결정권 ${a.c}코인 입찰` : "입찰 안 함") : a.t === "order" ? `순서: ${a.ord.map(i => (names && names[i]) || `${i + 1}번`).join(" → ")}` : a.t === "place" ? placeTxt(a) : "행동",   // 🎞️ 복기 행동 글
    name: "커트라인", emoji: "✂️", short: "LIMIT 안에 들어갈 카드로 슬롯 점수를 노려요", min: 3, max: 8, defN: 8, board: false,
    opts: [],
    howto: [
      "목표: 3라운드 동안 슬롯 A~D에 숫자 카드를 <b>등록</b>해 점수 합이 가장 높은 사람이 이겨요 (방송: 8명 중 1·2위 파이널 직행)",
      "준비물: 숫자 카드 1~6 두 벌(12장) · 코인 20개 · 슬롯 A~D (라운드마다 최대 카드 수와 LIMIT이 바뀌고, 그 라운드 표는 1차 제출이 시작될 때 공개)",
      "진행: ① 순서 결정권 입찰(코인 비공개, 최다가 순서를 정함 · 아무도 안 내면 추첨 · 낸 코인은 진 사람 것도 사라짐) ② 규칙 카드 1장씩 ③ 1차: 순서대로 1장 ④ 2차: 역순으로 2장 — 모두 뒷면 ⑤ 공개: 슬롯마다 <b>높은 숫자부터 등록</b>, LIMIT을 넘기게 되는 카드는 버리고 다음 카드",
      "승패: 등록된 카드 <b>1→1 · 2→4 · 3→5 · 4→6 · 5→3 · 6→2점</b> · 3라운드 합이 높은 순 (동점은 남은 코인) — 방송은 1·2위 파이널 직행, 나머지 6명은 2차 게임 메모리 카운트로 2명 더, 못 간 4명은 바로 탈락",
      "특수: 규칙 카드는 코인과 함께 원하는 슬롯에 (여럿이면 코인 최다만) — A LIMIT −3 · B LIMIT +3 · C 최대 카드 −1 · D 낮은 숫자부터 · E 처음 낸 6→1 · F 처음 낸 카드 버림 · G 처음 낸 6 버림 · H 낸 사람 첫 카드 먼저",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF, fitCoach: true,
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드 · ${{ bid: "순서 입찰", order: "순서 정하기", place: `${V.sec}차 제출`, show: "공개" }[V.phase] || ""}`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, coach, tutorial, review,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

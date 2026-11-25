/* 베니 서바이벌 · 배틀 오름차순 — 화면 (두 시트 · 뽑은 카드 두 장 · 한 장 가지고 한 장 넘기기 · 1분 규칙) */
(() => {
  "use strict";
  const B = window.SVCores.ascbattle;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.ab-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.ab-rd{font:900 14px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:3px 11px;white-space:nowrap}
.ab-n{font:800 12.5px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.ab-log{flex:1 1 90px;min-width:0;font-size:12px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.ab-sh{display:flex;flex-direction:column;gap:5px;border:1px solid rgba(251,191,36,.35);background:rgba(245,179,1,.06);border-radius:14px;padding:6px 8px;flex:none}
.ab-sh.me{border-color:rgba(134,239,172,.4);background:rgba(34,197,94,.07)}
.ab-sh.top{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.ab-sh .hd{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font:700 12.5px var(--round);color:#fbbf24}
.ab-sh.me .hd{color:#86efac}
.ab-sh .hd b{font-weight:900;white-space:nowrap}
.ab-sh .hd span:last-child{color:#fde68a;text-align:right;font-size:12px}
.ab-sheet{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px}
.ab-c{position:relative;display:grid;place-items:center;aspect-ratio:3/4;border-radius:8px;background:#f8fafc;color:#0f172a;font:900 21px/1 var(--round);border:2px solid #64748b;padding:0;min-width:0}
.ab-c::before{content:attr(data-i);position:absolute;left:3px;top:1px;font:700 8px/1 var(--round);color:rgba(15,23,42,.45)}
.ab-c.e{background:rgba(255,255,255,.07);border:2px dashed rgba(255,255,255,.28);color:#fde68a}
.ab-c.e::before{color:rgba(255,255,255,.4)}
.ab-c.run{border-color:#eab308;background:#fef9c3;box-shadow:0 2px 0 #eab308}
.ab-c.new{outline:2px solid #f472b6;outline-offset:1px}
.ab-c.pick{cursor:pointer;border-color:#fde68a;animation:ab-pulse 1.4s ease-in-out infinite}
.ab-c.sel{background:rgba(245,179,1,.3);border:2px solid #fde68a;transform:translateY(-3px);animation:none}
.ab-c i{font-style:normal;font-size:21px;opacity:.9}
@keyframes ab-pulse{50%{background:rgba(253,230,138,.18)}}
.ab-pair{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.08);border-radius:14px;padding:7px 10px}
.ab-pair .lbl{font-size:12.5px;line-height:1.35;color:#e2e8f0;text-align:center}
.ab-cards{display:flex;gap:18px;justify-content:center}
.ab-cw{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.ab-card{display:grid;place-items:center;width:56px;height:72px;border-radius:11px;background:#f8fafc;border:3px solid #64748b;color:#0f172a;font:900 32px/1 var(--round);padding:0;box-shadow:0 3px 0 rgba(0,0,0,.35)}
.ab-card.pick{cursor:pointer;border-color:#fde68a;animation:ab-pulse 1.4s ease-in-out infinite}
.ab-card.sel{border-color:#f59e0b;background:#fef3c7;transform:translateY(-4px);animation:none}
.ab-card.dim{opacity:.45}
.ab-card.gift{border-color:#fb7185;background:#fff1f2}
.ab-cw .tag{font:700 11.5px var(--round);color:var(--soft);white-space:nowrap}
.ab-cw .tag.hot{color:#fda4af}
.ab-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.ab-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.ab-head{flex:none;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.ab-tut{display:grid;gap:8px;justify-items:center;width:100%}
.ab-tut .ab-sheet{width:100%}
.ab-tut small{font-size:12px;color:var(--soft);text-align:center}
.ab-tut .ab-cards{gap:14px}
.ab-tut .ab-sh{width:100%;box-sizing:border-box}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [], SEL = { key: "", k: -1, c: -1 };

  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || (i === 0 ? "1번" : "2번");
  // 받침에 따라 이/가
  const ga = (name, me) => {
    if (me) return "내가";
    const ch = String(name).slice(-1), c = ch.charCodeAt(0);
    const has = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch);
    return `${name}${has ? "이" : "가"}`;
  };
  const rangeTxt = r => (r.len > 1 ? `${r.from + 1}~${r.from + r.len}번째 칸` : r.len ? `${r.from + 1}번째 칸` : "");
  // 빈칸을 '무엇이든 들어갈 수 있는 칸'으로 보았을 때 이어 볼 수 있는 가장 긴 구간 (위쪽 한계)
  function potential(sh) {
    let best = 0;
    for (let a = 0; a < sh.length; a++) {
      let last = 0, b = a;
      for (; b < sh.length; b++) { const x = sh[b]; if (x != null) { if (x < last) break; last = x; } }
      best = Math.max(best, b - a);
    }
    return best;
  }
  function cells(sh, o = {}) {
    const run = o.run && o.run.len > 1 ? o.run : null;
    return sh.map((v, c) => {
      const cls = `ab-c${v == null ? " e" : ""}${run && c >= run.from && c < run.from + run.len ? " run" : ""}${o.sel === c ? " sel" : ""}${o.neu && o.neu.has(c) ? " new" : ""}`;
      const inner = v != null ? v : o.sel === c && o.ghost ? `<i>${o.ghost}</i>` : "";
      return o.pick && v == null
        ? `<button type="button" class="${cls} pick" data-c="${c}" data-i="${c + 1}" aria-label="${c + 1}번째 빈칸">${inner}</button>`
        : `<span class="${cls}" data-i="${c + 1}">${inner}</span>`;
    }).join("");
  }
  const sheetHtml = (sh, o) => `<div class="ab-sheet">${cells(sh, o)}</div>`;
  // 방금 적힌 칸 (최근 두 번)
  function lastPlaced(V) {
    const out = [new Set(), new Set()]; let n = 0;
    for (let k = V.log.length - 1; k >= 0 && n < 2; k--) { const e = V.log[k]; if (e.k === "keep" || e.k === "put") { out[e.s].add(e.c); n++; } }
    return out;
  }
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    const nm = esc(ga(nameOf(ctx, e.s), e.s === ctx.me));
    if (e.k === "deal") return `${nm} 카드 ${e.a} · ${e.b} 을(를) 뽑았어요`;
    if (e.k === "keep") return `${nm} ${e.v} 을(를) 적고 ${e.gift} 을(를) 넘겼어요`;
    if (e.k === "put") return `${nm} ${e.v} 을(를) 적었어요`;
    if (e.k === "end") return "모든 칸이 찼어요";
    return "";
  }

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, o = me >= 0 ? 1 - me : 1, top = me >= 0 ? o : 0, bot = me >= 0 ? me : 1;
    const key = `${ctx.g}|${V.turn}|${V.phase}`;
    if (SEL.key !== key) SEL = { key, k: -1, c: -1 };
    const actor = ctx.canAct && V.needs.includes(me), keepAct = actor && V.phase === "keep", putAct = actor && V.phase === "put";
    const neu = lastPlaced(V), best = Math.max(...V.runs);
    const gname = i => ga(nameOf(ctx, i), i === me);
    let h = `<div class="ab-top">${V.over ? `<span class="ab-rd">끝</span>` : `<span class="ab-n">${esc(V.phase === "keep" ? `${gname(V.drawer)} 뽑는 차례` : `${gname(1 - V.drawer)} 적는 차례`)}</span>`}<span class="ab-log">${logText(V, ctx)}</span></div>`;
    const shBlock = (i, pick, sel, ghost) => {
      const sh = V.sheets[i], run = { len: V.runs[i], from: V.froms[i] }, emp = sh.filter(x => x == null).length;
      const info = V.over ? `${V.runs[i]}칸 이어짐${V.runs[i] > 1 ? ` (${rangeTxt(run)})` : ""}` : `이어진 ${V.runs[i]}칸 · 최대 ${potential(sh)}칸 가능 · 빈칸 ${emp}`;
      return `<div class="ab-sh${i === me ? " me" : ""}${V.over && V.runs[i] === best ? " top" : ""}"><div class="hd"><b>${esc(i === me && nameOf(ctx, i) !== "나" ? `${nameOf(ctx, i)} (나)` : nameOf(ctx, i))}</b><span>${info}</span></div>${sheetHtml(sh, { run, pick, sel, ghost, neu: neu[i] })}</div>`;
    };
    h += shBlock(top, false, -1, 0);
    let acts = "";
    if (V.over) {
      const w = V.ranks.map((r, i) => (r === 0 ? i : -1)).filter(i => i >= 0);
      h += `<div class="ab-head">🏁 ${w.length === 2 ? "무승부! 두 시트가 같은 칸 수로 이어졌어요" : `${esc(nameOf(ctx, w[0]))} 승! ${V.runs[w[0]]}칸 vs ${V.runs[1 - w[0]]}칸`}</div>`;
      acts = `<div class="note">아래 결과 창에서 순위를 볼 수 있어요</div>`;
    } else {
      const P = V.pair, card = (k, cls, tag, hot, btn) => `<div class="ab-cw">${btn ? `<button type="button" class="ab-card pick${SEL.k === k ? " sel" : ""}" data-k="${k}" aria-label="카드 ${P[k]}">${P[k]}</button>` : `<span class="ab-card${cls ? " " + cls : ""}">${P[k]}</span>`}<span class="tag${hot ? " hot" : ""}">${tag}</span></div>`;
      let lbl, c0, c1;
      if (V.phase === "keep") {
        lbl = keepAct ? "🎴 뽑은 카드 두 장 · 한 장은 내 시트에, 남은 한 장은 상대에게 가요" : `🎴 ${esc(gname(V.drawer))} 뽑은 카드 두 장 (둘 다 공개)`;
        c0 = card(0, "", keepAct ? "가지기" : "", false, keepAct); c1 = card(1, "", keepAct ? "가지기" : "", false, keepAct);
      } else {
        const kp = V.kept, gf = 1 - kp, cs = [null, null], tg = [null, null];
        lbl = putAct ? `🎁 ${esc(gname(V.drawer))} 넘겨 준 ${V.gift} · 내 시트 빈칸에 적어요` : `🎁 ${esc(gname(V.drawer))} 넘긴 ${V.gift} 을(를) ${esc(gname(1 - V.drawer))} 적는 중이에요`;
        cs[kp] = "dim"; cs[gf] = "gift"; tg[kp] = `${gname(V.drawer)} 가짐`; tg[gf] = putAct ? "내가 적을 카드" : "넘어간 카드";
        c0 = card(0, cs[0], esc(tg[0]), gf === 0, false); c1 = card(1, cs[1], esc(tg[1]), gf === 1, false);
      }
      h += `<div class="ab-pair"><div class="lbl">${lbl}</div><div class="ab-cards">${c0}${c1}</div></div>`;
      const pickMine = keepAct || putAct;
      const ghost = keepAct ? (SEL.k >= 0 ? P[SEL.k] : 0) : putAct ? V.gift : 0;
      if (keepAct) {
        acts = `<div class="note">${SEL.k < 0 ? "가질 카드를 먼저 눌러요 · 남은 한 장은 상대가 적어요" : SEL.c < 0 ? `${P[SEL.k]} 을(를) 적을 내 빈칸을 눌러요` : `${P[SEL.k]} 을(를) ${SEL.c + 1}번째 칸에 적고, ${P[1 - SEL.k]} 은(는) 상대에게 넘길까요?`}</div><button class="btn primary big" data-a="ok" ${SEL.k >= 0 && SEL.c >= 0 ? "" : "disabled"}>✔ 이대로 정하기</button>`;
      } else if (putAct) {
        acts = `<div class="note">${SEL.c < 0 ? `넘어온 ${V.gift} 을(를) 적을 내 빈칸을 눌러요` : `${SEL.c + 1}번째 칸에 ${V.gift} 을(를) 적을까요?`}</div><button class="btn primary big" data-a="ok" ${SEL.c >= 0 ? "" : "disabled"}>✔ 여기에 적기</button>`;
      } else if (me < 0) acts = `<div class="note">구경 중이에요 · 두 시트는 모두 공개예요</div>`;
      else acts = `<div class="note">${esc(gname(V.phase === "keep" ? V.drawer : 1 - V.drawer))} ${V.phase === "keep" ? "가질 카드를 고르는 중…" : "넘어간 카드를 적는 중…"}</div>`;
      h += shBlock(bot, pickMine, pickMine ? SEL.c : -1, ghost);
    }
    if (V.over) h += shBlock(bot, false, -1, 0);
    h += `<div class="ab-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const kc = e.target.closest("[data-k]");
      if (kc) { ctx.sfx("tap"); SEL.k = SEL.k === +kc.dataset.k ? -1 : +kc.dataset.k; render(stage, V, ctx); return; }
      const pc = e.target.closest("[data-c]");
      if (pc) { ctx.sfx("tap"); const c = +pc.dataset.c; SEL.c = SEL.c === c ? -1 : c; render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      ctx.sfx("pop");
      if (V.phase === "keep" && SEL.k >= 0 && SEL.c >= 0) ctx.act({ t: "keep", k: SEL.k, c: SEL.c });
      else if (V.phase === "put" && SEL.c >= 0) ctx.act({ t: "put", c: SEL.c });
    };
  }

  // ── 결과 창 한 줄 더 ──
  function result(V, me) {
    const nm = i => esc(String(NAMES[i] || `${i + 1}번`).slice(0, 5));
    const rows = [0, 1].map(i => `<tr${i === me ? ' style="color:#86efac"' : ""}><td><b>${nm(i)}</b></td><td${V.ranks[i] === 0 ? ' style="color:#fde68a;font-weight:800"' : ""}>${V.runs[i]}칸${V.runs[i] > 1 ? ` (${rangeTxt({ len: V.runs[i], from: V.froms[i] })})` : ""}</td><td style="text-align:left">${V.sheets[i].join(" · ")}</td></tr>`).join("");
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead><tr><th></th><th>이어진 칸</th><th>시트</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ── AI 선생님 (보이는 것만 읽음 · 앞으로 뽑힐 카드는 모름) ──
  const seeded = a0 => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const pct = p => `${Math.round(p * 100)}%`;
  function nbText(sh, c, v) {
    let a = c - 1; while (a >= 0 && sh[a] == null) a--;
    let b = c + 1; while (b < sh.length && sh[b] == null) b++;
    const l = a >= 0 ? `왼쪽 이웃 ${sh[a]}` : "왼쪽은 시트 끝", r = b < sh.length ? `오른쪽 이웃 ${sh[b]}` : "오른쪽은 시트 끝";
    const fit = (a < 0 || sh[a] <= v) && (b >= sh.length || v <= sh[b]);
    return `${c + 1}번째 칸은 ${l} · ${r} 이라 ${v} 이(가) ${fit ? "오름차순을 끊지 않고 들어가요" : "들어가면 오름차순이 끊겨요"}`;
  }
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || (i === 0 ? "1번" : "2번");
    if (V.over) {
      const w = V.ranks[me >= 0 ? me : 0] === 0;
      return { opp: `상대 시트 최종 ${V.runs[me >= 0 ? 1 - me : 1]}칸`, mine: `내 시트 최종 ${V.runs[me >= 0 ? me : 0]}칸`, rec: w ? "이겼어요! 한 판 더 해 봐요" : "아쉬워요, 한 판 더 해 봐요", why: "" };
    }
    if (me < 0) return { opp: `두 시트 이어진 칸: ${V.runs.join(" : ")}`, mine: "구경 중이에요.", rec: "뽑은 카드 두 장 중 어느 쪽을 가지는지 보세요", why: "" };
    const o = 1 - me, sum = V.sheets.flat().reduce((a, x) => a + (x || 0), 0);
    const r = seeded(V.turn * 977 + V.pair[0] * 31 + V.pair[1] * 7 + V.gift * 3 + sum + me);
    const ev = V.log.filter(e => e.i > since && e.s === o && (e.k === "keep" || e.k === "put")).slice(-2);
    let opp = ev.length ? ev.map(e => (e.k === "keep" ? `${ga(nm(o), false)} ${e.v} 을(를) ${e.c + 1}번째 칸에 적고 ${e.gift} 을(를) 넘겼어요` : `${ga(nm(o), false)} 넘어간 ${e.v} 을(를) ${e.c + 1}번째 칸에 적었어요`)).join(" → ") + " — " : "";
    opp += `상대 시트는 이어진 ${V.runs[o]}칸${V.runs[o] > 1 ? ` (${rangeTxt({ len: V.runs[o], from: V.froms[o] })})` : ""} · 빈칸 ${V.sheets[o].filter(x => x == null).length}개 · 잘 채우면 최대 ${potential(V.sheets[o])}칸까지예요`;
    const wp = B.winProb(V, me, 30, r);
    const mine = `내 시트는 이어진 ${V.runs[me]}칸${V.runs[me] > 1 ? ` (${rangeTxt({ len: V.runs[me], from: V.froms[me] })})` : ""} · 빈칸 ${V.sheets[me].filter(x => x == null).length}개 · 최대 ${potential(V.sheets[me])}칸까지 · 지금 형세로 이길 확률은 약 ${pct(wp)}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me) && V.phase === "keep") {
      const L = B.evalKeep(V, me, 40, r, 3), b = L[0], kv = V.pair[b.k], gv = V.pair[1 - b.k];
      const oc = B.costs(V.sheets[o], gv), mn = Math.min(...oc), ob = B.bestCell(V.sheets[o], gv);
      rec = `${kv} 을(를) ${b.c + 1}번째 칸에 적고, ${gv} 은(는) 상대에게`;
      const give = mn >= 8 ? `상대 시트에는 ${gv} 이(가) 오름차순으로 들어갈 칸이 없어서 상대가 곤란해져요` : mn < 1 ? `상대는 ${gv} 을(를) ${ob + 1}번째 칸에 딱 맞게 적을 수 있어요(상대에게 도움이 돼요)` : `상대는 ${gv} 을(를) ${ob + 1}번째 칸 근처에 무난히 적을 수 있어요`;
      const alt = L.find(x => x.k !== b.k);
      why = `${nbText(V.sheets[me], b.c, kv)}. 넘기는 카드도 중요해요: ${give}. 이렇게 하면 이길 확률이 약 ${pct(b.p)}${alt ? ` (반대로 ${V.pair[alt.k]} 을(를) 가지면 약 ${pct(alt.p)})` : ""}예요.`;
    } else if (V.needs.includes(me) && V.phase === "put") {
      const L = B.evalPut(V, me, 40, r), b = L[0], alt = L[1];
      rec = `${V.gift} 을(를) ${b.c + 1}번째 칸에`;
      why = `${nbText(V.sheets[me], b.c, V.gift)}. 이 칸이면 이길 확률이 약 ${pct(b.p)}${alt ? ` (다음으로 좋은 ${alt.c + 1}번째 칸은 약 ${pct(alt.p)})` : ""}예요. 넘어온 카드는 고를 수 없어서 어디에 적을지가 전부예요.`;
    } else if (V.phase === "keep") { rec = `${ga(nm(V.drawer), false)} 가질 카드를 고르는 중이에요`; why = `뽑은 카드는 ${V.pair[0]} · ${V.pair[1]}. 한 장은 상대가 가지고 남은 한 장이 나에게 넘어와요 — 내 시트에 어울리는 쪽이 오기를 기대해요.`; }
    else { rec = `${ga(nm(o), false)} 넘어간 ${V.gift} 을(를) 적는 중이에요`; why = "내가 넘긴 카드가 상대 시트에서 오름차순을 끊는지 지켜봐요."; }
    return { opp, mine, rec, why };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const mini = (sh, run) => `<div class="ab-sheet">${cells(sh, { run })}</div>`;
    const pairTut = (a, b, ta, tb, ca, cb) => `<div class="ab-cards"><div class="ab-cw"><span class="ab-card${ca ? " " + ca : ""}">${a}</span><span class="tag">${ta || ""}</span></div><div class="ab-cw"><span class="ab-card${cb ? " " + cb : ""}">${b}</span><span class="tag${tb && /넘어/.test(tb) ? " hot" : ""}">${tb || ""}</span></div></div>`;
    return [
      { tag: "STEP 1 · 목표", title: "1:1 로 숫자를 오름차순으로 길게 이어요", body: "8칸 시트에 1~10 숫자를 적어요. 왼쪽에서 오른쪽으로 <b>점점 커지는(같아도 OK) 칸</b>이 더 길게 이어진 사람이 이겨요.",
        boardHtml: `<div class="ab-tut">${mini([1, 2, 2, 5, 6, 3, 9, 4], { from: 0, len: 5 })}<small>노란 칸 5개가 이어져요 → 이 시트는 5점</small></div>`, ms: 5000 },
      { tag: "STEP 2 · 준비", title: "한 명이 카드 두 장을 뽑아요", body: "차례가 오면 숫자 카드 <b>두 장을 무작위로 뽑아요</b>. 어떤 숫자인지는 <b>상대에게도 공개</b>돼요 (우리 판은 1~10 무작위).",
        boardHtml: `<div class="ab-tut">${pairTut(3, 8, "", "")}<small>뽑은 카드 3 · 8 — 둘 다 보여요</small></div>`, ms: 5000 },
      { tag: "STEP 3 · 진행", title: "한 장은 내가, 남은 한 장은 상대가 적어요", body: "뽑은 사람이 <b>한 장을 골라 내 시트 원하는 칸</b>에 적어요. 고르지 않은 한 장은 <b>상대에게 넘어가서</b> 상대가 자기 시트 원하는 칸에 적어요. 모든 칸이 찰 때까지 번갈아 되풀이해요.",
        boardHtml: `<div class="ab-tut">${pairTut(3, 8, "내가 가짐", "상대에게 넘어가요", "dim", "gift")}<small>어울리는 카드를 가지고, 상대에게는 불편한 카드를 넘기면 이득이에요</small></div>`, ms: 6200 },
      { tag: "STEP 4 · 직접 해 봐요", title: "카드를 골라 끊기지 않는 칸에 적어요", body: "카드를 한 장 누르고 빈칸을 눌러요. 앞 칸보다 작거나 뒤 칸보다 크면 오름차순이 <b>끊겨요</b>. 끊기지 않게 적어 보세요!",
        interactive: { hint: "👆 카드 한 장 → 빈칸 순서로 눌러요", doneText: "✅ 끊기지 않게 적었어요! 남은 카드는 상대에게 넘어가요" },
        render(stage, ctrl) {
          const base = [1, 2, null, 5, null, null, 8, 9], P = [3, 6];
          let sh = base.slice(), k = -1, msg = "", done = false;
          const draw = () => {
            const run = B.runOf(sh);
            stage.innerHTML = `<div class="ab-tut"><div class="ab-cards">${P.map((v, i) => `<div class="ab-cw">${done ? `<span class="ab-card${k === i ? "" : " gift"}">${v}</span>` : `<button type="button" class="ab-card pick${k === i ? " sel" : ""}" data-k="${i}">${v}</button>`}<span class="tag${done && k !== i ? " hot" : ""}">${done ? (k === i ? "내가 적음" : "상대에게 넘어가요") : "가지기"}</span></div>`).join("")}</div><div class="ab-sheet">${cells(sh, { pick: !done && k >= 0, run, ghost: 0 })}</div><small>${msg}</small></div>`;
            if (done) ctrl.complete();
          };
          stage.onclick = e => {
            if (done) return;
            const kc = e.target.closest("[data-k]");
            if (kc) { k = +kc.dataset.k; ctrl.sfx("tap"); msg = `${P[k]} 을(를) 적을 빈칸을 눌러요`; draw(); return; }
            const b = e.target.closest("[data-c]"); if (!b || k < 0) return;
            const c = +b.dataset.c, t = sh.slice(); t[c] = P[k];
            if (t.filter(x => x != null).some((x, i, a) => i && x < a[i - 1])) { msg = `💥 ${P[k]} 이(가) ${c + 1}번째 칸에 들어가면 끊겨요 — 다시 골라요!`; k = -1; ctrl.sfx("tap"); draw(); return; }
            sh = t; done = true; ctrl.sfx("tap"); msg = ""; draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "가장 길게 이어진 칸 수가 점수예요", body: "모든 칸이 차면 <b>이어진 칸 수</b>를 세요. 더 많은 쪽이 승리, <b>같으면 공동 1등</b>이에요.",
        boardHtml: `<div class="ab-tut"><div class="ab-sh me"><div class="hd"><b>나</b><span>6칸 이어짐</span></div>${mini([1, 2, 4, 4, 5, 8, 3, 6], { from: 0, len: 6 })}</div><div class="ab-sh"><div class="hd"><b>상대</b><span>4칸 이어짐</span></div>${mini([2, 6, 1, 3, 3, 9, 5, 4], { from: 2, len: 4 })}</div></div>`, ms: 5400 },
      { tag: "STEP 6 · 우리 판", title: "시트는 8칸 · 한 기기로도 할 수 있어요", body: "방송과 달리 시트는 <b>8칸</b>이고 카드는 뽑을 때마다 1~10 무작위예요. 시트가 모두 공개라 <b>한 기기에서 둘이</b>서도 할 수 있어요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 어디에 적을지 알려 줘요.",
        boardHtml: `<div class="ab-tut"><span style="font-size:42px">⚔️</span></div>`, ms: 4800 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌2 · 배틀 오름차순";
  const DIFF = "방송과 다른 점: 시트는 8칸이에요 · 카드는 뽑을 때마다 1~10 중 무작위예요 · 처음 뽑는 사람만 무작위고 그 뒤로는 번갈아 뽑아요 · 같은 칸 수면 공동 1등이에요";
  window.SVUI = window.SVUI || {};
  window.SVUI.ascbattle = {
    actText: (a, V) => {                                                                                                                        // 🎞️ 복기 행동 글
      if (!a) return "—";
      if (a.t === "keep") return V && V.pair ? `${V.pair[a.k]} 을(를) 내 ${a.c + 1}번 칸에 적고 ${V.pair[1 - a.k]} 은(는) 상대에게` : `고른 카드를 내 ${a.c + 1}번 칸에 적음`;
      return a.t === "put" ? `넘어온 ${V && V.gift ? V.gift + " 을(를) " : "카드를 "}내 ${a.c + 1}번 칸에 적음` : "행동";
    },
    name: "배틀 오름차순", emoji: "⚔️", short: "둘이 겨뤄 오름차순을 더 길게 이어요", min: 2, max: 2, defN: 2, board: true,
    opts: [],
    howto: [
      "1:1 로 8칸 시트에 숫자를 적어 <b>왼쪽에서 오른쪽으로 커지는 칸</b>을 더 길게 이어요 (같은 숫자도 이어짐)",
      "차례가 된 사람이 카드 <b>두 장을 무작위로</b> 뽑아요 (숫자는 상대에게도 공개)",
      "뽑은 사람이 <b>한 장</b>을 골라 내 시트 원하는 칸에 적고, <b>남은 한 장은 상대에게 넘어가</b> 상대가 자기 시트 원하는 칸에 적어요 → 8번 되풀이",
      "시트가 다 차면 이어진 칸 수가 더 많은 쪽이 승리 · 같으면 공동 1등 · 시트가 모두 공개라 한 기기로도 할 수 있어요",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${Math.min(V.turn + 1, V.N)}/${V.N}번째 뽑기`),
    chip: (V, i) => ({ t: `${V.runs[i]}칸`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, coach, tutorial,
    qa: (V, me, rnd) => B.ai(V, me, "easy", rnd),
  };
})();

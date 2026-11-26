/* 베니 서바이벌 · 3층 오목 — 화면 (육각 격자 판 85칸 · 놓기 / 이동(올라타기) · 오목 · 3층 5개 · 이웃 3층 3개 · 3판 2선승 · 선생님 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const K = window.SVCores.omok3;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NP = K.NP, PTS = K.PTS, LBL = K.LBL, NB = K.NB;
  const COL = ["검정", "하양"], DOT = ["⚫", "⚪"];
  const SRC = "방송: 피의 게임 X · 데스매치 (1:1) — 웨이브 공식 클립 '3층 오목' 규칙 설명 화면 · 경기 장면";
  const DIFF = "3판 2선승(방송은 2라운드까지 보임, 1:1 이면 3라운드) · 무승부 판은 다시 함(3판 2선승은 최대 5판 · 단판은 최대 3판) · 턴 제한시간 없음(방송은 30초 경고가 나옴) · 움직일 돌이 하나도 없으면 그 판은 짐 · 150수가 지나도 못 가리면 무승부 · 판 모양(점 85개)은 영상 화면의 선 · 점을 세어서 정함 · 1판 선공은 무작위, 2판부터는 진 쪽이 정함(방송과 같음), 무승부 뒤에는 번갈아";
  // 받침에 맞춘 조사 — 칸 이름(F5 …)은 끝 숫자를 읽는 소리로
  const jong = w => { const ch = String(w).trim().slice(-1), k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? (k % 28 ? 1 : 0) : -1; };
  const ga = w => { const j = jong(w); return j < 0 ? "이(가)" : j ? "이" : "가"; };
  const lastNum = lb => +String(lb).match(/(\d+)$/)[1];
  const FINAL = { 1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0, 10: 1 };       // 읽는 소리에 받침이 있나
  const eun = lb => `${lb}${FINAL[lastNum(lb)] ? "은" : "는"}`;
  const eul = lb => `${lb}${FINAL[lastNum(lb)] ? "을" : "를"}`;
  const ro = lb => { const n = lastNum(lb); return `${lb}${FINAL[n] && ![1, 7, 8].includes(n) ? "으로" : "로"}`; };

  // 판 그리기 좌표 (칸 간격 1 = 100 단위): 가로 = 8.66 + 여백, 세로 = 9 + 여백
  const WT = 10.06, HT = 10.4;
  const PX = PTS.map(([q]) => (0.7 + (q + 5) * 0.866) / WT * 100), PY = PTS.map(([, y]) => (0.7 + (y + 9) * 0.5) / HT * 100);
  const EDGES = []; NB.forEach((a, i) => a.forEach(j => { if (j > i) EDGES.push([i, j]); }));
  const f1 = v => v.toFixed(2);

  const CSS = `
.o3-top{display:flex;gap:6px;align-items:center;flex:none;min-width:0}
.o3-pill{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 12.5px var(--round);color:#fff;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:4px 10px}
.o3-pill.turn{background:rgba(225,29,72,.28);border-color:rgba(251,113,133,.6)}
.o3-pill.me{background:rgba(34,197,94,.22);border-color:#4ade80}
.o3-pill.sm{font-weight:700;color:var(--soft)}
.o3-pill.r{margin-left:auto}
.o3-hands{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}
.o3-hand{display:flex;align-items:center;gap:5px;min-width:0;padding:3px 8px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);font:700 11.5px var(--round);color:var(--soft);white-space:nowrap;overflow:hidden}
.o3-hand.on{border-color:var(--gold)}
.o3-hand b{color:#fff;font-weight:800;overflow:hidden;text-overflow:ellipsis;min-width:0}
.o3-hand .n{margin-left:auto;color:#fde68a;font-weight:800;font-variant-numeric:tabular-nums}
.o3-hand .fs{color:#93c5fd;font-weight:800}
.o3-wrap{flex:none;width:min(100%,calc((100vh - 350px) * .967));width:min(100%,calc((100dvh - 350px) * .967));margin:0 auto}
.o3-board{position:relative;aspect-ratio:${f1(WT)}/${f1(HT)};border-radius:14px;background:linear-gradient(160deg,#3a2a1c,#26190f);border:1px solid rgba(253,230,138,.25);box-shadow:inset 0 0 18px rgba(0,0,0,.5)}
.o3-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.o3-board svg line{stroke:rgba(253,230,138,.5);stroke-width:1.4;vector-effect:non-scaling-stroke}
.o3-p{position:absolute;width:8.7%;aspect-ratio:1/1;transform:translate(-50%,-50%);display:block;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
span.o3-p{cursor:default}
.o3-p::before{content:"";position:absolute;left:50%;top:50%;width:18%;height:18%;transform:translate(-50%,-50%);border-radius:50%;background:rgba(253,230,138,.55)}
.o3-p.f::before{display:none}
.o3-ly{position:absolute;left:50%;width:78%;aspect-ratio:1/1;transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 1.5px 2px rgba(0,0,0,.55)}
.o3-ly.b{background:radial-gradient(circle at 35% 30%,#64748b,#0b0f17 68%);border:2px solid #cbd5e1}
.o3-ly.w{background:radial-gradient(circle at 35% 30%,#fff,#cbd5e1 78%);border:2px solid #334155}
.o3-ly.low{border-width:1.5px;filter:brightness(.82)}
.o3-ly .fl{position:absolute;inset:0;display:grid;place-items:center;font:900 11px/1 var(--round);pointer-events:none}
.o3-ly.b .fl{color:#fde68a}.o3-ly.w .fl{color:#7c2d12}
.o3-p.pl::after,.o3-p.tg::after{content:"";position:absolute;inset:6%;border-radius:50%;pointer-events:none}
.o3-p.pl::after{border:2px dashed #f5b301}
.o3-p.tg::after{border:2.5px dashed #4ade80;background:rgba(74,222,128,.18)}
.o3-p.mv .o3-ly:last-of-type{box-shadow:0 0 0 2px rgba(253,230,138,.75),0 2px 3px rgba(0,0,0,.6)}
.o3-p.sel .o3-ly:last-of-type{box-shadow:0 0 0 3.5px #fde68a,0 0 12px #fde68a}
.o3-p.wn .o3-ly:last-of-type{box-shadow:0 0 0 3px #4ade80,0 0 12px #4ade80}
.o3-p.lm::after{content:"";position:absolute;inset:-4%;border-radius:50%;border:2px solid rgba(96,165,250,.95);pointer-events:none}
.o3-p.lf::before{display:block;background:rgba(96,165,250,.9);width:30%;height:30%}
.o3-p.no::after{content:"";position:absolute;inset:8%;border-radius:50%;border:2px solid rgba(248,113,113,.9);background:rgba(239,68,68,.2);pointer-events:none}
.o3-p.rec::after{content:"";position:absolute;inset:-8%;border-radius:50%;border:2.5px dotted #38bdf8;pointer-events:none}
.o3-bang,.o3-star{position:absolute;right:-12%;top:-14%;min-width:17px;height:17px;padding:0 3px;border-radius:9px;background:#e11d48;color:#fff;font:900 10px/17px var(--round);text-align:center;box-shadow:0 0 0 2px #fff;pointer-events:none;z-index:3;white-space:nowrap}
.o3-star{background:#f5b301;color:#3b2a00;box-shadow:0 0 0 2px #fff7d6}
.o3-info{flex:none;text-align:center;font-size:12.5px;line-height:1.4;color:var(--soft);min-height:4.2em;display:grid;place-items:center;gap:4px}
.o3-info b{color:#fde68a}
.o3-info.end{font:800 14px/1.4 var(--round);color:#bbf7d0;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:5px 8px}
.o3-info.bad{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}
.o3-info.mid{color:#fde68a;background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}
.o3-ord{display:flex;gap:8px;justify-content:center}
.o3-ord button{font:800 13px var(--round);color:#fff;background:rgba(34,197,94,.3);border:1px solid #4ade80;border-radius:10px;padding:6px 12px;cursor:pointer}
.o3-tut{display:grid;gap:8px;justify-items:center;font-size:13px;width:100%}
.o3-tut .o3-wrap{width:min(100%,250px)}
.o3-tmsg{min-height:2.7em;text-align:center;line-height:1.4;color:var(--soft)}
.o3-tmsg b{color:#fde68a}
.sv-coachfit .o3-wrap{width:min(100%,calc((var(--sv-sh,360px) - 70px) * .967))}
.sv-coachfit .o3-info{display:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || COL[i];

  // 판 그리기 (경기 화면 · 1분 규칙 공용) — stk: 칸마다 [아래부터 색(0 검정 · 1 하양)], o: 칸마다 붙일 표시
  function boardHtml(stk, o = {}) {
    const btn = o.btn !== false, tag = btn ? "button" : "span";
    const has = (k, i) => o[k] && o[k].has(i);
    let g = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">`;
    for (const [a, b] of EDGES) g += `<line x1="${f1(PX[a])}" y1="${f1(PY[a])}" x2="${f1(PX[b])}" y2="${f1(PY[b])}"/>`;
    g += `</svg>`;
    for (let i = 0; i < NP; i++) {
      const s = stk[i], h = s.length;
      let cls = `o3-p${h ? " f" : ""}`;
      for (const k of ["pl", "mv", "sel", "tg", "lm", "lf", "wn", "rec", "no"]) if (has(k, i)) cls += " " + k;
      let inner = "";
      for (let j = 0; j < h; j++) {
        const top = j === h - 1;
        inner += `<i class="o3-ly ${s[j] ? "w" : "b"}${top ? "" : " low"}" style="top:${46 + (h - 1 - j) * 11}%">${top && h >= 2 ? `<span class="fl">${h}</span>` : ""}</i>`;
      }
      if (has("bang", i)) inner += `<span class="o3-bang">! ${LBL[i]}</span>`;
      else if (has("star", i)) inner += `<span class="o3-star">★ ${LBL[i]}</span>`;
      const what = h ? `${LBL[i]} ${COL[s[h - 1]]} 돌 ${h}층` : `${LBL[i]} 빈 칸`;
      g += `<${tag}${btn ? ' type="button"' : ""} class="${cls}" data-c="${i}"${has("tp", i) ? ' data-tp="1"' : ""} style="left:${f1(PX[i])}%;top:${f1(PY[i])}%" aria-label="${what}">${inner}</${tag}>`;
    }
    return `<div class="o3-wrap"><div class="o3-board" aria-label="3층 오목 판">${g}</div></div>`;
  }

  // 눌러 둔 돌 (이 기기에서만 · 차례가 바뀌면 지움)
  let SEL = { key: "", from: -1 };
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.ply}|${V.turn}|${V.phase}|${V.setup ? V.setup.i : -1}|${ctx.me}`; if (SEL.key !== key) SEL = { key, from: -1 }; return SEL; };
  const handHtml = (V, s, label, on) => {
    const board = V.stk.reduce((n, a) => n + a.filter(c => c === s).length, 0);
    return `<div class="o3-hand${on ? " on" : ""}"><b>${esc(label)}</b>${V.first === s && V.phase !== "order" ? `<span class="fs" title="선공">선</span>` : ""}<span class="n">놓을 돌 ${V.hand[s]} · 판 ${board}</span></div>`;
  };
  const KIND = { line5: "오목(5개 일직선)", tower5: "3층 돌 5개", tri3: "이웃한 돌 3개가 3층" };
  function roundLine(res, me, ctx, fin) {
    const nm = s => me === s ? "나" : me >= 0 ? "상대" : esc(nameOf(ctx, s));
    const tagC = s => nm(s) === COL[s] ? "" : `(${COL[s]})`;
    if (res.w < 0) return `🤝 ${res.r}판 무승부 — 150수가 지나도 못 가렸어요${fin ? "" : " · 이 판은 다시 해요"}`;
    const why = res.why === "block" ? (me >= 0 ? (res.w === me ? "상대가 움직일 수 없어요" : "내가 움직일 수 없어요") : `${esc(nameOf(ctx, 1 - res.w))}${ga(nameOf(ctx, 1 - res.w))} 움직일 수 없어요`) : KIND[res.kind] || "승리 조건 달성";
    return `${me < 0 ? "🏆" : me === res.w ? "🏆" : "😵"} ${res.r}판 ${nm(res.w)}${tagC(res.w)} 승 — ${why}`;
  }
  const nextSetupRun = (V, me) => { let n = 0; if (!V.setup) return 0; for (let i = V.setup.i; i < V.setup.seq.length && V.setup.seq[i] === me; i++) n++; return n; };

  function render(stage, V, ctx) {
    style();
    const me = ctx.me, over = !!V.over, ph = V.phase, active = !over && (ph === "setup" || ph === "play");
    const can = !!ctx.canAct && me >= 0 && !over && V.needs.includes(me);
    const S = selFor(V, ctx);
    const L = can && active ? K.legal(V, me) : [];
    const placeT = new Set(), moveF = new Map();
    for (const a of L) {
      if (a.t === "place") placeT.add(a.to);
      else { if (!moveF.has(a.from)) moveF.set(a.from, new Set()); moveF.get(a.from).add(a.to); }
    }
    if (S.from >= 0 && !moveF.has(S.from)) S.from = -1;
    const tg = S.from >= 0 ? moveF.get(S.from) : null;
    const o = { pl: null, no: null, mv: ph === "play" && S.from < 0 ? new Set(moveF.keys()) : null, sel: new Set(S.from >= 0 ? [S.from] : []), tg: tg || null };
    if (ph === "setup" && can) { o.no = new Set(); V.stk.forEach((a, i) => { if (!a.length && !placeT.has(i)) o.no.add(i); }); }
    const L0 = V.last;
    if (L0 && ph === "play") { o.lm = new Set([L0.t]); o.lf = new Set(L0.f >= 0 && !V.stk[L0.f].length ? [L0.f] : []); }
    if ((ph === "between" || over) && V.res && V.res.w >= 0 && V.res.why === "win") o.wn = K.winStones(K.boardOf(V.stk, V.hand))[V.res.w + 1];
    if (ctx.coachOn && ph === "play") {
      const vme = me >= 0 ? me : V.turn, B = K.boardOf(V.stk, V.hand);
      o.bang = new Set(K.winCells(K.winMoves(B, 1 - vme)));
      o.star = new Set(K.winCells(K.winMoves(B, vme)).filter(x => !o.bang.has(x)));
    }

    // 윗줄 · 놓을 돌
    const turnTxt = over ? "끝" : ph === "between" ? "판 끝" : ph === "order" ? (can ? "🎯 선후공 고르기" : "선후공 정하는 중") : can ? "내 차례" : `${esc(nameOf(ctx, V.needs[0] ?? V.turn))} 차례`;
    const stepTxt = ph === "setup" ? "기본 배치" : ph === "play" ? (S.from >= 0 ? "옮기기" : "놓기 · 옮기기") : "";
    let h = `<div class="o3-top"><span class="o3-pill ${over || !active ? "" : can ? "me" : "turn"}">${turnTxt}</span>`;
    if (stepTxt) h += `<span class="o3-pill sm">${stepTxt}</span>`;
    h += `</div>`;
    const bot = me >= 0 ? me : 0, top = 1 - bot;
    const lab = s => me >= 0 ? `${s === me ? "나" : "상대"} ${DOT[s]}` : `${nameOf(ctx, s)} ${DOT[s]}`;
    const who = ph === "play" ? V.turn : ph === "setup" ? (V.needs[0] ?? -1) : -1;
    h += `<div class="o3-hands">${handHtml(V, top, lab(top), who === top)}${handHtml(V, bot, lab(bot), who === bot)}</div>`;
    h += boardHtml(V.stk, o);

    // 아래 안내
    let info, ic = "";
    if (over) {
      const w = V.wins[0] === V.wins[1] ? -1 : V.wins[0] > V.wins[1] ? 0 : 1;
      if (w < 0) { info = `🤝 무승부 — 판 승 ${V.wins[0]} : ${V.wins[1]}`; ic = " end mid"; }
      else { info = `${me < 0 ? `🏆 ${esc(nameOf(ctx, w))}(${COL[w]})` : me === w ? "🏆 내" : "😵 상대"} 승리! 판 승 ${V.wins[w]} : ${V.wins[1 - w]}`; ic = me >= 0 && me !== w ? " end bad" : " end"; }
    } else if (ph === "between" && V.res) {
      info = `${roundLine(V.res, me, ctx)} · 곧 ${V.res.w >= 0 ? "선후공을 정해요" : `${V.round + 1}판을 시작해요`}`; ic = V.res.w < 0 ? " end mid" : me >= 0 && me !== V.res.w ? " end bad" : " end";
    } else if (ph === "order") {
      if (can) info = `진 쪽이 선후공을 정해요 — <b>먼저(선공)</b> 할까요, <b>나중(후공)</b> 할까요?<span class="o3-ord"><button type="button" data-o="1">먼저 할래요</button><button type="button" data-o="0">나중에 할래요</button></span>`;
      else info = `${esc(nameOf(ctx, V.chooser))}${ga(nameOf(ctx, V.chooser))} 선후공을 정하는 중…`;
    } else if (can && ph === "setup") {
      info = `<b>기본 배치</b> — 빈 칸을 눌러 돌을 놓아요 (<b>붉은 테</b> = 정중앙 · 내 돌과 이웃한 칸은 못 놓아요) · 이번에 <b>${nextSetupRun(V, me)}개</b>`;
    } else if (can) {
      if (S.from >= 0) info = `옮길 <b>칸</b>(초록 점선)을 눌러요 · 그 돌을 다시 누르면 취소`;
      else if (V.hand[me] > 0) info = `<b>빈 칸</b>을 눌러 새로 놓기 · 맨 위가 내 색인 <b>내 돌</b>(노란 테)을 눌러 이웃 칸으로 <b>옮기기</b>(올라타기)`;
      else info = `놓을 돌이 없어요 — <b>내 돌</b>(노란 테)을 눌러 이웃 칸으로 옮겨요`;
    } else if (ph === "setup") info = `${esc(nameOf(ctx, V.needs[0]))}${ga(nameOf(ctx, V.needs[0]))} 기본 배치 중… (${V.setup.i + 1}/${V.setup.seq.length})`;
    else info = `${esc(nameOf(ctx, V.turn))} 차례예요…`;
    if (ph === "play" && V.ply >= 100) info += ` · ${V.ply}/${V.CAPPLY}수`;
    h += `<div class="o3-info${ic}"><span>${info}</span></div>`;
    stage.innerHTML = h;

    stage.onclick = e => {
      if (!ctx.canAct || me < 0) return;
      const ch = e.target.closest("[data-o]");
      if (ch && ph === "order" && can) { ctx.sfx("pop"); ctx.act({ t: "order", first: ch.dataset.o === "1" }); return; }
      const b = e.target.closest("[data-c]"); if (!b || !can || !active) return;
      const c = +b.dataset.c, s = V.stk[c];
      if (ph === "setup") {
        if (placeT.has(c)) { ctx.sfx("pop"); ctx.act({ t: "place", to: c }); return; }
        ctx.toast(c === K.CENTER ? "기본 배치에서는 정중앙에 못 놓아요" : s.length ? "빈 칸을 눌러 주세요" : "내 돌과 이웃한 칸에는 못 놓아요", 1500); return;
      }
      if (S.from >= 0 && tg && tg.has(c)) { const from = S.from; S.from = -1; ctx.sfx("pop"); ctx.act({ t: "move", from, to: c }); return; }
      if (S.from === c) { S.from = -1; render(stage, V, ctx); return; }
      if (!s.length) {
        if (placeT.has(c)) { S.from = -1; ctx.sfx("pop"); ctx.act({ t: "place", to: c }); return; }
        ctx.toast("놓을 돌이 없어요 — 내 돌을 옮겨요", 1400); return;
      }
      if (s[s.length - 1] === me) {
        if (moveF.has(c)) { S.from = c; ctx.sfx("tap"); render(stage, V, ctx); return; }
        ctx.toast("그 돌은 갈 곳이 없어요 (이웃 칸이 더 높거나 3층이에요)", 1600); return;
      }
      if (S.from >= 0) { S.from = -1; render(stage, V, ctx); return; }
      ctx.toast("맨 위가 상대 돌이에요 — 내 돌(노란 테)을 눌러요", 1500);
    };
  }

  // ── 선생님 (판이 모두 공개라 보이는 것 그대로) ──
  const L = i => LBL[i];
  const list = a => [...new Set(a)].sort((x, y) => x - y).map(L).join(" · ");
  function actText(a, V) {
    if (!a) return "";
    if (a.t === "order") return a.first ? "먼저(선공) 하기" : "나중(후공) 하기";
    if (a.t === "place") return `${L(a.to)}에 돌 놓기`;
    const fl = V && V.stk && V.stk[a.to] ? V.stk[a.to].length + 1 : 0;
    return `${L(a.from)} 돌을 ${ro(L(a.to))} 옮기기${fl >= 2 ? ` (${fl}층으로 올라타기)` : ""}`;
  }
  function whyText(V, me, r) {
    const t = r.tags, out = [];
    if (t.includes("lose")) out.push("이 수로 내 돌이 빠지면서 밑에 깔려 있던 상대 돌이 드러나, 상대가 바로 이겨요");
    if (t.includes("win")) out.push(`${KIND[r.kind] || "승리 조건"} 완성으로 이 판을 이겨요`);
    if (t.includes("block")) out.push(`상대가 다음에 이길 칸(${list(r.oppBefore)})을 막아요`);
    else if (t.includes("halfBlock")) out.push(`상대가 이길 칸 중 일부만 막아요 — ${list(r.oppAfter)}${ja(list(r.oppAfter),"이")} 남아요`);
    else if (t.includes("noBlock")) out.push(`상대가 이길 칸(${list(r.oppBefore)})이 그대로 남아요 — 막는 것보다 이 수가 낫다고 읽었어요`);
    if (t.includes("cover")) out.push("상대 돌 위에 올라가서 그 돌이 만든 줄을 끊고, 내 돌이 맨 위에 보여요");
    if (t.includes("climb")) out.push(`${r.floor}층으로 올라가요 — 높은 돌은 같은 높이 이상의 돌만 올라올 수 있어서 안전해요`);
    if (t.includes("line4")) out.push("내 돌 4개가 5칸 안에 모여 다음에 한 칸만 채우면 오목이에요");
    else if (t.includes("line3")) out.push("내 돌 3개가 5칸 안에 모여 줄이 자라요");
    if (t.includes("breakLine")) out.push("상대 줄이 자라던 칸을 끊어요");
    if (t.includes("tower")) out.push("내 3층 돌이 하나 늘어요 (3층 돌 5개 · 이웃 3개가 승리 조건)");
    if (t.includes("tri")) out.push(`이웃한 세 칸을 3층으로 만들기까지 돌 ${r.tri[1]}개 남아요`);
    if (t.includes("reveal")) out.push("다만 내 돌이 빠지면서 밑에 깔려 있던 상대 돌이 드러나요");
    if (r.oppAfter && r.oppAfter.length && !t.includes("win") && !t.includes("halfBlock") && !t.includes("noBlock")) out.push(`다만 이 수 뒤에도 상대가 이길 칸이 ${r.oppAfter.length}곳(${list(r.oppAfter)}) 생겨요`);
    return out.length ? out.join(" · ") : "큰 위험도 큰 이득도 없는 무난한 수예요 — 몇 수 앞까지 읽은 점수가 가장 좋아요";
  }
  function coach(V, me, since) {
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me, play = V.phase === "play" && !V.over;
    // 👀 상대 흐름
    const evs = V.log.filter(e => e.i > since && e.s === opp && (e.k === "pl" || e.k === "mv" || e.k === "setup"));
    const p = [];
    if (!evs.length) p.push(V.ply === 0 && V.round === 1 && V.phase !== "play" ? "아직 놓인 돌이 거의 없어요." : "내 지난 차례 뒤 상대가 둔 수는 없어요.");
    else {
      const parts = evs.slice(-3).map(e => e.k === "setup" ? `${L(e.to)}에 기본 배치` : e.k === "pl" ? `${L(e.to)}에 놓음` : `${L(e.from)} → ${L(e.to)}${e.fl >= 2 ? ` (${e.fl}층${e.cov === me ? " · 내 돌을 덮음" : ""})` : ""}`);
      p.push(`상대: ${parts.join(" · ")}${evs.length > 3 ? ` (그 전 ${evs.length - 3}번 더)` : ""}.`);
    }
    const A = K.analyze(V, me), ss = A.st;
    if (play) {
      if (A.opp.length) p.push(`상대가 다음 차례에 이길 칸이 있어요: ${list(A.opp)} — 판에 '!' 로 표시했어요.`);
      else p.push("지금 상대가 바로 이길 수 있는 수는 없어요.");
    }
    // 📊 내 흐름
    const a = ss[0], b = ss[1];
    let m = `내 돌 ${a.stones}개 (놓을 돌 ${a.hand}) · 상대 ${b.stones}개. 위에서 보이는 내 돌 1층 ${a.f1} · 2층 ${a.f2} · 3층 ${a.f3}개 (상대 ${b.f1} · ${b.f2} · ${b.f3}).`;
    m += ` 5칸 줄에 내 돌 최대 ${a.line}개(5개면 승)${a.tri <= 6 ? ` · 이웃 세 칸을 3층으로 만들기까지 돌 ${a.tri}개` : ""}.`;
    if (V.bo === 3) m += ` 판 승 ${V.wins[me]} : ${V.wins[opp]} (2승이면 끝).`;
    if (play && A.me.length) m += ` 내가 바로 이길 칸: ${list(A.me)} (★).`;
    // 💡 추천 · 👉 뜻
    let rec, why = "";
    if (V.over) rec = "끝났어요.";
    else if (V.phase === "between") rec = "판이 끝났어요 — 다음 판을 준비해요.";
    else if (V.phase === "order") { rec = V.chooser === me ? "진 쪽이 선후공을 정해요 — 선공이 첫 수를 두는 이점이 있어요." : "상대가 선후공을 고르는 중이에요."; }
    else if (V.phase === "setup") {
      rec = V.needs.includes(me) ? "기본 배치예요 — 정중앙과 내 돌 이웃 칸은 못 놓아요. 한 칸 띄워 두면 상대가 바로 올라타기 어렵고, 줄 만들 자리가 남아요." : "상대가 기본 배치 중이에요.";
    } else if (V.turn !== me) rec = "상대 차례예요 — 내 차례가 되면 추천해 드려요.";
    else if (!A.rec) rec = "둘 수 있는 수가 없어요.";
    else { rec = `${actText(A.rec.a, V)}.`; why = whyText(V, me, A.rec); }
    return { opp: p.join(" "), mine: m, rec, why };
  }

  // ── 복기 고리 ──
  function review(Vb, seat, myA, bestA) {
    const J = K.judge(Vb, seat, myA, bestA);
    if (!J || J.my === null || J.best === null) return { sev: 0, why: "같은 수가 아니어도 틀린 것은 아니에요" };
    const W = J.WINV - 200, loss = Math.max(0, Math.round(J.best - J.my));
    const ex = a => K.explain(Vb, seat, a), em = ex(myA), eb = ex(bestA), has = (e, t) => e.tags.includes(t);
    let sev, why;
    if (J.best >= W && J.my < W) { sev = 100; why = `고급 AI의 수(${actText(bestA, Vb)})면 몇 수 안에 이 판을 이기는 길이 있었어요`; }
    else if (J.my <= -W && J.best > -W) { sev = 100; why = `이 수 뒤엔 상대가 몇 수 안에 이기는 길이 생겨요 — ${actText(bestA, Vb)}${ja(actText(bestA, Vb),"로")} 버틸 수 있었어요`; }
    else {
      sev = loss >= 300 ? 90 : loss >= 150 ? 75 : loss >= 80 ? 60 : loss >= 40 ? 40 : loss > 8 ? 20 : 5;
      const r = [];
      if (has(eb, "win") && !has(em, "win")) r.push("그때 바로 이길 수 있었어요");
      if (has(eb, "block") && !has(em, "block")) r.push(`상대가 이길 칸(${list(eb.oppBefore)})을 막아야 했어요`);
      if ((em.oppAfter || []).length > (eb.oppAfter || []).length) r.push(`내 수 뒤 상대가 이길 칸 ${em.oppAfter.length}곳 (고급 AI 수 뒤엔 ${(eb.oppAfter || []).length}곳)`);
      if (has(eb, "line4") && !has(em, "line4")) r.push("고급 AI 수는 내 돌 4개를 한 줄에 모아요");
      if (has(em, "reveal")) r.push("내 수는 밑에 깔린 상대 돌을 드러내요");
      why = loss <= 8 ? `고급 AI: ${actText(bestA, Vb)} — 몇 수 앞까지 읽어도 내 수와 거의 같은 값이에요 (차이 ${loss}점)`
        : `고급 AI: ${actText(bestA, Vb)} — 몇 수 앞까지 읽으면 내 수보다 약 ${loss}점 나아요 (돌 4개 줄 = 380점, 3층 돌 = 14점)${r.length ? " · " + r.join(" · ") : ""}`;
    }
    return { sev, why, my: actText(myA, Vb), best: actText(bestA, Vb) };
  }

  function result(V, me) {
    const ctx = {};
    const rows = V.hist.map((r, i) => roundLine(r, me, ctx, V.over && i === V.hist.length - 1)).join("<br>");
    const w = V.wins[0] === V.wins[1] ? -1 : V.wins[0] > V.wins[1] ? 0 : 1;
    const head = w < 0 ? `<b>무승부</b> — 판 승 ${V.wins[0]} : ${V.wins[1]}` : `<b>${me === w ? "나" : me >= 0 ? "상대" : COL[w]}${me >= 0 ? `(${COL[w]})` : ""} 승리</b> — 판 승 ${V.wins[w]} : ${V.wins[1 - w]}`;
    return `${head}<br>${rows}`;
  }

  // ── 1분 규칙 ── (칸은 좌표 [q, y] 로 — 칸 이름 대신)
  const Q = (q, y) => PTS.findIndex(p => p[0] === q && p[1] === y);
  const mk = list => { const st = Array.from({ length: NP }, () => []); for (const [q, y, a] of list) st[Q(q, y)] = a.slice(); return st; };
  const cells = list => new Set(list.map(([q, y]) => Q(q, y)));
  function tutorial() {
    style();
    const tb = (stk, o) => `<div class="o3-tut">${boardHtml(stk, Object.assign({ btn: false }, o))}</div>`;
    // 기본 배치에서 못 놓는 칸: 정중앙 + 내(검정) 돌과 이웃한 칸
    const setupStk = mk([[-2, -4, [0]], [2, 2, [1]], [-1, 3, [1]]]);
    const forbid = new Set([K.CENTER]); setupStk.forEach((a, i) => { if (a.length && a[0] === 0) K.NB[i].forEach(j => forbid.add(j)); });
    for (let i = 0; i < NP; i++) if (setupStk[i].length) forbid.delete(i);
    return [
      { tag: "STEP 1 · 판", title: "육각 격자 · 돌 25개씩", body: "선이 만나는 <b>점</b>이 칸이에요(85칸). 검정 · 하양 <b>돌 25개씩</b>. 돌은 <b>3층까지</b> 쌓을 수 있고, 위에서 봤을 때 칸의 <b>맨 위 돌 색</b>이 그 칸의 주인이에요.",
        boardHtml: tb(mk([[-1, -1, [0]], [1, 1, [1]], [0, 2, [0, 1]], [-2, 2, [1, 0, 1]], [2, -2, [0, 1, 0]]]), {}), ms: 5600 },
      { tag: "STEP 2 · 기본 배치", title: "선 1 → 후 2 → 선 2 → 후 1", body: "먼저 <b>기본 배치</b>로 3개씩 놓아요. 선공 1개 → 후공 2개 → 선공 2개 → 후공 1개 (그림: 선공 1개 · 후공 2개를 놓은 뒤). 단 <b>정중앙 칸</b>과 <b>내 돌과 이웃한 칸</b>(붉은 테)에는 못 놓아요.",
        boardHtml: tb(setupStk, { no: forbid }), ms: 6200 },
      { tag: "STEP 3 · 한 턴", title: "놓기 또는 옮기기", body: "내 차례에는 둘 중 하나. ① 빈 칸에 돌 <b>새로 놓기</b> ② 내 돌(맨 위가 내 색) <b>하나를 이웃 칸으로 옮기기</b> — 다른 돌 위로 <b>올라탈 수</b> 있어요(초록 점선).",
        boardHtml: tb(mk([[-1, -1, [0]], [0, 0, [1]], [-2, 0, [1]], [-1, 1, [0]], [1, 3, [1]]]), { sel: cells([[-1, -1]]), tg: cells([[-1, -3], [0, -2], [0, 0], [-2, -2], [-2, 0], [-1, 1]]) }), ms: 5800 },
      { tag: "STEP 4 · 쌓기 규칙", title: "원래 칸보다 높은 칸은 못 가요", body: "1층 돌은 1층 칸까지만 올라타고, <b>2층 칸으로는 못 가요</b>(2층 돌은 2층 칸 위로 → 3층). <b>3층 칸</b> 위에는 아무도 못 올라가요. 높은 곳에 오른 돌은 같은 높이 이상의 돌만 올라올 수 있어서 안전해요.",
        boardHtml: tb(mk([[-1, -1, [0]], [0, 0, [1, 0]], [0, -2, [1, 1, 0]], [-2, 0, [0, 1]]]), { sel: cells([[-1, -1]]), tg: cells([[-1, -3], [-2, -2], [-1, 1]]) }), ms: 6600 },
      { tag: "STEP 5 · 이기는 법 ①", title: "오목 — 정확히 5개", body: "위에서 본 내 돌 <b>5개가 일직선</b>(세로 · 두 대각선)이면 승! 단 <b>6개 이상</b> 이어지면 오목으로 안 쳐요. 쌓인 칸은 맨 위 색으로 셈하니, 올라타서 상대 줄을 끊을 수 있어요.",
        boardHtml: tb(mk([[-2, -2, [0]], [-1, -1, [0]], [0, 0, [1, 0]], [1, 1, [0]], [2, 2, [0]], [-1, 1, [1]], [1, -1, [1]]]), { wn: cells([[-2, -2], [-1, -1], [0, 0], [1, 1], [2, 2]]) }), ms: 6200 },
      { tag: "STEP 6 · 이기는 법 ② ③", title: "3층 돌 5개 · 이웃한 3층 3개", body: "<b>내 돌 5개가 3층</b>(어디든)에 있거나, <b>서로 이웃한 내 돌 3개가 3층</b>이면 승! 두 플레이어가 동시에 이루면 <b>그 턴을 둔 사람</b>이 이겨요. 방송 1라운드가 이렇게 끝났어요.",
        boardHtml: tb(mk([[-1, -1, [1, 0, 0]], [-1, 1, [1, 0, 0]], [0, 0, [1, 1, 0]], [1, 1, [1]], [-2, 0, [0, 1]]]), { wn: cells([[-1, -1], [-1, 1], [0, 0]]) }), ms: 6600 },
      { tag: "STEP 7 · 직접", title: "내 돌로 상대 돌 위에 올라타 봐요", body: "검정(나) 돌을 눌러 선택하고, <b>하양 돌 위</b>(초록 점선)를 눌러 올라타 보세요. 올라타면 그 칸은 내 색으로 보여요!",
        interactive: { hint: "👆 내 돌 → 하양 돌", doneText: "✅ 올라탔어요! 2층 돌은 아래 돌이 못 덮어요" },
        render(stage, ctrl) {
          const stk = mk([[-1, -1, [0]], [0, 0, [1]], [1, 1, [0]]]);
          const from = Q(-1, -1), tgt = Q(0, 0);
          let step = 0, sel = -1, msg = `먼저 <b>검정 돌</b>(${LBL[from]})을 눌러요`;
          const draw = () => {
            const o = { btn: true };
            if (step === 0 && sel < 0) { o.mv = new Set([from]); o.tp = new Set([from]); }
            else if (step === 0) { o.sel = new Set([from]); o.tg = new Set([tgt]); o.tp = new Set([tgt]); }
            stage.innerHTML = `<div class="o3-tut">${boardHtml(stk, o)}<div class="o3-tmsg">${msg}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-c]"); if (!b || step === 1) return;
            const c = +b.dataset.c;
            if (sel < 0) {
              if (c !== from) { ctrl.sfx("tap"); msg = `<b>검정 돌</b> ${eul(LBL[from])} 눌러요`; draw(); return; }
              sel = c; ctrl.sfx("tap"); msg = `이제 <b>하양 돌 ${LBL[tgt]}</b>(초록 점선)를 눌러 올라타요`; draw(); return;
            }
            if (c === tgt) { stk[from] = []; stk[c].push(0); step = 1; ctrl.sfx("win"); msg = `🏆 <b>2층</b>! 이제 ${eun(LBL[tgt])} 검정으로 보여요`; draw(); ctrl.complete(); return; }
            ctrl.sfx("tap"); msg = `하양 돌 <b>${LBL[tgt]}</b>(초록 점선)를 눌러요`; draw();
          };
          draw();
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.omok3 = {
    name: "3층 오목", emoji: "🔴", short: "돌을 3층까지 쌓는 오목 — 5개 일직선 · 3층 5개 · 이웃 3층 3개, 3판 2선승", min: 2, max: 2, defN: 2, board: true, fitCoach: true,
    src: SRC, diff: DIFF,
    opts: [{ k: "bo", label: "판 수", items: [[3, "3판 2선승"], [1, "단판"]], def: 3 }],
    howto: [
      "🎯 목표: 아래 <b>셋 중 하나</b>를 먼저 이루면 그 판 승 · <b>3판 2선승</b>",
      "① <b>오목</b> — 위에서 본 내 돌 5개 일직선(6개 이상은 안 됨) ② 내 돌 <b>5개가 3층</b> ③ <b>서로 이웃한 내 돌 3개가 3층</b>",
      "육각 격자 판(85칸), 돌 <b>25개씩</b>. 먼저 <b>기본 배치</b>: 선 1 → 후 2 → 선 2 → 후 1개 (정중앙 · 내 돌 이웃 칸은 못 놓음)",
      "내 차례엔 <b>빈 칸에 새로 놓기</b> 또는 <b>내 돌 하나를 이웃 칸으로 옮기기</b>(올라타기 가능, 3층까지, 원래 칸보다 높은 칸으로는 못 감)",
      "동시에 이루면 그 턴을 둔 사람이 승 · 2라운드부터 선후공은 진 쪽이 정함",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => `${V.over ? "끝" : V.bo === 3 ? `${V.round}판` : `단판${V.round > 1 ? ` (${V.round}번째)` : ""}`}${V.bo === 3 || V.over ? ` · ${DOT[0]}${V.wins[0]} : ${V.wins[1]}${DOT[1]}` : ""}`,
    chip: (V, i) => ({ t: `${DOT[i]}${V.hand[i]}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText: (a, V) => actText(a, V),
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();

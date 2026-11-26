/* 베니 서바이벌 · 믹스 앤 매치 — 화면 (노란 선 카드 · 합 말하기 키패드 · AI 선생님 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const K = window.SVCores.mixmatch;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 피의 게임 3 · 14화 파이널 매치 3라운드 '믹스 앤 매치' (3명) · 확인 영상: 웨이브 '[피의 게임3] 우승자 탄생 앞둔 마지막 라운드' 14회 하이라이트 (규칙 설명 · 카드 6장 화면)";
  const DIFF = "2~4명(방송 3명) · 동점이면 연장 라운드(최대 5번) · 카드마다 노란 선을 나누는 확률은 방송 화면 6장의 평균에 맞춤 · 숫자는 1~99 · 카드 한 장(3초)마다 '말할래요 / 기다려요' 로 끊어 처리(같은 3초 안에 여럿이 말하면 누른 시각이 빠른 쪽 먼저) · 카드가 다 나온 뒤에도 3초씩 최대 30초 더 지켜봄 · 합 입력은 15초 안에 확정(시간이 지나거나, 누른 뒤 1.5초 넘게 망설이다 물러나면 틀린 걸로 침) · 지난 카드는 방송처럼 안 보임(연습 옵션: 작게 보기)";
  const CSS = `
.mm-info{flex:none;text-align:center;border-radius:12px;padding:5px 8px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);font-size:12.5px;line-height:1.4;color:var(--soft);min-height:2.9em;display:grid;align-content:center;overflow-wrap:anywhere;word-break:keep-all}
.mm-info b{color:#fde68a}
.mm-info.win{background:rgba(34,197,94,.14);border-color:rgba(74,222,128,.45)}.mm-info.win .t{color:#bbf7d0}
.mm-info.lose{background:rgba(239,68,68,.14);border-color:rgba(248,113,113,.5)}.mm-info.lose .t{color:#fecaca}
.mm-info.mid{background:rgba(245,179,1,.12);border-color:rgba(245,179,1,.4)}.mm-info.mid .t{color:#fde68a}
.mm-info .t{font:900 14.5px var(--round)}
.mm-mid{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center}
.mm-mid>*{flex:none}
.mm-mid>.mm-card{flex:1 1 0;min-height:90px;width:100%;max-width:330px}
.mm-card{display:block;border-radius:8px}
.mm-card.ph{opacity:.55}
.mm-cap{font:800 12px var(--round);color:var(--soft);text-align:center}
.mm-cap b{color:#fde68a}
.mm-dots{display:flex;gap:6px;justify-content:center}
.mm-dots i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:900 11px var(--round);font-style:normal;border:2px solid rgba(255,255,255,.25);color:var(--soft)}
.mm-dots i.a{border-color:#7dd3fc}.mm-dots i.b{border-color:#fdba74}
.mm-dots i.on{background:#fde047;color:#422006;border-color:#fde047}
.mm-dots i.done{background:rgba(255,255,255,.14);color:#fff}
.mm-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;width:min(100%,300px)}
.mm-bar b{display:block;height:100%;width:100%;background:linear-gradient(90deg,#fde047,#f59e0b)}
.mm-th{display:flex;gap:4px;justify-content:center;flex-wrap:wrap}
.mm-tn{display:block;width:46px;border-radius:4px}
.mm-sum{display:flex;gap:6px;align-items:center;justify-content:center;font:900 20px var(--round);color:#fde68a;flex-wrap:nowrap}
.mm-sum svg{width:min(36vw,140px);border-radius:8px}
.mm-eq{font:900 22px var(--round);color:#fde68a;text-align:center;white-space:nowrap}
.mm-sum span{white-space:nowrap}
.mm-bd{flex:none;display:grid;gap:5px;margin-top:auto}
.mm-btn{padding:11px 4px;font:900 16px var(--round);border-radius:14px}
.mm-disp{text-align:center;font:900 22px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.4);border-radius:12px;padding:3px 0;min-height:36px}
.mm-disp small{font:800 12px var(--round);color:var(--soft);margin-right:6px}
.mm-pad{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.mm-pad .btn{padding:8px 0;font:900 17px var(--round);min-width:0}
.mm-act{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.mm-note{flex:none;text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4;margin-top:auto;overflow-wrap:anywhere;word-break:keep-all}
.mm-note b{color:#fde68a}
.mm-tut{display:grid;gap:8px;justify-items:center;width:100%}
.mm-tut .row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
.mm-tut svg{width:min(42vw,150px);border-radius:8px}
.mm-tut .big{font:900 24px var(--round);color:#fde68a}
.mm-tut .msg{min-height:20px;font:800 13.5px var(--round);color:#fde68a;text-align:center}
.mm-tut .ch{display:flex;gap:8px;justify-content:center}
.mm-tut .ch .btn{font:900 20px var(--round);min-width:64px}
.mm-tut small{display:block;text-align:center;color:var(--soft);font-size:11.5px;overflow-wrap:anywhere;word-break:keep-all}
.mm-tut figure{margin:0;display:grid;gap:2px;justify-items:center}
.mm-tut figure svg{width:min(28vw,104px)}
.mm-tut figcaption,.mm-tut .lg{font:800 11.5px var(--round);color:var(--soft);display:inline-flex;align-items:center;gap:4px}
.mm-tut .lg i{display:inline-block;width:14px;height:5px;border-radius:3px}
.mm-tut .lgs{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.mm-tut .grp{font:900 12px var(--round);color:#fde68a}
@media (max-height:700px){.mm-info{min-height:2.6em;padding:4px 8px}.mm-btn{padding:9px 4px}.mm-pad .btn{padding:6px 0}}
.sv-coachfit .mm-mid>.mm-card{min-height:60px}
.sv-coachfit .mm-th,.sv-coachfit .mm-cap{display:none}
.sv-coachfit .mm-btn{padding:7px 4px}.sv-coachfit .mm-pad .btn{padding:4px 0}.sv-coachfit .mm-info{min-height:0}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const jong = s => { const ch = String(s).slice(-1), c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch); };
  const sf = (n, a, b) => (jong(n) ? a : b);
  const iga = (n, isMe) => (isMe ? "내가" : esc(n) + sf(n, "이", "가"));
  const eun = (n, isMe) => (isMe ? "나는" : esc(n) + sf(n, "은", "는"));
  const pct = x => `${Math.round(x * 100)}%`;
  const sec = ms => (ms / 1000).toFixed(1);
  const said = e => (e.sum > 0 ? e.sum : "시간 초과");                    // 합 0 = 말하다 시간이 끝났거나 오래 망설이다 물러남

  // ── 카드 · 숫자 그림 (7칸 × 6칸 격자, 칸 변 하나가 반 획) ──
  const COLS = ["#fde047", "#7dd3fc", "#fdba74", "#86efac", "#f9a8d4", "#c4b5fd"];
  function lines(ids, col, w) {
    return ids.map(i => {
      const g = K.geom(i), dx = Math.sign(g[2] - g[0]) * 0.07, dy = Math.sign(g[3] - g[1]) * 0.07;
      return `<line x1="${g[0] + dx}" y1="${g[1] + dy}" x2="${g[2] - dx}" y2="${g[3] - dy}" stroke="${col}" stroke-width="${w || 0.17}" stroke-linecap="round"/>`;
    }).join("");
  }
  function cardSvg(ids, o) {
    o = o || {};
    let g = "";
    for (let i = 0; i <= 7; i++) g += `<line x1="${i}" y1="0" x2="${i}" y2="6"/>`;
    for (let j = 0; j <= 6; j++) g += `<line x1="0" y1="${j}" x2="7" y2="${j}"/>`;
    const layers = o.layers || [{ ids, col: o.col || COLS[0] }];
    const vb = o.num ? "0.75 0.75 5.5 4.5" : "-0.12 -0.12 7.24 6.24";
    return `<svg class="${o.base || "mm-card"}${o.cls ? " " + o.cls : ""}" viewBox="${vb}" role="img" aria-label="${esc(o.label || "카드")}"><rect x="-0.12" y="-0.12" width="7.24" height="6.24" fill="${o.num ? "#2a2f38" : "#454b55"}"/>${o.num ? "" : `<g stroke="rgba(255,255,255,.16)" stroke-width=".035">${g}</g>`}${layers.map((l, i) => lines(l.ids, l.col, o.nest ? (o.w || 0.17) * (1 - 0.32 * i) : o.w)).join("")}</svg>`;
  }
  const numSvg = (n, col) => cardSvg(K.unitsOf(n), { num: true, col: col || COLS[0], label: `숫자 ${n}` });

  // ── 이 기기가 재는 시간 (카드 한 장 3초 · 말하기 15초) — 끝나면 '기다려요' 를 대신 눌러 줌 ──
  const SAY_MS = 15000, GRACE_MS = 1500;                  // 합 입력 제한 · 눌러 놓고 물러나도 공짜인 시간
  let TM = { key: "", id: 0, t0: 0, limit: 0, ctx: null, done: false }, AN = { key: "", open: false, ms: 0, txt: "", t0: 0 };
  const stopTm = () => { if (TM.id) clearInterval(TM.id); TM = { key: "", id: 0, t0: 0, limit: 0, ctx: null, done: false }; };
  // 한 카드(stage)에 수는 한 번만: 누르기 · 시간 끝이 겹쳐도 두 번 보내지 않음 (거절되면 다시 열어 줌)
  function fire(ctx, a) {
    if (!ctx || TM.done) return { ok: true, skipped: true };               // 이미 이 카드에서 보냈음 — 조용히 무시
    TM.done = true;
    const r = ctx.act(a);
    if (r && r.ok === false) TM.done = false;
    return r;
  }
  function tick(stage) {
    if (!document.body.contains(stage)) { stopTm(); return; }
    const b = stage.querySelector(".mm-bar b"), c = stage.querySelector(".mm-cd");
    const now = Date.now();
    if (AN.open) {
      const left = SAY_MS - (now - AN.t0);
      if (c) c.textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0 && !TM.done) { AN.open = false; fire(TM.ctx, { t: "ans", sum: 0, ms: AN.ms }); }     // 말하다 시간이 끝남 = 틀린 걸로
      return;
    }
    const left = TM.limit - (now - TM.t0);
    if (b) b.style.width = `${Math.max(0, Math.min(100, (left / TM.limit) * 100))}%`;
    if (left <= 0 && !TM.done) fire(TM.ctx, { t: "wait" });
  }
  function timers(stage, V, ctx, canIn) {
    if (!canIn) { stopTm(); return; }
    const key = `${ctx.g}|${V.round}|${V.stage}`;
    if (TM.key !== key) { stopTm(); TM = { key, id: 0, t0: Date.now(), limit: ctx.fast ? 150 : V.stageMs, ctx, done: false }; TM.id = setInterval(() => tick(stage), 100); }
    TM.ctx = ctx;
  }
  const anFor = (V, ctx) => { const key = `${ctx.g}|${V.round}|${V.stage}|${ctx.me}`; if (AN.key !== key) AN = { key, open: false, ms: 0, txt: "", t0: 0 }; return AN; };

  // ── 화면 ──
  const roundTxt = V => (V.round > V.rounds ? `연장 ${V.round - V.rounds}` : `${V.round}/${V.rounds}`);
  const tieNext = V => { const top = Math.max(...V.score); return V.score.filter(x => x === top).length > 1 && V.extra < K.XMAX; };   // 마지막 라운드가 끝났는데 1등이 여럿 → 연장
  const kindTxt = k => `${k % 2 ? "첫째" : "둘째"} 숫자 (${Math.ceil(k / 2)}/3)`;       // k = 1..6
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, spec = me < 0 || V.seat === "all" || ctx.mode === "watch";
    const nm = i => nameOf(ctx, i), lab = i => (spec || i !== me ? nm(i) : "나");
    const run = V.phase === "run", bt = V.phase === "between", ov = V.over;
    const canIn = !spec && !!ctx.canAct && V.needs.includes(me) && run && !ov;
    const last = V.last;
    const An = canIn ? anFor(V, ctx) : null;
    const lockMe = !spec && run && V.lockLeft[me] > 0 && !V.needs.includes(me);
    // 안내
    let h = "", info = "", cls = "";
    if (ov) { info = `<div class="t">끝났어요</div>`; cls = "mid"; }
    else if (bt && last) {
      const w = last.w;
      if (w < 0) { cls = "mid"; info = `<div class="t">🤝 아무도 못 맞혔어요</div>정답은 <b>${last.sum}</b>`; }
      else if (!spec && w === me) { cls = "win"; info = `<div class="t">🏆 내가 맞혔어요! +1점</div>합 <b>${last.sum}</b>`; }
      else if (spec) { cls = "mid"; info = `<div class="t">🏆 ${esc(nm(w))} 정답! +1점</div>합 <b>${last.sum}</b>`; }
      else { cls = "lose"; info = `<div class="t">😵 ${iga(nm(w), false)} 먼저 맞혔어요</div>합 <b>${last.sum}</b>`; }
    } else if (run) {
      const ev = V.log.filter(e => e.k === "ans" && e.r === V.round).slice(-2).map(e => `${esc(lab(e.s))} ${said(e)} ❌`).join(" · ");
      if (spec) info = `👀 카드를 겹쳐 두 숫자의 합을 맞히는 중이에요${ev ? ` — ${ev}` : ""}`;
      else if (An && An.open) info = `✍️ 합을 눌러 입력해요 — <b>확정</b>을 누르면 말한 거예요 <span class="mm-cd">15</span>초 안에 · 1.5초 넘게 망설이다 물러나면 틀린 걸로 쳐요`;
      else if (canIn) info = `🙋 합을 알겠으면 <b>정답!</b> — 아직이면 기다려요 (3초마다 다음 카드)${ev ? `<br>${ev}` : ""}`;
      else if (lockMe) info = `🔒 틀려서 쉬는 중이에요 — 곧 다시 말할 수 있어요 · 카드는 계속 봐요`;
      else info = `⏳ 다른 사람을 기다려요`;
    }
    if (spec) h += `<div class="mm-cap">👀 구경 중</div>`;
    h += `<div class="mm-info ${cls}"><div>${info}</div></div>`;
    // 가운데: 카드 / 정답 공개
    let mid = "";
    if ((bt || ov) && last) {
      mid = `<div class="mm-sum">${numSvg(last.A, COLS[1])}<span>+</span>${numSvg(last.B, COLS[2])}</div><div class="mm-eq">${last.A} + ${last.B} = ${last.sum}</div><div class="mm-cap">첫째 숫자 <b>${last.A}</b> (1·3·5번째 카드) · 둘째 숫자 <b>${last.B}</b> (2·4·6번째 카드)</div>`;
      if (V.hist.length) mid += `<div class="mm-cap">라운드가 시작되고 약 ${(V.hist.slice(-1)[0].stage - 1) * 3}초 뒤에 끝났어요</div>`;
    } else if (run) {
      const k = Math.min(V.stage, 6);
      if (V.stage <= 6) mid += cardSvg(V.cards[k - 1] || [], { label: `${k}번째 카드` }) + `<div class="mm-cap"><b>${k}번째 카드</b> · ${kindTxt(k)}</div>`;
      else mid += cardSvg([], { cls: "ph", label: "카드가 모두 나왔어요" }) + `<div class="mm-cap">카드 <b>6장</b>이 모두 나왔어요 — 합을 맞혀 봐요</div>`;
      mid += `<div class="mm-dots">${[1, 2, 3, 4, 5, 6].map(i => `<i class="${i % 2 ? "a" : "b"}${i === V.stage ? " on" : i < V.stage ? " done" : ""}">${i}</i>`).join("")}</div>`;
      if (canIn && !(An && An.open)) mid += `<div class="mm-bar"><b></b></div>`;
      if (V.aid && V.cards.length) {
        const past = V.cards.slice(0, V.stage > 6 ? 6 : V.stage - 1);
        if (past.length) mid += `<div class="mm-th">${past.map((c, i) => cardSvg(c, { base: "mm-tn", label: `${i + 1}번째 카드`, col: i % 2 ? COLS[2] : COLS[1], w: 0.22 })).join("")}</div>`;
      }
    }
    h += `<div class="mm-mid">${mid}</div>`;
    // 아래: 정답 단추 · 키패드
    if (canIn && An && An.open) {
      h += `<div class="mm-bd"><div class="mm-disp"><small>합</small>${An.txt || "&nbsp;"}</div><div class="mm-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button type="button" class="btn" data-k="${d}">${d}</button>`).join("")}<button type="button" class="btn" data-k="back" aria-label="지우기">⌫</button><button type="button" class="btn" data-k="clr" aria-label="모두 지우기">C</button></div><div class="mm-act"><button type="button" class="btn mm-btn" data-a="cancel">↩ 기다릴래요</button><button type="button" class="btn primary mm-btn" data-a="ok">✅ 확정</button></div></div>`;
    } else if (canIn) h += `<div class="mm-bd"><button type="button" class="btn primary mm-btn" data-a="buzz">🙋 정답!</button></div>`;
    else if (ov) h += `<div class="mm-note">끝났어요 · ${V.score.map((s, i) => `${esc(lab(i))} <b>${s}</b>`).join(" : ")}</div>`;
    else if (bt) h += `<div class="mm-note">${V.round < V.total ? "잠시 뒤 다음 라운드가 시작돼요…" : tieNext(V) ? "점수가 같아요 — 잠시 뒤 연장 라운드가 시작돼요…" : "잠시 뒤 결과가 나와요…"}</div>`;
    else if (spec) h += `<div class="mm-note">👀 구경 중 — 카드 세 장씩을 겹쳐 숫자 두 개를 알아내요</div>`;
    else h += `<div class="mm-note">${lockMe ? "🔒 쉬는 동안 카드를 눌러 외워 둬요" : "다른 사람이 말할 때까지 기다려요"}</div>`;

    stage.innerHTML = h;
    timers(stage, V, ctx, canIn);
    stage.onclick = e => {
      const t = e.target.closest("button"); if (!t || t.disabled || !canIn) return;
      const a = t.dataset.a, k = t.dataset.k;
      if (a === "buzz") { An.ms = Math.max(0, Math.min(V.stageMs - 1, Date.now() - (TM.t0 || Date.now()))); An.open = true; An.t0 = Date.now(); An.txt = ""; ctx.sfx("pop"); render(stage, V, ctx); return; }
      if (a === "cancel") {
        // 누르자마자(1.5초 안) 물러나면 그냥 '기다려요' · 그 뒤에 물러나면 말하다 못 한 것 = 틀린 걸로 (멈춰 두고 생각하는 길을 막음)
        const slow = Date.now() - An.t0 > GRACE_MS;
        An.open = false; ctx.sfx("tap");
        if (slow) ctx.toast("오래 망설이다 물러나서 틀린 걸로 쳐요", 1800);
        fire(ctx, slow ? { t: "ans", sum: 0, ms: An.ms } : { t: "wait" }); return;
      }
      if (a === "ok") {
        if (!An.txt) { ctx.toast("합을 입력해요"); return; }
        const sum = +An.txt; if (sum < 1 || sum > 198) { ctx.toast("합은 1~198 사이예요"); return; }
        An.open = false; ctx.sfx("pop");
        const r = fire(ctx, { t: "ans", sum, ms: An.ms }); if (r && r.ok === false) { An.open = true; render(stage, V, ctx); }
        return;
      }
      if (k != null) {
        if (k === "back") An.txt = An.txt.slice(0, -1); else if (k === "clr") An.txt = ""; else if (An.txt.length < 3 && !(k === "0" && !An.txt)) An.txt += k;
        if (An.txt.length > 1 && An.txt[0] === "0") An.txt = An.txt.replace(/^0+/, "");
        ctx.sfx("tap"); render(stage, V, ctx);
      }
    };
  }

  // ── 끝났을 때 한 줄 더 ──
  function result(V, me) {
    const who = i => (me >= 0 ? (i === me ? "나" : `${i + 1}번`) : `${i + 1}번`);
    const rows = V.hist.map(h => `<div>${h.extra ? `연장 ${h.r - V.rounds}` : h.r}라운드 · <b>${h.w < 0 ? "아무도 못 맞힘" : `${who(h.w)} 정답`}</b> · ${h.A} + ${h.B} = ${h.sum}</div>`).join("");
    return `<div>점수 ${V.score.map((s, i) => `${who(i)} <b>${s}</b>`).join(" : ")}</div>${rows}`;
  }

  // ── AI 선생님 (보이는 것: 지금까지 나온 카드뿐. 겹쳐서 가능한 숫자를 좁혀 줌) ──
  const candTxt = (c, max) => (c.length === 0 ? "없음" : c.length <= max ? c.map(x => x.a).join(" · ") : `${c.slice(0, max).map(x => x.a).join(" · ")} … 외 ${c.length - max}개`);
  function coach(V, me, since, names) {
    if (!(me >= 0 && me < V.n)) me = 0;
    const nm = i => (names && names[i]) || `${i + 1}번`;
    const sc = V.score.map((s, i) => (i === me ? `나 ${s}` : `${esc(nm(i))} ${s}`)).join(" : ");
    const base = `점수 ${sc} · ${roundTxt(V)}라운드`;
    if (V.over) return { opp: "끝까지 같은 카드를 보고 합을 겨뤘어요.", mine: `${base}. 모두 끝났어요.`, rec: "기록을 보며 내가 말한 합과 맞는 합을 비교해요.", why: "틀리면 10초 동안 말할 수 없어서, 확신이 없을 땐 기다리는 편이 이득인 때가 많아요." };
    const last = V.last;
    if (V.phase === "between" && last) {
      const wn = last.w < 0 ? "아무도 맞히지 못했어요" : `${iga(nm(last.w), last.w === me)} 맞혔어요`;
      return { opp: `이번 라운드: ${wn}. 정답은 ${last.A} + ${last.B} = ${last.sum}.`, mine: `${base}.`, rec: "다음 라운드를 준비해요 — 카드 한 장 한 장이 어느 숫자의 선인지(홀수 = 첫째, 짝수 = 둘째) 먼저 떠올려요.", why: "카드는 6장: 1 · 3 · 5번째가 첫째 숫자, 2 · 4 · 6번째가 둘째 숫자예요. 세 장을 모두 겹쳐야 숫자가 확정돼요." };
    }
    const nc = Math.min(V.stage, 6), an = K.analyze(V.cards, nc, K.wrongSums(V));          // 이번 라운드에 이미 틀린 합은 후보에서 뺌
    const wrong = V.log.filter(e => e.k === "ans" && e.r === V.round && !e.ok);
    const oth = wrong.filter(e => e.s !== me);
    const opp = oth.length ? `${oth.slice(-2).map(e => `${esc(nm(e.s))} ${said(e)} ❌`).join(" · ")} — 틀려서 10초 쉬어요. ${oth.some(e => e.sum > 0) ? "이미 틀린 합은 정답이 아니니 후보에서 빼요." : ""}` : `아직 아무도 합을 말하지 않았어요. 상대도 같은 카드를 보고 있어요${V.stage >= 4 ? " — 4장째부터는 말할 사람이 나올 수 있어요" : ""}.`;
    const mine = `${base}. 카드 ${nc}장 확인 — 첫째 숫자 후보 <b>${an.candA.length}개</b>(${esc(candTxt(an.candA, 5))}) · 둘째 숫자 후보 <b>${an.candB.length}개</b>(${esc(candTxt(an.candB, 5))}). 가장 그럴듯한 합 <b>${an.best}</b> (${pct(an.p)}).`;
    const locked = V.lockLeft[me] > 0 && !V.needs.includes(me);
    let rec;
    if (locked) rec = `🔒 쉬는 중 — 그동안 카드를 계속 겹쳐 후보를 좁혀 둬요 (지금 합 후보 ${an.best} · ${pct(an.p)}).`;
    else if (an.p >= 0.9) rec = `🙋 <b>정답!</b> 합 <b>${an.best}</b> — 확실해요 (${pct(an.p)}). 빨리 눌러야 해요.`;
    else if (an.p >= 0.5) rec = `🤔 합 <b>${an.best}</b>${ja(an.best, "이")} 가장 유력(${pct(an.p)})하지만 틀리면 10초 쉬어요 — 한 장 더 보고 말하거나, 상대가 빨라 보이면 도전해요.`;
    else rec = `⏳ 아직 이르니 <b>기다려요</b> — 합 후보가 많아요(가장 유력한 합도 ${pct(an.p)}). ${V.stage < 6 ? "카드가 더 나와요." : "후보를 지워 가며 좁혀요."}`;
    const why = `켜진 선이 없는 자리는 '안 켜짐'이 아니라 <b>아직 안 켜졌을 수도</b> 있어요 — 같은 숫자의 카드를 3장 다 봐야 확정돼요(지금 첫째 ${an.jA}장 · 둘째 ${an.jB}장). 켜진 선이 하나라도 있으면 그 선이 없는 숫자는 후보에서 지워요.`;
    return { opp, mine, rec, why };
  }

  // ── 복기 ──
  const actText = (a, V) => (a && a.t === "ans" ? (a.sum > 0 ? `합 ${a.sum} 말하기 (${sec(a.ms || 0)}초)` : "말하려다 시간 초과 · 물러남 (틀린 걸로)") : "기다림");
  function review(Vb, seat, myA, bestA) {
    if (!Vb || !Vb.cards || !myA) return null;
    const nc = Math.min(Vb.stage, 6), an = K.analyze(Vb.cards, nc, K.wrongSums(Vb));
    if (myA.t === "ans" && !(myA.sum > 0)) return { sev: 60, why: `합을 누르고도 확정하지 못했거나 오래 망설이다 물러나서 틀린 걸로 처리됐어요 — 말하기로 했다면 15초 안에 확정하고, 자신이 없으면 처음부터 기다려요.`, my: actText(myA), best: actText(bestA) };
    if (myA.t === "ans") {
      const pm = an.ps[myA.sum] || 0;
      const sev = pm < 0.05 ? 85 : pm < 0.35 ? 70 : pm < 0.6 ? 45 : pm < 0.85 ? 20 : 0;
      if (!sev) return { sev: 0, why: `카드 ${nc}장으로 합 ${myA.sum}${ja(myA.sum, "이")} 맞을 확률이 ${pct(pm)} 라 좋은 선택이었어요.`, my: actText(myA), best: actText(bestA) };
      return { sev, why: `카드 ${nc}장만 보고 합 ${myA.sum}${ja(myA.sum,"을")} 말했는데 맞을 확률이 약 ${pct(pm)} 였어요 (가장 유력한 합 ${an.best} ${pct(an.p)}) — 틀리면 10초(카드 3장) 동안 못 말해요.`, my: actText(myA), best: actText(bestA) };
    }
    if (bestA && bestA.t === "ans" && an.p >= 0.85) return { sev: 45, why: `카드 ${nc}장으로 합이 ${an.best} 일 확률이 ${pct(an.p)} 였는데 기다렸어요 — 상대가 먼저 말할 수 있어요.`, my: actText(myA), best: actText(bestA) };
    return { sev: 0, why: `카드 ${nc}장으로는 합이 ${an.best} 일 확률이 ${pct(an.p)} 뿐이라 기다린 게 맞아요.`, my: actText(myA), best: actText(bestA) };
  }

  // ── 1분 규칙 (방송 1라운드 카드 6장 · 정답 119 를 그대로) ──
  const dec = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 };
  const code = s => K.uid(+s[0], dec[s[1]], +s[2]);
  const EX = [
    ["0a0", "0d0", "0e0", "1a1", "1c0", "1c1", "1f1"],
    ["0d0", "0f0", "0f1", "0g1", "1a0", "1b0", "1b1"],
    ["0a0", "0a1", "0b0", "0b1", "0d1", "1a0", "1a1", "1e0", "1e1", "1f0", "1f1"],
    ["0a1", "0b1", "0d1", "0f0", "0f1", "1a0", "1a1", "1b0", "1b1", "1c0", "1d0", "1d1"],
    ["0d0", "0e0", "0e1", "0g0", "0g1", "1c0", "1c1", "1d0", "1d1", "1g0", "1g1"],
    ["0a0", "0b0", "0c0", "0c1", "0d0", "0g0", "0g1", "1c1", "1g0", "1g1"],
  ].map(c => c.map(code));
  function tutorial() {
    style();
    const row = (...x) => `<div class="mm-tut"><div class="row">${x.join("")}</div></div>`;
    const LA = [COLS[1], COLS[3], COLS[4]], LB = [COLS[2], COLS[5], COLS[0]];                  // 1·3·5번째 / 2·4·6번째 카드마다 색
    const fig = (k, col) => `<figure>${cardSvg(EX[k], { col, label: `${k + 1}번째 카드` })}<figcaption>${k + 1}번째</figcaption></figure>`;
    const lg = (cols, ks) => `<div class="lgs">${ks.map((k, i) => `<span class="lg"><i style="background:${cols[i]}"></i>${k + 1}번째</span>`).join("")}</div>`;
    const ov = (ks, cols) => cardSvg(null, { layers: ks.map((k, i) => ({ ids: EX[k], col: cols[i] })), w: 0.2, nest: true, label: `${ks.map(k => k + 1).join("·")}번째 카드를 겹친 모양` });
    return [
      { tag: "STEP 1 · 카드", title: "3초마다 노란 선 카드 한 장", body: "라운드마다 노란 선이 그려진 <b>카드가 3초 간격으로 한 장씩, 모두 6장</b> 나와요. 지난 카드는 <b>사라지니</b> 어디에 선이 있었는지 눈에 담아 둬요! (연습 옵션에서 '지난 카드 작게 보기'를 켤 수도 있어요)",
        boardHtml: row(cardSvg(EX[0], { label: "예: 1번째 카드" })), ms: 5200 },
      { tag: "STEP 2 · 숫자", title: "디지털 숫자 두 개", body: "숫자는 시계처럼 <b>7획 디지털 모양</b>이에요. 한 숫자는 <b>두 자릿수</b>(십의 자리 · 일의 자리)까지. 카드의 격자에서 숫자 하나는 가로 2칸 · 세로 4칸을 써요. 선 하나(한 획)는 칸 변 두 개 길이라 카드마다 <b>반 획</b>씩만 나오기도 해요.",
        boardHtml: row(numSvg(26, COLS[1]), `<span class="big">+</span>`, numSvg(93, COLS[2])), ms: 6200 },
      { tag: "STEP 3 · 홀수 · 짝수", title: "1·3·5번째 = 첫째 숫자, 2·4·6번째 = 둘째 숫자", body: "카드 6장은 번갈아 두 숫자를 이뤄요. <b>1 · 3 · 5번째</b> 카드를 겹치면 <b>첫째 숫자</b>, <b>2 · 4 · 6번째</b> 카드를 겹치면 <b>둘째 숫자</b>가 나타나요. 지금 어느 숫자의 카드인지 번호로 가려 두면 헷갈리지 않아요.",
        boardHtml: `<div class="mm-tut"><div class="grp">첫째 숫자 = 1 · 3 · 5번째 카드</div><div class="row">${[0, 2, 4].map(k => fig(k, LA[k / 2])).join("")}</div><div class="grp">둘째 숫자 = 2 · 4 · 6번째 카드</div><div class="row">${[1, 3, 5].map(k => fig(k, LB[(k - 1) / 2])).join("")}</div><small>방송 1라운드 카드 6장 — 3초마다 한 장씩 나왔어요</small></div>`, ms: 7500 },
      { tag: "STEP 4 · 겹치기", title: "세 장을 겹치면 숫자가 보여요", body: "같은 숫자의 카드 세 장을 한 장에 겹쳐요(색깔 = 어느 카드의 선인지). 선 하나가 여러 장에 나올 수도 있어요. 왼쪽은 <b>26</b>, 오른쪽은 <b>93</b> — 더한 <b>119</b>가 방송 1라운드의 정답이었어요.",
        boardHtml: `<div class="mm-tut"><div class="row"><figure><span class="grp">1 · 3 · 5번째</span>${ov([0, 2, 4], LA)}${lg(LA, [0, 2, 4])}</figure><figure><span class="grp">2 · 4 · 6번째</span>${ov([1, 3, 5], LB)}${lg(LB, [1, 3, 5])}</figure></div><div class="row"><span class="big">26 + 93 = 119</span></div></div>`, ms: 7500 },
      { tag: "STEP 5 · 말하기", title: "합을 알면 '정답!' — 맞으면 1점", body: "두 숫자를 알아냈으면 <b>🙋 정답!</b> 을 누르고 <b>합</b>을 입력해 <b>확정</b>해요(15초 안에). <b>맞으면 1점</b>(그 라운드 끝), <b>틀리면 10초 동안</b> 말할 수 없어요. 눌러 놓고 1.5초 넘게 망설이다 물러나도 틀린 걸로 쳐요. 카드가 더 나오기 전에 말하면 빠르지만 틀릴 수도 있어요. <b>5라운드</b> 뒤 점수가 더 높은 사람이 승리, 같으면 연장!",
        boardHtml: row(`<span class="big">🙋 정답! → 119</span>`), ms: 7500 },
      { tag: "STEP 6 · 직접", title: "겹쳐서 둘째 숫자를 맞혀 봐요", body: "아래는 <b>2 · 4 · 6번째 카드를 겹친</b> 그림이에요(색깔 = 카드). 어떤 숫자일까요? 비슷한 모양에 속지 말아요!",
        interactive: { hint: "👆 세 숫자 중 고르기", doneText: "✅ 맞아요! 93 — 이렇게 겹쳐서 읽어요" },
        render(stage, ctrl) {
          let msg = "겹친 모양을 보고 숫자를 골라요";
          const tips = { 98: "98은 아니에요 — 일의 자리에 왼쪽 세로 선이 없어요 (8이 아니라 3)", 83: "83은 아니에요 — 십의 자리 왼쪽 아래에 선이 없어요 (8이 아니라 9)" };
          const draw = () => { stage.innerHTML = `<div class="mm-tut">${ov([1, 3, 5], LB)}${lg(LB, [1, 3, 5])}<div class="ch">${[98, 93, 83].map(n => `<button type="button" class="btn" data-n="${n}">${n}</button>`).join("")}</div><div class="msg">${msg}</div></div>`; };
          stage.onclick = e => {
            const b = e.target.closest("[data-n]"); if (!b) return;
            if (+b.dataset.n === 93) { ctrl.sfx("win"); msg = "🏆 정답이에요!"; draw(); ctrl.complete(); }
            else { ctrl.sfx("tap"); msg = tips[b.dataset.n] || `${b.dataset.n}${ja(b.dataset.n,"은")} 아니에요 — 십의 자리 · 일의 자리 모양을 다시 봐요`; draw(); }
          };
          draw();
        } },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.mixmatch = {
    name: "믹스 앤 매치", emoji: "🟨", short: "3초마다 나오는 노란 선 카드를 겹쳐 디지털 숫자 두 개의 합을 먼저 맞혀요", min: 2, max: 4, defN: 3, board: false, fitCoach: true,
    src: SRC, diff: DIFF,
    opts: [
      { k: "rounds", label: "라운드 수", items: [[5, "5라운드 (방송)"], [3, "3라운드 (짧게)"]], def: 5 },
      { k: "aid", label: "지난 카드", items: [[0, "안 보임 (방송처럼)"], [1, "작게 보기 (연습)"]], def: 0 },
    ],
    howto: [
      "<b>목표</b> — 5라운드 동안 두 숫자의 합을 먼저 맞혀 점수(1점)를 모아요. 5라운드 뒤 점수가 높은 사람 승 (같으면 연장)",
      "<b>카드</b> — 매 라운드 노란 선이 그려진 카드가 <b>3초 간격으로 한 장씩 모두 6장</b>. 숫자는 최대 두 자릿수의 <b>디지털(7획)</b> 모양",
      "<b>겹치기</b> — <b>1 · 3 · 5번째</b> 카드를 겹치면 첫째 숫자, <b>2 · 4 · 6번째</b> 카드를 겹치면 둘째 숫자가 나타나요 (지난 카드는 사라져요)",
      "<b>정답</b> — 두 숫자를 알아낸 사람은 <b>🙋 정답!</b> 을 누르고 <b>두 숫자의 합</b>을 말해요. 맞으면 <b>1점</b>(라운드 끝), 틀리면 <b>10초 동안</b> 정답을 말할 수 없어요",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${roundTxt(V)}라운드 · ${V.phase === "run" ? `${Math.min(V.stage, 6)}번째 카드` : "결과"}`),
    chip: (V, i, me) => ({ t: `${V.score[i]}점${V.phase === "run" && V.lockLeft[i] > 0 && !V.needs.includes(i) ? " 🔒" : ""}`, on: i === me && V.phase === "run" && V.needs.includes(i) && !V.over, out: false }),   // 모두가 동시에 고르는 게임이라 '내 차례' 표시는 내 칸만
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "hard", rnd) || { t: "wait" },
  };
})();

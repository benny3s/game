/* 베니 서바이벌 · 수식 신호등 — 화면 (9칸 입력줄 · 키패드 · 색 힌트 기록 · 상대 추측 · 1분 규칙) */
(() => {
  "use strict";
  const H = window.SVCores.eqlight;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const LEN = 9;
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "+", "-", "×", "÷", "^", "="];
  const KO = { g: "초록", y: "노랑", r: "빨강" };
  const CSS = `
.eql-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.eql-pill{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:4px 10px;white-space:nowrap}
.eql-pill.gold{background:rgba(245,179,1,.16);border-color:rgba(245,179,1,.5);color:#fde68a}
.eql-row{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:3px;width:100%}
.eql-c{display:grid;place-items:center;min-width:0;height:34px;border-radius:7px;font:900 clamp(15px,4.6vw,19px) var(--round);background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.2);color:#fff;padding:0;font-variant-numeric:tabular-nums}
.eql-c.g{background:#15803d;border-color:#4ade80}
.eql-c.y{background:#a16207;border-color:#fde047}
.eql-c.r{background:#7f1d1d;border-color:#f87171;color:#fecaca}
.eql-c.cur{border-color:#fbbf24;box-shadow:0 0 0 2px rgba(251,191,36,.45)}
button.eql-c{cursor:pointer}
.eql-row.mini{gap:2px}
.eql-row.mini .eql-c{height:17px;font-size:11px;border-radius:4px;border-width:1px}
.eql-line{display:grid;grid-template-columns:16px minmax(0,1fr);gap:4px;align-items:center}
.eql-line .no{font:800 10.5px var(--round);color:var(--soft);text-align:center}
.eql-opp{display:grid;gap:2px;flex:none;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);border-radius:10px;padding:4px 6px}
.eql-opp .lb{font:700 11px var(--round);color:var(--soft);display:flex;justify-content:space-between}
.eql-sec{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;font:700 12px var(--round);color:#86efac;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:10px;padding:3px 8px}
.eql-sec b{font:900 15px var(--round);letter-spacing:.5px;color:#fff}
.eql-hist{flex:1 1 0;min-height:44px;overflow-y:auto;display:grid;gap:3px;align-content:start;padding:1px}
.eql-hist .empty{color:var(--soft);font-size:12.5px;text-align:center;padding:10px 0}
.eql-in{display:grid;gap:3px;flex:none}
.eql-msg{min-height:17px;font:700 12.5px var(--round);text-align:center;color:var(--soft);flex:none}
.eql-msg.ok{color:#86efac}.eql-msg.bad{color:#fca5a5}
.eql-pad{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;flex:none}
.eql-k{height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:900 17px var(--round);padding:0;cursor:pointer}
.eql-k.g{background:#15803d;border-color:#4ade80}.eql-k.y{background:#a16207;border-color:#fde047}.eql-k.r{opacity:.35}
.eql-k.fn{font-size:14px}
.eql-k.go{background:#f5b301;border-color:#fde68a;color:#1f1300}
.eql-k:disabled{opacity:.3;cursor:not-allowed}
.eql-acts{display:grid;gap:5px;flex:none}
.eql-acts .btn{padding:8px;font-size:13.5px}
.eql-sum{display:grid;gap:4px;font-size:12.5px;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.07);border-radius:12px;padding:7px 9px;flex:none}
.eql-sum .r{display:flex;gap:8px;align-items:center;justify-content:space-between}
.eql-sum .r .eql-row{max-width:230px}
.eql-note{text-align:center;font-size:12.5px;color:var(--soft)}
.eql-tut{display:grid;gap:8px;justify-items:center;width:100%}
.eql-tut small{color:var(--soft);text-align:center}
.eql-tut .opts{display:grid;gap:6px;width:100%}
.eql-tut .opt{display:block;width:100%;padding:7px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);color:#fff;font:900 17px var(--round);letter-spacing:2px;cursor:pointer}
.eql-leg{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;font:700 12px var(--round)}
.eql-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px;vertical-align:-1px;border:1px solid rgba(255,255,255,.5)}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let lastSeats = [];
  const nameOf = i => (lastSeats[i] && lastSeats[i].name) || `${i + 1}번`;
  const nm = i => esc(nameOf(i));

  const disp = c => (c === "-" ? "−" : c);
  const josa = (i, a, b) => { const s = nameOf(i), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28 ? a : b) : `${a}(${b})`; };
  const cellsHtml = (str, fb, cls = "") => {
    let h = `<div class="eql-row ${cls}">`;
    for (let i = 0; i < LEN; i++) { const c = str ? str[i] : ""; h += `<span class="eql-c${fb ? " " + fb[i] : ""}" title="${fb ? KO[fb[i]] : ""}">${c ? esc(disp(c)) : ""}</span>`; }
    return h + "</div>";
  };
  const keyStates = guesses => {
    const m = {}, rank = { g: 3, y: 2, r: 1 };
    for (const { g, f } of guesses) for (let i = 0; i < LEN; i++) if (!m[g[i]] || rank[f[i]] > rank[m[g[i]]]) m[g[i]] = f[i];
    return m;
  };

  // ── 입력 상태 ──
  let INP = null;
  const inpFor = (V, ctx) => { const key = `${ctx.g}|${V.phase}|${V.round}`; if (!INP || INP.key !== key) INP = { key, cells: Array(LEN).fill(""), pos: 0 }; return INP; };
  const filled = I => I.cells.every(Boolean);
  const text = I => I.cells.join("");
  function typeKey(I, k) {
    if (k === "bs") {
      if (I.cells[I.pos]) I.cells[I.pos] = "";
      else if (I.pos > 0) { I.pos--; I.cells[I.pos] = ""; }
      return;
    }
    I.cells[I.pos] = k; if (I.pos < LEN - 1) I.pos++;
  }
  function status(V, I) {
    const n = I.cells.filter(Boolean).length;
    if (n < LEN) return { cls: "", t: `${LEN - n}칸 남았어요` };
    const c = H.checkEq(text(I));
    return c.ok ? { cls: "ok", t: `✅ 성립해요 (${c.v})` } : { cls: V.phase === "set" ? "bad" : "", t: V.phase === "set" ? `❌ ${esc(c.err)}` : "성립하지 않아도 낼 수 있어요" };
  }

  function padHtml(V, ks, canOk, label) {
    let h = `<div class="eql-pad">`;
    for (const k of KEYS) h += `<button class="eql-k${ks[k] ? " " + ks[k] : ""}" data-k="${esc(k)}">${esc(k === "-" ? "−" : k)}</button>`;
    h += `<button class="eql-k fn" data-k="bs" title="지우기">⌫</button><button class="eql-k fn go" data-a="ok" ${canOk ? "" : "disabled"}>${label}</button></div>`;
    return h;
  }
  function inputRowHtml(I) {
    let h = `<div class="eql-in"><div class="eql-row">`;
    for (let i = 0; i < LEN; i++) h += `<button class="eql-c${i === I.pos ? " cur" : ""}" data-c="${i}">${esc(disp(I.cells[i] || ""))}</button>`;
    return h + `</div></div>`;
  }

  function histHtml(list, mini) {
    if (!list.length) return `<div class="empty">아직 추측이 없어요</div>`;
    return list.map(x => `<div class="eql-line"><span class="no">${x.r}</span>${cellsHtml(x.g, x.f, mini ? "mini" : "")}</div>`).join("");
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats || lastSeats;
    const me = ctx.me, watch = me < 0, you = watch ? -1 : 1 - me;
    const ph = V.phase;
    let h = `<div class="eql-top"><span class="eql-pill">${ph === "set" ? "수식 만들기" : V.over ? "끝" : `${V.round} / ${V.maxRound} 라운드`}</span><span class="eql-pill gold">9칸 · 숫자 0-9 · + − × ÷ ^ =</span></div>`;
    let keepScroll = null;

    if (watch) {
      for (const s of [0, 1]) h += `<div class="eql-opp"><div class="lb"><span>${nm(s)}의 추측 (상대 수식에 대한 힌트)</span><span>${V.guesses[s].length}번</span></div>${V.guesses[s].slice(-6).map(x => cellsHtml(x.g, x.f, "mini")).join("") || `<div class="eql-note">${ph === "set" ? (V.secretSet[s] ? "수식 준비 완료" : "수식 만드는 중…") : "아직 없어요"}</div>`}</div>`;
      if (V.over) h += resultHtml(V, me);
      stage.innerHTML = h; stage.onclick = null; return;
    }

    const I = inpFor(V, ctx), canAct = ctx.canAct && !V.over;
    if (ph === "set") {
      if (V.mine) {
        h += `<div class="eql-sec"><span>내 수식</span><b>${esc(V.mine.replace(/-/g, "−"))}</b></div>${cellsHtml(V.mine, null)}<div class="eql-note">${V.secretSet[you] ? `${nm(you)}도 준비됐어요 — 곧 시작해요` : `${nm(you)}${josa(you, "을", "를")} 기다려요…`}</div>`;
      } else {
        const st = status(V, I);
        h += `<div class="eql-note">상대가 맞혀야 할 <b>성립하는 9칸 수식</b>을 만들어요. 계산 순서는 ^ → × ÷ → + −</div>${inputRowHtml(I)}<div class="eql-msg ${st.cls}">${st.t}</div>${padHtml(V, {}, filled(I) && H.checkEq(text(I)).ok, "정하기")}<div class="eql-acts"><button class="btn" data-a="sample">🎲 예시 수식 넣기</button></div>`;
      }
    } else {
      const mineG = V.guesses[me], theirG = V.guesses[you];
      h += `<div class="eql-sec"><span>내 수식 (상대가 맞히는 중)</span><b>${esc(disp(V.mine).replace(/-/g, "−"))}</b></div>`;
      h += `<div class="eql-opp"><div class="lb"><span>${nm(you)}의 추측 (내 수식에 대한 힌트)</span><span>${theirG.length}번</span></div>${theirG.slice(-3).map(x => cellsHtml(x.g, x.f, "mini")).join("") || `<div class="eql-note">아직 없어요</div>`}</div>`;
      h += `<div class="eql-hist" id="eqlHist">${histHtml(mineG, false)}</div>`;
      keepScroll = true;
      if (V.over) h += resultHtml(V, me);
      else if (V.mySent) h += `<div class="eql-in">${cellsHtml(V.mySent, null)}</div><div class="eql-msg">낸 추측이에요 — ${nm(you)}${josa(you, "을", "를")} 기다려요…</div>`;
      else if (canAct) {
        const st = status(V, I);
        h += `${inputRowHtml(I)}<div class="eql-msg ${st.cls}">${st.t}</div>${padHtml(V, keyStates(mineG), filled(I), "추측")}`;
      } else h += `<div class="eql-msg">${nm(you)} 차례예요…</div>`;
    }
    stage.innerHTML = h;
    if (keepScroll) { const hs = stage.querySelector("#eqlHist"); if (hs) hs.scrollTop = hs.scrollHeight; }
    const redo = () => render(stage, V, ctx);
    stage.onclick = e => {
      const c = e.target.closest("[data-c]");
      if (c) { I.pos = +c.dataset.c; ctx.sfx("tap"); redo(); return; }
      const k = e.target.closest("[data-k]");
      if (k && !k.disabled) { typeKey(I, k.dataset.k); ctx.sfx("tap"); redo(); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      if (b.dataset.a === "sample") { const s = H.sample(Math.random, "normal"); I.cells = [...s]; I.pos = LEN - 1; ctx.sfx("tap"); redo(); return; }
      if (b.dataset.a === "ok") {
        if (!filled(I)) return;
        ctx.sfx("pop");
        const r = ctx.act(V.phase === "set" ? { t: "set", eq: text(I) } : { t: "guess", g: text(I) });
        if (r && r.ok === false && r.err) ctx.toast(r.err);
      }
    };
  }

  function resultHtml(V, me) {
    const sec = V.secrets || [];
    const w = V.winner;
    const msg = w < 0 ? (V.why === "cap" ? `🤝 ${V.maxRound}라운드까지 아무도 못 맞혀 무승부예요` : "🤝 같은 라운드에 둘 다 맞혀 무승부예요") : w === me ? "🏆 상대 수식을 먼저 맞혔어요!" : `${esc(nameOf(w))}${josa(w, "이", "가")} 먼저 맞혔어요`;
    return `<div class="eql-sum"><b>${msg}</b>${[0, 1].map(s => `<div class="r"><span>${nm(s)}의 수식</span>${cellsHtml(sec[s] || "", null, "mini")}</div>`).join("")}</div>`;
  }
  function result(V) { return V.over ? resultHtml(V, -2) : ""; }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const demoSecret = "12+3×4=24", demoGuess = "13+2×4=24", demoFb = H.feedback(demoGuess, demoSecret);
    const greens = [...demoFb].filter(c => c === "g").length;
    return [
      { tag: "STEP 1 · 목표", title: "서로의 9칸 수식을 맞혀요", body: "각자 <b>성립하는 9칸 수식</b>을 몰래 만들어 내요. 숫자 0-9 와 기호 <b>+ − × ÷ ^ =</b> 를 쓸 수 있고, 기호끼리 붙으면 안 돼요. 그다음 서로 상대 수식을 <b>동시에</b> 추측해요.",
        boardHtml: `<div class="eql-tut">${cellsHtml(demoSecret, null)}<small>이런 수식이에요 — 12 + 3×4 = 24 (곱셈 먼저!)</small></div>`, ms: 6400 },
      { tag: "STEP 2 · 직접", title: "성립하는 수식을 골라요", body: "계산 순서는 <b>^ → × ÷ → + −</b> 예요. 아래 셋 중 <b>실제로 성립하는</b> 수식을 눌러 보세요.",
        interactive: { hint: "👆 성립하는 수식을 눌러요", doneText: "✅ 12 + 12 = 24 — 성립해요!" },
        render(stage, ctrl) {
          const opts = [["12+3×4=60", "× 를 먼저 해서 12+12=24 예요 (60 이 아니에요)"], ["12+3×4=24", ""], ["12+3×4=25", "24 이고 25 가 아니에요"]];
          const draw = msg => { stage.innerHTML = `<div class="eql-tut"><div class="opts">${opts.map(([s], i) => `<button class="opt" data-w="${i}">${s}</button>`).join("")}</div><small>${msg || "하나만 맞아요"}</small></div>`; };
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return; ctrl.sfx("tap");
            const i = +b.dataset.w;
            if (opts[i][1] === "") { draw("12 + 3×4 = 12 + 12 = 24 — 성립해요!"); ctrl.complete(); } else draw(`아니에요 — ${opts[i][1]}. 다시 골라 봐요`);
          };
          draw();
        } },
      { tag: "STEP 3 · 힌트", title: "칸마다 색으로 알려 줘요", body: "추측하면 칸마다 색 힌트가 와요. <b>초록</b> = 그 자리가 맞아요 · <b>노랑</b> = 수식에 있지만 자리가 달라요 · <b>빨강</b> = 수식에 없어요. 같은 글자를 정답보다 많이 쓰면 남는 건 빨강이에요.",
        boardHtml: `<div class="eql-tut"><small>정답이 ${demoSecret} 일 때</small>${cellsHtml(demoGuess, demoFb)}<div class="eql-leg"><span><i style="background:#15803d"></i>초록 자리 맞음</span><span><i style="background:#a16207"></i>노랑 자리 다름</span><span><i style="background:#7f1d1d"></i>빨강 없음</span></div></div>`, ms: 8200 },
      { tag: "STEP 4 · 직접", title: "힌트를 읽어 봐요", body: `정답이 <b>${demoSecret}</b> 일 때 <b>${demoGuess}</b> 를 추측했어요. 초록 칸은 몇 개일까요?`,
        interactive: { hint: "👆 초록 칸 수를 눌러요", doneText: `✅ 초록 ${greens}칸 · 노랑 2칸 (3 과 2 의 자리만 바뀌었어요)` },
        render(stage, ctrl) {
          const draw = msg => { stage.innerHTML = `<div class="eql-tut">${cellsHtml(demoGuess, demoFb)}<div style="display:flex;gap:8px">${[5, greens, 9].sort((a, b) => a - b).map(n => `<button class="opt" style="width:64px" data-w="${n}">${n}</button>`).join("")}</div><small>${msg || "초록 칸 수는?"}</small></div>`; };
          stage.onclick = e => {
            const b = e.target.closest("[data-w]"); if (!b) return; ctrl.sfx("tap");
            if (+b.dataset.w === greens) { draw(`초록 ${greens}칸! 노랑 2칸은 자리만 바꾸면 돼요`); ctrl.complete(); } else draw("다시 세어 봐요 — 초록 칸만이에요");
          };
          draw();
        } },
      { tag: "STEP 5 · 승부", title: "먼저 맞히면 이겨요", body: "추측은 성립하지 않아도 돼요. 여러 번 추측하며 힌트로 상대 수식을 좁혀 가요. <b>먼저 정확히 맞힌 사람이 승리</b> — 같은 라운드에 둘 다 맞히거나 20라운드가 지나면 무승부예요.",
        boardHtml: `<div class="eql-tut"><span style="font-size:42px">🏆</span><small>수식을 어렵게(÷ · ^ · 서로 다른 글자) 만들수록 유리해요</small></div>`, ms: 6000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.eqlight = {
    name: "수식 신호등", emoji: "🚦", short: "상대의 9칸 수식을 색 힌트로 먼저 맞혀요", min: 2, max: 2, defN: 2, board: false,
    howto: [
      "각자 <b>성립하는 9칸 수식</b>을 몰래 만들어요 (숫자 0-9 · + − × ÷ ^ =)",
      "라운드마다 둘이 <b>동시에</b> 상대 수식을 추측해요 (성립하지 않아도 돼요)",
      "칸마다 <b>초록</b>(자리 맞음) · <b>노랑</b>(자리만 다름) · <b>빨강</b>(없음) 힌트",
      "상대 수식을 <b>먼저 맞히면 승리</b> — 같이 맞히거나 20라운드가 지나면 무승부",
    ],
    note: "방송과 다른 점: 시간 제한 없음, 같은 라운드에 둘 다 맞히면 무승부 · 20라운드가 지나면 무승부, 수는 천만 미만 · 지수 24 이하 (계산 중간값도) · 0^0 불가, 앞자리 0 은 두 자리 이상 수에만 금지. 방송에선 이 게임이 '넘버 워들(Nerdle)' 을 그대로 가져온 것이래요.",
    sub: V => (V.over ? "끝" : V.phase === "set" ? "수식 만들기" : `${V.round}/${V.maxRound}라운드`),
    chip: (V, i) => ({ t: V.phase === "set" ? (V.secretSet[i] ? "준비 ✓" : "만드는 중") : `${V.guesses[i].length}번 추측`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    coach: (V, me, since, names) => H.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => H.ai(V, me, "easy", rnd),
  };
})();

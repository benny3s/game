/* 베니 서바이벌 · 하이 앤 로우 — 화면 (점수 카드 · 숨겨 내기 · 방향 · 공개/포기 · 넘기기 · 1분 규칙) */
(() => {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const H = window.SVCores.hilo;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = `
.hl-top{display:flex;gap:10px;align-items:center;flex:none;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.08);border-radius:14px;padding:6px 10px}
.hl-sc{flex:none;display:grid;place-items:center;width:52px;height:64px;border-radius:10px;border:3px solid #fde68a;background:linear-gradient(160deg,#fef3c7,#fcd34d);color:#78350f;font:900 24px/1 var(--round);box-shadow:0 3px 0 rgba(0,0,0,.35);position:relative}
.hl-sc.neg{border-color:#fda4af;background:linear-gradient(160deg,#ffe4e6,#fb7185);color:#7f1d1d}
.hl-sc small{position:absolute;top:2px;left:0;right:0;text-align:center;font:700 8.5px var(--round);opacity:.7}
.hl-sc b{margin-top:8px}
.hl-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.hl-info .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.hl-rd{font:900 13.5px var(--round);color:#fff;background:rgba(225,29,72,.25);border:1px solid rgba(251,113,133,.5);border-radius:99px;padding:2px 10px;white-space:nowrap}
.hl-dir{font:800 12px var(--round);border-radius:99px;padding:2px 9px;white-space:nowrap;color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35)}
.hl-dir.hi{color:#fecaca;border-color:#f87171;background:rgba(239,68,68,.18)}
.hl-dir.lo{color:#bfdbfe;border-color:#60a5fa;background:rgba(59,130,246,.18)}
.hl-info .r2{font-size:12px;color:var(--soft);line-height:1.35}
.hl-seats{display:grid;gap:4px;flex:none}
.hl-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;min-height:36px;padding:3px 8px;border-radius:11px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.hl-row.me{border-color:rgba(134,239,172,.55);background:rgba(34,197,94,.09)}
.hl-row.turn{border-color:#fde68a;box-shadow:0 0 0 1px #fde68a}
.hl-row.win{border-color:#4ade80;background:rgba(34,197,94,.16)}
.hl-row.out{opacity:.8}
.hl-row .nm{display:flex;align-items:center;gap:4px;font:800 13px var(--round);white-space:nowrap;min-width:0}
.hl-row .nm b{overflow:hidden;text-overflow:ellipsis;max-width:78px}
.hl-bd{font:800 10px var(--round);font-style:normal;color:#0f172a;background:#fde68a;border-radius:6px;padding:1px 5px;white-space:nowrap}
.hl-bd.w{background:#fda4af}
.hl-bd.g{background:#86efac}
.hl-row .st{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--soft);min-width:0;white-space:nowrap;overflow:hidden}
.hl-row .st em{font-style:normal;color:#fde68a;font-weight:800}
.hl-pip{display:inline-block;width:11px;height:11px;border-radius:3px;flex:none}
.hl-pip.B{background:#3b82f6}.hl-pip.Y{background:#eab308}
.hl-mc{display:grid;place-items:center;width:30px;height:32px;border-radius:7px;border:2px solid #64748b;background:#f8fafc;color:#0f172a;font:900 16px/1 var(--round);flex:none}
.hl-mc.B{border-color:#3b82f6}.hl-mc.Y{border-color:#eab308}
.hl-mc.back{background:#1e293b;color:#94a3b8;font-size:13px}
.hl-mc.back.B{background:#1e3a8a;color:#bfdbfe}.hl-mc.back.Y{background:#854d0e;color:#fef08a}
.hl-mc.lock{background:#e2e8f0;color:#0f172a;opacity:.95}
.hl-mc.q{background:transparent;border-style:dashed;border-color:#94a3b8;font-size:15px}
.hl-mc.win{box-shadow:0 0 0 2px #4ade80}
.hl-msg{flex:none;text-align:center;font:800 13px var(--round);color:#fde68a;line-height:1.4}
.hl-me{display:flex;flex-direction:column;gap:5px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:6px 8px;flex:none}
.hl-me .hd{display:flex;justify-content:space-between;gap:6px;font:700 12.5px var(--round);color:#86efac}
.hl-me .hd span:last-child{color:#fde68a;text-align:right}
.hl-nums{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
.hl-n{position:relative;display:grid;place-items:center;height:36px;border-radius:8px;border:2px solid #64748b;background:#f8fafc;color:#0f172a;font:900 18px/1 var(--round);padding:0;min-width:0}
.hl-n.B{border-color:#3b82f6}.hl-n.Y{border-color:#eab308}
.hl-n.pick{cursor:pointer}
.hl-n.sel{background:#fef3c7;border-color:#f59e0b;transform:translateY(-3px)}
.hl-n.used{background:rgba(255,255,255,.08);color:#64748b;border-color:rgba(255,255,255,.18)}
.hl-n.used::after{content:"공개";position:absolute;bottom:0;left:0;right:0;text-align:center;font:700 8px/1 var(--round);color:#94a3b8}
.hl-n.hid::after{content:"숨김";color:#fda4af}
.hl-n.sub{background:#fef9c3;border-color:#f59e0b;opacity:.9}
.hl-n.sub::after{content:"낸 카드";position:absolute;bottom:0;left:0;right:0;text-align:center;font:700 8px/1 var(--round);color:#92400e}
.hl-acts{display:grid;gap:6px;margin-top:auto;flex:none}
.hl-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.hl-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.hl-two.one{grid-template-columns:1fr}
.hl-two.three{grid-template-columns:1fr 1fr}
.hl-two.three .btn:first-child{grid-column:1/-1}
.hl-two .btn{padding:11px 4px;font:800 14px var(--round)}
.hl-tut{display:grid;gap:8px;justify-items:center;width:100%}
.hl-tut small{font-size:12px;color:var(--soft);text-align:center;line-height:1.45}
.hl-cards{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;align-items:center}
.hl-n.dim{opacity:.35}
.hl-cards .hl-n{width:34px;height:42px}
.hl-chip{font:800 12px var(--round);border-radius:99px;padding:2px 9px;color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35)}
.hl-chip.neg{color:#fecaca;border-color:rgba(248,113,113,.5)}
.hl-chip.x{opacity:.45;text-decoration:line-through}
.sv-coachfit .hl-top{padding:3px 8px;gap:8px}.sv-coachfit .hl-sc{width:38px;height:36px;font-size:17px;border-width:2px}.sv-coachfit .hl-sc small{display:none}.sv-coachfit .hl-sc b{margin-top:0}.sv-coachfit .hl-info .r2{display:none}
.sv-coachfit .hl-seats{gap:2px}.sv-coachfit .hl-row{min-height:0;padding:1px 8px}.sv-coachfit .hl-row .hl-mc{width:24px;height:21px;font-size:12px;border-width:1.5px}
.sv-coachfit .hl-me{padding:3px 8px;gap:3px}.sv-coachfit .hl-me .hd{font-size:11.5px}.sv-coachfit .hl-nums{grid-template-columns:repeat(10,minmax(0,1fr));gap:2px}.sv-coachfit .hl-n{height:32px;font-size:15px;border-radius:6px}
.sv-coachfit .hl-msg{font-size:12px;line-height:1.25}.sv-coachfit .hl-acts{gap:3px}.sv-coachfit .hl-acts .note{font-size:11.5px}.sv-coachfit .hl-two .btn{padding:7px 4px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let NAMES = [], SEL = { key: "", n: -1 };

  const nameOf = (ctx, i) => (ctx.seats && ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const ga = (name, isMe) => {
    if (isMe) return "내가";
    const ch = String(name).slice(-1), c = ch.charCodeAt(0);
    return `${name}${(c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "013678".includes(ch)) ? "이" : "가"}`;
  };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const fmt = x => (x < 0 ? `−${-x}` : x > 0 ? `+${x}` : "0");
  const colTxt = c => (c === "B" ? "파랑 (1~5)" : "노랑 (6~10)");
  const dirTxt = d => (d === "low" ? "낮은 숫자가 우위" : "높은 숫자가 우위");

  function numCards(V, me, o = {}) {
    const hd = V.hands[me], sub = hd.sub ? hd.sub.n : -1, used = V.used[me];
    return `<div class="hl-nums">${Array.from({ length: 10 }, (_, k) => {
      const n = k + 1, col = n <= 5 ? "B" : "Y", has = hd.nums.includes(n);
      if (has) return o.pick ? `<button type="button" class="hl-n ${col} pick${o.sel === n ? " sel" : ""}" data-n="${n}" aria-label="숫자 ${n}">${n}</button>` : `<span class="hl-n ${col}">${n}</span>`;
      if (n === sub) return `<span class="hl-n ${col} sub">${n}</span>`;
      return `<span class="hl-n ${col} used${used.includes(n) ? "" : " hid"}">${n}</span>`;
    }).join("")}</div>`;
  }
  function logText(V, ctx) {
    const e = V.log[V.log.length - 1]; if (!e) return "";
    if (e.k === "show") return `${esc(ga(nameOf(ctx, e.s), e.s === ctx.me))} ${e.n}${ja(e.n,"을")} 공개했어요`;
    if (e.k === "quit") return `${esc(ga(nameOf(ctx, e.s), e.s === ctx.me))} 공개를 포기했어요`;
    return "";
  }

  function render(stage, V, ctx) {
    style(); NAMES = (ctx.seats || []).map(s => s.name);
    const me = ctx.me, hd = me >= 0 ? V.hands[me] : null, over = V.over, ph = V.phase;
    const key = `${ctx.g}|${V.round}|${ph}`;
    if (SEL.key !== key) SEL = { key, n: -1 };
    const pileSum = sum(V.pile), res = V.res;
    const actor = ctx.canAct && V.needs.includes(me);
    const gn = i => ga(nameOf(ctx, i), i === me);
    // 위: 점수 카드 + 라운드 · 방향 · 더미
    const r2 = V.carry.length && !over ? `이월 ${fmt(sum(V.carry))} + 이번 ${fmt(V.cur)} = 더미 ${fmt(pileSum)}` : `더미 ${fmt(pileSum)}`;
    let h = `<div class="hl-top"><div class="hl-sc${V.cur < 0 ? " neg" : ""}"><small>점수 카드</small><b>${fmt(V.cur)}</b></div><div class="hl-info"><div class="r1"><span class="hl-rd">${V.round}/${V.R}라운드</span>${V.dir ? `<span class="hl-dir ${V.dir === "low" ? "lo" : "hi"}">${V.dir === "low" ? "⬇" : "⬆"} ${dirTxt(V.dir)}</span>` : `<span class="hl-dir">방향은 모두 낸 뒤 공개</span>`}</div><div class="r2">${esc(r2)}${over ? "" : ` · 선 ${esc(nameOf(ctx, V.leader))}`}</div></div></div>`;
    // 4명 줄
    const order = V.order && V.order.length ? V.order : [0, 1, 2, 3];
    h += `<div class="hl-seats">${[0, 1, 2, 3].map(i => {
      const isW = res && res.taker === i && (ph === "show" || over);
      let st = "", cd = "", cls = `hl-row${i === me ? " me" : ""}${V.turn === i && !over ? " turn" : ""}${isW ? " win" : ""}`;
      const col = V.col ? V.col[i] : null;
      const bd = `${i === V.leader && !over ? `<i class="hl-bd">선</i>` : ""}${V.lastQuit === i && !over && ph !== "show" ? `<i class="hl-bd w">꼭 공개</i>` : ""}`;
      if (over) {
        const rk = V.ranks[i];
        st = `<em>${rk + 1}등</em> ${fmt(V.score[i])}점 · 카드 ${V.took[i].length}장`;
        cd = rk <= 1 ? `<i class="hl-bd g">생존</i>` : "";
      } else if (ph === "play") {
        st = V.played[i] ? "✓ 숨겨서 냈어요" : i === me ? "<em>카드를 골라요</em>" : "고르는 중…";
        cd = `<span class="hl-mc back">${V.played[i] ? "✓" : "…"}</span>`;
      } else {
        const sh = V.shown[i], q = V.quit === i, order1 = order.indexOf(i) + 1;
        st = `<span class="hl-pip ${col}"></span>${colTxt(col)}${q ? " · <em>포기</em>" : sh != null || ph === "show" ? "" : V.turn === i ? " · <em>▶ 차례</em>" : ` · ${order1}번째`}`;
        if (sh != null) cd = `<span class="hl-mc ${col}${isW ? " win" : ""}">${sh}</span>`;
        else if (q) cd = `<span class="hl-mc q">🙈</span>`;
        else if (i === me && hd && hd.sub) cd = `<span class="hl-mc ${col} lock" title="내 카드">${hd.sub.n}</span>`;
        else cd = `<span class="hl-mc back ${col}">?</span>`;
      }
      return `<div class="${cls}"><span class="nm"><b>${esc(nameOf(ctx, i))}</b>${bd}</span><span class="st">${st}</span>${cd}</div>`;
    }).join("")}</div>`;
    // 라운드 결과 줄
    if ((ph === "show" || over) && res) {
      const carried = res.taker < 0;
      h += `<div class="hl-msg">${carried ? (over ? `➡ 마지막 더미 ${fmt(res.total)}${ja(fmt(res.total),"은")} 아무도 못 가져가요` : `➡ 가져갈 사람이 없어요 · 더미 ${fmt(res.total)}${ja(fmt(res.total),"이")} 다음 라운드로 넘어가요`) : `🏆 ${esc(gn(res.taker))} 더미 ${fmt(res.total)}${ja(fmt(res.total),"을")} 가져가요${res.from >= 0 ? ` (포기한 ${esc(ga(nameOf(ctx, res.from), res.from === me))} 넘겼어요)` : res.total < 0 && res.quit === res.taker ? " (포기한 사람이 마이너스를 가져가요)" : ""}`}</div>`;
    } else if (!over && !actor && V.log.length) h +=`<div class="hl-msg" style="font-weight:600;color:var(--soft);font-size:12px">${logText(V, ctx)}</div>`;
    // 아래: 내 손패 · 동작
    let acts = "", mine = "";
    if (over) acts = `<div class="note">아래 결과 창에서 순위를 볼 수 있어요</div>`;
    else if (!hd) acts = `<div class="note">구경 중이에요 · 낸 카드는 공개될 때까지 비밀이에요</div>`;
    else {
      const pick = actor && ph === "play";
      mine = `<div class="hl-me"><div class="hd"><span>내 숫자 카드</span><span>노멀 ${hd.norm}장 · 리버스 ${hd.rev ? "1장" : "썼음"}</span></div>${numCards(V, me, { pick, sel: SEL.n })}</div>`;
      if (pick) {
        acts = `<div class="note">${SEL.n < 0 ? "낼 숫자 카드를 먼저 눌러요" : `${SEL.n}${ja(SEL.n,"을")} 어떤 특수 카드와 겹쳐 낼까요?`}</div><div class="hl-two"><button class="btn primary" data-a="play" data-s="N" ${SEL.n >= 0 && hd.norm > 0 ? "" : "disabled"}>🃏 노멀로 내기 (${hd.norm})</button><button class="btn" data-a="play" data-s="R" ${SEL.n >= 0 && hd.rev ? "" : "disabled"}>🔄 리버스로 내기 (${hd.rev ? 1 : 0})</button></div>`;
      } else if (ph === "play") acts = `<div class="note">다른 사람이 내는 중… (${V.played.filter(Boolean).length}/4)</div>`;
      else if (ph === "reveal" && actor) {
        const sp = hd.sub.s === "R" ? "리버스" : "노멀";
        acts = `<div class="note">내가 낸 카드는 ${hd.sub.n} + ${sp}${sp === "노멀" ? "이에요" : "예요"} · 공개하거나${V.canQuit ? " 포기할 수 있어요" : " (이번엔 꼭 공개해야 해요)"}</div><div class="hl-two${V.canQuit ? "" : " one"}"><button class="btn primary" data-a="show">🔓 ${hd.sub.n} 공개하기</button>${V.canQuit ? `<button class="btn" data-a="quit">🙈 포기하기</button>` : ""}</div>`;
      } else if (ph === "reveal") acts = `<div class="note">${esc(gn(V.turn))} 공개할지 정하는 중…</div>`;
      else if (ph === "pass" && actor) {
        const po = V.passOpts || [];
        acts = `<div class="note">마이너스 더미 ${fmt(pileSum)}${ja(fmt(pileSum),"을")} 포기한 내가 가져가요${po.length ? " · 같은 숫자를 낸 사람에게 넘길 수 있어요" : ""}</div><div class="hl-two${po.length === 0 ? " one" : po.length === 1 ? "" : " three"}"><button class="btn primary" data-a="pass" data-to="-1">내가 가져가기</button>${po.map(j => `<button class="btn" data-a="pass" data-to="${j}">${esc(nameOf(ctx, j))}에게 넘기기</button>`).join("")}</div>`;
      } else if (ph === "pass") acts = `<div class="note">${esc(gn(V.quit))} 마이너스 더미를 누가 가져갈지 정하는 중…</div>`;
      else acts = `<div class="note">곧 다음 라운드가 시작돼요…</div>`;
    }
    h += `${mine}<div class="hl-acts">${acts}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const nc = e.target.closest("[data-n]");
      if (nc) { ctx.sfx("tap"); SEL.n = SEL.n === +nc.dataset.n ? -1 : +nc.dataset.n; render(stage, V, ctx); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      ctx.sfx("pop");
      const a = b.dataset.a;
      if (a === "play" && SEL.n >= 0) ctx.act({ t: "play", n: SEL.n, s: b.dataset.s });
      else if (a === "show") ctx.act({ t: "show" });
      else if (a === "quit") ctx.act({ t: "quit" });
      else if (a === "pass") ctx.act({ t: "pass", to: +b.dataset.to });
    };
  }

  // ── 결과 창 한 줄 더 ──
  function result(V, me) {
    const nm = i => esc(String(NAMES[i] || `${i + 1}번`).slice(0, 5));
    const seats = [0, 1, 2, 3].map(i => `<tr${i === me ? ' style="color:#86efac"' : ""}><td><b>${nm(i)}</b></td><td style="text-align:left">${V.took[i].length ? V.took[i].map(fmt).join(" ") : "—"}</td><td><b>${fmt(V.score[i])}</b></td></tr>`).join("");
    const rounds = V.hist.map(x => `<span style="display:inline-block;min-width:46%;margin:1px 0">${x.r}R ${fmt(x.total)} → ${x.taker >= 0 ? nm(x.taker) : "이월"}</span>`).join("");
    return `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:12.5px"><thead><tr><th></th><th style="text-align:left">가져간 점수 카드</th><th>합</th></tr></thead><tbody>${seats}</tbody></table><div style="margin-top:6px;font-size:12px;text-align:left;line-height:1.5">${rounds}</div>`;
  }

  // ── AI 선생님 (보이는 것만 읽음 · 남의 손패 · 앞으로 나올 점수 카드는 모름) ──
  const seeded = a0 => { let a = a0 >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  const pct = p => `${Math.round(p * 100)}%`;
  const f1 = x => (Math.round(x * 10) / 10).toString();
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    if (V.over) { const rk = me >= 0 ? V.ranks[me] : 0; return { opp: "9라운드가 모두 끝났어요.", mine: `내 점수 ${fmt(V.score[me >= 0 ? me : 0])}점 · ${rk + 1}등`, rec: rk <= 1 ? "생존! 수고했어요" : "아쉬워요, 한 판 더 해 봐요", why: "" }; }
    const hd = me >= 0 ? V.hands[me] : null;
    if (!hd) return { opp: `지금 ${V.round}라운드 · 점수 카드 ${fmt(V.cur)}`, mine: "구경 중이에요.", rec: "누가 어떤 숫자를 공개하는지 보세요", why: "" };
    const pileSum = sum(V.pile), sub = hd.sub, R = seeded(V.round * 313 + sum(hd.nums) * 7 + (sub ? sub.n * 5 : 0) + (V.cur + 20) * 11 + me * 3 + V.hist.length);
    // 👀 상대 흐름: 지난 라운드 · 포기 · 리버스 눈치
    const last = V.hist[V.hist.length - 1], bits = [];
    if (last) bits.push(`지난 라운드(${last.r}R)는 ${last.taker >= 0 ? `${last.taker === me ? "내가" : nm(last.taker) + ja(nm(last.taker),"이")} ${fmt(last.total)}${ja(fmt(last.total), "을")} 가져갔고` : "가져간 사람이 없어 이월됐고"} ${dirTxt(last.dir)}이었어요`);
    if (V.lastQuit >= 0 && V.lastQuit !== me && V.round > 1) bits.push(`${nm(V.lastQuit)}${ja(nm(V.lastQuit),"은")} 지난 라운드에 포기해서 이번엔 꼭 공개해요`);
    if (V.phase === "play") {
      const post = H.revPost(V, me), top = [0, 1, 2, 3].filter(j => j !== me).sort((a, b) => post[b] - post[a])[0];
      bits.push(`리버스는 사람마다 한 번뿐이라, 지금까지 방향 기록으로 보면 ${nm(top)}${ja(nm(top),"이")} 이번에 낼 가능성이 가장 커 보여요 (약 ${pct(post[top])})`);
    }
    if (V.dir && V.col) bits.push(`이번 방향은 ${dirTxt(V.dir)} · 뒷면 색은 ${V.col.map((c, i) => `${i === me ? "나" : nm(i)} ${c === "B" ? "파랑" : "노랑"}`).join(" · ")}`);
    const shown = V.shown.map((x, i) => (x != null && i !== me ? `${nm(i)} ${x}` : null)).filter(Boolean);
    if (shown.length) bits.push(`지금까지 공개된 숫자: ${shown.join(" · ")}`);
    const opp = (bits.length ? bits.join(" · ") : "아직 공개된 정보가 없어요") + ".";
    const mine = `내 점수 ${fmt(V.score[me])}점 · 남은 숫자 ${hd.nums.length ? hd.nums.join("·") : "없음"} · 노멀 ${hd.norm}장 · 리버스 ${hd.rev ? "있음" : "썼음"} · 이번 더미 ${fmt(pileSum)} · 남은 라운드 ${V.left}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.phase === "play" && V.needs.includes(me)) {
      const RC = H.recommend(V, me), b = RC.L.find(x => x.n === RC.a.n && x.s === RC.a.s) || RC.L[0], sp = b.s === "R" ? "리버스" : "노멀";
      rec = `${b.n}${ja(b.n,"을")} ${sp}로 내요`;
      const meaning = `숫자 ${b.n}${ja(b.n,"은")} 1~10 중 ${b.n >= 6 ? "높은" : "낮은"} 편(뒷면 ${b.n <= 5 ? "파랑" : "노랑"})이에요`;
      const money = pileSum > 0 ? `더미가 ${fmt(pileSum)}${ja(fmt(pileSum),"이") === "이" ? "이라" : "라"} 이기면 점수를 얻어요 — 내가 혼자 가장 우위일 확률은 약 ${pct(b.p)}` : pileSum < 0 ? `더미가 ${fmt(pileSum)}${ja(fmt(pileSum),"이") === "이" ? "이라" : "라"} 이기면 마이너스를 떠안아요 — 이길 확률이 낮은 카드(약 ${pct(b.p)})가 이득이에요` : `더미 합이 0이라 이겨도 점수 변화가 없어요 — 이길 확률 약 ${pct(b.p)}`;
      const rv = b.s === "R" ? "리버스는 한 번뿐이라 방향을 뒤집어 유리해지는 이번 라운드에 써요" : hd.rev ? `리버스는 아껴 둬요 (남은 라운드 ${V.left + 1})` : "리버스를 이미 써서 노멀로 내요";
      why = `${meaning}. ${money}. 같은 숫자를 여럿이 내면 그 숫자는 건너뛰는 점도 계산에 넣었어요. ${rv}.`;
    } else if (V.phase === "play") { rec = "다른 사람이 내는 중이에요"; why = `내가 낸 ${sub ? sub.n : ""}${ja(sub ? sub.n : "","은")} 공개 차례가 올 때까지 비밀이에요.`; }
    else if (V.phase === "reveal" && V.needs.includes(me)) {
      const RC = H.recommend(V, me), e = RC.e, quit = RC.a.t === "quit";
      rec = quit ? "포기해요" : "공개해요";
      why = `내 숫자 ${sub.n}${ja(sub.n,"을")} 공개하면 내가 더미 ${fmt(pileSum)}${ja(fmt(pileSum),"을")} 가져갈 확률이 약 ${pct(e.pShow)}(기대 ${f1(e.evShow)}점)이에요.${V.canQuit ? ` 포기하면 기대 ${f1(e.evQuit)}점 — 마이너스 더미를 떠안을 수 있고, 같은 숫자를 낸 사람이 있을 확률은 약 ${pct(e.pShare)}예요.` : " 이번엔 꼭 공개해야 해요."}`;
    } else if (V.phase === "reveal") { rec = `${nm(V.turn)}${ja(nm(V.turn),"이")} 공개할지 정하는 중이에요`; why = `내 숫자 ${sub ? sub.n : ""}${ja(sub ? sub.n : "","은")} 아직 비밀이에요. 앞사람들이 공개하는 숫자와 겹치는지 눈여겨봐요.`; }
    else if (V.phase === "pass" && V.needs.includes(me)) {
      const po = V.passOpts || [];
      if (!po.length) { rec = "내가 가져가요"; why = "같은 숫자를 낸 사람이 없어서 넘길 수 없어요."; }
      else { const t = H.recommend(V, me).a.to; rec = `${nm(t)}에게 넘겨요`; why = `같은 숫자를 낸 사람 중 점수가 가장 높은 ${nm(t)}(${fmt(V.score[t])}점)에게 마이너스를 넘기면 내 순위가 지켜져요.`; }
    } else if (V.phase === "pass") { rec = `${nm(V.quit)}${ja(nm(V.quit),"이")} 정하는 중이에요`; why = "포기한 사람이 마이너스 더미를 가져갈지 넘길지 고르고 있어요."; }
    else if (V.phase === "show") { rec = "다음 라운드를 준비해요"; why = "남은 숫자와 리버스를 어디에 쓸지 미리 생각해 둬요."; }
    return { opp, mine, rec, why };
  }

  // ── 🎞️ 복기: 아쉬운 수 (선생님과 같은 계산 — H.evalPlay · H.evalReveal · 보이는 것만 · 기대 점수 차이로 sev) ──
  const REV_K = 20;                                    // 기대 점수 1점 손해 = sev 20 (3점 손해부터 📒)
  const spTxt = s => (s === "R" ? "리버스" : "노멀");
  const sameA = (a, b) => !!a && !!b && a.t === b.t && a.n === b.n && a.s === b.s && a.to === b.to;
  function review(V, seat, myA, bestA, info) {
    const none = { sev: 0, why: "" };
    try {
      if (!V || !myA || V.over || !(seat >= 0 && seat < 4) || !V.needs || !V.needs.includes(seat) || !V.hands || !V.hands[seat]) return none;
      const isBest = sameA(myA, bestA), inTally = !!(info && info.same), nm = i => (info && info.names && info.names[i]) || `${i + 1}번`;
      const fin = (s, why) => ({ sev: isBest ? 0 : inTally ? Math.min(Math.max(0, Math.round(s)), 20) : Math.max(0, Math.min(100, Math.round(s))), why });   // 고급 AI 도 두는 수면 아쉬운 장면이 아니에요
      const pileSum = sum(V.pile), hd = V.hands[seat], hist = V.hist || [];
      const seed = ((((info && info.seed) | 0) ^ Math.imul(V.round | 0, 2654435761) ^ Math.imul(hist.length + 1, 40503) ^ Math.imul(sum(hd.nums) + 1, 69069) ^ Math.imul((hd.sub ? hd.sub.n : 0) + 3, 1597334677) ^ Math.imul(seat + 1, 374761393)) >>> 0) || 1;
      const R = seeded(seed), p0 = x => Math.max(1, Math.min(99, Math.round(x * 100)));
      if (V.phase === "play" && myA.t === "play") {
        const L = H.evalPlay(V, seat, 400, R), mine = L.find(x => x.n === myA.n && x.s === myA.s);
        if (!mine || !L.length) return none;
        const top = L[0], aiE = bestA && bestA.t === "play" ? L.find(x => x.n === bestA.n && x.s === bestA.s) : null, ref = aiE && aiE.ev >= top.ev - 0.15 ? aiE : top;
        const loss = Math.max(0, top.ev - mine.ev), tag = x => `${x.n}(${spTxt(x.s)})`;
        const pn = `더미 ${fmt(pileSum)} · 내 ${tag(mine)} 가져갈 확률 ~${p0(mine.p)}% · 기대 ${fmt(Math.round(mine.ev * 10) / 10)}점`;
        const why = loss < 0.1 || ref.n === mine.n && ref.s === mine.s ? `${pn} (${isBest ? "고급 AI와 같은 선택" : "낼 수 있는 카드 중 가장 좋은 쪽"}이에요)` : `${pn} / ${isBest ? "" : "고급 AI의 "}${tag(ref)} ~${p0(ref.p)}% · ${fmt(Math.round(ref.ev * 10) / 10)}점`;
        return fin(loss * REV_K, why);
      }
      if (V.phase === "reveal" && V.canQuit && hd.sub && (myA.t === "show" || myA.t === "quit")) {
        const e = H.evalReveal(V, seat, 400, R), mineE = myA.t === "show" ? e.evShow : e.evQuit, otherE = myA.t === "show" ? e.evQuit : e.evShow;
        if (!isFinite(mineE) || !isFinite(otherE)) return none;
        const loss = Math.max(0, otherE - mineE), f = x => fmt(Math.round(x * 10) / 10);
        const sh = `내 ${hd.sub.n} 공개 → 더미 ${fmt(pileSum)} 가져갈 확률 ~${p0(e.pShow)}% · 기대 ${f(e.evShow)}점`, qt = `포기 → 기대 ${f(e.evQuit)}점${pileSum < 0 ? ` (같은 숫자를 낸 사람이 있을 확률 ~${p0(e.pShare)}%)` : ""}`;
        return fin(loss * REV_K, myA.t === "show" ? `${sh} / ${qt}` : `${qt} / ${sh}`);
      }
      if (V.phase === "pass" && myA.t === "pass" && V.passOpts && V.passOpts.length) {
        const po = V.passOpts, top = po.slice().sort((a, b) => V.score[b] - V.score[a])[0];
        if (myA.to === -1) return fin(Math.abs(pileSum) * REV_K, `넘길 수 있는 사람(${po.map(nm).join(" · ")})이 있는데 안 넘겨서 ${fmt(pileSum)}점을 그대로 가져가요`);
        if (!po.includes(myA.to)) return none;
        const d = V.score[top] - V.score[myA.to];
        return fin(d > 0 ? Math.min(15, 4 + d * 1.5) : 0, d > 0 ? `넘길 수 있는 사람 중 점수가 가장 높은 ${nm(top)}(${fmt(V.score[top])}점)에게 넘기면 내 순위에 더 좋아요 (${nm(myA.to)} ${fmt(V.score[myA.to])}점)` : `넘길 수 있는 사람 중 점수가 가장 높은 ${nm(myA.to)}(${fmt(V.score[myA.to])}점)에게 넘겼어요`);
      }
    } catch (e) { /* 계산 못 하면 아래 */ }
    return none;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const chip = x => `<span class="hl-chip${x < 0 ? " neg" : ""}">${fmt(x)}</span>`;
    const nc = (n, extra = "") => `<span class="hl-n ${n <= 5 ? "B" : "Y"}${extra ? " " + extra : ""}" style="width:34px;height:42px">${n}</span>`;
    return [
      { tag: "STEP 1 · 목표", title: "점수 카드를 모아 상위 2명이 살아남아요", body: "점수 카드 9장을 한 장씩 공개하며 <b>9라운드</b>를 해요. 점수 카드를 가져가 <b>점수 합이 높은 상위 2명</b>이 생존해요. 마이너스 카드도 섞여 있어요!",
        boardHtml: `<div class="hl-tut"><div class="hl-cards">${[2, 4, 6, 8, 10, -1, -3, -5, -7, -9].map(chip).join("")}</div><small>이 10장 중 무작위 1장은 빼고 9장만 써요</small></div>`, ms: 5200 },
      { tag: "STEP 2 · 준비물", title: "숫자 카드 1~10 + 특수 카드를 들어요", body: "숫자 카드는 뒷면이 <b>1~5 파랑 · 6~10 노랑</b>이에요. 특수 카드는 <b>노멀</b>(여러 장)과 <b>리버스</b>(딱 1장)가 있어요.",
        boardHtml: `<div class="hl-tut"><div class="hl-cards">${Array.from({ length: 10 }, (_, k) => nc(k + 1)).join("")}</div><div class="hl-cards"><span class="hl-chip">🃏 노멀</span><span class="hl-chip">🔄 리버스 (1장)</span></div></div>`, ms: 5200 },
      { tag: "STEP 3 · 진행", title: "숨겨 내고 방향을 정해요", body: "라운드마다 모두 <b>숫자 1장 + 특수 1장</b>을 겹쳐 숨겨 내요. 낸 <b>리버스가 홀수 개면 낮은 숫자가 우위</b>, 아니면 높은 숫자가 우위예요. 방향과 숫자 뒷면 색이 공개된 뒤, <b>선 플레이어부터 차례로 숫자를 공개</b>해요. 한 라운드에 1명은 <b>공개를 포기</b>할 수 있어요 (선 플레이어와 지난 라운드에 포기한 사람은 꼭 공개).",
        boardHtml: `<div class="hl-tut"><div class="hl-cards"><span class="hl-chip">🔄 리버스 1개 (홀수)</span><span class="hl-dir lo">⬇ 낮은 숫자 우위</span></div><div class="hl-cards"><span class="hl-chip">리버스 0개 (짝수)</span><span class="hl-dir hi">⬆ 높은 숫자 우위</span></div></div>`, ms: 7600 },
      { tag: "STEP 4 · 직접 해 봐요", title: "이번 라운드를 이길 카드를 골라요", body: "점수 카드 <b>+8</b>, 방향은 <b>높은 숫자 우위</b>예요. 세 사람이 낸 숫자는 이미 공개됐어요. 내 카드 중 점수 카드를 <b>가져갈 수 있는 숫자</b>를 눌러 봐요. 같은 숫자를 여럿이 내면 그 숫자는 건너뛰어요!",
        interactive: { hint: "👆 이길 수 있는 숫자 카드를 눌러요", doneText: "✅ 점수 카드를 가져갔어요!" },
        render(stage, ctrl) {
          const opp = [7, 9, 9], mineN = [3, 6, 8, 10];
          let msg = "", done = false, pickN = -1;
          const draw = () => {
            stage.innerHTML = `<div class="hl-tut"><div class="hl-cards"><div class="hl-sc"><small>점수 카드</small><b>+8</b></div><span class="hl-dir hi">⬆ 높은 숫자 우위</span></div><small>상대 세 명이 공개한 숫자</small><div class="hl-cards">${opp.map(n => nc(n)).join("")}</div><small>내 숫자 카드</small><div class="hl-cards">${mineN.map(n => (done ? `<span class="hl-n ${n <= 5 ? "B" : "Y"}${n === pickN ? " sel" : " dim"}">${n}</span>` : `<button type="button" class="hl-n ${n <= 5 ? "B" : "Y"} pick" data-n="${n}">${n}</button>`)).join("")}</div><small>${msg}</small></div>`;
            if (done) ctrl.complete();
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-n]"); if (!b || done) return;
            const n = +b.dataset.n; ctrl.sfx("tap");
            const w = H.winnerOf([n].concat(opp), "high");
            if (w === 0) { done = true; pickN = n; msg = n === 10 ? "🏆 10을 혼자 내서 가장 높아요 → +8!" : "🏆 9는 둘이 내서 건너뛰고, 그다음 8을 혼자 낸 내가 가져가요 → +8!"; }
            else { msg = `💥 ${n}${ja(n,"은")} 이기지 못해요 — ${opp[w - 1]}${ja(opp[w - 1],"을")} 혼자 낸 상대가 가져가요. 다시 골라요!`; }
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 승패", title: "혼자 낸 가장 우위 카드가 점수 카드를 가져가요", body: "우위가 가장 높은 숫자를 <b>혼자</b> 낸 사람이 점수 카드를 가져가요. 여럿이 냈으면 건너뛰어 다음 우위를 혼자 낸 사람이 가져가고, 아무도 없으면 <b>다음 라운드로 이월</b>돼요. <b>마이너스 카드</b>는 이기는 사람이 아니라 <b>공개를 포기한 사람</b>이 가져가는데, 같은 숫자를 낸 사람에게 넘길 수도 있어요. 9라운드 뒤 점수 합으로 순위를 정해요.",
        boardHtml: `<div class="hl-tut"><div class="hl-cards"><span class="hl-chip">+8</span><span class="hl-chip">→ 혼자 낸 가장 우위 카드</span></div><div class="hl-cards"><span class="hl-chip neg">−5</span><span class="hl-chip">→ 포기한 사람 (넘기기 가능)</span></div></div>`, ms: 8200 },
      { tag: "STEP 6 · 우리 판", title: "누가 냈는지는 끝까지 비밀이에요", body: "방송과 달리 특수 카드는 <b>노멀 8장 + 리버스 1장</b>이고, 리버스가 몇 개인지는 밝히지 않고 <b>방향만</b> 공개해요. 4명이 하고 한 기기로는 할 수 없어요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 어떤 카드를 낼지 알려 줘요.",
        boardHtml: `<div class="hl-tut"><span style="font-size:42px">🃏</span></div>`, ms: 5400 },
    ];
  }

  const SRC = "방송: 피의 게임 시즌X · 하이 앤 로우";
  const DIFF = "방송과 다른 점: 특수 카드는 노멀 8장 + 리버스 1장이에요 · 리버스가 몇 개인지는 안 밝히고 방향만 공개해요 (누가 냈는지는 끝까지 비밀) · 이월된 더미는 합이 마이너스면 마이너스 카드로 봐요 · 포기한 카드는 끝까지 비밀이에요 · 첫 선 플레이어는 무작위고 라운드마다 한 칸씩 돌아요 · 순위는 점수 → 가진 점수 카드 중 가장 높은 것 순이에요";
  window.SVUI = window.SVUI || {};
  window.SVUI.hilo = {
    actText: (a, V, names) => !a ? "—" : a.t === "play" ? `숫자 ${a.n} + ${a.s === "R" ? "리버스" : "노멀"}` : a.t === "show" ? "앞면 공개" : a.t === "quit" ? "공개 포기" : a.t === "pass" ? (a.to === -1 ? "마이너스 카드를 안 넘김" : `마이너스 카드를 ${(names && names[a.to]) || a.to + 1 + "번"}에게 넘김`) : "행동",   // 🎞️ 복기 행동 글
    name: "하이 앤 로우", emoji: "🃏", short: "숨겨 낸 숫자로 점수 카드를 가져가요", min: 4, max: 4, defN: 4, board: false,
    opts: [],
    howto: [
      "점수 카드 9장(+2 · +4 · +6 · +8 · +10 · −1 · −3 · −5 · −7 · −9 중 9장)을 한 장씩 공개하며 <b>9라운드</b> · 점수 합이 높은 <b>상위 2명이 생존</b>해요",
      "준비물: 숫자 카드 1~10 (뒷면 1~5 파랑 · 6~10 노랑) + 특수 카드 <b>노멀</b> · <b>리버스</b>",
      "진행: 모두 숫자 1장 + 특수 1장을 겹쳐 숨겨 내요 → 리버스가 <b>홀수 개면 낮은 숫자 우위</b>, 아니면 높은 숫자 우위 (방향과 뒷면 색만 공개) → 선 플레이어부터 차례로 숫자를 공개해요 · 한 라운드에 1명은 <b>공개를 포기</b>할 수 있어요 (선 플레이어와 지난 라운드 포기한 사람은 꼭 공개)",
      "승패: 우위가 가장 높은 숫자를 <b>혼자</b> 낸 사람이 점수 카드를 가져가요 (여럿이 낸 숫자는 건너뜀) · 아무도 없으면 다음 라운드로 이월 · 마이너스 카드는 공개를 포기한 사람이 가져가고 같은 숫자를 낸 사람에게 넘길 수 있어요",
      SRC,
      "※ " + DIFF,
    ],
    src: SRC, diff: DIFF,
    sub: V => (V.over ? "끝" : `${V.round}/${V.R}라운드 · ${{ play: "숨겨 내기", reveal: "공개 · 포기", pass: "마이너스 넘기기", show: "결과" }[V.phase] || ""}`),
    chip: (V, i) => ({ t: `${fmt(V.score[i])}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result, coach, tutorial, review,
    qa: (V, me, rnd) => H.ai(V, me, "easy", rnd),
  };
})();

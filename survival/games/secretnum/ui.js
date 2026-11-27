/* 베니 서바이벌 · 시크릿 넘버 — 화면 (짝 공개 → 티켓 동시 선택 → 같은 티켓이면 힌트 · 힌트 수첩 → 답안지 → 번호 공개 · 점수표 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.secretnum, KN = K.KN, KINDS = K.KINDS;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 데블스 플랜 시즌 1 · 3일차 메인 매치 (11명) · 규칙 확인: 나무위키 3일차 문서 (룰 · 티켓 4종 · 점수식 · 결과표, 공식 클립에서 규칙 장면은 못 찾음)";
  const DIFF = "4~8명 (방송 11명) · 번호는 1~(10×인원) (방송 1~100, 더하기의 '범위만 알려 주는 끝'도 같은 비율) · 방송은 2시간 자유 만남 + 대화 · 우리는 라운드(기본 8)마다 짝을 무작위로 정해 공개하고 둘이 동시에 티켓을 고름 — 같으면 힌트, 다르면 서로 낸 티켓을 보고 한 번 더, 두 번째도 다르면 둘 다 낸 티켓만 잃어요 (건너뛰기는 잃는 것 없음) · 짝은 안 만난 사람부터, 홀수면 한 명씩 쉼 · 방송은 콘택트룸이 2곳이라 한 번에 두 짝만 만날 수 있었지만 우리는 라운드마다 모두 짝을 지어요 · 번호는 서로 달라요 (딜러룸에서 카드를 한 장씩 뽑아서 그렇게 읽음, 문서에 적혀 있지는 않음) · 방송은 티켓 1세트 + 피스 1개로 추가 구매 → 우리는 처음부터 2세트 (옵션으로 방송대로 1세트) · 대화 · 협상 · 거짓말 · 감옥 수감자 베팅 · 피스 증감 없음 · 누가 누구와 만났고 성사됐는지는 공개, 티켓 종류 · 힌트 값은 두 사람만 알아요 · 점수식(내 번호 ±5 · 남 ±1 · 전부 맞추면 +5 · 내 번호를 맞힌 사람 1명당 −1)은 방송 그대로";
  const CSS = `
.sn-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.sn-rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.sn-tks{display:flex;gap:4px;flex-wrap:wrap}
.sn-tks span{font:800 12px var(--round);border-radius:99px;padding:3px 8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);white-space:nowrap}
.sn-tks span.z{opacity:.4}
.sn-pairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;flex:none}
.sn-pr{display:flex;align-items:center;gap:4px;border-radius:10px;padding:4px 7px;background:rgba(0,0,0,.26);border:1px solid rgba(255,255,255,.1);font:700 12px/1.2 var(--round);min-width:0}
.sn-pr b{font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto;max-width:42%}
.sn-pr i{font-style:normal;color:var(--soft)}
.sn-pr em{font-style:normal;margin-left:auto;flex:none}
.sn-pr.me{border-color:#86efac;background:rgba(34,197,94,.1)}
.sn-pr.sit{opacity:.7;grid-column:1/-1}
.sn-me{display:flex;flex-direction:column;gap:6px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:8px;flex:none}
.sn-me .hd{font:700 12.5px/1.35 var(--round);color:#bbf7d0}
.sn-me .hd b{color:#fff}
.sn-me .warn{font:700 12px/1.35 var(--round);color:#fde68a}
.sn-tkbtn{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.sn-tkbtn button{border-radius:12px;padding:5px 2px;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:800 12px/1.2 var(--round);min-height:60px;display:grid;justify-items:center;gap:1px;align-content:center}
.sn-tkbtn button .e{font-size:22px}.sn-tkbtn button small{font:700 10.5px var(--round);color:var(--soft)}
.sn-tkbtn button.on{border-color:#fde68a;background:rgba(245,179,1,.16)}
.sn-tkbtn button:disabled{opacity:.3}
.sn-go{display:grid;grid-template-columns:1fr 2fr;gap:6px}
.sn-go .btn{padding:12px 6px;font-size:15px;min-height:46px}
.sn-res{font:800 14px/1.4 var(--round);color:#fff;text-align:center;padding:4px 2px}
.sn-res .h{display:inline-block;font:900 20px var(--round);color:#fde68a;margin:0 3px;font-variant-numeric:tabular-nums}
.sn-note{flex:1 1 0;min-height:44px;overflow:auto;display:grid;gap:3px;align-content:start;font-size:12px}
.sn-note .r{display:flex;gap:6px;align-items:baseline;padding:3px 7px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);line-height:1.3}
.sn-note .r .rr{font:900 11px var(--round);color:var(--soft);flex:none;min-width:22px}
.sn-note .r .h{margin-left:auto;font:900 13px var(--round);color:#fde68a;font-variant-numeric:tabular-nums;white-space:nowrap}
.sn-note .ttl{font:700 11.5px var(--round);color:var(--soft)}
.sn-wait{text-align:center;font-size:12.5px;color:var(--soft);line-height:1.4}
.sn-sheet{display:flex;flex-direction:column;gap:6px;flex:1 1 0;min-height:0}
.sn-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;flex:none}
.sn-cell{display:grid;gap:2px;justify-items:stretch;font:700 11.5px var(--round);color:var(--soft);min-width:0}
.sn-cell span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.sn-cell.me span{color:#86efac;font-weight:900}
.sn-cell input{width:100%;min-width:0;box-sizing:border-box;height:44px;border-radius:10px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:800 17px var(--round);text-align:center}
.sn-cell.me input{border-color:#86efac}
.sn-cell input::placeholder{color:rgba(255,255,255,.3);font-size:12px}
.sn-mat{display:grid;gap:2px;font:700 11px var(--round);flex:none}
.sn-mat .row{display:grid;gap:2px}
.sn-mat .c{border-radius:6px;padding:4px 0;text-align:center;background:rgba(255,255,255,.06);min-width:0;overflow:hidden;font-variant-numeric:tabular-nums}
.sn-mat .c.nm{text-align:left;padding-left:3px;text-overflow:ellipsis;white-space:nowrap;background:none;color:var(--soft)}
.sn-mat .c.hd{background:rgba(245,179,1,.18);color:#fde68a;font-weight:900}
.sn-mat .c.hit{background:rgba(34,197,94,.3);color:#bbf7d0}
.sn-mat .c.miss{background:rgba(239,68,68,.28);color:#fecaca}
.sn-mat .c.blank{opacity:.4}
.sn-mat .c.sc{font-weight:900;color:#fff;background:rgba(255,255,255,.12)}
.sn-mat .row.me .c.nm{color:#86efac;font-weight:900}
.sn-sum{font:700 11.5px/1.35 var(--round);color:var(--soft);text-align:center}
.sn-tut{display:grid;gap:8px;justify-items:center;width:100%}
.sn-tut .num{font:900 26px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border-radius:12px;padding:8px 16px;min-width:64px;text-align:center}
.sn-tut .opt{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.sn-tut .opt button{min-width:64px;min-height:46px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:900 18px var(--round)}
.sn-hbtn{margin-left:4px;font:800 11.5px var(--round);padding:4px 9px;border-radius:99px;border:1px solid #fde68a;background:rgba(245,179,1,.14);color:#fde68a}
.sv-coachfit .sn-note,.sv-coachfit .sn-sheetnote,.sv-coachfit .sn-sum{display:none}
.sv-coachfit .sn-pr:not(.me){display:none}.sv-coachfit .sn-pairs{grid-template-columns:1fr}
.sv-coachfit .sn-me{padding:5px 6px;gap:4px}.sv-coachfit .sn-tkbtn button{min-height:46px}.sv-coachfit .sn-tkbtn button small{display:none}`;
  let styled = false;
  const style = () => { if (styled || typeof document === "undefined") return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const T = k => `${KN[k].em} ${KN[k].nm}`;
  const TE = k => T(k) + (k === "zero" ? "을" : "를");
  const hintTxt = f => (f.v != null ? `${f.v}` : `${f.lo}~${f.hi}`);
  const meaning = (f, wn) => {
    if (f.k === "add") return f.v != null ? `합 ${f.v}` : `합 ${f.lo}~${f.hi} 사이`;
    if (f.k === "mul") return `곱의 일의 자리 ${f.v}`;
    if (f.k === "div") return `큰 수 ÷ 작은 수의 몫 ${f.v}`;
    return `두 번호 사이 0의 개수 ${f.v}`;
  };
  const sel = { key: "", k: null };
  const tkLine = tk => `<div class="sn-tks">${KINDS.map(k => `<span class="${tk[k] ? "" : "z"}" title="${KN[k].nm}">${KN[k].em}×${tk[k]}</span>`).join("")}</div>`;
  function notebook(V, ctx, showAll) {
    const m = V.mine; if (!m) return "";
    const rows = m.facts.slice().reverse().map(f => `<div class="r"><span class="rr">${f.r}R</span><span>${esc(nameOf(ctx, f.w))} 님 · ${T(f.k)}</span><span class="h">${esc(hintTxt(f))}</span></div>`);
    return `<div class="sn-note"><div class="ttl">📒 내 힌트 수첩 (${m.facts.length}개) — 만난 사람 번호와 내 번호가 이 값을 만들어요</div>${rows.join("") || `<div class="r"><span class="x">아직 받은 힌트가 없어요</span></div>`}</div>`;
  }
  const stIcon = p => (p.res === "ok" ? "✅" : p.res === "fail" ? "❌" : p.res === "skip" ? "⏭️" : p.t === 2 ? "🔁" : "⏳");
  function pairsHtml(V, ctx) {
    const me = ctx.me, nm = i => (i === me ? "나" : esc(nameOf(ctx, i)));
    const h = V.pairs.map(p => `<div class="sn-pr${p.a === me || p.b === me ? " me" : ""}"><b>${nm(p.a)}</b><i>↔</i><b>${nm(p.b)}</b><em>${stIcon(p)}</em></div>`);
    if (V.sit >= 0) h.push(`<div class="sn-pr sit${V.sit === me ? " me" : ""}"><b>${nm(V.sit)}</b><i>이번 라운드는 쉬어요 💤</i></div>`);
    return `<div class="sn-pairs">${h.join("")}</div>`;
  }
  function renderSheet(stage, V, ctx) {
    const me = ctx.me, can = ctx.canAct && !V.mySheet && me >= 0, key = `sheet|${V.n}|${V.R}|${me}`;
    const cnt = V.subbed.filter(Boolean).length;
    const old = stage.querySelector(".sn-sheet");
    if (can && old && old.dataset.k === key) { const c = old.querySelector(".sn-cnt"); if (c) c.textContent = `${cnt}/${V.n}명 냈어요`; return; }   // 입력 중에 다시 그리지 않음 (키보드 · 입력값 유지)
    let h = `<div class="sn-sheet" data-k="${key}"><div class="sn-top"><span class="sn-rd">📝 답안지</span><span class="sn-cnt sn-sum" style="margin-left:auto">${cnt}/${V.n}명 냈어요</span></div>`;
    if (can) {
      h += `<div class="sn-sum">번호는 1~${V.R} · 맞으면 내 번호 +5 · 남 +1, 틀리면 −5 · −1, <b>빈칸은 0점</b> — 자신 없는 칸은 비워 둬요</div>
        <div class="sn-grid">${Array.from({ length: V.n }, (_, j) => `<label class="sn-cell${j === me ? " me" : ""}"><span>${j === me ? "내 번호" : esc(nameOf(ctx, j))}</span><input type="number" inputmode="numeric" min="1" max="${V.R}" data-j="${j}" placeholder="비움"></label>`).join("")}</div>
        ${notebook(V, ctx).replace('class="sn-note"', 'class="sn-note sn-sheetnote"')}
        <button class="btn primary big" data-a="sheet" style="flex:none;min-height:48px">답안지 내기</button></div>`;
    } else if (me >= 0 && V.mySheet) {
      h += `<div class="sn-wait">답안지를 냈어요 — 다른 사람을 기다려요 (${cnt}/${V.n})</div>${notebook(V, ctx)}</div>`;
    } else {
      h += `<div class="sn-wait">${V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") || "모두"} 답안지를 쓰는 중…</div>${V.nums ? numsHtml(V, ctx) : ""}</div>`;
    }
    stage.innerHTML = h;
    stage.onclick = e => {
      const b = e.target.closest("[data-a=sheet]"); if (!b || !can) return;
      const g = Array(V.n).fill(null);
      for (const inp of stage.querySelectorAll(".sn-cell input")) {
        const t = inp.value.trim(); if (!t) continue; const v = Number(t);
        if (!Number.isInteger(v) || v < 1 || v > V.R) { ctx.toast(`번호는 1~${V.R} 사이예요`); inp.focus(); return; }
        g[+inp.dataset.j] = v;
      }
      ctx.sfx("pop"); ctx.act({ t: "sheet", g });
    };
  }
  const numsHtml = (V, ctx) => `<div class="sn-sum">모두의 번호 (구경 중이라 보여요): ${V.nums.map((x, i) => `${esc(nameOf(ctx, i))} ${x}`).join(" · ")}</div>`;
  function renderEnd(stage, V, ctx) {
    const me = ctx.me, n = V.n, col = `${n <= 6 ? 46 : 42}px repeat(${n},minmax(0,1fr)) 36px`;
    const rows = [`<div class="row" style="grid-template-columns:${col}"><div class="c nm"></div>${V.nums.map((x, j) => `<div class="c nm">${j === me ? "나" : esc(nameOf(ctx, j))}</div>`).join("")}<div class="c nm"></div></div>`,
      `<div class="row" style="grid-template-columns:${col}"><div class="c nm">번호</div>${V.nums.map(x => `<div class="c hd">${x}</div>`).join("")}<div class="c nm">점수</div></div>`];
    for (let i = 0; i < n; i++) {
      rows.push(`<div class="row${i === me ? " me" : ""}" style="grid-template-columns:${col}"><div class="c nm">${i === me ? "나" : esc(nameOf(ctx, i))}</div>${V.sheets[i].map((g, j) => `<div class="c ${g == null ? "blank" : g === V.nums[j] ? "hit" : "miss"}">${g == null ? "·" : g}</div>`).join("")}<div class="c sc">${V.detail[i].total}</div></div>`);
    }
    stage.innerHTML = `<div class="sn-top"><span class="sn-rd">🏁 번호 공개</span></div>
      <div class="sn-sum">줄 = 그 사람이 적은 답안지 · 노란 칸 = 진짜 번호 · 초록 = 맞춤 · 빨강 = 틀림 · · = 빈칸</div>
      <div class="sn-mat">${rows.join("")}</div>
      <div class="sn-sum">점수 = 내 번호 ±5 + 남 ±1 + 전부 맞추면 5 − 내 번호를 맞힌 사람 수<br>${V.detail.map((d, i) => `${i === me ? "나" : esc(nameOf(ctx, i))} ${d.own >= 0 ? "+" : ""}${d.own}${d.oth >= 0 ? " +" : " "}${d.oth}${d.bonus ? " +5" : ""}${d.pen ? " −" + d.pen : ""} = <b>${d.total}</b>`).join(" · ")}</div>`;
    stage.onclick = null;
  }
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, nm = i => (i === me ? "나" : esc(nameOf(ctx, i))), watch = me < 0 || !V.mine;
    if (V.over && V.sheets) return renderEnd(stage, V, ctx);
    if (V.phase === "sheet") return renderSheet(stage, V, ctx);
    const key = `${V.round}|${V.mine ? V.mine.t : 0}|${me}|${V.n}`; if (sel.key !== key) { sel.key = key; sel.k = null; }
    const m = V.mine, mp = m && V.pairs.find(p => p.a === me || p.b === me);
    let h = `<div class="sn-top"><span class="sn-rd">라운드 ${V.round}/${V.rounds}</span>${m ? tkLine(m.tk) : ""}</div>${pairsHtml(V, ctx)}`;
    const can = ctx.canAct && !watch && V.phase === "meet" && m.mate >= 0 && m.pick == null && !m.res;
    let mid = "";
    if (watch) {
      mid = `<div class="sn-wait">${V.phase === "show" ? "라운드 결과" : V.needs.length ? V.needs.map(i => esc(nameOf(ctx, i))).join(" · ") + " 티켓 고르는 중…" : ""}</div>${V.nums ? numsHtml(V, ctx) : ""}`;
    } else if (V.sit === me) {
      mid = `<div class="sn-me"><div class="hd">이번 라운드는 쉬어요 💤 — 다른 짝이 만나는 동안 수첩을 보며 추리해 봐요.</div></div>`;
    } else if (V.phase === "show" || m.res) {
      const f = m.facts.find(x => x.r === V.round && x.w === m.mate);
      const mn = esc(nameOf(ctx, m.mate));
      if (m.res === "ok" && f) mid = `<div class="sn-me"><div class="sn-res">${mn} 님과 ${T(f.k)} → <span class="h">${esc(hintTxt(f))}</span><br><small style="font-weight:700;color:var(--soft)">${esc(meaning(f))} (둘이 같은 힌트를 받았어요)</small></div></div>`;
      else if (m.res === "fail") mid = `<div class="sn-me"><div class="sn-res">${mn} 님과 티켓이 끝내 달라서 힌트가 없어요 😢<br><small style="font-weight:700;color:var(--soft)">낸 티켓만 사라졌어요</small></div></div>`;
      else mid = `<div class="sn-me"><div class="sn-res">${mn} 님과 만나지 않았어요 ⏭️<br><small style="font-weight:700;color:var(--soft)">잃은 티켓은 없어요</small></div></div>`;
      if (V.phase !== "show") mid += `<div class="sn-wait">다른 짝을 기다려요</div>`;
    } else if (m.pick != null) {
      mid = `<div class="sn-me"><div class="hd">${m.pick === "pass" ? "건너뛰기를" : TE(m.pick)} 냈어요 — <b>${esc(nameOf(ctx, m.mate))} 님</b>을 기다려요</div></div>`;
    } else if (can) {
      const mn = esc(nameOf(ctx, m.mate)), tk = m.tk;
      const info = m.t === 2 && m.seen ? `<div class="warn">${mn} 님은 ${m.seen === "pass" ? "건너뛰기를" : TE(m.seen)} 냈어요 (내가 낸 건 ${m.first === "pass" ? "건너뛰기" : T(m.first)}). 같은 티켓을 내야 힌트! <b>이번에도 다르면 둘 다 낸 티켓을 잃어요.</b></div>` : `<div class="hd">이번 상대는 <b>${mn} 님</b> — 둘이 <b>같은 종류</b>의 티켓을 내면 같은 힌트를 받아요</div>`;
      mid = `<div class="sn-me">${info}<div class="sn-tkbtn">${KINDS.map(k => `<button data-k="${k}" class="${sel.k === k ? "on" : ""}" ${tk[k] ? "" : "disabled"}><span class="e">${KN[k].em}</span>${KN[k].nm}<small>×${tk[k]}</small></button>`).join("")}</div>
        <div class="sn-go"><button class="btn ghost" data-k="pass">건너뛰기</button><button class="btn primary" data-a="go" ${sel.k ? "" : "disabled"}>${sel.k ? T(sel.k) + " 내기!" : "티켓을 골라요"}</button></div></div>`;
    }
    h += mid;
    if (!watch) h += notebook(V, ctx);
    stage.innerHTML = h;
    stage.onclick = e => {
      if (!can) return;
      const b = e.target.closest("[data-k]");
      if (b && !b.disabled) {
        if (b.dataset.k === "pass") { ctx.sfx("tap"); ctx.act({ t: "pick", k: "pass" }); return; }
        ctx.sfx("tap"); sel.k = b.dataset.k; render(stage, V, ctx); return;
      }
      const g = e.target.closest("[data-a=go]"); if (g && !g.disabled && sel.k) { ctx.sfx("pop"); ctx.act({ t: "pick", k: sel.k }); }
    };
  }

  // ── 선생님 ──
  const pc = x => Math.round(x * 100) + "%";
  const nmOf = (names, i) => esc((names && names[i]) || `${i + 1}번`);
  const sheetHintFull = { key: "", full: "", open: false };
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-snhint]");
    if (!b) return;
    e.preventDefault(); sheetHintFull.open = true;
    const sp = document.createElement("span"); sp.innerHTML = sheetHintFull.full; b.replaceWith(sp);
  }, true);
  function roundLine(V, names, me) {
    const r = V.phase === "show" ? V.round : V.phase === "sheet" ? Math.max(0, ...V.log.filter(e => e.k === "meet").map(e => e.r)) : V.round - 1;
    const es = V.log.filter(e => e.k === "meet" && e.r === r), sit = V.log.find(e => e.k === "round" && e.r === r);
    if (!es.length) return "";
    const w = { ok: "성사", fail: "불발", skip: "건너뜀" };
    return `${r}라운드: ${es.map(e => `${e.a === me ? "나" : nmOf(names, e.a)}–${e.b === me ? "나" : nmOf(names, e.b)} ${w[e.res]}`).join(", ")}${sit && sit.sit >= 0 ? `, ${sit.sit === me ? "나" : nmOf(names, sit.sit)} 쉼` : ""}`;
  }
  function coach(V, me, since, names) {
    const watch = !(me >= 0 && me < V.n) || !V.mine;
    const done = V.log.filter(e => e.k === "meet"), cnt = x => done.filter(e => e.res === x).length;
    let opp = roundLine(V, names, me) || (V.round <= 1 && V.phase === "meet" ? "첫 라운드예요 — 남이 쓴 티켓 · 힌트 값은 두 사람만 알아요. 누가 누구와 만났는지와 성사 여부만 보여요." : "");
    if (done.length) opp += `${opp ? " · " : ""}지금까지 성사 ${cnt("ok")} · 불발 ${cnt("fail")} · 건너뜀 ${cnt("skip")}.`;
    if (watch) return { opp, mine: "구경 중이에요.", rec: "자리에 앉으면 내 힌트로 후보를 추려 드려요.", why: "" };
    if (V.over) {
      const d = V.detail[me];
      return { opp: opp || "판이 끝났어요.", mine: `내 점수 ${d.total} (내 번호 ${d.own >= 0 ? "+" : ""}${d.own} · 남 ${d.oth >= 0 ? "+" : ""}${d.oth}${d.bonus ? " · 전부 맞춰 +5" : ""}${d.pen ? ` · 내 번호를 맞힌 사람 ${d.pen}명 −${d.pen}` : ""}) · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "힌트가 적을 땐 빈칸이 0점이라 안전해요 — 확률 50% 넘는 칸만 적는 게 이득이에요." };
    }
    const m = V.mine, R = V.R, P = K.posterior(m.facts, R), S = K.sumOf(P.px, R);
    let mine = `힌트 ${m.facts.length}개 · 티켓 ${K.totalTk(m.tk)}장 남음 · 내 번호 후보 ${S.cnt}개${S.cnt < R ? ` (${S.lo}~${S.hi})` : " (아직 전부)"}${S.cnt <= 12 && S.cnt > 1 ? `, 가장 유력한 ${S.top} (확률 ${pc(S.p)})` : S.cnt === 1 ? `: ${S.top} 하나뿐!` : ""}`;
    const met = P.js.map(j => ({ j, s: K.sumOf(P.py[j], R) })).filter(x => x.s.cnt < R);
    if (met.length) mine += ` · 만난 사람: ${met.map(x => `${nmOf(names, x.j)} 님 ${x.s.cnt}개${x.s.cnt <= 6 ? ` (${x.s.top}? ${pc(x.s.p)})` : ""}`).join(", ")}`;
    let rec = "다음 라운드를 기다려요", why = "";
    if (V.phase === "sheet" && V.needs.includes(me)) {
      const Rc = K.recommend(V, me), g = Rc.a.g, rows = Rc.rows.filter(r => g[r.j] != null).sort((a, b) => b.p - a.p);
      const key = `${V.pub}|${me}`;
      sheetHintFull.full = `<b>고급 AI 의 답안지</b>: ${g.map((v, j) => `${j === me ? "내 번호" : nmOf(names, j)} ${v == null ? "비움" : v}`).join(" · ")}`;
      if (sheetHintFull.key !== key) { sheetHintFull.key = key; sheetHintFull.open = false; }
      rec = rows.length ? `확률 50% 넘는 칸이 ${rows.length}개 — 가장 확실한 칸은 <b>${rows[0].j === me ? "내 번호" : nmOf(names, rows[0].j) + " 님의 번호"}</b> (확률 ${pc(rows[0].p)}).${sheetHintFull.open ? " " + sheetHintFull.full : ` <button type="button" class="sn-hbtn" data-snhint>💡 전체 답안지 보기</button>`}` : `확률 50% 넘는 칸이 없어요 — 전부 비워 두는 게 안전해요 (0점).`;
      const ev = K.expScore(V, me, g);
      why = `틀리면 내 번호 −5 · 남 −1, 맞으면 +5 · +1 이라 확률이 50%를 넘는 칸만 적어요. 이 답안지의 기대 점수는 ${ev >= 0 ? "+" : ""}${ev.toFixed(1)}점이에요 (빈칸 = 0).`;
    } else if (V.phase === "meet" && V.needs.includes(me)) {
      const Rc = K.recommend(V, me);
      if (Rc && Rc.a) {
        const k = Rc.a.k, row = Rc.rows.find(r => r.k === k), others = Rc.rows.filter(r => r.k !== k);
        if (k === "pass") { rec = "건너뛰기"; why = "쓸 수 있는 티켓이 없어요."; }
        else {
          rec = `${T(k)} 내기`;
          const wait = m.t === 2 && m.seen ? ` ${m.seen === "pass" ? "상대가 건너뛰기를 냈어요." : `상대가 ${TE(m.seen)} 냈고`} 같은 티켓을 내야 힌트가 나오니 약속대로 — 티켓 순서(➕ → ✖️ → ➗ → 0️⃣)가 앞선 티켓을 낸 쪽은 그대로, 뒤선 쪽이 맞춰 줘요.` : "";
          why = `내 번호 후보가 지금 ${Rc.cur.cnt}개 (실질 ${Rc.cur.eff.toFixed(1)}개) — ${TE(k)} 쓰면 평균 약 ${row.eff.toFixed(1)}개로 줄어요${others.length ? ` (${others.map(r => `${KN[r.k].em} ${r.eff.toFixed(1)}`).join(" · ")})` : ""}.${wait}`;
        }
      }
    } else if (V.phase === "show") { rec = "결과를 수첩에 적고 다음 라운드를 준비해요"; why = "만난 사람의 번호를 모르니 한 번의 힌트로는 후보만 좁혀져요 — 같은 사람과 두 번 만나면 크게 좁혀져요."; }
    return { opp, mine, rec, why };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    return `<div class="sn-sum" style="text-align:left;color:var(--ink,#fff)">${order.map(s => { const d = V.detail[s]; return `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${d.total}점</b> · 번호 ${V.nums[s]} · 내 번호 ${d.own >= 0 ? "+" : ""}${d.own} · 남 ${d.oth >= 0 ? "+" : ""}${d.oth}${d.bonus ? " · 전부 +5" : ""}${d.pen ? ` · 감점 −${d.pen}` : ""}</div>`; }).join("")}</div>`;
  }
  const actText = (a, V, names) => {
    if (!a) return "—";
    if (a.t === "pick") return a.k === "pass" ? "건너뛰기" : `${T(a.k)} 티켓`;
    if (a.t === "sheet") { const f = a.g.map((v, j) => (v == null ? null : `${names && names[j] ? names[j] : j + 1 + "번"} ${v}`)).filter(Boolean); return f.length ? `답안지: ${f.map(esc).join(" · ")}` : "답안지: 전부 비움"; }
    return "—";
  };
  function review(V, seat, myA, bestA) {
    if (!V || !myA || !K.judge) return null;
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    if (J.kind === "sheet") { const d = J.best - J.my; return { sev: Math.max(0, Math.min(100, Math.round(d * 22))), why: `내 답안지 기대 ${J.my >= 0 ? "+" : ""}${J.my.toFixed(1)}점 / 고급 AI 답안지 기대 ${J.best >= 0 ? "+" : ""}${J.best.toFixed(1)}점 (확률 50% 넘는 칸만 적어요)` }; }
    const d = J.my - J.best;
    return { sev: Math.max(0, Math.min(100, Math.round(100 * d / Math.max(1, J.cur)))), why: `내 번호 후보가 ${J.cur.toFixed(1)}개였어요 — 내 티켓이면 평균 ${J.my.toFixed(1)}개 / 추천 티켓이면 ${J.best.toFixed(1)}개로 줄어요` };
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    return [
      { tag: "STEP 1 · 목표", title: "내 번호를 맞혀요", body: "모두 <b>번호 카드</b> 한 장을 받아요 (방송은 1~100, 우리는 1~(10×인원) · 번호는 서로 달라요). 그런데 <b>내 번호도 남의 번호도 아무도 몰라요!</b> 사람들과 만나 힌트를 모아 번호를 추리하는 게임이에요. 끝나면 <b>모두의 번호</b>를 답안지에 적어요.",
        boardHtml: `<div class="sn-tut"><div class="sn-tut"><span class="num">?</span></div><small>내 번호도 모른다</small></div>`, ms: 6600 },
      { tag: "STEP 2 · 티켓", title: "티켓 4종 — 쓰면 사라져요", body: "시작할 때 티켓 한 세트: <b>➕ 더하기</b>(두 번호의 합 · 아주 작거나 큰 합은 '3~20 사이' 같은 범위로만) · <b>✖️ 곱하기</b>(곱의 일의 자리) · <b>➗ 나누기</b>(큰 수 ÷ 작은 수의 몫) · <b>0️⃣ 영</b>(두 번호 사이의 0의 개수 — 예: 44와 88 사이엔 50 · 60 · 70 · 80 이라 4).",
        boardHtml: `<div class="sn-tut"><div class="sn-tks">${KINDS.map(k => `<span>${KN[k].em} ${KN[k].nm}</span>`).join("")}</div></div>`, ms: 7600 },
      { tag: "STEP 3 · 만남", title: "둘이 같은 티켓을 내면 같은 힌트", body: "라운드마다 <b>짝이 정해져</b> 공개돼요 (홀수면 한 명 쉼). 두 사람이 <b>동시에 티켓</b>을 골라 같으면 <b>둘 다 같은 힌트</b>를 받아요. 다르면 서로 뭘 냈는지 보고 <b>한 번 더</b> — 또 다르면 둘 다 낸 티켓만 잃어요. 건너뛰기는 잃는 것이 없어요. 힌트는 두 사람만 알고 <b>📒 수첩</b>에 적혀요.",
        boardHtml: `<div class="sn-tut"><div class="sn-pairs" style="width:100%"><div class="sn-pr me"><b>나</b><i>↔</i><b>민수</b><em>⏳</em></div><div class="sn-pr"><b>지은</b><i>↔</i><b>하늘</b><em>✅</em></div></div></div>`, ms: 7800 },
      { tag: "STEP 4 · 직접", title: "힌트를 읽어 봐요", body: "나와 민수가 <b>➕ 더하기</b> 티켓을 냈어요. 내 번호는 12, 민수 번호는 25라면 둘이 받는 힌트는? (두 번호의 합이에요)",
        interactive: { hint: "👆 알맞은 힌트를 눌러요", doneText: "✅ 12 + 25 = 37 — 둘 다 37을 받아요" },
        render(stage, ctrl) {
          let done = false;
          const draw = () => { stage.innerHTML = `<div class="sn-tut"><div class="opt"><span class="num">12</span><span class="num">25</span></div><div class="sn-note" style="width:100%"><div class="r"><span class="rr">1R</span><span>민수 님 · ➕ 더하기</span><span class="h">${done ? "37" : "?"}</span></div></div><div class="opt">${[13, 37, 5].map(v => `<button data-v="${v}" ${done ? "disabled" : ""}>${v}</button>`).join("")}</div></div>`; };
          stage.onclick = e => { const b = e.target.closest("[data-v]"); if (!b || done) return; ctrl.sfx("tap"); if (+b.dataset.v === 37) { done = true; draw(); ctrl.complete(); } else ctrl.toast("합은 12 + 25예요"); };
          draw();
        } },
      { tag: "STEP 5 · 점수", title: "답안지 — 자신 없으면 비워 둬요", body: "끝나면 <b>모두의 번호</b>를 적어요. 내 번호 맞으면 <b>+5</b> 틀리면 −5, 남의 번호는 맞으면 <b>+1</b> 틀리면 −1, <b>빈칸은 0</b>. 전부 맞추면 +5, 그리고 <b>내 번호를 맞힌 사람 1명당 −1</b>. 점수가 높은 사람이 1등!",
        boardHtml: `<div class="sn-tut"><span style="font-size:44px">🏆</span></div>`, ms: 6600 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.secretnum = {
    name: "시크릿 넘버", emoji: "🔢", short: "내 번호도 모르는 채 티켓 힌트로 추리해요", min: 4, max: 8, defN: 5, board: false, src: SRC, diff: DIFF,
    opts: [
      { k: "rounds", label: "라운드", items: [[6, "6라운드 (짧게)"], [8, "8라운드"], [10, "10라운드 (길게)"]], def: 8 },
      { k: "sets", label: "티켓", items: [[2, "2세트 (힌트 넉넉히)"], [1, "1세트 (방송 그대로)"]], def: 2 },
    ],
    howto: [
      "방송: 모두 <b>1~100 번호 카드</b>를 한 장씩 받아요 — <b>내 번호도 남의 번호도 아무도 몰라요</b>. 만나서 얻는 힌트로 번호를 추리해요",
      "티켓 4종: <b>➕ 더하기</b>(합 · 방송 기준 20 이하 '3~20 사이' · 180 이상 '180~199 사이' — 우리는 번호 범위에 맞춰 같은 비율) · <b>✖️ 곱하기</b>(곱의 일의 자리) · <b>➗ 나누기</b>(큰 수 ÷ 작은 수의 몫) · <b>0️⃣ 영</b>(두 번호 사이의 0 개수) — 쓰면 사라져요",
      "두 사람이 만나 <b>같은 종류의 티켓</b>을 한 장씩 내면 둘이 <b>같은 힌트</b>를 받아요 (우리 방식: 라운드마다 짝이 정해지고 동시에 골라요 — 다르면 서로 낸 티켓을 보고 한 번 더, 또 다르면 낸 티켓만 잃음)",
      "끝나면 <b>모두의 번호</b>를 답안지에 적어요 (빈칸 허용): 내 번호 맞춤 +5 · 틀림 −5 / 남의 번호 맞춤 +1 · 틀림 −1 · 빈칸 0 / 전부 맞추면 +5 / 내 번호를 맞힌 사람 1명당 −1",
      "점수가 가장 높은 사람이 1등 (같으면 공동) · 힌트가 적으면 대부분 빈칸이 안전해요",
    ],
    sub: V => (V.over ? "끝" : V.phase === "sheet" ? "답안지" : `${V.round}/${V.rounds} 라운드 · ${V.phase === "meet" ? "티켓 고르기" : "결과"}`),
    chip: (V, i) => ({ t: V.over ? `${V.score[i]}점` : V.phase === "sheet" ? (V.subbed[i] ? "냄" : "…") : V.pairs.some(p => (p.a === i || p.b === i) && !p.res) ? "고르는 중" : "", on: !V.over && V.needs.includes(i), out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();
